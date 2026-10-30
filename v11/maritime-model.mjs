// Browser-only geometry and weighted reference-network routing. No schedules or live AIS data.
const EARTH_RADIUS_KM=6371.0088;
const KM_PER_NAUTICAL_MILE=1.852;
const DEFAULT_BLOCKED=['northwest','northeast'];

function wrapLongitude(value){
 if(value>=-180&&value<=180)return Object.is(value,-0)?0:value;
 const wrapped=((value+180)%360+360)%360-180;
 return wrapped===-180&&value>0?180:wrapped;
}

function coordinate(value){
 if(!Array.isArray(value)||!Number.isFinite(value[0])||!Number.isFinite(value[1])||Math.abs(value[1])>90)throw new TypeError('经纬度坐标必须是有效数字，纬度范围为−90°至90°');
 return [wrapLongitude(value[0]),Object.is(value[1],-0)?0:value[1]];
}

export function haversineKm(a,b){
 const [lon1,lat1]=coordinate(a),[lon2,lat2]=coordinate(b),radians=Math.PI/180;
 const latDiff=(lat2-lat1)*radians,lonDiff=wrapLongitude(lon2-lon1)*radians;
 const h=Math.sin(latDiff/2)**2+Math.cos(lat1*radians)*Math.cos(lat2*radians)*Math.sin(lonDiff/2)**2;
 return 2*EARTH_RADIUS_KM*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}

export function travelEstimate(distanceKm,speedKnots){
 if(!Number.isFinite(distanceKm)||distanceKm<0)throw new RangeError('参考航路距离必须为非负有效数字');
 if(!Number.isFinite(speedKnots)||speedKnots<5||speedKnots>40)throw new RangeError('估算船速需为5–40节（kn）');
 const nauticalMiles=distanceKm/KM_PER_NAUTICAL_MILE,hours=nauticalMiles/speedKnots;
 return {nauticalMiles,hours,days:hours/24};
}

/** Split each shortest wrapped segment at ±180°, preserving an interpolated crossing latitude. */
export function splitDateline(coordinates){
 if(!Array.isArray(coordinates))throw new TypeError('航路坐标必须为数组');
 const points=coordinates.map(coordinate),segments=[];
 if(points.length<2)return {type:'MultiLineString',coordinates:segments};
 let line=[points[0]];
 const append=point=>{const last=line.at(-1);if(last[0]!==point[0]||last[1]!==point[1])line.push(point);};
 const flush=()=>{if(line.length>=2)segments.push(line);};
 for(let i=1;i<points.length;i++){
  const prev=line.at(-1);let [lon,lat]=points[i];
  // ±180° are the same meridian, including when a route follows that meridian.
  if(Math.abs(lon-prev[0])===360)lon=prev[0];
  const delta=lon-prev[0];
  if(Math.abs(delta)>180){
   const crossing=delta<0?180:-180,unwrappedLon=lon+(delta<0?360:-360);
   const fraction=(crossing-prev[0])/(unwrappedLon-prev[0]);
   const crossingLat=prev[1]+fraction*(lat-prev[1]);
   append([crossing,crossingLat]);flush();line=[[-crossing,crossingLat]];
  }
  append([lon,lat]);
 }
 flush();
 return {type:'MultiLineString',coordinates:segments};
}

class MinHeap{
 entries=[];
 less(a,b){return a.distance<b.distance||(a.distance===b.distance&&a.node<b.node);}
 push(entry){
  const values=this.entries;let i=values.length;values.push(entry);
  while(i){const parent=(i-1)>>1;if(!this.less(entry,values[parent]))break;values[i]=values[parent];i=parent;}
  values[i]=entry;
 }
 pop(){
  const values=this.entries;if(!values.length)return null;
  const first=values[0],last=values.pop();
  if(values.length){let i=0;while(i*2+1<values.length){let next=i*2+1;if(next+1<values.length&&this.less(values[next+1],values[next]))next++;if(!this.less(values[next],last))break;values[i]=values[next];i=next;}values[i]=last;}
  return first;
 }
}

