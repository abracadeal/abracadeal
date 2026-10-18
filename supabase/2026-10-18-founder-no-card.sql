-- 18/10/2026 — Offre Fondateurs sans moyen de paiement à l'inscription
-- Règles (décision d'Anthony du 18/10/2026) :
--  * plus de carte / SEPA demandés à l'inscription Fondateur (Pro 20 / Pro 50) ;
--  * Fondateur sans annonce en ligne pendant 60 jours (mail à J45) : offre perdue, place libérée ;
--  * compte supprimé : offre perdue, place libérée ;
--  * ancien Fondateur (même SIRET, e-mail ou téléphone) : jamais de nouvelle place, tarif public ;
--  * fin des 12 mois sans moyen de paiement : annonces mises en pause (pas supprimées),
--    réactivées dès qu'un abonnement payant démarre.

-- 1. Colonnes ---------------------------------------------------------------
alter table public.founder_enrollments
  add column if not exists no_active_listing_since timestamptz default now(),
  add column if not exists inactivity_warned_at timestamptz;

alter table public.listings
  add column if not exists billing_paused_at timestamptz,
  add column if not exists billing_paused_status text;

-- 2. Registre des anciens Fondateurs (empreintes SHA-256, pas de données en clair) -----
create table if not exists private.founder_identity_registry (
  kind text not null check (kind in ('siret','email','phone')),
  value_hash text not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (kind, value_hash)
);
alter table private.founder_identity_registry enable row level security;
revoke all on private.founder_identity_registry from public, anon, authenticated;

create or replace function private.founder_identity_hash(p_value text)
returns text language sql immutable set search_path to ''
as $$ select case when nullif(p_value,'') is null then null
             else encode(sha256(convert_to(p_value,'UTF8')),'hex') end $$;

-- Identités normalisées d'un compte : SIRET (ou SIREN), e-mail, téléphone.
create or replace function private.founder_identities(p_user uuid)
returns table(kind text, value_hash text)
language plpgsql stable security definer set search_path to ''
as $$
declare v_siret text; v_email text; v_phone text;
begin
  select coalesce(nullif(regexp_replace(coalesce(pv.siret,''),'\D','','g'),''),
                  nullif(regexp_replace(coalesce(pv.siren,''),'\D','','g'),''))
    into v_siret from public.pro_verifications pv where pv.user_id = p_user;
  select lower(trim(u.email)) into v_email from auth.users u where u.id = p_user;
  select regexp_replace(coalesce(pr.phone,''),'\D','','g') into v_phone from public.profiles pr where pr.id = p_user;
  if v_phone ~ '^33[1-9][0-9]{8}$' then v_phone := '0' || substr(v_phone,3); end if;
  if v_phone ~ '^0033[1-9][0-9]{8}$' then v_phone := '0' || substr(v_phone,5); end if;
  return query
    select x.k, private.founder_identity_hash(x.v)
      from (values ('siret',v_siret),('email',v_email),('phone',v_phone)) as x(k,v)
     where nullif(x.v,'') is not null;
end $$;

create or replace function private.founder_identity_conflict(p_user uuid)
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (
    select 1 from private.founder_identities(p_user) i
    join private.founder_identity_registry r on r.kind = i.kind and r.value_hash = i.value_hash
    where r.user_id <> p_user)
$$;

create or replace function private.register_founder_identity(p_user uuid)
returns void language sql security definer set search_path to ''
as $$
  insert into private.founder_identity_registry(kind, value_hash, user_id)
  select i.kind, i.value_hash, p_user from private.founder_identities(p_user) i
  on conflict (kind, value_hash) do nothing
$$;

-- Enregistré au moment où l'abonnement Fondateur démarre réellement
-- (pas à la simple réservation, qui peut être libérée).
create or replace function private.register_founder_identity_trg()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if new.founder_number is not null and new.status in ('trialing','active') then
    perform private.register_founder_identity(new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists register_founder_identity_trg on public.pro_subscriptions;
create trigger register_founder_identity_trg
  after insert or update of founder_number, status on public.pro_subscriptions
  for each row execute function private.register_founder_identity_trg();

-- 3. Attribution d'une place : refus si ancien Fondateur ----------------------
create or replace function public.claim_founder_slot(p_user uuid)
 returns founder_enrollments
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r public.founder_enrollments;
  next_number integer;
  verified_at timestamptz;
  siret_sector text;
  declared_sector text;
  activity text;
  cp text;
  v_cat text;
  v_reg text;
  v_block text;
begin
  select * into r from public.founder_enrollments where user_id=p_user;
  if found then
    if r.revoked_at is not null then raise exception 'founder_status_lost'; end if;
    return r;
  end if;

  if exists(select 1 from public.internal_accounts where user_id=p_user and exclude_from_counters) then
    raise exception 'internal_account_not_eligible';
  end if;

  select pv.verified_at, pv.business_sector, pr.pro_sector, pv.activity_code, pv.company_postal_code
    into verified_at, siret_sector, declared_sector, activity, cp
  from public.pro_verifications pv
  join public.profiles pr on pr.id=pv.user_id
  where pv.user_id=p_user and pv.verified_at is not null;

  if verified_at is null then raise exception 'professional_not_verified'; end if;
  if coalesce(siret_sector,'') not in ('vehicules','immobilier') then
    raise exception 'L’activité enregistrée pour ce SIRET/SIREN ne permet pas l’offre Fondateur Auto, Moto ou Immobilier.';
  end if;
  if coalesce(declared_sector,'') not in ('vehicules','immobilier') then
    raise exception 'Choisissez d’abord une activité Fondateur éligible : Véhicules (Auto & Moto) ou Immobilier.';
  end if;
  if siret_sector is distinct from declared_sector then
    raise exception 'L’activité Fondateur choisie ne correspond pas à l’activité enregistrée pour votre SIRET/SIREN. Vérifiez votre choix ou contactez Abracadeal.';
  end if;
  -- 18/10/2026 : un ancien Fondateur (même SIRET, e-mail ou téléphone) ne retrouve jamais de place.
  if private.founder_identity_conflict(p_user) then raise exception 'founder_already_used'; end if;

  perform pg_advisory_xact_lock(2026091701);
  select * into r from public.founder_enrollments where user_id=p_user;
  if found then
    if r.revoked_at is not null then raise exception 'founder_status_lost'; end if;
    return r;
  end if;

  if (select count(*) from public.founder_enrollments where revoked_at is null) >= 500 then raise exception 'founder_offer_full'; end if;
  select coalesce(max(founder_number),0)+1 into next_number from public.founder_enrollments;

  v_cat := private.founder_category(siret_sector, activity);
  v_reg := private.postal_region(cp);
  v_block := private.founder_quota_block(v_cat, v_reg);
  if v_block is not null then raise exception '%', v_block; end if;

  insert into public.founder_enrollments(user_id,founder_number,enrolled_at,free_until,discount_until,discount_percent,founder_category,founder_region,no_active_listing_since)
  values(p_user,next_number,now(),now()+interval '12 months',now()+interval '12 months',0,v_cat,v_reg,now())
  returning * into r;
  return r;
end;
$function$;

-- La page des formules n'affiche plus l'offre à un ancien Fondateur.
create or replace function public.get_my_founder_availability()
 returns json
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  pv record; pr record; fe record; s record;
  v_cat text; v_reg text; v_rp int; v_rc int; v_cp int; v_cc int; v_tot int;
  v_block text; v_enr boolean; v_mismatch boolean := false;
begin
  if v_uid is null then return null; end if;
  select * into s from private.founder_quota_settings where id = 1;
  select * into fe from public.founder_enrollments where user_id = v_uid;
  v_enr := found and fe.revoked_at is null;
  select * into pv from public.pro_verifications where user_id = v_uid;
  select pro_sector into pr from public.profiles where id = v_uid;

  v_mismatch := coalesce(pv.business_sector,'') in ('vehicules','immobilier')
                and coalesce(pr.pro_sector,'') in ('vehicules','immobilier')
                and pv.business_sector is distinct from pr.pro_sector;

  v_cat := case when v_mismatch then null else private.founder_category(pv.business_sector, pv.activity_code) end;
  v_reg := private.postal_region(pv.company_postal_code);
  select count(*) into v_tot from public.founder_enrollments where revoked_at is null;
  select places into v_rp from private.founder_quota_region where category = v_cat and region = v_reg;
  select count(*) into v_rc from public.founder_enrollments where revoked_at is null and founder_category = v_cat and founder_region = v_reg;
  v_cp := case when v_cat is null then null else (s.places ->> v_cat)::int end;
  select count(*) into v_cc from public.founder_enrollments where revoked_at is null and founder_category = v_cat;

  v_block := case
    when v_enr then null
    when fe.revoked_at is not null then 'founder_status_lost'
    when private.founder_identity_conflict(v_uid) then 'founder_already_used'
    when v_mismatch then 'founder_sector_mismatch'
    when coalesce(pv.business_sector,'') not in ('vehicules','immobilier') then 'founder_sector_not_eligible'
    when coalesce(pr.pro_sector,'') not in ('vehicules','immobilier') then 'founder_activity_choice_required'
    when v_tot >= 500 then 'founder_offer_full'
    else private.founder_quota_block(v_cat, v_reg)
  end;

  return json_build_object(
    'enrolled', v_enr,
    'founder_number', case when v_enr then fe.founder_number end,
    'category', v_cat,
    'region', v_reg,
    'region_places', v_rp,
    'region_remaining', greatest(coalesce(v_rp,0) - v_rc, 0),
    'category_places', v_cp,
    'category_remaining', greatest(coalesce(v_cp,0) - v_cc, 0),
    'total_remaining', greatest(500 - v_tot, 0),
    'released', now() >= s.release_at,
    'release_at', s.release_at,
    'open', v_enr or (v_cat is not null and v_block is null),
    'blocked_reason', v_block,
    'declared_sector', pr.pro_sector,
    'siret_sector', pv.business_sector);
end $function$;

-- 4. Pause / reprise des annonces Pro --------------------------------------
create or replace function private.pause_pro_listings_for_billing(p_user uuid)
returns integer language plpgsql security definer set search_path to ''
as $$
declare n int;
begin
  perform set_config('abraca.revision_write', txid_current()::text, true);
  update public.listings
     set billing_paused_status = status, billing_paused_at = now(), status = 'hidden'
   where owner_id = p_user and seller_type = 'professionnel' and category <> 'vacances'
     and status = 'active' and revision_of is null and billing_paused_at is null;
  get diagnostics n = row_count;
  perform set_config('abraca.revision_write', '', true);
  return n;
end $$;

-- Réactive au plus p_limit annonces (les plus récentes d'abord).
create or replace function private.resume_billing_paused_listings(p_user uuid, p_limit integer)
returns integer language plpgsql security definer set search_path to ''
as $$
declare r record; n int := 0;
begin
  for r in select id, billing_paused_status from public.listings
            where owner_id = p_user and billing_paused_at is not null and status = 'hidden'
            order by created_at desc loop
    exit when p_limit is not null and n >= p_limit;
    begin
      perform set_config('abraca.revision_write', txid_current()::text, true);
      update public.listings
         set status = coalesce(r.billing_paused_status,'active'), billing_paused_at = null, billing_paused_status = null
       where id = r.id;
      perform set_config('abraca.revision_write', '', true);
      n := n + 1;
    exception when others then
      perform set_config('abraca.revision_write', '', true);
      raise warning 'Reprise annonce % impossible : %', r.id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

create or replace function private.pro_subscription_listing_visibility()
returns trigger language plpgsql security definer set search_path to ''
as $$
declare was_live boolean; is_live boolean;
begin
  was_live := tg_op = 'UPDATE' and old.status in ('trialing','active');
  is_live := new.status in ('trialing','active');
  -- Fin d'un abonnement Fondateur (fin des 12 mois sans paiement, résiliation, perte de l'offre) : pause.
  if tg_op = 'UPDATE' and was_live and not is_live and old.founder_number is not null then
    perform private.pause_pro_listings_for_billing(new.user_id);
  end if;
  -- Un abonnement (re)démarre : reprise des annonces mises en pause, dans la limite de la formule.
  if is_live and (tg_op = 'INSERT' or not was_live or old.stripe_subscription_id is distinct from new.stripe_subscription_id) then
    perform private.resume_billing_paused_listings(new.user_id, new.listing_limit);
  end if;
  return new;
end $$;
drop trigger if exists pro_subscription_listing_visibility_trg on public.pro_subscriptions;
create trigger pro_subscription_listing_visibility_trg
  after insert or update of status, stripe_subscription_id on public.pro_subscriptions
  for each row execute function private.pro_subscription_listing_visibility();

-- Le vendeur ne peut pas republier lui-même une annonce mise en pause.
create or replace function private.guard_billing_paused_listing()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if current_setting('abraca.revision_write',true) = txid_current()::text then return new; end if;
  if coalesce(auth.role(),'') = 'service_role' or public.is_admin() then return new; end if;
  if new.billing_paused_at is distinct from old.billing_paused_at
     or new.billing_paused_status is distinct from old.billing_paused_status then
    raise exception 'Champ réservé au service';
  end if;
  if old.billing_paused_at is not null and new.status is distinct from old.status and new.status <> 'archived' then
    raise exception 'Annonce en pause : reprenez un abonnement Pro pour la remettre en ligne.';
  end if;
  return new;
end $$;
drop trigger if exists aaab_guard_billing_paused_listing on public.listings;
create trigger aaab_guard_billing_paused_listing
  before update on public.listings
  for each row execute function private.guard_billing_paused_listing();

-- 5. Mails ---------------------------------------------------------------
alter table public.pro_email_outbox drop constraint if exists pro_email_outbox_email_type_check;
alter table public.pro_email_outbox add constraint pro_email_outbox_email_type_check
  check (email_type = any (array['subscription_started','subscription_cancelled','plan_changed',
                                 'founder_inactivity_warning','founder_lost_inactivity','founder_trial_ended']));

alter table public.pro_billing_reminders drop constraint if exists pro_billing_reminders_reminder_type_check;
alter table public.pro_billing_reminders add constraint pro_billing_reminders_reminder_type_check
  check (reminder_type = any (array['j30','j7','j3']));

create or replace function private.queue_pro_subscription_email()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_plan public.pro_subscription_plans;
  v_payload jsonb;
  v_started boolean;
  v_cancelled boolean;
  v_changed boolean;
  v_reason text;
begin
  if new.stripe_subscription_id is null then return new; end if;
  if exists (select 1 from public.internal_accounts ia where ia.user_id = new.user_id and ia.exclude_from_counters) then return new; end if;

  select * into v_plan from public.pro_subscription_plans where code = new.plan_code;
  v_payload := jsonb_build_object(
    'plan_code', new.plan_code, 'plan_label', v_plan.label, 'listing_limit', new.listing_limit,
    'photo_limit', v_plan.photo_limit, 'amount_cents', v_plan.amount_cents,
    'status', new.status, 'founder_number', new.founder_number, 'free_until', new.free_until,
    'billing_starts_at', new.billing_starts_at, 'current_period_end', new.current_period_end,
    'cancel_at_period_end', new.cancel_at_period_end, 'stripe_subscription_id', new.stripe_subscription_id);

  v_started := new.status in ('trialing','active') and (
      tg_op = 'INSERT'
      or old.stripe_subscription_id is distinct from new.stripe_subscription_id
      or old.status not in ('trialing','active'));
  v_cancelled := tg_op = 'UPDATE' and (
      (new.status = 'canceled' and old.status is distinct from 'canceled')
      or (coalesce(new.cancel_at_period_end,false) and not coalesce(old.cancel_at_period_end,false)));
  v_changed := tg_op = 'UPDATE' and not v_started and new.status in ('trialing','active')
      and old.plan_code is distinct from new.plan_code
      and old.stripe_subscription_id is not distinct from new.stripe_subscription_id;

  if v_started then
    insert into public.pro_email_outbox(event_key, user_id, email_type, payload)
    values ('started:' || new.stripe_subscription_id, new.user_id, 'subscription_started', v_payload)
    on conflict (event_key) do nothing;
  end if;
  if v_cancelled then
    select revoked_reason into v_reason from public.founder_enrollments where user_id = new.user_id;
    if new.founder_number is not null and v_reason = 'inactivity' then
      null; -- le mail « offre perdue (inactivité) » est déjà parti
    elsif new.founder_number is not null and old.status = 'trialing' and new.status = 'canceled'
          and not coalesce(old.cancel_at_period_end,false)
          and new.free_until is not null and now() >= new.free_until - interval '1 day' then
      insert into public.pro_email_outbox(event_key, user_id, email_type, payload)
      values ('trial-ended:' || new.stripe_subscription_id, new.user_id, 'founder_trial_ended', v_payload)
      on conflict (event_key) do nothing;
    else
      insert into public.pro_email_outbox(event_key, user_id, email_type, payload)
      values ('cancelled:' || new.stripe_subscription_id, new.user_id, 'subscription_cancelled', v_payload)
      on conflict (event_key) do nothing;
    end if;
  end if;
  if v_changed then
    insert into public.pro_email_outbox(event_key, user_id, email_type, payload)
    values ('plan:' || new.stripe_subscription_id || ':' || new.plan_code || ':' || extract(epoch from now())::bigint, new.user_id, 'plan_changed',
            v_payload || jsonb_build_object('previous_plan_code', old.plan_code, 'previous_listing_limit', old.listing_limit))
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$function$;

-- 6. Inactivité : contrôle quotidien -------------------------------------
create or replace function private.process_founder_inactivity()
returns json language plpgsql security definer set search_path to ''
as $$
declare r record; v_warned int := 0; v_lost int := 0;
begin
  -- Fondateurs en période gratuite uniquement.
  create temporary table if not exists _fi(user_id uuid primary key, has_live boolean) on commit drop;
  truncate pg_temp._fi;
  insert into pg_temp._fi
  select fe.user_id,
         exists (select 1 from public.listings l
                  where l.owner_id = fe.user_id and l.seller_type = 'professionnel'
                    and l.category <> 'vacances' and l.status = 'active' and l.revision_of is null)
    from public.founder_enrollments fe
    join public.pro_subscriptions s on s.user_id = fe.user_id and s.status = 'trialing' and s.founder_number is not null
   where fe.revoked_at is null;

  update public.founder_enrollments fe set no_active_listing_since = null, inactivity_warned_at = null
    from pg_temp._fi _fi where _fi.user_id = fe.user_id and _fi.has_live and fe.no_active_listing_since is not null;
  update public.founder_enrollments fe set no_active_listing_since = now()
    from pg_temp._fi _fi where _fi.user_id = fe.user_id and not _fi.has_live and fe.no_active_listing_since is null;

  -- J45 : avertissement.
  for r in select fe.*, s.plan_code, s.listing_limit from public.founder_enrollments fe
             join pg_temp._fi _fi on _fi.user_id = fe.user_id and not _fi.has_live
             join public.pro_subscriptions s on s.user_id = fe.user_id
            where fe.no_active_listing_since <= now() - interval '45 days'
              and fe.no_active_listing_since > now() - interval '60 days'
              and fe.inactivity_warned_at is null loop
    insert into public.pro_email_outbox(event_key, user_id, email_type, payload)
    values ('inactive-warn:' || r.user_id || ':' || extract(epoch from r.no_active_listing_since)::bigint, r.user_id,
            'founder_inactivity_warning',
            jsonb_build_object('founder_number', r.founder_number, 'deadline', r.no_active_listing_since + interval '60 days',
                               'plan_code', r.plan_code, 'listing_limit', r.listing_limit))
    on conflict (event_key) do nothing;
    update public.founder_enrollments set inactivity_warned_at = now() where user_id = r.user_id;
    v_warned := v_warned + 1;
  end loop;

  -- J60 : offre perdue, place libérée (l'abonnement Stripe est arrêté par sweep-cancelled-pro-trials).
  for r in update public.founder_enrollments fe
              set revoked_at = now(), revoked_reason = 'inactivity'
             from pg_temp._fi _fi
            where _fi.user_id = fe.user_id and not _fi.has_live
              and fe.revoked_at is null
              and fe.no_active_listing_since <= now() - interval '60 days'
           returning fe.user_id, fe.founder_number loop
    insert into public.pro_email_outbox(event_key, user_id, email_type, payload)
    values ('inactive-lost:' || r.user_id, r.user_id, 'founder_lost_inactivity',
            jsonb_build_object('founder_number', r.founder_number))
    on conflict (event_key) do nothing;
    v_lost := v_lost + 1;
  end loop;

  return json_build_object('checked', (select count(*) from pg_temp._fi), 'warned', v_warned, 'lost', v_lost);
end $$;

select cron.unschedule('abracadeal-founder-inactivity') where exists (select 1 from cron.job where jobname = 'abracadeal-founder-inactivity');
select cron.schedule('abracadeal-founder-inactivity', '5 7 * * *', 'select private.process_founder_inactivity();');
