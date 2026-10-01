
document.addEventListener('click',function(e){
  const link=e.target.closest('[data-vac-legal]');
  if(link){e.preventDefault();const modal=document.getElementById(link.dataset.vacLegal);if(modal){modal.classList.add('open');modal.setAttribute('aria-hidden','false');}}
  const close=e.target.closest('.vac-legal-close');
  if(close){const modal=close.closest('.vac-legal-overlay');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');}
  if(e.target.classList?.contains('vac-legal-overlay')){e.target.classList.remove('open');e.target.setAttribute('aria-hidden','true');}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.vac-legal-overlay.open').forEach(m=>{m.classList.remove('open');m.setAttribute('aria-hidden','true')})});


;


(()=>{
  const root=document;
  const money=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
  const total=root.getElementById('platformTotal');
  const net=root.getElementById('ownerNet');
  const direct=root.getElementById('directPrice');
  const saving=root.getElementById('travelerSaving');
  const gain=root.getElementById('ownerGain');
  const calcMessage=root.getElementById('calcMessage');
  function calc(){
    const t=Math.max(0,Number(total.value)||0);
    const n=Math.max(0,Number(net.value)||0);
    calcMessage.className='calc-message';
    if(!t||!n){calcMessage.textContent='Renseignez les deux montants.';calcMessage.classList.add('error');return false;}
    if(n>t){calcMessage.textContent='Le montant que vous percevez doit être inférieur ou égal au prix payé par le voyageur.';calcMessage.classList.add('error');return false;}
    const d=(t+n)/2;
    direct.textContent=money.format(d);
    saving.textContent=money.format(t-d);
    gain.textContent=money.format(d-n);
    calcMessage.textContent='';
    return true;
  }
  total.addEventListener('input',calc);
  net.addEventListener('input',calc);
  calc();

  const form=root.getElementById('vacationSearch');
  const state=root.getElementById('searchState');
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const dest=root.getElementById('destination').value.trim();
    const arr=root.getElementById('arrival').value;
    const dep=root.getElementById('departure').value;
    const guests=(root.getElementById('guests').selectedIndex+1)||2;
    if(arr&&dep&&dep<=arr){state.textContent='La date de départ doit être postérieure à la date d’arrivée.';state.classList.add('show');return;}
    const q=new URLSearchParams({destination:dest,arrival:arr,departure:dep,guests:String(guests)});
    location.href='recherche-vacances.html?'+q.toString();
  });

  const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
  const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
  const sbVac=window.supabase?supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  const hostSignupCta=root.getElementById('hostSignupCta');
  const travelerSignupCta=root.getElementById('travelerSignupCta');
  const vacLoginCta=root.getElementById('vacLoginCta');
  const authModal=root.getElementById('vacAuthModal');
  const authGuestView=root.getElementById('authGuestView');
  const authConnectedView=root.getElementById('authConnectedView');
  const authConnectedEmail=root.getElementById('authConnectedEmail');
  const authTitle=root.getElementById('vacAuthTitle');
  const authIntro=root.getElementById('vacAuthIntro');
  const authNameWrap=root.getElementById('authNameWrap');
  const authName=root.getElementById('vacAuthName');
  const authPhoneWrap=root.getElementById('authPhoneWrap');
  const authPhone=root.getElementById('vacAuthPhone');
  const authEmail=root.getElementById('vacAuthEmail');
  const authPassword=root.getElementById('vacAuthPassword');
  const authSubmit=root.getElementById('vacAuthSubmit');
  const authMessage=root.getElementById('vacAuthMessage');
  const logoutBtn=root.getElementById('vacLogoutBtn');
  let authMode='login';
  let currentAuthUser=null;
  const vacationPageParams=new URLSearchParams(location.search);
  let vacationPageMode=vacationPageParams.get('mode')==='hote'?'hote':'voyageur';
  let lastVacationHostState={isHost:false,hasHost:false};

  function applyVacationPageMode({isHost=false,hasHost=false}={}){
    lastVacationHostState={isHost:!!isHost,hasHost:!!hasHost};
    document.body.dataset.vacSpace=isHost?'host':(hasHost?'host-pending':'traveler');
    const desktopBecomeHost=root.getElementById('vacDesktopBecomeHost');
    if(desktopBecomeHost){
      desktopBecomeHost.classList.toggle('is-visible',!isHost);
      desktopBecomeHost.href='vacances.html?mode=hote&host_signup=1';
      desktopBecomeHost.textContent='Devenir hôte';
    }
    document.dispatchEvent(new CustomEvent('abraca:vac-space-change',{
      detail:{isHost:!!isHost,hasHost:!!hasHost}
    }));
    const hostMode=vacationPageMode==='hote';
    const travelerMain=root.getElementById('vacTravelerMain');
    const travelerFooter=root.getElementById('vacTravelerFooter');
    const hostShell=root.getElementById('vacHostMode');
    const hostFrame=root.getElementById('vacHostFrame');
    const mobileTop=root.getElementById('vacMobileTop');

    document.body.classList.toggle('vac-host-mode',hostMode);
    travelerMain?.classList.toggle('auth-hidden',hostMode);
    travelerFooter?.classList.toggle('auth-hidden',hostMode);
    mobileTop?.classList.toggle('auth-hidden',hostMode);
    hostShell?.classList.toggle('auth-hidden',!hostMode);

    if(hostMode&&hostFrame){
      const signup=vacationPageParams.get('host_signup')==='1'||(!isHost&&!hasHost);
      const src='espace-hote.html?embedded=1&v=20260921-menu3'+(signup?'&host_signup=1':'');
      if(hostFrame.getAttribute('src')!==src)hostFrame.setAttribute('src',src);
    }

    if(hostSignupCta){
      if(hostMode){
        hostSignupCta.textContent='Mode voyageur';
        hostSignupCta.href='vacances.html';
      }else if(isHost){
        hostSignupCta.textContent='Espace Hôte';
        hostSignupCta.href='vacances.html?mode=hote';
      }else if(hasHost){
        hostSignupCta.textContent='Continuer inscription hôte';
        hostSignupCta.href='vacances.html?mode=hote&host_signup=1';
      }else{
        hostSignupCta.textContent='Devenir hôte';
        hostSignupCta.href='vacances.html?mode=hote&host_signup=1';
      }
    }

    const mobileHostLink=root.getElementById('vacMobileHostLink');
    const mobileHostLabel=root.getElementById('vacMobileHostLabel');
    if(mobileHostLink&&mobileHostLabel){
      if(isHost){
        mobileHostLabel.textContent='Espace Hôte';
        mobileHostLink.href='vacances.html?mode=hote';
      }else if(hasHost){
        mobileHostLabel.textContent='Continuer';
        mobileHostLink.href='vacances.html?mode=hote&host_signup=1';
      }else{
        mobileHostLabel.textContent='Devenir hôte';
        mobileHostLink.href='vacances.html?mode=hote&host_signup=1';
      }
    }
  }

  applyVacationPageMode();
  document.addEventListener('DOMContentLoaded',()=>applyVacationPageMode(lastVacationHostState),{once:true});

  function setAuthMessage(message,type=''){
    authMessage.textContent=message||'';
    authMessage.className='auth-message'+(type?' '+type:'');
  }
  function setAuthMode(mode){
    authMode=mode==='signup'?'signup':'login';
    root.querySelectorAll('[data-auth-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.authMode===authMode));
    authNameWrap.classList.toggle('auth-hidden',authMode!=='signup');
    authPhoneWrap.classList.toggle('auth-hidden',authMode!=='signup');
    authTitle.textContent=authMode==='signup'?'Créer votre compte Abracadeal':'Connexion';
    authIntro.textContent=authMode==='signup'
      ?'Créez votre compte Abracadeal. Le même compte fonctionne pour les annonces, les vacances et, si vous le souhaitez, l’espace hôte.'
      :'Connectez-vous sans quitter Abracadeal Vacances.';
    authSubmit.textContent=authMode==='signup'?'S’inscrire':'Se connecter';
    authPassword.autocomplete=authMode==='signup'?'new-password':'current-password';
    setAuthMessage('');
  }
  function openAuth(mode='login'){
    if(currentAuthUser){
      authGuestView.classList.add('auth-hidden');
      authConnectedView.classList.remove('auth-hidden');
      authConnectedEmail.textContent=currentAuthUser.email||'votre compte Abracadeal';
    }else{
      authConnectedView.classList.add('auth-hidden');
      authGuestView.classList.remove('auth-hidden');
      setAuthMode(mode);
      setTimeout(()=>authEmail.focus(),60);
    }
    authModal.classList.add('show');
    authModal.setAttribute('aria-hidden','false');
    document.body.classList.add('auth-open');
  }
  function closeAuth(){
    authModal.classList.remove('show');
    authModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('auth-open');
    setAuthMessage('');
  }
  root.querySelectorAll('[data-close-auth]').forEach(el=>el.addEventListener('click',closeAuth));
  root.querySelectorAll('[data-auth-mode]').forEach(el=>el.addEventListener('click',()=>setAuthMode(el.dataset.authMode)));
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&authModal.classList.contains('show'))closeAuth()});

  vacLoginCta?.addEventListener('click',e=>{e.preventDefault();openAuth('login')});
  travelerSignupCta?.addEventListener('click',e=>{e.preventDefault();openAuth('signup')});

  function abracaVacNormalizePhone(value=''){
    let compact=String(value||'').trim().replace(/[\s().-]/g,'');
    if(/^00\d+$/.test(compact)) compact='+'+compact.slice(2);
    if(/^0[1-9]\d{8}$/.test(compact)) return '+33'+compact.slice(1);
    if(/^\+33[1-9]\d{8}$/.test(compact)) return compact;
    if(/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
    return null;
  }
  async function abracaVacPhoneAvailable(phone){
    const normalized=abracaVacNormalizePhone(phone);
    if(!normalized) return {ok:false,message:'Indiquez un numéro de téléphone valide.'};
    const {data,error}=await sbVac.rpc('abracadeal_phone_available',{p_phone:normalized});
    if(error) return {ok:false,message:'Impossible de vérifier le numéro pour le moment.'};
    if(!data) return {ok:false,message:'Ce numéro de téléphone est déjà associé à un compte.'};
    return {ok:true,normalized};
  }

  authSubmit?.addEventListener('click',async ()=>{
    if(!sbVac)return;
    const email=authEmail.value.trim();
    const password=authPassword.value;
    if(!email||!password){setAuthMessage('Renseignez votre e-mail et votre mot de passe.','error');return}
    if(password.length<6){setAuthMessage('Le mot de passe doit contenir au moins 6 caractères.','error');return}
    authSubmit.disabled=true;
    try{
      if(authMode==='login'){
        const {error}=await sbVac.auth.signInWithPassword({email,password});
        if(error){setAuthMessage(error.message,'error');return}
        await refreshVacationAuth();
        closeAuth();
        state.textContent='Vous êtes connecté à Abracadeal Vacances.';
        state.classList.add('show');
      }else{
        const displayName=authName.value.trim();
        const phone=authPhone.value.trim();
        if(!displayName){setAuthMessage('Indiquez votre nom ou prénom.','error');return}
        if(!phone){setAuthMessage('Le numéro de téléphone est obligatoire pour créer votre compte.','error');return}
        const phoneCheck=await abracaVacPhoneAvailable(phone);
        if(!phoneCheck.ok){setAuthMessage(phoneCheck.message,'error');return}
        const normalizedPhone=phoneCheck.normalized;
        const {data,error}=await sbVac.auth.signUp({
          email,
          password,
          options:{data:{
            display_name:displayName,
            phone:normalizedPhone,
            account_type:'particulier'
          }}
        });
        if(error){setAuthMessage(error.message,'error');return}
        if(data?.session){
          const parts=displayName.split(/\s+/).filter(Boolean);
          const firstName=parts.shift()||displayName;
          const lastName=parts.join(' ')||null;
          await sbVac.from('vacation_user_details').upsert({
            user_id:data.user.id,
            first_name:firstName,
            last_name:lastName,
            phone:normalizedPhone,
            country:'France',
            updated_at:new Date().toISOString()
          },{onConflict:'user_id'});
          await refreshVacationAuth();
          closeAuth();
          state.textContent='Votre compte Abracadeal est créé.';
          state.classList.add('show');
        }else{
          setAuthMessage('Compte Abracadeal créé. Vérifiez votre e-mail pour confirmer votre inscription.','ok');
        }
      }
    }finally{
      authSubmit.disabled=false;
    }
  });

  logoutBtn?.addEventListener('click',async ()=>{
    if(!sbVac)return;
    await sbVac.auth.signOut({scope:'local'});
    closeAuth();
    await refreshVacationAuth();
  });

  async function refreshVacationAuth(){
    if(!sbVac)return;
    const {data}=await sbVac.auth.getSession();
    const user=data?.session?.user||null;
    currentAuthUser=user;
    if(vacLoginCta){
      const rawName=String(user?.user_metadata?.display_name||user?.email||'').trim();
      const shortName=rawName ? rawName.split(/\s+|@/)[0] : '';
      vacLoginCta.textContent=user ? (shortName||'Compte') : 'Connexion';
    }
    travelerSignupCta?.classList.toggle('auth-hidden',!!user);
    if(!user){
      applyVacationPageMode({isHost:false,hasHost:false});
      return;
    }

    // If a traveler account was created with phone metadata, make sure it is persisted.
    const metadataPhone=user.user_metadata?.phone||'';
    if(metadataPhone){
      const {data:identity}=await sbVac.from('vacation_user_details').select('user_id,phone').eq('user_id',user.id).maybeSingle();
      if(!identity?.phone){
        const displayName=String(user.user_metadata?.display_name||'').trim();
        const parts=displayName.split(/\s+/).filter(Boolean);
        const firstName=parts.shift()||displayName||null;
        const lastName=parts.join(' ')||null;
        await sbVac.from('vacation_user_details').upsert({
          user_id:user.id,
          first_name:firstName,
          last_name:lastName,
          phone:metadataPhone,
          country:'France',
          updated_at:new Date().toISOString()
        },{onConflict:'user_id'});
      }
    }

    const {data:hostProfile}=await sbVac
      .from('vacation_hosts')
      .select('user_id,status,onboarding_completed')
      .eq('user_id',user.id)
      .maybeSingle();
    const isHost=!!hostProfile && hostProfile.status==='active' && hostProfile.onboarding_completed===true;
    applyVacationPageMode({isHost,hasHost:!!hostProfile});

    const adminLink=root.getElementById('vacAdminLink');
    if(adminLink){
      const {data:profile}=await sbVac.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
      adminLink.style.display=profile?.is_admin?'inline-flex':'none';
    }
  }

  if(sbVac){
    refreshVacationAuth();
    sbVac.auth.onAuthStateChange(()=>{setTimeout(refreshVacationAuth,0)});
  }

})();


