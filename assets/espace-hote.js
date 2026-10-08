
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
let currentUser=null, profile=null, listings=[], details=new Map(), privateDetails=new Map(), hostProfile=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function money(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))}

function confirmVacationLowPrice(price){
  if(!Number.isFinite(price)||price>=10)return true;
  const amount=price.toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:2});
  return confirm(
    'Vérifiez votre tarif avant publication.\n\n'
    +'Vous avez indiqué '+amount+' € par nuit, soit moins de 10 €.\n\n'
    +'Si ce prix est volontaire, confirmez-le pour continuer. Abracadeal affichera alors ce tarif tel que vous l’avez validé.'
  );
}
function msg(t,err=false){const n=$('notice');n.textContent=t;n.className='notice show'+(err?' err':'');window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>{n.classList.remove('show')},5000)}
function closeHostMobileMenu(){
  const menu=$('hostSideMenu'),btn=$('hostMobileMenuBtn');
  menu?.classList.remove('mobile-open');
  btn?.setAttribute('aria-expanded','false');
}
function showView(v){
  if(!v)return;
  document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));
  const target=$('view-'+v);
  if(!target)return;
  target.classList.remove('hidden');
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  if(v==='calendar')loadCalendar();
  if(v==='pricing')loadPricing();
  if(v==='ical')loadFeeds();
  if(v==='messages')loadMessages();
  if(v==='reviews')loadHostReviews();
  closeHostMobileMenu();
}
window.showView=showView;

document.querySelectorAll('.navbtn[data-view]').forEach(b=>{
  b.addEventListener('click',()=>showView(b.dataset.view));
});
document.querySelectorAll('.navbtn:not([data-view])').forEach(b=>{
  b.addEventListener('click',()=>closeHostMobileMenu());
});
$('hostMobileMenuBtn')?.addEventListener('click',()=>{
  const menu=$('hostSideMenu'),btn=$('hostMobileMenuBtn');
  const open=menu?.classList.toggle('mobile-open');
  btn?.setAttribute('aria-expanded',open?'true':'false');
  if(btn)btn.textContent=open?'✕ Fermer le menu':'☰ Menu hôte';
});

async function boot(){
  const params=new URLSearchParams(location.search);
  const hostSignupMode=params.get('host_signup')==='1';

  const {data:{session}}=await sb.auth.getSession();
  currentUser=session?.user||null;

  $('loginView').classList.add('hidden');
  $('appView').classList.add('hidden');
  $('onboardingView').classList.add('hidden');
  $('hostAccountCreate')?.classList.add('hidden');
  $('logoutTop').classList.toggle('hidden',!currentUser);
  if(currentUser){
    const initial=(currentUser.email||'H').trim().charAt(0);
    const av=$('hostAvatar'); if(av) av.textContent=initial;
  }

  if(!currentUser){
    if(hostSignupMode){
      $('onboardingView').classList.remove('hidden');
      $('hostAccountCreate')?.classList.remove('hidden');
      restoreHostDraft(true);
      setTimeout(()=>$('oAccountEmail')?.focus(),80);
    }else{
      $('loginView').classList.remove('hidden');
    }
    return;
  }

  const [{data:p},{data:h},{data:identity}]=await Promise.all([
    sb.from('profiles').select('*').eq('id',currentUser.id).maybeSingle(),
    sb.from('vacation_hosts').select('*').eq('user_id',currentUser.id).maybeSingle(),
    sb.from('vacation_user_details').select('*').eq('user_id',currentUser.id).maybeSingle()
  ]);
  profile=p;
  hostProfile=h;

  if(!hostProfile?.onboarding_completed){
    if(params.get('stripe')==='success'){
      $('onboardingView').classList.remove('hidden');
      onboardingMsg('Carte enregistrée. Finalisation de votre inscription hôte en cours…');
      for(let i=0;i<8;i++){
        await new Promise(r=>setTimeout(r,700));
        const {data:hp}=await sb.from('vacation_hosts').select('onboarding_completed,onboarding_listing_id').eq('user_id',currentUser.id).maybeSingle();
        if(hp?.onboarding_completed){
          clearHostDraft();
          const target=hp.onboarding_listing_id?('photos-vacances.html?listing='+hp.onboarding_listing_id):'espace-hote.html';
          location.replace(target);
          return;
        }
      }
      onboardingMsg('La confirmation Stripe prend quelques secondes. Rechargez la page dans un instant.');
      return;
    }

    $('onboardingView').classList.remove('hidden');
    $('hostAccountCreate')?.classList.add('hidden');
    $('oFirstName').value=identity?.first_name||'';
    $('oLastName').value=identity?.last_name||'';
    $('oPhone').value=identity?.phone||profile?.phone||'';
    $('oBirthDate').value=identity?.birth_date||'';
    $('oHostCity').value=identity?.city||profile?.city||'';
    $('oCountry').value=identity?.country||'France';
    $('oRentalStatus').value=hostProfile?.rental_status||'';
    $('oSiret').value=hostProfile?.siret||'';
    restoreHostDraft(false);
    return;
  }

  $('appView').classList.remove('hidden');
  const type=profile?.account_type==='professionnel'?'professionnel':'particulier';
  $('hostTypePill').textContent=type==='professionnel'?'Hôte professionnel':'Hôte particulier';
  $('hello').textContent='Bonjour'+(profile?.display_name?' '+profile.display_name:'');
  await loadListings();
  $('hostPublicProfile').href='profil-vacances.html?user='+currentUser.id;
  await Promise.all([loadDashboardCounts(),loadFeeds(false),loadMessages(false),loadHostReviews(false),loadGiftNotices()]);if(new URLSearchParams(location.search).get('new')==='1'){showView('listings');openListingForm();}
}

