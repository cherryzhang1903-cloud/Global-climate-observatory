export const SOURCE_URL='https://luminocity3d.org/WorldPopDen/';
export function densityUrl(zoom,lat,lon){return SOURCE_URL+'#'+Math.max(2,Math.min(11,Math.round(zoom)))+'/'+Math.max(-85,Math.min(85,lat)).toFixed(6)+'/'+(((lon+180)%360+360)%360-180).toFixed(6);}
export function modeVisibility(mode){return {population:mode!=='climate',climate:mode!=='population'};}
export function createDensityMap(container,world,{color,tooltip,onStation}){
 const L=globalThis.L;let mode='population',lastUrl='',disposed=false;
 container.innerHTML='<iframe class="population-reference" title="Luminocity3D 2020人口密度底图" aria-hidden="true" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin"></iframe><div class="climate-leaflet" aria-label="可拖动缩放的人口与气候地图"></div>';
 const frame=container.querySelector('iframe'),overlay=container.querySelector('.climate-leaflet');
 const map=L.map(overlay,{preferCanvas:true,attributionControl:false,minZoom:2,maxZoom:11,worldCopyJump:true,zoomAnimation:false,fadeAnimation:false}).setView([20,10],2);
 map.attributionControl=L.control.attribution({prefix:false}).addTo(map);map.attributionControl.addAttribution('人口：<a href="https://luminocity3d.org/WorldPopDen/" target="_blank" rel="noopener">Luminocity3D · D A Smith / CASA UCL</a> · GHSL / EC JRC & CIESIN · 2020');
 map.attributionControl.addAttribution('<a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a> · 气候：2025');
 const countries=L.geoJSON(world,{style:{fillColor:'#e6ebe1',fillOpacity:0,color:'#fff',weight:.6,opacity:.4}}).addTo(map);
 const stations=L.layerGroup().addTo(map);
 L.Canvas.include({_updateClimateSymbol(layer){if(!this._drawing||layer._empty())return;const p=layer._point,r=layer._radius,ctx=this._ctx,shape=layer.options.climateShape;ctx.beginPath();if(shape==='humid')ctx.rect(p.x-r,p.y-r,r*2,r*2);else if(shape==='mixed'){ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r,p.y);ctx.closePath();}else if(shape==='dry'){const a=[[-1,-.6],[-.6,-1],[0,-.4],[.6,-1],[1,-.6],[.4,0],[1,.6],[.6,1],[0,.4],[-.6,1],[-1,.6],[-.4,0]];a.forEach(([x,y],i)=>i?ctx.lineTo(p.x+x*r,p.y+y*r):ctx.moveTo(p.x+x*r,p.y+y*r));ctx.closePath();}else ctx.arc(p.x,p.y,r,0,Math.PI*2);this._fillStroke(ctx,layer);}});
 const ClimateMarker=L.CircleMarker.extend({_updatePath(){this._renderer._updateClimateSymbol(this);}});
 function sync(){if(disposed||!modeVisibility(mode).population)return;const c=map.getCenter(),url=densityUrl(map.getZoom(),c.lat,c.lng);if(url===lastUrl)return;lastUrl=url;if(frame.getAttribute('src')){try{frame.contentWindow.location.replace(url);}catch{frame.src=url;}}else frame.src=url;}
 map.on('moveend',sync);map.on('zoomend',sync);
 let resizeTimer;const observer=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed){map.invalidateSize({pan:false});sync();}},100)});observer.observe(container);
 function setMode(value){mode=value;const visible=modeVisibility(mode);frame.hidden=!visible.population;countries.setStyle({fillOpacity:visible.population?0:1,opacity:visible.population?.18:1});if(visible.climate){if(!map.hasLayer(stations))stations.addTo(map);}else if(map.hasLayer(stations))map.removeLayer(stations);sync();}
 function update(rows){stations.clearLayers();for(const s of rows){if(!Number.isFinite(s.lat)||!Number.isFinite(s.lon))continue;new ClimateMarker([s.lat,s.lon],{radius:s.shape==='dry'?2.6:2,weight:.3,color:'#fff',fillColor:color(s),fillOpacity:.94,climateShape:s.shape}).bindTooltip(()=>tooltip(s),{sticky:true,direction:'top',className:'station-tooltip'}).on('click',()=>onStation(s.id)).addTo(stations);}container.dataset.stationCount=String(rows.length);}
 function dispose(){disposed=true;observer.disconnect();clearTimeout(resizeTimer);map.remove();frame.src='about:blank';}
 setMode('population');
 return {update,setMode,reset:()=>map.setView([20,10],2),retry:()=>{lastUrl='';frame.removeAttribute('src');sync();},resize:()=>map.invalidateSize({pan:false}),dispose,getMap:()=>map};
}
