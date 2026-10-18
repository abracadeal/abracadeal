-- 18/10/2026 — Mails de prospection : « aucune carte bancaire demandée à l'inscription »
-- À appliquer APRÈS supabase/2026-10-18-founder-no-card.sql et le déploiement des fonctions.
update private.prospect_mailer_settings
   set templates = replace(replace(templates::text,
         'sans frais cachés : aucun prélèvement avant le 13e mois',
         'aucune carte bancaire demandée à l’inscription'),
         'sans frais cachés (aucun prélèvement avant le 13e mois)',
         'sans carte bancaire à l’inscription')::jsonb,
       body = replace(replace(body,
         'sans frais cachés : aucun prélèvement avant le 13e mois',
         'aucune carte bancaire demandée à l’inscription'),
         'sans frais cachés (aucun prélèvement avant le 13e mois)',
         'sans carte bancaire à l’inscription')
 where id = 1;
