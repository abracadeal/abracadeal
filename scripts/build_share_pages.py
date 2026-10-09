"""Pages publiques des annonces : référencement Google + aperçu de partage (WhatsApp / Facebook / SMS).

Exécuté par GitHub Actions (.github/workflows/share-pages.yml) toutes les 10 minutes environ.
Pour chaque annonce active et publique :
  - annonce/<id>/index.html : vraie page lisible par Google (titre, prix, ville, photos, description,
    caractéristiques, données structurées schema.org), indexable, avec un bouton vers la fiche complète
    https://abracadeal.fr/?annonce=<id> (contact, favoris, messagerie) ;
  - annonce/<id>/apercu.jpg : photo principale en JPEG (format lu par WhatsApp pour l'aperçu).
Génère aussi sitemap-annonces.xml (liste des annonces en ligne, soumise à Google via sitemap.xml).
Les dossiers des annonces qui ne sont plus en ligne sont supprimés (la page renvoie alors 404).

Aucune donnée de contact (téléphone, e-mail) n'est publiée : elles restent réservées aux membres connectés.
"""
import datetime
import hashlib
import html
import io
import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request

from PIL import Image

SUPABASE_URL = "https://jplzvxmpbpjssyinozap.supabase.co"
SUPABASE_KEY = "sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF"  # clé publique du site
SITE = "https://abracadeal.fr"
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ROOT = os.path.join(BASE, "annonce")
SITEMAP = os.path.join(BASE, "sitemap-annonces.xml")
DEFAULT_PHOTO = SITE + "/assets/default-listing-photo-20260921.jpg"
CATEGORIES = {"vehicules": "Véhicules", "immobilier": "Immobilier", "vacances": "Locations de vacances",
              "hightech": "High-tech", "maison": "Maison", "mode": "Mode", "emploi": "Emploi",
              "services": "Services", "autres": "Autres"}
MAX_IMAGE_BYTES = 280 * 1024  # WhatsApp n'affiche plus l'aperçu au-delà d'environ 300 Ko
MAX_PHOTOS = 8
VERSION = "2"  # à incrémenter pour forcer la régénération de toutes les pages
FIELDS = ("id,title,description,price,city,postal_code,category,seller_type,item_condition,"
          "vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,crit_air,"
          "created_at,updated_at,listing_photos(storage_path,position)")
MARKER = re.compile(r"^\[ABRACA_([A-Z_]+):([^\]]*)\]\s*", re.M)


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "abracadeal-share-pages", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def active_listings():
    rows, start, page = [], 0, 1000
    while True:
        q = urllib.parse.urlencode({"select": FIELDS, "status": "eq.active", "visibility_scope": "eq.public",
                                    "revision_of": "is.null", "order": "created_at.desc"})
        data = json.loads(fetch(f"{SUPABASE_URL}/rest/v1/listings?{q}", {
            "apikey": SUPABASE_KEY, "Range-Unit": "items", "Range": f"{start}-{start + page - 1}"}))
        rows += data
        if len(data) < page:
            return rows
        start += page


def money(v):
    if v is None or v == "":
        return ""
    n = float(v)
    s = f"{n:,.2f}".rstrip("0").rstrip(".") if n % 1 else f"{int(n):,}"
    return s.replace(",", " ").replace(".", ",") + " €"


def number(v):
    try:
        return f"{int(float(v)):,}".replace(",", " ")
    except (TypeError, ValueError):
        return ""


def parse_description(raw):
    """Sépare le texte libre des marqueurs internes ([ABRACA_SUB:...], [ABRACA_VMETA:...], ...)."""
    meta = {"sub": "", "equip": "", "vmeta": {}, "imeta": {}}
    for kind, value in MARKER.findall(raw or ""):
        if kind == "SUB":
            meta["sub"] = value
        elif kind == "EQUIP":
            meta["equip"] = value
        elif kind in ("VMETA", "IMETA"):
            try:
                meta[kind.lower()] = json.loads(urllib.parse.unquote(value))
            except Exception:
                pass
    text = MARKER.sub("", raw or "").strip()
    return text, meta


