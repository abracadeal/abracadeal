/* Abracadeal — partage d'annonce avec aperçu photo (22/09/2026).
   Le lien de partage passe par une page Open Graph publique puis redirige vers la fiche.
   Sur iOS/SMS, on partage uniquement ce lien afin d'éviter l'envoi texte + lien en double. */
(function(){
  /* Fix 08/10/2026 : le lien supabase.co/functions/v1/share-listing tombait sur une page blanche
     (Supabase force text/plain + CSP sandbox sur les pages HTML des fonctions : pas de redirection).
     On partage desormais une page de partage hebergee sur abracadeal.fr. */
  // Page de partage avec la photo de l'annonce (generee par .github/workflows/share-pages.yml) ;
  // si elle n'existe pas encore, 404.html redirige vers la fiche.
  const pageUrl=id=>'https://abracadeal.fr/annonce/'+encodeURIComponent(id)+'/';
  /* Fix 06/11/2026 : partage Facebook qui « ne se fait pas » sur une annonce récente.
     La page /annonce/<id>/ n'est générée que par la tâche automatique (toutes les ~10 min,
     souvent bien plus tard en pratique). Avant ça, l'adresse renvoie une erreur 404 :
     un humain est redirigé vers la fiche, mais le robot de Facebook refuse un lien en 404
     (pas d'aperçu, publication impossible). On vérifie donc à l'avance si la page existe
     (dès l'ouverture d'une fiche, du menu de partage ou de l'écran « annonce en ligne ») ;
     tant qu'elle n'existe pas, on partage l'adresse directe de la fiche, qui répond toujours. */
  const pageState={};
  const checkPage=id=>{
    if(!id||pageState[id]==='ok'||pageState[id]==='pending')return;
    pageState[id]='pending';
    fetch('/annonce/'+encodeURIComponent(id)+'/',{method:'HEAD',cache:'no-store'})
      .then(r=>{pageState[id]=r.ok?'ok':'missing';})
      .catch(()=>{pageState[id]='missing';});
  };
  window.abracaWarmShareUrl=checkPage;
  const shareUrl=id=>{
    if(pageState[id]==='ok')return pageUrl(id);
    checkPage(id);
    return 'https://abracadeal.fr/?annonce='+encodeURIComponent(id);
  };
  const warmWrap=name=>{
    const fn=window[name];
    if(typeof fn!=='function'||fn.__abracaWarm)return;
    const w=function(id){try{checkPage(String(id||''));}catch(e){}return fn.apply(this,arguments);};
    w.__abracaWarm=true;window[name]=w;
  };
  ['openAd','shareListingSmart','showPublishShareScreen'].forEach(warmWrap);

  window.copyListingLink=async id=>{
    const url=shareUrl(id);
    try{await navigator.clipboard.writeText(url);window.toast?.('Lien copié');}
    catch{prompt('Copiez ce lien :',url);}
  };

  window.shareListingWhatsApp=id=>{
    window.open('https://wa.me/?text='+encodeURIComponent(shareUrl(id)),'_blank','noopener');
  };

  /* Fix 05/11/2026 : sur mobile, la fenêtre de partage Facebook restait sur une page blanche
     après la publication (Facebook n'arrive pas à se refermer dans l'onglet ouvert par le site).
     Sur téléphone/tablette on passe par la feuille de partage du système (Facebook y est proposé,
     l'utilisateur reste sur Abracadeal) ; sur ordinateur, fenêtre Facebook classique. */
  window.shareListingFacebook=async id=>{
    const raw=shareUrl(id);
    const touch=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
    if(touch&&navigator.share){
      try{await navigator.share({url:raw});}
      catch(e){if(e?.name!=='AbortError')console.warn(e);}
      window.closeShareMenu?.();
      return;
    }
    window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(raw),'_blank','noopener,width=700,height=600');
  };

  window.shareListingSms=id=>{
    location.href='sms:?&body='+encodeURIComponent(shareUrl(id));
  };

  window.shareListingNative=async id=>{
    const url=shareUrl(id);
    if(navigator.share){
      try{await navigator.share({url});}
      catch(e){if(e?.name!=='AbortError')console.warn(e);}
    }else{
      try{await navigator.clipboard.writeText(url);window.toast?.('Lien copié');}
      catch{prompt('Copiez ce lien :',url);}
    }
    window.closeShareMenu?.();
  };
})();

/* 06/11/2026 : la déconnexion automatique après inactivité est passée dans assets/session-guard-20261106.js
   (l'ancien contrôle ici utilisait un 2e client Supabase qui se battait avec le principal pour le jeton). */
