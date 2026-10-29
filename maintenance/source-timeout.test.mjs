import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf("  $('#retry-video').onclick=()=>{"),source.indexOf('  let numberEntry='));
function retry(provider){
 const button={},timers=[],messages=[];
 const context={failed:new Set(),localStorage:{removeItem(){}},power:true,active:{mode:'ondemand',offset:3,video:{provider,title:'Programme'}},initRetries:0,ready:false,player:null,window:{YT:{Player(){}}},document:{getElementById(){return null;}},recoverPlayerApi(){if(context.active.video.provider!=='archive')messages.push('automatic API recovery');},apiTimer:0,clearTimeout(){},setTimeout(fn){timers.push(fn);return 1;},setStatus(message){messages.push(message);},ensurePlayer(){},$:()=>button};
 vm.runInNewContext(handler,context);button.onclick();timers.forEach(fn=>fn());return messages;
}
test('retrying a direct Archive stream does not trigger a YouTube timeout',()=>{assert.deepEqual(retry('archive'),['RETRYING · Programme']);});
test('retrying an unready YouTube player automatically recovers after its timeout',()=>{assert.deepEqual(retry('youtube'),['RETRYING · Programme','automatic API recovery']);});
