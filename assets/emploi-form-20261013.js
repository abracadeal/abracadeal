/* Abracadeal — formulaire structure Emploi (13/10/2026)
   Ajoute des champs metier uniquement quand la publication concerne Emploi/Offres d'emploi.
   Les valeurs sont injectees dans la description existante afin de rester compatibles avec le schema listings actuel. */
(function(){
  'use strict';
  const EMP=/emploi|offre d['’ ]?emploi|recrut/i;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const txt=e=>(e&&((e.value||e.textContent)||'').trim())||'';
  function isEmployment(){
    const fields=$$('select,input,[role="combobox"],button,.category,.cat,.chip,.pill');
    return fields.some(e=>EMP.test(txt(e))) || EMP.test(document.body.dataset.category||'');
  }
  function field(label,name,html,required){return `<label class="abraca-job-field"><span>${label}${required?' *':''}</span>${html.replace('__NAME__',name)}</label>`;}
  function options(vals){return vals.map(v=>`<option value="${v}">${v}</option>`).join('');}
  function mount(){
    if(!isEmployment() || $('#abracaJobFields')) return;
    const desc=$('textarea[name="description"],textarea#description,textarea[id*="description" i]');
    if(!desc) return;
    const box=document.createElement('section'); box.id='abracaJobFields'; box.className='abraca-job-fields';
    box.innerHTML=`<h3>Informations sur le poste</h3><p class="abraca-job-help">Ajoutez les informations essentielles pour aider les candidats à trouver votre offre.</p>
      ${field('Type de contrat','job_contract',`<select name="__NAME__" required><option value="">Choisir</option>${options(['CDI','CDD','Intérim','Alternance','Stage','Freelance / Indépendant','Saisonnier','Autre'])}</select>`,true)}
      ${field("Secteur d’activité",'job_sector','<input name="__NAME__" type="text" placeholder="Ex. Transport, Hôtellerie, Commerce">',false)}
      ${field('Métier','job_trade','<input name="__NAME__" type="text" placeholder="Ex. Chauffeur privé">',false)}
      ${field('Expérience','job_experience',`<select name="__NAME__"><option value="">Non précisé</option>${options(['Débutant accepté','0 à 2 ans','2 à 5 ans','5 à 10 ans','10 ans et +'])}</select>`,false)}
      ${field("Niveau d’études",'job_education',`<select name="__NAME__"><option value="">Non précisé</option>${options(['Sans diplôme','CAP / BEP','Bac','Bac +2','Bac +3','Bac +5 et +'])}</select>`,false)}
      ${field('Temps de travail','job_schedule',`<select name="__NAME__" required><option value="">Choisir</option>${options(['Temps plein','Temps partiel','Temps plein ou temps partiel'])}</select>`,true)}
      <div class="abraca-job-grid">${field('Salaire brut','job_salary','<input name="__NAME__" type="number" min="0" step="1" inputmode="numeric" placeholder="Ex. 2200">',false)}${field('Période','job_salary_period',`<select name="__NAME__">${options(['Par mois','Par an','Par heure'])}</select>`,false)}</div>
      ${field('Référence','job_reference','<input name="__NAME__" type="text" maxlength="80" placeholder="Facultatif">',false)}
      ${field('Réception des candidatures','job_apply_method',`<select name="__NAME__"><option value="email">Email / messagerie Abracadeal</option><option value="website">Site recruteur</option></select>`,false)}
      <div class="abraca-job-site" hidden>${field('Lien du site recruteur','job_apply_url','<input name="__NAME__" type="url" placeholder="https://…">',false)}</div>`;
    desc.closest('.field,.form-group,.input-group,label,div')?.parentNode?.insertBefore(box,desc.closest('.field,.form-group,.input-group,label,div')||desc);
    if(!box.isConnected) desc.parentNode.insertBefore(box,desc);
    const method=$('[name="job_apply_method"]',box), site=$('.abraca-job-site',box);
    method?.addEventListener('change',()=>{site.hidden=method.value!=='website';});
    const form=desc.closest('form');
    form?.addEventListener('submit',()=>{
      const rows=[]; const val=n=>txt($(`[name="${n}"]`,box));
      [['Type de contrat','job_contract'],["Secteur d’activité",'job_sector'],['Métier','job_trade'],['Expérience','job_experience'],["Niveau d’études",'job_education'],['Temps de travail','job_schedule'],['Référence','job_reference']].forEach(([l,n])=>{if(val(n))rows.push(`${l} : ${val(n)}`)});
      if(val('job_salary')) rows.push(`Salaire brut : ${val('job_salary')} € ${val('job_salary_period')||''}`.trim());
      if(val('job_apply_method')==='website'&&val('job_apply_url')) rows.push(`Candidature : ${val('job_apply_url')}`);
      if(rows.length){
        const marker='\n\n--- Informations emploi ---\n';
        desc.value=desc.value.split(marker)[0]+marker+rows.join('\n');
        desc.dispatchEvent(new Event('input',{bubbles:true}));
      }
    },true);
  }
  const css=document.createElement('style'); css.textContent=`.abraca-job-fields{margin:18px 0;padding:18px;border:1px solid #e2d4b7;border-radius:16px;background:rgba(255,255,255,.025)}.abraca-job-fields h3{margin:0 0 6px}.abraca-job-help{margin:0 0 16px;opacity:.75}.abraca-job-field{display:block;margin:12px 0}.abraca-job-field>span{display:block;font-weight:650;margin-bottom:7px}.abraca-job-field input,.abraca-job-field select{width:100%;min-height:46px;border-radius:12px;padding:10px 12px;box-sizing:border-box;font:inherit}.abraca-job-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:650px){.abraca-job-fields{padding:14px}.abraca-job-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
  const obs=new MutationObserver(()=>mount()); obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('change',()=>setTimeout(mount,0),true); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();