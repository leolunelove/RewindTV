import {isBrowsable,showIdentity} from './show-library.mjs?v=20261112';

const STORAGE_KEY='rewind-watch-history-v1',LIMIT=12,MIN_POSITION=10,MAX_DURATION=7*86400;
const cleanString=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value)?value:null;
const validDuration=value=>Number.isFinite(value)&&value>MIN_POSITION&&value<=MAX_DURATION;
const finished=(position,duration)=>position>=duration-Math.min(30,duration*.05);
const keyFor=value=>typeof value==='string'?value:value&&typeof value==='object'?showIdentity(value):null;

// Local-only progress. Persist identities and clocks; resolve display data from the catalogue.
export function createWatchHistory({storage,now=Date.now}={}){
 const listeners=new Set();let records=[];
 const clock=()=>{const value=now();return Number.isFinite(value)&&value>=0?value:Date.now();};
 function sanitize(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const key=cleanString(value.key,400),id=cleanString(value.id,200),channelKey=cleanString(value.channelKey,160);
  if(!key||!(/^(show|film):.+/.test(key))||!id||!channelKey||!['film','programme'].includes(value.kind)||
   !validDuration(value.duration)||!Number.isFinite(value.position)||value.position<MIN_POSITION||
   finished(value.position,value.duration)||!Number.isFinite(value.updatedAt)||value.updatedAt<0||value.updatedAt>clock()+300000)return null;
  if((value.kind==='film')!==key.startsWith('film:'))return null;
  return {key,id,channelKey,position:value.position,duration:value.duration,updatedAt:value.updatedAt,
   origin:['shows','films','guide'].includes(value.origin)?value.origin:value.kind==='film'?'films':'shows',kind:value.kind};
 }
 try{
  const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
  if(saved?.version===1&&Array.isArray(saved.records)){
   const seen=new Set();
   records=saved.records.slice(0,200).map(sanitize).filter(Boolean).sort((a,b)=>b.updatedAt-a.updatedAt)
    .filter(record=>{if(seen.has(record.key))return false;seen.add(record.key);return true;}).slice(0,LIMIT);
  }
 }catch{}
 function publish(){
  try{storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,records}));}catch{}
  for(const listener of listeners){try{listener();}catch{}}
 }
 function get(value){const record=records.find(record=>record.key===keyFor(value));return record?{...record}:null;}
 function remove(value){
  const key=keyFor(value),next=records.filter(record=>record.key!==key);
  if(next.length===records.length)return false;
  records=next;publish();return true;
 }
 function save(video,{channelKey=video?.channelKey,position,duration=video?.duration,origin}={}){
  if(!video||!isBrowsable(video)||!cleanString(video.id,200)||!cleanString(channelKey,160)||
   !cleanString(video.series||video.title,300)||!validDuration(duration)||!Number.isFinite(position)||position<MIN_POSITION||position>duration+1)return false;
  const key=showIdentity(video),previous=records.find(record=>record.key===key),updatedAt=clock();
  if(previous&&updatedAt<previous.updatedAt)return false;
  if(finished(position,duration))return previous?.id===video.id?remove(key):false;
  const record=sanitize({key,id:video.id,channelKey,position,duration,updatedAt,origin,kind:video.kind==='film'?'film':'programme'});
  if(!record)return false;
  if(previous&&['id','channelKey','position','duration','origin','kind'].every(name=>previous[name]===record[name]))return false;
  records=[record,...records.filter(record=>record.key!==key)].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,LIMIT);publish();return true;
 }
 function list(catalogue,{kind='all'}={}){
  const owners=new Map();
  for(const channel of catalogue?.channels||[]){
   if(!cleanString(channel?.key,160))continue;
   for(const video of channel.videos||[]){
    if(!video||!isBrowsable(video))continue;
    if(!owners.has(video.id))owners.set(video.id,[]);
    owners.get(video.id).push({video,channelKey:channel.key});
   }
  }
  const result=[];
  for(const record of records){
   if((kind==='film'&&record.kind!=='film')||(['programmes','show','collection'].includes(kind)&&record.kind==='film'))continue;
   const candidates=owners.get(record.id)||[],owner=candidates.find(owner=>owner.channelKey===record.channelKey)||candidates[0];
   if(!owner||showIdentity(owner.video)!==record.key)continue;
   result.push({key:record.key,video:{...owner.video,channelKey:owner.channelKey},position:record.position,duration:record.duration,updatedAt:record.updatedAt,origin:record.origin});
  }
  return result;
 }
 return {list,get,save,remove,subscribe(listener){if(typeof listener!=='function')return ()=>{};listeners.add(listener);return ()=>listeners.delete(listener);}};
}
