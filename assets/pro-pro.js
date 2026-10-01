
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:'sb-jplzvxmpbpjssyinozap-auth-token',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>Number(v||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const catLabel=v=>({vehicules:'Véhicules',immobilier:'Immobilier',hightech:'High-tech',maison:'Maison',mode:'Mode',services:'Services',emploi:'Emploi',vacances:'Vacances'}[v]||v||'Annonce');
const photoUrl=p=>p?(String(p).startsWith('http://')||String(p).startsWith('https://')?String(p):sb.storage.from('listing-images').getPublicUrl(p).data.publicUrl):'assets/default-listing-photo-20260921.jpg';
const toast=t=>{const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),2400)};
const show=(sel,yes=true)=>$(sel)?.classList.toggle('hidden',!yes);
const rpc=async(name,args)=>{const r=await sb.rpc(name,args);if(r.error)throw r.error;return r.data};
const labels={automobile:'Automobile',transport:'Transport / VTC'},statusLabels={draft:'Brouillon',active:'En ligne',sold:'Vendu',archived:'Retiré'},accessLabels={pending:'En attente',accepted:'Accepté',rejected:'Refusé / retiré'};
let currentUser=null,currentProfile=null,isAdmin=false,isProfessional=false,offers=[],stockOffers=[],proListings=[],incoming=[],adminPage=0,relationsPage=0,blobUrls=[];