async function loadGiftNotices(){
  const box=document.getElementById('giftNoticeBox');
  if(!box||!currentUser)return;
  const {data,error}=await sb.from('vacation_gift_notices').select('id,message,created_at').eq('owner_id',currentUser.id).is('read_at',null).order('created_at',{ascending:false});
  if(error||!data||!data.length){box.innerHTML='';return}
  box.innerHTML=data.map(n=>'<div class="card" style="background:linear-gradient(135deg,#fff7e6,#fff);border:1px solid #f0d9a0;display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px"><div><strong>🎁 '+esc(n.message)+'</strong></div><button class="btn soft" onclick="dismissGiftNotice(\''+n.id+'\')">J’ai vu, merci !</button></div>').join('');
}
window.dismissGiftNotice=async function(id){
  await sb.from('vacation_gift_notices').update({read_at:new Date().toISOString()}).eq('id',id);
  loadGiftNotices();
}

function getHostDraft(){
  try{
    const draft=JSON.parse(localStorage.getItem('abraca_host_signup_draft')||'null');
    if(!draft)return null;
    if(!draft._savedAt){draft._savedAt=Date.now();localStorage.setItem('abraca_host_signup_draft',JSON.stringify(draft));}
    if(Date.now()-Number(draft._savedAt)>30*24*60*60*1000){localStorage.removeItem('abraca_host_signup_draft');return null;}
    return draft;
  }catch{return null}
}
function saveHostDraft(){
  const ids=['oFirstName','oLastName','oPhone','oBirthDate','oHostCity','oCountry','oRentalStatus','oSiret','oAddress1','oPostal','oCity','oPropertyType','oPrimaryResidence','oGuests','oBedrooms','oBeds','oBathrooms','oRegistrationNumber','oClassifiedStars','oTitle','oPrice','oCleaning','oDescription'];
  const d={_savedAt:Date.now()};ids.forEach(id=>{const el=$(id);if(el)d[id]=el.value});
  localStorage.setItem('abraca_host_signup_draft',JSON.stringify(d));
}
function restoreHostDraft(overwrite=true){
  const d=getHostDraft();if(!d)return;
  Object.entries(d).forEach(([id,value])=>{const el=$(id);if(el&&(overwrite||!el.value))el.value=value??''});
}
function clearHostDraft(){localStorage.removeItem('abraca_host_signup_draft')}

$('createHostAccountBtn')?.addEventListener('click',()=>{
  history.replaceState(null,'','espace-hote.html?host_signup=1');
  $('loginView').classList.add('hidden');
  $('onboardingView').classList.remove('hidden');
  $('hostAccountCreate')?.classList.remove('hidden');
  restoreHostDraft(true);
  window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(()=>$('oAccountEmail')?.focus(),120);
});

function onboardingMsg(t,err=false){
  const n=$('onboardingNotice');
  n.textContent=t;
  n.className='notice show'+(err?' err':'');
  window.scrollTo({top:0,behavior:'smooth'});
}

