-- 18/10/2026 — Claude — Connexion rapide Google / Facebook
-- 1) Un compte créé via Google/Facebook n'a pas encore de téléphone : on autorise
--    la création du profil sans téléphone UNIQUEMENT pour ces comptes. Le site
--    demande le téléphone (unique) dès le retour, avant toute utilisation.
-- 2) Pseudo par défaut = prénom fourni par Google/Facebook.

create or replace function public.abracadeal_enforce_profile_phone()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_phone text;
  v_type text;
  v_owner uuid;
  v_internal boolean := false;
  v_old_phone text;
  v_old_type text;
begin
  if tg_op='UPDATE' and new.phone is null and current_setting('abraca.retention_close',true)=old.id::text and exists(select 1 from private.retention_accounts where user_id=old.id and state='closing') then return new; end if;
  if tg_op='UPDATE' and new.phone is null and public.is_admin()
     and current_setting('abraca.admin_phone_release',true)=old.id::text||':'||public.abracadeal_normalize_phone(old.phone) then
    return new;
  end if;
  if new.phone is null or btrim(new.phone) = '' then
    -- Inscription Google/Facebook : téléphone complété juste après sur le site
    if tg_op = 'INSERT' and exists(
      select 1 from auth.users u
      where u.id = new.id
        and coalesce(u.raw_app_meta_data->>'provider','') in ('google','facebook')
    ) then
      new.phone := null;
      return new;
    end if;
    if tg_op = 'INSERT' or new.phone is distinct from old.phone then
      raise exception using message = 'phone_required';
    end if;
    return new;
  end if;

  v_phone := public.abracadeal_normalize_phone(new.phone);
  if v_phone is null then
    raise exception using message = 'phone_invalid';
  end if;

  v_type := lower(btrim(coalesce(new.account_type,'')));
  if v_type not in ('particulier','professionnel') then
    raise exception using message = 'account_type_invalid';
  end if;

  new.phone := v_phone;

  select exists(
    select 1 from public.internal_accounts ia where ia.user_id=new.id
  ) into v_internal;

  if tg_op='UPDATE' then
    v_old_phone:=public.abracadeal_normalize_phone(old.phone);
    v_old_type:=lower(btrim(coalesce(old.account_type,'')));
    if v_old_phone is not distinct from v_phone
       and v_old_type is not distinct from v_type then
      return new;
    end if;
  end if;

  select pr.user_id into v_owner
  from public.phone_registry pr
  where pr.phone_normalized=v_phone
    and pr.account_type=v_type;

  if v_internal and v_owner is not null and v_owner<>new.id then
    delete from public.phone_registry where user_id=new.id;
    return new;
  end if;

  if v_owner is not null and v_owner<>new.id then
    raise exception using message='phone_already_used_for_account_type';
  end if;

  delete from public.phone_registry where user_id=new.id;

  insert into public.phone_registry(phone_normalized,account_type,user_id)
  values(v_phone,v_type,new.id)
  on conflict (phone_normalized,account_type) do update
    set user_id=excluded.user_id
    where public.phone_registry.user_id=excluded.user_id;

  return new;
end;
$function$;

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.profiles (
    id, display_name, account_type, phone, city, pro_sector
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name',''),
      nullif(split_part(btrim(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),' ',1),''),
      ''
    ),
    case when new.raw_user_meta_data->>'account_type'='professionnel' then 'professionnel' else 'particulier' end,
    nullif(new.raw_user_meta_data->>'phone',''),
    nullif(new.raw_user_meta_data->>'city',''),
    case
      when new.raw_user_meta_data->>'account_type'='professionnel'
       and new.raw_user_meta_data->>'pro_sector' in ('vehicules','immobilier','hightech','maison','mode','emploi','services','vacances')
      then new.raw_user_meta_data->>'pro_sector'
      else null
    end
  )
  on conflict (id) do update set
    display_name=excluded.display_name,
    phone=coalesce(excluded.phone,public.profiles.phone),
    city=coalesce(excluded.city,public.profiles.city),
    pro_sector=coalesce(public.profiles.pro_sector,excluded.pro_sector),
    updated_at=now();

  insert into public.vacation_user_details(user_id,first_name,last_name,phone,birth_date,city,country)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'first_name',''),nullif(new.raw_user_meta_data->>'given_name','')),
    coalesce(nullif(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'family_name','')),
    nullif(new.raw_user_meta_data->>'phone',''),
    case when coalesce(new.raw_user_meta_data->>'birth_date','') ~ '^\d{4}-\d{2}-\d{2}$' then (new.raw_user_meta_data->>'birth_date')::date else null end,
    nullif(new.raw_user_meta_data->>'city',''),
    coalesce(nullif(new.raw_user_meta_data->>'country',''),'France')
  )
  on conflict(user_id) do update set
    first_name=coalesce(excluded.first_name,public.vacation_user_details.first_name),
    last_name=coalesce(excluded.last_name,public.vacation_user_details.last_name),
    phone=coalesce(excluded.phone,public.vacation_user_details.phone),
    birth_date=coalesce(excluded.birth_date,public.vacation_user_details.birth_date),
    city=coalesce(excluded.city,public.vacation_user_details.city),
    country=coalesce(excluded.country,public.vacation_user_details.country),
    updated_at=now();

  if new.raw_user_meta_data->>'vacation_role'='host' then
    insert into public.vacation_hosts(user_id,host_type,status)
    values(new.id,case when new.raw_user_meta_data->>'account_type'='professionnel' then 'professionnel' else 'particulier' end,'pending')
    on conflict(user_id) do nothing;
  end if;
  return new;
end;
$function$;
