// Group by stable channel keys, never by display order or channel number.
export const CHANNEL_SECTIONS = [
  {name:'The good stuff',note:'A little of everything',keys:['music']},
  {name:'Kids & cartoons',note:'Home before the streetlights',keys:['trailers','kids','late']},
  {name:'Comedy & late night',note:'One more before bed',keys:['sitcom','rewind-after-dark']},
  {name:'Sci-fi & forgotten TV',note:'Somewhere a little stranger',keys:['kids-telly','lost-and-found']},
  {name:'At the movies',note:'Make a night of it',keys:['andromeda','midnight-movies']},
  {name:'Real life & competition',note:'Answers on the back of a postcard',keys:['rewind-gameshows','bean','adverts','aliens']},
  {name:'Internet & music',note:'Before the algorithm',keys:['cinema','rewind-music']},
  {name:'Seasonal specials',note:'Every day can be the occasion',keys:['rewind-specials','halloween-horror','christmas-tv']},
  {name:'World TV',note:'Another way to rewind',keys:['rewind-espanol','rewind-mandarin','rewind-francais']}
];
export function sectionChannels(channels){
 const assigned=new Set();
 const sections=CHANNEL_SECTIONS.map(section=>({...section,channels:section.keys.flatMap(key=>channels.flatMap((channel,index)=>{if(channel.key!==key||assigned.has(index))return [];assigned.add(index);return [{channel,index}];}))})).filter(section=>section.channels.length);
 const rest=channels.flatMap((channel,index)=>assigned.has(index)?[]:[{channel,index}]);
 if(rest.length)sections.push({name:'More to discover',note:'Keep turning the dial',channels:rest});
 return sections;
}
