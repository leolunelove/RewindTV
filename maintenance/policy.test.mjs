import {test} from 'node:test';import assert from 'node:assert/strict';
import {plan,environmentBlocked,update} from './policy.mjs';
test('oldest/unverified sources first; disabled entries and duplicate IDs excluded',()=>{
 assert.deepEqual(plan([{id:'a'},{id:'b'},{id:'b'},{id:'c',enabled:false}],{checked:{a:{at:'2026-10-17'}}}).map(v=>v.id),['b','a']);
});
test('widespread runner failure cannot turn into mass source disablement',()=>{
 assert.equal(environmentBlocked(Array.from({length:10},()=>({status:'browser-identity'}))),true);
 assert.equal(environmentBlocked([{status:'timeout'}]),false);
});
test('sampled playback status records exact coverage and never mutates catalogue',()=>{
 const old={checked:{a:{consecutiveFailures:2}}};const next=update(old,[{id:'a',status:'playing',start:true,tail:true}],'2026-10-17');
 assert.equal(next.checked.a.consecutiveFailures,0);assert.equal(old.checked.a.consecutiveFailures,2);
 assert.equal(next.checked.a.tail,true);
});
