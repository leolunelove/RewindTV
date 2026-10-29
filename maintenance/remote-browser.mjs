// Optional free-tier remote Chrome. No proxies, CAPTCHA solving or paid features.
export const REMOTE_RUN_LIMIT=40,REMOTE_MONTH_LIMIT=200,REMOTE_SESSION_MS=110000;
export function remoteEndpoint(token){if(!token)throw Error('Remote token not configured');const url=new URL('wss://production-sfo.browserless.io/chrome');url.searchParams.set('token',token);url.searchParams.set('timeout',String(REMOTE_SESSION_MS));return url.href;}
export function createRemoteProbe({connect,token,probeUrl,budget={},now=new Date(),runLimit=REMOTE_RUN_LIMIT}){
 const pageUrl=new URL(probeUrl);if(pageUrl.origin!=='https://tv.leolune.fun'||pageUrl.pathname!=='/health-probe.html')throw Error('Remote checks require the public Rewind probe');
 const month=now.toISOString().slice(0,7);const monthly={month,sessions:budget.month===month?Number(budget.sessions)||0:0};let sessions=0;
 return {monthly,stats:()=>({sessions,runLimit:Math.min(runLimit,REMOTE_RUN_LIMIT),monthlySessions:monthly.sessions,monthLimit:REMOTE_MONTH_LIMIT,sessionLimitMs:REMOTE_SESSION_MS}),async probe(video){
  if(sessions>=Math.min(runLimit,REMOTE_RUN_LIMIT)||monthly.sessions>=REMOTE_MONTH_LIMIT)return {id:video.id,status:'budget-limit',start:false,tail:false};
  sessions++;monthly.sessions++;let browser,timeout;
  try{
   browser=await connect(remoteEndpoint(token),{timeout:20000});
   const task=(async()=>{const context=await browser.newContext();const page=await context.newPage();await page.goto(pageUrl.href,{timeout:15000,waitUntil:'domcontentloaded'});return await page.evaluate(v=>window.probe(v),video);})();
   const expiry=new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Remote deadline')),80000);});
   return await Promise.race([task,expiry]);
  }catch{return {id:video.id,status:'browser-error',detail:'Remote browser connection or playback failed; token and connection URL omitted.',start:false,tail:false};}
  finally{clearTimeout(timeout);try{await browser?.close();}catch{}}
 }};
}
