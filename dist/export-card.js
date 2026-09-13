'use strict';
async function imageDataUrl(src,filter=''){
 const load=async url=>{
  if(url.startsWith('data:')&&!filter)return url;
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('تصویر کارت کامل بارگذاری نشد؛ دوباره امتحان کن.');
  const blob=await response.blob();
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
 };
 const dataUrl=src.startsWith('data:')?src:await load(src);
 if(!filter||filter==='none')return dataUrl;
 const img=new Image();img.src=dataUrl;await img.decode();
 const canvas=document.createElement('canvas');
 canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;
 const ctx=canvas.getContext('2d');ctx.filter=filter;ctx.drawImage(img,0,0);
 return canvas.toDataURL('image/png');
}
async function downloadVisibleCard(){
 const button=document.getElementById('download');if(button.disabled||!current)return;
 const original=document.getElementById('dev-card'),login=current.user.login;
 button.disabled=true;let stage;
 put('action-status','در حال آماده‌کردن تصویر همین کارت…');
 try{
  await document.fonts.ready;
  const deadline=Date.now()+15000;
  while(original.querySelector('.is-building')){if(Date.now()>deadline)throw Error('کاراکتر هنوز آماده نیست؛ چند لحظه بعد دانلود کن.');await new Promise(r=>setTimeout(r,100))}
  await Promise.all([...original.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  const width=original.offsetWidth,height=original.offsetHeight;
  if(!width||!height||!window.htmlToImage)throw Error('صفحه را تازه‌سازی کن و دوباره امتحان کن.');

  // Snapshot the visible card DOM. Keep the stage on-screen (opacity 0):
  // far off-screen nodes paint empty in html-to-image / foreignObject.
  const clone=original.cloneNode(true);
  clone.classList.remove('auto-rotate');clone.classList.add('export-snapshot');
  clone.style.setProperty('--rx','0deg');clone.style.setProperty('--ry','0deg');
  Object.assign(clone.style,{
   width:width+'px',maxWidth:'none',margin:'0',
   transform:'none',transformStyle:'flat',isolation:'auto',
   animation:'none',transition:'none',overflow:'hidden',filter:'none'
  });

  stage=document.createElement('div');
  stage.className='export-stage';
  stage.setAttribute('aria-hidden','true');
  Object.assign(stage.style,{
   position:'fixed',left:'0',top:'0',
   width:(width+80)+'px',padding:'32px 40px 64px',boxSizing:'border-box',
   background:'#101412',opacity:'0',pointerEvents:'none',zIndex:'-1'
  });
  stage.append(clone);document.body.append(stage);

  await Promise.all([...clone.querySelectorAll('img')].map(async img=>{
   const baked=getComputedStyle(img).filter;
   img.removeAttribute('crossorigin');
   img.style.filter='none';
   img.src=await imageDataUrl(img.currentSrc||img.src,baked);
   await img.decode().catch(()=>{});
  }));
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  const blob=await htmlToImage.toBlob(clone,{
   pixelRatio:3,
   preferredFontFormat:'woff2',
   includeQueryParams:true,
   cacheBust:true,
   backgroundColor:'#101412',
   width,height,
   style:{transform:'none',margin:'0',left:'0',top:'0'}
  });
  if(!blob||blob.size<1000)throw Error('تصویر ساخته نشد؛ دوباره امتحان کن.');

  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='developer-card-'+login+'.png';a.hidden=true;a.dataset.cardDownload='true';
  document.body.append(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);
  put('action-status','تصویر همین کارت با کیفیت بالا آماده شد ✓');
 }catch(e){put('action-status',e.message||'دانلود انجام نشد؛ دوباره امتحان کن.')}finally{stage?.remove();button.disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('download').onclick=downloadVisibleCard});
