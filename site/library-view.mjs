import {showListings} from './show-listings.mjs?v=vault1';
import {buildShowIndex,normalise} from './show-library.mjs?v=liquid1';
import {programmeTitle} from './programme-info.mjs?v=liquid1';
import {browseTitles,pageSlice} from './browse-tools.mjs?v=archive2';
import {movieArtwork} from './movie-night.mjs?v=liquid1';

export function filterTitles(shows,query='',kind='all') {
  return browseTitles(shows,{query,kind});
}

export function pageItems(items,limit=30) {
  return items.slice(0,Math.max(0,limit));
}

export function createLibraryView(root,{catalogue,onPlay,onMovies}) {
  const shows=buildShowIndex(catalogue,showListings);
  const doc=root.ownerDocument;
  const win=doc.defaultView;
  const titleStates=new Map();
  const initialFilters=()=>({query:'',kind:'programmes',letter:'all',channel:'all',language:'all'});
  let filters=initialFilters();
  let page=0;
  let selected=null;
  let lastKey=null;
  let filtersOpen=false;
  let indexScroll=0;
  const pageSize=()=>win?.innerHeight<650?8:12;

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
      frame.append(el('span',show.kind==='collection'?'Collection':'Listed title','library-cover-label'));
    }
    return frame;
  }

  function pager(state,change,label='Results pages') {
    const nav=el('nav','','browse-pager');
    nav.setAttribute('aria-label',label);
    nav.hidden=state.pages===1;
    const previous=button('← Previous',()=>change(state.page-1));
    const next=button('Next →',()=>change(state.page+1));
    previous.disabled=state.page===0;
    next.disabled=state.page===state.pages-1;
    const jump=select('Jump to '+label.toLowerCase(),
      Array.from({length:state.pages},(_,index)=>[String(index),`${index+1} / ${state.pages}`]),
      String(state.page),value=>change(Number(value)));
    nav.append(previous,jump,next);
    return nav;
  }

  function play(video) {
    const channel=catalogue.channels.find(channel=>channel.key===filters.channel);
    onPlay(channel?.videos.some(item=>item.id===video.id)?{...video,channelKey:channel.key}:video);
  }

  function titleState(key) {
    if(!titleStates.has(key))titleStates.set(key,{query:'',season:'all',page:0,scroll:0});
    return titleStates.get(key);
  }

  function saveScroll() {
    if(selected)titleState(selected.key).scroll=root.scrollTop;
    else indexScroll=root.scrollTop;
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
    page=0;
    renderIndex();
  }

  function renderIndex(restore=false) {
    selected=null;
    root.replaceChildren();
    const tools=el('div','','library-tools');
    const input=el('input','','library-search');
    input.type='search';
    input.placeholder='Find a title';
    input.setAttribute('aria-label','Find a show or film');
    input.value=filters.query;
    tools.append(collectionControl(),input);

    const advanced=el('details','','library-advanced');
    const summary=el('summary','Filters');
    const jumps=el('div','','browse-jumps');
    const changeFilter=(key,value)=>{filters[key]=value;page=0;draw();};
    jumps.append(
      select('A–Z index',[['all','All A–Z'],['#','0–9'],...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter=>[letter,letter]),['other','中文 / Other']],filters.letter,value=>changeFilter('letter',value)),
      select('Browse by channel',[['all','All channels'],...catalogue.channels.map(channel=>[channel.key,channel.name])],filters.channel,value=>changeFilter('channel',value)),
      select('Audio language',[['all','All languages'],...[...new Set(['English',...shows.map(show=>show.language).filter(Boolean)])].map(language=>[language,language])],filters.language,value=>changeFilter('language',value)),
      select('More title types',[['programmes','All shows & videos'],['show','TV episodes'],['collection','Collections'],['listed','Listed only'],['all','All titles'],['film','Films']],filters.kind,value=>setKind(value,{notify:value==='film'}))
    );
    advanced.open=filtersOpen;
    advanced.ontoggle=()=>{filtersOpen=advanced.open;};
    advanced.append(summary,jumps);

    const count=el('p','','library-count');
    count.setAttribute('aria-live','polite');
    const reset=button('Clear filters',resetFilters,'library-clear');
    const resultHead=el('div','','library-result-head');
    const pageJump=el('label','Page','library-page-jump');
    const topJump=select('Jump to results page',[],String(page),value=>{
      page=Number(value);
      draw();
      root.scrollTop=0;
    });
    pageJump.append(topJump);
    const grid=el('div','','library-grid rwd-library-grid');
    const navigation=el('div');
    resultHead.append(count,pageJump,reset);
    root.append(tools,advanced,resultHead,grid,navigation);

    function draw() {
      const candidates=filters.kind==='show'||filters.kind==='film'?shows.filter(show=>show.episodes.length):shows;
      const state=pageSlice(browseTitles(candidates,filters),page,pageSize());
      page=state.page;
      pageJump.hidden=state.pages===1;
      topJump.replaceChildren();
      for(let index=0;index<state.pages;index++) {
        const option=el('option',`${index+1} / ${state.pages}`);
        option.value=String(index);
        topJump.append(option);
      }
      topJump.value=String(page);
      count.textContent=`${state.total} ${state.total===1?'title':'titles'} · ${state.total?state.page*pageSize()+1:0}–${Math.min(state.total,(state.page+1)*pageSize())}`;
      const active=['letter','channel','language'].filter(key=>filters[key]!=='all').length+(filters.kind==='programmes'||filters.kind==='film'?0:1);
      summary.textContent=active?`Filters · ${active} active`:'Filters';
      reset.hidden=!active&&!filters.query;
      grid.replaceChildren();
      for(const show of state.items) {
        const card=button('',()=>openDetail(show.key),'library-title rwd-title-card');
        card.dataset.showKey=show.key;
        card.setAttribute('aria-label',`Browse ${show.title}${show.language?' · '+show.language:''}`);
        const copy=el('span','','library-card-copy');
        const description=!show.episodes.length?'Listed only':show.kind==='film'?length(show.episodes[0]):`${show.episodes.length} ${show.kind==='show'?(show.episodes.length===1?'episode':'episodes'):(show.episodes.length===1?'video':'videos')}`;
        copy.append(el('strong',show.title),el('small',[description,show.language].filter(Boolean).join(' · ')));
        card.append(artwork(show),copy);
        grid.append(card);
      }
      if(!state.total)grid.append(el('p','Nothing matches that title. Try another name or change a filter.','library-empty'),button('Reset filters',resetFilters));
      navigation.replaceChildren(pager(state,next=>{page=next;draw();root.scrollTop=0;}));
    }
    input.oninput=()=>{filters.query=input.value;page=0;draw();};
    draw();
    root.scrollTop=restore?indexScroll:0;
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
    const show=selected;
    const state=titleState(show.key);
    root.replaceChildren();
    root.append(button('← Back to results',back,'text-button library-back'));
    const head=el('div','','library-detail-head');
    if(show.episodes.length)head.append(artwork(show,'library-cover library-detail-hero rwd-cover rwd-detail-hero'));
    head.append(el('h3',show.title));
    if(show.episodes.length) {
      const unit=show.kind==='film'?'film':show.kind==='show'?'episode':'video';
      const years=show.years.length
        ? show.years[0]===show.years.at(-1)?String(show.years[0]):`${show.years[0]}–${show.years.at(-1)}`
        : show.episodes[0].yearLabel||'';
      head.append(el('p',[years,`${show.episodes.length} available ${unit}${show.episodes.length===1?'':'s'}`,show.language,show.channels.map(channel=>channel.name).join(', ')].filter(Boolean).join(' · '),'library-detail-meta'));
      const actions=el('div','','library-detail-actions');
      actions.append(button(show.kind==='film'?'▶ Watch film':'▶ Watch from the beginning',()=>play(show.episodes[0]),'primary'));
      const source=sourceLink(show.episodes[0]);
      if(source)actions.append(source);
      head.append(actions);
    }else {
      head.append(el('p',show.kind==='collection'?'External collection · Opens at the source.':'Listed only · Full programme unavailable here.','library-detail-meta'));
    }
    root.append(head);
    if(show.listing) {
      const listing=show.listing;
      if(listing.description)head.append(el('p',listing.description));
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
      root.scrollTop=state.scroll;
      return;
    }

    const controls=el('div','','library-episode-tools');
    const seasons=[...new Set(show.episodes.map(video=>video.seasonNumber).filter(season=>Number.isFinite(season)&&season>0))].sort((a,b)=>a-b);
    if(seasons.length) {
      const options=[['all','All seasons'],...seasons.map(season=>[String(season),`Season ${season}`])];
      if(show.episodes.some(video=>!video.seasonNumber))options.push(['unknown','Other episodes']);
      if(!options.some(([value])=>value===state.season))state.season='all';
      controls.append(select('Browse season',options,state.season,value=>{state.season=value;state.page=0;draw();},'library-season-filter'));
    }
    const search=el('input','','episode-search');
    search.type='search';
    search.placeholder='Find an episode';
    search.setAttribute('aria-label','Find an episode');
    search.value=state.query;
    search.hidden=show.episodes.length<=12;
    search.oninput=()=>{state.query=search.value;state.page=0;draw();};
    controls.append(search);
    const list=el('div','','episode-list rwd-episode-list');
    const navigation=el('div');
    root.append(controls,list,navigation);

    function draw() {
      const query=normalise(state.query);
      const eligible=show.episodes.filter(video=>(state.season==='all'||(state.season==='unknown'?!video.seasonNumber:String(video.seasonNumber)===state.season))&&(!query||normalise([video.title,video.seasonNumber&&`season ${video.seasonNumber}`,video.episodeNumber&&`episode ${video.episodeNumber}`].filter(Boolean).join(' ')).includes(query)));
      const result=pageSlice(eligible,state.page,pageSize());
      state.page=result.page;
      list.replaceChildren();
      if(!result.total)list.append(el('p','No episodes match. Try another name or season.','library-empty'));
      for(const [index,video] of result.items.entries()) {
        const item=el('div','','episode-item');
        const row=button('',()=>play(video),'episode-row rwd-episode-row');
        row.setAttribute('aria-label',`Play ${video.title}`);
        const copy=el('span');
        copy.append(el('strong',programmeTitle(video)),el('small',[video.seasonNumber&&`Season ${video.seasonNumber}`,video.yearLabel||video.year,video.formatLabel,video.provider==='archive'?'Internet Archive':video.sourceProvenance?'Fan / archive upload':''].filter(Boolean).join(' · ')));
        row.append(el('span',String(video.episodeNumber||state.page*pageSize()+index+1).padStart(2,'0'),'episode-number'),copy,el('span',length(video),'episode-duration'));
        item.append(row);
        const source=sourceLink(video,'episode-source');
        if(source)item.append(source);
        list.append(item);
      }
      navigation.replaceChildren(pager(result,next=>{state.page=next;draw();},'Episode pages'));
    }
    draw();
    root.scrollTop=state.scroll;
  }

  function setKind(kind,{notify=false}={}) {
    if(!['programmes','show','film','all','collection','listed'].includes(kind))return;
    saveScroll();
    if(filters.kind!==kind)page=0;
    filters.kind=kind;
    if(notify&&kind==='film'&&onMovies) {
      onMovies();
      return;
    }
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
  root.addEventListener('scroll',saveScroll,{passive:true});
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&selected) {
      event.preventDefault();
      event.stopPropagation();
      back();
    }
  });
  renderIndex();
  return {
    openIndex(){if(selected)back();},
    openDetail,
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
