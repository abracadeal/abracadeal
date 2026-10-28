# Lecteur parallèle, déploiement isolé

Page : `/admin-reader-parallel.html`.
Fonction : `site-reader-preview`, projet `jplzvxmpbpjssyinozap`.

La page utilise la session administrateur existante d’Abracadeal. La fonction
valide le jeton via Supabase Auth et vérifie `profiles.is_admin` avant chaque
lecture. La validation est effectuée dans le corps de la fonction ; le contrôle
JWT historique de la passerelle est désactivé pour permettre ce parcours avec
les clés de publication actuelles. Le lecteur n’accepte que `preview_url`.

Le paquet est indépendant de `pro-stock-sync`. `readers.ts` contient uniquement
les lecteurs et la normalisation, sans la fonction sync ni les routines de
modération et de publication. Aucun insert/update/delete/upsert/rpc n’est présent
dans les fichiers déployés. Aucun cron ni import n’est installé. La page n’a ni
bouton d’activation ni liste de demandes. Les résultats ne sont pas mis en cache.

La livraison ajoute uniquement de nouveaux fichiers. Aucun fichier du lecteur
habituel, de l’administration existante ou de la page d’accueil n’est remplacé.
Les propositions précédentes #8/#9/#10 ne sont pas fusionnées par cette livraison.
La fonction `pro-stock-sync` version 22 est laissée telle quelle.

Tests :

```sh
node --test scripts/parallel-preview.test.mjs
```

Les quatre tests vérifient l’authentification requise, le refus des actions
d’import, le résultat en lecture seule et l’absence de primitives d’écriture
dans le paquet déployé. Les tests des connecteurs et l’essai public ERA sont
décrits dans la proposition #10. L’essai complet de l’interface nécessite une
session administrateur valide dans le navigateur de l’utilisateur.

Pour arrêter ce test sans affecter le robot habituel : retirer cette page et
désactiver uniquement `site-reader-preview` par le processus d’administration.
Ne pas supprimer ni redéployer `pro-stock-sync`.
