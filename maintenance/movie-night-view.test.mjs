import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMovieNight} from '../site/movie-night-view.mjs';

function fixture({catalogue:provided,storage=new Map([['rewind-film-browse-v1',JSON.stringify({order:'az',seed:'fixture'})]]),continueOptions={},reducedMotion=true}={}){
 const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]);
 class Element extends EventTarget{
  constructor(tag,doc){super();this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.dataset={};this.style={};this.className='';this.textContent='';this.hidden=false;this.scrollTop=0;
   this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(' ').filter(name=>!names.includes(name)).join(' ');},toggle:(name,value)=>{if(value)this.classList.add(name);else this.classList.remove(name);},contains:name=>this.className.split(' ').includes(name)};
  }
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=String(value);}
  querySelectorAll(selector){return descendants(this).filter(node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tagName===selector);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  closest(){return null;}
  focus(){this.ownerDocument.activeElement=this;}
  scrollTo({top}){this.scrollTop=top;}
  get firstElementChild(){return this.children[0]||null;}
 }
 const win=new EventTarget();win.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};win.matchMedia=()=>Object.assign(new EventTarget(),{matches:reducedMotion});win.performance={now:()=>0};win.requestAnimationFrame=()=>1;win.cancelAnimationFrame=()=>{};
 const doc=Object.assign(new EventTarget(),{defaultView:win,createElement:tag=>new Element(tag,doc)});
 const root=doc.createElement('div'),played=[],page=Object.assign(new EventTarget(),{hidden:false}),shell=new EventTarget();root.closest=selector=>selector==='[data-tv-page]'?page:selector==='#rewind-tv'?shell:null;
 const film=(id,title,genre)=>({id,title,genre,year:1986,kind:'film',duration:5400,provider:'youtube'});
 const catalogue=provided||{channels:[{key:'cinema',videos:[film('charade0001','Charade','Adventure'),film('nomads00001','Nomads','Horror'),film('warfilm0001','The Battle','War'),film('warfilm0002','The Front','War')]}]};
 const view=createMovieNight(root,{catalogue,onPlay:video=>played.push(video),...continueOptions});
 const byClass=name=>root.querySelectorAll('.'+name);
 const genreControl=byClass('movie-genre')[0],genre=value=>{genreControl.value=value;genreControl.onchange();};
 const title=()=>byClass('movie-hero')[0].querySelector('h3')?.textContent;
 const search=byClass('movie-tools')[0].querySelector('input');
 return {root,doc,win,page,shell,storage,played,byClass,genre,genreControl,title,search,view};
}

test('changing film genre updates the hero, selected card and Watch action to the visible collection',()=>{
 const f=fixture();f.byClass('movie-card').find(card=>card.attributes['aria-label']==='Choose Nomads').onclick();
 assert.equal(f.title(),'Nomads');
 assert.equal(f.genreControl.tagName,'select');assert.equal(f.genreControl.attributes['aria-label'],'Film genre');
 assert.deepEqual(f.genreControl.children.map(option=>option.value),['all','Adventure','Horror','War']);
 f.genre('War');
 assert.equal(f.title(),'The Battle');assert.equal(f.genreControl.value,'War');
 assert.deepEqual(f.byClass('movie-card').map(card=>card.attributes['aria-label']),['Choose The Battle','Choose The Front']);
 assert.equal(f.byClass('movie-card').filter(card=>card.attributes['aria-pressed']==='true').length,1);
 f.byClass('movie-hero')[0].querySelector('.movie-play').onclick();assert.equal(f.played[0].title,'The Battle');
});

test('Films renders the complete collection with lazy artwork and mixes its order without starting playback',()=>{
 const videos=Array.from({length:114},(_,index)=>({id:'film'+String(index).padStart(7,'0'),title:'Film '+index,kind:'film',year:1998,duration:5400,genre:index%2?'Horror':'Comedy',provider:'youtube'}));
 const f=fixture({catalogue:{channels:[{key:'cinema',videos}]}});
 const ids=()=>f.byClass('movie-card').map(card=>card.attributes['aria-label']);
 const original=ids();assert.equal(original.length,114);assert.equal(new Set(original).size,114);assert.equal(f.byClass('movie-more').length,0);
 assert(f.byClass('movie-card').every(card=>card.querySelector('img').loading==='lazy'));
 const mix=f.byClass('movie-mix')[0];mix.focus();mix.onclick();const mixed=ids();
 assert.equal(mix.textContent,'Mix again');assert.equal(f.doc.activeElement,mix);assert.notDeepEqual(mixed,original);assert.deepEqual(new Set(mixed),new Set(original));assert.equal(f.played.length,0);
 const firstSeed=JSON.parse(f.storage.get('rewind-film-browse-v1')).seed;
 f.genre('Horror');assert.deepEqual(ids(),mixed.filter(label=>Number(label.match(/\d+$/)[0])%2));
 f.genre('all');assert.deepEqual(ids(),mixed,'clearing a filter preserves the same mixed order');
 const order=f.byClass('movie-order')[0].querySelector('select');order.value='az';order.onchange();assert.deepEqual(ids(),original);assert.equal(JSON.parse(f.storage.get('rewind-film-browse-v1')).seed,firstSeed);
 order.value='mix';order.onchange();assert.deepEqual(ids(),mixed);mix.onclick();assert.notEqual(JSON.parse(f.storage.get('rewind-film-browse-v1')).seed,firstSeed);assert.deepEqual(new Set(ids()),new Set(original));assert.equal(f.played.length,0);
});

