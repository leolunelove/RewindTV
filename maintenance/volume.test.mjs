import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
const audio=src.slice(src.indexOf('  function audioTarget()'),src.indexOf("  $('#programme-trim').oninput"));
const controls=src.slice(src.indexOf('  function changeVolume('),src.indexOf('  function closeGuide('));
function harness(native=false){
 const media={volume:0,muted:true},calls=[],events=[];
 const player=native?{setVolume:v=>media.volume=v/100,mute:()=>media.muted=true,unMute:()=>media.muted=false}:{setVolume:v=>{calls.push(v);media.volume=v},mute:()=>media.muted=true,unMute:()=>media.muted=false};
 const ctx={Event,root:{dispatchEvent:e=>events.push(e.type)},volume:40,startupMuted:true,lastAudibleVolume:40,audioFade:0,active:{video:{id:'test'}},settings:{audio:true},showLevels:{},power:true,currentPlayer:()=>player,cancelAnimationFrame(){},persist(){},render(){},revealControls(){}};
 vm.createContext(ctx);vm.runInContext(audio+controls+'\nfunction enableSound(){startupMuted=false;applyAudio();}',ctx);
 return {ctx,media,calls,events,run:code=>vm.runInContext(code,ctx)};
}
for(const native of [false,true])test(`${native?'native film':'YouTube'} volume changes, zero mute and restore share one audio path`,()=>{
 const h=harness(native);h.run('changeVolume(-15)');assert.equal(h.ctx.volume,25);assert.equal(h.media.muted,false);assert.equal(h.media.volume,native?.25:25);
 h.run('toggleMute()');assert.equal(h.media.muted,true);assert.equal(h.ctx.volume,0);
 h.run('toggleMute()');assert.equal(h.ctx.volume,25);assert.equal(h.media.muted,false);
 h.run('changeVolume(1000)');assert.equal(h.ctx.volume,100);
 h.run('changeVolume(-1000);toggleMute()');assert.equal(h.ctx.volume,100);
});
test('startup unmute keeps the saved level and invalid volume input is ignored',()=>{const h=harness();h.run('toggleMute()');assert.equal(h.ctx.volume,40);assert.equal(h.media.muted,false);h.run('changeVolume(NaN)');assert.equal(h.ctx.volume,40);});
test('show trim and quieter adverts still apply to the master volume',()=>{const h=harness();h.ctx.active.video.kind='advert';h.run('changeVolume(0)');assert.ok(h.media.volume<40&&h.media.volume>20);});

test('reel effects receive mute and volume updates even when the player is off',()=>{const h=harness();h.ctx.power=false;h.run('changeVolume(-40)');assert.deepEqual(h.events,['rewind:audiochange']);assert.equal(h.ctx.volume,0);});
