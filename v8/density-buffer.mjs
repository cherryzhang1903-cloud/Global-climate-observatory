import {SOURCE_URL,densityUrl,viewTransform,bufferPadding} from './density-view.mjs?v=20261028-buffer1';

// The visible original map stays unchanged while CSS previews the new viewport.
// Only the covered buffer receives a new hash; stale targets are never swapped in.
export function createPopulationBuffer(root,map){
 root.style.cssText='position:absolute;inset:0;z-index:0;pointer-events:none';
 let active=0,visible=true,disposed=false,generation=0,raf=0,idle=0,swap=0;
 const frames=[],views=[null,null],requests=[null,null],urls=['',''],loaded=[false,false],readyTimers=[0,0],lastWrite=[0,0],bases=[SOURCE_URL,SOURCE_URL];
 function current(){const c=map.getCenter();return {zoom:map.getZoom(),lat:c.lat,lon:c.lng};}
 function key(v){return densityUrl(v.zoom,v.lat,v.lon);}
 function canonical(v){return {zoom:Math.max(2,Math.min(11,Math.round(v.zoom))),lat:Number(Math.max(-85,Math.min(85,v.lat)).toFixed(6)),lon:Number(((((v.lon+180)%360+360)%360)-180).toFixed(6))};}
 function preview(){
  raf=0;if(disposed||!visible||!views[active])return;
  const t=viewTransform(views[active],current());
  frames[active].style.transform=`translate3d(${t.x}px,${t.y}px,0) scale(${t.scale})`;
 }
 function requestPreview(){if(!raf&&!disposed&&visible)raf=requestAnimationFrame(preview);}
 function write(index,view){
  requests[index]=view;const url=key(view);if(urls[index]===url)return;
  urls[index]=url;lastWrite[index]=performance.now();const navigation=bases[index]+url.slice(url.indexOf('#'));
  if(frames[index].getAttribute('src')){try{frames[index].contentWindow.location.replace(navigation);}catch{frames[index].src=navigation;}}
  else frames[index].src=navigation;
 }
 function prepare(){
  idle=0;if(disposed||!visible)return;const view=canonical(current()),index=1-active,id=++generation;
  clearTimeout(swap);const wait=450-(performance.now()-lastWrite[index]);if(loaded[index]&&urls[index]!==key(view)&&wait>0){schedule(wait+30);return;}frames[index].style.transform='none';write(index,view);
  if(!loaded[index])return;
  root.dataset.populationSync='preview';
  const cached=views[index]&&key(views[index])===key(view);
  swap=setTimeout(()=>{
   if(disposed||!visible||id!==generation)return;
   if(key(current())!==key(view)){schedule();return;}
   const old=active;views[index]=view;active=index;
   frames[index].style.zIndex='1';frames[index].style.opacity='1';frames[index].dataset.active='true';
   frames[old].style.zIndex='0';frames[old].style.transform='none';frames[old].dataset.active='false';
   preview();root.dataset.populationSync='settled';
  },cached?0:600);
 }
 function schedule(delay=120){clearTimeout(idle);clearTimeout(swap);generation++;if(disposed||!visible)return;idle=setTimeout(prepare,delay);}
 function onMove(){requestPreview();root.dataset.populationSync='preview';clearTimeout(idle);idle=0;clearTimeout(swap);generation++;}
 function onEnd(){requestPreview();schedule();}
 for(let i=0;i<2;i++){
  const frame=document.createElement('iframe');frame.className='population-reference';frame.title='Luminocity3D 2020人口密度底图'+(i?'备用':'');frame.setAttribute('aria-hidden','true');frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin');
  frame.style.transformOrigin='50% 50%';frame.style.transition='none';frame.style.zIndex=i?'0':'1';frame.style.opacity='0';frame.dataset.active=i?'false':'true';
  frame.addEventListener('load',()=>{if(disposed||!urls[i])return;loaded[i]=true;lastWrite[i]=performance.now();clearTimeout(readyTimers[i]);readyTimers[i]=setTimeout(()=>{if(disposed)return;views[i]=requests[i];frame.style.opacity='1';requestPreview();schedule(0);},450);});
  root.appendChild(frame);frames.push(frame);
 }
 function resize(){
  const s=map.getSize(),pad=bufferPadding(s.x,s.y);
  for(const frame of frames){frame.style.left=-pad.x+'px';frame.style.top=-pad.y+'px';frame.style.width=s.x+2*pad.x+'px';frame.style.height=s.y+2*pad.y+'px';}
  requestPreview();schedule();
 }
 function setVisible(value){visible=value;root.hidden=!value;if(value){resize();requestPreview();schedule();}else{clearTimeout(idle);clearTimeout(swap);generation++;}}
 function retry(){clearTimeout(idle);clearTimeout(swap);generation++;const i=1-active;clearTimeout(readyTimers[i]);urls[i]='';loaded[i]=false;views[i]=null;bases[i]=SOURCE_URL+'?refresh='+Date.now();write(i,canonical(current()));root.dataset.populationSync='preview';schedule();}
 function dispose(){disposed=true;generation++;map.off('move zoom',onMove);map.off('moveend zoomend',onEnd);clearTimeout(idle);clearTimeout(swap);readyTimers.forEach(clearTimeout);cancelAnimationFrame(raf);for(const f of frames)f.src='about:blank';}
 map.on('move zoom',onMove);map.on('moveend zoomend',onEnd);
 resize();for(let i=0;i<2;i++)write(i,canonical(current()));
 return {resize,setVisible,retry,dispose,sync:()=>{requestPreview();schedule();}};
}
