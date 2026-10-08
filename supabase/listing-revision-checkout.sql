create or replace function public.assert_listing_revision_checkout(p_candidate_id uuid,p_owner_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.listing_revisions; l public.listings;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service requis'; end if;
 select * into strict r from private.listing_revisions where candidate_id=p_candidate_id;
 if r.owner_id<>p_owner_id or r.included or r.applied_at is not null then raise exception 'Modification non éligible'; end if;
 select * into strict l from public.listings where id=r.original_id;
 if l.status<>'active' or private.edit_content(l) is distinct from r.base_content then raise exception 'La version en ligne a changé. Annulez cette proposition et préparez une nouvelle modification.'; end if;
end $$;
revoke all on function public.assert_listing_revision_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.assert_listing_revision_checkout(uuid,uuid) to service_role;
create unique index if not exists commerce_orders_one_revision_purchase on public.commerce_orders(revision_id) where revision_id is not null and status in ('pending','paid');
