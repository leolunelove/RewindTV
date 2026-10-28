'use strict';
(async () => {
  const root=document.getElementById('rewind-tv'),$=s=>root.querySelector(s),Schedule=window.RewindSchedule;
  let catalogue,onDemandLibrary=null,channels,plan,active=null,channel=2,volume=40,power=false,player=null,ready=false,apiLoading=false,paused=false,watchTimer,apiTimer,resumeAfterGuide=false,osdTimer,tuningTimer;
  const [{findProgramme},{programmeInfo,programmeProgress,programmeTitle},{NeighbourCache}]=await Promise.all([import('./show-library.mjs'),import('./programme-info.mjs?v=2'),import('./neighbour-cache.mjs?v=1')]);let requestedQueue=[];let requestedIndex=0;
  const {createPanelMotion}=await import('./panel-motion.mjs?v=pages1');
  const panels=createPanelMotion(root);
  const movie=document.getElementById('archive-player');let movieLoading=false,audioContext;
  let playbackIntent=true,loadGeneration=0,recoveryChain=0,recoveryBackoffTimer=0;
  let startupMuted=true,startupPending=true,startupTimer;
  const startupSound=document.createElement('button');startupSound.id='startup-sound';startupSound.type='button';startupSound.textContent='♪ TAP FOR SOUND';startupSound.hidden=true;$('.screen').append(startupSound);
  function finishStartup(){if(!startupPending)return;startupPending=false;clearTimeout(startupTimer);document.documentElement.dataset.appReady='true';window.dispatchEvent(new Event('rewind:ready'));}
  function enableSound(){startupMuted=false;startupSound.hidden=true;applyAudio(true);render();}
  startupSound.onclick=enableSound;

  let settings={crt:true,curve:true,sfx:true,ambient:true,audio:true,preload:true};try{settings={...settings,...JSON.parse(localStorage.getItem('rewind-effects')||'{}')}}catch{}
  let showLevels={};try{showLevels=JSON.parse(localStorage.getItem('rewind-show-levels')||'{}')}catch{}
  let audioFade=0;
  function audioTarget(){
    const v=active?.video,key=v?.series||v?.id,trim=settings.audio?Math.max(-12,Math.min(6,Number(showLevels[key])||0)):0;
    return Math.max(0,Math.min(100,volume*Math.pow(10,(trim+(settings.audio&&v?.kind==='advert'?-5:0))/20)));
  }
  function applyAudio(soft=false){
    cancelAnimationFrame(audioFade);const target=audioTarget(),p=currentPlayer();if(!p||!power)return;
    if(volume===0||startupMuted){p.mute?.();p.setVolume?.(0);return;}
    p.unMute?.();
    if(!soft||!settings.audio){p.setVolume?.(target);return;}
    const id=active?.video.id,start=performance.now();
    function fade(now){if(id!==active?.video.id||!power)return;const t=Math.min(1,(now-start)/400);p.setVolume?.(target*t);if(t<1)audioFade=requestAnimationFrame(fade);}
    p.setVolume?.(0);audioFade=requestAnimationFrame(fade);
  }
  $('#programme-trim').oninput=e=>{
    const key=active?.video.series||active?.video.id;if(!key)return;
    showLevels[key]=Number(e.target.value);try{localStorage.setItem('rewind-show-levels',JSON.stringify(showLevels))}catch{}
    applyAudio();render();
  };
  function applySettings(){for(const key of ['crt','curve','sfx','ambient','audio','preload']){$('#setting-'+key).checked=settings[key];root.classList.toggle('no-'+key,!settings[key]);}try{localStorage.setItem('rewind-effects',JSON.stringify(settings))}catch{}}
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function applyRasterMotion(){root.classList.toggle('raster-paused',reducedMotion.matches||document.hidden);}
  reducedMotion.addEventListener('change',applyRasterMotion);applyRasterMotion();
  applySettings();
  const glowCanvas=$('#ambient-spill'),glowContext=glowCanvas.getContext('2d',{alpha:false});
  let glowTimer=0;
  function paintLiveGlow(){
    try{glowContext.drawImage(movie,0,0,48,27);root.classList.add('ambient-live');}catch{root.classList.remove('ambient-live');}
  }
  function updateGlow(){
    const available=power&&!paused&&settings.ambient&&!document.hidden&&active?.video.provider==='archive'&&!movie.hidden&&movie.readyState>=2;
    if(available&&!glowTimer){paintLiveGlow();glowTimer=setInterval(paintLiveGlow,250);}
    else if(!available){clearInterval(glowTimer);glowTimer=0;root.classList.remove('ambient-live');}
  }
  document.addEventListener('visibilitychange',()=>{root.classList.toggle('page-hidden',document.hidden);applyRasterMotion();updateGlow();if(document.hidden)clearNeighbours();else{render();scheduleNeighbours();}});
  async function tuningSound(){
    if(!settings.sfx||volume===0)return;
    try{
      audioContext??=new (window.AudioContext||window.webkitAudioContext)();
      await audioContext.resume();const ctx=audioContext;if(ctx.state!=='running')return;
      const at=ctx.currentTime,level=volume/100;
      const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.24),ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      noise.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(2600,at);filter.frequency.exponentialRampToValueAtTime(650,at+.23);filter.Q.value=.65;
      gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(level*.48,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+.24);
      noise.connect(filter).connect(gain).connect(ctx.destination);noise.start(at);noise.stop(at+.25);
      const click=ctx.createOscillator(),clickGain=ctx.createGain();click.type='triangle';click.frequency.setValueAtTime(170,at);click.frequency.exponentialRampToValueAtTime(45,at+.035);
      clickGain.gain.setValueAtTime(level*.36,at);clickGain.gain.exponentialRampToValueAtTime(.0001,at+.04);
      click.connect(clickGain).connect(ctx.destination);click.start(at);click.stop(at+.045);
    }catch{}
  }
  let movieSourceId='',movieSourceUrl='',moviePreparedKey='',movieTarget=0;
  function movieMatches(){return active?.video.provider==='archive'&&movieSourceId===active.video.id;}
  function prepareMovie(selection){
    if(!selection||!movie.hidden||!settings.preload||document.hidden||navigator.connection?.saveData)return;
    moviePreparedKey=selection.key;
    setMovieSource(selection.video,selection.offset,false);
  }
  function releasePreparedMovie(){
    if(!movie.hidden)return;
    moviePreparedKey='';movieSourceId='';movieSourceUrl='';movie.onloadedmetadata=null;
    movie.pause();movie.removeAttribute('src');movie.load();
  }
  function setMovieSource(video,offset,play){
    const same=movieSourceId===video.id&&movieSourceUrl===video.mediaUrl;
    movieTarget=Math.max(0,offset||0);movieLoading=true;
    function position(){
      if(movieSourceId!==video.id)return;
      if(Number.isFinite(movie.duration)&&Math.abs(movie.currentTime-movieTarget)>2)movie.currentTime=Math.min(movieTarget,Math.max(0,movie.duration-1));
      movieLoading=false;
    }
    movie.onloadedmetadata=position;
    if(!same){movieSourceId=video.id;movieSourceUrl=video.mediaUrl;movie.preload='auto';movie.src=video.mediaUrl;movie.load();}
    else if(movie.readyState>=1)position();
    // Start fetching/decoding immediately; metadata and playback proceed together.
    // Never play a prepared film while another channel is on air.
    if(play)archiveAdapter.playVideo();
    else{movie.muted=true;movie.volume=0;}
  }
  const archiveAdapter={getIframe:()=>movie,getCurrentTime:()=>movie.currentTime,getPlayerState:()=>movie.ended?0:movie.paused?2:movie.readyState<3||movie.seeking?3:1,getVideoData:()=>({video_id:movieSourceId}),setVolume:v=>movie.volume=v/100,mute:()=>movie.muted=true,unMute:()=>movie.muted=false,pauseVideo:()=>movie.pause(),stopVideo:()=>movie.pause(),playVideo:()=>{const expected=movieSourceId;movie.play().catch(error=>{if(error.name==='AbortError'||!movieMatches()||expected!==movieSourceId||!power)return;if(error.name==='NotAllowedError'){playbackIntent=false;paused=true;stopWatch();finishStartup();setStatus('Press PLAY on the remote to start the programme.',true);}else watchPlayback();});},loadVideoById:({startSeconds})=>setMovieSource(active.video,startSeconds,true),reloadVideo:selection=>{movieSourceUrl='';setMovieSource(selection.video,selection.offset,true)}};
  const currentPlayer=()=>active?.video.provider==='archive'?archiveAdapter:player;
  movie.addEventListener('playing',()=>{if(!movieMatches()||!power||!playbackIntent){movie.pause();return;}clearTimeout(apiTimer);recoveryChain=0;recoveryAttempts=0;updateGlow();if(movieMatches()){stopWatch();clearTimeout(tuningTimer);$('.screen').classList.remove('is-tuning');paused=false;applyAudio(true);finishStartup();setStatus((channels[channel].mode==='shuffle'?'SHUFFLE':'LIVE')+' · Streaming from the Internet Archive.')}});
  movie.addEventListener('pause',()=>{queueMicrotask(updateGlow);if(power&&!movieLoading&&active?.video.provider==='archive'&&!playbackIntent){paused=true;setStatus('PAUSED · Press PLAY to continue.')}});
  for(const event of ['waiting','stalled'])movie.addEventListener(event,()=>{if(power&&movieMatches()&&playbackIntent){setStatus('BUFFERING · Checking the TV signal…');watchPlayback();}});
  movie.addEventListener('ended',()=>{if(power&&active?.video.provider==='archive')advance(false)});
  movie.addEventListener('error',()=>{if(power&&movieMatches())skipUnavailable('Archive stream unavailable',false)});
  movie.addEventListener('canplay',()=>{if(movie.hidden){movie.preload='metadata';updateNeighbourStatus();}});
  let scheduleChannel=0;
  function sendScheduleState(i=scheduleChannel){
    if(!plan||!channels[i])return;const isWatching=i===channel&&power&&!!active,now=onNow(i),slot=isWatching?active.slot:now.slot,index=isWatching?active.index:now.index;
    const elapsed=isWatching?(currentPlayer()?.getCurrentTime?.()??active.offset??0):now.offset;
    $('#schedule-frame').contentWindow?.postMessage({type:'rewind-guide-state',key:channels[i].key,mode:channels[i].mode,isWatching,paused:isWatching&&paused,playbackMode:isWatching?active.mode:'live',elapsed,current:{video:isWatching?active.video:slot.video,start:slot.start,end:slot.end},next:isWatching&&active.mode==='ondemand'?requestedQueue.slice(requestedIndex+1,requestedIndex+20).map(video=>({video})):plan.schedules[i].slice(index+1,index+20)},location.origin);
  }
  function openSchedule(){scheduleChannel=channel;const frame=$('#schedule-frame');frame.src='schedule.html?overlay=1&v=textpages2&channel='+encodeURIComponent(channels[channel].key);panels.open($('.schedule-overlay'));revealControls();}
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('#schedule-frame').contentWindow)return;if(e.data?.type==='rewind-guide-close'){panels.close($('.schedule-overlay'));return;}if(e.data?.type==='rewind-guide-ready'||e.data?.type==='rewind-guide-select'){const i=channels?.findIndex(c=>c.key===e.data.key);if(i>=0){scheduleChannel=i;sendScheduleState(i);}}});
  function openBrowse(){const frame=$('#browse-frame');if(!frame.getAttribute('src'))frame.src='browse.html?overlay=1&v=textpages2';panels.open($('.browse-overlay'));revealControls();}
  root.addEventListener('click',event=>{const link=event.target.closest('[data-open-page]');if(!link)return;const actions={channels:openGuide,guide:openSchedule,shows:openBrowse};actions[link.dataset.openPage]?.();});
  $('#live-tab').onclick=()=>{root.querySelectorAll('dialog[open], [data-tv-page]:not([hidden])').forEach(d=>panels.close(d));revealControls();};
  $('.browse-overlay').addEventListener('close',()=>$('#browse-frame').contentWindow?.postMessage({type:'rewind-browse-reset'},location.origin));
  $('#browse-button').onclick=openBrowse;$('#close-browse').onclick=()=>{panels.close($('.browse-overlay'));revealControls();};
  function requestedActive(v){const start=Date.now();return {index:0,slot:{video:v,start,end:start+v.duration*1000},video:v,offset:0,mode:'ondemand'};}
  function playRequested(channelKey,videoId){const found=findProgramme(onDemandLibrary||catalogue,channelKey,videoId);if(!found)return false;tuningSound();stopWatch();currentPlayer()?.pauseVideo?.();channel=channels.findIndex(c=>c.key===channelKey);requestedQueue=found.queue;requestedIndex=requestedQueue.findIndex(v=>v.id===videoId);active=requestedActive(found.video);power=true;paused=false;persist();if(panels.isOpen($('.browse-overlay')))panels.close($('.browse-overlay'));setStatus('ON DEMAND · '+found.video.title);ensurePlayer();return true;}
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('#browse-frame').contentWindow)return;if(e.data?.type==='rewind-browse-play')playRequested(e.data.channelKey,e.data.videoId);if(e.data?.type==='rewind-browse-close'&&panels.isOpen($('.browse-overlay')))panels.close($('.browse-overlay'));});
  $('#schedule-button').onclick=openSchedule;$('#close-schedule').onclick=()=>{panels.close($('.schedule-overlay'));revealControls();};
  $('#settings-channels').onclick=()=>openGuide();
  $('#settings-button').onclick=()=>{panels.open($('.tv-settings'));revealControls()};$('#close-settings').onclick=()=>{panels.close($('.tv-settings'));revealControls()};
  for(const key of ['crt','curve','sfx','ambient','audio','preload'])$('#setting-'+key).onchange=e=>{settings[key]=e.target.checked;applySettings();applyRasterMotion();applyAudio();updateGlow();scheduleNeighbours()};
  const infoPanel=$('.programme-info');let infoKey='';
  function renderInfo(){
    if(!infoPanel.open||!active)return;
    const v=active.video,c=channels[channel],key=v.id+':'+c.key+':'+active.mode;
    if(infoKey!==key){
      infoKey=key;const info=programmeInfo(v,c,active.mode);
      for(const [id,value]of Object.entries({show:info.show,title:info.title,meta:info.meta,channel:info.channel,mode:info.mode,synopsis:info.synopsis,provenance:info.provenance}))$('#info-'+id).textContent=value;
      $('#info-title').hidden=info.title===info.show;$('#info-synopsis').hidden=!info.synopsis;
      $('#info-source').textContent=info.source+' ↗';$('#info-source').href=info.url;$('#info-source').hidden=!info.url;
      const next=active.mode==='ondemand'?requestedQueue[requestedIndex+1]:plan.schedules[channel][active.index+1]?.video;
      $('#info-next').hidden=!next;$('#info-next-title').textContent=next?programmeTitle(next):'';
    }
    const current=currentPlayer(),elapsed=current?.getVideoData?.()?.video_id===v.id?current.getCurrentTime?.():active.offset;
    const p=programmeProgress(elapsed,Math.max(1,v.duration));$('#info-progress').value=p.value;$('#info-elapsed').textContent=p.label;$('#info-remaining').textContent=p.remaining;
  }
  function openInfo(){if(!power||!active)return;infoKey='';panels.open(infoPanel);root.classList.add('info-open');renderInfo();revealControls();}
  $('#info-prev-channel').onclick=()=>tune(channel-1);$('#info-next-channel').onclick=()=>tune(channel+1);
  $('#info-button').onclick=openInfo;$('#close-info').onclick=()=>panels.close(infoPanel);
  $('#info-schedule').onclick=()=>{infoPanel.close();openSchedule();};infoPanel.addEventListener('close',()=>{root.classList.remove('info-open');revealControls();});
  let chromeTimer;
  function revealControls(){root.classList.remove('controls-hidden');clearTimeout(chromeTimer);chromeTimer=setTimeout(hideControls,3200);}
  function hideControls(){if(!power||paused||currentPlayer()?.getPlayerState?.()!==1||!$('#retry-video').hidden||!$('#unavailable').hidden||infoPanel.open||$('.tv-settings').open||panels.isOpen($('.guide'))||panels.isOpen($('.schedule-overlay'))||panels.isOpen($('.browse-overlay'))||root.querySelector('button:focus-visible,a:focus-visible,input:focus,select:focus')){chromeTimer=setTimeout(hideControls,1000);return;}root.classList.add('controls-hidden');}
  root.addEventListener('click',e=>{if(e.detail>0&&e.target.closest('button'))e.target.closest('button').blur();});
  root.addEventListener('pointermove',revealControls);root.addEventListener('pointerdown',revealControls);root.addEventListener('focusin',revealControls);root.addEventListener('focusout',revealControls);document.addEventListener('keydown',revealControls);
  let status='LOADING THE WEEK’S LINEUP…';const failed=new Set();try{for(const [id,at] of Object.entries(JSON.parse(localStorage.getItem('rewind-unavailable')||'{}')))if(Date.now()-at<7*86400000)failed.add(id)}catch{}
  function rememberFailure(id){failed.add(id);try{const records=JSON.parse(localStorage.getItem('rewind-unavailable')||'{}');records[id]=Date.now();localStorage.setItem('rewind-unavailable',JSON.stringify(records))}catch{}}
  function globallyRestricted(v){
    const restriction=v.regionRestriction||v.contentDetails?.regionRestriction;
    return v.embedStatus==='restricted'||v.embeddable===false||v.status?.embeddable===false||
      !!(restriction&&(Object.hasOwn(restriction,'allowed')||(restriction.blocked||[]).length));
  }
  function skipUnavailable(reason,persistFailure=true){
    if(!power||!active)return;
    stopWatch();loadGeneration++;if(persistFailure)rememberFailure(active.video.id);else failed.add(active.video.id);root.classList.remove('ambient-live');
    if(++recoveryChain>6){
      paused=false;currentPlayer()?.stopVideo?.();setStatus('SIGNAL RESTING · Checking again shortly…');
      clearTimeout(recoveryBackoffTimer);const generation=loadGeneration;recoveryBackoffTimer=setTimeout(()=>{if(power&&playbackIntent&&loadGeneration===generation){recoveryChain=0;tune(channel+1);}},30000);return;
    }
    if(active.mode==='ondemand'){
      const next=requestedQueue.findIndex((v,i)=>i>requestedIndex&&!failed.has(v.id)&&!globallyRestricted(v));
      if(next>=0){requestedIndex=next;active=requestedActive(requestedQueue[next]);setStatus(reason+' · Trying the next episode of this show.');ensurePlayer();return;}
      requestedQueue=[];requestedIndex=0;
    }
    const candidates=channels[channel].videos.filter(v=>!failed.has(v.id)&&!globallyRestricted(v));
    if(!candidates.length){setStatus('NO SIGNAL · Moving to the next channel.');const generation=loadGeneration;clearTimeout(recoveryBackoffTimer);recoveryBackoffTimer=setTimeout(()=>{if(power&&playbackIntent&&generation===loadGeneration)tune(channel+1);},600);return;}
    const rows=RewindShuffle.rows(candidates,recent,Date.now(),Math.random);
    const slot=rows[0];
    if(channels[channel].mode==='shuffle')plan.schedules[channel]=rows;
    active={index:channels[channel].mode==='shuffle'?0:onNow().index,slot,video:slot.video,offset:0,mode:channels[channel].mode==='shuffle'?'live':'fallback'};
    setStatus(reason+' · Trying another upload.');ensurePlayer();
  }
  const timeFormat=new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,hour:'2-digit',minute:'2-digit',hour12:false}),time=ms=>timeFormat.format(ms);
  const shortTitle=v=>v.title.replace('Mighty Morphin Power Rangers — ','').replace('Sesame Street — ','').replace(' — Full Episode','');
  let recent={};try{recent=JSON.parse(localStorage.getItem('rewind-seen')||'{}')}catch{}let playingId='',playedSeconds=0;
  function remember(id){recent[id]=Date.now();recent=Object.fromEntries(Object.entries(recent).sort((a,b)=>b[1]-a[1]).slice(0,5000));try{localStorage.setItem('rewind-seen',JSON.stringify(recent))}catch{}}
  const shuffleLastAd={};
  function freshRows(i,at=Date.now()){const all=channels[i].videos,available=all.filter(v=>!failed.has(v.id)&&!globallyRestricted(v));return RewindShuffle.rows(available.length?available:all,recent,at,Math.random,{ads:channels[i].adverts===false?[]:(catalogue.adverts||[]).filter(v=>!failed.has(v.id)),lastAd:shuffleLastAd[channels[i].key]})}
  function onNow(i=channel){if(channels[i].mode==='shuffle'){let rows=plan.schedules[i];if(!rows.length||rows.at(-1).end<=Date.now())plan.schedules[i]=rows=freshRows(i);if(!rows.length)throw Error('No playable episodes');}return Schedule.current(plan,i);}

  const video=()=>active?.video||onNow().slot.video;
  function persist(){try{localStorage.setItem('rewind-tv-v2',JSON.stringify({key:channels[channel].key,volume}));}catch{}}
  function weekPlan(){if(!plan||Schedule.weekAt().key!==plan.week.key){if(plan){location.reload();return false;}plan=Schedule.build(catalogue);return true;}return false;}
  function render(){
    if(!plan)return;updateGlow();if(document.hidden)return;
    renderInfo();
    const v=video(),live=onNow(),up=active?.mode==='ondemand'?(requestedQueue[requestedIndex+1]?{video:requestedQueue[requestedIndex+1]}:null):active?plan.schedules[channel][active.index+1]:live.next;
    const bug=$('#channel-logo');if(bug.dataset.key!==channels[channel].key){bug.src=channels[channel].logo||('logos/'+channels[channel].key+'.svg');bug.alt=channels[channel].name;bug.dataset.key=channels[channel].key;}bug.hidden=!power;
    $('#remote-no').textContent=String(channel+1).padStart(2,'0');
    $('#now-title').textContent=`${String(channel+1).padStart(2,'0')} / ${channels[channel].name}`;
    $('#now-description').textContent=(v.kind==='advert'?'AD BREAK · ':'')+programmeTitle(v)+(v.yearLabel||v.year?' · '+(v.yearLabel||v.year):'');
    $('#now-description').title=$('#now-description').textContent;
    if($('#playback-status').textContent!==status)$('#playback-status').textContent=status;
    $('#tv-play').textContent=paused?'▶ PLAY':'Ⅱ PAUSE';$('#tv-play').setAttribute('aria-label',paused?'Play television':'Pause television');$('#tv-play').disabled=!power;
    $('#volume').textContent=volume===0||startupMuted?'MUTED':`VOL ${volume}`;startupSound.hidden=!power||!startupMuted||volume===0;
    const levelKey=v.series||v.id,level=Math.max(-12,Math.min(6,Number(showLevels[levelKey])||0));
    $('#programme-trim').value=String(level);$('#programme-trim').disabled=!power||v.kind==='advert';
    $('#trim-value').textContent=(level>0?'+':'')+level+' dB';$('#trim-programme').textContent=v.kind==='advert'?'Advert level is reduced automatically.':(power?'Saved for '+(v.series||v.title):'Start a programme to adjust it.');
    $('#source-link').textContent=v.sourceProvenance?'FAN/ARCHIVE ↗':v.provider==='archive'?'ARCHIVE ↗':'YOUTUBE ↗';$('#source-link').href=v.watchUrl;$('#unavailable-link').href=v.watchUrl;$('#unavailable-link').textContent=v.provider==='archive'?'WATCH ON ARCHIVE ↗':'WATCH ON YOUTUBE ↗';$('#unavailable').hidden=!(power&&(v.embedStatus==='restricted'||failed.has(v.id))); 
    root.classList.toggle('tv-on',power);if(!power||paused)root.classList.remove('controls-hidden');
    $('.off').hidden=power;$('.led').classList.toggle('off-led',!power);
    $('.remote-power').setAttribute('aria-pressed',String(power));
    $('.guide-toggle').setAttribute('aria-expanded',String(panels.isOpen($('.guide'))));
    $('#join-live').hidden=!power||(!paused&&active?.mode==='live');
    $('#restart-show').disabled=!power;$('#info-button').disabled=!power||!active;
    $('#up-next').textContent=up?`NEXT ${active?.mode==='live'&&channels[channel].mode!=='shuffle'?time(up.start):''} · ${shortTitle(up.video)}`:active?.mode==='ondemand'?'END OF THIS COLLECTION':'NEW WEEKLY LINEUP';
    $('#up-next').title=up?up.video.title:'';
    $('#on-air-mode').textContent=!power?'STANDBY':v.embedStatus==='restricted'||failed.has(v.id)?'NO SIGNAL':paused?'PAUSED':active?.mode==='live'?(channels[channel].mode==='shuffle'?'SHUFFLE':'● LIVE'):active?.mode==='fallback'?'ALT SIGNAL':active?.mode==='ondemand'?'ON DEMAND':'REPLAY';
    if(!infoPanel.open&&(!root.classList.contains('controls-hidden')||panels.isOpen($('.guide'))))root.querySelectorAll('[data-channel]').forEach(b=>{
      const i=Number(b.dataset.channel),now=onNow(i),next=now.next,key=now.slot.video.id+':'+(i===channel);if(b.dataset.renderKey===key)return;b.dataset.renderKey=key;
      b.setAttribute('aria-pressed',String(i===channel));
      b.querySelector('small').textContent=(channels[i].mode==='shuffle'?'SHUFFLE · ':'')+shortTitle(now.slot.video);
      b.title=`${channels[i].name}${channels[i].shows?' · '+channels[i].shows.join(', '):''}${channels[i].mode==='shuffle'?' · SHUFFLE':''}\nNOW ${channels[i].mode==='shuffle'?'':time(now.slot.start)} — ${now.slot.video.title} (${now.slot.video.yearLabel||now.slot.video.year})${next?'\nNEXT '+(channels[i].mode==='shuffle'?'':time(next.start))+' — '+next.video.title:''}`;
      b.setAttribute('aria-label',`${String(i+1).padStart(2,'0')} ${channels[i].name}. Now: ${now.slot.video.title}. ${next?'Next: '+next.video.title:''}`);
    });
  }
  function setStatus(s,retry=false){status=s;root.classList.toggle('needs-attention',retry);$('#retry-video').hidden=!retry;render();}
  function stopWatch(){clearTimeout(watchTimer);watchTimer=0;}
  function selectLive(){
    requestedQueue=[];requestedIndex=0;weekPlan();const now=onNow();let index=now.index;
    const rows=plan.schedules[channel];
    while(failed.has(rows[index]?.video.id)&&index<rows.length-1)index++;
    let slot=rows[index];if(channels[channel].mode==='shuffle'&&recent[slot.video.id]&&recent[slot.video.id]<slot.start){const replacement=freshRows(channel);plan.schedules[channel]=replacement;index=0;slot=replacement[0];}active={index,slot,video:slot.video,offset:index===now.index&&slot===now.slot?now.offset:0,mode:'live'};paused=false;
  }
  function showTuning(){
    clearTimeout(osdTimer);clearTimeout(tuningTimer);
    const screen=$('.screen');screen.classList.remove('is-tuning');
    void screen.offsetWidth;screen.classList.add('is-tuning','show-osd');
    $('#osd-number').textContent=String(channel+1).padStart(2,'0');
    $('#osd-name').textContent=channels[channel].name.toUpperCase();
    $('#channel-osd small').textContent=active?.video.embedStatus==='restricted'?'EXTERNAL SIGNAL':'STEREO / LIVE';
    tuningTimer=setTimeout(()=>screen.classList.remove('is-tuning'),320);
    osdTimer=setTimeout(()=>screen.classList.remove('show-osd'),2200);
  }
  let playerChannelKey=null,neighbourTimer=0,neighbourRefresh=Date.now(),warmSerial=0;
  const neighbours=new NeighbourCache(disposeNeighbour);
  navigator.connection?.addEventListener?.('change',scheduleNeighbours);
  function updateNeighbourStatus(){
    const label=$('#preload-status');if(!label)return;
    if(!settings.preload){label.textContent='Off · one player at a time.';return;}
    if(navigator.connection?.saveData){label.textContent='Paused while Data Saver is active.';return;}
    if(active?.video.provider==='archive'){label.textContent='Film buffer retained for quick return switching.';return;}
    const prepared=[...neighbours.slots.keys()].filter(key=>neighbours.slots.get(key).ready);if(moviePreparedKey&&movie.readyState>=3)prepared.push(moviePreparedKey);
    label.textContent=document.hidden?'Paused while this tab is hidden.':prepared.length?'Ready: '+prepared.map(key=>channels.find(c=>c.key===key)?.name||key).join(' · '):'Preparing the two neighbouring channels…';
  }
  function disposeNeighbour(slot){
    slot.cancelled=true;clearTimeout(slot.timer);
    try{slot.player?.destroy();}catch{}
    slot.frame?.remove();
  }
  function clearNeighbours(){clearTimeout(neighbourTimer);neighbourTimer=0;neighbours.clear();if(!settings.preload||document.hidden||navigator.connection?.saveData||!power)releasePreparedMovie();updateNeighbourStatus();}
  function createNeighbour(selection){
    const frame=document.createElement('iframe'),slot={frame,player:null,videoId:selection.video.id,ready:false,cancelled:false};
    frame.id='neighbour-player-'+(++warmSerial);frame.title='Prepared channel: '+selection.name;frame.className='prepared-player';frame.tabIndex=-1;
    frame.width='640';frame.height='360';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('loading','eager');frame.setAttribute('aria-hidden','true');
    frame.addEventListener('load',()=>{
      if(slot.cancelled)return;
      slot.player=new YT.Player(frame,{events:{
        onReady:e=>{if(slot.cancelled)return;e.target.mute();e.target.setVolume(0);e.target.cueVideoById({videoId:slot.videoId,startSeconds:selection.offset});slot.ready=true;clearTimeout(slot.timer);updateNeighbourStatus();},
        onStateChange:e=>{
          if(slot.cancelled)return;
          if(e.target===player){onPlayerStateChange(e);return;}
          if(e.data===5){slot.ready=true;clearTimeout(slot.timer);updateNeighbourStatus();}
          // Inactive neighbours are cued or paused, never played off-screen.
          if(e.data===1){e.target.mute();e.target.pauseVideo();}
        },
        onAutoplayBlocked:onPlayerAutoplayBlocked,
        onError:e=>{if(slot.cancelled)return;if(e.target===player){videoError(e);return;}if(neighbours.slots.get(selection.key)===slot){if([100,101,150].includes(e.data))rememberFailure(slot.videoId);neighbours.remove(selection.key);updateNeighbourStatus();}}
      }});
    },{once:true});
    frame.src='https://www.youtube.com/embed/'+encodeURIComponent(slot.videoId)+'?'+new URLSearchParams({enablejsapi:'1',playsinline:'1',controls:'0',fs:'0',rel:'0',autoplay:'0',mute:'1',origin:location.origin});
    $('.screen').append(frame);
    slot.timer=setTimeout(()=>{if(neighbours.slots.get(selection.key)===slot&&!slot.ready){neighbours.remove(selection.key);updateNeighbourStatus();}},15000);
    return slot;
  }
  function prepareNeighbours(){
    neighbourTimer=0;neighbourRefresh=Date.now();
    if(!settings.preload||document.hidden||navigator.connection?.saveData||!power||active?.video.provider==='archive'){clearNeighbours();return;}
    if(!ready||!window.YT?.Player||currentPlayer()?.getPlayerState?.()!==1)return;
    const wanted=[(channel-1+channels.length)%channels.length,(channel+1)%channels.length].map(i=>{
      const now=onNow(i);return {key:channels[i].key,name:channels[i].name,video:now.slot.video,offset:now.offset};
    }).filter(s=>!failed.has(s.video.id)&&!globallyRestricted(s.video));
    const film=wanted.find(s=>s.video.provider==='archive');if(film)prepareMovie(film);
    else if(!movieSourceId){const i=channels.findIndex(c=>c.videos.some(v=>v.provider==='archive'));if(i>=0){const now=onNow(i);if(now.slot.video.provider==='archive')prepareMovie({key:channels[i].key,video:now.slot.video,offset:now.offset});}}
    neighbours.reconcile(wanted.filter(s=>s.video.provider!=='archive'),createNeighbour);updateNeighbourStatus();
  }
  function scheduleNeighbours(){
    clearTimeout(neighbourTimer);
    if(!settings.preload||document.hidden||navigator.connection?.saveData||!power||active?.video.provider==='archive'){clearNeighbours();return;}
    updateNeighbourStatus();neighbourTimer=setTimeout(prepareNeighbours,800);
  }
  function activateNeighbour(){
    if(!settings.preload||!player||!ready||pendingFrame||active.video.provider==='archive')return false;
    const key=channels[channel].key;if(key===playerChannelKey)return false;
    const prepared=neighbours.take(key);if(!prepared)return false;
    const oldFrame=player.getIframe(),previousKey=playerChannelKey;
    player.pauseVideo();player.mute();oldFrame.hidden=false;oldFrame.classList.add('prepared-player');oldFrame.id='neighbour-player-'+(++warmSerial);oldFrame.setAttribute('aria-hidden','true');
    if(previousKey)neighbours.park(previousKey,{player,frame:oldFrame,videoId:player.getVideoData?.()?.video_id,ready:true,cancelled:false});
    else{try{player.destroy();}catch{}}
    player=prepared.player;ready=true;playerChannelKey=key;clearTimeout(apiTimer);
    prepared.frame.id='video-player';prepared.frame.classList.remove('prepared-player');prepared.frame.removeAttribute('tabindex');prepared.frame.removeAttribute('aria-hidden');prepared.frame.hidden=false;
    updateNeighbourStatus();return true;
  }

  let channelLoadTimer=0;
  function cancelChannelLoad(){clearTimeout(channelLoadTimer);channelLoadTimer=0;}
  function playSelection(p,selection,forceReload=false){
    if(forceReload&&typeof p.reloadVideo==='function'){p.reloadVideo(selection);return;}
    // Preserve an already buffered episode when joining live or restarting it.
    if(!forceReload&&typeof p.seekTo==='function'&&p.getVideoData?.()?.video_id===selection.video.id){
      if(Math.abs((p.getCurrentTime?.()||0)-selection.offset)>2)p.seekTo(selection.offset,true);
      p.playVideo();
    }else p.loadVideoById({videoId:selection.video.id,startSeconds:selection.offset});
  }
  function loadActive(forceReload=false){
    cancelChannelLoad();loadGeneration++;
    if(!power||!active||(!ready&&active.video.provider!=='archive'))return;
    if(active.video.provider==='archive')clearNeighbours();
    stopWatch();playbackIntent=true;paused=false;playingId=active.video.id;playedSeconds=0;showTuning();revealControls();movie.hidden=active.video.provider!=='archive';if(player)player.getIframe().hidden=active.video.provider==='archive';
    if(failed.has(active.video.id)||globallyRestricted(active.video)){skipUnavailable('Upload unavailable');return;}
    if(active.video.provider!=='archive')playerChannelKey=channels[channel].key;
    setStatus(`${active.video.kind==='advert'?'AD BREAK':'TUNING IN'} · ${channels[channel].name}`);
    if(settings.audio){currentPlayer().setVolume?.(0);if(volume===0||startupMuted)currentPlayer().mute?.();}else applyAudio();
    if(startupMuted)currentPlayer().mute?.();
    currentPlayer().getIframe().hidden=false;
    playSelection(currentPlayer(),active,forceReload);
    watchPlayback();
  }
  let recoveryId='',recoveryAttempts=0,watchGeneration=-1;
  function watchPlayback(){
    if(!active||!playbackIntent)return;if(watchTimer&&watchGeneration===loadGeneration)return;clearTimeout(watchTimer);watchGeneration=loadGeneration;const expected=active.video.id,generation=loadGeneration;
    if(recoveryId!==expected){recoveryId=expected;recoveryAttempts=0;}
    watchTimer=setTimeout(()=>{
      watchTimer=0;
      if(!power||paused||!playbackIntent||generation!==loadGeneration||active?.video.id!==expected||(currentPlayer()?.getPlayerState?.()===1&&currentPlayer()?.getVideoData?.()?.video_id===expected))return;
      if(document.hidden){watchPlayback();return;}
      if(recoveryAttempts++<1){setStatus('CONNECTING · Retrying the TV signal…');playSelection(currentPlayer(),active,true);watchPlayback();}
      else skipUnavailable('Signal did not start',false);
    },active.video.provider==='archive'?16000:8000);
  }

  function advance(manual=false){
    if(!active){selectLive();}
    if(active.mode==='ondemand'){
      remember(active.video.id);requestedIndex++;if(requestedIndex<requestedQueue.length){active=requestedActive(requestedQueue[requestedIndex]);loadActive();}else{paused=true;currentPlayer()?.pauseVideo?.();setStatus('End of this collection. Browse another show or JOIN LIVE.');}return;
    }
    if(active.mode==='fallback'&&!manual){remember(active.video.id);selectLive();ensurePlayer();return;}
    if(channels[channel].mode==='shuffle'){
      if(active.video.kind!=='advert')remember(active.video.id);
      const nextIndex=active.index+1,next=plan.schedules[channel][nextIndex];
      if(!manual&&active.video.kind==='full episode'&&next?.advert&&!failed.has(next.video.id)){
        const shift=Date.now()-next.start;for(let n=nextIndex;n<plan.schedules[channel].length;n++){const row=plan.schedules[channel][n];plan.schedules[channel][n]={...row,start:row.start+shift,end:row.end+shift};}const slot=plan.schedules[channel][nextIndex];shuffleLastAd[channels[channel].key]=next.video.id;active={index:nextIndex,slot,video:slot.video,offset:0,mode:'live'};
      }else{plan.schedules[channel]=freshRows(channel);const slot=plan.schedules[channel][0];active={index:0,slot,video:slot.video,offset:0,mode:'live'};}
      if(power)loadActive();else render();return;
    }
    if(!manual&&active.mode==='live'){
      const rows=plan.schedules[channel],live=onNow();
      const index=Math.min(rows.length-1,Math.max(live.index,active.index+1));
      const slot=rows[index];active={index,slot,video:slot.video,offset:Math.max(0,(Date.now()-slot.start)/1000),mode:'live'};
      loadActive();return;
    }
    const rows=plan.schedules[channel];let index=(active.index+1)%rows.length;
    for(let n=0;n<rows.length&&failed.has(rows[index].video.id);n++)index=(index+1)%rows.length;
    active={index,slot:rows[index],video:rows[index].video,offset:0,mode:manual?'replay':active.mode};paused=false;
    if(power)loadActive();else render();
  }
  function videoError(e){
    if(e.target&&e.target!==player)return;
    console.warn('Rewind playback error',e.data,active?.video.id);
    if(!power||!active||active.video.provider==='archive'||channelLoadTimer)return;
    const reported=e.target.getVideoData?.()?.video_id;
    if(reported&&reported!==active.video.id)return;stopWatch();
    if(e.data===153){skipUnavailable('This source cannot identify the player',false);return;}
    if(e.data===2||e.data===100||e.data===101||e.data===150){
      skipUnavailable('Upload unavailable in this browser or region');
    }else{setStatus('CONNECTING · Recovering the TV signal…');watchPlayback();}
  }
  function onPlayerStateChange(e){
        if(e.target!==player){if(e.data===1){e.target.mute?.();e.target.pauseVideo?.();}return;}
        if(!power||!active||active.video.provider==='archive'||channelLoadTimer||e.target.getVideoData?.()?.video_id!==active.video.id)return;
        if(e.data===1){if(!playbackIntent){e.target.pauseVideo?.();return;}recoveryChain=0;recoveryAttempts=0;clearTimeout(tuningTimer);$('.screen').classList.remove('is-tuning');ready=true;clearTimeout(apiTimer);stopWatch();paused=false;applyAudio(true);finishStartup();scheduleNeighbours();setStatus(active.mode==='live'?(channels[channel].mode==='shuffle'?'SHUFFLE · Continuous playback, no fixed timetable.':'LIVE · Channels keep broadcasting while you’re away.'):active.mode==='fallback'?'ALT SIGNAL · This upload replaces an unavailable broadcast.':active.mode==='ondemand'?'ON DEMAND · This show continues in episode order. JOIN LIVE to return to the channel.':'REPLAY · Join live whenever you like.');}
        else if(e.data===0){stopWatch();advance(false);}
        else if(e.data===2){if(playbackIntent){watchPlayback();return;}stopWatch();paused=true;setStatus('PAUSED · Play to continue, or JOIN LIVE.');}
        else if(e.data===3){setStatus('BUFFERING · Checking the TV signal…');watchPlayback();}

  }
  function onPlayerAutoplayBlocked(e){if((e.target&&e.target!==player)||active?.video.provider==='archive'||channelLoadTimer)return;ready=true;clearTimeout(apiTimer);stopWatch();if(power){finishStartup();playbackIntent=false;paused=true;setStatus('Your browser paused playback. Press PLAY to start.');}
  }
  let initRetries=0,pendingFrame=null;
  function resetPlayerFrame(){
    try{player?.destroy();}catch{}player=null;ready=false;if(pendingFrame){pendingFrame.remove();pendingFrame=null;}
    let placeholder=$('#video-player');if(!placeholder){placeholder=document.createElement('div');placeholder.id='video-player';$('.screen').prepend(placeholder);}
  }
  function watchPlayerInit(){
    clearTimeout(apiTimer);apiTimer=setTimeout(()=>{
      if(ready||!power||active?.video.provider==='archive')return;
      if(initRetries<1&&window.YT?.Player){initRetries++;resetPlayerFrame();setStatus('CONNECTING · Reconnecting the TV signal…');initPlayer();}
      else{resetPlayerFrame();initRetries=0;skipUnavailable('The player did not respond',false);}
    },15000);
  }
  function initPlayer(){
    if(player||pendingFrame)return;
    // Let the IFrame API own navigation and its readiness handshake. Waiting
    // for the embed's load event can strand startup before API listeners exist.
    const firstId=video().id;playerChannelKey=channels[channel].key;
    const placeholder=document.createElement('div');placeholder.id='video-player';
    $('#video-player').replaceWith(placeholder);
    player=new YT.Player('video-player',{videoId:firstId,playerVars:{enablejsapi:1,playsinline:1,controls:0,fs:0,rel:0,autoplay:1,mute:1,start:Math.floor(active?.offset||0),origin:location.origin},events:{
      onReady:e=>{if(e.target!==player)return;ready=true;clearTimeout(apiTimer);const f=player.getIframe();f.title='Rewind TV video player';f.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');if(power){if(!active)selectLive();
        if(channelLoadTimer)return;
        if(active.video.id!==firstId)loadActive();
        else{playingId=firstId;paused=false;player.mute();player.playVideo();if(player.getPlayerState?.()===1)onPlayerStateChange({target:player,data:1});else watchPlayback();}
      }},
      onStateChange:onPlayerStateChange,onAutoplayBlocked:onPlayerAutoplayBlocked,onError:videoError
    }});watchPlayerInit();
  }

  function ensurePlayer(forceReload=false){
    cancelChannelLoad();
    if(active?.video.provider==='archive'){clearNeighbours();loadActive();return;}
    movie.hidden=true;movieLoading=false;
    if(ready){if(!forceReload)activateNeighbour();loadActive(forceReload);return;}if(window.YT?.Player){initPlayer();return;}if(apiLoading)return;
    apiLoading=true;window.onYouTubeIframeAPIReady=initPlayer;
    const existing=document.getElementById('youtube-api');const script=existing||document.createElement('script');if(!existing){script.src='https://www.youtube.com/iframe_api';script.id='youtube-api';}script.onerror=()=>{apiLoading=false;script.remove();clearTimeout(apiTimer);setStatus('The video player could not load. Check your connection and retry.',true);};if(!script.isConnected)document.head.append(script);
    apiTimer=setTimeout(()=>{if(!ready&&active?.video.provider!=='archive')setStatus('YouTube is taking a while to load. Check your connection or retry.',true);},18000);
  }
  function tune(i){
    cancelChannelLoad();loadGeneration++;clearTimeout(recoveryBackoffTimer);playbackIntent=true;paused=false;tuningSound();stopWatch();currentPlayer()?.pauseVideo?.();
    channel=(i+channels.length)%channels.length;power=true;selectLive();persist();
    setStatus('TUNING IN…');showTuning();revealControls();
    // Keep the remote immediate, but only request the station you settle on.
    channelLoadTimer=setTimeout(()=>{
      channelLoadTimer=0;
      ensurePlayer();
    },settings.preload&&neighbours.slots.get(channels[channel].key)?.ready?40:220);
  }
  function joinLive(){playbackIntent=true;paused=false;clearTimeout(recoveryBackoffTimer);tuningSound();selectLive();power=true;ensurePlayer();}
  function togglePower(){loadGeneration++;clearTimeout(recoveryBackoffTimer);cancelChannelLoad();clearNeighbours();if(!power){joinLive();return;}power=false;playbackIntent=false;paused=false;stopWatch();if(currentPlayer()){currentPlayer().pauseVideo?.();currentPlayer().getIframe().hidden=true;}setStatus('TV OFF · The schedule keeps rolling.');}
  function changeVolume(delta){startupMuted=false;volume=Math.max(0,Math.min(100,volume+delta));if(currentPlayer()){applyAudio();}persist();render();}
  function closeGuide(resume=true){if(!resume)resumeAfterGuide=false;panels.close($('.guide'));root.classList.remove('guide-open');render();}
  function openGuide(){resumeAfterGuide=false;root.classList.add('guide-open');panels.open($('.guide'));render();}
  const {sectionChannels}=await import('./channel-sections.mjs?v=app2');
  function createChannelLists(){
    root.style.setProperty('--channel-count',channels.length);
    root.querySelectorAll('.direct-channels').forEach(list=>{
      list.replaceChildren();
      const jumps=$('.genre-jumps');jumps?.replaceChildren();
      sectionChannels(channels).forEach((section,sectionIndex)=>{
        const group=document.createElement('section');group.className='channel-section';
        const heading=document.createElement('h3');heading.id='genre-'+sectionIndex;heading.textContent=section.name;group.setAttribute('aria-labelledby',heading.id);
        if(jumps){const jump=document.createElement('button');jump.type='button';jump.textContent=section.name;jump.onclick=()=>heading.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});jumps.append(jump);}
        const note=document.createElement('p');note.className='section-note';note.textContent=section.note;
        group.append(heading,note);
        section.channels.forEach(({channel:c,index:i})=>{
          const b=document.createElement('button');b.type='button';b.dataset.channel=i;
          const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');
          const logo=document.createElement('img');logo.className='channel-mark';logo.src=c.logo||('logos/'+c.key+'.svg');logo.alt='';logo.loading='lazy';logo.width=48;logo.height=30;
          const name=document.createElement('strong');name.textContent=c.name;
          const programme=document.createElement('small');b.append(number,logo,name,programme);
          b.onclick=()=>{closeGuide(false);tune(i)};group.append(b);
        });list.append(group);
      });
    });
  }
  root.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
    const {loadLibrary}=await import('./library.mjs?v=light1');catalogue=await loadLibrary();window.RewindLibrary=()=>onDemandLibrary||catalogue;catalogue.channels=catalogue.channels.map(c=>({...c,videos:c.videos.filter(v=>v.enabled!==false)})).filter(c=>c.videos.length);channels=catalogue.channels;
    let saved={};try{saved=JSON.parse(localStorage.getItem('rewind-tv-v2')||'{}');}catch{}
    const selected=channels.findIndex(c=>c.key===saved.key);if(selected>=0)channel=selected;
    if(Number.isFinite(saved.volume))volume=Math.max(0,Math.min(100,saved.volume));
    plan=Schedule.build(catalogue);createChannelLists();document.documentElement.dataset.catalogueReady='true';
    root.querySelectorAll('button').forEach(b=>{b.disabled=false;b.type='button';});
    $('#guide-title').textContent='CHANNELS';$('#library-count').textContent=channels.length+' CHANNELS · ORIGINAL CHANNEL NUMBERS';
    $('.standby-code').textContent='P100 / REWIND TELEVISION';$('#start-tv small').textContent=`90s / 2000s / CLASSIC CINEMA. GOOD COMPANY.`;
    $('.source-note').textContent=`${new Set(channels.flatMap(c=>c.videos.map(v=>v.id))).size} UNIQUE VIDEOS · 90s / 2000s / CLASSICS\nREFRESHES TUESDAY 00:00`;
  }catch(error){$('#playback-status').textContent='The catalogue could not load. Refresh this page to retry.';console.error(error);document.documentElement.dataset.appReady='error';window.dispatchEvent(new Event('rewind:error'));return;}
  $('#tv-play').onclick=()=>{if(!currentPlayer()||!power)return;clearTimeout(recoveryBackoffTimer);playbackIntent=paused;paused=!playbackIntent;if(playbackIntent){currentPlayer().playVideo?.();watchPlayback();}else{stopWatch();currentPlayer().pauseVideo?.();setStatus('PAUSED · Press PLAY to continue.');}};
  $('.remote-power').onclick=togglePower;$('#start-tv').onclick=joinLive;
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const a=b.dataset.action;if(a==='next')tune(channel+1);else if(a==='prev')tune(channel-1);else changeVolume(a==='louder'?10:-10);});
  $('.guide-toggle').onclick=$('#remote-guide').onclick=openGuide;$('#close-guide').onclick=()=>closeGuide();
  $('.guide').addEventListener('close',()=>{root.classList.remove('guide-open');if(resumeAfterGuide&&currentPlayer()&&power){resumeAfterGuide=false;currentPlayer().playVideo?.();}render();});
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{setStatus('Use your browser’s fullscreen command to expand the TV.');}};
  document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
  $('#skip-video').onclick=()=>{if(!power)power=true;advance(true);if(!ready&&active.video.provider!=='archive')ensurePlayer();};
  $('#restart-show').onclick=()=>{if(active){active={...active,offset:0,mode:active.mode==='ondemand'?'ondemand':'replay'};loadActive();}};
  $('#join-live').onclick=joinLive;
  $('#retry-video').onclick=()=>{
    failed.clear();try{localStorage.removeItem('rewind-unavailable')}catch{}power=true;
    if(active?.mode==='ondemand')active={...active,offset:0};else selectLive();
    initRetries=0;if(!ready&&player)resetPlayerFrame();
    if(!ready&&!window.YT?.Player){apiLoading=false;document.getElementById('youtube-api')?.remove();}
    clearTimeout(apiTimer);apiTimer=setTimeout(()=>{if(!ready&&active?.video.provider!=='archive')setStatus('YouTube is taking a while to load. Check your connection or retry.',true);},18000);
    setStatus('RETRYING · '+active.video.title);ensurePlayer(true);
  };
  let numberEntry='',numberTimer,lastAudibleVolume=volume||40;
  function clearNumberEntry(){clearTimeout(numberTimer);numberEntry='';$('#number-entry').hidden=true;}
  function commitNumber(){const value=Number(numberEntry);clearNumberEntry();
    const pageActions={100:()=>revealControls(),200:openGuide,300:openSchedule,400:openBrowse,500:openInfo,600:()=>panels.open($('.tv-settings'))};
    if(pageActions[value]||(Number.isInteger(value)&&value>=1&&value<=channels.length)){
      root.querySelectorAll('dialog[open], [data-tv-page]:not([hidden])').forEach(dialog=>panels.dismiss(dialog));
      if(pageActions[value])pageActions[value]();else tune(value-1);
    }else setStatus('Channel 1–'+channels.length+' / Pages 100, 200, 300, 400, 500, 600.');
  }
  document.addEventListener('keydown',e=>{
    if(document.documentElement.classList.contains('booting'))return;
    if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
    if(e.target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
    const key=e.key.toLowerCase();
    if(e.key==='Escape'){clearNumberEntry();return;}
    if(e.repeat&&/^\d$/.test(e.key))return;
    if(/^\d$/.test(e.key)){
      e.preventDefault();clearTimeout(numberTimer);numberEntry=(numberEntry+e.key).slice(-3);$('#number-entry').hidden=false;$('#number-entry strong').textContent=numberEntry;numberTimer=setTimeout(commitNumber,1200);return;
    }
    if(e.key==='Enter'&&numberEntry){e.preventDefault();commitNumber();return;}
    if(e.key==='Backspace'&&numberEntry){e.preventDefault();numberEntry=numberEntry.slice(0,-1);if(!numberEntry)clearNumberEntry();else $('#number-entry strong').textContent=numberEntry;return;}
    if(panels.isOpen($('.schedule-overlay'))){if(key==='s'){e.preventDefault();panels.close($('.schedule-overlay'));}return;}
    if(panels.isOpen($('.browse-overlay'))){if(key==='b'){e.preventDefault();panels.close($('.browse-overlay'));}return;}
    if(infoPanel.open){if(key==='i'){e.preventDefault();panels.close(infoPanel);return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Backspace'].includes(e.key)&&!/^\d$/.test(e.key))return;}
    if($('.tv-settings').open)return;
    if(panels.isOpen($('.guide'))){if(key==='g'||key==='c'){e.preventDefault();closeGuide();return;}if(!/^\d$/.test(e.key)&&!['ArrowLeft','ArrowRight'].includes(e.key))return;closeGuide(false);}
    if(e.repeat&&!['ArrowUp','ArrowDown'].includes(e.key))return;
    if(e.target.closest('button,a')&&(e.key===' '||(e.key==='Enter'&&!numberEntry)))return;
    const actions={ArrowRight:()=>tune(channel+1),ArrowLeft:()=>tune(channel-1),ArrowUp:()=>changeVolume(10),ArrowDown:()=>changeVolume(-10),
      ' ':()=>power?$('#tv-play').click():joinLive(),k:()=>power?$('#tv-play').click():joinLive(),
      m:()=>{if(startupMuted&&volume){enableSound();return;}if(volume){lastAudibleVolume=volume;changeVolume(-volume);}else changeVolume(lastAudibleVolume||40);},
      i:openInfo,b:openBrowse,f:()=>$('#fullscreen').click(),s:openSchedule,g:openGuide,c:openGuide,p:togglePower,
      '?':()=>{panels.open($('.tv-settings'));$('#keyboard-help').open=true;}};
    const action=actions[e.key]||actions[key];if(action){e.preventDefault();clearNumberEntry();action();}
  });
  const clockFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const refreshFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,day:'2-digit',month:'short'});let refreshWeek='';
  function tick(){
    if(power&&!paused&&currentPlayer()?.getPlayerState?.()===1&&active?.video.id===playingId){playedSeconds++;if(playedSeconds===30)remember(playingId);}
    if(!document.hidden&&!root.classList.contains('controls-hidden'))$('#station-clock').textContent=clockFormatter.format(Date.now());
    const changed=weekPlan();
    if(refreshWeek!==plan.week.key){refreshWeek=plan.week.key;$('#weekly-refresh').textContent=`NEW LINEUP TUE ${refreshFormatter.format(plan.week.end).toUpperCase()}`;
    $('#weekly-refresh').title='Fresh schedule every Tuesday at 00:00, Europe/Gibraltar. Generated locally from the checked catalogue.';}
    if(power&&active&&active.mode==='live'&&!paused&&(changed||Date.now()>=active.slot.end)){if(channels[channel].mode==='shuffle')advance(false);else{selectLive();loadActive();}}else if(changed&&!power)active=null;
    if(Date.now()-neighbourRefresh>15000&&power&&currentPlayer()?.getPlayerState?.()===1)scheduleNeighbours();
    render();if(panels.isOpen($('.schedule-overlay')))sendScheduleState();
  }
  // Start the saved station silently so browsers can autoplay without a gesture.
  // Reveal on the first picture; a bounded fallback leaves retry/channel controls reachable.
  // Only a playing picture (or an explicit browser block) releases the ident.
  startupTimer=setTimeout(()=>{if(startupPending){document.documentElement.dataset.appReady='error';window.dispatchEvent(new Event('rewind:error'));}},45000);
  tick();setInterval(tick,1000);const requested=new URLSearchParams(location.search);
  if(!requested.has('episode')||!playRequested(requested.get('channel'),requested.get('episode'))){selectLive();power=true;setStatus('TUNING IN · '+channels[channel].name);ensurePlayer();}
  persist();render();

})();
