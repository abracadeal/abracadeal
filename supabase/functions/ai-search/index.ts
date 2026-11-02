// ai-search (02/11/2026, Claude) — recherche IA gratuite : modèle gte-small inclus dans Supabase (aucune clé, aucun coût).
// - { action: "embed", limit } + x-internal-key : calcule l'empreinte de sens des annonces en ligne qui n'en ont pas (cron).
// - { q } (public) : empreinte de la recherche → annonces les plus proches (id + score). Les filtres restent côté site.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
// @ts-ignore Supabase.ai est fourni par le runtime des fonctions
const session = new Supabase.ai.Session("gte-small");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const emb = async (t: string) => (await session.run(t, { mean_pool: true, normalize: true })) as number[];
const vec = (e: number[]) => "[" + e.map((x) => x.toFixed(6)).join(",") + "]";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  if (body?.action === "embed") {
    const { data: k } = await admin.from("integration_secrets").select("secret_value").eq("name", "pro_stock_moderation_internal").single();
    if (!k?.secret_value || req.headers.get("x-internal-key") !== k.secret_value) return json({ error: "Non autorisé" }, 401);
    const { data: rows, error } = await admin.rpc("ai_embed_next", { p_limit: Math.min(Number(body.limit) || 8, 12) });
    if (error) return json({ error: error.message }, 500);
    let done = 0; const failed: string[] = [];
    for (const r of rows || []) {
      try {
        const e = await emb(String(r.txt || ""));
        const { error: se } = await admin.rpc("ai_embed_save", { p_id: r.id, p_embedding: vec(e), p_hash: r.h });
        if (se) throw se; done++;
      } catch (err) { failed.push(String(r.id) + " : " + String((err as Error)?.message || err).slice(0, 120)); }
    }
    return json({ ok: true, done, failed });
  }
  const q = String(body?.q || "").trim().slice(0, 120);
  if (q.length < 2) return json({ results: [] });
  try {
    const { data, error } = await admin.rpc("ai_match_listings", { p_embedding: vec(await emb(q)), p_limit: Math.min(Number(body.limit) || 60, 200) });
    if (error) return json({ error: error.message }, 500);
    return json({ results: (data || []).map((r: any) => ({ id: r.listing_id, score: Math.round(r.score * 1000) / 1000 })) });
  } catch (err) { return json({ error: String((err as Error)?.message || err) }, 500); }
});
