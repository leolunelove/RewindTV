/* A station ident that yields to actual catalogue readiness. */
(()=>{
 const html=document.documentElement,ident=document.getElementById('station-ident'),content=[...document.querySelectorAll('[data-intro-content]')];
 if(!ident)return;
 const release=()=>content.forEach(el=>{el.inert=false;el.removeAttribute('aria-busy');});
 if(html.classList.contains('intro-embedded')){release();ident.remove();return;}
 content.forEach(el=>el.inert=true);
 const status=document.getElementById('ident-status'),skip=document.getElementById('ident-skip'),retry=document.getElementById('ident-retry');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
 let returning=false,ready=false,leaving=false,timer,slow,long;
 try{returning=sessionStorage.getItem('rewind-ident-seen')==='1';}catch{}
 const minimum=reduced?0:returning?200:1700;
 function leave(){
  if(!ready||leaving)return;leaving=true;clearTimeout(timer);clearTimeout(slow);clearTimeout(long);
  try{sessionStorage.setItem('rewind-ident-seen','1');}catch{}
  html.classList.remove('booting');html.classList.add('ident-leaving');release();
  setTimeout(()=>{ident.remove();html.classList.remove('ident-leaving');},reduced?250:1100);
 }
 function onReady(){if(ready||leaving)return;ready=true;status.textContent='YOU’RE RIGHT ON TIME';skip.hidden=false;retry.hidden=true;timer=setTimeout(leave,Math.max(0,minimum-(performance.now()-start)));}
 function onError(){clearTimeout(timer);clearTimeout(slow);clearTimeout(long);status.textContent='COULDN’T FIND THE SIGNAL';skip.hidden=true;retry.hidden=false;}
 skip.onclick=leave;retry.onclick=()=>location.reload();
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!leaving){e.preventDefault();if(ready)leave();}});
 slow=setTimeout(()=>{if(!ready)status.textContent='STILL TUNING. STAY WITH US.';},4500);
 long=setTimeout(()=>{if(!ready){status.textContent='THE SIGNAL IS TAKING A LITTLE LONGER';retry.hidden=false;}},14000);
 window.addEventListener('rewind:ready',onReady,{once:true});window.addEventListener('rewind:error',onError,{once:true});
 if(html.dataset.appReady==='true')onReady();else if(html.dataset.appReady==='error')onError();
})();
