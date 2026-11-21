"""Génère les hubs SEO Auto à partir des annonces publiques actives.
Phase 1 : marques, marque+modèle, énergie et budgets. Aucun contenu inventé.
"""
import datetime, html, json, os, re, shutil, sys, unicodedata, urllib.parse, urllib.request
import abraca_gzip  # noqa: F401  (21/11/2026 : lectures Supabase compressées)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_share_pages import CSS as SITE_CSS, FONTS, HEADER, HUMAN_LINKS  # même apparence que le reste du site

SITE="https://abracadeal.fr"
SUPABASE_URL="https://jplzvxmpbpjssyinozap.supabase.co"
SUPABASE_KEY="sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF"
BASE=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
ROOT=os.path.join(BASE,"auto")
SITEMAP=os.path.join(BASE,"sitemap-auto.xml")
BUDGETS=[(5000,"moins-de-5000-euros"),(10000,"moins-de-10000-euros"),(20000,"moins-de-20000-euros")]
FUELS={"diesel":"Diesel","essence":"Essence","electrique":"Électrique","électrique":"Électrique","hybride":"Hybride","hybride rechargeable":"Hybride rechargeable"}

def slug(s):
    s=unicodedata.normalize("NFKD",str(s or "")).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+","-",s).strip("-")

def fetch_listings():
    now=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    fields="id,title,price,city,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,created_at,updated_at,description"
    rows=[]; start=0
    while True:
        q=urllib.parse.urlencode({"select":fields,"status":"eq.active","visibility_scope":"eq.public","revision_of":"is.null","category":"eq.vehicules","or":f"(expires_at.is.null,expires_at.gt.{now})","order":"created_at.desc"})
        req=urllib.request.Request(f"{SUPABASE_URL}/rest/v1/listings?{q}",headers={"apikey":SUPABASE_KEY,"Range-Unit":"items","Range":f"{start}-{start+999}"})
        with urllib.request.urlopen(req,timeout=60) as r: data=json.loads(r.read())
        rows+=data
        if len(data)<1000: return rows
        start+=1000

def money(v):
    try:return f"{int(float(v)):,} €".replace(","," ")
    except:return ""


def offer(items):
    """19/11/2026 (SEO) : chiffres réels pour les titres/descriptions (nombre, prix mini/maxi, villes) → meilleur taux de clic dans Google."""
    prices=[]
    for x in items:
        try:
            v=float(x.get("price"))
            if v>0: prices.append(v)
        except: pass
    cities=[]
    for x in items:
        c=(x.get("city") or "").strip()
        if c and c not in cities: cities.append(c)
    n=len(items)
    lo=money(min(prices)) if prices else ""
    hi=money(max(prices)) if prices else ""
    rng=(f"à {lo}" if lo==hi else f"de {lo} à {hi}") if lo else ""
    return n,lo,rng,cities[:3]

def esc(s): return html.escape(str(s or ""),quote=True)

