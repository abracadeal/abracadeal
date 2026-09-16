from pathlib import Path
import re

# --- index.html : import stock pro 15/30 photos + information garages ---
p = Path('index.html')
s = p.read_text(encoding='utf-8')

notice = '<div class="pro-import-api-note"><b>Photos :</b> jusqu’à 15 photos par annonce sont importées gratuitement. Si votre flux en contient davantage, seules les 15 premières sont publiées. Avec le Pack Photos Pro, jusqu’à 30 photos peuvent être importées.</div>'
api_note = '<div class="pro-import-api-note"><b>API / DMS :</b>'
if notice not in s and api_note in s:
    s = s.replace(api_note, notice + '\n          ' + api_note, 1)

# Les annonces déjà importées doivent conserver leur éventuel Pack Photos Pro (30).
s = s.replace(".select('id,description,status')", ".select('id,description,status,photo_limit')")
s = s.replace("source:importedSourceFromDescription(x.description||'')});", "source:importedSourceFromDescription(x.description||''),photo_limit:Number(x.photo_limit||15)});")

# Lire jusqu'à 30 photos dans les fichiers/flux.
s = s.replace('for(let i=1;i<=12;i++) add(importCell(r,', 'for(let i=1;i<=30;i++) add(importCell(r,')
s = s.replace('return urls.slice(0,12);', 'return urls.slice(0,30);')

# Conserver la limite actuelle de l'annonce (15 gratuite / 30 Pack Pro).
s = s.replace("existingId:existing?.id||null,status};", "existingId:existing?.id||null,existingPhotoLimit:Number(existing?.photo_limit||15),status};")

# Aperçu : prévenir quand le flux contient plus de photos que la limite publiée.
old_photo_cell = "<td>${r.photos.length}</td><td><span class=\"pro-import-status"
new_photo_cell = "<td>${r.photos.length>Math.max(15,Math.min(30,Number(r.existingPhotoLimit||15)))?`${Math.max(15,Math.min(30,Number(r.existingPhotoLimit||15)))} publiées / ${r.photos.length} reçues`:r.photos.length}</td><td><span class=\"pro-import-status"
s = s.replace(old_photo_cell, new_photo_cell)

# Toute nouvelle annonce pro importée démarre à 15 photos.
if "crit_air:r.critAir||null,photo_limit:15" not in s:
    s = s.replace("crit_air:r.critAir||null};", "crit_air:r.critAir||null,photo_limit:15};")

# L'import manuel respecte 15/30 et ne rabaisse jamais une annonce Pack Pro à 15.
s = s.replace('async function replaceImportedPhotos(listingId,photos){', 'async function replaceImportedPhotos(listingId,photos,limit=15){')
s = s.replace('photos.slice(0,12).map((url,index)=>', 'photos.slice(0,limit).map((url,index)=>')
s = s.replace('photos.slice(0,15).map((url,index)=>', 'photos.slice(0,limit).map((url,index)=>')
s = s.replace('await replaceImportedPhotos(listingId,r.photos);', 'await replaceImportedPhotos(listingId,r.photos,Math.max(15,Math.min(30,Number(r.existingPhotoLimit||15))));')

p.write_text(s, encoding='utf-8')

# --- vacances.html : bouton Calculer + recalcul/validation ---
v = Path('vacances.html')
if v.exists():
    t = v.read_text(encoding='utf-8')

    css_anchor = '.calc small{display:block;color:#817287;margin-top:12px;line-height:1.45}\n'
    css_add = '''.calc-actions{display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}\n.calc-btn{min-width:150px;min-height:48px;border-radius:15px}\n.calc-message{font-size:.82rem;font-weight:700;color:#74667c}\n.calc-message.error{color:#b42353}\n.calc-message.ok{color:#672080}\n'''
    if '.calc-actions{' not in t and css_anchor in t:
        t = t.replace(css_anchor, css_anchor + css_add, 1)

    old_html = '''      <div class="calc-result" aria-live="polite">\n        <div class="calc-result-top">\n          <div class="metric"><span>Économie voyageur</span><strong id="travelerSaving">78,75 €</strong></div>\n          <div class="metric"><span>Gain propriétaire</span><strong id="ownerGain">78,75 €</strong></div>\n        </div>\n        <div class="direct-price"><span>Exemple de prix direct Abracadeal</span><strong id="directPrice">971,25 €</strong></div>\n      </div>\n      <small>Simulation indicative calculée uniquement à partir des deux montants saisis. Le propriétaire reste libre de fixer son prix.</small>'''
    new_html = '''      <div class="calc-result" aria-live="polite">\n        <div class="calc-result-top">\n          <div class="metric"><span>Économie voyageur</span><strong id="travelerSaving">78,75 €</strong></div>\n          <div class="metric"><span>Gain propriétaire</span><strong id="ownerGain">78,75 €</strong></div>\n        </div>\n        <div class="direct-price"><span>Exemple de prix direct Abracadeal</span><strong id="directPrice">971,25 €</strong></div>\n      </div>\n      <div class="calc-actions">\n        <button class="btn primary calc-btn" id="calculateDirectPrice" type="button">Calculer</button>\n        <span class="calc-message" id="calcMessage" aria-live="polite"></span>\n      </div>\n      <small>Simulation indicative calculée uniquement à partir des deux montants saisis. Le propriétaire reste libre de fixer son prix.</small>'''
    if 'id="calculateDirectPrice"' not in t:
        t = t.replace(old_html, new_html, 1)

    old_js = '''  function calc(){\n    let t=Math.max(0,Number(total.value)||0),n=Math.max(0,Number(net.value)||0);\n    if(n>t)n=t;\n    const d=(t+n)/2;\n    direct.textContent=money.format(d);\n    saving.textContent=money.format(Math.max(0,t-d));\n    gain.textContent=money.format(Math.max(0,d-n));\n  }\n  total.addEventListener('input',calc);net.addEventListener('input',calc);calc();'''
    new_js = '''  const calcBtn=root.getElementById('calculateDirectPrice');\n  const calcMessage=root.getElementById('calcMessage');\n  function calc(showConfirmation=false){\n    const t=Math.max(0,Number(total.value)||0);\n    const n=Math.max(0,Number(net.value)||0);\n    calcMessage.className='calc-message';\n    if(!t||!n){calcMessage.textContent='Renseignez les deux montants.';calcMessage.classList.add('error');return false;}\n    if(n>t){calcMessage.textContent='Le montant que vous percevez doit être inférieur ou égal au prix payé par le voyageur.';calcMessage.classList.add('error');return false;}\n    const d=(t+n)/2;\n    direct.textContent=money.format(d);\n    saving.textContent=money.format(t-d);\n    gain.textContent=money.format(d-n);\n    if(showConfirmation){calcMessage.textContent='Calcul mis à jour.';calcMessage.classList.add('ok');}else{calcMessage.textContent='';}\n    return true;\n  }\n  total.addEventListener('input',()=>calc(false));\n  net.addEventListener('input',()=>calc(false));\n  calcBtn?.addEventListener('click',()=>calc(true));\n  calc(false);'''
    t = t.replace(old_js, new_js, 1)
    v.write_text(t, encoding='utf-8')

# Nettoyage des fichiers temporaires de publication.
Path('.github/abracadeal_patch.py').unlink(missing_ok=True)
Path('.github/workflows/abracadeal-publish.yml').unlink(missing_ok=True)
