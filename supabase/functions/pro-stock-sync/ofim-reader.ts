// 04/11/2026 — Claude (Anthony : « faut réparer aussi au cas où c'est bon ») : agences OFIM (www.ofim.fr, La Réunion).
// La page « Agence-immobiliere-de-<ville>-ag<n>.html » montre les autres agences du réseau et des « coups de cœur » d'autres
// villes : le robot les prenait pour des biens (aperçu d'Ofim Saint-Gilles raté). Les biens de l'agence sont sur ses listes
// « liste-<n>-30-Vente-… » et « liste-<n>-10-Location-… » (10 par page, ?start=10, 20…), chaque fiche est /<n° du bien>/….html.
import { smartDetail } from './smart-reader.ts';
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
export function parseOfimDetail(html:string,url:string){
  const r:any=smartDetail(html,url,'immobilier');if(!r)return null;
  r.reference=new URL(url).pathname.match(/^\/(\d+)\//)?.[1]||r.reference;
  // Titre de la page sans le prix : « Vente Studio / F1 SAINT GILLES LES BAINS – 220 432 € » → « Studio / F1 – Saint Gilles Les Bains ».
  const t=(html.match(/<title>([^<]+)<\/title>/i)?.[1]||'').split(/\s+[–-]\s+[\d\s  .,]+€/)[0].trim();
  const m=t.match(/^(Vente|Location)\s+(.+?)\s+([A-ZÀ-Ý' -]{3,})$/);
  if(m){const city=m[3].toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(_:string,a:string,b:string)=>a+b.toUpperCase());r.titre=`${m[2]} – ${city}`;r.transaction=m[1].toLowerCase();}
  if(r.description)r.description=String(r.description).replace(/^\s*Voir les autres annonces qui peuvent vous int[ée]resser\s*/i,'');
  return r;
}
export async function readOfimAgency(url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
  const ag=ofimAgencyId(url);if(!ag)throw Error('Pour OFIM, utiliser la page de votre agence (…-ag<n>.html).');
  const{text}=await fetchHtml(url);
  // Adresses exactes des listes « Vente » et « Location » de l'agence, prises sur sa page.
  const starts=[...new Set([...text.matchAll(/href="(https:\/\/www\.ofim\.fr\/liste-(\d+)-(10|30)-(?:Vente|Location)-agence-[^"#?]+\.html)"/gi)].filter(m=>m[2]===ag).map(m=>m[1]))];
  if(!starts.length)throw Error('Listes de biens de l’agence OFIM introuvables.');
  const rows:any=await crawlCatalogue('https://www.ofim.fr/','ofim-v1:ag'+ag,starts,fetchHtml,(h,u)=>ofimLinks(h,u,ag),parseOfimDetail,memory,{maxDetails:120});
  // Total affiché par le site sur la page de l'agence (« 27 annonces immobilières de vente, achat et location »).
  const total=Number(text.match(/(\d+)\s+annonces immobili[eè]res de vente/i)?.[1]||0);if(total)(rows as any).siteCount=total;
  return rows;
}
