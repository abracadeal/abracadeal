"""Pages publiques des professionnels (référencement Google) — 28/10/2026.

Exécuté par GitHub Actions (.github/workflows/share-pages.yml) après build_share_pages.py.
Pour chaque professionnel qui a au moins une annonce en ligne :
  - garage/<slug>/          garages et vendeurs auto / moto (majorité d'annonces Véhicules)
  - immo/<slug>/            agences immobilières (majorité d'annonces Immobilier)
  - professionnel/<slug>/   autres professionnels
Chaque page : nom de l'entreprise, ville, présentation du showroom, tout le stock en ligne (liens vers les pages
annonce/<id>/), données structurées schema.org (AutoDealer / RealEstateAgent + liste des annonces).
Les visiteurs réels sont envoyés sur le showroom du site (pro.html?id=…, avec contact et abonnement) ;
les robots lisent la page statique (même contenu).
Annuaire : garage/, immo/ et professionnel/ listent les pros ; sitemap-pros.xml est référencé par sitemap.xml.
pro-pages.json garde l'adresse de chaque page (stable même si le nom change) ; l'espace Pro l'utilise pour
afficher au pro le lien de sa page.
Un pro sans annonce en ligne : page supprimée (404), son adresse reste réservée dans pro-pages.json.

Aucune coordonnée (téléphone, e-mail) n'est publiée.
Test hors ligne : ABRACA_PRO_FIXTURE=fichier.json python scripts/build_pro_pages.py
  ({"listings": [... avec owner_id], "pros": {"<owner_id>": {"company_name", "company_city", "display_name", "description"}}})
"""
import collections
import datetime
import html
import json
import os
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_share_pages import (FIELDS, SUPABASE_URL, SUPABASE_KEY, SITE, PAGE_FOOT, fetch, slugify, money,
                               photo_urls, listing_card, page_head, ld_script, breadcrumb_ld, crumbs_html,
                               write_if_changed)

BASE = os.environ.get("ABRACA_OUT") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FIXTURE = os.environ.get("ABRACA_PRO_FIXTURE")
REGISTRY = os.path.join(BASE, "pro-pages.json")
SITEMAP = os.path.join(BASE, "sitemap-pros.xml")
KINDS = {
    "garage": {"label": "Garage", "dir_title": "Garages et vendeurs auto / moto",
               "schema": "AutoDealer", "what": ("véhicule d’occasion", "véhicules d’occasion"),
               "intro": "Garages, négociants et concessions qui publient leur stock de véhicules sur Abracadeal."},
    "immo": {"label": "Agence immobilière", "dir_title": "Agences immobilières",
             "schema": "RealEstateAgent", "what": ("bien", "biens"),
             "intro": "Agences et professionnels de l’immobilier qui publient leurs biens à vendre et à louer sur Abracadeal."},
    "professionnel": {"label": "Professionnel", "dir_title": "Professionnels",
                      "schema": "LocalBusiness", "what": ("annonce", "annonces"),
                      "intro": "Professionnels qui publient leurs annonces sur Abracadeal."},
}
SHOWROOM = f"{SUPABASE_URL}/storage/v1/object/public/pro-showroom/"
e = lambda s: html.escape(str(s or ""), quote=True)


def rest(path, params):
    return json.loads(fetch(f"{SUPABASE_URL}/rest/v1/{path}?{urllib.parse.urlencode(params)}", {"apikey": SUPABASE_KEY}))


