"""Pages publiques des annonces : référencement Google + aperçu de partage (WhatsApp / Facebook / SMS).

Exécuté par GitHub Actions (.github/workflows/share-pages.yml) toutes les 10 minutes environ.
Pour chaque annonce active, publique, non expirée (et qui n'est pas une révision en attente) :
  - annonce/<id>/index.html : vraie page lisible par Google sans JavaScript (titre, prix, ville, photos,
    description, caractéristiques, données structurées schema.org), indexable, avec un bouton vers la
    fiche complète https://abracadeal.fr/?annonce=<id> (contact, favoris, messagerie) ;
  - annonce/<id>/apercu.jpg : photo principale en JPEG (format lu par WhatsApp pour l'aperçu).
Génère aussi :
  - annonces/... : pages catégories / villes / catégorie + ville avec de vrais liens <a href> vers les annonces ;
  - sitemap-annonces.xml (annonces en ligne) et sitemap-categories.xml (pages catégories / villes non vides),
    tous deux référencés par sitemap.xml.
Annonce qui n'est plus en ligne :
  - vendue ou expirée : la page reste 30 jours en version « Annonce vendue / expirée » (noindex, hors sitemap,
    annonces similaires + bouton de dépôt), puis son dossier est supprimé (vraie 404) ;
  - supprimée par le vendeur, retirée par l'admin, refusée ou masquée : dossier supprimé immédiatement (404).
Chaque page annonce affiche aussi des « annonces similaires » (liens internes pour Google et les visiteurs).

Aucune donnée de contact (téléphone, e-mail) n'est publiée : elles restent réservées aux membres connectés.

Test hors ligne : ABRACA_FIXTURE=chemin/vers/annonces.json python scripts/build_share_pages.py
(liste des annonces telle que renvoyée par Supabase, ou {"listings": [...], "unavailable": [{"id", "reason",
"unavailable_at"}]} ; aucune photo n'est téléchargée).
"""
import base64
import datetime
import hashlib
import html
import io
import json
import os
import re
import shutil
import sys
import unicodedata
import urllib.parse
import urllib.request

from PIL import Image

SUPABASE_URL = "https://jplzvxmpbpjssyinozap.supabase.co"
SUPABASE_KEY = "sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF"  # clé publique du site
SITE = "https://abracadeal.fr"
BASE = os.environ.get("ABRACA_OUT") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ROOT = os.path.join(BASE, "annonce")
HUBS = os.path.join(BASE, "annonces")
SITEMAP = os.path.join(BASE, "sitemap-annonces.xml")
SITEMAP_HUBS = os.path.join(BASE, "sitemap-categories.xml")
FIXTURE = os.environ.get("ABRACA_FIXTURE")
DEFAULT_PHOTO = SITE + "/assets/default-listing-photo-20260921.jpg"
CATEGORIES = {"vehicules": "Véhicules", "immobilier": "Immobilier", "vacances": "Locations de vacances",
              "hightech": "High-tech", "maison": "Maison", "mode": "Mode", "emploi": "Emploi",
              "services": "Services", "autres": "Autres"}
MAX_IMAGE_BYTES = 280 * 1024  # WhatsApp n'affiche plus l'aperçu au-delà d'environ 300 Ko
MAX_PHOTOS = 8
MAX_HUB_LISTINGS = 120
MAX_SIMILAR = 6
UNAVAILABLE_DAYS = 30  # durée de vie de la page « vendue / expirée »
DEPOSIT_URL = SITE + "/?deposer=1"
VERSION = "5"  # à incrémenter pour forcer la régénération de toutes les pages
FIELDS = ("id,title,description,price,city,postal_code,category,seller_type,item_condition,"
          "vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,crit_air,"
          "created_at,updated_at,expires_at,listing_photos(storage_path,position)")
MARKER = re.compile(r"^\[ABRACA_([A-Z_]+):([^\]]*)\]\s*", re.M)

