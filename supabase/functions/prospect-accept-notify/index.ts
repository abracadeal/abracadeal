import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// 07/11/2026 — Claude. Demande d'Anthony : « recevoir un mail quand une bonne nouvelle comme ça arrive » (accord « Je publie »).
// Appelée par le cron abracadeal-prospect-accept-notify (clé interne prospect_crawler_internal), seulement s'il reste un accord non signalé.
// Envoie un mail à abracadeal@gmail.com pour chaque accord dont notified_at est vide, puis remplit notified_at.
// Ne touche à rien d'autre : pas d'import, pas de compte, pas de mail au prospect. Le téléphone du pro n'est pas mis dans le mail.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const TO = "abracadeal@gmail.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (x: unknown) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[c]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const { data: s } = await admin.from("integration_secrets").select("secret_value").eq("name", "prospect_crawler_internal").single();
  const k = req.headers.get("x-internal-key");
  if (!k || !s?.secret_value || k !== s.secret_value) return json({ error: "Non autorisé" }, 401);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

  const { data: rows, error } = await admin.rpc("prospect_accepts_to_notify");
  if (error) return json({ error: error.message }, 500);
  const out: unknown[] = [];
  for (const r of (rows || []) as any[]) {
    const sirenTxt = r.siren_matches === true ? "oui, il correspond au SIREN connu" : r.siren_matches === false ? "NON, il ne correspond pas au SIREN connu : à vérifier" : "pas de SIREN connu pour comparer : vérifie-le avec « Chercher »";
    const site = /^https?:\/\//i.test(String(r.source_url || "")) ? `<a href="${esc(r.source_url)}">${esc(r.source_url)}</a>` : esc(r.source_url || "?");
    const when = new Date(r.accepted_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5"><p>Bonjour Anthony,</p>
<p>Bonne nouvelle : <strong>${esc(r.company || "Un pro")}</strong> a cliqué sur « Je publie » sur son aperçu (${esc(when)}).</p>
<ul><li>Catégorie : ${esc(r.category || "?")}</li><li>Site : ${site}</li><li>SIRET : ${esc(r.siret)} (${esc(sirenTxt)})</li>
<li>E-mail donné : ${esc(r.email)}</li><li>Mail de prospection envoyé depuis : ${esc(r.sent_from || "?")}</li></ul>
<p>Rien n'est publié tant que tu ne lances pas l'import : <a href="https://abracadeal.fr/admin-test-import.html">Imports sites → « Inscrire un pro qui a dit oui »</a>. Son téléphone est dans Admin → Prospection → Accords.</p>
<p>Abracadeal</p></div>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `prospect-accept-${r.id}` },
      body: JSON.stringify({ from: "Abracadeal <contact@abracadeal.fr>", to: [TO], subject: `Bonne nouvelle : ${r.company || "un pro"} dit « Je publie »`, html }),
    });
    if (res.ok) {
      await admin.rpc("prospect_accept_mark_notified", { p_id: r.id });
      out.push({ id: r.id, ok: true });
    } else out.push({ id: r.id, ok: false, status: res.status, error: (await res.text()).slice(0, 300) });
  }
  return json({ ok: true, sent: out });
});
