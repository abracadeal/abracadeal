import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {makePreviewHandler} from '../supabase/functions/site-reader-preview/handler.ts';
const request=body=>new Request('https://example.test',{method:'POST',body:JSON.stringify(body)});
test('unauthenticated callers cannot launch a read',async()=>{
 const h=makePreviewHandler({authorize:async()=>false,read:()=>{throw Error('Must not read');}});
 assert.equal((await h(request({action:'preview_url'}))).status,401);
});
test('synchronization, imports and invalid URLs cannot be launched',async()=>{
 const h=makePreviewHandler({authorize:async()=>true,read:()=>{throw Error('Must not read');}});
 for(const body of [{action:'sync_all'},{action:'preview_url',url:'file:///etc/passwd',sector:'immobilier'},
  {action:'preview_url',url:'https://user:secret@example.test',sector:'immobilier'},
  {action:'preview_url',url:'https://example.test',sector:'invalid'}])assert.equal((await h(request(body))).status,400);
});
test('authorized preview returns no-store JSON and supports preflight',async()=>{
 const h=makePreviewHandler({authorize:async()=>true,read:async(url,sector)=>({raw:[],sector})});
 const r=await h(request({action:'preview_url',url:'https://example.test',sector:'immobilier'}));
 assert.equal(r.status,200);assert.equal((await r.json()).preview_only,true);assert.equal(r.headers.get('cache-control'),'no-store');
 assert.equal((await h(new Request('https://example.test',{method:'OPTIONS'}))).status,200);
});
test('isolated deployed source has no database writes or synchronization handler',()=>{
 const root=new URL('../supabase/functions/site-reader-preview/',import.meta.url);
 for(const file of readdirSync(root)){
  if(!file.endsWith('.ts'))continue;
  const s=readFileSync(new URL(file,root),'utf8');stripTypeScriptTypes(s);
  assert.doesNotMatch(s,/\.\s*(insert|update|delete|upsert|rpc)\s*\(/);
  assert.ok(!s.includes('Deno.serve(async(req)=>'));
 }
 const page=readFileSync(new URL('../admin-reader-parallel.html',import.meta.url),'utf8');
 assert.ok(page.includes("invoke('site-reader-preview'"));assert.ok(!page.includes("invoke('pro-stock-sync'"));
 for(const m of page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))new Function(m[1]);
});
