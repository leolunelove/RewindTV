import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pickProgramme} from '../site/show-library.mjs';

const episode=(id,series,extra={})=>({id,series,kind:'full episode',...extra});
const channel=(key,videos)=>({key,videos});

test('all-channel shuffle draws station and show independently of episode count',()=>{
 const a=channel('a',[...Array.from({length:30},(_,i)=>episode('a'+i,'A')),episode('b','B')]);
 const z=channel('z',[episode('z','Z')]);
 let draws=[.49,.51,0];
 assert.equal(pickProgramme([a,z],{random:()=>draws.shift()}).video.id,'b');
 assert.equal(pickProgramme([a,z],{random:()=>.51}).channel.key,'z');
});

test('this-channel shuffle stays in that channel and prefers another show with an unseen episode',()=>{
 const now=episode('now','Current'),seen=episode('seen','Other'),fresh=episode('fresh','Other');
 const a=channel('a',[now,episode('more','Current'),seen,fresh,episode('recent','Recent')]);
 const z=channel('z',[episode('z','Elsewhere')]);
 assert.equal(pickProgramme([a,z],{channelKey:'a',current:now,recentPicks:[episode('recent','Recent')],seen:{seen:1},random:()=>0}).video.id,'fresh');
});

test('shuffle skips commercials and known failures, but supports a film or music station',()=>{
 const a=channel('a',[episode('advert','Ads',{kind:'advert'}),episode('failed','Bad'),episode('region','Bad',{regionRestriction:{allowed:['US']}})]);
 const b=channel('b',[episode('film','Cinema',{kind:'film'})]);
 const failed=new Set(['failed']);
 assert.equal(pickProgramme([a,b],{channelKey:'a',failed}),null);
 assert.equal(pickProgramme([a,b],{failed,random:()=>0}).video.id,'film');
});

test('a one-show channel can still shuffle to another episode',()=>{
 const first=episode('first','Only show'),second=episode('second','Only show');
 assert.equal(pickProgramme([channel('a',[first,second])],{current:first,random:()=>0}).video.id,'second');
});

test('standalone episodes take precedence over compilation uploads when both are available',()=>{
 const compilation=episode('batch','A',{title:'Full Episodes Compilation'});
 const single=episode('single','B',{title:'A Night Out'});
 assert.equal(pickProgramme([channel('a',[compilation,single])],{random:()=>0}).video.id,'single');
 assert.equal(pickProgramme([channel('a',[compilation])],{random:()=>0}).video.id,'batch');
});

test('fresh picks beat repeats across stations, including on a reroll',()=>{
 const now=episode('now','Current'),previous=episode('previous','Another'),fresh=episode('fresh','Elsewhere');
 const pool=[channel('a',[now,previous]),channel('b',[fresh])];
 assert.equal(pickProgramme(pool,{current:now,previousId:'previous',recentPicks:[{id:'previous',showKey:'show:another'}],random:()=>0}).video.id,'fresh');
});

test('reroll can use a different playable title when the preferred episode is the current preview',()=>{
 const previous=episode('previous','A'),film=episode('film','Cinema',{kind:'film'});
 assert.equal(pickProgramme([channel('a',[previous,film])],{previousId:previous.id,random:()=>0}).video.id,'film');
});
