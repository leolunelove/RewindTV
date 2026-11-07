import {showListings} from './show-listings.mjs?v=vault1';
import {buildShowIndex,normalise} from './show-library.mjs?v=archive2';
import {programmeTitle} from './programme-info.mjs?v=4';
import {browseTitles,pageSlice} from './browse-tools.mjs?v=archive2';
export function filterTitles(shows,query='',kind='all'){return browseTitles(shows,{query,kind});}
export function pageItems(items,limit=30){return items.slice(0,Math.max(0,limit));}
export function createLibraryView(root,{catalogue,onPlay}){
 const shows=buildShowIndex(catalogue,showListings),doc=root.ownerDocument,win=doc.defaultView;let filters={query:'',kind:'all',letter:'all',channel:'all',language:'all'},page=0,selected=null,episodePage=0,lastKey=null,filtersOpen=false,indexScroll=0;const size=()=>win.innerHeight<650?8:12;
 const el=(tag,text='',cls='')=>{const e=doc.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,fn,cls='')=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
 const length=v=>v.duration>=3600?`${Math.floor(v.duration/3600)}h ${Math.round(v.duration%3600/60)}m`:`${Math.round(v.duration/60)} min`;
 function select(label,options,value,change){const s=el('select');s.setAttribute('aria-label',label);for(const [v,text]of options){const o=el('option',text);o.value=v;s.append(o);}s.value=value;s.onchange=()=>change(s.value);return s;}
 function pager(state,change){const nav=el('nav','','browse-pager');nav.setAttribute('aria-label','Results pages');nav.hidden=state.pages===1;const prev=button('← Previous',()=>change(state.page-1)),next=button('Next →',()=>change(state.page+1));prev.disabled=state.page===0;next.disabled=state.page===state.pages-1;const jump=select('Jump to results page',Array.from({length:state.pages},(_,i)=>[String(i),`${i+1} / ${state.pages}`]),String(state.page),v=>change(Number(v)));nav.append(prev,jump,next);return nav;}
 function play(v){const target=catalogue.channels.find(c=>c.key===filters.channel);onPlay(target?.videos.some(x=>x.id===v.id)?{...v,channelKey:target.key}:v);}
 function renderIndex(restore=false){selected=null;root.replaceChildren();const tools=el('div','','library-tools'),input=el('input');input.type='search';input.placeholder='Find a show or film';input.setAttribute('aria-label','Find a show or film');input.value=filters.query;const types=el('div','','library-filters');types.setAttribute('role','group');types.setAttribute('aria-label','Title type');
 for(const [text,value]of [['All','all'],['Shows','show'],['Films','film']]){const b=button(text,()=>{filters.kind=value;page=0;renderIndex();});b.setAttribute('aria-pressed',String(filters.kind===value));types.append(b);}tools.append(input,types);
 const jumps=el('div','','browse-jumps');jumps.append(select('A–Z index',[['all','All A–Z'],['#','0–9'],...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(x=>[x,x]),['other','中文 / Other']],filters.letter,value=>{filters.letter=value;page=0;draw();}),select('Browse by channel',[['all','All channels'],...catalogue.channels.map(c=>[c.key,c.name])],filters.channel,value=>{filters.channel=value;page=0;draw();}),select('Audio language',[['all','All languages'],...[...new Set(['English',...shows.map(s=>s.language).filter(Boolean)])].map(x=>[x,x])],filters.language,value=>{filters.language=value;page=0;draw();}));
 const advanced=el('details','','library-advanced'),summary=el('summary','Filters'),moreTypes=select('More title types',[['all','All titles'],['show','Shows'],['film','Films'],['collection','Collections'],['listed','Listed only']],filters.kind,value=>{filters.kind=value;page=0;renderIndex();});
 advanced.open=filtersOpen;advanced.ontoggle=()=>{filtersOpen=advanced.open;};
 const extraTypes=el('label','Title type','library-type-select');extraTypes.append(moreTypes);jumps.append(extraTypes);advanced.append(summary,jumps);
 const count=el('p','','library-count'),reset=button('Clear filters',()=>{filters={query:'',kind:'all',letter:'all',channel:'all',language:'all'};page=0;renderIndex();},'library-clear'),resultHead=el('div','','library-result-head'),grid=el('div','','library-grid'),navigation=el('div');resultHead.append(count,reset);root.append(tools,advanced,resultHead,grid,navigation);
 function draw(){const state=pageSlice(browseTitles(shows,filters),page,size());page=state.page;count.textContent=`${state.total} ${state.total===1?'title':'titles'} · ${state.total?state.page*size()+1:0}–${Math.min(state.total,(state.page+1)*size())}`;const active=['kind','letter','channel','language'].filter(k=>filters[k]!=='all').length;summary.textContent=active?`Filters · ${active} active`:'Filters';reset.hidden=!active&&!filters.query;grid.replaceChildren();for(const [i,s]of state.items.entries()){const b=button('',()=>openDetail(s.key),'library-title');b.dataset.showKey=s.key;b.setAttribute('aria-label',`Browse ${s.title}${s.language?' · '+s.language:''}`);const text=el('span');text.append(el('strong',s.title),el('small',[!s.episodes.length?'Listed only':s.kind==='film'?length(s.episodes[0]):`${s.episodes.length} ${s.kind==='show'?(s.episodes.length===1?'episode':'episodes'):(s.episodes.length===1?'video':'videos')}`,s.language].filter(Boolean).join(' · ')));b.append(el('span',String(page*size()+i+1).padStart(2,'0'),'browse-number'),text,el('span','→'));grid.append(b);}if(!state.total)grid.append(el('p','No matches. Change a filter or clear your search.'),button('Reset filters',()=>{filters={query:'',kind:'all',letter:'all',channel:'all',language:'all'};page=0;renderIndex();}));navigation.replaceChildren(pager(state,n=>{page=n;draw();root.scrollTop=0;navigation.querySelector(n>0?'button:last-child':'button')?.focus({preventScroll:true});}));}
 input.oninput=()=>{filters.query=input.value;page=0;draw();};draw();root.scrollTop=restore?indexScroll:0;if(restore)[...grid.children].find(x=>x.dataset.showKey===lastKey)?.focus({preventScroll:true});
 }
 function openDetail(key,history=true){const s=shows.find(x=>x.key===key);if(!s)return renderIndex();if(!selected)indexScroll=root.scrollTop;selected=s;lastKey=key;episodePage=0;if(history&&win?.location.hash==='#library')win.history.pushState({rewind:true,detail:key},'','#library');drawDetail();root.scrollTop=0;root.querySelector('.library-back').focus({preventScroll:true});}
 function back(){if(selected&&win?.location.hash==='#library'&&win.history.state?.detail===selected.key){win.history.back();return;}renderIndex(true);}
 function drawDetail(){const s=selected;root.replaceChildren();root.append(button('← Back to results',back,'text-button library-back'));const head=el('div','','library-detail-head');head.append(el('h3',s.title));
 if(s.episodes.length){
  const unit=s.kind==='film'?'film':s.kind==='show'?'episode':'video';
  head.append(el('p',[`${s.episodes.length} ${unit}${s.episodes.length===1?'':'s'}`,s.language,s.episodes.length>1?'Available episodes play in order':''].filter(Boolean).join(' · ')));
  head.append(button(s.kind==='film'?'▶ Watch film':'▶ Play from the beginning',()=>play(s.episodes[0]),'primary'));
 }else head.append(el('p',s.kind==='collection'?'External collection · Opens at the source.':'Listed only · Full programme unavailable here.'));
 root.append(head);
 if(s.listing){
  const listing=s.listing;
  if(listing.description)head.append(el('p',listing.description));
  const extras=el(s.episodes.length?'details':'div','','library-extras');
  if(listing.links.length){
   extras.append(s.episodes.length?el('summary','Extras on YouTube ('+listing.links.length+')'):el('h4',s.kind==='collection'?'From the archive':'Previews and sources'));
   for(const link of listing.links){
    const a=el('a',link.label+' ↗');
    a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';extras.append(a);
   }
   root.append(extras);
  }
 }
 if(!s.episodes.length)return;
 const search=el('input');search.type='search';search.className='episode-search';search.placeholder='Find an episode';search.setAttribute('aria-label','Find an episode');search.hidden=s.episodes.length<=12;let episodeQuery='';const list=el('div','','episode-list'),navigation=el('div');root.append(search,list,navigation);search.oninput=()=>{episodeQuery=normalise(search.value);episodePage=0;draw();};
 function draw(){const state=pageSlice(s.episodes.filter(v=>!episodeQuery||normalise(v.title).includes(episodeQuery)),episodePage,size());episodePage=state.page;list.replaceChildren();if(!state.total)list.append(el('p','No episodes match. Try a different title or number.'));for(const [i,v]of state.items.entries()){const b=button('',()=>play(v),'episode-row');b.setAttribute('aria-label',`Play ${v.title}`);const text=el('div');text.append(el('strong',programmeTitle(v)),el('small',[v.yearLabel||v.year,v.formatLabel,v.provider==='archive'?'Internet Archive':v.sourceProvenance?'Fan / archive upload':''].filter(Boolean).join(' · ')));b.append(el('span',String(episodePage*size()+i+1).padStart(2,'0')),text,el('span',length(v)));list.append(b);}navigation.replaceChildren(pager(state,n=>{episodePage=n;draw();root.scrollTop=0;}));}draw();}
 win?.addEventListener('popstate',()=>{if(win.location.hash!=='#library')return;const key=win.history.state?.detail;if(key){if(selected?.key!==key)openDetail(key,false);}else if(selected)renderIndex(true);});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&selected){event.preventDefault();event.stopPropagation();back();}});
 renderIndex();return {openIndex(){if(!selected)return;back();},openDetail,focusSearch(){if(selected)renderIndex();root.querySelector('input')?.focus();},get selected(){return selected;}};
}
