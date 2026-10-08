/* Abracadeal — partage d'annonce avec aperçu photo (22/09/2026).
   Le lien de partage passe par une page Open Graph publique puis redirige vers la fiche.
   Sur iOS/SMS, on partage uniquement ce lien afin d'éviter l'envoi texte + lien en double. */
(function(){
  /* Fix 08/10/2026 : le lien supabase.co/functions/v1/share-listing tombait sur une page blanche
     (Supabase force text/plain + CSP sandbox sur les pages HTML des fonctions : pas de redirection).
     On partage desormais le lien direct de la fiche sur abracadeal.fr. Sans apercu photo propre a
     l'annonce, on ajoute le titre + prix devant le lien sur WhatsApp / SMS. */
  const shareUrl=id=>'https://abracadeal.fr/?annonce='+encodeURIComponent(id);
  const shareText=id=>{try{return typeof listingShareText==='function'?listingShareText(id):''}catch(_){return ''}};
  const withText=id=>{const t=shareText(id),u=shareUrl(id);return t?t+'\n'+u:u};

  window.copyListingLink=async id=>{
    const url=shareUrl(id);
    try{await navigator.clipboard.writeText(url);window.toast?.('Lien copié');}
    catch{prompt('Copiez ce lien :',url);}
  };

  window.shareListingWhatsApp=id=>{
    window.open('https://wa.me/?text='+encodeURIComponent(withText(id)),'_blank','noopener');
  };

  window.shareListingFacebook=id=>{
    const url=encodeURIComponent(shareUrl(id));
    window.open('https://www.facebook.com/sharer/sharer.php?u='+url,'_blank','noopener,width=700,height=600');
  };

  window.shareListingSms=id=>{
    location.href='sms:?&body='+encodeURIComponent(withText(id));
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

/* Abracadeal — déconnexion automatique après inactivité.
   30 min pour Particulier / Pro, 15 min pour Admin.
   L'activité réelle sur le site remet le compteur à zéro. */
(function(){
  const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
  const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
  const LAST_ACTIVITY_KEY='abracadeal:last-auth-activity';
  const USER_TIMEOUT=30*60*1000;
  const ADMIN_TIMEOUT=15*60*1000;
  const CHECK_EVERY=30*1000;
  const ACTIVITY_WRITE_THROTTLE=15*1000;
  let lastWrite=0;
  let checking=false;
  let sessionClient=null;

  function now(){return Date.now();}
  function readLastActivity(){
    const value=Number(localStorage.getItem(LAST_ACTIVITY_KEY)||0);
    return Number.isFinite(value)&&value>0?value:0;
  }
  function markActivity(force=false){
    const t=now();
    if(!force&&t-lastWrite<ACTIVITY_WRITE_THROTTLE)return;
    lastWrite=t;
    try{localStorage.setItem(LAST_ACTIVITY_KEY,String(t));}catch(_){}
  }
  async function getTimeoutForUser(userId){
    try{
      const {data,error}=await sessionClient.from('profiles').select('is_admin').eq('id',userId).maybeSingle();
      if(!error&&data?.is_admin===true)return ADMIN_TIMEOUT;
    }catch(_){}
    return USER_TIMEOUT;
  }
  async function expireSession(){
    try{localStorage.removeItem(LAST_ACTIVITY_KEY);}catch(_){}
    try{sessionStorage.removeItem(LAST_ACTIVITY_KEY);}catch(_){}
    try{await sessionClient.auth.signOut({scope:'local'});}catch(_){}
    try{sessionStorage.setItem('abracadeal:session-expired','1');}catch(_){}
    location.replace(location.pathname+location.search);
  }
  async function checkInactivity(){
    if(checking||!sessionClient)return;
    checking=true;
    try{
      const {data}=await sessionClient.auth.getSession();
      const session=data?.session;
      if(!session?.user){
        try{localStorage.removeItem(LAST_ACTIVITY_KEY);}catch(_){}
        return;
      }
      let last=readLastActivity();
      if(!last){markActivity(true);return;}
      const timeout=await getTimeoutForUser(session.user.id);
      if(now()-last>=timeout)await expireSession();
    }catch(error){
      console.warn('Contrôle d’inactivité indisponible',error);
    }finally{
      checking=false;
    }
  }

  function init(){
    if(!window.supabase?.createClient)return;
    sessionClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });

    ['pointerdown','keydown','touchstart','scroll'].forEach(eventName=>{
      window.addEventListener(eventName,()=>markActivity(false),{passive:true});
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')checkInactivity();
    });
    window.addEventListener('pageshow',()=>checkInactivity());

    sessionClient.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'&&session?.user)markActivity(true);
      if(event==='SIGNED_OUT'){
        try{localStorage.removeItem(LAST_ACTIVITY_KEY);}catch(_){}
      }
    });

    checkInactivity();
    setInterval(checkInactivity,CHECK_EVERY);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
