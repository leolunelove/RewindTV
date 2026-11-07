import {test} from 'node:test';import assert from 'node:assert/strict';import {createPanelMotion} from '../site/panel-motion.mjs';
function fixture(t,reduced=false,types=['dialog'],wide){const old=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:reduced});t.after(()=>globalThis.matchMedia=old);const animations=[];const panels=types.map(type=>{const p=new EventTarget();p.open=false;p.hidden=true;p.hasAttribute=k=>type==='page'&&k==='data-tv-page';p.querySelector=()=>({focus(){p.focused=true;}});p.classList={contains:k=>k==='guide'};p.showModal=()=>p.open=true;p.close=()=>{p.open=false;p.dispatchEvent(new Event('close'));};p.animate=()=>{const a={finished:Promise.resolve(),cancel(){}};animations.push(a);return a;};return p;});const regions=[{inert:false}];const root={querySelector(selector){if(selector==='.guide')return panels.find(p=>p.hasAttribute('data-tv-page'));},ownerDocument:wide===undefined?undefined:{defaultView:{matchMedia:q=>({matches:q.includes('min-width')?wide:reduced}),location:{hash:''},history:{pushState(){}},addEventListener(){}}},querySelectorAll(selector){if(selector==='.club-layout, .watch-controls')return regions;if(selector==='dialog, [data-tv-page]')return panels;if(selector==='dialog[open], [data-tv-page]:not([hidden])')return panels.filter(p=>p.hasAttribute('data-tv-page')?!p.hidden:p.open);return [];}};return {regions,panels,panel:panels[0],animations,motion:createPanelMotion(root)};}
test('closing releases the page immediately; repeated close cannot leave a blocking overlay',t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.close(f.panel);assert.equal(f.panel.open,false);assert.equal(f.animations.length,1);});
test('a rapid close and reopen has no deferred close that can hide the new page',async t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.open(f.panel);await Promise.resolve();assert.equal(f.panel.open,true);});
test('reduced motion and Escape use the same immediate close path',t=>{const f=fixture(t,true);f.motion.open(f.panel);const e=new Event('cancel',{cancelable:true});f.panel.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(f.panel.open,false);assert.equal(f.animations.length,0);});
test('only one utility dialog can be open',t=>{const f=fixture(t,false,['dialog','dialog']);f.motion.open(f.panels[0]);f.motion.open(f.panels[1]);assert.deepEqual(f.panels.map(p=>p.open),[false,true]);});
test('native guide and library pages replace one another without stacking',t=>{const f=fixture(t,false,['page','page']);f.motion.open(f.panels[0]);f.motion.open(f.panels[1]);assert.deepEqual(f.panels.map(p=>p.hidden),[true,false]);assert.deepEqual(f.panels.map(p=>p.open),[false,false]);});
test('closing Settings returns to the page underneath instead of losing the browsing context',t=>{const f=fixture(t,false,['page','dialog']);f.motion.open(f.panels[0]);f.motion.open(f.panels[1]);assert.equal(f.panels[0].hidden,false);f.motion.close(f.panels[1]);assert.equal(f.panels[0].hidden,false);});
test('Escape dismisses the page and focuses the route back to watching',t=>{const f=fixture(t,true,['page']);f.motion.open(f.panel);const e=new Event('keydown',{cancelable:true});e.key='Escape';f.panel.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(f.panel.hidden,true);});

test('desktop sidebar leaves the TV remote interactive',t=>{const f=fixture(t,false,['page'],true);f.motion.open(f.panel);assert.equal(f.regions[0].inert,false);});
test('phone drawer blocks controls behind it until dismissed',t=>{const f=fixture(t,false,['page'],false);f.motion.open(f.panel);assert.equal(f.regions[0].inert,true);f.motion.close(f.panel);assert.equal(f.regions[0].inert,false);});

test('closing a desktop page returns to Channels instead of an empty rail',t=>{const f=fixture(t,false,['page','page'],true);f.motion.open(f.panels[1]);f.motion.close(f.panels[1]);assert.equal(f.panels[0].hidden,false);assert.equal(f.panels[1].hidden,true);});

