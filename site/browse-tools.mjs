import {normalise} from './show-library.mjs?v=20261112';

export function browseTitles(shows,{query='',kind='all',letter='all',channel='all',language='all'}={}) {
  const q=normalise(query);
  return shows.filter(show=>{
    const title=normalise(show.title);
    const programmes=kind==='programmes';
    const typeMatches=kind==='all'||(programmes?show.kind!=='film'&&show.episodes?.length>0:kind==='listed'?!show.episodes?.length:show.kind===kind);
    const queryMatches=!q||title.includes(q)||(programmes&&(title.replaceAll(' ','').includes(q.replaceAll(' ',''))||title.split(' ').map(word=>word[0]).join('')===q));
    return typeMatches&&queryMatches&&
      (channel==='all'||show.channels?.some(item=>item.key===channel)||show.listing?.channelKey===channel)&&
      (language==='all'||(show.language||'English')===language)&&
      (letter==='all'||(letter==='#'?/^\d/.test(show.title):letter==='other'?!/^[a-z0-9]/i.test(title):title.startsWith(letter.toLowerCase())));
  });
}

export function pageSlice(items,page=0,size=8) {
  const pages=Math.max(1,Math.ceil(items.length/size));
  const index=Math.max(0,Math.min(pages-1,page));
  return {items:items.slice(index*size,(index+1)*size),page:index,pages,total:items.length};
}
