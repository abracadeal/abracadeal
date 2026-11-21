// process-saved-alerts — 21/11/2026 (Anthony : « il faut inciter à s'inscrire », « oui tout »)
// Envoie chaque matin, à chaque inscrit qui a créé une alerte (table saved_alerts), les nouvelles annonces
// publiées depuis le passage précédent qui correspondent à ses critères (mot-clé, catégorie, ville, prix maximum).
// Un seul mail par personne (toutes ses alertes regroupées), seulement s'il y a du nouveau. Envoi par Resend.
// Test : POST {"dry_run":true,"since":"2026-11-18T00:00:00Z"} → n'envoie rien, ne modifie rien, renvoie seulement des nombres
// (aucune adresse e-mail dans la réponse : la fonction est appelable sans jeton, comme les autres tâches planifiées).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "Abracadeal <contact@abracadeal.fr>";
const SITE = "https://abracadeal.fr";
const R2 = "https://pub-9747954003f04922a082752db15aeeed.r2.dev/";
const MAX_PER_ALERT = 8;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CAT: Record<string, string> = {
  vehicules: "Véhicules", immobilier: "Immobilier", vacances: "Vacances", hightech: "High-tech", maison: "Maison",
  mode: "Mode", emploi: "Emploi", services: "Services", autres: "Autres",
};

function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]!));
}
function norm(v: unknown) {
  return String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function cleanTitle(t: unknown) {
  return String(t ?? "Annonce").replace(/\[ABRACA_[^\]]*\]/g, "").replace(/\s+/g, " ").trim() || "Annonce";
}
function money(p: unknown) {
  const n = Number(p);
  return n > 0 ? n.toLocaleString("fr-FR").replace(/ | /g, " ") + " €" : "";
}
function photo(l: any) {
  const ph = [...(l.listing_photos ?? [])].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))[0];
  if (!ph?.storage_path) return "";
  const src = /^https?:\/\//i.test(ph.storage_path) ? ph.storage_path : R2 + "listing-images/" + encodeURI(ph.storage_path);
  return "https://wsrv.nl/?url=" + encodeURIComponent(src) + "&w=240&h=180&fit=cover&output=jpg&q=75";
}

type Alert = { id: string; user_id: string; label: string | null; keyword: string | null; category: string | null;
  city: string | null; price_max: number | null; last_checked_at: string };

function matches(a: Alert, l: any) {
  if (a.category && l.category !== a.category) return false;
  if (a.price_max !== null && a.price_max !== undefined && Number(a.price_max) > 0) {
    const p = Number(l.price);
    if (!(p > 0) || p > Number(a.price_max)) return false;
  }
  if (a.city && norm(a.city)) {
    const c = norm(a.city);
    if (!norm(l.city).includes(c) && !String(l.postal_code ?? "").startsWith(String(a.city).trim())) return false;
  }
  if (a.keyword && norm(a.keyword)) {
    const hay = " " + norm([l.title, l.vehicle_make, l.vehicle_model, l.city].join(" ")) + " ";
    for (const w of norm(a.keyword).split(" ")) if (w && !hay.includes(w)) return false;
  }
  return true;
}

function alertName(a: Alert) {
  if (a.label) return a.label;
  const parts = [a.keyword, a.category ? CAT[a.category] ?? a.category : "", a.city,
    a.price_max ? "jusqu’à " + money(a.price_max) : ""].filter(Boolean);
  return parts.join(" · ") || "Toutes les nouvelles annonces";
}

