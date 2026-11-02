-- 02/11/2026 — Claude — site lent : les files d'attente de la prospection lisaient toute la table
-- private.prospect_leads (233 000 lignes, 87 Mo) à chaque appel (prospect_crawler_next ~1,2 s × 14 000 appels,
-- domain_guess_next ~1,7 s × 5 000, promote_annuaire_leads ~1,7 s). Sur la petite base, ces lectures
-- prenaient le disque et ralentissaient tout le site. Index partiels ajoutés (appliqués en direct, CONCURRENTLY).
create index concurrently if not exists prospect_leads_todo_idx on private.prospect_leads (crawl_tries, created_at) where crawl_status='todo';
create index concurrently if not exists prospect_leads_guessing_idx on private.prospect_leads (crawled_at) where crawl_status='guessing';
create index concurrently if not exists prospect_leads_guess_order_idx on private.prospect_leads (((categorie = 'Concession moto')) desc, ((crawl_status = 'no_site')) desc, created_at) where source='annuaire' and crawl_status in ('no_site','site_not_found');
create index concurrently if not exists prospect_leads_found_idx on private.prospect_leads (lower(email)) where source='annuaire' and crawl_status='found' and email is not null;
create index concurrently if not exists prospection_prospects_lower_email_idx on public.prospection_prospects (lower(email));
create index concurrently if not exists email_opt_outs_lower_email_idx on public.email_opt_outs (lower(email));
