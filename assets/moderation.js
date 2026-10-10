
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const SUPABASE_AUTH_STORAGE_KEY='sb-jplzvxmpbpjssyinozap-auth-token';
const storage={
  getItem(k){try{return localStorage.getItem(k)||sessionStorage.getItem(k)}catch{return null}},
  setItem(k,v){try{localStorage.setItem(k,v)}catch{} try{sessionStorage.setItem(k,v)}catch{}},
  removeItem(k){try{localStorage.removeItem(k)}catch{} try{sessionStorage.removeItem(k)}catch{}}
};
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage,storageKey:SUPABASE_AUTH_STORAGE_KEY}});
const $=s=>document.querySelector(s);
const state={tab:'pending',rows:[],mods:new Map(),profiles:new Map(),busy:false,selected:new Set(),photoUrls:new Map(),reports:new Map()};

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function money(v){return v===null||v===''?'Prix non renseigné':Number(v).toLocaleString('fr-FR')+' €'}
function cat(v){return ({vehicules:'Véhicules',immobilier:'Immobilier',vacances:'Vacances',hightech:'High-tech',maison:'Maison',mode:'Mode',emploi:'Emploi',services:'Services',autres:'Autres'})[v]||v||'Annonce'}
function ago(v){if(!v)return'';const d=Date.now()-new Date(v).getTime(),h=Math.floor(d/3600000);if(h<1)return"À l'instant";if(h<24)return'Il y a '+h+' h';const j=Math.floor(h/24);return'Il y a '+j+' j'}
function photoUrl(path){return state.photoUrls.get(path)||'assets/default-listing-photo-20260921.jpg'}
function firstPhoto(a){return [...(a.listing_photos||[])].sort((x,y)=>(x.position||0)-(y.position||0))[0]?.storage_path||''}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
function setStatus(t){$('#status').textContent=t}
function setBusy(v){state.busy=v;document.querySelectorAll('.action').forEach(b=>b.disabled=v);updateBulkUI()}
function updateBulkUI(){
  const history=state.tab==='validated'||state.tab==='rejected';
  $('#bulkbar').hidden=!history;
  if(!history)return;
  const ids=state.rows.map(x=>x.id);
  const n=ids.filter(id=>state.selected.has(id)).length;
  $('#selectionCount').textContent='('+n+'/'+ids.length+')';
  $('#selectAll').checked=ids.length>0&&n===ids.length;
  $('#selectAll').indeterminate=n>0&&n<ids.length;
  $('#selectAll').disabled=state.busy||!ids.length;
  $('#bulkDelete').disabled=state.busy||!n;
  $('#bulkDelete').textContent=state.tab==='validated'?'Retirer de la liste ('+n+')':'Supprimer ('+n+')';
}

function riskMarkup(a){
  const m=state.mods.get(a.id);
  if(a.status==='pending'&&m?.retry_exhausted&&!m?.ai_checked)return '<span class="chip gray">⚠ Analyse impossible</span>';
  if(!m)return '<span class="chip gray">⚪ Analyse en attente</span>';
  const level=['green','orange','red'].includes(m.risk_level)?m.risk_level:'gray';
  const icon=level==='green'?'🟢':level==='orange'?'🟠':level==='red'?'🔴':'⚪';
  const label=level==='green'?'Risque faible':level==='orange'?'À vérifier':level==='red'?'Risque élevé':'Analyse';
  return '<span class="chip '+level+'">'+icon+' '+label+' · '+Number(m.risk_score||0)+'/100</span>';
}
function reasonsMarkup(a){
  const m=state.mods.get(a.id),reasons=Array.isArray(m?.reasons)?m.reasons.filter(Boolean).slice(0,3):[];
  if(!reasons.length)return'';
  return '<div class="reasons">'+reasons.map(x=>'<div>• '+esc(x)+'</div>').join('')+'</div>';
}
function retryErrorMarkup(a){
 const m=state.mods.get(a.id);
 if(a.status!=='pending'||!m?.retry_exhausted||m?.ai_checked)return '';
 return '<div class="analysis-impossible" role="status"><strong>Analyse impossible</strong><div>Limite de 10 relances automatiques atteinte.</div><div>Dernière erreur : '+esc(m.retry_last_error||m.ai_error||'Réponse indisponible')+'</div></div>';
}
function sellerName(a){const p=state.profiles.get(a.owner_id);return p?.display_name|| (a.seller_type==='professionnel'?'Professionnel':'Particulier')}
function isSecondCheck(a){const m=state.mods.get(a.id);return a.status==='active'&&m?.auto_published===true&&m?.admin_reviewed!==true}
function needsEditReview(a){const m=state.mods.get(a.id);return m?.edit_review_pending===true&&m?.admin_reviewed!==true}

