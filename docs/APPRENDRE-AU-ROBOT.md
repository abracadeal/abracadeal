# Apprendre un nouveau site au robot d'import (guide Claude / ChatGPT)

Guide écrit le 29/10/2026 par Claude pour qu'un autre assistant (ChatGPT) puisse aussi apprendre au robot à lire un site, en alternance.
À lire en entier avant de toucher au robot. Respecter aussi les règles de `JOURNAL.md` (entrée datée en haut du journal après chaque changement).

## 1. Ce qu'est le robot

- Une seule fonction Supabase : `pro-stock-sync` (projet `jplzvxmpbpjssyinozap`).
- Code : `supabase/functions/pro-stock-sync/index.ts` (lecteurs par réseau, mise en forme, synchro) et `smart-reader.ts` (« lecture automatique » des sites inconnus).
- Il lit le site d'un pro (garage ou agence), produit une ligne par annonce (« fiche brute » : `titre`, `prix`, `ville`, `code_postal`, `photos` séparées par `|`, `surface`, `pieces`, `dpe`, `kilometrage`…), puis `normalizeRows` met en forme (`normalizeVehicle` / `normalizeImmo`) et ajoute des erreurs (`ville manquante`, `prix manquant`, `aucune photo`, `GES manquant`…).
- Toutes les 3 h il relit chaque site inscrit ; un bien disparu du site est archivé (sauf lecture partielle ou < 50 % lus : rien n'est retiré).

### Choix du lecteur (`readFeed`)
Dans l'ordre : Orpi (`readOrpiAgency`), L'Adresse (`readLadresseAgency`), Century 21 (`readC21Agency`), Annonces-Automobile (`readAaSite`, détecté par `isAaSiteHtml`), WooCommerce, L'Agence Automobilière, Starterre, Spider VO, Shopify, sinon lecture automatique (`readSmartSite` + `smartDetail` + données JSON-LD `ldImmo` / `ldVehicle`).
Si rien n'est lisible : `findNetworkPage` cherche une page Orpi / Century 21 de l'agence.

## 2. Méthode pour un site qui ne se lit pas (ou mal)

1. **Tester sans rien enregistrer** (« lecture à blanc ») : depuis SQL Supabase
   ```sql
   select net.http_post(
     url := (select decrypted_secret from vault.decrypted_secrets where name='abracadeal_project_url')||'/functions/v1/pro-stock-sync',
     body := jsonb_build_object('action','auto_review_dry','url','https://www.site-du-pro.fr/','sector','immobilier'), -- ou 'vehicules'
     headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='abracadeal_stock_cron_token')),
     timeout_milliseconds := 150000) as id;
   ```
   Puis, **dans une requête séparée** 60 à 100 s plus tard : `select status_code, content from net._http_response where id = <id>;`
   (un `pg_sleep` dans la même requête ne voit pas la réponse).
   La réponse donne : `read`, `complete`, `errors`, `fill` (taux de remplissage par champ), `failed` (fiches en erreur), `no_dpe`, `urls` (adresse, titre, prix, type, code postal, charges, taxe, lots, procédure, honoraires, mandat, début de description), `crawl` (pages, fiches, ratés), `duplicates`.
2. **Une seule fiche** : `{"action":"debug_detail","url":"<adresse de la fiche>","sector":"immobilier"}` → ce que lisent `ldImmo` / `ldVehicle` et `smartDetail`, la longueur de la page et les montants en € trouvés.
3. **Regarder la page elle-même** : le shell de Claude n'accède pas aux sites ; on passe par `select net.http_get(url := '...', headers := '{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}'::jsonb)` puis `net._http_response` (chercher avec `position()` / `regexp_match()` ; attention, PostgreSQL refuse `{0,300}` : max 255).
4. **Corriger de la façon la plus générale possible** : une règle qui sert à tout un réseau ou à tout un prestataire de sites vaut mieux qu'un cas particulier. Exemples déjà faits :
   - réseau à pages d'agence (Orpi, L'Adresse) → lecteur dédié liste + fiches ;
   - prix coupé par des balises (`145<span> </span>350 €`), DPE en image (`dpe-c.png`), ville dans l'adresse de la fiche (`/le-cannet-06110/`) → règle générale dans `smart-reader.ts`.
