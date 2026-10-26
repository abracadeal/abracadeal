/* Charge les aides de publication Abracadeal sans modifier le HTML principal. */
(function(){
  function load(src){var s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s);}
  load('assets/description-helper-original-20261013.js?v=3');
  load('assets/emploi-form-20261013.js?v=3');
})();

/* 18/10/2026 — Les entrées principales Auto/Moto regroupent aussi leurs équipements,
   sans modifier les sous-catégories détaillées ni les annonces en base. */
(function(){
  if(typeof filteredAds!=='function'||typeof navigateCatalogue!=='function')return;
  const baseFilteredAds=filteredAds;
  const baseVehicleSubLabel=vehicleSubLabel;

  function groupedResults(primary,equipment){
    const select=document.getElementById('filterSubcategory');
    const previousActive=activeVehicleSubcategory;
    const previousSelect=select?select.value:'';
    const rows=[];
    const seen=new Set();
    try{
      for(const sub of [primary,equipment]){
        activeVehicleSubcategory=sub;
        if(select)select.value=sub;
        baseFilteredAds().forEach(ad=>{
          const key=ad?.id||ad;
          if(!seen.has(key)){seen.add(key);rows.push(ad);}
        });
      }
    }finally{
      activeVehicleSubcategory=previousActive;
      if(select)select.value=previousSelect;
    }
    return rows;
  }

  filteredAds=function(){
    if(activeVehicleSubcategory==='auto-groupe')return groupedResults('voitures','equipement-auto');
    if(activeVehicleSubcategory==='moto-groupe')return groupedResults('motos','equipement-moto');
    return baseFilteredAds();
  };

  vehicleSubLabel=function(value){
    if(value==='auto-groupe')return 'Auto';
    if(value==='moto-groupe')return 'Moto';
    return baseVehicleSubLabel(value);
  };

  document.addEventListener('click',function(event){
    const link=event.target.closest('.category-link');
    if(!link||link.dataset.category!=='vehicules')return;
    const label=(link.querySelector('h3')?.textContent||link.textContent||'').trim();
    const isMainAuto=link.dataset.sub==='voitures'&&label==='Auto';
    const isMainMoto=link.dataset.sub==='motos'&&label==='Moto';
    if(!isMainAuto&&!isMainMoto)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigateCatalogue('vehicules',isMainAuto?'auto-groupe':'moto-groupe');
  },true);
})();