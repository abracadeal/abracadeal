import assert from 'node:assert/strict';import fs from 'node:fs';
import {activeEnergyDiagnostics,smartDetail} from '../supabase/functions/pro-stock-sync/smart-reader.ts';
const raw=fs.readFileSync(new URL('./fixtures/lfimmo-property-90526.html',import.meta.url),'utf8');
assert.deepEqual(activeEnergyDiagnostics(raw),{dpe:'D',ges:'B',consommation_energie:'188'});
assert.deepEqual(activeEnergyDiagnostics(raw.replaceAll('class="active"','class="inactive"')),{});
console.log('LF immo: selected D/B graphic rows, consumption 188, no guess from legend OK');

const row=smartDetail(raw,'https://www.lfimmo.fr/annonces/90526-vente-maison-4pieces-le-barp-33114','immobilier');
assert.equal(row.prix,'345000');assert.equal(row.ville,'Le Barp');assert.equal(row.reference,'90526');assert.equal(row.code_postal,'33114');assert.equal(row.photos.split('|').length,8);assert.equal(row.contact_telephone,'+33781557399');assert.ok(row.description.startsWith('Maison familiale'));assert.ok(!row.description.includes('Voir plus'));assert.ok(row.description.length>1800);
