import test from 'node:test';
import assert from 'node:assert/strict';
import { withReaderFallback, parseHtmlDetail, readSecondarySite } from '../supabase/functions/pro-stock-sync/reader-fallback.ts';

const fixture = `<html><head><meta property="og:type" content="product"><meta property="og:title" content="Renault Clio occasion"><meta property="product:price:amount" content="12000"><meta property="product:price:currency" content="EUR"><meta property="og:image" content="/photo.jpg"></head><body><h1 itemprop="name">Renault Clio</h1><span itemprop="sku">CAR42</span><span itemprop="addressLocality">Cannes</span></body></html>`;
const row = { reference: '42', titre: 'Clio' };

test('principal successful: secondary is never called', async () => {
  const rows = await withReaderFallback(async () => [row], async () => { throw Error('must not run'); });
  assert.equal(rows.reader_used, 'primary');
  assert.equal(rows.partial, undefined);
});
test('principal error, empty stock or unusable rows trigger exactly one secondary read', async () => {
  for (const primary of [async () => { throw Error('private upstream url'); }, async () => [], async () => [{ reference: 'broken' }]]) {
    let calls = 0;
    const rows = await withReaderFallback(primary, async () => { calls++; return [row]; });
    assert.equal(calls, 1); assert.equal(rows.reader_used, 'secondary'); assert.equal(rows.partial, true);
    assert.ok(!rows.fallback_reason.includes('private'));
  }
});
test('both failures stop the import instead of returning an empty authoritative stock', async () => {
  await assert.rejects(withReaderFallback(async () => [], async () => []));
  await assert.rejects(withReaderFallback(async () => [], async () => { throw Error('unreadable'); }));
});
test('HTML detail extracts explicit values with stable reference', () => {
  const r = parseHtmlDetail(fixture, 'https://garage.test/occasion/clio', 'vehicules');
  assert.equal(r.reference, 'CAR42'); assert.equal(r.prix, '12000');
  assert.equal(r.photos, 'https://garage.test/photo.jpg'); assert.equal(r.ville, 'Cannes');
});
test('catalogue, sold, invalid currency, missing price and non-HTTP image are rejected', () => {
  for (const html of [fixture.replace('content="product"', 'content="website"'),
    fixture.replace('</head>', '<meta itemprop="availability" content="OutOfStock"></head>'),
    fixture.replace('content="EUR"', 'content="USD"'), fixture.replace('content="12000"', 'content=""'),
    fixture.replace('/photo.jpg', 'javascript:alert(1)')]) {
    assert.equal(parseHtmlDetail(html, 'https://garage.test/occasion/clio', 'vehicules'), null);
  }
});
test('real estate requires an explicit sale/rental decision', () => {
  const immo = fixture.replaceAll('Renault Clio occasion', 'Appartement 3 pièces').replaceAll('Renault Clio', 'Appartement');
  assert.equal(parseHtmlDetail(immo, 'https://agency.test/annonce/42', 'immobilier'), null);
  const r = parseHtmlDetail(immo, 'https://agency.test/vente/42', 'immobilier');
  assert.equal(r.transaction, 'vente'); assert.equal(r.type_bien, 'appartement');
});
test('HTML-looking strings in scripts are never treated as actual listing metadata', () => {
  assert.equal(parseHtmlDetail('<script>' + JSON.stringify(fixture) + '</script>', 'https://garage.test/42', 'vehicules'), null);
});
test('agency scope excludes other agencies and redirected detail pages', async () => {
  const calls = [];
  await assert.rejects(readSecondarySite({ url: new URL('https://network.test/my-agency/'),
    html: '<a href="/other-agency/annonce/1">Other agency</a><a href="/my-agency/annonce/42">Our car</a>',
    sector: 'vehicules', scopePath: '/my-agency/', candidates: async () => [], parseStructured: () => null,
    fetchHtml: async url => { calls.push(url.pathname); return { text: fixture, url: new URL('https://network.test/other-agency/annonce/1') }; } }));
  assert.deepEqual(calls, ['/my-agency/annonce/42']);
});
test('secondary follows same-origin links, tolerates failed pages and deduplicates', async () => {
  const fetched = [];
  const rows = await readSecondarySite({ url: new URL('https://garage.test/'), html: '<a href="/occasion/42">Stock</a>', sector: 'vehicules',
    candidates: async () => ['https://other.test/occasion/evil', 'https://garage.test/broken'],
    fetchHtml: async url => { fetched.push(url.toString()); if (url.pathname === '/broken') throw Error('offline'); return { text: fixture, url }; },
    parseStructured: () => null });
  assert.equal(rows.length, 1); assert.equal(rows.partial, true);
  assert.ok(fetched.includes('https://garage.test/occasion/42'));
  assert.ok(!fetched.some(url => url.includes('other.test')));
});

