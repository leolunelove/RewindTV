import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {countLibraryStories,libraryCountLabel,libraryQueueState} from '../site/library-meta.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex} from '../site/show-library.mjs';
import {catalogueForCountry} from '../site/region-eligibility.mjs';

test('story totals count double bills once per canonical story and keep numbered holiday episodes in their season',()=>{
 const rows=[
  {id:'one',seasonNumber:1,episodeNumber:1},
  {id:'double',seasonNumber:1,episodeNumber:2,coveredEpisodeNumbers:[2,3,3]},
  {id:'alternate-three',seasonNumber:1,episodeNumber:3},
  {id:'holiday',seasonNumber:1,episodeNumber:4,formatLabel:'Christmas special'},
  {id:'standalone',seasonNumber:1,formatLabel:'TV special'},
 ];
 assert.deepEqual(countLibraryStories(rows),{episodes:4,specials:1,uploads:5});assert.equal(libraryCountLabel(rows),'4 episodes · 1 special');
 assert.equal(libraryCountLabel([rows[1]]),'2 episodes');assert.equal(libraryCountLabel([rows[4]]),'1 special');
 assert.equal(libraryCountLabel([{id:'unlabelled'}]),'1 episode');assert.equal(libraryCountLabel([]),'0 episodes');
 assert.equal(libraryCountLabel([{id:'a'},{id:'b'}],'collection'),'2 videos');assert.equal(libraryCountLabel([{id:'a'}],'film'),'1 film');
});
test('missing season identity does not merge unrelated unnumbered or separately uploaded episodes',()=>{
 const rows=[{id:'first',episodeNumber:1},{id:'second',episodeNumber:1},{id:'unknown'}, {id:'later',seasonNumber:2,episodeNumber:1}];
 assert.equal(countLibraryStories(rows).episodes,4);assert.equal(countLibraryStories([...rows,rows[0]]).uploads,4);
});
test('real Samurai metadata survives compaction with truthful per-country story and special counts',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url)));
 const videos=['power-rangers-followup.json','power-rangers-depth.json','power-rangers-regional.json'].flatMap(name=>read(name).videos).filter(video=>['Power Rangers Samurai','Power Rangers Super Samurai'].includes(video.series));
 const source={channels:[{key:'power-rangers',name:'Power Rangers',number:33,videos}],adverts:[]};
 const compact=compactLibrary(source),runtime=hydrateLibrary(compact),double=runtime.channels[0].videos.find(video=>video.id==='J7bku2b0kVc');
 assert.deepEqual(double.coveredEpisodeNumbers,[3,4]);assert.equal(double.formatLabel,'Two complete episodes · 3–4');
 const labels=country=>new Map(buildShowIndex(catalogueForCountry(runtime,country)).map(show=>[show.title,libraryCountLabel(show.episodes,show.kind)]));
 assert.equal(labels('GI').get('Power Rangers Samurai'),'22 episodes · 1 special');assert.equal(labels('GI').get('Power Rangers Super Samurai'),'22 episodes');
 assert.equal(labels('CN').get('Power Rangers Samurai'),'3 episodes · 1 special');assert.equal(labels('CN').get('Power Rangers Super Samurai'),'3 episodes');
 assert.equal(runtime.channels[0].videos.length,videos.length);assert.deepEqual(source.channels[0].videos.find(video=>video.id===double.id).coveredEpisodeNumbers,[3,4]);
});
test('a paused excluded queue entry has no zero ordinal or Previous action and Next points at the first available entry',()=>{
 const queue=[{id:'one'},{id:'two'}],excluded={id:'excluded',kind:'full episode'};
 const state=libraryQueueState(queue,-1,excluded,{blocked:true});assert.equal(state.position,'Unavailable in this country');assert.equal(state.previousIndex,null);assert.equal(state.nextIndex,0);assert.equal(state.nextLabel,'Play an available programme');
 const empty=libraryQueueState([],-1,excluded,{blocked:true});assert.equal(empty.previousIndex,null);assert.equal(empty.nextIndex,null);
 const first=libraryQueueState(queue,0,queue[0]);assert.equal(first.position,'Programme 1 of 2');assert.equal(first.previousIndex,null);assert.equal(first.nextIndex,1);
 const last=libraryQueueState(queue,1,queue[1]);assert.equal(last.previousIndex,0);assert.equal(last.nextIndex,null);
});
