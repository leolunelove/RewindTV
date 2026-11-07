import {isBrowsable,normalise} from './show-library.mjs?v=liquid1';

const releaseYear=video=>{
 const year=Number(video?.year);
 return Number.isInteger(year)&&year>0?year:null;
};
const audioLanguage=video=>String(video?.audioLanguage||'en').trim().toLowerCase().replace(/_/g,'-')||'en';
const provider=video=>video?.provider||'youtube';
const compareRank=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];

// An explicit film choice may recover only to another source of that same film.
export function findFilmAlternative(catalogue,video,{failed=new Set(),currentChannelKey}={}){
 const title=normalise(video?.title),year=releaseYear(video),duration=Number(video?.duration);
 if(video?.kind!=='film'||!video.id||!title||year===null||!Number.isFinite(duration)||duration<=0)return null;
 const language=audioLanguage(video),outgoingProvider=provider(video);
 let best=null,bestRank=null;
 for(const channel of catalogue?.channels||[]){
  for(const candidate of channel.videos||[]){
   if(candidate.kind!=='film'||!candidate.id||candidate.id===video.id||failed.has(candidate.id)||!isBrowsable(candidate))continue;
   if(normalise(candidate.title)!==title||releaseYear(candidate)!==year||audioLanguage(candidate)!==language)continue;
   const candidateDuration=Number(candidate.duration),difference=Math.abs(candidateDuration-duration);
   if(!Number.isFinite(candidateDuration)||candidateDuration<=0||difference>duration*.1)continue;
   const rank=[channel.key===currentChannelKey?0:1,provider(candidate)!==outgoingProvider?0:1,difference];
   if(!bestRank||compareRank(rank,bestRank)<0){
    best={channel,video:candidate};bestRank=rank;
   }
  }
 }
 return best;
}
