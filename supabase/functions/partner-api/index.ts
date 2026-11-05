// partner-api v1 (05/11/2026, Claude) — API REST pour les éditeurs de logiciels (Septeo/Modelo, Apimo, La Boîte Immo…).
// Documentation publique : https://abracadeal.fr/api.html
//
// Principe : l'éditeur pousse les annonces de ses agences clientes. Une agence n'est diffusée que si
//  1) elle a activé Abracadeal dans le logiciel de l'éditeur (= son accord, rappelé dans l'appel « agence »),
//  2) elle a un compte Pro Abracadeal avec le même SIRET (règle : pas de compte Pro sans SIRET).
// Les annonces passent par le MÊME moteur que les flux des pros (pro-stock-sync : normalisation, contrôles,
// modération, mises à jour) via la clé propre au flux de l'agence. Aucune règle n'est dupliquée ici.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, error: { code, message, ...extra } }, status);

const sha256 = async (v: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
const randomKey = (prefix: string) => {
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  return prefix + Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
};
const must = (r: any) => { if (r.error) throw r.error; return r.data; };

const MAX_LISTINGS_PER_CALL = 200;
const ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;

// SIRET : 14 chiffres + clé de Luhn (La Poste, SIREN 356000000, a sa propre règle).
function validSiret(s: string) {
  if (!/^\d{14}$/.test(s)) return false;
  if (s.startsWith("356000000")) return s.split("").reduce((a, c) => a + Number(c), 0) % 5 === 0;
  let sum = 0;
  for (let i = 0; i < 14; i++) { let d = Number(s[13 - i]); if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } sum += d; }
  return sum % 10 === 0;
}

async function partnerFrom(req: Request) {
  const h = req.headers.get("authorization") || "";
  const key = (h.match(/^Bearer\s+(\S+)$/i)?.[1] || req.headers.get("x-api-key") || "").trim();
  if (!key) return null;
  const { data } = await admin.from("partner_api_clients").select("*").eq("key_hash", await sha256(key)).eq("active", true).maybeSingle();
  if (data) admin.from("partner_api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
  return data || null;
}

async function adminEmails() {
  const { data: adm } = await admin.from("profiles").select("id").eq("is_admin", true).limit(3);
  const tos: string[] = [];
  for (const a of adm || []) { const { data: u } = await admin.auth.admin.getUserById(a.id); if (u?.user?.email) tos.push(u.user.email); }
  return tos;
}

// Une agence sans compte Pro : Anthony est prévenu une fois (il crée le compte depuis l'admin, l'agence s'active ensuite toute seule).
async function notifyPending(partner: any, ag: any) {
  if (ag.admin_notified_at || partner.sandbox) return;
  const key = Deno.env.get("RESEND_API_KEY") || "";
  const tos = await adminEmails();
  if (!key || !tos.length) return;
  const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5"><p>Bonjour Anthony,</p>
<p><b>${esc(ag.name)}</b> a activé Abracadeal dans <b>${esc(partner.name)}</b>, mais n'a pas encore de compte Pro.</p>
<p>SIRET : ${esc(ag.siret)}<br>E-mail : ${esc(ag.email)}<br>Téléphone : ${esc(ag.phone)}<br>Ville : ${esc(ag.postal_code)} ${esc(ag.city)}<br>Secteur : ${esc(ag.sector)}</p>
<p>Crée son compte Pro avec ce SIRET depuis l'admin : ses annonces arriveront ensuite automatiquement.</p><p>Abracadeal</p></div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `partner-pending-${ag.id}` },
      body: JSON.stringify({ from: "Abracadeal <contact@abracadeal.fr>", to: tos, subject: `Nouvelle agence via ${partner.name} : ${ag.name}`, html }),
    });
    if (r.ok) await admin.from("partner_agencies").update({ admin_notified_at: new Date().toISOString() }).eq("id", ag.id);
  } catch (e) { console.error(e); }
}

