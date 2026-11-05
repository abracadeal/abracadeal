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
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
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

// Compte Pro impossible à ouvrir automatiquement : Anthony est prévenu une fois, avec la raison.
async function notifyPending(partner: any, ag: any, reason = "") {
  if (ag.admin_notified_at || partner.sandbox) return;
  const key = Deno.env.get("RESEND_API_KEY") || "";
  const tos = await adminEmails();
  if (!key || !tos.length) return;
  const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5"><p>Bonjour Anthony,</p>
<p><b>${esc(ag.name)}</b> a activé Abracadeal dans <b>${esc(partner.name)}</b>, mais son compte Pro n'a pas pu être ouvert automatiquement.</p>
${reason ? `<p>Raison : ${esc(reason)}</p>` : ""}
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

// ---- Ouverture automatique du compte Pro (05/11/2026, Anthony : « il faut obligatoirement qu'il ait un compte ? ça n'avance pas »).
// Même circuit que l'inscription par l'admin (admin-onboard-pro) : SIRET contrôlé au registre officiel, compte Pro créé
// (e-mail confirmé, CGU à accepter au 1er mot de passe), SIRET vérifié, offre Fondateur si une place est libre,
// puis mail « choisissez votre mot de passe ». L'accord = l'agence a activé Abracadeal dans le logiciel de l'éditeur.
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
function classifySector(codeValue: unknown, labelValue: unknown) {
  const code = String(codeValue ?? "").trim().toUpperCase().replace(/[\s.]/g, "");
  const label = String(labelValue ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (code.startsWith("45") || /(automobile|vehicule|voiture|moto|motocycle|garage|concessionnaire)/.test(label)) return "vehicules";
  if (code.startsWith("68") || /(immobilier|immobiliere|agence immobiliere|transaction immobiliere|administration de biens)/.test(label)) return "immobilier";
  return "other";
}
async function lookupCompany(siret: string) {
  const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&page=1&per_page=1`, { headers: { Accept: "application/json", "User-Agent": "Abracadeal/1.0" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("registre des entreprises indisponible");
  const d = await r.json();
  const c = Array.isArray(d?.results) ? d.results[0] : null;
  if (!c) throw new Error("aucune entreprise trouvée pour ce SIRET au registre officiel");
  const ets = [c?.siege, ...(Array.isArray(c?.matching_etablissements) ? c.matching_etablissements : [])].filter(Boolean);
  const e = ets.find((x: any) => String(x?.siret || "") === siret);
  if (!e) throw new Error("SIRET non confirmé par le registre officiel");
  if ((c?.etat_administratif && String(c.etat_administratif).toUpperCase() !== "A") || (e?.etat_administratif && String(e.etat_administratif).toUpperCase() !== "A")) throw new Error("établissement indiqué comme fermé au registre");
  const activityCode = String(e?.activite_principale || c?.siege?.activite_principale || c?.activite_principale || "").trim().toUpperCase();
  const activityLabel = String(e?.libelle_activite_principale || c?.siege?.libelle_activite_principale || "").trim();
  return {
    siret, siren: String(c?.siren || siret.slice(0, 9)),
    company_name: String(c?.nom_complet || c?.nom_raison_sociale || c?.nom_commercial || "Entreprise").trim(),
    company_city: String(e?.libelle_commune || "").trim(), company_postal_code: String(e?.code_postal || "").trim(),
    business_sector: classifySector(activityCode, activityLabel),
  };
}
async function findUserByEmail(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = (data?.users || []).find((u) => String(u.email || "").toLowerCase() === email);
    if (hit) return hit;
    if ((data?.users || []).length < 1000) return null;
  }
  return null;
}
async function callFunction(name: string, token: string, body: unknown) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok && d?.ok !== false, data: d };
}
function tempPassword() {
  const b = new Uint8Array(24); crypto.getRandomValues(b);
  return "Ab#" + Array.from(b).map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 30) + "9z";
}
async function sendWelcome(partner: any, userId: string, email: string, company: string, founder: boolean) {
  const key = Deno.env.get("RESEND_API_KEY") || "";
  if (!key) return;
  const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: "https://abracadeal.fr/" } });
  const url = link?.properties?.action_link;
  if (!url) return;
  const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]!));
  const paras = [
    "Bonjour,",
    `Vous avez activé la diffusion sur Abracadeal dans <strong>${esc(partner.name)}</strong>. Nous avons donc ouvert l’espace Pro de <strong>${esc(company)}</strong>.`,
    "Vos annonces arrivent automatiquement depuis votre logiciel et se mettent à jour toutes seules : vous n’avez rien à ressaisir.",
    "Pour accéder à votre espace (voir vos annonces, les mettre à la une, les partager), choisissez simplement votre mot de passe :",
  ];
  const bullets = [founder ? "Gratuit, sans carte bancaire" : "Aucune carte bancaire demandée", "Sans engagement", "Vos annonces visibles sur Google et partageables en un clic"];
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f8f4fa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4fa;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#1c0b2b;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">Abracadeal</td></tr>
<tr><td style="padding:28px;"><h1 style="margin:0 0 18px 0;font-size:21px;color:#4a1766;">Votre espace Pro Abracadeal est prêt</h1>
${paras.map((x) => `<p style="margin:0 0 14px 0;line-height:1.55;color:#21132d;">${x}</p>`).join("")}
<p style="margin:18px 0;"><a href="${esc(url)}" style="display:inline-block;background:#6f218c;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:10px;">Choisir mon mot de passe</a></p>
<ul style="margin:0 0 16px 0;padding-left:20px;color:#21132d;line-height:1.6;">${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
<p style="margin:0;line-height:1.5;color:#77677f;font-size:13px;">Si le bouton ne fonctionne plus : abracadeal.fr, « Se connecter », puis « Mot de passe oublié » avec cette adresse e-mail.</p></td></tr>
<tr><td style="padding:16px 28px;background:#f3ecf6;color:#77677f;font-size:12px;line-height:1.5;">Le Service Pros Abracadeal · <a href="mailto:contact@abracadeal.fr" style="color:#6f218c;">contact@abracadeal.fr</a> · abracadeal.fr</td></tr>
</table></td></tr></table></body></html>`;
  const text = ["Votre espace Pro Abracadeal est prêt", "", ...paras.map((x) => x.replace(/<[^>]+>/g, "")), "", "Choisir mon mot de passe : " + url, "", ...bullets.map((b) => "- " + b)].join("\n");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `partner-welcome-${userId}` },
    body: JSON.stringify({ from: "Abracadeal <contact@abracadeal.fr>", to: [email], reply_to: "contact@abracadeal.fr", subject: "Votre espace Pro Abracadeal est prêt", html, text }),
  }).catch((e) => console.error(e));
}
// Ouvre le compte Pro. Renvoie l'identifiant du compte, ou une raison (texte) si l'ouverture doit être faite à la main.
async function openProAccount(partner: any, ag: any): Promise<{ userId?: string; reason?: string }> {
  if (partner.sandbox) return { reason: "éditeur de test : pas d'ouverture de compte" };
  const email = String(ag.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { reason: "e-mail de l'agence absent ou invalide" };
  const { data: phone } = await admin.rpc("abracadeal_normalize_phone", { p_phone: String(ag.phone || "") });
  if (!phone) return { reason: "téléphone de l'agence absent ou invalide" };
  let company: any;
  try { company = await lookupCompany(ag.siret); } catch (e) { return { reason: e instanceof Error ? e.message : String(e) }; }
  if (company.business_sector !== "other" && company.business_sector !== ag.sector) return { reason: `activité du registre (${company.business_sector}) différente du secteur déclaré (${ag.sector})` };
  const existing = await findUserByEmail(email);
  if (existing) return { reason: "un compte Abracadeal existe déjà avec cet e-mail (sans ce SIRET)" };
  const { data: phoneFree } = await admin.rpc("abracadeal_phone_available", { p_phone: phone, p_account_type: "professionnel" });
  if (phoneFree === false) return { reason: "ce téléphone est déjà utilisé par un autre compte Pro" };
  const password = tempPassword();
  const nowIso = new Date().toISOString();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: {
      display_name: ag.name || company.company_name, account_type: "professionnel", phone, pro_sector: ag.sector, city: company.company_city || ag.city || null,
      company_registration: { company_name: company.company_name, siret: ag.siret, siren: company.siren, vat_status: "pending", vat_number: "", country: "FR", company_city: company.company_city, company_postal_code: company.company_postal_code },
      partner_diffusion: { partner: partner.name, agency_id: ag.external_agency_id, consent: true, consented_at: ag.consent_at || nowIso },
      onboarded_by_partner: partner.name, onboarded_at: nowIso, legal_pending: true,
    },
  });
  if (createErr || !created?.user) return { reason: "création du compte impossible : " + (createErr?.message || "") };
  const userId = created.user.id;
  let founder = false;
  try {
    const pub = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: sess } = await pub.auth.signInWithPassword({ email, password });
    const token = sess?.session?.access_token;
    if (token) {
      const ver = await callFunction("verify-professional", token, { action: "verify", siret: ag.siret });
      if (ver.ok && ver.data?.verified === true) {
        const { data: open } = await admin.rpc("get_founder_offer_open");
        if (open !== false) {
          const sub = await callFunction("create-pro-subscription-order", token, { plan_code: "pro_50", expect_founder: true });
          founder = !!(sub.ok && sub.data?.founder);
          if (founder) await admin.from("pro_email_outbox").update({ available_at: new Date(Date.now() + 20 * 60e3).toISOString() }).eq("user_id", userId).eq("status", "pending");
        }
      }
      try { await admin.auth.admin.signOut(token); } catch (_) { /* session temporaire */ }
    }
  } catch (e) { console.error(e); }
  // Le SIRET doit être enregistré pour que l'agence soit reconnue ; sinon, vérification à la main.
  const { data: pv } = await admin.from("pro_verifications").select("user_id").eq("user_id", userId).eq("siret", ag.siret).maybeSingle();
  if (!pv) return { reason: "compte créé mais SIRET non vérifié automatiquement : à vérifier dans l'admin" };
  await sendWelcome(partner, userId, email, ag.name || company.company_name, founder);
  if (!founder) await notifyPending(partner, { ...ag, admin_notified_at: null }, "compte ouvert automatiquement, mais sans offre Fondateur (place indisponible) : ses annonces seront refusées sans abonnement");
  return { userId };
}

