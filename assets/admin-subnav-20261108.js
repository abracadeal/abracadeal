/* Abracadeal — barre d'outils admin commune (08/11/2026, demande d'Anthony : « les outils comme Modération,
   on doit pouvoir y accéder rapidement »). Sur admin.html elle se place dans #ahTools (sous les onglets) ;
   sur les autres pages admin, en haut de la page. Pastilles : annonces à modérer, imports à valider, réponses « OK ».
   Pages réservées à l'admin : la barre n'est chargée que sur les pages admin. */
(function () {
  'use strict';
  if (window.__abracaAdminSubnav) return;
  window.__abracaAdminSubnav = true;
  var TOOLS = [
    ['admin.html', 'Tableau de bord', ''],
    ['moderation.html', 'Modération', 'mod'],
    ['admin-test-import.html', 'Imports', 'imp'],
    ['admin-prospection.html', 'Prospection', 'ok'],
    ['admin-recherche.html', 'Annonces', ''],
    ['admin-diffusion.html', 'Diffusion', ''],
    ['admin-partenaires.html', 'API', ''],
    ['admin-vacances.html', 'Vacances', ''],
    ['pro-pro.html', 'Entre Pro', ''],
    ['admin-commerce.html', 'Commerce', ''],
    ['admin-retention.html', 'Données', ''],
    ['admin-pilotage.html', 'Finances', '']
  ];
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var css = '.abn{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:8px 12px;background:#1b0d2d;border-bottom:1px solid rgba(255,255,255,.09);font-family:"DM Sans",system-ui,sans-serif;-webkit-overflow-scrolling:touch}' +
    '.abn::-webkit-scrollbar{display:none}' +
    '.abn a{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:#e9def3;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:7px 11px;font-size:13px;font-weight:700;line-height:1.1;white-space:nowrap}' +
    '.abn a.on{background:#fff;color:#1b0d2d;border-color:#fff}' +
    '.abn a.home{background:linear-gradient(135deg,#ec409d,#ff69bd);color:#fff;border-color:transparent}' +
    '.abn b{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#f7bd4b;color:#1b0d2d;font-size:11px;display:inline-grid;place-items:center}.abn b[hidden]{display:none}' +
    '#ahTools .abn{background:transparent;border:0;padding:0 0 10px}';
  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var bar = document.createElement('nav'); bar.className = 'abn'; bar.setAttribute('aria-label', 'Outils admin');
    TOOLS.forEach(function (t) {
      if (t[0] === 'admin.html' && page === 'admin.html') return;
      var a = document.createElement('a'); a.href = t[0]; a.textContent = t[1];
      if (t[0] === page) a.className = 'on'; else if (t[0] === 'admin.html') a.className = 'home';
      if (t[2]) { var b = document.createElement('b'); b.hidden = true; b.dataset.k = t[2]; a.appendChild(b); }
      bar.appendChild(a);
    });
    var slot = document.getElementById('ahTools');
    if (slot) slot.appendChild(bar); else document.body.insertBefore(bar, document.body.firstChild);
    var cur = bar.querySelector('a.on'); if (cur && cur.scrollIntoView) setTimeout(function () { try { bar.scrollLeft = cur.offsetLeft - 12; } catch (_) {} }, 50);
    return bar;
  }
  function badges(bar, sb) {
    sb.rpc('admin_overview').then(function (r) {
      if (r.error || !r.data) return;
      var t = r.data.todo || {}, n = { mod: Number(t.moderation_pending || 0) + Number(t.reports_open || 0), imp: Number(t.imports_pending || 0), ok: Number(t.acceptances_pending || 0) };
      bar.querySelectorAll('b[data-k]').forEach(function (b) { var v = n[b.dataset.k] || 0; b.textContent = v > 99 ? '99+' : String(v); b.hidden = !v; });
    });
  }
  // Pas de 2e client Supabase (deux clients qui renouvellent le même jeton = déconnexions) : on réutilise celui de la page.
  function client() {
    if (window.__abracaAdminSb) return window.__abracaAdminSb;
    try { if (typeof sb !== 'undefined' && sb && sb.rpc) return sb; } catch (_) {}
    return null;
  }
  function init() {
    var bar = build(), tries = 0;
    (function wait() {
      var c = client();
      if (!c) { if (++tries < 20) setTimeout(wait, 500); return; }
      badges(bar, c);
      setInterval(function () { if (document.visibilityState === 'visible') badges(bar, c); }, 60000);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') badges(bar, c); });
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
