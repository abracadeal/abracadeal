-- SEO : liste des annonces publiques vendues ou expirées depuis moins de N jours (30 par défaut).
-- Utilisée par scripts/build_share_pages.py pour garder la page /annonce/<id>/ en version
-- « Annonce vendue / expirée » (noindex, annonces similaires) pendant 30 jours, puis la supprimer (404).
-- Ne renvoie que l'identifiant, le motif et la date : aucun contenu d'annonce ni donnée personnelle.
-- Les annonces supprimées par le vendeur, retirées par l'admin ou refusées n'y figurent jamais.
create or replace function public.seo_recently_unavailable_listings(p_days integer default 30)
returns table(id uuid, reason text, unavailable_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.archive_reason, coalesce(l.archived_at, l.updated_at)
  from public.listings l
  where l.status = 'archived'
    and l.archive_reason in ('sold', 'expired')
    and l.visibility_scope = 'public'
    and l.revision_of is null
    and coalesce(l.archived_at, l.updated_at) > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 60));
$$;

revoke all on function public.seo_recently_unavailable_listings(integer) from public;
grant execute on function public.seo_recently_unavailable_listings(integer) to anon, authenticated;
