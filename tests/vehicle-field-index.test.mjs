import {isPlaceholderPhoto,dedupePhotos} from '../supabase/functions/pro-stock-sync/photo-utils.ts';
import fs from 'node:fs';import assert from 'node:assert/strict';import {stripTypeScriptTypes} from 'node:module';
let src=fs.readFileSync(new URL('../supabase/functions/pro-stock-sync/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');src=src.slice(0,src.indexOf('Deno.serve('));
const f=new Function('Deno','createClient','isPlaceholderPhoto','dedupePhotos',stripTypeScriptTypes(src)+';return {first,indexVehicleFields,normalizeVehicle,vehicleMeta,listingKey};')({env:{get:()=>''}},()=>({}),isPlaceholderPhoto,dedupePhotos);
for(const o of [{nested_price:'7',price:'9'},{a_selling_price:'4',b_price:'8'},{first_nested_price:'3',second_price:'4'},{nested_price:' ',other_price:'5'},{price:0,a_price:'8'},{x_selling_price:null,y_selling_price:'4',price:'7'}]){
 for(const keys of [['price'],['selling_price','price'],['missing','price'],['title','name']])assert.equal(f.first(f.indexVehicleFields({...o}),keys),f.first({...o},keys));
}
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/byebuy-catalogue.json',import.meta.url)));const {mapByeBuyVehicle}=await import('../supabase/functions/pro-stock-sync/byebuy-reader.ts');const r=f.normalizeVehicle(mapByeBuyVehicle(fixture.vehicules[0]));assert.deepEqual(r.errors,[]);assert.equal(r.postal,'46100');assert.equal(r.contactPhone,'0650633603');assert.equal(f.vehicleMeta(r).contactName,'BBC FIGEAC');
console.log('Vehicle lookup: nested aliases, exact precedence, null/blank/zero values and listing contact OK');

const noPhoto=f.normalizeVehicle({reference:'test',titre:'Renault Clio',prix:'12000',ville:'Cannes',type:'voiture',photos:'https://cdn.example/no_photo.jpg'});
assert.equal(noPhoto.photos.length,0);assert.ok(noPhoto.errors.includes('aucune photo'));

const twin={category:'vehicules',title:'Toyota Hilux',price:57000,mileage:10,year:2026,city:'Giou de Mamou',externalUrl:'https://www.decrosautomobiles.fr/fr/toyota'};assert.notEqual(f.listingKey({...twin,ref:'372715'}),f.listingKey({...twin,ref:'372779'}));
