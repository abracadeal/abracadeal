import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});

function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function hmac(secret:string,message:string){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message)))
}
function safeEqual(a:string,b:string){
  if(a.length!==b.length)return false;
  let d=0;
  for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);
  return d===0
}
async function verifyStripe(payload:string,h:string,secret:string){
  const p=h.split(",").map(x=>x.trim());
  const t=p.find(x=>x.startsWith("t="))?.slice(2)||"";
  const sigs=p.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));
  if(!t||!sigs.length)return false;
  const ts=Number(t);
  if(!Number.isFinite(ts)||Math.abs(Math.floor(Date.now()/1000)-ts)>300)return false;
  const expected=await hmac(secret,`${t}.${payload}`);
  return sigs.some(s=>safeEqual(s,expected))
}

Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const payload=await req.text();
    const signature=req.headers.get("stripe-signature")||"";
    // Trust only the signing secret for the Stripe test environment that
    // actually owns this site's Pro and Vacances products.
    const {data:webhookSecret,error:secretError}=await admin
      .from("integration_secrets")
      .select("secret_value")
      .eq("name","stripe_webhook_test")
      .single();
    if(secretError||!webhookSecret?.secret_value)return json({error:"Webhook non configuré"},500);
    if(!await verifyStripe(payload,signature,webhookSecret.secret_value))return json({error:"Signature invalide"},400);

    const event=JSON.parse(payload);

    if(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event?.type)){
      const sub=event?.data?.object||{};
      const subscriptionId=typeof sub.id==="string"?sub.id:"";
      const customerId=typeof sub.customer==="string"?sub.customer:"";
      const status=event.type==="customer.subscription.deleted"?"canceled":String(sub.status||"active");
      const updates:any={
        status,
        cancel_at_period_end:!!sub.cancel_at_period_end,
        updated_at:new Date().toISOString()
      };
      // On immediate cancellation, keep the previously stored end-of-access date.
      // For normal create/update events, continue syncing Stripe billing-period dates.
      if(event.type!=="customer.subscription.deleted"){
        if(Number.isFinite(Number(sub.current_period_start))){
          updates.current_period_start=new Date(Number(sub.current_period_start)*1000).toISOString();
        }
        if(Number.isFinite(Number(sub.current_period_end))){
          updates.current_period_end=new Date(Number(sub.current_period_end)*1000).toISOString();
        }
      }

      // A plan change in the Stripe portal must update the user's real quota.
      // Only accept active Pro prices from our server-side plan catalogue.
      if(event.type==="customer.subscription.updated" || event.type==="customer.subscription.created"){
        const priceIds=(sub.items?.data||[]).map((item:any)=>
          typeof item?.price==="string"?item.price:item?.price?.id
        ).filter((id:unknown)=>typeof id==="string");
        if(priceIds.length===1){
          const {data:matchedPlan,error:planError}=await admin
            .from("pro_subscription_plans")
            .select("code,listing_limit")
            .eq("stripe_price_id",priceIds[0])
            .eq("active",true)
            .maybeSingle();
          if(planError)throw planError;
          if(matchedPlan){
            updates.plan_code=matchedPlan.code;
            updates.listing_limit=matchedPlan.listing_limit;
          }
        }
      }

      let updatedRows:any[]=[];
      if(subscriptionId){
        const {data,error}=await admin
          .from("pro_subscriptions")
          .update(updates)
          .eq("stripe_subscription_id",subscriptionId)
          .select("user_id");
        if(error)throw error;
        updatedRows=data||[];
      }
      if(!updatedRows.length&&customerId){
        const {data,error}=await admin
          .from("pro_subscriptions")
          .update(updates)
          .eq("stripe_customer_id",customerId)
          .select("user_id");
        if(error)throw error;
        updatedRows=data||[];
      }

      // Vacation subscriptions have their own host table; keeping their status
      // in sync makes self-service cancellation effective after the paid period.
      let vacationUpdated=0;
      if(subscriptionId){
        const vacationChanges:any={subscription_status:status,updated_at:new Date().toISOString()};
        if(["canceled","unpaid","incomplete_expired"].includes(status))vacationChanges.status="paused";
        else if(["trialing","active"].includes(status))vacationChanges.status="active";
        const {data:hosts,error:hostLifecycleError}=await admin.from("vacation_hosts")
          .update(vacationChanges)
          .eq("stripe_subscription_id",subscriptionId)
          .select("user_id");
        if(hostLifecycleError)throw hostLifecycleError;
        vacationUpdated=(hosts||[]).length;
      }
      return json({
        received:true,
        type:"subscription_lifecycle",
        event:event.type,
        status,
        cancel_at_period_end:!!sub.cancel_at_period_end,
        pro_updated:updatedRows.length,
        vacation_updated:vacationUpdated
      });
    }

    if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event?.type)){
      return json({received:true});
    }

    const session=event?.data?.object||{};
    const referenceId=String(session.client_reference_id||"").trim();
    if(!referenceId)return json({received:true,ignored:"client_reference_id manquant"});


    // 1) Abracadeal Pro recurring subscriptions
    const {data:proOrder,error:proOrderError}=await admin
      .from("pro_subscription_orders")
      .select("*")
      .eq("id",referenceId)
      .maybeSingle();
    if(proOrderError)throw proOrderError;

    if(proOrder){
      if(proOrder.status==="completed")return json({received:true,duplicate:true,type:"pro_subscription"});
      if(proOrder.expected_payment_link_id==="checkout_session"){
        if(String(session.id||"")!==String(proOrder.stripe_checkout_session_id||""))return json({error:"Session Stripe Pro incohérente"},400);
      }else if(String(session.payment_link||"")!==String(proOrder.expected_payment_link_id||"")){
        return json({error:"Lien Stripe Pro incohérent"},400);
      }
      if(String(session.mode||"")!=="subscription"||String(session.status||"")!=="complete"){
        return json({received:true,waiting:true,type:"pro_subscription"});
      }

      const {data:plan,error:planError}=await admin
        .from("pro_subscription_plans")
        .select("code,listing_limit")
        .eq("code",proOrder.plan_code)
        .single();
      if(planError||!plan)throw planError||new Error("Plan Pro introuvable");

      const founder=proOrder.founder_number!==null&&proOrder.plan_code==="pro_20"&&proOrder.free_until!==null&&new Date(proOrder.billing_starts_at).getTime()>Date.now();
      if(!founder&&session.payment_status!=="paid")return json({received:true,waiting:true,type:"pro_subscription"});

      const nowIso=new Date().toISOString();
      const customerId=typeof session.customer==="string"?session.customer:null;
      const subscriptionId=typeof session.subscription==="string"?session.subscription:null;

      const {data:founderRow}=await admin
        .from("founder_enrollments")
        .select("founder_number,free_until,discount_until,discount_percent")
        .eq("user_id",proOrder.user_id)
        .maybeSingle();

      // Verify the exact Stripe price, trial and coupon before granting access.
      const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
      if(!stripeKey||!subscriptionId)return json({error:"Vérification abonnement Pro indisponible"},503);
      const stripeRequest=async(path:string,params?:URLSearchParams)=>{
        const response=await fetch("https://api.stripe.com/v1/"+path,{method:params?"POST":"GET",headers:{"Authorization":"Bearer "+stripeKey,...(params?{"Content-Type":"application/x-www-form-urlencoded"}:{})},body:params});
        const data=await response.json();
        if(!response.ok)throw new Error("Stripe: "+(data?.error?.message||"Échec de synchronisation"));
        return data;
      };
      const stripeSub=await stripeRequest("subscriptions/"+encodeURIComponent(subscriptionId));
      const {data:expectedPlan}=await admin.from("pro_subscription_plans").select("stripe_price_id").eq("code",proOrder.plan_code).single();
      if(stripeSub.items?.data?.length!==1||stripeSub.items.data[0]?.price?.id!==expectedPlan?.stripe_price_id||Number(stripeSub.items.data[0]?.quantity||1)!==1)return json({error:"Tarif Pro Stripe incohérent"},400);
      const founderDiscount=proOrder.founder_number!==null&&proOrder.plan_code!=="pro_20"&&founderRow?.discount_until&&new Date(founderRow.discount_until).getTime()>Date.now();
      if(founder){
        const expectedEnd=Math.floor(new Date(proOrder.free_until).getTime()/1000);
        if(Math.abs(Number(stripeSub.trial_end||0)-expectedEnd)>60)return json({error:"Essai Fondateur incorrect"},400);
      }
      if(founderDiscount){
        const end=Math.floor(new Date(founderRow.discount_until).getTime()/1000);
        const hasCoupon=(stripeSub.discounts||[]).some((d:any)=>(typeof d==="string"?d:d?.source?.coupon?.id||d?.coupon?.id)==="ABRACA_FONDATEUR_50_TEST");
        if(!hasCoupon)return json({error:"Réduction Fondateur absente"},400);
        // A fixed-date schedule removes the 50% coupon at the founder's original 6-month deadline.
        // Do not activate the subscription locally if Stripe scheduling fails.
        if(!stripeSub.schedule){
          const init=new URLSearchParams({from_subscription:subscriptionId});
          const schedule=await stripeRequest("subscription_schedules",init);
          const phases=new URLSearchParams();
          phases.set("end_behavior","release");
          phases.set("proration_behavior","none");
          phases.set("phases[0][items][0][price]",String(expectedPlan.stripe_price_id));
          phases.set("phases[0][items][0][quantity]","1");
          phases.set("phases[0][start_date]",String(schedule.current_phase?.start_date||stripeSub.current_period_start||Math.floor(Date.now()/1000)));
          phases.set("phases[0][end_date]",String(end));
          phases.set("phases[0][discounts][0][coupon]","ABRACA_FONDATEUR_50_TEST");
          phases.set("phases[1][items][0][price]",String(expectedPlan.stripe_price_id));
          phases.set("phases[1][items][0][quantity]","1");
          phases.set("phases[1][start_date]",String(end));
          phases.set("phases[1][iterations]","1");
          phases.set("phases[1][proration_behavior]","none");
          await stripeRequest("subscription_schedules/"+encodeURIComponent(schedule.id),phases);
        }
      }
      const {error:subError}=await admin
        .from("pro_subscriptions")
        .upsert({
          user_id:proOrder.user_id,
          plan_code:proOrder.plan_code,
          listing_limit:Number(plan.listing_limit),
          status:founder?"trialing":"active",
          source:"stripe",
          stripe_customer_id:customerId,
          stripe_subscription_id:subscriptionId,
          stripe_checkout_session_id:session.id||null,
          founder_number:founderRow?.founder_number??proOrder.founder_number??null,
          founder_free_until:founderRow?.free_until??proOrder.free_until??null,
          founder_discount_until:founderRow?.discount_until??null,
          founder_discount_percent:founderRow?.discount_percent??null,
          enrolled_at:proOrder.enrolled_at,
          free_until:proOrder.free_until,
          billing_starts_at:proOrder.billing_starts_at,
          updated_at:nowIso
        },{onConflict:"user_id"});
      if(subError)throw subError;

      const {error:proOrderUpdate}=await admin
        .from("pro_subscription_orders")
        .update({
          status:"completed",
          stripe_checkout_session_id:session.id||null,
          stripe_customer_id:customerId,
          stripe_subscription_id:subscriptionId,
          completed_at:nowIso,
          updated_at:nowIso
        })
        .eq("id",proOrder.id)
        .eq("status","pending");
      if(proOrderUpdate)throw proOrderUpdate;

      return json({
        received:true,
        activated:true,
        type:"pro_subscription",
        plan:proOrder.plan_code,
        billing_starts_at:proOrder.billing_starts_at
      });
    }

    // 2) Abracadeal Vacances subscription onboarding
    const {data:vacOrder,error:vacOrderError}=await admin
      .from("vacation_subscription_orders")
      .select("*")
      .eq("id",referenceId)
      .maybeSingle();
    if(vacOrderError)throw vacOrderError;

    if(vacOrder){
      if(vacOrder.status==="completed"){
        const completedAt=vacOrder.completed_at||new Date().toISOString();
        const {error:queueDuplicateError}=await admin
          .from("vacation_email_outbox")
          .upsert({
            event_key:`activation:${vacOrder.id}`,
            user_id:vacOrder.user_id,
            email_type:"activation",
            payload:{
              order_id:vacOrder.id,
              listing_id:vacOrder.listing_id,
              cohort:vacOrder.cohort,
              completed_at:completedAt
            },
            status:"pending",
            available_at:new Date().toISOString(),
            updated_at:new Date().toISOString()
          },{onConflict:"event_key",ignoreDuplicates:true});
        if(queueDuplicateError)throw queueDuplicateError;
        return json({received:true,duplicate:true,type:"vacances",email_queued:true});
      }
      if(String(session.payment_link||"")!==String(vacOrder.expected_payment_link_id||"")){
        return json({error:"Lien Stripe Vacances incohérent"},400);
      }
      if(String(session.mode||"")!=="subscription"){
        return json({error:"Session Stripe Vacances invalide"},400);
      }
      if(String(session.status||"")!=="complete"){
        return json({received:true,waiting:true,type:"vacances"});
      }

      // Founder cohort is a 12-month trial with card collected: no immediate payment is expected.
      if(vacOrder.cohort!=="founder_500" && session.payment_status!=="paid"){
        return json({received:true,waiting:true,type:"vacances"});
      }

      // From the 501st listing onward, every invoice is 4.99 EUR (no temporary discount).
      if(vacOrder.cohort!=="founder_500" && Number(session.amount_total)!==499){
        return json({error:"Montant Vacances incohérent : 4,99 EUR attendus"},400);
      }

      const now=new Date().toISOString();
      const customerId=typeof session.customer==="string"?session.customer:null;
      const subscriptionId=typeof session.subscription==="string"?session.subscription:null;

      // Fail closed: checking only the first discounted invoice is not enough;
      // verify the underlying recurring subscription price remains 4.99 EUR/month.
      const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
      if(!stripeKey||!subscriptionId)return json({error:"Verification tarif abonnement Vacances indisponible"},503);
      const stripeResponse=await fetch("https://api.stripe.com/v1/subscriptions/"+encodeURIComponent(subscriptionId),{
        headers:{"Authorization":"Bearer "+stripeKey}
      });
      if(!stripeResponse.ok)return json({error:"Verification tarif abonnement Vacances impossible"},503);
      const stripeSubscription=await stripeResponse.json();
      const items=Array.isArray(stripeSubscription?.items?.data)?stripeSubscription.items.data:[];
      if(items.length!==1
         ||Number(items[0]?.price?.unit_amount)!==499
         ||String(items[0]?.price?.currency)!=="eur"
         ||String(items[0]?.price?.recurring?.interval)!=="month"
         ||Number(items[0]?.quantity||1)!==1){
        return json({error:"Abonnement Vacances non conforme au tarif fixe de 4,99 EUR/mois"},400);
      }
      if(!["trialing","active"].includes(String(stripeSubscription?.status||""))){
        return json({error:"Abonnement Vacances inactif ou annule"},409);
      }
      if(vacOrder.cohort==="founder_500"){
        const trialEnd=Number(stripeSubscription?.trial_end||0)*1000;
        // A full 12-month trial must exist before collecting the first 4.99 EUR.
        if(!Number.isFinite(trialEnd)||trialEnd<Date.now()+360*86400000){
          return json({error:"Periode gratuite Vacances de 12 mois absente"},400);
        }
      }

      const {error:updateOrderError}=await admin
        .from("vacation_subscription_orders")
        .update({
          status:"completed",
          stripe_checkout_session_id:session.id||null,
          stripe_customer_id:customerId,
          stripe_subscription_id:subscriptionId,
          completed_at:now,
          updated_at:now
        })
        .eq("id",vacOrder.id)
        .eq("status","pending");
      if(updateOrderError)throw updateOrderError;

      const {error:hostError}=await admin
        .from("vacation_hosts")
        .update({
          status:"active",
          onboarding_completed:true,
          onboarding_listing_id:vacOrder.listing_id,
          stripe_customer_id:customerId,
          stripe_subscription_id:subscriptionId,
          stripe_checkout_session_id:session.id||null,
          subscription_cohort:vacOrder.cohort,
          subscription_status:vacOrder.cohort==="founder_500"?"trialing":"active",
          subscription_started_at:now,
          updated_at:now
        })
        .eq("user_id",vacOrder.user_id);
      if(hostError)throw hostError;

      const {error:queueError}=await admin
        .from("vacation_email_outbox")
        .upsert({
          event_key:`activation:${vacOrder.id}`,
          user_id:vacOrder.user_id,
          email_type:"activation",
          payload:{
            order_id:vacOrder.id,
            listing_id:vacOrder.listing_id,
            cohort:vacOrder.cohort,
            completed_at:now
          },
          status:"pending",
          available_at:now,
          updated_at:now
        },{onConflict:"event_key",ignoreDuplicates:true});
      if(queueError)throw queueError;

      return json({received:true,activated:true,type:"vacances",cohort:vacOrder.cohort,email_queued:true});
    }

    // 3) Abracadeal promotion / Boost credit orders
    if(session.payment_status!=="paid")return json({received:true,waiting:true});
    const orderId=referenceId;
    const {data:order,error:orderError}=await admin
      .from("promotion_orders")
      .select("id,owner_id,pack_code,amount_cents,currency,status,selected_count,stripe_checkout_session_id,withdrawal_accepted_at")
      .eq("id",orderId)
      .maybeSingle();
    if(orderError)throw orderError;
    if(!order)return json({received:true,ignored:"commande inconnue"});
    if(order.status==="paid")return json({received:true,duplicate:true});

    const {data:pack,error:packError}=await admin
      .from("promotion_packs")
      .select("code,duration_days,max_listings,stripe_payment_link_id")
      .eq("code",order.pack_code)
      .single();
    if(packError)throw packError;
    if(order.withdrawal_accepted_at){
      if(session.mode!=='payment'||String(order.stripe_checkout_session_id||'')!==String(session.id||''))return json({error:'Session de paiement incohérente'},400);
    }else if(pack.code==="urgent_30d"){
      if(String(pack.stripe_payment_link_id||"")!=="checkout_session"||String(session.mode||"")!=="payment")return json({error:"Session Urgent incohérente"},400);
    }else if(String(session.payment_link||"")!==String(pack.stripe_payment_link_id||""))return json({error:"Lien de paiement incohérent"},400);
    if(Number(session.amount_total)!==Number(order.amount_cents)||String(session.currency||"").toLowerCase()!==String(order.currency).toLowerCase()){
      return json({error:"Montant de paiement incohérent"},400);
    }

    const now=new Date();
    const proCreditPack=["pro_5_7d","pro_10_7d","pro_5_30d","pro_10_30d"].includes(pack.code);

    if(proCreditPack){
      const {data:grantData,error:grantError}=await admin.rpc("grant_pro_boost_credits",{p_order_id:order.id});
      if(grantError)throw grantError;

      const {error:updateError}=await admin
        .from("promotion_orders")
        .update({
          status:"paid",
          stripe_checkout_session_id:session.id||null,
          stripe_payment_intent_id:typeof session.payment_intent==="string"?session.payment_intent:null,
          paid_at:now.toISOString(),
          activated_at:now.toISOString(),
          expires_at:null
        })
        .eq("id",order.id)
        .eq("status","pending");
      if(updateError)throw updateError;

      return json({
        received:true,
        type:"pro_boost_credits",
        credited:Number(pack.max_listings||order.selected_count||0),
        duration_days:Number(pack.duration_days||0),
        grant:grantData
      });
    }

    const {data:items,error:itemsError}=await admin
      .from("promotion_order_items")
      .select("listing_id")
      .eq("order_id",order.id);
    if(itemsError)throw itemsError;
    if(!items?.length)return json({error:"Aucune annonce associée"},400);

    let maxExpiry=now;
    const photoPack=pack.code==="photo_12"||pack.code==="photo_30_pro";
    for(const item of items){
      const {data:listing,error:listingError}=await admin
        .from("listings")
        .select("id,owner_id,featured_until,urgent_until,photo_limit")
        .eq("id",item.listing_id)
        .single();
      if(listingError)throw listingError;
      if(listing.owner_id!==order.owner_id)return json({error:"Propriétaire incohérent"},400);

      if(order.withdrawal_accepted_at){
      if(session.mode!=='payment'||String(order.stripe_checkout_session_id||'')!==String(session.id||''))return json({error:'Session de paiement incohérente'},400);
    }else if(pack.code==="urgent_30d"){
        const current=listing.urgent_until?new Date(listing.urgent_until):now;
        const base=current.getTime()>now.getTime()?current:now;
        const expiry=new Date(base.getTime()+30*86400000);
        if(expiry.getTime()>maxExpiry.getTime())maxExpiry=expiry;
        const {error}=await admin.from("listings").update({urgent_until:expiry.toISOString()}).eq("id",listing.id);
        if(error)throw error;
      }else if(pack.code==="photo_12"){
        const {error}=await admin.from("listings").update({photo_limit:12}).eq("id",listing.id);
        if(error)throw error;
      }else if(pack.code==="photo_30_pro"){
        const {error}=await admin.from("listings").update({photo_limit:30}).eq("id",listing.id);
        if(error)throw error;
      }else{
        const current=listing.featured_until?new Date(listing.featured_until):now;
        const base=current.getTime()>now.getTime()?current:now;
        const expiry=new Date(base.getTime()+Number(pack.duration_days)*86400000);
        if(expiry.getTime()>maxExpiry.getTime())maxExpiry=expiry;
        const {error}=await admin
          .from("listings")
          .update({featured_until:expiry.toISOString(),promotion_tier:pack.code})
          .eq("id",listing.id);
        if(error)throw error;
      }
    }

    const {error:updateError}=await admin
      .from("promotion_orders")
      .update({
        status:"paid",
        stripe_checkout_session_id:session.id||null,
        stripe_payment_intent_id:typeof session.payment_intent==="string"?session.payment_intent:null,
        paid_at:now.toISOString(),
        activated_at:now.toISOString(),
        expires_at:photoPack?null:maxExpiry.toISOString()
      })
      .eq("id",order.id)
      .eq("status","pending");
    if(updateError)throw updateError;

    return json({received:true,activated:items.length,pack:pack.code});
  }catch(error){
    console.error(error);
    return json({error:error instanceof Error?error.message:"Erreur webhook"},500);
  }
});
