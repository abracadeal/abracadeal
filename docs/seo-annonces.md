# Référencement automatique des annonces — préparation

## Architecture retenue pour GitHub Pages + Supabase

GitHub Pages ne peut pas générer une page HTML côté serveur à chaque visite. Pour que Google voie le titre et la description de chaque annonce sans exécuter JavaScript, générer des **pages HTML statiques** lors d'une synchronisation programmée GitHub Actions, puis les publier sur le domaine abracadeal.fr.

- Source : uniquement les annonces `status = active` visibles publiquement (jamais `visibility_scope = pro`, ni en attente, archivées ou fictives).
- URL canonique proposée : `https://abracadeal.fr/annonces/<id>/`. Conserver le lien vers la fiche interactive existante.
- Balises : title, description, canonical, Open Graph, JSON-LD adapté à la catégorie; échapper systématiquement les contenus vendeurs.
- Générer le sitemap à partir des **mêmes pages réellement créées**. Exclure toute annonce supprimée à chaque reconstruction.
- La page publique doit afficher les informations utiles sans JavaScript, et permettre d'ouvrir l'annonce interactive.
- Pour éviter une surcharge du dépôt et des quotas, surveiller le nombre de pages, le temps de build et le trafic. Adapter la stratégie avant un volume important.

## Prérequis avant activation

1. Confirmer le schéma Supabase et la règle RLS de lecture publique des annonces et photos.
2. Confirmer les URLs de fiches existantes, et éviter une seconde URL indexable en conflit avec le partage `share-listing`.
3. Configurer le secret GitHub `SUPABASE_ANON_KEY` (clé publique anon uniquement, jamais service_role).
4. Valider le rendu sur une annonce réelle publiée et une annonce privée Pro/Pro; la seconde ne doit apparaître nulle part.
5. Vérifier l'état du domaine HTTPS et Search Console avant soumission du sitemap.

**État :** branche de préparation uniquement. Aucune publication en production ni coût additionnel activé.