function setStatus(t){$('#status').textContent=t}
function setView(view){
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  $$('[data-section]').forEach(x=>x.classList.toggle('hidden',x.dataset.section!==view));
  $('#offerForm').classList.add('hidden');$('#requestForm').classList.add('hidden');
  if(view==='offers')loadOffers(false);
  if(view==='stock')loadOffers(true);
  if(view==='access')loadAccess();
  if(view==='relations')loadRelations();
}
$$('.tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

function listingCard(a){
  const p=[...(a.listing_photos||[])].sort((x,y)=>(x.position||0)-(y.position||0))[0];
  return '<article class="card" data-listing="'+esc(a.id)+'"><div class="photo"><img src="'+esc(photoUrl(p?.storage_path))+'" alt=""><span class="chip">PRO/PRO</span></div><div class="body"><div class="note">'+esc(catLabel(a.category))+'</div><h3>'+esc(a.title||'Annonce')+'</h3><div class="price">'+esc(money(a.price))+'</div><div class="meta">📍 '+esc(a.city||'')+(a.postal_code?' ('+esc(a.postal_code)+')':'')+'</div></div></article>';
}
async function loadListings(){
  $('#listingGrid').innerHTML='<div class="empty">Chargement…</div>';
  const {data,error}=await sb.from('listings').select('id,owner_id,category,title,description,price,city,seller_type,status,source,external_id,external_url,last_synced_at,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,created_at,updated_at,show_phone,item_condition,postal_code,featured_until,promotion_tier,photo_limit,crit_air,loa_available,loa_monthly,listing_reference,archived_at,archive_reason,retention_until,visibility_scope,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value,listing_photos(id,storage_path,position)').eq('status','active').eq('visibility_scope','pro').order('created_at',{ascending:false}).limit(100);
  if(error){$('#listingGrid').innerHTML='<div class="empty">Impossible de charger les annonces.</div>';return}
  proListings=data||[];$('#listingStatus').textContent=proListings.length?proListings.length+' annonce'+(proListings.length>1?'s':'')+' réservée'+(proListings.length>1?'s':'')+' aux professionnels.':'Aucune annonce Pro/Pro pour le moment.';
  $('#listingGrid').innerHTML=proListings.length?proListings.map(listingCard).join(''):'<div class="empty">Aucune annonce Pro/Pro pour le moment.</div>';
}
$('#refreshListings').onclick=loadListings;
$('#listingGrid').onclick=e=>{const c=e.target.closest('[data-listing]');if(c)openListing(c.dataset.listing)};

function openListing(id){
  const a=proListings.find(x=>x.id===id);if(!a)return;
  const photos=[...(a.listing_photos||[])].sort((x,y)=>(x.position||0)-(y.position||0));
  const gal=photos.length?'<div class="gallery">'+photos.map(p=>'<img src="'+esc(photoUrl(p.storage_path))+'" alt="">').join('')+'</div>':'<div class="gallery"><img src="assets/default-listing-photo-20260921.jpg" alt=""></div>';
  $('#detailContent').innerHTML=gal+'<div class="sheetbody"><div class="note">'+esc(catLabel(a.category))+' · PRO/PRO</div><h2>'+esc(a.title||'Annonce')+'</h2><div class="sheetprice">'+esc(money(a.price))+'</div><div class="meta">📍 '+esc(a.city||'')+(a.postal_code?' ('+esc(a.postal_code)+')':'')+'</div><p class="sheetdesc">'+esc(a.description||'')+'</p></div>';
  $('#detailSheet').hidden=false;$('#detailSheet').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}
function closeDetail(){ $('#detailSheet').hidden=true;$('#detailSheet').setAttribute('aria-hidden','true');document.body.style.overflow='';}
$('#closeDetail').onclick=closeDetail;$('#detailSheet').onclick=e=>{if(e.target.id==='detailSheet')closeDetail()};

function offerCard(o,stock=false){
  const priceVisible=isAdmin||o.prices_allowed,contactVisible=isAdmin||(o.contacts_allowed??(o.contact_phone||o.contact_email)),canManage=isAdmin||o.seller_id===currentUser.id;
  return '<article class="card"><div class="body"><span class="status-pill">PRO · '+esc(statusLabels[o.status]||o.status)+'</span><h3>'+esc(o.title)+'</h3><div class="price">'+(priceVisible?esc(money(o.price))+' '+esc(o.price_basis):'Prix sur accord')+'</div><div class="meta">'+esc(o.company_name||'Professionnel')+' · '+esc(o.city||'')+'</div><p class="desc">'+esc(o.description||'')+'</p>'+(contactVisible?'<p class="note">Contact : '+esc(o.contact_phone||'—')+'<br>'+esc(o.contact_email||'—')+'</p>':(o.seller_id===currentUser.id?'':o.access_status?'<p class="note">'+esc(accessLabels[o.access_status]||o.access_status)+'</p>':'<button class="btn primary" type="button" data-request="'+esc(o.seller_id)+'">Demander l’accès</button>'))+'<div class="toolbar"><button class="btn" type="button" data-photos="'+esc(o.id)+'">Photos</button>'+(canManage?'<button class="btn" type="button" data-edit="'+esc(o.id)+'">Modifier</button>'+(o.status==='active'?'<button class="btn" type="button" data-status="sold" data-id="'+esc(o.id)+'">Vendu</button>':'')+(o.status!=='archived'?'<button class="btn" type="button" data-status="archived" data-id="'+esc(o.id)+'">Retirer</button>':'')+(isAdmin?'<button class="btn danger" type="button" data-delete="'+esc(o.id)+'">Supprimer</button>':''):'')+'</div><div class="photos" id="photos-'+esc(o.id)+'"></div></div></article>';
}
async function loadOffers(mine){
  const grid=mine?$('#stockGrid'):$('#offersGrid'),status=mine?$('#stockStatus'):$('#offersStatus');grid.innerHTML='<div class="empty">Chargement…</div>';
  try{
    let data;
    if(isAdmin&&!mine)data=await rpc('b2b_admin_catalog',{page_number:adminPage});
    else data=await rpc('b2b_catalog',{own_only:mine});
    const rows=(data||[]);if(isAdmin&&!mine){offers=rows.slice(0,100).map(o=>({...o,prices_allowed:true}));$('#adminPager').classList.remove('hidden');$('#adminPrevious').disabled=adminPage===0;$('#adminNext').disabled=rows.length<=100;$('#adminPage').textContent='Page '+(adminPage+1)}
    else{$('#adminPager').classList.add('hidden');if(mine)stockOffers=rows;else offers=rows}
    const arr=mine?stockOffers:offers;status.textContent=mine?(arr.length+' offre'+(arr.length>1?'s':'')+' dans votre stock'):(arr.length+' offre'+(arr.length>1?'s':'')+' Pro/Pro');
    grid.innerHTML=arr.length?arr.map(o=>offerCard(o,mine)).join(''):'<div class="empty">'+(mine?'Votre stock Pro/Pro est vide.':'Aucune offre pour le moment.')+'</div>';
  }catch(e){grid.innerHTML='<div class="empty">'+esc(e.message||'Chargement impossible')+'</div>'}
}
$('#adminPrevious').onclick=()=>{if(adminPage>0){adminPage--;loadOffers(false)}};$('#adminNext').onclick=()=>{adminPage++;loadOffers(false)};

function editOffer(o){
  $('#offerForm').reset();$('#offerId').value=o?.id||'';$('#offerTitle').value=o?.title||'';$('#offerPrice').value=o?.price??'';$('#offerBasis').value=o?.price_basis||'TTC';$('#offerCity').value=o?.city||currentProfile?.city||'';$('#offerDescription').value=o?.description||'';$('#offerPhone').value=o?.contact_phone||currentProfile?.phone||'';$('#offerEmail').value=o?.contact_email||currentUser?.email||'';
  $$('input[name="priceVisibility"]').forEach(x=>x.checked=x.value===(o?.price_visibility||'request'));$$('input[name="offerAudience"]').forEach(x=>x.checked=(o?.audiences||['automobile']).includes(x.value));$('#offerHeading').textContent=o?'Modifier l’offre':'Nouvelle offre Pro/Pro';$('#offerMessage').textContent='';$('#offerForm').classList.remove('hidden');$('#offerForm').scrollIntoView({behavior:'smooth',block:'start'});
}
$('#newOffer').onclick=()=>editOffer(null);$('#newOfferStock').onclick=()=>editOffer(null);$('#cancelOffer').onclick=()=>$('#offerForm').classList.add('hidden');

$('#offerForm').onsubmit=async e=>{
  e.preventDefault();const btn=$('#offerSubmit');btn.disabled=true;$('#offerMessage').textContent='Enregistrement…';
  try{
    const files=Array.from($('#offerPhotos').files),types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};if(files.length>5)throw new Error('5 photos maximum par envoi.');if(files.some(f=>!types[f.type]||f.size>5242880||!f.size))throw new Error('Photos JPG, PNG ou WebP de 5 Mo maximum.');
    const audiences=$$('input[name="offerAudience"]:checked').map(x=>x.value);if(!audiences.length)throw new Error('Choisissez au moins une catégorie.');
    const payload={id:$('#offerId').value||null,title:$('#offerTitle').value.trim(),description:$('#offerDescription').value.trim(),price:$('#offerPrice').value,price_basis:$('#offerBasis').value,price_visibility:$('input[name="priceVisibility"]:checked')?.value||'request',city:$('#offerCity').value.trim(),audiences,contact_phone:$('#offerPhone').value.trim(),contact_email:$('#offerEmail').value.trim(),status:'draft'};
    const existing=[...offers,...stockOffers].find(o=>o.id===payload.id),adminEditingOther=!!(isAdmin&&existing&&existing.seller_id!==currentUser.id);
    let id=adminEditingOther?await rpc('b2b_save_offer_visibility',{payload:{...payload,status:'active'},admin_edit:true}):await rpc('b2b_save_offer',{payload});
    const owner=adminEditingOther?existing.seller_id:currentUser.id;
    for(const file of files){const r=await sb.storage.from('b2b-images').upload(owner+'/'+id+'/'+crypto.randomUUID()+'.'+types[file.type],file,{contentType:file.type,upsert:false});if(r.error)throw r.error}
    if(!adminEditingOther)await rpc('b2b_save_offer',{payload:{...payload,id,status:'active'}});
    $('#offerForm').classList.add('hidden');toast('Offre Pro/Pro publiée');await loadOffers(false);await loadOffers(true);
  }catch(err){$('#offerMessage').textContent=err.message||'Impossible d’enregistrer l’offre.'}finally{btn.disabled=false}
};

