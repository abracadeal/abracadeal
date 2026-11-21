/* 21/11/2026 (Anthony : « il faut inciter à s'inscrire » → « oui tout »)
   1. Alertes : bandeau « Recevez les nouvelles annonces … par e-mail » au-dessus des résultats dès qu'une recherche ou un filtre
      est actif ; liens /?alerte=1&q=…&cat=…&ville=…&prix=… (pages Google) et /?alertes=1 (mails) ; sans compte → inscription,
      puis retour automatique sur l'alerte pré-remplie (abracaReturnTo, déjà utilisé pour le téléphone).
   2. Favoris : sans compte → inscription (onglet « Créer un compte ») puis le favori est ajouté au retour (/?fav=<id>).
   3. Fiche annonce d'un autre vendeur : petit rappel « Vous aussi, vendez gratuitement ».
   Les mails des alertes partent chaque matin (fonction process-saved-alerts). */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const CATS={vehicules:'Véhicules',immobilier:'Immobilier',vacances:'Vacances',hightech:'High-tech',maison:'Maison',mode:'Mode',emploi:'Emploi',services:'Services',autres:'Autres'};
  const loggedIn=()=>{try{return !!currentUser}catch(_){return false}};
  const ensureUser=async()=>{if(loggedIn())return true;try{return !!(await ensureSessionUser())}catch(_){return false}};
  const escH=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function askSignup(returnUrl,message){
    try{localStorage.setItem('abracaReturnTo',JSON.stringify({u:returnUrl,t:Date.now()}));}catch(_){}
    try{closeModal('detailModal');}catch(_){}
    try{window.setAuthTab('signup');}catch(_){try{window.setAuthTab('login');}catch(__){}}
    try{openModal('accountModal');}catch(_){}
    try{toast(message);}catch(_){}
  }

  function currentSearch(){
    const q=($('#searchQuery')?.value||'').trim();
    let cat='';try{cat=$('#filterCategory')?.value||activeCategory||'';}catch(_){cat=$('#filterCategory')?.value||'';}
    const ville=($('#searchCity')?.value||'').trim();
    const prix=($('#filterPriceMax')?.value||'').trim();
    return {q,cat,ville,prix};
  }
  function describe(s){
    const parts=[s.q?`« ${s.q} »`:(s.cat?CATS[s.cat]||s.cat:'')];
    if(s.ville)parts.push('à '+s.ville);
    if(s.prix)parts.push('jusqu’à '+Number(s.prix).toLocaleString('fr-FR')+' €');
    return parts.filter(Boolean).join(' ');
  }
  function alertUrl(s){
    const p=new URLSearchParams({alerte:'1'});
    if(s.q)p.set('q',s.q);if(s.cat)p.set('cat',s.cat);if(s.ville)p.set('ville',s.ville);if(s.prix)p.set('prix',s.prix);
    return '/?'+p.toString();
  }

  async function openAlertFor(s){
    if(!(await ensureUser())){
      askSignup(location.origin+alertUrl(s),'Créez votre compte gratuit pour recevoir les nouvelles annonces par e-mail (1 clic avec Google)');
      return;
    }
    try{
      if($('#alertKeyword'))$('#alertKeyword').value=s.q||'';
      if($('#alertCategory'))$('#alertCategory').value=CATS[s.cat]?s.cat:'';
      if($('#alertCity'))$('#alertCity').value=s.ville||'';
      if($('#alertPriceMax'))$('#alertPriceMax').value=s.prix||'';
      if($('#alertLabel')&&!$('#alertLabel').value)$('#alertLabel').value=describe(s).replace(/[«»]/g,'').trim().slice(0,60);
    }catch(_){}
    openModal('alertsModal');
    try{loadMyAlerts();}catch(_){}
  }
  window.abracaOpenAlert=()=>openAlertFor(currentSearch());

  /* Bandeau au-dessus des résultats */
  try{document.head.insertAdjacentHTML('beforeend','<style id="abracaAlertBarCss">#abracaAlertBar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 14px;padding:12px 16px;border-radius:14px;background:linear-gradient(90deg,#2b1548,#3c1b64);color:#fff;font-size:14px}#abracaAlertBar b{color:#f7bd4b}#abracaAlertBar button{border:0;border-radius:999px;padding:9px 16px;font-weight:700;background:#ec409d;color:#fff;cursor:pointer;font-size:14px;white-space:nowrap}.abraca-sell-hint{margin-top:14px;padding:12px 14px;border-radius:12px;background:#f4eefa;font-size:13px;line-height:1.45}.abraca-sell-hint a{font-weight:700;color:#702c91}</style>');}catch(_){}
  function updateAlertBar(){
    const grid=$('#adsGrid');if(!grid)return;
    let bar=$('#abracaAlertBar');
    let special=false;try{special=!!(favoritesMode||onlyMine||moderationMode);}catch(_){}
    const s=currentSearch();
    const show=!special&&(s.q||s.cat||s.ville);
    if(!show){if(bar)bar.remove();return;}
    if(!bar){bar=document.createElement('div');bar.id='abracaAlertBar';grid.parentNode.insertBefore(bar,grid);}
    const label=describe(s);
    const html=`<span>Recevez chaque matin les nouvelles annonces <b>${escH(label)}</b> par e-mail.</span><button type="button" onclick="abracaOpenAlert()">Créer une alerte gratuite</button>`;
    if(bar.innerHTML!==html)bar.innerHTML=html;
  }
  try{
    const origRender=renderAds;
    renderAds=function(){const r=origRender.apply(this,arguments);try{updateAlertBar();}catch(_){}return r;};
  }catch(_){}

  setTimeout(()=>{try{updateAlertBar();}catch(_){}},1500);
  /* Favoris sans compte */
  try{
    const origFav=window.toggleFavorite;
    window.toggleFavorite=async(id,event)=>{
      if(event){event.preventDefault();event.stopPropagation();}
      if(!(await ensureUser())){
        askSignup(location.origin+'/?fav='+encodeURIComponent(id),'Créez votre compte gratuit pour garder vos favoris sur tous vos appareils (1 clic avec Google)');
        return;
      }
      return origFav(id);
    };
  }catch(_){}

  /* Fiche d'annonce : rappel « vendez gratuitement » (visiteur ou particulier, annonce d'un autre) */
  try{
    const origOpen=window.openAd;
    if(typeof origOpen==='function'){
      window.openAd=async function(id){
        const r=await origOpen.apply(this,arguments);
        try{
          let isPro=false;try{isPro=currentProfile?.account_type==='professionnel';}catch(_){}
          const aside=document.querySelector('#detailModal .detail-report')?.parentElement||document.querySelector('#detailModal aside');
          if(aside&&!isPro&&!aside.querySelector('.abraca-sell-hint')){
            aside.insertAdjacentHTML('beforeend','<div class="abraca-sell-hint">Vous aussi, vous avez quelque chose à vendre ? <a href="#publishModal" onclick="event.preventDefault();try{closeModal(\'detailModal\')}catch(_){};setTimeout(()=>document.querySelector(\'.publish-trigger\')?.click(),150)">Déposez votre annonce gratuitement</a>, sans commission.</div>');
          }
        }catch(_){}
        return r;
      };
    }
  }catch(_){}

  /* Liens d'arrivée : ?alerte=1…, ?alertes=1, ?fav=<id> */
  function waitAuth(ms){return new Promise(res=>{const t0=Date.now();(function w(){if(loggedIn()||Date.now()-t0>ms)return res(loggedIn());setTimeout(w,250);})();});}
  async function handleLanding(){
    let qs;try{qs=new URLSearchParams(location.search);}catch(_){return;}
    const clean=keys=>{try{const u=new URL(location.href);keys.forEach(k=>u.searchParams.delete(k));history.replaceState(null,'',u.pathname+(u.search||'')+u.hash);}catch(_){}};
    if(qs.get('alerte')==='1'){
      const s={q:(qs.get('q')||'').slice(0,80),cat:(qs.get('cat')||'').toLowerCase(),ville:(qs.get('ville')||'').slice(0,80),prix:(qs.get('prix')||'').replace(/[^0-9]/g,'').slice(0,9)};
      clean(['alerte','q','cat','ville','prix']);
      await waitAuth(4000);
      openAlertFor(s);
    }else if(qs.get('alertes')==='1'){
      clean(['alertes']);
      if(await waitAuth(4000)){openModal('alertsModal');try{loadMyAlerts();}catch(_){}}
      else askSignup(location.origin+'/?alertes=1','Connectez-vous pour gérer vos alertes');
    }else if(qs.get('fav')){
      const id=qs.get('fav');clean(['fav']);
      if(await waitAuth(4000)){
        let has=false;try{has=favoriteIds.has(id);}catch(_){}
        if(!has){try{await window.toggleFavorite(id);}catch(_){}}
        try{window.openAd&&window.openAd(id);}catch(_){}
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(handleLanding,600));else setTimeout(handleLanding,600);
})();
