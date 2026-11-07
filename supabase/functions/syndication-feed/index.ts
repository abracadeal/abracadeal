// 07/11/2026 (Claude, demande d'Anthony) — Passerelle Abracadeal : flux de diffusion du stock des pros vers d'autres sites.
// GET /functions/v1/syndication-feed?portal=<code>&token=<jeton du portail>[&format=abracadeal-xml|trovit|json][&vertical=vehicules|immobilier]
// - Seules les annonces actives des pros qui ont coché ce site dans « Diffuser mes annonces » sortent dans le flux.
// - Le jeton est propre à chaque site (créé dans admin-diffusion.html, stocké haché en base).
// - Photos : celles des sites des pros sont données telles quelles ; seule la 1re photo est servie par Abracadeal.
// - Réponse gardée en cache 1 h (les sites relisent les flux une à quelques fois par jour).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const esc = (v: unknown) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (v: unknown) => "<![CDATA[" + String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/]]>/g, "]]]]><![CDATA[>") + "]]>";
const tag = (n: string, v: unknown, raw = false) => (v === null || v === undefined || v === "") ? "" : `<${n}>${raw ? cdata(v) : esc(v)}</${n}>`;
const meta = (s: string | null) => { try { return s ? JSON.parse(decodeURIComponent(s)) : {}; } catch { return {}; } };
const num = (v: unknown) => (v === null || v === undefined || v === "") ? "" : String(Math.round(Number(v)));

type L = Record<string, any>;
function describe(l: L, v: L) {
  if (l.description && String(l.description).trim().length > 30) return String(l.description).trim();
  const parts: string[] = [l.title];
  if (v.finish) parts.push("Finition : " + v.finish);
  const specs = [l.year && "Année " + l.year, l.mileage != null && Number(l.mileage).toLocaleString("fr-FR") + " km", l.fuel, l.transmission, v.color && "Couleur " + String(v.color).toLowerCase(), v.dinPower && v.dinPower + " ch"].filter(Boolean);
  if (specs.length) parts.push(specs.join(" · "));
  if (Array.isArray(v.equipment) && v.equipment.length) parts.push("Équipements : " + v.equipment.slice(0, 40).join(", "));
  return parts.filter(Boolean).join("\n");
}

function abracadealXml(feed: L, items: L[]) {
  const out = [`<?xml version="1.0" encoding="UTF-8"?>`, `<abracadeal version="1" portail="${esc(feed.portal)}" genere_le="${esc(feed.generated_at)}" nombre="${items.length}">`];
  for (const l of items) {
    const v = meta(l.vmeta), im = meta(l.imeta);
    out.push(`<annonce id="${esc(l.id)}">`,
      tag("reference", l.reference), tag("url", l.url), tag("categorie", l.category), tag("sous_categorie", l.subcategory),
      tag("titre", l.title, true), tag("description", describe(l, v), true),
      l.price != null ? `<prix devise="EUR">${num(l.price)}</prix>` : "",
      tag("ville", l.city), tag("code_postal", l.postal_code), `<pays>FR</pays>`);
    if (l.category === "vehicules") {
      out.push("<vehicule>", tag("marque", l.make), tag("modele", l.model), tag("version", v.finish, true), tag("annee", l.year),
        tag("premiere_immatriculation", v.firstRegistration), tag("kilometrage", num(l.mileage)), tag("carburant", l.fuel), tag("boite", l.transmission),
        tag("carrosserie", v.body), tag("couleur", v.color), tag("puissance_din", v.dinPower), tag("puissance_fiscale", v.fiscalPower),
        tag("portes", v.doors), tag("places", v.seats), tag("co2", v.co2), tag("critair", l.crit_air));
      if (Array.isArray(v.equipment) && v.equipment.length) out.push("<equipements>" + v.equipment.map((e: string) => tag("equipement", e, true)).join("") + "</equipements>");
      out.push("</vehicule>");
    }
    if (l.category === "immobilier" && Object.keys(im).length) {
      out.push("<immobilier>" + Object.entries(im).filter(([, x]) => x !== null && x !== "" && typeof x !== "object").map(([k, x]) => `<champ nom="${esc(k)}">${esc(x)}</champ>`).join("") + "</immobilier>");
    }
    out.push("<photos>" + (l.photos || []).slice(0, 45).map((p: string, i: number) => `<photo ordre="${i + 1}">${esc(p)}</photo>`).join("") + "</photos>",
      "<vendeur>", tag("nom", l.seller?.name, true), tag("ville", l.seller?.city), tag("telephone", l.contact?.phone), tag("email", l.contact?.email), "</vendeur>",
      tag("date_creation", l.created_at), tag("date_modification", l.updated_at), "</annonce>");
  }
  out.push("</abracadeal>");
  return out.join("\n");
}

