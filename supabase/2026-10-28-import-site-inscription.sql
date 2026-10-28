-- 28/10/2026 : import automatique du stock depuis le site du pro (adresse donnée à l'inscription + autorisation).
-- Le flux est créé « en attente » (inactif) ; l'admin le valide avant toute synchronisation.

alter table public.pro_stock_feeds
  add column if not exists source_kind text not null default 'flux',
  add column if not exists review_status text not null default 'approved',
  add column if not exists site_platform text,
  add column if not exists authorized_at timestamptz,
  add column if not exists authorization_text text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

do $$ begin
  alter table public.pro_stock_feeds add constraint pro_stock_feeds_source_kind_check check (source_kind in ('flux','site'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pro_stock_feeds add constraint pro_stock_feeds_review_status_check check (review_status in ('pending','approved','rejected'));
exception when duplicate_object then null; end $$;
-- Un flux en attente ou refusé ne peut jamais être actif.
do $$ begin
  alter table public.pro_stock_feeds add constraint pro_stock_feeds_review_active_check check (review_status = 'approved' or active = false);
exception when duplicate_object then null; end $$;

create index if not exists pro_stock_feeds_review_idx on public.pro_stock_feeds (review_status, source_kind);

-- Texte exact de la case cochée, conservé comme preuve de l'autorisation.
create or replace function private.site_import_consent_text()
returns text language sql immutable set search_path = '' as $$
  select 'J''autorise Abracadeal à reprendre et diffuser automatiquement les annonces publiées sur mon site, et à les tenir à jour (prix, photos, ventes).'::text
$$;

-- Normalise une adresse saisie par le pro : ajoute https://, refuse ce qui n'est pas un site public.
create or replace function private.normalize_site_url(p_url text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_url, ''));
begin
  if v = '' or length(v) > 300 then return null; end if;
  if v !~* '^https?://' then v := 'https://' || v; end if;
  if v !~* '^https?://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:443|:80)?(/[^\s]*)?$' then return null; end if;
  if v ~* '^https?://([^/]*\.)?(leboncoin|lacentrale|autoscout24|paruvendu|seloger|bienici|facebook|instagram)\.' then return null; end if;
  return v;
end $$;

-- Crée (ou remplace) la demande d'import en attente pour un pro.
create or replace function private.upsert_site_import_request(p_user uuid, p_url text, p_sector text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_url text := private.normalize_site_url(p_url); v_id uuid; v_sector text;
begin
  if v_url is null then raise exception 'Adresse de site invalide' using errcode = '22023'; end if;
  v_sector := case when p_sector = 'immobilier' then 'immobilier' else 'vehicules' end;
  select id into v_id from public.pro_stock_feeds where owner_id = p_user and source_kind = 'site' order by created_at desc limit 1;
  if v_id is null then
    insert into public.pro_stock_feeds (owner_id, name, feed_url, format, sync_mode, active, sector, source_kind, review_status, authorized_at, authorization_text)
    values (p_user, 'Site du pro', v_url, 'auto', 'full', false, v_sector, 'site', 'pending', now(), private.site_import_consent_text())
    returning id into v_id;
  else
    update public.pro_stock_feeds set feed_url = v_url, sector = v_sector, active = false, review_status = 'pending',
      authorized_at = now(), authorization_text = private.site_import_consent_text(), reviewed_at = null, reviewed_by = null,
      last_error = null, updated_at = now()
    where id = v_id;
  end if;
  return v_id;
end $$;
revoke all on function private.upsert_site_import_request(uuid, text, text) from public, anon, authenticated;

-- À l'inscription : métadonnée « stock_site » = { url, consent: true }. Ne bloque jamais la création du compte.
create or replace function private.handle_signup_site_import()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v jsonb := new.raw_user_meta_data -> 'stock_site';
begin
  if v is null or coalesce(new.raw_user_meta_data ->> 'account_type', '') <> 'professionnel' then return new; end if;
  if coalesce((v ->> 'consent')::boolean, false) is not true then return new; end if;
  begin
    perform private.upsert_site_import_request(new.id, v ->> 'url', new.raw_user_meta_data ->> 'pro_sector');
  exception when others then
    raise warning 'Demande d''import du site ignorée pour %: %', new.id, sqlerrm;
  end;
  return new;
exception when others then
  raise warning 'Import site (inscription) ignoré: %', sqlerrm;
  return new;
end $$;

drop trigger if exists on_auth_user_created_site_import on auth.users;
create trigger on_auth_user_created_site_import
  after insert on auth.users for each row execute function private.handle_signup_site_import();

-- Pour un pro déjà inscrit (connexion Google, ou ajout plus tard depuis son espace).
create or replace function public.request_site_import(p_url text, p_consent boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_sector text; v_id uuid;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and account_type = 'professionnel') then
    raise exception 'Réservé aux comptes professionnels' using errcode = '42501'; end if;
  if p_consent is not true then raise exception 'Autorisation requise' using errcode = '22023'; end if;
  select coalesce(pro_sector, 'vehicules') into v_sector from public.profiles where id = v_uid;
  v_id := private.upsert_site_import_request(v_uid, p_url, v_sector);
  return jsonb_build_object('ok', true, 'feed_id', v_id, 'status', 'pending');
end $$;
revoke all on function public.request_site_import(text, boolean) from public, anon;
grant execute on function public.request_site_import(text, boolean) to authenticated;

-- Le pro voit l'état de sa demande.
create or replace function public.get_my_site_import()
returns jsonb language sql security definer stable set search_path = '' as $$
  select coalesce((select jsonb_build_object('url', feed_url, 'status', review_status, 'active', active, 'last_success_at', last_success_at, 'last_error', last_error)
    from public.pro_stock_feeds where owner_id = auth.uid() and source_kind = 'site' order by created_at desc limit 1), 'null'::jsonb)
$$;
revoke all on function public.get_my_site_import() from public, anon;
grant execute on function public.get_my_site_import() to authenticated;

-- Admin : liste des imports de sites.
create or replace function public.admin_list_site_imports()
returns table (feed_id uuid, owner_id uuid, company text, email text, phone text, sector text, site_url text, review_status text,
  active boolean, site_platform text, authorized_at timestamptz, last_run_at timestamptz, last_success_at timestamptz, last_error text,
  listings_online bigint, listings_pending bigint, created_at timestamptz)
language plpgsql security definer stable set search_path = '' as $$
begin
  if not public.abracadeal_current_user_is_admin() then raise exception 'Accès administrateur requis' using errcode = '42501'; end if;
  return query
  select f.id, f.owner_id,
    coalesce(nullif(v.company_name, ''), p.display_name)::text, u.email::text, p.phone::text, f.sector, f.feed_url, f.review_status,
    f.active, f.site_platform, f.authorized_at, f.last_run_at, f.last_success_at, f.last_error,
    (select count(*) from public.listings l where l.owner_id = f.owner_id and l.source = 'feed:' || f.id and l.status = 'active'),
    (select count(*) from public.listings l where l.owner_id = f.owner_id and l.source = 'feed:' || f.id and l.status = 'pending'),
    f.created_at
  from public.pro_stock_feeds f
  join auth.users u on u.id = f.owner_id
  left join public.profiles p on p.id = f.owner_id
  left join public.pro_verifications v on v.user_id = f.owner_id
  where f.source_kind = 'site'
  order by (f.review_status = 'pending') desc, f.created_at desc;
end $$;
revoke all on function public.admin_list_site_imports() from public, anon;
grant execute on function public.admin_list_site_imports() to authenticated;

-- Admin : valider (active la synchro) ou refuser / mettre en pause.
create or replace function public.admin_review_site_import(p_feed_id uuid, p_decision text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if not public.abracadeal_current_user_is_admin() then raise exception 'Accès administrateur requis' using errcode = '42501'; end if;
  if p_decision not in ('approve', 'reject', 'pause') then raise exception 'Décision inconnue' using errcode = '22023'; end if;
  update public.pro_stock_feeds set
    review_status = case p_decision when 'reject' then 'rejected' else 'approved' end,
    active = (p_decision = 'approve'),
    reviewed_at = now(), reviewed_by = v_uid, updated_at = now()
  where id = p_feed_id and source_kind = 'site';
  if not found then raise exception 'Demande introuvable' using errcode = 'P0002'; end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_review_site_import(uuid, text) from public, anon;
grant execute on function public.admin_review_site_import(uuid, text) to authenticated;
