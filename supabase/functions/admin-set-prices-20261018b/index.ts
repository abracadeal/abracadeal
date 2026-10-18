import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Fonction interne (18/10/2026, 2e passe) : grille de prix cohérente sur tout le catalogue.
// - tous les prix en ,99
// - Emploi divisé par ~2,5 ; Services et Emploi alignés
// - annonce Pro à l'unité Auto/Moto/Immo : 24,99 € -> 14,99 € HT
// Pour chaque code : nouveau prix Stripe sur le même produit (même type unique/mensuel),
// mise à jour de commerce_offers et pro_subscription_plans, puis archivage de l'ancien prix.
// Idempotente. Protégée par la clé interne de modération ; ne sait rien faire d'autre.
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const GRILLE:Record<string,number>={
  pro_autoimmo_single:1499,
  emploi_1:1999, emploi_5:6999, emploi_10:9999,
  emploi_30:9999, emploi_100:19999, emploi_250:34999, emploi_500:59999,
  services_1:1999, services_5:6999, services_10:9999,
  hightech_100:6999,
  maison_30:3999, maison_100:8999,
  mode_30:1999, mode_100:4999,
  vacances_20:4999, vacances_60:9999,
};
const eur=(c:number)=>(c/100).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g," ");
async function stripe(path:string,body?:URLSearchParams){const r=await fetch("https://api.stripe.com/v1/"+path,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+stripeKey,...(body?{"Content-Type":"application/x-www-form-urlencoded"}:{})},body});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Stripe "+path+": "+(d?.error?.message||r.status));return d}
Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const key=req.headers.get("x-internal-key")||"";
  const {data:sec}=await admin.from("integration_secrets").select("secret_value").eq("name","pro_stock_moderation_internal").maybeSingle();
  if(!key||!sec?.secret_value||key!==sec.secret_value)return json({error:"forbidden"},403);
  if(!stripeKey)return json({error:"stripe_key_missing"},500);
  const report:any[]=[];
  try{
    for(const [code,cents] of Object.entries(GRILLE)){
      const [{data:offer},{data:plan}]=await Promise.all([
        admin.from("commerce_offers").select("code,label,amount_cents,stripe_price_id,recurring").eq("code",code).maybeSingle(),
        admin.from("pro_subscription_plans").select("code,label,amount_cents,stripe_price_id").eq("code",code).maybeSingle()]);
      if(!offer&&!plan)throw new Error("Code introuvable : "+code);
      const oldId=String(offer?.stripe_price_id||plan?.stripe_price_id||"");
      if(!oldId.startsWith("price_"))throw new Error("Pas de prix Stripe pour "+code);
      const old=await stripe("prices/"+encodeURIComponent(oldId));
      const dbOk=(!offer||Number(offer.amount_cents)===cents)&&(!plan||Number(plan.amount_cents)===cents);
      // Type attendu : une offre ponctuelle (recurring=false) doit avoir un prix Stripe unique, pas mensuel.
      const wantOneTime=!plan&&offer&&offer.recurring===false;
      const typeOk=!wantOneTime||old.type==="one_time";
      if(Number(old.unit_amount)===cents&&old.active===true&&dbOk&&typeOk){report.push({code,unchanged:true});continue}
      let priceId=oldId;
      if(Number(old.unit_amount)!==cents||!typeOk){
        const p=new URLSearchParams();p.set("currency",String(old.currency||"eur"));p.set("unit_amount",String(cents));
        if(typeOk)p.set("product",String(old.product));else{p.set("product_data[name]",String(offer.label||code));p.set("product_data[metadata][abracadeal_code]",code);}
        if(old.tax_behavior&&old.tax_behavior!=="unspecified")p.set("tax_behavior",String(old.tax_behavior));
        if(old.type==="recurring"&&typeOk){p.set("recurring[interval]",String(old.recurring?.interval||"month"));p.set("recurring[interval_count]",String(old.recurring?.interval_count||1));}
        for(const [k,v] of Object.entries(old.metadata||{}))p.set(`metadata[${k}]`,String(v));
        p.set("metadata[abraca_plan_code]",code);p.set("metadata[grille]","2026-10-18b");
        const created=await stripe("prices",p);priceId=String(created.id);
      }
      const now=new Date().toISOString();
      if(offer){const u=await admin.from("commerce_offers").update({amount_cents:cents,stripe_price_id:priceId,updated_at:now}).eq("code",code);if(u.error)throw u.error}
      if(plan){
        const label=String(plan.label||"").replace(/ — [\d\s ,]+ € HT\/mois$/," — "+eur(cents)+" € HT/mois");
        const u=await admin.from("pro_subscription_plans").update({amount_cents:cents,label,stripe_price_id:priceId,updated_at:now}).eq("code",code);if(u.error)throw u.error}
      let archived=false;
      if(priceId!==oldId&&typeOk){
        try{const prod=await stripe("products/"+encodeURIComponent(String(old.product)));if((typeof prod.default_price==="string"?prod.default_price:prod.default_price?.id)===oldId)await stripe("products/"+encodeURIComponent(String(old.product)),new URLSearchParams({default_price:priceId}));}catch(_){}
        await stripe("prices/"+encodeURIComponent(oldId),new URLSearchParams({active:"false"}));archived=true;
      }
      report.push({code,old_amount:Number(old.unit_amount),new_amount:cents,old_price:oldId,new_price:priceId,type:old.type,old_archived:archived});
    }
    return json({ok:true,report});
  }catch(e){console.error(e);return json({ok:false,error:e instanceof Error?e.message:String(e),report},500)}
});
