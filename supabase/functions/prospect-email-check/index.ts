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

Deno.serve(async (req) => {
  const { data } = await admin.from("integration_secrets").select("secret_value").eq("name", "prospect_crawler_internal").single();
  if (!data?.secret_value || req.headers.get("x-internal-key") !== data.secret_value) return json({ error: "Non autorisé" }, 401);
  const body = await req.json().catch(() => ({}));
  const emails = (Array.isArray(body.emails) ? body.emails : []).map(String).slice(0, 200);
  const results = await Promise.all(emails.map(check));
  return json({ ok: true, results });
});
