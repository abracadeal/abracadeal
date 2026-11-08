-- 08/11/2026 : comptes internes pré-autorisés par e-mail.
-- Un compte interne (internal_accounts) peut réutiliser un numéro déjà pris
-- (voir le contrôle du numéro dans 2026-10-18-social-login.sql). Mais à
-- l'inscription, le user_id n'existe pas encore : on ne pouvait pas le
-- déclarer interne avant. On pré-autorise donc par e-mail ; à la création du
-- compte, handle_new_user le déclare interne AVANT de créer le profil.

create table if not exists public.internal_account_invites (
  email text primary key,
  exclude_from_counters boolean not null default true,
  free_pro boolean not null default false,
  free_vacation_host boolean not null default false,
  note text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.internal_account_invites enable row level security;
-- aucune policy : lecture/écriture réservées au service (admin SQL).

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_inv public.internal_account_invites%rowtype;
begin
  select * into v_inv from public.internal_account_invites
  where email = lower(btrim(coalesce(new.email,''))) and used_at is null;
  if found then
    insert into public.internal_accounts(user_id,exclude_from_counters,free_pro,free_vacation_host,note)
    values(new.id,v_inv.exclude_from_counters,v_inv.free_pro,v_inv.free_vacation_host,v_inv.note)
    on conflict (user_id) do nothing;
    update public.internal_account_invites set used_at=now() where email=v_inv.email;
  end if;

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
    case when coalesce(new.raw_user_meta_data->>'birth_date','') ~ '^\\d{4}-\\d{2}-\\d{2}$' then (new.raw_user_meta_data->>'birth_date')::date else null end,
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

insert into public.internal_account_invites(email,exclude_from_counters,free_pro,note)
values('contact@mycreativesite.fr',true,true,'Mycreativesite — compte interne Pro gratuit — Services aux entreprises')
on conflict (email) do nothing;

-- Pré-contrôle du numéro côté site (avant inscription) : l'e-mail pré-autorisé passe.
create or replace function public.abracadeal_phone_available(p_phone text, p_account_type text, p_email text)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select case
    when public.abracadeal_normalize_phone(p_phone) is null then false
    when exists (select 1 from public.internal_account_invites i
                 where i.email = lower(btrim(coalesce(p_email,''))) and i.used_at is null) then true
    else public.abracadeal_phone_available(p_phone, p_account_type)
  end;
$function$;
grant execute on function public.abracadeal_phone_available(text,text,text) to anon, authenticated;
