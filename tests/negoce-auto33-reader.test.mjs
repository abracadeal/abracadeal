import assert from 'node:assert/strict';
import {parseNegoceAuto33} from '../supabase/functions/pro-stock-sync/negoce-auto33-reader.ts';

const id = '11358e50-e537-4f47-8ca8-e2a17ed42b39';
const url = 'https://www.negoceauto33.fr/vehicules/' + id;
const photo = 'https://wlqhbilgzhstgdmsrpgu.supabase.co/storage/v1/object/public/vehicle-photos/mercedes.jpg';
const listing = {
  id, brand: 'Mercedes-Benz', model: 'GLC 220 4Matic', status: 'Disponible',
  price: 18200, on_promotion: true, discount_percent: 20, mileage: 147000,
  year: 2018, real_power: '170', fiscal_power: 9, seats: 5, doors: 5,
  description: 'Options et équipements propres à ce véhicule.',
  primary_image_url: photo, image_urls: [photo, photo + '?v=2', '/negoce-auto-33-logo.webp'],
};
const row = parseNegoceAuto33(listing, url, '0780979753');
assert.equal(row.prix, 14560);
assert.equal(row.photos, photo);
assert.equal(row.kilometrage, 147000);
assert.equal(row.puissance_din, '170');
assert.equal(row.description, listing.description);
assert.equal(row.contact_telephone, '0780979753');
assert.equal(parseNegoceAuto33({...listing, on_promotion: false}, url).prix, 18200);
assert.equal(parseNegoceAuto33({...listing, status: 'Sous réservation'}, url)._sold, 1);
assert.equal(parseNegoceAuto33({...listing, mileage: 0}, url)._sold, 1);
assert.throws(() => parseNegoceAuto33(listing, url + '-other'), /Identité/);
assert.throws(() => parseNegoceAuto33({...listing, primary_image_url: photo.replace('/public/', '/sign/')}, url), /galerie publique/);
console.log('Négoce Auto 33: displayed promotional price, scope, exclusions and own gallery');
