(function(scope){'use strict';
  function order(videos,recent={},random=Math.random){
    const unique=[...new Map(videos.filter(v=>v.enabled!==false).map(v=>[v.id,v])).values()];
    const fresh=unique.filter(v=>!recent[v.id]),seen=unique.filter(v=>recent[v.id]);
    for(let i=fresh.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[fresh[i],fresh[j]]=[fresh[j],fresh[i]];}
    seen.sort((a,b)=>recent[a.id]-recent[b.id]);
    // Rotate show collections, so large series cannot swamp shorter ones.
    const pools=new Map();for(const v of fresh){const key=v.series||v.id;if(!pools.has(key))pools.set(key,[]);pools.get(key).push(v);}
    const mixed=[];let last='';
    while(pools.size){let keys=[...pools.keys()];for(let i=keys.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}
      if(keys.length>1&&keys[0]===last)[keys[0],keys[1]]=[keys[1],keys[0]];
      for(const key of keys){const pool=pools.get(key);mixed.push(pool.shift());last=key;if(!pool.length)pools.delete(key);}
    }
    return mixed.concat(seen);
  }
  function rows(videos,recent,now=Date.now(),random=Math.random,options={}){
    let at=now,deck=[],lastAd=options.lastAd||'';const result=[],programmes=order(videos,recent,random),ads=(options.ads||[]).filter(v=>v.enabled!==false&&v.family&&v.kind==='advert');
    function append(video,advert=false){const start=at;at+=video.duration*1000;result.push({video,start,end:at,advert});}
    programmes.forEach((video,index)=>{append(video);if(video.kind==='full episode'&&index<programmes.length-1&&ads.length){if(!deck.length){deck=order(ads,{},random);if(deck.length>1&&deck[0].id===lastAd)[deck[0],deck[1]]=[deck[1],deck[0]];}const ad=deck.shift();append(ad,true);lastAd=ad.id;}});return result;
  }
  const api={order,rows};if(typeof module==='object'&&module.exports)module.exports=api;else scope.RewindShuffle=api;
})(typeof globalThis!=='undefined'?globalThis:this);
