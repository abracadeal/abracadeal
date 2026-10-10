
// Pro/Pro V2 : prix transmis uniquement après accord du vendeur.
(()=>{
 const labels={automobile:'Automobile',transport:'Transport / VTC'};
 const statusLabels={draft:'Brouillon',active:'En ligne',sold:'Vendu',archived:'Retiré'};
 const accessLabels={pending:'En attente',accepted:'Accepté',rejected:'Refusé / retiré'};
 let userId=null,version=0,offers=[],incoming=[],mine=false,blobUrls=[],isAdmin=false,adminPage=0,relationsPage=0;
 const node=id=>document.getElementById(id);
 const values=name=>Array.from(document.querySelectorAll('input[name="'+name+'"]:checked')).map(el=>el.value);
 const show=(id,yes)=>node(id).classList.toggle('hidden',!yes);
 const msg=(id,text)=>node(id).textContent=text;
 const requireResult=result=>{if(result.error)throw result.error;return result.data;};
 const sectorText=list=>(list||[]).map(x=>labels[x]||x).join(', ');
 const errorText=error=>/PGRST202|42P01/.test(error?.code||'')?'L’espace Pro/Pro n’est pas encore activé. Réessayez après son ouverture.':error?.message||'Action impossible. Réessayez.';
 function clearBlobs(){blobUrls.forEach(URL.revokeObjectURL);blobUrls=[];}
 function clearPrivate(){version++;clearBlobs();offers=[];incoming=[];isAdmin=false;node('b2bAdminRelationsList').replaceChildren();['b2bAdminRelationsBtn','b2bAdminRelationsArea','b2bAdminPager'].forEach(id=>show(id,false));['b2bOffers','b2bIncoming','b2bOutgoing','b2bListingGrid'].forEach(id=>node(id).replaceChildren());msg('b2bListingStatus','');['b2bMarketplace','b2bOfferForm','b2bAccessArea','b2bPriceRequestForm'].forEach(id=>show(id,false));}
 async function rpc(name,args){return requireResult(await sb.rpc(name,args));}
 function same(v){return v===version&&userId===currentUser?.id;}
 let roleCheckGeneration=0;
 async function refreshAdminEntry(){
  const uid=currentUser?.id||null,generation=++roleCheckGeneration;
  b2bServerAdminUserId=null;syncB2bEntryVisibility();
  if(!uid||!sb)return;
  try{const value=await rpc('b2b_is_admin');if(generation===roleCheckGeneration&&currentUser?.id===uid){b2bServerAdminUserId=value===true?uid:null;syncB2bEntryVisibility();}}catch(_){}
 }
 window.addEventListener('abracadeal:auth',refreshAdminEntry);
 refreshAdminEntry();
 // Compteur des demandes reçues en attente, même lorsque l'espace est fermé.
 let pendingIdentity='',pendingGeneration=0;
 const pendingQueries=new Set();
 function pendingKey(){return currentUser?.id&&currentProfile?.account_type==='professionnel'&&!currentProfile?.is_admin?currentUser.id:'';}
 function paintPendingCount(count){
  for(const [buttonId,badgeId] of [['b2bNavBtn','b2bNavBadge'],['b2bAccountBtn','b2bAccountBadge']]){
   const badge=node(badgeId);badge.textContent=count>99?'99+':String(count);
   badge.classList.toggle('hidden',count===0);
   node(buttonId).setAttribute('aria-label',count?'Pro/Pro, '+count+' demande'+(count>1?'s':'')+' en attente':'Pro/Pro');
   node(buttonId).title=count?count+' demande'+(count>1?'s':'')+' d’accès aux prix en attente':'Pro/Pro';
  }
  msg('b2bAccessBtn','Demandes et accès'+(count?' ('+count+')':''));
 }
 async function refreshPendingCount(force=false){
  const key=pendingKey();
  if(key!==pendingIdentity){pendingIdentity=key;pendingGeneration++;paintPendingCount(0);}
  if(force===true)pendingGeneration++;
  if(!sb||!key||document.visibilityState==='hidden')return;
  const generation=pendingGeneration,queryKey=key+':'+generation;
  if(pendingQueries.has(queryKey))return;
  pendingQueries.add(queryKey);
  try{
   const {count,error}=await sb.from('b2b_price_access').select('buyer_id',{count:'exact',head:true}).eq('seller_id',key).eq('status','pending');
   if(error||generation!==pendingGeneration||key!==pendingKey())return;
   if(Number.isInteger(count))paintPendingCount(count);
  }catch(error){/* Conserver le dernier compteur connu lors d'une panne réseau. */}
  finally{pendingQueries.delete(queryKey);}
 }
 window.addEventListener('abracadeal:auth',refreshPendingCount);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshPendingCount();});
 setInterval(refreshPendingCount,15000);
 refreshPendingCount();
 async function load(){
  clearPrivate();userId=currentUser?.id||null;const v=version;
  if(!sb||!userId){msg('b2bStatus','Connectez-vous avec un compte professionnel pour consulter Pro/Pro.');return;}
  msg('b2bStatus','Chargement…');
  try{
   const [professional,serverAdmin]=await Promise.all([rpc('b2b_is_professional'),rpc('b2b_is_admin')]);if(!same(v))return;
   isAdmin=serverAdmin===true;b2bServerAdminUserId=isAdmin?userId:null;syncB2bEntryVisibility();
   if(!professional&&!isAdmin){msg('b2bStatus','Vérifiez et enregistrez votre SIRET dans Mon compte pour accéder à Pro/Pro.');return;}
   show('b2bMarketplace',true);show('b2bNewOffer',!!professional);show('b2bAdminRelationsBtn',isAdmin);
   msg('b2bStatus',isAdmin?'Mode administrateur : toutes les annonces Pro/Pro, tous les statuts et tous les prix sont accessibles sans accord des vendeurs.':'Chaque vendeur choisit si son prix est visible directement ou accessible sur accord. Lorsqu’un accès est accepté, contactez le vendeur pour conclure directement avec lui.');
   await Promise.all([loadProListings(),loadOffers()]);
   if(same(v))await refreshPendingCount();
  }catch(error){if(same(v))msg('b2bStatus',errorText(error));}
 }
 async function open(){location.href='pro-pro.html';}
 node('b2bNavBtn').addEventListener('click',open);node('b2bAccountBtn').addEventListener('click',open);node('b2bRefresh').addEventListener('click',load);
 window.addEventListener('abracadeal:auth',()=>{if(userId!==(currentUser?.id||null)){clearPrivate();userId=currentUser?.id||null;node('b2bPriceRequestForm').reset();node('b2bOfferForm').reset();if(node('b2bModal').classList.contains('open'))load();}});
 async function loadProListings(){
  const v=version;const grid=node('b2bListingGrid');grid.replaceChildren();msg('b2bListingStatus','Chargement des annonces Pro/Pro…');
  try{
   const {data,error}=await sb.from('listings')
    .select('id,owner_id,category,title,description,price,city,seller_type,status,source,external_id,external_url,last_synced_at,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,created_at,updated_at,show_phone,item_condition,postal_code,featured_until,promotion_tier,photo_limit,crit_air,loa_available,loa_monthly,listing_reference,archived_at,archive_reason,retention_until,visibility_scope,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value,listing_photos(id,storage_path,position)')
    .eq('status','active')
    .eq('visibility_scope','pro')
    .order('created_at',{ascending:false})
    .limit(100);
   if(error)throw error;if(!same(v))return;
   const rows=data||[];cacheDetailAds(rows);
   msg('b2bListingStatus',rows.length?rows.length+' annonce'+(rows.length>1?'s':'')+' réservée'+(rows.length>1?'s':'')+' aux professionnels.':'Aucune annonce Pro/Pro pour le moment.');
   grid.innerHTML=rows.map(a=>{
    const photos=visiblePhotosFor(a);const media=photos[0]?'<img src="'+photoUrl(photos[0].storage_path)+'" alt="'+esc(a.title||'Annonce')+'">':'<img src="'+ABRACA_DEFAULT_LISTING_PHOTO+'" alt="Abracadeal" class="abraca-default-photo">';
    return '<article class="b2b-listing-card" data-pro-listing="'+esc(a.id)+'" role="button" tabindex="0"><div class="b2b-listing-photo">'+media+'<span class="b2b-listing-badge">PRO/PRO</span></div><div class="b2b-listing-body"><div class="note">'+esc(catLabel(a.category))+'</div><h4>'+esc(a.title||'Annonce')+'</h4><div class="b2b-listing-price">'+cataloguePrice(a)+'</div><div class="b2b-listing-meta">📍 '+esc(a.city||'')+(a.postal_code?' ('+esc(a.postal_code)+')':'')+'</div></div></article>';
   }).join('');
  }catch(error){if(same(v))msg('b2bListingStatus',errorText(error));}
 }
 node('b2bListingGrid').addEventListener('click',event=>{const card=event.target.closest('[data-pro-listing]');if(card)openAd(card.dataset.proListing);});
 node('b2bListingGrid').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('[data-pro-listing]')){event.preventDefault();openAd(event.target.closest('[data-pro-listing]').dataset.proListing);}});
 async function loadOffers(){
  const v=version;clearBlobs();node('b2bOffers').replaceChildren();msg('b2bStockStats','Chargement…');
  try{
   // Ne jamais lire directement b2b_offers pour constituer le catalogue masqué.
   const adminView=isAdmin&&!mine;
   const data=await rpc(adminView?'b2b_admin_catalog':'b2b_catalog',adminView?{page_number:adminPage}:{own_only:mine});if(!same(v))return;
   offers=adminView?(data||[]).slice(0,100).map(o=>({...o,prices_allowed:true})):(data||[]);
   show('b2bAdminPager',adminView);node('b2bAdminPrevious').disabled=adminPage===0;node('b2bAdminNext').disabled=(data||[]).length<=100;msg('b2bAdminPage','Page '+(adminPage+1));
   msg('b2bStockStats',adminView?'Vue administrateur · tous les statuts · tous les prix · page '+(adminPage+1):mine?`${offers.filter(o=>o.status==='active').length} en ligne · ${offers.filter(o=>o.status==='sold').length} vendue(s) · ${offers.filter(o=>o.status==='draft').length} brouillon(s) — sur les 100 dernières offres`:'100 dernières offres Pro/Pro');
   if(!offers.length){msg('b2bOffers',mine?'Votre stock Pro/Pro est vide.':'Aucune offre pour le moment.');return;}
   node('b2bOffers').innerHTML=offers.map(o=>{const priceVisible=isAdmin||o.prices_allowed;const contactVisible=isAdmin||(o.contacts_allowed??(o.contact_phone||o.contact_email));const isOpen=o.price_visibility==='visible';const canManage=isAdmin||o.seller_id===userId;return `<article class="b2b-card"><span class="status-pill">PRO · ${esc(statusLabels[o.status])}</span><h3>${esc(o.title)}</h3><strong>${priceVisible?esc(money(o.price))+' '+esc(o.price_basis):'Prix accessible sur accord du vendeur'}</strong><p>${esc(o.company_name)} · ${esc(o.city)}</p><p class="note">${esc(sectorText(o.audiences))}${isOpen?' · Prix visible':' · Prix sur accord'}${isAdmin?' · Vue Admin':''}</p><p class="b2b-description">${esc(o.description)}</p>${contactVisible?`<p>Contact : ${esc(o.contact_phone||'—')}<br>${esc(o.contact_email||'—')}</p>`:(o.seller_id===userId?'':o.access_status?`<p class="note">${esc(accessLabels[o.access_status])}${o.access_status==='accepted'?' · Actualisez pour contrôler l’accès.':''}</p>`:`<button class="btn primary" type="button" data-b2b-request="${esc(o.seller_id)}">Demander l’accès au vendeur</button>`)}<div class="b2b-toolbar"><button class="btn ghost" type="button" data-b2b-photos="${esc(o.id)}">Voir les photos</button></div><div class="b2b-photos" id="b2bPhotos-${esc(o.id)}"></div>${canManage?`<div class="b2b-toolbar"><button class="btn ghost" type="button" data-b2b-edit="${esc(o.id)}">${isAdmin&&o.seller_id!==userId?'Modifier · Admin':'Modifier / republier'}</button>${o.status==='active'?`<button class="btn ghost" type="button" data-b2b-status="sold" data-id="${esc(o.id)}">Marquer vendu</button>`:''}${o.status!=='archived'?`<button class="btn ghost" type="button" data-b2b-status="archived" data-id="${esc(o.id)}">Retirer</button>`:''}${isAdmin?`<button class="btn ghost" style="color:#a02b45" type="button" data-b2b-delete="${esc(o.id)}">Supprimer</button>`:''}</div>`:''}</article>`}).join('');
  }catch(error){if(same(v))msg('b2bStockStats',errorText(error));}
 }
 node('b2bAllOffers').addEventListener('click',()=>{mine=false;adminPage=0;loadOffers();});node('b2bMyOffers').addEventListener('click',()=>{mine=true;adminPage=0;loadOffers();});
 node('b2bCancelRequest').addEventListener('click',()=>show('b2bPriceRequestForm',false));
 node('b2bPriceRequestForm').addEventListener('submit',async event=>{
  event.preventDefault();const btn=event.submitter,v=version;btn.disabled=true;msg('b2bRequestMessage','Envoi…');
  try{await rpc('b2b_request_prices',{seller:node('b2bRequestSeller').value,activity:node('b2bBuyerActivity').value.trim()});if(!same(v))return;show('b2bPriceRequestForm',false);await loadOffers();toast('Demande transmise au vendeur');}
  catch(error){if(same(v))msg('b2bRequestMessage',errorText(error));}finally{btn.disabled=false;}
 });
 async function loadAccess(){
  const v=version;show('b2bAccessArea',true);msg('b2bIncoming','Chargement…');msg('b2bOutgoing','Chargement…');
  try{
   const [received,sent]=await Promise.all([sb.from('b2b_price_access').select('*').eq('seller_id',userId).order('updated_at',{ascending:false}).limit(100),sb.from('b2b_price_access').select('*').eq('buyer_id',userId).order('updated_at',{ascending:false}).limit(100)]);
   if(!same(v))return;incoming=requireResult(received)||[];const outgoing=requireResult(sent)||[];
   node('b2bIncoming').innerHTML=incoming.length?incoming.map(r=>`<article class="b2b-panel"><span class="status-pill">${esc(accessLabels[r.status])}</span><h3>${esc(r.buyer_company)}</h3><p>SIRET contrôlé : ${esc(r.buyer_siret)}</p><p>Activité déclarée : ${esc(r.buyer_activity)}</p><div class="b2b-toolbar">${r.status!=='accepted'?`<button class="btn primary" type="button" data-b2b-decision="accepted" data-buyer="${esc(r.buyer_id)}">Accepter ce pro</button>`:''}<button class="btn ghost" type="button" data-b2b-decision="rejected" data-buyer="${esc(r.buyer_id)}">${r.status==='accepted'?'Retirer l’accès':'Refuser'}</button></div><p class="note b2b-decision-message" role="status"></p></article>`).join(''):'Aucune demande reçue.';
   node('b2bOutgoing').innerHTML=outgoing.length?outgoing.map(r=>`<div class="b2b-panel"><strong>Vendeur · SIRET ${esc(r.seller_siret)}</strong><p>${esc(accessLabels[r.status])}</p></div>`).join(''):'Aucune demande envoyée.';
  }catch(error){if(same(v))msg('b2bIncoming',errorText(error));}
 }
 node('b2bAccessBtn').addEventListener('click',loadAccess);
 node('b2bIncoming').addEventListener('click',async event=>{
  const btn=event.target.closest('button[data-b2b-decision]');if(!btn)return;const v=version,r=incoming.find(x=>x.buyer_id===btn.dataset.buyer);if(!r)return;
  if(btn.dataset.b2bDecision==='rejected'&&!confirm('Refuser ou retirer l’accès de ce professionnel à tous vos prix ?'))return;
  const buttons=Array.from(btn.closest('article').querySelectorAll('button'));buttons.forEach(b=>b.disabled=true);
  try{await rpc('b2b_decide_prices',{buyer:r.buyer_id,decision:btn.dataset.b2bDecision,expected_updated_at:r.updated_at});if(same(v)){await loadAccess();await refreshPendingCount(true);toast(btn.dataset.b2bDecision==='accepted'?'Ce professionnel peut voir tous vos prix':'Accès retiré');}}
  catch(error){if(same(v))btn.closest('article').querySelector('.b2b-decision-message').textContent=errorText(error);}finally{buttons.forEach(b=>b.disabled=false);}
 });
 node('b2bAdminPrevious').addEventListener('click',()=>{if(isAdmin&&adminPage>0){adminPage--;loadOffers();}});
 node('b2bAdminNext').addEventListener('click',()=>{if(isAdmin){adminPage++;loadOffers();}});
 async function loadAdminRelations(){
  if(!isAdmin)return;const v=version;show('b2bAdminRelationsArea',true);msg('b2bAdminRelationsList','Chargement…');
  try{
   const rows=await rpc('b2b_admin_relations',{page_number:relationsPage});if(!same(v))return;
   node('b2bRelationsPrevious').disabled=relationsPage===0;node('b2bRelationsNext').disabled=(rows||[]).length<=100;
   msg('b2bRelationsPage','Page '+(relationsPage+1));
   node('b2bAdminRelationsList').innerHTML=(rows||[]).slice(0,100).map(r=>`<article class="b2b-panel"><strong>${esc(r.buyer_company)}</strong><p>Acheteur : SIRET ${esc(r.buyer_siret)}<br>Vendeur : SIRET ${esc(r.seller_siret)}</p><p>Activité déclarée : ${esc(r.buyer_activity)}</p><span class="status-pill">${esc(accessLabels[r.status])}</span></article>`).join('')||'Aucune relation enregistrée.';
  }catch(error){if(same(v))msg('b2bAdminRelationsList',errorText(error));}
 }
 node('b2bAdminRelationsBtn').addEventListener('click',()=>{relationsPage=0;loadAdminRelations();});
 node('b2bRelationsPrevious').addEventListener('click',()=>{if(relationsPage>0){relationsPage--;loadAdminRelations();}});
 node('b2bRelationsNext').addEventListener('click',()=>{relationsPage++;loadAdminRelations();});
 function editOffer(o){
  node('b2bOfferForm').reset();
  for(const [id,key] of [['b2bOfferId','id'],['b2bOfferTitle','title'],['b2bOfferPrice','price'],['b2bOfferBasis','price_basis'],['b2bOfferCity','city'],['b2bOfferDescription','description'],['b2bOfferPhone','contact_phone'],['b2bOfferEmail','contact_email']])node(id).value=o?.[key]??'';
  document.querySelectorAll('input[name=b2bPriceVisibility]').forEach(el=>el.checked=el.value===(o?.price_visibility||'request'));
  node('b2bOfferSubmitBtn').textContent=(o?.price_visibility||'request')==='visible'?'Publier avec prix visible':'Publier avec prix sur accord';
  if(!o){node('b2bOfferBasis').value='TTC';node('b2bOfferCity').value=currentProfile?.city||'';node('b2bOfferPhone').value=currentProfile?.phone||'';node('b2bOfferEmail').value=currentUser?.email||'';document.querySelector('input[name=b2bPriceVisibility][value=request]').checked=true;}
  document.querySelectorAll('input[name=b2bAudience]').forEach(el=>el.checked=(o?.audiences||['automobile']).includes(el.value));
  msg('b2bOfferHeading',o?(isAdmin&&o.seller_id!==userId?'Modifier l’offre · Admin':'Modifier mon offre'):'Nouvelle offre Pro/Pro');msg('b2bOfferMessage','');show('b2bOfferForm',true);node('b2bOfferTitle').focus();
 }
 
 document.querySelectorAll('input[name=b2bPriceVisibility]').forEach(el=>el.addEventListener('change',()=>{node('b2bOfferSubmitBtn').textContent=el.checked&&el.value==='visible'?'Publier avec prix visible':'Publier avec prix sur accord';}));
 node('b2bNewOffer').addEventListener('click',()=>editOffer(null));
 node('b2bCancelOffer').addEventListener('click',()=>show('b2bOfferForm',false));
 node('b2bOfferForm').addEventListener('submit',async event=>{
  event.preventDefault();const btn=event.submitter,v=version;btn.disabled=true;msg('b2bOfferMessage','Enregistrement…');
  try{
   const files=Array.from(node('b2bOfferPhotos').files);if(files.length>5)throw new Error('Ajoutez au maximum 5 photos par envoi.');
   const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
   if(files.some(f=>!types[f.type]||f.size>5242880||!f.size))throw new Error('Photos JPG, PNG ou WebP de 5 Mo maximum.');
   const audiences=values('b2bAudience');if(!audiences.length)throw new Error('Choisissez les acheteurs autorisés.');
   const payload={id:node('b2bOfferId').value||null,title:node('b2bOfferTitle').value.trim(),description:node('b2bOfferDescription').value.trim(),price:node('b2bOfferPrice').value,price_basis:node('b2bOfferBasis').value,price_visibility:document.querySelector('input[name=b2bPriceVisibility]:checked')?.value||'request',city:node('b2bOfferCity').value.trim(),audiences,contact_phone:node('b2bOfferPhone').value.trim(),contact_email:node('b2bOfferEmail').value.trim(),status:'draft'};
   const existingOffer=payload.id?offers.find(o=>o.id===payload.id):null;
   const adminEditingOther=!!(isAdmin&&existingOffer&&existingOffer.seller_id!==userId);
   let id;
   if(adminEditingOther){
     id=await rpc('b2b_save_offer_visibility',{payload:{...payload,status:'active'},admin_edit:true});if(!same(v))return;
   }else{
     id=await rpc('b2b_save_offer',{payload});if(!same(v))return;
   }
   node('b2bOfferId').value=id;
   const photoOwner=adminEditingOther?existingOffer.seller_id:userId;
   for(const file of files){requireResult(await sb.storage.from('b2b-images').upload(photoOwner+'/'+id+'/'+crypto.randomUUID()+'.'+types[file.type],file,{contentType:file.type,upsert:false}));if(!same(v))return;}
   if(!adminEditingOther){await rpc('b2b_save_offer',{payload:{...payload,id,status:'active'}});if(!same(v))return;}
   node('b2bOfferForm').reset();show('b2bOfferForm',false);mine=false;await loadOffers();toast(adminEditingOther?'Offre Pro/Pro modifiée par Admin':'Offre privée publiée');
  }catch(error){if(same(v))msg('b2bOfferMessage',errorText(error)+' Les informations saisies sont conservées. Si un brouillon a été enregistré, il reste dans Mon stock privé.');}
  finally{btn.disabled=false;}
 });
 node('b2bOffers').addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;const v=version;
  if(button.dataset.b2bRequest){if(isAdmin){toast('Admin : accès direct, aucune demande nécessaire');return;}const offer=offers.find(o=>o.seller_id===button.dataset.b2bRequest);node('b2bRequestSeller').value=offer.seller_id;msg('b2bRequestHeading','Demander l’accès au vendeur '+offer.company_name);msg('b2bRequestMessage','');show('b2bPriceRequestForm',true);node('b2bBuyerActivity').focus();return;}
  if(button.dataset.b2bEdit){editOffer(offers.find(o=>o.id===button.dataset.b2bEdit));return;}
  button.disabled=true;
  try{
   if(button.dataset.b2bDelete){
    if(!isAdmin)return;
    if(!confirm('Supprimer définitivement cette offre Pro/Pro ?'))return;
    await rpc('b2b_admin_delete_offer',{offer_id:button.dataset.b2bDelete});if(same(v)){await loadOffers();toast('Offre Pro/Pro supprimée');}
   }else if(button.dataset.b2bStatus){
    if(!confirm(button.dataset.b2bStatus==='sold'?'Marquer cette offre comme vendue ?':'Retirer cette offre des résultats privés ?'))return;
    if(isAdmin)await rpc('b2b_admin_offer_status',{offer_id:button.dataset.id,new_status:button.dataset.b2bStatus});
    else await rpc('b2b_offer_status',{offer_id:button.dataset.id,new_status:button.dataset.b2bStatus});
    if(same(v))await loadOffers();
   }else if(button.dataset.b2bPhotos){
    const o=offers.find(o=>o.id===button.dataset.b2bPhotos);if(!o)return;
    const host=node('b2bPhotos-'+o.id);host.replaceChildren();
    const path=o.seller_id+'/'+o.id;
    const items=requireResult(await sb.storage.from('b2b-images').list(path,{limit:100}));if(!same(v))return;
    if(!items.length){host.textContent='Aucune photo.';return;}
    for(const item of items){
     const blob=requireResult(await sb.storage.from('b2b-images').download(path+'/'+item.name));if(!same(v))return;
     const url=URL.createObjectURL(blob);blobUrls.push(url);const img=document.createElement('img');img.src=url;img.alt=o.title;host.appendChild(img);
    }
   }
  }catch(error){if(same(v))toast(errorText(error));}finally{button.disabled=false;}
 });
})();


