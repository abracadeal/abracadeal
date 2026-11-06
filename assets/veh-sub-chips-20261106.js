/* 06/11/2026 (Anthony) : façon propre de voir les motos & scooters.
   Rangée de raccourcis en tête des résultats dès qu'on est dans Véhicules :
   Tous · Voitures · Motos & scooters · Utilitaires · Équipements & pièces. */
(function(){
  const CHIPS=[['','Tous les véhicules'],['voitures','Voitures'],['motos','Motos & scooters'],['utilitaires','Utilitaires'],['equipements','Équipements & pièces']];
  const css=document.createElement('style');
  css.textContent=`.veh-sub-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 14px;margin:0;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .veh-sub-chips::-webkit-scrollbar{display:none}
  .veh-sub-chips.hidden{display:none!important}
  .veh-sub-chip{flex:0 0 auto;border:1px solid rgba(214,84,255,.45);background:rgba(255,255,255,.06);color:inherit;border-radius:999px;padding:8px 14px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}
  .veh-sub-chip.on{background:linear-gradient(135deg,#b62fd8,#ff3d9a);border-color:transparent;color:#fff}`;
  document.head.appendChild(css);
  function curCat(){try{return activeCategory||document.getElementById('filterCategory')?.value||''}catch(_){return document.getElementById('filterCategory')?.value||''}}
  function curSub(){try{return activeVehicleSubcategory||document.getElementById('filterSubcategory')?.value||''}catch(_){return ''}}
  function build(){
    const head=document.querySelector('#resultats .listing-head');if(!head||document.getElementById('vehSubChips'))return;
    const box=document.createElement('div');box.id='vehSubChips';box.className='veh-sub-chips hidden';box.setAttribute('role','tablist');
    box.innerHTML=CHIPS.map(([v,l])=>`<button type="button" class="veh-sub-chip" data-sub="${v}">${l}</button>`).join('');
    head.insertAdjacentElement('afterend',box);
    box.addEventListener('click',e=>{const b=e.target.closest('.veh-sub-chip');if(!b)return;
      if(typeof navigateCatalogue==='function')navigateCatalogue('vehicules',b.dataset.sub||'');});
  }
  function sync(){
    build();const box=document.getElementById('vehSubChips');if(!box)return;
    const on=curCat()==='vehicules';box.classList.toggle('hidden',!on);
    if(!on)return;const s=curSub();
    box.querySelectorAll('.veh-sub-chip').forEach(b=>b.classList.toggle('on',(b.dataset.sub||'')===s));
    const a=box.querySelector('.veh-sub-chip.on');if(a)box.scrollLeft=Math.max(0,a.offsetLeft-box.clientWidth/2+a.clientWidth/2);
  }
  function start(){
    sync();
    const t=document.getElementById('resultTitle');
    if(t)new MutationObserver(sync).observe(t,{childList:true,characterData:true,subtree:true});
    document.getElementById('filterCategory')?.addEventListener('change',()=>setTimeout(sync,50));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
