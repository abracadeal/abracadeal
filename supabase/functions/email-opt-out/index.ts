import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function page(title: string, message: string, ok = true) {
  const accent = ok ? "#7c3aed" : "#b91c1c";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title></head><body style="margin:0;background:#160a24;font-family:Arial,Helvetica,sans-serif;color:#fff;min-height:100vh;display:grid;place-items:center;padding:24px"><main style="max-width:560px;width:100%;background:#241037;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:34px;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center"><div style="font-size:34px;font-weight:800;margin-bottom:8px">Abracadeal</div><div style="color:#d8b4fe;letter-spacing:.2em;font-size:12px;margin-bottom:28px">FAIS TON VŒU</div><div style="width:54px;height:54px;border-radius:50%;margin:0 auto 18px;background:${accent};display:grid;place-items:center;font-size:28px">${ok ? "✓" : "!"}</div><h1 style="font-size:24px;margin:0 0 12px">${title}</h1><p style="color:#ddd6fe;line-height:1.6;margin:0">${message}</p></main></body></html>`;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
    }

    const url = new URL(req.url);
    let recordId = url.searchParams.get("rid") || "";
    let email = url.searchParams.get("email") || "";
    let source = url.searchParams.get("source") || "email-link";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      recordId = String(body.recordId || body.rid || recordId || "");
      email = String(body.email || email || "");
      source = String(body.source || source || "email-link");
    }

    if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
      return new Response(page("Lien invalide", "Ce lien de désinscription n’est pas valide. Vous pouvez répondre à l’email reçu pour demander votre retrait.", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    const requestedAt = new Date().toISOString();
    const { error } = await supabase
      .from("email_opt_outs")
      .upsert({
        professional_record_id: recordId,
        email: email || null,
        channel: "Email",
        source,
        requested_at: requestedAt
      }, { onConflict: "professional_record_id" });

    if (error) {
      console.error("email_opt_outs upsert failed", error);
      return new Response(page("Demande non enregistrée", "Une erreur temporaire est survenue. Réessayez dans quelques instants ou répondez à l’email reçu.", false), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    return new Response(page("Vous êtes désinscrit", "Votre demande a bien été prise en compte. Vous ne recevrez plus d’emails de prospection Abracadeal."), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error(error);
    return new Response(page("Erreur", "Une erreur temporaire est survenue. Réessayez dans quelques instants.", false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
});
