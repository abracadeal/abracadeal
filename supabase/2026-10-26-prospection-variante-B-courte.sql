-- 26/10/2026 (Claude) : variante B des mails de prospection = version COURTE (5-6 lignes, sans emoji,
-- sans lien, une question à la fin), testée contre la variante A actuelle (longue). Demande d'Anthony.
-- Le pied de page (désinscription + iDream Lab SASU) est ajouté automatiquement par prospect-mailer.
update private.prospect_mailer_settings set templates = templates
 || jsonb_build_object('B:Garage / concession auto', jsonb_build_object(
   'subject', '{{societe}} – vos véhicules sur Abracadeal',
   'body', E'Bonjour,\n\nJe vous contacte pour Abracadeal, un nouveau site d''annonces. Pendant notre lancement, nous proposons aux garages de publier leurs véhicules gratuitement, sans carte bancaire ni engagement.\n\nSi vous êtes d''accord, nous reprenons nous-mêmes les annonces de votre site internet : vous n''avez rien à ressaisir.\n\nSeriez-vous intéressé ?\n\nLe Service Pros Abracadeal\nabracadeal.fr – {{expediteur}}'))
 || jsonb_build_object('B:Concession moto', jsonb_build_object(
   'subject', '{{societe}} – vos motos sur Abracadeal',
   'body', E'Bonjour,\n\nJe vous contacte pour Abracadeal, un nouveau site d''annonces. Pendant notre lancement, nous proposons aux concessions et garages moto de publier leurs deux-roues gratuitement, sans carte bancaire ni engagement.\n\nSi vous êtes d''accord, nous reprenons nous-mêmes les annonces de votre site internet : vous n''avez rien à ressaisir.\n\nSeriez-vous intéressé ?\n\nLe Service Pros Abracadeal\nabracadeal.fr – {{expediteur}}'))
 || jsonb_build_object('B:Agence immobilière', jsonb_build_object(
   'subject', '{{societe}} – vos biens sur Abracadeal',
   'body', E'Bonjour,\n\nJe vous contacte pour Abracadeal, un nouveau site d''annonces. Pendant notre lancement, nous proposons aux agences immobilières de publier leurs biens gratuitement, sans carte bancaire ni engagement.\n\nSi vous êtes d''accord, nous reprenons nous-mêmes les annonces de votre site internet : vous n''avez rien à ressaisir.\n\nSeriez-vous intéressé ?\n\nLe Service Pros Abracadeal\nabracadeal.fr – {{expediteur}}'))
 || jsonb_build_object('B:relance', jsonb_build_object(
   'subject', '{{societe}} : vos annonces sur Abracadeal',
   'body', E'Bonjour,\n\nJe me permets de revenir vers vous : seriez-vous intéressé pour publier vos annonces gratuitement sur Abracadeal, sans carte bancaire ni engagement ? Nous pouvons même les reprendre pour vous depuis votre site.\n\nUn simple « oui » ou « non merci » me suffit.\n\nLe Service Pros Abracadeal\nabracadeal.fr – {{expediteur}}'))
where id = 1;
