create extension if not exists pg_trgm with schema extensions;
-- Live edits are staged as pending listings; only paid AND approved revisions merge.
alter table public.listings add column if not exists revision_of uuid references public.listings(id) on delete cascade;
alter table public.commerce_orders add column if not exists withdrawal_accepted_at timestamptz;
alter table public.commerce_orders add column if not exists withdrawal_text text;
alter table public.commerce_orders add column if not exists revision_id uuid references public.listings(id) on delete set null deferrable initially deferred;
alter table public.promotion_orders add column if not exists withdrawal_accepted_at timestamptz;
alter table public.promotion_orders add column if not exists withdrawal_text text;
alter table public.commerce_offers drop constraint commerce_offers_offer_type_check;
alter table public.commerce_offers add constraint commerce_offers_offer_type_check check (offer_type in ('single_listing','listing_pack','subscription','photo_option','featured','urgent','boost_pack','modification'));
insert into public.commerce_offers(code,audience,category_group,offer_type,label,amount_cents,sort_order)
values('private_listing_edit','particulier','all','modification','Modifier et remonter mon annonce',290,100)
on conflict(code) do nothing;
create table if not exists private.listing_revisions (
 candidate_id uuid primary key references public.listings(id) on delete cascade,
 original_id uuid not null references public.listings(id) on delete cascade,
 owner_id uuid not null references public.profiles(id),
 base_content jsonb not null, included boolean not null default false,
 approved boolean not null default false, paid boolean not null default false,
 order_id uuid unique references public.commerce_orders(id),
 created_at timestamptz not null default now(), applied_at timestamptz
);
create table if not exists private.deleted_listing_signatures (
 listing_id uuid primary key, owner_id uuid not null, title text not null,
 photo_hashes text[] not null default '{}', deleted_at timestamptz not null default now()
);
create index if not exists deleted_signatures_owner_date on private.deleted_listing_signatures(owner_id,deleted_at);
create or replace function private.edit_content(l public.listings) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('seller_type',l.seller_type,'phone',l.phone,'contact_email',l.contact_email,'external_url',l.external_url,'vacation_low_price_confirmed_value',l.vacation_low_price_confirmed_value,'category',l.category,'title',l.title,'description',l.description,'price',l.price,'city',l.city,'postal_code',l.postal_code,'show_phone',l.show_phone,'item_condition',l.item_condition,'vehicle_make',l.vehicle_make,'vehicle_model',l.vehicle_model,'vehicle_year',l.vehicle_year,'mileage',l.mileage,'fuel',l.fuel,'transmission',l.transmission,'crit_air',l.crit_air,'visibility_scope',l.visibility_scope,'loa_available',l.loa_available,'loa_monthly',l.loa_monthly)
$$;
create or replace function private.capture_deleted_signature() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.listings;
begin
 l:=old;
 if l.revision_of is not null then return coalesce(new,old); end if;
 if tg_op='UPDATE' and (new.status<>'archived' or old.status='archived' or new.archive_reason not in ('user_deleted','sold')) then return new; end if;
 insert into private.deleted_listing_signatures(listing_id,owner_id,title,photo_hashes)
 select l.id,l.owner_id,l.title,coalesce(array_agg(distinct sha256) filter(where sha256 is not null),'{}') from private.listing_photo_hashes where listing_id=l.id
 on conflict(listing_id) do update set title=excluded.title,photo_hashes=case when cardinality(excluded.photo_hashes)>0 then excluded.photo_hashes else private.deleted_listing_signatures.photo_hashes end,deleted_at=now();
 return coalesce(new,old);
end $$;
create trigger a_capture_deleted_signature before delete or update of status on public.listings for each row execute function private.capture_deleted_signature();
-- Existing deleted titles remain available in the retained archive.
insert into private.deleted_listing_signatures(listing_id,owner_id,title,deleted_at)
select listing_id,owner_id,snapshot->>'title',archived_at from private.listing_archives where archived_at>now()-interval '30 days' and archive_reason in ('user_deleted','sold') and snapshot->>'title' is not null
on conflict do nothing;
create or replace function private.similar_deleted_title(a text,b text) returns boolean language sql immutable set search_path='' as $$
 select regexp_replace(lower(a),'[^[:alnum:]]','','g')=regexp_replace(lower(b),'[^[:alnum:]]','','g')
 or (length(a)>=12 and length(b)>=12 and extensions.similarity(lower(a),lower(b))>=0.85)
