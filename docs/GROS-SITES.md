# Gros sites et sites lents : ce qu'il faut construire (note de Claude pour ChatGPT)

Écrit le 31/10/2026 à la demande d'Anthony. À lire avec `docs/APPRENDRE-AU-ROBOT.md`.
Robot concerné : `supabase/functions/pro-stock-sync` (déployé par commit, voir le guide §3).

## 1. Le problème, en une phrase

Un passage du robot a un budget fixe (lecture automatique `readSmartSite` : ~50 s, 20 pages de liste, 400 pages au total ;
Orpi / catalogues : 220 fiches maximum). Sur un gros stock, chaque passage **recommence du début** et s'arrête avant la fin.

Conséquences réelles aujourd'hui :
1. **Les annonces vendues ne sont jamais retirées.** Une lecture partielle met `archiveSkipped='lecture partielle du site'`
   (`syncFeed`, mode full) : rien n'est archivé, à chaque passage, pour toujours. C'est le point le plus grave (annonces mortes en ligne).
2. **Une partie du stock n'est jamais lue** (lecture automatique : toujours les mêmes premières fiches).
3. À l'inscription, `autoReviewSite` refuse l'activation automatique si `partial && !capped`
   → « lecture partielle du site (trop long à lire en une fois) » → le pro reste « à vérifier ».
4. Précontrôle prospects : « Lecture interrompue (site trop lourd ou trop lent pour le robot) ».

Exemples à utiliser comme sites témoins : `https://www.speedway.fr` (garage), `https://www.valloire-habitat.com/`,
`https://www.orpi.com/immosaintnicolas/`, `https://www.orpi.com/caluirebourg/`, `https://www.human-immobilier.fr/la-chatre`.

Seule exception déjà faite : Orpi tourne avec un décalage par jour (`off=(jour*220)%total`, ligne ~685) — chaque jour une autre tranche,
mais toujours sans archivage (`capped`).

## 2. Ce qu'il faut construire : la lecture en plusieurs fois (avec mémoire)

### Table de suivi (à créer, fichier SQL daté dans `supabase/`)
```sql
create table public.pro_stock_crawl_state (
  feed_id uuid primary key references public.pro_stock_feeds(id) on delete cascade,
  cycle_started_at timestamptz not null default now(),   -- début du tour complet en cours
  queue jsonb not null default '[]',                     -- adresses de fiches restant à lire dans ce tour
  list_done boolean not null default false,              -- toutes les pages de liste ont été vues
  last_cycle_completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.pro_stock_seen (
  feed_id uuid not null references public.pro_stock_feeds(id) on delete cascade,
  ref text not null,                 -- même clé que external_id des annonces
  last_seen_at timestamptz not null default now(),
  primary key (feed_id, ref)
);
alter table public.pro_stock_crawl_state enable row level security;   -- aucune politique : service_role seulement
alter table public.pro_stock_seen enable row level security;
```

### Déroulé d'un passage
1. Charger l'état du flux. S'il n'y a pas de tour en cours (ou `list_done` et `queue` vide) : **nouveau tour**
   → `cycle_started_at=now()`, relire **toutes les pages de liste** (peu coûteuses) et remplir `queue` avec les fiches trouvées.
2. Lire les fiches de `queue` jusqu'au budget (garder ~10 s de marge pour l'enregistrement), les retirer de `queue`,
   faire l'upsert des annonces lues (code actuel) et `pro_stock_seen.last_seen_at=now()` pour chaque référence vue
   (y compris celles vues **dans la liste** sans relire la fiche, voir §3).
3. Si `queue` est vide et `list_done` : **tour complet** → archiver les annonces du flux dont la référence n'a pas été vue
   depuis `cycle_started_at` (`last_seen_at < cycle_started_at`), en gardant le garde-fou actuel :
   ne rien archiver si on a vu < 50 % des annonces en ligne (site en panne / mise en page changée).
   Puis `last_cycle_completed_at=now()`.
4. Sinon : rien n'est archivé dans ce passage (comme aujourd'hui), le tour reprend au passage suivant (toutes les 3 h).

Garde-fou durée : si un tour dure plus de 72 h (site énorme), le relancer depuis la liste plutôt que d'archiver sur une vieille base.

