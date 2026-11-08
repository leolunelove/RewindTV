// Rank identities rather than shuffling the current result array: filtering and
// returning to the Library therefore keep the same relative discovery order.
function hash(value) {
  let result=2166136261;
  for(const character of value)result=Math.imul(result^character.codePointAt(0),16777619);
  result^=result>>>16;result=Math.imul(result,2246822507);
  result^=result>>>13;result=Math.imul(result,3266489909);
  return (result^(result>>>16))>>>0;
}

export function createLibrarySeed(previous='') {
  return `${hash(`${previous}\0${Date.now()}\0${Math.random()}`).toString(36)}-${previous.slice(-12)}`;
}

export function orderLibrary(items,{mode='mix',seed='rewind',key=item=>item.key||item.id,title=item=>item.title||''}={}) {
  const unique=new Map();
  for(const item of items) {
    const identity=String(key(item)||'');
    if(identity&&!unique.has(identity))unique.set(identity,item);
  }
  const rows=[...unique].map(([identity,item])=>({identity,item,rank:hash(`${seed}\0${identity}`)}));
  rows.sort((a,b)=>mode==='az'
    ?String(title(a.item)).localeCompare(String(title(b.item)),'en',{numeric:true,sensitivity:'base'})||a.identity.localeCompare(b.identity)
    :a.rank-b.rank||a.identity.localeCompare(b.identity));
  return rows.map(row=>row.item);
}
