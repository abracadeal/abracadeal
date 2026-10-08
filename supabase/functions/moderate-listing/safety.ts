export const MODEL='omni-moderation-latest';
const must=(r:any)=>{if(r.error)throw r.error;return r.data;};
export function snapshot(listing:any,photos:any[]){
 return {text:`${listing.title||''}\n${listing.description||''}`,photos:[...photos].sort((a,b)=>a.id.localeCompare(b.id)).map(p=>({id:p.id,path:p.storage_path}))};
}
export async function getPhotos(admin:any,id:string){
 return must(await admin.from('listing_photos').select('id,storage_path,storage_bucket').eq('listing_id',id))||[];
}
export async function quarantine(admin:any,photos:any[]){
 for(const p of photos){
  if(p.storage_bucket!=='listing-images'||/^https?:\/\//i.test(p.storage_path))continue;
  // Copy first, persist location, then remove the public copy. All errors fail closed.
  const existing=await admin.storage.from('listing-images-pending').download(p.storage_path);
  if(existing.error)must(await admin.storage.from('listing-images').copy(p.storage_path,p.storage_path,{destinationBucket:'listing-images-pending'}));
  must(await admin.from('listing_photos').update({storage_bucket:'listing-images-pending'}).eq('id',p.id));
  must(await admin.storage.from('listing-images').remove([p.storage_path]));
  p.storage_bucket='listing-images-pending';
 }
}
export async function scanSafety(admin:any,listing:any,photos:any[],fetcher=fetch,key=Deno.env.get('OPENAI_API_KEY')){
 if(!key)throw new Error('OPENAI_API_KEY absent');
 const inputs:any[][]=[[{type:'text',text:`${listing.title||''}\n${listing.description||''}`}]];
 for(const p of photos){
  let url=p.storage_path;
  if(!/^https?:\/\//i.test(url)){
   const signed=must(await admin.storage.from(p.storage_bucket).createSignedUrl(p.storage_path,120));
   if(!signed?.signedUrl)throw new Error('Photo inaccessible');
   url=signed.signedUrl;
  }
  inputs.push([{type:'image_url',image_url:{url}}]);
 }
 const flags=new Set<string>();
 const deadline=AbortSignal.timeout(65000);
 for(let i=0;i<inputs.length;i+=4){
 await Promise.all(inputs.slice(i,i+4).map(async input=>{
  const response=await fetcher('https://api.openai.com/v1/moderations',{
   method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:MODEL,input}),signal:AbortSignal.any([deadline,AbortSignal.timeout(20000)])
  });
  if(!response.ok){const err=await response.json().catch(()=>({}));throw new Error(`OpenAI Moderation HTTP ${response.status} (${input[0].type}, ${err?.error?.code||err?.error?.type||'API error'})`);}
  const data=await response.json();
  const result=data.results?.[0];
  if(!result||typeof result.flagged!=='boolean'||!result.categories)throw new Error('Réponse OpenAI Moderation incomplète');
  for(const category of ['sexual','sexual/minors','violence','violence/graphic']){
   if(typeof result.categories[category]!=='boolean')throw new Error('Catégories de sécurité manquantes');
   if(result.categories[category])flags.add(category);
  }
 }));
 }
 return {categories:[...flags],snapshot:snapshot(listing,photos),imagesChecked:photos.length};
}
export async function recordSafety(admin:any,id:string,result:any,error:string|null=null){
 must(await admin.from('listing_moderation').upsert({
  listing_id:id,ai_checked:!error,ai_error:error,safety_snapshot:error?null:result.snapshot,
  checked_at:new Date().toISOString(),engine:error?'omni-moderation-unavailable':MODEL,
  ...(error?{auto_published:false,reasons:['Analyse de sécurité indisponible : annonce en attente']}:{})
 },{onConflict:'listing_id'}));
}
export async function enforce(admin:any,listing:any,reason:string,pharos=false,actor:string|null=null){
 must(await admin.rpc('moderation_suspend_owner',{p_listing_id:listing.id,p_reason:reason,p_pharos:pharos,p_actor:actor}));
 // Database suspension applies to existing JWTs immediately through restrictive RLS.
 must(await admin.auth.admin.updateUserById(listing.owner_id,{ban_duration:'876000h'}));
 const listings=must(await admin.from('listings').select('id').eq('owner_id',listing.owner_id))||[];
 for(const l of listings){
  const photos=await getPhotos(admin,l.id);
  for(const bucket of ['listing-images','listing-images-pending']){
   const paths=photos.filter((p:any)=>!/^https?:\/\//i.test(p.storage_path)).map((p:any)=>p.storage_path);
   if(paths.length)must(await admin.storage.from(bucket).remove(paths));
  }
  must(await admin.from('listing_photos').delete().eq('listing_id',l.id));
 }
 // Related-edit triggers can requeue rejected listings after photo deletion.
 must(await admin.from('listings').update({status:'rejected'}).eq('owner_id',listing.owner_id).neq('status','archived'));
 must(await admin.from('listing_moderation').update({
  risk_level:'red',risk_score:100,reasons:[reason],safety_blocked:true,auto_published:false,
  ai_checked:!pharos,engine:MODEL,
  enforcement_completed_at:new Date().toISOString()
 }).eq('listing_id',listing.id));
}
export async function publishPhotos(admin:any,listing:any,photos:any[]){
 const current=must(await admin.from('listings').select('id,title,description,updated_at,status').eq('id',listing.id).single());
 const latest=await getPhotos(admin,listing.id);
 if(current.updated_at!==listing.updated_at||JSON.stringify(snapshot(current,latest))!==JSON.stringify(snapshot(listing,photos)))throw new Error('Annonce modifiée pendant l’analyse : recommencer');
 try {
 for(const p of photos){
  if(p.storage_bucket!=='listing-images-pending')continue;
  // Unique destination prevents collisions and stale public cache from prior uploads.
  const existing=await admin.storage.from('listing-images').download(p.storage_path);
  const r=existing.error?await admin.storage.from('listing-images-pending').copy(p.storage_path,p.storage_path,{destinationBucket:'listing-images'}):{data:existing.data};
  must(r);
  must(await admin.from('listing_photos').update({storage_bucket:'listing-images'}).eq('id',p.id).eq('storage_bucket','listing-images-pending'));
 }
 }catch(error){await quarantine(admin,await getPhotos(admin,listing.id));throw error;}
}
