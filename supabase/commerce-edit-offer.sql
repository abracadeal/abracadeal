create table if not exists private.commerce_offer_changes(id bigint generated always as identity primary key,actor uuid not null,offer_code text not null,before_value jsonb not null,after_value jsonb not null,changed_at timestamptz not null default now());
create or replace function public.admin_get_listing_edit_offer() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrateur requis'; end if;
 return (select to_jsonb(o) from public.commerce_offers o where code='private_listing_edit');
end $$;
create or replace function public.admin_set_listing_edit_offer(p_amount_cents integer,p_active boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare before_value jsonb; after_value jsonb;
begin
 if not public.is_admin() then raise exception 'Administrateur requis'; end if;
 if p_amount_cents<1 or p_amount_cents>100000 or p_amount_cents is null or p_active is null then raise exception 'Tarif TTC invalide'; end if;
 select to_jsonb(o) into before_value from public.commerce_offers o where code='private_listing_edit' for update;
 update public.commerce_offers set amount_cents=p_amount_cents,active=p_active,stripe_price_id=null,updated_at=now() where code='private_listing_edit';
 select to_jsonb(o) into after_value from public.commerce_offers o where code='private_listing_edit';
 insert into private.commerce_offer_changes(actor,offer_code,before_value,after_value) values(auth.uid(),'private_listing_edit',before_value,after_value);
 return after_value;
end $$;
revoke all on function public.admin_get_listing_edit_offer() from public,anon;
revoke all on function public.admin_set_listing_edit_offer(integer,boolean) from public,anon;
grant execute on function public.admin_get_listing_edit_offer(),public.admin_set_listing_edit_offer(integer,boolean) to authenticated;
