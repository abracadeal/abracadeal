import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Abracadeal <contact@abracadeal.fr>";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]!));
}

Deno.serve(async () => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    await supabase.rpc("cleanup_read_message_email_alerts");

    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data: alerts, error: alertsError } = await supabase
      .from("message_email_alerts")
      .select("conversation_id,recipient_id,last_message_id,pending_since,notified_at")
      .is("notified_at", null)
      .lte("pending_since", cutoff)
      .order("pending_since", { ascending: true })
      .limit(50);

    if (alertsError) throw alertsError;
    let sent = 0;

    for (const alert of alerts ?? []) {
      const { data: unread, error: unreadError } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", alert.conversation_id)
        .neq("sender_id", alert.recipient_id)
        .is("read_at", null)
        .limit(1);

      if (unreadError) throw unreadError;
      if (!unread || unread.length === 0) {
        await supabase
          .from("message_email_alerts")
          .delete()
          .eq("conversation_id", alert.conversation_id)
          .eq("recipient_id", alert.recipient_id);
        continue;
      }

      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(alert.recipient_id);
      if (userError || !userData?.user?.email) continue;

      // Si le destinataire est actif sur Abracadeal, on garde l'alerte en attente.
      // Elle sera envoyée plus tard uniquement si le message reste non lu après son départ.
      const activeCutoff = new Date(Date.now() - 120_000).toISOString();
      const { data: presence } = await supabase
        .from("user_presence")
        .select("last_seen_at")
        .eq("user_id", alert.recipient_id)
        .maybeSingle();
      if (presence?.last_seen_at && presence.last_seen_at >= activeCutoff) continue;

      const { data: message } = await supabase
        .from("messages")
        .select("body,sender_id,created_at")
        .eq("id", alert.last_message_id)
        .maybeSingle();

      const { data: conversation } = await supabase
        .from("conversations")
        .select("listing_id")
        .eq("id", alert.conversation_id)
        .maybeSingle();

      let senderName = "Un utilisateur";
      if (message?.sender_id) {
        const { data: sender } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", message.sender_id)
          .maybeSingle();
        if (sender?.display_name) senderName = sender.display_name;
      }

      let listingTitle = "";
      if (conversation?.listing_id) {
        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", conversation.listing_id)
          .maybeSingle();
        if (listing?.title) listingTitle = listing.title;
      }

      const preview = (message?.body ?? "").trim().replace(/\s+/g, " ").slice(0, 180);
      const subject = listingTitle
        ? `Nouveau message concernant ${listingTitle}`
        : "Vous avez un nouveau message sur Abracadeal";

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#111827">
          <h2 style="margin:0 0 16px">Vous avez un nouveau message</h2>
          <p><strong>${escapeHtml(senderName)}</strong> vous a écrit sur Abracadeal.</p>
          ${listingTitle ? `<p style="color:#6b7280">Annonce : ${escapeHtml(listingTitle)}</p>` : ""}
          ${preview ? `<div style="margin:18px 0;padding:14px 16px;background:#f3f4f6;border-radius:12px">“${escapeHtml(preview)}”</div>` : ""}
          <p><a href="https://abracadeal.fr/" style="display:inline-block;padding:12px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:10px">Voir la messagerie</a></p>
          <p style="font-size:12px;color:#9ca3af;margin-top:28px">Un seul email est envoyé tant que cette conversation reste non lue.</p>
        </div>`;

      const resend = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [userData.user.email],
          subject,
          html
        })
      });

      if (!resend.ok) {
        const body = await resend.text();
        console.error("Resend error", resend.status, body);
        continue;
      }

      await supabase
        .from("message_email_alerts")
        .update({ notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("conversation_id", alert.conversation_id)
        .eq("recipient_id", alert.recipient_id)
        .is("notified_at", null);

      sent += 1;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
});