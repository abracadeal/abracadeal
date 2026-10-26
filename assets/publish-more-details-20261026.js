/* Abracadeal — 26/10/2026 : formulaire « Publier une annonce » — l'essentiel d'abord.
   Véhicules : visibles = marque, modèle, année, kilométrage, carburant, boîte.
   Immobilier : visibles = surface, pièces, meublé, DPE, GES, dépenses d'énergie estimées, copropriété
   (lots, charges) et honoraires — ce sont les mentions OBLIGATOIRES dans une annonce immobilière, à ne pas replier.
   Le reste est regroupé sous un bouton « Plus de détails (facultatif) ». Rien n'est supprimé : les champs gardent
   leurs id et leur logique d'affichage existante (classe .hidden gérée par index-main.js). */
(function () {
  'use strict';
  var GROUPS = [
    {
      key: 'vehicle',
      category: 'vehicules',
      extraIds: ['vehicleCritAir', 'vehicleFirstRegistration', 'vehicleBody', 'vehicleDoors', 'vehicleSeats',
        'vehiclePermit', 'vehicleFinish', 'vehicleVersion', 'vehicleColor', 'vehicleUpholstery', 'vehicleFiscalPower',
        'vehicleDinPower', 'vehicleCo2', 'vehicleHistory', 'vehicleTechnicalInspection', 'vehicleMaintenance',
        'vehicleWarranty'],
      extraSelectors: ['.vehicle-equipment-panel']
    },
    {
      key: 'immo',
      category: 'immobilier',
      extraIds: ['immoBedrooms', 'immoBathrooms', 'immoFloor', 'immoTotalFloors', 'immoYearBuilt',
        'immoPropertyCondition', 'immoHeating', 'immoOrientation', 'immoNeighborhood', 'immoMandate',
        'immoAvailableDate', 'immoEnergyConsumption', 'immoDpeDate', 'immoPropertyTax'],
      extraSelectors: ['.realestate-equipment-panel']
    }
  ];

  function anyFilled(list) {
    return list.some(function (row) {
      return [].some.call(row.querySelectorAll('input,select,textarea'), function (f) {
        if (f.type === 'checkbox' || f.type === 'radio') return f.checked;
        return String(f.value || '').trim() !== '';
      });
    });
  }

  function setup(form, g) {
    if (document.getElementById(g.key + 'MoreToggleRow')) return;
    var extra = [];
    g.extraIds.forEach(function (id) {
      var el = document.getElementById(id);
      var row = el && el.closest('.form-row');
      if (row && form.contains(row) && extra.indexOf(row) < 0) extra.push(row);
    });
    g.extraSelectors.forEach(function (sel) {
      var el = form.querySelector(sel);
      if (el && extra.indexOf(el) < 0) extra.push(el);
    });
    if (!extra.length) return;
    extra.forEach(function (r) { r.classList.add('more-extra-' + g.key); });

    var tr = document.createElement('div');
    tr.className = 'form-row full veh-more-row';
    tr.id = g.key + 'MoreToggleRow';
    tr.innerHTML = '<button type="button" class="veh-more-btn" aria-expanded="false">' +
      '<span class="veh-more-plus" aria-hidden="true">+</span><span class="veh-more-label">Plus de détails</span>' +
      '<span class="veh-more-opt">(facultatif)</span></button>';
    // placé à la fin des champs propres à la catégorie, juste avant « Titre de l'annonce »
    var titleRow = (document.getElementById('adTitle') || {}).closest ? document.getElementById('adTitle').closest('.form-row') : null;
    if (titleRow && titleRow.parentNode) titleRow.parentNode.insertBefore(tr, titleRow);
    else extra[extra.length - 1].parentNode.insertBefore(tr, extra[extra.length - 1].nextSibling);
    var btn = tr.querySelector('button');

    var open = false;
    function apply() {
      form.classList.toggle('more-open-' + g.key, open);
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.veh-more-plus').textContent = open ? '−' : '+';
      btn.querySelector('.veh-more-label').textContent = open ? 'Moins de détails' : 'Plus de détails';
    }
    function sync() {
      var cat = (document.getElementById('adCategory') || {}).value;
      // le bouton n'apparaît que si au moins un champ replié concerne le type choisi
      var relevant = cat === g.category && extra.some(function (r) { return !r.classList.contains('hidden'); });
      tr.style.display = relevant ? '' : 'none';
      if (relevant && !open && anyFilled(extra.filter(function (r) { return !r.classList.contains('hidden'); }))) {
        open = true; apply(); // modification d'une annonce déjà détaillée
      }
    }
    btn.addEventListener('click', function () { open = !open; apply(); });
    ['adCategory', 'vehicleSubcategory'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () { setTimeout(sync, 0); });
    });
    var mo = new MutationObserver(function () { sync(); });
    extra.forEach(function (r) { mo.observe(r, { attributes: true, attributeFilter: ['class'] }); });
    var modal = document.getElementById('publishModal');
    if (modal) new MutationObserver(function () { setTimeout(sync, 50); })
      .observe(modal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
    form.addEventListener('reset', function () { open = false; apply(); });
    apply();
    sync();
  }

  function start() {
    var form = document.getElementById('publishForm');
    if (!form) return;
    GROUPS.forEach(function (g) { setup(form, g); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
