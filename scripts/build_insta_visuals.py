"""16/11/2026 (Claude) : visuels Instagram d'annonces Abracadeal (compte @abracadeal.fr).

Usage : python scripts/build_insta_visuals.py <id_annonce> [<id_annonce> ...]
Pour chaque annonce, crée out/insta/<id>/ :
  1.jpg      couverture 1080x1350 : grande photo + bandeau violet (titre, infos, prix en or, abracadeal.fr)
  2..5.jpg   photos suivantes 1080x1350 (carrousel) avec un petit bandeau abracadeal.fr
  legende.txt  texte du post (titre, prix, ville, « lien en bio », hashtags)
Lancé par le workflow « Visuels Instagram » (à la demande) ; les fichiers sont poussés sur la branche insta-visuals
(jamais publiée sur le site).
"""
import io, json, os, re, sys, textwrap, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SUPABASE_URL = "https://jplzvxmpbpjssyinozap.supabase.co"
SUPABASE_KEY = "sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF"  # clé publique du site
R2 = "https://pub-9747954003f04922a082752db15aeeed.r2.dev/listing-images/"
W, H = 1080, 1350
GOLD, WHITE, GREY = (247, 189, 75), (255, 255, 255), (214, 200, 230)
BG1, BG2 = (27, 16, 36), (52, 26, 72)


def font(bold, size):
    for p in (["fonts/Montserrat-ExtraBold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"] if bold
              else ["fonts/Montserrat-SemiBold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]):
        fp = p if p.startswith("/") else os.path.join(BASE, "out", p)
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "User-Agent": "abracadeal-insta"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else json.loads(data)


def listing(lid):
    sel = "id,title,price,city,category,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,seller_type,listing_photos(storage_path,position)"
    rows = get(f"{SUPABASE_URL}/rest/v1/listings?select={urllib.parse.quote(sel, safe=',()_')}&id=eq.{lid}&status=eq.active")
    if not rows:
        raise SystemExit(f"annonce introuvable ou hors ligne : {lid}")
    l = rows[0]
    l["listing_photos"] = sorted(l.get("listing_photos") or [], key=lambda p: p.get("position") or 0)
    return l


def cover_crop(im, w, h):
    im = im.convert("RGB")
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def price_txt(p):
    if p is None:
        return ""
    p = float(p)
    return (f"{p:,.0f}".replace(",", " ") + " €") if p >= 1 else ""


def info_line(l):
    bits = []
    if l.get("vehicle_year"): bits.append(str(l["vehicle_year"]))
    if l.get("mileage"): bits.append(f"{int(l['mileage']):,}".replace(",", " ") + " km")
    if l.get("fuel"): bits.append(str(l["fuel"]).capitalize())
    if l.get("transmission"): bits.append(str(l["transmission"]).capitalize())
    return " · ".join(bits)


def nice_title(t):
    t = re.sub(r"\s+", " ", str(t or "")).strip()
    if t.isupper():
        t = " ".join(w if any(c.isdigit() for c in w) or (len(w) <= 3 and not w.isalpha()) else w.capitalize() for w in t.split())
    return t


def gradient(w, h):
    g = Image.new("RGB", (w, h), BG1)
    d = ImageDraw.Draw(g)
    for y in range(h):
        k = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(BG2[i] * (1 - k) + BG1[i] * k) for i in range(3)))
    return g


def logo(width):
    lg = Image.open(os.path.join(BASE, "assets", "abracadeal-logo-h96.png")).convert("RGBA")
    r = width / lg.width
    return lg.resize((width, round(lg.height * r)), Image.LANCZOS)


