/* Abracadeal — mise en page de « Mon compte » (18/10/2026), pour tous les comptes connectés.
   - Particuliers : identité + déconnexion, « Mon espace » en tuiles, mes informations.
   - Pros : en plus, une rubrique « Espace Pro » (Pro/Pro, importer mon stock, ma vitrine, formules).
   - Administrateur : en plus, « Administration », tableau de bord et base de données (ci-dessous).
   - Carte identité avec « Se déconnecter » intégré.
   - Tuiles « Administration » : Modérer (avec le nombre d'annonces en attente), Flux, Pro/Pro,
     Finances, Prospection, Recherche d'annonces. Les tuiles cliquent sur les boutons d'origine
     (aucun bouton n'est déplacé, leurs fonctions restent les mêmes).
   - Tableau de bord compact, puis « Mon espace » en tuiles, puis Base de données et Mes informations.
   Pour annuler : retirer la balise <script> de ce fichier et la feuille de style associée dans index.html. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    moderate: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    flux: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7"/><path d="M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3"/><path d="M4 20v-4.7h4.7"/>',
    pro: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3 12.5h18"/>',
    finance: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    prospect: '<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    ads: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    fav: '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
    msg: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z"/><path d="M10 21h4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    upload: '<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'
  };
  function icon(name) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'aal-ico');
    s.innerHTML = ICONS[name] || '';
    return s;
  }
  function tile(label, ico, onClick, href) {
    var el = document.createElement(href ? 'a' : 'button');
    el.className = 'aal-tile';
    if (href) el.href = href; else el.type = 'button';
    el.appendChild(icon(ico));
    var t = document.createElement('span'); t.className = 'aal-tile-label'; t.textContent = label; el.appendChild(t);
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }
  function section(title, cls) {
    var s = document.createElement('section'); s.className = 'aal-section ' + (cls || '');
    var h = document.createElement('h3'); h.className = 'aal-title'; h.textContent = title; s.appendChild(h);
    return s;
  }
  function clickOf(sel) { return function () { var b = $(sel); if (b) b.click(); }; }

  var built = false;
  function build() {
    var root = $('#loggedInAccount'), dash = $('#accountDashboard');
    if (!root || !dash) return;
    built = true;
    root.classList.add('abraca-admin-layout');

    /* Identité + déconnexion */
    var user = $('#accountUserBox');
    var idWrap = document.createElement('div'); idWrap.className = 'aal-identity';
    user.parentNode.insertBefore(idWrap, user);
    idWrap.appendChild(user);
    var out = document.createElement('button'); out.type = 'button'; out.className = 'aal-logout';
    out.appendChild(icon('logout')); var ot = document.createElement('span'); ot.textContent = 'Déconnexion'; out.appendChild(ot);
    out.addEventListener('click', clickOf('#logoutBtn'));
    idWrap.appendChild(out);

    /* Espace Pro (comptes professionnels, hors admin) */
    var pro = section('Espace Pro', 'aal-pro');
    var pgrid = document.createElement('div'); pgrid.className = 'aal-grid';
    /* 27/10/2026 : import mis en avant — grande tuile en tête, pleine largeur, dégradé violet → rose */
    var imp = tile('Importer mon stock', 'upload', clickOf('#proImportBtn')); imp.classList.add('aal-import');
    var isub = document.createElement('span'); isub.className = 'aal-import-sub'; isub.textContent = 'Toutes vos annonces en ligne d’un coup, sans ressaisie';
    imp.querySelector('.aal-tile-label').appendChild(isub);
    pgrid.appendChild(imp);
    pgrid.appendChild(tile('Pro/Pro', 'pro', clickOf('#b2bAccountBtn')));
    pgrid.appendChild(tile('Ma vitrine', 'star', function () { var c = $('#companyAccountSection'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    pgrid.appendChild(tile('Formules', 'finance', null, 'pro-fondateur.html'));
    pro.appendChild(pgrid);
    dash.insertBefore(pro, dash.firstChild);

    /* Administration */
    var admin = section('Administration', 'aal-admin');
    var grid = document.createElement('div'); grid.className = 'aal-grid';
    var mod = tile('Modérer', 'moderate', clickOf('#accountModerationBtn'));
    var badge = document.createElement('span'); badge.className = 'aal-badge'; badge.hidden = true; mod.appendChild(badge);
    grid.appendChild(mod);
    grid.appendChild(tile('Flux', 'flux', clickOf('#accountFlowBtn')));
    grid.appendChild(tile('Pro/Pro', 'pro', clickOf('#b2bAccountBtn')));
    grid.appendChild(tile('Finances', 'finance', null, 'admin-pilotage.html'));
    grid.appendChild(tile('Prospection', 'prospect', null, 'admin-prospection.html'));
    grid.appendChild(tile('Annonces', 'search', function () {
      var p = $('#adminDatabasePanel'); if (p) { p.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(function () { var q = $('#adminDbQuery'); if (q) q.focus({ preventScroll: true }); }, 450); }
    }));
    admin.appendChild(grid);
    dash.insertBefore(admin, dash.firstChild);

    /* Badge « à modérer » */
    var pending = $('#statPendingModeration');
    function syncBadge() {
      var n = parseInt(String(pending && pending.textContent || '').replace(/\D/g, ''), 10);
      badge.hidden = !(n > 0); badge.textContent = n > 99 ? '99+' : String(n || '');
    }
    if (pending) { new MutationObserver(syncBadge).observe(pending, { childList: true, characterData: true, subtree: true }); syncBadge(); }

    /* Tableau de bord : juste après Administration */
    var stats = $('#adminStatsPanel');
    if (stats) {
      admin.parentNode.insertBefore(stats, admin.nextSibling);
      var h = stats.querySelector('.admin-stats-head h3'); if (h) h.textContent = 'Tableau de bord';
      var rb = $('#refreshAdminStatsBtn');
      if (rb && !rb.querySelector('.aal-ico')) { rb.textContent = ''; rb.appendChild(icon('refresh')); rb.setAttribute('aria-label', 'Actualiser'); rb.title = 'Actualiser'; }
      var p200 = $('#statPlan200'); if (p200 && p200.parentNode) p200.parentNode.classList.add('aal-hidden');
      var p250 = $('#statPlan250'); if (p250 && p250.nextElementSibling) p250.nextElementSibling.textContent = 'Sur devis (+100)';
      var plans = stats.querySelector('.admin-plan-grid');
      if (plans && !stats.querySelector('.aal-subtitle')) { var st = document.createElement('div'); st.className = 'aal-subtitle'; st.textContent = 'Abonnements Pro par formule'; plans.parentNode.insertBefore(st, plans); }
    }

    /* Mon espace */
    var nav = dash.querySelector('.account-shortcuts');
    var adminAnchor = admin;
    if (nav) {
      var mine = section('Mon espace', 'aal-mine');
      nav.parentNode.insertBefore(mine, nav);
      mine.appendChild(nav);
      var map = [['#accountAdsBtn', 'ads', 'Mes annonces'], ['#accountFavoritesBtn', 'fav', 'Mes favoris'], ['#accountMessagesBtn', 'msg', 'Mes messages'], ['#accountAlertsBtn', 'bell', 'Mes alertes'], ['a[href^="options-annonce"]', 'star', 'Options']];
      map.forEach(function (m) {
        var b = nav.querySelector(m[0]); if (!b || b.querySelector('.aal-ico')) return;
        b.textContent = ''; b.appendChild(icon(m[1]));
        var t = document.createElement('span'); t.className = 'aal-tile-label'; t.textContent = m[2]; b.appendChild(t);
      });
      var infos = tile('Mes infos', 'user', function () { var s = dash.querySelector('.profile-edit-box'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      infos.classList.add('aal-infos'); nav.appendChild(infos);
      /* Base de données après Mon espace */
      var db = $('#adminDatabasePanel');
      if (db) mine.parentNode.insertBefore(db, mine.nextSibling);
    }
  }

  function visible(sel) { var e = $(sel); return !!e && !e.classList.contains('hidden'); }
  function check() {
    var root = $('#loggedInAccount');
    if (!root) return;
    var loggedIn = !root.classList.contains('hidden');
    if (loggedIn && !built) build();
    var isAdmin = visible('#accountModerationBtn');
    var isPro = !isAdmin && visible('#b2bAccountBtn');
    root.classList.toggle('abraca-admin-layout', loggedIn && built);
    root.classList.toggle('aal-is-admin', isAdmin);
    root.classList.toggle('aal-is-pro', isPro);
    root.classList.toggle('aal-has-import', visible('#proImportBtn'));
  }

  function start() {
    var targets = ['#loggedInAccount', '#accountModerationBtn', '#b2bAccountBtn', '#proImportBtn'];
    var mo = new MutationObserver(check);
    targets.forEach(function (sel) { var e = $(sel); if (e) mo.observe(e, { attributes: true, attributeFilter: ['class'] }); });
    check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
