"""Convert the official WorldPop2026 counts into density and cached raster tiles."""
from pathlib import Path
import sys,math,json,time,hashlib

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'outputs/v9-geolibs'))
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.transform import from_bounds
from PIL import Image

SOURCE=ROOT/'outputs/population2026/worldpop-2026.tif'
DENSITY=ROOT/'outputs/population2026/density-2026.tif'
ASSETS=Path(__file__).resolve().parent/'deploy-v9/public'
TILES=ASSETS/'tiles/worldpop-2026-r2025a'
SIZE=1024
MAX_ZOOM=6
NODATA=-99999.0
RADIUS=6371007.1809
WEB_EXTENT=20037508.342789244
BREAKS=np.array([20,100,400,1000,2000,3500,5500,7500,10000,12000,16000,22000,30000,50000,100000,200000],dtype=np.float32)
HEX=['#ffffff','#f4fbf2','#d9f2e5','#a8e3e5','#71c7d7','#428acb','#2d6bb3','#0c4c9f','#00309f','#521f8b','#700080','#990049','#cc003d','#ff0000','#ff6200','#ff9e00','#ffc300']
COLORS=np.array([[int(c[i:i+2],16) for i in [1,3,5]]+[255] for c in HEX],dtype=np.uint8)

def cell_areas(transform,start,height):
    north=transform.f+(start+np.arange(height))*transform.e
    south=north+transform.e
    return RADIUS**2*math.radians(abs(transform.a))*np.abs(np.sin(np.radians(north))-np.sin(np.radians(south)))/1e6

def density_grid():
    checks_path=DENSITY.parent/'density-checks.json'
    if DENSITY.exists() and checks_path.exists():return
    building=DENSITY.with_name('density-2026.building.tif')
    start=time.monotonic();total=0.0;valid_cells=0;zero_cells=0;maximum=0.0;max_relative_error=0.0
    with rasterio.Env(GDAL_CACHEMAX=256*1024*1024):
      with rasterio.open(SOURCE) as src:
        assert src.width==43200 and src.height==17280 and src.crs.to_epsg()==4326
        assert np.allclose(tuple(src.bounds),(-180,-60,180,84),atol=.001)
        profile=src.profile.copy();profile.update(dtype='float32',nodata=NODATA,tiled=True,blockxsize=512,blockysize=512,compress='deflate',predictor=3,BIGTIFF='YES',NUM_THREADS='4')
        with rasterio.open(building,'w',**profile) as out:
          for i,(_,window) in enumerate(src.block_windows(1)):
            counts=src.read(1,window=window)
            valid=np.isfinite(counts)&(counts>=0)&(counts!=src.nodata)
            area=cell_areas(src.transform,int(window.row_off),int(window.height))
            values=np.where(valid,counts/area[:,None],NODATA).astype(np.float32)
            out.write(values,1,window=window)
            total+=float(counts[valid].sum(dtype=np.float64));valid_cells+=int(valid.sum())
            zero_cells+=int((valid&(counts==0)).sum())
            if valid.any():
              reverse=values.astype(np.float64)*area[:,None]
              denominator=np.maximum(np.abs(counts),1)
              max_relative_error=max(max_relative_error,float((np.abs(reverse-counts)/denominator)[valid].max()))
            if valid.any():maximum=max(maximum,float(values[valid].max()))
            if i%500==0:print(f'Density blocks {i}',flush=True)
          out.build_overviews([2,4,8,16,32,64,128],Resampling.average)
          out.update_tags(ns='rio_overview',resampling='average')
          out.update_tags(source='WorldPop Global2 R2025A v1 2026',unit='people/km2',grid_area='authalic sphere R=6371007.1809m; actual latitude-dependent cell area',source_unit='people per grid cell',license='CC BY 4.0')
    assert 7.5e9<total<9e9,total
    assert max_relative_error<2e-7,max_relative_error
    building.replace(DENSITY)
    checks_path.write_text(json.dumps({'sourcePopulationSum':total,'validSourceCells':valid_cells,'validZeroCells':zero_cells,'nodataSourceCells':43200*17280-valid_cells,'maximumDensity':maximum,'maxCountReconstructionRelativeError':max_relative_error,'conversionSeconds':time.monotonic()-start,'radiusMetres':RADIUS},indent=2),encoding='utf-8')
    print(f'Density completed in {time.monotonic()-start:.1f}s; population {total:,.0f}',flush=True)

