import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readUltimateCar83, ultimateCarCatalogue, parseUltimateCar83 } from '../supabase/functions/pro-stock-sync/ultimatecar83-reader.ts';

const read = name => fs.readFileSync(new URL('./fixtures/ultimatecar83/' + name + '.html', import.meta.url), 'utf8');
const first = ultimateCarCatalogue(read('list'));
assert.equal(first.total, 21);
assert.equal(first.cards.length, 12);
assert.equal(ultimateCarCatalogue(read('list2')).cards.length, 9);
assert.equal(ultimateCarCatalogue(read('list2')).cards.some(card => card.available), false);
const [golf] = first.cards.filter(card => card.available);
const detail = parseUltimateCar83(read('detail'), golf);
assert.equal(detail.prix, 19900);
assert.equal(detail.kilometrage, 61294);
assert.equal(detail.annee, '2023');
assert.equal(detail.photos.length, 12);
assert.equal(detail.description, undefined);
assert.throws(() => parseUltimateCar83(read('detail'), {...golf, price: 333.82}), /incohérent/);
const fetch = async url => ({
  url, text: url.pathname === '/contact/' ? 'Draguignan <main>Draguignan <a href="tel:+33685395340">Appeler</a></main>' :
    read(url.pathname.startsWith('/vehicule/') ? 'detail' : url.search ? 'list2' : 'list'),
});
const rows = await readUltimateCar83(fetch, async url => url);
assert.equal(rows.length, 1);
assert.equal(rows.stats.pages, 2);
assert.equal(rows.stats.cycle_complete, true);
assert.equal(rows[0].contact_telephone, '0685395340');
assert.equal(rows[0].ville, 'Draguignan');
console.log('Ultimate Car 83: two pages, immediate used stock only, sale price, specifications and gallery');
