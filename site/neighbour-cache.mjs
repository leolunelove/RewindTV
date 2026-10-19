/* Owns only the two inactive neighbours. The visible player lives in app.js. */
export class NeighbourCache {
  constructor(dispose){this.slots=new Map();this.dispose=dispose;}
  remove(key){const slot=this.slots.get(key);if(!slot)return;this.slots.delete(key);this.dispose(slot);}
  clear(){for(const key of [...this.slots.keys()])this.remove(key);}
  reconcile(selections,create){
    const wanted=new Map(selections.slice(0,2).map(s=>[s.key,s]));
    for(const [key,slot] of this.slots)if(!wanted.has(key)||slot.videoId!==wanted.get(key).video.id)this.remove(key);
    for(const [key,s] of wanted)if(!this.slots.has(key))this.slots.set(key,create(s));
  }
  take(key){const slot=this.slots.get(key);if(!slot?.ready)return null;this.slots.delete(key);return slot;}
  park(key,slot){this.remove(key);while(this.slots.size>=2)this.remove(this.slots.keys().next().value);this.slots.set(key,slot);}
}
