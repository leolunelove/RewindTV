import {test} from 'node:test';import assert from 'node:assert/strict';import {filterTitles,pageItems} from '../site/library-view.mjs';
test('library search combines the title query and selected media type',()=>{const titles=[{title:'Café',kind:'show'},{title:'Cafe Society',kind:'film'},{title:'Music',kind:'collection'}];assert.deepEqual(filterTitles(titles,'cafe','show'),[titles[0]]);assert.deepEqual(filterTitles(titles,'','film'),[titles[1]]);assert.equal(filterTitles(titles,'no match').length,0);});
test('large episode collections remain bounded until another page is requested',()=>{const episodes=Array.from({length:805},(_,i)=>i);assert.equal(pageItems(episodes).length,30);assert.equal(pageItems(episodes,60).length,60);assert.equal(pageItems(episodes,0).length,0);assert.equal(pageItems(episodes,900).length,805);});

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

function libraryFixture(catalogue,onMovies=()=>{}) {
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
    querySelector(selector) {
      return descendants(this).find(node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tagName===selector)||null;
    }
  }
  const win=new EventTarget();win.innerHeight=800;win.location={hash:'#library'};
  const entries=[{rewind:true,panel:'browse-overlay'}];
  win.history={
    get state(){return entries.at(-1);},
    pushState(state){entries.push(state);},
    replaceState(state){entries[entries.length-1]=state;},
    back(){entries.pop();win.dispatchEvent(new Event('popstate'));},
  };
  const doc={defaultView:win,createElement:tag=>new Element(tag,doc)};
  const root=doc.createElement('div');
  const played=[];
  return import('../site/library-view.mjs').then(({createLibraryView})=>({root,win,played,view:createLibraryView(root,{catalogue,onPlay:video=>played.push(video),onMovies})}));
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

test('Library starts with Shows, renders catalogue artwork and keeps all other title types reachable',async()=>{
  const {root,view}=await libraryFixture(libraryCatalogue);
  assert.equal(view.kind,'programmes');
  assert.equal(byClass(root,'library-title').length,12);
  assert(byClass(root,'library-title').every(card=>card.querySelector('img')));
  assert(root.querySelector('img').src.includes('archive0000'));
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

test('returning to a show restores season, episode search, episode page, detail scroll and results position',async()=>{
  const {root,view}=await libraryFixture(libraryCatalogue);
  change(byLabel(root,'Jump to results pages'),'1');
  root.scrollTop=170;root.dispatchEvent(new Event('scroll'));
  view.openDetail('show:science club');
  change(byLabel(root,'Browse season'),'2');
  input(byLabel(root,'Find an episode'),'Science');
  change(byLabel(root,'Jump to episode pages'),'1');
  assert.equal(byClass(root,'episode-row').length,6);
  root.scrollTop=215;root.dispatchEvent(new Event('scroll'));
  view.openIndex();
  assert.equal(view.selected,null);
  assert.equal(byLabel(root,'Jump to results pages').value,'1');
  assert.equal(root.scrollTop,170);
  view.openDetail('show:science club');
  assert.equal(byLabel(root,'Browse season').value,'2');
  assert.equal(byLabel(root,'Find an episode').value,'Science');
  assert.equal(byLabel(root,'Jump to episode pages').value,'1');
  assert.equal(byClass(root,'episode-row').length,6);
  assert.equal(root.scrollTop,215);
  view.resume();
  assert.equal(view.selected.key,'show:science club');
  assert.equal(byLabel(root,'Jump to episode pages').value,'1');
  assert.equal(root.scrollTop,215);
});

test('Films hands off to Movie Night and returning to Shows retains the selected programme',async()=>{
  let moviesOpened=0;
  const {root,view}=await libraryFixture(libraryCatalogue,()=>moviesOpened++);
  const filmRadio=descendants(root).find(node=>node.tagName==='input'&&node.value==='film');
  filmRadio.checked=true;filmRadio.onchange();
  assert.equal(moviesOpened,1);
  assert.equal(view.kind,'film');
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
  win.history.pushState({rewind:true,panel:'schedule-overlay'});
  win.location.hash='#guide';
  win.history.pushState({rewind:true,panel:'browse-overlay'});
  win.location.hash='#library';
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

test('the top Page control jumps large collections and stays synchronized with the bottom pager',async()=>{
  const catalogue={channels:[{key:'archive',number:16,name:'Archive',videos:Array.from({length:350},(_,index)=>episode(`archive${String(index).padStart(4,'0')}`,`Catalogue ${index}`,1,1))}]};
  const {root,view}=await libraryFixture(catalogue);
  const top=byLabel(root,'Jump to results page');
  assert.equal(top.children.length,30);
  top.focus();change(top,'28');
  assert.equal(root.ownerDocument.activeElement,top,'jumping retains keyboard focus');
  assert.equal(byLabel(root,'Jump to results pages').value,'28');
  assert.equal(byClass(root,'library-title')[0].dataset.showKey,'show:catalogue 336');
  root.scrollTop=180;root.dispatchEvent(new Event('scroll'));
  view.openDetail('show:catalogue 336');view.openIndex();
  assert.equal(byLabel(root,'Jump to results page').value,'28');
  assert.equal(root.scrollTop,180);
  input(byLabel(root,'Find a show or film'),'Catalogue349');
  assert.equal(byClass(root,'library-title').length,1);
  assert.equal(byLabel(root,'Jump to results page').value,'0');
  assert.equal(byClass(root,'library-page-jump')[0].hidden,true);
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
  assert.equal(catalogue.channels.length,30);
  for(const channel of catalogue.channels) {
    const playable=channel.videos.filter(isBrowsable);
    assert(playable.length>0,channel.name);
    for(const video of playable)assert(reachable.has(video.id),`${channel.name}: ${video.title}`);
  }
  assert.equal(new Set(programmes.map(show=>show.key)).size,programmes.length,'each title has one browse result');
  assert.equal(browseTitles(index,{kind:'programmes',query:'GMM'})[0].episodes.length,89);
  assert.equal(browseTitles(index,{kind:'programmes',query:'FilthyFrank'})[0].episodes.length,66);
});
