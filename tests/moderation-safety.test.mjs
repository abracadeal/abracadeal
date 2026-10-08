import {scanSafety,enforce} from '../supabase/functions/moderate-listing/safety.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {stageImportedImages} from '../supabase/functions/moderate-listing/import-images.ts';
import {prohibitedTerms,hashPhotos} from '../supabase/functions/moderate-listing/policy.ts';
const listing={id:'listing',owner_id:'owner',title:'Mercedes Classe V',description:'Véhicule à vendre'};
const photos=[{id:'b',storage_path:'b.webp',storage_bucket:'listing-images-pending'},{id:'a',storage_path:'a.webp',storage_bucket:'listing-images-pending'}];
const admin={storage:{from:()=>({createSignedUrl:async p=>({data:{signedUrl:'https://example.test/'+p}})})}};
const cats={sexual:false,'sexual/minors':false,violence:false,'violence/graphic':false};
const response=(categories=cats)=>Response.json({results:[{flagged:Object.values(categories).some(Boolean),categories}]});
test('termes interdits dans toutes les catégories, massage professionnel autorisé',()=>{
 for(const word of ['Rencontre','escort','Accompagnement','Moment de détente','moments de detente']){
  assert.ok(prohibitedTerms({title:word,category:'vehicules',seller_type:'professionnel'}).length);
 }
 assert.deepEqual(prohibitedTerms({title:'Massage professionnel',seller_type:'professionnel'}),[]);
 assert.deepEqual(prohibitedTerms({title:'Massage',seller_type:'particulier'}),['massage non professionnel']);
 assert.deepEqual(prohibitedTerms({title:'Massage amateur',seller_type:'professionnel'}),['massage non professionnel']);
});
test('SHA-256 identique pour les mêmes octets, détection entre comptes',async()=>{
 const hashes=[];
 const service={storage:{from:()=>({download:async()=>({data:new Blob(['photo identique'])})})},
  rpc:async(n,p)=>{hashes.push(p.p_sha256);return{data:hashes.length>1?1:0}}};
 assert.equal(await hashPhotos(service,photos),1);
 assert.equal(hashes[0],hashes[1]);assert.match(hashes[0],/^[0-9a-f]{64}$/);
});
test('photos externes importées dans le bucket privé ; adresses privées refusées',async()=>{
 const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
 const calls=[];
 globalThis.Deno={resolveDns:async()=>['198.51.100.10']};
 globalThis.fetch=async()=>new Response(new Uint8Array([137,80,78,71,0,0,0,0]),{status:200});
 const query={eq(){return query},select:async()=>({data:[{id:'photo'}]})};
 const service={storage:{from:bucket=>({upload:async(path,bytes)=>{calls.push({bucket,path});return{}},remove:async()=>({})})},from:()=>({update:()=>query})};
 try{
  const rows=[{id:'photo',storage_path:'https://stock.example/photo.png'}];
  await stageImportedImages(service,listing,rows);
  assert.equal(calls[0].bucket,'listing-images-pending');
  assert.match(rows[0].storage_path,/^owner\/listing\//);
  assert.equal(rows[0].storage_bucket,'listing-images-pending');
  await assert.rejects(stageImportedImages(service,listing,[{id:'other',storage_path:'http://127.0.0.1/private.png'}]),/privée interdite/);
 }finally{globalThis.fetch=originalFetch;globalThis.Deno=originalDeno;}
});
test('texte et chaque photo privée sont analysés, snapshot déterministe',async()=>{
 const calls=[];
 const result=await scanSafety(admin,listing,photos,async(u,o)=>{calls.push(JSON.parse(o.body));return response()},'test');
 assert.equal(calls.length,3);assert.equal(result.imagesChecked,2);
 assert.equal(calls[0].input[0].type,'text');assert.equal(calls[1].input[0].type,'image_url');
 assert.deepEqual(result.categories,[]);assert.equal(result.snapshot.photos[0].id,'a');
});
test('contenu sexuel et violent détecté sur une photo',async()=>{
 const result=await scanSafety(admin,listing,photos,async(u,o)=>response(JSON.parse(o.body).input[0].type==='image_url'?{...cats,sexual:true,violence:true}:cats),'test');
 assert.deepEqual(result.categories,['sexual','violence']);
});
test('erreur API, réponse incomplète, clé absente, photo inaccessible échouent',async()=>{
 await assert.rejects(scanSafety(admin,listing,photos,async()=>new Response('',{status:503}),'test'),/503/);
 await assert.rejects(scanSafety(admin,listing,photos,async()=>Response.json({results:[]}),'test'),/incomplète/);
 await assert.rejects(scanSafety(admin,listing,[],async()=>response(),''),/absent/);
 await assert.rejects(scanSafety({storage:{from:()=>({createSignedUrl:async()=>({error:Error('inaccessible')})})}},listing,photos,async()=>response(),'test'),/inaccessible/);
});
test('refus suspend le compte et supprime les photos des deux buckets',async()=>{
 const calls=[];
 const chain=(table)=>{const q={
  select(){return q},eq(){return q},neq(){return q},delete(){calls.push(['delete',table]);return q},
  update(data){calls.push(['update',table,data]);return q},
  then(resolve){resolve({data:table==='listings'?[{id:'listing'}]:photos})}
 };return q};
 const service={rpc:async(n,p)=>{calls.push(['rpc',n,p]);return{}},from:chain,
  auth:{admin:{updateUserById:async(id,p)=>{calls.push(['ban',id,p]);return{}}}},
  storage:{from:bucket=>({remove:async paths=>{calls.push(['remove',bucket,paths]);return{}}})}};
 await enforce(service,listing,'violence');
 assert.equal(calls[0][1],'moderation_suspend_owner');
 assert.equal(calls.find(c=>c[0]==='ban')[2].ban_duration,'876000h');
 assert.deepEqual(calls.filter(c=>c[0]==='remove').map(c=>c[1]),['listing-images','listing-images-pending']);
 assert.ok(calls.some(c=>c[0]==='update'&&c[1]==='listing_moderation'&&c[2].safety_blocked===true));
});
test('UI : photos rouges floutées, vertes visibles, onglet signalements et Pharos',()=>{
 const element={addEventListener(){},classList:{add(){},remove(){}},style:{}};
 const document={querySelector:()=>element,addEventListener(){},querySelectorAll:()=>[],body:{style:{}}};
 const sb={auth:{getSession:()=>new Promise(()=>{})}};
 const context=vm.createContext({document,supabase:{createClient:()=>sb},console,Map,Set,Date,setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(new URL('../assets/moderation.js',import.meta.url),'utf8'),context);
 vm.runInContext("state.mods.set('listing',{risk_level:'red',risk_score:100});state.photoUrls.set('a.webp','https://signed.test/a');state.rows=[{id:'listing',listing_photos:[{storage_path:'a.webp'}]}]",context);
 const red=vm.runInContext("card(state.rows[0])",context);
 assert.match(red,/sensitive-photo/);assert.match(red,/Signaler à Pharos/);assert.match(red,/signed.test/);
 vm.runInContext("state.mods.set('listing',{risk_level:'green'})",context);
 assert.doesNotMatch(vm.runInContext("card(state.rows[0])",context),/sensitive-photo/);
 assert.match(fs.readFileSync(new URL('../moderation.html',import.meta.url),'utf8'),/data-tab="reported"/);
});
test('UI : Analyse impossible et dernière erreur après dix relances, texte échappé',()=>{
 const element={addEventListener(){},classList:{add(){},remove(){}},style:{}};
 const document={querySelector:()=>element,addEventListener(){},querySelectorAll:()=>[],body:{style:{}}};
 const sb={auth:{getSession:()=>new Promise(()=>{})}};
 const context=vm.createContext({document,supabase:{createClient:()=>sb},console,Map,Set,Date,setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(new URL('../assets/moderation.js',import.meta.url),'utf8'),context);
 vm.runInContext("state.mods.set('listing',{retry_attempts:10,retry_exhausted:true,ai_checked:false,retry_last_error:'OpenAI 429 <script>bad</script>'});state.rows=[{id:'listing',status:'pending'}]",context);
 const html=vm.runInContext('card(state.rows[0])',context);
 assert.match(html,/Analyse impossible/);assert.match(html,/10 relances/);assert.match(html,/Dernière erreur : OpenAI 429 &lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 vm.runInContext("state.mods.get('listing').ai_checked=true",context);
 assert.doesNotMatch(vm.runInContext('card(state.rows[0])',context),/Analyse impossible/);
});
