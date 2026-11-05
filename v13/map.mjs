import {addKoppenLayer} from './koppen.mjs?v=20261106-v13-koppen';
import {modes,stationFeatures,countryGroup,populationSource} from './map-model.mjs?v=20261030-v10-maritime';
import {addMajorGraticule} from './graticule.mjs?v=20261030-v10-maritime';
import {createMaritime} from './maritime.mjs?v=20261030-v10-maritime';
let registered=false;
export function createUnifiedMap(container,world,{color,tooltip,onStation}){
 const gl=globalThis.maplibregl,pm=globalThis.pmtiles;
 const status=document.getElementById('populationStatus');let loaded=false,disposed=false,rows=[],mode='combined',populationState='waiting',populationError='',selected='',opacity=.85,climateOpacity=.97;
 if(typeof gl.supported === 'function' && !gl.supported()){container.innerHTML='<p style="padding:32px">当前浏览器不支持WebGL地图，请启用硬件加速或使用新版Chrome/Edge。仍可使用上方散点和下方站点索引查看报告。</p>';status.textContent='交互地图不可用；站点筛选与报告仍可使用';return {update(rows){container.dataset.stationCount=String(rows.length);},setMode(){},setOpacity(){},setClimateOpacity(){},setMaritimeOpacity(){},setKoppenOpacity(){},reset(){},retry(){},resize(){},dispose(){}};}
 const configController=new AbortController();
 const reportStatus=()=>{const v=modes[mode];status.textContent=mode==='maritime'?'中国进出口航运 · 独立显示':[['气候站点',v.climate],['人口（2026模型估计）',v.population],['柯本气候（1991—2020）',v.koppen]].filter(x=>x[1]).map(x=>x[0]).join(' ＋ ')||'所有专题图层已关闭';if(v.population&&populationState==='error')status.textContent+='；人口瓦片部分加载失败，可重试';status.dataset.state=v.population?populationState:'ready';};
 if(!registered){gl.addProtocol('pmtiles',new pm.Protocol().tile);registered=true;}
 const map=new gl.Map({container,center:[10,20],zoom:1.6,minZoom:0,maxZoom:13,attributionControl:false,renderWorldCopies:true,style:{version:8,sources:{countries:{type:'geojson',data:world}},layers:[{id:'background',type:'background',paint:{'background-color':'#e8eff0'}},{id:'land',type:'fill',source:'countries',paint:{'fill-color':'#fafbf8'}},{id:'country-lines',type:'line',source:'countries',paint:{'line-color':'#cbd4d1','line-width':.6}}]}});
 map.addControl(new gl.NavigationControl({showCompass:false}),'top-right');map.addControl(new gl.ScaleControl({unit:'metric'}));
 const graticule=addMajorGraticule(map,container);
 const maritime=createMaritime(map,container);
 const koppen=addKoppenLayer(map);
 let attribution=null,attributionMode='';
 function syncAttribution(){
  if(attributionMode===mode)return;
  if(attribution)map.removeControl(attribution);
  const v=modes[mode];const credits=mode==='maritime'?'港口：NGA World Port Index；参考海路：Eurostat / Marnet · EUPL-1.2':[(v.climate?'气候站点：2025':''),(v.population?'人口：WorldPop 2026模型估计 · CC BY 4.0':''),(v.koppen?'柯本：Beck et al. (2023) · 1991—2020 · CC BY 4.0':'')].filter(Boolean).join('；');
  attribution=new gl.AttributionControl({compact:true,customAttribution:credits+'；边界：Natural Earth'});map.addControl(attribution);attributionMode=mode;
 }
 syncAttribution();
 const popup=new gl.Popup({closeButton:false,closeOnClick:false,maxWidth:'340px'});
 const countryHover=new gl.Popup({closeButton:false,closeOnClick:false,className:'country-tooltip',offset:12});
 const countryPopup=new gl.Popup({closeButton:true,closeOnClick:true,className:'country-tooltip',offset:12});
 const countryName=name=>name==='Taiwan'?'China':name;
 const stationAt=point=>modes[mode].climate&&climateOpacity>0&&map.getLayer('stations')&&map.queryRenderedFeatures(point,{layers:['stations']}).length>0;
 const byID=new Map();
 function icon(shape,c){const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.translate(16,16);ctx.beginPath();const r=11;if(shape==='humid')ctx.rect(-r,-r,r*2,r*2);else if(shape==='mixed'){ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.lineTo(-r,0);ctx.closePath();}else if(shape==='dry'){[[-1,-.6],[-.6,-1],[0,-.4],[.6,-1],[1,-.6],[.4,0],[1,.6],[.6,1],[0,.4],[-.6,1],[-1,.6],[-.4,0]].forEach(([x,y],i)=>i?ctx.lineTo(x*r,y*r):ctx.moveTo(x*r,y*r));ctx.closePath();}else ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();return ctx.getImageData(0,0,32,32);}
 function applyRows(){if(!loaded)return;for(const s of rows){const id=s.shape+'-'+color(s);if(!map.hasImage(id))map.addImage(id,icon(s.shape,color(s)),{pixelRatio:2});}map.getSource('stations').setData(stationFeatures(rows,color));container.dataset.stationCount=String(rows.length);}
 function applyMode(){
  if(!loaded)return;const v=modes[mode],marine=mode==='maritime';koppen.setVisible(!!v.koppen);
  map.setLayoutProperty('stations','visibility',v.climate&&climateOpacity>0?'visible':'none');
  if(map.getLayer('population'))map.setLayoutProperty('population','visibility',v.population?'visible':'none');
  document.getElementById('populationLegend').hidden=!v.population;
  document.getElementById('climateMapLegend').hidden=!v.climate;
  document.getElementById('populationOpacity').disabled=!v.population;
  document.getElementById('climateOpacity').disabled=!v.climate;
  document.getElementById('populationOpacity').closest('label').hidden=marine;
  document.getElementById('climateOpacity').closest('label').hidden=marine;
  document.getElementById('maritimeOpacityControl').hidden=!marine;document.getElementById('koppenOpacity').closest('label').hidden=marine;
  document.getElementById('populationRetry').hidden=!v.population;
  maritime.setVisible(marine);syncAttribution();popup.remove();countryHover.remove();countryPopup.remove();reportStatus();
 }
 async function loadPopulation(){try{populationState='waiting';populationError='';reportStatus();const response=await fetch('population-config.json?v=20261028-worldpop2026',{cache:'no-cache',signal:configController.signal});if(!response.ok)throw Error('无法读取人口数据配置');const config=await response.json();if(disposed)return;const spec=populationSource(config,location.href);const current=map.getSource('population');if(current&&spec.tiles&&typeof current.setTiles==='function'){current.setTiles(spec.tiles);return;}if(map.getLayer('population'))map.removeLayer('population');if(current)map.removeSource('population');map.addSource('population',{...spec,attribution:'WorldPop 2026 · 模型估计 · CC BY 4.0'});map.addLayer({id:'population',type:'raster',source:'population',paint:{'raster-opacity':opacity,'raster-fade-duration':100,'raster-resampling':'nearest'}},'graticule-lines');applyMode();}catch(e){if(disposed)return;populationState='error';populationError=e.message;reportStatus();}}
 map.on('load',()=>{loaded=true;map.addSource('stations',{type:'geojson',data:stationFeatures([],color)});map.addLayer({id:'selected-country',type:'line',source:'countries',filter:['==',['get','name'],''],paint:{'line-color':'#326b50','line-width':2}});map.addLayer({id:'stations',type:'symbol',source:'stations',layout:{'icon-image':['get','icon'],'icon-size':['interpolate',['linear'],['zoom'],1,['case',['==',['get','shape'],'dry'],.78,.62],6,['case',['==',['get','shape'],'dry'],.96,.8],11,['case',['==',['get','shape'],'dry'],1.2,1]],'icon-allow-overlap':true,'icon-ignore-placement':true},paint:{'icon-opacity':climateOpacity}});applyRows();applyMode();loadPopulation();container.dataset.ready='true';});
 map.on('error',e=>{if(disposed)return;if(e.sourceId==='population'||String(e.error?.message).includes('pmtiles')||String(e.error?.message).includes('/population/')){populationState='error';populationError=e.error?.message||'请检查网络或人口瓦片地址';reportStatus();}});
 map.on('sourcedataloading',e=>{if(e.sourceId==='population'&&populationState!=='error'){populationState='waiting';reportStatus();}});
 map.on('movestart',()=>{countryHover.remove();countryPopup.remove();if(modes[mode].population){populationError='';reportStatus();}});
 map.on('sourcedata',e=>{if(e.sourceId==='population'&&e.isSourceLoaded&&!populationError&&map.getSource('population')?.loaded()){populationState='ready';reportStatus();}});
 map.on('idle',()=>{if(loaded&&!populationError&&map.getSource('population')&&map.isSourceLoaded('population')){populationState='ready';reportStatus();}});
 map.on('mousemove','stations',e=>{if(climateOpacity<=0||!modes[mode].climate)return;const s=byID.get(e.features[0].properties.id);if(!s)return;countryHover.remove();countryPopup.remove();map.getCanvas().style.cursor='pointer';popup.setLngLat(e.lngLat).setHTML(tooltip(s)).addTo(map);});
 map.on('mouseleave','stations',()=>{map.getCanvas().style.cursor='';popup.remove();});
 map.on('click','stations',e=>{if(climateOpacity<=0||!modes[mode].climate)return;const s=byID.get(e.features[0].properties.id);if(s)onStation(s.id);});
 map.on('mousemove','land',e=>{if(stationAt(e.point)||maritime.hit(e.point)){countryHover.remove();return;}const name=e.features[0]?.properties.name;if(!name)return;map.getCanvas().style.cursor='pointer';countryPopup.remove();countryHover.setLngLat(e.lngLat).setText(countryName(name)).addTo(map);});
 map.on('mouseleave','land',()=>{countryHover.remove();map.getCanvas().style.cursor='';});
 map.on('click','land',e=>{if(!loaded||stationAt(e.point)||maritime.hit(e.point))return;selected=e.features[0]?.properties.name||'';if(!selected)return;countryHover.remove();countryPopup.setLngLat(e.lngLat).setText(countryName(selected)).addTo(map);map.setFilter('selected-country',['in',['get','name'],['literal',countryGroup(selected)]]);});
 const observer=new ResizeObserver(()=>map.resize());observer.observe(container);
 return {update(next){rows=next;byID.clear();rows.forEach(s=>byID.set(s.id,s));applyRows();},setMode(next){if(!modes[next])return;mode=next;applyMode();},setKoppenOpacity(value){koppen.setOpacity(value);},setMaritimeOpacity(value){maritime.setOpacity(value);},setOpacity(value){opacity=Math.max(0,Math.min(1,value));if(map.getLayer('population'))map.setPaintProperty('population','raster-opacity',opacity);},setClimateOpacity(value){climateOpacity=Math.max(0,Math.min(1,value));if(map.getLayer('stations')){map.setPaintProperty('stations','icon-opacity',climateOpacity);map.setLayoutProperty('stations','visibility',modes[mode].climate&&climateOpacity>0?'visible':'none');}if(climateOpacity===0){popup.remove();map.getCanvas().style.cursor='';}},reset(){maritime.reset?.();countryHover.remove();countryPopup.remove();map.easeTo({center:[10,20],zoom:1.6,duration:400});if(loaded)map.setFilter('selected-country',['==',['get','name'],'']);},retry:loadPopulation,resize:()=>map.resize(),dispose(){disposed=true;configController.abort();observer.disconnect();graticule.dispose();maritime.dispose();koppen.dispose();popup.remove();countryHover.remove();countryPopup.remove();map.remove();},getMap:()=>map};
}