/** Build adjacency once; all routes stay on supplied undirected network edges. */
export function createRouter(network){
 if(!network||!Array.isArray(network.nodes)||network.nodes.length<2||!Array.isArray(network.edges))throw new TypeError('参考路网缺少有效节点或连线');
 let nodes;
 try{nodes=network.nodes.map(coordinate);}catch{throw new TypeError('参考路网含无效经纬度坐标');}
 const adjacency=Array.from({length:nodes.length},()=>[]),edges=[];
 for(const edge of network.edges){
  if(!Array.isArray(edge)||!Number.isInteger(edge[0])||!Number.isInteger(edge[1])||edge[0]<0||edge[1]<0||edge[0]>=nodes.length||edge[1]>=nodes.length||!Number.isFinite(edge[2])||edge[2]<0||(edge[3]!=null&&typeof edge[3]!=='string'))throw new TypeError('参考路网含无效连线、距离或通道标记');
  const [a,b,km,passage=null]=edge;if(a===b)continue;
  const index=edges.length;edges.push({a,b,km,passage});
  adjacency[a].push({node:b,edge:index});adjacency[b].push({node:a,edge:index});
 }
 if(!edges.length)throw new TypeError('参考路网没有可用连线');
 function nearest(point){
  let id=-1,distance=Infinity;
  for(let i=0;i<nodes.length;i++)if(adjacency[i].length){const km=haversineKm(point,nodes[i]);if(km<distance){distance=km;id=i;}}
  return {id,distance};
 }
 function route(origin,destination,options={}){
  origin=coordinate(origin);destination=coordinate(destination);
  if(haversineKm(origin,destination)<1e-9)throw new RangeError('起点和终点不能相同');
  const blocked=options.blockedPassages??DEFAULT_BLOCKED,maxConnectorKm=options.maxConnectorKm??150;
  if(!Array.isArray(blocked)||blocked.some(value=>typeof value!=='string'))throw new TypeError('避让通道需为通道名称数组');
  if(!Number.isFinite(maxConnectorKm)||maxConnectorKm<0)throw new RangeError('港口接入距离上限必须为非负有效数字');
  const from=nearest(origin),to=nearest(destination),blockedSet=new Set(blocked);
  if(from.distance>maxConnectorKm||to.distance>maxConnectorKm)throw new RangeError(`港口距参考路网的接入距离超过${maxConnectorKm} km，当前路网无法可靠估算该航程`);
  if(from.id===to.id)throw new RangeError('两个港口接入同一路网节点，参考路网分辨率不足，无法可靠估算该航程');
  const distances=new Float64Array(nodes.length);distances.fill(Infinity);
  const previous=new Int32Array(nodes.length);previous.fill(-1);
  const previousEdge=new Int32Array(nodes.length);previousEdge.fill(-1);
  const heap=new MinHeap();distances[from.id]=0;heap.push({node:from.id,distance:0});
  for(let current=heap.pop();current;current=heap.pop()){
   if(current.distance!==distances[current.node])continue;
   if(current.node===to.id)break;
   for(const link of adjacency[current.node]){
    const edge=edges[link.edge];if(edge.passage&&blockedSet.has(edge.passage))continue;
    const nextDistance=current.distance+edge.km;
    if(nextDistance<distances[link.node]){distances[link.node]=nextDistance;previous[link.node]=current.node;previousEdge[link.node]=link.edge;heap.push({node:link.node,distance:nextDistance});}
   }
  }
  if(!Number.isFinite(distances[to.id]))throw new RangeError('当前港口或避让条件下，参考路网没有连通航线');
  if(distances[to.id]<=0)throw new RangeError('参考路网分辨率不足，无法可靠估算该航程');
  const nodeIds=[],pathEdges=[];
  for(let id=to.id;id!==-1;id=previous[id]){nodeIds.push(id);if(previousEdge[id]!==-1)pathEdges.push(previousEdge[id]);}
  nodeIds.reverse();pathEdges.reverse();
  const coordinates=nodeIds.map(id=>nodes[id].slice());
  return {nodeIds,coordinates,geometry:splitDateline(coordinates),distanceKm:distances[to.id],originConnectorKm:from.distance,destinationConnectorKm:to.distance,passages:[...new Set(pathEdges.map(id=>edges[id].passage).filter(Boolean))]};
 }
 return Object.freeze({route,nodeCount:nodes.length,edgeCount:edges.length});
}
