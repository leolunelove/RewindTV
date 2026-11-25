import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SOURCE_FILES,withExpansion,withGameshowAdditions} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {catalogueForCountry,isRegionEligible} from '../site/region-eligibility.mjs';
import {buildShowIndex,pickProgramme,showIdentity,findProgramme,episodeOrder} from '../site/show-library.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url),'utf8'));
const additions=new Set(['language-daytime-depth.json','christmas-programming.json']);
function load(include){let cat=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));for(const file of SOURCE_FILES.slice(2))if(include||!additions.has(file))cat=withExpansion(cat,read(file));return cat;}
const before=load(false),after=load(true),language=read('language-daytime-depth.json'),christmas=read('christmas-programming.json');
const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
const timeline=(cat,at)=>JSON.stringify(scope.RewindSchedule.build(cat,Date.parse(at)).schedules.slice(0,10).map(rows=>rows.map(r=>[r.video.id,r.start,r.end,r.advert])));
test('the combined release retains all existing channel numbers, sources and the main ten fixed timelines',()=>{
 assert.equal(before.channels.length,33);assert.equal(after.channels.length,37);
 for(let i=0;i<33;i++){
  const a=before.channels[i],b=after.channels[i];assert.deepEqual([b.key,b.name,b.number],[a.key,a.name,a.number]);
  for(const video of a.videos){const next=b.videos.find(v=>v.id===video.id);assert(next,video.id);assert.equal(next.enabled,video.enabled);assert.equal(next.duration,video.duration);}
  if(a.key!=='christmas-tv')assert.equal(b.mode,a.mode);
 }
 for(const at of ['2026-11-25T12:00:00Z','2026-11-30T22:00:00Z']){
  assert.equal(timeline(before,at),timeline(after,at));
  assert.equal(timeline(catalogueForCountry(before,'GI'),at),timeline(catalogueForCountry(after,'GI'),at));
 }
 assert.equal(SOURCE_FILES.at(-1),'library-health.json','final health exclusions still apply after additions');
});
test('new episode identities are distinct, reachable and labelled with their known audio and publisher source',()=>{
 const old=new Set([...before.channels.flatMap(c=>c.videos),...(before.libraryVideos||[])].map(v=>v.id));
 const ids=new Set(),stories=new Set();
 assert.equal(language.videos.filter(v=>v.audioLanguage==='cmn'&&v.kind!=='film').length,62);
 assert.equal(language.videos.filter(v=>v.audioLanguage==='es'&&v.kind!=='film').length,77);
 assert.equal(language.videos.filter(v=>v.audioLanguage==='cmn'&&v.kind==='film').length,16);
 assert.equal(language.videos.filter(v=>v.audioLanguage==='es'&&v.kind==='film').length,17);
 const index=buildShowIndex(after),reachable=new Set(index.flatMap(s=>s.episodes.map(v=>v.id)));
 for(const v of [...language.videos,...christmas.videos]){
  assert(!old.has(v.id));assert(!ids.has(v.id));ids.add(v.id);assert(reachable.has(v.id));
  assert.equal(v.sourceType,'official');assert(v.uploadDate);assert(v.playbackCheck.start&&v.playbackCheck.nearEnd);assert.match(v.playbackCheck.region,/not independently verified/);
  assert(v.audioLanguageLabel);assert(v.embeddable);assert(v.duration>=60);
  const key=v.audioLanguage+':'+v.series+':'+(v.episodeNumber===undefined?v.id:(v.seasonNumber||1)+':'+v.episodeNumber);
  assert(!stories.has(key),key);stories.add(key);
 }
 for(const held of ['3pFln2id8jk','QNHC3rUpAMM','OgkHGBXjONI'])assert(!ids.has(held),'recap/unfinished story pair must remain held');
 const restricted=language.videos.find(v=>v.id==='AQF519M7xB0');assert(isRegionEligible(restricted,'ES'));assert(!isRegionEligible(restricted,'BY'));assert(!isRegionEligible(restricted,'RU'));
});
test('language cinema keeps declared restrictions and never presents the Gibraltar pool as worldwide availability',()=>{
 const gi=catalogueForCountry(after,'GI'),es=catalogueForCountry(after,'ES');
 const films=(cat,key)=>cat.channels.find(c=>c.key===key).videos;
 assert.equal(films(gi,'mandarin-cinema').length,16);assert.equal(films(es,'mandarin-cinema').length,16);
 assert(films(gi,'cine-espanol').length>films(es,'cine-espanol').length);
 assert(films(gi,'cine-espanol').reduce((n,v)=>n+v.duration,0)>86400);
 assert(films(es,'cine-espanol').reduce((n,v)=>n+v.duration,0)<86400);
 for(const v of films(es,'cine-espanol'))assert(isRegionEligible(v,'ES'));
 for(const key of ['mandarin-cinema','cine-espanol'])assert.equal(gi.channels.find(c=>c.key===key).mode,'shuffle','country-reduced film pools are not sold as a fixed global day');
});
test('Mandarin aliases extend existing series and preserve saved show identities instead of creating duplicate cards',()=>{
 const old={series:'西游记 (1986)',audioLanguage:'zh',kind:'full episode'};
 assert.equal(showIdentity(old),showIdentity({...old,audioLanguage:'cmn'}));
 assert.notEqual(showIdentity(old),showIdentity({...old,audioLanguage:'yue'}));
 const shows=buildShowIndex(after),journey=shows.filter(s=>s.title==='西游记 (1986)');
 assert.equal(journey.length,1);assert.equal(journey[0].episodes.length,2,'original entries retained pending edition review; shortened additions stay held');
 const nezha=shows.filter(s=>s.title==='哪吒传奇');assert.equal(nezha.length,1);assert.equal(nezha[0].episodes.length,52);
 assert.deepEqual(journey[0].episodes.map(v=>v.episodeNumber),[1,2]);
 assert.equal(findProgramme(after,'rewind-mandarin','gngNrFTj0KI'),null,'shortened edition not promoted because the embed happens to play');
 assert(!shows.some(s=>s.title==='红楼梦 (1987)'),'condensed candidate run remains in research, not the active Library');
 const found=findProgramme(after,'rewind-mandarin','103HAudmicM');assert.equal(found.queue.length,52);assert.equal(found.queue.findIndex(v=>v.id==='103HAudmicM'),5);
 assert.equal(episodeOrder({title:'第12集'}),10012);
});
test('Christmas has a real continuous full-day timetable using only the reviewed pool and complete durations',()=>{
 const cat=catalogueForCountry(after,'GI'),plan=scope.RewindSchedule.build(cat,Date.parse('2026-11-25T12:00:00Z'));
 const index=cat.channels.findIndex(c=>c.key==='christmas-tv'),channel=cat.channels[index],rows=plan.schedules[index];
 assert.equal(channel.number,14);assert.equal(channel.mode,'scheduled');assert.equal(christmas.videos.length,10);
 const approved=new Set(channel.programming.entries.map(e=>e.id));assert.equal(approved.size,53);
 const start=Date.parse('2026-11-25T05:00:00Z'),end=Date.parse('2026-11-26T05:00:00Z');
 const day=rows.filter(row=>row.end>start&&row.start<end);assert(day[0].start<=start);assert(day.at(-1).end>=end);
 const programmes=day.filter(r=>!r.advert);assert.equal(new Set(programmes.map(r=>r.video.id)).size,programmes.length);
 for(let i=0;i<day.length;i++){const row=day[i];assert.equal(row.end-row.start,Math.max(1,Math.round(row.video.duration))*1000);if(i)assert.equal(day[i-1].end,row.start);if(!row.advert)assert(approved.has(row.video.id));}
 const source={...channel,videos:channel.videos.filter(v=>!approved.has(v.id))};
 assert.equal(pickProgramme([source],{channelKey:channel.key}),null,'held sources cannot enter This channel shuffle');
 const round=hydrateLibrary(compactLibrary(after));assert.equal(timeline(round,'2026-11-25T12:00:00Z'),timeline(after,'2026-11-25T12:00:00Z'));
});
