import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiquidShell,focusPictureRect} from '../site/liquid-shell.mjs';
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

test('Home and browsing move the mounted picture between anchors without invoking media',()=>{
 const classes=new Set(),properties=new Map(),observed=[];
 const node=(rect={left:0,top:0,width:100,height:50})=>({
  textContent:'',hidden:false,dataset:{},attributes:new Map(),
  getBoundingClientRect:()=>rect,
  setAttribute(name,value){this.attributes.set(name,value);},
  getAttribute(name){return this.attributes.get(name);},
  closest:()=>({getBoundingClientRect:()=>({top:0,bottom:900})}),
 });
 const screen=node(),watch=node({left:250,top:40,width:720,height:540});
 const miniAnchor=node({left:22,top:520,width:140,height:105});
 const homeAnchor=node({left:300,top:620,width:160,height:120});
 const homeContent={scrollTop:0,getBoundingClientRect:()=>({top:0,bottom:900})};
 homeAnchor.closest=()=>homeContent;
 const libraryAnchor=node({left:280,top:120,width:640,height:480});
 const mini=node(),nodes=new Map([
  ['.screen',screen],['.screen-anchor',watch],['#mini-picture-anchor',miniAnchor],
  ['#home-picture-anchor',homeAnchor],['#library-picture-anchor',libraryAnchor],['#mini-player',mini],
  ...['#exit-focus','#mini-title','#now-title','#mini-return','#mini-detail','#watch-channel-name',
   '#library-player-episode','#on-air-mode','#tv-play','#mini-play','#startup-sound','#mini-mute',
   '#focus-watch','.tv-dock','.club-now'].map(selector=>[selector,node()])
 ]);
 const win=new EventTarget();
 Object.assign(win,{innerWidth:1440,innerHeight:900,requestAnimationFrame:()=>1,
  ResizeObserver:class{observe(element){observed.push(element);}},MutationObserver:class{observe(){}}
 });
 const doc=new EventTarget();doc.defaultView=win;
 const root=new EventTarget();
 Object.assign(root,{ownerDocument:doc,querySelector:selector=>nodes.get(selector),
  classList:{contains:name=>classes.has(name)},style:{setProperty:(name,value)=>properties.set(name,value),getPropertyValue:name=>properties.get(name)}
 });
 const shell=createLiquidShell(root);
 shell.measure();assert.equal(properties.get('--screen-left'),'250.00px');
 classes.add('is-browsing');classes.add('home-open');shell.update();shell.measure();
 assert.equal(mini.hidden,true);
 assert.equal(properties.get('--screen-left'),'300.00px');
 assert.equal(properties.get('--screen-width'),'160.00px');
 assert.equal(screen.attributes.get('aria-label'),'Programme continues playing on Home');
 assert.equal(properties.get('--home-picture-motion'),'var(--motion-picture)');
 homeContent.scrollTop=60;shell.measure();
 assert.equal(properties.get('--home-picture-motion'),'0ms','the picture follows native Home scrolling without lag');
 classes.delete('home-open');shell.update();shell.measure();
 assert.equal(mini.hidden,false);
 assert.equal(properties.get('--screen-left'),'22.00px');
 assert.equal(properties.get('--home-picture-motion'),'var(--motion-picture)');
 classes.add('home-open');classes.add('library-watching');shell.update();shell.measure();
 assert.equal(properties.get('--screen-left'),'280.00px','Library playback owns its stage even if a stale Home class remains');
 assert.equal(mini.hidden,true);
 assert(observed.includes(homeAnchor));
 assert.equal(root.querySelector('.screen'),screen,'presentation retains the original media host');
});
