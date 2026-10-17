-- Suivi des clics de la prospection Abracadeal — 17/10/2026
-- Chaque mail de prospection contient un lien personnel : https://abracadeal.fr/pro-fondateur.html?r=<code>
-- La page enregistre le clic (pas de pixel d'ouverture). Le code est gardé dans le navigateur du pro
-- et ajouté à son compte s'il s'inscrit, pour savoir quels prospects sont devenus clients.

alter table public.prospection_prospects
  add column if not exists ref_code text,
  add column if not exists click_count int not null default 0,
  add column if not exists first_clicked_at timestamptz,
  add column if not exists last_clicked_at timestamptz;
create unique index if not exists prospection_prospects_ref_code_key
  on public.prospection_prospects(ref_code) where ref_code is not null;

-- Code court (8 caractères, sans 0/o/1/l/i ambigus), créé au premier envoi puis réutilisé (relance comprise).
create or replace function public.prospect_ref_code(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v text; i int;
begin
  select ref_code into v from public.prospection_prospects where id = p_id;
  if v is not null then return v; end if;
  for i in 1..10 loop
    select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (get_byte(x.b, k) % 31) + 1, 1), '' order by k)
      into v from (select extensions.gen_random_bytes(8) b) x, generate_series(0, 7) k;
    begin
      update public.prospection_prospects set ref_code = v where id = p_id and ref_code is null;
      if found then return v; end if;
      select ref_code into v from public.prospection_prospects where id = p_id;
      return v;
    exception when unique_violation then null; -- code déjà pris : on retire
    end;
  end loop;
  raise exception 'Impossible de générer un code de suivi';
end $$;
revoke all on function public.prospect_ref_code(uuid) from public, anon, authenticated;
grant execute on function public.prospect_ref_code(uuid) to service_role;

-- Appelée par la page pro-fondateur.html (visiteur non connecté).
-- * clic dans les 60 s qui suivent l'envoi = antivirus/anti-spam du destinataire qui teste le lien : noté mais pas compté
-- * plusieurs visites en moins de 30 min = un seul clic
create or replace function public.track_prospect_click(p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare p record; v_last_send timestamptz;
begin
  if p_code is null or p_code !~ '^[a-z0-9]{8}$' then return false; end if;
  select id, sent_at, followup_sent_at, last_clicked_at into p
    from public.prospection_prospects where ref_code = p_code for update;
  if not found then return false; end if;
  v_last_send := greatest(p.sent_at, p.followup_sent_at);
  if v_last_send is not null and now() < v_last_send + interval '60 seconds' then
    insert into public.prospection_logs(prospect_id, action, detail) values (p.id, 'click_scan', 'Lien ouvert juste après l''envoi (probable antivirus)');
    return true;
  end if;
  if p.last_clicked_at is not null and p.last_clicked_at > now() - interval '30 minutes' then return true; end if;
  update public.prospection_prospects set click_count = click_count + 1,
    first_clicked_at = coalesce(first_clicked_at, now()), last_clicked_at = now()
   where id = p.id;
  insert into public.prospection_logs(prospect_id, action, detail) values (p.id, 'click', 'Clic sur le lien du mail');
  return true;
end $$;
revoke all on function public.track_prospect_click(text) from public;
grant execute on function public.track_prospect_click(text) to anon, authenticated;

-- Tableau de suivi pour l'admin : taux de clic, comptes créés, liste de ceux qui ont cliqué.
create or replace function public.admin_prospect_tracking()
returns json language plpgsql security definer set search_path = '' as $$
declare v json;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  with base as (
    select p.*, u.created_at as account_at, u.email as account_email
      from public.prospection_prospects p
      left join lateral (
        select au.created_at, au.email from auth.users au
         where (p.ref_code is not null and au.raw_user_meta_data->>'prospect_ref' = p.ref_code)
            or lower(au.email) = lower(p.email)
         order by au.created_at limit 1) u on true
     where p.sent_at is not null and p.sent_from is not null
  )
  select json_build_object(
    'tracked_since', (select min(sent_at) from base where ref_code is not null),
    'sent', (select count(*) from base where ref_code is not null),
    'clicked', (select count(*) from base where click_count > 0),
    'accounts', (select count(*) from base where account_at is not null and account_at >= sent_at),
    'by_category', (select coalesce(json_agg(json_build_object('category', c, 'sent', s, 'clicked', k, 'accounts', a) order by s desc), '[]'::json)
                      from (select coalesce(category, '—') c, count(*) filter (where ref_code is not null) s,
                                   count(*) filter (where click_count > 0) k,
                                   count(*) filter (where account_at is not null and account_at >= sent_at) a
                              from base group by 1) t where s > 0),
    'rows', (select coalesce(json_agg(r order by r.last_clicked_at desc nulls last), '[]'::json) from (
               select id, company, email, category, city, sent_at, followup_sent_at, click_count, first_clicked_at, last_clicked_at,
                      case when account_at >= sent_at then account_at end as account_at, account_email
                 from base where click_count > 0 or (account_at is not null and account_at >= sent_at)
                 order by last_clicked_at desc nulls last limit 300) r)
  ) into v;
  return v;
end $$;
revoke all on function public.admin_prospect_tracking() from public, anon;
grant execute on function public.admin_prospect_tracking() to authenticated;
