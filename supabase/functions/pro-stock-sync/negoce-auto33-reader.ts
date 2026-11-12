import { isPlaceholderPhoto } from './photo-utils.ts';
import { crawlCatalogue, type CrawlMemory } from './resumable-crawl.ts';

const catalogue = new URL('https://www.negoceauto33.fr/vehicules');
const apiOrigin = 'https://wlqhbilgzhstgdmsrpgu.supabase.co';
const scope = 'negoce-auto33-v1:';
// Quasi-identical second rear view in the GLB's published gallery.
const duplicateRearView = '805e95fc679da51bbd730bcb0ff93069f56a2d158fbcad50424f4e089e28e594';
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const listFields = 'id,brand,model,year,mileage,fuel,transmission,real_power,fiscal_power,price,primary_image_url,image_urls,status,urgent_sale,on_promotion,discount_percent';
const detailFields = listFields + ',doors,seats,description';
type Fetcher = (url: URL) => Promise<{text: string; url: URL}>;

type Vehicle = {
  id: string; brand: string; model: string; status: string; price: number;
  year?: number; mileage?: number; fuel?: string; transmission?: string; real_power?: string;
  fiscal_power?: number; doors?: number; seats?: number; description?: string;
  primary_image_url?: string; image_urls?: string[]; on_promotion?: boolean; discount_percent?: number;
};

export const isNegoceAuto33 = (url: URL) => /^(?:www\.)?negoceauto33\.fr$/.test(url.hostname);

function publicKey(script: string) {
  const key = script.match(/"https:\/\/wlqhbilgzhstgdmsrpgu\.supabase\.co","(sb_publishable_[\w-]+|eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+)"/)?.[1];
  if (!key || key.startsWith('sb_publishable_')) return key;
  try {
    const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role === 'anon' ? key : undefined;
  } catch {
    return undefined;
  }
}

function isAvailable(vehicle: Vehicle) {
  return vehicle.status === 'Disponible' && vehicle.mileage !== 0;
}

