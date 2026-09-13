'use strict';
async function toDataUrl(src){
 if(!src)throw Error('تصویر کارت کامل بارگذاری نشد؛ دوباره امتحان کن.');
 if(src.startsWith('data:'))return src;
 const response=await fetch(src,{signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('تصویر کارت کامل بارگذاری نشد؛ دوباره امتحان کن.');
 const blob=await response.blob();
 return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
}
async function bakeImage(img){
 const src=img.currentSrc||img.src;
 if(!src)return null;
 const dataUrl=await toDataUrl(src);
 const filter=getComputedStyle(img).filter;
 const tilt=getComputedStyle(img).getPropertyValue('transform');
 // Bake CSS filter (+ keep pixels crisp). Tilt/zoom stay as CSS on the live card.
 if(!filter||filter==='none'){
  img.removeAttribute('crossorigin');
  img.src=dataUrl;
  await img.decode().catch(()=>{});
  return null;
 }
 const loaded=new Image();loaded.src=dataUrl;await loaded.decode();
 const canvas=document.createElement('canvas');
 canvas.width=loaded.naturalWidth||loaded.width;
 canvas.height=loaded.naturalHeight||loaded.height;
 const ctx=canvas.getContext('2d');
 ctx.filter=filter;
 ctx.drawImage(loaded,0,0);
 const baked=canvas.toDataURL('image/png');
 img.removeAttribute('crossorigin');
 img.style.filter='none';
 img.src=baked;
 await img.decode().catch(()=>{});
 return {filter};
}
async function waitForCardReady(card,ms=15000){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){
  if(card.querySelector('.is-building')){await new Promise(r=>setTimeout(r,100));continue}
  const imgs=[...card.querySelectorAll('img')];
  const pending=imgs.filter(img=>!img.complete||img.naturalWidth<1);
  if(!pending.length){
   await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));
   return;
  }
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('کاراکتر هنوز آماده نیست؛ چند لحظه بعد دانلود کن.');
}
function freezeCard(card){
 const snapshot={
  className:card.className,
  style:card.getAttribute('style'),
  rx:card.style.getPropertyValue('--rx'),
  ry:card.style.getPropertyValue('--ry'),
  shineX:card.style.getPropertyValue('--shine-x'),
  shineY:card.style.getPropertyValue('--shine-y')
 };
 card.classList.remove('auto-rotate');
 card.classList.add('export-snapshot');
 card.style.setProperty('--rx','0deg');
 card.style.setProperty('--ry','0deg');
 card.style.setProperty('--shine-x','50%');
 card.style.setProperty('--shine-y','30%');
 card.style.transform='none';
 card.style.animation='none';
 card.style.transition='none';
 return snapshot;
}
function restoreCard(card,snapshot){
 card.className=snapshot.className;
 if(snapshot.style==null)card.removeAttribute('style');
 else card.setAttribute('style',snapshot.style);
}
async function downloadVisibleCard(){
 const button=document.getElementById('download');if(button.disabled||!current)return;
 const card=document.getElementById('dev-card'),login=current.user.login;
 button.disabled=true;
 put('action-status','در حال آماده‌کردن تصویر همین کارت…');
 let snapshot=null,imageRestores=[];
 try{
  await document.fonts.ready;
  await waitForCardReady(card);
  snapshot=freezeCard(card);
  // Let the turn animation fully stop on the live card before capture.
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await new Promise(r=>setTimeout(r,40));

  for(const img of card.querySelectorAll('img')){
   const prev={src:img.getAttribute('src'),filter:img.style.filter,crossorigin:img.getAttribute('crossorigin')};
   await bakeImage(img);
   imageRestores.push(()=>{
    if(prev.src==null)img.removeAttribute('src');else img.setAttribute('src',prev.src);
    img.style.filter=prev.filter||'';
    if(prev.crossorigin==null)img.removeAttribute('crossorigin');else img.setAttribute('crossorigin',prev.crossorigin);
   });
  }

  const width=card.offsetWidth,height=card.offsetHeight;
  if(!width||!height||!window.htmlToImage)throw Error('صفحه را تازه‌سازی کن و دوباره امتحان کن.');

  const fontEmbedCSS=await htmlToImage.getFontEmbedCSS(card,{preferredFontFormat:'woff2',includeQueryParams:true});
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  const blob=await htmlToImage.toBlob(card,{
   pixelRatio:Math.min(3,Math.max(2,window.devicePixelRatio||2)),
   fontEmbedCSS,
   skipFonts:false,
   cacheBust:true,
   backgroundColor:'#111c17',
   width,height,
   style:{
    transform:'none',
    animation:'none',
    transition:'none',
    margin:'0',
    left:'0',
    top:'0'
   }
  });
  if(!blob||blob.size<8000)throw Error('تصویر ساخته نشد؛ دوباره امتحان کن.');

  // Reject near-empty / black captures (failed foreignObject paint).
  const bmp=await createImageBitmap(blob);
  const probe=document.createElement('canvas');
  probe.width=Math.min(64,bmp.width);probe.height=Math.min(64,bmp.height);
  const pctx=probe.getContext('2d',{willReadFrequently:true});
  pctx.drawImage(bmp,0,0,probe.width,probe.height);
  const data=pctx.getImageData(0,0,probe.width,probe.height).data;
  let lit=0;for(let i=0;i<data.length;i+=4){if(data[i+3]>20&&data[i]+data[i+1]+data[i+2]>40)lit++}
  bmp.close?.();
  if(lit<80)throw Error('تصویر کامل نشد؛ یک‌بار دیگر امتحان کن.');

  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='developer-card-'+login+'.png';a.hidden=true;a.dataset.cardDownload='true';
  document.body.append(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);
  put('action-status','تصویر همین کارت با کیفیت بالا آماده شد ✓');
 }catch(e){put('action-status',e.message||'دانلود انجام نشد؛ دوباره امتحان کن.')}
 finally{
  imageRestores.forEach(fn=>{try{fn()}catch{}});
  if(snapshot)restoreCard(card,snapshot);
  button.disabled=false;
 }
}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('download').onclick=downloadVisibleCard});
