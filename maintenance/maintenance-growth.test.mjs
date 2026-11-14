import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {EXPANSION_PACKS,withExpansion,withGameshowAdditions} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex,isBrowsable} from '../site/show-library.mjs';
import {COUNTRY_CODES} from '../site/region-eligibility.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url)));
const pack=read('maintenance-growth.json'),base=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));
const prior=EXPANSION_PACKS.filter(name=>name!=='maintenance-growth.json').reduce((catalogue,name)=>withExpansion(catalogue,read(name)),base);
const full=withExpansion(prior,pack);
const scope={};
vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
const countryCodes=new Set(COUNTRY_CODES);

test('the three animation runs retain distinct episode identities, primary ownership and bounded actual playback evidence',()=>{
 const counts={};
 const oldIds=new Set(prior.channels.flatMap(channel=>channel.videos.map(video=>video.id))),ids=new Set(),keys=new Set();
 for(const video of pack.videos){
  counts[video.series]=(counts[video.series]||0)+1;
  assert(!oldIds.has(video.id)&&!ids.has(video.id),video.id);ids.add(video.id);
  assert(video.episodeKey&&!keys.has(video.episodeKey),video.episodeKey);keys.add(video.episodeKey);
  assert.equal(video.kind,'full episode');assert.equal(video.enabled,true);
  assert.equal(video.sourceType,'official');assert.equal(video.officialOwnershipVerified,true);
  assert(video.sourceOwnershipEvidence.authenticated&&video.sourceOwnershipEvidence.url);
  assert(video.identityEvidence.url&&video.fullEpisodeEvidence.url);
  assert(!video.sourceProvenance);
  assert(video.duration>=1200&&video.duration<=1800,video.id);
  assert.equal(video.metadataStatus,'OK');assert.equal(video.embeddable,true);
  assert.equal(video.embedStatus,'playing');
  assert.equal(video.playbackCheck.start,true);assert.equal(video.playbackCheck.nearEnd,true);
  assert.equal(video.playbackCheck.origin,'https://tv.leolune.fun');
  assert(video.playbackCheck.checkedAt.startsWith('2026-11-14'));
  assert(Math.abs(video.playbackCheck.duration-video.duration)<=3);
  const allowed=video.regionRestriction.allowed;
  assert.equal(new Set(allowed).size,allowed.length);
  assert(allowed.length>=200&&allowed.every(country=>countryCodes.has(country)));
  assert.deepEqual(allowed,video.availabilityEvidence.availableCountries);
  assert.equal(allowed.length,video.availabilityEvidence.availableCountryCount);
 }
 assert.deepEqual(counts,{'Totally Spies':26,'The Transformers':12,'Beast Wars: Transformers':26});
 assert.equal(keys.size,64);
});

test('animation additions preserve all current channels and fixed broadcast slots until next Tuesday',()=>{
 assert.deepEqual(full.channels.map(({key,name,number,mode})=>[key,name,number,mode]),prior.channels.map(({key,name,number,mode})=>[key,name,number,mode]));
 assert.equal(full.channels.length,33);assert.deepEqual(full.adverts,prior.adverts);
 assert(pack.videos.every(video=>video.scheduleFromWeek==='2026-11-17'));
 const slots=plan=>JSON.stringify(plan.schedules.slice(0,10).map(rows=>rows.map(({video,start,end,advert})=>[video.id,start,end,advert])));
 const now=Date.parse('2026-11-14T12:00:00Z');
 assert.equal(slots(scope.RewindSchedule.build(full,now)),slots(scope.RewindSchedule.build(prior,now)));
 for(const [key,ids] of Object.entries(pack.assignments)){
  const index=full.channels.findIndex(channel=>channel.key===key);
  assert(index>=0,key);
  for(const id of ids)assert(full.channels[index].videos.some(video=>video.id===id),id);
  if(index>=10)continue;
  const selected={...full.channels[index],videos:full.channels[index].videos.filter(video=>ids.includes(video.id))};
  const isolated={...full,channels:[selected]};
  const next=scope.RewindSchedule.build(isolated,Date.parse('2026-11-17T12:00:00Z'));
  for(const id of ids)assert(next.schedules[0].some(row=>row.video.id===id),id);
 }
});

test('decade routing and production-order Transformers browsing retain the documented editions',()=>{
 const spies=pack.videos.filter(video=>video.series==='Totally Spies');
 const transformers=pack.videos.filter(video=>video.series==='The Transformers');
 const beast=pack.videos.filter(video=>video.series==='Beast Wars: Transformers');
 assert.deepEqual(transformers.map(video=>video.publisherEpisodeNumbers[0]),[1,2,3,4,6,8,9,10,12,14,15,16]);
 assert(transformers.every(video=>video.episodeNumber===undefined&&video.yearLabel==='1984'));
 assert(beast.every(video=>video.yearLabel==='1996–1997'));
 assert(spies.every(video=>video.yearLabel==='Early 2000s'||video.yearLabel==='2002'));
 assert.deepEqual(pack.assignments.eighties,transformers.map(video=>video.id));
 assert.deepEqual(pack.assignments.nineties,beast.map(video=>video.id));
 assert.deepEqual(pack.assignments.noughties,spies.map(video=>video.id));
 const roundTrip=hydrateLibrary(compactLibrary(full));
 const show=buildShowIndex(roundTrip).find(show=>show.title==='The Transformers');
 assert.deepEqual(show.episodes.map(video=>video.id),transformers.map(video=>video.id));
 assert.equal(new Set(show.episodes.map(video=>video.id)).size,12);
});

test('the corrected CGI Brum edition retains this week’s original slots and retires next Tuesday',()=>{
 const beforeVideo=JSON.parse(fs.readFileSync(new URL('fixtures/brum-before-2026-11-14.json',import.meta.url)));
 const channelIndex=full.channels.findIndex(channel=>channel.key==='kids');
 const corrected=full.channels[channelIndex].videos.find(video=>video.id===beforeVideo.id);
 assert.equal(corrected.title,'Brum CGI shorts collection');
 assert.equal(corrected.formatLabel,'CGI shorts collection');
 assert.equal(corrected.year,undefined);
 assert.equal(corrected.yearLabel,'CGI revival · year unverified');
 assert.equal(corrected.series,beforeVideo.series);assert.equal(corrected.kind,beforeVideo.kind);
 assert.equal(corrected.duration,beforeVideo.duration);
 assert.equal(corrected.enabled,false);assert.equal(corrected.scheduleUntilWeek,'2026-11-17');
 assert.equal(isBrowsable(corrected),false);
 const original={...full,channels:full.channels.map((channel,index)=>index===channelIndex
  ?{...channel,videos:channel.videos.map(video=>video.id===beforeVideo.id?beforeVideo:video)}
  :channel)};
 const slots=plan=>JSON.stringify(plan.schedules.slice(0,10).map(rows=>rows.map(({video,start,end,advert})=>[video.id,start,end,advert])));
 const now=Date.parse('2026-11-14T12:00:00Z');
 assert.equal(slots(scope.RewindSchedule.build(full,now)),slots(scope.RewindSchedule.build(original,now)));
 const next=scope.RewindSchedule.build(full,Date.parse('2026-11-17T12:00:00Z'));
 assert(!next.schedules[channelIndex].some(row=>row.video.id===beforeVideo.id));
 const angela=full.channels.flatMap(channel=>channel.videos).find(video=>video.id==='O-VFMqfWphs');
 assert.equal(angela.title,'Pet Peeves and more');assert.equal(angela.formatLabel,'Compilation');
 assert.equal(angela.seasonNumber,undefined);assert.equal(angela.episodeNumber,undefined);
});
