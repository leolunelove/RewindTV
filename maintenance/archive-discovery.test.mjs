import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SOURCE_FILES,withExpansion,withGameshowAdditions} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex,findProgramme} from '../site/show-library.mjs';
import {countLibraryStories} from '../site/library-meta.mjs';
import {createWatchHistory} from '../site/watch-history.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url)));
let base=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));
for(const f of SOURCE_FILES.slice(2).filter(f=>f!=='archive-discovery.json'))base=withExpansion(base,read(f));
const pack=read('archive-discovery.json'),cat=hydrateLibrary(compactLibrary(withExpansion(base,pack))),newIds=new Set(pack.videos.map(v=>v.id));
test('the new Library pack preserves every live station and fixed schedule',()=>{
 assert.deepEqual(cat.channels,hydrateLibrary(compactLibrary(base)).channels);
 const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);
 for(const when of ['2026-11-24T12:00:00Z','2026-12-01T12:00:00Z']){
  const plan=c=>scope.RewindSchedule.build(c,Date.parse(when)).schedules.map(rows=>rows.map(r=>[r.video.id,r.start,r.end]));assert.deepEqual(plan(cat),plan(base));
 }
});
test('Joneses has all 92 stories and exactly two adjacent multipart pairs',()=>{
 const show=buildShowIndex(cat).find(s=>s.title==='Where Are the Joneses?');assert(show);assert.equal(show.episodes.length,94);assert.equal(countLibraryStories(show.episodes).episodes,92);
 assert.deepEqual([...new Set(show.episodes.map(v=>v.episodeNumber))],Array.from({length:92},(_,i)=>i+1));assert.equal(show.episodes[0].id,'archive-joneses-001');assert.equal(show.episodes.at(-1).id,'archive-joneses-092');
 for(const n of [56,84]){const i=show.episodes.findIndex(v=>v.id===`archive-joneses-0${n}a`);assert(i>0);assert.equal(show.episodes[i+1].id,`archive-joneses-0${n}b`);assert.equal(show.episodes[i+2].episodeNumber,n+1);}
});
test('original full files are unique and shorter Galactic Vacation derivative is excluded',()=>{
 const existing=new Set([...base.channels.flatMap(c=>c.videos),...(base.libraryVideos||[])].map(v=>v.id)),urls=new Set(),hashes=new Set();
 for(const v of pack.videos){assert(!existing.has(v.id));assert(!urls.has(v.mediaUrl));urls.add(v.mediaUrl);assert(v.sourceFileEvidence.md5);assert(!hashes.has(v.sourceFileEvidence.md5));hashes.add(v.sourceFileEvidence.md5);assert(Math.abs(v.duration-v.sourceFileEvidence.duration)<1);assert(v.rights.attribution&&v.rights.evidenceUrl);}
 const galactic=pack.videos.find(v=>v.id==='archive-NasaSciFiles-TheCaseOfTheGalacticVacation');assert(galactic.duration>3380);assert(!galactic.mediaUrl.includes('_512kb'));assert.equal(pack.videos.filter(v=>v.series.startsWith('NASA')).length,39);
});
test('film language, short-film classification and original licence versions survive compact hydration',()=>{
 const nasty=cat.libraryVideos.find(v=>v.title==='Nasty Old People'),sintel=cat.libraryVideos.find(v=>v.title==='Sintel');assert.equal(nasty.audioLanguage,'sv');assert.equal(nasty.rights.licenseLabel,'CC BY-NC-SA 2.5 SE');assert.equal(sintel.kind,'short');assert.equal(sintel.rights.licenseLabel,'CC BY 3.0');assert(cat.libraryVideos.filter(v=>newIds.has(v.id)).every(v=>v.libraryOnly));
});
test('a multipart resume keeps the exact original file and its next part in a later session',()=>{
 const v=cat.libraryVideos.find(v=>v.id==='archive-joneses-056a'),saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 createWatchHistory({storage}).save(v,{position:90,channelKey:v.channelKey});const record=createWatchHistory({storage}).list(cat).find(r=>r.video.id===v.id);assert.equal(record.position,90);const found=findProgramme(cat,record.video.channelKey,record.video.id),i=found.queue.findIndex(x=>x.id===v.id);assert.equal(found.queue[i+1].id,'archive-joneses-056b');
});
