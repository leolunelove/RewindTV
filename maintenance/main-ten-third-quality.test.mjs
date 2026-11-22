import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {SOURCE_FILES,withExpansion,withGameshowAdditions} from '../site/library.mjs';
import {buildShowIndex,findProgramme,pickProgramme} from '../site/show-library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url)));
let catalogue=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));
for(const n of SOURCE_FILES.slice(2))catalogue=withExpansion(catalogue,read(n));
const originalIds=new Set(JSON.parse(fs.readFileSync(new URL('../docs/main-ten-third-100-playback-2026-11-22.json',import.meta.url))).results.map(r=>r.id));
const rollingPack=read('main-ten-checks-3.json');
const pack={...rollingPack,updates:rollingPack.updates.filter(r=>originalIds.has(r.id)),retirements:rollingPack.retirements.filter(r=>['P2Rq1knipkk','lQdzaHy7sbw','nSs6uToQ534','GWOWnrtRhtc'].includes(r.id))};
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/main-ten-third-before-2026-11-22.json',import.meta.url)));
const evidence=JSON.parse(fs.readFileSync(new URL('../docs/main-ten-third-100-story-evidence-2026-11-22.json',import.meta.url)));
const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
const plan=(c,at)=>scope.RewindSchedule.build(c,Date.parse(at)).schedules.slice(0,10);
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(a=>a.map(r=>[r.video.id,r.start,r.end,r.advert])))).digest('hex');
const versions=id=>catalogue.channels.flatMap(c=>c.videos).filter(v=>v.id===id);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('third main-ten pass keeps every source identity and all current fixed slots',()=>{
 assert.deepEqual(catalogue.channels.map(c=>({key:c.key,number:c.number})),fixture.currentPlan.channels);
 const ids=[...new Set(catalogue.channels.flatMap(c=>c.videos.map(v=>v.id)))].sort();assert.equal(ids.length,fixture.uniqueSourceCount);assert.equal(digest(ids),fixture.sourceIdsSha256);
 const fields=['id','duration','series','kind','episodeNumber','seasonNumber'];
 const identities=catalogue.channels.flatMap(c=>c.videos.map(v=>({channel:c.key,source:Object.fromEntries(fields.filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]]))})));
 assert.equal(identities.length,fixture.sourceRecordCount);assert.equal(digest(identities),fixture.sourceIdentitySha256);
 for(const c of [catalogue,hydrateLibrary(compactLibrary(catalogue))])assert.equal(hash(plan(c,'2026-11-22T12:00:00Z')),fixture.currentPlan.sha256);
 const next=plan(catalogue,'2026-11-24T12:00:00Z').flat();
 assert(!next.some(r=>pack.retirements.some(x=>x.id===r.video.id)));
});

test('verified duplicate retirements retain all twelve reviewed story spans and remain out of Library and both shuffle scopes',()=>{
 const matches=evidence.resolution.matches;assert.equal(matches.length,12);
 assert.deepEqual(evidence.resolution.retiredIds,['P2Rq1knipkk','lQdzaHy7sbw','nSs6uToQ534']);
 for(const row of matches){assert(row.similarity>.94);assert(row.longestExactWordRun>75);assert(versions(row.retainedId).some(v=>v.enabled!==false));}
 const retired=new Set(pack.retirements.map(r=>r.id));assert.equal(retired.size,4);
 for(const id of retired){assert(versions(id).length);for(const v of versions(id)){assert.equal(v.enabled,false);assert.equal(v.scheduleUntilWeek,'2026-11-24');}assert(!findProgramme(catalogue,'music',id));}
 assert(!buildShowIndex(catalogue).some(s=>s.episodes.some(v=>retired.has(v.id))));
 assert(versions('Qc8P_MtLl8E').every(v=>v.title==='Ship of Friends + The Love Bug'));
 for(const group of evidence.remainingPartialGroups)for(const id of group.sources)assert(versions(id).some(v=>v.enabled!==false));
 for(const channelKey of [null,...catalogue.channels.slice(0,10).map(c=>c.key)])for(let i=0;i<50;i++){const r=pickProgramme(catalogue.channels,{channelKey,random:()=>i/50});assert(r);assert(!retired.has(r.video.id));}
});

test('107 bounded metadata updates do not add content or claim worldwide or full-runtime validation',()=>{
 assert.deepEqual(pack.videos,[]);assert.deepEqual(pack.channels,[]);assert.deepEqual(pack.assignments,{});assert.deepEqual(pack.exclusions,[]);
 assert.equal(pack.updates.length,107);assert.equal(new Set(pack.updates.map(r=>r.id)).size,107);
 assert.equal(pack.updates.filter(r=>r.changes.regionRestriction.blocked.length).length,28);
 for(const {id,changes:c} of pack.updates){assert.equal(c.metadataStatus,'OK');assert(c.embeddable&&c.playbackCheck.start&&c.playbackCheck.nearEnd);assert.equal(c.playbackCheck.checkedAt,c.checkedAt);assert.equal(c.availabilityEvidence.worldwidePlaybackVerified,false);assert(!c.regionRestriction.blocked.includes('GI'));assert(versions(id).length);}
 assert(SOURCE_FILES.indexOf('main-ten-checks-3.json')>SOURCE_FILES.indexOf('main-ten-checks-2.json'));assert.equal(SOURCE_FILES.at(-1),'library-health.json');
});

test('deferred retirement validates before mutation and reaches every pre-existing variant',()=>{
 const source={channels:[{key:'a',videos:[{id:'retire',enabled:true},{id:'keep',enabled:true}]},{key:'b',videos:[{id:'retire',enabled:true}]}]};
 const base={version:1,videos:[],channels:[],assignments:{},retirements:[{id:'retire',reason:'Duplicate story retained',scheduleUntilWeek:'2026-11-24',retainedStorySources:['keep']}]};
 const original=JSON.stringify(source);const after=withExpansion(source,base);
 assert.equal(JSON.stringify(source),original);assert.equal(after.channels[0].videos[0].enabled,false);assert.equal(after.channels[1].videos[0].enabled,false);assert.equal(after.channels[0].videos[0].scheduleUntilWeek,'2026-11-24');
 for(const rows of [{},[null],[{...base.retirements[0],id:'unknown'}],[{...base.retirements[0],scheduleUntilWeek:'2026-11-25'}],[{...base.retirements[0],retainedStorySources:['retire']}],[{...base.retirements[0],retainedStorySources:['unknown']}],[base.retirements[0],base.retirements[0]]])assert.throws(()=>withExpansion(source,{...base,retirements:rows}),/Invalid source retirement/);
 assert.equal(JSON.stringify(source),original);
});
