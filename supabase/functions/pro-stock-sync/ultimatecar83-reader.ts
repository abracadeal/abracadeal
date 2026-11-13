import { isPlaceholderPhoto } from './photo-utils.ts';
import { sDecode } from './smart-reader.ts';

const origin = new URL('https://ultimatecar83.fr/');
const catalogue = new URL('resources/', origin);
const detailPath = /^\/vehicule\/[a-z0-9-]+-(\d+)\/$/;
type Fetcher = (url: URL) => Promise<{text: string; url: URL}>;

export const isUltimateCar83 = (url: URL) => /^(?:www\.)?ultimatecar83\.fr$/.test(url.hostname);

function plain(html = '') {
  return sDecode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function amount(value = '') {
  const digits = value.match(/^\s*(\d+(?: \d{3})*(?:,\d+)?)/)?.[1];
  return digits ? Number(digits.replace(/ /g, '').replace(',', '.')) : undefined;
}

export function ultimateCarCatalogue(html: string) {
  const marker = html.match(/<p>\s*(\d+)\s+véhicule\(s\)\s*<\/p>\s*<div class="uc-stock-grid">/i);
  if (!marker) throw Error('Compteur Ultimate Car 83 absent');
  const section = html.slice(marker.index! + marker[0].length);
  const pagination = /<nav aria-label="Pages du catalogue">([\s\S]*?)<\/nav>/i.exec(section);
  if (!pagination) throw Error('Pagination Ultimate Car 83 absente');
  const cards = [...section.slice(0, pagination.index).matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map(match => {
    const card = match[1];
    const heading = card.match(/<h3>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/h3>/i);
    if (!heading) throw Error('Carte Ultimate Car 83 incomplète');
    const url = new URL(sDecode(heading[1]), origin);
    if (url.origin !== origin.origin || !detailPath.test(url.pathname) || url.search || url.hash) {
      throw Error('Carte Ultimate Car 83 hors périmètre');
    }
    const title = plain(heading[2]);
    const mileage = amount(plain(card.match(/<\/h3>\s*<p>[^·]+·\s*([^·<]+)\s*km/i)?.[1]));
    const labels = [...card.matchAll(/<small>([\s\S]*?)<\/small>/gi)].map(x => plain(x[1])).join(' ');
    const available = /stock immédiat|disponible immédiatement/i.test(labels) &&
      !/sous \d+|sur commande|vendu|réservé/i.test(labels) &&
      !/\bneuf\b|\b0\s*km\b/i.test(title) && mileage !== undefined && mileage > 100;
    const price = amount(plain(card.match(/<p class="uc-stock-price">([^<]+)<\/p>/i)?.[1]));
    return {url: url.href, title, available, price, mileage};
  });
  const pages = [...pagination[1].matchAll(/href="([^"]+)"/gi)].map(m => {
    const url = new URL(sDecode(m[1]), catalogue);
    if (url.origin !== catalogue.origin || url.pathname !== catalogue.pathname ||
        !/^\?uc_page=\d+$/.test(url.search) || url.hash) throw Error('Lien de pagination Ultimate Car 83 hors périmètre');
    return Number(url.searchParams.get('uc_page'));
  });
  return {total: Number(marker[1]), cards, pages};
}

export function parseUltimateCar83(html: string, card: ReturnType<typeof ultimateCarCatalogue>['cards'][number]) {
  const page = new URL(card.url);
  const id = detailPath.exec(page.pathname)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  if (!id || page.origin !== origin.origin || canonical !== page.href) throw Error('Identité Ultimate Car 83 incohérente');
  const content = html.split('<div class="golf-offer">')[1]?.split('</article>')[0] || '';
  const stock = plain(content.match(/<p class="golf-stock">([^<]*)<\/p>/i)?.[1]);
  const price = amount(plain(content.match(/<p class="golf-price">([^<]*)<\/p>/i)?.[1]));
  const features = new Map([...content.matchAll(/<dt>([^<]+)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)]
    .map(m => [plain(m[1]), plain(m[2])]));
  const mileage = amount(features.get('Kilométrage'));
  const date = features.get('Mise en circulation');
  if (!card.available || !/disponible immédiatement/i.test(stock) || !price || price !== card.price ||
      !mileage || mileage !== card.mileage || !content.includes('<h1>')) {
    throw Error('Disponibilité, prix ou kilométrage Ultimate Car 83 incohérent');
  }
  const gallery = content.match(/<div class="golf-gallery">([\s\S]*?)<\/div>/i)?.[1] || '';
  const photos = new Set<string>();
  for (const m of gallery.matchAll(/<a href="([^"]+)"/gi)) {
    const url = new URL(sDecode(m[1]), page);
    if (url.origin !== origin.origin || !new RegExp('^/wp-content/uploads/ultimatecar83-[a-z0-9-]+-' + id + '/[^/]+\\.(?:jpe?g|webp|png)$','i').test(url.pathname)) {
      throw Error('Galerie Ultimate Car 83 hors périmètre');
    }
    if (!isPlaceholderPhoto(url.href)) photos.add(url.origin + url.pathname);
  }
  if (!photos.size) throw Error('Galerie Ultimate Car 83 absente');
  const equipment = content.match(/<ul class="golf-equip">([\s\S]*?)<\/ul>/i)?.[1] || '';
  const capacities = features.get('Portes / places') || '';
  return {
    reference: id, url: page.href, titre: card.title,
    prix: price, etat: 'occasion', type: 'voiture',
    annee: date?.match(/\b(\d{4})$/)?.[1], mise_en_circulation: date,
    kilometrage: mileage, carburant: features.get('Énergie'), boite: features.get('Boîte'),
    couleur: features.get('Couleur'), portes: capacities.match(/(\d+) portes/)?.[1],
    places: capacities.match(/(\d+) places/)?.[1],
    equipements: [...equipment.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m => plain(m[1])).join('|'),
    photos: [...photos],
  };
}