function card(a){
  const pending=state.tab==='pending'||(state.tab==='reference'&&(a.status==='pending'||isSecondCheck(a)||needsEditReview(a)));
  const red=state.mods.get(a.id)?.risk_level==='red';
  const validated=state.tab==='validated';
  const p=photoUrl(firstPhoto(a));
  const statusChip=(state.tab==='reference'?'<span class="chip gray">'+esc(({pending:'À modérer',active:'En ligne',hidden:'Masquée',rejected:'Refusée',archived:'Archivée',sold:'Vendue'})[a.status]||a.status)+'</span>':'')+(a.revision_of?'<span class="chip orange">Modification proposée · ancienne version conservée</span>':'')+(pending&&needsEditReview(a)?'<span class="chip orange">✎ Annonce modifiée · à revalider</span>':'')+(pending&&isSecondCheck(a)?'<span class="chip live">Déjà en ligne · à revérifier</span>':validated?'<span class="chip green">✓ Validée</span>':state.tab==='rejected'?'<span class="chip red">✕ Refusée</span>':'');
  const preview='<div class="preview-row"><button class="preview-link" type="button" data-preview-id="'+a.id+'">Voir l’annonce complète</button></div>';
  const actions=pending
    ? '<div class="actions"><button class="action ok" data-action="validate" data-id="'+a.id+'">✓ Valider</button><button class="action no" data-action="reject" data-id="'+a.id+'">✕ Refuser</button><button class="action delete" data-action="delete" data-id="'+a.id+'">Supprimer</button></div>'
    : validated
      ? '<div class="history-actions"><button class="action delete" data-action="dismiss" data-id="'+a.id+'">Supprimer de la liste</button></div>'
      : '<div class="history-actions"><button class="action delete" data-action="delete" data-id="'+a.id+'">Supprimer</button></div>';
  return '<article class="card">'+
    (!pending&&state.tab!=='reference'?'<label class="card-select"><input type="checkbox" data-select-id="'+esc(a.id)+'" '+(state.selected.has(a.id)?'checked':'')+'> Sélectionner</label>':'')+
    '<div class="card-main">'+
      '<div class="photo"><img '+(red?'class="sensitive-photo" data-reveal-photo tabindex="0" role="button" aria-label="Afficher cette photo sensible" ':'')+'src="'+esc(p)+'" alt="" onerror="this.src=\'assets/default-listing-photo-20260921.jpg\'">'+(a.seller_type==='professionnel'?'<span class="pro">PRO</span>':'')+'</div>'+
      '<div class="info"><div class="rowtop"><h2 class="title">'+esc(a.title||'Annonce')+'</h2><span class="when">'+esc(ago(a.created_at))+'</span></div>'+
      '<div class="meta">'+esc(cat(a.category))+(a.city?' · '+esc(a.city):'')+(a.postal_code?' ('+esc(a.postal_code)+')':'')+'</div>'+
      (a.listing_reference?'<div class="meta">Référence : '+esc(a.listing_reference)+'</div>':'')+
      '<div class="price">'+esc(money(a.price))+'</div>'+
      '<div class="seller">'+esc(sellerName(a))+'</div></div>'+
    '</div>'+
    '<div class="review-state">'+riskMarkup(a)+statusChip+'</div>'+
    (Number(state.mods.get(a.id)?.reused_photo_count)>0?'<div class="photo-reuse-alert">⚠ '+Number(state.mods.get(a.id).reused_photo_count)+' photo(s) réutilisée(s) par un autre compte · +30 points</div>':'')+retryErrorMarkup(a)+reasonsMarkup(a)+(state.reports.has(a.id)?'<div class="reasons">'+state.reports.get(a.id)+' signalement(s)'+(a.status==='hidden'?' · Masquée':'')+'</div>':'')+preview+actions+'<button class="action no" data-action="pharos" data-id="'+a.id+'">Signaler à Pharos</button>'+
  '</article>';
}

