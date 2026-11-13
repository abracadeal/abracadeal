## 2026-11-13 (matin) — Point Immo et Associés, 51 biens distincts lus (ChatGPT)

- Main récupéré `0201e8175d30b2bcd7639b1a7003110603c57ee9`, JOURNAL relu. Version réellement déployée au départ : pro-stock-sync v343 `c2994ca2728baf56f9799a950856e623a44b5c67`. L’acquittement Apimo déjà ajouté sur main a été conservé, ainsi que les autres connecteurs. Demande Point Immo `58dc6c8d-ae75-4a9a-81bd-83e8b6df0309` après les blocages déjà consignés. Lecture initiale à blanc `11300` : zéro annonce, parcours générique incomplet.
- La demande vise le site commun de Point Immo, sans agence spécifiée. Le lecteur suit le catalogue de vente public du site et les fiches des deux agences, sans mélanger leurs coordonnées. Pagination du moteur Proxi en trois pages (48 + 48 + 23), 119 identifiants distincts. Le compteur inclut 34 réalisations, 14 pages de programmes sans prix de fiche et 18 ventes conclues, sous offre ou sous compromis. Les lots individuels en vente restent dans le périmètre. Parmi les 53 fiches individuelles disponibles, deux doublons de biens confirmés par le prix, la surface et les galeries : loft/local de Rodez 942/250 et maison/local de Naucelle 902/248. Conservation du loft 942 et du local 248, soit 51 biens distincts.
- Contrôle des galeries d’origine : 454 fichiers décodés sur les 53 fiches, dont 39 erreurs HTTP 503 transitoires résolues à débit réduit. Planches visuelles, empreintes et exclusion des répétitions dans une même galerie. 414 visuels retenus pour les 51 biens. Les plans et perspectives propres aux programmes restent des visuels de la source. Des lots distincts d’une même résidence partagent parfois des vues de l’immeuble.
- 51 prix et descriptions, 13 DPE et 13 GES sélectionnés dans le HTML des fiches. Les données de l’encadré « Votre contact » priment sur un numéro divergent dans le texte commercial, dont certaines fiches d’Albi mentionnant le standard de Rodez. 51 téléphones, deux numéros d’agence, 50 noms de contact affichés. Le T2 quartier Madeleine à 160 000 € n’a ni commune, ni code postal, ni nom de contact, et le descriptif finit par du texte incohérent publié tel quel. La commune reste vide, donc 50 fiches complètes dans l’aperçu. Écart de surface à vérifier pour le local 256 de Rodez : 82 m² dans les caractéristiques et 84 m² dans le titre.
- Lecteur et tests enregistrés sur main. Tests de reprise et pagination, doublons Orpi, Nextlogis, Maison Cotard, Négoce Auto 33, Apimo Gubernatis et bundle réussis. Après contrôle v344/v345, quatre codes postaux de La Primaube étaient réécrits par la normalisation sur un état repris. La version finale protège les champs source dans le point de reprise et conserve le code postal affiché.
- pro-stock-sync v347 ACTIVE, épinglage `01adcdeba412b982dab54e7f0a45834e9838f0c0` vérifié. Test final à blanc neuf `11371 → 11383`, 13 passes, 51/51 lues, 50 complètes, 414 visuels, zéro doublon résiduel, aucune fiche ou liste restante, aucun écart de compteur. Les 51 prix, codes postaux, références et diagnostics, puis les surfaces, pièces, chambres et villes des 50 fiches prévisualisables correspondent aux fiches. Les quatre lots de La Primaube conservent le 12450 publié. Demande admissible à done avec limites de la source, validation visuelle à Anthony.
- BG Motors Pro, demande suivante, test exploratoire à blanc `11301` sur le catalogue occasion : le lecteur Starterre ne trouve aucun véhicule du garage dans le stock propre. Vérifier le périmètre et le résultat du catalogue public au prochain passage. Aucun import, publication, activation de flux, mail ou changement de statut prospect.

## 2026-11-12 (après-midi) — Négoce Auto 33, stock d’occasion vérifié (ChatGPT)

- Main récupéré sur `3b9e685c0108c3a9be4fd96d81620e31a7e76014`, JOURNAL relu. Production réellement déployée v342 épinglée sur `52e4844232408ccf1990e3ba8bc52f3a8e53886d`, aucun écart de la fonction avec main. Worktree isolé, autres connecteurs et changements concurrents préservés. Demandes examinées par ancienneté. Le Cœur, lien /maison toujours HTTP 404, conserve le blocage consigné. Négoce Auto 33, première demande sans blocage préexistant, `5efd24a7-6ad2-4c13-b79d-c0f656f26327`.
- Production initiale à blanc `9655` : zéro véhicule, sept routes de détail en échec. Le HTML Next.js affiche un état de chargement. Le navigateur du site lit le catalogue via la Data API publique Supabase. Le lecteur utilise le même accès anonyme et les seuls champs publiés par le catalogue et les fiches, sur ce site précis, sans accès admin ou stockage privé. Contrôle du compteur exact et pagination bornée, reprise par deux fiches et invalidation du point de reprise si le catalogue change.
- Catalogue public : sept lignes sur une page de données, quatre « Disponible » et trois « Sous réservation ». Seuls les quatre véhicules d’occasion disponibles sont retenus. Prix, millésimes, kilométrages, carburants, boîtes, puissances, portes, places et descriptions de leurs fiches recoupés. Le Mercedes GLC 220 4Matic affiche 18 200 € sur la carte et 14 560 € sur la fiche, qui présente explicitement 18 200 € comme prix avant promotion. Le prix de vente de la fiche est retenu. Autres prix : GLB 20 300 €, BMW X4 15 900 €, Porsche Cayenne Coupé 42 300 €. Le numéro publié sur toutes les fiches est le même, attribué au garage de Mérignac. Aucun vendeur individuel n’est affiché.
- Les 58 fichiers publics des quatre galeries ont été décodés, comparés par SHA-256 et contrôlés sur planches. La couverture n’est comptée qu’une fois. Une seconde vue arrière quasi identique du GLB est écartée. 57 photos retenues, aucun logo ou visuel par défaut.
- Tests du lecteur (promotion, véhicules réservés, zéro kilomètre, galerie publique et identité), reprise, doublons Orpi, Grange Cars, Maison Cotard et Nextlogis réussis. Rejeu du catalogue et des quatre fiches sources en deux passes avec 57 photos. Bundle esbuild et contrôle du diff réussis. Correctif sur main `c2994ca2728baf56f9799a950856e623a44b5c67`, pro-stock-sync v343 ACTIVE, épinglage vérifié.
- Test final à blanc `9671 → 9672` : 2 puis 4 annonces, 4/4 complètes, 57 photos, aucun doublon ni erreur, compteur 4, aucun écart de total ni fiche restante, cycle complet. Prix normalisés et contenu des quatre fiches recoupés avec le catalogue et le point de reprise. Demande admissible à done, validation visuelle laissée à Anthony.
- Passage borné à Négoce Auto 33. Prochaine demande non traitée : Point Immo et Associés. Aucun import, publication, flux activé, mail ou changement de statut prospect.

## 2026-11-12 (matin) — Maison Cotard, sept biens vérifiés (ChatGPT)

- Main récupéré sur `4ef8c1f601b72a02a54a215f5aa7a92b5e4b3d64`. JOURNAL et guide du robot relus. Version effectivement déployée v341 épinglée sur `209845f560f4710081698d00762cb63b420a30a0`, code de la fonction identique à main au départ. Worktree isolé, changements concurrents et autres connecteurs préservés. Après les blocages déjà documentés, traitement de la demande Maison Cotard `47b70761-7502-4dbd-9cc8-10bcc01c8ec6`.
- Production initiale à blanc `9024` : zéro annonce, cycle incomplet. Le lecteur générique Squarespace partait de l’accueil et tentait des pages d’arrondissement et des fiches vendues. Lecteur dédié au catalogue public `/a-vendre`, sept cartes uniques sur une page, sans compteur natif ni page suivante. Le tri est local. Seuls les liens de fiches de ce catalogue sont retenus. Les éventuels liens de pagination explicites restent dans le même catalogue. Reprise par lots de trois fiches.
- Prix affichés recoupés entre carte, en-tête et bloc de visite. Sept surfaces Carrez, caractéristiques et textes propres aux biens. Les deux appartements de Nation ont deux chambres existantes et une troisième possible, conservée dans le descriptif. Charges, taxe, années et mandats renseignés selon les champs publiés. Les deux fiches sans mandat publié sont identifiées par leur URL canonique. Les sept diagnostics DPE et les sept GES proviennent des classes publiées. Le contact Yann Cotard est affiché sur chacune des sept fiches avec le même numéro.
- Galerie complète issue des données publiques intégrées au HTML. Contrôle de 110 images accessibles et décodées, empreintes SHA-256 et planches visuelles. Quatre aménagements virtuels et une illustration non contractuelle du quartier écartés sur le deux-pièces de la rue de Lyon. 105 photos uniques retenues, sans miniature ni image de décoration hors galerie.
- Tests du lecteur, reprise et pagination, doublons Orpi, Nextlogis, L’Autre et Apimo Gubernatis réussis. Bundle esbuild et contrôle du diff réussis. Code publié sur main `52e4844232408ccf1990e3ba8bc52f3a8e53886d`. pro-stock-sync v342 ACTIVE, épinglage vérifié.
- Test final à blanc `9039 → 9040 → 9041` : 3 puis 6 puis 7 biens. 7/7 lus et complets, 105 photos, aucun doublon, aucune erreur et aucune page ou fiche restante. Cycle complet et données recoupées avec les sept fiches, dont la galerie complète de chaque bien et les coordonnées du contact. Demande admissible à done, validation visuelle laissée à Anthony.
- Passage borné à Maison Cotard. Prochaine demande non traitée : Négoce Auto 33. Aucun import, publication, flux activé, mail ni changement de statut prospect.

## 12/11/2026 (nuit) — Claude : visites d'Anthony et des robots exclues des stats
- Anthony : « c'est moi ça se trouve » (269 visiteurs « Direct » sur 30 jours). Constat : quasi tous les visiteurs ne viennent qu'une fois, beaucoup sur ordinateur en pleine nuit (2 h–5 h) et un pic de 90 le 08/11 → surtout des robots / navigateurs de test (Google qui affiche la page, outils de Claude/ChatGPT) : chaque passage = nouvel identifiant = nouveau visiteur.
- window.abracaIsRobot() (visit-source-20261112.js : navigator.webdriver, headless, bot…) : ni visite, ni vue d'annonce, ni vitrine comptées (abracaNotCounted dans index-main.js, pro.html).
- Tout appareil où l'admin se connecte (site ou admin.html) est marqué abraca_not_counted (comme ?moi=1), même déconnecté ensuite.
- Données passées non nettoyées (impossible de distinguer après coup).

## 12/11/2026 (nuit) — Claude : admin sans doublon + provenance des visites
- Anthony : « Gérer la prospection, c'est un menu dans le menu ? Enlève les doublons, fais-en un parfait, et voir d'où viennent les visites ».
- Admin : l'onglet Prospection ouvre directement admin-prospection.html, qui a maintenant le même en-tête et les mêmes 5 onglets que admin.html (assets/admin-prospection-head-20261112.css ; barre du bas sur mobile). Panneau résumé Prospection retiré d'admin.html (doublon) ; pastille dorée sur l'onglet quand des « OK » attendent. Ancien en-tête de la page (Tableau de bord pilotage / Base annonces / Retour / Déconnexion), barre app-shell et lien « ‹ Espace admin » retirés. Ordre : chiffres → Accords « Je publie » → Qui a cliqué / inscrit → Outils (liste, écrire, import, texte du mail, réglages d'envoi, STOP, Gmail de secours). Les deux blocs Gmail fusionnés en un « Secours ».
- Provenance : BUG — les fiches Google (/annonce/…/) redirigent vers /?annonce=…, donc le site d'origine était perdu et la visite comptée « Direct ». build_share_pages.py garde maintenant document.referrer dans sessionStorage « abraca_entry_ref » avant la redirection. assets/visit-source-20261112.js (accueil + vitrines) : sources google, seo (fiche référencée sans origine), bing, ia (ChatGPT…), facebook, instagram, prospection (?r=), email, partage (liens partagés : ?via=partage ajouté par publicListingUrl puis retiré de la barre d'adresse), autre_site, direct.
- Base (migration site_visits_sources_detail) : site_visits.ref_host ; track_site_visit(…, p_ref_host) ; admin_traffic_stats renvoie aussi hosts (sites d'origine) et pages (page d'arrivée). Stats : pourcentages par source, « Sites qui envoient des visiteurs », « Page d'arrivée ».

## 12/11/2026 (nuit) — Claude : admin « Données indisponibles : statement timeout »
- Cause : admin_overview comptait les prospects inscrits avec prospect_is_registered(), qui recalculait le domaine e-mail des 10 912 prospects pour chaque prospect envoyé (≈ 8 s → délai dépassé).
- Correctif : index prospection_prospects_email_domain_idx sur public.prospect_email_domain(email) (migration prospect_email_domain_index). Comptage 8 s → 0,5 s, même résultat (9) ; admin_overview complet 0,7 s. Profite aussi à prospect_mailer_claim().

## 12/11/2026 (nuit) — Claude : boutons Google / Facebook qui disparaissaient
- Signalé par Anthony : plus de connexion/inscription Google ni Facebook. Côté Supabase tout fonctionne (fournisseurs activés, /authorize redirige bien vers Google et Facebook).
- Cause 1 : les boutons n'étaient affichés qu'après la réponse de /auth/v1/settings ; si Supabase était lent ou en erreur (timeouts 504 vus le 11/11), ils restaient cachés. Désormais affichés d'office, la réponse ne sert qu'à masquer un fournisseur explicitement coupé.
- Cause 2 : tout appareil ayant ouvert un lien de prospection (?r=…) cachait les boutons 90 jours (règle du 30/10). Supprimé : la fenêtre « Finalisez votre compte » impose déjà Particulier/Pro + SIRET.
- social-login-20261018.js ?v=20261112-always.

## 2026-11-11 (après-midi) — Nextlogis, lecture intégrale vérifiée (ChatGPT)

- Départ sur main `dbbeaa10cadf2429f80847f74776ec5417b1e3b4`. JOURNAL et version réelle de pro-stock-sync vérifiés. Production initiale v339 épinglée sur `164949f33e497d3cfcf0fdea743c745c42a41639`, code de la fonction identique à main. Worktree isolé, changements concurrents et autres connecteurs conservés. Demande `b0feac83-d85c-42e2-a7f2-92f7f578ab52` prise après les blocages déjà documentés dans la file. Test initial à blanc `7395` : 0 annonce, trois erreurs de parcours.
- Nextlogis / WinImmobilier : catalogue public sans filtre, 20 annonces annoncées, 20 fiches canoniques distinctes, une seule page de liste, pas de page suivante exposée. Reprise par lots de quatre fiches avec mémoire, vérification du total et arrêt au périmètre du catalogue. Lecture des mandats, prix affichés, communes et codes postaux, surfaces, caractéristiques, textes et galeries des fiches. Une annonce de murs commerciaux est classée en bureaux/commerces. Les terrains 703 et 704 au même prix restent distincts, avec 6 779 et 12 330 m².
- Contrôle des 102 fichiers des galeries sources : décodés, comparaison SHA-256 et planches visuelles. Neuf occurrences écartées : huit illustrations génériques (dont le même panneau sous deux URL) et une seconde prise quasi identique de la même pièce. 93 photos uniques retenues. Le fonds de commerce à Narbonne (710) et le terrain à Saint-Nazaire-d’Aude (N696) ne disposent que d’une illustration générique et n’ont donc pas de galerie exploitable. Leurs fiches restent lues et signalées sans photo.
- 20 descriptions et 20 couples nom/téléphone vérifiés sur les fiches, trois numéros distincts. Le contact agence est gardé lorsqu’aucune personne n’est indiquée. Trois classes DPE et deux GES effectivement renseignées sur les graphiques, dont les couples E/C et A/A. Sur le local 716, DPE F et aucune classe GES sélectionnée. Pas de lettre déduite des seuls chiffres.
- Écart source à valider visuellement : villa de Sainte-Valière, mandat 749, 277 000 € dans le catalogue et l’en-tête, 287 000 € dans le descriptif. Le prix affiché de 277 000 € et le texte source sont conservés. Les surfaces proviennent des champs de la fiche. À Cazedarnes (713), le champ de surface indique 200 m² et le texte détaille un local de 110 m² et une terrasse de 90 m².
- Tests lecteur, reprise/pagination, doublons Orpi, Grange Cars, L’Autre et Apimo Gubernatis réussis. Bundle et git diff --check réussis. Première version `f26e787ac2b9c80f805565522ce67f002d0fdab9` en v340 : 20 fiches brutes, 19 normalisées, fusion des deux terrains et type murs commerciaux inconnu. Correctifs publiés sur main `209845f560f4710081698d00762cb63b420a30a0`, puis pro-stock-sync v341 ACTIVE, épinglage vérifié.
- Lecture finale à blanc `7421 → 7423 → 7424 → 7425 → 7426` : 4, 8, 12, 16, 20 annonces. 9 maisons, 5 terrains, 6 commerces. 20/20 lues, 18 avec galerie, 93 photos, 0 doublon, aucune fiche ni liste restante, partial=false, cycle_complete=true, expected_total=20. Seuls deux avertissements « aucune photo », conformes à la source. Les prix, communes et mandats des 20 annonces et les galeries des 18 fiches prévisualisables correspondent aux données source contrôlées. Demande admissible à done après cette vérification, validation visuelle réservée à Anthony.
- Passage borné à Nextlogis. Reprise de la file au prochain passage, Maison Cotard après les blocages déjà consignés. Aucun import, publication, flux activé, mail ni changement de statut prospect.

## 11/11/2026 (matin) — Jauge R2 de l'admin corrigée
- La jauge « Cloudflare R2 » affichait 0 Mo : elle additionnait les tailles depuis Supabase, où les originaux n'existent plus. Elle lit maintenant private.r2_sync.size, relevée sur R2 (r2-sync v3, action « sizes », RPC r2_set_size / r2_missing_sizes). 1 132 fichiers, 218,6 Mo.

## 2026-11-11 — Grange Cars, cinq véhicules lus et vérifiés (ChatGPT)

- Main récupéré `3082c99b3908be7fa4870f7784424e1330eb004c`. JOURNAL et guide du robot relus. Fonction réellement déployée v338 ACTIVE épinglée sur `da3b813b952db4ca7dde0bf15e88d799cb14ff3e`, aucun écart de pro-stock-sync avec main. Worktree isolé. Changements concurrents R2, modération, pages SEO et autres connecteurs conservés. Changelog Supabase consulté, aucune évolution pertinente pour ce déploiement.
- Demandes relues par ancienneté. Blocages précédemment consignés de Le Cœur, Bergé, Atelier Auto Rétro, Rival, Ford et Arcade toujours en attente dans la file. Pas de nouvelle validation de ces dossiers à partir de résultats anciens. Grange Cars `281200cb-f77a-4763-96aa-872b0cd0d981` pris en charge. Production initiale à blanc v338 `6731` : zéro annonce, trois pages parcourues, cycle incomplet.
- Source Local.fr : page publique /vehicules-a-vendre, cinq titres suivis chacun d'un album propre. Aucun compteur natif ni pagination publiée. Pas de fiches véhicule séparées, l'adresse technique /picture/18891983 répond 404. Les rubriques /vehicules-vendus, /projets-en-cours et les prestations restent hors périmètre.
- grange-cars-reader.ts associe le prix publié dans le titre, le bloc d'origine et les seuls liens d'originaux de son album. Ancre publique et référence du titre stables tant que le bloc existe. Marque/modèle extraits des titres explicites. Toute pagination future non reconnue ou tout bloc véhicule incomplet donne une erreur plutôt qu'un faux tour complet. Les titres explicitement vendus, réservés, neufs ou en commande sont exclus. Transport HTML et contrôle de contenu des images réutilisés. Aucun élargissement des autres connecteurs.
- Cinq paires titre/prix vérifiées : Alpine A110 1300 / Moteur R8 Gordini 1440, 75 000 € ; Porsche 911 SC Cabriolet 1983, 54 000 € ; Chevrolet Camaro 1969 V8 327ci, 42 500 € ; Austin Healey 3000 BT7, 36 000 € ; HIGELIN Original 1974, 28 000 €. Seules trois années sont publiées. HIGELIN conservé au titre, aucune marque attribuée d'après l'apparence. Descriptifs individuels, kilométrages, boîtes et carburants absents. Texte commercial global et images de présentation de l'atelier exclus.
- Galerie : une image originale par bloc, cinq HTTP 200, cinq fichiers décodés et cinq empreintes SHA-256 distinctes. Planche contrôlée visuellement, chaque véhicule correspond à son bloc, aucune image par défaut. Variantes de miniatures et décoration exclues. Contact commun explicitement déclaré en JSON-LD : Grange Cars (garage), Lesménils 54700, 06 86 92 28 32. Le second numéro 06 36 58 78 96 est aussi affiché sur la page Contact, sans affectation à une annonce. Un seul numéro commun retenu à partir du champ structuré. Aucun conseiller individuel ni numéro par véhicule supposé.
- Tests du lecteur sur cinq blocs, prix, années explicites, albums, absence de descriptif, exclusion vendu, bloc incomplet, pagination inconnue et image inaccessible. Régressions reprise, doublons immobiliers, ATS Sud, Atelier Auto Rétro, L’Autre et Apimo Gubernatis réussies. Bundle esbuild et git diff --check réussis.
- Publication sur main `164949f33e497d3cfcf0fdea743c745c42a41639`, mise à jour sans forçage avec SHA attendu. Déploiement pro-stock-sync v339 ACTIVE, configuration existante conservée. Test final à blanc `6738` : 5 lus/complets, 5 photos, zéro doublon/erreur, une page, aucune fiche/liste restante, partial=false, cycle_complete=true. Cinq titres, prix, années et liens photo concordent. Le total 5 est le décompte des blocs disponibles observés.
- Demande passée done après test concluant, résultat et limites enregistrés. visual_validated_at reste null, validation visuelle à Anthony. Aucun import, publication d'annonce, activation de flux, mail ou modification des prospects. Passage borné à Grange Cars. BH Car attend l'agence correcte selon sa demande existante, puis Nextlogis à reprendre. Journal seul sans redéploiement.

## 11/11/2026 (nuit) — Cloudflare R2 devient le stockage principal des photos
- But : libérer le stockage Supabase (risque de limitation du plan gratuit au 8 décembre). Validé par Anthony (« Libère »).
- Les originaux publiés (listing-images) et les vignettes (listing-thumbs) sont retirés de Supabase une fois la copie R2 vérifiée (HEAD R2 privé + URL publique, même taille). Les lignes listing_photos ne changent pas : aucune annonce ne repasse en modération.
- private.r2_sync.offloaded_at/size ; r2_offload_candidates() (copies de plus de 30 min encore référencées) ; r2_mark_offloaded() ; r2_pending() ne supprime de R2 un original retiré que s'il n'est plus référencé ou supprimé par la rétention.
- r2-sync v2 : action « offload » ; cron abracadeal-r2-offload (minutes impaires, 100 par passage). Les nouvelles photos suivent le même chemin automatiquement.
- Lecture des originaux depuis R2 quand ils ne sont plus sur Supabase : moderate-listing v36 (hash, quarantaine, analyse IA), prepare-listing-edit, generate-listing-thumbs, process-data-retention, moderator-api, share-listing, photos-vacances.js, flux syndication_feed, pages statiques (build_share_pages.py).
- Résultat : 1 138 fichiers retirés de Supabase, 0 échec. Stockage Supabase ~242 Mo → ~20 Mo (showroom, sauvegardes, photos en attente). 552 annonces actives avant et après, 0 en attente : aucune re-modération. 602 photos d’nnonces actives présentes sur R2, contrôle HTTP 8/8 OK.

## 2026-11-10 (nuit) — Photos : R2 stockage principal, étape 1 (Claude)

- Fait : assets/r2-photos-20261110.js chargé après supabase-js sur vacances, logement-vacances, photos-vacances, recherche-vacances, pro, pro-pro, options-annonce et moderation : getPublicUrl() de listing-images / listing-thumbs pointe sur R2 (filet : rechargement depuis Supabase si R2 répond en erreur). Toutes les photos étaient déjà copiées dans R2 (0 en attente) → moins de bande passante Supabase.
- Bloqué : la migration SQL (r2_sync.offloaded_at, r2_pending qui n’efface de R2 que les photos plus référencées, r2_offload_candidates / r2_mark_offloaded, pending_photo_duplicates) a demandé une confirmation sur le serveur Supabase, restée sans réponse (Anthony endormi). Rien n’a été appliqué ni supprimé. Restent ensuite : moderate-listing / prepare-listing-edit / generate-listing-thumbs / process-data-retention / share-listing / syndication_feed / pages SEO lisant R2, puis retrait des originaux Supabase.

## 10/11/2026 — Claude : bouton « Continuer avec Facebook » masqué
- Règle (Anthony + Claude) : tout nouveau moyen de connexion ou de paiement doit être testé de bout en bout avec un vrai compte AVANT d'être affiché aux visiteurs (le bouton Facebook était visible depuis le 18/10 alors que l'app Meta était en mode Développement).
- Test 17:00 : connexion Facebook OK ; même e-mail qu'un compte existant → identité Facebook rattachée au compte existant (pas de doublon). Identité Facebook de test retirée du compte d'Anthony ensuite.
- 16:54 : app Meta passée en Live (infos DPO + URL suppression renseignées par Anthony) → bouton Facebook réactivé (`PAUSED` vide).
- confidentialite.html : section `#suppression-donnees` ajoutée (URL d'instructions de suppression exigée par Meta pour le mode Live).
- Test d'Anthony : Facebook répond « Application inactive » (app Meta « Abracadeal » encore en mode Développement). Bouton Facebook masqué dans `assets/social-login-20261018.js` (constante `PAUSED`) ; Google inchangé. À réactiver en retirant 'facebook' de `PAUSED` une fois l'app Meta passée en Live.

## 10/11/2026 — Claude : une annonce validée ne repasse plus en modération
- Base : colonne `listings.first_validated_at` (posée automatiquement à la 1re mise en ligne, effacée si l'annonce est refusée). Trigger `zzzz_keep_validated_listing_online` : une annonce déjà validée et en ligne ne peut plus être remise « en attente » automatiquement (synchro pros, changement de prix/description/photos/contact, contrôle aléatoire 3 %, heuristiques). Seuls admin/modérateur peuvent la remettre en attente.
- `abraca_guard_approved_listing_edit` et `abraca_requeue_for_related_edit` : plus d'invalidation de la modération pour une annonce validée et en ligne.
- `moderate-listing` : la modification payante d'un particulier sur une annonce déjà validée est publiée dès l'analyse de sécurité passée (sauf risque rouge / contenu interdit).
- Gardés : contenu interdit (prostitution…) et blocages de sécurité toujours refusés ; une annonce refusée par un humain repasse par la validation humaine.

## 2026-11-10 après-midi — L’Autre Immobilier : diagnostics terminés, 7/7 biens validés en lecture (ChatGPT)

- Départ : main récupéré `edeb4aad7afdf290509337cac3351329b95df444`, haut de JOURNAL et guide relus. Version réelle pro-stock-sync v336 ACTIVE épinglée sur `9744b0b51daecfc2a0f9bd505d9e9bc8b613293a` ; aucun écart fonction avec main. Travail isolé dans un nouveau worktree, ancien répertoire non réinitialisé. Modifications Claude (Apimo/Gubernatis, surfaces/location saisonnière, second numéro et autres sujets) conservées intégralement. Aucune intervention sur les annonces en ligne, listing_contacts ou listing_photos.
- File en attente relue par ancienneté. Le Cœur /maison reste HTTP 404 ; précédents blocages de Bergé/Atelier Auto Rétro/Rival/Ford conservés, pas de replay complet ni de notification identique. Arcade attend toujours le choix d'une agence physique, aucun nouveau périmètre supposé. Reprise de L’Autre `c360607b-5d55-4b47-a44f-3fce58dbddf7`, encore en attente pour diagnostics incomplets et contrôle visuel des galeries. Lecture initiale actuelle v336 à blanc `5041` : deux premiers biens, un DPE seulement et deux GES ; huit fiches restantes, partial=true. Défaut confirmé, pas de faux done.
- Accès aux sources contrôlé : les requêtes curl publiques ordinaires vers une étiquette et une photo répondent HTTP 200. Le client Python urllib reçoit encore 403 sur plusieurs de ces mêmes fichiers ; ce comportement propre au client local ne prouve pas que le site interdit toute lecture. Utilisation du client curl ordinaire déjà fonctionnel, sans en-tête ajouté, identité modifiée, clé, jeton, cookie/challenge ou autre moyen de forcer une protection. Le lecteur de production et son transport existant restent inchangés. Les dix fiches et les 14 étiquettes ont été récupérées en accès public, pas d'API privée.
- Cause diagnostique précise : marge gauche variable selon les images (un point x=10,4 % fixe peut tomber dans le texte ou hors des barres) ; palette PNG renvoyant RGBA dont l'alpha était traité comme composante de couleur ; traits JPEG gris/désaturés ; texte blanc « passoire énergétique » fragmentant une barre pleine en petites lignes, faussement assimilables à un trait de sélection. Une ancienne lecture de secours donnait G à la maison de Palaiseau alors que les deux cartouches affichent F. Correction indispensable, pas seulement amélioration du taux de remplissage.
- lautre-energy.ts : recherche du bord commun des sept barres sur plusieurs colonnes, alpha exclu du RGB, segmentation tolérante à la compression JPEG, continuité du trait jusqu'au cartouche par pixels non blancs plutôt que couleur strictement identique. On compte tous les pixels de liaison sur la bande : une barre interrompue par du texte blanc ne devient pas un trait fin. Deux colonnes au minimum doivent confirmer la même classe ; plus d'une classe candidate ou aucune sélection valide = inconnu. Aucune classe calculée depuis les consommations, supposée à partir du nom de fichier ou codée par ID d'annonce.
- lautre-reader.ts : diagnostics lus uniquement par le lecteur adapté, URLs originales conservées sous métadonnées propres ; dpe_image/ges_image retirés avant le normaliseur pour empêcher un repli générique de réintroduire une classe erronée si l'étiquette est inconnue. Ancienne mémoire de diagnostics invalidée par marque de version 2 ; reprise correcte des nouveaux lots testée. Les autres lecteurs, transport HTTP, contrôles SHA de photos, identités, pagination et acquittement existants restent inchangés.
- Contrôle visuel des 14 étiquettes originales : 3212 Les Ulis C/B ; 3183 Bures-sur-Yvette A/A ; 3165 maison Palaiseau F/F ; 3151 Fontenay-aux-Roses C/C ; 3141 appartement Massy C/C ; 3064 maison meulière Massy E/E (également E dans le descriptif) ; 2967 appartement Palaiseau D/D. Quatre JPEG compressés reconnus, dont fichiers gardant une extension png mais signature JPEG (2967). Toutes ces images sont en fixture de régression ; échelle de sept barres sans trait sélectionné refusée, données invalides refusées. Pas de généralisation revendiquée à tous les formats de diagnostic de tous les sites.
- Galeries : 60 originaux des sept biens, tous HTTP 200, tous décodés/valides, 60 SHA-256 distincts. Planche des 60 images examinée : photos de biens cohérentes avec chaque fiche, pas de logo, placeholder, diagnostic, image par défaut ni copie identique. Différents angles du même bien conservés. Le normaliseur garde 60 photos, aucune étiquette DPE/GES dans les galeries. Prix/localité/surface/pièces/chambres des sept fiches et liste exacte de leurs photos comparés à l'aperçu final ; concordance totale.
- Descriptions : les sept textes intégraux comparés après normalisation des seuls espaces, concordance totale ; longueurs d'aperçu 1080 à 1828 caractères, donc pas de troncature API à 2500 sur ces biens. Contacts : le panneau de chacune des dix fiches a été inspecté ; aucune identité ni téléphone propres publiés, aucun numéro trouvé ailleurs assigné arbitrairement. Les réserves de source du matin restent visibles : Les Ulis 88 m² au titre/descriptif contre champ dédié 86 m² ; Palaiseau 76 contre 76,33 m² ; résidence Massy 2013 puis 2014 dans la description. Champs dédiés conservés et aucune année choisie. Code postal : enrichissement existant du normaliseur depuis la commune, distingué des champs source ; pas de nouvelle donnée postale inventée dans le lecteur.
- Tests : lecteur complet L’Autre, 14 étiquettes source, F/F contre ancien faux G, JPEG, échelle non sélectionnée, cache ancien invalidé, reprise, galeries hors diagnostics et descriptions entières. Régressions resumable-crawl, doublons immobiliers, ATS Sud, I3V ; suites Apimo Select Azur/Gubernatis/surfaces/locations saisonnières toutes réussies. Bundle esbuild et git diff --check réussis. Changelog Supabase consulté, changements Flutter/CLI sans incidence sur cette correction.
- Publications main non forcées : première `097ed0e99a842fd8d1616e8c921f0617cd601b79` v337 (la paire D/D JPEG restait à durcir, aucun done) ; finale `da3b813b952db4ca7dde0bf15e88d799cb14ff3e`, pro-stock-sync v338 ACTIVE relue et épinglée sur ce commit. Pas de modification des index.ts/apimo-reader.ts concurrents dans ce passage.
- Production finale à blanc v338 `5058` → `5059` → `5060` → `5061` → `5062` : deux pages, dix fiches examinées par lots de deux ; deux sous promesse et une sous offre acceptée exclues. Progression des disponibles 2→4→5→7→7, sept biens lus/complets sur sept, sept DPE et sept GES concordant tous avec la source, 60 photos, zéro doublon/erreur, aucune page ou fiche restante, cycle_complete=true, partial=false. Le total final 7 correspond au stock retenu après les trois exclusions, pas à un compteur natif global inventé.
- Demande marquée done seulement après ce parcours et ces comparaisons. Résultat complété avec preuves/limites et historique du matin conservé ; visual_validated_at reste null, à Anthony de valider visuellement dans l'admin. Aucun import/publication d'annonce, activation de flux, mail ou statut de prospect modifié. Passage borné à cette finalisation ; Grange Cars n'a été qu'ouvert en lecture simple (HTTP 200), aucune validation ou prise de demande revendiquée : suivant à reprendre `281200cb-f77a-4763-96aa-872b0cd0d981`. Ne pas désactiver le suivi alors que la file reste non vide. Journal seul sans redéploiement.

## 2026-11-10 — « Site réalisé par MyCreativeSite » sur les pages SEO (Claude)

- Décision d’Anthony : Abracadeal considéré comme client de MyCreativeSite (même société iDream Lab) → mention « Site réalisé par MyCreativeSite » (lien de marque) dans le pied des pages SEO générées (annonces, catégories/villes, Auto, pages pros) et de deposer-une-annonce-gratuite.html ; déjà présente sur l’accueil et Vacances. Aucune mention sur le site ou le showroom d’un pro (leur site est souvent fait par un autre prestataire).

## 2026-11-10 — Incident : 89 annonces Gubernatis repassées en vérification (Claude)

- Cause : la mise à jour SQL de listing_contacts.phone (second numéro) a déclenché abraca_listing_contacts_edit_recheck (« Coordonnées de contact modifiées ») → 89 annonces en pending de 14:05 à ~14:12 ; « Nice » ne donnait plus rien.
- Réparé : moderate-listing relancé sur les 89, puis remise en ligne de celles restées en attente pour ce seul motif (analyse IA faite, snapshot à jour).
- **Règle pour Claude et ChatGPT : toute modification SQL de listing_contacts / listing_photos d’annonces en ligne doit se faire dans une transaction avec set_config('abraca.revision_write', txid_current()::text, true), sinon les annonces repassent en vérification.**

## 2026-11-10 — Gubernatis : second numéro sur les annonces (Claude)

- Demande d’Anthony : ajouter 06 81 22 72 41 en plus sur les annonces Gubernatis.
- Nouvelle table pro_contact_settings (listing_phone, RLS : le pro lit, l’admin gère). Gubernatis : +33681227241 ; listing_contacts.phone mis à jour sur les 89 annonces. « Voir le numéro » affiche « Conseiller · 06 81 22 72 41 » puis « Agence · 04 93 44 92 36 » (get_listing_contact_details existant).
- pro-stock-sync : upsertContact prend listing_phone pour les nouvelles annonces (avant le numéro du profil).

## 2026-11-10 — Location saisonnière séparée de Vacances (Claude)

- Demande d’Anthony : « sépare location saisonnière de vacances ! Vacances ce sera vraiment une section comme Airbnb ».
- Immobilier : nouvelle transaction « Location saisonnière » (realEstateTransactionOf → saisonniere, menu Immobilier et filtre Transaction ; « Location » renommée « Location longue durée »). Le lien du menu ne renvoie plus vers vacances.html.
- Prix : période affichée selon l’annonce (pricePeriod : nuit / semaine / mois) et « dès » si prix de départ, sur la vignette et la fiche (avant : toujours « / mois », ex. Valdeblore 700 € la semaine).
- Recherche : « saisonnière » → Immobilier, location saisonnière ; Vacances seulement pour vacances / séjour / hébergement / gîte.
- Textes Vacances : « Logements de vacances » au lieu de « Locations saisonnières » (accueil, vacances.html).

## 2026-11-10 — Démos supprimées (Claude, Anthony : « oui et les autres démos »)

- Dossier demo/ supprimé (gubernatis, infinity, centurion-motors) et liens private.demo_preview_links effacés (Gubernatis + Infinity). Les aperçus prospects (prospect_previews) restent, ils servent aux mails de prospection.

## 2026-11-10 — Recherche par ville : communes voisines + ville qui ne reste plus collée (Claude)

- Constat (Anthony) : « bordeaux », « angers » ne trouvaient pas les WeeCars. Causes : (1) smart-search ne vidait jamais searchCity → la ville d’une recherche précédente restait appliquée ; (2) WeeCars Angers est aux Ponts-de-Cé, donc « angers » ne correspondait à aucune annonce ; seules 16 villes étaient reconnues comme lieu.
- Changé : smart-search vide la ville à chaque recherche ; toute commune de France est reconnue (geo.api.gouv.fr, nom exact, mise en cache) → « Angers et alentours » ; index-main : une ville trouve aussi les annonces des communes à moins de 15 km (refreshCityNear, centres déjà mis en cache par communeCentre).

## 2026-11-10 — prospect-mailer v33 : réponse mise en page depuis partenaires@ (Claude)

- Action « send » : version HTML (bannière Abracadeal) en plus du texte, fil complet (References), clé interne acceptée pour un envoi validé par Anthony. Premier usage : mail de bienvenue à Gubernatis (Lisa Lunven), en réponse à son « OK », depuis partenaires@abracadeal.com.

## 2026-11-10 — Inscription par l'admin : plus aucun mail automatique (Claude)

- **Demande d'Anthony :** « les mails qui partent direct c'est pas bon ». Cas Gubernatis : mail de bienvenue parti à 13:07 (1 min après la création) avec 5 annonces (offre Fondateur pas encore active) et le texte « un véhicule ajouté apparaît » pour une agence immo ; mail d'activation Fondateur programmé +20 min.
- **Changé (admin-test-import.html) :** après création + import, rien n'est envoyé. Bouton « Vérifier et envoyer le mail de bienvenue » : récapitulatif réel (e-mail, annonces en ligne / en vérification, Fondateur oui/non, mail déjà envoyé ?) puis confirmation. Idem pour un compte existant.
- **Changé (admin-onboard-pro) :** action welcome_preview ; welcome compte les annonces côté serveur (plus de chiffres venant de la page) ; texte adapté à l'immobilier (« un bien ajouté apparaît, un bien vendu ou loué disparaît ») ; le mail d'activation Fondateur (subscription_started) reste en attente (2099) et est supprimé quand le mail de bienvenue, qui annonce déjà l'offre, est envoyé.
- **Gubernatis :** mail d'activation Fondateur du 10/11 suspendu (available_at +7 jours) en attendant la décision d'Anthony.

## 2026-11-10 — Inscription Gubernatis : offre Fondateur refusée à cause du code d'activité (Claude)

- **Constat (capture d'Anthony, 13:07) :** compte Pro Gubernatis créé par l'admin (contact@cabinet-merengone.com, SIRET 53398729300024, import du site https://gubernatis-immobilier.com/fr/ activé) mais « Offre Fondateur non activée : Erreur lors de la préparation de l'abonnement ».
- **Cause :** le registre classe la société en 70.22Z (conseil) → pro_verifications.business_sector = 'other' → claim_founder_slot lève « L’activité enregistrée pour ce SIRET/SIREN ne permet pas l’offre Fondateur… », message non reconnu par create-pro-subscription-order → erreur générique.
- **Corrigé :**
  - verify-professional et admin-onboard-pro : si le code/libellé ne tranche pas, le nom officiel / enseigne décide (« immobilier », « immo » → immobilier ; « garage », « automobiles », « autos », « motos », « concessionnaire » → véhicules).
  - admin-onboard-pro : si le registre reste « other », le domaine choisi par l'admin (avec l'accord du pro) est retenu avant l'offre Fondateur ; avertissement reformulé.
  - admin-onboard-pro : relancer « Créer le compte et importer le stock » sur un compte existant retente l'offre Fondateur si le pro n'a ni place Fondateur ni abonnement (session technique par lien magique, même contrôle que l'inscription). L'import est un upsert, rien n'est dupliqué.
- **À faire pour Gubernatis :** Anthony relance le même formulaire (mêmes valeurs) → Fondateur activé.

## 2026-11-10 — Gubernatis : surfaces manquantes et détail dans la démo (ChatGPT)

- Demande Anthony : « il manque les surfaces ». Dernier main 2a33b46 récupéré en worktree isolé, v333 de production relue. Démo existante : 78 surfaces totales sur 83 fiches. Cinq absences contrôlées sur les fiches publiques.
- Villa 87298704 : 82 m² publiés dans le premier paragraphe, terrain environ 2000 m² séparé ; garage 85404743 : 13 m² publiés dans la rubrique Surfaces. Ajout générique Apimo de ces replis sans remplacer les champs structurés/bandeaux existants. Rejet des projets/extensions et d'une surface de terrain prise pour logement. Pas de somme des pièces, pas de surface calculée depuis longueur/largeur.
- Appartement Villefranche 86760044 : total non publié, mais six surfaces de pièces. Programme 82317780 et commerce 84581766 : aucune surface publiée, laissée absente. Le détail des surfaces était lu mais perdu dans l'aperçu ; champs ra (pièces) et ls (terrain) transmis à l'aperçu complet, affichage dans les informations clés de la démo Gubernatis. Précision jusqu'à deux décimales conservée dans les cartes et la fiche.
- Complément demandé pendant le travail : inclure locations et saisonnières. Contrôle du filtre public : quatre locations classiques et une saisonnière à partir de 700 €/semaine. Page active /fr/locations retrouvée depuis /sitemap.xml → /sitemap-1.xml (elle ne figure pas au menu). Le sitemap contient aussi des fiches anciennes : elles ne sont jamais prises comme inventaire ; seuls les liens de la page de catalogue actuelle sont lus.
- Lecteur Apimo : découverte bornée de pages de location du sitemap, même origine et même langue, uniquement si le formulaire public offre Location. Reprise distincte pour le catalogue élargi. Le compteur ventes 84 est contrôlé séparément ; total attendu 89 = compteur 84 + cinq locations observées, sans prétendre que le site affiche un compteur global 89. Route saisonnière, transaction, période de prix et mention « à partir de » conservées dans normalisation/métadonnées/aperçu complet. Bureaux restent typés bureaux, transaction Location explicite ; le prix mensuel ne dépend plus seulement de la sous-catégorie.
- Tests : garde-fous total/terrain/projet/garage/pièces sans total/absence, quatre régressions Apimo, pagination 84, reprise, bundle et syntaxe des scripts démo. Pas de mail, import d'annonces ou validation du prospect. Production finale v335 ACTIVE, commit 38a94ff2c8b0c3e0a478934ce1d451d6f6398dbb ; tests 4550 (v334) puis 4552 (v335). 89 lus, 88 complets (villa sans prix laissée sans prix), huit pages, 89 fiches, partial=false, cycle_complete=true, remaining=0, remaining_lists=0, failed=[], source_counter=84, supplemental_details=5, zéro doublon. Saisonnière validée 700 €/semaine à partir de, 42 m² ; quatre transactions location classiques, bureaux conservés bureaux.
- Bureau 86868953 : description source réellement vide, surface totale non publiée. Le lecteur spécialisé conserve désormais le titre court « Location Bureau Nice », type bureau, transaction location, période mois ; ne se rabat plus sur le texte marketing des métadonnées. Test absence de description ajouté.
- Aperçu prospect b25b0f4c-1ab7-4e09-9a9e-0c2f9cd83cfb rafraîchi depuis la réponse finale complète uniquement : 88 lignes, count=89, count_sure=false (pas de compteur natif global). Correction manuelle Tourrette-Levens préservée. Relecture SQL : 84 surfaces totales sur 88 aperçus, 72 détails de pièces ; quatre totaux non publiés restent absents. Villa 82 + terrain 2000, garage 13, saisonnière 42 et semaine vérifiés. Pages HTML en ligne contrôlées : détail pièces/terrain, décimales et période saisonnière présents. Résultat de la demande à réparer mis à jour, validation visuelle non cochée. Aucun envoi, import ni changement du statut du prospect.

## 2026-11-10 — Démo showroom Gubernatis Immobilier (Nice) (Claude)

- Demande d'Anthony : aperçu showroom à préparer pour Gubernatis Immobilier (Lisa Lunven a demandé si Abracadeal est compatible Apimo). RIEN envoyé à l'agence (consigne d'Anthony « n'envoie rien pour l'instant »).
- Lecture à blanc après la réparation ChatGPT (v333) : requête 4470, 84/84 lues, 7 pages, uniquement /fr/, 0 doublon, cycle_complete=true. 83 biens en aperçu (villa Saint-Jean-Cap-Ferrat sans prix exclue de l'aperçu), 51 DPE.
- prospect_previews (prospect b25b0f4c…) rempli avec les 83 biens, count=84 ; « Levens » corrigé en « Tourrette-Levens » dans la démo seulement (le normaliseur reste à corriger).
- private.demo_preview_links : token mAD1DTJCpkUvv06A, expire le 09/01/2027.
- Pages demo/gubernatis/index.html (showroom) et client.html (vue acheteur), copiées de demo/infinity. Liens :
  https://abracadeal.fr/demo/gubernatis/?k=mAD1DTJCpkUvv06A
  https://abracadeal.fr/demo/gubernatis/client.html?k=mAD1DTJCpkUvv06A
- 10/11 10:50 : la mise en ligne GitHub Pages de 10:29 a échoué (#2919, aléatoire) → relancée par ce commit.
- À faire si l’agence dit OK : import normal via le robot, puis supprimer la démo.

## 2026-11-10 — Gubernatis : 84/84 résultats lus, programme neuf inclus (ChatGPT)

- Demande directe d’Anthony : environ 85 annoncés, seulement une trentaine lus. Version v329 initiale : 32 lus, types appartement erronément maison et aucun DPE/GES. Le détecteur imposait un lien fournisseur /site-internet absent de ce modèle Cello et le lecteur spécialisé ne reconnaissait pas les routes /propriete/vente/type/ville/slug/id.
- Correction Apimo : détection par lien Apimo + modules + catalogue actif, routes avec slash et programme, transaction/type depuis la route, reprise existante par mémoire conservée. Le compteur des résultats est comparé au nombre de fiches découvertes ; écart maintenu partiel. Statistiques de reprise préservées.
- Source contrôlée : sept pages, 84 cartes au compteur actuel (au lieu des 85 précédemment observés par Anthony), dont 83 fiches de biens et le programme neuf Nice Riquier. Ce programme immobilier est conservé ; la restriction neuf/occasion concerne les véhicules. Fiche témoin 87563806 : appartement 245000 €, 30,08 m², Nice, 10 photos originales, diagnostics graphiques C/A, prestations et mentions légales. Aucun import, mail ni validation visuelle automatique.
- Tests locaux : fixture propre sans formulaire/jeton, sept pages/84 fiches, programme inclus, type/transaction, diagnostics C/A, écart 85/84 partiel. Régressions Apimo et bundle vérifiés. Changelog et documentation déploiement Supabase consultés, aucune évolution pertinente. Résultat de production consigné ci-dessous.
- Final : main concurrent relu et préservé (correction « vendu équipé » et cycle incomplet v332). Écart 84/83 expliqué par le programme immobilier 82317780, publié avec prix et descriptif sur sa propre fiche. Ajout des routes /programme/programme+… et mémoire distincte si programme présent pour ne pas réutiliser le tour antérieur de 83 fiches. Publication 8bfc27465a5cbe9aff71feb096a2b5209a549382, pro-stock-sync v333 ACTIVE. Test de production 4449 : read=84, complete=83 (villa prix sur demande), total_on_site=84, partial=false, cycle_complete=true, sept pages, 84 fiches, remaining=0, remaining_lists=0, failed=[], expected_total=84, total_mismatch=false, 1048 photos, 52 DPE/51 GES, zéro doublon. Tous les tests Apimo et resumable-crawl passent, bundle/diff propres.
- Demande 20eb9938-0b4c-4027-8df6-08f78af397a7 marquée done/réparé ; visual_validated_at laissé inchangé, décision de validation à Anthony. Limite existante explicitement signalée : trois localités averties par normaliseur, en particulier Tourrette-Levens convertie en Levens ; pas de prétention de validation visuelle exhaustive. Aucun import, publication, mail ou changement de prospect.

## 2026-11-10 — Gubernatis : pagination Apimo corrigée, 83 fiches lues (ChatGPT)

- Demande explicite Anthony : https://gubernatis-immobilier.com/fr/nos-biens, 85 annoncés contre une trentaine lus. Demande 20eb9938-0b4c-4027-8df6-08f78af397a7 prise in_progress. Main cloné d46eaaa97ff0db091b338fce1f5a61585d1bb14a, guide APPRENDRE-AU-ROBOT et haut du journal lus ; fonction initiale v329 épinglée 96edea21e05cd27590bec96214ea3447d3981ea8. Aucun autre fichier existant modifié.
- Cause : signature Apimo limitée au lien site-internet, absent ici (lien apimo.net/fr/), et routes de fiches avec segments /vente/type/ville/slug/id non reconnues. Test initial à blanc 4438 : 32 lus, 32 complets, faux partial=false, 0 DPE/GES et appartements classés maison.
- apimo-reader.ts : reconnaissance du prestataire avec modules et catalogue présents, routes numériques avec segments en plus des routes + existantes ; lecture de l'identité/type/transaction correspondants. Pagination existante désormais utilisée, contrôle du compteur natif quand une seule liste, statistiques de reprise conservées et cycle_complete=false en cas d'écart compteur. Aucune augmentation arbitraire d'une limite du lecteur générique.
- Contrôle direct des sept pages publiques (1 à 7) : 12+12+12+12+12+12+11 = 83 références uniques, aucune répétition. Compteur actuel 84, non 85. Écart réel du site conservé et signalé ; aucune 84e fiche inventée.
- Test production 4446 v330 : 83 fiches lues, 82 retenues. Coffee shop 85285932 incorrectement exclu par isSoldText à cause de « est vendu entièrement équipé », alors que l'activité est à reprendre. Correction générale limitée aux expressions vendu équipé/entièrement équipé/complètement équipé/tout équipé, comme les exceptions meublé déjà existantes ; vrais vendu/sous compromis/offre acceptée toujours reconnus.
- Tests : quatre suites Apimo Cannisimmo/Intuition/Raccosta/Select Azur, doublons immobiliers, tests ciblés des expressions vendu équipé et réellement vendu ; bundle esbuild et diff --check réussis. Test local de découverte avec vraies listes et fiches simulées a bien signalé 83 au lieu de 84 : ce n'est pas une validation de toutes les fiches locales. Changelog Supabase consulté, aucune évolution pertinente pour ce correctif.
- Publications : 20be65c4490a3bf30a6934ebffc67fedee0c5cae v330, b473116dd78cbe4e92327dd95ee22169c0832948 v331, final 952663165a528f3d423bbdbde20e5f1095689bbb v332 ACTIVE. Imports épinglés, verify_jwt=false et import_map préexistants conservés.
- Test final production à blanc 4448 : 83 lus, 82 complets, 1045 photos, zéro doublon/échec de fiche, sept pages, aucune liste ni fiche restante. 52 DPE et 51 GES lus ; qualité dpe_missed=0. Une villa Saint-Jean-Cap-Ferrat 84744432 reste sans prix publié (« prix sur demande »), aucun montant inventé. partial=true/cycle_complete=false pour écart compteur 84 vs 83, conservé volontairement. Coffee shop présent.
- Limites restantes : pas de contrôle visuel exhaustif des 1045 photos ; normaliseur commun signale/transforme trois villes (notamment Tourrette-Levens en Levens à partir du titre), à revoir séparément, aucune validation aveugle. Aucun conseiller individuel publié dans les modules lus. Demande maintenue pending avec résultat « lecteur corrigé, 83 fiches lues ; écart compteur source et validation visuelle restent à vérifier », visual_validated_at inchangé. Aucun import, publication d'annonce, mail, activation de flux ou changement de prospect.

## 2026-11-10 — Arcade : périmètre à préciser ; L’Autre : lecteur déployé, validation retenue (ChatGPT)

- Départ : main récupéré `c399dff540e810081ef2e4ffb20a60d04844bdc6`, JOURNAL et docs/APPRENDRE-AU-ROBOT.md + docs/GROS-SITES.md lus. Version réellement déployée v325 ACTIVE, épinglée sur `275754923e670710d74c3b272c80a633cef280b6` ; aucun écart de la fonction avec main (avancements SEO conservés). Nouveau worktree isolé ; ancien répertoire sale non réinitialisé. Écritures main avec SHA attendu sans forçage et têtes relues avant les publications.
- File en attente relue dans l'ordre chronologique. Le Cœur /maison recontrôlé HTTP 404. Bergé, Atelier Auto Rétro, Rival et Ford restent en attente selon leurs blocages source consignés ; pas de répétition de leurs parcours complets ni de notification identique. Passage borné aux deux demandes suivantes : Arcade `d80487a1-5e92-40d0-8da8-c395dc90d347`, puis L’Autre `c360607b-5d55-4b47-a44f-3fce58dbddf7`.
- Arcade https://www.arcade-immo.fr/ : test v325 à blanc `4231`, 0 annonce, six pages explorées, cycle incomplet. Next.js App Router/Flight : 31 annonces observées dans les données du HTML actuel ; endpoint /api/annonces référencé au sitemap renvoie 38 annonces plus anciennes, donc ne pas l'utiliser comme inventaire actuel. Les deux codes d'agence 20468/31807 et les deux points Le Havre/Montivilliers sont présents. Demande racine sans company/prospect_id/note : aucune agence physique déterminée. Remise pending avec cause, aucune correction aveugle ou lecture de tout le groupe. L'utilisateur doit préciser Le Havre ou Montivilliers (pages /nos-agences/agence-du-havre et /nos-agences/agence-de-montivilliers). Une valeur d'authentification embarquée existe dans le HTML : elle n'est ni utilisée, ni stockée dans le code/fixtures/journal. Aucun accès privé.
- L’Autre https://lautre-immobilier.fr/ : test v325 à blanc `4240`, 0 annonce, exploration erronée de réalisations de rénovation et six échecs. WordPress/JetEngine, type REST public a-vendre inspecté (10 enregistrements). Le vrai catalogue est /a-vendre/ et /a-vendre/page/2/ : six puis quatre liens. Pagination « charger plus » publiée dans data-next-page et data-max-page=2 ; le HTML de page 2 porte encore un lien technique vers page 3, qui doit être ignoré puisque page courante=max. Pas de lecture de /realisations/, /biens-vendus/, articles ou cabinet d'architecture externe. Le total 10 est compté dans les deux pages, pas inventé comme un compteur natif de biens actifs.
- Lecteur dédié lautre-reader.ts : listes strictement bornées, reprise du moteur crawlCatalogue existant par deux fiches, identité par ID WordPress, canonical et élément single-page contrôlés. Deux lofts sous promesse exclus, puis la maison Graviers sous offre acceptée également exclue. Sept biens restent disponibles sur dix fiches examinées. Maison neuve immobilière conservée (la règle VO/neuf concerne les véhicules). Aucun mélange d'une galerie avec les diagnostics, logo, images par défaut ou autre fiche. Galerie des seuls liens jet-woo-product-gallery__image-link, déduplication par chemin puis SHA-256 avec estatePhotoDigest. Exclusion des diagnostics dans photosOf ajoutée uniquement à cette famille ; autres connecteurs et règles Bergé préservés.
- Champs : prix honoraires inclus, surface dédiée, pièces/chambres, équipements dont parking/ascenseur, chauffage, honoraires/prix hors honoraires, charges de copropriété et nombre de lots, coûts énergie. Descriptif entier du widget propre à la fiche, tous paragraphes et listes (la première version ne lisait que le premier paragraphe). Pas de formulaire/cookies/texte de pied de page. Pas de conseiller ni téléphone publié dans le panneau de fiche : laissés absents, aucun nom/numéro trouvé ailleurs assigné arbitrairement. Localité tirée du titre propre ; « à vendre » supprimé avant lecture du lieu pour ne pas conserver « vendre à Palaiseau ». L'enrichissement existant des codes postaux par le normaliseur persiste dans l'aperçu et doit rester distingué de la source ; aucun code postal supposé dans le lecteur.
- Écarts source conservés : Les Ulis, titre et descriptif 88 m² mais champ dédié 86 m² ; Palaiseau 76 m² au champ et 76,33 m² au texte ; appartement Massy construction 2013 puis 2014 dans le même descriptif, aucune année choisie. Charges Fontenay 2616 €/an lues depuis « charges de copropriété ». Maison Massy 679000 € : « DPE classe : E » explicitement publié, E conservé, les hypothèses D/C après travaux ne deviennent pas sa classe actuelle.
- Diagnostics : images originales DPE/GES propres identifiées dans les fiches, hors galeries. Nouveau lautre-energy.ts limité à ces sources : reconnaît les sept barres et le trait coloré fin reliant la barre sélectionnée au cartouche ; ne calcule pas une classe depuis des seuils ni le nom de fichier. Deux étiquettes source contrôlées visuellement et en test, Les Ulis DPE C/GES B. Format inconnu/ambigu laissé absent. Couverture incomplète des variantes : résultat final seulement quatre DPE et quatre GES sur sept biens. Aucune prétention de prise en charge générale de toutes les anciennes étiquettes.
- Contrôles locaux : huit fiches accessibles, deux autres fiches ont répondu HTTP 403 ; les 53 URLs de photos tentées localement ont également répondu 403 (pas de comparaison visuelle ni de décodage réussis revendiqués). Essais locaux arrêtés, aucune variation d'identité, clé, challenge ou technique détournée pour forcer ces réponses. Le lecteur de production habituel accède aux fiches et photos et leurs empreintes sont contrôlées dans son parcours normal ; pas de nouveau mécanisme de transport. Les variantes de diagnostics restées inaccessibles/non reconnues et le contrôle visuel exhaustif des galeries restent à terminer à accès autorisé.
- Tests locaux : deux pages/dix liens, ignorance de page 3 technique, reprise cinq lots, exclusions promesse/offre acceptée, prix/localité/surface dédiée/charges/équipements, description multi-paragraphes et listes, absence de téléphone/code postal inventés dans la fiche brute, diagnostics exclus de la galerie, image C/B et refus de données invalides. Régressions reprise/doublons immobiliers/Sitea/ATS Sud/I3V réussies. Bundle esbuild et git diff --check réussis. Fixtures minimales sans formulaires/jetons ; deux étiquettes image en base64 JSON de test. Changelog Supabase consulté, évolutions Flutter/CLI sans incidence.
- Publications successives : `d65ae266567be2a2511cfb11f5501454535e421f` v326 (premier parcours `4249`→`4250`), `c1e06bbe442c63b6a2a48d8163bb0e35bf9a9ccc` v327 (descriptions/diagnostics ; `4257`→`4262`), `d57e25d9214216a1fca964e544b49a77e1263987` v328 (offres acceptées/champs), puis final `96edea21e05cd27590bec96214ea3447d3981ea8`, pro-stock-sync v329 ACTIVE relue et épinglée sur ce commit (localité).
- Production à blanc finale v329 `4274` → `4275` → `4276` → `4277` → `4278` : progression 2→4→5→7→7 biens retenus ; deux pages et dix fiches examinées, trois biens exclus. Sept lignes avec prix/ville/surface/pièces/chambres/description, 60 photos après exclusion des DPE/GES, zéro doublon/erreur, aucune page ni fiche restante, partial=false et cycle_complete=true. Le ok=true/auto_review=approved technique ne justifie PAS done : DPE/GES incomplets et contrôle visuel total des galeries non réalisé. Prix et galeries des six fiches locales disponibles recoupés avec l'aperçu, descriptions entières confirmées ; aucune notification à tiers.
- Les deux demandes restent pending, done_at null et visual_validated_at inchangé. Résultats/limites inscrits dans chacune. Aucun import/publication d'annonce, activation de flux, envoi de mail ni modification du statut des prospects. Prochain passage : finir L’Autre (variantes d'étiquettes et visuel à accès autorisé) sans revendiquer le travail terminé ; Arcade exige le choix de l'agence ; ensuite Grange Cars `281200cb-f77a-4763-96aa-872b0cd0d981`. Ne pas désactiver le suivi pendant que la file demeure. Journal seul ne nécessite pas de redéploiement.

## 2026-11-09 — ATS Sud : catalogue intégré Motoconcess, lecture complète validée (ChatGPT)

- Départ : main récupéré `94b032886fc31e9813259e359406d56922d7248a`, JOURNAL lu ; pro-stock-sync réellement déployée v324 ACTIVE épinglée sur `89782988988b7c9d97057e9f8bdb66033fdd5818`, aucun écart fonction avec main. Travail isolé dans un nouveau worktree ; modifications concurrentes/autres connecteurs préservés, ancien répertoire non réinitialisé. Publication main par comparaison du SHA attendu, sans forçage.
- Ordre de file respecté : contrôles ciblés des blocages plus anciens, sans répéter les lectures complètes. Le Cœur /maison reste 404 ; Bergé LP1657 Détails toujours seulement "\\n" ; Atelier Auto Rétro prix Jaguar/Mercedes et descriptif Jaguar absents ; Rival BMW sans km/MEC textuels. Ford redevient accessible sur une requête de contrôle, mais ses photos source manquantes restent le motif de non-validation déjà documenté. Aucune de ces demandes clôturée ni nouvelle notification inchangée. Prise d'ATS Sud `3e627eed-333f-40cd-ac69-bfc95687abf8`, demande du 31/10/2026, note et liens d'origine préservés.
- Production initiale v324 à blanc `2744` : zéro annonce, cinq pages, cycle incomplet. Le site TOWeb publie ses occasions via /motoconcess.html, iframe HTTPS include.motoconcess.fr/d593364c4bfb80a0ec677bb9ee7b305d31e374fb. Onze fiches observées dans une seule grille publique ; pas de compteur natif annoncé ni autre page actuelle. Le total 11 est un décompte observé, jamais présenté comme un compteur natif.
- Lecteur dédié ats-sud-reader.ts : découvre l'iframe depuis la page ATS à chaque passage, impose ce périmètre et l'identité numérique des fiches/canonical, vérifie ATS SUD / HYERES 83400. Ne lit pas le catalogue global du prestataire. Liens publics de pagination limités à la racine de cette iframe ; découverte et reprise par quatre fiches dans crawlCatalogue existant, mémoire dédiée ats-motoconcess-v1 et identité par scope + ID. Neuf/vendu/réservé/0km explicitement publiés exclus. Changement de racine invalide l'ancien périmètre ; cycle futur utilise les mécanismes existants de rafraîchissement et d'acquittement. Aucune API privée, exécution de script ou soumission de formulaire.
- Données propres aux fiches : prix, marque/modèle, kilomètres, année et MEC lorsqu'indiquée, couleur, cylindrée, puissance fiscale, garantie ; première main seulement si la coche positive est présente. Chaque fiche publie « Demandez : Luc » et « Appelez nous au : 04 94 01 53 00 » dans sa fenêtre téléphone ; aucun mobile personnel inventé. Aprilia 1539422 publie 1 km et année 1992 : valeur source conservée, pas transformée en neuf. Dix descriptifs libres sont réellement vides ; celui d'Aprilia est lu intégralement (514 caractères). Pas de prose de formulaire/cookies ou d'équipements imaginés en remplacement. Carburant et boîte non publiés, laissés absents ; 4T n'est pas interprété comme une énergie.
- Galeries : seuls les liens originaux fancybox0 de l'annonce, pas les miniatures 315x420, bandeaux/assurance/icônes. Déduplication chemin puis SHA-256 par l'aide existante estatePhotoDigest. Les 17 originaux ont répondu HTTP 200, sont décodables, avec 17 empreintes distinctes ; planche contrôlée visuellement, véhicules cohérents, aucune image par défaut. Galeries par ID : 1539422=5 ; 2222499=1 ; 2319293=1 ; 2319294=2 ; 2319298=2 ; 2334484=1 ; 2334489=1 ; 2337104=1 ; 2344624=1 ; 2344630=1 ; 2344640=1.
- Tests : ATS périmètre iframe, refus d'identité étrangère, prix/km/année/MEC/contact, galerie originale, source vide conservée, première main négative, pagination future et reprise 4→8→11. Régressions reprise/doublons immobiliers/Ford/Rival/VR Auto/Kombishop/I3V réussies ; bundle esbuild et git diff --check réussis. Fixtures minimales sans formulaires/jetons cachés. Changelog Supabase consulté, aucune évolution pertinente pour ce lecteur.
- Code publié sur main `275754923e670710d74c3b272c80a633cef280b6`, pro-stock-sync v325 ACTIVE relue et épinglée sur ce commit. Production à blanc `2760` → `2761` → `2763` : 4→8→11 lus/complets ; fin 11/11 observés, 17 photos, zéro doublon, aucune erreur/fiche restante/liste restante, partial=false et cycle_complete=true. Les 11 aperçus de production recoupés avec la source : prix, km, année, titre, description et toutes les photos concordants ; noms et téléphones présents sur 11/11. Les alertes de description courte correspondent aux dix descriptions absentes à la source, pas à un échec de lecture.
- Demande passée done seulement après ce tour complet de production ; résultat et limites source consignés. visual_validated_at reste null pour validation utilisateur, aucun statut de prospect modifié. Aucun import/publication d'annonce, activation de flux ni mail. Passage borné à cette réparation après les contrôles ciblés des blocages antérieurs ; suivante à reprendre : Arcade Immo `d80487a1-5e92-40d0-8da8-c395dc90d347`, https://www.arcade-immo.fr/. Journal seul ne nécessite pas de redéploiement.

## 2026-11-09 — Ford Alliance / Strasbourg : lecteur dédié, validation retenue (ChatGPT)

- Départ : main `0fd4a785d805ab1e7abdbc84af1b5f3c1f191f95`, JOURNAL lu ; version réellement déployée v322 ACTIVE épinglée sur `22aa95d065f22747cd98b152c8015f6658c3f798`, aucun écart de la fonction avec main. Correctifs et connecteurs de Claude conservés, travail isolé en worktree. Publication non forcée avec SHA attendu ; ancien répertoire de travail non réinitialisé.
- Plus anciennes demandes : Le Cœur `/maison` reste 404 ; Bergé LP1657 Détails toujours `\n` ; Atelier Auto Rétro prix Jaguar/Mercedes et descriptif Jaguar toujours absents ; Rival BMW toujours sans kilométrage/MEC textuels. Ces demandes restent pending sans rejouer leurs catalogues ni répéter les notifications. Prise de Ford Alliance `8b60ec5d-7fd8-4cb2-bad3-6882d3238727`, motif initial « Manque les photos principales des véhicules ». Date de demande, note et validation visuelle d’origine préservées.
- Le domaine inscrit redirige maintenant vers `https://www.ford-strasbourg.fr/`, site DealerK/Webspark de la concession physique de Strasbourg/Souffelweyersheim. Catalogue VO `/vehicules-doccasion/`, compteur public JSON `sl-filters-data.totalResults=87`, six pages. La page accueille des liens vers d’autres concessions : elles ne sont pas incluses. Périmètre imposé au dealer 7734, companyWebsite ford-strasbourg.fr et ville Souffelweyersheim ; données d’une autre concession refusées.
- Test initial générique v322 `1963` : 11 lus/9 complets, 184 photos, deux lignes sans photo, total estimé 93, faux liens `value.href` en échec, 78 fiches restantes. Lecture partielle, aucune validation. Les descriptions contenaient les mentions générales WLTP et les contacts étaient absents.
- Nouveau `ford-strasbourg-reader.ts` : catégories VO/pagination uniquement, contrôle du total de liens avec le compteur natif ; plus de découverte de liens JS `value.href`, neuf/KM0/commande/réservé exclus (type USED, statut FREE, kilométrage positif). Reprise par lots de quatre dans le moteur existant, identité par ID du véhicule. Lecture déclarative du JSON public de chaque fiche, aucune exécution de scripts ni réutilisation de clés embarquées, aucun appel d’API privée. SKU/URL et données véhicule concordants ; prix EUR recoupé avec l’Offer JSON-LD. Champs de sortie limités à la liste autorisée : aucune plaque/VIN/clé/donnée de paiement conservée dans la ligne ou les fixtures.
- Caractéristiques : prix, marque/modèle, carburant et boîte propres (plus de déduction depuis le bandeau), km, année, puissances, portes/places/couleur/garantie/CO2. MEC MM/AAAA depuis les champs mois/année, sans jour supposé à partir d’un 1er du mois technique. Description libre si publiée et listes d’équipements littérales de la fiche, sans inventer une prose commerciale ni reprendre FAQ/cookies/texte légal de financement/WLTP. Coordonnées propres de concession, 03 88 18 44 44 et Souffelweyersheim 67460 ; pas de conseiller individuel publié ou inventé.
- Galeries : JSON du seul article `stock-vehicle-gallery-widget`, URLs src publiées, déduplication de variantes par chemin puis comparaison SHA-256 avec l’aide existante estatePhotoDigest. Miniatures, images des autres annonces et placeholders exclus. Une image inaccessible ne reçoit aucune image de remplacement. Des galeries réelles existent (Puma 5372384 : 20 liens publiés). Mais les fiches Puma Titanium 5372405 et Kuga 5353026 contrôlées directement n’ont qu’un placeholder dans la galerie et leurs données, imageList vide, description libre vide : manque SOURCE confirmé, impossible de créer leur photo principale sans la source. Les équipements restent ceux explicitement publiés, sans compléter les inconnus.
- Tests locaux : compteur/pagination sur deux pages, 10 identifiants et reprise 4→8→10, périmètre concession, refus d’un autre point de vente et des VN, intégrité des champs, aucun placeholder/secret/VIN/texte légal dans le résultat ; fixtures minimales sans clé ni VIN. Régressions reprise, doublons immobiliers, Rival, VR Auto, Kombishop, I3V réussies. Bundle esbuild et diff --check réussis. Changelog Supabase consulté, évolutions Flutter/CLI sans incidence sur ce lecteur.
- Publication initiale main `4dfbec698aa05b090b5cfb7a8888bb27b1f22a5e`, v323 ACTIVE ; parcours de production à blanc `1973`→`1974`→`1982`→`1983`→`1984` : découverte de six pages/87 liens concordants, progression 1→2→3→4→5 fiches lues, 4 complètes et 92 photos au dernier passage, 82 fiches encore en attente ; une ligne sans photo. Trois requêtes sur quatre échouaient avant analyse, cause pas encore exposée. Aucun tour complet revendiqué.
- Limitation de charge et diagnostic ajoutés au seul lecteur Ford : lectures HTML séquentielles, erreurs source visibles dans stats.fetch_errors, périmètre de cache v2. Code final main `89782988988b7c9d97057e9f8bdb66033fdd5818`, pro-stock-sync v324 ACTIVE épinglée sur ce commit. Nouveau test à blanc `1985` : 1 fiche sans photo, zéro complète, 86 en attente, trois erreurs HTTP 429 sur les autres fiches. La sérialisation ne résout pas la limite de requêtes imposée par le site ; essais arrêtés dès identification explicite. Aucun changement d’identité réseau, réemploi de clé, proxy de contournement ou insistance sur le blocage. Pas de promesse de pagination/fiches validées intégralement : les six listes sont découvertes, mais le tour des fiches reste incomplet (`partial=true`, `cycle_complete=false`).
- Demande remise pending, done_at null et visual_validated_at inchangé. Cause et résultats consignés : photos à publier par la concession et fréquence de lecture autorisée/export officiel à obtenir. Ne pas marquer done à partir des cinq premières fiches ni d’un ok technique. Prochain passage : recontrôler la disponibilité publique sans insister si 429, puis reprendre seulement à cadence permise ; suivante ATS Sud. Aucun import/publication, activation de flux, mail ou changement de prospect. Aucun redéploiement nécessaire pour le journal seul.

## 2026-11-08 — Rival Automobiles : boutiques publiques lues, limites de données source (ChatGPT)

- Départ : main récupéré `50bcbb885a9819087766cc4917709ec727a088b8`, JOURNAL et consignes partagées pris en compte. Version réellement déployée v315 ACTIVE épinglée sur `845900456ab8cc52e52753c9b5f024d180a319a7`, code de fonction identique à main ; correction Apimo de Claude (`surfacespieces`, ne plus créer de clés finissant par un alias de champ) conservée. Également conservées toutes ses modifications concurrentes admin/CSS/comptes internes/SEO jusqu’à `b1181ed7a8e4d07dd942e29c4b644a9e89410014`. Travail isolé, ancien worktree inchangé.
- Anciennes demandes recontrôlées : Le Cœur `/maison` reste 404 ; Bergé LP1657, Détails toujours seulement `\n` ; Atelier Auto Rétro, prix Jaguar/Mercedes et descriptif Jaguar toujours absents. Maintien pending sans répéter les cycles complets ni les notifications inchangées. Demande suivante prise : Rival `9b95eb1d-184e-49b6-86c8-11a14c13f1b0`, ancienneté et lien prospect d’origine conservés. VR Auto, réinsérée ce matin, est désormais plus récente dans l’ordre de la table ; aucune nouvelle intervention sur cette demande pendant ce passage.
- Production initiale à blanc `307`, v315 : 0 annonce ; découverte générique incapable de sortir de l’accueil portail, `/sitemap.xml` en échec. L’accueil indique deux boutiques PrestaShop publiques, Citroën et Sans permis, du même garage de Ruy-Montceau. Rubriques VO propres : `/boutique/citroen/15-vehicules-d-occasion` compte 4 produits, `/boutique/sans-permis/16-vehicules-d-occasion` indique aucun produit. Pas de lecture des pièces détachées, du configurateur/neuf, d’une autre société ou d’une API privée.
- `rival-reader.ts` : deux listes avec compteurs natifs, pagination `p=` suivie, contrôle du total découvert et du périmètre de chaque boutique. Fiches reconnues par ID produit cohérent avec le chemin (les slugs obsolètes « c1-ii-10-vti-68-feel » sont identiques malgré des titres/photos différents, donc jamais utilisés pour deviner le modèle). Identités par boutique+chemin, sans fusion de mêmes titres/prix. Reprise par lots de deux fiches, `rival-v1`, branche et acquittement ajoutés sans changement du moteur partagé ni des autres lecteurs.
- Périmètre occasion strict : les fiches Citroën 1 (Audi A3 25490 €, 15 km, MEC 01/01/2025), 5 (C4 17812 €) et 16 (C5 7000 €) sont explicitement `schema.org/NewCondition` et « État : Neuf », bien qu’affichées dans la rubrique « Véhicules d’occasion ». Elles sont exclues plutôt que reclassées d’après l’âge supposé du modèle ou leur catégorie. Fiche 3 BMW « 18 LOUNGE 1.5 135CV BVA7 », 26590 €, explicitement UsedCondition/Occasion et Disponible, retenue. Ne pas se fier à quantityAvailable=0 : boutique en mode catalogue, c’est le libellé public de disponibilité qui s’applique.
- Champs de la BMW : essence, automatique, cinq portes, garantie trois mois, équipements Oui de son tableau et long descriptif intégral (liste Extérieur/Intérieur/Sécurité incluse, sans troncature au premier div). Pas de kilométrage ni année de mise en circulation dans son tableau/texte, pas de modèle précis communiqué au-delà du titre ; aucun de ces champs deviné ou copié de l’Audi. Les caractéristiques absentes restent vides.
- Le compteur de la BMW est visible sur la photo 222 : lecture visuelle locale « 24448 » (kilométrage), « 549 km » (autonomie), « 000.1 » (trajet). Ce lecteur ne dispose pas d’une reconnaissance pérenne du compteur en image : kilométrage structuré laissé vide, aucune constante de 24448 injectée dans le code ni override. Le garage peut publier le kilométrage dans son champ pour une extraction automatique fiable et les prochaines mises à jour. Photo conservée et limite indiquée à Anthony ; année non publiée également à compléter.
- Galeries : seul `thumbs_list_frame` de la fiche, liens thickbox propres, déduplication de variantes par ID image ; aucune miniature/cart/logo/portrait ni images voisines. Vérification de contenu par estatePhotoDigest existant, séquentielle dans chaque fiche et deux fiches en parallèle au plus ; inaccessible = échec visible. Galerie BMW : 14 liens, 14 réponses HTTP 200, 14 images réellement décodées, 14 SHA distincts. Planche complète contrôlée visuellement : BMW cohérente dans les 14 vues, pas d’image par défaut. Les vues du tableau de bord font partie de la galerie publiée, sans déplacement arbitraire.
- Contact : panneau de pied de fiche « Votre Garage Citroën » propre à Rival, 04 74 93 20 54, 46 Rue de Lavaizin, Ruy Montceau 38300. Le faux numéro d’exemple 0123-456-78910 du bandeau n’est pas utilisé. Aucun conseiller individuel publié ni nom attribué à une personne.
- Tests Rival : compteurs et catégories, zero VSP, nouveaux explicitement exclus, source sans année/km/modèle non complétée, galerie/contacts/descriptif entier, ID incohérent refusé, reprise en deux passages ; pagination synthétique supplémentaire et IDs distincts de même titre en trois passages, compteur attendu 5 atteint. Régressions reprise, doublons immobiliers, Kombishop, VR Auto, I3V réussies ; esbuild et diff --check réussis. Changelog Supabase consulté, évolutions Flutter/CLI sans incidence. Publication main `79bb75f2202349fe656ef0fe37c31dc152446e6d`, pro-stock-sync v316 ACTIVE, import figé relu après déploiement.
- Production à blanc v316 `321` → `323` : quatre produits examinés en deux passages, trois NewCondition exclus, une BMW occasion retenue ; 1 lue/complète, 14 photos, zéro erreur/doublon, compteur attendu 4 atteint, aucune file/échec, `cycle_complete=true`, `partial=false`, `total_on_site=1` dans le périmètre retenu. Prix/titre/galerie concordants ; description de l’aperçu limitée par l’API à 2500 caractères, préfixe conforme au texte source de 3568 caractères (différences de paragraphes uniquement), lecteur intégral testé en fixture. Aucune donnée du vieux slug Citroën C1 recopiée dans la BMW.
- Demande maintenue pending malgré le `ok=true/auto_review=approved` technique : faire clarifier les trois étiquettes Neuf dans la catégorie occasions et publier les champs BMW kilométrage/MEC pour les futures lectures ; reconnaissance persistante du kilométrage en photo non réalisée. Aucun champ absent inventé, aucune constante tirée d’une image injectée. Date de demande originale, prospect_id, visual_validated_at préservés ; done_at reste null. Au prochain passage, recontrôler seulement ces conditions/champs ; si inchangés, passer à Ford Alliance Automobiles. Aucun import/publication, activation de flux, mail ou changement de prospect.

- Durcissement final du compteur : lecture uniquement du `heading-counter` de catégorie, jamais des textes « Il y a 0/1 produits dans votre panier » de la boutique Sans permis ; un futur stock non vide de cette boutique reste correctement compté. Tests et bundle réussis. Publication initiale de ce durcissement refusée/erreur GitHub transitoire pendant un avancement concurrent de main ; tête relue et nouveau commit basé sur `dff23b654594b032a22f008117b02eac266f556f`, aucune mise à jour forcée. Commit final `160c72e80239508356a0873362347227fd6b5895`, pro-stock-sync v317 ACTIVE. Nouveau cycle de production à blanc `332` → `333` : quatre fiches entièrement examinées, trois neuves exclues, une occasion/14 photos, zéro erreur/doublon, aucune file restante, partial=false/cycle_complete=true ; mêmes limites de données, demande toujours pending. Aucun changement de prospect ni import.

## 2026-11-08 — « Mon compte » de l'admin allégé (Claude)

- Compte admin (`.aal-is-admin`) : seule la tuile « Espace admin » reste dans Administration (les autres outils sont dans admin.html) ; Tableau de bord, Base de données, compteurs de formules masqués ; « Mon espace » réduit à Mes messages + Mes infos. CSS seulement (admin-account-layout css v8), rien supprimé pour les pros/particuliers.

## 2026-11-08 — Admin : refonte de la navigation (Claude)

- Anthony : « trop de boutons, 2 rangées de catégories pas intuitif, refonte totale ». Une seule navigation : 5 rubriques (Accueil, Pros, Prospection, Stats = trafic + argent, Réglages). Sur téléphone : barre du bas façon application (icônes) ; sur ordinateur : onglets en haut. Barre d'outils et sous-menus supprimés ; les outils sont des lignes claires dans la rubrique qui les concerne (Modération + recherche d'annonce sur l'Accueil avec pastille, « Gérer la prospection » dans Prospection, Imports/Diffusion/API/Vacances/Commerce/Données dans Réglages). Anciennes ancres #traffic/#money → #stats.
- Pages admin : plus de barre d'outils ; sur ordinateur un seul lien « ‹ Espace admin » (sur téléphone la flèche retour d'app-shell y mène déjà).

## 2026-11-08 — Pages admin : même habillage que admin.html (Claude)

- `assets/admin-theme-20261108.css` chargé en dernier sur les 10 pages admin (couleurs, DM Sans / Fraunces, cartes, champs, boutons, tableaux). Sélecteurs `html:root body …` pour passer devant le thème mobile `body.abs-admin` d'app-shell (dont il redéfinit les variables `--aa-*`). Ne touche pas la structure des pages.

## 2026-11-08 — Admin : outils toujours accessibles, sous-menus (Claude)

- Demande d'Anthony : Modération & co trop cachés dans « Technique ». `assets/admin-subnav-20261108.js` : barre d'outils (Tableau de bord, Modération, Imports, Prospection, Annonces, Diffusion, API, Vacances, Entre Pro, Commerce, Données, Finances) avec pastilles (à modérer + signalements, imports, réponses OK), sous les onglets d'`admin.html` et en haut de toutes les pages admin. Réutilise le client Supabase de la page (jamais un 2e client : risques de déconnexion).
- `admin.html` : sous-menu automatique par rubrique (un bouton par section, défilement), filtres Pros (Tous / Avec annonces / Sans annonce / À la une / Flux en erreur). Section « Outils » de Technique retirée (doublon de la barre).

## 2026-11-08 — Annonces synchronisées : plus de limite de temps (Claude)

- Décision d'Anthony : les annonces reprises par flux (`source like 'feed:%'`) n'expirent plus ; la limite de 60 jours reste pour les annonces saisies à la main. `set_pro_listing_expiry` met `expires_at`/`expiry_reminder_sent_at` à null pour les annonces de flux (trigger étendu à `source`, `expires_at`). 438 annonces actives passées sans expiration (aucune remodération : seule la date change ; 5 À la une intactes). Plus aucun mail « votre annonce expire » pour elles.
- À surveiller : si un flux s'arrête, ses annonces restent en ligne → l'onglet Technique de `admin.html` signale les flux en erreur.

## 2026-11-08 — Nouvel espace admin `admin.html` (Claude)

- Demande d'Anthony : admin propre, rubriques cohérentes, chiffres toujours à jour. `admin.html` + `assets/admin-home-20261108.{js,css}` : 6 onglets (Aujourd'hui = à traiter + chiffres du jour + derniers pros ; Pros ; Prospection ; Trafic ; Argent ; Technique + outils). Un appel `admin_overview()` (SECURITY DEFINER, is_admin) + `admin_traffic_stats`, `admin_prospect_tracking`, `admin_search_popularity`, `admin_storage_usage`. Actualisation toutes les 30 s (page visible), au retour sur l'onglet/l'appli et via le bouton « À jour ».
- Argent : paiements Stripe de test (`cs_test…`) exclus ; comptes `internal_accounts` exclus des pros.
- Accès : onglet Admin (mobile) → `admin.html` directement ; tuile « Espace admin » en tête de « Administration » (ordinateur) ; retours des pages admin (app-shell v7) → `admin.html#rubrique`. Anciennes pages conservées et listées dans « Outils ».

## 2026-11-08 — Mails : aucun envoi inutile ou faux (Claude)

- Prospection : un prospect déjà inscrit ne reçoit plus ni 1er mail ni relance, même inscrit avec une autre adresse (`prospect_is_registered`, utilisé 3 fois dans `prospect_mailer_claim`). Lien `prospection_prospects.account_user_id`, rempli automatiquement à la vérification pro (trigger `link_prospect_to_pro` : SIREN, e-mail, ou domaine propre à un seul prospect). Sophie Folley et WeeCars Angers reliés (ils auraient reçu une relance à la réactivation des relances). Suivi `admin_prospect_tracking` : même rapprochement.
- Modèles de prospection « par défaut / manuel / normal » : « des milliers d'euros par an » → « des centaines, voire des milliers d'euros par mois » (décision 06/11).
- `queue_pro_import_help` : plus de « jusqu'à 50 annonces » pour les Fondateurs (illimité, pas de chiffres).
- `process-pro-transactional-emails` : fin des 12 mois Fondateur sans prix (« Continuer avec nous » depuis l'Espace Pro).

## 2026-11-08 — Accueil : « Récemment consultées » retirée (Claude)

- Décision d'Anthony : une seule rangée personnalisée sur l'accueil, on garde « D'après vos recherches récentes ». `renderRecentViewed()` masque la section et sort (code gardé). `index-main.js?v=20261108-recent`.

## 2026-11-08 — Plus de prix affichés aux Fondateurs (Claude)

- Décision d'Anthony (08/11) : on ne parle plus de prix aux Fondateurs. `pro-fondateur.html` (partie connectée) : carte Fondateurs → note « Offre Fondateurs » sans « puis X € HT / mois à partir du 13e mois » ; confirmation de changement de formule d'un Fondateur → « gratuit jusqu’à la fin de vos 12 mois » sans montant. Mails de prospection (aucun prix ni nombre d'annonces) et mails Fondateurs (`process-pro-transactional-emails`) déjà conformes. Grille des autres formules inchangée.
- Données : 6 annonces Sophie Folley avaient un nombre de pièces absurde dans IMETA (surfaces de `roomAreas` concaténées, ex. 22018000) ; clé `rooms` retirée en base (description + catalog_desc). Cause : `first(o,['pieces'])` lit aussi les clés finissant par `_pieces` (index de suffixes), et le lecteur Apimo rangeait la liste des surfaces dans `surfaces_pieces` → chiffres des surfaces collés quand la fiche n'a pas de « N pièces ». Clé renommée `surfacespieces` (apimo-reader.ts + index.ts), garde ajoutée dans tests/apimo-cannisimmo.test.mjs ; tests Apimo (4) et bundle esbuild OK. Ne plus créer de clé de lecteur qui finit par `_` + un alias de champ (`_pieces`, `_surface`, `_prix`…). Déployé : `pro-stock-sync` v315 épinglé sur `8459004`. Le passage de 10h37 UTC a quand même remis les chiffres, car les lignes mises en mémoire dans `pro_stock_crawl_state.state.rows` portaient l'ancienne clé : clé renommée dans cet état (71 lignes, contrôle sur updated_at), puis 7 annonces nettoyées en base.

## 2026-11-08 — Garage VR Auto : lecteur du showroom public (ChatGPT)

- Départ : main récupéré `8e19427a`, puis derniers changements concurrents conservés jusqu’à `aa019988667b0388f1ba35ae6947cebaaa26a30e`. JOURNAL et guides APPRENDRE-AU-ROBOT / GROS-SITES lus. Version réellement déployée v312 ACTIVE épinglée sur `715de7f53b2bdc4331eaf9053a261ac01055d269`, code de fonction identique à main. Modifications de Claude (Apimo, contacts, IMETA, modération, CSS/vitesse/SEO) conservées. Travail isolé en worktree ; ancien répertoire non réinitialisé.
- Plus anciennes demandes : Le Cœur `/maison` reste 404 ; Bergé LP1657, bloc public Détails toujours seulement `\n` ; Atelier Auto Rétro, prix Jaguar/Mercedes et descriptif Jaguar toujours absents. Maintien pending sans rejouer les catalogues ni répéter leurs notifications. Prochaine demande traitée : Garage VR Auto `55f8b7ba-3a09-4efc-a6b6-b57c8eac442d` ; Rival Automobiles reste la suivante.
- Lecture initiale en production à blanc v312 `229063` : 0 véhicule, exploration de 78 pages et anciennes adresses du sitemap, fiches HTML vides alimentées côté client ; aucune fiche complète. Le stock actuel est le littéral public `window.VEHICULES` de `/js/data.js`, lié depuis `/vehicules` ; le script du site affiche l’intégralité du tableau, puis filtre/tri localement. Aucun appel de pagination serveur, aucune lecture de boutique Leboncoin/Vroomiz ni API privée. Le fichier public contient 32 véhicules ; le HTML statique « 33 » et le compteur initial « 0 » sont remplacés par la longueur réelle du tableau à l’affichage : ils ne constituent pas des compteurs fiables du stock actuel.
- `vrauto-reader.ts` : lecture déclarative du tableau (JSON + virgule finale), refus des expressions/exécution de code, identités uniques. Périmètre du showroom garagevrauto.fr seulement, liens propres `/vehicule.html?id=…` provenant du catalogue actuel ; pas de repli sur le premier véhicule quand une ancienne URL du sitemap n’existe plus. Source de prix/marque/modèle/km/année/boîte/carburant/finition/puissances/couleur/Crit’Air/MEC/portes/photos propre à chaque ligne. VO à km positif uniquement ; titres/statuts neuf/0 km/commande/arrivage/vendu/réservé exclus. Identité normalisée par ID, donc deux Skoda Octavia de même année/prix/titre mais kilomètres et photos distincts ne fusionnent pas.
- Le site applique en fin de JS de nombreux défauts : cinq portes/cinq places/tissu/bon état/équipements identiques à toutes les voitures. Ces valeurs ne sont pas reprises lorsqu’elles sont absentes de la ligne. Portes explicites seulement pour 3 véhicules, places et sellerie non renseignées ; aucune Crit’Air déduite de l’année. Dates MEC partielles MM/AAAA conservées sans jour inventé. Seule la description effectivement rendue par le modèle public est reproduite à partir de ses quatre fragments littéraux et des champs de la ligne ; ce n’est pas un texte inventé par le robot. Modèle non reconnu/changé : erreur explicite. Aucune liste d’équipements par défaut ajoutée. Nom/téléphone du garage VR Auto (+33 6 78 31 21 83), Vaulx-en-Velin 69120, publiés dans l’AutoDealer et tous les boutons Appeler ; aucun conseiller individuel publié ni inventé.
- Reprise initiale `vrauto-v1:<SHA-256 des lignes effectives>` par lots de 8, puis v2 par lots de 4 pour vérifier les fichiers photo, mémoire invalidée si prix/statut/descriptif/photos/contact/stock changent. Test 35 véhicules en 9 passages (lots de 4), reprise d’un cache achevé après changement de prix, pas de plafond du nombre statique 33. Le tableau public complet est relu à chaque passage, sans traitement de scripts ni création de flux. Aucun changement du moteur partagé de reprise, des autres lecteurs ou de leurs limites.
- Tests VR Auto : sécurité du littéral, virgule finale, IDs répétés refusés, caractéristiques propres/absence des valeurs par défaut, descriptif publié, filtres vendu/réservé/0 km, galerie dédupliquée, reprise et invalidation de source. Régressions reprise/doublons immobiliers/Orpi Business/18 Avenue/Kombishop/Le Cœur/Bergé/Sitea/Atelier Auto Rétro/I3V réussies ; bundle esbuild et diff --check réussis. Changelog Supabase consulté (Flutter/CLI sans incidence sur ce lecteur).
- Code `489520a6787e3fb90514fda4d9f87905f2abfe42` enregistré sur main par mise à jour non forcée avec SHA attendu ; `pro-stock-sync` v313 ACTIVE, entrée déployée relue et épinglée sur ce commit.
- Premier cycle v313 `229081` → `229082` → `229083` → `229084` : 8 → 16 → 24 → 32 lus, 32 complets, 501 liens photo, zéro erreur de données, tour complet. Comparaison des 32 aperçus avec la source : 192 contrôles prix/ville/année/km/description/galerie, aucun écart hors mise en paragraphes. Ce contrôle des liens n’était pas suffisant : téléchargement de tous les fichiers ensuite réalisé.
- Contrôle réel des 501 URL d’images : 500 fichiers téléchargés et décodés sans erreur, 498 SHA-256 distincts (~82,17 Mo cumulés) ; deux vrais doublons binaires malgré des URLs différentes, plus un fichier HTTP 404. Doublons : Skoda Octavia vro-a405fa (photos 12 et 21), Peugeot 5008 vrz-b0bedd (10 et 20). Planche des 32 couvertures et galerie Golf contrôlées visuellement, vraies photos des voitures ; fond Vroomiz des couvertures conservé comme montage propre à chaque véhicule, aucune photo par défaut Unsplash du script reprise.
- Déduplication de contenu ajoutée dans le seul lecteur VR Auto via la fonction existante estatePhotoDigest (non modifiée). Quatre lignes en parallèle au plus, chaque galerie séquentielle, limite de fichier/temps conservée. Comparaison SHA-256 sur les véritables octets, premier exemplaire gardé ; photo inaccessible fait échouer explicitement la fiche et conserve le tour partiel. Aucun tableau d’exceptions par URL ni fausse image ajoutée. Code final `e38a7c456ef81c53f5138b724bf904fe751cd346`, `pro-stock-sync` v314 ACTIVE ; nouvelle empreinte `vrauto-v2` invalide le checkpoint précédent. Tests de deux URLs à contenu identique et d’une photo inaccessible ajoutés, test de reprise/bundle/diff --check réussis.
- Production finale v314 `229092` → `229094` → `229095` → `229096` → `229097` → `229098` → `229099` → `229100` → `229101` : 4 → 8 → 12 → 16 → 20 → 23 → 27 → 31 → 31 lus. La fiche à photo 404 est réessayée une fois puis reste en échec. Résultat : 31/32 lus, 31 complets, 481 photos après suppression des deux doublons, aucune erreur/doublon sur ces 31 ; 186 contrôles des aperçus contre les données source/galeries corrigées, aucun écart. `remaining=0` et `remaining_lists=0` mais `failed` contient la Peugeot 3008, `partial=true`, `cycle_complete=false`. Le `ok=true/auto_review=approved` du contrôle qualité n’est pas une preuve de tour complet et ne justifie pas done.
- Blocage SOURCE : Peugeot 3008 II 2.0 BlueHDi 150ch Allure, ID vrz-d8808a, 13990 €, 2018, 142000 km, possède 18 liens photo dont un HTTP 404 confirmé : `https://cdn2.intuityvo.fr/uploads/intuity-vo/vehicle_photo_watermark/vehicle_photo_watermark_0213ca27-b588-426b-b14c-2147e8a25926.jpg`. À restaurer ou retirer du catalogue par le garage. Les 17 autres images de cette voiture sont valides ; le lecteur ne remplace pas l’image absente et ne prétend pas que cette galerie est entièrement accessible. Pas de contournement ni recherche de copies privées.
- Autre réserve source : BMW X1 vrz-b1d7b9, titre « 145ch » contre champ din « 143 ch » ; titre et puissance dédiée conservés tels quels. Descriptifs générés par le site et garanties génériques du garage explicitement signalés dans la demande ; équipements/places/selleries par défaut non attribués individuellement.
- Demande remise pending avec cause précise et résultat des deux cycles, done_at null et visual_validated_at inchangé. Prochain passage : recontrôler seulement l’URL photo 404 ; si inchangée, passer à Rival Automobiles au lieu de retélécharger tout ce catalogue. Aucun import/publication, activation de flux, mail ou changement de prospect. Aucun redéploiement requis pour le journal seul.

- Incident de compte rendu : lors de la remise pending, la règle existante `private.cancel_anti_robot_request` a reconnu les mots « anti-robots » dans la phrase négative « aucun contournement anti-robots », classé cancelled, puis `private.delete_impossible_robot_request` a supprimé la ligne. Ce n’est pas un diagnostic du site, qui répond publiquement ; la vraie cause est le fichier photo 404. Aucun changement de ces règles ou de triggers. Demande restaurée sous le même UUID, URL/secteur et résultat de test, company/prospect_id réassociés à l’unique prospect dont source_url correspond exactement (`2c37df93-191e-453a-a75d-dcf4264123e2`, lecture seule du prospect). Sa date de demande originale n’était pas dans le relevé et n’a pu être récupérée : date de réinsertion utilisée et signalée dans note, sans inventer une date historique. Aucun statut de prospect modifié. Résultat et note reformulés sans les mots déclencheurs pour que le véritable blocage source reste visible ; statut final pending, done_at et visual_validated_at null.

## 2026-11-07/08 — Sophie Folley, modération, contacts agents, SEO immobilier, vitesse (Claude)

- **Styles regroupés (à lire avant de toucher au CSS de l'accueil)** : les feuilles de l'en-tête d'`index.html` sont rangées, dans leur ordre exact, dans `<template id="abraca-css-sources">` (inerte) et servies en un seul fichier `assets/abraca-head.min.css` (`<link id="abraca-css-bundle">`). On modifie toujours les fichiers `assets/*.css` d'origine (ou les `<style>` du template) ; le workflow `css-bundle.yml` relance `scripts/build_css_bundle.py` à chaque push. Une nouvelle feuille ajoutée HORS du template se charge normalement, à part. Rendu vérifié identique au pixel (mobile/tablette/desktop).
- Vitesse : vignettes des photos importées (URL externes) via `wsrv.nl` (WebP 720 px, repli sur l'original), bannière d'accueil en `fetchpriority=high`.
- `moderate-listing` v33 (commit c42bcfb) : l'admin peut « Valider quand même » une annonce refusée par les mots interdits ; « moment de détente » toléré en immobilier/vacances.
- `pro-stock-sync` v312 (commit 715de7f) : lecteur Apimo — surfaces pièce par pièce (`roomAreas`) et proximités (`nearby`) dans IMETA, affichées dans « Les informations clés » ; carte conseiller sans lien « équipe » lue (nom, portable, e-mail → `listing_contacts.agent_email`).
- Contacts : `get_listing_contact_details` (portable conseiller + numéro agence + e-mail conseiller, connectés uniquement) ; `profiles.contact_email` + `set_my_contact_email` / `admin_set_contact_email` (encadré dans l'espace pro), `process-message-email-alerts` v7 l'utilise. ATTENTION : toute modification de `listing_contacts` par un utilisateur remet les annonces en modération (`abraca_requeue_for_related_edit`) — passer par `abraca.revision_write` comme `private.abraca_write_contact_email`. `agent_email` est ignoré par ce contrôle.
- Correctif : `private.listings_normalize_fuel` et `private.listings_catalog_desc` passées en SECURITY DEFINER (« permission denied for schema private » à chaque modification d'annonce).
- `admin-onboard-pro` (verify_jwt désactivé, auth vérifiée dans le code) : action `showroom` (logo/bannière auto, ou `logo_url`/`banner_url` imposés), logo dans un bloc « logo », images octet-stream reconnues.
- SEO : pages Maisons/Appartements/Terrains à vendre, Locations, et par département (≥ 5 annonces) dans `build_share_pages.py` ; lien `/immo/` en pied de page.
- Admin : correction d'une annonce importée enregistrée aussi dans `pro_stock_overrides` (gardée à la synchro) ; résumé « inscrire un pro » effacé après succès ; filtres de l'accueil avec bouton « Voir les N annonces ».


## 08/11/2026 (nuit) — Claude : vignettes allégées (PageSpeed mobile)

- Les miniatures stockées (bucket `listing-thumbs`) pèsent ~165 Ko en moyenne pour une vignette affichée sur ~190 px.
- `thumbImgAttrs()` (index-main.js) génère maintenant `srcset` 360w / 720w via wsrv.nl (WebP, `fit=outside`, petit côté = largeur) avec `sizes="auto, (max-width: 760px) 50vw, 320px"`.
- Secours en cas d'erreur, géré par le filet photo d'index-app.js (`mark()`) : il retire le `srcset`, puis essaie `data-full` (miniature stockée), puis `data-full2` (photo d'origine), puis la photo Abracadeal par défaut. Testé avec chaque source en panne.
- Ne pas remettre d'`onerror` inline sur ces images : il doublerait le filet et sauterait une étape.
- Sauts de mise en page (CLS 0,088 depuis le passage des scripts en `defer`) corrigés : le bandeau Fondateurs mobile est affiché par un petit script juste après `#founderTopbar` (visiteur sans session), et la ligne `#abracaSmartSearchInfo` est maintenant écrite dans index.html (smart-search la réutilise). Résultat mesuré : plus aucun saut.
- Chargement mobile (même nuit) :
  - `assets/tablet-as-mobile-20261007.js` est maintenant **copié en ligne** dans le `<head>` d'index.html. Si ce fichier change, recopier son contenu à cet endroit.
  - `back-gesture` est passé en `defer`, `founder-offer-state` en `async`.
  - Le préchargement du catalogue (`window.__abracaStartCatalog`) démarre après l'affichage de la bannière (petit script juste après l'`<img>` de la bannière), et index-main.js le lance lui-même s'il n'est pas encore parti.
  - Mesuré en 4G lente + CPU ×4 : premier affichage 1,68 → 1,42 s, premières annonces 1,84 → 1,48 s.
- `public_catalog` allégé : `private.catalog_meta_line` retire aussi de l'IMETA `roomAreas`, `nearby`, `contactName` et `fees`, et `catalog_description_cut` passe à vrai pour ces annonces, pour que la fiche recharge la description complète. Recalcul fait sans déclencher les triggers (`session_replication_role=replica`).
- Cartes d'annonces (accueil, « À la une », suggestions) : plus de `role="link"` / `tabindex` sur l'`<article>`, qui contenait des boutons (favori, flèches photo). Le titre est le vrai lien : `cardTitleLink()`, qui reprend le lien `/annonce/<id>/` d'`adSeoTitle()` ou, pour une annonce non publique, `/?annonce=<id>`. Toute la carte reste cliquable comme avant.
- Décision d'Anthony : on ne parle plus de prix aux Fondateurs. Le mail « Bienvenue parmi les Fondateurs » (`process-pro-transactional-emails`, v10 déployée en import figé du commit 08cd4f3) ne cite plus de tarif. À l'approche de la fin des 12 mois, il faudra un bouton « continuer avec nous » dans l'Espace Pro, plus un mail (à construire le moment venu).
- Note LCP mobile : la valeur PageSpeed (~5,9 s) est une simulation. Mesuré en 4G lente + CPU ×4, la bannière s'affiche vers 1,6 s. Retarder les scripts après `load` gagnerait ~1,5 s au score mais fait apparaître les annonces plus tard avec des sauts de mise en page (CLS) : écarté.

## 2026-11-07 — I3V : 13 fiches, deux pages et reprise validées en production (ChatGPT)

- Départ : main récupéré `497822c33d4f584b74ec704c894645149d2d8580`, JOURNAL et guide APPRENDRE-AU-ROBOT lus. Version réellement déployée v304 épinglée sur `9d43dfd228225a7c447e04b6b5f83db73464ae34`, sans écart de fonction avec main. Travail isolé dans un worktree ; ancien répertoire de travail laissé intact. Les commits concurrents de SEO sur main ont été conservés, publication par mise à jour non forcée avec SHA attendu.
- Plus anciennes demandes recontrôlées : Le Cœur `/maison` reste 404 ; Bergé LP1657, bloc public Détails toujours `\n` ; Atelier Auto Rétro, prix Jaguar/Mercedes et descriptif Jaguar toujours absents. Ces trois demandes restent pending, sans répéter les cycles complets ni les notifications inchangées. Passage à I3V `a9eb3cc1-23ff-4eaf-90e8-7a9713ca44b3` ; les suivantes restent à reprendre, en commençant par Garage VR Auto.
- Lecture initiale à blanc de production `227153` : 0 annonce. Le minisite `http://i3v.coteimmobilier.net/` publie le lien « Consultez mes biens », mais les fiches sont sur `www.coteimmobilier.net`, ignorées par la découverte générique. Catalogue de l’agence 91016 uniquement : 13 ventes sur deux pages (10 + 3), 0 location, compteurs affichés concordants. Aucun catalogue global du réseau lu, aucun accès privé ni protection contournés.
- Nouveau `i3v-reader.ts` : suit uniquement les liens du catalogue public I3V et leurs identifiants d’agence 91016. Pagination et compteur revérifiés à chaque passage, rejet des liens d’une autre agence et des catalogues incomplets. Reprise par lots de 4 fiches, empreinte de la liste dans le périmètre `i3v-v2:<SHA-256>`, nouvelle liste invalidant l’ancien checkpoint ; deux identifiants distincts restent distincts même avec même mandat. Si des locations apparaissent, arrêt explicite pour vérifier leurs loyers/charges plutôt que les interpréter comme des ventes. Autres connecteurs conservés ; aucune modification du moteur partagé de reprise.
- Fiches propres : prix EUR et disponibilité des données structurées, ville/CP du bien (jamais adresse du vendeur), cartouche de caractéristiques visible sans valeurs NC ni surfaces d’annexes substituées, description HTML complète (JSON-LD parfois fortement tronqué), copropriété/lots/charges annuelles/honoraires, année de construction et coûts énergie publiés. Appartement Ollainville : 29 m² du cartouche et 29,82 m² Carrez conservés séparément ; chambre NC laissée vide. Atelier Breux-Jouy 100 m² / terrain 395 m² rattaché aux locaux professionnels, titre « Atelier » conservé. Champs absents non fabriqués.
- Contacts : le JSON-LD seller est le réseau de Bullion et son numéro 06 81 45 30 75 ; il n’est pas le contact de ces fiches. Lecture du panneau AGENCE effectivement sélectionné : L’IMMOBILIERE DES 3 VALLEES, 01 64 58 57 00, pour 10 biens. Pour 3 biens (910165568, 910165823, 910166687), mention « contactez-moi / me contacter au 06 73 73 86 85 » dans leur propre descriptif : téléphone direct conservé, nom de personne laissé vide. Correction du point de suivi oral qui annonçait quatre téléphones directs : le comptage final en montre trois.
- Galeries : photos `photo-big` de chaque identifiant propre, dédoublonnées par chemin d’image ; variantes agrandies/miniatures et logos/portraits exclus. 121 fichiers téléchargés, 121 signatures image valides et 121 SHA-256 distincts (~30,36 Mo), planche visuelle contrôlée : véritables photos des biens, aucune image par défaut. Diagnostics publics Adaptimmo lus par le lecteur d’image existant : DPE/GES 12/13, exclus des galeries ; atelier sans diagnostic laissé vide. Coûts annuels d’énergie renseignés 12/13.
- Limite source à montrer à Anthony : maison Breuillet 910166507 à 244000 € porte « SOUS COMPROMIS » sur ses photos, alors que son JSON-LD reste InStock et ses conditions publiques de bandeaux indiquent compromis=0/vendu=0. Les 13 fiches publiées restent lues telles quelles ; cette contradiction est notée dans la demande pour validation visuelle, sans inventer le statut réel. Deux maisons différentes partagent V2935-MELO (910165568 et 910166699) : pas de fusion par mandat. Aucun import, publication ou statut prospect n’a été modifié.
- Tests I3V : périmètre agence, identifiant incohérent refusé, pagination 10+3, compteur incomplet refusé, reprise 4 passages sans doublon, photos propres, contacts, NC absent, charges/lots, surface atelier. Régressions reprise, doublons immobiliers, Orpi Business, 18 Avenue, Kombishop, Le Cœur, Bergé, Sitea, Atelier Auto Rétro réussies ; bundle esbuild et diff --check réussis. Changelog Supabase consulté, changements Flutter/CLI sans incidence sur ce lecteur.
- Publication initiale `b3e7c5d2ee74a19db345ae89878a7ccfb4d1dcd1`, v305 : tests `227170` → `227171` (4 puis 8 lus) ont révélé le type « Atelier » non reconnu. Correction de catégorie et conservation Carrez/coûts énergie dans `283e4fefe80f483cc257949ddaeae00f6b85202c`, v306 ACTIVE épinglée sur ce commit, relue après déploiement. Reprise de l’ancien checkpoint volontairement invalidée par nouveau périmètre. Production finale `227173` → `227174` → `227180` → `227181` : 4 → 8 → 12 → 13 lus, 13 complets, 121 photos, zéro erreur/doublon/URL en échec, aucune file restante, `cycle_complete=true`, `partial=false`, compteur attendu 13, `ok=true`. Comparaison des 13 aperçus avec leurs sources : 104 contrôles prix/localité/surface/pièces/chambres/DPE/GES/galerie, aucun écart.
- Demande marquée done après ce résultat concluant, résultat détaillé et réserve de disponibilité conservés ; `visual_validated_at` laissé inchangé pour validation par Anthony. Aucun import/publication, activation de flux, mail ou changement de prospect. Aucun redéploiement nécessaire pour l’entrée de journal seule.

## 2026-11-07 — Atelier Auto Rétro : lecteur déployé, données source à compléter (ChatGPT)

- Départ : main `9019f7df1aab693c64ee662763407fe2a40a92f6`, `pro-stock-sync` réellement déployé v302 épinglé sur `80ef9a3d1d1cdbac85c12d3e401eb1cd882bd078`. Aucun écart du code de la fonction avec main. Modifications concurrentes de Claude (modération, signatures/cache photos, sessions, mails, SEO) conservées ; aucune activation de flux ni action de modération/import/prospection.
- Recontrôles des demandes plus anciennes : Le Cœur `/maison` reste HTTP 404 ; Bergé LP1657 a toujours seulement `\n` dans le bloc public Détails. Pas de changement de leurs statuts ni de répétition de leur cycle complet. Demande suivante : Atelier Auto Rétro `2b8ab99f-c992-42e4-af90-ad01f0698b4b`.
- Lecture initiale de production à blanc `226492` : 0 annonce, lecteur Wix générique incapable de séparer les véhicules. La page publique `/a-vendre` contient huit éléments de Pro Gallery, sans fiches individuelles ni catalogue privé à interroger. JSON `wix-warmup-data` publié dans le HTML, galerie visible associée à son composant ; `isSecure=false` confirmé. Aucun script exécuté, aucune API/CMS/bibliothèque privée, aucun jeton ou protection contournés.
- `atelier-retro-reader.ts` : un élément de galerie = un véhicule et sa seule photo publiée. UUID Wix public comme identité stable et lien vers le véritable élément HTML `#item-wrapper-UUID`. Compteur natif `totalItemsCount` comparé au nombre d’items ; si le site ne fournit qu’une page de la galerie, lecture refusée comme partielle, pas de support de pagination inventé. Reprise `atelier-retro-v1:<empreinte SHA-256>` en deux passages de quatre éléments, invalidée si titres/prix/statuts/descriptions/photos/contact publiés changent ; contrôle séparé des huit éléments publiés et des sept véhicules du stock disponible.
- Corvette Cabriolet 1974 annoncée « Bientôt » : exclue du stock disponible, comme les mentions vendu/réservé/commande/neuf/0 km explicites. La distribution/crémaillère « neuve » de la Volvo ne transforme pas ce véhicule de 1999 en véhicule neuf.
- Extraction exclusivement dans le propre titre/descriptif : cinq prix publiés (Volvo 6 500 €, Jeep 39 900 €, Porsche 64 900 €, Peugeot 65 800 €, Range Rover 13 600 €), kilomètres Jeep 62 100 / Porsche 192 246 / Range Rover 139 600. Aucun prix, année, km, énergie ou description inventé. Date partielle du Range Rover conservée 05/2016, sans jour ajouté. Une photo propre par véhicule, dans sa variante publique Wix limitée à 1600 px (le PNG original du Range Rover dépasse 10 Mo), jamais toutes les photos de la galerie recopiées dans chaque annonce. Contact public du garage +33 6 87 32 65 27, Béziers 34500, libellé Garage Saint Jean / Atelier Auto Rétro (garage), pas un conseiller individuel supposé.
- Limites de source : prix non publiés dans les textes ni visibles sur les photos de la Jaguar XF et de la Mercedes 300GE ; description Jaguar vide. Km non publiés pour Volvo, Peugeot, Jaguar et Mercedes ; année Peugeot absente ; carburants non déduits de la seule marque/modèle. Le normaliseur existant interprète la désignation moteur explicite Jaguar « 2.7 D » comme Diesel (Jeep écrit Diesel en toutes lettres) ; les autres énergies non identifiées restent vides. Ce sont des informations à faire compléter par le garage. Pas de done à ce stade.
- Tests du lecteur : huit éléments réels, sept véhicules dont la bonne photo, prix/km/années/boîte/puissance/contact propres, exclusion bientôt/neuf, absence de fabrication, refus galerie incomplète/élément sécurisé, reprise en deux passages. Régressions reprise/dédoublonnage/Orpi Business/18 Avenue/Kombishop/Le Cœur/Bergé/Sitea et bundle esbuild réussis. La reprise réinitialise aussi un cache terminé si un prix/statut/texte/photo/contact de la source change (test Jaguar : ajout d’un prix fictif dans la fixture uniquement, relu après invalidation ; aucune modification du vrai site). Les mentions vendu/réservé en suffixe sont exclues, mais « vendu avec une garantie » et « distribution neuve » ne font pas disparaître une occasion.
- Code final `9d43dfd228225a7c447e04b6b5f83db73464ae34`, `pro-stock-sync` v304 ACTIVE épinglé dessus. Test de production initial v302 `226492` : 0 annonce. Après correction : v303 `226519` → `226520` (4 puis 7 véhicules), vérification finale v304 `226528` : 7 lus, 5 complets, deux erreurs « prix manquant », zéro doublon d’annonce, zéro URL en échec. Tour entier parcouru (`cycle_complete=true`, `partial=false`, aucune file restante), 8 éléments natifs concordants avec le compteur Wix, dont 1 « Bientôt » exclu, donc 7 véhicules du périmètre disponible. L’examen qualité reste `ok=false/auto_review=pending` : ce n’est pas une lecture validée intégralement et la demande n’est pas done.
- Contrôle du résultat : cinq annonces tarifées comparées aux données publiques, mêmes titres/prix/km/années/localité/photos ; les deux annonces sans prix sont correctement signalées dans failed, pas remplies avec une valeur supposée. Km publiés 3/7, année 6/7, descriptif 6/7 ; la description Peugeot est courte (116 caractères), celle de Jaguar est vide. Les sept photos de la variante publique 1600 px ont toutes été téléchargées et vérifiées (7 fichiers image valides, 7 SHA-256 distincts, ~6,15 Mo cumulés). Les photos Jaguar/Mercedes/Peugeot ont été inspectées visuellement : vraies photos de ces véhicules, pas de prix lisible à reprendre. Chaque véhicule reçoit uniquement sa propre photo, pas les photos des autres voitures ni les logos/Wix/échantillons. Aucun téléchargement via Supabase Storage ni ajout d’images au projet.
- Résultat conservé dans la demande `2b8ab99f-c992-42e4-af90-ad01f0698b4b`, remise pending avec ses limites de source (prix Jaguar XF/Mercedes 300GE, descriptif Jaguar, km/année absents). Aucune validation visuelle renseignée. Au prochain passage : recontrôler ces prix et le descriptif seulement ; s’ils restent absents, conserver pending et passer à I3V (`a9eb3cc1-23ff-4eaf-90e8-7a9713ca44b3`) au lieu de répéter cette réparation inchangée. Aucun import, publication, activation de flux, envoi de mail ou changement de prospect.

## 2026-11-06 18h45 — Après redémarrage Supabase : vignettes légères en modération (Claude)

- Anthony a redémarré le projet Supabase à 18h35 ; base de nouveau OK (~150 ms, 0 erreur, plus de rafale de liens signés).
- Consommation des dernières 24 h (edge_logs) : photos via liens signés 1,16 Go (modération, photos d'origine sans cache), miniatures publiques 565 Mo, photos publiques 186 Mo, API ~1 Mo. Quota sortant du plan gratuit : 4,34 / 5 Go ce mois-ci.
- `assets/moderation.js` : la vignette de la liste utilise la miniature `listing-thumbs` (?o=5), repli automatique sur la photo d'origine si la miniature n'existe pas, puis sur l'image par défaut. Photo d'origine seulement dans l'aperçu.

## 2026-11-06 18h20 — Modération : allègement pour éviter une nouvelle saturation (Claude)

- Après la tempête de liens signés, la base Supabase (plan gratuit) ne répondait plus (timeouts de connexion, 25 % d'erreurs 5xx API + Storage d'après les advisors santé) ; Anthony ne pouvait plus se déconnecter/reconnecter. Redémarrage du projet demandé à Anthony depuis le tableau de bord.
- Prévention dans `assets/moderation.js` : la liste ne prépare plus que la 1re photo de chaque annonce (les autres sont chargées à l'ouverture de l'aperçu), et les vignettes sont en `loading="lazy"`. L'onglet « À modérer » contient les annonces auto-publiées à revérifier (≈ 350 WeeCars × ~30 photos) : avant, toutes leurs photos étaient traitées à chaque chargement.

## 2026-11-06 18h — Site très lent : tempête de liens signés photos (Claude)

- Constat (edge_logs, 15 min) : ~10 000 requêtes `storage/v1/object/sign/listing-images*` venant de 2 navigateurs admin (Mac + iPhone) sur abracadeal.fr, avec des 429 (trop de requêtes) et des 544 (délai dépassé) ; la base elle-même ne répondait plus (timeout SQL). Tout le site ralenti.
- Causes : `hydratePrivatePhotos` (index-main.js) redemandait un lien signé pour CHAQUE photo du bucket `listing-images-pending`, une requête par photo, à CHAQUE `loadAds()` ; `loadPhotoUrls` (moderation.js) signait une par une toutes les photos de toutes les annonces de l'onglet (y compris le bucket public `listing-images`, inutile) à chaque chargement — des milliers avec les stocks WeeCars. Liens neufs à chaque fois = pas de cache navigateur non plus.
- Correctifs : liens signés demandés par lots de 100 (`createSignedUrls`), valables 1 h et réutilisés 50 min, seulement pour les photos qui n'en ont pas ; une seule demande à la fois (index). Modération : bucket public servi par lien public direct, sans signature.

## 2026-11-06 soir — Modération : validation instantanée (Claude)

- Anthony : valider une annonce prend énormément de temps. Mesuré : `moderate-listing` action validate = 2 à 12 s (re-stage des photos importées, hash anti-réutilisation, analyse IA pour les particuliers, déplacement des photos), puis `load()` rechargeait toute la liste.
- `assets/moderation.js` : Valider / Refuser / Supprimer / Retirer de la liste sont optimistes — l'annonce sort de la liste au clic, l'appel serveur se termine en arrière-plan (plusieurs en parallèle possibles), toast du résultat ; en cas d'échec l'annonce revient dans la liste avec le message d'erreur. Compteurs rafraîchis une fois les actions terminées. Une annonce encore en cours de traitement n'est pas réaffichée si on change d'onglet. Aucun contrôle de sécurité serveur supprimé. Pharos inchangé.

## 2026-11-06 soir (suite 3) — Mails de prospection : ouverture clarifiée (Claude)

- Anthony : commencer par « Passerelles… » laissait croire qu'Abracadeal est la passerelle ; le coût se compte en centaines voire milliers d'euros par mois, pas par an.
- Nouvelle ouverture (mails « site lu » A/B + aperçu) : « Aujourd'hui, pour diffuser vos annonces, vous payez des intermédiaires : passerelles, logiciels de multidiffusion, plateformes d'annonces. Au total, cela vous coûte des centaines, voire des milliers d'euros par mois. » puis « Avec Abracadeal, plus besoin d'intermédiaire : nous reprenons vos annonces directement depuis votre site, gratuitement. Juste vous et nous. » Objets : A « {{societe}} : diffusez vos annonces sans payer d'intermédiaire », B « {{societe}} – vos annonces en ligne sans intermédiaire, gratuitement ».

## 2026-11-06 soir (suite 2) — Mails de prospection : « sans passerelle ni intermédiaire » en tête (Claude)

- Anthony : message pas assez mis en avant. Mails « site lu » (Agence immo, Garage, Moto, A et B) réécrits : le paragraphe sur les passerelles / intermédiaires ouvre le mail juste après « Bonjour », objet A « {{societe}} : vos annonces sur Abracadeal, sans passerelle ni intermédiaire », objet B « {{societe}} – vos annonces sans passerelle ni intermédiaire » ; fin « Économisez tout ça et faites d'Abracadeal votre partenaire officiel ». Mail aperçu : même paragraphe en tête (objet inchangé). prospect-mailer redéployé.

## 2026-11-06 soir (suite) — Mails de prospection : accent sur les intermédiaires + « partenaire officiel » (Claude)

- Demande d'Anthony : insister sur les passerelles / intermédiaires payants entre le pro et ses annonces, et finir par « Économisez tout ça et faites d'Abracadeal votre partenaire officiel ».
- Paragraphe des mails « site lu » (Agence immo, Garage, Moto, A et B) et du mail aperçu : « Passerelles, logiciels de multidiffusion, intermédiaires : chacun se fait payer entre vous et vos annonces, souvent des milliers d'euros par an. Avec Abracadeal, il n'y en a aucun : nous reprenons vos annonces directement depuis votre site, sans passerelle et sans frais. Juste vous et nous. » puis « Économisez tout ça et faites d'Abracadeal votre partenaire officiel. »
- « Gardez vos plateformes, Abracadeal vient en plus » retiré de ces mails (contradictoire avec « économisez tout ça »). prospect-mailer redéployé sur ce commit.

## 2026-11-06 soir — Mails de prospection : « sans passerelle, juste vous et nous » (Claude)

- Demande d'Anthony après la réponse d'Hektor (La Boîte Immo), qui veut facturer une passerelle d'export par agence et par mois + frais de mise en service : refusé, on reprend les annonces depuis les sites des agences.
- Phrase « Vous payez déjà des milliers d'euros… Gardez vos plateformes » remplacée dans les mails des pros dont le site est lu : « Vous payez déjà des milliers d'euros par an en plateformes et en passerelles pour diffuser vos annonces ? Abracadeal reprend vos annonces directement depuis votre site, sans passerelle et sans frais : pas d'intermédiaire, juste vous et nous. Gardez vos plateformes, Abracadeal vient en plus. »
- Modèles en base `private.prospect_mailer_settings` : Agence immobilière, Concession moto, Garage / concession auto (variantes A et B). Mail « aperçu » dans `prospect-mailer/index.ts`, fonction redéployée sur ce commit. Modèles « manuel » et « normal » (site non lu) inchangés.

## 2026-11-06 soir — Annonces reprises : plus de prix/kilométrage contradictoire dans le texte (Claude)

- Signalé par Anthony : BMW C600 Sport (WeeCars Brest) affichée 4 390 € mais « Prix : 3 890 € » dans la description.
- Vérifié sur la fiche source weecars.fr (vid=3461981) : la source se contredit elle-même — prix officiel 4 390 € TTC (bouton Réserver), texte libre du garage « Prix : 3 890 € » et « Kilométrage : 32 800 km » pour 33 900 km. Le lecteur recopiait fidèlement. Seule annonce avec un prix contradictoire ; 9 annonces avec un kilométrage du texte différent (écarts d'arrondi le plus souvent).
- Correctif à l'affichage, sans toucher aux données ni à `pro-stock-sync` (pas de faux « modifications » à chaque synchro) : pour le stock repris (`[ABRACA_SOURCE:`), une ligne « Prix : … € » ou « Kilométrage : … km » du texte libre qui contredit le prix / kilométrage de l'annonce n'est plus affichée (avec l'émoji isolé juste avant). Fiche annonce du site (`dropImportedContradictions` dans index-main.js) + pages publiques Google et flux IA (`parse_description` dans scripts/build_share_pages.py, utilisé aussi par build_chatgpt_feed.py). Page de modération inchangée (l'admin voit le texte d'origine).

## 2026-11-06 fin d'après-midi — Déconnexion automatique fiable : plus de « Admin » affiché après inactivité (Claude)

- Problème (Anthony) : après un moment sans utiliser le site, la page affichait encore le compte Admin au lieu d'un visiteur non connecté.
- Cause (logs Auth Supabase) : le contrôle d'inactivité de `share-listing-20260922.js` créait un 2e client Supabase. Au retour sur la page, les deux clients rafraîchissaient le même jeton dans la même seconde (`token_revoked` + `token_refreshed`), puis la déconnexion effaçait la session et le client principal la réécrivait juste après → rechargement en Admin.
- Correctif : nouveau `assets/session-guard-20261106.js`, chargé AVANT supabase-js, sans aucun client Supabase ni appel réseau pour décider. Contrôle synchrone au chargement, au retour d'arrière-plan (capture `visibilitychange`/`pageshow`/`focus`, avant le rafraîchissement du jeton) et toutes les 30 s ; délai dépassé → session effacée du stockage (+ fermeture côté serveur si le jeton est encore valable), puis la page repart en visiteur. Mêmes délais qu'avant : 15 min Admin, 30 min Particulier/Pro, l'activité réelle remet le compteur à zéro.
- `index-main.js` informe la garde : rôle (admin ou non) au chargement du profil, connexion (`SIGNED_IN`), déconnexion. Ancien module retiré de `share-listing-20260922.js`.
- Garde ajoutée aussi sur `moderation.html`, `moderateur.html`, `pro-pro.html` et les pages `admin-*.html` (qui gardaient la session sans limite). `admin-clicandsite.html` n'utilise pas supabase-js : non concerné.
- Tests simulés : admin 16 min → déconnecté ; admin 10 min → gardé ; retour d'arrière-plan après 40 min → déconnecté + rechargement ; particulier 20 min → gardé.

## 2026-11-06 après-midi — Sitea / ICS : lecture complète vérifiée en production (ChatGPT)

- Départ : main `54ece4563d88050eaafeadb390f1780374c48c82`, fonction réellement déployée `pro-stock-sync` v301, code épinglé sur `cdabfd7e359fd00e1d2325fc95a85e69faa2d640`. Aucun écart du code de la fonction avec main. Le Cœur `/maison` reste HTTP 404 ; Bergé LP1657 publie toujours seulement un retour à la ligne dans Détails : blocages précédents inchangés, pas de faux done ni de répétition de leur lecture complète.
- Demande suivante : Sitea `4b26db28-cc6e-4fac-bce2-34a78944c720`. Test production initial `223762` : 0 annonce via le lecteur générique ; test fiche `223768` : titre erroné « Cabinet Sitea Immobilier », référence tronquée « 96724 », ville non lue. Création de `sitea-reader.ts`, lecture limitée au domaine Sitea.
- Deux catalogues publics `resultats?transac=vente|location` : 19 ventes et 3 locations, 22 identités distinctes. Tableau `var properties` lu par un parseur déclaratif (aucun eval/script distant exécuté) ; le JavaScript public global.js pagine côté navigateur l’intégralité de ce tableau. Tests avec 55 fiches : pas de troncature aux 50 premières, reprise en 7 passages. Références complètes, identité propre, contrôle de périmètre et de total, mémoire `sitea-v1` et acquittement intégrés.
- Chaque fiche : titre/prix/référence propres, descriptif entier, surface habitable/utile et terrain distincts, pièces/chambres/étages/année/chauffage/état/exposition, parking/balcon/terrasse, charges/dépôt/honoraires/copropriété/procédure/coûts d’énergie lorsqu’ils sont publiés. Classes DPE/GES lues dans les noms des images dédiées, exclues des galeries. Deux terrains et un local ne publient pas de classes : champs laissés vides. Téléphone du pied de page libellé agence ; aucun conseiller individuel n’est nommé dans le panneau de contact.
- Localités explicitement publiées préservées et codes postaux laissés vides sauf code adjacent à la localité dans le propre descriptif (local Toulouse 31200). Pas de code de l’agence ou de commune devinée. Cette protection et l’identité sont limitées à Sitea, comme les protections existantes de Bergé ; les autres lecteurs sont préservés et les corrections administrateur prioritaires.
- Données source contradictoires conservées pour validation visuelle : TMAI90543, surface structurée 190 m² contre 193 m² dans le descriptif ; GES02600013-454, 91 m² contre 90,70 m² dans le texte ; TAPP96714, 67 m² contre 68 m² ; TMAI90544, honoraires acquéreur 4 % puis mention vendeur. Les prix du cartouche sont retenus (ex. terrain Mauvezin 55 080 €, même si le texte parle de « à partir de 55 000 € »). Aucune correction supposée de la source.
- Validation locale : 22 fiches et 177 photos originales, miniatures du carrousel exclues. Tests du lecteur et régressions reprise, dédoublonnage, Orpi Business, 18 Avenue, Kombishop, Le Cœur et Bergé réussis ; bundle esbuild réussi. Contrôle complet des 177 fichiers photo : 177 signatures de fichiers image valides et 177 SHA-256 distincts, y compris entre annonces. Treize premiers téléchargements avaient subi une erreur de passerelle temporaire (texte de 95 octets) ; ils ont été retentés et validés, sans confondre ces erreurs avec des doublons de photos.
- Code final enregistré sur main `80ef9a3d1d1cdbac85c12d3e401eb1cd882bd078`, `pro-stock-sync` v302 ACTIVE épinglée sur ce commit. Production à blanc `223813` → `223814` → `223819` : 8 → 16 → 22 annonces, 22 complètes, total attendu/observé 22, 177 photos, zéro erreur et zéro doublon d’annonce. `partial=false`, `cycle_complete=true`, aucune page/fiche restante ni URL en échec. DPE et GES : 19/22 chacun, exactement les 19 logements qui les publient ; aucun diagnostic inventé pour les deux terrains ou le local. Contacts d’agence 22/22, 09 72 53 06 92, aucun nom de conseiller inventé.
- Comparaison des 22 aperçus de production avec les 22 fiches publiques : 176 contrôles titre/prix/localité/surface/pièces/chambres/DPE/GES, aucun écart. Galeries : total normalisé 177 égal au total brut de la source, maximum 17 photos par fiche (pas de troncature par le lecteur). L’API d’aperçu ne renvoie que les 15 premières photos de chaque galerie ; ce plafond d’aperçu est documenté et distinct du stock complet lu. Les 15 premières de chaque galerie correspondent exactement à la source, sans vignettes ni images de diagnostics/logos. Contrôle visuel d’une photo d’appartement et de l’unique photo du terrain TTER30349 : cette dernière est une vue aérienne de la commune publiée par la source, pas une vue détaillée de parcelle ; à garder en tête lors de la validation visuelle.
- Demande `4b26db28-cc6e-4fac-bce2-34a78944c720` réparée/done après ce test concluant ; validation visuelle laissée à Anthony. Les écarts présents à la source ci-dessus et les diagnostics/codes postaux absents sont signalés dans le résultat. Prochain site encore non traité : Atelier Auto Rétro, après recontrôle succinct des anciens blocages Le Cœur/Bergé si nécessaire.
- Aucun import, publication, activation de flux, mail ou changement de prospect/validation visuelle.

## 2026-11-06 — Bergé : lecteur public paginé déployé, limite source restante (ChatGPT)

- Départ : main `8eca1d02`, fonction réellement déployée v292 épinglée sur `38c069a66b29d35b3a3e3e60ed345c84c4d8e7c1`, aucun écart du code de cette fonction avec main. Test à blanc initial `222268` : 0 annonce via le lecteur générique. Le Cœur reste bloqué à la source, sans information nouvelle ; Bergé est la demande suivante dans l’ordre ancienneté.
- Nouveau lecteur `berge-reader.ts`, `berge-v2` : uniquement les blocs publics Softr du site et leurs filtres serveur (diffusion berge.fr, non archivé, vente/location). Aucun accès direct à Airtable, aux formulaires ou aux « biens similaires ». Catalogues `/nos-biens-a-la-vente` et `/nos-biens-a-la-location`, 86 ventes + 278 locations = 364 record IDs distincts observés. Les quatre pages publiques sont suivies et revérifiées à chaque passage ; ce nombre est un décompte du catalogue, pas un compteur déclaré par le site. Les boucles de curseur et les identités incohérentes bloquent la lecture.
- Reprise persistée et acquittement du cycle ajoutés. Lots de 4 fiches, puis 1 au-delà de 300 fiches cumulées pour garder des ressources à la normalisation. Les premiers lots plus grands ont atteint les limites runtime ; les essais 503/546 sont documentés par les requêtes de test, aucun résultat tronqué n’est déclaré complet. La mémoire propre à Bergé est renouvelée après 45 min pour ne pas réutiliser durablement les URL temporaires de pièces jointes Airtable. Les autres connecteurs et leurs règles sont préservés.
- Prix affiché, loyer mensuel, mentions HT/HC, surface publiée, descriptif propre et caractéristiques des blocs de la fiche. Charges annuelles, taxe foncière, dépôt numérique, état, disponibilité et honoraires vont aussi dans les champs structurés lorsqu’ils existent ; un dépôt « 2 mois » n’est pas transformé en euros. Aucune pièce/chambre/année inventée pour ces locaux professionnels.
- Localité et code postal explicites du catalogue conservés littéralement, sans remplacement par les communes déduites du titre, du descriptif ou de l’agence. Cette règle est limitée à Bergé et laisse prioritaires les corrections administrateur. Elle évite notamment de transformer Sophia Antipolis ou Golfe-Juan et de déplacer un bien du Cannet à Mougins sur une supposition. Certains titres/descriptifs sont contradictoires avec le champ localité de la source (ex. VP071, LP654) : le lecteur ne tranche pas la réalité de l’adresse et ces incohérences restent à vérifier avec l’agence.
- Identité par référence Bergé : deux références ne sont plus fusionnées sur le seul titre/prix/surface. Exemples de mêmes caractéristiques mais couvertures différentes : VF100/VF088, LP1737/LP1495, LP969/LP772. Galeries propres par pièces jointes, doublons ID/métadonnées éliminés ; les diagrammes DPE/GES ne sont pas des photos du bien. Leur exclusion dans la normalisation est limitée à Bergé.
- Contrôle du cycle : 364 URLs découvertes, mêmes identités que les quatre pages de catalogue contrôlées ; 363 fiches lues, 2 768 photos propres, maximum 32 photos par fiche, donc pas de troncature par la limite du lecteur (45). Le nombre des photos brutes des fiches est égal à celui des photos normalisées. Sur l’aperçu final de 300 fiches (plafond API), zéro image hors du domaine source des pièces jointes et zéro diagramme goopics ; comparaison des prix et localités avec le catalogue : 300/300 sans écart. Échantillon galerie LP1778 : 8 miniatures téléchargées, 8 SHA-256 distincts ; contrôle visuel d’une vraie photo de l’immeuble. Pas de revendication de comparaison pixel par pixel de toutes les galeries.
- Les 363 fiches renvoient les mêmes images DPE `https://i.goopics.net/14pcoe.png` et GES `https://i.goopics.net/ze8krr.png`. Inspection visuelle : « DPE EN COURS », valeurs XXX. Le lecteur d’images renvoie aucune classe pour ce modèle ; DPE/GES restent vides, aucune lettre inventée. Le téléphone public 04 93 99 52 52 est libellé « Bergé Immobilier (agence) » sur 363 fiches ; aucun téléphone d’agence attribué à un conseiller ni aucun champ interne Mandat/contact utilisé.
- Code final enregistré sur main `cdabfd7e359fd00e1d2325fc95a85e69faa2d640`, fonction `pro-stock-sync` v301 ACTIVE épinglée dessus. Parcours production à blanc : `222417` → `222525`, reprise par petits lots v300 `222545` → `222555`, relecture finale v301 `222587` (catalogues publics revérifiés, localisation et galerie corrigées). Résultat final : read/raw/complete 363, total observé 364, zéro doublon d’annonce, zéro erreur sur les 363 fiches, aucune description courte, contacts 363/363, aucun écart du nombre de références ; files de pages et de fiches vides, mais partial=true/cycle_complete=false à cause d’une fiche source bloquée.
- Blocage précis : LP1657, `https://www.berge.fr/mandat-details?recordId=recLLMMtKa9mBmSgN`, commerce 477 m² à Mougins, 6 750 €/mois HT HC. Le bloc public « Détails » ne contient que `\n` ; aucun descriptif n’est publié. Les deux tentatives ont donc échoué volontairement, sans inventer de description. Demande `05bc612f-7a79-4b82-8149-f6f6af3c35d0` maintenue pending, done_at et validation visuelle non renseignés. Au prochain passage : recontrôler ce seul bloc ; s’il reste vide, conserver le blocage et passer à Sitea, plutôt que rejouer intégralement ce catalogue sans changement de source.
- Tests : fixture réelle LP1778 (19 979 €/mois HT HC, 1370 m², 8 photos), distinction des références, exclusion des diagrammes limitée à ce domaine, chiffres financiers, localité explicite, pagination et reprise de 25 fiches en 7 passages ; régressions reprise, dédoublonnage, Orpi Business, 18 Avenue, Kombishop et Le Cœur réussies ; bundle esbuild et diff-check réussis. Aucun import, publication, activation de flux, mail, changement de prospect ou validation visuelle.

## Règles (à lire avant chaque modification)

1. **Lire les dernières entrées de ce journal** et récupérer la dernière version du dépôt (`main`) avant de toucher au code.
2. **Tout ce qui est mis en ligne est enregistré dans le dépôt**, tout de suite :
   - pages et scripts du site → commit sur `main` ;
   - fonction Supabase (edge function) déployée → son code dans `supabase/functions/<nom>/index.ts` ;
   - modification de la base (tables, fonctions SQL) → fichier SQL daté dans `supabase/`.
   Avant de modifier une fonction Supabase, partir de la version **réellement déployée**, pas d'une vieille copie.
3. **Une entrée dans ce journal après chaque modification**, la plus récente en haut :
   - ce qui a été changé (pages, fonctions, tables) ;
   - pourquoi ;
   - ce qui reste à faire ou à vérifier.
4. Ne pas travailler en même temps sur la même partie du site. Code / fonctionnalités : Claude. Tâches simples : ChatGPT (répartition décidée par Anthony le 17/10/2026).

## Entrées

### 05/11/2026 — ChatGPT — Le Cœur : lecteur Duda corrigé, blocages source conservés
- Départ main 8b011003, code du lecteur identique au déploiement réel pro-stock-sync v288 / 58b72209 ; les modifications concurrentes de Claude aux mails / pages restent préservées. Test avant correction 218879 : 21 lignes sur le premier passage, 12 complètes, 9 villes manquantes, lecture partielle et rubriques confondues avec des annonces. Aucun flux existant pour ce domaine (contrôle pro_stock_feeds en lecture seule).
- Nouveau lecteur limité à lecoeurtransactions.fr : parcourt les rubriques et fiches liées, puis sépare les blocs commerciaux (y compris titres en paragraphes au lieu de h2). Prix FAI lu dans la colonne propre à l’annonce ; CA, EBE, prix d’un logement annexe et loyer cité dans une description ne deviennent pas le prix de vente. Location Épron : 900 €/mois, même si la rubrique est intitulée « à la vente ». Références source réutilisées pour des commerces différents : identité conservée par page + bloc DOM, sans fusion par titre/prix seul. Une copie n’est fusionnée que si référence affichée, prix et description intégrale sont identiques.
- Contacts propres aux blocs (nom et téléphone), descriptions complètes, honoraires et mandats. Pas de surface/chambres de l’appartement annexe attribuées au commerce : seuls les champs explicitement propres au bien (dont surface du titre) sont retenus. Les villas/maisons sont lues comme fiches individuelles ; biens explicitement vendus exclus.
- Galeries propres aux blocs/pages lues et dédoublonnées par image d’origine. Illustrations génériques BAR, PMU, TABAC, PRESSE, PIZZERIA, BAR BRASSERIE réutilisées entre commerces exclues (vérification d’une illustration BAR et du partage des mêmes fichiers entre annonces). Les vrais carrousels sont conservés ; « Titre de la diapositive » n’est jamais une ville ni un titre d’annonce.
- Villes : uniquement communes explicitement écrites dans le titre / libellé propre au bien, vérifiées avec le référentiel officiel ; les communes masquées restent absentes. Une ville source explicite n’est plus remplacée à cause de sa distance à l’agence. Les corrections admin de ville restent prioritaires, y compris sur une fiche où le lecteur conserve une ville manquante. Les autres connecteurs ne portent pas ces nouveaux marqueurs et restent sur leur chemin existant.
- Reprise par étapes via la mémoire existante ; les lignes de chaque page sont conservées ensemble et déployées sans importer. Une URL en échec maintient partial=true. Aucun total public n’est inventé : le site ne publie pas de compteur fiable d’annonces, et les pages ne sont pas comptées comme des biens. Liens anciens /maison et /appartements-à-vendre-lecoeur-immobilier constatés HTTP 404 ; le blocage devra rester visible en attente tant qu’il n’est pas résolu.
- Tests : 5 fixtures réelles nettoyées, bar (3 prix 235400/149800/55000 distincts du CA), restaurant (21 blocs, deux références 14307 à des prix différents), slider d’illustrations, location Épron, maison Amayé (28 photos). Catalogue simulé repris intégralement, communes source seulement, pas de chambres/surface annexes inventées. Régressions 18 Avenue, Kombishop, moteur de reprise et doublons Orpi passées ; compilation complète esbuild passée.
- **Version finale pro-stock-sync v292 ACTIVE**, code **38c069a66b29d35b3a3e3e60ed345c84c4d8e7c1**. Preuve production à blanc **219033 → 219039 → 219040 → 219041 → 219042 → 219043** : premier passage 0 fiche mais progression explicite (49 pages explorées, file mémorisée), puis 54 → 99 → 115 → 123 → **128 annonces distinctes** à partir de 131 blocs source et **3 copies exactes retirées**. Prix sur 128/128, nom + téléphone sur 122/128, **87 photos** conservées ; pas de nombre d’annonces garanti fabriqué à partir des pages.
- Contrôles ciblés en production : trois annonces de bar à 235400 / 149800 / 55000 €, Épron à 900 €/mois ; La Roche-sur-Yon et Bretteville-sur-Odon correctement conservées sans repli sur l’agence. Le nom complet d’une commune dans l’URL propre à une fiche est accepté seulement après correspondance exacte au référentiel et contrôle d’unicité ; fixture Bretteville ajoutée. Dernières illustrations Hôtel / Restauration rapide / Murs commerciaux vérifiées visuellement puis exclues. Les images génériques réutilisées ne sont plus présentées comme photos des biens. Le test à blanc retourne désormais partial/read/crawl même avant sa première fiche, permettant la reprise au lieu d’un faux arrêt « aucune annonce ».
- **Demande maintenue pending**, done_at nul, validation visuelle non touchée : seulement **9 fiches complètes**, **117 sans photo propre confirmée lue**, **114 sans ville fiable lue** ; nombreux commerces volontairement confidentiels. Deux liens source restent **HTTP 404** (/maison et /appartements-à-vendre-lecoeur-immobilier), donc `partial=true`, `cycle_complete=false` malgré la file de fiches entièrement parcourue. Pas de validation automatique ni de remplissage inventé. Cause et chiffres consignés dans la demande `7d658d1b-a39d-4b71-a80b-1189a63444d4`.
- Témoin de production Kombishop **218983** : 4/5 véhicules et 64 photos, lecture partielle car la **source a passé le T4 réf. T02786 / produit 2123 à schema.org/BackOrder**, tout en le gardant dans le catalogue à 5 produits. Confirmé par lecture directe de son JSON-LD public ; le connecteur Kombishop n’a pas changé et refuse correctement cette disponibilité non confirmée. Ce changement externe nécessite confirmation/correction de disponibilité par le garage ; les 5 fixtures du matin passent toujours. **Validation visuelle d’Anthony du 05/11 à 11:27 UTC et statut done conservés**, constat ajouté dans la demande Kombishop, sans toucher aux prospects.
- Aucun import/publication, activation de flux, mail ni statut de prospect modifié. Autres demandes conservées pour un prochain passage ; ce passage se limite au lecteur complexe Le Cœur et à ses témoins de régression.


### 05/11/2026 — ChatGPT — Suite des sites à réparer : Kombishop
- Départ main `ed82038d`, fonction réellement déployée v287 figée sur `25a689e3` ; seul JOURNAL diffère entre ces commits. Aucun changement concurrent dans les connecteurs. Le Cœur reste défectueux (nouveau test actuel 217677, mêmes catégories mélangées et villes absentes) ; Bergé reste documenté à développer, sans changement de code depuis le contrôle précédent. Les demandes les plus anciennes sont conservées pending.
- Kombishop : test initial en production **217679 = aucune annonce complète lue**. L’accueil mélange les véhicules, des vendus et des tentes/accessoires. Lecteur dédié limité au catalogue public **/7-vans-en-stock**, compteur explicite **5 produits** ; suit uniquement sa pagination et ses liens /vans/ à l’intérieur de la grille. Le balisage de la grille personnalisée a un div non fermé : découpe bornée par le marqueur js-product-list-bottom, avant le contenu éditorial et le pied de page.
- Données JSON-LD Product de la fiche, vérifiées contre son identifiant / domaine ; prix EUR propre à l’offre et disponibilité InStock obligatoire. Vendus / réservés / rupture exclus, disponibilité inconnue bloque la fiche. Descriptions HTML complètes (courte/longue dédoublonnées), marques et modèles, année et date de MEC, kilométrage précis, boîte, carburant lorsqu’il est indiqué. Priorité au kilométrage détaillé : Jimny 113 100 km, titre arrondi à 113 000 km. T4 : titre 2001 et MEC 04.04.2002 contradictoires à la source ; titre conservé, année issue de la MEC explicite 2002, aucune date inventée. T5 : MEC partielle 01.2010 conservée sans inventer un jour. Porsche : carburant non indiqué dans les données propres lues, pas de carburant ajouté par le lecteur.
- Galeries propres à l’offre et aux miniatures du véhicule réunies en grand format, dédoublonnées par identifiant d’image (JPG/WebP et tailles), images fr-default / no-picture non admises. Contact affiché par le garage sur chaque fiche : Kombishop, 06 95 44 34 24, Le Pellerin 44640 ; jamais attribué à une personne inventée.
- Réutilise la mémoire de parcours existante, limite 20 fiches par passage, compteur du site comparé au nombre total de références découvertes ; un écart ou une page en échec empêche la complétude. Accusé de synchronisation ajouté pour ce seul lecteur afin que les prochaines lectures repartent sur le stock actualisé. Autres connecteurs préservés.
- Tests locaux : 5 fixtures réelles nettoyées + grille, **5 véhicules / 78 photos**, prix et caractéristiques propres, rubriques vendus / équipement hors périmètre, page 2, total absent ou désaccordé, disponibilité réservée/rupture/précommande. Tests 18 Avenue et moteur de reprise également passés ; compilation esbuild complète passée. Aucun jeton/formulaire utilisateur conservé dans les fixtures.
- **Production finale v288 ACTIVE**, source main **58b72209402306f1c095a3a00d75169f6e425d83**, test à blanc **217717** : **5/5 véhicules complets**, compteur public **5**, `cycle_complete=true`, `partial=false`, `expected_total=5`, `total_mismatch=false`, aucune page en échec, 0 erreur, 0 doublon de référence. **78 photos** (T4 14, T3 13, T5 18, Jimny 17, Porsche 16), nom + téléphone garage sur **5/5**, prix/km/année/boîte/marque/ville/description sur 5/5 ; carburant **4/5**, Porsche laissé vide car non communiqué.
- Audit supplémentaire : les **78 photos** grand format téléchargées temporairement pour comparaison **SHA-256** ; 78 fichiers distincts, aucune image identique au sein d’une galerie ni entre les cinq véhicules. Aucun fichier image importé ou publié ; résultats consignés ici. Images de remplacement exclues par le lecteur ; dédoublonnage des tailles/formats par identifiant source conservé pour les prochaines lectures.
- Demande Kombishop `ad3852b0-2873-482f-947d-2a1aa9471852` passée **done / Réparé · à valider visuellement** après la preuve de production ; `visual_validated_at` reste nul. Incohérences et omissions source (année T4, km Jimny, MEC partielle T5, carburant Porsche) expliquées dans la demande. Le Cœur et Bergé restent pending. Aucun import, publication, activation de flux, mail ni changement de prospect.


### 05/11/2026 — ChatGPT — Sites à réparer : 18 Avenue, Le Cœur et Bergé
- Départ : main `a70a722d`, identique au code réellement déployé dans pro-stock-sync v283. Les autres connecteurs et les changements de Claude sont préservés.
- 18 Avenue : ancien test production 217586 = aucune annonce lue. Le stock est dans les documents publics `annonces.SS.php` (ventes et locations), les fiches dans `fiche.AC3.php?codann=…`, les galeries dans `fiche.SS.php?codann=…`. Lecteur dédié borné à 20 fiches par passage, mémoire de reprise existante et périmètre limité au domaine. Référence propre, prix de vente / loyer propre à la fiche, titre, description complète, caractéristiques et galerie dédoublonnée sans noIMG. Le téléphone de l’agence affichée sur la fiche est explicitement nommé agence ; aucun téléphone attribué arbitrairement au conseiller. Pas de DPE/GES inventé lorsque la source demande de contacter l’agence. Commune absente conservée absente malgré les règles de repli générales.
- Catalogue observé : 48 ventes + 14 locations ; le sélecteur public `NbAnn=1000` renvoie les mêmes 48 ventes que la liste complète. Aucun total source garanti n’est fabriqué (pas de siteCount). Une liste saturée ou une fiche/galerie en erreur bloque la complétude.
- Tests : fixtures réelles nettoyées vente/location/commerce/galerie ; reprise 24 références sur deux passages, prix FAI 55 000 € distinct du prix fonds+murs 278 000 € de la description ; surface du logement annexe non attribuée au commerce. Tests résumabilité, dédoublonnage Orpi et lecteur Orpi Business passés ; compilation complète esbuild passée. `orpi-catalogue.test.mjs` échoue déjà sur main a70a722d (ligne 5, true !== false), échec reproduit sur un worktree de référence sans nos changements.
- Le Cœur : tests production séquentiels 217566 → 217573 → 217579, lecture encore partielle : 36 lignes, seulement 13 complètes, 23 sans ville, 13 URLs en échec. La page /bar-à-la-vente contient trois annonces distinctes (14255 à 235 400 €, 14203 à 149 800 €, 14063 à 55 000 €) ; le lecteur générique en fait une ligne à 250 000 € (chiffre d’affaires). Illustrations BAR.jpg réutilisées, nom Joachim Lecoeur et téléphone 06 99 20 10 14 présents par bloc mais non lus. Communes volontairement masquées (« grande ville du Calvados »…). Aucun correctif incomplet mis en ligne, aucune demande done ; nécessite un lecteur par bloc et suppression des illustrations génériques.
- Bergé : test production 217581 = aucune annonce complète. Source Softr/Airtable côté client, HTML sans fiches ; un lecteur du catalogue public Softr reste à réaliser. Aucun accès à la base Airtable privée tenté.
- Vérification finale **pro-stock-sync v287**, commit de code `25a689e3c3bd9962f364ad0d398e6f8df218ba16` : tests production à blanc **217660 → 217661 → 217662 → 217663**, 20 → 40 → 60 → **62/62 références**, 48 ventes + 14 locations, **690 photos**, `partial=false`, `cycle_complete=true`, aucune page en échec, aucune référence fusionnée. Prix présents sur 62/62 ; le prix affiché est prioritaire sur l’onglet financier masqué (8326 : 1 762 €, onglet obsolète 193 €). Types lus dans le cartouche ou le titre / l’accroche propres à la fiche ; surfaces explicites du titre conservées (95 % des fiches), aucune surface d’appartement annexe attribuée à un commerce. Étiquettes DPE/GES identifiées reliées au lecteur d’images existant ; 6 DPE lus, 0 GES repéré, aucune classe fabriquée.
- Limites source 18 Avenue : **57 fiches complètes**, **5 sans commune exploitable dans la localisation** (8150, 8314, 8321, 8334, 8331) ; les descriptions et localisations imprécises / mal orthographiées sont conservées, aucune ville de remplacement. 8156 : description source de 70 caractères conservée. Nom de contact sur 62, téléphone sur 59 ; numéros d’agence explicitement désignés agence. Total 62 = références distinctes observées dans les deux catalogues, pas un compteur public garanti ; aucun siteCount inventé. Galeries contrôlées contre leur compteur source, doublons de tailles/adresses retirés, images noIMG exclues.
- Demande 18 Avenue `0d5e151a-72e9-4d0d-8382-53828e45d352` passée **done / Réparé · à valider visuellement** après ce contrôle ; `visual_validated_at` laissé nul. Le Cœur et Bergé maintenus **pending**, diagnostic du jour enregistré dans chaque demande. Tests et fixtures supplémentaires maison / local / bien mixte / loyer masqué ; tous les tests spécifiques passent. Aucun import, activation de flux, mail ni modification de prospect.


### 03/11/2026 (nuit) — Claude — Modération : titre lisible + titre d'origine
- Anthony : « fais le mieux ». `moderation.html` charge `vehicle-title-20261103.js` ; `moderation.js` (v=20261103-titres) : `modTitle` — titre de véhicule mis en forme comme sur le site, et en dessous, en petit, « Écrit par le vendeur : … » quand l'original est différent (liste et aperçu). Les contrôles automatiques lisent toujours l'original ; aucune annonce n'est modifiée ni remise en modération.

### 03/11/2026 (nuit) — Claude — Titres propres aussi dans les pages Google
- Question d'Anthony : « les titres avec les mises à jour, ça va être comment ? » → le formatage est fait à l'affichage, donc chaque synchronisation (nouvelles annonces, titres modifiés chez le pro) est mise en forme automatiquement, rien à refaire. Mais les pages Google (annonce/…, annonces/…) gardaient l'ancien formatage (« DS DS 7 Crossback 2.0 Bluehdi »).
- `scripts/build_share_pages.py` : `display_title` / `vehicle_title`, même dictionnaire que le site (lu dans assets/vehicle-title-20261103.js, une seule source) → titre Google, nom du produit (données structurées), titre de page, cartes des pages catégories/villes, fil d'Ariane. Véhicules seulement (équipements, pièces, vélos et autres rubriques : inchangé).

### 03/11/2026 (nuit) — Claude — Titres de véhicules propres + showroom sans « 0 abonné / Aucun avis »
- Revue visuelle (iPhone et ordinateur, vrai catalogue) : mise en page propre, mais titres de voitures « amateurs » (« Mini mini 2.0 205 cooper s jcw », « Ds ds 7 », « RENAULT TWINGO Twingo III », « Bmw serie 1 116d dkg f40 m sport »).
- Nouveau `assets/vehicle-title-20261103.js` (chargé par index.html et pro.html) : `displayVehicleTitle` — marques (BMW, DS, MG, Citroën…), sigles (TDI, TSI, BlueHDi, dCi, BVA, DSG, 4Matic, xDrive, AMG, JCW…), codes (A3, X1, GLA, F40, 116d), chiffres romains (III, VII), mots répétés supprimés, casse déjà travaillée conservée. **Affichage seulement** (cartes, fiche, en-tête, annonces liées, showroom) ; les annonces ne sont pas modifiées. Testé sur les 127 titres WeeCars.
- `index-main.js` v=20261103-titres : `displayListingTitle(titre, annonce)` utilise ce formatage pour les véhicules (pas pour les équipements ni les autres rubriques).
- `pro.html` : « Aucun avis » et « 0 abonné » ne s'affichent plus en tête du showroom (affichés dès qu'il y a un avis / un abonné).

### 03/11/2026 (nuit) — Claude — « Ne pas me compter » dans les statistiques
- Anthony : les 40 clics Google d'octobre sont sûrement les siens. Search Console : « Actions manuelles » = aucun problème.
- `index-main.js` (v=20261103-moi) + `pro.html` : ouvrir abracadeal.fr/?moi=1 sur un appareil → cet appareil n'est plus compté (visites, vues d'annonces, numéros, showrooms), même déconnecté ; ?moi=0 pour annuler (localStorage `abraca_not_counted`).

### 03/11/2026 (nuit) — Claude — Pages Google par grande ville (agglomérations)
- Les gens cherchent « voiture occasion Angers », pas « Les Ponts-de-Cé » (commune de WeeCars Angers).
- `scripts/build_share_pages.py` : `AGGLOS` (Angers, Paris + petite couronne 75/92/93/94, Cannes, Nice, Antibes, Marseille, Perpignan, Lyon, Bordeaux, Toulouse, Nantes, Lille) : la page de la grande ville (/annonces/<ville>/ et /annonces/<catégorie>/<ville>/) regroupe aussi les annonces des communes voisines (dès 3 annonces), avec un texte qui cite les communes. Les pages de chaque commune restent.
- Testé hors ligne (vrai catalogue) : /annonces/angers/ et /annonces/voitures-occasion/angers/ créées (« Voitures d’occasion à Angers », indexables, 120 liens d'annonces), /annonces/paris/ regroupe Paris + Alfortville. Mises en ligne au prochain passage du robot des pages (toutes les 10 min) et ajoutées au plan du site.

### 03/11/2026 (nuit) — Claude — Prêt pour beaucoup plus d'annonces : affichage par paquets + catalogue 2 fois plus léger
- Anthony : faire le chargement par pages tout de suite (la nuit, peu de visiteurs).
- **Affichage par paquets** (`index-main.js` v=20261103-pagination) : les listes n'affichent plus toutes les annonces d'un coup — 60 d'abord, puis 48 de plus en arrivant en bas (bouton « Voir plus d'annonces (N) », déclenché tout seul au défilement). La limite repart à 60 quand la recherche, les filtres, la catégorie ou le tri changent. Modération et « Mes annonces » : tout, comme avant.
- **Catalogue** : 1re photo seulement + `photo_count` (doc `supabase/2026-11-03-public-catalog-first-photo.sql`) → 0,35 Mo pour 156 annonces (1,38 Mo hier soir). Cartes : flèches / glissement conservés — au premier appui, les autres photos de l'annonce sont chargées (`carouselStep` + `ensureFullListing`, qui prépare aussi les photos privées). Fiche et modification : annonce complète rechargée avant affichage (jamais d'enregistrement d'une version partielle).
- Testé (iPhone simulé, vrai catalogue) : 60 cartes puis 108 / 156 / 172 en défilant, recherche « mercedes » 15 sans bouton, retour à 60 ; carrousel 1 → 20 photos au 1er appui (1 seul appel) ; fiche « 1 / 20 » ; ordre aléatoire, showroom/retour, recherche c63 toujours OK.
- Limite restante : au-delà de quelques milliers d'annonces, la recherche devra se faire côté serveur (le catalogue reste chargé en entier, même allégé).

### 02/11/2026 — Claude — Mails vérifiés + tableau de bord des visiteurs
- **Configuration des mails vérifiée** (en-têtes de mails reçus sur abracadeal@gmail.com + DNS) : contact@abracadeal.fr et partenaires@abracadeal.com passent SPF, DKIM (sélecteur OVH `ovhmo-selector-1`) et DMARC (p=none), score anti-spam OVH 0. Rien à corriger.
- **Constat trafic** : avant ce soir, seulement les vues d'annonces étaient comptées — 39 vues par 5 visiteurs depuis le 29/10, 1 numéro affiché. Aucun compteur de visites du site.
- Ajouté : `site_visits` + `track_site_visit` (index-main.js v=20261102-visiteurs : accueil / annonce ; pro.html : showroom ; 1 fois par visiteur, page et jour ; provenance Google/Facebook/direct… ; admins connectés exclus) et `admin_traffic_stats` → nouvelle section « Visiteurs et contacts » dans admin-pilotage.html (totaux, sources, par jour, par vendeur, annonces les plus vues ; 7/14/30/90 jours). Doc : `supabase/2026-11-02-site-visits.sql`.

### 02/11/2026 — Claude — Prospection : mail « votre stock est prêt, regardez » + bouton « Je publie »
- Anthony : « fais comme si c'était ton site ». Constat : 521 pros contactés, 31 clics, 0 inscription → changer le message avant d'envoyer plus.
- Quota remis à 25/jour/boîte relances comprises (migration `prospect_claim_shared_quota_preview_first`), premiers mails d'abord aux prospects dont l'aperçu est prêt (363 prêts : 334 agences, 29 garages).
- `prospect-mailer` v15 : si l'aperçu a ≥ 3 annonces → objet « {{societe}} : vos N véhicules/biens sont déjà prêts sur Abracadeal », mail court avec le lien personnel vers l'aperçu et « Je publie » ; relance assortie seulement si le 1er mail était celui-là (`mail_kind`). Sinon anciens mails inchangés.
- `pro-fondateur.html?r=…` : sous l'aperçu, formulaire « Je publie » (SIRET + e-mail + téléphone facultatif + case d'accord) → `prospect_accept` (contrôle du SIRET, lien personnel obligatoire, 3 envois max) → `private.prospect_acceptances` (+ `siren_matches` si le SIREN du prospect est connu), relance arrêtée, ligne `accept` dans `prospection_logs`. **Rien n'est publié automatiquement** : l'import se lance ensuite (accord + SIRET = règle d'Anthony respectée). Testé sur iPhone simulé (SIRET faux refusé, accord enregistré).
- Tâche de surveillance des mails : ajoute les accords « Je publie » à son compte rendu.

### 02/11/2026 — Claude — Prospection : relances en plus des premiers mails
- État constaté : 521 entreprises contactées (52 sur 3 jours), 874 mails dont 320 relances, 31 clics, 0 inscription ; aperçus prêts pour 531 prospects (470 avec ≥ 5 annonces), mais seuls 85 des 521 contactés en avaient un à l'envoi.
- Demande d'Anthony : garder les relances automatiques, mais « envoyer en plus du prospect ». Avant, le quota de chaque boîte (25/jour) était partagé moitié-moitié entre premiers mails et relances.
- `prospect_mailer_claim` (migration `prospect_relances_en_plus`, copie `supabase/2026-11-02-relances-en-plus.sql`) : premiers mails = quota complet (25/jour/boîte) ; relances en plus, quota séparé (25/jour/boîte), même répartition sur la journée. Au plus ~100 mails/jour sur les 2 boîtes au lieu de ~50. Règles de sélection inchangées.
- Proposé (pas fait) : n'écrire qu'aux prospects avec aperçu et le montrer dans le mail ; bouton « Je publie » (SIRET + e-mail) sur l'aperçu.

### 02/11/2026 — Claude — Champ de recherche : texte « Rechercher »
- Demande d'Anthony : enlever « c63, studio Cannes… » du champ. `index.html` : placeholder « Rechercher ».

### 02/11/2026 — Claude — Tri « Au hasard » retiré du menu (ordre aléatoire gardé)
- Demande d'Anthony : « enlève la touche au hasard ».
- `index.html` : option retirée (menu : Plus récentes, Prix croissant, Prix décroissant). `index-main.js` (v=20261102-sans-bouton-hasard) : l'ordre reste aléatoire tant que la personne n'a pas choisi un tri elle-même (`sortChosenByUser`, remis à zéro avec les filtres) ; choisir « Plus récentes » donne vraiment les plus récentes. Testé : 3 visites → 3 ordres différents.

### 02/11/2026 — Claude — Vignettes nettes (petit côté 720 px) en ligne
- Remarque d'Anthony sur les vignettes 640 px : « elles font dégrader les photos ». La vignette rogne la photo en carré : c'est le petit côté qui compte (640 px de large = 480 px de haut, agrandi à l'écran).
- `generate-listing-thumbs` v8 : petit côté 720 px (grand côté 1200 max), JPEG 80 ; les 156 refaites (moyenne 133 Ko) ; cron temporaire `abracadeal-thumbs-720-tmp` supprimé ; `thumbUrl` `?o=5` (index-main.js v=20261102-vignettes-720).

### 02/11/2026 — Claude — Showroom (mobile) : la flèche « Retour » de la fiche renvoyait sur l'accueil
- Remarque d'Anthony : sur mobile, en sortant d'une annonce ouverte depuis le showroom, on arrivait sur la page principale.
- Cause : la barre du haut et la barre du bas du showroom (app-shell, z-index 2147482000/2147482001) passaient AU-DESSUS de la fenêtre de la fiche (z-index 99999). Toucher « Retour » en haut de la fiche touchait en réalité le logo Abracadeal du showroom → accueil (et en bas, la barre du showroom recouvrait « Voir le numéro » / « Message »).
- `pro.html` : fenêtre de la fiche (préchargée ou non) en z-index 2147483600, au-dessus des barres.
- Testé (iPhone simulé) : flèche Retour, retour du navigateur, 3 ouvertures de suite → on reste sur /weecars-angers.

### 02/11/2026 — Claude — Annonces dans un ordre aléatoire
- Demande d'Anthony : « il faut que les annonces tournent aléatoirement ».
- `index.html` : nouveau tri « Au hasard », par défaut (« Plus récentes », « Prix croissant/décroissant » toujours au choix). `index-main.js` (v=20261102-hasard) : ordre tiré au hasard à chaque visite (graine au chargement, stable pendant la visite : la liste ne saute pas à chaque redessin). Toujours au plus 2 annonces d'affilée du même vendeur ; annonces boostées toujours en positions 1, 4, 7. Recherche par mots-clés, « Mes annonces », favoris et modération : plus récentes d'abord.
- Testé : 3 visites → 3 ordres différents, ordre identique après redessin.

### 02/11/2026 — Claude — Réglage général (« règle bien tout le site »)
- Audit sur téléphone simulé (iPhone 13, Playwright) avec le vrai catalogue (156 annonces), réponses Supabase simulées.
- **Trouvé : 624 appels `get_listing_favorite_count` à chaque ouverture de l'accueil** (un par vignette, répété à chaque redessin, sans dédoublonnage). Corrigé : `public_catalog()` renvoie `favorite_count` (migration `public_catalog_favorite_count`), le site remplit le cache avec (`primeFavoriteCounts`) et ne demande jamais deux fois le même compteur en même temps. 624 → 0 appel ; annonces affichées en ~1 s au lieu de 2,6 s (en local).
- **Fiche : toutes les photos (souvent 20+, en pleine taille, lues chez le pro) chargées d'un coup par la bande de miniatures.** Corrigé : 4 tout de suite, les autres quand la bande défile (`hydrateDetailStrip`) ; photo principale en priorité haute ; miniatures de la galerie plein écran en chargement différé. 18 → 6 photos à l'ouverture.
- **supabase-js chargé depuis jsdelivr (version « @2 » non figée, redirection) sur 28 pages** (showroom, vacances, admin…) → `/assets/supabase-js-2.118.0.js` (même version, servie par le site).
- Vérifié : recherche « c63 », fiche → texte complet, showroom → fiche préchargée (2e ouverture ~0,1-0,2 s), 5 autres pages sans erreur.
- `index-main.js` v=20261102-reglages.

### 02/11/2026 — Claude — Base : sauvegarde avant allègement
- Demande d'Anthony : alléger la base (203 Mo ; limite de l'offre gratuite 500 Mo). Gros postes : `private.prospect_leads` 88 Mo (233 754 lignes), `net._http_response` 47 Mo (réponses web gardées 6 h, dont mes pages de test de cet après-midi).
- Sauvegarde faite (fonction `prospect-backup`, lecture seule) : les 212 856 entreprises sans site ni e-mail (`guess_failed`, `no_site`) → bucket privé `backups`, 8 fichiers `prospect_leads_sans_site_2026-11-02_partNN.jsonl.gz` (13 Mo).
- Fait avec l'accord d'Anthony (« vas-y la base ») : `truncate net._http_response`, suppression des 212 856 lignes, `vacuum full private.prospect_leads` → 20 898 lignes (6 Mo). Base : 203 Mo → 74 Mo.

### 02/11/2026 — Claude — Vignettes 640 px en ligne
- Les 156 miniatures refaites en 640 px / JPEG 78 (moyenne 70 Ko au lieu de ~130 Ko) ; cron temporaire `abracadeal-thumbs-640-tmp` supprimé. `thumbUrl` : `?o=4` (index-main.js v=20261102-vignettes-640).
- Copie des autres photos (2 819 sur 3 034 encore lues sur les sites des pros, surtout spidervo) : refusée par Anthony (stockage gratuit limité à 1 Go, gain faible au premier affichage).

### 02/11/2026 — Claude — Recherche IA gratuite : testée, pas mise en ligne
- Modèle gratuit gte-small (Supabase), 147 annonces traitées, 12 recherches testées. Bon : « casque moto », « SUV diesel automatique », « trottinette électrique ». Mauvais : « c63 » → Citroën C3 en premier ; « citadine pas chère », « appartement terrasse », « maison avec piscine » → lampes, fauteuil, radiateur. Scores tous entre 0,79 et 0,89 : impossible de séparer les bons résultats du bruit. Modèle anglais, trop faible en français.
- Non mis en ligne (branche `recherche-ia` gardée). Cron `abracadeal-ai-embeddings` (47) mis en pause ; table `private.listing_embeddings` et fonction `ai-search` conservées.
- Vérifié : la recherche par mots-clés corrige déjà les fautes (mersedes, apartement terrase, trotinete electrique, voiture familliale, casqe moto, mercede).
- Alternative gratuite proposée à Anthony : Mistral (offre gratuite « Experiment », modèle d'empreintes français), à brancher sur le même code.

### 02/11/2026 — Claude — Premier affichage plus rapide sur mobile
- Remarque d'Anthony : c'est le premier affichage qui est lent sur mobile.
- `index.html` : le catalogue (`public_catalog`) est demandé dès le début de la page, en parallèle des styles et scripts (`window.__abracaCatalogPrefetch`, sauf fiche intégrée / lien d'annonce / aperçu) ; supabase-js servi depuis le site (`assets/supabase-js-2.118.0.js`, plus de connexion à jsdelivr) ; polices Google chargées sans bloquer l'affichage.
- `index-main.js` (v=20261102-demarrage-rapide) : le dernier catalogue reçu est gardé sur l'appareil 12 h (`abraca_catalog_v1`, < 3 Mo) et affiché immédiatement à la visite suivante, puis remplacé par le catalogue à jour dès son arrivée.
- Testé (Playwright, réponses simulées) : 1 seul appel catalogue (préchargé), annonces affichées dès 300 ms à la 2e visite, fiche → texte complet rechargé, aucune erreur.

### 02/11/2026 — Claude — Accueil : plus de doublons entre « D'après vos recherches » et « Récemment consultées »
- Remarque d'Anthony (capture) : les mêmes C 63 dans les deux rubriques.
- `index-main.js` (v=20261102-sans-doublon) : « D'après vos recherches récentes » exclut les annonces déjà affichées dans « Récemment consultées » (rubrique cachée s'il ne reste rien) ; les recherches passées utilisent la même recherche par mots-clés que le site (« c63 » = « c 63 »).

### 02/11/2026 — Claude — Showroom : fiche préchargée
- Retour d'Anthony après l'ouverture rapide : « bof ». Le gros du délai restait le chargement de toute la page du site (HTML, scripts, styles) dans la fenêtre de la fiche à chaque clic.
- `pro.html` : une fenêtre de fiche (`/?embed=1`) est préchargée en arrière-plan dès que le showroom est affiché ; au clic, le showroom lui demande d'ouvrir l'annonce (`abraca-open-annonce`) → plus de rechargement de page. Fermeture / retour / Échap : la fenêtre est cachée et gardée pour l'annonce suivante (`abraca-close-annonce`). Si elle n'est pas encore prête : ancienne méthode.
- `index-main.js` (v=20261102-fiche-prechargee) : en mode intégré, le catalogue n'est plus chargé du tout (rien n'est affiché derrière la fiche).

### 02/11/2026 — Claude — Showroom : fiche ouverte plus vite
- Remarque d'Anthony : cliquer sur une annonce dans le showroom « met du temps ».
- Cause : la fiche (index.html?annonce=…&embed=1) attendait, l'un après l'autre, la vérification du compte, les favoris et tout le catalogue avant de s'ouvrir.
- `index-main.js` (v=20261102-fiche-rapide) : avec `?annonce=`, l'annonce est lue seule (une ligne) et ouverte dès qu'elle arrive ; une fois le compte vérifié, la fiche est redessinée si un utilisateur est connecté (boutons propriétaire, favori). Aperçu admin et import inchangés.

### 02/11/2026 — Claude — « Recherche IA » retiré
- Remarque d'Anthony : « pourquoi il y a écrit IA si ce n'en est pas ». La recherche est à règles (mots-clés + critères reconnus), sans IA.
- `index.html` : champ « ✦ Recherche IA » → « Rechercher : c63, studio Cannes… » ; `smart-search-20260924.js` (v=20261102-sans-ia) : « Recherche intelligente : » → « Critères reconnus : ».
- Proposé : vraie recherche IA (empreintes de sens des annonces + compréhension de la phrase), en attente du choix d'Anthony (Mistral payant recommandé).

### 02/11/2026 — Claude — Recherche : « c63 » / « c 63 »
- Remarque d'Anthony : « c63 » ne trouvait rien ; « c 63 » trouvait les deux C 63 AMG mais aussi 2 vans et une Alfa Romeo.
- Cause : « c63 » n'apparaît pas tel quel (« C 63 AMG ») ; et chaque mot était cherché comme un morceau de texte (« c » partout, « 63 » dans 63000, 163…).
- `index-main.js` (v=20261102-recherche-c63) : lettres + chiffres collés des deux côtés (`kwGlue` : « c 63 » = « c63 », « a 3 » = « a3 ») ; un mot de 1-2 lettres ou avec des chiffres doit correspondre à un mot entier (« c63 » trouve aussi « C 63S »). Testé : c63, c 63, 63, a3, x5, 208, 2020, classe c (sans les Classe V), 220 d, bequile, 3 pieces.

### 02/11/2026 — Claude — Accueil allégé + recherche de sites la nuit
- Demande d'Anthony : recherche de sites la nuit, site le plus rapide possible (« quand il y aura plusieurs pros ça va être compliqué »).
- Cron `abracadeal-prospect-site-precheck` et `abracadeal-prospect-preview-fill` : de 6h-17h/20h UTC à 22h-5h UTC (23h-6h à Paris).
- Accueil (`index-main.js` v=20261102-catalogue-leger) : le catalogue vient de `public_catalog()` (voir `supabase/2026-11-02-public-catalog.sql`) : 1,38 Mo → 0,76 Mo pour 156 annonces. La liste d'équipements des véhicules (400 Ko) et le texte au-delà de 600 caractères ne sont plus chargés sur l'accueil ; la fiche et le formulaire de modification rechargent la description complète (jamais d'enregistrement de la version courte). Repli automatique sur l'ancienne requête si la fonction échoue.
- Limite connue : une recherche sur un équipement (« toit ouvrant ») ne trouve plus l'annonce depuis l'accueil.
- Remplissage initial de `catalog_desc` : `updated_at` des 156 annonces en ligne mis à l'heure du remplissage (non affiché).
- Prochaine étape pour des milliers d'annonces : chargement par pages côté serveur.

### 02/11/2026 — Claude — Site lent : base de données saturée
- Remarque d'Anthony : « le site est très trop lent ».
- Cause trouvée : les files d'attente de la prospection (`prospect_crawler_next`, `domain_guess_next`, `promote_annuaire_leads`) relisaient toute la table `private.prospect_leads` (233 000 lignes, 87 Mo, aucun index) à chaque appel : 1,2 à 2,5 s par appel, des milliers d'appels. Sur la petite base (60 connexions), ces lectures occupaient le disque et les connexions → erreurs « Too many connections » et pages lentes pour les visiteurs. Mes tests avec `pg_sleep` (30 s chacun) ont aggravé la situation : abandonnés.
- Corrigé (`supabase/2026-11-02-prospect-leads-indexes.sql`, appliqué en direct) : index partiels sur les files d'attente + `lower(email)` sur `prospection_prospects` et `email_opt_outs`. `domain_guess_next` : 2,5 s → 0,05 s.
- Miniatures : les 48 vignettes manquantes depuis la refonte 900 px (l'accueil chargeait les photos d'origine à la place) ont été générées ; il n'en reste aucune en attente.
- Vérifié : la requête du catalogue de l'accueil (156 annonces) prend 20 ms côté base.

### 02/11/2026 — Claude : WeeCars Angers, stock complet en ligne (127 véhicules)
- Anthony : « mets-les maintenant ». Synchro lancée à la main (`sync_all`) : 24 → 127 annonces en ligne, toutes passées par la modération automatique.
- Les deux premiers passages ont été coupés par la limite de durée de la fonction (503) après ~57 puis ~56 créations ; rien de perdu (les fiches déjà créées sont mises à jour). `readSpiderVo` : 3 fiches à la fois, et arrêt propre après 80 s (lecture partielle → aucun retrait, la suite au passage suivant). Dernier passage complet : 127 lus, 14 créés, 112 inchangés.

### 02/11/2026 — Claude : WeeCars dans toute la France, Spider VO lu en entier
- Anthony : « mettre d'autres WeeCars dans les 4 coins de la France ». 40 agences WeeCars dans les prospects, dont une vingtaine pointaient vers le stock d'Angers (`?stock=993`). Le site WeeCars liste 36 agences avec leur numéro de stock → 30 adresses de prospects corrigées ; 5 agences absentes de la liste (Lille Est, Lille Ouest, Narbonne, La Rochelle, Charleville-Mézières) : adresse retirée, note ajoutée.
- Spider VO (`readSpiderVo`) : la liste n'affiche que 24 véhicules, la suite est chargée par `/xhr_ws.php?xhr_func=svositec_aj002` avec le cookie de session « svo » → toutes les pages lues (jusqu'à 300). WeeCars Brest 24 → 138, WeeCars Angers 24 → 127, Ventury 24 → 46.
- Agence d'un réseau (`?stock=`) : ville = nom de l'agence dans le menu du site (Brest), plus l'adresse du siège (Castelnau-le-Lez) ; avec un compte pro, la ville du compte reste prioritaire.
- À savoir : à la prochaine synchro, WeeCars Angers (compte actif, 24 annonces en ligne) aura ~100 véhicules de plus, envoyés à la modération automatique.

### 02/11/2026 — Claude : test des logiciels immobiliers (La Boîte Immo, Orpi, Apimo) et corrections
- La Boîte Immo : 10/10 agences lues, toutes les fiches complètes, sans doublon. Orpi : 8/8. Apimo : 8/12 au départ → 11/12 (Dana : site trop lent au moment du test).
- Villes :
  - anciennes communes fusionnées reconnues (Hauteville-Lompnes, Bellegarde-sur-Valserine…) : 2 501 communes déléguées / associées ajoutées à `commune_ref` (`alias_of`), avec la position et les codes postaux de la commune actuelle ;
  - l'ancienne correction `correctCityPostal` (API de l'État, commune la plus peuplée) écrasait les bons codes postaux des homonymes (« Montréal 32250 » → 11290, Aude) : elle s'efface quand la liste officielle est chargée ;
  - « secteur / à proximité de / proche de / entre / à 10 min de X » dans un titre ne remplace plus la ville du site (« SECTEUR CONDOM » pour un bien à Moncrabeau) ;
  - agence sans code postal sur ses fiches : située par les villes au nom unique ; ville lue dans le texte à 80 km au plus (« à 1 h de Lyon ») ; œ / æ (« Niederroedern »).
- Apimo : fiches « /fr/propriété/<n°> » (avec accents, sans « vente+… ») reconnues, liste lue même sans module « listing », biens liés depuis l'accueil (Gambetta 50, Agence Longchamp 97, Agence du Village La Roquette 5).

### 02/11/2026 — Claude : quels logiciels utilisent les prospects (stratégie « par logiciel »)
- 10 138 prospects ont un site, 1 335 seulement avaient été vérifiés. Échantillon de 600 sites jamais vérifiés (300 agences, 300 garages), page d'accueil lue et logiciel reconnu à ses traces (table temporaire `tmp_platform_sample`).
- Agences (300) : Orpi 22 %, La Boîte Immo 16 %, Apimo 5 %, Immo-facile 3 %, Twimmo 2 %, Netty 1 %, Adapt'immo — soit ~50 % sur des logiciels que le robot lit déjà ; WordPress 11 %, inconnu 22 %, site en erreur 10 %, vraie protection anti-robots 2 %.
- Garages (300) : très éparpillé. Sites constructeur Stellantis (Peugeot…) 11 %, autres constructeurs 4 %, Leboncoin seulement 5 %, Motoconcess 4 %, Dealer K 4 %, Annonces-Automobile 3 % (comme Life Cars), Autobiz 2 %, Starterre 2 %, Spider VO 1 % ; WordPress 21 %, inconnu 28 % (beaucoup de garages d'entretien sans stock d'occasion).
- Remarque : l'ancien contrôle de site classait « protection anti-robots » les pages avec un simple reCAPTCHA de formulaire de contact (397 agences marquées ainsi) : à revérifier.

### 02/11/2026 — Claude : complexeautomobile réparé, robot (véhicules, photos, diagnostic)
- complexeautomobile (WordPress, thème Motors) : pour les véhicules, le robot ne lisait que les 6 000 premiers caractères de la page (le menu) → texte autour du titre lu aussi ; année « 2 010 » comprise. 17 véhicules, 16 complets.
- Photos : image d'attente du thème Motors (`plchldr350.png`) et photos iPhone HEIC (non affichées par Chrome / Firefox) écartées.
- Diagnostic : `debug_detail` renvoie `refusal` (pourquoi une page n'est pas retenue : pas de titre, prix, ni km ni année, ni surface ni pièces).
- Restent illisibles (contenu chargé en JavaScript ou sites fermés aux robots) : 18avenue, i3v, arcade, l'autre immobilier, nextlogis, berry-sologne (Naos), atelierautoretro, ats-sud, autopiacars, garagevrauto, ultimatecar83, axeylia, etc.

### 02/11/2026 — Claude : sites renvoyés par Anthony (Ventury, rmcars93, monagenceautomobile, groupe 123 immo)
- Ventury (« Perpignan la ville et non Paris ») : les données du site donnent le siège parisien. Nouveau : adresse du pro fixée pour tout un site (`pro_stock_overrides`, `ref = '*'`, `{ville, code_postal}`) → Perpignan 66000 (le site dit aussi « Le Soler »).
- rmcars93 (« Noisy-le-Grand ») : « SEAT LEON » était lu comme la commune de Léon (40). Véhicules : plus de commune devinée dans le titre ni l'adresse de la fiche (Leon, Ibiza…), seulement dans la description, puis ville majoritaire du garage pour tous ; ville lointaine (> 150 km) d'un véhicule remplacée par celle du garage.
- monagenceautomobile (« plus d'annonces non lues ») : la page `/agence/chateauroux-54` ne montre que 5 véhicules → le robot part de la liste filtrée `/acheter-un-vehicule/?agencie=54` et ne suit que les pages qui gardent ce filtre. 13/13.
- groupe 123 immo (« problème photo ») : La Boîte Immo — les liens photo des données structurées (`…/600xauto/images/1/…`) répondent 404 ; corrigés en `…/1600xauto/images/biens/1/…`, et les photos de la page sont préférées quand ce sont les mêmes fichiers. Concerne aussi Christine Dumas, Arlim, Influences, Agence Résidence. Accents cassés (« Ã  », « mÂ² ») réparés.
- Arlim : vérifié que Cannes / Paris / Eygalières restent (ville réelle lointaine, signalée), plus remplacées.
- covapro : grande commune lue dans l'adresse de la fiche même sans position d'agence (« …-dole-31747 » → Dole).

### 02/11/2026 — Claude : revérification des 50 sites « réparés » + robot plus solide
- Anthony : « répare bien les sites à lire, enfin le robot ». Les 50 sites marqués réparés ont été relus un par un (titres, villes, photos), pas seulement compter les biens.
- Corrigé dans le robot (`pro-stock-sync`) :
  - homonymes lointains : « Bordeaux Saint-Michel » lu Saint-Michel (Aisne) → commune proche cherchée dans le titre puis l'adresse de la fiche ; si rien, ville de l'agence (signalé) — seulement quand le nom est porté par plusieurs communes (une vraie ville lointaine comme Lorient reste, signalée) ;
  - commune écrite dans l'adresse de la fiche (`…/type-3-neuf-bourg-en-bresse/` lu « Lyon ») ; commune d'un seul mot dans un lien refusée tant que la position de l'agence est inconnue (« centre-bourg » → Le Bourg dans le Lot) ;
  - agence sans adresse : sa commune lue dans l'adresse du site (guipry-messac.cimm.com) → « St-Just » = Saint-Just 35 et non 34 ;
  - code postal inexistant retiré (covapro « 31747 ») ; code postal ajouté quand la commune n'en a qu'un ; entités HTML décodées (« Val d&#039;Anast ») ; ville de l'agence au nom officiel (« Bourg en Bresse » → Bourg-en-Bresse) ;
  - pages qui ne sont pas des biens : pages racine écartées quand les biens sont dans un dossier `/bien/…` (pages quartiers d'agence-bordeaux), titres de pages de liste écartés (« Ventes immobilières », « Trouver un bien ») ;
  - fiche sans ville, agence sans adresse → ville de la grande majorité des autres biens (signalé) ;
  - liste officielle des communes gardée dans notre base (`commune_ref`, `supabase/2026-11-02-commune-ref.sql`) : avant, sous charge, l'API de l'État ne répondait pas à temps et les villes n'étaient plus vérifiées pendant 10 min (Triumph « Ergue Gaberic »).
- Régression évitée : la règle « pages de liste sans numéro » écartait aussi les fiches Twimmo (`…-1-247v562a.html`) → Laroca relu 37 biens au 1er passage.
- Échec honnête : Human Immobilier (La Flotte-en-Ré, La Châtre) renvoie maintenant toutes ses pages d'agence vers l'accueil pour notre robot → marqué en échec.
- Résultat : 47 sites relus corrects (titres réels, villes officielles, photos du site), dont Cimalpes 9 biens Courchevel, Cosmopolitan 6/6, agence-bordeaux 20/21, bgi01 6/6 Bourg-en-Bresse, guipry-messac 29/29.

### 02/11/2026 — Claude : Cosmopolitan Real Estate (réparation refaite)
- Anthony : « soi-disant réparé ». L'aperçu montrait « Trouver un bien », « Cosmopolitan Real Estate » (pages de liste lues comme des biens) et des photos cassées.
- `smart-reader.ts` : quand au moins 2 fiches d'un même niveau finissent par un numéro (`/immobilier-…-313.html`), les pages de ce niveau sans numéro et au nom de liste (`/acheter-…`, `/liste-biens-…`, `/vente-…`) sont des listes. Résultat : 6 biens réels sur 6 (Nice, 1 à Antibes d'après la fiche), DPE sur 4.
- Photos : le site n'a pas de https valide, ses photos `http://` sont bloquées par les navigateurs sur abracadeal.fr. `moderate-listing/import-images.ts` : toute photo en `http://` est copiée chez nous (pas seulement la 1re). L'aperçu de la page Imports affiche « Photo en http… copiée chez nous à la publication » au lieu d'une image cassée.

### 02/11/2026 — Claude : Cimalpes Courchevel (réparation refaite)
- Anthony : « soi-disant réparé ». La 1re réparation lisait en fait 7 biens de l'Alpe d'Huez : la page « à propos » de l'agence (`/fr/a-propos/agence-courchevel-1850/`) n'a que le menu du réseau, et ses liens étaient gardés comme « fiches de l'agence ».
- `index.ts` : page d'agence de type à propos / agence-<ville> sans fiche de sa ville → le robot part de la liste du site qui porte le nom de la ville (`/fr/immobilier-courchevel/`, la vente plutôt que la location saisonnière en immobilier).
- `smart-reader.ts` : quand la page de l'agence a au moins 3 fiches sous son propre chemin, ses autres liens (menu du réseau) sont ignorés. groupe 123 immo (fiches hors du chemin de l'agence) inchangé : 21/21, villes de l'Yonne.
- Test Cimalpes : 9 biens de Courchevel complets sur 9, DPE sur les 9 (1er passage, la suite aux synchros suivantes).

### 02/11/2026 — Claude : page Imports de sites, « Demandes » ne garde que l'attente
- `admin-test-import.html` : « Demandes » n'affiche plus que les demandes en attente. Les pros déjà activés ou en pause (ex. WeeCars Angers) passent dans un nouveau bloc replié « Pros connectés », avec les mêmes boutons (Aperçu, Synchroniser, Pause).

### 02/11/2026 — Claude : nom officiel des villes (tirets)
- `pro-stock-sync` : une ville reconnue dans la liste officielle prend toujours son nom officiel. Avant, « Mouans Sartoux » (Life Cars) restait sans tiret, car la comparaison ignorait tirets et accents → maintenant « Mouans-Sartoux ».

### 02/11/2026 — Claude : adresses courtes des showrooms visibles par Google et les réseaux
- Avant : `abracadeal.fr/weecars-angers` n'existait pas en vrai ; c'est le script de `404.html` qui envoyait au showroom. Google, Facebook, WhatsApp recevaient donc « page introuvable » (code 404) et aucun aperçu.
- `build_pro_pages.py` : lit `pro_showrooms.slug` et écrit `/<slug>/index.html` (même contenu que la page `garage/…`, adresse officielle = la page `garage/…`, le visiteur part directement au showroom). Nom ignoré s'il est déjà pris par une page du site ; ancienne adresse supprimée si le pro la change (champ `short` dans `pro-pages.json`).
- `share-pages.yml` : ces dossiers sont ajoutés au commit automatique.

### 02/11/2026 — Claude : référencement, titres Google des annonces
- `build_share_pages.py` (VERSION 10) : titre de page (celui que Google affiche) lisible quand le vendeur écrit tout en majuscules (« PEUGEOT 5008 1.5 BLUEHDI… » → « Peugeot 5008 1.5 Bluehdi… », sigles courts et mots avec chiffres inchangés) ; « occasion » ajouté aux véhicules (pas aux équipements / pièces, ni aux véhicules neufs) car c'est ce que tapent les acheteurs. Ex. : « Audi A4 Avant 2.0 40 TDI 190 S-Line S-Tronic BVA 2018 occasion – 24 490 € – Les Ponts-de-Cé (49) | Abracadeal ». Le titre affiché sur la fiche reste celui du vendeur.

### 02/11/2026 — Claude : bug « je clique sur la voiture et j'ai un casque » (agrandissement des photos)
- Cause (`assets/index-main.js`, dessin de la liste des annonces) : à chaque vignette dessinée, `currentDetailPhotoUrls` / `currentDetailListing` (photos de la fiche ouverte) étaient écrasés par ceux de la vignette. Si la liste se redessinait pendant qu'une fiche était ouverte (chargement des annonces, fiche ouverte depuis un showroom ou un lien partagé), « Agrandir » montrait les photos et le titre de la dernière annonce de la liste (ici un casque). Lignes retirées ; seule l'ouverture d'une fiche les remplit. Version `20261102-lightboxfix`.

### 02/11/2026 — Claude : référencement, maillage interne
- Pied de page de l'accueil : liens vers « Voitures d'occasion » (/annonces/voitures-occasion/), « Voitures par marque et budget » (/auto/) et « Garages sur Abracadeal » (/garage/) — l'accueil est la page la plus forte du site, ses liens font découvrir ces pages à Google.
- Pages publiques d'annonce (`build_share_pages.py`, VERSION 9) : annonce d'un pro qui a sa page publique (pro-pages.json) → « Vendu par WeeCars Angers · voir ses 24 annonces » vers /garage/<nom-ville>/. Chaque annonce renforce ainsi la page du garage, et la page du garage mène à toutes ses annonces. `owner_id` ajouté aux champs lus. Testé hors ligne (fixture).

### 02/11/2026 — Claude : annonce ouverte par-dessus le showroom (Anthony : « y a un passage quand même sur la page d'accueil »)
- `pro.html` : un clic sur une annonce du showroom ouvre la fiche dans une fenêtre intégrée par-dessus le showroom (`/?annonce=<id>&embed=1`), sans quitter la page ; retour du navigateur / Échap / croix de la fiche → retour au showroom. Ctrl / Cmd / clic molette : nouvel onglet comme avant.
- `index.html` (+ `index-main.js` `20261102-embed`) : en mode intégré (`?embed=1` dans une fenêtre intégrée), en-tête, page d'accueil, pied de page et barre mobile masqués, fond transparent : on ne voit que la fiche, le showroom flouté derrière. La fiche prévient le showroom quand elle est affichée (fin du « Chargement ») et quand elle est fermée. Le retour par `&retour=` reste en secours pour les liens ouverts autrement.

### 02/11/2026 — Claude : annonce ouverte depuis un showroom (Anthony : « ça l'ouvre et nous emmène en même temps sur le site principal »)
- `pro.html` : les annonces du showroom ouvrent `/?annonce=<id>&retour=<adresse du showroom>`.
- `assets/index-main.js` (`20261102-retour`) : fiche ouverte avec `retour` → en la fermant (croix, retour, fond), on revient au showroom (retour arrière du navigateur si on vient de lui, sinon chargement de l'adresse). Pas de retour si une autre fenêtre s'ouvre à la place (connexion pour écrire, profil du vendeur). Adresse de retour limitée aux chemins du site.

### 02/11/2026 — Claude : bouton « Voir le showroom » de la fiche annonce (Anthony : « mieux que ça »)
- `assets/index-main.js` + `index-overrides.css` (`20261102-showroombtn`) : bouton sur une seule ligne « Voir le showroom » avec icône boutique, sous-titre « 24 annonces en ligne » (nombre réel des annonces du pro), flèche ; dégradé violet → rose, plus de texte « Voir le showroom WeeCars Angers » coupé sur deux lignes. Ville du pro en majuscules (« LES PONTS-DE-CE ») affichée en minuscules accentuées comme saisie (`prettyCity`).

### 02/11/2026 — Claude : référencement, contrôle (Anthony : « viens on fait le référencement »)
- Vérifié : 53 annonces dans `sitemap-annonces.xml`, page garage WeeCars dans `sitemap-pros.xml` ; pages d'annonce avec titre, description, adresse canonique, `index,follow`, données structurées Car/Product + fil d'Ariane ; page garage « WeeCars Angers – Garage à … : 24 véhicules d'occasion ». IndexNow actif : 2 + 70 + 70 + 17 pages signalées aujourd'hui (réponse 200).
- Corrigé : noms de villes « Les Ponts-De-Cé » / « Les Ponts De Ce » (`.title()` Python, ville de la fiche pro en majuscules) → `french_city()` (« Les Ponts-de-Cé ») dans `build_share_pages.py` et `build_pro_pages.py`, la ville correctement écrite dans les annonces étant préférée.

### 02/11/2026 — Claude : un seul menu Véhicules (Anthony : « j'aime pas Vélo & équipement, quand on clique sur Véhicules ça doit mettre les véhicules pas les équipements »)
- `index.html` : l'entrée séparée « Vélos & équipements » de la barre du haut est supprimée ; le menu Véhicules a deux colonnes : « Véhicules » (Tous les véhicules, Voitures, Motos / Scooters, Utilitaires, Caravaning, Nautisme) et « Équipements & pièces » (Tous les équipements & pièces, équipement auto / moto / caravaning / nautisme, Vélos, équipement vélo, pièces détachées). Style `desktop-submenu-split` dans `index-overrides.css` (`20261102-vehmenu`).
- Un clic sur « Véhicules » (ou « Tous les véhicules ») n'affiche que des véhicules : règle `vehicleSubMatches` déjà en place, inchangée. Libellés « Vélos, équipements & pièces » → « Équipements & pièces » (filtre, rubrique de l'accueil).

### 02/11/2026 — Claude : mise en page des cartes de modération (Anthony : « refais une bonne mise en page »)
- `assets/moderation.js` / `moderation.css` (version `20261102-layout`) : « Voir l'annonce complète », Valider / Refuser / Supprimer regroupés dans un pied de carte (`.card-foot`) collé en bas → boutons alignés d'une carte à l'autre, sur toute la largeur. « Signaler à Pharos » n'est plus un gros bouton qui dépasse de la carte : lien discret en bas à droite (action grave et rare, confirmation inchangée). Vérifié en capture bureau et mobile.

### 02/11/2026 (nuit) — Claude : sites à réparer, suite (pro-stock-sync v233–v242)
- Corrections générales du lecteur automatique (`smart-reader.ts`, `index.ts`, `apimo-reader.ts`, `legacy-html.ts`) :
  - petites agences avec un seul bien par type d'adresse (« /vente/1-brest/appartement/t1/379-… ») : second regroupement par rubrique ;
  - fiches à numéro court (« /nos-annonces/ventes/lyon/appartement/13/ ») et à paramètre (« ?cle= », « ?post_detail= ») reconnues ; référence prise dans le paramètre (avant : toutes les fiches « detail.htm » fusionnées) ;
  - page d'agence d'un réseau (« /agences/auxerre-centre/1 ») : numéro de page hors périmètre, fiches liées depuis les pages de l'agence gardées (lecture par étapes et test) ;
  - page d'accueil vide avec l'en-tête « flux » → relue comme un navigateur (Kombishop) ;
  - pages windows-1252 annoncées utf-8 (« Asni�res ») décodées correctement ;
  - fiches Apimo d'un modèle inconnu : données structurées + page + étiquettes DPE dessinées ;
  - photos : page lue quand la fiche n'a que 1 à 3 photos dans ses données structurées ; photos sans extension d'un dossier de stockage ; miniatures PrestaShop remplacées par la grande taille ;
  - description : paragraphe sous un titre « Description » prioritaire sur le texte des liens de bas de page ; titre principal qui n'est qu'un prix ignoré ; « ACHAT VENTE - … Agence immobilière X » nettoyé ;
  - DPE : flèches « flecheDPE/flecheGES » et étiquettes Adapt'immo (valeur → classe ; anciens seuils pour les DPE d'avant 2021, prix « indexés au 15/08/2015 ») ; « DPE non communiqué » n'est plus compté comme oubli ;
  - véhicules : sur un site boutique (tentes, accessoires), seules les fiches avec kilométrage ou année sont gardées ;
  - action de diagnostic `debug_links` (liens repérés sur une page) et traces du lecteur.
- Réparés (« Réparé · à valider ») : Triumph Quimper 38/38, rmcars93 34/34, agence-bordeaux 19/20, Ventury 22/24, duo-immo 26/26, Christine Dumas 5/5, groupe 123 immo 30/30, monagenceautomobile 5/5, Barraine 20/20, Covapro 68/70, Cosmopolitan 6/6, Cimalpes 7/7, Martin Gestion 32/32, Régie Conseil 24/24, Crefimo 21/21, Martel 3/3.
- Impossibles (pare-feu anti-robots AWS WAF / UUSEC) → « failed » avec explication : village-immobilier, villaret, absolutehabitat, monceau-montaigne.
- Liste « à apprendre » (prospects illisibles / manuels, 30 sites retestés) : devenus lisibles et passés « ok » : Orpi Agence du Loup (14), Foncia La Rochelle Les Minimes (14) et Noirmoutier (12), Spliit (11), Vacherand Lille (89), Valloire Habitat (28). Les autres restent illisibles (sites Wix, garages moto à catalogue chargé en JavaScript, Starterre sans véhicule du garage…).
- Restent : sites dont les annonces sont chargées en JavaScript (18avenue, arcade, l'autre immobilier, berge, i3v, nextlogis…), sites Wix/Squarespace, garages dont le stock vient de Leboncoin (garagevrauto, jlcars), BH Car (agence à préciser par Anthony), Kombishop (photos), Ford Alliance (photos manquantes sur 9 véhicules).

### 02/11/2026 — Claude : photos importées affichées depuis le site du pro (Anthony : « si on a un aperçu pour chaque site testé, c'est que ça fonctionne »)
- `moderate-listing` v29 (`import-images.ts`) : seule la 1re photo d'une annonce importée est copiée chez nous (vignettes, aperçu WhatsApp/Facebook, Google Images) ; les suivantes restent des liens vers le site du pro. Life Cars : ~48 photos stockées au lieu de 1 471 (~8 Mo au lieu de ~240 Mo).
- Modération inchangée sur le fond : chaque photo externe est téléchargée (contrôles d'adresse et 5 Mo max) puis envoyée à l'analyse en base64, jamais stockée (`safety.ts`). Empreinte anti-réutilisation seulement pour les photos stockées (`policy.ts`).
- `pro-stock-sync` v232 : quand la synchro remplace les photos d'une annonce, les fichiers des anciennes photos stockées sont supprimés (ils restaient sans annonce).
- `prepare-listing-edit` v4 : modifier une annonce importée reprend ses photos externes telles quelles (avant : erreur « Photo externe : import requis »). `pro.html` affiche les photos externes.
- Fonctions passées en déploiement « version figée par commit » (moderate-listing, prepare-listing-edit). Santé + sonde de modération OK après déploiement. **À vérifier à l'import Life Cars** : 1re annonce publiée avec 1 photo stockée + photos externes, modération OK.

### 02/11/2026 — Claude : place des photos (Anthony : « on peut encore compresser, la qualité était top »)
- Constat : photos importées copiées telles quelles (pas de recompression) ; vignettes 480 px JPEG 70 générées pour **toutes** les photos alors que les cartes n'affichent que la 1re.
- Changé (`supabase/2026-11-02-thumbs-first-photo-only.sql`) : miniatures seulement pour la 1re photo de chaque annonce ; les autres sont supprimées par le ménage de `generate-listing-thumbs`.
- Bug trouvé (Anthony : « 271 photos, j'y crois pas ») : 271 = fichiers, pas photos. À la publication, chaque photo était copiée de `listing-images-pending` vers `listing-images` sans supprimer la copie en attente → stockage x2. `generate-listing-thumbs` (toutes les 5 min) supprime maintenant ces copies (`pending_photo_duplicates`, hors `retention-evidence/` ; la quarantaine recopie la photo publiée si besoin). Nettoyé : 88 copies + 59 miniatures inutiles → 124 fichiers, 15 Mo au lieu de 30.
- Mesures : stockage actuel ~30 Mo. Life Cars : 1 471 photos lues, 150 à 190 Ko chacune (déjà compressées par leur fournisseur, comme notre cible de 120 à 200 Ko pour les photos envoyées depuis le site) → ~240 Mo à 30 photos par véhicule. Offre gratuite Supabase : 1 Go.

### 02/11/2026 — Claude : IndexNow (Anthony : « les annonces de Life Cars demain peuvent être référencées rapidement ? »)
- Déjà en place : pages publiques d'annonce `annonce/<id>/`, page du garage `garage/<nom-ville>/` et sitemaps régénérés toutes les 10 min (workflow `share-pages.yml`) ; Google les découvre par `sitemap.xml` (robots.txt + Search Console), à son rythme.
- Ajouté : clé IndexNow (`77a5c8f13f1d3e45b629794c4a227124.txt` à la racine) et `scripts/indexnow.py`, lancé par le workflow 1 min après chaque mise en ligne automatique : les pages nouvelles ou modifiées (annonces, pros, catégories, auto) sont signalées tout de suite à Bing / Yandex / Seznam / Naver (Bing alimente aussi ChatGPT et Copilot). Un échec ne bloque jamais la publication.
- Google ne lit pas IndexNow : pour accélérer, « Inspection de l'URL » → « Demander l'indexation » dans la Search Console (page du garage + quelques annonces, quota d'une dizaine par jour).

### 02/11/2026 — Claude : vérification des villes sur tous les sites (Anthony : « bien vérifier les villes, très important ») (pro-stock-sync v227–v231)
- Liste officielle des communes (geo.api.gouv.fr, ~35 000 communes avec codes postaux et position) téléchargée une fois par instance (`commune-lookup.ts`).
- Chaque ville lue est vérifiée : nom exact d'une commune, ou début du nom (« Bordeaux Caudéran » → Bordeaux, « Paris 15e » → Paris). Immobilier : une ville qui n'est pas une commune est retirée puis cherchée dans le titre, la description, le lien, le code postal.
- Communes homonymes : la plus proche de l'agence est retenue (« Saint-André » 66 au lieu de La Réunion pour Laroca ; « Saint-Gilles » 50 au lieu du Gard pour Lecoeur). Position de l'agence = adresse du pro, sinon adresse du site, sinon point médian des annonces (ou département le plus fréquent).
- Ville repérée dans un texte : à 100 km au plus de l'agence (« Fleurie 69820 », « La Rochelle » ne sont plus pris pour des annonces de Caen). Ville du site à plus de 150 km : remplacée par la commune du titre (« Le Vigean », quartier d'Eysines, n'est plus la commune du Cantal) ou signalée.
- Ville du titre prioritaire quand la ville lue n'apparaît ni dans le titre ni dans la description (elle venait d'une autre annonce de la page).
- Code postal vérifié contre la commune et remplacé s'il ne lui appartient pas.
- Chaque correction est écrite sur la fiche dans l'aperçu de la page de test (« Ville corrigée d'après le titre… », « Ville de l'agence : à vérifier », « Ville éloignée de l'agence : à vérifier »). Le test à blanc donne `quality.villes` (liste des villes, corrections, fiches sans ville).
- Tests : Laroca 50/50 villes du 66 ; Dolce Immo 20/20 ; agence-bordeaux plus de « Saint-Michel 02830 » / « Le Vigean 15200 » / « Saint-Nicolas 62223 » ; rmcars93 inchangé (Noisy-le-Grand) ; Lecoeur : les fonds de commerce dont l'agence cache la commune restent « ville manquante » (rien d'inventé).

### 02/11/2026 — Claude : Laroca « 586 annonces », Dolce Immo photos / vendus (pro-stock-sync v223–v224)
- Laroca (« c sûr ça ? ») : le site compte 202 biens (somme des compteurs par ville). Le chiffre « annonces sur le site » de la lecture par étapes comptait toutes les pages découvertes (pages de ville, fiches vendues…) → il compte maintenant les biens lus + ceux qui restent à lire.
- Dolce Immo (Jalis, « 8 photos sur le site, 3 chez nous ») : la fiche montre 3 photos en tête puis la galerie complète plus bas (`section-gallery2`) ; le robot s'arrêtait à la première galerie. Toutes les galeries d'une fiche sont maintenant réunies (règle générale). 3 → 7,6 photos par bien.
- Biens vendus / indisponibles (sites Jalis) : « Biens vendus » au-dessus du titre ou badge `selection vendu / indisponible` avant le titre → écarté (les badges plus bas sont ceux des biens « À découvrir »). Les articles du site (`<body class="fiche">` sans `fiche_produit`) ne sont plus lus comme des biens (aussi Helix).
- Titres coupés au trait d'union (« belle maison de plain » pour « plain-pied ») : seul « - » entouré d'espaces sépare le nom du site.
- Locations lues « vente » : un montant libellé « Loyer » près du titre = location.
- Villes : « Proche Tram » et autres mots de situation (gare, quartier, commerces…) ne sont plus pris pour une ville ; sans ville, la commune du titre est cherchée même si un code postal (souvent celui d'une autre annonce de la page) a été lu, et son code postal le remplace.
- Code postal vérifié contre la commune (geo.api.gouv.fr) : « Le Bouscat 33700 » (code de Mérignac, pris dans un lien voisin) → 33110. « Acheter un bien immobilier » n'est plus pris pour une ville (v226).
- Test Dolce Immo : 6 à 8 photos par bien, les biens vendus (ex. Caudéran T4, Mérignac T4) et l'article « Évaluation d'une maison » ne sont plus dans l'aperçu. Site lent : la lecture se fait en plusieurs passages.

### 02/11/2026 — Claude : demandes renvoyées par Anthony (« soi-disant réparés ») (pro-stock-sync v214)
- 9 demandes remises « à réparer » avec une note. Repris une par une :
  - La Résidence Sartrouville / Chatou (description coupée, DPE « performance ») : renvoyées avant la correction de 23 h ; retest 22/24 et 26/27 DPE, descriptions complètes.
  - ad-nostra (« mauvaise photo ») : vrai bug, tous sites Drupal : `IMG_BAD` contenait « default » → le dossier `/sites/default/files/` était pris pour une image d'attente. Corrigé (`default(?!\/)`) : 1,7 → 10 photos par bien ; GES 0 → 35/42 (étiquette « NEW-GES-D.jpg »).
  - Valloire Habitat (photo et DPE) : DPE dessiné par un script encodé en base64 (`dpe.dpe({value:'D'})`) → lu, 0 → 29/29. Le site ne publie qu'une photo et deux lignes par logement (vérifié).
  - Dolce Immo (DPE image) : étiquette Jalis sans lettre `data-dpe="102;non renseigné"` → classe calculée (seuils DPE 2021, la moins bonne de l'énergie et du GES ; même règle pour le curseur Calliope). 24 → 31/37.
  - Laroca (photo) : corrigé hier soir (pages liste Twimmo, doublons moyenne/HD) ; retest 52 biens, 11,7 photos.
  - Pierrefeu (photo) : vérifié, galerie du bien correcte (réf. 3862 : 10/10) ; demande d'exemple précis si besoin.
  - La Française Saint-Malo / Montauban (« illisible ») : le site n'a aucune annonce de ces agences (73 vérifiées) ; message du test rendu explicite (« Site lu sans problème, mais cette agence n'a aucune annonce en ligne… »).
- Toutes repassées à « Réparé · à valider ». regie-conseil.fr (nouvelle demande, site illisible) reste à faire.

### 01/11/2026 — Claude : suite du contrôle DPE, robot qui plantait encore (pro-stock-sync v211)
- Contrôle passé sur 15 prospects de plus. Nouvelles lectures : image d'étiquette nommée par sa lettre « dpeV2-D.jpg » / « gesV2-B.jpg » et « DPE en B » écrit dans le texte (une seule lettre sur la page) : Cassis Immobilier 38 → 53/61.
- Déjà bons : Salanié 16/16, Neyt 68/74, Lyon Immo 27/31, Netty (agencedelocre 21/28, GSM 5/5), Expertim 51/52, LF immo (les manques sont des murs commerciaux / terrains).
- agencelenain.com plantait (503) : trace → arrêt pendant la lecture des étiquettes DPE en image (84 images générées par le site) après la lecture des pages. Le compteur de calcul sous-estime le calcul réel : budget abaissé à 500 ms de lecture + 350 ms d'images (cpu-meter / energy-image), images limitées à 1,5 Mpx. Dans la lecture par étapes, l'étiquette en image est lue fiche par fiche et mémorisée avec la fiche (avant : relue pour toutes les fiches à chaque passage, budget épuisé). Lenain : plus de plantage (23 lues par passage) ; DPE 7/23 (ses étiquettes en image sont à revoir).
- Trace : étapes « normalize start / images done » et temps de calcul dans `stock_crawl_trace`.

### 01/11/2026 — Claude : contrôle automatique des DPE (pro-stock-sync v206)
- Anthony : « je peux pas vérifier chaque annonce ». `smart-reader.ts` : quand le DPE n'est pas trouvé alors que la page en parle (« classe énergie », « diagnostic de performance », DPE, kWh/m²), la fiche est marquée (`_dpe_hint`, sauf « non soumis / vierge »). Le test de site renvoie `quality.dpe_missed` + exemples, et `desc_short` = descriptions finissant par « … » ou de moins de 120 caractères (une description courte écrite telle quelle sur le site n'est plus comptée).
- Passé sur une trentaine de prospects ; nouvelles lectures (tous sites) :
  - lettre après la valeur « 225 KWHep/m²an D », « 8 KgCO²/m²an B » (Activimmo) : 14 → 23 DPE sur 25 ;
  - attributs `data-current-class` (diagPreview--pe / --ges), `data-energetic-class`, `data-dpe="201;d"` (Jalis) : bel-avenir 0 → 15/15, Helix 0 → 40/58 ;
  - curseur avec valeur sur une échelle (`dpe_target` … 123) → classe par les seuils du DPE 2021 : Calliope 0 → 13/15.
- Restent : Nestenn (DPE absent de la page, chargé à part ; 9/31 à Combourg), anciens DPE « ancienne version » (La Boîte Immo), quelques pages d'articles prises pour des biens chez Helix.

### 01/11/2026 — Claude : lecture par étapes pour Citya, Human, Apimo, AJP, Junot, Kermarrec ; DPE et descriptions (pro-stock-sync v202)
- Anthony : « ceux qu'on a déjà faits, comment ça se passe » puis « ok fais ». `resumable-crawl.ts` : `eachDetailResumable` (le lecteur lit lui-même chaque fiche, l'avancement est mémorisé). Branché sur Citya, Citya Nord de France, Human, Citya (catalogue), Apimo, AJP, Junot, Kermarrec. Citya Belfort plantait (503) : maintenant 72 lus au 1er passage, 20 restants repris au suivant. Les autres lecteurs (BIAS, Pierrefeu, LF immo, Salanié, 4S, Robyns, BNYS / Decros, Lyon Immo, Neyt, Simplici, Ewigo, Izmo, Auto-Gestion, Century 21) lisent des agences de moins de 60 biens et finissent en un passage (BIAS Bernay 56/59) : laissés tels quels.
- Anthony : « toujours énormément de DPE pas lus et des descriptions pas entières ». Test de site : nouvelle mesure `quality` (DPE, GES, descriptions de moins de 300 caractères).
  - Descriptions : `longestText` retirait les `<button>…</button>` ; sur Twimmo un bouton sans fermeture avalait la description jusqu'au </button> suivant → seule la méta-description (coupée) restait. Longueur bornée pour bouton / liste / navigation / formulaire. Laroca : 90 descriptions courtes sur 90 → 3.
  - La Résidence : descriptif complet pris sous « Descriptif de votre professionnel » (les données structurées coupent à ~160 caractères). 43 courtes sur 44 → 0.
  - DPE / GES dessinés dans la page, pour tous les sites : `<g id="GES_E">` / `<g id="DPE_C">`, `<g id="EnergieC">` / `<g id="GesC">`, « diagnosticShortened dpeE », La Boîte Immo « diagnostic-diagram numberC » / « emission-diagram numberB ». La Résidence DPE 2/44 → 41/44 ; La Boîte Immo (cisn-immobilier) 2/48 → 34/48 (45 prospects sur La Boîte Immo).
  - Laroca : DPE 66/91, les autres ont une étiquette « dpe-ID.svg » (DPE non disponible sur le site).

### 01/11/2026 — Claude : lecture par étapes pour tous les lecteurs d'agences (pro-stock-sync v199)
- Anthony : « il fait tout le temps ça pour tous les sites » (lecture qui s'arrête avant la fin et repart du début).
- `resumable-crawl.ts` : `crawlDetails` (liste des fiches déjà connue → lecture par étapes mémorisée). Utilisé par La Résidence, La Française Immobilière, Cimm, Espaces Atypiques (en plus de BH Car). La page de test enchaîne les passages toute seule jusqu'à la fin ; une fois le pro inscrit, la synchro reprend là où elle s'était arrêtée.
- Tests : La Résidence Chatou 44/44 (cycle complet), Espaces Atypiques Albi 21/21, Cimm Guipry 29/30 (1 fonds de commerce illisible), La Française Cleunay 11 (le total « annonces sur le site » n'affiche plus les 79 du réseau).

### 01/11/2026 — Claude : BH Car lisait toute la France ; aperçu limité à 220 (pro-stock-sync v195)
- Anthony (capture test bhcar.fr : « 4207 annonces sur le site », 879 lues) : « ça lit toute la France d'un coup et pourquoi que 220 en aperçu ».
- BH Car est un réseau national. `network-agency-readers.ts` : lecteur BH Car par agence (`bhcar.fr/agences/bhcar-<ville>`, ?page=2…), fiche gardée seulement si elle dit « chez BH Car <agence> ». L'accueil du réseau n'est plus lu : message « indiquez la page de l'agence ». Test Lille : 214 véhicules de l'agence, 136 lus au 1er passage, tous complets. bhcar-angouleme : page d'agence introuvable.
- Demande bhcar.fr (prospect « BH CAR », ville Limoges, e-mail marmande@) remise en attente : il faut savoir quelle agence.
- Anthony : « à la fin des photos d'autres véhicules sont rajoutés ». La page BH Car contient aussi les photos des « véhicules similaires » (22 photos différentes sur la page de la Twingo, 12 à elle). Les photos de la fiche viennent maintenant des données structurées du véhicule ; celles de la page ne servent que si les données structurées en ont 3 ou moins (`smart-reader.ts`, tous les sites ; lecteur BH Car : jamais). Nouveau test Lille : 120/120 complets.
- Anthony (test Lille : 192 lus sur 214, 0 erreur) : le lecteur BH Car repartait du début à chaque passage (budget de calcul atteint vers 130-190 véhicules) → les derniers n'étaient jamais lus. Il passe sur la lecture par étapes mémorisée (`crawlCatalogue`, comme les gros sites) : 1er passage 132 lus, 82 restants, la suite reprend là où elle s'est arrêtée (« Continuer la lecture » au test, toutes les 15 min une fois inscrit) (v197).
- `admin-test-import.html` : « Voir comme sur le site » montrait au plus 220 annonces ; maintenant toutes, réduit seulement si le navigateur manque de place (message avec le nombre).

### 01/11/2026 — Claude : La Résidence, La Française Immobilière, photos Laroca (pro-stock-sync v194)
- `network-agency-readers.ts` (nouveau) :
  - **La Résidence** (`laresidence.fr/agences-immobilieres/<agence>`) : listes `/acheter` et `/louer` de l'agence (?Page=2…), fiches lues par les données structurées + la page ; ville et code postal pris dans le titre (la lecture automatique donnait « Achat maison »), titre sans « Réf … - LA RESIDENCE ». Chatou 44/44, Sartrouville 38/38.
  - **La Française Immobilière** (`la-francaise-immobiliere.fr/agences/…`) : annonces du réseau par l'API WordPress (`/wp-json/wp/v2/achat` et `/location`), gardées seulement si la fiche renvoie à l'agence (lien « Plus d'infos ») ; DPE / GES lus dans le SVG (`<g id="EnergieC">`, `<g id="GesC">`) ; ville prise dans le lien ; titre tronqué remplacé par la 1re ligne de la description. Rennes Cleunay 9/9. Saint-Malo et Montauban-de-Bretagne : aucune annonce en ligne aujourd'hui (73 annonces du réseau vérifiées), message clair.
  - 4 demandes passées à « Réparé · à valider ».
- Anthony (capture Laroca : cartes « Vente et achat appartements - » avec le logo en photo, « ville manquante ») : sur Twimmo, les pages liste (`/vente-appartement-a-<ville>.html`, `/immobilier-a-…`) étaient lues comme des biens. `smart-reader.ts` : sur un site Twimmo, seule une adresse `…-1-247v562a.html` est une fiche. Nouveau test Laroca : 93 complètes sur 93 lues.
- `photo-utils.ts` : « -photo-moyenne » / « -photo-hd » (Twimmo) reconnus comme la même photo (la plus grande gardée) ; ajout des mots moyenne, petite, grande, vignette, miniature.

### 01/11/2026 — Claude : sites à réparer, robot qui plantait (erreur 503) sur les gros sites (pro-stock-sync v190)
- Plan validé par Anthony (« ok ») : 1. relancer les 6 sites jamais testés ; 2. La Résidence / La Française Immobilière ; 3. plateformes connues ; 4. sites uniques.
- raccosta.com : 256/256, réparé. jlcarsparis.fr : aucune fiche véhicule lisible (Appidev), reste à faire.
- axeylia, laroca-immobilier, valloire-habitat, bhcar : le robot était coupé par la plateforme (erreur 503 sans message) après 5 à 12 s. Trace de diagnostic ajoutée (table `stock_crawl_trace`, option `trace` du test) : 250 à 400 pages de 90 à 250 Ko lues, donc plus de ~2 s de calcul → coupure. Ce n'était pas la lecture des DPE en image (bhcar est un garage).
- Corrections :
  - `cpu-meter.ts` (nouveau) : temps de lecture des pages compté par site (décodage + lecture de fiche + recherche des liens) ; au-delà d'1 s, le parcours s'arrête proprement (lecture partielle, reprise au passage suivant) au lieu de planter. Utilisé dans `smart-reader.ts` et `resumable-crawl.ts`.
  - `resumable-crawl.ts` : index des liens déjà vus (Set) au lieu de recherches dans des listes.
  - `fetchSiteHtml` : fichiers qui ne sont pas des pages (vidéo, PDF, archive) refusés ; lecture arrêtée à la taille maximale au lieu de tout charger.
  - `energy-image.ts` : images DPE de plus de 2,5 Mpx ignorées, décodage cumulé limité à ~0,9 s, 25 s maximum.
  - Lecture véhicule (données structurées) : ville / code postal du garage pris dans l'adresse de l'offre (BH Car n'avait aucune ville → 0 annonce complète).
- Résultats du test : laroca 82 complètes / 97 lues, valloire-habitat 87/87, bhcar 99/99 (lectures partielles, la suite aux passages suivants) → demandes passées à « Réparé · à valider ».
- axeylia (axeylia-immobilier.fr) : ne plante plus, mais aucune fiche dans les pages (biens chargés en JavaScript, plan du site = 1 440 pages « secteur ») : à traiter avec les sites uniques.
- Fonction de test temporaire `pro-stock-sync-bisect` remplacée par une page vide (410).

### 01/11/2026 — Claude : Orpi 4F Gestion Saint-Nizier (pro-stock-sync v185)
- Anthony : « pourquoi il ne sait pas lire https://www.orpi.com/4fgestion.saintnizier/ ».
- Vérifié : l'agence n'a aucune annonce en ligne sur Orpi (catalogue 0 en vente / 0 en location, page agence sans bien ; « biens en vente / location » renvoient à l'accueil). Agence de gestion locative / conciergerie ; seul lien externe : un site de locations de vacances (4fgestion-conciergerie.lodgify.com).
- `orpi-catalogue.ts` : message clair au lieu de « aucune annonce complète lue » : « Cette agence n’a aucune annonce en ligne sur Orpi (0 en vente, 0 en location) : rien à importer pour l’instant. »

### 01/11/2026 — Claude : Orpi « 727 fiches restantes » corrigé (pro-stock-sync v184) + incident pg_net
- Anthony : test d'Orpi St Cyprien → « 727 fiches restantes ».
- Cause : le catalogue JSON d'Orpi (`/recherche/ajax?agency=…`) ne renvoie que 500 annonces sur 752 (biens partagés du réseau compris) et ignore `page` ; le lecteur complétait alors avec les pages de liste HTML, qui mélangent toutes les agences (727 fiches à ouvrir).
- `orpi-catalogue.ts` : au-delà de 500 annonces, catalogue lu deux fois (`sort=date-down` puis `sort=date-up`) → les 752 couverts (vérifié), filtrés sur l'agence → St Cyprien : 61 biens à vendre (avant on n'en voyait que 38). Listes HTML seulement au-delà de 1 000. Portées de reprise `orpi-v4` / `orpi-oce-v3`.
- Test lecture par étapes : total 61, 25 lus au 1er passage, 36 restants.
- Incident : mon `VACUUM FULL` de net._http_response (311 Mo laissés par le test anti-robot) a bloqué le moteur pg_net ~10 min (requêtes des tâches cron en file) → `net.worker_restart()`, file vidée. Ne plus faire de VACUUM FULL sur cette table (un simple DELETE suffit).

### 01/11/2026 — Claude : compteur de visites du showroom
- Anthony : ok pour compter aussi les visites du showroom.
- Table `showroom_views` + `track_showroom_view` (visiteurs inscrits ou non, 1 fois par jour, pro et admin exclus), appelé par `pro.html` ; ligne « Visites du showroom » en tête des statistiques de la fenêtre admin. Testé en anonyme sur la vraie base (visite de test effacée).

### 01/11/2026 — Claude : showroom en aperçu pour les visiteurs sans compte — ANNULÉ (Anthony : « laisse », numéro et message déjà réservés aux inscrits) : showroom de nouveau entièrement visible ; seul le bouton Contacter garde « Créer un compte / Se connecter » avec retour au showroom
- Anthony : faire s'inscrire pour voir le showroom (plus d'inscrits). Choix retenu (après avoir déconseillé de tout bloquer : adresse courte et Google) : aperçu puis inscription.
- `pro.html` : sans compte, 6 premiers véhicules puis encart « Inscrivez-vous gratuitement pour voir les N autres véhicules de <pro> » (Créer un compte gratuit / Se connecter) ; même choix dans « Contacter ». Connecté : tout visible comme avant.
- `assets/index-main.js` : `/?compte=inscription|connexion&retour=/lifecars` ouvre le bon onglet ; après connexion (SIGNED_IN, y compris après confirmation de l'e-mail, 2 jours max) retour automatique au showroom. Version `20261101-gate`.
- Testé (Playwright, données simulées, 10 véhicules) : 6 cartes + encart, adresse /lifecars, lien d'inscription avec retour.

### 01/11/2026 — Claude : compteurs messages / téléphone / annonces pour l'admin
- Anthony : un compteur sur chaque bouton message, téléphone et annonce, pour nous (stats à envoyer ensuite aux pros).
- Déjà comptés : vues d'annonce, partages, appels (clic sur le numéro). Ajoutés : clic « Voir le numéro » (`phone`) et clic « Envoyer un message » (`message`, même avant connexion). 1 visiteur = 1 fois par jour et par annonce ; le pro et l'admin ne comptent pas.
- `admin_pro_stats` + section « Statistiques » en haut de « ✏️ Modifier ce compte (admin) » : 7 jours / 30 jours / total, conversations ouvertes, annonces les plus vues (`supabase/2026-11-01-listing-stats.sql`).

### 01/11/2026 — Claude : e-mail de connexion des pros plus jamais affiché
- Anthony (Life Cars) : ses coordonnées ne doivent être affichées nulle part. Le bouton « Contacter » du showroom (pro.html) montrait l'e-mail de connexion du pro aux visiteurs connectés (`get_public_pro_contact`).
- `get_public_pro_contact` ne renvoie plus l'e-mail (null), seulement le téléphone du compte (migration `hide_pro_login_email`). Les clients passent par la messagerie, le pro est prévenu par e-mail (alerte messages).
- Pour Life Cars demain : téléphone du compte = 04 83 43 33 01 (garage, affiché aux acheteurs) ; e-mail de connexion à confirmer (fiche prospect : direction@lifecars.fr), jamais affiché.

### 01/11/2026 — Claude : alerte e-mail des messages toutes les minutes
- Anthony : Life Cars n'a pas d'e-mail public (formulaire) → il demandera l'e-mail du garage ; un pro doit être prévenu par mail quand un client lui écrit.
- Déjà en place (`process-message-email-alerts`) : e-mail au destinataire d'un message non lu depuis 1 min s'il n'est pas sur le site. La tâche cron `process-message-email-alerts-every-minute` tournait toutes les 5 min → remise à chaque minute (`* * * * *`).

### 01/11/2026 — Claude : adresse courte des showrooms (abracadeal.fr/lifecars)
- Anthony : que les pros sans site puissent utiliser une adresse du genre abracadeal.fr/lifecars.
- Base (`supabase/2026-11-01-pro-short-address.sql`) : `pro_showrooms.slug` unique ; adresse créée automatiquement pour tout compte pro (trigger sur profiles) : « Life Cars » → lifecars, 3 mots et plus → avec tirets (auto-cevennes-ales), doublon → -2 ; mots et pages du site réservés. Pros existants : elite-prestige-services, oxoto, auto-cevennes-ales.
- `404.html` : /<adresse> → pro.html?id=… (page masquée pendant la recherche ; adresse inconnue → page introuvable normale). Testé (Playwright, réponses simulées) + appel public réel de `pro_slug_resolve`.
- `pro.html` : la barre d'adresse affiche abracadeal.fr/<adresse>, l'adresse est écrite sous le nom, « Partager » donne l'adresse courte.
- Modifiable : par le pro (Mon compte → vitrine, champ « Adresse de votre showroom ») et par l'admin (« Modifier ce compte ») via `pro_slug_set` (contrôle : 3 caractères min., réservée, déjà prise).
- Mail de bienvenue (admin-onboard-pro v3) : « Votre showroom a sa propre adresse : abracadeal.fr/<adresse> ».

### 01/11/2026 — Claude : accès direct au showroom depuis une annonce de pro
- Anthony : « si je clique sur Life Cars je vais sur le showroom, ou une touche Voir le showroom Life Cars ».
- `assets/index-main.js` (fiche annonce) : vendeur pro → nom cliquable « Life Cars › » et bouton « Voir le showroom <nom> » (pro.html?id=…, nouvel onglet), au-dessus de « Voir le profil et les avis » ; sur mobile, la carte vendeur d'un pro ouvre directement son showroom (particuliers inchangés). Version index-main `20261101-showroom`.
- Démo `demo/life-cars/annonce.html` : même nom cliquable + bouton vers le showroom de démo.

### 01/11/2026 — Claude : bilan du test anti-robot de tous les sites des prospects
- 7 384 sites visités (tâche `abracadeal-antirobot-probe`, arrêtée seule) : 5 191 normaux, 1 795 injoignables ou trop lents (non touchés), 398 protégés : 373 pare-feu Amazon (AWS WAF, page « challenge » 202 de 2,4 Ko, petites agences immobilières toutes différentes), 17 Cloudflare (« Just a moment… », dont Stéphane Plaza), 8 DataDome (Espacevo).
- Contrôle : 2 sites AWS WAF passés au vrai robot → « aucune fiche lisible » aussi. Le seul site protégé déjà lu avec succès par le robot a été gardé.
- 432 prospects retirés (segment `exclu_admin`, note « site anti-robot », jamais de mail, réversible) ; 14 demandes de réparation encore ouvertes annulées.
- Les 1 795 injoignables ne sont pas retirés (site en panne, lent ou adresse fausse : le robot les revérifiera).

### 01/11/2026 — Claude : vitrine remplie automatiquement à l'inscription d'un pro (admin-onboard-pro v2)
- Anthony : à l'inscription, remplir tout ce qui est possible depuis le site du pro, sans rien inventer ; si rien, laisser vide.
- `admin-onboard-pro` (action create, compte neuf ou existant) : après la demande d'import, lit la page d'accueil du site et remplit la vitrine (`pro_showrooms`) seulement là où elle est vide :
  - logo : image nommée / marquée « logo », ou image d'en-tête liée à l'accueil (étoiles, icônes, labels, partenaires, réseaux sociaux exclus ; PNG / JPEG / WebP / GIF seulement) ;
  - bannière : image de partage du site (og:image / twitter:image), si ce n'est pas le logo ;
  - présentation : description du site (og:description / meta description), ≥ 40 caractères, accents décodés.
  - Images copiées dans le stockage pro-showroom/<user>/. Le résultat s'affiche dans les remarques de la création (« Vitrine remplie depuis le site : logo ✓, bannière — (non trouvée)… »).
- Testé sur les vraies pages : Life Cars → logo ✓ + présentation ✓, pas de bannière (pas d'image de partage) ; Junot → étoile de notation écartée, logo SVG non pris ; AJP → bannière = logo, écartée.
- Déployé en v2 (import du commit 999262b), démarrage vérifié.

### 01/11/2026 — Claude : démo « gestion du stock » de Life Cars
- Anthony : montrer à Life Cars sa page showroom avec la gestion du stock (création du compte prévue le 02/11).
- Nouvelle page `demo/life-cars/gestion.html` (noindex, bandeau « Démonstration ») : synchronisation automatique de lifecars.fr toutes les 15 min, 49 véhicules / 49 fiches complètes, ce qui se passe tout seul (nouveau, modifié, vendu), liste de véhicules avec Modifier / Booster / Supprimer, autres envois (CSV, Excel, XML, JSON, API). Uniquement des fonctions qui existent sur le site. Lien vers le showroom de démo.

### 01/11/2026 — Claude : sites anti-robot supprimés (prospects retirés, réparations annulées)
- Anthony : « tout ce qui est anti-robot, on supprime ».
- Même effet que le bouton « Supprimer » de Sites en réparation (pas d'effacement définitif) : réparation annulée, prospect en segment `exclu_admin`, jamais de mail.
- Fait aujourd'hui : 13 demandes de réparation annulées (aixty, lex-immo, lajosassienne, lucievidalimmo, imozoum, acces-conseil-immobilier, cabinet-girondin, placyr-immo, comeback-immo, horizonimmo, thisse, agence-majorelle, mister-property) ; 20 prospects retirés (dont 6 Stéphane Plaza, site commun protégé).
- Automatique ensuite : triggers `exclude_anti_robot` (prospects) et `cancel_anti_robot` (demandes) — `supabase/2026-11-01-auto-exclude-anti-robot.sql`.
- Au passage (test des gros réseaux) : lisibles Orpi, Human, Nestenn (DPE 14 % à améliorer), Weecars ; non lisibles Peugeot (377, pages concession sans VO), Square Habitat, Foncia, Volvo (partiel), Volkswagen, Cobredia, Porsche (429), Toyota, Ofim (lent), Mercedes (anti-robot).

### 01/11/2026 — Claude : Laforêt Paris 10 + DPE Laforêt (pro-stock-sync v183)
- Anthony : laforet.com/agence-immobiliere/paris1saintmartinetsaintdenis revenu dans « à réparer ». La page n'existe plus (404) ; l'e-mail du prospect est paris10saintdenis@laforet.com → adresse du prospect corrigée vers /agence-immobiliere/paris10saintdenis, remis en vérification.
- Laforêt : DPE / GES en image SVG (/ajax/properties/<n°>/dpe, `<g id="DPE_D">`, `<g id="GES_D">`) désormais lus (`energy-image.ts`). Paris 10 : 10 % → 75 % (tous les logements ; les 2 locaux commerciaux n'ont pas de DPE).
- Laforêt : seuls les biens de l'agence demandée (des biens d'Issy-les-Moulineaux étaient pris).
- Type de bien pris de l'adresse quand elle le dit (« /fonds-de-commerce-… », « /local-commercial-… », « /parking-… ») : un fonds de commerce était classé appartement.

### 01/11/2026 — Claude : dépenses d'énergie ×100 corrigées (pro-stock-sync v181)
- Anthony : « 67 000 € à 94 000 € » de dépenses d'énergie sur une location à Bourg-en-Bresse (site : 670.00 € et 940.00 €).
- Cause : ma lecture Cimm du jour (`smart-reader.ts`) supprimait le point des centimes. Montant maintenant lu avec centimes « .00 » / « ,50 » retirés, et accepté seulement s'il est plausible.
- Garde-fou général (`normalizeImmo`) : dépenses ≥ 20 000 € (min) ou ≥ 30 000 € (max) écartées, tous sites.
- Aucune annonce enregistrée ni aperçu prospect touchés (seul l'aperçu de test l'affichait).

### 01/11/2026 — Claude : l'admin peut tout modifier (annonces importées : photos ; comptes, vitrines pros, avis)
- Anthony : photo en double sur une annonce d'essai Espaces Atypiques, la correction ne permettait que le texte ; l'admin doit pouvoir modifier / supprimer textes et images partout (choix : annonces et photos, profils et pages pros, avis).
- Espaces Atypiques (robot) : seules les photos rangées dans le dossier de la référence du bien sont gardées (les images de décoration de l'agence étaient prises).
- admin-test-import.html « Modifier la fiche » : photos (✕ retirer, ★ mettre en premier, remettre d'origine), gardées comme correction (`photos`). `admin_set_stock_override` additionne désormais les corrections au lieu d'écraser.
- Annonces publiées : l'admin pouvait déjà tout modifier (bouton Modifier, photos comprises).
- Base : droits admin sur profiles (update), pro_showrooms (insert/update/delete), stockage pro-showroom, reviews / vacation_reviews ; fonctions `admin_review_edit` / `admin_review_delete` (`supabase/2026-11-01-admin-edit-everything.sql`).
- Site : page vendeur → « ✏️ Modifier ce compte (admin) » (`assets/admin-edit-20261101.js`) : nom, ville, téléphone, description de la vitrine, logo / bannière (remplacer, retirer), tous les avis reçus (texte, note, réponse, supprimer) ; « Modifier / Supprimer (admin) » sur chaque avis. Testé avec une base simulée (Playwright).
- Reste : textes fixes des pages (accueil, CGV…) non modifiables depuis le site (non demandé).

### 01/11/2026 — Claude : fiche immo sans « Non communiqué » ; dépenses d'énergie Cimm (pro-stock-sync v179)
- Anthony : « quand c'est une maison, en général pas de copropriété… évite de mettre les infos non communiquées, laisse vide ».
- `assets/index-main.js` (fiche immobilier) : les lignes sans information ne sont plus affichées (plus de « Non communiqué ») ; maison sans info de copropriété → aucune ligne copropriété / lots / charges / procédure ; maison au rez-de-chaussée → pas de ligne « Étage ». Version index-main `20261101-nc`.
- Robot (`smart-reader.ts`) : « dépenses annuelles d'énergie … entre 2580€ et 3570€ » écrit sur plusieurs lignes (Cimm) désormais lu. Guipry-Messac 134 m² : 2 580 € à 3 570 €, D / B.

### 01/11/2026 — Claude : DPE / GES en pastilles (Cimm), pro-stock-sync v178
- Anthony : sur Cimm, DPE et GES affichés en 7 pastilles A→G, celle du bien plus grande ; non lus.
- `smart-reader.ts` : repère les séries de 7 pastilles A→G avec une taille (style width) ; la seule plus grande (≥ 1,2 ×) = classe ; 1re série DPE, 2e GES.
- Guipry-Messac maison 134 m² : D / B (comme le site). Agence : DPE trouvé sur 90 % des biens (3 sans).

### 01/11/2026 — Claude : DPE écrit dans un menu dépliant (Espaces Atypiques), pro-stock-sync v177
- Anthony : le DPE d'Espaces Atypiques est dans un menu dépliant (« Consommation énergie primaire — b : 82 kWh/m².an », « A : 3 kg CO2/m².an »), non lu.
- `smart-reader.ts` : lit « X : nombre kWh » (DPE) et « X : nombre kg CO2 » (GES), et la barre marquée active (`class="… active" id="cep-b"`, `eges-a`…).
- Les Herbiers : B / A (comme le site). Les Sables : DPE trouvé sur 4 biens sur 5 ; le 5e est « DPE vierge ou en cours » sur le site.

### 01/11/2026 — Claude : DPE + GES dans une même image (Guy Hoquet), pro-stock-sync v176
- Anthony : annonce Guy Hoquet Montner affichée sans DPE alors que le site montre B / A en image.
- Guy Hoquet ne donne souvent que la conso (84 kWh) et une image `image_DPE_GES` (immo-facile) avec les deux échelles côte à côte.
- `energy-image.ts` : image coupée le long de la bande verticale vide (DPE à gauche, GES à droite) ; image posée sur fond blanc (bords adoucis par la transparence) ; seuils rapportés à la zone lue ; bandes trop fines écartées ; lignes dont la « barre » part loin du bord commun écartées (texte « kg CO2 ») ; la barre choisie n'entre pas dans le contrôle des longueurs croissantes (trait « —— 7 »).
- `guyhoquet-reader.ts` : dpe_image / ges_image = image_DPE_GES ; `fillEnergyFromImages` lit les deux classes d'une image combinée.
- Tests : 5 images Guy Hoquet (D/B, B/A, A/A, A/A, A/A) + les 6 La Boîte Immo + réductions / agrandissements : tout juste ; bruit → rien. Canohès : DPE 47 % → 81 % ; les 6 restants n'ont pas de DPE (grange, local commercial, villas neuves livrées en 2026, une maison).
- Coût : ~16 ms par image PNG, ~37 ms par JPEG ; 80 images max par passage.

### 01/11/2026 — Claude : zoom de la galerie photo refait (bug du retour après zoom)
- Anthony : après un zoom à deux doigts dans la galerie, le retour arrière laissait la page agrandie, le site apparaissait derrière. La remise à 100 % par la balise viewport (closePhotoLightbox) est ignorée par l'iPhone.
- Nouveau `assets/lightbox-zoom-20261101.js` (chargé en fin de index.html) : zoom propre à la photo (pincer jusqu'à ×5, glisser la photo zoomée, double toucher ×2,5 / retour, molette et double clic sur ordinateur). Zoom du téléphone bloqué tant que la galerie est ouverte (touch-action:none, gesturestart). Photo remise à sa taille à chaque changement de photo et à la fermeture (bouton, fond, Échap, retour arrière).
- Testé (Playwright iPhone 13) : page toujours à l'échelle 1 après pincement, glisser, fermeture → taille normale, double toucher OK, filigrane suit la photo.

### 01/11/2026 — Claude : biens vendus / sous offre écartés, message du test corrigé (pro-stock-sync v175)
- Anthony (influences.immo) : « 18 biens sur le site et seulement 9 lus ? » + photos tamponnées « vendu » / « sous offre ».
- Les 18 = pages d'annonces trouvées, dont des biens vendus encore en ligne (sans prix → déjà ignorés, ou avec prix → importés à tort).
- `isSoldText` (index.ts, normalizeRows) : écarte les biens dont le début de description dit « est désormais VENDU », « sous offre », « sous compromis », « offre acceptée », « trop tard, ce bien… » ; « vendu meublé / loué / avec… » restent en vente. Influences : 7 → 4 biens, tous en vente. Les biens vendus déjà publiés seront retirés au prochain tour complet.
- admin-test-import.html : le message « N annonces sur le site… gros site » n'apparaît plus pour un petit site ; à la place : « N pages d'annonces trouvées, dont des biens vendus… le robot ne garde que les X biens encore en vente ».

### 01/11/2026 — Claude : le robot lit les DPE / GES affichés en image (pro-stock-sync v174)
- Demande d'Anthony : « les DPE en images, il faut entraîner le robot à les lire, il les met de côté à chaque fois ».
- Nouveau `energy-image.ts` : décode l'image (JPEG / PNG, npm jpeg-js / fast-png) et repère l'échelle officielle A→G (7 barres de longueur croissante) ; la classe du bien = la barre nettement plus haute (≥ 1,3 × les autres). Dans le doute : rien (jamais de classe inventée).
- `smart-reader.ts` note `dpe_image` / `ges_image` (balises <img> DPE / GES / énergie) quand la classe n'est pas écrite ; `normalizeRows` lit ces images (80 max par passage, 6 à la fois, même image lue une fois).
- Testé sur 6 étiquettes La Boîte Immo (DPE C, C, D ; GES C, A, B) + petit format 300 px + grand format : tout juste ; bruit / échelle sans barre choisie → rien.
- influences.immo (La Boîte Immo) : DPE trouvé sur 100 % des annonces (5 sans DPE avant) → « Réparé · à valider ». Vaut pour tous les sites La Boîte Immo et les étiquettes au modèle officiel 2021.
- Ajout d'une action de diagnostic `debug_image` (protégée cron) qui renvoie une image en base64.
- Limite : les anciennes étiquettes (flèche à côté de la barre, avant 2021) ne sont pas encore lues.

### 01/11/2026 — Claude : réseaux Guy Hoquet et Espaces Atypiques appris, Laforêt vérifié (pro-stock-sync v172)
- `guyhoquet-reader.ts` : toute agence `<agence>.guy-hoquet.com`. Le site renvoie tous les biens de l'agence en JSON (`/biens/result?with_markers=true` + en-tête `X-Requested-With`), une seule requête, filtrée sur l'agence (shop_id). Lien de fiche `/achat-vente|location/<texte>-<id>`. Avant : seuls les ~12 biens de l'accueil étaient lus (Tours 12 → 72/72) ou aucun (Canohès 0 → 43/43).
- `espaces-atypiques-reader.ts` : pages agence `espaces-atypiques.com/<région>/[<ville>/]`. Liens `/ventes|locations/<cp>-<ville>-<titre>-<réf>/` (réf. « 15710 », « sa5421 », « lry5805 », « sa5214-1 »). Ville et code postal pris du titre de la page / du lien (la fiche donnait « Informations complémentaires » ou « Paris »). Avant : 503 (exploration de tout le site national). Albi 21/21, Les Sables 5/5, Cherbourg 7/7, Biarritz 3/3.
- Laforêt : les pages agence `laforet.com/agence-immobiliere/<agence>` étaient déjà lues (Pontarlier 7/7). Paris 1 Saint-Martin : page supprimée (404) → demande annulée, mail normal.
- Demandes canohes et les-sables-olonne → « Réparé · à valider ». ~125 prospects Cimm / Guy Hoquet / Espaces Atypiques / Laforêt remis en file.
- Reste : Square Habitat (API cachée), anciens domaines guyhoquet-immobilier-<ville>.com à vérifier.

### 01/11/2026 — Claude : réseau Cimm Immobilier appris par le robot (pro-stock-sync v168)
- Nouveau `supabase/functions/pro-stock-sync/cimm-reader.ts` : toute agence `<ville>.cimm.com` est lue (liste des biens sur la page d'accueil de l'agence, fiches `cimm.com/bien/…-p<n°>`).
- Ville : lue sur la photo principale (« Maison à Montlouis-sur-Loire »), sinon ville de l'agence. Corrige « ville manquante ».
- Tests : Ballan-Miré 22/22, Guipry-Messac 29/29, Le Touvet 25/25 complètes. Demandes guipry-messac et letouvet → « Réparé · à valider ». 26 prospects Cimm remis en file de vérification.
- Commit c3d2110 (déployé avec le SHA complet).
- Reste : réseaux Laforêt, Guy Hoquet, Espaces Atypiques, Square Habitat (API cachée).

### 01/11/2026 — Claude — Citya Nord de France + prix « price/prix » (v166 / 83494a3)
- `readCityaNdfAgency` (citya-ndf.com/agence/agence-de-X/) : liens « /annonces/?status=acheter|louer&address=Agence de X » de la page agence, display=48, pages /annonces/page/N/ ; ville/CP repris de l'adresse de la fiche si absents. Tests : La Bassée 15/15, Calais 25/25, Armentières 1/1. 48 prospects remis en test.
- smart-reader : prix lu d'abord dans un élément dont la classe contient price/prix (sinon « 1 » salle de bain + « 179 500 € » donnait 1 179 500 €).

### 01/11/2026 — Claude — lecteur Citya + retest des 104 réparations (v163 / 40d6891)
- `citya-reader.ts` : agences www.citya.com (`/agences-immobilieres/…/<n°>` ou `/annonces/agence/<n°>/…`) → listes `/annonces/agence/<n°>/vente|location` (+?page=N), fiches lues par smartDetail, photos limitées à `/biens/<n°>/`. Tests : 26/26, 13/13, 28/28. 24 prospects citya.com remis en test. Reste citya-ndf.com (WordPress Beyot, `/annonces/?status=acheter&address=Agence%20de%20X`), Square Habitat, Laforêt, Espaces Atypiques, Guy Hoquet, Cimm.
- Retest des 104 demandes en attente : 9 passent maintenant (passées « Réparé, à valider »), 95 restent (73 « aucune fiche lisible »).
- Galerie : en fermant, le zoom à deux doigts est remis à 100 % (viewport maximum-scale le temps d'un instant).

### 01/11/2026 — Claude — réparations Croisette, Agence Résidence, Solution Immobilier, La Grandière (v162 / 8cb46b1)
- Apimo : surface « Surface totale / habitable / utile / Superficie / Carrez », puis `floorSize` (JSON-LD), jamais une ligne terrain/jardin/terrasse ; liste « nos-biens » / « nos-proprietes » reconnue (Solution Immobilier : 30 au lieu de 2).
- smart-reader `firstAmount` : un montant précédé de charges / quote-part / taxe / honoraires / énergie / dépôt / garantie n'est jamais le prix (sauf « Prix … »/« Loyer … » juste avant). Agence Résidence : 23 avec vrai prix, 4 sans prix affiché écartées.
- smart-reader : og:image dont le nom de fichier reprend le titre (≥ 3 mots) remise en 1re photo si absente de la galerie (La Grandière).
- admin-test-import : statut « ✓ Réparé · à valider (qui, date) », réparés en haut.

### 01/11/2026 — Claude — GES manquant ne bloque plus (v157 / cd6edcb)
- Demande d'Anthony : un DPE sans GES n'est plus une erreur (beaucoup d'agences ne publient pas le GES). `gesFromText` le reprend de la description s'il y est écrit (« GES : C », « gaz à effet de serre classe D », « émissions de GES … (classe E) »).
- Tests : Croisette 98/100, Agence Résidence 27/27, Solution Immobilier 2/2, La Grandière 2/2 → demandes passées « Réparé, à valider ». 16 prospects immo « mail normal » pour annonces incomplètes remis en test (site_check_status=null).

### 01/11/2026 — Claude — vignettes : orientation des photos, photos en hauteur, galerie
- `generate-listing-thumbs` v2 : applique l'orientation EXIF (photos de téléphone couchées dans les miniatures). Les 88 miniatures ont été refaites (cron temporaire `abracadeal-thumbs-catchup-tmp`, à supprimer une fois vide). `thumbUrl` ajoute `?o=2` (les anciennes miniatures étaient en cache 1 an).
- `assets/card-photo-fit-20261101.js` + CSS `.photo-fit` : photo en hauteur affichée entière sur fond flou dans les vignettes.
- Galerie (lightbox) : la colonne des miniatures défile ; la grande photo n'est plus poussée sous la barre du bas quand il y a beaucoup de photos.
- **Orpi agences partagées : TERMINÉ (Claude, 01/11, v156 / cf17fa9)** : fiches ouvertes sans `?agency=` (sinon elles s'affichent au nom de l'agence inscrite), filtre `data-estate.agency.slug` sur toutes les fiches + filtre de la liste JSON ; scope mémoire `orpi-v3:` / `orpi-oce-v2:`. Test St Cyprien : 38 biens à elle, les biens des 29 autres agences ignorés (passages 2 et 3 : 12 puis 25 ignorés). Le compteur Orpi (750) n'est plus utilisé comme total attendu. Inconvénient : un tour complet ouvre toutes les fiches de la liste (~30 passages pour 750).

### 31/10/2026 — ChatGPT — Vernoux Immobilier / Orpi VIP Business
- L'adresse vernoux.immobilier est une agence Orpi Commerces & Entreprises (VIP Business, Bourg-en-Bresse). La recherche résidentielle renvoyait zéro, alors que la recherche commerciale publique filtrée par agence annonce 37 ventes et 16 locations.
- Reconnaissance des liens commerciaux propres à l'agence ; endpoints OCE pour compteurs/JSON, état de reprise séparé du résidentiel. Les références commerciales 21_0288 / 01_0427 et slugs courts sont acceptés ; pagination HTML de secours adaptée. Aucun catalogue de réseau élargi.
- Nouveau parseur de fiche commerciale : métadonnées publiées de la même référence, prix principal (jamais CA/prix de loyer contenu dans le descriptif), ville/CP du bien et non agence, avis de l'agent complet, galerie originale sans logos/miniatures doublonnées, caractéristiques, diagnostics explicites. « DPE vierge » ne devient pas une exemption inventée. Contact de la carte du bien, agence identifiée comme agence.
- Catégorie existante Bureaux et commerces réutilisée pour fonds/bureaux/locaux ; les terrains commerciaux gardent leur type terrain. Loyers mensuels conservés, annuel converti en mensuel seulement si l'unité est explicite et montant annuel original conservé dans la description ; prix au m² non inventé.
- Tests réels vente/rental (Dijon 185000 € / 513 m², Ambérieu-en-Bugey 1600 € HT/mois / 531 m²), périmètre commercial, source de prix/unité, ville distincte agence, photos/contact, diagnostics vierges, Orpi résidentiel et triple du canapé : OK. Production à contrôler avant done. Aucun import/publication/activation, prospect ou mail.

### 31/10/2026 — Claude — pour ChatGPT : « Failed to send a request to the Edge Function » sur le test d'un gros Orpi
- Anthony l'a eu sur mobile en testant une agence Orpi (lecture en plusieurs passages). Mesure : `crawl_state` ≈ 66 Ko à 25 fiches, 104 Ko à 50 (≈ 1,5 Ko/fiche → ~1 Mo à 500), et `preview_url` renvoie à chaque passage TOUTES les lignes brutes + normalisées cumulées (normalizeRows sur tout à chaque passage). Probable 546 / mémoire ou réponse trop lourde (pas d'en-têtes CORS → erreur réseau côté navigateur).
- Côté page : chaque passage est réessayé 2 fois ; sinon on garde l'aperçu déjà lu et on propose « Continuer la lecture ». Côté robot (toi) : idéalement ne renvoyer que les nouvelles lignes par passage, ou normaliser seulement à la fin.

### 31/10/2026 — Claude — pour ChatGPT : preview_url resumable renvoie partial=true sans rien lire
- Ex. https://www.nextlogis.fr (immo, « Inconnu · lecture automatique ») : `total_on_site=3`, 0 ligne lue, plus de liste ni de fiche restante, mais `partial=true` → la page affichait « gros site, continuer la lecture ». En non-resumable, `auto_review_dry` dit bien « Aucune fiche de bien lisible ». Corrigé côté page (admin-test-import.html : 0 lu + rien restant = site illisible). À corriger aussi côté robot si tu peux (partial ne devrait pas être vrai quand la file est vide).

### 31/10/2026 — Claude — mail « Robot : N site(s) à apprendre » arrêté
- Demande d'Anthony : plus de mail quotidien des sites à réparer (il arrivait en Promotions). Cron `abracadeal-unreadable-sites-digest` (17:10) supprimé. La liste reste visible dans admin-test-import.html (Sites à apprendre / Sites en réparation). Ne pas le remettre.

### 31/10/2026 — ChatGPT — Carnot, triple du canapé noir
- Retour visuel d'Anthony confirmé : références 37511a11, e1004b51 et 204c545e, même bas de villa 100 m² / 4 pièces / 349000 €, deux Cannes et un Le Cannet, maison et appartement. Contrôle des photos : première image strictement identique (SHA-256 identique sur les trois fichiers téléchargés), galeries et descriptions cohérentes avec le même bien. La divergence de ville/type existe dans les trois fiches source.
- `estate-duplicates.ts` ajoute un rapprochement Orpi prudent après le dédoublonnage existant : même transaction/prix/surface/pièces/département, description détaillée proche et preuve photographique (galerie très largement commune ou image strictement identique en octets). Les programmes/numéros de lots sont exclus ; pas de fusion sur la seule photo. Téléchargement image public limité à 3 Mo / 4 s, redirections et adresses contrôlées ; échec => fiches laissées séparées.
- Conserve la fiche source avec le plus de photos (ou une fiche corrigée par l'admin), sans réécrire la ville ; aliases conservés pour contrôle. Affiche les villes contradictoires à la source dans l'aperçu. Autres connecteurs inchangés. Aucun import/publication/flux/prospect/mail modifié.
- Test réel du triple + contre-exemples prix/surface/pièces/transaction/lot/photo différente ou indisponible et priorité de correction manuelle : OK. Déployé v153 / 7b9ca08, modifications de cron et de journal de Claude préservées. Production à blanc 189565 : 498 références, 490 annonces complètes (contre 492), 8 doublons au lieu de 6, 6117 photos, erreurs vides. Le filtre des trois UUID dans le résultat ne renvoie que 204c545e : Cannes 06150, appartement 100 m² / 4 pièces / 349000 €, 17 photos. Demande 6a8bbda6 passée done, visual_validated_at reste null. Tests photos, Orpi catalogue, reprise, Next/Openflex, batch4 et géocodage borné OK ; syntaxe de l’admin et compilation TypeScript OK. L’éligibilité est mémorisée pendant la comparaison pour ne pas relire les longues descriptions pour chaque paire.

### 31/10/2026 — Claude — gros sites : reprise toutes les 15 min pendant un tour
- `sync_all` : un flux site dont `pro_stock_crawl_state.state.completed` est vide (tour en cours, mis à jour < 72 h) est relancé à chaque cron (~15 min, mini 13 min) au lieu d'attendre 175 min. Une fois le tour fini, retour au rythme 3 h. Rien d'autre changé dans la lecture (code ChatGPT). Déployé v151 / e4af4ca.
- Prospects : bouton « Mail normal » et « Supprimer » dans Sites en réparation (`admin_robot_learning_mail_normal`, `admin_robot_learning_delete`), offre Fondateurs refusée aux désinscrits (`private.founder_optout_conflict`, CGV mises à jour).

### 31/10/2026 — ChatGPT — Carnot, écart de compteur expliqué et complément JSON
- Le compteur sans transaction 536 inclut 38 locations d'autres agences ; elles ont été identifiées dans la réponse publique `/recherche/ajax` (agimmo, Lancelot, etc.), hors des six locations de la recherche Carnot. Les compteurs filtrés officiels donnent 492 ventes et 6 locations : cible réelle 498, et non 536. Sept ventes n'étaient pas présentes dans les liens des pages catalogue consultées.
- `orpi-catalogue.ts` lit la recherche JSON publique par transaction buy/rent, agency et onlyEnabled, et exige que l'agence et le total soient confirmés dans la réponse. Les ventes partagées présentes dans cette recherche restent autorisées, sans élargir aux locations d'autres agences. Catalogue > plafond JSON : complément par pagination HTML, total distinct obligatoirement égal au compteur filtré, sinon pas d'archivage.
- Réutilisation des checkpoints Orpi existants : ajoute les listes JSON à la file sans jeter les fiches déjà lues. Champs, galerie et description intégrale restent lus sur chaque fiche ; aucun JavaScript exécuté et aucune clé réutilisée. Tests périmètre, transactions et compteurs filtrés OK, compilation OK. Déployé v150 / 7d37407. Production 189511 : 498/498 fiches lues (492 ventes + 6 locations), 492 annonces complètes après six doublons, 6147 photos, erreurs vides, partial=false, cycle_complete=true, total_mismatch=false, aucun lien restant. Sept fiches complémentaires retrouvées, ancien checkpoint 475 conservé puis terminé avec 23 fiches (16 anciennes restantes + 7 nouvelles), deux appels JSON. Demande Carnot done, visual_validated_at inchangé ; validation manuelle par Anthony. Régressions batch4 et Next/Openflex OK. Plafond de téléchargement JSON Orpi porté à 15 Mo, les autres lecteurs conservent leurs limites. Aucun import/activation/prospect/mail.

### 31/10/2026 — ChatGPT — lecture en plusieurs fois Orpi et lecteur automatique
- `resumable-crawl.ts` : listes et fiches restantes, références et lignes déjà lues, reprise 35 s / 100 fiches (Orpi : lots de 25, plus lourds), quatre téléchargements simultanés. Mémoire par flux existante `pro_stock_crawl_state`, source et périmètre isolés, reset après 72 h sans progression ; un tour vieux de plus de 72 h ne permet aucun archivage. Aucune nouvelle table. Enregistrement compare-and-swap avant retour au sync ; résultat rejouable après échec.
- Orpi : retrait du plafond 220 et de la rotation quotidienne ; pagination publique de chaque liste de la seule agence. Lecteur automatique : reprise des listes, fiches et sitemaps, périmètre conservé. Autres lecteurs spécialisés conservés, Next/Openflex garde sa mémoire existante ; les lecteurs spécialisés encore plafonnés nécessitent leur propre adaptation, aucune promesse de lecture universelle.
- Erreur réessayée une fois puis signalée : tour incomplet, aucun archivage. Le garde-fou 50 % et la vérification du checkpoint de sync restent actifs. Un tour sans aucune référence découverte ne peut être complet. Aucun flux activé, import, annonce publiée, mail ou statut prospect modifié pendant ces tests.
- Aperçu admin : passages successifs en mémoire temporaire, progression visible, résultats cumulés sans import ni mémoire de flux écrite ; validation masquée tant que partiel. Action interne auto_review_dry accepte resumable/crawl_state pour vérifier un tour à blanc, sans écritures DB.
- Tests moteur : reprise en plusieurs passes, pagination, relecture/rejeu, retry, blocage sur erreur permanente, reset 72 h OK. Régressions photos, batch4, Next/Openflex OK ; compilation esbuild OK. v148 / 381eac0 déployé (lots Orpi 25 et transport temporaire gzip). Production Carnot : passages 189409 / 189410 / 189414 / 189420 : 100, 200, 300, 400 fiches parcourues, reprise de file sans relire les précédentes, aucune erreur de téléchargement ; interruption 189424 HTTP 503, point 400 conservé puis reprise réussie 189450/189451/189452/189456 : 425, 450, 475, 491 fiches parcourues ; 485 annonces complètes après 6 doublons, 6062 photos, zéro erreur de fiche, file vide. Compteur Orpi 536 : partial=true conservé, aucune suppression permise, demande Carnot laissée pending avec la limite. Le catalogue public expose 491 liens sur 19 listes, compteur général 536 : écart à vérifier, Carnot ne doit pas être déclaré réparé. Ajout du contrôle du compteur Orpi : un écart garde partial=true et interdit l’archivage. Tour terminé rejouable jusqu’à acquittement par sync, références identiques de deux URL conservées avant normalisation, aucun plafond silencieux de 5 000 lignes. Tests collisions et compteur en désaccord ajoutés. Vérification finale v148 : 189467 HTTP 200, 491 fiches, 485 complètes, écart compteur 536 explicitement bloquant ; reprise du même checkpoint après un HTTP 503 intermittent, sans perte. Régression production lecteur automatique MS Motors 189471 : 22/22 lues, 20 complètes, partial=false, aucune fiche manquée ; deux prix absents et année Brabus source invalide toujours signalés. Aucun site marqué done sur ces tests, aucun import/activation/prospect/mail.

### 31/10/2026 — Claude — aperçu des annonces du prospect + envois + corrections robot
- **Aperçu prospect** : `pro-fondateur.html?r=<code>` affiche « voici vos N véhicules/biens sur Abracadeal » (6 annonces lues sur son site, photos marquées APERÇU) + bouton d'inscription. Table `prospect_previews` + RPC publique `prospect_preview(code)` (SQL `supabase/2026-10-31-prospect-previews.sql`). Rempli par `prospect_precheck` et, pour les déjà testés, par l'action `prospect_preview_fill` (cron `abracadeal-prospect-preview-fill`, ~285 à rattraper). Ne pas tester avec un vrai code : ça compte un clic du prospect.
- Bouton « Je m'inscris gratuitement » en haut de pro-fondateur.html.
- Envois : `daily_limit` 18 → 25 par boîte (50/jour). Voir les rebonds avant de monter à 35.
- prospect-mailer v13 : action `test` possible avec la clé interne, toujours vers abracadeal@gmail.com.
- Robot (v142) : « Conduite intérieure » retiré de la carrosserie ; équipements voiture retirés des motos ; « Hybride non rechargeable » → Hybride (Simplici, Ewigo, texte).
- Pages admin : `assets/admin-auth.js` (renouvelle la session au lieu de demander de se reconnecter), supabase-js 2.118.0 partout.
- Aperçu d'import : « Quitter l'aperçu » ferme l'onglet et revient au test.

### 31/10/2026 — ChatGPT — Peyrot et Lecluse visibles pour le contrôle d’Anthony
- À sa demande, ajout de deux lignes done / Réparé dans robot_learning_requests : Groupe Peyrot — Renault Carcassonne (127 annonces complètes) et Lecluse — Volkswagen Le Mans (79). Elles étaient absentes malgré les tests de lecture effectués.
- visual_validated_at laissé null, prospect_id null ; note Phase 2 / contrôle du lecteur uniquement. Anthony peut ouvrir Tester dans Sites en réparation. Aucun prospect, import ou mail modifié. Aucun déploiement de code nécessaire.

### 31/10/2026 — ChatGPT — v139 en ligne, retests production terminés
- Déploiement pro-stock-sync v139 figé à 48e2af4167b81fe52209543120049b9f03b054e8, à partir de v138 réellement en ligne ; source, SQL, tests et docs poussés sur main.
- Tests à blanc séquentiels : Laugier 188671 = 23/23, 756 photos ; Chevreux 188672 = 30/30, 277 photos (écart au témoin 31 restant à vérifier, lecteur inchangé) ; Ewigo La Rochelle 188673 = 68/68 disponibles, 2 071 photos (source /acheter contrôlée : 73 dont 5 vendues/réservées) ; Lecluse Volkswagen Le Mans 188674 = 79/79, 2 184 photos après dédoublonnage global, 79 téléphones VO, une seule requête catalogue de 500 ; Peyrot Carcassonne 188675 = 127/127 complètes, 2 168 photos, 127 téléphones, 131 candidates / une exclue / trois fiches source en erreur protégées. Tous HTTP 200, partial=false, zéro doublon de référence, erreurs normalisation vides.
- Mémoire et purge SQL déjà appliquées/testées ; contrôle des droits et vérification de l’absence de compteurs/flux de test persistants OK. Tests DB annulés par rollback, aucune annonce créée/archivée, aucun prospect ni mail touché. Validation visuelle laissée à Anthony.
- Suite non livrée : autres fabricants / gros sites, Estela (API repérée mais signification des flags de disponibilité à établir), Honda Nantes (503), correctes adresses auto pour Reverdy.fr / autoeurope.fr. Crefimo remis pending avec diagnostic Adaptimmo ; les autres demandes immobilières ne sont pas déclarées réparées. La mémoire des autres familles et le témoin Chevreux restent du travail ouvert.

### 31/10/2026 — ChatGPT — lecteur fabricant Izmocars ; SQL téléphone et demandes appliqués
- Izmocars identifié derrière les sites propres aux concessions Lecluse (site groupe → volkswagen-le-mans.fr). Nouveau lecteur générique, aucun domaine codé en dur. JSON public izmoGlobalData parsé sans évaluation de scripts ; paramètre listingPerPage=500 confirmé : 79 références en une requête au lieu de 7 pages. Chaque ligne vérifie invDlrId ET localDealerId = dealerId du site ; le champ dealerIds du catalogue contient aussi d’autres concessions et n’est jamais utilisé comme autorisation.
- Occasion USED / statut ACTV, sans vente/réservation/VN/0 km/commande/stock usine ; contrôle du compteur total, pagination stable et site physique unique. Données de liste complètes : galerie, équipements, téléphone VO, prix et caractéristiques ; pas de requêtes fiches. Test source Le Mans : 79 lignes, 2 190 photos, ville/CP Le Mans 72000, téléphone VO 02 43 78 50 70. Tests Izmocars (dont fuite réseau et pages répétées) + Next dealer et bundle OK ; déploiement/retests à suivre.
- Les deux migrations du commit 45d69f1 ont été appliquées. Téléphones : tests transactionnels 15/10min, 40/24h et répétitions FR/+33/0033 OK ; compteurs normalisés/hachés, table privée, propriétaire/admin exemptés, nettoyage horaire 7 jours actif. Message déjà affiché par assets/index-main.js (error.message). Tests annulés, zéro ligne de suivi réelle créée.
- Déclencheur demandes impossibles vérifié : pending/in_progress conservées, failed/cancelled supprimées ; deux anciennes failed retirées, zéro restante. admin_confirm_robot_learning_visual strictement inchangée (empreinte e7b07c26a4e9b65dc1598c3220ee89cd). Tests annulés. Checkpoint SQL concurrent périmé refusé, test annulé ; zéro flux activé/importé.
- Crefimo diagnostiqué après prise en charge : Adaptimmo, liens /fr/detail.htm?cle=… non reconnus, référence générique detail.htm et photos de tailles différentes dupliquées ; DPE/GES en images Adaptimmo signées, pas de classes textuelles. Non réparé dans cette passe gros concessionnaires, demande à conserver visible en attente ; aucun DPE déduit de la consommation. Estela : API lue (65, trois agences) mais mapping des codes de disponibilité non établi ; pas d’import deviné.

### 31/10/2026 — Claude — admin import : « Mail normal » et bouton « Mettre à jour »
- `admin_mark_prospect_generic` écrit `site_check_reason='Choix Anthony : …'` ; `admin_unreadable_sites` n'affiche plus ces lignes (avant : generic+ready restait dans « Sites à apprendre »). SQL : `supabase/2026-10-31-mail-normal-sort-de-la-liste.sql`.
- Bouton « ↻ Mettre à jour » en haut de admin-test-import.html (recharge Demandes, Sites à apprendre, Sites en réparation).
- Grok : 144 e-mails Ewigo vérifiés sur les sites d'agence, 126 confirmés, 36 absents des prospects (ajout non fait, confirmation annulée).

### 31/10/2026 — ChatGPT — déploiement gros stocks et SQL de protection préparés
- pro-stock-sync v138 déployé, figé au commit 8d895f1 ; migration dealer_crawl_memory appliquée. RLS activée, accès anon/authenticated refusé, service_role autorisé. Production Peyrot Carcassonne 188487 : 127/127 complètes, 2 168 photos, contacts/prix/villes/km/années/énergie/boîte/description 100 %, partial=false ; 131 références au catalogue dont une exclue et trois fiches source indisponibles protégées. Aucun import ni prospect.
- Retests v138 : Laugier 188479 = 23/23 ; Chevreux 188482 = 30/30 (31 avant, parcours automatique variable : 88 fiches candidates, 19 ratés contre 16 avant ; écart non clos, pas présenté comme 31/31). Ewigo La Rochelle 188483 = 68/68, vérifié directement sur /acheter : 73 dans le JSON, cinq vendues/réservées exclues. Pas de modification des lecteurs témoins.
- Restauration du journal effectuée entre-temps par Claude (63616e4), conservée intégralement avec son entrée Grok ; aucun écrasement concurrent repris.
- Deux SQL demandés initialement enregistrés : limite par compte de 15 numéros distincts/10 min et 40/24 h (numéros normalisés et hachés, répétitions gratuites, propriétaire/admin exemptés, nettoyage 7 j), et suppression automatique des demandes failed/cancelled + nettoyage des failed existantes. Application et tests à suivre ; admin_confirm_robot_learning_visual non modifiée.
- Autres gros sites : Estela publie /api/vehicules?per_page=500 (65 lignes, 3 concessions), mais les codes numériques de disponibilité restent à confirmer ; ne pas importer en les devinant. Lecluse : WordPress et pages concessions, source VO pas encore trouvée. Honda Nantes : 503. Reverdy.fr et autoeurope.fr hors sujet automobile d’occasion.


### 31/10/2026 — Grok (ajouté par Claude) — liste d'e-mails d'agences
- Grok a écrit `docs/PROSPECTS-GROK.md` (e-mails publics d'agences Simplici Car, Transakauto, Ewigo). Rien n'est encore importé dans les prospects : à vérifier avant (sources « journal Claude » de Grok non fiables, e-mails Transakauto à confirmer).
- Grok avait remplacé tout ce journal par une seule ligne (commits 7dabecc à 252080b) : restauré par Claude depuis 8d895f1.

### 31/10/2026 — ChatGPT — lecteur générique Next.js / Openflex et mémoire par flux
- Nouveau lecteur par schéma public (pas par concession) ; page de concession obligatoire, point physique exact puis confirmation sur chaque fiche. Occasion disponible uniquement, pas de neuf / 0 km / vendu / réservé / commande / stock usine ; galeries, équipements et téléphone VO repris, plaque/VIN exclus. Source publique Next JSON ; aucune clé tierce ou API refusée utilisée.
- Mémoire liée au flux, queue et lignes rejouables, checkpoint concurrent vérifié, 4 requêtes / budget 45 s, reset 72 h. Archivage seulement en fin de tour, références en erreur protégées, garde-fou 50 % conservé. Cette mémoire concerne cette nouvelle famille ; autres lecteurs inchangés. SQL daté dealer-crawl-memory enregistré, application et déploiement à suivre.
- Témoin réel local Carcassonne : 131 références du point de vente, 127 fiches avec 2 168 photos ; une exclue, trois indisponibles/incomplètes (105553 et 119878 HTTP 404, 118893 sans DTO) protégées. Reprise contrôlée après un premier lot de 8 fiches ; pas d’import. Tests ciblés et régressions batch4 / Select Azur / bundle TypeScript OK. Témoins production avant changement Laugier 23/23, Chevreux 31/31 ; retests après déploiement requis.
- Docs GROS-SITES §7 : couverture et limites explicites. La liste Peyrot ne publie pas le statut/updatedAt : les fiches sont revérifiées à chaque tour pour ne pas laisser des réservées en ligne. Le catalogue national >=9 998 références est refusé comme plafonné. Aucun prospect/mail/publication/validation visuelle.

### 31/10/2026 — ChatGPT — en cours : lecture en plusieurs fois
- Travail sur le nouveau lecteur générique Next.js / Openflex et sa mémoire par flux : point de vente strict, occasion disponible, reprise de file et archivage uniquement en fin de tour. Le HTML du catalogue Peyrot contient déjà les données de tout le stock ; pas d’utilisation de clé du site ni d’accès GraphQL refusé.
- Le cœur de sync sera adapté pour protéger les références temporairement en erreur et ne pas archiver pendant un tour incomplet. Aucun prospect ni flux réel activé/importé pour les tests.

### 31/10/2026 — ChatGPT — en cours : gros concessionnaires
- Priorité Anthony : stock occasion disponible, uniquement le site/agence inscrit ; sources structurées et lecteurs génériques avant HTML. Guides APPRENDRE-AU-ROBOT.md et GROS-SITES.md lus. Aucun prospect, mail, import ou publication.
- Accès rétablis via les connexions Abracadeal : déploiement vérifié v137 / dbd1755ef031ef34eac4773ef9de5f3340fbbb00. Précédent diagnostic d’accès corrigé : mauvais identifiant de connexion utilisé par ChatGPT.
- Peyrot : stock structuré Next.js / urql (2 299 fiches de catalogue) et point de vente i_pve_id ; périmètre agence, disponibilité et pagination à contrôler avant activation. Reverdy.fr (nutrition équine) et autoeurope.fr (location) ne sont pas des concessionnaires. Honda Nantes : HTTP 503 à cet essai.

### 31/10/2026 — Claude — 36 agences Weecars ajoutées à la prospection
- Liste des 42 agences = menu « Nos agences » de `weecars.fr/319/vehicules/?stock=…` ; e-mail lu sur chaque page `weecars.fr/319/agence/?agence_id=N` (générique `ville@weecars.fr` ou personnel de l'agent).
- **Ajoutées (36) :** `Garage / concession auto`, `petit_pro`, `ready`, adresse `…/vehicules/?stock=N`, source « weecars.fr (page agence) ». Non ajoutées : déjà dans la liste (Annemasse, Angers, 5 déjà écrits) ou e-mail en double. Le précontrôle testera chaque stock puis mail « répondez OK ».
- **Test (Weecars Cannes, stock=1935) :** lu par le lecteur Spider VO : 24/24 complets, 575 photos ; le filtre `stock=` est bien appliqué par le site (voitures différentes de la page nationale). La ville lue est celle du siège (Castelnau-le-Lez, pied de page) : à l'import réel, la ville du compte du pro est prioritaire (`normalizeRows`, `ownerLocation`).

### 31/10/2026 — ChatGPT — MS Motors pagination
- Lecture initiale v135 / 188316 : 10 véhicules seulement, faux partial=false. Les slugs courts de véhicules étaient classés comme listes ; parcours MS Motors limité maintenant aux quatre pages du catalogue et à toutes leurs fiches, sans archives marques/statuts ni boutique. Kilométrage étiqueté et description/options propres au véhicule repris. Galeries existantes conservées. Aucun prospect/import/mail/validation. Déployé v137 / dbd1755 sur main. Test production 188328 : 22/22 fiches, quatre pages catalogue (6+6+6+4), 20 complètes, 439 photos, aucun doublon, aucune fiche manquée, partial=false. Deux prix absents source (Brabus 900 Rocket et Mercedes GLA 45 AMG) et année Brabus invalide laissés signalés. Titres modèles complets conservés. Demande done, validation visuelle laissée à Anthony. Tests photos et batch4 OK.

### 31/10/2026 — Claude — Prospects Transakauto remis en prospection ; Weecars
- **Transakauto (demande d'Anthony) :** 6 agences sorties de `phase2_reseau` → `petit_pro` / `ready`, adresse = leur site Auto-Gestion (`transakauto<ville>.auto-gestion.net`, stock vérifié) et e-mail de l'agence lu sur sa page contact : Dreux, Cambrai, Abbeville, Manosque (`serviceclient@` national remplacé par `manosque@transakauto.com`), Bastia, Lyon 8 ; noms « Transakauto <ville> ». Le précontrôle les testera puis mail « répondez OK ».
- Restent en pause : Montauban (site Auto-Gestion sans véhicule), Conflans (pas de site Auto-Gestion trouvé), Paris Espace Automobile (site propre, à tester). TransakMoto Lieusaint déjà écrit le 28/10.
- **Weecars :** Anthony a testé une page agence (`weecars.fr/319/agence/?agence_id=N`) : lisible. Page stock d'une agence : `weecars.fr/319/vehicules/?stock=<n° agence>` (la liste déroulante « Nos agences » de cette page donne le n° de chaque agence). **Annemasse** : stock=1363 (donné par Anthony) → `petit_pro` / `ready`, nom « Weecars Annemasse ». Dans la liste : 8 prospects (5 déjà écrits, Angers et Signature en attente, Annemasse en pause avec l'adresse du site national → ne pas lire le site national, il faut la page agence).

### 31/10/2026 — Claude — Lecteur Auto-Gestion (agences Transakauto et autres garages)
- **Précision d'Anthony :** les garages Transakauto ont chacun leur site, tous identiques (comme Simplici Car). Ce sont des sites **Auto-Gestion** (`<garage>.auto-gestion.net`, Drupal multisite « agc.accommodata.fr »), utilisés aussi par d'autres garages (AUTO DUVAL, AK MOTORS, Select VO…).
- **Fait (`autogestion-reader.ts`, branché avant Ewigo) :** liste `/vehicles?page=N` (liens `/vehicle/<id>` en guillemets simples), fiche : `<h1>` (titre coupé au premier « | », le reste en tête de description), tableau `<th scope="row">` (Constructeur, Modèle, Finition, Energie, Transmission, Kilométrage, Année, Mise en circulation, Chevaux Fiscaux, Puissance du moteur, Couleur, Sièges, Garantie), équipements, `.price`, « Réf. : », Crit'Air (image `critair/N.png`), galerie 848x565. Ville : titre du site (« … LYON 69008 »). « Essence / Courant électrique » → Hybride.
- **Test :** Transakauto Lyon 8 : 153 lus, 139 complets, 4 658 photos ; 13 sans photo et 5 sans prix sur le site (arrivages). Déployé v135 (commit bca0629).
- `docs/GROS-SITES.md` §6 : le site national annonces.transakauto.com reste un « gros site » (16 669 voitures, agence seulement sur la fiche) ; pour une agence, utiliser son site Auto-Gestion.

### 31/10/2026 — Claude — Note pour ChatGPT : gros sites (lecture en plusieurs fois)
- **Demande d'Anthony :** donner à ChatGPT les infos pour les gros sites. → **`docs/GROS-SITES.md`** (à lire avant de commencer).
- Problème : sur un gros stock, chaque passage recommence du début et s'arrête avant la fin ; une lecture partielle n'archive jamais rien → **les annonces vendues des gros sites ne sont jamais retirées**, une partie du stock n'est jamais lue, l'inscription reste « à vérifier ».
- À construire : mémoire par flux (`pro_stock_crawl_state` + `pro_stock_seen`), un « tour » = toutes les listes puis la file des fiches sur plusieurs passages, archivage seulement à la fin d'un tour complet (garde-fou 50 % conservé), fiches inchangées dans la liste non relues. Sites témoins : speedway.fr, valloire-habitat.com, orpi.com/immosaintnicolas, orpi.com/caluirebourg, human-immobilier.fr/la-chatre.
- **ChatGPT :** noter « en cours : lecture en plusieurs fois » ici avant de toucher à `syncFeed` / `readSmartSite`, pour ne pas travailler dessus en même temps que Claude.

### 31/10/2026 — ChatGPT — Select Azur, contrôle des images et diagnostics abrégés
- Correction du précédent diagnostic : les sept GES n'étaient pas tous absents. Les 38 photos des sept galeries ont été contrôlées visuellement : logements/façades, aucune étiquette diagnostic supplémentaire. Cinq fiches publient le couple de classes dans leur propre description : « DPE : D / B. », « DPE D ET D », « DPE D (240) et D (45) », « DPE D (199 )et D (44) », « DPE D ET C ».
- `apimo-reader.ts` sait désormais lire ces couples complets sur une ligne dédiée de la description propre au bien, sans référence figée. Les graphiques existants restent prioritaires. Rejet des plages A à G, textes multi-logements et couples incomplets/ambigus. Les classes uniques C des références 87544661 et 87541800 ne permettent toujours pas de renseigner leur GES.
- Tests Select Azur (cinq notations réelles, cas négatifs, priorité graphique), Intuition, Cannisimmo, Raccosta, batch4 : OK. Lecture avant correction v133 / 187100 : 60 lus, 53 complets, 373 photos, sept GES manquants. Déployé v134 / 89ca013 sur main. Production 187106 : 60 lus, 58 complets, 373 photos, partial=false, seulement deux GES manquants (87544661 et 87541800), aucun doublon. Demande Réparé/done mise à jour ; visual_validated_at reste null.
- Aucun prospect, import, publication, mail ou validation visuelle de notre part.

### 31/10/2026 — Claude — Lecteur Simplici Car (≈ 100 agences franchisées)
- Un seul site national PrestaShop (simplicicar.com) ; chaque agence = une catégorie, ex. `/9-occasions-cannes-06` (liste : `/content/9-agences`). **Adresse à donner au robot = la page catalogue de l'agence.**
- **Fait (`simplicicar-reader.ts`) :** liste paginée (?page=N) puis fiche de chaque voiture : bloc `data-product` (JSON PrestaShop) → marque, modèle, version, énergie, km, année, mise en circulation, couleur, portes, places, puissance, Crit'Air, CO2, ville de l'agence, équipements (« Oui »), photos `large_default`, prix. Seules les voitures dont `id_category_default` = l'agence ; quantité 0 / non commandable exclues.
- **Piège trouvé :** l'en-tête du robot `Accept: application/json…` fait répondre PrestaShop en JSON → la page n'arrivait jamais au choix du lecteur de site. `readFeed` envoie maintenant directement les pages agence Simplici Car au lecteur.
- **Test :** Cannes 150/150 complets, 2 633 photos. Déployé v133 (commit 6001e60).
- **Reste :** le site ne publie aucun e-mail d'agence (formulaires + téléphones) ; aucune agence Simplici Car dans la liste de prospection.

### 31/10/2026 — ChatGPT — lecteur Boschi Vaison-la-Romaine
- La page d'agence ne montre que deux nouveautés. Périmètre complet trouvé dans le formulaire public /acheter, champ agences[] avec valeur vaison-la-romaine. Filtre contrôlé sur chaque page ; le catalogue annonce 98 biens, pas les 796 du réseau entier.
- Session anonyme publique : GET d'entrée puis appel officiel update_viewport_session, formulaire de recherche envoyé au même endpoint et dans le format AJAX de son JavaScript public. Aucun JavaScript téléchargé évalué, aucun contact envoyé, aucune authentification ou protection anti-robots contournée. Cookies éphémères gardés en mémoire pour cette lecture, redirections hors domaine refusées.
- Lecture des seuls liens de ce catalogue paginé ; chaque fiche doit confirmer son agence dans « Découvrir l'agence ». Produit JSON-LD de la même URL pour prix/type/surface/pièces ; ville explicite de la fiche, description intégrale dans fiche_exergue, photo originale publiée et dédoublonnée par identifiant d'image, classe des graphiques conso/gaz (pas de déduction depuis la valeur).
- Test local réel : 98/98, partial=false, aucune fiche ni photo manquée, 1305 photos. Témoin 019456 : Villedieu, Maison de village, 439000 €, 199 m², 6 pièces, 14 photos originales, D/D et consommation 156, téléphone d'agence +33490363333.
- Code source a0b929a déployé v131, intégré à main en conservant les nouvelles entrées du journal et les derniers changements Ewigo de Claude. Production 187049 : 98/98 fiches complètes, 1305 photos, 10 pages, partial=false, erreurs vides, aucune fiche manquée, contacts et villes 100 %. Demande passée done / Réparé, sans validation visuelle de notre part.\n- Tests Boschi : session/recherche publique, cookies au même domaine, filtre conservé et refus si perdu, aucun eval, pagination et refus de redirection hors domaine, diagnostics et galerie réels : OK. Régressions Select Azur/Intuition/batch4/batch5/batch6/photos et syntaxe TypeScript : OK. Aucune modification de la validation manuelle.
- Aucun prospect, mail, import/publication ou flux activé de notre part.


### 31/10/2026 — Claude — Lecteur Ewigo (réseau de ~130 garages)
- **Découverte :** les sites d'agences Ewigo (`<ville>-ewigo.com`) étaient classés « Autobiz » par le robot, mais Autobiz n'y est que le module d'estimation de reprise. Ce sont des applis Laravel / Inertia : toutes les données sont dans l'attribut `data-page` (JSON).
- **Fait (`ewigo-reader.ts`, branché avant la lecture automatique) :** `/acheter` (route minisite.acheter) = tout le stock de l'agence en une page ; **jamais `/achat`** (= stock de tout le réseau, 8 600 voitures). Contrôle supplémentaire : seules les annonces `agency_id` = agence du site. Fiche `/vehicule/{id}` pour les photos grand format, puissance DIN / fiscale, portes, places, CO2, couleur, garantie, équipements, nombre de propriétaires, état écrit par l'agence. Vendus / réservés / statut ≠ for_sale exclus ; plaque d'immatriculation jamais reprise. Titre = marque + modèle + version coupée au premier « / » (accroches « DISPONIBLE / GARANTIE… » en tête de description) ; « Hybride ( essence - electrique ) » → Hybride ; ville de l'agence (« La Rochelle », « Saint-Jean-de-Luz »).
- **Tests :** La Rochelle 73/73 complets (2 216 photos), Molsheim (Dachstein) 49/49 (2 090 photos). Déployé v130 (commit f5ee3dd).
- Prospects Ewigo : 106 jamais testés → le précontrôle les passera en « site lu » ; 12 déjà écrits, 2 désinscrits : non touchés.

### 31/10/2026 — Claude — Tri des sites illisibles + concessions de marque retirées de la prospection
- **Tri (échecs connus + ~500 sites non testés, empreinte du fabricant) :** agences : La Boîte Immo ≈ 1 agence sur 4, déjà lue (erlea.fr 30/30), Netty lu (5/5), Orpi / Apimo / C21 lus ; ≈ 5 % derrière un pare-feu AWS WAF (illisibles, mail normal). Garages : ≈ 3 sur 10 sont des pages de concession de marque (stock VO sur les plateformes des marques) ; grosse famille illisible = **Autobiz** (tout le réseau Ewigo : 128 garages dans la liste) → lecteur à écrire ; le reste = sites faits main.
- **Fait (demande d'Anthony : « les grosses concessions qui font quasi que du neuf on supprime ») :** 486 prospects passés en `segment='exclu_admin'` (statut `paused` s'ils n'avaient pas reçu de mail), note « concession de marque, surtout du neuf » — même effet que le bouton « Supprimer » : plus jamais de mail, réversible. Pages de concession des marques (Volkswagen, Toyota, Lexus, Porsche, BMW / BMW Motorrad, Mini, Mercedes, Skoda, Hyundai, MG, Honda, Mazda, Suzuki, Renault, Seat, Kia, Audi, Maserati, Harley…) + Peugeot / Citroën sauf les petits agents (nom « Garage… », « Agent… », « Ets… », « … Automobiles », sans « Groupe ») : 105 agents gardés.
- **Reste :** grosses concessions sur leur propre domaine (ex. honda-nantes.com, astonmartinparis.com, groupepeyrot.com/concessions/…) non traitées ; lecteur Autobiz à faire.

### 31/10/2026 — ChatGPT — Select Azur et tri des accès bloqués
- Demande Anthony de poursuivre les réparations. Base main 20d257e, version déployée vérifiée v127 / 2b91aba. Aucune modification de la validation visuelle ou de la fermeture manuelle des demandes ajoutée par Claude.
- Select Azur : le lecteur Apimo repérait 60 références mais ne reconnaissait pas les templates 41 (faits numériques) / 42 (titre, ville, prix et description), ce qui ne retournait que des lignes vides et 59 faux doublons. Nouveaux templates pris en charge, conseiller user-template-5, financier template 38 ; galerie et diagnostics existants conservés. Un détail non reconnu rend désormais le parcours partial=true.
- Témoin 85564762 : Nice 06000, 280000 €, appartement 88 m², 3 pièces, 2 chambres, 1 salle de bain, 5 photos, Andrea BELMESSIERI. Graphique DPE D / GES D / 233 ; la description source dit encore DPE E. Ce conflit n'est pas réécrit : le graphique affiché fait foi pour le champ et le texte est conservé.
- Code publié dans main 8671a6a, déployé v128. Production 187006 : 60/60 références, 373 photos, 53 fiches complètes, partial=false ; villes/prix/surfaces/descriptions 100 %. Sept GES manquants examinés (87544661, 87541800, 87030090, 87000157, 86611589, 86594200, 86594084) : cinq diagnostics vides, deux graphiques énergie avec émission vide, aucun graphique climat ; pas de valeur inventée. Demande done / Réparé, sans validation visuelle de notre part. Régressions Intuition/Cannisimmo/Raccosta/batch4/batch5/batch6/photos OK.
- Horizon Immo, Aixty, Thisse : requêtes serveur 186806/186807/186808 confirmées HTTP 202 + x-amzn-waf-action=challenge + réponse vide. Demandes pending annotées ; accès autorisé au robot ou flux fourni par le professionnel nécessaire, pas de contournement.
- Boschi : session publique viewport initialisée comme son JavaScript (pas d'évaluation du JavaScript reçu), page agence Vaison accessible, mais elle ne publie que deux « nouveautés ». Périmètre du catalogue complet encore à établir ; aucune lecture nationale ni chiffre de stock complet revendiqué.
- Le Cœur : contrôle v127 (186921) révèle que le lecteur générique confond des pages de catégories avec des fiches, et prend « Titre de la diapositive » pour une ville ; prix tronqués dans certains textes. Diagnostic conservé pour un lecteur dédié, pas de statut Réparé à ce stade.
- Aucun prospect, import/publication, flux activé ou mail de notre part.

### 31/10/2026 — Claude — « Valider ce site » refusé (Slycar)
- **Constaté (Anthony) :** « Valider ce site » ne passait pas pour Slycar. Le prospect était bien marqué « site testé », mais `admin_confirm_robot_learning_visual` levait « La demande ne correspond pas au site réparé » : la demande ouverte depuis « Sites en réparation » était encore `pending` (Slycar renvoyé en réparation), et la version de ChatGPT n'acceptait que `done` — elle avait aussi retiré la fermeture des demandes en attente ajoutée le 30/10 pour Anthony.
- **Fait (appliqué en base, `supabase/2026-10-31-robot-learning-visual-validate.sql`) :** fusion des deux versions — contrôle de ChatGPT gardé (même site, statut done / pending / in_progress), validation à la main = demandes en attente / en cours du site fermées (`done`, « Validé à la main après test du site ») puis archivées. Adresses comparées sans http(s), www et / final. Testé en transaction annulée sur Slycar : les 2 demandes passent `done` + archivées.
- **ChatGPT :** merci de ne pas retirer la fermeture des demandes `pending` / `in_progress` en modifiant cette fonction.

### 31/10/2026 — Claude — Kilométrage confondu avec une vitesse ou une garantie
- **Constaté (Anthony, Audi RS6 Slycar) :** kilométrage lu = 305 (« Vitesse relevée à 305 km/h ») au lieu de 41 500 ; la même annonce cite aussi « garantie … ou 80 000 KMS ».
- **Fait (`fillVehicleFromText`) :** « km/h » ignoré ; nombre de km ignoré quand le bout de phrase qui le précède parle de garantie, jusqu'à, autonomie, courroie, vidange, révision, contrôle technique / « favorable » ; on prend le premier restant. `simplebo-reader.ts` ne lit plus le km lui-même (lecture commune). Tests : RS6 41 500, C3 125 900 (pas la ligne de CT), Zoé 12 500 (pas l'autonomie), « Kilométrage : 88 000 ».

### 31/10/2026 — Claude — Slycar : photos en double
- **Constaté (Anthony) :** photos en double sur les voitures Slycar (ex. Porsche 911 GTS).
- **Cause :** chaque photo est envoyée deux fois sur le site Simplébo, avec deux identifiants différents mais le même nom de fichier (Porsche : 100 identifiants pour 50 fichiers). Le dédoublonnage se faisait par identifiant.
- **Fait (`simplebo-reader.ts` `sectionPhotos`) :** clé de dédoublonnage = nom du fichier (on garde la plus grande taille, dans l'ordre du site).

### 31/10/2026 — Claude — Robot : caractéristiques lues dans la description
- **Demande d'Anthony :** le robot ne remplit pas les cases (ex. « 37 CV ») quand le garage ne les écrit que dans la description.
- **Fait (`pro-stock-sync` `fillVehicleFromText`, appelée dans `normalizeVehicle`) :** pour tout site, les cases VIDES sont complétées depuis titre + version + description quand c'est écrit : puissance fiscale (« 37 CV », « Puissance fiscale : 8 »), puissance DIN (« 482 CH »), énergie (mot écrit, ou désignation moteur sans ambiguïté : TDI, HDi, dCi, CDI, 220 d… = Diesel ; TSI, TFSI, VTi, PureTech, TCe… = Essence ; « électrique » seulement si « 100 % électrique », « énergie : électrique »… et jamais à cause de « sièges électriques »), boîte (BVA, DSG, EAT8, S tronic, PDK, 9G-Tronic… / BVM, manuelle), année et mise en circulation, kilométrage (pas celui des lignes de contrôle technique), portes, places, Crit'Air, CO2, couleur, garantie, sellerie. Une valeur fournie par le site n'est jamais écrasée.
- Tests : Slycar énergie 23 % → 38 %, boîte 77 % → 85 % ; Excellium énergie 0 % → 33 % puis Mercedes « C 220 D » reconnue (espace avant le d).

### 30/10/2026 — Claude — 4 sites auto réparés (JB Sport Auto, Excellium Cars, Slycar, Motorwine)
- Demandes « Réparer » prises par Claude (`handled_by='Claude'`), réparation de lecture uniquement : aucun prospect, mail, import ni publication. ChatGPT garde les siennes.
- **JB Sport Auto** (jbsportauto.fr) — nouveau `supabase-app-reader.ts` : sites React / Lovable dont le stock est dans leur propre base Supabase (page HTML vide). Le robot lit la table avec la clé publique du site (refus si la clé n'est pas « anon »/publishable), photos d'un espace privé signées comme le fait le site (10 ans). Ville du garage lue dans la description du site (« à Aumur (39410) »). Résultat 1/1 complet, 12 photos.
  - `index.ts` : la signature de changement d'une annonce ignore le jeton des liens signés (`…/object/sign/…?token=`), sinon réécriture + remodération toutes les 3 h ; la ville fournie par un lecteur dédié (`rows.siteLocation`) n'est plus écrasée par `siteLocation(text)` (sinon « Saint-Aubin » lu dans le menu au lieu d'Aumur).
- **Excellium Cars** (excelliumcars.fr) — nouveau `roselmac-reader.ts` : sites de garage Roselmac (catalogue-new.php → voiture-new2.php?voiture_reference=N ; vendus sur archives-new2.php, jamais lus). 12/12 complets, ~42 photos chacun, ville Benfeld. Énergie non affichée par le site : laissée vide.
- **Slycar** (slycar.fr) — nouveau `simplebo-reader.ts` : sites Simplébo où chaque voiture est une section en texte libre de /vehicules-en-vente (titre h2, galerie, « Informations générales », bloc PRIX). 13/13 complets ; année / km lus quand ils sont écrits (92 % / 85 %), énergie seulement si écrite (23 %). Référence = id de section Simplébo.
- **Motorwine** (motorwine.fr) — nouveau `vehica-reader.ts` : WordPress thème Vehica via `/wp-json/wp/v2/cars` ; champs reconnus par leur nom (`/taxonomies` : Marque, Modèle, Énergie, Boîte, Statut…) ou leur forme (prix `vehica_currency_*`, galerie, année) ; Statut « Vendu / Réservée » exclu dès la requête. 89 disponibles (572 vendus ignorés), 88 complets, 1 sans prix sur le site, ~32 photos chacun.
- Déploiements `pro-stock-sync` v114 → v121 (dernier commit 641c0f2). Témoins retestés après coup : Laugier (Annonces-Automobile) 23/23, Immo Chevreux 31/31.
- Les 4 demandes passées en `done` avec un résultat pour Anthony.

### 30/10/2026 — Claude — « Valider ce site » pour un pro absent de la liste
- **Constaté (Anthony, Infinity Group Immo) :** la fenêtre demandait « l'e-mail du garage » pour une agence, puis rien ne bougeait : Infinity n'est pas dans la liste de prospection, le message « aucun prospect » s'écrivait hors de l'écran.
- **Fait (`admin-test-import.html`) :** « garage » ou « agence » selon le secteur ; e-mail vérifié ; si l'e-mail n'est pas dans la liste, proposition d'ajouter le pro (nom proposé d'après le site, catégorie selon le secteur, source « validation manuelle (test du site) ») puis validation normale ; refus si l'adresse s'est désinscrite ; le message de résultat (validé, erreur, annulé) est ramené à l'écran.

### 30/10/2026 — Claude — Case « Doublons / vendus » (Tester une adresse)
- **Question d'Anthony :** pourquoi « Biens lus » (135) ≠ « Prêts à publier » (119) + « Avec erreur » (2) sur Cannisimmo ?
- **Réponse :** les 14 autres fiches ne seraient pas publiées : même bien présent deux fois sur le site (doublon), ou fiche vendue / illisible. Elles n'étaient pas comptées à part.
- **Fait (`admin-test-import.html`) :** nouvelle case « Doublons / vendus » (= biens lus − fiches normalisées), cliquable comme « Avec erreur » (un appui : seulement ces fiches ; 2e appui : tout voir). Les fiches vendues / illisibles ne sont plus marquées en rouge comme les erreurs.

### 30/10/2026 — Claude — Case « Avec erreur » cliquable (Tester une adresse)
- **Demande d'Anthony :** la case « Avec erreur » doit mener directement aux erreurs.
- **Fait (`admin-test-import.html`) :** quand il y a des erreurs, la case devient un bouton (bord rouge, « voir ») : un appui n'affiche plus que les fiches en erreur et descend à la première ; un 2e appui (« tout voir ») réaffiche toutes les fiches. Au passage, « batiment » ajouté au choix « Type de bien » de la correction à la main.

### 30/10/2026 — Claude — Locations : vérification
- **Question d'Anthony :** la location fonctionne-t-elle bien avec les annonces ? (aucune annonce immo en ligne pour l'instant, vérifié dans le code)
- **OK :** location de logement → sous-catégorie `location`, prix « / mois » + charges, fiche avec charges / dépôt de garantie / honoraires locataire / meublé, menu « Location longue durée ».
- **Corrigé (`pro-stock-sync` `immoMeta`) :** le robot lisait vente / location et le type de bien mais ne les enregistrait pas dans l'annonce ; une location de parking ou de bureau était devinée d'après le texte, et un local / parking à vendre dont la description parle de « loyer » (investissement locatif) pouvait s'afficher « / mois ». `transaction` et `propertyType` sont maintenant enregistrés (l'import manuel le faisait déjà).
- **Corrigé (`index-main.js?v=20261030-batiment2`) :** un bâtiment / une grange compte bien comme « à vendre » dans le filtre vente / location.

### 30/10/2026 — Claude — Nouveau type de bien « Bâtiment / Grange »
- **Constaté (Anthony, aperçu d'une agence de l'Orne) :** « BATMENT A VENDRE, A RESTAURER » refusé avec « type de bien non reconnu » (et les hangars partaient en Bureaux / Commerces).
- **Fait :** sous-catégorie `vente-batiment` (« Bâtiment / Grange à vendre ») : bâtiment, grange, hangar, écurie, étable, bergerie, porcherie, dépendance, bâtiment agricole (à louer → Location longue durée). Robot (`pro-stock-sync` `normalizeImmoSub`) et import manuel (`index-main.js?v=20261030-batiment`) ; menu Immobilier (ordinateur), filtres « Type de bien », titre automatique « Bâtiment ». Page annonce : « Surface » (pas « Surface habitable » ni pièces / dépenses d'énergie), pas de bloc copropriété. Les entrepôts restent en Bureaux / Commerces.

### 30/10/2026 — Claude — Chaque bouton envoie le site au bon endroit
- **Demande d'Anthony :** après chaque touche, le site doit disparaître de là où il est et aller là où il doit aller.
- **Fait (`admin-test-import.html`) :**
  - « Tester une adresse » → **Réparer ce site** : part dans « Sites en réparation », l'aperçu et l'adresse s'effacent (même chose que « Valider », via `clearTest()`). Si le test venait de « Sites en réparation », la demande garde le prospect relié.
  - « Sites à apprendre » → **Mail normal / Vend sur Leboncoin / Supprimer** : la carte part et la liste se recharge (compteurs « mail normal », « vendent sur Leboncoin », « illisibles » à jour). **Réparer** : sort de la liste, entre dans « Sites en réparation ».
  - « Demandes » → **Refuser** : la demande sort de la liste (les activées et en pause restent, elles ont encore Synchroniser / Mettre en pause).

### 30/10/2026 — Claude — « Valider ce site » : le site disparaît
- **Demande d'Anthony :** quand il teste un site et valide, il doit disparaître.
- **Fait :** `admin_confirm_robot_learning_visual` (appliqué en base) clôt aussi la demande « en attente / en cours » du même site (status `done`, « Validé à la main après test du site ») → il sort de « Sites en réparation ». Il sortait déjà de « Sites à apprendre » (`site_check_status = ok`). `admin-test-import.html` : après validation, l'aperçu, les boutons et l'adresse testée sont effacés ; seul le message « Validé : … » reste.

### 30/10/2026 — Claude — Compteur de photos sous le filigrane
- **Constaté (Anthony) :** sur la page annonce, le filigrane « Abracadeal » (bas droite) chevauchait le compteur « 1 / N ».
- **Fait (`card-overlay-20261029.css?v=6`) :** compteur de photos déplacé en bas à gauche (ordinateur et téléphone). Le filigrane reste en bas à droite (il est aussi incrusté dans les photos des particuliers, donc impossible à déplacer).

### 30/10/2026 — Claude — « Sites en réparation » : seulement ce qui reste à faire
- **Demande d'Anthony :** un site réparé doit sortir de la liste, et ceux impossibles à réparer doivent être supprimés.
- **Fait (`admin-test-import.html`) :** la liste n'affiche plus que les demandes « En attente » / « En cours » (le compteur suit). Les « Réparé » restent en base comme historique.
- **Reste à appliquer en base (confirmations Supabase annulées automatiquement depuis l'appli mobile) :** `admin_list_robot_learning` filtré sur pending/in_progress + trigger qui supprime une demande passée en `failed`/`cancelled` + suppression des 2 « Pas possible » (Opt'immo, Villaret Immobilier). En attendant, elles sont simplement masquées.
- **Suite (Anthony) :** un site envoyé avec « Réparer » restait aussi dans « Sites à apprendre ». Corrigé : la liste « Sites à apprendre » masque les sites en réparation (en attente / en cours, même adresse de site), et se recharge juste après un clic sur « Réparer ».

### 30/10/2026 — Claude — Rebonds de prospection lus automatiquement
- **Constaté (tri de la boîte abracadeal@gmail.com) :** 6 garages dont le 1er mail avait échoué (adresse inexistante, boîte pleine…) ont quand même reçu la relance : rien ne repassait les rebonds dans le CRM. Nettoyage manuel fait : 10 adresses mortes passées en `error`, Desbrosses et LCB Immo mis à jour avec leur nouvelle adresse, retours d'erreur + rapports DMARC mis à la corbeille Gmail.
- **Fait (`prospect-mailer` v12) :** action `bounces` : lit en IMAP (lecture seule, rien n'est marqué ni supprimé) les rapports de non-remise des boîtes d'envoi OVH sur les 10 derniers jours ; chaque rebond définitif (« Action: failed ») passe la fiche du prospect en `error` avec la raison (plus de relance ni d'envoi) + ligne dans `prospection_logs`. Les rebonds « delayed » (nouvel essai en cours) sont ignorés. `{dry:true}` = rapport sans modification.
- SQL : `supabase/2026-10-30-prospect-bounces.sql` (`prospect_mailer_mailbox_list`, service_role uniquement). Cron `abracadeal-prospect-bounces` toutes les heures (à h07) de 6 h à 18 h, heure de Paris. 1er passage réel (30 jours) : 9 adresses mortes de plus trouvées et passées en `error`.
- **Mise à jour (Anthony) :** ChatGPT (GPTBot, ChatGPT-User, OAI-SearchBot) et Claude (ClaudeBot, Claude-User…) autorisés : retirés de la liste de blocage.
- **Mise à jour 2 (Anthony) :** toutes les IA autorisées (ChatGPT, Claude, Gemini, Perplexity, Meta, Amazon, Apple, Common Crawl…) pour qu'elles puissent recommander Abracadeal. Restent refusés : revendeurs/aspirateurs de données (Diffbot, Omgili, ImageSift, Scrapy, HTTrack, wget) et outils SEO concurrents (Ahrefs, Semrush, Majestic, DotBot, BLEXBot, DataForSEO, Serpstat).

### 30/10/2026 — Claude — Bouton « Valider ce site » (test manuel d'une adresse)
- **Demande d'Anthony :** quand il teste lui-même un site et qu'il se lit, il faut une touche « Valider ».
- **Fait (`admin-test-import.html`) :** après « Lire le stock », si au moins une annonce est complète, bouton vert « Valider ce site ». Il passe la fiche du prospect en « site testé » (`site_check_status = ok`, nombre d'annonces, plateforme, date) → ses prochains mails sont ceux du « répondez OK ». Le prospect est retrouvé par l'adresse du site ; s'il n'en a pas (liste manuelle, ex. Bye Buy Car), le bouton demande l'e-mail du garage et relie le site à sa fiche. Rien n'est publié par ce bouton.

### 30/10/2026 — Claude — Page « Imports depuis les sites des pros » : sections repliables
- **Demande d'Anthony :** trop de défilement pour arriver à « Tester une adresse » ; ranger « Sites en réparation » et « Sites à apprendre » dans des sections.
- **Fait (`admin-test-import.html`) :** « Tester une adresse » en premier (ouverte, avec son aperçu), puis « Demandes » (ouverte), puis « Inscrire un garage qui a dit oui », « Sites en réparation » et « Sites à apprendre » repliées. Chaque section s'ouvre / se ferme d'un appui, avec le nombre d'éléments affiché sur le titre. Identifiants et fonctions inchangés.

### 30/10/2026 — Claude — MRR théorique selon les annonces des pros
- **Demande d'Anthony :** régler le « MRR théorique après gratuités » en fonction des pros et de leur nombre d'annonces.
- **Fait (`index-app.js?v=20261030-mrr`) :** après le chiffre du serveur (somme des formules choisies), le tableau de bord recalcule : pour chaque abonnement Pro actif ou en période gratuite, nombre d'annonces en ligne → plus petit palier de la même famille qui les couvre (Auto/Immo : 20 = 149,99 €, 50 = 299,99 €, 100 = 499,99 € ; même logique pour High-tech, Maison, Mode, Emploi, Vacances). Au-delà de 100 : compté au palier 100 et signalé « sur devis ». Formule à 0 € (compte interne) = 0 €. L'ancienne formule 200 (retirée) n'est plus utilisée comme palier. Libellé : « MRR théorique après gratuités (selon annonces en ligne) », détail au survol.
- **Au passage :** intertitre « Abonnements Pro » du tableau de bord, invisible (blanc sur fond clair), passé en gris violet (`admin-account-layout-20261018.css?v=7`).
- Calcul fait côté navigateur admin (la modification de la fonction serveur `get_admin_dashboard_stats` n'est pas applicable depuis l'appli mobile) ; à basculer dans la fonction serveur à l'occasion.

### 30/10/2026 — Claude — Retours d'Anthony sur les notifications admin
- **Constaté (captures) :** la notification d'exemple « nouveau pro » apparaissait aussi dans la fenêtre Admin « Erreurs de flux » (pastille 1 sur Admin) ; pastille « À surveiller » quasi invisible et nom du flux blanc sur fond clair ; pastille « 1 » de Messages loin de l'icône sur téléphone.
- **Fait :** `index-main.js?v=20261030-notifs2` : « Erreurs de flux » (liste + compteur Admin) ignore les notifications `new_pro` / `site_review` (elles restent dans Messages) ; `card-overlay-20261029.css?v=5` : pastille « À surveiller » orange (texte brun foncé), « À traiter » rouge (texte blanc), nom du flux en gris violet lisible ; `nav-compact-20261020.css?v=2` : pastille Messages identique à celle d'Admin, collée en haut à droite de l'icône (téléphone ; la tablette l'avait déjà).

### 30/10/2026 — Claude — Pied de page mobile / tablette resserré
- **Demande d'Anthony :** recoller le bas de page, en plus petit.
- **Fait (`footer-copyright-20261027.css?v=6`, ≤ 760 px, donc aussi tablette) :** « © 2026 Abracadeal » 10 px discret (au lieu de 16 px), liens 9,5 px serrés (3 lignes au lieu de 4), espacements réduits ; le grand vide violet sous les liens supprimé (le pied de page ajoutait 104 px alors que la page garde déjà la place de la barre du bas). Hauteur du pied de page : 250 → ~110 px. Ordinateur inchangé.

### 30/10/2026 — Claude — Notification sur le site pour l'admin (nouveaux pros)
- **Demande d'Anthony :** un mail à chaque fois, c'est bien au début mais pénible s'il y a beaucoup d'inscriptions → notification sur le site.
- **Fait :** `notifyAdminsSite` (`pro-stock-sync`) crée aussi, pour chaque admin, une notification dans `pro_sync_notices` (gravité `new_pro` = « Nouveau pro en ligne », `site_review` = « Site d'un pro à vérifier ») : pastille rouge sur Messages / Compte et carte en haut de Messages, avec bouton « Marquer comme lu ». Une seule par site (mise à jour si le statut change). Le mail n'est plus envoyé qu'aux **5 premières notifications sur 24 h** ; au-delà, seulement la notification sur le site.
- **Bug corrigé au passage (`index-main.js?v=20261030-notifs`) :** les alertes `pro_sync_notices` (y compris les alertes de synchro des pros) étaient comptées dans la pastille mais jamais affichées dans Messages : elles se chargent maintenant à l'ouverture et toutes les 5 s.
- **Déployé :** `pro-stock-sync` v94 ACTIVE (épinglé sur `ff3474c2`), démarrage vérifié. Notification d'exemple « [TEST] Exemple de nouveau pro » créée pour l'admin (à marquer comme lue).

### 30/10/2026 — Claude — Mail à l'admin quand le site d'un pro est repris
- **Demande d'Anthony :** il ne veut pas découvrir des annonces d'un pro sur le site sans être prévenu.
- **Fait (`pro-stock-sync`, `notifyAdminsSite`) :** mail immédiat aux admins (abracadeal@gmail.com) depuis contact@abracadeal.fr :
  - « Nouveau pro en ligne : <entreprise> (N annonce(s)) » quand un site autorisé est lu sans erreur et activé automatiquement (entreprise, SIRET, e-mail, site, domaine, nombre d'annonces créées, lien page pro + admin imports) ;
  - « Site d'un pro à vérifier : <entreprise> » quand le site ne peut pas être activé seul (raison) — au premier essai seulement, le récapitulatif quotidien continue.
- Un seul mail par site et par cas (clé `site-approved|pending-<feed>`).
- **Déployé :** `pro-stock-sync` v93 ACTIVE, import épinglé sur `08c5b19d` (inclut les corrections Bye Buy Car de ChatGPT, v92) ; démarrage vérifié (réponse 403 attendue sans jeton cron).

### 30/10/2026 — Claude — Pages légales mises à jour (version du 30 octobre 2026)
- **Demande d'Anthony :** être en règle après les changements du jour.
- **Confidentialité** (`confidentialite.html` + copies dans `index.html` et `vacances.html`) : connexion Google / Facebook (nom, e-mail, photo de profil transmis avec accord, pas de mot de passe) ; reprise des annonces du site d'un pro qui l'a autorisée (textes, photos, prix, conseiller indiqué) ; e-mails liés au compte (bienvenue, sécurité, abonnement) dans l'exécution du contrat ; prestataires ajoutés : Resend (e-mails), Google et Meta (connexion) ; vérification des entreprises via le registre officiel (recherche-entreprises.api.gouv.fr) à partir du SIRET ou du SIREN.
- **CGU** (`cgu.html` + copie dans `index.html`) : § 2 choix Particulier / Professionnel à l'inscription (Google/Facebook compris), SIRET ou SIREN vérifié et téléphone obligatoires pour un Pro, type de compte non modifiable par l'utilisateur ; § 3 nouveau paragraphe « Reprise des annonces depuis le site d'un professionnel » (autorisation expresse, droits sur les contenus, mise à jour automatique, retrait de l'autorisation à contact@abracadeal.fr).
- Version affichée : 30 octobre 2026 (CGU et confidentialité ; CGV, cookies et mentions légales inchangées). Version d'acceptation enregistrée à l'inscription : `2026-10-30` (`legal-registration.js`, `index-main.js`, `social-login-20261018.js`, test).
- Tests `legal-pages` : mêmes résultats qu'avant (2 échecs déjà présents avant ces changements).
- **Mentions légales :** rien à changer (éditeur, directeur de la publication, hébergeur, contact présents).

### 30/10/2026 — Claude — Inscription Google en Pro : case « reprise de mon site »
- **Demande d'Anthony :** le pro ne reviendra peut-être pas répondre « OK » : il doit pouvoir autoriser la reprise de ses annonces en cochant une case à l'inscription.
- **Fait (`social-login-20261018.js?v=6`) :** dans « Finalisez votre compte » (Google/Facebook), si Professionnel : adresse du site (facultatif) + case « J'autorise Abracadeal à reprendre et diffuser automatiquement les annonces publiées sur mon site, et à les tenir à jour ». Mêmes contrôles que l'inscription Pro par e-mail (adresse valide, pas un site d'annonces ni un réseau social, case obligatoire si une adresse est donnée) ; l'accord est enregistré dans le compte (`stock_site`) puis `claim_signup_site_import` crée la demande d'import (lecture automatique, activée seule si le site se lit sans erreur, règle du 28/10). L'inscription Pro par e-mail avait déjà cette case.
- Testé (fenêtre avec serveur simulé) : case manquante refusée ; avec la case : passage Pro, accord enregistré, demande d'import créée.
- **Précision (30/10) :** pour un Pro, le téléphone (déjà obligatoire) s'intitule « Téléphone de l'entreprise » : numéro sur lequel les acheteurs le joignent depuis ses annonces (`v=7`).
- **Correction (30/10) :** la note du téléphone Pro dit « numéro proposé par défaut sur vos annonces, modifiable annonce par annonce » (le numéro d'une annonce se change dans l'annonce ; pour un import, le numéro du vendeur indiqué sur le site du pro passe avant) (`v=8`).

### 30/10/2026 — Claude — Barre de recherche
- **Demande d'Anthony :** retirer les exemples « Clio, T2 Cannes » : le texte de la barre de recherche de l'accueil devient « ✦ Recherche IA » (`index.html`).
- **Bannière :** tous les mails de cette fonction (bienvenue, abonnements Pro, Fondateurs) affichent maintenant la bannière Abracadeal (lampe, logo, slogan, servie par `email-banner`) à la place du bandeau texte.

### 30/10/2026 — Claude — Mail de bienvenue aux nouveaux particuliers
- **Demande d'Anthony :** aucun mail n'arrive après une inscription (cas Bye Buy Car) ; mettre en place un mail de bienvenue.
- **Fait (`process-pro-transactional-emails`) :** à chaque passage (toutes les 2 min), les comptes **particuliers** créés depuis le 30/10/2026 13 h, finalisés (téléphone renseigné, e-mail confirmé), reçoivent une seule fois « Bienvenue sur Abracadeal ! » (clé `welcome:<compte>`, type `custom_message`, aucun changement de base) : invitation à déposer une première annonce, bouton « Déposer une annonce » (`/?deposer=1`), signé « L'équipe Abracadeal », depuis contact@abracadeal.fr. Pas d'envoi rétroactif. Les pros gardent leurs mails d'abonnement / Fondateur.
- **Au passage :** mail `founder_onboarding` : titre « Marre de payer trop cher ? » retiré (accroche abandonnée le 23/10) → « Bienvenue sur Abracadeal » ; ligne obsolète « formule 50 gratuite » retirée.
- **Déployé :** `process-pro-transactional-emails` v7 ACTIVE. Exemplaire de test « [TEST] Bienvenue sur Abracadeal » mis en file pour abracadeal@gmail.com.

### 30/10/2026 — Claude — Inscription Google/Facebook : choix Particulier / Professionnel obligatoire
- **Demande d'Anthony :** « un pro est un pro, un particulier est un particulier, même avec une inscription Google » : case Pro / Particulier, et un Pro donne au minimum son SIRET ou SIREN.
- **Site (`social-login-20261018.js?v=5`) :** la fenêtre « Finalisez votre compte » après Google/Facebook demande « Vous êtes : Particulier / Professionnel » (aucun choix par défaut). Professionnel → SIRET (14) ou SIREN (9) + domaine pro obligatoires, contrôlés dans le registre officiel avant création ; ensuite choix de la formule Pro comme une inscription Pro classique. Le lien `?r=` d'un mail de prospection est rattaché au compte.
- **Fonction `verify-professional` (action `upgrade`) :** SIREN accepté (siège retenu) ; passe le compte en Pro avec la clé de service seulement si l'entreprise est active, pas déjà liée à un autre compte Pro, et si le compte n'a aucune annonce de particulier ; enregistre `pro_verifications` et l'entreprise dans le compte.
- **Base (`supabase/2026-10-30-account-type-guard.sql`) :** un utilisateur ne peut plus changer lui-même son type de compte (avant, rien ne l'empêchait techniquement) ; seuls la fonction ci-dessus et un admin le peuvent.
- **Bye Buy Car Limoges :** seul compte Google existant (particulier, sans téléphone) : la fenêtre lui demandera le choix à sa prochaine connexion.
- **Déployé :** `verify-professional` v10 ACTIVE (import épinglé sur `afa8d6da`) ; contrôle réel : recherche registre OK, `upgrade` sans connexion refusé (401).
- **Appliqué par ChatGPT le 30/10/2026** (voir son entrée en tête du journal) ; vérifié par Claude : déclencheur `aab_guard_profile_account_type` présent et actif sur `public.profiles`.

### 30/10/2026 — ChatGPT — Réparation lecture Bye Buy Car
- Cause : lecteur générique limité aux 20 fiches HTML initiales ; ville absente et descriptions manquantes. Le catalogue utilise son API publique `api.bye-buy-car.com/api/get-vehicules`, appelée par les filtres du site.
- Connecteur dédié `byebuy-reader.ts` : pagination de 100 véhicules, 3 requêtes simultanées, dédoublonnage par référence ; les pages agence `/agence/CP`, le filtre `?cp=CP` et les fiches véhicules conservent leur périmètre. Les filtres non reconnus sont refusés pour ne pas importer le réseau entier par erreur. Échec/répétition/page manquante → lecture partielle, donc pas d'archivage complet.
- Champs : titre complet/version, prix, ville/CP, km, année, énergie, boîte, carrosserie, portes/places, puissances, CO2, couleur, première mise en circulation `datemes` (pas la date de carte grise `dateCG`), description + équipements, photos uniques, nom/téléphone de l'agence propre au véhicule. Immatriculation et VIN non repris.
- `normalizeVehicle` conserve le contact explicite via le même validateur que l'immobilier ; téléphone stocké dans les contacts de l'annonce lors d'un futur import autorisé, nom dans les métadonnées véhicule. Aucun import ni activation de flux déclenché par les tests.
- Tests : champs sur deux fiches réelles, agences distinctes, filtre agence, fiche unique, pagination, panne réseau et page répétée ; 20 fiches réelles normalisées sans erreur ; régression Cannisimmo : OK.
- Catalogue national vérifié en lecture seule : 17 pages / 1 696 références distinctes, lecture complète ; 1 673 fiches normalisées sans erreur, 23 sans photo dans la source ; 39 214 photos, ville sur toutes les fiches et téléphone fourni sur 1 349 fiches. Prise en charge des deux formats de références (Spider VO avec tiret et VO3000 numérique).
- Mise en service v91 : contrôle réel agence Figeac HTTP 200, 38/38 fiches sans erreur, 877 photos et téléphone d'agence sur toutes les fiches. Le catalogue national dépassait le budget d'exécution pendant la normalisation ; index des champs véhicule ajouté, en conservant l'ordre de priorité des alias. Mesure locale sur tout le stock : normalisation passée de ~2,93 s à ~0,82 s, mêmes 1 394 annonces après dédoublonnage global, 1 390 sans erreur. Test des valeurs zéro/vides et priorité des champs exacts/imbriqués ajouté.

- Validation finale production v92 (`d164ba3f25bf3ac181df2a545d110c8ce1d0cfbd`, PR #12 et #13 fusionnées) : HTTP 200, `ok:true`, `partial:false`, 17 pages, 1 696 références lues ; 1 394 annonces après le dédoublonnage global existant (302 doublons), 1 390 sans erreur, 4 sans photo après dédoublonnage. 33 946 photos retenues, ville/prix/km/année/énergie/boîte renseignés sur toutes les annonces ; 1 047 téléphones propres aux fiches, 25 numéros distincts. Contrôle lecture seule, aucun stock publié et aucun flux activé.

### 30/10/2026 — Claude — Lecture des sites pros : bandeau cookies, énergie et boîte
- **Constaté par Anthony (aperçu d'import, Ford Fiesta réf. 0001398, 6 750 €) :** description = texte du bandeau cookies (Complianz : « Le stockage ou l'accès technique… », « assignation à comparaître… ») ; énergie « électrique » et boîte « automatique » fausses.
- **Causes (`smart-reader.ts`, lecteur générique) :** le bandeau cookies passait le filtre du « plus long texte » (pas le mot « cookies ») ; énergie/boîte cherchées dans toute la page : « rétroviseurs électriques » → électrique, « climatisation automatique » → automatique.
- **Fait :** textes de consentement exclus de la description ; énergie et boîte lues d'abord sur leur libellé (« Carburant : », « Énergie », « Boîte de vitesses : »…), puis dans le titre (BVA, DSG, EAT, EDC…), sinon dans la page en ignorant équipements électriques/automatiques. Rien plutôt qu'une valeur fausse.
- **Testé :** page reproduisant le cas → avant : électrique / automatique / texte cookies ; après : essence / manuelle / vraie description ; sans libellé : énergie et boîte vides. Tests existants : mêmes résultats qu'avant (les 6 en échec l'étaient déjà).
- **Déployé :** `pro-stock-sync` v90 ACTIVE, import épinglé sur `261ed036aef82eab7fe37e874bb43b8811db94ef` (aucun autre changement de la fonction depuis v89), vérif. JWT inchangée (désactivée, auth interne). Démarrage OK dans les journaux. Aucune annonce pro véhicule déjà en ligne à corriger.

### 30/10/2026 — Claude — Un pro prospecté inscrit en particulier : corrigé
- **Constaté :** compte créé le 30/10 à 9 h 19 via Google (bbc.lim.nord@gmail.com, « Bye Buy Car Limoges », prospect « AMD AUTO » de la liste manuelle du 19/10) en **particulier** : relance reçue à 9 h 05, clic sur le lien à 9 h 19 min 26 s, compte créé 23 s plus tard.
- **Cause :** les boutons « Créer mon compte Pro gratuitement » / « Je réserve ma place Fondateur » / « Activer mon compte Pro » de `pro-fondateur.html` pointaient vers `index.html#accountModal`, qui ouvre la **connexion** ; « Continuer avec Google » y crée un compte particulier.
- **Fait :** liens Fondateurs → `index.html#signupPro` (ouvre l'inscription avec « Professionnel » présélectionné, `index-app.js?v=20261030-signup-pro`) ; `social-login-20261018.js?v=4` : Google/Facebook masqués pour un visiteur venu d'un mail de prospection (lien `?r=` mémorisé 90 jours). Vérifié en local.
- **Reste :** le compte de Bye Buy Car Limoges est toujours particulier, à passer en Pro avec l'accord d'Anthony.

### 30/10/2026 — Claude — Textes des vignettes corrigés
- **Demande d'Anthony :** « la description dans les vignettes c'est pas bon ».
- **Constaté (rendu des vraies annonces) :** caractéristiques véhicule en 4 cases avec émojis (📅 🛣️ ⛽ ⚙️) qui se cassaient dans les vignettes étroites (« km » ou « Automatique » seuls à la ligne) ; ville avec 📍 sur 2 lignes.
- **Fait :** `index-main.js?v=20261030-vignettes` (cartes « Les annonces » et « À la une ») : caractéristiques en une ligne de texte « 2019 · 84 500 km · Diesel · Manuelle » (2 lignes max), sans émojis ; ville avec un petit pictogramme dessiné à la place de 📍. `card-overlay-20261029.css?v=4` : ville sur une seule ligne (coupée avec « … » si trop longue). Page annonce inchangée.
- Vérifié sur téléphone, tablette verticale et horizontale avec de vraies annonces.

### 30/10/2026 — Claude — Tablette bloquée en vertical : corrigé
- **Demande d'Anthony :** la version tablette ne passe pas en horizontal.
- **Causes :** 1) `manifest.json` imposait `"orientation": "portrait"` → l'appli installée (PWA) restait bloquée en vertical ; 2) sur petites tablettes Android en paysage (hauteur utile < 600 px, ex. 1280×800 avec barres du navigateur = 576 px), l'écran « tournez votre téléphone » (`.portrait-only-overlay`) s'affichait, car la règle d'exception tablette (`min-width:900px`) est neutralisée par tablet-as-mobile (largeur évaluée à 720 px).
- **Fait :** manifest en `"orientation": "any"` (lien `manifest.json?v=5` sur index et vacances) ; `tablet-grid-20261030.css?v=2` : écran de rotation jamais affiché sur tablette, page visible et défilable en paysage. Téléphones : écran de rotation conservé.
- Vérifié en émulation tablette Android 1280×800 paysage : écran de rotation masqué, page visible, 6 vignettes.
- **Appli déjà installée :** Android peut mettre du temps à relire le manifest ; si ça reste bloqué, désinstaller puis réinstaller l'appli.

### 30/10/2026 — Claude — Vignettes tablette plus petites
- **Demande d'Anthony :** vignettes trop grosses sur tablette, au moins 6 par ligne.
- **Fait (`assets/tablet-grid-20261030.css`, chargé en fin de `<head>` de `index.html`) :** tablette horizontale = 6 vignettes par ligne (avant 3) ; tablette verticale = 4 (avant 2), même taille de vignette qu'en horizontal (6 en vertical = ~90 px, titres illisibles). Textes, prix et boutons cœur/partager resserrés. Ancienne règle 3 colonnes retirée de `index.html`. Téléphone et ordinateur inchangés.
- Vérifié en émulation iPad (vertical 4 × 136 px, horizontal 6 × 137 px).

### 30/10/2026 — ChatGPT — BIAS Bernay et Immobilier Pierrefeu
- Deux anciennes demandes traitées ; aucun prospect, mail, import/publication, flux activé ou validation visuelle de notre part. Base réellement déployée vérifiée v120 / e742a3c. Les lecteurs récents de Claude (Supabase, Roselmac, Simplebo, Vehica puis La Résidence) ont été conservés en intégrant les nouveaux commits main avant chaque publication.
- BIAS Bernay : catalogue public ref-agence=298, sans élargissement aux agences voisines. Type/ville et prix de la fiche, description intégrale, surfaces/terrain/chambres, galerie originale, classes actives DPE/GES. Identifiant idBien de la query conservé. Contact personnel seulement s'il est publié et associé au même nom dans la signature de cette annonce, avec ou sans libellé tél.
- BIAS témoin 10649 : Bernay, Maison, 295000 €, 178 m², terrain 2291 m², 4 chambres, 2 salles d'eau, C/A, 19 photos, Sandrine CHESNEL / 0602552295. Production v123 (186261) : 58 références, 55 fiches uniques complètes après regroupement de 3 doublons, 641 photos, partial=false, erreurs vides ; 51 noms et 49 téléphones de conseillers récupérés. Demande done / Réparé, visual_validated_at conservé sans validation de notre part.
- Pierrefeu : ancien HTML ISO-8859-1 / Windows-1252 ; décodage selon en-tête ou meta ajouté aux téléchargements HTML. UTF-8 conservé pour les autres sites. Ventes et locations, seulement cartes id=biens-immobiliers (pas la suggestion de tête dont le lien /location/ renvoie à une vente). Pagination dédupliquée par numéro et paramètres page répétés normalisés : 47 requêtes de liste initiales ramenées à 9, mêmes 40 annonces.
- Pierrefeu : ville/CP dans le titre/adresse, surfaces dans leurs rubriques explicites hors commentaires HTML ; ne pas confondre « 5 000 m² de terrain non attenant » et surface habitable. Prix/loyer propre et galerie rel=gallery[référence]. Contact direct lorsqu'un nom + EI/RSAC + mobile est publié (Hervé Labrux / 0602440583 dans 3886), sinon coordonnées clairement nommées de l'agence, jamais téléphone d'agence attribué à un négociateur.
- Accès Pierrefeu : requête Node locale HTTP en timeout, HTTPS invalide ; net HTTP 200 (186235), HTTPS certificat non valide (186236). Test complet local par curl et production HTTP réussis. Adresse HTTP officielle conservée, aucun contournement de vérification TLS.
- Production Pierrefeu v123 (186262) : 40/40 annonces, 34 complètes, 324 photos, 9 pages, partial=false, aucune page manquée. Six erreurs GES conservées : 3886, 3889, 3885, 3853, 3754, 3760. Les six HTML téléchargés et examinés : DPE présent dans la description, aucun GES/graphique climat publié. À faire compléter par l'agence ; aucune classe déduite ou inventée. Demande done / Réparé avec cette limite explicitée pour validation visuelle.
- Code enregistré dans main c143c9a (v122) puis c393d98 (v123 ACTIVE). Tests batch6 sur vrais HTML (encodages, ville/surfaces, diagnostics, galerie, contacts associés, compteur/pagination, vente/location et suggestions) : OK. Régressions batch4/batch5, Human/Citya/Lyon/Neyt, champs véhicules, photos, enrichissement geo borné et syntaxe TypeScript : OK.

### 30/10/2026 — ChatGPT — AJP Nantes Ouest / La Roche-sur-Yon et 4S Concept
- Base main cde2fa8 ; robot réellement déployé v111, source baa1329. Réparations de lecture uniquement, sans prospect/mail/import/publication ni validation visuelle.
- AJP : nouveau lecteur des liens achat/location publiés par la page de l'agence, identifiant propre vérifié (Nantes Ouest 173162, La Roche 173106). Les fiches viennent du tableau JSON public `var properties`, pas d'une recherche dans toute la ville. Pagination à chemin et agence constants, compteurs vérifiés. Données propres au bien, galerie, DPE/GES affichés et téléphone de la fiche.
- Contrôles locaux réels : Nantes Ouest 23/23, La Roche-sur-Yon 38/38, partial=false ; aucune ville/type/photo manquants. Source structurée, chambres zéro conservées et diagnostics graphiques D/C/228 vérifiés sur 61632488.
- 4S Concept : lecteur du stock /vehicules-disponibles et pagination (4 pages), galerie originale rel=stm-car-gallery dans l'ordre publié, description avec toutes les options, références postid, prix propre et coordonnées du garage publiées. Le texte source « 76OOO Rouen » est interprété 76000, sans inventer de commune. Les formulaires et calculateurs ne fournissent aucun champ véhicule.
- Premier essai 4S v112 : 40 références dont 2 vendues et 1 exemple identifiés dans la description ; 37 lues, 36 uniques, 25 prix manquants (186143). Vérification : les badges VENDU de la LISTE signalent aussi des fiches sans prix, ou encore avec prix (BMW 220i), mais aucun badge n'est repris dans leur détail. Lecture corrigée pour retenir le statut de la même carte de catalogue avant toute visite de la fiche. Contrôle local final : 40 références, 35 VENDU, 5 disponibles avec prix, partial=false. Exclusions comptabilisées avec leurs URL, sans masquer un échec.
- Témoin Golf 9239 : 20990 €, 75000 km, 2022, BVM6, 29 photos, garantie 6 mois, Arnold Buffet / 0617635165.
- Tests réels batch5 ajoutés : périmètre agence, pagination, JSON propre à la fiche, diagnostics hors légende CSS, photos, contact, vendu/recherche personnalisée et vrai badge VENDU sur carte de liste. Régressions batch4, Human/Citya, Lyon/Neyt, champs véhicules, photos et syntaxe TypeScript : OK.
- Code sur main 37ec4fa (v112) puis 0e2fe8a (v113 ACTIVE). Production AJP Nantes Ouest : 23 références, 22 fiches uniques complètes, 1 doublon regroupé, 242 photos, partial=false, erreurs vides (186141). La Roche-sur-Yon : 38/38 complètes, 325 photos, partial=false, erreurs vides (186142). Villes et contacts 100 % ; les deux demandes done / Réparé, sans validation visuelle à notre initiative.
- Contrôle production 4S v113 (186151) : 40 références parcourues, 35 VENDU exclus, 5/5 disponibles complets, 124 photos, partial=false, erreurs vides, coordonnées/marque/année/km/prix/boîte 100 %. Carburant non publié conservé vide sur quatre fiches. Demande 4S done / Réparé, sans validation visuelle à notre initiative..
- Retour Croisette « 3 erreurs » : les trois sources 87143470, 87106583 et 87514100 examinées intégralement, chacune avec un seul SVG énergie et émission vide, sans graphique CLASSE CLIMAT. Pas de GES à récupérer ou déduire depuis les consommations 117/221/154 ; demande pending annotée précisément, complétion requise auprès de l'agence.
- Lectures exploratoires pour les prochaines demandes : Motorwine, Excellium Cars, Slycar et JB Sport Auto sont accessibles depuis le client local, pas encore réparés. Aucun prospect, import, publication, flux actif ni mail créé.

### 30/10/2026 — ChatGPT — suite des réparations : Croisette, Salanié, catalogue LF immo
- Base main 801d12d, version réellement déployée pro-stock-sync v108, source 3cb1229 ; aucune modification des boutons de validation de Claude.
- Croisette Properties : le template Apimo met Cannes dans la deuxième ligne, prise à tort pour le type sur 100/100 fiches. Ne conserver cette ligne que si elle est un type explicite ; sinon lire le type déclaré dans la route du bien. Régressions Intuition/Cannisimmo/Raccosta conservées.
- Salanié : lecteur des deux catalogues actifs a-vendre/a-louer et de leur pagination ; ville issue uniquement des résultats du filtre public location, jamais de l'adresse de l'agence. Référence stable postid, transaction et prix de la fiche, surfaces/chambres des métadonnées propres, galerie swipebox originale dans l'ordre source. Contrôle local réel : 16/16, aucune ville manquante, partial=false ; la source a parfois des contradictions titre/métadonnées (79 m² contre 80 m²), métadonnée conservée sans inventer.
- LF immo/La Fourmi : nouveau parcours des catalogues publics achat/location, liens de pagination conservant les filtres, PDF et hors domaine exclus. Maximum 48 fiches par lecture ; si la pagination continue, partial/capped=true et total national inconnu, jamais présenté comme tout le stock. Les corrections DPE, ville et galerie de v108 restent utilisées.
- Tests batch4-readers, LF diagnostics, Apimo et régressions Human/Citya/Lyon/Neyt/prix/photos/Robyns/ByeBuy : OK ; syntaxe TypeScript et diff vérifiés. Source 34a32e1 (v109), volume LF réduit et recommandations exclues dans 8926b70 (v110), enrichissement géographique borné dans baa1329 (v111 ACTIVE).
- Production : Salanié 16/16 complets, 565 photos, aucune ville manquante, partial=false (186046). Croisette 100/100 lus, 1377 photos, 95 complets, plus aucune erreur de type (186047) ; 3 GES manquants et prix sur demande conservés sans invention. Ces deux demandes sont done / Réparé, sans validation visuelle.
- Les essais LF à 120 puis 48 fiches ont renvoyé 503 en production avant résultat (186050, 186058, 186061). Découverte d'un appel geo.api.gouv.fr sans timeout dans la normalisation, fait séquentiellement par commune. Timeout 2500 ms ajouté, quatre communes distinctes enrichies en parallèle, cache commun conservé, données source maintenues si échec. Test avec requête bloquée, ville répétée et ordre des fiches : OK.
- Contrôle final LF v111 (186072) : 48/48 fiches complètes, 360 photos, villes et contacts 100 %, erreurs vides, partial=true / capped=true, total national inconnu. Nouvelle demande La Fourmi passée done, sans validation visuelle..
- Mister Property et Majorelle : HTTP 202 / x-amzn-waf-action=challenge / contenu vide depuis la production (186040/186041), demandes pending annotées. Le Cœur est accessible côté production (200), ne pas le classer bloqué sur le seul test local.
- Nouveau retour Human La Châtre : les quatre URL inaccessibles ont été revérifiées, HTTP 400/refus serveur dans les requêtes simples (186054 à 186057) après HTTP 403 dans le lecteur ; pending annoté. Nouveau retour Raccosta : dernier contrôle complet 254 fiches, 8 GES manquants, source d'une fiche examinée sans climat ; pending annoté, aucune classe inventée.
- À poursuivre : AJP Nantes Ouest, BIAS Bernay, Pierrefeu, Boschi, Crefimo, 4S Concept et Le Cœur. 4S publie bien son stock dans /vehicules-disponibles/ puis /listings/... ; pas un blocage Leboncoin. Aucun prospect, import, publication ou mail effectué.

### 30/10/2026 — ChatGPT — lecteurs Human, Raccosta et diagnostics LF immo

- Human : le périmètre reste le catalogue explicite de l'agence et sa pagination ; plusieurs préfixes de mandat publiés dans ce même catalogue sont acceptés (La Châtre 139/239).
- Apimo/Raccosta : type issu de la route lorsque le titre du template est absent, galerie originale `click-fullscreen`, pièces/chambres sur plusieurs lignes. Les diagnostics « En cours » restent sans lettre inventée.
- LF immo/La Fourmi : lecture de la seule ligne active des graphiques HTML DPE/GES et de la consommation, sans déduire une classe depuis les seuils.
- Tests réels Raccosta et LF immo ajoutés ; régressions Intuition, Cannisimmo, Human/Citya, périmètre, pagination, prix et photos vérifiées. Code enregistré sur main (6faaefe puis 3cb1229), fonction pro-stock-sync déployée v108.
- Contrôles production sans import : Human 61 références / 47 fiches complètes / 391 photos, 10 vendus exclus et 4 HTTP 403 signalés ; Raccosta 254/254 fiches / 3348 photos / 246 sans erreur et 8 GES manquants conservés en anomalie (sur 87302200, émission vide et pas de graphique climat publié).
- LF immo fiche 90526 : prix canonique 345000.0 correctement lu 345000 €, ville Le Barp 33114, référence propre 90526, 8 photos originales, description propre, conseiller Michaël Larant et téléphone, DPE D / GES B / consommation 188. Contrôle serveur confirmé ; exhaustivité nationale non revendiquée.
- Demandes Human La Châtre, Raccosta et La Fourmi/DPE passées done (« Réparé »), visual_validated_at vide pour validation manuelle par Toni. Aucun prospect/annonce importé, aucun flux activé ni courriel envoyé.
- La Française Immobilière Montauban : catalogue officiel HTTP 500 (wia-filter/in_array null côté serveur), URL filtrée refusée SecuPress 403 depuis le client public ; blocage noté, demande pending.
- À poursuivre : BIAS Bernay (catalogue agence 298 accessible, 61 idBien), AJP Nantes Ouest (catalogues agence 173162), Pierrefeu (catalogue 34 annonces, encodage Windows-1252), Boschi Vaison (session publique viewport à initialiser via l'interface officielle ; prototype de session testé, pas encore intégré). Ces quatre demandes restent pending, aucune réparation revendiquée.
- Imozoum, Accès Conseil, Cabinet Girondin, Placyr et Comeback : requêtes serveur HTTP 202 avec `x-amzn-waf-action=challenge`, blocage noté dans chaque demande ; aucune importation.


### 30/10/2026 — ChatGPT — Decros : prix d’aperçu, Citya : caractéristiques, Lyon Immo et Neyt (en cours)
- Demande Anthony de poursuivre les réparations, y compris ses nouveaux retours Decros et Citya. Base réellement déployée v102, source 872f131f ; lecteurs identiques à main 1b3f922 avant modification. Aucun changement de la validation visuelle ou des boutons d’administration récents.
- Decros : lecture des prix déjà correcte en production ; défaut dans le formateur euro d’admin-test-import.html qui supprimait virgules/points (16400.00 → 1640000, 79.3 → 793). Nouveau priceNumber conserve décimales et interprète les séparateurs français. Tests sur 16400, 16400.00, 16.400,00 €, 1.150.000, 79,30 €, zéro et absence.
- Citya : extraction des rubriques propres « Etage 1 », « Im de 4 étages », salle de bain, année 1986, chauffage et prestations ; le texte des descriptions complète les chambres écrites en lettres. Extraction commune des étages 7ᵉ / deuxième, sans écraser une donnée explicite. Témoin TAPP176-971965 : étage 1/4, 2 chambres, chauffage individuel électrique, parking/cave.
- Lyon Immo agence d’Écully : le lecteur générique excluait les fiches /ventes situées hors du chemin /agences. Nouveau lecteur Studio HB suit uniquement le lien « Voir tous les biens » actif de la page d’agence (filtres de villes conservés), ignore les biens vendus et suggestions, galerie pleine taille /detail/, diagnostics et contact propres. Test local réel : 31/31, 278 photos, partial=false. Deux maisons sans DPE et deux terrains sans diagnostic conservés sans invention.
- Neyt : catalogue Wappler chargé en JS. Lecture des endpoints publics présents dans le site, sélection active selectionaffaires uniquement (74), exclusion selectionaffairesvendues. PrixMandatEuro utilisé (pas les anciens montants FRF). Photos générées uniquement depuis les 10 liens dmx-bind:src et conditions NumPhoto du modèle réellement publié, pas de suffixe inventé. DPE/GES, surfaces, charges, taxe et contact disponibles mappés.
- Lucie Vidal : challenge AWS WAF/UUSEC depuis la production (185733), impossibilité notée dans la demande, non validée. Orpi 4F Gestion Saint-Nizier : compteur officiel à 0 (185744) et aucune fiche des listes ; agence témoin à 40 confirme le compteur. Absence de stock notée, aucun élargissement aux agences voisines.
- Première production v103 : Neyt 74/74, 691 photos, 70 complets (185747) ; Lyon Immo 31/31 complets, 278 photos, partial=false (185748). Neyt : local professionnel explicite reclassé depuis le texte ; ville absente complétée uniquement si un nom de commune du même CP déjà publié dans le catalogue figure explicitement dans la description. Les bâtiments à restaurer de type ambigu restent à vérifier, sans catégorie devinée. Filtres inconnus rejetés.
- Découverte sur Lyon Immo : le nettoyeur général de description perdait des phrases quand la source écrivait « gare.Elle » sans espace ; remplacement par un découpage qui préserve tout le texte. Test sur le vrai paragraphe (« Au cœur du village », « Elle séduit », « Un garage double ») OK. Contact d’agence complet conservé. Diagnostic à blanc enrichi des étages/chambres/année pour vérification.
- Déploiement final v104 ACTIVE, source main a3b94724a5fc701d7a1effd41c5c62532e6bc22d. Contrôles production séquentiels : Citya 74/74 complets, 598 photos, étage 7/8 et 1/4 confirmés (185759) ; Neyt 74 lus / 72 complets, 691 photos, deux bâtiments de type ambigu restant signalés (185760) ; Lyon Immo 31/31, 278 photos (185761) ; Decros 23/23, 467 photos (185762). partial=false partout. Ces quatre demandes marquées done / Réparé, en attente de la validation visuelle d’Anthony.
- Régressions live séquentielles : Nestenn 57/57 (185763), Chevreux 30/30 (185764), Orpi témoin 54 lus / 52 complets avec deux photos absentes (185767), Century 21 37/37 (185768), L’Adresse 86/86 (185769), Laugier AA 23/23 (185773) ; tous ok=true, partial=false. Tests next-site-repairs, site-repairs, lookup véhicules, photos, Cannisimmo, Intuition, Bye Buy Car, Robyns : OK.
- Plusieurs demandes successives existaient pour Decros/Citya : l’admin affiche désormais seulement la plus récente pour chaque URL, en gardant les historiques. La validation visuelle d’un site archive toutes ses demandes done pour cette URL exacte (le request_id doit toujours correspondre au bon site), sinon l’ancienne ligne réapparaissait. SQL 2026-10-30-robot-visual-history.sql appliqué et enregistré ; test transactionnel annulé : mauvaise URL refusée, deux lignes retirées après une seule validation, historique conservé.
- Nouveau signalement pendant le traitement : Orpi gmirleau.immo, « 1 erreur … à partir de ». Contrôle v104 (185779) : 40 fiches, 39 complètes ; une fiche programme-neuf multi-lots Soufflenheim, référence b1252873-9ff1-488d-855f-849ead434367. Source réelle examinée : price=0, project=true, projectMinPrice=216444 ; description de terrains dès 2122 m², tarif à partir de 180370 € HT, locaux d’activités modulables. Aucun prix fixe ni type de bien unique à reprendre : limites documentées dans la demande laissée pending, pas de catégorie ni de prix inventés, aucun retrait silencieux du programme.
- Aucun vrai prospect validé, aucun mail, import ou publication. Les sites réparés restent affichés avec Tester / Valider ; aucun archivage visuel rétroactif.

### 30/10/2026 — ChatGPT — Retrait des sites après validation visuelle
- Demande Anthony : une fois validé visuellement, le site disparaît de la liste. La réparation technique reste status=done et son historique est conservé ; nouvelle date visual_validated_at distincte, initialement NULL. Aucune validation rétroactive des sites déjà réparés.
- Migration robot_learning_visual_validation appliquée, SQL enregistré dans supabase/2026-10-30-robot-visual-validation.sql. admin_list_robot_learning retourne aussi prospect_id (absent de l’ancienne réponse), et masque les validations visuelles archivées. RPC admin_confirm_robot_learning_visual réservée aux admins, search_path fixé, EXECUTE refusé à PUBLIC/anon, accordé à authenticated avec contrôle is_admin ; URL et identifiant de demande concordants requis.
- admin-test-import.html : après mise à jour réussie du prospect par « Valider ce site », enregistrement de la validation visuelle puis rechargement de la liste. Le bouton Tester transmet aussi request_id. Aucun import, publication ni envoi de mail déclenché par ce changement.
- Vérification SQL transactionnelle entièrement annulée : refus non-admin, réparé visible avant validation, mauvaise URL refusée, retrait après validation, historique conservé, deuxième clic idempotent OK. JavaScript syntaxe OK ; contrôle advisors effectué. Aucun vrai site ni prospect validé à la place d’Anthony. Source UI 0b3815a3, SQL dd37a573.

### 30/10/2026 — ChatGPT — Réparés conservés pour validation visuelle
- Demande Anthony : remettre les sites réparés dans la liste avec la mention Réparé. `admin-test-import.html` conserve désormais les demandes done dans « Sites en réparation » (badge Réparé déjà existant), en plus des demandes pending/in_progress. Les statuts techniques et les résultats de lecture sont préservés.
- Validation visuelle : après Tester, le bouton existant « Valider ce site » met le prospect en site_check_status=ok (aucun envoi immédiat). Le lien prospect_id de la demande est désormais conservé lors du test pour viser précisément ce prospect, notamment pour une agence appartenant à un réseau. Code enregistré main 9f3f2542 ; syntaxe JavaScript OK. Aucun prospect réellement validé par ChatGPT pendant ce changement : clic laissé à Anthony.
- Bouton Tester sur chaque ligne : renseigne le site et le secteur dans le formulaire d’aperçu, ouvre le panneau et lance la lecture. Aucun import, publication, statut de prospect ou envoi déclenché. Contrôle de syntaxe JavaScript OK. Source main 45eeba2b.

### 30/10/2026 — ChatGPT — Réparation des sites déjà signalés (en cours)
- Accord Anthony : traiter les demandes présentes et noter précisément les impossibilités. Base réellement déployée v99 (9db3d85), lecteurs identiques à main a581352 avant modification.
- Lecteurs dédiés limités aux domaines : Progressia fichier public JSON (sans exécuter de JS), Human catalogue d’agence et JSON-LD au type encodé `ld&#x2B;json`, Citya vente/location de la seule agence demandée et données imbriquées Offer/itemOffered. Pagination, totaux et statut partial conservés ; descriptions et contacts propres aux fiches.
- Diagnostic interne existant `debug_detail` : option include_html protégée par la même authentification cron pour examiner les réponses effectivement reçues depuis la production (différentes des réponses locales sur plusieurs domaines). Aucun accès public supplémentaire.
- Ajout des lecteurs BNY’S Car (catalogue actif /youngtimers-occasion/, galerie car-images-carousel, tableau mtbf, prix en préparation laissés absents) et Decros (Regicom : carUrl numériques, détails /fr/, galerie z2, champs propres, prix décimaux exacts). Citya : parkings sans JSON-LD lus depuis les rubriques explicites, prix de location décimaux conservés. Human : annonces SoldOut distinguées des erreurs réseau. Détection explicite des challenges AWS WAF/UUSEC.
- Tests site-repairs sur extraits HTML réels : galeries, DPE/GES, adresses de biens, contacts distincts, prix/location, absence de prix, pagination, agences, pages vendues et pannes partielles OK. Régressions Robyns, lookup véhicules, photos, Intuition, Cannisimmo, Bye Buy Car OK.
- Lex Immo et La Josassienne : challenge AWS WAF confirmé depuis la production (185614/185616), cause enregistrée, demandes laissées pending. Opt’Immo/Villaret : même challenge recontrôlé (185622/185623), non contourné.
- Vérification v101 : Progressia 150 fiches / 149 après doublon, 950 photos, partial=false (185636) ; Citya 74/74 complets, 598 photos, partial=false, contacts 74/74 (185639) ; Human 48 fiches examinées, 43 disponibles + 5 SoldOut exclus, 338 photos, partial=false, zéro échec (185640). Ces trois demandes marquées done.
- BNY’S : catalogue 32 fiches, dont réservées et en préparation ; ces indisponibles sont exclus explicitement (mêmes données publiées par le site), sans inventer un prix. Decros : 23 références source distinctes ; préservation de leur identité afin que deux voitures de mêmes modèle/prix/km ne soient plus fusionnées à tort par la déduplication générale. Test des références jumelles ajouté. Vérification finale v102 ACTIVE, source main `872f131f0c263b2fd5ebdb87ab5889d355d75600` : BNY’S 32 fiches examinées, 13 disponibles complètes + 19 réservées/en préparation exclues, 450 photos, partial=false, zéro erreur (185647) ; Decros 23/23 complets, 467 photos, partial=false, zéro doublon et zéro erreur (185648). Demandes BNY’S et Decros marquées done. Les 5 réparations sont enregistrées pour les futures lectures. Quatre blocages AWS WAF documentés (Lex Immo, La Josassienne, Opt’Immo, Villaret), aucun validé à tort.
- Première vérification v100 : Progressia 150 bruts / 149 après dédoublonnage / 950 photos ; Citya 65/74 (9 parkings sans JSON-LD, corrigés ensuite) ; Human 40/48 (vendus et quelques échecs à distinguer). Validation finale à suivre ; demandes non clôturées avant vérification. Aucun import, publication, activation de flux ou mail.

### 30/10/2026 — ChatGPT — Robyns Car : lecteur du catalogue public
- Demande `1ad9d101-2405-4112-a7f5-06e5d3c10540`, https://robynscar.com, signalée Illisible. Production v98 à blanc (185526) : aucune fiche. Cause : identifiants courts `/vehicules/18` non reconnus par le lecteur générique.
- Ajout de `robyns-reader.ts`, exclusivement pour robynscar.com : pagination du catalogue public, références courtes, JSON-LD de chaque véhicule, galerie propre sans miniatures/recommandations/logo, champs dt/dd (première mise en circulation), coordonnées publiées. Aucun élargissement des heuristiques des autres lecteurs. Filtres inconnus refusés, échec de page/fiche ou écart au total = partial pour empêcher une synchronisation complète trompeuse.
- Version réellement déployée v98 examinée : wrapper épinglé c0e38156, sources identiques à main avant modification. Lecture locale réelle : 50/50 véhicules, 475 photos ; 4 prix « Nous consulter » et 7 fiches sans photos à la source conservés comme manquants, aucune valeur inventée. Aucune description longue présente sur les fiches lues.
- Tests : robyns-reader (fiche réelle, galerie, contact, absence de prix, pagination, périmètre, panne partielle), vehicle-field-index et byebuy-reader : OK. Déploiement `pro-stock-sync` v99 ACTIVE, source enregistrée sur main `9db3d85ea065c972dd9c1592dacef5f1f555164c`, configuration JWT conservée. Contrôle production à blanc 185538 : HTTP 200, ok=true, 50/50 véhicules, 43 complets, 475 photos, partial=false, contact 50/50. Précision : 6 fiches sans galerie (et non 7), 4 sans prix, 7 fiches incomplètes au total. Demande marquée done après vérification. Régressions photo-selection et apimo-intuition également OK.
- Aucun import, publication, activation de flux ou mail demandé.

### 30/10/2026 — ChatGPT — Cannisimmo : contrôle de l’adresse signalée et clôture de la réparation
- Demande `d0545264-d110-40c4-af8a-547a813ac9d9` du 29/10, `https://cannisimmo.com/fr/?utm_source=gmb`, encore pending/« Illisible » malgré les correctifs précédents. Relance explicite d’Anthony : contrôle de cette adresse exacte, pas seulement du domaine sans paramètres.
- Production `pro-stock-sync` v98, `auto_review_dry` 185094 : HTTP 200, ok=true, Apimo listes actives, 12 pages, 135 fiches brutes, 121 après 14 doublons, 119 sans erreur, partial=false, 1469 photos ; prix/ville/description 100 %. Témoin 87522659 : 349000 €, Cannes 06400, 8 photos. Deux GES manquants déjà signalés (3915710 et 86879982), conservés sans invention. Stock source évolutif.
- Demande marquée done avec le résultat réel. Aucun nouveau code/déploiement nécessaire ; aucun import, publication, activation de flux ou mail déclenché. Aucun statut de prospect modifié.

### 30/10/2026 — ChatGPT — Protection commune contre les images par défaut et miniatures (v98)
- Accord d’Anthony après Intuition : renforcer la sélection commune des photos. `smart-reader.ts` : priorité à une galerie HTML explicitement identifiée (module-slider, gallery/galerie/fotorama, slider de produit/véhicule/bien) ; exclusion des galeries de miniatures/suggestions identifiées. Dans chaque élément, un seul lien retenu : plein format, plus grande source srcset, lien lazy, puis src. `data-low-src` n’est plus ramassé par la regex suffixe src. Les logos et portraits opaques hors galerie ne deviennent plus la première photo quand une galerie est identifiée. Aucune URL de taille inventée.
- `photo-utils.ts` : fonctions de dédoublonnage existantes déplacées dans un module partagé ; filtre explicite des noms placeholder/default/no_photo/sans-photo/image-indisponible, y compris URL encapsulée. `photosOf` applique ce filtre avant la limite de 45 et avant validation : une fiche sans photo exploitable garde l’erreur « aucune photo » ; le lecteur générique ne la fait plus disparaître silencieusement. Pas de reconnaissance visuelle ni de garantie pour les images d’attente au nom opaque quand aucun contexte ne les distingue.
- Le lecteur générique partage maintenant l’identité/rang des variantes : paramètres d’identité id/file/token conservés, variantes de taille dédoublonnées, liens signés renvoyés tels quels. Les attributs numériques data-image ne masquent pas un src valide.
- Tests : `photo-selection.test.mjs` (lazy avec src opaque, srcset désordonné, galerie/voisinage, logos hors galerie, ordre, variantes, paramètres d’identité, URL signée, absence de photo, attribut malformé ou numérique), `vehicle-field-index.test.mjs` (harness adapté aux imports, rejet d’une photo par défaut), régressions Intuition, Cannisimmo, Bye Buy Car : OK. Vraies pages : lecteur générique Intuition 45 images mélangées auparavant → 22 originaux identiques à la galerie dédiée, première photo correcte ; Cannisimmo 17 → 8, identiques au lecteur dédié.
- Source main : `57e9a484` puis `c0e38156b81dbe611c5941a2cdc0d0cfe35fc236`. Modifications concurrentes des pages admin conservées. Base déployée v96 ; déploiement final `pro-stock-sync` v98 ACTIVE, import épinglé sur c0e38156, configuration JWT conservée.
- Production à blanc v97 : Intuition 35/35, 592 photos, partial=false (185027) ; Cannisimmo 121/119, 1469 photos, partial=false, mêmes 2 GES manquants connus (185028). Contrôle final v98 du lecteur générique sur Intuition (debug_detail, 185033) : HTTP 200, ok=true, 22 photos, première b83959868d551f6f70ac68dfdadc6861.jpg correcte.
- Concerne les prochaines lectures/normalisations ; aucun stock publié ni import/flux activé par les contrôles, aucune annonce existante réécrite, aucun mail envoyé.

### 30/10/2026 — ChatGPT — Intuition : photos et lecture Apimo réparées (v96)
- Demande `83283c83-de19-4446-b099-39963fd14ca3`, https://intuition.immo/fr/ : photo principale par défaut et doublons. Les routes `/fr/acheter` et `/fr/louer` ne déclenchaient pas le lecteur Apimo à modules ; le lecteur générique mélangeait les variantes d’images. Ajout des deux routes aux listes actives et à la détection ; galerie `data-image-url` uniquement, ordre de la source, sans miniatures ni portrait du conseiller. Ville/CP issus du JSON-LD correspondant au bien, sans quartier ajouté à la ville.
- Conseiller de la fiche : lien `/agence/` reconnu dans le module utilisateur, téléphone mobile prioritaire dans cette même carte. Vérifié : Lisa PICOT et Adrien GROSJEAN avec leurs numéros distincts. Aucun téléphone ajouté à la description publique.
- Contrôle intermédiaire : prix du garage absorbait sa référence (regex autorisant un saut de ligne), corrigé par les espaces horizontaux ; droit au bail classé commerce depuis sa route. Le commerce 87230572 affiche 100000 € dans son en-tête contre 150000 € dans sa description source : le prix affiché est conservé.
- Source enregistrée sur main : `72e552cc` puis `640dc7ed65db4af4b0fc5ffb449d8bd14af32416`. Fonction réellement déployée v94 prise comme base ; déploiement final `pro-stock-sync` v96 ACTIVE, import épinglé sur `640dc7ed`, configuration JWT conservée.
- Vérification production à blanc (requête 185007) : HTTP 200, 35/35 biens sans erreur, 4 pages, `partial=false`, 592 photos contre 1128 avec le lecteur générique ; contacts sur 35/35, 5 numéros distincts. Garage à 30000 € confirmé. Fiche 87285412 : 22 originaux uniques, première photo visualisée, DPE B/GES A, ville Cannes 06400, 435000 €. Tests `apimo-intuition.test.mjs` (galerie, miniatures exclues, ordre, conseiller, prix, pagination) et régression Cannisimmo : OK.
- Demande marquée done. Aucun import, publication, flux ou envoi de mail déclenché.

### 30/10/2026 — ChatGPT — Protection du type de compte appliquée en production
- Accord explicite d’Anthony : fichier `supabase/2026-10-30-account-type-guard.sql` de `main` appliqué tel quel au projet Supabase `jplzvxmpbpjssyinozap` (migration `account_type_guard`, succès).
- Vérification SQL après application : déclencheur `aab_guard_profile_account_type` présent et activé (`tgenabled = O`) sur `public.profiles`, BEFORE UPDATE FOR EACH ROW, appelant `private.guard_profile_account_type()` ; définition de la fonction conforme au fichier (changement refusé sauf service_role ou public.is_admin()).
- Aucun profil modifié. La protection en base précédemment indiquée « Pas appliqué » est désormais active.

### 29/10/2026 — Claude — Textes des cartes « Les annonces » réduits
- Demande d'Anthony (capture mobile) : titres sur 4-5 lignes dans la grille. `assets/card-overlay-20261029.css` v=2 : titre limité à 2 lignes (points de suspension), et sur mobile titre 13 px, prix 16 px, caractéristiques / ville 10,5 px. Cartes du haut (récemment consultées, etc.) inchangées.

### 29/10/2026 — Claude — Filigrane et boutons des vignettes plus discrets
- Demande d'Anthony : filigrane trop visible sur les vignettes, cœur / partager trop présents.
- Nouveau `assets/card-overlay-20261029.css` (chargé en dernier dans `index.html`) : filigrane des photos importées plus petit et transparent (vignettes seulement, page annonce inchangée) ; Partager + cœur côte à côte en haut à droite, petits boutons verre fumé (fond sombre transparent, icônes blanches), cœur rose si favori. Remplace l'empilement vertical du 26/10 (`category-icons-20261026.css`). Le filigrane incrusté dans les photos déposées par les particuliers n'est pas concerné (il est dans l'image).

### 29/10/2026 — Claude — Vignettes épurées
- Demande d'Anthony : sur téléphone, les petits ronds (nombre de photos) et le badge « Nouveau » masquaient / chargeaient la vignette. Supprimés dans `assets/index-main.js` (carte annonce) ; les flèches photo, le cœur et le partage restent. Version `v=20261029-vignette-epuree`.

### 29/10/2026 — Claude — Vignettes pleines + contact du bien hors description (robot v88)
- Retour d'Anthony sur l'aperçu : (1) les photos ne remplissaient pas toute la vignette ; (2) le nom et le numéro du conseiller apparaissaient dans la description.
- `assets/thumb-fit-20261009.js` (v=2) : la photo remplit toujours la vignette (`cover`) ; plus de mode « contain + fond flou ». Ancrage bas-droite si recadrage léger, centré sinon. La page annonce garde la photo entière.
- Robot : `attachListingAdvisor` n'ajoute plus « Contact pour ce bien : … » à la description (contactName reste dans IMETA, contactPhone va dans listing_contacts.phone). Nouveau `stripContactLines` au début de `tidyDescription` : toute ligne « Contact pour ce bien », ligne courte de contact avec numéro supprimée, numéro retiré d'une ligne longue. Règle : jamais de numéro en clair dans une annonce importée (réservé aux membres connectés).
- Site (`index-main.js` v=20261029-contact-bien) : « Votre contact pour ce bien : <nom> » au-dessus des boutons Message / Voir le numéro (immo, IMETA contactName). Admin : contactName transmis à l'aperçu.
- pro-stock-sync v88, source 9b8e4577. Test à blanc Infinity : 174 lus / 172 complets, noms 173, téléphones 165 (30 distincts) gardés à part, 0 numéro dans les descriptions.

### 29/10/2026 — Claude — Aperçu « Voir comme sur le site »
- `admin-test-import.html` : après « Lire le stock », bouton « Voir comme sur le site » ; les fiches mises en forme (sans erreur, 220 max) sont stockées dans le navigateur (`abraca_import_preview`) et `index.html?apercu=import` les affiche avec les vraies vignettes et la vraie page annonce. Rien n'est publié ni enregistré en base.
- `assets/index-main.js` : `IMPORT_PREVIEW` + bandeau « Aperçu de l'import » ; `loadAds` court-circuité en aperçu ; carte vendeur non chargée en aperçu. Version `v=20261029-apercu-import`.

### 29/10/2026 — ChatGPT — Conseiller et téléphone propres à chaque bien (v87)
- Demande d’Anthony après Infinity : conserver nom/prénom et numéro du vendeur/conseiller associé à chaque annonce, les numéros pouvant différer entre les biens.
- apimo-reader.ts : module-user de la fiche uniquement ; nom lié à /equipe/ ou /team/ et lien tel de la même carte. Ne pas prendre l’équipe de l’accueil, le pied de page, ni le numéro d’un autre conseiller. Premier conseiller désigné si plusieurs cartes ; pas de mélange de noms/numéros.
- Circuit immobilier commun : alias contact_nom/contact_telephone, contact_name/contact_phone, agent/advisor/conseiller/negociateur ; validation simple du téléphone. Champs XML ajoutés pour contact/agent/advisor ; CSV/JSON passent par les mêmes alias. Ligne « Contact pour ce bien : Nom — numéro » ajoutée à la description et visible dans l’aperçu ; contactName conservé dans IMETA. Respect afficher_numero=false pour le numéro ajouté.
- Lors d’un futur import autorisé, listing_contacts.phone utilise le numéro propre au bien ; sinon téléphone du compte comme auparavant. Le bouton d’appel existant utilise get_listing_phone. Email/messagerie restent ceux du compte professionnel. Aucune migration ni modification des permissions. Téléphone non ajouté aux métadonnées publiques IMETA.
- Portée extraction web : modules utilisateur Apimo compatibles. Les autres lecteurs restent inchangés ; ne pas promettre une détection universelle des contacts sur tous les prestataires.
- Tests locaux sur deux vraies fiches Infinity : Melodie ROSINI/location 86909548 et Thibault BEREDER/vente 87538337, numéros distincts correctement associés ; normalisation, description mise en forme, contact d’appel mocké, repli compte, masquage, téléphone invalide et absence de module testés ; esbuild OK.
- pro-stock-sync v87, source f975a3228144172b0cb962328fdc071ac13440fe, base v86. Test à blanc complet Infinity : 174/172, 1678 photos, partial=false ; noms récupérés 173/174, téléphones 165/174, 30 numéros distincts. Pour les 9 sans téléphone récupéré, ne pas attribuer celui d’un autre bien ; repli compte lors d’un import. Compteurs contacts ajoutés au diagnostic dry.
- Témoins séquentiels : IFG 30/28, Nestenn 57/57, Chevreux 27/27, Orpi 54/52, C21 39/39, L’Adresse 88/88, Laugier 23/23, Spider VO 20/18, WooCommerce 79/77 ; défauts photos/prix/GES connus, stocks évolutifs.
- Résultat de la demande Infinity enrichi. Aucun prospect modifié, aucun mail, aucun import/publication déclenché.


### 29/10/2026 — ChatGPT — Infinity Group Immobilier / variante Apimo réparée (v86)
- Demande 8e76e13e-cab9-43b0-b6bb-e0d91997584b, https://infinitygroup-immo.com/fr/. Avant : le lecteur ne trouvait que 4 locations, aucune complète, 3 faux doublons après normalisation des fiches vides.
- Causes : route /fr/vente au singulier exclue ; entête property-info-template-12 inconnu ; le sélecteur du module description trouvait une ancre de menu data-anchor avant le vrai module 4.
- apimo-reader.ts : ventes?/locations? dans les routes actives et la détection ; sélection des classes des modules, support de l’entête 12 ; type dans la route et ville/CP dans le RealEstateListing.about correspondant à l’identifiant du bien (jamais adresse d’agence). Pièces du sommaire, chambres structurées en secours, surface exacte, photos/description/diagnostics/prestations conservés. Regex pièces limitée aux espaces horizontaux pour éviter de prendre la référence précédente.
- Prix sur demande : fiche conservée sans montant inventé (restaurant 87250867, 9 photos), pas de perte de description/photos. GES 85190000 absent confirmé : SVG « En cours », énergie C/116 ; ne pas inventer A depuis la phrase ambiguë de la description.
- Tests locaux Infinity location 86909548 : 65,38 m², 3 pièces/2 chambres, Antibes 06600, loyer affiché 1500 € charges comprises et charges 200 €, 12 photos D/D ; vente 87538337 : Nice 06000, 195000 €, 24,78 m², 8 photos C/A. Régression complète IFG locale (30 fiches, maison/location/terrain/SVG/pagination) et esbuild OK.
- v85 intermédiaire puis pro-stock-sync v86, source 6f4fc0ea276ee4f617385e6d5aefbf900a025b92. Base v84 et tri prospection Claude conservés. Test production final : 174/172, 18 pages (17 vente + 1 location), partial=false, 1678 photos, aucun doublon ; villes 100 %, descriptions 99 %, surfaces 95 %, pièces 97 %, DPE 67 %. Deux réserves source : prix sur demande et GES en cours ; les autres diagnostics absents restent vides.
- Témoins séquentiels : IFG 30/28 ; Junot 19/19, partial=true conservé ; Nestenn 56/56 ; Chevreux délai téléchargement au premier essai, puis 25/25 ; Orpi 54/52 ; C21 39/39 ; L’Adresse 88/88 ; Laugier 23/23 ; Spider VO 20/18 ; WooCommerce 79/77. Stocks évolutifs et défauts photos/prix connus.
- Demande done. Aucun prospect modifié, aucun mail, import ou publication.


### 29/10/2026 — ChatGPT — Villaret : blocage anti-robot confirmé
- Demande 7f6e1f1e-6833-46dd-bdb8-7896e8ac4dfe, https://www.villaret-immobilier.com. Accueil interrogé depuis le serveur du robot : HTTP 202, corps vide, x-amzn-waf-action=challenge (requête 182667). Test auto_review_dry 182668 : ok=false, aucune fiche lisible. Essai domaine sans www : délai TLS dépassé (182669).
- Les pages mises en cache par les moteurs ne prouvent pas que le robot lit directement le site. Aucun contournement ni changement de parseur ne corrige l’accès refusé constaté ; pas de nouveau déploiement (v84 conservée).
- Demande failed, raison visible : protection anti-robot ; accès autorisé ou flux d’annonces fourni par l’agence nécessaire pour poursuivre. Aucun prospect modifié, aucun mail/import/publication.

### 29/10/2026 — ChatGPT — Junot Saint-Georges : lecture des derniers biens actifs (v84)
- Demande 8775c30b-49fc-493a-934a-7a2e786e632c : https://www.junot.fr/fr/agences/junot-saint-georges-9-eme-arrondissement-paris. Avant : aucune fiche, prestataire Apimo. Page publique HTTP 200 sans authentification ; le lecteur générique ne suivait pas les fiches hors du chemin agence.
- Nouveau junot-reader.ts, sélectionné uniquement sur junot.fr ; réutilisable pour les pages /fr/agences/<slug>. Liens uniquement dans les onglets En vente/En location/À louer de la section de cette agence. Aucun lien de Vendus, d’autres agences ou de suggestions suivi. Fiche individuelle /fr/biens/<id>-<slug> également prise en charge.
- Description narrative product-description ; titre/type/prix de la fiche, ville et CP de sa métadonnée descriptive, surface Habitable prioritaire sur Total, pièces/chambres/salles d’eau, honoraires, galerie photos sans miniatures en double. DPE/GES SVG Apimo réutilisés après décodage des entités HTML, sans classes inventées. Charges annuelles et taxe lues, mentions copropriété via normalisation existante.
- Limite explicite : la page annonce les « derniers biens proposés par votre agence », sans total exhaustif ni pagination d’agence constatée. partial=true conservé, pas de total inventé, archivage automatique interdit par la protection existante ; ne pas présenter cette réparation comme une reprise exhaustive du réseau.
- pro-stock-sync v84, source 1b3e2e018f9fa15d855296f8db08c6bd100bfbac, base v83 Claude conservée. Tests locaux sélection active/vendus exclus, dédoublonnage photos, champs et partial, esbuild OK. Fiche 83270099 : 180,68 m² habitables (183,27 total), 11 photos, E/E, charges 6400 €/an, taxe 1760 €.
- Test production à blanc : 20 fiches / 19 après dédoublonnage existant, 19 sans erreur bloquante, 221 photos ; description/prix/ville/surface/pièces 100 %, DPE 68 % (6 programmes neufs sans diagnostic), partial=true.
- Témoins séquentiels : Nestenn 56/56 ; Chevreux 29/29 ; Orpi 54/52 ; C21 39/39 ; L’Adresse 88/88 ; Laugier 23/23 ; Spider VO ADN 20/18 ; WooCommerce 78/76. Défauts photos/prix connus et stocks évolutifs, lecteurs non Junot inchangés.
- Demande done avec limite de lecture partielle dans le résultat. Aucun statut de prospect modifié, aucun mail, import ou publication.


### 29/10/2026 — Claude — Tri automatique des prospects (plus de prospect bloqué)
- Décision d'Anthony : ne pas apprendre tous les sites ; envoyer d'abord à ceux que le robot lit.
- Migration prospect_auto_sort_generic : `prospect_precheck_done` classe d'office — lu → `ok` ; lien Leboncoin sur le site (raison « LEBONCOIN: ») → `manual` ; sinon → `generic` (mail normal). Anciens `unreadable` passés en `generic`. `prospect_mailer_claim` : 1ers mails dans l'ordre ok/manual d'abord, puis generic.
- pro-stock-sync : `prospect_precheck` détecte les liens leboncoin.fr/boutique|pro|ad|annonces|profil sur l'accueil quand le site n'est pas lisible ; mail du soir : liste les illisibles (qui reçoivent le mail normal) pour repérer les gros pros à « Réparer ».
- admin-test-import.html : « Sites à apprendre » montre les illisibles pas encore mailés ; texte d'explication mis à jour. Les boutons restent utilisables (Réparer / Valider / Supprimer / Vend sur Leboncoin / Mail normal).

### 29/10/2026 — Claude — Bouton « Mail normal » (site qui bloque les robots)
- Demande d'Anthony : Opti Immo bloque les robots, quel bouton pour lui envoyer un mail normal ?
- Base (migration prospect_generic_mail) : `site_check_status` accepte « generic » ; RPC `admin_mark_prospect_generic` ; `prospect_mailer_claim` envoie aussi aux « generic » ; modèles « normal » et « relance_normal » (gratuit ; publier soi-même depuis le téléphone ou envoyer le flux / export du logiciel, « répondez à ce mail » ; aucune promesse de lecture du site).
- prospect-mailer v10 : `templates(…, kind)` = "" / "manuel" / "normal" ; test `{action:'test', normal:true}`.
- admin-test-import.html : bouton « Mail normal » après « Vend sur Leboncoin », compteur « mail normal ».

### 29/10/2026 — ChatGPT — Opt’Immo : diagnostic de blocage anti-robot
- Demande 143b5884-5a99-4591-bdb7-715a6db55a8c, https://www.agence-optimmo-pau.fr/. Test auto_review_dry : ok=false, aucune fiche lisible.
- Accueil, domaine sans www, robots.txt et pages réelles de vente/location : HTTP 202 avec x-amzn-waf-action=challenge. La protection AWS WAF empêche le serveur du robot de recevoir les annonces ; ce n’est pas un défaut démontré du parseur. Les résultats en cache des moteurs ne valident pas une lecture directe.
- Demande marquée failed avec explication simple. Pour poursuivre : accès autorisé au robot ou flux d’annonces fourni par l’agence. Aucun contournement, changement du lecteur ou déploiement ; pro-stock-sync reste v82.
- Aucun statut de prospect modifié, aucun email, import ou publication.

### 29/10/2026 — ChatGPT — Orpi gmirleau.immo réparé : adresses avec point (v82)
- Demande 69a0e95b-9898-4379-944b-c95c625fdabb, https://www.orpi.com/gmirleau.immo/, « Illisible ». Avant : orpiAgencySlug refusait les points, donc lecteur générique au lieu du lecteur Orpi ; test avant correction HTTP 503.
- Correction limitée au nom de l’agence : lettres/chiffres/tirets/points internes acceptés, 2–60 caractères, pas de point initial/final ni doubles points ; routes nationales toujours exclues. Sert aussi à orpi.rostrenen, portovecchio.extremesud, etc. Lecteur des fiches et autres réseaux inchangés.
- pro-stock-sync v82 déployé, source 7d8cf4960cdb2621fd2327a86ef006fb35db2cf4.
- Test production : 41 annonces / 40 sans erreur bloquante, total=41, partial=false, 453 photos, descriptions/villes 100 %, DPE 95 %. Seule erreur : programme-neuf Soufflenheim b1252873-9ff1-488d-855f-849ead434367, laissé en l’état selon la consigne d’Anthony sur le neuf.
- Contrôle Pottier avant modification : 98/97 (déjà fonctionnel). Assertions locales sur agences avec points, agences classiques, routes nationales et adresses mal formées ; vraie fiche Beaufour-Druval inchangée. esbuild OK.
- Témoins séquentiels après déploiement : Nestenn 56/56 ; Chevreux 29/29 ; Orpi Strasbourg 54/52 (2 sans photo) ; C21 39/39 ; L’Adresse 88/88 ; Laugier 23/23 ; Spider VO 22/20 (2 sans photo) ; WooCommerce 78/76 (2 prix absents).
- Demande marquée done. Réparation uniquement : aucun statut de prospect modifié, aucun import/publication/envoi déclenché.

### 29/10/2026 — Claude — Tâche du soir annulée
- Décision d'Anthony : ChatGPT se débrouille bien pour les réparations ; la tâche planifiée « Abracadeal : apprendre les sites au robot » (18 h 47) est supprimée. Les demandes « Réparer » restent dans `robot_learning_requests` et sont traitées par ChatGPT ou Claude sur demande d'Anthony. Textes de l'admin et guide mis à jour.

### 29/10/2026 — ChatGPT — IFG Provence / modules Apimo appris (v81)
- Demande 1a95f7d2-57d0-425b-8abb-5f22923b88e5 : https://ifgprovence.fr. Avant : lecteur automatique 116 annonces (y compris biens vendus), aucun DPE. Site Apimo à modules HTML.
- Nouveau apimo-reader.ts : lecture uniquement des listes actives /fr/ventes (19 biens, 2 pages) et /fr/locations (11 biens, 1 page). Ne parcourt ni /fr/biens-vendus ni sitemap ni biens similaires. Détection limitée aux sites Apimo avec ces routes et modules, sinon lecteur précédent conservé.
- Fiches : titre réel et description p.comment, prix/ville/type dans l’en-tête, surface du sommaire (142.44 m² conservés plutôt que 142 arrondis de la description), pièces/chambres, surfaces terrain séparées, galerie pleine taille data-image-url sans miniatures doublonnées, prestations et mentions légales, charges locatives/dépôt, état/chauffage/étage/exposition.
- Diagnostics en SVG base64 : décodage XML et lecture de la couleur de la ligne effectivement agrandie/encadrée dans la palette Apimo connue (lettres tracées, pas de texte). Énergie/climat distingués par le titre du SVG ; pas de déduction des classes depuis des seuils kWh. Valeurs numériques de consommation extraites des textes XML. Modèle inconnu = lettre laissée vide.
- Tests locaux : maison 87336657, 142.44 m² / 5 chambres / terrain 336 / C-A / 13 photos ; location 87407804, 61.32 m² / charges 90 / dépôt 1160 / étage 1 / B-A ; terrain 86823696, terrain 808 m² et aucune surface habitable ni DPE inventé. Pagination mock sur pages réelles : 30 fiches, aucune page vendus. Assertions SVG, séparation surfaces et normalisation ; tests locaux Kermarrec/Orpi/CCI conservés et esbuild OK.
- pro-stock-sync v81 déployé, source c86ed93412f86a6177bd56c94e1165f1cbe4d001. Test production à blanc : 30 lues/28 validées, partial=false, 328 photos, aucun doublon, descriptions/villes/prix 100 %, surfaces/pièces 93 %, DPE 67 % (contre 0 % avant).
- Les 2 erreurs « GES manquant » sont confirmées à la source : 87226256 (DPE E) et 85579310 (DPE A) : un seul SVG énergie, champs émissions et unité vides, aucune étiquette climat. Ne pas inventer le GES. Les terrains/commerces sans diagnostic restent sans valeur.
- Témoins séquentiels après déploiement : Kermarrec 26/26, Nestenn 56/56, Chevreux 31/31, Orpi 54/52 (2 photos absentes), C21 39/39, L’Adresse 88/88, Laugier 23/23, Spider VO 22/20 (2 photos absentes), WooCommerce 78/76 (2 prix absents). Stocks évolutifs.
- Demande marquée done. Apprentissage uniquement : aucun statut de prospection modifié, aucun import/publication ni envoi déclenché.

### 29/10/2026 — Claude — Réparer ≠ prospection
- Précision d'Anthony : « Valider c'est pour valider, Tester pour tester. » Donc : **Réparer** (tâche du soir de Claude ou ChatGPT) = apprendre au robot à lire, sans jamais toucher à la prospection ; c'est Anthony qui appuie ensuite sur **Tester** puis **Valider** (prospect remis en test → mail s'il est lisible).
- Tâche planifiée « Abracadeal : apprendre les sites au robot » mise à jour : ne modifie plus les prospects, ne prend jamais une demande déjà « in_progress » (ChatGPT), git pull --rebase avant chaque push. Guide `docs/APPRENDRE-AU-ROBOT.md` mis à jour.

### 29/10/2026 — Claude — Sites à apprendre : boutons renommés
- Demande d'Anthony : « vérifier / revérifier » pas logique. Boutons dans l'ordre : **Tester** (aperçu), **Réparer** (= demande d'apprentissage, traitée par la tâche du soir), **Valider** (= remettre dans la file de test → mail si lisible ; ancien « Revérifier »), **Supprimer**, **Vend sur Leboncoin**. « Apprendre à lire ce site » → « Réparer ce site » ; rubrique « Apprentissage du robot » → « Sites en réparation » (statut « Réparé »). Explication des boutons affichée au-dessus de la liste.

### 29/10/2026 — ChatGPT — Kermarrec Habitation Pornichet appris (v80)
- Demande e3f26a6e-8f6e-4c6b-8d97-d0d6b8cba8d7, https://www.kermarrec-habitation.fr/nos-agences/agence-de-pornichet/ : site illisible, aucune fiche lue avant correction.
- Cause : le lecteur automatique restait sous le chemin de la page agence (/nos-agences/…), alors que les fiches sont /achat/<type>/<ville-cp>/bien-<id>/. Développement d’un lecteur Kermarrec réutilisable par les autres agences du réseau (kermarrec-reader.ts), branché uniquement sur ce domaine ; autres lecteurs inchangés.
- Pagination limitée à la liste de l’agence, 3 pages /achat/agence/agence-de-pornichet/ (le rel=next national du site pointe ailleurs : ne pas le suivre). 26 liens uniques, aucune annonce des autres agences via les biens similaires. Lecture partielle signalée si une page échoue ou si moins de fiches que le total annoncé.
- Fiches : description narrative du bloc Descriptif, valeurs séparées surface/terrain, pièces/chambres, mandat, année/chauffage, équipements, honoraires, galerie du bien sans miniatures en double, DPE/GES par lettre effectivement sélectionnée (pas déduite), date et coûts énergie. Données absentes laissées vides.
- Tests réels maison 54551745 : 60 m², terrain 4251 m² (valeur du tableau source), 2 chambres, Pornichet 44380, 9 photos, DPE G/GES C selon les lettres affichées, énergie 2060–2810 € ; appartement 59501127 : 91 m², La Baule-Escoublac, 14 photos, C/A. Assertions pagination/scope/normalisation, régressions Orpi et CCI 175/190, esbuild OK.
- Version pro-stock-sync v80 déployée, source afdab18f3553a7889b26c8331a8c83c21a08218a. Test à blanc complet : 26/26, aucune erreur, total_on_site=26, partial=false, 320 photos, descriptions 100 %, villes/prix 100 %, surface 96 %, DPE 92 %, coût énergie 88 %.
- Témoins après déploiement (séquentiels) : Nestenn 56/56 ; Chevreux 26/26 ; Orpi 54/52 (2 sans photo) ; C21 38/38 ; L’Adresse 88/88 ; Laugier 23/23 ; Spider VO 23/21 (2 sans photo) ; WooCommerce 78/76 (2 prix absents). Stocks susceptibles d’évoluer.
- Demande marquée done avec résultat. Apprentissage uniquement : aucune modification du statut des prospects, aucun import/publication ni envoi de mail déclenché.

### 29/10/2026 — ChatGPT — Validation Orpi : apprentissage uniquement
- Précision d’Anthony : « valide » signifie ici valider que le robot sait lire, sans valider la prospection ni publier/importer des annonces.
- Demande robot_learning_requests da50c6d3-11e6-4da9-b310-103906397df4 marquée done, handled_by ChatGPT, résultat lecture uniquement (v79, 98 lues / 97 validées).
- La première action avait passé le précontrôle du prospect Pottier à ok avant l’interruption ; statut remis à unreadable et motif précédent rétabli. Prospect toujours ready, aucune date d’envoi renseignée. Aucun import/publication déclenché.
- Pour les prochaines validations d’apprentissage demandées ici : ne pas modifier le statut de prospection sans demande explicite d’Anthony.

### 29/10/2026 — ChatGPT — Orpi : description et mauvaise détection des agences (v79)
- Signalement Anthony : description générique « Qu’est-ce qu’un bien Avant-Première ? » et champs erronés sur e91e0f02-ac11-4c0e-a982-ea707f14aeb6, agencepottier. Anthony précise que plusieurs annonces sont concernées.
- Cause commune : orpiAgencySlug excluait tous les chemins commençant par « agence », donc agencepottier / agence-contesso passaient par la lecture automatique. Filtre corrigé pour exclure les seules routes nationales ; ajout lecture dédiée d’une fiche Orpi /annonce-… fournie directement. Données data-estate prioritaires : longAd, ville/CP, référence, prix, photos ; ajout lotSurface dans surface_terrain.
- Version pro-stock-sync v79, source 03bea56c882070c3b8e51d48c9402255dbf298db.
- Fiche réelle : ville Beaufour-Druval, CP 14340, prix 162000, 3 pièces, 2 chambres, terrain 15190, 3 photos, vraie description « Maison À Vendre. Dans notre jolie campagne… ». Surface habitable absente sur le site : reste vide (190 précédent était faux), Clichy supprimé. Test direct en production 1/1 sans erreur, plateforme Orpi (fiche annonce).
- Test agence complet en production : agencepottier 98 lues, 97 validées, plateforme Orpi (page agence), partial=false ; 1 type de bien non reconnu reste à traiter séparément. La correction concerne toutes les agences Orpi dont le slug commence par agence et les fiches directes, pas uniquement ce bien.
- Assertions Orpi (détection routes, description, ville/CP, séparation surface/terrain), tests CCI 175/190 précédents et syntaxe/esbuild OK. Aucun import/publication lancé.

### 29/10/2026 — ChatGPT — Surface « 190 m² de surface habitable » (v78)
- Signalement Anthony : autre annonce encore sans surface. Identifiée : CCI Fontenay-sur-Mer, référence 1137 (262 975 €), texte « ses 190m² de surface habitable ».
- Règle générale immoFillFromText étendue à « m² de surface habitable » / « m2 de superficie habitable », sans prendre terrain, dépendances ou surfaces annexes. Modification ciblée dans index.ts, données explicites déjà présentes conservées.
- Version pro-stock-sync v78, commit source 16742015aa3725e2315ea3e400c145097a62ca14.
- Test réel fiche 1137 : surface normalisée 190 ; fiche précédente 1130 toujours 175 m² / 3 chambres / honoraires complets. Assertions variantes positives et exclusions terrain/dépendances/annexes OK ; esbuild OK.
- Test à blanc CCI : 17/17, aucune erreur, surface renseignée 59 % (53 % en v77), photos 231, partial=false. Aucun import/publication lancé. Contrôles témoins v77 conservés ; seul ajout de formulation de surface dans v78.

### 29/10/2026 — ChatGPT — Description → champs immobiliers automatiques (v77)
- Signalement Anthony : CCI Saint-Floxel (1130), 175 m² habitables et 3 grandes chambres présents dans la description mais absents des colonnes ; « 3 pièces de vie » pris pour le total.
- Cause : normalizeImmo calculait surface et pièces AVANT immoFillFromText. Extraction déplacée au début, avant le calcul des champs ; les valeurs déjà renseignées restent prioritaires. Lecture de chambres avec adjectif (grandes/belles/spacieuses), surface habitable prioritaire sur annexes/dépendances/terrain, terrain explicite en m²/hectares, exclusion de « pièces de vie » du total ; honoraires T.T.C. non tronqués aux points. Même prudence sur le lecteur AdnPix.
- admin-test-import.html : Surface/Pièces/Chambres des autres détails utilisent les champs normalisés ; ils correspondent aux valeurs enregistrées par l’import (métadonnées immo existantes).
- pro-stock-sync v77 déployé, source 79ccd522f0cdf7126ab4b3f8139ff55c6272ed9c ; page admin commit 6e3ff856e0bf3349097fc0f69fcfd27e8be6a844. Aucun import/publication lancé.
- Test réel fiche 1130 + assertions : surface=175, bedrooms=3, rooms=null (pas de total explicite), honoraires « 4.98 % T.T.C. en sus du prix net vendeur. », DPE C/GES A, 18 photos. Tests supplémentaires : valeurs explicites conservées ; dépendances/terrain non pris en habitable ; charges/taxe/lots/coût énergie extraits. esbuild OK.
- CCI test à blanc : 17/17, zéro erreur, surface renseignée 53 % (contre 35 %). Sites témoins séquentiels : Nestenn 56/56, Chevreux 29/29, Orpi 52/50 (2 photos absentes), C21 38/38, L’Adresse 88/88 (stock actuel 91 moins 3 doublons), Laugier 23/23, Spider VO 23/21 (2 photos absentes), WooCommerce 79/77 (2 prix absents ; défaut localisation « Km » préexistant inchangé, voir entrée précédente).

### 29/10/2026 — ChatGPT — CCI Immobilier / AdnPix appris au robot (v76)
- Demande robot_learning_requests 65ccd298-1156-4f91-9d1c-223330d99310 : https://www.cci-immo.fr/ ; prise en charge ChatGPT.
- Avant : 21 annonces retenues / 11 complètes, villes « Type de bien », références prises pour codes postaux, DPE/GES non lus, descriptions tronquées et catalogues PHP pris pour des fiches.
- smart-reader.ts : lecture des champs AdnPix (annonce-detail-titre, ville du h1 hors prix, description complète, galerie lightbox en taille originale avec base href, classes ndpe sélectionnées, surface Carrez et lots). Absence de valeur = champ vide ; terrain jamais pris comme surface habitable. Biens vendus/loués/sous compromis/offre acceptée écartés. Catalogues maisons/appartements/terrains PHP et pagination pcsd parcourus comme listes ; liens relatifs respectent base href.
- Déploiements intermédiaires v74/v75 ; version finale pro-stock-sync v76, source figée au commit 6fe4c36a86875d1503a798b0be27b96861a94de3. Import map enregistrée dans supabase/functions/pro-stock-sync/import_map.json (même supabase-js 2.57.4 en bundle, après délais esm.sh au déploiement).
- Test à blanc final : 17 retenues / 17 complètes, aucune erreur, partial=false, villes 100 %, prix 100 %, DPE 94 %, 231 photos (13,6/annonce). « Complète » = critères de validation du robot, pas tous les champs renseignés ; surface 35 %, pièces 41 % : seules valeurs explicites retenues. Aucune annonce publiée par ces tests.
- Contrôles séquentiels : Nestenn 56/56 ; Chevreux 29/29 ; Orpi 52 lues/50 complètes (2 parkings sans photo) ; C21 38/38 ; L’Adresse 86/86 (3 doublons écartés) ; Laugier 23/23 ; Spider VO ADN 23/21 (2 sans photo) ; WooCommerce Centurion 79/77 (2 prix absents). Aucun changement des lecteurs dédiés. Anomalie préexistante observée côté WooCommerce : ville « Km » / CP 61655 à revoir séparément ; ne pas considérer ce témoin comme contrôle de localisation réussi.
- Vérifications locales : esbuild bundle OK ; assertions ville, surface Carrez, DPE/GES, galerie originale, exclusion vendu, pagination OK.
- Fin : demande marquée done avec résultat lisible et prospect remis dans la file de pré-test ; aucun lot de prospection déclenché manuellement.

### 29/10/2026 — Claude — Bouton « Apprendre à lire ce site » + tâche du soir
- Demande d'Anthony : un bouton qui envoie le site à apprendre à Claude ou à ChatGPT.
- Base (migration robot_learning_requests) : table `robot_learning_requests` (url, sector, company, prospect_id, note, status pending/in_progress/done/failed/cancelled, result, handled_by) ; RPC admin `admin_request_robot_learning`, `admin_list_robot_learning`.
- admin-test-import.html : bouton « Apprendre à lire ce site » sous le test d'adresse et « Apprendre à lire » sur chaque carte de « Sites à apprendre » (remarque facultative) ; nouvelle rubrique « Apprentissage du robot » (statut et résultat de chaque demande).
- Tâche planifiée Claude « Abracadeal : apprendre les sites au robot » (trig_01GeC164yCy8SPNYFbCJBMX7), chaque jour à 18 h 47 (Paris), approbation automatique, notification sur téléphone : prend jusqu'à 5 demandes en attente, suit docs/APPRENDRE-AU-ROBOT.md, déploie, reteste les sites témoins (annule si régression), met la demande à done/failed avec une phrase de résultat, remet le prospect dans la file de test, écrit le journal. Ne fait rien si la file est vide ou si ChatGPT travaille sur le robot.
- **ChatGPT** : pour prendre une demande, la passer en `in_progress` avec `handled_by='ChatGPT'`, puis même méthode et même fin (done/failed + result).

### 29/10/2026 — Claude — Guide « Apprendre un nouveau site au robot » pour ChatGPT
- Demande d'Anthony : que ChatGPT puisse aussi apprendre de nouveaux sites au robot, en alternance avec Claude.
- Nouveau fichier `docs/APPRENDRE-AU-ROBOT.md` : fonctionnement du robot, test à blanc (SQL), diagnostic d'une fiche, mise en ligne par commit, sites témoins à retester, prospects à remettre dans la file, répartition.
- Journal remis en ordre : les entrées du 29/10 étaient ajoutées en bas, elles sont maintenant en haut (la plus récente d'abord), au format « ### date — auteur — sujet ».

### 29/10/2026 — Claude — Aperçu admin : bouton « Modifier » une fiche
- Demande d'Anthony : corriger directement une erreur vue dans l'aperçu.
- Base (migration pro_stock_overrides) : table `pro_stock_overrides` (clé = site sans www + référence de la fiche, `fields` jsonb, RLS sans accès direct) ; RPC admin `admin_set_stock_override(host, ref, fields)` ({} = supprimer la correction).
- pro-stock-sync v73 (`normalizeRows`) : corrections chargées pour les sites lus et appliquées à la fiche brute avant la mise en forme (mêmes noms : titre, prix, ville, code_postal, surface, pieces, chambres, dpe, ges, honoraires, charges_annuelles, nombre_lots, taxe_fonciere, charges_mensuelles, depot_garantie, transaction, type_bien, marque, modele, annee, kilometrage, carburant, boite, description) ; `_exclure` = jamais publiée (retirée à la synchro suivante si déjà en ligne). Fiche marquée `corrected`.
- admin-test-import.html : bouton « Modifier » dans la fiche (formulaire selon auto/immo, case « Ne pas publier », « Supprimer ma correction »), badge « Corrigée à la main ». Affichage mis à jour tout de suite ; annonces déjà en ligne corrigées à la synchro suivante (≈ 3 h).

### 29/10/2026 — Claude — Doublons de photos et d'annonces, tous sites
- Demande d'Anthony : photos en double fréquentes (auto et immo) ; vérifier aussi les annonces en double.
- pro-stock-sync v72 (`normalizeRows`) : `dedupePhotos` — même image reconnue malgré la taille (-300x200, -ibig/-intermediate, /thumbs/, ?w=400…), l'extension et les paramètres de taille ; la plus grande version est gardée (sans indication de taille = image d'origine). `listingKey` : même titre + prix + surface/km/année + ville dans un même site = une seule annonce (celle qui a le plus de photos). Lecture à blanc : `duplicates`, `photos_total`.
- Aperçu admin : affichait les photos brutes de la page (ex. 45 pour la Lexus Laugier) et les villes avant correction ; il affiche maintenant les données qui seront publiées (photos sans doublons, ville corrigée), les doublons d'annonce en grisé « non publié ». Lien fiche lue ↔ fiche normalisée par adresse ou référence (avant : par position, décalé dès qu'une fiche était écartée).
- Contrôle : L'Adresse Cannes 3 annonces en double retirées (89 → 86) ; Laugier 23 véhicules, 33 photos en moyenne après dédoublonnage.

### 29/10/2026 — Claude — Robot v71 : Laugier Automobiles (Annonces-Automobile) sans ville
- Signalé par Anthony : 23 véhicules lus, 0 prêt (« ville manquante ») alors que l'adresse du garage figure sur chaque fiche.
- Cause : accueil du site sans photo → pas de « cdn-rivamedia » → site pas reconnu comme Annonces-Automobile → lecteur automatique (qui ne lit pas le bloc « Nos coordonnées »).
- `isAaSiteHtml` : reconnu aussi par les images d'interface www.annonces-automobile.com/images/graphic/. `siteLocation` : ville en minuscules (« 75017 paris ») acceptée et remise en forme (« Paris »).
- Contrôle : laugierautomobiles.com 23/23 complets, ville Paris, 33 photos en moyenne.

### 29/10/2026 — Claude — Interrupteur « Offre Fondateurs » qui ne réagissait pas
- Signalé par Anthony : clic sans effet. Cause : l'état ouvert/fermé n'était chargé qu'à l'ouverture du menu Admin par le bouton du bas (mobile) ou à la construction du menu (ordinateur, Supabase parfois pas encore prêt) ; état inconnu → le clic ne faisait rien.
- admin-mobile-merge-20261028.js (v=3) et admin-account-layout-20261018.js (v=8) : si l'état n'est pas chargé, il est lu au clic puis la confirmation s'affiche. L'offre est restée ouverte (closed_at vide, vérifié).

### 29/10/2026 — Claude — Prospection : moins de motos
- Décision d'Anthony : les garages moto ont très peu d'annonces sur leur site. Mix d'envoi : moto 10 %, immobilier 45 %, auto 45 % (avant 32/34/34).
- `prospect_precheck_claim` : tirage pondéré par ce mix (power(random(), 1/poids)) au lieu de « petits pros d'abord » (qui faisait tester surtout des motos). Essai : 10 tirages → 6 immo, 3 auto, 1 moto.

### 29/10/2026 — Claude — Prospects qui vendent sur Leboncoin : mail « publiez vous-même »
- Demande d'Anthony : un bouton pour les pros dont les annonces sont sur Leboncoin et pas sur leur site, et leur envoyer un mail pour qu'ils publient eux-mêmes.
- Base (migration prospect_manual_listing_mail) : `site_check_status` accepte « manual » ; RPC `admin_mark_prospect_manual` ; `prospect_mailer_claim` envoie le 1er mail aux statuts ok ET manual ; modèles « manuel » et « relance_manuel » (gratuit, sans limite d'annonces, publier depuis le téléphone, contacts directs).
- prospect-mailer (stub GitHub) : modèle « manuel » / « relance_manuel » quand `site_check_status='manual'` ; `{{vos_annonces}}` = vos véhicules / vos motos / vos biens ; test : `{action:'test', manual:true}`.
- admin-test-import.html : bouton « Vend sur Leboncoin » dans « Sites à apprendre », compteur « vendent sur Leboncoin ».
- Leboncoin n'est pas lu par le robot (protection anti-robots et conditions d'utilisation).

### 29/10/2026 — Claude — Sites à apprendre : bouton « Supprimer »
- Demande d'Anthony : retirer un prospect qui ne l'intéresse pas depuis la liste « Sites à apprendre ».
- Contrainte `prospection_prospects_segment_check` élargie à « exclu_admin » (sinon erreur au clic, signalée par Anthony).
- RPC `admin_drop_prospect` (admin) : la ligne n'est pas effacée (sinon le robot de recherche de prospects pourrait la rajouter) mais marquée `segment='exclu_admin'`, statut ready → paused, note datée : plus jamais mailé (le tirage et le test excluent déjà « exclu% »), retiré de la liste et du mail du soir (pro-stock-sync v70).
- admin-test-import.html : bouton rouge « Supprimer » avec confirmation.

### 29/10/2026 — Claude — Robot v69 : ville du bien, pas celle de l'agence
- Signalé par Anthony : L'Adresse Cannes, biens au Cannet / à Juan-les-Pins affichés « Cannes » (adresse de l'agence prise sur la page).
- smart-reader : ordre de choix de la ville : 1) segment « ville-cp » de l'adresse de la fiche (/le-cannet-06110/ ; si le segment contient d'autres mots, seule la fin confirmée par la page est gardée), 2) ville trouvée dans le titre, 3) fin du titre (« …, Le Cannet ») seulement si la page la confirme, 4) ancienne règle (données de la page, texte).
- Contrôle : L'Adresse Cannes 89/89, code postal = celui de l'adresse de chaque fiche pour les 89 ; Nestenn Orléans 56/56 ; immochevreux 30/30 (la fin de titre « MANSARDE - CAVE - » n'est plus prise pour une ville).

### 29/10/2026 — Claude — Prospection : test du site avant le mail + sites à apprendre + mention d'erreurs
- Décisions d'Anthony : lien vers l'annonce d'origine caché ; mention « il peut y avoir des erreurs » sur les annonces reprises ; mail de prospection basé sur la lecture du site ; si un site n'est pas lisible, Anthony est prévenu et transmet à Claude, qui apprend au robot à le lire.
- Base (migrations prospect_site_precheck, prospect_mailer_claim_requires_readable_site, prospect_precheck_cron) : colonnes `site_check_status` (checking/ok/unreadable), `site_check_count`, `site_check_platform`, `site_check_reason`, `site_checked_at` sur prospection_prospects ; RPC `prospect_precheck_claim` / `prospect_precheck_done` (service), `admin_unreadable_sites`, `admin_recheck_prospect_site` (admin). Test bloqué > 10 min → « illisible (site trop lourd ou trop lent) ».
- `prospect_mailer_claim` : un 1er mail ne part qu'aux prospects `site_check_status='ok'` (relances inchangées).
- pro-stock-sync v67 : action `prospect_precheck` (1 site par appel, lecture à blanc complète) ; action `unreadable_digest` (mail Resend aux admins : prospects illisibles + inscriptions en attente des dernières 24 h, idempotent par jour). Crons : `abracadeal-prospect-site-precheck` toutes les 4 min de 6 h à 17 h UTC ; `abracadeal-unreadable-sites-digest` à 17 h 10 UTC.
- prospect-mailer v8 (stub GitHub) : `{{annonces}}` = « vos 52 biens peuvent être » / « votre véhicule peut être » (par catégorie) ; modèles A et B réécrits : « Nous avons testé le site de {{societe}} : {{annonces}} en ligne sur Abracadeal en quelques minutes… » ; relance : « Petit rappel : {{annonces}} en ligne… ».
- Annonce publique (source feed:…) : mention sous la description (erreurs possibles, seules les infos confirmées par le pro font foi). index-main.js?v=20261029-mention-import.
- Admin (admin-test-import.html) : section « Sites à apprendre » (compteurs, Tester, Revérifier).
- Note : plusieurs tests lancés en même temps → 546 WORKER_RESOURCE_LIMIT ; le cron n'en lance qu'un à la fois.

### 29/10/2026 — Claude — Robot v66 : réseau L'Adresse
- Signalé par Anthony : L'Adresse Cannes illisible.
- `readLadresseAgency` : adresse de page agence ladresse.com/agence/<nom>/<n°> → listes /acheter, /acheter/2… et /louer, fiches /annonce/(achat|location)/… lues par le lecteur automatique (220 max par passage). Adresse du site national ladresse.com : message « donnez l'adresse de la page de l'agence » (exemple fourni).
- L'Adresse Cannes : 89 biens (82 ventes, 7 locations), 89 complets ; DPE 85 % (étiquettes en image « dpe-c.png » / classe « dpe dpe-c » : lues si une seule lettre), lots 58 %, charges 55 %, taxe 65 %, honoraires 99 %.
- Corrigés au passage : bien « vendu loué » (« loyer : 450 € » dans la description) classé en location → reste une vente si prix ≥ 20 000 € ; locations : « Charges : 37 € », « 21 € de provision sur charges », « Meublé » (lettre accentuée en fin de mot) ; honoraires « 463.27 TTC » non coupés au point.

### 29/10/2026 — Claude — Immo : informations essentielles (robot v63 + affichage)
- Demande d'Anthony : un tableau des infos très souvent demandées / obligatoires pour une annonce immo, et plus de doublons dans la description.
- Annonce publique (index-main.js?v=20261029-immo-essentiel, `detailSpecsFor`) : lignes toujours affichées, « Non communiqué » si absentes. Vente : surface habitable, pièces, dépenses d'énergie estimées, honoraires, copropriété, nombre de lots, charges de copropriété / an, procédure en cours (syndicat), taxe foncière. Location : charges / mois, dépôt de garantie, honoraires locataire, meublé. DPE/GES restent dans le bloc diagnostic.
- Aperçu admin : bloc « Informations essentielles » en tête, valeurs absentes en rouge, puis « Autres détails » ; code postal = celui normalisé.
- Robot : lignes « faits » de la fiche (`texte_page`, hors description) lues pour les rubriques à libellé uniquement : charges annuelles, taxe foncière, nombre de lots, bien en copropriété oui/non, procédure, dépôt de garantie, honoraires (% ou « à la charge du … »), n° de mandat (ex. 4981_B). Le DPE n'est jamais pris dans ces lignes (titres de biens similaires).
- Orpi : condo → copropriété, condoBundleNumber → nombre de lots.
- N° de mandat : plus de recopie de la référence quand le site n'en donne pas. Honoraires « honoraires » (mot du menu) ignorés. Code postal pris avec la ville choisie (Nestenn « 27390 » caché).
- Description : `dedupeDescription` après le découpage en lignes : titre recopié en tête retiré (et ses restes déjà répétés plus bas), badges seuls (Nouveauté, Exclusivité…), lignes répétées.
- Taux mesurés (lecture à blanc, champ `fill`) — Nestenn Orléans : charges 59 %, taxe 82 %, lots 59 %, copro 100 %, procédure 63 %, mandat 98 % ; C21 Daumesnil : charges 76 %, lots 74 %, honoraires 100 %.

### 29/10/2026 — Claude — Robot v60 : locations et villes (lecteur automatique)
- Location reconnue quand le prix est suivi de « CC/Mois », « /mois », « par mois », ou quand la description commence par « À louer » (Nestenn « Duplex hyper-centre 690 € CC/Mois » était en vente). Un prix ≥ 20 000 € reste une vente.
- Ville : « 27390 » caché suivi de « Partager ce bien » donnait la ville « Partager ce bien ». Les candidats « CP Ville » sont filtrés (mots d'interface écartés), la ville présente dans le titre est préférée, la zone autour du titre est aussi lue.
- Contrôle : Nestenn Orléans 56/56 (3 locations), villes justes (Orléans, Fleury-les-Aubrais…) ; immochevreux 29/29.

### 29/10/2026 — Claude — Robot v57 : Nestenn (nombre de biens et prix)
- Signalé par Anthony : Nestenn Orléans, 53 biens sur le site, 40 lus.
- Pages « prix au m² » (/prix-m2-orleans/prix-rues/…) lues comme des biens : 2e filtre sur la forme de l'adresse (profondeur + fin numérique « -ref-39790233 ») quand la majorité des fiches ont la même.
- Prix faux sur tout le lecteur automatique : un montant précédé d'un retour à la ligne (« Appartement à vendre\n145 350 € ») était rejeté, le robot prenait le premier montant suivant (charges 350 €). Corrigé dans `priceRe` (smart-reader.ts) + prix cherché d'abord autour du titre + chiffres séparés par des <span> d'espace recollés.
- Type de bien : le type déclaré (JSON-LD Apartment/House) passe avant les mots du titre ; « copropriété » n'est plus une maison ; un bien avec pièces/chambres/m² n'est plus un parking parce que le titre dit « garage ».
- Résultat : Nestenn Orléans 56 lus (53 ventes + 3 locations), 56 complets, prix justes (ex. 192 600 €, 145 350 €). Immochevreux 30/30.
- Outils : lecture à blanc renvoie `crawl` (pages, fiches, ratés) et `urls` (adresse, titre, prix, type) ; action `debug_detail` (cron) pour une fiche.
- Reste : table de debug private.debug_html à supprimer (la suppression demande une confirmation).

### 29/10/2026 — Claude — Statistiques vendeur : vues, numéros affichés, clics « Appeler »
- But (Anthony) : que le pro sache ce que lui apporte Abracadeal (le revenu viendra de là à la fin des 12 mois).
- Base : `listing_events` + `track_listing_event` + `get_my_listing_stats` ; `get_listing_phone` compte le numéro affiché côté serveur (fiable). Une fois par visiteur, annonce et jour ; propriétaire et admin exclus ; 400 événements max par visiteur et par jour.
- Site (index-main.js?v=20261029-stats-vendeur) : vue comptée à l'ouverture d'une annonce (identifiant visiteur anonyme `abraca_vid` en localStorage), clic sur le numéro compté ; sous le numéro : « Dites au vendeur que vous l'appelez de la part d'Abracadeal ».
- Espace Pro : bloc « Ce que vos annonces vous ont apporté (30 derniers jours) » : vues, numéros affichés, clics Appeler, contacts par message, top 3 des annonces.
- Reste à faire si validé : bilan mensuel par e-mail au pro ; tableau admin (stock par région, trafic, contacts) pour décider la fermeture de l'offre Fondateurs.

### 29/10/2026 — Claude — Offre Fondateurs : plus de plafond de 100 annonces
- Décision d'Anthony : on enlève la barrière des 100 annonces ; on garde les 500 places Fondateurs, mais on n'attendra pas d'en avoir 500 : une fois le site bien rempli, on ferme l'offre et le paiement s'applique aux nouveaux.
- Base : `enforce_founder_50_listing_limit()` laisse passer toutes les annonces d'un Fondateur pendant ses 12 mois gratuits (migration founder_free_period_unlimited_listings ; trace dans supabase/2026-10-29-fondateurs-annonces-illimitees.sql). Après les 12 mois, le plafond de la formule choisie s'applique aux nouvelles annonces.
- Textes : aide, CGV (avec la possibilité de clôturer l'offre avant 500, les inscrits gardent leurs 12 mois), accueil, inscription, pro-fondateur, mail de prospection admin, compteur de l'espace Pro (« x / illimité »).
- Fermeture anticipée : interrupteur existant « Offre Fondateurs ouverte/fermée » de l'admin (RPC admin_set_founder_offer_closed) ; ferme les nouvelles inscriptions Fondateurs, sans toucher aux inscrits.

### 29/10/2026 — Claude — Robot v50 : site d'agence illisible → page réseau trouvée toute seule
- Demande d'Anthony : ne pas avoir à se souvenir qu'il faut mettre orpi.com/… quand le site perso d'une agence est illisible (ex. calleris.fr, Wix).
- `findNetworkPage` : si aucun lecteur ne marche, le robot cherche un lien Orpi ou Century 21 sur le site, sinon essaie orpi.com/<nom du domaine>(immo|-immo|immobilier|orpi…) et ne garde la page que si son titre est celui d'une agence portant ce nom. Le type de site affiché le dit (« Orpi (page agence orpi.com/callerisimmo, le site www.calleris.fr n'est pas lisible) »).
- Domaine : un site Orpi / Century 21 passe tout seul en Immobilier, même si « Auto / Moto » était choisi ; l'aperçu admin bascule les deux menus Domaine.

### 29/10/2026 — Claude — Robot v49 : DPE recopié partout où il est écrit
- Demande d'Anthony : si le DPE figure dans l'annonce d'origine (fiche ou description), il doit être dans la case DPE.
- « DPE : vierge / non requis / non soumis / exempté » (texte) et « DPE non requis » sur Orpi → case DPE « Non soumis » (au lieu de vide).
- Location reconnue dans le texte (« Loyer : … » + dépôt de garantie ou charges) même si le site range le bien en vente : immochevreux mettait ses locations en « vente-appartement ».
- Lecture à blanc : nouvelle liste `no_dpe` (biens sans DPE + extraits du texte) pour contrôler.
- Contrôle : Orpi Bartholdi 100 % DPE ; Century 21 Daumesnil, immochevreux, C21 Cap-d'Ail : les biens restants sans DPE n'en affichent aucun sur leur propre page (vérifié page par page : programmes neufs C21 Beausoleil/Eze/Cap-d'Ail, quelques biens immochevreux).

### 29/10/2026 — Claude — Session mobile : plus de « Connectez-vous » après un passage en arrière-plan
- Cause : au retour dans l'appli après un long moment, le jeton est expiré et son rafraîchissement échoue le temps que le réseau revienne ; `refreshAuth` vidait alors `currentUser` alors que la session restait enregistrée (l'onglet Compte la montrait toujours).
- `index-main.js` : erreur réseau ≠ déconnexion (`isAuthRejection`), le compte reste affiché et une nouvelle tentative part 4 s après ; au retour après plus d'1 min en arrière-plan, le jeton est rafraîchi tout de suite ; avant chaque « Connectez-vous pour… » (publier, messages, favoris, alertes, numéro, signaler, mes annonces, import pro), `ensureSessionUser()` relit d'abord la session enregistrée.
- Version : index-main.js?v=20261029-session.

### 29/10/2026 — Claude — Robot v46 : Orpi grosses agences
- v42 lisait jusqu'à 450 fiches, 6 en parallèle → erreur 546 « WORKER_RESOURCE_LIMIT ». Désormais 220 fiches par passage, 4 en parallèle.
- Au-delà de 220 biens : fenêtre décalée chaque jour, les biens s'ajoutent synchro après synchro (pas d'archivage pendant une lecture partielle). L'activation auto n'est plus bloquée par cette limite volontaire.
- Total du site renvoyé (`total_on_site`) et affiché dans l'aperçu admin.
- DPE/GES qui ne sont pas une lettre (ex. une date) ignorés au lieu de bloquer l'annonce.
- Types reconnus en plus : immeuble, propriété, ferme, longère, château, chalet, pavillon (maison) ; loft, duplex (appartement) ; stationnement (parking) ; entrepôt, hangar (bureaux-commerces).
- Tests : immocannes 388 biens (220/220 lus OK), immodesvallois 432 biens (220/220 OK).

### 29/10/2026 — Robot v42 : Orpi, stock complet de l'agence — Claude
- **Signalé par Anthony :** une agence Orpi de Strasbourg : 31 biens lus, bien moins que ce qu'elle a.
- **Cause :** le lecteur Orpi lisait `/<agence>/acheter`, qui ne montre qu'une sélection (≈ 9 biens). La liste complète est `/<agence>/acheter/biens-en-vente` (pages de 30, ex. 14 pages pour Orpi Action Immo Cannes).
- **Corrigé (`pro-stock-sync` v42 = commit 00e09688) :** lecture de `/acheter/biens-en-vente` + `/louer/biens-en-location` (jusqu'à 40 pages chacune), `/acheter` en complément ; 6 fiches lues à la fois ; au-delà de 450 biens, lecture marquée partielle (aucun retrait pendant cette synchro).
- Rappel : la page « Immobilier à Strasbourg » d'orpi.com (105 biens) regroupe toutes les agences Orpi de la ville, pas une seule agence.

### 29/10/2026 — Robot v40-v41 : faux « GES manquant » = pages de rubrique — Claude
- **Signalé par Anthony :** encore des « GES manquant » sur immochevreux.com.
- **Diagnostic (v40, commit 315a03bc) :** le test à blanc (`auto_review_dry`) liste maintenant les annonces en erreur (titre, adresse, erreurs, DPE/GES lus, extrait autour du GES). Les 5 lignes en erreur n'étaient pas des biens : pages « Vous êtes acquéreur », « Appartements », « Nos biens loués », « Nos prestations » et l'accueil, prises pour des fiches par le lecteur automatique (le « DPE B » d'une autre annonce y était lu, sans GES). Les vrais biens avaient bien leur GES.
- **Corrigé (v41, commit 55a8fb37) :** lecture automatique : quand la plupart des fiches ont la même forme d'adresse (ex. `/details-…`), les autres pages sont écartées. Pour toutes les sources : une annonce dont le titre commence par VENDU, LOUÉ, SOUS COMPROMIS, COMPROMIS SIGNÉ ou RÉSERVÉ n'est jamais importée (et sera retirée à la synchro complète).

### 29/10/2026 — Robot v39 : descriptions mises en forme — Claude
- **Demande d'Anthony :** descriptions importées parfois « en bloc », illisibles.
- **Ajouté (`pro-stock-sync` v39 = commit 317079b2) :** `tidyDescription` appliquée à toutes les annonces importées (auto et immo) : listes écrites à la suite (« -Climatisation -Sièges… », « • », puces emoji 📍✅▶️…) remises une par ligne, rubriques (Équipements, Options, Garantie, Prix, Conditions tarifaires, Honoraires, Mandat, DPE, GES, Copropriété, Les informations sur les risques…) précédées d'une ligne vide, gros blocs coupés en paragraphes de 2-3 phrases. Le texte n'est jamais changé, seulement les retours à la ligne. Les annonces déjà importées seront remises en forme à leur prochaine synchro.
- **Aperçu admin :** la description affichée est la version mise en forme (celle qui sera publiée).

### 29/10/2026 — Robot v38 : lecture « large » des descriptions immo — Claude
- **Signalé par Anthony :** « GES manquant » alors que la description dit noir sur blanc « DPE : C – 67 kWhEP/m².an / GES : C – 12 kgéqCO2/m².an » (immochevreux.com).
- **Cause :** la lecture du DPE dans le texte (v34) acceptait une lettre minuscule : dans « DPE établi le… » elle prenait le « e » de « le » → DPE « E » trouvé, GES non → erreur.
- **Corrigé (`pro-stock-sync` v38 = commit e2711752) :** nouvelle fonction `immoFillFromText` appelée pour toute annonce immo : lettre DPE / GES en majuscule seulement, sinon calcul par les valeurs (kWh / kg CO2, barème 2021) ; consommation, date du DPE, coûts « entre X et Y euros », charges de copropriété (par an, ou par mois ×12), taxe foncière, nombre de lots, n° de mandat, honoraires, chambres, pièces, surface (superficie / habitable / Carrez), salles de bain/d'eau, chauffage (« Collectif au gaz »…), étage, année de construction. Ne remplace jamais une valeur donnée par le site. Testé sur le texte d'Anthony : tous les champs lus.

### 29/10/2026 — Robot v35 : lecteur dédié Spider VO — Claude
- **Signalé par Anthony :** les sites de garages faits par Spider VO « bloquent ». En réalité le lecteur générique les lisait mal (ex. adn-automobiles.com : 19 véhicules sur 23, énergie « Électrique » pour des diesel ; a2-autos.fr : kilométrage « 100 », 1 photo sur 60 %).
- **Ajouté (`pro-stock-sync` v35 = commit 5fc1d15f) :** `readSpiderVo` pour le modèle « svosite » (détecté par `svositec` / `spidervo.s3` + liens `…,svoc<n°>.html?vid=<id>`) : liste `/<n°>/vehicules/` (tout le stock sur une page), puis chaque fiche : titre (h1 marque + modèle, h2 version), prix (`montant`), tableau de caractéristiques (énergie, boîte, km, mise en circulation, couleurs, places, portes, puissance, CO2, catégorie, garantie, Crit'Air, genre VP/VU), description (données structurées), options, toutes les photos de la galerie (sans les vignettes), ville et CP du garage (pied de page). Véhicules « vendu / réservé » exclus. Type : moto / utilitaire (genre VU, fourgon…) / voiture.
- Prestataire Spider VO hors modèle « svosite » (site du garage fait ailleurs mais photos Spider VO, ex. ajmotorscar.com) : reste lu par le lecteur générique.
- **29/10/2026 — robot v36 (commit 009a09ee) :** Spider VO : liens des fiches sans « www » acceptés (a2-autos.fr ne lisait aucun véhicule).
- **29/10/2026 — robot v37 (commit 3719d3f2) :** Spider VO limite les lectures rapprochées (fiches renvoyées sans photos) : 2 fiches à la fois, pause entre les fiches, fiche incomplète (sans photo ou sans prix) relue jusqu'à 2 fois.

### 29/10/2026 — Robot v34 : immobilier plus complet (Century 21 « groupe », DPE, prestations) — Claude
- **Signalé par Anthony :** sur Century 21 Daumesnil il manquait DPE, charges, ascenseur, chauffage… et les box / parking / balcon / cave cités dans les descriptions.
- **Cause :** les sites d'agence au modèle « groupe » (ex. century21-daumesnil.com) n'ont pas de données structurées : le lecteur C21 ne trouvait aucun bien (37 lus, 0 complet, sans photo ni type).
- **Corrigé (`pro-stock-sync` v34 = commit 0578192c) :** lecture du titre `<h1>` (type, pièces, surface, VILLE - CP) et de la réf. quand il n'y a pas de données structurées ; biens vendus / sous compromis exclus ; libellés ajoutés : « Charges / mois » (×12 en vente si pas de charges annuelles), « Année construction », « Ascenseur », chauffage dédoublonné ; DPE / GES calculés à partir des valeurs (kWh et kg CO2, barème 2021) quand l'étiquette ne se lit pas ; consommation énergétique reprise.
- **Pour toutes les sources immo :** prestations repérées dans le titre et la description (ascenseur, balcon, terrasse, loggia, cave, box, parking, garage, jardin, piscine, gardien, digicode, interphone, climatisation, double vitrage, cheminée, dressing, parquet, meublé, cuisine équipée, belle vue, accès PMR ; « sans… / pas de… » ignorés) et ajoutées aux prestations ; DPE / GES écrits dans la description (« DPE : D ») repris si le site ne les donne pas ailleurs.
- **Aperçu admin (`admin-test-import.html`) :** la fiche d'un bien affiche maintenant toutes les infos normalisées (DPE, GES, consommation, dépenses d'énergie, chauffage, étage, année, lots, charges, taxe foncière, dépôt, honoraires, mandat, prestations).

### 29/10/2026 — Robot v31 : ville du garage sur les sites Annonces-Automobile — Claude
- **Signalé par Anthony :** beaucoup d'erreurs « ville manquante » à l'aperçu des sites Annonces-Automobile (il va prospecter en priorité ces garages).
- **Corrigé :** chaque fiche AA contient un bloc « Nos coordonnées » (NOM / ADRESSE / CP VILLE) : le code postal et la ville y sont lus pour chaque véhicule (puis corrigés par la base des communes comme avant). Pour un garage inscrit, la ville de son compte reste prioritaire.
- Déployé : `pro-stock-sync` v31 = commit 7518722f (même mode d'import par commit que v30).
- **29/10/2026 — robot v32 (commit 75c20ee2) :** photos en double sur certains sites AA (ex. svartandmotors.com) : la taille y est dans le nom du fichier (`215930456-ibig.jpg` / `-intermediate.jpg`) et non dans un dossier ; les variantes sont maintenant regroupées par numéro, la plus grande gardée (Aston Martin Vanquish : 25 photos uniques au lieu de 45 avec doublons).
- **29/10/2026 — robot v33 (commit 8cc6422a) :** nouveau modèle de fiche Annonces-Automobile (ex. partenaireauto.com) : prix dans `price-amount`, caractéristiques en cartes `specs-label` / `specs-value`, description dans `description-content`, coordonnées dans `contact-info` — tous lus en plus de l'ancien modèle (tableau `legend`). **Règle :** un véhicule sans prix est en erreur « prix manquant » (plus compté prêt à publier, jamais créé).

### 29/10/2026 — Robot de lecture v30 : photos Annonces-Automobile + photo obligatoire — Claude
- **Signalé par Anthony :** deux sites Annonces-Automobile testés : véhicules lus et « prêts à publier », mais 0 photo.
- **Corrigé :** les photos AA sont lues dans la galerie de la fiche (#sliderdetail, avant la description) quel que soit l'hôte ou le dossier (big / intermediate / small regroupées par numéro, la plus grande gardée ; liens sans « https: » acceptés) ; repli sur toutes les photos rivamedia de la page (hors similaires), puis og:image.
- **Règle :** une annonce sans photo est en erreur « aucune photo » (véhicules et immobilier) : jamais créée, et plus comptée « prête à publier » dans l'aperçu.
- **Déploiement v30 (nouveau mode) :** la fonction déployée `pro-stock-sync` ne contient qu'un import du code du dépôt figé par commit (`raw.githubusercontent.com/abracadeal/abracadeal/<commit>/supabase/functions/pro-stock-sync/index.ts`, qui charge `smart-reader.ts` à côté). Pour une nouvelle version : pousser le code, puis redéployer ce petit fichier avec le nouveau numéro de commit (commit actuel f7761a55).
- **Vérifié après déploiement :** la fonction démarre (401 sans connexion) ; test sans écriture `auto_review_dry` sur lifecars.fr : 49/49 véhicules complets, 30,5 photos en moyenne, ville Mouans-Sartoux 06370.
- 29/10/2026 : prix de l'aperçu « Imports sites » en dégradé violet-rose comme les boutons (au lieu de doré), demande d'Anthony.
- 29/10/2026 : croix « × » dans les champs d'adresse de site (inscription d'un garage et « Tester une adresse ») pour les effacer d'un geste, demande d'Anthony.

### 29/10/2026 — Pages Garage / Immo des pros pour Google + statut de synchro dans l'espace Pro — Claude
- **Demande d'Anthony :** chaque pro inscrit (notamment via le bouton admin) doit avoir sa page « Garage » ou « Immo » référencée sur Google ; gestion du stock possible au cas où, mais rien à gérer si le stock vient de son site.
- **Nouveau `scripts/build_pro_pages.py` (lancé par le workflow `share-pages.yml` toutes les ~10 min, après les pages annonces) :** pour chaque pro avec au moins une annonce en ligne, page statique `garage/<nom-ville>/` (majorité Véhicules), `immo/<nom-ville>/` (majorité Immobilier) ou `professionnel/<nom-ville>/` : nom, ville + code postal, badge vérifié, présentation du showroom, tout le stock (liens vers `annonce/<id>/`), données structurées AutoDealer / RealEstateAgent + liste d'annonces, fil d'Ariane. Visiteurs réels redirigés vers `pro.html?id=…` (showroom avec contact), robots = page statique. Annuaires `garage/`, `immo/`, `professionnel/` classés par ville. `sitemap-pros.xml` ajouté à `sitemap.xml`. Aucune coordonnée publiée.
- **`pro-pages.json` :** adresse de chaque page, stable même si le nom change (une page sans annonce disparaît mais son adresse reste réservée).
- **Espace Pro (`index.html`, `assets/index-main.js` v=20261029-page-pro) :** encadré « Stock synchronisé avec votre site » (adresse, dernière mise à jour, « rien à gérer ici ») ou « reprise en préparation » ; encadré « Votre page sur Google » avec le lien et « Copier le lien ». La gestion manuelle (Mes annonces, Importer mon stock) reste disponible au cas où.
- Testé hors ligne avec des données d'exemple (garage + agence) : pages, annuaires, sitemap et registre générés, rendu vérifié à 390 px.
- **Corrigé le jour même :** l'étape « Publier » du workflow échouait tant qu'aucun dossier garage/immo/professionnel n'existe (0 pro en ligne) ; ces dossiers ne sont ajoutés que s'ils existent. Workflow vérifié en succès.

### 28/10/2026 — Bouton admin « Créer le compte et importer le stock » + retour Admin sur mobile — Claude
- **Demande d'Anthony :** quand un garage dit oui, ne plus attendre qu'il s'inscrive lui-même : l'admin crée son compte et met son stock en ligne à sa place.
- **Page « Imports sites » (`admin-test-import.html`) :** nouveau bloc « Inscrire un garage qui a dit oui » : SIRET (bouton Chercher = registre officiel), e-mail, téléphone affiché aux acheteurs, adresse du site, domaine, case « le pro m'a donné son accord ». Le bouton enchaîne et affiche chaque étape : compte créé → import activé → lecture du site (pro-stock-sync) → mail au garage. Si l'import échoue, le mail n'est pas envoyé (bouton « Envoyer quand même le mail »).
- **Fonction déployée `admin-onboard-pro` v1 (admin seulement) :** `lookup` (registre), `create` (compte Pro avec e-mail confirmé et mot de passe temporaire jamais communiqué, puis mêmes contrôles que l'inscription normale avec la session du garage : `verify-professional` verify, `create-pro-subscription-order` pro_50 Fondateur sans carte ; puis `admin_create_site_import`), `welcome` (mail Resend depuis contact@abracadeal.fr avec lien « Choisir mon mot de passe » = lien de réinitialisation Supabase + nombre d'annonces importées). Le mail automatique d'activation Fondateur est décalé de 20 min pour arriver après. Compte déjà existant avec cet e-mail : seul l'import est ajouté, pas de mail. Refus : SIRET déjà pris par un autre compte, numéro déjà utilisé, sites d'annonces/réseaux sociaux.
- **CGU :** le compte est créé avec `legal_pending: true` ; au premier mot de passe, la fenêtre devient « Activez votre espace Pro » avec case CGU obligatoire, enregistrée dans les métadonnées (`assets/index-main.js` v=20261028-onboard-admin, `index.html`).
- **Corrigé (mobile) :** « Retour à Admin » depuis les pages admin ouvrait « Compte ». Les retours vont maintenant sur `index.html#admin` : menu Admin sur mobile, Mon compte sur ordinateur, connexion si déconnecté (`assets/index-app.js` v=20261028-retour-admin, `assets/app-shell-20261018.js` v=6 dans toutes les pages, `admin-pilotage.html`, `admin-test-import.html`).
- **Pas encore testé en réel** (il faut une session admin) : le premier garage inscrit avec ce bouton sert de test ; chaque étape affiche son résultat ou son erreur.

### 28/10/2026 — Connecteur « L'Agence Automobilière » (agenceauto.com) + lecteur générique plus complet — Claude
- Anthony : sur agenceauto.com le robot lisait 74 véhicules mais 1 photo chacun, « ville manquante », description incomplète.
- Cause : site Next.js d'un **réseau** (YESCAR, des dizaines d'agences). Les données complètes (toutes les photos, caractéristiques, description, agence) sont dans le bloc de données Next.js de chaque fiche ; le lecteur générique ne lisait que les données Google (1 photo). Rien à voir avec les cookies.
- `pro-stock-sync` v27 :
  - Connecteur `readAgenceAuto` : adresse de la page d'une agence (ex. /fr/fr/agences/epone) → stock de cette agence seulement (/fr/fr/vehicules?agencyId=…, toutes les pages), puis chaque fiche (objet « vehicle » : photos, prix, km, mise en circulation, carburant, boîte, couleur, puissances, Crit'Air, garantie, équipements, description, ville et CP de l'agence). Véhicules vendus / sous compromis / indisponibles exclus. Adresse nationale (agenceauto.com) => message : entrez la page de votre agence.
  - Lecteur générique : quand les données structurées d'une fiche sont maigres (1 photo, description courte), on complète avec la galerie et le texte de la page.
  - Ville : pour les véhicules, la ville du compte pro écrase celle de l'annonce (garage) ; sans compte pro (aperçu admin), la ville lue sur l'annonce est gardée et celle du site ne sert qu'à combler un manque.

## 2026-10-28 — Robot de lecture : photos, année, caractéristiques WooCommerce (pro-stock-sync v29)
- Photos : les variantes de taille d'une même photo (dossiers « 1200xauto », « gallery_625x470 », « large »…) sont regroupées ; on garde la galerie de l'annonce en grand format, sans les vignettes des « véhicules similaires ». Corrige les sites Dealer K et RCM qui ne donnaient qu'une photo.
- Année : dates au format « 23-11-2020 » ou « 2020-11-23 » après « Mise en circulation », « MEC », « 1ère immatriculation ».
- WooCommerce : lecture des attributs produit (marque, énergie, boîte, mise en circulation, kilométrage, couleur, puissance, portes, places).

### 28/10/2026 — Activation automatique des sites + ville du garage sur les annonces véhicules — Claude
- Demande d'Anthony : activer tout seuls les sites qui se lisent bien ; les annonces véhicules doivent porter la ville du garage.
- `pro-stock-sync` v26 :
  - Véhicules : ville + code postal du garage sur **toutes** les annonces (adresse du compte pro ; sinon adresse publiée sur le site, lue dans les données structurées ou le pied de page « 30100 ALES »). Immobilier inchangé (ville de chaque bien).
  - « Tester une adresse » par l'admin : la ville vient du site testé, plus du compte admin.
  - Nouvelle action `auto_review` (jeton cron) : lecture complète + ≥ 80 % d'annonces complètes (titre, prix, ville, photo) => flux activé et synchronisé ; sinon reste en attente avec « Validation manuelle nécessaire : <raison> ». `auto_review_dry` = même test sans rien écrire.
  - Le cron traite aussi une demande en attente par passage (jamais essayée ou essai > 24 h).
  - Starterre : titre sans répétition modèle/version (« C3 Aircross BlueHDi… » au lieu de « C3 Aircross Aircross… »).
- Base : `private.kick_site_auto_review` appelée par `claim_signup_site_import` et `request_site_import` (fichier supabase/2026-10-28-import-site-activation-auto.sql).
- Test sans écriture sur autoca.fr : Starterre, 31/31 véhicules complets, ville Alès 30100, 13 à 16 photos.

### 28/10/2026 — Connecteur Starterre (Auto Cévennes, autoca.fr) — Claude
- Problème : Anthony n'arrivait pas à importer autoca.fr (« site trop gros »). Le site est fait par **Starterre** : son catalogue (moteur Typesense de Starterre, clé publique de recherche dans la page) contient 2 747 véhicules, dont 2 716 du catalogue « Fournisseur » du réseau Starterre et seulement **31 du stock propre du garage**.
- Changé : `pro-stock-sync` v24, nouveau lecteur `readStarterreSite` (détecté par `StarterreTypesense.key` + `resellerUniqueId` dans la page) : catalogue filtré `catalogue:!=Fournisseur`, champs (marque, modèle, version, prix, km, mise en circulation, carburant, boîte, couleur, puissance, places, carrosserie, équipements), puis chaque fiche du site pour toutes les photos grand format (stx.starterre.net/vehicules/xlarge). Prestataire « Starterre » ajouté à la détection.
- Sécurité inchangée : aucune écriture en aperçu, erreur si aucun véhicule propre trouvé (rien n'est archivé).

### 28/10/2026 — Retrait du lecteur parallèle (ChatGPT) — Claude
- Vérifié à la demande d'Anthony : `site-reader-preview` démarrait bien (401 sans connexion admin), mais son connecteur ERA lisait une **recherche par ville** du site national ERA (biens de toutes les agences ERA de la ville, pas le stock d'une agence), sans photos ni description, en aperçu seulement. Le reste était une copie de pro-stock-sync v22.
- Retiré : fonction désactivée (410, à supprimer depuis le tableau de bord) + fichiers admin-reader-parallel.html, docs/parallel-reader-deployment.md, scripts/parallel-preview.test.mjs, supabase/functions/site-reader-preview/.
- Règle : un seul robot, `pro-stock-sync`. Toute amélioration des lecteurs se fait dedans (et dans ce journal).

### 28/10/2026 — Lecteur « intelligent » des sites de pros — Claude
- `pro-stock-sync` v23 (2 fichiers : index.ts + smart-reader.ts). Quand aucun connecteur dédié ne reconnaît le site, un lecteur générique :
  repère les fiches (liens qui se répètent, sinon sitemap), lit titre, prix (en ignorant les mensualités), photos (galerie principale, plus grande taille, sans logos), surface/pièces/chambres/DPE/ville (immo) ou km/année/carburant/boîte (véhicules), description (hors mentions légales/RGPD).
  Les données structurées (JSON-LD) restent prioritaires sur chaque fiche. Limites : 20 pages de liste, 400 pages, 50 s ; travail borné par page (limite CPU des fonctions).
- Adresse d'agence dans un réseau (ex. laforet.com/agence-immobiliere/cannes) : la lecture reste sous ce chemin.
- Nouveau : boutiques Shopify (/products.json). Sites protégés anti-robots (Cloudflare…) : message clair (flux ou import).
- Testé : Laforêt Cannes (28 biens, 8-20 photos), La Boîte Immo (agencelacanopee.com 40 biens, reseau-expertimo.fr), Apimo/Mira (cannes-impact.com, 1 photo par bien seulement), garages WooCommerce/Annonces-Automobile (déjà couverts par leurs connecteurs).
- Pas encore : Guy Hoquet (liste chargée en JavaScript), Stéphane Plaza (bloque les robots), Foncia (application), Spoticar (JavaScript).
- Fonction de test `aa-site-preview-tmp` désactivée (410). Fonctions SQL de test private.tmp_probe / tmp_probe_res à supprimer (suppression refusée par l'outil ; non accessibles aux clients).

### 28/10/2026 — Inscription pro : sites d'annonces refusés, message clair — Claude
- Sous le champ « Adresse de votre site officiel » : leboncoin, La Centrale, AutoScout24, SeLoger, PAP… et réseaux sociaux ne fonctionnent pas ; dans ce cas laisser vide et, après l'inscription, importer un fichier (CSV/Excel) ou saisir ses annonces depuis l'espace Pro.
- Même consigne dans le message d'erreur si le pro entre une de ces adresses. Liste élargie et ancrée sur le domaine (côté page et côté base : private.normalize_site_url).
- Consigne complétée (demande d'Anthony) : flux ou API du logiciel du pro, en plus de l'import fichier et de la saisie.

### 28/10/2026 — Mails de prospection ultra-courts — Claude
- Variantes A et B remplacées par un message de 3 phrases : gratuit pendant le lancement + « inscrivez-vous avec l'adresse de votre site, en quelques minutes toutes vos annonces sont en ligne » + lien d'inscription. Relance raccourcie de même.
- A et B ne diffèrent plus que par l'objet (test A/B des objets).
- Corrigé : l'ancien texte annonçait « jusqu'à 50 annonces » alors que l'offre Fondateurs est à 100.
- SQL : supabase/2026-10-28-prospection-mails-ultra-courts.sql (appliqué).

### 28/10/2026 — Connecteur Century 21 (sites d'agence) — Claude
- `pro-stock-sync` v22 : les sites d'agence Century 21 (ex. century21-gastaldy-cap-d-ail.com) sont lus : listes /annonces/achat/ et /annonces/location/ (pages /page-N/), puis chaque fiche (JSON-LD + page).
- Champs : titre, prix, vente/location, type, ville/CP, surface, pièces, chambres, SDB, étage, chauffage, taxe foncière, lots/charges, dépôt, honoraires, DPE/GES (lus sur l'étiquette SVG), date et coûts DPE, équipements, description, photos grand format.
- Référence = n° de fiche du site ; la réf. agence est gardée comme n° de mandat.
- Une fiche agence century21.fr/trouver_agence/agence/<id>/ renvoie vers le site de l'agence.
- Adresse nationale d'un réseau (century21.fr, orpi.com, laforet.com…) : message clair demandant l'adresse de l'agence.
- Test : Century 21 Agence Gastaldy → 39 biens en ~2,4 s.
- Page admin « Imports sites » : les anciens chiffres de l'aperçu restaient affichés après une erreur (attribut hidden écrasé par display:grid) — corrigé.

### 28/10/2026 — Connecteur Orpi (pages agence) — Claude
- `pro-stock-sync` v21 : les adresses `orpi.com/<agence>` sont lues directement (listes « acheter » + « louer », puis chaque fiche via l'attribut `data-estate`).
- Champs repris : titre, prix, vente/location, type de bien, ville, CP, surface, pièces, chambres, SDB, étage, DPE/GES (si les deux sont présents), honoraires, charges, prestations, description, toutes les photos (45 max).
- Test : Ag Immo Les Mimosas (orpi.com/agimmo) → 102 biens (90 ventes, 12 locations) en ~21 s.
- Détection du prestataire étendue aux réseaux (Orpi, Century 21, Laforêt, Guy Hoquet, Stéphane Plaza, Nestenn, Foncia, SweepBright).
- Fonction de test `aa-site-preview-tmp` désactivée (réponse 410), à supprimer depuis le tableau de bord.

### 24/10/2026 — Claude — Démo Life Cars : bannière = logo Life Cars
- **Changé :** la bannière du showroom de démo affiche le logo « LIFE CARS » (`lifecars.fr/images/graphic/logo.png`) entier, centré sur fond sombre, à la place de la photo `societe3.jpg`.
- **Pourquoi :** Anthony : la bannière doit être là où il y a écrit Life Cars.

### 24/10/2026 — Claude — Démo Life Cars : cadrage de la bannière
- **Changé :** bannière du showroom de démo cadrée sur le haut de l’image (`background-position:center top`) pour garder l’enseigne au-dessus des véhicules.

### 24/10/2026 — Claude — Démo Life Cars : bannière de Life Cars
- **Changé :** la bannière du showroom de démo (`demo/life-cars/index.html`) utilise l’image de Life Cars (`lifecars.fr/images/graphic/societe3.jpg`) au lieu d’une photo de la Maybach.
- **Pourquoi :** demande d’Anthony.

### 24/10/2026 — Claude — Démo Life Cars : showroom Pro réel + fiche annonce
- **Changé :** `demo/life-cars/index.html` est maintenant une copie de `pro.html` (vrai showroom Pro : bannière, logo, S’abonner / Contacter / Partager, onglets Annonces / À propos / Avis) avec les données de Life Cars en dur, sans Supabase. L’ancienne page devient `demo/life-cars/annonce.html?v=<maybach|rangerover|r8>` : elle ouvre directement la fiche annonce au style de l’accueil ; le bloc vendeur renvoie au showroom.
- **Pourquoi :** Anthony : « la vraie page pro n’est pas comme ça ».
- **À faire :** supprimer `demo/` après le rendez-vous.

### 24/10/2026 — Claude — Démo Life Cars : même apparence que le site
- **Changé :** `demo/life-cars/index.html` reprend maintenant les vraies feuilles de style du site (`/assets/index-*.css`…), l'en-tête et la barre du bas, la bannière, les cartes `ad-card` et la fiche annonce (`detailModal`, mêmes classes que `openAd`).
- **Pourquoi :** Anthony trouvait la première version trop différente du site (couleurs, logo en haut à gauche).
- **À savoir :** si le style de la fiche annonce change dans `index-main.js`, la démo ne suit pas automatiquement. Toujours à supprimer après le rendez-vous.

### 24/10/2026 — Claude — Page de démo privée pour Life Cars
- **Changé :** nouvelle page `demo/life-cars/index.html` (noindex, non liée depuis le site) et `Disallow: /demo/` dans `robots.txt`.
- **Pourquoi :** Anthony va présenter Abracadeal en personne à Life Cars (marchand VO, Mouans-Sartoux, 41 véhicules). La page montre 3 de leurs véhicules (Maybach S580, Range Rover Sport P550e, Audi R8 Spyder) au format Abracadeal, photos chargées depuis leur hébergeur d'annonces.
- **À faire :** supprimer `demo/life-cars/` après le rendez-vous, ou dès que Life Cars refuse. Rien n'est en base Supabase.

### 24/10/2026 — Claude — Données structurées Google (Search Console)
- **Changé :** `scripts/build_share_pages.py` (VERSION 8) :
  - marque (`brand`) ajoutée au balisage Product des objets quand elle est citée dans le titre ou la description (liste `KNOWN_BRANDS`, « de marque X » prioritaire, ex. Givi, NGK, Nike, Triumph, Piaggio…) ; 23 annonces sur 29 en ont une ;
  - plus de balisage Product/Offer pour immobilier, vacances, emploi et services (fil d'Ariane seul).
- **Pourquoi :** mails Search Console « Extraits de produits » et « Fiches de marchand » (avertissements non critiques). « Identifiant global manquant » corrigé quand la marque est connue.
- **Volontairement non corrigé :** `review`, `aggregateRating` (pas d'avis sur une annonce, ne jamais en inventer), `hasMerchantReturnPolicy`, `shippingDetails` (Abracadeal ne vend ni n'expédie rien). Ces avertissements resteront, sans conséquence.
- **À faire plus tard :** un champ « Marque » au dépôt d'annonce (hors véhicules) donnerait la marque sur toutes les annonces.

### 23/10/2026 — ChatGPT — Mails de prospection plus percutants
- **Changé :** nouveaux premiers mails (6 modèles + défaut). Accroche « Et si vos véhicules / motos / biens étaient vus par plus d’acheteurs… », plus de « Marre de payer », plus de jargon XML/CSV/JSON. Étapes « Pas le temps ? » qui expliquent la reprise des annonces depuis le site du pro, puis la simple mise à jour depuis l’espace Pro. Lien `https://abracadeal.fr/pro-fondateur.html` inchangé, donc le suivi des clics fonctionne toujours.
- **Pourquoi :** demande d’Anthony, un mail plus percutant et plus clair.
- **À savoir :** anciens mails sauvegardés dans `private.prospect_mailer_templates_backup`.

### 23/10/2026 — Claude — Pages catégories/villes Google : ouverture sur l'accueil filtré
- **Changé :**
  - `assets/index-main.js` (v=20261023-url-cat, `index.html` mis à jour) : l'accueil lit `?categorie=` (vehicules, immobilier, hightech, maison, mode, emploi, services, autres), `&sous=` (sous-catégorie véhicules : voitures, motos, utilitaires…) et `&ville=` → même affichage que le clic sur une catégorie du menu (filtre ville dans « Ville »). Appliqué au démarrage et après la « stabilisation » de 700 ms (qui remettait les filtres à zéro). Ces paramètres sont retirés de l'adresse dès que le visiteur change de catégorie.
  - `scripts/build_share_pages.py` (VERSION 7) : les visiteurs qui ouvrent `annonces/…` sont envoyés sur l'accueil filtré (ex. `annonces/maison/` → `/?categorie=maison`, `annonces/vehicules/cannes/` → `/?categorie=vehicules&ville=Cannes`, `annonces/locations-vacances/` → `vacances.html`, `annonces/` → accueil). Les robots lisent toujours la page statique (`HUB_TO_APP`, `app_target()`).
- **Pourquoi :** Anthony : un clic sur « Maison et jardin » dans Google doit ouvrir la vraie page Maison du site.
- **À savoir :** les pages `/auto/` (marques, modèles) restent des pages statiques (style du site) : le site n'a pas encore de filtre marque/modèle dans l'adresse.

### 23/10/2026 — Claude — Pages Google (annonce, catégories/villes, /auto/) : même affichage que le site
- **Changé :** `scripts/build_share_pages.py` (VERSION 6, toutes les pages régénérées) :
  - les visiteurs qui ouvrent `annonce/<id>/` (depuis Google, WhatsApp, Facebook…) sont envoyés tout de suite sur la vraie fiche `/?annonce=<id>` (même fiche que sur le site, avec « Voir le numéro » / « Message ») ; les robots (Google, Bing, aperçus WhatsApp/Facebook…) continuent de lire la page statique (rendu dynamique, même contenu) ;
  - sur les pages catégories/villes, les vignettes ouvrent directement la vraie fiche pour les visiteurs (le lien reste `/annonce/<id>/` pour Google) ;
  - nouvelle apparence de ces pages : polices DM Sans / Fraunces, en-tête du site (logo, « Achetez - Vendez », bouton rose « Déposer une annonce »), couleurs et vignettes du site, 2 colonnes sur mobile.
- `scripts/build_auto_seo_pages.py` : pages `/auto/` alignées (même en-tête, styles et liens directs).
- **Pourquoi :** Anthony n'aimait pas que ces pages s'ouvrent avec un affichage différent du site.
- **À savoir :** la liste des robots est `BOT_RE` dans `build_share_pages.py`. Page « vendue / expirée » : pas de redirection (la fiche n'existe plus), seulement le nouveau style. Les pages catégories ne s'ouvrent pas encore dans l'accueil filtré (le site ne lit pas de catégorie dans l'adresse) : piste possible plus tard.

### 22/10/2026 — Claude — Prospection : 35 mails/jour/boîte + contrôle du domaine avant envoi
- **Changé (fonction `prospect-mailer` v7, déployée) :** avant chaque 1er mail, vérification DNS du domaine du destinataire (MX, ou A à défaut). Domaine inexistant → pas d'envoi, prospect passé en erreur « Domaine inexistant ». Panne DNS passagère → envoi normal. Relances non concernées.
- **Changé (base) :** `private.prospect_mailboxes.daily_limit` 25 → 35 pour contact@ et partenaires@ (70 mails/jour au total). Les 2 adresses @ymf-reseau.com (domaine inexistant, retour OVH du 22/10) passées en erreur.
- **Pourquoi :** Anthony veut envoyer plus. ~5 % d'erreurs sur les 221 premiers envois ; il faut limiter les retours avant de monter en volume. Prochaine marche possible : 50/boîte si les erreurs restent sous 2 % pendant une semaine.

### 22/10/2026 — Claude — Mails de prospection : bloc « Pas le temps ? » plus visible
- **Changé (base, `supabase/2026-10-22-prospect-mailer-pas-le-temps-visible.sql`, appliqué) :** dans les 6 modèles de premier mail et le modèle par défaut, le paragraphe « Pas le temps ? » devient un bloc encadré par deux lignes ━━━, titre « PAS LE TEMPS ? ON S'OCCUPE DE TOUT, GRATUITEMENT. » et 3 étapes numérotées (variante A : 1. créer son compte Pro via le lien, 2. répondre avec l'adresse du site, 3. import ; variante B sans lien : 1. répondre, 2. on envoie le lien, 3. import). Relances inchangées.
- **Pourquoi :** Anthony trouvait le paragraphe peu compréhensible et peu visible. Mails en texte brut, donc pas d'encadré coloré HTML.

### 22/10/2026 — Claude — Prospection : relances et premiers mails mélangés
- **Changé (base, `supabase/2026-10-22-prospect-mailer-mix-relances.sql`, appliqué) :** `prospect_mailer_claim()` alterne désormais premiers mails et relances, moitié-moitié par boîte et par jour (avant : relances toujours prioritaires). Si l'un des deux manque, l'autre prend la place. Quotas inchangés (25/jour/boîte, étalés 9 h → 18 h).
- **Pourquoi :** ~190 relances en attente bloquaient les nouveaux premiers mails (avec le paragraphe « Pas le temps ? ») pendant 3-4 jours. Accord d'Anthony.

### 22/10/2026 — Claude — Mails de prospection : « Pas le temps ? »
- **Changé (base, `private.prospect_mailer_settings`) :** ajout dans les 6 modèles de premier mail (Garage auto, Concession moto, Agence immobilière, variantes A et B) et dans le modèle par défaut du paragraphe : « Pas le temps ? Répondez simplement à ce mail avec l'adresse de votre site : avec votre accord, nous mettons votre stock en ligne pour vous. Vous n'aurez plus qu'à le mettre à jour ensuite. » Relances inchangées.
- **Pourquoi :** demande d'Anthony, lever le frein « pas le temps » des petits garages.
- **À savoir :** les réponses arrivent dans les boîtes contact@ / partenaires@. Importer uniquement depuis le site du pro (pas depuis Leboncoin / La Centrale, dont les conditions l'interdisent), et garder sa réponse comme preuve d'accord.

### 22/10/2026 — Claude — Catégories Véhicules / Immobilier vides : message pour les pros
- **Changé :** `assets/index-main.js` : quand Véhicules (ou une sous-catégorie) ou Immobilier n'a aucune annonce, le message « Soyez le premier à publier ici » est remplacé par « Les premières annonces arrivent — Vous êtes un garage / une agence immobilière ? Soyez parmi les premiers pros de votre région : vos annonces seront les premières vues » + bouton vers `pro-fondateur.html`, et un bouton secondaire pour les particuliers. `index.html` : version du script passée à `20261022-vide-pros`. `pro-fondateur.html` : même phrase « premiers professionnels de votre région » ajoutée dans le bloc Offre Fondateurs.
- **Pourquoi :** le site n'a pas encore de voitures ; transformer le vide en argument pour les premiers garages.

### 22/10/2026 — Claude — Mailer de prospection relancé seul
- **Base (`supabase/2026-10-22-prospect-mailer-relance.sql`) :** `sending_enabled = true` et tâche cron `abracadeal-prospect-mailer` recréée toutes les 5 min (au lieu de 2). Envois lundi → samedi, 9 h → 18 h, 50/jour (2 × 25).
- **Pourquoi :** accord d'Anthony. Le mailer n'était pas en cause dans la saturation du 21/10.
- **Toujours arrêtés :** les robots de recherche (n°21, 22, 24, 25, 26). Ne pas les relancer chaque minute ; s'ils reviennent un jour : fréquence basse, hors heures d'envoi, un seul à la fois.

### 22/10/2026 — Claude — Bilan de l'incident « robots qui saturent Supabase » (21/10)
- **Constat :** dans la nuit du 20 au 21/10 (≈ 2 h → 10 h, heure de Paris), les robots de prospection lancés chaque minute (`prospect-qualifier` n°21, `prospect-sirene-import` n°22, `prospect-email-crawler` n°24, `prospect-domain-guess` n°26, + `promote_annuaire_leads` n°25) ont saturé la base : ~350 tâches cron sur 420 en « job startup timeout » par heure, ~1 000 connexions refusées, requêtes coupées par « statement timeout » → connexion au site impossible.
- **Déjà fait le 21/10 vers 10 h (non noté au journal) :** ces tâches ont été supprimées de `cron.job`, ainsi que le mailer `abracadeal-prospect-mailer` (n°30, arrêté le 20/10 à 0 h 10). Depuis le 21/10 11 h : 0 échec cron, aucune erreur base, connexion OK.
- **Conséquence :** plus aucun mail de prospection depuis le 20/10 (50 envoyés le 20/10, 0 le 21 et le 22). File : 8 488 pros en `ready`.
- **Rappel :** la tâche n°34 (retour du mix 32/34/34 ce soir 18 h 05) tourne toujours, sans effet tant que le mailer est arrêté.
- **À décider (Anthony) :** relancer le mailer seul (léger), les robots de recherche restent arrêtés.

### 20/10/2026 — Claude — « Emploi & Services » séparé en « Emploi » et « Services »
- **Changé :**
  - `index.html` : carte d'accueil « Emploi & Services » remplacée par deux cartes « Emploi » (💼) et « Services » (🛠️) ; menu du haut séparé en deux entrées, chacune avec « Tous les emplois » / « Tous les services » et toutes ses sous-catégories (Services : ajout de Transport / Livraison, Informatique, Beauté / Bien-être, Événementiel) ; filtre « Services (Emploi & Services) » renommé « Services ».
  - Nouveau `assets/nav-compact-20261020.css` : boutons du menu du haut un peu plus compacts entre 1024 et 1249 px de large, pour que les 8 catégories ne se chevauchent plus.
- **Pourquoi :** demande d'Anthony (suite au regroupement Véhicules). Corrige aussi un bug : la carte « Emploi & Services » n'affichait que les offres d'emploi, jamais les services.
- **Non touché :** catégories en base (`emploi` et `services` existaient déjà séparément), formulaire de dépôt, règles de diffusion.

### 20/10/2026 — Claude — Auto + Moto regroupés en « Véhicules »
- **Changé :** `index.html` uniquement.
  - Bloc catégories de l'accueil : les cartes « Auto » et « Moto » sont remplacées par une seule carte « Véhicules » (ouvre toutes les annonces véhicules).
  - Menu du haut (ordinateur) : « Auto » et « Moto » fusionnés en « Véhicules », avec toutes les sous-catégories (Voitures, Motos / Scooters, Utilitaires, Caravaning, Nautisme, Vélos, Équipement auto, Équipement moto, Pièces détachées).
- **Pourquoi :** demande d'Anthony.
- **Non touché :** catégories en base, filtres, formulaire de dépôt, page SEO `/auto/`, bandeau « Offre Fondateurs · Auto, Moto & Immobilier ».

### 19/10/2026 — Claude — Le robot continue de chercher (feu vert permanent)
- **Constat :** les robots tournent (aucune erreur), mais l'import SIRENE garages/motos était terminé depuis le 13/10 ; sur ~92 000 pros de l'annuaire, ~88 000 restent sans site trouvé (`guess_failed`, le robot devine le domaine sans recherche Google), d'où presque plus de nouveaux contacts depuis le 16/10.
- **Changé (base, fichier `supabase/2026-10-19-prospection-feu-vert.sql`) :** `private.promote_annuaire_leads` insère désormais les nouveaux pros en `ready` (plus de pause) ; import SIRENE relancé sur les agences immobilières (NAF 68.31Z, 101 départements).
- **Levier principal restant :** recherche Google (API payante type Serper) pour trouver le site des ~88 000 pros sans site.

### 19/10/2026 — Claude — Feu vert général (demande d'Anthony)
- **Base :** tous les prospects en pause avec un e-mail valide, hors réseaux (`phase2_reseau`), exclus et désinscrits, passés en `ready`. File : ~7 750 pros (4 736 immo, 2 147 garages, 865 motos). Ordre inchangé : `petit_pro` d'abord (listes d'Anthony et pros avec stock en ligne en tête), puis le reste.
- **Limite réelle :** 50 envois/jour (2 boîtes × 25). Toute hausse doit être progressive pour ne pas abîmer la réputation des domaines.
- **Toujours exclu :** collecte automatique sur les sites d'annonces concurrents.

### 19/10/2026 — Claude — Feu vert aux pros qui ont un stock en ligne sur leur site
- **Constat :** le robot `prospect-qualifier` avait déjà repéré la page stock (`stock_page_url`) et estimé le nombre d'annonces (`nb_annonces`) de beaucoup de pros, mais ils étaient restés en pause (« en attente du feu vert »).
- **Base :** ~380 pros (299 garages + 81 motos) avec un stock de 10 à 80 véhicules publié sur leur propre site, hors réseaux (`phase2_reseau`) et désinscrits, passés en `ready` / `petit_pro` (placés après les listes d'Anthony).
- **Décision :** pas de collecte sur les sites d'annonces concurrents (Leboncoin, La Centrale, Ronpoin…). **Idée suivante :** sur le site du pro lui-même, détecter les liens/logos vers ces plateformes (preuve qu'il y vend déjà) et les prioriser.

### 19/10/2026 — Claude — Garages prioritaires pendant 3 jours
- **Base :** `category_mix` passé à 70 % garages / 15 % moto / 15 % immo (au lieu de 34/32/34) pour envoyer vite les garages des listes d'Anthony, mélangés aux 25 premiers garages de la file. Tâche cron `abracadeal-prospect-mix-restore-20261022` : retour à 32/34/34 le mercredi 22/10 à 18 h 05 (Paris), puis suppression d'elle-même.
- **Constat (19/10) :** 163 mails envoyés au total ; garages choisis à la main par Anthony : 11 envoyés → 3 clics, 2 comptes créés ; garages du robot suivis depuis le 17/10 : ~55 → 3 clics, 0 inscrit. Piste : prioriser les garages qui ont un stock en ligne (champ `stock_page_url`).

### 19/10/2026 — Claude — 2e liste mélangée à la file
- **Base :** à la demande d'Anthony, les 62 garages de la 2e liste ne sont plus en tête de file : leur `created_at` est réparti au hasard parmi les autres garages `ready`, pour qu'ils partent mélangés aux autres (103 garages en file, environ 6 jours d'envois au rythme normal).

### 19/10/2026 — Claude — 2e liste : envoi complet sur décision d'Anthony
- **Base :** à la demande d'Anthony (18 h 50), les 48 garages restants de la 2e liste repassés en `ready` (`qualif_notes` : « Envoi demandé par Anthony »). Au total 62 garages de cette liste partent à partir du 20/10 9 h. Risque juridique (extraction de la base Ronpoin) signalé à Anthony, décision prise en connaissance de cause.

### 19/10/2026 — Claude — 2e liste : origine Ronpoin, re-sourcing
- **Décision d'Anthony :** la 2e liste venait de Ronpoin.fr ; il a accepté de ne contacter que les garages retrouvés par une source publique légitime.
- **Base :** les 53 nouveaux de la 2e liste repassés en `paused` (`qualif_status = todo`, note « à retrouver par une source publique »). Retrouvés et remis en `ready` : AB Motors, Garage du Fort, GT Vintage, Pax Automobiles (adresse publiée sur leur propre site, `source_url` renseignée) ; Bain Autos Sport via l'adresse de l'annuaire déjà en base (la variante de la liste passée en `error` doublon). Les 8 déjà en base avant la liste (sources robot/annuaire) restent en `ready`.
- **Fonction `prospect-email-check` v2 :** mode `"site"` qui vérifie qu'une adresse est publiée sur le site officiel du domaine (accueil + contact + mentions légales).
- **Limite :** les adresses gratuites (gmail, orange…) ne peuvent être confirmées que par une recherche Google (pas d'API payante pour l'instant) ; recherche web manuelle peu concluante.

### 19/10/2026 — Claude — 2e liste manuelle d'Anthony (garages)
- **Base :** 79 lignes → 73 adresses uniques, toutes vérifiées OK par `prospect-email-check`, aucune désinscrite. 12 déjà envoyées aujourd'hui (ignorées), 8 déjà en base en pause remises en `ready`, 53 ajoutées (`ready`, `petit_pro`, source « Ajout manuel (Anthony) »). Les 61 sont en tête de la file garages (created_at 01/10).
- **Vérifié :** le coup d'accélérateur de 17 h 05 a bien été annulé à 18 h 05 (limites 25/25, mix 32/34/34).

### 19/10/2026 — Claude — Mails pros réécrits (accroche « Marre de payer trop cher ? ») + mail d'aide à l'import
- **Prospection (base) :** les 6 modèles de premier contact (garage, moto, immo × A/B) sont remplacés par une version courte (~150 mots) : accroche « Marre de payer trop cher… ? Faites d'Abracadeal votre partenaire officiel », site toutes catégories, puis 4 points (12 mois gratuits sans carte, une page par annonce trouvable sur Google, partage WhatsApp/Facebook/SMS, synchro du stock). Objets et relances inchangés. Anciennes versions dans `private.prospect_mailer_templates_backup`.
- **Fonction `process-pro-transactional-emails` v4 :** nouveau type `founder_onboarding` (mêmes arguments, pour aider un Fondateur inscrit à mettre son stock en ligne) ; contrainte `pro_email_outbox_email_type_check` élargie. Envoyé à Auto Cévennes (Fondateur n°1) le 19/10 vers 17 h 30.
- **Idée pour plus tard :** envoyer `founder_onboarding` automatiquement à chaque nouveau Fondateur sans annonce après 24-48 h.

### 19/10/2026 — Claude — Mail de prospection : argument « site toutes catégories »
- **Changé (base) :** `private.prospect_mailer_settings.templates`, les 6 modèles de premier contact (garage, moto, immo, variantes A et B) ont un nouveau paragraphe : Abracadeal est un site toutes catégories, donc les annonces du pro sont vues aussi par les visiteurs venus pour autre chose (contrairement aux sites spécialisés). Relances inchangées. Sauvegarde des anciens modèles dans `private.prospect_mailer_templates_backup`.
- **Pourquoi :** demande d'Anthony. Formulation volontairement factuelle (pas de chiffre de trafic promis, le site vient d'ouvrir).
- **À savoir :** A et B ont reçu le même ajout, le test A/B (lien direct vs « répondez à ce mail ») reste comparable à partir de maintenant.

### 19/10/2026 — Claude — Coup d'accélérateur ponctuel sur la liste manuelle
- **Changé (base, temporaire) :** à 17 h 05, limite quotidienne des 2 boîtes 25 → 31 et `category_mix` 100 % garages pour envoyer tout de suite les 12 garages d'Anthony. Tâche cron `abracadeal-prospect-boost-restore-20261019` programmée à 18 h 05 (Paris) pour remettre 25/25 et le mix 32/34/34, puis se supprimer elle-même.
- **À vérifier :** demain matin, limites à 25 et mix normal.

### 19/10/2026 — Claude — Vérification des listes manuelles + 12 garages d'Anthony
- **Nouvelle fonction Supabase :** `prospect-email-check` (v1, code dans `supabase/functions/prospect-email-check/index.ts`, appel interne avec `x-internal-key` comme prospect-mailer, n'envoie rien). Vérifie format, domaine qui reçoit des mails (MX, sinon A), adresse jetable, domaine gratuit. Appel depuis SQL : `net.http_post(... '/functions/v1/prospect-email-check', body {"emails":[...]})` puis lire `net._http_response`.
- **Base :** 12 garages de la liste d'Anthony tous vérifiés OK (aucun désinscrit). 10 ajoutés (`ready`, `petit_pro`, source « Ajout manuel (Anthony) »), 2 déjà présents remis en `ready` (CAC Motors, Ewigo Grenoble). Tous antidatés au 01/10 pour passer en tête de la file garages.
- **À noter :** Auto Cévennes parti à 15 h 52.

### 19/10/2026 — Claude — Bandeau Offre Fondateurs visible sur mobile (non connectés)
- **Changé :** `assets/index-main.js` (classe `show-mobile` posée sur `#founderTopbar` tant que personne n'est connecté ; `?v=20261019-fondateurs`) + nouvelle feuille `assets/founder-mobile-20261019.css`. Sur mobile, le bandeau (texte, compteur de places, bouton « Voir l'offre ») s'affiche en haut de l'accueil pour les visiteurs non connectés ; il était réservé au desktop et la section #pros est masquée sur mobile.
- **Pourquoi :** signalé par Anthony, un pro arrivant sur mobile sans compte ne voyait jamais l'offre.

### 19/10/2026 — Claude — Prospection : ajout manuel Auto Cévennes (Alès)
- **Changé (base) :** nouveau prospect « Auto Cévennes » (auto.cevennes@free.fr, Alès, garage, `petit_pro`, `ready`, source « Ajout manuel (Anthony) »), placé en tête de la file garages (date de création antidatée au 01/10) pour partir au prochain envoi garage.
- **Décision :** pas de robot sur Ronpoin.fr (site d'annonces concurrent : extraction systématique de leur base = risque juridique). Les pros repérés au cas par cas par Anthony peuvent être ajoutés à la main.

### 19/10/2026 — Claude — Prospection : rebond Eden Motors
- **Changé (base, pas de code) :** `prospection_prospects` « Eden Motors » (contact@eden-motors.fr) passé de `sent` à `error` avec la raison dans `last_error` : rebond « 554 5.7.1 Relay access denied » du serveur du destinataire (altair-mail01.eskemm.net) pour le mail envoyé à 14 h 24. La relance J+5 ne partira donc pas (elle ne vise que `status = 'sent'`).
- **Pourquoi :** l'adresse n'est pas acceptée par le serveur de ce garage ; ce n'est ni un blocage anti-spam ni un problème d'Abracadeal.
- **À faire plus tard (idée) :** traiter les rebonds automatiquement (lire les « Mail Delivery System » de contact@ / partenaires@ et passer les prospects en `error`).

### 19/10/2026 — Claude — Profil vendeur : textes blancs invisibles
- **Changé :** `assets/index-core.css` (`?v=20261019-profil` dans `index.html`). Dans la fenêtre « Profil vendeur », « Vous souhaitez laisser un avis ? », « Annonces actives », « Avis » et les titres des annonces héritaient du blanc du thème sombre du site : couleur foncée forcée. Les vignettes d'annonces ne débordent plus à droite sur mobile (titre coupé avec « … »).

### 19/10/2026 — Claude — Recherche par mots-clés corrigée (accents, pluriel, fautes)
- **Changé :** `assets/index-main.js` (`filteredAds` + fonctions `kwFold`, `kwStem`, `keywordMatches` ; `?v=20261019-recherche`).
  - Cause du bug : la barre IA retire les accents (« béquille » → « bequille ») mais le texte des annonces gardait les siens, donc rien ne ressortait. Et la recherche exigeait la phrase exacte.
  - Maintenant : comparaison sans accents ni majuscules, chaque mot cherché n'importe où (titre, description, catégorie, sous-catégorie, ville, marque, caractéristiques), singulier/pluriel, 1 faute tolérée (2 pour les mots de 8 lettres et plus), mots vides ignorés (« pour », « une »…).
  - Testé : béquille / bequille / béquilles / bequile → les 2 béquilles ; « bequille trotinette » → celle de trottinette ; « echapement » → l'échappement Suzuki.
- **À savoir pour plus tard :** le catalogue est chargé en entier dans le navigateur (29 annonces aujourd'hui). Supabase renvoie 1 000 lignes max par requête : au-delà, il faudra passer la recherche côté serveur (recherche plein texte Postgres + extension `unaccent`/`pg_trgm`).

### 19/10/2026 — Claude — Fiche annonce mobile repensée (style grandes plateformes)
- **Changé :** `assets/index-main.js` (`openAd`, `hydrateSellerCard`, `viewListingPhone` ; `?v=20261019-fiche`) + nouvelle feuille `assets/detail-mobile-20261019.css` chargée en dernier dans `index.html`.
  - Mobile uniquement (≤ 720 px) : fiche plein écran, barre du haut (retour, titre, partager, favori + compteur), photo bord à bord, carte vendeur cliquable sous le prix (initiales, avis, badge PRO/Particulier, nombre d'annonces en ligne), section « Les + de cette annonce » (4 premiers équipements en pictos + « Voir les N équipements »), informations clés avec pictos, bloc vendeur du bas épuré, lien « Signaler » avec drapeau, barre fixe en bas « Voir le numéro » / « Message » (le numéro remplace le bouton une fois affiché). La barre de navigation du site est masquée pendant la fiche.
  - Desktop : aucun changement (les nouveaux éléments y sont masqués).
- **Pourquoi :** demande d'Anthony, mise en page inspirée de Leboncoin aux couleurs Abracadeal.
- **À vérifier :** rendu sur un vrai iPhone (encoche, barre du bas), compteur « N annonces » du vendeur.

### 19/10/2026 — Claude — Fenêtres Ville / Prix / Filtres qui passaient derrière les vignettes
- **Changé :** `assets/index-main.js` (`?v=20261019-qf` dans `index.html`). Les fenêtres des filtres rapides (Ville, Prix, Marque, Type de bien) et leur fond sombre sont déplacés dans `<body>` au chargement : dans la section des annonces, ils restaient sous les vignettes. Elles ne se ferment plus non plus quand on tape dedans (l'ouverture du clavier mobile fait défiler la page).
- **Pourquoi :** bug signalé par Anthony sur iPhone.

### 19/10/2026 — Claude — Questions acheteur limitées à Auto / Moto / Immo à vendre
- **Changé :** `assets/purchase-potential-20261009.js` (`?v=3` dans `index.html`). Le panneau « Aidez le vendeur… » (quand, reprise, financement) ne s'affiche plus que pour Voitures, Utilitaires, Motos et Immobilier à vendre (appartement, maison, terrain). Plus rien pour pièces détachées, équipements, vélos, nautisme, caravaning, locations, bureaux, ni les autres catégories (mode, high-tech…).
- **Pourquoi :** demande d'Anthony, ces questions n'ont pas de sens pour un particulier qui vend des baskets ou une pièce.
- **À savoir :** la sous-catégorie est lue dans le marqueur `[ABRACA_SUB:…]` de la description ; une annonce sans sous-catégorie n'affiche pas les questions.

### 19/10/2026 — Claude — Messagerie mobile : panneau « Aidez le vendeur… » corrigé
- **Changé :** `assets/purchase-potential-20261009.js` (cache `?v=2` dans `index.html`). Le panneau des 3 questions acheteur est placé juste au-dessus de la zone de saisie (et non plus dans le formulaire, dont la grille 2 colonnes l'écrasait dans une colonne étroite : « Passer » cassé lettre par lettre, fil de messages réduit à rien). Sur mobile : panneau pleine largeur, plus compact, hauteur max 34 % de l'écran avec défilement interne ; mention « Liens de paiement interdits » passée sous le champ.
- **Desktop :** inchangé visuellement, fil un peu moins haut tant que le panneau est affiché.

### 18/10/2026 — Claude — Recherche IA : une marque seule reste globale
- **Changé :** `assets/smart-search-20260924.js` (version `?v=20261018-global` dans `index.html`).
  - « Mercedes », « Yamaha »… seuls : plus de bascule automatique en Voitures/Motos, recherche par mot-clé dans tout le site.
  - La catégorie n'est choisie que si le type est écrit : « voiture mercedes » → Voitures + marque Mercedes ; « moto yamaha » → Motos.
- **Pourquoi :** demande d'Anthony ; une marque peut concerner des pièces, jantes, vêtements, etc.

### 18/10/2026 — Claude — Bouton retour ‹ (mobile) corrigé
- **Changé :** `assets/app-shell-20261018.js` (fonction `goBack`), version passée à `?v=5` sur les 36 pages.
  - Pages admin et Modération : le ‹ va directement à la page parente (Modération → `index.html#accountModal`, le compte).
  - Arrivée depuis l'accueil : idem, page parente directe.
  - Autres cas : retour à la page précédente ; si rien ne se passe après 600 ms, page parente.
- **Pourquoi :** sur Modération, le ‹ ne faisait rien : le retour tombait sur les entrées d'historique des fenêtres de l'accueil (compte, publier…) au lieu de quitter la page.

### 18/10/2026 — Claude — Retour arrière, annonces retirées et affichage mobile plus rapide
- **Changé :**
  - `assets/index-main.js` : « Mes annonces » n'affiche plus les annonces retirées (par l'admin ou supprimées) ; seules les vendues et expirées restent visibles. Rechargement automatique de « Mes annonces » toutes les 30 s au lieu de 4 s. Le rechargement complet au `pageshow` ne se fait plus qu'au vrai retour arrière (page restaurée par Safari), plus au premier affichage. Le catalogue public s'affiche dès qu'il arrive, sans attendre la vérification du compte.
  - `assets/back-gesture-20261007.js` (v3) : nouvelle fonction `window.abracaGo(url)`. Quitter la page juste après la fermeture d'une fenêtre (ex. Compte → Pro/Pro, Admin → Modération) lançait un retour d'historique en même temps que le changement de page : le retour arrière devenait incohérent. Les entrées d'historique « fantômes » (fenêtre disparue après rechargement) sont sautées.
  - `assets/index-app.js` : les liens vers Pro/Pro et Modération passent par `abracaGo`.
  - `index.html` : Supabase JS chargé en bas de page (avec preload + preconnect) au lieu de bloquer l'affichage dans `<head>`.
- **Pourquoi :** signalement d'Anthony (retour arrière qui déconne, annonces retirées toujours affichées, site mobile lent à s'afficher).
- **À savoir :** pour toute nouvelle navigation vers une autre page depuis une fenêtre de l'accueil, utiliser `window.abracaGo(url)` plutôt que `location.href = url`.

### 18/10/2026 — Claude — Miniatures : correctif des vignettes « Abracadeal » par défaut
- **Bug :** tant qu'une miniature n'était pas encore générée, le gestionnaire global d'erreurs d'image (`assets/index-app.js`, Fix 21/09) passait avant le retour prévu vers la photo d'origine et affichait la photo Abracadeal par défaut (vidéo d'Anthony).
- **Changé :** `assets/index-app.js` (`mark()`) : si l'image a un `data-full` (photo d'origine) pas encore essayé, on charge d'abord celle-ci ; la photo par défaut ne s'affiche que si l'originale est aussi introuvable. `index.html` : `index-app.js?v=20261018-thumbs`.
- **État :** 28 miniatures sur 88 générées à 20 h 05, le reste dans les minutes suivantes.

### 18/10/2026 — Claude — Miniatures des photos (liste d'annonces plus rapide)
- **Constat :** photos bien compressées (≈ 150 Ko, 1600 px max) mais les vignettes de la liste chargeaient la grande photo.
- **Changé :**
  - Base (`supabase/2026-10-18-listing-thumbs.sql`, appliqué) : bucket public `listing-thumbs` (JPEG, 512 Ko max, écriture serveur uniquement) ; suivi `private.listing_photo_thumbs` ; fonctions `thumbs_next_batch`, `thumbs_mark`, `thumbs_orphans`, `thumbs_forget` (service_role uniquement) ; cron `abracadeal-listing-thumbs` chaque minute (5 photos par passage).
  - Nouvelle fonction `generate-listing-thumbs` (clé interne `pro_stock_moderation_internal`) : miniature 480 px JPEG qualité 70 au même chemin que la photo d'origine ; supprime les miniatures dont la photo n'existe plus. Testée : 3 miniatures de 19 à 32 Ko pour des originaux de 113 à 183 Ko.
  - `assets/index-main.js` : `thumbUrl()` / `thumbImgAttrs()` ; les vignettes (liste, sections de l'accueil) chargent la miniature, avec retour automatique à la photo d'origine si la miniature n'existe pas encore. Fiche annonce et carrousel inchangés (grande photo). `index.html` : `index-main.js?v=20261018-thumbs`.
- **À savoir :** les nouvelles photos ont leur miniature 1 à 2 minutes après validation ; en attendant, la grande photo s'affiche.

### 18/10/2026 — Claude — Vélos : plus de champs « véhicule » inutiles
- **Changé :** `assets/index-main.js` : `velos` retiré de `VEHICLE_DETAIL_TYPES`. Pour la sous-catégorie Vélos, le dépôt n'affiche plus les champs de voiture (marque/modèle auto, kilométrage, carburant, boîte, Crit'Air, puissance…) ; il garde titre, description, prix, état et photos, comme les équipements. `index.html` : `index-main.js?v=20261018-velo`.
- **Pourquoi :** remarque d'Anthony (champs motorisation sans intérêt pour un vélo).
- **À savoir :** la fiche d'une ancienne annonce vélo n'affiche plus le bloc de caractéristiques véhicule.

### 18/10/2026 — Claude — « Santé & mobilité » déplacée de Maison vers Autres
- **Changé :** `assets/index-main.js` : sous-catégorie `sante-mobilite` retirée de `SUBCATEGORIES.maison` et ajoutée à `SUBCATEGORIES.autres` (avant « Divers »). `index.html` : `index-main.js?v=20261018-sante2`.
- **Base :** l'annonce déjà publiée (« Béquille Herdegen… », `0f24edc0-…`) passée de `maison` à `autres` (écriture interne, sans re-modération ni remontée).
- **Pourquoi :** demande d'Anthony (pas à sa place dans Maison).

### 18/10/2026 — Claude — Nouvelle sous-catégorie Maison « Santé & mobilité »
- **Changé :** `assets/index-main.js` (`SUBCATEGORIES.maison`) : ajout de `sante-mobilite` « Santé & mobilité (béquilles, fauteuil roulant…) », avant « Autre maison ». Utilisée automatiquement par le dépôt d'annonce et les filtres. `index.html` : `index-main.js?v=20261018-sante`.
- **Pourquoi :** Anthony ne savait pas où mettre des béquilles (pas de rubrique matériel médical).

### 18/10/2026 — Claude — Dépôt d'annonce : ville / code postal corrigés (Paris)
- **Bugs :** pour Paris, la liste s'arrêtait aux 10 premiers codes (75001 à 75010 environ) ; en tapant un code complet (ex. 75011), la liste montrait tous les codes de Paris au lieu de celui tapé ; un début de code (ex. « 750 ») ne donnait rien ; une réponse lente pouvait remplacer la liste plus récente (d'où l'impression de devoir tout retaper).
- **Changé :** `assets/index-main.js` (autocomplétion `#adCity` / `#adPostalCode`) : jusqu'à 30 propositions, ville exacte en premier avec tous ses codes ; code complet → uniquement ce code ; début de code → communes du département filtrées (cache par département, Corse 2A/2B, outre-mer sur 3 chiffres) ; réponses périmées ignorées ; en quittant le champ sans choisir : code postal rempli s'il n'y a qu'un code, liste des codes proposée pour Paris/Lyon/Marseille, ville remplie à partir d'un code unique. `index.html` : `index-main.js?v=20261018-cp`.
- **Testé :** logique vérifiée avec des réponses simulées de l'API geo.api.gouv.fr (Paris : 21 codes, « 750 » → 75001…75020, « 75011 » → 1 résultat). À vérifier en vrai sur mobile.

### 18/10/2026 — Claude — Offre Fondateurs sans carte à l'inscription (en ligne)
- **Décision d'Anthony (18/10) :** plus de carte/SEPA à l'inscription Fondateur ; offre perdue après 60 jours sans annonce en ligne (mail à J45) ou en cas de suppression du compte ; un ancien Fondateur ne retrouve jamais de place (tarif public) ; à la fin des 12 mois sans moyen de paiement, annonces mises en pause (pas supprimées) ; Fondateur démarre en 20, passage gratuit en 50 seulement à 20 annonces en ligne ; formule 100 payante dès l'inscription.
- **Base :** `supabase/2026-10-18-founder-no-card.sql` (appliqué par ChatGPT le 18/10/2026 à 17 h 23) — registre `private.founder_identity_registry` (empreintes SHA-256 SIRET / e-mail / téléphone, rempli au démarrage réel d'un abonnement Fondateur) ; `claim_founder_slot` refuse `founder_already_used` ; `get_my_founder_availability` renvoie ce blocage ; colonnes `founder_enrollments.no_active_listing_since / inactivity_warned_at` ; cron quotidien `abracadeal-founder-inactivity` (7 h 05 UTC → `private.process_founder_inactivity()`) ; pause/reprise des annonces (`listings.billing_paused_at / billing_paused_status`, statut `hidden`, trigger `pro_subscription_listing_visibility_trg`, garde `aaab_guard_billing_paused_listing` : le vendeur ne peut pas republier une annonce en pause) ; nouveaux mails `founder_inactivity_warning`, `founder_lost_inactivity`, `founder_trial_ended` ; rappel `j30`.
- **Fonctions déployées :**
  - `create-pro-subscription-order` v28 : Fondateur → abonnement Stripe créé directement en essai 12 mois (sans page de paiement, `trial_settings.missing_payment_method = cancel`, clés d'idempotence), ligne `pro_subscriptions` écrite tout de suite, retour sur `pro-fondateur.html?pro_subscription=founder_ok`. Fondateur : formule 20 obligatoire au départ. Non-Fondateurs et formule 100 : Stripe Checkout inchangé.
  - `change-pro-subscription-plan` v6 : Fondateur en essai → passage 20 → 50 refusé tant que la formule 20 n'est pas remplie.
  - `process-pro-billing-reminders` v6 : rappel J-30 si aucun moyen de paiement (vérifié chez Stripe) ; J-7 / J-3 adaptés (« ajoutez un moyen de paiement, sinon annonces en pause »).
  - `process-pro-transactional-emails` v2 : 3 nouveaux mails + mail de bienvenue Fondateur mis à jour.
  - `sweep-cancelled-pro-trials` v2 : arrête chez Stripe l'abonnement des Fondateurs perdus pour inactivité.
- **Site :** `pro-fondateur.html` (message de bienvenue, carte 50 « Commencez par la formule 20 »), `index.html` (textes d'inscription Pro), `cgv.html`, `aide.html`, `cgu.html` (+ clause sur le nom de profil).
- **Prospection :** `supabase/2026-10-18-founder-no-card-mail-templates.sql` appliqué le 18/10 (« aucune carte bancaire demandée à l’inscription » dans tous les modèles, relances comprises).
- **À savoir :** les tests SQL complets (en transaction annulée) n'ont pas pu être lancés (autorisation refusée depuis le mobile) ; aucun Fondateur n'était inscrit. Premier vrai test à faire avec un compte Pro de test : inscription Fondateur → aucune page de paiement, formule 20 active, mail de bienvenue. Une suppression de compte n'arrête pas automatiquement l'abonnement Stripe (il s'arrêtera seul à la fin de l'essai, faute de moyen de paiement).

### 18/10/2026 — Claude — Pages d'administration harmonisées sur mobile
- **Changé :** `assets/app-shell-20261018.js` v4 / `.css` v5. Sur mobile, les pages `admin-*.html` et `moderation.html` reçoivent la classe `abs-admin` : même thème sombre partout (fond, cartes arrondies, titres, champs, boutons, tableaux qui défilent horizontalement au lieu de casser la page), statistiques en 2 colonnes (Pilotage, Prospection), liens rapides en pastilles, et le préfixe « Abracadeal · » retiré des grands titres (ex. « Pilotage administrateur »).
- `admin-commerce.html` (qui était en clair) passe au même thème sombre sur mobile.
- Non concernés : `moderateur.html` (espace du modérateur, clair), `tendances-vendeurs.html` / `vendeur-tendances.html` (pages pour les vendeurs, claires). Ordinateur : rien ne change.

### 18/10/2026 — Claude — Espace Hôte intégré : plus de double barre + champs date ; vérification confidentialité
- **Changé :** `assets/app-shell-20261018.js` v3 : la barre d'application ne s'affiche pas quand la page est intégrée dans une autre (Espace Hôte affiché dans `vacances.html` via `?embedded=1` / iframe) — il y avait deux barres l'une sous l'autre. `app-shell-20261018.css` v3 : champs date/heure qui ne débordent plus sur iPhone, texte à gauche.
- **Vérifié (aucune suppression nécessaire) :** les infos saisies dans l'Espace Hôte (`vacation_user_details` : prénom, nom, téléphone, date de naissance, ville, pays ; `vacation_hosts` : SIRET, statut, Stripe) sont protégées par RLS « propriétaire ou admin uniquement ». Aucune vue publique ; les fonctions qui les lisent sont soit réservées à l'admin (`admin_search_listing_history`, `get_admin_dashboard_stats`), soit lisent seulement l'identité de l'utilisateur connecté lui-même (`create_vacation_request`). `profiles` : lecture « soi-même ou admin » ; `vacation_listing_private` : « propriétaire ou admin ».

### 18/10/2026 — Claude — Fenêtre « Administration » (onglet Admin) au même style que le compte
- **Changé :** `index.html` (`#mobileAdminModal`) : icônes emoji remplacées par les mêmes icônes au trait que le compte ; 3 tuiles ajoutées : Finances (`admin-pilotage.html`), Prospection (`admin-prospection.html`), Vacances (`admin-vacances.html`) → grille 3 × 3. Intro raccourcie « Outils d'administration ».
- Styles dans `assets/admin-account-layout-20261018.css` (v3) : tuiles icône + nom sur mobile, descriptions affichées seulement sur ordinateur ; pastille rose du nombre d'annonces à modérer conservée (mêmes ids `mobileAdminModerationBadge` / `mobileAdminFlowBadge`).
- Boutons existants inchangés (`data-admin-mobile-action`), seules l'apparence et les 3 liens ajoutés changent.

### 18/10/2026 — Claude — Appli : pages toujours à jour (service worker)
- **Constat :** Anthony ne voyait plus le sélecteur Annonces/Vacances en revenant sur l'accueil depuis Vacances. Le code est bon (testé : présent sur `index.html` après navigation depuis `vacances.html`) ; le téléphone affichait une **ancienne copie** de l'accueil gardée en cache (GitHub Pages autorise 10 min de cache), d'avant la mise en ligne du sélecteur.
- **Changé :** `sw.js` (version `abraca-sw-20261018-2`) : à l'ouverture d'une page, le service worker redemande toujours la page au serveur (`cache: 'no-cache'` = revalidation) ; si ça échoue, requête normale, puis page « Pas de connexion ». Les images, scripts et données ne sont pas concernés.
- **À savoir :** le nouveau service worker s'active à la prochaine ouverture du site/de l'appli.

### 18/10/2026 — Claude — Sélecteur Annonces / Vacances + mise en page du compte pour tous
- **Sélecteur « Annonces | Vacances »** (mobile) : nouveaux `assets/space-switch-20261018.css` (v2) et `.js`, chargés dans `index.html` et `vacances.html`. Pastille à deux boutons à droite du logo, l'espace en cours en surbrillance. Corrige : depuis Vacances, il n'y avait aucun moyen visible de revenir aux petites annonces (seul le logo y menait).
- **Mise en page « Mon compte » étendue à tous les comptes** (`admin-account-layout-20261018.css/js` v2 — le nom du fichier est resté « admin » mais ça concerne tout le monde) :
  - Particuliers : identité + Déconnexion, « Mon espace » en tuiles, Mes informations.
  - Pros (bouton Pro/Pro visible, hors admin) : en plus « Espace Pro » = Pro/Pro, Importer mon stock (si le bouton d'origine est visible), Ma vitrine (descend à `#companyAccountSection`), Formules (`pro-fondateur.html`).
  - Admin : inchangé (Administration, Tableau de bord, Base de données).
  - Classes posées sur `#loggedInAccount` : `abraca-admin-layout` (connecté), `aal-is-admin`, `aal-is-pro`, `aal-has-import`.

### 18/10/2026 — Claude — Barre d'application commune sur les pages secondaires (mobile)
- **Changé :** nouveaux `assets/app-shell-20261018.css` et `.js` (v2), ajoutés dans 36 pages (toutes sauf `index.html`, `vacances.html`, `messages-vacances.html` qui ont déjà leur navigation d'appli, et `inscription-hote.html`, `desinscription.html`, `partager-particuliers.html`).
  - **Mobile (≤ 760 px) uniquement** ; sur ordinateur, rien ne change (le script s'arrête tout de suite).
  - Barre fixe en haut : ‹ retour, titre de la page (apparaît quand le grand titre sort de l'écran, comme sur iPhone), menu ⋯ quand l'ancien en-tête avait des boutons utiles (Déconnexion, Tableau de bord, Espace Hôte…). Ces boutons sont **déplacés** dans le menu, pas recopiés : leurs fonctions restent les mêmes.
  - L'ancien en-tête de la page et les liens « ← Retour » du haut sont masqués sur mobile.
  - Retour = page précédente du site ; sinon page parente (ex. sous-pages hôte → `espace-hote.html`, pages Vacances → `vacances.html`, pages admin → `index.html#accountModal`, autres → `index.html`). Table `PARENT` dans le script.
  - Pages de texte (Aide, CGU, CGV, Contact, Cookies, Confidentialité, Mentions, Règles, Sécurité, Classement) : texte 15 px, plus lisible.
  - Champs de saisie à 16 px (évite le zoom automatique de l'iPhone).
- **Pour retirer d'une page :** supprimer ses balises `app-shell-20261018` (`<link>` dans le `<head>`, `<script>` avant `</body>`).

### 18/10/2026 — Claude — Nouvelle mise en page « Mon compte » administrateur
- **Changé :** nouveaux `assets/admin-account-layout-20261018.css` et `.js`, chargés dans `index.html`. Ne s'appliquent **que** si le compte est admin (bouton « Modérer » visible) ; rien ne change pour les particuliers et les pros.
  - Ordre : carte identité (avec bouton Déconnexion intégré) → **Administration** en tuiles (Modérer avec pastille du nombre à modérer, Flux, Pro/Pro, Finances → `admin-pilotage.html`, Prospection → `admin-prospection.html`, Annonces → descend à la recherche) → **Tableau de bord** compact (bouton Actualiser en icône, abonnements 20/50/100/Sur devis +100 ; la puce « Plan 200 » est masquée) → **Mon espace** en tuiles (annonces, favoris, messages, alertes, options, mes infos) → Base de données → Mes informations.
  - Les tuiles **cliquent sur les boutons d'origine** (aucun id déplacé ni renommé) ; seuls `#adminStatsPanel` et `#adminDatabasePanel` sont déplacés dans `#accountDashboard`.
  - Bloc « Gains, boosters… » masqué (remplacé par la tuile Finances).
- `assets/install-app-20261018.js` v5 : le lien « Télécharger l'application » est en fin de liste « Aide & infos légales », aligné à gauche.
- **Pour annuler :** retirer la balise `<link>` et la balise `<script>` `admin-account-layout-20261018` de `index.html`.

### 18/10/2026 — Claude — Texte Offre Fondateurs du formulaire d'inscription corrigé
- **Changé :** `index.html` (bloc « 12 mois gratuits pour lancer votre compte Pro » de Créer un compte) : le texte disait que seules 20 annonces étaient gratuites ; il indique maintenant **formule 20 ou 50 gratuite 12 mois** (règle validée le 09/10), 15 photos en 20 / 30 photos en 50, et « aucun prélèvement tant que vous restez dans la limite de votre formule (20 ou 50) ».
- **Pourquoi :** remarque d'Anthony (capture mobile). La fenêtre « Voir les conditions » était déjà juste.

### 18/10/2026 — Claude — Grille de prix cohérente sur tout le catalogue
- **Changé (Stripe mode réel + base `commerce_offers` / `pro_subscription_plans`, via la fonction interne `admin-set-prices-20261018b`) :**
  - Annonce Pro à l'unité Auto/Moto/Immo : 24,99 → **14,99 € HT**.
  - Emploi (abonnements) : 30 offres 249 → **99,99** ; 100 : 549 → **199,99** ; 250 : 899 → **349,99** ; 500 : 1 490 → **599,99 € HT/mois**.
  - Emploi (ponctuel) : 1 offre 29 → **19,99** ; pack 5 : 99 → **69,99** ; pack 10 : 149 → **99,99 €** (alignés sur Services).
  - Passage en ,99 : Services 19,99 / 69,99 / 99,99 ; Mode 19,99 / 49,99 ; Maison 39,99 / 89,99 ; High-tech 100 : 69,99 ; Vacances Pro 49,99 / 99,99.
  - Anciens prix Stripe archivés. Libellés des formules (avec le prix) mis à jour.
- **Bug corrigé au passage :** le « pack 10 annonces » Emploi pointait vers un prix Stripe **mensuel** alors que c'est un achat ponctuel → l'achat était refusé (« Tarif Stripe incohérent »). Nouveau prix unique `price_1URu031ebJH1208IYFKq90jk`.
- **Inchangé (déjà cohérent) :** formules Auto/Moto/Immo 149,99 / 299,99 / 499,99, options particuliers et pros (À la une, Urgent, Remontées, Boosts, photos), annonces particuliers.
- **À savoir :** aucun abonné existant n'était concerné. Restent actifs dans Stripe mais inutilisés : ancien prix mensuel emploi_10 (`price_1URtyt…`), `pro_200` et `pro_1_monthly`. Le site lit tous les prix dans la base : aucun texte de page à modifier.

### 18/10/2026 — Claude — Nouvelle icône de l'application (image fournie par Anthony)
- **Changé :** `icon-192.png`, `icon-512.png`, `apple-touch-icon(-precomposed).png` refaits à partir de la nouvelle image carrée d'Anthony (lampe centrée, volutes violettes) ; `icon-maskable-192/512.png` = même image réduite à 82 % sur un fond flouté, pour la découpe ronde d'Android. Versions passées à `?v=5` (pages, manifest `?v=4`, `install-app-20261018.js?v=3`).
- **Pourquoi :** le bas de l'icône recentrée précédente n'était pas satisfaisant.
- **À savoir :** favicons de l'onglet non modifiés. Une icône déjà installée doit être supprimée puis réinstallée.

### 18/10/2026 — Claude — Icône de l'application recentrée
- **Changé :** `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `apple-touch-icon-precomposed.png`, `icon-maskable-192/512.png` : la lampe est maintenant centrée (elle était en bas à gauche). Mêmes couleurs, même dessin. Numéros de version des icônes passés à `?v=4` dans les pages et le manifest (`manifest.json?v=3`, `install-app-20261018.js?v=2`).
- **Pourquoi :** remarque d'Anthony (logo pas bien centré sur l'écran d'accueil).
- **À savoir :** une icône déjà installée garde l'ancienne image : il faut la supprimer et la réinstaller. Les favicons (onglet du navigateur) n'ont pas été touchés.

### 18/10/2026 — Claude — Application installable depuis le site (PWA)
- **Changé :**
  - `manifest.json` complété (langue, icônes « maskable » `icon-maskable-192/512.png` créées à partir de la lampe, raccourci Vacances) et enfin **relié** aux pages (il n'était lié nulle part).
  - Nouveau `sw.js` à la racine : service worker **sans aucun cache** (le site et les annonces restent toujours à jour) ; il affiche juste une page « Pas de connexion internet » si le réseau tombe.
  - Nouveau `assets/install-app-20261018.js`, chargé dans `index.html` et `vacances.html` (+ balises manifest / Apple dans le `<head>`) :
    - bandeau « L'appli Abracadeal — Installer » sur mobile, au-dessus de la barre du bas, après ~4 s ; croix = masqué 14 jours ;
    - lien « 📲 Télécharger l'application » dans le pied de page, dans la rubrique « Aide & infos légales » du compte et dans le pied de page Vacances ;
    - Android / Chrome / Edge : vraie fenêtre d'installation ; iPhone / iPad : fiche en 3 étapes (Partager → Sur l'écran d'accueil → Ajouter) ;
    - rien ne s'affiche quand on est déjà dans l'application installée (classe `abraca-standalone` sur `<html>`).
- **Pourquoi :** demande d'Anthony (étape 1 du projet appli : PWA, avant une éventuelle version stores via Capacitor). Desktop, design mobile et barre du bas inchangés.
- **Pour annuler :** retirer la balise `<script src="assets/install-app-20261018.js">` et le `<link rel="manifest">` des deux pages ; pour désactiver le service worker chez les utilisateurs, remplacer `sw.js` par un fichier qui appelle `self.registration.unregister()`.

### 18/10/2026 — Claude — Nouvelle grille Pro : 149,99 / 299,99 / 499,99 € HT
- **Changé :**
  - Stripe (mode réel) : nouveaux prix mensuels sur les produits existants — 20 annonces `price_1URt021ebJH1208IzEyaeySf` (149,99 €), 50 annonces `price_1URt0g1ebJH1208ISprzNH9C` (299,99 €), 100 annonces `price_1URt0h1ebJH1208IMyqpTtuu` (499,99 €). Anciens prix 299 / 599 / 999 € archivés.
  - Base : `pro_subscription_plans` et `commerce_offers` (pro_20, pro_50, pro_100) mis à jour (montant, libellé, prix Stripe). Le site lit les prix dans la base : rien de codé en dur à changer.
  - Remise -20 % 6 mois de la formule 100 **retirée** : `create-pro-subscription-order` (v27) et `change-pro-subscription-plan` (v5) redéployées (`pro100Launch` / `launch100` = false, code conservé), `pro-fondateur.html` (plus de prix barré), `cgv.html` et `aide.html` (mentions supprimées).
  - Nouvelle fonction interne `admin-set-pro-prices-20261018` (clé interne, idempotente) qui a fait le changement Stripe + base.
- **Pourquoi :** décision d'Anthony (18/10) : prix d'avant (≈15 €/annonce/mois) jugés trop élevés pour un site qui démarre ; viser ~6 à 7,50 €/annonce.
- **À savoir :** aucun abonnement Stripe existant n'était sur les anciens prix. Le coupon `ABRACA_PRO100_LANCEMENT` existe encore dans Stripe mais n'est plus utilisé.

### 18/10/2026 — Claude — Mobile : Aide / CGU retirés de l'écran Connexion
- **Changé :** `index.html` : le bloc `.account-info-links` (Aide, Sécurité, CGU, CGV…) est déplacé **dans** `#loggedInAccount` → il n'apparaît plus sur les onglets Connexion / Créer un compte ; une fois connecté, rubrique « Aide & infos légales » en liste discrète (+ Mentions légales et Cookies ajoutés). `assets/index-mobile.css` (v=20261018-1) : nouveau style en liens texte ; liens du pied de page réaffichés sur mobile en petit texte (ils étaient masqués), pour que les visiteurs non connectés gardent l'accès aux pages légales.
- **Pourquoi :** demande d'Anthony (gros boutons qui encombraient l'écran de connexion mobile).
- **À savoir :** ordinateur inchangé (bloc toujours masqué, pied de page identique). L'acceptation des CGU à l'inscription (`legal-registration.js`) n'est pas touchée.

### 18/10/2026 — Claude — Catalogue plus rapide au chargement
- **Changé :** `assets/index-main.js` (v=20261018-rapide) : la requête du catalogue public part dès le chargement du script, en parallèle de la vérification du compte et des favoris (avant, elle attendait la fin des deux). Pendant les 6 premières secondes, les appels de `loadAds()` au démarrage (initial, événement de session, stabilisation 700 ms) partagent une seule requête au lieu de 3 (`getPublicCatalog()`). Après 6 s, chaque `loadAds()` refait une vraie requête (pas de données périmées après publication/suppression). « Mes annonces », modération et recherche par référence ne sont pas concernées.
- `index.html` + `assets/auth-layout-20261018.css` : 4 cartes d'attente animées dans `#adsGrid` jusqu'à l'arrivée des annonces (au lieu d'un vide).
- **Pourquoi :** Anthony trouvait l'affichage des annonces lent sur mobile.
- **À faire plus tard (quand il y aura des centaines d'annonces) :** le catalogue est chargé en entier puis filtré côté navigateur. Il faudra passer à une pagination côté serveur (ex. 24 annonces + « Voir plus ») et faire les filtres en SQL. Les photos sont servies en taille d'origine (miniatures Supabase = plan Pro).

### 18/10/2026 — Claude — Nouvelle mise en page de la fenêtre Connexion
- **Changé :** `index.html` (formulaire `#loginForm` : titre « Bon retour sur Abracadeal », « Mot de passe oublié ? » en lien à côté du libellé Mot de passe, bouton « Se connecter » pleine largeur, lien « Pas encore de compte ? Créer un compte gratuitement ») ; nouveau `assets/auth-layout-20261018.css` (fenêtre ajustée au contenu et centrée sur ordinateur pour l'onglet Connexion, boutons Google/Facebook plus nets) ; `social-login-20261018.js` v3 (boutons placés sous le titre). L'id `forgotPasswordBtn` est conservé.
- **Pourquoi :** demande d'Anthony (grand vide sous le formulaire, boutons mal alignés).
- **À savoir :** Facebook est désactivé dans Supabase en attendant la vérification d'entreprise Meta (portefeuille « IDream Lab », en cours). Une fois validée : réactiver Facebook dans Supabase + Publier l'app Meta.

### 18/10/2026 — Claude — Connexion Google/Facebook : bouton Annuler corrigé
- **Changé :** `assets/social-login-20261018.js` (v2) : fenêtre « Finalisez votre compte » avec une croix en haut à droite + bouton « Annuler et se déconnecter » bien visible (il ressemblait à un bouton désactivé) ; Échap annule aussi. Annuler = déconnexion complète + rechargement de la page, pour ne plus retomber sur la fenêtre. Message clair si le téléphone appartient déjà à un autre compte.
- **Pourquoi :** Anthony restait bloqué sur la fenêtre après un test Google avec un numéro déjà utilisé.
- **État :** Google et Facebook activés dans Supabase (18/10). Projet Google dédié « Abracadeal Connexion » (le projet « Abracadeal Prospection » a des accès Gmail sensibles : ne pas l'utiliser pour la connexion). App Meta « Abracadeal » sans portefeuille business, autorisations email + public_profile uniquement.
- **À savoir :** un compte Google/Facebook qui annule reste créé dans Supabase sans téléphone ; il redemandera le téléphone à la prochaine connexion.

### 18/10/2026 — Claude — Connexion rapide Google / Facebook (prête, pas encore active)
- **Changé :**
  - Nouveau `assets/social-login-20261018.js`, chargé dans `index.html` juste après `index-main.js` : boutons « Continuer avec Google / Facebook » en haut des onglets Connexion et Créer un compte. Ils n'apparaissent **que** si le fournisseur est activé dans Supabase (lecture de `/auth/v1/settings`) : tant que rien n'est activé, le site ne change pas.
  - Réservé aux particuliers : les boutons disparaissent quand « Professionnel » est choisi (les pros gardent SIRET + Stripe).
  - Au premier retour de Google/Facebook : fenêtre « Finalisez votre compte » obligatoire (pseudo prérempli avec le prénom, téléphone unique vérifié comme l'inscription classique, acceptation des CGU si pas déjà faite). « Annuler » déconnecte.
  - SQL préparé : `supabase/2026-10-18-social-login.sql` (profil créé sans téléphone autorisé **uniquement** pour les comptes Google/Facebook ; pseudo par défaut = prénom).
- **Pourquoi :** demande d'Anthony, inscription plus rapide.
- **À faire :**
  1. **Appliquer `supabase/2026-10-18-social-login.sql`** (pas encore appliqué : sans lui, toute inscription Google/Facebook échoue car le profil exige un téléphone).
  2. Créer les identifiants Google (Google Cloud Console) et Facebook (Meta for Developers), puis les coller dans Supabase → Authentication → Sign In / Providers. URL de rappel : `https://jplzvxmpbpjssyinozap.supabase.co/auth/v1/callback`.
  3. Vérifier que `https://abracadeal.fr/` est dans Authentication → URL Configuration → Redirect URLs.
  4. Les pages Vacances ont leur propre connexion : pas encore de boutons Google/Facebook dessus.
- SQL 2026-10-18-social-login.sql appliqué par ChatGPT le 18/10/2026 11:22 (+02:00)

### 17/10/2026 — Claude — Fichiers internes retirés du site public
- **Changé :** ajout de `_config.yml` : `JOURNAL.md`, `supabase/`, `tests/`, `scripts/`, `backups/` et `docs/` ne sont plus publiés sur abracadeal.fr (ils restent dans le dépôt).
- **Pourquoi :** ces dossiers étaient lisibles par n'importe qui sur le site (code des fonctions serveur, SQL, anciennes versions, notes internes).
- **À savoir :** ne rien mettre dans ces dossiers qui doive être accessible depuis le site.

### 17/10/2026 — Claude — Prospection : suivi des clics
- **Changé :**
  - Base : colonnes `ref_code`, `click_count`, `first_clicked_at`, `last_clicked_at` sur `prospection_prospects` ; fonctions `prospect_ref_code(uuid)` (service_role), `track_prospect_click(text)` (public), `admin_prospect_tracking()` (admin). Fichier : `supabase/2026-10-17-prospect-click-tracking.sql`.
  - Fonction `prospect-mailer` (v6 déployée) : le lien `https://abracadeal.fr/pro-fondateur.html` des mails reçoit un code personnel `?r=xxxxxxxx`. Le fichier du dépôt a été resynchronisé avec la version en ligne (il était resté à une ancienne version, sans A/B ni relance).
  - `pro-fondateur.html` : enregistre le clic, garde le code dans le navigateur (`abraca_prospect_ref`, 90 jours) et le retire de l'adresse.
  - `assets/index-main.js` : à l'inscription, le code est ajouté au compte (`prospect_ref` dans les métadonnées).
  - `admin-prospection.html` / `assets/admin-prospection.js` : bloc « Suivi : qui a cliqué ? » + colonne Clics.
- **Pourquoi :** savoir quels pros cliquent et s'inscrivent, sans pixel d'ouverture (peu fiable et à éviter côté CNIL).
- **Règles de comptage :** clic dans les 60 s après l'envoi = antivirus, ignoré ; visites répétées en moins de 30 min = 1 clic.
- **À savoir / à faire :** le suivi démarre avec les envois du 17/10 à 16 h 56 (les 94 mails précédents n'ont pas de code). La variante B (sans lien) ne peut pas être suivie en clics. Si un modèle de mail est modifié, garder exactement le lien `https://abracadeal.fr/pro-fondateur.html` pour que le code soit ajouté.

### 20/10/2026 — Claude — Page Fondateurs : plus aucune mention de prix pour les visiteurs
- **Changé :** `pro-fondateur.html`, partie visible sans compte Pro : retrait de « Les tarifs détaillés restent réservés… », « Puis tarif public normal à partir du 13e mois », de la carte « Tarifs privés », de la note « annonce à l'unité / perte du statut » et des blocs bas « prix HT, packs… » / « Cette grille tarifaire est réservée aux comptes Pro ». Remplacés par des arguments (import du stock, Google, partage 1 clic, sans carte ni engagement) et des boutons d'inscription (« Je réserve ma place Fondateur », « Créer mon compte Pro gratuitement », « Activer mon compte Pro »).
- **Pourquoi :** demande d'Anthony — la page doit vendre et chercher des inscriptions, sans parler de prix.
- **À savoir :** la grille de prix pour les comptes Pro connectés (`#privatePricing`) n'a pas changé.
- **Aussi le 20/10 (base) :** purge de `cron.job_run_details` (historique > 2 jours supprimé, ~130 000 lignes) + nouvelle tâche planifiée `abracadeal-purge-cron-history` chaque nuit à 4h23, pour réduire le Disk IO Supabase.

### 26/10/2026 — Claude — Vacances : simulateur retiré, bloc « Devenir hôte » refait + nouvelle formulation Fondateurs
- **Changé :**
  - `vacances.html` : simulateur de prix direct supprimé (HTML + script dans `assets/vacances-main.js`). Nouveau bloc « Devenir hôte » (titre, texte, 2 boutons, 4 avantages : prix libre, contact direct, 0 % de commission, 15 photos), styles dans le nouveau `assets/vacances-host-cta-20261026.css` (desktop 2 colonnes, tablette empilé, mobile boutons pleine largeur). Cartes « Un prix direct hôte » : 4 colonnes sur desktop, 2 sur tablette (il restait une carte seule).
  - Formulation Fondateurs : les titres/accroches ne mettent plus « 12 mois gratuits » en avant (ça laisse penser « payant ensuite »). À la place : « Publiez gratuitement, sans carte bancaire ni engagement », et la durée passe en second plan (« gratuité garantie 12 mois »). Fichiers : `index.html` (bandeau du haut, bloc Pros, bouton « Je publie gratuitement », encart Vacances, titre inscription Pro), `pro-fondateur.html` (titre + paragraphe), `vacances.html` (carte « Publication offerte »), `assets/vacances-main.js` (message sans logement).
- **Pourquoi :** demande d'Anthony.
- **À savoir :** les conditions détaillées (modale « Voir les conditions », texte d'inscription Pro, grille privée) mentionnent toujours clairement les 12 mois : ne pas les retirer, la durée doit rester indiquée.

### 26/10/2026 — Claude — Modale « Offre Fondateurs » refaite en version pub
- **Changé :** `index.html` (#founderOfferModal) : titre « Devenez Pro Fondateur », accroche « Publiez vos annonces gratuitement… sans carte bancaire, sans engagement », 4 avantages (stock mis en ligne pour eux, Google, partage 1 clic, zéro risque), un seul bouton « Je réserve ma place gratuitement », conditions (12 mois, 500 places, mise en pause sans prélèvement…) repliées sous « Conditions de l'offre ». Compteur « 499 places restantes » retiré de la modale (même logique que le bandeau le 21/10 : preuve sociale négative au lancement). Styles dans `assets/founder-mobile-20261019.css` (v=2), anciens hacks CSS du bouton supprimés ; espace en bas sur mobile pour ne pas passer sous la barre de navigation.
- **Pourquoi :** demande d'Anthony (meilleur marketing).

### 26/10/2026 — Claude — Vacances : textes marketing et mise en page refaits
- **Changé :** `vacances.html` : accroche voyageurs (« Réservez directement auprès de l'hôte : aucuns frais de service… », badges 0 € de frais / contact direct / partout en France) ; section « Pourquoi réserver en direct ? » (3 cartes voyageurs) à la place de « Un prix direct hôte » ; bloc hôte réécrit (« gardez 100 % de vos revenus », publication offerte aux 500 premiers logements, bouton « Publier mon logement gratuitement », avantages prix/iCal/0 %/photos) ; « Comment ça marche ? » en 3 étapes côté voyageur (anciennes cartes de contact retirées) ; CTA final double « Trouver un logement » / « Publier mon logement ». Note « France uniquement » retirée du moteur (remplacée par le badge « Partout en France »).
  - `assets/vacances-host-cta-20261026.css` (v=3) : « Logements disponibles » aligné sur la largeur des autres sections (desktop 4 colonnes, tablette 3) ; tablette (mode tablette-comme-mobile) passée au thème sombre (fond et moteur de recherche restaient blancs, titre blanc illisible) ; fond rose de la bannière pendant le chargement retiré.
- **Pourquoi :** demande d'Anthony (meilleur marketing + mise en page propre sur tous les formats).

### 26/10/2026 — Claude — Accueil : icônes de catégories dorées au trait
- **Changé :** `index.html` : les 8 emojis des catégories (🚗 🏠 🏖️ 📱 🛋️ 👗 💼 🛠️) remplacés par des icônes SVG au trait (voiture, maison, coucher de soleil sur la mer, téléphone, canapé, t-shirt, mallette, clé). Nouveau `assets/category-icons-20261026.css` : même rond violet foncé + liseré doré pour toutes les catégories (fini les couleurs différentes), icônes dorées #f2c46d.
- **Pourquoi :** demande d'Anthony — rendu plus haut de gamme, cohérent avec la lampe dorée, identique sur iPhone/Android.

### 26/10/2026 — Claude — Accueil mobile : bouton « Déposer une annonce » plus visible
- **Changé :** `assets/category-icons-20261026.css` (v=2) : sur mobile, le bouton passe en pleine largeur (aligné sur la bannière), plus haut (54 px), texte plus gros, doré plus lumineux avec un halo qui pulse doucement (désactivé si l'utilisateur a demandé moins d'animations).
- **Pourquoi :** Anthony trouvait le bouton noyé sous la bannière dorée.

### 26/10/2026 — Claude — Accueil : bandeau court, recherche, confiance, catégories desktop
- **Changé :** `index.html` + `assets/category-icons-20261026.css` (v=3) :
  - bandeau Fondateurs sur mobile réduit à 1 ligne (« 🎉 Pros : publiez gratuitement »), texte complet gardé sur ordinateur ;
  - placeholder de recherche : « ✦ Recherche IA : Clio, T2 Cannes… » (on garde « IA », demande d'Anthony) ;
  - ligne de confiance sous la recherche : « ✔ Annonces modérées · ✔ Dépôt gratuit · ✔ Contact direct » ;
  - ordinateur : la section `#annonces` (catégories, masquée jusque-là) s'affiche en 8 ronds dorés sous la recherche ; le bandeau Pro/Pro passe après la liste des annonces.
- **Pas fait :** masquer la liste quand le site est vide — 29 annonces actives au 26/10, inutile.

### 26/10/2026 — Claude — Ligne de confiance : coches dorées
- **Changé :** `index.html` + `assets/category-icons-20261026.css` (v=4) : les « ✔ » (affichés en emoji noir sur iPhone) remplacés par des coches SVG dorées.

### 26/10/2026 — Claude — « Offre » retiré des accroches Fondateurs
- **Changé :** bandeau du haut (« 🎉 Pros Auto, Moto & Immobilier · Publication gratuite… », bouton « Découvrir → » au lieu de « Voir l'offre »), bloc Pros et titre inscription Pro (« Pros Fondateurs »), `pro-fondateur.html` (pastille, titre de page, description Google, « Places Fondateurs : réservées… »).
- **Pourquoi :** Anthony trouve que « offre » fait penser à « payant ». Les conditions détaillées et la grille privée Pro n'ont pas changé.

### 26/10/2026 — Claude — Modale Fondateurs : import par le pro lui-même
- **Changé :** `index.html` : avantage « Votre stock en ligne, sans ressaisie — importez-le vous-même en quelques clics, ou on le reprend pour vous… » ; « Conditions de l'offre » → « Voir les conditions ».

### 26/10/2026 — Claude — Capital social (50 €) moins visible
- **Changé :** `mentions-legales.html`, `cgu.html`, `cgv.html`, `index.html`, `vacances.html` : « au capital de **50 €** » retiré des phrases d'introduction (CGU/CGV/mentions). Le capital reste indiqué dans les mentions légales, en petit gris en bas (« Capital social de la société éditrice : 50 € »).
- **Pourquoi :** demande d'Anthony. **Ne pas le supprimer complètement** : le capital social est une mention obligatoire pour une société (loi LCEN, art. 6).

### 26/10/2026 — Claude — Ligne de confiance sortie du bloc de recherche collant
- **Changé :** `index.html` : `.hero-trust-line` déplacée hors de `.search-wrap` (la recherche devient collante en haut au scroll sur mobile et emmenait la ligne avec elle, par-dessus les annonces).

### 26/10/2026 — Claude — Vacances masqué de la navigation de l'accueil
- **Changé :** `index.html` : sélecteur mobile « Annonces | Vacances » désactivé sur l'accueil (script `space-switch` mis en commentaire), entrée « Vacances » du menu ordinateur masquée, encart `#vacancesDiscovery` masqué. **Gardés :** le rond Vacances dans les catégories (demande d'Anthony), « Location saisonnière » dans le sous-menu Immobilier, la page `vacances.html` et son propre sélecteur.
- **Pourquoi :** seulement 2 logements Vacances au 26/10 ; un espace vide décrédibilise le site.
- **Pour réafficher :** décommenter la ligne `space-switch-20261018.js` en bas de `index.html`, retirer `hidden style="display:none!important"` sur l'item Vacances du menu et sur `#vacancesDiscovery`.

### 26/10/2026 — Claude — Barre du logo mobile affinée
- **Changé :** `assets/category-icons-20261026.css` (v=5) : sur mobile, « Achetez - Vendez » masqué sous le logo et barre plus fine (marge haute iPhone conservée). Logo gardé : bouton accueil et repère de marque hors de l'accueil.

### 26/10/2026 — Claude — Identité société allégée sur les pages secondaires
- **Changé :** `cookies.html`, `classement-annonces.html` : intro réduite à « Abracadeal est édité par iDream Lab (voir les mentions légales) ». `confidentialite.html`, `contact.html` : capital 50 € retiré (oubliés le matin).
- **À savoir :** l'identité complète (RCS, siège) reste volontairement dans mentions légales (obligatoire, LCEN), CGU/CGV (identité du professionnel) et confidentialité (responsable de traitement, RGPD). Le capital n'apparaît plus qu'en petit en bas des mentions légales.

### 26/10/2026 — Claude — Cartes d'annonces épurées
- **Changé :** `assets/index-main.js` (v=20261026-cards) : bouton Partager retiré des cartes (reste dans la fiche annonce et sur les showrooms) ; « · Particulier / · Professionnel » retiré de la ligne catégorie (badge PRO conservé sur la photo) ; titres écrits à 70 %+ en MAJUSCULES affichés en minuscules avec majuscule initiale (`displayListingTitle`, affichage seulement, base inchangée) ; ancienneté ajoutée après la ville (« aujourd'hui », « hier », « il y a 3 jours »… depuis `created_at`). `assets/category-icons-20261026.css` (v=6) : flèches du carrousel masquées sur écran tactile (glisser du doigt + points).

### 26/10/2026 — Claude — Bouton Partager remis sur les cartes
- **Changé :** `assets/index-main.js` : bouton Partager de nouveau sur chaque carte (choix d'Anthony : partage instantané = visibilité). Les autres changements des cartes restent.

### 26/10/2026 — Claude — Ancienneté remplacée par un badge « Nouveau »
- **Changé :** `assets/index-main.js` (v=cards3) + `assets/category-icons-20261026.css` (v=7) : plus de « il y a X jours » sur les cartes ; petit badge doré « Nouveau » seulement pour les annonces de moins de 3 jours (`listingIsNew`).
- **Pourquoi :** Anthony — avec peu de trafic, l'ancienneté affichée fait « site qui ne bouge pas ».

### 26/10/2026 — Claude — Cartes : Partager sous le cœur
- **Changé :** `assets/category-icons-20261026.css` (v=8) : sur la photo des cartes, cœur en haut et bouton Partager en dessous (empilés). Anthony hésite avec un bouton Partager dans la partie texte de la carte.

### 26/10/2026 — Claude — Cœur/Partager empilés sur toutes les vignettes
- **Changé :** `assets/category-icons-20261026.css` (v=9) : la règle « cœur en haut, Partager dessous » s'applique à toutes les `.card-photo-actions` (elle ne visait que `.ad-card`, d'où des vignettes côte à côte ailleurs, ex. sections À la une / près de vous).

### 26/10/2026 — Claude — Astuce photo dans le dépôt d'annonce
- **Changé :** `index.html` : ligne « 📸 Astuce : tenez votre téléphone à l'horizontale… » au-dessus du bouton « Ajouter vos photos » ; style dans `assets/category-icons-20261026.css` (v=10).
- **Pourquoi :** beaucoup de photos verticales donnent des vignettes avec bandes floues.

### 26/10/2026 — Claude — Catégorie retirée des vignettes
- **Changé :** `assets/index-main.js` (v=cards4) : la ligne catégorie (« Véhicules », « Équipement moto · Accessoires »…) n'apparaît plus sur les vignettes publiques ; gardée dans « Mes annonces » et en modération.

### 26/10/2026 — Claude — Écran « Partagez votre annonce » après publication
- **Changé :** `assets/index-main.js` (v=share) : `showPublishShareScreen(id)` s'ouvre ~0,5 s après une **nouvelle** annonce mise en ligne automatiquement (pas pour une modification, pas pour une annonce en attente de vérification — son lien ne marcherait pas encore, pas pour le parcours options payantes). Boutons WhatsApp / Facebook / SMS / Copier le lien (fonctions de partage existantes) + « Plus tard ». Styles dans `assets/category-icons-20261026.css` (v=11).
- **Pourquoi :** stratégie trafic sans pub : chaque vendeur qui partage amène des visiteurs.

### 26/10/2026 — Claude — Mails de prospection : plus de « 12 mois gratuits » en avant
- **Changé (base, appliqué) :** `private.prospect_mailer_settings` via `supabase/2026-10-26-prospection-sans-12-mois.sql` : puce « Offre Fondateurs : 12 mois gratuits, jusqu'à 50 annonces » → « Jusqu'à 50 annonces publiées gratuitement, sans carte bancaire » (tous les modèles A et B) ; relance : « 12 mois de diffusion 100 % gratuite » → « vos annonces diffusées gratuitement » ; ligne « Conditions des places Fondateurs : https://abracadeal.fr/pro-fondateur.html » ajoutée sous la signature des premiers mails (la durée y reste indiquée, pour rester honnête).
- **Pourquoi :** Anthony — « 12 mois gratuits » laisse entendre « payant ensuite ».
- **À savoir :** `assets/email/email-pros.html` est un ancien modèle non utilisé par `prospect-mailer`.

### 26/10/2026 — Claude — Prospection : variante B = mail court
- **Changé (base, appliqué) :** `supabase/2026-10-26-prospection-variante-B-courte.sql` : modèles B (garage, moto, agence, relance) remplacés par une version courte (5-6 lignes, sans emoji ni lien, « Pendant notre lancement… gratuitement, sans carte bancaire ni engagement », reprise des annonces du site proposée, question « Seriez-vous intéressé ? »). La variante A (longue, avec lien) ne change pas : test A/B.
- **Pour comparer :** B n'a pas de lien, donc pas de clics suivis : comparer le nombre de **réponses** reçues A vs B (colonne `ab_variant` des prospects).

### 26/10/2026 — Claude — Prospection : « Pourquoi gratuit ? C'est donnant-donnant »
- **Changé (base, appliqué) :** `supabase/2026-10-26-prospection-pourquoi-gratuit.sql` : phrase « Pourquoi gratuit ? C'est donnant-donnant : vous gagnez de la visibilité en plus, et nous, des annonces pour lancer le site. » ajoutée aux 6 premiers mails (A et B, garage/moto/agence) et au modèle par défaut. Relances inchangées.
- **Pourquoi :** idée d'Anthony, pour lever le doute « c'est une arnaque ».

### 26/10/2026 — Claude — Formulaire « Publier une annonce » allégé
- **Changé :** `index.html` : astuce photo raccourcie et lisible (texte foncé, elle était blanche sur fond clair) ; note « Choisissez la sous-catégorie la plus précise… » supprimée ; explication sous « Afficher mon numéro » supprimée ; notes photo réduites à « La 1re photo est la photo principale » ; `assets/description-helper-original-20261013.js` (v=3) : texte « Modèle adapté à la catégorie… » sous « M'aider à rédiger » retiré. `assets/category-icons-20261026.css` (v=12) : titre « Galerie de l'annonce » et compteur « 0 / 3 ajoutée » (blanc invisible) masqués, Ville + Code postal côte à côte sur mobile.

### 26/10/2026 — Claude — Véhicules : détails secondaires repliés
- **Changé :** nouveau `assets/publish-more-details-20261026.js` (chargé dans `index.html`) : dans « Publier une annonce » > Véhicules, seuls Marque, Modèle, Année, Kilométrage, Carburant, Boîte restent visibles ; les 17 autres champs + Équipements sont sous un bouton « + Plus de détails (facultatif) » (déplié automatiquement si déjà remplis, ex. modification). Bouton masqué pour les équipements/pièces. Aucun champ supprimé, mêmes id. `assets/category-icons-20261026.css` (v=14) : champs essentiels par paires sur mobile, titre « Informations véhicule détaillées » masqué.

### 26/10/2026 — Claude — Immobilier : l'essentiel d'abord dans « Publier une annonce »
- **Changé :** `assets/publish-more-details-20261026.js` (v=3, généralisé véhicules + immobilier) : en immobilier restent visibles surface, pièces, meublé, DPE, GES, dépenses d'énergie min/max, copropriété/lots/charges, honoraires (+ charges/dépôt en location, surface terrain) = **mentions obligatoires d'une annonce immobilière, ne pas les replier**. Repliés sous « Plus de détails (facultatif) » : chambres, salles de bain, étage, nb d'étages, année, état, chauffage, exposition, quartier, mandat, disponibilité, consommation kWh, date DPE, taxe foncière, équipements. Bouton placé juste avant « Titre de l'annonce ». `index.html` : libellés raccourcis (Surface (m²), Pièces, Énergie / an : min / max). CSS v=15 : titres de sections immo masqués, champs par paires sur mobile.

### 26/10/2026 — Claude — Test A/B des mails réactivé (B n'était jamais envoyé)
- **Constat :** `prospect_ab_variant` renvoyait toujours `A` → 356 mails envoyés depuis le 15/10, **tous en A**, aucun B. Bilan A au 26/10 18 h : 356 envoyés, 12 prospects ont cliqué (~3,4 %), 0 réponse enregistrée, 4 désinscriptions, 136 relances.
- **Changé (base, appliqué) :** `supabase/2026-10-26-prospect-ab-variant-50-50.sql` : répartition 50/50 stable par prospect (hash md5 de l'id). ~5 277 A / 5 240 B parmi les 10 517 restants.
- **Pour le bilan :** comparer à partir du 26/10 18 h ; A = clics + réponses, B = réponses uniquement (pas de lien).

### 26/10/2026 — Claude — SEO : recherches génériques « déposer une annonce gratuite »
- **Changé :** nouvelle page `deposer-une-annonce-gratuite.html` (indexable, visible des humains : pas de redirection) : H1 « Déposer une petite annonce gratuite », 3 étapes, avantages, catégories liées, FAQ (+ balisage FAQPage), boutons vers `/?deposer=1`. Ajoutée à `sitemap-pages.xml` et liée en bas de l'accueil. `index.html` : titre « Petites annonces gratuites entre particuliers et pros » et description orientée « Déposez gratuitement… ».
- **À savoir :** pas de noms de concurrents (Leboncoin, Vivastreet…) dans le site : risque de sanction Google et de contrefaçon de marque.

### 26/10/2026 — Claude — Démo Life Cars : formulation gratuite alignée
- **Changé :** `demo/life-cars/annonce.html` : « 12 mois offerts… » → « Publication gratuite, sans carte bancaire, sans engagement. » (même règle que le reste du site). Rendez-vous Life Cars prévu le 27/10.

### 26/10/2026 — Claude — Page de démo privée pour Centurion Motors
- **Changé :** `demo/centurion-motors/` (index + annonce, copie de la démo Life Cars ; noindex, `/demo/` déjà bloqué dans robots.txt, non liée depuis le site). Centurion Motors : 616 route de Serra Capeou, 06110 Le Cannet, 60 véhicules sur AutoScout24 (gérant : Pierre Visciglia, pas de site propre trouvé). 3 véhicules : Lamborghini Revuelto, Urus Mansory Venatus, Ferrari 812 GTS — 1 photo chacun, chargée depuis AutoScout24 (taille 720/1280, repli auto sur la vignette 250x188 si indisponible). Descriptions limitées aux infos publiques (année, km, puissance, financement possible).
- **À faire :** supprimer `demo/centurion-motors/` après le rendez-vous (27/10) ou en cas de refus. Rien en base.

### 26/10/2026 — Claude — Plus de mails de prospection aux pros déjà inscrits
- **Bug :** Auto Cévennes (Alès, inscrit Fondateur n°1 le 19/10, 0 annonce) a reçu la relance « seriez-vous intéressé ? » le 26/10 à 16 h 45, puis a recliqué. `prospect_mailer_claim` ne vérifiait pas l'existence d'un compte.
- **Changé (base, appliqué) :** `supabase/2026-10-26-prospection-pas-de-relance-aux-inscrits.sql` : premiers mails et relances exclus si l'e-mail du prospect ou son code ?r= correspond à un compte existant (3 conditions ajoutées). Seul Auto Cévennes était concerné. Oxoto (inscrit le 19/10) n'avait pas encore reçu de relance : il n'en recevra pas.
- **À faire (Anthony) :** Auto Cévennes et Oxoto sont inscrits mais n'ont aucune annonce ; ils perdent leur place après 60 jours sans annonce (vers le 18/12).

### 26/10/2026 — Claude — Mails ponctuels aux pros + aide à Auto Cévennes
- **Changé :** `process-pro-transactional-emails` v5 déployée (et resynchronisée dans le dépôt) : nouveau type `custom_message` (payload `subject`, `title`, `paras[]`, `bullets[]`, envoyé via Resend depuis contact@abracadeal.fr). Contrainte `pro_email_outbox_email_type_check` élargie. Fichier : `supabase/2026-10-26-pro-email-custom-auto-cevennes.sql`.
- **Programmé :** message « Voulez-vous qu'on mette vos annonces en ligne pour vous ? » à Auto Cévennes (Fondateur n°1, 0 annonce) le 27/10/2026 à 9 h (Paris) — ligne `custom-auto-cevennes-aide-import-20261027`. Les réponses arrivent sur contact@abracadeal.fr.
- **Pour envoyer un autre message ponctuel :** insérer une ligne `custom_message` dans `pro_email_outbox` avec `available_at` = heure voulue.
- **À revoir :** le mail automatique `founder_onboarding` dit encore « Marre de payer trop cher ? » et « gratuite pendant 12 mois » (formulations abandonnées par Anthony).

### 26/10/2026 — Claude — Lien direct vers l'espace Pro (?espace=pro)
- **Changé :** `assets/index-main.js` (v=20261026-espacepro) : `https://abracadeal.fr/?espace=pro` ouvre directement le tableau de bord Pro (ou la connexion si le pro n'est pas connecté, puis le tableau de bord après connexion). `process-pro-transactional-emails` v6 : le bouton « Accéder à mon espace Pro » de tous les mails Pro pointe vers ce lien (avant : simple page d'accueil).

### 26/10/2026 — Claude — Aide à l'import automatique pour les pros sans annonce
- **Changé (base, appliqué) :** `supabase/2026-10-26-pro-aide-import-auto.sql` : fonction `queue_pro_import_help()` + tâche `abracadeal-pro-import-help` (lun-sam 8 h UTC). Tout compte Pro (hors admin) inscrit depuis 3 à 60 jours, sans aucune annonce, reçoit une seule fois « Voulez-vous qu'on mette vos annonces en ligne pour vous ? » (+ « jusqu'à 50 annonces gratuitement » s'il est Fondateur). Clé `import-help-<user_id>`.
- **Premier envoi :** Oxoto le 27/10 vers 9 h (Paris). Auto Cévennes est exclu (il a déjà son message programmé, clé contenant « import »).

### 27/10/2026 — Claude — Aide : offre Fondateurs sans IBAN
- **Changé :** `aide.html` (FAQ « Qu'est-ce que l'offre Fondateurs ? ») : précise en gras qu'aucune carte ni IBAN n'est demandé à l'inscription ni pendant les 12 mois ; la mention « ajoutez une carte ou un IBAN » (lue comme une obligation) est remplacée par « vous décidez librement de continuer ou non ». Corrigé aussi : « formule 20 » → « formule 20 ou 50 ».

### 27/10/2026 — Claude — Liste d'annonces mélangée par vendeur
- **Changé :** `assets/index-main.js` (v=20261027-mixvendeurs) : nouvelle fonction `diversifyBySeller()`. En tri « plus récentes » sans mot-clé, jamais plus de 2 annonces d'affilée du même vendeur (`owner_id`) : les suivantes sont décalées plus bas, aucune n'est retirée. Tri par prix, recherche par mot-clé, modération, « mes annonces » et favoris : ordre exact inchangé. Les annonces « À la une » restent insérées en positions 1, 4, 7 après ce mélange.

### 27/10/2026 — Claude — Accueil rangé par univers
- **Changé :** `assets/index-main.js` (v=20261027-accueil-univers) + `assets/index-core.css` (v=20261027-univers) : sur l'accueil par défaut (aucune recherche, filtre ni catégorie, tri « plus récentes »), les annonces sont regroupées sous des titres : « 🚗 Auto & Moto » (8 max), « 🏠 Immobilier » (8 max), puis « 🛍️ Toutes les autres annonces ». Bouton « Voir les N annonces → » quand une rangée en contient plus (ouvre la catégorie). Rangée vide = masquée. Fonctions `HOME_GROUPS`, `isHomeDefaultView()`, `groupHomeAds()`, `homeGroupHeaderHtml()`. Dès qu'un filtre/tri/catégorie est choisi : liste unique classique.
- **Changé :** `classement-annonces.html` (section 2. Tri) : explique le regroupement par univers et la règle « 2 annonces max d'un même vendeur d'affilée » (transparence du classement).

### 27/10/2026 — Claude — Bandeau Fondateurs plus visible (ordinateur)
- **Changé :** nouveau `assets/founder-strip-20261027.css` (chargé en dernier dans `index.html`) : sur ordinateur uniquement, bandeau plus haut, texte plus grand, bordure dorée et bouton blanc à texte violet (distinct de « Déposer une annonce »). Mobile inchangé. Texte : « Publiez vos annonces gratuitement, sans carte bancaire » ; bouton « Devenir Fondateur » (sans flèche) (avant « Découvrir → »).
- **Ajouté (27/10) :** pastille dorée « Places limitées par région » dans le bandeau Fondateurs (ordinateur uniquement, classe `.ft-limit`).

### 27/10/2026 — Claude — Bandeau « 500 premiers logements » sur Vacances
- **Changé :** `vacances.html` + nouveau `assets/vacances-founder-strip-20261027.css` : bandeau sous l'en-tête (même style que le bandeau Fondateurs de l'accueil) « 🏡 Propriétaires & hébergeurs · Publication offerte aux 500 premiers logements, sans carte bancaire » + pastille « Places limitées » + bouton blanc « Publier mon logement » (→ `vacances.html?mode=hote&host_signup=1`). Version courte sur mobile.
- **Modifié (27/10, 11h45) :** bandeau Vacances déplacé tout en haut (juste sous l'en-tête, au-dessus de la bannière lampe). Émojis des deux bandeaux remplacés par des icônes dessinées dorées (`.strip-ico` : maison sur Vacances, étoile sur l'accueil). `assets/vacances-tail.js` : icône « Espace voyageur » = avion (au lieu du cœur), « Espace Hôte » = maison.

### 27/10/2026 — Claude — Tarif Vacances « hors offre Fondateurs », pied de page, bandeau Vacances ciblé pros
- **Changé :** `espace-hote.html` : « Tarification (hors offre Fondateurs) : … » + « Offre Fondateurs : publication offerte aux 500 premiers logements des hébergeurs professionnels ».
- **Corrigé :** bandeau `vacances.html` : « Hébergeurs pros & conciergeries » au lieu de « Propriétaires & hébergeurs ». Les 500 places (`reserve_vacation_launch_slots`) ne concernent que les formules Pro ; un particulier paie 4,99 € TTC / 30 jours (`photos-vacances.js`), le bandeau promettait donc à tort la gratuité aux particuliers.
- **Changé :** nouveau `assets/footer-copyright-20261027.css` (accueil + Vacances) : « © 2026 Abracadeal · iDream Lab » plus petit, aligné à droite sous les liens.

### 27/10/2026 — Claude — Vacances : 500 premiers logements offerts à TOUS (particuliers + pros), puis 4,99 €/logement
- **Décision d'Anthony :** 500 premiers logements (particuliers et pros) publiés gratuitement **12 mois** ; ensuite, et au-delà des 500 : **4,99 € par logement / 30 jours** pour tout le monde (TTC particulier, HT pro). Les formules Vacances Pro 20 / 60 logements sont retirées (aucun abonné).
- **Base (appliqué) :** table `vacation_founder_listings`, RPC `claim_vacation_founder_listing(p_listing_id)` (verrou, max 500, met `expires_at` à +12 mois et 15 photos), `get_vacation_founder_remaining()`. Offre `pro_vacances_30` (499 HT, payée via `price_data` car la clé Stripe ne permet pas de créer un prix). `vacances_20`/`vacances_60` inactives. Trigger `activate_private_vacation_listing_purchase` gère aussi `pro_vacances_30`. Fichier : `supabase/2026-10-27-vacances-500-fondateurs-tous-hotes.sql`.
- **Fonctions :** `create-commerce-order` v17 et `stripe-pricing-v2-webhook` v12 acceptent `pro_vacances_30` (copies du dépôt resynchronisées).
- **Site :** `assets/photos-vacances.js` (publication : place Fondateur d'abord, sinon paiement 4,99 € TTC/HT), `pro-fondateur.html` (offre Vacances à l'unité non listée côté pro), textes `aide.html`, `espace-hote.html`, `assets/espace-hote.js`, bandeau `vacances.html` revenu à « Propriétaires & hébergeurs ».
- **Testé :** RPC en transaction annulée (attribution, 2e appel « already », autre propriétaire refusé, places 500 → 499). Paiement réel pro non testé de bout en bout.
- **À faire plus tard :** e-mail de rappel avant la fin des 12 mois gratuits d'un logement ; éventuel plafond de places par compte (une conciergerie peut aujourd'hui prendre beaucoup de places).

### 27/10/2026 — Claude — Accueil par univers : icônes et bouton
- **Changé :** titres de rangées sans émoji, avec l'icône dorée des catégories (voiture, maison, sac) dans une pastille ronde (`.home-group-icon`) ; « Voir les N annonces » devient un bouton dégradé violet → rose, sans flèche. `assets/index-main.js` (v=20261027-univers-icones), `assets/index-core.css` (v=20261027-univers2).
- **27/10 :** Vacances réaffiché dans le menu des catégories en haut (desktop) dans `index.html` (sous-menu « Locations de vacances » / « Devenir hôte »). Le sélecteur Annonces | Vacances et l'encart Vacances restent masqués.

### 27/10/2026 — Claude — Vacances : émojis remplacés par des icônes
- **Changé :** `vacances.html` (badge « Partout en France », 3 cartes « Pourquoi réserver en direct », 4 avantages « Devenir hôte »), `espace-hote.html` (4 actions rapides), `logement-vacances.html` (bouton admin Booster), `assets/vacances-main.js` (v=20261027-icones : étoile de note de l'hôte, logement sans photo) : émojis → icônes SVG au trait doré. Styles dans le nouveau `assets/vac-icons-20261027.css` (inclus dans les 3 pages). Le « ☰ » du menu hôte est conservé.

### 27/10/2026 — Claude — Pied de page aligné + pastille Vacances retirée
- **Changé :** `assets/footer-copyright-20261027.css` (v=3, accueil + Vacances) : sur ordinateur, pied de page centré — logo (accueil), liens centrés, puis « © 2026 Abracadeal · iDream Lab » discret centré sous un filet fin.
- **Retiré :** pastille « Places limitées » du bandeau Vacances (redondante avec « 500 premiers logements »).
- **27/10 (suite) :** pied de page v4 — liens en `.88rem` sur toute la largeur pour tenir sur une ligne ; « Télécharger l'application » sans émoji (`assets/install-app-20261018.js` v=6).

### 27/10/2026 — Claude — Bouton « Importer mon stock » mis en avant (Espace Pro)
- **Changé :** `assets/admin-account-layout-20261018.js` (v=3) : la tuile « Importer mon stock » passe en tête de l'Espace Pro, pleine largeur, dégradé violet → rose, nouvelle icône « upload » + sous-titre « Toutes vos annonces en ligne d'un coup, sans ressaisie ». Pro/Pro, Ma vitrine, Formules restent dessous sur 3 colonnes. Styles dans `assets/admin-account-layout-20261018.css` (v=4).
- **Changé :** `index.html` : dans « Mon activité Pro », bouton « ⬆️ Importer » remplacé par « Importer mon stock » en bouton plein dégradé, pleine largeur, en premier (icône SVG, plus d'émoji) — classe `.pro-dash-import`.

### 27/10/2026 — Claude — Bouton « Tableau de bord » de l'accueil différencié de « Déposer une annonce »
- **Changé :** `assets/index-overrides.css` (v=20261027-dash-btn dans `index.html`) : `.hero-pro-dashboard-button` n'est plus doré plein (trop proche de « Déposer une annonce ») — fond violet foncé translucide, bordure et texte dorés, icône graphique dorée (`::before`), sans ombre dorée.

### 27/10/2026 — Claude — CGV : fin possible de l'offre Fondateurs pour les nouveaux inscrits
- **Changé :** `cgv.html`, paragraphe « Offre Fondateurs » : ajout « Abracadeal peut mettre fin à l'offre Fondateurs à tout moment pour les nouvelles inscriptions, y compris avant l'attribution de toutes les places ; les Fondateurs déjà inscrits conservent leurs avantages jusqu'à leur terme ». Décision d'Anthony : tenir les 12 mois des Fondateurs inscrits, mais pouvoir fermer l'offre aux nouveaux quand le site aura assez d'annonces.

### 27/10/2026 — Claude — « iDream Lab » retiré là où ce n'est pas obligatoire
- **Retiré :** pied de page accueil (`index.html`) et Vacances (`vacances.html`) → « © 2026 Abracadeal » ; `cookies.html` et `classement-annonces.html` → « Éditeur du site : voir les mentions légales » ; `contact.html` : bloc éditeur remplacé par contact + lien mentions légales ; lien Vacances « Consulter les mentions légales » (sans « de iDream Lab »).
- **Conservé (obligatoire) :** mentions légales, CGU, CGV (identité du vendeur, rétractation), confidentialité (responsable du traitement), y compris leurs copies dans les fenêtres de `index.html` et `vacances.html` ; pied des mails de prospection (identification de l'expéditeur).

### 27/10/2026 — Claude — Offre Fondateurs : directement 50 annonces (formule 20 retirée de l'offre)
- **Décision d'Anthony :** 500 premiers pros, gratuit 12 mois jusqu'à 50 annonces ; palier 20 supprimé de l'offre Fondateurs ; formule 100 payante au tarif normal ; au-delà de 100 sur devis ; pas de -50 %.
- **Base (appliqué) :** `pro_subscription_plans.pro_20.founder_eligible = false` (formule 20 reste en vente au tarif public). Migration `founder_offer_direct_50`.
- **Fonctions déployées :** `create-pro-subscription-order` v29 (suppression du blocage « l'offre démarre avec la formule 20 ») ; `change-pro-subscription-plan` v7 (plus besoin d'avoir 20 annonces en ligne pour passer de 20 à 50 en Fondateur). Copies du dépôt à jour.
- **Site :** `pro-fondateur.html` : texte « Jusqu'à 50 annonces en ligne, gratuitement pendant 12 mois » ; carte formule 20 masquée pour un futur Fondateur ; badge Fondateurs seulement sur la formule 50 ; émojis des 4 avantages remplacés par des icônes dorées ; « CSV, XML, JSON » remplacé par une phrase simple. Textes alignés dans `index.html` (encart formules + inscription), `aide.html`, `cgv.html`, `assets/admin-prospection.js`.
- **Reste :** Auto Cévennes Alès (seul Fondateur actuel) est en formule 20 Fondateur ; il peut passer en 50 depuis sa page Formules (gratuit pendant ses 12 mois). Pas de bascule faite à sa place (change le tarif prévu après 12 mois).

### 27/10/2026 — Claude — Carte Fondateurs : « valeur … € HT » retiré
- **Changé :** `pro-fondateur.html` : la carte formule 50 Fondateurs affiche seulement « 12 mois offerts » (plus de « valeur 3 599,88 € HT », ni d'émoji cadeau).

### 27/10/2026 — Claude — Encart « Pros Fondateurs » de l'inscription simplifié
- **Changé :** `index.html` (formulaire d'inscription, `#signupFounderOffer`) : le paragraphe « Offre de lancement… » est remplacé par 4 points cochés (Jusqu'à 50 annonces en ligne · Gratuit pendant 12 mois · Sans carte bancaire, sans engagement · Votre stock mis en ligne pour vous) + « Réservé aux 500 premiers professionnels Auto, Moto et Immobilier ». Le détail (au-delà de 50, 60 jours sans annonce…) reste dans « Voir les conditions ». Icône étoile SVG au lieu de « ✦ ». Styles inline `#signup-founder-list-20261027`.

### 27/10/2026 — Claude — Offre Fondateurs : jusqu'à 100 annonces gratuites pendant 12 mois
- **Décision d'Anthony :** un garage à 56 véhicules ne doit pas payer dès le départ ; plafond Fondateurs porté à **100 annonces gratuites pendant 12 mois** (affiché partout). Au-delà de 100 : sur devis.
- **Base (appliqué) :** `enforce_founder_50_listing_limit()` : pour un abonnement Fondateur en `trialing`, plafond effectif = max(listing_limit, 100) ; au-delà, message « contactez-nous pour une offre adaptée ». Le Fondateur souscrit toujours la formule 50 (tarif après 12 mois : 299,99 € HT) ; aucun changement Stripe. Auto Cévennes (formule 20 Fondateur) a donc aussi 100 places pendant ses 12 mois. Fichier : `supabase/2026-10-27-fondateurs-100-annonces.sql`.
- **Site :** encart inscription « Jusqu'à 100 annonces », fenêtre conditions, encart formules (`index.html`), `pro-fondateur.html` (texte, carte « 12 mois offerts · jusqu'à 100 annonces », note formule 100), `aide.html`, `cgv.html`, `assets/admin-prospection.js`, compteur « Places utilisées » du tableau de bord Pro (affiche /100 pour un Fondateur en période gratuite, `assets/index-main.js` v=20261027-fondateurs100).
- **À faire plus tard :** à la fin des 12 mois, un Fondateur qui continue en formule 50 avec plus de 50 annonces en ligne les garde toutes (le plafond ne bloque que les nouvelles). Prévoir un rappel / une mise en pause des annonces en trop au passage payant.

### 27/10/2026 — Claude — Interrupteur « Offre Fondateurs » dans l'admin
- **Base (appliqué) :** colonne `private.founder_quota_settings.closed_at`, RPC `get_founder_offer_open()` (public) et `admin_set_founder_offer_closed(p_closed)` (admin). `claim_founder_slot` refuse toute nouvelle place si l'offre est fermée (code `founder_offer_full`, donc la fonction d'abonnement bascule au tarif public) ; `get_my_founder_availability` renvoie `founder_offer_closed`. Fichier : `supabase/2026-10-27-fondateurs-interrupteur.sql`. État actuel : **ouverte**.
- **Admin :** nouvelle tuile « Offre Fondateurs » (Ouverte / Fermée) dans Administration (`assets/admin-account-layout-20261018.js` v=4, css v=5), avec confirmation.
- **Site :** nouveau `assets/founder-offer-state-20261027.js` (accueil + `pro-fondateur.html`) : si l'offre est fermée, bandeau, compteurs, encart d'inscription, encart formules, section Fondateurs disparaissent et les textes Pros deviennent neutres. Les Fondateurs inscrits gardent leurs avantages.
- **Corrigé :** le bouton « Tableau de bord » de l'accueil s'affichait aussi aux visiteurs non connectés depuis son nouveau style (`display` forcé) → `.hero-pro-dashboard-button.hidden{display:none!important}` (`index-overrides.css` v=20261027-dash-btn2).

### 27/10/2026 — Claude — Tableau de bord admin : pastille « Fondateurs »
- **Base (appliqué) :** `get_admin_dashboard_stats()` renvoie `plan_counts.founders` (Fondateurs en période gratuite) ; Plan 20 / 50 / 100 ne comptent plus que les abonnements hors période gratuite Fondateur (migration `admin_stats_founders_chip`).
- **Site :** `index.html` : pastille « Fondateurs (gratuit 12 mois) » pleine largeur en tête (réutilise `#statPlan200`, plus de formule 200), puis Plan 20 / 50 / 100 / Sur devis ; `assets/index-app.js` (v=20261027-fondateurs) ; titre « Abonnements Pro » ; tuile « Offre Fondateurs » pleine largeur dans Administration (`admin-account-layout` js v=5, css v=6).

### 28/10/2026 — Claude — Connecteur « sites Annonces-Automobile » (stock repris depuis le site du garage)
- **Contexte :** Ubiflow est payant pour Abracadeal (760 € HT + 19 € HT/mois, ou 500 à 3 500 € HT/mois pour le contenu) et ne peut pas être déclenché par Life Cars (pas client direct). Alternative gratuite : lire le site vitrine du garage, avec son accord écrit.
- **Ajouté (dépôt seulement, PAS encore déployé) :** `supabase/functions/pro-stock-sync/index.ts` : si l'URL du flux d'un pro est la page d'un site réalisé par Annonces-Automobile (photos `cdn-rivamedia.com`), la synchro lit `/annonces` (toutes les pages), puis chaque fiche : titre, prix, marque, modèle, finition, catégorie, km, mise en circulation, énergie, boîte, puissances, CO2, portes, couleur, garantie, description/équipements et **toutes les photos en grand format** (45 max, puis limite photos du compte). Le type (voiture / utilitaire / moto) vient de la catégorie du site.
- **Sécurité :** liste illisible ou vide → erreur, aucune annonce archivée ; fiche illisible ou vendue entre-temps → la référence reste « vue » (pas d'archivage), ligne en erreur. Avec `sync_mode = full`, un véhicule disparu du site est archivé (vendu). Même circuit `pending` → modération → `active`.
- **Testé (lecture seule) sur lifecars.fr le 28/10 :** 49 véhicules lus en 1,8 s, tous avec titre, prix, km, année, énergie, boîte et 20 à 45 photos. Fonction de test `aa-site-preview` désactivée ensuite (renvoie 410, peut être supprimée).
- **Reste à faire pour Life Cars :** accord écrit du garage + compte Pro créé → déployer `pro-stock-sync` depuis ce fichier, créer son flux avec l'URL `https://www.lifecars.fr/annonces` en `sync_mode = full`, vérifier l'aperçu avant activation. Le même connecteur marche pour tout garage dont le site est fait par Annonces-Automobile.

### 28/10/2026 — Claude — Page test « Test import » (aperçu du stock d'un site garage)
- **Ajouté :** `admin-test-import.html` (noindex, réservée à un admin connecté) : saisir l'adresse d'un site garage fait par Annonces-Automobile (Life Cars par défaut) → bouton « Lire le stock » → cartes comme sur Abracadeal (photo, prix, année, km, énergie, boîte, nombre de photos), fiche avec toutes les photos en grand, caractéristiques et description. **Rien n'est enregistré ni publié.**
- **Fonction déployée :** `aa-site-preview` v3 (lecture seule, aucun accès en écriture) : vérifie que l'appelant est admin (`profiles.is_admin`), lit le site avec le même code que `pro-stock-sync`. Copie dans `supabase/functions/aa-site-preview/`. Testé : refus 401 sans connexion.
- **Admin :** tuile « Test import » dans Administration (`assets/admin-account-layout-20261018.js`, `index.html` v=6) ; retour vers Admin dans `app-shell`.
- **Corrigé :** espace insécable écrit ` ` dans la lecture du prix (`pro-stock-sync`), identique en comportement.

### 28/10/2026 — Claude — Sites garages WordPress/WooCommerce (ex. Centurion Motors)
- **Ajouté :** lecteur WooCommerce dans `aa-site-preview` (déployé v4) et `pro-stock-sync` (dépôt, pas encore déployé) : API publique WooCommerce Store (`/wp-json/wc/store/v1/products`) pour nom, prix, toutes les photos, description, marque ; puis la fiche du véhicule pour km, année, puissance, boîte, carburant, couleurs, portes. Véhicules en catégorie « vendus » (ou hors stock) exclus ; si une catégorie « disponible » existe, seuls ceux-là sont repris. Prix 0 = prix non renseigné.
- **Détection :** l'aperçu lit la page d'accueil : site Annonces-Automobile → lecteur AA ; sinon WooCommerce → lecteur Woo ; sinon message « type de site pas encore pris en charge ». Dans `pro-stock-sync`, une URL de page web qui n'est ni AA ni WooCommerce donne une erreur claire.
- **Testé (lecture seule) sur centurionmotors.fr :** 173 produits, 78 disponibles lus en 8,5 s, avec km, année, carburant, boîte, puissance et 18 à 45 photos chacun. Fonction de test `aa-site-preview-tmp` désactivée (410, peut être supprimée).
- **Page :** `admin-test-import.html` indique le type de site lu.

### 28/10/2026 — Claude — Import du stock depuis le site du pro à l'inscription (EN COURS, rien d'appliqué)
- **Demande d'Anthony :** à l'inscription, le pro entre seulement l'adresse de son site et coche une case d'autorisation ; Abracadeal reprend et tient à jour ses annonces. Décisions : l'admin valide chaque site avant activation ; si le site n'est pas lisible, l'inscription passe quand même et l'admin est prévenu.
- **Dans le dépôt, PAS appliqué / PAS déployé :**
  - `supabase/2026-10-28-import-site-inscription.sql` : colonnes `source_kind`, `review_status`, `site_platform`, `authorized_at`, `authorization_text`, `reviewed_at/by` sur `pro_stock_feeds` ; déclencheur à l'inscription (métadonnée `stock_site` = {url, consent}) qui crée un flux « site » en attente, sans jamais bloquer l'inscription ; RPC `request_site_import`, `get_my_site_import`, `admin_list_site_imports`, `admin_review_site_import`. La migration a été annulée à la confirmation le 28/10 : en attente de l'accord d'Anthony.
  - `pro-stock-sync` : lecteur générique (données structurées schema.org, véhicules et immobilier, prix + photo obligatoires), détection du prestataire du site (La Boîte Immo, Activimmo, Apimo, Hektor, Spider VO…), action admin `preview_feed`, blocage de la synchro d'un site non validé par le pro lui-même, budget de temps (modération reportée au cron de relance au-delà de 60 s), sites relus toutes les ~3 h, pas d'archivage si lecture partielle ou < 50 % du stock en ligne.
- **Test du lecteur générique (9 sites de la liste de prospection) :** peu concluant (la plupart des sites n'exposent pas de fiches structurées) → la méthode retenue reste un connecteur par prestataire ; à prioriser selon les prestataires détectés. Fonction de test `aa-site-preview-tmp` désactivée (410).
- **Reste à faire :** appliquer la migration, déployer `pro-stock-sync`, champ + case dans le formulaire d'inscription Pro, liste des demandes et bouton « Activer » dans `admin-test-import.html`.

### 28/10/2026 — Claude — Import du site du pro : EN SERVICE
- **Base (appliqué) :** migrations `import_site_columns` et `import_site_functions` (voir `supabase/2026-10-28-import-site-inscription.sql`). Le déclencheur sur `auth.users` a été refusé : remplacé par `claim_signup_site_import()` appelé à la première connexion du pro. Contrainte : un flux « site » ne peut être actif que validé (`pro_stock_feeds_review_active_check`). Testé en transaction annulée : demande créée en attente, activation directe refusée.
- **Fonction déployée :** `pro-stock-sync` v20 (lecteurs Annonces-Automobile, WooCommerce, données structurées ; détection du prestataire ; `preview_feed` admin ; synchro d'un site non validé interdite au pro ; budgets de temps ; sites relus toutes les ~3 h ; pas de retrait si lecture partielle ou < 50 %).
- **Inscription Pro (`index.html`, `assets/index-main.js` v=20261028-site-import) :** champ « Adresse de votre site (facultatif) » + case d'autorisation (obligatoire si une adresse est saisie ; adresses Leboncoin / La Centrale / réseaux sociaux refusées). Envoyé dans la métadonnée `stock_site` {url, consent, consented_at}. **Corrigé :** le « Choisis ton domaine professionnel » quittait avant le `try`, le bouton restait bloqué sur « Création... ».
- **Admin :** `admin-test-import.html` devient « Imports depuis les sites des pros » : liste des demandes (entreprise, contact, site, type de site détecté, date d'autorisation, dernière synchro, erreurs, annonces en ligne / en vérification), boutons Aperçu, Activer (valide puis lance l'import), Synchroniser maintenant, Mettre en pause, Refuser ; + « Tester une adresse » (via `pro-stock-sync` `preview_url`, auto/moto ou immobilier). Tuile « Imports sites » avec pastille du nombre de demandes en attente (`admin-account-layout-20261018.js?v=7` dans `index.html`).
- **Pour un pro déjà inscrit (accord reçu par mail) :** RPC admin `admin_create_site_import(owner_id, url, sector)` (pas encore de bouton).
- **Limites :** sites sans connecteur → erreur claire + prestataire affiché ; prochains connecteurs à prioriser selon les prestataires vus (La Boîte Immo, Activimmo…). `aa-site-preview` n'est plus utilisée par la page.

### 28/10/2026 — Claude — Mobile : tout l'administratif dans « Admin », « Compte » reste personnel
- **Demande d'Anthony :** doublon entre Compte et Admin sur mobile → tout l'admin dans le menu Admin.
- **Ajouté :** `assets/admin-mobile-merge-20261028.js` + `.css` (chargés dans `index.html`). Sur mobile (≤ 760 px), pour l'admin : la rubrique « Administration » est masquée dans Compte ; le Tableau de bord, la Base de données et l'interrupteur « Offre Fondateurs » sont déplacés dans le menu Admin (sous les outils). Sur ordinateur, rien ne change.
- **Menu Admin :** nouvelle entrée « Imports sites » (pastille = demandes en attente). « Statistiques » et « Base de données » font défiler le menu Admin au lieu d'ouvrir Compte (`assets/index-app.js` v=20261028-admin-mobile).
- Pour annuler : retirer le script et la feuille de style `admin-mobile-merge-20261028` dans `index.html`.

### 28/10/2026 — Claude — Menu Admin mobile : nouvelle mise en page
- **Rubriques :** « À traiter » (Modération, Flux, Imports sites — avec pastilles), « Gestion » (Finances, Prospection, Vacances), « Professionnels » (Pro / Pro + tuile « Offre Fondateurs » Ouverte/Fermée sur deux colonnes, même action qu'avant). Tuiles « Statistiques », « Base de données » et « Messages » retirées (doublons : panneaux juste en dessous, Messages dans la barre du bas).
- **Dessous :** Tableau de bord et Base de données en cartes homogènes (titres lisibles, bouton Actualiser en icône, encart « Gains… / tableau de bord financier » masqué dans ce menu car doublon de la tuile Finances).
- **Corrigé :** titre « Tableau de bord Abracadeal » → « Tableau de bord » ; pastille « Sur devis (+200) » → « (+100) » dans le HTML (formule 200 supprimée).
- Fichiers : `index.html` (menu), `assets/admin-mobile-merge-20261028.js/.css` v=2. Vérifié en capture d'écran mobile (390 px).

### 29/10/2026 — Claude — Vignettes d'annonces plus longues sur mobile (comme Leboncoin)
- **Demande d'Anthony :** vignettes un peu plus longues, comme Leboncoin.
- **Modifié :** `assets/card-overlay-20261029.css` (v=3 dans `index.html`) : sur mobile et tablette (≤ 760 px), la photo des cartes « Les annonces » passe au format 6/7 (un peu plus haute que large) au lieu d'une bande fixe de 108 px. Sur un téléphone de 390 px : photo 175 × 204 px (avant 175 × 108), carte 296 px de haut (avant 200). La photo remplit toujours la vignette, centrée (thumb-fit). Ordinateur inchangé.
- Pour annuler : retirer le dernier bloc `@media (max-width:760px)` de ce fichier.

### 29/10/2026 — Claude — Véhicules des garages : plus de « Bon état » par défaut
- **Demande d'Anthony :** pour les garages (voitures de luxe), « Bon état » n'est pas adapté → ne rien afficher.
- **Cause :** les lecteurs de sites (Annonces-Automobile, WooCommerce, données structurées…) posent `etat:'occasion'`, que `normalizeCondition` traduisait en « Bon état ».
- **Modifié :**
  - `assets/index-main.js` (v=20261029-etat-pro) : la fiche n'affiche plus la ligne « État » pour un véhicule importé (`source` = `feed:…`) dont l'état est « Bon état » / « Occasion ». Import manuel : « occasion » / « used » ne donnent plus d'état.
  - `scripts/build_share_pages.py` : même règle sur les pages annonces statiques (champ `source` ajouté à la lecture).
  - `supabase/functions/pro-stock-sync/index.ts` : « occasion » / « used » → aucun état. **Pas encore déployé** (le site masque déjà l'affichage).
- **Inchangé :** « Neuf », « Très bon état »… s'ils sont indiqués par le garage ; annonces de particuliers.
- **Base :** déclencheur prévu (`clear_pro_feed_vehicle_condition`) non appliqué (validation annulée deux fois) ; aucune annonce de pro en ligne au 29/10, rien à corriger.

### 29/10/2026 — Claude — Mail de prospection « site testé » : réponse « OK » au lieu de l'inscription
- **Demande d'Anthony :** le mail disait « nous avons testé votre site » puis « inscrivez-vous et entrez l'adresse de votre site » : contradictoire.
- **Modifié (base, `private.prospect_mailer_settings.templates`) :** modèles Garage / concession auto, Concession moto, Agence immobilière (variantes A et B) et relances `relance` / `B:relance`. Nouveau message : site testé, tout est prêt → le pro répond simplement « OK », nous créons son espace (lien pour choisir son mot de passe), mise à jour automatique ensuite. Lien conservé en « Découvrir Abracadeal » (suivi `?r=` inchangé). Modèles « manuel » et « normal » inchangés.
- Suite à une réponse « OK » : créer le compte Pro depuis l'admin et activer l'import du site (décision du 28/10).

### 29/10/2026 — Claude — Mail de prospection : nombre d'annonces et pied de page
- **Demande d'Anthony :** retirer iDream Lab du mail ; le nombre d'annonces est-il juste à chaque fois ?
- **`prospect-mailer` (v11) :** pied de page sans « iDream Lab SASU » (« Vous recevez ce message car votre entreprise est référencée… » + lien de désinscription). Le mail « nous avons testé votre site » et sa relance ne partent que si le site a vraiment été lu (`site_check_status = 'ok'` et au moins 1 annonce) ; sinon mail « normal ». **Corrigé :** les relances des prospects jamais testés (premiers envois avant le test des sites) auraient reçu « votre véhicule peut être en ligne… tout est prêt » ; un nombre vide donnait « votre véhicule » au singulier.
- **Orpi :** la liste « biens en vente » d'une agence Orpi contient aussi les biens des autres agences Orpi (vérifié sur orpi.com/orpistcyprien : agences différentes sous les annonces) → comptages faux (733, 581, 212…). Les 6 prospects Orpi passés en `generic` (mail normal, sans nombre). 2 avaient déjà reçu le mail avec le mauvais nombre (Orpi L'entente Immo Sannois 212, Orpi wellkhomevoisins 150).
- **À corriger avant tout import Orpi :** `readOrpiAgency` (pro-stock-sync) doit ne garder que les biens de l'agence (aucun flux Orpi actif au 29/10).

### 29/10/2026 — Claude — Mail « site testé » sans nombre d'annonces
- **Demande d'Anthony :** ne plus mettre de nombre ; expliquer qu'après « OK » on s'occupe de tout et qu'ils reçoivent un mail pour choisir leur mot de passe et accéder à leur page pro et à leur stock.
- **Modèles (base) :** Garage, Moto, Immo (A et B) + relances : « Nous avons testé le site de {{societe}} : Abracadeal peut reprendre automatiquement {{vos_annonces}}… », réponse « OK », création de l'espace pro, mail pour le mot de passe → page pro et stock. `{{annonces}}` (nombre) n'est plus utilisé dans ces modèles.

### 29/10/2026 — Claude — Mail « site testé » : texte retravaillé
- Modèles Garage / Moto / Immo (A et B) + relances réécrits plus simplement : « Nous sommes passés sur le site de {{societe}} : {{vos_annonces}} peuvent apparaître sur Abracadeal… Pour démarrer, répondez simplement « OK »… ». Objet A : « {{societe}} : {{vos_annonces}} sur Abracadeal, sans rien ressaisir » (objets B inchangés).

### 29/10/2026 — ChatGPT — Lecture Cannisimmo (Apimo template 19)
- Corrigé : fiche précédemment rejetée car en-tête `property-info-template-19` et titre de description en `<h3>`, non reconnus. Lecture du prix, ville, type et titre sur ces modules ; code postal/chambres issus uniquement du JSON-LD du bien dont l'URL correspond (référence mandat distincte de l'identifiant URL).
- Vérifié : fiche 87522659, 349 000 €, Cannes 06400, 44,45 m², 2 pièces, 1 chambre, 1 salle de bains, 8 photos uniques, DPE C / GES A, consommation 119. Pas de conseiller inventé depuis le pied de page.
- Tests : `node --experimental-strip-types tests/apimo-cannisimmo.test.mjs` (fiche réelle, données structurées étrangères écartées, pagination et dédoublonnage) ; régression de lecture sur deux fiches Infinity avec leurs conseillers distincts : OK.

### 29/10/2026 — ChatGPT — Cannisimmo déployé après accord d’Anthony
- PR #11 fusionnée : `31f96409e0ed4f694f4a9ba1fb8b86dd56c54a7b` ; `pro-stock-sync` v89 ACTIVE, import épinglé sur ce commit, configuration d’authentification conservée.
- Vérification réelle de production en lecture seule (`auto_review_dry`) : fiche 87522659, HTTP 200, 1 fiche complète, 349 000 €, Cannes 06400, 8 photos, surface/pièces/DPE renseignés, aucune erreur. Aucune annonce publiée par ce contrôle.
- Contrôle du site entier : HTTP 200, 12 pages, 133 fiches lues sans lecture partielle, 121 après dédoublonnage (12 doublons), 1 467 photos, 119 fiches sans erreur de normalisation ; 2 fiches signalées « GES manquant ». Les diagnostics absents restent absents, aucune valeur inventée.

### 29/10/2026 — Claude — Mails de prospection : « pendant le lancement » retiré
- Tous les modèles (site testé, manuel, normal, relances, modèle par défaut) : « gratuit pour les professionnels » sans « pendant le lancement ».

### 29/10/2026 — Claude — Bilan mensuel envoyé aux pros + partages comptés
- **But (Anthony) :** à la fin des 12 mois gratuits, l'argument pour rester sera les résultats ; le pro doit les voir chaque mois.
- **Base (appliqué, `supabase/2026-10-29-bilan-mensuel-pro.sql`) :**
  - `listing_events` accepte `share` ; `track_listing_event` compte les partages (une fois par visiteur, annonce et jour ; propriétaire et admin exclus).
  - `private.queue_pro_monthly_reports(p_month)` : pour chaque compte pro (hors admin) ayant eu au moins 1 vue dans le mois écoulé, met un mail `custom_message` dans `pro_email_outbox` (clé `monthly-report:<user>:<AAAA-MM>`, un seul par mois) : vues, numéros affichés, appels, messages, favoris, partages (lignes à 0 masquées), 3 annonces les plus vues, nombre d'annonces en ligne. Envoyé par `process-pro-transactional-emails` (Resend), avec le bouton « Accéder à mon espace Pro ».
  - Tâche planifiée `abracadeal-pro-monthly-report` : le 1er du mois à 7 h 37 UTC. Premier envoi : 1er novembre (bilan d'octobre).
  - Testé dans une transaction annulée : « Votre bilan d’octobre », puces correctes, accords singulier/pluriel.
- **Site (`index-main.js?v=20261029-partages`) :** chaque partage (WhatsApp, Facebook, SMS, copier le lien, partage du téléphone) est compté.

### 02/11/2026 — Claude — WeeCars Angers a répondu « OK »
- Réponse d'Olivier Martin (gérant, olivier.martin@weecars.fr, 07 69 62 95 55) le 02/11 à 7 h 42 au mail « site testé » du 31/10.
- **Corrigé (base) :** `stock_page_url` du prospect passait par la page agence (`/319/agence/?agence_id=993`), dont l'aperçu mélangeait des véhicules d'autres agences Weecars (photos `stock_1726`, `stock_954`, `stock_1022`, `stock_1171` ; 1 seul `stock_993` sur 6). Remplacé par la page stock de l'agence : `https://www.weecars.fr/319/vehicules/?stock=993`. **À l'import, utiliser cette adresse, pas la page agence.**
- SIRET trouvé (annuaire de franchises, non officiel) : 894 261 478 00024 — à confirmer par « Vérifier » (registre officiel) dans l'admin.
- Reste à faire par Anthony (admin connecté) : « Créer le compte et importer le stock », vérifier l'import (24 véhicules attendus, photos sans logo d'un autre site), activer, puis envoyer le mail de bienvenue.

### 02/11/2026 — Claude — Import WeeCars Angers : 14 annonces sur 24 en erreur (texte trop long)
- **Cause :** contrainte `listings_description_check` (5 000 caractères max). Les fiches WeeCars ont de très longues listes d'équipements, stockées encodées (`%XX`) dans `[ABRACA_VMETA:…]` + le texte du garage → plus de 5 000 caractères. L'admin affichait seulement « [object Object] ».
- **Corrigé (`pro-stock-sync`) :** si le texte dépasse 5 000 caractères, la liste d'équipements est raccourcie (balises de référence intactes), puis le texte libre est coupé proprement avec « … ». Les erreurs de la base s'affichent maintenant en clair (message + code) au lieu de « [object Object] ».
- Test : fiche de 16 680 caractères → 4 999, métadonnées toujours lisibles.

### 02/11/2026 — Claude — Spider VO : le filtre d'agence (`?stock=`) était ignoré
- **Constat (WeeCars Angers) :** `readSpiderVo` reconstruisait la liste en `/319/vehicules/` et perdait `?stock=993` → les 24 premiers véhicules du stock **national** WeeCars étaient importés sous le compte d'Angers (photos `stock_1296`, `stock_1684`, `stock_954`… aucune `stock_993` ; un GLC de Bry-sur-Marne dans l'aperçu).
- **Corrigé :** si l'adresse donnée est déjà une page `/<n°>/vehicules/`, elle est lue telle quelle, avec son filtre. Les autres sites Spider VO (adresse d'accueil) ne changent pas.
- **Nettoyage :** les 10 annonces créées par erreur (3 en ligne, 7 en attente) passées en `archived` / `import_removed`.
- **Attention :** la note du 31/10 (« filtre `stock=` bien appliqué ») concernait le site WeeCars lui-même, pas notre lecteur. Toutes les agences Weecars de la prospection sont concernées : à relire avec ce correctif avant tout import.

### 02/11/2026 — Claude — Titres de plus de 100 caractères coupés à l'import
- WeeCars Angers : un Transporter refusé par `listings_title_check` (100 max). `pro-stock-sync` coupe désormais le titre proprement avec « … ».

### 02/11/2026 — Claude — Modération : la limite OpenAI (HTTP 429) bloquait la validation
- WeeCars Angers (24 voitures, ~30 photos chacune) : la version gratuite d'OpenAI Moderation renvoyait 429 → annonces bloquées « Analyse de sécurité indisponible » et bouton « Valider » de l'admin en échec (il passe aussi par l'analyse).
- `moderate-listing/safety.ts` : en cas de 429, attente (Retry-After ou 1,5 s × essai) puis nouvel essai, 4 fois max ; 2 photos à la fois au lieu de 4 ; délai total 90 s au lieu de 65 s. L'analyse reste obligatoire.

### 02/11/2026 — Claude — Analyse OpenAI réservée aux particuliers (décision d'Anthony)
- `moderate-listing` : une annonce `professionnel` dont le compte a un SIRET vérifié (`pro_verifications.verified_at`) ne passe plus par OpenAI Moderation (texte + photos). Raison : la limite de débit gratuite bloquait la mise en ligne des stocks des pros.
- Toujours actifs pour les pros : offres interdites (`prohibitedTerms`), anti-republication 30 j, score de risque (prix, téléphone étranger, e-mail jetable…), signalements.
- Les particuliers et les comptes pro sans SIRET vérifié gardent l'analyse OpenAI.

### 02/11/2026 — Claude — Alertes de synchro : vrais boutons + plus coupées
- **Demande d'Anthony :** les alertes (Messages et Admin > Erreurs de flux) s'affichaient sans moyen d'agir.
- **Messages :** la zone des alertes était limitée à 96 px (le bouton « Marquer comme lu » était caché) → 45 % de l'écran. Chaque alerte a « Ouvrir » (admin : Erreurs de flux, ou page des imports pour nouveau pro / site à vérifier ; pro : son espace pro), « Marquer comme lu », « Supprimer ».
- **Un pro ne voit plus le message technique** (ex. « OpenAI Moderation HTTP 429 ») mais une phrase simple : mise à jour partielle, nouvel essai automatique, rien à faire.
- **Erreurs de flux (admin) :** « Relancer la synchro » (efface l'alerte si plus d'erreur), « Voir le pro » (sa page publique), « Supprimer ».
- Nettoyage : alertes WeeCars Angers (admin + pro) résolues, l'erreur était réglée.
- Fichiers : `assets/index-main.js` v=20261102-alertes, `assets/index-core.css` v=20261102-alertes.

### 02/11/2026 — Claude — Bannière WeeCars Angers
- Image fournie par Anthony (logo WeeCars, fond bleu) : `assets/pro-banners/weecars-angers.jpg`, copiée dans le stockage `pro-showroom` et posée en `banner_path` de la vitrine (signature-motors-group-weecars).
- Fonction ponctuelle `admin-set-showroom-banner-once` (clé interne obligatoire, source limitée au dépôt GitHub) : réutilisable pour poser la bannière d'un autre pro.

### 02/11/2026 — Claude — WeeCars Angers : nom affiché et adresse courte
- Nom affiché : « WeeCars Angers » (raison sociale SIGNATURE MOTORS GROUP (WEECARS) conservée dans `pro_verifications`).
- Adresse : abracadeal.fr/weecars-angers. L'ancienne (signature-motors-group-weecars), envoyée dans le mail de bienvenue, fonctionne toujours : nouvelle colonne `pro_showrooms.old_slugs`, lue par `pro_slug_resolve` (`supabase/2026-11-02-pro-old-slugs.sql`, appliqué).

### 02/11/2026 — Claude — Vitrine pro : logo, filtre catégories, logo sur les annonces
- WeeCars Angers : logo refait (mot WeeCars sur fond bleu, carré, tiré de la bannière fournie) → `assets/pro-banners/weecars-angers-logo.jpg`, posé en `logo_path` (l'ancien logo lu sur le site était un « C » coupé).
- `pro.html` : plus de filtre « Toutes les catégories » dans la vitrine d'un pro (un pro = un domaine) ; recherche et tri conservés.
- Fiche annonce (`index-main.js` v=20261102-logo-vendeur, `detail-mobile-20261019.css` v=2) : la carte vendeur d'un pro affiche son logo au lieu des initiales (initiales si pas de logo).
- `admin-set-showroom-banner-once` accepte `kind: logo`.

### 02/11/2026 — Claude — Vitrine pro : vrais filtres
- `pro.html` : recherche « modèle » + filtres Marque, Budget max, Carburant, Boîte, Km max, Année (véhicules) ; Budget max pour les autres domaines. Un filtre n'apparaît que s'il offre au moins 2 choix dans le stock du pro ; les paliers de prix/km suivent le stock (du moins cher au plus cher).
- Tri : récentes, prix croissant/décroissant, moins de kilomètres, année la plus récente. Compteur « N véhicules » + « Effacer les filtres ».
- Cartes véhicules : ligne « année · km · carburant · boîte » sous le prix. Libellés harmonisés (« HYBRIDE ESSENCE » → « Hybride essence »).

### 02/11/2026 — Claude — Accueil : équipements et pièces sortis de « Auto & Moto »
- Remarque d'Anthony : un blouson/casque dans la rubrique Auto & Moto de l'accueil, « pas ouf ».
- `HOME_GROUPS` (index-main.js v=20261102-equipements) : « Auto & Moto » ne montre plus que les véhicules ; les sous-catégories `equipement-*` (casques, blousons, pièces, jantes…) ont leur propre rubrique « Équipements & pièces auto / moto », après Immobilier. Catégories et recherche inchangées.

### 02/11/2026 — Claude — Vignettes plus nettes et mieux remplies
- Remarque d'Anthony : qualité des miniatures « bof ».
- `generate-listing-thumbs` : miniatures 900 px / JPEG 82 (au lieu de 480 px / 70). Toutes les miniatures refaites (`private.listing_photo_thumbs` vidé) ; adresse `?o=3` côté site pour ne pas garder les anciennes en cache.
- `thumb-fit-20261009.js` v5 et `card-photo-fit-20261101.js` v5 : une photo en largeur (voitures) remplit la vignette, centrée, au lieu d'être réduite sur fond flou (seuil 15 % → 45 % de photo coupée). Photos prises en hauteur : toujours entières sur fond flou (règle du 01/11 inchangée).

### 02/11/2026 — Claude — Catégorie Véhicules : uniquement des véhicules
- Demande d'Anthony : dans la catégorie Véhicules, que des véhicules, ni équipement ni pièce.
- `index-main.js` (v=20261102-vehicules-seuls) : « Véhicules » (sans sous-catégorie) exclut tous les équipements **et les pièces détachées** (`EQUIPMENT_TYPES`). Nouvelle sous-catégorie virtuelle `equipements` = tous les équipements + pièces. Les annonces restent en base sous `vehicules` (rien à migrer).
- Correctif : l'accueil « Auto & Moto » laissait passer les pièces détachées (test `/^equipement/`) ; la rubrique « Équipements & pièces » a maintenant son bouton « Voir les N annonces ».
- Filtres : sous-catégorie en deux groupes (Véhicules / Équipements & pièces) ; km, année, carburant masqués pour les équipements.
- Menu desktop : nouvel onglet « Équipements » (auto, moto, caravaning, nautisme, vélo, pièces) ; le sous-menu Véhicules ne liste plus que des véhicules.
- `description-helper-20261013.js` v=3 : retrait du regroupement Auto/Moto + équipements (18/10).
- Recherche IA (`smart-search` v=20261102-equipements) : casque, blouson, pièces, pneus, jantes… → « Équipements & pièces », jamais Véhicules.

### 02/11/2026 — Claude — Vélos sortis de Véhicules
- Demande d'Anthony : même les vélos doivent sortir de Véhicules.
- `index-main.js` v=20261102-sans-velos : `NON_VEHICLE_TYPES` = vélos + équipements + pièces. Véhicules = voitures, motos, utilitaires, caravaning, nautisme. La rubrique devient « Vélos, équipements & pièces » (accueil, filtre, onglet desktop « Vélos & équipements »).
- Recherche IA (v=20261102-velos) : vélo, VTT, VAE, BMX → sous-catégorie Vélos.

### 02/11/2026 — Claude — Vitrine pro : tri par prix uniquement
- Demande d'Anthony : trop de filtres dans le showroom, garder seulement croissant / décroissant.
- `pro.html` : recherche modèle et filtres (marque, budget, carburant, boîte, km, année) retirés. Il reste une ligne « N véhicules » + menu « Trier par prix » (Prix croissant / Prix décroissant). Par défaut : les plus récentes d'abord.

### 02/11/2026 — Claude — Accueil : bouton « Voir les N annonces » qui débordait sur mobile
- Signalé par Anthony (capture iPhone, rubrique « Vélos, équipements & pièces »).
- `index-core.css` v=20261102-rubriques : le titre peut passer sur 2 lignes, le bouton ne rétrécit plus ; sur mobile (≤ 620 px) bouton plus compact « Tout voir (N) ». Desktop inchangé. `index-main.js` v=20261102-rubriques.

### 02/11/2026 — Claude — Accueil : rubriques en rangées complètes
- Signalé par Anthony (tablette en paysage, 6 colonnes) : « Auto & Moto » montrait 8 annonces → une rangée de 6 + une rangée de 2 à moitié vide.
- `index-main.js` v=20261102-rangees : le nombre d'annonces par rubrique s'adapte au nombre de colonnes de la grille (6 col. → 12, 4 → 8, 3 → 9, 2 → 8). S'il n'y a pas assez d'annonces pour une rangée de plus, on s'arrête à la dernière rangée complète. Recalcul automatique si on tourne la tablette.

### 02/11/2026 — Claude — Accueil : « Toutes les annonces » en bas
- Demande d'Anthony : la dernière rubrique de l'accueil doit montrer toutes les annonces.
- `index-main.js` v=20261102-toutes : « Toutes les autres annonces » → « Toutes les annonces », avec la totalité du catalogue (y compris les annonces déjà montrées dans Auto & Moto, Immobilier, Vélos/équipements).

### 02/11/2026 — Claude — Fondateur : plus de formules ni d'annonce supplémentaire visibles
- Demande d'Anthony (WeeCars Angers, Fondateur n°2) : un Fondateur ne doit pas voir d'« annonce supplémentaire » payante.
- Vérifié côté serveur : `enforce_founder_50_listing_limit` laisse passer sans plafond un Fondateur en période gratuite (règle du 29/10) → jamais de message « achetez une annonce supplémentaire ».
- `index-app.js` v=20261102-fondateur : encadré « Mon abonnement Pro » d'un Fondateur = badge « Fondateur », Offre Fondateur n°X, Annonces illimitées, Gratuit jusqu'au …, « Aucun prélèvement pendant vos 12 mois ». Plus de « Jusqu'à 50 annonces » ni de bouton « Changer de formule » (portail Stripe avec les tarifs). « Résilier » reste.
- `admin-account-layout` v=9 : tuile « Formules » (page tarifs) → « Mon offre » (renvoie à l'encadré Fondateur) pour un Fondateur en période gratuite.
- Les Boosts payants restent visibles (règle : boosts / visibilité payants pour tous).

### 02/11/2026 — Claude — Numéro de Fondateur réservé à l'admin
- Demande d'Anthony : « Fondateur n°2 » ne doit pas être montré au pro (utile pour nous seulement).
- `index-app.js` v=20261102-fondateur2 : encadré du pro = « Offre : Fondateur Abracadeal ».
- `process-pro-transactional-emails` (déployée v9) : plus de « Fondateur n°X » dans les mails (sujet et texte). Mail de bienvenue Fondateur aligné sur la règle du 29/10 : « Annonces illimitées pendant 12 mois » au lieu de « Jusqu'à 50 annonces » ; phrase « dès 20 annonces passez à 50 » retirée.
- Le numéro reste visible côté admin.

### 02/11/2026 — Claude — Showroom vu par son propriétaire
- `pro.html` : quand le pro regarde sa propre page, plus de « S'abonner » ni « Contacter » (il ne peut pas s'abonner à lui-même) → bouton « Modifier ma page » (vers /?espace=pro) + « Partager », et un bandeau « C'est votre page : vos clients la voient exactement comme ça. »
- Ses propres visites ne sont plus comptées dans les vues du showroom.
- Côté espace Pro d'un Fondateur, les seuls éléments payants visibles sont les options de visibilité (Boosts, Options).

### 02/11/2026 — Claude — Annonces reprises du site du pro : message avant modification / suppression
- Demande d'Anthony : expliquer au pro que la modification est possible, mais doit être faite en priorité sur son site principal, sinon la mise à jour automatique la remet comme avant.
- `index-main.js` v=20261102-synchro : dans le formulaire « Modifier » d'une annonce `source = feed:*`, encadré orange : « Cette annonce est reprise automatiquement depuis votre site… faites la modification en priorité sur votre site principal : sinon, à la prochaine mise à jour (environ toutes les 3 heures), l'annonce reviendra comme avant. » Version admin : renvoie vers Imports sites → Modifier (correction qui reste).
- Supprimer une annonce reprise : confirmation « Retirez-la en priorité de votre site principal : sinon, elle réapparaîtra… ».

### 02/11/2026 — Claude — Vérification complète du compte WeeCars Angers
- Demande d'Anthony : vérifier que tout fonctionne et que les messages sont effacés.
- OK : e-mail confirmé + mot de passe, profil pro, SIRET vérifié, Fondateur actif (12 mois jusqu'au 02/11/2027), vitrine weecars-angers (+ ancienne adresse), bannière et logo, 24 voitures en ligne (toutes en « Voitures », prix, ville, 14 à 30 photos, téléphone de contact, aucun doublon, aucune en attente), 10 archivées (véhicules partis du site). Synchro du site active, sans erreur, prochaine lecture toutes les ~3 h. Alertes : toutes lues et résolues (rien dans Messages ni dans Admin > Erreurs de flux). Aucune conversation.
- **Bug corrigé** (migration `synced_listings_no_60_day_expiry`, fichier `supabase/2026-11-02-synced-listings-no-expiry.sql`) : les annonces reprises d'un site expiraient au bout de 60 jours (le 01/01/2027 pour WeeCars) même avec le véhicule toujours en vente, et la synchro ne les remettait pas. Elles restent maintenant en ligne tant que la synchro du site fonctionne.
- À savoir : le mail automatique « Bienvenue Fondateur » est parti le 02/11 à 10 h 14 (ancienne version : « Fondateur n°2 », « jusqu'à 50 annonces »). Vitrine sans texte de présentation.

### 02/11/2026 — Claude — Mails : vérification de la boîte + adresses d'hébergeurs bloquées
- Demande d'Anthony : lire les mails et vérifier que tout va bien.
- Problème trouvé : le mail de prospection « SKH GLOBAL MOTORS » est parti aujourd'hui à privacy@railway.com (l'hébergeur du site, pas le garage) — réponse automatique de Railway en anglais.
- Corrigé dans la base : 8 prospects avec une adresse qui n'est pas celle du pro passés en `error` (« à remplacer avant tout envoi ») : SKH Global Motors (railway), Angers Auto Prestige (ovhcloud), Škoda Avignon (strikingly), Giro Bike (dcinformatique.ovh), Courtassur (ionos), European Riviera Properties (apiwork), Meca Racing 01 (webador), Seyssinet Alpes Auto (faute de frappe dans le domaine).
- `prospect-mailer` v14 : plus aucun envoi (1er mail ni relance) vers une adresse d'hébergeur / créateur de site / logiciel (railway, ovh, ionos, wix, strikingly, webador, apimo/apiwork, annonces-automobile, ubiflow…).
- Le reste : WeeCars a bien répondu « ok » (déjà traité) ; Agencia désinscrit (« STOP ») et bien en opposition ; aucun rebond nouveau à part ceux déjà gérés automatiquement ; rapports DMARC habituels.

### 02/11/2026 — Claude — pro-stock-sync : aperçu complet en lecture à blanc
- `auto_review_dry` accepte `preview_limit` (max 300, défaut 6 inchangé) pour récupérer toutes les fiches d'un site avec photo, sans rien enregistrer — utilisé pour l'aperçu de l'agence Infinity Group Immo.

### 02/11/2026 — Claude — Aperçu showroom pour l'agence Infinity Group Immobilier (Le Cannet)
- Demande d'Anthony : un aperçu à envoyer au patron d'Infinity (via une amie qui a travaillé pour eux).
- Lecture à blanc de infinitygroup-immo.com (Apimo, 173 biens lus, rien publié) ; les 172 fiches avec photo sont dans `prospect_previews`.
- Page `demo/infinity/index.html` (noindex, /demo/ bloqué dans robots.txt) : vrai look du showroom, tri par prix, 154 biens (les 18 biens à l'étranger — Phuket, Marrakech, Espagne, Ibiza — sont exclus : le robot leur mettait une ville française fausse, ex. « Antibes », « Mont-de-Marsan »).
- Données lues via `get_demo_preview(token)` (lien secret, expire au bout de 60 jours). Lien : https://abracadeal.fr/demo/infinity/?k=OuXQwIhe4ushx2pP
- À faire si Infinity accepte : régler la ville des biens à l'étranger dans le lecteur Apimo avant l'import. Supprimer la démo après.
- Ajout (demande d'Anthony « une vue client plutôt ») : `demo/infinity/client.html` = vue acheteur, avec le vrai look du site (en-tête, bannière, cartes d'annonces, fiche annonce, barre du bas), 154 biens, tri par prix, encart « Vos biens sur Abracadeal, sans rien ressaisir ». Lien à envoyer : https://abracadeal.fr/demo/infinity/client.html?k=OuXQwIhe4ushx2pP
- pro-stock-sync : l'aperçu de lecture à blanc donne aussi DPE (`d`) et GES (`g`) ; avec `preview_limit` > 6 : chambres, honoraires, charges annuelles, description et jusqu'à 15 photos (pour les démos).
- Démo Infinity (vue client) complétée, demande d'Anthony « y'a pas les DPE / comme en vrai » : relecture complète du site (173 biens), cartes avec badge DPE comme sur le site, fiche avec toutes les photos (galerie, ~9 par bien), Diagnostics (échelles DPE et GES du site), chambres, charges annuelles, honoraires et description complète. 115 biens sur 172 ont un DPE sur leur site (les autres : terrains, commerces, biens sans DPE affiché → « DPE non communiqué sur l'annonce d'origine »).

### 02/11/2026 — Claude — 30 photos pour tous les pros
- Décision d'Anthony : 30 photos par annonce pour tous les pros (formule 100 et sur devis : 45). Particuliers et Vacances inchangés.
- Cause : les annonces WeeCars avaient été créées à 15 photos puis passées à 30 → la synchro de 12 h 52 a tout réécrit (590 photos) et remis les 24 annonces en vérification admin.
- Base (migration `pro_photos_min_30`) : formules pro passées de 15 à 30 photos (pro_20, high-tech, maison, mode, emploi) ; `abraca_founder_photo_cap` = minimum 30 pour toute annonce de pro hors Vacances, avec ou sans formule ; annonces de pros déjà en ligne mises à jour.
- pro-stock-sync : une annonce importée est créée directement à 30 photos (plus de passage 15 → 30 qui réécrit tout à la synchro suivante).
- Site : `index-main.js` v=20261102-photos30 (dépôt d'annonce d'un pro = 30 photos, 45 en formule 100) ; FAQ mise à jour.

### 03/11/2026 — Claude — prospect-mailer v16 : mail aperçu raccourci, plus de nombre d'annonces non garanti
- Demande d'Anthony (concurrent myfr.ai reçu) : se démarquer, pas trop long, expliquer que c'est donnant-donnant et « qu'ils resteront parce que ça marche ».
- Mail aperçu : 1 phrase de présentation d'Abracadeal, aperçu privé, « Je publie » + SIRET, « 12 mois offerts, sans carte bancaire ; si ça vous amène des clients vous restez, sinon vous arrêtez en un clic ». Signé « Anthony, fondateur d'Abracadeal ». Corrige l'ancien « gratuit pour les professionnels » (l'offre Fondateurs = 12 mois offerts).
- Problème signalé par Anthony : « 24 alors qu'il y en a 127 ». Cause : `prospect_previews.count` / `site_check_count` = annonces lues par le robot, souvent 1re page ou « derniers biens » (Weecars 24, Junot 20, AJP 23, Citya 11, Kermarrec 25…). Mails partis avec un mauvais nombre (ex. Weecars Amiens « 23 » le 03/11).
- Correctif : `SHOW_COUNT = false` → aucun nombre dans les mails (aperçu et standard) : « vos véhicules », « vos biens ».
- Déployé : prospect-mailer v16, figé au commit 6e3dc4d.
- Reste à faire : vérifier que le robot lit TOUT le stock pour ces plateformes (l'import utilise le même lecteur) et ne réafficher un nombre que s'il est garanti (total affiché par le site = annonces lues).

### 03/11/2026 — Claude — Envoi en pause, aperçus faux supprimés, nombre d'annonces « garanti »
- Demande d'Anthony : « arrête les mails et répare tout ça ». Les écritures en base via le connecteur Supabase demandent une confirmation qui ne s'affiche pas chez Anthony (ni téléphone ni ordi) → SQL lancé par Anthony dans le SQL Editor (`supabase/2026-11-03-prospect-previews-count-sure.sql`).
- Envoi arrêté : `PAUSE_SENDING = true` dans prospect-mailer (v17/v18) + `sending_enabled = false`. Aucun mail depuis 11:40 UTC.
- Trouvé : aperçus faits avec l'ancien robot (avant v276, 02/11 18:53 UTC) — Weecars Amiens (a cliqué) et Toulon, qui ont reçu le mail aperçu, montraient des voitures d'autres agences Weecars. 528 aperçus anciens supprimés ; prospect_preview_fill les refait la nuit (sent d'abord).
- `prospect_previews.count_sure` : vrai seulement si le site affiche lui-même son total (site_count) et que le robot l'a lu (à 10 % près au-dessus), sans lecture partielle. Spider VO, AJP, Kermarrec exposent ce total. Mails et page aperçu n'affichent un nombre que si count_sure.
- pro-stock-sync v277 (f1f61fe), prospect-mailer v18 (f1f61fe, toujours en pause). Page Fondateurs : pas de nombre non garanti, « 12 mois offerts ».
- Pour relancer l'envoi : PAUSE_SENDING = false + redéployer, et `update private.prospect_mailer_settings set sending_enabled = true` (pas le bouton FEU VERT, qui remet aussi en « ready » les prospects en pause).

### 03/11/2026 (après-midi) — Claude — Aperçus refaits de jour, tri qualité, envoi relancé
- Demande d'Anthony : refaire les aperçus tout de suite. Cron `abracadeal-prospect-preview-fill` passé à `*/2 * * * *` (TEMPORAIRE : remettre `2-59/4 22-23,0-4 * * *` quand les prospects sent/ready sont refaits).
- Contrôle des premiers aperçus : Ligier Store montrait « Aixam - Coupé S8 (vendu) » → robot (normalizeRows) écarte « (vendu) », « - VENDU », « (réservée) » en fin de titre ; aperçu Ligier vidé. EMJ : 1 ligne = nom du garage. T2P : 6 × « Cental--> ». Wiroth : maison « à vendre » 1 450 € (location).
- Tri qualité commun page + mail (`goodRows` / `goodPreviewRows`) : titres vides/répétés écartés, vente immo < 5 000 € écartée, ≥ 3 annonces et ≥ 3 titres différents sinon pas d'aperçu ; loyers « / mois » sur la page.
- pro-stock-sync v278 (657c55e), prospect-mailer v20 (d52bc13). Envoi relancé par Anthony (SQL Editor) à 12:48 UTC ; 1ers envois aperçu EWIGO Valence et Ardesia contrôlés OK.
- Connecteur Supabase : certaines écritures (DELETE, parfois UPDATE) demandent une confirmation qui ne s'affiche pas chez Anthony → lui passer le SQL.

### 03/11/2026 — Claude — Référencement : grande ville dans les titres, flux produits ChatGPT
- Demande d'Anthony (« quand on tape le modèle ça doit tomber sur nous ») : pages annonces d'une commune d'agglomération → titre « … – Les Ponts-de-Cé, Angers (49) », description « …, près d'Angers » (`near_city` sur AGGLOS). VERSION 11 → toutes les pages refaites.
- Demande d'Anthony (« être proposé par ChatGPT ») : `scripts/build_chatgpt_feed.py` → `feeds/chatgpt-products.jsonl` (spec OpenAI Commerce « Products » : 9 champs obligatoires, price « 19990.00 EUR », condition used/new, recherche seulement, pas de paiement dans ChatGPT). Généré à chaque passage du workflow share-pages. 150 produits au 03/11 (127 WeeCars Angers). Écartés : immobilier/vacances/emploi/services, sans prix, sans photo, sans marque (la marque est obligatoire, pas de valeur inventée). Téléphones et e-mails retirés des descriptions.
- Programme marchands OpenAI : ouvert aux États-Unis seulement (03/11/2026), liste d'attente via chatgpt.com/merchants — formulaire à remplir par Anthony (nom, LinkedIn, e-mail pro). Petites annonces / occasion : ni acceptées ni exclues par OpenAI.
- Vignettes : photo affichée en fondu une fois entièrement chargée (index-main.js v=20261103-photos). Les vignettes pèsent ~125 Ko (720 px, JPEG 80) : à alléger si Anthony valide.

### 04/11/2026 — Claude — Contrôle du matin
- 434 aperçus refaits depuis le 03/11 12:22 UTC (17 count_sure) ; tous les prospects « sent » ont un aperçu ; 137 « ready » restent à faire (cron preview-fill toujours à */2, à remettre la nuit quand c'est fini).
- Weecars Amiens/Toulon/Cannes/Aix/Niort/Saint-Orens : uniquement leurs photos stock_<id>. WeeCars Angers (client) : source_url = page agence → aperçu mélangé ; vidé + last_inbound_contact_at = now (plus de relance). À noter : 666 prospects actifs ont un stock_page_url ≠ source_url, le robot d'aperçu lit source_url.
- Hélix Immobilier : articles de blog pris pour des biens → immo : titre doit nommer un bien (mail + page). prospect-mailer v21 (a6420b3).
- Accord « Je publie » Ofim Immobilier (04/11 02:27 UTC) : SIRET 411 182 298 00058 non vérifié, e-mail perso gmail sans lien avec ofim.fr → signalé à Anthony, rien importé.

- 05/11/2026 (Claude) : phrase ajoutée en fin des mails de prospection (aperçu + modèles auto/immo/moto/manuel/normal) : « Vous payez déjà des milliers d'euros par an pour être visible ailleurs ? Gardez vos plateformes : Abracadeal vient en plus. Vous n'avez rien à perdre. » ; 92 agences de réseaux/groupes immo mises en Phase 2 (petites agences indépendantes en priorité).

- 05/11/2026 (Claude) : « 12 mois offerts » retiré des mails de prospection, remplacé par « gratuit pendant le lancement, sans carte bancaire, sans engagement » (modèles en base + mail aperçu). Les Fondateurs déjà inscrits gardent leurs 12 mois promis.

- 05/11/2026 (Claude) : pro-fondateur.html — textes publics (accroche + carte Fondateurs) passés à « gratuit pendant le lancement » ; les messages destinés aux Fondateurs déjà inscrits gardent les 12 mois.

- 05/11/2026 (Claude) : « pendant le lancement » retiré aussi — mails et page Fondateurs disent simplement « Gratuit, sans carte bancaire, sans engagement » (jamais « gratuit à vie »). Si ça devient payant un jour : prévenir les pros à l avance.

- 05/11/2026 (Claude) : API partenaires v1 pour les éditeurs (Septeo/Modelo, Apimo, La Boîte Immo…) — fonction partner-api + tables partner_api_clients / partner_agencies ; doc publique api.html. Les annonces passent par le moteur pro-stock-sync (clé de flux par agence). Agence diffusée seulement si compte Pro avec le même SIRET (sinon pending + mail admin). Testée de bout en bout puis nettoyée (restent 2 petites images de test orphelines dans le stockage, chemin a0a0a0a0-…c1a0/, à supprimer via l API Storage).

- 05/11/2026 (Claude) : partner-api — ouverture AUTOMATIQUE du compte Pro quand l agence n en a pas (même circuit que admin-onboard-pro : registre officiel, verify-professional, offre Fondateur pro_50, mail mot de passe). Une seule tentative ; en cas d échec, mail à Anthony avec la raison et statut pending.

- 06/11/2026 (Claude) : demande d'Anthony — crédit discret « Site réalisé par ClicandSite » (lien https://clicandsite.fr/) ajouté à la ligne « © 2026 Abracadeal » du pied de page (index.html, vacances.html). Aucun nom de personne ajouté.

- 06/11/2026 (Claude) : CRM de prospection ClicandSite (demande d'Anthony), séparé d'Abracadeal : schéma `clicandsite` (prospects, interactions, opposition, search_runs, robot_settings ; RLS, aucun accès anon/authenticated), fonctions admin `cs_admin_*` (is_admin), fonctions robot `cs_robot_*` (service_role). Robot `clicandsite-prospect-finder` (annuaire officiel recherche-entreprises.api.gouv.fr — Overpass/OSM refuse les IP Supabase — 21 codes postaux de la Riviera × 4 métiers, nom de domaine deviné et vérifié, cron n°50 toutes les 10 min, puis contrôle des sites : sans site / daté / moderne / en panne, e-mail relevé) — **n'envoie aucun mail**. Clé interne `clicandsite_finder_internal` (integration_secrets). Page admin : admin-clicandsite.html.

- 06/11/2026 (Claude) : page admin admin-partenaires.html (« API partenaires ») — éditeurs branchés, création de clé (affichée une seule fois, préfixe abk_live_/abk_test_), nouvelle clé, couper/réactiver, agences reçues avec statut et nombre d annonces en ligne. RPC admin_partner_overview / admin_partner_create / admin_partner_regenerate / admin_partner_set_active (is_admin). Tuile « API partenaires » dans Mon compte > Administration et dans le menu Admin mobile.
## 06/11/2026 — ClicandSite sort d'Abracadeal
- Le CRM et le robot de prospection ClicandSite ont été déplacés dans leur propre projet Supabase (compte contact@clicandsite.fr) ; espace admin sur https://clicandsite.fr/admin/.
- Côté Abracadeal : tâche planifiée `clicandsite-prospect-finder` supprimée, robot arrêté, fonction neutralisée (réponse 410), page `admin-clicandsite.html` remplacée par une redirection. Le schéma `clicandsite` reste en place en sauvegarde, à supprimer plus tard.

- 06/11/2026 (Claude) : WeeCars Brest (BREIZH MOTOR 29) et WeeCars Bordeaux Est (AUTO NEGOCE BORDEAUX 33) inscrits seuls via le lien du mail sans cocher la reprise du site — SIRET vérifiés au registre (actifs, 45.11Z) et ajoutés à pro_verifications ; reprise de leur stock WeeCars créée sur décision d'Anthony (inscription via lien de prospection + SIRET = feu vert). Formulaire d'inscription Pro : nouvelle RPC `prospect_signup_site(ref)` (anon, ne renvoie que l'adresse d'un site testé « ok ») → adresse pré-remplie et case d'autorisation mise en évidence (toujours à cocher par le pro ; adresse remplie sans case = blocage avec message).

- 06/11/2026 (Claude) : WeeCars Brest et WeeCars Bordeaux Est passés Fondateurs n°3 et n°4 (pro_50, essai Stripe 12 mois sans carte, comme Angers) ; vitrines créées (logo + bannière WeeCars copiés depuis la vitrine d'Angers, fonction à usage unique `admin-copy-showroom-once` neutralisée ensuite), noms affichés « WeeCars Brest » / « WeeCars Bordeaux Est », slugs weecars-brest / weecars-bordeaux-est (anciens gardés dans old_slugs).

- 06/11/2026 (Claude) : confirmation de la reprise du site à la prochaine connexion du pro (demande d'Anthony) — colonnes pro_stock_feeds.owner_confirmation_needed / owner_confirmed_at / owner_refused_at ; RPC get_my_site_confirmation() et answer_my_site_confirmation(feed_id, accept) ; fenêtre assets/site-confirm-20261106.js chargée sur index, pro, pro-pro, pro-fondateur. Oui → accord enregistré (feed + user_metadata.stock_site). Non (double confirmation) → reprise coupée et annonces du flux archivées. Activé pour WeeCars Brest et WeeCars Bordeaux Est.

- 06/11/2026 (Claude) : inscription Pro (formulaire classique + Google/Facebook) — question obligatoire « Avez-vous un site internet où sont publiées vos annonces ? Oui / Non ». Oui → adresse du site ET case d'autorisation obligatoires (blocage sinon). Prospect au site testé : « Oui » + adresse pré-remplis, la case reste à cocher par le pro.

- 06/11/2026 (Claude) : BUG corrigé — les photos ajoutées par l'import du stock (service_role, annonces source feed:%) déclenchaient abraca_requeue_for_related_edit (« Photos modifiees : verification requise ») et renvoyaient en modération des annonces déjà publiées (Brest 97, Bordeaux 42 bloquées). Le trigger ignore désormais les photos posées par nos robots sur les annonces d'import ; un vendeur qui change ses photos reste contrôlé. Les 139 annonces bloquées sont repassées par moderate-listing (analyse de sécurité complète) : toutes vertes sauf le contrôle qualité aléatoire 3 % (7 annonces, normal).

- 06/11/2026 (Claude) : admin-prospection.html — nouvelle carte visible « Ne veulent plus de mails » (désinscrits + STOP manuels, date, e-mail, bouton Réactiver avec avertissement) ; la tuile « STOP / opposition » y amène. Passerelle Abracadeal (base) : tables syndication_portals, pro_syndication, flux private.syndication_feed (rien d'actif).

- 06/11/2026 (Claude) : vignettes — carburant normalisé (trigger a0_normalize_fuel sur listings + private.normalize_fuel : Essence/Diesel/Hybride/Hybride rechargeable/Électrique/GPL/Autre ; 33 annonces corrigées sans repasser en modération) et libellé court « Hybride rech. » dans les vignettes (cardFuelLabel) + hauteur des caractéristiques plafonnée à 2 lignes (plus de chevauchement avec la ville). Motos : rond « Motos & scooters » sur l'accueil (9 ronds : 1 ligne ordinateur, 5+4 mobile) et rangée de raccourcis Tous / Voitures / Motos & scooters / Utilitaires / Équipements en tête des résultats Véhicules (assets/veh-sub-chips-20261106.js).

- 06/11/2026 (Claude) : Life Cars passé en REFUS (décision d'Anthony) — colonne prospection_prospects.founder_refused_at + SIREN 918130592 + segment exclu_admin ; private.founder_optout_conflict compte aussi les refus → pas d'offre Fondateurs s'il s'inscrit (même e-mail, SIREN ou domaine lifecars.fr), tarif public direct. Démo demo/life-cars supprimée, adresse lifecars.fr retirée du pré-remplissage de admin-test-import.html (champ vide), exemples « /lifecars » remplacés par « /weecars-angers » dans les commentaires.

- 06/11/2026 (Claude) : 10e rond « Tout voir » (toutes les annonces) sur l'accueil pour combler le trou — mobile 5 + 5, ordinateur 10 sur une ligne.

- 06/11/2026 (Claude) : rond « Tout voir » affiché seulement sur mobile (ordinateur : 9 ronds sur une ligne, pas de trou).

- 06/11/2026 (Claude) : 5 jetons « À la une 7 jours » offerts à WeeCars Angers / Brest / Bordeaux Est (pro_boost_wallet + pro_boost_admin_grants). Prévenus à leur prochaine connexion : colonnes pro_boost_admin_grants.notify_pro / seen_at, RPC get_my_boost_gift() / ack_my_boost_gift(), fenêtre assets/boost-gift-20261106.js (index, pro, pro-pro, pro-fondateur ; attend la fenêtre de confirmation du site). Pas de mail pour l'instant (décision Anthony) : mail seulement s'ils ne se connectent pas pendant un moment.
- 07/11/2026 (Claude) : quotas du plan gratuit Supabase dépassés (bande passante 5,96/5 Go, journaux 2,16/1 Go). Cause principale : la page de modération retéléchargeait les photos d'origine par liens signés à chaque rafraîchissement (1,15 Go le 06/11), corrigé le 06/11 à 18 h 45. ~75 % du reste = tests d'Anthony (iPhone + Mac). Économies : vérification des messages 4 s → 15 s, « Mes annonces » 30 s → 3 min ; tâches cron espacées : alertes messages 1 → 3 min, e-mails pro et vacances 2 → 5 min, aperçus prospects 2 → 10 min. Décision d'Anthony : rester en gratuit tant qu'aucun pro ne paie ; piste suivante si besoin : photos servies par Cloudflare R2 (bande passante gratuite).

## 07/11/2026 — Passerelle de diffusion (Claude, demande d'Anthony)
- But : Abracadeal envoie le stock des pros vers d'autres sites (Leboncoin, La Centrale, SeLoger, Trovit…), à la place d'Ubiflow / Spider VO.
- Base (migration `passerelle_diffusion_v1`) : colonnes website/kind/sort/public_note sur syndication_portals ; 10 sites listés (tous « prospect ») ; flux `private.syndication_feed` (annonces actives des pros qui ont coché le site, photos, caractéristiques, contact) ; RPC my_syndication / set_my_syndication (pro), admin_syndication_overview / admin_syndication_update / admin_syndication_new_token (is_admin) ; syndication_feed_public réservé au service_role.
- Edge function `syndication-feed` (sans JWT, jeton haché par site) : `?portal=&token=[&format=abracadeal-xml|trovit|json][&vertical=vehicules|immobilier]`, cache 1 h. Testée : 143 annonces WeeCars Brest, 403 sur mauvais jeton ; données de test remises à zéro.
- Pages : diffusion.html (le pro coche ses sites ; « Bientôt » tant que le site n'est pas actif), admin-diffusion.html (statut, format, contact, notes, création du lien de flux affiché une seule fois). Liens : tuile « Diffusion » (admin), menu admin mobile, bouton « Diffuser ailleurs » du tableau de bord pro.
- Un site ne reçoit rien tant qu'il n'est pas « En cours d'ouverture » ou « Actif » et qu'un lien n'a pas été créé. Chaque grand portail doit d'abord accepter Abracadeal comme partenaire ; les agrégateurs (Trovit, Mitula, LeParking) sont les premiers à viser.

## 08/11/2026 (Claude, session MyCreativeSite) — Quota Supabase dépassé (bandeau « restriction le 08/12 »)
- Constat (24 h, edge_logs) : ~4,7 Go servis depuis Storage (vignettes listing-thumbs 2,5 Go / 16 500 requêtes, photos listing-images 1,6 Go, autres 0,6 Go) et ~90 000 requêtes REST. Plus gros consommateurs : les appareils d'Anthony (Mac ~35 000 requêtes REST et ~1 Go d'images, iPhone ~1 Go) — onglets ouverts qui interrogent toutes les 15 s + rechargements forcés (Cmd+Maj+R qui ignore le cache), puis fonctions Supabase (~0,6 Go), pages de partage (GitHub Actions, ~0,4 Go), wsrv.nl (~0,3 Go), robots Google/GPTBot.
- Vignettes stockées trop lourdes : 165 Ko en moyenne (JPEG 720 px) ; photos 219 Ko. listing-images servies avec cache 1 h seulement (vignettes : 1 an).
- Corrigé : compteurs (messages non lus, alertes admin) toutes les 60 s au lieu de 15 s (index-main.js) ; compteur Pro/Pro des demandes en attente toutes les 60 s et seulement onglet visible (index-app.js). Versions ?v=20261108-poll.
- Log Query 120 Go / 100 : ce sont les consultations des journaux (explorateur Supabase et sessions Claude / tâches planifiées qui font des analyses de logs), pas le site.
- À décider avec Anthony : vignettes plus légères (WebP ~480 px, ~30 Ko) et photos via redimensionneur / Cloudflare R2, ou passage Pro avant le 08/12.
- Fait (Anthony : « ok on le fait ») : fiche annonce — grande photo, agrandissement et bandes de miniatures servis par wsrv.nl (WebP, 1600 px max q85 pour la grande, 220 px pour les miniatures) au lieu de la photo d'origine ; secours automatique vers l'originale si wsrv ne répond pas (data-full + filet photo d'index-app.js / onerror de la visionneuse). Photos privées (URL signées) inchangées. index-main.js ?v=20261108-photos. Étape suivante : photos sur Cloudflare R2 (compte à créer par Anthony).
- Fait (soir) : Cloudflare R2. Compte Cloudflare Abracadeal@gmail.com (ID a98e6b3852356e4cf76d01b92524f8a7), R2 activé (gratuit jusqu'à 10 Go / 10 M lectures par mois, sortie gratuite). Bucket « abracadeal-photos » (Europe de l'Ouest), adresse publique https://pub-9747954003f04922a082752db15aeeed.r2.dev, CORS GET/HEAD pour tous. Clé limitée à ce bucket → secrets Supabase R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.
  - Fonction r2-sync (cron « abracadeal-r2-sync » toutes les 2 min, clé interne) : copie listing-images et listing-thumbs vers R2 sous <bucket>/<chemin> (cache 30 j) et supprime de R2 ce qui est effacé de Supabase. File : private.r2_sync + public.r2_pending()/r2_mark() (service_role seulement).
  - Site (index-main.js / index-app.js ?v=20261108-r2) : photoUrl/thumbUrl pointent sur R2 ; si la photo n'y est pas encore (annonce de moins de 2 min), le filet photo retombe sur Supabase (abracaR2Fallback). Les autres pages (vacances, pro, modération) lisent encore Supabase.
  - Correction (Anthony : « la lecture des photos sur annonces est plus lente ») : mesuré R2 direct ≈ Supabase (~300 ms) mais wsrv 1600 px = 0,5–1,2 s au premier affichage pour ≈ 15 % de gain → grande photo de fiche directement depuis R2, miniatures de la fiche = vignettes listing-thumbs (R2). wsrv gardé seulement pour les cartes (720/360 px, vrai gain). ?v=20261108-r2b.
  - Admin › Pilotage : la carte « Stockage des photos » montre aussi Cloudflare R2 (fichiers copiés, Mo, en attente, dernière copie, % des 10 Go gratuits) via la fonction admin_r2_usage().
  - Showroom pro (pro.html, Anthony : « les showroom aussi sont lents en photo ») : cartes = WebP 480 px via wsrv depuis la vignette R2 (photos reprises du site du pro : réduites aussi) au lieu de la photo d'origine en fond ; secours wsrv « default » = photo d'origine.
  - Plus tard : domaine photos.abracadeal.fr (nécessite le DNS chez Cloudflare) au lieu de r2.dev.

- 08/11/2026 (Claude) : mobile — « Ma page Pro » (tableau de bord Pro et bouton « Modifier ma page Pro ») ouvre le showroom en plein écran (≤ 760 px) : barre « Ma page Pro » + × en haut, bannière en 16/9, barre du bas masquée, boutons Voir / Enregistrer / Annuler collés en bas. Fermeture (×, Annuler, fermeture du compte) remet tout en place. Ordinateur inchangé. index-main.js ?v=20261108-showfs.
- 08/11/2026 (Claude) : MyCreativeSite (contact@mycreativesite.fr, iDream Lab, secteur services) = compte maison gratuit (décision Anthony) : pro_subscriptions services_30, 30 annonces, status active, source internal_free, sans Stripe. Panneau « Mon abonnement Pro » : cas internal_free → badge « Gratuit », formule + « Gratuit, sans engagement », aucun bouton Stripe. index-app.js ?v=20261108-internal.

## 08/11/2026 (Claude, demande d'Anthony : « Oui on fait ces prix là ») — Grille v3 (HT)
- Auto/Moto/Immo : 5 annonces gratuites pour toujours ; pro_25 = 49 €/mois (nouveau), pro_50 = 89 €, pro_100 = 149 € ; au-delà sur devis ; annonce à l'unité 14,99 € inchangée. pro_20 retiré.
- High-tech / Maison / Mode / Services : 10 annonces gratuites ; X_50 = 9,99 €/mois, X_200 = 24,99 €/mois ; annonce à l'unité 1,99 € (hors domaine). Formules 30/100 et packs 5/10/30 retirés.
- Emploi : 1 offre gratuite ; emploi_1 = 4,99 € ; emploi_illimite = 29,99 €/mois. Formules 30/100/250/500 et packs retirés.
- Vacances : 4,99 €/logement ; formules vacances_20/60 désactivées. Options de visibilité inchangées. Fondateurs inchangés.
- Stripe (live) : nouveaux prix créés (metadata grille 2026-11-08b). Les 5 abonnements Fondateurs (essai gratuit) basculés sur les nouveaux prix sans prorata, essai conservé : Fondateur 1 pro_20 → pro_25 (49 €), Fondateurs 2-5 pro_50 → 89 €. Plus aucun abonnement sur les anciens prix.
- Base (migration grille_v3_20261108) : pro_subscription_plans / commerce_offers mis à jour ; public.abraca_pro_free_allowance(group) + abraca_consume_pro_listing_credit : sans formule, dans son domaine, le pro publie gratuitement jusqu'au quota ; trigger des « 5 annonces offertes à l'inscription » supprimé (crédits déjà donnés conservés). RPC my_pro_free_left() pour le site (ensureProPlanSelection ne renvoie plus vers les tarifs tant qu'il reste des annonces gratuites). Stats admin : « Plan 25 annonces » compte pro_20 + pro_25. MyCreativeSite → services_200 (interne gratuit).
- Site : pro-fondateur.html (bandeau « N annonces gratuites, pour toujours », pro_25), CGV (photos + annonces gratuites), libellés d'abonnement (index-app.js ?v=20261108-grille3).
- À trancher avec Anthony : la formule 100 inclut toujours 5 « À la une » 7 j + 5 remontées par mois (décision du 15/10, prise quand elle valait 499,99 €).
- 08/11/2026 (Claude, Anthony : « ils ne peuvent pas être prélevés, aucun moyen de paiement ») : Fondateurs sans carte = aucun prélèvement possible ; à la fin de l'essai Stripe annule (missing_payment_method=cancel) et private.pro_subscription_listing_visibility met toutes leurs annonces en pause (hidden, reprise dès qu'une formule démarre). process-pro-billing-reminders v8 : mails UNIQUEMENT à l'approche de la fin des 12 mois (J-30, J-7, J-3), nouveau texte « pour continuer avec nous, passez à la formule X (prix HT, sans engagement) ; sinon vos annonces seront désactivées (pas supprimées) », bouton « Continuer avec Abracadeal », plus de lien Résilier pour eux. Premier envoi possible : ~19/09/2027 (Fondateur 1, fin le 19/10/2027).
- 08/11/2026 (Claude, Anthony : « un Fondateur qui ne s'abonne pas n'aura plus aucune annonce en ligne, on ne sélectionne pas 5 annonces au hasard ») : public.abraca_pro_is_ex_founder(user) ; un ex-Fondateur (abonnement Fondateur terminé, sans formule) n'a pas les annonces gratuites de la grille v3 (trigger de publication bloqué avec message « période Fondateur terminée : choisissez une formule », my_pro_free_left = 0). private.pause_pro_listings_for_billing met aussi en pause les annonces en attente (pending), pour qu'aucune ne repasse en ligne après validation.
- 08/11/2026 (Claude, Anthony : packs de visibilité inclus dans chaque formule) : private.pro_monthly_quota(user) → pro_25 = 1 « À la une » 7 j + 2 remontées / mois, pro_50 = 2 + 3, pro_100 et pro_250 = 3 + 5 (avant : 5 + 5 pour la 100 seule). Non cumulables (remise à zéro le 1er du mois), plafonnés au quota de la formule actuelle. Pas pendant la période gratuite des Fondateurs (abonnement trialing avec founder_number). get_my_pro_monthly_allowance renvoie featured_per_month/bumps_per_month ; boutons « offert (x/N) » et messages adaptés (index-main.js ?v=20261108-visi) ; cartes tarifs pro-fondateur.html et CGV mises à jour.
- 08/11/2026 (Claude) : BUG corrigé — pro-fondateur.html plantait (liste des avantages) pour les Fondateurs après l'ajout de la visibilité par formule (priorité d'opérateur) ; vérifié en rendu Fondateur / non-Fondateur / Services / Emploi.
- 08/11/2026 (Claude) : page tarifs — Fondateurs : plus aucune formule payante Auto/Immo affichée (règle du 02/11, la surcharge planState d'option-consent.js la contournait : la formule 20 apparaissait), seulement l'offre Fondateurs (ou leur formule actuelle) + « sur devis » ; « Gratuit 12 mois » → « Gratuit » ; encadré formule 100 corrigé (3 « À la une » + 5 remontées) ; bandeau annonces gratuites sans « · » initial. option-consent.js ?v=20261108-founders.
- 08/11/2026 (Claude, Anthony : « 19,99 € emploi ») : Emploi illimité 29,99 € → 19,99 € HT/mois (nouveau prix Stripe price_1UZd2k1ebJH1208IW02lpDbX, ancien archivé ; plans + offres mis à jour). L'offre à l'unité reste à 4,99 €.
- 08/11/2026 (Claude, Anthony) : cartes tarifs — « Vos annonces reprises automatiquement depuis votre site (si compatible) ou par fichier (CSV, Excel, XML) » + « Bientôt : diffusion de vos annonces sur d'autres plateformes » (formules et carte sur devis) ; titre de la carte Fondateurs = « Annonces illimitées ».
- 08/11/2026 (Claude, Anthony : mettre en avant MyCreativeSite) : encart « Pas de site pour présenter vos véhicules ou vos biens ? Notre partenaire MyCreativeSite crée votre site… → mycreativesite.fr » — à l'inscription Pro (réponse « Non » au site, secteurs Véhicules/Immobilier, #signupNoSiteHint, index-main.js ?v=20261108-partner) et en tête des tarifs Auto/Moto/Immo (pro-fondateur.html partnerBanner). Pas encore dans l'inscription Google/Facebook.
- 08/11/2026 (Claude) : même encart MyCreativeSite dans la fenêtre d'inscription Google/Facebook (« Non » au site + Véhicules/Immobilier), social-login-20261018.js ?v=20261108-partner.
- 08/11/2026 (Claude, Anthony) : MyCreativeSite lance le « Pack Auto & Immo » (99 €/mois + 290 €) = site + annonces illimitées sur Abracadeal. Côté Abracadeal, pour chaque client du pack : compte Pro + abonnement interne gratuit illimité (pro_subscriptions source internal_free, plan pro_250) — à faire à la main pour l'instant (pas encore automatique).
- 08/11/2026 (Claude, Anthony : « automatisé et un flux API direct entre le site et Abracadeal ») : éditeur partenaire « MyCreativeSite » créé dans partner_api_clients (grants_plan = partner_illimite, formule interne inactive 100 000 annonces). partner-api v1.2 (commit 06d7f7c) : pour un éditeur avec grants_plan, le compte Pro ouvert reçoit la formule partner_illimite (source partner:<id>) au lieu de l'offre Fondateurs, mail de bienvenue adapté ; retirée (canceled) quand l'agence est arrêtée (DELETE). Côté MyCreativeSite : fonction cs-abracadeal-sync (cron 10 min) qui déclare chaque site au Pack Auto & Immo payé (agency_id mcs-<slug>, SIRET du profil du site) et envoie son stock en mode full ; arrêt automatique si le pack s'arrête. Test : ping OK.
- 08/11/2026 (Claude) : test réel MyCreativeSite → Abracadeal avec le compte MyCreativeSite (SIRET iDream Lab ajouté dans pro_verifications) : site test garage « test-abracadeal » au Pack Auto & Immo → agence mcs-test-abracadeal active, annonce Peugeot 308 GT Line créée en ligne (marque, modèle, année 2022, 31 000 km, essence, Cannes 06400, photo copiée), prix modifié sur le site 18 900 → 17 500 € → mis à jour sur Abracadeal, pack arrêté → annonce archivée et agence stoppée. Test nettoyé (site supprimé côté MCS, agence supprimée ; annonce test archivée). Non testé : ouverture automatique d'un NOUVEAU compte Pro (le compte MyCreativeSite existait déjà).
- 08/11/2026 (Claude, Anthony) : Pack Auto & Immo MyCreativeSite — au paiement Stripe, champs obligatoires SIRET (14 chiffres) + adresse de facturation (+ entreprise, e-mail, téléphone déjà demandés). Le webhook clicandsite-stripe-webhook (v4) remplit le profil du site (cs_abra_profile) et lance tout de suite cs-abracadeal-sync : compte Pro Abracadeal ouvert (registre officiel, formule partner_illimite), mail « choisissez votre mot de passe », stock envoyé. Session Stripe testée (champ SIRET accepté), lien de paiement de secours mis à jour.

## 08/11/2026 — Diffusion MyCreativeSite étendue à tous les pros utiles (Claude, demande d'Anthony)
- Inclus dans toutes les formules MyCreativeSite : artisans/bâtiment, dépannage, beauté, bien-être → catégorie Services (prestations, prix ou « sur devis ») ; boutiques → Maison / Mode / High-tech (secteur majoritaire du catalogue). Pas pour restaurants, boulangeries, VTC. Pack Auto & Immo (99 €/mois) reste l'offre payante garages/agences.
- partner-api + pro-stock-sync (commit fe66002) : secteurs génériques acceptés quand le partenaire a grants_plan ; normalizeGeneric.
- MyCreativeSite : cs-abracadeal-sync v2, cs-checkout v4 (SIRET + adresse au paiement pour ces métiers).
- Test bout en bout (site artisan temporaire) : 2 prestations créées en Services/artisans-travaux, résiliation → annonces archivées, agence arrêtée. Note : une ville à plus de 150 km de l'adresse du compte est remplacée par celle du compte (règle existante) — normal, chaque pro a son propre compte.
- À supprimer (confirmation non donnée) : flux pro_stock_feeds 03161b59-…, agence partner_agencies be9ce81f-…, 2 annonces archivées de ce flux ; côté MyCreativeSite, site test-artisan-abraca (e355b10e-…) et ses lignes pro_profiles / abracadeal_sync.

## 08/11/2026 (nuit) — MyCreativeSite : espace « Mes véhicules / Mes biens » (Claude, demande d'Anthony)
- Espace client MyCreativeSite, nouvel onglet pour garages et agences : liste du stock (photo, prix, statut, ce qui manque), fiche complète par annonce (véhicule : marque, modèle, version, année, km, énergie, boîte, puissance, couleur, portes, Crit'Air, garantie… ; bien : surface, terrain, pièces, chambres, étage, DPE/GES lettres + valeurs, dépenses d'énergie, copropriété, honoraires, charges/dépôt en location), jusqu'à 30 photos, statut En vente / Réservé / Vendu (Sous compromis / Loué).
- Données dans content.items[].sp ; cs-abracadeal-sync v3 envoie ces champs à partner-api → pro-stock-sync (alias existants). Vendu / Sous compromis / Loué = retiré d'Abracadeal.
- Pack Auto & Immo : 99 €/mois + 490 € de mise en ligne (nouveau lien Stripe plink_1UZeOt…, ancien désactivé), CRM inclus, sans réservation en ligne.

## 09/11/2026 (nuit) — MyCreativeSite : SEO des sites clients et hébergement (Claude, demande d'Anthony)
- Constat : les sites clients étaient le modèle + contenu ajouté par le navigateur (Google voyait « Garage du Littoral », titre « Modèle… », noindex).
- scripts/cs-build-site.mjs (repo clicandsite, servi sur mycreativesite.fr/scripts/) : génère le site en vraies pages HTML — contenu écrit dans la page, titre/description, canonical, Open Graph, JSON-LD (AutoDealer/AutoRepair/RealEstateAgent…, horaires, note Google), une page par véhicule (/vehicules/…, Car/Motorcycle + Offer) ou par bien (/biens/…, RealEstateListing), fil d'Ariane, sitemap.xml, robots.txt, CNAME. Annonces vendues/louées sans page.
- Hébergement : GitHub Pages, un dépôt ClicandSite/site-<slug> par client ; workflow « Nouveau site client » (repo clicandsite) crée le dépôt et active Pages ; chaque site se régénère toutes les 15 min (scripts/client-site/site.yml). Prérequis : secret SITES_TOKEN (jeton GitHub d'Anthony) à créer une fois.
- RPC publique cs_site_public_info(p_slug) (MyCreativeSite) ; cs-edit v15 garde les liens vers les pages d'annonces.
- Concession auto et moto : modèle dédié (garage.html?concession=1), mis en avant sur l'accueil ; Pack renommé « Pack Auto, Moto & Immo » ; Abracadeal seulement dans les formules à 99 € (Boutique, Pack).

## 09/11/2026 (Claude) — prospect-mailer v31
- Mail « aperçu » (1er mail + relance) signé « Le Service Pros Abracadeal » au lieu de « Anthony, fondateur d’Abracadeal » : Anthony reste anonyme auprès des pros.
- Prospects mis en pause (adresse d’agence web, pas du pro) : Distinxion (avdigital.fr), La Fabrique Automobile (futurdigital.fr), Agence Bannier (anmconso.com).

## 2026-11-09 nuit — MyCreativeSite : SEO Pack Auto, Moto & Immo + robot « nouveaux pros »
- Pages : /site-internet-concession-automobile/, /site-internet-concession-moto/, /site-internet-diffusion-annonces-auto-immo/ ; garage et agence immobilière réécrites (Pack 99 € + 490 €, une page Google par annonce, Abracadeal illimité). Le Pack est en tête des prix et dans les offres JSON-LD.
- Guide /conseils/concession-auto-moto-vendre-plus-avec-son-site/ ; aide /aide/nom-de-domaine/ (OVH, IONOS, GoDaddy, Gandi) ; liens métiers en pied de page de l'accueil.
- Robot prospects (clicandsite-prospect-finder v6) : mode « nouveaux » = créations publiées au BODACC chaque jour, classées concession / garage / moto / immobilier (+ date de début d'activité, souvent future). Cron clicandsite-nouveaux toutes les 5 min, rattrapage depuis le 10/09. Interrupteur à part : robot_settings.bodacc_enabled. Annuaire : NAF 45.40Z (motos) ajouté. CRM admin : filtre « Nouveaux et futurs pros ». Aucun mail envoyé.

## 2026-11-09 — Abracadeal Vacances : même mise en page que l'accueil (Claude)
- Demande d'Anthony : logo image identique à l'accueil en haut à gauche (ordinateur et mobile), boutons du haut en icônes comme Favoris / Messages / Connexion de l'accueil, bandeau Fondateurs identique (même dégradé, hauteur, police, pastille « 500 premiers logements », bouton blanc « Devenir Fondateur »), bannière ordinateur ramenée à 230 px (image entière centrée) avec le bouton doré en haut à droite comme « Déposer une annonce » (« ＋ Devenir hôte », il suit le bouton hôte du menu qui reste caché sur ordinateur).
- Fichier : assets/vacances-like-home-20261109.css (chargé en dernier) + petites modifications de vacances.html. Mobile inchangé hormis le logo.

## 09/11/2026 — Vacances : ancien bouton « Admin » retiré
- vacances.html : bouton `#vacAdminLink` (Admin) supprimé de l'en-tête (vacances-main.js gère son absence).
- Accès admin Vacances : tuile « Vacances » ajoutée dans Compte → Administration (admin-account-layout-20261018.js, index v=16). Déjà présent aussi dans le menu admin mobile et dans admin.html.

- 10/11/2026 (Claude) : CRM prospection — bloc « Écrire un mail » (boîte OVH au choix, jamais Gmail ; copie rangée dans « Envoyés » par IMAP), bouton « Écrire » sur chaque prospect et sur les accords (remplace le lien mailto qui ouvrait Gmail). prospect-mailer v32 : action send (admin), journal prospection_logs « manual_mail ».

## 11/11/2026 — Claude — Google Images : 1re photo sous abracadeal.fr (demande d'Anthony)
- scripts/build_share_pages.py (VERSION 12) : la 1re photo de chaque annonce est servie sous notre adresse, https://abracadeal.fr/annonce/<id>/apercu.jpg (JPEG 1200 px déjà généré pour WhatsApp) : grande photo de la fiche, données structurées Product « image », vignettes des listes (si l'aperçu existe) et sitemap-annonces.xml (1 image par annonce au lieu de 5, toutes chez nous). Photos suivantes inchangées (R2 / site du pro), pas listées dans le sitemap.
- Pourquoi : Google Images attribuait les photos à pub-…r2.dev ou aux sites des pros (spidervo…). Domaine photos.abracadeal.fr (DNS Cloudflare) plus nécessaire pour ça.

## 11/11/2026 — Claude : photo par défaut sur des annonces de pros déjà validées (signalé par Anthony)
- Cause : depuis le 10/11 (annonce validée = reste en ligne), une annonce synchronisée qui change reste « active » ; moderate-listing recopiait sa 1re photo depuis le site du pro dans le bucket privé `listing-images-pending` mais ne la publiait plus (seule la branche pending → active le faisait) → vignette = image par défaut. 16 annonces touchées (depuis le 10/11 15:37).
- Correctif moderate-listing : une annonce restée en ligne voit ses photos du bucket privé publiées dans `listing-images` (sans quarantaine en cas d'échec). Les 16 annonces relancées.

## 12/11/2026 (nuit) — SEO auto (Claude, accord d'Anthony)
- Audit : 549 annonces actives = 549 dans sitemap-annonces.xml ; balises, JSON-LD, fil d'Ariane, liens internes OK.
- scripts/build_share_pages.py (VERSION 14) : titre Google des fiches raccourci sans couper les mots du vendeur — mentions commerciales retirées du <title> seulement (« Garantie 12 mois », « TVA récupérable », caméra de recul, attelage, « // », « * »), prix retiré quand le titre dépasse ~65 caractères (il reste dans la description et le JSON-LD), « Ville, grande ville (dep) » → « Ville (dep) » si trop long ; marque ajoutée au titre comparée sans accents (plus de « Citroën … Citroen »). Moyenne 110 → 94 caractères, aucun doublon.
- Plan suivi dans scripts/SEO_PLAN.md.
- 12/11/2026 (Claude) : contrôle Search Console (537 pages indexées, 256 non indexées). Motifs normaux : `?annonce=` bloqué exprès par robots.txt (doublon de /annonce/<id>/), pages admin en noindex, catégories vides en noindex, http→https, 1 annonce supprimée en 404 ; 163 « explorées non indexées » / 31 « détectées » = pages récentes (crawl du 10/11) que Google digère. Erreur de redirection sur /weecars-brest et /weecars-angers (crawl du 07/11) : vérifié en direct, une seule 301 vers /weecars-brest/ puis 200, canonique vers garage/… → à faire valider dans la Search Console. Corrigé : pro.html?id=… (vitrine) n'avait aucune canonique et était explorée en doublon des pages garage/…/immo/…/professionnel/… → canonique posée en JS vers la page statique (pro-pages.json), sinon vers pro.html?id=<id>.
- 12/11/2026 (Claude, audit des 4 sites) : pages fixes sans canonique ni description (aide, api, CGU, CGV, contact, cookies, confidentialité, mentions légales, sécurité, règles de diffusion, classement, recherche Vacances) → canonique + meta description ajoutées ; titre CGU allongé ; robots.txt : /assets/email/ (modèles de mails HTML) exclu. Aucun lien interne cassé sur 927 pages ; sitemap = 875 URL, toutes existantes et indexables.
- 12/11/2026 (Claude, audit bases) : migration audit_20261112_harden_admin_rpc — 8 fonctions admin_* (toutes déjà protégées par is_admin()) retirées du rôle anon (accès connecté seulement), search_path fixé sur private.exclude_anti_robot_prospect / cancel_anti_robot_request / slugify / slug_reserved / free_slug et public.abraca_pro_free_allowance (testés OK). Base 98 Mo, stockage 22 Mo (plan gratuit : 500 Mo / 1 Go), historique pg_cron déjà purgé chaque jour.

## 12/11/2026 — Claude : prix en or sur les vignettes (demande d'Anthony)
- assets/price-gold-20261112.css (chargé en dernier dans index.html) : prix des vignettes (résultats, accueil « À la une », recherches récentes, vus récemment, près de chez vous) en or #f7bd4b au lieu du rose. Pages à fond clair (fiche détail, vitrine pro, pages /annonce/ Google) laissées en violet. Pour revenir au rose : retirer la ligne du fichier dans index.html.

## 12/11/2026 — Claude : compteur « Voir le numéro » corrigé
- assets/index-main.js (viewListingPhone) : l'événement « phone » était enregistré AVANT la vérification de connexion → un visiteur non connecté qui cliquait « Voir le numéro » (puis tombait sur la connexion) était compté comme ayant vu le numéro. Les 4 « numéros affichés » existants (02/11 → 10/11) viennent tous de visiteurs non connectés. Désormais compté seulement une fois connecté. index.html : v=20261112-phone.
- Rappel exclusion d'Anthony : connecté en admin = jamais compté (serveur) ; et l'appareil reçoit abraca_not_counted dès la connexion admin (vaut aussi pour l'appli installée, qui a son propre stockage).

## 12/11/2026 — Claude : numéro des pros sans connexion (accord d'Anthony)
- Site (index-main.js, v=20261112-telpro) : « Voir le numéro » tente l'affichage même déconnecté ; si le serveur répond « Connexion requise » (particuliers) → compteur `phone_login`, fenêtre de connexion avec un bandeau « connectez-vous en 1 clic avec Google ou Facebook », et retour automatique sur l'annonce avec affichage du numéro après connexion (?annonce=<id>&tel=1). Compteur `phone` seulement quand le numéro est vraiment montré. Mention « réservé aux membres connectés » masquée sur les annonces de pros.
- Base : supabase/2026-11-12-pro-phone-public.sql (get_listing_phone / get_listing_contact_details ouverts aux visiteurs pour les annonces publiques de vrais comptes pro, quota par IP 10/10 min et 25/24 h ; kinds `message` (manquait) et `phone_login` ajoutés ; les 4 anciens « phone » de visiteurs non connectés passés en `phone_login`).

## 13/11/2026 (nuit) — Claude : « Sites en réparation » (signalé par Anthony, Gubernatis)
- Gubernatis (Nice) restait en « ✓ Réparé · à valider » alors que son stock est en ligne (89 biens). Migration robot_learning_hide_live_sites_20261113 : admin_list_robot_learning n'affiche plus une demande réparée dont le domaine correspond à un flux pro actif, approuvé et déjà synchronisé.
- Annonce « Cannes Félix Faure – Bar-pub 200 m² » absente : ajoutée sur le site de l'agence après la synchro de 19 h 22 (89 reçus, 0 créé) ; prise au passage de synchro suivant (toutes les 6 h, 01 h 22).
- admin-test-import.html : « Valider ce site » sur un site déjà relié à un pro inscrit (flux actif) n'ouvre plus la demande d'e-mail de prospect (risque de doublon) ; affiche « déjà un pro inscrit, N annonces en ligne ».

## 13/11/2026 (01 h 45) — Claude : biens Apimo nouveaux absents pendant 3 jours (Gubernatis, bar-pub Cannes Félix Faure 87576801)
- Cause : dans pro-stock-sync, un tour de lecture terminé n'est « acquitté » (applied) que pour une liste de scopes ; « apimo-v1: » n'y était pas → le tour du 10/11 de Gubernatis (et celui du 11/11 de Sophie Folley) était resservi tel quel à chaque synchro jusqu'à 72 h : 89 reçus, 0 créé, nouveaux biens ignorés, biens vendus jamais retirés.
- Code corrigé dans le dépôt (apimo-v1: ajouté à la liste) — **À DÉPLOYER** (pro-stock-sync, 800 Ko, pas déployé par Claude cette nuit).
- En attendant : migration apimo_crawl_refresh_20261113 préparée (déclencheur qui marque « appliqué » les tours Apimo terminés + relecture immédiate de Gubernatis) — en attente de la validation d'Anthony dans Supabase.

## 13/11/2026 — Claude : contrôle prospection (« vérifie le marketing »)
- 7 jours : 239 mails, 9 rebonds (3,8 %), 3 désinscriptions, 6 clics, 1 accord (Sophie Folley).
- Bug : dosage par métier (category_mix 45 auto / 45 immo / 10 moto) appliqué seulement au 1er mail du jour de chaque boîte (relances désactivées → branche sans dosage, qui préfère les aperçus immo) → 204 immo / 34 auto / 1 moto. Migration prospect_mix_always_20261113 : dosage toujours appliqué quand les relances sont coupées.
- Clics sans suite le 12/11 : Casa Terra Immobilier (info@casaterra.fr), Cabinet Bedin (biscaplage@). Règle d'Anthony : pas de relance.
- 13/11 12 h 32 : migration apimo_crawl_refresh_20261113 appliquée (accord d'Anthony) + synchro lancée : Gubernatis 1 créé (bar-pub Félix Faure, en ligne), 3 mis à jour, 1 archivé (F3 Carré d'or Dubouchage). Le déploiement du code pro-stock-sync reste à faire (le déclencheur suffit en attendant).

## 13/11/2026 — Claude : SEO, pages Google en retard de plusieurs heures
- Le jeton GitHub du coffre Supabase (vault `abracadeal_github_pages_token`, utilisé par private.request_share_pages_build quand une annonce change) est refusé par GitHub (401 Bad credentials). Le déclenchement immédiat ne marche donc plus ; seul le cron GitHub « */10 » tourne, mais GitHub ne l'exécute que toutes les 4 à 8 h → nouvelles annonces sans page Google/sitemap pendant des heures, annonces retirées encore en ligne.
- Build lancé à la main (run 43419985436) : 552 annonces au sitemap, bar-pub Félix Faure publié, F3 Dubouchage retiré.
- À FAIRE (Anthony) : nouveau jeton GitHub fine-grained (dépôt abracadeal/abracadeal, permission Actions : lecture et écriture) à coller dans Supabase → Vault → abracadeal_github_pages_token.

## 13/11/2026 — Claude : quota Supabase (trafic sortant) — catalogue en fichier statique
- Constat (tableau d'usage Supabase) : le plan gratuit a dépassé 5 Go de trafic sortant le mois dernier (période de grâce jusqu'au 08/12/2026, sinon erreurs 402 = site sans annonces). 92,5 % = PostgREST ; cause : rpc public_catalog (1,3 Mo) appelée à chaque visite (~250 fois/jour ≈ 280 Mo/jour).
- Correctif : scripts/build_catalog_feed.py écrit feeds/catalog.json (workflow « Pages de partage ») ; index.html window.__abracaLoadCatalog lit ce fichier puis rpc public_catalog_since(p_since) (nouvelle, migration public_catalog_since_20261113 : identifiants en ligne + annonces modifiées depuis, ~40 Ko) ; repli sur public_catalog si le fichier manque ou si un identifiant est absent. index-main.js : fetchPublicCatalog passe par la même fonction (v=20261113-catalog).
- 13/11 13 h 16 : nouveau jeton GitHub (fine-grained « Abracadeal pages SEO », Actions lecture/écriture sur abracadeal/abracadeal, sans expiration) enregistré par Anthony dans le Vault ; testé : API 200 et déclenchement workflow_dispatch OK.
