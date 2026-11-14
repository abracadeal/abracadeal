import { sDecode } from './smart-reader.ts';
import { eachDetailResumable, type CrawlMemory } from './resumable-crawl.ts';
import { isPlaceholderPhoto } from './photo-utils.ts';

const site = 'https://berry-sologne.naosimmobilier.com';
const network = 'https://www.naosimmobilier.com';
const advisor = '75008327';
const route = /^\/fr\/annonce\/(vente|location)-[a-z0-9-]+-r7-(75008\d+)\.html$/i;
type Fetcher = (url: URL) => Promise<{text: string; url: URL}>;

export const isNaosBerry = (url: URL) => url.hostname === new URL(site).hostname;

function clean(html = '') {
  return sDecode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

function number(text?: string) {
  const value = clean(text).match(/^\s*(\d+(?: \d{3})*(?:[.,]\d+)?)/)?.[1];
  return value ? Number(value.replace(/ /g, '').replace(',', '.')) : undefined;
}

export function naosCatalogue(html: string, operation: string) {
  const total = Number(html.match(/class="NbBien">\s*(\d+)\s*</i)?.[1] ?? NaN);
  if (!Number.isInteger(total) || total > 500) throw Error('Compteur NAOS Berry Sologne absent ou hors limites');
  const details = new Set<string>(), pages = new Set<string>();
  for (const a of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const url = new URL(sDecode(a[1]), site);
    const match = route.exec(url.pathname);
    if (url.origin === network && match && match[1] === (operation === '1' ? 'vente' : 'location')) {
      details.add(url.origin + url.pathname);
    }
    if (url.origin === site && url.pathname === '/fr/liste.htm' &&
        url.searchParams.get('numnego') === advisor && url.searchParams.get('ope') === operation &&
        /^\d+$/.test(url.searchParams.get('page') || '')) pages.add(url.href);
  }
  return {total, details, pages};
}

export function parseNaosBerry(html: string, url: string) {
  const page = new URL(url), match = route.exec(page.pathname);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  if (page.origin !== network || !match || canonical !== page.href) throw Error('Identité de fiche NAOS incohérente');
  const [, operation, id] = match;
  const flags = [...html.matchAll(/JsConfig\.Bandeau\.(Vendu|Compromis|SousOffre)\s*&&\s*'([01])'\s*==\s*'1'/g)];
  if (new Set(flags.map(m => m[1])).size !== 3) throw Error('Statut de fiche NAOS absent');
  if (flags.some(m => m[2] === '1') || /class=['"]TxtVendu['"]/i.test(html)) return {_sold: 1};
  const panel = html.match(/<div class="contact-agence-agent hidden" data-show-if="\('2'=='2'\)">([\s\S]*?)Visiter mon minisite/i)?.[1] || '';
  if (!panel.includes('/nego_' + advisor + '_') || !panel.includes('href="' + site)) throw Error('Fiche hors du conseiller NAOS');
  const contact = clean(panel.match(/class="heading3">([\s\S]*?)<\/div>/i)?.[1]);
  const publishedType = clean(html.match(/<h1 class="detail-bien-type"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const locality = clean(html.match(/<h2 class="detail-bien-ville">([\s\S]*?)<\/h2>/i)?.[1]);
  const address = /^(.*?)\s*\((\d{5})\)$/.exec(locality);
  const priceBlock = html.match(/<div class="detail-bien-prix">\s*<span>([^<]*)<\/span>([\s\S]*?)<\/div>/i);
  const price = number(priceBlock?.[2]);
  if (!/(?:€|&euro;)/.test(priceBlock?.[2] || '')) throw Error('Prix NAOS en euros absent');
  const description = clean(html.match(/class="detail-bien-desc-content clearfix"[^>]*>\s*<p>([\s\S]*?)<\/p>/i)?.[1]);
  const headline = clean(html.match(/class="detail-bien-desc-content clearfix"[^>]*>\s*<p>([\s\S]*?)<br/i)?.[1]);
  const type = publishedType || (/^Murs et fonds de commerce\b/i.test(headline) ? 'Local commercial' : '');
  if (!type || !contact || !description || !address || !price) throw Error('Fiche NAOS incomplète');
  const phone = description.match(/(?:Information et visites|Contactez[- ]moi|Me contacter)[^\n]{0,90}?\b(0[1-9](?:[ .-]*\d){8})\b/i)?.[1]
    || description.match(/\b(0[1-9](?:[ .-]*\d){8})\b\s*-\s*Ville du greffe/i)?.[1];
  const photos = new Map<string, string>();
  const energy: Record<string, string> = {};
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\b(?:data-src|src)=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    if (tag.includes('class="photo-slideshow photo-big"')) {
      const image = new URL(sDecode(src), page);
      if (image.origin !== 'https://assets.adaptimmo.com' ||
          !image.pathname.startsWith('/photos-biens/75008/' + id + '_') || isPlaceholderPhoto(image.href)) continue;
      photos.set(image.pathname, image.href);
    }
    const grade = tag.match(/\balt=["'](DPE|GES)["']/i)?.[1].toLowerCase();
    if (grade) {
      const image = new URL(sDecode(src), page);
      if (image.origin === 'https://outil.adaptimmo.com' && image.pathname.startsWith('/dpe/image/')) {
        energy[grade + '_image'] = image.href;
      }
    }
  }
  const specs = html.match(/class="detail-bien-specs">([\s\S]*?)<\/ul>/i)?.[1] || '';
  const spec = (name: string) => number(specs.match(new RegExp('class="ico-' + name + '"[^>]*>[^<]*<\\/span>\\s*([^<]*)', 'i'))?.[1]);
  const lease = operation === 'location';
  const refs = [...html.matchAll(/itemprop="productID">([^<]*)</gi)].map(m => clean(m[1]));
  return {
    ...energy, reference: id, mandat: refs.find(value => value && value !== id && value !== '0'),
    url, titre: type + ' ' + address[1], type_bien: type, ville: address[1], code_postal: address[2],
    _exact_source_city: address[1], _source_specific_fields: true,
    prix: price, transaction: lease ? 'location' : 'vente', prix_periode: lease ? 'mois' : undefined,
    surface: /^terrain/i.test(type) ? undefined : spec('surface'), surface_terrain: spec('terrain'),
    pieces: spec('piece'), chambres: spec('chambre'), description,
    charges_mensuelles: lease ? number(html.match(/class=['"]cout_charges_mens['"]>([^<]*)/i)?.[1]) : undefined,
    depot_garantie: lease ? number(html.match(/Dépôt de garantie[^<]*<\/span>[^<]*<span[^>]*>([^<]*)/i)?.[1]) : undefined,
    nombre_lots: number(description.match(/Nb de lots?\s*:\s*([^\n]+)/i)?.[1]),
    charges_annuelles: number(description.match(/Charges annuelles de copropriété[^:\n]*:\s*([^\n]+)/i)?.[1]),
    honoraires: description.match(/Honoraires\s*:[^\n]+/i)?.[0],
    contact_nom: contact, contact_telephone: phone?.replace(/\D/g, ''),
    consommation_energie: energy.dpe_image ? number(new URL(energy.dpe_image).searchParams.get('consommation') || '') : undefined,
    copropriete: /soumis au statut juridique de la copropriété/i.test(description) ? 'Oui' : undefined,
    photos: [...photos.values()].join('|'),
  };
}

export async function readNaosBerry(fetchHtml: Fetcher, memory: CrawlMemory | undefined, digest: (url: string) => Promise<string | null>) {
  const selected = new Set<string>(), counts: number[] = [];
  for (const operation of ['1', '2']) {
    const queue = [site + '/fr/liste.htm?numnego=' + advisor + '&ope=' + operation + '&tri=DATE_MAJ&page=1'];
    const visited = new Set<string>(), details = new Set<string>();
    let total: number | undefined;
    for (const link of queue) {
      if (visited.has(link)) continue;
      if (visited.size >= 50) throw Error('Pagination NAOS hors limites');
      visited.add(link);
      const page = await fetchHtml(new URL(link));
      if (page.url.origin !== site || page.url.pathname !== '/fr/liste.htm') throw Error('Catalogue NAOS redirigé');
      const parsed = naosCatalogue(page.text, operation);
      if (total !== undefined && total !== parsed.total) throw Error('Catalogue NAOS instable');
      total = parsed.total;
      for (const url of parsed.details) details.add(url);
      for (const url of parsed.pages) if (!visited.has(url) && !queue.includes(url)) queue.push(url);
    }
    if (total !== details.size) throw Error('Pagination NAOS incomplète : ' + details.size + '/' + total);
    counts.push(details.size);
    for (const url of details) selected.add(url);
  }
  if (!selected.size) throw Error('Catalogue NAOS vide');
  const bytes = new TextEncoder().encode([...selected].sort().join('|'));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  const rows = await eachDetailResumable('naos-berry-v1:' + hash, [...selected], async url => {
    const page = await fetchHtml(new URL(url));
    if (page.url.href !== url) throw Error('Fiche NAOS redirigée');
    const row = parseNaosBerry(page.text, url);
    if (row._sold || !row.photos) return row;
    const photos = row.photos.split('|'), unique = new Map<string, string>();
    for (let offset = 0; offset < photos.length; offset += 3) {
      const batch = photos.slice(offset, offset + 3);
      const hashes = await Promise.all(batch.map(digest));
      for (const [index, key] of hashes.entries()) {
        if (!key) throw Error('Photo NAOS inaccessible');
        if (!unique.has(key)) unique.set(key, batch[index]);
      }
    }
    return {...row, photos: [...unique.values()].join('|')};
  }, memory, 8);
  return Object.assign(rows.map(row => ({...row})), {
    platform: 'NAOS Berry Sologne (Adaptimmo)', sector: 'immobilier', partial: rows.partial, total: rows.total,
    cycleStarted: rows.cycleStarted, cycleSeen: rows.cycleSeen,
    stats: {...rows.stats, sale_catalogue: counts[0], rental_catalogue: counts[1], discovered_total: selected.size},
  });
}
