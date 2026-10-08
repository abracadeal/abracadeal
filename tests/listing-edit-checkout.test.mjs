import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('options-annonce.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
async function render(rows,offers){
 const calls=[],cards=[],nodes=new Map();
 const node=()=>({textContent:'',innerHTML:'',classList:{add(){},remove(){}},prepend(c){cards.push(c)},querySelector(){return {}}});
 const document={body:node(),querySelector:()=>nodes.get('heading'),getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node};
 nodes.set('heading',node());
 const sb={auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},from(table){calls.push(['table',table]);const q={select(){return q},eq(k,v){calls.push([k,v]);return q},not(){return q},then(resolve){return Promise.resolve({data:rows}).then(resolve)}};return q},rpc:async(name)=>{calls.push(['rpc',name]);return {data:offers}}};
 const context=vm.createContext({document,location:{search:'?revision=candidate'},supabase:{createClient:()=>sb},URLSearchParams,Error,confirm(){},alert(){}});
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
