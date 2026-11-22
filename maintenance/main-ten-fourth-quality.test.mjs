import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import{createHash}from'node:crypto';
import{SOURCE_FILES,withExpansion,withGameshowAdditions}from'../site/library.mjs';import{buildShowIndex,pickProgramme}from'../site/show-library.mjs';import{compactLibrary,hydrateLibrary}from'../site/runtime-library.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url)));let catalogue=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));for(const n of SOURCE_FILES.slice(2))catalogue=withExpansion(catalogue,read(n));
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/main-ten-fourth-before-2026-11-22.json',import.meta.url))),evidence=JSON.parse(fs.readFileSync(new URL('../docs/main-ten-fourth-100-story-evidence-2026-11-22.json',import.meta.url)));
const pack=read('main-ten-checks-3.json'),retired=new Set(evidence.newRetirements.map(r=>r.id)),versions=id=>catalogue.channels.flatMap(c=>c.videos).filter(v=>v.id===id),digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);const plan=(c,at)=>scope.RewindSchedule.build(c,Date.parse(at)).schedules.slice(0,10);const planHash=rows=>digest(rows.map(a=>a.map(r=>[r.video.id,r.start,r.end,r.advert])));
test('fourth pass preserves source identities, channel order and every current fixed slot',()=>{
 const fields=['id','duration','series','kind','episodeNumber','seasonNumber'],identities=catalogue.channels.flatMap(c=>c.videos.map(v=>({channel:c.key,source:Object.fromEntries(fields.filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]]))}))),ids=[...new Set(catalogue.channels.flatMap(c=>c.videos.map(v=>v.id)))].sort();
 assert.equal(identities.length,fixture.sourceRecordCount);assert.equal(digest(identities),fixture.sourceIdentitySha256);assert.equal(ids.length,fixture.uniqueSourceCount);assert.equal(digest(ids),fixture.sourceIdsSha256);assert.deepEqual(catalogue.channels.map(c=>({key:c.key,number:c.number})),fixture.currentPlan.channels);
 for(const c of [catalogue,hydrateLibrary(compactLibrary(catalogue))])assert.equal(planHash(plan(c,'2026-11-22T12:00:00Z')),fixture.currentPlan.sha256);
 assert(!plan(catalogue,'2026-11-24T12:00:00Z').flat().some(r=>retired.has(r.video.id)));
});
test('two redundant Gadgetinis collections retain all nine reviewed story spans',()=>{
 const r=evidence.resolution;assert.deepEqual(r.retiredIds,['bDmJzIeSCHA','J5qUarVTggM']);assert.equal(r.matches.length,9);
 for(const match of r.matches){assert(match.similarity>.95);assert(match.longestExactWordRun>=75);assert(versions(match.retainedId).some(v=>v.enabled!==false));assert(!retired.has(match.retainedId));}
 for(const id of ['1LuCCQl_T8Y','PqRx6VDOv-U','7XUjOphOv0I','ZynpSxDhfoo',...r.existingSinglesChecked])assert(versions(id).some(v=>v.enabled!==false));
 for(const group of evidence.remainingMpaaGroups)for(const id of group.sources)assert(versions(id).some(v=>v.enabled!==false));
 assert(!buildShowIndex(catalogue).some(s=>s.episodes.some(v=>retired.has(v.id))));
 for(const key of [null,...catalogue.channels.slice(0,10).map(c=>c.key)])for(let i=0;i<30;i++){const p=pickProgramme(catalogue.channels,{channelKey:key,random:()=>i/30});assert(p);assert(!retired.has(p.video.id));}
});
test('confirmed private upload is excluded after controlled retries without inventing a geographic block',()=>{
 const f=evidence.confirmedPrivate;assert.equal(f.watchChecks.length,2);for(const r of f.watchChecks)assert.equal(r.reason,'Private video');assert.equal(f.embedAttempts[0].resultText,'source-error (150)');assert.equal(f.retryWithControls.filter(r=>r[1]==='playing').length,2);assert.equal(f.retryWithControls.find(r=>r[0]===f.id)[1],'source-error (150)');
 for(const v of versions(f.id)){assert.equal(v.enabled,false);assert.equal(v.scheduleUntilWeek,'2026-11-24');assert.match(v.disabledReason,/private video/i);}
 assert(!pack.updates.some(r=>r.id===f.id));assert.equal(f.regionRestrictionInferred,false);
});
test('rolling evidence consolidates 105 successful checks without adding content and fixes the supplement-owned advert label',()=>{
 assert.equal(pack.updates.length,212);assert.equal(new Set(pack.updates.map(r=>r.id)).size,212);assert.equal(evidence.metadataUpdateIds.length,105);const ids=new Set(evidence.metadataUpdateIds),updates=pack.updates.filter(r=>ids.has(r.id));assert.equal(updates.length,105);assert.equal(updates.filter(r=>r.changes.regionRestriction.blocked.length).length,26);
 for(const {changes:c}of updates){assert.equal(c.metadataStatus,'OK');assert(c.playbackCheck.start&&c.playbackCheck.nearEnd);assert.equal(c.availabilityEvidence.worldwidePlaybackVerified,false);assert(!c.regionRestriction.blocked.includes('GI'));}
 assert.deepEqual(pack.videos,[]);assert.deepEqual(pack.channels,[]);assert.deepEqual(pack.assignments,{});assert(!SOURCE_FILES.includes('main-ten-checks-4.json'));
 for(const v of versions('NFSTGS94oBY')){assert.match(v.title,/includes original adverts/);assert.equal(v.sourceType,'archive');assert(v.sourceProvenance);}
 assert(!versions('m6Q8KE0M-gY').length);assert.equal(evidence.newContentAdded,0);
});
