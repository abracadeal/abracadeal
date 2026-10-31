// 31/10/2026 (Claude, demande d'Anthony) : pages admin — ne plus demander de se reconnecter alors qu'on est connecté sur le site.
// Cause : après un long moment (surtout sur mobile), le jeton de connexion a expiré ; la page admin le vérifiait sans le renouveler
// correctement, ou échouait sur un petit souci réseau, et affichait « Connectez-vous ».
// Ce fichier, chargé juste après supabase-js, fait que chaque page admin :
//  - lit la connexion au même endroit que le site (même clé, localStorage puis sessionStorage) ;
//  - renouvelle le jeton s'il est expiré ou presque, puis réessaie ;
//  - ne déclare « non connecté » que s'il n'y a vraiment pas de session (pas sur une simple erreur réseau).
(function(){
  if(!window.supabase||window.supabase.__abracaAdminAuth)return;
  const KEY='sb-jplzvxmpbpjssyinozap-auth-token';
  const storage={
    getItem(k){try{const v=localStorage.getItem(k);if(v)return v}catch(_){}try{return sessionStorage.getItem(k)}catch(_){return null}},
    setItem(k,v){try{localStorage.setItem(k,v)}catch(_){}try{sessionStorage.setItem(k,v)}catch(_){}},
    removeItem(k){try{localStorage.removeItem(k)}catch(_){}try{sessionStorage.removeItem(k)}catch(_){}}
  };
  const orig=window.supabase.createClient;
  window.supabase.createClient=function(url,key,opts){
    opts=opts||{};
    opts.auth=Object.assign({persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage,storageKey:KEY},opts.auth||{});
    const sb=orig.call(this,url,key,opts);
    const a=sb.auth,getSession=a.getSession.bind(a),getUser=a.getUser.bind(a);
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    a.getSession=async function(){
      let r=await getSession();
      if(!r?.data?.session){await wait(400);r=await getSession();}
      const s=r?.data?.session;
      if(s&&(s.expires_at||0)*1000-Date.now()<60000){
        try{const x=await a.refreshSession();if(x?.data?.session)return {data:{session:x.data.session},error:null};}catch(_){}
      }
      return r;
    };
    a.getUser=async function(jwt){
      if(jwt)return getUser(jwt);
      const s=(await a.getSession())?.data?.session;
      if(!s)return {data:{user:null},error:null};
      let r=await getUser();
      if(r?.data?.user)return r;
      try{await a.refreshSession();}catch(_){}
      r=await getUser();
      if(r?.data?.user)return r;
      // Erreur réseau / passagère : la session locale reste valable, la base vérifiera de toute façon les droits.
      const st=r?.error?.status;
      if(!st||st>=500)return {data:{user:s.user},error:null};
      return r;
    };
    return sb;
  };
  window.supabase.__abracaAdminAuth=true;
})();
