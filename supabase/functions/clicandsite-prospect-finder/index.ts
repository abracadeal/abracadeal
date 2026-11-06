import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// ClicandSite — robot de recherche de pros (06/11/2026).
// 1) Cherche dans l'annuaire officiel des entreprises (recherche-entreprises.api.gouv.fr, gratuit) les VTC / taxis,
//    restaurants, garages et agences immobilières en activité, code postal par code postal sur la Riviera.
//    (OpenStreetMap / Overpass refuse les connexions venant des serveurs Supabase.)
// 2) Essaie de retrouver le site de chaque pro (nom de domaine deviné et vérifié).
// 3) Regarde le site : pas de site, site daté (pas adapté au mobile, vieux copyright, http…) ou moderne, et relève l'e-mail publié.
// N'ENVOIE AUCUN MAIL. Les pros trouvés attendent dans le CRM (schéma clicandsite) la validation d'Anthony.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (compatible; ClicandSiteBot/1.0; +https://clicandsite.fr/)";

const NAF: Record<string, string> = {
  vtc: "49.32Z,49.39B",
  restaurant: "56.10A",
  garage: "45.20A,45.11Z",
  immobilier: "68.31Z",
};
// Chaînes et réseaux : ils ont déjà un site national, inutile de les démarcher.
const CHAINS = /mc ?donald|burger king|kfc|subway|domino|pizza hut|quick|buffalo grill|hippopotamus|courtepaille|flunch|del arte|la boucherie|starbucks|brioche dor|o.?tacos|speedy|norauto|midas|feu vert|point s\b|euromaster|carglass|first stop|vulco|top garage|eurorepar|motrio|renault|peugeot|citro[eë]n|toyota|volkswagen|mercedes|bmw|audi|ford|nissan|kia|hyundai|fiat|dacia|opel|skoda|seat|tesla|aramis|orpi|century 21|lafor[eê]t|era immobilier|guy hoquet|st[ée]phane plaza|nestenn|foncia|citya|square habitat|cr[ée]dit agricole|\biad\b|capifrance|safti|optimhome|\buber\b|\bg7\b|heetch|sodexo|elior|compass group|accor|novotel|ibis|mercure|sushi shop|flam's|courtepaille|leon de bruxelles|big mamma|ninkasi|carrefour|leclerc|intermarche|auchan|casino|monoprix/i;
const LEGAL = /\b(sarl|sas|sasu|eurl|sa|snc|sci|ste|societe|société|ets|etablissements|holding|groupe|ei|eirl|scp)\b/gi;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const BAD = /(\.(png|jpe?g|gif|webp|svg|css|js)$)|example\.|sentry|wixpress|godaddy|domain\.com|email\.com|votre|your|nom@|prenom|@2x|noreply|no-reply|ovh\.net$|mediateur|cnil\.fr|dgccrf|economie\.gouv/i;
const FREE_HOST = /wixsite\.com|jimdosite|jimdofree|e-monsite|over-blog|site-solocal|solocal|pagesjaunes|business\.site|webnode|godaddysites|weebly|sitew\.|wordpress\.com|blogspot|free\.fr|orange\.fr|wanadoo/i;
function baseDomain(h: string) { return h.replace(/^www\./, "").split(".").slice(-2).join("."); }

