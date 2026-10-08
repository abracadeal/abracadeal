
-- Preserve the established triggers while allowing atomic revision writes.
CREATE OR REPLACE FUNCTION public.abraca_consume_pro_listing_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_group text; v_credits integer; v_photo integer; v_has_plan boolean:=false; v_admin boolean:=false;
begin
  if current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
  if new.seller_type<>'professionnel' or new.category='vacances' or new.status in ('archived','rejected') then return new; end if;
  select coalesce(is_admin,false) into v_admin from public.profiles where id=new.owner_id;
  if v_admin or exists(select 1 from public.internal_accounts where user_id=new.owner_id and exclude_from_counters) then return new; end if;
  if new.category='autres' then raise exception 'Les professionnels doivent choisir la catégorie correspondant à leur activité.' using errcode='23514'; end if;
  v_group:=case new.category when 'vehicules' then 'auto_moto_immo' when 'immobilier' then 'auto_moto_immo' when 'emploi' then 'emploi' when 'services' then 'services' when 'hightech' then 'hightech' when 'maison' then 'maison' when 'mode' then 'mode' else null end;
  if v_group is null then return new; end if;
  select exists(
    select 1 from public.pro_subscriptions ps join public.pro_subscription_plans pp on pp.code=ps.plan_code
    where ps.user_id=new.owner_id and ps.status in ('active','trialing') and new.category=any(pp.category_scope)
      and (ps.current_period_end is null or ps.current_period_end>now())
  ) into v_has_plan;
  if v_has_plan then return new; end if;
  select credits,photo_limit into v_credits,v_photo from public.pro_listing_credit_wallet
   where user_id=new.owner_id and category_group=v_group for update;
  if coalesce(v_credits,0)<=0 then raise exception 'Achat d''annonce ou abonnement Pro requis pour cette catégorie.' using errcode='23514'; end if;
  update public.pro_listing_credit_wallet set credits=credits-1,updated_at=now()
   where user_id=new.owner_id and category_group=v_group;
  if v_photo is not null and v_photo>0 then new.photo_limit:=v_photo; end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.abraca_enforce_listing_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_reviewed boolean;
  v_risk record;
begin
  if current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
  select admin_reviewed into v_reviewed
  from public.listing_moderation
  where listing_id = new.id
  limit 1;

  if v_reviewed then
    return new;
  end if;

  select * into v_risk
  from public.abraca_detect_listing_risk(
    new.category, new.title, new.description, new.price, new.vehicle_year, new.mileage
  );

  if v_risk.tier = 2 then
    new.status := 'rejected';
  elsif v_risk.tier = 1 and new.status = 'active' then
    new.status := 'pending';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.abraca_guard_approved_listing_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_material boolean;
  v_manual boolean;
  v_admin boolean := public.is_admin();
  v_service boolean := (coalesce(auth.role(),'') = 'service_role');
begin
  if current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
  -- Admin approval is explicit; ordinary edits do not inherit prior approval.
  if v_admin then
    if new.status='active' and old.status is distinct from new.status then
      update public.listing_moderation
         set requires_manual_review=false,admin_reviewed=true,
             reviewed_at=now(),reviewed_by=auth.uid()
       where listing_id=new.id;
    end if;
    return new;
  end if;

  -- Payment entitlements must never be client-editable.
  if not v_service and (
    new.featured_until is distinct from old.featured_until
    or new.promotion_tier is distinct from old.promotion_tier
  ) then
    raise exception 'Les mises en avant sont gerees exclusivement par Abracadeal';
  end if;

  if old.status='active' and old.seller_type='particulier' and private.edit_content(new)-'price'=private.edit_content(old)-'price' and new.price<old.price then return new; end if;

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

  if v_material and (old.status<>'archived' or new.status<>'archived') then
    perform public.abraca_invalidate_listing_review(
      new.id,'Annonce modifiee apres publication : nouveau controle requis',false
    );
    if new.status <> 'archived' then
      new.status := 'pending';
    end if;
  end if;

  -- Do not allow the owner to revive a pending/rejected/archived listing directly.
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

  -- Edits of rejected content permit resubmission, but never instant publication.
  if v_material and old.status='rejected' and new.status='rejected' then
    new.status:='pending';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.abraca_requeue_for_related_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_listing uuid;
  v_second_listing uuid;
  v_status text;
  v_reviewed boolean;
  v_autopublished boolean;
  v_manual boolean;
  v_prior_photo boolean;
  v_reason text;
