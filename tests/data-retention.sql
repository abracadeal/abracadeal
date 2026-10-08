-- Transactional integration tests. Fixtures and all test deletions are rolled back.
begin;
do $$
declare u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); oldc uuid; heldc uuid; recentc uuid; oldl uuid; sharedl uuid; q bigint; offer text; orderid uuid; m uuid; result jsonb;
begin
 insert into auth.users(id,instance_id,aud,role,email,created_at,raw_user_meta_data)
 values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',u::text||'@retention-test.invalid',now()-interval '3 years',jsonb_build_object('phone','+33600000001','display_name','Retention test'));
 insert into auth.users(id,instance_id,aud,role,email,created_at,raw_user_meta_data)
 values(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',v::text||'@retention-test.invalid',now()-interval '3 years',jsonb_build_object('phone','+33600000002','display_name','Other participant'));
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 update public.profiles set updated_at=now()-interval '3 years' where id in(u,v);
 insert into public.listings(owner_id,category,title,description,city,status) values(u,'autres','Retention photo test','Photo de test sans diffusion réelle','Cannes','pending') returning id into oldl;
 insert into public.listing_photos(listing_id,storage_path,storage_bucket) values(oldl,'retention-test/shared.jpg','listing-images-pending');
 insert into public.listings(owner_id,category,title,description,city,status) values(u,'autres','Reference photo test','Photo de test partagée','Cannes','pending') returning id into sharedl;
 insert into public.listing_photos(listing_id,storage_path,storage_bucket) values(sharedl,'retention-test/shared.jpg','listing-images-pending');
 update public.listings set status='archived' where id=oldl;
 insert into public.conversations(listing_id,buyer_id,seller_id) values(oldl,u,v) returning id into oldc;
 insert into public.conversations(listing_id,buyer_id,seller_id) values(sharedl,v,u) returning id into heldc;
 -- Different listing avoids any uniqueness constraint on participant/listing tuples.
 insert into public.listings(owner_id,category,title,description,city,status) values(u,'autres','Recent discussion test','Conversation encore utilisée','Cannes','pending') returning id into m;
 insert into public.conversations(listing_id,buyer_id,seller_id) values(m,u,v) returning id into recentc;
 insert into public.messages(conversation_id,sender_id,body,created_at) values(oldc,u,'Ancien message à supprimer',now()-interval '3 years'),(heldc,v,'Ancien message gelé',now()-interval '3 years'),(recentc,u,'Ancien message dans conversation active',now()-interval '3 years'),(recentc,v,'Message récent',now());
 update public.conversations set updated_at=now()-interval '3 years',created_at=now()-interval '3 years' where id in(oldc,heldc,recentc);
 insert into private.retention_holds(scope,target_id,reason) values('conversation',heldc::text,'Litige de test : message à préserver');
 result:=private.retention_purge(true);
 if (result->>'messages')::integer<>1 then raise exception 'FAIL conversation last exchange or legal hold'; end if;
 if not exists(select 1 from public.messages where conversation_id=oldc) then raise exception 'FAIL dry run deleted message'; end if;
 perform private.retention_purge(false);
 if exists(select 1 from public.messages where conversation_id=oldc) or not exists(select 1 from public.messages where conversation_id=heldc) or (select count(*) from public.messages where conversation_id=recentc)<>2 then raise exception 'FAIL actual message purge'; end if;
 -- Retention wrappers are service-only, even with a forged user metadata role.
 perform set_config('role','authenticated',true);
 begin perform public.retention_worker_tasks();raise exception 'FAIL user accessed worker';exception when insufficient_privilege then null;end;
 perform set_config('role','postgres',true);
 select id into strict q from private.retention_storage_queue where path='retention-test/shared.jpg';
 perform set_config('role','service_role',true);
 if public.retention_storage_allowed(q) then raise exception 'FAIL shared photo deleted'; end if;
 -- Simulate closure after a successfully sent 31-day-old notice.
 perform set_config('role','postgres',true);
 delete from private.retention_holds where target_id=heldc::text;
 update public.listings set updated_at=now()-interval '3 years' where owner_id=u;
 update public.messages set created_at=now()-interval '3 years' where sender_id=u;
 update public.profiles set updated_at=now()-interval '3 years' where id=u;
 insert into private.retention_accounts(user_id,activity_at,state,notice_sent_at,close_after) values(u,now()-interval '3 years','notified',now()-interval '31 days',now()-interval '1 day') on conflict(user_id) do update set state='notified',activity_at=excluded.activity_at,notice_sent_at=excluded.notice_sent_at,close_after=excluded.close_after;
 offer:='private_listing_edit';
 insert into public.commerce_orders(user_id,offer_code,amount_cents,status,paid_at,updated_at) values(u,offer,999,'paid',now()-interval '3 years',now()-interval '3 years') returning id into orderid;
 update private.retention_accounts set activity_at=private.retention_activity(u) where user_id=u;
 perform set_config('role','service_role',true);
 if not public.retention_begin_close(u) then raise exception 'FAIL eligible closure'; end if;
 perform public.retention_finish_close(u);
 perform set_config('role','postgres',true);
 if (select display_name from public.profiles where id=u)<>'Compte fermé' or (select phone from public.profiles where id=u) is not null then raise exception 'FAIL profile anonymization'; end if;
 if not exists(select 1 from public.commerce_orders where id=orderid) or not exists(select 1 from public.messages where conversation_id=recentc) or not exists(select 1 from private.retention_evidence where scope='user' and target_id=u::text) then raise exception 'FAIL retained order, counterpart messages or evidence'; end if;
 if exists(select 1 from public.listings where owner_id=u and status<>'archived') then raise exception 'FAIL public listing closure'; end if;
 -- Five-year listing expiry does not cascade accounting proof or renew a republishing block.
 insert into public.listings(owner_id,category,title,description,city,status,archived_at,retention_until) values(u,'autres','Expired retention fixture','Archive temporaire pour vérification','Cannes','archived',now()-interval '6 years',now()-interval '1 day') returning id into oldl;
 insert into private.listing_archives(listing_id,owner_id,listing_reference,category,snapshot,archive_reason,source_event,archived_at,retention_until) select id,owner_id,listing_reference,category,to_jsonb(l),'other','status_archived',archived_at,retention_until from public.listings l where id=oldl on conflict(listing_id) do update set retention_until=excluded.retention_until;
 insert into public.listing_purchases(listing_id,owner_id,product_code,amount_cents,status,paid_at) values(oldl,u,'private_7d',999,'paid',now()-interval '6 years');
 perform private.retention_purge(false);
 if exists(select 1 from public.listings where id=oldl) or exists(select 1 from private.listing_archives where listing_id=oldl) then raise exception 'FAIL expired listing recreated archive'; end if;
 if not exists(select 1 from private.retention_evidence where scope='listing_purchases' and listing_id=oldl) then raise exception 'FAIL accounting proof cascaded'; end if;
 if exists(select 1 from private.deleted_listing_signatures where listing_id=oldl) then raise exception 'FAIL archive purge restarted republication window'; end if;
 -- A retired listing under a scoped legal hold must survive, including its archive.
 insert into public.listings(owner_id,category,title,description,city,status,archived_at,retention_until) values(u,'autres','Held retention fixture','Archive temporaire pour vérification','Cannes','archived',now()-interval '6 years',now()-interval '1 day') returning id into sharedl;
 insert into private.listing_archives(listing_id,owner_id,listing_reference,category,snapshot,archive_reason,source_event,archived_at,retention_until) select id,owner_id,listing_reference,category,to_jsonb(l),'other','status_archived',archived_at,retention_until from public.listings l where id=sharedl on conflict(listing_id) do update set retention_until=excluded.retention_until;
 insert into private.retention_holds(scope,target_id,reason) values('listing',sharedl::text,'Litige de test : archive à préserver');
 perform private.retention_purge(false);perform private.purge_expired_listing_archives();
 if not exists(select 1 from public.listings where id=sharedl) or not exists(select 1 from private.listing_archives where listing_id=sharedl) then raise exception 'FAIL legal hold ignored'; end if;
 -- Storage API copy is tested separately; validate its durable private metadata and held queue here.
 insert into public.listing_photos(listing_id,storage_path,storage_bucket) values(sharedl,'retention-test/held-public.jpg','listing-images');
 insert into private.retention_storage_queue(bucket,path,listing_id,user_id) values('listing-images','retention-test/held-public.jpg',sharedl,u) returning id into q;
 perform set_config('role','service_role',true);
 if public.retention_storage_quarantine(q) is null then raise exception 'FAIL held photo not quarantined'; end if;
 perform public.retention_storage_quarantined(q);
 perform set_config('role','postgres',true);
 select id into q from private.retention_storage_queue where path like 'retention-evidence/%/held-public.jpg';
 if q is null then raise exception 'FAIL private evidence not queued'; end if;
 perform set_config('role','service_role',true);
 if public.retention_storage_allowed(q) then raise exception 'FAIL private evidence deleted during hold'; end if;
 perform set_config('role','postgres',true);
 update private.retention_holds set released_at=now() where scope='listing' and target_id=sharedl::text;
 perform set_config('role','service_role',true);
 if not public.retention_storage_allowed(q) then raise exception 'FAIL released private evidence cannot expire'; end if;
 perform set_config('role','postgres',true);


end $$;
set constraints all immediate;
rollback;
