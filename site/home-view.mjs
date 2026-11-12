import {buildShowIndex} from './show-library.mjs?v=20261112';
import {buildMovieLibrary} from './movie-night.mjs?v=liquid1';
import {programmeTitle} from './programme-info.mjs?v=liquid1';

export function createHomeView(host,{catalogue,getNow,onLive,onShows,onFilms,onGuide,onReturn,onSettings,onMute}){
 const find=selector=>host.querySelector(selector);
 const text=(selector,value)=>{
  const node=find(selector);
  if(node.textContent!==value)node.textContent=value;
 };
 const count=new Intl.NumberFormat('en-GB');
 const shows=buildShowIndex(catalogue).filter(show=>show.kind!=='film'&&show.episodes.length);
 const films=buildMovieLibrary(catalogue);
 text('#home-channel-count',count.format(catalogue.channels.length)+' channels');
 text('#home-film-count',count.format(films.length)+' films');
 text('#home-show-count',count.format(shows.length)+' shows & collections');

 const actions={'#home-live':onLive,'#home-films':onFilms,'#home-shows':onShows,'#home-guide':onGuide,'#home-return':onReturn,'#home-settings':onSettings,'#home-mute':onMute};
 for(const [selector,action] of Object.entries(actions))find(selector).onclick=action;
 const choices=[find('#home-live'),find('#home-films'),find('#home-shows')];
 find('.home-choices').addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const index=choices.indexOf(event.target);
  if(index<0)return;
  const delta=['ArrowRight','ArrowDown'].includes(event.key)?1:['ArrowLeft','ArrowUp'].includes(event.key)?-1:0;
  if(!delta)return;
  event.preventDefault();
  choices[(index+delta+choices.length)%choices.length].focus();
 });
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Gibraltar',hour:'2-digit',minute:'2-digit'});
 const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Gibraltar',weekday:'short',day:'numeric',month:'short'});
 function update(){
  if(host.hidden)return;
  const now=getNow(),video=now.video;
  const clock=new Date();
  text('#home-time',time.format(clock));
  text('#home-date',date.format(clock));
  text('#home-now-label',now.isLibrary?'Playing from Library':now.power?'On your television':'Last on your television');
  text('#home-now-title',video?(video.series||programmeTitle(video)):'Finding your frequency…');
  text('#home-now-detail',video?(now.isLibrary?programmeTitle(video):now.channel?.name||'Live TV'):'Your last channel is tuning in');
  find('#home-return').setAttribute('aria-label',video?'Return to '+(video.series||programmeTitle(video)):'Watch television');
  find('#home-mute').setAttribute('aria-label','Mute television');
  find('#home-mute').setAttribute('aria-pressed',String(now.muted));
  find('#home-mute').title=now.muted?'Turn sound on':'Turn sound off';
  find('#home-mute').dataset.muted=String(now.muted);
 }
 update();
 return {update};
}
