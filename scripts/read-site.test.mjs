import test from 'node:test';
import assert from 'node:assert/strict';
import { readSite } from './read-site.mjs';

test('URL preview calls only the existing reader and returns partial flags', async () => {
  const result = await readSite(['url', 'https://example.com', 'immobilier'],
    { ABRACADEAL_ACCESS_TOKEN: 'test-session' }, async (url, options) => {
      assert.equal(new URL(url).pathname, '/functions/v1/pro-stock-sync');
      assert.equal(options.headers.Authorization, 'Bearer test-session');
      assert.deepEqual(JSON.parse(options.body), {
        action: 'preview_url', url: 'https://example.com', sector: 'immobilier', include_raw: true,
      });
      return { ok: true, json: async () => ({ ok: true, partial: true, rows: [] }) };
    });
  assert.equal(result.partial, true);
});

test('feed access uses preview_feed rather than synchronization', async () => {
  const id = '11111111-1111-1111-1111-111111111111';
  await readSite(['feed', id], { ABRACADEAL_ACCESS_TOKEN: 'test' }, async (_, options) => {
    assert.deepEqual(JSON.parse(options.body), { action: 'preview_feed', feed_id: id });
    return { ok: true, json: async () => ({ ok: true }) };
  });
});

test('invalid input or missing session never sends a request', async () => {
  const never = () => { throw Error('Unexpected request'); };
  for (const args of [['sync', 'anything'], ['url', 'file:///etc/passwd'],
    ['url', 'https://user:secret@example.com'], ['feed', 'invalid'],
    ['url', 'https://example.com', 'invalid']]) {
    await assert.rejects(readSite(args, { ABRACADEAL_ACCESS_TOKEN: 'test' }, never));
  }
  await assert.rejects(readSite(['url', 'https://example.com'], {}, never), /Session/);
});

test('remote errors and expired sessions fail without disclosing response bodies', async () => {
  for (const [ok, status, data] of [[false, 401, { error: 'secret' }],
    [true, 200, { ok: false, error: 'secret' }], [false, 502, null]]) {
    await assert.rejects(readSite(['url', 'https://example.com'],
      { ABRACADEAL_ACCESS_TOKEN: 'test' }, async () => ({ ok, status, json: async () => data })),
      error => !error.message.includes('secret') && error.message.includes(`HTTP ${status}`));
  }
});
