-- 03/11/2026 (Claude, demande d'Anthony « répare tout ça ») — exécuté par Anthony dans le SQL Editor.
-- Le nombre d'annonces n'est affiché (mail, page aperçu) que s'il est garanti (count_sure, rempli par pro-stock-sync).
alter table public.prospect_previews add column if not exists count_sure boolean not null default false;

create or replace function public.prospect_preview(p_code text) returns json language sql stable security definer set search_path to '' as $$
  select json_build_object('company',p.company,'category',p.category,
         'count',case when v.count_sure then v.count end,'count_sure',v.count_sure,'rows',v.rows)
  from public.prospection_prospects p join public.prospect_previews v on v.prospect_id=p.id
  where p_code ~ '^[a-z0-9]{8}$' and p.ref_code=p_code and p.opted_out_at is null limit 1 $$;
revoke all on function public.prospect_preview(text) from public;
grant execute on function public.prospect_preview(text) to anon, authenticated;

-- Aperçus faits avec l'ancien robot (avant le déploiement du 02/11 18:53 UTC) : contenu non fiable
-- (Weecars Amiens / Toulon montraient des voitures d'autres agences). Refaits la nuit par prospect_preview_fill.
delete from public.prospect_previews where updated_at < '2026-11-02 18:53:16+00';

update private.prospect_mailer_settings set sending_enabled = false, updated_at = now();