async function offerAction(e,source){
  const b=e.target.closest('button');if(!b)return;const arr=source==='stock'?stockOffers:offers;
  if(b.dataset.request){const o=arr.find(x=>x.seller_id===b.dataset.request);$('#requestSeller').value=o.seller_id;$('#requestHeading').textContent='Demander l’accès au vendeur '+(o.company_name||'');$('#requestMessage').textContent='';$('#requestForm').classList.remove('hidden');$('#requestForm').scrollIntoView({behavior:'smooth'});return}
  if(b.dataset.edit){editOffer(arr.find(x=>x.id===b.dataset.edit));return}
  b.disabled=true;
  try{
    if(b.dataset.delete){if(!confirm('Supprimer définitivement cette offre Pro/Pro ?'))return;await rpc('b2b_admin_delete_offer',{offer_id:b.dataset.delete});toast('Offre supprimée')}
    else if(b.dataset.status){if(!confirm(b.dataset.status==='sold'?'Marquer cette offre comme vendue ?':'Retirer cette offre ?'))return;if(isAdmin)await rpc('b2b_admin_offer_status',{offer_id:b.dataset.id,new_status:b.dataset.status});else await rpc('b2b_offer_status',{offer_id:b.dataset.id,new_status:b.dataset.status})}
    else if(b.dataset.photos){const o=arr.find(x=>x.id===b.dataset.photos),host=$('#photos-'+o.id);host.innerHTML='';const path=o.seller_id+'/'+o.id;const list=await sb.storage.from('b2b-images').list(path,{limit:100});if(list.error)throw list.error;for(const item of list.data||[]){const d=await sb.storage.from('b2b-images').download(path+'/'+item.name);if(d.error)throw d.error;const url=URL.createObjectURL(d.data);blobUrls.push(url);host.insertAdjacentHTML('beforeend','<img src="'+url+'" alt="'+esc(o.title)+'">')}return}
    await loadOffers(source==='stock');
  }catch(err){toast(err.message||'Action impossible')}finally{b.disabled=false}
}
$('#offersGrid').onclick=e=>offerAction(e,'offers');$('#stockGrid').onclick=e=>offerAction(e,'stock');