;


// Accès direct à chaque fonction ou au formulaire d'authentification.
function openProfessionalSignup(){
 window.setAuthTab('signup');
 document.getElementById('signupType').value='professionnel';
 syncSignupCompany();
 openModal('accountModal');
 // Un compte particulier peut accéder au formulaire pro sans être déconnecté automatiquement.
 professionalSignupViewerId=currentUser?.id||null;
 document.getElementById('loggedOutAccount').classList.remove('hidden');
 document.getElementById('loggedInAccount').classList.add('hidden');
 document.getElementById('signupName').focus();
}
document.querySelectorAll('[data-home-route]').forEach(link=>link.addEventListener('click',event=>{
 event.preventDefault();
 if(link.dataset.homeRoute==='publish')document.querySelector('header .publish-trigger').click();
 else if(link.dataset.homeRoute==='myads')openMyAds();
 else if(link.dataset.homeRoute==='favorites'){
  openFavorites();
 }
 else if(link.dataset.homeRoute==='messages')window.openMessages();
}));
document.querySelectorAll('[data-home-brand]').forEach(link=>link.addEventListener('click',async event=>{
 event.preventDefault();
 resetSearchFilters();
 if(currentProfile?.is_admin&&document.getElementById('moderationBtn')) setModerationButtonLabel('Modérer');

 // Retour accueil = vrai haut de page. On évite #top qui positionnait le <main>
 // sous l'en-tête et donnait l'impression que la page descendait.
 history.replaceState(null,'',location.pathname);
 window.scrollTo({top:0,left:0,behavior:'auto'});
 document.documentElement.scrollTop=0;
 document.body.scrollTop=0;

 await loadAds();

 // Certains rendus d'annonces peuvent modifier la hauteur pendant le chargement.
 // On reverrouille donc le viewport tout en haut après le rendu.
 requestAnimationFrame(()=>{
   window.scrollTo({top:0,left:0,behavior:'auto'});
   document.documentElement.scrollTop=0;
   document.body.scrollTop=0;
 });
}));
document.getElementById('b2bDiscoveryLink').addEventListener('click',event=>{
 event.preventDefault();
 if(currentUser&&(currentProfile?.account_type==='professionnel'||currentProfile?.is_admin===true||b2bServerAdminUserId===currentUser.id)){
  document.getElementById('b2bNavBtn').click();
 }else openProfessionalSignup();
});
if(location.hash==='#accountModal'){
 setTimeout(()=>{window.setAuthTab('login');openModal('accountModal');},0);
}

