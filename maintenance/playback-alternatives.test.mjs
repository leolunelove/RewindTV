import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findFilmAlternative} from '../site/playback-alternatives.mjs';
import {hydrateLibrary} from '../site/runtime-library.mjs';

const film=(id,extra={})=>({id,title:'His Girl Friday',kind:'film',year:1940,duration:5520,provider:'archive',...extra});
const channel=(key,videos)=>({key,videos});
const catalogue=(...channels)=>({channels});

test('film recovery matches normalized title, known release year, language and full runtime',()=>{
 const outgoing=film('original'),alternate=film('alternate',{title:'HIS GIRL — FRIDAY!',audioLanguage:'EN',provider:'youtube',duration:5500});
 const station=channel('cinema',[outgoing,alternate]),result=findFilmAlternative(catalogue(station),outgoing,{currentChannelKey:'cinema'});
 assert.equal(result.channel,station);assert.equal(result.video,alternate);
});

test('remakes, other audio languages, clips and incomplete films cannot replace a chosen film',()=>{
 const outgoing=film('original'),invalid=[
  film('remake',{year:1988}),film('unknown-year',{year:undefined}),film('range-year',{year:'1940–1941'}),
  film('spanish',{audioLanguage:'es'}),film('regional-language',{audioLanguage:'en-GB'}),
  film('clip',{kind:'short',duration:5520}),film('short-film',{duration:240}),
  film('wrong-title',{title:'His Girl Friday — Part 1'}),film('compilation',{duration:12000})
 ];
 assert.equal(findFilmAlternative(catalogue(channel('cinema',invalid)),outgoing),null);
 for(const extra of [{kind:'full episode'},{year:undefined},{year:'unknown'},{duration:0},{duration:NaN},{title:''}]){
  assert.equal(findFilmAlternative(catalogue(channel('cinema',[film('alternate')])),film('original',extra)),null);
 }
});

test('runtime matching includes exactly ten percent and rejects a longer or shorter mismatch',()=>{
 const outgoing=film('original',{duration:6000});
 for(const duration of [5400,6600]){
  const alternate=film('alternate',{duration});
  assert.equal(findFilmAlternative(catalogue(channel('cinema',[alternate])),outgoing).video,alternate);
 }
 for(const duration of [5399,6601,undefined,Infinity]){
  assert.equal(findFilmAlternative(catalogue(channel('cinema',[film('alternate',{duration})])),outgoing),null);
 }
});

test('current, failed, disabled, region-limited and embed-restricted sources stay excluded',()=>{
 const outgoing=film('original'),invalid=[
  outgoing,film('failed'),film('disabled',{enabled:false}),film('restricted',{embedStatus:'restricted'}),
  film('unembeddable',{embeddable:false}),film('status-restricted',{status:{embeddable:false}}),
  film('allowed-region',{regionRestriction:{allowed:['GB']}}),film('blocked-region',{regionRestriction:{blocked:['US']}}),
  film('nested-region',{contentDetails:{regionRestriction:{blocked:['GB']}}})
 ];
 const failed=new Set(['failed']),valid=film('valid');
 assert.equal(findFilmAlternative(catalogue(channel('cinema',invalid)),outgoing,{failed}),null);
 assert.equal(findFilmAlternative(catalogue(channel('cinema',[...invalid,valid])),outgoing,{failed}).video,valid);
});

test('the current station has priority before provider changes, then the closest runtime wins',()=>{
 const outgoing=film('original'),otherProvider=film('other-provider',{provider:'youtube'}),near=film('near',{duration:5510}),far=film('far',{duration:5400});
 const away=channel('away',[otherProvider]),current=channel('cinema',[far,near]);
 assert.equal(findFilmAlternative(catalogue(away,current),outgoing,{currentChannelKey:'cinema'}).video,near);
 const localYoutube=film('local-youtube',{provider:'youtube',duration:5300});current.videos.push(localYoutube);
 assert.equal(findFilmAlternative(catalogue(away,current),outgoing,{currentChannelKey:'cinema'}).video,localYoutube);
 assert.equal(findFilmAlternative(catalogue(current,away),outgoing).video,otherProvider);
});

test('a provider change is preferred in either direction and omitted providers mean YouTube',()=>{
 const outgoing=film('original',{provider:'youtube'}),sameProvider=film('youtube',{provider:undefined}),archive=film('archive');
 assert.equal(findFilmAlternative(catalogue(channel('cinema',[sameProvider,archive])),outgoing).video,archive);
 const outgoingArchive=film('original'),implicitYoutube=film('implicit-youtube',{provider:undefined});
 assert.equal(findFilmAlternative(catalogue(channel('cinema',[film('other-archive'),implicitYoutube])),outgoingArchive).video,implicitYoutube);
});

test('no alternative returns null without modifying catalogue, chosen film or failure history',()=>{
 const outgoing=Object.freeze(film('original')),other=Object.freeze(film('different',{title:'Another Film'}));
 const station=Object.freeze(channel('cinema',Object.freeze([outgoing,other]))),data=Object.freeze(catalogue(station));Object.freeze(data.channels);
 const before=JSON.stringify(data),failed=new Set(['earlier-failure']);
 assert.equal(findFilmAlternative(data,outgoing,{failed,currentChannelKey:'cinema'}),null);
 assert.equal(JSON.stringify(data),before);assert.deepEqual([...failed],['earlier-failure']);
 assert.equal(findFilmAlternative(catalogue(),outgoing),null);
});

test('every alternative in the shipped runtime catalogue resolves to an existing source without mutation',()=>{
 const data=hydrateLibrary(JSON.parse(fs.readFileSync(new URL('../site/runtime-library.json',import.meta.url))));
 const before=JSON.stringify(data);
 for(const station of data.channels)for(const source of station.videos){
  if(source.kind!=='film')continue;
  const result=findFilmAlternative(data,source,{currentChannelKey:station.key});
  if(!result)continue;
  assert(data.channels.includes(result.channel));assert(result.channel.videos.includes(result.video));
  assert.notEqual(result.video.id,source.id);
 }
 assert.equal(JSON.stringify(data),before);
});