function abracaHostNormalizePhone(value=''){
  let compact=String(value||'').trim().replace(/[\s().-]/g,'');
  if(/^00\d+$/.test(compact)) compact='+'+compact.slice(2);
  if(/^0[1-9]\d{8}$/.test(compact)) return '+33'+compact.slice(1);
  if(/^\+33[1-9]\d{8}$/.test(compact)) return compact;
  if(/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}
async function abracaHostPhoneAvailable(phone,accountType='particulier'){
  const normalized=abracaHostNormalizePhone(phone);
  const type=['particulier','professionnel'].includes(accountType)?accountType:'particulier';
  if(!normalized) return {ok:false,message:'Indiquez un numéro de téléphone valide.'};
  const {data,error}=await sb.rpc('abracadeal_phone_available',{p_phone:normalized,p_account_type:type});
  if(error) return {ok:false,message:'Impossible de vérifier le numéro pour le moment.'};
  if(!data) return {ok:false,message:'Ce numéro est déjà utilisé pour un compte '+(type==='professionnel'?'professionnel':'particulier')+'.'};
  return {ok:true,normalized};
}

$('completeHostBtn').onclick=async()=>{
  const first=$('oFirstName').value.trim();
  const last=$('oLastName').value.trim();
  const phone=$('oPhone').value.trim();
  const birth=$('oBirthDate').value;
  const hostCity=$('oHostCity').value.trim();
  const country=$('oCountry').value.trim()||'France';
  const rentalStatus=$('oRentalStatus').value;
  const siret=$('oSiret').value.replace(/\s/g,'');
  const address=$('oAddress1').value.trim();
  const postal=$('oPostal').value.trim();
  const city=$('oCity').value.trim();
  const primary=$('oPrimaryResidence').value;
  const registration=$('oRegistrationNumber').value.trim();
  const title=$('oTitle').value.trim();
  const description=$('oDescription').value.trim();
  const price=Number($('oPrice').value);

  if(!currentUser){
    const accountEmail=$('oAccountEmail')?.value.trim()||'';
    const accountPassword=$('oAccountPassword')?.value||'';
    const accountPassword2=$('oAccountPassword2')?.value||'';
    if(!accountEmail||!accountPassword||!accountPassword2){
      onboardingMsg('Renseignez votre e-mail et votre mot de passe pour créer votre compte Abracadeal.',true);return;
    }
    if(accountPassword.length<6){
      onboardingMsg('Le mot de passe doit contenir au moins 6 caractères.',true);return;
    }
    if(accountPassword!==accountPassword2){
      onboardingMsg('Les deux mots de passe ne correspondent pas.',true);return;
    }
  }

  if(!first||!last||!phone||!birth||!hostCity||!rentalStatus||!address||!postal||!city||primary===''||!registration||!title||!description||!Number.isFinite(price)){
    onboardingMsg('Complétez tous les champs obligatoires avant de continuer.',true);return;
  }
  if(!/^\d{14}$/.test(siret)){onboardingMsg('Le numéro SIRET doit contenir exactement 14 chiffres.',true);return}
  if(!$('oLegalCheck').checked){onboardingMsg('Vous devez confirmer la déclaration sur l’honneur.',true);return}
  if(price<10&&!confirmVacationLowPrice(price)){
    onboardingMsg('Tarif non confirmé. Vérifiez le prix par nuit avant de continuer.',true);return;
  }

  const btn=$('completeHostBtn');btn.disabled=true;
  try{
    let normalizedPhone=abracaHostNormalizePhone(phone);
    if(!normalizedPhone){onboardingMsg('Indiquez un numéro de téléphone valide.',true);return}
    if(!currentUser){
      const requestedType=$('oRentalStatus').value==='societe'?'professionnel':'particulier';
      const phoneCheck=await abracaHostPhoneAvailable(phone,requestedType);
      if(!phoneCheck.ok){onboardingMsg(phoneCheck.message,true);return}
      normalizedPhone=phoneCheck.normalized;
      saveHostDraft();
      const accountEmail=$('oAccountEmail').value.trim();
      const accountPassword=$('oAccountPassword').value;

      const legalAcceptance=await window.confirmLegalRegistration();
      if(!legalAcceptance)return;
      const {data:signupData,error:signupError}=await sb.auth.signUp({
        email:accountEmail,
        password:accountPassword,
        options:{
          emailRedirectTo:location.origin+'/vacances.html?mode=hote&host_signup=1',
          data:{
            ...legalAcceptance,
            display_name:(first+' '+last).trim(),
            account_type:requestedType,
            phone:normalizedPhone
          }
        }
      });
      if(signupError){onboardingMsg(signupError.message,true);return}

      if(!signupData?.session){
        onboardingMsg('Compte Abracadeal créé. Confirmez votre adresse e-mail : votre formulaire est conservé et vous reprendrez directement dans votre Espace Hôte après confirmation.');
        return;
      }

      currentUser=signupData.user;
      await new Promise(r=>setTimeout(r,300));
      const {data:newProfile}=await sb.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
      profile=newProfile||{account_type:requestedType,display_name:(first+' '+last).trim()};
      $('hostAccountCreate')?.classList.add('hidden');
      $('logoutTop').classList.remove('hidden');
    }

    const type=profile?.account_type==='professionnel'?'professionnel':'particulier';
    const now=new Date().toISOString();

    const {error:idErr}=await sb.from('vacation_user_details').upsert({
      user_id:currentUser.id,first_name:first,last_name:last,phone:normalizedPhone,birth_date:birth,city:hostCity,country,updated_at:now
    },{onConflict:'user_id'});
    if(idErr){onboardingMsg(idErr.message,true);return}

    const {error:hostErr}=await sb.from('vacation_hosts').upsert({
      user_id:currentUser.id,host_type:type,status:'pending',siret,rental_status:rentalStatus,
      onboarding_completed:false,legal_declaration_accepted_at:now,updated_at:now
    },{onConflict:'user_id'});
    if(hostErr){onboardingMsg(hostErr.message,true);return}

    const listingPayload={
      owner_id:currentUser.id,category:'vacances',title,description,price,city,postal_code:postal,
      seller_type:type,status:'pending',phone,contact_email:currentUser.email||null,
      vacation_low_price_confirmed_at:price<10?now:null,
      vacation_low_price_confirmed_value:price<10?price:null
    };

    const {data:hostState,error:hostStateErr}=await sb.from('vacation_hosts')
      .select('onboarding_listing_id')
      .eq('user_id',currentUser.id)
      .maybeSingle();
    if(hostStateErr){onboardingMsg(hostStateErr.message,true);return}

    let listingId=hostState?.onboarding_listing_id||null;

    if(listingId){
      const {data:existingListing,error:existingErr}=await sb.from('listings')
        .select('id,owner_id,category')
        .eq('id',listingId)
        .maybeSingle();
      if(existingErr){onboardingMsg(existingErr.message,true);return}
      if(!existingListing||existingListing.owner_id!==currentUser.id||existingListing.category!=='vacances'){
        listingId=null;
      }
    }

    if(listingId){
      const {error:listErr}=await sb.from('listings')
        .update({...listingPayload,updated_at:now})
        .eq('id',listingId);
      if(listErr){onboardingMsg(listErr.message,true);return}
    }else{
      const {data:newListing,error:listErr}=await sb.from('listings')
        .insert(listingPayload)
        .select('id')
        .single();
      if(listErr){onboardingMsg(listErr.message,true);return}
      listingId=newListing.id;

      const {error:bindErr}=await sb.from('vacation_hosts')
        .update({onboarding_listing_id:listingId,updated_at:now})
        .eq('user_id',currentUser.id);
      if(bindErr){
        await sb.from('listings').delete().eq('id',listingId);
        onboardingMsg(bindErr.message,true);
        return;
      }
    }
    const stars=$('oClassifiedStars').value?Number($('oClassifiedStars').value):null;
    const {error:detailErr}=await sb.from('vacation_listing_details').upsert({
      listing_id:listingId,owner_id:currentUser.id,property_type:$('oPropertyType').value,
      max_guests:Number($('oGuests').value)||2,bedrooms:Number($('oBedrooms').value)||0,
      beds:Number($('oBeds').value)||0,bathrooms:Number($('oBathrooms').value)||0,
      cleaning_fee:Number($('oCleaning').value)||0,min_nights:1,checkin_from:'15:00',
      checkout_until:'11:00',primary_residence:primary==='true',
      declaration_number:registration,registration_status:'numero_obtenu',
      registration_number:registration,classified_stars:stars,
      regulatory_declaration_accepted_at:now,amenities:[],updated_at:now
    },{onConflict:'listing_id'});
    if(detailErr){await sb.from('listings').delete().eq('id',listingId);onboardingMsg(detailErr.message,true);return}

    const {error:privateErr}=await sb.from('vacation_listing_private').upsert({
      listing_id:listingId,owner_id:currentUser.id,address_line1:address,postal_code:postal,city,country:'France',updated_at:now
    },{onConflict:'listing_id'});
    if(privateErr){await sb.from('listings').delete().eq('id',listingId);onboardingMsg(privateErr.message,true);return}

    const {error:hostPendingErr}=await sb.from('vacation_hosts').update({
      status:'pending',onboarding_completed:true,onboarding_listing_id:listingId,updated_at:now
    }).eq('user_id',currentUser.id);
    if(hostPendingErr){onboardingMsg(hostPendingErr.message,true);return}

    clearHostDraft();
    onboardingMsg(profile?.account_type==='professionnel'?'Inscription hôte enregistrée. Ajoutez vos photos puis choisissez votre formule Vacances Pro.':'Inscription hôte enregistrée. Ajoutez vos photos ; la publication Particulier est à 4,99 € TTC pour 30 jours.');
    location.href='photos-vacances.html?listing='+encodeURIComponent(listingId);
  }finally{btn.disabled=false}
};

$('loginBtn').onclick=async()=>{const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){alert(error.message);return}boot()};
$('logoutTop').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('accountMenuBtn')?.addEventListener('click',e=>{
  e.stopPropagation();
  const dd=$('accountMenuDropdown');
  const willOpen=dd.classList.contains('hidden');
  dd.classList.toggle('hidden',!willOpen);
  $('accountMenuBtn').setAttribute('aria-expanded',String(willOpen));
});
document.addEventListener('click',()=>{
  $('accountMenuDropdown')?.classList.add('hidden');
  $('accountMenuBtn')?.setAttribute('aria-expanded','false');
});

