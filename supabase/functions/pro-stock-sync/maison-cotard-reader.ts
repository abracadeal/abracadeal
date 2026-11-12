import { isPlaceholderPhoto } from './photo-utils.ts';
import { crawlCatalogue, type CrawlMemory } from './resumable-crawl.ts';
import { sDecode } from './smart-reader.ts';

const catalogue = new URL('https://www.maisoncotard.com/a-vendre');
const detailPath = /^\/a-vendre\/([a-z0-9-]+)\/?$/;
const scope = 'maison-cotard-v1';
type Fetcher = (url: URL) => Promise<{text: string; url: URL}>;

export const isMaisonCotard = (url: URL) => /^(?:www\.)?maisoncotard\.com$/.test(url.hostname);

function plain(html = '') {
  return sDecode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function section(html: string, id: string) {
  return html.match(new RegExp('<section\\b[^>]*\\bid="' + id + '"[^>]*>([\\s\\S]*?)<\\/section>', 'i'))?.[1] || '';
}

function number(value?: string) {
  const token = value?.match(/^\s*(\d+(?: \d{3})*(?:,\d+)?)/)?.[1];
  return token ? Number(token.replace(/ /g, '').replace(',', '.')) : undefined;
}

function paragraphs(html: string) {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => plain(m[1])).filter(Boolean);
}

function fields(html: string) {
  return new Map([...html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)]
    .map(m => [plain(m[1]).toLowerCase(), plain(m[2])]));
}

