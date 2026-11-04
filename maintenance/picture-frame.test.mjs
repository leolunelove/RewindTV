import {test} from 'node:test';import assert from 'node:assert/strict';import {pictureRatio,fitPicture,savedPictureFormats} from '../site/picture-frame.mjs';
test('unknown YouTube aspect stays classic rather than guessing from thumbnails',()=>assert.equal(pictureRatio({provider:'youtube'},{videoWidth:1920,videoHeight:1080}),4/3));
test('native dimensions and verified source hints resolve automatically',()=>{assert.equal(pictureRatio({provider:'archive'},{videoWidth:1920,videoHeight:1080}),16/9);assert.equal(pictureRatio({sourceAspectRatio:2.39}),2.39);});
test('manual shape overrides source dimensions without changing video content',()=>{assert.equal(pictureRatio({sourceAspectRatio:2.39},null,'classic'),4/3);assert.equal(pictureRatio({},null,'wide'),16/9);});
test('fitting respects both viewport dimensions and keeps the resolved ratio',()=>{for(const ratio of [4/3,16/9,2.39])for(const [w,h]of [[390,844],[800,500]]){const p=fitPicture(w,h,ratio);assert(p.width<=w&&p.height<=h);assert(Math.abs(p.width/p.height-ratio)<1e-9);}});

test('malformed saved formats cannot break player startup',()=>{for(const v of [null,[],3,'wide'])assert.deepEqual(savedPictureFormats(v),{});assert.deepEqual(savedPictureFormats({one:'wide',two:'classic',bad:'auto',no:12}),{one:'wide',two:'classic'});});
