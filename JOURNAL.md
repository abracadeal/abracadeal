# Journal de travail Abracadeal

Journal partagé entre Claude et ChatGPT, qui travaillent tous les deux sur ce dépôt et sur la base Supabase (projet `jplzvxmpbpjssyinozap`). Anthony répartit les tâches.

## Règles (à lire avant chaque modification)

1. **Lire les dernières entrées de ce journal** et récupérer la dernière version du dépôt (`main`) avant de toucher au code.
2. **Tout ce qui est mis en ligne est enregistré dans le dépôt**, tout de suite :
   - pages et scripts du site → commit sur `main` ;
   - fonction Supabase (edge function) déployée → son code dans `supabase/functions/<nom>/index.ts` ;
   - modification de la base (tables, fonctions SQL) → fichier SQL daté dans `supabase/`.
   Avant de modifier une fonction Supabase, partir de la version **réellement déployée**, pas d'une vieille copie.
3. **Une entrée dans ce journal après chaque modification**, la plus récente en haut :
   - ce qui a été changé (pages, fonctions, tables) ;
   - pourquoi ;
   - ce qui reste à faire ou à vérifier.
4. Ne pas travailler en même temps sur la même partie du site. Code / fonctionnalités : Claude. Tâches simples : ChatGPT (répartition décidée par Anthony le 17/10/2026).

## Entrées

### 18/10/2026 — Claude — Connexion rapide Google / Facebook (prête, pas encore active)
- **Changé :**
  - Nouveau `assets/social-login-20261018.js`, chargé dans `index.html` juste après `index-main.js` : boutons « Continuer avec Google / Facebook » en haut des onglets Connexion et Créer un compte. Ils n'apparaissent **que** si le fournisseur est activé dans Supabase (lecture de `/auth/v1/settings`) : tant que rien n'est activé, le site ne change pas.
  - Réservé aux particuliers : les boutons disparaissent quand « Professionnel » est choisi (les pros gardent SIRET + Stripe).
  - Au premier retour de Google/Facebook : fenêtre « Finalisez votre compte » obligatoire (pseudo prérempli avec le prénom, téléphone unique vérifié comme l'inscription classique, acceptation des CGU si pas déjà faite). « Annuler » déconnecte.
  - SQL préparé : `supabase/2026-10-18-social-login.sql` (profil créé sans téléphone autorisé **uniquement** pour les comptes Google/Facebook ; pseudo par défaut = prénom).
- **Pourquoi :** demande d'Anthony, inscription plus rapide.
- **À faire :**
  1. **Appliquer `supabase/2026-10-18-social-login.sql`** (pas encore appliqué : sans lui, toute inscription Google/Facebook échoue car le profil exige un téléphone).
  2. Créer les identifiants Google (Google Cloud Console) et Facebook (Meta for Developers), puis les coller dans Supabase → Authentication → Sign In / Providers. URL de rappel : `https://jplzvxmpbpjssyinozap.supabase.co/auth/v1/callback`.
  3. Vérifier que `https://abracadeal.fr/` est dans Authentication → URL Configuration → Redirect URLs.
  4. Les pages Vacances ont leur propre connexion : pas encore de boutons Google/Facebook dessus.

### 17/10/2026 — Claude — Fichiers internes retirés du site public
- **Changé :** ajout de `_config.yml` : `JOURNAL.md`, `supabase/`, `tests/`, `scripts/`, `backups/` et `docs/` ne sont plus publiés sur abracadeal.fr (ils restent dans le dépôt).
- **Pourquoi :** ces dossiers étaient lisibles par n'importe qui sur le site (code des fonctions serveur, SQL, anciennes versions, notes internes).
- **À savoir :** ne rien mettre dans ces dossiers qui doive être accessible depuis le site.

### 17/10/2026 — Claude — Prospection : suivi des clics
- **Changé :**
  - Base : colonnes `ref_code`, `click_count`, `first_clicked_at`, `last_clicked_at` sur `prospection_prospects` ; fonctions `prospect_ref_code(uuid)` (service_role), `track_prospect_click(text)` (public), `admin_prospect_tracking()` (admin). Fichier : `supabase/2026-10-17-prospect-click-tracking.sql`.
  - Fonction `prospect-mailer` (v6 déployée) : le lien `https://abracadeal.fr/pro-fondateur.html` des mails reçoit un code personnel `?r=xxxxxxxx`. Le fichier du dépôt a été resynchronisé avec la version en ligne (il était resté à une ancienne version, sans A/B ni relance).
  - `pro-fondateur.html` : enregistre le clic, garde le code dans le navigateur (`abraca_prospect_ref`, 90 jours) et le retire de l'adresse.
  - `assets/index-main.js` : à l'inscription, le code est ajouté au compte (`prospect_ref` dans les métadonnées).
  - `admin-prospection.html` / `assets/admin-prospection.js` : bloc « Suivi : qui a cliqué ? » + colonne Clics.
- **Pourquoi :** savoir quels pros cliquent et s'inscrivent, sans pixel d'ouverture (peu fiable et à éviter côté CNIL).
- **Règles de comptage :** clic dans les 60 s après l'envoi = antivirus, ignoré ; visites répétées en moins de 30 min = 1 clic.
- **À savoir / à faire :** le suivi démarre avec les envois du 17/10 à 16 h 56 (les 94 mails précédents n'ont pas de code). La variante B (sans lien) ne peut pas être suivie en clics. Si un modèle de mail est modifié, garder exactement le lien `https://abracadeal.fr/pro-fondateur.html` pour que le code soit ajouté.
