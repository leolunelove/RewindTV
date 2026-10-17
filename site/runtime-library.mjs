// Public playback data only. The full catalogue remains the maintenance source.
const FIELDS=['id','title','series','kind','duration','year','yearLabel','formatLabel','enabled','family','provider','mediaUrl','watchUrl','credit','uploader','uploaderUrl','uploadDate','sourceType','sourceProvenance','embedStatus','embeddable','seasonNumber','episodeNumber','synopsis'];
export function compactLibrary(catalogue){
 const videos=Object.create(null),variants=new Map();const add=v=>{const row=Object.fromEntries(FIELDS.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));const restriction=v.regionRestriction||v.contentDetails?.regionRestriction;if(restriction)row.regionRestriction=restriction;if(v.status?.embeddable===false)row.embeddable=false;if(v.sourceFileEvidence?.archiveIdentifier)row.sourceFileEvidence={archiveIdentifier:v.sourceFileEvidence.archiveIdentifier};if(v.notes?.includes('Challenge broadcast'))row.notes='Challenge broadcast edit';const signature=JSON.stringify(row);if(variants.has(signature))return variants.get(signature);let key=v.id,n=0;while(Object.hasOwn(videos,key))key=v.id+'~'+(++n);videos[key]=row;variants.set(signature,key);return key;};
 const channels=catalogue.channels.map(c=>({...c,videos:c.videos.map(add)}));
 return {schema:1,version:catalogue.version,timezone:catalogue.timezone,refreshDay:catalogue.refreshDay,scheduledCount:catalogue.scheduledCount,libraryRevision:catalogue.libraryRevision,libraryStats:catalogue.libraryStats,channels,adverts:(catalogue.adverts||[]).map(add),videos};
}
export function hydrateLibrary(data){
 if(data?.schema!==1||!Array.isArray(data.channels)||!data.videos||!Array.isArray(data.adverts))throw Error('Invalid playback library');
 const lookup=id=>{const v=Object.hasOwn(data.videos,id)?data.videos[id]:null;if(!v||typeof v.id!=='string'||typeof v.title!=='string'||!Number.isFinite(v.duration)||v.duration<=0)throw Error('Missing playback programme');return v;};
 return {...data,channels:data.channels.map(c=>({...c,videos:c.videos.map(lookup)})),adverts:data.adverts.map(lookup),videos:undefined};
}
