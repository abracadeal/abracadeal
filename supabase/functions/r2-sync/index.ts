// r2-sync (08/11/2026) : copie les photos publiques des annonces (buckets listing-images et listing-thumbs) vers
// Cloudflare R2 (bucket « abracadeal-photos », clé = <bucket>/<chemin>), et supprime de R2 celles effacées de Supabase.
// Le site affiche les photos depuis R2 (sortie gratuite) et retombe sur Supabase si une photo n'y est pas encore.
// Appelée par le cron toutes les 2 min (clé interne), file tenue en base : private.r2_sync + r2_pending()/r2_mark().
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const ACCOUNT = "a98e6b3852356e4cf76d01b92524f8a7", R2_BUCKET = "abracadeal-photos";
const R2_PUBLIC = "https://pub-9747954003f04922a082752db15aeeed.r2.dev/";
const ENDPOINT = `https://${ACCOUNT}.r2.cloudflarestorage.com/${R2_BUCKET}/`;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const r2 = new AwsClient({ accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!, secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!, service: "s3", region: "auto" });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const keyUrl = (bucket: string, name: string) => ENDPOINT + [bucket, ...name.split("/")].map(encodeURIComponent).join("/");

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const { data: sec } = await admin.from("integration_secrets").select("secret_value").eq("name", "pro_stock_moderation_internal").maybeSingle();
  const k = req.headers.get("x-internal-key") || "";
  if (!k || !sec?.secret_value || k !== sec.secret_value) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), 200);
  const started = Date.now();
  if (body?.action === "offload") {
    // 11/11/2026 : R2 devient le stockage principal. On retire de Supabase les originaux déjà copiés sur R2,
    // seulement après avoir vérifié la copie (HEAD R2, même taille). La ligne listing_photos ne change pas.
    const { data: cands, error: ce } = await admin.rpc("r2_offload_candidates", { lim: Math.min(limit, 100) });
    if (ce) return json({ error: ce.message }, 500);
    let off = 0; const bad: unknown[] = [];
    for (const c of (cands || []) as { bucket_id: string; name: string; size: number | null }[]) {
      if (Date.now() - started > 45000) break;
      try {
        const h = await r2.fetch(keyUrl(c.bucket_id, c.name), { method: "HEAD" });
        const len = Number(h.headers.get("content-length") || 0);
        if (!h.ok || !len || (c.size && Number(c.size) !== len)) throw new Error("R2 " + h.status + " taille " + len + "/" + c.size);
        const pub = await fetch(R2_PUBLIC + [c.bucket_id, ...c.name.split("/")].map(encodeURIComponent).join("/"), { method: "HEAD" });
        if (!pub.ok) throw new Error("R2 public " + pub.status);
        await admin.rpc("r2_mark_offloaded", { p_bucket: c.bucket_id, p_name: c.name, p_offloaded: true });
        const { error: re } = await admin.storage.from(c.bucket_id).remove([c.name]);
        if (re) { await admin.rpc("r2_mark_offloaded", { p_bucket: c.bucket_id, p_name: c.name, p_offloaded: false }); throw new Error("remove " + re.message); }
        off++;
      } catch (e) { bad.push({ path: c.bucket_id + "/" + c.name, error: String(e).slice(0, 200) }); }
    }
    return json({ ok: true, offloaded: off, candidates: (cands || []).length, failed: bad.slice(0, 10), nfailed: bad.length, ms: Date.now() - started });
  }
  const { data: rows, error } = await admin.rpc("r2_pending", { lim: limit });
  if (error) return json({ error: error.message }, 500);
  let put = 0, del = 0; const failed: unknown[] = [];
  const work = async (r: { bucket_id: string; name: string; mimetype: string | null; op: string }) => {
    try {
      if (r.op === "delete") {
        const res = await r2.fetch(keyUrl(r.bucket_id, r.name), { method: "DELETE" });
        if (!res.ok && res.status !== 404) throw new Error("R2 delete " + res.status);
        del++;
      } else {
        const { data: f, error: e } = await admin.storage.from(r.bucket_id).download(r.name);
        if (e || !f) throw new Error("download " + (e?.message || "absent"));
        const res = await r2.fetch(keyUrl(r.bucket_id, r.name), {
          method: "PUT", body: new Uint8Array(await f.arrayBuffer()),
          headers: { "Content-Type": r.mimetype || f.type || "image/jpeg", "Cache-Control": "public, max-age=2592000" },
        });
        if (!res.ok) throw new Error("R2 put " + res.status + " " + (await res.text()).slice(0, 200));
        put++;
      }
      await admin.rpc("r2_mark", { p_bucket: r.bucket_id, p_name: r.name, p_op: r.op });
    } catch (e) { failed.push({ path: r.bucket_id + "/" + r.name, error: String(e).slice(0, 200) }); }
  };
  const list = rows || [];
  for (let i = 0; i < list.length && Date.now() - started < 50000; i += 6) await Promise.all(list.slice(i, i + 6).map(work));
  return json({ ok: true, put, del, failed: failed.slice(0, 10), nfailed: failed.length, ms: Date.now() - started });
});