function listingOptions(){return listings.map(l=>'<option value="'+l.id+'">'+esc(l.title)+'</option>').join('')}
function refreshSelects(){['cListing','pListing','iListing'].forEach(id=>$(id).innerHTML=listingOptions()||'<option value="">Aucun logement</option>')}

async function loadListings(){
  const {data,error}=await sb.from('listings').select('id,title,description,price,city,postal_code,status,created_at,updated_at,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value').eq('owner_id',currentUser.id).eq('category','vacances').order('created_at',{ascending:false});
  if(error){msg(error.message,true);return}
  listings=data||[];
  const ids=listings.map(x=>x.id);
  details=new Map();privateDetails=new Map();
  if(ids.length){const [{data:d},{data:pd}]=await Promise.all([sb.from('vacation_listing_details').select('*').in('listing_id',ids),sb.from('vacation_listing_private').select('*').in('listing_id',ids)]);(d||[]).forEach(x=>details.set(x.listing_id,x));(pd||[]).forEach(x=>privateDetails.set(x.listing_id,x))}
  renderListings();refreshSelects();
}
function listingHtml(l){
  const st=esc(l.status||'pending'),d=details.get(l.id);
  return '<div class="listing"><div><div class="actions" style="margin-bottom:6px"><span class="status s-'+st+'">'+st+'</span><span class="pill">'+esc(d?.max_guests||2)+' voyageurs</span></div><h3>'+esc(l.title)+'</h3><div class="meta">'+esc(l.city)+(l.postal_code?' · '+esc(l.postal_code):'')+' · '+money(l.price)+'/nuit'+(d?.min_nights?' · min. '+d.min_nights+' nuit(s)':'')+'</div></div><div class="actions"><button class="btn soft" onclick="editListing(\''+l.id+'\')">Modifier</button><a class="btn soft" href="photos-vacances.html?listing='+l.id+'">Photos</a><a class="btn soft" href="logement-vacances.html?id='+l.id+'">Voir</a><button class="btn soft" onclick="focusCalendar(\''+l.id+'\')">Calendrier</button><button class="btn danger" onclick="archiveListing(\''+l.id+'\')">'+(l.status==='archived'?'Réactiver':'Archiver')+'</button><button class="btn danger" onclick="deleteListing(\''+l.id+'\')">Supprimer</button></div></div>'
}
function renderListings(){const html=listings.length?listings.map(listingHtml).join(''):'<div class="empty">Aucun logement pour le moment. Cliquez sur « Nouveau logement ».</div>';$('listingsList').innerHTML=html;$('dashboardListings').innerHTML=listings.length?listings.slice(0,3).map(listingHtml).join(''):'<div class="empty">Ajoutez votre premier logement pour démarrer.</div>';$('mListings').textContent=listings.length;$('mActive').textContent=listings.filter(x=>x.status==='active').length}
function openListingForm(){resetListingForm();$('listingForm').classList.remove('hidden');$('lTitle').focus()}
window.openListingForm=openListingForm;
function closeListingForm(){$('listingForm').classList.add('hidden')}
window.closeListingForm=closeListingForm;
function resetListingForm(){['editListingId','lTitle','lCity','lPostal','lPrice','lDescription','lDeclaration','lAddress','lAmenities','lRules'].forEach(id=>$(id).value='');$('lType').value='logement_entier';$('lGuests').value=2;$('lBedrooms').value=1;$('lBeds').value=1;$('lBathrooms').value=1;$('lCleaning').value=0;$('lMinNights').value=1;$('lCheckin').value='15:00';$('lCheckout').value='11:00';$('lPrimary').value=''}
window.editListing=id=>{const l=listings.find(x=>x.id===id),d=details.get(id)||{};if(!l)return;openListingForm();$('editListingId').value=id;$('lTitle').value=l.title||'';$('lCity').value=l.city||'';$('lPostal').value=l.postal_code||'';$('lPrice').value=l.price??'';$('lDescription').value=l.description||'';$('lType').value=d.property_type||'logement_entier';$('lGuests').value=d.max_guests||2;$('lBedrooms').value=d.bedrooms??1;$('lBeds').value=d.beds??1;$('lBathrooms').value=d.bathrooms??1;$('lCleaning').value=d.cleaning_fee??0;$('lMinNights').value=d.min_nights||1;$('lCheckin').value=(d.checkin_from||'15:00').slice(0,5);$('lCheckout').value=(d.checkout_until||'11:00').slice(0,5);$('lPrimary').value=d.primary_residence===null||d.primary_residence===undefined?'':String(d.primary_residence);$('lDeclaration').value=d.registration_number||d.declaration_number||'';$('lAddress').value=(privateDetails.get(id)||{}).address_line1||'';$('lAmenities').value=(d.amenities||[]).join(', ');$('lRules').value=d.house_rules||'';window.scrollTo({top:100,behavior:'smooth'})}
$('saveListingBtn').onclick=async()=>{
  const id=$('editListingId').value;const title=$('lTitle').value.trim(),city=$('lCity').value.trim(),description=$('lDescription').value.trim(),price=Number($('lPrice').value);
  if(!title||!city||!description||!Number.isFinite(price)){msg('Titre, ville, description et prix sont obligatoires.',true);return}
  const existingListing=id?listings.find(x=>x.id===id):null;
  const lowPriceAlreadyConfirmed=!!(existingListing?.vacation_low_price_confirmed_at&&Number(existingListing?.vacation_low_price_confirmed_value)===price);
  if(price<10&&!lowPriceAlreadyConfirmed&&!confirmVacationLowPrice(price)){
    msg('Tarif non confirmé. Vérifiez le prix par nuit avant d’enregistrer.',true);return;
  }
  const lowPriceConfirmedAt=price<10?(lowPriceAlreadyConfirmed?existingListing.vacation_low_price_confirmed_at:new Date().toISOString()):null;
  const listingPayload={owner_id:currentUser.id,category:'vacances',title,description,price,city,postal_code:$('lPostal').value.trim()||null,seller_type:profile?.account_type==='professionnel'?'professionnel':'particulier',vacation_low_price_confirmed_at:lowPriceConfirmedAt,vacation_low_price_confirmed_value:price<10?price:null};
  let listingId=id;
  if(id){const {error}=await sb.from('listings').update({...listingPayload,updated_at:new Date().toISOString()}).eq('id',id);if(error){msg(error.message,true);return}}
  else{listingPayload.status='pending';const {data,error}=await sb.from('listings').insert(listingPayload).select('id').single();if(error){msg(error.message,true);return}listingId=data.id}
  const primary=$('lPrimary').value===''?null:$('lPrimary').value==='true';
  const d={listing_id:listingId,owner_id:currentUser.id,property_type:$('lType').value,max_guests:Number($('lGuests').value)||2,bedrooms:Number($('lBedrooms').value)||0,beds:Number($('lBeds').value)||0,bathrooms:Number($('lBathrooms').value)||0,cleaning_fee:Number($('lCleaning').value)||0,min_nights:Number($('lMinNights').value)||1,checkin_from:$('lCheckin').value||'15:00',checkout_until:$('lCheckout').value||'11:00',primary_residence:primary,declaration_number:$('lDeclaration').value.trim()||null,registration_number:$('lDeclaration').value.trim()||null,registration_status:$('lDeclaration').value.trim()?'numero_obtenu':'non_renseigne',amenities:$('lAmenities').value.split(',').map(x=>x.trim()).filter(Boolean),house_rules:$('lRules').value.trim()||null,updated_at:new Date().toISOString()};
  const {error:de}=await sb.from('vacation_listing_details').upsert(d,{onConflict:'listing_id'});if(de){msg(de.message,true);return}
  const exactAddress=$('lAddress').value.trim();if(exactAddress){const {error:pe}=await sb.from('vacation_listing_private').upsert({listing_id:listingId,owner_id:currentUser.id,address_line1:exactAddress,postal_code:$('lPostal').value.trim(),city, country:'France',updated_at:new Date().toISOString()},{onConflict:'listing_id'});if(pe){msg(pe.message,true);return}}
  if(!id){await sb.functions.invoke('moderate-listing',{body:{listing_id:listingId}})}
  msg(id?'Logement mis à jour.':'Logement créé. Il passe par la modération Abracadeal.');closeListingForm();await loadListings();await loadDashboardCounts()
}
window.archiveListing=async id=>{const l=listings.find(x=>x.id===id);if(!l)return;const next=l.status==='archived'?'pending':'archived';const {error}=await sb.from('listings').update({status:next,updated_at:new Date().toISOString()}).eq('id',id);if(error){msg(error.message,true);return}if(next==='pending')await sb.functions.invoke('moderate-listing',{body:{listing_id:id}});await loadListings()}
window.deleteListing=async id=>{const l=listings.find(x=>x.id===id);if(!l)return;if(!confirm('Supprimer définitivement l\'annonce "'+l.title+'" ? Cette action est irréversible.'))return;const {error}=await sb.rpc('host_delete_own_listing',{p_listing_id:id});if(error){msg(error.message?.includes('listing_has_dependencies')?'Impossible de supprimer : cette annonce a des réservations ou des messages liés. Archivez-la plutôt.':error.message,true);return}msg('Logement supprimé.');await loadListings();await loadDashboardCounts()}
window.focusCalendar=id=>{showView('calendar');$('cListing').value=id;loadCalendar()}

