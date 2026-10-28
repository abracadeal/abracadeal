import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import { eraPreviewScope, parseEraPreview } from '../supabase/functions/pro-stock-sync/era-preview.ts';

const url='https://www.eraimmobilier.com/achat/region-17/departement-10/cannes-6465';
const item={id:42,geo_ville_id:6465,type_annonce:'Vente',type_bien:'Appartement',libelle:'Appartement de test',
  prix:230000,ville:'Cannes',code_postal:'06150',surface_habitable:65,nb_pieces:3,nb_chambres:2,
  photo:['private-test-photo-path'],descriptif:'Description non copiée'};
const key='ssr-cache:https://api.eraimmobilier.com/api/v2/annonces/search?page=1&type_annonce=vente&geo_ville_id=6465';
const html=data=>`<script id="ng-state" type="application/json">${JSON.stringify(data)}</script>`;
test('ERA local scope excludes other hosts, root pages and credentials',()=>{
  assert.equal(eraPreviewScope(new URL(url)),true);
  for(const value of [url.replace('.com/','.com.evil/'),'https://www.eraimmobilier.com/',url.replace('https://','https://user:pass@')])
    assert.equal(eraPreviewScope(new URL(value)),false);
});
test('ERA preview uses only exact city search; ignores recommendations and removes duplicates',()=>{
  const rows=parseEraPreview(html({[key]:{data:[item,item,{...item,id:43,geo_ville_id:99}],meta:{total:36}},
    'ssr-cache:https://api.eraimmobilier.com/api/v2/annonces/top':{data:[{...item,id:99}]}}),url);
  assert.equal(rows.length,1);assert.equal(rows[0].ville,'Cannes');assert.equal(rows[0].surface,65);
  assert.equal(rows.source_total,36);assert.equal(rows.partial,true);assert.equal(rows.preview_only,true);
});
test('photo count is exposed, never photo paths, images, descriptions or agency contacts',()=>{
  const rows=parseEraPreview(html({[key]:{data:[item]}}),url);
  assert.equal(rows[0].source_photo_count,1);assert.equal(rows[0].photos,'');
  assert.ok(!JSON.stringify(rows).includes('private-test-photo-path'));
  assert.equal(rows[0].description,undefined);assert.equal(rows.photos_withheld,true);
});
test('missing, malformed, ambiguous or unrelated search stops with a clear error',()=>{
  for(const body of ['', '<script id="ng-state" type="application/json">invalid</script>',
    html({}),html({[key]:{data:[{...item,geo_ville_id:99}]}}),
    html({[key]:{data:[item]},[key+'&other=1']:{data:[item]}})])assert.throws(()=>parseEraPreview(body,url));
});
const source=readFileSync(new URL('../supabase/functions/pro-stock-sync/index.ts',import.meta.url),'utf8');
stripTypeScriptTypes(source);
const helper=stripTypeScriptTypes(source.slice(source.indexOf('async function readPreviewFeed('),source.indexOf('async function moderationSecret(')));
function preview(fetchSiteHtml,readFeed=()=>{throw Error('Import reader must not run');}){
  return new Function('eraPreviewScope','parseEraPreview','fetchSiteHtml','readFeed',helper+'; return readPreviewFeed;')
    (eraPreviewScope,parseEraPreview,fetchSiteHtml,readFeed);
}
test('ERA preview downloads the requested HTML once and never runs the import reader',async()=>{
  let calls=0;
  const rows=await preview(async requested=>{calls++;assert.equal(requested.toString(),url);return {url:requested,text:html({[key]:{data:[item]}})};})
    ({feed_url:url,sector:'immobilier'});
  assert.equal(calls,1);assert.equal(rows.preview_only,true);
});
test('wrong sector or cross-search redirects cannot widen ERA preview',async()=>{
  await assert.rejects(preview(()=>{throw Error('Must not fetch');})({feed_url:url,sector:'vehicules'}),/Immobilier/);
  await assert.rejects(preview(async()=>({url:new URL(url.replace('6465','99')),text:''}))({feed_url:url,sector:'immobilier'}),/redirigé/);
});
test('other sites retain the existing reader',async()=>{
  const rows=await preview(()=>{throw Error('Must not fetch');},async()=>['existing'])({feed_url:'https://example.com',sector:'immobilier'});
  assert.deepEqual(rows,['existing']);
});
