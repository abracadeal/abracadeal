import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Fonction interne : crée (si absent) le coupon Stripe de la formule 100 (-20 % pendant 6 mois).
// Protégée par la clé interne de modération ; ne sait rien faire d'autre.
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
const ID="ABRACA_PRO100_LANCEMENT";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const key=req.headers.get("x-internal-key")||"";
  const {data}=await admin.from("integration_secrets").select("secret_value").eq("name","pro_stock_moderation_internal").maybeSingle();
  if(!key||!data?.secret_value||key!==data.secret_value)return json({error:"forbidden"},403);
  if(!stripeKey)return json({error:"stripe_key_missing"},500);
  const h={Authorization:"Bearer "+stripeKey};
  const g=await fetch("https://api.stripe.com/v1/coupons/"+ID,{headers:h});
  if(g.ok){const c=await g.json();return json({ok:true,existed:true,id:c.id,percent_off:c.percent_off,duration:c.duration,months:c.duration_in_months,valid:c.valid,livemode:c.livemode});}
  const p=new URLSearchParams();p.set("id",ID);p.set("name","Formule 100 : -20 % pendant 6 mois");p.set("percent_off","20");p.set("duration","repeating");p.set("duration_in_months","6");p.set("metadata[abraca_plan_code]","pro_100");
  const r=await fetch("https://api.stripe.com/v1/coupons",{method:"POST",headers:{...h,"Content-Type":"application/x-www-form-urlencoded"},body:p});
  const c=await r.json().catch(()=>({}));
  if(!r.ok)return json({ok:false,status:r.status,error:c?.error?.message||"stripe_error"},502);
  return json({ok:true,created:true,id:c.id,percent_off:c.percent_off,duration:c.duration,months:c.duration_in_months,valid:c.valid,livemode:c.livemode});
});
