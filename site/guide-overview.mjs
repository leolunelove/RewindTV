import {programmeTitle} from './programme-info.mjs?v=liquid1';
import {CHANNEL_SECTIONS} from './channel-sections.mjs?v=liquid1';
import {normalise} from './show-library.mjs?v=archive2';

export function createGuideOverview(root,{getChannels,getCurrent,getCurrentLabel=()=> 'This channel',getNow,getRows,onDetail,onWatch,onStart}) {
  const doc=root.ownerDocument;
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Gibraltar',hour:'2-digit',minute:'2-digit'});
  const win=doc.defaultView,scroller=root.parentElement||root;
  let scrollTop=scroller.scrollTop||0;
  let query='';
  let genre='all';
  let mode='all';
  let expanded=null;
  let stamp='';

  function el(tag,text='',className='') {
    const node=doc.createElement(tag);
    node.textContent=text;
    if(className)node.className=className;
    return node;
  }

  function button(text,action,className='') {
    const node=el('button',text,className);
    node.type='button';
    node.onclick=action;
    return node;
  }

  function select(label,options,action,className) {
    const node=el('select','',className);
    node.setAttribute('aria-label',label);
    for(const [value,text] of options) {
      const option=el('option',text);
      option.value=value;
      node.append(option);
    }
    node.value='all';
    node.onchange=()=>{action(node.value);render(true);};
    return node;
  }

  function programmeLabel(video) {
    if(!video)return 'Programme information unavailable';
    const title=programmeTitle(video);
    return video.series&&video.series!==title?`${video.series} · ${title}`:title;
  }

  function timeRange(slot) {
    if(!Number.isFinite(slot?.start))return '';
    const start=clock.format(slot.start);
    return Number.isFinite(slot.end)?`${start}–${clock.format(slot.end)}`:start;
  }

  function channelKey(channel,index) {
    return channel.key||String(index);
  }

  const tools=el('div','','overview-tools');
  const search=el('input','','guide-search');
  search.type='search';
  search.placeholder='Find a channel or programme';
  search.setAttribute('aria-label','Find a channel or programme');
  search.oninput=()=>{query=search.value;render(true);};
  const genres=CHANNEL_SECTIONS.filter(section=>getChannels().some(channel=>section.keys.includes(channel.key)));
  const genreFilter=select('Browse channel genre',[['all','All genres'],...genres.map(section=>[section.name,section.name])],value=>{genre=value;},'guide-genre-filter');
  const modeFilter=select('Channel schedule type',[['all','All channels'],['fixed','Scheduled'],['shuffle','Mixes']],value=>{mode=value;},'guide-mode-filter');
  tools.append(search,genreFilter,modeFilter,button('On my channel',showCurrent,'guide-current'));
  const count=el('p','','guide-overview-count');
  count.setAttribute('aria-live','polite');
  const list=el('div','','guide-overview-list');
  root.replaceChildren(tools,count,list);
  scroller.addEventListener?.('scroll',()=>{if(Array.from(root.children).includes(list))scrollTop=scroller.scrollTop;},{passive:true});

  function programme(slot,label,className) {
    const node=el('div','',`guide-programme ${className}`);
    node.append(el('span',label,'guide-programme-label'),el('strong',programmeLabel(slot?.video),'guide-programme-title'));
    const time=timeRange(slot);
    if(time)node.append(el('span',time,'guide-programme-time'));
    return node;
  }

  function render(force=false) {
    if(Array.from(root.children).includes(list))scrollTop=scroller.scrollTop;
    else {
      root.replaceChildren(tools,count,list);
      force=true;
    }
    const channels=getChannels();
    const now=Date.now();
    const entries=channels.map((channel,index)=>{
      const current=getNow(index);
      const next=current?getRows(index).slice(current.index+1).find(slot=>slot.video.kind!=='advert'):null;
      return {channel,index,key:channelKey(channel,index),current,next};
    });
    const signature=JSON.stringify([entries.map(entry=>[entry.key,entry.current?.slot.video.id,entry.current?.slot.video.title,entry.current?.slot.start,entry.current?.slot.end,entry.next?.video.id,entry.next?.video.title,entry.next?.start,entry.next?.end]),getCurrent(),getCurrentLabel(),Math.floor(now/60000),query,genre,mode,expanded]);
    if(!force&&stamp===signature)return;
    stamp=signature;
    search.value=query;
    genreFilter.value=genre;
    modeFilter.value=mode;
    const term=normalise(query);
    const section=CHANNEL_SECTIONS.find(section=>section.name===genre);
    const filtered=entries.filter(({channel,index,current})=>
      (genre==='all'||section?.keys.includes(channel.key))&&
      (mode==='all'||(mode==='shuffle'?channel.mode==='shuffle':channel.mode!=='shuffle'))&&
      (!term||normalise([channel.number??index+1,channel.name,current?.slot.video.series,current?.slot.video.title,programmeLabel(current?.slot.video)].join(' ')).includes(term))
    );
    const countLabel=`${filtered.length} ${filtered.length===1?'channel':'channels'}`;
    if(count.textContent!==countLabel)count.textContent=countLabel;
    const active=doc.activeElement?.dataset;
    list.replaceChildren();
    for(const entry of filtered) {
      const {channel,index,key,current,next}=entry;
      const slot=current?.slot;
      const open=expanded===key;
      const row=el('article','','guide-overview-row');
      row.dataset.channelKey=key;
      if(index===getCurrent())row.classList.add('current-channel');
      if(open)row.classList.add('is-expanded');
      const detail=button('',()=>{expanded=open?null:key;render(true);},'guide-overview-detail');
      detail.dataset.guideChannel=key;
      detail.dataset.guideAction='expand';
      detail.setAttribute('aria-label',`Show programmes on ${channel.name}`);
      detail.setAttribute('aria-expanded',String(open));
      detail.setAttribute('aria-controls',`guide-programmes-${key}`);
      const remaining=Number.isFinite(slot?.end)?Math.max(0,Math.ceil((slot.end-now)/60000)):null;
      detail.append(
        el('span',String(channel.number??index+1).padStart(2,'0'),'guide-number'),
        el('strong',channel.name,'guide-channel-name'),
        el('span',programmeLabel(slot?.video),'guide-current-programme'),
        el('small',[index===getCurrent()?getCurrentLabel():channel.mode==='shuffle'?'Mix':'Live',remaining!==null?`${remaining} min left`:''].filter(Boolean).join(' · '),'guide-row-meta'),
        el('span',open?'−':'+','guide-expand-mark')
      );
      const progress=el('progress','','guide-progress');
      progress.max=100;
      progress.value=slot&&slot.end>slot.start?Math.max(0,Math.min(100,(now-slot.start)/(slot.end-slot.start)*100)):0;
      progress.setAttribute('aria-label',`${channel.name} programme progress`);
      detail.append(progress);
      row.append(detail);
      if(open) {
        const content=el('div','','guide-overview-expanded');
        content.id=`guide-programmes-${key}`;
        const programmes=el('div','','guide-programmes');
        programmes.append(programme(slot,'Now','guide-now'));
        if(next)programmes.append(programme(next,'Next','guide-next'));
        else programmes.append(el('p','The next programme will appear when the schedule updates.','guide-next-empty'));
        const actions=el('div','','guide-actions');
        const watch=button('Watch live',()=>onWatch(index),'guide-watch');
        watch.setAttribute('aria-label',`Watch ${channel.name} live`);
        const start=button('From start',()=>onStart?.(index,slot.video),'guide-start');
        start.disabled=!onStart||!slot||slot.video.kind==='advert';
        start.setAttribute('aria-label',`Watch ${programmeLabel(slot?.video)} from the start`);
        const schedule=button('Full schedule',()=>onDetail(index),'guide-full-schedule');
        schedule.setAttribute('aria-label',`Full schedule for ${channel.name}`);
        for(const [action,node] of [['watch',watch],['start',start],['schedule',schedule]]) {
          node.dataset.guideChannel=key;
          node.dataset.guideAction=action;
          actions.append(node);
        }
        content.append(programmes,actions);
        row.append(content);
      }
      list.append(row);
    }
    if(!filtered.length)list.append(el('p','No channels match. Try another title or clear the filters.','guide-empty'),button('Clear filters',()=>{query='';genre='all';mode='all';render(true);}));
    if(active?.guideChannel) {
      [...list.querySelectorAll('button')].find(node=>node.dataset.guideChannel===active.guideChannel&&node.dataset.guideAction===active.guideAction)?.focus({preventScroll:true});
    }
    scroller.scrollTop=scrollTop;
  }

  function showCurrent() {
    query='';
    genre='all';
    mode='all';
    const channel=getChannels()[getCurrent()];
    expanded=channel?channelKey(channel,getCurrent()):null;
    render(true);
    const reveal=()=>{
      if(root.closest?.('[data-tv-page]')?.hidden)return;
      const row=[...list.querySelectorAll('button')].find(node=>node.dataset.guideChannel===expanded&&node.dataset.guideAction==='expand');
      row?.focus({preventScroll:true});
      row?.scrollIntoView?.({block:'center',behavior:win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    };
    if(win?.requestAnimationFrame)win.requestAnimationFrame(reveal);else reveal();
  }

  return {render,showCurrent};
}
