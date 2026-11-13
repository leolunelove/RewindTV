import {isBrowsable,normalise} from './show-library.mjs?v=20261113region';
const themes={
 Comedy:['His Girl Friday','Three Husbands','The Admiral Was a Lady','Champagne for Caesar','Super Fuzz','Ghosts on the Loose','The Little Shop of Horrors','A Bucket of Blood','My Man Godfrey','Topper Returns','Royal Wedding'],
 Horror:['Night of the Living Dead','The Phantom of the Opera','Carnival of Souls','Nomads','The Monster of Piedras Blancas','Primal Rage','Planet of the Vampires','Trilogy of Terror','The Innocents','House on Haunted Hill','Dementia 13','The Last Man on Earth','Chopping Mall','The Stuff','House','Dog Soldiers','Warlock','The Terror','The Killer Shrews','The Giant Gila Monster','The Amazing Mr. X',"The Brain That Wouldn't Die",'Nosferatu'],
 'Sci-fi':['The Phantom from 10,000 Leagues','Phantom from Space','Voyage to the Prehistoric Planet','Gorgo','The Brain Eaters','Teenagers from Outer Space','Killers from Space','The Phantom Planet','Last Woman on Earth','Battle Beyond the Stars','Class of 1999','The Man from Earth'],
 Crime:['The Fatal Hour','New York Confidential','Western Pacific Agent','Tomorrow at Ten','Sleuth','British Intelligence','The Door with Seven Locks','The Most Dangerous Game','Detour','D.O.A.','The Hitch Hiker','Shock','Suddenly','The Stranger','The Big Combo','Kansas City Confidential','Scarlet Street'],
 Adventure:['Lionheart','The Jesus Trip','The Dragon Strikes Back','Manaos','Five Savage Men','The Black 6','Charade','The Snows of Kilimanjaro','Four Fast Guns','And God Said to Cain'],
 Drama:['Black Joy','The Beatniks','Trouble in the Sky','Our Town','Never Fear','Lady Cocoa','Miss Julie','The Last Time I Saw Paris','Penny Serenade','The Big Lift']
};
const genreByTitle=new Map(Object.entries(themes).flatMap(([genre,titles])=>titles.map(t=>[normalise(t),genre])));
export function filmIdentity(v){return `${normalise(v.title)}:${v.year||''}:${v.audioLanguage||'en'}`;}
export function buildMovieLibrary(catalogue){
 const unique=new Map();for(const c of catalogue.channels)for(const v of c.videos){if(v.kind!=='film'||!isBrowsable(v))continue;const key=filmIdentity(v);if(!unique.has(key))unique.set(key,{...v,channelKey:c.key,genre:v.genre||genreByTitle.get(normalise(v.title))||'World cinema'});}
 return [...unique.values()].sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'}));
}
export function filterMovies(films,{query='',genre='all'}={}){const q=normalise(query);return films.filter(v=>(genre==='all'||v.genre===genre)&&(!q||normalise([v.title,v.year,v.genre,v.audioLanguageLabel].join(' ')).includes(q)));}
export function pickMovie(films,recent=[],random=Math.random){if(!films.length)return null;const fresh=films.filter(v=>!recent.includes(filmIdentity(v))),pool=fresh.length?fresh:films;return pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))];}
export function createMovieReel(films,winner,random=Math.random){if(!winner||!films.length)return {items:[],landing:0};const items=Array.from({length:34},()=>films[Math.min(films.length-1,Math.floor(random()*films.length))]);const landing=28;items[landing]=winner;return {items,landing};}
export function movieArtwork(v){if(v.provider==='archive'){try{const id=new URL(v.watchUrl).pathname.split('/details/')[1]?.split('/')[0];if(id)return 'https://archive.org/services/img/'+encodeURIComponent(id);}catch{}return '';}
 return /^[A-Za-z0-9_-]{11}$/.test(v.id)?`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`:'';}
