
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
let rows=[],currentFilter='all';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function fmtDate(v){if(!v)return '—';return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}
function fmtPrice(v){if(v===null||v===undefined||v==='')return '—';return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v))}
function labelReason(v){return ({sold:'Vendue',user_deleted:'Supprimée par utilisateur',admin_removed:'Retirée par admin',expired:'Expirée',duplicate:'Doublon',import_removed:'Retirée du flux',other:'Archivée'})[v]||v||'—'}
function labelStatus(v){return ({active:'Active',pending:'À valider',rejected:'Refusée',archived:'Archivée'})[v]||v||'—'}

function filtered(){
  if(currentFilter==='all')return rows;
  if(currentFilter==='live')return rows.filter(r=>r.record_source==='live');
  if(currentFilter==='archive')return rows.filter(r=>r.record_source==='archive');
  if(currentFilter==='sold')return rows.filter(r=>r.archive_reason==='sold');
  return rows;
}

function render(){
  const data=filtered();
  $('status').textContent=rows.length ? data.length+' résultat(s) affiché(s) sur '+rows.length : $('status').textContent;
  if(!data.length){
    $('results').innerHTML='<div class="card empty">Aucune annonce correspondante.</div>';
    return;
  }
  $('results').innerHTML=data.map(r=>{
    const isArchive=r.record_source==='archive';
    const statusClass=isArchive?'archive':(r.status||'active');
    const owner=r.owner_name||r.company_name||'Propriétaire non renseigné';
    const vehicle=[r.vehicle_make,r.vehicle_model,r.vehicle_year].filter(Boolean).join(' ');
    return `<article class="card item">
      <div>
        <div class="ref">${esc(r.listing_reference||'Sans référence')}</div>
        <h3>${esc(r.title||vehicle||'Annonce sans titre')}</h3>
        <div class="badges">
          <span class="badge ${statusClass}">${esc(isArchive?'Archive':labelStatus(r.status))}</span>
          ${r.archive_reason?'<span class="badge sold">'+esc(labelReason(r.archive_reason))+'</span>':''}
          ${r.category?'<span class="badge">'+esc(r.category)+'</span>':''}
        </div>
        <div class="grid">
          <div class="kv"><span class="k">Propriétaire</span><span class="v">${esc(owner)}</span></div>
          <div class="kv"><span class="k">Téléphone</span><span class="v">${esc(r.owner_phone||'—')}</span></div>
          <div class="kv"><span class="k">E-mail</span><span class="v">${esc(r.owner_email||'—')}</span></div>
          <div class="kv"><span class="k">Ville</span><span class="v">${esc(r.city||'—')}</span></div>
          <div class="kv"><span class="k">Véhicule / modèle</span><span class="v">${esc(vehicle||'—')}</span></div>
          <div class="kv"><span class="k">Entreprise</span><span class="v">${esc(r.company_name||'—')}</span></div>
          <div class="kv"><span class="k">SIREN</span><span class="v">${esc(r.siren||'—')}</span></div>
          <div class="kv"><span class="k">SIRET</span><span class="v">${esc(r.siret||'—')}</span></div>
        </div>
      </div>
      <div class="side">
        <div class="price">${fmtPrice(r.price)}</div>
        <div class="date">
          Créée : ${fmtDate(r.created_at)}<br>
          ${r.archived_at?'Archivée : '+fmtDate(r.archived_at)+'<br>':''}
          ${r.retention_until?'Conservation : '+fmtDate(r.retention_until):''}
        </div>
      </div>
    </article>`;
  }).join('');
}

async function search(){
  const q=$('q').value.trim();
  if(q.length<2){$('status').textContent='Entre au moins 2 caractères.';$('results').innerHTML='';return}
  $('searchBtn').disabled=true;$('searchBtn').textContent='Recherche…';$('status').textContent='Recherche en cours…';
  const {data,error}=await sb.rpc('admin_search_listing_history',{p_query:q,p_limit:100});
  $('searchBtn').disabled=false;$('searchBtn').textContent='Rechercher';
  if(error){$('status').textContent='Erreur : '+error.message;$('results').innerHTML='';return}
  rows=data||[];render();
}

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user){
    $('lock').style.display='block';$('lockText').textContent='Connecte-toi avec ton compte administrateur.';
    return;
  }
  const {data:profile,error}=await sb.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();
  if(error||!profile?.is_admin){
    $('lock').style.display='block';$('lockText').textContent='Ce compte ne possède pas les droits administrateur.';
    return;
  }
  $('app').style.display='block';
  $('lock').style.display='none';
}

$('searchBtn').addEventListener('click',search);
$('q').addEventListener('keydown',e=>{if(e.key==='Enter')search()});
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');currentFilter=b.dataset.filter;render();
}));
$('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.href='index.html'});
boot();
