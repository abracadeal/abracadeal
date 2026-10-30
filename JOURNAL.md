# Journal de travail Abracadeal

Journal partagé entre Claude et ChatGPT, qui travaillent tous les deux sur ce dépôt et sur la base Supabase (projet `jplzvxmpbpjssyinozap`). Anthony répartit les tâches.

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

### 30/10/2026 — Claude — Vignettes tablette plus petites
- **Demande d'Anthony :** vignettes trop grosses sur tablette, au moins 6 par ligne.
- **Fait (`assets/tablet-grid-20261030.css`, chargé en fin de `<head>` de `index.html`) :** tablette horizontale = 6 vignettes par ligne (avant 3) ; tablette verticale = 4 (avant 2), même taille de vignette qu'en horizontal (6 en vertical = ~90 px, titres illisibles). Textes, prix et boutons cœur/partager resserrés. Ancienne règle 3 colonnes retirée de `index.html`. Téléphone et ordinateur inchangés.
- Vérifié en émulation iPad (vertical 4 × 136 px, horizontal 6 × 137 px).

### 30/10/2026 — Claude — Tablette bloquée en vertical : corrigé
- **Demande d'Anthony :** la version tablette ne passe pas en horizontal.
- **Causes :** 1) `manifest.json` imposait `"orientation": "portrait"` → l'appli installée (PWA) restait bloquée en vertical ; 2) sur petites tablettes Android en paysage (hauteur utile < 600 px, ex. 1280×800 avec barres du navigateur = 576 px), l'écran « tournez votre téléphone » (`.portrait-only-overlay`) s'affichait, car la règle d'exception tablette (`min-width:900px`) est neutralisée par tablet-as-mobile (largeur évaluée à 720 px).
- **Fait :** manifest en `"orientation": "any"` (lien `manifest.json?v=5` sur index et vacances) ; `tablet-grid-20261030.css?v=2` : écran de rotation jamais affiché sur tablette, page visible et défilable en paysage. Téléphones : écran de rotation conservé.
- Vérifié en émulation tablette Android 1280×800 paysage : écran de rotation masqué, page visible, 6 vignettes.
- **Appli déjà installée :** Android peut mettre du temps à relire le manifest ; si ça reste bloqué, désinstaller puis réinstaller l'appli.

### 30/10/2026 — Claude — Textes des vignettes corrigés
- **Demande d'Anthony :** « la description dans les vignettes c'est pas bon ».
- **Constaté (rendu des vraies annonces) :** caractéristiques véhicule en 4 cases avec émojis (📅 🛣️ ⛽ ⚙️) qui se cassaient dans les vignettes étroites (« km » ou « Automatique » seuls à la ligne) ; ville avec 📍 sur 2 lignes.
- **Fait :** `index-main.js?v=20261030-vignettes` (cartes « Les annonces » et « À la une ») : caractéristiques en une ligne de texte « 2019 · 84 500 km · Diesel · Manuelle » (2 lignes max), sans émojis ; ville avec un petit pictogramme dessiné à la place de 📍. `card-overlay-20261029.css?v=4` : ville sur une seule ligne (coupée avec « … » si trop longue). Page annonce inchangée.
- Vérifié sur téléphone, tablette verticale et horizontale avec de vraies annonces.

