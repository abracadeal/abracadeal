/* Abracadeal — espace admin (admin.html), 08/11/2026.
   Un seul tableau de bord en 6 rubriques : Aujourd'hui, Pros, Prospection, Trafic, Argent, Technique.
   Données : RPC admin_overview (tout en un appel), admin_traffic_stats, admin_prospect_tracking,
   admin_search_popularity, admin_storage_usage. Toujours à jour : actualisation toutes les 30 s quand la page
   est visible, et immédiatement au retour sur l'onglet / l'application. */
(function () {
  'use strict';
  var sb = window.supabase.createClient('https://jplzvxmpbpjssyinozap.supabase.co', 'sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF');
  window.__abracaAdminSb = sb;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf = function (n) { return Number(n || 0).toLocaleString('fr-FR'); };
  var eur = function (c) { return (Number(c || 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); };
  var dateFr = function (d, withTime) { if (!d) return '—'; var x = new Date(d); return withTime ? x.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); };
  var ago = function (d) {
    if (!d) return 'jamais';
    var s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'à l’instant'; if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h'; var j = Math.round(s / 86400); return 'il y a ' + j + ' jour' + (j > 1 ? 's' : '');
  };
  var kpi = function (label, value, sub, tone) { return '<div class="ah-kpi' + (tone ? ' ' + tone : '') + '"><span>' + esc(label) + '</span><strong>' + value + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; };
  var SECTOR = { vehicules: 'Auto / moto', immobilier: 'Immobilier', hightech: 'High-tech', maison: 'Maison', mode: 'Mode', emploi: 'Emploi', services: 'Services' };
  var SRC = { google: 'Google', bing: 'Autres moteurs', facebook: 'Facebook', instagram: 'Instagram', email: 'E-mails', direct: 'Direct / favoris', autre_site: 'Autres sites' };

  var state = { data: null, traffic: null, tracking: null, searches: null, storage: null, days: 7, tab: 'today', loading: false, lastOk: 0 };

  /* ---------- onglets ---------- */
  function showTab(tab) {
    state.tab = tab;
    document.querySelectorAll('#ahTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    document.querySelectorAll('.ah-panel').forEach(function (p) { p.classList.toggle('on', p.dataset.panel === tab); });
    try { history.replaceState(null, '', '#' + tab); } catch (_) {}
    window.scrollTo({ top: 0 });
    if (tab === 'stats' && !state.traffic) loadTraffic();
    if (tab === 'prospect' && !state.tracking) loadTracking();
    if (tab === 'tech' && !state.storage) loadStorage();
  }
  window.addEventListener('hashchange', function () { var h = (location.hash || '').slice(1); h = ({ traffic: 'stats', money: 'stats' })[h] || h; if (h && h !== state.tab && document.querySelector('.ah-panel[data-panel="' + h + '"]')) showTab(h); });
  $('ahTabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });

  /* ---------- rendu ---------- */
  function renderToday(d) {
    var t = d.todo || {};
    var items = [
      ['Réponses « OK » de prospects', t.acceptances_pending, 'admin-prospection.html', 'Des pros ont répondu OK : créer leur espace.'],
      ['Imports de sites à valider', t.imports_pending, 'admin-test-import.html', 'Des pros attendent la mise en ligne de leur stock.'],
      ['Flux en erreur', t.feeds_failing, '#tech', 'Le stock d’un pro ne se met plus à jour.']
    ];
    var todo = items.filter(function (x) { return Number(x[1]) > 0; });
    var modN = Number(t.moderation_pending || 0) + Number(t.reports_open || 0) + Number(t.auto_to_review || 0);
    $('ahTodoDot').hidden = !(todo.length || modN);
    var badge = function (id, n) { var el = $(id); if (!el) return; n = Number(n || 0); el.textContent = n > 99 ? '99+' : String(n); el.hidden = !n; };
    badge('ahGoMod', Number(t.moderation_pending || 0) + Number(t.reports_open || 0) + Number(t.auto_to_review || 0));
    badge('ahGoOk', t.acceptances_pending); badge('ahGoImp', t.imports_pending);
    $('ahTodo').innerHTML = todo.length ? todo.map(function (x) {
      return '<a class="ah-todo-item" href="' + x[2] + '"><b>' + nf(x[1]) + '</b><span><strong>' + esc(x[0]) + '</strong><small>' + esc(x[3]) + '</small></span><i>›</i></a>';
    }).join('') : '<div class="ah-ok">✓ Rien d’urgent à traiter.</div>';

    var tech = d.tech || {}, pros = d.pros || [];
    var td = (state.todayTraffic && state.todayTraffic.days && state.todayTraffic.days[0]) || {};
    $('ahTodayKpis').innerHTML =
      kpi('Visiteurs', nf(td.visiteurs), td.mobiles != null ? nf(td.mobiles) + ' sur mobile' : '') +
      kpi('Vues d’annonces', nf(td.vues_annonces)) +
      kpi('Contacts', nf(Number(td.numeros || 0) + Number(td.messages || 0)), nf(td.numeros) + ' numéros · ' + nf(td.messages) + ' messages') +
      kpi('Annonces en ligne', nf(tech.listings_active), nf(tech.listings_pro) + ' de pros') +
      kpi('À la une', nf(tech.listings_featured)) +
      kpi('Pros inscrits', nf(pros.length), nf(tech.users_7d) + ' comptes créés en 7 j');
    $('ahNewPros').innerHTML = pros.slice(0, 3).map(proCard).join('') || '<div class="ah-empty">Aucun pro inscrit.</div>';
  }

  function proCard(p) {
    var feed = p.feed, feedTxt = '';
    if (feed) {
      var bad = feed.last_error && (!feed.last_success_at || Date.now() - new Date(feed.last_success_at) > 864e5);
      feedTxt = bad ? '<span class="ah-pill bad">Flux en erreur</span>' : (feed.active ? '<span class="ah-pill ok">Synchro ' + esc(ago(feed.last_success_at)) + '</span>' : '<span class="ah-pill">Flux en pause</span>');
    }
    var badges = (p.founder ? '<span class="ah-pill gold">Fondateur</span>' : (p.sub_status === 'active' ? '<span class="ah-pill ok">Abonné</span>' : '<span class="ah-pill">Sans formule</span>')) + feedTxt;
    var une = Number(p.featured_now) > 0 ? nf(p.featured_now) + ' À la une jusqu’au ' + dateFr(p.featured_until).replace(/ \d{4}$/, '') : 'Aucune À la une';
    var title = p.display_name && p.display_name !== p.name ? p.display_name : p.name;
    return '<article class="ah-card">' +
      '<div class="ah-card-h"><strong>' + esc(title) + '</strong><span class="ah-badges">' + badges + '</span></div>' +
      '<div class="ah-meta">' + esc([SECTOR[p.sector] || p.sector, p.city].filter(Boolean).join(' · ')) + ' · inscrit ' + esc(ago(p.created_at)) + '</div>' +
      '<div class="ah-nums"><span><b>' + nf(p.active_listings) + '</b> en ligne</span>' + (Number(p.pending_listings) ? '<span><b>' + nf(p.pending_listings) + '</b> en attente</span>' : '') +
      '<span><b>' + nf(p.views_7d) + '</b> vues 7 j</span><span><b>' + nf(p.contacts_7d) + '</b> contacts 7 j</span></div>' +
      '<div class="ah-meta">' + esc(une) + ' · ' + nf(p.boosts_left) + ' À la une restante' + (Number(p.boosts_left) > 1 ? 's' : '') + ' · dernière connexion ' + esc(ago(p.last_sign_in_at)) + '</div>' +
      '<div class="ah-card-a">' + (p.showroom ? '<a href="/' + encodeURIComponent(p.showroom) + '" target="_blank" rel="noopener">Voir le showroom ›</a>' : '') + (p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '') + '</div>' +
      '</article>';
  }

  function renderPros(d) {
    var pros = d.pros || [];
    var q = ($('ahProSearch').value || '').trim().toLowerCase();
    var f = 'all';
    var feedBad = function (p) { return p.feed && p.feed.last_error && (!p.feed.last_success_at || Date.now() - new Date(p.feed.last_success_at) > 864e5); };
    var list = pros.filter(function (p) {
      if (f === 'stock' && !(Number(p.active_listings) > 0)) return false;
      if (f === 'empty' && Number(p.active_listings) > 0) return false;
      if (f === 'une' && !(Number(p.featured_now) > 0)) return false;
      if (f === 'feedbad' && !feedBad(p)) return false;
      return !q || [p.name, p.display_name, p.city, p.email].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    var withStock = pros.filter(function (p) { return Number(p.active_listings) > 0; }).length;
    $('ahProsKpis').innerHTML = kpi('Pros inscrits', nf(pros.length)) + kpi('Avec annonces en ligne', nf(withStock), pros.length - withStock ? nf(pros.length - withStock) + ' sans annonce' : '') +
      kpi('Fondateurs', nf(pros.filter(function (p) { return p.founder; }).length)) +
      kpi('À la une utilisées', nf(pros.reduce(function (n, p) { return n + Number(p.boosts_used || 0); }, 0)));
    $('ahPros').innerHTML = list.map(proCard).join('') || '<div class="ah-empty">Aucun pro trouvé.</div>';
  }

  function renderProspect(d) {
    var p = d.prospection || {};
    var on = p.sending_enabled, fu = p.followups_enabled;
    $('ahMailerState').innerHTML =
      '<div class="ah-state-row"><span class="ah-pill ' + (on ? 'ok' : 'bad') + '">' + (on ? 'Envoi actif' : 'Envoi coupé') + '</span>' +
      '<span class="ah-pill ' + (fu ? 'ok' : '') + '">' + (fu ? 'Relances actives' : 'Relances coupées') + '</span>' +
      '<span class="ah-pill">' + esc((p.weekdays_only ? 'Lun–sam' : 'Tous les jours') + ', ' + p.window_start + ' h – ' + p.window_end + ' h') + '</span></div>' +
      '<p class="ah-note">Un pro déjà inscrit ne reçoit jamais de mail de prospection ni de relance, même s’il s’est inscrit avec une autre adresse.</p>';
    var rate = p.sent_total ? Math.round(1000 * p.clicked / p.sent_total) / 10 : 0;
    $('ahProspectKpis').innerHTML =
      kpi('Envoyés aujourd’hui', nf(p.sent_today)) + kpi('Envoyés 7 jours', nf(p.sent_7d), nf(p.followups_7d) + ' relances') +
      kpi('Ont cliqué', nf(p.clicked), rate.toLocaleString('fr-FR') + ' % des mails · ' + nf(p.clicked_7d) + ' cette semaine') +
      kpi('Inscrits', nf(p.registered), 'parmi les pros contactés', 'good') +
      kpi('Envoyés au total', nf(p.sent_total)) + kpi('En file d’attente', nf(p.ready)) +
      kpi('STOP', nf(p.opted_out)) + kpi('Adresses en erreur', nf(p.errors));
    renderTracking();
  }

  function renderTracking() {
    var t = state.tracking;
    if (!t) { $('ahProspectRows').innerHTML = '<div class="ah-empty">Chargement…</div>'; return; }
    var rows = (t.rows || []).slice().sort(function (a, b) {
      var x = a.account_at || a.last_clicked_at || '', y = b.account_at || b.last_clicked_at || '';
      return String(y).localeCompare(String(x));
    }).slice(0, 40);
    $('ahProspectRows').innerHTML = rows.map(function (r) {
      return '<div class="ah-row"><div><strong>' + esc(r.company || 'Sans nom') + '</strong>' + (r.account_at ? ' <span class="ah-pill ok">Inscrit</span>' : '') +
        '<small>' + esc([r.category, r.city].filter(Boolean).join(' · ')) + '</small></div>' +
        '<div class="ah-row-r">' + (r.account_at ? 'inscrit ' + esc(ago(r.account_at)) : nf(r.click_count) + ' clic' + (Number(r.click_count) > 1 ? 's' : '') + ' · ' + esc(ago(r.last_clicked_at))) + '</div></div>';
    }).join('') || '<div class="ah-empty">Aucun clic pour le moment.</div>';
  }

  function renderTraffic() {
    var t = state.traffic; if (!t) return;
    var rows = t.days || [], sum = function (k) { return rows.reduce(function (n, r) { return n + Number(r[k] || 0); }, 0); };
    var many = state.days > 1;
    $('ahTrafficKpis').innerHTML = kpi(many ? 'Visiteurs (cumul des jours)' : 'Visiteurs', nf(sum('visiteurs')), nf(sum('mobiles')) + ' sur mobile') +
      kpi('Vues d’annonces', nf(sum('vues_annonces'))) + kpi('Numéros affichés', nf(sum('numeros'))) + kpi('Messages', nf(sum('messages'))) +
      kpi('Showrooms vus', nf(sum('showrooms'))) + kpi('Recherches', nf(sum('recherches')));
    var src = Object.entries(t.sources || {}).sort(function (a, b) { return b[1] - a[1]; }), max = src.length ? src[0][1] : 1;
    $('ahSources').innerHTML = src.map(function (s) { return '<div class="ah-bar"><span>' + esc(SRC[s[0]] || s[0]) + '</span><i style="width:' + Math.max(4, Math.round(100 * s[1] / max)) + '%"></i><b>' + nf(s[1]) + '</b></div>'; }).join('') || '<div class="ah-empty">Pas encore de données.</div>';
    var dmax = Math.max.apply(null, rows.map(function (r) { return Number(r.visiteurs || 0); }).concat([1]));
    $('ahDaysChart').innerHTML = rows.slice().reverse().map(function (r) {
      var day = new Date(r.day + 'T12:00:00');
      return '<div class="ah-dcol" title="' + esc(day.toLocaleDateString('fr-FR')) + ' : ' + nf(r.visiteurs) + ' visiteurs, ' + nf(r.vues_annonces) + ' vues"><b>' + nf(r.visiteurs) + '</b><i style="height:' + Math.max(3, Math.round(100 * Number(r.visiteurs || 0) / dmax)) + '%"></i><span>' + esc(day.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)) + ' ' + day.getDate() + '</span></div>';
    }).join('');
    $('ahTopAds').innerHTML = (t.top_annonces || []).map(function (a) { return '<div class="ah-row"><div><strong>' + esc(a.title) + '</strong><small>' + esc(a.city || '') + '</small></div><div class="ah-row-r">' + nf(a.vues) + ' vues' + (Number(a.numeros) ? ' · ' + nf(a.numeros) + ' n°' : '') + '</div></div>'; }).join('') || '<div class="ah-empty">Aucune vue sur la période.</div>';
    var s = state.searches || [];
    $('ahSearches').innerHTML = s.slice(0, 15).map(function (q) { return '<div class="ah-row"><div><strong>' + esc(q.query) + '</strong><small>' + esc([q.category || 'Toutes catégories', q.city || 'France'].join(' · ')) + '</small></div><div class="ah-row-r">' + nf(q.searches) + '</div></div>'; }).join('') || '<div class="ah-empty">Aucune recherche enregistrée.</div>';
  }

  function renderMoney(d) {
    var m = d.money || {};
    $('ahMoneyKpis').innerHTML = kpi('Encaissé cette année', eur(m.year_cents)) + kpi('Encaissé ce mois-ci', eur(m.month_cents)) +
      kpi('Fondateurs (gratuits)', nf(m.founders), '12 mois offerts') + kpi('Abonnés payants', nf(m.paying));
    var pct = Math.min(100, 100 * Number(m.year_cents || 0) / Number(m.vat_base_cents || 1));
    $('ahVat').innerHTML = '<div class="ah-gauge"><i style="width:' + pct.toFixed(1) + '%"></i></div><p>' + eur(m.year_cents) + ' sur ' + eur(m.vat_base_cents) + ' (seuil de base) · seuil majoré ' + eur(m.vat_major_cents) + '. Reste ' + eur(Math.max(0, m.vat_base_cents - m.year_cents)) + '.</p>';
    $('ahPayments').innerHTML = (m.recent || []).map(function (r) { return '<div class="ah-row"><div><strong>' + esc(r.kind) + '</strong><small>' + esc(dateFr(r.at, true)) + '</small></div><div class="ah-row-r">' + eur(r.amount_cents) + '</div></div>'; }).join('') || '<div class="ah-empty">Aucun encaissement réel pour le moment.</div>';
  }

  function renderTech(d) {
    var t = d.tech || {};
    $('ahTechKpis').innerHTML = kpi('Annonces en ligne', nf(t.listings_active), nf(t.listings_pro) + ' de pros') + kpi('À la une actives', nf(t.listings_featured)) +
      kpi('Comptes', nf(t.users_total), nf(t.users_7d) + ' nouveaux en 7 j') + kpi('Flux actifs', nf((t.feeds || []).filter(function (f) { return f.active; }).length));
    var open = t.founder_offer_open !== false;
    $('ahFounder').innerHTML = '<div class="ah-state-row"><span class="ah-pill ' + (open ? 'ok' : 'bad') + '">' + (open ? 'Ouverte aux nouveaux pros' : 'Fermée aux nouveaux pros') + '</span>' +
      '<button type="button" class="ah-btn" id="ahFounderBtn">' + (open ? 'Fermer l’offre' : 'Rouvrir l’offre') + '</button></div>';
    $('ahFounderBtn').onclick = function () {
      var msg = open ? 'Fermer l’offre Fondateurs aux nouveaux inscrits ?\n\nLes Fondateurs déjà inscrits gardent leurs 12 mois gratuits.' : 'Rouvrir l’offre Fondateurs aux nouveaux inscrits ?';
      if (!confirm(msg)) return;
      sb.rpc('admin_set_founder_offer_closed', { p_closed: open }).then(function (r) { if (r.error) alert(r.error.message || 'Action impossible'); refresh(true); });
    };
    $('ahFeeds').innerHTML = (t.feeds || []).filter(function (f) { return f.active || f.review_status === 'pending'; }).map(function (f) {
      var bad = f.last_error && (!f.last_success_at || Date.now() - new Date(f.last_success_at) > 864e5);
      return '<div class="ah-row"><div><strong>' + esc(f.owner || f.name) + '</strong><small>' + nf(f.listings) + ' annonces · ' + (f.review_status === 'pending' ? 'à valider' : 'synchro ' + esc(ago(f.last_success_at))) + (bad ? ' · ' + esc(String(f.last_error).slice(0, 120)) : '') + '</small></div>' +
        '<div class="ah-row-r"><span class="ah-pill ' + (bad ? 'bad' : (f.review_status === 'pending' ? '' : 'ok')) + '">' + (bad ? 'Erreur' : (f.review_status === 'pending' ? 'En attente' : 'OK')) + '</span></div></div>';
    }).join('') || '<div class="ah-empty">Aucun flux actif.</div>';
    renderStorage();
  }

  function renderStorage() {
    var s = state.storage; if (!s) { $('ahStorage').innerHTML = '<p class="ah-note">Chargement…</p>'; return; }
    var bytes = Number(s.total_bytes || 0), gb = 1024 * 1024 * 1024, pct = Math.min(100, 100 * bytes / gb);
    $('ahStorage').innerHTML = '<div class="ah-gauge' + (pct >= 80 ? ' warn' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div><p>' + (bytes / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mo sur 1 Go (forfait gratuit) · ' + nf(s.file_count) + ' fichiers · ' + pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %</p>' + renderR2();
  }
  /* 08/11/2026 : les photos affichées sur le site sont servies par Cloudflare R2 (copie auto r2-sync toutes les 2 min). */
  function renderR2() {
    var r = state.r2; if (!r) return '<p class="ah-note">Cloudflare R2 : chargement…</p>';
    var b = Number(r.bytes || 0), pct = Math.min(100, 100 * b / (10 * 1024 * 1024 * 1024)), pend = Number(r.pending || 0);
    var last = r.last_sync ? new Date(r.last_sync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'jamais';
    return '<p style="margin-top:14px"><strong>Cloudflare R2</strong> · photos affichées sur le site (affichage gratuit)</p><div class="ah-gauge' + (pct >= 80 ? ' warn' : '') + '"><i style="width:' + Math.max(0.5, pct).toFixed(1) + '%"></i></div><p>' + (b / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mo sur 10 Go gratuits · ' + nf(r.files) + ' fichiers copiés · ' + (pend > 50 ? '<strong>' + nf(pend) + ' en attente, copie en retard</strong>' : (pend ? nf(pend) + ' en attente' : 'à jour')) + ' · dernière copie ' + last + '</p>';
  }

  function renderAll() {
    var d = state.data; if (!d) return;
    renderToday(d); renderPros(d); renderProspect(d); renderMoney(d); renderTech(d); renderTraffic();
  }

  /* ---------- chargements ---------- */
  function loadTraffic() {
    return sb.rpc('admin_traffic_stats', { p_days: state.days }).then(function (r) {
      if (!r.error) { state.traffic = r.data; renderTraffic(); }
    }).then(function () {
      if (state.searches) return;
      return sb.rpc('admin_search_popularity').then(function (r) { if (!r.error) { state.searches = r.data || []; renderTraffic(); } });
    });
  }
  function loadTodayTraffic() {
    return sb.rpc('admin_traffic_stats', { p_days: 1 }).then(function (r) { if (!r.error) { state.todayTraffic = r.data; if (state.data) renderToday(state.data); } });
  }
  function loadTracking() {
    return sb.rpc('admin_prospect_tracking').then(function (r) { if (!r.error) { state.tracking = r.data; renderTracking(); } });
  }
  function loadStorage() {
    sb.rpc('admin_r2_usage').then(function (r) { if (!r.error) { state.r2 = r.data; if (state.storage) renderStorage(); } });
    return sb.rpc('admin_storage_usage').then(function (r) { if (!r.error) { state.storage = r.data; renderStorage(); } });
  }
  $('ahDays').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-days]'); if (!b) return;
    state.days = Number(b.dataset.days);
    document.querySelectorAll('#ahDays button').forEach(function (x) { x.classList.toggle('on', x === b); });
    loadTraffic();
  });
  $('ahProSearch').addEventListener('input', function () { if (state.data) renderPros(state.data); });

  function stamp() {
    if (!state.lastOk) return;
    var s = Math.round((Date.now() - state.lastOk) / 1000);
    $('ahUpdated').textContent = s < 5 ? 'À jour' : 'À jour · il y a ' + (s < 60 ? s + ' s' : Math.round(s / 60) + ' min');
    $('ahLive').className = 'ah-live' + (s > 120 ? ' stale' : '');
  }

  function refresh(force) {
    if (state.loading || !state.ready) return;
    if (!force && document.visibilityState === 'hidden') return;
    state.loading = true; $('ahLive').className = 'ah-live busy';
    sb.rpc('admin_overview').then(function (r) {
      if (r.error) throw r.error;
      state.data = r.data; state.lastOk = Date.now();
      $('ahStatus').hidden = true;
      document.querySelectorAll('.ah-panel').forEach(function (p) { p.hidden = false; });
      renderAll(); stamp();
      var extra = [loadTodayTraffic()];
      if (state.traffic || state.tab === 'stats') extra.push(loadTraffic());
      if (state.tracking || state.tab === 'prospect') extra.push(loadTracking());
      if (state.tab === 'tech') extra.push(loadStorage());
      return Promise.all(extra);
    }).catch(function (e) {
      $('ahStatus').hidden = false;
      $('ahStatus').textContent = 'Données indisponibles : ' + (e && e.message || 'erreur réseau') + '. Nouvel essai automatique.';
    }).then(function () { state.loading = false; stamp(); });
  }

  $('ahRefresh').addEventListener('click', function () { refresh(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refresh(true); });
  window.addEventListener('focus', function () { if (Date.now() - state.lastOk > 10000) refresh(true); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) refresh(true); });
  setInterval(function () { refresh(false); }, 30000);
  setInterval(stamp, 5000);

  /* ---------- démarrage ---------- */
  (async function init() {
    var u = await sb.auth.getUser();
    var user = u && u.data && u.data.user;
    if (!user) { $('ahStatus').innerHTML = 'Connecte-toi sur <a href="index.html">Abracadeal</a> avec le compte administrateur.'; $('ahUpdated').textContent = 'Non connecté'; return; }
    var pr = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!pr.data || !pr.data.is_admin) { $('ahStatus').textContent = 'Accès réservé à l’administrateur.'; $('ahUpdated').textContent = '—'; return; }
    var h = (location.hash || '').slice(1);
    state.ready = true;
    var alias = { traffic: 'stats', money: 'stats' }; h = alias[h] || h;
    showTab(['today', 'pros', 'prospect', 'stats', 'tech'].indexOf(h) >= 0 ? h : 'today');
    refresh(true);
  })();
})();
