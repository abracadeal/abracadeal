// No model/API keys: a deterministic second reader, shared by all entry points.
export async function withReaderFallback(primary: () => Promise<any[]>, secondary: () => Promise<any[]>) {
  try {
    const rows = await primary();
    if (!rows.length || !rows.some(r => r.titre)) throw Error('Aucune fiche exploitable');
    (rows as any).reader_used = 'primary';
    return rows;
  } catch {
    // Never return raw upstream errors (they may embed credentials).
    const rows = await secondary();
    if (!rows.length || !rows.some(r => r.titre)) throw Error('Les deux lecteurs n’ont trouvé aucune fiche exploitable.');
    (rows as any).reader_used = 'secondary';
    (rows as any).fallback_reason = 'Le lecteur principal n’a pas trouvé de stock exploitable.';
    // A fallback cannot prove exhaustive coverage: never archive missing listings.
    (rows as any).partial = true;
    return rows;
  }
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : '')
  .replace(/&#x([\da-f]+);/gi, (_, n) => parseInt(n, 16) <= 0x10ffff ? String.fromCodePoint(parseInt(n, 16)) : '');
const clean = (s: string) => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = (tag: string) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4])]));

// Strict detail pages only. Never infer a vehicle/property from a catalogue card.
export function parseHtmlDetail(html: string, pageUrl: string, sector: string) {
  html = html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const meta: Record<string, string> = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = a.property || a.name || a.itemprop;
    if (key && a.content) meta[key.toLowerCase()] ??= a.content;
  }
  const prop = (name: string) => {
    if (meta[name.toLowerCase()]) return meta[name.toLowerCase()];
    for (const m of html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
      const a = attrs(m[2]);
      if ((a.itemprop || '').split(/\s+/).includes(name)) {
        const tail = html.slice(m.index! + m[0].length);
        const end = tail.search(new RegExp(`</${m[1]}\\s*>`, 'i'));
        return a.content || a.value || (end >= 0 ? clean(tail.slice(0, end)) : '');
      }
    }
    return '';
  };
  const immo = sector === 'immobilier';
  const detailType = /itemtype\s*=\s*["'][^"']*\/(?:Car|Vehicle|Motorcycle|Product|RealEstateListing|Apartment|House|SingleFamilyResidence|Residence|Landform)["']/i.test(html)
    || /^(product|product\.item)$/i.test(meta['og:type'] || '');
  if (!detailType || /(?:soldout|outofstock|discontinued)/i.test(meta.availability || prop('availability'))) return null;
  const title = meta['og:title'] || prop('name');
  const price = meta['product:price:amount'] || prop('price');
  const currency = meta['product:price:currency'] || prop('priceCurrency');
  const image = meta['og:image'] || meta.image;
  // An unknown currency or a range is not a verified EUR listing price.
  if (!title || !price || !image || (currency && currency.toUpperCase() !== 'EUR')
    || !/^\d[\d .,\u00a0\u202f]*$/.test(price)) return null;
  if (!(immo ? /appartement|maison|villa|terrain|parking|bureau|local|pi[eè]ce|m²|m2/i
    : /voiture|auto|moto|scooter|utilitaire|\b(?:bmw|audi|renault|peugeot|citro[eë]n|mercedes|volkswagen|toyota|fiat|ford|porsche|tesla|kia|hyundai|volvo|dacia|mini|opel|nissan|seat|skoda|honda|suzuki|yamaha)\b/i).test(title)) return null;
  let photo: URL;
  try { photo = new URL(image, pageUrl); } catch { return null; }
  if (!['https:', 'http:'].includes(photo.protocol) || photo.username || photo.password) return null;
  const row: Record<string, string> = {
    reference: (prop('sku') || prop('productID') || new URL(pageUrl).pathname.replace(/\/+$/, '').split('/').pop() || pageUrl).slice(0, 80),
    url: pageUrl, titre: clean(title), prix: price, photos: photo.toString(),
    description: clean(meta['og:description'] || meta.description || '').slice(0, 6000),
  };
  for (const [key, name] of [['ville', 'addressLocality'], ['code_postal', 'postalCode'],
    ['marque', 'brand'], ['modele', 'model'], ['kilometrage', 'mileageFromOdometer'],
    ['carburant', 'fuelType'], ['boite', 'vehicleTransmission'], ['surface', 'floorSize'],
    ['pieces', 'numberOfRooms'], ['dpe', 'energyClass'], ['ges', 'climateClass']]) {
    const value = prop(name); if (value) row[key] = value;
  }
  if (immo) {
    // No default sale/rental choice: ambiguous detail pages must be reviewed manually.
    const context = title + ' ' + row.description + ' ' + new URL(pageUrl).pathname;
    const rent = /location|louer|rent|lease/i.test(context), sale = /vente|vendre|achat|purchase/i.test(context);
    if (rent === sale) return null;
    row.transaction = rent ? 'location' : 'vente';
    row.type_bien = /terrain/i.test(title) ? 'terrain' : /maison|villa/i.test(title) ? 'maison'
      : /parking/i.test(title) ? 'parking' : /bureau|local/i.test(title) ? 'bureau' : 'appartement';
  } else {
    row.type = /moto|scooter/i.test(title) ? 'moto' : /utilitaire/i.test(title) ? 'utilitaire' : 'voiture';
    const date = prop('dateVehicleFirstRegistered') || prop('vehicleModelDate');
    const year = date.match(/\b(?:19|20)\d{2}\b/); if (year) row.annee = year[0];
  }
  return row;
}

