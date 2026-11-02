// prospect-backup (02/11/2026, Claude) — sauvegarde (lecture seule) des entreprises de l'annuaire sans site ni e-mail
// avant leur suppression : fichier JSONL compressé dans le bucket privé « backups ». Clé interne obligatoire.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const WHERE = "crawl_status in ('guess_failed','no_site') and email is null and site is null";
Deno.serve(async (req) => {
  const { data: k } = await admin.from("integration_secrets").select("secret_value").eq("name", "pro_stock_moderation_internal").single();
  if (!k?.secret_value || req.headers.get("x-internal-key") !== k.secret_value) return json({ error: "Non autorisé" }, 401);
  const body = await req.json().catch(() => ({}));
  const max = Math.min(Math.max(Number(body?.max) || 30000, 1000), 50000); const part = String(body?.part || "1");
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
  try {
    const cs = new CompressionStream("gzip"); const w = cs.writable.getWriter(); const out = new Response(cs.readable).arrayBuffer();
    const enc = new TextEncoder(); let after = String(body?.after || ""); let n = 0; let raw = 0;
    while (n < max) {
      const rows = await sql.unsafe(`select id, row_to_json(l)::text j from private.prospect_leads l where ${WHERE} and id > $1 order by id limit ${Math.min(10000, max - n)}`, [after]);
      if (!rows.length) break;
      const chunk = enc.encode(rows.map((r: any) => r.j).join("\n") + "\n"); raw += chunk.length; await w.write(chunk);
      n += rows.length; after = String(rows[rows.length - 1].id);
    }
    await w.close(); const gz = new Uint8Array(await out);
    await admin.storage.createBucket("backups", { public: false }).catch(() => {});
    const path = `prospect_leads_sans_site_2026-11-02_part${part.padStart(2, "0")}.jsonl.gz`;
    const { error } = await admin.storage.from("backups").upload(path, gz, { upsert: true, contentType: "application/gzip" });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, rows: n, raw_bytes: raw, gz_bytes: gz.length, path, next_after: n < max ? null : after });
  } catch (e) { return json({ error: String((e as Error)?.message || e) }, 500); }
  finally { await sql.end({ timeout: 2 }).catch(() => {}); }
});
