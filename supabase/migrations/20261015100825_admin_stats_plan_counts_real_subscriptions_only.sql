-- Tableau de bord admin : les compteurs « Plan 20/50/100/200 » ne comptent plus les paiements commencés et jamais validés,
-- uniquement les formules réellement en cours (offertes ou payantes).
create or replace function public.get_admin_dashboard_stats()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_total integer; v_pro integer; v_private integer; v_travelers integer; v_hosts integer;
  v_plan20 integer; v_plan50 integer; v_plan100 integer; v_plan250 integer; v_plan200 integer;
  v_trialing integer; v_active integer; v_pending integer; v_mrr integer;
begin
  if not public.abracadeal_current_user_is_admin() then
    raise exception using message='admin_required';
  end if;

  select count(*)::int into v_total from public.profiles p
  where not exists (select 1 from public.internal_accounts ia where ia.user_id=p.id and ia.exclude_from_counters);

  select count(*)::int into v_pro from public.profiles p
  where p.account_type='professionnel'
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=p.id and ia.exclude_from_counters);

  select count(*)::int into v_private from public.profiles p
  where p.account_type<>'professionnel'
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=p.id and ia.exclude_from_counters);

  select count(*)::int into v_travelers from auth.users u
  where u.raw_user_meta_data->>'vacation_role'='traveler'
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=u.id and ia.exclude_from_counters);

  select count(*)::int into v_hosts from public.vacation_hosts h
  where coalesce(h.status,'') in ('active','pending')
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=h.user_id and ia.exclude_from_counters);

  select count(*)::int into v_trialing from public.pro_subscriptions s
  where s.status='trialing'
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=s.user_id and ia.exclude_from_counters);

  select count(*)::int into v_active from public.pro_subscriptions s
  where s.status='active'
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=s.user_id and ia.exclude_from_counters);

  select
    count(*) filter (where s.plan_code='pro_20')::int,
    count(*) filter (where s.plan_code='pro_50')::int,
    count(*) filter (where s.plan_code='pro_100')::int,
    count(*) filter (where s.plan_code='pro_250')::int,
    count(*) filter (where s.plan_code='pro_200')::int
  into v_plan20,v_plan50,v_plan100,v_plan250,v_plan200
  from public.pro_subscriptions s
  where s.status in ('trialing','active')
    and (s.current_period_end is null or s.current_period_end>now())
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=s.user_id and ia.exclude_from_counters);

  select count(*)::int into v_pending from public.profiles p
  where p.account_type='professionnel'
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=p.id and ia.exclude_from_counters)
    and not exists (select 1 from public.pro_subscriptions s where s.user_id=p.id and s.status in ('trialing','active'));

  select coalesce(sum(pl.amount_cents),0)::int into v_mrr
  from public.pro_subscriptions s
  join public.pro_subscription_plans pl on pl.code=s.plan_code
  where s.status in ('trialing','active')
    and not exists (select 1 from public.internal_accounts ia where ia.user_id=s.user_id and ia.exclude_from_counters);

  return jsonb_build_object(
    'total_accounts',v_total,
    'professionals',v_pro,
    'private_accounts',v_private,
    'vacation_travelers',v_travelers,
    'vacation_hosts',v_hosts,
    'plan_counts',jsonb_build_object(
      'pro_20',coalesce(v_plan20,0),
      'pro_50',coalesce(v_plan50,0),
      'pro_100',coalesce(v_plan100,0),
      'pro_200',coalesce(v_plan200,0),
      'pro_250',coalesce(v_plan250,0)
    ),
    'trialing_pros',v_trialing,
    'active_paid_pros',v_active,
    'pros_to_finalize',v_pending,
    'theoretical_mrr_cents',v_mrr
  );
end;
$function$;
