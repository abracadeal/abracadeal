
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co',SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY),$=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function stars(n){return '★'.repeat(n)+'☆'.repeat(5-n)}
function avg(a){return a.length?(a.reduce((s,x)=>s+Number(x.rating),0)/a.length).toFixed(1).replace('.',','):'—'}
function reviewHtml(r,names){return '<div class="review"><div class="reviewHead"><div><b>'+esc(names[r.reviewer_id]||'Membre Abracadeal')+'</b><div class="stars">'+stars(Number(r.rating))+'</div></div><small class="muted">'+new Date(r.created_at).toLocaleDateString('fr-FR')+'</small></div><p>'+esc(r.comment)+'</p>'+(r.subject_reply?'<div class="reply"><b>Réponse</b><div>'+esc(r.subject_reply)+'</div></div>':'')+'</div>'}
async function boot(){
 const userId=new URLSearchParams(location.search).get('user');if(!userId){$('loading').textContent='Profil introuvable.';return}
 const [{data:p},{data:rev},{data:hostListings}]=await Promise.all([
   sb.from('public_profiles').select('*').eq('id',userId).maybeSingle(),
   sb.from('vacation_reviews').select('id,reviewer_id,subject_id,subject_role,rating,comment,subject_reply,created_at').eq('subject_id',userId).eq('status','active').order('created_at',{ascending:false}),
   sb.from('listings').select('id').eq('owner_id',userId).eq('category','vacances').eq('status','active').limit(1)
 ]);
 if(!p){$('loading').textContent='Profil introuvable.';return}
 const reviews=rev||[],hostR=reviews.filter(x=>x.subject_role==='host'),travR=reviews.filter(x=>x.subject_role==='traveler');
 const ids=[...new Set(reviews.map(x=>x.reviewer_id))];let names={};
 if(ids.length){const {data:ps}=await sb.from('public_profiles').select('id,display_name').in('id',ids);(ps||[]).forEach(x=>names[x.id]=x.display_name)}
 $('name').textContent=p.display_name||'Membre Abracadeal';$('avatar').textContent=(p.display_name||'A').trim().charAt(0).toUpperCase();$('city').textContent=p.city||'';$('joined').textContent='Membre depuis '+new Date(p.joined_at).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 $('hostBadge').classList.toggle('hidden',!(hostListings?.length||hostR.length));$('travelerBadge').classList.toggle('hidden',!travR.length);
 $('hostAvg').textContent=hostR.length?'⭐ '+avg(hostR):'—';$('hostCount').textContent=hostR.length+' avis';$('travAvg').textContent=travR.length?'⭐ '+avg(travR):'—';$('travCount').textContent=travR.length+' avis';$('allCount').textContent=reviews.length;
 $('hostPanel').innerHTML=hostR.length?hostR.map(x=>reviewHtml(x,names)).join(''):'<div class="empty">Aucun avis publié comme hôte.</div>';
 $('travelerPanel').innerHTML=travR.length?travR.map(x=>reviewHtml(x,names)).join(''):'<div class="empty">Aucun avis publié comme voyageur.</div>';
 $('loading').classList.add('hidden');$('profileView').classList.remove('hidden')
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.role==='host'?'hostPanel':'travelerPanel').classList.add('active')});
boot();
