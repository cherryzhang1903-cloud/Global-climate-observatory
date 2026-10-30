import assert from 'node:assert/strict';
import worker,{validPath} from './worker.mjs';
const origin='https://cherryzhang1903-cloud.github.io';
assert.deepEqual(validPath('/hourly/2025/61024.csv.gz'),{year:2025,id:'61024'});
for(const path of ['/hourly/1900/61024.csv.gz','/hourly/2025/EVIL.csv.gz','/hourly/2025/../secret','/hourly/2025/61024.csv.gz/extra'])assert.equal(validPath(path),null);
let calls=[];const original=globalThis.fetch;globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
try{
 globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual','Cloudflare Workers supports only manual/follow redirects');calls.push({url,headers:new Headers(options.headers)});return new Response(new Uint8Array([31,139,1]),{headers:{'Content-Type':'application/x-gzip'}})};
 let r=await worker.fetch(new Request('https://relay.example/hourly/2025/61024.csv.gz',{headers:{Origin:origin}}),{},{});
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(r.headers.get('X-Meteostat-Format'),'annual');assert.equal(calls[0].headers.has('Origin'),false);assert.equal(calls[0].url,'https://data.meteostat.net/hourly/2025/61024.csv.gz');await r.arrayBuffer();
 calls=[];globalThis.fetch=async url=>{calls.push(url);return calls.length<3?new Response('Forbidden',{status:403}):new Response(new Uint8Array([31,139,1]),{headers:{'Content-Type':'application/x-gzip','Last-Modified':'Mon, 16 Feb 2026 02:40:30 GMT'}})};
 r=await worker.fetch(new Request('https://relay.example/hourly/2025/61024.csv.gz',{headers:{Origin:origin}}),{},{});assert.equal(r.status,200);assert.equal(r.headers.get('X-Meteostat-Format'),'legacy-archive');assert.equal(calls[2],'https://bulk.meteostat.net/v2/hourly/61024.csv.gz');assert.equal(r.headers.get('X-Meteostat-Upstream-Status'),'403,403,200');await r.arrayBuffer();
 calls=[];r=await worker.fetch(new Request('https://relay.example/hourly/2025/61024.csv.gz',{headers:{Origin:'https://unrelated.example'}}),{},{});assert.equal(r.status,403);assert.equal(calls.length,0);
 globalThis.fetch=async()=>new Response('Forbidden',{status:403});r=await worker.fetch(new Request('https://relay.example/hourly/2025/61024.csv.gz',{headers:{Origin:origin}}),{},{});assert.equal(r.status,502);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(await r.text(),/403/);
 r=await worker.fetch(new Request('https://relay.example/hourly/2025/61024.csv.gz',{method:'OPTIONS',headers:{Origin:origin}}),{},{});assert.equal(r.status,204);
 console.log('Relay: station/year allowlist, Origin stripping, CORS, declared archive fallback, upstream errors and preflight passed.');
}finally{globalThis.fetch=original;delete globalThis.caches;}