# Pages catégories : (slug d'URL, nom, nom au pluriel pour les phrases, filtre, texte d'introduction)
HUB_CATEGORIES = [
    ("voitures-occasion", "Voitures d’occasion", "voitures d’occasion",
     lambda l, m: l.get("category") == "vehicules" and (m["sub"] == "voitures" or (not m["sub"] and bool(l.get("vehicle_make")))),
     "Citadines, berlines, SUV, breaks ou monospaces : retrouvez les voitures d’occasion vendues par des particuliers "
     "et des professionnels, avec marque, modèle, année, kilométrage, énergie et boîte de vitesses affichés sur chaque annonce."),
    ("motos", "Motos et scooters d’occasion", "motos et scooters d’occasion",
     lambda l, m: l.get("category") == "vehicules" and m["sub"] == "motos",
     "Roadsters, sportives, trails, customs et scooters : parcourez les deux-roues d’occasion à vendre, "
     "du 50 cm³ pour la ville à la grosse cylindrée pour la route."),
    ("utilitaires", "Utilitaires d’occasion", "utilitaires d’occasion",
     lambda l, m: l.get("category") == "vehicules" and m["sub"] == "utilitaires",
     "Fourgons, fourgonnettes, plateaux et camions benne : les véhicules utilitaires d’occasion pour les artisans, "
     "les entreprises et les particuliers."),
    ("vehicules", "Véhicules d’occasion", "véhicules d’occasion",
     lambda l, m: l.get("category") == "vehicules",
     "Toutes les annonces de véhicules : voitures, motos, utilitaires, camping-cars et caravanes, "
     "vendus par des particuliers et des professionnels."),
    ("immobilier", "Immobilier", "annonces immobilières",
     lambda l, m: l.get("category") == "immobilier",
     "Appartements, maisons, terrains et locaux : annonces immobilières à la vente et à la location, "
     "avec surface, nombre de pièces, DPE et photos."),
    ("locations-vacances", "Locations de vacances", "locations de vacances",
     lambda l, m: l.get("category") == "vacances",
     "Appartements, villas et studios à louer pour les vacances, au tarif à la nuit, directement auprès des hôtes."),
    ("high-tech", "High-tech d’occasion", "produits high-tech d’occasion",
     lambda l, m: l.get("category") == "hightech",
     "Smartphones, ordinateurs, consoles, TV et photo : le high-tech d’occasion à petit prix."),
    ("maison", "Maison et jardin", "articles pour la maison",
     lambda l, m: l.get("category") == "maison",
     "Meubles, électroménager, décoration, bricolage et jardin : équipez votre maison avec des articles d’occasion."),
    ("mode", "Mode", "articles de mode",
     lambda l, m: l.get("category") == "mode",
     "Vêtements, chaussures, sacs, montres et accessoires de mode d’occasion."),
    ("emploi", "Emploi", "offres d’emploi",
     lambda l, m: l.get("category") == "emploi",
     "Offres d’emploi, missions et recrutements publiés par les entreprises et les particuliers."),
    ("services", "Services", "annonces de services",
     lambda l, m: l.get("category") == "services",
     "Artisans, cours, aide à domicile, déménagement et prestations : trouvez un service près de chez vous."),
]
CORE_CATEGORIES = ("voitures-occasion", "motos", "immobilier")  # toujours publiées, même vides (en noindex)
CORE_CITIES = {"cannes": "Cannes", "nice": "Nice", "marseille": "Marseille"}
CITY_TEXT = {
    "cannes": "Cannes et ses environs (Le Cannet, Mandelieu-la-Napoule, Mougins, Vallauris), sur la Côte d’Azur, dans les Alpes-Maritimes.",
    "nice": "Nice et la métropole Nice Côte d’Azur (Saint-Laurent-du-Var, Cagnes-sur-Mer, Villefranche-sur-Mer).",
    "marseille": "Marseille et ses arrondissements, ainsi que les communes voisines des Bouches-du-Rhône.",
}
MIN_LISTINGS_FOR_CITY = 3  # une ville hors liste ci-dessus obtient sa page dès 3 annonces en ligne
RESERVED_SLUGS = {h[0] for h in HUB_CATEGORIES}


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "abracadeal-share-pages", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def load_fixture():
    with open(FIXTURE, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, dict) else {"listings": data, "unavailable": []}


def active_listings():
    if FIXTURE:
        return load_fixture()["listings"]
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows, start, page = [], 0, 1000
    while True:
        q = urllib.parse.urlencode({"select": FIELDS, "status": "eq.active", "visibility_scope": "eq.public",
                                    "revision_of": "is.null", "or": f"(expires_at.is.null,expires_at.gt.{now})",
                                    "order": "created_at.desc"})
        data = json.loads(fetch(f"{SUPABASE_URL}/rest/v1/listings?{q}", {
            "apikey": SUPABASE_KEY, "Range-Unit": "items", "Range": f"{start}-{start + page - 1}"}))
        rows += data
        if len(data) < page:
            return rows
        start += page


