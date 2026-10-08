import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('options-annonce.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
async function render(rows,offers,search='?revision=candidate'){
 const calls=[],cards=[],nodes=new Map();
 const node=()=>({textContent:'',innerHTML:'',classList:{add(){},remove(){}},prepend(c){cards.push(c)},appendChild(c){cards.push(c)},querySelector(){return {}}});
 const document={body:node(),querySelector:()=>nodes.get('heading'),getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node};
 nodes.set('heading',node());
 const sb={auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},from(table){calls.push(['table',table]);const q={maybeSingle:async()=>({data:{account_type:'particulier',is_admin:false}}),select(){return q},eq(k,v){calls.push([k,v]);return q},not(){return q},is(){return q},in(){return q},order(){return q},limit(){return q},then(resolve){return Promise.resolve({data:rows}).then(resolve)}};return q},rpc:async(name)=>{calls.push(['rpc',name]);return {data:name==='get_my_listing_revisions'?[{candidate_id:'candidate',paid:false,included:false,applied_at:null}]:offers}}};
 const context=vm.createContext({document,location:{search},supabase:{createClient:()=>sb},URLSearchParams,Error,confirm(){},alert(){}});
 vm.runInContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {calls,cards,nodes,document};
}
test('paiement de modification : une seule proposition et son tarif commerce, sans catalogue ni boosts',async()=>{
 const result=await render([{id:'candidate',revision_of:'original',title:'Annonce modifiée'}],[{code:'private_listing_edit',amount_cents:1234},{code:'private_featured',amount_cents:499}]);
 assert.equal(result.cards.length,1);
 assert.match(result.cards[0].innerHTML,/12,34 € TTC/);
 assert.doesNotMatch(result.cards[0].innerHTML,/4,99|Acheter|<select/);
 assert.match(result.cards[0].innerHTML,/facturée/);
 assert.match(result.cards[0].innerHTML,/Après paiement et validation/);
 assert.match(result.cards[0].innerHTML,/en tête des résultats/);
 assert.match(result.cards[0].innerHTML,/ancienne version reste en ligne/);
 assert.equal(result.nodes.get('heading').textContent,'Modifier et remonter mon annonce');
 assert.ok(result.calls.some(([key,value])=>key==='id'&&value==='candidate'));
 assert.ok(!result.calls.some(([key,value])=>key==='rpc'&&value==='get_my_commerce_boost_wallet'));
});
test('proposition absente : explique le problème sans proposer d’autres achats',async()=>{
 const result=await render([],[]);
 assert.equal(result.cards.length,0);
 assert.match(result.nodes.get('status').textContent,/modification n’est plus disponible/);
});
test('tarif absent : bloque la modification sans inventer de prix',async()=>{
 const result=await render([{id:'candidate',revision_of:'original',title:'Annonce modifiée'}],[]);
 assert.equal(result.cards.length,0);
 assert.match(result.nodes.get('status').textContent,/tarif de modification est indisponible/);
});

test('ancien lien sans paramètre : affiche seulement le tarif de la modification non payée',async()=>{
 const result=await render([{id:'candidate',revision_of:'original',title:'Annonce modifiée'}],[{code:'private_listing_edit',amount_cents:290},{code:'photo_lifestyle_10',offer_type:'photo_option',amount_cents:99}], '');
 assert.equal(result.cards.length,1);
 assert.match(result.cards[0].innerHTML,/2,90 € TTC/);
 assert.doesNotMatch(result.cards[0].innerHTML,/0,99|10 photos|<select/);
 assert.equal(result.nodes.get('heading').textContent,'Modifier et remonter mon annonce');
});

test('compte avec une annonce Auto : pack Auto seul, sans tarifs Immo, Maison ou Services',async()=>{
 const offers=[
  {code:'photo_auto_moto_15',offer_type:'photo_option',label:'Photos Auto / Moto',amount_cents:299},
  {code:'photo_immo_15',offer_type:'photo_option',label:'Photos Immobilier',amount_cents:299},
  {code:'photo_lifestyle_10',offer_type:'photo_option',label:'Photos Mode / Maison / High-tech',amount_cents:99},
  {code:'photo_services_emploi_10',offer_type:'photo_option',label:'Photos Services / Emploi',amount_cents:99}
 ];
 const result=await render([{id:'original',title:'Jantes',category:'vehicules',status:'active'}],offers,'?options=1');
 assert.equal(result.cards.length,1);
 assert.match(result.cards[0].innerHTML,/Photos Auto \/ Moto/);
 assert.doesNotMatch(result.cards[0].innerHTML,/Immobilier|Maison|Services|0,99/);
});
test('packs photos : chaque catégorie utilise seulement son pack ; annonce inactive exclue',()=>{
 const context=vm.createContext({supabase:{createClient:()=>({auth:{getSession:()=>new Promise(()=>{})}})},location:{search:'?options=1'},URLSearchParams});
 vm.runInContext(source,context);
 for(const [category,code] of [['vehicules','photo_auto_moto_15'],['immobilier','photo_immo_15'],['mode','photo_lifestyle_10'],['maison','photo_lifestyle_10'],['hightech','photo_lifestyle_10'],['services','photo_services_emploi_10'],['emploi','photo_services_emploi_10']]){
  vm.runInContext('listings='+JSON.stringify([{id:'active',category,status:'active'},{id:'pending',category,status:'pending'}]),context);
  for(const offer of ['photo_auto_moto_15','photo_immo_15','photo_lifestyle_10','photo_services_emploi_10']){
   context.offer={code:offer,offer_type:'photo_option'};
   assert.equal(vm.runInContext('compatible(offer).length',context),offer===code?1:0);
  }
 }
});
