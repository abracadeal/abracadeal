# Gestion des durées et demandes de données — 8 octobre 2026

Politique publique de référence : confidentialite.html#conservation.

Les durées publiées engagent iDream Lab. Le code actuellement vérifié purge quotidiennement les archives privées d’annonces à leur retention_until (cinq ans), sauf legal_hold. Il ne comporte pas de purge générale des comptes, conversations, dossiers de modération ou e-mails d’assistance. Ces catégories doivent être traitées par une revue de conservation et des demandes de droits ; ne pas présenter leur purge comme automatique.

## Revue et actions à réaliser

- À chaque demande de clôture ou d’effacement : vérifier proportionnellement l’identité, accuser réception, retirer les contenus publics, distinguer données supprimables et données légalement requises. Répondre dans un mois ; annoncer et motiver une éventuelle prolongation dans ce mois.
- Revue mensuelle des échéances : comptes sans action depuis deux ans (préavis de trente jours ; exclure les services encore à exécuter), conversations sans échange depuis deux ans, dossiers de modération clos depuis un an, demandes de support closes depuis deux ans, prospection sans contact depuis trois ans, journaux internes après un an.
- Séparer l’archive de preuve du service actif. Respecter les durées spécifiques d’identification des contributeurs, les pièces contractuelles et les factures. La fin de visibilité n’est pas l’effacement des preuves obligatoires.
- Vérifier les dépendances avant une fermeture d’un utilisateur : commandes, factures, abonnements, profil hôte, annonces, conversations et recours. Anonymiser quand c’est approprié ; ne pas supprimer les preuves de paiement. Révoquer les sessions et supprimer les fichiers via l’API Storage, jamais en supprimant seulement storage.objects par SQL.
- Suspendre seulement les pièces concernées par un litige ou une réquisition et documenter la raison du gel ; réexaminer sa nécessité. Aucun gel général et illimité de tous les comptes.
- Après une restauration : réappliquer les effacements et gels enregistrés. Confirmer le plan de sauvegarde réellement souscrit auprès du prestataire.
- Les remboursements pour rétractation sont traités humainement : quatorze jours, service partiellement fourni au prorata lorsque les conditions légales sont remplies ; perte du droit seulement après exécution complète et accord requis. Une commande historique conserve son texte de consentement d’origine.

## Point contractuel qui reste indispensable avant les ventes consommateurs

Adhérer réellement à un médiateur de consommation référencé et compétent. Puis remplacer la note transitoire de cgv.html#mediation et des vues intégrées par le nom, l’adresse, le site, les modalités de saisine et la date d’effet de la convention. Une liste de médiateurs ou la DGCCRF ne remplace pas cette adhésion.

La clôture des preuves contractuelles implique également la conservation datée des versions CGU/CGV utilisées. Les nouvelles inscriptions enregistrent la version et la date d’acceptation dans les métadonnées Auth ; les options gardent le consentement daté côté serveur avec la commande. Une preuve centrale non modifiable par l’utilisateur reste à mettre en place pour les inscriptions.