loadFounderOfferCounter();


;


document.addEventListener('DOMContentLoaded',()=>{
  const all=[...document.querySelectorAll('a,button,div,span,strong,p,h1,h2,h3')];
  const exact=t=>all.filter(el=>(el.textContent||'').trim()===t);
  const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);

  // One top-level "Compte" control containing both account actions.
  const create=exact('Créer un compte').find(visible);
  const login=exact('Se connecter').find(visible);
  if(false&&window.innerWidth>760&&create&&login&&create.parentElement===login.parentElement&&!document.querySelector('.abraca-account-menu')){
    const parent=create.parentElement;
    const menu=document.createElement('div'); menu.className='abraca-account-menu';
    const trigger=document.createElement('button'); trigger.type='button'; trigger.className='abraca-account-trigger'; trigger.textContent='Compte';
    const dd=document.createElement('div'); dd.className='abraca-account-dropdown';
    const c=document.createElement('button'); c.type='button'; c.textContent='Créer un compte'; c.onclick=()=>create.click();
    const l=document.createElement('button'); l.type='button'; l.textContent='Se connecter'; l.onclick=()=>login.click();
    dd.append(c,l); menu.append(trigger,dd);
    trigger.onclick=e=>{e.stopPropagation();menu.classList.toggle('open')};
    document.addEventListener('click',()=>menu.classList.remove('open'));
    parent.insertBefore(menu,create); create.style.display='none'; login.style.display='none';
  }

  // Normalize the top navigation: one Devenir hôte CTA only.
  const publish=exact('Publier une annonce').find(visible);
  if(publish&&publish.parentElement){
    const parent=publish.parentElement;
    parent.classList.add('abraca-top-actions');
    publish.classList.add('abraca-publish-top');
    publish.dataset.desktopLabel=(publish.textContent||'').trim();
    const syncPublishLabel=()=>{
      publish.textContent=window.matchMedia('(max-width:760px)').matches?'Publier':(publish.dataset.desktopLabel||'Publier une annonce');
    };
    syncPublishLabel();
    window.addEventListener('resize',syncPublishLabel,{passive:true});
    [...parent.querySelectorAll('a,button')].forEach(el=>{
      if(el===publish) return;
      const t=(el.textContent||'').trim().toLowerCase();
      if(t.includes('vacances')||t==='devenir hôte'||t==='devenir hote'||el.classList.contains('abraca-vacances-top')){
        el.remove();
      }
    });
    const a=document.createElement('a');
    a.href='espace-hote.html';
    a.className='abraca-vacances-top';
    a.textContent='Devenir hôte';
    parent.insertBefore(a,publish);
  }

  // Compact the founder card on phones without changing desktop.
  const founderTitle=all.find(el=>{
    const t=(el.textContent||'').trim().replace(/\s+/g,' ');
    return /^Professionnels\s*:\s*démarrez avec 12 mois gratuits\.?$/i.test(t);
  });
  if(founderTitle){
    founderTitle.classList.add('abraca-founder-mobile-title');
    let card=founderTitle.parentElement;
    for(let i=0;i<3&&card&&card.parentElement;i++){
      const txt=(card.innerText||'').trim();
      if(txt.length<1600) card=card.parentElement; else break;
    }
    if(card&&card!==document.body) card.classList.add('abraca-founder-mobile-card');
  }

  // Hide the four large explanatory tiles in the founder banner.
  ['1re année','2e année','Ensuite','Sans engagement','Sans engagement automatique'].forEach(label=>{
    for(const el of exact(label)){
      let box=el;
      for(let i=0;i<4&&box.parentElement;i++){
        const parent=box.parentElement;
        const txt=(parent.innerText||'').trim();
        if(txt.length<260){box=parent}else break;
      }
      if(box && box!==document.body) box.style.display='none';
    }
  });

  // Keep only the "12 mois offerts" small founder pill in the registration card.
  for(const el of all){
    const t=(el.textContent||'').trim();
    if((t.includes('-10 % la 2e année')||t.includes('–10 % la 2e année')||t.includes('Puis tarif public en vigueur')||t.includes('Sans engagement automatique'))&&t.length<90){
      el.style.display='none';
    }
  }

  // Put Pro/Pro CTA on the right.
  const pro=exact('Découvrez Pro/Pro').find(visible);
  const proBtn=all.find(el=>(el.textContent||'').trim().startsWith('Un espace dédié aux pros')&&visible(el));
  if(pro&&proBtn){
    let container=pro.parentElement;
    for(let i=0;i<4&&container;i++){
      if(container.contains(proBtn)){break}
      container=container.parentElement;
    }
    if(container){
      container.style.display='grid';
      container.style.gridTemplateColumns='minmax(0,1fr) auto';
      container.style.alignItems='center';
      container.style.gap='18px';
      proBtn.style.justifySelf='end';
    }
  }

  // Founder buttons now lead to plan selection/card registration after account setup.
  const founderButtons=[...document.querySelectorAll('a,button')].filter(el=>{
    const t=(el.textContent||'').trim().toLowerCase();
    return t==='créer un compte professionnel'||t==='profiter de l’offre fondateurs';
  });
  founderButtons.forEach((b,i)=>{
    if(i===0){
      b.addEventListener('click',e=>{
        // Keep the existing account creation flow. The Stripe step is available after signup.
        try{sessionStorage.setItem('abraca_founder_checkout_after_signup','1')}catch(_){}
      });
    }
  });
});


