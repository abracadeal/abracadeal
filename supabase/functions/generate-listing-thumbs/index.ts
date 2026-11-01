import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

// 18/10/2026 (+ 01/11/2026 orientation EXIF) : miniatures des photos d'annonces pour les vignettes (≈ 480 px, JPEG qualité 70, quelques dizaines de Ko).
// Les photos publiques (bucket « listing-images ») sont lues, réduites et enregistrées au même chemin dans le
// bucket public « listing-thumbs ». Le site charge la miniature et retombe sur la photo d'origine si elle manque.
// Appelée par le cron (clé interne) ; supprime aussi les miniatures dont la photo n'existe plus.
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const MAX_SIDE = 480;

// 01/11/2026 (Anthony : vignettes de travers) : les photos de téléphone sont souvent enregistrées couchées avec une
// étiquette EXIF « Orientation » ; le navigateur les redresse, mais la miniature les gardait couchées (et rognées).
function exifOrientation(b: Uint8Array): number {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return 1;
    const marker = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10, le = b[t] === 0x49;
      const u16 = (o: number) => le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1];
      const u32 = (o: number) => le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
      const ifd = t + u32(t + 4), n = u16(ifd);
      for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (u16(e) === 0x0112) return u16(e + 8) || 1; }
      return 1;
    }
    if (marker === 0xda) return 1;
    i += 2 + len;
  }
  return 1;
}
// Rotation exacte au pixel près (sans interpolation).
function orient(img: Image, o: number): Image {
  if (o === 3) { const out = new Image(img.width, img.height); const s = img.bitmap, d = out.bitmap, n = s.length; for (let p = 0; p < n; p += 4) { const q = n - 4 - p; d[q] = s[p]; d[q + 1] = s[p + 1]; d[q + 2] = s[p + 2]; d[q + 3] = s[p + 3]; } return out; }
  if (o !== 6 && o !== 8 && o !== 5 && o !== 7) return img;
  const w = img.width, h = img.height, out = new Image(h, w), s = img.bitmap, d = out.bitmap;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (o === 6 || o === 5) ? h - 1 - y : y, ny = (o === 6 || o === 5) ? x : w - 1 - x;
    const si = (y * w + x) * 4, di = (ny * h + nx) * 4;
    d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = s[si + 3];
  }
  return out;
}

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
      const bytes = new Uint8Array(await file.arrayBuffer());
      let img = await Image.decode(bytes);
      img = orient(img, exifOrientation(bytes));
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