export function maisonCotardCatalogue(html: string, url: URL) {
  if (!isMaisonCotard(url) || url.pathname.replace(/\/$/, '') !== catalogue.pathname ||
      !/<h1\b[^>]*>\s*Nos biens à vendre\s*<\/h1>/i.test(html)) {
    throw Error('Catalogue Maison Cotard absent');
  }
  const details = new Set<string>();
  const lists = new Set<string>();
  for (const match of html.matchAll(/<(?:a|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const href = tag.match(/\bhref="([^"]+)"/i)?.[1];
    if (!href) continue;
    const link = new URL(sDecode(href), url);
    if (!isMaisonCotard(link) || link.protocol !== 'https:') continue;
    if (/\bclass="bien"/i.test(tag)) {
      if (!detailPath.test(link.pathname)) throw Error('Carte Maison Cotard hors périmètre');
      details.add(new URL(link.pathname.replace(/\/$/, ''), catalogue).href);
    } else if (/\brel="next"/i.test(tag)) {
      if (link.pathname.replace(/\/$/, '') !== catalogue.pathname) throw Error('Pagination Maison Cotard inattendue');
      link.hash = '';
      lists.add(link.href);
    }
  }
  if (!details.size) throw Error('Aucune carte Maison Cotard détectée');
  return {details: [...details], lists: [...lists]};
}

export function parseMaisonCotard(html: string, url: string) {
  const page = new URL(url);
  const id = detailPath.exec(page.pathname)?.[1];
  const canonical = html.match(/<link\b[^>]*rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (!id || !isMaisonCotard(page) || !canonical || !isMaisonCotard(new URL(canonical)) ||
      new URL(canonical).pathname.replace(/\/$/, '') !== page.pathname) throw Error('Identité Maison Cotard incohérente');
  const kind = /^(?:appartement|duplex|studio)-/.test(id) ? 'appartement' : /^maison-/.test(id) ? 'maison' : '';
  if (!kind) throw Error('Type de bien Maison Cotard non reconnu');
  const hero = html.match(/<section class="hero"[^>]*>([\s\S]*?)<\/section>/i)?.[1] || '';
  const status = plain(hero.match(/<p class="eyebrow">([\s\S]*?)<\/p>/i)?.[1]);
  if (/^(?:vendu|sous compromis|sous offre acceptée)\b/i.test(status)) return {_sold: 1};
  if (!/^à vendre\b/i.test(status)) throw Error('Statut Maison Cotard absent');
  const title = plain(hero.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const essential = section(html, 'essentiel');
  const location = plain(essential.match(/<p class="eyebrow">([\s\S]*?)<\/p>/i)?.[1]);
  const address = /^(.*?)\s*·\s*(\d{5})\s+(Paris)$/i.exec(location);
  const contact = section(html, 'contact');
  const price = number(plain(hero.match(/<p class="price">([\s\S]*?)<\/p>/i)?.[1]));
  const visitPrice = number(plain(contact.match(/<p class="bigprice">([\s\S]*?)<\/p>/i)?.[1]));
  const fact = fields(essential);
  const specs = fields(section(html, 'caracteristiques'));
  const surface = number(fact.get('surface loi carrez'));
  const story = section(html, 'appartement').match(/<div class="prose">([\s\S]*?)<\/div>/i)?.[1] || '';
  const description = [
    plain(essential.match(/<p class="lede">([\s\S]*?)<\/p>/i)?.[1]), ...paragraphs(story),
  ].filter(Boolean).join('\n\n');
  if (!title || !address || !price || price !== visitPrice || !surface || !description) {
    throw Error('Fiche Maison Cotard incomplète ou prix contradictoire');
  }
  const sourcePhotos = html.match(/<script\b[^>]*>\s*window\.__photos\s*=\s*(\[[\s\S]*?\])\s*;/i)?.[1];
  const gallery = sourcePhotos ? JSON.parse(sourcePhotos) : null;
  const count = Number(section(html, 'photos').match(/Voir les (\d+) photos/i)?.[1]);
  if (!Array.isArray(gallery) || !count || gallery.length !== count) throw Error('Galerie Maison Cotard incomplète');
  const photos = new Map<string, string>();
  for (const item of gallery) {
    if (typeof item?.src !== 'string' || typeof item?.cap !== 'string') throw Error('Entrée de galerie invalide');
    const photo = new URL(item.src);
    if (photo.protocol !== 'https:' || photo.hostname !== 'images.squarespace-cdn.com' ||
        !/^\/content\/63dd345d04b310097e0bafcf\/[a-f0-9-]+\/[^/]+\.(?:jpe?g|png|webp)$/i.test(photo.pathname)) {
      throw Error('Photo Maison Cotard hors périmètre');
    }
    if (/illustration non contractuelle|aménagement virtuel|photo (?:générique|par défaut)/i.test(item.cap) || isPlaceholderPhoto(photo.href)) continue;
    if (!photos.has(photo.pathname)) photos.set(photo.pathname, photo.href);
  }
  const floor = fact.get('étage') || '';
  const features = [...section(html, 'appartement').matchAll(/<ul class="atouts">([\s\S]*?)<\/ul>/gi)]
    .flatMap(m => [...m[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(li => plain(li[1])));
  if (/ascenseur/i.test(floor) && !/sans ascenseur/i.test(floor)) features.push('Ascenseur');
  const annexes = fact.get('extérieur & annexes') || fact.get('extérieur &amp; annexes');
  if (annexes) features.push(annexes);
  const rooms = [...section(html, 'surfaces').matchAll(/<tr\b[^>]*>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi)]
    .map(m => [plain(m[1]), plain(m[2])]).filter(([label, value]) => label && /m²$/.test(value))
    .map(([label, value]) => label + ' : ' + value);
  const energy = plain(section(html, 'energie').split('<div class="scales"')[0]);
  const date = energy.match(/DPE établi le (\d{2})\/(\d{2})\/(\d{4})/i);
  const costs = energy.match(/entre ([\d ]+)\s*€ et ([\d ]+)\s*€ par an/i);
  const who = contact.match(/<div class="who">[\s\S]*?<b>([^<]+)<\/b>/i)?.[1];
  const telephone = contact.match(/href="tel:\+33([1-9]\d{8})"/i)?.[1];
  const info = contact.match(/<div class="pinfo">([\s\S]*?)<\/div>/i)?.[1] || '';
  const lots = specs.get('copropriété');
  return {
    _source_specific_fields: true,
    _exact_source_city: address[3],
    reference: id,
    mandat: plain(info).match(/Référence\s+([A-Z0-9][A-Z0-9.-]*)/i)?.[1].replace(/\.$/, ''),
    url, titre: title, transaction: 'vente', type_bien: kind,
    prix: price, ville: address[3], code_postal: address[2], quartier: address[1],
    surface, pieces: number(fact.get('pièces')), chambres: number(fact.get('chambres') || fact.get('chambre')),
    etage: /^rez-de-chaussée/i.test(floor) ? 0 : number(floor),
    nombre_etages: number(floor.match(/(?:\/|\bsur)\s*(\d+)/i)?.[1]),
    annee_construction: number(specs.get('année de construction')),
    etat_bien: specs.get('état'), chauffage: specs.get('chauffage'), exposition: specs.get('exposition'),
    copropriete: lots ? 'Oui' : undefined, nombre_lots: number(lots),
    charges_annuelles: number(specs.get('charges courantes')), taxe_fonciere: number(specs.get('taxe foncière')),
    procedure: specs.get('procédure'),
    honoraires: paragraphs(info).find(p => /^Honoraires\b/i.test(p)),
    dpe: energy.match(/Classe énergie ([A-G])\b/i)?.[1],
    ges: energy.match(/Classe climat ([A-G])\b/i)?.[1],
    consommation_energie: number(energy.match(/(\d+)\s*kWh/i)?.[1]),
    date_dpe: date ? [date[3], date[2], date[1]].join('-') : undefined,
    cout_energie_min: number(costs?.[1]), cout_energie_max: number(costs?.[2]),
    contact_nom: who ? plain(who) : undefined,
    contact_telephone: telephone ? '0' + telephone : undefined,
    description, equipements: [...new Set(features)].join('|'), surfacespieces: rooms.join('\n'),
    photos: [...photos.values()].join('|'),
  };
}

export async function readMaisonCotard(fetchHtml: Fetcher, memory: CrawlMemory | undefined, digest: (url: string) => Promise<string | null>) {
  const rows = await crawlCatalogue(catalogue.href, scope, [catalogue.href], fetchHtml, maisonCotardCatalogue,
    async (html, url) => {
      const row = parseMaisonCotard(html, url);
      if (row._sold || !row.photos) return row;
      const urls = row.photos.split('|');
      const unique = new Map<string, string>();
      for (let offset = 0; offset < urls.length; offset += 4) {
        const batch = urls.slice(offset, offset + 4);
        const digests = await Promise.all(batch.map(digest));
        for (const [i, hash] of digests.entries()) {
          if (!hash) throw Error('Photo Maison Cotard inaccessible');
          if (!unique.has(hash)) unique.set(hash, batch[i]);
        }
      }
      return {...row, photos: [...unique.values()].join('|')};
    }, memory, {maxDetails: 3});
  return Object.assign(rows, {platform: 'Maison Cotard (Squarespace)', sector: 'immobilier'});
}