;


(()=>{
  let proPlanCheckBusy=false;
  let proPlanCheckoutBusy=false;

  const moneyFromCents=cents=>(Number(cents||0)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';

  // Fix 21/09/2026 : compteur "Annonces à modérer" dans le tableau de bord admin.
  // Compte les annonces pending (premiere decision) + les annonces deja publiees
  // automatiquement mais pas encore relues par un admin (deuxieme verification
  // manuelle demandee), sans jamais les depublier en attendant.
  async function refreshPendingModerationStat(){
    const card=document.getElementById('statPendingModerationCard');
    const el=document.getElementById('statPendingModeration');
    if(!el)return;
    // Réutilise refreshModerationCount() (fonction globale définie plus haut) plutôt que de
    // dupliquer les mêmes requêtes - garantit que ce chiffre et celui du bouton "Modérer"/badge
    // "Admin" du menu mobile restent toujours identiques.
    const total=await refreshModerationCount();
    if(total===null)return;
    el.textContent=String(total);
    card?.classList.toggle('has-pending',total>0);
  }
  window.refreshPendingModerationStat=refreshPendingModerationStat;

  async function loadAdminDashboardStats(){
    const panel=document.getElementById('adminStatsPanel');
    if(!panel)return;
    const isAdmin=!!currentProfile?.is_admin;
    panel.classList.toggle('hidden',!isAdmin);
    document.getElementById('adminDatabasePanel')?.classList.toggle('hidden',!isAdmin);
    if(!isAdmin)return;
    refreshPendingModerationStat();
    const {data,error}=await sb.rpc('get_admin_dashboard_stats');
    if(error){console.error('Stats Admin indisponibles',error);return}
    const stats=data||{};
    const put=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v??0)};
    put('statTotalAccounts',stats.total_accounts);
    put('statProfessionals',stats.professionals);
    put('statPrivateAccounts',stats.private_accounts);
    put('statTravelers',stats.vacation_travelers);
    put('statHosts',stats.vacation_hosts);
    put('statTrialingPros',stats.trialing_pros);
    put('statActivePros',stats.active_paid_pros);
    put('statProsToFinalize',stats.pros_to_finalize);
    put('statPlan20',stats.plan_counts?.pro_20);
    put('statPlan50',stats.plan_counts?.pro_50);
    put('statPlan100',stats.plan_counts?.pro_100);
    put('statPlan200',stats.plan_counts?.pro_200);
    put('statPlan250',stats.plan_counts?.pro_250);
    const mrr=document.getElementById('statMrr');
    if(mrr)mrr.textContent=moneyFromCents(stats.theoretical_mrr_cents||0);
  }
  window.loadAdminDashboardStats=loadAdminDashboardStats;
  document.getElementById('refreshAdminStatsBtn')?.addEventListener('click',loadAdminDashboardStats);

  function adminDbStatusLabel(row){
    if(row.status==='active')return 'En ligne';
    if(row.status==='pending')return 'À modérer';
    if(row.status==='rejected')return 'Refusée';
    if(row.status==='archived'){
      if(row.archive_reason==='sold')return 'Vendue';
      if(row.archive_reason==='user_deleted')return 'Supprimée par le vendeur';
      if(row.archive_reason==='admin_removed')return 'Retirée par l’admin';
      return 'Archivée';
    }
    return row.status||'—';
  }

  function renderAdminDbResults(rows){
    const host=document.getElementById('adminDbResults');
    if(!host)return;
    const list=Array.isArray(rows)?rows:[];
    if(!list.length){
      host.innerHTML='<div class="admin-db-empty">Aucune annonce trouvée.</div>';
      return;
    }
    host.innerHTML=list.map(row=>{
      const contact=[row.owner_phone||row.listing_phone,row.owner_email||row.listing_email].filter(Boolean);
      const archived=row.status==='archived';
      return `<article class="admin-db-card">
        <div class="admin-db-card-main">
          <div class="admin-db-card-top">
            <strong>${esc(row.title||'Annonce')}</strong>
            <span class="status-pill">${esc(adminDbStatusLabel(row))}</span>
          </div>
          <div class="admin-db-ref">${esc(row.listing_reference||row.id||'')}</div>
          <div class="admin-db-meta">${esc(row.owner_name||'Vendeur')} · ${esc(row.city||'—')}${row.postal_code?' · '+esc(row.postal_code):''}</div>
          <div class="admin-db-contact">${contact.length?contact.map(esc).join(' · '):'Coordonnées non renseignées'}</div>
          ${row.archived_at?`<div class="note">Archivée le ${new Date(row.archived_at).toLocaleString('fr-FR')}</div>`:''}
        </div>
        <div class="admin-db-actions">
          ${!archived?`<button class="btn ghost" type="button" onclick="adminDbOpenListing('${row.id}')">Voir l’annonce</button>`:''}
          ${!archived?`<button class="btn ghost admin-db-danger" type="button" onclick="adminDbArchiveListing('${row.id}')">Retirer du site</button>`:''}
        </div>
      </article>`;
    }).join('');
  }

  async function searchAdminDatabase(){
    if(!currentProfile?.is_admin)return;
    const status=document.getElementById('adminDbStatus');
    const query=document.getElementById('adminDbQuery')?.value?.trim()||'';
    const state=document.getElementById('adminDbState')?.value||'all';
    const host=document.getElementById('adminDbResults');
    if(!query){
      if(host)host.innerHTML='';
      if(status)status.textContent='Saisissez un nom, un téléphone, un e-mail ou un numéro d’annonce pour lancer une recherche.';
      return;
    }
    if(status)status.textContent='Recherche…';
    const {data,error}=await sb.rpc('admin_search_listings',{p_query:query,p_state:state,p_limit:50});
    if(error){
      console.error('Recherche base annonces',error);
      if(status)status.textContent='Recherche indisponible.';
      return;
    }
    const rows=data?.results||[];
    if(status)status.textContent=rows.length+' résultat'+(rows.length>1?'s':'');
    renderAdminDbResults(rows);
  }
  window.searchAdminDatabase=searchAdminDatabase;

  window.adminDbOpenListing=async id=>{
    let a=allAds.find(x=>x.id===id)||detailAdsCache.get(id);
    if(!a){
      const {data,error}=await sb.from('listings').select('*,listing_photos(id,storage_path,position)').eq('id',id).maybeSingle();
      if(error||!data){toast('Annonce indisponible');return;}
      a=data;detailAdsCache.set(id,a);
    }
    closeModal('accountModal');
    openAd(id);
  };

  window.adminDbArchiveListing=async id=>{
    if(!currentProfile?.is_admin)return;
    if(!confirm('Retirer cette annonce du site ? Elle restera consultable dans la base de données Admin.'))return;
    const {error}=await sb.rpc('admin_delete_listing',{p_listing_id:id});
    if(error){toast(error.message||'Impossible de retirer cette annonce');return;}
    toast('Annonce retirée du site et conservée dans la base Admin');
    await Promise.all([loadAds(),searchAdminDatabase(),loadAdminDashboardStats()]);
  };

  document.getElementById('adminDbSearchBtn')?.addEventListener('click',searchAdminDatabase);
  document.getElementById('adminDbQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchAdminDatabase();}});
  document.getElementById('adminDbState')?.addEventListener('change',()=>{
    if(document.getElementById('adminDbQuery')?.value?.trim())searchAdminDatabase();
  });

  const PRO_PLAN_EXPECTED={};
  function validateProPlans(){return true;}
  async function loadProPlans(){
    const grid=document.getElementById('proPlanGrid');
    if(grid)grid.innerHTML='<div class="note">Les tarifs détaillés sont réservés aux comptes professionnels. <a href="pro-fondateur.html">Voir les formules Pro</a>.</div>';
    const status=document.getElementById('proPlanStatus');
    if(status)status.textContent='Formules Pro disponibles après connexion.';
    return [];
  }
  async function startProPlanCheckout(){
    location.href='pro-fondateur.html';
    await loadProPlans();
  }
  async function ensureProPlanSelection(){
    try{sessionStorage.removeItem('abraca_pro_plan_pending')}catch(_){}
    if(document.getElementById('proPlanModal')?.classList.contains('open'))closeModal('proPlanModal');
    return false;
  }
  window.ensureProPlanSelection=ensureProPlanSelection;

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && document.getElementById('proPlanModal')?.classList.contains('open')){
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);

  function restoreMandatoryProPlanGate(){
    if(document.getElementById('proPlanModal')?.classList.contains('open'))closeModal('proPlanModal');
    try{sessionStorage.removeItem('abraca_pro_plan_pending')}catch(_){}
  }

  window.addEventListener('abracadeal:auth',()=>{
    setTimeout(()=>{
      loadAdminDashboardStats();
      restoreMandatoryProPlanGate();
    },80);
  });

  window.addEventListener('pageshow',()=>{
    setTimeout(restoreMandatoryProPlanGate,0);
  });
  window.addEventListener('focus',()=>{
    setTimeout(restoreMandatoryProPlanGate,0);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setTimeout(restoreMandatoryProPlanGate,0);
  });

  const qs=new URLSearchParams(location.search);
  if(qs.get('pro_subscription')==='success'){
    setTimeout(async()=>{
      try{
        await refreshAuth();
        const blocked=await ensureProPlanSelection();
        await loadAdminDashboardStats();
        if(!blocked){
          try{sessionStorage.removeItem('abraca_pro_plan_pending')}catch(_){}
          toast('Formule Pro activée');
        }
      }catch(e){console.error(e)}
      try{history.replaceState({},document.title,location.pathname+(location.hash||''))}catch{}
    },500);
  }else{
    setTimeout(()=>{loadAdminDashboardStats();ensureProPlanSelection();},700);
  }
})();


