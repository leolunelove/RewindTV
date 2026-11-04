/* Short, synthesized accents. Call unlock from the user's spin gesture. */
export function createReelSound({getAudioState=()=>({enabled:false}),createContext=()=>{
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 return Context?new Context():null;
}}={}){
 let context=null,resuming=null,lastTick=-Infinity,epoch=0;
 const voices=new Set();
 function level(){
  try{const state=getAudioState(),volume=Number(state?.volume);return state?.enabled&&!state.muted&&Number.isFinite(volume)?Math.max(0,Math.min(100,volume))/100:0;}catch{return 0;}
 }
 function release(voice,halt=false){
  if(!voices.delete(voice))return;
  voice.osc.onended=null;
  if(halt)try{voice.osc.stop();}catch{}
  try{voice.osc.disconnect();}catch{}
  try{voice.gain.disconnect();}catch{}
 }
 function stop(){epoch++;lastTick=-Infinity;for(const voice of [...voices])release(voice,true);}
 async function unlock(){
  if(!level()){stop();return false;}
  const requested=epoch;
  try{
   context??=createContext();
   if(!context||context.state==='closed')return false;
   if(context.state!=='running'){
    if(!resuming){resuming=Promise.resolve(context.resume());resuming.finally(()=>{resuming=null;}).catch(()=>{});}
    await resuming;
   }
   return requested===epoch&&level()>0&&context.state==='running';
  }catch{return false;}
 }
 function tone({frequency,endFrequency=frequency,start,duration,peak,type='sine'}){
  let voice;
  try{
   const osc=context.createOscillator(),gain=context.createGain();voice={osc,gain};voices.add(voice);
   osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(peak,start+Math.min(.003,duration/6));gain.gain.exponentialRampToValueAtTime(.00001,start+duration);
   osc.connect(gain);gain.connect(context.destination);osc.onended=()=>release(voice);
   osc.start(start);osc.stop(start+duration+.003);
   return true;
  }catch{if(voice)release(voice,true);return false;}
 }
 function tick(){
  const volume=level();if(!volume){stop();return false;}
  if(context?.state!=='running')return false;
  const now=context.currentTime;if(now-lastTick<.035)return false;
  lastTick=now;
  return tone({frequency:1450,endFrequency:760,start:now,duration:.019,peak:volume*.045,type:'triangle'});
 }
 function reveal(){
  const volume=level();if(!volume){stop();return false;}
  if(context?.state!=='running')return false;
  // The landing replaces the final tick; both notes remain below the TV level.
  stop();const now=context.currentTime;
  const first=tone({frequency:330,start:now,duration:.16,peak:volume*.04});
  const second=tone({frequency:495,start:now+.055,duration:.16,peak:volume*.028});
  return first||second;
 }
 return {unlock,tick,reveal,stop};
}
