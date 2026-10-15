create or replace function private.release_unpaid_founder_reservations()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare v_released int := 0;
begin
  update public.pro_subscription_orders o
     set status = 'cancelled', updated_at = now()
   where o.status = 'pending'
     and o.updated_at < now() - interval '2 hours'
     and not exists (select 1 from public.pro_subscriptions s where s.user_id = o.user_id);
  delete from public.founder_enrollments fe
   where fe.revoked_at is null
     and fe.enrolled_at < now() - interval '2 hours'
     and not exists (select 1 from public.pro_subscriptions s where s.user_id = fe.user_id)
     and not exists (select 1 from public.pro_subscription_orders o
                      where o.user_id = fe.user_id and o.status = 'pending');
  get diagnostics v_released = row_count;
  return v_released;
end;
$function$;

select cron.schedule('abracadeal-release-unpaid-founder-slots', '*/15 * * * *',
  'select private.release_unpaid_founder_reservations();');

select private.release_unpaid_founder_reservations();
