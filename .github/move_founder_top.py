from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

section = '''\n  <section class="section" id="pros">\n    <div class="container">\n      <div class="pro-block">\n        <div>\n          <div class="founder-inline"><strong>Offre Fondateurs</strong> · réservée aux 1 000 premiers comptes professionnels éligibles</div>\n          <h2>Professionnels : démarrez avec 12 mois offerts.</h2>\n          <p>Garages, marchands, agences et boutiques peuvent publier et gérer leur stock sur Abracadeal. Profitez de l’offre de lancement dès la création de votre compte professionnel.</p>\n          <div class="founder-counter" data-founder-counter data-state="loading"><span class="founder-counter-dot"></span><span>Calcul des places…</span></div>\n          <div class="pro-main-actions" style="margin-top:14px">\n            <a class="btn primary" id="proAccountBtn" href="#accountModal">Créer un compte professionnel</a>\n            <button type="button" class="founder-terms-link" onclick="openModal('founderOfferModal')">Voir les conditions</button>\n          </div>\n        </div>\n        <div class="pro-grid">\n          <div class="pro-card"><b>1re année</b><span>12 mois offerts, sans carte bancaire au démarrage.</span></div>\n          <div class="pro-card"><b>2e année</b><span>-10 % sur le tarif public applicable.</span></div>\n          <div class="pro-card"><b>Ensuite</b><span>Tarif public en vigueur, présenté avant toute souscription.</span></div>\n          <div class="pro-card"><b>Sans engagement automatique</b><span>Aucun abonnement imposé à la fin de l’offre.</span></div>\n        </div>\n      </div>\n    </div>\n  </section>\n'''

if 'id="pros"' not in text:
    marker = '  <aside class="container b2b-discovery" id="b2bDiscovery"'
    if marker not in text:
        raise SystemExit('Insertion marker not found')
    text = text.replace(marker, section + '\n' + marker, 1)

old = "  $('#pros')?.classList.toggle('hidden',proExperience);"
new = "  $('#pros')?.classList.toggle('hidden',!!currentUser);"
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Marketing visibility line not found')

path.write_text(text, encoding='utf-8')
print('Bloc Professionnels/Fondateurs déplacé en haut de page.')
