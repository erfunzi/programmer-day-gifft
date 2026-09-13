'use strict';
let loadedProfileReadme='',loadedProjectReadmes=[];
const $=id=>document.getElementById(id);let current=null,active=null,openAsVisitor=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CREATOR_LOGIN='erfunzi';
function isProjectCreator(user,demo){return !demo&&String(user?.login||'').toLowerCase()===CREATOR_LOGIN}
const put=(id,value)=>{$(id).textContent=String(value)};const pause=ms=>new Promise(r=>setTimeout(r,reduced?0:ms));
function normalize(value){const v=value.trim().replace(/^https?:\/\/(www\.)?github\.com\//i,'').replace(/^@/,'').replace(/\/$/,'');return /^(?!-)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(v)&&!v.includes('--')?v:null}
async function loadGithubProfile(username,signal){
 const response=await fetch('/api/github/'+encodeURIComponent(username),{signal});
 const data=await response.json();
 if(!response.ok)throw Error(data.message||'دریافت اطلاعات گیت‌هاب انجام نشد.');
 loadedProfileReadme=data.profileReadme||'';loadedProjectReadmes=Array.isArray(data.projectReadmes)?data.projectReadmes:[];window.__developerReadmes={profile:loadedProfileReadme,projects:loadedProjectReadmes};
 return data;
}
function analyze(user,repos){const original=repos.filter(r=>!r.fork);const counts={};original.forEach(r=>{if(r.language)counts[r.language]=(counts[r.language]||0)+1});const languages=Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));const lang=languages[0]?.[0]||null;const titles={JavaScript:['Web Developer','وب با ایده‌های تو زنده‌ست.','از ایده تا چیزی که آدم‌ها هر روز باهاش کار می‌کنن؛ تو این فاصله رو با کد پر می‌کنی.'],TypeScript:['Web Developer','برای ایده‌های بزرگ، تایپ‌های دقیق.','تو به ایده‌ها ساختار می‌دی؛ یک تایپ، یک کامپوننت و یک قدم رو به جلو.'],Python:['Python Developer','ایده‌ها، به زبان پایتون.','از ساده‌کردن کارهای تکراری تا کشف چیزهای تازه؛ کد تو شروع یک احتماله.'],Go:['Go Developer','ساده می‌نویسی. بزرگ می‌سازی.','پشت سادگی هر ابزار خوب، تصمیم‌های دقیق هست. به افتخار چیزهایی که با Go می‌سازی.'],Rust:['Rust Developer','ساختن، با دقتی از جنس Rust.','به افتخار حوصله‌ای که برای درست ساختن داری؛ حتی وقتی کامپایلر موافق نیست.'],Swift:['Apple Platforms Developer','ایده‌هایی که لمس می‌شن.','تو از خط‌های کد، تجربه‌های قابل لمس می‌سازی. همین جزئیات کوچیک دنیا رو بهتر می‌کنن.'],Kotlin:['Kotlin Developer','یک ایده، یک تجربهٔ تازه.','به افتخار تجربه‌هایی که با Kotlin خلق می‌کنی و مسئله‌هایی که براشون راه پیدا می‌کنی.'],Java:['Java Developer','پایه‌های محکم، ایده‌های بزرگ.','به افتخار پشتکاری که پشت هر پروژه‌ات هست؛ ساختن ارزش همین تلاش رو داره.'],Dockerfile:['Environment Builder','جایی که کد به دنیا می‌رسد.','تو فقط برنامه نمی‌نویسی؛ جایی که برنامه نفس می‌کشد را هم می‌سازی.']};const theme=titles[lang]||[lang?lang+' Developer':'Software Developer','داستان تو هنوز داره نوشته می‌شه.','هر پروژه از یک ایده شروع می‌شه و با کنجکاوی ادامه پیدا می‌کنه. به افتخار شوقی که برای ساختن داری.'];return {user,repos,original,languages,lang,theme,stars:original.reduce((n,r)=>n+(r.stargazers_count||0),0),top:[...original].sort((a,b)=>b.stargazers_count-a.stargazers_count)[0]}}
function log(text,percent){const p=document.createElement('p');p.textContent=text;$('logs').append(p);$('progress').style.width=percent+'%'}
async function start(value,demo=false){const username=normalize(value);if(!username){put('error','یک آیدی معتبر یا لینک پروفایل گیت‌هاب وارد کن.');$('username').focus();return}active?.abort();active=new AbortController();const controller=active;put('error','');$('intro').classList.add('hidden');$('result').classList.add('hidden');$('loading').classList.remove('hidden');$('submit').disabled=true;$('logs').replaceChildren();$('progress').style.width='0';let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort()},25000);try{log('$ connecting to @'+username+' ...',12);let user,repos=[],fromCache=false,stale=false,fetchedAt=null;if(demo){user={login:'your-name',name:'Alex Developer',public_repos:24,followers:128,created_at:'2020-01-01',avatar_url:''};repos=[{name:'little-big-ideas',language:'TypeScript',stargazers_count:42,fork:false},{name:'weekend-build',language:'TypeScript',stargazers_count:16,fork:false},{name:'curiosity-lab',language:'Python',stargazers_count:8,fork:false}]}else{const profile=await loadGithubProfile(username,controller.signal);user=profile.user;repos=profile.repos;fromCache=!!profile.fromCache;stale=!!profile.stale;fetchedAt=profile.fetchedAt}await pause(450);log(fromCache?'✓ developer restored from shared cache: '+(user.name||user.login):'✓ developer found: '+(user.name||user.login),32);if(!demo){if(fromCache)log('✓ public projects loaded from cache ('+repos.length+')',55);else if(repos.length)log('✓ '+repos.length+' public repositories received',55)}log('✓ reading public projects & languages',72);await pause(550);current={...analyze(user,repos),demo,stale,fetchedAt};log('✓ appreciation compiled successfully',100);await pause(500);render();}catch(e){current=null;$('loading').classList.add('hidden');$('intro').classList.remove('hidden');put('error',timedOut?'پاسخ گیت‌هاب طول کشید. دوباره امتحان کن.':e.message);$('username').focus()}finally{clearTimeout(timeout);$('submit').disabled=false}}
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
function render(){const {user,languages,theme,top,demo}=current;put('greeting-name',user.name||user.login);put('name',user.name||user.login);put('handle','@'+user.login);$('handle').href=demo?'https://github.com':'https://github.com/'+encodeURIComponent(user.login);$('avatar').src=user.avatar_url||'favicon.svg';$('avatar').onerror=()=>{$('avatar').src='favicon.svg';$('avatar').onerror=null};put('role',isProjectCreator(user,demo)?'Creator of Developer Card':theme[0]);put('repos-count',user.public_repos);put('stars-count',current.stars.toLocaleString('en'));put('followers-count',user.followers.toLocaleString('en'));put('member-since','BUILDING SINCE '+new Date(user.created_at).getUTCFullYear());put('story-title',theme[1]);setMixedRtl($('personal-message'),composePersonalMessage(current));$('languages').replaceChildren();languages.slice(0,5).forEach(([name,count])=>{const span=document.createElement('span');span.className='language';span.textContent=name+' · '+count;$('languages').append(span)});put('scope',(demo?'داده‌های نمونه':current.repos.length+' مخزن عمومی بررسی شد'+(user.public_repos>current.repos.length?'؛ حداکثر ۲۰۰ مخزن با آخرین به‌روزرسانی':''))+' • زبان‌ها بر اساس تعداد مخزن‌های غیرفورک هستند؛ ستاره‌ها مربوط به همین مخزن‌هاست. عنوان تخصص، برداشت از زبان غالب است.');$('repo-highlight').classList.toggle('hidden',!top);if(top){const link=$('repo-highlight');const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';const name=document.createElement('span');name.dir='ltr';name.className='repo-name';name.textContent=top.name;const stars=document.createElement('span');stars.className='repo-stars';stars.textContent=top.stargazers_count.toLocaleString('fa-IR')+' ستاره';link.replaceChildren(arrow,name,stars);link.href=demo?'https://github.com':'https://github.com/'+encodeURIComponent(user.login)+'/'+encodeURIComponent(top.name)}put('branch',current.lang?current.lang.toLowerCase():'new-beginnings');applyInferredCharacterStyle(user);renderCharacter(current);$('qr').innerHTML=makeQR().createSvgTag({cellSize:2,margin:0,scalable:true});$('share').disabled=demo;put('action-status',demo?'QR نمونه به صفحهٔ ساخت کارت می‌رود.':openAsVisitor?'داری کارت یک نفر دیگه رو می‌بینی.':'لینک اختصاصی رو بفرست؛ دوستت کارت تو رو می‌بینه و می‌تونه کارت خودش رو هم بسازه.');$('demo-banner').classList.toggle('hidden',!demo);const showInvite=openAsVisitor&&!demo;const maker=isProjectCreator(user,demo);$('visitor-invite').classList.toggle('hidden',!showInvite);$('reset').classList.toggle('hidden',showInvite);$('creator-note').classList.toggle('hidden',!(maker&&!showInvite));if(showInvite){put('visitor-owner','@'+user.login);if(maker){put('visitor-title','این کارت مال سازندهٔ همین پروژه است.');put('visitor-body','@'+user.login+' این صفحه را ساخته. اگه دوست داری کارت اختصاصی خودت رو بسازی، همین‌جا آیدی گیت‌هابت رو وارد کن.')}else{$('visitor-title').replaceChildren('این کارت مال ',Object.assign(document.createElement('span'),{id:'visitor-owner',textContent:'@'+user.login}),' است.');put('visitor-body','اگه دوست داری کارت اختصاصی خودت رو بسازی، همین‌جا آیدی گیت‌هابت رو وارد کن.')}}$('loading').classList.add('hidden');$('result').classList.remove('hidden');if(!demo)history.replaceState(null,'',cardUrl());if(current.stale)put('action-status','گیت‌هاب موقتاً پاسخ نداد؛ کارت از اطلاعات ذخیره‌شدهٔ '+new Date(current.fetchedAt).toLocaleDateString('fa-IR')+' ساخته شد.');$('result').focus();celebrate()}
function celebrate(){if(reduced)return;const box=$('confetti');box.replaceChildren();for(let i=0;i<50;i++){const p=document.createElement('i');p.className='particle';p.style.left=Math.random()*100+'%';p.style.background=['#beff72','#f1f5ed','#82b6fa'][i%3];p.style.animationDelay=Math.random()*.6+'s';box.append(p)}setTimeout(()=>box.replaceChildren(),3300)}
$('lookup').addEventListener('submit',e=>{e.preventDefault();openAsVisitor=false;start($('username').value)});$('demo').onclick=()=>{openAsVisitor=false;start('demo',true)};$('celebrate').onclick=()=>{celebrate();put('action-status','🎉 امروز کارهای خوبت رو جشن بگیر. روزت مبارک!')};$('reset').onclick=()=>goBuildOwn();$('build-own').onclick=()=>goBuildOwn();$('share').onclick=async()=>{const link=cardUrl();try{await navigator.clipboard.writeText(link);put('action-status','لینک اختصاصی کپی شد ✓ دوستت کارت تو رو می‌بینه و همون‌جا می‌تونه کارت خودش رو بسازه.')}catch{put('action-status','لینک اختصاصی: '+link)}};$('print').onclick=()=>window.print();
const requested=new URLSearchParams(location.search).get('u');if(requested){openAsVisitor=true;$('username').value=requested;start(requested)}
