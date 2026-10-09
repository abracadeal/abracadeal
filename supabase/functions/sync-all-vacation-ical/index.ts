import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors={"access-control-allow-origin":"*","access-control-allow-headers":"content-type,x-cron-key"};

function unfold(s:string){return s.replace(/\r?\n[ \t]/g,"");}
function day(v?:string){const m=(v||"").trim().match(/^(\d{4})(\d{2})(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:null;}
function plus1(iso:string){const d=new Date(`${iso}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function safeFeedUrl(raw:string){
  const value=String(raw||"").replace(/^webcal:/i,"https:");
  const u=new URL(value);
  if(u.protocol!=="https:") throw new Error("Le flux iCal doit utiliser HTTPS");
  const h=u.hostname.toLowerCase();
  if(h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h==="0.0.0.0"||h==="::1") throw new Error("Adresse iCal non autorisée");
  if(/^10\./.test(h)||/^127\./.test(h)||/^169\.254\./.test(h)||/^192\.168\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h)) throw new Error("Adresse iCal privée non autorisée");
  return u.toString();
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const admin=createClient(URL,SERVICE,{auth:{persistSession:false}});
  const supplied=req.headers.get("x-cron-key")||"";
  const {data:secret}=await admin.from("integration_secrets").select("secret_value").eq("name","vacation_ical_cron").maybeSingle();
  if(!secret?.secret_value||supplied!==secret.secret_value)return new Response("Unauthorized",{status:401});
  const {data:feeds,error}=await admin.from("vacation_ical_feeds").select("id,owner_id,listing_id,feed_url").eq("is_active",true);
  if(error)return new Response(JSON.stringify({error:error.message}),{status:500,headers:{"content-type":"application/json"}});
  let ok=0,failed=0,totalEvents=0;
  for(const feed of feeds||[]){
    try{
      const feedUrl=safeFeedUrl(String(feed.feed_url));
      const r=await fetch(feedUrl);
      if(!r.ok)throw new Error(`Téléchargement impossible (${r.status})`);
      const text=unfold(await r.text());
      if(!text.includes("BEGIN:VCALENDAR"))throw new Error("Lien iCal invalide");
      const rows:any[]=[];
      for(const m of text.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi)){
        const b=m[1];
        const uid=b.match(/\nUID[^:]*:([^\r\n]+)/i)?.[1]?.trim()||crypto.randomUUID();
        const start=day(b.match(/\nDTSTART[^:]*:([^\r\n]+)/i)?.[1]);
        let end=day(b.match(/\nDTEND[^:]*:([^\r\n]+)/i)?.[1]);
        if(!start)continue;if(!end||end<=start)end=plus1(start);
        rows.push({owner_id:feed.owner_id,feed_id:feed.id,listing_id:feed.listing_id,external_uid:uid,starts_on:start,ends_on:end});
      }
      await admin.from("vacation_calendar_blocks").delete().eq("feed_id",feed.id);
      if(rows.length){const {error:e}=await admin.from("vacation_calendar_blocks").insert(rows);if(e)throw e;}
      await admin.from("vacation_ical_feeds").update({last_synced_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("id",feed.id);
      ok++;totalEvents+=rows.length;
    }catch(e){
      failed++;
      await admin.from("vacation_ical_feeds").update({last_error:String((e as Error)?.message||e),updated_at:new Date().toISOString()}).eq("id",feed.id);
    }
  }
  return new Response(JSON.stringify({ok:true,feeds_ok:ok,feeds_failed:failed,events:totalEvents}),{headers:{"content-type":"application/json"}});
});