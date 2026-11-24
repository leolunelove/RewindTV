// Real-app checks: no mocked media, injected history, or autoplay-policy override.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve('site'),out=path.resolve('playwright-report/library-release');
await fs.mkdir(out,{recursive:true});
const pack=JSON.parse(await fs.readFile(path.join(root,'archive-library.json'),'utf8'));
const report={checkedAt:new Date().toISOString(),region:'GitHub runner egress country not independently verified',scope:'Actual app startup and near-end clock checks, not full-runtime or worldwide certification',sources:[],flows:[]};
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error('Forbidden');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const route=v=>`${base}/?channel=${v.channelKey}&episode=${encodeURIComponent(v.id)}&playback=library#library-watch`;
const state=page=>page.locator('#archive-player').evaluate(v=>({src:v.currentSrc,time:v.currentTime,duration:v.duration,paused:v.paused,ready:v.readyState,width:v.videoWidth,error:v.error?.code||null}));
async function playing(page,v,position=0){
  await page.waitForFunction(({src,position})=>{const v=document.querySelector('#archive-player');return v?.currentSrc===src&&!v.paused&&v.readyState>=3&&v.videoWidth>0&&v.currentTime>=position;},{src:v.mediaUrl,position},{timeout:45000});
  const a=await state(page);await page.waitForTimeout(1300);const b=await state(page);
  if(b.src!==v.mediaUrl||b.time<a.time+.3)throw Error(`Picture clock did not advance: ${JSON.stringify({a,b})}`);
  return b;
}
async function seek(page,seconds){
  await page.locator('#library-seek').evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},seconds);
}
async function activate(page,v){
  await page.goto(route(v),{waitUntil:'domcontentloaded'});
  await page.locator('#library-player-page').waitFor({state:'visible',timeout:45000});
  return playing(page,v);
}
async function checkFlow(viewport){
  const context=await browser.newContext({...viewport,reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(15000);
  const v=pack.videos[0],record={viewport:viewport.viewport,status:'failed'};
  try{
    await activate(page,v);
    await seek(page,120);await playing(page,v,119);
    await page.locator('#library-play').click();
    const saved=await state(page);
    await page.locator('#library-player-back').click();
    await page.locator('#library-view').waitFor({state:'visible'});
    // Browsing must retain the same source and paused clock.
    const browse=await state(page);if(browse.src!==saved.src||Math.abs(browse.time-saved.time)>3)throw Error('Back to browsing changed source or position');
    await page.locator('#watch-tab').click();
    await page.waitForFunction(()=>document.querySelector('#rewind-tv')?.dataset.destination==='watch');
    await page.locator('#browse-button').click();
    const resume=page.locator('.continue-resume').filter({hasText:'Net Cafe'}).first();
    await resume.waitFor({state:'visible'});await resume.click();
    const resumed=await playing(page,v,119);
    await page.reload({waitUntil:'domcontentloaded'});
    const reloaded=await playing(page,v,119);
    await page.locator('#library-player-back').click();
    const search=page.getByRole('searchbox',{name:'Find a show or film'});await search.fill('BBS: The Documentary');
    await page.getByRole('button',{name:'Browse BBS: The Documentary',exact:false}).click();
    const episodes=await page.locator('.episode-row').count();if(episodes!==8)throw Error(`Expected eight BBS episodes; got ${episodes}`);
    const credits=await page.locator('.episode-rights').count();if(credits!==8)throw Error(`Missing episode licence credits: ${credits}`);
    await page.locator('.episode-row').first().click();
    await playing(page,pack.videos.find(x=>x.id==='archive-BBS.The.Documentary-ep1'));
    await page.locator('#remote-guide').click();
    await page.locator('#guide-page').waitFor({state:'visible'});
    await playing(page,pack.videos.find(x=>x.id==='archive-BBS.The.Documentary-ep1'));
    await page.locator('#mini-return').click();
    await page.locator('#library-player-page').waitFor({state:'visible'});
    await page.screenshot({path:path.join(out,`library-${viewport.isMobile?'mobile':'desktop'}.png`)});
    record.status='passed';record.resume={saved:saved.time,resumed:resumed.time,reloaded:reloaded.time};record.notes='Library source preserved while browsing; saved progress survived Live TV and reload; eight credited BBS episodes; Guide kept clock advancing and mini-player returned to Library.';
  }catch(e){record.error=String(e);await page.screenshot({path:path.join(out,`flow-failure-${viewport.isMobile?'mobile':'desktop'}.png`)}).catch(()=>{});}
  finally{report.flows.push(record);await context.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
}
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);
  for(const v of pack.videos){
    const record={id:v.id,title:v.title,url:v.mediaUrl,status:'failed'};
    try{record.start=await activate(page,v);await seek(page,Math.max(10,record.start.duration-18));record.tail=await playing(page,v,record.start.duration-20);record.status='passed';}
    catch(e){record.error=String(e);record.observed=await state(page).catch(()=>null);await page.screenshot({path:path.join(out,`${v.id.replace(/[^a-z0-9-]/gi,'_')}-failure.png`)}).catch(()=>{});}
    report.sources.push(record);console.log(JSON.stringify(record));await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  }
  await context.close();
  await checkFlow({viewport:{width:1440,height:900}});
  await checkFlow({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
if(report.sources.some(x=>x.status!=='passed')||report.flows.some(x=>x.status!=='passed'))process.exitCode=1;
