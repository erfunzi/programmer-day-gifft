import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openLocalDb} from '../server/local-db.mjs';
import {createWorkspace} from '../server/workspace.mjs';
import {seal,hash,unseal} from '../server/security.mjs';
import {summarizeTime,comparisonWindows} from '../server/metrics.mjs';
const secret='a'.repeat(64),origin='https://card.test';
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'devcard-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));const db=await openLocalDb(join(dir,'db.sqlite'));let now=Date.parse('2026-09-14T09:00:00Z');
 for(const id of [1,2]){await db.prepare('INSERT INTO users(id,login,name,avatar,joined) VALUES(?,?,?,?,?)').bind(id,'user'+id,'User '+id,'',now).run();await db.prepare('INSERT INTO sessions(id,user_id,token,expires) VALUES(?,?,?,?)').bind(await hash('session'+id),id,await seal('github'+id,secret),now+86400000).run()}
 const profileService=async()=>Response.json({user:{id:1,login:'user1',name:'User'},repos:[],profileReadme:'secretish public text',projectReadmes:[]});
 const env={SESSION_SECRET:secret,APP_ORIGIN:origin,GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret'};
 const handle=createWorkspace({db,profileService,now:()=>now,fetcher:async(url,opts)=>url.includes('access_token')?Response.json({access_token:'oauth-token'}):Response.json({id:1,login:'user1',name:'User',type:'User'})});
 const request=(path,data,id=1,headers={})=>handle(new Request(origin+path,{method:data===undefined?'GET':'POST',headers:{cookie:'dc_session=session'+id,origin,'content-type':'application/json',...headers},...(data===undefined?{}:{body:JSON.stringify(data)})}),env);
 return {db,handle,env,request,advance(ms){now+=ms}};
}
test('one timer survives reloads and repeated starts, delayed stop cannot stop a newer session',async t=>{
 const f=await fixture(t);const starts=await Promise.all([f.request('/api/me/time/start',{}),f.request('/api/me/time/start',{})]);const first=await starts[0].json();assert.equal(first.active.id,(await starts[1].json()).active.id);f.advance(3600000);assert.equal((await(await f.request('/api/me/time')).json()).today,3600000);
 await f.request('/api/me/time/stop',{id:first.active.id});const second=await(await f.request('/api/me/time/start',{})).json();await f.request('/api/me/time/stop',{id:first.active.id});assert.equal((await(await f.request('/api/me/time')).json()).active.id,second.active.id);
});
test('timer and reports require identity and CSRF checks; users cannot stop each other',async t=>{
 const f=await fixture(t);assert.equal((await f.request('/api/me/time',undefined,999)).status,401);assert.equal((await f.request('/api/me/time/start',{},1,{origin:'https://evil.test'})).status,403);const a=await(await f.request('/api/me/time/start',{})).json();await f.request('/api/me/time/stop',{id:a.active.id},2);assert.equal((await(await f.request('/api/me/time')).json()).active.id,a.active.id);assert.equal((await(await f.request('/api/me/time',undefined,2)).json()).total,0);
});
test('card sharing is opt-in and never exposes README, sessions or timer history; unpublish removes access',async t=>{
 const f=await fixture(t);assert.equal((await f.request('/api/cards/user1',undefined,999)).status,404);await f.request('/api/me/share',{publish:true});const card=await(await f.request('/api/cards/user1',undefined,999)).json();assert.equal(card.user.login,'user1');assert.equal(card.profileReadme,undefined);assert.equal(card.projectReadmes,undefined);assert.equal(card.history,undefined);await f.request('/api/me/share',{publish:false});assert.equal((await f.request('/api/cards/user1',undefined,999)).status,404);
});
test('OAuth binds state to browser, uses PKCE, and refuses replay',async t=>{
 const f=await fixture(t);const start=await f.request('/auth/github');assert.equal(start.status,302);const location=new URL(start.headers.get('location'));assert.equal(location.searchParams.get('code_challenge_method'),'S256');assert.equal(location.searchParams.get('scope'),'read:user');const state=location.searchParams.get('state'),path='/auth/github/callback?code=code&state='+state;
 assert.match((await f.request(path)).headers.get('location'),/auth_error=state/);const callback=await f.request(path,undefined,1,{cookie:'dc_oauth='+state});assert.equal(callback.headers.get('location'),'/');assert.match(callback.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);assert.match(callback.headers.get('set-cookie'),/Secure/);assert.match((await f.request(path,undefined,1,{cookie:'dc_oauth='+state})).headers.get('location'),/auth_error=cancelled/);
});
test('tracked time splits at local midnight including DST and includes zero days in average',()=>{
 const from=Date.parse('2026-03-07T23:00:00-05:00'),end=Date.parse('2026-03-09T01:00:00-04:00');const t=summarizeTime([{started:from,ended:end}],'America/New_York',end,from);assert.equal(t.daily['2026-03-07'],3600000);assert.equal(t.daily['2026-03-08'],23*3600000);assert.equal(t.daily['2026-03-09'],3600000);assert.equal(t.total,25*3600000);assert.equal(t.elapsedDays,3);assert.equal(t.averagePerCalendarDay,25*3600000/3);
});
test('equal-duration yearly comparisons and encrypted token tamper resistance',async()=>{
 const w=comparisonWindows(new Date('2024-03-03T14:00:00Z'));assert.equal(Date.parse(w.current.to)-Date.parse(w.current.from),Date.parse(w.previous.to)-Date.parse(w.previous.from));const encrypted=await seal('token',secret);assert.ok(!encrypted.includes('token'));assert.equal(await unseal(encrypted,secret),'token');await assert.rejects(()=>unseal(encrypted,'b'.repeat(64)));
});
