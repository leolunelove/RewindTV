/* One continuous picture and one foreground page or utility. */
export function createPanelMotion(root){
 const doc=root.ownerDocument,win=doc?.defaultView;
 const reduce=win?.matchMedia?.('(prefers-reduced-motion: reduce)')||matchMedia('(prefers-reduced-motion: reduce)');
 const visible='dialog[open], [data-tv-page]:not([hidden])';
 const isPage=panel=>panel?.hasAttribute?.('data-tv-page')===true;
 const isOpen=panel=>!!panel&&(isPage(panel)?!panel.hidden:panel.open);
 const pageKey=panel=>panel?.classList.contains('home-page')?'home':panel?.classList.contains('library-player-page')?'library-watch':panel?.classList.contains('movie-night-page')?'movies':panel?.classList.contains('browse-overlay')?'library':panel?.classList.contains('schedule-overlay')?'guide':panel?'channels':'watch';
 const utilityKey=panel=>panel?.classList.contains('programme-info')?'info':panel?.classList.contains('tv-settings')?'settings':panel?.id==='shuffle-dialog'?'shuffle':null;
 const entries=new WeakMap(),invokers=new WeakMap();let switching=false,restoring=false,utilityRoute=null;
 const route=()=>({pathname:win?.location.pathname||'',search:win?.location.search||'',hash:win?.location.hash||''});
 const sameRoute=(a,b)=>a.pathname===b.pathname&&a.search===b.search&&a.hash===b.hash;
 function updatePlaybackRoute(){
  if(!win?.history.state?.utility){utilityRoute=null;return;}
  const current=route();utilityRoute={base:utilityRoute?.base||current,current};
 }
 function preserveUtilityPlayback(){
  const previous=utilityRoute;utilityRoute=null;
  // Dismissing a utility restores its page, not an older requested episode.
  // A Back to a different programme/page still follows normal browser history.
  if(!previous||win.history.state?.utility||!sameRoute(route(),previous.base)||typeof win.location.href!=='string')return;
  const url=new URL(win.location.href),latest=new URLSearchParams(previous.current.search);
  for(const key of ['channel','episode','playback']){if(latest.has(key))url.searchParams.set(key,latest.get(key));else url.searchParams.delete(key);}
  if(url.href!==win.location.href)win.history.replaceState(win.history.state,'',url);
 }
 function animateOpen(panel){
  if(reduce.matches||typeof panel.animate!=='function')return;
  const frames=isPage(panel)?[{opacity:.25},{opacity:1}]:[{opacity:.4,translate:'0 12px'},{opacity:1,translate:'0 0'}];
  const animation=panel.animate(frames,{duration:isPage(panel)?220:280,easing:'cubic-bezier(.22,1,.36,1)'});
  entries.set(panel,animation);animation.finished.catch(()=>{}).finally(()=>{if(entries.get(panel)===animation)entries.delete(panel);});
 }
 function sync(){
  const opened=[...root.querySelectorAll(visible)],page=opened.find(isPage),key=pageKey(page),destination=key==='home'?'home':key==='movies'||key==='library'||key==='library-watch'?'library':key==='channels'||key==='guide'?'guide':'watch';
  root.classList?.toggle('teletext-open',!!page);root.classList?.toggle('is-browsing',!!page&&key!=='library-watch');root.classList?.toggle('home-open',key==='home');root.classList?.toggle('library-watching',key==='library-watch');root.classList?.toggle('utility-open',opened.some(panel=>!isPage(panel)));root.classList?.toggle('movie-night-open',key==='movies');
  if(root.dataset)root.dataset.destination=destination;
  const scrim=root.querySelector?.('#drawer-scrim');if(scrim)scrim.hidden=true;
  const mini=root.querySelector?.('#mini-player');if(mini)mini.hidden=!page||key==='library-watch'||key==='home';
  root.querySelector?.('#menu-toggle')?.setAttribute('aria-expanded',String(!!page));
  for(const region of root.querySelectorAll('.club-layout, .watch-controls'))region.inert=!!page;
  for(const button of root.querySelectorAll('.app-tabs button')){
   const selected=destination==='home'?button.id==='home-tab':destination==='watch'?button.id==='watch-tab':destination==='guide'?button.id==='remote-guide':button.id==='browse-button';
   if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
  for(const button of root.querySelectorAll('[aria-haspopup=dialog]')){
   const selector=button.id==='settings-button'||button.id==='home-settings'?'.tv-settings':button.id==='info-button'?'.programme-info':button.id==='shuffle-button'?'#shuffle-dialog':null;
   if(selector)button.setAttribute('aria-expanded',String(!!root.querySelector(selector)?.open));
  }
  root.dispatchEvent?.(new Event('rewind:viewchange'));
 }
 function remember(key,state=null,replace=false){
  if(!win||restoring)return;
  const sameRoute=win.location.hash==='#'+key,sameState=!state||Object.entries(state).every(([name,value])=>win.history.state?.[name]===value);
  if(sameRoute&&sameState&&!win.history.state?.utility)return;
  win.history[replace?'replaceState':'pushState']?.({rewind:true,...state},'','#'+key);
 }
 function restoreFocus(panel){
  const invoker=invokers.get(panel);
  if(invoker?.isConnected&&invoker.getClientRects?.().length&&!invoker.closest?.('[hidden],dialog:not([open])')){invoker.focus({preventScroll:true});return;}
  const selector=utilityKey(panel)==='settings'?'#settings-button':utilityKey(panel)==='info'?'#info-button':utilityKey(panel)==='shuffle'?'#shuffle-button':'#watch-tab';
  root.querySelector?.(selector)?.focus({preventScroll:true});
 }
 function finishClose(panel,focus=false){
  if(!isOpen(panel))return;
  entries.get(panel)?.cancel();entries.delete(panel);panel.toggleAttribute?.('data-no-exit',switching||restoring);panel.inert=true;
  if(isPage(panel)){panel.hidden=true;panel.dispatchEvent(new Event('close'));}else panel.close();
  sync();if(focus)restoreFocus(panel);
 }
 function open(panel,{remember:record=true,state=null,replace=false}={}){
  if(!panel)return;
  const alreadyOpen=isOpen(panel);
  const consumedUtility=!!win?.history.state?.utility;
  if(!isOpen(panel))invokers.set(panel,doc?.activeElement);
  switching=true;
  for(const other of root.querySelectorAll(visible))if(other!==panel&&(isPage(panel)||!isPage(other)))finishClose(other);
  switching=false;
  if(!isOpen(panel)){panel.removeAttribute?.('data-no-exit');panel.inert=false;if(isPage(panel))panel.hidden=false;else panel.showModal();animateOpen(panel);}
  sync();
  if(isPage(panel)){
   if(record)remember(pageKey(panel),state,replace||consumedUtility);
   if(!alreadyOpen)(panel.querySelector('[data-page-primary]')||panel.querySelector('.page-back-tv'))?.focus({preventScroll:true});
  }else if(win&&!restoring&&record){
   const utility=utilityKey(panel);
   if(utility&&!consumedUtility)utilityRoute={base:route(),current:route()};
   if(utility&&win.history.state?.utility!==utility)win.history[consumedUtility?'replaceState':'pushState']({...win.history.state,rewind:true,utility},'',win.location.hash||'#watch');
  }
  updatePlaybackRoute();
 }
 function watch({remember:record=true}={}){
  switching=true;for(const panel of root.querySelectorAll(visible))finishClose(panel);switching=false;
  if(record)remember('watch',null,!!win?.history.state?.utility);
  sync();updatePlaybackRoute();if(record)root.querySelector?.('#watch-tab')?.focus({preventScroll:true});
 }
 function close(panel){
  if(isPage(panel)){if(pageKey(panel)==='library-watch'){root.dispatchEvent?.(new (win?.CustomEvent||CustomEvent)('rewind:library-back',{bubbles:true}));}else if(pageKey(panel)==='home'){root.dispatchEvent?.(new (win?.CustomEvent||CustomEvent)('rewind:return-picture',{bubbles:true}));}else watch();return;}
  const key=utilityKey(panel),unwind=key&&win?.history.state?.utility===key&&!restoring;
  finishClose(panel,true);if(unwind)win.history.back();
 }
 for(const panel of root.querySelectorAll('dialog, [data-tv-page]')){
  panel.addEventListener('cancel',event=>{event.preventDefault();close(panel);});panel.addEventListener('close',sync);
  if(!isPage(panel)){
   let outside=false;const beyond=event=>{const r=panel.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
   panel.addEventListener('pointerdown',event=>outside=event.target===panel&&beyond(event));
   panel.addEventListener('pointerup',event=>{if(outside&&event.target===panel&&beyond(event))close(panel);outside=false;});
  }else panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close(panel);}});
 }
 win?.addEventListener('popstate',()=>{
  preserveUtilityPlayback();
  restoring=true;
  const key=win.location.hash.slice(1),target=key==='home'?root.querySelector('.home-page'):key==='library-watch'?root.querySelector('.library-player-page'):key==='movies'?root.querySelector('.movie-night-page'):key==='library'?root.querySelector('.browse-overlay'):key==='guide'?root.querySelector('.schedule-overlay'):key==='channels'?root.querySelector('.guide'):null;
  if(target)open(target,{remember:false});else watch({remember:false});
  const utility=win.history.state?.utility;
  if(utility){const panel=root.querySelector(utility==='info'?'.programme-info':utility==='shuffle'?'#shuffle-dialog':'.tv-settings');if(panel)open(panel,{remember:false});}
  restoring=false;sync();updatePlaybackRoute();
 });
 win?.addEventListener('rewind:intro-finished',()=>{const panel=root.querySelector('dialog[open]');(panel?.querySelector('[autofocus]')||panel?.querySelector('.tv-dismiss'))?.focus({preventScroll:true});});
 win?.addEventListener('resize',sync);
 return {open,close,watch,isOpen,sync,updatePlaybackRoute,dismiss:panel=>finishClose(panel)};
}
