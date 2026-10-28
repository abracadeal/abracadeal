// ERA's public SSR page already contains its current search result.
// Preview only: no image URLs, binary downloads, API calls, pagination or writes.
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
    if (!/appartement|maison|villa|terrain|parking|garage|bureau|local|commerce/.test(type)) continue;
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
  return rows;
}
