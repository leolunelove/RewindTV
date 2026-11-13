// Country declarations are source metadata, not a guarantee of playback.
// A browser's language is deliberately never used as its viewing country.
export const COUNTRY_CODES=Object.freeze('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));
const countries=new Set(COUNTRY_CODES);
export function normalizeCountry(value){
 const code=typeof value==='string'?value.trim().toUpperCase():'';
 return countries.has(code)?code:null;
}
export function countryName(country,locale='en'){
 const code=normalizeCountry(country);if(!code)return '';
 try{return new Intl.DisplayNames([locale],{type:'region'}).of(code)||code;}catch{return code;}
}
export function regionEligibility(video,country=video?.viewerCountry){
 const restriction=video?.regionRestriction||video?.contentDetails?.regionRestriction;
 if(!restriction)return {eligible:true,reason:'no-declared-restriction'};
 const hasAllowed=Object.hasOwn(restriction,'allowed');
 const allowed=Array.isArray(restriction.allowed)?restriction.allowed.map(normalizeCountry).filter(Boolean):[];
 const blocked=Array.isArray(restriction.blocked)?restriction.blocked.map(normalizeCountry).filter(Boolean):[];
 if(hasAllowed&&!allowed.length)return {eligible:false,reason:'empty-or-invalid-allow-list'};
 if(!hasAllowed&&!blocked.length)return {eligible:true,reason:'no-declared-restriction'};
 const code=normalizeCountry(country);
 // If lookup is unavailable, let the existing bounded player recovery try.
 if(!code)return {eligible:true,reason:'country-unknown'};
 if(blocked.includes(code))return {eligible:false,reason:'country-blocked'};
 if(hasAllowed&&!allowed.includes(code))return {eligible:false,reason:'country-not-allowed'};
 return {eligible:true,reason:'country-allowed'};
}
export function isRegionEligible(video,country=video?.viewerCountry){return regionEligibility(video,country).eligible;}
export function catalogueForCountry(catalogue,country){
 const code=normalizeCountry(country);
 const eligible=video=>isRegionEligible(video,code);
 const prepare=video=>video.regionRestriction||video.contentDetails?.regionRestriction?{...video,viewerCountry:code}:video;
 return {...catalogue,viewerCountry:code,channels:catalogue.channels.map(channel=>({...channel,videos:channel.videos.filter(eligible).map(prepare)})),adverts:(catalogue.adverts||[]).filter(eligible).map(prepare)};
}
export const REGION_STORAGE_KEY='rewind-viewing-country-v1';
export const REGION_CACHE_KEY='rewind-detected-country-v1';
export function readCountryOverride(storage){
 try{return normalizeCountry(storage?.getItem(REGION_STORAGE_KEY));}catch{return null;}
}
export function saveCountryOverride(storage,country){
 const code=normalizeCountry(country);
 try{if(code)storage?.setItem(REGION_STORAGE_KEY,code);else storage?.removeItem(REGION_STORAGE_KEY);}catch{}
 return code;
}
export function cachedCountry(storage,now=Date.now()){
 try{const value=JSON.parse(storage?.getItem(REGION_CACHE_KEY)||'null');return value&&Number.isFinite(value.checkedAt)&&now>=value.checkedAt&&now-value.checkedAt<86400000?normalizeCountry(value.country):null;}catch{return null;}
}
export async function resolveViewingCountry({storage,fetcher=globalThis.fetch,now=Date.now(),timeoutMs=1000}={}){
 const manual=readCountryOverride(storage);if(manual)return {country:manual,source:'manual'};
 const cached=cachedCountry(storage,now);if(cached)return {country:cached,source:'cached'};
 if(typeof fetcher!=='function')return {country:null,source:'unknown'};
 const controller=new AbortController();let timer;
 try{
  const lookup=(async()=>{const response=await fetcher('https://api.country.is/',{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});if(!response.ok)return null;const data=await response.json();return normalizeCountry(data?.country);})();
  const timeout=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(null);},Math.max(0,Math.min(1000,timeoutMs)));});
  const country=await Promise.race([lookup,timeout]);
  if(!country)return {country:null,source:'unknown'};
  // Persist only the country and its cache age. Never retain the IP response.
  try{storage?.setItem(REGION_CACHE_KEY,JSON.stringify({country,checkedAt:now}));}catch{}
  return {country,source:'detected'};
 }catch{return {country:null,source:'unknown'};}
 finally{clearTimeout(timer);}
}
export function browserAudioLanguages(languages=[]){
 // Content preferences only. "en-US" says nothing about physical location.
 return [...new Set((Array.isArray(languages)?languages:[]).filter(value=>typeof value==='string').map(value=>value.toLowerCase().split('-')[0]).filter(value=>/^[a-z]{2,3}$/.test(value)))];
}
