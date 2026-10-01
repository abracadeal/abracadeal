
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co',SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY),$=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function money(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))}
function paramsToForm(){const q=new URLSearchParams(location.search);$('dest').value=q.get('destination')||'';$('start').value=q.get('arrival')||'';$('end').value=q.get('departure')||'';$('guests').value=q.get('guests')||'2'}
async function run(){
 const d=$('dest').value.trim(),s=$('start').value||null,e=$('end').value||null,g=Number($('guests').value)||1;
 if(s&&e&&e<=s){$('results').innerHTML='<div class="empty">La date de départ doit être après la date d’arrivée.</div>';return}
 const {data,error}=await sb.rpc('search_vacation_listings',{p_destination:d||null,p_starts_on:s,p_ends_on:e,p_guests:g});
 if(error){$('results').innerHTML='<div class="empty">'+esc(error.message)+'</div>';return}
 $('subtitle').textContent=(data||[]).length+' logement(s)'+(d?' à '+d:'')+(s&&e?' pour vos dates':'');
 $('results').innerHTML=(data||[]).length?(data||[]).map(x=>{
   const url=x.photo_path?(String(x.photo_path).startsWith('http')?x.photo_path:sb.storage.from('listing-images').getPublicUrl(x.photo_path).data.publicUrl):null;
   const rating=x.host_rating?'⭐ '+String(x.host_rating).replace('.',',')+' · '+x.host_review_count+' avis':'Nouvel hôte';
   return '<a class="card" href="logement-vacances.html?id='+x.id+'"><div class="photo">'+(url?'<img src="'+url+'" alt="">':'Aucune photo')+'</div><div class="body"><h2>'+esc(x.title)+'</h2><div class="meta">'+esc(x.city)+' · '+x.max_guests+' voyageur(s) · '+x.bedrooms+' chambre(s)</div><div class="price">'+money(x.nightly_price)+' / nuit</div><div class="host">'+esc(x.host_name||'Hôte Abracadeal')+' · '+rating+'</div></div></a>'
 }).join(''):'<div class="empty">Aucun logement disponible avec ces critères.</div>';
}
$('form').onsubmit=e=>{e.preventDefault();const q=new URLSearchParams({destination:$('dest').value.trim(),arrival:$('start').value,departure:$('end').value,guests:$('guests').value});history.replaceState(null,'','?'+q.toString());run()};
paramsToForm();run();
