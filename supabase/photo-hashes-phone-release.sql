create table private.listing_photo_hashes(
 photo_id uuid primary key references public.listing_photos(id) on delete cascade,
 listing_id uuid not null references public.listings(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), checked_at timestamptz not null default now()
);
alter table private.listing_photo_hashes enable row level security;
revoke all on private.listing_photo_hashes from public,anon,authenticated;
grant all on private.listing_photo_hashes to service_role;
create index listing_photo_hashes_sha_idx on private.listing_photo_hashes(sha256,owner_id);
alter table public.listing_moderation add column reused_photo_count integer not null default 0;
create function public.record_listing_photo_hash(p_photo_id uuid,p_sha256 text)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_listing uuid;v_owner uuid;v_count integer;
begin
 if current_user<>'service_role' then raise exception 'Service only'; end if;
 select p.listing_id,l.owner_id into strict v_listing,v_owner from public.listing_photos p join public.listings l on l.id=p.listing_id where p.id=p_photo_id;
 perform pg_advisory_xact_lock(hashtextextended(p_sha256,0));
 insert into private.listing_photo_hashes(photo_id,listing_id,owner_id,sha256)
 values(p_photo_id,v_listing,v_owner,p_sha256)
 on conflict(photo_id) do update set listing_id=excluded.listing_id,owner_id=excluded.owner_id,sha256=excluded.sha256,checked_at=now();
 select count(distinct owner_id) into v_count from private.listing_photo_hashes where sha256=p_sha256 and owner_id<>v_owner;
 if v_count>0 then
  update public.listing_moderation m set risk_score=least(100,m.risk_score+case when m.reused_photo_count=0 then 30 else 0 end),
    risk_level=case when least(100,m.risk_score+case when m.reused_photo_count=0 then 30 else 0 end)>60 then 'red' else 'orange' end,
    reused_photo_count=greatest(1,m.reused_photo_count),requires_manual_review=true,admin_reviewed=false,
    reasons=case when 'Photo(s) identique(s) utilisée(s) par un autre compte : +30 points'=any(m.reasons) then m.reasons else array_append(m.reasons,'Photo(s) identique(s) utilisée(s) par un autre compte : +30 points') end
  where m.listing_id in(select listing_id from private.listing_photo_hashes where sha256=p_sha256 and owner_id<>v_owner);
  update public.listings set status='pending' where status='active' and id in(select listing_id from private.listing_photo_hashes where sha256=p_sha256 and owner_id<>v_owner);
 end if;
 return v_count;
end; $$;
revoke all on function public.record_listing_photo_hash(uuid,text) from public,anon,authenticated;
grant execute on function public.record_listing_photo_hash(uuid,text) to service_role;
create table private.phone_release_log(
 id uuid primary key default gen_random_uuid(),phone_normalized text not null,
 account_type text not null,previous_user_id uuid not null,admin_id uuid not null,
 reason text not null,created_at timestamptz not null default now()
);
alter table private.phone_release_log enable row level security;
revoke all on private.phone_release_log from public,anon,authenticated;
grant all on private.phone_release_log to service_role;
create function public.admin_phone_reservation_lookup(p_phone text)
returns table(phone_normalized text,account_type text,user_id uuid,display_name text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrateur requis'; end if;
 return query select pr.phone_normalized,pr.account_type,pr.user_id,p.display_name
 from public.phone_registry pr left join public.profiles p on p.id=pr.user_id
 where pr.phone_normalized=public.abracadeal_normalize_phone(p_phone);
end; $$;
revoke all on function public.admin_phone_reservation_lookup(text) from public,anon;
grant execute on function public.admin_phone_reservation_lookup(text) to authenticated;
create function public.admin_release_phone(p_phone text,p_user_id uuid,p_account_type text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare v_phone text;v_type text;v_owner uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrateur requis'; end if;
 if length(btrim(coalesce(p_reason,'')))<10 then raise exception 'Motif détaillé requis (10 caractères minimum)'; end if;
 v_phone:=public.abracadeal_normalize_phone(p_phone);v_type:=lower(btrim(p_account_type));
 if v_phone is null or v_type not in ('particulier','professionnel') then raise exception 'Téléphone ou type de compte invalide'; end if;
 perform 1 from public.profiles where id=p_user_id for update;
 select user_id into v_owner from public.phone_registry where phone_normalized=v_phone and account_type=v_type for update;
 if v_owner is distinct from p_user_id then raise exception 'Réservation modifiée : rechargez la recherche'; end if;
 insert into private.phone_release_log(phone_normalized,account_type,previous_user_id,admin_id,reason)
 values(v_phone,v_type,p_user_id,auth.uid(),btrim(p_reason));
 perform set_config('abraca.admin_phone_release',p_user_id::text||':'||v_phone,true);
 update public.profiles set phone=null where id=p_user_id and public.abracadeal_normalize_phone(phone)=v_phone;
 perform set_config('abraca.admin_phone_release','',true);
 delete from public.phone_registry where phone_normalized=v_phone and account_type=v_type and user_id=p_user_id;
 update public.listing_contacts set phone=null where owner_id=p_user_id and public.abracadeal_normalize_phone(phone)=v_phone;
end; $$;
revoke all on function public.admin_release_phone(text,uuid,text,text) from public,anon;
grant execute on function public.admin_release_phone(text,uuid,text,text) to authenticated;
