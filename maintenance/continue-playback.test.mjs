import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createWatchHistory} from '../site/watch-history.mjs';
import {findProgramme,buildShowIndex,showIdentity} from '../site/show-library.mjs';

const source=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
const part=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};};
function fixture(storage=memory()){
 const events=[],first={id:'episode0001',title:'First episode',series:'Example Show',kind:'full episode',provider:'youtube',duration:600,episodeNumber:1},second={...first,id:'episode0002',title:'Second episode',episodeNumber:2},live={...first,id:'broadcast01',series:'Broadcast Show'};
 const catalogue={channels:[{key:'live',videos:[live]},{key:'archive',videos:[first,second]}]};let now=10000;
 const c={Date:{now:()=>now},Math,Number,URLSearchParams,libraryContext:true,libraryEnded:false,libraryOrigin:'shows',librarySession:null,librarySeek:null,pendingLibraryResume:null,document:{hidden:false},channelLoadTimer:0,removedProgress:new Set(),lastLiveChannelKey:'live',active:{mode:'ondemand',video:first,offset:0},channel:1,channels:catalogue.channels,catalogue,requestedQueue:[first,second],requestedIndex:0,power:true,paused:false,playbackIntent:true,loadGeneration:12,playerLoadGeneration:12,recoveryBackoffTimer:0,movieLoading:false,moviePlaybackGeneration:12,movieSourceUrl:'https://archive.org/active.mp4',movie:{currentSrc:'https://archive.org/active.mp4',seeking:false},libraryView:null,movieNight:null,
  watchHistory:createWatchHistory({storage,now:()=>now}),findProgramme,buildShowIndex,showIdentity,location:{hash:'#library'},history:{state:{},back:()=>events.push('back')},window:new EventTarget(),root:{addEventListener(){},classList:{remove(){}}},
  returnToPicture(){},forgetFailure(){},clearShuffleResult(){},cancelChannelLoad(){events.push('cancel tune');},clearTimeout(){},tuningSound(){},stopWatch(){},clearNeighbours(){},setStatus:message=>events.push(['status',message]),persist(){},render(){},renderInfo(){},revealControls(){},openBrowse(){},openMovieNight(){},openSchedule(){},showNotice:message=>events.push(['notice',message]),remember(){},watchPlayback(){},failed:new Set(),rememberFailure(){},globallyRestricted:()=>false,findFilmAlternative:()=>null,recoveryChain:0};
 const provider={id:first.id,time:123,duration:600,pauseVideo:()=>events.push('pause'),getVideoData:()=>({video_id:provider.id}),getCurrentTime:()=>provider.time,getDuration:()=>provider.duration,seekTo:target=>events.push(['seek',target]),playVideo:()=>events.push('play')};
 c.currentPlayer=()=>provider;
 c.ensurePlayer=()=>{events.push('load');provider.id=c.active.video.id;provider.time=c.active.offset;c.playerLoadGeneration=c.loadGeneration;};
 c.loadActive=()=>events.push('load');
 c.selectLive=()=>{c.active={mode:'live',video:live,offset:0};events.push('live');};
 const nodes=new Map();c.$=id=>{if(!nodes.has(id))nodes.set(id,{id,setAttribute(){},addEventListener(){},click(){events.push(['click',id]);if(id==='#tv-play'){c.paused=false;provider.playVideo();}}});return nodes.get(id);};
 c.panels={open:(page,options)=>{events.push(['page',page.id]);c.location.hash='#library-watch';c.history.state=options.state;}};
 vm.createContext(c);
 for(const [start,end]of [['  function requestedActive(','  const shuffleDialog='],["  function continueItems(",'  function renderLibrary(){'],['  function seekProgramme(','  $(\'#info-seek\').oninput='],['  function skipUnavailable(','  const timeFormat='],['  let recoveryId=','  function advance('],['  function advance(','  function videoError('],['  function joinLive(){','  function togglePower(){'],['  function restorePlayback(','  tick();setInterval']])vm.runInContext(part(start,end),c);
 return {c,events,first,second,live,provider,storage,setNow:value=>now=value};
}

test('leaving Library checkpoints its exact episode before switching to the saved live channel',()=>{
 const {c,provider,first,events}=fixture();provider.time=143;c.joinLive();
 assert.equal(c.watchHistory.get(first).position,143);assert.equal(c.channel,0);assert.equal(c.libraryContext,false);assert.equal(c.lastLiveChannelKey,'live');
 assert.ok(events.indexOf('pause')<events.indexOf('live'));
 provider.time=300;c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,143,'live playback must not move Library progress');
});