$('addBlockBtn').onclick=async()=>{const listing_id=$('cListing').value,starts_on=$('cStart').value,ends_on=$('cEnd').value;if(!listing_id||!starts_on||!ends_on||ends_on<=starts_on){msg('Choisissez un logement et une période valide.',true);return}const {error}=await sb.from('vacation_manual_blocks').insert({owner_id:currentUser.id,listing_id,starts_on,ends_on,note:$('cNote').value.trim()||null});if(error){msg(error.message,true);return}$('cNote').value='';msg('Période bloquée.');loadCalendar()}
$('cListing').onchange=loadCalendar;
async function loadCalendar(){const id=$('cListing').value;if(!id){$('calendarList').innerHTML='<div class="empty">Ajoutez d’abord un logement.</div>';return}const [m,i]=await Promise.all([sb.from('vacation_manual_blocks').select('*').eq('listing_id',id).order('starts_on'),sb.from('vacation_calendar_blocks').select('*').eq('listing_id',id).order('starts_on')]);const rows=[];(m.data||[]).forEach(x=>rows.push({kind:'Manuel',...x}));(i.data||[]).forEach(x=>rows.push({kind:'iCal',...x}));rows.sort((a,b)=>a.starts_on.localeCompare(b.starts_on));$('calendarList').innerHTML=rows.length?rows.map(x=>'<div class="calendarRow"><div class="cardhead" style="margin:0"><div><b>'+esc(x.kind)+'</b> · '+new Date(x.starts_on+'T12:00').toLocaleDateString('fr-FR')+' → '+new Date(x.ends_on+'T12:00').toLocaleDateString('fr-FR')+(x.note?'<div class="sub">'+esc(x.note)+'</div>':'')+'</div>'+(x.kind==='Manuel'?'<button class="btn danger" onclick="deleteBlock(\''+x.id+'\')">Supprimer</button>':'')+'</div></div>').join(''):'<div class="empty">Aucune date bloquée.</div>'}
window.deleteBlock=async id=>{await sb.from('vacation_manual_blocks').delete().eq('id',id);loadCalendar()}