test('film filters retain their focused controls and browse state survives leaving, returning and reload',()=>{
 const f=fixture();f.genreControl.focus();f.genre('War');assert.equal(f.doc.activeElement,f.genreControl,'genre activation retains the same native control');
 f.search.focus();f.search.value='The';f.search.oninput();assert.equal(f.doc.activeElement,f.search);
 f.byClass('movie-mix')[0].onclick();const order=f.byClass('movie-card').map(card=>card.attributes['aria-label']);
 f.root.scrollTop=777;f.root.dispatchEvent(new Event('scroll'));
 f.page.hidden=true;f.page.dispatchEvent(new Event('close'));f.root.scrollTop=0;f.shell.dispatchEvent(new Event('rewind:viewchange'));
 f.page.hidden=false;f.shell.dispatchEvent(new Event('rewind:viewchange'));
 assert.equal(f.root.scrollTop,777);assert.equal(f.search.value,'The');assert.equal(f.genreControl.value,'War');assert.deepEqual(f.byClass('movie-card').map(card=>card.attributes['aria-label']),order);
 const reopened=fixture({storage:f.storage});assert.equal(reopened.root.scrollTop,777);assert.equal(reopened.search.value,'The');assert.equal(reopened.genreControl.value,'War');assert.deepEqual(reopened.byClass('movie-card').map(card=>card.attributes['aria-label']),order);assert.equal(reopened.played.length,0);
});

test('blocked browser storage does not prevent continuous film browsing or explicit mixing',()=>{
 const f=fixture({storage:{get(){throw Error('Storage blocked');},set(){throw Error('Storage blocked');}}});
 assert.equal(f.byClass('movie-card').length,4);f.byClass('movie-mix')[0].onclick();
 assert.equal(f.byClass('movie-card').length,4);assert.equal(f.played.length,0);
});

test('film search keeps the hero in the filtered pool and empty results expose no stale Watch action',()=>{
 const f=fixture();f.genre('War');f.search.value='The Front';f.search.oninput();
 assert.equal(f.title(),'The Front');assert.equal(f.byClass('movie-card').length,1);
 f.search.value='Nomads';f.search.oninput();
 assert.equal(f.byClass('movie-card').length,0);assert.equal(f.byClass('movie-hero')[0].hidden,true);assert.equal(f.byClass('movie-hero')[0].querySelector('.movie-play'),null);
 f.search.value='';f.search.oninput();assert.equal(f.byClass('movie-hero')[0].hidden,false);assert.equal(f.title(),'The Battle');
});

test('a filtered film spin and return to collection keep the revealed film inside the active genre',()=>{
 const f=fixture({reducedMotion:false});f.genre('War');f.byClass('movie-hero')[0].querySelector('.movie-pick').onclick();
 const result=f.byClass('movie-reel-result')[0];assert.equal(result.hidden,true);assert.equal(f.genreControl.disabled,true);assert.equal(f.search.disabled,true);
 f.byClass('movie-skip')[0].onclick();assert.equal(result.hidden,false);assert.equal(result.querySelector('h3').textContent,'The Front');
 result.querySelector('.movie-play').onclick();assert.equal(f.played[0].genre,'War');
 f.byClass('movie-reel-back')[0].onclick();assert.equal(f.byClass('movie-reel')[0].hidden,true);assert.equal(f.title(),'The Front');assert.equal(f.search.disabled,false);assert.equal(f.genreControl.disabled,false);assert.equal(f.genreControl.value,'War');
});


test('Films Continue watching updates only its own row and resumes without changing film filters or selection',()=>{
 let records=[{key:'film:charade0001',video:{id:'charade0001',title:'Charade',kind:'film',provider:'youtube',duration:5400,channelKey:'cinema'},position:120,duration:5400,origin:'films'}];const resumed=[];
 const f=fixture({continueOptions:{getContinueWatching:()=>records,onResume:record=>resumed.push(record)}});
 assert.equal(f.byClass('continue-item').length,1);const button=f.byClass('continue-resume')[0],card=f.byClass('movie-card')[0];
 f.genre('War');f.search.value='The';f.search.oninput();const selected=f.title();f.root.scrollTop=777;button.focus();records=[{...records[0],position:240}];f.view.refreshContinueWatching();
 assert.equal(f.root.scrollTop,777);assert.equal(f.doc.activeElement,button);assert.equal(f.search.value,'The');assert.equal(f.genreControl.value,'War');assert.equal(f.title(),selected);assert.equal(f.played.length,0);
 button.onclick();assert.equal(resumed[0].position,240);assert.equal(resumed[0].video.title,'Charade');
});
