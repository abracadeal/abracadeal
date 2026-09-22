/* Abracadeal — partage d'annonce avec aperçu photo (22/09/2026).
   Le lien de partage passe par une page Open Graph publique puis redirige vers la fiche.
   Sur iOS/SMS, on partage uniquement ce lien afin d'éviter l'envoi texte + lien en double. */
(function(){
  const SHARE_BASE='https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/share-listing';
  const shareUrl=id=>SHARE_BASE+'?id='+encodeURIComponent(id);

  window.copyListingLink=async id=>{
    const url=shareUrl(id);
    try{await navigator.clipboard.writeText(url);window.toast?.('Lien copié');}
    catch{prompt('Copiez ce lien :',url);}
  };

  window.shareListingWhatsApp=id=>{
    const url=shareUrl(id);
    window.open('https://wa.me/?text='+encodeURIComponent(url),'_blank','noopener');
  };

  window.shareListingFacebook=id=>{
    const url=encodeURIComponent(shareUrl(id));
    window.open('https://www.facebook.com/sharer/sharer.php?u='+url,'_blank','noopener,width=700,height=600');
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