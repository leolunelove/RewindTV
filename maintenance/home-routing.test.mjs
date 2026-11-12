import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
const section=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));

test('only the implicit landing route becomes Home and keeps the current query',()=>{
 const changes=[];
 const context={URLSearchParams,location:{hash:'',search:'?channel=sitcom'},history:{state:{retained:true},replaceState:(...args)=>changes.push(args)}};
 vm.createContext(context);
 vm.runInContext(section('  function defaultHomeRoute(){','  defaultHomeRoute();'),context);
 context.defaultHomeRoute();
 assert.equal(changes.length,1);
 assert.equal(changes[0][0].retained,true);
 assert.equal(changes[0][0].rewind,true);
 assert.equal(changes[0][2],'#home');
 assert.equal(context.location.search,'?channel=sitcom');
 for(const hash of ['#home','#watch','#guide','#channels','#library','#movies','#library-watch']){
  context.location.hash=hash;context.defaultHomeRoute();
 }
 context.location.hash='';context.location.search='?channel=sitcom&episode=abcdefghijk';context.defaultHomeRoute();
 assert.equal(changes.length,1,'explicit pages and episode deep links keep their requested route');
});

test('Home becomes ready from its catalogue while the existing video is still starting',async()=>{
 const calls=[],host={};
 const context={
  homeView:{update:()=>calls.push('update')},
  panels:{open:(panel,options)=>calls.push(['open',panel,options.remember])},
  $:()=>host,revealControls:()=>calls.push('controls'),finishStartup:()=>calls.push('ready'),
  ready:false,active:{video:{id:'same-video'}},power:true,
  ensurePlayer:()=>{throw Error('Home must not load media');},
  showNotice:()=>calls.push('notice'),console,
 };
 vm.createContext(context);
 vm.runInContext(section('  async function openHome(','  let libraryLoading='),context);
 await context.openHome(false);
 assert.deepEqual(calls,[['open',host,false],'controls','ready','update']);
 assert.equal(context.active.video.id,'same-video');
 assert.equal(context.ready,false);
});

test('Home Live TV rejoins off, Library and legacy replay states once while preserving an existing live source',()=>{
 for(const state of [
  {power:false,libraryContext:false,mode:'live',joins:1},
  {power:true,libraryContext:true,mode:'ondemand',joins:1},
  {power:true,libraryContext:false,mode:'ondemand',joins:1},
  {power:true,libraryContext:false,mode:'replay',joins:1},
  {power:true,libraryContext:false,mode:'live',joins:0},
  {power:true,libraryContext:false,mode:'fallback',joins:0}
 ]){
  const calls=[],active={mode:state.mode,video:{id:'current-video'},offset:42};
  const context={power:state.power,libraryContext:state.libraryContext,active,
   joinLive(){calls.push('join');context.libraryContext=false;context.power=true;},
   backToTV(){if(context.libraryContext)context.joinLive();calls.push('watch');}
  };
  vm.createContext(context);
  vm.runInContext(section('  function watchLiveFromHome(){','  let homeView='),context);
  context.watchLiveFromHome();
  assert.deepEqual(calls,state.joins?['join','watch']:['watch']);
  assert.equal(context.active,active);
  assert.equal(context.active.video.id,'current-video');
  assert.equal(context.active.offset,42);
 }
});
