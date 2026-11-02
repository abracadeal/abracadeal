"""02/11/2026 — Claude (Anthony : « les annonces de Life Cars peuvent être référencées rapidement ? »).

Prévient immédiatement les moteurs IndexNow (Bing, Yandex, Seznam, Naver… ; Bing alimente aussi la recherche de ChatGPT et
de Copilot) des pages publiques créées ou modifiées par le dernier commit automatique : annonces, pages pros, catégories.
Google ne lit pas IndexNow : il passe par sitemap.xml (déclaré dans robots.txt et la Search Console).
Lit la liste des fichiers modifiés sur l'entrée standard (git diff --name-only).
"""
import glob, json, os, sys, urllib.request

SITE = "https://abracadeal.fr"
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
keys = [os.path.basename(p)[:-4] for p in glob.glob(os.path.join(BASE, "*.txt")) if len(os.path.basename(p)) == 36]
if not keys:
    sys.exit("Clé IndexNow introuvable")
key = keys[0]
urls = []
for line in sys.stdin:
    p = line.strip()
    if not p.endswith("index.html") or not os.path.exists(os.path.join(BASE, p)):
        continue
    if not p.split("/")[0] in ("annonce", "annonces", "auto", "garage", "immo", "professionnel"):
        continue
    urls.append(f"{SITE}/{p[:-len('index.html')]}")
urls = sorted(set(urls))[:10000]
if not urls:
    print("IndexNow : aucune page à signaler"); sys.exit(0)
body = json.dumps({"host": "abracadeal.fr", "key": key, "keyLocation": f"{SITE}/{key}.txt", "urlList": urls}).encode()
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f"IndexNow : {len(urls)} page(s) signalée(s), réponse {r.status}")
except Exception as e:  # ne bloque jamais la publication des pages
    print(f"IndexNow : échec ({e})")
