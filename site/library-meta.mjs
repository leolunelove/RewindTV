const episodeNumbers=video=>{
 const covered=Array.isArray(video.coveredEpisodeNumbers)?video.coveredEpisodeNumbers:[];
 const numbers=[...new Set(covered.filter(value=>Number.isInteger(value)&&value>0))];
 return numbers.length?numbers:Number.isInteger(video.episodeNumber)&&video.episodeNumber>0?[video.episodeNumber]:[];
};

export const isLibraryCollection=video=>/collection|compilation|double bill|triple feature|two-episode block|two complete episodes/i.test(video.formatLabel||'');

// Count canonical stories when identified; an unnumbered bundle is a collection,
// not one episode. Queue entries always remain whole, original uploads.
export function countLibraryStories(videos){
 const stories=new Set(),specials=new Set(),collections=new Set(),uploads=new Set();
 for(const [index,video] of videos.entries()){
  const upload=video.id||`entry:${index}`;if(uploads.has(upload))continue;uploads.add(upload);
  const numbers=episodeNumbers(video);
  if(isLibraryCollection(video)&&numbers.length<2){collections.add(upload);continue;}
  if(!numbers.length&&/\bspecial\b/i.test(video.formatLabel||'')){specials.add(upload);continue;}
  const season=Number.isInteger(video.seasonNumber)&&video.seasonNumber>=0?`season:${video.seasonNumber}`:`upload:${upload}`;
  if(numbers.length)for(const number of numbers)stories.add(`${season}:episode:${number}`);
  else stories.add(`upload:${upload}`);
 }
 return {episodes:stories.size,specials:specials.size,collections:collections.size,uploads:uploads.size};
}

export function libraryCountLabel(videos,kind='show'){
 if(kind!=='show'){const count=new Set(videos.map(video=>video.id)).size,unit=kind==='film'?'film':'video';return `${count} ${unit}${count===1?'':'s'}`;}
 const {episodes,specials,collections}=countLibraryStories(videos),labels=[];
 if(episodes||(!specials&&!collections))labels.push(`${episodes} episode${episodes===1?'':'s'}`);
 if(specials)labels.push(`${specials} special${specials===1?'':'s'}`);
 if(collections)labels.push(`${collections} collection${collections===1?'':'s'}`);
 return labels.join(' · ');
}

export function librarySectionLabel(videos,kind='show'){
 if(kind!=='show')return kind==='film'?'Film':'Videos';
 const {episodes,specials,collections}=countLibraryStories(videos);
 return collections?(episodes||specials?'Episodes & collections':'Collections'):'Episodes';
}

export function libraryQueueState(queue,index,video,{blocked=false}={}){
 const current=!blocked&&index>=0&&queue[index]?.id===video.id;
 return {
  position:blocked?'Unavailable in this country':current&&queue.length>1?`Programme ${index+1} of ${queue.length}`:video.kind==='film'?'Film · From start':'From start',
  previousIndex:current&&index>0?index-1:null,
  nextIndex:current?(index+1<queue.length?index+1:null):queue.length?0:null,
  nextLabel:current?'Next programme':'Play an available programme'
 };
}
