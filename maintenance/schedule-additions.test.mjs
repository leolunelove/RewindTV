import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex,pickProgramme} from '../site/show-library.mjs';

const scope={};
vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
vm.runInNewContext(fs.readFileSync(new URL('../site/shuffle.js',import.meta.url),'utf8'),scope);
const {build,buildLineup,weekAt}=scope.RewindSchedule;
const current=Date.parse('2026-11-04T12:00:00Z');
const next=Date.parse('2026-11-09T23:00:00Z'); // Tuesday midnight, Gibraltar.
const video=(id,extra={})=>({id,title:id,series:id,kind:'full episode',duration:1800,family:true,...extra});
const fixture=()=>({version:'stable-release',adverts:[video('ad-a',{kind:'advert',duration:30}),video('ad-b',{kind:'advert',duration:20})],channels:Array.from({length:10},(_,i)=>({key:'channel-'+i,number:i+1,mode:'schedule',videos:[video('a-'+i),video('b-'+i),video('off-'+i,{enabled:false})]}))});
const addFuture=cat=>({...cat,libraryRevision:'new-catalogue-revision',channels:cat.channels.map(c=>({...c,videos:[...c.videos,video('new-'+c.number,{scheduleFromWeek:'2026-11-10'})]}))});

test('appended additions preserve all ten current timetables byte for byte, including advert slots',()=>{
 const original=fixture(),expanded=addFuture(original);
 const before=JSON.stringify(build(original,current)),after=JSON.stringify(build(expanded,current));
 assert.equal(after,before);
 assert(build(expanded,current).schedules.every(rows=>rows.some(r=>r.advert)));
 assert.equal(expanded.channels[0].videos.length,4,'schedule construction must not remove the catalogue addition');
});

test('the next Gibraltar Tuesday admits additions and keeps them eligible in later weeks',()=>{
 const expanded=addFuture(fixture());
 assert.equal(weekAt(next-1).key,'2026-11-03');
 assert.equal(weekAt(next).key,'2026-11-10');
 for(const now of [next,next+7*24*60*60*1000]){
  const plan=build(expanded,now);
  for(let i=0;i<10;i++)assert(plan.schedules[i].some(row=>row.video.id==='new-'+(i+1)));
 }
});

test('gates on disabled videos do not enable them and invalid gates stay out of fixed schedules',()=>{
 const cat=fixture();
 cat.channels[0].videos.push(video('disabled',{enabled:false,scheduleFromWeek:'2026-11-03'}));
 for(const gate of ['2026-02-30','2026-11-04','2026-1-06','tomorrow',null,123])cat.channels[0].videos.push(video('invalid-'+String(gate),{scheduleFromWeek:gate}));
 const rows=build(cat,current).schedules[0];
 assert(rows.every(row=>!row.video.id.startsWith('invalid-')&&row.video.id!=='disabled'));
 const allGated={...cat,channels:[{...cat.channels[0],videos:[video('future',{scheduleFromWeek:'2026-11-10'})]}]};
 assert.equal(build(allGated,current).schedules[0].length,0,'an empty eligible pool must terminate');
});

test('shuffle channels retain their immediate catalogue additions and get no fixed rows',()=>{
 const cat=addFuture(fixture());cat.channels.push({key:'shuffle',number:11,mode:'shuffle',videos:[video('new-shuffle',{scheduleFromWeek:'2026-11-10'})]});
 const snapshot=JSON.stringify(cat),plan=build(cat,current);
 assert.equal(plan.schedules[10].length,0);
 assert.equal(JSON.stringify(cat),snapshot,'schedule filtering must not mutate the library or shuffle pools');
});

test('a retirement preserves every current broadcast slot but leaves browsing and shuffle immediately',()=>{
 const cat=fixture();
 const retiring=cat.channels[0].videos[0];
 cat.channels.push({key:'mix',number:11,mode:'shuffle',videos:[retiring,video('mix-other')]});
 const before=build(cat,next);
 const deferred={...retiring,enabled:false,scheduleUntilWeek:'2026-11-17'};
 cat.channels[0].videos[0]=deferred;
 cat.channels[10].videos[0]={...retiring,enabled:false};
 const hydrated=hydrateLibrary(compactLibrary(cat));
 assert.equal(hydrated.channels[0].videos[0].scheduleUntilWeek,'2026-11-17');
 assert.equal(hydrated.channels[10].videos[0].scheduleUntilWeek,undefined);

 const lineup=buildLineup(hydrated,next), slots=plan=>JSON.stringify(plan.schedules.map(rows=>
  rows.map(row=>[row.video.id,row.start,row.end,row.advert])));
 assert.equal(slots(lineup.plan),slots(before));
 assert(!buildShowIndex(lineup.catalogue).some(show=>show.episodes.some(row=>row.id===retiring.id)));
 assert.notEqual(pickProgramme(lineup.catalogue.channels,{channelKey:'channel-0',random:()=>0})?.video.id,retiring.id);
 assert(!scope.RewindShuffle.order(lineup.catalogue.channels[10].videos).some(row=>row.id===retiring.id));
 assert.equal(hydrated.channels[0].videos[0].enabled,false,'preparing the lineup does not alter the source');

 const cutoff=Date.parse('2026-11-16T23:00:00Z');
 assert(build(hydrated,cutoff-1).schedules[0].some(row=>row.video.id===retiring.id));
 assert(!build(hydrated,cutoff).schedules[0].some(row=>row.video.id===retiring.id));
});

test('malformed cutoffs and immediately disabled sources never enter a fixed schedule',()=>{
 const cat=fixture();
 cat.channels[0].videos.push(
  video('disabled-now',{enabled:false}),
  video('wrong-weekday',{enabled:false,scheduleUntilWeek:'2026-11-18'}),
  video('invalid-date',{enabled:false,scheduleUntilWeek:'2026-11-31'}),
  video('not-yet-started',{enabled:false,scheduleFromWeek:'2026-11-17',scheduleUntilWeek:'2026-11-17'}),
  video('re-enabled',{enabled:true,scheduleUntilWeek:'2026-11-03'})
 );
 const ids=new Set(build(cat,next).schedules[0].map(row=>row.video.id));
 assert(ids.has('re-enabled'));
 for(const id of ['disabled-now','wrong-weekday','invalid-date','not-yet-started'])assert(!ids.has(id),id);
});

test('the lineup keeps a broadcast-only channel until its final cutoff and aligns visible channels with schedules',()=>{
 const cat=fixture();
 cat.channels[0].videos=[video('unavailable',{enabled:false})];
 cat.channels[1].videos=[video('retiring',{enabled:false,scheduleUntilWeek:'2026-11-17'})];
 const current=buildLineup(cat,next);
 assert.equal(current.catalogue.channels[0].key,'channel-1');
 assert.equal(current.catalogue.channels[0].videos.length,0);
 assert.equal(current.plan.schedules[0][0].video.id,'retiring');
 const future=buildLineup(cat,Date.parse('2026-11-17T12:00:00Z'));
 assert.equal(future.catalogue.channels[0].key,'channel-2');
 assert.match(future.plan.schedules[0][0].video.id,/^[ab]-2$/);
});