;


(()=>{
  let proBillingState=null;
  let proBillingBusy=false;
  const byId=id=>document.getElementById(id);
  const fmtDate=value=>{
    if(!value)return '—';
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('fr-FR');
  };
  const planLabels={
    pro_20:'Jusqu’à 20 annonces',
    pro_50:'Jusqu’à 50 annonces',
    pro_100:'Jusqu’à 100 annonces',
    pro_200:'Jusqu’à 200 annonces',
    pro_250:'Plus de 200 annonces (sur devis)'
  };
  const statusLabels={
    trialing:'Période gratuite',
    active:'Actif',
    past_due:'Paiement à régulariser',
    unpaid:'Impayé',
    incomplete:'À finaliser',
    incomplete_expired:'Expiré',
    paused:'En pause',
    canceled:'Résilié'
  };

  function billingStatusClass(state){
    if(!state)return '';
    if(state.cancel_at_period_end||state.status==='canceled')return 'is-cancelled';
    if(state.status==='active'||state.status==='trialing')return 'is-active';
    if(['past_due','unpaid','incomplete'].includes(state.status))return 'is-warning';
    return '';
  }

  async function loadProBillingPanel(){
    const panel=byId('proBillingPanel');
    if(!panel)return null;
    const isPro=!!currentUser&&currentProfile?.account_type==='professionnel';
    panel.classList.toggle('hidden',!isPro);
    if(!isPro){proBillingState=null;return null;}

    const intro=byId('proBillingIntro');
    const badge=byId('proBillingStatusBadge');
    const details=byId('proBillingDetails');
    const actions=byId('proBillingActions');
    const manageBtn=byId('manageProBillingBtn');
    const cancelBtn=byId('cancelProSubscriptionBtn');
    const note=byId('proBillingNote');

    if(intro)intro.textContent='Chargement de votre abonnement…';
    if(badge){badge.textContent='…';badge.className='pro-billing-status';}
    if(details)details.innerHTML='';
    actions?.classList.add('hidden');
    if(note)note.textContent='';

    try{
      const {data,error}=await sb
        .from('pro_subscriptions')
        .select('plan_code,status,source,stripe_customer_id,stripe_subscription_id,current_period_start,current_period_end,cancel_at_period_end,free_until,billing_starts_at')
        .eq('user_id',currentUser.id)
        .maybeSingle();
      if(error)throw error;
      proBillingState=data||null;

      if(!data){
        if(intro)intro.textContent='Votre formule Pro est en cours de finalisation.';
        if(badge)badge.textContent='À finaliser';
        if(details)details.innerHTML='<div class="pro-billing-detail"><span>Abonnement</span><strong>Aucun abonnement actif pour le moment</strong></div>';
        if(note)note.textContent='Dès que votre formule Stripe est validée, vous pourrez la gérer et la résilier ici.';
        return null;
      }

      const legacyScheduled=!!data.cancel_at_period_end;
      const hasCustomer=!!data.stripe_customer_id;
      const hasSubscription=!!data.stripe_subscription_id;
      const cancelled=data.status==='canceled'||legacyScheduled;
      const accessEnd=data.free_until||data.current_period_end||null;
      const billingStart=data.billing_starts_at||data.free_until||null;

      if(intro){
        intro.textContent=cancelled
          ?'Votre abonnement est résilié : aucun futur prélèvement ne sera effectué. Votre accès reste disponible jusqu’à la date indiquée.'
          :(data.status==='trialing'
            ?'Votre période gratuite est active. Vous pouvez gérer votre carte ou résilier immédiatement avant le début de la facturation.'
            :'Gérez votre moyen de paiement, vos factures et votre abonnement depuis Stripe.');
      }
      if(badge){
        badge.textContent=cancelled?'Résilié':(statusLabels[data.status]||data.status||'—');
        badge.className='pro-billing-status '+billingStatusClass(data);
      }
      if(details){
        details.innerHTML=[
          ['Formule',planLabels[data.plan_code]||data.plan_code||'—'],
          ['Statut',cancelled?'Résilié':(statusLabels[data.status]||data.status||'—')],
          ['Début de facturation',fmtDate(billingStart)],
          [cancelled?'Accès jusqu’au':'Prochaine échéance / fin de période',fmtDate(accessEnd)]
        ].map(([label,value])=>'<div class="pro-billing-detail"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('');
      }

      const canManage=hasCustomer&&data.source==='stripe';
      actions?.classList.toggle('hidden',!canManage);
      if(manageBtn)manageBtn.classList.toggle('hidden',!canManage);

      const canCancel=canManage&&hasSubscription&&!cancelled;
      if(cancelBtn){
        cancelBtn.classList.toggle('hidden',!canCancel);
        cancelBtn.disabled=false;
        cancelBtn.textContent='Résilier mon abonnement';
      }

      if(note){
        if(cancelled){
          note.textContent='La résiliation est effective côté Stripe. Aucun renouvellement ni nouveau prélèvement ne sera effectué.';
        }else if(data.status==='trialing'){
          note.textContent='Une résiliation pendant la période gratuite annule immédiatement l’abonnement Stripe et empêche tout démarrage de facturation.';
        }else if(canManage){
          note.textContent='Le portail Stripe sécurisé permet aussi de modifier la carte enregistrée et de consulter les factures.';
        }else if(data.source!=='stripe'){
          note.textContent='Ce compte Pro n’est pas facturé via Stripe.';
        }
      }
      return data;
    }catch(error){
      console.error('Abonnement Pro',error);
      proBillingState=null;
      if(intro)intro.textContent='Impossible de charger votre abonnement pour le moment.';
      if(badge){badge.textContent='Indisponible';badge.className='pro-billing-status is-warning';}
      if(note)note.textContent='Réessayez dans quelques instants.';
      return null;
    }
  }

  async function openProBillingPortal(action){
    if(proBillingBusy||!sb||!currentUser)return;
    proBillingBusy=true;
    const manageBtn=byId('manageProBillingBtn');
    const cancelBtn=byId('cancelProSubscriptionBtn');
    const clicked=action==='cancel'?cancelBtn:manageBtn;
    const oldText=clicked?.textContent||'';
    try{
      if(clicked){clicked.disabled=true;clicked.textContent=action==='cancel'?'Ouverture de la résiliation…':'Ouverture de Stripe…';}
      const {data,error}=await sb.functions.invoke('create-pro-billing-portal',{body:{action}});
      if(error){
        let detail=null;
        try{detail=await error.context?.json()}catch(_){}
        throw new Error(detail?.error||detail?.message||error.message||'Portail Stripe indisponible');
      }
      if(!data?.portal_url)throw new Error(data?.error||'Portail Stripe indisponible');
      location.href=data.portal_url;
    }catch(error){
      console.error(error);
      toast(error.message||'Impossible d’ouvrir le portail Stripe');
      await loadProBillingPanel();
    }finally{
      proBillingBusy=false;
      if(clicked&&document.body.contains(clicked)){
        clicked.disabled=false;
        clicked.textContent=action==='cancel'
          ?'Résilier mon abonnement'
          :(oldText||'Gérer mon abonnement');
      }
    }
  }

  async function handleBillingReturn(){
    const params=new URLSearchParams(location.search);
    const returned=params.get('billing_return')==='1';
    const cancelled=params.get('billing_cancelled')==='1';
    if(!returned&&!cancelled)return;
    for(let attempt=0;attempt<6;attempt++){
      const state=await loadProBillingPanel();
      if(!cancelled||state?.status==='canceled'||state?.cancel_at_period_end)break;
      await new Promise(resolve=>setTimeout(resolve,550));
    }
    toast(cancelled?'Abonnement résilié · aucun futur prélèvement':'Retour du portail Stripe');
    try{
      const url=new URL(location.href);
      url.searchParams.delete('billing_return');
      url.searchParams.delete('billing_cancelled');
      history.replaceState({},document.title,url.pathname+(url.search||'')+(url.hash||''));
    }catch(_){}
  }

  let proBillingDeepLinkRetries=0;
  async function handleBillingDeepLink(){
    const params=new URLSearchParams(location.search);
    const action=params.get('billing');
    if(!['manage','cancel'].includes(action))return;

    if(!currentUser){
      try{window.setAuthTab?.('login');openModal('accountModal');}catch(_){}
      return;
    }
    if(!currentProfile){
      if(proBillingDeepLinkRetries<8){
        proBillingDeepLinkRetries++;
        setTimeout(handleBillingDeepLink,250);
      }
      return;
    }
    if(currentProfile.account_type!=='professionnel'){
      toast('Ce lien est réservé aux comptes professionnels');
      return;
    }

    try{
      const url=new URL(location.href);
      url.searchParams.delete('billing');
      history.replaceState({},document.title,url.pathname+(url.search||'')+(url.hash||''));
    }catch(_){}

    await openProBillingPortal(action==='cancel'?'cancel':'manage');
  }

  window.loadProBillingPanel=loadProBillingPanel;
  byId('manageProBillingBtn')?.addEventListener('click',()=>openProBillingPortal('manage'));
  byId('cancelProSubscriptionBtn')?.addEventListener('click',()=>openProBillingPortal('cancel'));
  byId('accountBtn')?.addEventListener('click',()=>setTimeout(loadProBillingPanel,80));
  window.addEventListener('abracadeal:auth',()=>setTimeout(()=>{
    loadProBillingPanel();
    handleBillingReturn();
    handleBillingDeepLink();
  },120));
  setTimeout(()=>{
    handleBillingDeepLink();
    if(currentUser&&currentProfile?.account_type==='professionnel'){
      loadProBillingPanel();
      handleBillingReturn();
    }
  },700);
})();


;


(function(){
  function q(s){return document.querySelector(s)}
  const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
  const proIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>';
  function isProfessionalAccount(){
    try{return !!currentUser&&(currentProfile?.account_type==='professionnel'||currentProfile?.is_admin===true)}catch(_){return false}
  }
  function syncPrimaryMobileNav(){
    var btn=q('#mobileSearchProBtn'),label=q('#mobileSearchProLabel'),icon=q('#mobileSearchProIcon');
    if(!btn||!label||!icon)return;
    var pro=isProfessionalAccount();
    btn.dataset.mobileAction=pro?'b2b':'search';
    btn.setAttribute('aria-label',pro?'Pro/Pro':'Rechercher');
    btn.title=pro?'Pro/Pro':'Rechercher';
    label.textContent=pro?'Pro/Pro':'Rechercher';
    icon.innerHTML=pro?proIcon:searchIcon;
    if(pro)btn.classList.remove('is-active');
    else if(!document.querySelector('.mobile-nav-item.is-active'))btn.classList.add('is-active');
  }
  function clickOrHash(el,hash){
    if(el && typeof el.click==='function'){ el.click(); return; }
    if(hash) location.hash=hash;
  }
  function setActive(action){
    document.querySelectorAll('.mobile-nav-item').forEach(function(el){
      el.classList.toggle('is-active',el.getAttribute('data-mobile-action')===action);
    });
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-mobile-action]');
    if(!btn) return;
    var action=btn.getAttribute('data-mobile-action');
    if(action==='b2b'){
      e.preventDefault();
      location.href='pro-pro.html';
    }else if(action==='search'){
      e.preventDefault();
      setActive('search');
      var top=q('#top'); if(top) top.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(function(){var s=q('#searchQuery'); if(s) s.focus({preventScroll:true});},360);
    }else if(action==='favorites'){
      e.preventDefault();
      setActive('favorites');
      clickOrHash(q('[data-home-route="favorites"]'),'#resultats');
    }else if(action==='publish'){
      e.preventDefault();
      setActive('publish');
      clickOrHash(q('header .publish-trigger') || q('.publish-trigger'),'#publishModal');
    }else if(action==='messages'){
      e.preventDefault();
      setActive('messages');
      clickOrHash(q('[data-home-route="messages"]') || q('#headerMessagesBtn'),'#messagesModal');
    }else if(action==='account'){
      e.preventDefault();
      setActive('account');
      clickOrHash(q('#accountBtn'),'#accountModal');
    }
  });

  function syncUnread(){
    var src=q('#headerMessagesUnread');
    var n=src ? parseInt((src.textContent||'0').replace(/\D/g,''),10)||0 : 0;
    ['#mobileTopUnread','#mobileBottomUnread'].forEach(function(sel){
      var el=q(sel); if(!el) return;
      el.textContent=n>99?'99+':String(n);
      el.classList.toggle('show',n>0);
    });
  }
  function initUnreadObserver(){
    syncUnread();
    var src=q('#headerMessagesUnread');
    if(src && window.MutationObserver){
      new MutationObserver(syncUnread).observe(src,{subtree:true,childList:true,characterData:true,attributes:true});
    }
  }
  function initialTitle(){
    var t=q('#resultTitle');
    if(t && t.textContent.trim()==='Les annonces') t.textContent='À découvrir près de vous';
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){initUnreadObserver();initialTitle();syncPrimaryMobileNav();});
  }else{
    initUnreadObserver();initialTitle();syncPrimaryMobileNav();
  }
  window.addEventListener('abracadeal:auth',function(){
    syncUnread();
    syncPrimaryMobileNav();
  });
})();


