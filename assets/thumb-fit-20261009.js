/* Abracadeal — cadrage automatique des photos dans les vignettes (09/10/2026).
   Demande d'Anthony : toutes les photos postees doivent etre bien cadrees dans les vignettes,
   sur mobile, tablette et desktop, quel que soit leur format (portrait, paysage, carre).
   - Format proche de la vignette (recadrage <= 20 %) : la photo remplit la vignette, ancree en
     bas a droite pour ne jamais couper le filigrane "Abracadeal" incruste dans l'image.
   - Format tres different (ex. photo portrait dans une vignette paysage) : la photo entiere est
     affichee (contain) sur un fond flou de la meme photo (classe .thumb-fit-contain, voir CSS).
   Recalcule a chaque chargement d'image (carrousels, fallback) et au redimensionnement. */
(function(){
  const BOXES='.ad-photo,.personalized-photo,.home-featured-photo,.detail-related-photo,.b2b-listing-photo';
  const MAX_CROP=0.2;

  function reset(img,box){
    img.style.removeProperty('object-fit');
    img.style.removeProperty('object-position');
    box.classList.remove('thumb-fit-contain');
    box.style.removeProperty('--thumb-bg');
  }

  function fit(img){
    if(!img||img.tagName!=='IMG')return;
    const box=img.parentElement;
    if(!box||!box.matches(BOXES))return;
    if(img.classList.contains('abraca-default-photo')){reset(img,box);return;}
    if(!img.complete||!img.naturalWidth||!img.naturalHeight)return;
    const bw=box.clientWidth,bh=box.clientHeight;
    if(!bw||!bh)return;
    const ir=img.naturalWidth/img.naturalHeight,br=bw/bh;
    const crop=1-Math.min(ir,br)/Math.max(ir,br);
    if(crop<=MAX_CROP){
      img.style.setProperty('object-fit','cover','important');
      img.style.setProperty('object-position','right bottom','important');
      box.classList.remove('thumb-fit-contain');
      box.style.removeProperty('--thumb-bg');
    }else{
      img.style.setProperty('object-fit','contain','important');
      img.style.setProperty('object-position','center','important');
      box.style.setProperty('--thumb-bg','url("'+String(img.currentSrc||img.src).replace(/"/g,'%22')+'")');
      box.classList.add('thumb-fit-contain');
    }
  }

  function sweep(root){
    (root||document).querySelectorAll(BOXES.split(',').map(s=>s+' > img').join(',')).forEach(fit);
  }

  document.addEventListener('load',e=>fit(e.target),true);

  let queued=false;
  function queueSweep(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;sweep();});
  }
  new MutationObserver(queueSweep).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',queueSweep);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueSweep);else queueSweep();
})();
