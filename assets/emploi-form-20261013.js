/* Abracadeal — champs Emploi intégrés dans la grille native du formulaire */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), text=e=>(e&&((e.value||e.textContent)||'').trim())||'';
const opts=a=>a.map(v=>`<option value="${v}">${v}</option>`).join('');
function isEmployment(){const c=$('#adCategory');if(!c)return false;const v=(c.value||'').toLowerCase().trim(),t=(c.options?.[c.selectedIndex]?.text||'').toLowerCase().trim();return v==='emploi'||t==='emploi'||t==="offres d'emploi"}
function remove(){document.querySelectorAll('.abraca-job-native').forEach(e=>e.remove())}
function row(label,html,full=false){const d=document.createElement('div');d.className='form-row abraca-job-native'+(full?' full':'');d.innerHTML=`<label>${label}</label>${html}`;return d}
function mount(){
 if(!isEmployment()){remove();return}if($('.abraca-job-native'))return;
 const desc=$('#adDescription');if(!desc)return;const descRow=desc.closest('.form-row');if(!descRow)return;const parent=descRow.parentNode;
 const nodes=[
  row("Secteur d’activité",'<input class="input" name="job_sector" maxlength="100" placeholder="Ex. Transport, Hôtellerie, Commerce">'),
  row('Métier / fonction','<input class="input" name="job_trade" maxlength="100" placeholder="Ex. Chauffeur privé">'),
  row('Expérience',`<select class="select" name="job_experience"><option value="">Non précisé</option>${opts(['Débutant accepté','0 à 2 ans','2 à 5 ans','5 à 10 ans','10 ans et +'])}</select>`),
  row("Niveau d’études",`<select class="select" name="job_education"><option value="">Non précisé</option>${opts(['Sans diplôme','CAP / BEP','Bac','Bac +2','Bac +3','Bac +5 et +'])}</select>`),
  row('Temps de travail',`<select class="select" name="job_schedule"><option value="">Choisir</option>${opts(['Temps plein','Temps partiel','Temps plein ou temps partiel'])}</select>`),
  row('Référence <span class="note">(facultatif)</span>','<input class="input" name="job_reference" maxlength="80" placeholder="Ex. EMP-2026-001">'),
  row('Salaire brut <span class="note">(facultatif)</span>','<input class="input" name="job_salary" type="number" min="0" step="1" inputmode="numeric" placeholder="Ex. 2200">'),
  row('Période du salaire',`<select class="select" name="job_salary_period">${opts(['Par mois','Par an','Par heure'])}</select>`),
  row('Réception des candidatures',`<select class="select" name="job_apply_method"><option value="email">Messagerie Abracadeal</option><option value="website">Site recruteur</option></select>`,true),
  row('Lien du site recruteur <span class="note">(si sélectionné)</span>','<input class="input" name="job_apply_url" type="url" placeholder="https://…">',true)
 ];
 nodes.forEach(n=>parent.insertBefore(n,descRow));
 const urlRow=$('[name="job_apply_url"]')?.closest('.abraca-job-native'),method=$('[name="job_apply_method"]');
 function applyMode(){if(urlRow)urlRow.classList.toggle('hidden',method?.value!=='website')}method?.addEventListener('change',applyMode);applyMode();
}
function sync(){if(isEmployment())mount();else remove()}
function bindSubmit(){const form=$('#adDescription')?.closest('form');if(!form||form.dataset.jobNativeSubmit)return;form.dataset.jobNativeSubmit='1';form.addEventListener('submit',()=>{if(!isEmployment())return;const desc=$('#adDescription');if(!desc)return;const val=n=>text($(`[name="${n}"]`)),rows=[];[["Secteur d’activité",'job_sector'],['Métier','job_trade'],['Expérience','job_experience'],["Niveau d’études",'job_education'],['Temps de travail','job_schedule'],['Référence','job_reference']].forEach(([l,n])=>{if(val(n))rows.push(`${l} : ${val(n)}`)});if(val('job_salary'))rows.push(`Salaire brut : ${val('job_salary')} € ${val('job_salary_period')||''}`.trim());if(val('job_apply_method')==='website'&&val('job_apply_url'))rows.push(`Candidature : ${val('job_apply_url')}`);if(rows.length){const marker='\n\n--- Informations emploi ---\n';desc.value=desc.value.split(marker)[0]+marker+rows.join('\n');desc.dispatchEvent(new Event('input',{bubbles:true}))}},true)}
document.addEventListener('change',e=>{if(e.target?.id==='adCategory')sync()},true);
new MutationObserver(()=>{bindSubmit();if(!isEmployment())remove();else if(!$('.abraca-job-native'))mount()}).observe(document.documentElement,{childList:true,subtree:true});
function init(){bindSubmit();sync()}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();