function cleanDescription(a){
  return String(a?.description||'')
    .replace(/^\[ABRACA_[A-Z]+:[^\]]+\]\s*/gm,'')
    .trim();
}
function previewSpecs(a){
  const rows=[];
  const add=(label,value)=>{if(value!==null&&value!==undefined&&String(value).trim()!=='')rows.push([label,String(value)])};
  if(a.category==='vehicules'){
    add('Marque',a.vehicle_make);
    add('Modèle',a.vehicle_model);
    add('Année',a.vehicle_year);
    add('Kilométrage',a.mileage!==null&&a.mileage!==undefined?Number(a.mileage).toLocaleString('fr-FR')+' km':'');
    add('Carburant',a.fuel);
    add('Boîte',a.transmission);
    add('Crit’Air',a.crit_air);
    if(a.loa_available||a.loa_monthly)add('LOA',a.loa_monthly?Number(a.loa_monthly).toLocaleString('fr-FR')+' €/mois':'Oui');
  }else{
    add('État',a.item_condition);
  }
  add('Référence',a.listing_reference);
  return rows;
}
function closePreview(){
  const modal=$('#previewModal');
  modal.hidden=true;
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  $('#previewBody').innerHTML='';
  $('#previewActions').innerHTML='';
}
function openPreview(id){
  const a=state.rows.find(x=>x.id===id);
  if(!a)return;
  const modal=$('#previewModal');
  const photos=[...(a.listing_photos||[])].sort((x,y)=>(x.position||0)-(y.position||0));
  const gallery=photos.length
    ? '<div class="preview-gallery">'+photos.map(p=>'<img '+(state.mods.get(a.id)?.risk_level==='red'?'class="sensitive-photo" data-reveal-photo tabindex="0" role="button" aria-label="Afficher cette photo sensible" ':'')+'src="'+esc(photoUrl(p.storage_path))+'" alt="" onerror="this.src=\'assets/default-listing-photo-20260921.jpg\'">').join('')+'</div>'
    : '<div class="preview-gallery"><img src="assets/default-listing-photo-20260921.jpg" alt="Abracadeal"></div>';
  const specs=previewSpecs(a);
  const m=state.mods.get(a.id);
  const reasons=Array.isArray(m?.reasons)?m.reasons.filter(Boolean):[];
  const profile=state.profiles.get(a.owner_id);
  $('#previewBody').innerHTML=
    gallery+
    '<div class="preview-content">'+
      '<div class="preview-kicker">'+esc(cat(a.category))+' · '+esc(a.seller_type==='professionnel'?'Professionnel':'Particulier')+'</div>'+
      '<h2 class="preview-title">'+esc(a.title||'Annonce')+'</h2>'+
      '<div class="preview-price">'+esc(money(a.price))+'</div>'+
      '<div class="preview-location">📍 '+esc(a.city||'')+(a.postal_code?' ('+esc(a.postal_code)+')':'')+'</div>'+
      (specs.length?'<section class="preview-section"><h3>Informations de l’annonce</h3><div class="preview-spec-grid">'+specs.map(x=>'<div class="preview-spec"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('')+'</div></section>':'')+
      '<section class="preview-section"><h3>Description</h3><div class="preview-description">'+esc(cleanDescription(a)||'Aucune description.')+'</div></section>'+
      '<section class="preview-section"><h3>Vendeur</h3><div class="preview-seller"><strong>'+esc(profile?.display_name||sellerName(a))+'</strong><br>'+esc(profile?.city||a.city||'')+(a.contact_email?'<br>'+esc(a.contact_email):'')+(a.phone?'<br>'+esc(a.phone):'')+'</div></section>'+
      '<section class="preview-section"><h3>Contrôle</h3><div class="review-state" style="margin:0">'+riskMarkup(a)+(needsEditReview(a)?'<span class="chip orange">✎ Annonce modifiée · à revalider</span>':'')+(isSecondCheck(a)?'<span class="chip live">Déjà en ligne · à revérifier</span>':'')+'</div>'+retryErrorMarkup(a)+(reasons.length?'<div class="reasons" style="margin:10px 0 0">'+reasons.map(x=>'<div>• '+esc(x)+'</div>').join('')+'</div>':'')+'</section>'+
    '</div>';
  const pending=state.tab==='pending'||(state.tab==='reference'&&(a.status==='pending'||isSecondCheck(a)||needsEditReview(a)));
  if(pending){
    $('#previewActions').innerHTML=
      '<button class="action ok" data-action="validate" data-id="'+a.id+'">✓ Valider</button>'+
      '<button class="action no" data-action="reject" data-id="'+a.id+'">✕ Refuser</button>'+
      '<button class="action delete" data-action="delete" data-id="'+a.id+'">Supprimer</button>';
  }else if(state.tab==='validated'){
    $('#previewActions').innerHTML='<button class="action delete" data-action="dismiss" data-id="'+a.id+'">Supprimer de la liste</button>';
    $('#previewActions').style.gridTemplateColumns='1fr';
  }else{
    $('#previewActions').innerHTML='<button class="action delete" data-action="delete" data-id="'+a.id+'">Supprimer</button>';
    $('#previewActions').style.gridTemplateColumns='1fr';
  }
  $('#previewActions').innerHTML+='<button class="action no" data-action="pharos" data-id="'+a.id+'">Signaler à Pharos</button>';
  if(pending)$('#previewActions').style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
  modal.hidden=false;
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}

async function loadProfiles(rows){
  const ids=[...new Set(rows.map(x=>x.owner_id).filter(Boolean))];
  state.profiles.clear();
  if(!ids.length)return;
  const {data}=await sb.from('public_profiles').select('id,display_name,account_type,city').in('id',ids);
  (data||[]).forEach(p=>state.profiles.set(p.id,p));
}
async function loadMods(ids){
  state.mods.clear();
  if(!ids.length)return;
  const {data,error}=await sb.from('listing_moderation').select('listing_id,risk_score,risk_level,reasons,checked_at,engine,ai_checked,ai_error,auto_published,admin_reviewed,edit_review_pending,reused_photo_count,hidden_from_admin_history,reviewed_at,reviewed_by').in('listing_id',ids);
  if(error)console.warn(error);
  (data||[]).forEach(m=>state.mods.set(m.listing_id,m));
  const retries=await sb.rpc('admin_moderation_retry_status',{p_listing_ids:ids});
  if(retries.error)throw retries.error;
  (retries.data||[]).forEach(r=>state.mods.set(r.listing_id,{...(state.mods.get(r.listing_id)||{}),...r}));
}

async function pendingRows(){
  const {data:pending,error}=await sb.from('listings').select('*,listing_photos(id,storage_path,storage_bucket,position)').eq('status','pending').order('created_at',{ascending:false});
  if(error)throw error;
  const {data:autoMods,error:autoErr}=await sb.from('listing_moderation').select('listing_id').eq('auto_published',true).or('admin_reviewed.is.null,admin_reviewed.eq.false');
  if(autoErr)throw autoErr;
  const ids=(autoMods||[]).map(x=>x.listing_id).filter(Boolean);
  let active=[];
  if(ids.length){
    const r=await sb.from('listings').select('*,listing_photos(id,storage_path,storage_bucket,position)').in('id',ids).eq('status','active').order('created_at',{ascending:false});
    if(r.error)throw r.error; active=r.data||[];
  }
  const seen=new Set((pending||[]).map(x=>x.id));
  return [...(pending||[]),...active.filter(x=>!seen.has(x.id))];
}
async function validatedRows(){
  const {data:mods,error}=await sb.from('listing_moderation').select('listing_id,reviewed_at').eq('admin_reviewed',true).eq('hidden_from_admin_history',false).order('reviewed_at',{ascending:false}).limit(150);
  if(error)throw error;
  const ids=(mods||[]).map(x=>x.listing_id).filter(Boolean);
  if(!ids.length)return[];
  const {data,error:e}=await sb.from('listings').select('*,listing_photos(id,storage_path,storage_bucket,position)').in('id',ids).eq('status','active');
  if(e)throw e;
  const order=new Map((mods||[]).map((m,i)=>[m.listing_id,i]));
  return (data||[]).sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));
}
async function rejectedRows(){
  const {data,error}=await sb.from('listings').select('*,listing_photos(id,storage_path,storage_bucket,position)').eq('status','rejected').order('updated_at',{ascending:false}).limit(150);
  if(error)throw error;return data||[];
}

