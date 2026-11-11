// Nextlogis uses a public WinImmobilier catalogue and one HTML page per property.
import { decode } from 'npm:fast-png@6.2.0';
import { sDecode } from './smart-reader.ts';
import { crawlCatalogue, type CrawlMemory } from './resumable-crawl.ts';
import { isPlaceholderPhoto } from './photo-utils.ts';

const catalogue = new URL('https://www.nextlogis.fr/annonces-immobilieres-saint-nazaire-d-aude.html');
const detailPath = /^\/annonce-immobiliere-[^/]+-(\d+)\.html$/i;
type Fetcher = (url: URL) => Promise<{text: string; url: URL}>;
export const isNextlogis = (url: URL) => /^(?:www\.)?nextlogis\.fr$/.test(url.hostname);

function text(html: string) {
  return sDecode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

function numberField(raw: string | undefined) {
  const value = raw?.match(/^\s*(\d[\d\s]*(?:[.,]\d+)?)(?=\s*(?:m²|€|$))/)?.[1];
  return value ? Number(value.replace(/\s/g, '').replace(',', '.')) : undefined;
}

export function nextlogisCatalogue(html: string, url: URL) {
  const count = html.match(/\bid="coupdd"[^>]*>\s*(\d+)\s+Annonce\(s\)/i)?.[1];
  if (count === undefined) throw Error('Compteur Nextlogis absent');
  const details = new Set<string>();
  const lists = new Set<string>();
  for (const anchor of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = anchor[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const link = new URL(sDecode(href), url);
    if (!isNextlogis(link)) continue;
    link.hash = '';
    if (/\bclass="btn_annonce"/i.test(anchor[0]) && detailPath.test(link.pathname)) {
      link.search = '';
      details.add(link.href);
    } else if (/\brel=["']next["']/i.test(anchor[0]) && link.pathname === catalogue.pathname) {
      lists.add(link.href);
    }
  }
  return { details: [...details], lists: [...lists], count: Number(count) };
}

function contactOf(description: string, html: string) {
  const contact = description.match(/\bcontact(?:ez|er)\b([\s\S]*?)(?=Les informations sur les risques|$)/i)?.[1] || '';
  const name = contact.match(/^\s*([\p{L}'’\-]+\s+[\p{L}'’\-]+)(?=\s*(?:,|\bde\b|\bau\b))/iu)?.[1];
  const person = name && !/agence|immobilier|nextlogis/i.test(name) ? name : undefined;
  const phones = [...new Set([...contact.matchAll(/\b0[1-9](?:[ .-]*\d){8}\b/g)].map(m => m[0].replace(/\D/g, '')))];
  const mobile = phones.filter(phone => /^0[67]/.test(phone));
  const agencyPhone = html.match(/<span\b[^>]*id="tele"[^>]*>\s*(0[1-9](?:[ .-]*\d){8})/i)?.[1]?.replace(/\D/g, '');
  return {
    contact_nom: person || (phones.length || agencyPhone ? 'Nextlogis (agence)' : undefined),
    contact_telephone: person ? (mobile.length === 1 ? mobile[0] : phones.length === 1 ? phones[0] : undefined) : (phones[0] || agencyPhone),
  };
}

export function parseNextlogis(html: string, url: string) {
  const page = new URL(url);
  const id = detailPath.exec(page.pathname)?.[1];
  const canonical = html.match(/property="og:url"\s+content="([^"]+)"/i)?.[1];
  if (!id || !isNextlogis(page) || !canonical ||
      !isNextlogis(new URL(canonical)) || new URL(canonical).pathname !== page.pathname) {
    throw Error('Identité de fiche Nextlogis incohérente');
  }
  const heading = text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  if (/^(?:vendu|sous compromis|sous offre acceptée)\b/i.test(heading)) return {_sold: 1};
  const title = /^(.+?)\s*-\s*([\d .]+(?:,\d+)?)\s*€\s*(.*?)\s*\((\d{5})\)\s*-\s*Référence\s+(\S+)/i.exec(heading);
  const section = html.match(/<section\b[^>]*id="description_bien"[^>]*>([\s\S]*?)<\/section>/i)?.[1];
  if (!title || !section) throw Error('Titre ou description Nextlogis absent');
  const price = Number(title[2].replace(/[ .]/g, '').replace(',', '.'));
  if (!(price > 0)) throw Error('Prix Nextlogis invalide');
  const description = text(section.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
  const fields = new Map([...section.matchAll(/<b>([^<]+)<\/b>\s*<span class="res">([^<]*)<\/span>/gi)]
    .map(m => [text(m[1]).replace(/\s*:\s*$/, '').toLowerCase(), text(m[2])]));
  if (fields.get('référence') !== title[5]) throw Error('Mandat Nextlogis incohérent');
  const gallery = html.match(/<ul class="ei-slider-large">([\s\S]*?)<\/ul>/i)?.[1] || '';
  const photos = new Set<string>();
  for (const img of gallery.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const photo = new URL(sDecode(img[1]), page);
    if (photo.protocol === 'https:' && isNextlogis(photo) &&
        /^\/Photo_\d+\.(?:jpe?g|png|webp)$/i.test(photo.pathname) && !isPlaceholderPhoto(photo.href)) {
      photo.hash = '';
      photo.search = '';
      photos.add(photo.href);
    }
  }
  if (!photos.size) throw Error('Galerie Nextlogis absente');
  const facts = (name: string) => numberField(fields.get(name));
  const terrain = /terrain/i.test(title[1]);
  const equipment = [];
  for (const [label, value] of fields) {
    if (/^(climatisation|piscine|ascenseur|terrasse|accès handicapé|tout à l'égout)$/.test(label) && /^oui$/i.test(value)) equipment.push(label);
  }
  for (const label of ['surface jardin', 'surface terrasse']) {
    const area = facts(label);
    if (area && area > 0) equipment.push(label + ' : ' + area + ' m²');
  }
  const parking = fields.get('stationnement');
  if (parking && !/^aucun$/i.test(parking)) equipment.push(parking);
  const diagnosticPath = section.match(/\bsrc=["'](img\/dpe\/depges-\d+-\d+\.jpg)["']/i)?.[1];
  return {
    ...contactOf(description, html),
    _source_specific_fields: true,
    _exact_source_city: title[3],
    reference: id,
    mandat: title[5],
    url,
    titre: title[1] + ' ' + title[3],
    type_bien: title[1],
    transaction: /\bà louer\b/i.test(title[1]) ? 'location' : 'vente',
    prix: price,
    ville: title[3],
    code_postal: title[4],
    description,
    photos: [...photos].join('|'),
    surface: facts('surface habitable') ?? facts('surface_commerciale'),
    surface_terrain: terrain ? facts('surface constructible') : undefined,
    pieces: facts('nb. de pièces'),
    chambres: facts('nb. de chambre'),
    etage: facts('étage'),
    nombre_etages: facts('nb. étage'),
    annee_construction: facts('année de construction'),
    chauffage: fields.get('type de chauffage'),
    equipements: equipment.join('|'),
    copropriete: fields.get('en copropriété'),
    charges_annuelles: /charges annuelles/i.test(description) ? facts('charges prévisionnels') : undefined,
    nombre_lots: facts('nombre lots'),
    honoraires: text(section.match(/<span class="compc">([\s\S]*?)<\/span>/i)?.[1] || ''),
    consommation_energie: facts('dpe'),
    emission_ges: facts('ges'),
    diagnosticUrl: diagnosticPath ? new URL(diagnosticPath, page).href : undefined,
  };
}

// The published 650x390 template selects a class with a dark line through the middle of a bar.
// Empty scales have no such line. Read the image, never infer a letter from a filename or a number.
export function nextlogisEnergy(bytes: Uint8Array) {
  const empty = {dpe: undefined, ges: undefined};
  try {
    if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80) return empty;
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (header.getUint32(16) !== 650 || header.getUint32(20) !== 390) return empty;
    const image = decode(bytes);
    if (image.width !== 650 || image.height !== 390 || image.depth !== 8 || image.channels !== 3) return empty;
    const centers = [71, 112, 153, 194, 235, 276, 317];
    const grade = (x: number) => {
      const selected = centers.flatMap((center, index) => {
        for (let y = center - 6; y <= center + 6; y++) {
          let dark = 0;
          for (let xx = x; xx < x + 45; xx++) {
            const offset = (y * 650 + xx) * 3;
            if (image.data[offset] < 80 && image.data[offset + 1] < 80 && image.data[offset + 2] < 80) dark++;
          }
          if (dark >= 42) return [index];
        }
        return [];
      });
      return selected.length === 1 ? 'ABCDEFG'[selected[0]] : undefined;
    };
    return {dpe: grade(12), ges: grade(340)};
  } catch {
    return empty;
  }
}

export async function readNextlogis(fetchHtml: Fetcher, memory: CrawlMemory | undefined, digest: (url: string) => Promise<string | null>) {
  const first = await fetchHtml(catalogue);
  if (!isNextlogis(first.url) || first.url.pathname !== catalogue.pathname) throw Error('Catalogue Nextlogis hors périmètre');
  const list = nextlogisCatalogue(first.text, first.url);
  const fetchPage: Fetcher = async url => url.href === catalogue.href ? first : fetchHtml(url);
  const rows = await crawlCatalogue(catalogue.href, 'nextlogis-v1', [catalogue.href], fetchPage,
    (html, url) => nextlogisCatalogue(html, url), async (html, url) => {
      const row = parseNextlogis(html, url);
      if (row._sold) return row;
      const hashes = new Map<string, string>();
      for (const photo of row.photos!.split('|')) {
        const hash = await digest(photo);
        if (!hash) throw Error('Photo Nextlogis inaccessible');
        if (!hashes.has(hash)) hashes.set(hash, photo);
      }
      let diagnostics = {};
      if (row.diagnosticUrl && (row.consommation_energie || row.emission_ges)) {
        const response = await fetch(row.diagnosticUrl, {redirect: 'error', signal: AbortSignal.timeout(8000)});
        if (!response.ok || !response.body) throw Error('Diagnostic Nextlogis inaccessible');
        const stream = response.body.getReader();
        const bytes = new Uint8Array(250000);
        let length = 0;
        for (;;) {
          const chunk = await stream.read();
          if (chunk.done) break;
          if (length + chunk.value.length > bytes.length) {
            await stream.cancel();
            throw Error('Diagnostic Nextlogis trop volumineux');
          }
          bytes.set(chunk.value, length);
          length += chunk.value.length;
        }
        const read = nextlogisEnergy(bytes.subarray(0, length));
        diagnostics = {dpe: row.consommation_energie ? read.dpe : undefined, ges: row.emission_ges ? read.ges : undefined};
      }
      return {...row, ...diagnostics, photos: [...hashes.values()].join('|')};
    }, memory, {expectedTotal: list.count, maxDetails: 4});
  return Object.assign(rows, {platform: 'Nextlogis (WinImmobilier)', sector: 'immobilier'});
}
