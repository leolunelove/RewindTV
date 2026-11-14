import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SOURCE_FILES,withExpansion,withGameshowAdditions} from '../site/library.mjs';
import {COUNTRY_CODES,catalogueForCountry,isRegionEligible} from '../site/region-eligibility.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url)));
const programme=(id,extra={})=>({id,title:id,series:'Example show',provider:'youtube',kind:'full episode',duration:1200,enabled:true,...extra});
const fixture=()=>({
 version:'fixed',libraryRevision:'before',scheduledCount:2,
 channels:[
  {key:'first',number:1,name:'First',videos:[programme('shared'),programme('other')]},
  {key:'second',number:2,name:'Second',videos:[programme('shared',{title:'Existing edition',enabled:false,scheduleUntilWeek:'2026-11-17'}),programme('last')]}
 ],
 adverts:[programme('shared',{kind:'advert',duration:20}),programme('ad-only',{kind:'advert',duration:25})]
});
const pack=updates=>({version:1,revision:'after',videos:[],channels:[],assignments:{},updates});
const changes={
 checkedAt:'2026-11-14T08:31:00.000Z',metadataStatus:'OK',metadataCheckedAt:'2026-11-14T08:30:00.000Z',
 uploadDate:'2016-06-03',embeddable:true,embedStatus:'playing',regionRestriction:{blocked:['GB']},
 availabilityEvidence:{availableCountryCount:248,checkedAt:'2026-11-14T08:30:00Z',method:'Provider metadata',worldwidePlaybackVerified:false},
 playbackCheck:{start:true,nearEnd:true,checkedAt:'2026-11-14T08:31:00Z',region:'One browser network',method:'Clock advanced at both sample points',origin:'https://tv.leolune.fun',observedDuration:1199.7}
};
const references=(catalogue,id)=>[...catalogue.channels.flatMap(channel=>channel.videos),...catalogue.adverts].filter(video=>video.id===id);

test('metadata updates reach every existing variant and advert without changing identity or the input',()=>{
 const source=fixture(),snapshot=JSON.stringify(source);
 const before=references(source,'shared');
 const result=withExpansion(source,pack([{id:'shared',changes},{id:'ad-only',changes:{uploadDate:'2010-01-02'}}]));
 const after=references(result,'shared');
 assert.equal(after.length,3);
 for(let index=0;index<before.length;index++){
  for(const [key,value] of Object.entries(before[index]))assert.deepEqual(after[index][key],value,key);
  for(const [key,value] of Object.entries(changes))assert.deepEqual(after[index][key],value,key);
 }
 assert.equal(result.adverts[1].uploadDate,'2010-01-02');
 assert.equal(JSON.stringify(source),snapshot);
 assert.deepEqual(result.channels.map(channel=>channel.videos.map(video=>video.id)),source.channels.map(channel=>channel.videos.map(video=>video.id)));
});

test('unknown IDs, duplicate updates and malformed containers reject before any source mutation',()=>{
 for(const updates of [null,{},'bad',false,[null],[[]],[{id:'absent',changes}],[{id:'shared',changes},{id:'shared',changes}],
  [{id:'shared',changes:null}],[{id:'shared',changes:[]}],[{id:'shared',changes:{}}],
  [{id:'shared',changes,extra:'unexpected'}],[{id:'shared',changes},{id:'other',changes:{duration:10}}]]){
  const source=fixture(),snapshot=JSON.stringify(source);
  assert.throws(()=>withExpansion(source,pack(updates)),/Invalid metadata update/);
  assert.equal(JSON.stringify(source),snapshot);
 }
 assert.doesNotThrow(()=>withExpansion(fixture(),pack([])));
 assert.doesNotThrow(()=>withExpansion(fixture(),pack(undefined)));
});

test('identity, playback source, duration, enablement and schedule changes are prohibited',()=>{
 const protectedFields=['id','title','series','year','yearLabel','kind','duration','source','watchUrl','mediaUrl','provider','enabled','family','credit','uploader','sourceType','sourceAspectRatio','formatLabel','scheduleFromWeek','scheduleUntilWeek','coveredEpisodeNumbers'];
 for(const field of protectedFields)assert.throws(()=>withExpansion(fixture(),pack([{id:'shared',changes:{[field]:'changed'}}])),/Invalid metadata update/,field);
 const dangerous=JSON.parse('{"__proto__":{"enabled":true}}');
 assert.throws(()=>withExpansion(fixture(),pack([{id:'shared',changes:dangerous}])),/Invalid metadata update/);
});

