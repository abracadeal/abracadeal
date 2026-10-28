import test from 'node:test';
import assert from 'node:assert/strict';
import { eraPreviewScope, parseEraPreview, readAllEraPreview } from '../supabase/functions/pro-stock-sync/era-preview.ts';

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
function pageHtml(page, {total=25, duplicate=false, links=true}={}) {
 const count=page===3?5:10;
 const data=Array.from({length:count},(_,i)=>({...item,id:duplicate?i+1:(page-1)*10+i+1}));
 return html({[key.replace('page=1',`page=${page}`)]:{data,meta:{total,per_page:10,page}}})
  +(links?[1,2,3].map(n=>`<a href="${new URL(url).pathname}?page=${n}">${n}</a>`).join(''):'');
}
test('reads all three pages and returns exactly 25 distinct properties',async()=>{
 const calls=[];
 const rows=await readAllEraPreview(new URL(url),async u=>{const page=Number(u.searchParams.get('page')||1);calls.push(page);return {url:u,text:pageHtml(page)};});
 assert.deepEqual(calls,[1,2,3]);assert.equal(rows.length,25);assert.equal(rows.source_total,25);
 assert.equal(rows.source_pages,3);assert.equal(rows.partial,false);assert.equal(rows.preview_only,true);
 assert.ok(rows.every(row=>row.photos===''));
});
test('a starting page other than 1 still reads the entire search from page 1',async()=>{
 const calls=[];
 await readAllEraPreview(new URL(url+'?page=3'),async u=>{const n=Number(u.searchParams.get('page')||1);calls.push(n);return {url:u,text:pageHtml(n)};});
 assert.deepEqual(calls,[1,2,3]);
});
test('missing pagination or duplicates cannot be reported as complete',async()=>{
 for(const options of [{links:false},{duplicate:true}])await assert.rejects(readAllEraPreview(new URL(url),async u=>({url:u,text:pageHtml(Number(u.searchParams.get('page')||1),options)})),/incomplète/);
});
test('page failures and changing totals fail rather than silently returning 10 out of 25',async()=>{
 await assert.rejects(readAllEraPreview(new URL(url),async u=>{if(u.searchParams.get('page')==='2')throw Error('HTTP 503');return {url:u,text:pageHtml(1)};}),/503/);
 await assert.rejects(readAllEraPreview(new URL(url),async u=>{const n=Number(u.searchParams.get('page')||1);return {url:u,text:pageHtml(n,{total:n===1?25:24})};}),/changé/);
});
test('wrong server page and extra filters are rejected',async()=>{
 await assert.rejects(readAllEraPreview(new URL(url),async u=>({url:u,text:pageHtml(1)})));
 await assert.rejects(readAllEraPreview(new URL(url+'?type=maison'),async()=>{throw Error('Must not fetch');}),/filtre/);
});
