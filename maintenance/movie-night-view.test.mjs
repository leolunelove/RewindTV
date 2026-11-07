import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMovieNight} from '../site/movie-night-view.mjs';

function fixture(){
 const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]);
 class Element extends EventTarget{
  constructor(tag,doc){super();this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.dataset={};this.style={};this.className='';this.textContent='';this.hidden=false;this.scrollTop=0;
   this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(' ').filter(name=>!names.includes(name)).join(' ');},toggle:(name,value)=>{if(value)this.classList.add(name);else this.classList.remove(name);}};
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
 const win=new EventTarget();win.localStorage={getItem:()=>null,setItem(){}};win.matchMedia=()=>Object.assign(new EventTarget(),{matches:true});win.performance={now:()=>0};win.requestAnimationFrame=()=>1;win.cancelAnimationFrame=()=>{};
 const doc=Object.assign(new EventTarget(),{defaultView:win,createElement:tag=>new Element(tag,doc)});
 const root=doc.createElement('div'),played=[];
 const film=(id,title,genre)=>({id,title,genre,year:1986,kind:'film',duration:5400,provider:'youtube'});
 const catalogue={channels:[{key:'cinema',videos:[film('charade0001','Charade','Adventure'),film('nomads00001','Nomads','Horror'),film('warfilm0001','The Battle','War'),film('warfilm0002','The Front','War')]}]};
 createMovieNight(root,{catalogue,onPlay:video=>played.push(video)});
 const byClass=name=>root.querySelectorAll('.'+name);
 const genre=name=>byClass('movie-genres')[0].children.find(button=>button.textContent===name);
 const title=()=>byClass('movie-hero')[0].querySelector('h3')?.textContent;
 const search=byClass('movie-tools')[0].querySelector('input');
 return {root,played,byClass,genre,title,search};
}

test('changing film genre updates the hero, selected card and Watch action to the visible collection',()=>{
 const f=fixture();f.byClass('movie-card').find(card=>card.attributes['aria-label']==='Choose Nomads').onclick();
 assert.equal(f.title(),'Nomads');
 f.genre('War').onclick();
 assert.equal(f.title(),'The Battle');assert.equal(f.genre('War').attributes['aria-pressed'],'true');
 assert.deepEqual(f.byClass('movie-card').map(card=>card.attributes['aria-label']),['Choose The Battle','Choose The Front']);
 assert.equal(f.byClass('movie-card').filter(card=>card.attributes['aria-pressed']==='true').length,1);
 f.byClass('movie-hero')[0].querySelector('.movie-play').onclick();assert.equal(f.played[0].title,'The Battle');
});

test('film search keeps the hero in the filtered pool and empty results expose no stale Watch action',()=>{
 const f=fixture();f.genre('War').onclick();f.search.value='The Front';f.search.oninput();
 assert.equal(f.title(),'The Front');assert.equal(f.byClass('movie-card').length,1);
 f.search.value='Nomads';f.search.oninput();
 assert.equal(f.byClass('movie-card').length,0);assert.equal(f.byClass('movie-hero')[0].hidden,true);assert.equal(f.byClass('movie-hero')[0].querySelector('.movie-play'),null);
 f.search.value='';f.search.oninput();assert.equal(f.byClass('movie-hero')[0].hidden,false);assert.equal(f.title(),'The Battle');
});

test('a filtered film spin and return to collection keep the revealed film inside the active genre',()=>{
 const f=fixture();f.genre('War').onclick();f.byClass('movie-hero')[0].querySelector('.movie-pick').onclick();
 const result=f.byClass('movie-reel-result')[0];assert.equal(result.hidden,false);assert.equal(result.querySelector('h3').textContent,'The Front');
 result.querySelector('.movie-play').onclick();assert.equal(f.played[0].genre,'War');
 f.byClass('movie-reel-back')[0].onclick();assert.equal(f.byClass('movie-reel')[0].hidden,true);assert.equal(f.title(),'The Front');assert.equal(f.search.disabled,false);
});
