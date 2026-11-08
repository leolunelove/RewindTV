import {test} from 'node:test';import assert from 'node:assert/strict';import {createPanelMotion} from '../site/panel-motion.mjs';
function fixture(t,reduced=false,types=['dialog'],wide){const old=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:reduced});t.after(()=>globalThis.matchMedia=old);const animations=[];const panels=types.map(type=>{const p=new EventTarget();p.open=false;p.hidden=true;p.hasAttribute=k=>type==='page'&&k==='data-tv-page';p.querySelector=()=>({focus(){p.focused=true;}});p.classList={contains:k=>k==='guide'};p.showModal=()=>p.open=true;p.close=()=>{p.open=false;p.dispatchEvent(new Event('close'));};p.animate=()=>{const a={finished:Promise.resolve(),cancel(){}};animations.push(a);return a;};return p;});const regions=[{inert:false}];const root={querySelector(selector){if(selector==='.guide')return panels.find(p=>p.hasAttribute('data-tv-page'));},ownerDocument:wide===undefined?undefined:{defaultView:{matchMedia:q=>({matches:q.includes('min-width')?wide:reduced}),location:{hash:''},history:{pushState(){}},addEventListener(){}}},querySelectorAll(selector){if(selector==='.club-layout, .watch-controls')return regions;if(selector==='dialog, [data-tv-page]')return panels;if(selector==='dialog[open], [data-tv-page]:not([hidden])')return panels.filter(p=>p.hasAttribute('data-tv-page')?!p.hidden:p.open);return [];}};return {regions,panels,panel:panels[0],animations,motion:createPanelMotion(root)};}
test('closing releases the page immediately; repeated close cannot leave a blocking overlay',t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.close(f.panel);assert.equal(f.panel.open,false);assert.equal(f.animations.length,1);});
test('a rapid close and reopen has no deferred close that can hide the new page',async t=>{const f=fixture(t);f.motion.open(f.panel);f.motion.close(f.panel);f.motion.open(f.panel);await Promise.resolve();assert.equal(f.panel.open,true);});
test('reduced motion and Escape use the same immediate close path',t=>{const f=fixture(t,true);f.motion.open(f.panel);const e=new Event('cancel',{cancelable:true});f.panel.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(f.panel.open,false);assert.equal(f.animations.length,0);});
test('only one utility dialog can be open',t=>{const f=fixture(t,false,['dialog','dialog']);f.motion.open(f.panels[0]);f.motion.open(f.panels[1]);assert.deepEqual(f.panels.map(p=>p.open),[false,true]);});
test('native guide and library pages replace one another without stacking',t=>{const f=fixture(t,false,['page','page']);f.motion.open(f.panels[0]);f.motion.open(f.panels[1]);assert.deepEqual(f.panels.map(p=>p.hidden),[true,false]);assert.deepEqual(f.panels.map(p=>p.open),[false,false]);});
test('closing Settings returns to the page underneath instead of losing the browsing context',t=>{const f=fixture(t,false,['page','dialog']);f.motion.open(f.panels[0]);f.motion.open(f.panels[1]);assert.equal(f.panels[0].hidden,false);f.motion.close(f.panels[1]);assert.equal(f.panels[0].hidden,false);});
test('Escape dismisses the page and focuses the route back to watching',t=>{const f=fixture(t,true,['page']);f.motion.open(f.panel);const e=new Event('keydown',{cancelable:true});e.key='Escape';f.panel.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(f.panel.hidden,true);});

test('desktop browsing keeps the Watch remote inert until returning to Watch',t=>{const f=fixture(t,false,['page'],true);f.motion.open(f.panel);assert.equal(f.regions[0].inert,true);f.motion.close(f.panel);assert.equal(f.regions[0].inert,false);});
test('phone drawer blocks controls behind it until dismissed',t=>{const f=fixture(t,false,['page'],false);f.motion.open(f.panel);assert.equal(f.regions[0].inert,true);f.motion.close(f.panel);assert.equal(f.regions[0].inert,false);});

test('closing a desktop page returns to Watch without reopening Channels',t=>{const f=fixture(t,false,['page','page'],true);f.motion.open(f.panels[1]);f.motion.close(f.panels[1]);assert.deepEqual(f.panels.map(panel=>panel.hidden),[true,true]);});

