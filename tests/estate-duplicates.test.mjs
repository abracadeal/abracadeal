import fs from 'node:fs';import assert from 'node:assert/strict';import {dedupeEstateListings} from '../supabase/functions/pro-stock-sync/estate-duplicates.ts';
const rows=JSON.parse(fs.readFileSync(new URL('fixtures/orpi-black-sofa-duplicates.json',import.meta.url)));let hashes=0;const same=async()=>{hashes++;return 'verified-identical-photo-bytes'};
const r=await dedupeEstateListings(rows,same);assert.equal(r.rows.length,1);assert.equal(r.removed,2);assert.equal(r.rows[0].duplicateSources.length,3);assert.equal(r.rows[0].city,'Cannes');assert.equal(r.rows[0].photos.length,17);assert.ok(r.rows[0].sourceWarnings[0].includes('Le Cannet'));assert.equal(hashes,2);
for(const changed of [{price:399000},{surface:110},{rooms:5},{transaction:'location'},{description:'Programme neuf, lot n° 2. '+rows[2].description},{description:'Autre logement sans rapport.'}]){const out=await dedupeEstateListings([rows[0],{...rows[2],...changed}],same);assert.equal(out.rows.length,2,JSON.stringify(changed));}
const different=await dedupeEstateListings([rows[0],rows[2]],async u=>u);assert.equal(different.rows.length,2);
const unavailable=await dedupeEstateListings([rows[0],rows[2]],async()=>null);assert.equal(unavailable.rows.length,2);
const corrected=await dedupeEstateListings([{...rows[0],corrected:true},rows[2]],same);assert.equal(corrected.rows[0].ref,rows[0].ref);
console.log('Orpi real sofa triple: one complete source retained, conflicting cities visible, different properties/units/images preserved, admin correction priority OK');
