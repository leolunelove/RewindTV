import {test} from 'node:test';import assert from 'node:assert/strict';import {filterTitles,pageItems} from '../site/library-view.mjs';
test('library search combines the title query and selected media type',()=>{const titles=[{title:'Café',kind:'show'},{title:'Cafe Society',kind:'film'},{title:'Music',kind:'collection'}];assert.deepEqual(filterTitles(titles,'cafe','show'),[titles[0]]);assert.deepEqual(filterTitles(titles,'','film'),[titles[1]]);assert.equal(filterTitles(titles,'no match').length,0);});
test('large episode collections remain bounded until another page is requested',()=>{const episodes=Array.from({length:805},(_,i)=>i);assert.equal(pageItems(episodes).length,30);assert.equal(pageItems(episodes,60).length,60);assert.equal(pageItems(episodes,0).length,0);assert.equal(pageItems(episodes,900).length,805);});

test('listed titles are searchable without exposing preview IDs to the player',async()=>{
 const {buildShowIndex,findProgramme}=await import('../site/show-library.mjs');
 const video={id:'episode',series:'A Show',title:'Episode 1',duration:1200,kind:'full episode'};
 const catalogue={channels:[{key:'retro',name:'Retro',number:1,videos:[video]}]};
 const listings=[
  {title:'A Show',channelKey:'retro',links:[{label:'Promo',url:'https://www.youtube.com/watch?v=preview'}]},
  {title:'A Missing Show',channelKey:'retro',links:[]}
 ];
 const shows=buildShowIndex(catalogue,listings);
 assert.equal(filterTitles(shows,'','listed')[0].title,'A Missing Show');
 assert.equal(shows.find(show=>show.title==='A Show').episodes.length,1);
 assert.equal(findProgramme(catalogue,'retro','preview'),null);
});
