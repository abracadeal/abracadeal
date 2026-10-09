import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY=Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL="Abracadeal <contact@abracadeal.fr>";
const HOST_URL="https://abracadeal.fr/espace-hote.html";

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

async function sendEmail(to:string,subject:string,text:string,html:string,key:string){
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${RESEND_API_KEY}`,
      "Content-Type":"application/json",
      "Idempotency-Key":key.slice(0,256)
    },
    body:JSON.stringify({from:FROM_EMAIL,to:[to],subject,text,html})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(JSON.stringify(body).slice(0,1000));
  return body?.id||null;
}

Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const provided=req.headers.get("x-cron-key")||"";
    const {data:secret,error:secretError}=await supabase.from("integration_secrets").select("secret_value").eq("name","vacation_email_cron").single();
    if(secretError||!secret?.secret_value)return json({error:"Cron secret not configured"},500);
    if(!provided||provided!==secret.secret_value)return json({error:"Unauthorized"},401);
    if(!RESEND_API_KEY)return json({error:"RESEND_API_KEY missing"},500);

    const {data:rows,error}=await supabase.from("vacation_email_outbox")
      .select("id,event_key,user_id,email_type,payload,status,attempt_count")
      .in("status",["pending","failed"])
      .lte("available_at",new Date().toISOString())
      .lt("attempt_count",5)
      .order("created_at",{ascending:true})
      .limit(50);
    if(error)throw error;

    let sent=0,failed=0,skipped=0;
    for(const row of rows||[]){
      const {data:claimed,error:claimError}=await supabase.from("vacation_email_outbox")
        .update({status:"processing",attempt_count:Number(row.attempt_count||0)+1,updated_at:new Date().toISOString()})
        .eq("id",row.id).in("status",["pending","failed"]).select("id").maybeSingle();
      if(claimError||!claimed){skipped++;continue;}

      try{
        const {data:userData,error:userError}=await supabase.auth.admin.getUserById(row.user_id);
        const email=userData?.user?.email||"";
        if(userError||!email)throw new Error("Adresse e-mail introuvable");

        const payload:any=row.payload||{};
        const listingId=String(payload.listing_id||"");
        const {data:listing}=listingId?await supabase.from("listings").select("title,city").eq("id",listingId).maybeSingle():{data:null} as any;
        const {data:details}=await supabase.from("vacation_user_details").select("first_name,last_name").eq("user_id",row.user_id).maybeSingle();
        const firstName=details?.first_name?String(details.first_name):"";
        const hello=firstName?`Bonjour ${firstName},`:"Bonjour,";

        let subject="",text="",html="";
        if(row.email_type==="activation"){
          const cohort=String(payload.cohort||"standard");
          const completed=String(payload.completed_at||new Date().toISOString());
          const title=listing?.title||"votre logement";
          let offerText="";
          if(cohort==="founder_500"){
            const start=addMonthsClamped(completed,12).toISOString();
            offerText=`Vous bénéficiez de 12 mois gratuits. Aucun prélèvement avant le ${dateFr(start)}. Ensuite, l'abonnement sera de 4,99 € par mois et par logement. Nous vous enverrons un rappel avant le premier prélèvement.`;
          }else{
            offerText="Votre abonnement est actif au tarif de 4,99 € par mois et par logement, sans augmentation programmée.";
          }
          subject="Votre logement Abracadeal Vacances est activé";
          text=`${hello}

Votre logement « ${title} » est maintenant activé sur Abracadeal Vacances.

${offerText}

Gérer mon espace Hôte :
${HOST_URL}

Bien cordialement,
Abracadeal
contact@abracadeal.fr`;
          html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#21132d;line-height:1.6">
