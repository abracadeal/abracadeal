/* Aide à la rédaction de la description (gratuite, sans IA, rien n'est envoyé à un tiers).
   Bouton « ✨ M'aider à rédiger » sous le champ Description du formulaire de dépôt : propose un modèle
   adapté à la catégorie, prérempli avec les champs déjà saisis, et des repères [À compléter : ...]
   pour ce que seul le vendeur connaît. La publication est bloquée tant qu'il reste un repère. */
(function(){
  'use strict';
  var TODO='[À compléter';
  var $=function(id){return document.getElementById(id);};
  function shown(el){return !!(el&&(el.offsetParent!==null||el.getClientRects().length));}
  function val(id){
    var el=$(id);
    if(!el||!shown(el))return '';
    if(el.tagName==='SELECT'){var o=el.options[el.selectedIndex];return (el.value&&o)?o.text.trim():'';}
    return String(el.value||'').trim();
  }
  function checked(name){
    return Array.prototype.slice.call(document.querySelectorAll('input[name="'+name+'"]:checked'))
      .filter(shown).map(function(i){return i.value;});
  }
  function line(label,value,suffix){return value?'• '+label+' : '+value+(suffix||''):null;}
  function todo(label,hint){return label+' : '+TODO+' : '+hint+']';}
  function num(v){var n=parseInt(String(v).replace(/\s/g,''),10);return isNaN(n)?v:n.toLocaleString('fr-FR');}
  function join(parts){return parts.filter(function(p){return p!=null;}).join('\n').replace(/\n{3,}/g,'\n\n').trim();}

  function draft(){
    var cat=val('adCategory')?$('adCategory').value:'';
    var sub=val('vehicleSubcategory').toLowerCase();
    var title=val('adTitle');
    var city=val('adCity');
    var cond=val('itemCondition');
    var where=city?(' à '+city):'';
    var end='N’hésitez pas à me contacter via la messagerie Abracadeal pour toute question'+(city?' ou pour venir voir'+(cat==='vehicules'?' et essayer':'')+where:'')+'.';
    if(cat==='vehicules'&&/équipement|equipement|pièce|piece|accessoire/.test(sub+' '+val('equipmentType').toLowerCase())&&!val('vehicleMake')){
      return join([
        'À vendre'+(title?' : '+title:'')+'.','',
        line('Type',val('equipmentType')),line('État',cond),'',
        todo('Compatibilité','véhicules compatibles, dimensions, références'),
        todo('État détaillé','usure, défauts éventuels, réparations'),
        todo('Pourquoi je vends','ex. changement de véhicule'),'',end]);
    }
    if(cat==='vehicules'){
      var eq=checked('vehicleEquipment');
      var km=val('vehicleMileage');
      return join([
        'À vendre'+(title?' : '+title:'')+'.','',
        'Caractéristiques :',
        line('Marque',val('vehicleMake')),line('Modèle',val('vehicleModel')),line('Version',val('vehicleVersion')),
        line('Finition',val('vehicleFinish')),line('Année',val('vehicleYear')),
        line('1re mise en circulation',val('vehicleFirstRegistration')),line('Kilométrage',km?num(km):'',km?' km':''),
        line('Carburant',val('vehicleFuel')),line('Boîte',val('vehicleTransmission')),line('Carrosserie',val('vehicleBody')),
        line('Puissance',val('vehicleDinPower'),val('vehicleDinPower')?' ch':''),line('Couleur',val('vehicleColor')),
        line('Portes',val('vehicleDoors')),line('Places',val('vehicleSeats')),line('Crit’Air',val('vehicleCritAir')),
        line('État',cond),'',
        eq.length?'Équipements : '+eq.join(', ')+'.':todo('Équipements','climatisation, GPS, radar de recul…'),'',
        val('vehicleMaintenance')?'Entretien : '+val('vehicleMaintenance')+'.':todo('Entretien','carnet, factures, date de la dernière révision, courroie'),
        val('vehicleTechnicalInspection')?'Contrôle technique : '+val('vehicleTechnicalInspection')+'.':todo('Contrôle technique','date et résultat'),
        val('vehicleHistory')?'Historique : '+val('vehicleHistory')+'.':null,
        todo('État général','carrosserie, intérieur, pneus, défauts éventuels'),
        todo('Raison de la vente','ex. achat d’un autre véhicule'),'',end]);
    }
    if(cat==='immobilier'){
      var feats=checked('immoFeature');
      var surf=val('immoSurface');
      return join([
        (title||'Bien immobilier')+(city?', '+city:'')+'.','',
        'Le bien :',
        line('Type',sub?val('vehicleSubcategory'):''),line('Surface',surf,surf?' m²':''),
        line('Terrain',val('immoLandSurface'),val('immoLandSurface')?' m²':''),line('Pièces',val('immoRooms')),
        line('Chambres',val('immoBedrooms')),line('Salles de bain / d’eau',val('immoBathrooms')),line('Étage',val('immoFloor')),
        line('Meublé',val('immoFurnished')),line('Chauffage',val('immoHeating')),line('Exposition',val('immoOrientation')),
        line('État',val('immoPropertyCondition')),line('Disponible à partir du',val('immoAvailableDate')),
        line('DPE',val('immoDpe')),line('GES',val('immoGes')),'',
        feats.length?'Atouts : '+feats.join(', ')+'.':todo('Atouts','balcon, parking, cave, ascenseur, vue…'),
        todo('Points forts','luminosité, calme, travaux récents, agencement'),
        todo('Proximité',(val('immoNeighborhood')?val('immoNeighborhood')+' : ':'')+'commerces, écoles, transports, plages'),'',
        'Contactez-moi via la messagerie Abracadeal pour plus d’informations ou pour organiser une visite.']);
    }
    var bodies={
      hightech:[todo('Modèle et capacité','ex. 128 Go, couleur, année d’achat'),todo('État détaillé','rayures, écran, batterie (% de capacité)'),
        todo('Fourni avec','boîte, chargeur, câble, facture, garantie restante'),todo('Raison de la vente','ex. changement d’appareil')],
      maison:[todo('Dimensions','largeur × profondeur × hauteur'),todo('Matière et couleur','ex. chêne massif, gris'),
        todo('État détaillé','traces d’usage, défauts éventuels'),todo('Enlèvement','à récupérer sur place, démonté ou non, étage / ascenseur')],
      mode:[todo('Marque et taille','ex. taille M / 38'),todo('Couleur et matière','ex. coton, cuir'),
        todo('État détaillé','porté combien de fois, défauts éventuels'),todo('Remise','en main propre et / ou envoi')],
      emploi:[todo('Poste','intitulé et missions principales'),todo('Profil recherché','expérience, permis, compétences'),
        todo('Contrat','CDI, CDD, saisonnier, temps plein / partiel, date de début'),todo('Rémunération et horaires','salaire, horaires, avantages')],
      services:[todo('Prestation proposée','ce que vous faites précisément'),'Zone d’intervention : '+(city?city+' et alentours':TODO+' : villes couvertes]')+'.',
        todo('Tarifs','à l’heure, au forfait, devis gratuit'),todo('Disponibilités','jours et horaires'),todo('Expérience','années d’expérience, références, diplômes')],
      autres:[todo('Description','ce que c’est, marque, modèle, dimensions'),todo('État détaillé','défauts éventuels'),todo('Raison de la vente','')]
    };
    var intro=cat==='emploi'?'Offre d’emploi'+(title?' : '+title:'')+where+'.':cat==='services'?(title||'Service proposé')+where+'.':'À vendre'+(title?' : '+title:'')+'.';
    var outro=cat==='emploi'?'Pour postuler, contactez-nous via la messagerie Abracadeal.':cat==='services'?'Contactez-moi via la messagerie Abracadeal pour un devis ou une disponibilité.':end;
    return join([intro,'',cond&&cat!=='emploi'&&cat!=='services'?line('État',cond):null,(bodies[cat]||bodies.autres).join('\n'),'',outro]);
  }

  function notify(msg){if(typeof window.toast==='function')window.toast(msg);else alert(msg);}

  function fill(){
    var ta=$('adDescription');
    if(!ta)return;
    if(!$('adCategory')||!$('adCategory').value){notify('Choisissez d’abord une catégorie et un titre.');return;}
    var text=draft().slice(0,Number(ta.maxLength)>0?Number(ta.maxLength):2500);
    if(ta.value.trim()&&!confirm('Remplacer votre description actuelle par le modèle proposé ?'))return;
    ta.value=text;
    ta.dispatchEvent(new Event('input',{bubbles:true}));
    ta.dispatchEvent(new Event('change',{bubbles:true}));
    var i=text.indexOf(TODO);
    ta.focus();
    if(i>=0){var j=text.indexOf(']',i);ta.setSelectionRange(i,j>=0?j+1:i);}
    notify('Complétez les passages [À compléter] puis relisez votre description.');
  }

  function install(){
    var ta=$('adDescription');
    if(!ta||$('descriptionHelperBtn'))return;
    var bar=document.createElement('div');
    bar.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px';
    bar.innerHTML='<button type="button" id="descriptionHelperBtn" style="border:1px solid #d9c3e6;background:#f6eefa;color:#6f218c;font:inherit;font-weight:800;font-size:.9rem;padding:9px 14px;border-radius:999px;cursor:pointer">✨ M’aider à rédiger</button>'
      +'<span style="font-size:.8rem;color:#7a6a86">Modèle adapté à la catégorie, à compléter et relire.</span>';
    ta.insertAdjacentElement('afterend',bar);
    $('descriptionHelperBtn').addEventListener('click',fill);
  }

  // Empêche de publier une description qui contient encore des repères [À compléter : ...]
  document.addEventListener('submit',function(e){
    var form=e.target;
    if(!form||form.id!=='publishForm')return;
    var ta=$('adDescription');
    if(ta&&ta.value.indexOf(TODO)>=0){
      e.preventDefault();e.stopImmediatePropagation();
      var i=ta.value.indexOf(TODO),j=ta.value.indexOf(']',i);
      ta.focus();ta.setSelectionRange(i,j>=0?j+1:i);
      notify('Il reste des passages [À compléter] dans la description : complétez-les ou supprimez-les.');
    }
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
