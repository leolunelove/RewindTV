import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withExpansion,withGameshowAdditions,EXPANSION_PACKS} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex} from '../site/show-library.mjs';

const name='power-rangers-depth.json',read=n=>JSON.parse(fs.readFileSync(new URL('../site/'+n,import.meta.url))),pack=read(name);
function load(include){let cat=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));for(const n of EXPANSION_PACKS)if(n!=='power-rangers-regional.json'&&(include||n!==name))cat=withExpansion(cat,read(n));return cat;}
const before=load(false),after=load(true),runtime=hydrateLibrary(compactLibrary(after)),video=pack.videos[0];
const identities=v=>new Set((v.coveredEpisodeNumbers||[v.episodeNumber]).filter(Number.isInteger).map(n=>`${v.franchiseSeasonNumber??v.seasonNumber}:${n}`));

test('the official double bill adds two evidenced Super Samurai stories without overlap',()=>{
 assert.deepEqual(pack.channels,[]);assert.equal(pack.videos.length,1);assert.deepEqual(pack.assignments,{'power-rangers':['J7bku2b0kVc']});
 assert.equal(video.series,'Power Rangers Super Samurai');assert.equal(video.title,'Trading Places + Something Fishy');assert.equal(video.seasonNumber,19);assert.deepEqual(video.coveredEpisodeNumbers,[3,4]);assert.deepEqual(video.publisherEpisodeNumbers,[3,4]);
 assert.deepEqual(video.episodeKeys,['power-rangers-super-samurai-s19e03','power-rangers-super-samurai-s19e04']);assert.equal(video.duration,2723);assert.equal(video.kind,'full episode');
 const prior=new Set(before.channels.find(c=>c.key==='power-rangers').videos.flatMap(v=>[...identities(v)]));for(const key of identities(video))assert(!prior.has(key),'An existing story must not be repeated through a double bill');
 assert.equal(video.canonicalIdentityMapping.status,'verified');assert.deepEqual(video.canonicalIdentityMapping.episodeNumbers,[3,4]);assert.equal(video.fullEpisodeEvidence.verified,true);assert.equal(video.fullEpisodeEvidence.boundarySeconds,1364);
 const exact='https://www.youtube.com/watch?v='+video.id;assert(video.canonicalIdentityMapping.primaryEvidenceUrls.includes(exact));assert(video.fullEpisodeEvidence.primaryEvidenceUrls.includes(exact));
 assert.match(video.synopsis,/repeated opening narration and end credits/);assert(!/theme|uncut/i.test(video.synopsis));assert.match(video.fullEpisodeEvidence.extentBasis,/no uninterrupted full-watch claim/);
});

test('the accepted source has unrestricted declarations and actual public-origin playback evidence',()=>{
 assert.equal(video.sourceType,'official');assert(!video.sourceProvenance);assert.equal(video.sourceChannelId,'UCbIm2iqwql8bFqkO2bHv7Mw');assert.equal(video.officialOwnershipVerified,true);assert.equal(video.sourceOwnershipStatus,'verified');assert(video.sourceOwnershipEvidence.url);assert(video.uploadDate&&video.credit);
 assert.equal(video.enabled,true);assert.equal(video.metadataStatus,'OK');assert.equal(video.availabilityEvidence.availableCountryCount,249);assert.equal(video.embeddable,true);assert.equal(video.embedStatus,'playing');assert(!video.regionRestriction?.allowed&&!video.regionRestriction?.blocked);
 const p=video.playbackCheck;assert(p.start&&p.nearEnd&&p.checkedAt&&p.region);assert.equal(p.origin,'https://tv.leolune.fun');assert(Math.abs(p.observedDuration-video.duration)<1);assert.match(p.evidenceFile,/power-rangers-depth-2026-11-13\/public-playback-checkpoint\.json$/);assert.match(video.availabilityEvidence.rawEvidence,/power-rangers-depth-2026-11-13\/metadata-checkpoint\.json#J7bku2b0kVc$/);
});

test('the existing 57 Power sources, all channel identities and fixed schedules are preserved',()=>{
 assert.equal(before.channels.length,33);assert.equal(after.channels.length,33);
 for(let i=0;i<before.channels.length;i++){const a=before.channels[i],b=after.channels[i];assert.deepEqual([b.key,b.number,b.mode],[a.key,a.number,a.mode]);assert.deepEqual(b.videos.slice(0,a.videos.length),a.videos);if(a.key!=='power-rangers')assert.deepEqual(b.videos,a.videos);}
 const a=before.channels.find(c=>c.key==='power-rangers'),b=after.channels.find(c=>c.key==='power-rangers');assert.equal(a.videos.length,57);assert.equal(b.videos.length,58);assert.equal(b.number,33);assert.equal(b.mode,'shuffle');assert.equal(new Set(b.videos.map(v=>v.id)).size,58);
 const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);const slots=cat=>JSON.stringify(scope.RewindSchedule.build(cat,Date.parse('2026-11-13T12:00:00Z')).schedules.slice(0,10).map(rows=>rows.map(r=>[r.video.id,r.start,r.end,r.advert])));assert.equal(slots(before),slots(after));
});

test('Library and the shipped compact catalogue retain the double bill and its edition note',()=>{
 const indexed=new Map(buildShowIndex(runtime).flatMap(show=>show.episodes.map(v=>[v.id,v]))),libraryVideo=indexed.get(video.id);assert(libraryVideo);assert.equal(libraryVideo.title,video.title);assert.equal(libraryVideo.episodeNumber,3);assert.equal(libraryVideo.formatLabel,'Two complete episodes · 3–4');assert.equal(libraryVideo.synopsis,video.synopsis);assert.equal(libraryVideo.sourceType,'official');
 const shipped=hydrateLibrary(read('runtime-library.json')),power=shipped.channels.find(c=>c.key==='power-rangers'),laterIds=new Set(read('power-rangers-regional.json').videos.map(v=>v.id));assert.equal(power.number,33);assert.equal(power.videos.filter(v=>!laterIds.has(v.id)).length,58);assert.equal(power.videos.find(v=>v.id===video.id).synopsis,video.synopsis);
 assert(EXPANSION_PACKS.indexOf(name)>EXPANSION_PACKS.indexOf('power-rangers-followup.json'));assert(EXPANSION_PACKS.indexOf(name)<EXPANSION_PACKS.indexOf('library-health.json'));
});
