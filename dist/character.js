'use strict';
const CHARACTER_STYLES=['neutral','feminine','masculine'];
const CHARACTER_KINDS=['maker','web','data','mobile','game','systems'];
/** AI-made character pack: style → kind → file (falls back to style base). */
const CHARACTER_PACK={
 neutral:{maker:'neutral.png',web:'neutral-web.png',data:'neutral-data.png',mobile:'neutral-mobile.png',game:'neutral-game.png',systems:'neutral-systems.png'},
 feminine:{maker:'feminine.png',web:'feminine-web.png',data:'feminine-data.png',mobile:'feminine-mobile.png',game:'feminine-game.png',systems:'feminine-systems.png'},
 masculine:{maker:'masculine.png',web:'masculine-web.png',data:'masculine-data.png',mobile:'masculine-mobile.png',game:'masculine-game.png',systems:'masculine-systems.png'}
};
const STYLE_LABEL={neutral:'ربات',feminine:'زنانه',masculine:'مردانه'};
let lockCharacterStyleFromUrl=false;
let characterLoadToken=0;
let selectedCharacterStyle='neutral';

function characterStyle(){return CHARACTER_STYLES.includes(selectedCharacterStyle)?selectedCharacterStyle:'neutral'}
function setCharacterStyle(style){selectedCharacterStyle=CHARACTER_STYLES.includes(style)?style:'neutral'}

