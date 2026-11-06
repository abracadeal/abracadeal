// 06/11/2026 (Claude) : robot ClicandSite déplacé dans le projet Supabase ClicandSite (séparé d'Abracadeal).
// Cette fonction ne fait plus rien côté Abracadeal.
Deno.serve(() => new Response(JSON.stringify({ error: "moved", to: "projet Supabase ClicandSite" }), { status: 410, headers: { "Content-Type": "application/json" } }));
