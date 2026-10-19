// Abracadeal — vérification d'une liste d'e-mails de prospection (19/10/2026).
// Pour chaque adresse : format valide, domaine qui reçoit des mails (enregistrement MX, ou A à défaut),
// et quelques signaux (adresse jetable, domaine perso gratuit). Aucun e-mail n'est envoyé.
// Appel interne uniquement (en-tête x-internal-key = secret prospect_crawler_internal), comme prospect-mailer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const FREE = new Set(["gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.fr", "live.com",
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "neuf.fr", "laposte.net", "icloud.com", "me.com", "proton.me", "protonmail.com", "gmx.fr", "aol.com", "bbox.fr"]);
const DISPOSABLE = new Set(["yopmail.com", "yopmail.fr", "mailinator.com", "guerrillamail.com", "10minutemail.com", "temp-mail.org", "trashmail.com", "jetable.org"]);
const SYNTAX = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

async function check(raw: string) {
  const email = raw.trim().toLowerCase();
  const out: Record<string, unknown> = { email };
  if (!SYNTAX.test(email)) return { ...out, ok: false, reason: "format invalide" };
  const domain = email.split("@")[1];
  out.domain = domain;
  out.free = FREE.has(domain);
  if (DISPOSABLE.has(domain)) return { ...out, ok: false, reason: "adresse jetable" };
  const mx = await Deno.resolveDns(domain, "MX").catch(() => [] as { exchange: string; preference: number }[]);
  if (mx.length) return { ...out, ok: true, mx: mx.sort((a, b) => a.preference - b.preference).slice(0, 2).map((m) => m.exchange) };
  const a = await Deno.resolveDns(domain, "A").catch(() => [] as string[]);
  if (a.length) return { ...out, ok: true, mx: [], note: "pas de MX, serveur A seulement (livraison incertaine)" };
  return { ...out, ok: false, reason: "le domaine ne reçoit pas d'e-mails (aucun MX ni A)" };
}

// Mode « site » (19/10/2026) : pour une adresse sur le domaine du garage, on lit son site officiel
// (accueil + pages contact / mentions légales) pour vérifier que l'adresse y est publiée.
// Sert à retrouver une source publique légitime pour un contact.
const UA = "Mozilla/5.0 (compatible; AbracadealBot/1.0; +https://abracadeal.fr/contact.html)";
const CONTACT_HINT = /contact|nous-contacter|contactez|mentions|legal|a-propos|qui-sommes|coordonn/i;
async function getHtml(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html" }, redirect: "follow", signal: AbortSignal.timeout(9000) });
    if (!r.ok) return "";
    return (await r.text()).slice(0, 800_000);
  } catch { return ""; }
}
const unobf = (h: string) => h.replace(/&#64;|&#x40;|\[at\]|\(at\)/gi, "@").replace(/&#46;|\[dot\]|\(dot\)/gi, ".").toLowerCase();
async function onSite(raw: string) {
  const email = raw.trim().toLowerCase();
  const domain = email.split("@")[1] || "";
  if (!domain || FREE.has(domain)) return { email, checked: false, reason: "adresse gratuite : pas de site à vérifier" };
  const roots = [`https://${domain}/`, `https://www.${domain}/`];
  const pages: string[] = [];
  for (const root of roots) {
    const home = await getHtml(root);
    if (!home) continue;
    if (unobf(home).includes(email)) return { email, checked: true, found: true, page: root };
    const links = new Set<string>();
    for (const m of home.matchAll(/href=["']([^"'#]+)["']/gi)) {
      try { const l = new URL(m[1], root); if (l.hostname.replace(/^www\./, "") === domain && CONTACT_HINT.test(l.pathname)) links.add(l.href); } catch { /* lien invalide */ }
    }
    for (const x of ["contact", "nous-contacter", "mentions-legales"]) links.add(root + x);
    for (const l of [...links].slice(0, 5)) {
      pages.push(l);
      if (unobf(await getHtml(l)).includes(email)) return { email, checked: true, found: true, page: l };
    }
    return { email, checked: true, found: false, pages: pages.length };
  }
  return { email, checked: true, found: false, reason: "site injoignable" };
}

Deno.serve(async (req) => {
  const { data } = await admin.from("integration_secrets").select("secret_value").eq("name", "prospect_crawler_internal").single();
  if (!data?.secret_value || req.headers.get("x-internal-key") !== data.secret_value) return json({ error: "Non autorisé" }, 401);
  const body = await req.json().catch(() => ({}));
  const emails = (Array.isArray(body.emails) ? body.emails : []).map(String).slice(0, 200);
  const results = await Promise.all(emails.map(body.mode === "site" ? onSite : check));
  return json({ ok: true, results });
});
