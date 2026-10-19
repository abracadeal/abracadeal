-- 19/10/2026 — Prospection : feu vert permanent + nouvelles sources (appliqué en production)
-- 1) Les pros trouvés par l'annuaire arrivent directement prêts à l'envoi (avant : en pause).
do $$ declare d text; begin
 d := pg_get_functiondef('private.promote_annuaire_leads'::regproc);
 d := replace(d, $q$'paused', 'a_qualifier', 'todo'$q$, $q$'ready', 'a_qualifier', 'todo'$q$);
 execute d;
end $$;
-- 2) Import SIRENE étendu aux agences immobilières (NAF 68.31Z), tous départements déjà couverts.
insert into private.sirene_import_state (dept, naf, categorie, next_page, total_pages, inserted, done)
select distinct dept, '68.31Z', 'Agence immobilière', 1, null::int, 0, false from private.sirene_import_state
on conflict do nothing;
