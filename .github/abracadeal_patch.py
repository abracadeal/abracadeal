from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Replace/reorder home category cards: Voiture, Moto, Immobilier, Vacances, then the rest.
pattern=r'''      <div class="categories">\n(?:        <a class="cat[^\n]*\n?){8}      </div>'''
new='''      <div class="categories">\n        <a class="cat category-link" href="#resultats" data-category="vehicules" data-sub="voitures"><div class="cat-icon">🚗</div><div><h3>Voiture</h3><small>Voitures, utilitaires et pièces auto</small></div></a>\n        <a class="cat category-link" href="#resultats" data-category="vehicules" data-sub="motos"><div class="cat-icon">🏍️</div><div><h3>Moto</h3><small>Motos, scooters et deux-roues</small></div></a>\n        <a class="cat category-link" href="#resultats" data-category="immobilier"><div class="cat-icon">🏠</div><div><h3>Immobilier</h3><small>Vente et location longue durée</small></div></a>\n        <a class="cat vacances-cat" href="vacances.html"><div class="cat-icon">🏖️</div><div><h3>Vacances</h3><small>Locations saisonnières en direct</small></div></a>\n        <a class="cat category-link" href="#resultats" data-category="hightech"><div class="cat-icon">📱</div><div><h3>High-tech</h3><small>Téléphones, ordinateurs et accessoires</small></div></a>\n        <a class="cat category-link" href="#resultats" data-category="maison"><div class="cat-icon">🛋️</div><div><h3>Maison</h3><small>Mobilier, déco, jardin et équipement</small></div></a>\n        <a class="cat category-link" href="#resultats" data-category="mode"><div class="cat-icon">👗</div><div><h3>Mode</h3><small>Vêtements, chaussures et accessoires</small></div></a>\n        <a class="cat category-link" href="#resultats" data-category="emploi"><div class="cat-icon">💼</div><div><h3>Emploi</h3><small>Offres et opportunités professionnelles</small></div></a>\n      </div>'''
ns,n=re.subn(pattern,new,s,count=1)
if n!=1:
    raise SystemExit(f'Category block replacement failed: {n}')

# Landscape phone/tablet: keep the whole banner visible and move search underneath.
marker='/* ABRACADEAL LANDSCAPE BANNER FIX */'
css='''\n/* ABRACADEAL LANDSCAPE BANNER FIX */\n@media (orientation:landscape) and (max-height:620px) and (max-width:1200px){\n  .hero{padding:0 0 18px !important;}\n  .banner-frame{margin-bottom:0 !important;overflow:visible !important;}\n  .banner{display:block !important;width:100% !important;height:auto !important;object-fit:contain !important;}\n  .search-wrap{position:relative !important;left:auto !important;bottom:auto !important;transform:none !important;width:calc(100% - 20px) !important;margin:12px auto 0 !important;z-index:4 !important;}\n  .search-card{grid-template-columns:minmax(0,1.25fr) minmax(0,.9fr) auto auto !important;align-items:center !important;padding:8px !important;border-radius:16px !important;}\n  .field,.search-btn,.search-nearby-btn{height:46px !important;min-height:46px !important;}\n  .search-btn,.search-nearby-btn{white-space:nowrap !important;padding-left:14px !important;padding-right:14px !important;}\n  .hero-shell::after{height:56px !important;}\n}\n@media (orientation:landscape) and (max-height:520px) and (max-width:950px){\n  .search-card{grid-template-columns:1fr 1fr !important;}\n  .search-btn,.search-nearby-btn{width:100% !important;}\n}\n'''
if marker not in s:
    # Insert before the first closing style tag, after all existing CSS rules.
    pos=s.find('</style>')
    if pos<0: raise SystemExit('No </style> found')
    s=s[:pos]+css+s[pos:]

p.write_text(s,encoding='utf-8')

# Cleanup temporary publishing files so they do not remain in the repo.
Path('.github/abracadeal_patch.py').unlink(missing_ok=True)
Path('.github/workflows/abracadeal-publish.yml').unlink(missing_ok=True)
