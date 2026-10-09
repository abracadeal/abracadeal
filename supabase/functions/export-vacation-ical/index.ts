import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!,SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
function icsDate(s:string){return s.replaceAll("-","");}
function esc(s:string){return s.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");}
Deno.serve(async(req)=>{
  const u=new URL(req.url),token=u.searchParams.get("token")||"";
  if(!token)return new Response("Missing token",{status:400});
  const admin=createClient(URL,SERVICE,{auth:{persistSession:false}});
  const {data:ex}=await admin.from("vacation_ical_exports").select("listing_id,owner_id").eq("token",token).maybeSingle();
  if(!ex)return new Response("Calendar not found",{status:404});
  const {data:l}=await admin.from("listings").select("title").eq("id",ex.listing_id).maybeSingle();
  const [{data:manual},{data:reqs}]=await Promise.all([
    admin.from("vacation_manual_blocks").select("id,starts_on,ends_on,note").eq("listing_id",ex.listing_id),
    admin.from("vacation_requests").select("id,starts_on,ends_on").eq("listing_id",ex.listing_id).eq("status","accepted")
  ]);
  const seen=new Set<string>(),events:string[]=[];
  for(const b of manual||[]){
    const key=`${b.starts_on}|${b.ends_on}`;if(seen.has(key))continue;seen.add(key);
    events.push(["BEGIN:VEVENT",`UID:abracadeal-block-${b.id}@abracadeal.fr`,`DTSTART;VALUE=DATE:${icsDate(b.starts_on)}`,`DTEND;VALUE=DATE:${icsDate(b.ends_on)}`,`SUMMARY:${esc("Indisponible - Abracadeal")}`,"END:VEVENT"].join("\r\n"));
  }
  for(const r of reqs||[]){
    const key=`${r.starts_on}|${r.ends_on}`;if(seen.has(key))continue;seen.add(key);
    events.push(["BEGIN:VEVENT",`UID:abracadeal-request-${r.id}@abracadeal.fr`,`DTSTART;VALUE=DATE:${icsDate(r.starts_on)}`,`DTEND;VALUE=DATE:${icsDate(r.ends_on)}`,`SUMMARY:${esc("Réservation Abracadeal")}`,"END:VEVENT"].join("\r\n"));
  }
  const body=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Abracadeal//Vacances//FR",`X-WR-CALNAME:${esc(l?.title||"Abracadeal Vacances")}`,...events,"END:VCALENDAR",""].join("\r\n");
  return new Response(body,{headers:{"content-type":"text/calendar; charset=utf-8","cache-control":"no-store"}});
});