def photo_urls(listing):
    photos = sorted(listing.get("listing_photos") or [], key=lambda p: p.get("position") or 0)
    out = []
    for p in photos[:MAX_PHOTOS]:
        path = p.get("storage_path") or ""
        if not path:
            continue
        out.append(path if path.startswith("http") else
                   f"{SUPABASE_URL}/storage/v1/object/public/listing-images/{urllib.parse.quote(path)}")
    return out


def to_jpeg(raw):
    img = Image.open(io.BytesIO(raw))
    img = img.convert("RGB")
    img.thumbnail((1200, 1200))
    for quality in (82, 74, 66, 58, 50):
        out = io.BytesIO()
        img.save(out, "JPEG", quality=quality, optimize=True, progressive=True)
        if out.tell() <= MAX_IMAGE_BYTES:
            break
    return out.getvalue(), img.size


def label(s):
    s = str(s or "").replace("-", " ").replace("_", " ").strip()
    return s[:1].upper() + s[1:]


def specs_of(listing, meta):
    """Caractéristiques affichées (et lues par Google) : (libellé, valeur)."""
    vm, im = meta["vmeta"] or {}, meta["imeta"] or {}
    rows = []
    add = lambda k, v: rows.append((k, str(v))) if v not in (None, "", []) else None
    if listing.get("category") == "vehicules":
        add("Marque", listing.get("vehicle_make"))
        add("Modèle", listing.get("vehicle_model"))
        add("Version", vm.get("version"))
        add("Finition", vm.get("finish"))
        add("Année", listing.get("vehicle_year"))
        add("Mise en circulation", vm.get("firstRegistration"))
        km = number(listing.get("mileage"))
        add("Kilométrage", f"{km} km" if km else "")
        add("Énergie", listing.get("fuel"))
        add("Boîte de vitesses", listing.get("transmission"))
        add("Carrosserie", vm.get("body"))
        add("Puissance", f"{vm['dinPower']} ch" if vm.get("dinPower") else "")
        add("Puissance fiscale", f"{vm['fiscalPower']} CV" if vm.get("fiscalPower") else "")
        add("Couleur", vm.get("color"))
        add("Portes", vm.get("doors"))
        add("Places", vm.get("seats"))
        add("Crit'Air", listing.get("crit_air"))
        add("Équipement", meta["equip"])
    if listing.get("category") == "immobilier":
        add("Transaction", label(im.get("transaction")))
        add("Type de bien", label(im.get("propertyType")))
        add("Surface", f"{im['surface']} m²" if im.get("surface") else "")
        add("Terrain", f"{im['landSurface']} m²" if im.get("landSurface") else "")
        r = im.get("rooms")
        add("Pièces", f"{r} pièce{'s' if str(r) not in ('1', '1.0') else ''}" if r not in (None, "") else "")
        add("Chambres", im.get("bedrooms"))
        add("Salles de bain", im.get("bathrooms"))
        add("Étage", im.get("floor"))
        add("Meublé", im.get("furnished"))
        add("Année de construction", im.get("yearBuilt"))
        add("Chauffage", im.get("heating"))
        add("DPE", im.get("dpe"))
        add("GES", im.get("ges"))
        feats = im.get("features")
        add("Atouts", ", ".join(feats) if isinstance(feats, list) else feats)
    add("État", listing.get("item_condition"))
    if meta["sub"] and listing.get("category") not in ("immobilier",):
        add("Rubrique", label(meta["sub"]))
    return rows


