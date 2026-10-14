create or replace function public.set_pro_listing_expiry()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.seller_type='professionnel' and new.status not in ('archived','rejected') then
    if new.category='immobilier' then
      if new.expires_at is null then new.expires_at:=coalesce(new.created_at,now())+interval '60 days'; end if;
    elsif new.category='vehicules' and (nullif(trim(coalesce(new.vehicle_make,'')),'') is not null or nullif(trim(coalesce(new.vehicle_model,'')),'') is not null) then
      if new.expires_at is null then new.expires_at:=coalesce(new.created_at,now())+interval '60 days'; end if;
    end if;
  end if;
  return new;
end;
$function$;

update public.commerce_offers
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('immo_days',60,'auto_moto_days',60),
    updated_at = now()
where code='pro_autoimmo_single';
