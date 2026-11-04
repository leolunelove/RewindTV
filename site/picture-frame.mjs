export function savedPictureFormats(value){if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).filter(([id,mode])=>id&&(mode==='classic'||mode==='wide')));}
export function pictureRatio(video={},native,mode='auto'){
 if(mode==='wide')return 16/9;if(mode==='classic')return 4/3;
 const known=Number(video.sourceAspectRatio);if(Number.isFinite(known)&&known>=.5&&known<=3)return known;
 if(video.provider==='archive'&&native?.videoWidth>0&&native?.videoHeight>0)return native.videoWidth/native.videoHeight;
 return 4/3;
}
export function fitPicture(width,height,ratio){const w=Math.max(0,Math.min(width,height*ratio));return {width:w,height:w/ratio};}
export function createPictureFrame(root,{getVideo,native}){
 const area=root.querySelector('.club-layout'),frame=root.querySelector('.club-player'),win=root.ownerDocument.defaultView;let saved={},last='';try{saved=savedPictureFormats(JSON.parse(win.localStorage.getItem('rewind-picture-formats')||'{}'))}catch{}
 const mode=()=>saved[getVideo()?.id]||'auto';
 function update(){const v=getVideo()||{},m=mode(),ratio=pictureRatio(v,native,m),r=area.getBoundingClientRect(),fit=fitPicture(r.width,r.height,ratio),key=v.id+':'+m+':'+fit.width+':'+fit.height;if(last===key)return;last=key;
  frame.style.width=fit.width+'px';frame.style.height=fit.height+'px';frame.style.aspectRatio='auto';root.style.setProperty('--picture-height',fit.height+'px');
  root.querySelectorAll('[data-picture-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pictureMode===m)));
  const label=root.querySelector('#picture-fit');label.textContent=m==='auto'?'Auto':m==='wide'?'16:9':'4:3';label.setAttribute('aria-label','Picture shape: '+label.textContent+'. Change picture shape');
  root.querySelector('#picture-note').textContent=m!=='auto'?'Saved for this video. The complete picture stays visible.':v.provider==='archive'?'Auto follows this stream’s dimensions. Baked-in black bars may remain.':'YouTube hides its picture dimensions. Choose 4:3 or 16:9 here if needed; we’ll remember this video.';
 }
 function choose(m){const id=getVideo()?.id;if(!id)return;if(m==='auto')delete saved[id];else saved[id]=m;try{win.localStorage.setItem('rewind-picture-formats',JSON.stringify(saved))}catch{}last='';update();}
 root.querySelectorAll('[data-picture-mode]').forEach(b=>b.onclick=()=>choose(b.dataset.pictureMode));root.querySelector('#picture-fit').onclick=()=>choose(mode()==='auto'?'wide':mode()==='wide'?'classic':'auto');
 if(win.ResizeObserver){const observer=new win.ResizeObserver(update);observer.observe(area);}native.addEventListener('loadedmetadata',update);win.addEventListener('resize',update);return {update};
}
