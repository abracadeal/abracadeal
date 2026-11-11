// Grange Cars publishes its available collection vehicles as heading/album pairs on one page.
import { sDecode } from './smart-reader.ts';
import { isPlaceholderPhoto } from './photo-utils.ts';

const stock = new URL('https://www.grange-cars.fr/vehicules-a-vendre');
const mediaHost = 'local-fr-public.s3.eu-west-3.amazonaws.com';
type Fetcher = (url: URL) => Promise<{text: string; url: URL}>;

export const isGrangeCars = (url: URL) => /^(?:www\.)?grange-cars\.fr$/.test(url.hostname);

function text(html: string) {
  return sDecode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function businessContact(html: string) {
  for (const script of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const business = JSON.parse(script[1]);
      if (business['@type'] !== 'LocalBusiness' || !/^grange cars$/i.test(business.name)) continue;
      const address = business.address;
      if (!address?.addressLocality || !/^\d{5}$/.test(address.postalCode)) continue;
      return {
        ville: address.addressLocality,
        code_postal: address.postalCode,
        contact_nom: business.telephone ? business.name + ' (garage)' : undefined,
        contact_telephone: business.telephone || undefined,
      };
    } catch {
      // An unrelated or malformed JSON-LD block does not identify this garage.
    }
  }
  throw Error('Adresse publiée de Grange Cars introuvable');
}

export function parseGrangeCars(html: string) {
  const body = html.split(/<footer\b/i)[0];
  const headings = [...body.matchAll(/<h3\b[^>]*\bid="wt-container-instance-(\d+)"[^>]*>([\s\S]*?)<\/h3>/gi)];
  const start = headings.findIndex(heading => /^Nos véhicules disponibles à la vente$/i.test(text(heading[2])));
  if (start < 0) throw Error('Rubrique des véhicules disponibles Grange Cars absente');
  const section = body.slice(headings[start].index);
  if (/<(?:a|link)\b[^>]*\brel=["']next["']|data-next-page=|href=["'][^"']*\/vehicules-a-vendre(?:\/page\/|\?page=)/i.test(section)) {
    throw Error('Pagination Grange Cars non reconnue');
  }
  const contact = businessContact(html);
  const rows = [];
  const seen = new Set<string>();
  for (let i = start + 1; i < headings.length; i++) {
    const heading = headings[i];
    const block = body.slice(heading.index + heading[0].length, headings[i + 1]?.index ?? body.length);
    const label = text(heading[2]);
    if (/\b(?:vendue?s?|réservée?s?|en commande|0\s*km|neuve?|bientôt)\b/i.test(label)) continue;

    const price = /^(.*?)\s*[-–—]\s*(\d[\d .]*)(?:,(\d{2}))?\s*€$/.exec(label);
    const albums = [...block.matchAll(/\bid="album-block-configuration-(\d+)"/g)];
    if (!price || albums.length !== 1) throw Error('Bloc véhicule Grange Cars incomplet');
    if (seen.has(heading[1])) throw Error('Référence Grange Cars répétée');
    seen.add(heading[1]);

    const photos = new Set<string>();
    for (const anchor of block.matchAll(/<a\b[^>]*>/gi)) {
      if (!/\bclass="fancybox"/i.test(anchor[0]) || !anchor[0].includes('rel="abc-' + albums[0][1] + '"')) continue;
      const href = /\bhref="([^"]+)"/i.exec(anchor[0])?.[1];
      if (!href) continue;
      const photo = new URL(sDecode(href), stock);
      if (photo.protocol !== 'https:' || photo.hostname !== mediaHost ||
          !photo.pathname.startsWith('/prod/webtool/userfiles/102041/') ||
          !/\.(?:jpe?g|png|webp)$/i.test(photo.pathname) || isPlaceholderPhoto(photo.href)) continue;
      photo.search = '';
      photo.hash = '';
      photos.add(photo.href);
    }
    if (!photos.size) throw Error('Galerie Grange Cars absente');

    const title = price[1].trim();
    const amount = Number(price[2].replace(/[ .]/g, '') + (price[3] ? '.' + price[3] : ''));
    if (!title || !(amount > 0)) throw Error('Titre ou prix Grange Cars invalide');
    const namedModel = /^(Alpine|Porsche|Chevrolet|Austin Healey)\s+(.+)$/i.exec(title);
    const year = /\b(?:19\d{2}|20[0-2]\d)\b/.exec(title)?.[0];
    rows.push({
      ...contact,
      reference: heading[1],
      url: stock.href + '#wt-container-instance-' + heading[1],
      titre: title,
      prix: amount,
      type: 'voiture',
      etat: 'occasion',
      marque: namedModel?.[1],
      modele: namedModel?.[2],
      annee: year ? Number(year) : undefined,
      photos: [...photos].join('|'),
    });
  }
  if (!rows.length) throw Error('Aucun véhicule disponible confirmé chez Grange Cars');
  return rows;
}

export async function readGrangeCars(fetchHtml: Fetcher, digest: (url: string) => Promise<string | null>) {
  const page = await fetchHtml(stock);
  if (!isGrangeCars(page.url) || page.url.pathname.replace(/\/$/, '') !== stock.pathname) {
    throw Error('Catalogue Grange Cars redirigé hors périmètre');
  }
  const rows = parseGrangeCars(page.text);
  for (const row of rows) {
    const photos = new Map<string, string>();
    for (const url of row.photos.split('|')) {
      const hash = await digest(url);
      if (!hash) throw Error('Photo Grange Cars inaccessible');
      if (!photos.has(hash)) photos.set(hash, url);
    }
    row.photos = [...photos.values()].join('|');
  }
  return Object.assign(rows, {
    platform: 'Grange Cars (Local.fr)',
    sector: 'vehicules',
    total: rows.length,
    partial: false,
    stats: {pages: 1, details: rows.length, remaining: 0, remaining_lists: 0, failed: [], cycle_complete: true},
  });
}