<h2 style="margin-top:0">Votre logement est activé ✓</h2>
<p>${esc(hello)}</p>
<p>Votre logement <strong>« ${esc(title)} »</strong> est maintenant activé sur Abracadeal Vacances.</p>
<p>${esc(offerText)}</p>
<p style="margin:24px 0"><a href="${HOST_URL}" style="display:inline-block;padding:12px 18px;background:#6f2bd8;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Ouvrir mon espace Hôte</a></p>
<p style="font-size:13px;color:#77677f">Si vous bénéficiez des 12 mois gratuits, un rappel vous sera envoyé avant le premier prélèvement de 4,99 €/mois.</p>
<p>Bien cordialement,<br><strong>Abracadeal</strong><br>contact@abracadeal.fr</p></div>`;
        }else if(row.email_type==="request_cancelled"){
          const starts=String(payload.starts_on||"");
          const ends=String(payload.ends_on||"");
          const title=listing?.title||"votre logement";
          let travelerName="Le voyageur";
          const travelerId=String(payload.traveler_id||"");
          if(travelerId){
            const {data:t}=await supabase.from("vacation_user_details").select("first_name,last_name").eq("user_id",travelerId).maybeSingle();
            const n=[t?.first_name,t?.last_name].filter(Boolean).join(" ").trim();
            if(n)travelerName=n;
          }
          const period=starts&&ends?` du ${dateFr(starts+"T12:00:00Z")} au ${dateFr(ends+"T12:00:00Z")}`:"";
          subject=`Demande de séjour annulée — ${title}`;
          text=`${hello}

${travelerName} a annulé sa demande de séjour${period} pour « ${title} ».

Si la demande avait été acceptée, les dates ont été libérées automatiquement dans votre calendrier Abracadeal.

Voir mon espace Hôte :
${HOST_URL}

Bien cordialement,
Abracadeal`;
          html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#21132d;line-height:1.6">
<h2 style="margin-top:0">Demande de séjour annulée</h2>
<p>${esc(hello)}</p>
<p><strong>${esc(travelerName)}</strong> a annulé sa demande de séjour${esc(period)} pour <strong>« ${esc(title)} »</strong>.</p>
<p>Si la demande avait été acceptée, les dates ont été libérées automatiquement dans votre calendrier Abracadeal.</p>
<p style="margin:24px 0"><a href="${HOST_URL}" style="display:inline-block;padding:12px 18px;background:#6f2bd8;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Voir mon espace Hôte</a></p>
<p>Bien cordialement,<br><strong>Abracadeal</strong></p></div>`;
        }else{
          await supabase.from("vacation_email_outbox").update({status:"failed",last_error:"Type d'email non encore pris en charge",updated_at:new Date().toISOString()}).eq("id",row.id);
          failed++; continue;
        }

        // A controlled smoke-test email must never look like a real activation.
        if(payload.qa_test===true){
          subject="[TEST TECHNIQUE] "+subject;
          text="TEST TECHNIQUE — Aucun abonnement réel n'a été activé ou facturé.\n\n"+text;
          html='<p style="padding:12px;background:#fff3cd;font-weight:bold">TEST TECHNIQUE — Aucun abonnement réel activé ni facturé.</p>'+html;
        }
        const resendId=await sendEmail(email,subject,text,html,`vacation-${row.event_key}`);
        await supabase.from("vacation_email_outbox").update({status:"sent",sent_at:new Date().toISOString(),resend_email_id:resendId,last_error:null,updated_at:new Date().toISOString()}).eq("id",row.id);
        sent++;
      }catch(e){
        failed++;
        const retryAt=new Date(Date.now()+5*60*1000).toISOString();
        await supabase.from("vacation_email_outbox").update({status:"failed",last_error:String((e as Error)?.message||e).slice(0,1000),available_at:retryAt,updated_at:new Date().toISOString()}).eq("id",row.id);
      }
    }
    return json({ok:true,checked:rows?.length||0,sent,failed,skipped});
  }catch(e){
    console.error(e);return json({error:String((e as Error)?.message||e)},500);
  }
});