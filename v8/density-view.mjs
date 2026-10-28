export const SOURCE_URL='https://luminocity3d.org/WorldPopDen/';
export function densityUrl(zoom,lat,lon){return SOURCE_URL+'#'+Math.max(2,Math.min(11,Math.round(zoom)))+'/'+Math.max(-85,Math.min(85,lat)).toFixed(6)+'/'+(((lon+180)%360+360)%360-180).toFixed(6);}
export function modeVisibility(mode){return {population:mode!=='climate',climate:mode!=='population'};}
export function bufferPadding(width,height){return {x:Math.max(640,Math.ceil(width*.65)),y:Math.max(320,Math.ceil(height*.65))};}
function project(view,zoom){const world=256*2**zoom,lat=Math.max(-85.05112878,Math.min(85.05112878,view.lat))*Math.PI/180;return {x:(view.lon+180)/360*world,y:(1-Math.asinh(Math.tan(lat))/Math.PI)/2*world};}
export function viewTransform(base,target){const a=project(base,target.zoom),b=project(target,target.zoom),world=256*2**target.zoom;let x=a.x-b.x;x-=Math.round(x/world)*world;return {scale:2**(target.zoom-base.zoom),x:x===0?0:x,y:a.y-b.y===0?0:a.y-b.y};}