$('#cancelRequest').onclick=()=>$('#requestForm').classList.add('hidden');
$('#requestForm').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;$('#requestMessage').textContent='Envoi…';try{await rpc('b2b_request_prices',{seller:$('#requestSeller').value,activity:$('#buyerActivity').value.trim()});$('#requestForm').classList.add('hidden');toast('Demande transmise');await loadOffers(false);await loadAccess()}catch(err){$('#requestMessage').textContent=err.message||'Envoi impossible'}finally{btn.disabled=false}};

async function loadAccess(){
  $('#incoming').innerHTML='Chargement…';$('#outgoing').innerHTML='Chargement…';
  const [r1,r2]=await Promise.all([sb.from('b2b_price_access').select('*').eq('seller_id',currentUser.id).order('updated_at',{ascending:false}).limit(100),sb.from('b2b_price_access').select('*').eq('buyer_id',currentUser.id).order('updated_at',{ascending:false}).limit(100)]);
  if(r1.error||r2.error){$('#incoming').textContent='Chargement impossible.';return}
  incoming=r1.data||[];const out=r2.data||[];const pending=incoming.filter(x=>x.status==='pending').length;$('#accessBadge').textContent=pending;$('#accessBadge').classList.toggle('hidden',!pending);
  $('#incoming').innerHTML=incoming.length?incoming.map(r=>'<article class="access-card"><span class="status-pill">'+esc(accessLabels[r.status]||r.status)+'</span><h3>'+esc(r.buyer_company||'Professionnel')+'</h3><p class="note">SIRET : '+esc(r.buyer_siret||'')+'<br>Activité : '+esc(r.buyer_activity||'')+'</p><div class="toolbar">'+(r.status!=='accepted'?'<button class="btn primary" data-decision="accepted" data-buyer="'+esc(r.buyer_id)+'">Accepter</button>':'')+'<button class="btn" data-decision="rejected" data-buyer="'+esc(r.buyer_id)+'">'+(r.status==='accepted'?'Retirer l’accès':'Refuser')+'</button></div></article>').join(''):'<div class="empty">Aucune demande reçue.</div>';
  $('#outgoing').innerHTML=out.length?out.map(r=>'<article class="access-card"><strong>Vendeur · SIRET '+esc(r.seller_siret||'')+'</strong><p class="note">'+esc(accessLabels[r.status]||r.status)+'</p></article>').join(''):'<div class="empty">Aucune demande envoyée.</div>';
}
$('#refreshAccess').onclick=loadAccess;
$('#incoming').onclick=async e=>{const b=e.target.closest('[data-decision]');if(!b)return;const r=incoming.find(x=>x.buyer_id===b.dataset.buyer);if(!r)return;if(b.dataset.decision==='rejected'&&!confirm('Refuser ou retirer l’accès de ce professionnel ?'))return;b.disabled=true;try{await rpc('b2b_decide_prices',{buyer:r.buyer_id,decision:b.dataset.decision,expected_updated_at:r.updated_at});toast(b.dataset.decision==='accepted'?'Accès accordé':'Accès retiré');await loadAccess()}catch(err){toast(err.message||'Action impossible')}finally{b.disabled=false}};

