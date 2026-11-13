import {test} from 'node:test';import assert from 'node:assert/strict';import {filterTitles} from '../site/library-view.mjs';
test('library search combines the title query and selected media type',()=>{const titles=[{title:'Café',kind:'show'},{title:'Cafe Society',kind:'film'},{title:'Music',kind:'collection'}];assert.deepEqual(filterTitles(titles,'cafe','show'),[titles[0]]);assert.deepEqual(filterTitles(titles,'','film'),[titles[1]]);assert.equal(filterTitles(titles,'no match').length,0);});

test('listed titles are searchable without exposing preview IDs to the player',async()=>{
 const {buildShowIndex,findProgramme}=await import('../site/show-library.mjs');
 const video={id:'episode',series:'A Show',title:'Episode 1',duration:1200,kind:'full episode'};
 const catalogue={channels:[{key:'retro',name:'Retro',number:1,videos:[video]}]};
 const listings=[
  {title:'A Show',channelKey:'retro',links:[{label:'Promo',url:'https://www.youtube.com/watch?v=preview'}]},
  {title:'A Missing Show',channelKey:'retro',links:[]}
 ];
 const shows=buildShowIndex(catalogue,listings);
 assert.equal(filterTitles(shows,'','listed')[0].title,'A Missing Show');
 assert.equal(shows.find(show=>show.title==='A Show').episodes.length,1);
 assert.equal(findProgramme(catalogue,'retro','preview'),null);
});

function libraryFixture(catalogue,onMovies=()=>{},storage=new Map(),continueOptions={}) {
  class Element extends EventTarget {
    constructor(tag,doc) {
      super();this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.attributes={};this.className='';this.scrollTop=0;this.textContent='';
      this.classList={add:name=>{this.className+=' '+name;}};
    }
    append(...children) {for(const child of children){child.parentElement=this;this.children.push(child);}}
    replaceChildren(...children) {this.children=[];this.append(...children);}
    setAttribute(name,value) {this.attributes[name]=String(value);}
    focus() {this.ownerDocument.activeElement=this;}
    remove() {this.parentElement.children=this.parentElement.children.filter(child=>child!==this);}
    getBoundingClientRect() {return this.ownerDocument.layout?.(this)||{top:0,bottom:0};}
    querySelectorAll(selector) {return descendants(this).filter(node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tagName===selector);}
    querySelector(selector) {
      return descendants(this).find(node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tagName===selector)||null;
    }
  }
  const win=new EventTarget();win.innerHeight=800;win.location={hash:'#library'};
  win.localStorage=storage instanceof Map?{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}:storage;
  const entries=[{state:{rewind:true,panel:'browse-overlay'},hash:'#library'}];
  win.history={
    get state(){return entries.at(-1)?.state;},
    pushState(state,unused,hash=win.location.hash){entries.push({state,hash});win.location.hash=hash;},
    replaceState(state,unused,hash=win.location.hash){entries[entries.length-1]={state,hash};win.location.hash=hash;},
    back(){entries.pop();win.location.hash=entries.at(-1)?.hash||'';win.dispatchEvent(new Event('popstate'));},
  };
  const doc={defaultView:win,createElement:tag=>new Element(tag,doc)};
  const root=doc.createElement('div');
  const played=[];
  return import('../site/library-view.mjs').then(({createLibraryView})=>({root,win,played,view:createLibraryView(root,{catalogue,onPlay:video=>played.push(video),onMovies,...continueOptions})}));
}

function descendants(root) {
  return root.children.flatMap(child=>[child,...descendants(child)]);
}
function byClass(root,name) {return descendants(root).filter(node=>node.className.split(' ').includes(name));}
function byLabel(root,label) {return descendants(root).find(node=>node.attributes['aria-label']===label);}
function change(control,value) {control.value=value;control.onchange();}
function input(control,value) {control.value=value;control.oninput();}
function episode(id,series,season,number) {
  return {id,title:`${series} — Science episode ${String(number).padStart(2,'0')}`,series,kind:'full episode',duration:1200,year:2001,seasonNumber:season,episodeNumber:number,watchUrl:`https://www.youtube.com/watch?v=${id}`,sourceType:'official',credit:'Original publisher'};
}

