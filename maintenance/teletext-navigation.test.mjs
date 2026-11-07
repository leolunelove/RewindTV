import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {createGuideOverview} from '../site/guide-overview.mjs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
function fixture(number){const calls=[],c={numberEntry:String(number),clearNumberEntry(){c.numberEntry='';},channels:Array(19),root:{querySelectorAll(){return [{close(){calls.push('close');}}];}},backToTV(){calls.push('watch');},revealControls(){calls.push('watch');},openGuide(){calls.push('index');},openSchedule(){calls.push('guide');},openBrowse(){calls.push('shop');},openMovieNight(){calls.push('movies');},openInfo(){calls.push('info');},panels:{dismiss(panel){panel.close();},open(){calls.push('settings');}},$(){return {};},tune(i){calls.push(i);},setStatus(){calls.push('invalid');}};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function commitNumber(){'),app.indexOf("  document.addEventListener('keydown',e=>{")),c);return {c,calls};}
test('teletext pages close the previous surface and route to the requested page',()=>{for(const [number,action] of [[100,'watch'],[200,'index'],[300,'guide'],[400,'shop'],[500,'info'],[600,'settings'],[700,'movies']]){const f=fixture(number);f.c.commitNumber();assert.deepEqual(f.calls,['close',action]);}});
test('ordinary channel numbers return to watching and retain the original channel order',()=>{const f=fixture(19);f.c.commitNumber();assert.deepEqual(f.calls,['close','watch',18]);});
test('invalid page numbers do not dismiss the current panel or change channel',()=>{const f=fixture(201);f.c.commitNumber();assert.deepEqual(f.calls,['invalid']);});

test('C opens Channels and G opens Guide from watching',()=>{
 const calls=[],context={
  document:{documentElement:{classList:{contains:()=>false}},addEventListener(name,handler){context.handler=handler;}},
  shuffleDialog:{open:false},infoPanel:{open:false},$(){return {open:false};},
  panels:{isOpen:()=>false},openGuide(){calls.push('channels');},openSchedule(){calls.push('guide');}
 };
 vm.createContext(context);
 vm.runInContext(app.slice(app.indexOf("  document.addEventListener('keydown',e=>{"),app.indexOf('  const clockFormatter=')),context);
 for(const key of ['c','g'])context.handler({key,target:{closest:()=>false},preventDefault(){}});
 assert.deepEqual(calls,['channels','guide']);
});

function guideFixture({channels=Array.from({length:30},(_,index)=>({key:'channel-'+index,number:index+1,name:'Channel '+(index+1),mode:'shuffle'})),current=14,height=800}={}) {
 const calls=[];
 const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]);
 const doc={defaultView:{innerHeight:height},createElement(tag){
  const node={tag,ownerDocument:doc,children:[],dataset:{},attributes:{},className:'',
   setAttribute(key,value){this.attributes[key]=String(value);},
   append(...children){this.children.push(...children);},
   replaceChildren(...children){this.children=children;},
   querySelectorAll(selector){return descendants(this).filter(child=>child.tag===selector);},
   focus(){doc.activeElement=this;},
  };
  node.classList={add(name){node.className+=' '+name;}};
  return node;
 }};
 const root=doc.createElement('div');root.parentElement={scrollTop:0};
 const now=Date.now();
 const slots=channels.map((channel,index)=>[
  {video:{id:'now-'+index,series:'Archive Show',title:'Programme '+index,kind:'full episode'},start:now-1000,end:now+60000},
  {video:{id:'advert-'+index,title:'Advert',kind:'advert'},start:now+60000,end:now+90000},
  {video:{id:'next-'+index,series:'Another Show',title:'Next programme '+index,kind:'full episode'},start:now+90000,end:now+180000},
 ]);
 const state={current};
 const guide=createGuideOverview(root,{getChannels:()=>channels,getCurrent:()=>state.current,getNow:index=>({index:0,slot:slots[index][0]}),getRows:index=>slots[index],onDetail:index=>calls.push(['detail',index]),onWatch:index=>calls.push(['watch',index]),onStart:(index,video)=>calls.push(['start',index,video.id])});
 const byClass=name=>descendants(root).filter(node=>node.className.split(' ').includes(name));
 const control=label=>descendants(root).find(node=>node.attributes['aria-label']===label);
 return {root,doc,state,slots,calls,guide,byClass,control};
}

test('Guide opens around the current channel and keeps a browsed page through refreshes',()=>{
 const f=guideFixture();
 const rows=()=>f.byClass('guide-overview-row');
 const first=()=>f.byClass('guide-number')[0].textContent+'  '+f.byClass('guide-channel-name')[0].textContent;
 f.guide.render();
 assert.equal(rows().length,8);
 assert.equal(first(),'09  Channel 9');
 f.root.children.at(-1).children.at(-1).onclick();
 assert.equal(first(),'17  Channel 17');
 f.state.current=1;f.guide.render();
 assert.equal(first(),'17  Channel 17');
 f.guide.showCurrent();
 assert.equal(first(),'01  Channel 1');
 f.doc.defaultView.innerHeight=500;f.guide.showCurrent();
 assert.equal(rows().length,6);
});

