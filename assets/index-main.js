
const recoveryArrival = new URLSearchParams(location.hash.slice(1));
const recoveryArrivalError = recoveryArrival.has('error') || recoveryArrival.has('error_code');
const recoveryArrivalExpected = recoveryArrival.get('type') === 'recovery';
const SUPABASE_URL = 'https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const SUPABASE_AUTH_STORAGE_KEY='sb-jplzvxmpbpjssyinozap-auth-token';
const abracaAuthStorage={
  getItem(key){
    try{
      const local=window.localStorage.getItem(key);
      if(local)return local;
    }catch(_){}
    try{return window.sessionStorage.getItem(key)}catch(_){return null}
  },
  setItem(key,value){
    try{window.localStorage.setItem(key,value)}catch(_){}
    try{window.sessionStorage.setItem(key,value)}catch(_){}
  },
  removeItem(key){
    try{window.localStorage.removeItem(key)}catch(_){}
    try{window.sessionStorage.removeItem(key)}catch(_){}
  }
};
const sb = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true,
        storage:abracaAuthStorage,
        storageKey:SUPABASE_AUTH_STORAGE_KEY
      }
    })
  : null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let professionalSignupViewerId=null;
let currentUser=null, currentProfile=null, allAds=[], selectedPhotos=[], editingId=null, existingPhotoPaths=[], pendingNoPhotoConfirm=false, editOriginalPhotos=[], editPhotosLoading=false;
let editingOriginalOwnerId=null, editingOriginalStatus=null, editingOriginalSellerType=null, editingOriginalPhotoLimit=null;
let selectedPublishPack='free', selectedPublishOffers=new Set(), publishStep=1, publishPhotoLimit=3, proPaidPhotoAllowance=false, proPhotoAllowanceUser=null, proPlanPhotoLimit=null;
let publishCommerceOffers=[], publishOffersUser=null, publishOffersLoading=false;
let promoSelectedPack=null, promoPreselectedListingId=null;
let proBoostWalletState={7:0,30:0}, boostCreditListingId=null;
const PROMOTION_PACKS={};
const detailAdsCache=new Map();
let moderationMode=false, favoritesMode=false;
let favoriteIds=new Set();
let activeCategory='', activeVehicleSubcategory='', onlyMine=false;
let messageConversations=[], currentConversationId=null, messagePollTimer=null, lastUnreadMessageCount=null;
let currentDetailMap=null;

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}

async function loadFounderOfferCounter(){
  const counters=[...document.querySelectorAll('[data-founder-counter]')];
  if(!counters.length||!sb)return;
  try{
    const {data,error}=await sb.rpc('get_founder_offer_counter');
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    const total=Math.max(1,Number(row?.total_places||500));
    const claimed=Math.max(0,Number(row?.claimed_places||0));
    const remaining=Math.max(0,Number(row?.remaining_places??(total-claimed)));
    const text=remaining>0
      ?`${remaining.toLocaleString('fr-FR')} place${remaining>1?'s':''} Fondateur${remaining>1?'s':''} restante${remaining>1?'s':''} sur ${total.toLocaleString('fr-FR')}`
      :`Les ${total.toLocaleString('fr-FR')} places Fondateurs sont attribuées`;
    counters.forEach(el=>{
      el.dataset.state='ready';
      const label=el.querySelector('span:last-child');
      if(label)label.textContent=text;
    });
    const pct=Math.min(100,Math.max(0,(claimed/total)*100));
    // Lancement : tant que peu de pros sont inscrits, on masque la barre et le nombre d'inscrits (évite l'effet « site vide »)
    const fewClaimed=claimed<25;
    document.querySelectorAll('[data-founder-progress]').forEach(el=>{el.style.width=pct+'%';if(el.parentElement)el.parentElement.style.display=fewClaimed?'none':'';});
    document.querySelectorAll('[data-founder-progress-note]').forEach(el=>{
      if(fewClaimed){el.textContent='Places réparties par région : premiers inscrits, premiers servis.';return;}
      el.textContent=`${claimed.toLocaleString('fr-FR')} professionnel${claimed>1?'s':''} vérifié${claimed>1?'s':''} inscrit${claimed>1?'s':''} · ${remaining.toLocaleString('fr-FR')} place${remaining>1?'s':''} restante${remaining>1?'s':''}.`;
    });
  }catch(err){
    console.warn('Compteur Fondateurs indisponible',err);
    counters.forEach(el=>{
      el.dataset.state='fallback';
      const label=el.querySelector('span:last-child');
      if(label)label.textContent='500 places Fondateurs au lancement';
    });
  }
}

function openModal(id){
  const el=document.getElementById(id);
  if(!el) return;
  if(id==='accountModal'){
    professionalSignupViewerId=null;
    $('#loggedOutAccount').classList.toggle('hidden',!!currentUser);
    $('#loggedInAccount').classList.toggle('hidden',!currentUser);
    setProfileEditing(false);
    renderCompanyAccount();
    syncSignupCompany();
    if(currentProfile?.is_admin){
      const panel=document.getElementById('adminStatsPanel');
      panel?.classList.remove('hidden');
      setTimeout(()=>window.loadAdminDashboardStats?.(),0);
      const dbHost=document.getElementById('adminDbResults');
      const dbStatus=document.getElementById('adminDbStatus');
      if(dbHost)dbHost.innerHTML='';
      if(dbStatus)dbStatus.textContent='Saisissez un nom, un téléphone, un e-mail ou un numéro d’annonce pour lancer une recherche.';
    }
    if(currentProfile?.account_type==='professionnel'){
      setTimeout(()=>loadProBoostWallet().catch(error=>console.warn('Boost wallet',error)),0);
    }
  }
  if(location.hash==='#'+id){
    history.replaceState(null,'',location.pathname+location.search);
  }
  el.classList.add('open');
  el.setAttribute('aria-hidden','false');
  const modalBody=el.querySelector('.modal-body');
  if(modalBody) modalBody.scrollTop=0;
  document.body.style.overflow='hidden';
}
function closeModal(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  if(location.hash==='#'+id){
    history.replaceState(null,'',location.pathname+location.search);
  }
  if(id==='accountModal'){
    professionalSignupViewerId=null;
    const loginPassword=document.getElementById('loginPassword');
    const signupPassword=document.getElementById('signupPassword');
    if(loginPassword)loginPassword.value='';
    if(signupPassword)signupPassword.value='';
  }
  if(id==='messagesModal'){
    stopMessagePolling();
    document.querySelector('.messages-shell')?.classList.remove('mobile-chat-open');
    document.getElementById('messageInput')?.blur();
  }
}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function money(v){return v===null||v===''?'Prix non renseigné':Number(v).toLocaleString('fr-FR')+' €'}
function cataloguePrice(a){const base=money(a?.price);return a?.category==='vacances'&&a?.price!==null&&a?.price!==''?base+' / nuit':base}
function catLabel(v){return ({vehicules:'Véhicules',immobilier:'Immobilier',vacances:'Vacances',hightech:'High-tech',maison:'Maison',mode:'Mode',emploi:'Emploi',services:'Services',autres:'Autres'})[v]||v}
// Fix 21/09/2026 : image de fallback Abracadeal pour les annonces sans photo (demande interne).
// Purement visuel cote frontend : ne touche jamais listing_photos, ni les limites/packs de photos.
const privatePhotoUrls=new Map();
async function hydratePrivatePhotos(rows){
 await Promise.all(rows.flatMap(a=>a.listing_photos||[]).filter(p=>p.storage_bucket==='listing-images-pending').map(async p=>{
 const {data}=await sb.storage.from('listing-images-pending').createSignedUrl(p.storage_path,600);
 privatePhotoUrls.set(p.storage_path,data?.signedUrl||'');
 }));
}
const ABRACA_DEFAULT_LISTING_PHOTO = 'assets/default-listing-photo-20260921.jpg';
function photoUrl(path){
  if(!path) return '';
  if(privatePhotoUrls.has(path))return privatePhotoUrls.get(path);
  if(/^https?:\/\//i.test(String(path))) return String(path);
  if(!sb) return '';
  const {data}=sb.storage.from('listing-images').getPublicUrl(path);
  return data?.publicUrl||'';
}
// 18/10/2026 : miniatures des vignettes (bucket public « listing-thumbs », générées côté serveur par
// generate-listing-thumbs). Si la miniature n'existe pas encore, l'image d'origine est chargée à la place.
function thumbUrl(path){
  if(!path||privatePhotoUrls.has(path)||/^https?:\/\//i.test(String(path))||!sb) return photoUrl(path);
  const {data}=sb.storage.from('listing-thumbs').getPublicUrl(path);
  return data?.publicUrl||photoUrl(path);
}
function thumbImgAttrs(path){
  const full=photoUrl(path), t=thumbUrl(path);
  return t===full?`src="${esc(full)}"`:`src="${esc(t)}" data-full="${esc(full)}" onerror="this.onerror=null;this.src=this.dataset.full"`;
}
function normalizeType(v){return String(v||'').toLowerCase().startsWith('pro')?'professionnel':'particulier'}

function setModerationButtonLabel(label='Modérer'){
  const btn=$('#moderationBtn');
  if(!btn) return;
  btn.innerHTML=`<span class="header-moderation-label">${esc(label)}</span>`;
}

async function refreshModerationCount(){
  const btn=$('#moderationBtn');
  // Fix 22/09/2026 : #moderationBtn est masque en desktop (voir commentaire CSS plus haut),
  // donc alimente aussi #accountModerationBtn (raccourci "Moderer" de la modale Mon compte),
  // seul acces reel a la moderation sur cette largeur - retour utilisateur
  // ("ya pas de compteurs disponible sur desktop").
  const accountBtn=$('#accountModerationBtn');
  if(!btn && !accountBtn) return 0;
  if(!sb || !currentProfile?.is_admin){
    [btn,accountBtn].forEach(el=>{if(el){el.removeAttribute('data-count');el.removeAttribute('aria-label');}});
    return 0;
  }
  // Pilotage par exception : seules les annonces encore pending, ou auto-publiées pas encore
  // revérifiées par un admin, demandent réellement une action admin.
  const {count,error}=await sb.from('listings').select('id',{count:'exact',head:true}).eq('status','pending');
  if(error){console.error('Compteur modération indisponible',error);return null;}
  // Fix 21/09/2026 : le compteur (bouton "Modérer" + badge "Admin" du menu mobile, cf.
  // syncAdminBadges()) ne comptait que les pending, alors que la file de modération inclut
  // aussi, depuis ce même jour, les annonces auto-publiées en attente d'une deuxième
  // vérification manuelle (voir loadAds()) - demande interne : "mettre un compteur pour le
  // nombre a moderer" doit refléter le vrai total affiché dans la file.
  let autoActiveCount=0;
  const {data:autoRows,error:autoError}=await sb.from('listing_moderation').select('listing_id').eq('auto_published',true).or('admin_reviewed.is.null,admin_reviewed.eq.false');
  if(autoError){console.error('Compteur modération (auto-publiées) indisponible',autoError);}
  else{
    const autoIds=(autoRows||[]).map(r=>r.listing_id);
    if(autoIds.length){
      const {count:autoCount,error:autoCountError}=await sb.from('listings').select('id',{count:'exact',head:true}).in('id',autoIds).eq('status','active');
      if(autoCountError)console.error('Compteur modération (auto-publiées actives) indisponible',autoCountError);
      autoActiveCount=Number(autoCount||0);
    }
  }
  const n=Number(count||0)+autoActiveCount;
  [btn,accountBtn].forEach(el=>{
    if(!el)return;
    if(n>0)el.dataset.count=String(n);else el.removeAttribute('data-count');
    el.setAttribute('aria-label',n>0?`${n} annonce${n>1?'s':''} à modérer`:'Aucune annonce à modérer');
  });
  return n;
}

function clearAuthPasswords(){
  const loginPassword=document.getElementById('loginPassword');
  const signupPassword=document.getElementById('signupPassword');
  if(loginPassword)loginPassword.value='';
  if(signupPassword)signupPassword.value='';
}

window.setAuthTab = function(which,{clearPasswords=true}={}){
  const signup = which === 'signup';
  if(clearPasswords) clearAuthPasswords();
  const el = signup ? document.getElementById('authSignupMode') : document.getElementById('authLoginMode');
  if(el) el.checked = true;
  syncSignupCompany();
  const body=document.querySelector('#accountModal .modal-body');
  if(body) requestAnimationFrame(()=>body.scrollTo({top:0,left:0,behavior:'auto'}));
};

async function syncVacancesAccountMenu(){
  const modeLink=document.getElementById('vacancesModeLink');
  const hostLink=document.getElementById('vacancesHostLink');
  if(!modeLink||!hostLink)return;

  // État par défaut : visiteur / compte non-hôte.
  modeLink.textContent='Locations de vacances';
  modeLink.href='vacances.html';
  hostLink.textContent='Devenir hôte';
  hostLink.href='vacances.html?mode=hote&host_signup=1';

  if(!sb||!currentUser)return;

  try{
    const {data,error}=await sb
      .from('vacation_hosts')
      .select('status,onboarding_completed')
      .eq('user_id',currentUser.id)
      .maybeSingle();

    if(error){
      console.warn('Statut hôte indisponible',error);
      return;
    }

    const isHost=!!data && data.onboarding_completed===true;
    if(!isHost)return;

    // Un hôte garde l'accès à la recherche de séjours, mais on le présente comme un mode voyageur.
    modeLink.textContent='Mode voyageur';
    modeLink.href='vacances.html';
    hostLink.textContent='Espace Hôte';
    hostLink.href='vacances.html?mode=hote';
    }catch(error){
    console.warn('Menu Vacances non synchronisé',error);
  }
}

async function applyAuthSession(session,{preserveEditing=true}={}){
  currentUser=session?.user||null;
  currentProfile=null;

  if(currentUser){
    const {data,error}=await sb.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
    if(error)console.warn('Profil non chargé',error);
    currentProfile=data||null;
    if(!currentProfile?.is_admin)moderationMode=false;
  }else{
    moderationMode=false;
  }

  try{updateAuthUI(preserveEditing);}
  catch(error){console.error('Interface compte indisponible',error);}
  syncVacancesAccountMenu();
  return !!currentUser;
}

function readStoredAuthSession(){
  try{
    const raw=abracaAuthStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    const session=parsed?.currentSession||parsed?.session||parsed;
    return session?.access_token&&session?.refresh_token?session:null;
  }catch(_){
    return null;
  }
}

function isAuthRejection(error){
  if(!error)return false;
  const code=String(error.code||''),name=String(error.name||''),status=Number(error.status||0);
  if(name==='AuthRetryableFetchError'||status===0||status>=500)return false;
  return ['refresh_token_not_found','refresh_token_already_used','session_not_found','session_expired','invalid_grant','user_not_found'].includes(code)||status===400||status===401||status===403;
}
// Avant d'afficher « Connectez-vous » : si une session est enregistrée (appli restée en arrière-plan), on la relit d'abord.
async function ensureSessionUser(){
  if(currentUser)return true;
  if(!sb||!readStoredAuthSession())return false;
  try{await refreshAuth();}catch(_){}
  return !!currentUser;
}
let hiddenSince=0;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){hiddenSince=Date.now();return;}
  if(!sb||!hiddenSince||Date.now()-hiddenSince<60000)return;
  hiddenSince=0;
  if(!readStoredAuthSession())return;
  setTimeout(async()=>{
    try{
      const{data}=await sb.auth.getSession();
      const exp=data?.session?.expires_at||0;
      if(data?.session&&exp*1000-Date.now()<120000)await sb.auth.refreshSession();
      if(!currentUser||!data?.session)await refreshAuth();
    }catch(error){console.warn('Reprise de session au retour',error);}
  },300);
});
async function refreshAuth({preserveEditing=true}={}){
  if(!sb){
    currentUser=null;
    currentProfile=null;
    try{updateAuthUI();}catch(error){console.error('Interface compte indisponible',error);}
    return false;
  }

  let session=null;
  let sessionError=null;
  try{
    const result=await sb.auth.getSession();
    session=result.data?.session||null;
    sessionError=result.error||null;
  }catch(error){
    sessionError=error;
  }

  if(!session){
    const stored=readStoredAuthSession();
    if(stored){
      try{
        const restored=await sb.auth.setSession({
          access_token:stored.access_token,
          refresh_token:stored.refresh_token
        });
        if(!restored.error)session=restored.data?.session||null;
        else sessionError=restored.error;
      }catch(error){
        sessionError=error;
      }
    }
  }

  if(sessionError&&!session)console.warn('Session Supabase indisponible',sessionError);
  // Retour d'arrière-plan (mobile) : le réseau n'est pas encore prêt, le rafraîchissement du jeton échoue.
  // Tant que la session est encore enregistrée et que l'erreur n'est pas un refus du serveur, on garde le compte affiché.
  if(!session&&currentUser&&readStoredAuthSession()&&!isAuthRejection(sessionError)){
    clearTimeout(refreshAuth.retry);refreshAuth.retry=setTimeout(()=>refreshAuth().catch(()=>{}),4000);
    return true;
  }
  await applyAuthSession(session,{preserveEditing});
  claimSignupSiteImport(session);
  return !!session;
}
// Case « reprise de mes annonces depuis mon site » cochée à l'inscription : la demande est créée à la
// première connexion (le compte peut attendre la confirmation de l'e-mail). Une fois par session.
let siteImportClaimed=false;
function claimSignupSiteImport(session){
  try{
    const site=session?.user?.user_metadata?.stock_site;
    if(siteImportClaimed||!sb||!site?.consent)return;
    siteImportClaimed=true;
    sb.rpc('claim_signup_site_import').then(({error})=>{if(error)console.warn('Demande d’import du site',error);});
  }catch(error){console.warn('Demande d’import du site',error);}
}
// Données déclaratives : ne jamais utiliser user_metadata pour accorder un statut vérifié.
function syncCompanyFields(prefix){
  const digits=$('#'+prefix+'Siret').value.replace(/\s/g,'');
  $('#'+prefix+'Siren').value=/^\d{9,14}$/.test(digits)?digits.slice(0,9):'';
  const needsVat=$('#'+prefix+'VatStatus').value==='yes';
  $('#'+prefix+'VatRow').classList.toggle('hidden',!needsVat);
  $('#'+prefix+'Vat').disabled=!needsVat;
  $('#'+prefix+'Vat').required=needsVat;
}
function syncSignupCompany(){
  const pro=$('#signupType').value==='professionnel';
  $('#signupCompanyFields').classList.toggle('hidden',!pro);
  $('#signupCompanyFields').disabled=!pro;
  const founderPanel=$('#signupFounderOffer');
  if(founderPanel) founderPanel.classList.toggle('hidden',!pro);
  syncCompanyFields('signup');
}
async function requestCompanyCheck(action,siret){
  if(!sb) throw new Error('Service indisponible. Recharge la page.');
  if(!/^\d{14}$/.test(siret)) throw new Error('Le SIRET doit contenir exactement 14 chiffres.');
  const {data,error}=await sb.functions.invoke('verify-professional',{body:{action,siret}});
  if(error){
    let detail=null;
    try{detail=await error.context?.json();}catch(_){}
    throw new Error(detail?.error||detail?.message||'Impossible de joindre la vérification des entreprises. Réessayez.');
  }
  if(!data?.ok||data.company?.siret!==siret||(action==='verify'&&!data.verified)) throw new Error(data?.error||'La vérification du SIRET n’a pas été confirmée.');
  return data.company;
}
for(const prefix of ['signup']){
  $('#'+prefix+'LookupBtn')?.addEventListener('click',async()=>{
    const btn=$('#'+prefix+'LookupBtn'),status=$('#'+prefix+'LookupStatus');
    const siret=$('#'+prefix+'Siret').value.replace(/\s/g,'');
    btn.disabled=true;status.textContent='Recherche dans le registre…';
    try{
      const company=await requestCompanyCheck('lookup',siret);
      if($('#'+prefix+'Siret').value.replace(/\s/g,'')!==siret){status.textContent='SIRET modifié : relancez la recherche.';return;}
      $('#'+prefix+'Company').value=company.company_name;
      syncCompanyFields(prefix);
      status.textContent='Établissement trouvé : '+company.company_name+(company.company_city?' · '+company.company_city:'');
      if(prefix==='signup') saveSignupDraft();
    }catch(error){status.textContent=error.message;}finally{btn.disabled=false;}
  });
  $('#'+prefix+'Siret')?.addEventListener('input',()=>{const el=$('#'+prefix+'LookupStatus');if(el)el.textContent='';});
}

function readCompanyFields(prefix){
  const company_name=$('#'+prefix+'Company').value.trim();
  const siret=$('#'+prefix+'Siret').value.replace(/\s/g,'');
  const vat_status=$('#'+prefix+'VatStatus').value;
  const vat_number=vat_status==='yes'?$('#'+prefix+'Vat').value.replace(/\s/g,'').toUpperCase():'';
  if(!company_name) throw new Error('Renseigne la raison sociale.');
  if(!/^\d{14}$/.test(siret)) throw new Error('Le SIRET doit contenir 14 chiffres.');
  if(!['yes','no','pending'].includes(vat_status)) throw new Error('Choisissez votre situation TVA.');
  if(vat_status==='yes'&&!/^FR[A-Z0-9]{2}\d{9}$/.test(vat_number)) throw new Error('Le numéro de TVA français doit commencer par FR, suivi de 2 caractères et de 9 chiffres.');
  if(vat_status==='yes'&&vat_number.slice(4)!==siret.slice(0,9)) throw new Error('Le SIREN du numéro de TVA ne correspond pas au SIRET.');
  return {company_name,siret,siren:siret.slice(0,9),vat_status,vat_number,country:'FR'};
}
function renderCompanyAccount(){
  const pro=currentProfile?.account_type==='professionnel';
  $('#companyAccountSection').classList.toggle('hidden',!pro);
  $('#proBoostWallet')?.classList.toggle('hidden',!pro);
  $('#companyForm').classList.add('hidden');
  $('#editCompanyBtn').classList.remove('hidden');
  const data=currentUser?.user_metadata?.company_registration||{};
  const labels={yes:'Numéro de TVA renseigné',no:'Sans numéro de TVA / franchise en base',pending:'En cours d’attribution'};
  const rows=[['Raison sociale',data.company_name],['SIRET',data.siret],['SIREN',data.siren],['Situation TVA',labels[data.vat_status]],...(data.vat_number?[['Numéro de TVA',data.vat_number]]:[])];
  $('#companySummary').innerHTML=rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'À compléter')}</dd></div>`).join('');
  setTimeout(()=>window.loadProBillingPanel?.(),0);
  if(pro)setTimeout(()=>loadProShowroomData(false),0);

}
$('#signupType').addEventListener('change',syncSignupCompany);
for(const prefix of ['signup']){
  $('#'+prefix+'Siret')?.addEventListener('input',()=>syncCompanyFields(prefix));
  $('#'+prefix+'VatStatus')?.addEventListener('change',()=>syncCompanyFields(prefix));
}
document.getElementById('editCompanyBtn')?.addEventListener('click',async()=>{
  document.getElementById('companyForm')?.classList.remove('hidden');
  document.getElementById('editCompanyBtn')?.classList.add('hidden');
  const status=document.getElementById('companySaveStatus');if(status)status.textContent='Chargement de votre showroom…';
  await loadProShowroomData(true);
  if(status)status.textContent='';
  document.getElementById('accountCompanyDescription')?.focus();
});
document.getElementById('cancelCompanyBtn')?.addEventListener('click',()=>{renderCompanyAccount();document.getElementById('editCompanyBtn')?.focus()});
document.getElementById('companyForm')?.addEventListener('submit',saveProShowroom);
document.getElementById('saveCompanyShowroomBtn')?.addEventListener('click',e=>{
  const btn=e.currentTarget;
  if(btn.dataset.mode==='saved'){
    e.preventDefault();
    btn.dataset.mode='editing';
    btn.textContent='Enregistrer les modifications';
    const status=document.getElementById('companySaveStatus');if(status)status.textContent='';
    document.getElementById('accountCompanyDescription')?.focus();
  }
});
syncSignupCompany();

function setProfileEditing(editing){
  $('#profileForm').classList.toggle('hidden',!editing);
  $('#accountDashboard').classList.toggle('hidden',editing);
  if(editing) $('#profileName').focus();
}
function renderProfileSummary(){
  const rows=currentProfile?.is_admin
    ?[['Nom public',currentProfile?.display_name],['E-mail du compte',currentUser?.email]]
    :[['Nom public',currentProfile?.display_name],['Ville',currentProfile?.city],['Téléphone',currentProfile?.phone],['E-mail du compte',currentUser?.email]];
  $('#profileSummary').innerHTML=rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'À compléter')}</dd></div>`).join('');
}
let displayedAccountId=null;
let b2bServerAdminUserId=null;
function syncB2bEntryVisibility(){
  const isProfessional=!!currentUser && (currentProfile?.account_type==='professionnel'||currentProfile?.is_admin===true||b2bServerAdminUserId===currentUser.id);
  for(const id of ['b2bNavBtn','b2bAccountBtn','desktopProProBtn']) document.getElementById(id)?.classList.toggle('hidden',!isProfessional);
}
function syncHomeMarketingVisibility(){
  const proExperience=!!currentUser && (currentProfile?.account_type==='professionnel'||currentProfile?.is_admin===true||b2bServerAdminUserId===currentUser.id);
  const particularExperience=!!currentUser && currentProfile?.account_type==='particulier';
  // Les comptes connectés n'ont pas besoin des gros blocs d'acquisition.
  // En particulier, on masque entièrement Pro/Pro pour supprimer aussi son encadrement vide.
  $('#b2bDiscovery')?.classList.toggle('hidden',proExperience||particularExperience);
  $('#vacancesDiscovery')?.classList.toggle('hidden',proExperience);
  $('#pros')?.classList.toggle('hidden',!!currentUser);
  // 19/10/2026 : bandeau Fondateurs aussi sur mobile pour les visiteurs non connectés.
  $('#founderTopbar')?.classList.toggle('show-mobile',!currentUser);
}
function updateAuthUI(preserveEditing=false){
  const keep=preserveEditing && currentUser && displayedAccountId===currentUser.id;
  const drafts=keep?['profileForm','companyForm'].filter(id=>!$('#'+id).classList.contains('hidden')).map(id=>({id,values:Array.from($('#'+id).querySelectorAll('input,select')).map(el=>[el.id,el.value])})):[];
  displayedAccountId=currentUser?.id||null;
  $('#signupBtn').classList.toggle('hidden',!!currentUser);
  syncB2bEntryVisibility();
  syncHomeMarketingVisibility();
  setProfileEditing(false);
  renderProfileSummary();
  renderCompanyAccount();
  const isAdminAccount=!!currentUser&&currentProfile?.is_admin===true;
  const isProOrAdminAccount=!!currentUser&&(currentProfile?.account_type==='professionnel'||isAdminAccount||b2bServerAdminUserId===currentUser.id);
  document.getElementById('desktopProProBtn')?.classList.toggle('hidden',!isProOrAdminAccount);
  document.querySelectorAll('.admin-account-shortcut').forEach(btn=>btn.classList.toggle('hidden',!isAdminAccount));
  const profileCityRow=document.getElementById('profileCity')?.closest('.form-row');
  const profilePhoneRow=document.getElementById('profilePhone')?.closest('.form-row');
  profileCityRow?.classList.toggle('hidden',isAdminAccount);
  profilePhoneRow?.classList.toggle('hidden',isAdminAccount);
  document.getElementById('profileCompleteNote')?.classList.toggle('hidden',isAdminAccount);
  if($('#profileCity')) $('#profileCity').required=!isAdminAccount;
  if($('#profilePhone')) $('#profilePhone').required=!isAdminAccount;
  if(currentUser){
    $('#accountBtnLabel').textContent=(currentProfile?.display_name||currentUser?.email||'Compte').split(/\s+|@/)[0]||'Compte';
    if($('#headerLogoutBtn')) $('#headerLogoutBtn').classList.remove('hidden');
    $('#loggedOutAccount').classList.add('hidden'); $('#loggedInAccount').classList.remove('hidden');
    $('#accountUserBox').innerHTML=`<strong>${esc(currentProfile?.display_name||currentUser.email)}</strong>
      <div class="small">${esc(currentUser.email||'')}</div>
      <span class="status-pill">${currentProfile?.is_admin?'Compte administrateur':(currentProfile?.account_type==='professionnel'?'Compte professionnel':'Compte particulier')}</span>`;
    if($('#profileName')) $('#profileName').value=currentProfile?.display_name||'';
    if($('#profileCity')) $('#profileCity').value=currentProfile?.city||'';
    if($('#profilePhone')) $('#profilePhone').value=currentProfile?.phone||'';
    if($('#moderationBtn')) $('#moderationBtn').classList.toggle('hidden',!currentProfile?.is_admin);
    if($('#flowErrorsBtn')) $('#flowErrorsBtn').classList.toggle('hidden',!currentProfile?.is_admin);
    if(currentProfile?.is_admin){
      setTimeout(refreshModerationCount,0);
      setTimeout(refreshFlowErrorsCount,0);
      document.getElementById('adminStatsPanel')?.classList.remove('hidden');
      setTimeout(()=>window.loadAdminDashboardStats?.(),0);
    }else{
      document.getElementById('adminStatsPanel')?.classList.add('hidden');
    }
    if($('#headerMessagesBtn')) $('#headerMessagesBtn').classList.remove('hidden');
    const isProAccount=currentProfile?.account_type==='professionnel';
    if($('#proImportBtn')) $('#proImportBtn').classList.toggle('hidden',!isProAccount);
    if($('#headerStockBtn')) $('#headerStockBtn').classList.toggle('hidden',!isProAccount);
    if($('#proSectionImportBtn')) $('#proSectionImportBtn').classList.toggle('hidden',!isProAccount);
    if($('#proAccountBtn')) $('#proAccountBtn').classList.toggle('hidden',isProAccount);
    if($('#profileEmail')) $('#profileEmail').value=currentUser.email||'';
    setTimeout(refreshUnreadMessages,0);
    if(isProAccount)setTimeout(()=>loadProBoostWallet().catch(error=>console.warn('Boost wallet',error)),0);
    if(isProAccount)setTimeout(()=>{refreshProPhotoAllowance().catch(e=>console.warn('Limite photos pack',e));loadProMonthlyAllowance().catch(e=>console.warn('Quota mensuel Pro',e));},0);
    else{proBoostWalletState={7:0,30:0};renderProBoostWallet();}
  }else{
    proBoostWalletState={7:0,30:0};renderProBoostWallet();
    $('#accountBtnLabel').textContent='Connexion';
    if($('#headerLogoutBtn')) $('#headerLogoutBtn').classList.add('hidden');
    if($('#moderationBtn')) { $('#moderationBtn').classList.add('hidden'); $('#moderationBtn').removeAttribute('data-count'); }
    if($('#flowErrorsBtn')) $('#flowErrorsBtn').classList.add('hidden');
    document.getElementById('adminStatsPanel')?.classList.add('hidden');
    if($('#flowErrorsBadge')) $('#flowErrorsBadge').classList.add('hidden');
    if($('#headerMessagesBtn')) $('#headerMessagesBtn').classList.add('hidden');
    if($('#headerMessagesUnread')) $('#headerMessagesUnread').classList.add('hidden');
    if($('#accountUnreadBadge')) $('#accountUnreadBadge').classList.add('hidden');
    lastUnreadMessageCount=null;
    if($('#proImportBtn')) $('#proImportBtn').classList.add('hidden');
    if($('#headerStockBtn')) $('#headerStockBtn').classList.add('hidden');
    if($('#proSectionImportBtn')) $('#proSectionImportBtn').classList.add('hidden');
    if($('#proAccountBtn')) $('#proAccountBtn').classList.remove('hidden');
    syncHomeMarketingVisibility();
    $('#loggedOutAccount').classList.remove('hidden'); $('#loggedInAccount').classList.add('hidden');
  }
  if(professionalSignupViewerId&&professionalSignupViewerId===currentUser?.id){$('#loggedOutAccount').classList.remove('hidden');$('#loggedInAccount').classList.add('hidden');}
  else if(professionalSignupViewerId)professionalSignupViewerId=null;
  syncHomeMarketingVisibility();
  window.dispatchEvent(new Event('abracadeal:auth'));
  for(const draft of drafts){
    for(const [id,value] of draft.values) $('#'+id).value=value;
    if(draft.id==='profileForm'){
      $('#profileForm').classList.remove('hidden');$('#accountDashboard').classList.add('hidden');
    }else{
      $('#companyForm').classList.remove('hidden');$('#editCompanyBtn').classList.add('hidden');syncCompanyFields('account');
    }
  }
}

function abracaNormalizePhone(value=''){
  const raw=String(value||'').trim();
  let compact=raw.replace(/[\s().-]/g,'');
  if(/^00\d+$/.test(compact)) compact='+'+compact.slice(2);
  if(/^0[1-9]\d{8}$/.test(compact)) return '+33'+compact.slice(1);
  if(/^\+33[1-9]\d{8}$/.test(compact)) return compact;
  if(/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}
async function abracaPhoneAvailable(phone,accountType='particulier'){
  const normalized=abracaNormalizePhone(phone);
  const type=['particulier','professionnel'].includes(accountType)?accountType:'particulier';
  if(!normalized) return {ok:false,normalized:null,message:'Indiquez un numéro de téléphone valide.'};
  const {data,error}=await sb.rpc('abracadeal_phone_available',{p_phone:normalized,p_account_type:type});
  if(error) return {ok:false,normalized,message:'Impossible de vérifier le numéro pour le moment.'};
  if(!data) return {ok:false,normalized,message:'Ce numéro est déjà utilisé pour un compte '+(type==='professionnel'?'professionnel':'particulier')+'.'};
  return {ok:true,normalized,message:''};
}

// Brouillon limité à cet onglet. Aucun mot de passe enregistré.
const signupDraftKey='abracadeal.signupDraft.v1';
const signupDraftIds=['signupName','signupEmail','signupPhone','signupType','signupCompany','signupSector','signupSiret','signupVatStatus','signupVat','signupSiteUrl'];
function saveSignupDraft(){
  try{sessionStorage.setItem(signupDraftKey,JSON.stringify(Object.fromEntries(signupDraftIds.map(id=>[id,$('#'+id).value]))));}catch(_){}
}
function clearSignupDraft(){try{sessionStorage.removeItem(signupDraftKey)}catch(_){}}
try{
  const draft=JSON.parse(sessionStorage.getItem(signupDraftKey)||'null');
  if(draft){for(const id of signupDraftIds) if(typeof draft[id]==='string') $('#'+id).value=draft[id];syncSignupCompany();$('#authSignupMode').checked=true;}
}catch(_){}
$('#signupForm').addEventListener('input',saveSignupDraft);
$('#signupForm').addEventListener('change',saveSignupDraft);

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!sb){ toast('Connexion au service indisponible. Recharge la page.'); return; }
  const btn=e.submitter||e.currentTarget.querySelector('button[type="submit"]');
  if(btn) btn.classList.add('loading');
  const email=$('#loginEmail').value.trim();
  const password=$('#loginPassword').value;
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(btn) btn.classList.remove('loading');
  if(error){
    const msg=(error.code==='invalid_credentials'||/invalid login credentials/i.test(error.message||''))
      ? 'E-mail ou mot de passe incorrect.'
      : (error.message||'Connexion impossible.');
    toast(msg);
    return;
  }
  await refreshAuth({preserveEditing:false});
  if(!currentUser){
    toast('Connexion reçue mais session non chargée. Recharge la page.');
    return;
  }
  closeModal('accountModal');
  toast(currentProfile?.is_admin?'Connexion administrateur réussie':'Connexion réussie');
});
$('#signupForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!sb){
    const status=$('#signupStatus');
    if(status) status.textContent='Le service de compte ne s’est pas chargé. Recharge la page.';
    toast('Service de compte indisponible');
    return;
  }
  const btn=e.submitter;
  const status=$('#signupStatus');
  status.textContent='';
  btn.classList.add('loading');
  btn.textContent='Création...';
  btn.disabled=true;
  const name=$('#signupName').value.trim(), type=$('#signupType').value;
  const proSector=type==='professionnel'?String($('#signupSector')?.value||'').trim():'';
  const rawPhone=$('#signupPhone').value.trim();
  try{
    if(type==='professionnel'&&!proSector){status.textContent='Choisis ton domaine professionnel.';return;}
    // 28/10/2026 : adresse du site du pro + autorisation de reprise automatique des annonces (facultatif).
    const siteUrl=type==='professionnel'?String($('#signupSiteUrl')?.value||'').trim():'';
    const siteConsent=!!$('#signupSiteConsent')?.checked;
    if(siteUrl&&!/^(https?:\/\/)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/\S*)?$/i.test(siteUrl)){status.textContent='L’adresse du site ne semble pas valide (exemple : www.mon-garage.fr).';$('#signupSiteUrl').focus();return;}
    if(siteUrl&&/^(https?:\/\/)?([^\/]*\.)?(leboncoin|lacentrale|autoscout24|paruvendu|seloger|bienici|logic-immo|pap|ouestfrance-(?:auto|immo)|largus|vinted|facebook|instagram|tiktok)\./i.test(siteUrl)){status.textContent='Les sites d’annonces (leboncoin, La Centrale, SeLoger…) et les réseaux sociaux ne fonctionnent pas : indique l’adresse de ton propre site, ou laisse ce champ vide et, après l’inscription, depuis ton espace Pro : branche le flux ou l’API de ton logiciel, importe un fichier (CSV ou Excel) ou saisis tes annonces.';$('#signupSiteUrl').focus();return;}
    if(siteUrl&&!siteConsent){status.textContent='Coche la case d’autorisation pour que nous puissions reprendre les annonces de ton site (ou laisse l’adresse vide).';$('#signupSiteConsent').focus();return;}
    const stock_site=siteUrl&&siteConsent?{url:siteUrl,consent:true,consented_at:new Date().toISOString()}:null;
    const phoneCheck=await abracaPhoneAvailable(rawPhone,type);
    if(!phoneCheck.ok){
      status.textContent=phoneCheck.message;
      toast(phoneCheck.message);
      return;
    }
    const phone=phoneCheck.normalized;
    const company_registration=type==='professionnel'?readCompanyFields('signup'):null;
    if(company_registration){
      status.textContent='Contrôle du SIRET dans le registre…';
      const company=await requestCompanyCheck('lookup',company_registration.siret);
      Object.assign(company_registration,company);
      $('#signupCompany').value=company.company_name;
    }
    const legalAcceptance=await window.confirmLegalRegistration();
    if(!legalAcceptance)return;
    // Prospect arrivé par le lien personnel d'un mail de prospection (pro-fondateur.html?r=…), gardé 90 jours
    let prospect_ref=null;
    try{const ref=JSON.parse(localStorage.getItem('abraca_prospect_ref')||'null');if(ref&&/^[a-z0-9]{8}$/.test(ref.code)&&Date.now()-Number(ref.at||0)<90*864e5)prospect_ref=ref.code;}catch(_){}
    const {data,error}=await sb.auth.signUp({
      email:$('#signupEmail').value.trim(),
      password:$('#signupPassword').value,
      options:{emailRedirectTo:'https://abracadeal.fr/',data:{...legalAcceptance,display_name:name,account_type:type,phone,pro_sector:proSector||null,...(company_registration?{company_registration}:{}),...(prospect_ref?{prospect_ref}:{}),...(stock_site?{stock_site}:{})}}
    });
    if(error) throw error;
    clearSignupDraft();
    $('#signupPassword').value='';
    if(data.session){
      status.textContent='Compte créé et connecté.';
      await refreshAuth();
      if(stock_site)toast('Merci ! Nous préparons la mise en ligne des annonces de votre site.');
      if(company_registration){
        try{await requestCompanyCheck('verify',company_registration.siret);}
        catch(verificationError){
          toast('Compte créé. SIRET à finaliser dans Mon compte : '+verificationError.message);
          $('#companyForm').classList.remove('hidden');$('#editCompanyBtn').classList.add('hidden');
          $('#companySaveStatus').textContent=verificationError.message;
          return;
        }
      }
      if(type==='professionnel' && typeof window.ensureProPlanSelection==='function'){
        await window.ensureProPlanSelection({force:true});
      }else{
        setTimeout(()=>closeModal('accountModal'),500);
      }
      toast('Compte créé');
    }else{
      const createdEmail=$('#signupEmail').value.trim();
      status.textContent='';
      $('#loginEmail').value=createdEmail;
      $('#loginPassword').value='';
      window.setAuthTab('login');
      toast('Compte créé. Vérifiez votre e-mail puis connectez-vous.');
      setTimeout(()=>$('#loginPassword')?.focus({preventScroll:true}),80);
    }
  }catch(err){
    console.error(err);
    status.textContent=err.message||'Impossible de créer le compte.';
    toast(err.message||'Impossible de créer le compte');
  }finally{
    btn.classList.remove('loading');
    btn.textContent='Créer mon compte';
    btn.disabled=false;
  }
});
async function signOutUser(closeAccountModal=false){
  if(!sb) return;
  const {error}=await sb.auth.signOut({scope:'local'});
  if(error){toast(error.message);return;}
  currentUser=null;
  currentProfile=null;
  onlyMine=false;
  moderationMode=false;
  favoritesMode=false;
  favoriteIds=new Set();
  clearAuthPasswords();
  syncVacancesAccountMenu();
  const loginForm=document.getElementById('loginForm');
  if(loginForm)loginForm.reset();
  window.setAuthTab('login',{clearPasswords:false});
  if(closeAccountModal) closeModal('accountModal');
  try{updateAuthUI(false);}catch(uiError){console.error('Interface après déconnexion',uiError);}
  try{await loadAds();}catch(loadError){console.error('Catalogue après déconnexion',loadError);}
  toast('Déconnecté');
}
$('#logoutBtn').addEventListener('click',()=>signOutUser(true));
$('#headerLogoutBtn')?.addEventListener('click',()=>signOutUser(false));

$('#profileForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentUser) return;
  const isAdminAccount=currentProfile?.is_admin===true;
  const payload={display_name:$('#profileName').value.trim()};
  if(!payload.display_name){toast('Indique un nom public');return;}
  if(!isAdminAccount){
    payload.city=$('#profileCity').value.trim();
    payload.phone=$('#profilePhone').value.trim();
    if(!payload.city||!payload.phone){
      toast('Complète le nom, la ville et le téléphone');
      return;
    }
    const normalizedPhone=abracaNormalizePhone(payload.phone);
    if(!normalizedPhone){toast('Indique un numéro de téléphone valide');return;}
    payload.phone=normalizedPhone;
  }
  const btn=e.submitter;
  if(btn){btn.disabled=true;btn.textContent='Enregistrement...'}
  const {error}=await sb.from('profiles').update(payload).eq('id',currentUser.id);
  if(btn){btn.disabled=false;btn.textContent='Enregistrer mon profil'}
  if(error){toast(error.message);return}
  await refreshAuth({preserveEditing:false});
  setProfileEditing(false);
  toast('Profil enregistré');
});


$('#accountBtn').addEventListener('click',e=>{e.preventDefault();if(!currentUser) window.setAuthTab('login');openModal('accountModal')});
$('#signupBtn').addEventListener('click',e=>{e.preventDefault();window.setAuthTab('signup');openModal('accountModal')});
$('#editProfileBtn').addEventListener('click',()=>setProfileEditing(true));
$('#cancelProfileBtn').addEventListener('click',()=>{updateAuthUI();$('#editProfileBtn').focus()});
$('#accountAdsBtn').addEventListener('click',()=>{closeModal('accountModal');openMyAds();});
$('#accountFavoritesBtn').addEventListener('click',()=>{closeModal('accountModal');openFavorites();});
$('#accountMessagesBtn').addEventListener('click',()=>{closeModal('accountModal');openMessages()});

/* Fix 20/09/2026 : fonctionnalité "alerte" — recherche sauvegardée + email quand une annonce correspond.
   Table saved_alerts créée côté Supabase (voir Claude outputs/saved_alerts.sql). Tant que la table n'existe
   pas encore, les appels échouent proprement et affichent un message neutre plutôt qu'une erreur brute. */
function fillAlertFormFromCurrentSearch(){
  if($('#alertKeyword')) $('#alertKeyword').value=$('#searchQuery')?.value?.trim()||'';
  if($('#alertCategory')) $('#alertCategory').value=$('#filterCategory')?.value||activeCategory||'';
  if($('#alertCity')) $('#alertCity').value=$('#searchCity')?.value?.trim()||'';
  if($('#alertPriceMax')) $('#alertPriceMax').value=$('#filterPriceMax')?.value||'';
}
function renderMyAlertsList(alerts){
  const box=$('#myAlertsList');
  if(!box) return;
  if(!alerts||!alerts.length){box.innerHTML='<p class="note">Aucune alerte enregistrée pour le moment.</p>';return;}
  box.innerHTML=alerts.map(a=>{
    const parts=[a.keyword,a.category?catLabel(a.category):'',a.city,(a.price_max!==null&&a.price_max!==undefined&&a.price_max!=='')?`≤ ${Number(a.price_max).toLocaleString('fr-FR')} €`:''].filter(Boolean);
    return `<div class="alert-row" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0eaf3">
      <div><strong>${esc(a.label||'Alerte')}</strong><div style="font-size:.8rem;color:#7a6d84;margin-top:2px">${esc(parts.join(' · ')||'Tous les critères')}</div></div>
      <button class="mini-btn danger" type="button" onclick="deleteSavedAlert('${a.id}')">Supprimer</button>
    </div>`;
  }).join('');
}
async function loadMyAlerts(){
  const box=$('#myAlertsList');
  if(!box) return;
  if(!currentUser){box.innerHTML='<p class="note">Connectez-vous pour voir vos alertes.</p>';return;}
  if(!sb){box.innerHTML='<p class="note">Service indisponible pour le moment.</p>';return;}
  try{
    const {data,error}=await sb.from('saved_alerts').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
    if(error) throw error;
    renderMyAlertsList(data||[]);
  }catch(e){
    console.warn('Alertes indisponibles',e);
    box.innerHTML='<p class="note">Fonctionnalité en cours de mise en place, revenez bientôt.</p>';
  }
}
window.deleteSavedAlert=async(id)=>{
  if(!sb) return;
  const {error}=await sb.from('saved_alerts').delete().eq('id',id);
  if(error){toast('Impossible de supprimer cette alerte pour le moment');console.warn(error);return;}
  toast('Alerte supprimée');
  loadMyAlerts();
};
$('#createAlertBtn')?.addEventListener('click',async()=>{
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour créer une alerte');return;}
  fillAlertFormFromCurrentSearch();
  openModal('alertsModal');
  loadMyAlerts();
});
$('#accountAlertsBtn')?.addEventListener('click',()=>{closeModal('accountModal');openModal('alertsModal');loadMyAlerts();});
$('#createAlertForm')?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour créer une alerte');return;}
  if(!sb) return;
  const status=$('#createAlertStatus');
  if(status) status.textContent='Enregistrement…';
  const priceMaxRaw=$('#alertPriceMax')?.value;
  const payload={
    user_id:currentUser.id,
    label:$('#alertLabel')?.value.trim()||null,
    keyword:$('#alertKeyword')?.value.trim()||null,
    category:$('#alertCategory')?.value||null,
    city:$('#alertCity')?.value.trim()||null,
    price_max:priceMaxRaw?Number(priceMaxRaw):null
  };
  try{
    const {error}=await sb.from('saved_alerts').insert(payload);
    if(error) throw error;
    if(status) status.textContent='Alerte enregistrée ✓';
    $('#createAlertForm')?.reset();
    toast('Alerte enregistrée, vous serez prévenu par e-mail');
    loadMyAlerts();
  }catch(e){
    console.warn('Création alerte impossible',e);
    if(status) status.textContent='';
    toast('Fonctionnalité en cours de mise en place, réessayez bientôt');
  }
});

$('#accountModerationBtn')?.addEventListener('click',()=>{
  if(!currentProfile?.is_admin){toast('Accès administrateur requis');return;}
  closeModal('accountModal');
  // Même page dédiée que le raccourci Admin, sur mobile, tablette et desktop.
  (window.abracaGo?window.abracaGo('moderation.html'):location.href='moderation.html');
});
$('#accountFlowBtn')?.addEventListener('click',()=>{
  closeModal('accountModal');
  window.openAdminFlowErrors?.();
});
$('#proAccountBtn')?.addEventListener('click',e=>{e.preventDefault();openProfessionalSignup();});

// --- Import / synchronisation de stock professionnel CSV / Excel / XML / JSON / URL ---
let proImportRows=[];
let proImportSourceLabel='fichier';
let proExistingImportMap=new Map();

function repairImportedText(value){
  if(typeof value!=='string') return value;
  const text=value.trim();
  if(!/[ÃÂ]/.test(text)) return text;
  try{
    const chars=[...text];
    if(chars.some(ch=>ch.charCodeAt(0)>255)) return text;
    const bytes=Uint8Array.from(chars.map(ch=>ch.charCodeAt(0)));
    const fixed=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    return fixed && !fixed.includes('�') ? fixed : text;
  }catch(_){ return text; }
}
function normalizeImportHeader(v){
  return String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}
function importCell(row,aliases){
  for(const key of aliases){
    if(row[key]!==undefined && row[key]!==null && String(row[key]).trim()!=='') return typeof row[key]==='string'?repairImportedText(row[key]):row[key];
  }
  return '';
}
function importNumber(v){
  if(v===null||v===undefined||v==='') return null;
  if(typeof v==='number') return Number.isFinite(v)?v:null;
  let s=repairImportedText(String(v)).replace(/[\s\u00a0\u202f€]/g,'').replace(/[^0-9,.-]/g,'');
  if(!s) return null;
  if(/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s=s.replace(/[.,]/g,'');
  else if(s.includes(',')&&s.includes('.')){
    const lastComma=s.lastIndexOf(','), lastDot=s.lastIndexOf('.');
    const decimal=lastComma>lastDot?',':'.';
    const thousands=decimal===','?'.':',';
    s=s.split(thousands).join('').replace(decimal,'.');
  }else if(s.includes(',')){
    const parts=s.split(','); s=(parts.length===2&&parts[1].length<=2)?parts[0]+'.'+parts[1]:parts.join('');
  }else if(s.includes('.')){
    const parts=s.split('.'); if(parts.length>2||(parts.length===2&&parts[1].length===3)) s=parts.join('');
  }
  const n=Number(s); return Number.isFinite(n)?n:null;
}
function importBool(v,defaultValue=true){
  const t=normalizeImportHeader(v); if(!t) return defaultValue;
  if(['non','no','false','0','masque','masquer'].includes(t)) return false;
  if(['oui','yes','true','1','affiche','afficher'].includes(t)) return true;
  return defaultValue;
}
function normalizeVehicleSub(v){
  const t=normalizeImportHeader(v); if(!t) return 'voitures';
  if(['voiture','voitures','auto','autos','automobile','automobiles','car','cars','vp','vehicle','vehicule'].includes(t)) return 'voitures';
  if(['moto','motos','motorcycle','motorcycles','scooter','scooters','2_roues','deux_roues'].includes(t)) return 'motos';
  if(['utilitaire','utilitaires','vu','fourgon','fourgonette','fourgonnette','van_utilitaire','commercial'].includes(t)) return 'utilitaires';
  if(['caravaning','camping_car','campingcar','caravane','motorhome'].includes(t)) return 'caravaning';
  return '';
}
function normalizeImmoSub(typeValue,transactionValue=''){
  const t=normalizeImportHeader(typeValue), tr=normalizeImportHeader(transactionValue);
  const renting=['location','louer','rent','rental','lease','a_louer'].includes(tr)||t.includes('location')||t.includes('rent');
  if(t.includes('saison')||t.includes('vacance')) return 'saisonniere';
  if(t.includes('terrain')||t.includes('land')) return 'vente-terrain';
  if(/batiment|grange|hangar|ecurie|etable|bergerie|porcherie|dependance/.test(t)) return renting?'location':'vente-batiment';
  if(t.includes('parking')||t.includes('garage')||t.includes('box')) return 'parking-garage';
  if(t.includes('bureau')||t.includes('commerce')||t.includes('local')||t.includes('office')||t.includes('shop')) return 'bureaux-commerces';
  if(t.includes('maison')||t.includes('villa')||t.includes('house')) return renting?'location':'vente-maison';
  if(t.includes('appartement')||t.includes('studio')||t.includes('apartment')||t.includes('flat')) return renting?'location':'vente-appartement';
  if(renting) return 'location';
  if(['vente_appartement','appartement_a_vendre'].includes(t))return 'vente-appartement';
  if(['vente_maison','maison_a_vendre'].includes(t))return 'vente-maison';
  return '';
}
function normalizeCondition(v){
  const t=normalizeImportHeader(v);
  const map={neuf:'Neuf',new:'Neuf',comme_neuf:'Comme neuf',tres_bon_etat:'Très bon état',bon_etat:'Bon état',used:null,occasion:null,etat_correct:'État correct',correct:'État correct',a_reparer:'À rénover / à réparer',a_renover_a_reparer:'À rénover / à réparer',pour_pieces:'Pour pièces'};
  return t in map?map[t]:(String(v||'').trim()||null);
}
function normalizeFuel(v){
  const t=normalizeImportHeader(v);
  const map={essence:'Essence',petrol:'Essence',gasoline:'Essence',diesel:'Diesel',gazole:'Diesel',hybride:'Hybride',hybrid:'Hybride',hybride_rechargeable:'Hybride rechargeable',plug_in_hybrid:'Hybride rechargeable',electrique:'Électrique',electric:'Électrique',ev:'Électrique',gpl:'GPL',lpg:'GPL',autre:'Autre'};
  return map[t]||String(v||'').trim()||null;
}
function normalizeTransmission(v){
  const t=normalizeImportHeader(v);
  if(['auto','automatique','automatic','at'].includes(t)) return 'Automatique';
  if(['manuelle','manuel','manual','mt'].includes(t)) return 'Manuelle';
  return String(v||'').trim()||null;
}
function normalizeCritAir(v){
  const raw=String(v??'').trim(); if(!raw)return null;
  const t=normalizeImportHeader(raw).replace(/^crit_?air_?/, '');
  if(['0','zero','electrique','electric'].includes(t)) return '0';
  if(['1','2','3','4','5'].includes(t)) return t;
  if(['non_classe','non_classee','non_classement','none','nc'].includes(t)) return 'Non classé';
  return null;
}
function normalizedImportObject(raw){
  const out={};
  const assign=(path,value)=>{
    const full=normalizeImportHeader(path.join('_')); const leaf=normalizeImportHeader(path[path.length-1]||'');
    if(full&&out[full]===undefined)out[full]=value;
    if(leaf&&out[leaf]===undefined)out[leaf]=value;
  };
  const walk=(value,path=[])=>{
    if(Array.isArray(value)){
      if(value.every(v=>v===null||['string','number','boolean'].includes(typeof v)))assign(path,value);
      else value.forEach((v,i)=>walk(v,path.concat(String(i+1))));
      return;
    }
    if(value&&typeof value==='object'){
      Object.entries(value).forEach(([k,v])=>walk(v,path.concat(k))); return;
    }
    assign(path,typeof value==='string'?repairImportedText(value):value);
  };
  if(raw&&typeof raw==='object')Object.entries(raw).forEach(([k,v])=>walk(v,[k]));
  return out;
}
function importedReferenceFromDescription(desc=''){
  const m=String(desc).match(/^\[ABRACA_REF:([^\]]+)\]/m); return m?m[1].trim():'';
}
function importedSourceFromDescription(desc=''){
  const m=String(desc).match(/^\[ABRACA_SOURCE:([^\]]+)\]/m); return m?m[1].trim():'';
}
async function existingProfessionalImports(sector='vehicules'){
  const map=new Map(); if(!currentUser) return map;
  const category=sector==='immobilier'?'immobilier':'vehicules';
  const {data,error}=await sb.from('listings').select('id,description,status,photo_limit,category').eq('owner_id',currentUser.id).eq('category',category);
  if(error){console.warn('Impossible de vérifier les références déjà importées',error);return map;}
  (data||[]).forEach(x=>{const ref=importedReferenceFromDescription(x.description||'');if(ref)map.set(ref,{id:x.id,status:x.status,source:importedSourceFromDescription(x.description||''),photo_limit:Number(x.photo_limit||15),category:x.category});});
  return map;
}
function collectImportPhotos(r){
  const urls=[];
  const add=v=>{
    if(Array.isArray(v)){v.forEach(add);return;}
    if(v&&typeof v==='object'){Object.values(v).forEach(add);return;}
    String(v??'').split(/[\n|;]/).forEach(part=>{
      const x=part.trim(); if(/^https?:\/\//i.test(x)&&!urls.includes(x)) urls.push(x);
    });
  };
  Object.entries(r).forEach(([k,v])=>{if(/(^|_)(photo|photos|image|images|picture|pictures)(_|$)/.test(k)) add(v);});
  for(let i=1;i<=45;i++) add(importCell(r,[`photo_${i}`,`photo${i}`,`image_${i}`,`image${i}`,`picture_${i}`,`picture${i}`]));
  return urls.slice(0,45);
}
function normalizeFrenchPostalCode(value){
  const digits=String(value??'').replace(/\D/g,'');
  if(!digits) return '';
  if(digits.length===4) return '0'+digits;
  return digits.slice(0,5);
}
const importCommunePostalCache=new Map();
async function correctImportedCityPostal(row){
  row.postal=normalizeFrenchPostalCode(row.postal);
  const city=String(row.city||'').trim();
  if(!city) return row;
  const key=city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  try{
    let info=importCommunePostalCache.get(key);
    if(info===undefined){
      const url='https://geo.api.gouv.fr/communes?nom='+encodeURIComponent(city)+'&fields=nom,codesPostaux&boost=population&limit=8';
      const res=await fetch(url);
      const arr=res.ok?await res.json():[];
      const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const exact=(arr||[]).find(x=>norm(x.nom)===key)||(arr||[])[0]||null;
      info=exact?{name:exact.nom,codes:Array.isArray(exact.codesPostaux)?exact.codesPostaux:[]}:null;
      importCommunePostalCache.set(key,info);
    }
    if(info){
      row.city=info.name||row.city;
      if(info.codes.length && (!row.postal || !info.codes.includes(row.postal))) row.postal=info.codes[0];
    }
  }catch(e){ console.warn('Vérification ville/code postal indisponible',city,e); }
  return row;
}
function prepareVehicleImportRow(raw,index,existingMap,newRefs){
  const r=normalizedImportObject(raw);
  const ref=String(importCell(r,['reference','ref','reference_stock','stock_id','stockid','id','identifiant','vehicle_id','vehicleid'])||'').trim();
  let title=String(importCell(r,['titre','title','nom','designation','libelle','name'])||'').trim();
  const price=importNumber(importCell(r,['prix','price','prix_eur','tarif','selling_price','sale_price']));
  const city=String(importCell(r,['ville','city','localite','location_city'])||'').trim();
  const postal=normalizeFrenchPostalCode(importCell(r,['code_postal','cp','postal_code','zipcode','zip']));
  const description=String(importCell(r,['description','desc','details','commentaire','comments'])||'').trim();
  const sub=normalizeVehicleSub(importCell(r,['type','sous_categorie','type_vehicule','categorie','category','vehicle_type','body_type']));
  const condition=normalizeCondition(importCell(r,['etat','condition','vehicle_condition']));
  const make=String(importCell(r,['marque','make','brand','manufacturer'])||'').trim()||null;
  const model=String(importCell(r,['modele','model','model_name'])||'').trim()||null;
  const year=importNumber(importCell(r,['annee','year','millesime','first_registration_year','registration_year']));
  const mileage=importNumber(importCell(r,['kilometrage','km','mileage','odometer']));
  const fuel=normalizeFuel(importCell(r,['carburant','fuel','energie','energy']));
  const transmission=normalizeTransmission(importCell(r,['boite','boite_vitesse','transmission','gearbox']));
  const critAir=normalizeCritAir(importCell(r,['crit_air','critair','crit_air_classe','vignette_crit_air','emission_class']));
  const body=String(importCell(r,['carrosserie','body','body_type','vehicle_body','type_carrosserie'])||'').trim();
  const doors=importNumber(importCell(r,['portes','nombre_portes','doors','door_count']));
  const seats=importNumber(importCell(r,['places','nombre_places','seats','seat_count']));
  const permit=String(importCell(r,['permis','permit','license_required','licence_required'])||'').trim();
  const finish=String(importCell(r,['finition','trim','finish','grade'])||'').trim();
  const version=String(importCell(r,['version','version_constructeur','variant','derivative'])||'').trim();
  const firstRegistration=String(importCell(r,['mise_en_circulation','date_premiere_mise_en_circulation','first_registration','registration_date'])||'').trim();
  const color=String(importCell(r,['couleur','color','colour'])||'').trim();
  const upholstery=String(importCell(r,['sellerie','upholstery','interior_trim'])||'').trim();
  const fiscalPower=importNumber(importCell(r,['puissance_fiscale','cv_fiscaux','fiscal_power','tax_hp']));
  const dinPower=importNumber(importCell(r,['puissance_din','puissance_ch','din_power','horsepower','hp']));
  const co2=importNumber(importCell(r,['co2','emissions_co2','co2_g_km','co2_emissions']));
  const history=String(importCell(r,['historique','historique_vehicule','vehicle_history','owner_history'])||'').trim();
  const technicalInspection=String(importCell(r,['controle_technique','ct','technical_inspection'])||'').trim();
  const maintenance=String(importCell(r,['entretien','carnet_entretien','maintenance','service_history'])||'').trim();
  const warranty=String(importCell(r,['garantie','warranty'])||'').trim();
  const equipmentRaw=importCell(r,['equipements','equipment','options','features','extras']);
  const equipment=Array.isArray(equipmentRaw)?equipmentRaw.map(x=>String(x).trim()).filter(Boolean):String(equipmentRaw||'').split(/[|;,]/).map(x=>x.trim()).filter(Boolean);
  const showPhone=importBool(importCell(r,['afficher_numero','telephone_visible','show_phone']),true);
  const photos=collectImportPhotos(r);
  if(!title && (make||model)) title=[make,model,year].filter(Boolean).join(' ');
  const errors=[];
  const visibility=normalizeImportHeader(importCell(r,['type_vente','cible_visibilite','visibilite','visibility']));
  if(visibility&&!['public','publique','tout_public'].includes(visibility)) errors.push('offre privée : utilise Pro/Pro');
  if(!ref) errors.push('référence manquante');
  if(!title) errors.push('titre manquant');
  if(!city) errors.push('ville manquante');
  if(!sub) errors.push('type véhicule non reconnu');
  if(year!==null&&(year<1900||year>2100)) errors.push('année invalide');
  if(mileage!==null&&mileage<0) errors.push('kilométrage invalide');
  if(price!==null&&price<0) errors.push('prix invalide');
  const inSameFile=!!ref&&newRefs.has(ref); if(ref)newRefs.add(ref);
  const existing=ref?existingMap.get(ref):null;
  const status=inSameFile?'duplicate':(errors.length?'invalid':(existing?'update':'ready'));
  return {index:index+2,category:'vehicules',ref,title,price,city,postal,description,sub,condition,make,model,year,mileage,fuel,transmission,critAir,body,doors,seats,permit,finish,version,firstRegistration,color,upholstery,fiscalPower,dinPower,co2,history,technicalInspection,maintenance,warranty,equipment,showPhone,photos,errors,existingId:existing?.id||null,existingPhotoLimit:Number(existing?.photo_limit||15),status};
}
function prepareRealEstateImportRow(raw,index,existingMap,newRefs){
  const r=normalizedImportObject(raw);
  const ref=String(importCell(r,['reference','ref','reference_mandat','mandat','mandate','property_id','bien_id','id','identifiant'])||'').trim();
  let title=String(importCell(r,['titre','title','nom','designation','libelle','name'])||'').trim();
  const price=importNumber(importCell(r,['prix','price','prix_vente','loyer','rent','tarif','sale_price']));
  const city=String(importCell(r,['ville','city','commune','localite','location_city'])||'').trim();
  const postal=normalizeFrenchPostalCode(importCell(r,['code_postal','cp','postal_code','zipcode','zip']));
  const description=String(importCell(r,['description','desc','details','commentaire','comments','texte_annonce'])||'').trim();
  const transaction=String(importCell(r,['transaction','type_transaction','vente_location','operation','deal_type'])||'').trim();
  const propertyType=String(importCell(r,['type_bien','property_type','bien','type','sous_categorie','categorie','category'])||'').trim();
  const sub=normalizeImmoSub(propertyType,transaction);
  const surface=importNumber(importCell(r,['surface','surface_habitable','living_area','area','surface_utile']));
  const landSurface=importNumber(importCell(r,['surface_terrain','terrain','land_area','plot_area']));
  const rooms=importNumber(importCell(r,['pieces','nb_pieces','nombre_pieces','rooms','room_count']));
  const bedrooms=importNumber(importCell(r,['chambres','nb_chambres','nombre_chambres','bedrooms','bedroom_count']));
  const bathrooms=importNumber(importCell(r,['salles_de_bain','salle_de_bain','salles_eau','bathrooms','bathroom_count']));
  const floor=importNumber(importCell(r,['etage','floor','floor_number']));
  const totalFloors=importNumber(importCell(r,['nombre_etages','nb_etages','total_floors','building_floors']));
  const furnished=String(importCell(r,['meuble','meublee','furnished'])||'').trim();
  const yearBuilt=importNumber(importCell(r,['annee_construction','construction_year','year_built']));
  const propertyCondition=String(importCell(r,['etat_bien','etat','property_condition','condition'])||'').trim();
  const heating=String(importCell(r,['chauffage','heating','heating_type'])||'').trim();
  const orientation=String(importCell(r,['exposition','orientation','exposure'])||'').trim();
  const neighborhood=String(importCell(r,['quartier','secteur','neighborhood','district'])||'').trim();
  const dpe=String(importCell(r,['dpe','classe_energie','energy_class','energy_rating'])||'').trim().toUpperCase();
  const ges=String(importCell(r,['ges','classe_ges','climate_class','ges_class'])||'').trim().toUpperCase();
  const energyConsumption=importNumber(importCell(r,['consommation_energie','conso_energie','energy_consumption','kwh_m2_an']));
  const dpeDate=String(importCell(r,['date_dpe','dpe_date','diagnostic_date'])||'').trim();
  const energyCostMin=importNumber(importCell(r,['cout_energie_min','depenses_energie_min','energy_cost_min']));
  const energyCostMax=importNumber(importCell(r,['cout_energie_max','depenses_energie_max','energy_cost_max']));
  const coownership=String(importCell(r,['copropriete','coownership','condominium'])||'').trim();
  const lots=importNumber(importCell(r,['nombre_lots','nb_lots','lots','lot_count']));
  const annualCharges=importNumber(importCell(r,['charges_annuelles','annual_charges','copro_charges']));
  const propertyTax=importNumber(importCell(r,['taxe_fonciere','property_tax','land_tax']));
  const fees=String(importCell(r,['honoraires','frais_agence','agency_fees','fees'])||'').trim();
  const rentCharges=importNumber(importCell(r,['charges_mensuelles','charges_location','monthly_charges','rent_charges']));
  const deposit=importNumber(importCell(r,['depot_garantie','caution','deposit','security_deposit']));
  const mandate=String(importCell(r,['mandat','reference_mandat','mandate','mandate_reference'])||'').trim();
  const availableDate=String(importCell(r,['disponible_le','date_disponibilite','available_date','availability_date'])||'').trim();
  const featuresRaw=importCell(r,['equipements','prestations','features','amenities','options','services']);
  const features=Array.isArray(featuresRaw)?featuresRaw.map(x=>String(x).trim()).filter(Boolean):String(featuresRaw||'').split(/[|;,]/).map(x=>x.trim()).filter(Boolean);
  const showPhone=importBool(importCell(r,['afficher_numero','telephone_visible','show_phone']),true);
  const photos=collectImportPhotos(r);
  if(!title){
    const kind=sub==='vente-maison'?'Maison':sub==='vente-terrain'?'Terrain':sub==='vente-batiment'?'Bâtiment':sub==='location'?'Location':sub==='parking-garage'?'Parking / Garage':sub==='bureaux-commerces'?'Local / Bureau':'Appartement';
    title=[kind,rooms?`${Math.round(rooms)} pièce${rooms>1?'s':''}`:'',surface?`${surface} m²`:'',city].filter(Boolean).join(' · ');
  }
  const errors=[];
  if(!ref) errors.push('référence / mandat manquant');
  if(!title) errors.push('titre manquant');
  if(!city) errors.push('ville manquante');
  if(!sub) errors.push('type de bien non reconnu');
  if(price!==null&&price<0) errors.push('prix invalide');
  if(surface!==null&&surface<0) errors.push('surface invalide');
  if(landSurface!==null&&landSurface<0) errors.push('surface terrain invalide');
  if(dpe&&!['A','B','C','D','E','F','G','NON SOUMIS','NON_SOUMIS'].includes(dpe)) errors.push('DPE invalide');
  const inSameFile=!!ref&&newRefs.has(ref);if(ref)newRefs.add(ref);
  const existing=ref?existingMap.get(ref):null;
  const status=inSameFile?'duplicate':(errors.length?'invalid':(existing?'update':'ready'));
  return {index:index+2,category:'immobilier',ref,title,price,city,postal,description,sub,propertyType,transaction,surface,landSurface,rooms,bedrooms,bathrooms,floor,totalFloors,furnished,yearBuilt,propertyCondition,heating,orientation,neighborhood,dpe,ges,energyConsumption,dpeDate,energyCostMin,energyCostMax,coownership,lots,annualCharges,propertyTax,fees,rentCharges,deposit,mandate,availableDate,features,showPhone,photos,errors,existingId:existing?.id||null,existingPhotoLimit:Number(existing?.photo_limit||15),status};
}
function prepareImportRow(raw,index,existingMap,newRefs){
  return ($('#proImportSector')?.value||'vehicules')==='immobilier'
    ?prepareRealEstateImportRow(raw,index,existingMap,newRefs)
    :prepareVehicleImportRow(raw,index,existingMap,newRefs);
}
function renderProImportPreview(){
  const summary=$('#proImportSummary'),preview=$('#proImportPreview'),run=$('#runProImport'); if(!summary||!preview||!run)return;
  const ready=proImportRows.filter(r=>r.status==='ready').length;
  const updates=proImportRows.filter(r=>r.status==='update').length;
  const invalid=proImportRows.filter(r=>r.status==='invalid').length;
  const duplicate=proImportRows.filter(r=>r.status==='duplicate').length;
  const imported=proImportRows.filter(r=>r.status==='imported').length;
  const actionable=ready+updates;
  summary.classList.remove('hidden');
  summary.innerHTML=`<span class="pro-import-kpi">${proImportRows.length} ligne${proImportRows.length>1?'s':''}</span><span class="pro-import-kpi ok">${ready} nouvelle${ready>1?'s':''}</span><span class="pro-import-kpi ok">${updates} mise${updates>1?'s':''} à jour</span>${imported?`<span class="pro-import-kpi ok">${imported} traitée${imported>1?'s':''}</span>`:''}<span class="pro-import-kpi bad">${invalid} erreur${invalid>1?'s':''}</span><span class="pro-import-kpi skip">${duplicate} doublon${duplicate>1?'s':''}</span>`;
  preview.classList.remove('hidden');
  preview.innerHTML=`<div class="pro-import-table-wrap"><table class="pro-import-table"><thead><tr><th>Ligne</th><th>Réf.</th><th>Annonce</th><th>Prix</th><th>Ville</th><th>Photos</th><th>Action</th></tr></thead><tbody>${proImportRows.map(r=>`<tr><td>${r.index}</td><td>${esc(r.ref||'—')}</td><td><b>${esc(r.title||'—')}</b><br><span class="small">${esc(r.category==='immobilier'?[subcategoryLabel('immobilier',r.sub),r.surface?`${r.surface} m²`:'',r.rooms?`${r.rooms} p.`:''].filter(Boolean).join(' · '):[r.make,r.model,r.year].filter(Boolean).join(' · '))}</span></td><td>${r.price===null?'—':money(r.price)}</td><td>${esc(r.city||'—')}${r.postal?` (${esc(r.postal)})`:''}</td><td>${r.photos.length}</td><td><span class="pro-import-status ${['ready','update','imported'].includes(r.status)?'ok':r.status==='duplicate'?'skip':'bad'}">${r.status==='ready'?'Nouvelle':r.status==='update'?'Mettre à jour':r.status==='imported'?'Traitée':r.status==='duplicate'?'Doublon dans le flux':'À corriger'}</span>${r.errors.length?`<br><span class="small">${esc(r.errors.join(', '))}</span>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  run.classList.toggle('hidden',actionable===0); run.textContent=`Traiter ${actionable} annonce${actionable>1?'s':''}`;
}
function resetProImport(){
  proImportRows=[]; proImportSourceLabel='fichier';
  if($('#proImportFile'))$('#proImportFile').value='';
  if($('#proImportFileName'))$('#proImportFileName').textContent='CSV, Excel, XML ou JSON';
  if($('#proImportSummary')){$('#proImportSummary').innerHTML='';$('#proImportSummary').classList.add('hidden');}
  if($('#proImportPreview')){$('#proImportPreview').innerHTML='';$('#proImportPreview').classList.add('hidden');}
  if($('#runProImport'))$('#runProImport').classList.add('hidden');
  if($('#finishProImport'))$('#finishProImport').classList.add('hidden');
  if($('#proImportProgress'))$('#proImportProgress').textContent='';
}
function rowsFromJson(value){
  if(Array.isArray(value)) return value;
  if(!value||typeof value!=='object') return [];
  for(const key of ['vehicles','vehicules','properties','biens','real_estate','listings','annonces','ads','items','stock','data','results']) if(Array.isArray(value[key])) return value[key];
  const arrays=Object.values(value).filter(Array.isArray); if(arrays.length===1)return arrays[0];
  return [value];
}
function xmlNodeToObject(node){
  const out={};
  const children=[...node.children];
  if(!children.length) return repairImportedText(node.textContent||'');
  for(const child of children){
    const key=normalizeImportHeader(child.tagName);
    const val=child.children.length?xmlNodeToObject(child):repairImportedText(child.textContent||'');
    if(out[key]===undefined) out[key]=val; else if(Array.isArray(out[key]))out[key].push(val); else out[key]=[out[key],val];
    for(const attr of [...child.attributes||[]]){
      if(/^(url|src|href)$/i.test(attr.name)&&/^https?:\/\//i.test(attr.value||'')){
        const pkey=/photo|image|picture/i.test(child.tagName)?`photo_${Object.keys(out).filter(k=>k.startsWith('photo_')).length+1}`:`${key}_${normalizeImportHeader(attr.name)}`;
        out[pkey]=attr.value;
      }
    }
  }
  return out;
}
function rowsFromXml(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  const err=doc.querySelector('parsererror'); if(err)throw new Error('XML invalide.');
  const preferred=['vehicle','vehicule','property','bien','realestate','listing','annonce','ad','item','stockitem','car','moto'];
  for(const tag of preferred){const nodes=[...doc.getElementsByTagName(tag)];if(nodes.length)return nodes.map(xmlNodeToObject);}
  const root=doc.documentElement; const children=[...root.children];
  const counts={}; children.forEach(n=>counts[n.tagName]=(counts[n.tagName]||0)+1);
  const repeated=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if(repeated&&repeated[1]>=1)return children.filter(n=>n.tagName===repeated[0]).map(xmlNodeToObject);
  return root?[xmlNodeToObject(root)]:[];
}
// Bibliothèques lourdes chargées seulement quand on s'en sert (avant : bloquaient l'affichage de chaque page,
// ~360 Ko compressés : lecteur Excel pour l'import Pro, Leaflet pour la carte d'une fiche).
const abracaLazyLoads={};
function abracaLoadScript(src){return abracaLazyLoads[src]||(abracaLazyLoads[src]=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>ok();s.onerror=()=>{delete abracaLazyLoads[src];ko(new Error('Chargement impossible : '+src));};document.head.appendChild(s);}));}
function abracaLoadCss(href){if(document.querySelector('link[href="'+href+'"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);}
async function ensureXlsx(){if(!window.XLSX)await abracaLoadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');return window.XLSX;}
async function ensureLeaflet(){abracaLoadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');if(!window.L)await abracaLoadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');return window.L;}
async function rowsFromSpreadsheetBuffer(buffer){
  try{await ensureXlsx();}catch(_){}
  if(!window.XLSX)throw new Error('Le lecteur Excel ne s’est pas chargé. Recharge la page.');
  const wb=XLSX.read(buffer,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});
}
async function parseRowsByFormat({name='',contentType='',arrayBuffer=null,text=null}){
  const lower=String(name).toLowerCase();
  const type=String(contentType).toLowerCase();
  const isSpreadsheet=lower.endsWith('.xlsx')||lower.endsWith('.xls')||lower.endsWith('.csv')||
    type.includes('spreadsheetml')||type.includes('ms-excel')||type.includes('text/csv');
  const isJson=lower.endsWith('.json')||type==='application/json'||type.endsWith('+json')||(text&&/^\s*[\[{]/.test(text));
  const isXml=lower.endsWith('.xml')||type==='application/xml'||type==='text/xml'||type.endsWith('+xml')||(text&&/^\s*</.test(text));
  if(isJson){const t=text??new TextDecoder('utf-8').decode(arrayBuffer);return rowsFromJson(JSON.parse(t));}
  if(isSpreadsheet){const buf=arrayBuffer??new TextEncoder().encode(text||'').buffer;return rowsFromSpreadsheetBuffer(buf);}
  if(isXml){const t=text??new TextDecoder('utf-8').decode(arrayBuffer);return rowsFromXml(t);}
  const buf=arrayBuffer??new TextEncoder().encode(text||'').buffer;
  return rowsFromSpreadsheetBuffer(buf);
}
async function normalizeProfessionalRowsOnServer(rows,sector){
  const normalized=[];
  for(let i=0;i<rows.length;i+=150){
    const chunk=rows.slice(i,i+150);
    const {data,error}=await sb.functions.invoke('pro-stock-sync',{body:{action:'normalize_preview',sector,rows:chunk}});
    if(error)throw error;
    if(!data?.ok||!Array.isArray(data.rows))throw new Error(data?.error||'Normalisation serveur indisponible.');
    normalized.push(...data.rows);
  }
  return normalized;
}
function prepareCanonicalImportRow(row,index,existingMap,newRefs){
  const r={...row};
  const errors=Array.isArray(r.errors)?[...r.errors]:[];
  const ref=String(r.ref||'').trim();
  const inSameFile=!!ref&&newRefs.has(ref);if(ref)newRefs.add(ref);
  const existing=ref?existingMap.get(ref):null;
  const status=inSameFile?'duplicate':(errors.length?'invalid':(existing?'update':'ready'));
  return {...r,index:index+2,ref,errors,existingId:existing?.id||null,existingPhotoLimit:Number(existing?.photo_limit||15),status};
}
async function prepareProfessionalRows(rows,sourceLabel='fichier'){
  if(!Array.isArray(rows)||!rows.length)throw new Error('Le stock ne contient aucune ligne exploitable.');
  const sector=$('#proImportSector')?.value||'vehicules';
  const normalized=await normalizeProfessionalRowsOnServer(rows,sector);
  proExistingImportMap=await existingProfessionalImports(sector); const newRefs=new Set(); proImportSourceLabel=sourceLabel;
  proImportRows=normalized.map((row,i)=>prepareCanonicalImportRow(row,i,proExistingImportMap,newRefs));
  renderProImportPreview();
}
async function parseProfessionalImportFile(file){
  const buffer=await file.arrayBuffer();
  let text=null; if(/\.(json|xml)$/i.test(file.name)||/json|xml/i.test(file.type))text=await file.text();
  const rows=await parseRowsByFormat({name:file.name,contentType:file.type,arrayBuffer:buffer,text});
  await prepareProfessionalRows(rows,`fichier:${file.name}`);
}
async function parseProfessionalImportUrl(url){
  if(!/^https?:\/\//i.test(url))throw new Error('Indiquez une URL de flux valide en http(s).');
  const sector=$('#proImportSector')?.value||'vehicules';
  const {data,error}=await sb.functions.invoke('pro-stock-sync',{body:{action:'preview_url',sector,url}});
  if(error)throw new Error(await proFunctionError(error,'Impossible d’analyser le flux'));
  if(!data?.ok||!Array.isArray(data.rows))throw new Error(data?.error||'Analyse serveur indisponible.');
  proExistingImportMap=await existingProfessionalImports(sector);
  const newRefs=new Set(); proImportSourceLabel=`url:${url}`;
  proImportRows=data.rows.map((row,i)=>prepareCanonicalImportRow(row,i,proExistingImportMap,newRefs));
  renderProImportPreview();
}
function importPayload(r){
  if(r.category==='immobilier'){
    const meta=compactRealEstateMeta({
      transaction:r.transaction,propertyType:r.propertyType,
      surface:r.surface,landSurface:r.landSurface,rooms:r.rooms,bedrooms:r.bedrooms,bathrooms:r.bathrooms,floor:r.floor,totalFloors:r.totalFloors,
      furnished:r.furnished,yearBuilt:r.yearBuilt,propertyCondition:r.propertyCondition,heating:r.heating,orientation:r.orientation,neighborhood:r.neighborhood,
      dpe:r.dpe,ges:r.ges,energyConsumption:r.energyConsumption,dpeDate:r.dpeDate,energyCostMin:r.energyCostMin,energyCostMax:r.energyCostMax,
      coownership:r.coownership,lots:r.lots,annualCharges:r.annualCharges,propertyTax:r.propertyTax,fees:r.fees,rentCharges:r.rentCharges,
      deposit:r.deposit,mandate:r.mandate||r.ref,availableDate:r.availableDate,features:r.features
    });
    const marker=`[ABRACA_SUB:${r.sub}]
[ABRACA_REF:${r.ref}]
[ABRACA_SOURCE:${String(proImportSourceLabel).slice(0,350)}]
${realEstateMetaMarker(meta)}`;
    return {owner_id:currentUser.id,category:'immobilier',title:r.title,description:marker+r.description,price:r.price,city:r.city,postal_code:r.postal||'',show_phone:r.showPhone,item_condition:null,seller_type:'professionnel',status:'pending',vehicle_make:null,vehicle_model:null,vehicle_year:null,mileage:null,fuel:null,transmission:null,crit_air:null,photo_limit:15};
  }
  const meta=compactVehicleMeta({
    firstRegistration:r.firstRegistration,body:r.body,doors:r.doors,seats:r.seats,permit:r.permit,finish:r.finish,version:r.version,
    color:r.color,upholstery:r.upholstery,fiscalPower:r.fiscalPower,dinPower:r.dinPower,co2:r.co2,history:r.history,
    technicalInspection:r.technicalInspection,maintenance:r.maintenance,warranty:r.warranty,equipment:r.equipment
  });
  const marker=`[ABRACA_SUB:${r.sub}]
[ABRACA_REF:${r.ref}]
[ABRACA_SOURCE:${String(proImportSourceLabel).slice(0,350)}]
${vehicleMetaMarker(meta)}`;
  return {owner_id:currentUser.id,category:'vehicules',title:r.title,description:marker+r.description,price:r.price,city:r.city,postal_code:r.postal||'',show_phone:r.showPhone,item_condition:r.condition,seller_type:'professionnel',status:'pending',vehicle_make:r.make,vehicle_model:r.model,vehicle_year:r.year===null?null:Math.round(r.year),mileage:r.mileage===null?null:Math.round(r.mileage),fuel:r.fuel,transmission:r.transmission,crit_air:r.critAir||null,photo_limit:15};
}
async function replaceImportedPhotos(listingId,photos,limit=15){
  const {data:listing,error:limitError}=await sb.from('listings').select('photo_limit').eq('id',listingId).single();
  if(limitError)throw limitError;
  limit=Math.min(limit,Number(listing?.photo_limit||10));
  if(!photos.length)return;
  const {error:delError}=await sb.from('listing_photos').delete().eq('listing_id',listingId); if(delError)throw delError;
  const rows=photos.slice(0,limit).map((url,index)=>({listing_id:listingId,storage_path:url,position:index+1})); const {error}=await sb.from('listing_photos').insert(rows); if(error)throw error;
}
async function importOneProfessionalRow(r){
  const payload=importPayload(r); let listingId=r.existingId;
  const isUpdate=!!listingId;
  if(isUpdate){
    const updatePayload={...payload};
    delete updatePayload.owner_id;
    // Réimport = mise à jour uniquement : on conserve le statut, la date de publication
    // et les éventuels champs de mise en avant déjà présents sur l'annonce.
    delete updatePayload.status;
    // La limite photo est fixée par le pack côté serveur : ne pas l'écraser au réimport.
    delete updatePayload.photo_limit;
    const {error}=await sb.from('listings').update(updatePayload).eq('id',listingId).eq('owner_id',currentUser.id); if(error)throw error;
  }else{
    const {data,error}=await sb.from('listings').insert(payload).select('id').single(); if(error)throw error; listingId=data.id;
  }
  try{
    const {error:contactError}=await sb.rpc('save_listing_contact',{p_listing_id:listingId,p_phone:currentProfile?.phone||null,p_contact_email:currentUser.email||null}); if(contactError)throw contactError;
    await replaceImportedPhotos(listingId,r.photos,45); // plafonné ensuite par la limite du pack lue sur l'annonce
    // Chaque création et mise à jour importée repasse par le contrôle texte + photos.
    const moderation=await requestAutomaticModeration(listingId);
    return {listingId,moderation,updated:isUpdate};
  }catch(err){
    if(!isUpdate)await sb.from('listings').delete().eq('id',listingId); throw err;
  }
}
async function archiveMissingImportedRefs(){
  if($('#proImportSyncMode')?.value!=='full')return 0;
  const present=new Set(proImportRows.filter(r=>r.ref&&r.status!=='invalid'&&r.status!=='duplicate').map(r=>r.ref));
  let count=0;
  for(const [ref,item] of proExistingImportMap.entries()){
    if(present.has(ref))continue;
    // Sécurité : une synchro complète ne peut retirer que les annonces qui viennent
    // exactement du même flux / fichier. Un autre import du même garage reste intact.
    if(!item.source || item.source!==proImportSourceLabel)continue;
    const {error}=await sb.from('listings').update({status:'archived'}).eq('id',item.id).eq('owner_id',currentUser.id); if(!error)count++;
  }
  return count;
}
function downloadTextFile(filename,text,mime='text/plain;charset=utf-8'){
  const blob=new Blob([text],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
const importSample={
  reference:'TEST-001',
  titre:'Audi Q3 Sportback 35 TFSI Design',
  prix:25000,
  ville:'Cannes',
  code_postal:'06400',
  description:'Très bel état. Révision récente, factures disponibles.',
  type:'voitures',
  etat:'Excellent état',
  marque:'Audi',
  modele:'Q3 Sportback',
  annee:2022,
  kilometrage:39500,
  carburant:'Essence',
  boite:'Manuelle',
  crit_air:'1',
  carrosserie:'SUV / Crossover',
  portes:5,
  places:5,
  permis:'Avec permis',
  finition:'Design',
  version:'Q3 Sportback 35 TFSI 150 ch',
  mise_en_circulation:'02/2022',
  couleur:'Noir mythic métallisé',
  sellerie:'Tissu',
  puissance_fiscale:8,
  puissance_din:150,
  co2:149,
  historique:'Première main',
  controle_technique:'Oui - valide',
  entretien:"Carnet d'entretien + factures",
  garantie:'6 mois',
  equipements:'Aide au stationnement|Apple CarPlay / Android Auto|Bluetooth|Caméra de recul|Chargeurs USB|Climatisation|Régulateur de vitesse|Toit ouvrant / Toit panoramique',
  afficher_numero:'oui',
  photo_1:'https://exemple.fr/photo1.jpg',
  photo_2:'https://exemple.fr/photo2.jpg'
};
const immoImportSample={
  reference:'MANDAT-2026-184',
  titre:'Appartement 3 pièces 68 m² - Cannes centre',
  prix:495000,
  ville:'Cannes',
  code_postal:'06400',
  description:'Appartement lumineux, terrasse, cave et parking. Proche commerces et plages.',
  transaction:'vente',
  type_bien:'appartement',
  surface:68,
  surface_terrain:'',
  pieces:3,
  chambres:2,
  salles_de_bain:1,
  etage:3,
  nombre_etages:6,
  meuble:'Non',
  annee_construction:1988,
  etat_bien:'Très bon état',
  chauffage:'Individuel électrique',
  exposition:'Sud',
  quartier:'Centre-ville',
  dpe:'C',
  ges:'A',
  consommation_energie:142,
  date_dpe:'2026-06-15',
  cout_energie_min:760,
  cout_energie_max:1080,
  copropriete:'Oui',
  nombre_lots:48,
  charges_annuelles:2160,
  taxe_fonciere:1280,
  honoraires:'5 % inclus - charge vendeur',
  charges_mensuelles:'',
  depot_garantie:'',
  mandat:'MANDAT-2026-184',
  disponible_le:'',
  equipements:'Ascenseur|Terrasse|Cave|Parking|Climatisation|Fibre|Interphone',
  afficher_numero:'oui',
  photo_1:'https://exemple.fr/appartement1.jpg',
  photo_2:'https://exemple.fr/appartement2.jpg'
};
function currentImportSample(){return ($('#proImportSector')?.value||'vehicules')==='immobilier'?immoImportSample:importSample;}

let proAutoFeed=null;
let proImportLockedSector=null;

async function proFunctionError(error,fallback='Erreur serveur'){
  try{
    const ctx=error?.context;
    if(ctx){
      if(typeof ctx.clone==='function'){
        try{
          const body=await ctx.clone().json();
          if(body?.error)return String(body.error);
          if(body?.message)return String(body.message);
        }catch(_){}
      }
      if(typeof ctx.text==='function'){
        try{
          const raw=await ctx.text();
          if(raw){
            try{
              const body=JSON.parse(raw);
              if(body?.error)return String(body.error);
              if(body?.message)return String(body.message);
            }catch(_){
              if(raw.length<300)return raw;
            }
          }
        }catch(_){}
      }
    }
  }catch(_){}
  return error?.message||fallback;
}

async function proStockAdmin(body){
  const {data,error}=await sb.functions.invoke('pro-stock-admin',{body});
  if(error)throw new Error(await proFunctionError(error,'Service stock indisponible'));
  if(data?.error)throw new Error(data.error);
  return data;
}
async function refreshAutoFeedUi(){
  const status=$('#proAutoFeedStatus'),keyBtn=$('#rotateAutoApiKey'),keyBox=$('#proAutoApiKeyBox');
  try{
    const data=await proStockAdmin({action:'list'}); const feeds=data?.feeds||[];
    proImportLockedSector=data?.sector_locked?(data?.allowed_sector||null):null;
    const sectorSelect=$('#proImportSector');
    const adminSelect=$('#proImportSectorAdmin');
    const adminWrap=$('#proImportSectorAdminWrap');
    proAutoFeed=feeds[0]||null;
    let sector=proImportLockedSector||proAutoFeed?.sector||sectorSelect?.value||'vehicules';
    if(sectorSelect)sectorSelect.value=sector;
    if(adminSelect)adminSelect.value=sector;
    if(adminWrap)adminWrap.style.display=(!proImportLockedSector&&currentProfile?.is_admin)?'block':'none';
    if($('#proAutoFeedName'))$('#proAutoFeedName').value=sector==='immobilier'?'Portefeuille immobilier':'Stock Auto / Moto';
    if(proAutoFeed){
      if($('#proImportFeedUrl')&&proAutoFeed.feed_url)$('#proImportFeedUrl').value=proAutoFeed.feed_url;
      if(status)status.innerHTML=`<b>Synchronisation automatique active</b> · ${sector==='immobilier'?'Immobilier':'Auto / Moto'}${proAutoFeed.last_success_at?` · dernière synchro ${new Date(proAutoFeed.last_success_at).toLocaleString('fr-FR')}`:''}${proAutoFeed.last_error?`<br><span style="color:#a33">Dernière erreur : ${esc(proAutoFeed.last_error)}</span>`:''}`;
    }else{
      if(status)status.innerHTML=`<b>${sector==='immobilier'?'Immobilier':'Auto / Moto'}</b> · aucun flux connecté. Vous pouvez importer un fichier ou connecter l’URL de votre logiciel métier.`;
    }
    if(keyBtn)keyBtn.classList.remove('hidden');
    if(keyBox){keyBox.style.display='none';keyBox.innerHTML='';}
    updateImportSectorCopy();
  }catch(err){if(status)status.textContent=err.message||'Impossible de charger la configuration automatique.';}
}
window.openProImport=async()=>{
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous d’abord');return;}
  if(currentProfile?.account_type!=='professionnel'){toast('Cette fonction est réservée aux comptes professionnels');return;}
  closeModal('accountModal'); resetProImport();
  openModal('proImportModal'); refreshAutoFeedUi().then(()=>updateImportSectorCopy()).catch(()=>updateImportSectorCopy());
};
$('#rotateAutoApiKey')?.addEventListener('click',async()=>{
  const btn=$('#rotateAutoApiKey'),box=$('#proAutoApiKeyBox');
  try{
    btn.disabled=true;
    const sector=$('#proImportSector')?.value||'vehicules';
    let data;
    if(proAutoFeed?.id){
      data=await proStockAdmin({action:'rotate_key',feed_id:proAutoFeed.id});
    }else{
      data=await proStockAdmin({action:'create',name:sector==='immobilier'?'Portefeuille immobilier':'Stock Auto / Moto',feed_url:null,sync_mode:'upsert',sector,format:'auto',api_enabled:true});
      await refreshAutoFeedUi();
    }
    if(box){box.style.display='block';box.innerHTML=`<b>Clé API — copiez-la maintenant :</b><br><code style="word-break:break-all">${esc(data.api_key||'')}</code><br><span class="small">Endpoint : ${esc(data.api_endpoint||'')}</span>`;}
    toast('Clé API prête');
  }catch(err){toast(err.message||'Erreur');}finally{btn.disabled=false;}
});
$('#proImportBtn')?.addEventListener('click',openProImport); $('#headerStockBtn')?.addEventListener('click',openProImport); $('#proSectionImportBtn')?.addEventListener('click',openProImport); $('#clearImportPreview')?.addEventListener('click',resetProImport);
const proImportDropzone=$('#proImportDropzone');
if(proImportDropzone){
  ['dragenter','dragover'].forEach(evt=>proImportDropzone.addEventListener(evt,e=>{e.preventDefault();proImportDropzone.classList.add('dragover');}));
  ['dragleave','drop'].forEach(evt=>proImportDropzone.addEventListener(evt,e=>{e.preventDefault();proImportDropzone.classList.remove('dragover');}));
  proImportDropzone.addEventListener('drop',e=>{const file=e.dataTransfer?.files?.[0];const input=$('#proImportFile');if(!file||!input)return;const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
}
$('#proImportSyncMode')?.addEventListener('change',e=>$('#proImportFullWarning')?.classList.toggle('show',e.target.value==='full'));
function updateImportSectorCopy(){
  const immo=($('#proImportSector')?.value||'vehicules')==='immobilier';
  const display=$('#proImportSectorDisplay');if(display)display.textContent=immo?'Immobilier / agence':'Auto / Moto';
  const help=$('#proImportSectorHelp');if(help)help.textContent=(proImportLockedSector?'Secteur déterminé automatiquement à partir de l’activité du compte professionnel.':(currentProfile?.is_admin?'Mode administrateur : secteur libre pour les tests.':'Secteur du compte professionnel.'));
  const checks=$('#proImportChecksText');if(checks)checks.textContent=immo
    ?'Référence mandat unique · type de bien et transaction reconnus · contrôle prix / surfaces / DPE-GES · annonce existante = mise à jour · mise en avant conservée · analyse OpenAI du texte et de chaque photo avant publication, y compris lors des mises à jour.'
    :'Référence stock unique · Auto / Moto reconnu · contrôle prix / année / kilométrage · annonce existante = mise à jour · mise en avant conservée · analyse OpenAI du texte et de chaque photo avant publication, y compris lors des mises à jour.';
  const url=$('#proImportFeedUrl');if(url)url.placeholder=immo?'https://agence.fr/biens.xml':'https://garage.fr/stock.xml';
  const name=$('#proAutoFeedName');if(name)name.value=immo?'Portefeuille immobilier':'Stock Auto / Moto';
}
$('#proImportSector')?.addEventListener('change',()=>{resetProImport();updateImportSectorCopy();});
$('#proImportSectorAdmin')?.addEventListener('change',e=>{const sector=$('#proImportSector');if(sector){sector.value=e.target.value;sector.dispatchEvent(new Event('change',{bubbles:true}));}});

$('#proImportFile')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;const progress=$('#proImportProgress');if($('#proImportFileName'))$('#proImportFileName').textContent=file.name;
  try{if(progress)progress.textContent='Analyse du fichier…';await parseProfessionalImportFile(file);if(progress)progress.textContent='Analyse terminée. Vérifiez les lignes avant import.';}
  catch(err){console.error(err);resetProImport();if(progress)progress.textContent=err.message||'Impossible de lire le fichier.';toast(err.message||'Fichier invalide');}
});
$('#loadImportFeed')?.addEventListener('click',async()=>{
  const url=$('#proImportFeedUrl')?.value.trim()||'';const progress=$('#proImportProgress');const btn=$('#loadImportFeed');
  try{
    if(!url)throw new Error('Ajoutez l’URL du flux.');
    btn.disabled=true;if(progress)progress.textContent='Contrôle et connexion du flux…';
    await parseProfessionalImportUrl(url);
    const sector=$('#proImportSector')?.value||'vehicules';
    const name=sector==='immobilier'?'Portefeuille immobilier':'Stock Auto / Moto';
    if(proAutoFeed){
      await proStockAdmin({action:'update',feed_id:proAutoFeed.id,name,feed_url:url,sync_mode:'full',sector,format:'auto',active:true});
    }else{
      await proStockAdmin({action:'create',name,feed_url:url,sync_mode:'full',sector,format:'auto',api_enabled:false});
    }
    await refreshAutoFeedUi();
    if(progress)progress.textContent='Flux connecté. La synchronisation se fera désormais automatiquement toutes les 15 minutes.';
    toast('Flux connecté · synchronisation automatique active');
  }catch(err){console.error(err);if(progress)progress.textContent=err?.message||'Flux inaccessible';toast(err?.message||'Flux inaccessible');}
  finally{btn.disabled=false;}
});
$('#downloadImportTemplate')?.addEventListener('click',()=>{
  const sample=currentImportSample();const headers=Object.keys(sample);const values=Object.values(sample);const csv=[headers,values].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');downloadTextFile((($('#proImportSector')?.value||'vehicules')==='immobilier'?'modele_biens_abracadeal.csv':'modele_stock_abracadeal.csv'),'\ufeff'+csv,'text/csv;charset=utf-8');
});
$('#downloadExcelTemplate')?.addEventListener('click',async()=>{
  try{await ensureXlsx();}catch(_){}
  if(!window.XLSX){toast('Le lecteur Excel ne s’est pas chargé. Recharge la page.');return;}
  const sample=currentImportSample();const ws=XLSX.utils.json_to_sheet([sample]);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,($('#proImportSector')?.value||'vehicules')==='immobilier'?'Biens immobiliers':'Stock véhicules');
  XLSX.writeFile(wb,(($('#proImportSector')?.value||'vehicules')==='immobilier'?'modele_biens_abracadeal.xlsx':'modele_stock_abracadeal.xlsx'));
});
$('#downloadJsonTemplate')?.addEventListener('click',()=>{const sample=currentImportSample();const immo=($('#proImportSector')?.value||'vehicules')==='immobilier';downloadTextFile(immo?'modele_biens_abracadeal.json':'modele_stock_abracadeal.json',JSON.stringify(immo?{properties:[sample]}:{vehicles:[sample]},null,2),'application/json;charset=utf-8');});
$('#downloadXmlTemplate')?.addEventListener('click',()=>{
  const sample=currentImportSample();const immo=($('#proImportSector')?.value||'vehicules')==='immobilier';const escXml=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const fields=Object.entries(sample).map(([k,v])=>`    <${k}>${escXml(v)}</${k}>`).join('\n');const tag=immo?'property':'vehicle';downloadTextFile(immo?'modele_biens_abracadeal.xml':'modele_stock_abracadeal.xml',`<?xml version="1.0" encoding="UTF-8"?>
<stock>
  <${tag}>
${fields}
  </${tag}>
</stock>`,'application/xml;charset=utf-8');
});
$('#runProImport')?.addEventListener('click',async()=>{
  if(!currentUser||currentProfile?.account_type!=='professionnel')return;
  const rows=proImportRows.filter(r=>['ready','update'].includes(r.status));if(!rows.length)return;
  const btn=$('#runProImport'),progress=$('#proImportProgress');btn.disabled=true;let ok=0,failed=0,archived=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];if(progress)progress.textContent=`Traitement ${i+1}/${rows.length} — ${r.title}`;
    try{await importOneProfessionalRow(r);r.status='imported';ok++;}
    catch(err){console.error('Import ligne',r.index,err);r.status='invalid';r.errors=[err.message||'erreur pendant l’import'];failed++;}
  }
  if(!failed){try{archived=await archiveMissingImportedRefs();}catch(err){console.error('Archivage stock',err);}}
  btn.disabled=false;await loadAds();renderProImportPreview();
  if(progress)progress.textContent=`Synchronisation terminée : ${ok} annonce${ok>1?'s':''} traitée${ok>1?'s':''}${archived?` · ${archived} retirée${archived>1?'s':''} du stock`:''}${failed?` · ${failed} échec${failed>1?'s':''}`:''}.`;
  $('#finishProImport')?.classList.remove('hidden');
  $('#finishProImport')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  toast(`${ok} annonce${ok>1?'s':''} synchronisée${ok>1?'s':''}`);
});
$('#finishProImport')?.addEventListener('click',()=>closeModal('proImportModal'));
$$('[data-info-modal]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();openModal(link.dataset.infoModal)}));
$$('[data-close]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();closeModal(b.dataset.close)}));
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{
  if(e.target!==m)return;
  if(m.id==='proPlanModal'){
    toast('Choisissez une formule pour finaliser votre compte professionnel');
    return;
  }
  closeModal(m.id);
}));

document.querySelector('#accountModal .close-btn')?.addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  closeModal('accountModal');
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && document.getElementById('accountModal')?.classList.contains('open')){
    closeModal('accountModal');
  }
});


const VEHICLE_DETAIL_TYPES=['voitures','motos','utilitaires','caravaning','nautisme'];
const EQUIPMENT_TYPES=['equipement-auto','equipement-moto','equipement-caravaning','equipement-nautisme','equipement-velo','pieces-detachees'];

const SUBCATEGORIES = {
  vehicules: [
    ['voitures','Voitures'],
    ['motos','Motos / Scooters'],
    ['utilitaires','Utilitaires'],
    ['caravaning','Caravaning'],
    ['nautisme','Nautisme'],
    ['velos','Vélos'],
    ['equipement-auto','Équipement auto'],
    ['equipement-moto','Équipement moto'],
    ['equipement-caravaning','Équipement caravaning'],
    ['equipement-nautisme','Équipement nautisme'],
    ['equipement-velo','Équipement vélo'],
    ['pieces-detachees','Pièces détachées']
  ],
  immobilier: [
    ['vente-appartement','Appartement à vendre'],
    ['vente-maison','Maison à vendre'],
    ['vente-terrain','Terrain à vendre'],
    ['vente-batiment','Bâtiment / Grange à vendre'],
    ['location','Location longue durée'],
    ['saisonniere','Location saisonnière'],
    ['parking-garage','Parking / Garage'],
    ['bureaux-commerces','Bureaux / Commerces'],
    ['autre-immo','Autre immobilier']
  ],
  hightech: [
    ['telephones','Téléphones'],
    ['ordinateurs','Ordinateurs'],
    ['tablettes','Tablettes'],
    ['tv-video','TV / Vidéo'],
    ['audio','Audio'],
    ['photo','Photo / Caméras'],
    ['gaming','Jeux vidéo / Consoles'],
    ['accessoires-hightech','Accessoires'],
    ['objets-connectes','Objets connectés'],
    ['instruments-musique','Instruments de musique'],
    ['autre-hightech','Autre high-tech']
  ],
  maison: [
    ['meubles','Meubles'],
    ['decoration','Décoration'],
    ['electromenager','Électroménager'],
    ['bricolage','Bricolage & Matériel'],
    ['jardin','Jardin'],
    ['cuisine','Cuisine'],
    ['linge-maison','Linge de maison'],
    ['luminaire','Luminaires'],
    ['autre-maison','Autre maison']
  ],
  mode: [
    ['vetements-femme','Vêtements femme'],
    ['vetements-homme','Vêtements homme'],
    ['chaussures','Chaussures'],
    ['sacs','Sacs'],
    ['montres-bijoux','Montres / Bijoux'],
    ['accessoires-mode','Accessoires'],
    ['luxe','Luxe'],
    ['autre-mode','Autre mode']
  ],
  emploi: [
    ['cdi','CDI'],
    ['cdd','CDD'],
    ['interim','Intérim'],
    ['stage','Stage'],
    ['alternance','Alternance'],
    ['freelance','Freelance'],
    ['saisonnier','Saisonnier'],
    ['autre-emploi','Autre emploi']
  ],
  services: [
    ['artisans-travaux','Artisans / Travaux'],
    ['menage','Ménage'],
    ['jardinage','Jardinage'],
    ['demenagement','Déménagement'],
    ['depannage','Dépannage'],
    ['reparation-vehicules','Réparation véhicules'],
    ['transport','Transport / Livraison'],
    ['informatique','Informatique'],
    ['cours','Cours / Formation'],
    ['beaute-bienetre','Beauté / Bien-être'],
    ['evenementiel','Événementiel'],
    ['services-entreprises','Services aux entreprises'],
    ['autre-service','Autre service']
  ],
  autres: [
    ['loisirs','Loisirs'],
    ['sport','Sport'],
    ['collection','Collection'],
    ['animaux','Animaux'],
    ['materiel-pro','Matériel professionnel'],
    ['enfants','Enfants'],
    ['sante-mobilite','Santé & mobilité (béquilles, fauteuil roulant…)'],
    ['divers','Divers']
  ]
};

function populateSubcategories(keepValue=''){
  const category=$('#adCategory').value;
  const select=$('#vehicleSubcategory');
  const items=SUBCATEGORIES[category]||[];
  select.innerHTML='<option value="">Choisir</option>'+items.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  if(keepValue && items.some(([v])=>v===keepValue)) select.value=keepValue;
  $('#subcategoryLabel').textContent=category==='vehicules'?'Type de véhicule / équipement':'Sous-catégorie';
}


const VEHICLE_CATALOGS={
  voitures:{
    'Abarth':['500','500C','595','695'],
    'Alfa Romeo':['Giulia','Giulietta','Stelvio','Tonale'],
    'Alpine':['A110','A290'],
    'Audi':['A1','A3','A4','A5','A6','A7','A8','Q2','Q3','Q4 e-tron','Q5','Q7','Q8','e-tron','TT'],
    'BMW':['Série 1','Série 2','Série 3','Série 4','Série 5','Série 7','Série 8','X1','X2','X3','X4','X5','X6','X7','i3','i4','i5','i7','iX','Z4'],
    'Citroën':['Ami','C3','C3 Aircross','C4','C4 X','C5 Aircross','Berlingo','SpaceTourer'],
    'Cupra':['Born','Formentor','Leon','Tavascan','Terramar'],
    'Dacia':['Duster','Jogger','Logan','Sandero','Spring'],
    'DS Automobiles':['DS 3','DS 4','DS 7','DS 9'],
    'Fiat':['500','500e','500X','Panda','Tipo','Doblo'],
    'Ford':['Fiesta','Focus','Kuga','Puma','Mustang','Mustang Mach-E','Explorer','Tourneo'],
    'Honda':['Civic','CR-V','HR-V','Jazz','e:Ny1'],
    'Hyundai':['i10','i20','i30','Kona','Tucson','Santa Fe','Ioniq 5','Ioniq 6'],
    'Jaguar':['E-Pace','F-Pace','F-Type','I-Pace','XE','XF'],
    'Jeep':['Avenger','Compass','Renegade','Wrangler','Grand Cherokee'],
    'Kia':['Ceed','Niro','Picanto','Rio','Sorento','Sportage','Stonic','EV3','EV6','EV9'],
    'Land Rover':['Defender','Discovery','Discovery Sport','Range Rover','Range Rover Evoque','Range Rover Sport','Range Rover Velar'],
    'Lexus':['LBX','NX','RX','UX','ES','RZ'],
    'Maserati':['Ghibli','Grecale','GranTurismo','Levante','MC20','Quattroporte'],
    'Mazda':['Mazda 2','Mazda 3','CX-30','CX-5','CX-60','MX-5','MX-30'],
    'Mercedes-Benz':['Classe A','Classe B','Classe C','Classe E','Classe S','CLA','CLE','CLS','EQA','EQB','EQE','EQS','GLA','GLB','GLC','GLE','GLS','Classe G','Classe T','Classe V','Vito'],
    'MINI':['Cooper','Countryman','Aceman','Clubman'],
    'Mitsubishi':['ASX','Colt','Eclipse Cross','Outlander'],
    'Nissan':['Juke','Leaf','Micra','Qashqai','X-Trail','Ariya','Townstar'],
    'Opel':['Astra','Corsa','Crossland','Grandland','Mokka','Zafira'],
    'Peugeot':['108','208','308','408','508','2008','3008','5008','Rifter','Traveller'],
    'Porsche':['718 Boxster','718 Cayman','911','Cayenne','Macan','Panamera','Taycan'],
    'Renault':['Arkana','Austral','Captur','Clio','Espace','Kangoo','Mégane','Rafale','Scénic','Symbioz','Twingo','Zoe'],
    'SEAT':['Arona','Ateca','Ibiza','Leon','Tarraco'],
    'Škoda':['Enyaq','Fabia','Kamiq','Karoq','Kodiaq','Octavia','Scala','Superb'],
    'Smart':['Fortwo','Forfour','#1','#3','#5'],
    'Suzuki':['Across','Ignis','S-Cross','Swift','Vitara'],
    'Tesla':['Model 3','Model S','Model X','Model Y'],
    'Toyota':['Aygo X','C-HR','Corolla','GR Yaris','Highlander','Land Cruiser','Prius','RAV4','Yaris','Yaris Cross','bZ4X'],
    'Volkswagen':['Caddy','Golf','ID.3','ID.4','ID.5','ID.7','Passat','Polo','T-Cross','T-Roc','Tiguan','Touareg','Touran','Multivan'],
    'Volvo':['C40','EC40','EX30','EX40','EX90','S60','V60','V90','XC40','XC60','XC90']
  },
  utilitaires:{
    'Citroën':['Berlingo Van','Jumpy','Jumper'],
    'Fiat':['Doblo Cargo','Scudo','Ducato'],
    'Ford':['Transit Courier','Transit Connect','Transit Custom','Transit'],
    'Iveco':['Daily'],
    'MAN':['TGE'],
    'Mercedes-Benz':['Citan','Vito','Sprinter'],
    'Nissan':['Townstar','Primastar','Interstar'],
    'Opel':['Combo Cargo','Vivaro','Movano'],
    'Peugeot':['Partner','Expert','Boxer'],
    'Renault':['Kangoo Van','Trafic','Master'],
    'Toyota':['Proace City','Proace','Proace Max'],
    'Volkswagen':['Caddy Cargo','Transporter','Crafter']
  },
  motos:{
    'Aprilia':['RS 125','RS 457','RS 660','Tuono 660','Tuareg 660','RSV4'],
    'Benelli':['TRK 502','TRK 702','Leoncino'],
    'BMW Motorrad':['G 310 GS','F 800 GS','F 900 GS','F 900 R','R 1250 GS','R 1300 GS','R 1250 RT','S 1000 RR'],
    'Ducati':['Monster','Multistrada V2','Multistrada V4','Panigale V2','Panigale V4','Scrambler'],
    'Harley-Davidson':['Sportster S','Nightster','Street Glide','Road Glide','Pan America'],
    'Honda':['CB125R','CB500F','CB650R','CB1000R','CBR650R','Africa Twin','Forza 125','Forza 350','X-ADV','Gold Wing'],
    'Kawasaki':['Z125','Z500','Z650','Z900','Ninja 500','Ninja 650','Ninja ZX-6R','Versys 650','Versys 1000'],
    'KTM':['390 Duke','790 Duke','890 Duke','1290 Super Duke R','390 Adventure','890 Adventure'],
    'Piaggio':['Beverly 300','Beverly 400','MP3 300','MP3 530'],
    'Suzuki':['GSX-8S','GSX-8R','GSX-S1000','V-Strom 650','V-Strom 800','Hayabusa'],
    'Triumph':['Street Triple','Speed Triple','Trident 660','Tiger 900','Tiger 1200','Bonneville T120'],
    'Yamaha':['MT-07','MT-09','MT-10','Ténéré 700','Tracer 7','Tracer 9','TMAX','XMAX 125','XMAX 300','R7','R1','TDM 900']
  },
  caravaning:{
    'Adria':['Compact','Coral','Matrix','Twin'], 'Bürstner':['Lyseo','Nexxo','Campeo'], 'Chausson':['S','X','Titanium','V'],
    'Dethleffs':['Globebus','Trend','Just Go'], 'Font Vendôme':['Leader Camp','Master Van','Forty Van'],
    'Hymer':['Exsis','B-MC','Grand Canyon S'], 'Pilote':['P600','P650','P696','V600','V630'], 'Rapido':['C','6F','8F','V']
  },
  velos:{
    'Bianchi':[],'Cannondale':[],'Canyon':[],'Cube':[],'Decathlon / Van Rysel':[],'Giant':[],'Lapierre':[],'Moustache':[],'Orbea':[],'Scott':[],'Specialized':[],'Trek':[]
  },
  nautisme:{
    'Bayliner':[],'Beneteau':[],'Boston Whaler':[],'Jeanneau':[],'Quicksilver':[],'Sea Ray':[],'Yamaha':[],'Zodiac':[]
  }
};

function vehicleCatalogForCurrentType(){
  const sub=$('#vehicleSubcategory')?.value||'voitures';
  return VEHICLE_CATALOGS[sub]||VEHICLE_CATALOGS.voitures;
}
function populateVehicleMakes(keepValue=''){
  const list=$('#vehicleMakeList'); if(!list) return;
  const catalog=vehicleCatalogForCurrentType();
  list.innerHTML=Object.keys(catalog).sort((a,b)=>a.localeCompare(b,'fr')).map(v=>`<option value="${esc(v)}"></option>`).join('');
  if(keepValue) $('#vehicleMake').value=keepValue;
  populateVehicleModels($('#vehicleModel')?.value||'');
}
function findCatalogBrand(catalog,value){
  const v=String(value||'').trim().toLocaleLowerCase('fr');
  return Object.keys(catalog).find(k=>k.toLocaleLowerCase('fr')===v)||'';
}
function populateVehicleModels(keepValue=''){
  const list=$('#vehicleModelList'); if(!list) return;
  const catalog=vehicleCatalogForCurrentType();
  const brand=findCatalogBrand(catalog,$('#vehicleMake')?.value);
  const models=brand?(catalog[brand]||[]):[];
  list.innerHTML=models.map(v=>`<option value="${esc(v)}"></option>`).join('');
  if(keepValue) $('#vehicleModel').value=keepValue;
}
$('#vehicleMake')?.addEventListener('input',()=>populateVehicleModels(''));
$('#vehicleMake')?.addEventListener('change',()=>populateVehicleModels(''));

let locationSearchTimer=null;
let lastLocationSuggestions=[];
// 18/10/2026 : autocomplétion ville / code postal revue (Paris, Lyon, Marseille : tous les arrondissements ;
// recherche par début de code postal ; réponses lentes ignorées ; remplissage automatique quand il n'y a qu'un choix).
let locationSearchSeq=0;
const LOCATION_MAX_ROWS=30;
const deptCommunesCache=new Map();
const normLoc=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-’']/g,' ').replace(/\s+/g,' ').trim();
function hideLocationSuggestions(exceptId=''){
  ['citySuggestions','postalSuggestions'].forEach(id=>{if(id!==exceptId) $('#'+id)?.classList.add('hidden')});
}
function applyLocation(r){
  if(!r)return;
  $('#adCity').value=r.nom; $('#adPostalCode').value=r.codePostal;
  hideLocationSuggestions();
}
function renderLocationSuggestions(targetId,rows){
  const box=$('#'+targetId); if(!box) return;
  lastLocationSuggestions=rows;
  if(!rows.length){box.innerHTML='<div class="location-help" style="padding:9px 10px">Aucune commune trouvée.</div>';box.classList.remove('hidden');return;}
  box.innerHTML=rows.map((r,i)=>`<button type="button" class="location-suggestion" data-location-index="${i}"><b>${esc(r.nom)}</b><span>${esc(r.codePostal)}</span></button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-location-index]').forEach(btn=>{
    // mousedown empêché : le champ garde le focus sur ordinateur ; au doigt, le clic ne part pas si on fait défiler la liste.
    btn.addEventListener('mousedown',e=>e.preventDefault());
    btn.addEventListener('click',e=>{e.preventDefault();applyLocation(rows[Number(btn.dataset.locationIndex)]);});
  });
}
function communeRows(data){
  const rows=[];
  for(const c of Array.isArray(data)?data:[]){
    for(const cp of [...(c.codesPostaux||[])].sort()) rows.push({nom:c.nom,codePostal:cp,departement:c.codeDepartement||''});
  }
  const seen=new Set();
  return rows.filter(r=>{const k=r.nom+'|'+r.codePostal;if(seen.has(k))return false;seen.add(k);return true});
}
async function geoCommunes(query){
  const res=await fetch('https://geo.api.gouv.fr/communes?'+query+'&fields=nom,codesPostaux,codeDepartement&format=json',{headers:{Accept:'application/json'}});
  return res.ok?await res.json():[];
}
async function communesOfDepartement(dep){
  if(!deptCommunesCache.has(dep)) deptCommunesCache.set(dep,geoCommunes('codeDepartement='+encodeURIComponent(dep)).catch(()=>[]));
  return deptCommunesCache.get(dep);
}
async function fetchFrenchCommunes(value,mode='city'){
  const q=String(value||'').trim();
  if(q.length<2) return [];
  try{
    if(mode==='postal'){
      const digits=q.replace(/\D/g,'');
      if(digits.length===5) return communeRows(await geoCommunes('codePostal='+digits)).filter(r=>r.codePostal===digits).slice(0,LOCATION_MAX_ROWS);
      // Début de code postal (ex. « 750 ») : communes du département, filtrées sur le début du code.
      let deps=[digits.slice(0,2)];
      if(digits.startsWith('20')) deps=['2A','2B'];
      else if(/^9[78]/.test(digits)){if(digits.length<3)return [];deps=[digits.slice(0,3)];}
      const lists=await Promise.all(deps.map(communesOfDepartement));
      return communeRows(lists.flat()).filter(r=>r.codePostal.startsWith(digits)).sort((x,y)=>x.codePostal.localeCompare(y.codePostal)||x.nom.localeCompare(y.nom)).slice(0,LOCATION_MAX_ROWS);
    }
    const data=await geoCommunes('nom='+encodeURIComponent(q)+'&boost=population&limit=15');
    const target=normLoc(q);
    const list=Array.isArray(data)?data:[];
    // Le nom exact d'abord (avec tous ses codes postaux), puis les autres communes.
    const exact=list.filter(c=>normLoc(c.nom)===target), others=list.filter(c=>normLoc(c.nom)!==target);
    return [...communeRows(exact),...communeRows(others)].slice(0,LOCATION_MAX_ROWS);
  }catch(e){console.warn('Autocomplétion commune indisponible',e);return []}
}
function scheduleLocationSearch(mode){
  clearTimeout(locationSearchTimer);
  const input=mode==='city'?$('#adCity'):$('#adPostalCode');
  const target=mode==='city'?'citySuggestions':'postalSuggestions';
  const value=input?.value||'';
  hideLocationSuggestions(target);
  const seq=++locationSearchSeq;
  if(value.trim().length<2){$('#'+target)?.classList.add('hidden');return;}
  locationSearchTimer=setTimeout(async()=>{
    const rows=await fetchFrenchCommunes(value,mode);
    // Une réponse arrivée après une frappe plus récente est ignorée (elle afficherait une liste périmée).
    if(seq!==locationSearchSeq||(input?.value||'')!==value)return;
    renderLocationSuggestions(target,rows);
  },260);
}
// En quittant un champ sans choisir dans la liste : on complète l'autre champ s'il n'y a qu'une possibilité.
async function autoCompleteLocation(mode){
  const city=$('#adCity')?.value.trim()||'', postal=$('#adPostalCode')?.value.trim()||'';
  if(mode==='postal'&&/^\d{5}$/.test(postal)){
    const rows=await fetchFrenchCommunes(postal,'postal');
    if(($('#adPostalCode')?.value.trim()||'')!==postal)return;
    const match=rows.find(r=>normLoc(r.nom)===normLoc(city));
    if(match){$('#adCity').value=match.nom;return;}
    if(rows.length===1)$('#adCity').value=rows[0].nom;
  }else if(mode==='city'&&city.length>=2){
    const rows=(await fetchFrenchCommunes(city,'city')).filter(r=>normLoc(r.nom)===normLoc(city));
    if(($('#adCity')?.value.trim()||'')!==city||!rows.length)return;
    $('#adCity').value=rows[0].nom;
    if(rows.length===1){$('#adPostalCode').value=rows[0].codePostal;return;}
    // Plusieurs codes (Paris, Lyon, Marseille…) : on propose directement la liste des codes de cette ville.
    if(!rows.some(r=>r.codePostal===postal)){$('#adPostalCode').value='';renderLocationSuggestions('postalSuggestions',rows.slice(0,LOCATION_MAX_ROWS));}
  }
}
$('#adCity')?.addEventListener('input',()=>scheduleLocationSearch('city'));
$('#adCity')?.addEventListener('focus',()=>{if($('#adCity').value.trim().length>=2)scheduleLocationSearch('city')});
$('#adCity')?.addEventListener('change',()=>autoCompleteLocation('city'));
$('#adPostalCode')?.addEventListener('input',()=>{ $('#adPostalCode').value=$('#adPostalCode').value.replace(/\D/g,'').slice(0,5); scheduleLocationSearch('postal'); });
$('#adPostalCode')?.addEventListener('focus',()=>{if($('#adPostalCode').value.trim().length>=2)scheduleLocationSearch('postal')});
$('#adPostalCode')?.addEventListener('change',()=>autoCompleteLocation('postal'));
document.addEventListener('click',e=>{if(!e.target.closest('.autocomplete-wrap'))hideLocationSuggestions()});

function updatePublishFields(){
  const category=$('#adCategory').value;
  const sub=$('#vehicleSubcategory').value;
  const hasSubcategories=(SUBCATEGORIES[category]||[]).length>0;
  const isVehicles=category==='vehicules';
  const isRealEstate=category==='immobilier';
  const showVehicleDetails=isVehicles && VEHICLE_DETAIL_TYPES.includes(sub);
  const showEquipment=isVehicles && EQUIPMENT_TYPES.includes(sub);
  const showCondition=['vehicules','hightech','maison','mode','autres'].includes(category);
  const housingSubs=['vente-appartement','vente-maison','location','saisonniere'];
  const apartmentSubs=['vente-appartement','location','saisonniere'];
  const buildingSubs=['vente-appartement','vente-maison','location','saisonniere','bureaux-commerces'];
  const saleSubs=['vente-appartement','vente-maison','vente-terrain','vente-batiment'];
  const rentSubs=['location','saisonniere'];
  const coproSubs=['vente-appartement','location','saisonniere','bureaux-commerces'];
  const showHousing=isRealEstate&&housingSubs.includes(sub);
  const showApartment=isRealEstate&&apartmentSubs.includes(sub);
  const showBuilding=isRealEstate&&buildingSubs.includes(sub);
  const showSale=isRealEstate&&saleSubs.includes(sub);
  const showRent=isRealEstate&&rentSubs.includes(sub);
  const showCopro=isRealEstate&&coproSubs.includes(sub);
  const showLand=isRealEstate&&['vente-maison','vente-terrain'].includes(sub);
  const showSurface=isRealEstate&&sub!=='parking-garage';
  const showEnergy=showBuilding;

  $$('.vehicle-subcategory-row').forEach(x=>x.classList.toggle('hidden',!hasSubcategories));
  $$('.vehicle-field').forEach(x=>x.classList.toggle('hidden',!showVehicleDetails));
  if(showVehicleDetails) populateVehicleMakes($('#vehicleMake')?.value||'');
  $$('.equipment-type-row').forEach(x=>x.classList.toggle('hidden',!showEquipment));
  $$('.item-condition-row').forEach(x=>x.classList.toggle('hidden',!showCondition));
  $$('.realestate-field').forEach(x=>x.classList.toggle('hidden',!isRealEstate));
  $$('.realestate-housing-field').forEach(x=>x.classList.toggle('hidden',!showHousing));
  $$('.realestate-apartment-field').forEach(x=>x.classList.toggle('hidden',!showApartment));
  $$('.realestate-building-field').forEach(x=>x.classList.toggle('hidden',!showBuilding));
  $$('.realestate-sale-field').forEach(x=>x.classList.toggle('hidden',!showSale));
  $$('.realestate-rent-field').forEach(x=>x.classList.toggle('hidden',!showRent));
  $$('.realestate-copro-field').forEach(x=>x.classList.toggle('hidden',!showCopro));
  $$('.realestate-land-field').forEach(x=>x.classList.toggle('hidden',!showLand));
  $$('.realestate-surface-field').forEach(x=>x.classList.toggle('hidden',!showSurface));
  $$('.realestate-energy-field').forEach(x=>x.classList.toggle('hidden',!showEnergy));

  $('#vehicleSubcategory').required=hasSubcategories;
  $('#equipmentType').required=showEquipment;
  $('#itemCondition').required=showCondition;
  if(!showCondition) $('#itemCondition').value='';

  if(!showVehicleDetails){
    $('#vehicleMake').value=''; $('#vehicleModel').value=''; $('#vehicleYear').value='';
    if($('#vehicleMakeList')) $('#vehicleMakeList').innerHTML=''; if($('#vehicleModelList')) $('#vehicleModelList').innerHTML='';
    $('#vehicleMileage').value=''; $('#vehicleFuel').value=''; $('#vehicleTransmission').value=''; $('#vehicleCritAir').value='';
    for(const id of ['vehicleFirstRegistration','vehicleBody','vehicleDoors','vehicleSeats','vehiclePermit','vehicleFinish','vehicleVersion','vehicleColor','vehicleUpholstery','vehicleFiscalPower','vehicleDinPower','vehicleCo2','vehicleHistory','vehicleTechnicalInspection','vehicleMaintenance','vehicleWarranty']){
      const el=$('#'+id); if(el) el.value='';
    }
    $$('input[name="vehicleEquipment"]').forEach(x=>x.checked=false);
  }
  if(!isRealEstate){
    for(const id of ['immoSurface','immoLandSurface','immoRooms','immoBedrooms','immoBathrooms','immoFloor','immoTotalFloors','immoFurnished','immoYearBuilt','immoPropertyCondition','immoHeating','immoOrientation','immoNeighborhood','immoMandate','immoAvailableDate','immoDpe','immoGes','immoEnergyConsumption','immoDpeDate','immoEnergyCostMin','immoEnergyCostMax','immoCoownership','immoLots','immoAnnualCharges','immoPropertyTax','immoFees','immoRentCharges','immoDeposit']){
      const el=$('#'+id);if(el)el.value='';
    }
    $$('input[name="immoFeature"]').forEach(x=>x.checked=false);
  }
  if(!showEquipment) $('#equipmentType').value='';

  const title=$('#adTitle'),priceLabel=$('#adPriceLabel');
  if(priceLabel) priceLabel.textContent=(isRealEstate&&showRent)?'Loyer mensuel (€)':(isRealEstate?'Prix (€)':'Prix (€)');
  if(showEquipment) title.placeholder='Ex. 4 jantes Mercedes 19 pouces';
  else if(showVehicleDetails) title.placeholder='Ex. Peugeot 208 GT 2023';
  else if(category==='immobilier') title.placeholder=showRent?'Ex. Appartement 2 pièces 45 m² meublé':'Ex. Appartement 3 pièces 68 m² avec terrasse';
  else if(category==='hightech') title.placeholder='Ex. iPhone 15 Pro 256 Go';
  else if(category==='maison') title.placeholder='Ex. Canapé 3 places en excellent état';
  else title.placeholder='Décrivez clairement ce que vous proposez';
}
function toggleVehicleFields(){ updatePublishFields(); }

$('#adCategory').addEventListener('change', ()=>{
  populateSubcategories('');
  selectedPublishPack='free';selectedPublishOffers.clear();renderPublishPackPicker();
  updatePublishFields();
});
$('#vehicleSubcategory').addEventListener('change', updatePublishFields);
$('#sellerType').addEventListener('change',()=>{if(currentProfile?.is_admin!==true)return;syncPublishVisibility();renderPublishPackPicker();updatePublishFields();});

function accountAudience(){return currentProfile?.is_admin===true?($('#sellerType')?.value==='Professionnel'?'professionnel':'particulier'):(currentProfile?.account_type==='professionnel'?'professionnel':'particulier')}
function syncPublishVisibility(){
  const row=$('#proVisibilityRow'),select=$('#listingVisibility');
  if(!row||!select)return;
  const canChoose=accountAudience()==='professionnel'||currentProfile?.is_admin===true;
  row.classList.toggle('hidden',!canChoose);
  if(!canChoose)select.value='public';
}
function listingIsFeatured(a){return !!a?.featured_until && new Date(a.featured_until).getTime()>Date.now()}
function basePhotoLimitForAudience(audience=accountAudience(),category=$('#adCategory')?.value){if(audience==='professionnel'){if(proPlanPhotoLimit)return proPlanPhotoLimit;if(category==='hightech'||category==='maison'||category==='mode')return 8;if(category==='emploi'||category==='services')return 5;return 15}if(category==='immobilier'||category==='hightech'||category==='maison'||category==='mode')return 5;if(category==='vacances')return 15;return 3}
function listingPhotoLimit(a){let base;if(a?.seller_type==='professionnel'){base=(a?.category==='hightech'||a?.category==='maison'||a?.category==='mode')?8:((a?.category==='emploi'||a?.category==='services')?5:15)}else{base=(a?.category==='immobilier'||a?.category==='hightech'||a?.category==='maison'||a?.category==='mode')?5:(a?.category==='vacances'?15:3)}return Math.max(base,Math.min(45,Number(a?.photo_limit||base)))}
function listingHasPhotoPack(a){return a?.seller_type==='professionnel'?listingPhotoLimit(a)>=30:listingPhotoLimit(a)>=12}
function visiblePhotosFor(a){const photos=[...(a.listing_photos||[])].sort((x,y)=>(x.position||0)-(y.position||0));return photos.slice(0,listingPhotoLimit(a))}
function currentPublishPack(){return selectedPublishPack==='free'?null:PROMOTION_PACKS[selectedPublishPack]||null}
function setPublishPhotoLimit(){
  const pro=accountAudience()==='professionnel';
  const freeLimit=basePhotoLimitForAudience();
  publishPhotoLimit=editingId&&editingOriginalPhotoLimit?Math.max(freeLimit,editingOriginalPhotoLimit):freeLimit;
  if(selectedPhotos.length>publishPhotoLimit) selectedPhotos=selectedPhotos.slice(0,publishPhotoLimit);
  if(selectedPhotos.length<=6)showAllPhotoSlots=false;
  const l=$('#photoLimitLabel');if(l)l.innerHTML=`Photos <span class="note">(${publishPhotoLimit} maximum)</span>`;
  const q=$('#photoQuotaTitle');if(q)q.textContent=`Jusqu’à ${publishPhotoLimit} photo${publishPhotoLimit>1?'s':''} incluse${publishPhotoLimit>1?'s':''}`;
  renderSelectedPhotos();
}

// Formule 100 : 5 « À la une 7 jours » + 5 remontées offerts chaque mois (remis à zéro le 1er du mois).
let proMonthlyAllowance=null;
async function loadProMonthlyAllowance(){
  if(!sb||!currentUser||currentProfile?.account_type!=='professionnel'){proMonthlyAllowance=null;return null;}
  const {data,error}=await sb.rpc('get_my_pro_monthly_allowance');
  if(error){console.warn('Quota mensuel Pro indisponible',error);return proMonthlyAllowance;}
  const before=JSON.stringify(proMonthlyAllowance);
  proMonthlyAllowance=data&&data.eligible?data:null;
  if(before!==JSON.stringify(proMonthlyAllowance)&&typeof renderAds==='function'){try{renderAds();}catch(_){}}
  return proMonthlyAllowance;
}
function proMonthlyErrorMessage(error){
  const raw=String(error?.message||error?.details||'');
  if(raw.includes('no_monthly_featured_left'))return 'Vous avez utilisé vos 5 « À la une » offerts ce mois-ci.';
  if(raw.includes('no_monthly_bump_left'))return 'Vous avez utilisé vos 5 remontées offertes ce mois-ci.';
  if(raw.includes('listing_already_featured'))return 'Cette annonce est déjà à la une.';
  if(raw.includes('listing_not_active'))return 'Seule une annonce en ligne peut être mise en avant.';
  if(raw.includes('plan_100_required'))return 'Réservé à la formule 100 annonces.';
  return error?.message||'Action impossible pour le moment.';
}
async function useProMonthlyAllowance(id,kind,btn){
  if(!id||!['featured','bump'].includes(kind))return;
  if(btn)btn.disabled=true;
  try{
    const {data,error}=await sb.rpc('use_pro_monthly_allowance',{p_listing_id:id,p_kind:kind});
    if(error)throw error;
    proMonthlyAllowance={...(proMonthlyAllowance||{}),featured_left:data.featured_left,bumps_left:data.bumps_left,eligible:true};
    toast(kind==='featured'?'Annonce à la une pendant 7 jours · '+data.featured_left+' restant'+(data.featured_left>1?'s':'')+' ce mois-ci':'Annonce remontée en tête de liste · '+data.bumps_left+' remontée'+(data.bumps_left>1?'s':'')+' restante'+(data.bumps_left>1?'s':''));
    await loadAds();
  }catch(err){toast(proMonthlyErrorMessage(err));if(btn)btn.disabled=false;await loadProMonthlyAllowance();}
}
window.useProMonthlyAllowance=useProMonthlyAllowance;
async function refreshProPhotoAllowance(){
  if(!sb||!currentUser||accountAudience()!=='professionnel')return;
  const uid=currentUser.id;
  if(proPhotoAllowanceUser===uid)return;
  proPhotoAllowanceUser=uid;
  const {data,error}=await sb.from('pro_subscriptions').select('status,plan_code,billing_starts_at,current_period_end').eq('user_id',uid).maybeSingle();
  if(error){proPhotoAllowanceUser=null;return;}
  const proActive=!!data&&['active','trialing'].includes(data.status)&&(!data.current_period_end||new Date(data.current_period_end)>new Date()); proPlanPhotoLimit=proActive?(['pro_100','pro_250'].includes(data.plan_code)?45:(data.plan_code==='pro_50'?30:(data.plan_code==='pro_20'?15:null))):null; proPaidPhotoAllowance=(proPlanPhotoLimit||0)>=30;
  if(currentUser?.id===uid){setPublishPhotoLimit();renderPublishPackPicker();}
}
function publishOfferMatches(o,audience=accountAudience(),category=$('#adCategory')?.value){
  if(o.audience!==audience||!['featured','urgent','boost_pack','photo_option','daily_bump'].includes(o.offer_type))return false;
  if(o.offer_type!=='photo_option')return true;
  const categories={photo_auto_moto_15:['vehicules'],photo_immo_15:['immobilier'],photo_lifestyle_10:['hightech','maison','mode'],photo_services_emploi_10:['services','emploi']};
  return (categories[o.code]||[]).includes(category);
}
async function loadPublishCommerceOffers(){
  if(!currentUser||publishOffersLoading||publishOffersUser===currentUser.id)return;
  const uid=currentUser.id;publishOffersLoading=true;
  try{
    const {data,error}=await sb.rpc('get_my_commerce_pricing');
    if(error)throw error;
    if(currentUser?.id!==uid)return;
    publishCommerceOffers=data||[];publishOffersUser=uid;
  }catch(error){
    console.warn('Options de publication indisponibles',error);
    publishOffersUser=uid;
  }finally{
    publishOffersLoading=false;renderPublishPackPicker();
  }
}
// Fix 09/10/2026 (demande interne) : publication en 2 etapes. Etape 1 = formulaire, avec l'option
// "Photos supplementaires" pres des photos ; "Continuer" ouvre l'etape 2 = options de visibilite
// (A la une, Urgent, Boosts). Plusieurs options cumulables, une seule par type (une seule duree
// "A la une"), total calcule et paye en une fois (create-commerce-order, offer_codes).
function publishMoney(c){return (Number(c)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' € '+(accountAudience()==='professionnel'?'HT':'TTC')}
function publishChosenOffers(){return publishCommerceOffers.filter(o=>selectedPublishOffers.has(o.code)&&publishOfferMatches(o))}
function publishStepsActive(){return !editingId&&!!currentUser&&publishCommerceOffers.some(o=>publishOfferMatches(o)&&o.offer_type!=='photo_option')}
function togglePublishOffer(code){
  if(code==='free'){publishCommerceOffers.forEach(o=>{if(o.offer_type!=='photo_option')selectedPublishOffers.delete(o.code)});renderPublishPackPicker();return}
  const offer=publishCommerceOffers.find(o=>o.code===code);if(!offer)return;
  if(selectedPublishOffers.has(code))selectedPublishOffers.delete(code);
  else{publishCommerceOffers.forEach(o=>{if(o.offer_type===offer.offer_type)selectedPublishOffers.delete(o.code)});selectedPublishOffers.add(code)}
  renderPublishPackPicker();
}
function updatePublishStepUi(){
  const form=$('#publishForm');if(!form)return;
  const steps=publishStepsActive();if(!steps)publishStep=1;
  const step2=steps&&publishStep===2;
  form.classList.toggle('publish-step-2',step2);
  if(!editingId)$('#publishPackArea')?.classList.toggle('hidden',!step2);
  $('#publishBackBtn')?.classList.toggle('hidden',!step2);
  const btn=$('#publishSubmitBtn');
  if(btn&&!editingId&&!btn.disabled){
    const chosen=publishChosenOffers(),total=chosen.reduce((t,o)=>t+Number(o.amount_cents),0);
    btn.textContent=steps&&publishStep===1?'Continuer':(chosen.length?'Mettre en ligne et payer '+publishMoney(total):'Mettre en ligne');
  }
}
function renderPublishPackPicker(){
  const picker=$('#publishPackPicker'),help=$('#publishPackHelp');if(!picker)return;
  const offers=publishCommerceOffers.filter(o=>publishOfferMatches(o));
  [...selectedPublishOffers].forEach(c=>{if(!offers.some(o=>o.code===c))selectedPublishOffers.delete(c)});
  const optionDescription=o=>o.offer_type==='photo_option'?'Limite augmentée après paiement. Ajoutez ensuite les photos dans Modifier.':o.offer_type==='boost_pack'?'5 remontées ponctuelles · crédits sans expiration':o.offer_type==='featured'?'Mise en avant pendant '+(Number(o.duration_days)===1?'24 h':o.duration_days+' jours'):o.offer_type==='daily_bump'?'Remonte en tête des résultats chaque matin pendant '+o.duration_days+' jours':'Badge Urgent jusqu’à la fin de l’annonce';
  const card=(code,title,price,description,selected)=>'<button type="button" class="pack-card'+(selected?' selected':'')+'" data-publish-pack="'+esc(code)+'" aria-pressed="'+selected+'"><div class="pack-card-title">'+esc(title)+'</div><div class="pack-card-price">'+price+'</div><div class="pack-card-desc">'+esc(description)+'</div></button>';
  const photoOffers=offers.filter(o=>o.offer_type==='photo_option'),packOffers=offers.filter(o=>o.offer_type!=='photo_option');
  const photoPicker=$('#publishPhotoOptionPicker');
  if(photoPicker){
    photoPicker.closest('.publish-photo-option')?.classList.toggle('hidden',!photoOffers.length||!!editingId);
    photoPicker.innerHTML=photoOffers.map(o=>card(o.code,o.label,publishMoney(o.amount_cents),optionDescription(o),selectedPublishOffers.has(o.code))).join('');
  }
  // 15/10/2026 : présentation sobre — publication gratuite par défaut, options repliées dans une liste discrète.
  const anyPaid=packOffers.some(o=>selectedPublishOffers.has(o.code));
  const shortLabel=o=>o.offer_type==='featured'?(Number(o.duration_days)===1?'24 h':o.duration_days+' jours'):o.offer_type==='daily_bump'?o.duration_days+' jours':o.label;
  const row=o=>{const on=selectedPublishOffers.has(o.code);return '<button type="button" class="pub-row'+(on?' on':'')+'" data-publish-pack="'+esc(o.code)+'" aria-pressed="'+on+'"><span class="pub-tick" aria-hidden="true">'+(on?'✓':'')+'</span><span class="pub-row-label">'+esc(shortLabel(o))+'</span><span class="pub-row-price">'+publishMoney(o.amount_cents)+'</span></button>';};
  const groups=[
    ['featured','À la une','Votre annonce en tête de sa catégorie (une durée au choix)'],
    ['daily_bump','Remontée quotidienne','Remonte en haut des résultats chaque matin'],
    ['urgent','Badge Urgent','Badge « Urgent » jusqu’à la fin de l’annonce'],
    ['boost_pack','Pack de remontées','Remontées ponctuelles, sans date limite']
  ];
  const groupsHtml=groups.map(([type,title,desc])=>{const list=packOffers.filter(o=>o.offer_type===type);if(!list.length)return '';return '<div class="pub-group"><div class="pub-group-head"><strong>'+esc(title)+'</strong><span>'+esc(desc)+'</span></div><div class="pub-rows">'+list.map(row).join('')+'</div></div>';}).join('');
  const others=packOffers.filter(o=>!groups.some(g=>g[0]===o.offer_type));
  const othersHtml=others.length?'<div class="pub-group"><div class="pub-rows">'+others.map(row).join('')+'</div></div>':'';
  const wasOpen=picker.querySelector('details.pub-more')?.open;
  picker.innerHTML='<button type="button" class="pub-free'+(anyPaid?'':' on')+'" data-publish-pack="free" aria-pressed="'+(!anyPaid)+'"><span class="pub-tick" aria-hidden="true">'+(anyPaid?'':'✓')+'</span><span><strong>Publication gratuite</strong><span class="pub-free-sub">Votre annonce est mise en ligne après vérification, sans frais.</span></span></button>'
    +(packOffers.length?'<details class="pub-more"'+(anyPaid||wasOpen?' open':'')+'><summary>Booster la visibilité <span>(facultatif)</span></summary>'+groupsHtml+othersHtml+'</details>':'');
  document.querySelectorAll('#publishPackPicker [data-publish-pack],#publishPhotoOptionPicker [data-publish-pack]').forEach(button=>button.addEventListener('click',()=>togglePublishOffer(button.dataset.publishPack)));
  const chosen=publishChosenOffers(),total=chosen.reduce((t,o)=>t+Number(o.amount_cents),0);
  if(help)help.innerHTML=chosen.length
    ?'<strong>Votre sélection :</strong> '+chosen.map(o=>esc(o.label)+' ('+publishMoney(o.amount_cents)+')').join(' + ')+'<br><strong>Total : '+publishMoney(total)+'</strong> · un seul paiement. Après vérification de l’annonce, vous confirmerez le paiement sur la page suivante.'
    :publishOffersUser===currentUser?.id?'':'Chargement des options…';
  updatePublishStepUi();
  setPublishPhotoLimit();
  if(currentUser&&!publishOffersLoading&&publishOffersUser!==currentUser.id)loadPublishCommerceOffers();
}
function isProBoostCreditPack(code){return ['pro_5_7d','pro_10_7d','pro_5_30d','pro_10_30d'].includes(code)}
async function createPromotionOrder(){throw new Error('Tarification Abracadeal en cours de refonte.');}
async function goToPromotionCheckout(packCode,listingIds){
  const url=await createPromotionOrder(packCode,listingIds);
  try{
    if(isProBoostCreditPack(packCode))sessionStorage.setItem('abraca_pending_pro_boost',packCode);
    else sessionStorage.removeItem('abraca_pending_pro_boost');
  }catch(_){}
  location.href=url;
}
function promotionScopeForListing(a){
  const category=String(a?.category||'').toLowerCase();
  const sub=String(a?.subcategory||a?.vehicle_subcategory||'').toLowerCase();
  if(category==='immobilier')return 'immo';
  if(category==='vehicules'&&sub==='voitures')return 'auto';
  if(category==='hightech'||(category==='vehicules'&&['equipement-auto','equipement-moto','equipement-caravaning','equipement-nautisme','equipement-velo','pieces-detachees'].includes(sub)))return 'equipment';
  return 'equipment';
}
function promoPackList(){
  const audience=accountAudience();
  if(audience==='professionnel')return Object.values(PROMOTION_PACKS).filter(p=>p.audience==='professionnel'&&!['photo_30_pro'].includes(p.code));
  const target=allAds.find(a=>a.id===promoPreselectedListingId);
  const scope=promotionScopeForListing(target);
  return Object.values(PROMOTION_PACKS).filter(p=>p.audience==='particulier'&&p.scope===scope);
}
function renderPromotionModal(){
  const packs=promoPackList(),grid=$('#promotionPackGrid'),box=$('#promotionListings'),intro=$('#promotionIntro'),photoNote=$('#promotionPhotoNote');
  const proStore=accountAudience()==='professionnel';
  if(!packs.length)return;
  if(!promoSelectedPack||PROMOTION_PACKS[promoSelectedPack]?.audience!==accountAudience())promoSelectedPack=packs[0].code;
  const chosen=PROMOTION_PACKS[promoSelectedPack];
  grid.innerHTML=packs.map(p=>'<button type="button" class="pack-card '+(promoSelectedPack===p.code?'selected':'')+'" data-promo-pack="'+p.code+'"><div class="pack-card-title">'+p.title+'</div><div class="pack-card-price">'+p.price+'</div><div class="pack-card-desc">'+p.max+' Boost'+(p.max>1?'s':'')+' · '+p.days+' jours</div></button>').join('');
  grid.querySelectorAll('[data-promo-pack]').forEach(b=>b.addEventListener('click',()=>{promoSelectedPack=b.dataset.promoPack;renderPromotionModal();}));
  const listingArea=$('#promotionListingArea'),payBtn=$('#promotionPayBtn');
  if(proStore){
    listingArea?.classList.add('hidden');
    if(box)box.innerHTML='';
    if(intro)intro.textContent='Achetez un lot de crédits Boost. Ils restent disponibles dans votre espace Pro jusqu’à leur utilisation.';
    if(photoNote)photoNote.textContent='★ Boost premium · places limitées · 1 crédit utilisé = 1 annonce boostée pendant 7 ou 30 jours.';
    if(payBtn)payBtn.textContent='Acheter mes Boosts';
  }else{
    listingArea?.classList.remove('hidden');
    if(payBtn)payBtn.textContent='Continuer vers le paiement';
    const own=allAds.filter(a=>a.owner_id===currentUser?.id && !['rejected','archived'].includes(a.status));
    const pre=promoPreselectedListingId;
    box.innerHTML=own.length?own.map(a=>'<label class="promo-listing"><input type="checkbox" value="'+a.id+'" '+(pre===a.id?'checked':'')+'><span><b>'+esc(a.title)+'</b><br><small>'+esc(a.city||'')+' · '+money(a.price)+(listingIsFeatured(a)?' · déjà boostée':'')+'</small></span></label>').join(''):'<div class="empty-state">Aucune annonce disponible.</div>';
    if(pre){box.querySelectorAll('input').forEach(i=>{if(i.value!==pre)i.disabled=true;});}
    box.querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{
      const checked=[...box.querySelectorAll('input:checked')];
      if(checked.length>chosen.max){i.checked=false;toast('Ce pack accepte '+chosen.max+' annonce(s) maximum');}
    }));
    if(intro)intro.textContent='Choisissez la durée de mise en avant de cette annonce.';
    if(photoNote)photoNote.textContent='📷 Jusqu’à 3 photos incluses par annonce · Jusqu’à 12 avec le Pack Photos';
  }
}
function renderProBoostWallet(){
  const isPro=!!currentUser&&currentProfile?.account_type==='professionnel';
  const isAdmin=!!currentUser&&currentProfile?.is_admin===true;
  $('#proBoostWallet')?.classList.toggle('hidden',!isPro&&!isAdmin);
  const count7=Math.max(0,Number(proBoostWalletState[7]||0));
  const count30=Math.max(0,Number(proBoostWalletState[30]||0));
  if($('#proBoost7Count'))$('#proBoost7Count').textContent=isAdmin?'∞':String(count7);
  if($('#proBoost30Count'))$('#proBoost30Count').textContent=isAdmin?'∞':String(count30);
  if($('#useBoost7Balance'))$('#useBoost7Balance').textContent=isAdmin?'Boosts admin illimités':count7+' crédit'+(count7>1?'s':'')+' disponible'+(count7>1?'s':'');
  if($('#useBoost30Balance'))$('#useBoost30Balance').textContent=isAdmin?'Boosts admin illimités':count30+' crédit'+(count30>1?'s':'')+' disponible'+(count30>1?'s':'');
  if($('#useBoost7Btn'))$('#useBoost7Btn').disabled=!isAdmin&&count7<=0;
  if($('#useBoost30Btn'))$('#useBoost30Btn').disabled=!isAdmin&&count30<=0;
}
async function loadProBoostWallet(){
  if(!sb||!currentUser){
    proBoostWalletState={7:0,30:0};renderProBoostWallet();return proBoostWalletState;
  }
  if(currentProfile?.is_admin===true){
    proBoostWalletState={7:999999,30:999999};renderProBoostWallet();return proBoostWalletState;
  }
  if(currentProfile?.account_type!=='professionnel'){
    proBoostWalletState={7:0,30:0};renderProBoostWallet();return proBoostWalletState;
  }
  const {data,error}=await sb.from('pro_boost_wallet').select('duration_days,available_credits').eq('user_id',currentUser.id);
  if(error){console.warn('Portefeuille Boost indisponible',error);renderProBoostWallet();return proBoostWalletState;}
  const next={7:0,30:0};
  for(const row of (data||[])){
    const d=Number(row.duration_days);
    if(d===7||d===30)next[d]=Math.max(0,Number(row.available_credits||0));
  }
  proBoostWalletState=next;renderProBoostWallet();return next;
}
function openProBoostStore(){
  if(!currentUser||currentProfile?.account_type!=='professionnel'){toast('Compte professionnel requis');return;}
  toast('Tarification des Boosts en cours de refonte.');
}
async function openBoostCreditForListing(id){
  const isAdmin=currentProfile?.is_admin===true;
  if(!currentUser||(!isAdmin&&currentProfile?.account_type!=='professionnel')){toast('Compte professionnel requis');return;}
  const a=allAds.find(x=>x.id===id)||detailAdsCache.get(id);
  if(!a||(!isAdmin&&a.owner_id!==currentUser.id)){toast('Annonce introuvable');return;}
  if(!isAdmin&&a.seller_type!=='professionnel'){toast('Le Boost Pro est réservé aux annonces professionnelles');return;}
  if(listingIsFeatured(a)){toast('Cette annonce est déjà boostée');return;}
  boostCreditListingId=id;
  if($('#boostCreditTitle'))$('#boostCreditTitle').textContent='Booster · '+(a.title||'Annonce');
  if($('#boostCreditStatus'))$('#boostCreditStatus').textContent='Chargement de vos jetons…';
  openModal('boostCreditModal');
  await loadProBoostWallet();
  const total=Number(proBoostWalletState[7]||0)+Number(proBoostWalletState[30]||0);
  if($('#boostCreditStatus'))$('#boostCreditStatus').textContent=total>0?'Choisissez le jeton à utiliser.':'Aucun jeton disponible. Tarification des Boosts en cours de refonte.';
}
function boostRpcErrorMessage(error){
  const raw=String(error?.message||error?.details||error?.hint||'');
  if(raw.includes('no_boost_credit'))return 'Vous n’avez plus de jeton pour cette durée.';
  if(raw.includes('listing_already_boosted'))return 'Cette annonce est déjà boostée.';
  if(raw.includes('listing_not_owned'))return 'Vous ne pouvez booster que vos propres annonces.';
  if(raw.includes('listing_not_eligible'))return 'Cette annonce ne peut pas être boostée.';
  if(raw.includes('professional_account_required'))return 'Compte professionnel requis.';
  return error?.message||'Impossible d’utiliser ce jeton Boost.';
}
async function useProBoostCredit(durationDays){
  if(!boostCreditListingId)return;
  const days=Number(durationDays);
  const btn=days===7?$('#useBoost7Btn'):$('#useBoost30Btn');
  const status=$('#boostCreditStatus');
  const isAdmin=currentProfile?.is_admin===true;
  if(!isAdmin&&Number(proBoostWalletState[days]||0)<=0){toast('Aucun jeton '+days+' jours disponible');return;}
  if(btn)btn.disabled=true;
  if(status)status.textContent='Activation du Boost…';
  try{
    const {data,error}=await sb.rpc('consume_pro_boost',{p_listing_id:boostCreditListingId,p_duration_days:days});
    if(error)throw error;
    const adminUnlimited=!!data?.admin_unlimited;
    const remaining=adminUnlimited?null:Math.max(0,Number(data?.remaining_credits??(Number(proBoostWalletState[days]||0)-1)));
    if(!adminUnlimited)proBoostWalletState[days]=remaining;
    renderProBoostWallet();
    closeModal('boostCreditModal');
    boostCreditListingId=null;
    await loadAds();
    toast(adminUnlimited?'Boost admin offert · '+days+' jours':'Annonce boostée '+days+' jours · '+remaining+' jeton'+(remaining>1?'s':'')+' restant'+(remaining>1?'s':''));
  }catch(err){
    const message=boostRpcErrorMessage(err);
    if(status)status.textContent=message;
    toast(message);
    await loadProBoostWallet();
  }finally{
    if(btn)btn.disabled=currentProfile?.is_admin===true?false:Number(proBoostWalletState[days]||0)<=0;
  }
}
function openPromotionForListing(id){
  if(currentProfile?.is_admin===true||accountAudience()==='professionnel'){
    openBoostCreditForListing(id);return;
  }
  toast('Tarification des mises en avant en cours de refonte.');
}

function resetPublishForm(){
  $('#publishForm').reset(); selectedPhotos=[]; editingId=null; existingPhotoPaths=[]; editOriginalPhotos=[]; editPhotosLoading=false; selectedPublishPack='free'; selectedPublishOffers.clear(); publishStep=1; showAllPhotoSlots=false; pendingNoPhotoConfirm=false;
  editingOriginalOwnerId=null; editingOriginalStatus=null; editingOriginalSellerType=null; editingOriginalPhotoLimit=null;
  hideLocationSuggestions();
  $('#photoPreview').innerHTML=''; renderPublishPackPicker(); renderSelectedPhotos();
  $('#publishPackArea')?.classList.remove('hidden');
  $('#publishModal .modal-head h2').textContent='Publier une annonce';
  if($('#publishSubmitBtn')) $('#publishSubmitBtn').textContent='Mettre en ligne';
  if($('#publishStatus')) $('#publishStatus').textContent=''; populateSubcategories(''); updatePublishFields(); syncPublishVisibility();
  updatePublishStepUi();
}
$$('.publish-trigger').forEach(b=>b.addEventListener('click',async e=>{
  e.preventDefault();
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour publier');return}
  resetPublishForm();
  $('#sellerType').value=currentProfile?.account_type==='professionnel'?'Professionnel':'Particulier'; $('#sellerType').disabled=currentProfile?.is_admin!==true; syncPublishVisibility(); renderPublishPackPicker();
  $('#adPhone').value=currentProfile?.phone||'';
  openModal('publishModal');
}));

// Carte de partage particuliers : ouvrir directement le dépôt ou l'inscription.
if(new URLSearchParams(window.location.search).get('deposer')==='1'){
  if(currentUser){
    document.querySelector('.publish-trigger')?.click();
  }else{
    window.setAuthTab('signup');
    openModal('accountModal');
  }
  window.history.replaceState(null,'',window.location.pathname+window.location.hash);
}

// Fix 21/09/2026 : boutons de la confirmation "annonce sans photo" (demande interne).
document.getElementById('noPhotoPublishAnywayBtn')?.addEventListener('click',()=>{
  pendingNoPhotoConfirm=true;
  closeModal('noPhotoConfirmModal');
  $('#publishSubmitBtn')?.click();
});
document.getElementById('noPhotoAddPhotoBtn')?.addEventListener('click',()=>{
  closeModal('noPhotoConfirmModal');
  $('#photoAddBtn')?.click();
});


let editFormBaseline=null;
function editFormState(){return JSON.stringify([...$('#publishForm').querySelectorAll('input,select,textarea')].filter(x=>x.id!=='adPrice'&&x.type!=='file').map(x=>[x.id,x.name,(x.type==='checkbox'||x.type==='radio')?x.checked:x.value]));}
window.openAdminEditAd=function(id,ownerEdit=false){
  if(!currentProfile?.is_admin&&!ownerEdit){toast('Accès administrateur requis');return;}
  const a=allAds.find(x=>x.id===id)||detailAdsCache.get(id);
  if(!a){toast('Annonce introuvable');return;}
  if(ownerEdit&&(a.owner_id!==currentUser?.id||a.status!=='active'||a.revision_of)){toast('Annonce en ligne requise');return;}
  resetPublishForm();
  editingId=a.id;
  editingOriginalOwnerId=a.owner_id;
  editingOriginalStatus=a.status||'active';
  editingOriginalSellerType=a.seller_type||'particulier';
  editingOriginalPhotoLimit=Number(a.photo_limit||((a.seller_type==='professionnel')?15:3));
  existingPhotoPaths=(a.listing_photos||[]).map(p=>p.storage_path);
  loadExistingPhotosForEdit(a);

  $('#adCategory').value=a.category||'';
  const sub=vehicleSubcategoryOf(a)||'';
  populateSubcategories(sub);
  $('#vehicleSubcategory').value=sub;
  updatePublishFields();

  $('#adTitle').value=a.title||'';
  $('#adPrice').value=(a.price===null||a.price===undefined)?'':a.price;
  $('#adCity').value=a.city||'';
  $('#adPostalCode').value=a.postal_code||'';
  $('#adDescription').value=cleanDescription(a)||'';
  $('#itemCondition').value=a.item_condition||'';
  $('#sellerType').value=a.seller_type==='professionnel'?'Professionnel':'Particulier';
  $('#sellerType').disabled=true;
  syncPublishVisibility();
  if($('#listingVisibility'))$('#listingVisibility').value=a.visibility_scope||'public';
  $('#adShowPhone').checked=!!a.show_phone;

  $('#vehicleMake').value=a.vehicle_make||'';
  populateVehicleModels(a.vehicle_model||'');
  $('#vehicleModel').value=a.vehicle_model||'';
  $('#vehicleYear').value=a.vehicle_year??'';
  $('#vehicleMileage').value=a.mileage??'';
  $('#vehicleFuel').value=a.fuel||'';
  $('#vehicleTransmission').value=a.transmission||'';
  $('#vehicleCritAir').value=a.crit_air||'';

  const vm=vehicleMetaOf(a);
  const vehicleMap={
    vehicleFirstRegistration:'firstRegistration',vehicleBody:'body',vehicleDoors:'doors',vehicleSeats:'seats',vehiclePermit:'permit',
    vehicleFinish:'finish',vehicleVersion:'version',vehicleColor:'color',vehicleUpholstery:'upholstery',vehicleFiscalPower:'fiscalPower',
    vehicleDinPower:'dinPower',vehicleCo2:'co2',vehicleHistory:'history',vehicleTechnicalInspection:'technicalInspection',
    vehicleMaintenance:'maintenance',vehicleWarranty:'warranty'
  };
  Object.entries(vehicleMap).forEach(([id,key])=>{const el=$('#'+id);if(el)el.value=vm[key]??'';});
  $$('input[name="vehicleEquipment"]').forEach(x=>x.checked=(vm.equipment||[]).includes(x.value));

  const im=realEstateMetaOf(a);
  const immoMap={
    immoSurface:'surface',immoLandSurface:'landSurface',immoRooms:'rooms',immoBedrooms:'bedrooms',immoBathrooms:'bathrooms',
    immoFloor:'floor',immoTotalFloors:'totalFloors',immoFurnished:'furnished',immoYearBuilt:'yearBuilt',immoPropertyCondition:'propertyCondition',
    immoHeating:'heating',immoOrientation:'orientation',immoNeighborhood:'neighborhood',immoMandate:'mandate',immoAvailableDate:'availableDate',
    immoDpe:'dpe',immoGes:'ges',immoEnergyConsumption:'energyConsumption',immoDpeDate:'dpeDate',immoEnergyCostMin:'energyCostMin',
    immoEnergyCostMax:'energyCostMax',immoCoownership:'coownership',immoLots:'lots',immoAnnualCharges:'annualCharges',
    immoPropertyTax:'propertyTax',immoFees:'fees',immoRentCharges:'rentCharges',immoDeposit:'deposit'
  };
  Object.entries(immoMap).forEach(([id,key])=>{const el=$('#'+id);if(el)el.value=im[key]??'';});
  $$('input[name="immoFeature"]').forEach(x=>x.checked=(im.features||[]).includes(x.value));

  $('#publishPackArea')?.classList.add('hidden');
  $('#publishModal .modal-head h2').textContent=ownerEdit?'Modifier mon annonce':'Modifier l’annonce · Admin';
  $('#publishSubmitBtn').textContent=ownerEdit?'Enregistrer la baisse de prix ou proposer une modification':'Enregistrer';
  setPublishPhotoLimit();
  if(ownerEdit){sb.from('listing_contacts').select('phone').eq('listing_id',id).maybeSingle().then(({data})=>{if(editingId===id){$('#adPhone').value=data?.phone||'';editFormBaseline=editFormState();}});}
  $('#listingEditNotice')?.remove();
  if(ownerEdit){const notice=document.createElement('p');notice.id='listingEditNotice';notice.style.cssText='background:#f5eaf9;color:#3b1d4a;font-weight:600;font-size:12.5px;padding:10px 12px;border-radius:10px;line-height:1.45';notice.textContent='Baisse de prix seule : gratuite et illimitée, sans remontée. Toute autre modification : « Modifier et remonter mon annonce ». L’ancienne version et ses options restent en ligne pendant la vérification.';$('#publishForm').prepend(notice);sb.rpc('get_my_commerce_pricing').then(({data})=>{const offer=(data||[]).find(o=>o.code==='private_listing_edit');if(offer&&editingId===id)notice.textContent='Baisse de prix seule : gratuite et illimitée, sans remontée. Toute autre modification vous sera facturée '+(Number(offer.amount_cents)/100).toLocaleString('fr-FR',{minimumFractionDigits:2})+' € TTC. Après paiement et validation, votre annonce remontera en tête des résultats. L’ancienne version et ses options restent en ligne pendant la vérification.';});}
  editFormBaseline=editFormState();
  openModal('publishModal');
};

// Fix 09/10/2026 : en modification, les photos deja enregistrees sont chargees dans la galerie et
// comptent dans la limite (avant : "3 photos restantes" alors qu'une photo existait deja). L'image
// par defaut Abracadeal n'est jamais une photo de l'annonce : une annonce sans photo reste a 0.
// Les photos ne sont renvoyees au serveur que si elles ont change (sinon il les recopie).
function editPhotosChanged(){return selectedPhotos.length!==editOriginalPhotos.length||selectedPhotos.some((b,i)=>b!==editOriginalPhotos[i])}
async function loadExistingPhotosForEdit(a){
  const id=a.id,photos=[...(a.listing_photos||[])].filter(p=>p?.storage_path).sort((x,y)=>(x.position||0)-(y.position||0));
  if(!photos.length)return;
  editPhotosLoading=true;
  const meta=$('#photoGalleryMeta');if(meta)meta.textContent='Chargement des photos actuelles…';
  try{
    const blobs=await Promise.all(photos.map(async p=>{const r=await fetch(photoUrl(p.storage_path));if(!r.ok)throw Error('photo');return r.blob()}));
    if(editingId!==id)return;
    selectedPhotos=blobs;editOriginalPhotos=[...blobs];
  }catch(_){
    if(editingId===id)toast('Photos actuelles non chargées : elles seront conservées si vous n’en ajoutez pas.');
  }finally{
    if(editingId===id){editPhotosLoading=false;setPublishPhotoLimit();}
  }
}
// Safari (iPhone/Mac) ne sait pas encoder le WebP : canvas.toBlob('image/webp') y renvoie un PNG de 1 à 2 Mo.
// On détecte une fois et on bascule alors sur du JPEG, compressé de la même façon.
let abracaPhotoType=null;
function abracaEncodeType(){
  if(abracaPhotoType)return abracaPhotoType;
  try{const c=document.createElement('canvas');c.width=c.height=2;abracaPhotoType=c.toDataURL('image/webp').startsWith('data:image/webp')?'image/webp':'image/jpeg';}catch(_){abracaPhotoType='image/jpeg';}
  return abracaPhotoType;
}
const abracaExtFor=t=>t==='image/jpeg'?'jpg':t==='image/png'?'png':'webp';
async function compressImage(file){
  // Adaptive WebP: keep detail while avoiding oversized uploads.
  return new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=async()=>{
      try{
        // Identical quality policy for every category and subscription.
        const maxSide=1600;
        const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
        const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d');if(!ctx)throw Error('Compression indisponible');
        ctx.drawImage(img,0,0,w,h);
        const text='Abracadeal',fontSize=Math.max(24,Math.round(Math.min(w,h)*.05)),pad=Math.max(12,Math.round(fontSize*.72));
        ctx.save();ctx.font='700 '+fontSize+'px Georgia, serif';ctx.textAlign='right';ctx.textBaseline='bottom';ctx.globalAlpha=.8;ctx.lineJoin='round';ctx.lineWidth=Math.max(2,Math.round(fontSize*.12));ctx.strokeStyle='rgba(20,8,30,.75)';ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=Math.max(3,Math.round(fontSize*.2));ctx.strokeText(text,w-pad,h-pad);ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.fillText(text,w-pad,h-pad);ctx.restore();
        // Target 120 KiB for all images; allow 200 KiB if stronger compression visibly harms detail.
        const target=120*1024;
        const qualityFloor=.60;
        let best=null,bestUnderCap=null;
        for(let pass=0;pass<3;pass++){
          for(const quality of [.85,.78,.70,.60]){
            const blob=await new Promise(ok=>canvas.toBlob(ok,abracaEncodeType(),quality));
            if(!blob)throw Error('Impossible de compresser cette photo');
            if(!best||blob.size<best.size)best=blob;
            if(blob.size<=target){resolve(blob);return}
            // Keep detailed photos readable rather than forcing all images down to 120 KiB.
            if(blob.size<=200*1024 && quality>=qualityFloor && !bestUnderCap)bestUnderCap=blob;
          }
          if(pass<2){
            const smaller=document.createElement('canvas');
            smaller.width=Math.max(1,Math.round(canvas.width*.82));
            smaller.height=Math.max(1,Math.round(canvas.height*.82));
            smaller.getContext('2d').drawImage(canvas,0,0,smaller.width,smaller.height);
            canvas.width=smaller.width;canvas.height=smaller.height;
            canvas.getContext('2d').drawImage(smaller,0,0);
          }
        }
        resolve(bestUnderCap||best);
      }catch(err){reject(err)}finally{URL.revokeObjectURL(url)}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Image illisible'))};
    img.src=url;
  });
}
let activePhotoSlot=0;
let showAllPhotoSlots=false;

function renderSelectedPhotos(){
  const wrap=$('#photoSlots'); if(!wrap)return;
  const count=$('#photoCount'),toggle=$('#photoToggleBtn'),addNote=$('#photoAddNote'),addCta=$('#photoAddCta'),meta=$('#photoGalleryMeta');
  const remaining=Math.max(0,publishPhotoLimit-selectedPhotos.length);
  if(count)count.textContent=`${selectedPhotos.length} / ${publishPhotoLimit} ajoutée${selectedPhotos.length>1?'s':''}`;
  if(addNote)addNote.textContent=remaining>0?`${remaining} photo${remaining>1?'s':''} restante${remaining>1?'s':''} · import multiple possible.`:'Quota atteint · supprimez une photo pour en ajouter une autre.';
  if(addCta)addCta.textContent=!selectedPhotos.length?'Choisir des photos':(remaining>0?`Ajouter ${remaining} photo${remaining>1?'s':''}`:'Quota atteint');
  if(meta)meta.textContent=selectedPhotos.length?`${selectedPhotos.length} photo${selectedPhotos.length>1?'s':''} ajoutée${selectedPhotos.length>1?'s':''} · cliquez sur une vignette pour la remplacer.`:'Aucune photo ajoutée pour le moment';
  if(!selectedPhotos.length){
    wrap.innerHTML=`<div class="photo-slot empty-state"><span class="photo-slot-plus">+</span><span class="photo-slot-label">Ajoutez votre première photo</span></div>`;
    wrap.querySelector('.photo-slot')?.addEventListener('click',e=>{e.preventDefault();activePhotoSlot=0;$('#adPhotos').value='';$('#adPhotos').click();});
    if(toggle){toggle.classList.add('hidden');toggle.textContent='';}
    return;
  }
  const visible=showAllPhotoSlots?selectedPhotos:selectedPhotos.slice(0,6);
  wrap.innerHTML=visible.map((_,index)=>`<button type="button" class="photo-slot" data-slot="${index}" aria-label="Modifier la photo ${index+1}"></button>`).join('');
  [...wrap.querySelectorAll('.photo-slot')].forEach(slot=>{
    const index=Number(slot.dataset.slot||0),blob=selectedPhotos[index];
    const img=document.createElement('img');img.src=URL.createObjectURL(blob);img.alt=`Photo ${index+1}`;
    const remove=document.createElement('button');remove.type='button';remove.className='photo-slot-remove';remove.setAttribute('aria-label','Supprimer cette photo');remove.textContent='×';
    remove.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectedPhotos.splice(index,1);if(selectedPhotos.length<=6)showAllPhotoSlots=false;renderSelectedPhotos();});
    const number=document.createElement('span');number.className='photo-slot-number';number.textContent=index===0?'Photo principale':`Photo ${index+1}`;
    slot.append(img,remove,number);
    slot.addEventListener('click',e=>{e.preventDefault();activePhotoSlot=index;$('#adPhotos').value='';$('#adPhotos').click();});
  });
  const hiddenCount=Math.max(0,selectedPhotos.length-6);
  if(toggle){
    if(selectedPhotos.length>6){toggle.classList.remove('hidden');toggle.textContent=showAllPhotoSlots?'Réduire la galerie':`Voir ${hiddenCount} photo${hiddenCount>1?'s':''} de plus`;}
    else{toggle.classList.add('hidden');toggle.textContent='';}
  }
}

$('#photoAddBtn')?.addEventListener('click',()=>{
  if(selectedPhotos.length>=publishPhotoLimit){toast('Quota photo atteint pour cette formule');return;}
  activePhotoSlot=selectedPhotos.length;$('#adPhotos').value='';$('#adPhotos').click();
});
$('#photoToggleBtn')?.addEventListener('click',()=>{showAllPhotoSlots=!showAllPhotoSlots;renderSelectedPhotos();});

$('#adPhotos').addEventListener('change',async e=>{
  const files=[...e.target.files].filter(f=>f.type.startsWith('image/'));
  if(!files.length) return;

  /* Une case = une photo. Si plusieurs fichiers sont choisis, on remplit les cases libres à partir de la case cliquée. */
  let slotIndex=activePhotoSlot;

  for(const f of files){
    if(slotIndex>=publishPhotoLimit) break;
    const blob=await compressImage(f);

    if(selectedPhotos[slotIndex]){
      selectedPhotos[slotIndex]=blob;
    }else{
      while(slotIndex<publishPhotoLimit && selectedPhotos[slotIndex]) slotIndex++;
      if(slotIndex>=publishPhotoLimit) break;
      selectedPhotos[slotIndex]=blob;
    }
    slotIndex++;
  }

  selectedPhotos=selectedPhotos.slice(0,publishPhotoLimit);
  renderSelectedPhotos();
  e.target.value='';
});

async function uploadPhotos(listingId){
  if(!selectedPhotos.length) return;

  const rows=await Promise.all(selectedPhotos.map(async(blob,i)=>{
    const type=['image/webp','image/jpeg','image/png'].includes(blob?.type)?blob.type:'image/webp';
    const path=`${currentUser.id}/${listingId}/${crypto.randomUUID()}.${abracaExtFor(type)}`;
    const {error}=await sb.storage.from('listing-images-pending').upload(
      path,
      blob,
      {contentType:type,upsert:false,cacheControl:'3600'}
    );
    if(error) throw error;
    return {listing_id:listingId,storage_path:path,storage_bucket:'listing-images-pending',position:i+1};
  }));

  const {error}=await sb.from('listing_photos').insert(rows);
  if(error) throw error;
}
async function removePhotoPaths(paths){
  if(paths?.length)for(const bucket of ['listing-images','listing-images-pending']){const {error}=await sb.storage.from(bucket).remove(paths);if(error)console.warn(error);}
}

$('#publishForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentUser){toast('Connexion requise');return}
  if(!editingId&&publishStepsActive()&&publishStep===1){publishStep=2;renderPublishPackPicker();$('#publishModal .modal-body')?.scrollTo({top:0,behavior:'smooth'});return}

  const requestedVisibility=$('#listingVisibility')?.value==='pro'?'pro':'public';
  if(requestedVisibility==='pro'&&currentProfile?.is_admin!==true){
    const {data:proOk,error:proError}=await sb.rpc('b2b_is_professional');
    if(proError||proOk!==true){toast('Pro/Pro est réservé aux comptes professionnels vérifiés (SIRET).');return;}
  }

  const btn=e.submitter || $('#publishSubmitBtn');
  if(btn.disabled) return;

  const wasEditing=!!editingId;
  if(wasEditing&&editPhotosLoading){toast('Chargement des photos actuelles en cours, réessayez dans un instant.');return;}

  // Services : un compte professionnel classique dispose d'une seule annonce gratuite.
  // Cette règle est indépendante de l'offre Fondateurs. Les comptes Fondateurs / abonnés
  // conservent leurs quotas propres ; l'admin n'est jamais bloqué par ce contrôle UI.
  if(!wasEditing && currentProfile?.is_admin!==true && currentProfile?.account_type==='professionnel' && $('#adCategory').value==='services'){
    const {data:subscription,error:subscriptionError}=await sb.from('pro_subscriptions').select('status,billing_starts_at,current_period_end').eq('user_id',currentUser.id).maybeSingle();
    if(subscriptionError){toast('Impossible de vérifier votre offre professionnelle. Réessayez.');return;}
    const hasProOffer=!!subscription && ['active','trialing'].includes(String(subscription.status||'').toLowerCase());
    if(!hasProOffer){
      const {count,error:countError}=await sb.from('listings').select('id',{count:'exact',head:true}).eq('owner_id',currentUser.id).eq('category','services');
      if(countError){toast('Impossible de vérifier votre annonce gratuite. Réessayez.');return;}
      if(Number(count||0)>=1){toast('Votre annonce Services gratuite a déjà été utilisée. Choisissez une offre Pro pour publier une nouvelle annonce.');return;}
    }
  }

  // Fix 21/09/2026 : confirmation avant publication d'une annonce sans photo (demande interne).
  // Ne bloque jamais la publication : si l'utilisateur choisit "Publier quand meme",
  // pendingNoPhotoConfirm passe a true et on laisse continuer normalement.
  const hasAnyPhoto = selectedPhotos.length>0 || (existingPhotoPaths.length>0 && !editPhotosChanged());
  if(!hasAnyPhoto && !pendingNoPhotoConfirm){
    openModal('noPhotoConfirmModal');
    return;
  }
  pendingNoPhotoConfirm=false;

  const status=$('#publishStatus');
  btn.disabled=true;
  btn.classList.add('loading');
  btn.textContent=wasEditing?'Enregistrement...':'Publication...';
  if(status) status.textContent=selectedPhotos.length
    ?`Préparation de ${selectedPhotos.length} photo${selectedPhotos.length>1?'s':''}…`
    :'Enregistrement de l’annonce…';

  const payload={
    owner_id:wasEditing?(editingOriginalOwnerId||currentUser.id):currentUser.id,
    category:$('#adCategory').value,
    title:$('#adTitle').value.trim(),
    description:`${$('#vehicleSubcategory').value?`[ABRACA_SUB:${$('#vehicleSubcategory').value}]
`:''}${$('#equipmentType').value?`[ABRACA_EQUIP:${$('#equipmentType').value}]
`:''}${($('#adCategory').value==='vehicules'&&VEHICLE_DETAIL_TYPES.includes($('#vehicleSubcategory').value))?vehicleMetaMarker(vehicleMetaFromForm()):''}${$('#adCategory').value==='immobilier'?realEstateMetaMarker(realEstateMetaFromForm()):''}${$('#adDescription').value.trim()}`,
    price:$('#adPrice').value===''?null:Number($('#adPrice').value),
    city:$('#adCity').value.trim(),
    postal_code:$('#adPostalCode').value.trim(),
    show_phone:!!$('#adShowPhone')?.checked,
    item_condition:$('#itemCondition')?.value||null,
    seller_type:wasEditing?(editingOriginalSellerType||normalizeType($('#sellerType').value)):normalizeType($('#sellerType').value),
    visibility_scope:requestedVisibility,
    status:wasEditing?(editingOriginalStatus||'active'):'pending',
    vehicle_make:$('#vehicleMake').value.trim()||null,
    vehicle_model:$('#vehicleModel').value.trim()||null,
    vehicle_year:$('#vehicleYear').value?Number($('#vehicleYear').value):null,
    mileage:$('#vehicleMileage').value?Number($('#vehicleMileage').value):null,
    fuel:$('#vehicleFuel').value||null,
    transmission:$('#vehicleTransmission').value||null,
    crit_air:$('#vehicleCritAir').value||null,
    photo_limit:wasEditing?(editingOriginalPhotoLimit||basePhotoLimitForAudience(editingOriginalSellerType==='professionnel'?'professionnel':'particulier',$('#adCategory').value)):basePhotoLimitForAudience(accountAudience(),$('#adCategory').value)
  };

  try{
    let listingId=null;

    if(wasEditing&&currentProfile?.is_admin!==true){
      const {data:{session}}=await sb.auth.getSession();
      const response=await fetch(SUPABASE_URL+'/functions/v1/prepare-listing-edit',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({listing_id:editingId,changes:(!editPhotosChanged()&&editFormBaseline===editFormState())?{price:payload.price}:payload,replace_photos:editPhotosChanged(),phone:$('#adPhone').value.trim()||null})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Modification impossible');
      if(!result.price_only){if(editPhotosChanged())await uploadPhotos(result.listing_id);await requestAutomaticModeration(result.listing_id);}
      if(status)status.textContent=result.price_only?'Baisse de prix enregistrée gratuitement, sans remontée.':'Version proposée enregistrée. L’ancienne annonce reste en ligne.';
      await loadAds();closeModal('publishModal');resetPublishForm();
      if(!result.free){window.showPaymentLoading?.('Préparation du paiement…','Votre modification est enregistrée. Ouverture de la page de paiement, merci de patienter.');location.href='options-annonce.html?revision='+encodeURIComponent(result.listing_id);}
      else toast(result.price_only?'Prix mis à jour sans remontée.':'Modification envoyée pour vérification, sans remontée.');
      return;
    }else if(wasEditing){
      if(status) status.textContent='Enregistrement des modifications…';
      let editQuery=sb.from('listings').update(payload).eq('id',editingId);
      if(currentProfile?.is_admin!==true) editQuery=editQuery.eq('owner_id',currentUser.id);
      const {error}=await editQuery;
      if(error) throw error;

      if(editPhotosChanged()){
        if(status) status.textContent='Envoi des photos…';
        const {data:oldRows}=await sb.from('listing_photos').select('storage_path').eq('listing_id',editingId);
        const oldPaths=(oldRows||[]).map(x=>x.storage_path);
        await sb.from('listing_photos').delete().eq('listing_id',editingId);
        await removePhotoPaths(oldPaths);
        await uploadPhotos(editingId);
      }
      listingId=editingId;
    }else{
      if(status) status.textContent='Création de l’annonce…';
      const {data,error}=await sb.from('listings').insert(payload).select('id').single();
      if(error) throw error;
      listingId=data.id;

      try{
        const {error:contactError}=await sb.rpc('save_listing_contact',{
          p_listing_id:listingId,
          p_phone:$('#adPhone').value.trim()||null,
          p_contact_email:currentUser.email||null
        });
        if(contactError) throw contactError;
        if(selectedPhotos.length && status) status.textContent='Envoi des photos…';
        await uploadPhotos(listingId);
        if(status) status.textContent='Analyse de sécurité…';
        const moderation=await requestAutomaticModeration(listingId);
        window.__lastModerationResult=moderation;
      }catch(err){
        await sb.from('listings').delete().eq('id',listingId);
        throw err;
      }
    }

    const moderationResult=window.__lastModerationResult||null;
    window.__lastModerationResult=null;
    const autoPublished=moderationResult?.status==='active' || moderationResult?.auto_published===true;
    if(status) status.textContent=wasEditing?'Modifications enregistrées ✓':(autoPublished?'Annonce vérifiée et mise en ligne ✓':'Annonce envoyée pour vérification ✓');
    await loadAds();
    const paidOfferCodes=publishChosenOffers().map(o=>o.code);
    if(!wasEditing && paidOfferCodes.length && listingId){
      if(status) status.textContent='Ouverture du paiement sécurisé…';
      window.showPaymentLoading?.('Préparation du paiement…','Votre annonce est enregistrée. Ouverture de la page de paiement, merci de patienter.');
      closeModal('publishModal');resetPublishForm();
      location.href='options-annonce.html?options=1&listing='+encodeURIComponent(listingId)+'&offers='+encodeURIComponent(paidOfferCodes.join(','));
      return;
    }
    closeModal('publishModal');
    resetPublishForm();
    document.querySelector('#resultats')?.scrollIntoView({behavior:'smooth'});
    toast(autoPublished?'Annonce vérifiée et mise en ligne':'Annonce envoyée pour vérification');
    if(!wasEditing&&autoPublished&&listingId) setTimeout(()=>window.showPublishShareScreen?.(listingId),450);
  }catch(err){
    console.error(err);
    if(status) status.textContent='Échec de la publication';
    toast(err.message||'Erreur pendant la publication');
  }finally{
    btn.disabled=false;
    btn.classList.remove('loading');
    btn.textContent='Mettre en ligne';
    setTimeout(()=>{ if(status) status.textContent=''; },1800);
  }
});


function compactVehicleMeta(meta={}){
  const out={};
  for(const [k,v] of Object.entries(meta||{})){
    if(Array.isArray(v)){const arr=v.map(x=>String(x||'').trim()).filter(Boolean);if(arr.length)out[k]=arr;continue;}
    if(v===null||v===undefined||v==='')continue;
    out[k]=v;
  }
  return out;
}
function vehicleMetaMarker(meta={}){
  const clean=compactVehicleMeta(meta);
  return Object.keys(clean).length?`[ABRACA_VMETA:${encodeURIComponent(JSON.stringify(clean))}]\n`:'';
}
function vehicleMetaOf(a){
  const m=(a?.description||'').match(/^\[ABRACA_VMETA:([^\]]+)\]/m);
  if(!m)return {};
  try{return compactVehicleMeta(JSON.parse(decodeURIComponent(m[1])))}catch{return {}}
}
function vehicleMetaFromForm(){
  const val=id=>document.getElementById(id)?.value?.trim?.()||'';
  const num=id=>{const x=val(id);return x===''?'':Number(x)};
  return compactVehicleMeta({
    firstRegistration:val('vehicleFirstRegistration'),body:val('vehicleBody'),doors:val('vehicleDoors'),seats:val('vehicleSeats'),permit:val('vehiclePermit'),
    finish:val('vehicleFinish'),version:val('vehicleVersion'),color:val('vehicleColor'),upholstery:val('vehicleUpholstery'),
    fiscalPower:num('vehicleFiscalPower'),dinPower:num('vehicleDinPower'),co2:num('vehicleCo2'),history:val('vehicleHistory'),
    technicalInspection:val('vehicleTechnicalInspection'),maintenance:val('vehicleMaintenance'),warranty:val('vehicleWarranty'),
    equipment:$$('input[name="vehicleEquipment"]:checked').map(x=>x.value)
  });
}
function formatFirstRegistration(value){
  const s=String(value||'').trim();
  if(!s)return '';
  const m=s.match(/^(\d{4})-(\d{2})$/);return m?`${m[2]}/${m[1]}`:s;
}
function vehicleMetaSearchText(a){
  const m=vehicleMetaOf(a);
  return Object.values(m).flat().join(' ');
}
function compactRealEstateMeta(meta={}){
  const out={};
  for(const [k,v] of Object.entries(meta||{})){
    if(Array.isArray(v)){const arr=v.map(x=>String(x||'').trim()).filter(Boolean);if(arr.length)out[k]=arr;continue;}
    if(v===null||v===undefined||v==='')continue;
    out[k]=v;
  }
  return out;
}
function realEstateMetaMarker(meta={}){
  const clean=compactRealEstateMeta(meta);
  return Object.keys(clean).length?`[ABRACA_IMETA:${encodeURIComponent(JSON.stringify(clean))}]
`:'';
}
function realEstateMetaOf(a){
  const m=(a?.description||'').match(/^\[ABRACA_IMETA:([^\]]+)\]/m);
  if(!m)return {};
  try{return compactRealEstateMeta(JSON.parse(decodeURIComponent(m[1])))}catch{return {}}
}
function realEstateMetaFromForm(){
  const val=id=>document.getElementById(id)?.value?.trim?.()||'';
  const num=id=>{const x=val(id);return x===''?'':Number(x)};
  return compactRealEstateMeta({
    surface:num('immoSurface'),landSurface:num('immoLandSurface'),rooms:num('immoRooms'),bedrooms:num('immoBedrooms'),bathrooms:num('immoBathrooms'),
    floor:num('immoFloor'),totalFloors:num('immoTotalFloors'),furnished:val('immoFurnished'),yearBuilt:num('immoYearBuilt'),propertyCondition:val('immoPropertyCondition'),
    heating:val('immoHeating'),orientation:val('immoOrientation'),neighborhood:val('immoNeighborhood'),mandate:val('immoMandate'),availableDate:val('immoAvailableDate'),
    dpe:val('immoDpe'),ges:val('immoGes'),energyConsumption:num('immoEnergyConsumption'),dpeDate:val('immoDpeDate'),energyCostMin:num('immoEnergyCostMin'),energyCostMax:num('immoEnergyCostMax'),
    coownership:val('immoCoownership'),lots:num('immoLots'),annualCharges:num('immoAnnualCharges'),propertyTax:num('immoPropertyTax'),fees:val('immoFees'),rentCharges:num('immoRentCharges'),deposit:num('immoDeposit'),
    features:$$('input[name="immoFeature"]:checked').map(x=>x.value)
  });
}
function realEstateMetaSearchText(a){const m=realEstateMetaOf(a);return Object.values(m).flat().join(' ');}
function normalizeImmoSearchValue(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function realEstateTransactionOf(a){
  const m=realEstateMetaOf(a),raw=normalizeImmoSearchValue(m.transaction||'');
  if(/loc|louer|rent|lease/.test(raw))return 'location';
  if(/vente|vendre|sale/.test(raw))return 'vente';
  const sub=vehicleSubcategoryOf(a);
  if(['location','saisonniere'].includes(sub))return 'location';
  if(['vente-appartement','vente-maison','vente-terrain','vente-batiment'].includes(sub))return 'vente';
  const hay=normalizeImmoSearchValue(`${a?.title||''} ${cleanDescription(a)}`);
  if(/a louer|location|loyer/.test(hay))return 'location';
  if(/a vendre|vente/.test(hay))return 'vente';
  return '';
}
function realEstatePropertyTypeOf(a){
  const m=realEstateMetaOf(a),raw=normalizeImmoSearchValue(m.propertyType||'');
  const classify=v=>{
    if(/appartement|studio|apartment|flat/.test(v))return 'appartement';
    if(/maison|villa|house/.test(v))return 'maison';
    if(/terrain|land/.test(v))return 'terrain';
    if(/batiment|grange|hangar|ecurie|etable|bergerie/.test(v))return 'batiment';
    if(/parking|garage|box/.test(v))return 'parking-garage';
    if(/bureau|commerce|local|office|shop/.test(v))return 'bureaux-commerces';
    return '';
  };
  if(raw){const x=classify(raw);if(x)return x;}
  const sub=vehicleSubcategoryOf(a);
  if(sub==='vente-appartement')return 'appartement';
  if(sub==='vente-maison')return 'maison';
  if(sub==='vente-terrain')return 'terrain';
  if(sub==='vente-batiment')return 'batiment';
  if(sub==='parking-garage')return 'parking-garage';
  if(sub==='bureaux-commerces')return 'bureaux-commerces';
  const inferred=classify(normalizeImmoSearchValue(`${a?.title||''} ${cleanDescription(a)}`));
  return inferred||'autre';
}
function realEstateFeatureText(a){return (realEstateMetaOf(a).features||[]).map(normalizeImmoSearchValue).join(' | ');}
function realEstateHasOutdoor(a,type='any'){
  const f=realEstateFeatureText(a);
  if(type==='balcon')return f.includes('balcon');
  if(type==='terrasse')return f.includes('terrasse');
  if(type==='jardin')return f.includes('jardin');
  return ['balcon','terrasse','jardin','loggia','patio','cour'].some(x=>f.includes(x));
}
function realEstateHasParking(a,type='any'){
  const f=realEstateFeatureText(a);
  if(type==='parking')return f.includes('parking')||f.includes('stationnement');
  if(type==='garage')return f.includes('garage')||f.includes('box');
  return ['parking','stationnement','garage','box'].some(x=>f.includes(x));
}
function immoDpeMatches(actual,maximum){
  if(!maximum)return true;
  const a=String(actual||'').trim().toUpperCase(),m=String(maximum||'').trim().toUpperCase();
  if(m==='NON SOUMIS')return a==='NON SOUMIS';
  const ranks={A:1,B:2,C:3,D:4,E:5,F:6,G:7};
  return !!ranks[a]&&!!ranks[m]&&ranks[a]<=ranks[m];
}
function realEstateCardPriceHtml(a){
  const m=realEstateMetaOf(a),rental=realEstateTransactionOf(a)==='location',price=Number(a.price||0);
  if(rental){return `<div class="immo-card-price-main"><span>${money(a.price)}</span><span class="immo-card-price-suffix">/ mois</span></div>${m.rentCharges!==undefined?`<div class="immo-card-charges">+ ${formatImmoMoney(m.rentCharges)} de charges / mois</div>`:''}`;}
  const surface=Number(m.surface||0),unit=price>0&&surface>0?Math.round(price/surface):0;
  return `<div class="immo-card-price-main"><span>${money(a.price)}</span></div>${unit?`<div class="immo-card-unit-price">≈ ${unit.toLocaleString('fr-FR')} €/m²</div>`:''}`;
}
function realEstateCardSpecsHtml(a){
  const im=realEstateMetaOf(a),parts=[];
  const type=realEstatePropertyTypeOf(a);
  if(im.surface!==undefined)parts.push(`<span class="ad-spec immo-card-surface">${Number(im.surface).toLocaleString('fr-FR')} m²</span>`);
  else if(im.landSurface!==undefined)parts.push(`<span class="ad-spec immo-card-surface">${Number(im.landSurface).toLocaleString('fr-FR')} m² terrain</span>`);
  if(im.rooms!==undefined)parts.push(`<span class="ad-spec immo-card-extra-spec">${im.rooms} pièce${Number(im.rooms)>1?'s':''}</span>`);
  if(im.bedrooms!==undefined)parts.push(`<span class="ad-spec immo-card-extra-spec">${im.bedrooms} ch.</span>`);
  if(type==='appartement'&&im.floor!==undefined)parts.push(`<span class="ad-spec immo-card-extra-spec">Étage ${im.floor}</span>`);
  if(im.dpe){const grade=esc(String(im.dpe).toUpperCase());parts.push(`<span class="ad-spec immo-card-dpe ${energyGradeClass(im.dpe)}">DPE ${grade}</span>`);}
  return parts.length?`<div class="ad-specs">${parts.join('')}</div>`:'';
}
function updateRealEstateFilterLabels(){
  const immo=($('#filterCategory')?.value||activeCategory||'')==='immobilier';
  const tr=$('#filterImmoTransaction')?.value||'';
  const min=$('#filterPriceMinLabel'),max=$('#filterPriceMaxLabel');
  if(min)min.textContent=immo?(tr==='location'?'Loyer minimum':'Budget minimum'):'Prix minimum';
  if(max)max.textContent=immo?(tr==='location'?'Loyer maximum':'Budget maximum'):'Prix maximum';
}
let immoRadiusState={key:'',radius:0,ready:false,distances:new Map()};
let immoNearbyFilterState={active:false,radius:20,ready:false,distances:new Map()};
function clearImmoNearbyFilter(){
  immoNearbyFilterState={active:false,radius:20,ready:false,distances:new Map()};
  const btn=$('#immoNearbyFilterBtn');if(btn){btn.disabled=false;btn.textContent='📍 Voir les biens autour de moi';}
}
async function activateImmoNearbyFilter(){
  if(immoNearbyFilterState.active){clearImmoNearbyFilter();refreshFilterCount();renderAds();return;}
  if(!navigator.geolocation){toast('La localisation n’est pas disponible sur cet appareil.');return;}
  const btn=$('#immoNearbyFilterBtn');if(btn){btn.disabled=true;btn.textContent='📍 Localisation…';}
  navigator.geolocation.getCurrentPosition(async p=>{
    try{
      const userPos={lat:p.coords.latitude,lon:p.coords.longitude};
      const targets=(allAds||[]).filter(a=>a.category==='immobilier');
      const unique=new Map();targets.forEach(a=>{const k=`${a.postal_code||''}|${a.city||''}`;if(!unique.has(k))unique.set(k,{city:a.city,postal:a.postal_code});});
      const centres=new Map();await Promise.all([...unique].map(async([k,v])=>{try{const c=await communeCentre(v.city,v.postal);if(c)centres.set(k,c);}catch{}}));
      const distances=new Map();targets.forEach(a=>{const c=centres.get(`${a.postal_code||''}|${a.city||''}`);if(c)distances.set(a.id,haversineKm(userPos,c));});
      immoNearbyFilterState={active:true,radius:20,ready:true,distances};
      if($('#searchCity'))$('#searchCity').value='';
      if($('#filterImmoRadius'))$('#filterImmoRadius').value='0';
      immoRadiusState={key:'',radius:0,ready:false,distances:new Map()};
      if(btn){btn.disabled=false;btn.textContent='✓ Biens à moins de 20 km';}
      refreshFilterCount();renderAds();$('#resultats')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(err){console.error(err);clearImmoNearbyFilter();toast('Impossible de calculer les biens autour de vous.');}
  },()=>{clearImmoNearbyFilter();toast('Autorisez la localisation pour filtrer les biens autour de vous.');},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
}
async function refreshImmoRadiusState(){
  const radius=Number($('#filterImmoRadius')?.value||0),query=($('#searchCity')?.value||'').trim();
  if(!radius||!query){immoRadiusState={key:'',radius:0,ready:false,distances:new Map()};renderAds();return;}
  const key=`${query.toLowerCase()}|${radius}`;
  if(immoRadiusState.key===key&&immoRadiusState.ready){renderAds();return;}
  immoRadiusState={key,radius,ready:false,distances:new Map()};
  const postal=/^\d{5}$/.test(query)?query:'';
  const city=postal?'':query;
  let center=null;
  try{center=await communeCentre(city,postal)}catch{}
  if(!center){toast('Ville ou code postal introuvable pour le rayon');renderAds();return;}
  const targets=(allAds||[]).filter(a=>a.category==='immobilier');
  const unique=new Map();targets.forEach(a=>{const k=`${a.postal_code||''}|${a.city||''}`;if(!unique.has(k))unique.set(k,{city:a.city,postal:a.postal_code})});
  const centres=new Map();await Promise.all([...unique].map(async([k,v])=>{try{const c=await communeCentre(v.city,v.postal);if(c)centres.set(k,c)}catch{}}));
  const distances=new Map();targets.forEach(a=>{const c=centres.get(`${a.postal_code||''}|${a.city||''}`);if(c)distances.set(a.id,haversineKm(center,c));});
  immoRadiusState={key,radius,ready:true,distances};renderAds();
}
function listingEquipmentOf(a){return a?.category==='immobilier'?(realEstateMetaOf(a).features||[]):(vehicleMetaOf(a).equipment||[]);}
function formatImmoMoney(v){return Number(v).toLocaleString('fr-FR')+' €';}
function energyGradeClass(v){const x=String(v||'').trim().toUpperCase();return ['A','B','C','D','E','F','G'].includes(x)?`grade-${x.toLowerCase()}`:'grade-na';}
function diagnosticScaleHtml(kind,grade){
  const g=String(grade||'').trim().toUpperCase().replace('_',' ');
  if(!['A','B','C','D','E','F','G'].includes(g)) return `<span class="diagnostic-na">${esc(g||'Non renseigné')}</span>`;
  return `<div class="diagnostic-scale ${kind==='ges'?'climate':'energy'}">${['A','B','C','D','E','F','G'].map(x=>`<span class="diagnostic-grade g-${x.toLowerCase()}${x===g?' selected':''}">${x}</span>`).join('')}</div>`;
}

// SEO : titre de carte = vrai lien <a href> vers la page publique /annonce/<id>/ (crawlable par Google).
// Clic normal : on ouvre la fiche dans l'application comme avant ; Ctrl/Cmd/clic molette : nouvel onglet.
// 26/10/2026 : titres tout en MAJUSCULES affichés en minuscules (1re lettre en majuscule) ; le titre du vendeur n'est pas modifié en base.
function displayListingTitle(raw){
  const t=String(raw||'').trim();
  const letters=t.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g,'');
  if(letters.length<6) return t;
  const upper=letters.replace(/[^A-ZÀ-ÖØ-Þ]/g,'').length;
  if(upper/letters.length<0.7) return t;
  const low=t.toLocaleLowerCase('fr-FR');
  return low.charAt(0).toLocaleUpperCase('fr-FR')+low.slice(1);
}
window.displayListingTitle=displayListingTitle;
function listingAgeLabel(a){
  const d=new Date(a&&a.created_at||0); if(!a||!a.created_at||isNaN(d)) return '';
  const days=Math.floor((Date.now()-d.getTime())/86400000);
  if(days<=0) return "aujourd’hui";
  if(days===1) return 'hier';
  if(days<30) return 'il y a '+days+' jours';
  const m=Math.floor(days/30); if(m<12) return 'il y a '+m+' mois';
  return 'il y a plus d’un an';
}
// 26/10/2026 : on n'affiche plus l'ancienneté (« il y a 12 jours » joue contre nous tant que le trafic est faible) ; seulement un badge « Nouveau » de moins de 3 jours.
function listingIsNew(a){const d=new Date(a&&a.created_at||0);return !!(a&&a.created_at&&!isNaN(d)&&(Date.now()-d.getTime())<3*86400000);}
function adSeoTitle(a){
  const t=esc(displayListingTitle(a.title));
  const isPublic=a&&a.status==='active'&&(a.visibility_scope||'public')==='public'&&!a.revision_of&&/^[0-9a-f-]{36}$/i.test(String(a.id||''));
  return isPublic?`<a href="/annonce/${a.id}/" class="ad-seo-link" style="color:inherit;text-decoration:none" onclick="return adSeoClick(event,'${a.id}')">${t}</a>`:t;
}
window.adSeoClick=function(ev,id){
  ev.stopPropagation();
  if(ev.button||ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.altKey) return true;
  ev.preventDefault();
  openAd(id);
  return false;
};
function vehicleSubcategoryOf(a){
  const m=(a.description||'').match(/^\[ABRACA_SUB:([^\]]+)\]/m);
  return m?m[1]:'';
}
function subcategoryLabel(category,value){
  const item=(SUBCATEGORIES[category]||[]).find(([v])=>v===value);
  return item?item[1]:(value||catLabel(category));
}
function equipmentTypeOf(a){
  const m=(a.description||'').match(/^\[ABRACA_EQUIP:([^\]]+)\]/m);
  return m?m[1]:'';
}
function importedRefOf(a){
  const m=(a?.description||'').match(/^\[ABRACA_REF:([^\]]+)\]/m);
  return m?m[1].trim():'';
}
function cleanDescription(a){
  return (a.description||'')
    .replace(/^\[ABRACA_SUB:[^\]]+\]\s*/gm,'')
    .replace(/^\[ABRACA_EQUIP:[^\]]+\]\s*/gm,'')
    .replace(/^\[ABRACA_VMETA:[^\]]+\]\s*/gm,'')
    .replace(/^\[ABRACA_IMETA:[^\]]+\]\s*/gm,'')
    .replace(/^\[ABRACA_REF:[^\]]+\]\s*/gm,'')
    .replace(/^\[ABRACA_SOURCE:[^\]]+\]\s*/gm,'')
    .trim();
}
function vehicleSubLabel(v){ return subcategoryLabel('vehicules',v); }

async function loadFavorites(){
  favoriteIds=new Set();
  if(!currentUser) return;
  const {data,error}=await sb.from('favorites').select('listing_id').eq('user_id',currentUser.id);
  if(error){ console.error(error); return; }
  favoriteIds=new Set((data||[]).map(x=>x.listing_id));
}
function publicListingUrl(id){
  const u=new URL(location.href);
  u.search=''; u.hash='';
  u.searchParams.set('annonce',id);
  return u.toString();
}
function listingShareText(id){
  const a=allAds.find(x=>x.id===id)||detailAdsCache.get(id);
  return a?`${a.title}${a.price!==null&&a.price!==''?' - '+money(a.price):''} sur Abracadeal`:'Annonce Abracadeal';
}
let sharedListingHandled=false;
async function openSharedListingFromUrl(){
  if(sharedListingHandled) return;
  const params=new URLSearchParams(location.search);
  const adminPreviewId=params.get('admin_preview');
  const publicId=params.get('annonce');
  const id=adminPreviewId||publicId;
  if(!id) return;

  // Aperçu admin : autorise la fiche complète quel que soit le statut,
  // mais uniquement après confirmation du rôle administrateur.
  if(adminPreviewId && !currentProfile?.is_admin){
    toast('Accès administrateur requis');
    return;
  }

  sharedListingHandled=true;
  let ad=allAds.find(x=>x.id===id)||detailAdsCache.get(id);

  if(!ad && sb){
    try{
      let query=sb.from('listings')
        .select('id,owner_id,revision_of,category,title,description,price,city,seller_type,status,source,external_id,external_url,last_synced_at,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,created_at,updated_at,show_phone,item_condition,postal_code,featured_until,promotion_tier,photo_limit,crit_air,loa_available,loa_monthly,listing_reference,expires_at,archived_at,archive_reason,retention_until,visibility_scope,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value,listing_photos(id,storage_path,storage_bucket,position)')
        .eq('id',id);
      if(!adminPreviewId){
        query=query.eq('status','active').eq('visibility_scope','public');
      }
      const {data,error}=await query.maybeSingle();
      if(!error && data){ad=data;detailAdsCache.set(id,data);}
    }catch(err){console.error('Recherche directe de l’annonce impossible',err);}
  }

  if(ad){setTimeout(()=>openAd(id),0);return;}
  toast(adminPreviewId?'Annonce introuvable':'Cette annonce est introuvable ou n’est plus en ligne');
}
let activeShareListingId=null;
function closeShareMenu(){const pop=document.getElementById('globalSharePopover');if(pop)pop.classList.add('hidden');activeShareListingId=null;}
function ensureGlobalSharePopover(){
  let pop=document.getElementById('globalSharePopover');
  if(pop)return pop;
  pop=document.createElement('div');pop.id='globalSharePopover';pop.className='global-share-popover hidden';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Partager l’annonce');
  pop.innerHTML=`<div class="share-popover-head"><strong>Partager l’annonce</strong><button type="button" class="share-popover-close" aria-label="Fermer">×</button></div><div class="share-popover-grid"><button type="button" class="share-option whatsapp" data-share-action="whatsapp">● <span>WhatsApp</span></button><button type="button" class="share-option facebook" data-share-action="facebook">f <span>Facebook</span></button><button type="button" class="share-option sms" data-share-action="sms">✉ <span>SMS</span></button><button type="button" class="share-option copy" data-share-action="copy">⧉ <span>Copier le lien</span></button><button type="button" class="share-option more" data-share-action="more">••• <span>Plus d’options</span></button></div><div class="share-security-note">Le lien ouvre directement l’annonce Abracadeal.</div>`;
  pop.addEventListener('click',async e=>{
    e.stopPropagation();const close=e.target.closest('.share-popover-close');if(close){closeShareMenu();return}
    const btn=e.target.closest('[data-share-action]');if(!btn||!activeShareListingId)return;const id=activeShareListingId,action=btn.dataset.shareAction;
    if(action==='whatsapp')shareListingWhatsApp(id);else if(action==='facebook')shareListingFacebook(id);else if(action==='sms')shareListingSms(id);else if(action==='copy')await copyListingLink(id);else if(action==='more')await shareListingNative(id);
    if(action!=='more')closeShareMenu();
  });
  document.body.appendChild(pop);
  return pop;
}
function positionShareMenu(pop,anchor){
  pop.classList.remove('hidden');pop.style.left='12px';pop.style.top='12px';
  const r=anchor?.getBoundingClientRect?.();const w=pop.offsetWidth||300,h=pop.offsetHeight||220;
  if(!r){pop.style.left=Math.max(10,(innerWidth-w)/2)+'px';pop.style.top=Math.max(10,(innerHeight-h)/2)+'px';return}
  const left=Math.min(innerWidth-w-10,Math.max(10,r.right-w));
  const below=r.bottom+8,above=r.top-h-8;const top=(below+h<=innerHeight-10)?below:Math.max(10,above);
  pop.style.left=left+'px';pop.style.top=top+'px';
}
/* Fix 21/09/2026 : sur certains mobiles, un appui sur une icone de partage pouvait
   declencher deux fois la meme action (double ouverture SMS/WhatsApp/etc.), a cause d'un
   double declenchement de l'evenement clic. On ignore tout second appel identique tres
   rapproche (moins d'1 seconde) pour la meme annonce et le meme canal. */
let lastShareActionKey='',lastShareActionAt=0;
function shareActionOnce(key){
  const now=Date.now();
  if(key===lastShareActionKey && (now-lastShareActionAt)<1000) return false;
  lastShareActionKey=key;lastShareActionAt=now;
  // 29/10/2026 : partage compté pour le bilan mensuel du vendeur (le vendeur lui-même n'est pas compté).
  const sharedId=String(key).split(':')[1];if(sharedId)trackListingEvent(sharedId,'share');
  return true;
}
window.copyListingLink=async(id)=>{
  if(!shareActionOnce('copy:'+id))return;
  const url=publicListingUrl(id);
  try{await navigator.clipboard.writeText(url);toast('Lien copié');}
  catch{prompt('Copiez ce lien :',url);}
};
window.shareListingWhatsApp=id=>{if(!shareActionOnce('whatsapp:'+id))return;const text=encodeURIComponent(listingShareText(id)+' '+publicListingUrl(id));window.open('https://wa.me/?text='+text,'_blank','noopener');};
window.shareListingFacebook=id=>{if(!shareActionOnce('facebook:'+id))return;const url=encodeURIComponent(publicListingUrl(id));window.open('https://www.facebook.com/sharer/sharer.php?u='+url,'_blank','noopener,width=700,height=600');};
window.shareListingSms=id=>{if(!shareActionOnce('sms:'+id))return;const body=encodeURIComponent(listingShareText(id)+' '+publicListingUrl(id));location.href='sms:?&body='+body;};
window.shareListingNative=async id=>{if(!shareActionOnce('native:'+id))return;const url=publicListingUrl(id),text=listingShareText(id);if(navigator.share){try{await navigator.share({title:'Abracadeal',text,url})}catch(e){if(e?.name!=='AbortError')console.warn(e)}}else{await copyListingLink(id)}closeShareMenu();};
/* 26/10/2026 : écran « Partagez votre annonce » juste après une mise en ligne réussie
   (le vendeur est le plus motivé à ce moment-là : chaque partage amène des visiteurs gratuits). */
window.showPublishShareScreen=function(id){
  if(!id) return;
  let wrap=document.getElementById('publishShareScreen');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='publishShareScreen';wrap.className='publish-share-backdrop';
    wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','publishShareTitle');
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-pss-close]'))wrap.classList.remove('open');});
  }
  const ic={
    wa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z"/></svg>',
    fb:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z"/></svg>',
    sms:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M4 5h16v11H9l-5 4V5Z"/></svg>',
    link:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg>'
  };
  wrap.innerHTML=`<div class="publish-share-card">
    <button type="button" class="publish-share-close" data-pss-close aria-label="Fermer">×</button>
    <div class="publish-share-emoji" aria-hidden="true">🎉</div>
    <h2 id="publishShareTitle">Votre annonce est en ligne !</h2>
    <p>Partagez-la maintenant pour <strong>vendre plus vite</strong> : vos contacts la voient tout de suite.</p>
    <div class="publish-share-grid">
      <button type="button" class="pss-btn pss-wa" onclick="shareListingWhatsApp('${id}')">${ic.wa}<span>WhatsApp</span></button>
      <button type="button" class="pss-btn pss-fb" onclick="shareListingFacebook('${id}')">${ic.fb}<span>Facebook</span></button>
      <button type="button" class="pss-btn pss-sms" onclick="shareListingSms('${id}')">${ic.sms}<span>SMS</span></button>
      <button type="button" class="pss-btn pss-link" onclick="copyListingLink('${id}')">${ic.link}<span>Copier le lien</span></button>
    </div>
    <button type="button" class="publish-share-later" data-pss-close>Plus tard</button>
  </div>`;
  wrap.classList.add('open');
};
window.shareListingSmart=(id,event)=>{
  if(event){event.preventDefault();event.stopPropagation();}
  const pop=ensureGlobalSharePopover();
  if(activeShareListingId===id&&!pop.classList.contains('hidden')){closeShareMenu();return}
  activeShareListingId=id;positionShareMenu(pop,event?.currentTarget||null);
};
document.addEventListener('click',e=>{const pop=document.getElementById('globalSharePopover');if(pop&&!pop.classList.contains('hidden')&&!e.target.closest('#globalSharePopover')&&!e.target.closest('[data-share-listing]'))closeShareMenu();});
window.addEventListener('resize',closeShareMenu);window.addEventListener('scroll',closeShareMenu,true);

const favoriteCountCache=new Map();
async function getListingFavoriteCount(id,force=false){
  if(!force&&favoriteCountCache.has(id))return favoriteCountCache.get(id);
  try{const {data,error}=await sb.rpc('get_listing_favorite_count',{p_listing_id:id});if(error)throw error;const n=Number(data||0);favoriteCountCache.set(id,n);return n}catch(e){console.warn('Compteur de favoris indisponible',e);return 0}
}
function paintFavoriteCount(id,n){
  document.querySelectorAll('[data-fav-count-id]').forEach(el=>{if(el.dataset.favCountId===id)el.textContent=n>0?String(n):''});
  const detail=document.getElementById(`detailFavoriteCount-${id}`);if(detail)detail.textContent=n>0?String(n):'';
}
window.hydrateFavoriteCounts=async(root=document)=>{
  const ids=[...new Set([...root.querySelectorAll('[data-fav-count-id]')].map(el=>el.dataset.favCountId).filter(Boolean))];
  await Promise.all(ids.map(async id=>paintFavoriteCount(id,await getListingFavoriteCount(id))));
};
window.refreshDetailFavoriteCount=async id=>{favoriteCountCache.delete(id);paintFavoriteCount(id,await getListingFavoriteCount(id,true));};

/* Fix 20/09/2026 : affiche le nom du vendeur professionnel sur la pastille (public_profiles.display_name),
   sur le meme principe d'hydratation asynchrone que les compteurs de favoris ci-dessus. */
const proNameCache=new Map();
function paintProName(ownerId,name){
  document.querySelectorAll('[data-pro-name-owner]').forEach(el=>{if(el.dataset.proNameOwner===ownerId&&name)el.textContent=name;});
}
window.hydrateProNames=async(root=document)=>{
  const ids=[...new Set([...root.querySelectorAll('[data-pro-name-owner]')].map(el=>el.dataset.proNameOwner).filter(Boolean))];
  const missing=ids.filter(id=>!proNameCache.has(id));
  if(missing.length){
    try{
      const {data,error}=await sb.from('public_profiles').select('id,display_name').in('id',missing);
      if(error) throw error;
      missing.forEach(id=>proNameCache.set(id,null));
      (data||[]).forEach(p=>proNameCache.set(p.id,p.display_name||null));
    }catch(e){console.warn('Nom professionnel indisponible',e);missing.forEach(id=>proNameCache.set(id,null));}
  }
  ids.forEach(id=>paintProName(id,proNameCache.get(id)));
};
function listingCardActions(a){
  const active=favoriteIds.has(a.id);
  const share=`<button type="button" class="card-action-btn share-action" data-share-listing="${a.id}" aria-label="Partager l’annonce" title="Partager" onclick="shareListingSmart('${a.id}',event)"><svg class="share-node-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="M8.3 10.8 15.7 6.2M8.3 13.2l7.4 4.6"></path></svg></button>`;
  if(a.is_showroom) return `<div class="card-photo-actions" onclick="event.stopPropagation()">${share}</div>`;
  return `<div class="card-photo-actions" onclick="event.stopPropagation()">${share}<button type="button" data-favorite-id="${a.id}" class="card-action-btn favorite-action ${active?'active':''}" aria-label="${active?'Retirer des favoris':'Ajouter aux favoris'}" title="Favori" onclick="toggleFavorite('${a.id}',event)"><span class="heart-icon">${active?'♥':'♡'}</span><span class="fav-count-inline" data-fav-count-id="${a.id}"></span></button></div>`;
}

window.carouselStep=function(el,dir){
  if(!el) return;
  let urls;
  try{urls=JSON.parse(decodeURIComponent(el.dataset.photoUrls||''));}catch(e){urls=[];}
  if(!Array.isArray(urls)||urls.length<2) return;
  const idx=((parseInt(el.dataset.photoIdx||'0',10)+dir)%urls.length+urls.length)%urls.length;
  el.dataset.photoIdx=idx;
  const img=el.querySelector('.ad-photo-img');
  if(img){
    img.style.display='';
    el.classList.remove('image-fallback');
    // Fix 22/09/2026 : meme correctif que selectDetailPhoto (fiche annonce) plus bas dans le
    // fichier - reinitialise l'etat de secours a chaque navigation carousel sur la pastille,
    // sinon une photo cassee plus tot dans le carrousel empechait le fallback de se redeclencher
    // sur une autre photo cassee ensuite (retour utilisateur : "une photo par defaut et une
    // autre invisible, celle par defaut ne revient jamais").
    img.dataset.abracaFallback='';
    img.classList.remove('abraca-default-photo');
    const wm=el.querySelector('.photo-watermark');
    if(wm)wm.classList.remove('hidden');
    img.src=urls[idx];
  }
  el.querySelectorAll('.carousel-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
};
(function(){
  let sx=null,sy=null,box=null;
  document.addEventListener('touchstart',e=>{
    const b=e.target.closest('.ad-photo[data-photo-urls]');
    if(!b){box=null;return;}
    box=b;sx=e.touches[0].clientX;sy=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    if(!box||sx===null) return;
    const t=e.changedTouches[0];
    const dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.4) carouselStep(box,dx<0?1:-1);
    box=null;sx=null;sy=null;
  },{passive:true});
})();
window.toggleFavorite=async(id,event)=>{
  if(event){event.preventDefault();event.stopPropagation();}
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour enregistrer vos favoris');return;}
  if(favoriteIds.has(id)){
    const {error}=await sb.from('favorites').delete().eq('user_id',currentUser.id).eq('listing_id',id);
    if(error){toast(error.message);return;}
    favoriteIds.delete(id);toast('Retiré des favoris');
  }else{
    const {error}=await sb.from('favorites').insert({user_id:currentUser.id,listing_id:id});
    if(error){toast(error.message);return;}
    favoriteIds.add(id);toast('Ajouté aux favoris');
  }
  favoriteCountCache.delete(id);
  if(favoritesMode) await loadAds(); else renderAds();
  document.querySelectorAll('[data-favorite-id]').forEach(btn=>{if(btn.dataset.favoriteId===id){const active=favoriteIds.has(id);btn.classList.toggle('active',active);btn.setAttribute('aria-label',active?'Retirer des favoris':'Ajouter aux favoris');const heart=btn.querySelector('.heart-icon');if(heart)heart.textContent=active?'♥':'♡';}});
  const btn=document.getElementById(`detailFavoriteBtn-${id}`);if(btn){btn.classList.toggle('active',favoriteIds.has(id));const heart=btn.querySelector('.heart-icon');if(heart)heart.textContent=favoriteIds.has(id)?'♥':'♡';}
  refreshDetailFavoriteCount(id);
};

const moderationRiskById=new Map();

// iPhone : un onglet mis en veille garde un jeton expiré ; on le rafraîchit avant l'appel et on réessaie une fois sur 401.
async function invokeFresh(name,opts){
  try{const{data:s}=await sb.auth.getSession();const exp=s?.session?.expires_at||0;if(s?.session&&exp*1000-Date.now()<60000)await sb.auth.refreshSession();}catch(_){}
  let res=await sb.functions.invoke(name,opts);
  const st=res?.error?.context?.status;
  if(st===401){try{await sb.auth.refreshSession();}catch(_){}res=await sb.functions.invoke(name,opts);}
  return res;
}
async function requestAutomaticModeration(listingId){
  try{
    const {data,error}=await invokeFresh('moderate-listing',{body:{listing_id:listingId}});
    if(error) throw error;
    return data||null;
  }catch(err){
    console.error('Modération automatique indisponible',err);
    return null; // Sécurité : l'annonce reste pending si l'analyse échoue.
  }
}

function moderationRiskHTML(a){
  if(!moderationMode || !currentProfile?.is_admin) return '';
  const m=moderationRiskById.get(a.id);
  if(!m){
    return `<div class="moderation-risk gray"><strong>⚪ Analyse en attente</strong>L’annonce reste en vérification manuelle.</div>`;
  }
  const level=['green','orange','red'].includes(m.risk_level)?m.risk_level:'gray';
  const icon=level==='green'?'🟢':level==='orange'?'🟠':level==='red'?'🔴':'⚪';
  const label=level==='green'?'Risque faible':level==='orange'?'À vérifier':level==='red'?'Risque élevé':'Analyse';
  const reasons=Array.isArray(m.reasons)?m.reasons:[];
  const reasonsHTML=reasons.length?`<ul class="moderation-reasons">${reasons.slice(0,3).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  const state=level==='green'?'Contrôle qualité aléatoire':'Action requise';
  return `<div class="moderation-risk ${level}"><strong>${icon} ${label} — ${Number(m.risk_score||0)}/100</strong>${reasonsHTML}<span class="moderation-auto-state">${esc(state)}</span></div>`;
}

const SHOWROOM_LOA_ADS=[];

let adsLoadSequence=0;
let lastGoodPublicAds=[];

function hasActiveCatalogueFilters(){
  const ids=[
    'searchQuery','searchCity','filterCategory','filterSubcategory','filterPriceMin','filterPriceMax',
    'filterCondition','filterSeller','filterVehicleMake','filterVehicleModel','filterYearMin','filterYearMax',
    'filterMileageMax','filterFuel','filterImmoTransaction','filterImmoPropertyType','filterImmoSurfaceMin',
    'filterImmoSurfaceMax','filterImmoRoomsMin','filterImmoBedroomsMin','filterImmoDpe','filterImmoFurnished',
    'filterImmoOutdoor','filterImmoParking'
  ];
  return ids.some(id=>String(document.getElementById(id)?.value||'').trim()!=='')
    || Number(document.getElementById('filterImmoRadius')?.value||0)>0
    || !!immoNearbyFilterState.active
    || !!activeCategory
    || !!activeVehicleSubcategory;
}

function listingReferenceQuery(value){
  const compact=String(value||'').trim().toUpperCase().replace(/[\s–—]/g,'').replace(/-/g,'');
  const match=compact.match(/^ABR(\d{4})(\d{8,})$/);
  return match?'ABR-'+match[1]+'-'+match[2]:'';
}

// Chargement rapide du catalogue public (18/10/2026 — Claude) :
// pendant les premières secondes, une seule requête est partagée entre les appels de loadAds()
// (démarrage, événement de session, stabilisation à 700 ms), et elle part dès le chargement
// du script, en parallèle de la vérification du compte, au lieu d'attendre la fin de celle-ci.
const PUBLIC_CATALOG_SELECT='id,owner_id,revision_of,category,title,description,price,city,seller_type,status,source,external_id,external_url,last_synced_at,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,created_at,updated_at,show_phone,item_condition,postal_code,featured_until,promotion_tier,photo_limit,crit_air,loa_available,loa_monthly,listing_reference,expires_at,archived_at,archive_reason,retention_until,visibility_scope,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value,listing_photos(id,storage_path,storage_bucket,position)';
const PUBLIC_CATALOG_STARTUP_MS=6000;
let publicCatalogPromise=null;
let publicCatalogAt=0;
let catalogLoadedOnce=false;
function fetchPublicCatalog(){
  return sb.from('listings').select(PUBLIC_CATALOG_SELECT)
    .is('revision_of',null).eq('status','active').eq('visibility_scope','public')
    .order('created_at',{ascending:false});
}
function getPublicCatalog(){
  const now=performance.now();
  const startup=now<PUBLIC_CATALOG_STARTUP_MS;
  if(startup && publicCatalogPromise && now-publicCatalogAt<PUBLIC_CATALOG_STARTUP_MS) return publicCatalogPromise;
  publicCatalogAt=now;
  publicCatalogPromise=Promise.resolve(fetchPublicCatalog()).catch(error=>({data:null,error}));
  if(!startup){const p=publicCatalogPromise;setTimeout(()=>{if(publicCatalogPromise===p)publicCatalogPromise=null;},0);}
  return publicCatalogPromise;
}

// 29/10/2026 (Anthony) : aperçu d'un import « comme sur le site » (index.html?apercu=import), préparé par admin-test-import.html.
// Les annonces viennent du navigateur (localStorage), rien n'est publié ni enregistré.
const IMPORT_PREVIEW=(()=>{try{if(!/[?&]apercu=import\b/.test(location.search))return null;const d=JSON.parse(localStorage.getItem('abraca_import_preview')||'null');return d&&Array.isArray(d.ads)&&d.ads.length?d:null;}catch(_){return null;}})();
function showImportPreviewBanner(){
  if(!IMPORT_PREVIEW||document.getElementById('importPreviewBanner'))return;
  const b=document.createElement('div');b.id='importPreviewBanner';
  b.style.cssText='position:sticky;top:0;z-index:9999;background:#451657;color:#fff;padding:10px 14px;font-size:14px;line-height:1.4;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap';
  b.innerHTML='<span><b>Aperçu de l’import</b> · '+IMPORT_PREVIEW.ads.length+' annonce'+(IMPORT_PREVIEW.ads.length>1?'s':'')+(IMPORT_PREVIEW.site?' de '+esc(IMPORT_PREVIEW.site):'')+' telles qu’elles apparaîtront sur Abracadeal. Rien n’est publié.</span><a href="index.html" style="color:#fff;font-weight:700">Quitter l’aperçu</a>';
  document.body.prepend(b);
}
async function loadAds(){
  if(IMPORT_PREVIEW){allAds=IMPORT_PREVIEW.ads;catalogLoadedOnce=true;IMPORT_PREVIEW.ads.forEach(a=>{try{detailAdsCache.set(a.id,a);}catch(_){}});renderAds();showImportPreviewBanner();return;}
  const sequence=++adsLoadSequence;
  const viewerId=currentUser?.id;
  const isCurrent=()=>sequence===adsLoadSequence && viewerId===currentUser?.id;
  const risks=new Map();
  let loadedAds=[];

  if(moderationMode && currentProfile?.is_admin){
    const {data:pending,error:pendingError}=await sb.from('listings')
      .select('*,listing_photos(id,storage_path,storage_bucket,position)')
      .eq('status','pending')
      .order('created_at',{ascending:false});
    if(!isCurrent()) return;
    if(pendingError){console.error(pendingError);toast('Impossible de charger la modération');return}
    loadedAds=pending||[];

    // Fix 21/09/2026 : deuxieme verification manuelle des annonces deja publiees
    // automatiquement. Elles restent en ligne (status active) pendant qu'elles
    // apparaissent ici pour un controle a posteriori (l'admin : "laisse les
    // annonces moderer automatiquement pour une deuxieme verification manuelle").
    const {data:autoRows,error:autoRowsError}=await sb.from('listing_moderation')
      .select('listing_id')
      .eq('auto_published',true)
      .or('admin_reviewed.is.null,admin_reviewed.eq.false');
    if(!isCurrent()) return;
    if(autoRowsError)console.error('Annonces auto-publiées à revérifier indisponibles',autoRowsError);
    const pendingIds=new Set(loadedAds.map(a=>a.id));
    const autoIds=(autoRows||[]).map(r=>r.listing_id).filter(id=>id&&!pendingIds.has(id));
    if(autoIds.length){
      const {data:autoAds,error:autoAdsError}=await sb.from('listings')
        .select('*,listing_photos(id,storage_path,storage_bucket,position)')
        .in('id',autoIds)
        .eq('status','active')
        .order('created_at',{ascending:false});
      if(!isCurrent()) return;
      if(autoAdsError)console.error('Annonces auto-publiées indisponibles',autoAdsError);
      loadedAds=[...loadedAds,...(autoAds||[])];
    }

    const ids=loadedAds.map(a=>a.id);
    if(ids.length){
      const {data:mods,error:modsError}=await sb.from('listing_moderation')
        .select('listing_id,risk_score,risk_level,reasons,checked_at,engine,ai_checked,auto_published,admin_reviewed,reviewed_at,reviewed_by')
        .in('listing_id',ids);
      if(!isCurrent()) return;
      if(modsError)console.error('Scores de modération indisponibles',modsError);
      (mods||[]).forEach(m=>risks.set(m.listing_id,m));
    }
  }else{
    const reference=listingReferenceQuery($('#searchQuery')?.value);
    if(!onlyMine && !reference){
      // Catalogue public : requête partagée (voir getPublicCatalog) pour éviter 3 chargements identiques au démarrage.
      const {data,error}=await getPublicCatalog();
      if(!isCurrent()) return;
      if(error){console.error(error);toast('Impossible de charger les annonces');return}
      loadedAds=(data||[]).slice();
    }else{
      let q=sb.from('listings').select('id,owner_id,revision_of,category,title,description,price,city,seller_type,status,source,external_id,external_url,last_synced_at,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,created_at,updated_at,show_phone,item_condition,postal_code,featured_until,promotion_tier,photo_limit,crit_air,loa_available,loa_monthly,listing_reference,expires_at,archived_at,archive_reason,retention_until,visibility_scope,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value,listing_photos(id,storage_path,storage_bucket,position)');
      q=q.is('revision_of',null);
      if(reference)q=q.eq('listing_reference',reference);
      if(onlyMine && currentUser) q=q.eq('owner_id',currentUser.id).neq('status','rejected').or('status.neq.archived,archive_reason.in.(sold,expired)');
      else q=q.eq('status','active').eq('visibility_scope','public');
      const {data,error}=await q.order('created_at',{ascending:false});
      if(error){console.error(error);toast('Impossible de charger les annonces');return}
      loadedAds=data||[];
    }
  }

  await hydratePrivatePhotos(loadedAds);
  if(!isCurrent()) return;

  if(!moderationMode && !onlyMine && !listingReferenceQuery($('#searchQuery')?.value)){
    const existingIds=new Set((loadedAds||[]).map(a=>a.id));
    loadedAds=[...SHOWROOM_LOA_ADS.filter(a=>!existingIds.has(a.id)),...(loadedAds||[])];

    if(loadedAds.length){
      lastGoodPublicAds=loadedAds.slice();
    }else if(lastGoodPublicAds.length){
      console.warn('Catalogue vide ignoré : restauration du dernier chargement valide');
      loadedAds=lastGoodPublicAds.slice();
    }
  }

  allAds=loadedAds;
  catalogLoadedOnce=true;
  moderationRiskById.clear();
  risks.forEach((v,k)=>moderationRiskById.set(k,v));
  if(favoritesMode) allAds=allAds.filter(a=>favoriteIds.has(a.id));
  if(currentProfile?.is_admin) await refreshModerationCount();
  if(isCurrent()) renderAds();
}
function updateFilterSubcategories(keepValue=''){
  const category=$('#filterCategory')?.value||'';
  const select=$('#filterSubcategory');
  if(!select) return;
  const items=SUBCATEGORIES[category]||[];
  select.innerHTML='<option value="">Toutes</option>'+items.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('');
  select.disabled=!category||!items.length;
  if(keepValue && items.some(([v])=>v===keepValue)) select.value=keepValue;
  const motoPlaceholder=select?.value==='motos'?'Ex. Yamaha, Honda, BMW':'Ex. Renault, Peugeot, Mercedes';
  if($('#filterVehicleMake'))$('#filterVehicleMake').placeholder=motoPlaceholder;
  if($('#qfVehicleMakeInput'))$('#qfVehicleMakeInput').placeholder=motoPlaceholder;
  const showVehicles=category==='vehicules';
  const showRealEstate=category==='immobilier';
  $('#vehicleFilterFields')?.classList.toggle('hidden',!showVehicles);
  $('#realEstateFilterFields')?.classList.toggle('hidden',!showRealEstate);
  $('#subcategoryFilterField')?.classList.toggle('hidden',showRealEstate);
  if(showRealEstate && select)select.value='';
  updateRealEstateFilterLabels();
  if(!showVehicles){
    ['filterVehicleMake','filterVehicleModel','filterYearMin','filterYearMax','filterMileageMax','filterFuel'].forEach(id=>{const el=$('#'+id);if(el)el.value='';});
  }
  if(!showRealEstate){
    ['filterImmoTransaction','filterImmoPropertyType','filterImmoSurfaceMin','filterImmoSurfaceMax','filterImmoRoomsMin','filterImmoBedroomsMin','filterImmoDpe','filterImmoFurnished','filterImmoOutdoor','filterImmoParking','filterImmoRadius'].forEach(id=>{const el=$('#'+id);if(el)el.value='';});
    clearImmoNearbyFilter();
  }
  const conditionAllowed=!category||['vehicules','hightech','maison','mode','autres'].includes(category);
  $('#conditionFilterField')?.classList.toggle('hidden',!conditionAllowed);
  if(!conditionAllowed && $('#filterCondition')) $('#filterCondition').value='';
}
function syncFilterCategory(category='',subcategory=''){
  const cat=$('#filterCategory');
  if(!cat) return;
  cat.value=category||'';
  updateFilterSubcategories(subcategory||'');
}
function activePanelFilterCount(){
  const ids=['filterCategory','filterSubcategory','filterPriceMin','filterPriceMax','filterCondition','filterSeller','filterVehicleMake','filterVehicleModel','filterYearMin','filterYearMax','filterMileageMax','filterFuel','filterImmoTransaction','filterImmoPropertyType','filterImmoSurfaceMin','filterImmoSurfaceMax','filterImmoRoomsMin','filterImmoBedroomsMin','filterImmoDpe','filterImmoFurnished','filterImmoOutdoor','filterImmoParking'];
  const base=ids.reduce((n,id)=>n+(String($('#'+id)?.value||'').trim()?1:0),0);
  return base+(Number($('#filterImmoRadius')?.value||0)>0?1:0)+(immoNearbyFilterState.active?1:0);
}
function refreshFilterCount(){
  const el=$('#filterCount'); if(!el) return;
  const n=activePanelFilterCount();
  el.textContent=n; el.classList.toggle('hidden',!n);
}
function resetSearchFilters({keepMode=false}={}){
  const ids=['searchQuery','searchCity','filterPriceMin','filterPriceMax','filterCondition','filterSeller','filterVehicleMake','filterVehicleModel','filterYearMin','filterYearMax','filterMileageMax','filterFuel','filterImmoTransaction','filterImmoPropertyType','filterImmoSurfaceMin','filterImmoSurfaceMax','filterImmoRoomsMin','filterImmoBedroomsMin','filterImmoDpe','filterImmoFurnished','filterImmoOutdoor','filterImmoParking'];
  ids.forEach(id=>{const el=$('#'+id); if(el) el.value='';});
  if($('#filterImmoRadius'))$('#filterImmoRadius').value='0';
  immoRadiusState={key:'',radius:0,ready:false,distances:new Map()};
  clearImmoNearbyFilter();
  activeCategory=''; activeVehicleSubcategory='';
  syncFilterCategory('','');
  if($('#sortAds')) $('#sortAds').value='newest';
  refreshFilterCount();
  if(!keepMode){onlyMine=false;moderationMode=false;favoritesMode=false;}
}

/* Recherche par mots-clés (19/10/2026) : insensible aux accents et à la casse,
   singulier/pluriel, petites fautes de frappe, et chaque mot peut se trouver n'importe où
   (titre, description, catégorie, ville, marque…). Ex. « bequile » trouve « Béquilles ». */
const KW_STOPWORDS=new Set(['le','la','les','un','une','des','de','du','d','l','au','aux','et','ou','pour','avec','sans','en','a','sur','je','cherche','recherche','veux']);
function kwFold(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function kwStem(w){
  if(w.length>4&&/(aux)$/.test(w))return w.slice(0,-3)+'al';
  if(w.length>3&&/[sx]$/.test(w))return w.slice(0,-1);
  return w;
}
function kwDistance(a,b,max){
  if(Math.abs(a.length-b.length)>max)return max+1;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i];let rowMin=i;
    for(let j=1;j<=b.length;j++){cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));if(cur[j]<rowMin)rowMin=cur[j];}
    if(rowMin>max)return max+1;
    prev=cur;
  }
  return prev[b.length];
}
const kwHayCache=new Map();
function kwPrepareHay(hay){
  let h=kwHayCache.get(hay);
  if(h)return h;
  const text=kwFold(hay);
  h={text,words:[...new Set(text.split(' ').filter(Boolean).map(kwStem))]};
  if(kwHayCache.size>5000)kwHayCache.clear();
  kwHayCache.set(hay,h);
  return h;
}
function kwTokens(q){return kwFold(q).split(' ').filter(t=>t&&!KW_STOPWORDS.has(t));}
function keywordMatches(hay,tokens){
  if(!tokens.length)return true;
  const h=kwPrepareHay(hay);
  return tokens.every(t=>{
    const st=kwStem(t);
    if(h.text.includes(t)||h.text.includes(st))return true;
    if(st.length<4)return false;
    const tol=st.length>=8?2:1;
    return h.words.some(w=>w.startsWith(st)||(Math.abs(w.length-st.length)<=tol&&kwDistance(st,w,tol)<=tol));
  });
}
function filteredAds(){
  const q=$('#searchQuery').value.trim().toLowerCase();
  const qTokens=kwTokens(q);
  const reference=listingReferenceQuery(q);
  const city=$('#searchCity').value.trim().toLowerCase();
  const minPrice=Number($('#filterPriceMin')?.value||0);
  const maxPriceRaw=$('#filterPriceMax')?.value||'';
  const maxPrice=maxPriceRaw===''?null:Number(maxPriceRaw);
  const condition=$('#filterCondition')?.value||'';
  const seller=$('#filterSeller')?.value||'';
  const make=($('#filterVehicleMake')?.value||'').trim().toLowerCase();
  const model=($('#filterVehicleModel')?.value||'').trim().toLowerCase();
  const yearMinRaw=$('#filterYearMin')?.value||'';
  const yearMaxRaw=$('#filterYearMax')?.value||'';
  const mileageRaw=$('#filterMileageMax')?.value||'';
  const yearMin=yearMinRaw===''?null:Number(yearMinRaw);
  const yearMax=yearMaxRaw===''?null:Number(yearMaxRaw);
  const mileageMax=mileageRaw===''?null:Number(mileageRaw);
  const fuel=$('#filterFuel')?.value||'';
  const immoTransaction=$('#filterImmoTransaction')?.value||'';
  const immoPropertyType=$('#filterImmoPropertyType')?.value||'';
  const immoSurfaceMinRaw=$('#filterImmoSurfaceMin')?.value||'';
  const immoSurfaceMaxRaw=$('#filterImmoSurfaceMax')?.value||'';
  const immoRoomsMinRaw=$('#filterImmoRoomsMin')?.value||'';
  const immoBedroomsMinRaw=$('#filterImmoBedroomsMin')?.value||'';
  const immoSurfaceMin=immoSurfaceMinRaw===''?null:Number(immoSurfaceMinRaw);
  const immoSurfaceMax=immoSurfaceMaxRaw===''?null:Number(immoSurfaceMaxRaw);
  const immoRoomsMin=immoRoomsMinRaw===''?null:Number(immoRoomsMinRaw);
  const immoBedroomsMin=immoBedroomsMinRaw===''?null:Number(immoBedroomsMinRaw);
  const immoDpe=$('#filterImmoDpe')?.value||'';
  const immoFurnished=$('#filterImmoFurnished')?.value||'';
  const immoOutdoor=$('#filterImmoOutdoor')?.value||'';
  const immoParking=$('#filterImmoParking')?.value||'';
  const immoRadius=Number($('#filterImmoRadius')?.value||0);
  const immoRadiusActive=immoRadius>0&&!!city;
  const effectiveCategory=$('#filterCategory')?.value||activeCategory||'';
  const effectiveSub=effectiveCategory==='immobilier'?'':($('#filterSubcategory')?.value||activeVehicleSubcategory||'');

  let ads=allAds.filter(a=>{
    if(reference)return a.listing_reference===reference;
    const hay=`${a.title||''} ${cleanDescription(a)} ${a.item_condition||''} ${equipmentTypeOf(a)} ${subcategoryLabel(a.category,vehicleSubcategoryOf(a))} ${a.city||''} ${a.postal_code||''} ${a.vehicle_make||''} ${a.vehicle_model||''} ${a.crit_air||''} ${vehicleMetaSearchText(a)} ${realEstateMetaSearchText(a)} ${catLabel(a.category)}`.toLowerCase();
    const locationHay=`${a.city||''} ${a.postal_code||''}`.toLowerCase();
    const price=(a.price===null||a.price==='')?null:Number(a.price);
    const categoryOk=!effectiveCategory||a.category===effectiveCategory;
    const subOk=!effectiveSub||vehicleSubcategoryOf(a)===effectiveSub;
    const priceMinOk=!minPrice||(price!==null&&price>=minPrice);
    const priceMaxOk=maxPrice===null||(price!==null&&price<=maxPrice);
    const conditionOk=!condition||repairImportedText(a.item_condition||'')===condition;
    const sellerOk=!seller||String(a.seller_type||'').toLowerCase()===seller;
    const makeOk=!make||String(a.vehicle_make||'').toLowerCase().includes(make);
    const modelOk=!model||String(a.vehicle_model||'').toLowerCase().includes(model);
    const year=Number(a.vehicle_year||0);
    const yearMinOk=yearMin===null||year>=yearMin;
    const yearMaxOk=yearMax===null||year<=yearMax;
    const mileage=Number(a.mileage||0);
    const mileageOk=mileageMax===null||(a.mileage!==null&&a.mileage!==undefined&&mileage<=mileageMax);
    const fuelOk=!fuel||a.fuel===fuel;
    const im=realEstateMetaOf(a);
    const immoOnly=effectiveCategory==='immobilier';
    const immoTransactionOk=!immoOnly||!immoTransaction||realEstateTransactionOf(a)===immoTransaction;
    const immoPropertyTypeOk=!immoOnly||!immoPropertyType||realEstatePropertyTypeOf(a)===immoPropertyType;
    const area=Number(im.surface||im.landSurface||0);
    const immoSurfaceOk=!immoOnly||((immoSurfaceMin===null||area>=immoSurfaceMin)&&(immoSurfaceMax===null||area<=immoSurfaceMax));
    const immoRoomsOk=!immoOnly||immoRoomsMin===null||Number(im.rooms||0)>=immoRoomsMin;
    const immoBedroomsOk=!immoOnly||immoBedroomsMin===null||Number(im.bedrooms||0)>=immoBedroomsMin;
    const immoDpeOk=!immoOnly||immoDpeMatches(im.dpe,immoDpe);
    const furnishedActual=normalizeImmoSearchValue(im.furnished||'');
    const furnishedWanted=normalizeImmoSearchValue(immoFurnished||'');
    const immoFurnishedOk=!immoOnly||!immoFurnished||furnishedActual===furnishedWanted;
    const immoOutdoorOk=!immoOnly||!immoOutdoor||realEstateHasOutdoor(a,immoOutdoor);
    const immoParkingOk=!immoOnly||!immoParking||realEstateHasParking(a,immoParking);
    const immoRadiusOk=!immoOnly||!immoRadiusActive||(immoRadiusState.ready&&Number(immoRadiusState.distances.get(a.id))<=immoRadius);
    const immoNearbyOk=!immoOnly||!immoNearbyFilterState.active||(immoNearbyFilterState.ready&&Number(immoNearbyFilterState.distances.get(a.id))<=immoNearbyFilterState.radius);
    const cityOk=(!city)||(immoOnly&&immoRadiusActive?immoRadiusOk:locationHay.includes(city));
    return (!q||keywordMatches(hay,qTokens))&&cityOk&&categoryOk&&subOk&&priceMinOk&&priceMaxOk&&conditionOk&&sellerOk&&makeOk&&modelOk&&yearMinOk&&yearMaxOk&&mileageOk&&fuelOk&&immoTransactionOk&&immoPropertyTypeOk&&immoSurfaceOk&&immoRoomsOk&&immoBedroomsOk&&immoDpeOk&&immoFurnishedOk&&immoOutdoorOk&&immoParkingOk&&immoRadiusOk&&immoNearbyOk;
  });
  const sort=$('#sortAds')?.value||'newest';
  ads.sort((a,b)=>{
    if(moderationMode){
      const rank={red:0,orange:1,green:2};
      const am=moderationRiskById.get(a.id), bm=moderationRiskById.get(b.id);
      const ar=am?rank[am.risk_level]??3:1, br=bm?rank[bm.risk_level]??3:1;
      if(ar!==br) return ar-br;
      const as=Number(am?.risk_score||0), bs=Number(bm?.risk_score||0);
      if(as!==bs) return bs-as;
    }
    if(sort==='price-asc'){
      const ap=(a.price===null||a.price==='')?Number.MAX_SAFE_INTEGER:Number(a.price);
      const bp=(b.price===null||b.price==='')?Number.MAX_SAFE_INTEGER:Number(b.price);
      return ap-bp;
    }
    if(sort==='price-desc'){
      const ap=(a.price===null||a.price==='')?-1:Number(a.price);
      const bp=(b.price===null||b.price==='')?-1:Number(b.price);
      return bp-ap;
    }
    return new Date(b.created_at||0)-new Date(a.created_at||0);
  });
  if(!moderationMode && !onlyMine && !favoritesMode && sort==='newest' && !q){
    ads=diversifyBySeller(ads,2);
  }
  if(!moderationMode && !onlyMine && !favoritesMode){
    const featured=ads.filter(listingIsFeatured);
    if(featured.length){
      const day=Math.floor(Date.now()/86400000);
      featured.sort((a,b)=>{
        const h=x=>{let v=2166136261;const q=String(x.id)+day;for(let i=0;i<q.length;i++){v^=q.charCodeAt(i);v=Math.imul(v,16777619)}return v>>>0};
        return h(a)-h(b);
      });
      const priority=featured.slice(0,3);
      const ids=new Set(priority.map(x=>x.id));
      const rest=ads.filter(x=>!ids.has(x.id));
      const merged=[...rest];
      [0,3,6].forEach((pos,i)=>{if(priority[i])merged.splice(Math.min(pos,merged.length),0,priority[i]);});
      ads=merged;
    }
  }
  return ads;
}
// Évite qu'un même vendeur occupe tout le haut de la liste (ex : import de stock d'un garage).
// Au plus `maxRun` annonces d'affilée du même vendeur ; les suivantes sont décalées plus bas, jamais retirées.
function diversifyBySeller(items,maxRun=2){
  const queue=[...items],out=[];
  while(queue.length){
    const last=out.slice(-maxRun);
    const blocked=last.length===maxRun&&last.every(x=>x.owner_id&&x.owner_id===last[0].owner_id)?last[0].owner_id:null;
    let idx=0;
    if(blocked){const j=queue.findIndex(x=>x.owner_id!==blocked);if(j>=0)idx=j;}
    out.push(queue.splice(idx,1)[0]);
  }
  return out;
}
function shuffleCopy(items){
  const out=[...items];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}
function selectMixedFeatured(items,limit=8){
  const groups=new Map();
  shuffleCopy(items).forEach(a=>{
    const key=a.category||'autres';
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(a);
  });
  const keys=shuffleCopy([...groups.keys()]);
  const out=[];
  while(out.length<limit){
    let added=false;
    for(const key of keys){
      const arr=groups.get(key);
      if(arr?.length && out.length<limit){out.push(arr.shift());added=true;}
    }
    if(!added)break;
  }
  return out;
}

const RECENT_VIEWED_KEY='abracadeal.recentViewed.v1';
const RECENT_SEARCH_KEY='abracadeal.recentSearches.v1';
function readLocalList(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function writeLocalList(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch{}}
function rememberViewed(id){if(!id)return;const ids=readLocalList(RECENT_VIEWED_KEY).filter(x=>x!==id);ids.unshift(id);writeLocalList(RECENT_VIEWED_KEY,ids.slice(0,20));}
function rememberSearch(){
  const q=($('#searchQuery')?.value||'').trim(),city=($('#searchCity')?.value||'').trim();
  const cat=$('#filterCategory')?.value||activeCategory||'';
  if(!q&&!city&&!cat)return;
  const item={q,city,cat,ts:Date.now()};
  const old=readLocalList(RECENT_SEARCH_KEY).filter(x=>`${x.q}|${x.city}|${x.cat}`!==`${q}|${city}|${cat}`);
  old.unshift(item);writeLocalList(RECENT_SEARCH_KEY,old.slice(0,8));
}
// Les photos envoyées depuis le site ont « Abracadeal » incrusté à l'envoi (compressImage). Celles des flux Pro
// (import automatique) ne passent pas par là : on affiche alors le filigrane en surimpression.
function abracaWmOverlay(a){return String(a?.source||'').startsWith('feed:')?' photo-watermark--overlay':'';}
function personalizedCard(a,extra=''){
  const photos=visiblePhotosFor(a);const pic=photos[0]?`<img ${thumbImgAttrs(photos[0].storage_path)} alt="" loading="lazy" decoding="async"><span class="photo-watermark${abracaWmOverlay(a)}">Abracadeal</span>`:`<img src="${ABRACA_DEFAULT_LISTING_PHOTO}" alt="Abracadeal" class="abraca-default-photo">`;
  return `<article class="personalized-card" onclick="if(!event.target.closest('button,a'))openAd('${a.id}')" role="link" tabindex="0" onkeydown="if((event.key==='Enter'||event.key===' ')&&!event.target.closest('button,a')){event.preventDefault();openAd('${a.id}')}"><div class="personalized-photo">${pic}<div class="card-top-badges">${a.seller_type==='professionnel'?`<span class="pro-card-badge">PRO</span>`:''}</div>${listingCardActions(a)}</div><div class="personalized-body"><div class="personalized-meta">${esc(catLabel(a.category))} · ${esc(a.city||'')}</div><h3 class="personalized-title">${adSeoTitle(a)}</h3><div class="personalized-price">${cataloguePrice(a)}</div>${a.loa&&a.loa_monthly?`<div class="loa-detail">LOA dès ${Number(a.loa_monthly).toLocaleString('fr-FR')} €/mois</div>`:''}${extra}</div></article>`;
}
function renderRecentViewed(){
  const sec=$('#recentViewedSection'),grid=$('#recentViewedGrid');if(!sec||!grid)return;
  const ids=readLocalList(RECENT_VIEWED_KEY);const byId=new Map((allAds||[]).map(a=>[a.id,a]));const items=ids.map(id=>byId.get(id)).filter(Boolean).slice(0,8);
  if(!items.length){sec.classList.add('hidden');grid.innerHTML='';return}grid.innerHTML=items.map(a=>personalizedCard(a)).join('');sec.classList.remove('hidden');queueMicrotask(()=>hydrateFavoriteCounts(grid));
}
function renderRecentSearchSuggestions(){
  const sec=$('#recentSearchSection'),grid=$('#recentSearchGrid');if(!sec||!grid)return;
  const searches=readLocalList(RECENT_SEARCH_KEY).slice(0,5);if(!searches.length){sec.classList.add('hidden');grid.innerHTML='';return}
  const score=a=>{let n=0;const hay=`${a.title||''} ${cleanDescription(a)} ${a.city||''} ${a.postal_code||''} ${a.vehicle_make||''} ${a.vehicle_model||''} ${vehicleMetaSearchText(a)} ${realEstateMetaSearchText(a)}`.toLowerCase();for(const r of searches){if(r.q&&hay.includes(String(r.q).toLowerCase()))n+=4;if(r.city&&hay.includes(String(r.city).toLowerCase()))n+=3;if(r.cat&&a.category===r.cat)n+=2;}return n};
  const items=(allAds||[]).filter(a=>a.status==='active').map(a=>({a,s:score(a)})).filter(x=>x.s>0).sort((x,y)=>y.s-x.s).slice(0,8).map(x=>x.a);
  if(!items.length){sec.classList.add('hidden');grid.innerHTML='';return}grid.innerHTML=items.map(a=>personalizedCard(a)).join('');sec.classList.remove('hidden');queueMicrotask(()=>hydrateFavoriteCounts(grid));
}
function haversineKm(a,b){const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),la1=toRad(a.lat),la2=toRad(b.lat);const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
async function communeCentre(city,postal){
  const cityNorm=String(city||'').trim().toLowerCase();const postalNorm=String(postal||'').trim();const key=`abracadeal-centre:v2:${postalNorm}:${cityNorm}`;try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c?.lat&&c?.lon)return c}catch{}
  if(cityNorm==='monaco' || postalNorm.startsWith('980')){const out={lat:43.7384,lon:7.4246};try{localStorage.setItem(key,JSON.stringify(out))}catch{}return out;}
  let url='https://geo.api.gouv.fr/communes?';
  if(postal)url+=`codePostal=${encodeURIComponent(postal)}`;else url+=`nom=${encodeURIComponent(city||'')}&boost=population`;
  url+='&fields=nom,codesPostaux,centre&format=json&geometry=centre&limit=5';
  const r=await fetch(url);if(!r.ok)return null;const arr=await r.json();if(!Array.isArray(arr)||!arr.length)return null;const best=arr.find(x=>String(x.nom||'').toLowerCase()===String(city||'').toLowerCase())||arr[0];const co=best?.centre?.coordinates;if(!co||co.length<2)return null;const out={lat:Number(co[1]),lon:Number(co[0])};try{localStorage.setItem(key,JSON.stringify(out))}catch{}return out;
}
async function renderNearby(userPos){
  const section=$('#nearbySection'),grid=$('#nearbyGrid'),cta=$('#nearbyCta');if(!grid)return;section?.classList.remove('hidden');grid.classList.remove('hidden');grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">Recherche des annonces proches…</div>';
  const active=(allAds||[]).filter(a=>a.status==='active');const unique=new Map();for(const a of active){const k=`${a.postal_code||''}|${a.city||''}`;if(!unique.has(k)&&unique.size<25)unique.set(k,{city:a.city,postal:a.postal_code})}
  const centres=new Map();for(const [k,v] of unique){try{const c=await communeCentre(v.city,v.postal);if(c)centres.set(k,c)}catch{}}
  const ranked=active.map(a=>{const c=centres.get(`${a.postal_code||''}|${a.city||''}`);return c?{a,d:haversineKm(userPos,c)}:null}).filter(Boolean).sort((x,y)=>x.d-y.d).slice(0,8);
  if(!ranked.length){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">Aucune annonce localisable pour le moment.</div>';return}
  grid.innerHTML=ranked.map(x=>personalizedCard(x.a,`<div class="nearby-distance">≈ ${x.d<10?x.d.toFixed(1):Math.round(x.d)} km</div>`)).join('');if(cta)cta.style.display='none';queueMicrotask(()=>hydrateFavoriteCounts(grid));
}
function requestNearby(){if(!navigator.geolocation){toast('La localisation n’est pas disponible sur cet appareil.');return}const topBtn=$('#nearbySearchBtn'),oldTop=topBtn?.innerHTML;if(topBtn){topBtn.disabled=true;topBtn.textContent='📍 Localisation…'}navigator.geolocation.getCurrentPosition(async p=>{const pos={lat:p.coords.latitude,lon:p.coords.longitude};await renderNearby(pos);$('#nearbySection')?.scrollIntoView({behavior:'smooth',block:'start'});if(topBtn){topBtn.disabled=false;topBtn.innerHTML=oldTop||'📍 Autour de moi'}},()=>{toast('Autorisez la localisation pour voir les annonces autour de vous.');if(topBtn){topBtn.disabled=false;topBtn.innerHTML=oldTop||'📍 Autour de moi'}},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});}
function renderPersonalizedHome(){if(onlyMine||favoritesMode||moderationMode)return;renderRecentViewed();renderRecentSearchSuggestions();}

function renderHomeFeatured(){
  const section=$('#homeFeaturedSection'),grid=$('#homeFeaturedGrid');
  if(!section||!grid)return;
  // Tous les boosts actifs sont éligibles, sans restriction de catégorie.
  const candidates=(allAds||[]).filter(a=>a.status==='active'&&listingIsFeatured(a));
  if(!candidates.length){
    section.classList.remove('home-featured-loading');
    section.classList.add('hidden');
    grid.innerHTML='';
    return;
  }
  const picked=selectMixedFeatured(candidates,8);
  grid.innerHTML=picked.map(a=>{
    const photos=visiblePhotosFor(a);
    const img=photos[0]?`<img ${thumbImgAttrs(photos[0].storage_path)} alt="" loading="lazy" decoding="async"><span class="photo-watermark${abracaWmOverlay(a)}">Abracadeal</span>`:`<img src="${ABRACA_DEFAULT_LISTING_PHOTO}" alt="Abracadeal" class="abraca-default-photo">`;
    const category=vehicleSubcategoryOf(a)?subcategoryLabel(a.category,vehicleSubcategoryOf(a)):catLabel(a.category);
    return `<article class="home-featured-card" onclick="openAd('${a.id}')" role="link" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openAd('${a.id}')}">
      <div class="home-featured-photo">${img}<div class="card-top-badges"><span class="featured-badge">À LA UNE</span>${a.seller_type==='professionnel'?`<span class="pro-card-badge">PRO</span>`:''}</div>${listingCardActions(a)}</div>
      <div class="home-featured-body">
        <div class="home-featured-meta">${esc(category)}${equipmentTypeOf(a)?' · '+esc(equipmentTypeOf(a)):''} · ${a.seller_type==='professionnel'?'Pro':'Particulier'}</div>
        <h3 class="home-featured-title">${adSeoTitle(a)}</h3>
        <div class="home-featured-price">${a.category==='immobilier'?realEstateCardPriceHtml(a):cataloguePrice(a)}</div>${a.loa&&a.loa_monthly?`<div class="loa-detail">LOA dès ${Number(a.loa_monthly).toLocaleString('fr-FR')} €/mois</div>`:''}
        ${a.category==='immobilier'?realEstateCardSpecsHtml(a):''}
        ${a.category==='immobilier'&&realEstateMetaOf(a).neighborhood?`<div class="immo-card-location-extra">${esc(realEstateMetaOf(a).neighborhood)}</div>`:''}
        ${(a.category==='vehicules'&&(a.vehicle_year||a.mileage||a.fuel||a.transmission))?`<div class="ad-specs ad-specs-line">${[a.vehicle_year?esc(a.vehicle_year):'',(a.mileage!==null&&a.mileage!==undefined&&a.mileage!=='')?Number(a.mileage).toLocaleString('fr-FR')+'\u00a0km':'',a.fuel?esc(a.fuel):'',a.transmission?esc(a.transmission):''].filter(Boolean).map(x=>`<span class="ad-spec">${x}</span>`).join('<span class="ad-spec-sep"> · </span>')}</div>`:''}
        <div class="home-featured-city"><svg class="ad-city-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>${esc(a.city||'')}${a.postal_code?` (${esc(a.postal_code)})`:''}</div>
      </div>
    </article>`;
  }).join('');
  section.classList.remove('home-featured-loading');
  section.classList.remove('hidden');
  queueMicrotask(()=>hydrateFavoriteCounts(grid));
}

function listingExpiryMarkup(a){
  const expired=a.status==='archived'&&a.archive_reason==='expired';
  const label=expired?'Expirée':({pending:'En attente de validation',rejected:'Refusée',archived:a.archive_reason==='sold'?'Vendue':'Retirée',hidden:'Masquée',sold:'Vendue'})[a.status]||'';
  const stamp=a.expires_at?new Date(a.expires_at):null;
  const date=a.status==='active'&&stamp&&!Number.isNaN(stamp.getTime())?'Expire le '+stamp.toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'}):'';
  return label||date?`<div class="ad-meta" style="margin-bottom:8px;font-weight:850">${esc(label||date)}</div>`:'';
}
function canRenewPrivateListing(a){
  return ['particulier','professionnel'].includes(a.seller_type)&&a.category!=='vacances'&&!a.revision_of&&a.expires_at&&new Date(a.expires_at).getTime()<=Date.now()+7*86400000&&(a.status==='active'||(a.status==='archived'&&a.archive_reason==='expired'));
}
window.renewPrivateListing=async(id,button)=>{
  if(button)button.disabled=true;
  try{
    const {data,error}=await sb.rpc('renew_private_listing',{p_listing_id:id});
    if(error)throw error;
    if(data.moderation_required){toast('Prolongation gratuite demandée · nouvelle vérification en cours');await requestAutomaticModeration(id);}
    else toast('Annonce prolongée gratuitement de 60 jours, sans remontée');
    await loadAds();
  }catch(error){toast(error.message||'Prolongation impossible');}
  finally{if(button)button.disabled=false;}
};

// Accueil par défaut : annonces rangées par univers (Auto & Moto, puis Immobilier, puis le reste),
// pour ne jamais mélanger une voiture et une paire de baskets. Dès qu'un filtre, une recherche,
// une catégorie ou un tri par prix est choisi, on revient à la liste unique classique.
const HOME_GROUPS=[
  {key:'vehicules',title:'Auto & Moto',icon:'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',test:a=>a.category==='vehicules',limit:8},
  {key:'immobilier',title:'Immobilier',icon:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.2V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.2"/>',test:a=>a.category==='immobilier',limit:8},
  {key:'',title:'Toutes les autres annonces',icon:'<path d="M6 7h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',test:()=>true,limit:Infinity}
];
function isHomeDefaultView(){
  return !onlyMine&&!favoritesMode&&!moderationMode&&!hasActiveCatalogueFilters()&&($('#sortAds')?.value||'newest')==='newest';
}
function groupHomeAds(ads){
  const rest=[...ads],out=[];
  for(const g of HOME_GROUPS){
    const items=rest.filter(g.test);
    if(!items.length)continue;
    items.forEach(a=>rest.splice(rest.indexOf(a),1));
    const shown=items.slice(0,g.limit);
    out.push({__homeHeader:true,key:g.key,title:g.title,icon:g.icon,total:items.length,shown:shown.length,first:!out.length});
    out.push(...shown);
  }
  return out;
}
function homeGroupHeaderHtml(h){
  const more=h.key&&h.total>h.shown?`<button type="button" class="home-group-more" onclick="navigateCatalogue('${h.key}','','#resultats')">Voir les ${h.total} annonces</button>`:'';
  return `<div class="home-group-head${h.first?' first':''}"><h3><span class="home-group-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${h.icon||''}</svg></span>${esc(h.title)}</h3>${more}</div>`;
}
function renderAds(){
  if(!onlyMine&&!favoritesMode&&!moderationMode){ renderHomeFeatured(); renderPersonalizedHome(); }
  $$('.banner-hotspot').forEach(el=>{
    const selected=!favoritesMode&&!onlyMine&&!moderationMode && !!activeCategory && el.dataset.bannerCategory===activeCategory && (el.dataset.bannerSub||'')===activeVehicleSubcategory;
    el.classList.toggle('selected',selected);
    if(selected) el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');
  });
  $('#backToAllAds').classList.toggle('hidden',!favoritesMode&&!onlyMine);
  let ads=filteredAds(), grid=$('#adsGrid');
  // Tant que le premier chargement n'est pas arrivé, on garde les cartes d'attente au lieu d'afficher « aucune annonce ».
  if(!catalogLoadedOnce && !ads.length && !onlyMine && !favoritesMode && !moderationMode) return;
  grid.removeAttribute('aria-busy');

  if(
    !moderationMode &&
    !onlyMine &&
    !favoritesMode &&
    !hasActiveCatalogueFilters() &&
    ads.length===0 &&
    lastGoodPublicAds.length
  ){
    console.warn('Rendu vide ignoré : restauration du catalogue public');
    allAds=lastGoodPublicAds.slice();
    ads=filteredAds();
  }

  $('#resultTitle').textContent=moderationMode
    ?'À modérer'
    :(favoritesMode
      ?'Mes favoris'
      :(onlyMine
      ?'Mes annonces'
      :(activeVehicleSubcategory
      ?vehicleSubLabel(activeVehicleSubcategory)
      :(activeCategory?catLabel(activeCategory):'Les annonces'))));
  const waitingImmoRadius=(($('#filterCategory')?.value||activeCategory||'')==='immobilier'&&Number($('#filterImmoRadius')?.value||0)&&($('#searchCity')?.value||'').trim()&&!immoRadiusState.ready);
  $('#resultSubtitle').textContent=waitingImmoRadius?'Calcul du rayon autour de la ville…':(moderationMode?(ads.length?`${ads.length} annonce${ads.length>1?'s':''} nécessite${ads.length>1?'nt':''} votre décision.`:'Tout est automatisé : aucune annonce ne nécessite votre intervention.'):(ads.length?(ads.length>=30?`${ads.length} annonce${ads.length>1?'s':''} affichée${ads.length>1?'s':''}.`:'Les dernières annonces publiées.'):'Aucune annonce ne correspond pour le moment.'));
  const emptyCat=$('#filterCategory')?.value||activeCategory||'';
  if(!ads.length&&!moderationMode&&!onlyMine&&!favoritesMode&&(emptyCat==='vehicules'||emptyCat==='immobilier')){
    const proWord=emptyCat==='immobilier'?'agence immobilière':'garage';
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><b>Les premières annonces arrivent</b>Vous êtes un '+proWord+' ? Soyez parmi les premiers professionnels de votre région : vos annonces seront les premières vues.<br><a class="btn primary" style="margin-top:12px;display:inline-flex" href="pro-fondateur.html">⭐ Réserver ma place Fondateur</a><br><button type="button" class="btn" style="margin-top:8px" onclick="document.querySelector(\'.publish-trigger\')?.click()">＋ Particulier : déposer une annonce gratuitement</button></div>';
    return;
  }
  if(!ads.length){grid.innerHTML=moderationMode?'<div class="empty-state" style="grid-column:1/-1"><b>Rien à modérer ✓</b>Les annonces propres sont publiées automatiquement. Seules les exceptions apparaissent ici.</div>':'<div class="empty-state" style="grid-column:1/-1"><b>Soyez le premier à publier ici</b>Abracadeal vient d’ouvrir : une annonce déposée maintenant sera en tête de liste.<br><button type="button" class="btn primary" style="margin-top:12px" onclick="document.querySelector(\'.publish-trigger\')?.click()">＋ Déposer une annonce gratuitement</button></div>';return}
  if(isHomeDefaultView()) ads=groupHomeAds(ads);
  grid.innerHTML=ads.map(a=>{
    if(a.__homeHeader) return homeGroupHeaderHtml(a);
    const photos=visiblePhotosFor(a);
  window.currentDetailPhotoUrls=photos.map(p=>photoUrl(p.storage_path));
  window.currentDetailListing={id:a.id,owner_id:a.owner_id,title:a.title||'Annonce',price:money(a.price),show_phone:!!a.show_phone,imported:!!abracaWmOverlay(a)};
    const photoUrls=photos.map(p=>photoUrl(p.storage_path));
    const img=photoUrls.length?`<img class="ad-photo-img" ${thumbImgAttrs(photos[0].storage_path)} alt="" loading="lazy" decoding="async"><span class="photo-watermark${abracaWmOverlay(a)}">Abracadeal</span>`:`<img class="ad-photo-img abraca-default-photo" src="${ABRACA_DEFAULT_LISTING_PHOTO}" alt="Abracadeal">`;
    const carouselHtml=photoUrls.length>1?`<button type="button" class="carousel-arrow carousel-prev" aria-label="Photo précédente" onclick="event.stopPropagation();carouselStep(this.parentElement,-1)">‹</button><button type="button" class="carousel-arrow carousel-next" aria-label="Photo suivante" onclick="event.stopPropagation();carouselStep(this.parentElement,1)">›</button>`:'';
    const photoAttrs=photoUrls.length>1?` data-photo-urls="${esc(encodeURIComponent(JSON.stringify(photoUrls)))}" data-photo-idx="0"`:'';
    const canDelete=!!(currentUser&&(a.owner_id===currentUser.id||currentProfile?.is_admin));
    const canUseProBoost=!!(
      a.status==='active' &&
      currentUser &&
      (
        currentProfile?.is_admin===true ||
        (
          a.seller_type==='professionnel' &&
          currentProfile?.account_type==='professionnel' &&
          (onlyMine || a.owner_id===currentUser.id)
        )
      )
    );
    const statusBadge=onlyMine?listingExpiryMarkup(a):'';
    const moderationInfo=moderationRiskById.get(a.id);
    // Fix 21/09/2026 : une annonce active mais auto_published && !admin_reviewed
    // attend seulement une deuxieme verification manuelle (elle reste en ligne
    // entre-temps), contrairement a une annonce pending qui attend sa premiere decision.
    const needsSecondCheck=!!(moderationMode && currentProfile?.is_admin && a.status==='active' && moderationInfo?.auto_published && !moderationInfo?.admin_reviewed);
    const secondCheckBadge=needsSecondCheck?`<div style="display:inline-flex;margin-bottom:8px;padding:5px 9px;border-radius:999px;background:#d4edda;color:#155724;font-size:.74rem;font-weight:850">Déjà en ligne · à revérifier</div>`:'';
    const moderationActions=(moderationMode && currentProfile?.is_admin && a.status==='pending')
      ?`<button class="mini-btn" onclick="approveAd('${a.id}')">Accepter</button><button class="mini-btn danger" onclick="rejectAd('${a.id}')">Refuser</button>`
      :(needsSecondCheck?`<button class="mini-btn" onclick="validateAutoPublishedAd('${a.id}')">✓ Vérifiée, garder en ligne</button><button class="mini-btn danger" onclick="rejectAd('${a.id}')">Refuser</button>`:'');
    const featured=listingIsFeatured(a);
    return `<article class="ad-card ${a.category==='immobilier'?'immo-card':''} ${featured?'featured-card':''}" onclick="if(!event.target.closest('button,a'))openAd('${a.id}')" role="link" tabindex="0" onkeydown="if((event.key==='Enter'||event.key===' ')&&!event.target.closest('button,a')){event.preventDefault();openAd('${a.id}')}">
      <div class="ad-photo"${photoAttrs}>${img}${carouselHtml}<div class="card-top-badges">${featured?`<span class="featured-badge">À LA UNE</span>`:''}${a.seller_type==='professionnel'?`<span class="pro-card-badge">PRO</span>`:''}</div>${!moderationMode?listingCardActions(a):''}</div>
      <div class="ad-body">
        ${moderationRiskHTML(a)}
        ${statusBadge}
        ${secondCheckBadge}
        ${(moderationMode||onlyMine)?`<div class="ad-meta">${esc(vehicleSubcategoryOf(a)?subcategoryLabel(a.category,vehicleSubcategoryOf(a)):catLabel(a.category))}${equipmentTypeOf(a)?' · '+esc(equipmentTypeOf(a)):''}</div>`:''}
        <h3 class="ad-title">${adSeoTitle(a)}</h3>
        <div class="ad-price">${a.category==='immobilier'?realEstateCardPriceHtml(a):cataloguePrice(a)}</div>${a.loa&&a.loa_monthly?`<div class="loa-detail">LOA dès ${Number(a.loa_monthly).toLocaleString('fr-FR')} €/mois</div>`:''}
        ${a.category==='immobilier'?realEstateCardSpecsHtml(a):''}
        ${a.category==='immobilier'&&realEstateMetaOf(a).neighborhood?`<div class="immo-card-location-extra">${esc(realEstateMetaOf(a).neighborhood)}</div>`:''}
        ${(a.category==='vehicules'&&(a.vehicle_year||a.mileage||a.fuel||a.transmission))?`<div class="ad-specs ad-specs-line">${[a.vehicle_year?esc(a.vehicle_year):'',(a.mileage!==null&&a.mileage!==undefined&&a.mileage!=='')?Number(a.mileage).toLocaleString('fr-FR')+'\u00a0km':'',a.fuel?esc(a.fuel):'',a.transmission?esc(a.transmission):''].filter(Boolean).map(x=>`<span class="ad-spec">${x}</span>`).join('<span class="ad-spec-sep"> · </span>')}</div>`:''}
        <div class="ad-city"><svg class="ad-city-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>${esc(a.city)}${a.postal_code?` (${esc(a.postal_code)})`:''}</div>
        ${(moderationActions||(!moderationMode&&(canDelete||canUseProBoost)))?`<div class="ad-actions">
          ${moderationActions}
          ${(!moderationMode&&canUseProBoost)?(listingIsFeatured(a)?`<button class="mini-btn boost-btn boost-active" disabled>${currentProfile?.is_admin?'Boost actif · Admin':'Boost actif'}</button>`:`<button class="mini-btn boost-btn" onclick="event.stopPropagation();openPromotionForListing('${a.id}')">${currentProfile?.is_admin?'Booster · Admin':'Booster'}</button>`):''}
          ${(!moderationMode&&proMonthlyAllowance?.eligible&&a.status==='active'&&a.seller_type==='professionnel'&&a.owner_id===currentUser?.id)?`${listingIsFeatured(a)?'':`<button class="mini-btn pro-month-btn" ${Number(proMonthlyAllowance.featured_left||0)>0?'':'disabled'} onclick="event.stopPropagation();useProMonthlyAllowance('${a.id}','featured',this)">⭐ À la une 7 j · offert (${Number(proMonthlyAllowance.featured_left||0)}/5)</button>`}<button class="mini-btn pro-month-btn" ${Number(proMonthlyAllowance.bumps_left||0)>0?'':'disabled'} onclick="event.stopPropagation();useProMonthlyAllowance('${a.id}','bump',this)">⬆️ Remonter · offert (${Number(proMonthlyAllowance.bumps_left||0)}/5)</button>`:''}
          ${(!moderationMode&&canDelete&&a.owner_id===currentUser?.id&&canRenewPrivateListing(a))?`<button class="mini-btn" onclick="event.stopPropagation();renewPrivateListing('${a.id}',this)">Prolonger gratuitement · 60 jours</button>`:''}
          ${(!moderationMode&&canDelete&&!currentProfile?.is_admin&&a.status==='active'&&!a.revision_of)?`<button class="mini-btn" onclick="event.stopPropagation();editAd('${a.id}')">Modifier</button>`:''}
          ${(!moderationMode&&canDelete&&!currentProfile?.is_admin)?`<button class="mini-btn danger" onclick="event.stopPropagation();deleteAd('${a.id}')">Supprimer</button>`:''}
        </div>`:''}
      </div></article>`;
  }).join('');
  queueMicrotask(()=>hydrateFavoriteCounts(grid));
  updateQuickFilterLabels();
}

$('#promotionPayBtn')?.addEventListener('click',()=>toast('Tarification Abracadeal en cours de refonte.'));

$('#buyProBoostsBtn')?.addEventListener('click',()=>{closeModal('accountModal');openProBoostStore();});
$('#useBoost7Btn')?.addEventListener('click',()=>useProBoostCredit(7));
$('#useBoost30Btn')?.addEventListener('click',()=>useProBoostCredit(30));

const paymentParams=new URLSearchParams(location.search);
if(paymentParams.get('payment')==='photos-success'){
  setTimeout(async()=>{try{await loadAds()}catch{};toast('Paiement confirmé · Pack Photos activé sur votre annonce');try{history.replaceState({},document.title,location.pathname+(location.hash||''))}catch{}},350);
}
if(paymentParams.get('payment')==='success'){
  let pendingProBoost='';
  try{pendingProBoost=sessionStorage.getItem('abraca_pending_pro_boost')||''}catch(_){}
  setTimeout(async()=>{
    try{await loadAds()}catch{}
    if(pendingProBoost){
      try{
        await loadProBoostWallet();
        for(let attempt=0;attempt<4 && Number(proBoostWalletState[7]||0)+Number(proBoostWalletState[30]||0)===0;attempt++){
          await new Promise(resolve=>setTimeout(resolve,650));
          await loadProBoostWallet();
        }
      }catch{}
      if($('#paymentSuccessTitle'))$('#paymentSuccessTitle').textContent='Boosts ajoutés';
      if($('#paymentSuccessText'))$('#paymentSuccessText').textContent='Vos jetons Boost ont été ajoutés à votre espace Pro. Vous pouvez maintenant les utiliser sur vos annonces.';
      if($('#paymentSuccessNote'))$('#paymentSuccessNote').textContent='Chaque clic sur Booster retire 1 jeton de la durée choisie.';
      toast('Paiement confirmé · jetons Boost ajoutés');
      try{sessionStorage.removeItem('abraca_pending_pro_boost')}catch(_){}
    }else{
      if($('#paymentSuccessTitle'))$('#paymentSuccessTitle').textContent='Paiement confirmé';
      if($('#paymentSuccessText'))$('#paymentSuccessText').textContent='Tout est bon. La mise en avant de vos annonces est activée automatiquement.';
      if($('#paymentSuccessNote'))$('#paymentSuccessNote').textContent='Vous pouvez maintenant revenir à vos annonces.';
      toast('Paiement confirmé · mise en avant activée');
    }
    openModal('paymentSuccessModal');
    try{
      const cleanUrl=location.pathname+(location.hash||'');
      history.replaceState({},document.title,cleanUrl);
    }catch{}
  },700);
}

function isProFeedDefaultCondition(a){return a?.category==='vehicules'&&String(a?.source||'').startsWith('feed:')&&/^(bon [ée]tat|occasion|used)$/i.test(String(a?.item_condition||'').trim());}
function detailSpecsFor(a){
  const specs=[];
  const sub=vehicleSubcategoryOf(a);
  // 29/10/2026 (Anthony) : véhicules importés des garages : pas de « Bon état » (leur site dit seulement « Occasion »).
  if(a.item_condition&&!isProFeedDefaultCondition(a)) specs.push(['État',repairImportedText(a.item_condition)]);
  if(sub) specs.push(['Type',subcategoryLabel(a.category,sub)]);
  if(equipmentTypeOf(a)) specs.push(['Produit',equipmentTypeOf(a)]);
  if(a.category==='vehicules' && VEHICLE_DETAIL_TYPES.includes(sub)){
    if(a.vehicle_make) specs.push(['Marque',a.vehicle_make]);
    if(a.vehicle_model) specs.push(['Modèle',a.vehicle_model]);
    if(a.vehicle_year) specs.push(['Année',String(a.vehicle_year)]);
    if(a.mileage!==null && a.mileage!==undefined) specs.push(['Kilométrage',Number(a.mileage).toLocaleString('fr-FR')+' km']);
    if(a.fuel) specs.push(['Carburant',a.fuel]);
    if(a.transmission) specs.push(['Boîte',a.transmission]);
    if(a.crit_air) specs.push(['Crit’Air',a.crit_air==='Non classé'?'Non classé':`Crit’Air ${a.crit_air}`]);
    const m=vehicleMetaOf(a);
    if(m.firstRegistration) specs.push(['1re mise en circulation',formatFirstRegistration(m.firstRegistration)]);
    if(m.body) specs.push(['Carrosserie',m.body]);
    if(m.doors) specs.push(['Nombre de portes',String(m.doors)]);
    if(m.seats) specs.push(['Nombre de places',String(m.seats)]);
    if(m.permit) specs.push(['Permis',m.permit]);
    if(m.finish) specs.push(['Finition',m.finish]);
    if(m.version) specs.push(['Version constructeur',m.version]);
    if(m.color) specs.push(['Couleur',m.color]);
    if(m.upholstery) specs.push(['Sellerie',m.upholstery]);
    if(m.fiscalPower) specs.push(['Puissance fiscale',`${m.fiscalPower} CV`]);
    if(m.dinPower) specs.push(['Puissance DIN',`${m.dinPower} ch`]);
    if(m.co2!==undefined) specs.push(['Émissions CO₂',`${m.co2} g/km`]);
    if(m.history) specs.push(['Historique du véhicule',m.history]);
    if(m.technicalInspection) specs.push(['Contrôle technique',m.technicalInspection]);
    if(m.maintenance) specs.push(['Entretien du véhicule',m.maintenance]);
    if(m.warranty) specs.push(['Garantie',m.warranty]);
  }
  if(a.category==='immobilier'){
    const m=realEstateMetaOf(a);
    const immoSub=vehicleSubcategoryOf(a);
    const isRental=['location','saisonniere'].includes(immoSub);
    const NC='Non communiqué';
    const has=v=>v!==undefined&&v!==null&&v!=='';
    const eur=v=>has(v)?formatImmoMoney(v):NC;
    // 29/10/2026 (Anthony) : informations essentielles / obligatoires toujours affichées, même absentes (« Non communiqué »).
    // 30/10/2026 : un bâtiment / une grange n'a ni « surface habitable » ni pièces → simple « Surface ».
    if(immoSub!=='parking-garage'&&immoSub!=='vente-terrain'&&immoSub!=='vente-batiment'){
      specs.push(['Surface habitable',has(m.surface)?`${Number(m.surface).toLocaleString('fr-FR')} m²`:NC]);
      specs.push(['Pièces',has(m.rooms)?String(m.rooms):NC]);
      if(has(m.bedrooms)) specs.push(['Chambres',String(m.bedrooms)]);
      specs.push(['Dépenses d’énergie estimées / an',has(m.energyCostMin)?`${formatImmoMoney(m.energyCostMin)} à ${formatImmoMoney(m.energyCostMax||m.energyCostMin)}`:(m.dpe==='NON SOUMIS'?'Non soumis au DPE':NC)]);
    }else if(has(m.surface)) specs.push(['Surface',`${Number(m.surface).toLocaleString('fr-FR')} m²`]);
    if(isRental){
      specs.push(['Charges / mois',eur(m.rentCharges)]);
      specs.push(['Dépôt de garantie',eur(m.deposit)]);
      specs.push(['Honoraires locataire',m.fees||NC]);
      specs.push(['Meublé',m.furnished||NC]);
    }else{
      specs.push(['Honoraires',m.fees||NC]);
      const copro=String(m.coownership||'');const noCopro=/^non$/i.test(copro);
      if(immoSub!=='vente-terrain'&&immoSub!=='vente-batiment'){
        specs.push(['Copropriété',copro||(has(m.lots)||has(m.annualCharges)?'Oui':NC)]);
        if(!noCopro){
          specs.push(['Nombre de lots',has(m.lots)?String(m.lots):NC]);
          specs.push(['Charges de copropriété / an',eur(m.annualCharges)]);
          specs.push(['Procédure en cours (syndicat)',m.procedure||NC]);
        }
      }
      specs.push(['Taxe foncière / an',eur(m.propertyTax)]);
    }
    if(has(m.landSurface)) specs.push(['Terrain',`${Number(m.landSurface).toLocaleString('fr-FR')} m²`]);
    if(has(m.bathrooms)) specs.push(['Salles de bain / eau',String(m.bathrooms)]);
    if(has(m.floor)) specs.push(['Étage',Number(m.floor)===0?'Rez-de-chaussée':String(m.floor)]);
    if(has(m.totalFloors)) specs.push(['Étages immeuble',String(m.totalFloors)]);
    if(!isRental&&m.furnished) specs.push(['Meublé',m.furnished]);
    if(m.yearBuilt) specs.push(['Année de construction',String(m.yearBuilt)]);
    if(m.propertyCondition) specs.push(['État du bien',m.propertyCondition]);
    if(m.heating) specs.push(['Chauffage',m.heating]);
    if(m.orientation) specs.push(['Exposition',m.orientation]);
    if(m.neighborhood) specs.push(['Quartier / secteur',m.neighborhood]);
    if(m.mandate) specs.push(['Référence / mandat',m.mandate]);
    if(m.availableDate) specs.push(['Disponible le',new Date(m.availableDate+'T12:00:00').toLocaleDateString('fr-FR')]);
  }
  return specs;
}

function openDiagnosticInfo(kind){
  const title=document.getElementById('diagnosticInfoTitle');
  const body=document.getElementById('diagnosticInfoBody');
  if(!title||!body)return;
  if(kind==='ges'){
    title.textContent='GES — émissions de gaz à effet de serre';
    body.innerHTML='<p>Le <strong>GES</strong> indique le niveau d’émissions de gaz à effet de serre du logement.</p><p>La classe va de <strong>A</strong> pour les émissions les plus faibles à <strong>G</strong> pour les plus élevées.</p>';
  }else{
    title.textContent='Classe énergie — DPE';
    body.innerHTML='<p>Le <strong>DPE</strong> mesure la performance énergétique du logement.</p><p>La classe va de <strong>A</strong> pour les logements les plus performants à <strong>G</strong> pour les plus énergivores. La consommation indiquée est exprimée en <strong>kWh/m²/an</strong>.</p>';
  }
  openModal('diagnosticInfoModal');
}

function openVehicleEquipmentModal(list=[]){
  const target=document.getElementById('vehicleEquipmentModalList');
  if(!target)return;
  target.innerHTML=(Array.isArray(list)?list:[]).map(x=>`<div class="vehicle-equipment-modal-item">${esc(x)}</div>`).join('');
  openModal('vehicleEquipmentModal');
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-equipment-list]');
  if(!btn)return;
  e.preventDefault();
  try{
    const list=JSON.parse(decodeURIComponent(btn.dataset.equipmentList||''));
    openVehicleEquipmentModal(Array.isArray(list)?list:[]);
  }catch(err){
    console.warn('Equipment modal error',err);
    toast("Impossible d’afficher les équipements");
  }
});

function listingDateLabel(a){
  if(!a.created_at) return '';
  try{
    return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(a.created_at));
  }catch{return '';}
}


function mapCacheKey(city,postalCode){
  return `abracadeal-map:v2:${String(city||'').trim().toLowerCase()}:${String(postalCode||'').trim()}`;
}
async function geocodeApproxLocation(city,postalCode){
  const key=mapCacheKey(city,postalCode);
  try{
    const cached=localStorage.getItem(key);
    if(cached){
      const parsed=JSON.parse(cached);
      if(parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)) return parsed;
    }
  }catch{}
  const cityNorm=String(city||'').trim().toLowerCase();
  const postal=String(postalCode||'').trim();
  const isMonaco=cityNorm==='monaco' || postal.startsWith('980');
  const attempts=isMonaco
    ?[
      {countryCode:'mc',query:[postal,city,'Monaco'].filter(Boolean).join(' ')},
      {countryCode:'mc',query:[city,'Monaco'].filter(Boolean).join(' ')},
      {countryCode:'mc',query:[postal,'Monaco'].filter(Boolean).join(' ')}
    ]
    :[
      {countryCode:'fr',query:[postal,city,'France'].filter(Boolean).join(' ')},
      {countryCode:'fr',query:[city,'France'].filter(Boolean).join(' ')},
      {countryCode:'fr',query:[postal,city].filter(Boolean).join(' ')}
    ];
  for(const attempt of attempts){
    const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=${attempt.countryCode}&limit=1&accept-language=fr&q=${encodeURIComponent(attempt.query)}`;
    const res=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!res.ok) continue;
    const data=await res.json();
    if(!Array.isArray(data)||!data.length) continue;
    const point={lat:Number(data[0].lat),lon:Number(data[0].lon)};
    if(!Number.isFinite(point.lat)||!Number.isFinite(point.lon)) continue;
    try{localStorage.setItem(key,JSON.stringify(point));}catch{}
    return point;
  }
  throw new Error('not-found');
}
async function renderApproxMap(a){
  const el=document.getElementById(`detailMap-${a.id}`);
  if(!el) return;
  try{await ensureLeaflet();}catch(_){}
  if(!document.body.contains(el)) return;
  if(!window.L){
    el.innerHTML='<div class="detail-map-loading">Carte indisponible pour le moment.</div>';
    return;
  }
  if(currentDetailMap){
    try{currentDetailMap.remove();}catch{}
    currentDetailMap=null;
  }
  try{
    const point=await geocodeApproxLocation(a.city,a.postal_code);
    if(!document.body.contains(el)) return;
    el.innerHTML='';
    currentDetailMap=L.map(el,{scrollWheelZoom:false,zoomControl:true,attributionControl:true}).setView([point.lat,point.lon],13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; OpenStreetMap contributors'
    }).addTo(currentDetailMap);
    L.circle([point.lat,point.lon],{
      radius:a.postal_code?900:1500,
      weight:2,
      fillOpacity:.16
    }).addTo(currentDetailMap);
    setTimeout(()=>{try{currentDetailMap&&currentDetailMap.invalidateSize();}catch{}},120);
  }catch(err){
    if(document.body.contains(el)) el.innerHTML='<div class="detail-map-loading">La carte de cette localisation n’est pas disponible pour le moment.</div>';
  }
}


/* ===== Fiche annonce mobile façon « grandes plateformes » (19/10/2026) =====
   Éléments ajoutés à la fiche et visibles uniquement sur mobile (CSS detail-mobile-20261019.css) :
   barre du haut (retour, titre, partager, favori), carte vendeur cliquable sous le prix,
   « Les + de cette annonce » en pictos, icônes sur les informations clés et barre d'actions
   fixe en bas (Voir le numéro / Message). Le desktop n'affiche aucun de ces éléments. */
const DM_SVG=d=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
const DM_ICONS={
  brand:'<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="1.4"/>',
  car:'<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13.5" r=".9"/><circle cx="16.5" cy="13.5" r=".9"/>',
  calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  gauge:'<path d="M4.5 17a8 8 0 1 1 15 0"/><path d="m12 13 3.5-3.5"/><circle cx="12" cy="13" r="1.2"/>',
  fuel:'<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9"/><path d="M14 8h2l2 2v7a1.5 1.5 0 0 0 3 0v-6l-2-3"/>',
  gear:'<path d="M6 4v16M12 4v8M18 4v8M6 12h12"/><circle cx="6" cy="4" r="1.3"/><circle cx="12" cy="4" r="1.3"/><circle cx="18" cy="4" r="1.3"/><circle cx="6" cy="20" r="1.3"/>',
  leaf:'<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  star:'<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  tag:'<path d="M4 12V4h8l8 8-8 8z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
  door:'<rect x="6" y="3" width="12" height="18" rx="1.5"/><circle cx="14.5" cy="12" r=".9"/>',
  seat:'<path d="M7 4h4v9H7zM13 4h4v9h-4z"/><path d="M5 13h14v4H5zM7 17v3M17 17v3"/>',
  palette:'<path d="M12 4a8 8 0 1 0 0 16c1.2 0 1.6-1 1-2-.7-1.2.2-2.4 1.5-2.4H17a3 3 0 0 0 3-3C20 7.5 16.4 4 12 4z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="8" r="1"/><circle cx="15" cy="8.5" r="1"/>',
  power:'<path d="M13 3 6 13h5l-1 8 7-10h-5z"/>',
  shield:'<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  wrench:'<path d="M15 4a4 4 0 0 0-4.6 5.4L4 15.8 6.2 18l6.4-6.4A4 4 0 0 0 18 7l-2.4 2.4-2-2L16 5z"/>',
  history:'<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4M12 8v4l3 2"/>',
  area:'<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h5M15 20v-5M9 4v5M20 15h-5"/>',
  rooms:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
  bed:'<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1"/><circle cx="7" cy="11" r="1.6"/>',
  bath:'<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
  floors:'<path d="M5 20V8l7-4 7 4v12M5 12h14M5 16h14M9 20v-2h6v2"/>',
  pin:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
  euro:'<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10h9M4 14h9"/>',
  heat:'<path d="M8 4c-1.5 2 1.5 3 0 5s1.5 3 0 5M12 4c-1.5 2 1.5 3 0 5s1.5 3 0 5M16 4c-1.5 2 1.5 3 0 5s1.5 3 0 5"/><path d="M5 19h14"/>',
  sun:'<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  sofa:'<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 11a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v6H3z"/><path d="M5 17v2M19 17v2"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  parking:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3"/>',
  snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
  light:'<path d="M14 6a6 6 0 0 1 0 12z"/><path d="M3 8h7M3 12h7M3 16h7"/>',
  cruise:'<circle cx="12" cy="12" r="8"/><path d="m12 12 3-3"/><circle cx="12" cy="12" r="1.2"/><path d="M8 16h8"/>',
  phone:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  camera:'<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
  roof:'<path d="M3 12 12 5l9 7"/><path d="M8 9.5h8"/>',
  wheel:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6M5.5 15.5 10.3 13M18.5 15.5 13.7 13"/>',
  pool:'<path d="M3 17c2 1.3 4 1.3 6 0s4-1.3 6 0 4 1.3 6 0M3 20.5c2 1.3 4 1.3 6 0s4-1.3 6 0 4 1.3 6 0"/><path d="M8 15V5a2 2 0 0 1 4 0M14 15V5a2 2 0 0 1 4 0M8 9h6"/>',
  lift:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="m9.5 9 2.5-2.5L14.5 9M9.5 15l2.5 2.5 2.5-2.5"/>',
  tree:'<path d="M12 3 6 11h3l-4 6h14l-4-6h3z"/><path d="M12 17v4"/>',
  back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  share:'<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  flag:'<path d="M6 21V4M6 4h10l-2 4 2 4H6"/>'
};
function dmIcon(name){return DM_SVG(DM_ICONS[name]||DM_ICONS.check);}
function dmSpecIcon(label){
  const l=String(label||'').toLowerCase();
  const rules=[
    [/marque/,'brand'],[/mod[eè]le|version|finition|carrosserie/,'car'],[/kilom/,'gauge'],[/carburant|[ée]nergie/,'fuel'],
    [/bo[iî]te/,'gear'],[/crit|co₂|co2/,'leaf'],[/^[ée]tat/,'star'],[/type|produit/,'tag'],[/porte/,'door'],[/place|sellerie/,'seat'],
    [/couleur/,'palette'],[/puissance/,'power'],[/garantie/,'shield'],[/entretien|contr[oô]le/,'wrench'],[/historique/,'history'],
    [/permis/,'doc'],[/ann[ée]e|mise en circulation|disponible|construction/,'calendar'],[/surface|terrain/,'area'],
    [/pi[eè]ces/,'rooms'],[/chambre/,'bed'],[/salle/,'bath'],[/[ée]tage/,'floors'],[/quartier|secteur/,'pin'],
    [/charge|taxe|d[ée]p[oô]t|honoraire/,'euro'],[/chauffage/,'heat'],[/exposition/,'sun'],[/meubl/,'sofa'],
    [/copropri|lots|r[ée]f[ée]rence|mandat/,'doc']
  ];
  const hit=rules.find(([re])=>re.test(l));
  return dmIcon(hit?hit[1]:'check');
}
function dmEquipmentIcon(label){
  const l=String(label||'').toLowerCase();
  const rules=[
    [/stationnement|radar|park/,'parking'],[/cam[ée]ra/,'camera'],[/chauffant/,'seat'],[/si[eè]ge|cuir|sellerie/,'seat'],
    [/led|x[ée]non|phare|feux/,'light'],[/r[ée]gulateur|limiteur/,'cruise'],[/gps|navigation/,'pin'],[/clim/,'snow'],
    [/toit|cabriolet|capote/,'roof'],[/bluetooth|carplay|android|usb|t[ée]l[ée]phone|audio/,'phone'],[/jante|roue/,'wheel'],
    [/attelage|crochet/,'wrench'],[/balcon|terrasse|jardin/,'tree'],[/piscine/,'pool'],[/ascenseur/,'lift'],
    [/parking|garage|box/,'parking'],[/cave|cellier|grenier/,'rooms'],[/gardien|digicode|interphone|alarme|s[ée]curit/,'shield'],
    [/chemin[ée]e|chauffage/,'heat'],[/vue|lumineux|exposition/,'sun'],[/meubl/,'sofa'],[/cuisine/,'rooms']
  ];
  const hit=rules.find(([re])=>re.test(l));
  return dmIcon(hit?hit[1]:'check');
}
function dmInitials(name){
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  return (parts.length>1?parts[0][0]+parts[1][0]:(parts[0]||'A').slice(0,2)).toUpperCase();
}

// 29/10/2026 : statistiques vendeur (vues, numéros affichés, clics Appeler) — une fois par visiteur, annonce et jour.
function abracaVisitorId(){try{let v=localStorage.getItem('abraca_vid');if(!v){v=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2));localStorage.setItem('abraca_vid',v);}return v;}catch(_){return'';}}
function trackListingEvent(id,kind){try{if(!sb||!id)return;sb.rpc('track_listing_event',{p_listing_id:id,p_kind:kind,p_visitor:abracaVisitorId()||null}).then(()=>{},()=>{});}catch(_){}}
window.trackListingEvent=trackListingEvent;
window.openAd=id=>{
  const a=allAds.find(x=>x.id===id)||detailAdsCache.get(id);if(!a)return;
  if(a.category==='vacances'){
    rememberViewed(id);
    location.href='logement-vacances.html?id='+encodeURIComponent(id);
    return;
  }
  rememberViewed(id);
  if(!(currentUser&&a.owner_id===currentUser.id))trackListingEvent(id,'view');
  if(!onlyMine&&!favoritesMode&&!moderationMode)renderRecentViewed();
  const photos=visiblePhotosFor(a);
  window.currentDetailPhotoUrls=photos.map(p=>photoUrl(p.storage_path));
  window.currentDetailListing={id:a.id,owner_id:a.owner_id,title:a.title||'Annonce',price:money(a.price),show_phone:!!a.show_phone,imported:!!abracaWmOverlay(a)};
  const specs=detailSpecsFor(a);
  const isOwner=!!(currentUser&&a.owner_id===currentUser.id);
  const canDelete=!!(isOwner||currentProfile?.is_admin);
  const sellerLabel=a.seller_type==='professionnel'?'Vendeur professionnel':'Vendeur particulier';
  const categoryLabel=vehicleSubcategoryOf(a)
    ?subcategoryLabel(a.category,vehicleSubcategoryOf(a))
    :catLabel(a.category);
  const created=listingDateLabel(a);
  // Fix 21/09/2026 : la barre de recherche flottante (position:fixed, z-index superieur au
  // contenu de la grille) peut recouvrir les boutons de moderation d'une pastille pendant le
  // scroll, les rendant inaccessibles (retour utilisateur : "ya des annonces impossible a
  // moderer les touches sont inaccessible"). On duplique donc l'action de moderation ici, dans
  // la fiche annonce complete (z-index du #detailModal deja au-dessus de tout le reste du site),
  // qui reste toujours accessible quel que soit le defilement de la grille.
  const modInfoForDetail=moderationRiskById.get(a.id);
  const needsSecondCheckDetail=!!(moderationMode && currentProfile?.is_admin && a.status==='active' && modInfoForDetail?.auto_published && !modInfoForDetail?.admin_reviewed);
  const detailModerationActions=(moderationMode && currentProfile?.is_admin)
    ? (a.status==='pending'
        ? `<div class="detail-moderation-actions">${moderationRiskHTML(a)}<button class="btn primary" type="button" onclick="approveAd('${a.id}').then(()=>closeModal('detailModal'))">Accepter</button><button class="btn ghost danger" type="button" onclick="rejectAd('${a.id}').then(()=>closeModal('detailModal'))">Refuser</button></div>`
        : (needsSecondCheckDetail
            ? `<div class="detail-moderation-actions">${moderationRiskHTML(a)}<div class="moderation-second-check-badge">Déjà en ligne · à revérifier</div><button class="btn primary" type="button" onclick="validateAutoPublishedAd('${a.id}').then(()=>closeModal('detailModal'))">✓ Vérifiée, garder en ligne</button><button class="btn ghost danger" type="button" onclick="rejectAd('${a.id}').then(()=>closeModal('detailModal'))">Refuser</button></div>`
            : ''))
    : '';

  const gallery=photos.length
    ?`<div class="detail-gallery">
        <div class="detail-main-wrap" onclick="openPhotoLightboxFromCurrent()" role="button" tabindex="0" aria-label="Agrandir la photo">
          <img class="detail-main-photo" id="detailMainPhoto" onload="refreshDetailWatermark()" src="${photoUrl(photos[0].storage_path)}" alt="${esc(a.title)}" onclick="event.stopPropagation();openPhotoLightboxFromCurrent()">
          <div class="detail-photo-tools" onclick="event.stopPropagation()">
            <button type="button" class="detail-photo-tool" data-share-listing="${a.id}" aria-label="Partager l’annonce" onclick="shareListingSmart('${a.id}',event)"><svg class="share-node-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="M8.3 10.8 15.7 6.2M8.3 13.2l7.4 4.6"></path></svg><span>Partager</span></button>
            <button type="button" id="detailFavoriteBtn-${a.id}" data-favorite-id="${a.id}" class="detail-photo-tool heart ${favoriteIds.has(a.id)?'active':''}" aria-label="${favoriteIds.has(a.id)?'Retirer des favoris':'Ajouter aux favoris'}" onclick="toggleFavorite('${a.id}',event)"><span class="heart-icon">${favoriteIds.has(a.id)?'♥':'♡'}</span><span class="fav-count" id="detailFavoriteCount-${a.id}" data-fav-count-id="${a.id}"></span></button>
          </div>
          ${photos.length>1?`<button type="button" class="detail-gallery-arrow detail-gallery-prev" aria-label="Photo précédente" onclick="event.stopPropagation();changeDetailPhoto(-1)">&#10094;</button><button type="button" class="detail-gallery-arrow detail-gallery-next" aria-label="Photo suivante" onclick="event.stopPropagation();changeDetailPhoto(1)">&#10095;</button>`:""}
          <span class="photo-watermark${abracaWmOverlay(a)}" id="detailPhotoWatermark">Abracadeal</span><div class="detail-photo-count" id="detailPhotoCount">1 / ${photos.length}</div>
        </div>
        ${photos.length>1?`<div class="detail-thumbs">
          ${photos.map((p,i)=>`<button type="button" class="${i===0?'active':''}" onclick="selectDetailPhoto(this,'${photoUrl(p.storage_path)}',${i+1},${photos.length})"><img src="${photoUrl(p.storage_path)}" alt="Photo ${i+1}"></button>`).join('')}
        </div>`:''}
      </div>`
    :`<div class="detail-gallery"><div class="detail-main-wrap"><img class="detail-main-photo abraca-default-photo" src="${ABRACA_DEFAULT_LISTING_PHOTO}" alt="Abracadeal"></div></div>`;

  $('#detailTitle').textContent='Annonce';
  const dmFavActive=favoriteIds.has(a.id);
  const dmEquipment=listingEquipmentOf(a);
  const dmTopbar=`<div class="dm-topbar">
      <button type="button" class="dm-icon-btn" aria-label="Retour" onclick="closeModal('detailModal')">${dmIcon('back')}</button>
      <div class="dm-topbar-title">${esc(a.title||'Annonce')}</div>
      <button type="button" class="dm-icon-btn" aria-label="Partager l’annonce" onclick="shareListingSmart('${a.id}',event)">${dmIcon('share')}</button>
      <button type="button" class="dm-icon-btn dm-fav ${dmFavActive?'active':''}" data-favorite-id="${a.id}" aria-label="${dmFavActive?'Retirer des favoris':'Ajouter aux favoris'}" onclick="toggleFavorite('${a.id}',event)"><span class="dm-fav-count" data-fav-count-id="${a.id}"></span><span class="heart-icon">${dmFavActive?'♥':'♡'}</span></button>
    </div>`;
  const dmSeller=a.is_showroom?'':`<button type="button" class="dm-seller" onclick="closeModal('detailModal');openSellerProfile('${a.owner_id}')">
      <span class="dm-seller-avatar" id="dmSellerAvatar-${a.id}">${dmInitials(sellerLabel)}</span>
      <span class="dm-seller-info">
        <b id="dmSellerName-${a.id}">${sellerLabel}</b>
        <span class="dm-seller-rating" id="dmSellerRating-${a.id}"><span class="dm-stars">☆☆☆☆☆</span></span>
        <span class="dm-seller-badge">${a.seller_type==='professionnel'?'PRO':'Particulier'}</span>
        <span class="dm-seller-count" id="dmSellerCount-${a.id}"></span>
      </span>
      <span class="dm-chevron">${dmIcon('chevron')}</span>
    </button>`;
  const dmPlus=dmEquipment.length?`<section class="dm-plus">
      <h3>Les + de cette annonce</h3>
      <div class="dm-plus-grid">${dmEquipment.slice(0,4).map(x=>`<div class="dm-plus-item"><span class="dm-plus-icon">${dmEquipmentIcon(x)}</span><span class="dm-plus-label">${esc(x)}</span></div>`).join('')}</div>
      ${dmEquipment.length>4?`<button type="button" class="dm-link-btn" data-equipment-list="${esc(encodeURIComponent(JSON.stringify(dmEquipment)))}">Voir les ${dmEquipment.length} équipements</button>`:''}
    </section>`:'';
  const dmActions=isOwner?'':`<div class="dm-actions">
      ${a.show_phone?`<button type="button" class="dm-action dm-action-ghost" id="dmPhoneBtn-${a.id}" onclick="viewListingPhone('${a.id}')">Voir le numéro</button>`:''}
      <button type="button" class="dm-action dm-action-primary" onclick="startMessageForListing('${a.id}')">Message</button>
    </div>`;
  $('#detailBody').innerHTML=`
    <div class="listing-detail${isOwner?'':' dm-has-actions'}">
      ${dmTopbar}
      ${gallery}
      <div class="detail-content">
        <main>
          <div class="detail-topline">
            <div>
              <h1 class="detail-title-main">${esc(a.title)}</h1>
              <div class="detail-price-main">${money(a.price)}</div>
              <div class="detail-location">📍 ${esc(a.city)}${a.postal_code?` (${esc(a.postal_code)})`:''}</div>
              <div class="detail-meta-line">${esc(categoryLabel)}${created?' · Publiée le '+esc(created):''}</div>
              ${a.listing_reference?`<div class="detail-meta-line">Référence de l’annonce : <b>${esc(a.listing_reference)}</b></div>`:''}
            </div>
          </div>

          ${dmSeller}

          ${detailModerationActions}

          ${dmPlus}

          ${specs.length?`
          <section class="detail-section">
            <h3>Les informations clés</h3>
            <div class="detail-specs">
              ${specs.map(([label,value])=>`<div class="detail-spec"><span><i class="dm-spec-icon">${dmSpecIcon(label)}</i>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}
            </div>
            ${a.category==='immobilier'&&listingEquipmentOf(a).length?`
              <div class="detail-immo-equipment-block">
                <h4 class="detail-immo-equipment-title">Équipements & prestations</h4>
                <div class="detail-equipment-summary">
                  <div class="detail-equipment-preview">${listingEquipmentOf(a).slice(0,6).map(x=>`<span class="detail-equipment-chip">✓ ${esc(x)}</span>`).join('')}</div>
                  ${listingEquipmentOf(a).length>6?`<button type="button" class="detail-equipment-more" data-equipment-list="${esc(encodeURIComponent(JSON.stringify(listingEquipmentOf(a))))}">Voir les ${listingEquipmentOf(a).length} équipements</button>`:''}
                </div>
              </div>`:''}
          </section>`:''}

          ${a.category==='immobilier'&&(realEstateMetaOf(a).dpe||realEstateMetaOf(a).ges)?`
          <section class="detail-section">
            <h3>Diagnostics</h3>
            <div class="diagnostic-panel">
              ${realEstateMetaOf(a).dpe?`<div class="diagnostic-row"><div class="diagnostic-label"><span class="diagnostic-icon">▤</span><span>Classe énergie</span><button type="button" class="diagnostic-info" onclick="openDiagnosticInfo('dpe')" aria-label="Informations sur la classe énergie">i</button></div><div>${diagnosticScaleHtml('dpe',realEstateMetaOf(a).dpe)}${realEstateMetaOf(a).energyConsumption!==undefined?`<div class="diagnostic-meta"><b>${Number(realEstateMetaOf(a).energyConsumption).toLocaleString('fr-FR')} kWh/m²/an</b></div>`:''}</div></div>`:''}
              ${realEstateMetaOf(a).ges?`<div class="diagnostic-row"><div class="diagnostic-label"><span class="diagnostic-icon">▤</span><span>GES</span><button type="button" class="diagnostic-info" onclick="openDiagnosticInfo('ges')" aria-label="Informations sur le GES">i</button></div><div>${diagnosticScaleHtml('ges',realEstateMetaOf(a).ges)}</div></div>`:''}
            </div>
            ${(realEstateMetaOf(a).energyCostMin!==undefined||realEstateMetaOf(a).energyCostMax!==undefined)?`<div class="diagnostic-meta" style="margin-top:10px">Dépenses annuelles d’énergie estimées : <b>${realEstateMetaOf(a).energyCostMin!==undefined?formatImmoMoney(realEstateMetaOf(a).energyCostMin):'—'} à ${realEstateMetaOf(a).energyCostMax!==undefined?formatImmoMoney(realEstateMetaOf(a).energyCostMax):'—'}</b>${realEstateMetaOf(a).dpeDate?` · DPE du ${new Date(realEstateMetaOf(a).dpeDate+'T12:00:00').toLocaleDateString('fr-FR')}`:''}</div>`:''}
          </section>`:''}

          ${a.category!=='immobilier'&&listingEquipmentOf(a).length?`
          <section class="detail-section dm-hide-mobile">
            <h3>Équipements</h3>
            <div class="detail-equipment-summary">
              <div class="detail-equipment-preview">${listingEquipmentOf(a).slice(0,6).map(x=>`<span class="detail-equipment-chip">✓ ${esc(x)}</span>`).join('')}</div>
              ${listingEquipmentOf(a).length>6?`<button type="button" class="detail-equipment-more" data-equipment-list="${esc(encodeURIComponent(JSON.stringify(listingEquipmentOf(a))))}">Voir les ${listingEquipmentOf(a).length} équipements</button>`:''}
            </div>
          </section>`:''}

          <section class="detail-section">
            <h3>Description</h3>
            <div class="detail-description">${esc(cleanDescription(a))}</div>
            ${/^feed:/.test(String(a.source||''))?`<p class="note" style="margin:10px 0 0;font-size:12.5px">Annonce reprise automatiquement du site du professionnel. Malgré notre vigilance, des erreurs ou des oublis peuvent s’y glisser : seules les informations confirmées par le professionnel font foi. Vérifiez-les avec lui avant tout engagement.</p>`:''}
          </section>

          <section class="detail-section">
            <h3>Localisation</h3>
            <div class="detail-map-head">
              <div>
                <div class="detail-map-place">${esc(a.city)}${a.postal_code?` (${esc(a.postal_code)})`:''}</div>
                <div class="detail-map-note">Localisation approximative · l’adresse exacte du vendeur n’est jamais affichée.</div>
              </div>
            </div>
            <div class="detail-map" id="detailMap-${a.id}"><div class="detail-map-loading">Chargement de la carte…</div></div>
          </section>
        </main>

        <aside>
          <div class="seller-card">
            <span class="seller-badge">${a.seller_type==='professionnel'?'PRO':'PARTICULIER'}</span>
            ${a.is_showroom?`
              <div id="sellerPublic-${a.id}">
                <h3>Abracadeal Showroom</h3>
                <p>${esc(a.city)}</p>
                <div class="note">Annonce de démonstration LOA · aucun vendeur réel n’est associé à cette fiche.</div>
              </div>
            `:`
              <div id="sellerPublic-${a.id}">
                <h3>${sellerLabel}</h3>
                <p>${esc(a.city)}</p>
                <div class="seller-rating-line"><span class="stars">☆☆☆☆☆</span><span class="rating-muted">Chargement des avis…</span></div>
              </div>
              <button type="button" class="seller-profile-link" onclick="closeModal('detailModal');openSellerProfile('${a.owner_id}')">Voir le profil et les avis</button>

              <div class="seller-contact">
                <aside class="buyer-safety-note" aria-label="Conseil de sécurité">Abracadeal ne gère aucun paiement. Méfiez-vous des mandats, coupons PCS ou liens de paiement : privilégiez la remise en main propre.</aside>
                ${(()=>{const n=a.category==='immobilier'?String(realEstateMetaOf(a).contactName||'').trim():'';return n?`<div class="listing-advisor">Votre contact pour ce bien : <strong>${esc(n)}</strong></div>`:'';})()}
                ${!isOwner?`<button class="btn primary" type="button" onclick="startMessageForListing('${a.id}')">Envoyer un message</button>`:''}
                <div class="phone-share-row">
                  ${a.show_phone
                    ?`<div class="phone-contact-box" id="phoneContact-${a.id}"><button class="btn ghost" type="button" onclick="viewListingPhone('${a.id}')">Voir le numéro</button><div class="contact-login-note">Le numéro est réservé aux membres connectés.</div></div>`
                    :`<div class="phone-contact-box note">Le vendeur a choisi de ne pas afficher son numéro.</div>`}
                  <div class="detail-inline-share" aria-label="Partager cette annonce">
                    <span class="detail-inline-share-label">Partager</span>
                    <button type="button" class="detail-share-logo sms" title="Partager par SMS" aria-label="Partager par SMS" onclick="shareListingSms('${a.id}')">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15v10h-8l-4.7 3.2.8-3.2H4.5z"/><circle cx="9" cy="10.5" r=".8"/><circle cx="12" cy="10.5" r=".8"/><circle cx="15" cy="10.5" r=".8"/></svg>
                    </button>
                    <button type="button" class="detail-share-logo whatsapp" title="Partager sur WhatsApp" aria-label="Partager sur WhatsApp" onclick="shareListingWhatsApp('${a.id}')">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.3 8.3 0 0 0-7.1 12.6L4 20.8l4.8-1.3A8.3 8.3 0 1 0 12 3.2z"/><path class="wa-phone" d="M8.4 7.8c.5-.4 1-.2 1.2.3l.8 1.8c.1.3.1.6-.1.8l-.6.7c.8 1.5 1.8 2.5 3.4 3.2l.7-.7c.2-.2.5-.3.8-.1l1.8.9c.4.2.6.7.3 1.1-.6.9-1.5 1.4-2.6 1.3-3.9-.4-7.1-3.5-7.5-7.4-.1-.8.2-1.5.8-1.9z"/></svg>
                    </button>
                    <button type="button" class="detail-share-logo facebook" title="Partager sur Facebook" aria-label="Partager sur Facebook" onclick="shareListingFacebook('${a.id}')"><span aria-hidden="true">f</span></button>
                    <button type="button" class="detail-share-logo copy" title="Copier le lien" aria-label="Copier le lien" onclick="copyListingLink('${a.id}')">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 14.5 7.8 16.2a3.3 3.3 0 1 1-4.7-4.7l3-3a3.3 3.3 0 0 1 4.7 0"/><path d="m14.5 9.5 1.7-1.7a3.3 3.3 0 1 1 4.7 4.7l-3 3a3.3 3.3 0 0 1-4.7 0"/><path d="m8.7 15.3 6.6-6.6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            `}
            ${canDelete?`
              <div class="detail-owner-actions">
                ${currentProfile?.is_admin?`<button class="mini-btn" onclick="closeModal('detailModal');openAdminEditAd('${a.id}')">Modifier</button>`:''}
                <button class="mini-btn danger" onclick="closeModal('detailModal');${currentProfile?.is_admin?`adminDeleteAd('${a.id}')`:`deleteAd('${a.id}')`}">Supprimer</button>
              </div>`:''}

            ${currentUser&&!isOwner&&!a.is_showroom?`
              <div class="detail-report">
                <button class="report-link" onclick="reportAd('${a.id}')"><i class="dm-flag">${dmIcon('flag')}</i>Signaler cette annonce</button>
              </div>`:''}
          </div>
        </aside>
      </div>

      <div class="detail-related-wrap">
        <section class="detail-related-section" id="sellerOtherSection-${a.id}" style="display:none">
          <div class="detail-related-head">
            <h3>Les autres annonces du vendeur</h3>
            <span class="detail-related-sub" id="sellerOtherCount-${a.id}"></span>
          </div>
          <div class="detail-related-scroller" id="sellerOtherAds-${a.id}"></div>
        </section>

        <section class="detail-related-section" id="interestSection-${a.id}" style="display:none">
          <div class="detail-related-head">
            <h3>Ces annonces peuvent vous intéresser</h3>
            <span class="detail-related-sub">Suggestions proches de cette annonce</span>
          </div>
          <div class="detail-related-scroller" id="interestAds-${a.id}"></div>
        </section>
      </div>
      ${dmActions}
    </div>`;
  openModal('detailModal');
  if(!a.is_showroom) hydrateSellerCard(a.owner_id,a.id);
  setTimeout(()=>renderApproxMap(a),0);
  setTimeout(()=>renderDetailRecommendations(a),0);
  setTimeout(()=>refreshDetailFavoriteCount(a.id),0);
};


function cacheDetailAds(items){
  (items||[]).forEach(x=>{if(x&&x.id) detailAdsCache.set(x.id,x);});
}
function relatedCardHtml(a){
  const photos=[...(a.listing_photos||[])].sort((x,y)=>x.position-y.position);
  const media=photos[0]?`<img src="${photoUrl(photos[0].storage_path)}" alt="${esc(a.title||'Annonce')}">`:`<img src="${ABRACA_DEFAULT_LISTING_PHOTO}" alt="Abracadeal" class="abraca-default-photo">`;
  return `<article class="detail-related-card" onclick="if(!event.target.closest('button,a'))openAd('${a.id}')">
    <div class="detail-related-photo">
      ${media}${listingCardActions(a)}
    </div>
    <div class="detail-related-body">
      <div class="detail-related-title">${esc(a.title||'Annonce')}</div>
      <div class="detail-related-price">${money(a.price)}</div>
      <div class="detail-related-city">📍 ${esc(a.city||'')}${a.postal_code?` (${esc(a.postal_code)})`:''}</div>
    </div>
  </article>`;
}
function recommendationScore(base,candidate){
  let score=0;
  const baseSub=vehicleSubcategoryOf(base);
  const candSub=vehicleSubcategoryOf(candidate);
  if(baseSub && candSub===baseSub) score+=8;
  const baseEquip=equipmentTypeOf(base);
  const candEquip=equipmentTypeOf(candidate);
  if(baseEquip && candEquip===baseEquip) score+=5;
  if((candidate.city||'').trim().toLowerCase()===(base.city||'').trim().toLowerCase()) score+=4;
  const bp=String(base.postal_code||'');
  const cp=String(candidate.postal_code||'');
  if(bp && cp && bp===cp) score+=4;
  else if(bp.length>=2 && cp.startsWith(bp.slice(0,2))) score+=2;
  const p1=Number(base.price), p2=Number(candidate.price);
  if(Number.isFinite(p1)&&p1>0&&Number.isFinite(p2)){
    const ratio=Math.abs(p2-p1)/p1;
    if(ratio<=.15) score+=4;
    else if(ratio<=.35) score+=3;
    else if(ratio<=.65) score+=1;
  }
  if(candidate.item_condition && base.item_condition && candidate.item_condition===base.item_condition) score+=1;
  return score;
}
async function renderDetailRecommendations(a){
  const sellerSection=document.getElementById(`sellerOtherSection-${a.id}`);
  const sellerBox=document.getElementById(`sellerOtherAds-${a.id}`);
  const sellerCount=document.getElementById(`sellerOtherCount-${a.id}`);
  const interestSection=document.getElementById(`interestSection-${a.id}`);
  const interestBox=document.getElementById(`interestAds-${a.id}`);
  if(!sellerSection||!sellerBox||!interestSection||!interestBox) return;

  try{
    const sellerReq=a.is_showroom
      ?Promise.resolve({data:[],error:null})
      :sb.from('listings')
        .select('id,owner_id,revision_of,category,title,description,price,city,seller_type,status,source,external_id,external_url,last_synced_at,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,created_at,updated_at,show_phone,item_condition,postal_code,featured_until,promotion_tier,photo_limit,crit_air,loa_available,loa_monthly,listing_reference,expires_at,archived_at,archive_reason,retention_until,visibility_scope,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value,listing_photos(id,storage_path,storage_bucket,position)')
        .eq('status','active')
        .eq('visibility_scope','public')
        .eq('owner_id',a.owner_id)
        .neq('id',a.id)
        .order('created_at',{ascending:false})
        .limit(6);

    const relatedReq=sb.from('listings')
      .select('id,owner_id,revision_of,category,title,description,price,city,seller_type,status,source,external_id,external_url,last_synced_at,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,created_at,updated_at,show_phone,item_condition,postal_code,featured_until,promotion_tier,photo_limit,crit_air,loa_available,loa_monthly,listing_reference,expires_at,archived_at,archive_reason,retention_until,visibility_scope,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value,listing_photos(id,storage_path,storage_bucket,position)')
      .eq('status','active')
      .eq('visibility_scope','public')
      .eq('category',a.category)
      .neq('id',a.id)
      .order('created_at',{ascending:false})
      .limit(36);

    const [sellerRes,relatedRes]=await Promise.all([sellerReq,relatedReq]);
    if(!document.getElementById(`sellerOtherSection-${a.id}`)) return;

    const sellerAds=(sellerRes.data||[]).filter(x=>x.id!==a.id);
    cacheDetailAds(sellerAds);
    if(sellerAds.length){
      sellerBox.innerHTML=sellerAds.map(relatedCardHtml).join('');
      sellerSection.style.display='block';
      if(sellerCount) sellerCount.textContent=`${sellerAds.length} annonce${sellerAds.length>1?'s':''}`;
    }else{
      sellerSection.style.display='none';
    }

    const related=(relatedRes.data||[])
      .filter(x=>x.id!==a.id && x.owner_id!==a.owner_id)
      .map(x=>({x,score:recommendationScore(a,x)}))
      .sort((u,v)=>v.score-u.score || new Date(v.x.created_at||0)-new Date(u.x.created_at||0))
      .slice(0,6)
      .map(o=>o.x);
    cacheDetailAds(related);
    if(related.length){
      interestBox.innerHTML=related.map(relatedCardHtml).join('');
      interestSection.style.display='block';
    }else{
      interestSection.style.display='none';
    }
    queueMicrotask(()=>hydrateFavoriteCounts(document.getElementById('detailModal')||document));
  }catch(err){
    console.error('Recommandations:',err);
    sellerSection.style.display='none';
    interestSection.style.display='none';
  }
}

window.changeDetailPhoto=(direction)=>{const thumbs=[...document.querySelectorAll('.detail-thumbs button')];if(thumbs.length<2)return;const active=thumbs.findIndex(b=>b.classList.contains('active'));const next=(Math.max(0,active)+direction+thumbs.length)%thumbs.length;thumbs[next].click();};
window.selectDetailPhoto=(button,url,index,total)=>{
  const main=document.getElementById('detailMainPhoto');
  if(main){
    /* Fix 21/09/2026 : reinitialise l'etat de secours a chaque changement de miniature, sinon
       une photo cassee plus tot dans le carrousel empechait le fallback de se redeclencher sur
       une autre photo cassee ensuite (le garde-fou anti-boucle restait arme). */
    main.dataset.abracaFallback='';
    main.classList.remove('abraca-default-photo');
    const detailWm=document.getElementById('detailPhotoWatermark');
    if(detailWm)detailWm.classList.remove('hidden');
    main.onload=refreshDetailWatermark;
    main.src=url;
    if(main.complete)setTimeout(refreshDetailWatermark,0);
  }
  const count=document.getElementById('detailPhotoCount');
  if(count) count.textContent=`${index} / ${total}`;
  document.querySelectorAll('.detail-thumbs button').forEach(b=>b.classList.remove('active'));
  if(button) button.classList.add('active');
};


function positionWatermarkOnContainedImage(img, watermark, container, inset=12){
  if(!img||!watermark||!container||!img.naturalWidth||!img.naturalHeight)return;
  const cw=container.clientWidth,ch=container.clientHeight;
  if(!cw||!ch)return;
  const scale=Math.min(cw/img.naturalWidth,ch/img.naturalHeight);
  const rw=img.naturalWidth*scale,rh=img.naturalHeight*scale;
  const blankRight=Math.max(0,(cw-rw)/2),blankBottom=Math.max(0,(ch-rh)/2);
  watermark.style.right=`${Math.round(blankRight+inset)}px`;
  watermark.style.bottom=`${Math.round(blankBottom+inset)}px`;
}
function refreshDetailWatermark(){
  const img=document.getElementById('detailMainPhoto');
  const wm=document.getElementById('detailPhotoWatermark');
  const wrap=img?.closest('.detail-main-wrap');
  positionWatermarkOnContainedImage(img,wm,wrap,12);
}
function refreshLightboxWatermark(){
  const img=document.getElementById('photoLightboxImg');
  const wm=document.getElementById('photoLightboxWatermark');
  const wrap=img?.closest('.photo-lightbox-stage');
  positionWatermarkOnContainedImage(img,wm,wrap,14);
}
window.addEventListener('resize',()=>{refreshDetailWatermark();refreshLightboxWatermark()});

window.currentDetailPhotoUrls=[];
let photoLightboxIndex=0;

window.openPhotoLightboxFromCurrent=()=>{
  document.getElementById('photoLightboxWatermark')?.classList.toggle('photo-watermark--overlay',!!window.currentDetailListing?.imported);
  const urls=window.currentDetailPhotoUrls||[];
  if(!urls.length) return;
  const main=document.getElementById('detailMainPhoto');
  let idx=0;
  if(main){
    const current=main.getAttribute('src')||'';
    const found=urls.findIndex(u=>u===current || decodeURI(u)===decodeURI(current));
    if(found>=0) idx=found;
  }
  photoLightboxIndex=idx;
  renderPhotoLightbox();
  const box=document.getElementById('photoLightbox');
  box.classList.add('open');
  box.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
};

window.renderPhotoLightbox=()=>{
  const urls=window.currentDetailPhotoUrls||[];
  if(!urls.length)return;
  photoLightboxIndex=(photoLightboxIndex+urls.length)%urls.length;
  const listing=window.currentDetailListing||{id:null,owner_id:null,title:'Annonce',price:'',show_phone:false};
  const lightboxImg=document.getElementById('photoLightboxImg');lightboxImg.onload=refreshLightboxWatermark;lightboxImg.src=urls[photoLightboxIndex];if(lightboxImg.complete)setTimeout(refreshLightboxWatermark,0);
  document.getElementById('photoLightboxCount').textContent=`${photoLightboxIndex+1}/${urls.length}`;
  document.getElementById('photoLightboxTitle').textContent=listing.title;
  document.getElementById('photoLightboxBottomTitle').textContent=listing.title;
  document.getElementById('photoLightboxBottomPrice').textContent=listing.price;
  document.getElementById('photoLightboxThumbs').innerHTML=urls.map((u,i)=>`<button type="button" class="photo-lightbox-thumb ${i===photoLightboxIndex?'active':''}" onclick="photoLightboxIndex=${i};renderPhotoLightbox()"><img src="${u}" alt="Photo ${i+1}"></button>`).join('');
  document.querySelectorAll('.photo-lightbox-nav').forEach(x=>x.style.display=urls.length>1?'block':'none');
  const c=document.getElementById('photoLightboxContact');
  const canContact=!!listing.id && (!currentUser || listing.owner_id!==currentUser.id);
  c.style.display=canContact?'block':'none';
  c.textContent='💬 Envoyer un message';
  c.onclick=()=>{if(listing.id) startMessageForListing(listing.id)};
};

window.movePhotoLightbox=(step)=>{
  photoLightboxIndex+=step;
  renderPhotoLightbox();
};

window.closePhotoLightbox=()=>{
  const box=document.getElementById('photoLightbox');
  box.classList.remove('open');
  box.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
};

document.addEventListener('keydown',e=>{
  const box=document.getElementById('photoLightbox');
  if(!box?.classList.contains('open')) return;
  if(e.key==='Escape') closePhotoLightbox();
  if(e.key==='ArrowLeft') movePhotoLightbox(-1);
  if(e.key==='ArrowRight') movePhotoLightbox(1);
});

document.getElementById('photoLightbox')?.addEventListener('click',e=>{
  if(e.target.id==='photoLightbox') closePhotoLightbox();
});


async function refreshFlowErrorsCount(){
  const btn=$('#flowErrorsBtn'),badge=$('#flowErrorsBadge');
  if(!btn||!badge) return 0;
  if(!sb||!currentProfile?.is_admin){badge.classList.add('hidden');btn.classList.remove('has-errors');return 0;}
  const {data,error}=await sb.rpc('get_admin_pro_sync_errors');
  if(error){console.error('Compteur erreurs de flux indisponible',error);return 0;}
  // 30/10/2026 : les notifications « nouveau pro » / « site à vérifier » vont dans Messages, pas dans les erreurs de flux.
  const rows=(data||[]).filter(x=>!['new_pro','site_review'].includes(x.severity));
  const n=rows.length;
  const critical=rows.filter(x=>Number(x.consecutive_failures||0)>=3).length;
  const warnings=rows.filter(x=>Number(x.consecutive_failures||0)>0&&Number(x.consecutive_failures||0)<3).length;
  badge.textContent=n>99?'99+':String(n);
  badge.classList.toggle('hidden',n<1);
  btn.classList.toggle('has-errors',critical>0);
  btn.classList.toggle('has-warning',critical===0&&warnings>0);
  btn.title=critical>0?`${critical} flux à traiter`:warnings>0?`${warnings} flux à surveiller`:'Tous les flux fonctionnent normalement';
  return n;
}

async function loadAdminFlowErrors(){
  const box=$('#flowErrorsList');
  if(!box||!currentProfile?.is_admin) return;
  box.innerHTML='<div class="flow-error-empty">Chargement…</div>';
  const {data,error}=await sb.rpc('get_admin_pro_sync_errors');
  if(error){box.innerHTML='<div class="flow-error-empty">Impossible de charger les erreurs de flux.</div>';console.error(error);return;}
  const rows=(data||[]).filter(x=>!['new_pro','site_review'].includes(x.severity));
  if(!rows.length){box.innerHTML='<div class="flow-error-empty">Aucune erreur de flux active. Tout fonctionne normalement.</div>';return;}
  box.innerHTML=rows.map(n=>{const fails=Number(n.consecutive_failures||0);const critical=fails>=3;return `<article class="flow-error-card ${critical?'error':'warning'}">
    <div class="flow-error-head"><div><b>${esc(n.company_name||'Professionnel')}</b><div class="small">${esc(n.feed_name||'Flux professionnel')}</div></div><span class="flow-error-pill">${critical?'À traiter':'À surveiller'}</span></div>
    <div class="flow-error-meta"><span>${n.sector==='immobilier'?'Immobilier':'Auto / Moto'}</span><span>${fails} échec${fails>1?'s':''} consécutif${fails>1?'s':''}</span>${n.last_run_at?`<span>Dernier essai : ${esc(formatMessageTime(n.last_run_at))}</span>`:''}${n.last_success_at?`<span>Dernier succès : ${esc(formatMessageTime(n.last_success_at))}</span>`:''}</div>
    <p class="flow-error-message">${esc(n.message||'Erreur de synchronisation')}</p>
  </article>`}).join('');
}

function formatMessageTime(v){
  if(!v) return '';
  try{return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}
  catch{return ''}
}
function stopMessagePolling(){
  if(messagePollTimer){clearInterval(messagePollTimer);messagePollTimer=null;}
}
let unreadRefreshSequence=0;
async function refreshUnreadMessages(){
  if(!currentUser||!sb) return;
  const viewer=currentUser.id,sequence=++unreadRefreshSequence;
  const [messages,notices,syncNotices]=await Promise.all([
    sb.rpc('get_unread_message_count'),
    sb.from('listing_rejection_notices').select('id',{count:'exact',head:true}).eq('owner_id',viewer).is('read_at',null),
    sb.from('pro_sync_notices').select('id',{count:'exact',head:true}).eq('recipient_id',viewer).is('read_at',null).is('resolved_at',null)
  ]);
  if(currentUser?.id!==viewer||sequence!==unreadRefreshSequence) return;
  if(messages.error) console.error(messages.error);
  const n=Number(messages.data||0)+(notices.error?0:Number(notices.count||0))+(syncNotices.error?0:Number(syncNotices.count||0));
  const badge=$('#headerMessagesUnread');
  badge.textContent=n>99?'99+':String(n);badge.classList.toggle('hidden',n<1);
  const accountBadge=$('#accountUnreadBadge');
  if(accountBadge){
    const label=n>99?'99+':String(n);
    accountBadge.textContent=label;
    accountBadge.classList.toggle('hidden',n<1);
    accountBadge.setAttribute('aria-label',n===1?'1 message non lu':n+' messages non lus');
  }
  if(n>0 && (lastUnreadMessageCount===null || n>lastUnreadMessageCount)){
    toast(n===1?'Vous avez 1 nouveau message':'Vous avez '+n+' nouveaux messages');
  }
  lastUnreadMessageCount=n;
}
let rejectionNoticesSequence=0;
async function loadRejectionNotices(){
  if(!currentUser) return;
  const sequence=++rejectionNoticesSequence;
  const viewer=currentUser.id;
  const {data,error}=await sb.from('listing_rejection_notices').select('id,listing_title,message,created_at,read_at').eq('owner_id',viewer).is('read_at',null).order('created_at',{ascending:false}).limit(50);
  if(currentUser?.id!==viewer || sequence!==rejectionNoticesSequence) return;
  const box=$('#moderationNotices');
  if(error){box.classList.remove('hidden');box.textContent='Les notifications de validation sont momentanément indisponibles.';return;}
  box.classList.toggle('hidden',!data?.length);
  box.innerHTML=(data||[]).map(n=>`<article class="moderation-notice"><b>Abracadeal · Annonce non validée</b><p>Votre annonce « ${esc(n.listing_title)} » n’a pas été validée.</p><p>${esc(n.message)}</p><small>${esc(formatMessageTime(n.created_at))}</small>${!n.read_at?` <button type="button" class="btn" onclick="markRejectionNoticeRead('${n.id}')">Marquer comme lu</button>`:''}</article>`).join('');
}
window.markRejectionNoticeRead=async id=>{
  if(!currentUser) return;
  const {error}=await sb.from('listing_rejection_notices').update({read_at:new Date().toISOString()}).eq('id',id).eq('owner_id',currentUser.id);
  if(error){toast('Impossible de marquer ce message comme lu');return;}
  await loadRejectionNotices();await loadProSyncNotices();await refreshUnreadMessages();
};
let proSyncNoticesSequence=0;
async function loadProSyncNotices(){
  if(!currentUser) return;
  const sequence=++proSyncNoticesSequence;
  const viewer=currentUser.id;
  const {data,error}=await sb.from('pro_sync_notices').select('id,feed_name,sector,severity,message,created_at,read_at,resolved_at').eq('recipient_id',viewer).is('resolved_at',null).order('updated_at',{ascending:false}).limit(50);
  if(currentUser?.id!==viewer||sequence!==proSyncNoticesSequence) return;
  const box=$('#proSyncNotices');
  if(!box)return;
  if(error){box.classList.remove('hidden');box.textContent='Les alertes de synchronisation sont momentanément indisponibles.';return;}
  box.classList.toggle('hidden',!data?.length);
  box.innerHTML=(data||[]).map(n=>`<article class="moderation-notice"><b>Abracadeal · ${n.severity==='new_pro'?'Nouveau pro en ligne':n.severity==='site_review'?'Site d’un pro à vérifier':(n.severity==='error'?'Erreur':'Alerte')+' de synchronisation'}</b><p><strong>${esc(n.feed_name)}</strong> · ${n.sector==='immobilier'?'Immobilier':'Auto / Moto'}</p><p>${esc(n.message)}</p><small>${esc(formatMessageTime(n.created_at))}</small>${!n.read_at?` <button type="button" class="btn" onclick="markProSyncNoticeRead('${n.id}')">Marquer comme lu</button>`:''}</article>`).join('');
}
window.markProSyncNoticeRead=async id=>{
  if(!currentUser)return;
  const {error}=await sb.from('pro_sync_notices').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_id',currentUser.id);
  if(error){toast('Impossible de marquer cette alerte comme lue');return;}
  await loadProSyncNotices();await refreshUnreadMessages();
};
async function loadConversationList(preferredId=null){
  if(!currentUser) return;
  const {data,error}=await sb.rpc('get_my_conversations');
  if(error){console.error(error);toast(error.message||'Impossible de charger les messages');return;}
  messageConversations=data||[];
  const list=$('#conversationList');
  if(!messageConversations.length){
    list.innerHTML='<div class="messages-empty">Aucune conversation pour le moment.<br>Ouvrez une annonce pour contacter un vendeur.</div>';
    currentConversationId=null;
    $('#messageChatHead').innerHTML='<b>Aucun message</b><span>Vos futures conversations apparaîtront ici.</span>';
    $('#messageThread').innerHTML='<div class="message-placeholder">La messagerie Abracadeal permet aux acheteurs et vendeurs inscrits d’échanger directement.</div>';
    $('#messageForm').classList.add('hidden');
    await refreshUnreadMessages();
    return;
  }
  list.innerHTML=messageConversations.map(c=>{
    const unread=Number(c.unread_count||0);
    return `<div class="conversation-item">
      <button type="button" class="conversation-row ${c.conversation_id===currentConversationId?'active':''}" onclick="selectConversation('${c.conversation_id}')">
        <div class="conversation-row-top"><span class="conversation-name">${esc(c.other_user_name||'Utilisateur Abracadeal')}</span>${unread?`<span class="message-unread">${unread}</span>`:''}</div>
        <div class="conversation-title">${esc(c.listing_title||'Annonce')}</div>
        <div class="conversation-preview">${esc(c.last_message||'Nouvelle conversation')}</div>
      </button>
      <button type="button" class="conversation-delete" aria-label="Supprimer la conversation" title="Supprimer la conversation" onclick="deleteConversationForMe('${c.conversation_id}',event)">×</button>
    </div>`;
  }).join('');
  const mobileMessages=window.matchMedia?.('(max-width:720px)').matches;
  const target=preferredId||currentConversationId||(!mobileMessages?messageConversations[0].conversation_id:null);
  if(target){
    await selectConversation(target,false);
  }else{
    currentConversationId=null;
    document.querySelector('.messages-shell')?.classList.remove('mobile-chat-open');
    $('#messageChatHead').innerHTML='<b>Sélectionnez une conversation</b><span>Touchez une conversation pour lire et répondre.</span>';
    $('#messageThread').innerHTML='<div class="message-placeholder">Choisissez une conversation dans la liste.</div>';
    $('#messageForm').classList.add('hidden');
  }
  await refreshUnreadMessages();
}
let conversationReportSending=false;
window.reportCurrentConversation=async()=>{
  if(!currentUser||!currentConversationId||conversationReportSending) return;
  const conversationId=currentConversationId;
  const reason=prompt('Pourquoi souhaitez-vous signaler cette conversation ? (Ne saisissez aucune donnée bancaire ni aucun mot de passe.)');
  if(reason===null||!reason.trim()) return;
  if(reason.trim().length>2000){toast('Le motif doit contenir au maximum 2 000 caractères');return;}
  conversationReportSending=true;
  try{
    const {error}=await sb.rpc('report_conversation',{p_conversation_id:conversationId,p_reason:reason.trim()});
    if(error){console.error(error);toast(error.code==='23505'?'Cette conversation a déjà été signalée par votre compte.':'Le signalement n’a pas pu être envoyé. Réessayez plus tard.');return;}
    toast('Signalement enregistré pour examen par Abracadeal.');
  }catch(error){console.error(error);toast('Le signalement n’a pas pu être envoyé. Réessayez plus tard.');}
  finally{conversationReportSending=false;}
};
window.deleteConversationForMe=async(id,event)=>{
  event?.preventDefault();
  event?.stopPropagation();
  if(!currentUser) return;
  if(!confirm('Supprimer cette conversation de votre liste ?')) return;
  const {error}=await sb.rpc('delete_conversation_for_me',{p_conversation_id:id});
  if(error){toast(error.message||'Impossible de supprimer la conversation');return;}
  if(currentConversationId===id){
    currentConversationId=null;
    $('#messageChatHead').innerHTML='<b>Sélectionnez une conversation</b><span>Retrouvez ici vos échanges acheteur / vendeur.</span>';
    $('#messageThread').innerHTML='<div class="message-placeholder">Choisissez une conversation à gauche, ou démarrez un échange depuis une annonce.</div>';
    $('#messageForm').classList.add('hidden');
  }
  toast('Conversation supprimée');
  await loadConversationList();
};

window.openMessages=async(preferredId=null)=>{
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour accéder à la messagerie');return;}
  $('#moderationNotices').innerHTML='';
  if(!preferredId && window.matchMedia?.('(max-width:720px)').matches){
    currentConversationId=null;
    document.querySelector('.messages-shell')?.classList.remove('mobile-chat-open');
  }
  openModal('messagesModal');
  await loadRejectionNotices();
  await loadProSyncNotices();
  await loadConversationList(preferredId);
  stopMessagePolling();
  messagePollTimer=setInterval(async()=>{
    if(!document.getElementById('messagesModal')?.classList.contains('open')){stopMessagePolling();return;}
    if(currentConversationId) await loadConversationMessages(false);
    await loadRejectionNotices();
    await loadProSyncNotices();
    await loadConversationList(currentConversationId);
  },5000);
};
window.closeMobileConversation=()=>{
  if(!window.matchMedia?.('(max-width:720px)').matches)return;
  document.querySelector('.messages-shell')?.classList.remove('mobile-chat-open');
  document.getElementById('messageInput')?.blur();
};
document.getElementById('messageMobileBack')?.addEventListener('click',window.closeMobileConversation);
document.getElementById('messageInput')?.addEventListener('focus',()=>{
  if(!window.matchMedia?.('(max-width:720px)').matches)return;
  setTimeout(()=>{
    const thread=document.getElementById('messageThread');
    if(thread)thread.scrollTop=thread.scrollHeight;
    document.querySelector('.message-composer')?.scrollIntoView({block:'end'});
  },220);
});

window.selectConversation=async(id,rerenderList=true)=>{
  currentConversationId=id;
  document.querySelector('.messages-shell')?.classList.add('mobile-chat-open');
  const c=messageConversations.find(x=>x.conversation_id===id);
  if(c){
    $('#messageChatHead').innerHTML=`<b>${esc(c.other_user_name||'Utilisateur Abracadeal')}</b><span>${esc(c.listing_title||'Annonce')}</span><button type="button" class="report-link" onclick="reportCurrentConversation()">Signaler cette conversation</button>`;
  }
  $('#messageForm').classList.remove('hidden');
  if(rerenderList){
    document.querySelectorAll('.conversation-row').forEach(b=>b.classList.remove('active'));
    const idx=messageConversations.findIndex(x=>x.conversation_id===id);
    if(idx>=0) document.querySelectorAll('.conversation-row')[idx]?.classList.add('active');
  }
  await loadConversationMessages(true);
};
async function loadConversationMessages(scrollToBottom=true){
  if(!currentConversationId||!currentUser) return;
  const {data,error}=await sb.rpc('get_conversation_messages',{p_conversation_id:currentConversationId});
  if(error){console.error(error);toast(error.message||'Impossible de charger la conversation');return;}
  const thread=$('#messageThread');
  const msgs=data||[];
  thread.innerHTML=msgs.length?msgs.map(m=>`<div class="message-bubble ${m.sender_id===currentUser.id?'mine':''}">${esc(m.body)}<span class="message-time">${esc(formatMessageTime(m.created_at))}</span></div>`).join(''):'<div class="message-placeholder">Aucun message pour le moment. Écris le premier message.</div>';
  if(scrollToBottom) thread.scrollTop=thread.scrollHeight;
  if(typeof window.abracaLeadPanelUpdate==='function') window.abracaLeadPanelUpdate(msgs);
  await refreshUnreadMessages();
}
window.startMessageForListing=async(listingId)=>{
  if(!currentUser&&!(await ensureSessionUser())){closeModal('detailModal');window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour envoyer un message');return;}
  const ad=allAds.find(x=>x.id===listingId);
  if(ad&&ad.owner_id===currentUser.id){toast('C’est votre annonce');return;}
  const {data,error}=await sb.rpc('start_conversation',{p_listing_id:listingId});
  if(error){toast(error.message||'Impossible d’ouvrir la conversation');return;}
  closeModal('detailModal');
  if(typeof window.closePhotoLightbox==='function') window.closePhotoLightbox();
  await openMessages(data);
};
window.viewListingPhone=async(listingId)=>{
  if(!currentUser&&!(await ensureSessionUser())){closeModal('detailModal');window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour voir le numéro');return;}
  const {data,error}=await sb.rpc('get_listing_phone',{p_listing_id:listingId});
  if(error){toast(error.message||'Impossible d’afficher le numéro');return;}
  const host=document.getElementById(`phoneContact-${listingId}`);
  if(!data){
    document.getElementById(`dmPhoneBtn-${listingId}`)?.remove();
    if(host) host.innerHTML='<div class="note">Aucun numéro affiché par le vendeur.</div>';
    toast('Aucun numéro affiché par le vendeur');
    return;
  }
  if(host) host.innerHTML=`<a class="btn ghost" href="tel:${esc(data)}" onclick="trackListingEvent('${esc(listingId)}','call')">📞 ${esc(data)}</a><div class="contact-login-note">Dites au vendeur que vous l’appelez de la part d’<strong>Abracadeal</strong>.</div>`;
  const barBtn=document.getElementById(`dmPhoneBtn-${listingId}`);
  if(barBtn) barBtn.outerHTML=`<a class="dm-action dm-action-ghost" id="dmPhoneBtn-${esc(listingId)}" href="tel:${esc(data)}" onclick="trackListingEvent('${esc(listingId)}','call')">${esc(data)}</a>`;
};

const messageInputEl=document.getElementById('messageInput');
messageInputEl?.addEventListener('input',()=>{
  if(!window.matchMedia?.('(max-width:720px)').matches)return;
  messageInputEl.style.height='auto';
  messageInputEl.style.height=Math.min(messageInputEl.scrollHeight,96)+'px';
});

$('#messageForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentConversationId||!currentUser) return;
  const input=$('#messageInput'), body=input.value.trim();
  if(!body) return;
  const hasLink=/(https?:\/\/|www\.|[\w-]+\.(?:com|fr|net|org|io|me|app|link|ly|co|eu|be|de|uk|es|it)(?:\/|\?|\s|$))/i.test(body);
  const paymentTerms=/(stripe|paypal|sumup|revolut|paylib|lyfpay|lydia|leetchi|gofundme|wise|checkout|payment|paiement|payer|payez|versement|acompte|virement|carte bancaire|\bcb\b|pay\.)/i.test(body);
  if(hasLink&&paymentTerms){toast('Les liens de paiement sont interdits dans la messagerie Abracadeal.');return;}
  const btn=e.submitter; if(btn){btn.disabled=true;btn.textContent='Envoi…'}
  const {error}=await sb.rpc('send_message',{p_conversation_id:currentConversationId,p_body:body});
  if(btn){btn.disabled=false;btn.textContent='Envoyer'}
  if(error){toast(error.message||'Message non envoyé');return;}
  if(typeof window.abracaLeadSave==='function') await window.abracaLeadSave(currentConversationId);
  input.value='';
  input.style.height='';
  await loadConversationMessages(true);
  await loadConversationList(currentConversationId);
});

function starsText(value){
  const n=Math.max(0,Math.min(5,Math.round(Number(value)||0)));
  return '★'.repeat(n)+'☆'.repeat(5-n);
}
function formatReviewDate(v){
  try{return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v))}
  catch{return ''}
}
async function hydrateSellerCard(sellerId,listingId){
  const host=document.getElementById(`sellerPublic-${listingId}`);
  if(!host||IMPORT_PREVIEW||!sb) return;
  const [{data:profile},{data:reviews}]=await Promise.all([
    sb.from('public_profiles').select('id,display_name,account_type,city,joined_at').eq('id',sellerId).maybeSingle(),
    sb.from('reviews').select('rating').eq('seller_id',sellerId).eq('status','active')
  ]);
  const list=reviews||[];
  const avg=list.length?list.reduce((s,r)=>s+Number(r.rating),0)/list.length:0;
  try{
    const name=profile?.display_name||(profile?.account_type==='professionnel'?'Vendeur professionnel':'Vendeur particulier');
    const nameEl=document.getElementById(`dmSellerName-${listingId}`);if(nameEl)nameEl.textContent=name;
    const av=document.getElementById(`dmSellerAvatar-${listingId}`);if(av)av.textContent=dmInitials(profile?.display_name||name);
    const rt=document.getElementById(`dmSellerRating-${listingId}`);
    if(rt)rt.innerHTML=list.length?`<span class="dm-stars">${starsText(avg)}</span><span>${list.length} avis</span>`:`<span class="dm-muted">Pas encore d’avis</span>`;
    if(document.getElementById(`dmSellerCount-${listingId}`)){
      sb.from('listings').select('id',{count:'exact',head:true}).eq('owner_id',sellerId).eq('status','active').eq('visibility_scope','public')
        .then(({count})=>{const el=document.getElementById(`dmSellerCount-${listingId}`);if(el&&Number.isFinite(count)&&count>0)el.textContent=`${count} annonce${count>1?'s':''}`;})
        .catch(()=>{});
    }
  }catch(_){}
  host.innerHTML=`
    <h3>${esc(profile?.display_name || (profile?.account_type==='professionnel'?'Vendeur professionnel':'Vendeur particulier'))}</h3>
    <p>${esc(profile?.city||'')}</p>
    <div class="seller-rating-line">
      <span class="stars">${starsText(avg)}</span>
      <strong>${list.length?avg.toFixed(1).replace('.',','):'—'}</strong>
      <span class="rating-muted">(${list.length} avis)</span>
    </div>`;
}

let reviewDraftRating=0;

window.openSellerProfile=async sellerId=>{
  closeModal('detailModal');
  const body=$('#sellerProfileBody');
  body.innerHTML='<div class="note">Chargement du profil…</div>';
  openModal('sellerProfileModal');

  const adminViewing=!!currentProfile?.is_admin;
  const [{data:profile,error:pErr},{data:reviews,error:rErr},{data:listings},{data:showroom},boostSummaryResult,proAccountSummaryResult]=await Promise.all([
    sb.from('public_profiles').select('id,display_name,account_type,city,joined_at').eq('id',sellerId).maybeSingle(),
    sb.from('reviews').select('*').eq('seller_id',sellerId).eq('status','active').order('created_at',{ascending:false}),
    sb.from('listings').select('id,title,price,city').eq('owner_id',sellerId).eq('status','active').eq('visibility_scope','public').order('created_at',{ascending:false}).limit(8),
    sb.from('pro_showrooms').select('banner_path').eq('user_id',sellerId).maybeSingle(),
    adminViewing?sb.rpc('get_admin_pro_boost_summary',{p_user_id:sellerId}):Promise.resolve({data:null,error:null}),
    adminViewing?sb.rpc('get_admin_pro_account_summary',{p_user_id:sellerId}):Promise.resolve({data:null,error:null})
  ]);
  const boostSummary=boostSummaryResult?.data||null;
  const proAccountSummary=proAccountSummaryResult?.data||null;
  if(proAccountSummaryResult?.error)console.error('Résumé compte Pro admin indisponible',proAccountSummaryResult.error);
  const boostSummaryError=boostSummaryResult?.error||null;
  if(boostSummaryError)console.error('Résumé Boost admin indisponible',boostSummaryError);

  if(pErr||!profile){
    body.innerHTML='<div class="note">Profil vendeur indisponible.</div>';
    return;
  }

  const list=reviews||[];
  const avg=list.length?list.reduce((s,r)=>s+Number(r.rating),0)/list.length:0;
  const joined=profile.joined_at?formatReviewDate(profile.joined_at):'';
  const showroomBanner=profile.account_type==='professionnel'&&showroom?.banner_path?showroomAssetUrl(showroom.banner_path):'';
  const isSelf=!!currentUser&&currentUser.id===sellerId;
  const myReview=currentUser?list.find(r=>r.reviewer_id===currentUser.id):null;
  const profileComplete=!!(currentProfile?.display_name?.trim()&&currentProfile?.city?.trim()&&currentProfile?.phone?.trim());
  const emailVerified=!!currentUser?.email_confirmed_at;
  const summary=boostSummary||{};
  const boostSummaryLoaded=!adminViewing||(!boostSummaryError&&!!boostSummary);
  const purchasedTotal=Math.max(0,Number(summary.purchased_total||0));
  const giftedTotal=Math.max(0,Number(summary.gifted_total||0));
  const availableTotal=Math.max(0,Number(summary.available_total||0));
  const usedTotal=Math.max(0,Number(summary.used_total||0));
  const paidBoostOrders=Math.max(0,Number(summary.paid_orders||0));
  const spentBoostEuros=(Math.max(0,Number(summary.spent_cents||0))/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const boost7=summary.days_7||{purchased:0,gifted:0,available:0,used:0};
  const boost30=summary.days_30||{purchased:0,gifted:0,available:0,used:0};

  let reviewForm='';
  if(!currentUser){
    reviewForm=`<div class="review-form"><b>Vous souhaitez laisser un avis ?</b><p class="note">Connectez-vous d'abord. Les avis anonymes sont interdits.</p><button class="btn primary" type="button" onclick="closeModal('sellerProfileModal');window.setAuthTab('login');openModal('accountModal')">Se connecter</button></div>`;
  }else if(isSelf){
    reviewForm=`<div class="review-form"><b>Votre profil vendeur</b><p class="note">Vous ne pouvez pas vous noter vous-même. Vous pouvez répondre publiquement aux avis reçus.</p></div>`;
  }else if(myReview){
    reviewForm=`<div class="review-form"><b>Avis déjà envoyé</b><p class="note">Un seul avis est autorisé par utilisateur et par vendeur.</p><button class="btn ghost" type="button" onclick="deleteMyReview('${myReview.id}','${sellerId}')">Supprimer mon avis</button></div>`;
  }else if(!profileComplete||!emailVerified){
    reviewForm=`<div class="review-form"><b>Profil incomplet</b><p class="note">Pour noter un vendeur, votre e-mail doit être confirmé et votre profil doit contenir votre nom/pseudo, votre ville et votre téléphone. Aucune note anonyme.</p><button class="btn primary" type="button" onclick="closeModal('sellerProfileModal');openModal('accountModal')">Compléter mon profil</button></div>`;
  }else{
    reviewForm=`
      <form class="review-form" onsubmit="submitSellerReview(event,'${sellerId}')">
        <b>Laisser un avis</b>
        <div class="review-stars-input" id="reviewStars">
          ${[1,2,3,4,5].map(n=>`<button type="button" class="review-star" onclick="setReviewRating(${n})" aria-label="${n} étoile${n>1?'s':''}">★</button>`).join('')}
        </div>
        <textarea class="textarea" id="reviewComment" maxlength="1000" required placeholder="Décrivez votre expérience avec ce vendeur…"></textarea>
        <div class="note" style="margin-top:8px">Votre nom/pseudo et votre ville seront visibles avec l'avis. Pas votre téléphone ni votre e-mail.</div>
        <div class="form-actions"><button class="btn primary" type="submit">Publier mon avis</button></div>
      </form>`;
  }

  const reviewCards=list.length?list.map(r=>`
    <article class="review-card">
      <div class="review-top">
        <div>
          <div class="review-author">${esc(r.reviewer_name)}</div>
          <div class="review-city">${esc(r.reviewer_city)}</div>
        </div>
        <div style="text-align:right">
          <div class="stars">${starsText(r.rating)}</div>
          <div class="review-date">${formatReviewDate(r.created_at)}</div>
        </div>
      </div>
      <div class="review-comment">${esc(r.comment)}</div>
      ${r.seller_reply?`<div class="review-reply"><b>Réponse du vendeur</b><div>${esc(r.seller_reply)}</div></div>`:''}
      ${isSelf&&!r.seller_reply?`
        <div class="review-actions">
          <button class="review-action" type="button" onclick="replyToReview('${r.id}','${sellerId}')">Répondre</button>
        </div>`:''}
      ${currentUser&&currentUser.id!==r.reviewer_id?`
        <div class="review-actions">
          <button class="review-action" type="button" onclick="reportReview('${r.id}')">Signaler cet avis</button>
        </div>`:''}
    </article>`).join(''):`<div class="note">Aucun avis pour le moment.</div>`;

  body.innerHTML=`
    ${profile.account_type==='professionnel'?`<div style="aspect-ratio:3/1;border-radius:16px;margin:0 0 14px;background:${showroomBanner?'url(&quot;'+esc(showroomBanner)+'&quot;) center/cover no-repeat':'linear-gradient(115deg,#1c0b2d,#52206f 58%,#d09a43)'}"></div><a class="btn primary" style="display:inline-flex;text-decoration:none;margin:0 0 18px" href="pro.html?id=${encodeURIComponent(sellerId)}" target="_blank" rel="noopener">Voir le showroom du professionnel</a>`:''}
    <div class="seller-profile-head">
      <div>
        <h3 class="seller-profile-name">${esc(profile.display_name)}</h3>
        <div class="seller-profile-meta">${profile.account_type==='professionnel'?'Professionnel':'Particulier'}${profile.city?' · '+esc(profile.city):''}${joined?' · Membre depuis '+joined:''}</div>
      </div>
      <div class="seller-score">
        <strong>${list.length?avg.toFixed(1).replace('.',','):'—'}/5</strong>
        <div class="stars">${starsText(avg)}</div>
        <div class="rating-muted">${list.length} avis</div>
      </div>
    </div>

    ${reviewForm}

    ${currentProfile?.is_admin&&profile.account_type==='professionnel'&&proAccountSummary?`
    <section class="review-section">
      <h3>Compte Pro · Admin</h3>
      <div class="review-form">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
          <div><span class="note">Société</span><strong style="display:block">${esc(proAccountSummary.company?.name||'—')}</strong></div>
          <div><span class="note">SIRET</span><strong style="display:block">${esc(proAccountSummary.company?.siret||'—')}</strong></div>
          <div><span class="note">Formule</span><strong style="display:block">${esc(proAccountSummary.plan?.label||'À choisir')}</strong></div>
          <div><span class="note">Statut</span><strong style="display:block">${proAccountSummary.subscription?.exists?esc(proAccountSummary.subscription?.status||'—'):(proAccountSummary.checkout?.status==='pending'?'Validation du moyen de paiement en attente':(proAccountSummary.checkout?.status==='completed'?'Paiement validé · activation en cours':'À finaliser'))}</strong></div>
          <div><span class="note">Offre Fondateurs</span><strong style="display:block">${proAccountSummary.founder?.eligible?'Oui · n°'+Number(proAccountSummary.founder?.number||0):'Non'}</strong></div>
          <div><span class="note">Début facturation</span><strong style="display:block">${(proAccountSummary.subscription?.billing_starts_at||proAccountSummary.checkout?.billing_starts_at)?new Date(proAccountSummary.subscription?.billing_starts_at||proAccountSummary.checkout?.billing_starts_at).toLocaleDateString('fr-FR'):'—'}</strong></div>
          <div><span class="note">Fin gratuité</span><strong style="display:block">${(proAccountSummary.subscription?.free_until||proAccountSummary.checkout?.free_until)?new Date(proAccountSummary.subscription?.free_until||proAccountSummary.checkout?.free_until).toLocaleDateString('fr-FR'):'—'}</strong></div>
          <div><span class="note">Ville société</span><strong style="display:block">${esc([proAccountSummary.company?.postal_code,proAccountSummary.company?.city].filter(Boolean).join(' ')||'—')}</strong></div>
        </div>
      </div>
    </section>`:''}

    ${currentProfile?.is_admin&&profile.account_type==='professionnel'?`
    <section class="review-section">
      <h3>Outils Admin · Boosts</h3>
      <div class="review-form">
        ${!boostSummaryLoaded?`<div class="note" style="padding:12px;border:1px solid #efc9d6;border-radius:12px;background:#fff4f7;color:#8a2948;margin-bottom:12px"><strong>Données Boost indisponibles.</strong> Recharge la fiche ou réessaie dans quelques secondes.</div>`:''}
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px">
          <div style="border:1px solid #eadfed;border-radius:14px;padding:12px;background:#fff">
            <span class="note" style="display:block;margin:0 0 5px">A déjà acheté des Boosts</span>
            <strong style="font-size:1.05rem;color:#4a1d5d">${summary.has_purchased?'Oui':'Non'}</strong>
          </div>
          <div style="border:1px solid #eadfed;border-radius:14px;padding:12px;background:#fff">
            <span class="note" style="display:block;margin:0 0 5px">Dépensé en Boosts</span>
            <strong style="font-size:1.05rem;color:#4a1d5d">${spentBoostEuros}</strong>
          </div>
          <div style="border:1px solid #eadfed;border-radius:14px;padding:12px;background:#fff">
            <span class="note" style="display:block;margin:0 0 5px">Boosts achetés</span>
            <strong style="font-size:1.05rem;color:#4a1d5d">${purchasedTotal}</strong>
          </div>
          <div style="border:1px solid #eadfed;border-radius:14px;padding:12px;background:#fff">
            <span class="note" style="display:block;margin:0 0 5px">Solde restant</span>
            <strong style="font-size:1.05rem;color:#4a1d5d">${availableTotal}</strong>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px">
          <div style="border:1px solid #eadfed;border-radius:14px;padding:12px;background:#fbf7fd">
            <b>Boosts 7 jours</b>
            <div class="note" style="margin-top:6px">Achetés : <strong>${Number(boost7.purchased||0)}</strong> · Offerts : <strong>${Number(boost7.gifted||0)}</strong> · Utilisés : <strong>${Number(boost7.used||0)}</strong> · Restants : <strong>${Number(boost7.available||0)}</strong></div>
          </div>
          <div style="border:1px solid #eadfed;border-radius:14px;padding:12px;background:#fbf7fd">
            <b>Boosts 30 jours</b>
            <div class="note" style="margin-top:6px">Achetés : <strong>${Number(boost30.purchased||0)}</strong> · Offerts : <strong>${Number(boost30.gifted||0)}</strong> · Utilisés : <strong>${Number(boost30.used||0)}</strong> · Restants : <strong>${Number(boost30.available||0)}</strong></div>
          </div>
        </div>
        <p class="note" style="margin-top:0">Commandes Boost payées : <strong>${paidBoostOrders}</strong> · Offerts par l’admin : <strong>${giftedTotal}</strong> · Utilisés : <strong>${usedTotal}</strong>.</p>
        <p class="note">Offrir des jetons Boost à ce professionnel sans paiement Stripe.</p>
        <div class="form-grid">
          <div class="form-row"><label>Durée</label><select class="select" id="adminBoostDuration-${sellerId}"><option value="7">7 jours</option><option value="30">30 jours</option></select></div>
          <div class="form-row"><label>Nombre de jetons</label><input class="input" id="adminBoostCredits-${sellerId}" type="number" min="1" max="1000" value="1"></div>
          <div class="form-row full"><label>Note interne (facultatif)</label><input class="input" id="adminBoostNote-${sellerId}" maxlength="500" placeholder="Ex. geste commercial"></div>
        </div>
        <div class="form-actions"><button class="btn primary" type="button" onclick="adminGiftBoosts('${sellerId}')">Offrir les jetons</button></div>
      </div>
    </section>`:''}

    <section class="review-section">
      <h3>Ses annonces</h3>
      <div class="seller-listings-mini">
        ${(listings||[]).length?(listings||[]).map(a=>`<div class="seller-listing-mini" onclick="closeModal('sellerProfileModal');openAd('${a.id}')"><b>${esc(a.title)}</b><span>${money(a.price)} · ${esc(a.city||'')}</span></div>`).join(''):'<div class="note">Aucune annonce active.</div>'}
      </div>
    </section>

    <section class="review-section">
      <h3>Avis (${list.length})</h3>
      <div>${reviewCards}</div>
    </section>`;
};

window.adminGiftBoosts=async sellerId=>{
  if(!currentProfile?.is_admin)return;
  const duration=Number(document.getElementById('adminBoostDuration-'+sellerId)?.value||7);
  const credits=Number(document.getElementById('adminBoostCredits-'+sellerId)?.value||0);
  const note=document.getElementById('adminBoostNote-'+sellerId)?.value?.trim()||null;
  if(![7,30].includes(duration)){toast('Durée invalide');return;}
  if(!Number.isInteger(credits)||credits<1||credits>1000){toast('Choisissez entre 1 et 1000 jetons');return;}
  try{
    const {data,error}=await sb.rpc('admin_grant_pro_boosts',{p_user_id:sellerId,p_duration_days:duration,p_credits:credits,p_note:note});
    if(error)throw error;
    toast(credits+' jeton'+(credits>1?'s':'')+' Boost '+duration+' jours offert'+(credits>1?'s':''));
    const input=document.getElementById('adminBoostCredits-'+sellerId);if(input)input.value='1';
    const noteInput=document.getElementById('adminBoostNote-'+sellerId);if(noteInput)noteInput.value='';
    await openSellerProfile(sellerId);
  }catch(error){
    console.error(error);
    toast(error?.message||'Impossible d’offrir les Boosts');
  }
};

window.setReviewRating=n=>{
  reviewDraftRating=n;
  document.querySelectorAll('#reviewStars .review-star').forEach((b,i)=>b.classList.toggle('active',i<n));
};

window.submitSellerReview=async(e,sellerId)=>{
  e.preventDefault();
  if(!reviewDraftRating){toast('Choisissez une note de 1 à 5 étoiles');return}
  const comment=$('#reviewComment')?.value.trim()||'';
  const btn=e.submitter;
  if(btn){btn.disabled=true;btn.textContent='Publication...'}
  const {error}=await sb.rpc('submit_review',{p_seller_id:sellerId,p_rating:reviewDraftRating,p_comment:comment});
  if(btn){btn.disabled=false;btn.textContent='Publier mon avis'}
  if(error){toast(error.message);return}
  reviewDraftRating=0;
  toast('Avis publié');
  await openSellerProfile(sellerId);
};

window.replyToReview=async(reviewId,sellerId)=>{
  const reply=prompt('Votre réponse publique à cet avis :');
  if(!reply?.trim())return;
  const {error}=await sb.rpc('reply_to_review',{p_review_id:reviewId,p_reply:reply.trim()});
  if(error){toast(error.message);return}
  toast('Réponse publiée');
  await openSellerProfile(sellerId);
};

window.deleteMyReview=async(reviewId,sellerId)=>{
  if(!confirm('Supprimer votre avis ?'))return;
  const {error}=await sb.rpc('delete_review',{p_review_id:reviewId});
  if(error){toast(error.message);return}
  toast('Avis supprimé');
  await openSellerProfile(sellerId);
};

window.reportReview=async reviewId=>{
  if(!currentUser&&!(await ensureSessionUser())){toast('Connectez-vous pour signaler');return}
  const reason=prompt('Pourquoi signalez-vous cet avis ?');
  if(!reason?.trim())return;
  const {error}=await sb.rpc('report_review',{p_review_id:reviewId,p_reason:reason.trim()});
  if(error){toast(error.message);return}
  toast('Signalement envoyé');
};

window.reportAd=async id=>{
  if(!currentUser&&!(await ensureSessionUser())){closeModal('detailModal');window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour signaler');return}
  const reason=prompt('Pourquoi signalez-vous cette annonce ?');
  if(!reason)return;
  const {error}=await sb.from('reports').insert({listing_id:id,reporter_id:currentUser.id,reason:reason.trim()});
  if(error)toast(error.message);else toast('Signalement envoyé');
};
window.editAd=id=>window.openAdminEditAd(id,true);
window.approveAd=async id=>{
  if(!currentProfile?.is_admin) return;
  const {data,error}=await invokeFresh('moderate-listing',{body:{listing_id:id,action:'validate'}});
  if(!error&&data?.status!=='active'&&data?.revision!==true){toast(data?.ai_error||'Annonce non validée');return;}
  if(error){toast(error.message);return}
  toast('Annonce acceptée et mise en ligne');
  await loadAds();
};
window.rejectAd=async id=>{
  if(!currentProfile?.is_admin) return;
  if(!confirm('Refuser cette annonce ?')) return;
  const {error}=await sb.rpc('moderate_listing',{p_listing_id:id,p_status:'rejected'});
  if(error){toast(error.message);return}
  toast('Annonce refusée');
  await loadAds();
};

window.validateAutoPublishedAd=async id=>{
  if(!currentProfile?.is_admin) return;
  const {error}=await sb.rpc('validate_auto_published_listing',{p_listing_id:id});
  if(error){toast(error.message||'Impossible de valider cette annonce');return}
  toast('Annonce vérifiée : elle reste en ligne');
  await loadAds();
};

window.adminDeleteAd=async id=>{
  if(!currentProfile?.is_admin) return;
  if(!confirm('Supprimer définitivement cette annonce ? Elle disparaîtra du site et de la modération.')) return;
  const {data:rows}=await sb.from('listing_photos').select('storage_path').eq('listing_id',id);
  const paths=(rows||[]).map(x=>x.storage_path).filter(Boolean);
  if(paths.length){
    const {error:storageError}=await sb.storage.from('listing-images').remove(paths);
    if(storageError) console.warn('Photos non supprimées du stockage',storageError);
  }
  const {error}=await sb.rpc('admin_delete_listing',{p_listing_id:id});
  if(error){toast(error.message||'Impossible de supprimer cette annonce');return}
  toast('Annonce supprimée définitivement');
  await loadAds();
};

// Retrait d'une annonce : on demande le motif. « Vendu » = annonce archivée comme vendue (page publique
// « Annonce vendue » 30 jours avec annonces similaires) ; autres motifs = suppression définitive comme avant.
function askRemovalReason(){
  return new Promise(resolve=>{
    const choices=[['sold_abracadeal','🎉 Vendu grâce à Abracadeal'],['sold_elsewhere','Vendu ailleurs'],['not_selling','Je ne souhaite plus vendre'],['other','Autre raison']];
    const wrap=document.createElement('div');
    wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','removalReasonTitle');
    wrap.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(20,8,30,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px';
    wrap.innerHTML=`<div style="background:#fff;color:#21132d;width:min(440px,100%);border-radius:20px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.3);margin:auto 0;font-family:inherit">
      <h3 id="removalReasonTitle" style="margin:0 0 6px;font-size:1.15rem">Pourquoi retirez-vous cette annonce ?</h3>
      <p style="margin:0 0 14px;color:#6b5a78;font-size:.9rem">Votre réponse nous aide à améliorer Abracadeal.</p>
      ${choices.map(([v,l])=>`<button type="button" data-reason="${v}" style="display:block;width:100%;text-align:left;padding:13px 14px;margin:0 0 8px;border:1px solid #e4d6ec;border-radius:12px;background:#faf6fc;color:#21132d;font:inherit;font-weight:700;cursor:pointer">${l}</button>`).join('')}
      <p style="margin:6px 0 12px;color:#6b5a78;font-size:.8rem">Une annonce vendue est retirée des résultats. Sinon, elle est supprimée définitivement.</p>
      <button type="button" data-reason="" style="display:block;width:100%;padding:12px;border:0;border-radius:12px;background:transparent;color:#6f218c;font:inherit;font-weight:700;cursor:pointer">Annuler</button></div>`;
    const close=v=>{document.removeEventListener('keydown',onKey);wrap.remove();resolve(v||null);};
    const onKey=e=>{if(e.key==='Escape')close(null);};
    wrap.addEventListener('click',e=>{const b=e.target.closest('[data-reason]');if(b)close(b.dataset.reason);else if(e.target===wrap)close(null);});
    document.addEventListener('keydown',onKey);
    document.body.appendChild(wrap);
    wrap.querySelector('[data-reason]').focus();
  });
}
window.deleteAd=async id=>{
  if(!currentUser){toast('Connexion requise');return;}
  const reason=await askRemovalReason();
  if(!reason)return;
  const {data:owned,error:ownerError}=await sb.from('listings').select('id,category').eq('id',id).eq('owner_id',currentUser.id).maybeSingle();
  if(ownerError||!owned){toast('Cette annonce ne vous appartient pas ou n’est plus disponible.');return;}
  try{await sb.from('listing_removal_feedback').insert({listing_id:id,owner_id:currentUser.id,reason,category:owned.category||null});}catch(e){}
  if(reason==='sold_abracadeal'||reason==='sold_elsewhere'){
    const {error:soldError}=await sb.rpc('archive_listing',{p_listing_id:id,p_reason:'sold'});
    if(soldError){toast(soldError.message);return;}
    await loadAds();toast(reason==='sold_abracadeal'?'Félicitations pour la vente ! 🎉':'Annonce marquée comme vendue');
    return;
  }
  const {data:rows}=await sb.from('listing_photos').select('storage_path').eq('listing_id',id);
  const paths=(rows||[]).map(x=>x.storage_path);
  if(paths.length) await removePhotoPaths(paths);
  const {error}=await sb.from('listings').delete().eq('id',id).eq('owner_id',currentUser.id);
  if(error)toast(error.message);else{await loadAds();toast('Annonce supprimée')}
};


async function navigateCatalogue(category='',subcategory='',target='#resultats'){
  try{if(/[?&](categorie|ville)=/.test(location.search))history.replaceState(null,'',location.pathname+location.hash);}catch(_){}
  resetSearchFilters();
  activeCategory=category;activeVehicleSubcategory=subcategory;
  syncFilterCategory(category,subcategory);refreshFilterCount();
  if(currentProfile?.is_admin) setModerationButtonLabel('Modérer');
  await loadAds();
  document.querySelector(target)?.scrollIntoView({behavior:'smooth'});
}
$$('.banner-hotspot').forEach(el=>el.addEventListener('click',e=>{
  const href=el.getAttribute('href')||'';
  if(href && !href.startsWith('#')) return;
  e.preventDefault();
  navigateCatalogue(el.dataset.bannerCategory||'',el.dataset.bannerSub||'',el.dataset.bannerMore?'#categories':'#resultats');
}));
$('#searchBtn').addEventListener('click',async()=>{
  rememberSearch();
  const marketQuery=($('#searchQuery')?.value||'').trim();
  if(marketQuery.length>=2 && marketQuery.length<=100){
    sb.rpc('record_market_search',{p_query:marketQuery,p_category:$('#filterCategory')?.value||activeCategory||null,p_city:($('#searchCity')?.value||'').trim()||null}).then(({error})=>{if(error)console.warn('Search analytics unavailable');});
  }
  onlyMine=false;favoritesMode=false;moderationMode=false;
  if(currentProfile?.is_admin) setModerationButtonLabel('Modérer');
  await loadAds();document.querySelector('#resultats').scrollIntoView({behavior:'smooth'});
});
['#searchQuery','#searchCity'].forEach(sel=>$(sel).addEventListener('keydown',e=>{if(e.key==='Enter')$('#searchBtn').click()}));
$('#nearbySearchBtn')?.addEventListener('click',requestNearby);
document.querySelectorAll('.category-link').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();navigateCatalogue(a.dataset.category||'',a.dataset.sub||'');
}));
document.querySelectorAll('.immo-menu-filter').forEach(a=>a.addEventListener('click',async e=>{
  e.preventDefault();
  resetSearchFilters();
  activeCategory='immobilier';
  activeVehicleSubcategory='';
  syncFilterCategory('immobilier','');
  if($('#filterImmoTransaction')) $('#filterImmoTransaction').value=a.dataset.immoTransaction||'';
  if($('#filterImmoPropertyType')) $('#filterImmoPropertyType').value=a.dataset.immoProperty||'';
  updateRealEstateFilterLabels();
  refreshFilterCount();
  if(currentProfile?.is_admin) setModerationButtonLabel('Modérer');
  await loadAds();
  document.querySelector('#resultats')?.scrollIntoView({behavior:'smooth',block:'start'});
}));
$('#showAll').addEventListener('click',()=>{
  resetSearchFilters();
  
  if(currentProfile?.is_admin&&$('#moderationBtn')) setModerationButtonLabel('Modérer');
  loadAds();
});

$('#filtersToggle')?.addEventListener('click',()=>$('#filtersPanel')?.classList.toggle('hidden'));
$('#heroFiltersBtn')?.addEventListener('click',()=>{
  $('#filtersPanel')?.classList.remove('hidden');
  document.querySelector('#resultats')?.scrollIntoView({behavior:'smooth'});
});
$('#filterCategory')?.addEventListener('change',()=>{
  activeCategory=$('#filterCategory').value||'';
  activeVehicleSubcategory='';
  updateFilterSubcategories('');
  refreshFilterCount();renderAds();
});
$('#filterSubcategory')?.addEventListener('change',()=>{
  activeVehicleSubcategory=$('#filterSubcategory').value||'';
  refreshFilterCount();renderAds();
});
['filterPriceMin','filterPriceMax','filterVehicleMake','filterVehicleModel','filterYearMin','filterYearMax','filterMileageMax','filterImmoSurfaceMin','filterImmoSurfaceMax','filterImmoRoomsMin','filterImmoBedroomsMin'].forEach(id=>{
  $('#'+id)?.addEventListener('input',()=>{refreshFilterCount();renderAds();});
});
['filterCondition','filterSeller','filterFuel','filterImmoTransaction','filterImmoPropertyType','filterImmoDpe','filterImmoFurnished','filterImmoOutdoor','filterImmoParking'].forEach(id=>{
  $('#'+id)?.addEventListener('change',()=>{updateRealEstateFilterLabels();refreshFilterCount();renderAds();});
});
$('#filterImmoRadius')?.addEventListener('change',()=>{if(Number($('#filterImmoRadius')?.value||0))clearImmoNearbyFilter();refreshFilterCount();refreshImmoRadiusState();});
$('#immoNearbyFilterBtn')?.addEventListener('click',activateImmoNearbyFilter);
$('#searchCity')?.addEventListener('input',()=>{if(immoNearbyFilterState.active)clearImmoNearbyFilter();});
$('#searchCity')?.addEventListener('change',()=>{if(Number($('#filterImmoRadius')?.value||0))refreshImmoRadiusState();refreshFilterCount();});
$('#sortAds')?.addEventListener('change',renderAds);
$('#resetFilters')?.addEventListener('click',()=>{
  /* Fix 16/10/2026 : sur mobile, « Réinitialiser les filtres » ferme le panneau
     et ramène à l'accueil (même comportement que le logo). Desktop inchangé. */
  if(window.matchMedia?.('(max-width:760px)').matches){
    $('#filtersPanel')?.classList.add('hidden');
    closeAllQuickFilterPopovers();
    const home=document.querySelector('.mobile-brand[data-home-brand]')||document.querySelector('[data-home-brand]');
    if(home){home.click();return;}
    resetSearchFilters();loadAds();window.scrollTo({top:0,left:0,behavior:'auto'});return;
  }
  resetSearchFilters({keepMode:true});renderAds();
});
updateFilterSubcategories('');
refreshFilterCount();

/* Fix 20/09/2026 : barre de "filtres rapides" (Ville / Prix / Marque ou Type de bien / Filtres),
   demandee pour une recherche plus fluide (reference : leboncoin). Chaque puce ouvre
   un petit popover avec un champ "miroir" : filteredAds() continue de lire uniquement les champs
   d'origine (#searchCity, #filterPriceMin/Max, #filterVehicleMake, #filterImmoPropertyType), les
   miroirs se contentent de pousser leur valeur dedans et de redeclencher les evenements existants -
   aucune duplication de logique de filtrage. */
function updateQuickFilterVisibility(){
  const cat=$('#filterCategory')?.value||activeCategory||'';
  $('#qfVehicleWrap')?.classList.toggle('hidden',cat!=='vehicules');
  $('#qfImmoWrap')?.classList.toggle('hidden',cat!=='immobilier');
}
function updateQuickFilterLabels(){
  updateQuickFilterVisibility();
  const city=($('#searchCity')?.value||'').trim();
  if($('#qfCityLabel')) $('#qfCityLabel').textContent=city||'Ville';
  $('#qfCityChip')?.classList.toggle('active',!!city);

  const min=$('#filterPriceMin')?.value||'',max=$('#filterPriceMax')?.value||'';
  let priceText='Prix';
  if(min&&max) priceText=`${Number(min).toLocaleString('fr-FR')}-${Number(max).toLocaleString('fr-FR')} €`;
  else if(max) priceText=`Jusqu'à ${Number(max).toLocaleString('fr-FR')} €`;
  else if(min) priceText=`Dès ${Number(min).toLocaleString('fr-FR')} €`;
  if($('#qfPriceLabel')) $('#qfPriceLabel').textContent=priceText;
  $('#qfPriceChip')?.classList.toggle('active',!!(min||max));

  const make=($('#filterVehicleMake')?.value||'').trim();
  if($('#qfVehicleLabel')) $('#qfVehicleLabel').textContent=make||'Marque';
  $('#qfVehicleChip')?.classList.toggle('active',!!make);

  const immoSelect=$('#filterImmoPropertyType');
  const immoType=immoSelect?.value||'';
  const immoText=immoType?(immoSelect.selectedOptions[0]?.textContent||'Type de bien'):'Type de bien';
  if($('#qfImmoLabel')) $('#qfImmoLabel').textContent=immoText;
  $('#qfImmoChip')?.classList.toggle('active',!!immoType);
}
function closeAllQuickFilterPopovers(except){
  document.querySelectorAll('.quick-filter-popover').forEach(p=>{if(p!==except)p.classList.add('hidden')});
  if(!except) $('#qfPopoverBackdrop')?.classList.add('hidden');
}
document.addEventListener('click',()=>closeAllQuickFilterPopovers());
function positionQuickFilterPopover(chip,pop){
  const r=chip.getBoundingClientRect();
  const margin=12;
  let left=r.left;
  const maxLeft=window.innerWidth-pop.offsetWidth-margin;
  if(left>maxLeft) left=maxLeft;
  if(left<margin) left=margin;
  let top=r.bottom+8;
  const maxTop=window.innerHeight-pop.offsetHeight-margin;
  if(top>maxTop) top=Math.max(margin,r.top-pop.offsetHeight-8);
  pop.style.left=left+'px';
  pop.style.top=top+'px';
}
// Fix 19/10/2026 : les fenêtres Ville/Prix/Marque/Type et leur fond sombre sont déplacés
// directement dans <body>. Restés dans la section des annonces, ils étaient pris dans son
// empilement et passaient derrière les vignettes (surtout sur mobile).
(function(){const bd=document.getElementById('qfPopoverBackdrop');if(bd&&bd.parentNode!==document.body)document.body.appendChild(bd);})();
function setupQuickFilterChip(chipId,popoverId,onOpen,onConfirm){
  const chip=$('#'+chipId),pop=$('#'+popoverId);
  if(!chip||!pop) return;
  if(pop.parentNode!==document.body) document.body.appendChild(pop);
  chip.addEventListener('click',(e)=>{
    e.stopPropagation();
    const willOpen=pop.classList.contains('hidden');
    closeAllQuickFilterPopovers(willOpen?pop:null);
    pop.classList.toggle('hidden',!willOpen);
    if(willOpen){
      if(onOpen) onOpen();
      positionQuickFilterPopover(chip,pop);
      $('#qfPopoverBackdrop')?.classList.remove('hidden');
    }
  });
  pop.addEventListener('click',e=>e.stopPropagation());
  pop.querySelector('.qf-popover-ok')?.addEventListener('click',()=>{if(onConfirm)onConfirm();pop.classList.add('hidden');$('#qfPopoverBackdrop')?.classList.add('hidden');});
}
// Ne pas fermer pendant la saisie : sur mobile, l'ouverture du clavier fait défiler la page.
window.addEventListener('scroll',()=>{if(document.activeElement?.closest?.('.quick-filter-popover'))return;closeAllQuickFilterPopovers();},true);
window.addEventListener('resize',()=>{if(document.activeElement?.closest?.('.quick-filter-popover'))return;closeAllQuickFilterPopovers();});
setupQuickFilterChip('qfCityChip','qfCityPopover',()=>{if($('#qfCityInput'))$('#qfCityInput').value=$('#searchCity')?.value||'';},()=>$('#searchBtn')?.click());
setupQuickFilterChip('qfPriceChip','qfPricePopover',()=>{
  if($('#qfPriceMinInput'))$('#qfPriceMinInput').value=$('#filterPriceMin')?.value||'';
  if($('#qfPriceMaxInput'))$('#qfPriceMaxInput').value=$('#filterPriceMax')?.value||'';
});
setupQuickFilterChip('qfVehicleChip','qfVehiclePopover',()=>{const input=$('#qfVehicleMakeInput');if(input){input.value=$('#filterVehicleMake')?.value||'';input.placeholder=$('#filterSubcategory')?.value==='motos'?'Ex. Yamaha, Honda, BMW':'Ex. Renault, Peugeot, Mercedes';}});
setupQuickFilterChip('qfImmoChip','qfImmoPopover',()=>{if($('#qfImmoPropertyInput'))$('#qfImmoPropertyInput').value=$('#filterImmoPropertyType')?.value||'';});
$('#qfCityInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#searchBtn')?.click();$('#qfCityPopover')?.classList.add('hidden');$('#qfPopoverBackdrop')?.classList.add('hidden');}});
function mirrorToOriginal(mirrorId,originalId){
  const mirror=$('#'+mirrorId),original=$('#'+originalId);
  if(!mirror||!original) return;
  const push=()=>{
    original.value=mirror.value;
    original.dispatchEvent(new Event('input',{bubbles:true}));
    original.dispatchEvent(new Event('change',{bubbles:true}));
    updateQuickFilterLabels();
  };
  mirror.addEventListener('input',push);
  mirror.addEventListener('change',push);
}
mirrorToOriginal('qfCityInput','searchCity');
mirrorToOriginal('qfPriceMinInput','filterPriceMin');
mirrorToOriginal('qfPriceMaxInput','filterPriceMax');
mirrorToOriginal('qfVehicleMakeInput','filterVehicleMake');
mirrorToOriginal('qfImmoPropertyInput','filterImmoPropertyType');
$('#filtersToggle')?.addEventListener('click',()=>closeAllQuickFilterPopovers());
$('#heroFiltersBtn')?.addEventListener('click',()=>closeAllQuickFilterPopovers());
updateQuickFilterLabels();

async function openMyAds(){
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour voir vos annonces');return;}
  resetSearchFilters();onlyMine=true;
  if(currentProfile?.is_admin) setModerationButtonLabel('Modérer');
  await loadAds();
  $('#resultats').scrollIntoView({behavior:'smooth'});
}
window.openAdminFlowErrors=async()=>{
  if(!currentProfile?.is_admin){toast('Accès administrateur requis');return;}
  openModal('flowErrorsModal');
  await loadAdminFlowErrors();
  await refreshFlowErrorsCount();
};
async function openFavorites(){
  if(!currentUser&&!(await ensureSessionUser())){window.setAuthTab('login');openModal('accountModal');toast('Connectez-vous pour voir vos favoris');return;}
  resetSearchFilters();favoritesMode=true;
  
  if(currentProfile?.is_admin) setModerationButtonLabel('Modérer');
  await loadFavorites();await loadAds();
  $('#resultats').scrollIntoView({behavior:'smooth'});
}
$('#backToAllAds').addEventListener('click',()=>$('#showAll').click());
window.toggleAdminModeration=async()=>{
  if(!currentProfile?.is_admin){toast('Accès administrateur requis');return;}
  // Sur desktop, la modération doit vivre sur sa page dédiée et non sous le catalogue.
  const tabletMobileUi=window.matchMedia('(min-width:761px) and (max-width:1366px) and (min-height:550px) and (any-pointer:coarse)').matches;
  if(window.matchMedia('(min-width:761px)').matches && !tabletMobileUi){
    (window.abracaGo?window.abracaGo('moderation.html'):location.href='moderation.html');
    return;
  }
  moderationMode=!moderationMode;
  favoritesMode=false;
  onlyMine=false;
  activeCategory='';
  activeVehicleSubcategory='';
  syncFilterCategory('','');
  refreshFilterCount();
  setModerationButtonLabel(moderationMode?'Annonces':'Modérer');

  try{
    await loadAds();
    requestAnimationFrame(()=>document.querySelector('#resultats')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }catch(error){
    console.error('Modération indisponible',error);
    toast('Impossible de charger la modération');
  }
};

function bindAdminHeaderActions(){
  const actions=[
    ['moderationBtn',()=>window.toggleAdminModeration?.()],
    ['headerMessagesBtn',()=>window.openMessages?.()],
    ['flowErrorsBtn',()=>window.openAdminFlowErrors?.()]
  ];
  for(const [id,action] of actions){
    const btn=document.getElementById(id);
    if(!btn||btn.dataset.adminBound==='1')continue;
    btn.dataset.adminBound='1';
    btn.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      action();
    },{passive:false});
  }
}
bindAdminHeaderActions();

// Password recovery: isolated from catalogue and account editing.
const passwordRecovery = (()=>{
  const redirectTo='https://abracadeal.fr/';
  const storageKey='abracadeal.passwordRecoveryUser.v1';
  let recoveryUserId=null, sending=false, updating=false;
  const readMarker=()=>{try{return sessionStorage.getItem(storageKey)}catch{return null}};
  const writeMarker=id=>{try{if(id)sessionStorage.setItem(storageKey,id);else sessionStorage.removeItem(storageKey)}catch{}};
  const status=(id,text)=>{$('#'+id).textContent=text};
  function requestLink(message=''){
    closeModal('accountModal');closeModal('resetPasswordModal');
    status('recoveryEmailStatus',message);
    openModal('forgotPasswordModal');$('#recoveryEmail').focus();
  }
  function expired(){
    recoveryUserId=null;writeMarker(null);
    $('#resetPasswordForm').reset();
    requestLink('Ce lien est invalide ou a expiré. Demandez un nouveau lien, puis ouvrez le plus récent.');
  }
  $('#forgotPasswordBtn').addEventListener('click',()=>requestLink());
  $('#recoveryRetryBtn').addEventListener('click',()=>{recoveryUserId=null;writeMarker(null);requestLink()});
  $('#recoveryBackBtn').addEventListener('click',()=>{closeModal('forgotPasswordModal');window.setAuthTab('login');openModal('accountModal')});
  $('#forgotPasswordForm').addEventListener('submit',async e=>{
    e.preventDefault();
    if(sending||!e.currentTarget.reportValidity())return;
    if(!sb){status('recoveryEmailStatus','Service indisponible. Rechargez la page puis réessayez.');return}
    const button=e.currentTarget.querySelector('button[type="submit"]');
    sending=true;button.disabled=true;button.textContent='Envoi en cours…';
    status('recoveryEmailStatus','');
    try{
      const {error}=await sb.auth.resetPasswordForEmail($('#recoveryEmail').value.trim(),{redirectTo});
      if(error)throw error;
      status('recoveryEmailStatus','Si un compte correspond à cette adresse, vous recevrez un e-mail avec un lien de réinitialisation. Vérifiez aussi vos courriers indésirables.');
    }catch(error){
      status('recoveryEmailStatus',error.status===429||error.code==='over_email_send_rate_limit'?'Trop de demandes rapprochées. Patientez quelques minutes avant de réessayer.':'Impossible d’envoyer le lien pour le moment. Vérifiez votre connexion et réessayez.');
    }finally{sending=false;button.disabled=false;button.textContent='Recevoir le lien'}
  });
  $('#resetPasswordForm').addEventListener('submit',async e=>{
    e.preventDefault();
    if(updating||!e.currentTarget.reportValidity())return;
    const password=$('#recoveryPassword').value;
    if(password.length<8){status('recoveryPasswordStatus','Choisissez au moins 8 caractères.');return}
    if(password!==$('#recoveryPasswordConfirm').value){status('recoveryPasswordStatus','Les deux mots de passe ne correspondent pas.');return}
    if(!sb||!recoveryUserId){expired();return}
    const button=e.currentTarget.querySelector('button[type="submit"]');
    updating=true;button.disabled=true;button.textContent='Enregistrement…';
    status('recoveryPasswordStatus','');
    try{
      const {data,error:sessionError}=await sb.auth.getSession();
      if(sessionError||data.session?.user?.id!==recoveryUserId){expired();return}
      // 28/10/2026 : compte créé par l'admin pour un garage (legal_pending) : CGU acceptées au premier mot de passe.
      const legalPending=data.session?.user?.user_metadata?.legal_pending===true;
      if(legalPending&&!$('#recoveryLegal')?.checked){status('recoveryPasswordStatus','Cochez la case d’acceptation des CGU pour activer votre compte.');return}
      const {error}=await sb.auth.updateUser(legalPending?{password,data:{legal_terms_version:'2026-10-30',legal_terms_accepted_at:new Date().toISOString(),legal_majority_confirmed:true,legal_pending:false}}:{password});
      if(error)throw error;
      recoveryUserId=null;writeMarker(null);$('#resetPasswordForm').reset();
      closeModal('resetPasswordModal');
      toast('Votre mot de passe a été modifié.');
      openModal('accountModal');
    }catch(error){
      if(error.status===401||['session_not_found','session_expired','refresh_token_not_found'].includes(error.code)){expired();return}
      status('recoveryPasswordStatus',error.code==='same_password'?'Choisissez un mot de passe différent de l’ancien.':error.code==='weak_password'?'Ce mot de passe est trop faible. Choisissez un mot de passe plus long avec lettres, chiffres et symboles.':'Impossible de modifier le mot de passe pour le moment. Réessayez.');
    }finally{updating=false;button.disabled=false;button.textContent='Enregistrer le mot de passe'}
  });
  function handleAuth(event,session){
    if(event==='SIGNED_OUT'){recoveryUserId=null;writeMarker(null);$('#resetPasswordForm').reset();closeModal('resetPasswordModal');return}
    if(event==='PASSWORD_RECOVERY'&&session?.user?.id){
      recoveryUserId=session.user.id;writeMarker(recoveryUserId);
    }else if(event==='INITIAL_SESSION'){
      if(recoveryArrivalError||(recoveryArrivalExpected&&!session)){expired();return}
      const marker=readMarker();
      if(marker&&marker===session?.user?.id)recoveryUserId=marker;
      else if(marker)writeMarker(null);
    }else return;
    if(recoveryUserId){
      closeModal('accountModal');closeModal('forgotPasswordModal');
      $('#resetPasswordForm').reset();status('recoveryPasswordStatus','');
      const legalPending=session?.user?.user_metadata?.legal_pending===true;
      $('#recoveryLegalRow')?.classList.toggle('hidden',!legalPending);
      if($('#resetPasswordTitle'))$('#resetPasswordTitle').textContent=legalPending?'Activez votre espace Pro':'Nouveau mot de passe';
      openModal('resetPasswordModal');$('#recoveryPassword').focus();
    }
  }
  if(recoveryArrivalError){
    history.replaceState(null,'',location.pathname+location.search);
    expired();
  }
  return {handleAuth};
})();

// 23/10/2026 : arrivée depuis une page Google « annonces/<catégorie>/<ville>/ » :
// /?categorie=maison&ville=Paris ouvre l'accueil déjà filtré (même affichage que le menu Catégories).
const URL_CATEGORIES=new Set(['vehicules','immobilier','vacances','hightech','maison','mode','emploi','services','autres']);
function urlCatalogueFilters(){
  try{
    const qs=new URLSearchParams(location.search);
    if(qs.get('annonce')||qs.get('admin_preview'))return null;
    const cat=(qs.get('categorie')||'').trim().toLowerCase();
    const sub=(qs.get('sous')||'').trim().toLowerCase().replace(/[^a-z-]/g,'').slice(0,40);
    const ville=(qs.get('ville')||'').trim().slice(0,80);
    if(!URL_CATEGORIES.has(cat)&&!ville)return null;
    return {cat:URL_CATEGORIES.has(cat)?cat:'',sub:cat==='vehicules'?sub:'',ville};
  }catch(_){return null}
}
function applyUrlCatalogueFilters(){
  const f=urlCatalogueFilters();
  if(!f)return false;
  activeCategory=f.cat;activeVehicleSubcategory=f.sub;
  syncFilterCategory(f.cat,f.sub);
  if(f.ville&&$('#searchCity'))$('#searchCity').value=f.ville;
  refreshFilterCount();
  return true;
}
let urlCatalogueScrolled=false;
function scrollToUrlCatalogue(){
  if(urlCatalogueScrolled||!urlCatalogueFilters())return;
  urlCatalogueScrolled=true;
  document.querySelector('#resultats')?.scrollIntoView({block:'start'});
}

if(sb){
  // 18/10/2026 : affichage plus rapide sur mobile — le catalogue public s'affiche dès qu'il arrive,
  // sans attendre la vérification du compte ; il est ensuite rafraîchi normalement.
  try{Promise.resolve(getPublicCatalog()).then(()=>{if(!catalogLoadedOnce&&!onlyMine&&!favoritesMode&&!moderationMode)loadAds().catch(()=>{});});}catch(_){}
  try{applyUrlCatalogueFilters();}catch(_){}
  (async()=>{
    try{await refreshAuth();}
    catch(error){console.error('Initialisation du compte impossible',error);}
    try{await loadFavorites();}
    catch(error){console.error('Favoris indisponibles',error);}
    try{await loadAds();}
    catch(error){console.error('Catalogue indisponible',error);}
    try{await openSharedListingFromUrl();}
    catch(error){console.error('Ouverture du lien partagé impossible',error);}

    setTimeout(async()=>{
      try{
        if(!onlyMine&&!favoritesMode&&!moderationMode){
          resetSearchFilters();
          const fromUrl=applyUrlCatalogueFilters();
          await loadAds();
          if(fromUrl)scrollToUrlCatalogue();
        }
      }catch(error){
        console.error('Stabilisation du catalogue impossible',error);
      }
    },700);
  })();

  sb.auth.onAuthStateChange((event,session)=>{
    passwordRecovery.handleAuth(event,session);

    setTimeout(async()=>{
      try{
        if(event==='INITIAL_SESSION'){
          if(session)await applyAuthSession(session,{preserveEditing:false});
          else if(!currentUser)await refreshAuth({preserveEditing:false});
        }else{
          await refreshAuth();
        }
      }catch(error){console.error('Actualisation du compte impossible',error);}

      try{await loadFavorites();}
      catch(error){console.error('Actualisation des favoris impossible',error);}
      try{await loadAds();}
      catch(error){console.error('Actualisation du catalogue impossible',error);}
    },0);
  });
}else{
  try{updateAuthUI();}catch(error){console.error('Interface compte indisponible',error);}
  console.error('Supabase JS ne s’est pas chargé.');
}
// Vérification automatique des nouveaux messages sans recharger la page.
// 4 secondes : suffisamment réactif pour la V1 sans modifier Supabase.
let lastMineAutoRefresh=Date.now();
setInterval(()=>{if(currentUser && document.visibilityState==='visible'){refreshUnreadMessages();if(currentProfile?.is_admin)refreshFlowErrorsCount();if(onlyMine&&Date.now()-lastMineAutoRefresh>=30000){lastMineAutoRefresh=Date.now();loadAds();}}},4000);

// Rafraîchit aussi immédiatement quand l'utilisateur revient sur l'onglet / la fenêtre.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && currentUser){
    refreshUnreadMessages();
    if(currentProfile?.is_admin)refreshFlowErrorsCount();
    if(currentProfile?.account_type==='professionnel' && document.getElementById('accountModal')?.classList.contains('open')){
      loadProBoostWallet().catch(error=>console.warn('Boost wallet refresh',error));
    }
  }
});
window.addEventListener('focus',()=>{
  if(currentUser) refreshUnreadMessages();
});

// Safari/iPhone peut restaurer une page depuis son cache mémoire.
// On resynchronise toujours la session au retour sur la page.
window.addEventListener('pageshow',e=>{
  if(!sb||!e.persisted)return;
  setTimeout(async()=>{
    try{
      const wasLoggedIn=!!currentUser;
      const restored=await refreshAuth({preserveEditing:false});
      if(restored||wasLoggedIn){
        try{await loadFavorites();}catch(_){}
        try{await loadAds();}catch(_){}
      }
    }catch(error){
      console.error('Restauration de session après affichage impossible',error);
    }
  },0);
});


function refreshProDashStats(){
  const box=document.getElementById('proDashStats');if(!box||!sb||!currentUser)return;
  sb.rpc('get_my_listing_stats',{p_days:30}).then(({data,error})=>{
    if(error||!data){box.classList.add('hidden');return;}
    const n=v=>Number(v||0).toLocaleString('fr-FR');
    const top=(data.top||[]).filter(t=>t.views>0).slice(0,3).map(t=>`<li>${esc(t.title||'Annonce')} : ${n(t.views)} vue${t.views>1?'s':''}${t.phones?`, ${n(t.phones)} numéro${t.phones>1?'s':''} affiché${t.phones>1?'s':''}`:''}</li>`).join('');
    box.innerHTML=`<strong style="display:block;color:#451657">Ce que vos annonces vous ont apporté (30 derniers jours)</strong>
      <div class="pro-stats-row"><span><b>${n(data.views)}</b> vues</span><span><b>${n(data.phones)}</b> numéros affichés</span><span><b>${n(data.calls)}</b> clics « Appeler »</span><span><b>${n(data.conversations)}</b> contacts par message</span></div>
      ${top?`<ul class="pro-stats-top">${top}</ul>`:''}
      <p class="note" style="margin:6px 0 0">Les acheteurs sont invités à dire qu’ils appellent de la part d’Abracadeal.</p>`;
    box.classList.remove('hidden');
  },()=>box.classList.add('hidden'));
}
function refreshProDashboard(){
  const panel=document.getElementById('proDashboardPanel');
  const isPro=!!currentUser&&currentProfile?.account_type==='professionnel';
  panel?.classList.toggle('hidden',!isPro);
  if(!isPro)return;
  refreshProDashStats();
  const mine=(allAds||[]).filter(a=>a.owner_id===currentUser.id);
  const active=mine.filter(a=>['active','published','approved'].includes(String(a.status||'').toLowerCase())).length;
  const pending=mine.filter(a=>String(a.status||'').toLowerCase()==='pending').length;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('proDashActiveValue',active); set('proDashPendingValue',pending);
  set('proDashQuotaValue',active+' / …');
  sb.from('pro_subscriptions').select('plan_code,status,founder_number,listing_limit').eq('user_id',currentUser.id).maybeSingle().then(({data})=>{
    const enabled=!!data&&['active','trialing'].includes(String(data.status||'').toLowerCase());
    const code=enabled?String(data.plan_code||'').toLowerCase():'';
    let quota=(code.match(/250|100|50|20/)||[])[0];
    if(enabled&&data.founder_number!=null&&String(data.status||'').toLowerCase()==='trialing')quota='illimité'; /* 29/10/2026 : Fondateur = sans limite pendant les 12 mois */
    set('proDashQuotaValue',quota?(active+' / '+quota):'Aucune formule');
  });
  const unread=document.querySelector('#accountBtn .account-unread-badge, #headerMessagesUnread');
  set('proDashMessagesValue',(unread?.textContent||'0').trim()||'0');
  refreshProDashSyncAndPage();
}
// 29/10/2026 : stock repris depuis le site du pro (rien à gérer) + lien de sa page Garage / Immo publique.
function refreshProDashSyncAndPage(){
  const uid=currentUser?.id;if(!uid||!sb)return;
  const box=document.getElementById('proDashSync');
  sb.rpc('get_my_site_import').then(({data})=>{
    if(!box)return;
    const d=data&&typeof data==='object'?data:null;
    if(!d||!d.url||d.status==='rejected'){box.classList.add('hidden');return}
    const site=String(d.url).replace(/^https?:\/\//,'').replace(/\/$/,'');
    const when=d.last_success_at?new Date(d.last_success_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'';
    box.innerHTML=d.active
      ?'<strong style="display:block">Stock synchronisé avec votre site</strong>Vos annonces sont reprises automatiquement depuis <b>'+esc(site)+'</b>, environ toutes les 3 heures'+(when?' (dernière mise à jour : '+esc(when)+')':'')+'. Vous n’avez rien à gérer ici : un véhicule ajouté sur votre site apparaît, un véhicule vendu disparaît.'
      :'<strong style="display:block">Reprise de votre site en préparation</strong>Nous vérifions la lecture de <b>'+esc(site)+'</b>. Vos annonces apparaîtront automatiquement, sans saisie de votre part.';
    box.classList.remove('hidden');
  }).catch(()=>{});
  fetch('/pro-pages.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(map=>{
    const page=document.getElementById('proDashPage'),link=document.getElementById('proDashPageLink');
    const entry=map&&map[uid];
    if(!page||!link||!entry||!entry.active){page?.classList.add('hidden');return}
    const url='https://abracadeal.fr/'+entry.path+'/';
    link.href=url;link.textContent=url.replace('https://','');
    page.classList.remove('hidden');
  }).catch(()=>{});
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#proDashPageCopy'))return;
  const url=document.getElementById('proDashPageLink')?.href;if(!url)return;
  (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Lien copié')).catch(()=>prompt('Copiez ce lien :',url));
});
document.addEventListener('click',e=>{
  if(e.target.closest('#proDashActive,#proDashStockBtn')){closeModal('accountModal');openMyAds();}
  if(e.target.closest('#proDashPending')){closeModal('accountModal');openMyAds();}
  if(e.target.closest('#proDashMessages')) document.getElementById('accountMessagesBtn')?.click();
  if(e.target.closest('#proDashImportBtn')) document.getElementById('proImportBtn')?.click();
  if(e.target.closest('#proDashProfileBtn')) document.getElementById('editCompanyBtn')?.click();
});
window.addEventListener('abracadeal:auth',()=>setTimeout(refreshProDashboard,0));

function syncProDashboardEntry(){
 const b=document.getElementById('heroProDashboardBtn');
 if(b)b.classList.toggle('hidden',!(currentUser&&currentProfile?.account_type==='professionnel'));
}
window.addEventListener('abracadeal:auth',syncProDashboardEntry);
document.addEventListener('click',e=>{
 if(e.target.closest('#heroProDashboardBtn')){
   openModal('accountModal');
   setTimeout(()=>document.getElementById('proDashboardPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
 }
});
// 26/10/2026 : lien direct vers l'espace Pro depuis les e-mails (https://abracadeal.fr/?espace=pro).
// Connecté en Pro : ouvre le tableau de bord. Pas connecté : ouvre la connexion, puis le tableau de bord après connexion.
(function(){
 let wantPro=false;
 try{wantPro=new URLSearchParams(location.search).get('espace')==='pro';}catch(_){}
 if(!wantPro)return;
 try{history.replaceState(null,'',location.pathname+location.hash);}catch(_){}
 let done=false,askedLogin=false;
 function openPro(){
   if(done)return;
   if(currentUser&&currentProfile?.account_type==='professionnel'){
     done=true;openModal('accountModal');
     setTimeout(()=>document.getElementById('proDashboardPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
   }else if(!currentUser&&!askedLogin){
     askedLogin=true;try{window.setAuthTab?.('login');}catch(_){} openModal('accountModal');
   }
 }
 window.addEventListener('abracadeal:auth',()=>setTimeout(openPro,150));
 setTimeout(openPro,2500);
})();

let proShowroomMediaDirty=false;
let proShowroomRecord={description:'',banner_path:null,logo_path:null,updated_at:null};
let proShowroomPendingBanner=null,proShowroomPendingLogo=null;
let proCropState={kind:'banner',img:null,objectUrl:'',scale:1,minScale:1,x:0,y:0,pointers:new Map(),drag:null,pinch:null};
let proPreviewBannerUrl='',proPreviewLogoUrl='';

function showroomAssetUrl(path){
  if(!path||!sb)return '';
  const {data}=sb.storage.from('pro-showroom').getPublicUrl(path);
  return data?.publicUrl||'';
}
function showroomInitials(){
  const name=(currentProfile?.display_name||currentUser?.user_metadata?.display_name||'PRO').trim();
  return name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'PRO';
}
function markShowroomMediaDirty(){
  proShowroomMediaDirty=true;
  const b=document.getElementById('saveCompanyShowroomBtn');
  if(b){b.hidden=false;b.dataset.mode='editing';b.textContent='Enregistrer les modifications';}
}
function paintProShowroomMedia(){
  const cover=document.getElementById('proShowroomCoverLive');
  const logo=document.getElementById('proShowroomLogoLive');
  if(proPreviewBannerUrl){URL.revokeObjectURL(proPreviewBannerUrl);proPreviewBannerUrl='';}
  if(proPreviewLogoUrl){URL.revokeObjectURL(proPreviewLogoUrl);proPreviewLogoUrl='';}
  if(cover){
    const url=proShowroomPendingBanner?(proPreviewBannerUrl=URL.createObjectURL(proShowroomPendingBanner)):showroomAssetUrl(proShowroomRecord.banner_path);
    cover.style.backgroundImage=url?'url("'+url+'")':'linear-gradient(115deg,#1c0b2d,#52206f 58%,#d09a43)';
  }
  if(logo){
    const url=proShowroomPendingLogo?(proPreviewLogoUrl=URL.createObjectURL(proShowroomPendingLogo)):showroomAssetUrl(proShowroomRecord.logo_path);
    logo.style.backgroundImage=url?'url("'+url+'")':'none';
    logo.textContent=url?'':showroomInitials();
  }
}
async function loadProShowroomData(populateForm=false){
  if(!sb||!currentUser||currentProfile?.account_type!=='professionnel')return;
  const {data,error}=await sb.from('pro_showrooms').select('description,banner_path,logo_path,updated_at').eq('user_id',currentUser.id).maybeSingle();
  if(error){console.error('Showroom Pro indisponible',error);return;}
  const legacy=currentUser?.user_metadata?.company_showroom?.description||'';
  proShowroomRecord=data||{description:legacy,banner_path:null,logo_path:null,updated_at:null};
  if(populateForm){
    const field=document.getElementById('accountCompanyDescription');if(field)field.value=proShowroomRecord.description||'';
    const count=document.getElementById('accountCompanyDescriptionCount');if(count)count.textContent=String((proShowroomRecord.description||'').length);
  }
  const link=document.getElementById('proPublicPageLink');if(link)link.href='pro.html?id='+encodeURIComponent(currentUser.id);
  const saveBtn=document.getElementById('saveCompanyShowroomBtn');
  if(saveBtn){
    saveBtn.hidden=false;
    if(data){
      saveBtn.dataset.mode='saved';
      saveBtn.textContent='Modifier';
    }else{
      saveBtn.dataset.mode='editing';
      saveBtn.textContent='Enregistrer les modifications';
    }
  }
  paintProShowroomMedia();
  refreshProShowroomPreview();
}
async function saveProShowroom(e){
  e.preventDefault();
  if(!sb||!currentUser||currentProfile?.account_type!=='professionnel')return;
  const btn=e.submitter||document.getElementById('saveCompanyShowroomBtn'),status=document.getElementById('companySaveStatus');
  if(btn)btn.disabled=true;if(status)status.textContent='Enregistrement…';
  const uploaded=[];
  try{
    const description=(document.getElementById('accountCompanyDescription')?.value||'').trim();
    let bannerPath=proShowroomRecord.banner_path||null,logoPath=proShowroomRecord.logo_path||null;
    const stamp=Date.now();
    if(proShowroomPendingBanner){
      const bType=proShowroomPendingBanner.type||'image/webp';bannerPath=currentUser.id+'/banner-'+stamp+'.'+abracaExtFor(bType);
      const {error}=await sb.storage.from('pro-showroom').upload(bannerPath,proShowroomPendingBanner,{contentType:bType,upsert:false,cacheControl:'3600'});
      if(error)throw error;uploaded.push(bannerPath);
    }
    if(proShowroomPendingLogo){
      const lType=proShowroomPendingLogo.type||'image/webp';logoPath=currentUser.id+'/logo-'+stamp+'.'+abracaExtFor(lType);
      const {error}=await sb.storage.from('pro-showroom').upload(logoPath,proShowroomPendingLogo,{contentType:lType,upsert:false,cacheControl:'3600'});
      if(error)throw error;uploaded.push(logoPath);
    }
    const payload={user_id:currentUser.id,description:description||null,banner_path:bannerPath,logo_path:logoPath,updated_at:new Date().toISOString()};
    const {error}=await sb.from('pro_showrooms').upsert(payload,{onConflict:'user_id'});
    if(error)throw error;
    const obsolete=[];
    if(proShowroomPendingBanner&&proShowroomRecord.banner_path&&proShowroomRecord.banner_path!==bannerPath)obsolete.push(proShowroomRecord.banner_path);
    if(proShowroomPendingLogo&&proShowroomRecord.logo_path&&proShowroomRecord.logo_path!==logoPath)obsolete.push(proShowroomRecord.logo_path);
    if(obsolete.length){const {error:removeError}=await sb.storage.from('pro-showroom').remove(obsolete);if(removeError)console.warn('Ancien média showroom non supprimé',removeError);}
    proShowroomRecord={...payload};proShowroomPendingBanner=null;proShowroomPendingLogo=null;proShowroomMediaDirty=false;
    if(btn){btn.hidden=false;btn.dataset.mode='saved';btn.textContent='Modifier';}
    paintProShowroomMedia();refreshProShowroomPreview();
    if(status)status.textContent='Page Pro enregistrée.';
    toast('Page Pro enregistrée');
  }catch(error){
    if(uploaded.length)await sb.storage.from('pro-showroom').remove(uploaded);
    console.error(error);
    if(btn){btn.hidden=false;btn.dataset.mode='editing';btn.textContent='Réessayer l’enregistrement';}
    if(status)status.textContent=error?.message||'Impossible d’enregistrer. Réessayez.';
  }finally{if(btn)btn.disabled=false}
}
function clampProCrop(){
  const frame=document.getElementById('proCropFrame'),img=proCropState.img;if(!frame||!img)return;
  const r=frame.getBoundingClientRect(),w=img.naturalWidth*proCropState.scale,h=img.naturalHeight*proCropState.scale;
  proCropState.x=Math.min(0,Math.max(r.width-w,proCropState.x));
  proCropState.y=Math.min(0,Math.max(r.height-h,proCropState.y));
}
function renderProCrop(){
  const el=document.getElementById('proCropImage');if(!el||!proCropState.img)return;
  clampProCrop();
  el.style.width=(proCropState.img.naturalWidth*proCropState.scale)+'px';
  el.style.height=(proCropState.img.naturalHeight*proCropState.scale)+'px';
  el.style.left=proCropState.x+'px';el.style.top=proCropState.y+'px';
}
function setProCropScale(next,focusX=null,focusY=null){
  const frame=document.getElementById('proCropFrame');if(!frame||!proCropState.img)return;
  const old=proCropState.scale,max=proCropState.minScale*3;
  next=Math.max(proCropState.minScale,Math.min(max,next));
  const r=frame.getBoundingClientRect(),fx=focusX??r.width/2,fy=focusY??r.height/2;
  const imageX=(fx-proCropState.x)/old,imageY=(fy-proCropState.y)/old;
  proCropState.scale=next;proCropState.x=fx-imageX*next;proCropState.y=fy-imageY*next;
  const slider=document.getElementById('proCropZoom');if(slider)slider.value=String(Math.round((next/proCropState.minScale)*100));
  renderProCrop();
}
function openProCrop(file,kind){
  if(!file)return;
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)){toast('Utilisez une image PNG, JPG ou WebP.');return}
  if(file.size>15*1024*1024){toast('Cette image est trop lourde. Choisissez un fichier de moins de 15 Mo.');return}
  const modal=document.getElementById('proCropModal'),dialog=document.getElementById('proCropDialog'),imgEl=document.getElementById('proCropImage');if(!modal||!dialog||!imgEl)return;
  if(proCropState.objectUrl)URL.revokeObjectURL(proCropState.objectUrl);
  proCropState={kind,img:null,objectUrl:URL.createObjectURL(file),scale:1,minScale:1,x:0,y:0,pointers:new Map(),drag:null,pinch:null};
  dialog.classList.toggle('logo-mode',kind==='logo');
  document.getElementById('proCropTitle').textContent=kind==='logo'?'Cadrer le logo':'Cadrer la bannière';
  modal.classList.remove('hidden');
  const image=new Image();
  image.onload=()=>{
    proCropState.img=image;imgEl.src=proCropState.objectUrl;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const r=document.getElementById('proCropFrame').getBoundingClientRect();
      proCropState.minScale=Math.max(r.width/image.naturalWidth,r.height/image.naturalHeight);
      proCropState.scale=proCropState.minScale;
      proCropState.x=(r.width-image.naturalWidth*proCropState.scale)/2;
      proCropState.y=(r.height-image.naturalHeight*proCropState.scale)/2;
      const slider=document.getElementById('proCropZoom');if(slider)slider.value='100';
      renderProCrop();
    }));
  };
  image.onerror=()=>{closeProCrop();toast('Impossible de lire cette image.');};
  image.src=proCropState.objectUrl;
}
function closeProCrop(){document.getElementById('proCropModal')?.classList.add('hidden');proCropState.pointers?.clear();}
function validateProCrop(){
  const frame=document.getElementById('proCropFrame'),img=proCropState.img;if(!frame||!img)return;
  const r=frame.getBoundingClientRect(),sx=-proCropState.x/proCropState.scale,sy=-proCropState.y/proCropState.scale,sw=r.width/proCropState.scale,sh=r.height/proCropState.scale;
  const isLogo=proCropState.kind==='logo',canvas=document.createElement('canvas');
  canvas.width=isLogo?400:1500;canvas.height=isLogo?400:500;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  canvas.toBlob(async blob=>{
    if(!blob){toast('Impossible de préparer cette image.');return}
    if(isLogo)proShowroomPendingLogo=blob;else proShowroomPendingBanner=blob;
    markShowroomMediaDirty();paintProShowroomMedia();closeProCrop();
    const saveBtn=document.getElementById('saveCompanyShowroomBtn');
    if(saveBtn){
      saveBtn.hidden=false;
      saveBtn.textContent='Enregistrement…';
      saveBtn.click();
    }
  },isLogo&&abracaEncodeType()!=='image/webp'?'image/png':abracaEncodeType(),0.86);
}
function refreshProShowroomPreview(){
  const n=document.getElementById('proShowroomNameLive'),p=document.getElementById('proShowroomPhoneLive'),d=document.getElementById('proShowroomDescriptionLive'),city=document.getElementById('proShowroomCityLive');
  if(n)n.textContent=currentProfile?.display_name||currentUser?.user_metadata?.display_name||'Ma page Pro';
  if(p)p.textContent=currentProfile?.phone||'Téléphone de contact';
  if(city)city.textContent=currentProfile?.city||'Ville';
  const field=document.getElementById('accountCompanyDescription');
  const desc=field&&!document.getElementById('companyForm')?.classList.contains('hidden')?field.value.trim():(proShowroomRecord.description||'');
  if(d)d.textContent=desc||'Votre présentation apparaîtra ici.';
  const mine=(allAds||[]).filter(a=>a.owner_id===currentUser?.id&&a.status==='active'&&a.visibility_scope!=='pro');
  const ac=document.getElementById('proShowroomAdsCount'),at=document.getElementById('proShowroomAdsTitle'),box=document.getElementById('proShowroomAdsPreview');
  if(ac)ac.textContent='('+mine.length+')';if(at)at.textContent=mine.length+' annonce'+(mine.length>1?'s':'')+' en ligne';
  if(box)box.innerHTML=mine.length?mine.slice(0,6).map(a=>'<div class="pro-showroom-mini-ad"><b>'+esc(a.title||'Annonce')+'</b><span>'+esc(a.city||'')+(a.price?' · '+formatPrice(a.price):'')+'</span></div>').join(''):'<div class="note">Aucune annonce active pour le moment.</div>';
}
document.getElementById('proBannerChangeBtn')?.addEventListener('click',e=>{e.stopPropagation();document.getElementById('accountCompanyBanner')?.click()});
document.getElementById('proShowroomCoverLive')?.addEventListener('click',()=>document.getElementById('accountCompanyBanner')?.click());
document.getElementById('proShowroomCoverLive')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();document.getElementById('accountCompanyBanner')?.click()}});
document.getElementById('proLogoChangeBtn')?.addEventListener('click',()=>document.getElementById('accountCompanyLogo')?.click());
document.getElementById('accountCompanyBanner')?.addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';openProCrop(file,'banner')});
document.getElementById('accountCompanyLogo')?.addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';openProCrop(file,'logo')});
document.getElementById('accountCompanyDescription')?.addEventListener('input',e=>{const c=document.getElementById('accountCompanyDescriptionCount');if(c)c.textContent=String(e.target.value.length);refreshProShowroomPreview();markShowroomMediaDirty()});
document.getElementById('proCropCancel')?.addEventListener('click',closeProCrop);
document.getElementById('proCropValidate')?.addEventListener('click',validateProCrop);
document.getElementById('proCropZoom')?.addEventListener('input',e=>setProCropScale(proCropState.minScale*(Number(e.target.value)/100)));
document.getElementById('proCropFrame')?.addEventListener('wheel',e=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect();setProCropScale(proCropState.scale*(e.deltaY<0?1.08:.92),e.clientX-r.left,e.clientY-r.top)},{passive:false});
const cropFrame=document.getElementById('proCropFrame');
cropFrame?.addEventListener('pointerdown',e=>{
  cropFrame.setPointerCapture(e.pointerId);proCropState.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(proCropState.pointers.size===1)proCropState.drag={px:e.clientX,py:e.clientY,x:proCropState.x,y:proCropState.y};
  if(proCropState.pointers.size===2){const pts=[...proCropState.pointers.values()];proCropState.pinch={dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),scale:proCropState.scale};}
});
cropFrame?.addEventListener('pointermove',e=>{
  if(!proCropState.pointers.has(e.pointerId))return;proCropState.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(proCropState.pointers.size>=2&&proCropState.pinch){
    const pts=[...proCropState.pointers.values()],d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),r=cropFrame.getBoundingClientRect(),cx=(pts[0].x+pts[1].x)/2-r.left,cy=(pts[0].y+pts[1].y)/2-r.top;
    setProCropScale(proCropState.pinch.scale*(d/proCropState.pinch.dist),cx,cy);
  }else if(proCropState.drag){
    proCropState.x=proCropState.drag.x+(e.clientX-proCropState.drag.px);proCropState.y=proCropState.drag.y+(e.clientY-proCropState.drag.py);renderProCrop();
  }
});
function endCropPointer(e){proCropState.pointers.delete(e.pointerId);proCropState.pinch=null;const remain=[...proCropState.pointers.values()][0];proCropState.drag=remain?{px:remain.x,py:remain.y,x:proCropState.x,y:proCropState.y}:null;}
cropFrame?.addEventListener('pointerup',endCropPointer);cropFrame?.addEventListener('pointercancel',endCropPointer);
window.addEventListener('resize',()=>{if(!document.getElementById('proCropModal')?.classList.contains('hidden')&&proCropState.img){const r=cropFrame.getBoundingClientRect();proCropState.minScale=Math.max(r.width/proCropState.img.naturalWidth,r.height/proCropState.img.naturalHeight);setProCropScale(Math.max(proCropState.scale,proCropState.minScale));}});

document.getElementById('publishBackBtn')?.addEventListener('click',()=>{publishStep=1;renderPublishPackPicker();$('#publishModal .modal-body')?.scrollTo({top:0,behavior:'smooth'});});

// Fix 09/10/2026 : retour de Stripe apres paiement valide -> message sur l'accueil. Et si la page
// est restauree depuis le cache (bouton retour), la fenetre de publication est fermee et videe
// pour ne jamais republier la meme annonce.
(function(){
  const qs=new URLSearchParams(location.search);
  if(qs.get('commerce')==='success'){
    qs.delete('commerce');history.replaceState(null,'',location.pathname+(qs.toString()?'?'+qs:'')+location.hash);
    setTimeout(()=>toast('Paiement validé ✓ Vos options sont en cours d’activation.'),600);
  }
  window.addEventListener('pageshow',e=>{if(e.persisted&&document.getElementById('publishModal')?.classList.contains('open')){closeModal('publishModal');resetPublishForm();}});
})();
