import assert from 'node:assert/strict';import fs from 'node:fs';import {parseApimoDetail,readApimoModules} from '../supabase/functions/pro-stock-sync/apimo-reader.ts';
const raw=fs.readFileSync(new URL('./fixtures/select-azur-property-85564762.html',import.meta.url),'utf8'),url='https://select-azur-immobilier.com/fr/propriete/vente+appartement+nice+nice-centre-ville-grand-3-4-pieces+85564762';const r=parseApimoDetail(raw,url);
assert.equal(r.ville,'Nice');assert.equal(r.code_postal,'06000');assert.equal(r.prix,'280000');assert.equal(r.type_bien,'appartement');assert.equal(r.surface,'88.00');assert.equal(r.pieces,'3');assert.equal(r.chambres,'2');assert.equal(r.salles_de_bain,'1');assert.equal(r.photos.split('|').length,5);assert.equal(r.contact_nom,'Andrea BELMESSIERI');assert.equal(r.dpe,'D');assert.equal(r.ges,'D');assert.equal(r.consommation_energie,'233');assert.ok(r.description.includes('DPE E ; GES D'));assert.equal(r.honoraires,'Honoraires à la charge du vendeur');
const failure=await readApimoModules(new URL('https://select-azur-immobilier.com/'),'<a href="/fr/ventes">Vente</a>',async u=>({url:u,text:u.pathname.includes('/propriete/')?'<h1>template inconnu</h1>':`<div data-module-id="1" class="module-listing"><a href="${url}">Bien</a></div>`}));assert.equal(failure.partial,true);assert.equal(failure.length,1);assert.equal(failure[0].reference,'85564762');
console.log('Select Azur: templates 41/42, labelled numeric facts, own advisor/price/gallery, graphic DPE vs stale text and explicit partial parse failure OK');

// Notations réelles de cinq fiches Select Azur : seconde classe publiée sur la même ligne.
const withDescription=(description,graphics=false)=>{let h=raw.replace(/(<p\b[^>]*class="description"[^>]*>)[\s\S]*?(<\/p>)/i,(_,a,b)=>a+description+b);if(!graphics)h=h.replace(/data:image\/svg\+xml;base64,[^"']+/g,'');return parseApimoDetail(h,url);};
for(const [description,dpe,ges,consumption] of [
 ['DPE : D / B.','D','B',undefined],
 ['DPE D ET D','D','D',undefined],
 ['DPE D (240) et D (45)','D','D','240'],
 ['DPE D (199 )et D (44)','D','D','199'],
 ['DPE D ET C','D','C',undefined],
]){const row=withDescription('Description propre au bien.<br>'+description);assert.equal(row.dpe,dpe);assert.equal(row.ges,ges);assert.equal(row.consommation_energie,consumption);}
for(const description of ['Classé DPE C','DPE de A à G','DPE D et C selon les logements','Deux appartements : DPE D et C','DPE d et c','DPE D / B / C']){const row=withDescription(description);assert.equal(row.ges,undefined,description);}
const graphicPriority=withDescription('DPE E ET C',true);assert.equal(graphicPriority.dpe,'D');assert.equal(graphicPriority.ges,'D');assert.equal(graphicPriority.consommation_energie,'233');
console.log('Select Azur: five published paired diagnostics, absent/ambiguous classes left empty and graph priority OK');