export function parseNegoceAuto33(vehicle: Vehicle, url: string, phone?: string) {
  if (!uuid.test(vehicle.id) || new URL(url).href !== new URL('/vehicules/' + vehicle.id, catalogue).href) {
    throw Error('Identité de véhicule Négoce Auto 33 incohérente');
  }
  if (!isAvailable(vehicle)) return {_sold: 1};
  const price = Number(vehicle.price);
  const discount = vehicle.on_promotion ? Number(vehicle.discount_percent || 0) : 0;
  if (!(price > 0) || !Number.isFinite(discount) || discount < 0 || discount >= 100 ||
      !vehicle.brand?.trim() || !vehicle.model?.trim()) throw Error('Fiche Négoce Auto 33 incomplète');
  // The vehicle detail shows the discounted amount and labels the full price as the pre-promotion amount.
  const displayedPrice = Math.round(price * (100 - discount)) / 100;
  const photos = new Map<string, string>();
  for (const value of [vehicle.primary_image_url, ...(vehicle.image_urls || [])]) {
    if (!value || /(?:^|\/)negoce-auto-33-logo\.webp(?:[?#]|$)/i.test(value) || isPlaceholderPhoto(value)) continue;
    const image = new URL(value);
    if (image.origin !== apiOrigin || !image.pathname.startsWith('/storage/v1/object/public/vehicle-photos/')) {
      throw Error('Photo Négoce Auto 33 hors de la galerie publique');
    }
    if (!photos.has(image.pathname)) photos.set(image.pathname, image.href);
  }
  const brand = vehicle.brand.trim(), model = vehicle.model.trim();
  return {
    reference: vehicle.id, url, titre: brand + ' ' + model, marque: brand, modele: model,
    prix: displayedPrice, annee: vehicle.year, kilometrage: vehicle.mileage, carburant: vehicle.fuel,
    boite: vehicle.transmission, puissance_din: vehicle.real_power, puissance_fiscale: vehicle.fiscal_power,
    portes: vehicle.doors, places: vehicle.seats, type: 'voiture', etat: 'occasion',
    description: vehicle.description?.trim(), photos: [...photos.values()].join('|'),
    contact_nom: phone ? 'Négoce Auto 33 (garage)' : undefined, contact_telephone: phone,
  };
}

export async function readNegoceAuto33(fetchHtml: Fetcher, memory: CrawlMemory | undefined, digest: (url: string) => Promise<string | null>) {
  const [page, home] = await Promise.all([fetchHtml(catalogue), fetchHtml(new URL('/', catalogue))]);
  if (!isNegoceAuto33(page.url) || page.url.pathname !== catalogue.pathname) throw Error('Catalogue Négoce Auto 33 hors périmètre');
  const phones = [...new Set([...page.text.matchAll(/href="tel:\+33([1-9]\d{8})"/gi)].map(m => '0' + m[1]))];
  const phone = phones.length === 1 ? phones[0] : undefined;
  const location = isNegoceAuto33(home.url) && /33700\s+Mérignac/i.test(home.text.replace(/<[^>]*>/g, ' ')) ?
    {city: 'Mérignac', postal: '33700'} : undefined;

  const scripts = [...new Set([...page.text.matchAll(/<script\b[^>]*\bsrc="(\/_next\/static\/immutable\/chunks\/[\w.-]+\.js)"/gi)]
    .map(m => m[1]))];
  let key: string | undefined;
  for (let index = 0; index < Math.min(scripts.length, 16) && !key; index += 4) {
    const assets = await Promise.all(scripts.slice(index, index + 4).map(path => fetchHtml(new URL(path, catalogue))));
    for (const asset of assets) {
      if (!isNegoceAuto33(asset.url) || !asset.url.pathname.startsWith('/_next/static/immutable/chunks/')) {
        throw Error('Script Négoce Auto 33 hors périmètre');
      }
      key ||= publicKey(asset.text);
    }
  }
  if (!key) throw Error('Configuration de lecture publique Négoce Auto 33 absente');

  async function request(params: Record<string, string>, count = false) {
    const url = new URL('/rest/v1/vehicles', apiOrigin);
    url.search = new URLSearchParams(params).toString();
    const response = await fetch(url, {
      headers: {apikey: key!, Accept: 'application/json', ...(key!.startsWith('eyJ') ? {Authorization: 'Bearer ' + key} : {}),
        ...(count ? {Prefer: 'count=exact'} : {})},
      redirect: 'error', signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw Error('Catalogue public Négoce Auto 33 HTTP ' + response.status);
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) throw Error('Catalogue Négoce Auto 33 invalide');
    return {rows: rows as Vehicle[], total: Number(response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1])};
  }

  const source = new Map<string, Vehicle>();
  let total: number | undefined;
  for (let offset = 0; total === undefined || offset < total;) {
    const part = await request({select: listFields, status: 'in.(Disponible,"Sous réservation")',
      order: 'created_at.desc,id.asc', limit: '50', offset: String(offset)}, true);
    if (!Number.isSafeInteger(part.total) || part.total > 1000 || (total !== undefined && part.total !== total) ||
        offset + part.rows.length > part.total || (!part.rows.length && offset < part.total)) {
      throw Error('Pagination Négoce Auto 33 incohérente');
    }
    total = part.total;
    for (const row of part.rows) {
      if (!uuid.test(row.id) || source.has(row.id) || !['Disponible', 'Sous réservation'].includes(row.status)) {
        throw Error('Identité ou statut du catalogue Négoce Auto 33 incohérent');
      }
      source.set(row.id, row);
    }
    offset += part.rows.length;
  }
  const details = [...source.values()].filter(isAvailable).map(row => new URL('/vehicules/' + row.id, catalogue).href);
  if (!details.length) throw Error('Aucun véhicule d’occasion disponible dans le catalogue Négoce Auto 33');
  const snapshot = JSON.stringify([...source.values()]);
  const fingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
  const version = Array.from(new Uint8Array(fingerprint), byte => byte.toString(16).padStart(2, '0')).join('');
  const rows = await crawlCatalogue(catalogue.href, scope + version, [catalogue.href], async url => {
    if (url.href === catalogue.href) return {text: '', url};
    const id = url.pathname.split('/').pop() || '';
    if (url.origin !== catalogue.origin || url.pathname !== '/vehicules/' + id || !uuid.test(id) ||
        !source.has(id) || !isAvailable(source.get(id)!)) throw Error('Fiche Négoce Auto 33 hors du stock');
    const detail = await request({select: detailFields, id: 'eq.' + id});
    if (detail.rows.length !== 1) throw Error('Fiche publique Négoce Auto 33 introuvable');
    return {text: JSON.stringify(detail.rows[0]), url};
  }, () => ({lists: [], details}), async (json, url) => {
    const detail: Vehicle = JSON.parse(json);
    const listed = source.get(detail.id);
    if (!listed || listed.price !== detail.price || listed.status !== detail.status ||
        listed.on_promotion !== detail.on_promotion || listed.discount_percent !== detail.discount_percent) {
      throw Error('Fiche et catalogue Négoce Auto 33 désynchronisés');
    }
    const row = parseNegoceAuto33(detail, url, phone);
    if (row._sold || !row.photos) return row;
    const unique = new Map<string, string>(), photos = row.photos.split('|');
    for (let index = 0; index < photos.length; index += 4) {
      const batch = photos.slice(index, index + 4);
      const hashes = await Promise.all(batch.map(digest));
      for (const [i, hash] of hashes.entries()) {
        if (!hash) throw Error('Photo Négoce Auto 33 inaccessible');
        if (hash !== duplicateRearView && !unique.has(hash)) unique.set(hash, batch[i]);
      }
    }
    return {...row, photos: [...unique.values()].join('|')};
  }, memory, {expectedTotal: details.length, maxDetails: 2});
  return Object.assign(rows, {platform: 'Négoce Auto 33 (Supabase)', sector: 'vehicules', siteLocation: location});
}