;


(function(){
  const favoriteIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>';
  const adminIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-2.8 8.2-7 10-4.2-1.8-7-5.4-7-10V6l7-3Z"/><path d="M9 12l2 2 4-4"/></svg>';

  function isAdmin(){
    try{return !!currentProfile?.is_admin}catch(_){return false}
  }
  function navBtn(){return document.getElementById('mobileFavoritesAdminBtn')}
  function syncAdminNav(){
    const btn=navBtn(),label=document.getElementById('mobileFavoritesAdminLabel'),icon=document.getElementById('mobileFavoritesAdminIcon');
    if(!btn||!label||!icon)return;
    const admin=isAdmin();
    btn.dataset.mobileAction=admin?'admin':'favorites';
    label.textContent=admin?'Admin':'Favoris';
    icon.innerHTML=admin?adminIcon:favoriteIcon;
    syncAdminBadges();
  }
  function numberFrom(el){
    if(!el)return 0;
    const raw=el.getAttribute('data-count')||el.textContent||'0';
    return parseInt(String(raw).replace(/\D/g,''),10)||0;
  }
  function paint(id,n){
    const el=document.getElementById(id);if(!el)return;
    el.textContent=n>99?'99+':String(n);
    el.classList.toggle('show',n>0);
  }
  function syncAdminBadges(){
    if(!isAdmin()){
      paint('mobileAdminModerationBadge',0);paint('mobileAdminFlowBadge',0);paint('mobileAdminNavBadge',0);return;
    }
    const moderation=numberFrom(document.getElementById('moderationBtn'));
    const flowBadge=document.getElementById('flowErrorsBadge');
    const flows=flowBadge?.classList.contains('hidden')?0:numberFrom(flowBadge);
    paint('mobileAdminModerationBadge',moderation);
    paint('mobileAdminFlowBadge',flows);
    paint('mobileAdminNavBadge',moderation+flows);
  }
  function openAccountSection(id){
    closeModal('mobileAdminModal');
    openModal('accountModal');
    setTimeout(function(){
      const target=document.getElementById(id);
      if(target){
        target.classList.remove('hidden');
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }
      if(id==='adminStatsPanel') window.loadAdminDashboardStats?.();
      if(id==='adminDatabasePanel'){
        window.loadAdminDashboardStats?.();
        setTimeout(()=>document.getElementById('adminDbQuery')?.focus({preventScroll:true}),350);
      }
    },180);
  }

  document.addEventListener('click',function(e){
    const adminClose=e.target.closest('#mobileAdminModal [data-close="mobileAdminModal"]');
    if(adminClose || e.target?.id==='mobileAdminModal'){
      e.preventDefault();
      e.stopImmediatePropagation();
      closeModal('mobileAdminModal');
      document.querySelectorAll('.mobile-nav-item').forEach(el=>el.classList.toggle('is-active',el.getAttribute('data-mobile-action')==='search'));
      return;
    }
    const nav=e.target.closest('#mobileFavoritesAdminBtn[data-mobile-action="admin"]');
    if(nav){
      e.preventDefault();e.stopImmediatePropagation();
      if(!isAdmin()){syncAdminNav();return;}
      document.querySelectorAll('.mobile-nav-item').forEach(el=>el.classList.toggle('is-active',el===nav));
      openModal('mobileAdminModal');
      syncAdminBadges();
      return;
    }
    const action=e.target.closest('[data-admin-mobile-action]')?.getAttribute('data-admin-mobile-action');
    if(!action)return;
    e.preventDefault();
    if(!isAdmin()){closeModal('mobileAdminModal');toast('Accès administrateur requis');return;}
    if(action==='moderation'){
      closeModal('mobileAdminModal');
      location.href='moderation.html';
    }else if(action==='flows'){
      closeModal('mobileAdminModal');
      window.openAdminFlowErrors?.();
    }else if(action==='database'){
      openAccountSection('adminDatabasePanel');
    }else if(action==='stats'){
      openAccountSection('adminStatsPanel');
    }else if(action==='b2b'){
      closeModal('mobileAdminModal');
      document.getElementById('b2bNavBtn')?.click();
    }else if(action==='messages'){
      closeModal('mobileAdminModal');
      window.openMessages?.();
    }
  },true);

  function observeBadge(id){
    const el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(syncAdminBadges).observe(el,{subtree:true,childList:true,characterData:true,attributes:true});
  }
  function init(){
    syncAdminNav();
    observeBadge('moderationBtn');
    observeBadge('flowErrorsBadge');
    setTimeout(syncAdminNav,400);
    setTimeout(syncAdminBadges,900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  window.addEventListener('abracadeal:auth',()=>setTimeout(syncAdminNav,80));
})();


;


(function(){
  const params=new URLSearchParams(location.search);
  if(!params.get('admin_preview'))return;

  function backToModeration(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
      if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
    }
    location.replace('moderation.html');
  }

  document.addEventListener('click',function(event){
    const close=event.target.closest?.('#detailModal .close-btn');
    if(close)backToModeration(event);
  },true);
})();


;


(function(){
  const params=new URLSearchParams(location.search);
  if(params.get('open')!=='messages')return;
  window.addEventListener('load',function(){
    setTimeout(function(){
      const btn=document.getElementById('headerMessagesBtn') || document.querySelector('[data-home-route="messages"]');
      btn?.click();
      try{
        params.delete('open');
        const qs=params.toString();
        history.replaceState({},document.title,location.pathname+(qs?'?'+qs:'')+location.hash);
      }catch(_){}
    },700);
  },{once:true});
})();


;


(() => {
  // Fix 20/09/2026 : la barre flottante s'applique desormais a toutes les largeurs (avant :
  // mobile uniquement). Sur desktop/tablette, top/left/width sont calcules ici (pas de classe
  // media-query figee) pour se caler juste sous le header sticky, largeur d'origine conservee.
  let wrap = null;
  let placeholder = null;
  let triggerY = 0;
  let floating = false;

  function ensureRefs(){
    wrap = document.querySelector('.search-wrap');
    if (!wrap) return false;
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.className = 'sticky-search-placeholder';
      placeholder.setAttribute('aria-hidden','true');
    }
    return true;
  }

  function headerBottom(){
    const header = document.querySelector('header');
    if (!header) return 0;
    const cs = getComputedStyle(header);
    if (cs.display === 'none' || cs.position !== 'sticky') return 0;
    return Math.max(0, header.getBoundingClientRect().bottom);
  }

  function measure(){
    if (!ensureRefs() || floating) return;
    const rect = wrap.getBoundingClientRect();
    triggerY = window.scrollY + rect.top;
    placeholder.style.height = Math.ceil(rect.height) + 'px';
  }

  function isTabletMobileUi(){
    return window.matchMedia('(min-width:761px) and (max-width:1366px) and (min-height:550px) and (any-pointer:coarse)').matches;
  }

  function floatSearch(){
    if (!ensureRefs() || floating || isTabletMobileUi()) return;
    const rect = wrap.getBoundingClientRect();
    const isWide = !window.matchMedia('(max-width:760px)').matches;
    placeholder.style.height = Math.ceil(rect.height) + 'px';
    wrap.parentNode.insertBefore(placeholder, wrap);
    document.body.appendChild(wrap);
    wrap.classList.add('search-sticky-floating');
    if (isWide){
      // setProperty(...,'important') : deux feuilles de style externes chargees apres ce
      // <style> inline (assets/ui-stability-*.css, assets/banner-live-*.css, ajoutees par
      // ChatGPT) posent .search-wrap{left:auto!important} a partir de 761px. Un style inline
      // normal perd face a un !important externe quelle que soit sa specificite : il faut
      // aussi passer par !important ici pour gagner le bras de fer.
      // (Sur mobile, <=760px, on ne touche a rien : le CSS existant gere deja top/left/right
      // avec ses propres !important, calibres pour ce format compact - ne pas interferer.)
      wrap.style.setProperty('top', (headerBottom() + 12) + 'px', 'important');
      wrap.style.setProperty('left', rect.left + 'px', 'important');
      wrap.style.setProperty('width', rect.width + 'px', 'important');
    }
    floating = true;
  }

  function restoreSearch(){
    if (!ensureRefs() || !floating) return;
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(wrap, placeholder);
      placeholder.remove();
    }
    wrap.classList.remove('search-sticky-floating');
    wrap.style.removeProperty('top');
    wrap.style.removeProperty('left');
    wrap.style.removeProperty('width');
    floating = false;
    requestAnimationFrame(measure);
  }

  // Fix 20/09/2026 : barre de recherche "un peu buguee au scroll" (retour utilisateur).
  // Cause trouvee : les deux tests d'entree/sortie utilisaient exactement le meme seuil
  // (triggerY+6), donc aucune vraie zone morte n'existait entre les deux etats - au moindre
  // micro-mouvement de la molette/trackpad pile a ce pixel-la (scroll inertiel, valeurs
  // fractionnaires), la barre pouvait basculer flottante/statique plusieurs fois de suite
  // (reinsertion DOM + reflow a chaque bascule = a-coups visibles). Corrige avec deux seuils
  // separes par un vrai ecart (32px pour entrer, -10px pour sortir) : il faut scroller
  // nettement au-dela du point de bascule dans un sens comme dans l'autre pour changer d'etat.
  // Ajout aussi d'un throttle par requestAnimationFrame sur le scroll (au plus un calcul par
  // frame) pour alleger le travail pendant un scroll rapide.
  let ticking = false;

  // Fix 22/09/2026 : bug retour utilisateur ("quand on est dans le scroll et qu'on veut
  // faire une recherche ca bloque"). Cause probable : sur mobile, l'ouverture du clavier
  // virtuel apres un tap dans un champ de la barre de recherche peut a elle seule faire
  // varier window.scrollY (le navigateur ajuste la page pour garder le champ visible), ce
  // qui pouvait faire franchir le seuil et declencher floatSearch()/restoreSearch() PENDANT
  // la saisie. Or ces deux fonctions deplacent le noeud DOM de la barre (insertBefore /
  // appendChild) - deplacer un champ qui a le focus lui fait perdre ce focus (et ferme le
  // clavier) sur la plupart des navigateurs mobiles, ce qui donnait l'impression que la
  // recherche "bloquait" en pleine saisie. Corrige en suspendant tout basculement flottant/
  // statique tant qu'un champ a l'interieur de la barre a le focus.
  let searchFieldFocused = false;
  document.addEventListener('focusin', e => {
    if (e.target.closest && e.target.closest('.search-wrap')) searchFieldFocused = true;
  });
  document.addEventListener('focusout', e => {
    if (e.target.closest && e.target.closest('.search-wrap')) {
      searchFieldFocused = false;
      requestAnimationFrame(update);
    }
  });

  function update(){
    if (!ensureRefs() || searchFieldFocused) return;
    if(isTabletMobileUi()){
      if(floating)restoreSearch();
      return;
    }
    if (!floating && window.scrollY > triggerY + 32) floatSearch();
    else if (floating && window.scrollY <= triggerY - 10) restoreSearch();
  }

  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }

  function init(){
    if (!ensureRefs()) return;
    measure();
    update();
  }

  window.addEventListener('load', init, {once:true});
  window.addEventListener('pageshow', () => { requestAnimationFrame(() => { measure(); update(); }); });
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', () => {
    // Fix 22/09/2026 (v2) : bug retour utilisateur ("quand on se positionne sur la barre
    // de recherche et qu'on scroll en meme temps la barre disparait"). Cause trouvee : sur
    // mobile, taper dans un champ ouvre le clavier virtuel, ce qui declenche un evenement
    // 'resize' - or ce handler appelait restoreSearch() sans verifier searchFieldFocused
    // (contrairement a update(), corrige le 22/09 pour le meme probleme cote scroll).
    // restoreSearch() remet la barre dans le flux normal de la page ; si l'utilisateur a
    // deja scrolle bien plus bas que la position d'origine de la barre, elle se retrouve
    // hors ecran (au-dessus) - donc "disparait". Et comme le champ garde le focus,
    // searchFieldFocused reste vrai : update() (appele juste apres) refusait alors de la
    // refaire flotter, la laissant coincee hors-champ jusqu'a la perte du focus. Corrige en
    // ignorant aussi ce resize tant qu'un champ de la barre a le focus.
    if (searchFieldFocused) return;
    if (floating) restoreSearch();
    requestAnimationFrame(() => { measure(); update(); });
  });
})();


