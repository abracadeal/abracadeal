#!/usr/bin/env node
// Shared client for the existing « Lire site » robot. Never publishes listings.
import { pathToFileURL } from 'node:url';

export async function readSite(args, env = process.env, fetcher = fetch) {
  const [kind, value, sector = 'vehicules', ...extra] = args;
  if (!['url', 'feed'].includes(kind) || !value || extra.length ||
      !['vehicules', 'immobilier'].includes(sector)) {
    throw new Error('Usage: node scripts/read-site.mjs url <https://site> [vehicules|immobilier] | feed <feed_id>');
  }
  if (kind === 'url') {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Adresse HTTP(S) publique sans identifiants requise');
    }
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('feed_id doit être un UUID');
  }
  const token = env.ABRACADEAL_ACCESS_TOKEN;
  if (!token) throw new Error('Session Abracadeal requise : ABRACADEAL_ACCESS_TOKEN absent');
  const response = await fetcher('https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/pro-stock-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: 'sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(kind === 'url'
      ? { action: 'preview_url', url: value, sector, include_raw: true }
      : { action: 'preview_feed', feed_id: value }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await response.json().catch(() => null);
  // Do not echo remote error bodies: they may contain private URLs or credentials.
  if (!response.ok || !data?.ok) {
    throw new Error(`Lecture impossible (HTTP ${response.status}). Vérifier la session, les droits et la compatibilité du site dans l’administration.`);
  }
  return data;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(JSON.stringify(await readSite(process.argv.slice(2)), null, 2) + '\n');
  } catch {
    console.error('Lecture impossible. Vérifier les arguments, ABRACADEAL_ACCESS_TOKEN et les droits du compte. Consulter docs/shared-site-reader.md.');
    process.exitCode = 1;
  }
}
