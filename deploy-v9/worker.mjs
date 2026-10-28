// Fixed-source PMTiles relay for the V9 GitHub Pages site. No arbitrary URLs.
const SOURCE='https://luminocity3d.org/WorldPopDen/pmtiles/WorldPopDen_z2-10.pmtiles';
const SITE='https://cherryzhang1903-cloud.github.io';
export function validRange(value){const m=/^bytes=(\d+)-(\d+)$/.exec(value||'');if(!m)return null;const [start,end]=m.slice(1).map(Number);return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&end>=start&&end-start+1<=8*1024*1024?{start,end}:null;}
export default {async fetch(request){
 const cors={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Range, If-Match, If-None-Match','Access-Control-Expose-Headers':'Content-Range, Accept-Ranges, ETag, Content-Length','Vary':'Origin'};
 const reply=(text,status)=>new Response(text,{status,headers:cors});
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==SITE)return reply('Origin not allowed',403);
 if(new URL(request.url).pathname!=='/population/world.pmtiles')return reply('Not found',404);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='GET')return reply('GET with a bounded Range header is required',405);
 const range=validRange(request.headers.get('Range'));if(!range)return reply('A single byte range of at most 8 MiB is required',416);
 try{
  const upstream=await fetch(`${SOURCE}?v9range=${range.start}-${range.end}`,{headers:{Range:`bytes=${range.start}-${range.end}`,'Accept-Encoding':'identity'},signal:request.signal});
  const m=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(upstream.headers.get('Content-Range')||'');
  if(upstream.status!==206||!m||Number(m[1])!==range.start||Number(m[2])!==Math.min(range.end,Number(m[3])-1)){await upstream.body?.cancel();return reply('Upstream returned an invalid byte range',502);}
  const data=await upstream.arrayBuffer();if(data.byteLength!==Number(m[2])-range.start+1)return reply('Upstream byte length mismatch',502);
  const headers={...cors,'Content-Type':'application/octet-stream','Content-Range':upstream.headers.get('Content-Range'),'Accept-Ranges':'bytes','Content-Length':String(data.byteLength),'Cache-Control':'public, max-age=86400'};
  if(upstream.headers.has('ETag'))headers.ETag=upstream.headers.get('ETag');
  return new Response(data,{status:206,headers});
 }catch{return reply('Population upstream unavailable; retry later',502);}
}};
