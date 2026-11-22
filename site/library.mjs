export const KIDS_PACKS=["kids-cbbc.json", "kids-disney.json", "kids-nick.json", "kids-toons.json"];
export const CREATOR_PACKS=["classic-gmm.json", "classic-rhett.json", "afterdark-frank.json", "afterdark-idubbbz.json", "more-tv-films.json"];
export const MUSIC_PACKS=["music-surf.json", "music-proximity.json", "music-sheep.json", "music-ncs.json"];
export const EXPANSION_PACKS=['expansion.json','music-creators.json',...MUSIC_PACKS,...CREATOR_PACKS,...KIDS_PACKS,'lineup-expansion.json','unfiltered.json','discovery-club.json','kitchen-tv.json','november-library.json','late-night-library.json','archive-tv.json','archive-networks.json','vault-curation.json','station-depth.json','decade-and-after-school.json','official-tv-expansion.json','power-rangers-followup.json','power-rangers-depth.json','power-rangers-regional.json','quality-pass.json','maintenance-growth.json','maintenance-checks.json','main-ten-checks-2.json','main-ten-checks-3.json','library-health.json'];
export const SOURCE_FILES=['catalogue.json','gameshow-additions.json',...EXPANSION_PACKS];
export {catalogueForCountry};
const QUIZ_SERIES=new Set(['Catchphrase','Family Fortunes','The Weakest Link','Who Wants to Be a Millionaire']);
const textValue=value=>typeof value==='string'&&value.trim().length>0&&value.length<=2000;
const dateValue=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const timestampValue=value=>dateValue(value)||(typeof value==='string'&&dateValue(value.slice(0,10))&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value)));
const booleanValue=value=>typeof value==='boolean';
const recordValue=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const countryList=value=>Array.isArray(value)&&value.length<=COUNTRY_CODES.length&&new Set(value).size===value.length&&value.every(code=>typeof code==='string'&&normalizeCountry(code)===code);
function metadataRecord(value,fields){
 return recordValue(value)&&Object.keys(value).length>0&&Object.entries(value).every(([key,item])=>Object.hasOwn(fields,key)&&fields[key](item));
}
const METADATA_FIELDS={
 checkedAt:timestampValue,
 metadataStatus:value=>value==='OK',
 metadataCheckedAt:timestampValue,
 uploadDate:dateValue,
 embeddable:booleanValue,
 embedStatus:value=>['playing','untested','unavailable','blocked'].includes(value),
 regionRestriction:value=>metadataRecord(value,{allowed:codes=>countryList(codes)&&codes.length>0,blocked:countryList}),
 availabilityEvidence:value=>metadataRecord(value,{
  availableCountryCount:count=>Number.isInteger(count)&&count>=0&&count<=COUNTRY_CODES.length,
  checkedAt:timestampValue,observedAt:timestampValue,method:textValue,
  worldwidePlaybackVerified:value=>value===false
 }),
 playbackCheck:value=>metadataRecord(value,{
  start:booleanValue,nearEnd:booleanValue,checkedAt:timestampValue,region:textValue,
  method:textValue,origin:textValue,observedDuration:duration=>Number.isFinite(duration)&&duration>0
 })
};
function validatedMetadataUpdates(base,updates){
 const patches=new Map();
 if(updates===undefined)return patches;
 if(!Array.isArray(updates))throw Error('Invalid metadata updates');
 const knownIds=new Set([...base.channels.flatMap(channel=>channel.videos),...(base.adverts||[])].map(video=>video.id));
 for(const update of updates){
  if(!recordValue(update)
   ||Object.keys(update).some(key=>key!=='id'&&key!=='changes')
   ||typeof update.id!=='string'
   ||!knownIds.has(update.id)
   ||patches.has(update.id)
   ||!metadataRecord(update.changes,METADATA_FIELDS))throw Error('Invalid metadata update');
  patches.set(update.id,update.changes);
 }
 return patches;
}
// Curation happens after source packs are assembled so a retired source keeps
// its original place in this week's fixed plan, even when it came from a pack.
function validatedRetirements(base,rows){
 const result=new Map();if(rows===undefined)return result;
 if(!Array.isArray(rows))throw Error('Invalid source retirement');
 const known=new Set(base.channels.flatMap(c=>c.videos).map(v=>v.id));
 const active=new Set(base.channels.flatMap(c=>c.videos).filter(v=>v.enabled!==false).map(v=>v.id));
 for(const row of rows){
  if(!recordValue(row)||Object.keys(row).some(k=>!['id','reason','scheduleUntilWeek','retainedStorySources'].includes(k))
   ||!known.has(row.id)||result.has(row.id)||!textValue(row.reason)||!dateValue(row.scheduleUntilWeek)
   ||new Date(row.scheduleUntilWeek+'T12:00:00Z').getUTCDay()!==2
   ||!Array.isArray(row.retainedStorySources)||new Set(row.retainedStorySources).size!==row.retainedStorySources.length
   ||row.retainedStorySources.some(id=>id===row.id||!active.has(id)))throw Error('Invalid source retirement');
  result.set(row.id,row);
 }
 for(const row of result.values())if(row.retainedStorySources.some(id=>result.has(id)))throw Error('Invalid source retirement');
 return result;
}
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
  try{const {hydrateLibrary}=await import('./runtime-library.mjs?v=20261122quality3');return hydrateLibrary(await fetchJSON('runtime-library.json'));}
  catch(error){console.warn('Using source catalogue fallback.',error);}
  const paths=SOURCE_FILES;
  const results=await Promise.allSettled(paths.map(fetchJSON));if(results[0].status!=='fulfilled')throw results[0].reason;let base=results[0].value;
  for(let i=1;i<results.length;i++){const result=results[i];if(result.status==='fulfilled'){try{base=i===1?withGameshowAdditions(base,result.value):withExpansion(base,result.value);}catch(error){console.warn('Library supplement unavailable; using verified base.',error);}}else console.warn('Library supplement unavailable; using verified base.',result.reason);}
  return base;
 })();
}

