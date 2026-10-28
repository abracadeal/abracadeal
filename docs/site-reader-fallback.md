# Lecture du site : lecteur principal puis lecteur de secours

Le serveur `pro-stock-sync` essaie d’abord les connecteurs actuels développés
avec Claude (Annonces-Automobile, Orpi, Century 21, WooCommerce, JSON-LD).
S’ils lèvent une erreur ou ne retournent aucune fiche avec un titre, le second
lecteur prend automatiquement le relais, une seule fois, dans la même requête.

Le second lecteur suit les liens du site, exploite les données structurées des
fiches et, à défaut, les métadonnées HTML explicites (Open Graph / microdonnées).
Il est limité à 40 pages et à un budget de boucle de 35 secondes ; le dernier
téléchargement en cours peut ajouter jusqu’à 20 secondes. Il n’appelle aucun
modèle Claude ou OpenAI et ne nécessite aucune nouvelle clé API. Les noms
« principal » et « secours » désignent deux stratégies de lecture serveur,
pas deux conversations d’assistants qui resteraient ouvertes.

## Points d’entrée concernés

Le relais est centralisé dans `readFeed` : il fonctionne dans « Tester une
adresse », « Aperçu », la synchronisation manuelle et celle des flux actifs.
L’administration affiche « Lecteur de secours » quand ce dernier a servi.
Les réponses d’aperçu et de synchronisation contiennent `reader_used` et
`fallback_reason`. Les flux fichiers CSV/XML/JSON gardent leur parcours actuel.

Le parcours d’inscription existant reste en place : URL et autorisation du pro,
demande en attente, validation administrateur avant activation. Cette modification
ne déclenche pas une lecture publique à chaque frappe ni un import avant validation.
Le relais s’effectue automatiquement lorsque le moteur lit l’adresse enregistrée.

## Protection des annonces

- Tout résultat du secours porte `partial: true`. Aucune annonce absente de
  cette lecture ne sera archivée, même en synchronisation complète.
- Les annonces récupérées restent soumises à la normalisation et à la modération
  existantes. Une extraction ne vaut pas publication.
- Une même URL de fiche, pour le même propriétaire et le même flux, retrouve
  l’annonce existante et conserve sa référence si les lecteurs utilisent des
  identifiants différents. Une URL différente/renommée ne peut pas être rapprochée
  automatiquement avec certitude. Ce changement n’est pas un verrou de concurrence.
- Le lecteur de secours conserve les contrôles d’URL et de réseau existants,
  refuse les fiches redirigées et restreint les réseaux nationaux au chemin
  de l’agence. Il n’exploite pas un autre domaine après redirection.
- Les fiches HTML exigent un type de produit explicite, un titre pertinent,
  un prix et une photo HTTP(S). Une devise connue différente de l’euro ou une
  transaction immobilière ambiguë entraîne un refus.

Les pages exclusivement JavaScript, les sites inaccessibles ou les fiches sans
données suffisantes peuvent encore échouer. Le second lecteur ne contourne
aucune authentification ni protection du site. Un échec des deux lecteurs
arrête l’import avec une demande de vérification manuelle.

## Validation et livraison

```sh
node --test scripts/site-reader-fallback.test.mjs tests/pro-stock-moderation.test.mjs
```

Node.js 24 est utilisé pour ces tests locaux (suppression native des types TS).
24 tests valident le relais, le refus des données ambiguës, le périmètre agence,
le rapprochement des identités, l’absence d’archivage en secours et le circuit
de modération existant. Les transports et la base sont simulés. Aucun test
authentifié de production ni contrôle de types Deno complet n’a été effectué.

Après revue et fusion, déployer `pro-stock-sync` avec `reader-fallback.ts` et
la page `admin-test-import.html` par le processus habituel. Aucun changement
de schéma, secret ou tarification. Avant activation en production, comparer
l’aperçu d’un site autorisé avec les fiches sources et vérifier un cas de
relais. Le dépôt GitHub seul ne déploie pas cette fonction.
