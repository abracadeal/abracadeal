-- 28/10/2026 (Claude) : activation automatique des sites donnés à l'inscription (demande d'Anthony).
-- Appliqué en migration « site_import_auto_review ».
-- À chaque demande (claim_signup_site_import / request_site_import), private.kick_site_auto_review appelle
-- pro-stock-sync (action auto_review, jeton cron). Le robot lit le site : lecture complète, au moins 80 % d'annonces
-- complètes (titre, prix, ville, photo) => flux activé + synchronisé (les annonces passent toujours par la modération).
-- Sinon le flux reste « en attente » avec la raison dans last_error, pour l'admin. Le cron (toutes les 15 min) rattrape
-- une demande en attente jamais essayée ou essayée il y a plus de 24 h.
create or replace function private.kick_site_auto_review(p_feed_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='abracadeal_project_url') || '/functions/v1/pro-stock-sync',
    body := jsonb_build_object('action','auto_review','feed_id',p_feed_id),
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='abracadeal_stock_cron_token')),
    timeout_milliseconds := 150000);
exception when others then null;
end $$;
revoke all on function private.kick_site_auto_review(uuid) from public, anon, authenticated;
-- claim_signup_site_import() et request_site_import() : identiques à avant + « perform private.kick_site_auto_review(v_id); »
-- juste après private.upsert_site_import_request (définitions complètes dans la migration).
