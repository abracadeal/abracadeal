from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='ABRACADEAL_RUNTIME_CATEGORY_FIX'
script='''\n<script id="ABRACADEAL_RUNTIME_CATEGORY_FIX">\n(function(){\n  function fixCategoryCards(){\n    document.querySelectorAll('.categories .cat[data-category="vehicules"]:not([data-sub])').forEach(card=>{\n      card.dataset.sub='voitures';\n      const title=card.querySelector('h3');\n      const desc=card.querySelector('small');\n      const icon=card.querySelector('.cat-icon');\n      if(title) title.textContent='Voiture';\n      if(desc) desc.textContent='Voitures, utilitaires et pièces auto';\n      if(icon) icon.textContent='🚗';\n    });\n  }\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fixCategoryCards);\n  else fixCategoryCards();\n})();\n</script>\n'''
if marker not in s:
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('No </body> found')
    s=s[:pos]+script+s[pos:]
p.write_text(s,encoding='utf-8')
Path('.github/abracadeal_patch.py').unlink(missing_ok=True)
Path('.github/workflows/abracadeal-publish.yml').unlink(missing_ok=True)