begin
  if current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
  if public.is_admin() then
    return coalesce(new,old);
  end if;
  if tg_op='UPDATE' then
    if tg_table_name='listing_photos' then
      if new.listing_id is not distinct from old.listing_id
         and new.storage_path is not distinct from old.storage_path then
        return new; -- photo ordering only
      end if;
    elsif (to_jsonb(new)-'updated_at'-'created_at')
      = (to_jsonb(old)-'updated_at'-'created_at') then
      return new;
    end if;
  end if;

  if tg_op='DELETE' then
    v_listing:=old.listing_id;
  else
    v_listing:=new.listing_id;
    if tg_op='UPDATE' and new.listing_id is distinct from old.listing_id then
      v_second_listing:=old.listing_id;
    end if;
  end if;
  v_reason:=case when tg_table_name='listing_photos'
    then 'Photos modifiees : verification requise'
    when tg_table_name='vacation_listing_details'
    then 'Informations du logement modifiees : verification requise'
    when tg_table_name='vacation_listing_private'
    then 'Adresse du logement modifiee : verification requise'
    else 'Coordonnees de contact modifiees : verification requise'
  end;

  for v_listing in select distinct x
    from unnest(array[v_listing,v_second_listing]) x where x is not null loop
    select l.status,coalesce(m.admin_reviewed,false),coalesce(m.auto_published,false)
      into v_status,v_reviewed,v_autopublished
      from public.listings l
      left join public.listing_moderation m on m.listing_id=l.id
      where l.id=v_listing
      for update of l;
    if not found or v_status='archived' then continue; end if;

    v_prior_photo:=false;
    if tg_table_name='listing_photos' then
      if tg_op='INSERT' then
        select count(*)>1 into v_prior_photo
          from public.listing_photos where listing_id=v_listing;
      else
        v_prior_photo:=true;
      end if;
    end if;
    v_manual := tg_table_name='listing_photos' and (
      v_reviewed or v_autopublished or (v_status='active' and v_prior_photo)
    );

    perform public.abraca_invalidate_listing_review(v_listing,v_reason,v_manual);
    if v_status in ('active','rejected') then
      update public.listings set status='pending',updated_at=now()
       where id=v_listing;
    end if;
  end loop;
  return coalesce(new,old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_founder_50_listing_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_limit int:=0; v_count int:=0;
begin
  if current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
 if new.category='vacances' or new.seller_type<>'professionnel' or new.status in ('archived','rejected') then return new; end if;
 if tg_op='UPDATE' and old.owner_id=new.owner_id and old.status not in ('archived','rejected') then return new; end if;
 select coalesce(max(ps.listing_limit),0) into v_limit
 from public.pro_subscriptions ps join public.pro_subscription_plans pp on pp.code=ps.plan_code
 where ps.user_id=new.owner_id and ps.status in ('active','trialing')
   and (ps.current_period_end is null or ps.current_period_end>now()) and new.category=any(pp.category_scope);
 if v_limit<=0 then return new; end if;
 select count(*) into v_count from public.listings
 where owner_id=new.owner_id and category=new.category and seller_type='professionnel'
   and status not in ('archived','rejected') and id is distinct from new.id;
 if v_count>=v_limit then raise exception 'Limite de % annonces actives atteinte pour cette offre.',v_limit using errcode='23514'; end if;
 return new;
end;
$function$;


