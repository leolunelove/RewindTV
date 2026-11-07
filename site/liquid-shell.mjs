import {fitPicture} from './picture-frame.mjs?v=signal1';

export function focusPictureRect(viewport,insets,ratio){
 const width=Math.max(0,viewport.width-insets.left-insets.right),height=Math.max(0,viewport.height-insets.top-insets.bottom);
 const fit=fitPicture(width,height,ratio);
 return {left:viewport.left+insets.left+(width-fit.width)/2,top:viewport.top+insets.top+(height-fit.height)/2,width:fit.width,height:fit.height};
}

// Presentation only. Routing and geometry never issue a player load or seek.
export function createLiquidShell(root){
 const doc=root.ownerDocument,win=doc.defaultView;
 const $=selector=>root.querySelector(selector),screen=$('.screen'),watch=$('.screen-anchor'),mini=$('#mini-player'),miniAnchor=$('#mini-picture-anchor');
 let frame=0;
 const icon=paused=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paused?'<path d="m9 5 10 7-10 7z"/>':'<path d="M8 5v14M16 5v14"/>'}</svg>`;
 function putText(element,text){if(element.textContent!==text)element.textContent=text;}
 function update(){
  const browsing=root.classList.contains('is-browsing');mini.hidden=!browsing;
  $('#exit-focus').hidden=!root.classList.contains('focus-mode');
  putText($('#mini-title'),$('#now-title').textContent);
  $('#mini-return').setAttribute('aria-label','Back to watching '+$('#now-title').textContent+' on '+$('#watch-channel-name').textContent);
  putText($('#mini-detail'),[$('#on-air-mode').textContent,$('#watch-channel-name').textContent].filter(Boolean).join(' · '));
  const play=$('#tv-play'),paused=play.getAttribute('aria-label')==='Play television';
  const pause=$('#mini-play');pause.disabled=play.disabled;pause.setAttribute('aria-label',paused?'Play television':'Pause television');
  if(pause.dataset.paused!==String(paused)){pause.innerHTML=icon(paused);pause.dataset.paused=String(paused);}
  const mute=$('#startup-sound'),muted=mute.getAttribute('aria-pressed')==='true';
  $('#mini-mute').setAttribute('aria-label',muted?'Unmute television':'Mute television');$('#mini-mute').setAttribute('aria-pressed',String(muted));
  schedule();
 }
 function measure(){
  frame=0;
  const visual=win.visualViewport;
  const viewport={left:visual?.offsetLeft||0,top:visual?.offsetTop||0,width:visual?.width||win.innerWidth,height:visual?.height||win.innerHeight};
  const keyboardInset=Math.max(0,win.innerHeight-viewport.top-viewport.height);
  root.style.setProperty('--visual-bottom-inset',keyboardInset.toFixed(2)+'px');
  const browsing=root.classList.contains('is-browsing'),anchor=browsing?miniAnchor:watch;
  if(!anchor)return;
  const rect=anchor.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
  let target={left:rect.left,top:rect.top,width:rect.width,height:rect.height};
  if(!browsing&&root.classList.contains('focus-mode')){
   const landscape=win.innerWidth<960&&win.innerWidth>win.innerHeight&&win.innerHeight<560;
   if(!landscape){
    const desktop=win.innerWidth>=960,style=win.getComputedStyle(root);
    const safe=name=>parseFloat(style.getPropertyValue('--safe-'+name))||0;
    const header=$('.chrome').getBoundingClientRect(),nav=$('.app-tabs').getBoundingClientRect();
    const top=desktop?30:Math.max(safe('top')+8,header.bottom-viewport.top+8);
    const bottom=desktop?55:Math.max(safe('bottom')+12,viewport.top+viewport.height-nav.top+12);
    target=focusPictureRect(viewport,{left:desktop?header.right+24:Math.max(8,safe('left')),right:desktop?24:Math.max(8,safe('right')),top,bottom},Number(style.getPropertyValue('--picture-ratio'))||4/3);
   }
  }
  for(const [name,value]of Object.entries({'screen-left':target.left,'screen-top':target.top,'screen-width':target.width,'screen-height':target.height,'remote-top':target.top+target.height-24,'now-top':target.top+target.height+Math.max(42,($('.tv-dock').getBoundingClientRect().height||0)-8)})){
   const next=value.toFixed(2)+'px';if(root.style.getPropertyValue('--'+name)!==next)root.style.setProperty('--'+name,next);
  }
  screen.setAttribute('aria-label',browsing?'TV continues playing while you browse':'Television picture');
 }
 function schedule(){if(!frame)frame=win.requestAnimationFrame(measure);}
 $('#mini-return').onclick=()=>$('#watch-tab').click();
 $('#mini-play').onclick=()=>$('#tv-play').click();
 $('#mini-mute').onclick=()=>$('#startup-sound').click();
 function setFocus(selected){root.classList.toggle('focus-mode',selected);$('#focus-watch').setAttribute('aria-pressed',String(selected));$('#exit-focus').hidden=!selected;schedule();}
 $('#focus-watch').onclick=()=>setFocus(!root.classList.contains('focus-mode'));
 $('#exit-focus').onclick=()=>{setFocus(false);$('#focus-watch').focus({preventScroll:true});};
 root.addEventListener('rewind:viewchange',update);
 win.addEventListener('resize',schedule);doc.addEventListener('fullscreenchange',schedule);
 win.visualViewport?.addEventListener('resize',schedule);
 win.visualViewport?.addEventListener('scroll',schedule);
 const geometry=new win.ResizeObserver(schedule);geometry.observe(watch);geometry.observe(miniAnchor);geometry.observe($('.tv-dock'));
 const values=new win.MutationObserver(update);
 for(const node of [$('.club-now'),$('#tv-play'),$('#startup-sound')])values.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','aria-pressed','disabled']});
 const state=new win.MutationObserver(update);state.observe(root,{attributes:true,attributeFilter:['class']});
 update();return {update,measure};
}