# 19/11/2026 (SEO) : repères généraux sur les modèles que Google montre déjà (Search Console : Fabia 124 impressions,
# Corsa 103, DS 3 Crossback 100, Mokka 98, Crossland 97…). Faits connus et stables sur le modèle, rien sur les annonces.
MODEL_GUIDES={
 "skoda/fabia":"La Skoda Fabia est la citadine polyvalente de Skoda (groupe Volkswagen). La 4e génération, lancée en 2021, n’existe qu’en essence (1.0 TSI et 1.5 TSI). La génération précédente (2014-2021) existait aussi en diesel et en break Fabia Combi, apprécié pour son grand coffre.",
 "opel/corsa":"L’Opel Corsa est l’une des citadines les plus vendues en Europe. La Corsa F, depuis 2019, partage sa base technique avec la Peugeot 208 et existe aussi en 100 % électrique (Corsa-e, puis Corsa Electric). La Corsa E (2014-2019) reste une occasion économique très répandue.",
 "ds/ds-3-crossback":"Le DS 3 Crossback est le SUV urbain de la marque premium DS, vendu sous ce nom de 2019 à 2022 puis rebaptisé DS 3. Il a existé en essence PureTech, en diesel BlueHDi et en électrique E-Tense, avec une finition plus haut de gamme que ses cousins Peugeot et Opel.",
 "opel/mokka":"L’Opel Mokka est un SUV urbain. La 2e génération, lancée en 2020 sur une base Stellantis, existe en essence, en diesel et en électrique (Mokka-e). La première génération (2012-2019) a été vendue sous le nom de Mokka X à partir de 2016.",
 "opel/crossland":"L’Opel Crossland (Crossland X jusqu’en 2020) est un SUV compact familial lancé en 2017, cousin technique de la Peugeot 2008 de première génération et du Citroën C3 Aircross. Il a depuis été remplacé par l’Opel Frontera.",
 "peugeot/2008":"Le Peugeot 2008 est le SUV urbain de Peugeot. La 2e génération, lancée en 2019, existe en essence PureTech, en diesel BlueHDi, en hybride et en électrique (e-2008). La première génération (2013-2019) est une occasion recherchée pour son prix et sa sobriété.",
 "porsche/panamera":"La Porsche Panamera est la grande berline sportive de Porsche, à quatre portes. Trois générations se sont succédé (2009, 2016 et 2023), avec des versions hybrides rechargeables E-Hybrid et un break Sport Turismo sur la 2e génération.",
 "alfa-romeo/stelvio":"L’Alfa Romeo Stelvio est le premier SUV d’Alfa Romeo, lancé en 2017. Il partage sa plateforme Giorgio avec la berline Giulia, d’où un comportement routier très apprécié ; la version Quadrifoglio développe 510 ch.",
 "ds/ds-7-crossback":"Le DS 7 Crossback est le SUV familial de la marque DS, lancé en 2018 et rebaptisé DS 7 en 2022. Il existe en essence, en diesel et en hybride rechargeable E-Tense, dont des versions 4x4.",
 "ford/fiesta":"La Ford Fiesta a été l’une des citadines les plus vendues d’Europe, produite jusqu’en 2023. La dernière génération (2017-2023) roule surtout en essence EcoBoost, avec une version sportive ST.",
 "mini/one":"La Mini One est la version d’entrée de gamme de la Mini : même carrosserie que la Cooper, avec le moteur essence le moins puissant et un équipement plus simple, donc un prix d’achat plus doux.",
 "mercedes/marco-polo":"Le Mercedes Marco Polo est un van aménagé dérivé du Classe V : toit relevable, coin cuisine et banquette qui se transforme en lit. Il permet de voyager à quatre tout en restant utilisable au quotidien.",
 "porsche/911":"La Porsche 911 est la sportive emblématique de Porsche depuis 1964, avec son moteur six cylindres à plat à l’arrière. Les générations récentes sont la 991 (2011-2019) et la 992 (depuis 2019), en Carrera, Targa, Turbo ou GT3.",
 "renault/captur":"Le Renault Captur est le SUV urbain de Renault. La 2e génération, lancée en 2019, existe en essence, en diesel, en hybride E-Tech et en hybride rechargeable ; la première (2013-2019) reste une occasion répandue.",
 "renault/megane":"La Renault Mégane est la compacte de Renault. La 4e génération (à partir de 2016) existe en berline, en break Estate et en version sportive R.S. ; la Mégane E-Tech électrique a pris le relais à partir de 2022.",
 "audi/rs6-avant":"L’Audi RS6 Avant est le break sportif d’Audi Sport. La génération lancée en 2019 reçoit un V8 4.0 TFSI biturbo d’environ 600 ch et la transmission intégrale quattro.",
 "bmw/serie-6":"La BMW Série 6 est la grande GT de BMW. La 3e génération (2011-2018) a existé en Coupé, en Cabriolet et en Gran Coupé quatre portes, avec la M6 en version sportive.",
 "audi/sq2":"L’Audi SQ2 est la version sportive du petit SUV Q2, lancée en 2018 : moteur 2.0 TFSI d’environ 300 ch et transmission intégrale quattro.",
 "mercedes/classe-v":"Le Mercedes Classe V est le grand monospace haut de gamme de Mercedes (depuis 2014), jusqu’à 8 places, en trois longueurs (compact, long et extra-long). Il existe aussi en électrique (EQV).",
 "citroen/spacetourer":"Le Citroën SpaceTourer est un grand monospace lancé en 2016, jusqu’à 9 places, cousin du Peugeot Traveller et du Toyota Proace Verso. Il existe aussi en électrique (ë-SpaceTourer).",
 "audi/a5":"L’Audi A5 est la famille coupé d’Audi, dérivée de l’A4 : Coupé, Cabriolet et Sportback cinq portes. La 2e génération a été vendue de 2016 à 2024, avec les sportives S5 et RS5.",
 "volkswagen/passat":"La Volkswagen Passat est la grande familiale de Volkswagen. La 8e génération (2014-2023) existait en berline et en break SW, dont une hybride rechargeable GTE ; la Passat actuelle n’existe plus qu’en break.",
 "hyundai/i10":"La Hyundai i10 est une petite citadine cinq portes, économique et facile à garer. La 3e génération, lancée en 2019, roule en essence (1.0 et 1.2).",
 "ford/transit-custom":"Le Ford Transit Custom est le fourgon utilitaire moyen de Ford, lancé en 2012, décliné en minibus sous le nom Tourneo Custom. La génération lancée en 2023 existe aussi en électrique (E-Transit Custom).",
 "opel/grandland":"L’Opel Grandland (Grandland X jusqu’en 2021) est le SUV compact d’Opel, lancé en 2017 et cousin du Peugeot 3008. Il existe aussi en hybride rechargeable ; une nouvelle génération est arrivée en 2024.",
 "dacia/duster":"Le Dacia Duster est le SUV de Dacia, réputé pour son rapport prix / équipement et ses versions 4x4. La 2e génération a été vendue de 2017 à 2023, la 3e (2024) existe aussi en hybride.",
 "jeep/renegade":"Le Jeep Renegade est le petit SUV de Jeep, lancé en 2014. Il existe en versions 4x4, dont la Trailhawk orientée tout-terrain, et en hybride rechargeable 4xe.",
 "mini/countryman":"La Mini Countryman est le plus grand modèle Mini, un SUV cinq portes. Elle existe en 4x4 (ALL4) et en hybride rechargeable ; la génération 2024 existe aussi en électrique.",
 "mercedes/classe-a":"La Mercedes Classe A est la compacte d’entrée de gamme de Mercedes. La 4e génération (2018) existe en cinq portes et en berline, avec les sportives AMG A 35 et A 45.",
 "ford/b-max":"Le Ford B-Max est un monospace citadin vendu de 2012 à 2017, dérivé de la Fiesta. Son originalité : des portes arrière coulissantes et l’absence de montant central, pour un accès très large à bord, pratique en famille.",
}
def google_seen():
    """19/11/2026 : pages que Google montre déjà (data/google-seen-pages.txt) → indexées dès 1 annonce."""
    try:
        with open(os.path.join(BASE,"data","google-seen-pages.txt"),encoding="utf-8") as f:
            return {l.strip().strip("/") for l in f if l.strip() and not l.startswith("#")}
    except OSError: return set()
