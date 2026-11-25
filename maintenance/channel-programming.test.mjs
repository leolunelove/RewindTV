import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {applyChannelProgramming} from '../site/channel-programming.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
const scope={};
for(const script of ['schedule.js','shuffle.js'])vm.runInNewContext(fs.readFileSync(new URL('../site/'+script,import.meta.url),'utf8'),scope);
const now=Date.parse('2026-11-25T12:00:00Z');
const video=(id,extra={})=>({id,title:id,series:id,kind:'full episode',duration:7200,enabled:true,...extra});
const fixture=()=>({version:'stable',adverts:[video('ad',{kind:'advert',duration:30,family:true})],channels:[...Array.from({length:10},(_,i)=>({key:'main-'+i,number:i+1,mode:'scheduled',videos:[video('main-source-'+i)]})),{key:'christmas',number:14,mode:'shuffle',videos:Array.from({length:16},(_,i)=>video('x'+i,{kind:i%3?'full episode':'film'}))}]});
const policy=cat=>[{channelKey:'christmas',type:'seasonal',entries:cat.channels.at(-1).videos.map((v,i)=>({id:v.id,stories:[v.id+'-story'],slots:[i%3?'morning':'feature','late']}))}];
const timeline=rows=>Array.from(rows,row=>[row.video.id,row.start,row.end,row.advert]);

test('reviewed seasonal programming leaves every main-ten timestamp and source unchanged',()=>{
 const source=fixture(),snapshot=JSON.stringify(source),before=scope.RewindSchedule.build(source,now);
 const channels=applyChannelProgramming(source.channels,policy(source));
 const prepared={...source,channels},after=scope.RewindSchedule.build(prepared,now);
 assert.equal(JSON.stringify(source),snapshot);
 assert.deepEqual(timeline(after.schedules[0]),timeline(before.schedules[0]));
 for(let i=0;i<10;i++)assert.deepEqual(timeline(after.schedules[i]),timeline(before.schedules[i]));
 const rows=after.schedules[10];assert(rows.length);assert.equal(rows[0].start,after.week.start);assert(rows.at(-1).end>=after.week.end);
 for(let i=0;i<rows.length;i++){
  const row=rows[i];assert.equal(row.end-row.start,row.video.duration*1000);
  if(i)assert.equal(row.start,rows[i-1].end);
  if(row.advert)assert(!rows[i-1].advert,'breaks follow whole programmes');
 }
 const programmes=rows.filter(r=>!r.advert);
 assert.equal(new Set(programmes.slice(0,16).map(r=>r.video.id)).size,16);
 const previous=new Map();for(const row of programmes){if(previous.has(row.video.id))assert(row.start-previous.get(row.video.id)>=86400000);previous.set(row.video.id,row.end);}
 const round=hydrateLibrary(compactLibrary(prepared));
 assert.deepEqual(timeline(scope.RewindSchedule.build(round,now).schedules[10]),timeline(rows));
});

test('programming rejects overlapping stories, unknown sources and attempts to rewrite main channels',()=>{
 const cat=fixture(),base=policy(cat),snapshot=JSON.stringify(cat);
 const bad=[];
 const overlap=structuredClone(base);overlap[0].entries[1].stories=overlap[0].entries[0].stories;bad.push(overlap);
 const unknown=structuredClone(base);unknown[0].entries[0].id='missing';bad.push(unknown);
 const main=structuredClone(base);main[0].channelKey='main-0';bad.push(main);
 const dup=structuredClone(base);dup[0].entries.push(dup[0].entries[0]);bad.push(dup);
 const invalid=structuredClone(base);invalid[0].entries[0].slots=['made-up'];bad.push(invalid);
 for(const config of bad)assert.throws(()=>applyChannelProgramming(cat.channels,config));
 assert.equal(JSON.stringify(cat),snapshot);
});

test('a region-reduced or disabled seasonal pool remains continuous and terminates without fabricated content',()=>{
 const cat=fixture(),channels=applyChannelProgramming(cat.channels,policy(cat));
 channels.at(-1).videos=channels.at(-1).videos.slice(0,2);channels.at(-1).videos[0]={...channels.at(-1).videos[0],enabled:false};
 const rows=scope.RewindSchedule.build({...cat,channels},now).schedules[10];
 assert(rows.some(r=>!r.advert));assert(rows.filter(r=>!r.advert).every(r=>r.video.id==='x1'));
 channels.at(-1).videos=[];assert.equal(scope.RewindSchedule.build({...cat,channels},now).schedules[10].length,0);
});

test('language mixes keep opted-in series in episode order while leaving the default shuffle untouched',()=>{
 const videos=[video('a3',{series:'Drama',episodeNumber:3,seasonNumber:1}),video('b2',{series:'Cartoon',episodeNumber:2}),video('a1',{series:'Drama',episodeNumber:1,seasonNumber:1}),video('a2',{series:'Drama',episodeNumber:2,seasonNumber:1}),video('b1',{series:'Cartoon',episodeNumber:1})];
 const random=()=>.3;
 const ordered=scope.RewindShuffle.order(videos,{},random,{sequenceSeries:['Drama']});
 assert.deepEqual(Array.from(ordered.filter(v=>v.series==='Drama'),v=>v.id),['a1','a2','a3']);
 assert.deepEqual(Array.from(scope.RewindShuffle.order(videos,{},random),v=>v.id),Array.from(scope.RewindShuffle.order(videos,{},random,{}),v=>v.id));
 const cat=fixture();cat.channels.at(-1).videos=videos;
 const next=applyChannelProgramming(cat.channels,[{channelKey:'christmas',type:'ordered-mix',series:['Drama']}]);
 assert.equal(next.at(-1).mode,'shuffle');assert.deepEqual(next.at(-1).sequenceSeries,['Drama']);
 const rows=scope.RewindShuffle.rows(videos,{},now,random,{sequenceSeries:next.at(-1).sequenceSeries});
 assert.deepEqual(Array.from(rows.filter(r=>r.video.series==='Drama'),r=>r.video.id),['a1','a2','a3']);
});

test('Guide calendar windows include midnight carry-over and honour Gibraltar daylight-saving days',()=>{
 const {dayAt}=scope.RewindSchedule;
 assert.equal(dayAt(Date.parse('2026-11-25T12:00:00Z')).start,Date.parse('2026-11-24T23:00:00Z'));
 for(const [date,hours] of [['2026-03-29T12:00:00Z',23],['2026-10-25T12:00:00Z',25]]){
  const day=dayAt(Date.parse(date));assert.equal((day.end-day.start)/3600000,hours);
  const continuing={start:day.start-3600000,end:day.start+1800000};
  assert(continuing.end>day.start&&continuing.start<day.end);
 }
});
