import test from 'node:test';
import assert from 'node:assert/strict';
import {createContinueWatching,resumeTime} from '../site/continue-watching.mjs';

function fixture({kind='all'}={}){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.hidden=false;this.scrollLeft=0;this.scrollTop=0;this.className='';this.textContent='';}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...children);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  focus(){doc.activeElement=this;}
 }
 const doc={activeElement:null,createElement:tag=>new Element(tag)},host=new Element('div'),scroller={scrollTop:0},fallback=new Element('input'),played=[],removed=[];
 let items=[],view;
 const anchor={getBoundingClientRect:()=>({top:200+(view?.element.hidden?0:150)-scroller.scrollTop})};
 view=createContinueWatching(doc,{kind,getItems:()=>items,onResume:record=>played.push(record),onRemove:key=>removed.push(key),scroller,getAnchor:()=>anchor,getFallbackFocus:()=>fallback});host.append(view.element);
 const list=()=>view.element.children[1],rows=()=>list().children,resume=index=>rows()[index].children[0],remove=index=>rows()[index].children[1];
 return {view,doc,list,rows,resume,remove,played,removed,scroller,fallback,setItems:value=>{items=value;view.refresh();}};
}
const entry=(id='one',key='show:one',kind='full episode',position=120)=>({key,video:{id,kind,series:kind==='film'?undefined:'A show',title:kind==='film'?'A film':'Episode '+id,duration:1200,provider:'youtube'},position,duration:1200,updatedAt:10,origin:'shows'});

test('Continue watching stays hidden when empty and shows only the relevant media collection',()=>{
 const f=fixture({kind:'programmes'});assert.equal(f.view.element.hidden,true);
 f.setItems([entry(),entry('film','film:film','film')]);assert.equal(f.rows().length,1);assert.equal(f.view.element.hidden,false);
 const film=fixture({kind:'film'});film.setItems([entry(),entry('film','film:film','film')]);assert.equal(film.rows().length,1);assert.match(film.resume(0).attributes['aria-label'],/Resume A film/);
 assert.equal(f.played.length,0,'rendering never starts playback');
});
test('progress refresh retains native buttons, focus and shelf scroll and Resume uses the latest clock',()=>{
 const f=fixture();f.setItems([entry()]);const button=f.resume(0),remove=f.remove(0);button.focus();f.list().scrollLeft=85;f.scroller.scrollTop=444;
 f.setItems([entry('one','show:one','full episode',180)]);
 assert.equal(f.resume(0),button);assert.equal(f.remove(0),remove);assert.equal(f.doc.activeElement,button);assert.equal(f.list().scrollLeft,85);assert.equal(f.scroller.scrollTop,444);
 assert.match(button.attributes['aria-label'],/at 3:00/);button.onclick();assert.equal(f.played[0].position,180);
});
test('removing a saved title acts on its key and keeps keyboard focus on the next Resume action',()=>{
 const f=fixture();f.setItems([entry(),entry('two','show:two')]);f.remove(0).focus();f.remove(0).onclick();assert.deepEqual(f.removed,['show:one']);
 f.setItems([entry('two','show:two')]);assert.equal(f.doc.activeElement,f.resume(0));f.remove(0).focus();f.setItems([]);assert.equal(f.view.element.hidden,true);assert.equal(f.doc.activeElement,f.fallback);
});
test('a new episode retains a focused Remove action for the same show',()=>{
 const f=fixture();f.setItems([entry()]);f.remove(0).focus();f.setItems([entry('two')]);assert.equal(f.doc.activeElement,f.remove(0));
 f.resume(0).onclick();assert.equal(f.played[0].video.id,'two');
});
test('adding or removing the shelf above results preserves the visible collection anchor',()=>{
 const f=fixture();f.scroller.scrollTop=400;f.setItems([entry()]);assert.equal(f.scroller.scrollTop,550);
 f.setItems([]);assert.equal(f.scroller.scrollTop,400);
});
test('the shelf bounds history to twelve real upload artworks, with lazy images and distinct remove buttons',()=>{
 const f=fixture();f.setItems(Array.from({length:20},(_,index)=>entry('ep'+String(index).padStart(9,'0'),'show:'+index)));
 assert.equal(f.rows().length,12);const image=f.resume(0).children[0];assert.equal(image.loading,'lazy');assert.equal(image.decoding,'async');assert.match(image.src,/i\.ytimg\.com/);
 assert.equal(f.remove(0).tagName,'button');assert.match(f.remove(0).attributes['aria-label'],/^Remove A show from Continue watching$/);
});
test('resume times remain compact for films and sub-minute positions',()=>{assert.equal(resumeTime(9),'0:09');assert.equal(resumeTime(7500),'2:05:00');assert.equal(resumeTime(NaN),'0:00');});