function titleCase(x: string) { return x.toLowerCase().replace(/(^|[\s'’(-])([a-zà-ÿ])/g, (_m, a, b) => a + b.toUpperCase()); }
function cleanName(r: any, e: any) {
  const ens = (e?.liste_enseignes || []).find((x: string) => x && x.length > 1);
  let n = ens || e?.nom_commercial || r.nom_complet || "";
  const m = n.match(/\(([^)]{3,})\)\s*$/); if (!ens && m) n = m[1];
  n = n.replace(/\s+/g, " ").trim();
  return n === n.toUpperCase() ? titleCase(n) : n;
}
async function sirene(postcode: string, trade: string) {
  const rows: any[] = [];
  for (let page = 1; page <= 4; page++) {
    const u = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${NAF[trade]}&code_postal=${postcode}&etat_administratif=A&per_page=25&page=${page}`;
    const r = await fetch(u, { headers: { "User-Agent": UA, "Accept": "application/json" }, signal: AbortSignal.timeout(20000) });
    if (r.status === 429) { await new Promise(x => setTimeout(x, 1500)); page--; continue; }
    if (!r.ok) throw new Error("Annuaire HTTP " + r.status);
    const d = await r.json();
    for (const res of d.results || []) {
      const ets = (res.matching_etablissements || []).filter((e: any) => e.code_postal === postcode && (!e.etat_administratif || e.etat_administratif === "A"));
      for (const e of ets.slice(0, 3)) {
        const name = cleanName(res, e); if (!name) continue;
        rows.push({
          source: "sirene", source_id: "siret:" + e.siret, siret: e.siret, trade, name,
          address: (e.adresse || "").replace(new RegExp("\\s*" + postcode + ".*$"), "").trim() || null,
          postcode, city: e.libelle_commune ? titleCase(e.libelle_commune) : null,
          lat: e.latitude ? +e.latitude : null, lon: e.longitude ? +e.longitude : null,
          phone: null, email: null, website: null,
          brand: CHAINS.test(name) || CHAINS.test(res.nom_complet || "") || (res.nombre_etablissements_ouverts || 0) > 5,
        });
      }
    }
    if (page >= (d.total_pages || 1)) break;
    await new Promise(x => setTimeout(x, 250));
  }
  return rows;
}

const PARKED = /domain (is )?for sale|ce domaine est|nom de domaine est (à vendre|disponible)|parked|sedo|godaddy|dan\.com|buy this domain|hugedomains|site en construction|under construction|default web site page|index of \//i;
const noAccent = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
async function guessSite(p: { id: string; name: string; city: string | null }) {
  const base = noAccent(p.name.toLowerCase()).replace(LEGAL, " ").replace(/&/g, " et ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (base.length < 4) return null;
  const words = base.split(" ").filter(w => w.length >= 4);
  const joined = base.replace(/ /g, ""), dashed = base.replace(/ /g, "-");
  const cands = [...new Set([joined + ".fr", dashed + ".fr", joined + ".com", dashed + ".com"])].filter(d => d.length <= 40);
  for (const d of cands) {
    try {
      const { html, url } = await get("https://" + d + "/");
      if (!html || PARKED.test(html.slice(0, 20000))) continue;
      const low = noAccent(html.toLowerCase());
      const hit = words.filter(w => low.includes(w)).length;
      const cityHit = p.city ? low.includes(noAccent(p.city.toLowerCase())) : false;
      if (hit >= Math.min(2, words.length) || (hit >= 1 && cityHit)) return url;
    } catch { /* domaine absent */ }
  }
  return null;
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
  // 1) recherche dans l'annuaire officiel
  try {
    const rows = await sirene(area, trade);
    const { data: ins, error } = await db.rpc("cs_robot_upsert", { p_rows: rows });
    if (error) throw new Error(error.message);
    out.found = rows.length; out.inserted = ins;
    await db.rpc("cs_robot_log", { p_kind: "recherche", p_trade: trade, p_area: area, p_found: rows.length, p_inserted: ins as number, p_checked: 0, p_ok: true, p_error: null });
  } catch (e) {
    out.search_error = String(e);
    await db.rpc("cs_robot_log", { p_kind: "recherche", p_trade: trade, p_area: area, p_found: 0, p_inserted: 0, p_checked: 0, p_ok: false, p_error: String(e).slice(0, 300) });
  }
  // 1 bis) retrouver le site des pros
  const { data: tg } = await db.rpc("cs_robot_to_guess", { p_limit: 8 });
  const glist = (tg as any[]) || []; let guessed = 0;
  for (let i = 0; i < glist.length; i += 4) {
    const res = await Promise.all(glist.slice(i, i + 4).map(async p => ({ id: p.id, w: await guessSite(p).catch(() => null) })));
    for (const r of res) { await db.rpc("cs_robot_save_guess", { p_id: r.id, p_website: r.w }); if (r.w) guessed++; }
  }
  out.sites_found = guessed;
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