// Passe l'agence en « active » dès qu'un compte Pro porte son SIRET, et lui crée son flux dans le moteur d'import.
async function activate(partner: any, ag: any) {
  if (ag.status === "stopped") return ag;
  if (ag.status === "active" && ag.feed_id && ag.feed_key) return ag;
  const { data: pv } = await admin.from("pro_verifications").select("user_id").eq("siret", ag.siret).limit(1).maybeSingle();
  if (!pv?.user_id) { await notifyPending(partner, ag); return ag; }
  const { data: prof } = await admin.from("profiles").select("account_type").eq("id", pv.user_id).maybeSingle();
  if (prof?.account_type !== "professionnel") { await notifyPending(partner, ag); return ag; }
  const feedKey = randomKey("abf_");
  const now = new Date().toISOString();
  const feed = must(await admin.from("pro_stock_feeds").insert({
    owner_id: pv.user_id, name: `${partner.name} – ${ag.name}`.slice(0, 120), feed_url: null, format: "json",
    sync_mode: "upsert", api_key_hash: await sha256(feedKey), active: true, sector: ag.sector, source_kind: "flux",
    review_status: "approved", authorized_at: ag.consent_at || now,
    authorization_text: `Diffusion activée par l'agence dans ${partner.name} (SIRET ${ag.siret}), transmise via l'API partenaires.`,
  }).select("id").single());
  return must(await admin.from("partner_agencies").update({ status: "active", owner_id: pv.user_id, feed_id: feed.id, feed_key: feedKey, updated_at: now })
    .eq("id", ag.id).select("*").single());
}

const publicAgency = (ag: any) => ({
  agency_id: ag.external_agency_id, siret: ag.siret, name: ag.name, sector: ag.sector, status: ag.status,
  status_detail: ag.status === "active" ? "Annonces acceptées."
    : ag.status === "pending" ? "En attente : l'agence n'a pas encore de compte Pro Abracadeal avec ce SIRET. Nous la contactons ; les annonces seront acceptées dès l'ouverture du compte."
    : "Diffusion arrêtée.",
  created_at: ag.created_at, updated_at: ag.updated_at,
});

async function loadAgency(partner: any, agencyId: string) {
  const { data } = await admin.from("partner_agencies").select("*").eq("partner_id", partner.id).eq("external_agency_id", agencyId).maybeSingle();
  return data || null;
}

async function listingsOf(ag: any) {
  if (!ag.feed_id || !ag.owner_id) return [];
  return must(await admin.from("listings").select("id,external_id,status,title,price,updated_at")
    .eq("owner_id", ag.owner_id).eq("source", `feed:${ag.feed_id}`).not("external_id", "is", null)
    .order("updated_at", { ascending: false }).limit(1000)) || [];
}

