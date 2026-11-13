import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parsePointImmo, pointImmoAvailable } from '../supabase/functions/pro-stock-sync/pointimmo-reader.ts';
const source = id => fs.readFileSync(new URL('./fixtures/pointimmo/' + id + '.html', import.meta.url), 'utf8');
const card = {objectKey: 636, url: 'appartement-t3bis-renove-a-5mins-a-pied-du-pont-neuf-et-des-commerces',
  price: 125000, ref: '357', name: 'Appartement T3bis', status: 1, availability: 1, exist: 1,
  typeTransaction: 0, typeEstate: '1136'};
const url = 'https://www.pointimmo-pasturel.com/fr/' + card.url;
assert.equal(pointImmoAvailable(card), true);
assert.equal(pointImmoAvailable({...card, name: 'VENDU - Appartement'}), false);
assert.equal(pointImmoAvailable({...card, sous_offre: 1}), false);
assert.equal(pointImmoAvailable({...card, typeEstate: '3000'}), false);
const listing = parsePointImmo(source(636), url, card);
assert.equal(listing.prix, 125000);
assert.equal(listing.mandat, '357');
assert.equal(listing.ville, 'Albi');
assert.deepEqual([listing.dpe, listing.ges], ['D', 'B']);
assert.equal(listing.contact_telephone, '0563380404');
assert.equal(listing.photos.split('|').length, 8);
const missing = {...card, objectKey: 38, url: 'appartement-t2-quarier-madeleine', ref: '', price: 160000};
const noCity = parsePointImmo(source(38), 'https://www.pointimmo-pasturel.com/fr/' + missing.url, missing);
assert.equal(noCity.ville, undefined);
assert.equal(noCity._keep_missing_city, true);
assert.throws(() => parsePointImmo(source(636), url, {...card, price: 1}), /incohérent/);
console.log('Point Immo: scope, sold and programme filters, gallery, diagnostics, own contact and absent city');
