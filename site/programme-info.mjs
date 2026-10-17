export function programmeTitle(v){
 const series=v.series||'',parts=(v.title||'').split('|').map(s=>s.trim());
 let title=parts.filter(p=>!/(full.{0,12}episodes?|wildbrain|official|cartoons? for|^hd$|^season\s*\d|^episode\s*\d|^ep\.\s*\d)/i.test(p)).filter(p=>p.toLowerCase()!==series.toLowerCase()&&!p.toLowerCase().startsWith(series.toLowerCase()+' ')).join(' · ');
 if(!title)title=v.title||series;
 if(series&&title.toLowerCase().startsWith(series.toLowerCase()))title=title.slice(series.length).replace(/^\s*[—:|–-]?\s*/,'');
 title=title.replace(/^S\s*\d+\s*E\s*\d+\s*/i,'').replace(/^\d+x\d+\s*/i,'').replace(/\s*[—-]\s*(HD )?Full Episodes?.*$/i,'').trim();
 return title||v.title||series;
}
export function programmeInfo(v,channel,mode){
 const season=Number(v.seasonNumber),episode=Number(v.episodeNumber),kind={'full episode':'FULL EPISODE','full pilot':'PILOT',film:'FULL FILM',music:'MUSIC','classic video':'CLASSIC YOUTUBE',advert:'AD BREAK',short:'SHORT'}[v.kind]||'PROGRAMME';
 return {show:v.series||v.title,title:programmeTitle(v),meta:[v.yearLabel||v.year,kind,Number.isFinite(season)&&season>0?`SERIES ${season}`:'',Number.isFinite(episode)&&episode>0?`EPISODE ${episode}`:''].filter(Boolean).join(' / '),channel:`${String(channel.number).padStart(2,'0')} / ${channel.name}`,mode:mode==='ondemand'?'ON DEMAND':mode==='replay'?'REPLAY':channel.mode==='shuffle'?'SHUFFLE':'ON AIR',source:v.uploader||'Original source',provenance:v.sourceProvenance||v.sourceType==='archive'?'Fan / archive upload':v.sourceType==='official'?'Publisher upload':'Source upload',url:/^https?:\/\//.test(v.watchUrl||'')?v.watchUrl:'',duration:Math.max(1,Number(v.duration)||1),synopsis:v.synopsis||''};
}
export function programmeProgress(seconds,duration){
 const elapsed=Math.max(0,Math.min(duration,Number(seconds)||0));
 const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
 return {value:elapsed/duration*100,label:`${clock(elapsed)} / ${clock(duration)}`,remaining:`${Math.max(0,Math.ceil((duration-elapsed)/60))} min left`};
}
