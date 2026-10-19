"""Génère les hubs SEO Auto à partir des annonces publiques actives.
Phase 1 : marques, marque+modèle, énergie et budgets. Aucun contenu inventé.
"""
import datetime, html, json, os, re, shutil, unicodedata, urllib.parse, urllib.request

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
    fields="id,title,price,city,vehicle_make,vehicle_model,fuel,created_at,updated_at,description"
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

def esc(s): return html.escape(str(s or ""),quote=True)

def card(l):
    return f'<li><a href="/annonce/{esc(l["id"])}/"><strong>{esc(l.get("title") or "Annonce automobile")}</strong><span>{esc(money(l.get("price")))}</span><small>{esc(l.get("city"))}</small></a></li>'

def page(title,h1,desc,url,items,related):
    schema={"@context":"https://schema.org","@type":"ItemList","numberOfItems":len(items),"itemListElement":[{"@type":"ListItem","position":i+1,"url":f'{SITE}/annonce/{x["id"]}/'} for i,x in enumerate(items[:120])]}
    crumbs={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Accueil","item":SITE+"/"},{"@type":"ListItem","position":2,"name":"Auto","item":SITE+"/auto/"},{"@type":"ListItem","position":3,"name":h1,"item":url}]}
    rel=''.join(f'<li><a href="{esc(u)}">{esc(n)}</a></li>' for n,u in related[:40])
    listings=''.join(card(x) for x in items[:120])
    return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(desc)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{esc(url)}"><script type="application/ld+json">{json.dumps(crumbs,ensure_ascii=False)}</script><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script><style>body{{font-family:system-ui;margin:0;background:#f7f5fa;color:#21162c}}main{{max-width:1100px;margin:auto;padding:24px}}a{{color:#5b247a;text-decoration:none}}.top{{font-size:14px;margin-bottom:20px}}h1{{font-size:clamp(28px,5vw,44px);margin:.3em 0}}.intro{{font-size:18px;line-height:1.6;max-width:850px}}.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;padding:0;list-style:none}}.grid li a{{display:grid;gap:6px;background:white;padding:16px;border-radius:14px;box-shadow:0 2px 12px #0001}}.grid span{{font-weight:800}}.grid small{{color:#666}}.links{{display:flex;flex-wrap:wrap;gap:10px;padding:0;list-style:none}}.links a{{display:block;background:white;padding:9px 12px;border-radius:999px}}footer{{padding:30px;text-align:center;color:#666}}</style></head><body><main><nav class="top"><a href="/">Accueil</a> › <a href="/auto/">Auto</a> › {esc(h1)}</nav><h1>{esc(h1)}</h1><p class="intro">{esc(desc)}</p><p><strong>{len(items)} annonce{'s' if len(items)>1 else ''} en ligne.</strong></p><ul class="grid">{listings}</ul>{f'<h2>Explorer aussi</h2><ul class="links">{rel}</ul>' if rel else ''}</main><footer><a href="/">Abracadeal</a> — petites annonces en France</footer></body></html>'''

def write(path,content):
    os.makedirs(os.path.dirname(path),exist_ok=True)
    old=open(path,encoding="utf-8").read() if os.path.exists(path) else None
    if old!=content:
        with open(path,"w",encoding="utf-8") as f:f.write(content)

def main():
    rows=[x for x in fetch_listings() if x.get("vehicle_make")]
    makes={}
    for l in rows:
        mk=(l.get("vehicle_make") or "").strip(); md=(l.get("vehicle_model") or "").strip()
        makes.setdefault(mk,{}).setdefault(md,[]).append(l)
    pages={}
    make_links=[(m,f"/auto/{slug(m)}/") for m in sorted(makes)]
    root_desc="Voitures d’occasion publiées sur Abracadeal : parcourez les annonces par marque, modèle, énergie et budget, auprès de particuliers et de professionnels."
    pages[""]=page("Voitures d'occasion par marque, modèle et budget | Abracadeal","Voitures d’occasion",root_desc,SITE+"/auto/",rows,make_links+[(v,f"/auto/{slug(k)}/") for k,v in FUELS.items() if k==slug(k)])
    for mk,models in makes.items():
        its=[x for arr in models.values() for x in arr]; ms=slug(mk)
        model_links=[(f"{mk} {md}",f"/auto/{ms}/{slug(md)}/") for md in sorted(models) if md]
        desc=f"Découvrez les {mk} d’occasion actuellement en ligne sur Abracadeal. Comparez les modèles, prix, kilométrages et localisations des annonces disponibles."
        pages[ms]=page(f"{mk} d'occasion : annonces auto | Abracadeal",f"{mk} d’occasion",desc,SITE+f"/auto/{ms}/",its,model_links+make_links)
        for md,sub in models.items():
            if not md: continue
            p=f"{ms}/{slug(md)}"; desc=f"Retrouvez les {mk} {md} d’occasion disponibles sur Abracadeal, publiées par des particuliers et des professionnels. Consultez prix, année, kilométrage et ville sur chaque annonce."
            pages[p]=page(f"{mk} {md} d'occasion | Abracadeal",f"{mk} {md} d’occasion",desc,SITE+f"/auto/{p}/",sub,[(f"Toutes les {mk}",f"/auto/{ms}/")]+model_links)
    for key,label in FUELS.items():
        if key!=slug(key): continue
        sub=[x for x in rows if slug(x.get("fuel"))==key]
        if sub:
            desc=f"Parcourez les voitures d’occasion {label.lower()} actuellement disponibles sur Abracadeal, avec prix, marque, modèle et localisation."
            pages[key]=page(f"Voitures {label.lower()} d'occasion | Abracadeal",f"Voitures {label.lower()} d’occasion",desc,SITE+f"/auto/{key}/",sub,make_links)
    for ceiling,p in BUDGETS:
        sub=[]
        for x in rows:
            try:
                if float(x.get("price"))<=ceiling: sub.append(x)
            except: pass
        if sub:
            label=f"Voitures d’occasion à moins de {ceiling:,} €".replace(","," ")
            desc=f"Trouvez une voiture d’occasion à moins de {ceiling:,} € sur Abracadeal. Comparez les annonces disponibles par marque, modèle et ville.".replace(","," ")
            pages[p]=page(label+" | Abracadeal",label,desc,SITE+f"/auto/{p}/",sub,make_links)
    keep=set()
    for rel,content in pages.items():
        folder=os.path.join(ROOT,*rel.split("/")) if rel else ROOT; keep.add(os.path.normpath(folder)); write(os.path.join(folder,"index.html"),content)
    if os.path.isdir(ROOT):
        for d,dirs,files in os.walk(ROOT,topdown=False):
            if os.path.normpath(d) not in keep and "index.html" in files: os.remove(os.path.join(d,"index.html"))
            if d!=ROOT and os.path.isdir(d) and not os.listdir(d): os.rmdir(d)
    lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for rel in sorted(pages): lines.append(f'  <url><loc>{SITE}/auto/{rel+"/" if rel else ""}</loc></url>')
    lines.append('</urlset>'); write(SITEMAP,"\n".join(lines)+"\n")
    print(f"SEO Auto: {len(rows)} annonces, {len(pages)} pages")
if __name__=="__main__": main()
