import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseApimoDetail,readApimoModules} from '../supabase/functions/pro-stock-sync/apimo-reader.ts';
const url='https://cannisimmo.com/fr/propriete/vente+appartement+cannes+cannes-limite-banane-2p-terrasse-garage+87522659';
const html=fs.readFileSync(new URL('./fixtures/cannisimmo-property-87522659.html',import.meta.url),'utf8');
const row=parseApimoDetail(html,url);
assert.equal(row.titre,'CANNES LIMITE BANANE 2P TERRASSE GARAGE');assert.equal(row.prix,'349000');
assert.equal(row.ville,'Cannes');assert.equal(row.code_postal,'06400');assert.equal(row.type_bien,'appartement');
assert.equal(row.surface,'44.45');assert.equal(row.pieces,'2');assert.equal(row.chambres,'1');assert.equal(row.salles_de_bain,'1');
assert.equal(row.dpe,'C');assert.equal(row.ges,'A');assert.equal(row.consommation_energie,'119');
assert.equal(row.photos.split('|').length,8);assert.equal(new Set(row.photos.split('|')).size,8);
assert.ok(row.description.startsWith('Emplacement privilégié'));assert.equal(row.contact_telephone,undefined);
// The mandate reference (1350) differs from the URL ID; only this listing's URL may supply its JSON-LD address.
const unrelated=html.replaceAll('"url": "https:\\/\\/cannisimmo.com\\/fr\\/propriete\\/vente+appartement+cannes+cannes-limite-banane-2p-terrasse-garage+87522659"','"url": "https://other.example/fr/other"');
assert.equal(parseApimoDetail(unrelated,url).code_postal,undefined);
const visited=[];
const rows=await readApimoModules(new URL('https://cannisimmo.com/fr/'),'<a href="/fr/ventes">Vente</a>',async u=>{
 visited.push(u.toString());
 return {url:u,text:u.pathname.includes('/propriete/')?html:`<div data-module-id="1" class="module-listing"><a href="${new URL(url).pathname}">Bien</a>${u.search?'':'<a href="/fr/ventes?page=2">Suivant</a>'}</div>`};
});
assert.equal(rows.length,1);assert.equal(rows.partial,false);assert.equal(rows.stats.pages,2);assert.ok(visited.some(x=>x.endsWith('?page=2')));
console.log('Cannisimmo: template 19, h3 title, matching listing JSON-LD, diagnostics, gallery and pagination OK');
