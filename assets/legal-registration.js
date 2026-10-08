// The same explicit information is shown in each account-creation path.
window.confirmLegalRegistration=()=>new Promise(resolve=>{
 const dialog=document.createElement('dialog');
 dialog.style.cssText='max-width:560px;width:calc(100% - 32px);border:1px solid #eadfee;border-radius:16px;padding:24px;color:#24152d;background:#fff';
 dialog.setAttribute('aria-labelledby','registration-legal-title');
 dialog.innerHTML='<form method="dialog"><h2 id="registration-legal-title">Créer mon compte</h2><p>Consultez les <a href="cgu.html" target="_blank" rel="noopener">CGU</a>, les <a href="cgv.html" target="_blank" rel="noopener">conditions de vente</a> et la <a href="confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>.</p><label style="display:flex;gap:10px;line-height:1.5"><input type="checkbox" required style="flex:none;width:20px;height:20px">Je confirme avoir au moins 18 ans et accepter les CGU.</label><p>Cette acceptation ne vaut pas accord pour recevoir de la publicité.</p><button type="button" data-cancel>Annuler</button> <button type="submit" disabled>Créer mon compte</button></form>';
 let done=false;
 function finish(value){if(done)return;done=true;dialog.remove();resolve(value);}
 dialog.querySelector('input').onchange=e=>{dialog.querySelector('[type=submit]').disabled=!e.target.checked;};
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(!dialog.querySelector('input').checked)return;finish({legal_terms_version:'2026-10-08',legal_terms_accepted_at:new Date().toISOString(),legal_majority_confirmed:true});};
 dialog.querySelector('[data-cancel]').onclick=()=>finish(null);
 dialog.oncancel=e=>{e.preventDefault();finish(null);};
 document.body.append(dialog);dialog.showModal();
});
