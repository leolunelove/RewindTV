import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SOURCE_FILES,withExpansion,withGameshowAdditions} from '../site/library.mjs';
import {buildShowIndex} from '../site/show-library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {catalogueForCountry,COUNTRY_CODES} from '../site/region-eligibility.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url)));
let catalogue=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));
for(const name of SOURCE_FILES.slice(2))catalogue=withExpansion(catalogue,read(name));
const original=JSON.parse(fs.readFileSync(new URL('fixtures/quality-before-2026-11-22.json',import.meta.url)));
const old=new Map(original.map(video=>[video.id,video]));
const pack=read('quality-pass.json'),replacement=pack.videos[0];
const before={...catalogue,channels:catalogue.channels.map(channel=>({...channel,
 videos:channel.videos.filter(video=>video.id!==replacement.id).map(video=>old.has(video.id)?{...video,...old.get(video.id)}:video)}))};
const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
const slots=(source,time)=>JSON.stringify(scope.RewindSchedule.build(source,time).schedules.slice(0,10).map(rows=>rows.map(row=>[row.video.id,row.start,row.end,row.advert])));

test('the verified individual story replaces overlap without removing any original source or current fixed slot',()=>{
 assert.equal(pack.videos.length,1);assert.deepEqual(pack.channels,[]);assert.deepEqual(pack.exclusions,[]);
 assert.equal(replacement.id,'1bT9jmp507s');assert.equal(replacement.title,'Spy Gladiators');
 assert.equal(replacement.sourceType,'official');assert.equal(replacement.uploaderChannelId,'UCkiKi_AvGv0O_BGHC9vbumA');
 assert.equal(replacement.officialOwnershipVerified,true);assert(!replacement.sourceProvenance);
 assert.equal(new Set(replacement.regionRestriction.allowed).size,249);
 assert(replacement.regionRestriction.allowed.every(code=>COUNTRY_CODES.includes(code)));
 assert(replacement.playbackCheck.start&&replacement.playbackCheck.nearEnd);
 assert.equal(replacement.playbackCheck.origin,'https://tv.leolune.fun');
 assert(replacement.playbackCheck.checkedAt.startsWith('2026-11-22'));
 assert(Math.abs(replacement.playbackCheck.observedDuration-replacement.duration)<2);
 const now=Date.parse('2026-11-22T12:00:00Z');
 assert.equal(slots(catalogue,now),slots(before,now));
 const compact=hydrateLibrary(compactLibrary(catalogue));assert.equal(slots(compact,now),slots(before,now));
 const retained=catalogue.channels.flatMap(channel=>channel.videos).find(video=>video.id==='5KNa3AxEPxE');
 assert.equal(retained.enabled,false);assert.equal(retained.scheduleUntilWeek,'2026-11-24');
 assert.equal(retained.duration,old.get(retained.id).duration);assert.equal(retained.series,old.get(retained.id).series);
 for(const video of original)assert(catalogue.channels.some(channel=>channel.videos.some(row=>row.id===video.id)));
 const shows=buildShowIndex(compact),spies=shows.find(show=>show.title==='Totally Spies');
 assert(spies.episodes.some(video=>video.id===replacement.id));assert(!spies.episodes.some(video=>video.id===retained.id));
 for(const id of ['QgNt6pcsFjo','rsMtaar750Y'])assert(spies.episodes.some(video=>video.id===id));
 const next=scope.RewindSchedule.build(compact,Date.parse('2026-11-24T12:00:00Z'));
 assert(next.schedules.slice(0,10).some(rows=>rows.some(row=>row.video.id===replacement.id)));
 assert(!next.schedules.flat().some(row=>row.video.id===retained.id));
});

test('double bills retain both unique story spans and never receive invented constituent episode numbers',()=>{
 const ids=['1O3jokn0PJg','0Y8OmC2LWkc','4e7OvP6uceM','FyPFO0Yf2d0','WjclQp9LFzU'];
 for(const id of ids){const videos=catalogue.channels.flatMap(channel=>channel.videos).filter(video=>video.id===id);assert(videos.length);
  for(const video of videos){assert.equal(video.formatLabel,'Double bill · two stories');assert.equal(video.enabled,id!=='4e7OvP6uceM');if(id==='4e7OvP6uceM')assert.equal(video.scheduleUntilWeek,'2026-11-24');
   assert.equal(video.duration,old.get(id).duration);assert.equal(video.episodeNumber,undefined);assert.equal(video.coveredEpisodeNumbers,undefined);assert(video.uploadTitle);}}
});

test('the additional100 primary metadata checks remain dated, region-aware and harmless to programme identity',()=>{
 const all=read('maintenance-checks.json').updates,checks=all.filter(row=>row.changes.metadataCheckedAt.startsWith('2026-11-22'));
 assert.equal(all.length,157);assert.equal(checks.length,100);assert.equal(new Set(all.map(row=>row.id)).size,157);
 assert.equal(checks.filter(row=>row.changes.regionRestriction.blocked.length).length,32);
 for(const {changes}of checks){assert.equal(changes.metadataStatus,'OK');assert.equal(changes.checkedAt,changes.playbackCheck.checkedAt);
  assert.equal(changes.availabilityEvidence.availableCountryCount,249-changes.regionRestriction.blocked.length);
  assert(changes.playbackCheck.start&&changes.playbackCheck.nearEnd);assert(!changes.regionRestriction.blocked.includes('GI'));
  for(const field of ['id','title','series','kind','duration','enabled','scheduleFromWeek','scheduleUntilWeek'])assert(!Object.hasOwn(changes,field));}
});

test('known season grouping does not push named unnumbered first-season stories behind season two',()=>{
 const v=(id,seasonNumber,episodeNumber)=>({id,title:id,series:'A show',kind:'full episode',duration:1200,seasonNumber,episodeNumber});
 const source={channels:[{key:'one',videos:[v('second',2,1),v('first-unnumbered',1),v('unknown'),v('first-numbered',1,2),v('second-unnumbered',2)]}]};
 assert.deepEqual(buildShowIndex(source)[0].episodes.map(video=>video.id),['first-numbered','first-unnumbered','second','second-unnumbered','unknown']);
 const roundTrip=hydrateLibrary(compactLibrary(catalogue));
 for(const country of ['GI','CN','GI']){
  const show=buildShowIndex(catalogueForCountry(roundTrip,country)).find(show=>show.title==='Power Rangers Samurai');
  assert.equal(show.episodes.findIndex(video=>video.id==='pR52wL8aMfs'),country==='CN'?0:2);
 }
 const spies=buildShowIndex(roundTrip).find(show=>show.title==='Totally Spies');
 assert(spies.episodes.findIndex(video=>video.id===replacement.id)<spies.episodes.findIndex(video=>video.seasonNumber===2));
});
