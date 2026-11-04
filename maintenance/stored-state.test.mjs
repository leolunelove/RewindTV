import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync(new URL('../site/app.js',import.meta.url),'utf8'),line=src.split('\n').find(x=>x.includes('function readSavedObject('));
function read(raw,fail=false){return vm.runInNewContext(line+';JSON.stringify(readSavedObject("test"));',{localStorage:{getItem(){if(fail)throw Error('denied');return raw;}}});}
test('null, scalar, array, broken and blocked storage cannot break startup',()=>{for(const raw of ['null','5','"hello"','[]','broken',null])assert.equal(read(raw),'{}');assert.equal(read('{}',true),'{}');});
test('valid station preferences survive validation',()=>assert.equal(read('{"key":"kids","volume":40}'),'{"key":"kids","volume":40}'));
