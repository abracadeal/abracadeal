-- Temporary fixtures only; no real listing is archived by this test.
begin;
do $$declare u uuid;l uuid;v uuid;begin
 select id into strict u from public.profiles where not is_admin and private.moderation_user_allowed(id) limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','service_role')::text,true);
 insert into public.listings(owner_id,category,title,description,city,status)
 values(u,'autres','Expiration soixante jours test','Annonce temporaire pour vérifier son expiration','Cannes','pending') returning id into l;
 if (select expires_at from public.listings where id=l) is not null then raise exception 'Pending should not spend publication time'; end if;
 insert into public.listing_moderation(listing_id,ai_checked,risk_level,risk_score,safety_snapshot)
 select l,true,'green',0,jsonb_build_object('text',title||E'\n'||description,'photos','[]'::jsonb) from public.listings where id=l;
 update public.listings set status='active' where id=l;
 if (select expires_at from public.listings where id=l) is distinct from now()+interval '60 days' then raise exception 'Expected sixty days from approval'; end if;
 update public.listings set expiry_reminder_sent_at=now() where id=l;
 if (select expiry_reminder_sent_at from public.listings where id=l) is null then raise exception 'Reminder delivery not recorded'; end if;
 perform set_config('abraca.expiry_backfill',txid_current()::text,true);
 update public.listings set expires_at=now()-interval '1 minute' where id=l;
 perform set_config('abraca.expiry_backfill','',true);
 perform private.expire_private_listings();
 if (select status from public.listings where id=l)<>'archived' or (select archive_reason from public.listings where id=l)<>'expired' then raise exception 'Expired private listing was not archived'; end if;
 if not exists(select 1 from private.listing_archives where listing_id=l) then raise exception 'Missing private archive'; end if;
 insert into public.listings(owner_id,category,title,description,city,status,expires_at)
 values(u,'vacances','Vacances durée spécifique test','Logement temporaire pour vérification','Cannes','pending',now()+interval '30 days') returning id into v;
 if (select expires_at from public.listings where id=v) is distinct from now()+interval '30 days' then raise exception 'Vacances duration changed'; end if;
end $$;
set constraints all immediate;
rollback;
