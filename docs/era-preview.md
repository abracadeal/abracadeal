# ERA : aperçu local sans import

Le site ERA utilise des données de recherche embarquées dans son état SSR
`ng-state`. Le lecteur générique de données schema.org ne les reconnaissait pas.
Le connecteur dédié lit uniquement la recherche locale présente dans l’HTML
de l’adresse demandée et suit les liens de pagination de cette même recherche.
Il n’appelle pas l’API ERA et ne parcourt pas les autres villes. La lecture
commence en page 1, déduplique les références et vérifie que le nombre de biens
lus correspond exactement au total annoncé, sur toutes les pages attendues.
Une page absente, une redirection inattendue, un total changeant ou des doublons
empêchant de couvrir le total provoquent une erreur explicite : aucun aperçu
partiel n’est présenté comme complet. Limites : 50 pages et budget de boucle
de 75 secondes (hors dernier téléchargement en cours).

Le lien fourni cible une recherche de biens à Cannes, pas une agence unique.
Les recommandations et autres recherches du site sont exclues. Les fiches
doivent correspondre à la ville et au type de transaction de la recherche.

Ce connecteur est appelé exclusivement par `readPreviewFeed`, pour les actions
`preview_url` et `preview_feed`. Aucun branchement dans le parcours d’import ou
de synchronisation. Aucun fichier photo, chemin de photo, descriptif complet ou
coordonnée d’agence n’est renvoyé : seul le nombre de photos est indiqué.
La page admin affiche « Fiches lisibles » et « photos repérées », sans charger
les images. L’aperçu ERA ne met pas à jour les métadonnées du flux en succès.
Les erreurs conservent le traitement existant du bouton Aperçu.

Validation :

```sh
node --test scripts/era-preview.test.mjs tests/pro-stock-moderation.test.mjs
```

20 tests locaux (données synthétiques et transport simulé), et vérification de
syntaxe du JavaScript de l’administration. Lecture réelle de l’HTML public
effectuée uniquement en mémoire pour vérifier le parseur, avec compteurs en sortie,
sans téléchargement d’image ni enregistrement du contenu source.

Livraison : fusionner la branche, déployer `pro-stock-sync` avec `era-preview.ts`
et publier `admin-test-import.html` par le processus habituel. Aucun déploiement
effectué lors de la préparation. Cette branche part de main et est indépendante
de la proposition de lecteur de secours #8 : les modifications du même fichier
devront être rapprochées lors de la fusion si cette dernière est intégrée.
