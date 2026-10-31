import assert from 'node:assert/strict';
import {readNextDealer,parseDealerVehicle,isNextDealer} from '../supabase/functions/pro-stock-sync/next-dealer-reader.ts';
const start=new URL('https://dealer.test/concessions/renault/renault-a');
const point={latitude:'43.1',longitude:'2.1',postalCode:'11000',city:'A',name:'Point A'};
const scope={slug:'renault-a',title:'Renault A',retail_points:{data:[{attributes:point}]},points:[point]};
const root=(data)=>({props:{pageProps:{urqlState:{one:{data:JSON.stringify(data)}}}},buildId:'build-1'});
const html=p=>`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(p)}</script>`;
const home=html(root({distributors:{data:[{attributes:scope}]},cars:{data:[{attributes:{i_pve_id:{data:{attributes:point}}}}]}}));
function car(id,p=point){return {id:String(id),attributes:{sBrand:'Renault',sModel:'Clio V',sName:'Clio',slug:'clio-'+id,i_pve_id:{data:{attributes:p}},fPrice:10000}};}
function detail(id,{status='Disponible à la vente',km=1000,p=point,distributor='Renault A',publication=''}={}){
 const location={...p,distributors:{data:[{attributes:{title:distributor,phone_vo:'0412345678'}}]}};
 const j=root({car:{data:{id:String(id),attributes:{i_pve_id:{data:{attributes:location}}}}}});
 j.props.pageProps.dataVehiculeDetail=JSON.stringify({aVehicle:{iId:Number(id),sVehicleStatutLibelle:status,sBrandName:'Renault',sName:'Clio',sNameBis:'Techno',sModel:'Clio V',sMECDate:'2022-01-01',iMileage:km,fTotalPrice:10000,sFuel:'Essence / Courant électrique',sGearboxType:'Boîte hybride multimode',aPictures:['https://photo.test/1.jpg','https://photo.test/1.jpg','https://photo.test/2.jpg'],aEquipmentGroups:{1:{sWording:'Climatisation'}},s_pub_commentaire_publication:publication}});return j;
}
assert.ok(isNextDealer(home));
const row=parseDealerVehicle(detail(1),'https://dealer.test/1','1',scope);
assert.equal(row.photos.split('|').length,2);assert.equal(row.carburant,'Hybride');assert.equal(row.boite,'Automatique');assert.equal(row.contact_telephone,'0412345678');assert.ok(row.description.includes('Climatisation'));
for(const opts of [{status:'Réservé'},{status:'Vendu'},{status:'En commande'},{km:0},{publication:'Véhicule neuf'},{publication:'Stock usine'},{p:{...point,longitude:'2.2'}},{distributor:'Renault B'}])assert.equal(parseDealerVehicle(detail(1,opts),'u','1',scope),null);
assert.throws(()=>parseDealerVehicle(detail(1),'u','99',scope));
await assert.rejects(()=>readNextDealer(new URL('https://dealer.test/'),home,async()=>{throw Error('must not request national stock')}),/concession inscrite/);
const list=root({cars:{data:[1,2,3,4,5].map(id=>car(id)).concat(car(6,{...point,longitude:'2.2'}))}});
let state=null;let calls=[];const memory={load:async()=>state?structuredClone(state):null,save:async s=>{state=structuredClone(s)}};
const fetcher=async u=>{calls.push(u.pathname);if(u.pathname.endsWith('/voiture-occasion.json'))return{text:JSON.stringify({pageProps:list.props.pageProps}),url:u};const id=u.pathname.match(/clio-(\d+)\.json$/)?.[1];if(!id)throw Error('unexpected URL '+u);return{text:html(detail(id,id==='5'?{status:'Réservé'}:{})),url:u};};
const first=await readNextDealer(start,home,fetcher,memory,{maxDetails:2});assert.equal(first.length,2);assert.equal(first.partial,true);assert.equal(state.queue.length,3);assert.deepEqual(first.cycleSeen,[]);
const second=await readNextDealer(start,home,fetcher,memory,{maxDetails:2});assert.equal(second.length,4);assert.equal(second.partial,true);assert.equal(state.queue.length,1);
const third=await readNextDealer(start,home,fetcher,memory,{maxDetails:2});assert.equal(third.length,4);assert.equal(third.partial,false);assert.equal(state.queue.length,0);assert.equal(third.total,5);assert.ok(!third.cycleSeen.includes('5'));assert.ok(!calls.some(x=>x.includes('clio-6')));assert.equal(calls.filter(x=>x.endsWith('/voiture-occasion.json')).length,1);
// Unknown availability in the list: do NOT reuse an unchanged car that may have been sold/reserved.
calls=[];const fourth=await readNextDealer(start,home,fetcher,memory,{maxDetails:2});assert.equal(fourth.partial,true);assert.equal(fourth.length,2);assert.ok(calls.some(x=>x.includes('clio-1')));
// Retry a temporary failed detail once, then protect the old reference from archival, without replaying stale data.
state=null;calls=[];let failures=0;const failedFetch=async u=>{if(u.pathname.includes('clio-1')){failures++;throw Error('503');}return fetcher(u);};
const failed=await readNextDealer(start,home,failedFetch,memory,{maxDetails:20});assert.equal(failures,2);assert.equal(failed.partial,false);assert.ok(failed.cycleSeen.includes('1'));assert.ok(!failed.some(r=>r.reference==='1'));
// A new configured agency/URL cannot resume another stock's pending queue.
state.source='https://other.test/';calls=[];await readNextDealer(start,home,fetcher,memory,{maxDetails:1});assert.ok(calls.some(x=>x.endsWith('/voiture-occasion.json')));
// A cycle older than 72 hours is rebuilt from current inventory before any archival can occur.
state.started='2020-01-01T00:00:00.000Z';calls=[];await readNextDealer(start,home,fetcher,memory,{maxDetails:1});assert.ok(calls.some(x=>x.endsWith('/voiture-occasion.json')));
console.log('Next dealer: exact physical stock, available used vehicles, galleries, retries, resume, completion, stale-state reset and no national import OK');
