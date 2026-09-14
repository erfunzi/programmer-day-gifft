import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createGithubService} from './github.mjs';
import {createWorkspace} from './workspace.mjs';
import {openLocalDb} from './local-db.mjs';
if(existsSync('.env'))process.loadEnvFile('.env');
const root=resolve('dist'),cacheDir=resolve(process.env.CACHE_DIR||'.cache');await mkdir(cacheDir,{recursive:true});
const file=key=>resolve(cacheDir,createHash('sha256').update(key).digest('hex')+'.json');
const service=createGithubService({cache:{async get(key){try{return JSON.parse(await readFile(file(key),'utf8'))}catch{return null}},async set(key,data){const temp=file(key)+'.'+randomUUID();await writeFile(temp,JSON.stringify(data),{mode:0o600});await rename(temp,file(key))}}});
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain'};
const workspace= createWorkspace({db:await openLocalDb(resolve(cacheDir,'workspace.sqlite')),profileService:service,images:{
 async put(key,bytes,type){await writeFile(resolve(cacheDir,key+'.image'),Buffer.from(bytes));await writeFile(resolve(cacheDir,key+'.type'),type)},
 async get(key){try{return {body:await readFile(resolve(cacheDir,key+'.image')),type:await readFile(resolve(cacheDir,key+'.type'),'utf8')}}catch{return null}}
}});
const server=createServer(async(req,res)=>{
 try{
  const origin=process.env.APP_ORIGIN||'http://localhost:'+(process.env.PORT||8080);
  const url=new URL(req.url,origin);let payload;
  if(req.method==='POST'){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){res.writeHead(413);res.end();return}chunks.push(chunk)}payload=Buffer.concat(chunks)}
  const request=new Request(url,{method:req.method,headers:req.headers,...(payload?{body:payload}: {})});
  // Only enable behind a trusted proxy that overwrites X-Real-IP.
  const clientIp=process.env.TRUST_PROXY==='true'&&req.headers['x-real-ip']?String(req.headers['x-real-ip']):req.socket.remoteAddress;
  const response=await workspace(request,process.env)||await service(request,process.env,clientIp);
  if(response){res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  const path=decodeURIComponent(url.pathname);if(path.split('/').some(p=>p.startsWith('.'))||/^\/(server|client)(\/|$)/.test(path)){res.writeHead(404);res.end();return}
  const target=resolve(root,'.'+(path==='/'?'/index.html':path));if(!target.startsWith(root+sep)){res.writeHead(404);res.end();return}
  let data;try{data=await readFile(target)}catch{res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':extname(target)==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(500);res.end('Internal server error')}
});
server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Developer Card: http://localhost:'+(process.env.PORT||8080)));
