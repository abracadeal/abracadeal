import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Fonction interne (18/10/2026) : nouvelle grille Pro Auto/Moto/Immo
// 20 annonces = 149,99 € HT, 50 = 299,99 € HT, 100 = 499,99 € HT par mois.
// Crée les nouveaux prix Stripe sur les produits existants, met à jour le catalogue
// (pro_subscription_plans + commerce_offers) puis archive les anciens prix.
// Idempotente : un plan déjà au bon montant avec un prix Stripe conforme n'est pas retouché.
// Protégée par la clé interne de modération ; ne sait rien faire d'autre.
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const GRILLE:Record<string,{cents:number,label:string}>={
  pro_20:{cents:14999,label:"20 annonces actives — 149,99 € HT/mois"},
  pro_50:{cents:29999,label:"50 annonces actives — 299,99 € HT/mois"},
  pro_100:{cents:49999,label:"100 annonces actives — 499,99 € HT/mois"},
};
const ANCIENS:Record<string,string>={pro_20:"price_1UQ6Lq1ebJH1208If0JdnXqY",pro_50:"price_1UQ6Lx1ebJH1208IdExNy6uZ",pro_100:"price_1UQ6M41ebJH1208IH0RUSKQF"};
async function stripe(path:string,body?:URLSearchParams){const r=await fetch("https://api.stripe.com/v1/"+path,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+stripeKey,...(body?{"Content-Type":"application/x-www-form-urlencoded"}:{})},body});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Stripe "+path+": "+(d?.error?.message||r.status));return d}
Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const key=req.headers.get("x-internal-key")||"";
  const {data:sec}=await admin.from("integration_secrets").select("secret_value").eq("name","pro_stock_moderation_internal").maybeSingle();
  if(!key||!sec?.secret_value||key!==sec.secret_value)return json({error:"forbidden"},403);
  if(!stripeKey)return json({error:"stripe_key_missing"},500);
  const report:any[]=[];
  try{
    for(const [code,g] of Object.entries(GRILLE)){
      const {data:plan,error}=await admin.from("pro_subscription_plans").select("code,amount_cents,stripe_price_id").eq("code",code).maybeSingle();
      if(error||!plan)throw new Error("Plan introuvable : "+code);
      const oldId=String(plan.stripe_price_id||"");
      let oldPrice:any=null;if(oldId.startsWith("price_"))oldPrice=await stripe("prices/"+encodeURIComponent(oldId));
      if(oldPrice&&Number(oldPrice.unit_amount)===g.cents&&oldPrice.active===true&&Number(plan.amount_cents)===g.cents){
        // Déjà à jour : on finit le ménage (prix par défaut du produit + archivage de l'ancien prix de la grille précédente).
        const prev=ANCIENS[code];let archived=false;
        await stripe("products/"+encodeURIComponent(String(oldPrice.product)),new URLSearchParams({default_price:oldId}));
        if(prev){const pp=await stripe("prices/"+encodeURIComponent(prev));if(pp.active===true){await stripe("prices/"+encodeURIComponent(prev),new URLSearchParams({active:"false"}));archived=true}}
        report.push({code,unchanged:true,price:oldId,old_archived:archived});continue}
      const p=new URLSearchParams();p.set("currency","eur");p.set("unit_amount",String(g.cents));p.set("recurring[interval]","month");p.set("tax_behavior","exclusive");
      if(oldPrice?.product)p.set("product",String(oldPrice.product));else{p.set("product_data[name]",g.label);p.set("product_data[metadata][abraca_plan_code]",code)}
      p.set("metadata[abraca_plan_code]",code);p.set("metadata[abracadeal_key]",code+"_monthly");p.set("metadata[grille]","2026-10-18");
      const created=await stripe("prices",p);
      const now=new Date().toISOString();
      const u1=await admin.from("pro_subscription_plans").update({amount_cents:g.cents,label:g.label,stripe_price_id:created.id,updated_at:now}).eq("code",code);if(u1.error)throw u1.error;
      const u2=await admin.from("commerce_offers").update({amount_cents:g.cents,stripe_price_id:created.id,updated_at:now}).eq("code",code);if(u2.error)throw u2.error;
      if(oldPrice?.product)await stripe("products/"+encodeURIComponent(String(oldPrice.product)),new URLSearchParams({default_price:String(created.id)}));
      let archived=false;if(oldPrice?.id&&oldPrice.active===true){await stripe("prices/"+encodeURIComponent(oldPrice.id),new URLSearchParams({active:"false"}));archived=true}
      report.push({code,old_price:oldId||null,old_amount:plan.amount_cents,new_price:created.id,new_amount:g.cents,livemode:created.livemode,old_archived:archived});
    }
    return json({ok:true,report});
  }catch(e){console.error(e);return json({ok:false,error:e instanceof Error?e.message:String(e),report},500)}
});
