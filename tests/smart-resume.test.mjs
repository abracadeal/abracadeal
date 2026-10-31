import assert from 'node:assert/strict';import {readSmartSite} from '../supabase/functions/pro-stock-sync/smart-reader.ts';
const source=new URL('https://example.com/');const home=Array.from({length:205},(_,i)=>`<a href="/vehicules/voiture-test-occasion-${1000+i}/">auto</a>`).join('');let state=null;
const memory={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);}};
const fetcher=async u=>({url:u,text:'detail'});const parse=(h,u)=>({reference:u.split('/').filter(Boolean).pop(),url:u,titre:'Auto',prix:'10000'});
let rows=await readSmartSite(source,home,'vehicules',fetcher,[],parse,memory);assert.equal(rows.partial,true);assert.equal(rows.length,100);
rows=await readSmartSite(source,home,'vehicules',fetcher,[],parse,memory);assert.equal(rows.partial,true);assert.equal(rows.length,200);
rows=await readSmartSite(source,home,'vehicules',fetcher,[],parse,memory);assert.equal(rows.partial,false);assert.equal(rows.length,205);assert.equal(rows.stats.remaining,0);assert.equal(rows.cycleSeen.length,205);
console.log('Smart resume: 205 references in 3 calls, accumulated rows, complete only at end OK');
