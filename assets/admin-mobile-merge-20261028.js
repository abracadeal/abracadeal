/* Abracadeal — 28/10/2026 : sur mobile, tout l'administratif est dans le menu « Admin » de la barre du bas.
   « Compte » ne garde que l'espace personnel (identité, Mon espace, Mes informations).
   Sur mobile (≤ 760 px), on déplace dans le menu Admin : le tableau de bord, la base de données et
   l'interrupteur « Offre Fondateurs ». Sur ordinateur, rien ne change (ils restent dans « Mon compte »).
   Pour annuler : retirer ce script et sa feuille de style dans index.html. */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width: 760px)');
  var $ = function (s) { return document.querySelector(s); };
  var homes = {};

  function remember(key, el) {
    if (!homes[key] || !homes[key].parent.isConnected) homes[key] = { parent: el.parentNode, next: el.nextSibling };
  }
  function extraZone() {
    var body = $('#mobileAdminModal .modal-body');
    if (!body) return null;
    var zone = $('#mobileAdminExtra');
    if (!zone) { zone = document.createElement('div'); zone.id = 'mobileAdminExtra'; zone.className = 'mobile-admin-extra'; body.appendChild(zone); }
    return zone;
  }
  function items() {
    return [['founder', $('.aal-founder-switch')], ['stats', $('#adminStatsPanel')], ['db', $('#adminDatabasePanel')]];
  }
  function place() {
    var zone = extraZone(); if (!zone) return;
    var isAdmin = false;
    try { isAdmin = (typeof currentProfile !== 'undefined' && !!(currentProfile && currentProfile.is_admin)) || !!$('#loggedInAccount.aal-is-admin'); } catch (e) {}
    items().forEach(function (it) {
      var key = it[0], el = it[1]; if (!el) return;
      if (mq.matches && isAdmin) {
        if (el.parentNode !== zone) { remember(key, el); zone.appendChild(el); }
        if (key !== 'founder') el.classList.remove('hidden');
      } else if (el.parentNode === zone && homes[key]) {
        var h = homes[key];
        if (h.next && h.next.parentNode === h.parent) h.parent.insertBefore(el, h.next); else h.parent.appendChild(el);
      }
    });
  }
  function syncImportBadge() {
    var b = $('#mobileAdminImportBadge'); if (!b || typeof sb === 'undefined' || !sb) return;
    sb.rpc('admin_list_site_imports').then(function (r) {
      if (r.error) return;
      var n = (r.data || []).filter(function (x) { return x.review_status === 'pending'; }).length;
      b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('show', n > 0);
    });
  }
  // Le menu Admin s'ouvre : on y range les blocs, puis on rafraîchit les chiffres.
  document.addEventListener('click', function (e) {
    if (e.target.closest('#mobileFavoritesAdminBtn')) {
      setTimeout(function () { place(); if (mq.matches) { try { window.loadAdminDashboardStats && window.loadAdminDashboardStats(); } catch (er) {} syncImportBadge(); } }, 60);
    }
  }, true);
  if (mq.addEventListener) mq.addEventListener('change', place); else if (mq.addListener) mq.addListener(place);
  window.addEventListener('abracadeal:auth', function () { setTimeout(place, 600); });
  // Le compte se construit après la connexion : on vérifie quelques fois au démarrage.
  [800, 2000, 4500].forEach(function (t) { setTimeout(place, t); });
})();