5. **Ne jamais deviner une valeur** : si le site ne donne pas le DPE, on le laisse vide (affiché « Non communiqué »).
6. **Retester** les sites témoins après chaque changement pour ne rien casser :
   - immo : `https://immobilier-orleans.nestenn.com/`, `https://www.immochevreux.com/`, `https://www.orpi.com/immobartholdistrasbourg/`, `https://www.century21-daumesnil.com/`, `https://www.ladresse.com/agence/l-adresse-cannes/326`
   - auto : `https://www.laugierautomobiles.com/` (Annonces-Automobile), un site Spider VO, un site WooCommerce.
   Ne pas lancer plusieurs lectures en même temps (erreur 546 `WORKER_RESOURCE_LIMIT`).

## 3. Mettre en ligne une nouvelle version du robot

La fonction déployée est un petit fichier qui importe le code du dépôt **à un commit précis** :
```ts
// pro-stock-sync vNN (date) : le code complet est dans le dépôt GitHub, version figée par commit.
import "https://raw.githubusercontent.com/abracadeal/abracadeal/<SHA DU COMMIT>/supabase/functions/pro-stock-sync/index.ts";
```
1. Modifier `index.ts` / `smart-reader.ts`, vérifier la syntaxe (`npx esbuild index.ts --bundle --external:'https://*' --external:'jsr:*' --external:'npm:*' --format=esm --outfile=/tmp/x.js`).
2. Commit + push sur `main` (lignes d'attribution de chaque assistant en fin de message).
3. Redéployer `pro-stock-sync` avec ce petit fichier et le nouveau SHA (`verify_jwt` = false). Même principe pour `prospect-mailer`.
4. Retester (étape 6), puis écrire l'entrée en haut de `JOURNAL.md`.

## 4. Autres outils utiles

- **Corrections à la main** d'une fiche : table `pro_stock_overrides` (site + référence → champs), réappliquées à chaque mise à jour ; bouton « Modifier » dans l'aperçu admin (`admin-test-import.html`).
- **Prospects** : avant le 1er mail, `prospect_precheck` teste le site ; `site_check_status` = `ok` (mail avec le nombre d'annonces), `unreadable` (pas de mail, liste « Sites à apprendre » + mail du soir à Anthony), `manual` (vend sur Leboncoin → mail « publiez vous-même »). Après avoir appris un site, remettre ses prospects dans la file :
  ```sql
  update public.prospection_prospects set site_check_status = null, site_check_reason = null
  where site_check_status = 'unreadable' and source_url ilike '%domaine-ou-prestataire%';
  ```
- **Leboncoin** : jamais lu (protection anti-robots et conditions d'utilisation).

## 5. Répartition Claude / ChatGPT

- Les demandes d'Anthony arrivent dans `public.robot_learning_requests` (bouton « Réparer » de l'admin). Plus de tâche planifiée (annulée par Anthony le 29/10) : ChatGPT ou Claude les traitent quand Anthony le demande. Pour en prendre une : `update public.robot_learning_requests set status='in_progress', handled_by='ChatGPT' where id=...` ; à la fin `status='done'` (ou `'failed'`), `result` = une phrase simple pour Anthony, `done_at=now()`.
- **Réparer = apprendre au robot à lire, rien d'autre** (précision d'Anthony) : ne jamais toucher à `prospection_prospects`, aucun mail, aucun import ni publication. Ensuite Anthony décide avec ses boutons : **Tester** (aperçu), **Valider** (le site est bon : le prospect est remis en test puis reçoit son mail), **Supprimer**, **Vend sur Leboncoin**.

- Avant de commencer : lire le haut de `JOURNAL.md` et `git pull` ; ne pas travailler en même temps sur le même fichier du robot.
- Prendre un site de la liste « Sites à apprendre » (ou du mail du soir), noter dans le journal « en cours : <site> » si le travail est long.
- Une entrée de journal par site appris : site, cause, règle ajoutée, résultat du test (lus / complets) et version déployée (vNN + commit).