$('addRuleBtn').onclick=async()=>{const listing_id=$('pListing').value,starts_on=$('pStart').value,ends_on=$('pEnd').value,nightly_price=Number($('pPrice').value);if(!listing_id||!starts_on||!ends_on||ends_on<=starts_on||!Number.isFinite(nightly_price)){msg('Complétez la période et le prix.',true);return}if(nightly_price<10&&!confirmVacationLowPrice(nightly_price)){msg('Tarif non confirmé. Vérifiez le prix par nuit avant d’ajouter cette période.',true);return}const {error}=await sb.from('vacation_price_rules').insert({owner_id:currentUser.id,listing_id,label:$('pLabel').value.trim()||'Période spéciale',starts_on,ends_on,nightly_price,min_nights:$('pMin').value?Number($('pMin').value):null,low_price_confirmed_at:nightly_price<10?new Date().toISOString():null});if(error){msg(error.message,true);return}msg('Règle tarifaire ajoutée.');loadPricing()}
$('pListing').onchange=loadPricing;
async function loadPricing(){const id=$('pListing').value;if(!id){$('pricingList').innerHTML='<div class="empty">Ajoutez d’abord un logement.</div>';return}const {data}=await sb.from('vacation_price_rules').select('*').eq('listing_id',id).order('starts_on');$('pricingList').innerHTML=data?.length?data.map(x=>'<div class="ruleRow"><div class="cardhead" style="margin:0"><div><b>'+esc(x.label)+'</b><div class="sub">'+new Date(x.starts_on+'T12:00').toLocaleDateString('fr-FR')+' → '+new Date(x.ends_on+'T12:00').toLocaleDateString('fr-FR')+' · '+money(x.nightly_price)+'/nuit'+(x.min_nights?' · min. '+x.min_nights+' nuit(s)':'')+'</div></div><button class="btn danger" onclick="deleteRule(\''+x.id+'\')">Supprimer</button></div></div>').join(''):'<div class="empty">Aucune règle spéciale. Le prix de base de l’annonce s’applique.</div>'}
window.deleteRule=async id=>{await sb.from('vacation_price_rules').delete().eq('id',id);loadPricing()}

