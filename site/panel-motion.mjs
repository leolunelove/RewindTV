// Animate only when a panel changes state. No render loop or media-frame effects.
export function createPanelMotion(root){
 const states=new WeakMap(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const nav=new Map([['guide','remote-guide'],['schedule-overlay','schedule-button'],['browse-overlay','browse-button']]);
 function sync(){
  const panel=[...root.querySelectorAll('dialog[open]')].at(-1);
  const page=panel?({'guide':'200','schedule-overlay':'300','browse-overlay':'400','programme-info':'500','tv-settings':'600'})[['guide','schedule-overlay','browse-overlay','programme-info','tv-settings'].find(key=>panel.classList.contains(key))]:'100';
  const badge=root.querySelector?.('#teletext-page');if(badge)badge.textContent='P'+(page||'100');
  const id=panel&&nav.get([...nav.keys()].find(key=>panel.classList.contains(key)));
  for(const button of root.querySelectorAll('.app-tabs button')){
   const selected=panel ? button.id===id||(id==='remote-guide'&&button.classList.contains('guide-toggle')) : button.id==='live-tab';
   if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
  for(const button of root.querySelectorAll('[aria-haspopup=dialog]')){
   const target=button.classList.contains('guide-toggle')?'.guide':({'schedule-button':'.schedule-overlay','browse-button':'.browse-overlay','info-button':'.programme-info','settings-button':'.tv-settings'})[button.id];
   if(target)button.setAttribute('aria-expanded',String(!!root.querySelector(target)?.open));
  }
 }
 function reset(panel){const pending=states.get(panel);if(pending){pending.cancelled=true;pending.animation?.cancel();states.delete(panel);}if(panel.open)panel.close();}
 function open(panel){
  for(const other of root.querySelectorAll('dialog[open]'))if(other!==panel)reset(other);
  const old=states.get(panel);if(old){old.cancelled=true;old.animation?.cancel();states.delete(panel);}
  if(panel.open){sync();return;}
  panel.showModal();sync();
  if(!reduce.matches)panel.animate([{opacity:0,transform:'translateY(18px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 function close(panel){
  if(!panel.open||states.has(panel))return;
  if(reduce.matches){panel.close();sync();return;}
  const state={cancelled:false};states.set(panel,state);
  state.animation=panel.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(10px) scale(.99)'}],{duration:150,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
  state.animation.finished.then(()=>{if(state.cancelled)return;panel.close();state.animation.cancel();states.delete(panel);sync();}).catch(()=>{});
 }
 for(const panel of root.querySelectorAll('dialog')){
  panel.addEventListener('cancel',event=>{event.preventDefault();close(panel);});
  panel.addEventListener('close',sync);
  let outside=false;
  const isOutside=e=>{const r=panel.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  panel.addEventListener('pointerdown',e=>outside=e.target===panel&&isOutside(e));
  panel.addEventListener('pointerup',e=>{if(outside&&e.target===panel&&isOutside(e))close(panel);outside=false;});
 }
 return {open,close};
}
