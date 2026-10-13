/* Abracadeal — formulaire Emploi, mise en page integree */
(function(){
'use strict';
const EMP=/emploi|offre d['’ ]?emploi|recrut/i,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const text=e=>(e&&((e.value||e.textContent)||'').trim())||'';
const opts=a=>a.map(v=>`<option value="${v}">${v}</option>`).join('');
function isEmployment(){return $$('select,input,[role="combobox"],button,.category,.cat,.chip,.pill').some(e=>EMP.test(text(e)))||EMP.test(document.body.dataset.category||'')}
function field(label,name,control,cls=''){return `<label class="job-field ${cls}"><span class="job-label">${label}</span>${control.replaceAll('__NAME__',name)}</label>`}
function mount(){
 if(!isEmployment()||$('#abracaJobFields'))return;
 const desc=$('textarea[name="description"],textarea#description,textarea[id*="description" i]'); if(!desc)return;
 const box=document.createElement('section'); box.id='abracaJobFields'; box.className='abraca-job-fields';
 box.innerHTML=`
 <div class="job-head"><div><h3>Détails de l’offre d’emploi</h3><p>Complétez les informations utiles aux candidats.</p></div><span class="job-badge">Emploi</span></div>
 <div class="job-section"><h4>Poste recherché</h4><div class="job-grid job-grid-2">
 ${field("Secteur d’activité",'job_sector','<input name="__NAME__" type="text" placeholder="Ex. Transport, Hôtellerie, Commerce">')}
 ${field('Métier / fonction','job_trade','<input name="__NAME__" type="text" placeholder="Ex. Chauffeur privé">')}
 ${field('Expérience','job_experience',`<select name="__NAME__"><option value="">Non précisé</option>${opts(['Débutant accepté','0 à 2 ans','2 à 5 ans','5 à 10 ans','10 ans et +'])}</select>`)}
 ${field("Niveau d’études",'job_education',`<select name="__NAME__"><option value="">Non précisé</option>${opts(['Sans diplôme','CAP / BEP','Bac','Bac +2','Bac +3','Bac +5 et +'])}</select>`)}
 </div></div>
 <div class="job-section"><h4>Conditions</h4><div class="job-grid job-grid-2">
 ${field('Temps de travail *','job_schedule',`<select name="__NAME__" required><option value="">Choisir</option>${opts(['Temps plein','Temps partiel','Temps plein ou temps partiel'])}</select>`)}
 ${field('Référence','job_reference','<input name="__NAME__" type="text" maxlength="80" placeholder="Facultatif">')}
 </div><div class="job-salary"><div class="job-salary-title">Rémunération <span>facultatif</span></div><div class="job-grid job-grid-salary">
 ${field('Salaire brut','job_salary','<div class="job-money"><input name="__NAME__" type="number" min="0" step="1" inputmode="numeric" placeholder="Ex. 2200"><b>€</b></div>')}
 ${field('Période','job_salary_period',`<select name="__NAME__">${opts(['Par mois','Par an','Par heure'])}</select>`)}
 </div></div></div>
 <div class="job-section job-section-last"><h4>Candidatures</h4><div class="job-grid job-grid-1">
 ${field('Recevoir les candidatures via','job_apply_method',`<select name="__NAME__"><option value="email">Email / messagerie Abracadeal</option><option value="website">Site recruteur</option></select>`)}
 <div class="abraca-job-site" hidden>${field('Lien du site recruteur','job_apply_url','<input name="__NAME__" type="url" placeholder="https://…">')}</div>
 </div></div>`;
 const anchor=desc.closest('.field,.form-group,.input-group,label,div')||desc; anchor.parentNode.insertBefore(box,anchor);
 const method=$('[name="job_apply_method"]',box),site=$('.abraca-job-site',box); method?.addEventListener('change',()=>site.hidden=method.value!=='website');
 desc.closest('form')?.addEventListener('submit',()=>{const rows=[],val=n=>text($(`[name="${n}"]`,box));[["Secteur d’activité",'job_sector'],['Métier','job_trade'],['Expérience','job_experience'],["Niveau d’études",'job_education'],['Temps de travail','job_schedule'],['Référence','job_reference']].forEach(([l,n])=>{if(val(n))rows.push(`${l} : ${val(n)}`)});if(val('job_salary'))rows.push(`Salaire brut : ${val('job_salary')} € ${val('job_salary_period')||''}`.trim());if(val('job_apply_method')==='website'&&val('job_apply_url'))rows.push(`Candidature : ${val('job_apply_url')}`);if(rows.length){const marker='\n\n--- Informations emploi ---\n';desc.value=desc.value.split(marker)[0]+marker+rows.join('\n');desc.dispatchEvent(new Event('input',{bubbles:true}))}},true);
}
const style=document.createElement('style');style.textContent=`
.abraca-job-fields{margin:20px 0;border:1px solid #eadff0;border-radius:18px;background:#fff;overflow:hidden;color:#2d1538;box-shadow:0 4px 18px rgba(62,22,79,.05)}
.job-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;background:linear-gradient(135deg,#fbf7fd,#fff)}.job-head h3{font-size:18px;margin:0 0 3px;font-weight:800}.job-head p{margin:0;color:#776b7c;font-size:13px}.job-badge{background:#f8e8f3;color:#9d286f;border-radius:999px;padding:6px 11px;font-size:12px;font-weight:800}
.job-section{padding:17px 20px;border-top:1px solid #f0e9f3}.job-section h4{margin:0 0 13px;font-size:14px;font-weight:800;color:#4b2758}.job-section-last{padding-bottom:20px}.job-grid{display:grid;gap:13px 16px}.job-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}.job-grid-1{grid-template-columns:1fr}.job-grid-salary{grid-template-columns:minmax(0,1.2fr) minmax(150px,.8fr)}
.job-field{display:block;margin:0;min-width:0}.job-label{display:block;margin:0 0 6px;font-size:12px;font-weight:750;color:#5c5060}.job-field input,.job-field select{display:block;width:100%;height:44px;box-sizing:border-box;border:1px solid #d9cfdd;border-radius:10px;background:#fff;color:#33263a;padding:0 12px;font:inherit;font-size:14px;outline:none;transition:.15s}.job-field input:focus,.job-field select:focus{border-color:#c23a91;box-shadow:0 0 0 3px rgba(194,58,145,.10)}.job-field input::placeholder{color:#aaa1ae}.job-salary{margin-top:15px;padding:14px;border-radius:13px;background:#faf7fb;border:1px solid #eee5f0}.job-salary-title{font-size:13px;font-weight:800;margin-bottom:10px}.job-salary-title span{font-size:11px;font-weight:600;color:#95899a;margin-left:5px}.job-money{position:relative}.job-money input{padding-right:38px}.job-money b{position:absolute;right:13px;top:50%;transform:translateY(-50%);font-size:14px;color:#6d6171}.abraca-job-site{margin-top:0}
@media(max-width:700px){.abraca-job-fields{margin:16px 0;border-radius:14px}.job-head,.job-section{padding:15px}.job-head{align-items:flex-start}.job-head h3{font-size:17px}.job-grid-2,.job-grid-salary{grid-template-columns:1fr}.job-salary{padding:12px}.job-field input,.job-field select{height:46px;font-size:16px}}
`;document.head.appendChild(style);
new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('change',()=>setTimeout(mount,0),true);document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
})();