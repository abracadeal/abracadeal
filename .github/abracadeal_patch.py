from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Rename every visible generic Vehicles card to Car and mark it as cars.
s=s.replace('data-category="vehicules"><div class="cat-icon">🚘</div><div><h3>Véhicules</h3><small>Auto, moto, utilitaires et pièces</small></div></a>',
            'data-category="vehicules" data-sub="voitures"><div class="cat-icon">🚗</div><div><h3>Voiture</h3><small>Voitures, utilitaires et pièces auto</small></div></a>')
s=s.replace('data-category="vehicules"><div class="cat-icon">🚗</div><div><h3>Véhicules</h3><small>Auto, moto, utilitaires et pièces</small></div></a>',
            'data-category="vehicules" data-sub="voitures"><div class="cat-icon">🚗</div><div><h3>Voiture</h3><small>Voitures, utilitaires et pièces auto</small></div></a>')

# Safety fallback for any remaining wording inside category cards.
s=s.replace('<h3>Véhicules</h3><small>Auto, moto, utilitaires et pièces</small>', '<h3>Voiture</h3><small>Voitures, utilitaires et pièces auto</small>')

# Force the visual order on every category grid, desktop and mobile.
marker='/* ABRACADEAL CATEGORY ORDER FIX */'
css='''\n/* ABRACADEAL CATEGORY ORDER FIX */\n.categories .cat[data-category="vehicules"][data-sub="voitures"]{order:1}\n.categories .cat[data-category="vehicules"][data-sub="motos"]{order:2}\n.categories .cat[data-category="immobilier"]{order:3}\n.categories .cat.vacances-cat{order:4}\n.categories .cat[data-category="hightech"]{order:5}\n.categories .cat[data-category="maison"]{order:6}\n.categories .cat[data-category="mode"]{order:7}\n.categories .cat[data-category="emploi"]{order:8}\n'''
if marker not in s:
    pos=s.find('</style>')
    if pos<0: raise SystemExit('No </style> found')
    s=s[:pos]+css+s[pos:]

p.write_text(s,encoding='utf-8')
print('vehicle labels remaining:', s.count('<h3>Véhicules</h3>'))
print('car cards:', s.count('<h3>Voiture</h3>'))
print('moto cards:', s.count('<h3>Moto</h3>'))
Path('.github/abracadeal_patch.py').unlink(missing_ok=True)
Path('.github/workflows/abracadeal-publish.yml').unlink(missing_ok=True)