// Legacy standalone pages share the same country policy as the main player.
export async function loadViewingLibrary({storage,fetcher}={}){
 const source=await loadLibrary();if(Object.hasOwn(source,'viewerCountry'))return source;
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
 const result=await resolveViewingCountry({storage,fetcher});return catalogueForCountry(source,result.country);
}

export function withExpansion(base,pack){
 if(pack?.version!==1||!Array.isArray(pack.videos)||!Array.isArray(pack.channels)||!pack.assignments||typeof pack.assignments!=='object')throw Error('Invalid library expansion');
 const patches=validatedMetadataUpdates(base,pack.updates);
 const retirements=validatedRetirements(base,pack.retirements);
 const exclusions=new Map((pack.exclusions||[]).map(e=>[e.id,e]));
 const permitted=source=>{
  let video=patches.has(source.id)?{...source,...patches.get(source.id)}:source;
  const retired=retirements.get(source.id);
  if(retired)video={...video,enabled:false,disabledReason:retired.reason,scheduleUntilWeek:retired.scheduleUntilWeek,retainedStorySources:[...retired.retainedStorySources]};
  return exclusions.has(video.id)?{...video,enabled:false,disabledReason:exclusions.get(video.id).reason,scheduleUntilWeek:undefined}:video;
 };
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
 return {...base,...(base.adverts?{adverts:base.adverts.map(permitted)}:{}),channels,libraryRevision:base.libraryRevision+'+'+pack.revision,libraryStats:{...base.libraryStats,channels:channels.length,playbackChecksPassedThisUpdate:pack.videos.filter(v=>v.playbackCheck?.start&&v.playbackCheck?.nearEnd).length,uploads:unique.length,hours:Math.round(unique.reduce((n,v)=>n+v.duration,0)/360)/10,fullLengthUploads:unique.filter(v=>v.duration>=600).length}};
}
import {COUNTRY_CODES,normalizeCountry,catalogueForCountry,resolveViewingCountry} from './region-eligibility.mjs';
