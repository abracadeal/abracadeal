/* Abracadeal — 27/10/2026 : état de l'offre Fondateurs (ouverte / fermée par l'administrateur).
   Si l'offre est fermée aux nouvelles inscriptions, tous les encarts Fondateurs disparaissent du site
   (bandeau, compteur, encart d'inscription, page Fondateurs) et les textes Pros deviennent neutres.
   Les Fondateurs déjà inscrits ne sont pas concernés. Pour annuler : retirer la balise <script> de ce fichier. */
(function () {
  'use strict';
  var URL = 'https://jplzvxmpbpjssyinozap.supabase.co', KEY = 'sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
  var css = 'html.founder-closed #founderTopbar,html.founder-closed .founder-inline,html.founder-closed [data-founder-counter],' +
    'html.founder-closed .founder-terms-link,html.founder-closed .founder-simple-side,html.founder-closed #signupFounderOffer,' +
    'html.founder-closed .pro-plan-intro,html.founder-closed #founderAvail,html.founder-closed section.founder,' +
    'html.founder-closed #publicGate .tech{display:none!important}';
  function txt(sel, t) { var e = document.querySelector(sel); if (e) e.textContent = t; }
  function apply() {
    document.documentElement.classList.add('founder-closed');
    if (!document.getElementById('founder-closed-css')) {
      var s = document.createElement('style'); s.id = 'founder-closed-css'; s.textContent = css; document.head.appendChild(s);
    }
    /* Accueil : bloc Pros */
    txt('#pros h2', 'Pros Auto, Moto & Immobilier : publiez votre stock sur Abracadeal.');
    txt('#pros .pro-block p', 'Garages, marchands Auto/Moto et agences immobilières publient et gèrent leur stock sur Abracadeal, avec import automatique et partage en un clic.');
    txt('#proAccountBtn', 'Créer mon compte Pro');
    /* Page Fondateurs (visiteur non connecté) */
    txt('#publicGate h2', 'Créez votre compte Pro');
    txt('#publicGate .btn', 'Créer mon compte Pro');
  }
  function check() {
    try {
      fetch(URL + '/rest/v1/rpc/get_founder_offer_open', {
        method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}'
      }).then(function (r) { return r.ok ? r.json() : null; }).then(function (open) {
        window.abracaFounderOfferOpen = open !== false;
        if (open === false) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply(); }
      }).catch(function () {});
    } catch (_) {}
  }
  check();
})();
