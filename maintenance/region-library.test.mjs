import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactLibrary} from '../site/runtime-library.mjs';
import {REGION_STORAGE_KEY} from '../site/region-eligibility.mjs';

const video=(id,allowed)=>({id,title:id,series:'A Show',kind:'full episode',duration:1200,regionRestriction:{allowed}});
test('standalone viewers receive country filtering while raw library records remain recoverable',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);const calls=[];
 const source={version:1,channels:[{key:'one',number:7,videos:[video('gi',['GI']),video('cn',['CN'])]}],adverts:[]};
 globalThis.fetch=async path=>{calls.push(path);return {ok:true,json:async()=>compactLibrary(source)};};
 const values=new Map([[REGION_STORAGE_KEY,'GI']]),storage={getItem:key=>values.get(key)};
 const {loadLibrary,loadViewingLibrary}=await import('../site/library.mjs?region-standalone');
 const raw=await loadLibrary(),view=await loadViewingLibrary({storage,fetcher:()=>{throw Error('Manual country must avoid another lookup');}});
 assert.deepEqual(raw.channels[0].videos.map(v=>v.id),['gi','cn']);assert.deepEqual(view.channels[0].videos.map(v=>v.id),['gi']);assert.equal(view.channels[0].number,7);assert.equal(view.viewerCountry,'GI');assert.deepEqual(calls,['runtime-library.json']);
});
test('embedded pages reuse the parent regional view without a country request or a second catalogue download',async t=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;t.after(()=>{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;globalThis.fetch=oldFetch;});
 const parent={viewerCountry:'CN',channels:[{key:'one',number:7,videos:[{...video('cn',['CN']),viewerCountry:'CN'}]}],adverts:[]};
 globalThis.window={parent:{RewindLibrary:()=>parent}};globalThis.fetch=()=>{throw Error('Unexpected download');};
 const {loadViewingLibrary}=await import('../site/library.mjs?region-embedded');const view=await loadViewingLibrary({fetcher:()=>{throw Error('Unexpected country request');}});
 assert.equal(view.viewerCountry,'CN');assert.equal(view.channels[0].videos,parent.channels[0].videos);assert.deepEqual(view.channels[0].videos.map(v=>v.id),['cn']);
});
