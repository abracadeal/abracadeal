/* Abracadeal — déconnexion automatique après inactivité (06/11/2026).
   30 min pour Particulier / Pro, 15 min pour Admin. L'activité réelle sur le site remet le compteur à zéro.

   Remplace l'ancien contrôle de share-listing-20260922.js, qui utilisait un 2e client Supabase :
   au retour sur la page, les deux clients rafraîchissaient le même jeton en même temps, la déconnexion
   effaçait la session puis le client principal la réécrivait juste après → la page revenait en « Admin ».

   Ici : aucun appel réseau pour décider. Chargé AVANT supabase-js, le contrôle se fait de façon synchrone
   au chargement, au retour d'arrière-plan (phase de capture, avant le rafraîchissement du jeton) et toutes
   les 30 s. Si le délai est dépassé, la session est effacée du stockage avant que l'appli ne la relise. */
(function(){
  if(window.abracaSessionGuard)return;
  var REF='jplzvxmpbpjssyinozap';
  var SUPABASE_URL='https://'+REF+'.supabase.co';
  var SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
  var AUTH_KEY='sb-'+REF+'-auth-token';
  var LAST_KEY='abracadeal:last-auth-activity';
  var TIMEOUT_KEY='abracadeal:auth-timeout-ms';
  var USER_TIMEOUT=30*60*1000;
  var ADMIN_TIMEOUT=15*60*1000;
  var THROTTLE=15*1000;
  var lastWrite=0;
  var expiring=false;

  function ls(){try{return window.localStorage}catch(_){return null}}
  function ss(){try{return window.sessionStorage}catch(_){return null}}
  function get(k){var l=ls();try{return l&&l.getItem(k)}catch(_){return null}}
  function set(k,v){var l=ls();try{l&&l.setItem(k,v)}catch(_){}}
  function del(k){try{ls()&&ls().removeItem(k)}catch(_){}try{ss()&&ss().removeItem(k)}catch(_){}}

  function storedSession(){
    var raw=null;
    try{raw=(ls()&&ls().getItem(AUTH_KEY))||(ss()&&ss().getItem(AUTH_KEY));}catch(_){}
    if(!raw)return null;
    try{var p=JSON.parse(raw);var s=(p&&(p.currentSession||p.session))||p;return s&&s.refresh_token?s:null;}catch(_){return null}
  }
  function timeout(){
    var t=Number(get(TIMEOUT_KEY)||0);
    return t===ADMIN_TIMEOUT||t===USER_TIMEOUT?t:USER_TIMEOUT;
  }
  function mark(force){
    var t=Date.now();
    if(!force&&t-lastWrite<THROTTLE)return;
    lastWrite=t;
    if(storedSession())set(LAST_KEY,String(t));
  }
  // Ferme aussi la session côté serveur si le jeton est encore valable (sans bloquer).
  function revoke(session){
    try{
      if(!session||!session.access_token||!(session.expires_at*1000>Date.now()))return;
      fetch(SUPABASE_URL+'/auth/v1/logout?scope=local',{method:'POST',keepalive:true,
        headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token}}).catch(function(){});
    }catch(_){}
  }
  // true si la session vient d'être effacée pour inactivité.
  function check(){
    var session=storedSession();
    if(!session){del(LAST_KEY);return false;}
    var last=Number(get(LAST_KEY)||0);
    if(!last){set(LAST_KEY,String(Date.now()));return false;}
    if(Date.now()-last<timeout())return false;
    revoke(session);
    del(AUTH_KEY);
    del(LAST_KEY);
    try{ss()&&ss().setItem('abracadeal:session-expired','1')}catch(_){}
    return true;
  }
  function checkAndReload(){
    if(expiring)return;
    if(check()){expiring=true;location.replace(location.pathname+location.search);}
  }

  // Retour d'une connexion Google/Facebook ou d'un lien e-mail : c'est une activité, pas une session dormante.
  try{if(/(access_token|refresh_token|code)=/.test(location.hash+location.search))set(LAST_KEY,String(Date.now()));}catch(_){}

  // 1) Au chargement, avant que supabase-js ne lise la session : rien à recharger, l'appli démarre déconnectée.
  check();

  // 2) Retour d'arrière-plan : phase de capture sur window = avant le rafraîchissement du jeton par supabase-js.
  window.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')checkAndReload();},true);
  window.addEventListener('pageshow',function(e){if(e.persisted)checkAndReload();},true);
  window.addEventListener('focus',checkAndReload,true);
  setInterval(function(){if(document.visibilityState==='visible')checkAndReload();},30*1000);

  ['pointerdown','keydown','touchstart','scroll','wheel'].forEach(function(n){
    window.addEventListener(n,function(){mark(false);},{passive:true});
  });

  window.abracaSessionGuard={
    // Appelé par l'appli quand le profil est chargé (15 min pour l'admin, 30 min sinon).
    setRole:function(isAdmin){set(TIMEOUT_KEY,String(isAdmin?ADMIN_TIMEOUT:USER_TIMEOUT));},
    signedIn:function(){lastWrite=0;set(LAST_KEY,String(Date.now()));},
    signedOut:function(){del(LAST_KEY);},
    check:checkAndReload
  };
})();