function navigationFixture(wide=false){
 const win=new EventTarget(),historyEntries=[{hash:'#watch',state:null}],regions=[{inert:false}];let position=0;
 const doc={defaultView:win,activeElement:null};
 win.location={hash:'#watch'};
 win.matchMedia=query=>({matches:query.includes('min-width')?wide:true});
 function move(entry){win.location.hash=entry.hash;win.history.state=entry.state;}
 function travel(delta){const next=position+delta;if(next<0||next>=historyEntries.length)return;position=next;move(historyEntries[position]);win.dispatchEvent(new Event('popstate'));}
 win.history={state:null,pushState(state,title,hash){historyEntries.splice(position+1);historyEntries.push({hash,state});position++;move(historyEntries[position]);},replaceState(state,title,hash){historyEntries[position]={hash,state};move(historyEntries[position]);},back(){travel(-1);},forward(){travel(1);}};
 function control(id){
  return {id,isConnected:true,hidden:false,attributes:new Map(),setAttribute(name,value){this.attributes.set(name,value);},removeAttribute(name){this.attributes.delete(name);},getClientRects(){return this.hidden?[]:[{}];},closest(){return null;},focus(){doc.activeElement=this;}};
 }
 const controls=new Map(['watch-tab','remote-guide','browse-button','settings-button','info-button','shuffle-button'].map(id=>[id,control(id)]));
 const names=['guide','schedule-overlay','browse-overlay','movie-night-page','library-player-page','tv-settings','programme-info','shuffle-dialog'];
 const panels=new Map(names.map(name=>{
  const panel=new EventTarget(),page=!['tv-settings','programme-info','shuffle-dialog'].includes(name),back=control(name+'-back');
  panel.id=name;panel.open=false;panel.hidden=true;panel.hasAttribute=key=>page&&key==='data-tv-page';
  panel.classList={contains:key=>key===name};panel.querySelector=()=>back;
  panel.showModal=()=>panel.open=true;panel.close=()=>{panel.open=false;panel.dispatchEvent(new Event('close'));};
  return [name,panel];
 }));
 const mini={hidden:true,inert:false},classes=new Set();
 const events=[];
 const root={dispatchEvent(event){events.push(event);return true;},ownerDocument:doc,dataset:{},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},querySelector(selector){if(selector==='#mini-player')return mini;return controls.get(selector.slice(1))||panels.get(selector.slice(1));},querySelectorAll(selector){
  if(selector==='.club-layout, .watch-controls')return regions;
  if(selector==='.app-tabs button')return ['watch-tab','remote-guide','browse-button'].map(id=>controls.get(id));
  if(selector==='[aria-haspopup=dialog]')return ['settings-button','info-button','shuffle-button'].map(id=>controls.get(id));
  if(selector==='dialog, [data-tv-page]')return [...panels.values()];
  if(selector==='dialog[open], [data-tv-page]:not([hidden])')return [...panels.values()].filter(panel=>panel.hasAttribute('data-tv-page')?!panel.hidden:panel.open);
  return [];
 }};
 return {events,win,doc,root,mini,regions,classes,controls,historyEntries,panels,motion:createPanelMotion(root)};
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

