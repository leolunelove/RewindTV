import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
function fixture(){
 const calls=[],listeners=new Map();let now=1000;
 const movie={hidden:true,paused:true,readyState:0,currentTime:0,duration:3600,seeking:false,dataset:{},currentSrc:'',
  addEventListener(type,callback){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(callback);},
  load(){calls.push('load')},play(){calls.push('play');this.paused=false;return Promise.resolve()},pause(){calls.push('pause');this.paused=true},removeAttribute(n){calls.push('remove '+n)}};
 const c={Date:{now:()=>now},movie,movieLoading:false,settings:{preload:true},document:{hidden:false},navigator:{connection:{saveData:false}},active:{video:{id:'film',provider:'archive',mediaUrl:'https://archive.org/film.mp4'}},power:true,finishStartup(){},checkpointLibrary(){},setStatus(){},loadGeneration:0,channelLoadTimer:0,playbackIntent:true,paused:false,stopWatch(){},render(){},queueMicrotask(){},updateGlow(){},watchPlayback(){},clearTimeout(){},apiTimer:0,playerInitTimer:0,recoveryChain:0,recoveryAttempts:0,tuningTimer:0,channels:[{mode:'shuffle'}],channel:0,applyAudio(){},programmeTitle:video=>video.title||video.id,$:()=>({classList:{remove(){}}})};
 vm.createContext(c);vm.runInContext(app.slice(app.indexOf("  let movieSourceId="),app.indexOf('  const currentPlayer='))+'\nthis.adapter=archiveAdapter;',c);
 vm.runInContext(app.slice(app.indexOf("  movie.addEventListener('playing'"),app.indexOf('  const {createGuideOverview}')),c);
 return {c,movie,calls,setNow:value=>now=value,emit:type=>{for(const callback of listeners.get(type)||[])callback({target:movie});}};
}
test('cold film begins playback immediately without waiting for metadata',()=>{const f=fixture();f.c.setMovieSource(f.c.active.video,0,true);assert.deepEqual(f.calls,['load','play']);assert.equal(f.movie.preload,'auto');});
test('prepared and returning films retain the same source and buffered element',()=>{const f=fixture();f.c.prepareMovie({key:'movies',video:f.c.active.video,offset:0});assert.deepEqual(f.calls,['load']);assert.equal(f.movie.muted,true);f.movie.readyState=3;f.c.setMovieSource(f.c.active.video,0,true);assert.deepEqual(f.calls,['load','play']);});
test('metadata seeks to live position and a changed film loads exactly once',()=>{const f=fixture();f.c.setMovieSource(f.c.active.video,120,true);f.movie.onloadedmetadata();assert.equal(f.movie.currentTime,120);f.c.setMovieSource({...f.c.active.video,id:'other',mediaUrl:'https://archive.org/other.mp4'},0,true);assert.equal(f.calls.filter(v=>v==='load').length,2);});
test('buffering native video is not reported as playing',()=>{const f=fixture();f.movie.paused=false;f.movie.readyState=2;assert.equal(f.c.adapter.getPlayerState(),3);f.movie.readyState=3;assert.equal(f.c.adapter.getPlayerState(),1);f.movie.seeking=true;assert.equal(f.c.adapter.getPlayerState(),3);});
test('film preparation respects Data Saver, hidden tabs and off setting',()=>{for(const setting of ['data','hidden','off']){const f=fixture();if(setting==='data')f.c.navigator.connection.saveData=true;if(setting==='hidden')f.c.document.hidden=true;if(setting==='off')f.c.settings.preload=false;f.c.prepareMovie({video:f.c.active.video});assert.deepEqual(f.calls,[]);}});
test('clearing a prepared film releases its source without touching a visible film',()=>{const f=fixture();f.c.prepareMovie({video:f.c.active.video});f.c.releasePreparedMovie();assert.equal(f.c.adapter.getVideoData().video_id,'');assert.ok(f.calls.includes('remove src'));f.movie.hidden=false;f.calls.length=0;f.c.releasePreparedMovie();assert.deepEqual(f.calls,[]);});
test('returning to a film watched in this broadcast does not reshuffle away its buffer',()=>{const slot={video:{id:'film'},start:100,end:1000};let refreshed=0;const c={requestedQueue:[],requestedIndex:0,weekPlan(){},onNow:()=>({index:0,slot,offset:25}),plan:{schedules:[[slot]]},channel:0,channels:[{mode:'shuffle'}],failed:new Set(),recent:{film:200},freshRows:()=>{refreshed++;return [slot]},active:null,paused:false};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function selectLive(){'),app.indexOf('  function showTuning(){')),c);c.selectLive();assert.equal(refreshed,0);assert.equal(c.active.video.id,'film');assert.equal(c.active.offset,25);});
test('the first YouTube channel after a film hides the native screen before initialization',()=>{const c={cancelChannelLoad(){},active:{video:{provider:'youtube'}},movie:{hidden:false},movieLoading:true,ready:false,window:{YT:{Player(){}}},initPlayer(){},player:null};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function ensurePlayer('),app.indexOf('  function tune(i){')),c);c.ensurePlayer();assert.equal(c.movie.hidden,true);assert.equal(c.movieLoading,false);});
test('explicit native retry discards a stalled source, while ordinary return preserves it',()=>{const f=fixture();f.c.setMovieSource(f.c.active.video,0,true);f.c.adapter.reloadVideo({video:f.c.active.video,offset:0});assert.equal(f.calls.filter(v=>v==='load').length,2);});
test('new and retried Archive sources reset transfer timestamps while a buffered return retains them',()=>{
 const f=fixture();f.c.setMovieSource(f.c.active.video,0,true);
 assert.equal(f.movie.dataset.loadStartedAt,'1000');assert.equal(f.movie.dataset.progressAt,'');
 f.movie.dataset.progressAt='1200';f.setNow(1500);f.movie.readyState=3;
 f.c.setMovieSource(f.c.active.video,0,true);
 assert.equal(f.movie.dataset.loadStartedAt,'1000');assert.equal(f.movie.dataset.progressAt,'1200');
 const next={id:'other',provider:'archive',mediaUrl:'https://archive.org/other.mp4'};
 f.setNow(2000);f.c.setMovieSource(next,0,true);
 assert.equal(f.movie.dataset.loadStartedAt,'2000');assert.equal(f.movie.dataset.progressAt,'');
 f.movie.dataset.progressAt='2200';f.setNow(2500);f.c.adapter.reloadVideo({video:next,offset:0});
 assert.equal(f.movie.dataset.loadStartedAt,'2500');assert.equal(f.movie.dataset.progressAt,'');
});
test('only progress from the currently loaded Archive URL extends its transfer deadline',()=>{
 const f=fixture(),original=f.c.active.video;f.c.setMovieSource(original,0,true);
 f.movie.currentSrc=original.mediaUrl;f.setNow(1100);f.emit('progress');
 assert.equal(f.movie.dataset.progressAt,'1100');
 const next={id:'other',provider:'archive',mediaUrl:'https://archive.org/other.mp4'};
 f.c.active.video=next;f.setNow(2000);f.c.setMovieSource(next,0,true);
 // Browser events from the previous resource may still arrive after src changes.
 f.setNow(2100);f.emit('progress');assert.equal(f.movie.dataset.progressAt,'');
 f.movie.currentSrc=next.mediaUrl;f.setNow(2200);f.emit('progress');
 assert.equal(f.movie.dataset.progressAt,'2200');
});

function playingFilm(){
 const f=fixture();
 f.movie.hidden=false;
 f.c.setMovieSource(f.c.active.video,0,true);
 f.movie.currentSrc=f.c.active.video.mediaUrl;f.movie.readyState=3;f.movie.onloadedmetadata();f.emit('playing');
 f.calls.length=0;
 return f;
}
test('a native browser interruption updates Pause to Play and the first remote tap resumes',()=>{
 const f=playingFilm();f.movie.paused=true;f.emit('pause');
 assert.equal(f.c.paused,true);
 assert.equal(f.c.playbackIntent,true,'an external pause still permits native fullscreen controls to resume');
 const button={};f.c.$=()=>button;f.c.recoveryBackoffTimer=0;f.c.currentPlayer=()=>f.c.adapter;
 vm.runInContext(app.slice(app.indexOf("  $('#tv-play').onclick="),app.indexOf("  $('.remote-power').onclick=")),f.c);
 button.onclick();
 assert.equal(f.c.paused,false);assert.deepEqual(f.calls,['play']);
});
test('native fullscreen Play resumes an interrupted programme without being paused again',()=>{
 const f=playingFilm();f.movie.paused=true;f.emit('pause');
 f.movie.paused=false;f.emit('playing');
 assert.equal(f.c.paused,false);assert.equal(f.c.playbackIntent,true);
 assert.deepEqual(f.calls,[]);
});
test('native pause notifications from a handoff, new load, old source or preparation cannot cancel the current selection',()=>{
 for(const mode of ['pending tune','new generation','loading','old source','other provider','hidden preparation','ended']){
  const f=playingFilm();
  if(mode==='pending tune')f.c.channelLoadTimer=1;
  if(mode==='new generation')f.c.loadGeneration++;
  if(mode==='loading')f.c.movieLoading=true;
  if(mode==='old source')f.movie.currentSrc='https://archive.org/previous.mp4';
  if(mode==='other provider')f.c.active={video:{provider:'youtube'}};
  if(mode==='hidden preparation')f.movie.hidden=true;
  if(mode==='ended')f.movie.ended=true;
  f.movie.paused=true;f.emit('pause');
  assert.equal(f.c.paused,false,mode);assert.equal(f.c.playbackIntent,true,mode);
 }
});
test('foreground return reconciles a browser pause even if the native pause event was missed',()=>{
 const f=playingFilm();let visibility;
 f.c.document.addEventListener=(name,handler)=>{if(name==='visibilitychange')visibility=handler;};
 f.c.root={classList:{toggle(){}}};f.c.applyRasterMotion=()=>{};f.c.clearNeighbours=()=>{};f.c.scheduleNeighbours=()=>{};
 vm.runInContext(app.slice(app.indexOf("  document.addEventListener('visibilitychange'"),app.indexOf('  async function tuningSound')),f.c);
 f.movie.paused=true;visibility();
 assert.equal(f.c.paused,true);assert.equal(f.c.playbackIntent,true);
});
test('a rejected native play promise from an older generation cannot pause a later attempt at the same source',async()=>{
 const f=fixture();let reject;
 f.movie.play=()=>new Promise((resolve,fail)=>{reject=fail;});
 f.c.setMovieSource(f.c.active.video,0,true);f.c.loadGeneration++;
 reject(Object.assign(Error('Previous autoplay attempt'),{name:'NotAllowedError'}));
 await Promise.resolve();await Promise.resolve();
 assert.equal(f.c.paused,false);assert.equal(f.c.playbackIntent,true);
});
test('a current native autoplay rejection still exposes a deliberate Play action',async()=>{
 const f=fixture();f.movie.play=()=>Promise.reject(Object.assign(Error('Gesture needed'),{name:'NotAllowedError'}));
 f.c.setMovieSource(f.c.active.video,0,true);
 await Promise.resolve();await Promise.resolve();
 assert.equal(f.c.paused,true);assert.equal(f.c.playbackIntent,false);
});
