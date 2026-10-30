import stations from './stations.json' with {type:'json'};
const allowedStations=new Set(stations);
const SITE='https://cherryzhang1903-cloud.github.io';
const MAX_BYTES=32*1024*1024;
const originAllowed=o=>!o||o===SITE||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
const cors=o=>({'Access-Control-Allow-Origin':o||SITE,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Expose-Headers':'X-Meteostat-Format, X-Meteostat-Source-URL, X-Meteostat-Modified, X-Meteostat-Upstream-Status, X-Meteostat-Cache','Vary':'Origin'});
export function validPath(path){const m=/^\/hourly\/(2024|2025|2026)\/([A-Za-z0-9]{3,12})\.csv\.gz$/.exec(path);return m&&allowedStations.has(m[2])?{year:Number(m[1]),id:m[2]}:null;}
const fail=(message,status,origin)=>new Response(message,{status,headers:{...cors(origin),'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
function bounded(stream){let size=0;return stream.pipeThrough(new TransformStream({transform(chunk,ctl){size+=chunk.byteLength;if(size>MAX_BYTES)throw Error('Meteostat file exceeds size limit');ctl.enqueue(chunk)}}));}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 if(!originAllowed(origin))return fail('Origin not allowed',403,SITE);
 const spec=validPath(url.pathname);if(!spec)return fail('Only catalog stations and 2024–2026 hourly files are supported',404,origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
 if(!['GET','HEAD'].includes(request.method))return fail('GET or HEAD required',405,origin);
 const key=new Request(url.origin+url.pathname),cached=await caches.default.match(key);
 if(cached){const headers=new Headers(cached.headers);for(const [k,v] of Object.entries(cors(origin)))headers.set(k,v);headers.set('X-Meteostat-Cache','HIT');return new Response(request.method==='HEAD'?null:cached.body,{status:200,headers})}
 const {year,id}=spec,statuses=[];
 const candidates=[['annual',`https://data.meteostat.net/hourly/${year}/${id}.csv.gz`],['legacy-annual',`https://bulk.meteostat.net/v2/hourly/${year}/${id}.csv.gz`],['legacy-archive',`https://bulk.meteostat.net/v2/hourly/${id}.csv.gz`]];
 for(const [format,source] of candidates){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
  try{
   // Construct a new server-side request; never forward Origin, cookies or credentials.
   const response=await fetch(source,{headers:{'User-Agent':'GlobalClimateObservatory/1.0','Accept':'application/gzip, application/octet-stream'},signal:ctl.signal,redirect:'manual'});
   statuses.push(response.status);
   if(response.status!==200){await response.body?.cancel();continue}
   if(!response.body||/text\/html/i.test(response.headers.get('Content-Type')||'')||Number(response.headers.get('Content-Length'))>MAX_BYTES){await response.body?.cancel();continue}
   const headers=new Headers({...cors(origin),'Content-Type':'application/gzip','Cache-Control':'public, max-age=86400','X-Meteostat-Format':format,'X-Meteostat-Source-URL':source,'X-Meteostat-Modified':response.headers.get('Last-Modified')||'unknown','X-Meteostat-Upstream-Status':statuses.join(','),'X-Meteostat-Cache':'MISS'});
   const result=new Response(bounded(response.body),{headers});
   if(ctx?.waitUntil)ctx.waitUntil(caches.default.put(key,result.clone()).catch(()=>{}));
   if(request.method==='HEAD'){await result.body.cancel();return new Response(null,{headers})}
   return result;
  }catch(e){statuses.push('network-error: '+String(e?.message||e).replace(/[\r\n]/g,' ').slice(0,140))}
  finally{clearTimeout(timer)}
 }
 return fail('Meteostat 官方数据暂不可用；上游状态：'+statuses.join(',')+'。未使用其他站点或本地数据替代。',502,origin);
}};