$$;
create or replace function public.check_listing_republication(p_listing_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare l public.listings;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service requis'; end if;
 select * into strict l from public.listings where id=p_listing_id;
 if l.revision_of is not null then return false; end if;
 return exists(select 1 from private.deleted_listing_signatures d where d.owner_id=l.owner_id and d.listing_id<>l.id and d.deleted_at>now()-interval '30 days' and (private.similar_deleted_title(d.title,l.title) or exists(select 1 from private.listing_photo_hashes h where h.listing_id=l.id and h.sha256=any(d.photo_hashes))));
end $$;
revoke all on function public.check_listing_republication(uuid) from public,anon,authenticated;
grant execute on function public.check_listing_republication(uuid) to service_role;
create or replace function private.guard_listing_change() returns trigger language plpgsql security definer set search_path='' as $$
declare service boolean:=coalesce(auth.role(),'')='service_role'; internal boolean:=current_setting('abraca.revision_write',true)=txid_current()::text;
begin
 if internal then return new; end if;
 if tg_op='INSERT' then
  if new.revision_of is not null then raise exception 'Version proposée : utilisez le circuit de modification'; end if;
  if exists(select 1 from private.deleted_listing_signatures d where d.owner_id=new.owner_id and d.deleted_at>now()-interval '30 days' and private.similar_deleted_title(d.title,new.title)) then raise exception 'Cette annonce ressemble à une annonce supprimée récemment. Modifiez-la depuis Mes annonces.'; end if;
 elsif not service and not public.is_admin() then
  if new.revision_of is distinct from old.revision_of or new.created_at is distinct from old.created_at or new.boosted_at is distinct from old.boosted_at or new.urgent_until is distinct from old.urgent_until or new.photo_limit is distinct from old.photo_limit or new.featured_until is distinct from old.featured_until or new.promotion_tier is distinct from old.promotion_tier then raise exception 'Champ réservé au service'; end if;
  if old.status='active' and old.seller_type='particulier' and private.edit_content(new) is distinct from private.edit_content(old) and not (private.edit_content(new)-'price'=private.edit_content(old)-'price' and new.price<old.price) then raise exception 'Utilisez Modifier et remonter mon annonce'; end if;
  if old.revision_of is not null and exists(select 1 from private.listing_revisions where candidate_id=old.id and (approved or order_id is not null)) and private.edit_content(new) is distinct from private.edit_content(old) then raise exception 'Cette version est déjà soumise'; end if;
 end if;
 return new;
end $$;
create trigger aaaa_guard_listing_change before insert or update on public.listings for each row execute function private.guard_listing_change();
-- Revisions must never appear as independent published adverts.
create policy revisions_not_public on public.listings as restrictive for select using (revision_of is null or owner_id=auth.uid() or public.is_admin());
create or replace function public.prepare_listing_change(p_listing_id uuid,p_changes jsonb,p_replace_photos boolean default false,p_phone text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.listings; n public.listings; c jsonb; k text; free boolean; v_candidate uuid:=gen_random_uuid(); contact public.listing_contacts;
begin
 select * into strict l from public.listings where id=p_listing_id for update;
 if auth.uid() is distinct from l.owner_id then raise exception 'Accès refusé'; end if;
 if l.status<>'active' or l.revision_of is not null then raise exception 'Annonce en ligne requise'; end if;
 if not private.moderation_user_allowed(l.owner_id) then raise exception 'Compte suspendu'; end if;
 c:=private.edit_content(l);
 for k in select jsonb_object_keys(c) loop if p_changes ? k then c:=jsonb_set(c,array[k],p_changes->k); end if; end loop;
 n:=jsonb_populate_record(l,c);
 if n.seller_type<>l.seller_type then raise exception 'Type de vendeur non modifiable'; end if;
 select * into contact from public.listing_contacts where listing_id=l.id;
 if not p_replace_photos and c-'price'=private.edit_content(l)-'price' and p_phone is not distinct from contact.phone and (n.price<l.price or n.price is not distinct from l.price) then
  perform set_config('abraca.revision_write',txid_current()::text,true);
  update public.listings set price=n.price where id=l.id;
  return jsonb_build_object('listing_id',l.id,'free',true,'price_only',true);
 end if;
 free:=l.seller_type='professionnel' and l.source<>'manual' and exists(select 1 from public.pro_subscriptions where user_id=l.owner_id and status in ('active','trialing') and (current_period_end is null or current_period_end>now()));
 if l.seller_type='professionnel' and not free then raise exception 'La modification incluse nécessite un abonnement actif et la synchronisation de flux'; end if;
 perform set_config('abraca.revision_write',txid_current()::text,true);
 n.id:=v_candidate;n.revision_of:=l.id;n.status:='pending';n.created_at:=now();n.updated_at:=now();n.external_id:=null;n.source:='manual';n.listing_reference:='ABR-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.listing_reference_seq')::text,8,'0');n.featured_until:=null;n.urgent_until:=null;n.boosted_at:=null;n.promotion_tier:=null;
 insert into public.listings select n.*;
 insert into private.listing_revisions(candidate_id,original_id,owner_id,base_content,included) values(v_candidate,l.id,l.owner_id,private.edit_content(l),free);
 insert into public.listing_contacts(listing_id,owner_id,phone,contact_email) values(v_candidate,l.owner_id,p_phone,contact.contact_email);
 return jsonb_build_object('listing_id',v_candidate,'original_id',l.id,'free',free,'price_only',false,'copy_photos',not p_replace_photos);
