const STEP=30,MAX_LAT=85;

export function degreeLabel(value,axis){
 const angle=axis==='longitude'?((value+180)%360+360)%360-180:value;
 if(angle===0)return '0°';
 if(axis==='longitude'&&Math.abs(angle)===180)return '180°';
 return Math.abs(angle)+'°'+(axis==='longitude'?(angle>0?'E':'W'):(angle>0?'N':'S'));
}

export function majorGraticule(){
 const features=[];
 const line=(axis,value,coordinates)=>features.push({type:'Feature',properties:{axis,value,principal:value===0},geometry:{type:'LineString',coordinates}});
 for(let lon=-180;lon<180;lon+=STEP){
  const coordinates=[];
  for(let lat=-MAX_LAT;lat<=MAX_LAT;lat+=5)coordinates.push([lon,lat]);
  line('longitude',lon,coordinates);
 }
 for(let lat=-60;lat<=60;lat+=STEP){
  const coordinates=[];
  for(let lon=-180;lon<=180;lon+=5)coordinates.push([lon,lat]);
  line('latitude',lat,coordinates);
 }
 return {type:'FeatureCollection',features};
}

// Clip a projected line to an inset map rectangle; this also works with map rotation.
export function clipSegment(a,b,r){
 if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
 const dx=b.x-a.x,dy=b.y-a.y,p=[-dx,dx,-dy,dy],q=[a.x-r.left,r.right-a.x,a.y-r.top,r.bottom-a.y];
 let start=0,end=1;
 for(let i=0;i<4;i++){
  if(p[i]===0){if(q[i]<0)return null;continue;}
  const t=q[i]/p[i];
  if(p[i]<0)start=Math.max(start,t);else end=Math.min(end,t);
  if(start>end)return null;
 }
 return [{x:a.x+start*dx,y:a.y+start*dy},{x:a.x+end*dx,y:a.y+end*dy}];
}

export function addMajorGraticule(map,container){
 const overlay=document.createElement('div');
 overlay.className='graticule-labels';overlay.setAttribute('aria-hidden','true');
 container.append(overlay);container.dataset.graticule=String(STEP);
 const nodes=new Map();let frame=0,disposed=false;
 const overlaps=(a,b)=>a.left<b.right+5&&a.right>b.left-5&&a.top<b.bottom+5&&a.bottom>b.top-5;
 function edgePoint(coordinates,axis,rect){
  const hits=[];
  for(let i=1;i<coordinates.length;i++){
   const clipped=clipSegment(map.project(coordinates[i-1]),map.project(coordinates[i]),rect);
   if(!clipped)continue;
   for(const p of clipped)if(Math.min(Math.abs(p.x-rect.left),Math.abs(p.x-rect.right),Math.abs(p.y-rect.top),Math.abs(p.y-rect.bottom))<.1)hits.push(p);
  }
  hits.sort(axis==='longitude'?(a,b)=>a.y-b.y:(a,b)=>a.x-b.x);
  return hits[0];
 }
 function renderLabels(){
  frame=0;if(disposed)return;
  const width=container.clientWidth,height=container.clientHeight;
  if(width<100||height<100)return;
  const rect={left:30,right:width-30,top:16,bottom:height-38};
  const bounds=map.getBounds(),west=bounds.getWest(),east=bounds.getEast(),items=[];
  for(let lon=Math.ceil(west/STEP)*STEP;lon<=east&&items.length<60;lon+=STEP){
   const coordinates=[];for(let lat=-MAX_LAT;lat<=MAX_LAT;lat+=5)coordinates.push([lon,lat]);
   const p=edgePoint(coordinates,'longitude',rect);if(p)items.push({key:'lon:'+lon,text:degreeLabel(lon,'longitude'),...p});
  }
  for(let lat=-60;lat<=60;lat+=STEP){
   const coordinates=[];for(let lon=west-STEP;lon<=east+STEP;lon+=STEP)coordinates.push([lon,lat]);
   const p=edgePoint(coordinates,'latitude',rect);if(p)items.push({key:'lat:'+lat,text:degreeLabel(lat,'latitude'),...p});
  }
  const occupied=[{left:width-58,right:width,top:0,bottom:86}],visible=new Set();
  for(const item of items){
   const halfWidth=item.text.length*3.3+5,box={left:item.x-halfWidth,right:item.x+halfWidth,top:item.y-9,bottom:item.y+9};
   if(occupied.some(other=>overlaps(box,other)))continue;
   occupied.push(box);visible.add(item.key);
   let node=nodes.get(item.key);
   if(!node){node=document.createElement('span');node.className='graticule-label';nodes.set(item.key,node);overlay.append(node);}
   node.textContent=item.text;node.dataset.axis=item.key.split(':')[0];node.style.transform=`translate3d(${item.x}px,${item.y}px,0) translate(-50%,-50%)`;
  }
  for(const [key,node] of nodes)if(!visible.has(key)){node.remove();nodes.delete(key);}
 }
 function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(renderLabels);}
 function load(){
  if(disposed)return;
  map.addSource('graticule',{type:'geojson',data:majorGraticule()});
  map.addLayer({id:'graticule-lines',type:'line',source:'graticule',paint:{'line-color':'#6d8884','line-opacity':['case',['get','principal'],.7,.48],'line-width':['case',['get','principal'],1,.65],'line-dasharray':[3,4]}},'country-lines');
  schedule();
 }
 map.on('load',load);map.on('move',schedule);map.on('resize',schedule);
 return {dispose(){disposed=true;cancelAnimationFrame(frame);map.off('load',load);map.off('move',schedule);map.off('resize',schedule);overlay.remove();nodes.clear();}};
}