def stats_html(items):
    """Repères chiffrés tirés des annonces en ligne (années, kilométrages, énergies)."""
    ys=sorted({int(x["vehicle_year"]) for x in items if str(x.get("vehicle_year") or "").isdigit() and 1950<int(x["vehicle_year"])<2100})
    km=[]
    for x in items:
        try:
            v=int(float(x.get("mileage")))
            if v>0: km.append(v)
        except: pass
    fu=sorted({str(x.get("fuel")).strip().capitalize() for x in items if x.get("fuel")})
    parts=[]
    if ys: parts.append(f"année {ys[0]}" if len(ys)==1 else f"années {ys[0]} à {ys[-1]}")
    if km: parts.append((f"{min(km):,} km" if len(km)==1 else f"de {min(km):,} à {max(km):,} km").replace(","," "))
    if fu: parts.append(", ".join(fu).lower())
    return f"<p>Dans les annonces en ligne : {esc(' · '.join(parts))}.</p>" if parts else ""

def card(l):
    return f'<li><a href="/annonce/{esc(l["id"])}/"><strong>{esc(l.get("title") or "Annonce automobile")}</strong><span>{esc(money(l.get("price")))}</span><small>{esc(l.get("city"))}</small></a></li>'

def page(title,h1,desc,url,items,related,robots="index,follow",canonical=None,extra=""):
    schema={"@context":"https://schema.org","@type":"ItemList","numberOfItems":len(items),"itemListElement":[{"@type":"ListItem","position":i+1,"url":f'{SITE}/annonce/{x["id"]}/'} for i,x in enumerate(items[:120])]}
    crumbs={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Accueil","item":SITE+"/"},{"@type":"ListItem","position":2,"name":"Auto","item":SITE+"/auto/"},{"@type":"ListItem","position":3,"name":h1,"item":url}]}
    rel=''.join(f'<li><a href="{esc(u)}">{esc(n)}</a></li>' for n,u in related[:40])
    listings=''.join(card(x) for x in items[:120])
    # 14/11/2026 (SEO auto) : meta description ≤ 155 caractères (le texte complet reste en intro) + balises Open Graph
    md=desc if len(desc)<=155 else desc[:154].rsplit(" ",1)[0].rstrip(" ,;:.–-")+"…"
    og=(f'<meta property="og:type" content="website"><meta property="og:site_name" content="Abracadeal">'
        f'<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(md)}">'
        f'<meta property="og:url" content="{esc(url)}"><meta property="og:image" content="{SITE}/icon-512.png">')
    head_extra=og+FONTS+'<style>'+SITE_CSS+'.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;padding:0;list-style:none}.grid li a{display:grid;gap:4px;background:#fff;border:1px solid #ebe4ef;padding:14px 16px;border-radius:16px;box-shadow:0 7px 20px rgba(35,17,48,.055);text-decoration:none;color:#26122f}.grid span{font-weight:800;color:#8b2aa6}.grid small{color:#756a7e}nav.top{font-size:.85rem;color:#756a7e;margin:4px 0 12px}nav.top a{color:#756a7e}</style>'+HUMAN_LINKS
    return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(md)}"><meta name="robots" content="{robots}"><link rel="canonical" href="{esc(canonical or url)}"><script type="application/ld+json">{json.dumps(crumbs,ensure_ascii=False)}</script><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script>{head_extra}</head><body>{HEADER}<main><nav class="top"><a href="/">Accueil</a> › <a href="/auto/">Auto</a> › {esc(h1)}</nav><h1>{esc(h1)}</h1><p class="intro">{esc(desc)}</p><p><strong>{len(items)} annonce{'s' if len(items)>1 else ''} en ligne.</strong></p><ul class="grid">{listings}</ul>{extra}{f'<h2>Explorer aussi</h2><ul class="links">{rel}</ul>' if rel else ''}</main><footer><a href="/">Abracadeal</a> — petites annonces en France · Site réalisé par <a href="https://mycreativesite.fr/">MyCreativeSite</a></footer></body></html>'''

