import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// ClicandSite — robot de recherche de pros (06/11/2026).
// 1) Cherche dans OpenStreetMap (gratuit) les restaurants, garages, agences immobilières et VTC d'une ville de la Riviera.
// 2) Regarde le site de chacun : pas de site, site daté (pas adapté au mobile, vieux copyright, http…) ou site moderne,
//    et relève l'adresse e-mail publiée.
// N'ENVOIE AUCUN MAIL. Les pros trouvés attendent dans le CRM (schéma clicandsite) la validation d'Anthony.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (compatible; ClicandSiteBot/1.0; +https://clicandsite.fr/)";

const FILTERS: Record<string, string[]> = {
  restaurant: ['nwr["amenity"="restaurant"]["name"]'],
  garage: ['nwr["shop"~"^(car_repair|car|tyres)$"]["name"]'],
  immobilier: ['nwr["office"="estate_agent"]["name"]', 'nwr["shop"="estate_agent"]["name"]'],
  vtc: ['nwr["name"~"VTC|chauffeur priv|transport de personnes|limousine",i]', 'nwr["amenity"="taxi"]["name"]', 'nwr["office"="taxi"]["name"]'],
};
// Chaînes et réseaux : ils ont déjà un site national, inutile de les démarcher.
const CHAINS = /mc ?donald|burger king|kfc|subway|domino|pizza hut|quick|buffalo grill|hippopotamus|courtepaille|flunch|del arte|la boucherie|starbucks|paul\b|brioche dor|o.?tacos|speedy|norauto|midas|feu vert|point s|euromaster|carglass|first stop|vulco|top garage|ad garage|eurorepar|motrio|renault|peugeot|citro[eë]n|toyota|volkswagen|mercedes|bmw|audi|ford|nissan|kia|hyundai|fiat|dacia|opel|skoda|seat|tesla|aramis|orpi|century 21|lafor[eê]t|era immobilier|guy hoquet|stéphane plaza|stephane plaza|nestenn|foncia|citya|square habitat|cr[ée]dit agricole|iad|capifrance|safti|optimhome|uber|g7|heetch|bolt/i;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const BAD = /(\.(png|jpe?g|gif|webp|svg|css|js)$)|example\.|sentry|wixpress|godaddy|domain\.com|email\.com|votre|your|nom@|prenom|@2x|noreply|no-reply|ovh\.net$|mediateur|cnil\.fr|dgccrf|economie\.gouv/i;
const FREE_HOST = /wixsite\.com|jimdosite|jimdofree|e-monsite|over-blog|site-solocal|solocal|pagesjaunes|business\.site|webnode|godaddysites|weebly|sitew\.|wordpress\.com|blogspot|free\.fr|orange\.fr|wanadoo/i;
const SOCIAL = /facebook\.com|instagram\.com|tripadvisor|linktr\.ee|thefork|lafourchette|google\.com\/maps|g\.page|leboncoin/i;

