import {test} from 'node:test';
import assert from 'node:assert/strict';
import {programmeAbout} from '../site/programme-about.mjs';

test('About describes a show, not the plot of its first available episode',()=>{
 const result=programmeAbout({title:'Net Cafe',kind:'show',episodes:[{year:1997,duration:1603,audioLanguageLabel:'English',synopsis:'Only the first episode plot'},{year:2000,duration:1659,audioLanguageLabel:'English'}]});
 assert.match(result.description,/early internet/);assert(!result.description.includes('Only the first'));
 assert.deepEqual(result.facts,[['Available years','1997–2000'],['Programme length','27 min – 28 min'],['Language','English'],['Creator','Stewart Cheifet']]);
});
test('film facts retain original language, runtime and proper creator roles',()=>{
 const result=programmeAbout({title:'Nasty Old People',kind:'film',episodes:[{year:2009,duration:5065,audioLanguageLabel:'Swedish'}]});
 assert.match(result.description,/neo-Nazi/);assert(result.facts.some(([k,v])=>k==='Runtime'&&v==='1h 24m'));assert(result.facts.some(([k,v])=>k==='Director'&&v==='Hanna Sköld'));assert.match(result.note,/not been verified/);
});
test('missing metadata never invents English audio, a creator or a series synopsis',()=>{
 const result=programmeAbout({title:'Unresearched show',kind:'show',episodes:[{duration:1200,credit:'An uploader',synopsis:'Episode-specific plot'}]});
 assert.equal(result.description,'');assert.deepEqual(result.facts,[['Programme length','20 min']]);
 assert.equal(programmeAbout({title:'Unresearched film',kind:'film',episodes:[{synopsis:'Known film plot'}]}).description,'Known film plot');
});
test('dialogue-free films and standalone shorts are labelled accurately',()=>{
 const result=programmeAbout({title:'Big Buck Bunny',kind:'collection',episodes:[{kind:'short',year:2008,duration:597,audioLanguageLabel:'English'}]});
 assert(result.facts.some(([k,v])=>k==='Language'&&v==='No dialogue'));assert(result.facts.some(([k,v])=>k==='Runtime'&&v==='10 min'));assert(!result.facts.some(([k])=>k==='Programme length'));
});
