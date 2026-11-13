import { isPlaceholderPhoto } from './photo-utils.ts';
import { crawlCatalogue, type CrawlMemory } from './resumable-crawl.ts';
import { sDecode } from './smart-reader.ts';

const site = new URL('https://www.pointimmo-pasturel.com/');
const catalogue = new URL('/immo/c/front/search/pk/13/mode/0', site);
const scope = 'pointimmo-v2:';
// Repeated versions of the same floor plan or interior photo, confirmed on the source galleries.
const repeatedPhotos = new Set([
  '/media/images/immo/385/z2_4935.webp',
  '/media/images/immo/386/z2_4907.webp',
  '/media/images/immo/384/z2_4912.webp',
  '/media/images/immo/561/z2_7118.webp',
]);
const pageSize = 48;
const detailPath = /^\/fr\/[a-z0-9-]+$/i;
type Fetcher = (url: URL) => Promise<{text: string; url: URL}>;
type Card = {
  objectKey: number | string; url: string; name: string; ref: string;
  status: number | string; availability: number | string; exist: number | string;
  typeTransaction: number | string; typeEstate: string; portfolioKey: number | string;
  suspended: number | string; rented: number | string; sous_compromis: number | string;
  sous_offre: number | string; charges_copropriete_annuelle?: number | string; taxe_fonciere?: number | string; price: number | string; updateDate: string;
};

export const isPointImmo = (url: URL) => /^(?:www\.)?pointimmo-pasturel\.com$/.test(url.hostname);

