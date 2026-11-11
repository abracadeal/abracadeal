import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nextlogisCatalogue, parseNextlogis, nextlogisEnergy} from '../supabase/functions/pro-stock-sync/nextlogis-reader.ts';

const fixture = name => fs.readFileSync(new URL('./fixtures/nextlogis/'+name, import.meta.url), 'utf8');
const list = nextlogisCatalogue(fixture('list.html'), new URL('https://www.nextlogis.fr/'));
assert.equal(list.count, 20);
assert.equal(list.details.length, 20);
assert.equal(list.lists.length, 0);
assert(list.details.every(url => !new URL(url).search && !new URL(url).hash));
const row = id => parseNextlogis(fixture(id+'.html'), list.details.find(url => url.endsWith('-'+id+'.html')));
const house = row(157);
assert.equal(house.prix, 160000);
assert.equal(house.surface, 91.66);
assert.equal(house.pieces, 5);
assert.equal(house.chambres, 4);
assert.equal(house.mandat, '763');
assert.equal(house.contact_telephone, '0468331154');
assert.equal(house.photos.split('|').length, 8);
assert.equal(house.consommation_energie, 264);
assert.equal(house.emission_ges, 13);
assert.doesNotMatch(house.photos, /dpe|thumb/);
assert.equal(row(50).surface_terrain, 6779);
assert.equal(row(50).contact_nom, 'Mickael PEYRON');
assert.equal(row(50).contact_telephone, '0601999470');
assert.equal(row(104).contact_nom, 'Anais RIVAL');
assert.equal(row(104).contact_telephone, '0686930671');
assert.equal(row(53).type_bien, 'Fonds de commerce');
assert.match(row(53).description, /Vendu entièrement équipé/);
assert.equal(row(123).prix, 277000);
assert.match(row(123).description, /287 000/);
assert.throws(() => parseNextlogis(fixture('157.html'), list.details[0]), /Identité/);
const labels = JSON.parse(fixture('labels.json'));
for (const [key, dpe, ges] of [['ec','E','C'],['aa','A','A'],['f','F',undefined],['empty',undefined,undefined]]) {
  assert.deepEqual(nextlogisEnergy(Buffer.from(labels[key], 'base64')), {dpe, ges});
}
console.log('Nextlogis: 20 scoped links, own prices and facts, explicit advisors, own gallery, graphic classes and empty scale');
