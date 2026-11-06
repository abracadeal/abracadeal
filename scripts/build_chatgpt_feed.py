"""Flux produits ChatGPT (OpenAI Commerce, « Products » file upload) — 03/11/2026, demande d'Anthony.

Toutes les annonces publiques actives qui sont de vrais produits (véhicules, high-tech, maison, mode…), au format
https://developers.openai.com/commerce/specs/file-upload/products :
  - 9 champs obligatoires : item_id, title, description, url, brand, seller_name, image_url, availability, price ;
  - price = « 19990.00 EUR », availability = in_stock, condition = used / new ;
  - recherche seulement (is_eligible_search = true, is_eligible_checkout = false) : l'acheteur contacte le vendeur sur Abracadeal.
Écartés : immobilier, vacances, emploi, services (pas des produits), annonces sans prix, sans photo ou sans marque
(la marque est obligatoire et la spec interdit les valeurs inventées).

Fichier : feeds/chatgpt-products.jsonl (JSONL, UTF-8), publié sur https://abracadeal.fr/feeds/chatgpt-products.jsonl. Prêt pour le jour où OpenAI ouvre la France ou accepte Abracadeal
(formulaire chatgpt.com/merchants, rempli par Anthony). Aucune donnée personnelle : pas de nom ni de téléphone de particulier.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_share_pages import (SITE, BASE, PRO_PAGES, NON_PRODUCT_CATEGORIES, active_listings, parse_description,
                               photo_urls, display_title, detect_brand, near_city, specs_of, CATEGORIES)

OUT_DIR = os.path.join(BASE, "feeds")
OUT = os.path.join(OUT_DIR, "chatgpt-products.jsonl")
SUBS = {"voitures": "Voitures", "motos": "Motos", "utilitaires": "Utilitaires", "caravaning": "Caravaning",
        "nautisme": "Nautisme", "velos": "Vélos"}


def feed_title(listing):
    """Titre lisible + ville (et grande ville voisine) : « Volkswagen Taigo … occasion – Les Ponts-de-Cé, Angers »."""
    t = display_title(listing)
    if listing.get("category") == "vehicules" and "occasion" not in t.lower():
        if listing.get("vehicle_year") and str(listing["vehicle_year"]) not in t:
            t += f" {listing['vehicle_year']}"
        t += " occasion"
    city = listing.get("city") or ""
    near = near_city(listing)
    if city:
        t += " – " + (f"{city}, {near}" if near else city)
    return t[:150]


def seller(listing):
    if listing.get("seller_type") == "professionnel":
        pro = PRO_PAGES.get(str(listing.get("owner_id") or ""))
        if pro and pro.get("name"):
            return pro["name"], (f"{SITE}/{pro['short']}" if pro.get("short") else f"{SITE}/{pro['path']}/")
        return "Vendeur professionnel sur Abracadeal", None
    return "Particulier sur Abracadeal", None


def row(listing):
    if listing.get("category") in NON_PRODUCT_CATEGORIES:
        return None
    price = listing.get("price")
    try:
        price = float(price)
    except (TypeError, ValueError):
        return None
    if price <= 0:
        return None
    text, meta = parse_description(listing.get("description"), listing)
    # Pas de téléphone ni d'e-mail dans le flux (annonces de particuliers) : la prise de contact se fait sur Abracadeal.
    desc = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "", " ".join(text.split()))
    desc = re.sub(r"(?:(?:\+|00)33\s?|0)[1-9](?:[\s.-]?\d{2}){4}", "", desc)
    desc = re.sub(r"\s{2,}", " ", desc).strip()
    brand = detect_brand(listing, desc)
    photos = [p for p in photo_urls(listing) if p.startswith("https://")]
    if not brand or not photos:
        return None
    lid = str(listing["id"])
    specs = "; ".join(f"{k} : {v}" for k, v in specs_of(listing, meta))
    full_desc = " · ".join(x for x in (desc, specs, f"Ville : {listing.get('city')}" if listing.get("city") else "") if x)
    name, seller_url = seller(listing)
    cond = (listing.get("item_condition") or "").lower()
    cat = CATEGORIES.get(listing.get("category"), "Annonces")
    sub = SUBS.get(meta.get("sub") or "")
    r = {
        "item_id": lid,
        "title": feed_title(listing),
        "description": (full_desc or display_title(listing))[:5000],
        "url": f"{SITE}/annonce/{lid}/",
        "brand": brand,
        "seller_name": name,
        "image_url": photos[0],
        "availability": "in_stock",
        "price": f"{price:.2f} EUR",
        "condition": "new" if cond.startswith("neuf") else "used",
        "product_category": " > ".join(x for x in (cat, sub) if x),
        "is_eligible_search": True,
        "is_eligible_checkout": False,
        "target_countries": ["FR"],
        "store_country": "FR",
    }
    if len(photos) > 1:
        r["additional_image_urls"] = photos[1:11]
    if seller_url:
        r["seller_url"] = seller_url
    return {k: v for k, v in r.items() if v not in (None, "", [])}


def main():
    rows = [r for r in (row(l) for l in active_listings()) if r]
    os.makedirs(OUT_DIR, exist_ok=True)
    data = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in sorted(rows, key=lambda r: r["item_id"]))
    old = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else None
    if data != old:
        with open(OUT, "w", encoding="utf-8") as f:
            f.write(data)
    print(f"Flux ChatGPT : {len(rows)} produits")


if __name__ == "__main__":
    main()
