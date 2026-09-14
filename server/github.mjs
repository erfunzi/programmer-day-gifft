export const FRESH_MS=6*60*60*1000, STALE_MS=7*24*60*60*1000;
const validUsername=s=>/^(?!-)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(s)&&!s.includes('--');
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
class UpstreamError extends Error{constructor(code,status,retryAfter=0){super(code);Object.assign(this,{code,status,retryAfter})}}
const messages={not_found:'این آیدی گیت‌هاب پیدا نشد.',not_person:'این آیدی متعلق به یک سازمان است.',not_configured:'اتصال گیت‌هاب هنوز توسط سازنده تنظیم نشده است.',credentials:'توکن گیت‌هاب سرویس نیاز به بررسی یا تمدید دارد.',rate_limit:'گیت‌هاب موقتاً شلوغ است؛ کمی بعد دوباره امتحان کن.',upstream:'ارتباط با گیت‌هاب برقرار نشد. دوباره امتحان کن.',busy:'درخواست‌های زیادی فرستاده شده؛ یک دقیقه بعد امتحان کن.'};
const pick=(obj,keys)=>Object.fromEntries(keys.map(k=>[k,obj[k]]));

// Fixed public endpoints only. Tokens never appear in responses or cache entries.
export function createGithubService({cache,fetcher=fetch,now=Date.now}){
 const inflight=new Map(),clients=new Map();let cooldownUntil=0;
 async function get(key){try{return await cache.get(key)}catch{return null}}
 async function set(key,value){try{await cache.set(key,value)}catch{/* Cache outage must not break a successful lookup. */}}
 function admitted(ip){const time=now(),bucket=clients.get(ip);if(clients.size>10000)for(const [k,v]of clients)if(time-v.start>60000)clients.delete(k);if(clients.size>10000)clients.delete(clients.keys().next().value);if(!bucket||time-bucket.start>60000){clients.set(ip,{start:time,n:1});return true}return ++bucket.n<=20}
 async function upstream(path,token){
  if(now()<cooldownUntil)throw new UpstreamError('rate_limit',429,Math.ceil((cooldownUntil-now())/1000));
  let r;try{r=await fetcher('https://api.github.com'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'DeveloperCard'},signal:AbortSignal.timeout(6500),redirect:'error'})}catch{throw new UpstreamError('upstream',502)}
  if(r.status===404)throw new UpstreamError('not_found',404);
  if(r.status===401)throw new UpstreamError('credentials',503);
  if(r.status===403||r.status===429){const retry=Number(r.headers.get('retry-after')),reset=Number(r.headers.get('x-ratelimit-reset'));const seconds=Math.max(60,retry||0,reset?reset-now()/1000:0);cooldownUntil=now()+Math.min(seconds,3600)*1000;throw new UpstreamError('rate_limit',429,Math.ceil(seconds))}
  if(!r.ok)throw new UpstreamError('upstream',502);
  try{return await r.json()}catch{throw new UpstreamError('upstream',502)}
 }
 function decodeReadme(raw){
  if(!raw||typeof raw.content!=='string')return '';
  try{return new TextDecoder().decode(Uint8Array.from(atob(raw.content.replace(/\s/g,'')),c=>c.charCodeAt(0)))}catch{return ''}
 }
 function cleanReadme(text,max=1800){
  return String(text||'').replace(/```[\s\S]*?```/g,' ').replace(/<[^>]*>/g,' ').replace(/https?:\/\/\S+/g,' ').replace(/[#*_>`~]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
 }
 async function readme(path,token){try{return cleanReadme(decodeReadme(await upstream(path,token)))}catch(e){if(e.code==='not_found')return '';throw e}}
 async function load(username,token){
  const raw=await upstream('/users/'+username,token);if(raw.type!=='User')throw new UpstreamError('not_person',422);
  const user=pick(raw,['login','id','name','bio','type','avatar_url','public_repos','followers','created_at']);
  const repos=[];for(let page=1;page<=2;page++){
   if(page===1&&raw.public_repos===0)break;
   const batch=await upstream('/users/'+username+'/repos?type=owner&sort=updated&per_page=100&page='+page,token);
   if(!Array.isArray(batch))throw new UpstreamError('upstream',502);
   repos.push(...batch.filter(r=>!r.private).map(r=>pick(r,['name','description','language','stargazers_count','fork','archived','pushed_at','created_at','topics'])));
   if(batch.length<100)break;
  }
  const selected=[...repos].filter(r=>!r.fork&&!r.archived).sort((a,b)=>(b.stargazers_count||0)-(a.stargazers_count||0)).slice(0,3);
  const profileReadme=await readme('/repos/'+username+'/'+username+'/readme',token);
  const projectReadmes=[];
  for(const repo of selected){const text=await readme('/repos/'+username+'/'+encodeURIComponent(repo.name)+'/readme',token);if(text)projectReadmes.push({repo:repo.name,text})}
  return {user,repos,profileReadme,projectReadmes,fetchedAt:now()};
 }
 return async function handle(request,env={},ip='unknown'){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return null;
  if(request.method!=='GET')return json({error:'method_not_allowed'},405,{Allow:'GET'});
  const match=/^\/api\/github\/([a-zA-Z\d-]+)$/.exec(url.pathname);
  if(!match||!validUsername(match[1])||url.search)return json({error:'invalid_request',message:'آیدی معتبر گیت‌هاب وارد کن.'},400);
  const username=match[1].toLowerCase(),key='profile-v3:'+username;
  const cached=await get(key),age=cached?now()-cached.savedAt:Infinity;
  if(cached&&age>=0&&age<(cached.error?600000:FRESH_MS))return cached.error?json({error:cached.error,message:messages[cached.error]},cached.status):json({...cached.data,fromCache:true,stale:false});
  const stale=()=>cached?.data&&age>=0&&age<STALE_MS?json({...cached.data,fromCache:true,stale:true}):null;
  if(!String(env.GITHUB_TOKEN||'').trim())return stale()||json({error:'not_configured',message:messages.not_configured},503);
  if(!admitted(ip))return stale()||json({error:'busy',message:messages.busy},429,{'Retry-After':'60'});
  try{
   if(!inflight.has(key)){
    if(inflight.size>=16)return stale()||json({error:'busy',message:messages.busy},503,{'Retry-After':'10'});
    const job=load(username,env.GITHUB_TOKEN.trim()).then(async data=>{await set(key,{savedAt:now(),data});return data}).finally(()=>inflight.delete(key));inflight.set(key,job);
   }
   const data=await inflight.get(key);return json({...data,fromCache:false,stale:false});
  }catch(e){
   if(['not_found','not_person'].includes(e.code)){await set(key,{savedAt:now(),error:e.code,status:e.status});}
   else {const old=stale();if(old)return old;}
   const code=e instanceof UpstreamError?e.code:'upstream';return json({error:code,message:messages[code]},e.status||502,e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});
  }
 };
}
