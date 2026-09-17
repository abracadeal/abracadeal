from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old_section = '''
  <section class="section" id="pros">
    <div class="container">
      <div class="pro-block">
        <div>
          <h2>Un espace pensé aussi pour les professionnels.</h2>
          <p>Garages, marchands, agences et boutiques peuvent centraliser et gérer leurs annonces depuis un seul espace.</p>
          <div class="pro-main-actions">
            <a class="btn primary" id="proAccountBtn" href="#accountModal">Créer un compte professionnel</a>
            <button class="btn primary hidden" id="proSectionImportBtn" type="button">Importer mon stock</button>
          </div>
        </div>
        <div class="pro-grid">
          <div class="pro-card"><b>Compte dédié</b><span>Vos coordonnées et votre activité en un seul profil.</span></div>
          <div class="pro-card"><b>Gestion simplifiée</b><span>Ajoutez et retirez vos annonces facilement.</span></div>
          <div class="pro-card"><b>Import de stock</b><span>Prévu pour accélérer l’ajout de plusieurs annonces.</span></div>
          <div class="pro-card"><b>Visibilité nationale</b><span>Vos annonces peuvent être vues partout en France.</span></div>
        </div>
      </div>
    </div>
  </section>
'''

if old_section not in text:
    raise SystemExit('Bloc professionnels bas introuvable: arrêt sans modification')
text = text.replace(old_section, '\n', 1)

old_copy = '<p class="signup-founder-copy">Votre première année de diffusion et de synchronisation de stock est offerte, sans carte bancaire.</p>'
new_copy = '<p class="signup-founder-copy"><strong>1re année :</strong> 12 mois de diffusion et de synchronisation de stock offerts, sans carte bancaire.</p>'
if old_copy not in text:
    raise SystemExit('Texte offre Fondateurs introuvable: arrêt sans modification')
text = text.replace(old_copy, new_copy, 1)

old_benefit = '<span class="signup-founder-benefit">-10 % la 2e année</span>\n                <span class="signup-founder-benefit">Sans engagement automatique</span>'
new_benefit = '<span class="signup-founder-benefit">-10 % la 2e année</span>\n                <span class="signup-founder-benefit">Puis tarif public en vigueur</span>\n                <span class="signup-founder-benefit">Sans engagement automatique</span>'
if old_benefit not in text:
    raise SystemExit('Avantages offre Fondateurs introuvables: arrêt sans modification')
text = text.replace(old_benefit, new_benefit, 1)

path.write_text(text, encoding='utf-8')
print('Correction Fondateurs appliquée.')