;


(function(){
  function setActive(action){
    document.querySelectorAll('.vac-mobile-nav-item').forEach(function(el){
      el.classList.toggle('is-active',el.getAttribute('data-vac-mobile-action')===action);
    });
  }
  document.addEventListener('click',function(e){
    const btn=e.target.closest('[data-vac-mobile-action]');
    if(!btn)return;
    const action=btn.getAttribute('data-vac-mobile-action');
    if(action==='explore'){
      e.preventDefault();
      setActive('explore');
      const target=document.getElementById('vacMobileTop')||document.getElementById('vacationSearch');
      target?.scrollIntoView({behavior:'smooth',block:'start'});
      
    }
    if(action==='account'){
      e.preventDefault();
      setActive('account');
      document.getElementById('vacLoginCta')?.click();
    }
  });
})();


;


(function(){
  const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
  const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function money(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))}
  function cardHtml(x,sb,featuredIds){
    const url=x.photo_path?(String(x.photo_path).startsWith('http')?x.photo_path:sb.storage.from('listing-images').getPublicUrl(x.photo_path).data.publicUrl):null;
    const rating=x.host_rating?('⭐ '+String(x.host_rating).replace('.',',')+' · '+x.host_review_count+' avis'):'Nouvel hôte';
    const photo=url?'<img src="'+url+'" alt="" loading="lazy">':'<span class="vac-listing-photo-empty" aria-hidden="true">🏡</span>';
    const badge=featuredIds&&featuredIds.has(x.id)?'<span class="vac-listing-featured-badge">À LA UNE</span>':'';
    return '<a class="vac-listing-card" href="logement-vacances.html?id='+encodeURIComponent(x.id)+'">'
      +'<span class="vac-listing-photo">'+photo+badge+'</span>'
      +'<span class="vac-listing-body">'
        +'<strong class="vac-listing-title">'+esc(x.title)+'</strong>'
        +'<span class="vac-listing-meta">'+esc(x.city||'France')+' · '+(x.max_guests||1)+' voyageur(s)'+(x.bedrooms?' · '+x.bedrooms+' ch.':'')+'</span>'
        +'<span class="vac-listing-price">'+money(x.nightly_price)+' <small>/ nuit</small></span>'
        +'<span class="vac-listing-host">'+esc(x.host_name||'Hôte Abracadeal')+' · '+rating+'</span>'
      +'</span>'
    +'</a>';
  }
  function emptyHtml(){
    return '<div class="vac-listing-empty">'
      +'<strong>Aucun logement publié pour le moment.</strong>'
      +'<p>Les premiers hôtes arrivent bientôt — 500 logements gratuits pendant 12 mois pour le lancement.</p>'
      +'<a class="btn primary" href="vacances.html?mode=hote&host_signup=1">Devenir hôte</a>'
    +'</div>';
  }
  async function loadHomeListings(){
    const grid=document.getElementById('vacHomeListingsGrid');
    const subtitle=document.getElementById('vacHomeListingsSubtitle');
    if(!grid||!window.supabase)return;
    try{
      const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      const {data,error}=await sb.rpc('search_vacation_listings',{p_destination:null,p_starts_on:null,p_ends_on:null,p_guests:null});
      if(error)throw error;
      const items=(data||[]).slice(0,6);
      if(!items.length){
        grid.innerHTML=emptyHtml();
        grid.classList.add('is-empty');
        if(subtitle)subtitle.textContent='Soyez parmi les premiers hôtes publiés sur Abracadeal Vacances.';
        return;
      }
      grid.classList.remove('is-empty');
      let featuredIds=new Set();
      try{
        const {data:featuredRows}=await sb.from('listings').select('id,featured_until').in('id',items.map(x=>x.id));
        const now=Date.now();
        featuredIds=new Set((featuredRows||[]).filter(r=>r.featured_until&&new Date(r.featured_until).getTime()>now).map(r=>r.id));
      }catch(e){}
      grid.innerHTML=items.map(x=>cardHtml(x,sb,featuredIds)).join('');
      if(subtitle)subtitle.textContent=items.length+' hébergement(s) publié(s) en direct par nos hôtes.';
    }catch(err){
      grid.innerHTML=emptyHtml();
      grid.classList.add('is-empty');
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',loadHomeListings);
  }else{
    loadHomeListings();
  }
})();


