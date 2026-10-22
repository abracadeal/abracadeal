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
