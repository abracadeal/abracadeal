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

### 18/10/2026 — Claude — Vélos : plus de champs « véhicule » inutiles
- **Changé :** `assets/index-main.js` : `velos` retiré de `VEHICLE_DETAIL_TYPES`. Pour la sous-catégorie Vélos, le dépôt n'affiche plus les champs de voiture (marque/modèle auto, kilométrage, carburant, boîte, Crit'Air, puissance…) ; il garde titre, description, prix, état et photos, comme les équipements. `index.html` : `index-main.js?v=20261018-velo`.
- **Pourquoi :** remarque d'Anthony (champs motorisation sans intérêt pour un vélo).
- **À savoir :** la fiche d'une ancienne annonce vélo n'affiche plus le bloc de caractéristiques véhicule.

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
