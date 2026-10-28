var SR = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var smart_reader_exports = {};
  __export(smart_reader_exports, {
    readSmartSite: () => readSmartSite,
    sDecode: () => sDecode,
    smartDetail: () => smartDetail,
    smartLinks: () => smartLinks
  });
  const NAMED = { eacute: "\xE9", egrave: "\xE8", ecirc: "\xEA", agrave: "\xE0", acirc: "\xE2", ccedil: "\xE7", ocirc: "\xF4", ucirc: "\xFB", ugrave: "\xF9", icirc: "\xEE", iuml: "\xEF", euml: "\xEB", Eacute: "\xC9", Egrave: "\xC8", Agrave: "\xC0", oelig: "\u0153", euro: "\u20AC", sup2: "\xB2", deg: "\xB0", rsquo: "\u2019", lsquo: "\u2018", laquo: "\xAB", raquo: "\xBB", hellip: "\u2026", ndash: "\u2013", mdash: "\u2014", nbsp: " ", thinsp: " ", quot: '"', amp: "&", apos: "'", lt: "<", gt: ">" };
  const sDecode = (v) => String(v || "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-zA-Z]+\d?);/g, (m, n) => NAMED[n] ?? m);
  const clean = (v) => sDecode(String(v || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t   ]+/g, " ").split("\n").map((l) => l.trim()).filter(Boolean).join("\n").trim();
  const SKIP_PATH = /(blog|actualit|news|article|conseil|guide|lexique|contact|mention|cgv|cgu|conditions|confidential|cookie|rgpd|recrut|emploi|carriere|estim|vendre|faire-gerer|gestion|syndic|financ|assurance|faq|aide|login|connexion|compte|favori|alerte|newsletter|plan-du-site|sitemap|avis|temoignage|equipe|agence(s)?\/?$|qui-sommes|a-propos|services?$|honoraires|bareme|print|imprim|share|partag|tel:|mailto:|javascript:|wp-admin|wp-login|feed|tag\/|categorie?\/|author)/i;
  const LIST_PATH = /(acheter|achat|vente|vendre-|a-vendre|louer|location|annonce|biens?|nos-biens|catalog|recherche|search|resultat|offres?|stock|vehicules?|voitures?|occasions?|motos?|utilitaires?|nos-|liste|programme|immobilier)/i;
  const IMG_BAD = /(logo|icon|sprite|avatar|favicon|placeholder|blank|pixel|spacer|flag|drapeau|banner|banniere|picto|badge|marker|loader|loading|social|facebook|instagram|whatsapp|twitter|linkedin|youtube|qrcode|dpe|ges|energ|watermark|default|no[-_]?photo|noimage|thumb_?nail_?small)/i;
  function pathPattern(u) {
    return u.pathname.split("/").filter(Boolean).map((s) => /\d{3,}/.test(s) ? s.replace(/\d+/g, "#").length > 12 ? "*#" : "#" : s.split("-").length >= 4 ? "*" : s).join("/");
  }
  function isDetailish(u) {
    const last = u.pathname.replace(/\/+$/, "").split("/").pop() || "";
    return /\d{3,}/.test(last) || last.split("-").length >= 4 || /[?&](id|ref|annonce|bien|vehicule|product)=/i.test(u.search);
  }
  function smartLinks(html, page, host) {
    const groups = /* @__PURE__ */ new Map();
    const lists = /* @__PURE__ */ new Set();
    for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
      let u;
      try {
        u = new URL(sDecode(m[1]), page);
      } catch {
        continue;
      }
      if (!/^https?:$/.test(u.protocol) || u.hostname.replace(/^www\./, "") !== host) continue;
      if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|pdf|xml|zip|woff2?|mp4)(\?|$)/i.test(u.pathname)) continue;
      u.hash = "";
      const full = u.toString();
      if (SKIP_PATH.test(u.pathname)) continue;
      if (isDetailish(u)) {
        const p = pathPattern(u) + (u.search ? "?" + [...u.searchParams.keys()].sort().join("&") : "");
        if (!groups.has(p)) groups.set(p, /* @__PURE__ */ new Set());
        groups.get(p).add(full);
      } else if (LIST_PATH.test(u.pathname + u.search) || /[?&](page|p|pg|start|offset)=\d+|\/page[-/]?\d+/i.test(u.pathname + u.search)) lists.add(full);
    }
    const details = [];
    for (const [, set] of [...groups.entries()].sort((a, b) => b[1].size - a[1].size)) {
      if (set.size >= 2) details.push(...set);
    }
    return { details, lists: [...lists] };
  }
  const num = (s) => {
    const t = String(s || "").replace(/[\s  .']/g, "").replace(",", ".");
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };
  function metaAll(html, prop) {
    return [...html.matchAll(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "gi"))].map((m) => sDecode(m[1] ?? m[2] ?? "").trim()).filter(Boolean);
  }
  function jsonVal(html, keys) {
    const h = html.replace(/&quot;/g, '"');
    for (const k of keys) {
      const m = h.match(new RegExp(`"${k}"\\s*:\\s*"?([^",}\\]]{1,80})`, "i"));
      if (m && m[1].trim() && m[1] !== "null") return sDecode(m[1].trim());
    }
    return "";
  }
  function pickPhotos(html, base, ogs, ref) {
    const all = [];
    const add = (raw) => {
      if (!raw) return;
      let u;
      try {
        u = new URL(sDecode(raw.trim()), base).toString();
      } catch {
        return;
      }
      if (!/^https?:/i.test(u) || !/\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) && !/\/(image|photo|img|media|picture)s?\//i.test(u)) return;
      if (IMG_BAD.test(u.split("?")[0])) return;
      all.push(u);
    };
    ogs.forEach(add);
    for (const m of html.matchAll(/(?:src|data-src|data-lazy|data-original|data-full|data-zoom-image|data-image|data-big|data-large|href|content)=["']([^"']+\.(?:jpe?g|png|webp|avif)(?:\?[^"']*)?)["']/gi)) add(m[1]);
    for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
      const parts = m[1].split(",").map((x) => x.trim().split(/\s+/)[0]);
      add(parts[parts.length - 1]);
    }
    if (!all.length) return [];
    const key = (u) => u.split("?")[0].replace(/[-_](\d{2,4}x\d{2,4}|small|medium|thumb|mini|min|sm|xs)(?=\.\w+$)/i, "");
    const dir = (u) => u.split("?")[0].replace(/\/[^/]*$/, "");
    const counts = /* @__PURE__ */ new Map();
    for (const u of all) counts.set(dir(u), (counts.get(dir(u)) || 0) + 1);
    const ogDir = ogs.length ? dir(new URL(ogs[0], base).toString()) : "";
    let mainDir = ogDir && counts.get(ogDir) ? ogDir : [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const refOk = ref && ref.length >= 4;
    const chosen = all.filter((u) => dir(u) === mainDir || refOk && u.split("?")[0].includes(ref));
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const u of chosen) {
      const k = key(u);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(u);
    }
    return out.map((u) => /[?&](w|h|width|height|fit|size|resize)=/i.test(u) && chosen.some((c) => c === u.split("?")[0]) ? u.split("?")[0] : u).slice(0, 45);
  }
  function longestText(html) {
    const body = html.replace(/<(script|style|svg|noscript|nav|header|footer|form|select|button)[\s\S]*?<\/\1>/gi, " ");
    let best = "";
    for (const m of body.matchAll(/<(p|div|section|article|span|td)[^>]*>((?:(?!<\/?(?:div|section|article|table|ul|ol)\b)[\s\S]){120,8000}?)<\/\1>/gi)) {
      const t = clean(m[2]);
      if (t.length > best.length && t.split(/\s+/).length > 25 && !/[{};]\s*[a-z-]+\s*:/.test(t.slice(0, 200))) best = t;
    }
    return best.slice(0, 6e3);
  }
  const FUEL = [[/hybride rechargeable|plug-?in/i, "hybride rechargeable"], [/hybride/i, "hybride"], [/[ée]lectrique/i, "\xE9lectrique"], [/diesel|gazole|hdi|tdi|dci|crdi|bluehdi/i, "diesel"], [/essence|tsi|tfsi|puretech|vti/i, "essence"], [/gpl/i, "gpl"]];
  function smartDetail(html, pageUrl, sector) {
    const base = new URL(pageUrl);
    const immo = sector === "immobilier";
    if (/<meta[^>]+robots[^>]+noindex/i.test(html) && !/(€|eur)/i.test(html)) return null;
    const ogTitle = metaAll(html, "og:title")[0] || "";
    const h1 = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
    const docTitle = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    let titre = (h1 && h1.length >= 6 && h1.length <= 160 ? h1 : "") || ogTitle || docTitle;
    titre = titre.replace(/\s*[|–—-]\s*[^|–—-]{2,60}$/, (m) => /€|\d/.test(m) ? m : "").replace(/\s+/g, " ").trim();
    if (!titre) return null;
    const text = clean(html.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, " "));
    const head = h1 + " " + ogTitle + " " + docTitle;
    const priceRe = /(\d{1,3}(?:[\s  .]\d{3})+|\d{3,9})(?:[.,]\d{1,2})?\s*(?:€|eur\b|euros?)/i;
    let prix = NaN;
    const pm = head.match(priceRe);
    if (pm) prix = num(pm[1]);
    if (!(prix > 0)) {
      const j = jsonVal(html, ["itemPrice", "price", "prix", "prixVente", "prix_vente", "sale_price", "salePrice"]);
      if (/^\d{3,9}(\.\d+)?$/.test(j)) prix = Number(j);
    }
    if (!(prix > 0)) {
      const lm = text.match(new RegExp("(?:prix|loyer|tarif)[^0-9\u20AC]{0,40}" + priceRe.source, "i"));
      if (lm) prix = num(lm[1]);
    }
    if (!(prix > 0)) {
      const fm = text.match(priceRe);
      if (fm) prix = num(fm[1]);
    }
    if (!(prix >= 50 && prix < 1e8)) return null;
    const refM = base.pathname.match(/(\d{4,})(?!.*\d{4,})/);
    const reference = (jsonVal(html, ["itemId", "reference", "ref", "mandat"]) || refM?.[1] || base.pathname.replace(/\/+$/, "").split("/").pop() || "").slice(0, 80);
    const photos = pickPhotos(html, base, [...metaAll(html, "og:image"), ...Array.from({ length: 45 }, (_, i) => metaAll(html, "og:image_" + i)[0]).filter(Boolean)], refM?.[1] || "");
    if (!photos.length) return null;
    const o = { reference, url: pageUrl, titre: titre.slice(0, 160), prix: String(Math.round(prix)), photos: photos.join("|") };
    const ogDesc = metaAll(html, "og:description")[0] || metaAll(html, "description")[0] || "";
    const long = longestText(html);
    o.description = (long.length > ogDesc.replace(/\.{3}|…$/, "").length ? long : ogDesc).slice(0, 6e3);
    const cityJ = jsonVal(html, ["itemCity", "addressLocality", "city", "ville", "commune"]);
    const cpJ = jsonVal(html, ["itemZipcode", "postalCode", "zipcode", "zipCode", "codePostal", "code_postal", "cp"]);
    const cpM = (head + " " + text.slice(0, 3e3)).match(/\b([A-ZÀ-Ý][A-Za-zÀ-ÿ' -]{1,40}?)\s*\(?\b((?:0[1-9]|[1-8]\d|9[0-5]|97)\d{3})\b\)?/);
    if (cityJ && !/^\d+$/.test(cityJ)) o.ville = cityJ;
    else if (cpM) o.ville = cpM[1].trim();
    if (/^\d{5}$/.test(cpJ)) o.code_postal = cpJ;
    else if (cpM) o.code_postal = cpM[2];
    if (immo) {
      const all = head + " " + base.pathname + " " + text.slice(0, 4e3);
      o.transaction = /\b(louer|location|loyer|à louer|a-louer|par mois|\/mois|cc\b|charges comprises)/i.test(head + " " + base.pathname) ? "location" : "vente";
      o.type_bien = /terrain/i.test(head) ? "terrain" : /parking|garage|box|stationnement/i.test(head) ? "parking" : /bureau|local|commerce|boutique|fonds/i.test(head) ? "bureau" : /maison|villa|mas\b|propri[ée]t[ée]|chalet|bastide/i.test(head) ? "maison" : "appartement";
      const s = all.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)\b/i);
      if (s) o.surface = s[1];
      const p = all.match(/(\d{1,2})\s*pi[eè]ces?/i) || all.match(/\bT(\d)\b/);
      if (p) o.pieces = p[1];
      else if (/studio/i.test(head)) o.pieces = "1";
      const c = all.match(/(\d{1,2})\s*chambres?/i);
      if (c) o.chambres = c[1];
      const sdb = text.match(/(\d)\s*salles? (?:de bains?|d['’]eau)/i);
      if (sdb) o.salles_de_bain = sdb[1];
      const land = text.match(/terrain[^0-9]{0,30}(\d[\d\s.]*)\s*m(?:²|2)/i);
      if (land && o.type_bien !== "terrain") o.surface_terrain = land[1].replace(/\s/g, "");
      const dpe = (text.match(/(?:DPE|classe\s+[ée]nerg[ée]?t?i?(?:que|e)|consommation\s+(?:d['’])?[ée]nergie)[^A-Za-z0-9]{0,25}(?:classe\s*:?\s*)?([A-G])\b/i) || html.match(/data-(?:dpe|energy|energie)[a-z-]*=["']([A-G])["']/i))?.[1];
      const ges = (text.match(/(?:\bGES\b|[ée]missions?\s+de\s+gaz[^A-Z]{0,20}|classe\s+climat)[^A-Za-z0-9]{0,25}(?:classe\s*:?\s*)?([A-G])\b/i) || html.match(/data-(?:ges|climat|emission)[a-z-]*=["']([A-G])["']/i))?.[1];
      if (dpe && ges) {
        o.dpe = dpe.toUpperCase();
        o.ges = ges.toUpperCase();
      }
      const hon = text.match(/honoraires[^.\n]{0,120}/i);
      if (hon) o.honoraires = hon[0].trim();
    } else {
      const all = head + " " + text.slice(0, 5e3);
      const km = all.match(/(\d{1,3}(?:[\s. ]\d{3})+|\d{1,6})\s*km\b/i);
      if (km) o.kilometrage = km[1].replace(/[\s. ]/g, "");
      const y = all.match(/(?:ann[ée]e|mise en circulation|\bMEC|1[èe]re main|mod[èe]le)[^0-9]{0,30}(?:\d{1,2}\/)?((?:19[5-9]|20[0-3])\d)\b/i) || head.match(/\b((?:19[5-9]|20[0-3])\d)\b/);
      if (y) o.annee = y[1];
      for (const [re, v] of FUEL) if (re.test(all)) {
        o.carburant = v;
        break;
      }
      if (/bo[iî]te\s*(?:de vitesses?\s*)?:?\s*auto|automatique|\bBVA\b|\bDSG\b|\bEAT\d/i.test(all)) o.boite = "automatique";
      else if (/manuelle|\bBVM\b|m[ée]canique/i.test(all)) o.boite = "manuelle";
      const ch = all.match(/(\d{2,4})\s*(?:ch|cv din)\b/i);
      if (ch) o.puissance_din = ch[1];
      const make = head.trim().split(/\s+/)[0];
      if (make && /^[A-Za-zÀ-ÿ-]{2,}$/.test(make) && !/^(vente|achat|occasion|voiture|v[ée]hicule|annonce)$/i.test(make)) o.marque = make;
      o.etat = /\bneuf\b|0\s*km/i.test(head) ? "neuf" : "occasion";
      o.type = /\b(moto|scooter|quad|motocross|enduro|roadster|trail)\b/i.test(head + " " + base.pathname) ? "moto" : /\b(camping[- ]car|caravane|van am[ée]nag)/i.test(head) ? "camping-car" : /\b(fourgon|utilitaire|plateau|benne|L\dH\d|master|trafic|jumper|boxer|ducato|sprinter|transit|kangoo van|partner van)\b/i.test(head) ? "utilitaire" : "voiture";
    }
    return o;
  }
  async function readSmartSite(origin, homeHtml, sector, fetchHtml, extraStarts = []) {
    const t0 = Date.now();
    const host = origin.hostname.replace(/^www\./, "");
    const seenPages = /* @__PURE__ */ new Set();
    const detailQ = [];
    const listQ = [];
    const rows = [];
    const refs = /* @__PURE__ */ new Set();
    const take = (html, page) => {
      const { details, lists } = smartLinks(html, page, host);
      for (const d of details) if (!seenPages.has(d) && !detailQ.includes(d)) detailQ.push(d);
      for (const l of lists) if (!seenPages.has(l) && !listQ.includes(l) && listQ.length < 60) listQ.push(l);
    };
    take(homeHtml, origin);
    seenPages.add(origin.toString());
    for (const s of extraStarts) if (!listQ.includes(s)) listQ.unshift(s);
    let pages = 0;
    let misses = 0;
    while (listQ.length && pages < 60 && Date.now() - t0 < 2e4) {
      const batch = listQ.splice(0, 4).filter((u) => !seenPages.has(u));
      batch.forEach((u) => seenPages.add(u));
      pages += batch.length;
      await Promise.all(batch.map(async (u) => {
        try {
          const { text, url } = await fetchHtml(new URL(u));
          take(text, url);
        } catch {
        }
      }));
    }
    let i = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (i < detailQ.length && pages < 400 && Date.now() - t0 < 5e4) {
        const u = detailQ[i++];
        if (seenPages.has(u)) continue;
        seenPages.add(u);
        pages++;
        try {
          const { text, url } = await fetchHtml(new URL(u));
          const o = smartDetail(text, url.toString(), sector);
          if (o && !refs.has(o.reference)) {
            refs.add(o.reference);
            rows.push(o);
          } else if (!o) misses++;
          if (detailQ.length < 1500) take(text, url);
        } catch {
          misses++;
        }
      }
    }));
    rows.partial = i < detailQ.length;
    rows.stats = { pages, details: detailQ.length, read: rows.length, misses, ms: Date.now() - t0 };
    return rows;
  }
  return __toCommonJS(smart_reader_exports);
})();
