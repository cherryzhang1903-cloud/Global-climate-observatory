import legacy from './legacy-range-relay.mjs';
export {validRange,cacheKey} from './legacy-range-relay.mjs';

const SITE='https://cherryzhang1903-cloud.github.io';
const DATASET='worldpop-2026-r2025a';
const MAX_ZOOM=6;
const IMMUTABLE='public, max-age=31536000, immutable';
const cors={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Expose-Headers':'Content-Length, ETag, X-Population-Tile','Vary':'Origin'};
const error=(message,status,head=false)=>new Response(head?null:message,{status,headers:{...cors,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});

export function validTile(pathname){
 const match=/^\/tiles\/worldpop-2026-r2025a\/(0|[1-9]\d*)\/(0|[1-9]\d*)\/(0|[1-9]\d*)\.webp$/.exec(pathname);
 if(!match)return null;
 const [z,x,y]=match.slice(1).map(Number),edge=2**z;
 return Number.isSafeInteger(z)&&z<=MAX_ZOOM&&Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x<edge&&y<edge?{z,x,y}:null;
}

async function tile(request,env){
 const head=request.method==='HEAD';
 if(!validTile(new URL(request.url).pathname))return error('Tile not found',404,head);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','HEAD'].includes(request.method))return error('GET or HEAD required',405);
 if(!env?.ASSETS?.fetch)return error('Population tile assets are unavailable',503,head);
 try{
  // Asset requests are canonical and contain no arbitrary target or query string.
  const assetURL=new URL(request.url);assetURL.search='';assetURL.hash='';
  const assetRequest=new Request(assetURL,{method:request.method});
  let result=await env.ASSETS.fetch(assetRequest),empty=false;
  if(result.status===404){
   await result.body?.cancel();
   assetURL.pathname='/transparent.webp';
   result=await env.ASSETS.fetch(new Request(assetURL,{method:request.method}));
   empty=true;
  }
  if(result.status!==200){await result.body?.cancel();return error('Population tile assets are unavailable',502,head);}
  const headers=new Headers(result.headers);
  for(const [name,value] of Object.entries(cors))headers.set(name,value);
  headers.set('Content-Type','image/webp');
  headers.set('Cache-Control',IMMUTABLE);
  headers.set('X-Population-Tile',empty?'EMPTY':'DATA');
  return new Response(head?null:result.body,{status:200,headers});
 }catch{return error('Population tile assets are unavailable',502,head);}
}

export default {async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(url.pathname==='/population/world.pmtiles')return legacy.fetch(request,env,ctx);
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==SITE)return error('Origin not allowed',403,request.method==='HEAD');
 if(url.pathname.startsWith('/tiles/'))return tile(request,env);
 if(url.pathname==='/population/tilejson.json'){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(!['GET','HEAD'].includes(request.method))return error('GET or HEAD required',405);
  const body=JSON.stringify({tilejson:'3.0.0',name:'WorldPop 2026 · R2025A',scheme:'xyz',tiles:[`${url.origin}/tiles/${DATASET}/{z}/{x}/{y}.webp`],minzoom:0,maxzoom:MAX_ZOOM,bounds:[-180,-60,180,84],attribution:'WorldPop · R2025A · 2026',tileSize:1024});
  return new Response(request.method==='HEAD'?null:body,{headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=3600'}});
 }
 return error('Not found',404,request.method==='HEAD');
}};
