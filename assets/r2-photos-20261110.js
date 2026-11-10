/* 10/11/2026 (nuit) — Photos des annonces : Cloudflare R2 devient le stockage principal (quota Supabase).
   Les originaux publics (listing-images) et les miniatures (listing-thumbs) sont copiés dans R2 par la fonction r2-sync,
   puis retirés de Supabase une fois la copie vérifiée. Ce script, chargé juste après supabase-js, fait pointer
   getPublicUrl() de ces deux buckets vers R2 sur toutes les pages qui l'incluent.
   Filet : une photo toute récente (pas encore copiée, moins de 2 min) est rechargée depuis Supabase si R2 répond en erreur. */
(function(){
  var R2='https://pub-9747954003f04922a082752db15aeeed.r2.dev/';
  var SB='https://jplzvxmpbpjssyinozap.supabase.co/storage/v1/object/public/';
  var BUCKETS={'listing-images':1,'listing-thumbs':1};
  window.ABRACA_R2_BASE=R2;
  if(typeof window.abracaR2Fallback!=='function'){
    window.abracaR2Fallback=function(u){u=String(u||'');return u.indexOf(R2)===0?SB+u.slice(R2.length):'';};
  }
  function patch(client){
    try{
      if(!client||!client.storage||client.storage.__abracaR2)return client;
      var from=client.storage.from.bind(client.storage);
      client.storage.from=function(bucket){
        var api=from(bucket);
        if(BUCKETS[bucket]&&api&&typeof api.getPublicUrl==='function'){
          var orig=api.getPublicUrl.bind(api);
          api.getPublicUrl=function(path,opts){
            var r=orig(path,opts);
            if(!opts&&r&&r.data&&r.data.publicUrl&&path)r.data.publicUrl=R2+bucket+'/'+encodeURI(String(path));
            return r;
          };
        }
        return api;
      };
      client.storage.__abracaR2=true;
    }catch(e){}
    return client;
  }
  window.abracaPatchR2=patch;
  if(window.supabase&&typeof window.supabase.createClient==='function'&&!window.supabase.__abracaR2){
    var create=window.supabase.createClient;
    window.supabase.createClient=function(){return patch(create.apply(this,arguments));};
    window.supabase.__abracaR2=true;
  }
  document.addEventListener('error',function(e){
    var t=e.target;
    if(!t||t.tagName!=='IMG'||t.getAttribute('data-r2fb'))return;
    var s=t.getAttribute('src')||'';
    if(s.indexOf(R2)===0){t.setAttribute('data-r2fb','1');t.src=SB+s.slice(R2.length);}
  },true);
})();
