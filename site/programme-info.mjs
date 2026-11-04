export function programmeTitle(v){
 const original=String(v.title||v.series||''),series=String(v.series||'');
 let parts=original.split('|').map(x=>x.replace(/\((?:HD )?Full Episodes?\)/ig,'').replace(/\bFull(?: HD)? Episodes?\b.*$/i,'').trim()).filter(Boolean);
 parts=parts.filter(x=>!/(?:wildbrain|throwback toons|treehouse|retro rerun|jim henson family hub|kids cartoon|mouse official|cartoons? for kids|copyright free music|^@)/i.test(x)&&! /^(?:full(?: hd)? episodes?.*|hd(?: full.*)?|hq|official.*|season\s*\d+|series\s*\d+|episodes?\s*\d+|ep\.?\s*\d+|s\d+e\d+)$/i.test(x)&&x.toLowerCase()!==series.toLowerCase());
 let title=parts.join(' · ')||original;
 title=title.replace(/\((?:HD )?Full Episodes?\)/ig,'');
 if(series&&title.toLowerCase().startsWith(series.toLowerCase()))title=title.slice(series.length).replace(/^\s*[—:|–-]?\s*/,'');
 title=title.replace(/^['’]s\s+/i,'').replace(/\bFull(?: HD)? Episodes?\b.*$/i,'').replace(/^S\s*\d+\s*E\s*\d+\s*/i,'').replace(/^\d+x\d+\s*/i,'').replace(/\s*[—–-]\s*$/,'').replace(/^[\s·—–:|-]+/,'').trim();
 const code=original.match(/\bS(\d{1,2})E(\d{1,3})\b/i);if(code&&(!title||/^\(?\d{4}\)?$/.test(title)||title===series))return `Series ${Number(code[1])}, episode ${Number(code[2])}`;
 return title||series||original;
}
export function programmeInfo(v,channel,mode){
 const season=Number(v.seasonNumber),episode=Number(v.episodeNumber),kind={'full episode':'FULL EPISODE','full pilot':'PILOT',film:'FULL FILM',music:'MUSIC','classic video':'CLASSIC YOUTUBE',advert:'AD BREAK',short:'SHORT'}[v.kind]||'PROGRAMME';
 const standalone=v.kind==='film'||v.kind==='music';
 return {show:standalone?v.title:v.series||v.title,title:standalone?(v.kind==='music'?v.series||'':v.title):programmeTitle(v),meta:[v.yearLabel||v.year,kind,v.audioLanguageLabel||'',Number.isFinite(season)&&season>0?`SERIES ${season}`:'',Number.isFinite(episode)&&episode>0?`EPISODE ${episode}`:''].filter(Boolean).join(' / '),channel:`${String(channel.number).padStart(2,'0')} / ${channel.name}`,mode:mode==='ondemand'?'ON DEMAND':mode==='replay'?'REPLAY':channel.mode==='shuffle'?'SHUFFLE':'ON AIR',source:v.uploader||'Original source',provenance:v.sourceProvenance||v.sourceType==='archive'?'Fan / archive upload':v.sourceType==='official'?'Publisher upload':'Source upload',url:/^https?:\/\//.test(v.watchUrl||'')?v.watchUrl:'',duration:Math.max(1,Number(v.duration)||1),synopsis:v.synopsis||''};
}
export function programmeProgress(seconds,duration){
 const elapsed=Math.max(0,Math.min(duration,Number(seconds)||0));
 const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
 return {value:elapsed/duration*100,label:`${clock(elapsed)} / ${clock(duration)}`,remaining:`${Math.max(0,Math.ceil((duration-elapsed)/60))} min left`};
}
