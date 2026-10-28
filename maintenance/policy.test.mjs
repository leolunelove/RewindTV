import {test} from 'node:test';import assert from 'node:assert/strict';
import {plan,environmentBlocked,update,classify} from './policy.mjs';
test('oldest/unverified sources first; disabled entries and duplicate IDs excluded',()=>{
 assert.deepEqual(plan([{id:'a'},{id:'b'},{id:'b'},{id:'c',enabled:false}],{checked:{a:{at:'2026-10-17'}}}).map(v=>v.id),['b','a']);
});
test('widespread runner failure cannot turn into mass source disablement',()=>{
 assert.equal(environmentBlocked(Array.from({length:10},()=>({status:'browser-identity'}))),true);
 assert.equal(environmentBlocked([{status:'timeout'}]),false);
 assert.equal(environmentBlocked(Array.from({length:10},()=>({status:'unavailable',code:150}))),true);
 assert.equal(environmentBlocked([{status:'unavailable',code:150},...Array.from({length:9},()=>({status:'playing'}))]),false);
});
test('sampled playback status records exact coverage and never mutates catalogue',()=>{
 const old={checked:{a:{consecutiveFailures:2}}};const next=update(old,[{id:'a',status:'playing',start:true,tail:true}],'2026-10-17');
 assert.equal(next.checked.a.consecutiveFailures,0);assert.equal(old.checked.a.consecutiveFailures,2);
 assert.equal(next.checked.a.tail,true);
});

test('blocked runner attempts do not poison earlier successful source evidence',()=>{const old={checked:{a:{at:'old',status:'playing',consecutiveFailures:0,start:true,tail:true}}};const next=update(old,[{id:'a',provider:'youtube',status:'source-error',code:150}],'new',{blockedProviders:['youtube']});assert.equal(next.checked.a.status,'playing');assert.equal(next.checked.a.at,'old');assert.equal(next.checked.a.consecutiveFailures,0);assert.equal(next.checked.a.lastAttemptStatus,'runner-blocked');});

test('only repeated explicit source errors with a healthy control enter source review',()=>{const attempts=[{status:'source-error',code:150},{status:'source-error',code:150}];assert.equal(classify({status:'source-error',attempts},false),'runner-blocked');assert.equal(classify({status:'source-error',attempts},true),'source-review');assert.equal(classify({status:'timeout',attempts:[{status:'timeout'},{status:'timeout'}]},true),'transient');});
test('bounded batches cover both media providers when available',()=>{assert.deepEqual(plan([{id:'a'},{id:'b'},{id:'c',provider:'archive'}],{checked:{}},2).map(v=>v.id),['a','c']);});