test('a later app instance resolves only the matching episode offset and resumes it',()=>{
 const first=fixture();first.c.checkpointLibrary();const next=fixture(first.storage);
 assert.equal(next.c.savedLibraryOffset('archive',next.first.id),123);assert.equal(next.c.savedLibraryOffset('archive',next.second.id),0);
 next.c.libraryContext=false;next.c.active={mode:'live',video:next.live};next.events.length=0;
 const entry=next.c.continueItems()[0];assert.equal(next.c.resumeLibrary(entry),true);assert.equal(next.c.active.video.id,next.first.id);assert.equal(next.c.active.offset,123);assert.equal(next.events.filter(event=>event==='load').length,1);
});

test('Resume on the current programme returns to its picture without a load or seek',()=>{
 const {c,events}=fixture();c.checkpointLibrary();events.length=0;c.resumeLibrary(c.continueItems()[0]);
 assert.ok(events.some(event=>Array.isArray(event)&&event[0]==='page'));assert.ok(!events.some(event=>event==='load'||Array.isArray(event)&&event[0]==='seek'));
 c.paused=true;events.length=0;c.resumeLibrary(c.continueItems()[0]);assert.equal(c.paused,false);assert.ok(events.includes('play'));assert.ok(!events.includes('load'));
});

test('seek intent is saved immediately and an old provider clock cannot undo it',()=>{
 const {c,provider,first,setNow}=fixture();c.seekProgramme(250);assert.equal(c.watchHistory.get(first).position,250);
 provider.time=123;c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,250);
 provider.time=251;setNow(11000);c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,251);
});

test('rewinding the saved episode to its beginning clears its old resume point without clearing another episode',()=>{
 const {c,first,second,provider}=fixture();c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,123);
 c.seekProgramme(0);assert.equal(c.watchHistory.get(first),null);assert.equal(c.librarySession.offset,0);
 provider.time=123;c.checkpointLibrary();assert.equal(c.watchHistory.get(first),null,'the old seek clock must not recreate the removed minute');
 c.watchHistory.save(second,{channelKey:'archive',position:180,duration:600,origin:'shows'});
 c.seekProgramme(0);assert.equal(c.watchHistory.get(second).id,second.id);assert.equal(c.watchHistory.get(second).position,180);
});

test('a stale source or unfinished Archive handoff cannot write progress against the selected episode',()=>{
 const {c,provider,first}=fixture();c.checkpointLibrary();provider.id='outgoing001';provider.time=350;c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,123);
 provider.id=first.id;c.active.video={...first,provider:'archive'};c.movie.currentSrc='https://archive.org/outgoing.mp4';c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,123);
 c.movie.currentSrc=c.movieSourceUrl;c.moviePlaybackGeneration=11;c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,123);
 c.moviePlaybackGeneration=12;c.movie.seeking=true;c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,123);
});

test('From start clears saved progress after checkpointing outgoing playback',()=>{
 const {c,first}=fixture();c.checkpointLibrary();assert.ok(c.watchHistory.get(first));c.startLibrary({...first,channelKey:'archive'},'shows',{fromStart:true});
 assert.equal(c.active.offset,0);assert.equal(c.watchHistory.get(first),null,'outgoing checkpoint must not recreate the cleared entry');
});

test('completed episodes leave Continue watching while later episode records survive stale end events',()=>{
 const {c,first,second,provider}=fixture();c.checkpointLibrary();provider.time=600;c.advance(false);assert.equal(c.watchHistory.get(first),null);assert.equal(c.active.video.id,second.id);
 c.watchHistory.save(second,{channelKey:'archive',position:80,duration:600,origin:'shows'});c.active={mode:'ondemand',video:first};c.requestedIndex=0;c.advance(false);
 assert.equal(c.watchHistory.get(second).id,second.id,'completion of an older episode must not delete a newer resume point');
});

test('a premature end notification preserves useful progress instead of erasing the selected episode',()=>{
 const {c,first}=fixture();c.checkpointLibrary();c.advance(false);assert.equal(c.watchHistory.get(first).position,123);
});

