import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPanelMotion} from '../site/panel-motion.mjs';
function fixture(t,reduced=false){
 const old=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:reduced});t.after(()=>{globalThis.matchMedia=old;});
 const panel=new EventTarget();panel.open=false;panel.classList={contains:key=>key==='guide'};panel.showModal=()=>panel.open=true;panel.close=()=>{panel.open=false;panel.dispatchEvent(new Event('close'));};panel.getBoundingClientRect=()=>({left:10,right:90,top:10,bottom:90});
 const animations=[];panel.animate=()=>{let finish;const finished=new Promise(resolve=>finish=resolve);const a={finished,finish,cancel(){this.cancelled=true;}};animations.push(a);return a;};
 const root={querySelectorAll(selector){if(selector==='dialog')return [panel];if(selector==='dialog[open]')return panel.open?[panel]:[];return [];}};
 return {panel,animations,motion:createPanelMotion(root)};
}
test('closing waits for exit and repeated close does not stack',async t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.close(f.panel);assert.equal(f.panel.open,true);assert.equal(f.animations.length,2);f.animations[1].finish();await Promise.resolve();assert.equal(f.panel.open,false);});
test('reopening during exit cancels the pending close',async t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.open(f.panel);f.animations[1].finish();await Promise.resolve();assert.equal(f.panel.open,true);assert.equal(f.animations[1].cancelled,true);});
test('reduced motion closes immediately and Escape follows the same path',t=>{const f=fixture(t,true);f.motion.open(f.panel);const event=new Event('cancel',{cancelable:true});f.panel.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(f.panel.open,false);assert.equal(f.animations.length,0);});
