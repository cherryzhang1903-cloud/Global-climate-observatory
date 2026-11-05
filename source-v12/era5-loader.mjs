import {loadERA5,era5URL,parseERA5} from './era5.mjs';
import {localizeAnnualData} from './timezone.mjs';
const CACHE='climate-era5-2025-v1',MAX_AGE=30*86400000;
export async function loadERA5LocalHourly(station,year,timezone,signal){
 if(year!==2025||!station||!Number.isFinite(station.lat)||!Number.isFinite(station.lon))throw Error('ERA5站点坐标或年度无效');
 const start=performance.now(),url=era5URL(station.lat,station.lon);let raw,cacheHit=false;
 try{const c=await caches.open(CACHE),r=await c.match(url);if(r&&Date.now()-Number(r.headers.get('X-Saved-At'))<MAX_AGE){const d=await r.json();parseERA5(d,station);raw=d;cacheHit=true;}}catch{}
 if(signal?.aborted)throw new DOMException('请求已取消','AbortError');
 let obj;
 if(raw)obj={...parseERA5(raw,station),url,bytes:new TextEncoder().encode(JSON.stringify(raw)).length};
 else {
  // Persist only a validated ERA5 response, never use a different weather source.
  obj=await loadERA5(station,signal);
  if(obj.raw)try{const c=await caches.open(CACHE);await c.put(url,new Response(JSON.stringify(obj.raw),{headers:{'Content-Type':'application/json','X-Saved-At':String(Date.now())}}));const keys=await c.keys();for(const key of keys.slice(0,Math.max(0,keys.length-12)))await c.delete(key);}catch{}
 }
 if(signal?.aborted)throw new DOMException('请求已取消','AbortError');
 const data=localizeAnnualData([obj],year,timezone);
 if(data.rows.length!==8760)throw Error('ERA5当地年度时间轴不完整，请重试');
 const warnings=[];if(data.rows.some(r=>r[1]===null||r[2]===null||r[3]===null))warnings.push('部分温湿度值缺失，统计仅使用有效记录，缺失不补零。');
 return {...data,url:obj.url,grid:obj.grid,fetchSeconds:(performance.now()-start)/1000,bytes:obj.bytes,cacheHit,warnings,modelMetadataAvailable:false};
}
