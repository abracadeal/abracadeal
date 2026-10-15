create or replace function public.get_founder_offer_counter()
 returns table(total_places integer, claimed_places integer, remaining_places integer)
 language sql stable security definer set search_path to 'public'
as $function$
 select 500::integer, count(*)::integer, greatest(500-count(*),0)::integer
 from public.founder_enrollments fe
 where fe.revoked_at is null
   and exists (select 1 from public.pro_subscriptions s where s.user_id = fe.user_id and s.status in ('trialing','active'))
   and not exists (select 1 from public.internal_accounts ia where ia.user_id = fe.user_id and ia.exclude_from_counters)
$function$;

create or replace function public.get_founder_offer_status()
 returns table(total_places integer, claimed_places integer, remaining_places integer)
 language sql stable security definer set search_path to 'public'
as $function$
 select 500::integer, count(*)::integer, greatest(500-count(*),0)::integer
 from public.founder_enrollments fe
 where fe.revoked_at is null
   and exists (select 1 from public.pro_subscriptions s where s.user_id = fe.user_id and s.status in ('trialing','active'))
   and not exists (select 1 from public.internal_accounts ia where ia.user_id = fe.user_id and ia.exclude_from_counters)
$function$;
