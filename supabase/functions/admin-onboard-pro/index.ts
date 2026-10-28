// 28/10/2026 — Inscription d'un pro par l'administrateur (« Créer le compte et importer le stock »).
// Le garage a donné son accord (en personne ou par écrit) : l'admin saisit SIRET, e-mail, téléphone et adresse du site.
// Actions (admin connecté uniquement) :
//  - lookup  {siret}                                  → fiche entreprise (registre officiel) + compte déjà existant ?
//  - create  {siret,email,phone,site_url,sector,consent} → compte Pro créé (e-mail confirmé, CGU à accepter au 1er mot de passe),
//            SIRET vérifié, offre Fondateur activée si une place est disponible, demande d'import du site créée.
//            L'activation + la synchro du site sont faites ensuite par la page admin (admin_review_site_import + pro-stock-sync).
//  - welcome {user_id,online,pending}                 → mail « vos annonces sont en ligne » avec le lien pour choisir le mot de passe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "Abracadeal <contact@abracadeal.fr>";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]!));

const MARKETPLACES = /^(https?:\/\/)?([^\/]*\.)?(leboncoin|lacentrale|autoscout24|paruvendu|seloger|bienici|logic-immo|pap|ouestfrance-(?:auto|immo)|largus|vinted|facebook|instagram|tiktok)\./i;