async function loadPhotoUrls(rows){
  state.photoUrls.clear();
  await Promise.all(rows.flatMap(a=>a.listing_photos||[]).map(async p=>{
    if(/^https?:\/\//i.test(p.storage_path)){state.photoUrls.set(p.storage_path,p.storage_path);return;}
    const {data,error}=await sb.storage.from(p.storage_bucket||'listing-images').createSignedUrl(p.storage_path,600);
    if(!error&&data?.signedUrl)state.photoUrls.set(p.storage_path,data.signedUrl);
  }));
}
async function loadReports(){
  const {data,error}=await sb.from('reports').select('listing_id,reporter_id,status');
  if(error)throw error;
  state.reports.clear();
  const reporters=new Map();
  for(const r of data||[]){
    if(r.status==='dismissed'||!r.listing_id)continue;
    if(!reporters.has(r.listing_id))reporters.set(r.listing_id,new Set());
    if(r.reporter_id)reporters.get(r.listing_id).add(r.reporter_id);
  }
  for(const [id,set] of reporters)state.reports.set(id,set.size);
  $('#countReported').textContent=state.reports.size;
}
async function reportedRows(){
  const ids=[...state.reports.keys()];
  if(!ids.length)return [];
  const {data,error}=await sb.from('listings').select('*,listing_photos(id,storage_path,storage_bucket,position)').in('id',ids).order('updated_at',{ascending:false});
  if(error)throw error;return data||[];
}

async function refreshCounts(){
  const p=await pendingRows();
  $('#countPending').textContent=p.length>99?'99+':p.length;
  const {data:mods}=await sb.from('listing_moderation').select('listing_id').eq('admin_reviewed',true).eq('hidden_from_admin_history',false).limit(500);
  const ids=(mods||[]).map(x=>x.listing_id);
  let valid=0;
  if(ids.length){
    const r=await sb.from('listings').select('id',{count:'exact',head:true}).in('id',ids).eq('status','active');
    valid=Number(r.count||0);
  }
  $('#countValidated').textContent=valid>99?'99+':valid;
  const rr=await sb.from('listings').select('id',{count:'exact',head:true}).eq('status','rejected');
  const rejected=Number(rr.count||0);
  $('#countRejected').textContent=rejected>99?'99+':rejected;
}

function listingReferenceQuery(value){
  const compact=String(value||'').trim().toUpperCase().replace(/[\s–—]/g,'').replace(/-/g,'');
  const match=compact.match(/^ABR(\d{4})(\d{8,})$/);
  return match?'ABR-'+match[1]+'-'+match[2]:'';
}
async function referenceRows(){
  const reference=listingReferenceQuery($('#referenceSearch').value);
  if(!reference)return [];
  const {data,error}=await sb.from('listings').select('*,listing_photos(id,storage_path,storage_bucket,position)').eq('listing_reference',reference);
  if(error)throw error;return data||[];
}
$('#referenceSearchForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(state.busy)return;
  if(!listingReferenceQuery($('#referenceSearch').value)){toast('Saisissez une référence complète, par exemple ABR-2026-00000001.');return;}
  state.tab='reference';
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  await load();
});

