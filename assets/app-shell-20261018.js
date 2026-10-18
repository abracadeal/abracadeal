/* Abracadeal — barre d'application commune des pages secondaires (18/10/2026).
   Sur mobile (≤ 760 px) uniquement :
   - barre du haut fixe façon application : bouton retour ‹, titre de la page, menu ⋯ si besoin ;
   - le titre apparaît dans la barre quand le grand titre (h1) de la page sort de l'écran (style iPhone) ;
   - l'ancien en-tête et les liens « ← Retour » de la page sont masqués ; ses boutons utiles
     (Déconnexion, Tableau de bord…) sont déplacés dans le menu ⋯ (mêmes boutons, mêmes fonctions) ;
   - retour : revient à la page précédente du site, sinon à la page parente logique.
   Sur ordinateur : rien ne change.
   Pour retirer : enlever <link …app-shell-20261018.css> et <script …app-shell-20261018.js> de la page. */
(function () {
  'use strict';
  if (window.__abracaAppShell) return;
  window.__abracaAppShell = true;
  // Page affichée dans une autre page (ex. Espace Hôte intégré à Vacances) : la page parente a déjà sa barre.
  var embedded = false; try { embedded = window.self !== window.top; } catch (_) { embedded = true; }
  if (embedded || /[?&]embedded=1\b/.test(location.search)) return;
  var mq = window.matchMedia ? window.matchMedia('(max-width:760px)') : null;
  if (!mq || !mq.matches) return;

  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var PARENT = {
    'demandes-hote.html': 'espace-hote.html', 'export-ical-vacances.html': 'espace-hote.html',
    'gestion-sejour.html': 'espace-hote.html', 'photos-vacances.html': 'espace-hote.html',
    'avis-vacances.html': 'vacances.html', 'logement-vacances.html': 'vacances.html', 'profil-vacances.html': 'vacances.html',
    'recherche-vacances.html': 'vacances.html', 'espace-voyageur.html': 'vacances.html', 'espace-hote.html': 'vacances.html',
    'ical.html': 'vacances.html', 'admin-vacances.html': 'vacances.html',
    'admin-commerce.html': 'moderation.html', 'admin-retention.html': 'moderation.html',
    'admin-pilotage.html': 'index.html#accountModal', 'admin-prospection.html': 'index.html#accountModal',
    'admin-recherche.html': 'index.html#accountModal', 'moderation.html': 'index.html#accountModal',
    'pro.html': 'index.html#resultats'
  };
  var parent = PARENT[page] || 'index.html';

  function cleanTitle() {
    var t = document.body.getAttribute('data-app-title');
    if (t) return t;
    var parts = String(document.title || '').split(/\s+[—·|–-]\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var keep = parts.filter(function (x) { return !/abracadeal/i.test(x); });
    t = keep[0] || parts[0] || 'Abracadeal';
    t = t.replace(/\bAbracadeal\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    return t || 'Abracadeal';
  }
  var BACKISH = /(^|\s)(←|‹)|\bretour\b|\baccueil\b/i;
  function isBackish(el) {
    var txt = (el.textContent || '').trim();
    return BACKISH.test(txt);
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function goBack() {
    var sameOrigin = false;
    try { sameOrigin = !!document.referrer && new URL(document.referrer).origin === location.origin && document.referrer !== location.href; } catch (_) {}
    if (sameOrigin && history.length > 1) { history.back(); return; }
    location.href = parent;
  }

  function start() {
    var body = document.body;
    if (!body || document.querySelector('.abs-bar')) return;
    body.classList.add('abs-on');
    if (/^(aide|cgu|cgv|classement-annonces|confidentialite|contact|cookies|mentions-legales|regles-diffusion|securite)\.html$/.test(page)) body.classList.add('abs-doc');

    /* Barre */
    var bar = el('header', 'abs-bar');
    bar.setAttribute('role', 'banner');
    var back = el('button', 'abs-back', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>');
    back.type = 'button'; back.setAttribute('aria-label', 'Retour');
    back.addEventListener('click', goBack);
    var title = el('div', 'abs-title'); title.textContent = cleanTitle();
    var right = el('div', 'abs-right');
    bar.appendChild(back); bar.appendChild(title); bar.appendChild(right);
    body.insertBefore(bar, body.firstChild);

    /* Ancien en-tête : on garde ses commandes utiles dans un menu ⋯ */
    var extras = [];
    var oldHeader = null;
    for (var n = bar.nextElementSibling; n; n = n.nextElementSibling) {
      if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.tagName === 'NOSCRIPT' || n.nodeType !== 1) continue;
      if (n.tagName === 'HEADER') oldHeader = n;
      break;
    }
    if (oldHeader) {
      oldHeader.querySelectorAll('a,button').forEach(function (c) {
        if (c.classList.contains('brand') || c.closest('.brand')) return;
        if (isBackish(c)) return;
        if (/^\s*abracadeal\b/i.test(c.textContent || '') && c.tagName === 'A') return; // logo texte
        if (c.getAttribute('aria-haspopup')) return; // bouton qui ouvre un menu : ses entrées sont reprises une par une
        var href = c.getAttribute('href');
        if (href && extras.some(function (x) { return x.getAttribute('href') === href; })) return; // doublon
        extras.push(c);
      });
      oldHeader.classList.add('abs-hide');
    }
    /* Liens « ← Retour » en haut du contenu */
    var main = document.querySelector('main') || body;
    var firstH1 = main.querySelector('h1');
    main.querySelectorAll('a.back, nav.topnav, a.back-btn').forEach(function (a) { if (isBackish(a)) (a.closest('nav.topnav') || a).classList.add('abs-hide'); });
    Array.prototype.slice.call(main.querySelectorAll('a')).slice(0, 4).forEach(function (a) {
      if (!/^\s*←/.test(a.textContent || '')) return;
      if (firstH1 && (a.compareDocumentPosition(firstH1) & Node.DOCUMENT_POSITION_PRECEDING)) return; // après le titre : on garde
      var p = a.parentElement;
      if (p && p !== main && p.tagName === 'P' && p.children.length === 1 && p.textContent.trim() === a.textContent.trim()) p.classList.add('abs-hide');
      else a.classList.add('abs-hide');
    });

    /* Menu ⋯ */
    if (extras.length) {
      var more = el('button', 'abs-more', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>');
      more.type = 'button'; more.setAttribute('aria-label', 'Plus d’actions'); more.setAttribute('aria-expanded', 'false');
      var menu = el('div', 'abs-menu'); menu.hidden = true; menu.setAttribute('role', 'menu');
      extras.forEach(function (c) {
        c.classList.add('abs-menu-item');
        c.addEventListener('click', function () { closeMenu(); });
        menu.appendChild(c);
      });
      function sync() {
        var any = extras.some(function (c) { return !c.hidden && !c.classList.contains('hidden') && getComputedStyle(c).display !== 'none'; });
        more.style.visibility = any ? 'visible' : 'hidden';
      }
      function closeMenu() { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); }
      more.addEventListener('click', function (e) { e.stopPropagation(); sync(); menu.hidden = !menu.hidden; more.setAttribute('aria-expanded', String(!menu.hidden)); });
      document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
      right.appendChild(more); body.appendChild(menu);
      new MutationObserver(sync).observe(menu, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden', 'style'] });
      sync();
    }

    /* Titre dans la barre quand le h1 sort de l'écran */
    var h1 = Array.prototype.slice.call(document.querySelectorAll('h1')).filter(function (h) { return h.offsetParent !== null; })[0];
    if (h1 && 'IntersectionObserver' in window) {
      bar.classList.add('abs-title-hidden');
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { bar.classList.toggle('abs-title-hidden', en.isIntersecting || en.boundingClientRect.top > 0); });
      }, { rootMargin: '-56px 0px 0px 0px' }).observe(h1);
    }
    window.addEventListener('scroll', function () { bar.classList.toggle('abs-scrolled', window.scrollY > 4); }, { passive: true });

    /* Couleur de la barre d'état (Android) */
    if (!document.querySelector('meta[name="theme-color"]')) {
      var m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#1b0d2d'; document.head.appendChild(m);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
