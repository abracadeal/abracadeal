import assert from 'node:assert/strict';
import fs from 'node:fs';
import {kombishopLinks,parseKombishop,readKombishop,isKombishop} from '../supabase/functions/pro-stock-sync/kombishop-reader.ts';
import {cpuReset} from '../supabase/functions/pro-stock-sync/cpu-meter.ts';
const fixture=n=>fs.readFileSync(new URL('./fixtures/kombishop-'+n+'.html',import.meta.url),'utf8');
const product=h=>JSON.parse(h.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
const home=new URL('https://www.kombishop.fr/'),stock=new URL('/7-vans-en-stock',home);
const page=fixture('stock'),links=kombishopLinks(page,stock);
assert.equal(links.total,5);assert.equal(links.details.length,5);assert.equal(links.lists.length,0);
const wrong='<a href="https://www.kombishop.fr/vans/9999-sold.html">Vendu</a><a href="https://example.org/vans/7777-other.html">Autre</a>';
assert.deepEqual(kombishopLinks(page+wrong,stock).details,links.details);
assert.throws(()=>kombishopLinks(page,new URL('/8-vans-vendus',home)),/périmètre/);
assert.throws(()=>kombishopLinks(page.replace('Il y a 5 produits.',''),stock),/Total/);
const paged=kombishopLinks(page.replace('</nav>','<a href="/7-vans-en-stock?page=2">suite</a><a href="/8-vans-vendus?page=2">vendus</a></nav>'),stock);assert.deepEqual(paged.lists,['https://www.kombishop.fr/7-vans-en-stock?page=2']);
const data=new Map(),rows=[];
for(const [name,price,km,year,photos] of [['t4','14000','100200','2002',14],['t3','15000','93000','1985',13],['t5','16500','173000','2010',18],['jimny','12980','113100','2012',17],['porsche','32500','103000','2009',16]]){
 const h=fixture(name),p=product(h),r=parseKombishop(h,p.offers.url);data.set(p.offers.url,h);rows.push(r);
 assert.equal(r.prix,price);assert.equal(r.kilometrage,km);assert.equal(r.annee,year);assert.equal(r.photos.split('|').length,photos);assert.equal(r.ville,'LE PELLERIN');assert.equal(r.code_postal,'44640');assert.equal(r.contact_nom,'Kombishop (garage)');assert.equal(r.contact_telephone,'06 95 44 34 24');assert.ok(r.description.length>250);assert.ok(!r.description.includes('Quantité'));assert.equal(r.boite,'manuelle');
 assert.ok(!r.photos.includes('small_default'));assert.equal(new Set(r.photos.split('|').map(u=>u.match(/\/(\d+)-/)[1])).size,photos);
}
assert.equal(rows[2].mise_en_circulation,'01.2010');assert.equal(rows[4].carburant,undefined);assert.equal(rows[0].marque,'Volkswagen');assert.match(rows[0].titre,/2001/);assert.equal(rows[0].annee,'2002');
const h=fixture('t4'),u=product(h).offers.url;
assert.equal(parseKombishop(h.replace('https://schema.org/InStock','https://schema.org/OutOfStock'),u)._sold,1);
assert.equal(parseKombishop(h.replaceAll('VW T4 Transporter 2001','[RÉSERVÉ] VW T4 Transporter 2001'),u)._sold,1);
assert.throws(()=>parseKombishop(h.replace('https://schema.org/InStock','https://schema.org/PreOrder'),u),/Disponibilité/);
assert.throws(()=>parseKombishop(h,u.replace('/2123-','/9999-')),/propres/);
assert.equal(isKombishop(home),true);assert.equal(isKombishop(new URL('https://kombishop.fr.example.com/')),false);
// Exact stock count is checked independently of the number of rows returned.
cpuReset();const result=await readKombishop(home,async url=>({url,text:url.pathname==='/7-vans-en-stock'?page:data.get(url.toString())||(()=>{throw Error('hors stock '+url)})()}));
assert.equal(result.length,5);assert.equal(result.partial,false);assert.equal(result.siteCount,5);assert.equal(result.stats.cycle_complete,true);assert.equal(result.reduce((n,r)=>n+r.photos.split('|').length,0),78);
cpuReset();const mismatch=await readKombishop(home,async url=>({url,text:url.pathname==='/7-vans-en-stock'?page.replace('Il y a 5 produits.','Il y a 6 produits.'):data.get(url.toString())}));assert.equal(mismatch.partial,true);assert.equal(mismatch.stats.total_mismatch,true);
console.log('Kombishop: exact scoped stock/count, pagination, own prices/gallery/contact, MEC and precise mileage, reserved/sold/preorder exclusion, count mismatch blocks completion OK');
