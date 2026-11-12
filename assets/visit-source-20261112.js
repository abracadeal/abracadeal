/* 12/11/2026 (Claude, Anthony : « voir d'où viennent les visites ») — provenance d'une visite, partagée par
   l'accueil (index-main.js) et les showrooms (pro.html).
   - Les fiches indexées par Google (/annonce/…/, /annonces/…) renvoient le visiteur vers le site : elles gardent
     l'adresse d'origine dans sessionStorage « abraca_entry_ref » (sinon la visite comptait « Direct »).
   - Sources : google, bing (autres moteurs), ia (ChatGPT, Perplexity…), facebook, instagram, prospection
     (lien d'un mail aux pros), email, partage (lien partagé par un vendeur), seo (fiche référencée, origine
     inconnue), autre_site, direct. host = site d'origine, pour la liste « quels sites ». */
(function () {
  'use strict';
  function hostOf(u) { try { return u ? new URL(u).hostname.replace(/^www\./, '').toLowerCase() : ''; } catch (_) { return ''; } }
  /* Robots et navigateurs automatisés (Google qui affiche la page, outils de test de Claude/ChatGPT…) :
     jamais comptés comme visiteurs. */
  window.abracaIsRobot = function () {
    try {
      if (navigator.webdriver) return true;
      return /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|bingpreview|google-inspectiontool|chrome-lighthouse|phantomjs|puppeteer|playwright|selenium/i.test(navigator.userAgent || '');
    } catch (_) { return false; }
  };
  window.abracaVisitOrigin = function () {
    try {
      var q = new URLSearchParams(location.search);
      if (/^[a-z0-9]{8}$/.test(q.get('r') || '')) return { source: 'prospection', host: '' };
      var utm = (q.get('utm_medium') || '') + ' ' + (q.get('utm_source') || '');
      if (/prospect/i.test(utm)) return { source: 'prospection', host: '' };
      if (/mail/i.test(utm)) return { source: 'email', host: '' };
      if (q.get('via') === 'partage') {
        try { q.delete('via'); history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (_) {}
        return { source: 'partage', host: '' };
      }
      var ref = document.referrer || '', own = /(^|\.)abracadeal\.(fr|com)$/;
      var h = hostOf(ref), entry = null;
      try { entry = sessionStorage.getItem('abraca_entry_ref'); } catch (_) {}
      if ((!h || own.test(h)) && entry != null) {
        try { sessionStorage.removeItem('abraca_entry_ref'); } catch (_) {}
        var eh = hostOf(entry);
        if (eh && !own.test(eh)) { ref = entry; h = eh; }
        else return { source: 'seo', host: '' };
      }
      if (h && own.test(h)) {
        var path = '';
        try { path = new URL(ref).pathname; } catch (_) {}
        if (/^\/(annonce|annonces|auto|immo|garage)\//.test(path)) return { source: 'seo', host: '' };
        return { source: 'direct', host: '' };
      }
      if (!h) return { source: 'direct', host: '' };
      if (/(^|\.)google\./.test(h)) return { source: 'google', host: h };
      if (/chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google|copilot\.microsoft|mistral\.ai|you\.com/.test(h)) return { source: 'ia', host: h };
      if (/bing\.|duckduckgo|qwant|ecosia|yahoo|brave\.com|startpage|lilo/.test(h)) return { source: 'bing', host: h };
      if (/facebook|(^|\.)fb\.|messenger/.test(h)) return { source: 'facebook', host: h };
      if (/instagram/.test(h)) return { source: 'instagram', host: h };
      if (/mail\.|outlook\.|webmail|zimbra/.test(h)) return { source: 'email', host: h };
      return { source: 'autre_site', host: h };
    } catch (_) { return { source: 'direct', host: '' }; }
  };
})();
