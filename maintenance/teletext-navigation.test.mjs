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

test('Guide opens around the current channel and keeps a browsed page through refreshes',()=>{
 const doc={defaultView:{innerHeight:800},createElement(tag){return {tag,children:[],classList:{add(){}},setAttribute(){},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;}};}};
 const root=doc.createElement('div');root.ownerDocument=doc;root.parentElement={scrollTop:0};
 const channels=Array.from({length:30},(_,i)=>({name:'Channel '+(i+1),mode:'shuffle'}));let current=14;
 const now=Date.now(),video=index=>({id:String(index),title:'Programme '+index});
 const guide=createGuideOverview(root,{getChannels:()=>channels,getCurrent:()=>current,getNow:index=>({index:0,slot:{video:video(index),start:now-1000,end:now+60000}}),getRows:index=>[{video:video(index)},{video:video(index+1)}],onDetail(){},onWatch(){}});
 const rows=()=>root.children.find(node=>node.className==='guide-overview-list').children;
 const first=()=>rows()[0].children[0].children[0].textContent;
 guide.render();
 assert.equal(rows().length,6);
 assert.equal(first(),'13  Channel 13');
 root.children.at(-1).children.at(-1).onclick();
 assert.equal(first(),'19  Channel 19');
 current=1;guide.render();
 assert.equal(first(),'19  Channel 19');
 guide.showCurrent();
 assert.equal(first(),'01  Channel 1');
 doc.defaultView.innerHeight=500;guide.showCurrent();
 assert.equal(rows().length,4);
});

test('a channel tooltip omits an unknown year and retains a supplied year label',()=>{
 const source=app.slice(app.indexOf('      const year=now.slot.video.yearLabel'),app.indexOf("      b.setAttribute('aria-label',`Watch"));
 for(const [yearLabel,expected]of [[undefined,'NOW  — Episode'],['1998–2001','NOW  — Episode (1998–2001)']]){
  const context={b:{},channels:[{name:'Archive',mode:'shuffle'}],i:0,now:{slot:{video:{title:'Episode',yearLabel}}},next:null};
  vm.runInNewContext(source,context);
  assert.equal(context.b.title.split('\n')[1],expected);
 }
});
