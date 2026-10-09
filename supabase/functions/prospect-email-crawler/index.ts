import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Robot de prospection (09/10/2026) : lit la page d'accueil et les pages contact / mentions légales
// des sites des pros (liste privée private.prospect_leads) et relève l'adresse e-mail publiée.
// Appelé chaque minute par pg_cron avec une clé interne. Aucune donnée n'est publiée sur le site.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (compatible; AbracadealBot/1.0; +https://abracadeal.fr/contact.html)";
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const BAD = /(\.(png|jpe?g|gif|webp|svg|css|js)$)|example\.|sentry|wixpress|godaddy|domain\.com|email\.com|votre|your|nom@|prenom|@2x|noreply|no-reply|ovh\.net$|@sentry|mediateur|mobilians|cnil\.fr|dgccrf|economie\.gouv|medicys|cm2c|anm-conso|sas-mediation/i;
const CONTACT_HINT = /contact|nous-contacter|contactez|mentions|legal|a-propos|qui-sommes|agence|coordonn/i;

function normUrl(s: string) { s = s.trim(); if (!/^https?:\/\//i.test(s)) s = "https://" + s; try { return new URL(s); } catch { return null; } }
function baseDomain(h: string) { const p = h.replace(/^www\./, "").split("."); return p.slice(-2).join("."); }

async function get(url: string): Promise<string> {
  const ctl = AbortSignal.timeout(9000);
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html" }, redirect: "follow", signal: ctl });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("html") && !ct.includes("text")) return "";
  const t = await r.text();
  return t.slice(0, 800_000);
}

function emailsIn(html: string): string[] {
  const t = html.replace(/&#64;|&#x40;|\[at\]|\(at\)| at /gi, "@").replace(/&#46;|\[dot\]|\(dot\)/gi, ".");
  const out = new Set<string>();
  for (const m of t.matchAll(EMAIL_RE)) { const e = m[0].toLowerCase().replace(/^mailto:/, "").replace(/\.$/, ""); if (!BAD.test(e) && e.length < 80) out.add(e); }
  return [...out];
}
function phoneIn(html: string): string | null {
  const m = html.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/);
  return m ? m[0] : null;
}
function pick(emails: string[], host: string): string | null {
  if (!emails.length) return null;
  const dom = baseDomain(host);
  const score = (e: string) => {
    const [local, d] = e.split("@");
    let s = 0;
    if (baseDomain(d) === dom) s += 10;
    if (/^(contact|info|accueil|commercial|vente|ventes|agence|bonjour|hello)/.test(local)) s += 3;
    if (/^(rgpd|dpo|webmaster|admin|support|compta|facturation|recrutement|rh|jobs|collaborer|candidat|presse|press|customercare|privacy)/.test(local)) s -= 5;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a))[0];
}

async function crawl(site: string) {
  const u = normUrl(site); if (!u) return { status: "bad_url", email: null, phone: null };
  const seen = new Set<string>(); const found: string[] = []; let phone: string | null = null;
  const visit = async (url: string) => {
    if (seen.has(url) || seen.size >= 5) return ""; seen.add(url);
    try { const h = await get(url); found.push(...emailsIn(h)); phone ||= phoneIn(h); return h; } catch { return ""; }
  };
  const home = await visit(u.origin + (u.pathname || "/"));
  if (!home && !found.length) { const alt = await visit(u.origin + "/"); if (!alt) return { status: "unreachable", email: null, phone: null }; }
  if (!pick(found, u.hostname)?.endsWith(baseDomain(u.hostname))) {
    const links = new Set<string>();
    for (const m of home.matchAll(/href=["']([^"'#]+)["']/gi)) {
      try { const l = new URL(m[1], u.origin); if (l.hostname.replace(/^www\./, "") === u.hostname.replace(/^www\./, "") && CONTACT_HINT.test(l.pathname)) links.add(l.href); } catch { /* lien invalide */ }
    }
    for (const p of ["/contact", "/nous-contacter", "/mentions-legales"]) links.add(u.origin + p);
    for (const l of [...links].slice(0, 4)) { await visit(l); if (pick(found, u.hostname)?.endsWith(baseDomain(u.hostname))) break; }
  }
  const email = pick([...new Set(found)], u.hostname);
  return { status: email ? "found" : "not_found", email, phone };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const { data: key } = await admin.from("integration_secrets").select("secret_value").eq("name", "prospect_crawler_internal").single();
  if (!key?.secret_value || req.headers.get("x-internal-key") !== key.secret_value) return json({ error: "Non autorisé" }, 401);
  const { data: rows, error } = await admin.rpc("prospect_crawler_next", { p_limit: 12 });
  if (error) return json({ error: error.message }, 500);
  const results: Record<string, number> = {};
  const queue = [...(rows || [])];
  const worker = async () => {
    while (queue.length) {
      const r: any = queue.shift();
      let res = { status: "error", email: null as string | null, phone: null as string | null };
      try { res = await crawl(String(r.site || "")); } catch { /* garde error */ }
      results[res.status] = (results[res.status] || 0) + 1;
      await admin.rpc("prospect_crawler_save", { p_id: r.id, p_email: res.email, p_status: res.status === "error" ? "todo" : res.status, p_phone: res.phone });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return json({ ok: true, processed: rows?.length || 0, results });
});
