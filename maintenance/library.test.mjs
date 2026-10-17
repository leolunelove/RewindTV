import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {withGameshowAdditions} from '../site/library.mjs';
const base=JSON.parse(fs.readFileSync(new URL('../site/catalogue.json',import.meta.url))),extra=JSON.parse(fs.readFileSync(new URL('../site/gameshow-additions.json',import.meta.url)));
test('verified quiz additions reach channel 15 without changing scheduled flagships or enabling kids gameshows',()=>{
 const merged=withGameshowAdditions(base,extra),channel=merged.channels.find(c=>c.key==='rewind-gameshows');
 assert.deepEqual(merged.channels.slice(0,10),base.channels.slice(0,10));assert.equal(merged.channels.length,17);
 const live=channel.videos.filter(v=>v.enabled!==false);assert.equal(live.length,147);assert.equal(new Set(live.map(v=>v.series)).size,7);
 assert(!live.some(v=>['Jungle Run','Fun House','Get Your Own Back','Techno Games'].includes(v.series)));
 assert.equal(withGameshowAdditions(merged,extra).channels[14].videos.length,channel.videos.length);
});
test('a base catalogue disablement wins over an older additions file',()=>{
 const copy=structuredClone(base);copy.channels[14].videos.push({...extra.videos[0],enabled:false});
 const merged=withGameshowAdditions(copy,extra);assert.equal(merged.channels[14].videos.find(v=>v.id===extra.videos[0].id).enabled,false);
});
