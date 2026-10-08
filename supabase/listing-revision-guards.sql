-- Close direct related-table edits and keep approved proposed versions immutable.
create or replace function private.guard_live_photos() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if coalesce(auth.role(),'')='service_role' or public.is_admin() or current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
 v_id:=case when tg_op='DELETE' then old.listing_id else new.listing_id end;
 if exists(select 1 from public.listings where id=v_id and status='active' and seller_type='particulier' and revision_of is null)
 or exists(select 1 from private.listing_revisions where candidate_id=v_id and (approved or order_id is not null)) then raise exception 'Utilisez Modifier et remonter mon annonce pour modifier les photos'; end if;
 if tg_op='UPDATE' and new.listing_id<>old.listing_id and exists(select 1 from public.listings where id=old.listing_id and status='active' and seller_type='particulier') then raise exception 'Modification de photo en ligne interdite'; end if;
 return coalesce(new,old);
end $$;
create or replace function private.guard_live_contacts() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if coalesce(auth.role(),'')='service_role' or public.is_admin() or current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
 if tg_op='UPDATE' and new.phone is not distinct from old.phone and new.contact_email is not distinct from old.contact_email and new.listing_id=old.listing_id then return new; end if;
 v_id:=case when tg_op='DELETE' then old.listing_id else new.listing_id end;
 if exists(select 1 from public.listings where id=v_id and status='active' and seller_type='particulier' and revision_of is null)
 or exists(select 1 from private.listing_revisions where candidate_id=v_id and (approved or order_id is not null)) then raise exception 'Utilisez Modifier et remonter mon annonce pour modifier les coordonnées'; end if;
 return coalesce(new,old);
end $$;
create trigger a_guard_live_contacts before insert or update or delete on public.listing_contacts for each row execute function private.guard_live_contacts();
-- A proposed version already approved and awaiting payment does not need a second review card.
create or replace function public.get_my_listing_revisions() returns table(candidate_id uuid,original_id uuid,approved boolean,paid boolean,included boolean,applied_at timestamptz)
language sql security definer set search_path='' as $$select candidate_id,original_id,approved,paid,included,applied_at from private.listing_revisions where owner_id=auth.uid()$$;
revoke all on function public.get_my_listing_revisions() from public,anon;
grant execute on function public.get_my_listing_revisions() to authenticated;
