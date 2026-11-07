import test from 'node:test';
import assert from 'node:assert/strict';
import {focusPictureRect} from '../site/liquid-shell.mjs';
test('focus frame retains the complete raster within a notched phone viewport',()=>{
 const v={left:0,top:0,width:393,height:852},i={left:8,right:8,top:126,bottom:106};
 const r=focusPictureRect(v,i,4/3);
 assert.equal(r.width,377);assert.equal(r.width/r.height,4/3);
 assert.ok(r.top>=i.top);assert.ok(r.top+r.height<=v.height-i.bottom);
});
test('keyboard viewport offset and height bound the frame above the keyboard',()=>{
 const v={left:0,top:24,width:393,height:420},i={left:8,right:8,top:70,bottom:85};
 const r=focusPictureRect(v,i,4/3);
 assert.equal(r.width/r.height,4/3);assert.ok(r.top>=94);
 assert.ok(r.top+r.height<=359);assert.ok(r.left>=8);
});
