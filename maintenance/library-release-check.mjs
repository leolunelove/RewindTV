// Real-app checks: no mocked media, injected history, or autoplay-policy override.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve('site'),out=path.resolve('playwright-report/library-release');
await fs.mkdir(out,{recursive:true});
const packName=process.env.REWIND_RELEASE_PACK||'archive-library.json';
const pack=JSON.parse(await fs.readFile(path.join(root,packName),'utf8'));
const discovery=packName==='archive-discovery.json';
const sources=pack.videos.filter(v=>v.enabled!==false);
const flowOnly=process.env.REWIND_RELEASE_FLOW_ONLY==='1';
const report={checkedAt:new Date().toISOString(),region:'GitHub runner egress country not independently verified',scope:flowOnly?'Desktop/mobile About and playback/resume/navigation checks; no catalogue-wide, full-runtime or worldwide certification':'Actual app startup and near-end clock checks, not full-runtime or worldwide certification',sources:[],flows:[]};
report.sourceCoverage=flowOnly?'UI-only run; catalogue source probes not repeated':'All enabled sources in the selected release pack';
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
  const v=discovery?pack.videos.find(v=>v.id==='archive-joneses-001'):pack.videos[0],record={viewport:viewport.viewport,status:'failed'};
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
    const resume=page.locator('.continue-resume').filter({hasText:discovery?'Where Are the Joneses?':'Net Cafe'}).first();
    await resume.waitFor({state:'visible'});await resume.click();
    const resumed=await playing(page,v,119);
    await page.reload({waitUntil:'domcontentloaded'});
    const reloaded=await playing(page,v,119);
    await page.locator('#library-player-back').click();
    const search=page.getByRole('searchbox',{name:'Find a show or film'});
    const title=discovery?'Where Are the Joneses?':'BBS: The Documentary';
    await search.fill(title);
    await page.getByRole('button',{name:'Browse '+title,exact:false}).click();
    const expected=discovery?94:8;
    const episodes=await page.locator('.episode-row').count();if(episodes!==expected)throw Error(`Expected ${expected} original files; got ${episodes}`);
    const credits=await page.locator('.episode-rights').count();if(credits!==expected)throw Error(`Missing episode licence credits: ${credits}`);
    if(discovery){
      if(!(await page.locator('.library-detail-meta').innerText()).includes('92 episodes'))throw Error('Multipart stories were counted twice');
      const about=page.getByRole('region',{name:'About Where Are the Joneses?',exact:true});
      await about.waitFor({state:'visible'});
      const text=await about.innerText();
      for(const term of ['2007','Programme length','English','Baby Cow','Dawn Jones'])if(!text.includes(term))throw Error('Missing show About fact: '+term);
      record.aboutShow={text,playback:await playing(page,v,119)};
      await about.scrollIntoViewIfNeeded();
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('About caused horizontal page overflow');
      await page.screenshot({path:path.join(out,`about-show-${viewport.isMobile?'mobile':'desktop'}.png`)});
      await page.getByRole('searchbox',{name:'Find an episode',exact:true}).fill('Post Mortem');
      await page.locator('.episode-row').click();
      await playing(page,pack.videos.find(x=>x.id==='archive-joneses-056a'));
      await page.locator('#library-next').click();await playing(page,pack.videos.find(x=>x.id==='archive-joneses-056b'));
      await page.locator('#library-next').click();await playing(page,pack.videos.find(x=>x.id==='archive-joneses-057'));
    }else{
      await page.locator('.episode-row').first().click();
      await playing(page,pack.videos.find(x=>x.id==='archive-BBS.The.Documentary-ep1'));
    }
    const guideVideo=discovery?pack.videos.find(x=>x.id==='archive-joneses-057'):pack.videos.find(x=>x.id==='archive-BBS.The.Documentary-ep1');
    await page.locator('#remote-guide').click();
    await page.locator('#guide-page').waitFor({state:'visible'});
    await playing(page,guideVideo);
    await page.locator('#mini-return').click();
    await page.locator('#library-player-page').waitFor({state:'visible'});
    if(discovery){
      const film=pack.videos.find(x=>x.title==='Nasty Old People');
      await page.locator('#home-tab').click();await page.locator('#home-films').click();
      await page.getByRole('searchbox',{name:'Find a film',exact:true}).fill('Nasty Old People');
      await page.getByRole('button',{name:'Choose Nasty Old People',exact:true}).click();
      if(!(await page.locator('.movie-hero').innerText()).includes('Swedish'))throw Error('Swedish audio not labelled');
      const about=page.getByRole('region',{name:'About Nasty Old People',exact:true});
      const text=await about.innerText();for(const term of ['2009','1h 24m','Swedish','Hanna Sköld','Mette'])if(!text.includes(term))throw Error('Missing film About fact: '+term);
      record.aboutFilm={text,playback:await playing(page,guideVideo)};
      await about.scrollIntoViewIfNeeded();
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Film About caused horizontal page overflow');
      await page.screenshot({path:path.join(out,`about-film-${viewport.isMobile?'mobile':'desktop'}.png`)});
      await page.locator('.movie-hero .movie-play').click();await playing(page,film);
      await seek(page,120);await playing(page,film,119);await page.locator('#library-play').click();
      await page.locator('#watch-tab').click();await page.locator('#home-tab').click();await page.locator('#home-films').click();
      await page.locator('.continue-resume').filter({hasText:'Nasty Old People'}).click();await playing(page,film,119);
      await page.reload({waitUntil:'domcontentloaded'});await playing(page,film,119);
    }
    await page.screenshot({path:path.join(out,`library-${viewport.isMobile?'mobile':'desktop'}.png`)});
    record.status='passed';record.resume={saved:saved.time,resumed:resumed.time,reloaded:reloaded.time};record.notes=(discovery?'Joneses multipart order and 92-story count, Swedish film label and film resume passed. ':'')+'Library source preserved while browsing; saved progress survived Live TV and reload; per-episode credits visible; Guide kept clock advancing and mini-player returned to Library.';
  }catch(e){record.error=String(e);await page.screenshot({path:path.join(out,`flow-failure-${viewport.isMobile?'mobile':'desktop'}.png`)}).catch(()=>{});}
  finally{report.flows.push(record);await context.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
}
try{
  let cursor=0;
  async function worker(){
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);
    while(cursor<sources.length){
      const v=sources[cursor++],record={id:v.id,title:v.title,url:v.mediaUrl,status:'failed'};
      for(let attempt=1;attempt<=2;attempt++){
        try{
          record.start=await activate(page,v);record.attempt=attempt;
          if(Math.abs(record.start.duration-v.duration)>2)throw Error('Actual runtime differs from selected full file');
          if(discovery&&(v.series.startsWith('NASA')||v.kind==='film'||v.kind==='short')){
            record.reviewFrames=[];
            const times=v.series.startsWith('NASA')?[Math.max(0,record.start.duration-90),Math.max(0,record.start.duration-35)]:[16,Math.min(160,record.start.duration/2),Math.max(0,record.start.duration-60)];
            for(const time of times){await seek(page,time);await playing(page,v,Math.max(0,time-2));const frame=`${v.id.replace(/[^a-z0-9-]/gi,'_')}-${Math.floor(time)}.png`;await page.locator('#archive-player').screenshot({path:path.join(out,frame)});record.reviewFrames.push(frame);}
          }
          await seek(page,Math.max(10,record.start.duration-18));record.tail=await playing(page,v,record.start.duration-20);record.status='passed';break;
        }catch(e){record.error=String(e);record.observed=await state(page).catch(()=>null);if(attempt===2)await page.screenshot({path:path.join(out,`${v.id.replace(/[^a-z0-9-]/gi,'_')}-failure.png`)}).catch(()=>{});}
      }
      report.sources.push(record);console.log(JSON.stringify(record));await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
    }
    await context.close();
  }
  if(!flowOnly)await Promise.all(Array.from({length:discovery?2:1},worker));
  await checkFlow({viewport:{width:1440,height:900}});
  await checkFlow({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
if(report.sources.some(x=>x.status!=='passed')||report.flows.some(x=>x.status!=='passed'))process.exitCode=1;
