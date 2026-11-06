export function savedPictureFormats(value){if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).filter(([id,mode])=>id&&(mode==='classic'||mode==='wide')));}
export function pictureRatio(video={},native,mode='auto'){
 if(mode==='wide')return 16/9;if(mode==='classic')return 4/3;
 const known=Number(video.sourceAspectRatio);if(Number.isFinite(known)&&known>=.5&&known<=3)return known;
 if(video.provider==='archive'&&native?.videoWidth>0&&native?.videoHeight>0)return native.videoWidth/native.videoHeight;
 return 4/3;
}
export function fitPicture(width,height,ratio){const w=Math.max(0,Math.min(width,height*ratio));return {width:w,height:w/ratio};}
export function createPictureFrame(root,{getVideo,native}){
 const win=root.ownerDocument.defaultView,label=root.querySelector('#picture-fit'),note=root.querySelector('#picture-note'),buttons=root.querySelectorAll('[data-picture-mode]');let saved={},last='',lastRatio=4/3;try{saved=savedPictureFormats(JSON.parse(win.localStorage.getItem('rewind-picture-formats')||'{}'))}catch{}
 const mode=()=>saved[getVideo()?.id]||'auto';
 function update(){const v=getVideo()||{},m=mode();
  // Dimensions from the previous archive source can linger until the next metadata event.
  const media=native.readyState>=1&&(!v.mediaUrl||native.currentSrc===v.mediaUrl)?native:null;
  const ratio=pictureRatio(v,media,m),key=v.id+':'+m+':'+ratio;if(last===key)return;last=key;
  if(ratio!==lastRatio){lastRatio=ratio;root.style.setProperty('--picture-ratio',String(ratio));}
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pictureMode===m)));
  label.textContent=m==='auto'?'Auto':m==='wide'?'16:9':'4:3';label.setAttribute('aria-label','Picture shape: '+label.textContent+'. Change picture shape');
  const format=m==='classic'?'4:3':m==='wide'?'16:9':Math.abs(ratio-4/3)<.025?'4:3':Math.abs(ratio-16/9)<.025?'16:9':ratio.toFixed(2)+':1';
  const frame=m==='auto'?'Auto frame · '+format:'Saved frame · '+format;
  const help=m==='auto'&&v.provider==='youtube'&&!v.sourceAspectRatio?'Try 16:9 for widescreen or 4:3 for classic TV.':'The frame fits the complete picture.';
  note.textContent=frame+'. '+help+' Bars encoded into the video stay visible.';
 }
 function choose(m){const id=getVideo()?.id;if(!id)return;if(m==='auto')delete saved[id];else saved[id]=m;try{win.localStorage.setItem('rewind-picture-formats',JSON.stringify(saved))}catch{}last='';update();}
 buttons.forEach(b=>b.onclick=()=>choose(b.dataset.pictureMode));label.onclick=()=>choose(mode()==='auto'?'wide':mode()==='wide'?'classic':'auto');
 native.addEventListener('loadedmetadata',update);native.addEventListener('resize',update);return {update};
}