const scienceEpisodes=Array.from({length:36},(_,index)=>episode(`science${index}`,'Science Club',index<18?1:2,index%18+1));
const libraryCatalogue={channels:[{key:'discovery',name:'Discovery',number:25,videos:[
  ...Array.from({length:14},(_,index)=>episode(`archive${String(index).padStart(4,'0')}`,`Archive ${index}`,1,1)),
  ...scienceEpisodes,
  {id:'feature1234',title:'A Feature',series:'A Feature',kind:'film',duration:5400,year:1998,provider:'youtube',watchUrl:'https://www.youtube.com/watch?v=feature1234'},
  {id:'collection1',title:'A Music Video',series:'Music Collection',kind:'music',duration:300,year:2003,watchUrl:'https://www.youtube.com/watch?v=collection1'},
]}]};

test('country catalogue updates retain Library filters, detail and scroll without requesting playback',async()=>{
  const {root,win,view,played}=await libraryFixture(libraryCatalogue);
  input(byLabel(root,'Find a show or film'),'Science');root.scrollTop=170;root.dispatchEvent(new Event('scroll'));
  view.openDetail('show:science club');change(byLabel(root,'Browse season'),'2');input(byLabel(root,'Find an episode'),'Science');root.scrollTop=215;root.dispatchEvent(new Event('scroll'));
  const next={channels:libraryCatalogue.channels.map(channel=>({...channel,videos:channel.videos.filter(video=>video.id!=='science35')}))};
  view.updateCatalogue(next);
  assert.equal(view.selected.key,'show:science club');assert.equal(byLabel(root,'Browse season').value,'2');assert.equal(byLabel(root,'Find an episode').value,'Science');assert.equal(root.scrollTop,215);assert.equal(byClass(root,'episode-row').length,17);assert.equal(played.length,0);
  view.openIndex();assert.equal(byLabel(root,'Find a show or film').value,'Science');assert.equal(root.scrollTop,170);
  view.openDetail('show:science club');view.updateCatalogue({channels:next.channels.map(channel=>({...channel,videos:channel.videos.filter(video=>video.series!=='Science Club')}))});
  assert.equal(view.selected,null);assert.equal(win.history.state.detail,undefined);assert.equal(byLabel(root,'Find a show or film').value,'Science');assert.equal(played.length,0);
});

test('background country updates preserve the Library player route, utility history and foreground focus',async()=>{
  const f=await libraryFixture(libraryCatalogue),country=f.root.ownerDocument.createElement('select');
  f.view.openDetail('show:science club');change(byLabel(f.root,'Browse season'),'2');
  const watch={rewind:true,panel:'library-player-page',libraryOrigin:'shows',libraryReturn:'#library',detail:'show:science club'};
  f.win.history.pushState(watch,'','#library-watch');f.win.history.pushState({...watch,utility:'settings'},'','#library-watch');country.focus();
  const utilityState=f.win.history.state;
  const shorter={channels:libraryCatalogue.channels.map(channel=>({...channel,videos:channel.videos.filter(video=>video.id!=='science35')}))};
  f.view.updateCatalogue(shorter);
  assert.equal(f.win.location.hash,'#library-watch');assert.equal(f.win.history.state,utilityState);assert.equal(f.root.ownerDocument.activeElement,country);assert.equal(f.view.selected.key,'show:science club');assert.equal(byLabel(f.root,'Browse season').value,'2');assert.equal(byClass(f.root,'episode-row').length,17);assert.equal(f.played.length,0);
  f.view.updateCatalogue({channels:shorter.channels.map(channel=>({...channel,videos:channel.videos.filter(video=>video.series!=='Science Club')}))});
  assert.equal(f.win.location.hash,'#library-watch');assert.equal(f.win.history.state,utilityState);assert.equal(f.root.ownerDocument.activeElement,country);assert.equal(f.view.selected,null);assert.equal(f.played.length,0);
});

