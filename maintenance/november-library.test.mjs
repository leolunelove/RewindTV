import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withExpansion,withGameshowAdditions,EXPANSION_PACKS} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex,normalise} from '../site/show-library.mjs';
import {buildMovieLibrary,filmIdentity} from '../site/movie-night.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url),'utf8'));
const packName='november-library.json',pack=read(packName);
function catalogue(includeAdditions){
 let cat=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));
 for(const name of EXPANSION_PACKS)if(includeAdditions||name!==packName)cat=withExpansion(cat,read(name));
 return cat;
}
const base=catalogue(false),expanded=catalogue(true),runtime=hydrateLibrary(compactLibrary(expanded));
const baseVideos=[...new Map(base.channels.flatMap(c=>c.videos).map(v=>[v.id,v])).values()];
const baseIds=new Set(baseVideos.map(v=>v.id)),addedIds=new Set(pack.videos.map(v=>v.id));
const scheduleScope={},shuffleScope={};
vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scheduleScope);
vm.runInNewContext(fs.readFileSync(new URL('../site/shuffle.js',import.meta.url),'utf8'),shuffleScope);
const schedule=scheduleScope.RewindSchedule,shuffle=shuffleScope.RewindShuffle;
function episodeIdentity(v){
 if(v.kind==='film')return 'film:'+filmIdentity(v);
 if(Number.isFinite(v.seasonNumber)&&Number.isFinite(v.episodeNumber))return `${normalise(v.series)}:s${v.seasonNumber}e${v.episodeNumber}`;
 return v.episodeKey?'key:'+normalise(v.episodeKey):null;
}

test('November additions have unique uploads and episode identities, with every programme assigned to existing channels',()=>{
 assert(EXPANSION_PACKS.includes(packName));assert(pack.videos.length>0);
 assert.equal(addedIds.size,pack.videos.length);
 const identities=new Set(),existingIdentities=new Set(baseVideos.map(episodeIdentity).filter(Boolean));
 for(const v of pack.videos){
  assert(!baseIds.has(v.id),`Already present upload: ${v.id}`);
  assert(v.episodeKey,`Missing episode identity: ${v.id}`);
  const identity=episodeIdentity(v);
  assert(!identities.has(identity),`Repeated addition: ${identity}`);
  assert(!existingIdentities.has(identity),`Existing episode/film: ${identity}`);identities.add(identity);
 }
 const assigned=new Set();
 for(const [key,ids] of Object.entries(pack.assignments)){
  assert(base.channels.some(c=>c.key===key),`Unknown channel: ${key}`);
  assert.equal(new Set(ids).size,ids.length,`Repeated assignment in ${key}`);
  for(const id of ids){assert(addedIds.has(id),`Assignment outside reviewed pack: ${id}`);assigned.add(id);}
 }
 assert.deepEqual(assigned,addedIds);
 assert.deepEqual(expanded.channels.map(c=>[c.key,c.number,c.mode]),base.channels.map(c=>[c.key,c.number,c.mode]));
});

test('every published addition retains aged source evidence and successful start/end embedded samples',()=>{
 for(const v of pack.videos){
  assert.match(v.id,/^[A-Za-z0-9_-]{11}$/);assert.match(v.uploadDate,/^\d{4}-\d{2}-\d{2}$/);
  assert(v.uploadDate<='2023-11-04',`Upload younger than three years: ${v.id}`);
  assert.equal(new Date(v.uploadDate+'T12:00:00Z').toISOString().slice(0,10),v.uploadDate);
  assert(v.uploader&&v.uploaderUrl&&v.credit&&v.uploadTitle);
  assert(['official','archive'].includes(v.sourceType));if(v.sourceType==='archive')assert(v.sourceProvenance);
  assert(['full episode','full pilot','film','classic video','short'].includes(v.kind));assert(Number.isFinite(v.duration)&&v.duration>=60);
  assert.equal(v.enabled,true);assert.equal(v.embeddable,true);assert.equal(v.embedStatus,'playing');
  assert.equal(v.availabilityEvidence.availableCountryCount,249);
  assert.equal(v.playbackCheck.start,true);assert.equal(v.playbackCheck.nearEnd,true);
  assert(v.playbackCheck.checkedAt&&v.playbackCheck.region&&v.playbackCheck.method,'Playback evidence needs time and region scope');
 }
});

