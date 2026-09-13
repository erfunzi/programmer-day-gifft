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

function characterStyle(){const select=document.getElementById('character-style');return CHARACTER_STYLES.includes(select.value)?select.value:'neutral'}
function setCharacterStyle(style){const select=document.getElementById('character-style');select.value=CHARACTER_STYLES.includes(style)?style:'neutral'}

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

function characterProfile(data,now=Date.now()){
 const repos=data.original;const topics=repos.flatMap(r=>Array.isArray(r.topics)?r.topics:[]);const corpus=topics.join(' ').toLowerCase();const lang=data.lang;
 let kind='maker',label='OPEN SOURCE MAKER',title='سازندهٔ کنجکاو',hue=0,reason='از پروژه‌های عمومی و زبان‌های استفاده‌شده الهام گرفته است.';
 if(/machine-learning|data-science|artificial-intelligence|deep-learning/.test(corpus)||['Python','R','Julia','Jupyter Notebook'].includes(lang)){kind='data';label='DATA EXPLORER';title='کاوشگر داده';hue=75;reason='زبان‌ها یا موضوع‌های مرتبط با داده در پروژه‌های عمومی دیده می‌شوند.'}
 else if(/android|ios|flutter|react-native/.test(corpus)||['Swift','Kotlin','Dart'].includes(lang)){kind='mobile';label='POCKET WORLD BUILDER';title='سازندهٔ دنیای همراه';hue=180;reason='زبان‌ها یا موضوع‌های مرتبط با اپ‌های موبایل در پروژه‌ها دیده می‌شوند.'}
 else if(/gamedev|game-development|unity|unreal|godot/.test(corpus)){kind='game';label='WORLD BUILDER';title='جهان‌ساز';hue=230;reason='موضوع‌های مرتبط با ساخت بازی در پروژه‌ها دیده می‌شوند.'}
 else if(['JavaScript','TypeScript','CSS','HTML','Vue','Svelte'].includes(lang)){kind='web';label='INTERFACE ARCHITECT';title='معمار رابط‌ها';hue=0;reason='زبان غالب مخزن‌های غیرفورک به ساخت تجربه‌های وب مرتبط است.'}
 else if(['Go','Rust','C','C++','Java','C#','PHP','Ruby','Shell'].includes(lang)){kind='systems';label='SYSTEM GUARDIAN';title='نگهبان سیستم‌ها';hue=125;reason='از زبان غالب مخزن‌های غیرفورک و دنیای ابزارها و سیستم‌ها الهام گرفته است.'}
 const recent=repos.filter(r=>!r.archived&&Number.isFinite(Date.parse(r.pushed_at))&&now-Date.parse(r.pushed_at)>=0&&now-Date.parse(r.pushed_at)<90*86400000).length;
 const traits=[data.languages.length+' زبان',repos.length+' پروژهٔ مستقل'];if(recent)traits.push(recent+' به‌روزرسانی در ۹۰ روز');else traits.push('ماجراجویی ادامه داره');
 const seed=characterSeed(data.user.login);
 return {kind,label,title,hue,reason,traits,serial:seed.toString(16).toUpperCase().padStart(8,'0'),seed};
}

function characterAssetPath(style,kind){
 const pack=CHARACTER_PACK[style]||CHARACTER_PACK.neutral;
 const file=pack[kind]||pack.maker||'neutral.png';
 return 'characters/'+file;
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
  'soft cinematic studio lighting, solid dark olive background',
  'no text, no watermark, no logo'
 ].join(', ');
 const seed=(p.seed^({neutral:0,feminine:101,masculine:202}[style]||0)^(data.aiNonce||0))>>>0;
 return 'https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt)+
  '?width=768&height=768&seed='+seed+'&nologo=true&enhance=true&model=flux';
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
  img.onload=()=>{if(token!==characterLoadToken||my!==attempt)return;clear();stage?.classList.remove('is-building');img.dataset.src=src;onReady?.(true,src)};
  img.onerror=()=>{if(my===attempt)tryNext()};
  if(/pollinations\.ai/.test(src))timer=setTimeout(()=>{if(my===attempt)tryNext()},8000);
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
 document.getElementById('character-reason').textContent=
  p.title+' — '+p.reason+
  ' کاراکتر به‌صورت خودکار از تیپ پروژه‌ها و پروفایل ساخته می‌شود (مجموعهٔ AI با چند تیپ مختلف). اگر جنسیت از بیو مشخص نباشد، ربات بدون جنسیت می‌ماند.';
 const traits=document.getElementById('character-traits');
 traits.replaceChildren();
 p.traits.forEach(t=>{const span=document.createElement('span');span.textContent=t;traits.append(span)});
 const variant=document.createElement('span');
 variant.textContent='تیپ '+p.kind;
 traits.append(variant);

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
 const select=document.getElementById('character-style');
 const requestedStyle=new URLSearchParams(location.search).get('style');
 if(CHARACTER_STYLES.includes(requestedStyle)){select.value=requestedStyle;lockCharacterStyleFromUrl=true}

 select.addEventListener('change',()=>{
  if(!current)return;
  renderCharacter(current);
  document.getElementById('qr').innerHTML=makeQR().createSvgTag({cellSize:2,margin:0,scalable:true});
  if(!current.demo)history.replaceState(null,'',cardUrl());
 });

 const rebuild=document.getElementById('rebuild-character');
 if(rebuild){
  rebuild.addEventListener('click',()=>{
   if(!current)return;
   current.aiNonce=((current.aiNonce||0)+9973)>>>0;
   renderCharacter(current,{preferLiveAi:true});
   document.getElementById('qr').innerHTML=makeQR().createSvgTag({cellSize:2,margin:0,scalable:true});
   document.getElementById('action-status').textContent='در حال ساخت کاراکتر با AI رایگان… اگر در دسترس نباشد همان نسخهٔ محلی می‌ماند.';
  });
 }

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