// Format Trovit (repris aussi par Mitula, LeParking…) : un flux par univers (voitures ou immobilier).
function trovitXml(items: L[], vertical: string) {
  const out = [`<?xml version="1.0" encoding="UTF-8"?>`, `<trovit>`];
  for (const l of items) {
    if (l.category !== vertical) continue;
    const v = meta(l.vmeta), im = meta(l.imeta);
    out.push("<ad>", tag("id", l.id, true), tag("url", l.url, true), tag("title", l.title, true), tag("content", describe(l, v), true),
      l.price != null ? tag("price", num(l.price), true) : "", tag("city", l.city, true), tag("postcode", l.postal_code, true));
    if (vertical === "vehicules") {
      out.push(tag("make", l.make, true), tag("model", l.model, true), tag("mileage", num(l.mileage), true), tag("year", l.year, true),
        tag("fuel", l.fuel, true), tag("transmission", l.transmission, true), tag("color", v.color, true), tag("doors", v.doors, true),
        tag("car_type", v.body, true), tag("engine_size", v.dinPower ? v.dinPower + " ch" : "", true), tag("is_new", "0", true));
    } else {
      const sale = /loc/i.test(String(im.transaction || l.subcategory || "")) ? "For rent" : "For sale";
      out.push(tag("type", sale, true), tag("property_type", im.propertyType || im.type || "", true), tag("floor_area", im.surface || im.livingArea || "", true),
        tag("rooms", im.rooms || im.pieces || "", true), tag("bathrooms", im.bathrooms || "", true));
    }
    out.push("<pictures>" + (l.photos || []).slice(0, 20).map((p: string) => `<picture>${tag("picture_url", p, true)}</picture>`).join("") + "</pictures>",
      tag("agency", l.seller?.name, true), tag("date", String(l.updated_at || "").slice(0, 10), true), "</ad>");
  }
  out.push("</trovit>");
  return out.join("\n");
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const portal = (u.searchParams.get("portal") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const token = (u.searchParams.get("token") || "").replace(/[^a-f0-9]/gi, "");
  if (!portal || token.length < 32) return new Response("Paramètres manquants.", { status: 400 });
  const { data, error } = await db.rpc("syndication_feed_public", { p_portal: portal, p_token: token });
  if (error) return new Response("Flux indisponible.", { status: 500 });
  if (!data) return new Response("Accès refusé.", { status: 403 });
  const fmt = (u.searchParams.get("format") || data.format || "abracadeal-xml").toLowerCase();
  const items: L[] = data.listings || [];
  const headers = { "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" };
  if (fmt === "json") return new Response(JSON.stringify(data), { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
  if (fmt === "trovit") {
    const vertical = (u.searchParams.get("vertical") || "vehicules") === "immobilier" ? "immobilier" : "vehicules";
    return new Response(trovitXml(items, vertical), { headers: { ...headers, "Content-Type": "application/xml; charset=utf-8" } });
  }
  return new Response(abracadealXml(data, items), { headers: { ...headers, "Content-Type": "application/xml; charset=utf-8" } });
});
