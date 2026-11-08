import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
const part=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
function fixture(){
 const events=[],a={id:'a',title:'One',series:'Show',duration:600,channelKey:'archive'},b={id:'b',title:'Two',series:'Show',duration:600,channelKey:'other'},channels=[{key:'live',videos:[]},{key:'archive',videos:[a]},{key:'other',videos:[b]}];
 const nodes=new Map(),node=id=>nodes.get(id)||nodes.set(id,{id,hidden:false,setAttribute(){},classList:{remove(){}},addEventListener(){}}).get(id);
 const c={libraryContext:false,libraryEnded:false,libraryOrigin:'shows',librarySession:null,lastLiveChannelKey:'live',active:{video:{id:'broadcast'},offset:0},channel:0,channels,catalogue:{channels},requestedQueue:[],requestedIndex:0,power:true,paused:false,playbackIntent:true,loadGeneration:0,recoveryBackoffTimer:0,Date,Math,
 location:{hash:'#library'},history:{state:{},back:()=>events.push('back')},panels:{open:(page,options)=>{events.push(['page',page.id,options]);c.location.hash='#library-watch';c.history.state=options.state;},},$:(id)=>node(id),root:{addEventListener(){},classList:{remove(){}}},
 findProgramme:(cat,key,id)=>{const video=cat.channels.find(x=>x.key===key)?.videos.find(v=>v.id===id);return video?{video,queue:[video]}:null;},buildShowIndex:()=>[{key:'show',episodes:[a,b]}],showIdentity:()=> 'show',
 checkpointLibrary(){},forgetFailure(){},clearShuffleResult(){},cancelChannelLoad(){events.push('cancel tune');},clearTimeout(){},tuningSound(){},stopWatch(){},currentPlayer:()=>({pauseVideo:()=>events.push('pause'),getVideoData:()=>({video_id:c.active.video.id}),getCurrentTime:()=>123}),clearNeighbours(){},setStatus:message=>events.push(['status',message]),ensurePlayer:()=>events.push('load'),persist:()=>events.push('persist'),render(){},revealControls(){},openBrowse:()=>events.push('browse'),openMovieNight:()=>events.push('films'),openSchedule:()=>events.push('guide'),remember(){},loadActive:()=>events.push('load'),failed:new Set(),rememberFailure:id=>c.failed.add(id),globallyRestricted:()=>false,findFilmAlternative:()=>null,showNotice(){},recoveryChain:0,
 selectLive(){c.active={mode:'live',video:{id:'broadcast'}};events.push('live');}
 };
 vm.createContext(c);
 for(const [start,end]of [['  function returnToPicture(){','  function backToTV(){'],['  function requestedActive(','  const shuffleDialog='],['  function checkpointLibrary(){','  function renderLibrary(){'],['  function skipUnavailable(','  const timeFormat='],['  function advance(','  function onPlayerStateChange'],['  function joinLive(){','  function togglePower(){']])vm.runInContext(part(start,end),c);
 return {c,events,a,b};
}
test('starting Library cancels pending tunes and returning live restores its separate station',()=>{
 const {c,events,a}=fixture();c.startLibrary(a);assert.equal(c.channel,1);assert.equal(c.lastLiveChannelKey,'live');assert.equal(c.libraryContext,true);assert.equal(events[0],'cancel tune');
 c.joinLive();assert.equal(c.channel,0);assert.equal(c.libraryContext,false);assert.equal(c.lastLiveChannelKey,'live');
});
test('browsing and returning to the same Library picture does not load or pause its provider',()=>{
 const {c,events,a}=fixture();c.startLibrary(a);events.length=0;c.backToLibrary();c.showLibraryPlayer();
 assert.ok(events.includes('back'));assert.equal(events.filter(x=>x==='load'||x==='pause').length,0);assert.equal(c.active.video.id,'a');
});
test('automatic episode advance keeps owning channel indices aligned across the show queue',()=>{
 const {c,a}=fixture();c.startLibrary(a);c.advance();assert.equal(c.active.video.id,'b');assert.equal(c.channel,2);assert.equal(c.lastLiveChannelKey,'live');
 c.advance();assert.equal(c.libraryEnded,true);assert.equal(c.libraryContext,true);assert.equal(c.active.video.id,'b');assert.equal(c.paused,true);assert.equal(c.playbackIntent,false);
});
test('an exhausted Library failure remains on the chosen collection rather than tuning live',()=>{
 const {c,events,a}=fixture();c.startLibrary(a);c.requestedQueue=[a];events.length=0;c.skipUnavailable('Unavailable');
 assert.equal(c.libraryEnded,true);assert.equal(c.libraryContext,true);assert.equal(c.active.video.id,'a');assert.equal(c.lastLiveChannelKey,'live');assert.ok(!events.includes('live'));
});
