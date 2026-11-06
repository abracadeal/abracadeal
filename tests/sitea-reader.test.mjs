import assert from 'node:assert/strict';
import fs from 'node:fs';
import {siteaCatalogue,parseSitea,readSitea,siteaIdentity} from '../supabase/functions/pro-stock-sync/sitea-reader.ts';
import {cpuReset} from '../supabase/functions/pro-stock-sync/cpu-meter.ts';
const load=n=>fs.readFileSync(new URL('./fixtures/sitea/'+n,import.meta.url),'utf8');
const base='https://www.sitea-immo.com',sales=siteaCatalogue(load('sale-catalogue.js')),rentals=siteaCatalogue(load('rent-catalogue.js'));
assert.equal(sales.length,19);assert.equal(rentals.length,3);assert.equal(new Set([...sales,...rentals].map(r=>r.id)).size,22);
assert.match(sales[0].description,/tout à l'égout/);
assert.throws(()=>siteaCatalogue('var properties = [fetch("/private")];'),/non déclarative/);
assert.throws(()=>siteaCatalogue('var properties = [{"id":"x","lien":"x"},{"id":"x","lien":"x"}];'),/répétée/);
const aptUrl=base+'/vente-appartement-2pieces-toulouse-TAPP96724';
const apt=parseSitea(load('apartment.html'),aptUrl);
assert.equal(apt.reference,'TAPP96724');assert.match(apt.titre,/Appartement 2 pièces/);assert.equal(apt.prix,'104500');
assert.equal(apt.surface,38);assert.equal(apt.etage,3);assert.equal(apt.annee_construction,2016);assert.equal(apt.charges_annuelles,1022);assert.equal(apt.nombre_lots,94);
assert.equal(apt.dpe,'C');assert.equal(apt.ges,'C');assert.equal(apt.photos.split('|').length,5);
assert.equal(apt.code_postal,'');assert.equal(apt.ville,'Toulouse');assert.equal(apt._exact_source_city,'Toulouse');
assert.equal(apt.contact_telephone,'09 72 53 06 92');assert.equal(apt.contact_nom,'Cabinet Sitea Immobilier (agence)');
assert.ok(apt.description.includes('Chaudière remplacée en 2024'));assert.ok(apt.description.includes('Une place de stationnement'));
const rentUrl=base+'/location-appartement-2pieces-tournefeuille-GES02610075_454',rent=parseSitea(load('rental.html'),rentUrl);
assert.equal(rent.reference,'GES02610075-454');assert.equal(rent.prix,'615');assert.equal(rent.charges_mensuelles,65);assert.equal(rent.depot_garantie,550);assert.equal(rent.honoraires,'478.8 €');
const house=parseSitea(load('house.html'),base+'/vente-maison-6pieces-launac-TMAI90543');
assert.equal(house.surface,190);assert.equal(house.surface_terrain,2500);assert.equal(house.chambres,5);assert.match(house.description,/193 m²/);assert.equal(house.cout_energie_min,980);assert.equal(house.date_dpe,'01/06/2026');
const land=parseSitea(load('land.html'),base+'/vente-terrain-900m-mauvezin-TTER30350');assert.equal(land.prix,'55080');assert.equal(land.surface_terrain,900);assert.equal(land.surface,undefined);assert.equal(land.dpe,undefined);
const business=parseSitea(load('commercial.html'),base+'/location-local_commercial-320m-toulouse-LLOC27252');assert.equal(business.surface,320);assert.equal(business.prix,'3200');assert.equal(business.code_postal,'31200');assert.equal(business.dpe,undefined);
assert.throws(()=>parseSitea(load('apartment.html'),base+'/vente-appartement-2pieces-toulouse-TAPP99999'),/Référence/);
assert.notEqual(siteaIdentity({externalUrl:aptUrl,ref:'TAPP1'}),siteaIdentity({externalUrl:aptUrl,ref:'TAPP2'}));assert.equal(siteaIdentity({externalUrl:'https://example.org',ref:'TAPP1'}),null);
// Client-side pagination must not truncate a future catalogue to its first 50.
const ids=Array.from({length:55},(_,i)=>'TAPP'+i),items=ids.map(id=>({id,lien:'vente-appartement-2pieces-toulouse-'+id}));
const catalogue='var properties = '+JSON.stringify(items)+';',empty='var properties = [];';
let state,result,details=0;const memory={load:async()=>state,save:async s=>{state=structuredClone(s)}};
for(let pass=0;pass<7;pass++){cpuReset();result=await readSitea(new URL(base),async u=>{
 if(u.pathname==='/resultats')return {url:u,text:u.searchParams.get('transac')==='vente'?catalogue:empty};
 details++;const id=u.pathname.split('-').at(-1);return {url:u,text:load('apartment.html').replaceAll('TAPP96724',id)};
},memory);if(pass===0)assert.equal(result.partial,true);}
assert.equal(result.length,55);assert.equal(result.partial,false);assert.equal(result.total,55);assert.equal(details,55);assert.equal(result.stats.remaining,0);
console.log('Sitea: full JS data catalogue, >50 client pages, 7 resumable passes, exact refs/own prices/localities/facts/gallery/diagnostics/agency contact OK');
