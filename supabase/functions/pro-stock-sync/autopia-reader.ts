import { dedupePhotos } from './photo-utils.ts';

const site = new URL('https://autopiacars.fr/');
const stock = new URL('api/api.php?action=vehicles', site);
export const isAutopia = (url: URL) => /^(?:www\.)?autopiacars\.fr$/i.test(url.hostname);

export async function readAutopia(fetchPage: (url: URL) => Promise<{text: string; url: URL}>, preview = false) {
  const [home, response] = await Promise.all([fetchPage(site), fetchPage(stock)]);
  if (response.url.href !== stock.href || home.url.origin !== site.origin ||
      !/38600\s+Fontaine/i.test(home.text)) throw Error('Catalogue ou adresse Autopia non reconnus');
  const phone = home.text.match(/class="contact-head"[^>]*>\s*<a href="tel:\+33([1-9]\d{8})"/i)?.[1];
  const vehicles = JSON.parse(response.text);
  if (!Array.isArray(vehicles) || !vehicles.length) throw Error('Stock réel Autopia absent');
  const ids = new Set<string>();
  const rows = [];
  for (const car of vehicles) {
    const id = String(car.id);
    if (!/^\d{6,}$/.test(id) || ids.has(id)) throw Error('Référence Autopia invalide ou répétée');
    ids.add(id);
    if (car.status !== 'available' && !(preview && car.status === 'reserved')) continue;
    const photos: string[] = dedupePhotos((Array.isArray(car.images) ? car.images : []).map((img: string) => new URL(img, site))
      .filter((img: URL) => img.origin === site.origin && img.pathname.startsWith('/uploads/vehicles/' + id + '_'))
      .map((img: URL) => img.href));
    rows.push({
      reference: id, url: site.href + '#stock', type: 'voiture', etat: 'occasion',
      titre: [car.brand, car.model, car.trim].filter(Boolean).join(' '),
      marque: car.brand, modele: car.model, finition: car.trim, prix: car.price,
      annee: car.year, kilometrage: car.km, carburant: car.fuel, boite: car.gear,
      couleur: car.color, puissance_din: car.power, garantie: car.warranty,
      description: [car.status === 'reserved' ? 'Disponibilité : sous réservation.' : '', car.description].filter(Boolean).join('\n\n'),
      equipements: Array.isArray(car.options) ? car.options.join('|') : '',
      photos: photos.join('|'), ville: 'Fontaine', code_postal: '38600',
      contact_nom: phone ? 'Autopia Cars 38 (garage)' : undefined,
      contact_telephone: phone ? '0' + phone : undefined,
    });
  }
  return Object.assign(rows, {platform: 'Autopia Cars 38', sector: 'vehicules', total: rows.length,
    stats: {pages: 1, details: rows.length, expected_total: rows.length, remaining: 0, cycle_complete: true}});
}
