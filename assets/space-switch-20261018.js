/* Abracadeal — sélecteur « Annonces | Vacances » en haut des pages d'accueil sur mobile (18/10/2026).
   Ajouté dans la ligne du logo de index.html (.mobile-topbar) et de vacances.html (.vac-mobile-main-return),
   pour passer d'un univers à l'autre comme dans une application. Rien sur ordinateur. */
(function () {
  'use strict';
  function start() {
    var row = document.querySelector('.mobile-topbar') || document.querySelector('.vac-mobile-main-return');
    if (!row || row.querySelector('.abraca-space-switch')) return;
    var onVac = /vacances\.html$/i.test(location.pathname);
    var nav = document.createElement('nav');
    nav.className = 'abraca-space-switch';
    nav.setAttribute('aria-label', 'Choisir un espace');
    nav.innerHTML =
      '<a href="index.html" class="' + (onVac ? '' : 'is-on') + '"' + (onVac ? '' : ' aria-current="page"') + '>Annonces</a>' +
      '<a href="vacances.html" class="' + (onVac ? 'is-on' : '') + '"' + (onVac ? ' aria-current="page"' : '') + '>Vacances</a>';
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      if (a.classList.contains('is-on')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
    row.classList.add('abraca-has-switch');
    row.appendChild(nav);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
