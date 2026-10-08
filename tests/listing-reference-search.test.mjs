import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const main=readFileSync(new URL('../assets/index-main.js',import.meta.url),'utf8');
const moderation=readFileSync(new URL('../assets/moderation.js',import.meta.url),'utf8');
const referenceFunction=s=>s.slice(s.indexOf('function listingReferenceQuery('),s.indexOf('\n}',s.indexOf('function listingReferenceQuery('))+2);
const reference='ABR-2026-00000091';
test('public and admin accept copied references with lowercase, spaces and alternate dashes',()=>{
 for(const source of [main,moderation]){
  const context=vm.createContext({});vm.runInContext(referenceFunction(source),context);
  for(const value of [reference,'abr-2026-00000091',' ABR 2026 00000091 ','ABR–2026—00000091','ABR202600000091'])assert.equal(context.listingReferenceQuery(value),reference);
  for(const value of ['voiture','ABR-2026-91',"ABR-2026-00000091' OR true",''])assert.equal(context.listingReferenceQuery(value),'');
 }
});
test('reference lookup queries the public listing directly, keeps visibility guards and never restores stale catalogue',async()=>{
 const filters=[];
 const query={select(){return this},eq(k,v){filters.push([k,v]);return this},is(k,v){filters.push([k,v]);return this},order:async()=>({data:[],error:null})};
 const context=vm.createContext({sb:{from:()=>query},$:(id)=>({value:'abr–2026–00000091'}),adsLoadSequence:0,currentUser:null,currentProfile:null,moderationMode:false,onlyMine:false,favoritesMode:false,allAds:[],lastGoodPublicAds:[{id:'stale'}],SHOWROOM_LOA_ADS:[{id:'demo'}],hydratePrivatePhotos:async()=>{},moderationRiskById:new Map(),renderAds(){},console,toast(){}});
 vm.runInContext(referenceFunction(main)+main.slice(main.indexOf('async function loadAds(){'),main.indexOf('\nfunction updateFilterSubcategories')),context);
 await context.loadAds();
 assert.deepEqual(filters,[['revision_of',null],['listing_reference',reference],['status','active'],['visibility_scope','public']]);
 assert.equal(context.allAds.length,0);
});
test('reference results ignore unrelated old category, city and price filters',()=>{
 const context=vm.createContext({$:(id)=>({value:({'#searchQuery':reference,'#searchCity':'Paris','#filterCategory':'immobilier','#filterPriceMin':'999999'})[id]||''}),allAds:[{id:'match',listing_reference:reference,category:'vehicules',city:'Cannes',price:5},{id:'other',listing_reference:'ABR-2026-00000088'}],immoNearbyFilterState:{active:false},activeCategory:'immobilier',activeVehicleSubcategory:'',moderationMode:false,onlyMine:false,favoritesMode:false,listingIsFeatured:()=>false});
 vm.runInContext(referenceFunction(main)+main.slice(main.indexOf('function filteredAds(){'),main.indexOf('\nfunction shuffleCopy')),context);
 assert.equal(context.filteredAds().length,1);assert.equal(context.filteredAds()[0].id,'match');
});
test('admin reference lookup searches every status and surfaces database errors',async()=>{
 const filters=[];let fail=false;
 const query={select(){return this},eq(k,v){filters.push([k,v]);return Promise.resolve(fail?{error:new Error('denied')}:{data:[{listing_reference:reference,status:'archived'}]})}};
 const context=vm.createContext({$:()=>({value:reference}),sb:{from:()=>query}});
 vm.runInContext(referenceFunction(moderation)+moderation.slice(moderation.indexOf('async function referenceRows(){'),moderation.indexOf("\n$('#referenceSearchForm')")),context);
 const rows=await context.referenceRows();assert.equal(rows[0].status,'archived');assert.deepEqual(filters,[['listing_reference',reference]]);
 fail=true;await assert.rejects(()=>context.referenceRows(),/denied/);
});
