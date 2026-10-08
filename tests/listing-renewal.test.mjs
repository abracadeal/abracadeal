import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/index-main.js',import.meta.url),'utf8');
const ctx=vm.createContext({esc:x=>String(x)});
vm.runInContext(source.slice(source.indexOf('function listingExpiryMarkup('),source.indexOf('window.renewPrivateListing=')),ctx);
test('owner sees expiry date and expired, sold, hidden and removed states correctly',()=>{
 assert.match(ctx.listingExpiryMarkup({status:'active',expires_at:'2026-12-07T12:00:00Z'}),/Expire le 07\/12\/2026/);
 assert.match(ctx.listingExpiryMarkup({status:'archived',archive_reason:'expired'}),/Expirée/);
 assert.match(ctx.listingExpiryMarkup({status:'archived',archive_reason:'sold'}),/Vendue/);
 assert.match(ctx.listingExpiryMarkup({status:'archived',archive_reason:'user_deleted'}),/Retirée/);
 assert.match(ctx.listingExpiryMarkup({status:'hidden'}),/Masquée/);
 assert.doesNotMatch(ctx.listingExpiryMarkup({status:'pending'}),/Expire/);
});
test('renewal button only covers eligible private listings in their last seven days or expired',()=>{
 const listing={seller_type:'particulier',category:'autres',status:'active',expires_at:new Date(Date.now()+4*86400000).toISOString()};
 assert.equal(ctx.canRenewPrivateListing(listing),true);
 for(const changes of [{category:'vacances'},{seller_type:'professionnel'},{revision_of:'parent'},{status:'hidden'},{status:'rejected'},{status:'archived',archive_reason:'user_deleted'},{expires_at:new Date(Date.now()+8*86400000).toISOString()}])assert.ok(!ctx.canRenewPrivateListing({...listing,...changes}));
 assert.equal(ctx.canRenewPrivateListing({...listing,status:'archived',archive_reason:'expired',expires_at:new Date(Date.now()-86400000).toISOString()}),true);
});
