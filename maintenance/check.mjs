import fs from 'node:fs/promises';import http from 'node:http';import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';import {plan,update,environmentBlocked} from './policy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const catalogue=JSON.parse(await fs.readFile(root+'site/catalogue.json','utf8'));
const videos=[...new Map([...catalogue.channels.flatMap(c=>c.videos||[]),...(catalogue.adverts||[])].map(v=>[v.id,v])).values()];
const state=JSON.parse(await fs.readFile(root+'data/state.json','utf8'));
const queue=plan(videos,state,Math.min(250,Number(process.env.BATCH_LIMIT)||250));
const html=await fs.readFile(root+'maintenance/probe.html');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(html)});
await new Promise(r=>server.listen(8123,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});let cursor=0;const results=[];const deadline=Date.now()+16*60*1000;
try{
 await Promise.all(Array.from({length:3},async()=>{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8123/');
  while(cursor<queue.length&&Date.now()<deadline){
   const v=queue[cursor++];let result;
   try{result=await page.evaluate(v=>window.probe(v),v)}catch(e){result={id:v.id,status:'browser-error',detail:String(e).slice(0,200)}}
   results.push({...result,title:v.title});
  }
 }));
}finally{await browser.close();server.close();}
const blocked=environmentBlocked(results),now=new Date().toISOString();
// Persist exact coverage only. Never disable a catalogue based on one cloud region.
await fs.writeFile(root+'data/state.json',JSON.stringify(update(state,results,now),null,2)+'\n');
const report={at:now,runnerRegion:'Not verified; single cloud runner',catalogueSize:videos.length,planned:queue.length,checked:results.length,passed:results.filter(r=>r.status==='playing').length,environmentBlocked:blocked,worldwideVerified:false,results};
await fs.mkdir(root+'reports',{recursive:true});await fs.writeFile(root+'reports/latest.json',JSON.stringify(report,null,2)+'\n');
const failures=results.filter(r=>r.status!=='playing');
const summary=`Checked ${results.length}/${videos.length} catalogue sources; ${report.passed} sampled starts/near-ends passed. ${failures.length} need review. Cloud-region failures are not worldwide bans.${blocked?' Runner environment appears blocked; do not mass-disable sources.':''}`;
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
console.log(summary);if(failures.length||results.length===0)process.exitCode=1;