;


(()=>{
  const loginTab=document.getElementById('loginTab');
  const signupTab=document.getElementById('signupTab');
  const loginEmail=document.getElementById('loginEmail');
  const loginPassword=document.getElementById('loginPassword');

  // Passage Connexion / Créer un compte : clic piloté par JS, sans saut du document.
  loginTab?.addEventListener('click',event=>{
    event.preventDefault();
    window.setAuthTab('login');
  });
  signupTab?.addEventListener('click',event=>{
    event.preventDefault();
    window.setAuthTab('signup');
  });

  // Si l'adresse de connexion change, ne jamais conserver le mot de passe d'un autre compte.
  let lastLoginEmail=loginEmail?.value||'';
  loginEmail?.addEventListener('input',()=>{
    const next=loginEmail.value;
    if(next!==lastLoginEmail && loginPassword?.value) loginPassword.value='';
    lastLoginEmail=next;
  });

  // Sous-menus desktop : délai de fermeture pour absorber les petits écarts de souris.
  const desktop=window.matchMedia('(min-width:761px)');
  const items=[...document.querySelectorAll('.desktop-nav-item')];
  let closeTimer=null;

  const cancelClose=()=>{
    if(closeTimer){clearTimeout(closeTimer);closeTimer=null;}
  };
  const closeAll=(except=null)=>{
    items.forEach(item=>{if(item!==except)item.classList.remove('menu-open')});
  };
  const openItem=item=>{
    cancelClose();
    closeAll(item);
    item.classList.add('menu-open');
  };
  const scheduleClose=item=>{
    cancelClose();
    closeTimer=setTimeout(()=>{
      item.classList.remove('menu-open');
      closeTimer=null;
    },420);
  };

  items.forEach(item=>{
    const submenu=item.querySelector('.desktop-submenu');
    if(!submenu)return;

    const directLink=item.querySelector(':scope > .desktop-category-link');
    directLink?.addEventListener('click',event=>{
      const touchLike=window.matchMedia('(hover:none), (pointer:coarse)').matches;
      if(desktop.matches && touchLike && !item.classList.contains('menu-open')){
        event.preventDefault();
        event.stopPropagation();
        openItem(item);
      }
    });
    item.addEventListener('pointerenter',()=>{if(desktop.matches)openItem(item)});
    item.addEventListener('pointerleave',()=>{if(desktop.matches)scheduleClose(item)});
    submenu.addEventListener('pointerenter',cancelClose);
    submenu.addEventListener('pointerleave',()=>{if(desktop.matches)scheduleClose(item)});
    item.addEventListener('focusin',()=>{if(desktop.matches)openItem(item)});
    item.addEventListener('focusout',event=>{
      if(desktop.matches&&!item.contains(event.relatedTarget))scheduleClose(item);
    });
  });

  document.addEventListener('pointerdown',event=>{
    if(desktop.matches&&!event.target.closest('.desktop-nav-item'))closeAll();
  });

  window.addEventListener('resize',()=>{
    if(!desktop.matches)closeAll();
  },{passive:true});
})();


