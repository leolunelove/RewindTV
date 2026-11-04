const clampProgress=value=>{const n=Number(value);return Number.isNaN(n)?0:Math.max(0,Math.min(1,n));};
export function reelPosition(progress,landing){return landing*(1-(1-clampProgress(progress))**3.6);}

// One frame loop owns both the visual position and its crossing sounds.
export function createReelMotion({requestFrame,cancelFrame,now,onFrame,onTick,onFinish,duration=6200}){
 let generation=0,frame=null;
 function stop(){generation++;if(frame!==null){cancelFrame(frame);frame=null;}}
 function start(landing){
  stop();const token=generation,started=now();let crossed=0,finished=false;
  function step(){
   if(token!==generation||finished)return;frame=null;
   const progress=duration>0?Math.max(0,Math.min(1,(now()-started)/duration)):1;
   const position=reelPosition(progress,landing);onFrame(position);
   if(token!==generation)return;
   const next=Math.floor(position+.5);
   if(next!==crossed){crossed=next;onTick?.(next);}
   if(token!==generation)return;
   if(progress===1){finished=true;onFinish?.();return;}
   frame=requestFrame(step);
  }
  frame=requestFrame(step);
 }
 return {start,stop};
}