/** Infer appearance only from clear profile signals; otherwise stay genderless. */
function inferCharacterStyle(user){
 const raw=[user?.name,user?.bio,user?.login].filter(Boolean).join('\n');
 const text=raw.toLowerCase();
 if(/\bthey\s*\/\s*them\b|\bpronouns?\s*[:：]\s*they\b|\bnon[- ]?binary\b|\bagender\b|\bgenderqueer\b|\bgender[- ]?neutral\b/.test(text))return 'neutral';
 let feminine=0,masculine=0;
 if(/she\s*\/\s*hers?|\bpronouns?\s*[:：]\s*she\b|\bi(?:'|\u2019)?m a (?:woman|girl|female)\b/.test(text)||/خانم|بانو|(?:^|[^\u0600-\u06FF])زن(?:[^\u0600-\u06FF]|$)/m.test(raw))feminine++;
 if(/he\s*\/\s*him|\bpronouns?\s*[:：]\s*he\b|\bi(?:'|\u2019)?m a (?:man|boy|male)\b/.test(text)||/آقای|آقا(?:\s|$|،|,|:)|(?:^|[^\u0600-\u06FF])مرد(?:[^\u0600-\u06FF]|$)/m.test(raw))masculine++;
 if(feminine&&!masculine)return 'feminine';
 if(masculine&&!feminine)return 'masculine';
 return 'neutral';
}
function applyInferredCharacterStyle(user){
 if(lockCharacterStyleFromUrl){lockCharacterStyleFromUrl=false;return characterStyle()}
 const style=inferCharacterStyle(user);
 setCharacterStyle(style);
 return style;
}

function characterSeed(login){return[...String(login||'dev')].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)}
function pickTrait(seed,list){return list[(seed>>>0)%list.length]}

function composeCharacterTraits(data,kind,now=Date.now()){
 const user=data.user||{};
 const repos=data.original||[];
 const langs=data.languages||[];
 const lang=data.lang;
 const top=data.top;
 const seed=characterSeed(user.login);
 const year=new Date(user.created_at).getUTCFullYear();
 const years=Math.max(1,new Date().getUTCFullYear()-(Number.isFinite(year)?year:new Date().getUTCFullYear()));
 const recent=repos.filter(r=>!r.archived&&Number.isFinite(Date.parse(r.pushed_at))&&now-Date.parse(r.pushed_at)>=0&&now-Date.parse(r.pushed_at)<90*86400000).length;
 const stars=Number(data.stars)||0;
 const followers=Number(user.followers)||0;
 const bag=[];

 if(lang){
  const langTraits={
   JavaScript:['جادوی DOM','وب‌باز شب‌بیدار','رابط‌ساز'],
   TypeScript:['تایپ‌باز دقیق','معمار تایپ‌ها','خطایاب سخت‌گیر'],
   Python:['جادوگر اسکریپت','کاشف داده','پایتون‌نویس آزاد'],
   Go:['ساده‌نویس سریع','نگهبان سرویس','گوفر مصمم'],
   Rust:['دقت‌طلب بی‌رحم','حافظه‌بان','کامپایل‌چَمپ'],
   Swift:['سازندهٔ لمسی','اپ‌نویس اپل','تجربه‌ساز جیبی'],
   Kotlin:['حلّال اندروید','کاتلین‌نویس','اپ‌ساز چابک'],
   Java:['پایه‌گذار محکم','ماشین پایدار','معمار کلاسیک'],
   Dockerfile:['محیط‌ساز','کپسول‌چی ران‌تایم','کشتی‌بان کانتینر'],
   Shell:['اتوماسیون‌چی','چسب ابزارها','اسکریپت‌باز شب'],
   HTML:['ساختارنویس','اسکلت‌ساز وب'],
   CSS:['استایل‌پرداز','جزئیات‌دوست'],
   PHP:['وب‌پشت‌صحنه','سرورنویس کهنه‌کار'],
   Ruby:['ظریف‌نویس','خوانایی‌دوست'],
   C:['نزدیک‌به‌فلز','کنترل‌طلب'],
   'C++':['قدرت‌طلب دقیق','موتورنویس'],
   'C#':['سیستم‌ساز قابل‌اتکا'],
   Dart:['اپ‌نویس همه‌جا','فلوترباز'],
   Vue:['کامپوننت‌چین','رابط‌ساز ماژولار']
  };
  bag.push(pickTrait(seed,(langTraits[lang]||[lang+' در خونش'])));
 }else if(langs.length){
  bag.push(pickTrait(seed,['چندنوازی کد',langs[0][0]+' · شروع داستان','جعبه ابزار باز']));
 }else{
  bag.push(pickTrait(seed,['فصل اول هنوز بازه','ایده قبل از زبان','آزمایشگاه شخصی']));
 }

 if(top?.name){
  bag.push(pickTrait(seed>>2,['امضای «'+top.name+'»','اثر انگشت: '+top.name,'قهرمان صحنه: '+top.name]));
 }else if(repos.length===1){
  bag.push(pickTrait(seed>>2,['تک‌پروژهٔ ویژه','یک شعله، یک داستان','اولین مخزن، اولین امضا']));
 }else if(repos.length){
  bag.push(pickTrait(seed>>2,[repos.length+' آزمایشگاه باز','کارگاه '+repos.length+' پروژه‌ای','سازندهٔ چندمسیره']));
 }else{
  bag.push(pickTrait(seed>>2,['صفحهٔ سفید شجاع','commit بعدی مال توئه','هنوز فصل مقدمه']));
 }

 if(recent>=5)bag.push(pickTrait(seed>>4,['نبض فعال ۹۰روزه','در حال ساختنِ همین الان','دست گرم، مخزن زنده']));
 else if(recent>=1)bag.push(pickTrait(seed>>4,['هنوز وسط ماجرا','به‌روزرسانی تازه','شعله خاموش نشده']));
 else bag.push(pickTrait(seed>>4,['در حال شارژ ایده‌ها','وقفهٔ خلاق',years+' سال مسیر باز']));

 if(stars>=50)bag.push(pickTrait(seed>>5,['ستاره‌جمع‌کن','ایده‌های دیده‌شده',stars+' ستاره در کارنامه']));
 else if(followers>=20)bag.push(pickTrait(seed>>5,['دنبال‌شونده',followers+' شاهد مسیر','صدا در اکوسیستم']));
 else if(user.bio)bag.push(pickTrait(seed>>5,['بیو پُر از ساختن','داستان روی پروفایل','هویتِ نوشته‌شده']));
 else{
  const vibe={
   maker:['سازندهٔ کنجکاو','جعبه ابزار شخصی','از هیچ تا چیزی'],
   web:['معمار تجربه', 'پیکسل‌دوست','رابط در خونش'],
   data:['کاوشگر الگو','نقشه‌کش داده','کنجکاوِ عدد'],
   mobile:['دنیای جیبی','لمس‌محور','اپ در دست'],
   game:['جهان‌ساز','پیکسل‌باز','داستان‌باز تعاملی'],
   systems:['نگهبان سیستم','ابزارساز زیرپوست','زیرساخت‌دوست']
  };
  bag.push(pickTrait(seed>>5,vibe[kind]||vibe.maker));
 }

 if(Number.isFinite(year)&&years>=3)bag.push(pickTrait(seed>>6,['از '+year+' تا امروز','کهنه‌کار صبور',years+' سال خط‌به‌خط']));

 const unique=[];
 for(const t of bag){
  if(t&&!unique.includes(t))unique.push(t);
  if(unique.length===4)break;
 }
 while(unique.length<3)unique.push(pickTrait(seed+unique.length,['کنجکاوِ تمام‌وقت','سازندهٔ روز ۲۵۶','داستانِ ناتمامِ قشنگ']));
 return unique.slice(0,4);
}

function characterProfile(data,now=Date.now()){
 const repos=data.original;const topics=repos.flatMap(r=>Array.isArray(r.topics)?r.topics:[]);const corpus=topics.join(' ').toLowerCase();const lang=data.lang;
 let kind='maker',label='OPEN SOURCE MAKER',title='سازندهٔ کنجکاو',hue=0,reason='از پروژه‌های عمومی و زبان‌های استفاده‌شده الهام گرفته است.';
 if(/machine-learning|data-science|artificial-intelligence|deep-learning/.test(corpus)||['Python','R','Julia','Jupyter Notebook'].includes(lang)){kind='data';label='DATA EXPLORER';title='کاوشگر داده';hue=75;reason='زبان‌ها یا موضوع‌های مرتبط با داده در پروژه‌های عمومی دیده می‌شوند.'}
 else if(/android|ios|flutter|react-native/.test(corpus)||['Swift','Kotlin','Dart'].includes(lang)){kind='mobile';label='POCKET WORLD BUILDER';title='سازندهٔ دنیای همراه';hue=180;reason='زبان‌ها یا موضوع‌های مرتبط با اپ‌های موبایل در پروژه‌ها دیده می‌شوند.'}
 else if(/gamedev|game-development|unity|unreal|godot/.test(corpus)){kind='game';label='WORLD BUILDER';title='جهان‌ساز';hue=230;reason='موضوع‌های مرتبط با ساخت بازی در پروژه‌ها دیده می‌شوند.'}
 else if(['JavaScript','TypeScript','CSS','HTML','Vue','Svelte'].includes(lang)){kind='web';label='INTERFACE ARCHITECT';title='معمار رابط‌ها';hue=0;reason='زبان غالب مخزن‌های غیرفورک به ساخت تجربه‌های وب مرتبط است.'}
 else if(['Go','Rust','C','C++','Java','C#','PHP','Ruby','Shell'].includes(lang)){kind='systems';label='SYSTEM GUARDIAN';title='نگهبان سیستم‌ها';hue=125;reason='از زبان غالب مخزن‌های غیرفورک و دنیای ابزارها و سیستم‌ها الهام گرفته است.'}
 else if(lang==='Dockerfile'){kind='systems';label='RUNTIME CAPTAIN';title='کشتی‌بان اجرا';hue=125;reason='از Dockerfile و دنیای محیط اجرا الهام گرفته است.'}
 const traits=composeCharacterTraits(data,kind,now);
 const seed=characterSeed(data.user.login);
 return {kind,label,title,hue,reason,traits,serial:seed.toString(16).toUpperCase().padStart(8,'0'),seed};
}

function characterAssetPath(style,kind){
 const pack=CHARACTER_PACK[style]||CHARACTER_PACK.neutral;
 const file=pack[kind]||pack.maker||'neutral.png';
 return 'characters/'+file+'?v=cutout';
}

/** Build a unique free AI URL (Pollinations). Used as optional upgrade; local pack is the reliable default. */
function liveAiCharacterUrl(data,style){
 const p=data.character;
 const gender={
  neutral:'androgynous cute humanoid robot with neon green visor eyes, mechanical hands',
  feminine:'friendly young woman software developer, shoulder-length dark wavy hair',
  masculine:'friendly young man software developer, short neat dark hair'
 }[style]||'cute developer character';
 const props={
  maker:'open-source maker vibes, toolbox sparkles',
  web:'floating holographic browser windows and neon UI panels',
  data:'glowing charts and constellation of data nodes',
  mobile:'holding a smartphone with tiny app holograms',
  game:'gaming headset and floating pixel crystals',
  systems:'circuit glow accents and terminal-green code wisps'
 }[p.kind]||'holding a laptop';
 const prompt=[
  'High quality 3D Pixar-like collectible character, waist-up, centered',
  gender,
  'wearing vibrant lime-green fleece hoodie',
  props,
  'soft cinematic lighting, isolated cutout, transparent background, no backdrop, no studio set',
  'no text, no watermark, no logo'
 ].join(', ');
 const seed=(p.seed^({neutral:0,feminine:101,masculine:202}[style]||0)^(data.aiNonce||0))>>>0;
 return 'https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt)+
  '?width=768&height=768&seed='+seed+'&nologo=true&enhance=true&model=flux&transparent=true';
}

function isolateCharacter(img){
 try{
  const w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h)return null;
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  const image=ctx.getImageData(0,0,w,h);
  const data=image.data;
  const pix=(x,y)=>(y*w+x)*4;
  const cornerAlpha=(data[pix(2,2)+3]+data[pix(w-3,2)+3]+data[pix(2,h-3)+3]+data[pix(w-3,h-3)+3])/4;
  if(cornerAlpha<80)return null;
  const samples=[pix(8,8),pix(w-9,8),pix(8,h-9),pix(w-9,h-9)];
  let br=0,bg=0,bb=0;
  samples.forEach(i=>{br+=data[i];bg+=data[i+1];bb+=data[i+2]});
  br/=4;bg/=4;bb/=4;
  const hard=11;
  const seen=new Uint8Array(w*h);
  const stack=[2,2,w-3,2,2,h-3,w-3,h-3];
  const dist2=(i)=>{const dr=data[i]-br,dg=data[i+1]-bg,db=data[i+2]-bb;return dr*dr+dg*dg+db*db};
  while(stack.length){
   const y=stack.pop(),x=stack.pop();
   if(x<0||y<0||x>=w||y>=h)continue;
   const p=y*w+x;
   if(seen[p])continue;
   if(dist2(pix(x,y))>=hard*hard)continue;
   seen[p]=1;
   data[pix(x,y)+3]=0;
   stack.push(x+1,y,x-1,y,x,y+1,x,y-1);
  }
  ctx.putImageData(image,0,0);
  return canvas.toDataURL('image/png');
 }catch{return null}
}

function setCharacterImage(img,sources,onReady){
 const token=++characterLoadToken;
 const stage=img.closest('.character-stage');
 stage?.classList.add('is-building');
 let i=0,timer=0,attempt=0;
 const clear=()=>{if(timer){clearTimeout(timer);timer=0}};
 const tryNext=()=>{
  clear();
  if(token!==characterLoadToken)return;
  if(i>=sources.length){stage?.classList.remove('is-building');onReady?.(false);return}
  const src=sources[i++];
  const my=++attempt;
  img.onload=()=>{
   if(token!==characterLoadToken||my!==attempt)return;
   const cut=isolateCharacter(img);
   if(cut){clear();img.src=cut;return}
   clear();stage?.classList.remove('is-building');img.dataset.src=src;onReady?.(true,img.src)
  };
  img.onerror=()=>{if(my===attempt)tryNext()};
  if(/pollinations\.ai/.test(src))timer=setTimeout(()=>{if(my===attempt)tryNext()},8000);
  img.crossOrigin='anonymous';
  img.src=src;
 };
 tryNext();
}

function renderCharacter(data,{preferLiveAi=false}={}){
 const p=characterProfile(data);data.character=p;
 const style=characterStyle();
 const local=characterAssetPath(style,p.kind);
 const sources=preferLiveAi?[liveAiCharacterUrl(data,style),local,characterAssetPath('neutral','maker')]:[local,characterAssetPath(style,'maker'),characterAssetPath('neutral','maker')];

 const card=document.getElementById('dev-card');
 card.style.setProperty('--character-hue',p.hue+'deg');
 card.dataset.archetype=p.kind;
 card.dataset.characterStyle=style;
 // Seeded micro-variation so same archetype still feels personal
 const tilt=((p.seed%7)-3)*0.35;
 const zoom=1+((p.seed>>3)%5)*0.012;
 card.style.setProperty('--character-tilt',tilt+'deg');
 card.style.setProperty('--character-zoom',String(zoom));

 const img=document.getElementById('character');
 img.alt='کاراکتر AI · '+STYLE_LABEL[style]+' · '+p.title;
 setCharacterImage(img,sources,(ok,src)=>{
  data.character.image=src||local;
  data.character.fromLiveAi=!!(src&&src.includes('pollinations.ai'));
 });

 document.getElementById('character-class').textContent=p.label;
 document.getElementById('character-code').textContent='#'+p.serial;
 const traits=document.getElementById('character-traits');
 traits.replaceChildren();
 p.traits.forEach(t=>{const span=document.createElement('span');span.textContent=t;traits.append(span)});

 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 if(!motion.matches){
  card.classList.add('auto-rotate');
 }else{
  card.classList.remove('auto-rotate');
  card.style.setProperty('--rx','0deg');
  card.style.setProperty('--ry','0deg');
 }
}

async function drawCharacter(ctx,data,x,y,size){
 const style=characterStyle();
 const src=data.character?.image||characterAssetPath(style,data.character?.kind||'maker');
 const img=new Image();
 img.crossOrigin='anonymous';
 img.src=src;
 try{await img.decode()}catch{
  img.crossOrigin=null;
  img.src=characterAssetPath(style,data.character?.kind||'maker');
  await img.decode();
 }
 ctx.save();
 if(style==='neutral')ctx.filter='hue-rotate('+(data.character?.hue||0)+'deg)';
 ctx.drawImage(img,x,y,size,size);
 ctx.restore();
}

document.addEventListener('DOMContentLoaded',()=>{
 const requestedStyle=new URLSearchParams(location.search).get('style');
 if(CHARACTER_STYLES.includes(requestedStyle)){setCharacterStyle(requestedStyle);lockCharacterStyleFromUrl=true}

 const card=document.getElementById('dev-card');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 card.addEventListener('pointermove',event=>{
  if(motion.matches||event.pointerType==='touch'||card.classList.contains('auto-rotate'))return;
  const r=card.getBoundingClientRect();
  const px=Math.min(1,Math.max(0,(event.clientX-r.left)/r.width));
  const py=Math.min(1,Math.max(0,(event.clientY-r.top)/r.height));
  card.style.setProperty('--ry',(px-.5)*15+'deg');
  card.style.setProperty('--rx',(.5-py)*12+'deg');
  card.style.setProperty('--shine-x',px*100+'%');
  card.style.setProperty('--shine-y',py*100+'%');
 });
 card.addEventListener('pointerleave',()=>{
  card.style.setProperty('--ry','0deg');
  card.style.setProperty('--rx','0deg');
 });
});