def write(path,content):
    os.makedirs(os.path.dirname(path),exist_ok=True)
    old=open(path,encoding="utf-8").read() if os.path.exists(path) else None
    if old!=content:
        with open(path,"w",encoding="utf-8") as f:f.write(content)
        return True
    return False


def old_lastmods(path):
    """14/11/2026 (SEO auto) : <lastmod> des pages catégories / Auto / pros = date du dernier vrai changement de la page
    (gardée d'un passage à l'autre tant que la page ne change pas)."""
    try:
        txt = open(path, encoding="utf-8").read()
    except OSError:
        return {}
    return dict(re.findall(r"<loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>", txt))

def lastmod_tag(loc, changed, old):
    d = old.get(loc) if not changed else None
    return f"<lastmod>{d or datetime.date.today().isoformat()}</lastmod>"

# 15/11/2026 (audit SEO, accord d'Anthony) : vrais noms de marques dans les titres (« BMW » et non « Bmw »), motos annoncées
# comme motos (et non « annonces auto ») ; pages de moins de MIN_INDEX annonces en noindex et hors sitemap ;
# modèle identique à sa marque (un seul modèle) ou budget identique au budget supérieur : la page la plus large reste, l'autre pointe vers elle.
NICE_MAKES={"bmw":"BMW","bmw motorrad":"BMW Motorrad","citroen":"Citroën","ds":"DS","harley davidson":"Harley-Davidson",
            "mg motor":"MG Motor","mg":"MG","ktm":"KTM","vw":"Volkswagen","land rover":"Land Rover","alfa romeo":"Alfa Romeo"}