test('returning to Watch closes browsing and repeated Watch actions add no duplicate entries',()=>{
 const f=navigationFixture(true);
 f.motion.open(f.panels.get('browse-overlay'));
 f.motion.watch();
 assert.equal(f.win.location.hash,'#watch');
 assert.equal(f.historyEntries.length,3);
 assert.equal(f.panels.get('guide').hidden,true);
 assert.equal(f.panels.get('browse-overlay').hidden,true);
 assert.equal(f.root.dataset.destination,'watch');
 assert.equal(f.mini.hidden,true);
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

test('Guide and both Library views use the mini-player while Watch controls stay inert',()=>{
 for(const wide of [false,true]){
  const f=navigationFixture(wide);
  for(const [panel,destination,selected]of [['schedule-overlay','guide','remote-guide'],['browse-overlay','library','browse-button'],['movie-night-page','library','browse-button']]){
   f.motion.open(f.panels.get(panel));
   assert.equal(f.root.dataset.destination,destination);
   assert.equal(f.controls.get(selected).attributes.get('aria-current'),'page');
   assert.equal(f.classes.has('is-browsing'),true);
   assert.equal(f.regions[0].inert,true);
   assert.equal(f.mini.hidden,false);assert.equal(f.mini.inert,false);
  }
  f.motion.watch();
  assert.equal(f.regions[0].inert,false);
  assert.equal(f.classes.has('is-browsing'),false);
  assert.equal(f.controls.get('watch-tab').attributes.get('aria-current'),'page');
 }
});

test('Shuffle participates in Back and Forward without losing the underlying Guide',()=>{
 const f=navigationFixture();
 f.motion.open(f.panels.get('schedule-overlay'),{state:{guideChannel:'movies'}});
 f.controls.get('shuffle-button').focus();f.motion.open(f.panels.get('shuffle-dialog'));
 assert.equal(f.win.history.state.utility,'shuffle');
 assert.equal(f.historyEntries.length,3);
 f.win.history.back();
 assert.equal(f.panels.get('shuffle-dialog').open,false);
 assert.equal(f.panels.get('schedule-overlay').hidden,false);
 assert.equal(f.win.history.state.guideChannel,'movies');
 f.win.history.forward();
 assert.equal(f.panels.get('shuffle-dialog').open,true);
 assert.equal(f.panels.get('schedule-overlay').hidden,false);
 assert.equal(f.historyEntries.length,3);
 f.motion.watch();
 assert.equal(f.win.location.hash,'#watch');
 assert.equal(f.historyEntries.length,3);
 assert.equal(f.panels.get('shuffle-dialog').open,false);
});

test('closing a utility restores its connected Watch trigger',()=>{
 const f=navigationFixture(),trigger=f.controls.get('settings-button');
 trigger.focus();f.motion.open(f.panels.get('tv-settings'));
 f.doc.activeElement=null;f.motion.close(f.panels.get('tv-settings'));
 assert.equal(f.doc.activeElement,trigger);
 assert.equal(f.win.location.hash,'#watch');
});

test('a replaced utility trigger falls back to its current control',()=>{
 const f=navigationFixture(),oldTrigger={isConnected:false};
 f.doc.activeElement=oldTrigger;f.motion.open(f.panels.get('programme-info'));
 f.motion.close(f.panels.get('programme-info'));
 assert.equal(f.doc.activeElement,f.controls.get('info-button'));
});

test('closing a browsing utility keeps focus on its invoker after history restores the page',()=>{
 const f=navigationFixture(),trigger=f.controls.get('shuffle-button');
 f.motion.open(f.panels.get('browse-overlay'));trigger.focus();
 f.motion.open(f.panels.get('shuffle-dialog'));f.doc.activeElement=null;
 f.motion.close(f.panels.get('shuffle-dialog'));
 assert.equal(f.doc.activeElement,trigger);
 assert.equal(f.panels.get('browse-overlay').hidden,false);
});


test('Library player selects Library without browsing mini-player or live remote',()=>{
 const f=navigationFixture();f.motion.open(f.panels.get('library-player-page'));
 assert.equal(f.win.location.hash,'#library-watch');
 assert.equal(f.root.dataset.destination,'library');
 assert.equal(f.classes.has('library-watching'),true);
 assert.equal(f.classes.has('is-browsing'),false);
 assert.equal(f.mini.hidden,true);assert.equal(f.regions[0].inert,true);
 assert.equal(f.controls.get('browse-button').attributes.get('aria-current'),'page');
 f.motion.open(f.panels.get('browse-overlay'));
 assert.equal(f.classes.has('library-watching'),false);assert.equal(f.mini.hidden,false);
});

test('Escape and close from Library player delegate to Library browsing rather than Watch',()=>{
 const f=navigationFixture(),player=f.panels.get('library-player-page');f.motion.open(player);
 const key=new Event('keydown',{cancelable:true});key.key='Escape';player.dispatchEvent(key);
 assert.equal(key.defaultPrevented,true);
 assert.equal(f.events.filter(e=>e.type==='rewind:library-back').length,1);
 assert.equal(f.events.find(e=>e.type==='rewind:library-back').bubbles,true);
 assert.equal(f.win.location.hash,'#library-watch');
 f.motion.close(player);assert.equal(f.events.filter(e=>e.type==='rewind:library-back').length,2);
});

test('Back and Forward restore Library player presentation and utility context without new history entries',()=>{
 const f=navigationFixture();f.motion.open(f.panels.get('browse-overlay'),{state:{detail:'show:test'}});
 f.motion.open(f.panels.get('library-player-page'));const length=f.historyEntries.length;
 f.win.history.back();assert.equal(f.panels.get('browse-overlay').hidden,false);assert.equal(f.win.history.state.detail,'show:test');
 f.win.history.forward();assert.equal(f.panels.get('library-player-page').hidden,false);assert.equal(f.classes.has('library-watching'),true);assert.equal(f.mini.hidden,true);
 assert.equal(f.historyEntries.length,length);
 f.motion.open(f.panels.get('tv-settings'));f.motion.close(f.panels.get('tv-settings'));
 assert.equal(f.panels.get('library-player-page').hidden,false);assert.equal(f.classes.has('library-watching'),true);
});
