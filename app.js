'use strict';
// 예식 정보, 계좌번호와 공개 주소는 최종 안내문에서 한 번 더 확인해 주세요.
const WEDDING = {
  groom: '박재용', bride: '박유진',
  date: '2026-11-14T16:00:00+09:00',
  venue: '제주 에코랜드호텔 호수정원',
  address: '제주시 조천읍 번영로 1278-169',
  phone: '064-801-6000',
  publicUrl: '',
  accounts: { groom: {bank:'국민은행',number:'253402 04 199720',holder:'박재용'},bride:{bank:'국민은행',number:'95779 9558 36',holder:'박유진'} }
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SLIDE_INTERVAL = 5200;
const SLIDE_MOTION_DURATION = 6300;
let slideIndex = 0;
let slideTimer;
let slidePlaying = !reduceMotion.matches;
let slideRequest = 0;
let pageReady = false;
// 확대 움직임은 슬라이드 투명도와 별도로 관리합니다.
// 떠나는 사진은 현재 확대 상태를 유지한 채 1.5초 동안 페이드아웃합니다.
const coverSlides = [...document.querySelectorAll('.cover-slide')];
const slideMotions = new Map();
const slideCleanupTimers = new Map();
function beginSlideMotion(slide, resumeVisible = false) {
  if (!pageReady) return;
  clearTimeout(slideCleanupTimers.get(slide));
  slideCleanupTimers.delete(slide);
  const image = slide.querySelector('img');
  const previous = slideMotions.get(slide);
  if (resumeVisible && previous) {
    previous.play();
    return;
  }
  if (previous) previous.cancel();
  slideMotions.delete(slide);
  if (reduceMotion.matches || typeof image.animate !== 'function') return;
  const detail = slide.classList.contains('slide-detail');
  const portrait = slide.classList.contains('slide-portrait');
  const start = detail ? 1.11 : portrait ? 1.08 : 1.025;
  const end = detail ? 1.17 : portrait ? 1.14 : 1.075;
  const animation = image.animate(
    [{ transform: `scale(${start})` }, { transform: `scale(${end})` }],
    { duration: SLIDE_MOTION_DURATION, easing: 'linear', fill: 'forwards' }
  );
  slideMotions.set(slide, animation);
}
function freezeOutgoingSlide(slide) {
  const animation = slideMotions.get(slide);
  if (animation) animation.pause();
  clearTimeout(slideCleanupTimers.get(slide));
  const timer = setTimeout(() => {
    if (slide.classList.contains('is-active')) return;
    const motion = slideMotions.get(slide);
    if (motion) motion.cancel();
    slideMotions.delete(slide);
    slideCleanupTimers.delete(slide);
  }, reduceMotion.matches ? 0 : 1550);
  slideCleanupTimers.set(slide, timer);
}
async function showSlide(index) {
  if (!pageReady) return;
  const requestedIndex=(index+3)%3,request=++slideRequest;
  const image=document.querySelector(`[data-slide="${requestedIndex}"] img`);
  if(image.dataset.coverSrc && !image.getAttribute('src'))image.src=image.dataset.coverSrc;
  if(!image.complete || !image.naturalWidth){
    const loaded=await new Promise(resolve=>{image.addEventListener('load',()=>resolve(true),{once:true});image.addEventListener('error',()=>resolve(false),{once:true});});
    if(!loaded || request!==slideRequest)return;
  }
  if (typeof image.decode === 'function') {
    try { await image.decode(); } catch (error) { return; }
  }
  if (request !== slideRequest || requestedIndex === slideIndex) return;
  const incoming = coverSlides[requestedIndex];
  const resumeVisible = parseFloat(getComputedStyle(incoming).opacity) > 0.001;
  freezeOutgoingSlide(coverSlides[slideIndex]);
  beginSlideMotion(incoming, resumeVisible);
  slideIndex = requestedIndex;
  document.querySelectorAll('.cover-slide').forEach((slide,i)=>{slide.classList.toggle('is-active',i===slideIndex);slide.setAttribute('aria-hidden',String(i!==slideIndex));});
  document.querySelectorAll('.slide-dot').forEach((dot,i)=>{dot.classList.toggle('is-active',i===slideIndex);i===slideIndex?dot.setAttribute('aria-current','true'):dot.removeAttribute('aria-current');});
  document.getElementById('slideNumber').textContent=`0${slideIndex+1} / 03`;
  document.getElementById('coverSlideshow').classList.toggle('is-detail',slideIndex===2);
}
function setSlideTimer() {clearInterval(slideTimer);if(pageReady && slidePlaying && !document.hidden && !document.querySelector('dialog[open]'))slideTimer=setInterval(()=>showSlide(slideIndex+1),SLIDE_INTERVAL);}
function updatePauseButton(){const button=document.getElementById('slidePause');button.setAttribute('aria-label',slidePlaying?'슬라이드 자동 재생 멈추기':'슬라이드 자동 재생 시작');button.innerHTML=slidePlaying?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7z"/></svg>';}
document.querySelectorAll('[data-slide-to]').forEach(button=>button.addEventListener('click',()=>{showSlide(Number(button.dataset.slideTo));setSlideTimer();}));
document.getElementById('slidePause').addEventListener('click',()=>{slidePlaying=!slidePlaying;updatePauseButton();setSlideTimer();});
document.addEventListener('visibilitychange',setSlideTimer);
let coverStart;
document.getElementById('coverSlideshow').addEventListener('touchstart',e=>{coverStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
document.getElementById('coverSlideshow').addEventListener('touchend',e=>{if(!coverStart)return;const dx=e.changedTouches[0].clientX-coverStart.x,dy=e.changedTouches[0].clientY-coverStart.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){showSlide(slideIndex+(dx<0?1:-1));setSlideTimer();}coverStart=null;},{passive:true});
updatePauseButton();

// 2026년 11월 달력. 날짜와 남은 시간은 한국 시간 기준으로 계산합니다.
const calendarDays=document.getElementById('calendarDays');
for(let row=0;row<5;row++){
  const week=document.createElement('div');week.className='calendar-row';week.setAttribute('role','row');
  for(let col=0;col<7;col++){
    const day=row*7+col+1,cell=document.createElement('span');cell.setAttribute('role','cell');
    if(day<=30){cell.textContent=String(day);if(col===0)cell.classList.add('sunday');if(day===14){cell.classList.add('wedding-day');cell.setAttribute('aria-label','11월 14일 토요일 오후 4시, 재용과 유진의 결혼식');cell.setAttribute('title','우리의 결혼식');}}
    week.append(cell);
  }calendarDays.append(week);
}
const weddingTime=new Date(WEDDING.date).getTime();
function updateCountdown(){
  const now=Date.now(),diff=Math.max(0,weddingTime-now),seconds=Math.floor(diff/1000);
  document.getElementById('countDays').textContent=String(Math.floor(seconds/86400)).padStart(2,'0');
  document.getElementById('countHours').textContent=String(Math.floor(seconds/3600)%24).padStart(2,'0');
  document.getElementById('countMinutes').textContent=String(Math.floor(seconds/60)%60).padStart(2,'0');
  document.getElementById('countSeconds').textContent=String(seconds%60).padStart(2,'0');
  const kstOffset=9*60*60*1000;
  const days=Math.floor((weddingTime+kstOffset)/86400000)-Math.floor((now+kstOffset)/86400000);
  const message=document.getElementById('ddayText');
  if(days>0)message.innerHTML=`재용과 유진의 결혼식이 <strong>${days}일</strong> 남았습니다.`;
  else if(days===0)message.textContent='오늘, 재용과 유진이 결혼합니다.';
  else message.textContent='재용과 유진의 시작을 함께해 주셔서 감사합니다.';
}
updateCountdown();setInterval(()=>{if(!document.hidden)updateCountdown();},1000);
document.addEventListener('visibilitychange',updateCountdown);

// 원본 사진 번호는 유지합니다. 표지 사진은 갤러리의 선택 목록과 별도로 사용합니다.
const GALLERY_ORDER = [1,2,3,4,5,6,7,8,9,10,15,11];
const PHOTO_ALTS=[
  '초록 정원 앞에서 함께 부케를 바라보는 재용과 유진','카페 테이블에 마주 앉아 웃는 두 사람','부케와 함께 서로를 안고 있는 두 사람','나란히 서서 함께하는 시작을 기념하는 두 사람','카페 앞에 앉아 서로를 바라보는 두 사람','밝은 창가에서 서로를 바라보는 두 사람','흰 드레스와 부케를 든 신부 유진','검은 정장과 부케를 든 신랑 재용','서로 맞잡은 손과 흰 부케','초록 커튼과 나무 벽 앞에 나란히 선 두 사람','초록 커튼 앞에서 결혼반지를 보여주는 두 사람','초록 커튼 앞에서 밝게 웃으며 반지를 보여주는 두 사람','카메라 화면에 담긴 두 사람의 맞잡은 손','창가에 앉아 서로의 반지를 바라보는 신랑 신부','초록 정원에서 서로를 안고 입 맞추는 신랑 신부'
];
const extraGalleryElement=document.getElementById('extraGalleryPhotos');
const extraGalleryPhotos=extraGalleryElement?JSON.parse(extraGalleryElement.textContent):[];
const photos=[...GALLERY_ORDER.map(number=>{const name=String(number).padStart(2,'0');return {name,alt:PHOTO_ALTS[number-1],full:`assets/photos/full-${name}.webp`,thumb:`assets/photos/thumb-${name}.webp`};}),...extraGalleryPhotos];
const galleryGrid=document.getElementById('galleryGrid');
photos.forEach((photo,index)=>{const button=document.createElement('button');button.type='button';button.className='gallery-item';button.dataset.photoIndex=String(index);button.setAttribute('aria-label',`${index+1}번째 사진 확대: ${photo.alt}`);button.hidden=index>=9;const img=document.createElement('img');img.src=photo.thumb;img.alt=photo.alt;img.width=600;img.height=600;img.loading='lazy';img.decoding='async';button.append(img);button.addEventListener('click',()=>openPhoto(index));galleryGrid.append(button);});
const galleryMore=document.getElementById('galleryMore');
galleryMore.querySelector('.remaining-count').textContent=String(photos.length-9);
galleryMore.addEventListener('click',()=>{const expanded=galleryMore.getAttribute('aria-expanded')!=='true';galleryMore.setAttribute('aria-expanded',String(expanded));galleryMore.innerHTML=expanded?'사진 접기 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>':`사진 더보기 <span class="remaining-count">${photos.length - 9}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;galleryGrid.querySelectorAll('.gallery-item').forEach((button,index)=>{if(index>=9)button.hidden=!expanded;});if(!expanded)galleryMore.scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'center'});});

// 브라우저 기본 dialog를 사용하여 포커스와 Esc 닫기를 지원합니다.
const lightbox=document.getElementById('lightbox'),lightboxImage=document.getElementById('lightboxImage'),lightboxStage=document.getElementById('lightboxStage');
let photoIndex=0,zoomed=false,lightboxStart=null;
function syncDialogState(){document.body.classList.toggle('modal-open',Boolean(document.querySelector('dialog[open]')));setSlideTimer();}
function openDialog(dialog){if(!dialog.open)dialog.showModal();syncDialogState();}
function closeDialog(dialog){dialog.close();syncDialogState();}
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',syncDialogState);dialog.addEventListener('click',event=>{if(event.target===dialog && dialog!==lightbox){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(dialog);}});});
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>closeDialog(document.getElementById(button.dataset.closeDialog))));
function setZoom(value){zoomed=value;lightboxStage.classList.toggle('is-zoomed',value);const button=document.getElementById('lightboxZoom');button.setAttribute('aria-pressed',String(value));button.setAttribute('aria-label',value?'사진 원래 크기로 보기':'사진 확대');lightboxStage.scrollTop=0;lightboxStage.scrollLeft=0;}
function renderPhoto(index){photoIndex=(index+photos.length)%photos.length;setZoom(false);const photo=photos[photoIndex];lightboxImage.classList.add('is-loading');lightboxImage.alt=photo.alt;lightboxImage.src=photo.full;document.getElementById('lightboxCounter').textContent=`${String(photoIndex+1).padStart(2,'0')} / ${photos.length}`;if(lightboxImage.complete)lightboxImage.classList.remove('is-loading');}
function openPhoto(index){renderPhoto(index);openDialog(lightbox);document.getElementById('lightboxClose').focus();}
lightboxImage.addEventListener('load',()=>lightboxImage.classList.remove('is-loading'));
lightboxImage.addEventListener('error',()=>{lightboxImage.classList.remove('is-loading');showToast('사진을 열 수 없습니다. 잠시 후 다시 선택해주세요.');});
document.getElementById('lightboxClose').addEventListener('click',()=>closeDialog(lightbox));
document.getElementById('lightboxPrev').addEventListener('click',()=>renderPhoto(photoIndex-1));
document.getElementById('lightboxNext').addEventListener('click',()=>renderPhoto(photoIndex+1));
document.getElementById('lightboxZoom').addEventListener('click',()=>setZoom(!zoomed));
lightboxImage.addEventListener('dblclick',()=>setZoom(!zoomed));
lightbox.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();renderPhoto(photoIndex+1);}if(event.key==='ArrowLeft'){event.preventDefault();renderPhoto(photoIndex-1);}});
lightboxStage.addEventListener('touchstart',event=>{if(!zoomed && event.touches.length===1)lightboxStart={x:event.touches[0].clientX,y:event.touches[0].clientY};else lightboxStart=null;},{passive:true});
lightboxStage.addEventListener('touchend',event=>{if(!lightboxStart||zoomed)return;const dx=event.changedTouches[0].clientX-lightboxStart.x,dy=event.changedTouches[0].clientY-lightboxStart.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))renderPhoto(photoIndex+(dx<0?1:-1));lightboxStart=null;},{passive:true});

// 지도 스크롤 잠금.
function lockMap(locked){document.getElementById('mapUnlock').hidden=!locked;document.getElementById('mapLock').hidden=locked;document.getElementById('venueMap').tabIndex=locked?-1:0;}
document.getElementById('mapUnlock').addEventListener('click',()=>lockMap(false));document.getElementById('mapLock').addEventListener('click',()=>lockMap(true));lockMap(true);
const navDialog=document.getElementById('navigationDialog');
function navigationFallback(provider){document.getElementById('navigationMessage').innerHTML=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)?'내비게이션 앱이 열리지 않으면<br>웹 지도에서 길을 확인해주세요.':`${provider} 앱은 모바일에서 이용하실 수 있습니다.<br>웹 지도에서 길을 확인해주세요.`;openDialog(navDialog);}
function launchNavigation(scheme,provider){if(!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){navigationFallback(provider);return;}let left=false;const handleVisibility=()=>{if(document.hidden){left=true;clearTimeout(fallbackTimer);document.removeEventListener('visibilitychange',handleVisibility);}};document.addEventListener('visibilitychange',handleVisibility);const fallbackTimer=setTimeout(()=>{document.removeEventListener('visibilitychange',handleVisibility);if(!left&&!document.hidden)navigationFallback(provider);},1800);window.location.href=scheme;}
document.getElementById('tmapLink').addEventListener('click',event=>{event.preventDefault();launchNavigation(event.currentTarget.href,'티맵');});
document.getElementById('naverLink').addEventListener('click',event=>{if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){event.preventDefault();launchNavigation(`nmap://navigation?dlat=33.4518774&dlng=126.6697322174&dname=${encodeURIComponent('에코랜드호텔')}&appname=mobile.wedding.invitation`,'네이버 지도');}});

// HTTPS에서는 Clipboard API, 파일로 열 때는 선택/복사 방식으로 동작합니다.
let toastTimer;
function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),3000);}
async function copyText(text,message){
  let copied=false;
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);copied=true;}}catch(error){/* 파일 뷰 / 권한 거부: 아래 기본 복사로 대체 */}
  if(!copied){const input=document.createElement('textarea');input.value=text;input.setAttribute('readonly','');input.style.cssText='position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';const container=document.querySelector('dialog[open]')||document.body;const focused=document.activeElement;container.append(input);input.focus();input.select();input.setSelectionRange(0,input.value.length);try{copied=document.execCommand('copy');}catch(error){copied=false;}input.remove();if(focused)focused.focus({preventScroll:true});}
  showToast(copied?message:'자동 복사가 어려우면 초대글을 길게 눌러 복사해주세요.');return copied;
}
document.getElementById('copyAddress').addEventListener('click',()=>copyText(WEDDING.address,'주소를 복사했습니다.'));
document.getElementById('dialogCopyAddress').addEventListener('click',()=>copyText(WEDDING.address,'주소를 복사했습니다.'));
document.querySelectorAll('[data-account]').forEach(body=>{
  const account=WEDDING.accounts[body.dataset.account]||{
    bank:body.querySelector('.account-bank').textContent.trim(),
    number:body.querySelector('.account-number').textContent.trim(),
    holder:body.dataset.holder||''
  };
  body.querySelector('.account-bank').textContent=account.bank;
  body.querySelector('.account-number').textContent=account.number;
  body.querySelector('.account-bottom>span').textContent=account.holder?`예금주 ${account.holder}`:'';
  body.classList.toggle('is-empty',!account.bank&&!account.number);
  const button=body.querySelector('[data-copy-account]');
  button.disabled=!/\d{5,}/.test(account.number.replace(/[\s-]/g,''));
  button.title=button.disabled?'계좌번호가 등록되면 복사할 수 있습니다.':'계좌번호 복사';
  button.addEventListener('click',()=>{if(!button.disabled)copyText(account.number,`${account.holder}님의 계좌번호를 복사했습니다.`);});
});

