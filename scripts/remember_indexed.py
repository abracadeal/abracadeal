"""27/11/2026 (Anthony : « faut anticiper ce genre de choses »).
Toute page catégorie / ville / modèle qui a été une fois dans le plan du site (donc proposée à Google) est ajoutée
à data/google-seen-pages.txt. Les scripts de pages ne la cachent plus jamais ensuite (pas de noindex, pas de renvoi
vers une autre page, page « Aucune … en ce moment » si tout est vendu). Évite de perdre des pages que Google connaît
quand les annonces se vendent (chute des impressions du 17 au 24/11/2026)."""
import os, re

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LIST = os.path.join(BASE, "data", "google-seen-pages.txt")
MARK = "# Ajoutées automatiquement (pages passées par le plan du site) :"

def main():
    lines = open(LIST, encoding="utf-8").read().splitlines() if os.path.exists(LIST) else []
    known = {l.strip().strip("/") for l in lines if l.strip() and not l.startswith("#")}
    found = []
    for sm in ("sitemap-categories.xml", "sitemap-auto.xml"):
        p = os.path.join(BASE, sm)
        if not os.path.exists(p):
            continue
        for loc in re.findall(r"<loc>https://abracadeal\.fr/([^<]+)</loc>", open(p, encoding="utf-8").read()):
            path = loc.strip("/")
            if path.startswith(("annonces/", "auto/")) and "?" not in path and path not in known:
                known.add(path); found.append(path)
    if not found:
        print("aucune nouvelle page"); return
    if MARK not in lines:
        lines.append(MARK)
    lines += sorted(found)
    with open(LIST, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"{len(found)} page(s) ajoutée(s)")

if __name__ == "__main__":
    main()
