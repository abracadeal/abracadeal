/* Abracadeal — service worker de l'application installable (18/10/2026).
   Volontairement minimal : il NE MET RIEN EN CACHE (le site est mis à jour souvent,
   les annonces viennent de Supabase). Il sert seulement à rendre le site installable
   et à afficher une page propre quand il n'y a pas de connexion.
   Pour le désactiver : remplacer ce fichier par un service worker qui appelle
   self.registration.unregister() (voir JOURNAL.md). */
const SW_VERSION = 'abraca-sw-20261018-2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1b0d2d"><title>Abracadeal — hors connexion</title>
<style>
html,body{margin:0;height:100%;background:#1e0d37;color:#f3e8ff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box;gap:14px}
img{width:96px;height:96px;border-radius:22px}
h1{font-size:1.35rem;margin:6px 0 0}
p{margin:0;color:#d6c3ea;line-height:1.45;max-width:320px}
button{margin-top:10px;border:0;border-radius:999px;padding:13px 26px;font-weight:800;font-size:1rem;color:#fff;background:linear-gradient(120deg,#7b27a0,#ee42a5);cursor:pointer}
</style></head><body><main>
<img src="/icon-192.png" alt="">
<h1>Pas de connexion internet</h1>
<p>Abracadeal a besoin d'internet pour afficher les annonces. Vérifiez votre connexion puis réessayez.</p>
<button onclick="location.reload()">Réessayer</button>
</main></body></html>`;

self.addEventListener('fetch', event => {
  const req = event.request;
  // On ne touche qu'à l'ouverture des pages du site ; tout le reste passe normalement.
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  // Les pages sont toujours redemandées au serveur (pas de vieille version gardée par le téléphone
  // après une mise à jour du site). Si la variante échoue, on retombe sur la requête normale.
  let fresh = null;
  try { fresh = new Request(req, { cache: 'no-cache' }); } catch (_) { fresh = null; }
  event.respondWith(
    (fresh ? fetch(fresh).catch(() => fetch(req)) : fetch(req)).catch(() => new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    }))
  );
});
