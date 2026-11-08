// The same explicit information is shown in each account-creation path.
window.confirmLegalRegistration=()=>new Promise(resolve=>{
 const dialog=document.createElement('dialog');
 dialog.style.cssText='max-width:560px;width:calc(100% - 32px);border:1px solid #eadfee;border-radius:16px;padding:24px;color:#24152d;background:#fff';
 dialog.setAttribute('aria-labelledby','registration-legal-title');
 dialog.innerHTML='<form method="dialog"><h2 id="registration-legal-title" style="margin:0 0 12px">Créer mon compte</h2><p>Consultez les <a href="cgu.html" target="_blank" rel="noopener" style="color:#6d28d9;font-weight:700">CGU</a>, les <a href="cgv.html" target="_blank" rel="noopener" style="color:#6d28d9;font-weight:700">conditions de vente</a> et la <a href="confidentialite.html" target="_blank" rel="noopener" style="color:#6d28d9;font-weight:700">politique de confidentialité</a>.</p><label style="display:flex;gap:10px;line-height:1.5"><input type="checkbox" required style="flex:none;width:20px;height:20px">Je confirme avoir au moins 18 ans et accepter les CGU.</label><p style="color:#6b5b75;font-size:14px">Cette acceptation ne vaut pas accord pour recevoir de la publicité.</p><div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px"><button type="button" data-cancel style="flex:1 1 140px;min-height:48px;padding:0 20px;border:1px solid #e3d7ea;border-radius:999px;background:#fff;color:#24152d;font:inherit;font-weight:700;cursor:pointer">Annuler</button><button type="submit" disabled style="flex:1 1 180px;min-height:48px;padding:0 22px;border:0;border-radius:999px;background:linear-gradient(90deg,#6d28d9,#db2777);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(109,40,217,.25);transition:opacity .15s">Créer mon compte</button></div></form>';
 let done=false;
 function finish(value){if(done)return;done=true;dialog.remove();resolve(value);}
 const sub=dialog.querySelector('[type=submit]');const sync=()=>{sub.style.opacity=sub.disabled?'.45':'1';sub.style.cursor=sub.disabled?'not-allowed':'pointer';};sync();
 dialog.querySelector('input').onchange=e=>{sub.disabled=!e.target.checked;sync();};
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(!dialog.querySelector('input').checked)return;finish({legal_terms_version:'2026-10-30',legal_terms_accepted_at:new Date().toISOString(),legal_majority_confirmed:true});};
 dialog.querySelector('[data-cancel]').onclick=()=>finish(null);
 dialog.oncancel=e=>{e.preventDefault();finish(null);};
 document.body.append(dialog);dialog.showModal();
});

// Vacances utilise les memes pages d'information et legales que le site principal.
// On evite ainsi le melange entre fenetres modales et pages completes.
(function(){
 const destinations={
  vacHelpModal:'aide.html',
  vacSafetyModal:'securite.html',
  vacCguModal:'cgu.html',
  vacPrivacyModal:'confidentialite.html',
  vacContactModal:'contact.html'
 };
 function harmonizeVacancesLegal(){
  document.querySelectorAll('[data-vac-legal]').forEach(link=>{
   const target=destinations[link.getAttribute('data-vac-legal')];
   if(!target)return;
   link.setAttribute('href',target);
   link.removeAttribute('data-vac-legal');
  });
  document.querySelectorAll('.vac-legal-overlay').forEach(modal=>modal.remove());
  const links=document.querySelector('.vac-legal-links');
  if(links){
   links.style.fontSize='12px';
   links.style.lineHeight='1.45';
   links.style.gap='8px 14px';
   links.style.opacity='.82';
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',harmonizeVacancesLegal);
 else harmonizeVacancesLegal();
})();

// Regle mot de passe Abracadeal : 8 caracteres minimum, avec au moins
// une majuscule, une minuscule, un chiffre et un symbole. La validation
// native du navigateur bloque l'envoi avant la creation du compte.
(function(){
 const PASSWORD_MESSAGE='Le mot de passe doit contenir au moins 8 caractères, avec 1 majuscule, 1 minuscule, 1 chiffre et 1 symbole.';
 const PASSWORD_RE=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;
 function installPasswordPolicy(){
  const input=document.getElementById('signupPassword');
  if(!input)return;
  input.minLength=8;
  input.setAttribute('pattern','(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).{8,}');
  input.setAttribute('title',PASSWORD_MESSAGE);
  input.setAttribute('aria-describedby','signupPasswordRule');
  let note=document.getElementById('signupPasswordRule');
  if(!note){
   note=document.createElement('div');
   note.id='signupPasswordRule';
   note.className='note';
   note.textContent='8 caractères minimum · 1 majuscule · 1 minuscule · 1 chiffre · 1 symbole';
   input.insertAdjacentElement('afterend',note);
  }else{
   note.textContent='8 caractères minimum · 1 majuscule · 1 minuscule · 1 chiffre · 1 symbole';
  }
  const validate=()=>{
   const value=input.value||'';
   input.setCustomValidity(!value||PASSWORD_RE.test(value)?'':PASSWORD_MESSAGE);
  };
  input.addEventListener('input',validate);
  input.addEventListener('blur',validate);
  input.addEventListener('invalid',()=>{
   if(input.validity.valueMissing)input.setCustomValidity('Choisissez un mot de passe.');
   else input.setCustomValidity(PASSWORD_MESSAGE);
  });
  validate();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPasswordPolicy);
 else installPasswordPolicy();
})();

// Correctif fiche annonce : le propriétaire particulier doit toujours retrouver
// son bouton Modifier. Le clic réutilise editAd(), donc le parcours de modification
// payante existant (1,99 €) reste la seule voie de modification.
(function(){
 function restoreOwnerEditButton(){
  const modal=document.getElementById('detailModal');
  if(!modal)return;
  const actions=modal.querySelector('.detail-owner-actions');
  if(!actions||actions.querySelector('[data-owner-edit-restored]'))return;
  const deleteButton=[...actions.querySelectorAll('button')].find(btn=>/\bdeleteAd\('([^']+)'\)/.test(btn.getAttribute('onclick')||'')&&!/adminDeleteAd/.test(btn.getAttribute('onclick')||''));
  if(!deleteButton)return;
  const match=(deleteButton.getAttribute('onclick')||'').match(/\bdeleteAd\('([^']+)'\)/);
  const listingId=match?.[1];
  if(!listingId)return;
  const editButton=document.createElement('button');
  editButton.type='button';
  editButton.className='mini-btn';
  editButton.dataset.ownerEditRestored='1';
  editButton.textContent='Modifier · 1,99 €';
  editButton.addEventListener('click',()=>{
   closeModal('detailModal');
   editAd(listingId);
  });
  actions.insertBefore(editButton,deleteButton);
 }
 function install(){
  const modal=document.getElementById('detailModal');
  if(!modal)return;
  new MutationObserver(restoreOwnerEditButton).observe(modal,{childList:true,subtree:true});
  restoreOwnerEditButton();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
 else install();
})();
