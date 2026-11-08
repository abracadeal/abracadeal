/* Abracadeal — retour vers l'espace admin sur les pages admin (08/11/2026).
   Anthony : « trop de boutons, 2 rangées pas intuitif » → plus de barre d'outils. Sur téléphone, la barre du haut
   (‹ retour) ramène déjà à admin.html ; sur ordinateur, un seul lien « ‹ Espace admin » en haut de la page. */
(function () {
  'use strict';
  if (window.__abracaAdminSubnav) return;
  window.__abracaAdminSubnav = true;
  if (window.matchMedia && window.matchMedia('(max-width:760px)').matches) return;
  function init() {
    var st = document.createElement('style');
    st.textContent = '.abn-back{display:block;padding:10px 16px;background:#1b0d2d;border-bottom:1px solid rgba(255,255,255,.09);font:700 14px "DM Sans",system-ui,sans-serif}.abn-back a{color:#ff69bd;text-decoration:none}';
    document.head.appendChild(st);
    var d = document.createElement('div'); d.className = 'abn-back';
    d.innerHTML = '<a href="admin.html">‹ Espace admin</a>';
    document.body.insertBefore(d, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
