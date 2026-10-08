const sb=supabase.createClient('https://jplzvxmpbpjssyinozap.supabase.co','sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF');
const $=s=>document.querySelector(s);
const names={messages:'Messages',reports:'Signalements d’annonces',conversation_reports:'Signalements de conversations',vacation_review_reports:'Signalements d’avis Vacances',prospection_prospects:'Prospects',pro_stock_sync_runs:'Journaux d’import',search_events:'Recherches internes',b2b_review_log:'Journaux B2B',expired_listings:'Archives d’annonces',deleted_signatures:'Empreintes de republication',listing_moderation:'Dossiers de modération',notices:'Préavis envoyés',closed:'Comptes fermés',photos_deleted:'Photos supprimées',errors:'Erreurs'};
const counts=v=>Object.entries(v||{}).map(([k,n])=>(names[k]||k)+' : '+n).join('\n');
const date=v=>v?new Date(v).toLocaleString('fr-FR'):'—';
async function load(){
 const {data,error}=await sb.rpc('admin_retention_status');
 if(error){$('#status').textContent='Accès administrateur requis ou données indisponibles.';$('#app').hidden=true;return;}
 $('#app').hidden=false;$('#status').textContent='Suivi à jour';
 $('#runs').textContent=(data.runs||[]).map(r=>date(r.finished_at)+'\n'+counts(r.counts)+(r.error?'\nErreur : '+r.error:'')).join('\n\n')||'Première exécution à venir.';
 $('#preview').textContent=counts(data.preview)||'Aucun élément arrivé à échéance.';
 $('#photos').textContent=data.storage_pending+' fichier(s) en attente de suppression.';
 $('#errors').textContent=(data.storage_errors||[]).map(r=>'Fichier '+r.id+' : '+r.last_error).join('\n');
 const state={notice_pending:'Préavis à envoyer',notified:'Préavis envoyé',closing:'Fermeture en cours',closed:'Compte fermé',cancelled:'Fermeture annulée'};
 $('#accounts').textContent=(data.accounts||[]).map(r=>r.user_id+' — '+state[r.state]+(r.close_after?'\nÉchéance : '+date(r.close_after):'')+(r.last_error?'\nErreur : '+r.last_error:'')).join('\n\n')||'Aucun compte en cours de fermeture.';
 $('#holds').replaceChildren();
 for(const hold of data.holds||[]){
  const box=document.createElement('div');box.className='hold';
  const p=document.createElement('p');p.textContent=hold.scope+' · '+hold.target_id+'\n'+hold.reason+' — Réexamen : '+date(hold.review_at);box.append(p);
  const b=document.createElement('button');b.type='button';b.textContent='Lever le gel';b.onclick=async()=>{if(!confirm('Le litige est terminé et la conservation supplémentaire n’est plus nécessaire ?'))return;b.disabled=true;const {error}=await sb.rpc('admin_retention_hold',{p_scope:hold.scope,p_target:hold.target_id,p_reason:hold.reason,p_release:true});if(error){$('#status').textContent='Impossible de lever le gel.';b.disabled=false;}else await load();};box.append(b);$('#holds').append(box);
 }
}
$('#refresh').onclick=load;
$('#holdForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;const {error}=await sb.rpc('admin_retention_hold',{p_scope:$('#scope').value,p_target:$('#target').value.trim(),p_reason:$('#reason').value.trim()});b.disabled=false;if(error){$('#status').textContent='Gel refusé : vérifiez l’identifiant et le motif.';return;}e.target.reset();await load();};
load();