const STATUS_FR: Record<string, string> = { active: "online", pending: "in_review", archived: "removed", hidden: "blocked", rejected: "blocked", sold: "removed", expired: "removed" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const at = parts.indexOf("partner-api");
    const path = (at >= 0 ? parts.slice(at + 1) : parts).map(decodeURIComponent);
    if (path[0] !== "v1") return fail(404, "not_found", "Version inconnue. Utilisez /v1/…");

    const partner = await partnerFrom(req);
    if (!partner) return fail(401, "unauthorized", "Clé API absente ou invalide (en-tête Authorization: Bearer <clé>).");

    // GET /v1/ping
    if (path[1] === "ping" && path.length === 2 && req.method === "GET")
      return json({ ok: true, partner: partner.name, sandbox: !!partner.sandbox, time: new Date().toISOString() });

    if (path[1] !== "agencies" || !path[2]) return fail(404, "not_found", "Route inconnue.");
    const agencyId = path[2];
    if (!ID_RE.test(agencyId)) return fail(400, "invalid_agency_id", "agency_id : 1 à 80 caractères parmi A-Z a-z 0-9 . _ : -");

    // PUT /v1/agencies/{agency_id} — l'agence a activé Abracadeal dans le logiciel de l'éditeur
    if (path.length === 3 && req.method === "PUT") {
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== "object") return fail(400, "invalid_json", "Corps JSON attendu.");
      const siret = String(b.siret ?? "").replace(/\s/g, "");
      const name = String(b.name ?? "").trim();
      const sector = b.sector === "vehicules" ? "vehicules" : b.sector === "immobilier" || b.sector == null ? "immobilier" : "";
      if (!validSiret(siret)) return fail(422, "invalid_siret", "SIRET invalide (14 chiffres).");
      if (!name) return fail(422, "missing_name", "Le nom de l'agence (name) est obligatoire.");
      if (!sector) return fail(422, "invalid_sector", "sector : « immobilier » ou « vehicules ».");
      if (b.consent !== true) return fail(422, "consent_required", "consent: true est obligatoire : l'agence doit avoir activé elle-même la diffusion sur Abracadeal.");
      const row = {
        partner_id: partner.id, external_agency_id: agencyId, siret, name: name.slice(0, 160), sector,
        email: b.email ? String(b.email).slice(0, 160) : null, phone: b.phone ? String(b.phone).slice(0, 40) : null,
        city: b.city ? String(b.city).slice(0, 80) : null, postal_code: b.postal_code ? String(b.postal_code).slice(0, 10) : null,
        updated_at: new Date().toISOString(),
      };
      const existing = await loadAgency(partner, agencyId);
      if (existing && existing.siret !== siret && existing.feed_id)
        return fail(409, "siret_change", "Le SIRET d'une agence déjà diffusée ne peut pas changer. Créez un nouvel agency_id.");
      let ag = existing
        ? must(await admin.from("partner_agencies").update({ ...row, ...(existing.status === "stopped" ? { status: "pending", consent_at: new Date().toISOString() } : {}) }).eq("id", existing.id).select("*").single())
        : must(await admin.from("partner_agencies").insert(row).select("*").single());
      if (existing?.status === "stopped" && ag.feed_id) await admin.from("pro_stock_feeds").update({ active: true, updated_at: new Date().toISOString() }).eq("id", ag.feed_id);
      ag = await activate(partner, ag);
      return json({ ok: true, agency: publicAgency(ag) }, existing ? 200 : 201);
    }

    const ag0 = await loadAgency(partner, agencyId);
    if (!ag0) return fail(404, "agency_not_found", "Agence inconnue : déclarez-la d'abord avec PUT /v1/agencies/{agency_id}.");
    const ag = await activate(partner, ag0);

    // GET /v1/agencies/{agency_id}
    if (path.length === 3 && req.method === "GET") {
      const ls = await listingsOf(ag);
      const counts: Record<string, number> = {};
      for (const l of ls) { const s = STATUS_FR[l.status] || l.status; counts[s] = (counts[s] || 0) + 1; }
      return json({ ok: true, agency: publicAgency(ag), listings: counts });
    }

    // DELETE /v1/agencies/{agency_id} — l'agence a désactivé Abracadeal : tout est retiré
    if (path.length === 3 && req.method === "DELETE") {
      let removed = 0;
      if (ag.feed_id && ag.owner_id) {
        await admin.from("pro_stock_feeds").update({ active: false, updated_at: new Date().toISOString() }).eq("id", ag.feed_id);
        const r = must(await admin.from("listings").update({ status: "archived", last_synced_at: new Date().toISOString() })
          .eq("owner_id", ag.owner_id).eq("source", `feed:${ag.feed_id}`).in("status", ["active", "pending"]).select("id"));
        removed = (r || []).length;
      }
      await admin.from("partner_agencies").update({ status: "stopped", updated_at: new Date().toISOString() }).eq("id", ag.id);
      return json({ ok: true, agency_id: agencyId, status: "stopped", listings_removed: removed });
    }

    if (path[3] !== "listings") return fail(404, "not_found", "Route inconnue.");

    // GET /v1/agencies/{agency_id}/listings
    if (path.length === 4 && req.method === "GET") {
      const ls = await listingsOf(ag);
      return json({ ok: true, agency_id: agencyId, count: ls.length, listings: ls.map((l: any) => ({
        reference: l.external_id, status: STATUS_FR[l.status] || l.status, title: l.title, price: l.price,
        url: l.status === "active" ? `https://abracadeal.fr/annonce/${l.id}/` : null, updated_at: l.updated_at,
      })) });
    }

    if (ag.status !== "active") return fail(409, "agency_" + ag.status, publicAgency(ag).status_detail, { agency: publicAgency(ag) });

    // PUT /v1/agencies/{agency_id}/listings — envoi d'annonces (mode « partial » : ajout/mise à jour ; « full » : stock complet)
    if (path.length === 4 && req.method === "PUT") {
      const b = await req.json().catch(() => null);
      const list = Array.isArray(b) ? b : b?.listings;
      if (!Array.isArray(list)) return fail(400, "invalid_json", "Corps attendu : { \"mode\": \"partial\" | \"full\", \"listings\": [ … ] }.");
      if (!list.length) return fail(422, "empty", "Aucune annonce envoyée. Pour tout retirer, utilisez DELETE /v1/agencies/{agency_id}.");
      if (list.length > MAX_LISTINGS_PER_CALL) return fail(413, "too_many", `${MAX_LISTINGS_PER_CALL} annonces maximum par appel. En mode « full », envoyez le stock complet en un seul appel s'il tient dans cette limite, sinon utilisez « partial » et DELETE pour les retraits.`);
      const mode = (Array.isArray(b) ? "partial" : b.mode || "partial");
      if (!["partial", "full"].includes(mode)) return fail(422, "invalid_mode", "mode : « partial » ou « full ».");
      const bad = list.findIndex((x: any) => !x || typeof x !== "object" || !String(x.reference ?? x.ref ?? x.id ?? "").trim());
      if (bad >= 0) return fail(422, "missing_reference", `Annonce n°${bad + 1} : « reference » obligatoire (identifiant unique et stable du bien chez vous).`);
      const r = await fetch(`${SUPABASE_URL}/functions/v1/pro-stock-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-abracadeal-key": ag.feed_key, Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ items: list, sync_mode: mode === "full" ? "full" : "upsert" }),
        signal: AbortSignal.timeout(140000),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok || out?.ok === false) return fail(502, "import_failed", out?.error || "Import impossible pour le moment, réessayez plus tard.");
      const { data: run } = await admin.from("pro_stock_sync_runs").select("error_message").eq("feed_id", ag.feed_id).order("started_at", { ascending: false }).limit(1).maybeSingle();
      return json({
        ok: true, agency_id: agencyId, mode, received: out.received ?? list.length,
        created: out.created ?? 0, updated: out.updated ?? 0, unchanged: out.unchanged ?? 0, removed: out.archived ?? 0,
        rejected: out.errors ?? 0, rejected_detail: out.errors ? (run?.error_message || null) : null,
        note: out.archive_skipped ? `Retraits non appliqués : ${out.archive_skipped}` : undefined,
      });
    }

    // DELETE /v1/agencies/{agency_id}/listings/{reference}
    if (path.length === 5 && req.method === "DELETE") {
      const ref = path[4];
      const r = must(await admin.from("listings").update({ status: "archived", last_synced_at: new Date().toISOString() })
        .eq("owner_id", ag.owner_id).eq("source", `feed:${ag.feed_id}`).eq("external_id", ref).in("status", ["active", "pending"]).select("id"));
      if (!(r || []).length) {
        const { data: ex } = await admin.from("listings").select("id").eq("owner_id", ag.owner_id).eq("source", `feed:${ag.feed_id}`).eq("external_id", ref).maybeSingle();
        if (!ex) return fail(404, "listing_not_found", "Aucune annonce avec cette référence pour cette agence.");
      }
      return json({ ok: true, agency_id: agencyId, reference: ref, status: "removed" });
    }

    return fail(405, "method_not_allowed", "Méthode non autorisée sur cette route.");
  } catch (e) {
    console.error(e);
    return fail(500, "server_error", "Erreur interne. Réessayez ; si elle persiste : contact@abracadeal.fr");
  }
});
