import assert from 'node:assert/strict';import fs from 'node:fs';
import {activeEnergyDiagnostics} from '../supabase/functions/pro-stock-sync/smart-reader.ts';
const raw=fs.readFileSync(new URL('./fixtures/lfimmo-property-90526.html',import.meta.url),'utf8');
assert.deepEqual(activeEnergyDiagnostics(raw),{dpe:'D',ges:'B',consommation_energie:'188'});
assert.deepEqual(activeEnergyDiagnostics(raw.replaceAll('class="active"','class="inactive"')),{});
console.log('LF immo: selected D/B graphic rows, consumption 188, no guess from legend OK');
