import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPanelMotion} from '../site/panel-motion.mjs';
function fixture(t,reduced=false,count=1,pageMode=false){
 const old=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:reduced});t.after(()=>{globalThis.matchMedia=old;});
 const animations=[];
 const panels=Array.from({length:count},()=>{const panel=new EventTarget();panel.open=false;panel.hidden=true;panel.hasAttribute=key=>pageMode&&key==='data-tv-page';panel.querySelector=()=>({focus(){panel.focused=true;}});panel.classList={contains:key=>key==='guide'};panel.showModal=()=>panel.open=true;panel.close=()=>{panel.open=false;panel.dispatchEvent(new Event('close'));};panel.getBoundingClientRect=()=>({left:10,right:90,top:10,bottom:90});
 panel.animate=()=>{let finish;const finished=new Promise(resolve=>finish=resolve);const a={finished,finish,cancel(){this.cancelled=true;}};animations.push(a);return a;};return panel;});
 const root={querySelectorAll(selector){if(selector==='dialog, [data-tv-page]')return panels;if(selector==='dialog[open], [data-tv-page]:not([hidden])')return panels.filter(panel=>pageMode?!panel.hidden:panel.open);return [];}};
 return {panel:panels[0],panels,animations,motion:createPanelMotion(root)};
}
test('closing waits for exit and repeated close does not stack',async t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.close(f.panel);assert.equal(f.panel.open,true);assert.equal(f.animations.length,2);f.animations[1].finish();await Promise.resolve();assert.equal(f.panel.open,false);});
test('reopening during exit cancels the pending close',async t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.open(f.panel);f.animations[1].finish();await Promise.resolve();assert.equal(f.panel.open,true);assert.equal(f.animations[1].cancelled,true);});
test('reduced motion closes immediately and Escape follows the same path',t=>{const f=fixture(t,true);f.motion.open(f.panel);const event=new Event('cancel',{cancelable:true});f.panel.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(f.panel.open,false);assert.equal(f.animations.length,0);});

test('opening another panel replaces the first rather than stacking it',t=>{const f=fixture(t,false,2);f.motion.open(f.panels[0]);f.motion.open(f.panels[1]);assert.deepEqual(f.panels.map(p=>p.open),[false,true]);});
test('switching panels cancels an old exit animation before it completes',async t=>{const f=fixture(t,false,2);f.motion.open(f.panels[0]);f.motion.close(f.panels[0]);const exit=f.animations[1];f.motion.open(f.panels[1]);exit.finish();await Promise.resolve();assert.equal(exit.cancelled,true);assert.deepEqual(f.panels.map(p=>p.open),[false,true]);});

test('teletext pages replace one another without opening modal dialogs',t=>{const f=fixture(t,true,2,true);f.motion.open(f.panels[0]);assert.equal(f.panels[0].focused,true);f.motion.open(f.panels[1]);assert.deepEqual(f.panels.map(p=>p.hidden),[true,false]);assert.deepEqual(f.panels.map(p=>p.open),[false,false]);f.motion.close(f.panels[1]);assert.equal(f.panels[1].hidden,true);});
test('Escape dismisses a teletext page',t=>{const f=fixture(t,true,1,true);f.motion.open(f.panel);const e=new Event('keydown',{cancelable:true});e.key='Escape';f.panel.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(f.panel.hidden,true);});
