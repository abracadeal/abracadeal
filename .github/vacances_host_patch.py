from pathlib import Path
p=Path('vacances.html')
s=p.read_text(encoding='utf-8')

# Hôte terminology across the Vacances interface.
repls={
'Propriétaires':'Hôtes',
'href="#proprietaires"':'href="#hotes"',
'id="proprietaires"':'id="hotes"',
'voyageurs et propriétaires':'voyageurs et hôtes',
'Le propriétaire paie':'L’hôte paie',
'Un prix direct propriétaire':'Un prix direct hôte',
'Le propriétaire choisit':'L’hôte choisit',
'pour que le propriétaire sache':'pour que l’hôte sache',
'payé au propriétaire':'payé à l’hôte',
'Offre propriétaire':'Offre hôte',
'entre le propriétaire et le voyageur':'entre l’hôte et le voyageur',
'Montant que vous percevez':'Montant net reçu par l’hôte',
'Gain propriétaire':'Gain hôte',
'Le propriétaire publie':'L’hôte publie',
'proposés par le propriétaire':'proposés par l’hôte',
'Le propriétaire et le voyageur':'L’hôte et le voyageur',
'permet au propriétaire':'permet à l’hôte',
'Le propriétaire reste libre de fixer son prix.':'L’hôte reste libre de fixer son prix.'
}
for a,b in repls.items(): s=s.replace(a,b)

# Make the calculator self-explanatory and remove the redundant Calculate button.
s=s.replace(
'Entrez les montants d’un séjour vendu ailleurs. Abracadeal vous montre un prix direct intermédiaire qui peut faire économiser le voyageur tout en augmentant ce que vous percevez.',
'<strong>Comment ça marche ?</strong> Indiquez le prix total payé par le voyageur sur une autre plateforme et le montant net réellement reçu par l’hôte. Abracadeal partage automatiquement l’écart en deux : le voyageur paie moins et l’hôte reçoit plus.'
)
s=s.replace('Prix payé par le voyageur ailleurs','Prix total payé par le voyageur ailleurs')

old='''      <div class="calc-actions">\n        <button class="btn primary calc-btn" id="calculateDirectPrice" type="button">Calculer</button>\n        <span class="calc-message" id="calcMessage" aria-live="polite"></span>\n      </div>\n      <small>Simulation indicative calculée uniquement à partir des deux montants saisis. L’hôte reste libre de fixer son prix.</small>'''
new='''      <span class="calc-message" id="calcMessage" aria-live="polite"></span>\n      <small>Le calcul se met à jour automatiquement. Exemple : si le voyageur paie 150 € et que l’hôte reçoit 128 €, l’écart est de 22 €. Un prix direct de 139 € fait économiser 11 € au voyageur et fait gagner 11 € de plus à l’hôte. Simulation indicative : l’hôte reste libre de fixer son prix.</small>'''
s=s.replace(old,new)

s=s.replace('.calc-actions{display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}\n','')
s=s.replace('.calc-btn{min-width:150px;min-height:48px;border-radius:15px}\n','')
s=s.replace('.calc-message{font-size:.82rem;font-weight:700;color:#74667c}\n','.calc-message{display:block;font-size:.82rem;font-weight:700;color:#74667c;margin-top:10px}\n')
s=s.replace('.calc-message.ok{color:#672080}\n','')

s=s.replace("  const calcBtn=root.getElementById('calculateDirectPrice');\n",'')
s=s.replace('  function calc(showConfirmation=false){','  function calc(){')
s=s.replace("    if(showConfirmation){calcMessage.textContent='Calcul mis à jour.';calcMessage.classList.add('ok');}else{calcMessage.textContent='';}\n","    calcMessage.textContent='';\n")
s=s.replace("  total.addEventListener('input',()=>calc(false));\n  net.addEventListener('input',()=>calc(false));\n  calcBtn?.addEventListener('click',()=>calc(true));\n  calc(false);","  total.addEventListener('input',calc);\n  net.addEventListener('input',calc);\n  calc();")

p.write_text(s,encoding='utf-8')

# Self-clean temporary publication files.
Path('.github/vacances_host_patch.py').unlink(missing_ok=True)
Path('.github/workflows/vacances-host-publish.yml').unlink(missing_ok=True)
