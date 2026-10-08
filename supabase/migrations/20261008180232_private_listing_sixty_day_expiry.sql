-- General private listings: sixty days online. Vacances keeps its separate paid duration.
create function private.set_private_listing_expiry() returns trigger language plpgsql set search_path='' as $$
declare requested_reminder timestamptz:=new.expiry_reminder_sent_at;
begin
 if new.seller_type<>'particulier' or new.category='vacances' then return new; end if;
 if new.revision_of is not null then
  new.expires_at:=null;new.expiry_reminder_sent_at:=null;return new;
 end if;
 if tg_op='INSERT' then
  new.expires_at:=case when new.status='active' then now()+interval '60 days' else null end;
  new.expiry_reminder_sent_at:=null;
 else
  -- An ordinary update, boost or price decrease cannot extend publication or reset its reminder.
  new.expires_at:=old.expires_at;new.expiry_reminder_sent_at:=old.expiry_reminder_sent_at;
  if new.status='active' and old.expires_at is null then
   new.expires_at:=now()+interval '60 days';new.expiry_reminder_sent_at:=null;
  elsif new.status='active' and new.created_at is distinct from old.created_at
   and current_setting('abraca.revision_write',true)=txid_current()::text then
   new.expires_at:=now()+interval '60 days';new.expiry_reminder_sent_at:=null;
  end if;
  -- The existing reminder sender may record delivery without extending the listing.
  if coalesce(auth.jwt()->>'role','')='service_role' and new.expires_at=old.expires_at then
   new.expiry_reminder_sent_at:=coalesce(requested_reminder,old.expiry_reminder_sent_at);
  end if;
 end if;
 return new;
end $$;
create trigger set_private_listing_expiry before insert or update on public.listings for each row execute function private.set_private_listing_expiry();
revoke all on function private.set_private_listing_expiry() from public,anon,authenticated,service_role;
-- Existing listings retain their position. The historical publication timestamp is created_at.
-- Backfill with a guarded trigger override so the deadline is not changed to today + sixty days.
do $$declare d text;begin
 select pg_get_functiondef('private.set_private_listing_expiry()'::regprocedure) into d;
 d:=replace(d,E'begin\n',E'begin\n if current_setting(''abraca.expiry_backfill'',true)=txid_current()::text then return new; end if;\n');execute d;
 perform set_config('abraca.expiry_backfill',txid_current()::text,true);
 update public.listings set expires_at=created_at+interval '60 days',expiry_reminder_sent_at=null
 where seller_type='particulier' and category<>'vacances' and revision_of is null and status='active';
 update public.listings set expires_at=null,expiry_reminder_sent_at=null
 where seller_type='particulier' and category<>'vacances' and revision_of is not null and status='pending';
 perform set_config('abraca.expiry_backfill','',true);
end $$;
create function private.expire_private_listings() returns integer language plpgsql security invoker set search_path='' as $$
declare n integer;begin
 update public.listings set status='archived',archive_reason='expired'
 where seller_type='particulier' and category<>'vacances' and revision_of is null
 and status='active' and expires_at<=now();
 get diagnostics n=row_count;return n;
end $$;
revoke all on function private.expire_private_listings() from public,anon,authenticated,service_role;
select cron.schedule('abracadeal-private-listing-expiry','*/15 * * * *',$$select private.expire_private_listings();$$);
