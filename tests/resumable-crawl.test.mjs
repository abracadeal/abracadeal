import assert from 'node:assert/strict';import {crawlCatalogue} from '../supabase/functions/pro-stock-sync/resumable-crawl.ts';
let state=null,saves=0;const memory={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);saves++;}};
const source='https://example.com/agency';const pages={'/agency':'list1','/list2':'list2'};let fail=true;
const fetcher=async u=>{if(u.pathname==='/bad'&&fail)throw Error('503');return {text:pages[u.pathname]||u.pathname,url:u};};
const links=t=>t==='list1'?{lists:['https://example.com/list2'],details:['https://example.com/a','https://example.com/bad']}:{lists:[],details:['https://example.com/c']};
const parse=(t,u)=>({reference:new URL(u).pathname,url:u});
let rows=await crawlCatalogue(source,'scope',[source],fetcher,links,parse,memory,{maxDetails:1});assert.equal(rows.partial,true);assert.equal(saves,1);assert.equal(rows.length,1);assert.ok(state.details.length);
rows=await crawlCatalogue(source,'scope',[source],fetcher,links,parse,memory,{maxDetails:1});assert.equal(rows.partial,true);fail=false;
for(let i=0;i<5&&!state.completed;i++)rows=await crawlCatalogue(source,'scope',[source],fetcher,links,parse,memory,{maxDetails:1});
assert.equal(rows.partial,false);assert.equal(rows.length,3);assert.equal(new Set(rows.map(x=>x.reference)).size,3);assert.equal(rows.cycleSeen.length,3);
const replay=await crawlCatalogue(source,'scope',[source],fetcher,links,parse,memory);assert.equal(replay.length,3);assert.equal(replay.stats.details,0);
state.started='2020-01-01T00:00:00Z';state.completed=null;state.rows.stale={reference:'stale'};rows=await crawlCatalogue(source,'scope',[source],fetcher,links,parse,memory,{maxDetails:1});assert.equal(rows.some(x=>x.reference==='stale'),false);
state=null;fail=true;for(let i=0;i<8;i++)rows=await crawlCatalogue(source,'scope',[source],fetcher,links,parse,memory,{maxDetails:1});assert.equal(rows.partial,true);assert.ok(rows.stats.failed.length);assert.equal(state.completed,null);
console.log('Resume: list pagination, multiple passes, replay, transient retry, permanent failure blocks completion, 72h reset OK');
let collision=null;const collisionMemory={load:async()=>collision,save:async s=>{collision=structuredClone(s)}};const collisionRows=await crawlCatalogue(source,'collisions',[source],fetcher,()=>({lists:[],details:['https://example.com/a','https://example.com/c']}),()=>({reference:'same-mandate'}),collisionMemory);assert.equal(collisionRows.length,2);assert.equal(collisionRows.cycleSeen.length,1);
console.log('Distinct source URLs sharing a mandate are retained for normalization OK');

const mismatch=await crawlCatalogue(source,'count',[source],fetcher,()=>({lists:[],details:['https://example.com/a']}),parse,undefined,{expectedTotal:2});assert.equal(mismatch.partial,true);assert.equal(mismatch.stats.total_mismatch,true);
