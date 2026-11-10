import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseApimoDetail,isApimoModules,readApimoModules} from '../supabase/functions/pro-stock-sync/apimo-reader.ts';
const origin='https://gubernatis-immobilier.com',url=origin+'/fr/propriete/vente/appartement/nice/nice-carabacel-studio-avec-terrasse/87563806';
const html=fs.readFileSync(new URL('./fixtures/gubernatis-property-87563806.html',import.meta.url),'utf8');
const home='<a href="https://apimo.net/fr/">Apimo</a><div data-model-namespace="x"><a href="/fr/nos-biens">Biens</a></div>';
assert.ok(isApimoModules(home));assert.ok(!isApimoModules(home.replace('apimo.net','example.com')));
const r=parseApimoDetail(html,url);assert.equal(r.prix,'245000');assert.equal(r.surface,'30.08');assert.equal(r.ville,'Nice');assert.equal(r.type_bien,'appartement');assert.equal(r.transaction,'vente');assert.equal(r.dpe,'C');assert.equal(r.ges,'A');assert.equal(r.photos.split('|').length,10);
assert.equal(parseApimoDetail(html,url.replace('/vente/','/location/')).transaction,'location');
const program=origin+'/fr/programme/programme+appartement+nice+nice-riquier-programme-neuf+82317780';
let visited=[];
async function run(expected=84){return readApimoModules(new URL(origin+'/fr/nos-biens'),home,async u=>{visited.push(u.href);if(u.pathname.includes('/propriete/')||u.pathname.includes('/programme/'))return {url:u,text:html.replaceAll("87563806",u.pathname.match(/(?:\/|\+)(\d+)$/)[1])};const page=Number(u.searchParams.get('page')||1);const items=Array.from({length:12},(_,i)=>{const n=(page-1)*12+i;return n===83?program:origin+'/fr/propriete/vente/appartement/nice/bien/'+(80000000+n);});return {url:u,text:`<h2>Résultats recherches\n${expected}</h2><div data-module-id="1" class="module-listing">${items.map(x=>`<a href="${x}">Bien</a>`).join('')}${page<7?`<a href="/fr/nos-biens?page=${page+1}">Suivant</a>`:''}<a href="/fr/biens-vendus">Vendus</a></div>`};});}
const rows=await run();assert.equal(rows.length,84);assert.equal(rows.total,84);assert.equal(rows.partial,false);assert.equal(rows.stats.expected_total,84);assert.equal(rows.stats.cycle_complete,true);assert.equal(rows.stats.remaining,0);assert.ok(visited.includes(program));assert.ok(!visited.some(x=>x.includes('vendus')));
const mismatch=await run(85);assert.equal(mismatch.partial,true);assert.equal(mismatch.stats.total_mismatch,true);
console.log('Gubernatis: slash routes, 7 pages/84 entries including programme, accurate types, graphics C/A, mismatch stays partial');
