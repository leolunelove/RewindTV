import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRY_CODES,normalizeCountry,regionEligibility,isRegionEligible,catalogueForCountry,readCountryOverride,saveCountryOverride,browserAudioLanguages,resolveViewingCountry,cachedCountry,REGION_STORAGE_KEY,REGION_CACHE_KEY} from '../site/region-eligibility.mjs';

test('country eligibility evaluates declarations against the selected country rather than blocking every regional source',()=>{
 const allowed={regionRestriction:{allowed:['GB','ES']}},blocked={regionRestriction:{blocked:['US']}},both={contentDetails:{regionRestriction:{allowed:['GB','US'],blocked:['US']}}};
 assert(isRegionEligible(allowed,'GB'));assert(isRegionEligible(allowed,'es'));assert(!isRegionEligible(allowed,'US'));
 assert(isRegionEligible(blocked,'GB'));assert(!isRegionEligible(blocked,'US'));assert(isRegionEligible(both,'GB'));assert(!isRegionEligible(both,'US'));
 assert(!isRegionEligible({regionRestriction:{allowed:[]}},'GB'));assert(!isRegionEligible({regionRestriction:{allowed:'GB'}},'GB'));
});
test('unknown countries optimistically try declared sources without delaying normal player recovery',()=>{
 assert(isRegionEligible({}));assert(isRegionEligible({regionRestriction:{blocked:[]}}));
 for(const restriction of [{allowed:['US']},{blocked:['GB']}]){const result=regionEligibility({regionRestriction:restriction});assert.equal(result.reason,'country-unknown');assert.equal(result.eligible,true);}
 assert.equal(normalizeCountry('en-US'),null);assert.equal(normalizeCountry('ZZ'),null);assert.equal(normalizeCountry(' gb '),'GB');assert.equal(new Set(COUNTRY_CODES).size,249);
});
test('a regional view preserves raw records, source declarations, channel numbers and advert eligibility',()=>{
 const a={id:'a',regionRestriction:{allowed:['GB']}},b={id:'b',regionRestriction:{blocked:['GB']}},c={id:'c'},cat={channels:[{key:'one',number:7,videos:[a,b,c]},{key:'two',number:33,videos:[b]}],adverts:[a,b]},before=JSON.stringify(cat);
 const view=catalogueForCountry(cat,'GB');assert.equal(JSON.stringify(cat),before);assert.deepEqual(view.channels.map(c=>[c.number,c.videos.map(v=>v.id)]),[[7,['a','c']],[33,[]]]);assert.deepEqual(view.adverts.map(v=>v.id),['a']);
 assert.notEqual(view.channels[0].videos[0],a);assert.deepEqual(view.channels[0].videos[0].regionRestriction,a.regionRestriction);assert(isRegionEligible(view.channels[0].videos[0]));assert.equal(view.channels[0].videos[1],c);
 assert.deepEqual(catalogueForCountry(cat,'US').channels[0].videos.map(v=>v.id),['b','c']);assert.deepEqual(cat.channels[0].videos.map(v=>v.id),['a','b','c']);
});
test('manual country override survives reload and malformed or blocked storage fails safely',()=>{
 const records=new Map(),storage={getItem:key=>records.get(key),setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)};
 assert.equal(saveCountryOverride(storage,'es'),'ES');assert.equal(readCountryOverride(storage),'ES');saveCountryOverride(storage,null);assert.equal(readCountryOverride(storage),null);records.set(REGION_STORAGE_KEY,'en-US');assert.equal(readCountryOverride(storage),null);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};assert.equal(readCountryOverride(blocked),null);assert.doesNotThrow(()=>saveCountryOverride(blocked,'GB'));
});
test('browser language preferences are normalized independently of viewing country',()=>{
 assert.deepEqual(browserAudioLanguages(['en-US','es-ES','zh-Hans-CN','en-GB','fr','not a language']),['en','es','zh','fr']);assert.deepEqual(browserAudioLanguages(null),[]);assert.equal(normalizeCountry('en-US'),null);
});
test('country lookup is bounded, omits credentials and stores no IP or other response fields',async()=>{
 const records=new Map(),storage={getItem:key=>records.get(key),setItem:(key,value)=>records.set(key,value)};let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://api.country.is/');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert(options.signal);return {ok:true,json:async()=>({country:'ES',ip:'not-to-be-retained',other:'private'})};};
 assert.deepEqual(await resolveViewingCountry({storage,fetcher,now:1000}),{country:'ES',source:'detected'});assert.deepEqual(JSON.parse(records.get(REGION_CACHE_KEY)),{country:'ES',checkedAt:1000});assert(![...records.values()].join('').includes('private'));assert(![...records.values()].join('').includes('not-to-be-retained'));
 assert.deepEqual(await resolveViewingCountry({storage,fetcher,now:2000}),{country:'ES',source:'cached'});assert.equal(calls,1);assert.equal(cachedCountry(storage,1000+86400000),null);
 records.set(REGION_STORAGE_KEY,'GB');assert.deepEqual(await resolveViewingCountry({storage,fetcher,now:3000}),{country:'GB',source:'manual'});assert.equal(calls,1);
 const result=await resolveViewingCountry({fetcher:()=>new Promise(()=>{}),timeoutMs:2});assert.deepEqual(result,{country:null,source:'unknown'});
 assert.deepEqual(await resolveViewingCountry({fetcher:async()=>{throw Error('blocked');}}),{country:null,source:'unknown'});
});
