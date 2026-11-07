import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {findFilmAlternative} from '../site/playback-alternatives.mjs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
function stateFixture(){const calls=[],player={getVideoData:()=>({video_id:'current'}),pauseVideo:()=>calls.push('pause')};const c={tracePlayer(){},player,power:true,active:{video:{id:'current',provider:'youtube'}},playbackIntent:true,channelLoadTimer:0,paused:false,setStatus:msg=>calls.push(msg),watchPlayback:()=>calls.push('watch'),stopWatch:()=>calls.push('stop'),advance:()=>calls.push('advance')};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function onPlayerStateChange'),app.indexOf('  function onPlayerAutoplayBlocked')),c);return {c,calls,player};}
test('late pause from a reused YouTube player cannot cancel the selected channel',()=>{const f=stateFixture();f.c.onPlayerStateChange({target:f.player,data:2});assert.equal(f.c.paused,false);assert.deepEqual(f.calls,['watch']);});
test('user pause remains a deliberate pause rather than an automatic retry',()=>{const f=stateFixture();f.c.playbackIntent=false;f.c.onPlayerStateChange({target:f.player,data:2});assert.equal(f.c.paused,true);assert.equal(f.calls[0],'stop');});
test('buffering after playback arms recovery again',()=>{const f=stateFixture();f.c.onPlayerStateChange({target:f.player,data:3});assert.equal(f.calls.at(-1),'watch');});
test('callbacks from a superseded provider or queued channel are ignored',()=>{const f=stateFixture();f.c.active.video.provider='archive';f.c.onPlayerStateChange({target:f.player,data:0});f.c.active.video.provider='youtube';f.c.channelLoadTimer=1;f.c.onPlayerStateChange({target:f.player,data:2});assert.deepEqual(f.calls,[]);});
function watchdog(provider='youtube',readyState=0){
 const timers=new Map(),deadlines=new Map(),calls=[];let n=0,now=0;
 const c={Date:{now:()=>now},ready:true,movie:{readyState,dataset:{loadStartedAt:'0',progressAt:''}},active:{video:{id:'x',provider}},loadGeneration:1,playbackIntent:true,power:true,paused:false,document:{hidden:false},watchTimer:0,
  clearTimeout(id){timers.delete(id);deadlines.delete(id);},
  setTimeout(fn,delay){timers.set(++n,fn);deadlines.set(n,now+delay);return n;},
  currentPlayer:()=>({getPlayerState:()=>3}),playSelection:()=>calls.push('retry'),skipUnavailable:()=>calls.push('skip'),setStatus(){},programmeTitle:video=>video.title||video.id
 };
 function advanceTime(milliseconds){
  const end=now+milliseconds;
  while(deadlines.size){
   const [id,at]=[...deadlines].sort((a,b)=>a[1]-b[1])[0];
   if(at>end)break;
   now=at;const callback=timers.get(id);timers.delete(id);deadlines.delete(id);callback();
  }
  now=end;
 }
 vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  let recoveryId='),app.indexOf('  function advance(')),c);
 return {c,calls,timers,advanceTime};
}
test('repeated buffering notifications cannot postpone the recovery deadline',()=>{const f=watchdog();f.c.watchPlayback();const timer=f.c.watchTimer;f.c.watchPlayback();assert.equal(f.c.watchTimer,timer);assert.equal(f.timers.size,1);});
test('a watchdog from a channel already left cannot reload the new station',()=>{const f=watchdog();f.c.watchPlayback();f.c.loadGeneration++;[...f.timers.values()][0]();assert.deepEqual(f.calls,[]);});
test('a cold Archive start retries after eight seconds and then skips automatically',()=>{
 const f=watchdog('archive',0);f.c.watchPlayback();
 f.advanceTime(7999);assert.deepEqual(f.calls,[]);
 f.advanceTime(1);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(7999);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(1);assert.deepEqual(f.calls,['retry','skip']);
 assert.equal(f.timers.size,0);
});
test('recent Archive transfer progress extends a cold start without spending its retry',()=>{
 const f=watchdog('archive',0);f.c.watchPlayback();
 f.advanceTime(7000);f.c.movie.dataset.progressAt='7000';
 f.advanceTime(1000);assert.deepEqual(f.calls,[]);assert.equal(f.timers.size,1);
 f.advanceTime(7000);f.c.movie.dataset.progressAt='15000';
 f.advanceTime(1000);assert.deepEqual(f.calls,[]);assert.equal(f.timers.size,1);
 // Once bytes stop arriving, the first real recovery attempt is still available.
 f.advanceTime(8000);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(8000);assert.deepEqual(f.calls,['retry','skip']);
});
test('stale Archive progress cannot postpone the ordinary eight-second retry',()=>{
 const f=watchdog('archive',0);f.c.watchPlayback();
 f.advanceTime(3000);f.c.movie.dataset.progressAt='3000';
 f.advanceTime(4999);assert.deepEqual(f.calls,[]);
 f.advanceTime(1);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(8000);assert.deepEqual(f.calls,['retry','skip']);
});
test('continuous Archive transfer progress cannot defer recovery beyond the thirty-second cap',()=>{
 const f=watchdog('archive',0);f.c.watchPlayback();
 for(const at of [7000,15000,23000]){
  f.advanceTime(7000);f.c.movie.dataset.progressAt=String(at);
  f.advanceTime(1000);assert.deepEqual(f.calls,[]);
 }
 f.advanceTime(7000);f.c.movie.dataset.progressAt='31000';
 f.advanceTime(999);assert.deepEqual(f.calls,[]);
 f.advanceTime(1);assert.deepEqual(f.calls,['retry']);
});
test('an Archive stream with metadata keeps both sixteen-second recovery windows',()=>{
 const f=watchdog('archive',1);f.c.watchPlayback();
 f.advanceTime(15999);assert.deepEqual(f.calls,[]);
 f.advanceTime(1);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(15999);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(1);assert.deepEqual(f.calls,['retry','skip']);
 assert.equal(f.timers.size,0);
});
test('a metadata arrival gives the next Archive retry the longer buffering window',()=>{
 const f=watchdog('archive',0);f.c.watchPlayback();
 f.advanceTime(7000);f.c.movie.readyState=1;
 f.advanceTime(1000);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(15999);assert.deepEqual(f.calls,['retry']);
 f.advanceTime(1);assert.deepEqual(f.calls,['retry','skip']);
});
test('a cold Archive watchdog expires harmlessly after a newer tune generation',()=>{
 const f=watchdog('archive',0);f.c.watchPlayback();
 f.advanceTime(7000);f.c.movie.dataset.progressAt='7000';f.c.loadGeneration++;
 f.advanceTime(9000);assert.deepEqual(f.calls,[]);
 assert.equal(f.timers.size,0);
});
function unavailableFixture(original,{others=[],extraChannels=[],queue=[original],elapsed=0}={}){
 const events=[],notices=[],saved=new Map(),location={href:'https://tv.leolune.fun/?release=test&channel=cinema&episode='+original.id+'#watch'};
 const channels=[{key:'cinema',name:'Cinema',mode:'scheduled',videos:[original,...others]},...extraChannels];
 const c={Date:{now:()=>1000000},URL,location,volume:75,history:{state:{view:'watch'},replaceState(state,unused,url){location.href=String(url);events.push('persist');}},localStorage:{setItem:(key,value)=>saved.set(key,value)},
  power:true,active:{mode:'ondemand',video:original,offset:0},loadGeneration:0,recoveryChain:0,playbackIntent:true,failed:new Set(),root:{classList:{remove(){}}},
  stopWatch(){},currentPlayer:()=>({getCurrentTime:()=>elapsed,pauseVideo:()=>events.push('pause')}),rememberFailure(id){c.failed.add(id);},
  requestedQueue:queue,requestedIndex:0,globallyRestricted:video=>!!video.regionRestriction,channels,catalogue:{channels},findFilmAlternative,channel:0,
  movieSourceId:'',movie:{readyState:0},RewindShuffle:{rows:videos=>videos.map(video=>({video,start:0,end:100}))},recent:{},onNow:()=>({index:0}),setStatus(){},
  showNotice(message){notices.push(message);events.push('notice');},ensurePlayer(){events.push('ensure');}
 };
 vm.createContext(c);
 vm.runInContext(app.slice(app.indexOf('  function requestedActive('),app.indexOf('  const shuffleDialog=')),c);
 vm.runInContext(app.slice(app.indexOf('  function persist(){'),app.indexOf('  function weekPlan(')),c);
 vm.runInContext(app.slice(app.indexOf('  function skipUnavailable'),app.indexOf('  const timeFormat=')),c);
 return {c,events,notices,saved,location};
}
test('exhausted requested episodes announce a fallback and persist the live URL before playback',()=>{
 const f=unavailableFixture({id:'bad',kind:'full episode',duration:1200},{others:[{id:'good',duration:1200}]});f.c.skipUnavailable('Unavailable',false);
 assert.equal(f.c.active.video.id,'good');assert.equal(f.c.active.mode,'fallback');assert(f.c.failed.has('bad'));
 assert.equal(f.c.requestedQueue.length,0);assert.deepEqual(f.events,['pause','notice','persist','ensure']);
 assert.deepEqual(f.notices,['This episode could not start. Returning to Cinema live.']);
 const url=new URL(f.location.href);assert.equal(url.searchParams.has('episode'),false);assert.equal(url.searchParams.get('channel'),'cinema');assert.equal(url.searchParams.get('release'),'test');assert.equal(url.hash,'#watch');
});
test('an explicit film without another upload explains the return to live and clears its stale episode URL',()=>{
 const original={id:'chosen',title:'His Girl Friday',kind:'film',year:1940,duration:5520,provider:'archive'};
 const live={id:'live-film',title:'Another Film',kind:'film',year:1960,duration:6000,provider:'youtube'};
 const f=unavailableFixture(original,{others:[live],elapsed:120});f.c.skipUnavailable('Signal did not start',false);
 assert.equal(f.c.active.video,live);assert.equal(f.c.active.mode,'fallback');assert.equal(f.c.requestedQueue.length,0);
 assert.deepEqual(f.notices,['His Girl Friday could not start. Returning to Cinema live.']);
 assert.deepEqual(f.events,['pause','notice','persist','ensure']);
 const url=new URL(f.location.href);assert.equal(url.searchParams.has('episode'),false);assert.equal(url.searchParams.get('channel'),'cinema');
 assert.equal(JSON.parse(f.saved.get('rewind-tv-v2')).key,'cinema');
});
test('another upload of the chosen film retains its position and persists its actual owning channel',()=>{
 const original={id:'chosen',title:'His Girl Friday',kind:'film',year:1940,duration:5520,provider:'archive'};
 const alternate={...original,id:'same-film',provider:'youtube',duration:5500};
 const f=unavailableFixture(original,{extraChannels:[{key:'classics',name:'Classics',mode:'scheduled',videos:[alternate]}],elapsed:123});
 f.c.skipUnavailable('Signal did not start',false);
 assert.equal(f.c.active.video,alternate);assert.equal(f.c.active.mode,'ondemand');assert.equal(f.c.channel,1);assert.equal(f.c.active.offset,123);
 assert.equal(f.c.active.slot.start,1000000-123000);assert.equal(f.c.active.slot.end-f.c.active.slot.start,5500000);
 assert.equal(f.c.requestedQueue.length,1);assert.equal(f.c.requestedQueue[0],alternate);
 assert.deepEqual(f.notices,['Trying another upload of His Girl Friday.']);assert.deepEqual(f.events,['pause','notice','persist','ensure']);
 const url=new URL(f.location.href);assert.equal(url.searchParams.get('channel'),'classics');assert.equal(url.searchParams.get('episode'),'same-film');
});
test('a failed on-demand episode skips restricted entries and persists the next episode before starting it',()=>{
 const original={id:'bad',kind:'full episode',duration:1200},blocked={id:'blocked',kind:'full episode',duration:1200,regionRestriction:{blocked:['GB']}},next={id:'next',kind:'full episode',duration:1200};
 const f=unavailableFixture(original,{others:[blocked,next],queue:[original,blocked,next]});f.c.skipUnavailable('Unavailable',false);
 assert.equal(f.c.active.video,next);assert.equal(f.c.active.mode,'ondemand');assert.equal(f.c.requestedIndex,2);
 assert.deepEqual(f.notices,['That episode could not start. Playing the next available episode.']);assert.deepEqual(f.events,['pause','notice','persist','ensure']);
 const url=new URL(f.location.href);assert.equal(url.searchParams.get('episode'),'next');assert.equal(url.searchParams.get('channel'),'cinema');
});
test('unidentified late errors cannot blacklist the newly selected video',()=>{const calls=[],player={getVideoData:()=>({})};const c={ready:true,console:{warn(){}},player,power:true,active:{video:{id:'current',provider:'youtube'}},channelLoadTimer:0,setStatus(){},watchPlayback:()=>calls.push('watch'),stopWatch:()=>calls.push('stop'),skipUnavailable:()=>calls.push('blacklist')};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function videoError('),app.indexOf('  function onPlayerStateChange')),c);c.videoError({target:player,data:150});assert.deepEqual(calls,['watch']);});
test('a stalled YouTube movie prefers a direct film when the channel has one',()=>{let pauses=0;const c={movieSourceId:'',movie:{readyState:0},power:true,playbackIntent:true,active:{mode:'live',video:{id:'bad',provider:'youtube'}},loadGeneration:0,recoveryChain:0,failed:new Set(),root:{classList:{remove(){}}},stopWatch(){},currentPlayer:()=>({pauseVideo:()=>pauses++}),rememberFailure(){},globallyRestricted:()=>false,channels:[{mode:'scheduled',videos:[{id:'bad'},{id:'other-youtube'},{id:'direct',provider:'archive'}]}],channel:0,RewindShuffle:{rows:videos=>{assert.deepEqual(videos.map(v=>v.id),['direct']);return [{video:videos[0],start:0,end:100}];}},recent:{},onNow:()=>({index:0}),setStatus(){},persist(){},ensurePlayer(){}};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function skipUnavailable'),app.indexOf('  const timeFormat=')),c);c.skipUnavailable('Signal did not start',false);assert.equal(c.active.video.id,'direct');assert.equal(pauses,1);});

for(const [outgoingProvider,fallbackProvider]of [['youtube','archive'],['archive','youtube']]){
 test(`recovery from ${outgoingProvider} to ${fallbackProvider} stops old audio and invalidates its watchdog`,()=>{
  const f=watchdog(outgoingProvider),c=f.c,events=[];
  const outgoing={playing:true,getPlayerState:()=>3,pauseVideo(){this.playing=false;events.push('pause outgoing');}};
  const incoming={playing:false,getPlayerState:()=>3};
  const fallback={id:'replacement',provider:fallbackProvider};
  Object.assign(c,{
   movieSourceId:'',recoveryChain:0,failed:new Set(),root:{classList:{remove(){}}},channel:0,recent:{},
   currentPlayer:()=>c.active.video.id==='x'?outgoing:incoming,
   stopWatch(){c.clearTimeout(c.watchTimer);c.watchTimer=0;},
   rememberFailure(){assert.fail('A transient timeout must remain a session failure');},
   globallyRestricted:()=>false,
   channels:[{mode:'scheduled',videos:[c.active.video,fallback]}],
   RewindShuffle:{rows:items=>items.map(video=>({video,start:0,end:60000}))},onNow:()=>({index:0}),
   persist(){},ensurePlayer(){assert.equal(outgoing.playing,false,'The old provider must be quiet before fallback starts');incoming.playing=true;events.push('play replacement');}
  });
  c.active.mode='live';
  vm.runInContext(app.slice(app.indexOf('  function skipUnavailable'),app.indexOf('  const timeFormat=')),c);
  c.watchPlayback();const staleWatchdog=[...f.timers.values()][0],generation=c.loadGeneration;
  c.skipUnavailable('Signal did not start',false);
  assert.equal(c.active.video.id,'replacement');
  assert.equal(outgoing.playing,false);assert.equal(incoming.playing,true);
  assert.deepEqual(events,['pause outgoing','play replacement']);
  assert.equal(c.loadGeneration,generation+1);
  staleWatchdog();
  assert.deepEqual(f.calls,[],'An old watchdog cannot retry or skip the replacement');
  assert.equal(c.active.video.id,'replacement');
 });
}
test('a PLAYING state with a frozen clock still retries then moves on',()=>{const f=watchdog();f.c.currentPlayer=()=>({getPlayerState:()=>1,getVideoData:()=>({video_id:'x'})});f.c.watchPlayback(true);const first=[...f.timers.values()][0];first();assert.deepEqual(f.calls,['retry']);[...f.timers.values()].at(-1)();assert.deepEqual(f.calls,['retry','skip']);});
function progressFixture(){const calls=[];let time=10;const c={power:true,playbackIntent:true,paused:false,document:{hidden:false},channelLoadTimer:0,active:{video:{id:'x'}},loadGeneration:1,currentPlayer:()=>({getCurrentTime:()=>time,getPlayerState:()=>1,getVideoData:()=>({video_id:'x'})}),watchPlayback:force=>calls.push(force),stopWatch(){},recoveryAttempts:1,recoveryChain:1};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  let progressGeneration='),app.indexOf('  function advance(')),c);return {c,calls,setTime:v=>time=v};}
test('frozen playback requires twelve visible seconds before recovery',()=>{const f=progressFixture();f.c.checkPlaybackProgress(0);f.c.checkPlaybackProgress(11999);assert.deepEqual(f.calls,[]);f.c.checkPlaybackProgress(12000);assert.deepEqual(f.calls,[true]);});
test('advancing playback, deliberate pause, and a new tune reset freeze detection',()=>{const f=progressFixture();f.c.checkPlaybackProgress(0);f.setTime(11);f.c.checkPlaybackProgress(11000);f.c.checkPlaybackProgress(12000);assert.deepEqual(f.calls,[]);f.c.paused=true;f.c.checkPlaybackProgress(30000);f.c.paused=false;f.c.checkPlaybackProgress(40000);f.c.loadGeneration++;f.c.checkPlaybackProgress(60000);assert.deepEqual(f.calls,[]);});
function apiFixture(){const timers=[],calls=[];const c={apiTimer:0,apiLoading:true,ready:false,power:true,playbackIntent:true,active:{video:{provider:'youtube'}},document:{getElementById:()=>({remove:()=>calls.push('remove')})},clearTimeout(){},setTimeout(fn,delay){timers.push({fn,delay});return timers.length;},setStatus(){},ensurePlayer:()=>calls.push('ensure')};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  let apiRecoveryTimer='),app.indexOf('  function ensurePlayer(')),c);return {c,timers,calls};}
test('API network failure reconnects automatically with a capped backoff',()=>{const f=apiFixture();f.c.recoverPlayerApi();assert.equal(f.c.apiLoading,false);assert.equal(f.timers[0].delay,1500);f.timers[0].fn();assert.equal(f.calls.at(-1),'ensure');f.c.recoverPlayerApi();assert.equal(f.timers.at(-1).delay,15000);});
test('API retry cannot interrupt Archive, deliberate pause, or a ready player',()=>{for(const mode of ['archive','pause','ready']){const f=apiFixture();if(mode==='archive')f.c.active.video.provider='archive';if(mode==='pause')f.c.playbackIntent=false;if(mode==='ready')f.c.ready=true;f.c.recoverPlayerApi();assert.equal(f.timers.length,0);}});
