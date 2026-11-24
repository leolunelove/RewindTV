import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SOURCE_FILES,withGameshowAdditions,withExpansion} from '../site/library.mjs';
import {buildShowIndex,findProgramme,pickProgramme} from '../site/show-library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {catalogueForCountry} from '../site/region-eligibility.mjs';
import {createWatchHistory} from '../site/watch-history.mjs';
import {buildMovieLibrary} from '../site/movie-night.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url)));
let base=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));
for(const n of SOURCE_FILES.slice(2).filter(n=>n!=='archive-library.json'))base=withExpansion(base,read(n));
const pack=read('archive-library.json'),cat=withExpansion(base,pack),round=hydrateLibrary(compactLibrary(cat));
const ids=new Set(pack.videos.map(v=>v.id));
test('Archive Library additions preserve all station programmes and both current and next fixed schedules',()=>{
 assert.deepEqual(cat.channels,base.channels);
 const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
 const plan=(c,t)=>scope.RewindSchedule.build(c,Date.parse(t)).schedules.map(rows=>rows.map(r=>[r.video.id,r.start,r.end,r.advert]));
 for(const time of ['2026-11-24T12:00:00Z','2026-12-01T12:00:00Z']){assert.deepEqual(plan(cat,time),plan(base,time));assert.deepEqual(plan(round,time),plan(base,time));}
 for(let n=0;n<100;n++)assert(!ids.has(pickProgramme(cat.channels,{random:()=>n/100}).video.id));
});
test('new sources have explicit creator licence evidence, unique files and actual start/tail samples',()=>{
 const existing=new Set(base.channels.flatMap(c=>c.videos).map(v=>v.id)),files=new Set(),titles=new Set();
 assert.equal(pack.videos.length,22);
 for(const v of pack.videos){assert(!existing.has(v.id));assert(!files.has(v.mediaUrl));files.add(v.mediaUrl);const identity=v.series+'|'+v.title;assert(!titles.has(identity));titles.add(identity);assert(v.rights.attribution&&v.rights.evidenceUrl);assert.match(v.rights.licenseUrl,/^https:\/\/creativecommons\.org\/licenses\//);assert(v.playbackCheck.start&&v.playbackCheck.nearEnd);assert(Math.abs(v.duration-v.playbackCheck.observedDuration)<1);assert.equal(v.completenessReview.wholeRuntimeWatched,false);assert.equal(v.provider,'archive');}
 assert.equal(pack.videos.filter(v=>v.kind==='full episode').length,20);assert.equal(pack.videos.filter(v=>v.kind==='film').length,1);assert.equal(pack.videos.find(v=>v.title==='Big Buck Bunny').kind,'short');
});
test('Library-only programmes survive compact hydration and resolve to ordered playable queues',()=>{
 assert.equal(round.libraryVideos.length,(base.libraryVideos?.length||0)+22);
 const episodes=buildShowIndex(round).find(s=>s.title==='Net Cafe').episodes;
 for(const v of round.libraryVideos.filter(v=>ids.has(v.id))){assert.deepEqual(v.rights,pack.videos.find(x=>x.id===v.id).rights);const result=findProgramme(round,v.channelKey,v.id);assert(result&&result.video.libraryOnly);if(v.series==='Net Cafe')assert.equal(result.queue.length,episodes.length);}
 assert(buildMovieLibrary(round).some(v=>v.title==='Valkaama'));assert(!buildMovieLibrary(round).some(v=>v.title==='Big Buck Bunny'));
});
test('Library additions cannot resurrect disabled or country-blocked records',()=>{
 const v=round.libraryVideos[0],fixture={...round,libraryVideos:[{...v,enabled:false},{...v,id:'region-only',enabled:true,regionRestriction:{allowed:['ES']}}]};
 assert.equal(findProgramme(fixture,v.channelKey,v.id),null);assert.equal(findProgramme(catalogueForCountry(fixture,'GB'),v.channelKey,'region-only'),null);assert(findProgramme(catalogueForCountry(fixture,'ES'),v.channelKey,'region-only'));
});
test('Continue watching restores a Library-only episode in a later session',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},v=round.libraryVideos[0];
 const first=createWatchHistory({storage,now:()=>1000});assert(first.save(v,{position:120,channelKey:v.channelKey}));
 const later=createWatchHistory({storage,now:()=>2000}),record=later.list(round)[0];assert.equal(record.video.id,v.id);assert.equal(record.position,120);assert(findProgramme(round,record.video.channelKey,record.video.id));
});
test('duplicate and invalid Library assignments fail before altering any source',()=>{
 const id=pack.videos[0].id,key=Object.keys(pack.libraryAssignments)[0];assert.throws(()=>withExpansion(cat,{...pack,libraryAssignments:{[key]:[id]}}));assert.throws(()=>withExpansion(base,{...pack,libraryAssignments:{missing:[id]}}));assert.throws(()=>withExpansion(base,{...pack,libraryAssignments:{[key]:[id,id]}}));assert.deepEqual(cat.channels,base.channels);
});

test('programme Info labels a creator licence without mislabelling the source as a fan upload',async()=>{
 const {programmeInfo}=await import('../site/programme-info.mjs');const v=round.libraryVideos[0],info=programmeInfo(v,round.channels.find(c=>c.key===v.channelKey),'ondemand');assert(info.provenance.includes(v.rights.attribution));assert(info.provenance.includes(v.rights.licenseLabel));assert.equal(info.url,v.watchUrl);
});

test('the complete BBS series resolves in order, with eight unique full-file sources',()=>{
 const show=buildShowIndex(round).find(s=>s.title==='BBS: The Documentary');assert(show);assert.equal(show.episodes.length,8);assert.deepEqual(show.episodes.map(v=>v.episodeNumber),[1,2,3,4,5,6,7,8]);assert.equal(new Set(show.episodes.map(v=>v.mediaUrl)).size,8);for(const video of show.episodes)assert.equal(findProgramme(round,video.channelKey,video.id).queue.length,8);
});