test('metadata field values and country arrays reject malformed or unsupported declarations',()=>{
 const invalid=[
  {checkedAt:'tomorrow'},{checkedAt:'2026-02-30T08:00:00Z'},{metadataCheckedAt:'tomorrow'},{uploadDate:'2026-02-30'},
  {uploadDate:'2026-11-14T08:00:00Z'},{metadataStatus:[]},{metadataStatus:'Public metadata refreshed'},{embeddable:'true'},{embedStatus:'probably'},
  {regionRestriction:[]},{regionRestriction:{blocked:'GB'}},{regionRestriction:{blocked:null}},
  {regionRestriction:{blocked:[null]}},{regionRestriction:{blocked:['XX']}},{regionRestriction:{blocked:['gb']}},
  {regionRestriction:{blocked:['GB','GB']}},{regionRestriction:{allowed:[]}},{regionRestriction:{other:['GB']}},
  {availabilityEvidence:[]},{availabilityEvidence:{availableCountryCount:250}},
  {availabilityEvidence:{availableCountryCount:1.5}},{availabilityEvidence:{worldwidePlaybackVerified:true}},
  {playbackCheck:[]},{playbackCheck:{start:'yes'}},{playbackCheck:{observedDuration:0}},
  {playbackCheck:{observedDuration:Infinity}},{playbackCheck:{privateToken:'unexpected'}}
 ];
 for(const value of invalid)assert.throws(()=>withExpansion(fixture(),pack([{id:'shared',changes:value}])),/Invalid metadata update/);
});

test('metadata success cannot re-enable a source excluded in the same pack or by final health data',()=>{
 const checks=pack([{id:'shared',changes}]);
 const exclusion={id:'shared',reason:'Confirmed unavailable source'};
 for(const result of [
  withExpansion(fixture(),{...checks,exclusions:[exclusion]}),
  withExpansion(withExpansion(fixture(),checks),{...pack(undefined),exclusions:[exclusion]})
 ]){
  for(const video of references(result,'shared')){
   assert.equal(video.enabled,false);
   assert.equal(video.scheduleUntilWeek,undefined);
   assert.equal(video.disabledReason,exclusion.reason);
   assert.equal(video.embedStatus,'playing','the historical success is evidence, while the final exclusion controls rotation');
  }
 }
});

test('the 57-source maintenance pack retains all current Gibraltar slots and compacts country restrictions',()=>{
 assert.deepEqual(SOURCE_FILES.slice(-3),['maintenance-growth.json','maintenance-checks.json','library-health.json']);
 let baseline=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));
 for(const name of SOURCE_FILES.slice(2).filter(name=>!['maintenance-growth.json','maintenance-checks.json','library-health.json'].includes(name)))baseline=withExpansion(baseline,read(name));
 baseline=withExpansion(baseline,read('library-health.json'));
 const checks=read('maintenance-checks.json');
 assert.equal(checks.updates.length,57);
 assert.equal(new Set(checks.updates.map(update=>update.id)).size,57);
 const updated=withExpansion(baseline,checks);
 const restored=hydrateLibrary(compactLibrary(updated));
 const scope={};
 vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
 const slots=library=>scope.RewindSchedule.build(catalogueForCountry(library,'GI'),Date.parse('2026-11-14T12:00:00Z')).schedules.slice(0,10).map(rows=>rows.map(row=>[row.video.id,row.start,row.end,row.advert]));
 const before=slots(baseline);
 assert.equal(before.flat().length,8249);
 assert.equal(JSON.stringify(slots(updated)),JSON.stringify(before));
 assert.equal(JSON.stringify(slots(restored)),JSON.stringify(before));
 for(const update of checks.updates){
  const {availabilityEvidence,playbackCheck,regionRestriction}=update.changes;
  assert.equal(update.changes.metadataStatus,'OK');
  assert.equal(update.changes.metadataCheckedAt,availabilityEvidence.checkedAt);
  assert.equal(update.changes.checkedAt,playbackCheck.checkedAt);
  assert.equal(availabilityEvidence.availableCountryCount,COUNTRY_CODES.length-regionRestriction.blocked.length);
  assert.equal(playbackCheck.start,true);
  assert.equal(playbackCheck.nearEnd,true);
  for(const video of references(updated,update.id)){
   assert.deepEqual(video.regionRestriction,regionRestriction);
   assert(isRegionEligible(video,'GI'));
   for(const blocked of regionRestriction.blocked)assert(!isRegionEligible(video,blocked));
  }
  for(const video of references(restored,update.id))assert.deepEqual(video.regionRestriction,regionRestriction);
 }
 assert.equal(isRegionEligible(references(updated,'JUyLPSEmxdo')[0],'GB'),false);
 assert.equal(isRegionEligible(references(updated,'2zv_S_uVoVQ')[0],'GB'),false);
});
