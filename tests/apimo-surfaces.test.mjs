import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseApimoDetail} from '../supabase/functions/pro-stock-sync/apimo-reader.ts';
const base=fs.readFileSync(new URL('./fixtures/gubernatis-property-87563806.html',import.meta.url),'utf8');
const url='https://gubernatis-immobilier.com/fr/propriete/vente/maison/tourrette-levens/test/87563806';
function detail(description,kind='maison',units=''){
 let h=base.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/30\.08 m²/g,'').replace(/(<p\b[^>]*class="comment"[^>]*>)[\s\S]*?(<\/p>)/,(_,a,b)=>a+description+b);
 // Keep a property-owned city while omitting floorSize to exercise missing-total fallback.
 h+='<script type="application/ld+json">'+JSON.stringify({'@type':'RealEstateListing',about:{identifier:'87563806',address:{addressLocality:'Nice'}}})+'</script>';
 h=h.replace(/(class="[^"]*property-info-template-5[^>]*>)[\s\S]*?(?=<div\b[^>]*data-module-id=)/,(_,a)=>a+'<ul>'+units+'</ul>');
 return parseApimoDetail(h,url.replace('/maison/','/'+kind+'/'));
}
let r=detail('Découvrez cette villa de 82 m² sur un terrain d environ2000m².');assert.equal(r.surface,'82');assert.equal(r.surface_terrain,'2000');
r=detail('Une villa avec un terrain de 2000 m².');assert.equal(r.surface,undefined);assert.equal(r.surface_terrain,'2000');
r=detail('Villa de 2000 m² de terrain.');assert.equal(r.surface,undefined);
r=detail('Projet : villa de 82 m² après travaux.');assert.equal(r.surface,undefined);
r=detail('Box sécurisé.','garage-parking','<li>1 Garage <span>13 m²</span></li>');assert.equal(r.surface,'13');assert.match(r.surfacespieces,/Garage : 13 m²/);
r=detail('Appartement moderne.','appartement','<li>1 Chambre <span>10 m²</span></li><li>1 Séjour <span>21 m²</span></li>');assert.equal(r.surface,undefined);assert.match(r.surfacespieces,/Chambre : 10 m²/);assert.match(r.surfacespieces,/Séjour : 21 m²/);
r=detail('Programme de plusieurs appartements.','appartement');assert.equal(r.surface,undefined);
console.log('Apimo surfaces: explicit description total, separate terrain, sole garage, room details without invented sum, absent/hypothetical left blank');

r=detail('','bureau');assert.equal(r.description,'');assert.equal(r.type_bien,'bureau');