export async function readSecondarySite(options: {
  url: URL; html: string; sector: string; scopePath?: string;
  candidates: () => Promise<string[]>;
  fetchHtml: (url: URL) => Promise<{ text: string; url?: URL }>;
  parseStructured: (html: string, url: string) => any;
  now?: () => number;
}) {
  const now = options.now || Date.now, start = now();
  const rows: any[] = [], seen = new Set<string>(), visited = new Set<string>();
  const add = (html: string, url: string) => {
    const row = options.parseStructured(html, url) || parseHtmlDetail(html, url, options.sector);
    if (row && !row._sold && !seen.has(row.reference)) { seen.add(row.reference); rows.push(row); }
  };
  add(options.html, options.url.toString());
  const queue = [options.url.toString(), ...await options.candidates()];
  for (let i = 0; i < queue.length && visited.size < 40 && now() - start < 35000; i++) {
    let url: URL;
    try { url = new URL(queue[i]); } catch { continue; }
    url.hash = '';
    if (url.origin !== options.url.origin || url.username || url.password || visited.has(url.toString())) continue;
    if (options.scopePath) {
      const scope = options.scopePath.replace(/\/+$/, '');
      if (url.pathname !== scope && !url.pathname.startsWith(scope + '/')) continue;
    }
    visited.add(url.toString());
    let text = options.html;
    try {
      if (url.toString() !== options.url.toString()) {
        const page = await options.fetchHtml(url);
        // A cross-origin redirect is not stock owned by this site.
        // Do not assign a listing to a URL which redirected elsewhere (sold pages often do).
        if (page.url && (page.url.origin !== options.url.origin || page.url.pathname !== url.pathname)) continue;
        text = page.text;
      }
      add(text, url.toString());
      for (const m of text.matchAll(/href=["']([^"'#]+)["']/gi)) {
        try {
          const next = new URL(decode(m[1]), url); next.hash = '';
          if (next.origin === options.url.origin && /annonce|stock|occasion|vehicule|voiture|moto|bien|vente|location|achat|detail|fiche|product/i.test(next.pathname)
            && !/\.(?:jpe?g|png|gif|svg|webp|pdf|css|js|xml|ico)$/i.test(next.pathname)
            && queue.length < 200 && !queue.includes(next.toString())) queue.push(next.toString());
        } catch { /* An invalid link is not a listing. */ }
      }
    } catch { /* Incomplete fallback coverage must never trigger removals. */ }
  }
  if (!rows.length) throw Error('Les deux lecteurs n’ont trouvé aucune fiche exploitable. Vérification manuelle nécessaire.');
  (rows as any).partial = true;
  return rows;
}
