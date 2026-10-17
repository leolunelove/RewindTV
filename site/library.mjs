export const KIDS_PACKS=["kids-cbbc.json", "kids-disney.json", "kids-nick.json", "kids-toons.json"];
export const CREATOR_PACKS=["classic-gmm.json", "classic-rhett.json", "afterdark-frank.json", "afterdark-idubbbz.json", "more-tv-films.json"];
export const MUSIC_PACKS=["music-surf.json", "music-proximity.json", "music-sheep.json", "music-ncs.json"];
export const EXPANSION_PACKS=['expansion.json','music-creators.json',...MUSIC_PACKS,...CREATOR_PACKS,...KIDS_PACKS];
export const SOURCE_FILES=['catalogue.json','gameshow-additions.json',...EXPANSION_PACKS];
const QUIZ_SERIES=new Set(['Catchphrase','Family Fortunes','The Weakest Link','Who Wants to Be a Millionaire']);
export function withGameshowAdditions(base,extra){
 if(extra?.channelKey!=='rewind-gameshows'||!Array.isArray(extra.videos))throw Error('Invalid gameshow additions');
 const target=base.channels.find(c=>c.key===extra.channelKey);if(!target)throw Error('Gameshow channel missing');
 const known=new Set(target.videos.map(v=>v.id)),additions=[];
 for(const v of extra.videos){
  if(typeof v.id!=='string'||!v.id||!QUIZ_SERIES.has(v.series)||v.kind!=='full episode'||!Number.isFinite(v.duration)||v.duration<1200)throw Error('Invalid episode in gameshow additions');
  if(!known.has(v.id)){known.add(v.id);additions.push(v);}
 }
 const videos=target.videos.concat(additions),shows=[...new Set(videos.filter(v=>v.enabled!==false).map(v=>v.series))];
 const channels=base.channels.map(c=>c===target?{...c,videos,shows,tagline:'British gameshow classics: Catchphrase, Family Fortunes, The Weakest Link, Who Wants to Be a Millionaire, The Crystal Maze, original UK Gladiators and Robot Wars. Full episodes; older fan/archive sources are labelled.'}:c);
 const unique=[...new Map(channels.flatMap(c=>c.videos).filter(v=>v.enabled!==false).map(v=>[v.id,v])).values()];
 return {...base,channels,libraryRevision:base.libraryRevision+'+'+extra.revision,libraryStats:{...base.libraryStats,channels:channels.length,uploads:unique.length,hours:Math.round(unique.reduce((n,v)=>n+v.duration,0)/360)/10,fullLengthUploads:unique.filter(v=>v.duration>=600).length}};
}
let libraryPromise;
async function fetchJSON(path){const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error('Unavailable '+path);return r.json();}
export async function loadLibrary(){
 if(typeof window!=='undefined'&&window.parent!==window){try{const shared=await window.parent.RewindLibrary?.();if(shared)return {...shared,channels:shared.channels.map(c=>({...c}))};}catch{}}
 return libraryPromise??=(async()=>{
  try{const {hydrateLibrary}=await import('./runtime-library.mjs');return hydrateLibrary(await fetchJSON('runtime-library.json'));}
  catch(error){console.warn('Using source catalogue fallback.',error);}
  const paths=SOURCE_FILES;
  const results=await Promise.allSettled(paths.map(fetchJSON));if(results[0].status!=='fulfilled')throw results[0].reason;let base=results[0].value;
  for(let i=1;i<results.length;i++){const result=results[i];if(result.status==='fulfilled'){try{base=i===1?withGameshowAdditions(base,result.value):withExpansion(base,result.value);}catch(error){console.warn('Library supplement unavailable; using verified base.',error);}}else console.warn('Library supplement unavailable; using verified base.',result.reason);}
  return base;
 })();
}

export function withExpansion(base,pack){
 if(pack?.version!==1||!Array.isArray(pack.videos)||!Array.isArray(pack.channels)||!pack.assignments||typeof pack.assignments!=='object')throw Error('Invalid library expansion');
 const exclusions=new Map((pack.exclusions||[]).map(e=>[e.id,e]));const permitted=v=>exclusions.has(v.id)?{...v,enabled:false,disabledReason:exclusions.get(v.id).reason}:v;
 const known=new Map();for(const c of base.channels)for(const source of c.videos){const v=permitted(source);if(!known.has(v.id)||known.get(v.id).enabled===false)known.set(v.id,v);}
 for(const v of pack.videos){if(typeof v.id!=='string'||!v.id||typeof v.series!=='string'||!Number.isFinite(v.duration)||v.duration<60||!['full episode','full pilot','film','short','music','classic video'].includes(v.kind))throw Error('Invalid expansion programme');if(!known.has(v.id))known.set(v.id,v);}
 const keys=new Set(base.channels.map(c=>c.key));let channels=base.channels.map(c=>({...c,videos:c.videos.map(permitted)}));
 for(const c of pack.channels){if(typeof c.key!=='string'||!c.key||c.mode!=='shuffle'||!c.name||!c.logo)throw Error('Invalid expansion channel');if(keys.has(c.key))continue;keys.add(c.key);channels.push({...c,number:channels.length+1,flagship:false,videos:[]});}
 for(const [key,ids]of Object.entries(pack.assignments)){
 const c=channels.find(c=>c.key===key);if(!c||!Array.isArray(ids))throw Error('Invalid expansion assignment');const present=new Set(c.videos.map(v=>v.id));
 for(const id of ids){const v=known.get(id);if(!v)throw Error('Unknown programme in expansion');if(!present.has(id)&&v.enabled!==false){present.add(id);c.videos.push(v);}}
 c.shows=[...new Set(c.videos.filter(v=>v.enabled!==false).map(v=>v.series))];
 }
 if(channels.some(c=>!c.videos.length))throw Error('Empty expansion channel');
 const unique=[...new Map(channels.flatMap(c=>c.videos).filter(v=>v.enabled!==false).map(v=>[v.id,v])).values()];
 return {...base,channels,libraryRevision:base.libraryRevision+'+'+pack.revision,libraryStats:{...base.libraryStats,channels:channels.length,playbackChecksPassedThisUpdate:pack.videos.filter(v=>v.playbackCheck?.start&&v.playbackCheck?.nearEnd).length,uploads:unique.length,hours:Math.round(unique.reduce((n,v)=>n+v.duration,0)/360)/10,fullLengthUploads:unique.filter(v=>v.duration>=600).length}};
}
