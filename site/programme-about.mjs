import {programmeBackgrounds} from './programme-backgrounds.mjs?v=20261124about';

const text=value=>typeof value==='string'?value.trim():'';
const unique=values=>[...new Set(values.filter(Boolean))];
function length(seconds){
 const minutes=Math.max(1,Math.round(seconds/60));
 return minutes<60?`${minutes} min`:`${Math.floor(minutes/60)}h${minutes%60?` ${minutes%60}m`:''}`;
}

export function programmeLanguage(title,episodes=[]){
 return programmeBackgrounds[title]?.language||unique(episodes.map(v=>text(v.audioLanguageLabel))).join(' / ');
}

// Presentation only: never fetch metadata or call a player from this component.
export function programmeAbout({title,kind,episodes=[],listing=null}){
 const background=programmeBackgrounds[title]||{},single=kind==='film'||(episodes.length===1&&episodes[0].kind==='short');
 // An episode synopsis is not a series synopsis. Only use it for a standalone work.
 const description=text(background.description)||text(listing?.description)||(single?text(episodes[0]?.synopsis):'');
 const years=unique(episodes.map(v=>Number.isInteger(v.year)&&v.year>0?v.year:null)).sort((a,b)=>a-b);
 const yearLabels=unique(episodes.map(v=>text(v.yearLabel)));
 const yearsLabel=years.length?(years[0]===years.at(-1)?String(years[0]):`${years[0]}–${years.at(-1)}`):yearLabels.length===1?yearLabels[0]:'';
 const durations=episodes.map(v=>Number(v.duration)).filter(n=>Number.isFinite(n)&&n>0);
 let runtime='';
 if(durations.length){const min=Math.min(...durations),max=Math.max(...durations);runtime=length(min)===length(max)?length(min):`${length(min)} – ${length(max)}`;}
 const language=programmeLanguage(title,episodes);
 const facts=[];
 if(yearsLabel)facts.push([single?'Year':'Available years',yearsLabel]);
 if(runtime)facts.push([single?'Runtime':'Programme length',runtime]);
 if(language)facts.push(['Language',language]);
 for(const [role,name]of background.credits||[])if(text(role)&&text(name))facts.push([role,name]);
 return {title,description,facts,note:text(background.note)};
}

export function createProgrammeAbout(doc,input){
 const data=programmeAbout(input);
 if(!data.description&&!data.facts.length)return null;
 const el=(tag,value='',className='')=>{const n=doc.createElement(tag);n.textContent=value;if(className)n.className=className;return n;};
 const section=el('section','','programme-about');section.setAttribute('aria-label',`About ${data.title}`);
 section.append(el('h4','About','programme-about-heading'));
 const copy=el('div','','programme-about-copy');
 if(data.description)copy.append(el('p',data.description,'programme-about-description'));
 if(data.note)copy.append(el('p',data.note,'programme-about-note'));
 if(copy.children.length)section.append(copy);
 else section.className+=' programme-about--facts-only';
 const facts=el('dl','','programme-about-facts');
 for(const [label,value]of data.facts){const pair=el('div','','programme-about-fact');pair.append(el('dt',label),el('dd',value));facts.append(pair);}
 if(data.facts.length)section.append(facts);
 return section;
}
