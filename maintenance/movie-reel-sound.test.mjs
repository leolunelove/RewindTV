import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReelSound} from '../site/movie-reel-sound.mjs';
function harness(initial={enabled:true,muted:false,volume:40},contextState='running'){
 const state={...initial},oscillators=[],gains=[];let created=0,resumes=0,resumeResult=null;
 const parameter=()=>({events:[],setValueAtTime(value,time){this.events.push(['set',value,time]);},linearRampToValueAtTime(value,time){this.events.push(['linear',value,time]);},exponentialRampToValueAtTime(value,time){this.events.push(['exponential',value,time]);}});
 const context={state:contextState,currentTime:0,destination:{},resume(){resumes++;if(resumeResult)return resumeResult;this.state='running';return Promise.resolve();},createOscillator(){const osc={frequency:parameter(),starts:[],stops:[],disconnects:0,connect(){},disconnect(){this.disconnects++;},start(t){this.starts.push(t);},stop(t){this.stops.push(t);},onended:null};oscillators.push(osc);return osc;},createGain(){const gain={gain:parameter(),disconnects:0,connect(){},disconnect(){this.disconnects++;}};gains.push(gain);return gain;}};
 const sound=createReelSound({getAudioState:()=>state,createContext:()=>{created++;return context;}});
 return {sound,state,context,oscillators,gains,get created(){return created;},get resumes(){return resumes;},deferResume(p){resumeResult=p;}};
}
test('sound stays lazy until an audible user gesture and never creates contexts from ticks or reveals',async()=>{
 const h=harness();assert.equal(h.created,0);assert.equal(h.sound.tick(),false);assert.equal(h.sound.reveal(),false);assert.equal(h.created,0);
 h.state.muted=true;assert.equal(await h.sound.unlock(),false);assert.equal(h.created,0);
 h.state.muted=false;h.state.volume=0;assert.equal(await h.sound.unlock(),false);assert.equal(h.created,0);
 h.state.volume=40;h.state.enabled=false;assert.equal(await h.sound.unlock(),false);assert.equal(h.created,0);
 h.state.enabled=true;assert.equal(await h.sound.unlock(),true);assert.equal(await h.sound.unlock(),true);assert.equal(h.created,1);
});
test('ticks are short, volume scaled and rate limited during a fast reel',async()=>{
 const h=harness();await h.sound.unlock();assert.equal(h.sound.tick(),true);assert.equal(h.sound.tick(),false);h.context.currentTime=.034;assert.equal(h.sound.tick(),false);h.context.currentTime=.036;assert.equal(h.sound.tick(),true);
 assert.equal(h.oscillators.length,2);assert.equal(h.oscillators[0].type,'triangle');assert(h.oscillators[0].stops[0]<=.025);
 assert.equal(h.gains[0].gain.events.find(e=>e[0]==='linear')[1],.4*.045);
 h.state.volume=20;h.context.currentTime=.08;h.sound.tick();assert.equal(h.gains[2].gain.events.find(e=>e[0]==='linear')[1],.2*.045);
});
test('mute, disabled effects and zero volume gate every sound and cancel already scheduled notes',async()=>{
 const h=harness();await h.sound.unlock();h.sound.reveal();assert.equal(h.oscillators.length,2);h.state.muted=true;assert.equal(h.sound.tick(),false);assert(h.oscillators.every(o=>o.disconnects===1&&o.stops.at(-1)===undefined));
 h.state.muted=false;h.state.enabled=false;assert.equal(h.sound.reveal(),false);h.state.enabled=true;h.state.volume=0;assert.equal(h.sound.reveal(),false);assert.equal(h.oscillators.length,2);
});
test('landing uses two restrained notes and stop is immediate and idempotent',async()=>{
 const h=harness();await h.sound.unlock();h.sound.tick();h.sound.reveal();assert.equal(h.oscillators[0].disconnects,1);assert.equal(h.oscillators.length,3);assert.equal(h.oscillators[1].starts[0],0);assert.equal(h.oscillators[2].starts[0],.055);assert(h.oscillators[2].stops[0]<.23);
 h.sound.stop();h.sound.stop();assert(h.oscillators.every(o=>o.disconnects===1));assert(h.gains.every(g=>g.disconnects===1));
});
test('finished voices release their audio nodes without waiting for another tick',async()=>{
 const h=harness();await h.sound.unlock();h.sound.tick();h.oscillators[0].onended();assert.equal(h.oscillators[0].disconnects,1);assert.equal(h.gains[0].disconnects,1);h.sound.stop();assert.equal(h.oscillators[0].disconnects,1);
});
test('suspended contexts resume only on unlock and late resume cannot restart canceled sounds',async()=>{
 const h=harness(undefined,'suspended');assert.equal(h.sound.tick(),false);let resolve;h.deferResume(new Promise(r=>resolve=r));const a=h.sound.unlock(),b=h.sound.unlock();assert.equal(h.resumes,1);assert.equal(h.created,1);h.sound.stop();h.context.state='running';resolve();assert.equal(await a,false);assert.equal(await b,false);assert.equal(h.oscillators.length,0);
});
test('unsupported or denied audio remains a silent enhancement',async()=>{
 const missing=createReelSound({getAudioState:()=>({enabled:true,volume:40}),createContext:()=>null});assert.equal(await missing.unlock(),false);assert.equal(missing.tick(),false);missing.stop();
 const denied=createReelSound({getAudioState:()=>({enabled:true,volume:40}),createContext:()=>({state:'suspended',resume:()=>Promise.reject(Error('NotAllowedError'))})});assert.equal(await denied.unlock(),false);assert.equal(denied.reveal(),false);denied.stop();
});
