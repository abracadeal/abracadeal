-- Formule 100 annonces (et offre sur devis) : 5 « À la une 7 jours » + 5 remontées en tête de liste par mois.
-- Remis à 5 + 5 le 1er de chaque mois ; les jetons non utilisés sont perdus.
create table if not exists public.pro_monthly_allowance (
  user_id uuid primary key references auth.users(id) on delete cascade,
  period_start date not null,
  featured_left integer not null default 0 check (featured_left >= 0),
  bumps_left integer not null default 0 check (bumps_left >= 0),
  updated_at timestamptz not null default now()
);
alter table public.pro_monthly_allowance enable row level security;
create policy "pro_monthly_allowance_owner_read" on public.pro_monthly_allowance
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.pro_monthly_allowance_uses (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind text not null check (kind in ('featured','bump')),
  used_at timestamptz not null default now()
);
alter table public.pro_monthly_allowance_uses enable row level security;
create policy "pro_monthly_allowance_uses_owner_read" on public.pro_monthly_allowance_uses
  for select to authenticated using (user_id = auth.uid());

-- Formules qui donnent droit au quota mensuel
create or replace function private.pro_monthly_allowance_eligible(p_user uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$
  select exists(select 1 from public.pro_subscriptions s
                 where s.user_id = p_user and s.plan_code in ('pro_100','pro_250')
                   and s.status in ('trialing','active')
                   and (s.current_period_end is null or s.current_period_end > now()));
$$;

-- Crée ou remet à zéro le quota du mois en cours
create or replace function private.refresh_pro_monthly_allowance(p_user uuid)
 returns public.pro_monthly_allowance language plpgsql security definer set search_path to ''
as $$
declare r public.pro_monthly_allowance; v_month date := date_trunc('month', now())::date;
begin
  if not private.pro_monthly_allowance_eligible(p_user) then
    update public.pro_monthly_allowance set featured_left = 0, bumps_left = 0, updated_at = now()
     where user_id = p_user and (featured_left > 0 or bumps_left > 0);
    select * into r from public.pro_monthly_allowance where user_id = p_user;
    return r;
  end if;
  insert into public.pro_monthly_allowance(user_id, period_start, featured_left, bumps_left)
  values (p_user, v_month, 5, 5)
  on conflict (user_id) do update
    set period_start = excluded.period_start, featured_left = 5, bumps_left = 5, updated_at = now()
    where public.pro_monthly_allowance.period_start < excluded.period_start;
  select * into r from public.pro_monthly_allowance where user_id = p_user for update;
  return r;
end;
$$;

-- Lecture du quota par le pro connecté
create or replace function public.get_my_pro_monthly_allowance()
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare r public.pro_monthly_allowance; v_uid uuid := auth.uid();
begin
  if v_uid is null then return null; end if;
  r := private.refresh_pro_monthly_allowance(v_uid);
  return jsonb_build_object(
    'eligible', private.pro_monthly_allowance_eligible(v_uid),
    'featured_left', coalesce(r.featured_left, 0),
    'bumps_left', coalesce(r.bumps_left, 0),
    'featured_per_month', 5, 'bumps_per_month', 5, 'featured_days', 7,
    'resets_at', (date_trunc('month', now()) + interval '1 month'));
end;
$$;

-- Utiliser un « À la une 7 jours » ou une remontée sur une de ses annonces
create or replace function public.use_pro_monthly_allowance(p_listing_id uuid, p_kind text)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  v_uid uuid := auth.uid(); r public.pro_monthly_allowance;
  v_owner uuid; v_status text; v_seller text; v_featured_until timestamptz;
  v_claims text; v_expires timestamptz;
begin
  if v_uid is null then raise exception using message = 'authentication_required'; end if;
  if p_kind not in ('featured','bump') then raise exception using message = 'invalid_kind'; end if;
  if not private.pro_monthly_allowance_eligible(v_uid) then raise exception using message = 'plan_100_required'; end if;

  select owner_id, status, seller_type, featured_until into v_owner, v_status, v_seller, v_featured_until
    from public.listings where id = p_listing_id for update;
  if v_owner is null then raise exception using message = 'listing_not_found'; end if;
  if v_owner <> v_uid then raise exception using message = 'listing_not_owned'; end if;
  if v_seller <> 'professionnel' then raise exception using message = 'professional_listing_required'; end if;
  if v_status <> 'active' then raise exception using message = 'listing_not_active'; end if;
  if p_kind = 'featured' and v_featured_until is not null and v_featured_until > now() then
    raise exception using message = 'listing_already_featured';
  end if;

  r := private.refresh_pro_monthly_allowance(v_uid);
  if p_kind = 'featured' and coalesce(r.featured_left, 0) <= 0 then raise exception using message = 'no_monthly_featured_left'; end if;
  if p_kind = 'bump' and coalesce(r.bumps_left, 0) <= 0 then raise exception using message = 'no_monthly_bump_left'; end if;

  update public.pro_monthly_allowance
     set featured_left = featured_left - case when p_kind = 'featured' then 1 else 0 end,
         bumps_left    = bumps_left    - case when p_kind = 'bump' then 1 else 0 end,
         updated_at = now()
   where user_id = v_uid
  returning * into r;

  -- Champs de classement réservés au service (même méthode que consume_pro_boost / apply_daily_bumps)
  v_claims := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if p_kind = 'featured' then
    v_expires := now() + interval '7 days';
    update public.listings set featured_until = v_expires, promotion_tier = 'pro_credit_7d', updated_at = now()
     where id = p_listing_id;
  else
    update public.listings set boosted_at = now(), created_at = now(), updated_at = now()
     where id = p_listing_id;
  end if;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);

  insert into public.pro_monthly_allowance_uses(user_id, listing_id, kind) values (v_uid, p_listing_id, p_kind);

  return jsonb_build_object('ok', true, 'kind', p_kind, 'listing_id', p_listing_id, 'expires_at', v_expires,
    'featured_left', r.featured_left, 'bumps_left', r.bumps_left);
end;
$$;

revoke all on function public.get_my_pro_monthly_allowance() from public, anon;
revoke all on function public.use_pro_monthly_allowance(uuid, text) from public, anon;
grant execute on function public.get_my_pro_monthly_allowance() to authenticated;
grant execute on function public.use_pro_monthly_allowance(uuid, text) to authenticated;
revoke all on function private.refresh_pro_monthly_allowance(uuid) from public, anon, authenticated;
revoke all on function private.pro_monthly_allowance_eligible(uuid) from public, anon, authenticated;
