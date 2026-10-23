// Page navigation shares one controller with the two small utility dialogs.
export function createPanelMotion(root){
 const states=new WeakMap(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const visible='dialog[open], [data-tv-page]:not([hidden])';
 const isPage=panel=>panel.hasAttribute?.('data-tv-page')===true;
 const isOpen=panel=>isPage(panel)?!panel.hidden:panel.open;
 const nav=new Map([['guide','remote-guide'],['schedule-overlay','schedule-button'],['browse-overlay','browse-button']]);
 function sync(){
  const panel=[...root.querySelectorAll(visible)].at(-1),pageOpen=!!panel&&isPage(panel);
  const page=panel?({'guide':'200','schedule-overlay':'300','browse-overlay':'400','programme-info':'500','tv-settings':'600'})[['guide','schedule-overlay','browse-overlay','programme-info','tv-settings'].find(key=>panel.classList.contains(key))]:'100';
  const badge=root.querySelector?.('#teletext-page');if(badge)badge.textContent='P'+(page||'100');
  root.classList?.toggle('teletext-open',pageOpen);
  for(const region of root.querySelectorAll('.club-layout, .tv-dock, .chrome, .status-line'))region.inert=pageOpen;
  const id=panel&&nav.get([...nav.keys()].find(key=>panel.classList.contains(key)));
  for(const button of root.querySelectorAll('.app-tabs button')){
   const selected=panel?button.id===id||(id==='remote-guide'&&button.classList.contains('guide-toggle')):button.id==='live-tab';
   if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
  for(const button of root.querySelectorAll('[aria-haspopup=dialog], .app-tabs [aria-controls]')){
   const target=button.classList.contains('guide-toggle')?'.guide':({'schedule-button':'.schedule-overlay','browse-button':'.browse-overlay','info-button':'.programme-info','settings-button':'.tv-settings'})[button.id];
   if(target)button.setAttribute('aria-expanded',String(!!root.querySelector(target)&&isOpen(root.querySelector(target))));
  }
 }
 function finishClose(panel,restoreFocus=false){
  if(isPage(panel)){panel.hidden=true;panel.dispatchEvent(new Event('close'));}
  else panel.close();
  sync();
  if(restoreFocus&&isPage(panel))root.querySelector?.('#live-tab')?.focus({preventScroll:true});
 }
 function reset(panel){const pending=states.get(panel);if(pending){pending.cancelled=true;pending.animation?.cancel();states.delete(panel);}if(isOpen(panel))finishClose(panel);}
 function open(panel){
  for(const other of root.querySelectorAll(visible))if(other!==panel)reset(other);
  const old=states.get(panel);if(old){old.cancelled=true;old.animation?.cancel();states.delete(panel);}
  if(isOpen(panel)){sync();return;}
  if(isPage(panel))panel.hidden=false;else panel.showModal();
  sync();
  if(isPage(panel))panel.querySelector('.page-back-tv')?.focus({preventScroll:true});
  if(!reduce.matches)panel.animate(isPage(panel)?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(18px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:isPage(panel)?160:280,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 function close(panel){
  if(!isOpen(panel)||states.has(panel))return;
  if(reduce.matches){finishClose(panel,true);return;}
  const state={cancelled:false};states.set(panel,state);
  state.animation=panel.animate(isPage(panel)?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(10px) scale(.99)'}],{duration:150,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
  state.animation.finished.then(()=>{if(state.cancelled)return;finishClose(panel,true);state.animation.cancel();states.delete(panel);}).catch(()=>{});
 }
 for(const panel of root.querySelectorAll('dialog, [data-tv-page]')){
  panel.addEventListener('cancel',event=>{event.preventDefault();close(panel);});
  panel.addEventListener('close',sync);
  if(isPage(panel)){
   panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close(panel);}});
   continue;
  }
  let outside=false;
  const isOutside=e=>{const r=panel.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  panel.addEventListener('pointerdown',e=>outside=e.target===panel&&isOutside(e));
  panel.addEventListener('pointerup',e=>{if(outside&&e.target===panel&&isOutside(e))close(panel);outside=false;});
 }
 return {open,close,isOpen,dismiss:reset};
}
