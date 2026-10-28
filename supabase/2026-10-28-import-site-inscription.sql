-- 28/10/2026 : import automatique du stock depuis le site du pro (adresse donnée à l'inscription + autorisation).
-- Le flux est créé « en attente » (inactif) ; l'admin le valide avant toute synchronisation.
-- Appliqué le 28/10/2026 en deux migrations (import_site_columns, import_site_functions).
-- Pas de déclencheur sur auth.users (refusé) : la case cochée est gardée dans la métadonnée « stock_site »
-- du compte et la demande est créée à la première connexion via claim_signup_site_import().

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

-- Fonctions (définitions exactes dans l’historique des migrations Supabase « import_site_functions ») :
--   private.site_import_consent_text, private.normalize_site_url, private.upsert_site_import_request,
--   public.claim_signup_site_import, public.request_site_import, public.get_my_site_import,
--   public.admin_list_site_imports, public.admin_review_site_import, public.admin_create_site_import.

-- 28/10/2026 (migration site_import_block_more_marketplaces) : liste des sites refusés élargie
-- (leboncoin, lacentrale, autoscout24, paruvendu, seloger, bienici, logic-immo, pap, ouestfrance-auto/immo,
--  largus, vinted, facebook, instagram, tiktok), même liste côté formulaire d'inscription.
