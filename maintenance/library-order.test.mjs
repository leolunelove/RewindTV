import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderLibrary,createLibrarySeed} from '../site/library-order.mjs';

const titles=Array.from({length:350},(_,index)=>({key:`show:${index}`,title:`Catalogue ${index}`}));
test('Mixed Library is a full unique permutation independent of catalogue input order',()=>{
  const first=orderLibrary(titles,{seed:'evening'});
  assert.equal(first.length,350);
  assert.equal(new Set(first.map(item=>item.key)).size,350);
  assert.deepEqual(first,orderLibrary([...titles].reverse(),{seed:'evening'}));
  assert.notDeepEqual(first,titles);
  assert.notDeepEqual(first,orderLibrary(titles,{seed:'another-evening'}));
});
test('search and channel filters preserve the Mixed Library relative order',()=>{
  const selected=new Set(titles.filter((_,index)=>index%3===0).map(item=>item.key));
  const full=orderLibrary(titles,{seed:'held'});
  const filtered=orderLibrary(titles.filter(item=>selected.has(item.key)),{seed:'held'});
  assert.deepEqual(filtered,full.filter(item=>selected.has(item.key)));
});
test('A–Z has numeric-aware title order and duplicates are removed by title identity',()=>{
  const input=[titles[10],titles[2],titles[0],{...titles[2]},titles[1]];
  assert.deepEqual(orderLibrary(input,{mode:'az'}),[titles[0],titles[1],titles[2],titles[10]]);
  const films=[{id:'a',name:'Beta'},{id:'b',name:'Alpha'},{id:'a',name:'Beta'}];
  assert.deepEqual(orderLibrary(films,{mode:'az',key:item=>item.id,title:item=>item.name}),[films[1],films[0]]);
});
test('fresh mix seeds are bounded and differ from the previous saved seed',()=>{
  let seed='first';
  for(let index=0;index<100;index++) {
    const next=createLibrarySeed(seed);
    assert.notEqual(next,seed);assert(next.length<32);seed=next;
  }
});
