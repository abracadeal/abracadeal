// Explicit, unchecked consent collected before a server creates a payment session.
window.confirmOptionPurchase=()=>new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.style.cssText='max-width:520px;width:calc(100% - 32px);box-sizing:border-box;border:1px solid #eadfee;border-radius:20px;padding:28px;color:#24152d;font-family:Inter,system-ui,sans-serif;box-shadow:0 24px 80px #24152d33';
 dialog.innerHTML=`<form method="dialog"><h2 style="margin:0 0 12px">Activer mon option</h2><p style="color:#74697a;line-height:1.5">Votre option sera activée après confirmation du paiement.</p><label style="display:flex;gap:12px;line-height:1.5;font-size:14px"><input type="checkbox" required style="flex:none;width:20px;height:20px;margin:3px 0;accent-color:#842aaa"><span>Je demande l’activation immédiate de l’option et reconnais perdre mon droit de rétractation une fois la prestation entièrement exécutée.</span></label><p style="margin:18px 0;font-size:13px"><a href="cgv.html#retractation" target="_blank" rel="noopener" style="color:#74697a">Conditions de vente</a></p><div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button type="button" data-cancel style="border:0;border-radius:11px;min-height:44px;padding:0 18px;background:#f1e9f5;color:#6f218c;font-weight:700;cursor:pointer">Annuler</button><button type="submit" disabled style="border:0;border-radius:11px;min-height:44px;padding:0 18px;background:linear-gradient(135deg,#842aaa,#e746a3);color:white;font-weight:700;opacity:.45;cursor:not-allowed">Continuer vers le paiement</button></div></form>`;
 let done=false;function finish(value){if(done)return;done=true;dialog.remove();resolve(value);}
 dialog.querySelector('input').onchange=e=>{const b=dialog.querySelector('[type=submit]');b.disabled=!e.target.checked;b.style.opacity=b.disabled?'.45':'1';b.style.cursor=b.disabled?'not-allowed':'pointer';};
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(dialog.querySelector('input').checked)finish(true);};
 dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);dialog.showModal();
});

// Fix 08/10/2026 : apres "Continuer vers le paiement", la creation de la session Stripe puis le
// chargement de Stripe prennent plusieurs secondes sans aucun retour visuel : on pouvait croire
// que rien ne se passait (signale par Anthony). Ecran d'attente plein ecran jusqu'a l'arrivee
// sur Stripe ; masque en cas d'erreur ou de retour arriere depuis Stripe.
window.showPaymentLoading=(title='Redirection vers le paiement sécurisé…',text='Connexion à Stripe en cours, cela peut prendre quelques secondes. Ne fermez pas la page.')=>{
 let o=document.getElementById('abracaPaymentLoading');
 if(!o){
  if(!document.getElementById('abracaPaymentLoadingStyle')){const st=document.createElement('style');st.id='abracaPaymentLoadingStyle';st.textContent='@keyframes abracaPaySpin{to{transform:rotate(360deg)}}';document.head.append(st);}
  o=document.createElement('div');o.id='abracaPaymentLoading';o.setAttribute('role','status');o.setAttribute('aria-live','polite');
  o.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(24,10,32,.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:Inter,system-ui,sans-serif';
  o.innerHTML='<div style="max-width:380px;width:100%;background:#fff;border-radius:20px;padding:28px 24px;text-align:center;color:#24152d;box-shadow:0 24px 80px rgba(0,0,0,.35)"><div style="width:44px;height:44px;margin:0 auto 16px;border-radius:50%;border:4px solid #eadfee;border-top-color:#842aaa;animation:abracaPaySpin .8s linear infinite"></div><strong data-title style="display:block;font-size:1.1rem;margin-bottom:8px"></strong><p data-text style="margin:0;color:#74697a;line-height:1.5;font-size:.92rem"></p></div>';
  document.body.append(o);
 }
 o.querySelector('[data-title]').textContent=title;o.querySelector('[data-text]').textContent=text;o.style.display='flex';
};
window.hidePaymentLoading=()=>{const o=document.getElementById('abracaPaymentLoading');if(o)o.style.display='none';};
window.addEventListener('pageshow',()=>window.hidePaymentLoading());
