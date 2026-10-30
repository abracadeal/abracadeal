-- 30/10/2026 — Claude : lecture automatique des rebonds (prospect-mailer action "bounces")
-- Liste des boîtes d'envoi actives (lue par la fonction avec la clé service).
create or replace function public.prospect_mailer_mailbox_list()
 returns json language sql security definer set search_path to ''
as $$ select coalesce(json_agg(email order by sort), '[]'::json) from private.prospect_mailboxes where enabled and vault_secret_id is not null $$;
revoke all on function public.prospect_mailer_mailbox_list() from public, anon, authenticated;
grant execute on function public.prospect_mailer_mailbox_list() to service_role;
