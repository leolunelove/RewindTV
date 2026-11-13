import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {withExpansion,withGameshowAdditions,EXPANSION_PACKS} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex} from '../site/show-library.mjs';import {sectionChannels} from '../site/channel-sections.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url))),name='official-tv-expansion.json',pack=read(name);
function load(include){let cat=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));for(const n of EXPANSION_PACKS)if(!['power-rangers-followup.json','power-rangers-depth.json','power-rangers-regional.json'].includes(n)&&(include||n!==name))cat=withExpansion(cat,read(n));return cat;}
const before=load(false),after=load(true),runtime=hydrateLibrary(compactLibrary(after));
test('official additions retain explicit unrestricted metadata and measured public-origin playback',()=>{
 assert.equal(pack.videos.length,83);const ids=new Set(),episodes=new Set();
 const old=new Set(before.channels.flatMap(c=>c.videos.map(v=>v.id)));
 for(const v of pack.videos){assert(!old.has(v.id));assert(!ids.has(v.id));ids.add(v.id);assert(v.episodeKey&&!episodes.has(v.episodeKey));episodes.add(v.episodeKey);
  assert.equal(v.kind,'full episode');assert.equal(v.sourceType,'official');assert(!v.sourceProvenance,'Official sources must not be labelled Fan/archive');assert(v.uploadTitle&&v.credit&&v.uploadDate);
  assert.equal(v.availabilityEvidence.availableCountryCount,249);assert.equal(v.embeddable,true);assert.equal(v.enabled,true);assert.equal(v.embedStatus,'playing');
  const p=v.playbackCheck;assert(p.start&&p.nearEnd&&p.checkedAt&&p.region);assert(Math.abs(p.observedDuration-v.duration)<3,v.id+' duration mismatch');
  assert.equal(p.origin,'https://tv.leolune.fun');assert(!v.regionRestriction?.allowed&&!v.regionRestriction?.blocked);
  if(v.series.includes('Power Rangers'))assert(v.duration>=1140);
 }
 for(const id of ['sYn471f0pKQ','BRu8Yc8wPqg','3nu9NCLjgaM','KynvmzJI1IE','iTnIcDYATkA'])assert(!ids.has(id),'Held incomplete/overlapping source must remain excluded');
});
test('Power Rangers appends as channel33 while every existing channel and source remains',()=>{
 assert.equal(after.channels.length,before.channels.length+1);assert.equal(after.channels.at(-1).key,'power-rangers');assert.equal(after.channels.at(-1).number,33);assert.equal(after.channels.at(-1).mode,'shuffle');assert.equal(after.channels.at(-1).videos.length,23);
 for(let i=0;i<before.channels.length;i++){const a=before.channels[i],b=after.channels[i];assert.deepEqual([b.key,b.number,b.mode],[a.key,a.number,a.mode]);assert.deepEqual(b.videos.slice(0,a.videos.length),a.videos);}
 const grouped=sectionChannels(runtime.channels).flatMap(s=>s.channels);assert.equal(grouped.length,33);assert.equal(grouped.filter(r=>r.channel.key==='power-rangers').length,1);
});
test('this weeks ten schedules retain exact programme/ad slots; additions wait until17November',()=>{
 const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
 const snapshot=cat=>JSON.stringify(scope.RewindSchedule.build(cat,Date.parse('2026-11-12T12:00:00Z')).schedules.slice(0,10).map(rows=>rows.map(r=>[r.video.id,r.start,r.end,r.advert])));
 assert.equal(snapshot(after),snapshot(before));const ids=new Set(pack.videos.map(v=>v.id));
 for(const c of after.channels.slice(0,10))for(const v of c.videos.filter(v=>ids.has(v.id)))assert.equal(v.scheduleFromWeek,'2026-11-17');
});
test('all accepted programmes reach Library immediately and survive compact data without research payloads',()=>{
 const visible=new Map(buildShowIndex(runtime).flatMap(s=>s.episodes.map(v=>[v.id,v])));for(const v of pack.videos){assert(visible.has(v.id));assert.equal(visible.get(v.id).sourceType,'official');}
 const r=read('runtime-library.json');const shipped=new Set(Object.values(r.videos).map(v=>v.id));for(const v of pack.videos)assert(shipped.has(v.id));assert.equal(runtime.channels.length,33);
});
