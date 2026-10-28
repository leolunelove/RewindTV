import fs from 'node:fs/promises';import http from 'node:http';import {fileURLToPath} from 'node:url';
import {withGameshowAdditions,withExpansion,EXPANSION_PACKS} from '../site/library.mjs';
import {chromium} from 'playwright';import {plan,update,environmentBlocked,classify} from './policy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
let catalogue=withGameshowAdditions(JSON.parse(await fs.readFile(root+'site/catalogue.json','utf8')),JSON.parse(await fs.readFile(root+'site/gameshow-additions.json','utf8')));
for(const path of EXPANSION_PACKS)catalogue=withExpansion(catalogue,JSON.parse(await fs.readFile(root+'site/'+path,'utf8')));
const videos=[...new Map([...catalogue.channels.flatMap(c=>c.videos||[]),...(catalogue.adverts||[])].filter(v=>v.enabled!==false).map(v=>[v.id,v])).values()];
const state=JSON.parse(await fs.readFile(root+'data/state.json','utf8'));
// Old blocked runs must not count as evidence against individual uploads.
try{const prior=JSON.parse(await fs.readFile(root+'reports/latest.json','utf8'));if(prior.environmentBlocked)for(const result of prior.results||[]){const record=state.checked?.[result.id];if(record?.at===prior.at){record.lastAttemptAt=record.at;record.lastAttemptStatus='runner-blocked';record.consecutiveFailures=0;delete record.at;delete record.status;}}}catch{}
const queue=plan(videos,state,Math.min(250,Math.max(1,Number(process.env.BATCH_LIMIT)||250))),results=[],calibration={};
const html=await fs.readFile(root+'maintenance/probe.html');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(html)});
await new Promise(resolve=>server.listen(8123,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const deadline=Date.now()+15*60*1000;
const provider=v=>v.provider==='archive'?'archive':'youtube';
async function metadata(video){
 try{const url=provider(video)==='archive'?video.mediaUrl:'https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+video.id)+'&format=json';
  const response=await fetch(url,{method:provider(video)==='archive'?'HEAD':'GET',signal:AbortSignal.timeout(12000)});const result={status:response.status,method:provider(video)==='archive'?'media-head':'youtube-oembed',available:response.ok};
  if(response.ok&&provider(video)==='youtube'){const data=await response.json();result.title=data.title;result.author=data.author_name;}return result;
 }catch(error){return {status:'network',detail:String(error).slice(0,160)};}
}
async function probe(page,video){try{return await page.evaluate(v=>window.probe(v),video);}catch(error){return {id:video.id,status:'browser-error',detail:String(error).slice(0,160),start:false,tail:false};}}
try{
 const page=await browser.newPage();await page.goto(process.env.PROBE_URL||'http://127.0.0.1:8123/');
 for(const kind of ['youtube','archive']){
  const control=videos.find(v=>v.id===(kind==='youtube'?'L2UCRNldC3s':'his_girl_friday'));
  const attempts=[];if(control)for(let i=0;i<2;i++){const result=await probe(page,control);attempts.push(result);if(result.status==='playing')break;}
  calibration[kind]={id:control?.id,healthy:attempts.some(r=>r.status==='playing'&&r.start&&r.tail),attempts};
 }
 // Serial fresh players avoid stale callbacks and reduce cloud throttling.
 for(const video of queue){
  if(Date.now()>deadline)break;
  const kind=provider(video),meta=await metadata(video),attempts=[];
  if(calibration[kind].healthy){for(let i=0;i<2;i++){const result=await probe(page,video);attempts.push(result);if(result.status==='playing')break;}}
  const result={...(attempts.at(-1)||{id:video.id,status:'not-probed',start:false,tail:false}),provider:kind,title:video.title,metadata:meta,attempts};
  result.verdict=classify(result,calibration[kind].healthy);results.push(result);
  const recent=results.filter(r=>r.provider===kind&&r.attempts.length).slice(-10);if(environmentBlocked(recent)){calibration[kind].healthy=false;calibration[kind].batchBlocked=true;}
 }
}finally{await browser.close();server.close();}
const blockedProviders=Object.keys(calibration).filter(key=>!calibration[key].healthy),at=new Date().toISOString();
for(const result of results)if(blockedProviders.includes(result.provider))result.verdict='runner-blocked';
const report={at,runnerRegion:process.env.RUNNER_REGION||'GitHub-hosted runner; network country unverified',catalogueSize:videos.length,planned:queue.length,checked:results.length,playbackAttempted:results.filter(r=>r.attempts.length).length,passed:results.filter(r=>r.verdict==='playing').length,environmentBlocked:blockedProviders.length>0,blockedProviders,calibration,worldwideVerified:false,results};
await fs.writeFile(root+'data/state.json',JSON.stringify(update(state,results,at,{blockedProviders}),null,2)+'\n');await fs.mkdir(root+'reports',{recursive:true});
await fs.writeFile(root+'reports/latest.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(root+'reports/'+at.replaceAll(':','-')+'.json',JSON.stringify(report,null,2)+'\n');
const review=results.filter(r=>r.verdict==='source-review').length;
const summary=`Metadata checked ${results.length}/${videos.length}; ${report.playbackAttempted} playback samples attempted, ${report.passed} start-and-tail passes, ${review} repeated source errors needing review. Blocked providers: ${blockedProviders.join(', ')||'none'}. No catalogue entries disabled; single runner is not worldwide verification.`;
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n');console.log(summary);if(blockedProviders.length||review||results.some(r=>r.verdict==='transient')||!results.length)process.exitCode=1;