def tile_pyramid():
    ASSETS.mkdir(parents=True,exist_ok=True)
    Image.new('RGBA',(1,1),(0,0,0,0)).save(ASSETS/'transparent.webp','WEBP',lossless=True)
    start=time.monotonic();counts={};sizes={}
    with rasterio.Env(GDAL_CACHEMAX=256*1024*1024):
      with rasterio.open(DENSITY) as src:
        for z in range(MAX_ZOOM+1):
          n=2**z;pixels=SIZE*n;count=0;size=0
          transform=from_bounds(-WEB_EXTENT,-WEB_EXTENT,WEB_EXTENT,WEB_EXTENT,pixels,pixels)
          with WarpedVRT(src,crs='EPSG:3857',transform=transform,width=pixels,height=pixels,resampling=Resampling.nearest,src_nodata=NODATA,nodata=NODATA,warp_mem_limit=128) as vrt:
            for y in range(n):
              for x in range(n):
                dest=TILES/str(z)/str(x)/f'{y}.webp'
                if dest.exists():count+=1;size+=dest.stat().st_size;continue
                grid=vrt.read(1,window=rasterio.windows.Window(x*SIZE,y*SIZE,SIZE,SIZE))
                valid=np.isfinite(grid)&(grid>=0)&(grid!=NODATA)
                if not valid.any():
                  dest.parent.mkdir(parents=True,exist_ok=True)
                  dest.write_bytes((ASSETS/'transparent.webp').read_bytes())
                  count+=1;size+=dest.stat().st_size;continue
                rgba=COLORS[np.searchsorted(BREAKS,grid,side='right')]
                rgba[~valid]=0
                dest.parent.mkdir(parents=True,exist_ok=True)
                Image.fromarray(rgba).save(dest,'WEBP',lossless=True,method=1)
                count+=1;size+=dest.stat().st_size
              if y%16==0:print(f'z{z} row {y}/{n}; tiles {count}',flush=True)
          counts[str(z)]=count;sizes[str(z)]=size
          print(f'z{z}: {count} tiles, {size/1048576:.1f}MiB',flush=True)
    digest=hashlib.sha256()
    with SOURCE.open('rb') as file:
      while chunk:=file.read(8*1024*1024):digest.update(chunk)
    manifest={'dataset':'WorldPop Global2','release':'R2025A v1','year':2026,'modelled':True,'nativeResolution':'30 arcseconds (~1km at equator)','tileSize':SIZE,'minzoom':0,'maxzoom':MAX_ZOOM,'bounds':[-180,-60,180,84],'unit':'people/km²','densityCalculation':'count / latitude-dependent authalic-sphere grid-cell area','resampling':'mean source-density overviews; nearest neighbour projection for display','paletteBreaks':BREAKS.tolist(),'palette':HEX,'tiles':counts,'bytes':sizes,'tileCount':sum(counts.values()),'totalBytes':sum(sizes.values()),'buildSeconds':time.monotonic()-start,'source':'https://hub.worldpop.org/geodata/summary?id=80032','sourceBytes':SOURCE.stat().st_size,'sourceSha256':digest.hexdigest(),'doi':'10.5258/SOTON/WP00845','license':'CC BY 4.0'}
    assert manifest['tileCount']+2<20000,'Static asset count exceeds account free deployment limit'
    (ASSETS/'population-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    (DENSITY.parent/'tile-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps(manifest),flush=True)

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',type=Path,default=SOURCE)
    parser.add_argument('--density',type=Path,default=DENSITY)
    parser.add_argument('--assets',type=Path,default=ASSETS)
    options=parser.parse_args()
    SOURCE=options.source.resolve();DENSITY=options.density.resolve();ASSETS=options.assets.resolve();TILES=ASSETS/'tiles/worldpop-2026-r2025a'
    DENSITY.parent.mkdir(parents=True,exist_ok=True)
    assert SOURCE.exists(),SOURCE
    density_grid();tile_pyramid()