def rpc(name, body):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/rpc/{name}", data=json.dumps(body).encode(), method="POST",
                                 headers={"User-Agent": "abracadeal-pro-pages", "apikey": SUPABASE_KEY,
                                          "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def load_data():
    if FIXTURE:
        with open(FIXTURE, encoding="utf-8") as f:
            d = json.load(f)
        return d["listings"], d.get("pros", {})
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows, start = [], 0
    while True:
        q = urllib.parse.urlencode({"select": "owner_id," + FIELDS, "status": "eq.active", "visibility_scope": "eq.public",
                                    "seller_type": "eq.professionnel", "revision_of": "is.null",
                                    "or": f"(expires_at.is.null,expires_at.gt.{now})", "order": "created_at.desc"})
        data = json.loads(fetch(f"{SUPABASE_URL}/rest/v1/listings?{q}", {"apikey": SUPABASE_KEY, "Range-Unit": "items",
                                                                          "Range": f"{start}-{start + 999}"}))
        rows += data
        if len(data) < 1000:
            break
        start += 1000
    owners = sorted({r["owner_id"] for r in rows if r.get("owner_id")})
    pros = {}
    for i in range(0, len(owners), 100):
        chunk = owners[i:i + 100]
        ids = "(" + ",".join(chunk) + ")"
        for p in rest("public_profiles", {"select": "id,display_name,city", "id": f"in.{ids}"}):
            pros.setdefault(p["id"], {}).update(display_name=p.get("display_name"), city=p.get("city"))
        for s in rest("pro_showrooms", {"select": "user_id,description,banner_path,logo_path", "user_id": f"in.{ids}"}):
            pros.setdefault(s["user_id"], {}).update(description=s.get("description"), banner_path=s.get("banner_path"),
                                                     logo_path=s.get("logo_path"))
    for oid in owners:
        try:
            v = rpc("get_public_pro_verification", {"p_user_id": oid})
            if v:
                pros.setdefault(oid, {}).update(company_name=v[0].get("company_name"), company_city=v[0].get("company_city"),
                                                verified=bool(v[0].get("verified_at")))
        except Exception as err:  # une fiche sans vérification garde le nom du profil
            print("verification", oid, err)
    return rows, pros


def nice_name(p):
    """Nom affiché : nom du showroom / profil, sinon raison sociale (souvent en majuscules dans le registre)."""
    name = (p.get("display_name") or "").strip() or (p.get("company_name") or "").strip() or "Professionnel"
    if name.isupper() and len(name) > 4:
        name = " ".join(w if len(w) <= 3 and w.isalpha() and w in ("SAS", "SARL", "EURL", "SA", "SNC") else w.capitalize()
                        for w in name.split())
    return name


def city_of(p, listings):
    cities = collections.Counter((l.get("city") or "").strip() for l in listings if (l.get("city") or "").strip())
    if p.get("company_city"):
        return p["company_city"].strip().title() if p["company_city"].isupper() else p["company_city"].strip()
    if cities:
        return cities.most_common(1)[0][0]
    return (p.get("city") or "").strip()


def postal_of(listings):
    c = collections.Counter((l.get("postal_code") or "").strip() for l in listings if (l.get("postal_code") or "").strip())
    return c.most_common(1)[0][0] if c else ""


def kind_of(listings):
    c = collections.Counter(l.get("category") for l in listings)
    top = c.most_common(1)[0][0] if c else ""
    return "garage" if top == "vehicules" else "immo" if top == "immobilier" else "professionnel"


def load_registry():
    try:
        with open(REGISTRY, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def assign_path(registry, oid, kind, name, city):
    old = registry.get(oid)
    if old and old.get("path", "").split("/")[0] == kind:
        return old["path"]
    taken = {v.get("path") for k, v in registry.items() if k != oid}
    base = slugify(f"{name} {city}") or slugify(name) or oid[:8]
    base = base[:70].strip("-")
    path, n = f"{kind}/{base}", 2
    while path in taken:
        path, n = f"{kind}/{base}-{n}", n + 1
    return path


def pro_page(oid, p, kind, path, name, city, postal, items):
    k = KINDS[kind]
    url = f"{SITE}/{path}/"
    n = len(items)
    one, many = k["what"]
    count = f"{n} {one if n == 1 else many}"
    where = f" à {city}" if city else ""
    title = f"{name} – {k['label']}{where} : {count} | Abracadeal"
    desc_txt = (p.get("description") or "").strip()
    if kind == "garage":
        makes = collections.Counter((it["listing"].get("vehicle_make") or "").strip() for it in items if it["listing"].get("vehicle_make"))
        top = ", ".join(m for m, _ in makes.most_common(4))
        meta_desc = f"{name}, garage{where} : {count} en ligne sur Abracadeal" + (f" ({top}…)" if top else "") + ". Photos, prix, kilométrage et année sur chaque annonce."
    elif kind == "immo":
        meta_desc = f"{name}, agence immobilière{where} : {count} à vendre et à louer sur Abracadeal. Photos, prix, surface et DPE sur chaque annonce."
    else:
        meta_desc = f"{name}{where} : {count} en ligne sur Abracadeal."
    logo = SHOWROOM + urllib.parse.quote(p["logo_path"]) if p.get("logo_path") else ""
    banner = SHOWROOM + urllib.parse.quote(p["banner_path"]) if p.get("banner_path") else ""
    first_photo = next((it["photos"][0] for it in items if it["photos"]), "")
    image = banner or logo or first_photo
    crumbs = [("Accueil", SITE + "/"), (k["dir_title"], f"{SITE}/{kind}/"), (name, None)]
    org = {"@context": "https://schema.org", "@type": k["schema"], "name": name, "url": url,
           "address": {"@type": "PostalAddress", "addressCountry": "FR",
                       **({"addressLocality": city} if city else {}), **({"postalCode": postal} if postal else {})}}
    if image:
        org["image"] = image
    if logo:
        org["logo"] = logo
    if desc_txt:
        org["description"] = desc_txt[:500]
    if p.get("company_name") and p["company_name"].strip().lower() != name.lower():
        org["legalName"] = p["company_name"].strip()
    shown = items[:200]
    item_list = {"@context": "https://schema.org", "@type": "ItemList", "numberOfItems": len(shown),
                 "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f'{SITE}/annonce/{it["listing"]["id"]}/'}
                                     for i, it in enumerate(shown)]}
    extra = ld_script(org) + "\n" + ld_script(breadcrumb_ld(crumbs)) + "\n" + ld_script(item_list)
    body = [crumbs_html(crumbs)]
    if banner:
        body.append(f'<img src="{e(banner)}" alt="{e(name)}" style="width:100%;aspect-ratio:3/1;object-fit:cover;border-radius:16px;margin:0 0 12px" loading="lazy">')
    body.append(f'<span class="badge">✓ {e(k["label"])}{" vérifié" if p.get("verified") else ""}</span>')
    body.append(f"<h1>{e(name)}</h1>")
    body.append(f'<p class="where">{e(k["label"])}{e(where)}{" (" + e(postal) + ")" if postal else ""} · {e(count)} en ligne</p>')
    if desc_txt:
        body.append(f'<section class="card"><h2>Présentation</h2><p class="desc">{e(desc_txt[:3000])}</p></section>')
    body.append(f'<a class="cta" href="/pro.html?id={e(oid)}">Voir le showroom et contacter {e(name)}</a>')
    body.append(f"<h2>{'Véhicules' if kind == 'garage' else 'Biens' if kind == 'immo' else 'Annonces'} en ligne</h2>")
    body.append('<ul class="list">' + "".join(listing_card(it) for it in shown) + "</ul>")
    return (page_head(title, meta_desc, url, og_image=image or None, extra=extra, redirect=f"/pro.html?id={oid}")
            + "\n".join(body) + "\n" + PAGE_FOOT)


def directory_page(kind, entries):
    k = KINDS[kind]
    url = f"{SITE}/{kind}/"
    crumbs = [("Accueil", SITE + "/"), (k["dir_title"], None)]
    by_city = collections.defaultdict(list)
    for en in entries:
        by_city[en["city"] or "Autres villes"].append(en)
    body = [crumbs_html(crumbs), f"<h1>{e(k['dir_title'])} sur Abracadeal</h1>", f'<p class="intro">{e(k["intro"])}</p>']
    for city in sorted(by_city, key=lambda c: (c == "Autres villes", c.lower())):
        body.append(f'<section class="card"><h2>{e(city)}</h2><ul class="links">' + "".join(
            f'<li><a href="/{e(en["path"])}/">{e(en["name"])} ({en["count"]})</a></li>' for en in sorted(by_city[city], key=lambda x: x["name"].lower()))
            + "</ul></section>")
    title = f"{k['dir_title']} : stock en ligne | Abracadeal"
    desc = f"{k['intro']} {len(entries)} professionnel{'s' if len(entries) > 1 else ''} référencé{'s' if len(entries) > 1 else ''}."
    return page_head(title, desc, url, extra=ld_script(breadcrumb_ld(crumbs))) + "\n".join(body) + "\n" + PAGE_FOOT


def main():
    rows, pros = load_data()
    by_owner = collections.defaultdict(list)
    for l in rows:
        if l.get("owner_id"):
            by_owner[l["owner_id"]].append(l)
    registry = load_registry()
    pages, entries = {}, collections.defaultdict(list)
    for oid, listings in by_owner.items():
        p = pros.get(oid, {})
        kind = kind_of(listings)
        name = nice_name(p)
        city = city_of(p, listings)
        postal = postal_of(listings)
        path = assign_path(registry, oid, kind, name, city)
        items = [{"listing": l, "photos": photo_urls(l)} for l in listings]
        pages[path] = pro_page(oid, p, kind, path, name, city, postal, items)
        registry[oid] = {"path": path, "name": name, "city": city, "count": len(listings), "active": True}
        entries[kind].append({"path": path, "name": name, "city": city, "count": len(listings)})
    for oid, v in registry.items():
        if oid not in by_owner:
            v["active"] = False
            v["count"] = 0
    keep = set()
    for path, content in pages.items():
        folder = os.path.join(BASE, *path.split("/"))
        keep.add(os.path.normpath(folder))
        write_if_changed(os.path.join(folder, "index.html"), content)
    for kind in KINDS:
        root = os.path.join(BASE, kind)
        if entries[kind]:
            keep.add(os.path.normpath(root))
            write_if_changed(os.path.join(root, "index.html"), directory_page(kind, entries[kind]))
        if os.path.isdir(root):
            for d, _dirs, files in os.walk(root, topdown=False):
                if os.path.normpath(d) not in keep and "index.html" in files:
                    os.remove(os.path.join(d, "index.html"))
                if os.path.isdir(d) and not os.listdir(d):
                    os.rmdir(d)
    write_if_changed(REGISTRY, json.dumps(dict(sorted(registry.items())), ensure_ascii=False, indent=1) + "\n")
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for kind in KINDS:
        if entries[kind]:
            lines.append(f"  <url><loc>{SITE}/{kind}/</loc></url>")
    for path in sorted(pages):
        lines.append(f"  <url><loc>{SITE}/{path}/</loc></url>")
    lines.append("</urlset>")
    write_if_changed(SITEMAP, "\n".join(lines) + "\n")
    print(f"Pages pros : {len(pages)} pages ({', '.join(f'{k} {len(v)}' for k, v in entries.items())})")


if __name__ == "__main__":
    main()
