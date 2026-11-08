import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWatchHistory} from '../site/watch-history.mjs';
import {showIdentity} from '../site/show-library.mjs';

function fixture(){
 const values=new Map();let time=100000,writes=0;
 const storage={getItem:key=>values.get(key)||null,setItem(key,value){writes++;values.set(key,value);}};
 const history=createWatchHistory({storage,now:()=>time});
 const episode=(id='ep1',series='Chad Vader',extra={})=>({id,series,title:`${series} — ${id}`,kind:'full episode',duration:600,watchUrl:'https://youtube.com/watch?v='+id,mediaUrl:'https://archive.org/'+id,...extra});
 const channel=(key,videos)=>({key,videos});
 return {history,storage,values,episode,channel,get writes(){return writes;},setTime:value=>time=value,advance:()=>time+=1000};
}
test('saved episode and clock survive a new history instance without persisting titles, URLs or artwork',()=>{
 const f=fixture(),video=f.episode();
 assert.equal(f.history.save(video,{channelKey:'classic',position:123.5,duration:598,origin:'shows'}),true);
 const reload=createWatchHistory({storage:f.storage,now:()=>100001});
 const [item]=reload.list({channels:[f.channel('classic',[video])]});
 assert.equal(item.video.id,'ep1');assert.equal(item.video.channelKey,'classic');assert.equal(item.position,123.5);assert.equal(item.duration,598);
 const persisted=JSON.parse(f.values.get('rewind-watch-history-v1'));
 assert.deepEqual(Object.keys(persisted.records[0]).sort(),['channelKey','duration','id','key','kind','origin','position','updatedAt']);
 assert.ok(!JSON.stringify(persisted).includes('https://'));assert.ok(!JSON.stringify(persisted).includes(video.title));
});
test('one latest episode per show is retained while language variants and individual films remain distinct',()=>{
 const f=fixture(),one=f.episode(),two=f.episode('ep2'),spanish=f.episode('es','Chad Vader',{audioLanguage:'es'}),film=f.episode('film1','',{kind:'film',title:'Charade'}),film2={...film,id:'film2',title:'Night of the Living Dead'};
 for(const video of [one,two,spanish,film,film2]){f.advance();f.history.save(video,{channelKey:'source',position:80});}
 const catalogue={channels:[f.channel('source',[one,two,spanish,film,film2])]};
 assert.deepEqual(f.history.list(catalogue).map(item=>item.video.id),['film2','film1','es','ep2']);
 assert.deepEqual(f.history.list(catalogue,{kind:'film'}).map(item=>item.video.id),['film2','film1']);
 assert.deepEqual(f.history.list(catalogue,{kind:'programmes'}).map(item=>item.video.id),['es','ep2']);
 assert.equal(f.history.get(one).id,'ep2');assert.equal(f.history.get(showIdentity(two)).position,80);
});
test('finishing removes the matching episode but a stale end event cannot erase a later episode',()=>{
 const f=fixture(),one=f.episode(),two=f.episode('ep2');
 f.history.save(one,{channelKey:'source',position:200});f.advance();
 f.history.save(two,{channelKey:'source',position:70});f.advance();
 assert.equal(f.history.save(one,{channelKey:'source',position:599}),false);assert.equal(f.history.get(two).id,'ep2');
 assert.equal(f.history.save(two,{channelKey:'source',position:570}),true);assert.equal(f.history.get(two),null);
});
test('short and long media only finish within their final five percent or thirty seconds, whichever is shorter',()=>{
 const f=fixture(),short=f.episode('short','Short',{duration:120}),long=f.episode('long','Long',{duration:7200});
 f.history.save(short,{channelKey:'source',position:100});assert.ok(f.history.get(short));
 f.history.save(short,{channelKey:'source',position:113});assert.ok(f.history.get(short));
 f.history.save(short,{channelKey:'source',position:114});assert.equal(f.history.get(short),null);
 f.history.save(long,{channelKey:'source',position:7169});assert.ok(f.history.get(long));
 f.history.save(long,{channelKey:'source',position:7170});assert.equal(f.history.get(long),null);
});
test('unstarted, invalid and older writes preserve a useful resume point; valid backward seeks are saved',()=>{
 const f=fixture(),video=f.episode();f.history.save(video,{channelKey:'source',position:200});f.advance();
 for(const position of [0,9,-1,NaN,Infinity,999999])assert.equal(f.history.save(video,{channelKey:'source',position}),false);
 for(const duration of [0,-10,NaN,Infinity,99999999])assert.equal(f.history.save(video,{channelKey:'source',position:200,duration}),false);
 assert.equal(f.history.get(video).position,200);
 f.setTime(1);assert.equal(f.history.save(video,{channelKey:'source',position:250}),false);
 f.setTime(102000);assert.equal(f.history.save(video,{channelKey:'source',position:50}),true);assert.equal(f.history.get(video).position,50);
});
test('history is bounded to twelve newest shows and saved object mutations cannot alter internal records',()=>{
 const f=fixture(),videos=[];
 for(let index=0;index<15;index++){const video=f.episode('ep'+index,'Show '+index);videos.push(video);f.advance();f.history.save(video,{channelKey:'source',position:100});}
 const list=f.history.list({channels:[f.channel('source',videos)]});assert.equal(list.length,12);assert.equal(list[0].video.id,'ep14');assert.equal(list.at(-1).video.id,'ep3');
 list[0].position=500;f.history.get(videos[14]).position=400;assert.equal(f.history.get(videos[14]).position,100);
});
test('catalogue resolution prefers the saved owner, falls back to another playable owner and never purges temporarily missing uploads',()=>{
 const f=fixture(),video=f.episode();f.history.save(video,{channelKey:'original',position:100});
 assert.equal(f.history.list({channels:[f.channel('other',[video]),f.channel('original',[video])]} )[0].video.channelKey,'original');
 assert.equal(f.history.list({channels:[f.channel('other',[video])]} )[0].video.channelKey,'other');
 assert.deepEqual(f.history.list({channels:[]}),[]);assert.ok(f.history.get(video));
 assert.equal(f.history.list({channels:[f.channel('original',[video])]}).length,1);
});
test('disabled, advert, deleted-identity and restricted records never become resume actions',()=>{
 const f=fixture(),video=f.episode();f.history.save(video,{channelKey:'source',position:100});
 for(const change of [{enabled:false},{kind:'advert'},{embedStatus:'restricted'},{embeddable:false},{status:{embeddable:false}},{regionRestriction:{allowed:['GB']}},{contentDetails:{regionRestriction:{blocked:['US']}}},{series:'A different show'}]){
  assert.deepEqual(f.history.list({channels:[f.channel('source',[{...video,...change}])]}),[],JSON.stringify(change));
 }
 assert.ok(f.history.get(video));
 assert.equal(f.history.save({...video,kind:'advert'},{channelKey:'source',position:200}),false);
});
test('corrupt or blocked local storage leaves an in-memory history usable',()=>{
 const f=fixture(),video=f.episode();
 for(const value of ['not json','null','[]','{"version":1,"records":{}}']){
  const history=createWatchHistory({storage:{getItem:()=>value,setItem(){throw Error('quota');}},now:()=>100000});
  assert.deepEqual(history.list({channels:[]}),[]);assert.equal(history.save(video,{channelKey:'source',position:100}),true);assert.equal(history.get(video).position,100);
 }
 const history=createWatchHistory({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},now:()=>100000});
 assert.equal(history.save(video,{channelKey:'source',position:100}),true);assert.equal(history.remove(video),true);
});
test('restored records are sanitized and duplicate show keys resolve to the newest record',()=>{
 const f=fixture(),video=f.episode();f.history.save(video,{channelKey:'source',position:100});
 const clean=JSON.parse(f.values.get('rewind-watch-history-v1')).records[0];
 const records=[{...clean,id:'old',position:80,updatedAt:90000,mediaUrl:'https://untrusted'},{...clean,evil:'discarded'},
  {...clean,key:'show:future',updatedAt:999999999},{...clean,key:'film:wrong',kind:'programme'},
  {...clean,key:'show:finished',position:599},{...clean,key:'show:bad',position:'300'},{...clean,key:'show:missing',channelKey:''}];
 const storage={getItem:()=>JSON.stringify({version:1,records}),setItem(){}};
 const history=createWatchHistory({storage,now:()=>100001});
 assert.equal(history.get(video).id,video.id);assert.equal(history.get(video).evil,undefined);
 assert.equal(history.get('show:future'),null);assert.equal(history.get('show:finished'),null);assert.equal(history.get('film:wrong'),null);
 assert.equal(history.list({channels:[f.channel('source',[video])]}).length,1);
});
test('subscribers receive real changes only and removal stays local to the chosen title',()=>{
 const f=fixture(),one=f.episode(),two=f.episode('other','Other');let calls=0;
 const unsubscribe=f.history.subscribe(()=>calls++);
 f.history.save(one,{channelKey:'source',position:100});f.advance();f.history.save(one,{channelKey:'source',position:100});
 assert.equal(calls,1);f.history.save(two,{channelKey:'source',position:40});assert.equal(calls,2);
 assert.equal(f.history.remove('show:missing'),false);assert.equal(calls,2);
 assert.equal(f.history.remove(one),true);assert.equal(calls,3);assert.ok(f.history.get(two));
 unsubscribe();f.advance();f.history.save(two,{channelKey:'source',position:50});assert.equal(calls,3);
});
