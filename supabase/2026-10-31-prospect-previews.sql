-- 31/10/2026 (Claude, demande d'Anthony) : aperçu des annonces d'un prospect sur pro-fondateur.html?r=<code>.
-- Rempli par pro-stock-sync (prospect_precheck) : 6 annonces complètes lues sur le site du prospect.
create table if not exists public.prospect_previews(
  prospect_id uuid primary key references public.prospection_prospects(id) on delete cascade,
  rows jsonb not null default '[]', count int, updated_at timestamptz not null default now());
alter table public.prospect_previews enable row level security; -- aucune politique : lecture seulement par la fonction ci-dessous
create or replace function public.prospect_preview(p_code text) returns json language sql stable security definer set search_path to '' as $$
  select json_build_object('company',p.company,'category',p.category,'count',coalesce(v.count,jsonb_array_length(v.rows)),'rows',v.rows)
  from public.prospection_prospects p join public.prospect_previews v on v.prospect_id=p.id
  where p_code ~ '^[a-z0-9]{8}$' and p.ref_code=p_code and p.opted_out_at is null limit 1 $$;
revoke all on function public.prospect_preview(text) from public;
grant execute on function public.prospect_preview(text) to anon, authenticated;
-- Rattrapage des prospects déjà testés (1 par appel, toutes les 4 min de 6 h à 20 h UTC) :
-- select cron.schedule('abracadeal-prospect-preview-fill','2-59/4 6-20 * * *', $c$select net.http_post(<project_url>||'/functions/v1/pro-stock-sync','{"action":"prospect_preview_fill"}'::jsonb, headers:=<x-cron-token>, timeout_milliseconds:=150000)$c$);
