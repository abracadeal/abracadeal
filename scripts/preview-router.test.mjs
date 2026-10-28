import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {readUnifiedPreview,routePreview} from '../supabase/functions/pro-stock-sync/preview-router.ts';

const row={reference:'42',titre:'Appartement de test'};
const base='https://agency.test/';
function harness(overrides={}){
 const calls=[];
 const read=name=>async()=>{calls.push(name);return [{...row}];};
 const deps={fetchHtml:async u=>({url:u,text:'<!doctype html><html></html>'}),readFile:read('file'),
  networkHomeError:()=>null,detectPlatform:()=> 'Unknown',orpiSlug:()=>null,isC21:()=>false,isAa:()=>false,isWoo:async()=>false,
  orpi:read('orpi'),c21:read('century21'),aa:read('annonces-automobile'),woo:read('woocommerce'),generic:read('structured-data'),
  parseImmo:()=>null,parseVehicle:()=>null,...overrides};
 return {deps,calls};
}
for(const [id,overrides] of [
 ['orpi',{orpiSlug:()=> 'my-agency'}],['century21',{isC21:()=>true}],
 ['annonces-automobile',{isAa:()=>true}],['woocommerce',{fetchHtml:async u=>({url:u,text:'<html>wp-content</html>'}),isWoo:async()=>true}],
 ['structured-data',{}]])test(`automatically selects ${id} and only invokes that connector`,async()=>{
 const h=harness(overrides),rows=await readUnifiedPreview({feed_url:base,sector:'immobilier'},h.deps);
 assert.equal(rows.connector_id,id);assert.deepEqual(h.calls,[id]);assert.equal(rows.preview_only,true);
 assert.deepEqual(rows.attempted_connectors,[id]);
});
test('WooCommerce detection cannot capture every WordPress site',async()=>{
 const h=harness({fetchHtml:async u=>({url:u,text:'<html>wp-content</html>'})});
 const rows=await readUnifiedPreview({feed_url:base},h.deps);assert.equal(rows.connector_id,'structured-data');
});
test('ERA shares the same entry point and verifies all pages without invoking another connector',async()=>{
 const url='https://www.eraimmobilier.com/achat/region-1/department-2/cannes-6465';
 const key='ssr-cache:https://api.eraimmobilier.com/api/v2/annonces/search?page=1&type_annonce=vente&geo_ville_id=6465';
 const body={data:[{id:1,geo_ville_id:6465,type_annonce:'Vente',type_bien:'Appartement',libelle:'Test',prix:10,photo:[]}],meta:{total:1,page:1,per_page:10}};
 let fetches=0;
 const h=harness({fetchHtml:async u=>{fetches++;return {url:u,text:`<html><script id="ng-state" type="application/json">${JSON.stringify({[key]:body})}</script></html>`};}});
 const rows=await readUnifiedPreview({feed_url:url,sector:'immobilier'},h.deps);
 assert.equal(rows.connector_id,'era');assert.equal(rows.partial,false);assert.deepEqual(h.calls,[]);assert.equal(fetches,1);
});
test('ERA does not fall back to other agencies when coverage cannot be verified',async()=>{
 const h=harness();
 await assert.rejects(readUnifiedPreview({feed_url:'https://www.eraimmobilier.com/achat/r-1/d-2/cannes-6465',sector:'immobilier'},h.deps),/données de recherche/);
 assert.deepEqual(h.calls,[]);
});
test('known connector failure automatically invokes the HTML secondary reader',async()=>{
 const html='<html><head><meta property="og:type" content="product"><meta property="og:title" content="Renault Clio occasion"><meta property="product:price:amount" content="12000"><meta property="og:image" content="/car.jpg"></head></html>';
 const h=harness({isAa:()=>true,aa:async()=>{throw Error('private upstream error');},fetchHtml:async u=>({url:u,text:html})});
 const rows=await readUnifiedPreview({feed_url:base,sector:'vehicules'},h.deps);
 assert.equal(rows.connector_id,'html-fallback');assert.equal(rows.reader_used,'secondary');assert.equal(rows.partial,true);
 assert.deepEqual(rows.attempted_connectors,['annonces-automobile','html-fallback']);
});
test('empty known connector stock falls back once; errors do not leak private upstream details',async()=>{
 let secondary=0;
 const rows=await routePreview([{id:'test',label:'Test',matches:()=>true,read:async()=>[]}],async()=>{secondary++;return [row];},'Secondary');
 assert.equal(secondary,1);assert.equal(rows.reader_used,'secondary');
 await assert.rejects(routePreview([{id:'test',label:'Test',matches:()=>true,read:async()=>{throw Error('private-secret');}}],async()=>[], 'Secondary'),
  error=>!error.message.includes('private-secret'));
});
test('JSON feeds retain the file reader with no site connector execution',async()=>{
 const h=harness({fetchHtml:async u=>({url:u,text:'[{"reference":"A1"}]'})});
 const rows=await readUnifiedPreview({feed_url:base+'feed.json'},h.deps);
 assert.equal(rows.connector_id,'file-feed');assert.deepEqual(h.calls,['file']);
});
test('network home guard and credentials stop before any fetch',async()=>{
 const h=harness({fetchHtml:()=>{throw Error('Must not fetch');},networkHomeError:()=> 'Use an agency URL'});
 await assert.rejects(readUnifiedPreview({feed_url:base},h.deps),/agency URL/);
 await assert.rejects(readUnifiedPreview({feed_url:'https://user:secret@agency.test'},h.deps),/identifiants/);
});
test('ERA unsupported pages cannot silently expand into a national stock crawl',async()=>{
 const h=harness({fetchHtml:()=>{throw Error('Must not fetch');}});
 await assert.rejects(readUnifiedPreview({feed_url:'https://www.eraimmobilier.com/'},h.deps),/adresse locale/);
});

// Verify server wiring: previews use the registry; imports keep their original reader.
const source=readFileSync(new URL('../supabase/functions/pro-stock-sync/index.ts',import.meta.url),'utf8');
stripTypeScriptTypes(source);
test('preview routes use unified reader, import routes remain unchanged',()=>{
 assert.match(source,/action==='preview_url'\?await readPreviewFeed\(/);
 const preview=source.slice(source.indexOf("if(body?.action==='preview_feed')"),source.indexOf(' // Un site en attente'));
 assert.match(preview,/readPreviewFeed\(feed\)/);assert.ok(!preview.includes('.update('));
 assert.match(source,/sync\(f,await readFeed\(f\)\)/);
 assert.match(source,/return json\(await sync\(feed,rows,body\?\.sync_mode\)\)/);
});
