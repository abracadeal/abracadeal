-- 26/10/2026 (Claude) : mails de prospection pros — on ne met plus « 12 mois gratuits » / « 100 % gratuite »
-- en avant (ça annonce « payant ensuite »). La durée reste dans les conditions de la page pro-fondateur.html,
-- vers laquelle les mails renvoient (ligne « Conditions des places Fondateurs »).
update private.prospect_mailer_settings
set
  body = replace(replace(body,
    E'✅ Offre Fondateurs : 12 mois gratuits, jusqu''à 50 annonces',
    E'✅ Jusqu''à 50 annonces publiées gratuitement, sans carte bancaire'),
    E'Le Service Pros Abracadeal\nabracadeal.fr – {{expediteur}}',
    E'Le Service Pros Abracadeal\nabracadeal.fr – {{expediteur}}\n\nConditions des places Fondateurs : https://abracadeal.fr/pro-fondateur.html'),
  templates = replace(replace(replace(templates::text,
    'Offre Fondateurs : 12 mois gratuits, jusqu''à 50 annonces',
    'Jusqu''à 50 annonces publiées gratuitement, sans carte bancaire'),
    'Les places Fondateurs d''Abracadeal partent au fur et à mesure : 12 mois de diffusion 100 % gratuite, sans carte bancaire à l’inscription, sans engagement et sans ressaisie.',
    'Les places Fondateurs d''Abracadeal partent au fur et à mesure : vos annonces diffusées gratuitement, sans carte bancaire, sans engagement et sans ressaisie.'),
    'Le Service Pros Abracadeal\\nabracadeal.fr – {{expediteur}}"',
    'Le Service Pros Abracadeal\\nabracadeal.fr – {{expediteur}}\\n\\nConditions des places Fondateurs : https://abracadeal.fr/pro-fondateur.html"')::jsonb
where id = 1;
