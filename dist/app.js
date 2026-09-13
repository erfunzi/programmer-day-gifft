'use strict';
const $=id=>document.getElementById(id);let current=null,active=null,openAsVisitor=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CREATOR_LOGIN='erfunzi';
function isProjectCreator(user,demo){return !demo&&String(user?.login||'').toLowerCase()===CREATOR_LOGIN}
const put=(id,value)=>{$(id).textContent=String(value)};const pause=ms=>new Promise(r=>setTimeout(r,reduced?0:ms));
function normalize(value){const v=value.trim().replace(/^https?:\/\/(www\.)?github\.com\//i,'').replace(/^@/,'').replace(/\/$/,'');return /^(?!-)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(v)&&!v.includes('--')?v:null}
const GH_CACHE_PREFIX='devcard-gh:v1:';
const GH_CACHE_TTL=45*60*1000;
const GH_STALE_TTL=24*60*60*1000;
const ghInflight=new Map();
function ghCacheRead(key){
 try{
  const raw=localStorage.getItem(GH_CACHE_PREFIX+key);
  if(!raw)return null;
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed.t!=='number')return null;
  return {age:Date.now()-parsed.t,data:parsed.data};
 }catch{return null}
}
function ghCacheWrite(key,data){
 try{localStorage.setItem(GH_CACHE_PREFIX+key,JSON.stringify({t:Date.now(),data}))}catch{/* quota / private mode */}
}
function rateLimitError(response){
 const reset=Number(response.headers.get('x-ratelimit-reset'));
 const err=Error('محدودیت موقت درخواست‌های گیت‌هاب.'+(reset?' بعد از '+new Date(reset*1000).toLocaleTimeString('fa-IR')+' دوباره امتحان کن.':' چند دقیقهٔ دیگر دوباره امتحان کن.'));
 err.code='rate_limit';
 err.reset=reset||null;
 return err;
}
async function api(path,signal,{allowStale=true}={}){
 const cached=ghCacheRead(path);
 if(cached&&cached.age<GH_CACHE_TTL)return cached.data;
 if(ghInflight.has(path))return ghInflight.get(path);
 const job=(async()=>{
  let response;
  try{response=await fetch('https://api.github.com'+path,{signal,headers:{Accept:'application/vnd.github+json'}})}
  catch(e){if(e.name==='AbortError')throw e;if(allowStale&&cached&&cached.age<GH_STALE_TTL)return cached.data;throw Error('ارتباط با گیت‌هاب برقرار نشد. اینترنت را بررسی کن و دوباره امتحان کن.')}
  if(response.status===404)throw Error('این آیدی پیدا نشد. املای نام کاربری گیت‌هاب را بررسی کن.');
  if(response.status===403||response.status===429){
   if(allowStale&&cached&&cached.age<GH_STALE_TTL)return cached.data;
   throw rateLimitError(response);
  }
  if(!response.ok){
   if(allowStale&&cached&&cached.age<GH_STALE_TTL)return cached.data;
   throw Error('گیت‌هاب فعلاً پاسخ نمی‌دهد. دوباره امتحان کن.');
  }
  const data=await response.json();
  ghCacheWrite(path,data);
  return data;
 })();
 ghInflight.set(path,job);
 try{return await job}finally{ghInflight.delete(path)}
}
async function loadGithubProfile(username,signal){
 const profileKey='profile:'+username.toLowerCase();
 const cached=ghCacheRead(profileKey);
 if(cached&&cached.age<GH_CACHE_TTL)return {...cached.data,fromCache:true};
 try{
  const user=await api('/users/'+encodeURIComponent(username),signal);
  if(user.type!=='User')throw Error('این آیدی متعلق به یک سازمان است. آیدی شخصی یک برنامه‌نویس را وارد کن.');
  const repos=[];
  for(let page=1;page<=2;page++){
   const batch=await api('/users/'+encodeURIComponent(user.login)+'/repos?type=owner&sort=updated&per_page=100&page='+page,signal);
   repos.push(...batch);
   if(batch.length<100)break;
  }
  const payload={user,repos};
  ghCacheWrite(profileKey,payload);
  return {...payload,fromCache:false};
 }catch(e){
  if(e.code==='rate_limit'&&cached&&cached.age<GH_STALE_TTL)return {...cached.data,fromCache:true,stale:true};
  throw e;
 }
}
function analyze(user,repos){const original=repos.filter(r=>!r.fork);const counts={};original.forEach(r=>{if(r.language)counts[r.language]=(counts[r.language]||0)+1});const languages=Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));const lang=languages[0]?.[0]||null;const titles={JavaScript:['Web Developer','وب با ایده‌های تو زنده‌ست.','از ایده تا چیزی که آدم‌ها هر روز باهاش کار می‌کنن؛ تو این فاصله رو با کد پر می‌کنی.'],TypeScript:['Web Developer','برای ایده‌های بزرگ، تایپ‌های دقیق.','تو به ایده‌ها ساختار می‌دی؛ یک تایپ، یک کامپوننت و یک قدم رو به جلو.'],Python:['Python Developer','ایده‌ها، به زبان پایتون.','از ساده‌کردن کارهای تکراری تا کشف چیزهای تازه؛ کد تو شروع یک احتماله.'],Go:['Go Developer','ساده می‌نویسی. بزرگ می‌سازی.','پشت سادگی هر ابزار خوب، تصمیم‌های دقیق هست. به افتخار چیزهایی که با Go می‌سازی.'],Rust:['Rust Developer','ساختن، با دقتی از جنس Rust.','به افتخار حوصله‌ای که برای درست ساختن داری؛ حتی وقتی کامپایلر موافق نیست.'],Swift:['Apple Platforms Developer','ایده‌هایی که لمس می‌شن.','تو از خط‌های کد، تجربه‌های قابل لمس می‌سازی. همین جزئیات کوچیک دنیا رو بهتر می‌کنن.'],Kotlin:['Kotlin Developer','یک ایده، یک تجربهٔ تازه.','به افتخار تجربه‌هایی که با Kotlin خلق می‌کنی و مسئله‌هایی که براشون راه پیدا می‌کنی.'],Java:['Java Developer','پایه‌های محکم، ایده‌های بزرگ.','به افتخار پشتکاری که پشت هر پروژه‌ات هست؛ ساختن ارزش همین تلاش رو داره.'],Dockerfile:['Environment Builder','جایی که کد به دنیا می‌رسد.','تو فقط برنامه نمی‌نویسی؛ جایی که برنامه نفس می‌کشد را هم می‌سازی.']};const theme=titles[lang]||[lang?lang+' Developer':'Software Developer','داستان تو هنوز داره نوشته می‌شه.','هر پروژه از یک ایده شروع می‌شه و با کنجکاوی ادامه پیدا می‌کنه. به افتخار شوقی که برای ساختن داری.'];return {user,repos,original,languages,lang,theme,stars:original.reduce((n,r)=>n+(r.stargazers_count||0),0),top:[...original].sort((a,b)=>b.stargazers_count-a.stargazers_count)[0]}}
function log(text,percent){const p=document.createElement('p');p.textContent=text;$('logs').append(p);$('progress').style.width=percent+'%'}
async function start(value,demo=false){const username=normalize(value);if(!username){put('error','یک آیدی معتبر یا لینک پروفایل گیت‌هاب وارد کن.');$('username').focus();return}active?.abort();active=new AbortController();const controller=active;put('error','');$('intro').classList.add('hidden');$('result').classList.add('hidden');$('loading').classList.remove('hidden');$('submit').disabled=true;$('logs').replaceChildren();$('progress').style.width='0';let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort()},25000);try{log('$ connecting to @'+username+' ...',12);let user,repos=[],fromCache=false;if(demo){user={login:'your-name',name:'Alex Developer',public_repos:24,followers:128,created_at:'2020-01-01',avatar_url:''};repos=[{name:'little-big-ideas',language:'TypeScript',stargazers_count:42,fork:false},{name:'weekend-build',language:'TypeScript',stargazers_count:16,fork:false},{name:'curiosity-lab',language:'Python',stargazers_count:8,fork:false}]}else{const profile=await loadGithubProfile(username,controller.signal);user=profile.user;repos=profile.repos;fromCache=!!profile.fromCache}await pause(450);log(fromCache?'✓ developer restored from local cache: '+(user.name||user.login):'✓ developer found: '+(user.name||user.login),32);if(!demo){if(fromCache)log('✓ public projects loaded from cache ('+repos.length+')',55);else if(repos.length)log('✓ '+repos.length+' public repositories received',55)}log('✓ reading public projects & languages',72);await pause(550);current={...analyze(user,repos),demo};log('✓ appreciation compiled successfully',100);await pause(500);render();}catch(e){current=null;$('loading').classList.add('hidden');$('intro').classList.remove('hidden');put('error',timedOut?'پاسخ گیت‌هاب طول کشید. دوباره امتحان کن.':e.message);$('username').focus()}finally{clearTimeout(timeout);$('submit').disabled=false}}
function cardUrl(){const u=new URL(location.href);u.hash='';u.search='';if(!current.demo){u.searchParams.set('u',current.user.login);u.searchParams.set('style',characterStyle());}return u.href}
function goBuildOwn(){
 openAsVisitor=false;current=null;active?.abort();active=null;
 history.replaceState(null,'',location.pathname);
 $('result').classList.add('hidden');$('loading').classList.add('hidden');$('visitor-invite').classList.add('hidden');$('creator-note').classList.add('hidden');
 $('intro').classList.remove('hidden');$('username').value='';put('error','');$('username').focus();
}
function pick(seed,list){return list[(seed>>>0)%list.length]}
function storySeed(login){return[...String(login||'dev')].reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,7)}
function ltr(value){return '\u2066'+String(value)+'\u2069'}
function composePersonalMessage({user,languages,lang,original,stars,top,demo}){
 const name=user.name||user.login;
 const nameBit=/[\u0600-\u06FF]/.test(name)?name:ltr(name);
 const seed=storySeed(user.login);
 const year=new Date(user.created_at).getUTCFullYear();
 const years=Math.max(1,new Date().getUTCFullYear()-year);
 const repoCount=original.length;
 const langNames=languages.slice(0,3).map(([n])=>n);
 const recent=original.filter(r=>{const t=Date.parse(r.pushed_at);return Number.isFinite(t)&&Date.now()-t<90*86400000}).length;
 const n=v=>Number(v).toLocaleString('fa-IR');
 const flavor={
  JavaScript:'رابط‌هایی می‌سازی که آدم‌ها هر روز لمس می‌کنن.',
  TypeScript:'به ایده‌ها ساختار می‌دی؛ یک تایپ، یک قدم محکم‌تر.',
  Python:'از اسکریپت‌های کوچک تا کشف‌های بزرگ، مسیرت با آزمایش جلو می‌ره.',
  Go:'ساده می‌نویسی و سیستم‌های بزرگ را سرپا نگه می‌داری.',
  Rust:'حوصلهٔ درست‌ساختن را داری؛ حتی وقتی کامپایلر سخت می‌گیرد.',
  Swift:'از خط کد، تجربه‌ای می‌سازی که می‌شود توی جیب گذاشت.',
  Kotlin:'برای مسئله‌ها راه پیدا می‌کنی و تجربه‌های تازه می‌سازی.',
  Java:'پایه‌های محکم می‌چینی تا ایده‌های بزرگ رویشان بایستند.',
  Dockerfile:'جایی که بقیه فقط کد می‌نویسند، تو محیط اجرا را هم طراحی می‌کنی.',
  Shell:'ابزارها را به هم وصل می‌کنی تا کارها خودشان راه بیفتند.',
  HTML:'ساختار را طوری می‌چینی که ایده دیده شود.',
  CSS:'به رابط‌ها شخصیت می‌دهی؛ جزئیات همان جایی است که کار می‌درخشد.',
  PHP:'وب را از پشت صحنه زنده نگه می‌داری.',
  Ruby:'با ظرافت می‌سازی؛ خوانایی برای تو بخشی از معماری است.',
  C:'نزدیک فلز می‌نویسی؛ کنترل را جدی می‌گیری.',
  'C++':'قدرت و دقت را با هم می‌خواهی.',
  'C#':'سیستم‌هایی می‌سازی که هم جدی‌اند هم قابل اتکا.',
  Dart:'از یک ایده تا اپی که توی دست می‌چرخد، فاصله را کوتاه می‌کنی.',
  Vue:'قطعه‌قطعه رابط می‌سازی تا کل تجربه سرپا شود.'
 };
 const craft=flavor[lang]||(lang?'با '+ltr(lang)+' مسیر خودت را می‌سازی.':'با هر زبانی که دم دست باشد، چیزی را از هیچ می‌سازی.');
 const open=[
  nameBit+'، از '+n(year)+' تا امروز '+n(years)+' سال است که داری خط‌به‌خط دنیا را جابه‌جا می‌کنی.',
  nameBit+'، بین '+n(repoCount||user.public_repos||0)+' پروژهٔ عمومی، ردپای کنجکاوی‌ات معلوم است.',
  nameBit+'، کارت گیت‌هاب مثل دفترچهٔ آزمایشگاهی است که هنوز صفحه‌های نانوشته دارد.'
 ];
 if(langNames.length>=2)open.push(nameBit+'، بین '+ltr(langNames[0])+' و '+ltr(langNames[1])+' ابزار عوض می‌شود؛ شوق ساختن نه.');
 if(recent)open.push(nameBit+'، در ۹۰ روز اخیر '+n(recent)+' پروژه را زنده نگه داشتی؛ این یعنی هنوز وسط ماجرایی.');
 const mid=[];
 if(top){
  const repo=ltr(top.name);
  const s=top.stargazers_count||0;
  mid.push(s?'پروژهٔ '+repo+' با '+n(s)+' ستاره ثابت می‌کند ایده‌هایت در سیستم خودت زندانی نمی‌مانند.':'پروژهٔ '+repo+' شاید هنوز ستاره جمع نکرده باشد، اما آزمایشگاه ذهن توست.');
  mid.push('اگر بخواهی یک صحنه از فیلم کارت را نشان بدهی، اسمش می‌شود '+repo+'.');
  mid.push('همان '+repo+' را که ساختی، یک نفر جایی باز می‌کند و می‌فهمد تو فقط تماشاچی نبودی.');
 }else{
  mid.push('صفحهٔ خالی مخزن هم می‌تواند اولین کامیت بزرگ باشد؛ داستان از همین‌جا شروع می‌شود.');
  mid.push('هنوز پروژهٔ عمومی زیادی نداری؛ یعنی فصل بعد هنوز دست خودت است.');
 }
 if(stars>=20)mid.push(n(stars)+' ستاره روی کارهای غیرفورک یعنی آدم‌ها مسیر تو را دنبال کرده‌اند.');
 if(user.bio)mid.push('حتی بیو پروفایلت هم بوی ساختن می‌دهد.');
 const close=[
  'روز ۲۵۶ مبارک. امروز یک چیز کوچک بساز که خودت را غافلگیر کند.',
  'روز برنامه‌نویس مبارک؛ یک کامیت امروز، یک داستان فردا.',
  '۲۵۶مین روز سال به افتخار دست‌هایی که کد می‌نویسند — مخصوصاً مال تو.',
  'امروز لازم نیست بزرگ باشد. لازم است مال تو باشد. روزت مبارک.'
 ];
 const maker=isProjectCreator(user,demo)?'تو سازندهٔ همین پروژه‌ای؛ '+ltr('Developer Card')+' را از صفر برای همین روز ساختی. ':'';
 return pick(seed,open)+' '+maker+craft+' '+pick(seed>>>3,mid)+' '+pick(seed>>>7,close);
}
function setMixedRtl(el,text){
 el.replaceChildren();
 const re=/\u2066([^\u2069]*)\u2069/g;
 let last=0,match;
 while((match=re.exec(text))){
  if(match.index>last)el.append(document.createTextNode(text.slice(last,match.index)));
  const span=document.createElement('span');
  span.dir='ltr';
  span.className='ltr-bit';
  span.textContent=match[1];
  el.append(span);
  last=re.lastIndex;
 }
 if(last<text.length)el.append(document.createTextNode(text.slice(last)));
}
function makeQR(){const qr=qrcode(0,'M');qr.addData(cardUrl());qr.make();return qr}
function render(){const {user,languages,theme,top,demo}=current;put('greeting-name',user.name||user.login);put('name',user.name||user.login);put('handle','@'+user.login);$('handle').href=demo?'https://github.com':'https://github.com/'+encodeURIComponent(user.login);$('avatar').src=user.avatar_url||'favicon.svg';$('avatar').onerror=()=>{$('avatar').src='favicon.svg';$('avatar').onerror=null};put('role',isProjectCreator(user,demo)?'Creator of Developer Card':theme[0]);put('repos-count',user.public_repos);put('stars-count',current.stars.toLocaleString('en'));put('followers-count',user.followers.toLocaleString('en'));put('member-since','BUILDING SINCE '+new Date(user.created_at).getUTCFullYear());put('story-title',theme[1]);setMixedRtl($('personal-message'),composePersonalMessage(current));$('languages').replaceChildren();languages.slice(0,5).forEach(([name,count])=>{const span=document.createElement('span');span.className='language';span.textContent=name+' · '+count;$('languages').append(span)});put('scope',(demo?'داده‌های نمونه':current.repos.length+' مخزن عمومی بررسی شد'+(user.public_repos>current.repos.length?'؛ حداکثر ۳۰۰ مخزن با آخرین به‌روزرسانی':''))+' • زبان‌ها بر اساس تعداد مخزن‌های غیرفورک هستند؛ ستاره‌ها مربوط به همین مخزن‌هاست. عنوان تخصص، برداشت از زبان غالب است.');$('repo-highlight').classList.toggle('hidden',!top);if(top){const link=$('repo-highlight');const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';const name=document.createElement('span');name.dir='ltr';name.className='repo-name';name.textContent=top.name;const stars=document.createElement('span');stars.className='repo-stars';stars.textContent=top.stargazers_count.toLocaleString('fa-IR')+' ستاره';link.replaceChildren(arrow,name,stars);link.href=demo?'https://github.com':'https://github.com/'+encodeURIComponent(user.login)+'/'+encodeURIComponent(top.name)}put('branch',current.lang?current.lang.toLowerCase():'new-beginnings');applyInferredCharacterStyle(user);renderCharacter(current);$('qr').innerHTML=makeQR().createSvgTag({cellSize:2,margin:0,scalable:true});$('share').disabled=demo;put('action-status',demo?'QR نمونه به صفحهٔ ساخت کارت می‌رود.':openAsVisitor?'داری کارت یک نفر دیگه رو می‌بینی.':'لینک اختصاصی رو بفرست؛ دوستت کارت تو رو می‌بینه و می‌تونه کارت خودش رو هم بسازه.');$('demo-banner').classList.toggle('hidden',!demo);const showInvite=openAsVisitor&&!demo;const maker=isProjectCreator(user,demo);$('visitor-invite').classList.toggle('hidden',!showInvite);$('reset').classList.toggle('hidden',showInvite);$('creator-note').classList.toggle('hidden',!(maker&&!showInvite));if(showInvite){put('visitor-owner','@'+user.login);if(maker){put('visitor-title','این کارت مال سازندهٔ همین پروژه است.');put('visitor-body','@'+user.login+' این صفحه را ساخته. اگه دوست داری کارت اختصاصی خودت رو بسازی، همین‌جا آیدی گیت‌هابت رو وارد کن.')}else{$('visitor-title').replaceChildren('این کارت مال ',Object.assign(document.createElement('span'),{id:'visitor-owner',textContent:'@'+user.login}),' است.');put('visitor-body','اگه دوست داری کارت اختصاصی خودت رو بسازی، همین‌جا آیدی گیت‌هابت رو وارد کن.')}}$('loading').classList.add('hidden');$('result').classList.remove('hidden');if(!demo)history.replaceState(null,'',cardUrl());$('result').focus();celebrate()}
function celebrate(){if(reduced)return;const box=$('confetti');box.replaceChildren();for(let i=0;i<50;i++){const p=document.createElement('i');p.className='particle';p.style.left=Math.random()*100+'%';p.style.background=['#beff72','#f1f5ed','#82b6fa'][i%3];p.style.animationDelay=Math.random()*.6+'s';box.append(p)}setTimeout(()=>box.replaceChildren(),3300)}
$('lookup').addEventListener('submit',e=>{e.preventDefault();openAsVisitor=false;start($('username').value)});$('demo').onclick=()=>{openAsVisitor=false;start('demo',true)};$('celebrate').onclick=()=>{celebrate();put('action-status','🎉 امروز کارهای خوبت رو جشن بگیر. روزت مبارک!')};$('reset').onclick=()=>goBuildOwn();$('build-own').onclick=()=>goBuildOwn();$('share').onclick=async()=>{const link=cardUrl();try{await navigator.clipboard.writeText(link);put('action-status','لینک اختصاصی کپی شد ✓ دوستت کارت تو رو می‌بینه و همون‌جا می‌تونه کارت خودش رو بسازه.')}catch{put('action-status','لینک اختصاصی: '+link)}};$('print').onclick=()=>window.print();
$('download').onclick=async()=>{const btn=$('download');btn.disabled=true;try{await document.fonts.ready;const c=document.createElement('canvas');c.width=1000;c.height=1400;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,1000,1400);g.addColorStop(0,'#273625');g.addColorStop(1,'#101b13');x.fillStyle=g;x.fillRect(0,0,1000,1400);x.strokeStyle='#718956';x.lineWidth=3;x.strokeRect(28,28,944,1344);const text=(s,y,size=28,color='#f1f5ed',font='monospace',maxWidth=840)=>{x.fillStyle=color;x.font=size+'px '+font;x.fillText(String(s),80,y,maxWidth)};text('DEVELOPER CARD',100);text('EDITION 256 / PROGRAMMER’S DAY',150,20,'#a7bc9b');text(current.user.name||current.user.login,290,54,'#f1f5ed','Vazir, sans-serif');text('@'+current.user.login,345,30,'#a7bc9b');text(current.theme[0],410,28,'#beff72');await drawCharacter(x,current,530,420,390);text('HAPPY',550,76,'#f1f5ed','Arial',440);text('PROGRAMMER’S',640,53,'#f1f5ed','Arial',430);text('DAY.',765,112,'#beff72','Arial');text(current.character.label,825,25,'#beff72');x.fillStyle='#4d6240';x.fillRect(80,870,840,2);text(current.user.public_repos+' PUBLIC REPOS',940,29);text(current.stars+' REPO STARS  /  '+current.user.followers+' FOLLOWERS',990,26);text('BUILDING SINCE '+new Date(current.user.created_at).getUTCFullYear(),1120,24,'#a7bc9b');text('KEEP BUILDING.',1200,33,'#beff72');text('STAY CURIOUS.',1250,33,'#beff72');text(current.demo?'DEMO · FICTIONAL DATA':'STARS: ANALYZED NON-FORK REPOSITORIES',1320,17,'#a7bc9b');const qr=makeQR(),n=qr.getModuleCount(),s=Math.floor(210/(n+8)),size=(n+8)*s,left=920-size,top=1080;x.fillStyle='#fff';x.fillRect(left,top,size,size);x.fillStyle='#0b140b';for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(qr.isDark(r,col))x.fillRect(left+(col+4)*s,top+(r+4)*s,s,s);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='developer-card-'+current.user.login+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);put('action-status','کارت PNG آماده شد ✓')}catch{put('action-status','دانلود انجام نشد؛ دوباره امتحان کن یا از چاپ کارت استفاده کن.')}finally{btn.disabled=false}};
const requested=new URLSearchParams(location.search).get('u');if(requested){openAsVisitor=true;$('username').value=requested;start(requested)}
