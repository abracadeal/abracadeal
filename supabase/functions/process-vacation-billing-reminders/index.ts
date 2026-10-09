import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY=Deno.env.get("RESEND_API_KEY")!;
const STRIPE_KEY=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
const FROM_EMAIL="Abracadeal <contact@abracadeal.fr>";
const HOST_URL="https://abracadeal.fr/espace-hote.html?billing=manage";
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json; charset=utf-8"}});

function esc(v:string){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]!));}
function dateFr(v:string){return new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",day:"2-digit",month:"long",year:"numeric"}).format(new Date(v));}
function addDays(v:string,n:number){return new Date(new Date(v).getTime()+n*86400000);}
function addMonthsClamped(v:string,n:number){
  const d=new Date(v); const day=d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+n);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last)); return d;
}
async function stripeSubscription(id:string){
  if(!STRIPE_KEY||!id)return null;
  const r=await fetch("https://api.stripe.com/v1/subscriptions/"+encodeURIComponent(id),{
    headers:{"Authorization":"Bearer "+STRIPE_KEY}
  });
  if(!r.ok)return null;
  return await r.json().catch(()=>null);
}
async function send(to:string,subject:string,text:string,html:string,key:string){
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":key.slice(0,256)},
    body:JSON.stringify({from:FROM_EMAIL,to:[to],subject,text,html})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(JSON.stringify(body).slice(0,1000));
  return body?.id||null;
}

Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const provided=req.headers.get("x-cron-key")||"";
    const {data:secret,error:secretError}=await supabase.from("integration_secrets").select("secret_value").eq("name","vacation_billing_reminder_cron").single();
    if(secretError||!secret?.secret_value)return json({error:"Cron secret not configured"},500);
    if(!provided||provided!==secret.secret_value)return json({error:"Unauthorized"},401);
    if(!RESEND_API_KEY)return json({error:"RESEND_API_KEY missing"},500);

    const {data:orders,error}=await supabase.from("vacation_subscription_orders")
      .select("id,user_id,listing_id,cohort,status,stripe_subscription_id,completed_at")
      .eq("status","completed")
      .eq("cohort","founder_500")
      .not("completed_at","is",null)
      .order("completed_at",{ascending:true})
      .limit(1500);
    if(error)throw error;

    const ids=[...new Set((orders||[]).map((x:any)=>x.user_id))];
    const internalMap=new Map<string,boolean>();
    if(ids.length){
      const {data:internal}=await supabase.from("internal_accounts").select("user_id,free_vacation_host").in("user_id",ids);
      for(const r of internal||[])internalMap.set(r.user_id,!!r.free_vacation_host);
    }

    const now=new Date();
    let sent=0,skipped=0,failed=0,checked=0;

    for(const order of orders||[]){
      if(internalMap.get(order.user_id)){skipped++;continue;}
      let priceStartsAt=addMonthsClamped(order.completed_at,12);
      const roughDays=(priceStartsAt.getTime()-now.getTime())/86400000;
      if(roughDays<-1||roughDays>8.5){skipped++;continue;}
      checked++;

      const stripeSub=await stripeSubscription(String(order.stripe_subscription_id||""));
      if(stripeSub){
        const status=String(stripeSub.status||"");
        if(["canceled","incomplete_expired","unpaid"].includes(status)||stripeSub.cancel_at_period_end===true){skipped++;continue;}
        if(Number(stripeSub.cancel_at)>0 && Number(stripeSub.cancel_at)*1000<=priceStartsAt.getTime()){skipped++;continue;}
        if(Number(stripeSub.trial_end)>0){
          priceStartsAt=new Date(Number(stripeSub.trial_end)*1000);
        }
      }

      const days=(priceStartsAt.getTime()-now.getTime())/86400000;
      let reminderType:"j7"|"j3"|null=null;
      if(days>5.5&&days<=7.5)reminderType="j7";
      else if(days>1.5&&days<=3.5)reminderType="j3";
      else{skipped++;continue;}

      const priceIso=priceStartsAt.toISOString();
      const {data:existing,error:existingError}=await supabase.from("vacation_billing_reminders")
        .select("id,status")
        .eq("order_id",order.id).eq("price_starts_at",priceIso).eq("reminder_type",reminderType).maybeSingle();
      if(existingError)throw existingError;
      if(existing?.status==="sent"){skipped++;continue;}

      let reminderId=existing?.id||null;
      if(!reminderId){
        const {data:created,error:createError}=await supabase.from("vacation_billing_reminders").insert({
          order_id:order.id,user_id:order.user_id,listing_id:order.listing_id,
          stripe_subscription_id:order.stripe_subscription_id,cohort:order.cohort,
          reminder_type:reminderType,price_starts_at:priceIso,status:"pending"
        }).select("id").single();
        if(createError)throw createError;
        reminderId=created.id;
      }

      try{
        const {data:userData,error:userError}=await supabase.auth.admin.getUserById(order.user_id);
        const email=userData?.user?.email||"";
        if(userError||!email)throw new Error("Adresse e-mail introuvable");
        const {data:listing}=await supabase.from("listings").select("title").eq("id",order.listing_id).maybeSingle();
        const {data:details}=await supabase.from("vacation_user_details").select("first_name").eq("user_id",order.user_id).maybeSingle();
        const hello=details?.first_name?`Bonjour ${details.first_name},`:"Bonjour,";
        const title=listing?.title||"votre logement";
        const d=dateFr(priceIso);
        const lead=reminderType==="j7"?"dans environ 7 jours":"dans environ 3 jours";

        let subject="",intro="",billingSentence="";
        subject=reminderType==="j7"?"Rappel : vos 12 mois offerts Abracadeal Vacances se terminent dans 7 jours":"Rappel : votre premier prélèvement Abracadeal Vacances approche";
        intro="Vos 12 mois gratuits pour ce logement arrivent à leur terme.";
        billingSentence=`Le premier prélèvement de 4,99 € par mois et par logement est prévu ${lead}, le ${d}.`;

        const text=`${hello}

${intro}

Logement : ${title}
${billingSentence}

Vous pouvez consulter votre abonnement et vos informations de facturation depuis votre espace Hôte :
${HOST_URL}

Si vous ne souhaitez pas poursuivre l'abonnement, vous pouvez le résilier avant cette date depuis la gestion de l'abonnement.

Bien cordialement,
Abracadeal
contact@abracadeal.fr`;

        const html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#21132d;line-height:1.6">
<h2 style="margin-top:0">${esc(subject)}</h2>
<p>${esc(hello)}</p>
<p>${esc(intro)}</p>
<p>Logement : <strong>« ${esc(title)} »</strong></p>
<p><strong>${esc(billingSentence)}</strong></p>
<p>Aucun prélèvement n'est prévu pendant les 12 mois gratuits. Après cette période, le tarif est de 4,99 €/mois sans hausse programmée.</p>
<p style="margin:24px 0"><a href="${HOST_URL}" style="display:inline-block;padding:12px 18px;background:#6f2bd8;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Gérer mon abonnement</a></p>
<p style="font-size:13px;color:#77677f">Vous pouvez résilier avant l'échéance si vous ne souhaitez pas poursuivre l'abonnement.</p>
<p>Bien cordialement,<br><strong>Abracadeal</strong><br>contact@abracadeal.fr</p></div>`;

        const resendId=await send(email,subject,text,html,`vacation-billing-${reminderId}`);
        await supabase.from("vacation_billing_reminders").update({status:"sent",sent_at:new Date().toISOString(),resend_email_id:resendId,last_error:null,updated_at:new Date().toISOString()}).eq("id",reminderId);
        sent++;
      }catch(e){
        failed++;
        await supabase.from("vacation_billing_reminders").update({status:"failed",last_error:String((e as Error)?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",reminderId);
      }
    }

    return json({ok:true,candidates:orders?.length||0,checked,sent,skipped,failed});
  }catch(e){
    console.error(e);return json({error:String((e as Error)?.message||e)},500);
  }
});