import {isRegionEligible} from './region-eligibility.mjs';
export function isBrowsable(v){
 return v.enabled!==false&&v.kind!=='advert'&&v.embedStatus!=='restricted'&&v.embeddable!==false&&v.status?.embeddable!==false&&isRegionEligible(v);
}
export const normalise=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function showIdentity(v){return v.kind==='film'?'film:'+v.id:'show:'+normalise(v.series||v.title)+(v.audioLanguage&&v.audioLanguage!=='en'?'@'+v.audioLanguage:'');}
export function episodeOrder(v){
 if(Number.isFinite(v.episodeNumber))return (Number(v.seasonNumber)||1)*10000+v.episodeNumber;
 const title=v.title||'';let m=title.match(/\bS(\d+)\s*E(\d+)\b/i)||title.match(/\b(?:season|series)\s*(\d+).*?\b(?:episode|ep)\.?\s*(\d+)/i);
 if(m)return Number(m[1])*10000+Number(m[2]);
 m=title.match(/\b(?:episode|ep)\.?\s*(\d+)/i);if(m)return 10000+Number(m[1]);
 if(v.series==='Undergrads'){m=title.match(/\b(\d+):(\d+)\b/);if(m)return Number(m[1])*10000+Number(m[2]);}
 return Infinity;
}
const compareEpisodes=(a,b)=>{const x=episodeOrder(a),y=episodeOrder(b);return x===y?0:x-y;};
export function buildShowIndex(catalogue, listings=[]){
 const groups=new Map();
 for(const c of catalogue.channels){for(const v of c.videos){if(!isBrowsable(v))continue;const key=showIdentity(v);let s=groups.get(key);
 if(!s){s={key,language:v.audioLanguageLabel||'',title:v.kind==='film'?v.title:(v.series||v.title),kind:v.kind==='film'?'film':['full episode','full pilot'].includes(v.kind)?'show':'collection',episodes:[],channels:[],years:new Set(),ids:new Set()};groups.set(key,s);}
 if(!s.channels.some(x=>x.key===c.key))s.channels.push({key:c.key,name:c.name,number:c.number,colour:c.brandColour});
 if(!s.ids.has(v.id)){s.ids.add(v.id);s.episodes.push({...v,channelKey:c.key});if(Number.isFinite(v.year))s.years.add(v.year);}
 }}
 for(const listing of listings){
  const key=listing.kind==='film'?'film:listed:'+normalise(listing.title):showIdentity(listing);
  const existing=groups.get(key);
  if(existing){existing.listing=listing;continue;}
  groups.set(key,{key,title:listing.title,kind:listing.kind||'show',language:'',episodes:[],channels:[],years:new Set(),ids:new Set(),listing});
 }
 return [...groups.values()].map(({ids,years,...s})=>({...s,episodes:s.episodes.sort(compareEpisodes),years:[...years].sort((a,b)=>a-b),hours:s.episodes.reduce((n,v)=>n+v.duration,0)/3600})).sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'}));
}
export function findProgramme(catalogue,channelKey,videoId){
 const channel=catalogue.channels.find(c=>c.key===channelKey),video=channel?.videos.find(v=>v.id===videoId&&isBrowsable(v));
 if(!video)return null;
 return {channel,video,queue:channel.videos.filter(v=>isBrowsable(v)&&showIdentity(v)===showIdentity(video)).sort(compareEpisodes)};
}

// Rank eligible programmes before drawing a station, show and episode.
export function pickProgramme(channels,{channelKey=null,current=null,previousId=null,failed=new Set(),recentPicks=[],seen={},random=Math.random}={}){
 const draw=items=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
 const currentShow=current&&showIdentity(current);
 const recentShows=new Set(recentPicks.map(v=>v.showKey||showIdentity(v)));
 const recentIds=new Set(recentPicks.map(v=>v.id));
 const rank=v=>{
  if(v.id===current?.id)return 6;
  if(v.id===previousId)return 5;
  if(recentIds.has(v.id))return 4;
  const show=showIdentity(v);
  if(show===currentShow)return 3;
  if(recentShows.has(show))return 2;
  return seen?.[v.id]?1:0;
 };
 let best=Infinity,pools=[];
 for(const channel of channels){
  if(channelKey&&channel.key!==channelKey)continue;
  const eligible=[...new Map(channel.videos.filter(v=>isBrowsable(v)&&!failed.has(v.id)).map(v=>[v.id,v])).values()];
  const episodes=eligible.filter(v=>v.kind==='full episode'||v.kind==='full pilot');
  const singles=episodes.filter(v=>!/(?:\bcompilation\b|\bmarathon\b|\ball episodes\b|\bcomplete season\b)/i.test(v.title));
  const preferred=singles.length?singles:episodes.length?episodes:eligible;
  // If the preferred list has no alternative, let the rest of the station take part.
  const videos=preferred.some(v=>v.id!==current?.id&&v.id!==previousId)?preferred:eligible;
  const groups=new Map();
  for(const v of videos){
   const score=rank(v);
   if(score>best)continue;
   if(score<best){best=score;pools=[];groups.clear();}
   const key=showIdentity(v);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(v);
  }
  if(groups.size)pools.push({channel,groups});
 }
 if(!pools.length)return null;
 const {channel,groups}=draw(pools);
 const group=draw([...groups.values()]);
 if(best===4){
  const order=new Map(recentPicks.map((v,i)=>[v.id,i]));
  return {channel,video:group.reduce((oldest,v)=>order.get(v.id)>order.get(oldest.id)?v:oldest)};
 }
 return {channel,video:draw(group)};
}
