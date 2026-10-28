export {SOURCE_URL,densityUrl,modeVisibility} from './density-view.mjs?v=20261028-buffer1';
import {modeVisibility} from './density-view.mjs?v=20261028-buffer1';
import {createPopulationBuffer} from './density-buffer.mjs?v=20261028-buffer1';
export function createDensityMap(container,world,{color,tooltip,onStation}){
 const L=globalThis.L;let mode='population',disposed=false;
 container.innerHTML='<div class="population-frames"></div><div class="climate-leaflet" aria-label="可拖动缩放的人口与气候地图"></div>';
 const overlay=container.querySelector('.climate-leaflet');
 const map=L.map(overlay,{preferCanvas:true,attributionControl:false,minZoom:2,maxZoom:11,worldCopyJump:true,zoomAnimation:false,fadeAnimation:false}).setView([20,10],2);
 const population=createPopulationBuffer(container.querySelector('.population-frames'),map);
 map.attributionControl=L.control.attribution({prefix:false}).addTo(map);map.attributionControl.addAttribution('人口：<a href="https://luminocity3d.org/WorldPopDen/" target="_blank" rel="noopener">Luminocity3D · D A Smith / CASA UCL</a> · GHSL / EC JRC & CIESIN · 2020');
 map.attributionControl.addAttribution('<a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a> · 气候：2025');
 const countries=L.geoJSON(world,{style:{fillColor:'#e6ebe1',fillOpacity:0,color:'#fff',weight:.6,opacity:.4}}).addTo(map);
 const stations=L.layerGroup().addTo(map);
 L.Canvas.include({_updateClimateSymbol(layer){if(!this._drawing||layer._empty())return;const p=layer._point,r=layer._radius,ctx=this._ctx,shape=layer.options.climateShape;ctx.beginPath();if(shape==='humid')ctx.rect(p.x-r,p.y-r,r*2,r*2);else if(shape==='mixed'){ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r,p.y);ctx.closePath();}else if(shape==='dry'){const a=[[-1,-.6],[-.6,-1],[0,-.4],[.6,-1],[1,-.6],[.4,0],[1,.6],[.6,1],[0,.4],[-.6,1],[-1,.6],[-.4,0]];a.forEach(([x,y],i)=>i?ctx.lineTo(p.x+x*r,p.y+y*r):ctx.moveTo(p.x+x*r,p.y+y*r));ctx.closePath();}else ctx.arc(p.x,p.y,r,0,Math.PI*2);this._fillStroke(ctx,layer);}});
 const ClimateMarker=L.CircleMarker.extend({_updatePath(){this._renderer._updateClimateSymbol(this);}});
 let resizeTimer;const observer=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed){map.invalidateSize({pan:false});population.resize();}},40)});observer.observe(container);
 function setMode(value){mode=value;const visible=modeVisibility(mode);population.setVisible(visible.population);countries.setStyle({fillOpacity:visible.population?0:1,opacity:visible.population?.18:1});if(visible.climate){if(!map.hasLayer(stations))stations.addTo(map);}else if(map.hasLayer(stations))map.removeLayer(stations);population.sync();}
 function update(rows){stations.clearLayers();for(const s of rows){if(!Number.isFinite(s.lat)||!Number.isFinite(s.lon))continue;new ClimateMarker([s.lat,s.lon],{radius:s.shape==='dry'?2.6:2,weight:.3,color:'#fff',fillColor:color(s),fillOpacity:.94,climateShape:s.shape}).bindTooltip(()=>tooltip(s),{sticky:true,direction:'top',className:'station-tooltip'}).on('click',()=>onStation(s.id)).addTo(stations);}container.dataset.stationCount=String(rows.length);}
 function dispose(){disposed=true;observer.disconnect();clearTimeout(resizeTimer);population.dispose();map.remove();}
 setMode('population');
 return {update,setMode,reset:()=>map.setView([20,10],2),retry:()=>population.retry(),resize:()=>map.invalidateSize({pan:false}),dispose,getMap:()=>map};
}