def make_cover(l, photo):
    img = Image.new("RGB", (W, H), BG1)
    ph_h = 930
    img.paste(cover_crop(photo, W, ph_h), (0, 0))
    band = gradient(W, H - ph_h)
    img.paste(band, (0, ph_h))
    # fondu photo → bandeau
    fade = Image.new("L", (W, 120), 0)
    fd = ImageDraw.Draw(fade)
    for y in range(120):
        fd.line([(0, y), (W, y)], fill=round(255 * y / 119))
    img.paste(Image.new("RGB", (W, 120), BG2), (0, ph_h - 120), fade)
    d = ImageDraw.Draw(img)
    pad = 60
    title = nice_title(l["title"])
    tf = font(True, 50)
    lines = textwrap.wrap(title, width=30)[:2]
    if len(textwrap.wrap(title, width=30)) > 2:
        lines[-1] = lines[-1].rstrip(" ,.-–") + "…"
    y = ph_h + 10
    for ln in lines:
        d.text((pad, y), ln, font=tf, fill=WHITE)
        y += 62
    sub = " · ".join(x for x in [info_line(l), l.get("city") or ""] if x)
    if sub:
        d.text((pad, y + 6), sub, font=font(False, 34), fill=GREY)
    pr = price_txt(l.get("price"))
    if pr:
        d.text((pad, H - 150), pr, font=font(True, 84), fill=GOLD)
    lg = logo(330)
    img.paste(lg, (W - lg.width - 45, H - lg.height - 70), lg)
    d.text((W - 45, H - 52), "abracadeal.fr", font=font(False, 30), fill=GREY, anchor="ra")
    return img


def make_slide(photo):
    img = cover_crop(photo, W, H)
    bar = Image.new("RGBA", (W, 110), (27, 16, 36, 215))
    img = img.convert("RGBA")
    img.alpha_composite(bar, (0, H - 110))
    lg = logo(250)
    img.alpha_composite(lg, (40, H - 110 + (110 - lg.height) // 2))
    d = ImageDraw.Draw(img)
    d.text((W - 40, H - 55), "abracadeal.fr", font=font(False, 34), fill=GOLD, anchor="rm")
    return img.convert("RGB")


TAGS = {
    "vehicules": "#voitureoccasion #occasion #auto #voiture #annonceauto #petitesannonces #abracadeal",
    "immobilier": "#immobilier #maisonavendre #appartement #villa #immo #petitesannonces #abracadeal",
}


def caption(l):
    city = l.get("city") or ""
    city_tag = "#" + re.sub(r"[^a-z0-9]", "", urllib.parse.unquote(city).lower().replace("é", "e").replace("è", "e")) if city else ""
    lines = [nice_title(l["title"])]
    pr = price_txt(l.get("price"))
    info = info_line(l)
    if pr: lines.append(f"💰 {pr}")
    if info: lines.append(f"ℹ️ {info}")
    if city: lines.append(f"📍 {city}")
    lines += ["", "👉 Annonce complète, photos et contact : lien en bio (abracadeal.fr)",
              "Petites annonces gratuites, sans commission.", "",
              " ".join(x for x in [TAGS.get(l.get("category"), "#petitesannonces #bonplan #abracadeal"), city_tag, "#cotedazur" if l.get("category") == "immobilier" else ""] if x)]
    return "\n".join(lines)


def main(ids):
    os.makedirs(os.path.join(BASE, "out", "fonts"), exist_ok=True)
    for name in ("Montserrat-ExtraBold.ttf", "Montserrat-SemiBold.ttf"):
        fp = os.path.join(BASE, "out", "fonts", name)
        if not os.path.exists(fp):
            try:
                data = get(f"https://github.com/google/fonts/raw/main/ofl/montserrat/static/{name}", binary=True)
                open(fp, "wb").write(data)
            except Exception:
                try:
                    data = get("https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf", binary=True)
                    open(fp, "wb").write(data)
                except Exception as e:
                    print("police Montserrat indisponible :", e)
    for lid in ids:
        l = listing(lid)
        out = os.path.join(BASE, "out", "insta", lid)
        os.makedirs(out, exist_ok=True)
        photos = []
        for p in l["listing_photos"][:5]:
            try:
                photos.append(Image.open(io.BytesIO(get(R2 + urllib.parse.quote(p["storage_path"]), binary=True))))
            except Exception as e:
                print("photo illisible", p["storage_path"], e)
        if not photos:
            print("aucune photo :", lid)
            continue
        make_cover(l, photos[0]).save(os.path.join(out, "1.jpg"), quality=92)
        for i, ph in enumerate(photos[1:], start=2):
            make_slide(ph).save(os.path.join(out, f"{i}.jpg"), quality=90)
        open(os.path.join(out, "legende.txt"), "w", encoding="utf-8").write(caption(l))
        print(f"{lid} : {len(photos)} visuels")


if __name__ == "__main__":
    ids = [x for a in sys.argv[1:] for x in re.split(r"[,\s]+", a) if x]
    if not ids:
        raise SystemExit("usage : build_insta_visuals.py <id> [<id>…]")
    main(ids)
