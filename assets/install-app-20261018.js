/* Abracadeal — application installable (PWA), 18/10/2026.
   - Enregistre /sw.js (service worker minimal, sans cache).
   - Bandeau « Installer l'application » sur mobile (pas dans l'application elle-même).
   - Lien « Télécharger l'application » dans le pied de page et la rubrique Aide du compte.
   - Android / Chrome / Edge : vraie fenêtre d'installation.
   - iPhone / iPad : petite fiche qui explique Partager → « Sur l'écran d'accueil ».
   Pour tout retirer : enlever la balise <script> de ce fichier dans index.html et vacances.html. */
(function () {
  'use strict';
  if (window.__abracaInstallApp) return;
  window.__abracaInstallApp = true;

  var DISMISS_KEY = 'abraca_install_banner_dismissed_at';
  var DISMISS_DAYS = 14;
  var deferredPrompt = null;

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isStandalone = function () {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
    catch (_) { return window.navigator.standalone === true; }
  };
  var isMobile = function () {
    try { return window.matchMedia('(max-width:760px)').matches; } catch (_) { return false; }
  };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (_) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (_) {} }
  };

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }

  if (isStandalone()) {
    document.documentElement.classList.add('abraca-standalone');
    return; // déjà dans l'application : rien à proposer
  }

  /* ---------- Styles ---------- */
  var css = '' +
    '.abraca-install-banner{position:fixed;left:10px;right:10px;bottom:calc(var(--abraca-bottom-nav-space,0px) + 10px);z-index:69000;' +
    'display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:18px;background:#24103f;color:#fff;' +
    'border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 34px rgba(20,4,40,.45);font-family:inherit;' +
    'transform:translateY(140%);opacity:0;transition:transform .35s ease,opacity .35s ease}' +
    '.abraca-install-banner.is-visible{transform:none;opacity:1}' +
    '.abraca-install-banner img{width:44px;height:44px;border-radius:11px;flex:0 0 auto}' +
    '.abraca-install-banner .aib-text{flex:1 1 auto;min-width:0;line-height:1.25}' +
    '.abraca-install-banner .aib-text strong{display:block;font-size:.95rem}' +
    '.abraca-install-banner .aib-text span{display:block;font-size:.8rem;color:#d9c6ee}' +
    '.abraca-install-banner .aib-go{flex:0 0 auto;border:0;border-radius:999px;padding:10px 15px;font-weight:800;font-size:.88rem;color:#fff;' +
    'background:linear-gradient(120deg,#7b27a0,#ee42a5);cursor:pointer}' +
    '.abraca-install-banner .aib-close{flex:0 0 auto;border:0;background:transparent;color:#cdb8e3;font-size:1.35rem;line-height:1;padding:4px 2px 4px 4px;cursor:pointer}' +
    '.abraca-install-sheet{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;' +
    'background:rgba(12,4,24,.62);padding:0 0 env(safe-area-inset-bottom)}' +
    '@media (min-width:761px){.abraca-install-sheet{align-items:center}}' +
    '.abraca-install-sheet .ais-card{width:100%;max-width:440px;background:#fff;color:#22102f;border-radius:24px 24px 0 0;padding:22px 20px 26px;box-sizing:border-box;' +
    'font-family:inherit;box-shadow:0 -10px 40px rgba(0,0,0,.25)}' +
    '@media (min-width:761px){.abraca-install-sheet .ais-card{border-radius:24px}}' +
    '.abraca-install-sheet .ais-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}' +
    '.abraca-install-sheet .ais-head img{width:52px;height:52px;border-radius:13px}' +
    '.abraca-install-sheet h3{margin:0;font-size:1.15rem}' +
    '.abraca-install-sheet .ais-head p{margin:2px 0 0;color:#6b5a7c;font-size:.88rem}' +
    '.abraca-install-sheet ol{margin:0;padding:0;list-style:none;counter-reset:s}' +
    '.abraca-install-sheet li{counter-increment:s;display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid #f0e8f6;font-size:.95rem;line-height:1.35}' +
    '.abraca-install-sheet li:before{content:counter(s);flex:0 0 28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'font-weight:800;color:#fff;background:linear-gradient(120deg,#7b27a0,#ee42a5)}' +
    '.abraca-install-sheet .ais-ico{display:inline-block;vertical-align:-4px;width:20px;height:20px;color:#2f7cf6}' +
    '.abraca-install-sheet .ais-ok{display:block;width:100%;margin-top:16px;border:0;border-radius:999px;padding:13px;font-weight:800;font-size:1rem;color:#fff;' +
    'background:linear-gradient(120deg,#7b27a0,#ee42a5);cursor:pointer}' +
    '[data-abraca-install]{cursor:pointer}';
  var style = document.createElement('style');
  style.id = 'abracaInstallAppStyle';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  /* ---------- Fiche d'explication (iPhone / navigateurs sans installation directe) ---------- */
  var SHARE_ICON = '<svg class="ais-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  var ADD_ICON = '<svg class="ais-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

  function closeSheet() { var s = document.getElementById('abracaInstallSheet'); if (s) s.remove(); }
  function showSheet() {
    closeSheet();
    var steps;
    if (isIOS) {
      steps = '<li><span>Touchez le bouton <strong>Partager</strong> ' + SHARE_ICON + ' en bas de l’écran (ou en haut sur iPad).</span></li>' +
              '<li><span>Faites défiler puis touchez <strong>Sur l’écran d’accueil</strong> ' + ADD_ICON + '.</span></li>' +
              '<li><span>Touchez <strong>Ajouter</strong> : l’icône Abracadeal apparaît avec vos applications.</span></li>';
    } else if (isAndroid) {
      steps = '<li><span>Ouvrez le menu <strong>⋮</strong> de votre navigateur (en haut à droite).</span></li>' +
              '<li><span>Touchez <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</span></li>' +
              '<li><span>Confirmez : l’icône Abracadeal apparaît avec vos applications.</span></li>';
    } else {
      steps = '<li><span>Ouvrez <strong>abracadeal.fr</strong> avec Google Chrome ou Microsoft Edge.</span></li>' +
              '<li><span>Cliquez sur l’icône d’installation dans la barre d’adresse, ou menu <strong>⋮</strong> → <strong>Installer Abracadeal</strong>.</span></li>' +
              '<li><span>Sur Mac avec Safari : menu <strong>Fichier</strong> → <strong>Ajouter au Dock</strong>.</span></li>';
    }
    var wrap = document.createElement('div');
    wrap.className = 'abraca-install-sheet';
    wrap.id = 'abracaInstallSheet';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Installer l’application Abracadeal');
    wrap.innerHTML = '<div class="ais-card"><div class="ais-head"><img src="/icon-192.png?v=5" alt=""><div><h3>Installer Abracadeal</h3>' +
      '<p>Gratuit, sans passer par un store, en 3 étapes.</p></div></div><ol>' + steps + '</ol>' +
      '<button type="button" class="ais-ok">J’ai compris</button></div>';
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('.ais-ok')) closeSheet(); });
    document.body.appendChild(wrap);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  /* ---------- Installation ---------- */
  function install() {
    if (deferredPrompt) {
      var p = deferredPrompt;
      deferredPrompt = null;
      p.prompt();
      if (p.userChoice) p.userChoice.then(function (r) { if (r && r.outcome === 'accepted') hideBanner(true); }).catch(function () {});
      return;
    }
    showSheet();
  }
  window.abracaInstallApp = install;

  /* ---------- Bandeau mobile ---------- */
  var banner = null;
  function dismissedRecently() {
    var t = Number(store.get(DISMISS_KEY) || 0);
    return t && (Date.now() - t) < DISMISS_DAYS * 86400000;
  }
  function hideBanner(remember) {
    if (remember) store.set(DISMISS_KEY, String(Date.now()));
    if (!banner) return;
    banner.classList.remove('is-visible');
    var b = banner; banner = null;
    setTimeout(function () { b.remove(); }, 400);
  }
  function showBanner() {
    if (banner || isStandalone() || !isMobile() || dismissedRecently()) return;
    if (!deferredPrompt && !isIOS) return; // rien à proposer proprement sur ce navigateur
    banner = document.createElement('div');
    banner.className = 'abraca-install-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Installer l’application');
    banner.innerHTML = '<img src="/icon-192.png?v=5" alt="">' +
      '<div class="aib-text"><strong>L’appli Abracadeal</strong><span>Gratuite, sur votre écran d’accueil</span></div>' +
      '<button type="button" class="aib-go">Installer</button>' +
      '<button type="button" class="aib-close" aria-label="Fermer">×</button>';
    banner.querySelector('.aib-go').addEventListener('click', install);
    banner.querySelector('.aib-close').addEventListener('click', function () { hideBanner(true); });
    document.body.appendChild(banner);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (banner) banner.classList.add('is-visible'); }); });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(showBanner, 3500);
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hideBanner(true);
    document.querySelectorAll('[data-abraca-install]').forEach(function (a) { a.remove(); });
  });

  /* ---------- Liens « Télécharger l'application » ---------- */
  function addLinks() {
    var targets = [];
    document.querySelectorAll('footer .footer-links, .vac-legal-links').forEach(function (el) { targets.push(el); });
    document.querySelectorAll('.account-info-title').forEach(function (h) { if (h.parentElement) targets.push(h.parentElement); });
    targets.forEach(function (el) {
      if (el.querySelector('[data-abraca-install]')) return;
      var a = document.createElement('a');
      a.href = '#';
      a.setAttribute('data-abraca-install', '');
      a.textContent = '📲 Télécharger l’application';
      a.addEventListener('click', function (e) { e.preventDefault(); install(); });
      var h = el.querySelector('.account-info-title');
      if (h && h.nextSibling) el.insertBefore(a, h.nextSibling); else el.appendChild(a);
    });
  }

  function start() {
    addLinks();
    if (isIOS) setTimeout(showBanner, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
