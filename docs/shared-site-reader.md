# Un lecteur de sites pour Claude et Codex

Le moteur partagé existe déjà : `supabase/functions/pro-stock-sync/index.ts`.
L’administration `admin-test-import.html` et le client `scripts/read-site.mjs`
appellent ce même moteur. Les connecteurs doivent être ajoutés à ce moteur,
pas dupliqués dans les assistants.

## Utilisation

Node.js 20 ou ultérieur, sans dépendance supplémentaire :

```sh
node scripts/read-site.mjs url https://www.lifecars.fr vehicules
node scripts/read-site.mjs url https://exemple-agence.fr immobilier
node scripts/read-site.mjs feed 11111111-1111-1111-1111-111111111111
node --test scripts/read-site.test.mjs
```

`ABRACADEAL_ACCESS_TOKEN` doit être fourni par le gestionnaire de secrets de
l’environnement : session utilisateur Abracadeal existante et valide. Ne pas
mettre le jeton dans Git, un argument de commande, les journaux ou une conversation.
Ne jamais remplacer ce jeton par une clé service_role. Le serveur conserve ses
contrôles : compte professionnel ou administrateur pour `preview_url`,
administrateur pour `preview_feed`. Une session expirée doit être renouvelée
par le parcours d’authentification normal.

La sortie JSON conserve `raw`, `rows`, `platform` et `partial`. Elle peut contenir
des informations professionnelles : choisir un emplacement approprié si elle
doit être enregistrée. Une lecture partielle ou des erreurs ne valident pas un
stock complet. L’exécution peut prendre jusqu’à deux minutes.

## Travail complémentaire

Les deux assistants peuvent lire des sites différents et améliorer des
connecteurs différents sur des branches séparées. Avant de modifier un même
connecteur, vérifier les branches et les demandes de fusion ouvertes.
Ce client ne fournit aucune coordination automatique entre les assistants.

Le client accepte uniquement `preview_url` et `preview_feed` : aucune création,
publication, modification ou suppression d’annonce. `preview_feed` met toutefois
à jour le prestataire détecté ou la dernière erreur du flux, comme le bouton
« Aperçu » de l’administration. Pour une simple lecture sans écriture de ces
métadonnées, utiliser le mode `url`.

Les imports effectifs restent dans le circuit existant d’autorisation et de
modération. Le client ne permet pas de lancer deux synchronisations concurrentes.
Le serveur actuel n’a pas été modifié pour sérialiser les synchronisations :
ne pas interpréter ce client comme une protection contre leurs doublons.
Une file de tâches ou un verrou transactionnel persistant devra être développé
et testé séparément avant de déléguer les écritures simultanées aux assistants.

## Validation et mise en service

Les tests locaux utilisent un transport simulé : routes, actions en aperçu,
validation des entrées et traitement des erreurs. Ils ne prouvent pas une
lecture réelle ni la compatibilité d’un nouveau site. Pour la valider, exécuter
le client avec une session autorisée et comparer l’aperçu aux annonces sources.
Aucun déploiement du serveur n’est nécessaire pour ce client. L’existence du
code dans Git ne connecte pas automatiquement un assistant : son environnement
doit disposer d’une session autorisée et d’un accès réseau à l’API existante.
