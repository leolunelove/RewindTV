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
 // Generated locally: a warm power surge, a soft relay tick and two rounded notes.
 // Never queue a suspended sound to play later over the programme.
 let soundContext,soundBus,soundStarted=false,soundClosed=false,soundEnd;
 let soundEnabled=true,soundVolume=.4;
 try{soundEnabled=JSON.parse(localStorage.getItem('rewind-effects')||'{}').sfx!==false;const saved=JSON.parse(localStorage.getItem('rewind-tv-v2')||'{}');if(Number.isFinite(saved.volume))soundVolume=Math.max(0,Math.min(1,saved.volume/100));}catch{}
 const soundButton=document.createElement('button');soundButton.textContent='♪ SOUND ON';soundButton.hidden=true;ident.querySelector('.ident-actions').prepend(soundButton);
 function closeSound(){if(soundClosed)return;soundClosed=true;clearTimeout(soundEnd);soundButton.hidden=true;window.removeEventListener('pointerdown',unlockSound);window.removeEventListener('keydown',unlockSound);if(soundContext){const ctx=soundContext;if(soundBus&&ctx.state==='running'){const t=ctx.currentTime;soundBus.gain.cancelScheduledValues(t);soundBus.gain.setTargetAtTime(0,t,.09);setTimeout(()=>ctx.close().catch(()=>{}),450);}else ctx.close().catch(()=>{});}}
 function playSound(){
  if(soundStarted||soundClosed||leaving||soundContext.state!=='running')return;
  soundStarted=true;soundButton.hidden=true;const ctx=soundContext,t=ctx.currentTime;
  soundBus=ctx.createGain();soundBus.gain.value=soundVolume*.38;soundBus.connect(ctx.destination);
  function tone(frequency,delay,duration,level,endFrequency=frequency){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(frequency,t+delay);o.frequency.exponentialRampToValueAtTime(endFrequency,t+delay+duration);g.gain.setValueAtTime(0,t+delay);g.gain.linearRampToValueAtTime(level,t+delay+.065);g.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);o.connect(g);g.connect(soundBus);o.start(t+delay);o.stop(t+delay+duration+.03);}
  tone(72,0,1.15,.24,54);tone(185,.02,.48,.045,370);tone(523.25,.18,1.35,.11);tone(783.99,.33,1.25,.065);
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.22),ctx.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.035));const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),ng=ctx.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=950;ng.gain.value=.035;noise.connect(filter);filter.connect(ng);ng.connect(soundBus);noise.start(t);
  soundEnd=setTimeout(closeSound,2100);
 }
 function unlockSound(e){if(e&&e.type==='keydown'&&(e.ctrlKey||e.metaKey||e.altKey))return;if(!soundContext||soundClosed||leaving)return;soundContext.resume().then(playSound).catch(()=>{});}
 soundButton.onclick=()=>{clearTimeout(timer);unlockSound();if(ready)timer=setTimeout(leave,1400);};
 if(soundEnabled&&soundVolume>0){try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){soundContext=new Audio();if(soundContext.state==='running')playSound();else{soundButton.hidden=false;window.addEventListener('pointerdown',unlockSound);window.addEventListener('keydown',unlockSound);soundContext.resume().then(playSound).catch(()=>{});}}}catch{soundButton.hidden=true;}}

 function leave(){
  if(!ready||leaving)return;leaving=true;closeSound();clearTimeout(timer);clearTimeout(slow);clearTimeout(long);
  try{sessionStorage.setItem('rewind-ident-seen','1');}catch{}
  html.classList.remove('booting');html.classList.add('ident-leaving');release();
  setTimeout(()=>{ident.remove();html.classList.remove('ident-leaving');},reduced?250:1100);
 }
 function onReady(){if(ready||leaving)return;ready=true;status.textContent='YOU’RE RIGHT ON TIME';skip.hidden=false;retry.hidden=true;timer=setTimeout(leave,Math.max(0,minimum-(performance.now()-start)));}
 function onError(){closeSound();clearTimeout(timer);clearTimeout(slow);clearTimeout(long);status.textContent='COULDN’T FIND THE SIGNAL';skip.hidden=true;retry.hidden=false;}
 skip.onclick=leave;retry.onclick=()=>location.reload();
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!leaving){e.preventDefault();if(ready)leave();}});
 slow=setTimeout(()=>{if(!ready)status.textContent='STILL TUNING. STAY WITH US.';},4500);
 long=setTimeout(()=>{if(!ready){status.textContent='THE SIGNAL IS TAKING A LITTLE LONGER';retry.hidden=false;}},14000);
 window.addEventListener('rewind:ready',onReady,{once:true});window.addEventListener('rewind:error',onError,{once:true});
 if(html.dataset.appReady==='true')onReady();else if(html.dataset.appReady==='error')onError();
})();
