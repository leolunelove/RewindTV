export function isBrowsable(v){
 const r=v.regionRestriction||v.contentDetails?.regionRestriction;
 return v.enabled!==false&&v.kind!=='advert'&&v.embedStatus!=='restricted'&&v.embeddable!==false&&v.status?.embeddable!==false&&!(r&&(Object.hasOwn(r,'allowed')||(r.blocked||[]).length));
}
export const normalise=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function showIdentity(v){return v.kind==='film'?'film:'+v.id:'show:'+normalise(v.series||v.title);}
export function episodeOrder(v){
 if(Number.isFinite(v.episodeNumber))return (Number(v.seasonNumber)||1)*10000+v.episodeNumber;
 const title=v.title||'';let m=title.match(/\bS(\d+)\s*E(\d+)\b/i)||title.match(/\b(?:season|series)\s*(\d+).*?\b(?:episode|ep)\.?\s*(\d+)/i);
 if(m)return Number(m[1])*10000+Number(m[2]);
 m=title.match(/\b(?:episode|ep)\.?\s*(\d+)/i);if(m)return 10000+Number(m[1]);
 if(v.series==='Undergrads'){m=title.match(/\b(\d+):(\d+)\b/);if(m)return Number(m[1])*10000+Number(m[2]);}
 return Infinity;
}
const compareEpisodes=(a,b)=>{const x=episodeOrder(a),y=episodeOrder(b);return x===y?0:x-y;};
export function buildShowIndex(catalogue){
 const groups=new Map();
 for(const c of catalogue.channels){for(const v of c.videos){if(!isBrowsable(v))continue;const key=showIdentity(v);let s=groups.get(key);
 if(!s){s={key,title:v.kind==='film'?v.title:(v.series||v.title),kind:v.kind==='film'?'film':['full episode','full pilot'].includes(v.kind)?'show':'collection',episodes:[],channels:[],years:new Set(),ids:new Set()};groups.set(key,s);}
 if(!s.channels.some(x=>x.key===c.key))s.channels.push({key:c.key,name:c.name,number:c.number,colour:c.brandColour});
 if(!s.ids.has(v.id)){s.ids.add(v.id);s.episodes.push({...v,channelKey:c.key});if(Number.isFinite(v.year))s.years.add(v.year);}
 }}
 return [...groups.values()].map(({ids,years,...s})=>({...s,episodes:s.episodes.sort(compareEpisodes),years:[...years].sort((a,b)=>a-b),hours:s.episodes.reduce((n,v)=>n+v.duration,0)/3600})).sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'}));
}
export function findProgramme(catalogue,channelKey,videoId){
 const channel=catalogue.channels.find(c=>c.key===channelKey),video=channel?.videos.find(v=>v.id===videoId&&isBrowsable(v));
 if(!video)return null;
 return {channel,video,queue:channel.videos.filter(v=>isBrowsable(v)&&showIdentity(v)===showIdentity(video)).sort(compareEpisodes)};
}
