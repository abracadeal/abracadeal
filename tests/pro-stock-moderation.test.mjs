import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('../supabase/functions/pro-stock-sync/index.ts',import.meta.url),'utf8');
function harness({existing=null,apiFailure=false}={}){
 const writes=[],calls=[];let handler;
 const admin={auth:{admin:{getUserById:async()=>({data:{user:{email:'test@example.test'}}})}},from(table){
  let op='select',payload,filters=[];
  const q={select(){return q},insert(v){op='insert';payload=v;return q},update(v){op='update';payload=v;return q},delete(){op='delete';return q},upsert(v){op='upsert';payload=v;return q},eq(k,v){filters.push([k,v]);return q},not(){return q},maybeSingle(){return resolve()},single(){return resolve()},then(a,b){return resolve().then(a,b)}};
  async function resolve(){
   if(op!=='select')writes.push({table,op,payload});
   let data=null;
   if(table==='pro_stock_sync_runs')data={id:'run'};
   if(table==='listings')data=op==='select'?existing:{id:existing?.id||'new-listing',photo_limit:3};
   if(table==='profiles')data={phone:null};
   if(table==='integration_secrets')data={secret_value:'fake-secret'};
   return {data,error:null};
  }
  return q;
 }};
 const context=vm.createContext({createClient:()=>admin,Deno:{env:{get:()=> 'https://example.test'},serve:h=>{handler=h}},fetch:async(url,opts)=>{
  if(String(url).includes('geo.api.gouv.fr'))return Response.json([]);
  calls.push({url,body:JSON.parse(opts.body),headers:opts.headers});
  return Response.json(apiFailure?{ok:false,status:'pending',ai_checked:false,ai_error:'OpenAI unavailable'}:{ok:true,status:'pending',ai_checked:true});
 },crypto:webcrypto,TextEncoder,Response,Request,URL,AbortController,AbortSignal,DOMException,btoa,setTimeout,clearTimeout,console:{error(){},warn(){}}});
 vm.runInContext(stripTypeScriptTypes(source.replace(/^import[^\n]+\n/,'')),context);
 return {context,writes,calls,get handler(){return handler}};
}
const feed={id:'feed',owner_id:'owner',sector:'vehicules',sync_mode:'upsert'};
const raw={reference:'A1',titre:'Voiture de test',ville:'Cannes',prix:25000,marque:'Audi',modele:'Q3',description:'Bon état',photos:'https://example.test/1.jpg|https://example.test/2.jpg|https://example.test/3.jpg|https://example.test/4.jpg'};
for(const existing of [null,{id:'old-listing',status:'active',photo_limit:3}])test(existing?'mise à jour de flux : pending et analyse de toutes les photos':'création de flux : pending et analyse de toutes les photos',async()=>{
 const h=harness({existing});h.context.feed=feed;h.context.rows=[raw];
 const result=await vm.runInContext('sync(feed,rows)',h.context);
 const listing=h.writes.find(w=>w.table==='listings');assert.equal(listing.payload.status,'pending');
 const photos=h.writes.find(w=>w.table==='listing_photos'&&w.op==='insert');assert.equal(photos.payload.length,3);
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].body.listing_id,existing?.id||'new-listing');assert.equal(result.moderated,1);
 assert.ok(h.writes.every(w=>w.payload?.status!=='active'));
});
test('OpenAI indisponible : annonce pending, erreur visible, aucun succès mensonger',async()=>{
 const h=harness({apiFailure:true});h.context.feed=feed;h.context.rows=[raw];
 const result=await vm.runInContext('sync(feed,rows)',h.context);assert.equal(result.errors,1);assert.equal(result.moderated,0);
 const run=h.writes.findLast(w=>w.table==='pro_stock_sync_runs');assert.equal(run.payload.status,'error');
 const f=h.writes.findLast(w=>w.table==='pro_stock_feeds');assert.match(f.payload.last_error,/OpenAI unavailable/);assert.equal(f.payload.last_success_at,undefined);
});
test('CSV et XML : photos conservées et normalisation identique',async()=>{
 const h=harness();
 h.context.csv='reference;titre;ville;prix;photo_1;photo_2\nA1;Voiture;Cannes;25000;https://example.test/1.jpg;https://example.test/2.jpg';
 h.context.xml='<stock><vehicle><reference>A1</reference><titre>Voiture</titre><ville>Cannes</ville><prix>25000</prix><photo_1>https://example.test/1.jpg</photo_1><photo_2>https://example.test/2.jpg</photo_2></vehicle></stock>';
 const a=await vm.runInContext("normalizeRows(parseCsv(csv),'vehicules')",h.context),b=await vm.runInContext("normalizeRows(parseXml(xml),'vehicules')",h.context);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert.equal(a[0].photos.length,2);
});
test('annonces masquées et refusées : pas de republication par le flux',async()=>{
 for(const status of ['hidden','rejected']){const h=harness({existing:{id:'old',status}});h.context.feed=feed;h.context.rows=[raw];await vm.runInContext('sync(feed,rows)',h.context);assert.equal(h.calls.length,0);assert.ok(h.writes.every(w=>w.table!=='listings'));}
});
test('route preview_url conservée ; refus des appels non authentifiés',async()=>{
 const h=harness();assert.match(source,/action==='preview_url'/);
 const response=await h.handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'normalize_preview',rows:[raw]})}));assert.equal(response.status,401);
});

test('XML : photos répétées et attributs src sont toutes conservées',async()=>{
 const h=harness();h.context.xml='<stock><vehicle><reference>A1</reference><titre>Voiture</titre><ville>Cannes</ville><photos><photo>https://example.test/a.jpg</photo><photo src="https://example.test/b.jpg?a=1&amp;b=2" /></photos></vehicle></stock>';
 const rows=await vm.runInContext("normalizeRows(parseXml(xml),'vehicules')",h.context);
 assert.equal(rows[0].photos.length,2);assert.equal(rows[0].photos[1],'https://example.test/b.jpg?a=1&b=2');
});
