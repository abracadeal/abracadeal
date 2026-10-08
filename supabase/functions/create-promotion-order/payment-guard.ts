export const WITHDRAWAL_TEXT="Je demande l'activation immédiate de l'option et je renonce à mon droit de rétractation.";
export const NON_REFUND_TEXT="Les options ne sont pas remboursables si l'annonce est retirée pour non-respect des règles de diffusion.";
export const VERIFY_MESSAGE="Votre annonce doit être vérifiée avant l'achat d'une option.";
export function requireConsent(body:any){if(body.withdrawal_accepted!==true)throw new Error('Vous devez accepter l’activation immédiate et la renonciation au droit de rétractation.');}
export async function checkOptionListing(admin:any,url:string,id:string){
 const {data:key,error}=await admin.from('integration_secrets').select('secret_value').eq('name','pro_stock_moderation_internal').single();
 if(error||!key?.secret_value)throw new Error(VERIFY_MESSAGE);
 let result:any;
 try{
  const r=await fetch(url+'/functions/v1/moderate-listing',{method:'POST',headers:{'Content-Type':'application/json','x-internal-moderation-key':key.secret_value},body:JSON.stringify({listing_id:id,action:'payment_check'}),signal:AbortSignal.timeout(85000)});
  result=await r.json();if(!r.ok)throw new Error(VERIFY_MESSAGE);
 }catch(_){throw new Error(VERIFY_MESSAGE);}
 if(!result.ok||result.ai_checked!==true||result.risk_level!=='green')throw new Error(VERIFY_MESSAGE);
 return result;
}
export function checkoutLegalText(params:URLSearchParams){
 params.set('custom_text[submit][message]',NON_REFUND_TEXT);
 params.set('consent_collection[terms_of_service]','required');
 params.set('custom_text[terms_of_service_acceptance][message]',WITHDRAWAL_TEXT+' [Conditions de vente](https://abracadeal.fr/cgu.html#options).');
}
