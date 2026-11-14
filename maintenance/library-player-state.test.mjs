import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {libraryQueueState} from '../site/library-meta.mjs';
import {programmeProgress} from '../site/programme-info.mjs';
const app=fs.readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
function fixture(queue=[{id:'one',title:'One',duration:1200},{id:'two',title:'Two',duration:1200}]){
 const nodes=new Map(),calls=[],node=()=>({children:[],dataset:{},attributes:{},textContent:'',append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(key,value){this.attributes[key]=String(value);},removeAttribute(key){delete this.attributes[key];},querySelector(){return this.paragraph??=node();}});
 const c={libraryContext:true,active:{video:{id:'excluded',title:'Excluded episode',series:'A Show',duration:1200,kind:'full episode'},offset:123},currentPlayer:()=>({getVideoData:()=>({video_id:'excluded'}),getCurrentTime:()=>123,getDuration:()=>1200,playVideo(){assert.fail('Rendering must not resume playback');},pauseVideo(){assert.fail('Rendering must not pause playback');},seekTo(){assert.fail('Rendering must not seek');}}),librarySeek:null,programmeTitle:video=>video.title,programmeProgress,libraryQueueState,countryPlaybackBlocked:true,requestedQueue:queue,requestedIndex:-1,paused:true,playbackIntent:false,power:true,seekingLibrary:false,volume:40,startupMuted:false,status:'Unavailable in this country. Press Play to choose another programme.',pendingLibraryResume:null,libraryEnded:false,libraryQueueStamp:'',element:(tag,text)=>Object.assign(node(),{tag,textContent:text}),selectLibraryEpisode:index=>calls.push(index),$:selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}};
 vm.createContext(c);vm.runInContext(app.slice(app.indexOf('  function renderLibrary(){'),app.indexOf("  $('#library-play').onclick=")),c);vm.runInContext(app.slice(app.indexOf('  function stepLibraryEpisode('),app.indexOf("  $('#library-prev').onclick=")),c);
 return {c,nodes,calls};
}
test('the actual Library header and controls preserve paused intent for an excluded current episode',()=>{
 const f=fixture();f.c.renderLibrary();
 assert.equal(f.nodes.get('#library-player-position').textContent,'Unavailable in this country');assert.equal(f.nodes.get('#library-play').textContent,'▶ Play');assert.equal(f.nodes.get('#library-prev').disabled,true);assert.equal(f.nodes.get('#library-next').disabled,false);assert.equal(f.nodes.get('#library-next').attributes['aria-label'],'Play an available programme');assert.equal(f.c.paused,true);assert.equal(f.c.playbackIntent,false);
 assert(f.nodes.get('#library-queue-list').children.every(button=>!button.attributes['aria-current']));
 f.c.stepLibraryEpisode(-1);assert.deepEqual(f.calls,[]);f.c.stepLibraryEpisode(1);assert.deepEqual(f.calls,[0]);
});
test('an excluded episode with an empty eligible queue exposes no dead Previous or Next control',()=>{
 const f=fixture([]);f.c.renderLibrary();assert.equal(f.nodes.get('#library-prev').disabled,true);assert.equal(f.nodes.get('#library-next').disabled,true);f.c.stepLibraryEpisode(-1);f.c.stepLibraryEpisode(1);assert.deepEqual(f.calls,[]);assert.equal(f.c.paused,true);
});
