"""Pages de partage des annonces (aperçu WhatsApp / Facebook / SMS avec la photo de l'annonce).

Execute par GitHub Actions (.github/workflows/share-pages.yml) toutes les 10 minutes environ.
Pour chaque annonce active, genere annonce/<id>/index.html (balises Open Graph : titre, prix,
ville, photo) et annonce/<id>/apercu.jpg (photo principale en JPEG, format lu par WhatsApp).
La page redirige aussitot le visiteur vers la fiche https://abracadeal.fr/?annonce=<id>.
Les dossiers des annonces qui ne sont plus actives sont supprimes.

Remplace le lien supabase.co/functions/v1/share-listing, qui tombait sur une page blanche
(Supabase sert les pages HTML de ses fonctions en text/plain avec une CSP sandbox).
"""
import hashlib
import html
import io
import json
import os
import shutil
import sys
import urllib.parse
import urllib.request

from PIL import Image

SUPABASE_URL = "https://jplzvxmpbpjssyinozap.supabase.co"
SUPABASE_KEY = "sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF"  # cle publique du site
SITE = "https://abracadeal.fr"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "annonce")
DEFAULT_PHOTO = SITE + "/assets/default-listing-photo-20260921.jpg"
CATEGORIES = {"vehicules": "Véhicules", "immobilier": "Immobilier", "vacances": "Vacances", "hightech": "High-tech",
              "maison": "Maison", "mode": "Mode", "emploi": "Emploi", "services": "Services", "autres": "Autres"}
MAX_IMAGE_BYTES = 280 * 1024  # WhatsApp n'affiche plus l'apercu au-dela d'environ 300 Ko
VERSION = "1"  # a incrementer pour forcer la regeneration de toutes les pages


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "abracadeal-share-pages", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def active_listings():
    rows, start, page = [], 0, 1000
    while True:
        q = urllib.parse.urlencode({
            "select": "id,title,price,city,postal_code,category,listing_photos(storage_path,position)",
            "status": "eq.active",
            "order": "created_at.desc",
        })
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
    return s.replace(",", " ").replace(".", ",") + " €"


def photo_source(listing):
    photos = sorted(listing.get("listing_photos") or [], key=lambda p: p.get("position") or 0)
    if not photos or not photos[0].get("storage_path"):
        return DEFAULT_PHOTO
    path = photos[0]["storage_path"]
    if path.startswith("http"):
        return path
    return f"{SUPABASE_URL}/storage/v1/object/public/listing-images/{urllib.parse.quote(path)}"


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


def page_html(listing, size):
    lid = listing["id"]
    title = (listing.get("title") or "Annonce").strip()
    price = money(listing.get("price"))
    if price and listing.get("category") == "vacances":
        price += " / nuit"
    place = listing.get("city") or ""
    if place and listing.get("postal_code"):
        place += f" ({listing['postal_code']})"
    og_title = f"{title} - {price}" if price else title
    desc = " · ".join(x for x in (place, CATEGORIES.get(listing.get("category"), ""), "Abracadeal") if x)
    target = f"{SITE}/?annonce={urllib.parse.quote(lid)}"
    share = f"{SITE}/annonce/{lid}/"
    image = f"{share}apercu.jpg"
    e = lambda s: html.escape(s, quote=True)
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>{e(og_title)} sur Abracadeal</title>
<meta name="description" content="{e(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Abracadeal">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{e(og_title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(share)}">
<meta property="og:image" content="{e(image)}">
<meta property="og:image:secure_url" content="{e(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="{size[0]}">
<meta property="og:image:height" content="{size[1]}">
<meta property="og:image:alt" content="{e(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(og_title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{e(image)}">
<link rel="canonical" href="{e(target)}">
<link rel="icon" href="/favicon.ico?v=3" sizes="any">
<meta http-equiv="refresh" content="0;url={e(target)}">
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0714;color:#fff;font-family:system-ui,-apple-system,sans-serif}}a{{color:#f1b7e0}}</style>
</head><body><p><a href="{e(target)}">Voir l’annonce sur Abracadeal</a></p>
<script>location.replace({json.dumps(target)})</script>
</body></html>
"""


def main():
    listings = active_listings()
    os.makedirs(ROOT, exist_ok=True)
    keep, made, failed = set(), 0, 0
    for listing in listings:
        lid = str(listing["id"])
        if not lid.replace("-", "").isalnum():
            continue
        keep.add(lid)
        folder = os.path.join(ROOT, lid)
        src = photo_source(listing)
        sig = hashlib.sha256(json.dumps([VERSION, src, listing.get("title"), str(listing.get("price")),
                                         listing.get("city"), listing.get("postal_code"),
                                         listing.get("category")]).encode()).hexdigest()[:16]
        index = os.path.join(folder, "index.html")
        if os.path.exists(index) and f"<!-- sig:{sig} -->" in open(index, encoding="utf-8").read():
            continue
        try:
            jpeg, size = to_jpeg(fetch(src))
        except Exception as exc:  # photo illisible : on retombe sur la photo par defaut
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
    print(f"{len(listings)} annonces actives · {made} pages (re)generees · {removed} supprimees · {failed} echecs")


if __name__ == "__main__":
    main()