### Règles à respecter
- **Ne jamais archiver sur une lecture incomplète** : l'archivage n'a lieu qu'à la fin d'un tour complet.
- Une fiche en erreur (timeout, 5xx) n'est pas « non vue » : la remettre dans `queue` une fois, puis la compter comme vue
  (on ne retire pas une annonce parce que sa page a planté).
- Sites lus en une seule requête (Apimo, Vehica `/wp-json`, Ewigo `/acheter`, Supabase, Simplici Car…) : rien ne change,
  ils finissent en un passage (`partial=false`).
- `autoReviewSite` (inscription) : accepter `partial` si au moins 20 fiches complètes ont été lues et ≥ 80 % de complètes,
  et indiquer dans la notification admin « stock en cours de lecture, complet sous 24 h ».

## 3. Aller plus vite (avant même la mémoire)

Par ordre d'efficacité :
1. **Lire la liste plutôt que les fiches.** Beaucoup de pages de liste donnent déjà titre, prix, km, année, ville, 1re photo.
   Une fiche déjà connue dont le prix et le titre de la liste n'ont pas changé n'a pas besoin d'être relue :
   noter `last_seen_at` et passer (c'est ce qui rend les passages suivants rapides).
2. **Chercher une source structurée avant le HTML** (déjà fait pour plusieurs familles, à généraliser) :
   `/wp-json/wp/v2/types` (WordPress : souvent un type « car », « vehicle », « property »), `data-page` (Laravel/Inertia),
   `data-product` (PrestaShop), `__NEXT_DATA__` (Next.js), sitemaps (`robots.txt` → `Sitemap:`), flux XML / RSS des logiciels.
3. **Paralléliser raisonnablement** : 4 à 6 requêtes en même temps (pas plus : erreur 546 `WORKER_RESOURCE_LIMIT`
   et risque de blocage par le site).
4. **Couper les pages trop lourdes** (> 700 Ko) avant analyse, comme `readSmartSite` le fait déjà pour les listes.

## 4. Comment tester

- Lecture à blanc : `auto_review_dry` (guide §2) — vérifier `partial`, `read`, `complete`, `crawl.pages`, `crawl.ms`.
- Pour la mémoire : créer un flux de test sur un des sites témoins, lancer 3 passages de suite
  (`{"feed_id": …}` avec le jeton cron) et vérifier : la file diminue, aucun archivage avant la fin du tour,
  archivage des seules références absentes à la fin, garde-fou 50 % respecté.
- Retester les témoins normaux après coup (Laugier 23/23, Immo Chevreux 31/31, La Rochelle Ewigo 73/73).

## 5. Répartition

Claude a construit les lecteurs génériques du 30–31/10 (Lovable/Supabase, Roselmac, Simplébo, Vehica, Ewigo, Simplici Car).
La lecture en plusieurs fois touche le cœur de `syncFeed` / `readSmartSite` : prévenir dans `JOURNAL.md` (« en cours : lecture en plusieurs fois »)
avant de commencer, pour que Claude ne modifie pas ces fonctions en même temps.

## 6. Cas concret : Transakauto (réseau de franchises, exploré par Claude le 31/10/2026)

- **Site national** `annonces.transakauto.com` (Symfony) : 16 669 véhicules pour tout le réseau. Chaque agence a une page
  `/concessionnaire-voiture-occasion/agence-<ville>` (ex. `agence-montauban`), mais **la liste de cette page n'est pas filtrée
  par agence** : elle charge le catalogue national.
- **Source structurée trouvée** : la liste se charge en appelant la même adresse avec
  `?_dvid=vehicule_catalog&_view=list&_pageLength=500&_start=0` (+ `Accept: application/json`) → JSON `{total, html}` ;
  `_pageLength=500` fonctionne → **34 requêtes pour tout le réseau** (titre, prix, km, boîte, année, région, 1re photo, lien `/vehicule/VO…`).
  Filtres possibles dans `vehicule_catalog_filters[...]` : brand, model, energy, region, country, prix, km, année, `autoGestionId` —
  **aucun filtre agence**.
- **L'agence n'apparaît que sur la fiche** `/vehicule/VO…` (e-mail de l'agence, ex. `pertuis@transakauto.com`).
  Les e-mails d'agence suivent le modèle `<ville>@transakauto.com` (aussi dans le lien « Vendre » : `/vendre/?agency=montauban%40transakauto.com`).
- **C'est exactement le cas « gros site »** : pour isoler le stock d'une agence il faut ouvrir les fiches (16 669 au total).
  Piste conseillée : un seul flux « réseau » lu en plusieurs fois (§2), qui ouvre chaque fiche une fois, mémorise son agence
  (`pro_stock_seen` + colonne agence) et ne relit ensuite que les nouvelles références de la liste ; chaque agence inscrite
  reçoit alors ses véhicules à partir de cette mémoire commune. Filtrer d'abord par `region` réduit le travail pour une agence donnée.
- Les voitures viennent du logiciel **Auto-Gestion** (`autoGestionId`, photos `mytransak.transakauto.com`) ; certaines agences ont
  aussi un site `<agence>.auto-gestion.net` (`/all-vehicles`, chargé en JavaScript, non exploré).
- **Mise à jour (Claude, 31/10) : chaque agence a aussi son site Auto-Gestion, lu par `autogestion-reader.ts`** (Lyon 8 : 153 lus, 139 complets). Pour inscrire une agence Transakauto, donner l'adresse `<agence>.auto-gestion.net`, pas le site national.
- Prospection : 9 adresses Transakauto sont dans la liste, en `segment='phase2_reseau'` (en pause, gros réseau gardé pour plus tard).


## 7. Lecteur Next.js / urql + Openflex (ChatGPT, 31/10/2026)

`next-dealer-reader.ts` reconnaît le schéma public (`__NEXT_DATA__`, `urqlState`, `retail_points`, `i_pve_id`) sans domaine de concession codé en dur. Premier témoin : Groupe Peyrot, page **de concession** `/concessions/renault/renault-carcassonne`. Une adresse nationale est refusée. Le catalogue JSON Next.js publié contient les voitures et leur point de vente ; les coordonnées exactes + code postal du point sélectionnent les fiches, puis chacune doit confirmer le titre de la concession dans ses distributeurs. Une recherche à 30 km n'est pas un filtre de concession.

- Fiches : `pageProps.dataVehiculeDetail.aVehicle` (JSON), données de stock Openflex, galerie, équipements, kilométrage, immatriculation initiale, puissances, garantie et téléphone de contact / VO. Plaque et VIN exclus du résultat.
- Occasion uniquement, statut explicitement « Disponible à la vente », kilométrage positif, pas de neuf / 0 km / commande / stock usine. Aucune clé embarquée dans les scripts n'est réutilisée. L'API GraphQL refusée n'est pas appelée par le lecteur.
- Mémoire **pour cette famille uniquement** : `public.pro_stock_crawl_state` (RLS, aucun droit anon/authenticated) ; état lié à l'URL du flux et au périmètre physique. File de fiches + lignes déjà lues rejouables ; quatre lectures simultanées, budget 45 s / 220 fiches par passage, reprise suivante ; reset après 72 h. Les autres familles n'utilisent pas encore cette mémoire.
- Le catalogue structuré est lu en une requête par tour, avec plafond 15 Mo ; le plafond source de 9 998 références est refusé comme incomplet. Le lecteur ne prétend pas prendre en charge une pagination qu'il n'a pas observée.
- Une fiche défaillante est réessayée une fois, puis sa référence reste vue (protection de l'annonce existante), sans réécriture avec une ancienne fiche. Les erreurs restent visibles dans `crawl.detail_errors`. Une lecture partielle n'archive rien ; en fin de tour, toutes les références vues sont transmises à `sync`, avec le garde-fou 50 % existant et contrôle du checkpoint avant archivage.
- Une fiche inchangée n'est réutilisée que si la liste publie **à la fois** un horodatage de modification et son statut. Peyrot ne publie pas ces deux champs dans sa liste : chaque fiche est revérifiée à chaque tour, pour ne pas conserver une voiture devenue réservée malgré un titre/prix inchangé.
- Aperçus / `auto_review_dry` sans écriture de mémoire. Seules les synchronisations et l'examen réel d'un flux utilisent la mémoire par flux. L'activation automatique reste prudente : un tour incomplet reste à vérifier.
- Tests : `node --experimental-strip-types tests/next-dealer-reader.test.mjs`. Reprise en 3 passages, isolation même ville / point différent, refus catalogue national, filtres neuf/réservé/vendu/0 km, dédoublonnage galerie, deux essais d'une fiche en erreur, reset URL / 72 h.


## 8. Izmocars : stocks complets dans les listes (ChatGPT, 31/10/2026)

`izmo-reader.ts` lit le JSON littéral public `var izmoGlobalData = {...}` sans exécuter les scripts. Un lecteur pour le fabricant, aucun domaine/concession codé en dur. Le stock contient déjà galeries, équipements, prix, date de première circulation, km, statut et identifiant de concession : les fiches individuelles ne sont pas nécessaires.

- Témoin Lecluse : le site groupe renvoie vers les sites propres aux concessions, ex. `https://www.volkswagen-le-mans.fr/vehicules-occasion-stock-fr-fr.htm`.
- Le JSON de cette page contient `dealerIds=107670,107669,105586` : **ne jamais considérer ce champ comme le périmètre autorisé**. Le lecteur impose le `dealerInfo.dealerId` du site physique et contrôle sur chaque véhicule `invDlrId` ET `localDealerId`. Plusieurs adresses physiques sur le site : refus, sélection d'une concession nécessaire.
- `listingPerPage=500&page=1` fonctionne : Le Mans 79/79 en une page au lieu de 7 pages de 12, avec 2 190 photos ; service VO 02 43 78 50 70. Valeurs du site d'essai, pas des constantes du lecteur.
- Uniquement `inventoryType=USED`, `status=ACTV`, sans date de vente ni réservation, kilométrage positif. VN/0 km/commande/stock usine exclus. Plaque et VIN non repris dans les champs.
- Les pages supplémentaires sont lues seulement si le compteur l'exige ; compteur stable et nombre de références distinctes égal au total source obligatoires. Les filtres et numéros de pages sont contrôlés dans chaque réponse ; stock incomplet/changé ou page répétée : erreur, aucun archivage.
- Lecture complète en une requête pour le témoin ; aucun besoin de mémoire de fiches. Les longs catalogues structurés peuvent finir en quelques listes. Au-delà de 40 pages ou 45 s : refus explicite, pas de faux résultat complet ; adaptateur à étendre plutôt que recommencer silencieusement.
- Tests : `node --experimental-strip-types tests/izmo-reader.test.mjs`.

## 9. Reprise Orpi et lecteur automatique (ChatGPT, 31/10/2026)
- Moteur partagé `resumable-crawl.ts`, état par flux dans la table existante. Toutes les listes puis les fiches, budget 35 s / 100 détails, quatre téléchargements simultanés ; prochains appels reprennent les files. Reset URL/périmètre/72 h. Aucun archivage en cours de tour ; erreur permanente et écart au compteur maintiennent le tour incomplet.
- Orpi utilise ses paginations publiques ; plafond 220 et rotation quotidienne retirés. Contrôle du compteur `/recherche/count?agency=…` : s'il diffère des liens découverts, aucun tour complet ni archivage revendiqué. Carnot : catalogue paginé 491 liens vs compteur 536, écart restant à vérifier.
- Lecteur automatique : reprise des listes et sitemaps dans le périmètre, puis fiches. Les autres connecteurs spécialisés restent inchangés ; un connecteur qui possède encore son propre plafond nécessite un adaptateur, ce mécanisme ne rend pas universellement lisible un site protégé ou dépourvu de source complète.
- Un tour terminé reste rejouable jusqu'à acquittement de sync. Verrou optimiste par version de checkpoint ; garde-fou 50 % conservé. Les erreurs de page sont réessayées une fois puis bloquent la complétude jusqu'au renouvellement du tour (72 h).
- Aperçu admin : appels successifs et progression, état temporaire dans le navigateur, aucune mémoire de flux/import/activation ; Valider masqué tant que partiel. Pour vérifier par le jeton interne : `auto_review_dry` avec `resumable:true`, puis renvoyer le `crawl_state` reçu au passage suivant. Ne pas lancer plusieurs tests lourds en parallèle.
- Tests : `tests/resumable-crawl.test.mjs`, `tests/smart-resume.test.mjs` ; régressions Next/Openflex, photos, batch4/batch5 et Select Azur.
