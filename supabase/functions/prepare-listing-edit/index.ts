import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'};
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const authorization=req.headers.get('Authorization')||'';
  const admin=createClient(url,key,{auth:{persistSession:false}});
  const {data:a,error:authError}=await admin.auth.getUser(authorization.replace(/^Bearer\s+/i,''));if(authError||!a.user)return json({error:'Connexion requise'},401);
  const body=await req.json();
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:r,error}=await caller.rpc('prepare_listing_change',{p_listing_id:body.listing_id,p_changes:body.changes,p_replace_photos:body.replace_photos===true,p_phone:body.phone||null});if(error)throw error;
  if(!r.price_only&&r.copy_photos){
   const {data:photos,error:e}=await admin.from('listing_photos').select('*').eq('listing_id',body.listing_id).order('position');if(e)throw e;
   for(const p of photos||[]){
    if(/^https?:/.test(p.storage_path))throw new Error('Photo externe : import requis');
    const {data:bytes,error:read}=await admin.storage.from(p.storage_bucket).download(p.storage_path);if(read)throw read;
    const path=a.user.id+'/'+r.listing_id+'/'+crypto.randomUUID()+'.webp';
    const uploaded=await admin.storage.from('listing-images-pending').upload(path,bytes,{contentType:bytes.type||'image/webp'});if(uploaded.error)throw uploaded.error;
    const added=await admin.from('listing_photos').insert({listing_id:r.listing_id,storage_path:path,storage_bucket:'listing-images-pending',position:p.position});if(added.error)throw added.error;
   }
  }
  return json({ok:true,...r});
 }catch(e){return json({error:e instanceof Error?e.message:(e as any)?.message||'Modification impossible'},400);}
});
