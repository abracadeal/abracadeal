/* 07/11/2026 (Anthony : « les filtres ça va pas du tout, ça reste en fonction et on dirait que c'est que pour créer une alerte »).
   - Bouton principal « Voir les N annonces » : ferme le panneau et descend sur les résultats.
   - « Créer une alerte » devient un bouton secondaire.
   - Retour à l'accueil (logo) : le panneau de filtres se ferme en plus d'être vidé. */
(function(){
  const panel=document.getElementById('filtersPanel');
  const btn=document.getElementById('applyFilters');
  if(!panel||!btn)return;
  function count(){try{return typeof filteredAds==='function'?filteredAds().length:null}catch(e){return null}}
  function label(){const n=count();btn.textContent=!n?'Voir les résultats':'Voir '+(n>1?'les '+n+' annonces':'l’annonce');}
  let t=null;const later=()=>{clearTimeout(t);t=setTimeout(label,60)};
  panel.addEventListener('input',later);panel.addEventListener('change',later);
  document.getElementById('resetFilters')?.addEventListener('click',later);
  document.getElementById('filtersToggle')?.addEventListener('click',later);
  document.getElementById('heroFiltersBtn')?.addEventListener('click',later);
  ['searchQuery','searchCity'].forEach(id=>document.getElementById(id)?.addEventListener('input',later));
  function close(){panel.classList.add('hidden');try{closeAllQuickFilterPopovers()}catch(e){}}
  btn.addEventListener('click',()=>{close();const r=document.getElementById('adsGrid')||document.getElementById('resultats');r?.scrollIntoView({behavior:'smooth',block:'start'});});
  document.getElementById('closeFilters')?.addEventListener('click',close);
  document.querySelectorAll('[data-home-brand]').forEach(a=>a.addEventListener('click',close));
  const grid=document.getElementById('adsGrid');if(grid)new MutationObserver(later).observe(grid,{childList:true});
  label();
})();
