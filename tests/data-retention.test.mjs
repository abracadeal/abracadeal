import test from 'node:test';
import assert from 'node:assert/strict';
import { runRetention,handleRetention } from '../supabase/functions/process-data-retention/worker.js';

function mock(tasks,options={}) {
 const calls=[],removed=[],updates=[],sent=[],uploaded=[];
 const admin={
  async rpc(name,args){calls.push({name,args});if(name==='retention_claim_worker')return {data:options.busy?false:true};if(name==='retention_worker_tasks')return {data:tasks};if(name==='retention_begin_close')return {data:options.returned?false:true};if(name==='retention_storage_allowed')return {data:!options.shared&&!options.quarantine};if(name==='retention_storage_quarantine')return {data:options.quarantine?{bucket:'listing-images-pending',path:'retention-evidence/test/photo.jpg'}:null};return {data:null};},
  from(){return {select(){return this;},eq(){return this;},async single(){return {data:{secret_value:'test-secret'}};}};},
  auth:{admin:{async getUserById(){return {data:{user:{email:'owner@example.test',user_metadata:{phone:'secret',display_name:'Owner'}}}};},async updateUserById(id,body){updates.push({id,body});return {error:options.authFails?new Error('Auth unavailable'):null};},deleteUser(){throw new Error('Cascade deletion is forbidden');}}},
  storage:{from(bucket){return {async download(){return {data:new Blob(['test'],{type:'image/jpeg'})};},async upload(path){uploaded.push({bucket,path});return {error:options.uploadFails?new Error('Private upload unavailable'):null};},async remove(paths){removed.push({bucket,paths});return {error:options.storageFails?new Error('Storage unavailable'):null};}};}}
 };
 return {admin,calls,removed,updates,sent,uploaded,send:async(email,id)=>{if(options.mailFails)throw new Error('Mail unavailable');sent.push({email,id});}};
}
test('unauthorized request cannot read tasks, send notice or delete files',async()=>{
 const m=mock({});for(const key of ['', 'wrong']){
  const req=new Request('https://test.invalid',{method:'POST',headers:key?{'x-retention-key':key}:{}});
  assert.equal((await handleRetention(req,m.admin,m.send)).status,401);
 }assert.equal(m.calls.length,0);assert.equal(m.removed.length,0);assert.equal(m.sent.length,0);
});
test('failed notice never starts the 30-day clock and preserves the account',async()=>{
 const m=mock({accounts:[{user_id:'u1',state:'notice_pending'}]}, {mailFails:true});
 const counts=await runRetention(m.admin,m.send);assert.equal(counts.notices,0);assert.equal(counts.errors,1);
 assert.equal(m.updates.length,0);assert.ok(m.calls.find(x=>x.name==='retention_notice_result').args.p_error);
});
test('successful notice is recorded; it never closes an account in the same execution',async()=>{
 const m=mock({accounts:[{user_id:'u1',state:'notice_pending'}]});
 const counts=await runRetention(m.admin,m.send);assert.equal(counts.notices,1);assert.equal(m.updates.length,0);
 assert.equal(m.calls.find(x=>x.name==='retention_notice_result').args.p_error,undefined);
});
test('returned user or protected subscription prevents closing',async()=>{
 const m=mock({accounts:[{user_id:'u1',state:'notified'}]},{returned:true});
 await runRetention(m.admin,m.send);assert.equal(m.updates.length,0);assert.ok(!m.calls.some(x=>x.name==='retention_finish_close'));
});
test('closure keeps the UUID, bans access and clears personal auth metadata',async()=>{
 const m=mock({accounts:[{user_id:'u1',state:'notified'}]});
 assert.equal((await runRetention(m.admin,m.send)).closed,1);
 const body=m.updates[0].body;assert.equal(body.email,'closed-u1@accounts.invalid');assert.equal(body.phone,'');assert.ok(body.ban_duration);
 assert.deepEqual(body.user_metadata,{phone:null,display_name:null});assert.ok(m.calls.some(x=>x.name==='retention_finish_close'));
});
test('Auth failure leaves closure retryable and never marks it successful',async()=>{
 const m=mock({accounts:[{user_id:'u1',state:'closing'}]},{authFails:true});
 assert.equal((await runRetention(m.admin,m.send)).closed,0);assert.match(m.calls.find(x=>x.name==='retention_finish_close').args.p_error,/Auth unavailable/);
});
test('shared or legally held photo is retained; Storage failure keeps a retry entry',async()=>{
 const tasks={storage:[{id:1,bucket:'listing-images',path:'photo.jpg'}]};
 const shared=mock(tasks,{shared:true});await runRetention(shared.admin,shared.send);assert.equal(shared.removed.length,0);
 const failed=mock(tasks,{storageFails:true});await runRetention(failed.admin,failed.send);assert.equal(failed.removed.length,1);
 assert.match(failed.calls.find(x=>x.name==='retention_storage_result').args.p_error,/Storage unavailable/);
 const success=mock(tasks);assert.equal((await runRetention(success.admin,success.send)).photos_deleted,1);assert.equal(success.calls.find(x=>x.name==='retention_storage_result').args.p_error,undefined);
});
test('concurrent execution cannot repeat a batch',async()=>{
 const m=mock({accounts:[{user_id:'u1',state:'notice_pending'}]}, {busy:true});
 assert.deepEqual(await runRetention(m.admin,m.send),{busy:true});assert.equal(m.sent.length,0);assert.equal(m.calls.length,1);
});
test('photo under legal hold moves to private storage before public removal; failed copy preserves original',async()=>{
 const tasks={storage:[{id:1,bucket:'listing-images',path:'photo.jpg'}]};
 const ok=mock(tasks,{quarantine:true});await runRetention(ok.admin,ok.send);
 assert.equal(ok.uploaded[0].bucket,'listing-images-pending');assert.equal(ok.removed[0].bucket,'listing-images');
 assert.ok(ok.calls.some(x=>x.name==='retention_storage_quarantined'));
 const failed=mock(tasks,{quarantine:true,uploadFails:true});await runRetention(failed.admin,failed.send);
 assert.equal(failed.removed.length,0);assert.ok(!failed.calls.some(x=>x.name==='retention_storage_quarantined'));
});
