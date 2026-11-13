import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {normalizeCountry,isRegionEligible,catalogueForCountry} from '../site/region-eligibility.mjs';
import {buildShowIndex,findProgramme,showIdentity} from '../site/show-library.mjs';
const app=fs.readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
const scheduleScope={};vm.runInNewContext(fs.readFileSync(new URL('../site/schedule.js',import.meta.url),'utf8'),scheduleScope);const Schedule=scheduleScope.RewindSchedule;

function fixture({library=false,blocked=false,paused=false}={}){
 const now=Date.now(),episode=(id,number,allowed)=>({id,title:'Story '+number,series:'A Show',episodeNumber:number,seasonNumber:1,kind:'full episode',duration:1200,...(allowed?{regionRestriction:{allowed}}:{})});
 const sourceCatalogue={version:1,channels:[{key:'fixed',number:1,mode:'scheduled',videos:[{...episode('fixed',1),series:'Fixed Show'}]},{key:'mix',number:7,mode:'shuffle',videos:[episode('both',1,['GI','GB']),episode('gibraltar',2,['GI']),episode('britain',3,['GB'])]},{key:'only-gi',number:33,mode:'shuffle',videos:[episode('only-gi',1,['GI'])]}],adverts:[]};
 const {catalogue,plan}=Schedule.buildLineup(catalogueForCountry(sourceCatalogue,'GI'));
 const mix=catalogue.channels[1],rows=mix.videos.map((video,index)=>({video,start:now-100000+index*1200000,end:now-100000+(index+1)*1200000}));plan.schedules[1]=rows;
 const index=blocked?1:0,video=mix.videos[index],active={video,index,slot:rows[index],offset:100,mode:library?'ondemand':'live'};
 const events=[],c={sourceCatalogue,viewingCountry:'GI',viewingCountrySource:'cached',countryPlaybackBlocked:false,loadGeneration:1,channels:catalogue.channels,catalogue,plan,channel:1,active,normalizeCountry,isRegionEligible,catalogueForCountry,Schedule,buildShowIndex,findProgramme,showIdentity,libraryContext:library,requestedQueue:mix.videos.slice(),requestedIndex:index,lastLiveChannelKey:'only-gi',scheduleChannel:2,scheduleStamp:'old',infoKey:'old',power:true,paused,playbackIntent:!paused,recoveryChain:4,
  checkpointLibrary:()=>events.push('checkpoint'),loadCountryFailures:()=>events.push('country failures'),clearNeighbours:()=>events.push('clear neighbours'),clearShuffleResult:()=>events.push('clear shuffle'),resetShuffle:()=>events.push('reset preview'),createChannelLists:()=>events.push('channel lists'),refreshCatalogueLabels(){},libraryView:{updateCatalogue:()=>events.push('library catalogue')},movieNight:{updateCatalogue:()=>events.push('film catalogue')},homeView:{updateCatalogue:()=>events.push('home catalogue')},refreshContinueWatching(){},updateCountrySettings(){},render:()=>events.push('render'),persist:()=>events.push('persist'),scheduleNeighbours:()=>events.push('prepare eligible'),panels:{isOpen:()=>false},$:()=>({}),sendScheduleState(){},showNotice:message=>events.push(['notice',message]),
  cancelChannelLoad:()=>events.push('cancel pending tune'),stopWatch:()=>events.push('stop watcher'),setStatus:message=>events.push(['status',message]),tune:index=>events.push(['tune',index]),skipUnavailable:(reason,persist)=>events.push(['recover',reason,persist]),
  currentPlayer(){throw Error('An eligible country change must not touch the mounted player');},ensurePlayer(){throw Error('An eligible country change must not load playback');}};
 vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function applyViewingCountry('),app.indexOf('  const reducedMotion=')),c);
 return {c,events,active,sourceCatalogue};
}

test('changing country keeps an eligible picture and clock while refreshing discovery, preview and hidden preloads',()=>{
 const f=fixture(),raw=JSON.stringify(f.sourceCatalogue),slot=f.active.slot;
 f.c.applyViewingCountry('GB','manual');
 assert.equal(f.c.active,f.active);assert.equal(f.c.active.slot,slot);assert.equal(f.c.active.offset,100);assert.equal(f.c.active.video.viewerCountry,'GB');assert.equal(JSON.stringify(f.sourceCatalogue),raw);
 assert.deepEqual(Array.from(f.c.channels,c=>c.number),[1,7]);assert.equal(f.c.lastLiveChannelKey,'mix');assert.equal(f.c.scheduleChannel,-1);
 assert(f.events.includes('clear neighbours'));assert(f.events.includes('reset preview'));assert(f.events.includes('library catalogue'));assert(f.events.includes('film catalogue'));assert(f.events.includes('home catalogue'));
 assert.equal(f.c.plan.schedules[1][0].video.id,'both');assert(!f.c.plan.schedules[1].some(row=>row.video.id==='gibraltar'));assert(!f.events.some(event=>Array.isArray(event)&&['tune','recover'].includes(event[0])));
});
test('Library country changes rebuild the queue using fresh eligibility while retaining the current mounted episode',()=>{
 const f=fixture({library:true});f.c.applyViewingCountry('GB','manual');
 assert.equal(f.c.active,f.active);assert.deepEqual(Array.from(f.c.requestedQueue,v=>v.id),['both','britain']);assert.equal(f.c.requestedIndex,0);assert.equal(f.c.active.offset,100);
});
test('a newly blocked live picture retunes while a paused Library picture waits for Play before no-persist recovery',()=>{
 const live=fixture({blocked:true});live.c.applyViewingCountry('GB');assert(live.events.some(event=>Array.isArray(event)&&event[0]==='tune'&&event[1]===1));
 const library=fixture({blocked:true,library:true,paused:true});library.c.applyViewingCountry('GB');assert(!library.events.some(event=>Array.isArray(event)&&event[0]==='recover'));assert.equal(library.c.playbackIntent,false);assert.equal(library.c.paused,true);assert(library.events.some(event=>Array.isArray(event)&&event[0]==='status'&&event[1].includes('Press Play')));
 const button={};library.c.$=()=>button;library.c.clearTimeout=()=>{};library.c.recoveryBackoffTimer=0;library.c.globallyRestricted=video=>!isRegionEligible(video,library.c.viewingCountry);vm.runInContext(app.slice(app.indexOf("  $('#tv-play').onclick="),app.indexOf("  $('.remote-power').onclick=")),library.c);button.onclick();
 const recovery=library.events.find(event=>Array.isArray(event)&&event[0]==='recover');assert(recovery);assert.equal(recovery[2],false);assert.equal(library.c.playbackIntent,true);assert.equal(library.c.paused,false);
});
test('a blocked Library episode recovers through the rebuilt country queue even when its old ID is absent',()=>{
 const f=fixture({blocked:true,library:true}),c=f.c;
 c.root={classList:{remove(){}}};c.failed=new Set();c.pendingLibraryResume=null;c.findFilmAlternative=()=>null;
 c.currentPlayer=()=>({getCurrentTime:()=>125,pauseVideo:()=>f.events.push('pause outgoing')});
 c.rememberFailure=()=>assert.fail('A country metadata exclusion must not persist a broken-video record');
 c.globallyRestricted=video=>!isRegionEligible(video,c.viewingCountry);c.ensurePlayer=()=>f.events.push('load eligible');
 c.requestedActive=video=>({video,offset:0,index:0,mode:'ondemand',slot:{video,start:Date.now(),end:Date.now()+video.duration*1000}});
 vm.runInContext(app.slice(app.indexOf('  function skipUnavailable('),app.indexOf('  const timeFormat=')),c);
 c.applyViewingCountry('GB');
 assert.deepEqual(Array.from(c.requestedQueue,video=>video.id),['both','britain']);assert.equal(c.active.video.id,'both');assert.equal(c.requestedIndex,0);assert.equal(c.channel,1);assert(f.events.includes('load eligible'));assert(f.events.includes('pause outgoing'));
 assert(c.failed.has('gibraltar'));assert.equal(c.active.video.viewerCountry,'GB');assert(!f.events.some(event=>Array.isArray(event)&&event[0]==='tune'));
});
test('the current country overrides stale queue metadata and empty shuffle fallbacks cannot resurrect regional exclusions',()=>{
 const c={viewingCountry:'GB',isRegionEligible};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function globallyRestricted('),app.indexOf('  function skipUnavailable(')),c);
 const stale={id:'blocked',viewerCountry:'GI',regionRestriction:{allowed:['GI']}};assert.equal(c.globallyRestricted(stale),true);
 c.channels=[{key:'mix',videos:[stale,{id:'allowed',viewerCountry:'GB',regionRestriction:{allowed:['GB']}}]}];c.failed=new Set(['allowed']);c.recent={};c.shuffleLastAd={};c.catalogue={adverts:[stale]};c.RewindShuffle={rows:(videos,recent,at,random,options)=>({ids:videos.map(v=>v.id),adverts:options.ads})};
 vm.runInContext(app.slice(app.indexOf('  function freshRows('),app.indexOf('  function onNow(')),c);const rows=c.freshRows(0);assert.deepEqual(Array.from(rows.ids),['allowed']);assert.equal(rows.adverts.length,0);
});
test('playback failure history is country-scoped and a new country does not inherit a previous country rejection',()=>{
 const records=new Map(),c={viewingCountry:'GI',failed:new Set(),localStorage:{getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)}};vm.createContext(c);
 vm.runInContext(app.slice(app.indexOf('  const countryFailureKey='),app.indexOf('  function globallyRestricted(')),c);
 c.rememberFailure('blocked-here');assert(records.has('rewind-unavailable:GI'));assert(!records.has('rewind-unavailable'));
 c.viewingCountry='GB';c.loadCountryFailures();assert.equal(c.failed.size,0);c.viewingCountry='GI';c.loadCountryFailures();assert(c.failed.has('blocked-here'));
});
