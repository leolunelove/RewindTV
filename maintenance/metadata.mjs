// Parse public watch-page evidence as data. Never execute source HTML or scripts.
export function playability(html){
 const match=/"playabilityStatus"\s*:\s*\{/.exec(html);if(!match)return null;
 const start=html.indexOf('{',match.index);let depth=0,quoted=false,escape=false;
 for(let i=start;i<html.length;i++){
  const c=html[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}
  if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{const p=JSON.parse(html.slice(start,i+1));return {status:p.status,reason:p.reason||p.errorScreen?.playerErrorMessageRenderer?.reason?.simpleText,playableInEmbed:p.playableInEmbed};}catch{return null;}}
 }return null;
}
export function metadataVerdict(metadata){
 if(!metadata)return 'inconclusive';
 if(metadata.available)return 'available-metadata';
 if(metadata.method==='media-head'&&[404,410].includes(metadata.status))return 'missing-media';
 const reason=metadata.playability?.reason||'';
 if([401,404,410].includes(metadata.status)&&metadata.playability?.status==='ERROR'&&/removed|deleted|private|copyright|no longer available/i.test(reason))return 'source-review';
 return 'inconclusive';
}
