'use strict';
const guideParams=new URLSearchParams(location.search),embedded=guideParams.has('overlay');if(embedded)document.documentElement.classList.add('schedule-embedded');
(async()=>{
 const $=s=>document.querySelector(s),S=RewindSchedule;let cat,plan,context=null,limit=40;
 const clockFormat=new Intl.DateTimeFormat('en-GB',{timeZone:S.ZONE,hour:'2-digit',minute:'2-digit'}),dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:S.ZONE,year:'numeric',month:'2-digit',day:'2-digit'}),hourFormat=new Intl.DateTimeFormat('en-GB',{timeZone:S.ZONE,hour:'2-digit',hourCycle:'h23'});
 const clock=ms=>clockFormat.format(ms),date=ms=>dateFormat.format(ms);
 const duration=v=>`${Math.max(1,Math.round(v.duration/60))} min`,elapsedLabel=seconds=>{const mins=Math.floor(Math.max(0,seconds)/60);if(mins===0)return `${Math.floor(Math.max(0,seconds))} sec`;return mins>=60?`${Math.floor(mins/60)}h ${mins%60}m`:`${mins} min`;};
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='rewind-guide-state')return;context=e.data;if(cat)render();});
 function currentChannel(){return cat.channels.find(c=>c.key===$('#channel').value)||cat.channels[0];}
 function guideState(c){
  if(context?.key===c.key)return context;
  if(c.mode==='shuffle')return{mode:'shuffle',current:null,next:[],isWatching:false};
  const index=cat.channels.indexOf(c),now=S.current(plan,index);return{mode:'scheduled',current:now.slot,next:plan.schedules[index].slice(now.index+1),elapsed:now.offset,isWatching:false,paused:false,playbackMode:'live'};
 }
 function displayTitle(v){const parts=v.title.split('|').map(p=>p.trim()).filter((p,i)=>i===0||!/(full.{0,12}episodes?|wildbrain|treehouse|cartoons? for|official|^hd$)/i.test(p));let title=parts.join(' · ').replace(/\s*[—-]\s*Full Episode[s]?\s*$/i,'').trim();const prefix=(v.series||'')+' - ';if(v.series&&title.toLowerCase().startsWith(prefix.toLowerCase()))title=title.slice(prefix.length);return title||v.title;}
 function row(slot,label,sub=''){
  const article=document.createElement('article'),when=document.createElement('div'),text=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');article.className='programme-row';when.className='programme-time';when.textContent=label;title.textContent=displayTitle(slot.video);meta.textContent=[slot.video.series,slot.video.yearLabel||slot.video.year,duration(slot.video),slot.video.formatLabel,slot.video.sourceProvenance?'Fan/archive upload':'',sub].filter(Boolean).join(' · ');text.append(title,meta);article.append(when,text);return article;
 }
 function render(){
  const c=currentChannel(),i=cat.channels.indexOf(c),state=guideState(c),shuffle=c.mode==='shuffle';$('#station-mark').src=c.logo;$('#station-mark').alt=c.name+' logo';$('#station-name').textContent=c.name;$('#channel-number').textContent=`CHANNEL ${String(i+1).padStart(2,'0')} · ${shuffle?'SHUFFLE':'WEEKLY SCHEDULE'}`;
  $('#guide-explanation').textContent=shuffle?'This channel shuffles. “Up next” shows the current queue, not a fixed timetable.':state.isWatching?'You’re watching this channel. Here’s what’s playing and what comes next.':'This channel follows a weekly timetable. All times shown are local to Gibraltar.';
  const current=state.current;
  if(current){const v=current.video,total=Math.max(1,v.duration),seconds=Math.max(0,Math.min(total,state.elapsed||0));$('#now-label').textContent=state.paused?'PAUSED':state.playbackMode==='ondemand'?'ON DEMAND':state.playbackMode==='replay'?'WATCHING A REPLAY':'ON NOW';$('#now-title').textContent=v.kind==='advert'?'Advert break':displayTitle(v);$('#now-series').textContent=v.kind==='advert'?'A short break between programmes':v.series||'';$('#now-meta').textContent=[v.yearLabel||v.year,duration(v),v.kind==='film'?'Full film':'',v.formatLabel,v.sourceProvenance?'Fan/archive upload':''].filter(Boolean).join(' · ');$('#now-timing').textContent=shuffle||state.playbackMode!=='live'?'':`${clock(current.start)} – ${clock(current.end)}`;$('#programme-progress').hidden=false;$('#programme-progress').value=seconds/total*100;$('#elapsed').textContent=elapsedLabel(seconds)+' played';$('#remaining').textContent=elapsedLabel(Math.ceil(total-seconds))+' left';}
  else{$('#now-label').textContent='SHUFFLE CHANNEL';$('#now-title').textContent='Open this channel on the TV to see what’s playing.';$('#now-series').textContent='';$('#now-meta').textContent=`${c.videos.length} uploads in this rotation`;$('#now-timing').textContent='';$('#programme-progress').hidden=true;$('#elapsed').textContent='';$('#remaining').textContent='';}
  const next=(state.next||[]).filter(s=>!s.advert&&s.video.kind!=='advert').slice(0,8);$('#upcoming').replaceChildren();$('#next-heading').textContent='UP NEXT';$('#next-note').textContent=shuffle?'Current shuffle queue':'On this channel';
  if(next.length){for(const [n,slot]of next.entries()){$('#upcoming').append(row(slot,shuffle||state.playbackMode!=='live'?(n===0?'NEXT':'THEN'):clock(slot.start)));}}
  else if(shuffle&&!embedded){$('#next-heading').textContent='IN THIS CHANNEL’S COLLECTION';$('#next-note').textContent='Open the TV popup for the live order';for(const v of c.videos.slice(0,8))$('#upcoming').append(row({video:v},'IN ROTATION'));}
  else{const empty=document.createElement('p');empty.textContent=current?'A new rotation follows this programme.':'Switch to this channel on the TV, then open its schedule.';$('#upcoming').append(empty);}
  $('#weekly-browser').hidden=shuffle;if(!shuffle&&$('#weekly-browser').open)renderWeek(c);
 }
 function renderWeek(c){const index=cat.channels.indexOf(c),selectedDate=$('#day').value,period=Number($('#period').value);const rows=plan.schedules[index].filter(r=>!r.advert&&date(r.start)===selectedDate&&Number(hourFormat.format(r.start))>=period);$('#rows').replaceChildren();for(const slot of rows.slice(0,limit))$('#rows').append(row(slot,clock(slot.start)));$('#count').textContent=`${rows.length} programmes on this day`;$('#more').hidden=limit>=rows.length;}
 try{
  const {loadLibrary}=await import('./library.mjs?v=light1');cat=await loadLibrary();cat.channels=cat.channels.map(c=>({...c,videos:c.videos.filter(v=>v.enabled!==false)})).filter(c=>c.videos.length);plan=S.build(cat);let key=guideParams.get('channel');if(!key)try{key=JSON.parse(localStorage.getItem('rewind-tv-v2')||'{}').key;}catch{}
  cat.channels.forEach((c,i)=>$('#channel').add(new Option(`${String(i+1).padStart(2,'0')} / ${c.name}`,c.key)));$('#channel').value=cat.channels.some(c=>c.key===key)?key:cat.channels[0].key;
  const days=[...new Set(Array.from({length:170},(_,i)=>plan.week.start+i*3600000).filter(t=>t<plan.week.end).map(date))];for(const d of days)$('#day').add(new Option(new Intl.DateTimeFormat('en-GB',{timeZone:S.ZONE,weekday:'long',day:'numeric',month:'short'}).format(Date.parse(d+'T12:00:00Z')),d));$('#day').value=date(Date.now());$('#week').textContent='Week of '+plan.week.key+' · refreshed every Tuesday.';
  $('#weekly-browser').ontoggle=()=>{if($('#weekly-browser').open&&currentChannel().mode!=='shuffle')renderWeek(currentChannel());};
  $('#channel').onchange=()=>{limit=40;render();if(embedded)parent.postMessage({type:'rewind-guide-select',key:currentChannel().key},location.origin);};for(const id of ['day','period'])$('#'+id).onchange=()=>{limit=40;renderWeek(currentChannel());};$('#more').onclick=()=>{limit+=40;renderWeek(currentChannel());};render();setInterval(()=>{if(!context||!embedded)render();},15000);
  if(embedded)parent.postMessage({type:'rewind-guide-ready',key:currentChannel().key},location.origin);
 }catch(e){$('#station-name').textContent='The guide could not load.';$('#now-title').textContent='Refresh the TV and try again.';console.error(e);}
})();
