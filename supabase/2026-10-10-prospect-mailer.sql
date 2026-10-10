-- Envoi automatique de la prospection Abracadeal depuis les boîtes OVH (Zimbra) — 10/10/2026
-- Verrouillé par défaut : rien ne part tant qu'Anthony n'a pas donné le « feu vert » depuis le CRM.

create table if not exists private.prospect_mailboxes (
  email text primary key,
  display_name text not null default 'Abracadeal Pro',
  smtp_host text not null default 'smtp.mail.ovh.net',
  smtp_port int not null default 465,
  daily_limit int not null default 50 check (daily_limit between 1 and 300),
  enabled boolean not null default true,
  vault_secret_id uuid,
  verified_at timestamptz,
  last_error text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into private.prospect_mailboxes(email, sort) values
  ('contact@abracadeal.fr', 1), ('partenaires@abracadeal.com', 2)
on conflict (email) do nothing;

create table if not exists private.prospect_mailer_settings (
  id int primary key default 1 check (id = 1),
  sending_enabled boolean not null default false,
  subject text not null,
  body text not null,
  window_start int not null default 9,
  window_end int not null default 18,
  weekdays_only boolean not null default true,
  enabled_at timestamptz,
  enabled_by uuid,
  updated_at timestamptz not null default now()
);
insert into private.prospect_mailer_settings(id, subject, body) values (1,
'Marre de payer trop cher vos annonces, {{societe}} ?',
$b$Bonjour,

Je me permets de vous contacter au sujet de {{societe}}.
Marre de payer trop cher ? Faites d’Abracadeal votre partenaire officiel : l’associé qui fait du bien à vos comptes.
Abracadeal est une nouvelle plateforme de petites annonces ouverte aux particuliers comme aux professionnels.

Pour les petits garages qui souhaitent tester avec une dizaine ou une vingtaine de véhicules, les 500 premiers professionnels inscrits bénéficient de jusqu’à 20 annonces actives gratuites pendant 12 mois, avec 15 photos par annonce.

Vos annonces peuvent être importées directement par flux, CSV ou XML, sans ressaisie.

Sans engagement de durée : pas de contrat de 12 mois. Vous restez parce que ça marche, pas parce que vous êtes engagé, et vous résiliez en un clic depuis votre espace.

Les tarifs détaillés sont visibles dès la création de votre compte Pro.

Découvrir l’offre Fondateurs :
https://abracadeal.fr/pro-fondateur.html

Les places Fondateurs restantes sont affichées directement sur le site. Si vous avez une question, vous pouvez simplement répondre à ce mail.

Bien cordialement,
Service Pros Abracadeal
{{expediteur}}$b$)
on conflict (id) do nothing;

insert into public.integration_secrets(name, secret_value)
values ('prospect_unsub_hmac', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

-- ---------- Fonctions admin (appelées depuis le CRM, compte admin connecté) ----------

create or replace function public.admin_prospect_mailer_state()
returns json language plpgsql security definer set search_path = '' as $$
declare v json; v_day timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  select json_build_object(
    'settings', (select json_build_object('sending_enabled', s.sending_enabled, 'subject', s.subject, 'body', s.body,
                  'window_start', s.window_start, 'window_end', s.window_end, 'weekdays_only', s.weekdays_only,
                  'enabled_at', s.enabled_at) from private.prospect_mailer_settings s where s.id = 1),
    'mailboxes', (select coalesce(json_agg(json_build_object('email', m.email, 'display_name', m.display_name,
                  'daily_limit', m.daily_limit, 'enabled', m.enabled, 'has_password', m.vault_secret_id is not null,
                  'verified_at', m.verified_at, 'last_error', m.last_error,
                  'sent_today', (select count(*) from public.prospection_prospects p where p.sent_from = m.email and p.sent_at >= v_day))
                  order by m.sort), '[]'::json) from private.prospect_mailboxes m),
    'counts', (select json_object_agg(status, n) from (select status, count(*) n from public.prospection_prospects group by 1) c),
    'cron', exists(select 1 from cron.job where jobname = 'abracadeal-prospect-mailer')
  ) into v;
  return v;
end $$;

create or replace function public.admin_prospect_mailbox_save(p_email text, p_display_name text, p_daily_limit int, p_enabled boolean, p_password text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  select * into m from private.prospect_mailboxes where email = lower(trim(p_email));
  if not found then raise exception 'Adresse d''envoi inconnue'; end if;
  update private.prospect_mailboxes set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    daily_limit = greatest(1, least(300, coalesce(p_daily_limit, daily_limit))),
    enabled = coalesce(p_enabled, enabled), updated_at = now()
  where email = m.email;
  if p_password is not null and length(p_password) > 0 then
    if m.vault_secret_id is null then
      update private.prospect_mailboxes set vault_secret_id = vault.create_secret(p_password, 'smtp:' || m.email, 'Mot de passe SMTP prospection'),
        verified_at = null, last_error = null where email = m.email;
    else
      perform vault.update_secret(m.vault_secret_id, p_password);
      update private.prospect_mailboxes set verified_at = null, last_error = null where email = m.email;
    end if;
  end if;
end $$;

create or replace function public.admin_prospect_template_save(p_subject text, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  if coalesce(trim(p_subject), '') = '' or coalesce(trim(p_body), '') = '' then raise exception 'Objet et message obligatoires'; end if;
  update private.prospect_mailer_settings set subject = p_subject, body = p_body, updated_at = now() where id = 1;
end $$;

-- Feu vert / arrêt. Le feu vert exige de taper « FEU VERT » et au moins une adresse vérifiée.
create or replace function public.admin_prospect_go(p_enable boolean, p_confirm text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare v_ready int := 0;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  if p_enable then
    if upper(trim(coalesce(p_confirm, ''))) <> 'FEU VERT' then raise exception 'Confirmation incorrecte : tapez FEU VERT'; end if;
    if not exists (select 1 from private.prospect_mailboxes where enabled and vault_secret_id is not null and verified_at is not null) then
      raise exception 'Aucune adresse d''envoi vérifiée : vérifiez d''abord la connexion d''au moins une boîte.';
    end if;
    update public.prospection_prospects set status = 'ready', updated_at = now() where status = 'paused';
    get diagnostics v_ready = row_count;
    update private.prospect_mailer_settings set sending_enabled = true, enabled_at = now(), enabled_by = auth.uid(), updated_at = now() where id = 1;
    if not exists (select 1 from cron.job where jobname = 'abracadeal-prospect-mailer') then
      perform cron.schedule('abracadeal-prospect-mailer', '*/2 * * * *',
        $c$select net.http_post(url:='https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/prospect-mailer', body:='{"action":"run"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-internal-key',(select secret_value from public.integration_secrets where name='prospect_crawler_internal')), timeout_milliseconds:=120000)$c$);
    end if;
  else
    update private.prospect_mailer_settings set sending_enabled = false, updated_at = now() where id = 1;
    perform cron.unschedule(jobid) from cron.job where jobname = 'abracadeal-prospect-mailer';
  end if;
  return json_build_object('enabled', p_enable, 'released', v_ready);
end $$;

revoke all on function public.admin_prospect_mailer_state() from public, anon;
revoke all on function public.admin_prospect_mailbox_save(text, text, int, boolean, text) from public, anon;
revoke all on function public.admin_prospect_template_save(text, text) from public, anon;
revoke all on function public.admin_prospect_go(boolean, text) from public, anon;
grant execute on function public.admin_prospect_mailer_state() to authenticated;
grant execute on function public.admin_prospect_mailbox_save(text, text, int, boolean, text) to authenticated;
grant execute on function public.admin_prospect_template_save(text, text) to authenticated;
grant execute on function public.admin_prospect_go(boolean, text) to authenticated;

-- ---------- Fonctions réservées à la fonction serveur prospect-mailer (service_role) ----------

create or replace function public.prospect_mailer_creds(p_email text)
returns json language sql security definer set search_path = '' as $$
  select json_build_object('email', m.email, 'display_name', m.display_name, 'host', m.smtp_host, 'port', m.smtp_port,
    'password', (select d.decrypted_secret from vault.decrypted_secrets d where d.id = m.vault_secret_id))
  from private.prospect_mailboxes m where m.email = lower(trim(p_email));
$$;

create or replace function public.prospect_mailer_verified(p_email text, p_ok boolean, p_error text)
returns void language sql security definer set search_path = '' as $$
  update private.prospect_mailboxes set verified_at = case when p_ok then now() else null end,
    last_error = case when p_ok then null else left(p_error, 500) end, updated_at = now()
  where email = lower(trim(p_email));
$$;

create or replace function public.prospect_mailer_template()
returns json language sql security definer set search_path = '' as $$
  select json_build_object('subject', subject, 'body', body) from private.prospect_mailer_settings where id = 1;
$$;

-- Réserve au plus un prospect par boîte et par passage, en étalant les envois sur la plage horaire.
create or replace function public.prospect_mailer_claim()
returns json language plpgsql security definer set search_path = '' as $$
declare s record; m record; p record; out json[] := '{}';
  v_local timestamp := now() at time zone 'Europe/Paris';
  v_day timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
  v_frac numeric; v_quota int; v_sent int;
begin
  select * into s from private.prospect_mailer_settings where id = 1;
  if not s.sending_enabled then return '[]'::json; end if;
  if s.weekdays_only and extract(isodow from v_local) > 5 then return '[]'::json; end if;
  if extract(hour from v_local) < s.window_start or extract(hour from v_local) >= s.window_end then return '[]'::json; end if;
  -- envois restés bloqués : on les remet dans la file
  update public.prospection_prospects set status = 'ready', updated_at = now()
   where status = 'sending' and updated_at < now() - interval '15 minutes';
  v_frac := (extract(epoch from v_local - date_trunc('day', v_local)) / 3600.0 - s.window_start) / greatest(1, s.window_end - s.window_start);
  for m in select * from private.prospect_mailboxes where enabled and vault_secret_id is not null and verified_at is not null order by sort loop
    v_quota := least(m.daily_limit, ceil(m.daily_limit * v_frac)::int + 1);
    select count(*) into v_sent from public.prospection_prospects where sent_from = m.email and (sent_at >= v_day or status = 'sending');
    continue when v_sent >= v_quota;
    select pp.* into p from public.prospection_prospects pp
     where pp.status = 'ready'
       and not exists (select 1 from public.email_opt_outs o where lower(o.email) = pp.email)
     order by pp.created_at limit 1 for update skip locked;
    exit when not found;
    update public.prospection_prospects set status = 'sending', sent_from = m.email, updated_at = now() where id = p.id;
    out := out || json_build_object('id', p.id, 'email', p.email, 'company', p.company, 'mailbox', m.email);
  end loop;
  return coalesce(array_to_json(out), '[]'::json);
end $$;

create or replace function public.prospect_mailer_done(p_id uuid, p_ok boolean, p_error text, p_message_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_from text;
begin
  update public.prospection_prospects set
    status = case when p_ok then 'sent' else 'error' end,
    sent_at = case when p_ok then now() else sent_at end,
    gmail_message_id = case when p_ok then p_message_id else gmail_message_id end,
    last_error = case when p_ok then null else left(p_error, 1000) end,
    updated_at = now()
  where id = p_id returning sent_from into v_from;
  insert into public.prospection_logs(prospect_id, action, detail)
  values (p_id, case when p_ok then 'sent' else 'error' end, left(coalesce(v_from, '') || ' ' || coalesce(case when p_ok then p_message_id else p_error end, ''), 2000));
end $$;

create or replace function public.prospect_unsubscribe(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  update public.prospection_prospects set status = 'opted_out', opted_out_at = coalesce(opted_out_at, now()), updated_at = now()
   where id = p_id returning email into v_email;
  if v_email is null then return null; end if;
  insert into public.prospection_logs(prospect_id, action, detail) values (p_id, 'opt_out', 'Désinscription par le lien du mail');
  return v_email;
end $$;

revoke all on function public.prospect_mailer_creds(text) from public, anon, authenticated;
revoke all on function public.prospect_mailer_verified(text, boolean, text) from public, anon, authenticated;
revoke all on function public.prospect_mailer_template() from public, anon, authenticated;
revoke all on function public.prospect_mailer_claim() from public, anon, authenticated;
revoke all on function public.prospect_mailer_done(uuid, boolean, text, text) from public, anon, authenticated;
revoke all on function public.prospect_unsubscribe(uuid) from public, anon, authenticated;
grant execute on function public.prospect_mailer_creds(text) to service_role;
grant execute on function public.prospect_mailer_verified(text, boolean, text) to service_role;
grant execute on function public.prospect_mailer_template() to service_role;
grant execute on function public.prospect_mailer_claim() to service_role;
grant execute on function public.prospect_mailer_done(uuid, boolean, text, text) to service_role;
grant execute on function public.prospect_unsubscribe(uuid) to service_role;