async function load(){
  if(state.busy)return;
  setStatus('Chargement…');
  $('#list').innerHTML='';
  try{
    await loadReports();
    let rows=state.tab==='reference'?await referenceRows():state.tab==='pending'?await pendingRows():state.tab==='validated'?await validatedRows():state.tab==='reported'?await reportedRows():await rejectedRows();
    state.rows=rows;
    state.selected.clear();
    updateBulkUI();
    await Promise.all([loadProfiles(rows),loadMods(rows.map(x=>x.id)),loadPhotoUrls(rows)]);
    $('#list').innerHTML=rows.length?rows.map(card).join(''):'<div class="empty">'+(state.tab==='reference'?'Aucune annonce avec cette référence.':'Aucune annonce dans cette section.')+'</div>';
    setStatus(rows.length+' annonce'+(rows.length>1?'s':'')+(state.tab==='pending'?' à traiter':''));
    updateBulkUI();
    refreshCounts().catch(console.warn);
  }catch(err){
    console.error(err);setStatus('Impossible de charger cette section.');$('#list').innerHTML='<div class="empty">Une erreur est survenue pendant le chargement.</div>';
  }
}

async function removeListing(id){
  const {data:photos}=await sb.from('listing_photos').select('storage_path,storage_bucket').eq('listing_id',id);
  const paths=(photos||[]).map(x=>x.storage_path).filter(Boolean);
  for(const bucket of ['listing-images','listing-images-pending']){const paths=(photos||[]).filter(p=>(p.storage_bucket||'listing-images')===bucket&&!/^https?:\/\//i.test(p.storage_path)).map(p=>p.storage_path);if(paths.length){const r=await sb.storage.from(bucket).remove(paths);if(r.error)throw r.error}}
  const {error}=await sb.rpc('admin_delete_listing',{p_listing_id:id});
  if(error)throw error;
}

$('#selectAll').addEventListener('change',e=>{
  if(state.busy)return;
  state.selected.clear();
  if(e.target.checked)state.rows.forEach(a=>state.selected.add(a.id));
  document.querySelectorAll('[data-select-id]').forEach(input=>input.checked=e.target.checked);
  updateBulkUI();
});
document.addEventListener('change',e=>{
  const input=e.target.closest('[data-select-id]');
  if(!input||state.busy)return;
  if(input.checked)state.selected.add(input.dataset.selectId);
  else state.selected.delete(input.dataset.selectId);
  updateBulkUI();
});
$('#bulkDelete').addEventListener('click',async()=>{
  if(state.busy||!['validated','rejected'].includes(state.tab))return;
  const tab=state.tab;
  const ids=state.rows.map(a=>a.id).filter(id=>state.selected.has(id));
  if(!ids.length)return;
  const message=tab==='validated'
    ? 'Retirer '+ids.length+' annonce(s) de la liste Validées ? Elles resteront publiées sur le site.'
    : 'Supprimer définitivement '+ids.length+' annonce(s) refusée(s) du site ? Cette action est irréversible.';
  if(!confirm(message))return;
  setBusy(true);
  let done=0;
  try{
    for(const id of ids){
      try{
        if(tab==='validated'){
          const {error}=await sb.rpc('dismiss_validated_from_moderation',{p_listing_id:id});
          if(error)throw error;
        }else await removeListing(id);
        done++;
        state.selected.delete(id);
      }catch(err){console.error('Suppression groupée',id,err)}
    }
    toast(done===ids.length?done+' annonce(s) traitée(s)':done+'/'+ids.length+' annonce(s) traitée(s) — vérifiez les autres');
  }finally{
    setBusy(false);
    await load();
  }
});
document.addEventListener('click',async e=>{
  const release=e.target.closest('[data-release-phone]');
  if(release){await releasePhoneReservation(Number(release.dataset.releasePhone));return;}
  const sensitive=e.target.closest('[data-reveal-photo]');
  if(sensitive){sensitive.classList.toggle('sensitive-photo');return;}
  const closePreviewBtn=e.target.closest('[data-close-preview]');
  if(closePreviewBtn){closePreview();return;}
  if(e.target.id==='previewModal'){closePreview();return;}
  const previewBtn=e.target.closest('[data-preview-id]');
  if(previewBtn){openPreview(previewBtn.dataset.previewId);return;}
  const tab=e.target.closest('[data-tab]');
  if(tab){
    state.tab=tab.dataset.tab;
    $('#referenceSearch').value='';
    state.selected.clear();
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===tab));
    await load();return;
  }
  const btn=e.target.closest('[data-action]');
  if(!btn||state.busy)return;
  const id=btn.dataset.id,action=btn.dataset.action,a=state.rows.find(x=>x.id===id);
  if(!a)return;
  let pharosWindow=null;
  if(action==='pharos'){if(!confirm('Supprimer toutes les photos du compte, bannir le compte et ouvrir Pharos ? Le signalement devra être envoyé sur le portail officiel.'))return;pharosWindow=window.open('about:blank','_blank');}
  if(action==='reject'&&!confirm('Refuser cette annonce ?'))return;
  if(action==='delete'&&!confirm('Supprimer cette annonce du site ?'))return;
  if(action==='dismiss'&&!confirm('Retirer cette annonce de la liste Validées ? Elle restera publiée sur le site.'))return;
  setBusy(true);
  try{
    if(action==='validate'){
      const {data,error}=await sb.functions.invoke('moderate-listing',{body:{listing_id:id,action:'validate'}});
      if(!error&&data?.status!=='active'&&data?.revision!==true)throw Error(data?.ai_error||'Annonce non validée');
      if(error)throw error;toast(data?.revision?'Modification validée. Application après paiement.':'Annonce validée');
    }else if(action==='pharos'){
      const {data,error}=await sb.functions.invoke('moderate-listing',{body:{listing_id:id,action:'pharos'}});
      if(error||!data?.ok)throw error||Error('Action Pharos impossible');
      if(pharosWindow){pharosWindow.opener=null;pharosWindow.location='https://www.internet-signalement.gouv.fr/';}
      toast('Photos supprimées, compte banni. Envoyez le signalement sur Pharos.');
    }else if(action==='reject'){
      const {error}=await sb.rpc('moderate_listing',{p_listing_id:id,p_status:'rejected'});
      if(error)throw error;toast('Annonce refusée');
    }else if(action==='delete'){
      await removeListing(id);toast('Annonce supprimée');
    }else if(action==='dismiss'){
      const {error}=await sb.rpc('dismiss_validated_from_moderation',{p_listing_id:id});
      if(error)throw error;
      toast('Annonce retirée de la liste Validées');
    }
    closePreview();
    setBusy(false);
    await load();
  }catch(err){if(pharosWindow)pharosWindow.close();console.error(err);toast(err.message||'Action impossible');}
  finally{setBusy(false)}
});

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user){
    $('#lock').hidden=false;$('#lockText').textContent='Connectez-vous avec le compte administrateur Abracadeal.';return;
  }
  const {data:profile,error}=await sb.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();
  if(error||!profile?.is_admin){
    $('#lock').hidden=false;$('#lockText').textContent="Ce compte n'a pas les droits administrateur.";return;
  }
  $('#app').hidden=false;
  await load();
}
boot();

