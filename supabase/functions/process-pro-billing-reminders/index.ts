import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Abracadeal <contact@abracadeal.fr>";
const MANAGE_URL = "https://abracadeal.fr/?billing=manage";
const CANCEL_URL = "https://abracadeal.fr/?billing=cancel";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]!));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function formatAmount(cents: number, currency = "eur") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(cents / 100);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const providedKey = req.headers.get("x-cron-key") || "";
    const { data: secretRow, error: secretError } = await supabase
      .from("integration_secrets")
      .select("secret_value")
      .eq("name", "pro_billing_reminder_cron")
      .single();

    if (secretError || !secretRow?.secret_value) {
      return json({ error: "Cron secret not configured" }, 500);
    }
    if (!providedKey || providedKey !== secretRow.secret_value) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

    const now = new Date();
    const maxDate = new Date(now.getTime() + 8 * 86400000).toISOString();

    const { data: subscriptions, error: subError } = await supabase
      .from("pro_subscriptions")
      .select("user_id,plan_code,status,stripe_subscription_id,billing_starts_at,cancel_at_period_end")
      .in("status", ["trialing", "active"])
      .eq("cancel_at_period_end", false)
      .not("billing_starts_at", "is", null)
      .gt("billing_starts_at", now.toISOString())
      .lte("billing_starts_at", maxDate)
      .order("billing_starts_at", { ascending: true })
      .limit(500);

    if (subError) throw subError;

    const { data: plans, error: planError } = await supabase
      .from("pro_subscription_plans")
      .select("code,label,amount_cents,currency");
    if (planError) throw planError;
    const planMap = new Map((plans || []).map((p: any) => [p.code, p]));

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const results: unknown[] = [];

    for (const sub of subscriptions || []) {
      const billingAt = new Date(sub.billing_starts_at);
      const days = (billingAt.getTime() - now.getTime()) / 86400000;

      let reminderType: "j7" | "j3" | null = null;
      if (days > 5.5 && days <= 7.5) reminderType = "j7";
      else if (days > 1.5 && days <= 3.5) reminderType = "j3";
      else {
        skipped++;
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from("pro_billing_reminders")
        .select("id,status")
        .eq("user_id", sub.user_id)
        .eq("billing_starts_at", sub.billing_starts_at)
        .eq("reminder_type", reminderType)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing?.status === "sent") {
        skipped++;
        continue;
      }

      let reminderId = existing?.id || null;
      if (!reminderId) {
        const { data: created, error: createError } = await supabase
          .from("pro_billing_reminders")
          .insert({
            user_id: sub.user_id,
            stripe_subscription_id: sub.stripe_subscription_id,
            reminder_type: reminderType,
            billing_starts_at: sub.billing_starts_at,
            status: "pending"
          })
          .select("id")
          .single();
        if (createError) throw createError;
        reminderId = created.id;
      }

      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(sub.user_id);
      const email = userData?.user?.email || "";
      if (userError || !email) {
        failed++;
        await supabase
          .from("pro_billing_reminders")
          .update({
            status: "failed",
            last_error: "Adresse e-mail introuvable",
            updated_at: new Date().toISOString()
          })
          .eq("id", reminderId);
        continue;
      }

      const plan: any = planMap.get(sub.plan_code);
      const amount = plan ? formatAmount(Number(plan.amount_cents || 0), String(plan.currency || "eur")) : "le tarif de votre formule";
      const dateText = formatDate(sub.billing_starts_at);
      const leadText = reminderType === "j7" ? "dans environ 7 jours" : "dans environ 3 jours";
      const subject = reminderType === "j7"
        ? "Rappel : votre abonnement Abracadeal Pro démarre dans 7 jours"
        : "Rappel : votre abonnement Abracadeal Pro démarre bientôt";

      const text = `Bonjour,\n\nPetit rappel concernant votre offre Fondateurs Abracadeal Pro.\n\nVos 12 mois offerts arrivent à leur terme. La facturation de votre formule commencera ${leadText}, le ${dateText}, au tarif de ${amount} HT/mois.\n\nAucun prélèvement n'est effectué avant cette date.\n\nAvant le début de la facturation, vous pouvez à tout moment :\n- changer de formule,\n- mettre à jour votre moyen de paiement (carte bancaire ou prélèvement SEPA),\n- résilier votre abonnement.\n\nGérer mon abonnement :\n${MANAGE_URL}\n\nRésilier directement :\n${CANCEL_URL}\n\nSi vous avez une question, répondez simplement à cet e-mail.\n\nBien cordialement,\nService Pros Abracadeal\ncontact@abracadeal.fr`;

      const html = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#1f2937;line-height:1.6">
  <div style="font-size:20px;font-weight:700;color:#2b1740;margin-bottom:20px">Abracadeal Pro</div>
  <p>Bonjour,</p>
  <p>Petit rappel concernant votre <strong>offre Fondateurs Abracadeal Pro</strong>.</p>
  <p>Vos 12 mois offerts arrivent à leur terme. La facturation de votre formule commencera <strong>${escapeHtml(leadText)}</strong>, le <strong>${escapeHtml(dateText)}</strong>, au tarif de <strong>${escapeHtml(amount)} HT/mois</strong>.</p>
  <p><strong>Aucun prélèvement n'est effectué avant cette date.</strong></p>
  <p>Avant le début de la facturation, vous pouvez à tout moment <strong>changer de formule, mettre à jour votre moyen de paiement (carte bancaire ou prélèvement SEPA) ou résilier votre abonnement</strong>.</p>
  <p style="margin:24px 0">
    <a href="${MANAGE_URL}" style="display:inline-block;padding:12px 18px;background:#6f2bd8;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Gérer mon abonnement</a>
  </p>
  <p style="font-size:14px;color:#6b7280">Ce lien permet d'accéder à la gestion de votre formule et de votre moyen de paiement.</p>
  <p><a href="${CANCEL_URL}" style="color:#7a2fd1;text-decoration:underline">Résilier mon abonnement</a></p>
  <p>Si vous avez une question, répondez simplement à cet e-mail.</p>
  <p style="margin-top:24px">Bien cordialement,<br><strong>Service Pros Abracadeal</strong><br>contact@abracadeal.fr</p>
</div>`;

      const resend = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `pro-billing-${reminderId}`
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject,
          text,
          html
        })
      });

      const resendBody = await resend.json().catch(() => ({}));
      if (!resend.ok) {
        failed++;
        await supabase
          .from("pro_billing_reminders")
          .update({
            status: "failed",
            last_error: JSON.stringify(resendBody).slice(0, 1000),
            updated_at: new Date().toISOString()
          })
          .eq("id", reminderId);
        results.push({ user_id: sub.user_id, reminder_type: reminderType, ok: false });
        continue;
      }

      await supabase
        .from("pro_billing_reminders")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_email_id: resendBody?.id || null,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", reminderId);

      sent++;
      results.push({ user_id: sub.user_id, reminder_type: reminderType, ok: true });
    }

    return json({ ok: true, checked: subscriptions?.length || 0, sent, skipped, failed, results });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});