// 로컬 파일은 초대글을 공유합니다. 공개 HTTPS 주소가 있으면 링크도 함께 공유합니다.
function publishedUrl(){try{const url=new URL(WEDDING.publicUrl||window.location.href);if(url.protocol==='https:' && !/^(localhost|127\.|\[?::1)/i.test(url.hostname)){url.hash='';return url.href;}}catch(error){/* 공개 주소 미설정 */}return '';}
const publicUrl=publishedUrl();
const invitationText=`박재용 · 박유진, 결혼합니다.\n\n2026년 11월 14일 토요일 오후 4시\n제주 에코랜드호텔 호수정원\n제주시 조천읍 번영로 1278-169\n\n따뜻한 마음으로 결혼을 축복해주세요.${publicUrl?`\n\n${publicUrl}`:''}`;
document.getElementById('shareText').value=invitationText;
document.getElementById('copyInvitationLabel').textContent=publicUrl?'청첩장 링크 복사':'초대글 복사';
document.getElementById('copyInvitation').addEventListener('click',()=>copyText(publicUrl||invitationText,publicUrl?'청첩장 링크를 복사했습니다.':'초대글을 복사했습니다.'));
document.getElementById('shareTextCopy').addEventListener('click',()=>copyText(invitationText,'초대글을 복사했습니다.'));
document.getElementById('shareButton').addEventListener('click',async()=>{const data={title:'박재용 · 박유진의 결혼식에 초대합니다',text:invitationText};if(publicUrl){data.url=publicUrl;data.text=invitationText.replace(`\n\n${publicUrl}`,'');}if(navigator.share){try{await navigator.share(data);return;}catch(error){if(error.name==='AbortError')return;}}openDialog(document.getElementById('shareDialog'));});

function observeReveals(){if('IntersectionObserver' in window){document.documentElement.classList.add('js-ready');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}}
reduceMotion.addEventListener('change',()=>{if(reduceMotion.matches){slidePlaying=false;slideMotions.forEach(animation=>animation.cancel());slideMotions.clear();updatePauseButton();setSlideTimer();}});

// 축소판, 확대 사진, 표지, 하단 사진과 글꼴이 모두 준비되면 청첩장을 엽니다.
// 큰 원본은 작업을 세 개씩 처리하고 임시 Image 객체는 완료 후 보관하지 않습니다.
const invitationPage = document.querySelector('.invitation-page');
const pageLoader = document.getElementById('pageLoader');
const loadMessage = document.getElementById('pageLoadMessage');
const loadRetry = document.getElementById('pageLoadRetry');
const loadProgress = document.getElementById('pageLoadProgress');
const loadBar = document.getElementById('pageLoadBar');
const loadPercent = document.getElementById('pageLoadPercent');
const imageResources = new Map();
const readyImages = new Set();
let fontsReady = false;
let loadingPage = false;
let fontLoadFailed = false;
invitationPage.inert = true;
invitationPage.setAttribute('aria-busy', 'true');
document.querySelectorAll('img').forEach(image => {
  const source = image.getAttribute('src') || image.dataset.coverSrc;
  if (source) imageResources.set(new URL(source, document.baseURI).href, image);
});
photos.forEach(photo => {
  const url = new URL(photo.full, document.baseURI).href;
  if (!imageResources.has(url)) imageResources.set(url, null);
});
function updateLoadProgress(){
  const percent = Math.round((readyImages.size + Number(fontsReady)) / (imageResources.size + 1) * 100);
  loadBar.style.transform = `scaleX(${percent / 100})`;
  loadPercent.textContent = `${percent}%`;
  loadProgress.setAttribute('aria-valuenow', String(percent));
}
function waitForAsset(promise){
  let timer;
  const deadline = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Asset preparation timed out')), 120000);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
async function prepareImage(url, existingImage){
  const image = existingImage || new Image();
  image.loading = 'eager';
  image.decoding = 'async';
  let cleanup;
  const loaded = new Promise((resolve, reject) => {
    const finish = error => { cleanup(); error ? reject(error) : resolve(); };
    const onLoad = () => finish(image.naturalWidth ? null : new Error('Image is empty'));
    const onError = () => finish(new Error('Image could not be loaded'));
    cleanup = () => { image.removeEventListener('load', onLoad); image.removeEventListener('error', onError); };
    image.addEventListener('load', onLoad);
    image.addEventListener('error', onError);
    if (image.src !== url || (image.complete && !image.naturalWidth)) image.src = url;
    if (image.complete && image.naturalWidth) finish();
  });
  try {
    await waitForAsset(loaded.then(async () => {
      if (typeof image.decode === 'function') await image.decode();
      if (!image.naturalWidth) throw new Error('Image is empty');
    }));
    readyImages.add(url);
    updateLoadProgress();
  } catch (error) {
    cleanup();
    // 시간초과로 남은 요청을 끊어 다음 재시도에서 새 요청을 시작합니다.
    if (!image.naturalWidth) image.removeAttribute('src');
    throw error;
  } finally { cleanup(); }
}
async function prepareImages(){
  const pending = [...imageResources].filter(([url]) => !readyImages.has(url));
  let next = 0;
  const failures = [];
  async function worker(){
    while (next < pending.length) {
      const [url, image] = pending[next++];
      try { await prepareImage(url, image); } catch (error) { failures.push(url); }
    }
  }
  await Promise.all(Array.from({length:Math.min(3, pending.length)}, worker));
  if (failures.length) throw new Error('Required images are not ready');
}
async function prepareFonts(){
  if (fontsReady) return;
  if (!document.fonts) throw new Error('Font loading is unavailable');
  await waitForAsset((async () => {
    const faces = await Promise.all([
      document.fonts.load('400 16px InvitationSerif', '박재용 박유진 결혼식'),
      document.fonts.load('400 16px WeddingLatin', 'JY YJ'),
      document.fonts.load('italic 400 16px WeddingLatin', 'Our wedding day')
    ]);
    if (faces.some(group => !group.length || group.some(face => face.status !== 'loaded'))) throw new Error('Required fonts are not ready');
    await document.fonts.ready;
  })());
  fontsReady = true;
  updateLoadProgress();
}
async function revealInvitation(){
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  observeReveals();
  document.documentElement.classList.remove('is-loading');
  document.documentElement.classList.add('is-ready', 'is-opening');
  pageLoader.classList.add('is-leaving');
  if (!reduceMotion.matches) {
    await new Promise(resolve => {
      const finish = event => {
        if (event && (event.target !== pageLoader || event.propertyName !== 'opacity')) return;
        clearTimeout(timer);
        pageLoader.removeEventListener('transitionend', finish);
        resolve();
      };
      const timer = setTimeout(finish, 700);
      pageLoader.addEventListener('transitionend', finish);
    });
  }
  pageLoader.hidden = true;
  document.documentElement.classList.remove('is-opening');
  invitationPage.inert = false;
  invitationPage.setAttribute('aria-busy', 'false');
  pageReady = true;
  beginSlideMotion(coverSlides[slideIndex]);
  setSlideTimer();
}
async function prepareInvitation(){
  if (loadingPage || pageReady) return;
  loadingPage = true;
  fontLoadFailed = false;
  loadRetry.hidden = true;
  loadRetry.disabled = true;
  loadMessage.textContent = '두 사람의 소중한 순간을 준비하고 있어요.';
  const results = await Promise.allSettled([prepareImages(), prepareFonts()]);
  fontLoadFailed = results[1].status === 'rejected';
  if (results.some(result => result.status === 'rejected')) {
    loadMessage.textContent = '사진과 글꼴을 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.';
    loadRetry.hidden = false;
    loadRetry.disabled = false;
    loadingPage = false;
    return;
  }
  loadMessage.textContent = '이제, 두 사람의 소중한 순간을 함께해 주세요.';
  await revealInvitation();
  loadingPage = false;
}
loadRetry.onclick = () => { if (fontLoadFailed) window.location.reload(); else prepareInvitation(); };
prepareInvitation();