$('addFeedBtn').onclick=async()=>{const listing_id=$('iListing').value;if(!listing_id){msg('Ajoutez d’abord un logement.',true);return}let u=$('iUrl').value.trim();if(!u){msg('Collez un lien iCal.',true);return}if(u.startsWith('webcal://'))u='https://'+u.slice(9);const l=listings.find(x=>x.id===listing_id);const {data,error}=await sb.from('vacation_ical_feeds').insert({owner_id:currentUser.id,listing_id,property_label:l?.title||'Mon logement',provider:$('iProvider').value,feed_url:u}).select('id').single();if(error){msg(error.message,true);return}const {error:se}=await sb.functions.invoke('sync-vacation-ical',{body:{feed_id:data.id}});msg(se?'Flux ajouté, mais la première synchronisation a échoué.':'Calendrier ajouté et synchronisé.',!!se);$('iUrl').value='';loadFeeds();loadDashboardCounts()}
async function loadFeeds(render=true){const {data,error}=await sb.from('vacation_ical_feeds').select('*').eq('owner_id',currentUser.id).order('created_at',{ascending:false});if(error)return;if(render){$('feedsList').innerHTML=data?.length?data.map(f=>'<div class="feedRow"><div class="cardhead" style="margin:0"><div><b>'+esc(f.property_label)+'</b> · '+esc(f.provider)+'<div class="sub">'+(f.last_synced_at?'Dernière synchro : '+new Date(f.last_synced_at).toLocaleString('fr-FR'):'Jamais synchronisé')+(f.last_error?' · Erreur : '+esc(f.last_error):'')+'</div></div><div class="actions"><button class="btn soft" onclick="syncFeed(\''+f.id+'\')">Synchroniser</button><button class="btn danger" onclick="deleteFeed(\''+f.id+'\')">Supprimer</button></div></div></div>').join(''):'<div class="empty">Aucun calendrier iCal connecté.</div>'}$('mFeeds').textContent=(data||[]).length}
window.syncFeed=async id=>{msg('Synchronisation en cours…');const {data,error}=await sb.functions.invoke('sync-vacation-ical',{body:{feed_id:id}});msg(error?'Erreur de synchronisation.':'Synchronisation terminée : '+(data?.events??0)+' période(s) importée(s).',!!error);loadFeeds();loadCalendar()}
window.deleteFeed=async id=>{if(!confirm('Supprimer ce calendrier ?'))return;await sb.from('vacation_ical_feeds').delete().eq('id',id);loadFeeds();loadDashboardCounts()}

