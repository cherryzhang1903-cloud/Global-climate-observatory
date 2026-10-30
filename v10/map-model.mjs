export const modes={combined:{climate:true,population:true},climate:{climate:true,population:false},population:{climate:false,population:true},maritime:{climate:false,population:false,maritime:true}};
export function formatCoordinates(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90)return '经纬度不可用';
 const wrapped=lon>=-180&&lon<=180?lon:((lon+180)%360+360)%360-180;
 const axis=(value,positive,negative)=>{const rounded=Number(value.toFixed(4));return Math.abs(rounded).toFixed(4)+'°'+(rounded===0?'':rounded>0?positive:negative);};
 return '经度 '+axis(wrapped,'E','W')+' · 纬度 '+axis(lat,'N','S');
}
export function stationFeatures(rows,color){return {type:'FeatureCollection',features:rows.filter(s=>Number.isFinite(s.lon)&&Number.isFinite(s.lat)&&Math.abs(s.lat)<=90&&Math.abs(s.lon)<=180).map(s=>({type:'Feature',geometry:{type:'Point',coordinates:[s.lon,s.lat]},properties:{id:s.id,icon:s.shape+'-'+color(s),city:s.city,shape:s.shape}}))};}
export function countryGroup(name){return ['China','Taiwan'].includes(name)?['China','Taiwan']:[name];}
export function populationURL(config,origin){const local=['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname);const raw=(local&&config.localURL)||config.url||'/population/world.pmtiles';const u=new URL(raw,origin);if(!['https:','http:'].includes(u.protocol))throw Error('人口数据地址必须使用HTTP或HTTPS');return u.href;}
export function populationSource(config,origin){
 if(config.type!=='xyz')return {type:'raster',url:'pmtiles://'+populationURL(config,origin),tileSize:256};
 const local=['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname);
 const tiles=(local&&config.localTiles)||config.tiles;
 if(!Array.isArray(tiles)||!tiles.length)throw Error('缺少人口瓦片配置');
 return {type:'raster',tiles:tiles.map(template=>{const value=new URL(template,origin);if(!['https:','http:'].includes(value.protocol))throw Error('人口瓦片必须使用HTTP或HTTPS');return value.href.replaceAll('%7B','{').replaceAll('%7D','}');}),tileSize:config.tileSize||512,minzoom:config.minzoom??0,maxzoom:config.maxzoom??7,bounds:config.bounds};
}
