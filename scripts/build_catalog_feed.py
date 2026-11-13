"""Catalogue public en fichier statique — 13/11/2026 (Claude, demande d'Anthony : quota Supabase).

Le catalogue des annonces (rpc public_catalog, ~1,3 Mo) était téléchargé depuis Supabase à chaque visite :
92 % du trafic sortant du projet (plan gratuit limité à 5 Go/mois).
Ce script l'écrit dans feeds/catalog.json, servi par GitHub Pages (gratuit, en cache).
Le site lit ce fichier, puis demande à Supabase seulement les annonces modifiées depuis `at`
(rpc public_catalog_since) et la liste des identifiants en ligne.
"""
import datetime, json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_share_pages import SUPABASE_URL, SUPABASE_KEY, BASE

OUT = os.path.join(BASE, "feeds", "catalog.json")


def main():
    # Heure prise AVANT la lecture : une annonce modifiée pendant la lecture sera reprise par le complément.
    at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/rpc/public_catalog", data=b"{}", method="POST",
                                 headers={"User-Agent": "abracadeal-share-pages", "apikey": SUPABASE_KEY,
                                          "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        rows = json.load(r)
    if not isinstance(rows, list) or not rows:
        print("catalog.json : catalogue vide ou illisible, fichier conservé")
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"at": at, "rows": rows}, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, OUT)
    print(f"catalog.json : {len(rows)} annonces")


if __name__ == "__main__":
    main()
