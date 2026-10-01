
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co',SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY),$=id=>document.getElementById(id);let user=null,stay=null,otherId=null,rating=0;
function note(t,e=false){$('notice').textContent=t;$('notice').className='notice'+(e?' err':'')}
function stars(){ $('stars').innerHTML=[1,2,3,4,5].map(n=>'<button class="star '+(n<=rating?'on':'')+'" onclick="setRating('+n+')">★</button>').join('') } window.setRating=n=>{rating=n;stars()}
async function boot(){
 const {data:{session}}=await sb.auth.getSession();user=session?.user||null;$('login').classList.toggle('hidden',!!user);$('main').classList.toggle('hidden',!user);if(!user)return;
 const id=new URLSearchParams(location.search).get('stay');if(!id){note('Séjour introuvable.',true);return}
 const {data:s,error}=await sb.from('vacation_stays').select('*,listings(title,city)').eq('id',id).maybeSingle();if(error||!s){note('Séjour introuvable ou inaccessible.',true);return}stay=s;
 const isHost=user.id===s.host_id,isTraveler=user.id===s.traveler_id;if(!isHost&&!isTraveler){note('Accès refusé.',true);return}
 otherId=isHost?s.traveler_id:s.host_id;
 const {data:op}=await sb.from('public_profiles').select('display_name,city').eq('id',otherId).maybeSingle();
 $('title').textContent=s.listings?.title||'Séjour Abracadeal';$('dates').textContent=new Date(s.starts_on+'T12:00').toLocaleDateString('fr-FR')+' → '+new Date(s.ends_on+'T12:00').toLocaleDateString('fr-FR')+(s.listings?.city?' · '+s.listings.city:'');$('other').textContent=(isHost?'Voyageur : ':'Hôte : ')+(op?.display_name||'Membre Abracadeal');$('profileLink').href='profil-vacances.html?user='+otherId;
 $('statusPill').textContent=s.status==='completed'?'Séjour confirmé':'Confirmation en attente';
 if(isTraveler&&s.status==='host_confirmed')$('confirmCard').classList.remove('hidden');
 const {data:mine}=await sb.from('vacation_reviews').select('*').eq('stay_id',s.id).eq('reviewer_id',user.id).maybeSingle();
 if(mine){$('doneCard').classList.remove('hidden');$('doneText').textContent='Votre note : '+mine.rating+'/5. Elle sera visible après l’avis réciproque ou au plus tard 14 jours après sa publication.';return}
 if(s.status==='completed'){$('reviewCard').classList.remove('hidden');$('reviewTitle').textContent=isHost?'Noter le voyageur':'Noter l’hôte';stars()}
}
$('loginBtn').onclick=async()=>{const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){alert(error.message);return}boot()};
$('confirmBtn').onclick=async()=>{const {error}=await sb.rpc('vacation_confirm_stay',{p_stay_id:stay.id});if(error){note(error.message,true);return}note('Séjour confirmé. Vous pouvez maintenant laisser votre avis.');await boot()};
$('submitBtn').onclick=async()=>{if(!rating){note('Choisissez une note de 1 à 5 étoiles.',true);return}const c=$('comment').value.trim();if(c.length<3){note('Ajoutez un commentaire.',true);return}const {error}=await sb.rpc('vacation_submit_review',{p_stay_id:stay.id,p_rating:rating,p_comment:c});if(error){note(error.message,true);return}note('Avis enregistré.');await boot()};
boot();
