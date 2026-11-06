// 06/11/2026 (Anthony) : jetons « À la une » offerts par Abracadeal — le pro est prévenu à sa prochaine connexion.
// RPC : get_my_boost_gift() / ack_my_boost_gift(). Attend que la fenêtre « confirmation du site » soit fermée.
(function(){
  'use strict';
  var URL_='https://jplzvxmpbpjssyinozap.supabase.co',KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF',STORE='sb-jplzvxmpbpjssyinozap-auth-token';
  var client=null,lastToken='',busy=false,shown=false;
  function cli(){if(client)return client;if(!window.supabase||!window.supabase.createClient)return null;
    client=window.supabase.createClient(URL_,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storageKey:STORE}});return client;}
  function token(){try{var s=JSON.parse(localStorage.getItem(STORE)||'null');return (s&&s.access_token)||'';}catch(_){return '';}}
  function el(tag,css,text){var e=document.createElement(tag);if(css)e.style.cssText=css;if(text!=null)e.textContent=text;return e;}
  function modal(info){
    shown=true;
    var n=Number(info.credits)||0,d=Number(info.days)||7;
    var back=el('div','position:fixed;inset:0;z-index:100000;background:rgba(20,10,40,.55);display:flex;align-items:center;justify-content:center;padding:16px');
    back.setAttribute('role','dialog');back.setAttribute('aria-modal','true');back.setAttribute('aria-labelledby','abcGiftTitle');
    var box=el('div','background:#fff;color:#1d1530;max-width:440px;width:100%;border-radius:16px;padding:22px 20px;box-shadow:0 20px 60px rgba(0,0,0,.3);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center');
    var ico=el('div','width:56px;height:56px;margin:0 auto 10px;border-radius:50%;background:linear-gradient(135deg,#b62fd8,#ff3d9a);display:grid;place-items:center');
    ico.innerHTML='<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>';
    var h=el('h2','margin:0 0 10px;font-size:20px;color:#3b1d7a','Merci de votre confiance !');h.id='abcGiftTitle';
    var p1=el('p','margin:0 0 10px;color:#1d1530!important;font-weight:600','Pour vous remercier, Abracadeal vous offre '+n+' mise'+(n>1?'s':'')+' « À la une » de '+d+' jours.');
    var p2=el('p','margin:0 0 16px;color:#5a4a7a!important;font-size:14px','Dans « Mes annonces », touchez « Booster » sur le véhicule de votre choix : il passe en tête du site pendant '+d+' jours. Les '+d+' jours démarrent seulement quand vous l’utilisez.');
    var ok=el('button','display:block;width:100%;border:0;border-radius:12px;padding:13px;background:#6d3fd6;color:#fff;font-weight:700;font-size:15px;cursor:pointer','J’ai compris');ok.type='button';
    ok.onclick=function(){ok.disabled=true;cli().rpc('ack_my_boost_gift').then(function(){back.remove();}).catch(function(){back.remove();});};
    box.appendChild(ico);box.appendChild(h);box.appendChild(p1);box.appendChild(p2);box.appendChild(ok);
    back.appendChild(box);document.body.appendChild(back);ok.focus();
  }
  function check(){
    if(shown||busy)return;
    if(document.getElementById('abcSiteTitle'))return; // autre fenêtre ouverte : on réessaie plus tard
    var t=token();if(!t)return;
    var c=cli();if(!c)return;
    if(t===lastToken)return;
    busy=true;
    c.rpc('get_my_boost_gift').then(function(r){busy=false;lastToken=t;
      if(!r.error&&r.data&&Number(r.data.credits)>0)modal(r.data);}).catch(function(){busy=false;});
  }
  function start(){setTimeout(check,2500);setInterval(check,15000);window.addEventListener('focus',check);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
