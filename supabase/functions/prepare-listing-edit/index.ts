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
  if(body.action==='cancel'){
   const {data:proposal}=await admin.from('listings').select('id,owner_id,revision_of,status').eq('id',String(body.listing_id||'')).single();
   if(!proposal||proposal.owner_id!==a.user.id||!proposal.revision_of||proposal.status!=='pending')return json({error:'Proposition non annulable'},409);
   const {data:order}=await admin.from('commerce_orders').select('id,status,stripe_checkout_session_id').eq('revision_id',proposal.id).in('status',['pending','paid']).maybeSingle();
   if(order?.status==='paid')return json({error:'Cette modification est payée : elle doit être traitée par la modération.'},409);
   if(order?.stripe_checkout_session_id){
    const stripeKey=Deno.env.get('STRIPE_SECRET_KEY')||Deno.env.get('STRIPE_RESTRICTED_KEY')||'';
    const headers={Authorization:'Bearer '+stripeKey};
    const r=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(order.stripe_checkout_session_id),{headers,signal:AbortSignal.timeout(15000)});const session=await r.json();
    if(!r.ok||session.status==='complete')return json({error:'Paiement en cours de confirmation : annulation impossible.'},409);
    if(session.status==='open'){const expired=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(order.stripe_checkout_session_id)+'/expire',{method:'POST',headers,signal:AbortSignal.timeout(15000)});if(!expired.ok)return json({error:'Paiement en cours : annulation impossible.'},409);}
   }
   if(order){const cancelled=await admin.from('commerce_orders').update({status:'cancelled'}).eq('id',order.id).eq('status','pending');if(cancelled.error)throw cancelled.error;}
   const {data:photos}=await admin.from('listing_photos').select('storage_path').eq('listing_id',proposal.id);
   const removed=await admin.from('listings').delete().eq('id',proposal.id);if(removed.error)throw removed.error;
   for(const bucket of ['listing-images','listing-images-pending']){const paths=(photos||[]).map(p=>p.storage_path);if(paths.length){const result=await admin.storage.from(bucket).remove(paths);if(result.error)throw result.error;}}
   return json({ok:true,cancelled:true});
  }
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