MOTO_MAKES={"bmw motorrad","ducati","harley davidson","harley-davidson","kawasaki","keeway","ktm","triumph","royal enfield","piaggio","kymco","sym","aprilia","moto guzzi","mv agusta","indian","yamaha"}
MIXED_MAKES={"honda","suzuki"}
MIN_INDEX=3

def nice_make(mk):
    k=re.sub(r"\s+"," ",str(mk or "").strip()).lower()
    return NICE_MAKES.get(k) or str(mk or "").strip()

def full_name(mk,md):
    """21/11/2026 : « DS » + « Ds 7 Crossback » → « DS 7 Crossback » (pas « DS Ds 7 Crossback »). Affichage seulement, l'URL ne change pas."""
    w=str(md or "").split()
    if w and w[0].lower()==str(mk).lower(): return " ".join([mk]+w[1:])
    return f"{mk} {md}"

def make_kind(mk):
    k=str(mk or "").strip().lower()
    return "annonces moto" if k in MOTO_MAKES else ("annonces auto et moto" if k in MIXED_MAKES else "annonces auto")

def main():
    rows=[x for x in fetch_listings() if x.get("vehicle_make")]
    makes={}
    for l in rows:
        mk=nice_make(l.get("vehicle_make")); md=(l.get("vehicle_model") or "").strip()
        makes.setdefault(mk,{}).setdefault(md,[]).append(l)
    pages={}; specs={}; EXTRA={}; SEEN=google_seen()
    # 21/11/2026 : lien vers le guide d'achat depuis l'accueil Auto
    EXTRA[""]=('<h2>Conseils</h2><p><a href="/conseils/acheter-voiture-occasion.html">Acheter une voiture d’occasion : les 10 points à vérifier</a></p>',False)
    make_links=[(m,f"/auto/{slug(m)}/") for m in sorted(makes)]
    root_desc="Voitures d’occasion publiées sur Abracadeal : parcourez les annonces par marque, modèle, énergie et budget, auprès de particuliers et de professionnels."
    specs[""]=("root",rows,"Voitures d'occasion par marque, modèle et budget | Abracadeal","Voitures d’occasion",root_desc,SITE+"/auto/",rows,make_links+[(v,f"/auto/{slug(k)}/") for k,v in FUELS.items() if k==slug(k)])
    for mk,models in makes.items():
        its=[x for arr in models.values() for x in arr]; ms=slug(mk)
        model_links=[(full_name(mk,md),f"/auto/{ms}/{slug(md)}/") for md in sorted(models) if md]
        n,lo,rng,cts=offer(its); pl='s' if n>1 else ''
        desc=(f"{n} {mk} d’occasion en ligne sur Abracadeal{', '+rng if rng else ''}{' — '+', '.join(cts) if cts else ''}. "
              f"Annonces de particuliers et de professionnels, sans commission : comparez modèles, prix et kilométrages.")
        specs[ms]=("make",its,(f"{mk} d'occasion dès {lo} : {n} annonce{pl} | Abracadeal" if lo else f"{mk} d'occasion : {make_kind(mk)} | Abracadeal"),f"{mk} d’occasion",desc,SITE+f"/auto/{ms}/",its,model_links+make_links)
        for md,sub in models.items():
            if not md: continue
            p=f"{ms}/{slug(md)}"; n,lo,rng,cts=offer(sub); pl='s' if n>1 else ''; fn=full_name(mk,md)
            desc=(f"{n} {fn} d’occasion en ligne{', '+rng if rng else ''}{' — '+', '.join(cts) if cts else ''}. "
                  f"Annonces de particuliers et de professionnels sur Abracadeal : prix, année, kilométrage et ville sur chaque annonce.")
            guide=MODEL_GUIDES.get(p,"")
            others=[x for k2,arr in models.items() if k2!=md for x in arr][:8] if len(sub)<6 else []
            extra=(f"<h2>{esc(fn)} : à savoir</h2><p>{esc(guide)}</p>" if guide else "")+stats_html(sub)+\
                  (f'<h2>Autres {esc(mk)} d’occasion</h2><ul class="grid">'+''.join(card(x) for x in others)+'</ul>' if others else "")
            EXTRA[p]=(extra,bool(guide))
            specs[p]=("model",sub,(f"{fn} d'occasion dès {lo} | Abracadeal" if lo else f"{fn} d'occasion | Abracadeal"),f"{fn} d’occasion",desc,SITE+f"/auto/{p}/",sub,[(f"Toutes les {mk}",f"/auto/{ms}/")]+model_links)
    for key,label in FUELS.items():
        if key!=slug(key): continue
        sub=[x for x in rows if slug(x.get("fuel"))==key]
        if sub:
            desc=f"Parcourez les voitures d’occasion {label.lower()} actuellement disponibles sur Abracadeal, avec prix, marque, modèle et localisation."
            specs[key]=("fuel",sub,f"Voitures {label.lower()} d'occasion | Abracadeal",f"Voitures {label.lower()} d’occasion",desc,SITE+f"/auto/{key}/",sub,make_links)
    for ceiling,p in BUDGETS:
        sub=[]
        for x in rows:
            try:
                if float(x.get("price"))<=ceiling: sub.append(x)
            except: pass
        if sub:
            label=f"Voitures d’occasion à moins de {ceiling:,} €".replace(","," ")
            desc=f"Trouvez une voiture d’occasion à moins de {ceiling:,} € sur Abracadeal. Comparez les annonces disponibles par marque, modèle et ville.".replace(","," ")
            specs[p]=("budget",sub,label+" | Abracadeal",label,desc,SITE+f"/auto/{p}/",sub,make_links)
    ids={r:frozenset(str(x["id"]) for x in v[1]) for r,v in specs.items()}
    # Doublons seulement dans la même famille (intentions de recherche différentes sinon) :
    # modèle identique à sa marque → la marque ; budget identique au budget supérieur → le budget supérieur.
    canon={}
    for r,(kind,*_) in specs.items():
        if kind=="model":
            mk=r.split("/")[0]
            if mk in specs and ids[mk]==ids[r]: canon[r]=mk
    budgets=[p for _,p in BUDGETS if p in specs]
    for i,b in enumerate(budgets):
        for hi in reversed(budgets[i+1:]):
            if ids[hi]==ids[b]: canon[b]=hi; break
    indexable={}
    for r,(kind,its,*args) in specs.items():
        robots,can="index,follow",None
        ex,has_guide=EXTRA.get(r,("",False))
        # 19/11/2026 (SEO) : une page modèle avec repères (guide) reste indexée dès 1 annonce (Google la montre déjà : Fabia, B-Max…)
        seen=("auto/"+r) in SEEN
        if kind!="root" and len(its)<MIN_INDEX and not ((has_guide or seen) and its): robots="noindex,follow"
        elif r in canon: can=f'{SITE}/auto/{canon[r]+"/" if canon[r] else ""}'
        indexable[r]=robots=="index,follow" and not can
        pages[r]=page(*args,robots=robots,canonical=can,extra=ex)
    # Liens internes : pas de lien vers une page fusionnée (la page principale est déjà dans la liste)
    for r in list(pages):
        for d in canon:
            pages[r]=re.sub(r'<li><a href="/auto/'+re.escape(d)+r'/">[^<]*</a></li>','',pages[r])
    keep,changed=set(),{}
    old_lm=old_lastmods(SITEMAP)
    for rel,content in pages.items():
        folder=os.path.join(ROOT,*rel.split("/")) if rel else ROOT; keep.add(os.path.normpath(folder)); changed[rel]=write(os.path.join(folder,"index.html"),content)
    if os.path.isdir(ROOT):
        for d,dirs,files in os.walk(ROOT,topdown=False):
            if os.path.normpath(d) not in keep and "index.html" in files: os.remove(os.path.join(d,"index.html"))
            if d!=ROOT and os.path.isdir(d) and not os.listdir(d): os.rmdir(d)
    lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for rel in sorted(pages):
        if not indexable[rel]: continue
        loc=f'{SITE}/auto/{rel+"/" if rel else ""}'
        lines.append(f'  <url><loc>{loc}</loc>{lastmod_tag(loc,changed[rel],old_lm)}</url>')
    lines.append('</urlset>'); write(SITEMAP,"\n".join(lines)+"\n")
    print(f"SEO Auto: {len(rows)} annonces, {len(pages)} pages, {sum(indexable.values())} indexables")
if __name__=="__main__": main()
