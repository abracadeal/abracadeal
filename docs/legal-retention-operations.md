# Gestion des durées et demandes de données — 8 octobre 2026

Politique publique de référence : confidentialite.html#conservation.

Les durées publiées engagent iDream Lab. Le nettoyage de la base est désormais planifié quotidiennement à 03:10 UTC. Le worker des fichiers et préavis passe toutes les quinze minutes. Les tâches et gels sont suivis dans admin-retention.html, accessible depuis Modération. Les boîtes mail externes et les sauvegardes restent des traitements distincts.

## Automatismes installés

- Messages : expiration de toute la conversation deux ans après son dernier échange ; les échanges encore récents, les signalements ouverts et les gels ciblés sont préservés. Une fermeture de compte n’efface pas les échanges utiles à l’autre participant.
- Signalements : un an après leur clôture effective. Les dossiers historiques sans date fiable commencent à la date de la migration ; une réouverture remet closed_at à NULL. Une décision de modération encore utilisée pour une annonce active reste nécessaire au circuit de publication.
- Journaux internes, recherches, libérations de téléphone : un an. Les journaux des prestataires suivent leurs réglages propres.
- Prospects : trois ans après created_at ou last_inbound_contact_at ; un envoi commercial ou une modification administrative ne renouvelle pas ce délai. Les comptes clients sont exclus, ainsi que les anciens clients pendant trois ans après leur fermeture. Renseigner last_inbound_contact_at lorsqu’un prospect répond ; les oppositions minimales restent dans email_opt_outs.
- Archives d’annonces : cinq ans après retrait, avec suppression de la copie en table listings aussi. Avant les cascades historiques, les justificatifs liés sont copiés en archive comptable privée. Un gel, un échange récent ou un séjour à venir bloque la suppression concernée. L’expiration ne recrée ni archive cinq ans ni blocage de republication trente jours.
- Photos : file durable créée au retrait définitif et à la suppression. Le worker vérifie les références encore utilisées et les gels, utilise Storage.remove puis retire les lignes listing_photos. Les photos publiques gelées sont copiées et vérifiées dans listing-images-pending sous retention-evidence/ avant suppression de la copie publique ; leur chemin privé est enregistré et elles restent protégées tant que le gel existe. Erreur : reprise après une heure ; photo partagée ou gelée : nouvelle vérification après un jour. Ne jamais supprimer storage.objects par SQL.
- Comptes inactifs : examen après deux ans, exclusion des comptes administrateurs/internes, abonnements, crédits/options inutilisés, commandes en cours, séjours futurs et litiges. Préavis envoyé avec Resend ; l’échéance de trente jours commence seulement après un envoi accepté. Reconnexion ou activité nouvelle : annulation. Fermeture : révocation des sessions, bannissement Auth, remplacement de l’adresse par un identifiant technique non joignable et effacement des métadonnées personnelles, anonymisation du profil, retrait des annonces, suppression des coordonnées et photos. Le UUID reste une ancre pseudonyme pour les commandes et messages qui doivent subsister ; aucun auth.deleteUser en cascade.
- Identité et preuves utiles : archive privée cinq ans ; consentements contractuels ordinaires supprimés cinq ans après fermeture, contrats consommateurs de 120 € et plus conservés plus longtemps. Les justificatifs comptables sont conservés jusqu’au premier janvier après dix ans complets depuis la clôture annuelle ; les références pseudonymes nécessaires aux relations encore conservées subsistent.
- Support stocké dans private.retention_support : deux ans après closed_at. Ce registre ne lit et n’efface aucune boîte mail externe. Les e-mails de contact@abracadeal.fr doivent être nettoyés dans le service qui les conserve.
- Gels : périmètre user/listing/conversation/report/review/prospect/order/support ; motif et administrateur journalisés. Réexamen à six mois, levée humaine dès fin du litige. Un gel ne se lève pas automatiquement par simple dépassement de review_at.
- Les échecs de worker sont consignés dans retention_runs ; erreurs de fichier et de compte visibles dans l’administration. Une exécution concurrente est bloquée par un bail de cinq minutes.

## Revue et actions à réaliser

- À chaque demande de clôture ou d’effacement : vérifier proportionnellement l’identité, accuser réception, retirer les contenus publics, distinguer données supprimables et données légalement requises. Répondre dans un mois ; annoncer et motiver une éventuelle prolongation dans ce mois.
- Revue mensuelle : erreurs de tâches, gels à réexaminer, dossiers de support dans la boîte externe, prospects ayant répondu à dater et demandes de droits à traiter.
- Séparer l’archive de preuve du service actif. Respecter les durées spécifiques d’identification des contributeurs, les pièces contractuelles et les factures. La fin de visibilité n’est pas l’effacement des preuves obligatoires.
- Vérifier les dépendances avant une fermeture d’un utilisateur : commandes, factures, abonnements, profil hôte, annonces, conversations et recours. Anonymiser quand c’est approprié ; ne pas supprimer les preuves de paiement. Révoquer les sessions et supprimer les fichiers via l’API Storage, jamais en supprimant seulement storage.objects par SQL.
- Suspendre seulement les pièces concernées par un litige ou une réquisition et documenter la raison du gel ; réexaminer sa nécessité. Aucun gel général et illimité de tous les comptes.
- Après une restauration : réappliquer les effacements et gels enregistrés. Confirmer le plan de sauvegarde réellement souscrit auprès du prestataire.
- Les remboursements pour rétractation sont traités humainement : quatorze jours, service partiellement fourni au prorata lorsque les conditions légales sont remplies ; perte du droit seulement après exécution complète et accord requis. Une commande historique conserve son texte de consentement d’origine.

## Point contractuel qui reste indispensable avant les ventes consommateurs

Adhérer réellement à un médiateur de consommation référencé et compétent. Puis remplacer la note transitoire de cgv.html#mediation et des vues intégrées par le nom, l’adresse, le site, les modalités de saisine et la date d’effet de la convention. Une liste de médiateurs ou la DGCCRF ne remplace pas cette adhésion.

La clôture des preuves contractuelles implique également la conservation datée des versions CGU/CGV utilisées. Les nouvelles inscriptions enregistrent la version et la date d’acceptation dans les métadonnées Auth ; les options gardent le consentement daté côté serveur avec la commande. Une preuve centrale non modifiable par l’utilisateur reste à mettre en place pour les inscriptions.
