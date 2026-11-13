import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withExpansion,withGameshowAdditions,EXPANSION_PACKS} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
import {buildShowIndex} from '../site/show-library.mjs';
import {catalogueForCountry,isRegionEligible,regionEligibility} from '../site/region-eligibility.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../site/'+name,import.meta.url))),name='power-rangers-regional.json',pack=read(name);
function load(include){let cat=withGameshowAdditions(read('catalogue.json'),read('gameshow-additions.json'));for(const file of EXPANSION_PACKS)if(include||file!==name)cat=withExpansion(cat,read(file));return cat;}
const before=load(false),after=load(true),runtime=hydrateLibrary(compactLibrary(after));
const power=cat=>cat.channels.find(channel=>channel.key==='power-rangers');
const identities=video=>(video.coveredEpisodeNumbers||[video.episodeNumber]).filter(Number.isInteger).map(number=>`${video.franchiseSeasonNumber??video.seasonNumber}:${number}`);
const excluded=['CN','HK','JP','KH','KP','KR','LA','MM','MO','TH','TW'];

test('regional official sources add38 named complete episodes without repeating the prior58 uploads',()=>{
 assert.deepEqual(pack.channels,[]);assert.equal(pack.videos.length,38);assert.deepEqual(Object.keys(pack.assignments),['power-rangers']);assert.deepEqual(new Set(pack.assignments['power-rangers']),new Set(pack.videos.map(video=>video.id)));
 const oldIds=new Set(power(before).videos.map(video=>video.id)),keys=new Set(power(before).videos.flatMap(identities)),counts={};
 for(const video of pack.videos){assert(!oldIds.has(video.id));for(const key of identities(video)){assert(!keys.has(key),`Repeated canonical episode ${key}`);keys.add(key);}counts[video.series]=(counts[video.series]||0)+1;assert.equal(video.kind,'full episode');assert.equal(video.coveredEpisodeNumbers.length,1);assert(video.duration>=1140);assert.equal(video.canonicalIdentityMapping.status,'verified');assert.equal(video.fullEpisodeEvidence.verified,true);assert.deepEqual(video.canonicalIdentityMapping.episodeNumbers,video.coveredEpisodeNumbers);assert.equal(video.title,video.canonicalIdentityMapping.episodeTitle);assert.deepEqual(video.publisherEpisodeNumbers,video.canonicalIdentityMapping.publisherEpisodeNumbers);assert(video.canonicalIdentityMapping.primaryEvidenceUrls.includes('https://www.youtube.com/watch?v='+video.id));}
 assert.deepEqual(counts,{'Power Rangers Samurai':19,'Power Rangers Super Samurai':19});
});

test('every regional upload retains its exact238-country allowlist and truthful public playback evidence',()=>{
 for(const video of pack.videos){const allowed=video.regionRestriction.allowed;assert.equal(allowed.length,238);assert.equal(new Set(allowed).size,238);assert.deepEqual(allowed,video.availabilityEvidence.availableCountries);assert.equal(video.availabilityEvidence.availableCountryCount,238);assert.match(video.availabilityEvidence.scope,/238.*region filtering required/);assert.match(video.availabilityEvidence.scope,/not worldwide/i);assert.equal(video.sourceChannelId,'UCLbqoBTWE3TKOX7ge6DdA7Q');assert.equal(video.sourceType,'official');assert(!video.sourceProvenance);assert.equal(video.officialOwnershipVerified,true);assert.equal(video.sourceOwnershipStatus,'verified');assert(video.sourceOwnershipEvidence.primaryEvidenceUrls.length);assert.equal(video.metadataStatus,'OK');assert.equal(video.embeddable,true);assert.equal(video.enabled,true);const proof=video.playbackCheck;assert(proof.start&&proof.nearEnd&&proof.checkedAt&&proof.region);assert.equal(proof.origin,'https://tv.leolune.fun');assert(Math.abs(proof.observedDuration-video.duration)<5);assert.match(proof.evidenceFile,/power-rangers-depth-2026-11-13\/expanded-public-playback-checkpoint\.json$/);assert.equal(video.availabilityEvidence.rawEvidence,`work/power-rangers-depth-2026-11-13/metadata-checkpoint.json#${video.id}`);}
});

