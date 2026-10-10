import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Espace modérateur (10/10/2026)
//   queue                       modérateur : annonces en attente + photos (liens signés 1 h)
//   create / set_active / reset admin      : gestion des comptes modérateurs (pseudo + mot de passe)
const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const MOD_DOMAIN = "moderation.abracadeal.fr";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Connexion requise" }, 401);
  const user = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) return json({ error: "Session expirée, reconnectez-vous" }, 401);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const [{ data: isAdmin }, { data: isMod }] = await Promise.all([user.rpc("is_admin"), user.rpc("is_moderator")]);

  try {
    if (action === "queue") {
      if (isMod !== true) return json({ error: "Accès réservé aux modérateurs" }, 403);
      const { data: rows, error } = await admin.from("listings")
        .select("id,title,description,price,category,city,postal_code,seller_type,created_at,updated_at,revision_of,vehicle_make,vehicle_model,vehicle_year,mileage,listing_photos(id,storage_path,storage_bucket,position)")
        .eq("status", "pending").order("created_at", { ascending: true }).limit(40);
      if (error) throw error;
      const ids = (rows || []).map((r) => r.id);
      const { data: mods } = ids.length ? await admin.from("listing_moderation").select("listing_id,risk_level,risk_score,reasons,safety_blocked").in("listing_id", ids) : { data: [] };
      const modMap = new Map((mods || []).map((m: any) => [m.listing_id, m]));
      const { count } = await admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending");
      const out = [];
      for (const r of rows || []) {
        const m: any = modMap.get(r.id);
        if (m?.safety_blocked) continue;
        const photos = [...(r.listing_photos || [])].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        const urls: string[] = [];
        for (const p of photos.slice(0, 12)) {
          if (/^https?:\/\//i.test(p.storage_path)) { urls.push(p.storage_path); continue; }
          if (p.storage_bucket === "listing-images") { urls.push(admin.storage.from("listing-images").getPublicUrl(p.storage_path).data.publicUrl); continue; }
          const { data: s } = await admin.storage.from(p.storage_bucket).createSignedUrl(p.storage_path, 3600);
          if (s?.signedUrl) urls.push(s.signedUrl);
        }
        const { listing_photos: _lp, ...rest } = r as any;
        out.push({ ...rest, description: String(r.description || "").replace(/\[ABRACA_[^\]]+\]/g, " ").replace(/\s+\n/g, "\n").trim(), photos: urls,
          risk_level: m?.risk_level || null, risk_score: m?.risk_score ?? null, reasons: (m?.reasons || []).slice(0, 4) });
      }
      return json({ ok: true, total: count || 0, rows: out });
    }

    if (isAdmin !== true) return json({ error: "Accès réservé à l'administrateur" }, 403);

    if (action === "create") {
      const pseudo = String(body.pseudo || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!/^[a-z0-9._-]{3,30}$/.test(pseudo)) return json({ error: "Pseudo : 3 à 30 caractères, lettres, chiffres, point, tiret." }, 400);
      if (password.length < 8) return json({ error: "Mot de passe : 8 caractères minimum." }, 400);
      const { data: created, error } = await admin.auth.admin.createUser({
        email: `${pseudo}@${MOD_DOMAIN}`, password, email_confirm: true,
        user_metadata: { display_name: "Modérateur " + pseudo, moderator: true },
      });
      if (error) return json({ error: /already/i.test(error.message) ? "Ce pseudo existe déjà." : error.message }, 400);
      const reg = await admin.rpc("moderator_register", { p_user: created.user.id, p_pseudo: pseudo, p_by: u.user.id });
      if (reg.error) throw reg.error;
      return json({ ok: true, message: `Modérateur « ${pseudo} » créé.` });
    }
    if (action === "set_active" || action === "reset") {
      const { data: list } = await user.rpc("admin_moderators");
      if (!(list || []).some((m: any) => m.user_id === String(body.user_id || ""))) return json({ error: "Compte modérateur introuvable" }, 404);
    }
    if (action === "set_active") {
      const id = String(body.user_id || ""); const active = body.active === true;
      const r = await admin.rpc("moderator_set_active", { p_user: id, p_active: active });
      if (r.error) throw r.error;
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
      if (error) throw error;
      return json({ ok: true, message: active ? "Accès réactivé." : "Accès coupé : il ne peut plus se connecter." });
    }
    if (action === "reset") {
      const id = String(body.user_id || ""); const password = String(body.password || "");
      if (password.length < 8) return json({ error: "Mot de passe : 8 caractères minimum." }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) throw error;
      return json({ ok: true, message: "Nouveau mot de passe enregistré." });
    }
    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
