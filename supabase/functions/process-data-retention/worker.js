// Kept separate from Deno.serve so failures, retries and authorization can be tested without live deletion.
export async function runRetention(admin, sendNotice) {
 const rpc=async(name,args={})=>{const {data,error}=await admin.rpc(name,args);if(error)throw error;return data;};
 const token=crypto.randomUUID();
 if(!await rpc('retention_claim_worker',{p_token:token}))return {busy:true};
 const counts={notices:0,closed:0,photos_deleted:0,errors:0};
 const deadline=Date.now()+180000;
 let failure=null;
 try {
  const tasks=await rpc('retention_worker_tasks');
  for(const item of tasks.accounts||[]) {
   if(Date.now()>=deadline)break;
   try {
    if(item.state==='notice_pending') {
     const {data,error}=await admin.auth.admin.getUserById(item.user_id);if(error)throw error;
     if(!data?.user?.email)throw new Error('Adresse de préavis indisponible');
     await sendNotice(data.user.email,item.user_id);
     await rpc('retention_notice_result',{p_user:item.user_id});counts.notices++;
    } else if(await rpc('retention_begin_close',{p_user:item.user_id})) {
     const {data,error}=await admin.auth.admin.getUserById(item.user_id);if(error)throw error;
     // UUID anchors remain: auth.deleteUser would cascade financial records and other users' messages.
     const metadata=Object.fromEntries(Object.keys(data.user.user_metadata||{}).map(k=>[k,null]));
     const result=await admin.auth.admin.updateUserById(item.user_id,{
      ban_duration:'876000h', email:`closed-${item.user_id}@accounts.invalid`, email_confirm:true,
      phone:'',password:crypto.randomUUID()+crypto.randomUUID(),user_metadata:metadata
     });
     if(result.error)throw result.error;
     await rpc('retention_finish_close',{p_user:item.user_id});counts.closed++;
    }
   } catch(e) {
    counts.errors++;
    const args={p_user:item.user_id,p_error:String(e.message||e).slice(0,500)};
    await rpc(item.state==='notice_pending'?'retention_notice_result':'retention_finish_close',args);
   }
  }
  for(const item of tasks.storage||[]) {
   if(Date.now()>=deadline)break;
   const allowed=await rpc('retention_storage_allowed',{p_id:item.id});
   const quarantine=allowed?null:await rpc('retention_storage_quarantine',{p_id:item.id});
   if(!allowed&&!quarantine)continue;
   try {
    if(quarantine) {
     let {data,error}=await admin.storage.from(item.bucket).download(item.path);
     // Recover a crash between deleting the public copy and recording its private location.
     if(error){const existing=await admin.storage.from(quarantine.bucket).download(quarantine.path);data=existing.data;error=existing.error;}
     if(error||!data)throw error||new Error('Photo de preuve indisponible');
     const uploaded=await admin.storage.from(quarantine.bucket).upload(quarantine.path,data,{upsert:true,contentType:data.type||'application/octet-stream'});
     if(uploaded.error)throw uploaded.error;
    }
    const {error}=await admin.storage.from(item.bucket).remove([item.path]);if(error)throw error;
    await rpc(quarantine?'retention_storage_quarantined':'retention_storage_result',{p_id:item.id});counts.photos_deleted++;
   } catch(e) {
    counts.errors++;
    await rpc('retention_storage_result',{p_id:item.id,p_error:String(e.message||e).slice(0,500)});
   }
  }
  return counts;
 } catch(e) {failure=String(e.message||e).slice(0,500);throw e;}
 finally {await rpc('retention_release_worker',{p_token:token,p_counts:counts,p_error:failure});}
}

export async function handleRetention(req,admin,sendNotice) {
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const supplied=req.headers.get('x-retention-key');
 // Do not disclose configuration or access any task when the secret is absent.
 if(!supplied)return json({error:'Unauthorized'},401);
 const {data,error}=await admin.from('integration_secrets').select('secret_value').eq('name','retention_cron').single();
 if(error||!data?.secret_value||supplied!==data.secret_value)return json({error:'Unauthorized'},401);
 try {return json({ok:true,...await runRetention(admin,sendNotice)});}
 catch {return json({error:'Retention worker failed; see protected execution log'},500);}
}
