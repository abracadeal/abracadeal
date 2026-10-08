import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/prepare-listing-edit/index.ts','utf8')).replace(/^import .*;\s*$/gm,'');
function handlerFor(status,calls){
 let handler;
 const admin={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:table=>{
  const chain={select(){return this},eq(){return this},in(){return this},single:async()=>({data:{id:'candidate',owner_id:'owner',revision_of:'original',status:'pending'}}),maybeSingle:async()=>({data:{id:'order',status,stripe_checkout_session_id:'cs_test'}}),update(x){calls.push(x.status);return this},delete(){calls.push('delete');return this},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};return chain;
 },storage:{from:()=>({remove:async()=>({})})}};
 const context=vm.createContext({createClient:()=>admin,Deno:{env:{get:()=> 'test'},serve:h=>handler=h},Response,Error,AbortSignal,console,fetch:async(url,params)=>{calls.push(params.method==='POST'?'expire':'lookup');return Response.json({status:params.method==='POST'?'expired':'open'})}});
 vm.runInContext(source,context);return handler;
}
const request=()=>new Request('https://test',{method:'POST',headers:{Authorization:'Bearer owner'},body:JSON.stringify({action:'cancel',listing_id:'candidate'})});
test('proposition payée : annulation bloquée sans supprimer la version',async()=>{const calls=[];const r=await handlerFor('paid',calls)(request());assert.equal(r.status,409);assert.deepEqual(calls,[])});
test('proposition non payée : expire le checkout avant suppression',async()=>{const calls=[];const r=await handlerFor('pending',calls)(request());assert.equal(r.status,200);assert.deepEqual(calls,['lookup','expire','cancelled','delete']);assert.equal((await r.json()).cancelled,true)});