function classifySector(codeValue: unknown, labelValue: unknown) {
  const code = String(codeValue ?? "").trim().toUpperCase().replace(/[\s.]/g, "");
  const label = String(labelValue ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (code.startsWith("45") || /(automobile|vehicule|voiture|moto|motocycle|garage|concessionnaire)/.test(label)) return "vehicules";
  if (code.startsWith("68") || /(immobilier|immobiliere|agence immobiliere|transaction immobiliere|administration de biens)/.test(label)) return "immobilier";
  return "other";
}
// Même lecture du registre que verify-professional (recherche-entreprises.api.gouv.fr).
async function lookupCompany(siret: string) {
  const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&page=1&per_page=1`, { headers: { Accept: "application/json", "User-Agent": "Abracadeal/1.0" } });
  if (!r.ok) throw new Error("Le registre des entreprises est momentanément indisponible. Réessayez plus tard.");
  const d = await r.json();
  const c = Array.isArray(d?.results) ? d.results[0] : null;
  if (!c) throw new Error("Aucune entreprise trouvée pour ce SIRET.");
  const ets = [c?.siege, ...(Array.isArray(c?.matching_etablissements) ? c.matching_etablissements : [])].filter(Boolean);
  const e = ets.find((x: any) => String(x?.siret || "") === siret);
  if (!e) throw new Error("Le SIRET n’a pas pu être confirmé dans le registre officiel.");
  if ((c?.etat_administratif && String(c.etat_administratif).toUpperCase() !== "A") || (e?.etat_administratif && String(e.etat_administratif).toUpperCase() !== "A")) throw new Error("Cet établissement n’est pas indiqué comme actif dans le registre officiel.");
  const activityCode = String(e?.activite_principale || c?.siege?.activite_principale || c?.activite_principale || "").trim().toUpperCase();
  const activityLabel = String(e?.libelle_activite_principale || c?.siege?.libelle_activite_principale || "").trim();
  return {
    siret, siren: String(c?.siren || siret.slice(0, 9)),
    company_name: String(c?.nom_complet || c?.nom_raison_sociale || c?.nom_commercial || "Entreprise").trim(),
    company_city: String(e?.libelle_commune || "").trim(), company_postal_code: String(e?.code_postal || "").trim(),
    activity_code: activityCode || null, activity_label: activityLabel || null,
    business_sector: classifySector(activityCode, activityLabel),
  };
}
function normalizeUrl(raw: unknown) {
  let u = String(raw ?? "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { const x = new URL(u); if (!/\./.test(x.hostname)) return ""; return x.toString(); } catch { return ""; }
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
  return { ok: r.ok && d?.ok !== false, status: r.status, data: d };
}
function tempPassword() {
  const b = new Uint8Array(24); crypto.getRandomValues(b);
  return "Ab#" + Array.from(b).map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 30) + "9z";
}

function welcomeMail(p: { company: string; site: string; online: number; pending: number; link: string; founder: boolean }) {
  const total = p.online + p.pending;
  const title = total > 0 ? "Vos annonces sont sur Abracadeal" : "Votre espace Pro Abracadeal est prêt";
  const paras = [
    `Bonjour,`,
    `Comme convenu, nous avons créé l’espace Pro de <strong>${esc(p.company)}</strong> sur Abracadeal et repris les annonces de votre site <strong>${esc(p.site.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</strong>.`,
    total > 0
      ? `<strong>${total} annonce${total > 1 ? "s" : ""}</strong> ${total > 1 ? "ont été importées" : "a été importée"}${p.pending > 0 ? ` (${p.pending} encore en vérification, en ligne d’ici quelques minutes)` : ""}. Vous n’avez rien à ressaisir.`
      : `Vos annonces sont en cours d’import et seront en ligne dans les prochaines minutes. Vous n’avez rien à ressaisir.`,
    `Elles se mettent à jour toutes seules à partir de votre site : un véhicule ajouté apparaît, un véhicule vendu disparaît.`,
    `Pour accéder à votre espace (voir vos annonces, les mettre à la une, les partager), choisissez simplement votre mot de passe :`,
  ];
  const bullets = [
    p.founder ? "Gratuit pendant le lancement, sans carte bancaire" : "Aucune carte bancaire demandée",
    "Sans engagement",
    "Vos annonces visibles sur Google et partageables en un clic (SMS, WhatsApp, Facebook)",
  ];
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f8f4fa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4fa;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#1c0b2b;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">Abracadeal</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 18px 0;font-size:21px;color:#4a1766;">${title}</h1>
${paras.map((x) => `<p style="margin:0 0 14px 0;line-height:1.55;color:#21132d;">${x}</p>`).join("")}
<p style="margin:18px 0 18px 0;"><a href="${esc(p.link)}" style="display:inline-block;background:#6f218c;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:10px;">Choisir mon mot de passe</a></p>
<ul style="margin:0 0 16px 0;padding-left:20px;color:#21132d;line-height:1.6;">${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
<p style="margin:0;line-height:1.5;color:#77677f;font-size:13px;">Si le bouton ne fonctionne plus, allez sur abracadeal.fr, « Se connecter », puis « Mot de passe oublié » avec cette adresse e-mail.</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f3ecf6;color:#77677f;font-size:12px;line-height:1.5;">Le Service Pros Abracadeal · <a href="mailto:contact@abracadeal.fr" style="color:#6f218c;">contact@abracadeal.fr</a> · abracadeal.fr<br>Vous recevez ce message car vous avez accepté la diffusion de vos annonces sur Abracadeal.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, "", ...paras.map((x) => x.replace(/<[^>]+>/g, "")), "", "Choisir mon mot de passe : " + p.link, "", ...bullets.map((b) => "- " + b), "", "Si le lien ne fonctionne plus : abracadeal.fr > Se connecter > Mot de passe oublié.", "", "Le Service Pros Abracadeal — contact@abracadeal.fr"].join("\n");
  return { subject: title, html, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return json({ error: "Connexion requise" }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: ud } = await caller.auth.getUser();
    const me = ud?.user;
    if (!me) return json({ error: "Session invalide" }, 401);
    const { data: myProfile } = await admin.from("profiles").select("is_admin").eq("id", me.id).maybeSingle();
    if (!myProfile?.is_admin) return json({ error: "Accès administrateur requis" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "lookup") {
      const siret = String(body?.siret || "").replace(/\D/g, "");
      if (!/^\d{14}$/.test(siret)) return json({ error: "Le SIRET doit contenir 14 chiffres." }, 400);
      const company = await lookupCompany(siret);
      const { data: existing } = await admin.from("pro_verifications").select("user_id").eq("siret", siret).maybeSingle();
      return json({ ok: true, company, already_registered: !!existing });
    }

    if (action === "create") {
      const siret = String(body?.siret || "").replace(/\D/g, "");
      const email = String(body?.email || "").trim().toLowerCase();
      const phoneRaw = String(body?.phone || "").trim();
      const site = normalizeUrl(body?.site_url);
      const wanted = body?.sector === "immobilier" ? "immobilier" : "vehicules";
      if (body?.consent !== true) return json({ error: "Cochez la case confirmant l’accord du professionnel." }, 400);
      if (!/^\d{14}$/.test(siret)) return json({ error: "Le SIRET doit contenir 14 chiffres." }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Adresse e-mail invalide." }, 400);
      if (!site) return json({ error: "Adresse du site invalide (exemple : www.mon-garage.fr)." }, 400);
      if (MARKETPLACES.test(site)) return json({ error: "Les sites d’annonces (leboncoin, La Centrale…) et les réseaux sociaux ne peuvent pas être importés : il faut l’adresse du site du professionnel." }, 400);

      const { data: phone } = await admin.rpc("abracadeal_normalize_phone", { p_phone: phoneRaw });
      if (!phone) return json({ error: "Numéro de téléphone invalide (il sera affiché aux acheteurs)." }, 400);

      const company = await lookupCompany(siret);
      const sector = company.business_sector === "vehicules" || company.business_sector === "immobilier" ? company.business_sector : wanted;
      const warnings: string[] = [];
      if (company.business_sector !== "other" && company.business_sector !== wanted) warnings.push(`Domaine corrigé d’après le registre : ${company.business_sector === "immobilier" ? "Immobilier" : "Auto / Moto"}.`);
      if (company.business_sector === "other") warnings.push(`Activité du registre hors auto/immobilier (${company.activity_label || company.activity_code || "inconnue"}) : l’offre Fondateurs peut être refusée.`);

      // Compte déjà existant pour cet e-mail : on ne recrée rien, on ajoute seulement la demande d'import.
      const { data: siretOwner } = await admin.from("pro_verifications").select("user_id").eq("siret", siret).maybeSingle();
      const existingUser = await findUserByEmail(email);
      if (siretOwner && (!existingUser || siretOwner.user_id !== existingUser.id)) return json({ error: "Ce SIRET est déjà associé à un autre compte professionnel Abracadeal." }, 409);
      if (existingUser) {
        const { data: prof } = await admin.from("profiles").select("account_type").eq("id", existingUser.id).maybeSingle();
        if (prof?.account_type !== "professionnel") return json({ error: "Un compte particulier existe déjà avec cet e-mail : utilisez une autre adresse du garage." }, 409);
        const { data: imp, error: impErr } = await caller.rpc("admin_create_site_import", { p_owner_id: existingUser.id, p_url: site, p_sector: sector });
        if (impErr) throw impErr;
        return json({ ok: true, existing: true, user_id: existingUser.id, feed_id: imp?.feed_id, company, sector, founder: null, warnings: ["Ce garage avait déjà un compte : seul l’import de son site a été ajouté."] });
      }

      const { data: phoneFree } = await admin.rpc("abracadeal_phone_available", { p_phone: phone, p_account_type: "professionnel" });
      if (phoneFree === false) return json({ error: "Ce numéro est déjà utilisé par un autre compte professionnel." }, 409);

      const password = tempPassword();
      const nowIso = new Date().toISOString();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: {
          display_name: company.company_name, account_type: "professionnel", phone, pro_sector: sector, city: company.company_city || null,
          company_registration: { company_name: company.company_name, siret, siren: company.siren, vat_status: "pending", vat_number: "", country: "FR", company_city: company.company_city, company_postal_code: company.company_postal_code },
          stock_site: { url: site, consent: true, consented_at: nowIso, source: "admin" },
          onboarded_by_admin: true, onboarded_at: nowIso, legal_pending: true,
        },
      });
      if (createErr || !created?.user) throw new Error(createErr?.message?.includes("registered") ? "Un compte existe déjà avec cet e-mail." : (createErr?.message || "Création du compte impossible"));
      const userId = created.user.id;

      // Session du nouveau compte (mot de passe temporaire, jamais communiqué) pour passer par les mêmes contrôles que l'inscription normale.
      const pub = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: sess, error: sessErr } = await pub.auth.signInWithPassword({ email, password });
      if (sessErr || !sess?.session) throw new Error("Compte créé, mais connexion technique impossible : " + (sessErr?.message || ""));
      const token = sess.session.access_token;

      const ver = await callFunction("verify-professional", token, { action: "verify", siret });
      if (!ver.ok || ver.data?.verified !== true) warnings.push("SIRET non vérifié automatiquement : " + (ver.data?.error || "erreur inconnue"));

      let founder: any = null;
      if (ver.ok) {
        const { data: open } = await admin.rpc("get_founder_offer_open");
        if (open === false) warnings.push("Offre Fondateurs fermée : pas d’abonnement gratuit créé.");
        else {
          const sub = await callFunction("create-pro-subscription-order", token, { plan_code: "pro_50", expect_founder: true });
          if (sub.ok && sub.data?.founder) {
            founder = { number: sub.data.founder_number, free_until: sub.data.free_until };
            // Le mail d'activation automatique part après le mail de bienvenue (qui contient le lien du mot de passe).
            await admin.from("pro_email_outbox").update({ available_at: new Date(Date.now() + 20 * 60e3).toISOString() }).eq("user_id", userId).eq("status", "pending");
          } else warnings.push("Offre Fondateur non activée : " + (sub.data?.error || "place indisponible"));
        }
      }
      try { await admin.auth.admin.signOut(token); } catch (_) { /* session temporaire */ }

      const { data: imp, error: impErr } = await caller.rpc("admin_create_site_import", { p_owner_id: userId, p_url: site, p_sector: sector });
      if (impErr) throw new Error("Compte créé, mais demande d’import impossible : " + impErr.message);
      return json({ ok: true, existing: false, user_id: userId, feed_id: imp?.feed_id, company, sector, founder, warnings });
    }

    if (action === "welcome") {
      const userId = String(body?.user_id || "");
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(userId);
      if (uErr || !u?.user?.email) return json({ error: "Compte introuvable" }, 404);
      const m: any = u.user.user_metadata || {};
      if (!m.onboarded_by_admin) return json({ error: "Ce compte n’a pas été créé depuis l’admin." }, 409);
      if (!RESEND_API_KEY) return json({ error: "Envoi d’e-mails indisponible (clé Resend manquante)." }, 503);
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "recovery", email: u.user.email, options: { redirectTo: "https://abracadeal.fr/" } });
      if (linkErr || !link?.properties?.action_link) throw new Error("Lien de mot de passe impossible : " + (linkErr?.message || ""));
      const { data: sub } = await admin.from("pro_subscriptions").select("founder_number,status").eq("user_id", userId).maybeSingle();
      const mail = welcomeMail({
        company: m.display_name || "votre entreprise", site: m.stock_site?.url || "",
        online: Math.max(0, Number(body?.online) || 0), pending: Math.max(0, Number(body?.pending) || 0),
        link: link.properties.action_link, founder: sub?.founder_number != null,
      });
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `admin-onboard-welcome-${userId}-${new Date().toISOString().slice(0, 13)}` },
        body: JSON.stringify({ from: FROM_EMAIL, to: [u.user.email], reply_to: "contact@abracadeal.fr", subject: mail.subject, html: mail.html, text: mail.text }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error("Envoi du mail impossible : " + (d?.message || r.status));
      await admin.auth.admin.updateUserById(userId, { user_metadata: { ...m, welcome_sent_at: new Date().toISOString() } });
      return json({ ok: true, email: u.user.email });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
