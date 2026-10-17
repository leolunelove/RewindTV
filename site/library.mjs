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
 return {...base,channels,libraryRevision:base.libraryRevision+'+'+extra.revision,libraryStats:{...base.libraryStats,uploads:unique.length,hours:Math.round(unique.reduce((n,v)=>n+v.duration,0)/360)/10,fullLengthUploads:unique.filter(v=>v.duration>=600).length}};
}
export async function loadLibrary(){
 const response=await fetch('catalogue.json',{cache:'no-cache'});if(!response.ok)throw Error('Catalogue unavailable');const base=await response.json();
 try{const extra=await fetch('gameshow-additions.json',{cache:'no-cache'});if(extra.ok)return withGameshowAdditions(base,await extra.json());}catch(error){console.warn('Gameshow additions unavailable; using base catalogue.',error);}
 return base;
}
