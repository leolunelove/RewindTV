import {buildMovieLibrary,filterMovies,pickMovie,createMovieReel,filmIdentity,movieArtwork} from './movie-night.mjs?v=liquid1';
import {createReelMotion} from './movie-reel-motion.mjs?v=reel1';
import {createReelSound} from './movie-reel-sound.mjs?v=reel1';
import {orderLibrary,createLibrarySeed} from './library-order.mjs?v=room1';
import {createContinueWatching} from './continue-watching.mjs?v=continue1';
export function createMovieNight(root,{catalogue,onPlay,getAudioState=()=>({enabled:false}),onToggleSound=()=>{},onSoundSettings=()=>{},getContinueWatching=()=>[],onResume,onRemoveContinue}){
 const doc=root.ownerDocument,win=doc.defaultView,films=buildMovieLibrary(catalogue),page=root.closest('[data-tv-page]'),shell=root.closest('#rewind-tv'),stateKey='rewind-film-browse-v1';let saved={};
 try{const value=JSON.parse(win.localStorage.getItem(stateKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
 let genre=films.some(v=>v.genre===saved.genre)?saved.genre:'all',query=typeof saved.query==='string'?saved.query:'',ordering=saved.order==='az'?'az':'mix',seed=typeof saved.seed==='string'&&saved.seed? saved.seed:createLibrarySeed(),mixed=saved.mixed===true,browseScroll=Number.isFinite(saved.scroll)&&saved.scroll>0?saved.scroll:0,wasVisible=!page?.hidden;
 let selected=films.find(v=>v.title==='Charade')||films[0],spinning=false,spinWinner=null,recent=[],landing=0,stride=0,base=0,position=0;
 try{const saved=JSON.parse(win.localStorage.getItem('rewind-movie-picks')||'[]');if(Array.isArray(saved))recent=saved.filter(x=>typeof x==='string').slice(-6);}catch{}
 const el=(tag,text='',cls='')=>{const n=doc.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;},button=(text,action,cls='')=>{const b=el('button',text,cls);b.type='button';b.onclick=action;return b;};
 const runtime=v=>`${Math.floor(v.duration/3600)?Math.floor(v.duration/3600)+'h ':''}${Math.round(v.duration%3600/60)}m`;
 function artwork(v,cls='',eager=false){const frame=el('span','',cls),url=movieArtwork(v);frame.setAttribute('aria-hidden','true');frame.append(el('span','REWIND / CINEMA','movie-art-fallback'));if(url){const img=el('img');img.src=url;img.alt='';img.loading=eager?'eager':'lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();frame.append(img);}return frame;}
 const sound=createReelSound({getAudioState}),reduce=win.matchMedia('(prefers-reduced-motion: reduce)');
 const continuation=createContinueWatching(doc,{getItems:getContinueWatching,onResume,onRemove:onRemoveContinue,kind:'film',scroller:root,getAnchor:()=>root.querySelector('.movie-grid'),getFallbackFocus:()=>root.querySelector('.movie-tools')?.querySelector('input')});
 const hero=el('section','','movie-hero'),reel=el('section','','movie-reel');reel.hidden=true;reel.setAttribute('aria-label','Random film picker');
 const top=el('div','','movie-reel-top'),reelLabel=el('p','LET FATE PICK THE FILM','movie-reel-label');
 const soundButton=button('',()=>{if(!getAudioState().enabled){onSoundSettings();return;}onToggleSound();updateSound();void sound.unlock();},'movie-reel-sound');top.append(reelLabel,soundButton);
 const reelStatus=el('p','','movie-reel-status');reelStatus.setAttribute('role','status');
 const windowEl=el('div','','movie-reel-window'),track=el('div','','movie-reel-track'),marker=el('span','','movie-reel-marker');marker.setAttribute('aria-hidden','true');track.setAttribute('aria-hidden','true');windowEl.append(track,marker);
 const result=el('div','','movie-reel-result'),resultTitle=el('h3'),resultMeta=el('p','','movie-meta'),resultActions=el('div','','movie-actions');
 const watch=button('▶ Watch from start',()=>onPlay(selected),'movie-play'),again=button('↝ Spin again',spin,'movie-pick');resultActions.append(watch,again);result.append(resultTitle,resultMeta,resultActions);result.hidden=true;
 const footer=el('div','','movie-reel-footer'),skip=button('Skip animation',()=>settle('skip'),'movie-skip'),collection=button('← Back to collection',()=>{cancelSpin();reel.hidden=true;root.classList.remove('is-picking');hero.querySelector('.movie-pick')?.focus({preventScroll:true});},'movie-reel-back');footer.append(collection,skip);reel.append(top,windowEl,reelStatus,result,footer);
 const motion=createReelMotion({requestFrame:cb=>win.requestAnimationFrame(cb),cancelFrame:id=>win.cancelAnimationFrame(id),now:()=>win.performance.now(),onFrame:next=>{position=next;placeTrack();},onTick:()=>{if(!doc.hidden)sound.tick();},onFinish:()=>settle('land')});
 function updateSound(){const state=getAudioState(),audible=state.enabled&&!state.muted&&state.volume>0;soundButton.textContent=!state.enabled?'Effects off · Settings':audible?'♪ Sound on':'♪ Unmute TV & effects';soundButton.setAttribute('aria-pressed',String(audible));}
 const tools=el('div','','movie-tools'),search=el('input');search.type='search';search.placeholder='Find a film';search.value=query;search.setAttribute('aria-label','Find a film');const genres=el('nav','','movie-genres');genres.setAttribute('aria-label','Film genres');
 const order=el('div','','movie-order'),orderSelect=el('select'),mix=button('Mix Library',()=>{ordering='mix';seed=createLibrarySeed(seed);mixed=true;updateOrder();refreshCollection();},'movie-mix');order.setAttribute('role','group');order.setAttribute('aria-label','Film ordering');orderSelect.setAttribute('aria-label','Film order');for(const [value,label]of [['mix','Mixed'],['az','A–Z']]){const option=el('option',label);option.value=value;orderSelect.append(option);}orderSelect.onchange=()=>{ordering=orderSelect.value;updateOrder();refreshCollection();};order.append(orderSelect,mix);
 const count=el('p','','movie-count'),grid=el('div','','movie-grid');count.setAttribute('role','status');tools.append(search,genres);root.replaceChildren(continuation.element,hero,reel,tools,order,count,grid);
 function updateOrder(){orderSelect.value=ordering;orderSelect.disabled=spinning;mix.disabled=spinning;mix.textContent=mixed?'Mix again':'Mix Library';}
 function saveBrowse(){try{win.localStorage.setItem(stateKey,JSON.stringify({order:ordering,seed,mixed,genre,query,scroll:browseScroll}));}catch{}}
 const pool=()=>filterMovies(orderLibrary(films,{mode:ordering,seed,key:filmIdentity}),{genre,query});
 function drawHero(){hero.replaceChildren();hero.hidden=!selected;if(!selected)return;hero.append(artwork(selected,'movie-hero-art',true));const info=el('div','','movie-hero-info');info.append(el('p','TONIGHT’S FEATURE','eyebrow'),el('h3',selected.title),el('p',[selected.year,runtime(selected),selected.genre,selected.audioLanguageLabel||'English'].filter(Boolean).join(' · '),'movie-meta'));const actions=el('div','','movie-actions');actions.append(button('▶ Watch from start',()=>onPlay(selected),'movie-play'),button('↝ Pick for me',spin,'movie-pick'));info.append(actions,el('p',[selected.sourceProvenance?'Fan / archive upload':selected.credit||'Archive film','Original picture shape · No cropping'].join(' · '),'movie-source'));hero.append(info);}
 function drawGenres(){if(!genres.children.length)for(const name of ['All films',...new Set(films.map(v=>v.genre))]){const value=name==='All films'?'all':name,b=button(name,()=>{genre=value;drawGenres();refreshCollection();});b.dataset.genre=value;genres.append(b);}for(const b of genres.children){b.setAttribute('aria-pressed',String(genre===b.dataset.genre));b.disabled=spinning;}}
 function drawGrid(){const films=pool();count.textContent=`${films.length} ${films.length===1?'film':'films'}${genre==='all'?' in the collection':' · '+genre} · ${ordering==='mix'?'Mixed':'A–Z'}`;grid.replaceChildren();for(const v of films){const b=button('',()=>choose(v),'movie-card');b.setAttribute('aria-label','Choose '+v.title);b.setAttribute('aria-pressed',String(selected?.id===v.id));b.append(artwork(v,'movie-card-art'),el('strong',v.title),el('small',[v.year,runtime(v)].join(' · ')));b.disabled=spinning;grid.append(b);}if(!films.length)grid.append(el('p','No films match. Try another title or genre.'));}
 function refreshCollection(){const films=pool(),next=films.includes(selected)?selected:films[0]||null;if(next!==selected){selected=next;drawHero();}drawGrid();browseScroll=root.scrollTop;saveBrowse();}
 function choose(v){if(spinning)return;selected=v;reel.hidden=true;root.classList.remove('is-picking');drawHero();drawGrid();root.scrollTo({top:0,behavior:win.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});hero.querySelector('.movie-play')?.focus({preventScroll:true});}
 function savePick(v){recent=[...recent.filter(x=>x!==filmIdentity(v)),filmIdentity(v)].slice(-6);try{win.localStorage.setItem('rewind-movie-picks',JSON.stringify(recent));}catch{}}
 function placeTrack(){track.style.transform=`translate3d(${base-position*stride}px,0,0)`;}
 function measure(){
  const cell=track.firstElementChild;if(!cell||!windowEl.clientWidth)return;
  const width=parseFloat(win.getComputedStyle(cell).width),gap=parseFloat(win.getComputedStyle(track).columnGap)||0;
  if(!width)return;stride=width+gap;base=(windowEl.getBoundingClientRect().width-width)/2;
 }
 function centerWinner(){position=landing;measure();placeTrack();}
 function settle(reason='quiet'){
  if(!spinning)return;spinning=false;motion.stop();sound.stop();track.style.willChange='auto';centerWinner();selected=spinWinner;spinWinner=null;savePick(selected);
  reel.classList.remove('is-spinning');reel.classList.add('is-landed');reel.classList.toggle('is-quiet',reason!=='land');track.children[landing]?.classList.add('is-winner');
  reelLabel.textContent='YOUR FILM TONIGHT';reelStatus.textContent=`Tonight’s pick: ${selected.title}.`;skip.hidden=true;resultTitle.textContent=selected.title;resultMeta.textContent=[selected.year,runtime(selected),selected.genre].filter(Boolean).join(' · ');result.hidden=false;
  drawHero();search.disabled=false;drawGenres();drawGrid();updateOrder();
  if((reason==='land'||reason==='skip')&&!doc.hidden){if(reason==='land')sound.reveal();watch.focus({preventScroll:true});}
 }
 function cancelSpin(){motion.stop();sound.stop();if(spinning)settle();reel.classList.add('is-quiet');}
 function spin(){
  if(spinning)return;const films=pool();spinWinner=pickMovie(films,[...recent,...(selected?[filmIdentity(selected)]:[])]);
  if(!spinWinner)return;
  sound.stop();void sound.unlock();spinning=true;search.disabled=true;drawGenres();drawGrid();updateOrder();hero.querySelectorAll('button').forEach(b=>b.disabled=true);
  root.classList.add('is-picking');reel.hidden=false;reel.classList.remove('is-landed','is-quiet');reel.classList.add('is-spinning');result.hidden=true;reelLabel.textContent='LET FATE PICK THE FILM';reelStatus.textContent='Finding your film…';skip.hidden=false;updateSound();track.replaceChildren();
  const data=createMovieReel(films,spinWinner);landing=data.landing;for(const v of data.items){const cell=el('div','','movie-reel-cell');cell.append(artwork(v,'movie-reel-art',true),el('strong',v.title),el('small',String(v.year||'')));track.append(cell);}
  root.scrollTo({top:0,behavior:'auto'});position=0;measure();placeTrack();
  if(reduce.matches){settle('skip');return;}track.style.willChange='transform';motion.start(landing);skip.focus({preventScroll:true});
 }
 search.oninput=()=>{query=search.value;refreshCollection();};
 const resizeReel=()=>{if(!reel.hidden){measure();placeTrack();}};
 if(win.ResizeObserver){const sizeObserver=new win.ResizeObserver(resizeReel);sizeObserver.observe(windowEl);sizeObserver.observe(track);}
 else win.addEventListener('resize',resizeReel);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)cancelSpin();});
 reduce.addEventListener('change',()=>{if(reduce.matches&&spinning)settle('skip');});
 root.addEventListener('scroll',()=>{if(!page?.hidden&&!root.classList.contains('is-picking'))browseScroll=root.scrollTop;},{passive:true});
 page?.addEventListener('close',()=>{cancelSpin();saveBrowse();});
 shell?.addEventListener('rewind:viewchange',()=>{const visible=!page?.hidden;if(visible&&!wasVisible&&!root.classList.contains('is-picking'))root.scrollTop=browseScroll;wasVisible=visible;});
 shell?.addEventListener('rewind:audiochange',()=>{sound.stop();updateSound();});
 win.addEventListener('pagehide',saveBrowse);
 const initial=pool();if(!initial.includes(selected))selected=initial[0]||null;
 drawHero();drawGenres();drawGrid();updateOrder();updateSound();root.scrollTop=browseScroll;saveBrowse();return {cancelSpin,refreshContinueWatching:continuation.refresh};
}