;


(function(){
  /* Fix 21/09/2026 : certaines annonces (notamment immobilier) avaient une photo enregistree
     mais dont l'URL est cassee/inaccessible (ex. domaine de test invalide) - l'ancienne version
     masquait juste la photo (display:none) et n'affichait l'etoile de secours que sur mobile,
     donc sur desktop la pastille restait vide (retour utilisateur : "les photos par defaut
     n'apparaissent pas dans les pastilles immobilier"). Desormais on bascule vers la vraie
     photo de secours Abracadeal (meme visuel que quand il n'y a aucune photo), sur toutes les
     tailles d'ecran et sur toutes les zones photo du site. */
  const selector='.ad-photo img,.home-featured-photo img,.personalized-photo img,.detail-main-photo,.detail-thumbs img,.detail-related-photo img,.b2b-listing-photo img';
  function mark(img){
    if(!img || !img.matches || !img.matches(selector)) return;
    if(img.dataset.abracaFallback) return;
    img.dataset.abracaFallback='1';
    img.onerror=null;
    img.src=(typeof ABRACA_DEFAULT_LISTING_PHOTO!=='undefined'?ABRACA_DEFAULT_LISTING_PHOTO:'assets/default-listing-photo-20260921.jpg');
    img.alt='Abracadeal';
    img.classList.add('abraca-default-photo');
    const box=img.parentElement;
    // Fix 22/09/2026 : .remove() supprimait le filigrane pour de bon, l'empechant de revenir
    // meme si une navigation ulterieure (carousel/miniatures) affiche une vraie photo qui charge.
    if(box){const wm=box.querySelector('.photo-watermark');if(wm)wm.classList.add('hidden');}
  }
  document.addEventListener('error',function(e){ mark(e.target); },true);
  function sweep(){
    document.querySelectorAll(selector).forEach(function(img){
      if(img.complete && img.naturalWidth===0) mark(img);
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',sweep,{once:true});
  }else{
    sweep();
  }
  new MutationObserver(sweep).observe(document.documentElement,{childList:true,subtree:true});
})();


;


(() => {
  const icon = {
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>',
    vacations:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16"></path><path d="M7 17c1.2-3.4 2.9-5.4 5-6"></path><path d="M12 11c2.3.3 4.2 1.6 5.5 4"></path><path d="M12 11V5"></path><path d="M9 7c1.1-1.5 2-2.2 3-2"></path><path d="M15 7c-1.1-1.5-2-2.2-3-2"></path></svg>',
    heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 1 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"></path></svg>',
    messages:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path><path d="M8 9h8M8 13h5"></path></svg>',
    account:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg>'
  };

  function visibleDesktop(){
    return window.matchMedia('(min-width:1024px)').matches;
  }
  function original(sel){
    return document.querySelector(sel);
  }
  function clickOriginal(selectors){
    for(const sel of selectors){
      const el=original(sel);
      if(el){
        try{ el.click(); return true; }catch(_){}
      }
    }
    return false;
  }
  function openModal(id){
    const modal=document.getElementById(id);
    if(!modal) return false;
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('show','open','active');
    if(getComputedStyle(modal).display==='none') modal.style.display='flex';
    return true;
  }
  function make(tag, cls, label, svg){
    const el=document.createElement(tag);
    if(tag==='button') el.type='button';
    el.className='abraca-dnav-item '+cls;
    el.setAttribute('aria-label',label);
    el.innerHTML=svg+'<span>'+label+'</span>';
    return el;
  }

  function syncAccountLabel(){
    const target=document.querySelector('.abraca-desktop-actions-v2 .abraca-dnav-account span');
    if(!target) return;
    const source=document.querySelector('#accountBtnLabel');
    const label=(source?.textContent||'Connexion').trim()||'Connexion';
    target.textContent=label;
    const account=document.querySelector('.abraca-desktop-actions-v2 .abraca-dnav-account');
    if(account) account.setAttribute('aria-label',label);
  }

  function syncBadge(){
    const target=document.querySelector('.abraca-desktop-actions-v2 .abraca-dnav-messages .abraca-dnav-badge');
    if(!target) return;
    const source=document.querySelector('#accountBtn .account-unread-badge, #headerMessagesBtn .unread-badge, .messages-unread-badge');
    const txt=source && !source.classList.contains('hidden') ? (source.textContent||'').trim() : '';
    target.textContent=txt;
  }

  function cleanupLegacyDesktopActions(){
    document.querySelectorAll('header .header-vacances-btn, header .abraca-vacances-top').forEach(el=>el.remove());
  }

  function build(){
    if(!visibleDesktop()){
      /* Retour tablette/mobile (ex: rotation d'iPad) : retirer la barre d'icones
         desktop pour ne pas la laisser affichee en double avec les boutons tablette. */
      const existingBar=document.querySelector('header .nav-actions .abraca-desktop-actions-v2');
      if(existingBar) existingBar.remove();
      return;
    }
    cleanupLegacyDesktopActions();
    const actions=document.querySelector('header .nav-actions');
    if(!actions || actions.querySelector('.abraca-desktop-actions-v2')){ syncBadge(); syncAccountLabel(); return; }

    const bar=document.createElement('nav');
    bar.className='abraca-desktop-actions-v2';
    bar.setAttribute('aria-label','Navigation rapide');

    const fav=make('button','abraca-dnav-favorites','Favoris',icon.heart);
    fav.addEventListener('click',()=>{
      if(!clickOriginal(['.desktop-favorites-btn','#favoritesBtn','#headerFavoritesBtn'])){
        const target=[...document.querySelectorAll('button,a')].find(el=>/favoris/i.test((el.getAttribute('aria-label')||'')+' '+(el.textContent||'')) && !el.closest('.abraca-desktop-actions-v2'));
        if(target) try{target.click()}catch(_){}
      }
    });

    const msg=make('button','abraca-dnav-messages','Messages',icon.messages);
    const badge=document.createElement('i');
    badge.className='abraca-dnav-badge';
    badge.setAttribute('aria-hidden','true');
    msg.appendChild(badge);
    msg.addEventListener('click',()=>{
      if(!clickOriginal(['#headerMessagesBtn','#messagesBtn','.header-messages-btn'])) openModal('messagesModal');
    });

    const acct=make('button','abraca-dnav-account','Compte',icon.account);
    acct.addEventListener('click',()=>{
      if(!clickOriginal(['#accountBtn','.abraca-account-trigger','#loginBtn','#signupBtn'])) openModal('accountModal');
    });

    bar.append(fav,msg,acct);
    actions.appendChild(bar);
    syncBadge();
    syncAccountLabel();

    const accountLabelSource=document.querySelector('#accountBtnLabel');
    if(accountLabelSource && window.MutationObserver){
      new MutationObserver(syncAccountLabel).observe(accountLabelSource,{subtree:true,childList:true,characterData:true});
    }

    const source=document.querySelector('#accountBtn .account-unread-badge, #headerMessagesBtn .unread-badge, .messages-unread-badge');
    if(source && window.MutationObserver){
      new MutationObserver(syncBadge).observe(source,{subtree:true,childList:true,attributes:true,characterData:true});
    }
  }

  const start=()=>{
    build();
    requestAnimationFrame(build);
    setTimeout(build,120);
    setTimeout(build,700);
    const header=document.querySelector('header');
    if(header && window.MutationObserver){
      new MutationObserver(()=>cleanupLegacyDesktopActions()).observe(header,{childList:true,subtree:true});
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('resize',build,{passive:true});
})();