test('refreshing a background Library index never focuses its previously selected title',async()=>{
  const f=await libraryFixture(libraryCatalogue);f.view.openDetail('show:science club');f.view.openIndex();
  const settings=f.root.ownerDocument.createElement('select');f.win.history.pushState({rewind:true,utility:'settings',libraryReturn:'#library'},'','#library-watch');settings.focus();const state=f.win.history.state;
  f.view.updateCatalogue(libraryCatalogue);
  assert.equal(f.root.ownerDocument.activeElement,settings);assert.equal(f.win.location.hash,'#library-watch');assert.equal(f.win.history.state,state);assert.equal(f.played.length,0);
});

test('Library starts with Shows, renders catalogue artwork and keeps all other title types reachable',async()=>{
  const {root,view}=await libraryFixture(libraryCatalogue);
  assert.equal(view.kind,'programmes');
  assert.equal(byClass(root,'library-title').length,16);
  assert(byClass(root,'library-title').filter(card=>card.dataset.showKey.startsWith('show:archive')).every(card=>card.querySelector('img')));
  assert(byClass(root,'library-title').find(card=>card.dataset.showKey==='show:archive 0').querySelector('img').src.includes('archive0000'));
  assert(descendants(root).filter(node=>node.tagName==='img').every(image=>image.loading==='lazy'&&image.decoding==='async'));
  change(byLabel(root,'More title types'),'collection');
  assert.equal(view.kind,'collection');
  assert(byClass(root,'library-title').some(card=>card.dataset.showKey==='show:music collection'));
  view.setKind('listed');
  assert(byClass(root,'library-title').length>0,'listed-only source collections remain discoverable');
  view.openDetail('show:biochao s vault');
  const links=descendants(root).filter(node=>node.tagName==='a');
  assert.equal(links.length,11);
  assert(links.every(link=>/^https:\/\//.test(link.href)));
  assert.equal(byClass(root,'episode-row').length,0,'external previews never become playable episode rows');
});

test('returning to a show restores season, episode search, continuous episode list, detail scroll and results position',async()=>{
  const {root,view}=await libraryFixture(libraryCatalogue);
  change(byLabel(root,'Library order'),'az');
  root.scrollTop=170;root.dispatchEvent(new Event('scroll'));
  view.openDetail('show:science club');
  change(byLabel(root,'Browse season'),'2');
  input(byLabel(root,'Find an episode'),'Science');
  assert.equal(byClass(root,'episode-row').length,18);
  root.scrollTop=215;root.dispatchEvent(new Event('scroll'));
  view.openIndex();
  assert.equal(view.selected,null);
  assert.equal(byLabel(root,'Library order').value,'az');
  assert.equal(root.scrollTop,170);
  view.openDetail('show:science club');
  assert.equal(byLabel(root,'Browse season').value,'2');
  assert.equal(byLabel(root,'Find an episode').value,'Science');
  assert.equal(byClass(root,'episode-row').length,18);
  assert.equal(root.scrollTop,215);
  view.resume();
  assert.equal(view.selected.key,'show:science club');
  assert.equal(byClass(root,'episode-row').length,18);
  assert.equal(root.scrollTop,215);
});

test('Films hands off to Movie Night and returning to Shows retains the selected programme',async()=>{
  let moviesOpened=0;
  const {root,view}=await libraryFixture(libraryCatalogue,()=>moviesOpened++);
  const filmRadio=descendants(root).find(node=>node.tagName==='input'&&node.value==='film');
  filmRadio.checked=true;filmRadio.onchange();
  assert.equal(moviesOpened,1);
  assert.equal(view.kind,'programmes','leaving for Films preserves the Shows browsing context');
  view.setKind('programmes');
  view.openDetail('show:science club');
  change(byLabel(root,'Browse season'),'2');
  view.setKind('film',{notify:true});
  assert.equal(moviesOpened,2);
  view.setKind('programmes');
  assert.equal(view.selected.key,'show:science club');
  assert.equal(byLabel(root,'Browse season').value,'2');
});

test('season filters preserve episodes without season metadata and source links remain separate from playback controls',async()=>{
  const episodes=[episode('known','Mixed Metadata',1,1),episode('unknown','Mixed Metadata',undefined,undefined)];
  const {root,view,played}=await libraryFixture({channels:[{key:'archive',number:16,name:'Archive',videos:episodes}]});
  view.openDetail('show:mixed metadata');
  assert.equal(byClass(root,'episode-row').length,2);
  change(byLabel(root,'Browse season'),'unknown');
  assert.equal(byClass(root,'episode-row').length,1);
  const row=byClass(root,'episode-row')[0];
  row.onclick();
  assert.equal(played[0].id,'unknown');
  assert.equal(played[0].channelKey,'archive');
  assert.equal(row.children.some(child=>child.tagName==='a'),false);
  assert.equal(byClass(root,'episode-source')[0].href,episodes[1].watchUrl);
});

test('reopening a retained detail from another tab inserts a results history entry once',async()=>{
  const {root,win,view}=await libraryFixture(libraryCatalogue);
  view.openDetail('show:science club');
  win.history.pushState({rewind:true,panel:'schedule-overlay'},'','#guide');
  win.history.pushState({rewind:true,panel:'browse-overlay'},'','#library');
  view.resume();
  assert.equal(win.history.state.detail,'show:science club');
  view.resume();
  view.openIndex();
  assert.equal(win.history.state.detail,undefined);
  assert.equal(view.selected,null,'browser Back returns to results before leaving Library');
  view.openDetail('show:science club');
  win.history.replaceState({rewind:true,panel:'browse-overlay'});
  view.resume({record:false});
  assert.equal(win.history.state.detail,undefined,'history-driven restoration can suppress pushes');
  assert.equal(view.selected.key,'show:science club');
});

test('browser Back from Films restores the Shows search and detail instead of a hidden film filter',async()=>{
  let f;
  f=await libraryFixture(libraryCatalogue,()=>f.win.history.pushState({rewind:true,panel:'movie-night-page'},'','#movies'));
  input(byLabel(f.root,'Find a show or film'),'Science');
  f.root.scrollTop=170;f.root.dispatchEvent(new Event('scroll'));
  const films=descendants(f.root).find(node=>node.tagName==='input'&&node.value==='film');films.checked=true;films.onchange();
  assert.equal(f.win.location.hash,'#movies');f.win.history.back();
  assert.equal(f.view.kind,'programmes');assert.equal(byLabel(f.root,'Find a show or film').value,'Science');
  assert.deepEqual(byClass(f.root,'library-title').map(card=>card.dataset.showKey),['show:science club']);
  const shows=descendants(f.root).find(node=>node.tagName==='input'&&node.value==='programmes');assert.equal(shows.checked,true);assert.equal(f.root.scrollTop,170);
  f.view.openDetail('show:science club');change(byLabel(f.root,'Browse season'),'2');
  f.view.setKind('film',{notify:true});f.win.history.back();
  assert.equal(f.view.kind,'programmes');assert.equal(f.view.selected.key,'show:science club');assert.equal(byLabel(f.root,'Browse season').value,'2');
  f.view.openIndex();assert.equal(f.view.selected,null);assert.deepEqual(byClass(f.root,'library-title').map(card=>card.dataset.showKey),['show:science club']);
});

test('default Shows search finds creator collections and the Films filter uses the same Movie Night handoff',async()=>{
  let moviesOpened=0;
  const catalogue={channels:[{key:'web',name:'Classic YouTube',number:10,videos:[
    {...episode('gmmfull0001','Good Mythical Morning',undefined,undefined),kind:'classic video'},
    {...episode('frankfull01','Filthy Frank',undefined,undefined),kind:'classic video'},
    {...episode('musicfull01','Proximity',undefined,undefined),kind:'music'},
    episode('sciencefull','Science Club',1,1),
    {id:'filmfull001',title:'A Feature',series:'A Feature',kind:'film',duration:5400},
  ]}]};
  const {root,view}=await libraryFixture(catalogue,()=>moviesOpened++);
  assert.equal(view.kind,'programmes');
  const cards=()=>byClass(root,'library-title').map(card=>card.dataset.showKey);
  assert.deepEqual(new Set(cards()),new Set(['show:good mythical morning','show:filthy frank','show:proximity','show:science club']));
  input(byLabel(root,'Find a show or film'),'GMM');
  assert.deepEqual(cards(),['show:good mythical morning']);
  input(byLabel(root,'Find a show or film'),'FilthyFrank');
  assert.deepEqual(cards(),['show:filthy frank']);
  view.openDetail('show:filthy frank');
  view.setKind('film',{notify:true});
  view.setKind('programmes');
  assert.equal(view.selected.key,'show:filthy frank','creator detail survives returning from Films');
  view.openIndex();
  change(byLabel(root,'More title types'),'listed');
  const radios=descendants(root).filter(node=>node.tagName==='input'&&node.name==='library-collection');
  assert.equal(radios.length,2,'advanced modes do not add another primary control');
  assert.equal(radios.find(node=>node.value==='programmes').checked,true);
  change(byLabel(root,'More title types'),'film');
  assert.equal(moviesOpened,2,'the advanced Films choice routes through onMovies too');
});

test('all 350 titles are continuously reachable, a mix is stable through filtering and Back, and no page controls remain',async()=>{
  const catalogue={channels:[{key:'archive',number:16,name:'Archive',videos:Array.from({length:350},(_,index)=>episode(`archive${String(index).padStart(4,'0')}`,`Catalogue ${index}`,1,1))}]};
  const {root,view}=await libraryFixture(catalogue);
  const keys=()=>byClass(root,'library-title').map(card=>card.dataset.showKey);
  assert.equal(keys().length,350);assert.equal(new Set(keys()).size,350);
  assert.equal(byClass(root,'browse-pager').length,0);assert.equal(byClass(root,'library-page-jump').length,0);
  assert.equal(byLabel(root,'Jump to results page'),undefined);assert.equal(byLabel(root,'A–Z index').hidden,true);
  const original=keys();const mix=byClass(root,'library-mix')[0];
  assert.equal(mix.textContent,'Mix Library');mix.focus();mix.onclick();
  assert.equal(mix.textContent,'Mix again');assert.equal(root.ownerDocument.activeElement,mix);
  const mixed=keys();assert.equal(mixed.length,350);assert.notDeepEqual(mixed,original);
  input(byLabel(root,'Find a show or film'),'Catalogue 3');
  assert.deepEqual(keys(),mixed.filter(key=>key.startsWith('show:catalogue 3')));
  input(byLabel(root,'Find a show or film'),'');assert.deepEqual(keys(),mixed);
  root.scrollTop=180;root.dispatchEvent(new Event('scroll'));
  view.openDetail('show:catalogue 336');view.openIndex();
  assert.deepEqual(keys(),mixed);assert.equal(root.scrollTop,180);
  change(byLabel(root,'Library order'),'az');
  assert.equal(byLabel(root,'A–Z index').hidden,false);
  assert.deepEqual(keys().slice(0,3),['show:catalogue 0','show:catalogue 1','show:catalogue 2']);
  change(byLabel(root,'Library order'),'mix');assert.deepEqual(keys(),mixed);
  input(byLabel(root,'Find a show or film'),'Catalogue349');
  assert.equal(byClass(root,'library-title').length,1);
});

test('all 805 episodes remain chronological and season search never turns the list into a mixed playback queue',async()=>{
  const episodes=Array.from({length:805},(_,index)=>episode(`full${String(index).padStart(7,'0')}`,'Long Running Show',Math.floor(index/161)+1,index%161+1));
  const {root,view,played}=await libraryFixture({channels:[{key:'archive',number:16,name:'Archive',videos:[...episodes].reverse()}]});
  view.openDetail('show:long running show');
  const ids=()=>byClass(root,'episode-item').map(item=>item.dataset.episodeId);
  assert.deepEqual(ids(),episodes.map(video=>video.id));
  assert.equal(byClass(root,'browse-pager').length,0);assert.equal(byClass(root,'library-mix').length,0);
  change(byLabel(root,'Browse season'),'3');
  assert.deepEqual(ids(),episodes.slice(322,483).map(video=>video.id));
  input(byLabel(root,'Find an episode'),'episode 05');
  assert.deepEqual(ids(),[episodes[326].id]);
  byClass(root,'episode-row')[0].onclick();
  assert.equal(played[0].id,episodes[326].id);assert.equal(played[0].channelKey,'archive');
  input(byLabel(root,'Find an episode'),'');change(byLabel(root,'Browse season'),'all');
  assert.deepEqual(ids(),episodes.map(video=>video.id));
});

test('saved filters, stable Mixed order, results scroll and per-show season/search survive a new view instance',async()=>{
  const storage=new Map();
  const first=await libraryFixture(libraryCatalogue,()=>{},storage);
  input(byLabel(first.root,'Find a show or film'),'Archive');
  change(byLabel(first.root,'Browse by channel'),'discovery');
  byClass(first.root,'library-mix')[0].onclick();
  const keys=byClass(first.root,'library-title').map(card=>card.dataset.showKey);
  first.root.scrollTop=321;first.root.dispatchEvent(new Event('scroll'));
  first.view.openDetail('show:science club');
  change(byLabel(first.root,'Browse season'),'2');input(byLabel(first.root,'Find an episode'),'Science');
  first.root.scrollTop=246;first.root.dispatchEvent(new Event('scroll'));
  const second=await libraryFixture(libraryCatalogue,()=>{},storage);
  assert.equal(byLabel(second.root,'Find a show or film').value,'Archive');
  assert.equal(byLabel(second.root,'Browse by channel').value,'discovery');
  assert.equal(byLabel(second.root,'Library order').value,'mix');
  assert.equal(byClass(second.root,'library-mix')[0].textContent,'Mix again');
  assert.deepEqual(byClass(second.root,'library-title').map(card=>card.dataset.showKey),keys);
  assert.equal(second.root.scrollTop,321);
  second.view.openDetail('show:science club');
  assert.equal(byLabel(second.root,'Browse season').value,'2');assert.equal(byLabel(second.root,'Find an episode').value,'Science');
  assert.equal(second.root.scrollTop,246);
});

test('Back keeps the same visible title anchor when the responsive grid changes columns',async()=>{
  const catalogue={channels:[{key:'archive',name:'Archive',videos:Array.from({length:120},(_,index)=>episode(`archive${String(index).padStart(4,'0')}`,`Catalogue ${index}`,1,1))}]};
  const {root,view}=await libraryFixture(catalogue);let columns=4;
  root.ownerDocument.layout=node=>{
    if(node===root)return {top:100,bottom:700};
    if(node.className.split(' ').includes('library-title')) {
      const index=node.parentElement.children.indexOf(node),top=100+Math.floor(index/columns)*100-root.scrollTop;
      return {top,bottom:top+100};
    }
    return {top:0,bottom:0};
  };
  root.scrollTop=2100;root.dispatchEvent(new Event('scroll'));
  const anchor=byClass(root,'library-title')[84].dataset.showKey;
  view.openDetail(anchor);columns=2;view.openIndex();
  assert.equal(root.scrollTop,4200);
  assert.equal(byClass(root,'library-title').find(card=>card.dataset.showKey===anchor).getBoundingClientRect().top,100);
});

test('playing and hiding Library preserve the retained detail and its position for return from the player',async()=>{
  const {root,win,view,played}=await libraryFixture(libraryCatalogue);
  view.openDetail('show:science club');change(byLabel(root,'Browse season'),'2');
  root.scrollTop=215;root.dispatchEvent(new Event('scroll'));
  byClass(root,'episode-row')[5].onclick();assert.equal(played[0].id,scienceEpisodes[23].id);
  root.getClientRects=()=>[];root.scrollTop=0;root.dispatchEvent(new Event('scroll'));win.dispatchEvent(new Event('pagehide'));
  root.getClientRects=()=>[{}];view.resume();
  assert.equal(view.selected.key,'show:science club');assert.equal(byLabel(root,'Browse season').value,'2');
  assert.equal(root.scrollTop,215);assert.equal(byClass(root,'episode-row').length,18);
});

test('malformed or blocked browse storage cannot prevent Library discovery or mixing',async()=>{
  const bad=[{getItem:()=>'{',setItem(){}},{getItem:()=>JSON.stringify({filters:[],seed:[],order:'wrong',indexPosition:{scroll:'bad'},titles:{}}),setItem(){}},{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}];
  for(const storage of bad) {
    const {root}=await libraryFixture(libraryCatalogue,()=>{},storage);
    assert.equal(byClass(root,'library-title').length,16);
    assert.equal(byLabel(root,'Library order').value,'mix');byClass(root,'library-mix')[0].onclick();
    assert.equal(byClass(root,'library-title').length,16);
  }
});

test('main Shows and Films together expose playable source records from every real channel',async()=>{
  const fs=await import('node:fs');
  const {hydrateLibrary}=await import('../site/runtime-library.mjs');
  const {buildShowIndex,isBrowsable}=await import('../site/show-library.mjs');
  const {browseTitles}=await import('../site/browse-tools.mjs');
  const catalogue=hydrateLibrary(JSON.parse(fs.readFileSync(new URL('../site/runtime-library.json',import.meta.url),'utf8')));
  const index=buildShowIndex(catalogue);
  const programmes=browseTitles(index,{kind:'programmes'});
  const films=browseTitles(index,{kind:'film'});
  const reachable=new Set([...programmes,...films].flatMap(show=>show.episodes.map(video=>video.id)));
  assert.equal(catalogue.channels.length,33);
  for(const channel of catalogue.channels) {
    const playable=channel.videos.filter(isBrowsable);
    assert(playable.length>0,channel.name);
    for(const video of playable)assert(reachable.has(video.id),`${channel.name}: ${video.title}`);
  }
  assert.equal(new Set(programmes.map(show=>show.key)).size,programmes.length,'each title has one browse result');
  assert.equal(browseTitles(index,{kind:'programmes',query:'GMM'})[0].episodes.length,89);
  assert.equal(browseTitles(index,{kind:'programmes',query:'FilthyFrank'})[0].episodes.length,66);
  const {root}=await libraryFixture(catalogue);
  const visible=byClass(root,'library-title').map(card=>card.dataset.showKey);
  assert.deepEqual(new Set(visible),new Set(programmes.map(show=>show.key)),'the actual Library shows every playable non-film title without a shortlist');
  assert.equal(visible.length,new Set(visible).size);
});


test('Library Continue watching resumes the saved episode while From the beginning remains explicit',async()=>{
 let records=[{key:'show:science club',video:{...scienceEpisodes[22],channelKey:'discovery'},position:321,duration:1200,origin:'shows'}];const resumed=[],removed=[];
 const f=await libraryFixture(libraryCatalogue,()=>{},new Map(),{getContinueWatching:()=>records,onResume:record=>resumed.push(record),onRemoveContinue:key=>removed.push(key)});
 assert.equal(byClass(f.root,'continue-item').length,1);assert.equal(f.played.length,0);
 byClass(f.root,'continue-resume')[0].onclick();assert.equal(resumed[0].video.id,scienceEpisodes[22].id);assert.equal(resumed[0].position,321);
 f.view.openDetail('show:science club');const resume=byClass(f.root,'library-resume')[0];assert.equal(resume.hidden,false);assert.match(resume.textContent,/5:21/);resume.onclick();assert.equal(resumed.length,2);
 descendants(f.root).find(node=>node.tagName==='button'&&node.textContent==='▶ Watch from the beginning').onclick();assert.equal(f.played[0].id,scienceEpisodes[0].id);
 const episodes=byClass(f.root,'episode-row');f.root.scrollTop=234;resume.focus();records=[{...records[0],position:400}];f.view.refreshContinueWatching();
 assert.equal(byClass(f.root,'library-resume')[0],resume);assert.equal(f.root.ownerDocument.activeElement,resume);assert.equal(f.root.scrollTop,234);assert.equal(byClass(f.root,'episode-row')[0],episodes[0]);assert.match(resume.textContent,/6:40/);
 records=[];f.view.refreshContinueWatching();assert.equal(resume.hidden,true);
});