function card(l: any) {
  const img = photo(l);
  const url = `${SITE}/?annonce=${encodeURIComponent(l.id)}`;
  return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">
    <a href="${url}" style="text-decoration:none;color:#22162f;display:block">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      ${img ? `<td style="width:120px;padding-right:12px"><img src="${esc(img)}" width="120" height="90" alt="" style="display:block;border-radius:8px;object-fit:cover"></td>` : ""}
      <td style="vertical-align:top"><div style="font:600 15px Arial,sans-serif">${esc(cleanTitle(l.title))}</div>
      <div style="font:700 15px Arial,sans-serif;color:#702c91;margin-top:4px">${esc(money(l.price))}</div>
      <div style="font:13px Arial,sans-serif;color:#756a7e;margin-top:2px">${esc(l.city ?? "")}</div></td>
    </tr></table></a></td></tr>`;
}

Deno.serve(async (req) => {
  const started = new Date().toISOString();
  let opts: { user_id?: string; since?: string; dry_run?: boolean } = {};
  try { opts = await req.json(); } catch { /* cron : corps vide */ }
  if (!opts.dry_run) opts = {}; // options réservées au mode test
  try {
    if (!RESEND_API_KEY && !opts.dry_run) throw new Error("RESEND_API_KEY manquante");
    let q = supabase.from("saved_alerts").select("id,user_id,label,keyword,category,city,price_max,last_checked_at").eq("active", true);
    if (opts.user_id) q = q.eq("user_id", opts.user_id);
    const { data: alerts, error } = await q;
    if (error) throw error;
    if (!alerts?.length) return Response.json({ ok: true, alerts: 0, sent: 0 });

    const since = opts.since ?? alerts.reduce((m, a) => (a.last_checked_at < m ? a.last_checked_at : m), started);
    const { data: listings, error: lErr } = await supabase.from("listings")
      .select("id,owner_id,title,price,city,postal_code,category,vehicle_make,vehicle_model,created_at,listing_photos(storage_path,position)")
      .eq("status", "active").eq("visibility_scope", "public").is("revision_of", null)
      .gt("created_at", since).lte("created_at", started).order("created_at", { ascending: false }).limit(2000);
    if (lErr) throw lErr;

    const byUser = new Map<string, { alert: Alert; items: any[] }[]>();
    for (const a of alerts as Alert[]) {
      const from = opts.since ?? a.last_checked_at;
      const items = (listings ?? []).filter((l) => l.created_at > from && l.owner_id !== a.user_id && matches(a, l));
      if (!items.length) continue;
      const arr = byUser.get(a.user_id) ?? [];
      arr.push({ alert: a, items });
      byUser.set(a.user_id, arr);
    }

    const report: any[] = [];
    let sent = 0;
    for (const [userId, groups] of byUser) {
      const { data: u } = await supabase.auth.admin.getUserById(userId);
      const to = u?.user?.email;
      if (!to) continue;
      const total = groups.reduce((n, g) => n + g.items.length, 0);
      const subject = total === 1 ? `1 nouvelle annonce pour votre alerte « ${alertName(groups[0].alert)} »`
        : groups.length === 1 ? `${total} nouvelles annonces pour votre alerte « ${alertName(groups[0].alert)} »`
        : `${total} nouvelles annonces pour vos alertes Abracadeal`;
      const sections = groups.map((g) => `
        <h3 style="font:700 16px Arial,sans-serif;margin:22px 0 6px">${esc(alertName(g.alert))}</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${g.items.slice(0, MAX_PER_ALERT).map(card).join("")}</table>
        ${g.items.length > MAX_PER_ALERT ? `<p style="font:13px Arial,sans-serif;color:#756a7e">… et ${g.items.length - MAX_PER_ALERT} autre(s) sur le site.</p>` : ""}`).join("");
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#22162f">
        <h2 style="margin:0 0 8px;font-size:20px">Du nouveau pour vous sur Abracadeal</h2>
        <p style="margin:0;color:#756a7e;font-size:14px">Les annonces publiées depuis notre dernier message qui correspondent à vos alertes.</p>
        ${sections}
        <p style="margin:26px 0 0"><a href="${SITE}/" style="display:inline-block;padding:12px 18px;background:#702c91;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Voir toutes les annonces</a></p>
        <p style="font-size:12px;color:#9a8fa3;margin-top:26px">Vous recevez ce mail parce que vous avez créé une alerte sur Abracadeal.
        Pour la modifier ou l’arrêter : <a href="${SITE}/?alertes=1" style="color:#702c91">gérer mes alertes</a>.</p></div>`;
      const text = groups.map((g) => alertName(g.alert) + "\n" + g.items.slice(0, MAX_PER_ALERT)
        .map((l) => `- ${cleanTitle(l.title)} ${money(l.price)} ${l.city ?? ""} : ${SITE}/?annonce=${l.id}`).join("\n")).join("\n\n")
        + `\n\nGérer mes alertes : ${SITE}/?alertes=1`;
      report.push({ alerts: groups.length, total });
      if (opts.dry_run) continue;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text,
          headers: { "List-Unsubscribe": `<${SITE}/?alertes=1>` } }),
      });
      if (!r.ok) { console.error("Resend", r.status, await r.text()); continue; }
      sent++;
    }

    if (!opts.dry_run && !opts.since) {
      const ids = (alerts as Alert[]).map((a) => a.id);
      await supabase.from("saved_alerts").update({ last_checked_at: started }).in("id", ids);
    }
    return Response.json({ ok: true, alerts: alerts.length, new_listings: listings?.length ?? 0, sent, report });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