test('Guide searches the whole lineup and preserves search focus and inline expansion during playback refreshes',()=>{
 const f=guideFixture();
 f.slots[29][0].video.title='Hidden Science';
 f.guide.render();
 const search=f.control('Find a channel or programme');
 search.value='hidden science';search.oninput();
 assert.equal(f.byClass('guide-overview-row').length,1);
 assert.equal(f.byClass('guide-number')[0].textContent,'30');
 const detail=f.byClass('guide-overview-detail')[0];
 detail.focus();detail.onclick();
 assert.equal(f.byClass('guide-overview-expanded').length,1);
 assert.equal(f.byClass('guide-overview-detail')[0].attributes['aria-expanded'],'true');
 search.focus();
 f.slots[29][2].video.title='A new next episode';
 f.guide.render();
 assert.equal(f.control('Find a channel or programme'),search,'the search element survives ticks');
 assert.equal(f.doc.activeElement,search);
 assert.equal(search.value,'hidden science');
 assert.equal(f.byClass('guide-overview-expanded').length,1);
 assert(f.byClass('guide-programme-title').some(node=>node.textContent.includes('A new next episode')));
});

test('Guide reattaches its retained overview after the shared host renders a full schedule',()=>{
 const f=guideFixture();f.guide.render();
 const search=f.control('Find a channel or programme');
 search.value='Programme';search.oninput();
 f.root.children.at(-1).children.at(-1).onclick();
 f.root.children.at(-1).children.at(-1).onclick();
 assert.equal(f.byClass('guide-number')[0].textContent,'17');
 f.byClass('guide-overview-detail')[0].onclick();
 const tools=f.root.children[0];
 f.root.replaceChildren(f.doc.createElement('section'));
 f.guide.render();
 assert.equal(f.root.children[0],tools,'the original overview controls are reattached');
 assert.equal(f.control('Find a channel or programme'),search);
 assert.equal(search.value,'Programme');
 assert.equal(f.byClass('guide-number')[0].textContent,'17','the browsed page survives schedule detail');
 assert.equal(f.byClass('guide-overview-expanded').length,1);
 assert.equal(f.root.children.at(-1).attributes['aria-label'],'Guide pages');
 f.root.replaceChildren(f.doc.createElement('section'));
 f.guide.showCurrent();
 assert.equal(f.byClass('guide-number')[0].textContent,'09');
 assert.equal(f.control('Find a channel or programme').value,'');
 assert.equal(f.byClass('guide-overview-expanded').length,1);
 assert.equal(f.byClass('guide-channel-name').filter(node=>node.textContent==='Channel 15').length,1);
});

test('Guide genre and schedule filters use stable channel keys without changing playback indices',()=>{
 const channels=[
  {key:'sitcom',number:4,name:'Sitcoms',mode:'scheduled'},
  {key:'andromeda',number:11,name:'Movies',mode:'shuffle'},
  {key:'cartoon-network-classics',number:28,name:'Cartoon Network Classics',mode:'shuffle'},
 ];
 const f=guideFixture({channels,current:0});f.guide.render();
 const filter=f.control('Browse channel genre');
 filter.value='Kids & cartoons';filter.onchange();
 assert.equal(f.byClass('guide-overview-row').length,1);
 assert.equal(f.byClass('guide-number')[0].textContent,'28');
 f.byClass('guide-overview-detail')[0].onclick();
 f.byClass('guide-watch')[0].onclick();
 assert.deepEqual(f.calls,[['watch',2]]);
 filter.value='all';filter.onchange();
 const mode=f.control('Channel schedule type');mode.value='fixed';mode.onchange();
 assert.equal(f.byClass('guide-overview-row').length,1);
 assert.equal(f.byClass('guide-number')[0].textContent,'04');
});

test('inline Guide actions use the real now slot, skip adverts for Next and display Gibraltar times',()=>{
 const f=guideFixture({channels:[{key:'sitcom',number:4,name:'Sitcoms',mode:'scheduled'}],current:0});
 const start=Date.parse('2026-11-10T11:00:00Z');
 f.slots[0][0].start=start;f.slots[0][0].end=start+1200000;
 f.slots[0][2].start=start+1260000;f.slots[0][2].end=start+2460000;
 f.guide.render();f.byClass('guide-overview-detail')[0].onclick();
 assert.deepEqual(f.byClass('guide-programme-label').map(node=>node.textContent),['Now','Next']);
 assert(f.byClass('guide-programme-title')[1].textContent.includes('Next programme 0'));
 assert.deepEqual(f.byClass('guide-programme-time').map(node=>node.textContent),['12:00–12:20','12:21–12:41']);
 f.byClass('guide-watch')[0].onclick();
 f.byClass('guide-start')[0].onclick();
 f.byClass('guide-full-schedule')[0].onclick();
 assert.deepEqual(f.calls,[['watch',0],['start',0,'now-0'],['detail',0]]);
 f.slots[0][0].video.kind='advert';f.guide.render(true);
 assert.equal(f.byClass('guide-start')[0].disabled,true,'adverts never become replay targets');
});

test('a channel tooltip omits an unknown year and retains a supplied year label',()=>{
 const source=app.slice(app.indexOf('      const year=now.slot.video.yearLabel'),app.indexOf("      b.setAttribute('aria-label',`Watch"));
 for(const [yearLabel,expected]of [[undefined,'NOW  — Episode'],['1998–2001','NOW  — Episode (1998–2001)']]){
  const context={b:{},channels:[{name:'Archive',mode:'shuffle'}],i:0,now:{slot:{video:{title:'Episode',yearLabel}}},next:null};
  vm.runInNewContext(source,context);
  assert.equal(context.b.title.split('\n')[1],expected);
 }
});
