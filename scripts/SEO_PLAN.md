# Plan SEO Abracadeal (tâche automatique « SEO auto », Claude)

Objectif : chaque annonce active et chaque page pro (Garage / Immo / Professionnel) trouvable sur Google.

## Vérifié (12/11/2026)
- [x] robots.txt : sitemap déclaré, IA autorisées, aspirateurs bloqués, admin/compte/paiement exclus
- [x] sitemap-annonces.xml = annonces actives publiques en base (549 / 549), aucune archivée
- [x] Fiches annonces en HTML statique : title unique, meta description, canonical, 1 seul H1, Open Graph, JSON-LD valide, alt des photos
- [x] Pages pros / catégories / Auto : titles uniques, JSON-LD valide, BreadcrumbList, pages vides en noindex et hors sitemap
- [x] Aucun lien interne cassé (annonces, catégories, pros)

## Chantiers
- [x] Titles des fiches trop longs (540/549 > 65 car.) : mentions commerciales retirées, prix retiré si trop long, ville proche raccourcie (accord d'Anthony le 12/11) — VERSION 14
- [ ] Titles encore > 65 car. pour la plupart des annonces de pros (titres vendeur très longs) : surveiller dans Search Console si Google les réécrit mal
- [ ] lastmod dans sitemap-categories.xml, sitemap-auto.xml, sitemap-pros.xml
- [ ] Vérifier les redirections www → non-www, http → https, abracadeal.com → .fr (Cloudflare)
- [ ] Échantillon 404/500 sur les annonces en ligne, poids des pages et images
