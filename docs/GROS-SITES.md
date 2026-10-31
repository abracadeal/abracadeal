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
- Prospection : 9 adresses Transakauto sont dans la liste, en `segment='phase2_reseau'` (en pause, gros réseau gardé pour plus tard).