document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-reveal-photo]')){e.preventDefault();e.target.click();}});

let phoneReservations=[],phoneReleaseBusy=false;
$('#phoneReleaseForm').addEventListener('submit',async e=>{
 e.preventDefault();if(phoneReleaseBusy)return;
 phoneReleaseBusy=true;$('#phoneReleaseSearch').disabled=true;phoneReservations=[];
 try{
  const {data,error}=await sb.rpc('admin_phone_reservation_lookup',{p_phone:$('#phoneReleaseNumber').value});
  if(error)throw error;phoneReservations=data||[];
  $('#phoneReleaseResults').innerHTML=phoneReservations.length?phoneReservations.map((r,i)=>'<div class="phone-reservation"><strong>'+esc(r.display_name||'Compte sans nom')+'</strong><br>'+esc(r.account_type)+' · '+esc(r.phone_normalized)+'<br><small>Compte : '+esc(r.user_id)+'</small><br><button type="button" data-release-phone="'+i+'">Libérer ce numéro pour ce compte</button></div>').join(''):'<p>Aucune réservation trouvée. Vérifiez le format du numéro.</p>';
 }catch(error){$('#phoneReleaseResults').textContent=error.message||'Recherche impossible';}
 finally{phoneReleaseBusy=false;$('#phoneReleaseSearch').disabled=false;}
});
async function releasePhoneReservation(index){
 if(phoneReleaseBusy)return;const row=phoneReservations[index];if(!row)return;
 const reason=$('#phoneReleaseReason').value.trim();
 if(reason.length<10){toast('Saisissez un motif de 10 caractères minimum');return;}
 if(!confirm('Retirer '+row.phone_normalized+' du compte '+(row.display_name||row.user_id)+' ('+row.account_type+') et de ses contacts d’annonces ? Cette action sera journalisée.'))return;
 phoneReleaseBusy=true;
 try{
  const {error}=await sb.rpc('admin_release_phone',{p_phone:row.phone_normalized,p_user_id:row.user_id,p_account_type:row.account_type,p_reason:reason});
  if(error)throw error;phoneReservations=[];$('#phoneReleaseResults').textContent='Numéro libéré. Action enregistrée avec votre compte administrateur, le motif et la date.';toast('Numéro libéré et action journalisée');
 }catch(error){toast(error.message||'Libération impossible');}
 finally{phoneReleaseBusy=false;}
}


