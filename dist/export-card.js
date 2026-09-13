'use strict';
async function imageDataUrl(src){
 if(src.startsWith('data:'))return src;
 const response=await fetch(src,{signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('تصویر کارت کامل بارگذاری نشد؛ دوباره امتحان کن.');
 const blob=await response.blob();return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
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
  await Promise.all([...original.querySelectorAll('img')].map(img=>img.decode()));
  const width=original.offsetWidth;
  if(!width||!window.htmlToImage)throw Error('صفحه را تازه‌سازی کن و دوباره امتحان کن.');
  // Snapshot the actual DOM: no second card layout, no redrawn text or QR.
  const clone=original.cloneNode(true);
  clone.classList.remove('auto-rotate');clone.classList.add('export-snapshot');
  Object.assign(clone.style,{width:width+'px',maxWidth:'none',margin:'0',transform:'none',animation:'none',transition:'none'});
  stage=document.createElement('div');stage.className='export-stage';stage.setAttribute('aria-hidden','true');
  Object.assign(stage.style,{position:'fixed',left:'-20000px',top:'0',width:(width+80)+'px',padding:'32px 40px 64px',boxSizing:'border-box',background:'#101412',pointerEvents:'none'});
  stage.append(clone);document.body.append(stage);
  await Promise.all([...clone.querySelectorAll('img')].map(async img=>{img.removeAttribute('crossorigin');img.src=await imageDataUrl(img.currentSrc||img.src);await img.decode()}));
  const blob=await htmlToImage.toBlob(stage,{pixelRatio:3,preferredFontFormat:'woff2',includeQueryParams:true,style:{position:'relative',left:'0',top:'0'},skipAutoScale:false});
  if(!blob||blob.size<1000)throw Error('تصویر ساخته نشد؛ دوباره امتحان کن.');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='developer-card-'+login+'.png';a.hidden=true;a.dataset.cardDownload='true';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);
  put('action-status','تصویر همین کارت با کیفیت بالا آماده شد ✓');
 }catch(e){put('action-status',e.message||'دانلود انجام نشد؛ دوباره امتحان کن.')}finally{stage?.remove();button.disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('download').onclick=downloadVisibleCard});
