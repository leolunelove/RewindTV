import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=n=>fs.readFileSync(new URL('../site/'+n,import.meta.url),'utf8');
test('every fixed app control is present exactly once in the main document',()=>{const html=read('index.html'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'duplicate IDs');const references=['app.js','liquid-shell.mjs'].flatMap(file=>[...read(file).matchAll(/\$\('#([\w-]+)'\)/g)].map(m=>m[1]));for(const id of references)assert.ok(ids.includes(id),'missing '+id);});
test('Guide and Library share the main page and load the Liquid stylesheet with Doto accents',()=>{
 const html=read('index.html');
 assert.ok(!/id="(?:browse|schedule)-frame"/.test(html));
 assert.ok(!/<iframe\b/i.test(html),'Browsing must not mount another app iframe');
 const styles=[...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match=>match[1]);
 const local=styles.filter(src=>!/^https?:/.test(src));
 assert.deepEqual(local.map(src=>src.split('?')[0]),['liquid-ui.css']);
 for(const src of local){
  const sheet=new URL('../site/'+src.split('?')[0],import.meta.url);
  assert.ok(fs.statSync(sheet).isFile(),'Missing local stylesheet '+src);
  assert.ok(fs.readFileSync(sheet,'utf8').trim().length,'Empty local stylesheet '+src);
 }
 assert.ok(styles.every(src=>!/^https?:/.test(src)),'UI must not wait for a remote stylesheet');
 const css=read('liquid-ui.css');
 assert.match(css,/@font-face\{font-family:Doto/);
 assert.match(css,/font-display:swap/);
 const font=fs.readFileSync(new URL('../site/fonts/doto-latin-variable.woff2',import.meta.url));
 assert.equal(font.subarray(0,4).toString(),'wOF2');
 assert.match(read('fonts/Doto-OFL.txt'),/SIL OPEN FONT LICENSE/);
});
