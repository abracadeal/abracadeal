import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Filet de sécurité : tout abonnement Pro en période gratuite dont la résiliation a été demandée
// est annulé immédiatement chez Stripe (règle : arrêt immédiat en cas de résiliation pendant la période gratuite).
// Protégée par la clé interne ; appelée par le cron et en secours.
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const KEY=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
async function stripe(path:string,method="GET",body?:URLSearchParams){const r=await fetch("https://api.stripe.com/v1/"+path,{method,headers:{Authorization:"Bearer "+KEY,...(body?{"Content-Type":"application/x-www-form-urlencoded"}:{})},body});const d=await r.json().catch(()=>({}));return {ok:r.ok,d};}
Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const {data:sec}=await admin.from("integration_secrets").select("secret_value").eq("name","pro_stock_moderation_internal").maybeSingle();
  const k=req.headers.get("x-internal-key")||"";
  if(!k||!sec?.secret_value||k!==sec.secret_value)return json({error:"forbidden"},403);
  if(!KEY)return json({error:"stripe_key_missing"},500);
  const {data:rows,error}=await admin.from("pro_subscriptions").select("user_id,stripe_subscription_id").eq("status","trialing").eq("cancel_at_period_end",true).not("stripe_subscription_id","is",null);
  if(error)return json({error:error.message},500);
  const results:any[]=[];
  for(const row of rows||[]){
    const id=String(row.stripe_subscription_id);
    const g=await stripe("subscriptions/"+encodeURIComponent(id));
    const s=g.d||{};
    if(!g.ok){results.push({id,skipped:"lecture_impossible"});continue;}
    if(s.status==="canceled"){await admin.from("pro_subscriptions").update({status:"canceled",updated_at:new Date().toISOString()}).eq("stripe_subscription_id",id);results.push({id,already:true});continue;}
    if(s.status!=="trialing"||!(s.cancel_at_period_end||s.cancel_at)){results.push({id,skipped:"pas_concerne"});continue;}
    const d=await stripe("subscriptions/"+encodeURIComponent(id),"DELETE",new URLSearchParams({invoice_now:"false",prorate:"false"}));
    if(!d.ok){results.push({id,error:d.d?.error?.message||"annulation_impossible"});continue;}
    await admin.from("pro_subscriptions").update({status:"canceled",updated_at:new Date().toISOString()}).eq("stripe_subscription_id",id);
    results.push({id,canceled:true});
  }
  // 18/10/2026 : Fondateurs ayant perdu l'offre pour inactivité (60 jours sans annonce en ligne) : arrêt immédiat chez Stripe.
  const {data:lost}=await admin.from("founder_enrollments").select("user_id").eq("revoked_reason","inactivity");
  const lostIds=(lost||[]).map((x:any)=>x.user_id);
  let inactive:any[]=[];
  if(lostIds.length){const {data:subs}=await admin.from("pro_subscriptions").select("user_id,stripe_subscription_id").in("user_id",lostIds).in("status",["trialing","active"]).not("founder_number","is",null).not("stripe_subscription_id","is",null);inactive=subs||[];}
  for(const row of inactive){
    const id=String(row.stripe_subscription_id);
    const g=await stripe("subscriptions/"+encodeURIComponent(id));
    if(!g.ok){results.push({id,inactivity:true,skipped:"lecture_impossible"});continue;}
    if(g.d?.status!=="canceled"){const d=await stripe("subscriptions/"+encodeURIComponent(id),"DELETE",new URLSearchParams({invoice_now:"false",prorate:"false"}));if(!d.ok){results.push({id,inactivity:true,error:d.d?.error?.message||"annulation_impossible"});continue;}}
    await admin.from("pro_subscriptions").update({status:"canceled",updated_at:new Date().toISOString()}).eq("stripe_subscription_id",id);
    results.push({id,inactivity:true,canceled:true});
  }
  return json({ok:true,checked:(rows||[]).length,inactive:inactive.length,results});
});
