create or replace function public.check_listing_republication(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare l public.listings;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service requis'; end if;
 select * into strict l from public.listings where id=p_listing_id;
 if l.revision_of is not null then return false; end if;
 return (
  select count(*) >= 4
  from private.deleted_listing_signatures d
  where d.owner_id=l.owner_id
    and d.listing_id<>l.id
    and d.deleted_at>now()-interval '30 days'
    and (
      private.similar_deleted_title(d.title,l.title)
      or exists(
        select 1 from private.listing_photo_hashes h
        where h.listing_id=l.id and h.sha256=any(d.photo_hashes)
      )
    )
 );
end $$;

create or replace function private.guard_listing_change()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
 service boolean:=coalesce(auth.role(),'')='service_role';
 internal boolean:=current_setting('abraca.revision_write',true)=txid_current()::text;
begin
 if internal then return new; end if;
 if tg_op='INSERT' then
  if new.revision_of is not null then raise exception 'Version proposée : utilisez le circuit de modification'; end if;
  if (
    select count(*) >= 4
    from private.deleted_listing_signatures d
    where d.owner_id=new.owner_id
      and d.deleted_at>now()-interval '30 days'
      and private.similar_deleted_title(d.title,new.title)
  ) then
    raise exception 'Cette annonce a déjà été republiée plusieurs fois récemment. La 5e republication similaire sur 30 jours est bloquée.';
  end if;
  if new.daily_bump_until is not null and not service and not public.is_admin() then raise exception 'Champ réservé au service'; end if;
 elsif not service and not public.is_admin() then
  if new.revision_of is distinct from old.revision_of or new.created_at is distinct from old.created_at or new.boosted_at is distinct from old.boosted_at or new.urgent_until is distinct from old.urgent_until or new.photo_limit is distinct from old.photo_limit or new.featured_until is distinct from old.featured_until or new.promotion_tier is distinct from old.promotion_tier or new.daily_bump_until is distinct from old.daily_bump_until then raise exception 'Champ réservé au service'; end if;
  if old.status='active' and old.seller_type='particulier' and private.edit_content(new) is distinct from private.edit_content(old) and not (private.edit_content(new)-'price'=private.edit_content(old)-'price' and new.price<old.price) then raise exception 'Utilisez Modifier et remonter mon annonce'; end if;
  if old.revision_of is not null and exists(select 1 from private.listing_revisions where candidate_id=old.id and (approved or order_id is not null)) and private.edit_content(new) is distinct from private.edit_content(old) then raise exception 'Cette version est déjà soumise'; end if;
 end if;
 return new;
end $$;