function plain(html = '') {
  return sDecode(html.replace(/<!--[^]*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function numeric(value?: string) {
  const amount = value?.match(/^\s*(\d+(?: \d{3})*(?:[,.]\d+)?)/)?.[1];
  return amount ? Number(amount.replace(/ /g, '').replace(',', '.')) : undefined;
}

function closed(title: string) {
  return /^(?:vendu(?:e|s|es)?\b|compromis\b|sous\s+(?:offre|compromis)\b|loué(?:e|s|es)?\b)/i.test(title.trim());
}

export function pointImmoAvailable(card: Card) {
  return String(card.status) === '1' && String(card.availability) === '1' &&
    String(card.exist) === '1' && String(card.typeTransaction) === '0' &&
    !['8-f', '3000'].includes(String(card.typeEstate)) &&
    ![card.suspended, card.rented, card.sous_compromis, card.sous_offre].some(flag => String(flag) === '1') &&
    !closed(plain(card.name));
}

async function catalogPage(page: number) {
  const options = {
    type: 'sell', distance: '0', typeEstate: '-1', home: 'true', city: '0', cityKey: '',
    mode: 'ajax', page: String(page), perPage: String(pageSize), orderOrigin: 'price', orderWay: 'asc',
    display: 'list', flagSearch: 'true', searchPagination: page ? 'true' : 'false', sold: '0', roundprice: '0',
  };
  const response = await fetch(catalogue, {
    method: 'POST',
    headers: {'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Abracadeal-StockSync/1.0 (+https://abracadeal.fr)'},
    body: new URLSearchParams(Object.entries(options).map(([key, value]) => ['immo[' + key + ']', value])),
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Error('Catalogue public Point Immo HTTP ' + response.status);
  }
  const data = await response.json();
  const total = Number(data.countProperty);
  if (data.failed || !Number.isInteger(total) || total < 0 || total > 500 ||
      typeof data.out !== 'string' || data.out.length > 2_000_000) throw Error('Réponse catalogue Point Immo invalide');
  const bytes = Uint8Array.from(atob(data.out), char => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '', length = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.length;
    if (length > 8_000_000) {
      await reader.cancel();
      throw Error('Catalogue Point Immo trop volumineux');
    }
    text += decoder.decode(chunk.value, {stream: true});
  }
  const payload = JSON.parse(text + decoder.decode());
  return {total, cards: (Array.isArray(payload) ? payload : Object.values(payload)) as Card[]};
}

function contactOf(article: string) {
  const block = article.match(/<div class="contentContactProperty">([\s\S]*?)<\/div>/i)?.[1] || '';
  const name = plain(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
  const phone = plain(block).match(/Tél\.\s*:\s*(0[1-9](?:[ .-]*\d){8})/i)?.[1]?.replace(/\D/g, '');
  return {contact_nom: name || undefined, contact_telephone: phone};
}

export function parsePointImmo(html: string, url: string, card: Card) {
  const page = new URL(url);
  const canonical = html.match(/<link\b[^>]*rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (!isPointImmo(page) || !detailPath.test(page.pathname) || page.pathname !== '/fr/' + card.url ||
      !canonical || new URL(canonical).href !== page.href) throw Error('Identité de fiche Point Immo incohérente');
  const article = html.split('<article class="property">')[1] || '';
  const title = plain(article.match(/<h2 class="property-title">([\s\S]*?)<\/h2>/i)?.[1]);
  const ownRef = plain(article.match(/id="immoAttributeRef">([^<]*)</i)?.[1]);
  const location = plain(article.match(/<div class="property-location">([\s\S]*?)<\/div>/i)?.[1]);
  const address = /^(\d{5})\s+(.+)$/.exec(location);
  const price = numeric(plain(article.match(/<h3 class="property-price">([\s\S]*?)<\/h3>/i)?.[1]));
  const description = sDecode((article.match(/<div class="property-description">([\s\S]*?)<div class="clearfix"/i)?.[1] || '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?(?:p|li)\b[^>]*>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n').map(line => line.replace(/[^\S\n]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (closed(title)) return {_sold: 1};
  if (!title || !description || ownRef !== String(card.ref || '').trim() ||
      (price ?? 0) !== Number(card.price)) throw Error('Prix ou contenu de fiche Point Immo incohérent');
  const fields = new Map([...article.matchAll(/<span class="immoAttributeLabel">([^<]+)<\/span>\s*:\s*<\/strong>([\s\S]*?)<\/div>/gi)]
    .map(m => [plain(m[1]).toLowerCase(), plain(m[2])]));
  const publishedType = fields.get('type de bien');
  if (!publishedType) throw Error('Type de bien Point Immo absent');
  const type = /^T\d\b/.test(publishedType) ? 'Appartement ' + publishedType : publishedType;
  const photoPath = '/media/images/immo/' + card.objectKey + '/';
  const gallery = new Set<string>();
  for (const match of article.matchAll(/<a rel="lightbox" href="([^"]+)"/gi)) {
    const photo = new URL(sDecode(match[1]), page);
    if (isPlaceholderPhoto(photo.href) || repeatedPhotos.has(photo.pathname)) continue;
    if (photo.origin !== site.origin || !photo.pathname.startsWith(photoPath)) throw Error('Galerie Point Immo hors périmètre');
    gallery.add(photo.href);
  }
  const energy = article.split('id="immoPropertyDPE"')[1]?.split('id="immoPropertyGES"')[0] || '';
  const climate = article.split('id="immoPropertyGES"')[1]?.split('id="Tab')[0] || '';
  const grade = (block: string) => block.match(/class="([a-g]) selected"/i)?.[1]?.toUpperCase();
  const features = [fields.get('type de stationnement'), fields.get('cuisine')].filter(Boolean);
  const land = /terrain/i.test(type);
  return {
    ...contactOf(article),
    _source_specific_fields: true,
    _exact_source_city: address?.[2],
    _keep_missing_city: !address, _source_city_missing: !address,
    reference: String(card.objectKey), mandat: fields.get('numéro de mandat') || ownRef || undefined,
    url, titre: title, transaction: 'vente', type_bien: type,
    prix: price, ville: address?.[2], code_postal: address?.[1], description,
    surface: land ? undefined : numeric(fields.get('surface habitable')),
    surface_terrain: numeric(fields.get('surface terrain')),
    pieces: numeric(fields.get('nb pièce(s)')), chambres: numeric(fields.get('nb chambre(s)')),
    salles_de_bain: numeric(fields.get('nb salle de bain')), salles_eau: numeric(fields.get("salle d'eau")),
    annee_construction: numeric(fields.get('année de construction')),
    chauffage: [fields.get('type de chauffage'), fields.get('mode de chauffage'), fields.get('energie')].filter(Boolean).join(' · '),
    copropriete: fields.has('nombre de lots') ? 'Oui' : undefined,
    nombre_lots: numeric(fields.get('nombre de lots')), equipements: features.join('|'),
    dpe: grade(energy), ges: grade(climate),
    consommation_energie: numeric(energy.match(/class="consommation">[\s\S]*?class="unit-rel">([^<]+)/i)?.[1]),
    charges_annuelles: Number(card.charges_copropriete_annuelle) > 0 ? Number(card.charges_copropriete_annuelle) : undefined,
    taxe_fonciere: Number(card.taxe_fonciere) > 0 ? Number(card.taxe_fonciere) : undefined,
    photos: [...gallery].join('|'),
  };
}

export async function readPointImmo(fetchHtml: Fetcher, memory: CrawlMemory | undefined, digest: (url: string) => Promise<string | null>) {
  const first = await catalogPage(0);
  const pages = [first];
  for (let page = 1; page * pageSize < first.total; page++) pages.push(await catalogPage(page));
  const all = pages.flatMap(part => {
    if (part.total !== first.total) throw Error('Le catalogue Point Immo a changé pendant la pagination');
    return part.cards;
  });
  if (all.length !== first.total || new Set(all.map(card => String(card.objectKey))).size !== first.total ||
      all.some(card => String(card.portfolioKey) !== '13')) throw Error('Catalogue Point Immo incomplet');
  const available = all.filter(pointImmoAvailable);
  // These two properties are each advertised as a dwelling and a commercial space.
  // Keep the published residential loft and the published commercial listing in Naucelle.
  const alternateListings = [
    ['575', '250', 'local---loft-rodez', '586', '942', 'loft-rodez'],
    ['555', '902', 'maison---local-renove-en-hypercentre', '552', '248', 'local-commercial-en-monopropriete'],
  ];
  const eligible = available.filter(card => !alternateListings.some(([id, ref, slug, keptId, keptRef, keptSlug]) =>
    String(card.objectKey) === id && card.ref === ref && card.url === slug &&
    available.some(kept => String(kept.objectKey) === keptId && kept.ref === keptRef &&
      kept.url === keptSlug && kept.price === card.price)));
  const cards = new Map<string, Card>();
  for (const card of eligible) {
    if (!/^\d+$/.test(String(card.objectKey)) || !/^[a-z0-9-]+$/i.test(card.url)) throw Error('Lien Point Immo invalide');
    cards.set(new URL('/fr/' + card.url, site).href, card);
  }
  if (!cards.size || cards.size !== eligible.length) throw Error('Liens Point Immo manquants ou répétés');
  const fingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
    JSON.stringify([...cards.values()].map(card => [card.objectKey, card.url, card.updateDate, card.price, card.ref]))));
  const snapshot = Array.from(new Uint8Array(fingerprint), byte => byte.toString(16).padStart(2, '0')).join('');
  const rows = await crawlCatalogue(site.href, scope + snapshot, [site.href], async url => {
    if (url.href === site.href) return {text: '', url};
    if (!cards.has(url.href)) throw Error('Fiche Point Immo hors catalogue');
    const page = await fetchHtml(url);
    if (page.url.href !== url.href) throw Error('Redirection de fiche Point Immo inattendue');
    return page;
  }, () => ({lists: [], details: [...cards.keys()]}), async (html, url) => {
    const row = parsePointImmo(html, url, cards.get(url)!);
    if (row._sold || !row.photos) return row;
    const unique = new Map<string, string>();
    const photos = row.photos.split('|');
    for (let offset = 0; offset < photos.length; offset += 4) {
      const batch = photos.slice(offset, offset + 4);
      const hashes = await Promise.all(batch.map(digest));
      for (const [index, hash] of hashes.entries()) {
        if (!hash) throw Error('Photo Point Immo inaccessible');
        if (!unique.has(hash)) unique.set(hash, batch[index]);
      }
    }
    return {...row, photos: [...unique.values()].join('|')};
  }, memory, {expectedTotal: cards.size, maxDetails: 4});
  return Object.assign(rows, {platform: 'Point Immo (Proxi)', sector: 'immobilier'});
}
