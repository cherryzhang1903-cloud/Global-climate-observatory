import {createRouter,travelEstimate,splitDateline} from './maritime-model.mjs?v=20261030-v10-maritime';
import {formatCoordinates} from './map-model.mjs?v=20261030-v10-maritime';

const VERSION='20261030-v10-maritime';
const PASSAGES={suez:'苏伊士运河',panama:'巴拿马运河',malacca:'马六甲海峡',gibraltar:'直布罗陀海峡',dover:'多佛海峡',bering:'白令海峡',babelmandeb:'曼德海峡',babalmandab:'曼德海峡',magellan:'麦哲伦海峡',kiel:'基尔运河',corinth:'科林斯运河',northwest:'西北航道',northeast:'东北航道'};
const ALIASES={Shanghai:'上海',Ningbo:'宁波',Yantian:'盐田','Qingdao Gang':'青岛','Tianjin Xin Gang':'天津新港',Dalian:'大连',Guangzhou:'广州',Shekou:'蛇口',Xiamen:'厦门',Melbourne:'墨尔本','Keppel - (East Singapore)':'新加坡东部吉宝港',Rotterdam:'鹿特丹','Los Angeles':'洛杉矶','New York City':'纽约',Busan:'釜山','Tokyo Ko':'东京',Santos:'桑托斯',Durban:'德班',Hamburg:'汉堡',Antwerpen:'安特卫普','Hong Kong':'香港'};
const EXAMPLES=[
 ['上海 → 新加坡','Shanghai','Keppel - (East Singapore)'],['上海 → 鹿特丹','Shanghai','Rotterdam'],
 ['上海 → 洛杉矶','Shanghai','Los Angeles'],['上海 → 纽约','Shanghai','New York City'],
 ['上海 → 桑托斯','Shanghai','Santos'],['上海 → 德班','Shanghai','Durban'],
 ['宁波 → 汉堡','Ningbo','Hamburg'],['宁波 → 洛杉矶','Ningbo','Los Angeles'],
 ['盐田 → 新加坡','Yantian','Keppel - (East Singapore)'],['盐田 → 鹿特丹','Yantian','Rotterdam'],
 ['青岛 → 釜山','Qingdao Gang','Busan'],['青岛 → 东京','Qingdao Gang','Tokyo Ko'],
 ['天津新港 → 洛杉矶','Tianjin Xin Gang','Los Angeles'],['大连 → 釜山','Dalian','Busan'],
 ['厦门 → 墨尔本','Xiamen','Melbourne'],['香港 → 新加坡','Hong Kong','Keppel - (East Singapore)'],
];
const LAYERS=['marine-network','marine-network-hit','marine-connectors','marine-selected','marine-selected-hit','marine-ports'];
const SOURCES=['marine-network-data','marine-port-data','marine-selection-data','marine-connector-data'];
const EMPTY={type:'FeatureCollection',features:[]};
const number=(value,digits=1)=>Number(value).toLocaleString('zh-CN',{maximumFractionDigits:digits,minimumFractionDigits:digits});
const portName=port=>ALIASES[port.name]?`${ALIASES[port.name]} / ${port.name}`:port.name;
const portLabel=port=>`${portName(port)} · ${port.country||'—'}${port.locode?' · '+port.locode:''} · #${port.id}`;
const normalize=text=>String(text??'').normalize('NFKC').trim().toLocaleLowerCase();
export function isChinaPort(port){return ['china','hong kong','taiwan','macau','macao'].includes(normalize(port?.country));}
export function isChinaTradePair(a,b){return Boolean(a?.country&&b?.country&&isChinaPort(a)!==isChinaPort(b));}
const passageName=value=>PASSAGES[value]||value;
const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!=null)element.textContent=String(text);return element;};

