-- 28/10/2026 (Claude) : mails de prospection réduits au minimum, demande d'Anthony :
-- « inscrivez-vous et en quelques minutes toutes les annonces de votre site sont en ligne ».
-- Remplace les variantes A (longues) et B (courtes). A et B ne diffèrent plus que par l'objet (test A/B des objets).
-- Corrige au passage l'ancien « jusqu'à 50 annonces » (l'offre Fondateurs est à 100 annonces depuis le 27/10).
-- Le pied de page (désinscription + iDream Lab SASU) est ajouté automatiquement par prospect-mailer.
do $$
declare
  sig text := E'\n\nLe Service Pros Abracadeal\nabracadeal.fr – {{expediteur}}';
  link text := E'\n\nJe m''inscris : https://abracadeal.fr/pro-fondateur.html';
  free text := E'Abracadeal est un nouveau site d''annonces. Pendant le lancement, c''est gratuit pour les professionnels : sans carte bancaire, sans engagement.\n\n';
  b_auto text := E'Bonjour,\n\n' || free || E'Inscrivez-vous avec l''adresse de votre site : en quelques minutes, tous vos véhicules sont en ligne, avec leurs photos et leurs prix. Ensuite, ils se mettent à jour tout seuls (nouveaux véhicules, prix, ventes).' || link || sig;
  b_moto text := E'Bonjour,\n\n' || free || E'Inscrivez-vous avec l''adresse de votre site : en quelques minutes, toutes vos motos sont en ligne, avec leurs photos et leurs prix. Ensuite, elles se mettent à jour toutes seules (nouveautés, prix, ventes).' || link || sig;
  b_immo text := E'Bonjour,\n\n' || free || E'Inscrivez-vous avec l''adresse de votre site : en quelques minutes, tous vos biens sont en ligne, avec leurs photos et leurs prix. Ensuite, ils se mettent à jour tout seuls (nouveaux biens, prix, ventes et locations).' || link || sig;
  b_gen text := E'Bonjour,\n\n' || free || E'Inscrivez-vous avec l''adresse de votre site : en quelques minutes, toutes vos annonces sont en ligne, avec leurs photos et leurs prix. Ensuite, elles se mettent à jour toutes seules.' || link || sig;
  b_rel text := E'Bonjour,\n\nPetit rappel : inscrivez-vous avec l''adresse de votre site, et en quelques minutes toutes vos annonces sont en ligne sur Abracadeal. Gratuit, sans carte bancaire, sans engagement.\n\nhttps://abracadeal.fr/pro-fondateur.html' || sig;
begin
  update private.prospect_mailer_settings set
    subject = '{{societe}} : vos annonces en ligne en quelques minutes',
    body = b_gen,
    templates = templates
      || jsonb_build_object('Garage / concession auto', jsonb_build_object('subject','{{societe}} : vos véhicules en ligne en quelques minutes','body',b_auto))
      || jsonb_build_object('B:Garage / concession auto', jsonb_build_object('subject','{{societe}} – vos véhicules sur Abracadeal, gratuitement','body',b_auto))
      || jsonb_build_object('Concession moto', jsonb_build_object('subject','{{societe}} : vos motos en ligne en quelques minutes','body',b_moto))
      || jsonb_build_object('B:Concession moto', jsonb_build_object('subject','{{societe}} – vos motos sur Abracadeal, gratuitement','body',b_moto))
      || jsonb_build_object('Agence immobilière', jsonb_build_object('subject','{{societe}} : vos biens en ligne en quelques minutes','body',b_immo))
      || jsonb_build_object('B:Agence immobilière', jsonb_build_object('subject','{{societe}} – vos biens sur Abracadeal, gratuitement','body',b_immo))
      || jsonb_build_object('relance', jsonb_build_object('subject','{{societe}} : vos annonces sur Abracadeal','body',b_rel))
      || jsonb_build_object('B:relance', jsonb_build_object('subject','{{societe}} : vos annonces sur Abracadeal','body',b_rel))
  where id = 1;
end $$;
