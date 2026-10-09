import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
Deno.serve(async(req:Request)=>{
  const u=new URL(req.url), id=u.searchParams.get("id")||"";
  const home="https://abracadeal.fr/";
  if(!/^[0-9a-f-]{20,}$/i.test(id)) return Response.redirect(home,302);
  const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:a}=await sb.from("listings").select("id,title,price,city,status,visibility_scope,listing_photos(storage_path,position)").eq("id",id).eq("status","active").eq("visibility_scope","public").maybeSingle();
  if(!a) return Response.redirect(home,302);
  const dest=home+"?annonce="+encodeURIComponent(id);
  const photos=[...(a.listing_photos||[])].sort((x:any,y:any)=>(x.position||0)-(y.position||0));
  let image=photos[0]?.storage_path||"";
  if(image && !/^https?:\/\//i.test(image)) image=Deno.env.get("SUPABASE_URL")+"/storage/v1/object/public/listing-images/"+image.split("/").map(encodeURIComponent).join("/");
  if(!image) image=home+"assets/default-listing-photo-20260921.jpg";
  const price=a.price!==null&&a.price!==""?Number(a.price).toLocaleString("fr-FR")+" €":"";
  const title=[a.title,price].filter(Boolean).join(" - ")+" sur Abracadeal";
  const desc=[a.city||"",price].filter(Boolean).join(" · ")||"Annonce sur Abracadeal";
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'"><meta property="og:type" content="website"><meta property="og:site_name" content="Abracadeal"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:image" content="'+esc(image)+'"><meta property="og:url" content="'+esc(u.toString())+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(desc)+'"><meta name="twitter:image" content="'+esc(image)+'"><meta http-equiv="refresh" content="0;url='+esc(dest)+'"><link rel="canonical" href="'+esc(dest)+'"></head><body><p><a href="'+esc(dest)+'">Voir l’annonce sur Abracadeal</a></p><script>location.replace('+JSON.stringify(dest)+')<\/script></body></html>';
  return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300"}});
});