def seo_title(listing, meta):
    """Titre Google : titre du vendeur + infos clés absentes du titre (marque, modèle, version, année, km)."""
    title = (listing.get("title") or "Annonce").strip()
    low = title.lower()
    extra = []
    vm = meta["vmeta"] or {}
    for v in (listing.get("vehicle_make"), listing.get("vehicle_model"), vm.get("version")):
        if v and str(v).lower() not in low and len(title) + len(" ".join(extra)) + len(str(v)) < 55:
            extra.append(str(v))
            low += " " + str(v).lower()
    if listing.get("vehicle_year") and str(listing["vehicle_year"]) not in low:
        extra.append(str(listing["vehicle_year"]))
    im = meta["imeta"] or {}
    if listing.get("category") == "immobilier" and im.get("surface") and "m²" not in low and "m2" not in low:
        extra.append(f"{im['surface']} m²")
    head = " ".join([title] + extra)
    price = money(listing.get("price"))
    if price and listing.get("category") == "vacances":
        price += " / nuit"
    city = listing.get("city") or ""
    dep = (listing.get("postal_code") or "")[:2]
    where = f"{city} ({dep})" if city and dep else city
    parts = [head]
    if price:
        parts.append(price)
    if where:
        parts.append(where)
    return " – ".join(parts)