def unavailable_listings():
    """Annonces publiques vendues ou expirées depuis moins de UNAVAILABLE_DAYS jours : {id: (motif, date)}."""
    if FIXTURE:
        rows = load_fixture().get("unavailable", [])
    else:
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/rpc/seo_recently_unavailable_listings",
                                     data=json.dumps({"p_days": UNAVAILABLE_DAYS}).encode(), method="POST",
                                     headers={"User-Agent": "abracadeal-share-pages", "apikey": SUPABASE_KEY,
                                              "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            rows = json.loads(r.read())
    return {str(r["id"]): (r.get("reason") or "sold", str(r.get("unavailable_at") or "")[:10]) for r in rows}


def slugify(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def city_key(city):
    """« Marseille 8e », « MARSEILLE » et « Marseille 13008 » -> « marseille »."""
    c = re.sub(r"\b(cedex|arrondissement)\b.*$", "", str(city or ""), flags=re.I)
    c = re.sub(r"\s+\d+\s*(e|er|eme|ème)?\s*$", "", c.strip(), flags=re.I)
    return slugify(c)


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


def placeholder_jpeg():
    img = Image.new("RGB", (1200, 900), (111, 33, 140))
    out = io.BytesIO()
    img.save(out, "JPEG", quality=80)
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


def json_ld(listing, meta, photos, page_url, desc, crumbs):
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
    return ld_script(data) + "\n" + ld_script(breadcrumb_ld(crumbs))


def ld_script(d):
    return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False).replace("<", "\\u003c") + "</script>"


def breadcrumb_ld(crumbs):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [dict({"@type": "ListItem", "position": i + 1, "name": n}, **({"item": u} if u else {}))
                                for i, (n, u) in enumerate(crumbs)]}


def crumbs_html(crumbs):
    e = lambda s: html.escape(str(s), quote=True)
    parts = [f'<a href="{e(u)}">{e(n)}</a>' for n, u in crumbs[:-1]]
    return '<nav class="crumbs" aria-label="Fil d’Ariane">' + " › ".join(parts + [e(crumbs[-1][0])]) + "</nav>"


CSS = """*{box-sizing:border-box}body{margin:0;background:#f7f3fa;color:#21132d;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55}
a{color:#6f218c}header{background:#24102f;padding:12px 16px}header a{color:#fff;text-decoration:none;font-weight:800;font-size:1.15rem;display:inline-flex;align-items:center;gap:8px}
header img{width:30px;height:30px;border-radius:8px}main{max-width:900px;margin:0 auto;padding:16px}
nav.crumbs{font-size:.85rem;color:#6b5a78;margin:4px 0 12px}nav.crumbs a{color:#6b5a78}
.gallery{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;margin:0 -16px 16px;padding:0 16px;scrollbar-width:thin}
.gallery img{flex:0 0 86%;width:86%;height:min(58vh,440px);object-fit:contain;border-radius:12px;background:#ece3f2;scroll-snap-align:center}
.gallery img:only-child{flex-basis:100%;width:100%}
@media(min-width:700px){.gallery{margin:0 0 16px;padding:0}.gallery img{flex-basis:62%;width:62%}}
.gallery-hint{font-size:.8rem;color:#6b5a78;margin:-10px 0 14px}
h1{font-size:1.5rem;line-height:1.25;margin:0 0 6px}.price{font-size:1.6rem;font-weight:850;color:#6f218c;margin:0}
.where{color:#4a3a57;margin:4px 0 14px}.card{background:#fff;border-radius:16px;padding:16px;margin:14px 0;box-shadow:0 2px 10px rgba(36,16,47,.06)}
.cta{display:block;text-align:center;background:#6f218c;color:#fff;font-weight:800;padding:14px;border-radius:12px;text-decoration:none;margin:14px 0}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 4px;border-bottom:1px solid #efe6f4;vertical-align:top}th{color:#6b5a78;font-weight:600;width:45%}
.desc{white-space:pre-line;overflow-wrap:anywhere}h2{font-size:1.1rem;margin:0 0 8px}footer{text-align:center;font-size:.8rem;color:#6b5a78;padding:24px 16px}
.badge{display:inline-block;background:#f1e7f5;color:#6f218c;font-weight:700;font-size:.78rem;padding:3px 9px;border-radius:999px;margin-bottom:8px}
.intro{color:#4a3a57;margin:0 0 14px}.list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.list a{display:flex;flex-direction:column;background:#fff;border-radius:14px;overflow:hidden;text-decoration:none;color:#21132d;box-shadow:0 2px 10px rgba(36,16,47,.06);height:100%}
.list img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#e9dff0}.list .t{font-weight:700;padding:10px 12px 2px}.list .p{color:#6f218c;font-weight:800;padding:0 12px}.list .c{color:#6b5a78;font-size:.85rem;padding:2px 12px 12px}
.links{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none;margin:0}.links a{display:inline-block;background:#fff;border:1px solid #e4d6ec;border-radius:999px;padding:6px 12px;text-decoration:none;font-size:.9rem}"""


