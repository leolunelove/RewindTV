// Explicit, reviewed pools for additional scheduled channels. Main ten are immutable here.
export function applyChannelProgramming(channels,policies){
 if(policies===undefined)return channels;
 if(!Array.isArray(policies))throw Error('Invalid channel programming');
 const changes=new Map(),slots=new Set(['morning','daytime','afternoon','evening','feature','late']);
 for(const policy of policies){
  const index=channels.findIndex(c=>c.key===policy?.channelKey),channel=channels[index];
  if(index<10||!channel||changes.has(channel.key))throw Error('Invalid channel programming');
  if(policy.type==='ordered-mix'){
   const knownSeries=new Set(channel.videos.map(v=>v.series));
   if(Object.keys(policy).some(k=>!['channelKey','type','series'].includes(k))
    ||!Array.isArray(policy.series)||!policy.series.length||new Set(policy.series).size!==policy.series.length
    ||policy.series.some(series=>!knownSeries.has(series)))throw Error('Invalid channel programming');
   changes.set(channel.key,{type:'ordered-mix',series:[...policy.series]});continue;
  }
  if(policy.type!=='seasonal'||Object.keys(policy).some(k=>!['channelKey','type','entries'].includes(k))
   ||!Array.isArray(policy.entries)||!policy.entries.length)throw Error('Invalid channel programming');
  const known=new Set(channel.videos.map(v=>v.id)),ids=new Set(),stories=new Set();
  const entries=policy.entries.map(entry=>{
   if(!entry||Object.keys(entry).some(k=>!['id','stories','slots'].includes(k))||!known.has(entry.id)||ids.has(entry.id)
    ||!Array.isArray(entry.stories)||!entry.stories.length||entry.stories.length>20
    ||!Array.isArray(entry.slots)||!entry.slots.length||entry.slots.some(slot=>!slots.has(slot))
    ||new Set(entry.slots).size!==entry.slots.length)throw Error('Invalid channel programming');
   for(const story of entry.stories){if(typeof story!=='string'||!story.trim()||story.length>180||stories.has(story))throw Error('Overlapping channel stories');stories.add(story);}
   ids.add(entry.id);return {id:entry.id,stories:[...entry.stories],slots:[...entry.slots]};
  });
  changes.set(channel.key,{type:'seasonal',entries});
 }
 return channels.map(channel=>{
  const change=changes.get(channel.key);if(!change)return channel;
  return change.type==='ordered-mix'?{...channel,sequenceSeries:change.series}:{...channel,mode:'scheduled',programming:change};
 });
}
