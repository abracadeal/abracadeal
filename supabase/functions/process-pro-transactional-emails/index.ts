import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Mails automatiques des abonnements Pro (file d'attente public.pro_email_outbox, remplie par trigger) :
// inscription / activation, résiliation, changement de formule. Envoi via Resend, comme les mails Vacances.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "Abracadeal <contact@abracadeal.fr>";
const SITE = "https://abracadeal.fr/";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]!));
const dateFr = (v: unknown) => v ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(new Date(String(v))) : "";
const euros = (cents: unknown) => (Number(cents || 0) / 100).toLocaleString("fr-FR", { minimumFractionDigits: Number(cents) % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

function layout(title: string, paragraphs: string[], bullets: string[] = []) {
  const p = paragraphs.map((x) => `<p style="margin:0 0 14px 0;line-height:1.55;color:#21132d;">${x}</p>`).join("");
  const ul = bullets.length ? `<ul style="margin:0 0 16px 0;padding-left:20px;color:#21132d;line-height:1.6;">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f8f4fa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4fa;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#1c0b2b;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">Abracadeal</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 18px 0;font-size:21px;color:#4a1766;">${title}</h1>${p}${ul}
<p style="margin:22px 0 0 0;"><a href="${SITE}" style="display:inline-block;background:#6f218c;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;">Accéder à mon espace Pro</a></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f3ecf6;color:#77677f;font-size:12px;line-height:1.5;">Le Service Pros Abracadeal · <a href="mailto:contact@abracadeal.fr" style="color:#6f218c;">contact@abracadeal.fr</a> · abracadeal.fr<br>Vous recevez ce message car vous avez un compte professionnel Abracadeal.</td></tr>
</table></td></tr></table></body></html>`;
}
const toText = (title: string, paragraphs: string[], bullets: string[] = []) =>
  [title, "", ...paragraphs.map((x) => x.replace(/<[^>]+>/g, "")), ...(bullets.length ? ["", ...bullets.map((b) => "- " + b.replace(/<[^>]+>/g, ""))] : []), "", "Accéder à mon espace Pro : " + SITE, "", "Le Service Pros Abracadeal — contact@abracadeal.fr"].join("\n");

function build(type: string, p: any) {
  const formule = `${esc(p.listing_limit)} annonces`;
  const photos = p.photo_limit ? `${esc(p.photo_limit)} photos par annonce` : "";
  const founder = p.founder_number != null && p.status === "trialing";
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
        `Vos annonces sont publiées <strong>gratuitement jusqu’au ${dateFr(p.free_until)}</strong>. Aucun prélèvement n’aura lieu avant cette date ; ensuite, l’abonnement passe au tarif public de ${euros(p.amount_cents)} HT par mois.`,
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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const provided = req.headers.get("x-cron-key") || "";
    const { data: secret } = await supabase.from("integration_secrets").select("secret_value").eq("name", "pro_email_cron").maybeSingle();
    if (!secret?.secret_value) return json({ error: "Cron secret not configured" }, 500);
    if (!provided || provided !== secret.secret_value) return json({ error: "Unauthorized" }, 401);
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

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
        const id = await sendEmail(email, m.subject, toText(m.title, m.paras, m.bullets), layout(m.title, m.paras, m.bullets), "pro-" + row.event_key);
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
