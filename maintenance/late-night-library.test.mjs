import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withExpansion,withGameshowAdditions,EXPANSION_PACKS} from '../site/library.mjs';
import {buildShowIndex} from '../site/show-library.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url)));
const name='late-night-library.json',pack=read(name);
const base=EXPANSION_PACKS.filter(n=>n!==name).reduce((c,n)=>withExpansion(c,read(n)),withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json')));
const expanded=EXPANSION_PACKS.reduce((c,n)=>withExpansion(c,read(n)),withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json')));
const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);

test('curated uploads have unique identities, aged source evidence and actual embed samples',()=>{
 const old=new Set(base.channels.flatMap(c=>c.videos.map(v=>v.id))),ids=new Set(),keys=new Set();
 for(const v of pack.videos){
  assert(!old.has(v.id)&&!ids.has(v.id)&&!keys.has(v.episodeKey),v.id);
  ids.add(v.id);keys.add(v.episodeKey);
  assert(v.uploadDate<='2023-11-06'&&v.uploaderUrl&&v.uploader&&v.uploadTitle,v.id);
  assert(['full episode','film'].includes(v.kind)&&v.duration>=240&&v.embeddable,v.id);
  assert(v.playbackCheck.start&&v.playbackCheck.nearEnd&&v.playbackCheck.checkedAt,v.id);
  assert.equal(v.availabilityEvidence.availableCountryCount,249);
 }
 assert.deepEqual(ids,new Set(Object.values(pack.assignments).flat()));
});

test('the complete first season of Code Lyoko is available on demand in episode order',()=>{
 const lyoko=buildShowIndex(expanded).find(s=>s.title==='Code Lyoko');
 assert(lyoko);
 assert.deepEqual(lyoko.episodes.map(v=>v.episodeNumber),Array.from({length:26},(_,i)=>i+1));
 assert.deepEqual(lyoko.channels.map(c=>c.name),['Toon Action']);
});

test('this week’s ten broadcasts are unchanged; their new episodes enter on 10 November',()=>{
 const {build}=scope.RewindSchedule,now=Date.parse('2026-11-06T12:00:00Z');
 assert.equal(JSON.stringify(build(base,now)),JSON.stringify(build(expanded,now)));
 const boundary=Date.parse('2026-11-09T23:00:00Z');
 const newIds=new Set(pack.videos.map(v=>v.id));
 for(const c of expanded.channels.filter(c=>c.mode!=='shuffle')){
  const fresh=c.videos.filter(v=>newIds.has(v.id));
  if(!fresh.length)continue;
  const isolated={...expanded,channels:[{...c,videos:fresh}]};
  assert.equal(build(isolated,boundary-1).schedules[0].length,0);
  const eligible=new Set(build(isolated,boundary).schedules[0].map(s=>s.video.id));
  assert(fresh.every(v=>eligible.has(v.id)));
 }
});

test('the curated films join Movie Night as distinct features',async()=>{
 const {buildMovieLibrary,filmIdentity}=await import('../site/movie-night.mjs');
 const existing=new Set(buildMovieLibrary(base).map(filmIdentity));
 const available=new Set(buildMovieLibrary(expanded).map(v=>v.id));
 for(const v of pack.videos.filter(v=>v.kind==='film')){
  assert(!existing.has(filmIdentity(v)),v.title);
  assert(available.has(v.id),v.title);
  assert(v.duration>5000);
 }
});
