import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseApimoDetail} from '../supabase/functions/pro-stock-sync/apimo-reader.ts';
const raw=fs.readFileSync(new URL('./fixtures/raccosta-property-87541940.html',import.meta.url),'utf8');
const row=parseApimoDetail(raw,'https://raccosta.com/fr/propriete/vente+appartement+menton+rue-pietonne-4-pieces-avec-ascenseur+87541940');
assert.equal(row.type_bien,'appartement');assert.equal(row.prix,'540000');assert.equal(row.surface,'86.5');assert.equal(row.pieces,'4');assert.equal(row.chambres,'3');assert.equal(row.photos.split('|').length,15);assert.equal(row.contact_nom,'Fabrice RACCOSTA');
// Both diagnostics explicitly say “En cours”: no letter is invented.
assert.equal(row.dpe,undefined);assert.equal(row.ges,undefined);
console.log('Raccosta: route type, original gallery, multiline facts and pending diagnostics OK');