test('reload from a browsing route retains Library context, saved position and the separate live station',()=>{
 for(const route of ['#library','#movies','#guide']){
  const {c,first}=fixture();c.checkpointLibrary();c.libraryContext=false;c.power=false;c.active=null;c.location.hash=route;
  c.restorePlayback(new URLSearchParams({channel:'archive',episode:first.id,playback:'library'}));
  assert.equal(c.libraryContext,true,route);assert.equal(c.active.offset,123,route);assert.equal(c.active.video.id,first.id);assert.equal(c.lastLiveChannelKey,'live');
  c.joinLive();assert.equal(c.channel,0);assert.equal(c.active.mode,'live');
 }
});

test('an explicitly marked Watch reload restores live TV rather than restarting the Library episode',()=>{
 const {c,first}=fixture();c.checkpointLibrary();c.libraryContext=false;c.power=false;c.active=null;c.location.hash='#watch';
 c.restorePlayback(new URLSearchParams({channel:'archive',episode:first.id,playback:'library'}));
 assert.equal(c.channel,0);assert.equal(c.libraryContext,false);assert.equal(c.active.mode,'live');assert.equal(c.watchHistory.get(first).position,123);
});

test('legacy unmarked on-demand links retain their existing from-start behavior',()=>{
 const {c,first}=fixture();c.checkpointLibrary();c.libraryContext=false;c.power=false;c.active=null;c.location.hash='#watch';
 c.restorePlayback(new URLSearchParams({channel:'archive',episode:first.id}));
 assert.equal(c.libraryContext,false);assert.equal(c.active.mode,'ondemand');assert.equal(c.active.offset,0);assert.equal(c.watchHistory.get(first).position,123);
});

test('removing the currently playing title suppresses automatic reinsertion until explicitly resumed',()=>{
 const {c,first,provider}=fixture();c.checkpointLibrary();const key=c.watchHistory.get(first).key;c.removeContinue(key);provider.time=180;c.checkpointLibrary();assert.equal(c.watchHistory.get(first),null);
 c.startLibrary({...first,channelKey:'archive'},'shows',{offset:180});provider.time=181;c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,181);
});

test('pagehide saves the most recent clock even when the five-second checkpoint has not run',()=>{
 const {c,provider,first}=fixture();provider.time=222;c.window.dispatchEvent(new Event('pagehide'));assert.equal(c.watchHistory.get(first).position,222);
});

test('failed Resume keeps the chosen episode and saved clock instead of advancing to the next episode',()=>{
 const {c,events,first}=fixture();c.watchHistory.save(first,{channelKey:'archive',position:187,duration:600,origin:'shows'});
 c.libraryContext=false;c.resumeLibrary(c.continueItems()[0]);assert.equal(c.active.offset,187);assert.equal(c.pendingLibraryResume.id,first.id);
 events.length=0;c.skipUnavailable('Range request did not start',false);
 assert.equal(c.active.video.id,first.id);assert.equal(c.requestedIndex,0);assert.equal(c.libraryContext,true);assert.equal(c.libraryEnded,true);assert.equal(c.playbackIntent,false);
 assert.equal(c.watchHistory.get(first).position,187);assert.ok(!events.includes('load'),'failure must not silently load another episode');
});

test('Resume stays pending until its matching playback clock moves near the saved target in one generation',()=>{
 const {c,provider,first}=fixture();provider.getPlayerState=()=>1;c.pendingLibraryResume={id:first.id,position:187};provider.time=187;
 c.checkPlaybackProgress(1000);assert.ok(c.pendingLibraryResume,'one sample cannot establish clock movement');
 c.loadGeneration++;provider.time=188;c.checkPlaybackProgress(2000);assert.ok(c.pendingLibraryResume,'a new generation starts a new observation');
 provider.id='outgoing001';provider.time=189;c.checkPlaybackProgress(3000);assert.ok(c.pendingLibraryResume,'another source cannot confirm Resume');
 provider.id=first.id;provider.time=190;c.checkPlaybackProgress(4000);assert.ok(c.pendingLibraryResume);
 provider.time=191;c.checkPlaybackProgress(5000);assert.equal(c.pendingLibraryResume,null);
});

test('a playing clock before the requested Resume target does not confirm or overwrite the saved position',()=>{
 const {c,provider,first}=fixture();c.watchHistory.save(first,{channelKey:'archive',position:187,duration:600,origin:'shows'});
 provider.getPlayerState=()=>1;c.pendingLibraryResume={id:first.id,position:187};provider.time=100;
 c.checkPlaybackProgress(1000);provider.time=101;c.checkPlaybackProgress(2000);assert.ok(c.pendingLibraryResume);
 c.checkpointLibrary();assert.equal(c.watchHistory.get(first).position,187);
});
