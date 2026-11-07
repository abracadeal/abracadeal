-- 07/11/2026 — Claude — Mail à Anthony à chaque accord « Je publie » (demande : « faudrait que je reçoive un mail quand une bonne nouvelle comme ça arrive »).
-- Fonction edge prospect-accept-notify, appelée toutes les 5 min (tous les jours) seulement s'il reste un accord non signalé.
alter table private.prospect_acceptances add column if not exists notified_at timestamptz;
-- Accord déjà connu d'Ofim (04/11) : pas de mail. Celui de Sophie Folley (07/11) part comme premier essai réel.
update private.prospect_acceptances set notified_at = now() where notified_at is null and accepted_at < '2026-11-07';

create or replace function public.prospect_accepts_to_notify()
returns table(id bigint, company text, category text, source_url text, siret text, email text, siren_matches boolean, accepted_at timestamptz, sent_from text)
language sql security definer set search_path = '' as $$
  select a.id, p.company, p.category, p.source_url, a.siret, a.email, a.siren_matches, a.accepted_at, p.sent_from
    from private.prospect_acceptances a join public.prospection_prospects p on p.id = a.prospect_id
   where a.notified_at is null order by a.accepted_at limit 20
$$;
create or replace function public.prospect_accept_mark_notified(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  update private.prospect_acceptances set notified_at = now() where id = p_id and notified_at is null
$$;
revoke all on function public.prospect_accepts_to_notify() from public, anon, authenticated;
revoke all on function public.prospect_accept_mark_notified(bigint) from public, anon, authenticated;
grant execute on function public.prospect_accepts_to_notify() to service_role;
grant execute on function public.prospect_accept_mark_notified(bigint) to service_role;

select cron.schedule('abracadeal-prospect-accept-notify', '*/5 * * * *', $c$
  select net.http_post(url:='https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/prospect-accept-notify', body:='{}'::jsonb,
    headers:=jsonb_build_object('Content-Type','application/json','x-internal-key',(select secret_value from public.integration_secrets where name='prospect_crawler_internal')),
    timeout_milliseconds:=60000)
  where exists (select 1 from private.prospect_acceptances where notified_at is null)
$c$);