export function maritimeMarkup(){
 return `<section id="maritimePanel" class="maritime-panel" aria-label="中国进出口港口与参考航线" hidden>
  <div class="marine-panel-heading"><h3>中国进出口参考航线</h3><p id="marineStatus" role="status">进入中国进出口航线图层后按需加载。</p><button type="button" id="marineRetry" class="marine-secondary" hidden>重试加载</button></div>
  <details class="marine-planner" open><summary>中国与海外港口间参考航程估算</summary><form id="marineForm" novalidate>
   <label class="marine-port-field">起点港口<input id="marineOrigin" name="origin" list="marinePortOptions" autocomplete="off" placeholder="搜索名称、国家/地区或港口代码" aria-label="起点港口" disabled></label>
   <button type="button" id="marineSwap" class="marine-secondary marine-swap" aria-label="交换起点与终点" disabled>⇄ 交换</button>
   <label class="marine-port-field">终点港口<input id="marineDestination" name="destination" list="marinePortOptions" autocomplete="off" placeholder="搜索名称、国家/地区或港口代码" aria-label="终点港口" disabled></label>
   <label class="marine-speed-field">船速（节 / kn）<input id="marineSpeed" name="speed" type="number" min="5" max="40" step="0.5" value="16" aria-label="估算船速（节）"></label>
   <button type="submit" id="marineCalculate" class="marine-primary" disabled>计算参考航程</button>
   <label class="marine-example-field">快速示例<select id="marineExample" aria-label="参考航线示例" disabled><option value="">选择港口间示例…</option></select></label>
   <datalist id="marinePortOptions"></datalist>
  </form></details>
  <div class="marine-legend" aria-label="中国进出口航线图例"><span><i class="marine-port-key"></i>中国与相关海外港口</span><span><i class="marine-network-key"></i>进出口参考航线（示例）</span><span><i class="marine-selected-key"></i>已选港口间航程</span><span><i class="marine-connector-key"></i>港口接入示意线（不计时）</span></div>
  <div id="marineResult" class="marine-result" role="region" aria-label="航运信息"><p>点击中国进出口参考航线查看完整港口间里程与估算时间，点击港口查看位置与设施。也可选择一个中国港口与一个海外港口进行查询。</p></div>
  <details class="marine-method"><summary>数据来源与时间估算口径</summary><p>地图只展示中国进出口参考航线，以及中国港口和这些航线关联的海外港口，不展示全部全球路网。示例航线由真实港口位置和参考路网计算，不表示实际贸易量或已开行班轮；查询目录仍可检索其他海外港口。中国港口范围包含来源记录为China、Hong Kong、Taiwan、Macau或Macao的港口。</p><p>港口来自 <a href="https://msi.nga.mil/Publications/WPI" target="_blank" rel="noopener">NGA World Port Index</a>。参考航程基于 <a href="https://github.com/eurostat/searoute" target="_blank" rel="noopener">Eurostat SeaRoute / Marnet</a> 的20 km简化路网求最短距离，用于地理可视化，不是实时AIS航迹、航道通航公告或船公司的实际班期。</p><p>纯航行时间＝参考路网距离（海里）÷船速（节）；1海里＝1.852 km。默认16节，可调5–40节。默认避开西北与东北航道。港口到参考路网节点的虚线仅表示位置接入，未验证该连接可通航，不计入里程和时间；单端接入超过150 km时不提供该港口间估算。</p><p>估算不含等泊、装卸、中转、运河排队、天气和船型限制，不能作为实际到港承诺或航海导航依据。港口空白字段显示“—”，不代表设施不存在；国家/地区名称沿用来源记录。<a href="maritime-data/manifest.json" target="_blank" rel="noopener">数据快照说明</a> · <a href="maritime-data/EUPL-1.2-LICENSE.txt" target="_blank" rel="noopener">路网 EUPL-1.2 许可</a></p></details>
 </section>`;
}

