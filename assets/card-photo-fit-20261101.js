// 01/11/2026 (Anthony : « les anciennes images ne sont pas bien dans les vignettes »).
// Photos en hauteur (téléphone) ou très étirées : rognées par la vignette (on ne voyait que le milieu).
// Elles sont maintenant affichées entières, sur un fond flou fait de la même photo. Les photos « paysage » ne changent pas.
(function(){
  const fit=img=>{
    const box=img.closest('.ad-photo,.home-featured-photo,.personalized-photo,.detail-related-photo');
    if(!box||img.classList.contains('abraca-default-photo')||!img.naturalWidth)return;
    const r=img.naturalWidth/img.naturalHeight,bw=box.clientWidth||1,bh=box.clientHeight||1,br=bw/bh;
    const crop=r>br?1-br/r:1-r/br; // part de la photo cachée par le rognage
    const on=crop>0.22;
    box.classList.toggle('photo-fit',on);
    if(on){try{box.style.setProperty('--photo-bg','url("'+img.currentSrc.replace(/"/g,'%22')+'")');}catch(_){}}
  };
  document.addEventListener('load',e=>{const t=e.target;if(t&&t.tagName==='IMG')fit(t);},true);
  const scan=()=>document.querySelectorAll('.ad-photo img,.home-featured-photo img,.personalized-photo img,.detail-related-photo img').forEach(i=>{if(i.complete)fit(i);});
  new MutationObserver(()=>{clearTimeout(scan._t);scan._t=setTimeout(scan,120);}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('resize',()=>{clearTimeout(scan._r);scan._r=setTimeout(scan,200);});
  scan();
})();
