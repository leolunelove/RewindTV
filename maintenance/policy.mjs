export function plan(videos,state,limit=250){
 const unique=[...new Map(videos.filter(v=>v.enabled!==false).map(v=>[v.id,v])).values()];
 const attempted=v=>state.checked?.[v.id]?.lastAttemptAt||state.checked?.[v.id]?.at||'';
 const sorted=unique.sort((a,b)=>attempted(a).localeCompare(attempted(b))),queue=sorted.slice(0,limit);
 if(limit>=2)for(const provider of ['archive','youtube']){const matches=v=>(v.provider==='archive'?'archive':'youtube')===provider;if(!queue.some(matches)){const candidate=sorted.find(matches);if(candidate){queue.pop();queue.push(candidate);}}}
 return queue;
}
export function environmentBlocked(results){
 if(results.length<10)return false;
 return results.filter(r=>['browser-identity','api-timeout','autoplay-blocked','timeout','network','browser-error'].includes(r.status)).length/results.length>=.3||results.filter(r=>['source-error','unavailable'].includes(r.status)&&[101,150].includes(r.code)).length/results.length>=.8;
}
export function classify(result,providerHealthy){
 if(!providerHealthy)return 'runner-blocked';
 if(result.status==='playing'&&result.start&&result.tail)return 'playing';
 const attempts=result.attempts||[];
 if(attempts.length>=2&&attempts.every(r=>r.status==='source-error'&&[100,101,150].includes(r.code)))return 'source-review';
 return 'transient';
}
export function update(state,results,at,{blockedProviders=[]}={}){
 const next=structuredClone(state);next.checked??={};
 for(const result of results){
  const old=next.checked[result.id]||{},blocked=blockedProviders.includes(result.provider||'youtube');
  const status=blocked?'runner-blocked':(result.verdict||result.status);
  const passed=status==='playing';const sourceFailure=status==='source-review';
  next.checked[result.id]={...old,lastAttemptAt:at,lastAttemptStatus:status,metadata:result.metadata,
   ...(passed||sourceFailure?{at,status,start:result.start===true,tail:result.tail===true}:{}),
   metadataFailureCount:result.metadata?.repeated?(old.metadataFailureCount||0)+1:result.metadata?.available?0:(old.metadataFailureCount||0),
   consecutiveFailures:passed?0:sourceFailure?(old.consecutiveFailures||0)+1:(old.consecutiveFailures||0)};
 }
 return next;
}
