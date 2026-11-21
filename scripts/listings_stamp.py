"""21/11/2026 (quota Egress Supabase) : petite vérification avant de tout relire.
Lit seulement la date de la dernière modification d'annonce et le nombre d'annonces en ligne (quelques octets).
Si rien n'a changé depuis le dernier passage, les scripts de pages ne relisent pas toutes les annonces.
Un passage complet est quand même fait toutes les 6 heures (annonces arrivées à expiration, sécurité)."""
import datetime, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import abraca_gzip  # noqa: F401
from build_share_pages import SUPABASE_URL, SUPABASE_KEY

STAMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "listings-stamp.txt")


def current():
    h = {"apikey": SUPABASE_KEY, "User-Agent": "abracadeal-share-pages"}
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/listings?select=updated_at&order=updated_at.desc&limit=1", headers=h)
    with urllib.request.urlopen(req, timeout=30) as r:
        last = r.read().decode()
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/listings?select=id&status=eq.active&limit=1",
                                 headers={**h, "Prefer": "count=exact"})
    with urllib.request.urlopen(req, timeout=30) as r:
        count = r.headers.get("Content-Range", "")
    return f"{last}|{count}"


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "check"
    try:
        cur = current()
    except Exception as e:  # en cas de doute, on fait le passage complet
        print(f"run=true  # vérification impossible : {e}")
        return
    if mode == "save":
        os.makedirs(os.path.dirname(STAMP), exist_ok=True)
        with open(STAMP, "w", encoding="utf-8") as f:
            f.write(cur + "\n")
        return
    try:
        old = open(STAMP, encoding="utf-8").read().strip()
    except OSError:
        old = ""
    force = os.environ.get("GITHUB_EVENT_NAME", "schedule") != "schedule" or datetime.datetime.utcnow().hour % 6 == 0
    print("run=" + ("true" if (force or cur != old) else "false"))


if __name__ == "__main__":
    main()
