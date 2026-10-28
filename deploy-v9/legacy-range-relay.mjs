// Fixed-source legacy PMTiles relay. Cache entries are validated, versioned byte chunks.
const SOURCE='https://luminocity3d.org/WorldPopDen/pmtiles/WorldPopDen_z2-10.pmtiles';
const DATASET_VERSION='ghsl2020-luminocity-z2-10-v1';
const SITE='https://cherryzhang1903-cloud.github.io';
const CACHE_TTL=86400;
const INFLIGHT_LIMIT=8;
const inflight=new Map();

export function validRange(value){
 const m=/^bytes=(\d+)-(\d+)$/.exec(value||'');if(!m)return null;
 const [start,end]=m.slice(1).map(Number);
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&end>=start&&end-start+1<=8*1024*1024?{start,end}:null;
}

export function cacheKey(request,range){
 const url=new URL(request.url);
 url.pathname=`/__population-cache/${DATASET_VERSION}/${range.start}-${range.end}`;
 url.search='';url.hash='';
 // Do not copy Range: Cache API would treat it as a range within this stored chunk.
 return new Request(url,{method:'GET'});
}

function checkedChunk(range,status,contentRange,data,etag){
 const m=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange||'');
 if(status!==206||!m||Number(m[1])!==range.start||Number(m[2])!==Math.min(range.end,Number(m[3])-1)||data.byteLength!==Number(m[2])-range.start+1)throw Error('Invalid upstream byte range');
 return {data,contentRange,etag};
}

async function readCached(cache,key,range){
 if(!cache)return null;
 try{
  const cached=await cache.match(key);
  if(!cached)return null;
  return checkedChunk(range,206,cached.headers.get('X-Population-Content-Range'),await cached.arrayBuffer(),cached.headers.get('ETag'));
 }catch{
  try{await cache.delete(key);}catch{}
  return null;
 }
}

async function readOrigin(range){
 // A shared fetch must not inherit one browser request's cancellation signal.
 const upstream=await fetch(`${SOURCE}?v9range=${range.start}-${range.end}`,{headers:{Range:`bytes=${range.start}-${range.end}`,'Accept-Encoding':'identity'},signal:AbortSignal.timeout(45000)});
 const contentRange=upstream.headers.get('Content-Range');
 const m=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange||'');
 if(upstream.status!==206||!m||Number(m[1])!==range.start||Number(m[2])!==Math.min(range.end,Number(m[3])-1)){
  await upstream.body?.cancel();throw Error('Invalid upstream byte range');
 }
 const expected=Number(m[2])-range.start+1,body=new Uint8Array(expected),reader=upstream.body?.getReader();
 if(!reader)throw Error('Missing upstream body');
 let offset=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.byteLength>expected){await reader.cancel();throw Error('Upstream byte length exceeds range');}body.set(value,offset);offset+=value.byteLength;}
 }finally{reader.releaseLock();}
 if(offset!==expected)throw Error('Upstream byte length mismatch');
 return checkedChunk(range,upstream.status,contentRange,body.buffer,upstream.headers.get('ETag'));
}

function storeChunk(cache,key,chunk,ctx){
 if(!cache)return;
 // Cloudflare Cache API rejects cache.put(206); store a complete 200 byte chunk.
 const headers={'Content-Type':'application/octet-stream','Content-Length':String(chunk.data.byteLength),'X-Population-Content-Range':chunk.contentRange,'Cache-Control':`public, max-age=${CACHE_TTL}`};
 if(chunk.etag)headers.ETag=chunk.etag;
 const put=cache.put(key,new Response(chunk.data,{status:200,headers})).catch(()=>{});
 if(ctx?.waitUntil)ctx.waitUntil(put);
 return put;
}

export default {async fetch(request,env,ctx){
 const cors={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Range, If-Match, If-None-Match','Access-Control-Expose-Headers':'Content-Range, Accept-Ranges, ETag, Content-Length, X-Population-Cache','Vary':'Origin, Range'};
 const reply=(text,status)=>new Response(text,{status,headers:cors});
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==SITE)return reply('Origin not allowed',403);
 if(new URL(request.url).pathname!=='/population/world.pmtiles')return reply('Not found',404);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='GET')return reply('GET with a bounded Range header is required',405);
 const range=validRange(request.headers.get('Range'));if(!range)return reply('A single byte range of at most 8 MiB is required',416);
 try{
  const key=cacheKey(request,range),cache=globalThis.caches?.default;
  let chunk=await readCached(cache,key,range),diagnostic=chunk?'HIT':'MISS';
  if(!chunk){
   let pending=inflight.get(key.url);
   if(pending){diagnostic='COALESCED';chunk=await pending;}
   else{
    pending=readOrigin(range);
    if(inflight.size<INFLIGHT_LIMIT){
     inflight.set(key.url,pending);
     try{chunk=await pending;}finally{if(inflight.get(key.url)===pending)inflight.delete(key.url);}
    }else chunk=await pending;
    const put=storeChunk(cache,key,chunk,ctx);
    if(!ctx?.waitUntil)await put;
   }
  }
  const expected=request.headers.get('If-Match');
  if(expected&&expected!=='*'&&chunk.etag&&!expected.split(',').map(x=>x.trim()).includes(chunk.etag))return reply('Population archive changed; reload the source',412);
  const headers={...cors,'Content-Type':'application/octet-stream','Content-Range':chunk.contentRange,'Accept-Ranges':'bytes','Content-Length':String(chunk.data.byteLength),'Cache-Control':`public, max-age=${CACHE_TTL}`,'X-Population-Cache':diagnostic};
  if(chunk.etag)headers.ETag=chunk.etag;
  return new Response(chunk.data,{status:206,headers});
 }catch{return reply('Population upstream unavailable; retry later',502);}
}};