export function createMaritime(map,container){
 const panel=document.getElementById('maritimePanel');
 if(!panel)throw Error('港口与航道面板尚未初始化');
 const status=panel.querySelector('#marineStatus'),retry=panel.querySelector('#marineRetry'),result=panel.querySelector('#marineResult');
 const form=panel.querySelector('#marineForm'),originInput=panel.querySelector('#marineOrigin'),destinationInput=panel.querySelector('#marineDestination'),speedInput=panel.querySelector('#marineSpeed'),exampleInput=panel.querySelector('#marineExample'),options=panel.querySelector('#marinePortOptions');
 const calculate=panel.querySelector('#marineCalculate'),swap=panel.querySelector('#marineSwap'),gl=globalThis.maplibregl;
 const popup=new gl.Popup({closeButton:true,closeOnClick:false,maxWidth:'340px',className:'marine-popup'});
 const cleanups=[];
 let visible=false,opacity=.85,disposed=false,mapReady=map.isStyleLoaded(),installed=false,loading=false,generation=0,controller=null;
 let ports=[],network=null,router=null,portsById=new Map(),portsByLabel=new Map(),examples=[],basePortIds=new Set(),activeDetail=null,popupPosition=null,selection=null;
 let networkFeatures=null,portFeatures=null;
 const listen=(element,event,handler)=>{element.addEventListener(event,handler);cleanups.push(()=>element.removeEventListener(event,handler));};
 const setStatus=(text,error=false)=>{status.textContent=text;status.dataset.state=error?'error':loading?'loading':'ready';};
 const loadedMessage=()=>`已展示 ${examples.length} 条中国进出口参考航线 · ${portFeatures.features.length} 个相关港口；目录共 ${ports.length.toLocaleString()} 个港口可检索。`;
 const currentSpeed=()=>{const speed=Number(speedInput.value);travelEstimate(0,speed);return speed;};
 const addSource=(id,data)=>{if(!map.getSource(id))map.addSource(id,{type:'geojson',data});};
 const addLayer=layer=>{if(!map.getLayer(layer.id))map.addLayer(layer);};

 function applyVisibility(){
  if(!installed)return;
  for(const id of LAYERS)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible&&opacity>0?'visible':'none');
  if(map.getLayer('marine-network'))map.setPaintProperty('marine-network','line-opacity',opacity*.58);
  if(map.getLayer('marine-network-hit'))map.setPaintProperty('marine-network-hit','line-opacity',opacity*.001);
  if(map.getLayer('marine-connectors'))map.setPaintProperty('marine-connectors','line-opacity',opacity*.75);
  if(map.getLayer('marine-selected'))map.setPaintProperty('marine-selected','line-opacity',opacity);
  if(map.getLayer('marine-selected-hit'))map.setPaintProperty('marine-selected-hit','line-opacity',opacity*.001);
  if(map.getLayer('marine-ports')){map.setPaintProperty('marine-ports','circle-opacity',opacity);map.setPaintProperty('marine-ports','circle-stroke-opacity',opacity*.9);}
 }

 function installLayers(){
  if(!mapReady||!router||disposed)return;
  addSource('marine-network-data',networkFeatures);addSource('marine-port-data',portFeatures);addSource('marine-selection-data',EMPTY);addSource('marine-connector-data',EMPTY);
  addLayer({id:'marine-network',type:'line',source:'marine-network-data',paint:{'line-color':'#3885ad','line-width':['interpolate',['linear'],['zoom'],1,1.4,7,2.1,12,2.8]}});
  addLayer({id:'marine-network-hit',type:'line',source:'marine-network-data',paint:{'line-color':'#3885ad','line-width':13,'line-opacity':.001}});
  addLayer({id:'marine-connectors',type:'line',source:'marine-connector-data',paint:{'line-color':'#6b7783','line-width':1.5,'line-dasharray':[3,4]}});
  addLayer({id:'marine-selected',type:'line',source:'marine-selection-data',paint:{'line-color':'#087c83','line-width':['interpolate',['linear'],['zoom'],1,3,8,4.5]}});
  addLayer({id:'marine-selected-hit',type:'line',source:'marine-selection-data',paint:{'line-color':'#087c83','line-width':16,'line-opacity':.001}});
  addLayer({id:'marine-ports',type:'circle',source:'marine-port-data',paint:{'circle-color':'#e9953f','circle-radius':['interpolate',['linear'],['zoom'],1,2.8,5,4.2,10,6],'circle-stroke-width':.8,'circle-stroke-color':'#fff'}});
  installed=true;applyVisibility();
 }

 function enableControls(enabled){for(const input of [originInput,destinationInput,exampleInput,calculate,swap])input.disabled=!(enabled&&installed);}
 async function loadData(){
  if(loading||router||disposed)return;
  loading=true;retry.hidden=true;enableControls(false);setStatus('正在加载港口目录并计算中国进出口参考航线…');
  const ownGeneration=++generation;controller=new AbortController();
  try{
   const fetchJSON=async file=>{const response=await fetch(`maritime-data/${file}?v=${VERSION}`,{signal:controller.signal});if(!response.ok)throw Error(`数据加载失败（HTTP ${response.status}）`);return response.json();};
   const [portPayload,networkPayload]=await Promise.all([fetchJSON('ports.json'),fetchJSON('network.json')]);
   if(disposed||ownGeneration!==generation||!visible)return;
   if(!Array.isArray(portPayload.ports)||!portPayload.ports.length)throw Error('港口目录为空或格式错误');
   const nextPorts=portPayload.ports.filter(p=>p.id!=null&&typeof p.name==='string'&&Number.isFinite(p.lon)&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180);
   if(!nextPorts.length)throw Error('港口目录没有有效点位');
   const nextRouter=createRouter(networkPayload);
   const nextExamples=EXAMPLES.map(([label,a,b])=>({label,origin:nextPorts.find(p=>p.name===a),destination:nextPorts.find(p=>p.name===b)})).filter(item=>isChinaTradePair(item.origin,item.destination)).map(item=>{try{return {...item,type:'voyage',route:nextRouter.route([item.origin.lon,item.origin.lat],[item.destination.lon,item.destination.lat])};}catch{return null;}}).filter(Boolean);
   if(!nextExamples.length)throw Error('当前目录与参考路网未能生成中国进出口航线');
   ports=nextPorts;network=networkPayload;router=nextRouter;examples=nextExamples;portsById=new Map(ports.map(p=>[String(p.id),p]));portsByLabel=new Map(ports.map(p=>[normalize(portLabel(p)),p]));
   const optionFragment=document.createDocumentFragment();
   for(const port of [...ports].sort((a,b)=>a.name.localeCompare(b.name))){const option=node('option');option.value=portLabel(port);optionFragment.append(option);}
   options.replaceChildren(optionFragment);
   exampleInput.replaceChildren(node('option','', '选择港口间示例…'));exampleInput.firstElementChild.value='';
   examples.forEach((example,i)=>{const option=node('option','',example.label);option.value=String(i);exampleInput.append(option);});
   basePortIds=new Set(ports.filter(isChinaPort).map(port=>String(port.id)));for(const example of examples){basePortIds.add(String(example.origin.id));basePortIds.add(String(example.destination.id));}
   refreshPortFeatures();
   networkFeatures={type:'FeatureCollection',features:examples.map((example,id)=>({type:'Feature',geometry:example.route.geometry,properties:{id}}))};
   loading=false;installLayers();enableControls(true);setStatus(loadedMessage());
  }catch(error){
   if(disposed||ownGeneration!==generation)return;
   controller?.abort();loading=false;
   if(error.name==='AbortError'||!visible)return;
   retry.hidden=false;setStatus(`港口与航道暂未加载：${error.message}`,true);
  }
 }

 function fieldList(entries){const list=node('dl','marine-fields');for(const [label,value] of entries){list.append(node('dt','',label),node('dd','',value==null||value===''?'—':value));}return list;}
 function available(value){return value==='Yes'?'是':value==='No'?'否':value==null||value===''?'—':String(value);}
 function depth(value){return Number.isFinite(value)?number(value)+' m':available(value);}
 function timeSection(distanceKm){
  const section=node('div','marine-distance');
  section.append(node('strong','',`${number(distanceKm)} km`));
  try{const speed=currentSpeed(),estimate=travelEstimate(distanceKm,speed);section.append(node('span','',`${number(estimate.nauticalMiles)} 海里`),node('b','marine-estimate',`估算 ${number(estimate.hours)} 小时 / ${number(estimate.days,2)} 天`),node('small','',`按 ${number(speed)} 节匀速纯航行，不代表实际到港时间。`));}
  catch(error){section.append(node('p','marine-error',error.message));}
  return section;
 }
 function buildDetail(detail){
  const body=node('div','marine-detail');
  if(detail.type==='port'){
   const port=detail.port;body.append(node('h4','',portName(port)),fieldList([
    ['来源国家/地区',port.country],['WPI / 港口代码',[port.wpi,port.locode].filter(Boolean).join(' / ')],['经纬度',formatCoordinates(port.lon,port.lat)],
    ['港口规模 / 类型',[port.size,port.type].filter(Boolean).join(' / ')],['所在水域',port.waterBody],['航道水深',depth(port.channelDepth)],['最大吃水',depth(port.maxDraft)],
    ['集装箱 / 引航',`${available(port.container)} / ${available(port.pilotage)}`],['燃料 / 修理',`${available(port.fuel)} / ${available(port.repairs)}`],
   ]));
   const actions=node('div','marine-popup-actions');
   for(const [label,input] of [['设为起点',originInput],['设为终点',destinationInput]]){const button=node('button','marine-secondary',label);button.type='button';button.addEventListener('click',event=>{event.stopPropagation();input.value=portLabel(port);exampleInput.value='';setStatus(`${portName(port)} 已${label}。选择另一港口后计算参考航程。`);});actions.append(button);}
   body.append(actions,node('p','marine-small','港口属性沿用 NGA 目录；“—”表示来源未提供。'));
  }else{
   const {origin,destination,route}=detail;
   body.append(node('h4','',`${portName(origin)} → ${portName(destination)}`),timeSection(route.distanceKm),fieldList([
    ['参考方向',isChinaPort(origin)?'中国出口方向':'中国进口方向'],['经过的已标注通道',route.passages.length?route.passages.map(passageName).join('、'):'无已标注通道'],
    ['起点接入距离',`${number(route.originConnectorKm)} km（不计入里程和时间）`],['终点接入距离',`${number(route.destinationConnectorKm)} km（不计入里程和时间）`],
   ]),node('p','marine-small','港口接入线仅为位置示意，未验证可通航。参考路网路径默认避开西北和东北航道；时间不含港口作业、等泊、中转、运河排队、天气和船型影响。'));
  }
  return body;
 }
 function present(detail,position){
  activeDetail=detail;result.replaceChildren(buildDetail(detail));
  if(position){popupPosition=position;popup.setLngLat(position).setDOMContent(buildDetail(detail)).addTo(map);}
 }
 function clearSelection(){
  selection=null;for(const source of ['marine-selection-data','marine-connector-data'])map.getSource(source)?.setData(EMPTY);
  refreshPortFeatures();
 }
 function refreshPortFeatures(){
  const visibleIds=new Set(basePortIds);if(selection){visibleIds.add(String(selection.origin.id));visibleIds.add(String(selection.destination.id));}
  portFeatures={type:'FeatureCollection',features:ports.filter(port=>visibleIds.has(String(port.id))).map(port=>({type:'Feature',geometry:{type:'Point',coordinates:[port.lon,port.lat]},properties:{id:String(port.id)}}))};
  map.getSource('marine-port-data')?.setData(portFeatures);
 }
 function resolvePort(input,label){
  const value=normalize(input.value);if(!value)throw Error(`请选择${label}港口`);
  const exact=portsByLabel.get(value);if(exact)return exact;
  const matches=ports.filter(p=>normalize(p.name)===value||normalize(p.locode)===value||normalize(ALIASES[p.name])===value||String(p.id)===value.replace(/^#/,''));
  if(matches.length===1)return matches[0];
  if(matches.length>1)throw Error(`${label}匹配到多个港口，请从候选列表选择具体港口`);
  const partial=ports.filter(p=>normalize([p.name,p.alternate,p.country,p.locode,ALIASES[p.name]].filter(Boolean).join(' ')).includes(value));
  if(partial.length===1)return partial[0];
  throw Error(partial.length?`${label}匹配到多个港口，请从候选列表选择具体港口`:`没有找到${label}港口，请从候选列表选择`);
 }
 function fitRoute(route,origin,destination){
  const points=route.coordinates.map(p=>p.slice());
  for(let i=1;i<points.length;i++){while(points[i][0]-points[i-1][0]>180)points[i][0]-=360;while(points[i][0]-points[i-1][0]<-180)points[i][0]+=360;}
  for(const [port,near] of [[origin,points[0]],[destination,points.at(-1)]]){let lon=port.lon;while(lon-near[0]>180)lon-=360;while(lon-near[0]<-180)lon+=360;points.push([lon,port.lat]);}
  const lons=points.map(p=>p[0]),lats=points.map(p=>p[1]);
  map.fitBounds([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]],{padding:{top:52,right:45,bottom:48,left:45},maxZoom:6,duration:500});
 }
 function calculateRoute(){
  if(!router||!installed){setStatus('请等待港口、路网和地图初始化完成。');return;}
  try{
   currentSpeed();const origin=resolvePort(originInput,'起点'),destination=resolvePort(destinationInput,'终点');
   if(!isChinaTradePair(origin,destination))throw Error('仅展示中国进出口航程：请选一个中国港口和一个海外港口，可交换起点与终点。');
   originInput.value=portLabel(origin);destinationInput.value=portLabel(destination);
   const route=router.route([origin.lon,origin.lat],[destination.lon,destination.lat]);
   selectVoyage({type:'voyage',origin,destination,route},{fit:true});
  }catch(error){clearSelection();popup.remove();popupPosition=null;activeDetail=null;result.replaceChildren(node('p','marine-error',error.message));setStatus(error.message,true);}
 }
 function selectVoyage(detail,{position=null,fit=false}={}){
  selection=detail;const {origin,destination,route}=detail;refreshPortFeatures();
  map.getSource('marine-selection-data').setData({type:'FeatureCollection',features:[{type:'Feature',geometry:route.geometry,properties:{id:'selected'}}]});
  const connectors=[[[origin.lon,origin.lat],route.coordinates[0]],[[destination.lon,destination.lat],route.coordinates.at(-1)]];
  map.getSource('marine-connector-data').setData({type:'FeatureCollection',features:connectors.map((coordinates,id)=>({type:'Feature',geometry:splitDateline(coordinates),properties:{id}}))});
  popup.remove();popupPosition=null;present(selection,position);setStatus('中国进出口参考航程已选择。里程与时间均不含两端港口接入示意线。');
  if(fit)fitRoute(route,origin,destination);
 }

 function featureAt(point){
  if(!visible||opacity<=0||!installed)return null;
  const layers=['marine-ports','marine-selected-hit','marine-network-hit'].filter(id=>map.getLayer(id));
  const features=map.queryRenderedFeatures(point,{layers});
  for(const id of layers){const feature=features.find(item=>item.layer.id===id);if(feature)return feature;}
  return null;
 }
 function onClick(event){
  const feature=featureAt(event.point);if(!feature)return;
  if(feature.layer.id==='marine-ports'){const port=portsById.get(String(feature.properties.id));if(port)present({type:'port',port},event.lngLat);}
  else if(feature.layer.id==='marine-selected-hit'&&selection)present(selection,event.lngLat);
  else{const exampleId=Number(feature.properties.id),example=examples[exampleId];if(Number.isInteger(exampleId)&&example){originInput.value=portLabel(example.origin);destinationInput.value=portLabel(example.destination);exampleInput.value=String(exampleId);selectVoyage(example,{position:event.lngLat});}}
 }
 function onMouseMove(event){if(!visible)return;map.getCanvas().style.cursor=featureAt(event.point)?'pointer':'';}
 function onLoad(){mapReady=true;installLayers();if(router)enableControls(true);}
 map.on('load',onLoad);map.on('click',onClick);map.on('mousemove',onMouseMove);
 listen(form,'submit',event=>{event.preventDefault();calculateRoute();});
 listen(swap,'click',()=>{const previous=originInput.value;originInput.value=destinationInput.value;destinationInput.value=previous;exampleInput.value='';if(originInput.value&&destinationInput.value)calculateRoute();});
 listen(exampleInput,'change',()=>{if(exampleInput.value==='')return;const example=examples[Number(exampleInput.value)];if(!example)return;originInput.value=portLabel(example.origin);destinationInput.value=portLabel(example.destination);calculateRoute();});
 listen(speedInput,'input',()=>{if(!activeDetail||activeDetail.type==='port')return;result.replaceChildren(buildDetail(activeDetail));if(popup.isOpen()&&popupPosition)popup.setDOMContent(buildDetail(activeDetail));});
 listen(retry,'click',()=>{if(router){try{installLayers();setStatus(loadedMessage());retry.hidden=true;}catch(error){setStatus(error.message,true);}}else loadData();});
 for(const input of [originInput,destinationInput])listen(input,'input',()=>{exampleInput.value='';});

 return {
  setVisible(value){
   visible=Boolean(value);panel.hidden=!visible;applyVisibility();
   if(!visible){popup.remove();popupPosition=null;map.getCanvas().style.cursor='';if(loading){generation++;controller?.abort();loading=false;}return;}
   if(router){installLayers();enableControls(true);setStatus(loadedMessage());}else loadData();
  },
  setOpacity(value){opacity=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));applyVisibility();if(opacity===0){popup.remove();popupPosition=null;map.getCanvas().style.cursor='';}},
  hit(point){return Boolean(featureAt(point));},
  reset(){popup.remove();popupPosition=null;},
  dispose(){
   disposed=true;generation++;controller?.abort();popup.setDOMContent(node('div')).remove();map.off('load',onLoad);map.off('click',onClick);map.off('mousemove',onMouseMove);cleanups.forEach(cleanup=>cleanup());
   for(const id of [...LAYERS].reverse())if(map.getLayer(id))map.removeLayer(id);
   for(const id of SOURCES)if(map.getSource(id))map.removeSource(id);
   panel.hidden=true;options.replaceChildren();result.replaceChildren();activeDetail=null;selection=null;networkFeatures=null;portFeatures=null;router=null;ports=[];examples=[];basePortIds.clear();network=null;portsById.clear();portsByLabel.clear();
  },
 };
}
