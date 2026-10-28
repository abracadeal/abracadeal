// One preview entry point; every network read is supplied by the existing safe fetcher.
// No database, secret, publication or synchronization capability is available here.
import {eraPreviewScope, readAllEraPreview} from './era-preview.ts';
import {readSecondarySite} from './reader-fallback.ts';

type Feed = {feed_url: string; sector?: string; format?: string};
type Page = {text: string; url: URL};
type Dependencies = {
  fetchHtml: (url: URL) => Promise<Page>;
  readFile: (feed: Feed) => Promise<any[]>;
  networkHomeError: (url: URL) => string | null;
  detectPlatform: (html: string) => string;
  orpiSlug: (url: URL) => string | null;
  isC21: (url: URL, html: string) => boolean;
  isAa: (html: string) => boolean;
  isWoo: (url: URL) => Promise<boolean>;
  orpi: (origin: URL, slug: string) => Promise<any[]>;
  c21: (origin: URL) => Promise<any[]>;
  aa: (origin: URL) => Promise<any[]>;
  woo: (origin: URL) => Promise<any[]>;
  generic: (origin: URL, html: string, sector: string) => Promise<any[]>;
  parseImmo: (html: string, url: string) => any;
  parseVehicle: (html: string, url: string) => any;
};
type Connector = {id: string; label: string; matches: () => boolean | Promise<boolean>;
  read: () => Promise<any[]>; fallback?: boolean};

function finish(rows: any[], connector: string, label: string, attempts: string[], secondary = false) {
  if (!Array.isArray(rows) || !rows.some(row => row?.titre)) throw Error('Aucune fiche exploitable.');
  Object.assign(rows, {preview_only: true, connector_id: connector, reader_used: secondary ? 'secondary' : 'primary',
    attempted_connectors: attempts, platform: label});
  if (secondary) Object.assign(rows, {partial: true, fallback_reason: 'Le lecteur principal n’a pas trouvé de stock exploitable.'});
  return rows;
}

export async function routePreview(connectors: Connector[], secondary: () => Promise<any[]>, secondaryLabel: string) {
  const attempts: string[] = [];
  for (const connector of connectors) {
    if (!await connector.matches()) continue;
    attempts.push(connector.id);
    try { return finish(await connector.read(), connector.id, connector.label, attempts); }
    catch (error) {
      // An ERA total mismatch must not become a supposedly complete generic result.
      if (connector.fallback === false) throw error;
      attempts.push('html-fallback');
      try { return finish(await secondary(), 'html-fallback', secondaryLabel, attempts, true); }
      catch { throw Error(`Lecture impossible avec ${connector.label} et le lecteur de secours. Vérification manuelle nécessaire.`); }
    }
  }
  throw Error('Aucun lecteur disponible pour cette adresse.');
}

export async function readUnifiedPreview(feed: Feed, deps: Dependencies) {
  const requested = new URL(String(feed.feed_url));
  if (!['http:', 'https:'].includes(requested.protocol) || requested.username || requested.password)
    throw Error('L’aperçu nécessite une adresse HTTP(S) publique sans identifiants.');
  const sector = feed.sector || 'vehicules';
  const isEra = /(^|\.)eraimmobilier\.com$/i.test(requested.hostname);
  if (isEra && (!eraPreviewScope(requested) || sector !== 'immobilier'))
    throw Error('ERA : sélectionnez Immobilier et une adresse locale d’achat, comme la recherche de Cannes.');
  const guard = deps.networkHomeError(requested);
  if (guard) throw Error(guard);
  const first = await deps.fetchHtml(requested), url = first.url;
  // Keep redirected HTML scoped to the observed destination, like the existing reader.
  const redirectedGuard = deps.networkHomeError(url);
  if (redirectedGuard) throw Error(redirectedGuard);
  if (!/<(?:!doctype\s+html|html|head|body)\b/i.test(first.text.slice(0, 3000))) {
    if (isEra) throw Error('ERA : page HTML attendue.');
    const rows = await deps.readFile(feed);
    if (!Array.isArray(rows) || !rows.length) throw Error('Le flux de fichier ne contient aucune annonce.');
    Object.assign(rows, {preview_only:true, connector_id:'file-feed', reader_used:'primary', attempted_connectors:['file-feed']});
    return rows;
  }
  const origin = new URL(url.origin), platform = deps.detectPlatform(first.text);
  const orpi = deps.orpiSlug(url) || deps.orpiSlug(requested);
  const c21Link = /(^|\.)century21\.fr$/i.test(url.hostname)
    ? first.text.match(/href="(https:\/\/www\.century21[a-z0-9-]*\.(?:com|fr))\/annonces\/achat\/"/i)?.[1] : null;
  const c21Site = c21Link && !/century21\.fr$/i.test(new URL(c21Link).hostname) ? new URL(c21Link) : null;
  // Reuse the first document in ERA's pagination rather than downloading it twice.
  const fetchCached = async (target: URL) => target.toString() === requested.toString() ? first : deps.fetchHtml(target);
  const connectors: Connector[] = [
    {id:'era', label:'ERA · aperçu de recherche locale', matches:()=>isEra, fallback:false,
      read:()=>readAllEraPreview(requested, fetchCached)},
    {id:'orpi', label:'Orpi (page agence)', matches:()=>!!orpi, read:()=>deps.orpi(origin,orpi!)},
    {id:'century21', label:'Century 21 (site agence)', matches:()=>!!c21Site || deps.isC21(url,first.text),
      read:()=>deps.c21(c21Site || origin)},
    {id:'annonces-automobile', label:'Annonces-Automobile', matches:()=>deps.isAa(first.text), read:()=>deps.aa(origin)},
    {id:'woocommerce', label:'WordPress / WooCommerce', matches:()=>/wp-content|wp-json/i.test(first.text) && deps.isWoo(origin), read:()=>deps.woo(origin)},
    {id:'structured-data', label:platform+' · données structurées', matches:()=>true,
      read:()=>deps.generic(origin,first.text,sector)},
  ];
  return routePreview(connectors, async()=>{
    const secondaryUrl = c21Site || url;
    const secondaryHtml = c21Site ? (await deps.fetchHtml(c21Site)).text : first.text;
    const national = /^(?:www\.)?(?:orpi\.com|century21\.fr|laforet\.com|guy-hoquet\.com|stephaneplazaimmobilier\.com|nestenn\.com|foncia\.com)$/i.test(secondaryUrl.hostname);
    return readSecondarySite({url:secondaryUrl,html:secondaryHtml,sector,candidates:async()=>[],
      fetchHtml:deps.fetchHtml,scopePath:national?secondaryUrl.pathname:undefined,
      parseStructured:sector==='immobilier'?deps.parseImmo:deps.parseVehicle});
  },platform+' · lecteur de secours');
}