test('GI and GB can discover the new episodes, CN and all declared exclusions cannot, and unknown uses bounded recovery',()=>{
 const sample=pack.videos[0];for(const country of ['GI','GB','US','FR','ES'])assert(isRegionEligible(sample,country),country);for(const country of excluded)assert(!isRegionEligible(sample,country),country);assert.equal(regionEligibility(sample,null).reason,'country-unknown');assert.equal(isRegionEligible(sample,null),true);
 const gi=catalogueForCountry(runtime,'GI'),cn=catalogueForCountry(runtime,'CN'),unknown=catalogueForCountry(runtime,null);assert.equal(power(gi).videos.length,96);assert.equal(power(cn).videos.length,58);assert.equal(power(unknown).videos.length,96);assert.equal(power(runtime).videos.length,96,'Regional projection must preserve the raw catalogue');assert.deepEqual(power(runtime).videos.at(-1).regionRestriction.allowed,pack.videos.at(-1).regionRestriction.allowed);assert.equal(Object.hasOwn(power(runtime).videos.at(-1),'viewerCountry'),false);assert.equal(power(gi).videos.at(-1).viewerCountry,'GI');
 const giLibrary=new Set(buildShowIndex(gi).flatMap(show=>show.episodes.map(video=>video.id))),cnLibrary=new Set(buildShowIndex(cn).flatMap(show=>show.episodes.map(video=>video.id)));for(const video of pack.videos){assert(giLibrary.has(video.id));assert(!cnLibrary.has(video.id));}
});

test('all33 channels, prior records and the main10 fixed broadcasts remain unchanged',()=>{
 assert.equal(before.channels.length,33);assert.equal(after.channels.length,33);assert.equal(power(before).videos.length,58);assert.equal(power(after).videos.length,96);assert.equal(power(after).number,33);assert.equal(power(after).mode,'shuffle');assert.equal(new Set(power(after).videos.map(video=>video.id)).size,96);
 for(let i=0;i<before.channels.length;i++){const a=before.channels[i],b=after.channels[i];assert.deepEqual([b.key,b.number,b.mode],[a.key,a.number,a.mode]);assert.deepEqual(b.videos.slice(0,a.videos.length),a.videos);if(a.key!=='power-rangers')assert.deepEqual(b.videos,a.videos);}
 const scope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scope);for(const date of ['2026-11-13T12:00:00Z','2026-11-17T12:00:00Z']){const snapshot=cat=>JSON.stringify(scope.RewindSchedule.build(cat,Date.parse(date)).schedules.slice(0,10).map(rows=>rows.map(row=>[row.video.id,row.start,row.end,row.advert])));assert.equal(snapshot(before),snapshot(after));}
});

test('the shipped raw catalogue keeps all96 uploads and compact data retains country eligibility',()=>{
 const shipped=hydrateLibrary(read('runtime-library.json'));assert.equal(power(shipped).videos.length,96);assert.equal(power(shipped).number,33);for(const video of pack.videos){const stored=power(shipped).videos.find(row=>row.id===video.id);assert(stored);assert.deepEqual(stored.regionRestriction,video.regionRestriction);assert.equal(stored.sourceType,'official');assert(isRegionEligible(stored,'GI'));assert(!isRegionEligible(stored,'CN'));}
 assert(EXPANSION_PACKS.indexOf(name)>EXPANSION_PACKS.indexOf('power-rangers-depth.json'));assert(EXPANSION_PACKS.indexOf(name)<EXPANSION_PACKS.indexOf('library-health.json'));
});
