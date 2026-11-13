import {programmeTitle} from './programme-info.mjs?v=liquid1';
import {movieArtwork} from './movie-night.mjs?v=20261113region';

export function resumeTime(seconds){
 const value=Math.max(0,Math.floor(Number(seconds)||0)),hours=Math.floor(value/3600),minutes=Math.floor(value%3600/60),rest=String(value%60).padStart(2,'0');
 return hours?`${hours}:${String(minutes).padStart(2,'0')}:${rest}`:`${minutes}:${rest}`;
}

// A small native scrolling shelf. Playback belongs to the app; refreshing a clock
// never recreates a focused Resume button or moves the surrounding collection.
export function createContinueWatching(doc,{getItems=()=>[],onResume,onRemove,kind='all',scroller,getAnchor=()=>null,getFallbackFocus=()=>null}={}){
 const section=doc.createElement('section');section.className='continue-watching';section.hidden=true;section.setAttribute('aria-label','Continue watching');
 const heading=doc.createElement('h3');heading.textContent='Continue watching';section.append(heading);
 const list=doc.createElement('div');list.className='continue-list';section.append(list);
 const nodes=new Map();let order='';
 const label=record=>record.video.kind==='film'?programmeTitle(record.video):record.video.series||programmeTitle(record.video);
 function refresh(){
  const anchor=getAnchor(),anchorTop=scroller?.scrollTop>0&&section.parentElement&&anchor?.getBoundingClientRect?anchor.getBoundingClientRect().top:null;
  const records=typeof onResume==='function'?getItems().filter(record=>record?.video&&(kind==='all'||(kind==='film'?record.video.kind==='film':record.video.kind!=='film'))).slice(0,12):[];
  const nextOrder=records.map(record=>record.key+':'+record.video.id).join('|');
  if(nextOrder!==order){
   order=nextOrder;const active=doc.activeElement,oldKeys=[...nodes.keys()],focusedKey=oldKeys.find(key=>nodes.get(key).remove===active||nodes.get(key).resume===active),focusedIndex=oldKeys.indexOf(focusedKey),focusedRemove=focusedKey&&nodes.get(focusedKey).remove===active;nodes.clear();
   const children=records.map(record=>{
    const item=doc.createElement('article');item.className='continue-item';item.dataset.continueKey=record.key;
    const resume=doc.createElement('button');resume.type='button';resume.className='continue-resume';
    const image=doc.createElement('img');image.alt='';image.loading='lazy';image.decoding='async';const url=record.video.thumbnail||record.video.thumbnailUrl||movieArtwork(record.video);if(url)image.src=url;image.hidden=!url;image.onerror=()=>{image.hidden=true;};
    const copy=doc.createElement('span');copy.className='continue-copy';const title=doc.createElement('strong');title.textContent=label(record);
    const episode=doc.createElement('span');episode.className='continue-episode';episode.textContent=programmeTitle(record.video);episode.hidden=episode.textContent===title.textContent;
    const progress=doc.createElement('progress');progress.max=100;progress.setAttribute('aria-label',`Progress through ${programmeTitle(record.video)}`);
    const time=doc.createElement('span');time.className='continue-time';copy.append(title,episode,progress,time);resume.append(image,copy);resume.onclick=()=>onResume(nodes.get(record.key)?.record||record);item.append(resume);
    let remove=null;if(typeof onRemove==='function'){remove=doc.createElement('button');remove.type='button';remove.className='continue-remove';remove.textContent='×';remove.setAttribute('aria-label',`Remove ${label(record)} from Continue watching`);remove.onclick=()=>onRemove(record.key);item.append(remove);}
    nodes.set(record.key,{record,resume,remove,progress,time});return item;
   });
   const left=list.scrollLeft;list.replaceChildren(...children);if(Number.isFinite(left))list.scrollLeft=left;
   if(focusedKey){const retained=nodes.get(focusedKey);if(retained)(focusedRemove?retained.remove:retained.resume)?.focus({preventScroll:true});else if(records.length){const next=records[Math.min(Math.max(0,focusedIndex),records.length-1)];nodes.get(next.key)?.resume.focus({preventScroll:true});}else getFallbackFocus()?.focus({preventScroll:true});}
  }
  for(const record of records){const node=nodes.get(record.key);node.record=record;const duration=Math.max(1,Number(record.duration)||record.video.duration||1),position=Math.min(duration,Math.max(0,Number(record.position)||0));node.progress.value=position/duration*100;node.progress.setAttribute('aria-valuetext',`${resumeTime(position)} of ${resumeTime(duration)}`);node.time.textContent=`Resume · ${resumeTime(position)} · ${Math.max(1,Math.ceil((duration-position)/60))} min left`;node.resume.setAttribute('aria-label',`Resume ${label(record)}${record.video.kind==='film'?'':', '+programmeTitle(record.video)} at ${resumeTime(position)}`);}
  section.hidden=!records.length;
  if(anchorTop!==null&&anchor?.getBoundingClientRect)scroller.scrollTop=Math.max(0,scroller.scrollTop+anchor.getBoundingClientRect().top-anchorTop);
 }
 refresh();return {element:section,refresh};
}
