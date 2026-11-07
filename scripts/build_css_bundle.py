#!/usr/bin/env python3
"""08/11/2026 (Claude, vitesse du site) — Regroupe les feuilles de style de l'en-tête d'index.html en UN seul fichier.

Les sources restent les fichiers assets/*.css et les blocs <style> d'origine : ils sont rangés, dans leur ordre exact,
dans <template id="abraca-css-sources"> (le navigateur ne charge rien de ce qui est dans un <template>).
Ce script les concatène dans cet ordre, compacte le résultat (rcssmin) dans assets/abraca-head.min.css
et met à jour la version (?v=empreinte) du lien unique <link id="abraca-css-bundle">.

Pour modifier un style : modifier le fichier .css d'origine (ou le bloc <style> dans le <template>), comme avant.
Le workflow .github/workflows/css-bundle.yml relance ce script à chaque push et publie le fichier regroupé.

  python scripts/build_css_bundle.py          # reconstruit le fichier regroupé
  python scripts/build_css_bundle.py --init   # (une seule fois) range les feuilles de l'en-tête dans le <template>
"""
import hashlib, os, re, sys
import rcssmin

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(BASE, "index.html")
OUT = "assets/abraca-head.min.css"
TPL_OPEN = '<template id="abraca-css-sources">'
LINK_RE = re.compile(r'<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(assets/[^"?]+\.css)(?:\?[^"]*)?"[^>]*>')
STYLE_RE = re.compile(r'<style\b[^>]*>[\s\S]*?</style>')
BUNDLE_LINK = '<link rel="stylesheet" id="abraca-css-bundle" href="%s?v=%s">'


def init(html):
    head_end = html.index("</head>")
    head = html[:head_end]
    first = LINK_RE.search(head)
    if not first:
        sys.exit("aucune feuille locale dans l'en-tête")
    start = first.start()
    zone = head[start:]
    tags = [m for m in re.finditer(LINK_RE.pattern + "|" + STYLE_RE.pattern, zone)]
    kept = zone
    for m in reversed(tags):
        kept = kept[:m.start()] + kept[m.end():]
    template = TPL_OPEN + "\n" + "\n".join(m.group(0) for m in tags) + "\n</template>\n"
    placeholder = BUNDLE_LINK % (OUT, "0") + "\n"
    return head[:start] + placeholder + kept + template + html[head_end:]


def build(html):
    i = html.index(TPL_OPEN)
    j = html.index("</template>", i)
    tpl = html[i + len(TPL_OPEN):j]
    parts = []
    for m in re.finditer(LINK_RE.pattern + "|" + STYLE_RE.pattern, tpl):
        if m.group(1):
            with open(os.path.join(BASE, m.group(1)), encoding="utf-8") as f:
                parts.append(f.read())
        else:
            parts.append(re.sub(r"^<style\b[^>]*>|</style>$", "", m.group(0)))
    css = rcssmin.cssmin("\n".join(parts))
    with open(os.path.join(BASE, OUT), "w", encoding="utf-8") as f:
        f.write(css)
    v = hashlib.sha256(css.encode()).hexdigest()[:10]
    html2 = re.sub(r'<link rel="stylesheet" id="abraca-css-bundle" href="[^"]*">', BUNDLE_LINK % (OUT, v), html)
    return html2, len(parts), len(css)


if __name__ == "__main__":
    with open(INDEX, encoding="utf-8") as f:
        html = f.read()
    if "--init" in sys.argv:
        if TPL_OPEN in html:
            sys.exit("déjà initialisé")
        html = init(html)
    html, n, size = build(html)
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"{n} sources regroupées → {OUT} ({size} octets)")
