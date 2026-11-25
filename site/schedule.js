(function (scope) {
  'use strict';
  const ZONE = 'Europe/Gibraltar';
  const dateParts = new Intl.DateTimeFormat('en-GB', {timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const parts = ms => Object.fromEntries(dateParts.formatToParts(new Date(ms)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  function midnight(y,m,d) {
    const target=Date.UTC(y,m-1,d); let guess=target;
    for(let i=0;i<3;i++){const p=parts(guess);guess+=target-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);}
    return guess;
  }
  function weekAt(now=Date.now()) {
    const p=parts(now),calendar=new Date(Date.UTC(p.year,p.month-1,p.day));
    calendar.setUTCDate(calendar.getUTCDate()-(calendar.getUTCDay()+5)%7);
    const y=calendar.getUTCFullYear(),m=calendar.getUTCMonth()+1,d=calendar.getUTCDate();
    const next=new Date(Date.UTC(y,m-1,d+7));
    return {key:calendar.toISOString().slice(0,10),start:midnight(y,m,d),end:midnight(next.getUTCFullYear(),next.getUTCMonth()+1,next.getUTCDate())};
  }
  function dayAt(now=Date.now()){
    const p=parts(now),next=new Date(Date.UTC(p.year,p.month-1,p.day+1));
    return {key:new Date(Date.UTC(p.year,p.month-1,p.day)).toISOString().slice(0,10),start:midnight(p.year,p.month,p.day),end:midnight(next.getUTCFullYear(),next.getUTCMonth()+1,next.getUTCDate())};
  }
  function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
  function rng(seed){let a=seed;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function shuffle(a,random){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
  function mixedDeck(videos,random,lastSeries,blockSize=2){
    const groups=new Map();for(const v of shuffle(videos,random)){const key=v.series||v.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(v);}
    const result=[];let last=lastSeries;
    while(groups.size){const keys=shuffle([...groups.keys()],random);if(keys.length>1&&keys[0]===last)[keys[0],keys[1]]=[keys[1],keys[0]];
      for(const key of keys){const pool=groups.get(key);for(let n=0;n<blockSize&&pool.length;n++)result.push(pool.shift());last=key;if(!pool.length)groups.delete(key);}}
    return result;
  }
  function isTuesday(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value&&date.getUTCDay()===2;
  }
  // Additions and retirements can change the Library before the fixed timetable.
  function availableThisWeek(video,key){
    const from=video.scheduleFromWeek,until=video.scheduleUntilWeek;
    if(video.enabled===false&&(!isTuesday(until)||until<=key))return false;
    return from===undefined||isTuesday(from)&&from<=key;
  }
  function seasonalRows(channel,week,random,ads){
    const byId=new Map(channel.videos.filter(v=>v.enabled!==false&&availableThisWeek(v,week.key)).map(v=>[v.id,v]));
    const pool=channel.programming.entries.filter(entry=>byId.has(entry.id));
    if(!pool.length)return [];
    const shuffled=shuffle(pool,random),rank=new Map(shuffled.map((entry,index)=>[entry.id,index]));
    const lastPlayed=new Map(),rows=[];let at=week.start,lastSeries='',adIndex=0;
    const breakDeck=shuffle(ads.filter(v=>v.family&&v.kind==='advert'&&v.duration<=90),random);
    const append=(video,advert=false)=>{const start=at;at+=Math.max(1,Math.round(video.duration))*1000;rows.push({video,start,end:at,advert});};
    while(at<week.end){
      const hour=parts(at).hour,slot=hour<6||hour>=23?'late':hour<9?'morning':hour<15?'daytime':hour<18?'afternoon':hour<20?'evening':'feature';
      // Consume every distinct story before repeating. Prefer the daypart only
      // among equally fresh choices, so a tiny breakfast pool cannot loop.
      const never=pool.filter(entry=>!lastPlayed.has(entry.id));
      let candidates=never.length?never:pool.filter(entry=>at-lastPlayed.get(entry.id)>=86400000);
      if(!candidates.length){const oldest=Math.min(...pool.map(entry=>lastPlayed.get(entry.id)));candidates=pool.filter(entry=>lastPlayed.get(entry.id)===oldest);}
      candidates.sort((a,b)=>Number(!a.slots.includes(slot))-Number(!b.slots.includes(slot))
       ||Number(byId.get(a.id).series===lastSeries)-Number(byId.get(b.id).series===lastSeries)
       ||(lastPlayed.get(a.id)||0)-(lastPlayed.get(b.id)||0)||rank.get(a.id)-rank.get(b.id));
      const selected=candidates[0],video=byId.get(selected.id);append(video);lastPlayed.set(selected.id,at);lastSeries=video.series;
      // Complete programmes only; no adverts inside a film, episode or story run.
      if(channel.adverts!==false&&breakDeck.length&&at<week.end)append(breakDeck[adIndex++%breakDeck.length],true);
    }
    return rows;
  }
  function build(catalogue,now=Date.now()) {
    const week=weekAt(now),ads=(catalogue.adverts||catalogue.channels.find(c=>c.key==='adverts')?.videos||[]).filter(v=>v.enabled!==false);
    const schedules=catalogue.channels.map(ch=>{
      if(ch.mode==='shuffle')return [];
      const random=rng(hash(catalogue.version+week.key+ch.key)),rows=[];
      if(ch.programming?.type==='seasonal')return seasonalRows(ch,week,random,ads);
      const available=ch.videos.filter(v=>availableThisWeek(v,week.key));
      let at=week.start,last='',count=0,lastAd='',lastSeries='',adDeck=[],sinceBreak=0;
      const append=(video,advert=false)=>{const duration=Math.max(1,Math.round(video.duration));rows.push({video,start:at,end:at+duration*1000,advert});at+=duration*1000;};
      while(at<week.end){
        const deck=mixedDeck(available,random,lastSeries,ch.number===10?1:2);
        if(!deck.length)break;
        if(deck.length>1&&deck[0].id===last)[deck[0],deck[1]]=[deck[1],deck[0]];
        for(const video of deck){
          if(at>=week.end)break;
          append(video,video.kind==='advert');last=video.id;lastSeries=video.series||video.id;count++;
          sinceBreak+=video.duration;
          // One short advert between complete episodes. Short web videos wait
          // for at least fifteen minutes of content before a break.
          if(ch.mode!=='shuffle'&&video.kind!=='advert'&&(video.kind==='full episode'||sinceBreak>=900)){
            if(!adDeck.length){adDeck=shuffle(ads.filter(a=>a.family&&a.kind==='advert'),random);if(adDeck.length>1&&adDeck[0].id===lastAd)[adDeck[0],adDeck[1]]=[adDeck[1],adDeck[0]];}
            const ad=adDeck.shift();if(ad&&at<week.end){append(ad,true);lastAd=ad.id;sinceBreak=0;}
          }
        }
      }
      return rows;
    });
    return {week,schedules};
  }
  function buildLineup(catalogue,now=Date.now()){
    const {week,schedules}=build(catalogue,now),channels=[],activeSchedules=[];
    catalogue.channels.forEach((channel,index)=>{
      const rows=schedules[index],videos=channel.videos.filter(video=>video.enabled!==false);
      if(channel.mode==='shuffle'?!videos.length:!rows.length)return;
      channels.push({...channel,videos});
      activeSchedules.push(rows);
    });
    return {catalogue:{...catalogue,channels},plan:{week,schedules:activeSchedules}};
  }
  function locate(rows,now) {
    let low=0,high=rows.length-1;
    while(low<high){const mid=(low+high+1)>>1;if(rows[mid].start<=now)low=mid;else high=mid-1;}
    return low;
  }
  function current(plan,channel,now=Date.now()) {
    const rows=plan.schedules[channel],index=locate(rows,now),slot=rows[index];
    return {index,slot,offset:Math.max(0,Math.min((slot.end-slot.start)/1000-0.1,(now-slot.start)/1000)),next:rows[index+1]||null};
  }
  const api={ZONE,weekAt,dayAt,build,buildLineup,current,locate};
  if(typeof module==='object'&&module.exports)module.exports=api;else scope.RewindSchedule=api;
})(typeof globalThis!=='undefined'?globalThis:this);
