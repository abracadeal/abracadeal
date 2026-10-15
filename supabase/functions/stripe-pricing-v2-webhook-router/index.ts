import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_KEY=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function hmac(secret:string,message:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message)))}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
async function verify(payload:string,header:string,secret:string){const parts=header.split(",").map(x=>x.trim());const t=parts.find(x=>x.startsWith("t="))?.slice(2)||"";const sigs=parts.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));if(!t||!sigs.length)return false;const ts=Number(t);if(!Number.isFinite(ts)||Math.abs(Math.floor(Date.now()/1000)-ts)>300)return false;const expected=await hmac(secret,`${t}.${payload}`);return sigs.some(s=>safeEqual(s,expected))}
async function stripeGet(path:string){const r=await fetch("https://api.stripe.com/v1/"+path,{headers:{Authorization:"Bearer "+STRIPE_KEY}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Stripe: "+(d?.error?.message||"Erreur Stripe"));return d}
async function forwardOriginal(payload:string,signature:string){return fetch(SUPABASE_URL+"/functions/v1/stripe-pricing-v2-webhook",{method:"POST",headers:{"Content-Type":"application/json","stripe-signature":signature},body:payload})}
Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const payload=await req.text();
  const signature=req.headers.get("stripe-signature")||"";
  try{
    const {data:secretRow,error:secretError}=await admin.from("integration_secrets").select("secret_value").eq("name","stripe_pricing_v2_webhook_test").maybeSingle();
    if(secretError||!secretRow?.secret_value)return json({error:"Webhook non configuré"},500);
    if(!await verify(payload,signature,String(secretRow.secret_value)))return json({error:"Signature invalide"},400);
    const event=JSON.parse(payload);

    if(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event?.type)){
      const sub=event?.data?.object||{};
      const subscriptionId=typeof sub.id==="string"?sub.id:"";
      const customerId=typeof sub.customer==="string"?sub.customer:"";
      const status=event.type==="customer.subscription.deleted"?"canceled":String(sub.status||"active");
      const updates:any={status,cancel_at_period_end:(!!sub.cancel_at_period_end||(!!sub.cancel_at&&!sub.ended_at)),updated_at:new Date().toISOString()};
      if(event.type!=="customer.subscription.deleted"){
        if(Number.isFinite(Number(sub.current_period_start)))updates.current_period_start=new Date(Number(sub.current_period_start)*1000).toISOString();
        if(Number.isFinite(Number(sub.current_period_end)))updates.current_period_end=new Date(Number(sub.current_period_end)*1000).toISOString();
        const items=sub.items?.data||[];
        const priceId=items.length===1?(typeof items[0]?.price==="string"?items[0].price:items[0]?.price?.id):null;
        if(priceId){const {data:plan}=await admin.from("pro_subscription_plans").select("code,listing_limit").eq("stripe_price_id",priceId).eq("active",true).maybeSingle();if(plan){updates.plan_code=plan.code;updates.listing_limit=plan.listing_limit}}
      }
      let changed:any[]=[];
      if(subscriptionId){const {data,error}=await admin.from("pro_subscriptions").update(updates).eq("stripe_subscription_id",subscriptionId).select("user_id");if(error)throw error;changed=data||[]}
      if(!changed.length&&customerId){const {data,error}=await admin.from("pro_subscriptions").update(updates).eq("stripe_customer_id",customerId).select("user_id");if(error)throw error;changed=data||[]}
      return json({received:true,type:"subscription_lifecycle",event:event.type,updated:changed.length});
    }

    if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event?.type)){
      const session=event?.data?.object||{};
      const ref=String(session.client_reference_id||"").trim();
      if(ref){
        const {data:order,error:orderError}=await admin.from("pro_subscription_orders").select("*").eq("id",ref).maybeSingle();
        if(orderError)throw orderError;
        if(order){
          if(order.status==="completed")return json({received:true,duplicate:true,type:"pro_subscription"});
          const {data:plan,error:planError}=await admin.from("pro_subscription_plans").select("*").eq("code",order.plan_code).eq("active",true).maybeSingle();
          if(planError||!plan)throw planError||new Error("Plan Pro introuvable");
          if(String(session.id||"")!==String(order.stripe_checkout_session_id||""))return json({error:"Session Pro incohérente"},400);
          if(String(session.mode||"")!=="subscription"||String(session.status||"")!=="complete")return json({received:true,waiting:true,type:"pro_subscription"});
          const subId=typeof session.subscription==="string"?session.subscription:null;
          if(!subId||!STRIPE_KEY)return json({error:"Abonnement Stripe manquant"},400);
          const sub=await stripeGet("subscriptions/"+encodeURIComponent(subId));
          const items=sub.items?.data||[];const item=items[0];const subPriceId=typeof item?.price==="string"?item.price:item?.price?.id;
          if(items.length!==1||Number(item?.quantity||1)!==1||String(subPriceId||"")!==String(plan.stripe_price_id||""))return json({error:"Tarif Pro Stripe incohérent"},400);
          const isFounder=order.founder_number!==null;
          let founder:any=null;
          if(isFounder){
            const {data:f,error:fError}=await admin.from("founder_enrollments").select("*").eq("user_id",order.user_id).maybeSingle();
            if(fError||!f||f.revoked_at)return json({error:"Statut Fondateur invalide"},409);
            founder=f;
            const expectedTrial=Math.floor(new Date(f.free_until).getTime()/1000);
            if(Math.abs(Number(sub.trial_end||0)-expectedTrial)>120)return json({error:"Essai Fondateur incorrect"},400);
          }else if(String(session.payment_status)!=="paid"){
            return json({received:true,waiting:true,type:"pro_subscription"});
          }
          const nowIso=new Date().toISOString();
          const currentPeriodStart=Number.isFinite(Number(sub.current_period_start))?new Date(Number(sub.current_period_start)*1000).toISOString():null;
          const currentPeriodEnd=Number.isFinite(Number(sub.current_period_end))?new Date(Number(sub.current_period_end)*1000).toISOString():null;
          const {error:subError}=await admin.from("pro_subscriptions").upsert({user_id:order.user_id,plan_code:order.plan_code,listing_limit:Number(plan.listing_limit),status:isFounder?"trialing":String(sub.status||"active"),source:"stripe",stripe_customer_id:typeof session.customer==="string"?session.customer:null,stripe_subscription_id:subId,stripe_checkout_session_id:session.id,founder_number:isFounder?founder.founder_number:null,founder_free_until:isFounder?founder.free_until:null,founder_discount_until:isFounder?founder.free_until:null,founder_discount_percent:isFounder?0:null,enrolled_at:isFounder?founder.enrolled_at:order.enrolled_at,free_until:isFounder?founder.free_until:null,billing_starts_at:isFounder?founder.free_until:nowIso,current_period_start:currentPeriodStart,current_period_end:currentPeriodEnd,cancel_at_period_end:(!!sub.cancel_at_period_end||(!!sub.cancel_at&&!sub.ended_at)),updated_at:nowIso},{onConflict:"user_id"});
          if(subError)throw subError;
          const {error:completeError}=await admin.from("pro_subscription_orders").update({status:"completed",stripe_customer_id:typeof session.customer==="string"?session.customer:null,stripe_subscription_id:subId,completed_at:nowIso,updated_at:nowIso}).eq("id",order.id).eq("status","pending");
          if(completeError)throw completeError;
          return json({received:true,activated:true,type:"pro_subscription",plan:order.plan_code,founder:isFounder});
        }
      }
    }

    const forwarded=await forwardOriginal(payload,signature);
    return new Response(await forwarded.text(),{status:forwarded.status,headers:{"Content-Type":forwarded.headers.get("Content-Type")||"application/json"}});
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:"Erreur webhook"},500)}
});
