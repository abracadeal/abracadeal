// ERA's public SSR page already contains its current search result.
// Preview only: no image URLs, binary downloads, API calls or writes.
export function eraPreviewScope(url: URL) {
  return url.hostname === 'www.eraimmobilier.com' && url.protocol === 'https:'
    && /^\/achat\/[^/]+\/[^/]+\/[^/]+-\d+\/?$/.test(url.pathname)
    && !url.username && !url.password && !url.port;
}

export function parseEraPreview(html: string, pageUrl: string) {
  const url = new URL(pageUrl);
  if (!eraPreviewScope(url)) throw Error('Aperçu ERA : adresse de recherche locale requise.');
  const cityId = url.pathname.replace(/\/$/, '').match(/-(\d+)$/)![1];
  const script = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .find(m => /\bid\s*=\s*["']ng-state["']/i.test(m[1]) && /\btype\s*=\s*["']application\/json["']/i.test(m[1]));
  if (!script) throw Error('Aperçu ERA : données de recherche absentes de la page.');
  let state: any;
  try { state = JSON.parse(script[2]); } catch { throw Error('Aperçu ERA : données de recherche illisibles.'); }
  const matches = Object.entries(state).filter(([key]) => {
    if (!key.startsWith('ssr-cache:')) return false;
    try {
      const api = new URL(key.slice('ssr-cache:'.length));
      return api.origin === 'https://api.eraimmobilier.com' && api.pathname === '/api/v2/annonces/search'
        && api.searchParams.get('geo_ville_id') === cityId
        && Number(api.searchParams.get('page') || 1) === Number(url.searchParams.get('page') || 1)
        && api.searchParams.get('type_annonce')?.toLowerCase() === 'vente';
    } catch { return false; }
  });
  if (matches.length !== 1) throw Error('Aperçu ERA : recherche locale absente ou ambiguë.');
  const result: any = matches[0][1];
  if (!Array.isArray(result?.data)) throw Error('Aperçu ERA : liste de biens invalide.');
  const rows: any[] = [], seen = new Set<string>();
  for (const item of result.data) {
    if (!item || String(item.geo_ville_id) !== cityId || String(item.type_annonce).toLowerCase() !== 'vente') continue;
    const id = String(item.id || '');
    if (!/^\d+$/.test(id) || seen.has(id) || !item.libelle || !Number.isFinite(item.prix) || item.prix < 0) continue;
    seen.add(id);
    const type = String(item.type_bien || '').toLowerCase();
    if (!/appartement|maison|villa|terrain|parking|garage|bureau|local|commerce|immeuble/.test(type)) continue;
    rows.push({ reference: id, titre: String(item.libelle).slice(0, 300), prix: String(item.prix),
      ville: String(item.ville || ''), code_postal: String(item.code_postal || ''),
      type_bien: /villa/i.test(type) ? 'maison' : type, transaction: 'vente',
      surface: item.surface_habitable ?? '', surface_terrain: item.surface_terrain ?? '',
      pieces: item.nb_pieces ?? '', chambres: item.nb_chambres ?? '',
      // Counts only, explicitly not photo paths or descriptions copied into storage.
      photos: '', source_photo_count: Array.isArray(item.photo) ? item.photo.length : 0,
      url: `https://www.eraimmobilier.com/annonces/${id}` });
  }
  if (!rows.length) throw Error('Aperçu ERA : aucun bien exploitable sur cette page.');
  (rows as any).platform = 'ERA · aperçu de recherche locale';
  (rows as any).partial = true;
  (rows as any).preview_only = true;
  (rows as any).photos_withheld = true;
  (rows as any).source_total = Number.isFinite(result.meta?.total) ? result.meta.total : null;
  (rows as any).source_page = result.meta?.page ?? Number(url.searchParams.get('page') || 1);
  (rows as any).source_per_page = result.meta?.per_page ?? null;
  (rows as any).page_links = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].flatMap(m => {
    try {
      const link = new URL(m[1].replace(/&amp;/g, '&'), url);
      const page = Number(link.searchParams.get('page'));
      if (link.origin !== url.origin || link.pathname !== url.pathname || !Number.isSafeInteger(page) || page < 1) return [];
      if ([...link.searchParams.keys()].some(key => key !== 'page')) return [];
      return [link.toString()];
    } catch { return []; }
  });
  return rows;
}

export async function readAllEraPreview(requested: URL,
  fetchHtml: (url: URL) => Promise<{text: string; url: URL}>, now = Date.now) {
  if (!eraPreviewScope(requested) || [...requested.searchParams.keys()].some(key => key !== 'page'))
    throw Error('Aperçu ERA : adresse locale sans filtre supplémentaire requise.');
  const start = now();
  const first = new URL(requested); first.search = ''; first.hash = '';
  const queue = [first], visited = new Set<number>(), byId = new Map<string, any>();
  let total: number | null = null, expectedPages = 0;
  for (let i = 0; i < queue.length; i++) {
    if (visited.size >= 50 || now() - start > 75000) throw Error('Lecture ERA incomplète : budget dépassé. Aucun résultat présenté comme complet.');
    const page = queue[i], pageNumber = Number(page.searchParams.get('page') || 1);
    if (visited.has(pageNumber)) continue;
    const response = await fetchHtml(page);
    if (response.url.origin !== first.origin || response.url.pathname !== first.pathname
      || Number(response.url.searchParams.get('page') || 1) !== pageNumber)
      throw Error('Aperçu ERA : la page a redirigé vers une autre recherche.');
    const rows = parseEraPreview(response.text, page.toString());
    const n = (rows as any).source_total, perPage = (rows as any).source_per_page;
    if (!Number.isSafeInteger(n) || n < 1 || !Number.isSafeInteger(perPage) || perPage < 1
      || (rows as any).source_page !== pageNumber) throw Error('Lecture ERA : pagination non vérifiable.');
    if (total !== null && n !== total) throw Error('Le stock ERA a changé pendant la lecture. Relancez l’aperçu.');
    total = n; expectedPages = Math.ceil(n / perPage);
    if (expectedPages > 50) throw Error('Cette recherche ERA dépasse la limite de 50 pages.');
    visited.add(pageNumber);
    for (const row of rows) byId.set(row.reference, row);
    for (const link of (rows as any).page_links) {
      const next = new URL(link), number = Number(next.searchParams.get('page'));
      if (number <= expectedPages && !visited.has(number)
        && !queue.some(u => Number(u.searchParams.get('page') || 1) === number)) queue.push(next);
    }
  }
  if (visited.size !== expectedPages || byId.size !== total)
    throw Error(`Lecture ERA incomplète : ${byId.size} biens distincts lus sur ${total ?? '?'} annoncés. Relancez l’aperçu.`);
  const rows = [...byId.values()];
  Object.assign(rows, { platform: 'ERA · aperçu de recherche locale', partial: false,
    preview_only: true, photos_withheld: true, source_total: total, source_pages: visited.size });
  return rows;
}