// ---------- Comptes modérateurs (admin) ----------
async function modApi(body){
  const {data,error}=await sb.functions.invoke('moderator-api',{body});
  if(error){let msg=error.message;try{msg=(await error.context.json()).error||msg}catch{}throw new Error(msg)}
  if(data?.error)throw new Error(data.error);
  return data;
}
async function loadModerators(){
  const host=$('#modList');if(!host)return;
  const {data,error}=await sb.rpc('admin_moderators');
  if(error){host.textContent='Erreur : '+error.message;return}
  if(!data?.length){host.innerHTML='<p>Aucun modérateur pour le moment.</p>';return}
  host.innerHTML=data.map(m=>'<div class="phone-reservation"><strong>'+esc(m.pseudo)+'</strong> · '+(m.active?'✅ actif':'⛔ accès coupé')+'<br><small>'+m.validated+' validée(s) · '+m.rejected+' supprimée(s)'+(m.last_action?' · dernière action '+new Date(m.last_action).toLocaleString('fr-FR'):'')+'</small><br>'+
    '<button type="button" data-mod-toggle="'+m.user_id+'" data-active="'+(m.active?'0':'1')+'">'+(m.active?'Couper l’accès':'Réactiver')+'</button> '+
    '<button type="button" data-mod-reset="'+m.user_id+'" data-pseudo="'+esc(m.pseudo)+'">Changer le mot de passe</button></div>').join('');
}
$('#modCreateForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#modCreateBtn');btn.disabled=true;
  try{const d=await modApi({action:'create',pseudo:$('#modPseudo').value,password:$('#modPassword').value});toast(d.message);$('#modPseudo').value='';$('#modPassword').value='';await loadModerators()}
  catch(err){toast(err.message||'Création impossible')}
  finally{btn.disabled=false}
});
$('#modList')?.addEventListener('click',async e=>{
  const t=e.target.closest('[data-mod-toggle]'),r=e.target.closest('[data-mod-reset]');
  try{
    if(t){const active=t.dataset.active==='1';if(!confirm(active?'Réactiver ce modérateur ?':'Couper l’accès de ce modérateur ? Il sera déconnecté et ne pourra plus se connecter.'))return;
      const d=await modApi({action:'set_active',user_id:t.dataset.modToggle,active});toast(d.message);await loadModerators()}
    if(r){const pw=prompt('Nouveau mot de passe pour « '+r.dataset.pseudo+' » (8 caractères minimum) :');if(!pw)return;
      const d=await modApi({action:'reset',user_id:r.dataset.modReset,password:pw});toast(d.message)}
  }catch(err){toast(err.message||'Action impossible')}
});
$('#modAdminPanel')?.addEventListener('toggle',e=>{if(e.target.open)loadModerators()});
