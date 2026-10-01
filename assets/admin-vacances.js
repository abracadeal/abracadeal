
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
let rows=[];

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function money(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))}
function fmtDate(v){if(!v)return '—';return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(v))}
function isFeatured(r){return !!r.featured_until && new Date(r.featured_until).getTime()>Date.now()}

function statusLabel(r){
  if(r.status==='archived')return 'Retirée du site';
  if(r.status==='pending')return 'À modérer';
  if(r.status==='rejected')return 'Refusée';
  return 'En ligne';
}

function render(){
  const host=$('results');
  if(!rows.length){
    host.innerHTML='<div class="empty">Aucun logement Vacances pour le moment.</div>';
    return;
  }
  host.innerHTML=rows.map(r=>{
    const archived=r.status==='archived';
    const featured=isFeatured(r);
    return `<article class="item" data-id="${r.id}">
      <div>
        <h3>${esc(r.title||'Logement')}</h3>
        <div class="meta">${esc(r.city||'—')} · ${money(r.price)} / nuit · publiée le ${fmtDate(r.created_at)}</div>
        <div class="badges">
          <span class="badge ${archived?'archived':'active'}">${esc(statusLabel(r))}</span>
          ${featured?`<span class="badge featured">À la une jusqu'au ${fmtDate(r.featured_until)}</span>`:''}
        </div>
        <div class="msg" id="msg-${r.id}"></div>
      </div>
      <div class="side">
        <button class="btn small" type="button" onclick="window.open('logement-vacances.html?id=${r.id}','_blank')">Voir l'annonce</button>
        ${archived
          ? `<button class="btn small" type="button" onclick="reactivateListing('${r.id}')">Réactiver</button>`
          : `<button class="btn small danger" type="button" onclick="removeListing('${r.id}')">Retirer du site</button>`
        }
        <div class="boost-row">
          <select id="boostDays-${r.id}">
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
          </select>
          <button class="btn small gold" type="button" onclick="boostNow('${r.id}')">🎁 Booster (1 clic)</button>
        </div>
        <button class="btn link" type="button" onclick="giftBoostCredit('${r.id}','${r.owner_id}')">ou offrir un crédit à utiliser plus tard</button>
      </div>
    </article>`;
  }).join('');
}

function setMsg(id,text,ok){
  const el=$('msg-'+id);
  if(!el)return;
  el.textContent=text;
  el.className='msg '+(ok?'ok':'err');
}

async function loadListings(){
  $('status').textContent='Chargement…';
  const {data,error}=await sb.from('listings')
    .select('id,title,city,price,status,featured_until,owner_id,created_at')
    .eq('category','vacances')
    .order('created_at',{ascending:false});
  if(error){
    $('status').textContent='Impossible de charger les logements : '+error.message;
    $('results').innerHTML='';
    return;
  }
  rows=data||[];
  $('status').textContent=rows.length+' logement(s)';
  render();
}

window.removeListing=async function(id){
  if(!confirm('Retirer cette annonce du site ? Elle reste consultable dans la base admin, ce n’est pas une suppression définitive.'))return;
  const {error}=await sb.rpc('admin_remove_vacation_listing',{p_listing_id:id});
  if(error){setMsg(id,'Erreur : '+error.message,false);return}
  setMsg(id,'Retirée du site.',true);
  await loadListings();
};

window.reactivateListing=async function(id){
  const {error}=await sb.rpc('admin_reactivate_listing',{p_listing_id:id});
  if(error){setMsg(id,'Erreur : '+error.message+' (fonction admin_reactivate_listing à installer, voir instructions)',false);return}
  setMsg(id,'Réactivée.',true);
  await loadListings();
};

window.boostNow=async function(id){
  const days=Number($('boostDays-'+id).value)||7;
  if(!confirm('Mettre cette annonce à la une pendant '+days+' jours dès maintenant, et prévenir l’hôte ?'))return;
  const {error}=await sb.rpc('admin_feature_listing_now',{p_listing_id:id,p_days:days});
  if(error){setMsg(id,'Erreur : '+error.message+' (fonction admin_feature_listing_now à installer, voir instructions)',false);return}
  setMsg(id,'Boosté ! À la une pendant '+days+' jours. L’hôte a été prévenu.',true);
  await loadListings();
};

window.giftBoostCredit=async function(id,ownerId){
  const days=Number($('boostDays-'+id).value)||7;
  if(!confirm('Offrir un crédit de boost '+days+' jours à l’hôte de cette annonce ? Il pourra l’activer lui-même depuis son Espace Hôte, sur ce logement ou un autre.'))return;
  const {error}=await sb.rpc('admin_grant_pro_boosts',{p_user_id:ownerId,p_duration_days:days,p_credits:1,p_note:'Cadeau de lancement Abracadeal Vacances'});
  if(error){setMsg(id,'Erreur : '+error.message,false);return}
  setMsg(id,'Crédit de boost '+days+' jours offert à l’hôte.',true);
};

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user){
    $('lock').style.display='block';$('lockText').textContent='Connecte-toi avec ton compte administrateur (depuis le site principal), puis reviens sur cette page.';
    return;
  }
  const {data:profile,error}=await sb.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();
  if(error||!profile?.is_admin){
    $('lock').style.display='block';$('lockText').textContent='Ce compte ne possède pas les droits administrateur.';
    return;
  }
  $('app').style.display='block';
  $('lock').style.display='none';
  loadListings();
}

$('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.href='index.html'});
boot();