function navigationFixture(wide=false){
 const win=new EventTarget(),historyEntries=[{hash:'#watch',state:null}],regions=[{inert:false}];let position=0;
 win.location={hash:'#watch'};
 win.matchMedia=query=>({matches:query.includes('min-width')?wide:true});
 function move(entry){win.location.hash=entry.hash;win.history.state=entry.state;}
 win.history={state:null,pushState(state,title,hash){historyEntries.splice(position+1);historyEntries.push({hash,state});position++;move(historyEntries[position]);},replaceState(state,title,hash){historyEntries[position]={hash,state};move(historyEntries[position]);},back(){if(position){position--;move(historyEntries[position]);win.dispatchEvent(new Event('popstate'));}}};
 const names=['guide','schedule-overlay','browse-overlay','movie-night-page','tv-settings','programme-info'];
 const panels=new Map(names.map(name=>{
  const panel=new EventTarget(),page=!['tv-settings','programme-info'].includes(name);
  panel.open=false;panel.hidden=true;panel.hasAttribute=key=>page&&key==='data-tv-page';
  panel.classList={contains:key=>key===name};panel.querySelector=()=>({focus(){}});
  panel.showModal=()=>panel.open=true;panel.close=()=>{panel.open=false;panel.dispatchEvent(new Event('close'));};
  return [name,panel];
 }));
 const root={ownerDocument:{defaultView:win},querySelector:selector=>panels.get(selector.slice(1)),querySelectorAll(selector){
  if(selector==='.club-layout, .watch-controls')return regions;
  if(selector==='dialog, [data-tv-page]')return [...panels.values()];
  if(selector==='dialog[open], [data-tv-page]:not([hidden])')return [...panels.values()].filter(panel=>panel.hasAttribute('data-tv-page')?!panel.hidden:panel.open);
  return [];
 }};
 return {win,historyEntries,panels,motion:createPanelMotion(root)};
}

test('Channels and Guide have distinct routes and one history entry per selection',()=>{
 const f=navigationFixture();
 f.motion.open(f.panels.get('guide'));
 assert.equal(f.win.location.hash,'#channels');
 f.motion.open(f.panels.get('schedule-overlay'),{state:{guideChannel:'movies'}});
 assert.equal(f.win.location.hash,'#guide');
 assert.equal(f.historyEntries.length,3);
 f.motion.open(f.panels.get('schedule-overlay'),{state:{guideChannel:'movies'}});
 assert.equal(f.historyEntries.length,3);
 f.win.history.back();
 assert.equal(f.win.location.hash,'#channels');
 assert.equal(f.panels.get('guide').hidden,false);
 assert.equal(f.panels.get('schedule-overlay').hidden,true);
 assert.equal(f.historyEntries.length,3);
});

test('Back from Guide restores the Library detail without an intermediate Channels page',()=>{
 const f=navigationFixture();
 f.motion.open(f.panels.get('browse-overlay'));
 f.win.history.pushState({rewind:true,detail:'show:example'},'','#library');
 f.motion.open(f.panels.get('schedule-overlay'),{state:{guideChannel:'all'}});
 f.win.history.back();
 assert.equal(f.win.location.hash,'#library');
 assert.equal(f.win.history.state.detail,'show:example');
 assert.equal(f.panels.get('browse-overlay').hidden,false);
 assert.equal(f.historyEntries.length,4);
});

test('returning to TV creates one entry and keeps the desktop channel rail',()=>{
 const f=navigationFixture(true);
 f.motion.open(f.panels.get('browse-overlay'));
 f.motion.watch();
 assert.equal(f.win.location.hash,'#watch');
 assert.equal(f.historyEntries.length,3);
 assert.equal(f.panels.get('guide').hidden,false);
 assert.equal(f.panels.get('browse-overlay').hidden,true);
 f.motion.watch();
 assert.equal(f.historyEntries.length,3);
});

test('switching utilities replaces their history entry and closes back to the underlying page',()=>{
 const f=navigationFixture();
 f.motion.open(f.panels.get('browse-overlay'));
 f.motion.open(f.panels.get('programme-info'));
 f.motion.open(f.panels.get('tv-settings'));
 assert.equal(f.historyEntries.length,3);
 f.motion.close(f.panels.get('tv-settings'));
 assert.equal(f.win.location.hash,'#library');
 assert.equal(f.win.history.state.utility,undefined);
 assert.equal(f.panels.get('programme-info').open,false);
 assert.equal(f.panels.get('tv-settings').open,false);
 assert.equal(f.panels.get('browse-overlay').hidden,false);
});

test('opening a page from Info consumes the utility entry before browser Back',()=>{
 const f=navigationFixture();
 f.motion.open(f.panels.get('programme-info'));
 f.motion.open(f.panels.get('schedule-overlay'),{state:{guideChannel:'movies'}});
 assert.equal(f.historyEntries.length,2);
 f.win.history.back();
 assert.equal(f.win.location.hash,'#watch');
 assert.equal(f.panels.get('programme-info').open,false);
 assert.equal(f.panels.get('schedule-overlay').hidden,true);
});
