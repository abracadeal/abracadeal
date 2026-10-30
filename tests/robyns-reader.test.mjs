import fs from 'node:fs';import assert from 'node:assert/strict';
import {parseRobynsVehicle,readRobynsCar} from '../supabase/functions/pro-stock-sync/robyns-reader.ts';
const html=fs.readFileSync(new URL('./fixtures/robyns-vehicle-18.html',import.meta.url),'utf8');
const row=parseRobynsVehicle(html,'https://robynscar.com/vehicules/18');
assert.equal(row.reference,'18');assert.equal(row.titre,'AUDI TT COUPE 1.8T');assert.equal(row.prix,5990);assert.equal(row.kilometrage,186405);assert.equal(row.annee,1998);assert.equal(row.ville,'Bouc-Bel-Air');assert.equal(row.code_postal,'13320');assert.equal(row.mise_en_circulation,'12/1998');assert.equal(row.contact_telephone,'+33695706280');assert.equal(row.photos.split('|').length,16);assert.ok(!/FR-818-CF|logo/.test(row.photos));assert.equal(row.description,'');
// No price on source stays missing, rather than using a recommendation price.
assert.equal(parseRobynsVehicle(html.replace('"price":5990','"price":null'),'https://robynscar.com/vehicules/18').prix,'');
const list='2 véhicules disponibles <a href="/vehicules/18">A</a><a href="/vehicules?page=2">2</a>';
const visited=[];const rows=await readRobynsCar(new URL('https://robynscar.com/vehicules'),list,async u=>{visited.push(u.toString());return{url:u,text:u.search?'<a href="/vehicules/19">B</a><a href="https://other.test/vehicules/20">outside</a>':html};});
assert.equal(rows.length,2);assert.equal(rows.total,2);assert.equal(rows.partial,false);assert.equal(rows.stats.pages,2);assert.ok(!visited.some(u=>u.includes('other.test')));
const failed=await readRobynsCar(new URL('https://robynscar.com/vehicules'),list,async u=>{if(u.search)throw Error('down');return{url:u,text:html};});assert.equal(failed.partial,true);
await assert.rejects(()=>readRobynsCar(new URL('https://robynscar.com/vehicules?brand=AUDI'),list,async()=>{}),/sans filtre/);
console.log('Robyns Car: short IDs, full gallery, exact fields, contact, missing price, pagination and partial failure OK');