def page_head(title, desc, url, robots="index,follow,max-image-preview:large", og_image=None, extra=""):
    e = lambda s: html.escape(str(s), quote=True)
    og = (f'<meta property="og:image" content="{e(og_image)}">\n'
          f'<meta name="twitter:card" content="summary_large_image">\n') if og_image else ""
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="{robots}">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{e(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Abracadeal">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(url)}">
{og}<link rel="icon" href="/favicon.ico?v=3" sizes="any">
<style>{CSS}</style>
{extra}
</head><body>
<header><a href="{SITE}/"><img src="/icon-192.png" alt="" width="30" height="30">Abracadeal</a></header>
<main>
"""


PAGE_FOOT = """</main>
<footer>Abracadeal — petites annonces partout en France · <a href="/annonces/">Toutes les catégories et villes</a> · <a href="/">Accueil</a></footer>
</body></html>
"""


def similar_section(similar, title="Annonces similaires"):
    if not similar:
        return ""
    return f'<section class="card"><h2>{html.escape(title)}</h2><ul class="list">' + "".join(listing_card(it) for it in similar) + "</ul></section>"


def snapshot(it):
    """Résumé de l'annonce gardé dans la page, pour produire la version « vendue » sans relire la base."""
    l = it["listing"]
    d = {k: l.get(k) for k in ("id", "title", "price", "city", "postal_code", "category", "seller_type")}
    d.update(cats=it["cats"], city_key=it["city_key"], crumbs=it["crumbs"][:-1])
    return base64.b64encode(json.dumps(d, ensure_ascii=False).encode()).decode()


def read_snapshot(index):
    m = re.search(r"<!-- snap:([A-Za-z0-9+/=]+) -->", open(index, encoding="utf-8").read())
    return json.loads(base64.b64decode(m.group(1))) if m else None


def page_html(listing, size, crumbs, ref_suffix="", similar=()):
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
    head_title = seo_title(listing, meta) + ref_suffix
    specs = specs_of(listing, meta)
    key = {"Année", "Kilométrage", "Énergie", "Boîte de vitesses", "Surface", "Pièces", "Type de bien", "Transaction", "État"}
    spec_txt = ", ".join(v for k, v in specs if k in key)
    desc_src = " ".join(text.split())
    meta_desc = " · ".join(x for x in (title, price, place, spec_txt, desc_src) if x)
    meta_desc = (meta_desc[:155].rsplit(" ", 1)[0] + "…") if len(meta_desc) > 158 else meta_desc
    if ref_suffix:
        meta_desc = (meta_desc[:140].rsplit(" ", 1)[0] if len(meta_desc) > 140 else meta_desc) + ref_suffix
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
{json_ld(listing, meta, photos, page_url, desc_src or head_title, crumbs)}
</head><body>
<header><a href="{SITE}/"><img src="/icon-192.png" alt="" width="30" height="30">Abracadeal</a></header>
<main>
{crumbs_html(crumbs)}
{f'<div class="gallery">{gallery}</div>' if gallery else ''}
{f'<p class="gallery-hint">{len(photos)} photos · faites glisser pour les voir</p>' if len(photos) > 1 else ''}
<span class="badge">{e(seller)} · {e(cat)}</span>
<h1>{e(title)}</h1>
{f'<p class="price">{e(price)}</p>' if price else ''}
{f'<p class="where">📍 {e(place)}</p>' if place else ''}
<a class="cta" href="{e(app_url)}" rel="nofollow">Contacter le vendeur sur Abracadeal</a>
{f'<section class="card"><h2>Caractéristiques</h2><table>{rows}</table></section>' if rows else ''}
{f'<section class="card"><h2>Description</h2><div class="desc">{e(text)}</div></section>' if text else ''}
<a class="cta" href="{e(app_url)}" rel="nofollow">Voir l’annonce complète et contacter le vendeur</a>
{similar_section(similar)}
</main>
<footer>Annonce publiée sur <a href="{SITE}/">Abracadeal</a> — petites annonces partout en France · <a href="{SITE}/annonces/">Toutes les catégories et villes</a>. Les coordonnées du vendeur sont réservées aux membres connectés.</footer>
</body></html>
"""


# ---------- Pages catégories / villes ----------

def hub_url(cat_slug=None, city_slug=None):
    return SITE + "/annonces/" + "".join(f"{s}/" for s in (cat_slug, city_slug) if s)


def listing_card(item):
    e = lambda s: html.escape(str(s), quote=True)
    l, photos = item["listing"], item["photos"]
    price = money(l.get("price"))
    if price and l.get("category") == "vacances":
        price += " / nuit"
    img = photos[0] if photos else DEFAULT_PHOTO
    title = (l.get("title") or "Annonce").strip()
    return (f'<li><a href="/annonce/{e(l["id"])}/"><img src="{e(img)}" alt="{e(title)}" loading="lazy" width="400" height="300">'
            f'<span class="t">{e(title)}</span>{f"<span class=p>{e(price)}</span>" if price else ""}'
            f'<span class="c">{e(l.get("city") or "")}</span></a></li>')


def hub_page(title, h1, intro, desc, url, crumbs, items, links_title, links):
    e = lambda s: html.escape(str(s), quote=True)
    robots = "index,follow" if items else "noindex,follow"
    shown = items[:MAX_HUB_LISTINGS]
    item_list = {"@context": "https://schema.org", "@type": "ItemList", "numberOfItems": len(shown),
                 "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f'{SITE}/annonce/{it["listing"]["id"]}/'}
                                     for i, it in enumerate(shown)]}
    extra = ld_script(breadcrumb_ld(crumbs)) + ("\n" + ld_script(item_list) if shown else "")
    body = [crumbs_html(crumbs), f"<h1>{e(h1)}</h1>", f'<p class="intro">{e(intro)}</p>']
    if shown:
        n = len(items)
        body.append(f'<p class="intro"><strong>{n} annonce{"s" if n > 1 else ""} en ligne.</strong></p>')
        body.append('<ul class="list">' + "".join(listing_card(it) for it in shown) + "</ul>")
    else:
        body.append('<p class="card">Aucune annonce en ligne pour le moment dans cette rubrique. '
                    '<a href="/">Découvrir toutes les annonces sur Abracadeal</a> ou <a href="/">déposer une annonce</a>.</p>')
    if links:
        body.append(f'<section class="card"><h2>{e(links_title)}</h2><ul class="links">'
                    + "".join(f'<li><a href="{e(u)}">{e(n)}</a></li>' for n, u in links) + "</ul></section>")
    return page_head(title, desc, url, robots=robots, extra=extra) + "\n".join(body) + "\n" + PAGE_FOOT


def build_hubs(items):
    """Retourne {chemin relatif: (html, indexable)} et, pour chaque annonce, ses liens de fil d'Ariane."""
    for it in items:
        it["city_key"] = city_key(it["listing"].get("city"))
        it["cats"] = [h[0] for h in HUB_CATEGORIES if h[3](it["listing"], it["meta"])]

    # Villes : noms d'affichage les plus fréquents, villes « cœur » toujours présentes
    counts, names = {}, {}
    for it in items:
        k = it["city_key"]
        if not k or k in RESERVED_SLUGS:
            continue
        counts[k] = counts.get(k, 0) + 1
        names.setdefault(k, {})
        c = re.sub(r"\s+\d+\s*(e|er|eme|ème)?\s*$", "", (it["listing"].get("city") or "").strip(), flags=re.I)
        names[k][c] = names[k].get(c, 0) + 1
    cities = dict(CORE_CITIES)
    for k, n in counts.items():
        if n >= MIN_LISTINGS_FOR_CITY and k not in cities:
            cities[k] = max(names[k].items(), key=lambda kv: (kv[1], kv[0]))[0].title()

    cat_info = {h[0]: h for h in HUB_CATEGORIES}
    by_cat = {h[0]: [it for it in items if h[0] in it["cats"]] for h in HUB_CATEGORIES}
    by_city = {k: [it for it in items if it["city_key"] == k] for k in cities}
    cats = [h[0] for h in HUB_CATEGORIES if h[0] in CORE_CATEGORIES or by_cat[h[0]]]

    pages = {}
    home = ("Accueil", SITE + "/")
    root = ("Toutes les annonces", hub_url())
    city_links = lambda cat=None: [(f"{cat_info[cat][1]} à {cities[k]}" if cat else f"Annonces à {cities[k]}",
                                    hub_url(cat, k)) for k in sorted(cities, key=lambda k: cities[k])
                                   if (not cat and (k in CORE_CITIES or by_city[k])) or
                                   (cat and (cat in CORE_CATEGORIES and k in CORE_CITIES or any(cat in it["cats"] for it in by_city[k])))]

    # Page racine /annonces/
    links = [(cat_info[c][1], hub_url(c)) for c in cats] + city_links()
    pages[""] = (hub_page("Petites annonces par catégorie et par ville | Abracadeal",
                          "Petites annonces par catégorie et par ville",
                          "Toutes les annonces en ligne sur Abracadeal, classées par catégorie et par ville : voitures d’occasion, "
                          "motos, immobilier, locations de vacances, high-tech et bien plus, publiées par des particuliers et des professionnels.",
                          "Parcourez les petites annonces Abracadeal par catégorie (voitures d’occasion, motos, immobilier...) et par ville (Cannes, Nice, Marseille...).",
                          hub_url(), [home, root], items, "Catégories et villes", links), bool(items))

    # Catégories
    for c in cats:
        slug, name, plural, _, intro = cat_info[c]
        its = by_cat[c]
        pages[c] = (hub_page(f"{name} : annonces entre particuliers et pros | Abracadeal", f"{name}",
                             intro, f"{name} : {len(its)} annonce{'s' if len(its) > 1 else ''} en ligne sur Abracadeal. {intro[:110].rsplit(' ', 1)[0]}…",
                             hub_url(c), [home, root, (name, hub_url(c))], its, f"{name} par ville", city_links(c)), bool(its))

    # Villes et catégorie + ville
    for k, cname in cities.items():
        its = by_city[k]
        if not its and k not in CORE_CITIES:
            continue
        ctext = CITY_TEXT.get(k, f"{cname} et ses environs.")
        cat_links = [(f"{cat_info[c][1]} à {cname}", hub_url(c, k)) for c in cats
                     if (c in CORE_CATEGORIES and k in CORE_CITIES) or any(c in it["cats"] for it in its)]
        pages[k] = (hub_page(f"Petites annonces à {cname} : auto, moto, immobilier | Abracadeal",
                             f"Petites annonces à {cname}",
                             f"Achetez et vendez près de chez vous : toutes les petites annonces publiées à {ctext}",
                             f"Petites annonces à {cname} : {len(its)} annonce{'s' if len(its) > 1 else ''} de particuliers et de professionnels "
                             f"(voitures, motos, immobilier, high-tech...) sur Abracadeal.",
                             hub_url(None, k), [home, root, (f"Annonces à {cname}", hub_url(None, k))], its,
                             f"Rubriques à {cname}", cat_links), bool(its))
        for c in cats:
            sub = [it for it in its if c in it["cats"]]
            if not sub and not (c in CORE_CATEGORIES and k in CORE_CITIES):
                continue
            slug, name, plural, _, intro = cat_info[c]
            pages[f"{c}/{k}"] = (hub_page(
                f"{name} à {cname} | Abracadeal", f"{name} à {cname}",
                f"Les {plural} à {ctext} {intro}",
                f"{name} à {cname} : {len(sub)} annonce{'s' if len(sub) > 1 else ''} de {plural} publiée{'s' if len(sub) > 1 else ''} "
                f"par des particuliers et des professionnels sur Abracadeal.",
                hub_url(c, k), [home, root, (name, hub_url(c)), (cname, hub_url(c, k))], sub,
                f"Autres rubriques à {cname}", [(n, u) for n, u in cat_links if u != hub_url(c, k)]), bool(sub))

    # Fil d'Ariane de chaque annonce : catégorie la plus précise, puis ville si elle a sa page
    for it in items:
        l = it["listing"]
        crumbs = [home]
        main_cat = it["cats"][0] if it["cats"] else None
        if main_cat:
            crumbs.append((cat_info[main_cat][1], hub_url(main_cat)))
            if f"{main_cat}/{it['city_key']}" in pages:
                crumbs.append((cities[it["city_key"]], hub_url(main_cat, it["city_key"])))
        elif it["city_key"] in pages and it["city_key"] in cities:
            crumbs.append((f"Annonces à {cities[it['city_key']]}", hub_url(None, it["city_key"])))
        crumbs.append(((l.get("title") or "Annonce").strip(), f"{SITE}/annonce/{l['id']}/"))
        it["crumbs"] = crumbs
    return pages


def write_if_changed(path, content):
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if old != content:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def write_hubs(pages):
    keep = set()
    for rel, (content, _) in pages.items():
        folder = os.path.join(HUBS, *rel.split("/")) if rel else HUBS
        keep.add(os.path.normpath(folder))
        write_if_changed(os.path.join(folder, "index.html"), content)
    # Supprime les pages catégories / villes qui n'ont plus lieu d'être (-> 404)
    for dirpath, dirnames, filenames in os.walk(HUBS, topdown=False):
        norm = os.path.normpath(dirpath)
        if norm not in keep and "index.html" in filenames:
            os.remove(os.path.join(dirpath, "index.html"))
        if norm != os.path.normpath(HUBS) and not os.listdir(dirpath):
            os.rmdir(dirpath)
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for rel in sorted(pages):
        if pages[rel][1]:
            lines.append(f"  <url><loc>{SITE}/annonces/{rel + '/' if rel else ''}</loc></url>")
    lines.append("</urlset>")
    write_if_changed(SITEMAP_HUBS, "\n".join(lines) + "\n")


def write_sitemap(entries):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for lid, lastmod, photos in entries:
        img = "".join(f"<image:image><image:loc>{html.escape(u)}</image:loc></image:image>" for u in photos[:5])
        lines.append(f"  <url><loc>{SITE}/annonce/{lid}/</loc><lastmod>{lastmod}</lastmod>{img}</url>")
    lines.append("</urlset>")
    write_if_changed(SITEMAP, "\n".join(lines) + "\n")


def jpeg_for(lid, src, folder, img_sig):
    """Réutilise l'aperçu existant si la photo principale n'a pas changé (évite de le retélécharger)."""
    index, jpg = os.path.join(folder, "index.html"), os.path.join(folder, "apercu.jpg")
    if os.path.exists(index) and os.path.exists(jpg) and f"<!-- img:{img_sig} -->" in open(index, encoding="utf-8").read():
        with Image.open(jpg) as im:
            return None, im.size
    if FIXTURE:
        return placeholder_jpeg()
    try:
        return to_jpeg(fetch(src))
    except Exception as exc:  # photo illisible : on retombe sur la photo par défaut
        print(f"photo {lid}: {exc}", file=sys.stderr)
        return to_jpeg(fetch(DEFAULT_PHOTO))


def similar_for(cats, ckey, items, exclude=None, n=MAX_SIMILAR):
    """Annonces en ligne proches : même catégorie + même ville, puis même catégorie, puis même ville, puis récentes."""
    main_cat = cats[0] if cats else None
    tiers = [lambda it: main_cat and main_cat in it["cats"] and ckey and it["city_key"] == ckey,
             lambda it: main_cat and main_cat in it["cats"],
             lambda it: ckey and it["city_key"] == ckey,
             lambda it: True]
    out, seen = [], {exclude}
    for test in tiers:
        for it in items:
            lid = str(it["listing"]["id"])
            if lid not in seen and test(it):
                out.append(it)
                seen.add(lid)
                if len(out) >= n:
                    return out
    return out


def sold_page_html(snap, reason, since, size, similar):
    e = lambda s: html.escape(str(s), quote=True)
    lid = snap["id"]
    title = (snap.get("title") or "Annonce").strip()
    page_url = f"{SITE}/annonce/{lid}/"
    state = "vendue" if reason == "sold" else "expirée"
    city = snap.get("city") or ""
    cats = snap.get("cats") or []
    cat_name = next((h[1] for h in HUB_CATEGORIES if cats and h[0] == cats[0]), CATEGORIES.get(snap.get("category"), "Annonces"))
    crumbs = [tuple(c) for c in (snap.get("crumbs") or [("Accueil", SITE + "/")])] + [(title, page_url)]
    more = [(f"Toutes les annonces : {cat_name}", hub_url(cats[0]))] if cats else []
    if cats and snap.get("city_key"):
        more.insert(0, (f"{cat_name} à {city}", hub_url(cats[0], snap["city_key"])))
    more.append(("Toutes les catégories et villes", hub_url()))
    image = f"{page_url}apercu.jpg"
    desc = f"Cette annonce ({title}{', ' + city if city else ''}) est {state}. Découvrez des annonces similaires sur Abracadeal."
    head = page_head(f"Annonce {state} : {title} | Abracadeal", desc, page_url, robots="noindex,follow", extra=(
        f'<meta property="og:image" content="{e(image)}">\n<meta property="og:image:width" content="{size[0]}">\n'
        f'<meta property="og:image:height" content="{size[1]}">\n<meta name="twitter:card" content="summary_large_image">'))
    links = "".join(f'<li><a href="{e(u)}">{e(n)}</a></li>' for n, u in more)
    return head + f"""{crumbs_html(crumbs)}
<span class="badge">Annonce {e(state)}</span>
<h1>{e(title)}</h1>
<p class="where">{'📍 ' + e(city) + ' · ' if city else ''}{e(cat_name)}</p>
<div class="gallery"><img src="apercu.jpg" alt="{e(title)}" width="{size[0]}" height="{size[1]}" style="filter:grayscale(.6);opacity:.8"></div>
<section class="card"><h2>Cette annonce n’est plus disponible</h2>
<p>{'Le vendeur a indiqué que cet article est vendu.' if reason == 'sold' else 'Cette annonce a expiré et n’est plus en ligne.'}
Voici des annonces proches qui pourraient vous intéresser.</p></section>
{similar_section(similar)}
<section class="card"><h2>Continuer la recherche</h2><ul class="links">{links}</ul></section>
<section class="card"><h2>Vous avez quelque chose à vendre ?</h2>
<p>Publiez votre annonce gratuitement sur Abracadeal, en quelques minutes.</p>
<a class="cta" href="{e(DEPOSIT_URL)}" rel="nofollow">Déposer une annonce gratuitement</a></section>
""" + PAGE_FOOT


def main():
    listings = active_listings()
    unavailable = unavailable_listings()
    os.makedirs(ROOT, exist_ok=True)
    existing = [n for n in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, n))]
    # Garde-fou : si Supabase renvoie soudain beaucoup moins d'annonces (panne, règle d'accès modifiée),
    # on ne supprime pas tout le site d'un coup. Forcer avec ABRACA_ALLOW_MASS_REMOVAL=1.
    still = len(listings) + len(set(unavailable) & set(existing))
    if len(existing) >= 20 and still < len(existing) * 0.5 and not os.environ.get("ABRACA_ALLOW_MASS_REMOVAL"):
        sys.exit(f"Arrêt de sécurité : {still} annonces à garder contre {len(existing)} pages existantes.")

    items = []
    for listing in listings:
        lid = str(listing["id"])
        if not re.fullmatch(r"[0-9a-fA-F-]{36}", lid):
            continue
        text, meta = parse_description(listing.get("description"))
        items.append({"listing": listing, "meta": meta, "photos": photo_urls(listing)})

    pages = build_hubs(items)
    titles = {}
    for it in items:
        t = seo_title(it["listing"], it["meta"])
        titles[t] = titles.get(t, 0) + 1

    keep, made, failed, entries = set(), 0, 0, []
    for it in items:
        listing, photos = it["listing"], it["photos"]
        lid = str(listing["id"])
        keep.add(lid)
        folder = os.path.join(ROOT, lid)
        src = photos[0] if photos else DEFAULT_PHOTO
        lastmod = (listing.get("updated_at") or listing.get("created_at") or datetime.date.today().isoformat())[:10]
        entries.append((lid, lastmod, photos))
        ref = f" · réf. {lid[:8]}" if titles[seo_title(listing, it["meta"])] > 1 else ""
        similar = similar_for(it["cats"], it["city_key"], items, exclude=lid)
        sim_sig = [(s["listing"]["id"], s["listing"].get("title"), s["listing"].get("price"), s["listing"].get("city"), s["photos"][:1])
                   for s in similar]
        payload = {k: v for k, v in listing.items() if k not in ("listing_photos", "updated_at", "expires_at")}
        sig = hashlib.sha256(json.dumps([VERSION, photos, payload, it["crumbs"], ref, sim_sig], sort_keys=True, default=str).encode()).hexdigest()[:16]
        img_sig = hashlib.sha256(src.encode()).hexdigest()[:16]
        index = os.path.join(folder, "index.html")
        if os.path.exists(index) and f"<!-- sig:{sig} -->" in open(index, encoding="utf-8").read():
            continue
        try:
            jpeg, size = jpeg_for(lid, src, folder, img_sig)
        except Exception as exc:
            print(f"defaut {lid}: {exc}", file=sys.stderr)
            failed += 1
            continue
        os.makedirs(folder, exist_ok=True)
        if jpeg is not None:
            with open(os.path.join(folder, "apercu.jpg"), "wb") as f:
                f.write(jpeg)
        with open(index, "w", encoding="utf-8") as f:
            f.write(page_html(listing, size, it["crumbs"], ref, similar)
                    + f"<!-- sig:{sig} -->\n<!-- img:{img_sig} -->\n<!-- snap:{snapshot(it)} -->\n")
        made += 1

    # Annonces vendues / expirées depuis moins de 30 jours : page « plus disponible » (noindex), hors sitemap
    sold = 0
    for lid, (reason, since) in unavailable.items():
        folder = os.path.join(ROOT, lid)
        index, jpg = os.path.join(folder, "index.html"), os.path.join(folder, "apercu.jpg")
        if lid in keep or not re.fullmatch(r"[0-9a-fA-F-]{36}", lid) or not os.path.exists(index) or not os.path.exists(jpg):
            continue
        try:
            snap = read_snapshot(index)
        except Exception:
            snap = None
        if not snap:
            continue
        similar = similar_for(snap.get("cats") or [], snap.get("city_key"), items, exclude=lid)
        sig = hashlib.sha256(json.dumps([VERSION, reason, [s["listing"]["id"] for s in similar], snap], sort_keys=True,
                                        default=str).encode()).hexdigest()[:16]
        keep.add(lid)
        if f"<!-- unavailable:{sig} -->" in open(index, encoding="utf-8").read():
            continue
        with Image.open(jpg) as im:
            size = im.size
        with open(index, "w", encoding="utf-8") as f:
            f.write(sold_page_html(snap, reason, since, size, similar)
                    + f"<!-- unavailable:{sig} -->\n<!-- snap:{base64.b64encode(json.dumps(snap, ensure_ascii=False).encode()).decode()} -->\n")
        sold += 1

    removed = 0
    for name in os.listdir(ROOT):
        if os.path.isdir(os.path.join(ROOT, name)) and name not in keep:
            shutil.rmtree(os.path.join(ROOT, name))
            removed += 1
    active_ids = {str(it["listing"]["id"]) for it in items}
    write_sitemap([e for e in entries if e[0] in active_ids and os.path.exists(os.path.join(ROOT, e[0], "index.html"))])
    write_hubs(pages)
    print(f"{len(listings)} annonces en ligne · {made} pages (re)générées · {sold} pages « vendue/expirée » mises à jour · "
          f"{removed} supprimées · {failed} échecs · {len(pages)} pages catégories/villes "
          f"({sum(1 for p in pages.values() if p[1])} indexables)")


if __name__ == "__main__":
    main()
