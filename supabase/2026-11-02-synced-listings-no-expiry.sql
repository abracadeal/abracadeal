-- 02/11/2026 (Claude) : appliqué via la migration « synced_listings_no_60_day_expiry ».
-- Les annonces reprises du site d'un pro (source feed:<id>) ne sont plus archivées au bout de 60 jours
-- tant que la synchro de leur site a réussi depuis moins de 7 jours ; elles disparaissent quand le véhicule
-- quitte le site du pro. Synchro en panne > 7 jours : la règle normale des 60 jours revient.
create or replace function private.expire_private_listings()
 returns integer
 language plpgsql
 set search_path to ''
as $function$
declare n integer;
begin
  update public.listings l set status='archived',archive_reason='expired'
  where l.seller_type in ('particulier','professionnel') and l.category<>'vacances' and l.revision_of is null
    and l.status='active' and l.expires_at<=now()
    and not (
      l.source like 'feed:%'
      and exists (
        select 1 from public.pro_stock_feeds f
        where f.id::text = substring(l.source from 6)
          and f.owner_id = l.owner_id
          and f.active
          and f.last_success_at > now() - interval '7 days'
      )
    );
  get diagnostics n=row_count;
  return n;
end $function$;