export async function readUltimateCar83(fetchHtml: Fetcher, digest: (url: string) => Promise<string | null>) {
  const first = await fetchHtml(catalogue);
  if (first.url.href !== catalogue.href) throw Error('Catalogue Ultimate Car 83 redirigé');
  const parsed = ultimateCarCatalogue(first.text);
  const cards = new Map(parsed.cards.map(card => [card.url, card]));
  if (cards.size !== parsed.cards.length) throw Error('Carte répétée sur la première page Ultimate Car 83');
  const visited = new Set([1]);
  const pending = new Set(parsed.pages.filter(page => page > 1));
  for (const page of pending) {
    if (page > 20 || page < 2) throw Error('Pagination Ultimate Car 83 hors limites');
    const url = new URL('?uc_page=' + page, catalogue);
    const next = await fetchHtml(url);
    if (next.url.href !== url.href) throw Error('Page Ultimate Car 83 redirigée');
    const chunk = ultimateCarCatalogue(next.text);
    if (chunk.total !== parsed.total) throw Error('Le catalogue Ultimate Car 83 a changé pendant la lecture');
    for (const card of chunk.cards) {
      if (cards.has(card.url)) throw Error('Carte répétée entre deux pages Ultimate Car 83');
      cards.set(card.url, card);
    }
    visited.add(page);
    for (const link of chunk.pages) if (!visited.has(link)) pending.add(link);
  }
  if (cards.size !== parsed.total) throw Error('Catalogue Ultimate Car 83 incomplet');
  const eligible = [...cards.values()].filter(card => card.available);
  if (!eligible.length) throw Error('Aucune occasion en stock immédiat chez Ultimate Car 83');
  const contactUrl = new URL('contact/', origin);
  const contact = await fetchHtml(contactUrl);
  if (contact.url.href !== contactUrl.href) throw Error('Page de contact Ultimate Car 83 redirigée');
  const phone = [...new Set([...contact.text.matchAll(/href="tel:\+33([1-9]\d{8})"/gi)].map(m => '0' + m[1]))];
  const contactPhone = phone.length === 1 ? phone[0] : undefined;
  const city = /Draguignan/i.test(plain(contact.text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1])) ? 'Draguignan' : undefined;
  const rows = [];
  for (const card of eligible) {
    const url = new URL(card.url);
    const detail = await fetchHtml(url);
    if (detail.url.href !== url.href) throw Error('Fiche Ultimate Car 83 redirigée');
    const row = parseUltimateCar83(detail.text, card);
    const unique = new Map<string, string>();
    for (let offset = 0; offset < row.photos.length; offset += 4) {
      const batch = row.photos.slice(offset, offset + 4);
      const hashes = await Promise.all(batch.map(digest));
      for (const [index, hash] of hashes.entries()) {
        if (!hash) throw Error('Photo Ultimate Car 83 inaccessible');
        if (!unique.has(hash)) unique.set(hash, batch[index]);
      }
    }
    rows.push({...row, ville: city, contact_nom: contactPhone ? 'Ultimate Car 83 (garage)' : undefined,
      contact_telephone: contactPhone, photos: [...unique.values()].join('|')});
  }
  return Object.assign(rows, {platform: 'Ultimate Car 83 (WordPress)', sector: 'vehicules',
    total: eligible.length, partial: false,
    stats: {pages: visited.size, details: rows.length, expected_total: eligible.length,
      remaining: 0, remaining_lists: 0, failed: [], cycle_complete: true}});
}
