import { sDecode } from './smart-reader.ts';
import { dedupePhotos } from './photo-utils.ts';

const catalogue = new URL('https://www.exclusivegt.fr/nos-v%C3%A9hicules/en-stock/');
export const isExclusiveGt = (url: URL) => /^(?:www\.)?exclusivegt\.fr$/i.test(url.hostname);
const text = (html: string) => sDecode(html.replace(/<br\s*\/?\s*>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ''))
  .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');

export function parseExclusiveGt(html: string, url: URL) {
  const modules = html.split(/(?=<div\s+id="cc-m-\d+"\s+class="j-module\b)/);
  const rows = [];
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    const reference = module.match(/^<div id="(cc-m-\d+)" class="[^"]*\bj-text\b/)?.[1];
    if (!reference) continue;
    const description = text(module.split('</p>').slice(0, -1).join('</p>') + '</p>');
    if (!/\bMEC\s*:/i.test(description)) continue;
    const [title, ...lines] = description.split('\n');
    if (/\b(?:vendu|réservé|neuf)\b/i.test(title) || lines.some(line => /^(?:vendu|réservé)\b/i.test(line))) continue;
    const specs = description.match(/\bMEC\s*:\s*(\d{2}\/((?:19|20)\d{2}))\s*,\s*([\d ]+)\s*km/i);
    const price = description.match(/\bTarif\s*:\s*([\d ]+)\s*€/i);
    const gallery = modules[i + 1] || '';
    if (!specs || !price || !/^<div id="cc-m-\d+" class="[^"]*\bj-gallery\b/.test(gallery)) {
      throw Error('Véhicule Exclusive GT incomplet : ' + title);
    }
    const photos: string[] = dedupePhotos([...gallery.matchAll(/data-href="(https:\/\/image\.jimcdn\.com\/[^"]+)"/gi)]
      .map(image => sDecode(image[1])));
    if (!photos.length) throw Error('Galerie Exclusive GT absente : ' + title);
    rows.push({reference, url: new URL('#' + reference, url).href, titre: title.replace(/,$/, ''),
      type: 'voiture', etat: 'occasion', annee: specs[2], mise_en_circulation: specs[1],
      kilometrage: Number(specs[3].replace(/ /g, '')), prix: Number(price[1].replace(/ /g, '')),
      description: lines.filter(line => !/^Tarif\s*:/i.test(line)).join('\n'),
      photos: photos.join('|'), ville: 'Pontarlier', code_postal: '25300'});
  }
  return rows;
}

export async function readExclusiveGt(fetchPage: (url: URL) => Promise<{text: string; url: URL}>) {
  const page = await fetchPage(catalogue);
  if (!isExclusiveGt(page.url) || page.url.pathname !== catalogue.pathname ||
      !/Exclusive GT,\s*25300 Pontarlier/i.test(page.text)) throw Error('Catalogue Exclusive GT non reconnu');
  const rows = parseExclusiveGt(page.text, page.url);
  if (!rows.length) throw Error('Aucune occasion Exclusive GT lisible');
  return Object.assign(rows, {platform: 'Exclusive GT (Jimdo)', sector: 'vehicules', total: rows.length,
    stats: {pages: 1, details: rows.length, expected_total: rows.length, remaining: 0, cycle_complete: true}});
}
