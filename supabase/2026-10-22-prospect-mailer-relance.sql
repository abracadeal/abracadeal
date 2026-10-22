-- 22/10/2026 — Relance du mailer de prospection seul (demande d'Anthony)
-- Les robots de recherche (prospect-qualifier, prospect-sirene-import, prospect-email-crawler,
-- prospect-domain-guess, promote_annuaire_leads) restent arrêtés : ils ont saturé la base le 21/10.
-- Envois : lundi → samedi, 9 h → 18 h (Paris), 2 boîtes × 25/jour (logique dans private.prospect_mailer_claim).
-- Fréquence passée de */2 à */5 pour alléger la base.

update private.prospect_mailer_settings set sending_enabled = true, updated_at = now() where id = 1;

select cron.schedule('abracadeal-prospect-mailer', '*/5 * * * *',
 $c$select net.http_post(url:='https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/prospect-mailer', body:='{"action":"run"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-internal-key',(select secret_value from public.integration_secrets where name='prospect_crawler_internal')), timeout_milliseconds:=120000)$c$);
