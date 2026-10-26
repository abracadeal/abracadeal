-- 26/10/2026 (Claude) : type « custom_message » dans pro_email_outbox (process-pro-transactional-emails v5)
-- + message d'aide programmé pour Auto Cévennes (Fondateur n°1, 0 annonce) le 27/10/2026 à 9 h (Paris).
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.pro_email_outbox'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%email_type%';
  execute format('alter table public.pro_email_outbox drop constraint %I', c);
end $$;
alter table public.pro_email_outbox add constraint pro_email_outbox_email_type_check check (email_type = any (array[
  'subscription_started','subscription_cancelled','plan_changed','founder_inactivity_warning','founder_lost_inactivity',
  'founder_trial_ended','founder_onboarding','custom_message']));

insert into public.pro_email_outbox (event_key, user_id, email_type, payload, available_at)
values ('custom-auto-cevennes-aide-import-20261027', '5d62b961-2766-4ebb-97ee-7f1f453f4044', 'custom_message',
  jsonb_build_object(
    'subject', 'Voulez-vous qu’on mette vos annonces en ligne pour vous ?',
    'title', 'Bonjour,',
    'paras', jsonb_build_array(
      'Merci pour votre inscription sur Abracadeal ! En tant que Fondateur, vous pouvez publier <strong>jusqu’à 50 annonces gratuitement</strong>.',
      'Voulez-vous qu’on mette vos annonces en ligne pour vous ? Envoyez-nous simplement l’adresse de votre site (ou de vos annonces) en répondant à ce mail : avec votre accord, on s’occupe de tout, vous n’aurez plus qu’à les tenir à jour.')),
  '2026-10-27 08:00:00+00');
