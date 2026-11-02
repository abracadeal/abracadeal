-- 02/11/2026 : copie de la liste officielle des communes (geo.api.gouv.fr) pour le robot d'import (pro-stock-sync),
-- chargée en un appel (commune_list_compact) même quand l'API de l'État est lente. Remplie par :
--   select net.http_get('https://geo.api.gouv.fr/communes?fields=nom,codesPostaux,population,centre&format=json', timeout_milliseconds:=60000);
--   select public.commune_ref_refresh(<id de la réponse>);
create table if not exists public.commune_ref(
  id bigserial primary key, nom text not null, cps text[] not null default '{}', pop integer not null default 0,
  lat double precision, lon double precision);
alter table public.commune_ref enable row level security;
create or replace function public.commune_list_compact() returns text
language sql stable security definer set search_path=public as $$
  select coalesce(string_agg(nom||'|'||array_to_string(cps,',')||'|'||pop||'|'||coalesce(round(lat::numeric,4)::text,'')||'|'||coalesce(round(lon::numeric,4)::text,''), E'\n'),'') from commune_ref;
$$;
revoke all on function public.commune_list_compact() from public, anon, authenticated;
grant execute on function public.commune_list_compact() to service_role;
create or replace function public.commune_ref_refresh(p_resp_id bigint) returns integer
language plpgsql security definer set search_path=public as $$
declare n integer; body jsonb;
begin
  select content::jsonb into body from net._http_response where id=p_resp_id and status_code=200;
  if body is null or jsonb_array_length(body) < 30000 then return 0; end if;
  delete from commune_ref;
  insert into commune_ref(nom,cps,pop,lat,lon)
  select x->>'nom', coalesce(array(select jsonb_array_elements_text(x->'codesPostaux')),'{}'), coalesce((x->>'population')::int,0),
         (x->'centre'->'coordinates'->>1)::float8, (x->'centre'->'coordinates'->>0)::float8
  from jsonb_array_elements(body) x;
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.commune_ref_refresh(bigint) from public, anon, authenticated;

-- 02/11/2026 (suite) : code INSEE + anciennes communes (déléguées / associées) reconnues avec la position de la commune actuelle.
--   select net.http_get('https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,population,centre&format=json', timeout_milliseconds:=60000);
--   select net.http_get('https://geo.api.gouv.fr/communes_associees_deleguees?fields=nom,code,chefLieu,type&format=json');
--   select public.commune_ref_refresh(<id 1>), public.commune_ref_aliases(<id 2>);
alter table public.commune_ref add column if not exists code text;
alter table public.commune_ref add column if not exists alias_of text;
create index if not exists commune_ref_code on public.commune_ref(code);
-- (fonctions commune_ref_refresh / commune_ref_aliases : voir la migration « commune_ref_aliases »)
