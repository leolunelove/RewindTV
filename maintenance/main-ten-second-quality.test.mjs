import{test}from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';import{createHash}from'node:crypto';
import{SOURCE_FILES,withExpansion,withGameshowAdditions}from'../site/library.mjs';import{buildShowIndex,findProgramme,pickProgramme}from'../site/show-library.mjs';import{compactLibrary,hydrateLibrary}from'../site/runtime-library.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url)));let catalogue=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));for(const n of SOURCE_FILES.slice(2))catalogue=withExpansion(catalogue,read(n));
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/main-ten-second-before-2026-11-22.json',import.meta.url))),evidence=JSON.parse(fs.readFileSync(new URL('../docs/main-ten-second-100-story-evidence-2026-11-22.json',import.meta.url))).resolution;
const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);const plan=(c,time)=>scope.RewindSchedule.build(c,Date.parse(time)).schedules.slice(0,10);const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(a=>a.map(r=>[r.video.id,r.start,r.end,r.advert])))).digest('hex');const versions=id=>catalogue.channels.flatMap(c=>c.videos).filter(v=>v.id===id);const retired=new Set(evidence.retiredIds);

test('redundant MPAA bundles retire without changing any current fixed slot or dropping their retained story sources',()=>{
 assert.deepEqual([...retired],['4e7OvP6uceM','9RSCRLSHhKw','P2rpoQr8-hk']);assert.equal(evidence.matches.length,6);
 for(const id of retired){assert.equal(evidence.matches.filter(m=>m.retiredId===id).length,2);for(const v of versions(id)){assert.equal(v.enabled,false);assert.equal(v.scheduleUntilWeek,'2026-11-24');}}
 for(const row of evidence.matches){assert(row.normalisedCaptionSimilarity>.94);assert(row.longestExactWordRun>100);assert(!retired.has(row.retainedId));assert(versions(row.retainedId).some(v=>v.enabled!==false));assert(findProgramme(catalogue,'music',row.retainedId));}
 const now=plan(catalogue,'2026-11-22T12:00:00Z');assert.equal(now.flat().length,fixture.currentPlan.fixedSlots);assert.equal(hash(now),fixture.currentPlan.sha256);
 assert.equal(hash(plan(hydrateLibrary(compactLibrary(catalogue)),'2026-11-22T12:00:00Z')),fixture.currentPlan.sha256);
 const next=plan(catalogue,'2026-11-24T12:00:00Z');assert(!next.flat().some(r=>retired.has(r.video.id)));
 const show=buildShowIndex(catalogue).find(s=>s.title==='My Parents Are Aliens');assert(show);assert(!show.episodes.some(v=>retired.has(v.id)));for(const id of evidence.retainedIds)assert(show.episodes.some(v=>v.id===id));
 for(const channelKey of ['music',null])for(let i=0;i<100;i++){const pick=pickProgramme(catalogue.channels,{channelKey,random:()=>i/100});assert(pick);assert(!retired.has(pick.video.id));}
});

test('second main-ten metadata pack is bounded, source-preserving and ordered after the older evidence',()=>{
 const pack=read('main-ten-checks-2.json');assert.deepEqual(pack.videos,[]);assert.deepEqual(pack.channels,[]);assert.deepEqual(pack.assignments,{});assert.deepEqual(pack.exclusions,[]);assert.equal(pack.updates.length,105);assert.equal(new Set(pack.updates.map(r=>r.id)).size,105);
 assert(SOURCE_FILES.indexOf('main-ten-checks-2.json')>SOURCE_FILES.indexOf('maintenance-checks.json'));assert.equal(SOURCE_FILES.at(-1),'library-health.json');
 assert.equal(pack.updates.filter(r=>r.changes.regionRestriction.blocked.length).length,27);
 for(const{changes}of pack.updates){assert.equal(changes.metadataStatus,'OK');assert(changes.embeddable);assert(changes.playbackCheck.start&&changes.playbackCheck.nearEnd);assert.equal(changes.checkedAt,changes.playbackCheck.checkedAt);assert(!changes.regionRestriction.blocked.includes('GI'));assert.equal(changes.availabilityEvidence.worldwidePlaybackVerified,false);for(const field of ['id','title','series','kind','duration','enabled','scheduleFromWeek','scheduleUntilWeek'])assert(!Object.hasOwn(changes,field));}
 for(const old of fixture.sources){const current=versions(old.id);assert(current.length);for(const v of current){assert.equal(v.id,old.id);assert.equal(v.duration,old.duration);assert.equal(v.series,old.series);assert.equal(v.kind,old.kind);assert.equal(v.episodeNumber,old.episodeNumber);assert.equal(v.seasonNumber,old.seasonNumber);}}
 assert.deepEqual(catalogue.channels.map(c=>({key:c.key,number:c.number})),fixture.currentPlan.channels);
});
