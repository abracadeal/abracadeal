import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bergeConfig,bergePage,parseBerge,readBerge,bergeIdentity} from '../supabase/functions/pro-stock-sync/berge-reader.ts';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/berge/lp1778.json',import.meta.url)));
const url='https://www.berge.fr/mandat-details?recordId='+fixture.id;
const row=parseBerge(fixture,url);
assert.notEqual(bergeIdentity({externalUrl:url,ref:'VF100'}),bergeIdentity({externalUrl:url,ref:'VF088'}));
assert.equal(bergeIdentity({externalUrl:'https://example.org',ref:'VF100'}),null);
const diagnostic=parseBerge({...fixture,fields:{...fixture.fields,DPE:'https://i.goopics.net/14pcoe.png'}},url);assert.equal(diagnostic.dpe_image,'https://i.goopics.net/14pcoe.png');assert.equal(diagnostic.dpe,undefined);
assert.equal(row.prix,'19979');assert.equal(row.surface,1370);assert.equal(row.ville,'Villeneuve-Loubet');
const financial=parseBerge({...fixture,fields:{...fixture.fields,'Charges annuelles':6500,'Taxe Foncières':6097,'Dépôt de garantie':'2 mois'}},url);assert.equal(financial.charges_annuelles,6500);assert.equal(financial.taxe_fonciere,6097);assert.equal(financial.depot_garantie,undefined);
assert.equal(row.transaction,'location');assert.equal(row.photos.split('|').length,8);
assert.match(row.description,/HT HC/);assert.match(row.description,/Occupation : Loué/);
assert.equal(row.contact_nom,undefined);assert.equal(row.chambres,undefined);
assert.throws(()=>parseBerge({...fixture,fields:{...fixture.fields,'Prix / Loc ou Vente':'Prix sur demande'}},url),/Prix/);
assert.throws(()=>parseBerge({...fixture,fields:{...fixture.fields,'Prix / Loc ou Vente':'240 € / m² / an'}},url),/mensuelle/);
assert.throws(()=>bergePage({records:[fixture,fixture],offset:null}),/répétée/);
assert.throws(()=>bergePage({records:[],offset:'next'}),/vide/);
assert.throws(()=>bergeConfig('var softrBlocks = alert(1);\n'),/illlisible|illisible/);
const originalFetch=globalThis.fetch;let saved,requests=[];
const fields=Object.keys(fixture.fields);
const block=(id,name='list-details')=>({id,name,version:'5.0.0',collection:{dataSource:{type:'AIRTABLE',id:'public-ds',isComplete:true}},elements:{fields:fields.concat(['DPE','GES','Prix Location annuel']).map(mappedTo=>({mappedTo}))}});
const html=(page,blocks)=>'var softrBlocks = '+JSON.stringify(blocks)+';\nSoftrPageRenderer.render({appId: "public-app", pageId: "'+page+'"});';
globalThis.fetch=async(raw,options)=>{
 const u=new URL(raw),body=JSON.parse(options.body);requests.push(u.pathname);
 assert.equal(u.hostname,'www.berge.fr');assert.deepEqual(body.filterCriteria,{});
 if(u.pathname.includes('/list/')){
  const rent=u.pathname.includes('/rent/');
  // One sale catalogue has two cursor pages. Rental repeats a public ID;
  // identity remains the record, rather than a photo or a guessed city.
  const ids=rent?['rec0']:body.pagingOption.offset?Array.from({length:12},(_,i)=>'rec'+(i+13)):Array.from({length:13},(_,i)=>'rec'+i);
  return {ok:true,text:async()=>JSON.stringify({records:ids.map(id=>({id,fields:{}})),offset:!rent&&!body.pagingOption.offset?'next':null})};
 }
 const id=u.pathname.split('/').at(-1);
 return {ok:true,text:async()=>JSON.stringify({records:[{id,fields:{...fixture.fields,'Référence Netty':id}}],offset:null})};
};
try{
 const fetchHtml=async u=>({url:u,text:u.pathname==='/'?'tel:0493995252':u.pathname==='/mandat-details'?html('detail',[block('detail')]):html(u.pathname.endsWith('vente')?'sale':'rent',[block('list','list17')])});
 const memory={load:async()=>saved,save:async state=>{saved=structuredClone(state)}};
 let result;for(let i=0;i<3;i++){result=await readBerge(new URL('https://www.berge.fr'),fetchHtml,memory);if(i===0)assert.equal(result.partial,true);}
 assert.equal(result[0].contact_nom,'Bergé Immobilier (agence)');assert.equal(result[0].contact_telephone,'0493995252');
 assert.equal(result.length,25);assert.equal(result.partial,false);assert.equal(result.stats.remaining,0);
 assert.equal(saved.discovered.length,25);assert.equal(result.filter(r=>r.reference==='rec0').length,1);
 assert.ok(requests.every(p=>!p.includes('/similar/')));
}finally{globalThis.fetch=originalFetch;}
console.log('Bergé: public record, monthly rent, strict pagination, own identity, resumable 25 records OK');
