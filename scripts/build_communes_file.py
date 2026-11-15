"""15/11/2026 (Claude) : liste officielle des communes en fichier statique (feeds/communes.txt), servie par GitHub Pages.

Pourquoi : pro-stock-sync chargeait cette liste (1,4 Mo) depuis Supabase (rpc commune_list_compact) environ 250 fois par jour,
soit ~350 Mo/jour de trafic sortant Supabase — 85 % du quota gratuit (5 Go/mois). Lue sur abracadeal.fr, elle ne coûte plus rien.

Même format que commune_list_compact : une commune par ligne « nom|cp1,cp2|population|lat|lon ».
Source : geo.api.gouv.fr (la même que la table commune_ref). Refait au plus une fois par semaine.
"""
import datetime, json, os, sys, urllib.request

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(BASE, "feeds", "communes.txt")
META = os.path.join(BASE, "feeds", "communes.json")
URL = "https://geo.api.gouv.fr/communes?fields=nom,codesPostaux,population,centre&format=json"


def main():
    today = datetime.date.today()
    try:
        meta = json.load(open(META, encoding="utf-8"))
        last = datetime.date.fromisoformat(meta.get("updated", "2000-01-01"))
        if os.path.exists(OUT) and (today - last).days < 7 and "--force" not in sys.argv:
            print(f"communes : fichier du {last}, inchangé")
            return
    except Exception:
        pass
    req = urllib.request.Request(URL, headers={"User-Agent": "abracadeal-communes"})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    if not isinstance(data, list) or len(data) < 30000:
        print("communes : liste incomplète, fichier gardé", file=sys.stderr)
        return
    lines = []
    for c in data:
        nom = str(c.get("nom") or "").replace("|", " ").replace("\n", " ").strip()
        if not nom:
            continue
        cps = ",".join(str(x) for x in (c.get("codesPostaux") or []))
        coords = ((c.get("centre") or {}).get("coordinates") or [None, None])
        lon, lat = coords[0], coords[1]
        fmt = lambda v: f"{float(v):.4f}" if v is not None else ""
        lines.append(f"{nom}|{cps}|{int(c.get('population') or 0)}|{fmt(lat)}|{fmt(lon)}")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    with open(META, "w", encoding="utf-8") as f:
        json.dump({"updated": today.isoformat(), "count": len(lines)}, f)
    print(f"communes : {len(lines)} lignes écrites")


if __name__ == "__main__":
    main()
