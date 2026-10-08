// Explicit, unchecked consent collected before a server creates a payment session.
window.confirmOptionPurchase=()=>new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.style.cssText='max-width:520px;width:calc(100% - 32px);border:1px solid #eadfee;border-radius:16px;padding:24px;color:#24152d';
 dialog.innerHTML='<form method="dialog"><h2>Avant le paiement</h2><p>Les options ne sont pas remboursables si l\'annonce est retirée pour non-respect des règles de diffusion, sous réserve de vos droits légaux.</p><p>Avant l’exécution complète, vous pouvez exercer votre droit de rétractation pendant 14 jours ; le service déjà fourni peut rester dû au prorata.</p><label style="display:flex;gap:10px;line-height:1.5"><input type="checkbox" required style="flex:none;width:20px;height:20px">Je demande l\'activation immédiate de l\'option et je reconnais que mon droit de rétractation sera perdu après l\'exécution complète de la prestation.</label><p><a href="cgv.html#retractation" target="_blank" rel="noopener">Conditions de vente</a></p><button type="button" data-cancel>Annuler</button> <button type="submit" disabled>Continuer vers le paiement</button></form>';
 let done=false;function finish(value){if(done)return;done=true;dialog.remove();resolve(value);}
 dialog.querySelector('input').onchange=e=>dialog.querySelector('[type=submit]').disabled=!e.target.checked;
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(dialog.querySelector('input').checked)finish(true);};
 dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);dialog.showModal();
});
