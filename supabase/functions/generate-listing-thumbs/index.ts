import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

// 18/10/2026 : miniatures des photos d'annonces pour les vignettes (≈ 480 px, JPEG qualité 70, quelques dizaines de Ko).
// Les photos publiques (bucket « listing-images ») sont lues, réduites et enregistrées au même chemin dans le
// bucket public « listing-thumbs ». Le site charge la miniature et retombe sur la photo d'origine si elle manque.
// Appelée par le cron (clé interne) ; supprime aussi les miniatures dont la photo n'existe plus.
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const MAX_SIDE = 480;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const { data: sec } = await admin.from("integration_secrets").select("secret_value").eq("name", "pro_stock_moderation_internal").maybeSingle();
  const k = req.headers.get("x-internal-key") || "";
  if (!k || !sec?.secret_value || k !== sec.secret_value) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body?.limit) || 4, 1), 10);
  const started = Date.now();
  const done: string[] = [], failed: { path: string; error: string }[] = [];

  const { data: batch, error } = await admin.rpc("thumbs_next_batch", { p_limit: limit });
  if (error) return json({ error: error.message }, 500);

  for (const row of (batch || []) as { storage_path: string }[]) {
    if (Date.now() - started > 20000) break;
    const path = String(row.storage_path);
    try {
      const { data: file, error: dErr } = await admin.storage.from("listing-images").download(path);
      if (dErr || !file) throw dErr || new Error("téléchargement impossible");
      const img = await Image.decode(new Uint8Array(await file.arrayBuffer()));
      if (img.width > MAX_SIDE || img.height > MAX_SIDE) {
        if (img.width >= img.height) img.resize(MAX_SIDE, Image.RESIZE_AUTO);
        else img.resize(Image.RESIZE_AUTO, MAX_SIDE);
      }
      const jpeg = await img.encodeJPEG(70);
      const { error: uErr } = await admin.storage.from("listing-thumbs").upload(path, jpeg, { upsert: true, contentType: "image/jpeg", cacheControl: "31536000" });
      if (uErr) throw uErr;
      await admin.rpc("thumbs_mark", { p_path: path, p_error: null });
      done.push(path);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 300);
      await admin.rpc("thumbs_mark", { p_path: path, p_error: msg });
      failed.push({ path, error: msg });
    }
  }

  // Ménage : miniatures dont la photo d'origine a disparu.
  let removed = 0;
  const { data: orphans } = await admin.rpc("thumbs_orphans", { p_limit: 50 });
  const paths = ((orphans || []) as { storage_path: string }[]).map((o) => String(o.storage_path));
  if (paths.length) {
    const { error: rErr } = await admin.storage.from("listing-thumbs").remove(paths);
    if (!rErr) { for (const p of paths) await admin.rpc("thumbs_forget", { p_path: p }); removed = paths.length; }
  }
  return json({ ok: true, done: done.length, failed, removed });
});
