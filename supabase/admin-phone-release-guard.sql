CREATE OR REPLACE FUNCTION public.abracadeal_enforce_profile_phone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_phone text;
  v_type text;
  v_owner uuid;
  v_internal boolean := false;
  v_old_phone text;
  v_old_type text;
begin
  if tg_op='UPDATE' and new.phone is null and public.is_admin()
     and current_setting('abraca.admin_phone_release',true)=old.id::text||':'||public.abracadeal_normalize_phone(old.phone) then
    return new;
  end if;
  if new.phone is null or btrim(new.phone) = '' then
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

  -- Un compte interne peut partager une réservation déjà détenue par un autre
  -- compte du propriétaire, sans écraser cette réservation.
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
$function$

