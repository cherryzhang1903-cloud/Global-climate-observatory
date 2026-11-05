/** ERA5 official ECMWF point series; no other weather source fallback. */
export const ERA5_BASE='https://polytope-edr.lumi.apps.dte.destination-earth.eu/collections/era5-single-levels';
export function era5URL(lat,lon){return ERA5_BASE+'/position?'+new URLSearchParams({f:'CoverageJSON',coords:`POINT(${lon} ${lat})`,'parameter-name':'t2m,d2m,tp,u10,v10,msl',datetime:'2024-12-31T00:00:00Z/2026-01-01T23:00:00Z'});}
const finite=x=>typeof x==='number'&&Number.isFinite(x);
// IFS CY41R2 saturation over water; RH=100*es(Td)/es(T).
export function relativeHumidity(t,td){if(!finite(t)||!finite(td)||t<=150||td<=150)return null;return Math.max(0,Math.min(100,100*Math.exp(17.502*(td-273.16)/(td-32.19)-17.502*(t-273.16)/(t-32.19))));}
export function parseERA5(doc,station){
 if(doc.type!=='Coverage'||doc.domainType!=='PointSeries')throw Error('ERA5不是点位时间序列');
 const axes=doc.domain.axes,lat=axes.y.values[0],lon=axes.x.values[0],times=axes.t.values;
 if(!finite(lat)||!finite(lon)||!Array.isArray(times)||!times.length)throw Error('ERA5网格或时间无效');
 if(station&&(Math.abs(lat-station.lat)>.25||Math.abs(((lon-station.lon+540)%360)-180)>.25))throw Error('ERA5网格距离站点异常');
 const units={t2m:'K',d2m:'K',tp:'m',u10:'m s**-1',v10:'m s**-1',msl:'Pa'},v={};
 for(const [k,unit] of Object.entries(units)){
  if(doc.parameters?.[k]?.unit?.symbol!==unit)throw Error(`ERA5 ${k} 单位无法识别`);
  const range=doc.ranges?.[k];if(range?.axisNames?.join(',')!=='t'||range.shape?.[0]!==times.length||range.values?.length!==times.length)throw Error(`ERA5 ${k} 轴长度不匹配`);v[k]=range.values;
 }
 let previous=-Infinity,clippedHumidity=0;
 const rows=times.map((time,i)=>{
  const ms=Date.parse(time);if(!Number.isFinite(ms)||ms<=previous||ms%3600000!==0)throw Error('ERA5时间重复、逆序或不在UTC整点');previous=ms;
  const t=finite(v.t2m[i])?v.t2m[i]-273.15:null,d=finite(v.d2m[i])?v.d2m[i]-273.15:null;
  if(finite(v.t2m[i])&&finite(v.d2m[i])&&v.d2m[i]>v.t2m[i])clippedHumidity++;
  const h=relativeHumidity(v.t2m[i],v.d2m[i]),p=finite(v.tp[i])&&v.tp[i]>=0?v.tp[i]*1000:null,w=finite(v.u10[i])&&finite(v.v10[i])?Math.hypot(v.u10[i],v.v10[i]):null,pr=finite(v.msl[i])?v.msl[i]/100:null;
  return [new Date(ms).toISOString().slice(0,19),t,d,h,p,w,pr];
 });
 return {rows,grid:{lat,lon},clippedHumidity,presentIndices:rows.map((_,i)=>i),modelIndices:[]};
}
export async function loadERA5(station,signal){
 const url=era5URL(station.lat,station.lon),start=performance.now(),ctl=new AbortController(),abort=()=>ctl.abort();if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,90000);
 try{const r=await fetch(url,{signal:ctl.signal,credentials:'omit'});if(!r.ok)throw Error(`ERA5官方接口返回 ${r.status}`);const bytes=await r.text(),raw=JSON.parse(bytes),data=parseERA5(raw,station);return {...data,raw,url,fetchSeconds:(performance.now()-start)/1000,bytes:new TextEncoder().encode(bytes).length};}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