async function loadRelations(){
  if(!isAdmin)return;$('#relationsList').innerHTML='Chargement…';
  try{const rows=await rpc('b2b_admin_relations',{page_number:relationsPage});$('#relationsPage').textContent='Page '+(relationsPage+1);$('#relationsPrevious').disabled=relationsPage===0;$('#relationsNext').disabled=(rows||[]).length<=100;$('#relationsList').innerHTML=(rows||[]).slice(0,100).map(r=>'<article class="access-card"><strong>'+esc(r.buyer_company||'Professionnel')+'</strong><p class="note">Acheteur : SIRET '+esc(r.buyer_siret||'')+'<br>Vendeur : SIRET '+esc(r.seller_siret||'')+'<br>Activité : '+esc(r.buyer_activity||'')+'</p><span class="status-pill">'+esc(accessLabels[r.status]||r.status)+'</span></article>').join('')||'<div class="empty">Aucune relation enregistrée.</div>'}catch(err){$('#relationsList').textContent=err.message||'Chargement impossible'}
}
$('#relationsPrevious').onclick=()=>{if(relationsPage>0){relationsPage--;loadRelations()}};$('#relationsNext').onclick=()=>{relationsPage++;loadRelations()};

let initRunning=false;
async function init(){
  if(initRunning)return;
  initRunning=true;
  try{
    const {data:{session}}=await sb.auth.getSession();currentUser=session?.user||null;
    if(!currentUser){show('#locked',true);$('#lockText').textContent='Connectez-vous avec un compte professionnel vérifié pour accéder à Entre Pro.';setStatus('Connexion requise');return}
    const p=await sb.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();currentProfile=p.data||{};
    [isProfessional,isAdmin]=await Promise.all([rpc('b2b_is_professional'),rpc('b2b_is_admin')]);
    if(!isProfessional&&!isAdmin){show('#locked',true);$('#lockText').textContent='Votre compte doit être professionnel et votre SIRET vérifié pour accéder à Entre Pro.';setStatus('Accès professionnel requis');return}
    show('#app',true);show('#locked',false);$('#relationsTab').classList.toggle('hidden',!isAdmin);setStatus(isAdmin?'Mode administrateur Entre Pro':'Compte professionnel vérifié · accès Entre Pro actif');
    await Promise.all([loadListings(),loadAccess()]);setView('catalogue');
  }catch(err){console.error(err);show('#locked',true);$('#lockText').textContent='Impossible de vérifier votre accès pour le moment.';setStatus('Erreur de chargement')}
  finally{initRunning=false}
}
sb.auth.onAuthStateChange((event,session)=>{
  // Ne jamais recharger sur INITIAL_SESSION / TOKEN_REFRESHED :
  // Safari/iPhone déclenche ces événements au chargement et cela créait une boucle infinie.
  if(event==='SIGNED_OUT'){
    currentUser=null;
    currentProfile=null;
    isAdmin=false;
    isProfessional=false;
    show('#app',false);
    show('#locked',true);
    $('#lockText').textContent='Connectez-vous avec un compte professionnel vérifié pour accéder à Entre Pro.';
    setStatus('Connexion requise');
    return;
  }
  if(event==='SIGNED_IN' && session?.user && session.user.id!==currentUser?.id){
    setTimeout(()=>init(),0);
  }
});
init();
