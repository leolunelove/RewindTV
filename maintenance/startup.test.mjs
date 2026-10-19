import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
function fixture(){
 let loaded;const calls=[],frame={src:'',addEventListener(type,fn){loaded=fn;},setAttribute(){},removeAttribute(name){if(name==='src')this.src='';}};
 let events;const context={document:{createElement:()=>frame},location:{origin:'https://example.test'},URLSearchParams,encodeURIComponent,video:()=>({id:'abcdefghijk'}),active:{video:{id:'abcdefghijk'},offset:42},channels:[{key:'test'}],channel:0,playerChannelKey:null,power:true,ready:false,channelLoadTimer:0,player:null,pendingFrame:null,$:()=>({replaceWith(){calls.push('insert');}}),YT:{Player:function(f,opts){assert.match(f.src,/youtube.com\/embed/);calls.push('attach');events=opts.events;this.getIframe=()=>frame;this.mute=()=>calls.push('mute');this.playVideo=()=>calls.push('play');}},onPlayerStateChange(){},onPlayerAutoplayBlocked(){},videoError(){},watchPlayerInit:()=>calls.push('watch'),clearTimeout(){},apiTimer:null,loadActive:()=>calls.push('reload'),selectLive(){},playingId:null,paused:false};
 vm.createContext(context);vm.runInContext(app.slice(app.indexOf('  function initPlayer(){'),app.indexOf('  function ensurePlayer(')),context);context.initPlayer();return {context,calls,frame,load:()=>loaded(),get events(){return events;}};
}
test('startup waits for embed navigation before attaching API and does not reload the first video on ready',()=>{const f=fixture();assert.deepEqual(f.calls,['insert','watch']);f.load();assert.match(f.frame.src,/start=42/);f.events.onReady({target:f.context.player});assert.deepEqual(f.calls,['insert','watch','attach','mute','play']);assert.equal(f.context.playingId,'abcdefghijk');});
test('a channel changed during initialization loads the latest selection',()=>{const f=fixture();f.load();f.context.active={video:{id:'otherVideo1'}};f.events.onReady({target:f.context.player});assert.equal(f.calls.at(-1),'reload');});

test('an already-playing iframe releases startup even when its playing event preceded API readiness',()=>{const f=fixture();f.load();const states=[];f.context.onPlayerStateChange=e=>states.push(e.data);f.context.player.getPlayerState=()=>1;f.events.onReady({target:f.context.player});assert.deepEqual(states,[1]);assert.equal(f.calls.filter(v=>v==='reload').length,0);});