def json_ld(listing, meta, photos, page_url, desc):
    price = listing.get("price")
    offer = {"@type": "Offer", "url": page_url, "priceCurrency": "EUR",
             "availability": "https://schema.org/InStock",
             "seller": {"@type": "Organization" if listing.get("seller_type") == "professionnel" else "Person",
                        "name": "Vendeur professionnel" if listing.get("seller_type") == "professionnel" else "Particulier"}}
    if price not in (None, ""):
        offer["price"] = f"{float(price):.2f}"
    cond = (listing.get("item_condition") or "").lower()
    offer["itemCondition"] = "https://schema.org/NewCondition" if cond.startswith("neuf") else "https://schema.org/UsedCondition"
    if listing.get("city"):
        offer["areaServed"] = {"@type": "City", "name": listing["city"]}
    data = {"@context": "https://schema.org", "@type": "Product", "name": (listing.get("title") or "Annonce").strip(),
            "description": desc[:5000], "url": page_url, "sku": listing["id"], "offers": offer}
    if photos:
        data["image"] = photos
    if listing.get("category") == "vehicules" and (listing.get("vehicle_make") or listing.get("mileage")):
        data["@type"] = ["Product", "Car"]
        if listing.get("vehicle_make"):
            data["brand"] = {"@type": "Brand", "name": listing["vehicle_make"]}
        if listing.get("vehicle_model"):
            data["model"] = listing["vehicle_model"]
        if listing.get("vehicle_year"):
            data["vehicleModelDate"] = str(listing["vehicle_year"])
        if listing.get("mileage") not in (None, ""):
            data["mileageFromOdometer"] = {"@type": "QuantitativeValue", "value": int(float(listing["mileage"])), "unitCode": "KMT"}
        if listing.get("fuel"):
            data["fuelType"] = listing["fuel"]
        if listing.get("transmission"):
            data["vehicleTransmission"] = listing["transmission"]
    crumbs = [("Accueil", SITE + "/"),
              (CATEGORIES.get(listing.get("category"), "Annonces"), None),
              ((listing.get("title") or "Annonce").strip(), page_url)]
    crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList",
             "itemListElement": [dict({"@type": "ListItem", "position": i + 1, "name": n}, **({"item": u} if u else {})) for i, (n, u) in enumerate(crumbs)]}
    dump = lambda d: json.dumps(d, ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/ld+json">{dump(data)}</script>\n<script type="application/ld+json">{dump(crumb)}</script>'


CSS = """*{box-sizing:border-box}body{margin:0;background:#f7f3fa;color:#21132d;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55}
a{color:#6f218c}header{background:#24102f;padding:12px 16px}header a{color:#fff;text-decoration:none;font-weight:800;font-size:1.15rem;display:inline-flex;align-items:center;gap:8px}
header img{width:30px;height:30px;border-radius:8px}main{max-width:900px;margin:0 auto;padding:16px}
nav.crumbs{font-size:.85rem;color:#6b5a78;margin:4px 0 12px}nav.crumbs a{color:#6b5a78}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:16px}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#e9dff0}
.gallery img:first-child{grid-column:1/-1;aspect-ratio:16/10}
h1{font-size:1.5rem;line-height:1.25;margin:0 0 6px}.price{font-size:1.6rem;font-weight:850;color:#6f218c;margin:0}
.where{color:#4a3a57;margin:4px 0 14px}.card{background:#fff;border-radius:16px;padding:16px;margin:14px 0;box-shadow:0 2px 10px rgba(36,16,47,.06)}
.cta{display:block;text-align:center;background:#6f218c;color:#fff;font-weight:800;padding:14px;border-radius:12px;text-decoration:none;margin:14px 0}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 4px;border-bottom:1px solid #efe6f4;vertical-align:top}th{color:#6b5a78;font-weight:600;width:45%}
.desc{white-space:pre-line;overflow-wrap:anywhere}h2{font-size:1.1rem;margin:0 0 8px}footer{text-align:center;font-size:.8rem;color:#6b5a78;padding:24px 16px}
.badge{display:inline-block;background:#f1e7f5;color:#6f218c;font-weight:700;font-size:.78rem;padding:3px 9px;border-radius:999px;margin-bottom:8px}"""


def page_html(listing, size):
    lid = listing["id"]
    e = lambda s: html.escape(str(s), quote=True)
    text, meta = parse_description(listing.get("description"))
    title = (listing.get("title") or "Annonce").strip()
    price = money(listing.get("price"))
    if price and listing.get("category") == "vacances":
        price += " / nuit"
    place = listing.get("city") or ""
    if place and listing.get("postal_code"):
        place += f" ({listing['postal_code']})"
    cat = CATEGORIES.get(listing.get("category"), "Annonces")
    page_url = f"{SITE}/annonce/{lid}/"
    app_url = f"{SITE}/?annonce={urllib.parse.quote(lid)}"
    head_title = seo_title(listing, meta)
    specs = specs_of(listing, meta)
    key = {"Année", "Kilométrage", "Énergie", "Boîte de vitesses", "Surface", "Pièces", "Type de bien", "Transaction", "État"}
    spec_txt = ", ".join(v for k, v in specs if k in key)
    desc_src = " ".join(text.split())
    meta_desc = " · ".join(x for x in (title, price, place, spec_txt, desc_src) if x)
    meta_desc = (meta_desc[:155].rsplit(" ", 1)[0] + "…") if len(meta_desc) > 158 else meta_desc
    photos = photo_urls(listing)
    og_title = f"{title} - {price}" if price else title
    og_desc = " · ".join(x for x in (place, cat, "Abracadeal") if x)
    image = f"{page_url}apercu.jpg"
    seller = "Professionnel" if listing.get("seller_type") == "professionnel" else "Particulier"
    lazy = ' loading="lazy"'
    gallery = "".join(f'<img src="{e(u)}" alt="{e(title)} – photo {i + 1}"{lazy if i else ""} width="800" height="600">'
                      for i, u in enumerate(photos))
    rows = "".join(f"<tr><th>{e(k)}</th><td>{e(v)}</td></tr>" for k, v in specs)
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow,max-image-preview:large">
<title>{e(head_title)} | Abracadeal</title>
<meta name="description" content="{e(meta_desc)}">
<link rel="canonical" href="{e(page_url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Abracadeal">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{e(og_title)}">
<meta property="og:description" content="{e(og_desc)}">
<meta property="og:url" content="{e(page_url)}">
<meta property="og:image" content="{e(image)}">
<meta property="og:image:secure_url" content="{e(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="{size[0]}">
<meta property="og:image:height" content="{size[1]}">
<meta property="og:image:alt" content="{e(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(og_title)}">
<meta name="twitter:description" content="{e(og_desc)}">
<meta name="twitter:image" content="{e(image)}">
<link rel="icon" href="/favicon.ico?v=3" sizes="any">
<style>{CSS}</style>
{json_ld(listing, meta, photos, page_url, desc_src or head_title)}
</head><body>
<header><a href="{SITE}/"><img src="/icon-192.png" alt="" width="30" height="30">Abracadeal</a></header>
<main>
<nav class="crumbs"><a href="{SITE}/">Accueil</a> › {e(cat)}{f' › {e(listing.get("city"))}' if listing.get("city") else ''}</nav>
{f'<div class="gallery">{gallery}</div>' if gallery else ''}
<span class="badge">{e(seller)} · {e(cat)}</span>
<h1>{e(title)}</h1>
{f'<p class="price">{e(price)}</p>' if price else ''}
{f'<p class="where">📍 {e(place)}</p>' if place else ''}
<a class="cta" href="{e(app_url)}">Contacter le vendeur sur Abracadeal</a>
{f'<section class="card"><h2>Caractéristiques</h2><table>{rows}</table></section>' if rows else ''}
{f'<section class="card"><h2>Description</h2><div class="desc">{e(text)}</div></section>' if text else ''}
<a class="cta" href="{e(app_url)}">Voir l’annonce complète et contacter le vendeur</a>
</main>
<footer>Annonce publiée sur <a href="{SITE}/">Abracadeal</a> — petites annonces partout en France. Les coordonnées du vendeur sont réservées aux membres connectés.</footer>
</body></html>
"""


def write_sitemap(entries):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for lid, lastmod, photos in entries:
        img = "".join(f"<image:image><image:loc>{html.escape(u)}</image:loc></image:image>" for u in photos[:5])
        lines.append(f"  <url><loc>{SITE}/annonce/{lid}/</loc><lastmod>{lastmod}</lastmod>{img}</url>")
    lines.append("</urlset>")
    content = "\n".join(lines) + "\n"
    old = open(SITEMAP, encoding="utf-8").read() if os.path.exists(SITEMAP) else ""
    if old != content:
        with open(SITEMAP, "w", encoding="utf-8") as f:
            f.write(content)


def main():
    listings = active_listings()
    os.makedirs(ROOT, exist_ok=True)
    keep, made, failed, entries = set(), 0, 0, []
    for listing in listings:
        lid = str(listing["id"])
        if not re.fullmatch(r"[0-9a-fA-F-]{36}", lid):
            continue
        keep.add(lid)
        folder = os.path.join(ROOT, lid)
        photos = photo_urls(listing)
        src = photos[0] if photos else DEFAULT_PHOTO
        lastmod = (listing.get("updated_at") or listing.get("created_at") or datetime.date.today().isoformat())[:10]
        entries.append((lid, lastmod, photos))
        payload = {k: v for k, v in listing.items() if k not in ("listing_photos", "updated_at")}
        sig = hashlib.sha256(json.dumps([VERSION, photos, payload], sort_keys=True, default=str).encode()).hexdigest()[:16]
        index = os.path.join(folder, "index.html")
        if os.path.exists(index) and f"<!-- sig:{sig} -->" in open(index, encoding="utf-8").read():
            continue
        try:
            jpeg, size = to_jpeg(fetch(src))
        except Exception as exc:  # photo illisible : on retombe sur la photo par défaut
            print(f"photo {lid}: {exc}", file=sys.stderr)
            try:
                jpeg, size = to_jpeg(fetch(DEFAULT_PHOTO))
            except Exception as exc2:
                print(f"defaut {lid}: {exc2}", file=sys.stderr)
                failed += 1
                continue
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, "apercu.jpg"), "wb") as f:
            f.write(jpeg)
        with open(index, "w", encoding="utf-8") as f:
            f.write(page_html(listing, size) + f"<!-- sig:{sig} -->\n")
        made += 1
    removed = 0
    for name in os.listdir(ROOT):
        if os.path.isdir(os.path.join(ROOT, name)) and name not in keep:
            shutil.rmtree(os.path.join(ROOT, name))
            removed += 1
    write_sitemap(entries)
    print(f"{len(listings)} annonces en ligne · {made} pages (re)générées · {removed} supprimées · {failed} échecs")


if __name__ == "__main__":
    main()
