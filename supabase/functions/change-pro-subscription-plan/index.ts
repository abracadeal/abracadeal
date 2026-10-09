import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Passage à une formule Pro supérieure (ex. 20 -> 50 annonces) sans perdre le statut Fondateur.
// - Abonnement Fondateur (planning Stripe) : chaque phase restante garde ses dates, sa gratuité et sa remise -50 %,
//   seul le prix change. Aucune facturation pendant la période gratuite.
// - Abonnement classique : changement de prix immédiat, la différence au prorata est facturée tout de suite.
// Le quota d'annonces est mis à jour ici puis confirmé par le webhook customer.subscription.updated.
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
async function stripe(path:string,body?:URLSearchParams){const r=await fetch("https://api.stripe.com/v1/"+path,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+stripeKey,...(body?{"Content-Type":"application/x-www-form-urlencoded"}:{})},body});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Stripe: "+(d?.error?.message||"Erreur Stripe"));return d}
const idOf=(x:any)=>typeof x==="string"?x:x?.id;

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return json({error:"Connexion requise"},401);
  const {data:authData,error:authError}=await admin.auth.getUser(token);const user=authData?.user;
  if(authError||!user)return json({error:"Session invalide"},401);
  const body=await req.json().catch(()=>({}));const planCode=String(body?.plan_code||"").trim();
  if(!planCode)return json({error:"Formule manquante"},400);
  if(body?.confirm!==true)return json({error:"Confirmation requise"},400);
  const [{data:profile},{data:verification},{data:target},{data:sub}]=await Promise.all([
   admin.from("profiles").select("account_type").eq("id",user.id).maybeSingle(),
   admin.from("pro_verifications").select("verified_at").eq("user_id",user.id).maybeSingle(),
   admin.from("pro_subscription_plans").select("*").eq("code",planCode).eq("active",true).maybeSingle(),
   admin.from("pro_subscriptions").select("*").eq("user_id",user.id).maybeSingle()]);
  if(profile?.account_type!=="professionnel")return json({error:"Compte professionnel requis"},403);
  if(!verification?.verified_at)return json({error:"Compte professionnel non vérifié"},403);
  if(!target||!String(target.stripe_price_id||"").startsWith("price_"))return json({error:"Formule indisponible"},400);
  if(!sub?.stripe_subscription_id||!["active","trialing"].includes(String(sub.status)))return json({error:"Aucun abonnement Pro actif à faire évoluer"},409);
  if(sub.cancel_at_period_end)return json({error:"Votre abonnement est en cours de résiliation : réactivez-le avant de changer de formule."},409);
  const {data:current}=await admin.from("pro_subscription_plans").select("*").eq("code",sub.plan_code).maybeSingle();
  if(!current)return json({error:"Formule actuelle introuvable"},409);
  if(current.offer_group!==target.offer_group)return json({error:"Cette formule ne correspond pas à votre activité"},400);
  if(Number(target.listing_limit)<=Number(current.listing_limit))return json({error:"Seul le passage à une formule supérieure est possible ici. Contactez-nous pour réduire votre formule."},400);
  const isFounder=sub.founder_number!=null;
  if(isFounder&&target.founder_eligible!==true)return json({error:"Cette formule n’est pas couverte par l’offre Fondateurs : contactez-nous pour en changer sans perdre vos avantages."},409);
  if(!stripeKey)return json({error:"Paiement Stripe indisponible"},503);
  const price=await stripe("prices/"+encodeURIComponent(target.stripe_price_id));
  if(price?.active!==true||price?.livemode!==false||price?.type!=="recurring"||Number(price?.unit_amount)!==Number(target.amount_cents))return json({error:"Tarif Stripe incohérent avec le catalogue Abracadeal"},503);
  const s=await stripe("subscriptions/"+encodeURIComponent(sub.stripe_subscription_id));
  if(!["active","trialing"].includes(String(s.status)))return json({error:"Abonnement Stripe inactif"},409);
  const now=Math.floor(Date.now()/1000);const trialing=String(s.status)==="trialing";
  const scheduleId=idOf(s.schedule);
  if(scheduleId){
   const sch=await stripe("subscription_schedules/"+encodeURIComponent(scheduleId));
   const phases=(sch.phases||[]).filter((ph:any)=>Number(ph.end_date||0)>now);
   if(!phases.length)return json({error:"Planning d’abonnement introuvable"},409);
   const p=new URLSearchParams();p.set("end_behavior",String(sch.end_behavior||"release"));p.set("proration_behavior",trialing?"none":"always_invoice");
   phases.forEach((ph:any,i:number)=>{const k=`phases[${i}]`;p.set(k+"[start_date]",String(ph.start_date));p.set(k+"[end_date]",String(ph.end_date));p.set(k+"[items][0][price]",target.stripe_price_id);p.set(k+"[items][0][quantity]","1");p.set(k+"[proration_behavior]","none");if(ph.trial_end)p.set(k+"[trial_end]",String(ph.trial_end));
    (ph.discounts||[]).forEach((d:any,j:number)=>{const c=idOf(d?.coupon);if(c)p.set(k+`[discounts][${j}][coupon]`,c)});
    if(!(ph.discounts||[]).length&&ph.coupon)p.set(k+"[discounts][0][coupon]",String(idOf(ph.coupon)));});
   await stripe("subscription_schedules/"+encodeURIComponent(scheduleId),p);
  }else{
   const item=(s.items?.data||[])[0];if(!item?.id)return json({error:"Abonnement Stripe incomplet"},409);
   const p=new URLSearchParams();p.set("items[0][id]",item.id);p.set("items[0][price]",target.stripe_price_id);p.set("items[0][quantity]","1");p.set("proration_behavior",trialing?"none":"always_invoice");p.set("payment_behavior","error_if_incomplete");p.set("metadata[abraca_plan_code]",target.code);
   await stripe("subscriptions/"+encodeURIComponent(sub.stripe_subscription_id),p);
  }
  const {error:uErr}=await admin.from("pro_subscriptions").update({plan_code:target.code,listing_limit:Number(target.listing_limit),updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("stripe_subscription_id",sub.stripe_subscription_id);
  if(uErr)throw uErr;
  return json({ok:true,plan_code:target.code,listing_limit:Number(target.listing_limit),founder:isFounder,
   message:isFounder&&trialing?"Formule "+target.listing_limit+" annonces activée. Vous restez Fondateur : toujours gratuit jusqu’à la fin de vos 12 mois, puis -50 % la 2e année.":"Formule "+target.listing_limit+" annonces activée. La différence au prorata est facturée maintenant."});
 }catch(error){console.error(error);return json({error:error instanceof Error?error.message:"Changement de formule impossible"},500)}
});
