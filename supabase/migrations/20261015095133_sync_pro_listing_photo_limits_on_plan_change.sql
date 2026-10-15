-- Quand un pro change de pack (ou active son abonnement), ses annonces en cours prennent la limite photo du nouveau pack.
create or replace function private.sync_pro_listing_photo_limits()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if tg_op='UPDATE'
     and new.plan_code is not distinct from old.plan_code
     and new.status is not distinct from old.status
     and new.current_period_end is not distinct from old.current_period_end then
    return new;
  end if;
  -- Écriture interne : ne déclenche ni re-modération ni contrôle « champ réservé au service ».
  perform set_config('abraca.revision_write', txid_current()::text, true);
  update public.listings l
     set photo_limit = public.abraca_founder_photo_cap(l.owner_id, l.category, l.seller_type, l.photo_limit)
   where l.owner_id = new.user_id
     and l.seller_type = 'professionnel'
     and l.category <> 'vacances'
     and l.status not in ('archived','rejected')
     and l.photo_limit is distinct from public.abraca_founder_photo_cap(l.owner_id, l.category, l.seller_type, l.photo_limit);
  perform set_config('abraca.revision_write', '', true);
  return new;
end;
$function$;

drop trigger if exists sync_pro_listing_photo_limits_trg on public.pro_subscriptions;
create trigger sync_pro_listing_photo_limits_trg
after insert or update of plan_code, status, current_period_end on public.pro_subscriptions
for each row execute function private.sync_pro_listing_photo_limits();
