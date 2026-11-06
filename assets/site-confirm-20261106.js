// 06/11/2026 — Reprise des annonces depuis le site du pro activée par Abracadeal sans case cochée à l'inscription :
// à sa prochaine connexion, le pro confirme (ou refuse) que ses annonces soient reprises et tenues à jour.
// RPC : get_my_site_confirmation() / answer_my_site_confirmation(feed_id, accept).
(function(){
  'use strict';
  var URL_='https://jplzvxmpbpjssyinozap.supabase.co',KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF',STORE='sb-jplzvxmpbpjssyinozap-auth-token';
  var client=null,lastToken='',busy=false,shown=false;
  function cli(){
    if(client)return client;
    if(!window.supabase||!window.supabase.createClient)return null;
    client=window.supabase.createClient(URL_,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storageKey:STORE}});
    return client;
  }
  function token(){try{var s=JSON.parse(localStorage.getItem(STORE)||'null');return (s&&s.access_token)||'';}catch(_){return '';}}
  function host(u){try{return new URL(u).hostname.replace(/^www\./,'');}catch(_){return u||'votre site';}}
  function el(tag,css,text){var e=document.createElement(tag);if(css)e.style.cssText=css;if(text!=null)e.textContent=text;return e;}
  function modal(info){
    shown=true;
    var back=el('div','position:fixed;inset:0;z-index:100000;background:rgba(20,10,40,.55);display:flex;align-items:center;justify-content:center;padding:16px');
    back.setAttribute('role','dialog');back.setAttribute('aria-modal','true');back.setAttribute('aria-labelledby','abcSiteTitle');
    var box=el('div','background:#fff;color:#1d1530;max-width:460px;width:100%;border-radius:16px;padding:22px 20px;box-shadow:0 20px 60px rgba(0,0,0,.3);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif');
    var h=el('h2','margin:0 0 10px;font-size:19px;color:#3b1d7a','Vos annonces sont en ligne sur Abracadeal');h.id='abcSiteTitle';
    var n=Number(info.online)||0;
    var p1=el('p','margin:0 0 10px',(n>0?n+' véhicule'+(n>1?'s':'')+' de ':'Les annonces de ')+host(info.url)+' '+(n>1?'ont été repris':'a été repris')+' sur votre page Abracadeal. Elles sont tenues à jour automatiquement (prix, photos, ventes) : vous n’avez rien à saisir.');
    if(n===0)p1.textContent='Les annonces de '+host(info.url)+' sont reprises sur votre page Abracadeal et tenues à jour automatiquement (prix, photos, ventes) : vous n’avez rien à saisir.';
    var p2=el('p','margin:0 0 16px;font-weight:700','Confirmez-vous que nous diffusions les annonces de votre site ?');
    var status=el('p','margin:0 0 10px;min-height:1em;font-size:13px;color:#b42318');status.setAttribute('aria-live','polite');
    var ok=el('button','display:block;width:100%;border:0;border-radius:12px;padding:13px;background:#6d3fd6;color:#fff;font-weight:700;font-size:15px;cursor:pointer;margin-bottom:8px','Oui, je confirme');ok.type='button';
    var no=el('button','display:block;width:100%;border:1px solid #d0c6e6;border-radius:12px;padding:11px;background:#fff;color:#5a4a7a;font-size:14px;cursor:pointer','Non, retirer mes annonces');no.type='button';
    function answer(accept){
      if(!accept&&!confirmNo.dataset.armed){confirmNo.dataset.armed='1';no.textContent='Confirmer le retrait de mes annonces';no.style.borderColor='#b42318';no.style.color='#b42318';status.textContent='Vos annonces reprises depuis votre site seront retirées d’Abracadeal.';return;}
      ok.disabled=no.disabled=true;status.style.color='#5a4a7a';status.textContent='Enregistrement…';
      cli().rpc('answer_my_site_confirmation',{p_feed_id:info.feed_id,p_accept:accept}).then(function(r){
        if(r.error)throw r.error;
        box.innerHTML='';
        box.appendChild(el('h2','margin:0 0 10px;font-size:19px;color:#3b1d7a',accept?'Merci, c’est confirmé !':'C’est noté'));
        box.appendChild(el('p','margin:0 0 16px',accept?'Vos annonces restent en ligne et se mettent à jour toutes seules depuis votre site.':'Vos annonces reprises depuis votre site ont été retirées. Vous pouvez toujours publier vous-même depuis votre espace Pro.'));
        var close=el('button','display:block;width:100%;border:0;border-radius:12px;padding:12px;background:#6d3fd6;color:#fff;font-weight:700;cursor:pointer','Fermer');close.type='button';
        close.onclick=function(){back.remove();if(!accept)location.reload();};
        box.appendChild(close);close.focus();
      }).catch(function(e){ok.disabled=no.disabled=false;status.style.color='#b42318';status.textContent='Une erreur est survenue, réessayez dans un instant.';console.warn('Confirmation du site',e);});
    }
    var confirmNo=no;
    ok.onclick=function(){answer(true);};no.onclick=function(){answer(false);};
    box.appendChild(h);box.appendChild(p1);box.appendChild(p2);box.appendChild(status);box.appendChild(ok);box.appendChild(no);
    back.appendChild(box);document.body.appendChild(back);ok.focus();
  }
  function check(){
    if(shown||busy)return;
    var t=token();if(!t||t===lastToken)return;
    var c=cli();if(!c)return;
    busy=true;lastToken=t;
    c.rpc('get_my_site_confirmation').then(function(r){
      busy=false;
      if(!r.error&&r.data&&r.data.feed_id)modal(r.data);
    }).catch(function(){busy=false;});
  }
  function start(){check();setInterval(check,15000);window.addEventListener('focus',check);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
