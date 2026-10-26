-- 26/10/2026 (Claude) : demande d'Anthony — tout pro inscrit depuis 3 jours sans aucune annonce reçoit
-- automatiquement (une seule fois) le message « Voulez-vous qu'on mette vos annonces en ligne pour vous ? ».
-- Les Fondateurs ont en plus la phrase « jusqu'à 50 annonces gratuitement ». Envoi par process-pro-transactional-emails (custom_message).
create or replace function public.queue_pro_import_help()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare n int;
begin
  insert into public.pro_email_outbox (event_key, user_id, email_type, payload, available_at)
  select 'import-help-' || u.id, u.id, 'custom_message',
    jsonb_build_object(
      'subject', 'Voulez-vous qu’on mette vos annonces en ligne pour vous ?',
      'title', 'Bonjour,',
      'paras', jsonb_build_array(
        'Merci pour votre inscription sur Abracadeal !' ||
          case when s.founder_number is not null then ' En tant que Fondateur, vous pouvez publier <strong>jusqu’à 50 annonces gratuitement</strong>.' else '' end,
        'Voulez-vous qu’on mette vos annonces en ligne pour vous ? Envoyez-nous simplement l’adresse de votre site (ou de vos annonces) en répondant à ce mail : avec votre accord, on s’occupe de tout, vous n’aurez plus qu’à les tenir à jour.')),
    now()
  from auth.users u
  join public.profiles p on p.id = u.id
  left join public.pro_subscriptions s on s.user_id = u.id
  where p.account_type = 'professionnel'
    and coalesce(p.is_admin, false) = false
    and u.created_at < now() - interval '3 days'
    and u.created_at > now() - interval '60 days'
    and not exists (select 1 from public.listings l where l.owner_id = u.id)
    and not exists (select 1 from public.pro_email_outbox o where o.user_id = u.id and o.event_key ilike '%import%')
  on conflict (event_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $function$;
revoke all on function public.queue_pro_import_help() from public, anon, authenticated;

-- Tous les jours du lundi au samedi à 8 h UTC (9 h en hiver, 10 h en été à Paris).
select cron.unschedule('abracadeal-pro-import-help') where exists (select 1 from cron.job where jobname = 'abracadeal-pro-import-help');
select cron.schedule('abracadeal-pro-import-help', '0 8 * * 1-6', 'select public.queue_pro_import_help();');
