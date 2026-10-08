-- Additive migration; the existing moderation and edit-review rules are retained.
create schema if not exists private;
create table if not exists private.moderation_suspensions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null, suspended_at timestamptz not null default now()
);
alter table private.moderation_suspensions enable row level security;
revoke all on private.moderation_suspensions from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.moderation_suspensions to service_role;
alter table public.listing_photos add column if not exists storage_bucket text not null default 'listing-images';
alter table public.listing_moderation add column if not exists ai_error text;
alter table public.listing_moderation add column if not exists safety_snapshot jsonb;
alter table public.listing_moderation add column if not exists safety_blocked boolean not null default false;
alter table public.listing_moderation add column if not exists pharos_prepared_at timestamptz;
alter table public.listing_moderation add column if not exists pharos_prepared_by uuid;
alter table public.listing_moderation add column if not exists enforcement_completed_at timestamptz;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('listing-images-pending','listing-images-pending',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false;
create or replace function private.moderation_user_allowed(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from private.moderation_suspensions where user_id=p_user);
$$;
revoke all on function private.moderation_user_allowed(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.moderation_user_allowed(uuid) to authenticated;
create policy moderation_pending_read on storage.objects for select to authenticated
using(bucket_id='listing-images-pending' and (public.is_admin() or ((storage.foldername(name))[1]=auth.uid()::text and private.moderation_user_allowed(auth.uid()))));
create policy moderation_pending_upload on storage.objects for insert to authenticated
with check(bucket_id='listing-images-pending' and (storage.foldername(name))[1]=auth.uid()::text and private.moderation_user_allowed(auth.uid()));
create policy moderation_pending_delete on storage.objects for delete to authenticated
using(bucket_id='listing-images-pending' and (public.is_admin() or ((storage.foldername(name))[1]=auth.uid()::text and private.moderation_user_allowed(auth.uid()))));
-- Restrictive policies also cover existing permissive admin policies.
create policy moderation_no_public_upload on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'listing-images');
create policy moderation_no_public_replace on storage.objects as restrictive for update to authenticated
using(bucket_id<>'listing-images') with check(bucket_id<>'listing-images');
create policy moderation_suspended_storage_insert on storage.objects as restrictive for insert to authenticated
with check(private.moderation_user_allowed(auth.uid()));
create policy moderation_suspended_storage_update on storage.objects as restrictive for update to authenticated
using(private.moderation_user_allowed(auth.uid())) with check(private.moderation_user_allowed(auth.uid()));
create policy moderation_suspended_listing_insert on public.listings as restrictive for insert to authenticated
with check(private.moderation_user_allowed(auth.uid()));
create policy moderation_suspended_listing_update on public.listings as restrictive for update to authenticated
using(private.moderation_user_allowed(auth.uid())) with check(private.moderation_user_allowed(auth.uid()));
create policy moderation_suspended_photos on public.listing_photos as restrictive for all to authenticated
using(private.moderation_user_allowed(auth.uid())) with check(private.moderation_user_allowed(auth.uid()) );
alter table public.listings drop constraint listings_status_check;
alter table public.listings add constraint listings_status_check check(status in ('pending','active','rejected','archived','hidden'));
create or replace function private.hide_reported_listing()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.listing_id is null then return new; end if;
 perform 1 from public.listings where id=new.listing_id for update;
 if (select count(distinct reporter_id) from public.reports where listing_id=new.listing_id and status<>'dismissed')>=3 then
  update public.listings set status='hidden' where id=new.listing_id and status in ('active','pending');
 end if;
 return new;
end; $$;
revoke all on function private.hide_reported_listing() from public,anon,authenticated;
create trigger moderation_hide_after_reports after insert or update of status on public.reports
for each row execute function private.hide_reported_listing();
create index if not exists reports_listing_reporter_idx on public.reports(listing_id,reporter_id);
create or replace function public.moderation_suspend_owner(p_listing_id uuid,p_reason text,p_pharos boolean default false,p_actor uuid default null)
returns void language plpgsql security invoker set search_path='' as $$
declare v_owner uuid;
begin
 if current_user<>'service_role' then raise exception 'Service only'; end if;
 select owner_id into strict v_owner from public.listings where id=p_listing_id for update;
 insert into private.moderation_suspensions(user_id,reason) values(v_owner,p_reason)
 on conflict(user_id) do update set reason=excluded.reason;
 update public.listings set status='rejected' where owner_id=v_owner and status<>'archived';
 insert into public.listing_moderation(listing_id,risk_score,risk_level,reasons,engine,safety_blocked,auto_published,pharos_prepared_at,pharos_prepared_by)
 values(p_listing_id,100,'red',array[p_reason],'omni-moderation-latest',true,false,case when p_pharos then now() end,p_actor)
 on conflict(listing_id) do update set risk_score=100,risk_level='red',
 reasons=array_append(public.listing_moderation.reasons,p_reason),safety_blocked=true,auto_published=false,
 pharos_prepared_at=case when p_pharos then now() else public.listing_moderation.pharos_prepared_at end,
 pharos_prepared_by=case when p_pharos then p_actor else public.listing_moderation.pharos_prepared_by end;
end; $$;
revoke all on function public.moderation_suspend_owner(uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.moderation_suspend_owner(uuid,text,boolean,uuid) to service_role;
create or replace function private.guard_safety_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare m public.listing_moderation; snap jsonb;
begin
 if not private.moderation_user_allowed(new.owner_id) and new.status not in ('rejected','archived') then
  if current_user='service_role' or coalesce(auth.jwt()->>'role','')='service_role' then new.status:='rejected'; else raise exception 'Compte suspendu'; end if;
 end if;
 if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then
  select * into m from public.listing_moderation where listing_id=new.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',storage_path) order by id),'[]'::jsonb)
    into snap from public.listing_photos where listing_id=new.id;
  if coalesce(m.safety_blocked,false) or not coalesce(m.ai_checked,false)
   or m.safety_snapshot is distinct from jsonb_build_object('text',new.title||E'\n'||coalesce(new.description,''),'photos',snap)
   or exists(select 1 from public.listing_photos where listing_id=new.id and storage_bucket<>'listing-images') then
   raise exception 'Analyse de sécurité complète requise avant publication';
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.guard_safety_publication() from public,anon,authenticated;
create trigger zzz_guard_safety_publication before insert or update on public.listings
for each row execute function private.guard_safety_publication();

create or replace function private.guard_photo_bucket()
returns trigger language plpgsql set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')='service_role' then return new; end if;
 if tg_op='INSERT' or new.storage_path is distinct from old.storage_path then
  if new.storage_bucket<>'listing-images-pending' and new.storage_path !~ '^https://' then raise exception 'Upload privé requis'; end if;
 elsif new.storage_bucket is distinct from old.storage_bucket then raise exception 'Publication des photos réservée au service'; end if;
 return new;
end; $$;
revoke all on function private.guard_photo_bucket() from public,anon,authenticated;
create trigger moderation_photo_bucket before insert or update on public.listing_photos
for each row execute function private.guard_photo_bucket();