const tag = (t: Record<string, string>, ...k: string[]) => { for (const x of k) if (t[x]) return t[x].trim(); return null; };
function cleanPhone(p: string | null) { if (!p) return null; const s = p.split(/[;,]/)[0].trim(); return s.length >= 8 ? s : null; }
function normSite(s: string | null) { if (!s) return null; s = s.split(/[;\s]/)[0].trim(); if (!/^https?:\/\//i.test(s)) s = "https://" + s; try { return new URL(s).toString(); } catch { return null; } }
function baseDomain(h: string) { return h.replace(/^www\./, "").split(".").slice(-2).join("."); }

const CENTERS: Record<string, [number, number, number]> = {
  "Cannes": [43.5528, 7.0174, 3500], "Le Cannet": [43.5770, 7.0190, 2500], "Mougins": [43.6000, 6.9950, 3500],
  "Antibes": [43.5808, 7.1251, 4500], "Vallauris": [43.5780, 7.0540, 2500], "Mandelieu-la-Napoule": [43.5460, 6.9380, 3500],
  "Grasse": [43.6580, 6.9230, 3500], "Nice": [43.7034, 7.2663, 6000], "Cagnes-sur-Mer": [43.6640, 7.1490, 3000],
  "Saint-Laurent-du-Var": [43.6730, 7.1900, 2500], "Villeneuve-Loubet": [43.6580, 7.1220, 3000], "Menton": [43.7760, 7.5040, 3000],
  "Saint-Raphaël": [43.4250, 6.7680, 3500], "Fréjus": [43.4330, 6.7370, 3500], "Saint-Tropez": [43.2700, 6.6400, 2500],
  "Sainte-Maxime": [43.3090, 6.6350, 3000],
};
async function overpass(area: string, trade: string) {
  const c = CENTERS[area]; if (!c) throw new Error("Ville inconnue : " + area);
  const parts = FILTERS[trade].map(f => `${f}(around:${c[2]},${c[0]},${c[1]});`).join("");
  const q = `[out:json][timeout:25];(${parts});out center tags 400;`;
  const ends = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  let last = "";
  for (const u of ends) {
    try {
      const r = await fetch(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Accept": "application/json" }, signal: AbortSignal.timeout(35000) });
      if (!r.ok) { last = u + " HTTP " + r.status; continue; }
      const d = await r.json();
      return d.elements || [];
    } catch (e) { last = u + " " + String(e); }
  }
  throw new Error("Overpass indisponible : " + last);
}

function toRow(el: any, trade: string, area: string) {
  const t = el.tags || {}; const name = tag(t, "name"); if (!name) return null;
  const street = [tag(t, "addr:housenumber"), tag(t, "addr:street")].filter(Boolean).join(" ") || null;
  const brand = !!(t["brand"] || t["brand:wikidata"]) || CHAINS.test(name);
  let site = normSite(tag(t, "website", "contact:website", "url"));
  if (site && SOCIAL.test(site)) site = null; // une page Facebook n'est pas un site
  return {
    source_id: `osm:${el.type}/${el.id}`, trade, name,
    address: street, postcode: tag(t, "addr:postcode"), city: tag(t, "addr:city") || area,
    lat: el.lat ?? el.center?.lat ?? null, lon: el.lon ?? el.center?.lon ?? null,
    phone: cleanPhone(tag(t, "phone", "contact:phone", "contact:mobile")),
    email: tag(t, "email", "contact:email"), website: site, brand,
  };
}

async function get(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html" }, redirect: "follow", signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("html") && !ct.includes("text")) return { html: "", url: r.url };
  return { html: (await r.text()).slice(0, 600_000), url: r.url };
}
function emailsIn(html: string) {
  const t = html.replace(/&#64;|&#x40;|\[at\]|\(at\)/gi, "@");
  const out = new Set<string>();
  for (const m of t.matchAll(EMAIL_RE)) { const e = m[0].toLowerCase().replace(/^mailto:/, "").replace(/\.$/, ""); if (!BAD.test(e) && e.length < 80) out.add(e); }
  return [...out];
}
function pickEmail(list: string[], host: string) {
  if (!list.length) return null; const dom = baseDomain(host);
  const sc = (e: string) => { const [l, d] = e.split("@"); let s = 0; if (baseDomain(d) === dom) s += 10; if (/^(contact|info|accueil|bonjour|hello|reservation|agence)/.test(l)) s += 3; if (/^(rgpd|dpo|webmaster|admin|support|compta|rh|jobs|privacy)/.test(l)) s -= 5; return s; };
  return [...list].sort((a, b) => sc(b) - sc(a))[0];
}
const phoneIn = (h: string) => (h.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/) || [null])[0];

function analyse(html: string, finalUrl: string) {
  const h = html.toLowerCase();
  const years = [...html.matchAll(/(?:©|&copy;|copyright)[^<]{0,40}?((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/gi)].map(m => Math.max(+m[1], +(m[2] || 0)));
  const year = years.length ? Math.max(...years) : null;
  const gen = (html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i) || [])[1] || null;
  const s = {
    https: finalUrl.startsWith("https://"),
    mobile: /<meta[^>]+name=["']viewport["']/i.test(html),
    year, generator: gen,
    free_host: FREE_HOST.test(finalUrl),
    frames: /<frameset|<frame\s/i.test(h),
    flash: /\.swf["']|shockwave/i.test(h),
    old_jquery: /jquery[.-]1\.[0-9]\b/i.test(h),
    words: h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
  };
  const reasons: string[] = [];
  if (!s.mobile) reasons.push("pas adapté au téléphone");
  if (s.year && s.year <= new Date().getFullYear() - 4) reasons.push("copyright " + s.year);
  if (!s.https) reasons.push("pas sécurisé (http)");
  if (s.free_host) reasons.push("site gratuit / sous-domaine");
  if (s.frames || s.flash) reasons.push("technologie ancienne");
  if (s.old_jquery) reasons.push("code ancien");
  if (s.words < 60) reasons.push("presque vide");
  return { signals: { ...s, reasons }, dated: reasons.length > 0 };
}

async function checkSite(p: { id: string; website: string; email: string | null }) {
  const u = new URL(p.website);
  let home: { html: string; url: string };
  try { home = await get(p.website); } catch {
    try { home = await get(u.origin + "/"); } catch (e) { return { id: p.id, site_status: "injoignable", signals: { error: String(e).slice(0, 120) }, email: null, phone: null }; }
  }
  if (!home.html) return { id: p.id, site_status: "injoignable", signals: { error: "pas une page web" }, email: null, phone: null };
  const a = analyse(home.html, home.url);
  let emails = emailsIn(home.html); let phone = phoneIn(home.html);
  if (!p.email && !pickEmail(emails, u.hostname)?.endsWith(baseDomain(u.hostname))) {
    const m = home.html.match(/href=["']([^"']*(?:contact|mentions|nous-trouver|a-propos)[^"']*)["']/i);
    if (m) { try { const c = await get(new URL(m[1], home.url).toString()); emails = emails.concat(emailsIn(c.html)); phone ||= phoneIn(c.html); } catch { /* ignore */ } }
  }
  return { id: p.id, site_status: a.dated ? "date" : "moderne", signals: a.signals, email: pickEmail(emails, u.hostname), phone };
}
function score(site: string, email: string | null, phone: string | null) {
  const e = !!email, t = !!phone;
  if (site === "aucun") return e ? 90 : t ? 70 : 40;
  if (site === "date") return e ? 85 : t ? 65 : 35;
  if (site === "injoignable") return e ? 60 : t ? 55 : 20;
  return 10;
}

Deno.serve(async (req) => {
  const key = req.headers.get("x-internal-key") || "";
  const { data: ok } = await db.rpc("cs_robot_key_ok", { p_key: key });
  if (!ok) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({}));
  const { data: nx } = await db.rpc("cs_robot_next");
  const next = nx as { enabled: boolean; area: string; trade: string; check_per_run: number };
  if (!next.enabled && !body.manual) return json({ skipped: "robot arrêté" });
  const area = body.area || next.area, trade = body.trade || next.trade;
  const out: Record<string, unknown> = { area, trade };
  // 1) recherche
  try {
    const els = await overpass(area, trade);
    const rows = els.map((e: any) => toRow(e, trade, area)).filter(Boolean);
    const { data: ins, error } = await db.rpc("cs_robot_upsert", { p_rows: rows });
    if (error) throw new Error(error.message);
    out.found = rows.length; out.inserted = ins;
    await db.rpc("cs_robot_log", { p_kind: "recherche", p_trade: trade, p_area: area, p_found: rows.length, p_inserted: ins as number, p_checked: 0, p_ok: true, p_error: null });
  } catch (e) {
    out.search_error = String(e);
    await db.rpc("cs_robot_log", { p_kind: "recherche", p_trade: trade, p_area: area, p_found: 0, p_inserted: 0, p_checked: 0, p_ok: false, p_error: String(e).slice(0, 300) });
  }
  // 2) contrôle des sites
  const { data: todo } = await db.rpc("cs_robot_to_check", { p_limit: next.check_per_run || 12 });
  const list = (todo as any[]) || []; let checked = 0;
  for (let i = 0; i < list.length; i += 4) {
    const res = await Promise.all(list.slice(i, i + 4).map(p => checkSite(p).catch(e => ({ id: p.id, site_status: "injoignable", signals: { error: String(e).slice(0, 120) }, email: null, phone: null }))));
    for (const r of res) {
      const src = list.find(x => x.id === r.id);
      await db.rpc("cs_robot_save_check", { p_id: r.id, p_site_status: r.site_status, p_signals: r.signals, p_email: r.email, p_phone: r.phone, p_score: score(r.site_status, src?.email || r.email, r.phone) });
      checked++;
    }
  }
  out.checked = checked;
  if (checked) await db.rpc("cs_robot_log", { p_kind: "sites", p_trade: null, p_area: null, p_found: 0, p_inserted: 0, p_checked: checked, p_ok: true, p_error: null });
  return json(out);
});
