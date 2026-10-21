-- 21/10/2026 — Annonces de démonstration Abracadeal
-- Permet d'isoler, activer/masquer et retirer rapidement les annonces de démonstration
-- sans toucher aux vraies annonces.

alter table public.listings
  add column if not exists is_demo boolean not null default false;

create index if not exists listings_is_demo_active_idx
  on public.listings (is_demo, status)
  where is_demo = true;

comment on column public.listings.is_demo is
  'Annonce de démonstration Abracadeal, isolée des vraies annonces et retirable en bloc.';
