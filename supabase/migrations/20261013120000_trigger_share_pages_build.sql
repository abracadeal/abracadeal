-- Génération immédiate des pages annonces (GitHub Pages) : dès qu'une annonce passe en ligne ou en sort
-- (validée, vendue, expirée, supprimée, masquée) ou qu'une annonce en ligne est modifiée, on lance le
-- workflow GitHub « share-pages.yml » (la page est prête en 1 à 2 minutes au lieu d'attendre le passage
-- programmé, qui reste en place comme filet de sécurité).
-- Le jeton GitHub (permission Actions uniquement, dépôt abracadeal/abracadeal) est stocké dans Vault sous
-- le nom « abracadeal_github_pages_token » ; il n'apparaît jamais dans le code.
-- Les rafales (imports pros, modération en série) sont regroupées : au plus un appel toutes les 20 secondes,
-- GitHub fusionnant de toute façon les exécutions en attente. Une erreur ici ne bloque jamais l'annonce.

create table if not exists private.share_pages_dispatch (
  id boolean primary key default true check (id),
  last_dispatch_at timestamptz not null default 'epoch'
);
insert into private.share_pages_dispatch (id) values (true) on conflict do nothing;
revoke all on private.share_pages_dispatch from public, anon, authenticated;

create or replace function private.request_share_pages_build()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_claimed boolean;
begin
  update private.share_pages_dispatch
     set last_dispatch_at = now()
   where id and last_dispatch_at < now() - interval '20 seconds'
  returning true into v_claimed;
  if not coalesce(v_claimed, false) then
    return;
  end if;

  select decrypted_secret into v_token
    from vault.decrypted_secrets
   where name = 'abracadeal_github_pages_token'
   limit 1;
  if v_token is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://api.github.com/repos/abracadeal/abracadeal/actions/workflows/share-pages.yml/dispatches',
    body := '{"ref":"main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'abracadeal-supabase',
      'Content-Type', 'application/json'),
    timeout_milliseconds := 10000
  );
exception when others then
  raise warning 'request_share_pages_build: %', sqlerrm;
end;
$$;

revoke all on function private.request_share_pages_build() from public, anon, authenticated;

create or replace function private.listings_share_pages_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_relevant boolean := false;
begin
  if tg_op = 'INSERT' then
    v_relevant := new.status = 'active' and new.visibility_scope = 'public' and new.revision_of is null;
  elsif tg_op = 'DELETE' then
    v_relevant := old.status = 'active' and old.visibility_scope = 'public' and old.revision_of is null;
  else
    v_relevant :=
      ((old.status = 'active' and old.visibility_scope = 'public') or (new.status = 'active' and new.visibility_scope = 'public'))
      and new.revision_of is null
      and (old.status, old.visibility_scope, old.title, old.description, old.price, old.city, old.postal_code,
           old.category, old.vehicle_make, old.vehicle_model, old.vehicle_year, old.mileage, old.fuel,
           old.transmission, old.item_condition, old.expires_at)
          is distinct from
          (new.status, new.visibility_scope, new.title, new.description, new.price, new.city, new.postal_code,
           new.category, new.vehicle_make, new.vehicle_model, new.vehicle_year, new.mileage, new.fuel,
           new.transmission, new.item_condition, new.expires_at);
  end if;
  if v_relevant then
    perform private.request_share_pages_build();
  end if;
  return null;
exception when others then
  raise warning 'listings_share_pages_trigger: %', sqlerrm;
  return null;
end;
$$;

revoke all on function private.listings_share_pages_trigger() from public, anon, authenticated;

create or replace trigger zz_listings_share_pages
  after insert or update or delete on public.listings
  for each row execute function private.listings_share_pages_trigger();
