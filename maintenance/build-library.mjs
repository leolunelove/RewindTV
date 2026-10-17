import fs from 'node:fs/promises';
import {withGameshowAdditions,withExpansion,EXPANSION_PACKS} from '../site/library.mjs';
import {compactLibrary,hydrateLibrary} from '../site/runtime-library.mjs';
const root=new URL('../site/',import.meta.url),read=async n=>JSON.parse(await fs.readFile(new URL(n,root),'utf8'));
let cat=withGameshowAdditions(await read('catalogue.json'),await read('gameshow-additions.json'));
for(const n of EXPANSION_PACKS)cat=withExpansion(cat,await read(n));
const packed=compactLibrary(cat);hydrateLibrary(packed);const output=JSON.stringify(packed);
await fs.writeFile(new URL('runtime-library.json',root),output);
console.log(`Playback library: ${Object.keys(packed.videos).length} unique videos, ${Buffer.byteLength(output)} bytes, one request.`);
