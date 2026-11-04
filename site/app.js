'use strict';
(async () => {
  const root=document.getElementById('rewind-tv'),$=s=>root.querySelector(s),Schedule=window.RewindSchedule;
  let catalogue,onDemandLibrary=null,channels,plan,active=null,channel=2,volume=40,power=false,player=null,ready=false,apiLoading=false,paused=false,watchTimer,apiTimer,resumeAfterGuide=false,osdTimer,tuningTimer;
  const [{findProgramme},{programmeInfo,programmeProgress,programmeTitle},{NeighbourCache}]=await Promise.all([import('./show-library.mjs?v=browse5'),import('./programme-info.mjs?v=4'),import('./neighbour-cache.mjs?v=1')]);let requestedQueue=[];let requestedIndex=0;
  const {createPanelMotion}=await import('./panel-motion.mjs?v=polish1');
  const panels=createPanelMotion(root),wideMenu=matchMedia('(min-width:960px)');
  const movie=document.getElementById('archive-player');let movieLoading=false,audioContext;
  const {createPictureFrame}=await import('./picture-frame.mjs?v=2');const pictureFrame=createPictureFrame(root,{getVideo:()=>active?.video,native:movie});
  let playbackIntent=true,loadGeneration=0,recoveryChain=0,recoveryBackoffTimer=0;
  let startupMuted=true,startupPending=true,startupTimer;
  const startupSound=$('#startup-sound');
  function finishStartup(){if(!startupPending)return;startupPending=false;clearTimeout(startupTimer);document.documentElement.dataset.appReady='true';window.dispatchEvent(new Event('rewind:ready'));}
  function enableSound(){startupMuted=false;applyAudio(true);render();}

  function readSavedObject(key){try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
  let settings={crt:true,curve:true,sfx:true,ambient:true,audio:true,preload:false,...readSavedObject('rewind-effects')};
  if(settings.version!==2){settings.preload=false;settings.version=2;}
  let showLevels=readSavedObject('rewind-show-levels');
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
    if(!settings.sfx||volume===0||startupMuted)return;
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
  const archiveAdapter={getIframe:()=>movie,getCurrentTime:()=>movie.currentTime,getPlayerState:()=>movie.ended?0:movie.paused?2:movie.readyState<3||movie.seeking?3:1,getVideoData:()=>({video_id:movieSourceId}),getDuration:()=>movie.duration,setVolume:v=>movie.volume=v/100,mute:()=>movie.muted=true,unMute:()=>movie.muted=false,pauseVideo:()=>movie.pause(),stopVideo:()=>movie.pause(),playVideo:()=>{const expected=movieSourceId;movie.play().catch(error=>{if(error.name==='AbortError'||!movieMatches()||expected!==movieSourceId||!power)return;if(error.name==='NotAllowedError'){playbackIntent=false;paused=true;stopWatch();finishStartup();setStatus('Press PLAY on the remote to start the programme.',true);}else watchPlayback();});},loadVideoById:({startSeconds})=>setMovieSource(active.video,startSeconds,true),reloadVideo:selection=>{movieSourceUrl='';setMovieSource(selection.video,selection.offset,true)}};
  const currentPlayer=()=>active?.video.provider==='archive'?archiveAdapter:player;
  movie.addEventListener('playing',()=>{if(!movieMatches()||!power||!playbackIntent){movie.pause();return;}clearTimeout(apiTimer);clearTimeout(playerInitTimer);playerInitTimer=0;recoveryChain=0;recoveryAttempts=0;updateGlow();if(movieMatches()){stopWatch();clearTimeout(tuningTimer);$('.screen').classList.remove('is-tuning');paused=false;applyAudio(true);finishStartup();setStatus((channels[channel].mode==='shuffle'?'SHUFFLE':'LIVE')+' · Streaming from the Internet Archive.')}});
  movie.addEventListener('pause',()=>{queueMicrotask(updateGlow);if(power&&!movieLoading&&active?.video.provider==='archive'&&!playbackIntent){paused=true;setStatus('PAUSED · Press PLAY to continue.')}});
  for(const event of ['waiting','stalled'])movie.addEventListener(event,()=>{if(power&&movieMatches()&&playbackIntent){setStatus('BUFFERING · Checking the TV signal…');watchPlayback();}});
  movie.addEventListener('ended',()=>{if(power&&active?.video.provider==='archive')advance(false)});
  movie.addEventListener('error',()=>{if(power&&movieMatches())skipUnavailable('Archive stream unavailable',false)});
  movie.addEventListener('canplay',()=>{if(movie.hidden){movie.preload='metadata';updateNeighbourStatus();}});
  const {createGuideOverview}=await import('./guide-overview.mjs?v=browse3');
  let scheduleChannel=-1,scheduleStamp='',libraryView=null,guideOverview=null;
  const element=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;};
  function scheduleAction(label,action,primary=false){const b=element('button',label,primary?'primary':'');b.type='button';b.onclick=action;return b;}
  function sendScheduleState(i=scheduleChannel){
    if(!plan)return;if(i===-1){$('#schedule-all').hidden=true;guideOverview??=createGuideOverview($('#channel-schedule'),{getChannels:()=>channels,getCurrent:()=>channel,getNow:i=>onNow(i),getRows:i=>plan.schedules[i],onDetail:i=>openSchedule(i),onWatch:i=>{backToTV();tune(i);}});guideOverview.render(!scheduleStamp);scheduleStamp='overview';return;}$('#schedule-all').hidden=false;if(!channels[i])return;
    const c=channels[i],state=onNow(i),slot=state.slot,v=slot.video,stamp=c.key+':'+v.id+':'+slot.start+':'+(i===channel&&power);
    if(stamp===scheduleStamp)return;scheduleStamp=stamp;
    const host=$('#channel-schedule');host.replaceChildren();const station=element('div','','schedule-station'),logo=element('img');logo.src=c.logo;logo.alt='';const name=element('div');name.append(element('h3',String(i+1).padStart(2,'0')+' / '+c.name),element('p',c.mode==='shuffle'?'Continuous mix · No fixed timetable':'Live channel · Weekly timetable'));station.append(logo,name);host.append(station);
    const guideFormat=new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,weekday:'short',hour:'2-digit',minute:'2-digit'});const guideTime=ms=>guideFormat.format(ms);
    const card=element('section','','schedule-now');card.append(element('p','ON NOW','eyebrow'),element('h3',v.kind==='film'?programmeTitle(v):v.series||programmeTitle(v)),element('p',v.kind==='film'?['Full film',v.yearLabel||v.year].filter(Boolean).join(' · '):programmeTitle(v)),element('p',c.mode==='shuffle'?Math.round(v.duration/60)+' min':guideTime(slot.start)+' – '+guideTime(slot.end)));
    const actions=element('div','','action-row');actions.append(scheduleAction(i===channel&&power?'Return to live channel':'Watch this channel',()=>{backToTV();tune(i);},true));if(v.kind!=='advert')actions.append(scheduleAction('Watch from the beginning',()=>{backToTV();playRequested(c.key,v.id);}));card.append(actions);host.append(card,element('h3','Up next'));
    const list=element('div','','schedule-upcoming');for(const [n,row] of plan.schedules[i].slice(state.index+1).filter(row=>row.video.kind!=='advert').slice(0,8).entries()){const article=element('article'),text=element('div');text.append(element('strong',programmeTitle(row.video)),element('p',(row.video.series||'')+' · '+Math.round(row.video.duration/60)+' min'));article.append(element('time',c.mode==='shuffle'?(n===0?'Next':'Then'):guideTime(row.start)),text);list.append(article);}host.append(list,element('p',c.mode==='shuffle'?'This is the current mix. Its order can change as you watch.':'Times shown in Gibraltar time. Short advert breaks play between programmes.','schedule-note'));
    if(c.mode!=='shuffle'){
      const weekly=element('details','','weekly-guide'),summary=element('summary','Full weekly timetable'),tools=element('div','','library-tools'),day=element('select'),rows=element('div','','schedule-upcoming'),more=scheduleAction('More programmes ↓',()=>{limit+=30;draw();});day.setAttribute('aria-label','Timetable day');let limit=30;
      const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:Schedule.ZONE,year:'numeric',month:'2-digit',day:'2-digit'});const key=ms=>dayFormat.format(ms);
      for(const date of [...new Set(plan.schedules[i].map(row=>key(row.start)))]){const option=element('option',new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,weekday:'long',day:'numeric',month:'short'}).format(Date.parse(date+'T12:00:00Z')));option.value=date;day.append(option);}day.value=key(Date.now());tools.append(day);weekly.append(summary,tools,rows,more);host.append(weekly);
      function draw(){const items=plan.schedules[i].filter(row=>row.video.kind!=='advert'&&key(row.start)===day.value);rows.replaceChildren();for(const row of items.slice(0,limit)){const article=element('article'),text=element('div');text.append(element('strong',programmeTitle(row.video)),element('p',(row.video.series||'')+' · '+Math.round(row.video.duration/60)+' min'));article.append(element('time',time(row.start)),text);rows.append(article);}more.hidden=limit>=items.length;}
      day.onchange=()=>{limit=30;draw();};weekly.ontoggle=()=>{if(weekly.open)draw();};
    }

  }
  function openSchedule(i=null,remember=true){if(!Number.isInteger(i)||!channels[i])i=-1;scheduleChannel=i;scheduleStamp='';sendScheduleState(i);panels.open($('.schedule-overlay'));if(remember)history.pushState({rewind:true,guideChannel:i>=0?channels[i].key:'all'},'','#guide');revealControls();}
  let libraryLoading=null;
  async function openBrowse(){panels.open($('.browse-overlay'));revealControls();if(libraryView)return;
    $('#library-view').textContent='Opening the collection…';
    try{libraryLoading??=import('./library-view.mjs?v=browse5');const {createLibraryView}=await libraryLoading;if(!libraryView)libraryView=createLibraryView($('#library-view'),{catalogue:onDemandLibrary||catalogue,onPlay:v=>{backToTV();playRequested(v.channelKey,v.id);}});}catch(error){libraryLoading=null;$('#library-view').textContent='The collection could not load. Open Library to try again.';console.warn(error);}
  }
  function openLibrarySearch(){openBrowse().then(()=>libraryView?.focusSearch());}
  function backToTV(){root.querySelectorAll('dialog[open], [data-tv-page]:not([hidden])').forEach(panel=>panels.dismiss(panel));if(wideMenu.matches)openGuide();persist();revealControls();}
  $('#live-tab').onclick=openGuide;$('#brand-watch').onclick=backToTV;$('#menu-toggle').onclick=()=>{if(root.classList.contains('teletext-open'))backToTV();else openGuide();};$('#drawer-scrim').onclick=backToTV;
  $('#browse-button').onclick=()=>{libraryView?.openIndex();openBrowse();};$('#close-browse').onclick=backToTV;
  $('#schedule-button').onclick=()=>openSchedule();$('#close-schedule').onclick=backToTV;$('#schedule-all').onclick=()=>openSchedule();
  function requestedActive(v){const start=Date.now();return {index:0,slot:{video:v,start,end:start+v.duration*1000},video:v,offset:0,mode:'ondemand'};}
  function playRequested(channelKey,videoId){const found=findProgramme(onDemandLibrary||catalogue,channelKey,videoId);if(!found)return false;loadGeneration++;clearTimeout(recoveryBackoffTimer);playbackIntent=true;tuningSound();stopWatch();currentPlayer()?.pauseVideo?.();channel=channels.findIndex(c=>c.key===channelKey);requestedQueue=found.queue;requestedIndex=requestedQueue.findIndex(v=>v.id===videoId);active=requestedActive(found.video);power=true;paused=false;persist();if(panels.isOpen($('.browse-overlay')))panels.close($('.browse-overlay'));setStatus('ON DEMAND · '+found.video.title);ensurePlayer();return true;}
  $('#settings-channels').onclick=()=>openGuide();
  $('#settings-button').onclick=()=>{panels.open($('.tv-settings'));revealControls()};$('#close-settings').onclick=()=>{panels.close($('.tv-settings'));revealControls()};
  for(const key of ['crt','curve','sfx','ambient','audio','preload'])$('#setting-'+key).onchange=e=>{settings[key]=e.target.checked;if(key==='preload')neighbourPreloadBlocked=false;applySettings();applyRasterMotion();applyAudio();updateGlow();scheduleNeighbours()};
  const infoPanel=$('.programme-info');let infoKey='',seekingInfo=false;
  function seekProgramme(seconds){const p=currentPlayer();if(!power||!active||!['ondemand','replay'].includes(active.mode)||!Number.isFinite(seconds))return;const duration=Number(p?.getDuration?.())||active.video.duration;const target=Math.max(0,Math.min(seconds,Math.max(0,duration-1)));if(active.video.provider==='archive'){movieTarget=target;movie.currentTime=target;}else p?.seekTo?.(target,true);active.offset=target;renderInfo();revealControls();}
  $('#info-seek').oninput=e=>{seekingInfo=true;const p=programmeProgress(Number(e.target.value),Number(e.target.max));$('#info-elapsed').textContent=p.label;};
  $('#info-seek').onchange=e=>{seekingInfo=false;seekProgramme(Number(e.target.value));};
  $('#info-seek').addEventListener('pointercancel',()=>{seekingInfo=false;renderInfo();});
  function renderInfo(){
    if(!infoPanel.open||!active)return;
    const v=active.video,c=channels[channel],key=v.id+':'+c.key+':'+active.mode;
    if(infoKey!==key){
      infoKey=key;seekingInfo=false;const info=programmeInfo(v,c,active.mode);
      for(const [id,value]of Object.entries({show:info.show,title:info.title,meta:info.meta,channel:info.channel,mode:info.mode,synopsis:info.synopsis,provenance:info.provenance}))$('#info-'+id).textContent=value;
      $('#info-title').hidden=info.title===info.show;$('#info-synopsis').hidden=!info.synopsis;
      $('#info-source').textContent=info.source+' ↗';$('#info-source').href=info.url;$('#info-source').hidden=!info.url;
      const next=active.mode==='ondemand'?requestedQueue[requestedIndex+1]:plan.schedules[channel][active.index+1]?.video;
      $('#info-next').hidden=!next;$('#info-next-title').textContent=next?programmeTitle(next):'';
    }
    const current=currentPlayer(),elapsed=current?.getVideoData?.()?.video_id===v.id?current.getCurrentTime?.():active.offset;
    const canSeek=['ondemand','replay'].includes(active.mode),duration=Number(current?.getDuration?.())||v.duration;$('#info-seek').hidden=$('#info-seek-label').hidden=!canSeek;$('#info-progress').hidden=canSeek;if(seekingInfo)return;$('#info-seek').max=Math.max(1,duration-1);$('#info-seek').value=Math.max(0,elapsed||0);$('#info-seek').setAttribute('aria-valuetext',programmeProgress(elapsed,duration).label);
    const p=programmeProgress(elapsed,Math.max(1,duration));$('#info-progress').value=p.value;$('#info-elapsed').textContent=p.label;$('#info-remaining').textContent=p.remaining;
  }
  function openInfo(){if(!power||!active)return;infoKey='';panels.open(infoPanel);root.classList.add('info-open');renderInfo();revealControls();}
  $('#info-prev-channel').onclick=()=>tune(channel-1);$('#info-next-channel').onclick=()=>tune(channel+1);
  $('#info-button').onclick=openInfo;$('#close-info').onclick=()=>panels.close(infoPanel);
  $('#info-schedule').onclick=()=>{panels.dismiss(infoPanel);openSchedule(channel);};infoPanel.addEventListener('close',()=>{root.classList.remove('info-open');revealControls();});
  let chromeTimer;
  function revealControls(){root.classList.remove('controls-hidden');clearTimeout(chromeTimer);chromeTimer=setTimeout(hideControls,matchMedia('(pointer:coarse), (max-width:700px)').matches?5500:3200);}
  function hideControls(){if(!power||paused||currentPlayer()?.getPlayerState?.()!==1||!$('#retry-video').hidden||!$('#unavailable').hidden||infoPanel.open||$('.tv-settings').open||(!wideMenu.matches&&(panels.isOpen($('.guide'))||panels.isOpen($('.schedule-overlay'))||panels.isOpen($('.browse-overlay'))))||root.querySelector('button:focus-visible,a:focus-visible,input:not(#tv-volume):focus,#tv-volume:focus-visible,select:focus')){chromeTimer=setTimeout(hideControls,1000);return;}root.classList.add('controls-hidden');}
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
    if(!power||!active||!playbackIntent)return;
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
    let candidates=channels[channel].videos.filter(v=>!failed.has(v.id)&&!globallyRestricted(v));
    if(!persistFailure&&active.video.provider!=='archive'){const direct=candidates.filter(v=>v.provider==='archive');if(direct.length){const buffered=direct.find(v=>v.id===movieSourceId&&movie.readyState>=3);candidates=buffered?[buffered]:direct;}}
    if(!candidates.length){setStatus('NO SIGNAL · Moving to the next channel.');const generation=loadGeneration;clearTimeout(recoveryBackoffTimer);recoveryBackoffTimer=setTimeout(()=>{if(power&&playbackIntent&&generation===loadGeneration)tune(channel+1);},600);return;}
    const rows=RewindShuffle.rows(candidates,recent,Date.now(),Math.random);
    const slot=rows[0];
    if(channels[channel].mode==='shuffle')plan.schedules[channel]=rows;
    active={index:channels[channel].mode==='shuffle'?0:onNow().index,slot,video:slot.video,offset:0,mode:channels[channel].mode==='shuffle'?'live':'fallback'};
    setStatus(reason+' · Trying another upload.');ensurePlayer();
  }
  const timeFormat=new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,hour:'2-digit',minute:'2-digit',hour12:false}),time=ms=>timeFormat.format(ms);
  const shortTitle=v=>programmeTitle(v);
  const programmeLabel=v=>{const title=programmeTitle(v);return v.kind==='film'||v.kind==='music'||!v.series||v.series===title?title:v.series+' · '+title;};
  let recent={};try{recent=JSON.parse(localStorage.getItem('rewind-seen')||'{}')}catch{}let playingId='',playedSeconds=0;
  function remember(id){recent[id]=Date.now();recent=Object.fromEntries(Object.entries(recent).sort((a,b)=>b[1]-a[1]).slice(0,5000));try{localStorage.setItem('rewind-seen',JSON.stringify(recent))}catch{}}
  const shuffleLastAd={};
  function freshRows(i,at=Date.now()){const all=channels[i].videos,available=all.filter(v=>!failed.has(v.id)&&!globallyRestricted(v));return RewindShuffle.rows(available.length?available:all,recent,at,Math.random,{ads:channels[i].adverts===false?[]:(catalogue.adverts||[]).filter(v=>!failed.has(v.id)),lastAd:shuffleLastAd[channels[i].key]})}
  function onNow(i=channel){if(channels[i].mode==='shuffle'){let rows=plan.schedules[i];if(!rows.length||rows.at(-1).end<=Date.now())plan.schedules[i]=rows=freshRows(i);if(!rows.length)throw Error('No playable episodes');}return Schedule.current(plan,i);}

  const video=()=>active?.video||onNow().slot.video;
  const debugPlayer=new URLSearchParams(location.search).has('playerDebug');
  function tracePlayer(event,detail={}){if(debugPlayer)console.info('REWIND-PLAYER',JSON.stringify({at:Math.round(performance.now()),event,...detail}));}
  window.addEventListener('message',e=>{if(!debugPlayer)return;const f=[...root.querySelectorAll('iframe')].find(f=>e.source===f.contentWindow);if(!f)return;try{const m=typeof e.data==='string'?JSON.parse(e.data):e.data;if(m?.event!=='infoDelivery')tracePlayer('message',{frame:f.id,eventName:m?.event});}catch{}});

  function persist(){try{localStorage.setItem('rewind-tv-v2',JSON.stringify({key:channels[channel].key,volume}));if(active&&power){const url=new URL(location.href);url.searchParams.set('channel',channels[channel].key);if(active.mode==='ondemand')url.searchParams.set('episode',active.video.id);else url.searchParams.delete('episode');history.replaceState(history.state,'',url);}}catch{}}
  function weekPlan(){if(!plan||Schedule.weekAt().key!==plan.week.key){if(plan){location.reload();return false;}plan=Schedule.build(catalogue);return true;}return false;}
  function render(){
    if(!plan)return;pictureFrame.update();updateGlow();if(document.hidden)return;
    renderInfo();
    const v=video(),live=onNow(),up=active?.mode==='ondemand'?(requestedQueue[requestedIndex+1]?{video:requestedQueue[requestedIndex+1]}:null):active?plan.schedules[channel][active.index+1]:live.next;
    const bug=$('#channel-logo');if(bug.dataset.key!==channels[channel].key){bug.src=channels[channel].logo||('logos/'+channels[channel].key+'.svg');bug.alt=channels[channel].name;bug.dataset.key=channels[channel].key;}bug.hidden=!power;
    $('#remote-no').textContent=String(channel+1).padStart(2,'0');$('#menu-channel-number').textContent=String(channel+1).padStart(2,'0');
    $('#now-title').textContent=active?.mode==='ondemand'?(v.kind==='film'?v.title:v.series||v.title):channels[channel].name;
    $('#now-description').textContent=(v.kind==='advert'?'Ad break · ':'')+(active?.mode==='ondemand'?(v.kind==='film'?[v.yearLabel||v.year,Math.round(v.duration/60)+' min'].filter(Boolean).join(' · '):programmeTitle(v)):programmeLabel(v));
    $('#now-description').title=$('#now-description').textContent;
    if($('#playback-status').textContent!==status)$('#playback-status').textContent=status;
    $('#tv-play').textContent=paused?'▶ Play':'Ⅱ Pause';$('#tv-play').setAttribute('aria-label',paused?'Play television':'Pause television');$('#tv-play').disabled=!power;
    const muted=volume===0||startupMuted;
    $('#volume').textContent=muted?'MUTED':`VOL ${volume}`;
    $('#tv-volume').value=volume;$('#tv-volume').setAttribute('aria-valuetext',muted?`${volume}% — muted`:`${volume}%`);
    $('#tv-volume-value').textContent=String(volume);$('.remote-volume').classList.toggle('is-muted',muted);
    startupSound.textContent=muted?'Unmute':'Mute';startupSound.setAttribute('aria-label',muted?'Unmute television':'Mute television');
    startupSound.setAttribute('aria-pressed',String(muted));
    const levelKey=v.series||v.id,level=Math.max(-12,Math.min(6,Number(showLevels[levelKey])||0));
    $('#programme-trim').value=String(level);$('#programme-trim').disabled=!power||v.kind==='advert';
    $('#trim-value').textContent=(level>0?'+':'')+level+' dB';$('#trim-programme').textContent=v.kind==='advert'?'Advert level is reduced automatically.':(power?'Saved for '+(v.series||v.title):'Start a programme to adjust it.');
    $('#source-link').textContent=v.sourceProvenance?'FAN/ARCHIVE ↗':v.provider==='archive'?'ARCHIVE ↗':'YOUTUBE ↗';$('#source-link').href=v.watchUrl;$('#unavailable-link').href=v.watchUrl;$('#unavailable-link').textContent=v.provider==='archive'?'WATCH ON ARCHIVE ↗':'WATCH ON YOUTUBE ↗';$('#unavailable').hidden=!(power&&(v.embedStatus==='restricted'||failed.has(v.id))); 
    root.classList.toggle('is-playing',!!(power&&!paused&&currentPlayer()?.getPlayerState?.()===1&&currentPlayer()?.getVideoData?.()?.video_id===active?.video.id));
    root.classList.toggle('is-ondemand',active?.mode==='ondemand');root.classList.toggle('tv-on',power);if(!power||paused)root.classList.remove('controls-hidden');
    $('.off').hidden=power;$('.led').classList.toggle('off-led',!power);
    $('.remote-power').setAttribute('aria-pressed',String(power));
    $('.guide-toggle').setAttribute('aria-expanded',String(panels.isOpen($('.schedule-overlay'))));
    $('#join-live').hidden=!power||(!paused&&active?.mode==='live');$('#return-live').hidden=!power||(!paused&&active?.mode==='live');
    $('#restart-show').disabled=!power;$('#info-button').disabled=!power||!active;
    $('#up-next').textContent=up?`NEXT ${active?.mode==='live'&&channels[channel].mode!=='shuffle'?time(up.start):''} · ${shortTitle(up.video)}`:active?.mode==='ondemand'?'END OF THIS COLLECTION':'NEW WEEKLY LINEUP';
    $('#up-next').title=up?up.video.title:'';
    $('#on-air-mode').textContent=!power?'STANDBY':v.embedStatus==='restricted'||failed.has(v.id)?'NO SIGNAL':paused?'PAUSED':active?.mode==='live'?(channels[channel].mode==='shuffle'?'MIX':'● LIVE'):active?.mode==='fallback'?'ALT SIGNAL':active?.mode==='ondemand'?'ON DEMAND':'REPLAY';
    if(wideMenu.matches&&scheduleChannel>=0&&panels.isOpen($('.schedule-overlay'))&&scheduleChannel!==channel){scheduleChannel=channel;scheduleStamp='';sendScheduleState();}
    if(!infoPanel.open&&(!root.classList.contains('controls-hidden')||panels.isOpen($('.guide'))))root.querySelectorAll('[data-channel]').forEach(b=>{
      const i=Number(b.dataset.channel),now=onNow(i),next=plan.schedules[i].slice(now.index+1).find(row=>row.video.kind!=='advert')||now.next,key=now.slot.video.id+':'+(i===channel);if(b.dataset.renderKey===key)return;b.dataset.renderKey=key;
      b.setAttribute('aria-pressed',String(i===channel));
      b.querySelector('small').textContent='Now · '+programmeLabel(now.slot.video);b.querySelector('.channel-next').textContent=next?'Next · '+programmeLabel(next.video):'';
      b.title=`${channels[i].name}${channels[i].shows?' · '+channels[i].shows.join(', '):''}${channels[i].mode==='shuffle'?' · SHUFFLE':''}\nNOW ${channels[i].mode==='shuffle'?'':time(now.slot.start)} — ${now.slot.video.title} (${now.slot.video.yearLabel||now.slot.video.year})${next?'\nNEXT '+(channels[i].mode==='shuffle'?'':time(next.start))+' — '+next.video.title:''}`;
      b.setAttribute('aria-label',`Watch ${String(i+1).padStart(2,'0')} ${channels[i].name}. Now: ${now.slot.video.series||shortTitle(now.slot.video)}`);
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
  let playerChannelKey=null,neighbourTimer=0,neighbourRefresh=Date.now(),warmSerial=0,neighbourPreloadBlocked=false;
  const neighbours=new NeighbourCache(disposeNeighbour);
  navigator.connection?.addEventListener?.('change',scheduleNeighbours);
  function updateNeighbourStatus(){
    const label=$('#preload-status');if(!label)return;
    if(!settings.preload){label.textContent='Off · one player at a time.';return;}
    if(neighbourPreloadBlocked){label.textContent='Light mode · Channels load when selected.';return;}
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
    const target=document.createElement('div'),slot={frame:null,player:null,videoId:selection.video.id,ready:false,cancelled:false};
    target.id='neighbour-player-'+(++warmSerial);$('.screen').append(target);
    // Register API listeners before navigation, exactly as for the visible player.
    slot.player=new YT.Player(target,{videoId:slot.videoId,playerVars:{origin:location.origin,playsinline:1,autoplay:0,mute:1,controls:0},events:{
      onReady:e=>{tracePlayer('neighbour-ready',{key:selection.key});if(slot.cancelled)return;e.target.mute();e.target.setVolume(0);e.target.cueVideoById({videoId:slot.videoId,startSeconds:selection.offset});},
      onStateChange:e=>{
        tracePlayer('neighbour-state',{key:selection.key,state:e.data,id:e.target.getVideoData?.()?.video_id});
        if(slot.cancelled)return;
        if(e.target===player){onPlayerStateChange(e);return;}
        if(e.data===5){slot.ready=true;clearTimeout(slot.timer);updateNeighbourStatus();}
        if(e.data===1){e.target.mute();e.target.pauseVideo();}
      },
      onAutoplayBlocked:onPlayerAutoplayBlocked,
      onError:e=>{if(slot.cancelled)return;if(e.target===player){videoError(e);return;}if(neighbours.slots.get(selection.key)===slot){neighbours.remove(selection.key);updateNeighbourStatus();}}
    }});
    const frame=slot.frame=slot.player.getIframe();frame.title='Prepared channel: '+selection.name;frame.className='prepared-player';frame.tabIndex=-1;
    frame.setAttribute('aria-hidden','true');
    slot.timer=setTimeout(()=>{if(neighbours.slots.get(selection.key)===slot&&!slot.ready){neighbourPreloadBlocked=true;clearNeighbours();}},5000);
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
    neighbours.reconcile(neighbourPreloadBlocked?[]:wanted.filter(s=>s.video.provider!=='archive'),createNeighbour);updateNeighbourStatus();
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
  function watchPlayback(requireProgress=false){
    if(!active||!playbackIntent)return;if(active.video.provider!=='archive'&&!ready){watchPlayerInit();return;}if(watchTimer&&watchGeneration===loadGeneration)return;clearTimeout(watchTimer);watchGeneration=loadGeneration;const expected=active.video.id,generation=loadGeneration;
    if(recoveryId!==expected){recoveryId=expected;recoveryAttempts=0;}
    watchTimer=setTimeout(()=>{
      watchTimer=0;
      if(!power||paused||!playbackIntent||generation!==loadGeneration||active?.video.id!==expected||(!requireProgress&&currentPlayer()?.getPlayerState?.()===1&&currentPlayer()?.getVideoData?.()?.video_id===expected))return;
      if(document.hidden){watchPlayback(requireProgress);return;}
      if(recoveryAttempts++<1){setStatus('CONNECTING · Retrying the TV signal…');playSelection(currentPlayer(),active,true);watchPlayback(requireProgress);}
      else skipUnavailable('Signal did not start',false);
    },active.video.provider==='archive'?16000:8000);
  }

  let progressGeneration=-1,progressTime=null,progressAt=0;
  function checkPlaybackProgress(now=Date.now()){
    const p=currentPlayer(),time=p?.getCurrentTime?.();
    if(!power||!playbackIntent||paused||document.hidden||channelLoadTimer||!active||p?.getPlayerState?.()!==1||p?.getVideoData?.()?.video_id!==active.video.id||!Number.isFinite(time)){
      progressGeneration=-1;return;
    }
    if(progressGeneration!==loadGeneration||progressTime===null||Math.abs(time-progressTime)>.2){
      progressGeneration=loadGeneration;progressTime=time;progressAt=now;
      // A changing playback clock is stronger evidence than a PLAYING event.
      recoveryAttempts=0;recoveryChain=0;stopWatch();return;
    }
    if(now-progressAt>=12000)watchPlayback(true);
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
    if(!ready){watchPlayerInit();return;}
    const reported=e.target.getVideoData?.()?.video_id;
    if(reported&&reported!==active.video.id)return;
    if(!reported){setStatus('CONNECTING · Waiting for the selected channel…');watchPlayback();return;}stopWatch();
    if(e.data===153){skipUnavailable('This source cannot identify the player',false);return;}
    if(e.data===2||e.data===100||e.data===101||e.data===150){
      skipUnavailable('Upload unavailable in this browser or region');
    }else{setStatus('CONNECTING · Recovering the TV signal…');watchPlayback();}
  }
  function onPlayerStateChange(e){tracePlayer('state',{state:e.data,matches:e.target===player});
        if(e.target!==player){if(e.data===1){e.target.mute?.();e.target.pauseVideo?.();}return;}
        if(!power||!active||active.video.provider==='archive'||channelLoadTimer||e.target.getVideoData?.()?.video_id!==active.video.id)return;
        if(e.data===1){if(!playbackIntent){e.target.pauseVideo?.();return;}recoveryChain=0;recoveryAttempts=0;clearTimeout(tuningTimer);$('.screen').classList.remove('is-tuning');ready=true;clearTimeout(apiTimer);stopWatch();paused=false;applyAudio(true);finishStartup();scheduleNeighbours();setStatus(active.mode==='live'?(channels[channel].mode==='shuffle'?'SHUFFLE · Continuous playback, no fixed timetable.':'LIVE · Channels keep broadcasting while you’re away.'):active.mode==='fallback'?'ALT SIGNAL · This upload replaces an unavailable broadcast.':active.mode==='ondemand'?'ON DEMAND · This show continues in episode order. JOIN LIVE to return to the channel.':'REPLAY · Join live whenever you like.');}
        else if(e.data===0){stopWatch();advance(false);}
        else if(e.data===2){if(playbackIntent){watchPlayback();return;}stopWatch();paused=true;setStatus('PAUSED · Play to continue, or JOIN LIVE.');}
        else if(e.data===3){setStatus('BUFFERING · Checking the TV signal…');watchPlayback();}

  }
  function onPlayerAutoplayBlocked(e){if((e.target&&e.target!==player)||active?.video.provider==='archive'||channelLoadTimer)return;ready=true;clearTimeout(apiTimer);stopWatch();if(power){finishStartup();playbackIntent=false;paused=true;setStatus('Your browser paused playback. Press PLAY to start.');}
  }
  let initRetries=0,pendingFrame=null,playerInitTimer=0;
  function resetPlayerFrame(){
    clearTimeout(playerInitTimer);playerInitTimer=0;
    try{player?.destroy();}catch{}player=null;ready=false;if(pendingFrame){pendingFrame.remove();pendingFrame=null;}
    let placeholder=$('#video-player');if(!placeholder){placeholder=document.createElement('div');placeholder.id='video-player';$('.screen').prepend(placeholder);}
  }
  function watchPlayerInit(){
    clearTimeout(playerInitTimer);const expected=player;
    playerInitTimer=setTimeout(()=>{
      playerInitTimer=0;
      if(expected!==player||ready||!power||active?.video.provider==='archive'||!playbackIntent)return;
      if(document.hidden){watchPlayerInit();return;}
      // A missing handshake is a player/connection failure, not a broken upload.
      // Keep the latest channel and reconnect it without blacklisting its video.
      if(initRetries++%2===0){resetPlayerFrame();setStatus('CONNECTING · Reconnecting the TV signal…');initPlayer();}
      else{
        resetPlayerFrame();setStatus('CONNECTING · Waiting for the video service…');
        const generation=loadGeneration;
        playerInitTimer=setTimeout(()=>{playerInitTimer=0;if(power&&playbackIntent&&generation===loadGeneration&&active?.video.provider!=='archive')ensurePlayer();},8000);
      }
    },8000);
  }
  function initPlayer(){
    tracePlayer('init',{hasPlayer:!!player,ready,id:active?.video.id,apiLoaded:window.YT?.loaded,apiLoading:window.YT?.loading});
    if(player||pendingFrame)return;
    // Let the IFrame API own navigation and its readiness handshake. Waiting
    // for the embed's load event can strand startup before API listeners exist.
    const firstId=video().id;playerChannelKey=channels[channel].key;
    const placeholder=document.createElement('div');placeholder.id='video-player';
    $('#video-player').replaceWith(placeholder);
    player=new YT.Player(placeholder,{videoId:firstId,playerVars:{origin:location.origin,playsinline:1,autoplay:1,mute:1,controls:0,start:Math.floor(active?.offset||0)},events:{
      onReady:e=>{tracePlayer('ready',{matches:e.target===player});if(e.target!==player)return;ready=true;initRetries=0;clearTimeout(playerInitTimer);playerInitTimer=0;clearTimeout(apiTimer);const f=player.getIframe();f.title='Rewind TV video player';f.tabIndex=-1;f.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');if(!power||!playbackIntent||active?.video.provider==='archive'){e.target.mute();e.target.pauseVideo?.();return;}if(power){if(!active)selectLive();
        if(channelLoadTimer)return;
        if(active.video.id!==firstId)loadActive();
        else{playingId=firstId;paused=false;player.mute();player.playVideo();if(player.getPlayerState?.()===1)onPlayerStateChange({target:player,data:1});else watchPlayback();}
      }},
      onStateChange:onPlayerStateChange,onAutoplayBlocked:onPlayerAutoplayBlocked,onError:videoError
    }});player.getIframe().addEventListener('load',()=>tracePlayer('frame-load'));tracePlayer('constructed',{firstId,visibility:document.visibilityState});watchPlayerInit();
  }

  let apiRecoveryTimer=0,apiRecoveryAttempts=0;
  function recoverPlayerApi(){
    clearTimeout(apiTimer);apiLoading=false;
    if(ready||!power||active?.video.provider==='archive'||!playbackIntent)return;
    document.getElementById('youtube-api')?.remove();
    clearTimeout(apiRecoveryTimer);
    const delay=apiRecoveryAttempts++===0?1500:15000;
    setStatus('CONNECTING · Reconnecting the video service…');
    apiRecoveryTimer=setTimeout(()=>{
      apiRecoveryTimer=0;
      if(power&&playbackIntent&&active?.video.provider!=='archive'&&!ready)ensurePlayer();
    },delay);
  }

  function ensurePlayer(forceReload=false){
    cancelChannelLoad();
    if(active?.video.provider==='archive'){clearTimeout(playerInitTimer);playerInitTimer=0;clearNeighbours();loadActive();return;}
    movie.hidden=true;movieLoading=false;
    if(ready){if(!forceReload)activateNeighbour();loadActive(forceReload);return;}if(window.YT?.Player){if(player){watchPlayerInit();return;}initPlayer();return;}if(apiLoading)return;
    apiLoading=true;window.onYouTubeIframeAPIReady=()=>{apiLoading=false;apiRecoveryAttempts=0;clearTimeout(apiRecoveryTimer);clearTimeout(apiTimer);if(power&&active?.video.provider!=='archive')initPlayer();};
    const existing=document.getElementById('youtube-api');const script=existing||document.createElement('script');if(!existing){script.src='https://www.youtube.com/iframe_api';script.id='youtube-api';}script.onerror=recoverPlayerApi;if(!script.isConnected)document.head.append(script);
    apiTimer=setTimeout(recoverPlayerApi,18000);
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
  function joinLive(){playbackIntent=true;paused=false;clearTimeout(recoveryBackoffTimer);tuningSound();selectLive();power=true;ensurePlayer();persist();}
  function togglePower(){clearTimeout(playerInitTimer);playerInitTimer=0;loadGeneration++;clearTimeout(recoveryBackoffTimer);cancelChannelLoad();clearNeighbours();if(!power){joinLive();return;}power=false;playbackIntent=false;paused=false;stopWatch();if(currentPlayer()){currentPlayer().pauseVideo?.();currentPlayer().getIframe().hidden=true;}setStatus('TV OFF · The schedule keeps rolling.');}
  function changeVolume(delta){if(!Number.isFinite(delta))return;if(volume>0)lastAudibleVolume=volume;startupMuted=false;volume=Math.max(0,Math.min(100,Math.round(volume+delta)));if(volume>0)lastAudibleVolume=volume;if(currentPlayer()){applyAudio();}persist();render();revealControls();}
  function toggleMute(){if(startupMuted&&volume){enableSound();revealControls();return;}if(volume)changeVolume(-volume);else changeVolume(lastAudibleVolume||40);}
  function closeGuide(resume=true){if(wideMenu.matches){render();return;}if(!resume)resumeAfterGuide=false;panels.close($('.guide'));root.classList.remove('guide-open');render();}
  function openGuide(){if(location.hash==='#guide'&&history.state?.guideChannel)history.pushState({rewind:true},'','#guide');resumeAfterGuide=false;root.classList.add('guide-open');panels.open($('.guide'));render();root.querySelector('[data-channel="'+channel+'"]')?.scrollIntoView({block:'nearest',inline:'nearest'});}
  function createChannelLists(){
    root.style.setProperty('--channel-count',channels.length);
    root.querySelectorAll('.direct-channels').forEach(list=>{
      list.replaceChildren();channels.forEach((c,i)=>{
        const b=element('button','','channel-choice');b.type='button';b.dataset.channel=i;
        b.append(element('span',String(i+1).padStart(2,'0')),element('strong',c.name),element('small'),element('small','','channel-next'));
        b.onclick=()=>{if(!wideMenu.matches)backToTV();tune(i);};const row=element('div','','channel-row');row.append(b);list.append(row);
      });
    });
  }
  root.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
    const {loadLibrary}=await import('./library.mjs?v=browse3');catalogue=await loadLibrary();window.RewindLibrary=()=>onDemandLibrary||catalogue;catalogue.channels=catalogue.channels.map(c=>({...c,videos:c.videos.filter(v=>v.enabled!==false)})).filter(c=>c.videos.length);channels=catalogue.channels;
    const saved=readSavedObject('rewind-tv-v2');
    const requestedChannel=new URLSearchParams(location.search).get('channel')||saved.key;const selected=channels.findIndex(c=>c.key===requestedChannel);if(selected>=0)channel=selected;
    if(Number.isFinite(saved.volume))volume=Math.max(0,Math.min(100,saved.volume));
    plan=Schedule.build(catalogue);createChannelLists();document.documentElement.dataset.catalogueReady='true';
    root.querySelectorAll('button').forEach(b=>{b.disabled=false;b.type='button';});
    $('#guide-title').textContent='Channels';$('#library-count').textContent=channels.length+' channels · Live TV & continuous mixes';
    $('.standby-code').textContent='P100 / REWIND TELEVISION';$('#start-tv small').textContent=`90s / 2000s / CLASSIC CINEMA. GOOD COMPANY.`;
    $('.source-note').textContent=`${new Set(channels.flatMap(c=>c.videos.map(v=>v.id))).size} UNIQUE VIDEOS · 90s / 2000s / CLASSICS\nREFRESHES TUESDAY 00:00`;
  }catch(error){$('#playback-status').textContent='The catalogue could not load. Refresh this page to retry.';console.error(error);document.documentElement.dataset.appReady='error';window.dispatchEvent(new Event('rewind:error'));return;}
  $('#tv-play').onclick=()=>{if(!power)return;clearTimeout(recoveryBackoffTimer);playbackIntent=paused;paused=!playbackIntent;if(playbackIntent){if(active?.video.provider!=='archive'&&!ready)ensurePlayer();else{currentPlayer()?.playVideo?.();watchPlayback();}}else{stopWatch();clearTimeout(playerInitTimer);playerInitTimer=0;currentPlayer()?.pauseVideo?.();setStatus('PAUSED · Press PLAY to continue.');}};
  $('.remote-power').onclick=togglePower;$('#start-tv').onclick=joinLive;
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const a=b.dataset.action;if(a==='next')tune(channel+1);else if(a==='prev')tune(channel-1);else changeVolume(a==='louder'?10:-10);});
  $('.guide-toggle').onclick=$('#remote-guide').onclick=()=>openSchedule();$('#close-guide').onclick=()=>closeGuide();
  $('.guide').addEventListener('close',()=>{root.classList.remove('guide-open');if(resumeAfterGuide&&currentPlayer()&&power){resumeAfterGuide=false;currentPlayer().playVideo?.();}render();});
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else if(active?.video.provider==='archive'&&movie.webkitEnterFullscreen)movie.webkitEnterFullscreen();else setStatus('Fullscreen is unavailable in this browser.',true);}catch{setStatus('Fullscreen is unavailable in this browser.',true);}revealControls();};
  document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
  $('#skip-video').onclick=()=>{if(!power)power=true;advance(true);if(!ready&&active.video.provider!=='archive')ensurePlayer();};
  $('#restart-show').onclick=()=>{if(active){active={...active,offset:0,mode:active.mode==='ondemand'?'ondemand':'replay'};loadActive();}};
  $('#join-live').onclick=$('#return-live').onclick=joinLive;
  $('#retry-video').onclick=()=>{
    failed.clear();try{localStorage.removeItem('rewind-unavailable')}catch{}power=true;
    if(active?.mode==='ondemand')active={...active,offset:0};else selectLive();
    initRetries=0;if(!ready&&player)resetPlayerFrame();
    if(!ready&&!window.YT?.Player){apiLoading=false;document.getElementById('youtube-api')?.remove();}
    clearTimeout(apiTimer);apiTimer=setTimeout(recoverPlayerApi,18000);
    setStatus('RETRYING · '+active.video.title);ensurePlayer(true);
  };
  let numberEntry='',numberTimer,lastAudibleVolume=volume||40;
  startupSound.onclick=toggleMute;
  $('#tv-volume').disabled=false;$('#tv-volume').oninput=e=>changeVolume(Number(e.target.value)-volume);
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
    const key=e.key.toLowerCase();
    if(e.key==='Escape'){const hadNumber=!!numberEntry;clearNumberEntry();if(hadNumber||e.defaultPrevented)return;e.preventDefault();const dialog=root.querySelector('dialog[open]');if(dialog)panels.close(dialog);else backToTV();return;}
    if(e.target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
    if(($('.tv-settings').open||panels.isOpen($('.browse-overlay')))&&/^\d$/.test(e.key))return;
    if(e.repeat&&/^\d$/.test(e.key))return;
    if(/^\d$/.test(e.key)){
      e.preventDefault();clearTimeout(numberTimer);numberEntry=(numberEntry+e.key).slice(-3);$('#number-entry').hidden=false;$('#number-entry strong').textContent=numberEntry;numberTimer=setTimeout(commitNumber,1200);return;
    }
    if(e.key==='Enter'&&numberEntry){e.preventDefault();commitNumber();return;}
    if(e.key==='Backspace'&&numberEntry){e.preventDefault();numberEntry=numberEntry.slice(0,-1);if(!numberEntry)clearNumberEntry();else $('#number-entry strong').textContent=numberEntry;return;}
    if(!$('.tv-settings').open&&!infoPanel.open){
      if(key==='/'){e.preventDefault();openLibrarySearch();return;}
      if(key==='g'||key==='c'){e.preventDefault();if(panels.isOpen($('.guide')))backToTV();else openGuide();return;}
      if(key==='b'){e.preventDefault();if(panels.isOpen($('.browse-overlay')))backToTV();else openBrowse();return;}
      if(key==='s'){e.preventDefault();if(panels.isOpen($('.schedule-overlay')))backToTV();else openSchedule();return;}
    }
    if(!wideMenu.matches&&(panels.isOpen($('.schedule-overlay'))||panels.isOpen($('.browse-overlay'))))return;
    if(infoPanel.open){if(key==='i'){e.preventDefault();panels.close(infoPanel);return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Backspace',' ','m','M','k','K','f','F'].includes(e.key)&&!/^\d$/.test(e.key))return;}
    if($('.tv-settings').open)return;
    if(!wideMenu.matches&&panels.isOpen($('.guide'))){if(key==='g'||key==='c'){e.preventDefault();closeGuide();return;}if(!/^\d$/.test(e.key)&&!['ArrowLeft','ArrowRight'].includes(e.key))return;closeGuide(false);}
    if(e.repeat&&!['ArrowUp','ArrowDown'].includes(e.key))return;
    if(e.target.closest('button,a')&&(e.key===' '||(e.key==='Enter'&&!numberEntry)))return;
    const actions={ArrowRight:()=>tune(channel+1),ArrowLeft:()=>tune(channel-1),ArrowUp:()=>changeVolume(10),ArrowDown:()=>changeVolume(-10),
      ' ':()=>power?$('#tv-play').click():joinLive(),k:()=>power?$('#tv-play').click():joinLive(),
      m:toggleMute,
      i:openInfo,b:openBrowse,'/':openLibrarySearch,f:()=>$('#fullscreen').click(),s:openSchedule,g:openGuide,c:openGuide,p:togglePower,
      '?':()=>{panels.open($('.tv-settings'));$('#keyboard-help').open=true;}};
    const action=actions[e.key]||actions[key];if(action){e.preventDefault();clearNumberEntry();action();}
  });
  const clockFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const refreshFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:Schedule.ZONE,day:'2-digit',month:'short'});let refreshWeek='';
  function tick(){
    checkPlaybackProgress();
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
  window.addEventListener('popstate',()=>{if(location.hash==='#guide'&&history.state?.guideChannel){const i=channels.findIndex(c=>c.key===history.state.guideChannel);if((i>=0||history.state.guideChannel==='all')&&(!panels.isOpen($('.schedule-overlay'))||scheduleChannel!==i))openSchedule(i,false);}});
  persist();render();if(location.hash==='#guide')openGuide();else if(location.hash==='#library')openBrowse();else if(wideMenu.matches)openGuide();wideMenu.addEventListener('change',()=>{if(wideMenu.matches&&!root.querySelector('[data-tv-page]:not([hidden])'))openGuide();panels.sync();});

})();
