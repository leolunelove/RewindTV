import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
test('Library presentation shares the existing mounted media rather than creating a second player',()=>{
 assert.equal((html.match(/<video\b/g)||[]).length,1);
 const page=html.match(/<section id="library-player-page"[\s\S]*?<\/section>/)?.[0];
 assert.ok(page);assert.doesNotMatch(page,/<(?:video|iframe)\b/);
 assert.match(page,/id="library-picture-anchor"/);
});
test('Library player controls and anchors have unique labelled integration points',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of ['library-player-back','library-play','library-prev','library-next','library-seek','library-volume','library-mute','library-player-show','library-player-episode','library-player-position','library-queue-list','library-source','library-status','library-ended','library-replay'])assert.equal(ids.filter(x=>x===id).length,1,id);
 assert.match(html,/for="library-seek"/);assert.match(html,/for="library-volume"/);
 assert.match(html,/id="library-status" role="status"/);
});