### 30/10/2026 — Claude — Un pro prospecté inscrit en particulier : corrigé
- **Constaté :** compte créé le 30/10 à 9 h 19 via Google (bbc.lim.nord@gmail.com, « Bye Buy Car Limoges », prospect « AMD AUTO » de la liste manuelle du 19/10) en **particulier** : relance reçue à 9 h 05, clic sur le lien à 9 h 19 min 26 s, compte créé 23 s plus tard.
- **Cause :** les boutons « Créer mon compte Pro gratuitement » / « Je réserve ma place Fondateur » / « Activer mon compte Pro » de `pro-fondateur.html` pointaient vers `index.html#accountModal`, qui ouvre la **connexion** ; « Continuer avec Google » y crée un compte particulier.
- **Fait :** liens Fondateurs → `index.html#signupPro` (ouvre l'inscription avec « Professionnel » présélectionné, `index-app.js?v=20261030-signup-pro`) ; `social-login-20261018.js?v=4` : Google/Facebook masqués pour un visiteur venu d'un mail de prospection (lien `?r=` mémorisé 90 jours). Vérifié en local.
- **Reste :** le compte de Bye Buy Car Limoges est toujours particulier, à passer en Pro avec l'accord d'Anthony.

### 30/10/2026 — Claude — Lecture des sites pros : bandeau cookies, énergie et boîte
- **Constaté par Anthony (aperçu d'import, Ford Fiesta réf. 0001398, 6 750 €) :** description = texte du bandeau cookies (Complianz : « Le stockage ou l'accès technique… », « assignation à comparaître… ») ; énergie « électrique » et boîte « automatique » fausses.
- **Causes (`smart-reader.ts`, lecteur générique) :** le bandeau cookies passait le filtre du « plus long texte » (pas le mot « cookies ») ; énergie/boîte cherchées dans toute la page : « rétroviseurs électriques » → électrique, « climatisation automatique » → automatique.
- **Fait :** textes de consentement exclus de la description ; énergie et boîte lues d'abord sur leur libellé (« Carburant : », « Énergie », « Boîte de vitesses : »…), puis dans le titre (BVA, DSG, EAT, EDC…), sinon dans la page en ignorant équipements électriques/automatiques. Rien plutôt qu'une valeur fausse.
- **Testé :** page reproduisant le cas → avant : électrique / automatique / texte cookies ; après : essence / manuelle / vraie description ; sans libellé : énergie et boîte vides. Tests existants : mêmes résultats qu'avant (les 6 en échec l'étaient déjà).
- **Déployé :** `pro-stock-sync` v90 ACTIVE, import épinglé sur `261ed036aef82eab7fe37e874bb43b8811db94ef` (aucun autre changement de la fonction depuis v89), vérif. JWT inchangée (désactivée, auth interne). Démarrage OK dans les journaux. Aucune annonce pro véhicule déjà en ligne à corriger.

### 30/10/2026 — ChatGPT — Réparation lecture Bye Buy Car
- Cause : lecteur générique limité aux 20 fiches HTML initiales ; ville absente et descriptions manquantes. Le catalogue utilise son API publique `api.bye-buy-car.com/api/get-vehicules`, appelée par les filtres du site.
- Connecteur dédié `byebuy-reader.ts` : pagination de 100 véhicules, 3 requêtes simultanées, dédoublonnage par référence ; les pages agence `/agence/CP`, le filtre `?cp=CP` et les fiches véhicules conservent leur périmètre. Les filtres non reconnus sont refusés pour ne pas importer le réseau entier par erreur. Échec/répétition/page manquante → lecture partielle, donc pas d'archivage complet.
- Champs : titre complet/version, prix, ville/CP, km, année, énergie, boîte, carrosserie, portes/places, puissances, CO2, couleur, première mise en circulation `datemes` (pas la date de carte grise `dateCG`), description + équipements, photos uniques, nom/téléphone de l'agence propre au véhicule. Immatriculation et VIN non repris.
- `normalizeVehicle` conserve le contact explicite via le même validateur que l'immobilier ; téléphone stocké dans les contacts de l'annonce lors d'un futur import autorisé, nom dans les métadonnées véhicule. Aucun import ni activation de flux déclenché par les tests.
- Tests : champs sur deux fiches réelles, agences distinctes, filtre agence, fiche unique, pagination, panne réseau et page répétée ; 20 fiches réelles normalisées sans erreur ; régression Cannisimmo : OK.
- Catalogue national vérifié en lecture seule : 17 pages / 1 696 références distinctes, lecture complète ; 1 673 fiches normalisées sans erreur, 23 sans photo dans la source ; 39 214 photos, ville sur toutes les fiches et téléphone fourni sur 1 349 fiches. Prise en charge des deux formats de références (Spider VO avec tiret et VO3000 numérique).
- Mise en service v91 : contrôle réel agence Figeac HTTP 200, 38/38 fiches sans erreur, 877 photos et téléphone d'agence sur toutes les fiches. Le catalogue national dépassait le budget d'exécution pendant la normalisation ; index des champs véhicule ajouté, en conservant l'ordre de priorité des alias. Mesure locale sur tout le stock : normalisation passée de ~2,93 s à ~0,82 s, mêmes 1 394 annonces après dédoublonnage global, 1 390 sans erreur. Test des valeurs zéro/vides et priorité des champs exacts/imbriqués ajouté.

