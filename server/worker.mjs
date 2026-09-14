import {createGithubService,STALE_MS} from './github.mjs';
import {createWorkspace} from './workspace.mjs';
let service;
let workspace;
export default {
 async fetch(request,env){
  if(!service){service=createGithubService({cache:{
   async get(key){const r=await caches.default.match('https://devcard-cache.invalid/'+encodeURIComponent(key));return r?await r.json():null},
   async set(key,value){await caches.default.put('https://devcard-cache.invalid/'+encodeURIComponent(key),Response.json(value,{headers:{'Cache-Control':'public, max-age='+STALE_MS/1000}}))}
  }})}
  if(!workspace&&env.DB)workspace=createWorkspace({db:env.DB,profileService:service,images:env.BUCKET?{
   async put(key,bytes,type){await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}})},
   async get(key){const r=await env.BUCKET.get(key);return r?{body:r.body,type:r.httpMetadata?.contentType||'image/png'}:null}
  }:null});
  const result=(workspace?await workspace(request,env):null)||await service(request,env,request.headers.get('CF-Connecting-IP')||'unknown');if(result)return result;
  const pathname=new URL(request.url).pathname;
  if(pathname.split('/').some(p=>p.startsWith('.'))||pathname.startsWith('/server/'))return new Response('Not found',{status:404});
  return env.ASSETS.fetch(request);
 }
};
