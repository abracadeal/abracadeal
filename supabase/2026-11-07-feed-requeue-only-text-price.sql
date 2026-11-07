-- 07/11/2026 (Claude, demande d'Anthony) : des annonces importées (WeeCars) revenaient « à modérer » sans arrêt.
-- Cause : la lecture du site est parfois incomplète (description vide, ou texte générique WeeCars
-- « Nous vous proposons cette … au prix de … » à la place du texte du garage). La synchro écrasait le bon texte,
-- le garde y voyait une modification → nouvelle validation demandée, puis le bon texte revenait au passage suivant.
-- Règle voulue : une annonce importée ne revient à modérer QUE si le titre, le prix ou le texte de la description changent.

create or replace function private.feed_tags(p text) returns text language sql immutable set search_path to '' as $$
  select coalesce(substring(coalesce(p,'') from '^((?:\[ABRACA_[A-Z]+:[^\]\n]*\]\n)*)'),'')
$$;
create or replace function private.feed_free_text(p text) returns text language sql immutable set search_path to '' as $$
  select regexp_replace(coalesce(p,''), '^(?:\[ABRACA_[A-Z]+:[^\]\n]*\]\n)*', '')
$$;

-- Lecture dégradée : on garde le texte déjà publié.
create or replace function private.feed_keep_good_description()
returns trigger language plpgsql set search_path to '' as $$
declare v_old text; v_new text;
begin
  if coalesce(auth.role(),'')<>'service_role' or old.source is null or old.source not like 'feed:%'
     or new.source is distinct from old.source then return new; end if;
  v_old:=private.feed_free_text(old.description);
  v_new:=private.feed_free_text(new.description);
  if btrim(v_old)='' then return new; end if;
  if btrim(v_new)=''
     or (v_new ~* '^\s*Nous vous proposons (cette|ce|cet) ' and v_old !~* '^\s*Nous vous proposons (cette|ce|cet) ') then
    new.description:=left(private.feed_tags(new.description)||v_old,5000);
  end if;
  return new;
end $$;

drop trigger if exists a1_feed_keep_good_description on public.listings;
create trigger a1_feed_keep_good_description before update on public.listings
  for each row execute function private.feed_keep_good_description();

-- Garde : pour une mise à jour faite par l'import (service_role, annonce feed:%), seuls titre / prix / texte comptent.
create or replace function public.abraca_guard_approved_listing_edit()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_material boolean;
  v_manual boolean;
  v_admin boolean := public.is_admin() or coalesce(current_setting('abraca.moderation_write',true),'')=txid_current()::text;
  v_service boolean := (coalesce(auth.role(),'') = 'service_role');
begin
  if current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
  if v_admin then
    if new.status='active' and old.status is distinct from new.status then
      update public.listing_moderation
         set requires_manual_review=false,admin_reviewed=true,
             reviewed_at=now(),reviewed_by=auth.uid()
       where listing_id=new.id;
    end if;
    return new;
  end if;

  if not v_service and (
    new.featured_until is distinct from old.featured_until
    or new.promotion_tier is distinct from old.promotion_tier
  ) then
    raise exception 'Les mises en avant sont gerees exclusivement par Abracadeal';
  end if;

  if old.status='active' and old.seller_type='particulier' and private.edit_content(new)-'price'=private.edit_content(old)-'price' and new.price<old.price then return new; end if;

  if v_service and old.source like 'feed:%' and new.source is not distinct from old.source then
    v_material := new.title is distinct from old.title
      or new.price is distinct from old.price
      or btrim(private.feed_free_text(new.description)) is distinct from btrim(private.feed_free_text(old.description));
  else
  v_material := row(
    new.category,new.title,new.description,new.price,new.city,
    new.phone,new.contact_email,new.show_phone,new.seller_type,
    new.postal_code,new.item_condition,
    new.vehicle_make,new.vehicle_model,new.vehicle_year,
    new.mileage,new.fuel,new.transmission,new.crit_air,
    new.loa_available,new.loa_monthly,new.external_url,
    new.visibility_scope,new.vacation_low_price_confirmed_value
  ) is distinct from row(
    old.category,old.title,old.description,old.price,old.city,
    old.phone,old.contact_email,old.show_phone,old.seller_type,
    old.postal_code,old.item_condition,
    old.vehicle_make,old.vehicle_model,old.vehicle_year,
    old.mileage,old.fuel,old.transmission,old.crit_air,
    old.loa_available,old.loa_monthly,old.external_url,
    old.visibility_scope,old.vacation_low_price_confirmed_value
  );
  end if;

  if v_material and (old.status<>'archived' or new.status<>'archived') then
    perform public.abraca_invalidate_listing_review(
      new.id,'Annonce modifiee apres publication : nouveau controle requis',false
    );
    if new.status <> 'archived' then
      new.status := 'pending';
    end if;
  end if;

  if old.status is distinct from 'active' and new.status='active' then
    if v_service then
      select requires_manual_review into v_manual
        from public.listing_moderation where listing_id=new.id;
      if coalesce(v_manual,false) then
        raise exception 'Validation manuelle requise apres modification des photos';
      end if;
    else
      if not v_material then
        perform public.abraca_invalidate_listing_review(
          new.id,'Remise en publication : nouveau controle requis',false
        );
      end if;
      new.status:='pending';
    end if;
  end if;

  if v_material and old.status='rejected' and new.status='rejected' then
    new.status:='pending';
  end if;
  return new;
end;
$function$;