// Passe l'agence en « active » : compte Pro existant avec ce SIRET, sinon ouvert automatiquement ; puis crée son flux dans le moteur d'import.
async function activate(partner: any, ag: any) {
  if (ag.status === "stopped") return ag;
  if (ag.status === "active" && ag.feed_id && ag.feed_key) return ag;
  let { data: pv } = await admin.from("pro_verifications").select("user_id").eq("siret", ag.siret).limit(1).maybeSingle();
  if (!pv?.user_id) {
    // Une seule tentative automatique par agence : ensuite, c'est l'admin qui tranche (évite les comptes en double).
    if (ag.admin_notified_at) return ag;
    const res = await openProAccount(partner, ag);
    if (!res.userId) { await notifyPending(partner, ag, res.reason); return ag; }
    pv = { user_id: res.userId };
  }
  const { data: prof } = await admin.from("profiles").select("account_type").eq("id", pv.user_id).maybeSingle();
  if (prof?.account_type !== "professionnel") { await notifyPending(partner, ag, "le compte portant ce SIRET n'est pas un compte Pro"); return ag; }
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
    : ag.status === "pending" ? "En attente : le compte Pro de l'agence n'a pas pu être ouvert automatiquement (vérifiez e-mail, téléphone et SIRET). Abracadeal s'en occupe ; les annonces seront acceptées dès l'ouverture du compte."
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
    // POST est accepté partout où PUT l'est (outils ou bibliothèques qui n'envoient pas de PUT).
    const method = req.method === "POST" ? "PUT" : req.method;
    if (path[0] !== "v1") return fail(404, "not_found", "Version inconnue. Utilisez /v1/…");

    const partner = await partnerFrom(req);
    if (!partner) return fail(401, "unauthorized", "Clé API absente ou invalide (en-tête Authorization: Bearer <clé>).");

    // GET /v1/ping
    if (path[1] === "ping" && path.length === 2 && method === "GET")
      return json({ ok: true, partner: partner.name, sandbox: !!partner.sandbox, time: new Date().toISOString() });

    if (path[1] !== "agencies" || !path[2]) return fail(404, "not_found", "Route inconnue.");
    const agencyId = path[2];
    if (!ID_RE.test(agencyId)) return fail(400, "invalid_agency_id", "agency_id : 1 à 80 caractères parmi A-Z a-z 0-9 . _ : -");

    // PUT /v1/agencies/{agency_id} — l'agence a activé Abracadeal dans le logiciel de l'éditeur
    if (path.length === 3 && method === "PUT") {
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
    if (path.length === 3 && method === "GET") {
      const ls = await listingsOf(ag);
      const counts: Record<string, number> = {};
      for (const l of ls) { const s = STATUS_FR[l.status] || l.status; counts[s] = (counts[s] || 0) + 1; }
      return json({ ok: true, agency: publicAgency(ag), listings: counts });
    }

    // DELETE /v1/agencies/{agency_id} — l'agence a désactivé Abracadeal : tout est retiré
    if (path.length === 3 && method === "DELETE") {
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
    if (path.length === 4 && method === "GET") {
      const ls = await listingsOf(ag);
      return json({ ok: true, agency_id: agencyId, count: ls.length, listings: ls.map((l: any) => ({
        reference: l.external_id, status: STATUS_FR[l.status] || l.status, title: l.title, price: l.price,
        url: l.status === "active" ? `https://abracadeal.fr/annonce/${l.id}/` : null, updated_at: l.updated_at,
      })) });
    }

    if (ag.status !== "active") return fail(409, "agency_" + ag.status, publicAgency(ag).status_detail, { agency: publicAgency(ag) });

    // PUT /v1/agencies/{agency_id}/listings — envoi d'annonces (mode « partial » : ajout/mise à jour ; « full » : stock complet)
    if (path.length === 4 && method === "PUT") {
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
    if (path.length === 5 && method === "DELETE") {
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
