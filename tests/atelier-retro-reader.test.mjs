import assert from 'node:assert/strict';
import fs from 'node:fs';
import {atelierRetroCatalogue,parseAtelierRetro,readAtelierRetro,atelierRetroIdentity,atelierRetroUnavailable} from '../supabase/functions/pro-stock-sync/atelier-retro-reader.ts';
import {cpuReset} from '../supabase/functions/pro-stock-sync/cpu-meter.ts';
const html=fs.readFileSync(new URL('./fixtures/atelier-retro/catalogue.html',import.meta.url),'utf8');
const items=atelierRetroCatalogue(html),contact={phone:'+33687326527',city:'Béziers',postal:'34500'};
assert.equal(items.length,8);assert.equal(items.filter(atelierRetroUnavailable).length,1);
const byTitle=prefix=>items.find(i=>i.metaData.title.toLowerCase().startsWith(prefix));
const volvo=parseAtelierRetro(byTitle('volvo'),contact);assert.equal(volvo.prix,'6500');assert.equal(volvo.annee,'1999');assert.equal(volvo.boite,'automatique');assert.equal(volvo.kilometrage,undefined);assert.equal(volvo.carburant,undefined);assert.equal(volvo.puissance_din,'193');
const jeep=parseAtelierRetro(byTitle('jeep'),contact);assert.equal(jeep.prix,'39900');assert.equal(jeep.kilometrage,'62100');assert.equal(jeep.annee,'2020');assert.equal(jeep.carburant,'diesel');
const porsche=parseAtelierRetro(byTitle('porsche'),contact);assert.equal(porsche.prix,'64900');assert.equal(porsche.kilometrage,'192246');assert.equal(porsche.annee,'1985');
const peugeot=parseAtelierRetro(byTitle('peugeot'),contact);assert.equal(peugeot.prix,'65800');assert.equal(peugeot.annee,undefined);assert.equal(peugeot.kilometrage,undefined);
const jaguar=parseAtelierRetro(byTitle('jaguar'),contact);assert.equal(jaguar.prix,undefined);assert.equal(jaguar.description,'');assert.equal(jaguar.carburant,undefined);assert.equal(jaguar.annee,'2008');
const mercedes=parseAtelierRetro(byTitle('mercedes'),contact);assert.equal(mercedes.prix,undefined);assert.equal(mercedes.kilometrage,undefined);
const range=parseAtelierRetro(byTitle('range rover'),contact);assert.equal(range.prix,'13600');assert.equal(range.kilometrage,'139600');assert.equal(range.annee,'2016');assert.equal(range.mise_en_circulation,'05/2016');assert.equal(range.boite,'automatique');
assert.equal(parseAtelierRetro(byTitle('bientôt'),contact)._sold,1);
assert.equal(atelierRetroUnavailable({metaData:{title:'Véhicule neuf – 0 km'}}),true);
assert.equal(atelierRetroUnavailable({metaData:{title:'Voiture classique',description:'Distribution neuve et crémaillère neuve'}}),false);
for(const row of [volvo,jeep,porsche,peugeot,jaguar,range,mercedes]){assert.equal(row.photos.split('|').length,1);assert.equal(row.contact_telephone,'+33687326527');assert.equal(row.ville,'Béziers');assert.match(row.url,/#item-wrapper-/);}
const changed=html.replace('"totalItemsCount": 8','"totalItemsCount": 9');assert.throws(()=>atelierRetroCatalogue(changed),/partielle/);
assert.throws(()=>atelierRetroCatalogue(html.replace('"isSecure": false','"isSecure": true')),/accès public/);
assert.notEqual(atelierRetroIdentity({externalUrl:volvo.url,ref:volvo.reference}),atelierRetroIdentity({externalUrl:volvo.url,ref:jeep.reference}));assert.equal(atelierRetroIdentity({externalUrl:'https://example.org',ref:volvo.reference}),null);
let state,reads=0,result;const memory={load:async()=>state,save:async s=>{state=structuredClone(s)}};
for(let pass=0;pass<2;pass++){cpuReset();result=await readAtelierRetro(new URL('https://www.atelierautoretro.fr'),async url=>{reads++;assert.equal(url.pathname,'/a-vendre');assert.equal(url.hash,'');return {url,text:html};},memory);if(pass===0){assert.equal(result.length,4);assert.equal(result.partial,true);}}
assert.equal(reads,2);assert.equal(result.length,7);assert.equal(result.total,7);assert.equal(result.partial,false);assert.equal(result.stats.expected_total,8);assert.equal(result.stats.remaining,0);assert.equal(result.stats.failed.length,0);assert.equal(result.stats.cycle_complete,true);assert.equal(result.filter(r=>/corvette/i.test(r.titre)).length,0);
assert.equal(new Set(result.map(r=>r.photos)).size,7);

const updated=html.replace('JAGUAR XF - 2.7 D V6 PREMIUM LUXURY - 2008 - GARANTIE 12 MOIS','JAGUAR XF - 2.7 D V6 PREMIUM LUXURY - 2008 - GARANTIE 12 MOIS – 19 000 €');
cpuReset();const fresh=await readAtelierRetro(new URL('https://www.atelierautoretro.fr'),async url=>({url,text:updated}),memory);assert.equal(fresh.partial,true);assert.equal(fresh.length,4);
cpuReset();const finished=await readAtelierRetro(new URL('https://www.atelierautoretro.fr'),async url=>({url,text:updated}),memory);assert.equal(finished.partial,false);assert.equal(finished.find(r=>/^JAGUAR/.test(r.titre)).prix,'19000');
console.log('Atelier Auto Rétro: 8 public Wix items, 7 own vehicles, upcoming excluded, own photos/IDs/prices/km/year/contact, missing data not invented, 2-pass resume and partial-gallery guard OK');