- Validation finale production v92 (`d164ba3f25bf3ac181df2a545d110c8ce1d0cfbd`, PR #12 et #13 fusionnées) : HTTP 200, `ok:true`, `partial:false`, 17 pages, 1 696 références lues ; 1 394 annonces après le dédoublonnage global existant (302 doublons), 1 390 sans erreur, 4 sans photo après dédoublonnage. 33 946 photos retenues, ville/prix/km/année/énergie/boîte renseignés sur toutes les annonces ; 1 047 téléphones propres aux fiches, 25 numéros distincts. Contrôle lecture seule, aucun stock publié et aucun flux activé.

### 30/10/2026 — Claude — Inscription Google/Facebook : choix Particulier / Professionnel obligatoire
- **Demande d'Anthony :** « un pro est un pro, un particulier est un particulier, même avec une inscription Google » : case Pro / Particulier, et un Pro donne au minimum son SIRET ou SIREN.
- **Site (`social-login-20261018.js?v=5`) :** la fenêtre « Finalisez votre compte » après Google/Facebook demande « Vous êtes : Particulier / Professionnel » (aucun choix par défaut). Professionnel → SIRET (14) ou SIREN (9) + domaine pro obligatoires, contrôlés dans le registre officiel avant création ; ensuite choix de la formule Pro comme une inscription Pro classique. Le lien `?r=` d'un mail de prospection est rattaché au compte.
- **Fonction `verify-professional` (action `upgrade`) :** SIREN accepté (siège retenu) ; passe le compte en Pro avec la clé de service seulement si l'entreprise est active, pas déjà liée à un autre compte Pro, et si le compte n'a aucune annonce de particulier ; enregistre `pro_verifications` et l'entreprise dans le compte.
- **Base (`supabase/2026-10-30-account-type-guard.sql`) :** un utilisateur ne peut plus changer lui-même son type de compte (avant, rien ne l'empêchait techniquement) ; seuls la fonction ci-dessus et un admin le peuvent.
- **Bye Buy Car Limoges :** seul compte Google existant (particulier, sans téléphone) : la fenêtre lui demandera le choix à sa prochaine connexion.
- **Déployé :** `verify-professional` v10 ACTIVE (import épinglé sur `afa8d6da`) ; contrôle réel : recherche registre OK, `upgrade` sans connexion refusé (401).
- **Appliqué par ChatGPT le 30/10/2026** (voir son entrée en tête du journal) ; vérifié par Claude : déclencheur `aab_guard_profile_account_type` présent et actif sur `public.profiles`.

### 30/10/2026 — Claude — Mail de bienvenue aux nouveaux particuliers
- **Demande d'Anthony :** aucun mail n'arrive après une inscription (cas Bye Buy Car) ; mettre en place un mail de bienvenue.
- **Fait (`process-pro-transactional-emails`) :** à chaque passage (toutes les 2 min), les comptes **particuliers** créés depuis le 30/10/2026 13 h, finalisés (téléphone renseigné, e-mail confirmé), reçoivent une seule fois « Bienvenue sur Abracadeal ! » (clé `welcome:<compte>`, type `custom_message`, aucun changement de base) : invitation à déposer une première annonce, bouton « Déposer une annonce » (`/?deposer=1`), signé « L'équipe Abracadeal », depuis contact@abracadeal.fr. Pas d'envoi rétroactif. Les pros gardent leurs mails d'abonnement / Fondateur.
- **Au passage :** mail `founder_onboarding` : titre « Marre de payer trop cher ? » retiré (accroche abandonnée le 23/10) → « Bienvenue sur Abracadeal » ; ligne obsolète « formule 50 gratuite » retirée.
- **Déployé :** `process-pro-transactional-emails` v7 ACTIVE. Exemplaire de test « [TEST] Bienvenue sur Abracadeal » mis en file pour abracadeal@gmail.com.

### 30/10/2026 — Claude — Barre de recherche
- **Demande d'Anthony :** retirer les exemples « Clio, T2 Cannes » : le texte de la barre de recherche de l'accueil devient « ✦ Recherche IA » (`index.html`).
- **Bannière :** tous les mails de cette fonction (bienvenue, abonnements Pro, Fondateurs) affichent maintenant la bannière Abracadeal (lampe, logo, slogan, servie par `email-banner`) à la place du bandeau texte.

### 30/10/2026 — Claude — Inscription Google en Pro : case « reprise de mon site »
- **Demande d'Anthony :** le pro ne reviendra peut-être pas répondre « OK » : il doit pouvoir autoriser la reprise de ses annonces en cochant une case à l'inscription.
- **Fait (`social-login-20261018.js?v=6`) :** dans « Finalisez votre compte » (Google/Facebook), si Professionnel : adresse du site (facultatif) + case « J'autorise Abracadeal à reprendre et diffuser automatiquement les annonces publiées sur mon site, et à les tenir à jour ». Mêmes contrôles que l'inscription Pro par e-mail (adresse valide, pas un site d'annonces ni un réseau social, case obligatoire si une adresse est donnée) ; l'accord est enregistré dans le compte (`stock_site`) puis `claim_signup_site_import` crée la demande d'import (lecture automatique, activée seule si le site se lit sans erreur, règle du 28/10). L'inscription Pro par e-mail avait déjà cette case.
- Testé (fenêtre avec serveur simulé) : case manquante refusée ; avec la case : passage Pro, accord enregistré, demande d'import créée.
- **Précision (30/10) :** pour un Pro, le téléphone (déjà obligatoire) s'intitule « Téléphone de l'entreprise » : numéro sur lequel les acheteurs le joignent depuis ses annonces (`v=7`).
- **Correction (30/10) :** la note du téléphone Pro dit « numéro proposé par défaut sur vos annonces, modifiable annonce par annonce » (le numéro d'une annonce se change dans l'annonce ; pour un import, le numéro du vendeur indiqué sur le site du pro passe avant) (`v=8`).

### 30/10/2026 — Claude — Pages légales mises à jour (version du 30 octobre 2026)
- **Demande d'Anthony :** être en règle après les changements du jour.
- **Confidentialité** (`confidentialite.html` + copies dans `index.html` et `vacances.html`) : connexion Google / Facebook (nom, e-mail, photo de profil transmis avec accord, pas de mot de passe) ; reprise des annonces du site d'un pro qui l'a autorisée (textes, photos, prix, conseiller indiqué) ; e-mails liés au compte (bienvenue, sécurité, abonnement) dans l'exécution du contrat ; prestataires ajoutés : Resend (e-mails), Google et Meta (connexion) ; vérification des entreprises via le registre officiel (recherche-entreprises.api.gouv.fr) à partir du SIRET ou du SIREN.
- **CGU** (`cgu.html` + copie dans `index.html`) : § 2 choix Particulier / Professionnel à l'inscription (Google/Facebook compris), SIRET ou SIREN vérifié et téléphone obligatoires pour un Pro, type de compte non modifiable par l'utilisateur ; § 3 nouveau paragraphe « Reprise des annonces depuis le site d'un professionnel » (autorisation expresse, droits sur les contenus, mise à jour automatique, retrait de l'autorisation à contact@abracadeal.fr).
- Version affichée : 30 octobre 2026 (CGU et confidentialité ; CGV, cookies et mentions légales inchangées). Version d'acceptation enregistrée à l'inscription : `2026-10-30` (`legal-registration.js`, `index-main.js`, `social-login-20261018.js`, test).
- Tests `legal-pages` : mêmes résultats qu'avant (2 échecs déjà présents avant ces changements).
- **Mentions légales :** rien à changer (éditeur, directeur de la publication, hébergeur, contact présents).

### 30/10/2026 — Claude — Mail à l'admin quand le site d'un pro est repris
- **Demande d'Anthony :** il ne veut pas découvrir des annonces d'un pro sur le site sans être prévenu.
- **Fait (`pro-stock-sync`, `notifyAdminsSite`) :** mail immédiat aux admins (abracadeal@gmail.com) depuis contact@abracadeal.fr :
  - « Nouveau pro en ligne : <entreprise> (N annonce(s)) » quand un site autorisé est lu sans erreur et activé automatiquement (entreprise, SIRET, e-mail, site, domaine, nombre d'annonces créées, lien page pro + admin imports) ;
  - « Site d'un pro à vérifier : <entreprise> » quand le site ne peut pas être activé seul (raison) — au premier essai seulement, le récapitulatif quotidien continue.
- Un seul mail par site et par cas (clé `site-approved|pending-<feed>`).
- **Déployé :** `pro-stock-sync` v93 ACTIVE, import épinglé sur `08c5b19d` (inclut les corrections Bye Buy Car de ChatGPT, v92) ; démarrage vérifié (réponse 403 attendue sans jeton cron).

### 30/10/2026 — Claude — Notification sur le site pour l'admin (nouveaux pros)
- **Demande d'Anthony :** un mail à chaque fois, c'est bien au début mais pénible s'il y a beaucoup d'inscriptions → notification sur le site.
- **Fait :** `notifyAdminsSite` (`pro-stock-sync`) crée aussi, pour chaque admin, une notification dans `pro_sync_notices` (gravité `new_pro` = « Nouveau pro en ligne », `site_review` = « Site d'un pro à vérifier ») : pastille rouge sur Messages / Compte et carte en haut de Messages, avec bouton « Marquer comme lu ». Une seule par site (mise à jour si le statut change). Le mail n'est plus envoyé qu'aux **5 premières notifications sur 24 h** ; au-delà, seulement la notification sur le site.
- **Bug corrigé au passage (`index-main.js?v=20261030-notifs`) :** les alertes `pro_sync_notices` (y compris les alertes de synchro des pros) étaient comptées dans la pastille mais jamais affichées dans Messages : elles se chargent maintenant à l'ouverture et toutes les 5 s.
- **Déployé :** `pro-stock-sync` v94 ACTIVE (épinglé sur `ff3474c2`), démarrage vérifié. Notification d'exemple « [TEST] Exemple de nouveau pro » créée pour l'admin (à marquer comme lue).

### 30/10/2026 — Claude — Pied de page mobile / tablette resserré
- **Demande d'Anthony :** recoller le bas de page, en plus petit.
- **Fait (`footer-copyright-20261027.css?v=6`, ≤ 760 px, donc aussi tablette) :** « © 2026 Abracadeal » 10 px discret (au lieu de 16 px), liens 9,5 px serrés (3 lignes au lieu de 4), espacements réduits ; le grand vide violet sous les liens supprimé (le pied de page ajoutait 104 px alors que la page garde déjà la place de la barre du bas). Hauteur du pied de page : 250 → ~110 px. Ordinateur inchangé.

### 30/10/2026 — Claude — Retours d'Anthony sur les notifications admin
- **Constaté (captures) :** la notification d'exemple « nouveau pro » apparaissait aussi dans la fenêtre Admin « Erreurs de flux » (pastille 1 sur Admin) ; pastille « À surveiller » quasi invisible et nom du flux blanc sur fond clair ; pastille « 1 » de Messages loin de l'icône sur téléphone.
- **Fait :** `index-main.js?v=20261030-notifs2` : « Erreurs de flux » (liste + compteur Admin) ignore les notifications `new_pro` / `site_review` (elles restent dans Messages) ; `card-overlay-20261029.css?v=5` : pastille « À surveiller » orange (texte brun foncé), « À traiter » rouge (texte blanc), nom du flux en gris violet lisible ; `nav-compact-20261020.css?v=2` : pastille Messages identique à celle d'Admin, collée en haut à droite de l'icône (téléphone ; la tablette l'avait déjà).

### 30/10/2026 — Claude — MRR théorique selon les annonces des pros
- **Demande d'Anthony :** régler le « MRR théorique après gratuités » en fonction des pros et de leur nombre d'annonces.
- **Fait (`index-app.js?v=20261030-mrr`) :** après le chiffre du serveur (somme des formules choisies), le tableau de bord recalcule : pour chaque abonnement Pro actif ou en période gratuite, nombre d'annonces en ligne → plus petit palier de la même famille qui les couvre (Auto/Immo : 20 = 149,99 €, 50 = 299,99 €, 100 = 499,99 € ; même logique pour High-tech, Maison, Mode, Emploi, Vacances). Au-delà de 100 : compté au palier 100 et signalé « sur devis ». Formule à 0 € (compte interne) = 0 €. L'ancienne formule 200 (retirée) n'est plus utilisée comme palier. Libellé : « MRR théorique après gratuités (selon annonces en ligne) », détail au survol.
- **Au passage :** intertitre « Abonnements Pro » du tableau de bord, invisible (blanc sur fond clair), passé en gris violet (`admin-account-layout-20261018.css?v=7`).
- Calcul fait côté navigateur admin (la modification de la fonction serveur `get_admin_dashboard_stats` n'est pas applicable depuis l'appli mobile) ; à basculer dans la fonction serveur à l'occasion.

### 30/10/2026 — Claude — Page « Imports depuis les sites des pros » : sections repliables
- **Demande d'Anthony :** trop de défilement pour arriver à « Tester une adresse » ; ranger « Sites en réparation » et « Sites à apprendre » dans des sections.
- **Fait (`admin-test-import.html`) :** « Tester une adresse » en premier (ouverte, avec son aperçu), puis « Demandes » (ouverte), puis « Inscrire un garage qui a dit oui », « Sites en réparation » et « Sites à apprendre » repliées. Chaque section s'ouvre / se ferme d'un appui, avec le nombre d'éléments affiché sur le titre. Identifiants et fonctions inchangés.

### 30/10/2026 — Claude — Bouton « Valider ce site » (test manuel d'une adresse)
- **Demande d'Anthony :** quand il teste lui-même un site et qu'il se lit, il faut une touche « Valider ».
- **Fait (`admin-test-import.html`) :** après « Lire le stock », si au moins une annonce est complète, bouton vert « Valider ce site ». Il passe la fiche du prospect en « site testé » (`site_check_status = ok`, nombre d'annonces, plateforme, date) → ses prochains mails sont ceux du « répondez OK ». Le prospect est retrouvé par l'adresse du site ; s'il n'en a pas (liste manuelle, ex. Bye Buy Car), le bouton demande l'e-mail du garage et relie le site à sa fiche. Rien n'est publié par ce bouton.

### 30/10/2026 — Claude — Rebonds de prospection lus automatiquement
- **Constaté (tri de la boîte abracadeal@gmail.com) :** 6 garages dont le 1er mail avait échoué (adresse inexistante, boîte pleine…) ont quand même reçu la relance : rien ne repassait les rebonds dans le CRM. Nettoyage manuel fait : 10 adresses mortes passées en `error`, Desbrosses et LCB Immo mis à jour avec leur nouvelle adresse, retours d'erreur + rapports DMARC mis à la corbeille Gmail.
- **Fait (`prospect-mailer` v12) :** action `bounces` : lit en IMAP (lecture seule, rien n'est marqué ni supprimé) les rapports de non-remise des boîtes d'envoi OVH sur les 10 derniers jours ; chaque rebond définitif (« Action: failed ») passe la fiche du prospect en `error` avec la raison (plus de relance ni d'envoi) + ligne dans `prospection_logs`. Les rebonds « delayed » (nouvel essai en cours) sont ignorés. `{dry:true}` = rapport sans modification.
- SQL : `supabase/2026-10-30-prospect-bounces.sql` (`prospect_mailer_mailbox_list`, service_role uniquement). Cron `abracadeal-prospect-bounces` toutes les heures (à h07) de 6 h à 18 h, heure de Paris. 1er passage réel (30 jours) : 9 adresses mortes de plus trouvées et passées en `error`.
- **Mise à jour (Anthony) :** ChatGPT (GPTBot, ChatGPT-User, OAI-SearchBot) et Claude (ClaudeBot, Claude-User…) autorisés : retirés de la liste de blocage.
- **Mise à jour 2 (Anthony) :** toutes les IA autorisées (ChatGPT, Claude, Gemini, Perplexity, Meta, Amazon, Apple, Common Crawl…) pour qu'elles puissent recommander Abracadeal. Restent refusés : revendeurs/aspirateurs de données (Diffbot, Omgili, ImageSift, Scrapy, HTTrack, wget) et outils SEO concurrents (Ahrefs, Semrush, Majestic, DotBot, BLEXBot, DataForSEO, Serpstat).