;


(function(){
  function initVacDateSheet(){
    const arrival=document.getElementById('arrival');
    const departure=document.getElementById('departure');
    const trigger=document.getElementById('vacDateTrigger');
    const tile=document.querySelector('.vac-dates-tile');
    const sheet=document.getElementById('vacDateSheet');
    const sheetArrival=document.getElementById('vacSheetArrival');
    const sheetDeparture=document.getElementById('vacSheetDeparture');
    const confirm=document.getElementById('vacDateConfirm');
    const error=document.getElementById('vacDateError');
    if(!arrival||!departure||!trigger||!sheet||!sheetArrival||!sheetDeparture||!confirm)return;

    const isoToday=()=>{
      const d=new Date();
      const y=d.getFullYear();
      const m=String(d.getMonth()+1).padStart(2,'0');
      const day=String(d.getDate()).padStart(2,'0');
      return y+'-'+m+'-'+day;
    };
    const addOneDay=value=>{
      if(!value)return isoToday();
      const d=new Date(value+'T12:00:00');
      d.setDate(d.getDate()+1);
      const y=d.getFullYear();
      const m=String(d.getMonth()+1).padStart(2,'0');
      const day=String(d.getDate()).padStart(2,'0');
      return y+'-'+m+'-'+day;
    };
    const fmt=value=>{
      if(!value)return '';
      const d=new Date(value+'T12:00:00');
      return Number.isNaN(d.getTime())?'':d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
    };
    function refresh(){
      const a=fmt(arrival.value),d=fmt(departure.value);
      trigger.textContent=a&&d ? a+' → '+d : a ? a+' → Départ' : 'Ajouter des dates';
    }
    function openSheet(){
      const today=isoToday();
      sheetArrival.min=today;
      sheetArrival.value=arrival.value||'';
      sheetDeparture.value=departure.value||'';
      sheetDeparture.min=sheetArrival.value?addOneDay(sheetArrival.value):today;
      error.textContent='';
      sheet.classList.add('show');
      sheet.setAttribute('aria-hidden','false');
      document.body.classList.add('vac-date-open');
    }
    function closeSheet(){
      sheet.classList.remove('show');
      sheet.setAttribute('aria-hidden','true');
      document.body.classList.remove('vac-date-open');
    }

    trigger.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      openSheet();
    });
    tile?.addEventListener('click',function(e){
      if(e.target.closest('button,input,select'))return;
      openSheet();
    });
    document.querySelectorAll('[data-close-vac-date]').forEach(btn=>btn.addEventListener('click',closeSheet));

    sheetArrival.addEventListener('change',function(){
      sheetDeparture.min=sheetArrival.value?addOneDay(sheetArrival.value):isoToday();
      if(sheetDeparture.value && sheetDeparture.value<=sheetArrival.value){
        sheetDeparture.value='';
      }
      error.textContent='';
    });
    sheetDeparture.addEventListener('change',function(){error.textContent=''});

    confirm.addEventListener('click',function(){
      if(!sheetArrival.value){
        error.textContent='Choisissez une date d’arrivée.';
        return;
      }
      if(!sheetDeparture.value){
        error.textContent='Choisissez une date de départ.';
        return;
      }
      if(sheetDeparture.value<=sheetArrival.value){
        error.textContent='Le départ doit être après l’arrivée.';
        return;
      }
      arrival.value=sheetArrival.value;
      departure.value=sheetDeparture.value;
      refresh();
      closeSheet();
    });

    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&sheet.classList.contains('show'))closeSheet();
    });
    refresh();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initVacDateSheet,{once:true});
  }else{
    initVacDateSheet();
  }
})();


;


(function(){
  const form=document.getElementById('vacationSearch');
  if(!form)return;
  form.addEventListener('focusin',function(e){
    if(e.target.matches('input,textarea')) document.body.classList.add('vac-keyboard-open');
  });
  form.addEventListener('focusout',function(e){
    if(e.target.matches('input,textarea')){
      setTimeout(function(){
        if(!form.contains(document.activeElement) || !document.activeElement.matches('input,textarea')){
          document.body.classList.remove('vac-keyboard-open');
        }
      },120);
    }
  });
})();
