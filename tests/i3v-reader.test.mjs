import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readI3v,parseI3v,i3vLinks,i3vIdentity} from '../supabase/functions/pro-stock-sync/i3v-reader.ts';
import {cpuReset} from '../supabase/functions/pro-stock-sync/cpu-meter.ts';
const load=n=>fs.readFileSync(new URL('./fixtures/i3v/'+n+'.html',import.meta.url),'utf8');
// Pure parsing/resume tests do not download diagnostics. Energy image decoding
// has its own pixel tests; production must still validate the actual classes.
const offline=s=>s.replace(/<img\b[^>]*outil\.adaptimmo[^>]*>/g,'');
const base='http://www.coteimmobilier.net/fr/detail.htm?cle=';
const apt=await parseI3v(offline(load('910166694')),base+'910166694&monnaie=2');
assert.equal(apt.prix,'137000.00');assert.equal(apt.surface,29);assert.equal(apt.pieces,1);assert.equal(apt.chambres,undefined);assert.equal(apt.ville,'Ollainville');assert.equal(apt.code_postal,'91340');assert.equal(apt.charges_annuelles,1050);assert.equal(apt.nombre_lots,46);assert.match(apt.description,/29.82 m²/);assert.equal(apt.photos.split('|').length,10);assert.equal(apt.contact_telephone,'01 64 58 57 00');assert.match(apt.contact_nom,/3 VALLEES/);
const direct=await parseI3v(offline(load('910165568')),base+'910165568&monnaie=2');assert.equal(direct.contact_telephone,'06 73 73 86 85');assert.equal(direct.contact_nom,'');
const workshop=await parseI3v(offline(load('910166760')),base+'910166760&monnaie=2');assert.equal(workshop.surface,100);assert.equal(workshop.surface_terrain,395);assert.equal(workshop.pieces,undefined);
await assert.rejects(()=>parseI3v(load('910166694'),base+'910166760&monnaie=2'),/Identité/);
assert.throws(()=>i3vLinks('<div>1 bien(s) trouvé(s)</div><a href="http://www.coteimmobilier.net/fr/detail.htm?cle=910126694">X</a>'),/hors agence/);
assert.equal(i3vIdentity({externalUrl:base+'910166694',ref:'910166694'}),'i3v|910166694');assert.equal(i3vIdentity({externalUrl:'https://example.org',ref:'910166694'}),null);
let state,reads=0,result;const mem={load:async()=>state,save:async s=>{state=structuredClone(s)}};
const get=async u=>{if(u.hostname==='i3v.coteimmobilier.net')return {url:u,text:load(u.searchParams.get('ope')==='2'?'rent':u.searchParams.get('page')==='2'?'list2':'list')};reads++;return {url:u,text:offline(load('910166694')).replaceAll('910166694',u.searchParams.get('cle'))};};
for(let i=0;i<4;i++){cpuReset();result=await readI3v(new URL('http://i3v.coteimmobilier.net'),get,mem);if(i===0)assert.equal(result.partial,true);}
assert.equal(result.length,13);assert.equal(result.partial,false);assert.equal(result.total,13);assert.equal(result.stats.sale_total,13);assert.equal(result.stats.rental_total,0);assert.equal(reads,13);assert.equal(new Set(result.map(r=>r.reference)).size,13);
cpuReset();await assert.rejects(()=>readI3v(new URL('http://i3v.coteimmobilier.net'),async u=>({url:u,text:load('list').replace('13 bien','14 bien')})),/incomplète/);
console.log('I3V: scope, pagination, count, contact, source facts, photos, identity and resume passed');
