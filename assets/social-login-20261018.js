/* Connexion / inscription rapide Google et Facebook (18/10/2026 — Claude).
   - Les boutons n'apparaissent que pour les fournisseurs activés dans Supabase
     (Authentication → Providers). Tant que rien n'est activé, rien ne change sur le site.
   - Réservé aux comptes particuliers : l'inscription pro garde le formulaire complet (SIRET, Stripe).
   - Au premier retour de Google/Facebook, le compte doit être complété : pseudo, téléphone
     (unique par compte, même règle que l'inscription classique) et acceptation des CGU.
   - Pour retirer la fonctionnalité : supprimer la balise <script> de ce fichier dans index.html. */
(function(){
  if(typeof sb==='undefined'||!sb)return;

  const PROVIDERS=[
    {id:'google',label:'Google',icon:'<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'},
    {id:'facebook',label:'Facebook',scopes:'email public_profile',icon:'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/><path fill="#fff" d="M16.7 15.5l.5-3.5h-3.4V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.7 0-4.5 1.6-4.5 4.7V12h-3v3.5h3v8.4a12 12 0 0 0 3.7 0v-8.4h2.9z"/></svg>'}
  ];
  const PENDING_KEY='abraca_social_pending_v1';
  const SOCIAL_PROVIDERS=new Set(PROVIDERS.map(p=>p.id));

  const css=document.createElement('style');
  css.textContent=`
  .social-auth{display:flex;flex-direction:column;gap:10px;margin:4px 0 16px}
  .social-auth.hidden{display:none!important}
  .social-auth-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:46px;border:1px solid #e2d8e8;border-radius:12px;background:#fff;color:#24152d;font:inherit;font-weight:700;cursor:pointer}
  .social-auth-btn:hover{border-color:#b9a3c6;background:#fbf8fd}
  .social-auth-btn[disabled]{opacity:.6;cursor:wait}
  .social-auth-sep{display:flex;align-items:center;gap:10px;color:#8a7a92;font-size:.85rem;margin-top:4px}
  .social-auth-sep::before,.social-auth-sep::after{content:"";flex:1;height:1px;background:#eadfee}
  .social-auth-pro-note{font-size:.8rem;color:#7a6a80;text-align:center}
  .social-complete-dialog{max-width:480px;width:calc(100% - 32px);border:1px solid #eadfee;border-radius:16px;padding:22px;color:#24152d;background:#fff}
  .social-complete-dialog::backdrop{background:rgba(30,12,40,.55)}
  .social-complete-dialog h2{margin:0 0 6px;font-size:1.25rem}
  .social-complete-dialog label{display:block;font-weight:700;margin:12px 0 6px}
  .social-complete-dialog .check{display:flex;gap:10px;font-weight:400;line-height:1.5}
  .social-complete-dialog .check input{flex:none;width:20px;height:20px;margin-top:2px}
  .social-complete-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
  .social-complete-dialog{position:relative}
  .social-complete-close{position:absolute;top:12px;right:14px;width:36px;height:36px;border:0;border-radius:50%;background:#f3eef6;color:#24152d;font-size:22px;line-height:1;cursor:pointer}
  .social-complete-close:hover{background:#e6dcec}
  .social-complete-cancel{min-height:44px;padding:0 16px;border:1px solid #cbbcd6;border-radius:12px;background:#fff;color:#24152d;font:inherit;font-weight:700;cursor:pointer}
  .social-complete-cancel:hover{background:#f7f2fa}
  .social-type{border:0;padding:0;margin:14px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .social-type legend{font-weight:700;margin-bottom:6px;padding:0}
  .social-type-opt{display:flex!important;align-items:center;gap:8px;margin:0!important;padding:11px 12px;border:1px solid #e2d8e8;border-radius:12px;cursor:pointer;font-weight:700}
  .social-type-opt:has(input:checked){border-color:#7b27a0;background:#f6eefa}
  .social-type-opt input{width:18px;height:18px;margin:0}
  .social-pro-fields[hidden]{display:none}
  .social-complete-status{color:#b3261e;font-weight:700;min-height:1.2em;margin-top:10px}`;
  document.head.append(css);

  function buildBlock(mode){
    const box=document.createElement('div');
    box.className='social-auth hidden';
    box.dataset.mode=mode;
    for(const p of PROVIDERS){
      const b=document.createElement('button');
      b.type='button';b.className='social-auth-btn';b.dataset.provider=p.id;
      b.innerHTML=p.icon+'<span>Continuer avec '+p.label+'</span>';
      b.style.display='none';
      b.addEventListener('click',()=>startOAuth(p,mode,b));
      box.append(b);
    }
    const sep=document.createElement('div');
    sep.className='social-auth-sep';
    sep.textContent=mode==='signup'?'ou avec votre e-mail':'ou';
    box.append(sep);
    return box;
  }

  const loginForm=document.getElementById('loginForm');
  const signupForm=document.getElementById('signupForm');
  const blocks=[];
  if(loginForm){const b=buildBlock('login');const intro=loginForm.querySelector('.auth-intro');if(intro)intro.after(b);else loginForm.prepend(b);blocks.push(b);}
  if(signupForm){const b=buildBlock('signup');signupForm.prepend(b);blocks.push(b);}

  // Inscription rapide = comptes particuliers uniquement
  function syncProVisibility(){
    const pro=document.getElementById('signupType')?.value==='professionnel';
    const b=blocks.find(x=>x.dataset.mode==='signup');
    if(b)b.dataset.pro=pro?'1':'';
    refreshVisibility();
  }
  document.getElementById('signupType')?.addEventListener('change',syncProVisibility);

  // 30/10/2026 : un pro arrivé par un mail de prospection (lien ?r=…) ne doit pas créer
  // un compte particulier par « Continuer avec Google » : boutons masqués pour lui.
  function isProspectPro(){try{const r=JSON.parse(localStorage.getItem('abraca_prospect_ref')||'null');return !!(r&&/^[a-z0-9]{8}$/.test(r.code)&&Date.now()-Number(r.at||0)<90*864e5);}catch(_){return false}}
  let enabled=new Set();
  function refreshVisibility(){
    for(const box of blocks){
      let any=false;
      box.querySelectorAll('.social-auth-btn').forEach(btn=>{
        const on=enabled.has(btn.dataset.provider);
        btn.style.display=on?'':'none';
        any=any||on;
      });
      box.classList.toggle('hidden',!any||box.dataset.pro==='1'||isProspectPro());
    }
  }
  fetch(SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:SUPABASE_KEY}})
    .then(r=>r.ok?r.json():null)
    .then(s=>{
      const ext=s?.external||{};
      enabled=new Set(PROVIDERS.filter(p=>ext[p.id]===true).map(p=>p.id));
      syncProVisibility();
    })
    .catch(()=>{});

  async function startOAuth(provider,mode,btn){
    let legal=null;
    if(mode==='signup'&&typeof window.confirmLegalRegistration==='function'){
      legal=await window.confirmLegalRegistration();
      if(!legal)return;
    }
    try{sessionStorage.setItem(PENDING_KEY,JSON.stringify({provider:provider.id,legal,at:Date.now()}));}catch(_){}
    try{localStorage.setItem(PENDING_KEY,JSON.stringify({provider:provider.id,legal,at:Date.now()}));}catch(_){}
    btn.disabled=true;
    const redirectTo=location.origin+'/';
    const {error}=await sb.auth.signInWithOAuth({provider:provider.id,options:{redirectTo,...(provider.scopes?{scopes:provider.scopes}:{})}});
    if(error){
      btn.disabled=false;
      toast('Connexion '+provider.label+' impossible pour le moment.');
      console.error(error);
    }
  }

  function readPending(){
    let raw=null;
    try{raw=sessionStorage.getItem(PENDING_KEY)||localStorage.getItem(PENDING_KEY);}catch(_){}
    try{const p=JSON.parse(raw||'null');if(p&&Date.now()-Number(p.at||0)<3600e3)return p;}catch(_){}
    return null;
  }
  function clearPending(){
    try{sessionStorage.removeItem(PENDING_KEY);}catch(_){}
    try{localStorage.removeItem(PENDING_KEY);}catch(_){}
  }

  function isSocialUser(user){
    const ids=(user?.identities||[]).map(i=>i.provider);
    const prov=user?.app_metadata?.providers||[user?.app_metadata?.provider];
    return [...ids,...prov].some(p=>SOCIAL_PROVIDERS.has(p));
  }
  function suggestedName(user){
    const m=user?.user_metadata||{};
    const full=String(m.display_name||m.full_name||m.name||'').trim();
    if(full)return full.split(/\s+/)[0].slice(0,80);
    return '';
  }

  let dialogOpen=false;
  async function checkCompletion(){
    if(dialogOpen||typeof currentUser==='undefined'||!currentUser)return;
    if(!isSocialUser(currentUser))return;
    if(currentProfile?.is_admin)return;
    const meta=currentUser.user_metadata||{};
    const needPhone=!currentProfile?.phone;
    const needLegal=!meta.legal_terms_accepted_at;
    // 30/10/2026 : le type de compte (Particulier / Professionnel) doit être choisi explicitement.
    const needType=currentProfile?.account_type!=='professionnel'&&!meta.account_type_chosen_at;
    if(!needPhone&&!needLegal&&!needType){clearPending();return;}
    openCompletion({needPhone,needLegal,needType,meta});
  }

  function openCompletion({needPhone,needLegal,needType}){
    dialogOpen=true;
    const pending=readPending();
    const legalDone=!!pending?.legal;
    const d=document.createElement('dialog');
    d.className='social-complete-dialog';
    d.setAttribute('aria-labelledby','social-complete-title');
    d.innerHTML=`<button type="button" class="social-complete-close" data-cancel aria-label="Annuler et se déconnecter">×</button><form>
      <h2 id="social-complete-title">Finalisez votre compte</h2>
      <p class="note" style="margin:0">Il ne manque que quelques informations pour utiliser Abracadeal.</p>
      ${needType?`<fieldset class="social-type"><legend>Vous êtes</legend>
        <label class="social-type-opt"><input type="radio" name="socialType" value="particulier" required><span>Particulier</span></label>
        <label class="social-type-opt"><input type="radio" name="socialType" value="professionnel" required><span>Professionnel</span></label>
      </fieldset>
      <div class="social-pro-fields" hidden>
        <label for="socialSiret">SIRET ou SIREN de l’entreprise</label>
        <input class="input" id="socialSiret" inputmode="numeric" maxlength="20" placeholder="123 456 789 00012" autocomplete="off">
        <div class="note">Obligatoire pour un compte professionnel · contrôlé dans le registre officiel des entreprises.</div>
        <label for="socialSector">Domaine professionnel</label>
        <select class="input" id="socialSector"><option value="">Choisir mon domaine</option><option value="vehicules">Véhicules — Auto & Moto</option><option value="immobilier">Immobilier</option><option value="hightech">High-tech</option><option value="maison">Maison & Déco</option><option value="mode">Mode</option><option value="emploi">Emploi</option><option value="services">Services & Artisans</option></select>
        <label for="socialSiteUrl">Adresse de votre site <span style="font-weight:400;opacity:.75">(facultatif)</span></label>
        <input class="input" id="socialSiteUrl" type="text" inputmode="url" autocomplete="url" autocapitalize="none" spellcheck="false" maxlength="300" placeholder="www.mon-garage.fr">
        <label class="check" style="margin-top:10px"><input type="checkbox" id="socialSiteConsent">J’autorise Abracadeal à reprendre et diffuser automatiquement les annonces publiées sur mon site, et à les tenir à jour (prix, photos, ventes).</label>
      </div>`:''}
      <label for="socialName">Nom public / pseudo</label>
      <input class="input" id="socialName" required maxlength="80" autocomplete="nickname">
      ${needPhone?`<label for="socialPhone" id="socialPhoneLabel">Téléphone</label>
      <input class="input" id="socialPhone" type="tel" autocomplete="tel" placeholder="06 12 34 56 78" maxlength="24" required>
      <div class="note" id="socialPhoneNote">Obligatoire · un numéro ne peut être associé qu’à un seul compte.</div>`:''}
      ${needLegal&&!legalDone?`<p style="margin:14px 0 6px">Consultez les <a href="cgu.html" target="_blank" rel="noopener">CGU</a>, les <a href="cgv.html" target="_blank" rel="noopener">conditions de vente</a> et la <a href="confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>.</p>
      <label class="check"><input type="checkbox" id="socialLegal" required>Je confirme avoir au moins 18 ans et accepter les CGU.</label>
      <p class="note">Cette acceptation ne vaut pas accord pour recevoir de la publicité.</p>`:''}
      <div class="social-complete-status" role="status" aria-live="polite"></div>
      <div class="social-complete-actions">
        <button class="social-complete-cancel" type="button" data-cancel>Annuler et se déconnecter</button>
        <button class="btn primary" type="submit">Valider</button>
      </div></form>`;
    document.body.append(d);
    d.querySelectorAll('input[name=socialType]').forEach(r=>r.addEventListener('change',()=>{
      const pro=d.querySelector('input[name=socialType]:checked')?.value==='professionnel';
      const box=d.querySelector('.social-pro-fields');if(box)box.hidden=!pro;
      const sir=d.querySelector('#socialSiret');if(sir)sir.required=pro;
      const sec=d.querySelector('#socialSector');if(sec)sec.required=pro;
      const t=d.querySelector('#social-complete-title');if(t)t.textContent=pro?'Finalisez votre compte professionnel':'Finalisez votre compte';
      // 30/10/2026 : pour un pro, le téléphone est celui où les acheteurs le joignent depuis ses annonces.
      const pl=d.querySelector('#socialPhoneLabel');if(pl)pl.textContent=pro?'Téléphone de l’entreprise':'Téléphone';
      const pn=d.querySelector('#socialPhoneNote');if(pn)pn.textContent=pro?'Obligatoire · numéro sur lequel les acheteurs vous joignent depuis vos annonces.':'Obligatoire · un numéro ne peut être associé qu’à un seul compte.';
    }));
    const nameInput=d.querySelector('#socialName');
    nameInput.value=(currentProfile?.display_name||'').trim()||suggestedName(currentUser);
    const status=d.querySelector('.social-complete-status');
    const close=()=>{d.remove();dialogOpen=false;};
    // Annuler (bouton, croix ou Échap) : déconnexion complète puis rechargement, pour ne pas retomber sur la fenêtre.
    let cancelling=false;
    async function cancelAndSignOut(){
      if(cancelling)return;cancelling=true;
      clearPending();
      try{await sb.auth.signOut({scope:'local'});}catch(e){console.error(e);}
      try{abracaAuthStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);}catch(_){}
      close();
      location.replace(location.origin+location.pathname);
    }
    d.addEventListener('cancel',e=>{e.preventDefault();cancelAndSignOut();});
    d.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=cancelAndSignOut);
    d.querySelector('form').onsubmit=async e=>{
      e.preventDefault();
      status.textContent='';
      const btn=d.querySelector('[type=submit]');
      const display_name=nameInput.value.trim();
      if(!display_name){status.textContent='Indiquez un nom public.';return;}
      let legal=pending?.legal||null;
      if(needLegal&&!legal){
        if(!d.querySelector('#socialLegal')?.checked){status.textContent='Merci d’accepter les CGU.';return;}
        legal={legal_terms_version:'2026-10-15',legal_terms_accepted_at:new Date().toISOString(),legal_majority_confirmed:true};
      }
      const type=needType?(d.querySelector('input[name=socialType]:checked')?.value||''):(currentProfile?.account_type||'particulier');
      if(!type){status.textContent='Indiquez si vous êtes particulier ou professionnel.';return;}
      const siretRaw=type==='professionnel'&&needType?String(d.querySelector('#socialSiret')?.value||'').replace(/\D/g,''):'';
      const sector=type==='professionnel'&&needType?String(d.querySelector('#socialSector')?.value||''):'';
      if(type==='professionnel'&&needType){
        if(!/^\d{9}$|^\d{14}$/.test(siretRaw)){status.textContent='Indiquez votre SIRET (14 chiffres) ou votre SIREN (9 chiffres).';d.querySelector('#socialSiret')?.focus();return;}
        if(!sector){status.textContent='Choisissez votre domaine professionnel.';d.querySelector('#socialSector')?.focus();return;}
      }
      // 30/10/2026 : comme l'inscription Pro classique, reprise des annonces du site du pro (case à cocher).
      const siteUrl=type==='professionnel'&&needType?String(d.querySelector('#socialSiteUrl')?.value||'').trim():'';
      const siteConsent=!!d.querySelector('#socialSiteConsent')?.checked;
      if(siteUrl&&!/^(https?:\/\/)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/\S*)?$/i.test(siteUrl)){status.textContent='L’adresse du site ne semble pas valide (exemple : www.mon-garage.fr).';d.querySelector('#socialSiteUrl')?.focus();return;}
      if(siteUrl&&/^(https?:\/\/)?([^\/]*\.)?(leboncoin|lacentrale|autoscout24|paruvendu|seloger|bienici|logic-immo|pap|ouestfrance-(?:auto|immo)|largus|vinted|facebook|instagram|tiktok)\./i.test(siteUrl)){status.textContent='Indiquez l’adresse de votre propre site, pas celle d’un site d’annonces ou d’un réseau social.';d.querySelector('#socialSiteUrl')?.focus();return;}
      if(siteUrl&&!siteConsent){status.textContent='Cochez la case d’autorisation pour que nous reprenions les annonces de votre site (ou laissez l’adresse vide).';return;}
      const stock_site=siteUrl&&siteConsent?{url:siteUrl,consent:true,consented_at:new Date().toISOString()}:null;
      btn.disabled=true;btn.textContent='Enregistrement…';
      try{
        const payload={display_name};
        let phoneChecked=null;
        if(needPhone){
          phoneChecked=await abracaPhoneAvailable(d.querySelector('#socialPhone').value.trim(),type);
          if(!phoneChecked.ok)throw new Error(/déjà utilisé/i.test(phoneChecked.message)
            ?'Ce numéro est déjà associé à un autre compte Abracadeal. Annulez, puis connectez-vous avec ce compte (e-mail et mot de passe).'
            :phoneChecked.message);
        }
        let company=null;
        if(type==='professionnel'&&needType){
          status.textContent='Contrôle de l’entreprise dans le registre…';
          const {data,error}=await sb.functions.invoke('verify-professional',{body:{action:'upgrade',siret:siretRaw,pro_sector:sector}});
          let detail=null;if(error){try{detail=await error.context?.json();}catch(_){}}
          if(error||!data?.ok)throw new Error(detail?.error||data?.error||'Le contrôle de l’entreprise n’a pas abouti. Réessayez.');
          company=data.company||null;
          status.textContent='';
        }
        if(needPhone){
          const check=phoneChecked;
          if(!check.ok)throw new Error(/déjà utilisé/i.test(check.message)
            ?'Ce numéro est déjà associé à un autre compte Abracadeal. Annulez, puis connectez-vous avec ce compte (e-mail et mot de passe).'
            :check.message);
          payload.phone=check.normalized;
        }
        const {error:pErr}=await sb.from('profiles').update(payload).eq('id',currentUser.id);
        if(pErr)throw pErr;
        let prospect_ref=null;
        try{const ref=JSON.parse(localStorage.getItem('abraca_prospect_ref')||'null');if(ref&&/^[a-z0-9]{8}$/.test(ref.code)&&Date.now()-Number(ref.at||0)<90*864e5)prospect_ref=ref.code;}catch(_){}
        const {error:uErr}=await sb.auth.updateUser({data:{...(legal&&needLegal?legal:{}),display_name,account_type:type,account_type_chosen_at:new Date().toISOString(),...(type==='professionnel'&&prospect_ref?{prospect_ref}:{}),...(stock_site?{stock_site}:{}),...(payload.phone?{phone:payload.phone}:{}),signup_method:'social'}});
        if(uErr)throw uErr;
        clearPending();
        close();
        await refreshAuth({preserveEditing:false});
        closeModal('accountModal');
        if(type==='professionnel'&&needType){
          toast(company?.company_name?'Compte professionnel créé pour '+company.company_name+'.':'Compte professionnel créé.');
          if(stock_site){try{await sb.rpc('claim_signup_site_import');toast('Merci ! Nous préparons la mise en ligne des annonces de votre site.');}catch(e){console.warn(e);}}
          if(typeof window.ensureProPlanSelection==='function'){try{await window.ensureProPlanSelection({force:true});}catch(e){console.error(e);}}
        }else toast('Compte prêt, bienvenue sur Abracadeal !');
      }catch(err){
        console.error(err);
        status.textContent=err.message||'Enregistrement impossible.';
        btn.disabled=false;btn.textContent='Valider';
      }
    };
    d.showModal();
    (needPhone?d.querySelector('#socialPhone'):nameInput)?.focus();
  }

  // Le profil se charge après l'événement d'auth : on vérifie plusieurs fois au retour de Google/Facebook.
  function scheduleChecks(){[800,2000,4000].forEach(ms=>setTimeout(checkCompletion,ms));}
  sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='INITIAL_SESSION')scheduleChecks();});
  scheduleChecks();
})();
