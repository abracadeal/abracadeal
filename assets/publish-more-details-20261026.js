/* Abracadeal — 26/10/2026 : formulaire « Publier une annonce », rubrique Véhicules.
   Seuls les champs essentiels restent visibles (marque, modèle, année, kilométrage, carburant, boîte).
   Les autres (Crit'Air, 1re mise en circulation, carrosserie, portes, places, permis, finition, version,
   couleur, sellerie, puissances, CO₂, historique, contrôle technique, entretien, garantie, équipements)
   sont regroupés sous un bouton « Plus de détails (facultatif) ». Rien n'est supprimé : les champs gardent
   leurs id et leur logique d'affichage existante (classe .hidden gérée par index-main.js). */
(function () {
  'use strict';
  var EXTRA_IDS = ['vehicleCritAir', 'vehicleFirstRegistration', 'vehicleBody', 'vehicleDoors', 'vehicleSeats',
    'vehiclePermit', 'vehicleFinish', 'vehicleVersion', 'vehicleColor', 'vehicleUpholstery', 'vehicleFiscalPower',
    'vehicleDinPower', 'vehicleCo2', 'vehicleHistory', 'vehicleTechnicalInspection', 'vehicleMaintenance',
    'vehicleWarranty'];

  function rows(form) {
    var list = [];
    EXTRA_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      var row = el && el.closest('.form-row');
      if (row && form.contains(row)) list.push(row);
    });
    var eq = form.querySelector('.vehicle-equipment-panel');
    if (eq) list.push(eq);
    return list;
  }

  function anyFilled(list) {
    return list.some(function (row) {
      return [].some.call(row.querySelectorAll('input,select,textarea'), function (f) {
        if (f.type === 'checkbox' || f.type === 'radio') return f.checked;
        return String(f.value || '').trim() !== '';
      });
    });
  }

  function start() {
    var form = document.getElementById('publishForm');
    var anchorField = document.getElementById('vehicleTransmission');
    if (!form || !anchorField || document.getElementById('vehicleMoreToggleRow')) return;
    var extra = rows(form);
    if (!extra.length) return;
    extra.forEach(function (r) { r.classList.add('veh-extra-row'); });

    var anchorRow = anchorField.closest('.form-row');
    var tr = document.createElement('div');
    tr.className = 'form-row full veh-more-row';
    tr.id = 'vehicleMoreToggleRow';
    tr.innerHTML = '<button type="button" class="veh-more-btn" id="vehicleMoreToggle" aria-expanded="false">' +
      '<span class="veh-more-plus" aria-hidden="true">+</span> Plus de détails <span class="veh-more-opt">(facultatif)</span></button>';
    // placé juste avant le premier champ secondaire, pour rester dans l'ordre du formulaire
    extra[0].parentNode.insertBefore(tr, extra[0]);

    var open = false;
    function apply() {
      form.classList.toggle('veh-more-open', open);
      var btn = document.getElementById('vehicleMoreToggle');
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.veh-more-plus').textContent = open ? '−' : '+';
      btn.childNodes[1].nodeValue = open ? ' Moins de détails ' : ' Plus de détails ';
    }
    function syncVisibility() {
      // le bouton n'apparaît que quand les champs véhicule sont affichés (voitures, motos, utilitaires…)
      var visible = anchorRow && !anchorRow.classList.contains('hidden') && anchorRow.offsetParent !== null;
      tr.style.display = visible ? '' : 'none';
      // en modification d'annonce, si des détails sont déjà remplis, on les montre
      if (visible && !open && anyFilled(extra)) { open = true; apply(); }
    }
    document.getElementById('vehicleMoreToggle').addEventListener('click', function () { open = !open; apply(); });
    ['adCategory', 'vehicleSubcategory'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () { setTimeout(syncVisibility, 0); });
    });
    new MutationObserver(function () { syncVisibility(); })
      .observe(anchorRow, { attributes: true, attributeFilter: ['class'] });
    var modal = document.getElementById('publishModal');
    if (modal) new MutationObserver(function () { setTimeout(syncVisibility, 50); })
      .observe(modal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
    // à la fermeture/réinitialisation du formulaire, on replie
    form.addEventListener('reset', function () { open = false; apply(); });
    apply();
    syncVisibility();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
