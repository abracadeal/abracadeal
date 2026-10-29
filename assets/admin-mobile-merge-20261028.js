/* Abracadeal — 28/10/2026 : sur mobile, tout l'administratif est dans le menu « Admin » de la barre du bas.
   « Compte » ne garde que l'espace personnel (identité, Mon espace, Mes informations).
   Sur mobile (≤ 760 px), on déplace dans le menu Admin le tableau de bord et la base de données ;
   le menu Admin a sa propre tuile « Offre Fondateurs ». Sur ordinateur, rien ne change.
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
    return [['stats', $('#adminStatsPanel')], ['db', $('#adminDatabasePanel')]];
  }
  function place() {
    var zone = extraZone(); if (!zone) return;
    var isAdmin = false;
    try { isAdmin = (typeof currentProfile !== 'undefined' && !!(currentProfile && currentProfile.is_admin)) || !!$('#loggedInAccount.aal-is-admin'); } catch (e) {}
    items().forEach(function (it) {
      var key = it[0], el = it[1]; if (!el) return;
      if (mq.matches && isAdmin) {
        if (el.parentNode !== zone) { remember(key, el); zone.appendChild(el); }
        el.classList.remove('hidden');
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
  // Tuile « Offre Fondateurs » du menu Admin (même action que dans « Mon compte » sur ordinateur).
  var foOpen = null;
  function foRender() {
    var st = $('#mobileAdminFounderState'), btn = $('#mobileAdminFounderBtn'); if (!st || !btn) return;
    st.textContent = foOpen === null ? '…' : (foOpen ? 'Ouverte' : 'Fermée');
    btn.classList.toggle('is-closed', foOpen === false);
  }
  function foLoad() {
    if (typeof sb === 'undefined' || !sb) return;
    sb.rpc('get_founder_offer_open').then(function (r) { if (!r.error) { foOpen = r.data !== false; foRender(); } });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#mobileAdminFounderBtn')) return;
    e.preventDefault();
    if (typeof sb === 'undefined' || !sb) return;
    // 29/10/2026 : menu Admin ouvert par un autre chemin (retour admin, lien #admin) : l'état n'était pas encore chargé et le clic ne faisait rien.
    if (foOpen === null) { sb.rpc('get_founder_offer_open').then(function (r) { if (!r.error) { foOpen = r.data !== false; foRender(); askFounder(); } else alert(r.error.message || 'État de l’offre indisponible'); }); return; }
    askFounder();
  });
  function askFounder() {
    var msg = foOpen
      ? 'Fermer l’offre Fondateurs aux nouveaux inscrits ?\n\nLe bandeau, le compteur et l’encart Fondateurs disparaissent du site. Les nouveaux pros verront directement les formules payantes.\nLes Fondateurs déjà inscrits gardent leurs 12 mois gratuits.'
      : 'Rouvrir l’offre Fondateurs aux nouveaux inscrits ?';
    if (!confirm(msg)) return;
    sb.rpc('admin_set_founder_offer_closed', { p_closed: foOpen }).then(function (r) {
      if (r.error) { alert(r.error.message || 'Action impossible'); return; }
      foOpen = !!(r.data && r.data.open); foRender();
      var desk = document.querySelector('.aal-founder-state'); if (desk) desk.textContent = foOpen ? 'Ouverte' : 'Fermée';
    });
  }
  // Le menu Admin s'ouvre : on y range les blocs, puis on rafraîchit les chiffres.
  document.addEventListener('click', function (e) {
    if (e.target.closest('#mobileFavoritesAdminBtn')) {
      setTimeout(function () { place(); foLoad(); syncImportBadge(); if (mq.matches) { try { window.loadAdminDashboardStats && window.loadAdminDashboardStats(); } catch (er) {} } }, 60);
    }
  }, true);
  if (mq.addEventListener) mq.addEventListener('change', place); else if (mq.addListener) mq.addListener(place);
  window.addEventListener('abracadeal:auth', function () { setTimeout(place, 600); });
  // Le compte se construit après la connexion : on vérifie quelques fois au démarrage.
  [800, 2000, 4500].forEach(function (t) { setTimeout(place, t); });
})();