end $$;
revoke all on function public.prepare_listing_change(uuid,jsonb,boolean,text) from public,anon;
grant execute on function public.prepare_listing_change(uuid,jsonb,boolean,text) to authenticated;
create or replace function public.complete_listing_revision(p_candidate_id uuid,p_approve boolean default false,p_order_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.listing_revisions; l public.listings; c public.listings; m public.listing_moderation; snap jsonb;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service requis'; end if;
 select * into r from private.listing_revisions where candidate_id=p_candidate_id for update;
 if not found then return jsonb_build_object('revision',false); end if;
 if r.applied_at is not null then return jsonb_build_object('revision',true,'applied',true); end if;
 select * into strict c from public.listings where id=p_candidate_id for update;
 select * into strict l from public.listings where id=r.original_id for update;
 select * into m from public.listing_moderation where listing_id=c.id;
 if p_order_id is not null then
  if not exists(select 1 from public.commerce_orders o where o.id=p_order_id and o.revision_id=c.id and o.user_id=r.owner_id and o.offer_code='private_listing_edit' and o.status='paid' and o.withdrawal_accepted_at is not null) then raise exception 'Paiement confirmé requis'; end if;
  update private.listing_revisions set paid=true,order_id=p_order_id where candidate_id=c.id;r.paid:=true;
 end if;
 if c.status='rejected' then return jsonb_build_object('revision',true,'applied',false,'refused',true); end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',storage_path) order by id),'[]'::jsonb) into snap from public.listing_photos where listing_id=c.id;
 if m.safety_snapshot is distinct from jsonb_build_object('text',c.title||E'\n'||coalesce(c.description,''),'photos',snap) then raise exception 'Version modifiée après analyse'; end if;
 if p_approve then
  if c.status<>'pending' or not coalesce(m.ai_checked,false) or coalesce(m.safety_blocked,false) then raise exception 'Analyse complète requise'; end if;
  update private.listing_revisions set approved=true where candidate_id=c.id;r.approved:=true;
 end if;
 if not r.approved or not (r.paid or r.included) then return jsonb_build_object('revision',true,'applied',false); end if;
 if l.status<>'active' or private.edit_content(l) is distinct from r.base_content then raise exception 'La version en ligne a changé : vérification requise'; end if;
 if c.status<>'pending' or not coalesce(m.ai_checked,false) or coalesce(m.safety_blocked,false) or exists(select 1 from public.listing_photos where listing_id=c.id and storage_bucket<>'listing-images') then raise exception 'Version non publiable'; end if;
 perform set_config('abraca.revision_write',txid_current()::text,true);
 -- Atomic replacement preserves all entitlements and the original ID/reference.
 update public.listings set category=c.category,title=c.title,description=c.description,price=c.price,city=c.city,postal_code=c.postal_code,show_phone=c.show_phone,item_condition=c.item_condition,vehicle_make=c.vehicle_make,vehicle_model=c.vehicle_model,vehicle_year=c.vehicle_year,mileage=c.mileage,fuel=c.fuel,transmission=c.transmission,crit_air=c.crit_air,visibility_scope=c.visibility_scope,loa_available=c.loa_available,loa_monthly=c.loa_monthly,created_at=case when r.included then l.created_at else now() end,boosted_at=case when r.included then l.boosted_at else now() end where id=l.id;
 delete from public.listing_photos where listing_id=l.id;
 update public.listing_photos set listing_id=l.id where listing_id=c.id;
 update private.listing_photo_hashes set listing_id=l.id where listing_id=c.id;
 insert into public.listing_contacts(listing_id,owner_id,phone,contact_email) select l.id,l.owner_id,phone,contact_email from public.listing_contacts where listing_id=c.id on conflict(listing_id) do update set phone=excluded.phone,contact_email=excluded.contact_email;
 delete from public.listing_moderation where listing_id=l.id;
 m.listing_id:=l.id;insert into public.listing_moderation select m.*;
 update private.listing_revisions set applied_at=now() where candidate_id=c.id;
 update public.listings set status='archived',archive_reason='other' where id=c.id;
 return jsonb_build_object('revision',true,'applied',true,'listing_id',l.id,'bumped',not r.included);
end $$;
revoke all on function public.complete_listing_revision(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.complete_listing_revision(uuid,boolean,uuid) to service_role;

create or replace function private.guard_live_photos() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if coalesce(auth.role(),'')='service_role' or public.is_admin() or current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
 v_id:=case when tg_op='DELETE' then old.listing_id else new.listing_id end;
 if exists(select 1 from public.listings where id=v_id and status='active' and seller_type='particulier' and revision_of is null) then raise exception 'Utilisez Modifier et remonter mon annonce pour modifier les photos'; end if;
 return coalesce(new,old);
end $$;
create trigger a_guard_live_photos before insert or update or delete on public.listing_photos for each row execute function private.guard_live_photos();
