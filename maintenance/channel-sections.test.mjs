import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectionChannels} from '../site/channel-sections.mjs';
test('every live channel appears once with its original number',()=>{
 const {channels}=JSON.parse(readFileSync(new URL('../site/catalogue.json',import.meta.url)));
 const rows=sectionChannels(channels).flatMap(section=>section.channels);
 assert.equal(rows.length,channels.length);assert.equal(new Set(rows.map(row=>row.index)).size,channels.length);
 for(const row of rows)assert.equal(row.channel.key,channels[row.index].key);
});
test('unassigned channels remain discoverable and empty language groups stay hidden',()=>{
 const sections=sectionChannels([{key:'new-channel',name:'New channel'},{key:'trailers',name:'Cartoons'}]);
 assert.equal(sections.some(s=>s.name==='World TV'),false);
 assert.equal(sections.at(-1).channels[0].index,0);
 assert.equal(sections[0].channels[0].index,1);
});
