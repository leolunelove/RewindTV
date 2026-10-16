export function plan(videos,state,limit=250){
  const unique=[...new Map(videos.filter(v=>v.enabled!==false).map(v=>[v.id,v])).values()];
  return unique.sort((a,b)=>(state.checked[a.id]?.at||'').localeCompare(state.checked[b.id]?.at||'')).slice(0,limit);
}
export function environmentBlocked(results){
  if(results.length<10)return false;
  return results.filter(r=>['browser-identity','timeout','network','browser-error'].includes(r.status)).length/results.length>=.3;
}
export function update(state,results,at){
  const next=structuredClone(state);next.checked??={};
  for(const r of results){
    const old=next.checked[r.id]||{};
    next.checked[r.id]={at,status:r.status,start:r.start===true,tail:r.tail===true,
      consecutiveFailures:r.status==='playing'?0:(old.consecutiveFailures||0)+1};
  }
  return next;
}
