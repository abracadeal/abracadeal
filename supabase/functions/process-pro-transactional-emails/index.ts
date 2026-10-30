import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Mails automatiques des abonnements Pro (file d'attente public.pro_email_outbox, remplie par trigger) :
// inscription / activation, résiliation, changement de formule. Envoi via Resend, comme les mails Vacances.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "Abracadeal <contact@abracadeal.fr>";
const SITE = "https://abracadeal.fr/";
const PRO_SPACE = "https://abracadeal.fr/?espace=pro"; // ouvre directement l'espace Pro (connexion demandée si besoin)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]!));
const dateFr = (v: unknown) => v ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(new Date(String(v))) : "";
const euros = (cents: unknown) => (Number(cents || 0) / 100).toLocaleString("fr-FR", { minimumFractionDigits: Number(cents) % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

// 30/10/2026 : bannière Abracadeal (lampe, logo, slogan) en tête de tous les mails, au lieu du simple bandeau texte.
const BANNER = "https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/email-banner?k=abracadeal-banner-20260920";
const PUBLISH = "https://abracadeal.fr/?deposer=1"; // ouvre directement le dépôt d'annonce
// 30/10/2026 : mails aux particuliers (bienvenue) : bouton « Déposer une annonce » et pied de page adapté.
function layout(title: string, paragraphs: string[], bullets: string[] = [], audience = "pro") {
  const part = audience === "particulier";
  const p = paragraphs.map((x) => `<p style="margin:0 0 14px 0;line-height:1.55;color:#21132d;">${x}</p>`).join("");
  const ul = bullets.length ? `<ul style="margin:0 0 16px 0;padding-left:20px;color:#21132d;line-height:1.6;">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f8f4fa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4fa;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#1c0b2b;padding:0;line-height:0;"><a href="${SITE}"><img src="${BANNER}" width="600" alt="Abracadeal – De bonnes affaires près de chez vous et partout ailleurs !" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 18px 0;font-size:21px;color:#4a1766;">${title}</h1>${p}${ul}
<p style="margin:22px 0 0 0;"><a href="${part ? PUBLISH : PRO_SPACE}" style="display:inline-block;background:#6f218c;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;">${part ? "Déposer une annonce" : "Accéder à mon espace Pro"}</a></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f3ecf6;color:#77677f;font-size:12px;line-height:1.5;">${part ? "L’équipe Abracadeal" : "Le Service Pros Abracadeal"} · <a href="mailto:contact@abracadeal.fr" style="color:#6f218c;">contact@abracadeal.fr</a> · abracadeal.fr<br>${part ? "Vous recevez ce message car vous venez de créer votre compte Abracadeal." : "Vous recevez ce message car vous avez un compte professionnel Abracadeal."}</td></tr>
</table></td></tr></table></body></html>`;
}
const toText = (title: string, paragraphs: string[], bullets: string[] = [], audience = "pro") =>
  [title, "", ...paragraphs.map((x) => x.replace(/<[^>]+>/g, "")), ...(bullets.length ? ["", ...bullets.map((b) => "- " + b.replace(/<[^>]+>/g, ""))] : []), "", audience === "particulier" ? "Déposer une annonce : " + PUBLISH : "Accéder à mon espace Pro : " + PRO_SPACE, "", (audience === "particulier" ? "L’équipe Abracadeal" : "Le Service Pros Abracadeal") + " — contact@abracadeal.fr"].join("\n");

function build(type: string, p: any) {
  const formule = `${esc(p.listing_limit)} annonces`;
  const photos = p.photo_limit ? `${esc(p.photo_limit)} photos par annonce` : "";
  const founder = p.founder_number != null && p.status === "trialing";
  // 26/10/2026 : message ponctuel rédigé à la main (payload : subject, title, paras[], bullets[]), texte déjà en HTML sûr.
  if (type === "custom_message") {
    const paras = Array.isArray(p.paras) ? p.paras.map((x: unknown) => String(x)) : [];
    const bullets = Array.isArray(p.bullets) ? p.bullets.map((x: unknown) => String(x)) : [];
    return { subject: String(p.subject || "Abracadeal"), title: String(p.title || ""), paras, bullets, audience: p.audience === "particulier" ? "particulier" : "pro" };
  }
  // 18/10/2026 : mails de l'offre Fondateurs sans carte (inactivité, fin des 12 mois sans moyen de paiement).
  if (type === "founder_inactivity_warning") {
    const title = "Votre place Fondateur est en jeu";
    const paras = [
      `Vous n’avez plus aucune annonce en ligne sur Abracadeal depuis 45 jours.`,
      `L’offre Fondateurs est réservée aux professionnels actifs : <strong>publiez au moins une annonce avant le ${dateFr(p.deadline)}</strong> pour garder vos 12 mois gratuits.`,
      `Sans annonce en ligne à cette date, votre place Fondateur sera libérée pour un autre professionnel et ne pourra plus être récupérée.`,
    ];
    return { subject: "Publiez une annonce pour garder votre place Fondateur", title, paras, bullets: ["Import automatique de votre stock (flux ou fichier CSV, Excel, XML, JSON)", "Ou dépôt manuel en quelques minutes"] };
  }
  // 19/10/2026 : mail d'aide à la mise en ligne du stock (argument « site toutes catégories »).
  if (type === "founder_onboarding") {
    const title = "Bienvenue sur Abracadeal";
    const paras = [
      `Merci pour votre inscription${p.founder_number != null ? ` : vous êtes <strong>Fondateur n°${esc(p.founder_number)}</strong>` : ""} !`,
      `Abracadeal est un site de petites annonces <strong>toutes catégories</strong>. Contrairement aux sites spécialisés, il attire aussi ceux qui cherchent un logement, un téléphone ou un meuble : vos annonces profitent de <strong>tout le trafic du site</strong>.`,
      `Pour en profiter au plus vite, mettez votre stock en ligne depuis votre Espace Pro :`,
    ];
    const bullets = [
      "<strong>Rien à ressaisir</strong> : importez votre fichier (CSV, Excel, XML) ou collez une fois le lien du flux de votre logiciel, vos annonces se mettent à jour toutes seules.",
      "<strong>Visible sur Google</strong> : chaque annonce a sa propre page, conçue pour être trouvée par les moteurs de recherche.",
      "<strong>Partage en un clic</strong> sur WhatsApp, Facebook ou par SMS, pour toucher vos clients dès le premier jour.",
    ];
    return { subject: "Bienvenue sur Abracadeal — mettez votre stock en vitrine", title, paras, bullets };
  }
  if (type === "founder_lost_inactivity") {
    const title = "Votre place Fondateur a été libérée";
    const paras = [
      `Faute d’annonce en ligne pendant 60 jours, votre offre Fondateur a pris fin et votre place a été attribuée à un autre professionnel. <strong>Aucun prélèvement n’a été effectué.</strong>`,
      `Votre compte professionnel reste ouvert. Vous pouvez reprendre une formule à tout moment, au tarif public, depuis la page des tarifs professionnels.`,
    ];
    return { subject: "Fin de votre offre Fondateur Abracadeal", title, paras, bullets: [] as string[] };
  }
  if (type === "founder_trial_ended") {
    const title = "Vos 12 mois offerts sont terminés";
    const paras = [
      `Votre période gratuite Fondateur est arrivée à son terme et aucun moyen de paiement n’a été enregistré : <strong>vos annonces sont mises en pause</strong>. Elles ne sont plus visibles, mais elles ne sont pas supprimées.`,
      `Pour les remettre en ligne, reprenez une formule depuis la page des tarifs professionnels (formule ${formule} : ${euros(p.amount_cents)} HT par mois, sans engagement). Vos annonces réapparaissent automatiquement dès l’activation.`,
      `Aucun prélèvement n’a été effectué.`,
    ];
    return { subject: "Vos annonces Abracadeal sont en pause", title, paras, bullets: [] as string[] };
  }
  if (type === "subscription_started") {
    if (founder) {
      const title = "Bienvenue parmi les Fondateurs Abracadeal";
      const paras = [
        `Votre inscription est confirmée : vous êtes <strong>Fondateur n°${esc(p.founder_number)}</strong> avec la formule <strong>${formule}</strong>.`,
        `Vos annonces sont publiées <strong>gratuitement jusqu’au ${dateFr(p.free_until)}</strong>. Aucune carte bancaire n’est demandée : pour continuer ensuite au tarif public de ${euros(p.amount_cents)} HT par mois, il suffira d’ajouter un moyen de paiement depuis « Mon compte » avant cette date (nous vous le rappellerons 30, 7 et 3 jours avant). Sinon, vos annonces seront simplement mises en pause, sans aucun prélèvement.`,
        `L’offre est réservée aux professionnels actifs : sans annonce en ligne pendant 60 jours, la place Fondateur est libérée. Dès vos 20 annonces en ligne, vous pouvez passer gratuitement à la formule 50 annonces.`,
        `Vous pouvez résilier en un clic depuis « Mon compte ». Une résiliation pendant la période gratuite arrête l’abonnement immédiatement, sans aucun prélèvement, et fait perdre définitivement le statut Fondateur.`,
      ];
      const bullets = [`Jusqu’à ${formule} actives`, photos, "Import automatique de votre stock (flux ou fichier CSV, Excel, XML, JSON)", "Modifications incluses"].filter(Boolean);
      return { subject: `Bienvenue, Fondateur n°${p.founder_number} — vos 12 mois offerts commencent`, title, paras, bullets };
    }
    const title = "Votre abonnement Abracadeal Pro est actif";
    const paras = [
      `Votre paiement a bien été pris en compte : la formule <strong>${formule}</strong> est active.`,
      `Votre facture est disponible depuis « Mon compte » → « Gérer mon abonnement ». Vous pouvez y changer de formule, mettre à jour votre moyen de paiement ou résilier à tout moment, sans engagement.`,
    ];
    const bullets = [`Jusqu’à ${formule} actives`, photos, p.plan_code === "pro_100" ? "5 « À la une » de 7 jours et 5 remontées en tête de liste offerts chaque mois" : "", "Import automatique de votre stock"].filter(Boolean);
    return { subject: `Votre abonnement Pro ${formule} est actif`, title, paras, bullets };
  }
  if (type === "subscription_cancelled") {
    const immediate = p.status === "canceled";
    const title = "Votre résiliation est enregistrée";
    const paras = immediate
      ? [`Votre abonnement <strong>${formule}</strong> est résilié et arrêté. <strong>Aucun prélèvement ne sera effectué.</strong>`,
         p.founder_number != null ? "Votre statut Fondateur a pris fin avec cette résiliation." : "",
         `Vous pouvez reprendre une formule à tout moment depuis la page des tarifs professionnels.`].filter(Boolean)
      : [`Votre abonnement <strong>${formule}</strong> est résilié. Il reste actif jusqu’au <strong>${dateFr(p.current_period_end)}</strong>, puis s’arrêtera sans nouveau prélèvement.`,
         `Vous avez changé d’avis ? Vous pouvez annuler la résiliation avant cette date depuis « Mon compte » → « Gérer mon abonnement ».`];
    return { subject: "Confirmation de résiliation de votre abonnement Abracadeal Pro", title, paras, bullets: [] as string[] };
  }
  const title = "Votre formule a changé";
  const paras = [
    `Votre abonnement passe de ${esc(p.previous_listing_limit)} à <strong>${formule}</strong>.`,
    founder ? "Vos avantages Fondateur sont conservés." : "La différence de prix éventuelle apparaît sur votre facture, disponible dans « Mon compte » → « Gérer mon abonnement ».",
  ];
  const bullets = [`Jusqu’à ${formule} actives`, photos, p.plan_code === "pro_100" ? "5 « À la une » de 7 jours et 5 remontées en tête de liste offerts chaque mois" : ""].filter(Boolean);
  return { subject: `Votre formule Abracadeal Pro : ${formule}`, title, paras, bullets };
}

async function sendEmail(to: string, subject: string, text: string, html: string, key: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": key.slice(0, 256) },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, text, html }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(JSON.stringify(body).slice(0, 1000));
  return body?.id || null;
}

// 30/10/2026 (Anthony) : mail de bienvenue aux nouveaux particuliers, une seule fois (clé welcome:<compte>).
// Envoyé une fois le compte finalisé (téléphone renseigné, e-mail confirmé), pour les comptes créés à partir du
// 30/10/2026 13 h (aucun envoi rétroactif). Les pros ont déjà leurs mails d'abonnement / Fondateur.
const WELCOME_FROM = "2026-10-30T12:00:00Z";
const WELCOME = {
  subject: "Bienvenue sur Abracadeal",
  title: "Bienvenue sur Abracadeal !",
  paras: [
    "Merci pour votre inscription. Votre compte est prêt.",
    "Vous avez quelque chose à vendre ? <strong>Déposez votre première annonce gratuitement</strong> : elle est en ligne en quelques minutes, visible partout en France et sur Google.",
  ],
  bullets: [
    "Annonces gratuites pour les particuliers",
    "Partage en un clic sur WhatsApp, Facebook ou par SMS",
    "Les acheteurs vous contactent directement",
  ],
  audience: "particulier",
};
async function queueWelcomeEmails() {
  try {
    const { data: profs } = await supabase.from("profiles").select("id,account_type,phone,is_admin,created_at")
      .eq("account_type", "particulier").not("phone", "is", null).gte("created_at", WELCOME_FROM).limit(200);
    for (const p of profs || []) {
      if (p.is_admin) continue;
      const key = "welcome:" + p.id;
      const { data: done } = await supabase.from("pro_email_outbox").select("id").eq("event_key", key).maybeSingle();
      if (done) continue;
      const { data: u } = await supabase.auth.admin.getUserById(p.id);
      if (!u?.user?.email || !u.user.email_confirmed_at) continue;
      await supabase.from("pro_email_outbox").insert({ event_key: key, user_id: p.id, email_type: "custom_message", payload: WELCOME, status: "pending" });
    }
  } catch (e) { console.error("welcome", e); }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const provided = req.headers.get("x-cron-key") || "";
    const { data: secret } = await supabase.from("integration_secrets").select("secret_value").eq("name", "pro_email_cron").maybeSingle();
    if (!secret?.secret_value) return json({ error: "Cron secret not configured" }, 500);
    if (!provided || provided !== secret.secret_value) return json({ error: "Unauthorized" }, 401);
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

    await queueWelcomeEmails();
    const { data: rows, error } = await supabase.from("pro_email_outbox")
      .select("id,event_key,user_id,email_type,payload,status,attempt_count")
      .in("status", ["pending", "failed"]).lte("available_at", new Date().toISOString()).lt("attempt_count", 5)
      .order("created_at", { ascending: true }).limit(50);
    if (error) throw error;

    let sent = 0, failed = 0, skipped = 0;
    for (const row of rows || []) {
      const { data: claimed } = await supabase.from("pro_email_outbox")
        .update({ status: "processing", attempt_count: Number(row.attempt_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", row.id).in("status", ["pending", "failed"]).select("id").maybeSingle();
      if (!claimed) { skipped++; continue; }
      try {
        const { data: u } = await supabase.auth.admin.getUserById(row.user_id);
        const email = u?.user?.email || "";
        if (!email) throw new Error("Adresse e-mail introuvable");
        const m = build(row.email_type, row.payload || {});
        const aud = (m as any).audience || "pro";
        const id = await sendEmail(email, m.subject, toText(m.title, m.paras, m.bullets, aud), layout(m.title, m.paras, m.bullets, aud), "pro-" + row.event_key);
        await supabase.from("pro_email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), resend_email_id: id, last_error: null, updated_at: new Date().toISOString() }).eq("id", row.id);
        sent++;
      } catch (e) {
        const n = Number(row.attempt_count || 0) + 1;
        await supabase.from("pro_email_outbox").update({ status: "failed", last_error: String(e instanceof Error ? e.message : e).slice(0, 1000), available_at: new Date(Date.now() + n * 5 * 60000).toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id);
        failed++;
      }
    }
    return json({ ok: true, sent, failed, skipped });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
