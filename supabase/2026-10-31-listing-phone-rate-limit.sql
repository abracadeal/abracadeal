-- Limits apply to distinct normalized telephone numbers, never to the owner/admin.
begin;
create table private.listing_phone_views (
 viewer_id uuid not null references auth.users(id) on delete cascade,
 phone_hash text not null,
 viewed_at timestamptz not null default clock_timestamp(),
 primary key(viewer_id,phone_hash)
);
create index listing_phone_views_time_idx on private.listing_phone_views(viewed_at);
alter table private.listing_phone_views enable row level security;
revoke all on private.listing_phone_views from public, anon, authenticated;
grant select,insert,update,delete on private.listing_phone_views to service_role;

create function private.check_listing_phone_quota(p_viewer uuid,p_phone text)
returns void language plpgsql security invoker set search_path='' as $fn$
declare
 v_key text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 v_hash text; v_now timestamptz := clock_timestamp(); v_short integer; v_day integer;
begin
 if p_viewer is null then raise exception 'Connexion requise'; end if;
 if v_key='' then return; end if;
 if left(v_key,2)='00' then v_key:=substr(v_key,3); end if;
 if v_key ~ '^0[1-9][0-9]{8}$' then v_key:='33'||substr(v_key,2);

 elsif v_key ~ '^330[1-9][0-9]{8}$' then v_key:='33'||substr(v_key,4); end if;
 v_hash:=encode(sha256(convert_to(v_key,'UTF8')),'hex');
 -- Serialize per account so concurrent requests cannot cross the quotas.
 perform pg_advisory_xact_lock(hashtextextended('listing-phone:'||p_viewer::text,0));
 v_now:=clock_timestamp();
 if exists(select 1 from private.listing_phone_views where viewer_id=p_viewer and phone_hash=v_hash and viewed_at>v_now-interval '24 hours') then return; end if;
 select count(*) filter(where viewed_at>v_now-interval '10 minutes'),count(*)
 into v_short,v_day from private.listing_phone_views where viewer_id=p_viewer and viewed_at>v_now-interval '24 hours';
 if v_short>=15 or v_day>=40 then
  raise exception 'Vous avez consulté beaucoup de numéros en peu de temps. Réessayez plus tard, ou contactez le vendeur par message.';
 end if;
 insert into private.listing_phone_views(viewer_id,phone_hash,viewed_at) values(p_viewer,v_hash,v_now)
 on conflict(viewer_id,phone_hash) do update set viewed_at=excluded.viewed_at;
end $fn$;
revoke all on function private.check_listing_phone_quota(uuid,text) from public,anon,authenticated;
grant execute on function private.check_listing_phone_quota(uuid,text) to service_role;

create or replace function public.get_listing_phone(p_listing_id uuid)
returns text language plpgsql security definer set search_path='' as $fn$
declare
 v_uid uuid:=auth.uid();
 v_owner uuid; v_status text; v_visibility text; v_show boolean; v_phone text;
begin
 if v_uid is null then raise exception 'Connexion requise'; end if;
 select l.owner_id,l.status,l.visibility_scope,l.show_phone,lc.phone
 into v_owner,v_status,v_visibility,v_show,v_phone
 from public.listings l left join public.listing_contacts lc on lc.listing_id=l.id where l.id=p_listing_id;
 if v_owner is null then raise exception 'Annonce introuvable'; end if;
 if v_uid=v_owner or public.is_admin() then return v_phone; end if;
 if v_status<>'active' then raise exception 'Annonce indisponible'; end if;
 if v_visibility='pro' and not public.b2b_is_professional(v_uid) then raise exception 'Annonce réservée aux professionnels'; end if;
 if not coalesce(v_show,false) then return null; end if;
 if v_phone is not null then
  perform private.check_listing_phone_quota(v_uid,v_phone);
  insert into public.listing_events(listing_id,owner_id,kind,viewer_key) values(p_listing_id,v_owner,'phone',v_uid::text) on conflict do nothing;
 end if;
 return v_phone;
end $fn$;
-- Existing get_listing_phone grants are preserved by CREATE OR REPLACE.
select cron.schedule('abracadeal-listing-phone-views-cleanup','17 * * * *',
 $$delete from private.listing_phone_views where viewed_at < clock_timestamp()-interval '7 days';$$);
commit;
