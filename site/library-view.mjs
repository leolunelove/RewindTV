import {showListings} from './show-listings.mjs?v=vault1';
import {buildShowIndex,normalise} from './show-library.mjs?v=20261112';
import {programmeTitle} from './programme-info.mjs?v=liquid1';
import {browseTitles} from './browse-tools.mjs?v=archive2';
import {movieArtwork} from './movie-night.mjs?v=liquid1';
import {orderLibrary,createLibrarySeed} from './library-order.mjs?v=room1';
import {createContinueWatching,resumeTime} from './continue-watching.mjs?v=continue1';

export function filterTitles(shows,query='',kind='all') {
  return browseTitles(shows,{query,kind});
}

export function createLibraryView(root,{catalogue,onPlay,onMovies,getContinueWatching=()=>[],onResume,onRemoveContinue}) {
  const shows=buildShowIndex(catalogue,showListings);
  const doc=root.ownerDocument;
  const win=doc.defaultView;
  const titleStates=new Map();
  const continuation=createContinueWatching(doc,{getItems:getContinueWatching,onResume:typeof onResume==='function'?resume:undefined,onRemove:onRemoveContinue,kind:'programmes',scroller:root,getAnchor:()=>root.querySelector('.library-grid'),getFallbackFocus:()=>root.querySelector('.library-search')});
  let detailResume=null,detailStart=null;
  const initialFilters=()=>({query:'',kind:'programmes',letter:'all',channel:'all',language:'all'});
  const storageKey='rewind-library-browse-v1';
  let saved={};
  try {
    const value=JSON.parse(win?.localStorage?.getItem(storageKey)||'null');
    if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;
  }catch{}
  let filters=initialFilters();
  if(saved.filters&&typeof saved.filters==='object') {
    const previous=saved.filters;
    if(typeof previous.query==='string')filters.query=previous.query.slice(0,300);
    if(['programmes','show','film','all','collection','listed'].includes(previous.kind))filters.kind=previous.kind;
    if(['all','#','other',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].includes(previous.letter))filters.letter=previous.letter;
    if(catalogue.channels.some(channel=>channel.key===previous.channel))filters.channel=previous.channel;
    if(previous.language==='all'||shows.some(show=>show.language===previous.language)||previous.language==='English')filters.language=previous.language;
  }
  let order=saved.order==='az'?'az':'mix';
  let seed=typeof saved.seed==='string'&&saved.seed.length<=80?saved.seed:createLibrarySeed();
  let mixedAgain=saved.mixedAgain===true;
  if(order!=='az')filters.letter='all';
  let selected=null;
  let lastKey=null;
  let filtersOpen=saved.filtersOpen===true;
  const position=value=>({scroll:Number.isFinite(value?.scroll)?Math.max(0,value.scroll):0,anchor:value?.anchor&&typeof value.anchor.key==='string'&&Number.isFinite(value.anchor.offset)?value.anchor:null});
  let indexPosition=position(saved.indexPosition);
  let persistTimer=0;
  if(saved.titles&&typeof saved.titles==='object') {
    for(const show of shows) {
      const state=saved.titles[show.key];
      if(state&&typeof state==='object')titleStates.set(show.key,{query:typeof state.query==='string'?state.query.slice(0,300):'',season:typeof state.season==='string'?state.season:'all',...position(state)});
    }
  }

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

  function length(video) {
    return video.duration>=3600
      ? `${Math.floor(video.duration/3600)}h ${Math.round(video.duration%3600/60)}m`
      : `${Math.round(video.duration/60)} min`;
  }

  function select(label,options,value,change,className='') {
    const node=el('select','',className);
    node.setAttribute('aria-label',label);
    for(const [value,text] of options) {
      const option=el('option',text);
      option.value=value;
      node.append(option);
    }
    node.value=value;
    node.onchange=()=>change(node.value);
    return node;
  }

  function sourceLink(video,className='library-source') {
    if(!/^https?:\/\//.test(video?.watchUrl||''))return null;
    const link=el('a','Source ↗',className);
    link.href=video.watchUrl;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.setAttribute('aria-label',`Open original source for ${programmeTitle(video)}`);
    return link;
  }

  function artwork(show,className='library-cover rwd-cover') {
    const frame=el('span','',className);
    const video=show.episodes[0];
    const url=video?.thumbnail||video?.thumbnailUrl||(video&&movieArtwork(video));
    if(url) {
      const image=el('img');
      image.src=url;
      image.alt='';
      image.loading='lazy';
      image.decoding='async';
      image.onerror=()=>{image.remove();frame.classList.add('is-unavailable');};
      frame.append(image);
    }else {
      frame.classList.add('is-empty');
      frame.append(el('span',show.episodes.length?'No artwork':show.kind==='collection'?'Collection':'Listed title','library-cover-label'));
    }
    return frame;
  }

  function resume(record){
    if(typeof onResume!=='function')return;
    saveScroll();persist(true);onResume(record);
  }

  function refreshContinueWatching(){
    if(selected){
      if(!detailResume)return;
      const record=getContinueWatching().find(record=>record.key===selected.key);
      detailResume.hidden=!record;if(detailStart)detailStart.className=record?'':'primary';
      if(record){detailResume.textContent=`Resume · ${resumeTime(record.position)}`;detailResume.setAttribute('aria-label',`Resume ${programmeTitle(record.video)} at ${resumeTime(record.position)}`);detailResume.onclick=()=>resume(getContinueWatching().find(item=>item.key===selected.key)||record);}
    }else continuation.refresh();
  }

  function play(video) {
    saveScroll();
    persist(true);
    const channel=catalogue.channels.find(channel=>channel.key===filters.channel);
    onPlay(channel?.videos.some(item=>item.id===video.id)?{...video,channelKey:channel.key}:video);
  }

  function titleState(key) {
    if(!titleStates.has(key))titleStates.set(key,{query:'',season:'all',scroll:0,anchor:null});
    return titleStates.get(key);
  }

  function captureAnchor() {
    if(!root.getBoundingClientRect)return null;
    const top=root.getBoundingClientRect().top;
    const selector=selected?'.episode-item':'.library-title';
    for(const node of root.querySelectorAll(selector)) {
      const bounds=node.getBoundingClientRect();
      if(bounds.bottom>top)return {key:selected?node.dataset.episodeId:node.dataset.showKey,offset:bounds.top-top};
    }
    return null;
  }

  function saveScroll(capture=true) {
    if(root.getClientRects&&!root.getClientRects().length)return;
    const state=selected?titleState(selected.key):indexPosition;
    state.scroll=root.scrollTop;
    if(capture)state.anchor=captureAnchor();
    persist();
  }

  function restorePosition(state) {
    root.scrollTop=state.scroll;
    if(!state.scroll||!state.anchor||!root.getBoundingClientRect)return;
    const selector=selected?'.episode-item':'.library-title';
    const node=[...root.querySelectorAll(selector)].find(node=>(selected?node.dataset.episodeId:node.dataset.showKey)===state.anchor.key);
    if(node)root.scrollTop=Math.max(0,root.scrollTop+node.getBoundingClientRect().top-root.getBoundingClientRect().top-state.anchor.offset);
  }

  function persist(immediate=false) {
    const write=()=>{
      persistTimer=0;
      const state=selected?titleState(selected.key):indexPosition;
      if(!root.getClientRects||root.getClientRects().length) {
        state.scroll=root.scrollTop;
        state.anchor=captureAnchor();
      }
      try {win?.localStorage?.setItem(storageKey,JSON.stringify({version:1,filters,order,seed,mixedAgain,filtersOpen,indexPosition,titles:Object.fromEntries(titleStates)}));}catch{}
    };
    if(persistTimer)win.clearTimeout(persistTimer);
    if(immediate||!win?.setTimeout)write();
    else persistTimer=win.setTimeout(write,200);
  }

  function collectionControl() {
    const group=el('div','','library-segmented');
    group.setAttribute('role','radiogroup');
    group.setAttribute('aria-label','Library collection');
    for(const [value,text] of [['programmes','Shows'],['film','Films']]) {
      const label=el('label');
      const input=el('input');
      input.type='radio';
      input.name='library-collection';
      input.value=value;
      input.checked=value==='film'?filters.kind==='film':filters.kind!=='film';
      input.onchange=()=>{if(input.checked)setKind(value,{notify:true});};
      label.append(input,el('span',text));
      group.append(label);
    }
    return group;
  }

  function resetFilters() {
    filters=initialFilters();
    indexPosition={scroll:0,anchor:null};
    renderIndex();
  }

  function renderIndex(restore=false) {
    selected=null;detailResume=null;detailStart=null;
    root.replaceChildren();
    const tools=el('div','','library-tools library-browse-tools');
    const input=el('input','','library-search');
    input.type='search';
    input.placeholder='Find a title';
    input.setAttribute('aria-label','Find a show or film');
    input.value=filters.query;

    const advanced=el('details','','library-advanced');
    const summary=el('summary','Filters');
    const jumps=el('div','','browse-jumps');
    const changeFilter=(key,value)=>{filters[key]=value;indexPosition={scroll:0,anchor:null};draw();root.scrollTop=0;persist();};
    const alphabet=select('A–Z index',[['all','All A–Z'],['#','0–9'],...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter=>[letter,letter]),['other','中文 / Other']],filters.letter,value=>changeFilter('letter',value),'library-alphabet');
    jumps.append(
      alphabet,
      select('Browse by channel',[['all','All channels'],...catalogue.channels.map(channel=>[channel.key,channel.name])],filters.channel,value=>changeFilter('channel',value)),
      select('Audio language',[['all','All languages'],...[...new Set(['English',...shows.map(show=>show.language).filter(Boolean)])].map(language=>[language,language])],filters.language,value=>changeFilter('language',value)),
      select('More title types',[['programmes','All shows & videos'],['show','TV episodes'],['collection','Collections'],['listed','Listed only'],['all','All titles'],['film','Films']],filters.kind,value=>setKind(value,{notify:value==='film'}))
    );
    advanced.open=filtersOpen;
    advanced.ontoggle=()=>{filtersOpen=advanced.open;persist();};
    advanced.append(summary,jumps);

    const count=el('p','','library-count');
    count.setAttribute('aria-live','polite');
    const reset=button('Clear filters',resetFilters,'library-clear');
    const resultHead=el('div','','library-result-head library-collection-bar');
    const ordering=el('div','','library-order-controls');
    const orderSelect=select('Library order',[['mix','Mixed'],['az','A–Z']],order,value=>{
      order=value;
      if(order!=='az')filters.letter='all';
      alphabet.value=filters.letter;indexPosition={scroll:0,anchor:null};draw();root.scrollTop=0;persist();
    },'library-order');
    const mix=button(mixedAgain?'Mix again':'Mix Library',()=>{
      seed=createLibrarySeed(seed);mixedAgain=true;order='mix';filters.letter='all';
      alphabet.value='all';orderSelect.value=order;indexPosition={scroll:0,anchor:null};
      draw();root.scrollTop=0;persist(true);
    },'library-mix');
    ordering.append(orderSelect,mix);
    const grid=el('div','','library-grid rwd-library-grid');
    resultHead.append(collectionControl(),count);
    tools.append(input,ordering,advanced,reset);
    continuation.refresh();
    root.append(resultHead,tools,continuation.element,grid);

    function draw() {
      const candidates=filters.kind==='show'||filters.kind==='film'?shows.filter(show=>show.episodes.length):shows;
      const results=orderLibrary(browseTitles(candidates,filters),{mode:order,seed});
      alphabet.hidden=order!=='az';
      mix.textContent=mixedAgain?'Mix again':'Mix Library';
      count.textContent=`${results.length} ${results.length===1?'title':'titles'}`;
      const active=['letter','channel','language'].filter(key=>filters[key]!=='all').length+(filters.kind==='programmes'||filters.kind==='film'?0:1);
      summary.textContent=active?`Filters · ${active} active`:'Filters';
      reset.hidden=!active&&!filters.query;
      grid.replaceChildren();
      for(const show of results) {
        const card=button('',()=>openDetail(show.key),'library-title rwd-title-card');
        card.dataset.showKey=show.key;
        card.setAttribute('aria-label',`Browse ${show.title}${show.language?' · '+show.language:''}`);
        const copy=el('span','','library-card-copy');
        const description=!show.episodes.length?'Listed only':show.kind==='film'?length(show.episodes[0]):`${show.episodes.length} ${show.kind==='show'?(show.episodes.length===1?'episode':'episodes'):(show.episodes.length===1?'video':'videos')}`;
        copy.append(el('strong',show.title),el('small',[description,show.language].filter(Boolean).join(' · ')));
        card.append(artwork(show),copy);
        grid.append(card);
      }
      if(!results.length)grid.append(el('p','Nothing matches that title. Try another name or change a filter.','library-empty'),button('Reset filters',resetFilters));
    }
    input.oninput=()=>{filters.query=input.value;indexPosition={scroll:0,anchor:null};draw();root.scrollTop=0;persist();};
    draw();
    if(restore)restorePosition(indexPosition);
    else root.scrollTop=0;
    persist();
    if(restore)[...grid.children].find(card=>card.dataset.showKey===lastKey)?.focus({preventScroll:true});
  }

  function openDetail(key,history=true) {
    const show=shows.find(show=>show.key===key);
    if(!show)return;
    saveScroll();
    selected=show;
    lastKey=key;
    if(history&&win?.location.hash==='#library'&&win.history.state?.detail!==key) {
      win.history.pushState({...win.history.state,rewind:true,detail:key},'','#library');
    }
    drawDetail();
    root.querySelector('.library-back')?.focus({preventScroll:true});
  }

  function back() {
    saveScroll();
    if(selected&&win?.location.hash==='#library'&&win.history.state?.detail===selected.key) {
      win.history.back();
      return;
    }
    renderIndex(true);
  }

  function drawDetail() {
    const show=selected;detailResume=null;detailStart=null;
    const state=titleState(show.key);
    root.replaceChildren();
    root.append(button('← Back to results',back,'text-button library-back'));
    const head=el('div','','library-detail-head');
    if(show.episodes.length)head.append(artwork(show,'library-cover library-detail-hero rwd-cover rwd-detail-hero'));
    const copy=el('div','','library-detail-copy');
    copy.append(el('h3',show.title));
    if(show.episodes.length) {
      const unit=show.kind==='film'?'film':show.kind==='show'?'episode':'video';
      const years=show.years.length
        ? show.years[0]===show.years.at(-1)?String(show.years[0]):`${show.years[0]}–${show.years.at(-1)}`
        : show.episodes[0].yearLabel||'';
      copy.append(el('p',[years,`${show.episodes.length} available ${unit}${show.episodes.length===1?'':'s'}`,show.language,show.channels.map(channel=>channel.name).join(', ')].filter(Boolean).join(' · '),'library-detail-meta'));
      const actions=el('div','','library-detail-actions');
      if(typeof onResume==='function'){detailResume=button('',()=>{},'primary library-resume');actions.append(detailResume);refreshContinueWatching();}
      detailStart=button(show.kind==='film'?'▶ Watch film':'▶ Watch from the beginning',()=>play(show.episodes[0]),typeof onResume==='function'&&getContinueWatching().some(record=>record.key===show.key)?'':'primary');actions.append(detailStart);
      const source=sourceLink(show.episodes[0]);
      if(source)actions.append(source);
      copy.append(actions);
    }else {
      copy.append(el('p',show.kind==='collection'?'External collection · Opens at the source.':'Listed only · Full programme unavailable here.','library-detail-meta'));
    }
    head.append(copy);
    root.append(head);
    if(show.listing) {
      const listing=show.listing;
      if(listing.description)copy.append(el('p',listing.description,'library-detail-description'));
      if(listing.links?.length) {
        const extras=el(show.episodes.length?'details':'div','','library-extras');
        extras.append(show.episodes.length?el('summary',`Extras and sources (${listing.links.length})`):el('h4',show.kind==='collection'?'From the archive':'Previews and sources'));
        for(const item of listing.links) {
          const link=el('a',item.label+' ↗');
          link.href=item.url;
          link.target='_blank';
          link.rel='noopener noreferrer';
          extras.append(link);
        }
        root.append(extras);
      }
    }
    if(!show.episodes.length) {
      restorePosition(state);
      return;
    }

    const controls=el('div','','library-episode-tools');
    const seasons=[...new Set(show.episodes.map(video=>video.seasonNumber).filter(season=>Number.isFinite(season)&&season>0))].sort((a,b)=>a-b);
    if(seasons.length) {
      const options=[['all','All seasons'],...seasons.map(season=>[String(season),`Season ${season}`])];
      if(show.episodes.some(video=>!video.seasonNumber))options.push(['unknown','Other episodes']);
      if(!options.some(([value])=>value===state.season))state.season='all';
      controls.append(select('Browse season',options,state.season,value=>{state.season=value;state.anchor=null;draw();saveScroll();},'library-season-filter'));
    }
    const search=el('input','','episode-search');
    search.type='search';
    search.placeholder='Find an episode';
    search.setAttribute('aria-label','Find an episode');
    search.value=state.query;
    search.hidden=show.episodes.length<=12;
    search.oninput=()=>{state.query=search.value;state.anchor=null;draw();saveScroll();};
    controls.append(search);
    const list=el('div','','episode-list rwd-episode-list');
    const count=el('p','','library-count library-episode-count');
    count.setAttribute('aria-live','polite');
    const episodeHead=el('div','','library-episode-heading');
    episodeHead.append(el('h4',show.kind==='show'?'Episodes':show.kind==='film'?'Film':'Videos'),controls);
    root.append(episodeHead,count,list);

    function draw() {
      const query=normalise(state.query);
      const eligible=show.episodes.filter(video=>(state.season==='all'||(state.season==='unknown'?!video.seasonNumber:String(video.seasonNumber)===state.season))&&(!query||normalise([video.title,video.seasonNumber&&`season ${video.seasonNumber}`,video.episodeNumber&&`episode ${video.episodeNumber}`].filter(Boolean).join(' ')).includes(query)));
      const unit=show.kind==='film'?'film':show.kind==='show'?'episode':'video';
      count.textContent=`${eligible.length} ${unit}${eligible.length===1?'':'s'}`;
      list.replaceChildren();
      if(!eligible.length)list.append(el('p','No episodes match. Try another name or season.','library-empty'));
      for(const video of eligible) {
        const item=el('div','','episode-item');
        item.dataset.episodeId=video.id;
        const row=button('',()=>play(video),'episode-row rwd-episode-row');
        row.setAttribute('aria-label',`Play ${video.title}`);
        const copy=el('span');
        copy.append(el('strong',programmeTitle(video)),el('small',[video.seasonNumber&&`Season ${video.seasonNumber}`,video.yearLabel||video.year,video.formatLabel,video.provider==='archive'?'Internet Archive':video.sourceProvenance?'Fan / archive upload':''].filter(Boolean).join(' · ')));
        row.append(el('span',String(video.episodeNumber||show.episodes.indexOf(video)+1).padStart(2,'0'),'episode-number'),copy,el('span',length(video),'episode-duration'));
        item.append(row);
        const source=sourceLink(video,'episode-source');
        if(source)item.append(source);
        list.append(item);
      }
    }
    draw();
    restorePosition(state);
    persist();
  }

  function setKind(kind,{notify=false}={}) {
    if(!['programmes','show','film','all','collection','listed'].includes(kind))return;
    saveScroll();
    if(notify&&kind==='film'&&onMovies) {
      if(!selected)renderIndex(true);
      onMovies();
      return;
    }
    if(filters.kind!==kind)indexPosition={scroll:0,anchor:null};
    filters.kind=kind;
    if(selected&&((kind==='programmes'&&selected.kind!=='film')||(kind==='show'&&selected.kind==='show')))drawDetail();
    else renderIndex();
  }

  win?.addEventListener('popstate',()=>{
    if(win.location.hash!=='#library')return;
    const key=win.history.state?.detail;
    if(key) {
      if(selected?.key!==key)openDetail(key,false);
    }else if(selected) {
      saveScroll();
      renderIndex(true);
    }
  });
  root.addEventListener('scroll',()=>saveScroll(false),{passive:true});
  win?.addEventListener('pagehide',()=>{saveScroll();persist(true);});
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&selected) {
      event.preventDefault();
      event.stopPropagation();
      back();
    }
  });
  renderIndex(true);
  return {
    openIndex(){if(selected)back();},
    openDetail,
    refreshContinueWatching,
    setKind,
    resume({record=true}={}){
      if(selected) {
        if(record&&win?.location.hash==='#library'&&!win.history.state?.detail) {
          win.history.pushState({...win.history.state,rewind:true,detail:selected.key},'','#library');
        }
        drawDetail();
      }else renderIndex(true);
    },
    focusSearch(){
      if(selected) {
        saveScroll();
        if(win?.location.hash==='#library'&&win.history.state?.detail) {
          const {detail,...state}=win.history.state;
          win.history.replaceState(state,'','#library');
        }
        renderIndex(true);
      }
      root.querySelector('.library-search')?.focus();
    },
    get kind(){return filters.kind;},
    get selected(){return selected;},
  };
}