async function loadMessages(render=true){
  const {data:convs}=await sb.from('conversations').select('id,listing_id,buyer_id,seller_id,updated_at,listings(title,category)').eq('seller_id',currentUser.id).order('updated_at',{ascending:false});
  const vacation=(convs||[]).filter(c=>c.listings?.category==='vacances');
  let unread=0,items=[];
  for(const c of vacation){const {data:m}=await sb.from('messages').select('id,body,created_at,read_at,sender_id').eq('conversation_id',c.id).order('created_at',{ascending:false}).limit(1);const last=m?.[0];if(last&&last.sender_id!==currentUser.id&&!last.read_at)unread++;items.push({c,last})}
  $('mUnread').textContent=unread;
  if(render)$('messagesList').innerHTML=items.length?items.map(({c,last})=>'<div class="msgRow '+(last&&last.sender_id!==currentUser.id&&!last.read_at?'unread':'')+'"><div class="cardhead" style="margin:0"><div><b>'+esc(c.listings?.title||'Logement')+'</b><div>'+esc(last?.body||'Nouvelle conversation')+'</div><small>'+(last?new Date(last.created_at).toLocaleString('fr-FR'):'')+'</small></div><div class="actions"><a class="btn soft" href="profil-vacances.html?user='+c.buyer_id+'">Profil voyageur</a><a class="btn primary" href="gestion-sejour.html?conversation='+c.id+'">Confirmer un séjour</a></div></div></div>').join(''):'<div class="empty">Aucun message voyageur pour le moment.</div>'
}
async function loadHostReviews(render=true){
  const {data,error}=await sb.from('vacation_reviews').select('id,reviewer_id,subject_id,subject_role,rating,comment,subject_reply,created_at,visible_at,reveal_at').eq('subject_id',currentUser.id).eq('subject_role','host').eq('status','active').order('created_at',{ascending:false});
  if(error)return;
  const r=data||[],avg=r.length?(r.reduce((s,x)=>s+Number(x.rating),0)/r.length):0;
  if(render){
    $('reviewSummary').innerHTML='<div class="metric"><span>Note hôte</span><strong>'+(r.length?'⭐ '+avg.toFixed(1).replace('.',','):'—')+'</strong><div class="kpiNote">'+r.length+' avis</div></div><div class="metric"><span>Avis publics</span><strong>'+r.filter(x=>x.visible_at||new Date(x.reveal_at)<=new Date()).length+'</strong><div class="kpiNote">visibles sur le profil</div></div><div class="metric"><span>Réponses</span><strong>'+r.filter(x=>x.subject_reply).length+'</strong><div class="kpiNote">avis avec réponse</div></div><div class="metric"><span>Profil</span><strong>Public</strong><div class="kpiNote">hôte & voyageur</div></div>';
    const ids=[...new Set(r.map(x=>x.reviewer_id))];let names={};if(ids.length){const {data:ps}=await sb.from('public_profiles').select('id,display_name').in('id',ids);(ps||[]).forEach(x=>names[x.id]=x.display_name)}
    $('hostReviews').innerHTML=r.length?r.map(x=>'<div class="msgRow"><div class="cardhead" style="margin:0"><div><b>'+esc(names[x.reviewer_id]||'Voyageur Abracadeal')+' · '+('★'.repeat(Number(x.rating)))+('☆'.repeat(5-Number(x.rating)))+'</b><div>'+esc(x.comment)+'</div><small>'+new Date(x.created_at).toLocaleDateString('fr-FR')+'</small>'+(x.subject_reply?'<div class="reply" style="margin-top:8px"><b>Votre réponse</b><div>'+esc(x.subject_reply)+'</div></div>':'')+'</div><div class="actions">'+((x.visible_at||new Date(x.reveal_at)<=new Date())?'<button class="btn soft" onclick="replyReview(\''+x.id+'\')">Répondre</button>':'<span class="pill">Masqué jusqu’à réciprocité / 14 j</span>')+'</div></div></div>').join(''):'<div class="empty">Aucun avis reçu pour le moment.</div>';
  }
}
window.replyReview=async id=>{const t=prompt('Votre réponse à cet avis :');if(t===null)return;const {error}=await sb.rpc('vacation_reply_review',{p_review_id:id,p_reply:t});if(error){msg(error.message,true);return}msg('Réponse enregistrée.');loadHostReviews()}
async function loadDashboardCounts(){await loadFeeds(false);await loadMessages(false)}

let vacationBillingOpening=false;
async function handleVacationBillingQuery(){
  const action=new URLSearchParams(location.search).get('billing');
  if(!['manage','cancel'].includes(action)||vacationBillingOpening)return;
  vacationBillingOpening=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){alert('Connectez-vous pour gérer votre abonnement.');return}
    const {data:p}=await sb.from('profiles').select('account_type').eq('id',session.user.id).maybeSingle();
    if(p?.account_type!=='professionnel'){
      alert('Les publications Vacances Particulier sont des achats ponctuels à 4,99 € TTC pour 30 jours : aucun abonnement n’est à résilier.');
      return;
    }
    const {data,error}=await sb.functions.invoke('create-vacation-billing-portal',{body:{action}});
    if(error||!data?.portal_url)throw new Error(data?.error||error?.message||'Portail abonnement indisponible');
    location.href=data.portal_url;
  }catch(error){alert(error?.message||'Impossible d’ouvrir la gestion de l’abonnement.');}
  finally{
    try{history.replaceState({},document.title,location.pathname)}catch(_){}
    vacationBillingOpening=false;
  }
}
sb.auth.onAuthStateChange((_event,session)=>{if(session?.user)setTimeout(()=>handleVacationBillingQuery(),0)});
handleVacationBillingQuery();
boot();