test('the released week keeps all ten fixed timetables and advert positions byte-identical',()=>{
 const now=Date.parse('2026-11-04T12:00:00Z');
 assert.equal(base.version,expanded.version,'The fixed schedule seed must remain stable');
 assert.equal(JSON.stringify(schedule.build(expanded,now)),JSON.stringify(schedule.build(base,now)));
 for(const channel of expanded.channels.filter(c=>c.mode!=='shuffle')){
  for(const v of channel.videos.filter(v=>addedIds.has(v.id)))assert.equal(v.scheduleFromWeek,'2026-11-10');
 }
});

test('fixed-channel additions become eligible on the next Gibraltar Tuesday',()=>{
 const boundary=Date.parse('2026-11-09T23:00:00Z');
 assert.equal(schedule.weekAt(boundary-1).key,'2026-11-03');assert.equal(schedule.weekAt(boundary).key,'2026-11-10');
 let checked=0;
 for(const channel of expanded.channels.filter(c=>c.mode!=='shuffle')){
  const fresh=channel.videos.filter(v=>addedIds.has(v.id));if(!fresh.length)continue;
  const isolated={...expanded,channels:[{...channel,videos:fresh}]};
  assert.equal(schedule.build(isolated,boundary-1).schedules[0].length,0);
  const eligible=new Set(schedule.build(isolated,boundary).schedules[0].filter(r=>!r.advert).map(r=>r.video.id));
  for(const v of fresh)assert(eligible.has(v.id),`Addition not admitted: ${v.id}`);checked++;
 }
 assert(checked>0);
});

test('compact playback data preserves scheduling gates and film genres',()=>{
 const videos=new Map(runtime.channels.flatMap(c=>c.videos).map(v=>[v.id,v]));
 const genres=new Set(['Adventure','Comedy','Crime','Drama','Horror','Sci-fi','World cinema']);
 const films=new Map(buildMovieLibrary(runtime).map(v=>[v.id,v]));
 for(const source of pack.videos){
  const restored=videos.get(source.id);assert(restored,`Missing runtime programme: ${source.id}`);
  assert.equal(restored.scheduleFromWeek,source.scheduleFromWeek);assert.equal(restored.genre,source.genre);
  assert.equal(restored.seasonNumber,source.seasonNumber);assert.equal(restored.episodeNumber,source.episodeNumber);
  if(source.kind==='film'){
   assert(genres.has(source.genre),`Unreviewed film genre: ${source.genre}`);
   assert.equal(films.get(source.id)?.genre,source.genre,'Movie Night must use the retained genre');
  }
 }
});

test('Library exposes all additions immediately even while their fixed schedule is deferred',()=>{
 const visible=new Set(buildShowIndex(runtime).flatMap(s=>s.episodes.map(v=>v.id)));
 for(const id of addedIds)assert(visible.has(id),`Missing Library addition: ${id}`);
});

test('shuffle serves unseen additions before watched programmes without clearing viewing history',()=>{
 let checked=0;
 for(const c of runtime.channels.filter(c=>c.mode==='shuffle'&&c.videos.some(v=>addedIds.has(v.id)))){
  const eligible=c.videos.filter(v=>v.enabled!==false),recent=Object.fromEntries(eligible.filter(v=>!addedIds.has(v.id)).map((v,i)=>[v.id,1000+i]));
  const before=JSON.stringify(recent),order=shuffle.order(c.videos,recent,()=>.37),fresh=eligible.filter(v=>addedIds.has(v.id));
  assert.equal(JSON.stringify(recent),before,'Viewing history must not be reset or mutated');
  assert.equal(new Set(order.map(v=>v.id)).size,order.length);
  assert.deepEqual(new Set(order.map(v=>v.id)),new Set(eligible.map(v=>v.id)));
  assert(order.slice(0,fresh.length).every(v=>addedIds.has(v.id)),`Watched content precedes new additions: ${c.key}`);
  const seen=order.slice(fresh.length);for(let i=1;i<seen.length;i++)assert(recent[seen[i-1].id]<=recent[seen[i].id]);checked++;
 }
 assert(checked>0);
});
