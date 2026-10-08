import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requireConsent,checkOptionListing,checkoutLegalText,VERIFY_MESSAGE,WITHDRAWAL_TEXT,NON_REFUND_TEXT} from '../supabase/functions/create-commerce-order/payment-guard.ts';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const service={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{secret_value:'internal-test-key'}})})})})};
test('paiement bloqué orange/rouge/erreur OpenAI, green accepté après un nouvel appel',async()=>{
 const original=globalThis.fetch;const calls=[];
 try{for(const result of [{ok:true,ai_checked:true,risk_level:'orange'},{ok:true,ai_checked:true,risk_level:'red'},{ok:false,ai_checked:false,ai_error:'429'},{ok:true,ai_checked:true,risk_level:'green'}]){
  globalThis.fetch=async(url,params)=>{calls.push(JSON.parse(params.body));return Response.json(result)};
  if(result.risk_level==='green')assert.equal((await checkOptionListing(service,'https://example.test','listing')).risk_level,'green');
  else await assert.rejects(checkOptionListing(service,'https://example.test','listing'),{message:VERIFY_MESSAGE});
 }
 assert.equal(calls.length,4);assert.ok(calls.every(x=>x.action==='payment_check'&&x.listing_id==='listing'));
 }finally{globalThis.fetch=original;}
});
test('consentement strict obligatoire, date serveur et mention affichée au checkout',()=>{
 for(const value of [undefined,false,'true',1,null])assert.throws(()=>requireConsent({withdrawal_accepted:value}));
 requireConsent({withdrawal_accepted:true});
 const p=new URLSearchParams();checkoutLegalText(p);
 assert.equal(p.get('consent_collection[terms_of_service]'),'required');assert.equal(p.get('custom_text[submit][message]'),NON_REFUND_TEXT);
 assert.ok(p.get('custom_text[terms_of_service_acceptance][message]').startsWith(WITHDRAWAL_TEXT));
 const source=fs.readFileSync('supabase/functions/create-commerce-order/index.ts','utf8');assert.match(source,/withdrawal_accepted_at:new Date\(\).toISOString\(\)/);
});
test('UI consentement : case décochée, bouton bloqué puis consentement explicite',async()=>{
 const checkbox={checked:false};const submit={disabled:true};const cancel={};const form={};let dialog;
 const document={createElement(){dialog={style:{},innerHTML:'',querySelector:s=>s==='input'?checkbox:s==='[type=submit]'?submit:s==='form'?form:cancel,remove(){},showModal(){}};return dialog;},body:{append(){}}};
 const context=vm.createContext({document,window:{}});vm.runInContext(fs.readFileSync('assets/option-consent.js','utf8'),context);
 const consent=context.window.confirmOptionPurchase();assert.equal(checkbox.checked,false);assert.equal(submit.disabled,true);assert.match(dialog.innerHTML,/checkbox" required/);
 checkbox.checked=true;checkbox.onchange({target:checkbox});assert.equal(submit.disabled,false);form.onsubmit({preventDefault(){}});assert.equal(await consent,true);
});
test('edge checkout : consentement absent refusé avant modération, commande et Stripe',async()=>{
 let handler;let inserted=false;let fetched=false;
 const offer={code:'private_featured',audience:'particulier',offer_type:'featured',active:true,stripe_price_id:'price_test',recurring:false};
 const admin={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:table=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:table==='commerce_offers'?offer:{account_type:'particulier'}}),insert(){inserted=true;throw Error('must not insert')}})};
 const context=vm.createContext({createClient:()=>admin,Deno:{env:{get:()=> 'test'},serve:h=>handler=h},requireConsent,checkOptionListing,checkoutLegalText,WITHDRAWAL_TEXT,Response,URLSearchParams,Error,console:{error(){}},fetch:async()=>{fetched=true;throw Error('must not fetch')}});
 const code=stripTypeScriptTypes(fs.readFileSync('supabase/functions/create-commerce-order/index.ts','utf8')).replace(/^import .*;\s*$/gm,'');vm.runInContext(code,context);
 const response=await handler(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({offer_code:'private_featured',listing_id:'listing'})}));
 assert.notEqual(response.status,200);assert.match((await response.json()).error,/renonciation/);assert.equal(inserted,false);assert.equal(fetched,false);
});
