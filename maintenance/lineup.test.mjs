import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {hydrateLibrary} from '../site/runtime-library.mjs';import {showIdentity} from '../site/show-library.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url))),cat=hydrateLibrary(read('runtime-library.json')),pack=read('lineup-expansion.json');
test('lineup retains existing channel numbers and adds four shuffle channels',()=>{assert(cat.channels.length>=24);assert.equal(cat.channels[9].key,'cinema');assert.deepEqual(cat.channels.slice(19,23).map(c=>c.key),['eighties','nineties','rewind-espanol','rewind-mandarin']);for(const c of cat.channels){assert(!/rewind/i.test(c.name));assert.equal(c.number,cat.channels.indexOf(c)+1);assert.equal(new Set(c.videos.map(v=>v.id)).size,c.videos.length);}for(const c of cat.channels.slice(19,24)){assert.equal(c.mode,'shuffle');assert.equal(c.adverts,false);assert(c.videos.length>=10);}});
test('new language sources have aged upload evidence and both playback samples',()=>{for(const v of pack.videos){assert(v.uploadDate<='2023-11-04');assert.equal(v.embedStatus,'playing');assert.equal(v.playbackCheck.start,true);assert.equal(v.playbackCheck.nearEnd,true);assert(['es','cmn'].includes(v.audioLanguage));assert(v.duration>=540);}assert.notEqual(showIdentity({series:'Inspector Gadget',audioLanguage:'es'}),showIdentity({series:'Inspector Gadget'}));});
test('decade assignments exclude explicitly later years and open-ended series metadata',()=>{for(const [i,min]of [[19,1980],[20,1990]])for(const v of cat.channels[i].videos){const label=String(v.yearLabel||v.year);assert(!/onward/i.test(label));for(const y of label.match(/\b(?:19|20)\d{2}\b/g)||[])assert(Number(y)>=min&&Number(y)<min+10,v.title);}});

test('00s TV and After School UK append two continuous stations using existing single episodes',()=>{
 const added=read('decade-and-after-school.json');
 assert.deepEqual(added.videos,[]);
 const previous=cat.channels.slice(0,30);
 const existing=new Set(previous.flatMap(channel=>channel.videos.filter(v=>v.enabled!==false).map(v=>v.id)));
 const stations=cat.channels.slice(30,32);
 assert.deepEqual(stations.map(c=>[c.number,c.key]),[[31,'noughties'],[32,'after-school-uk']]);
 for(const station of stations){
  assert.equal(station.mode,'shuffle');
  assert.equal(station.adverts,false);
  assert(station.videos.length>=100);
  assert.deepEqual(station.videos.slice(0,added.assignments[station.key].length).map(video=>video.id),added.assignments[station.key]);
  assert(station.videos.every(video=>existing.has(video.id)&&video.kind==='full episode'&&video.enabled!==false));
 }
 assert(stations[0].videos.every(video=>{
  const label=String(video.yearLabel||video.year);
  const years=label.match(/\b(?:19|20)\d{2}\b/g)||[];
  if(/^early 2000s$/i.test(label))return true;
  return years.length&&!/onward/i.test(label)&&years.every(year=>Number(year)>=2000&&Number(year)<=2009);
 }));
});
