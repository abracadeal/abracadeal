# Un robot d’aperçu, plusieurs connecteurs

`readPreviewFeed` délègue à `readUnifiedPreview` dans `preview-router.ts`.
Le routeur sélectionne une seule stratégie principale, puis un lecteur HTML
de secours si cette stratégie échoue ou ne fournit aucune fiche exploitable.
Il n’essaie pas des connecteurs d’autres réseaux au hasard.

| Connecteur | Périmètre reconnu |
| --- | --- |
| ERA | Recherche locale d’achat compatible, toutes les pages et contrôle du total |
| Orpi | Page d’agence reconnue par le lecteur existant |
| Century 21 | Site d’agence reconnu ou lien officiel vers ce site |
| Annonces-Automobile | Sites de garages utilisant le format reconnu |
| WooCommerce | Site WordPress dont l’API publique WooCommerce est détectée |
| Données structurées | Fiches schema.org véhicules ou biens immobiliers |
| HTML de secours | JSON-LD ou métadonnées explicites de fiches ; couverture partielle |
| Fichiers | Flux CSV/XML/JSON via le lecteur existant |

Un nom de prestataire détecté (AC3, Apimo, Hektor, etc.) ne prouve pas qu’un
connecteur dédié existe. Le générique peut fonctionner si les fiches exposent
les données attendues. Sinon, il reste nécessaire de développer et tester une
adaptation. Aucune promesse de lecture de tous les sites ou de tous les ERA.
Les lecteurs sont du code serveur ; aucun appel automatique à une conversation
Claude ou ChatGPT ni nouvelle clé de modèle.

## Lecture seule

Les deux actions d’aperçu appellent ce routeur et renvoient `preview_only`,
`connector_id`, `reader_used`, `attempted_connectors` et, si pertinent, le total
source et le nombre de pages. Elles n’enregistrent plus les métadonnées d’un
flux lors de l’aperçu. Le routeur n’a aucune capacité de base de données.
Les imports, les consentements et la modération conservent leur parcours actuel :
le nouveau routeur n’est pas branché sur les synchronisations.

ERA conserve le mode demandé : nombre de photos uniquement, sans renvoyer leurs
chemins ni télécharger les fichiers. Les connecteurs existants gardent leur
format d’aperçu (certains renvoient des URL de photos externes pour l’affichage).
Le code du robot ne télécharge aucun fichier photo en aperçu ; une image affichée
par la page admin est chargée par le navigateur depuis sa source.

## Relais et couverture

Le secours conserve les contrôles réseau du serveur, reste sur le domaine lu
et est limité au chemin de l’agence sur les réseaux nationaux reconnus.
Il est toujours marqué partiel. ERA reste strict : si son total n’est pas vérifié,
le routeur affiche l’échec au lieu de tenter un lecteur susceptible de mélanger
les agences ou de présenter 10 biens comme les 25 attendus.

Les pages entièrement JavaScript, les modifications de structure ou les sites
inaccessibles peuvent encore échouer. Un aperçu reconnu n’est pas une garantie
de complétude, sauf quand le connecteur vérifie explicitement le total (ERA).

## Validation et livraison

```sh
node --test scripts/preview-router.test.mjs scripts/era-preview.test.mjs scripts/reader-fallback.test.mjs tests/pro-stock-moderation.test.mjs
```

40 tests passent : sélection de chaque connecteur, relais, erreurs, fichiers,
périmètre des agences, lecture ERA multipage et non-régression de modération.
Tests avec transports et base simulés ; les lecteurs Orpi, Century 21,
Annonces-Automobile et WooCommerce ne sont pas revalidés sur des sites réels
par cette batterie. La syntaxe du JavaScript admin est aussi vérifiée.
Un essai réseau du routeur unifié sur ERA Cannes est réalisé en mémoire, sans
enregistrer les fiches ou photos.

Cette proposition rassemble les fonctions d’aperçu des PR #8 et #9 en une seule
livraison depuis main, tout en limitant le nouveau relais aux aperçus. Ne pas
fusionner ces propositions séparément sans rapprocher les fichiers communs.
Après revue/fusion, déployer `pro-stock-sync` avec ses trois modules locaux et
publier la page admin via le processus habituel. Aucun déploiement effectué ici.
Pas de changement de schéma, de secret, de tarif ou d’activation d’import.
