// 04/11/2026 — Claude (Anthony : « faut réparer aussi au cas où c'est bon ») : agences OFIM (www.ofim.fr, La Réunion).
// La page « Agence-immobiliere-de-<ville>-ag<n>.html » montre les autres agences du réseau et des « coups de cœur » d'autres
// villes : le robot les prenait pour des biens (aperçu d'Ofim Saint-Gilles raté). Les biens de l'agence sont sur ses listes
// « liste-<n>-30-Vente-… » et « liste-<n>-10-Location-… » (10 par page, ?start=10, 20…), chaque fiche est /<n° du bien>/….html.
import { smartDetail, sDecode } from './smart-reader.ts';
import { crawlCatalogue, type CrawlMemory } from './resumable-crawl.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const ofimAgencyId=(url:URL)=>/^(?:www\.)?ofim\.fr$/i.test(url.hostname)?(url.pathname.match(/-ag(\d+)\.html$/i)?.[1]||url.pathname.match(/^\/liste-(\d+)-\d+-/i)?.[1]||null):null;
const FICHE=/href="(https:\/\/www\.ofim\.fr\/\d{4,7}\/(?:Vente|Location)-[^"#?]+\.html)"/gi;
export function ofimLinks(html:string,url:URL,ag:string){
  const path=url.pathname;
  const lists=[...new Set([...html.matchAll(/href="(https:\/\/www\.ofim\.fr\/liste-(\d+)-(?:10|30)-[^"#]+\.html\?start=\d+)"/gi)].filter(m=>m[2]===ag&&new URL(m[1].replace(/&amp;/g,'&')).pathname===path).map(m=>m[1].replace(/&amp;/g,'&')))];
  const details=[...new Set([...html.matchAll(FICHE)].map(m=>m[1]))];
  return{lists,details};
}
// Commune officielle d'après la ville écrite dans l'adresse de la fiche (/<n°>/Vente-<Type>-<VILLE>-ile-de-la-Reunion-…).
// Sans cela « PORT » devenait Port (Ain) et « SAINT-GILLES-LES-HAUTS » Saint-Denis.
const REUNION:[RegExp,string,string][]=[
  [/^SAINT-GILLES-LES-HAUTS$/,'Saint-Paul','97435'],[/^(SAINT-GILLES(-LES-BAINS)?|HERMITAGE|L-HERMITAGE|BOUCAN-CANOT|SALINE(-LES-BAINS)?|LA-SALINE(-LES-BAINS)?)$/,'Saint-Paul','97434'],
  [/^(SAINT-PAUL|PLATEAU-CAILLOUX|GUILLAUME|BOIS-DE-NEFLES-SAINT-PAUL)$/,'Saint-Paul','97460'],[/^(LE-)?PORT$/,'Le Port','97420'],[/^(LA-)?POSSESSION$/,'La Possession','97419'],
  [/^SAINT-LEU$/,'Saint-Leu','97436'],[/^(L-)?ETANG-SALE(-LES-HAUTS|-LES-BAINS)?$/,"L'Étang-Salé",'97427'],[/^(LES-)?AVIRONS$/,'Les Avirons','97425'],
  [/^SAINT-LOUIS|^RIVIERE-SAINT-LOUIS$/,'Saint-Louis','97450'],[/^(SAINT-PIERRE|RAVINE-DES-CABRIS)$/,'Saint-Pierre','97410'],[/^(LE-)?TAMPON$/,'Le Tampon','97430'],
  [/^SAINT-JOSEPH$/,'Saint-Joseph','97480'],[/^PETITE-ILE$/,'Petite-Île','97429'],[/^SAINT-PHILIPPE$/,'Saint-Philippe','97442'],[/^ENTRE-DEUX$/,'Entre-Deux','97414'],
  [/^(SAINT-DENIS|MONTAGNE|LA-MONTAGNE)$/,'Saint-Denis','97400'],[/^SAINTE-CLOTILDE$/,'Saint-Denis','97490'],[/^SAINTE-MARIE$/,'Sainte-Marie','97438'],
  [/^SAINTE-SUZANNE$/,'Sainte-Suzanne','97441'],[/^SAINT-ANDRE$/,'Saint-André','97440'],[/^SAINT-BENOIT$/,'Saint-Benoît','97470'],[/^BRAS-PANON$/,'Bras-Panon','97412'],
  [/^SAINTE-ROSE$/,'Sainte-Rose','97439'],[/^SALAZIE$/,'Salazie','97433'],[/^CILAOS$/,'Cilaos','97413'],[/^(LA-)?PLAINE-DES-PALMISTES$/,'La Plaine-des-Palmistes','97431'],
  [/^TROIS-BASSINS$/,'Trois-Bassins','97426'],
];
const TYPES='Fonds-de-commerce|Licence-4|Local-commercial|Locaux-commerciaux|Entrepot|Bureau|Appartement|Maison|Villa|Terrain|Immeuble|Parking|Studio';
export function parseOfimDetail(html:string,url:string){
  const r:any=smartDetail(html,url,'immobilier');if(!r)return null;
  const path=new URL(url).pathname;
  r.reference=path.match(/^\/(\d+)\//)?.[1]||r.reference;
  const pm=path.match(new RegExp(`^/\\d+/(Vente|Location)-(${TYPES}|[A-Za-z-]+?)-([A-Z][A-Z-]+?)-ile-de-la-Reunion-(.*)\\.html$`));
  // Ville : celle écrite dans l'adresse de la fiche, avec sa commune et son code postal officiels.
  if(pm){const town=pm[3];const hit=REUNION.find(([re])=>re.test(town));if(hit){r.ville=hit[1];r.code_postal=hit[2];}r.transaction=pm[1].toLowerCase();}
  // Type : « Licence 4 » et « Fonds de commerce » ne sont pas des appartements.
  const type=(html.match(/<title>\s*(?:Vente|Location)\s+(.+?)\s+[A-ZÀ-Ý' -]{3,}\s+[–-]/)?.[1]||pm?.[2]?.replace(/-/g,' ')||'').trim();
  if(/fonds de commerce|licence/i.test(type))r.type_bien='fonds de commerce';else if(/local|locaux|entrep[oô]t|bureau/i.test(type))r.type_bien='local commercial';
  // Titre : le type + l'accroche de l'annonce (« Salon de coiffure, esthétique, onglerie à l'Hermitage »), sans « A VENDRE » ni le prix.
  // L'accroche est dans « og:title » (sinon le 2e titre de la fiche, sinon l'adresse de la fiche).
  let head=sDecode(html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]{10,250})"/i)?.[1]||html.match(/<meta[^>]+content="([^"]{10,250})"[^>]+property="og:title"/i)?.[1]||'');
  if(!head||/r[ée]f\.\s*:/i.test(head))head=sDecode(([...html.matchAll(/<h[12][^>]*>([^<]{10,200})<\/h[12]>/gi)].map(m=>m[1]).find(x=>!/r[ée]f\.\s*:/i.test(x))||''));
  if(!head||head.length<10)head=(pm?.[4]||'').replace(/-/g,' ');
  head=head.replace(/\s*&\s*/g,' & ').replace(/\s*[–—]\s*/g,' – ');
  head=head.replace(/^[\s|:–-]+/,'').replace(/^\s*(?:(?:a|à)\s+(?:vendre|louer|saisir)\b|(?:location|cession|vente)\s*[:!–-])\s*[:!–-]?\s*(?:(?:a|à)\s+)?/i,'').replace(/\s(?:a|à|pour)\s+\d[\d\s\u00a0\u202f.,]*\s*(?:€|euros?)(?=\s|$)/gi,'').replace(/\s(?:a|à)\s+(?:vendre|louer)\b/gi,'')
    .replace(/\s*(?:[-–,:]\s*|\s(?:pour|a|à)\s+)?(?<![A-Za-z0-9²])\d[\d\s  .,]*\s*(?:€|euros?)?(?:\s*(?:HT|TTC|FAI))?(?:\s*\/?\s*(?:par\s+)?mois)?\s*$/i,'').replace(/\s+/g,' ').replace(/^[\s|:–-]+|[\s|:–-]+$/g,'').trim();
  if(head===head.toUpperCase()&&/[A-Z]{4}/.test(head))head=head.charAt(0)+head.slice(1).toLowerCase();
  if(head.length>=10){const typ=type||'Bien';const t=(new RegExp('^'+typ.split(' ')[0],'i').test(head)?head:`${typ} : ${head}`);r.titre=t.length>110?t.slice(0,107).replace(/\s+\S*$/,'')+'…':t;}
  else if(type&&r.ville)r.titre=`${type} – ${r.ville}`;
  // Photos : toute la galerie de la fiche (liens « data-lightbox », grand format /media/l-resize/<n°>/…), dans l'ordre du site.
  // Les « annonces similaires » (/media/sm/…) ne sont jamais prises.
  {const big=[...new Set([...html.matchAll(/https:\/\/www\.ofim\.fr\/media\/l-resize\/\d+\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi)].map(m=>m[0]))];
   const mid=big.length?[]:[...new Set([...html.matchAll(/https:\/\/www\.ofim\.fr\/media\/m\/\d+\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi)].map(m=>m[0]))];
   const ph=big.length?big:mid;if(ph.length)r.photos=ph.slice(0,30).join('|');}
  if(r.description)r.description=String(r.description).replace(/^\s*Voir les autres annonces qui peuvent vous int[ée]resser\s*/i,'');
  return r;
}
export async function readOfimAgency(url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
  const ag=ofimAgencyId(url);if(!ag)throw Error('Pour OFIM, utiliser la page de votre agence (…-ag<n>.html).');
  const{text}=await fetchHtml(url);
  // Adresses exactes des listes « Vente » et « Location » de l'agence, prises sur sa page.
  const starts=[...new Set([...text.matchAll(/href="(https:\/\/www\.ofim\.fr\/liste-(\d+)-(10|30)-(?:Vente|Location)-agence-[^"#?]+\.html)"/gi)].filter(m=>m[2]===ag).map(m=>m[1]))];
  if(!starts.length)throw Error('Listes de biens de l’agence OFIM introuvables.');
  const rows:any=await crawlCatalogue('https://www.ofim.fr/','ofim-v5:ag'+ag,starts,fetchHtml,(h,u)=>ofimLinks(h,u,ag),parseOfimDetail,memory,{maxDetails:120});
  // Total affiché par le site sur la page de l'agence (« 27 annonces immobilières de vente, achat et location »).
  const total=Number(text.match(/(\d+)\s+annonces immobili[eè]res de vente/i)?.[1]||0);if(total)(rows as any).siteCount=total;
  return rows;
}
