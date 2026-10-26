-- 26/10/2026 (Claude) : idée d'Anthony — expliquer franchement pourquoi c'est gratuit (rassure, évite l'effet « arnaque »).
-- Ajouté dans les variantes A et B (garage, moto, agence) pour garder un test A/B équitable.
update private.prospect_mailer_settings set templates = (
  replace(replace(templates::text,
    -- B : après la phrase « … sans carte bancaire ni engagement. »
    'gratuitement, sans carte bancaire ni engagement.\n\nSi vous êtes d''accord',
    'gratuitement, sans carte bancaire ni engagement.\n\nPourquoi gratuit ? C''est donnant-donnant : vous gagnez de la visibilité en plus, et nous, des annonces pour lancer le site.\n\nSi vous êtes d''accord'),
    -- A : après le premier paragraphe de présentation
    'gratuitement, sans carte bancaire ni engagement.\n\n✅',
    'gratuitement, sans carte bancaire ni engagement.\n\nPourquoi gratuit ? C''est donnant-donnant : vous gagnez de la visibilité en plus, et nous, des annonces pour lancer le site.\n\n✅')
)::jsonb
where id = 1;
-- Modèle par défaut (colonne body, variante A générique)
update private.prospect_mailer_settings set body = replace(body,
  E'sans carte bancaire ni engagement.\n\n✅',
  E'sans carte bancaire ni engagement.\n\nPourquoi gratuit ? C''est donnant-donnant : vous gagnez de la visibilité en plus, et nous, des annonces pour lancer le site.\n\n✅')
where id = 1;
