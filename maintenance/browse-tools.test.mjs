import {test} from 'node:test';import assert from 'node:assert/strict';import {browseTitles,pageSlice} from '../site/browse-tools.mjs';
const titles=[{title:'Café',kind:'show',language:'Spanish',channels:[{key:'es'}]},{title:'Cartoons',kind:'collection',channels:[{key:'toons'}]},{title:'西游记',kind:'show',language:'Mandarin Chinese',channels:[{key:'cmn'}]}];
test('index combines alphabet, type, channel and language without losing Unicode titles',()=>{assert.deepEqual(browseTitles(titles,{letter:'C',kind:'show',language:'Spanish',channel:'es'}),[titles[0]]);assert.deepEqual(browseTitles(titles,{letter:'other'}),[titles[2]]);assert.deepEqual(browseTitles(titles,{query:'cafe'}),[titles[0]]);assert.equal(browseTitles(titles,{channel:'missing'}).length,0);});
test('paged browse reaches every result exactly once and clamps stale pages after filtering',()=>{const xs=Array.from({length:23},(_,i)=>i);assert.deepEqual(Array.from({length:8},(_,i)=>pageSlice(xs,i,3).items).flat(),xs);assert.equal(pageSlice(xs,100,3).page,7);assert.deepEqual(pageSlice([],9,3),{items:[],page:0,pages:1,total:0});});

test('programmes combines playable TV, creator videos and music while leaving films and source-only listings out',()=>{
 const records=[
  {title:'Science Club',kind:'show',episodes:[{id:'tv'}]},
  {title:'Good Mythical Morning',kind:'collection',episodes:[{id:'gmm'}]},
  {title:'Filthy Frank',kind:'collection',episodes:[{id:'frank'}]},
  {title:'Proximity',kind:'collection',episodes:[{id:'music'}]},
  {title:'A Feature',kind:'film',episodes:[{id:'film'}]},
  {title:'A Listed Show',kind:'show',episodes:[]},
  {title:'Source Collection',kind:'collection',episodes:[]},
 ];
 assert.deepEqual(browseTitles(records,{kind:'programmes'}),records.slice(0,4));
 assert.deepEqual(browseTitles(records,{kind:'programmes',query:'GMM'}),[records[1]]);
 assert.deepEqual(browseTitles(records,{kind:'programmes',query:'FilthyFrank'}),[records[2]]);
 assert.deepEqual(browseTitles(records,{kind:'show'}),[records[0],records[5]],'the existing TV-only filter retains its original meaning');
});

test('Collections finds labelled television bundles as well as creator collections without changing the playable queues',()=>{
 const bundle={title:'Gadget Boy',kind:'show',episodes:[{id:'original',formatLabel:'Collection · multiple episodes'}]};
 const creator={title:'Classic creator',kind:'collection',episodes:[{id:'web'}]};
 const single={title:'A Series',kind:'show',episodes:[{id:'single',formatLabel:'Full episode'}]};
 const rows=[bundle,creator,single];assert.deepEqual(browseTitles(rows,{kind:'collection'}),[bundle,creator]);assert.deepEqual(bundle.episodes,[{id:'original',formatLabel:'Collection · multiple episodes'}]);
 assert.deepEqual(browseTitles(rows,{kind:'collection',query:'gadget'}),[bundle]);
});
