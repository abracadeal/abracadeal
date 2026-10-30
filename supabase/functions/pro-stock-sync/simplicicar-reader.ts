// 31/10/2026 — Claude : agences du réseau Simplici Car (franchisés indépendants, un seul site national PrestaShop).
// Adresse à donner au robot = la page catalogue de l'agence, ex. https://www.simplicicar.com/9-occasions-cannes-06
// (n° de catégorie PrestaShop = l'agence). Seules les voitures de CETTE agence sont lues (id_category_default = n° de la page).
// Liste paginée (?page=N), puis chaque fiche : bloc data-product (JSON PrestaShop) → caractéristiques (Marque, Modèle,
// Version, Énergie, Kilométrage, Mise en circulation, Couleur, Portes, Places, Puissance, Crit'Air, CO2, Ville agence…),
// équipements (= « Oui »), photos grand format, prix. Vendues / indisponibles (quantité 0, non commandable) exclues.
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

export const simpliciAgencyId=(url:URL)=>/(^|\.)simplicicar\.com$/i.test(url.hostname)?(url.pathname.match(/^\/(\d+)-[a-z0-9-]*occasion/i)||[])[1]||'':'';

function productData(html:string){
  const m=html.match(/data-product="([^"]*)"/);if(!m)return null;
  try{return JSON.parse(sDecode(m[1]));}catch{try{return JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&amp;/g,'&'));}catch{return null;}}
}
const clean=(s:any)=>sDecode(String(s??'').replace(/<br\s*\/?>\s*/gi,'\n').replace(/<\/p>\s*/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\r]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
const cityCase=(s:any)=>String(s??'').trim().toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu,(_m,a,b)=>a+b.toUpperCase()).replace(/-(De|Du|Des|La|Le|Les|Sur|Sous|En)-/g,(m)=>m.toLowerCase());

export async function readSimpliciAgency(url:URL,fetchHtml:Fetcher){
  const cat=simpliciAgencyId(url);if(!cat)throw Error("Adresse Simplici Car : donner la page catalogue de l'agence (ex. /9-occasions-cannes-06).");
  const base=new URL(url.pathname.replace(/\/+$/,''),url.origin);
  const links:string[]=[];
  for(let page=1;page<=20;page++){
    const u=new URL(base.toString());if(page>1)u.searchParams.set('page',String(page));
    const{text}=await fetchHtml(u);
    const found=[...new Set([...text.matchAll(/href="(https:\/\/www\.simplicicar\.com\/[a-z0-9-]+\/\d+-[^"]+\.html)"/gi)].map(m=>m[1]))];
    const fresh=found.filter(l=>!links.includes(l));links.push(...fresh);
    if(!fresh.length||!new RegExp(`[?&]page=${page+1}\\b`).test(text))break;
  }
  const rows:any[]=[];let failed=0;let agencyCity='';
  for(let i=0;i<links.length;i+=5){
    await Promise.all(links.slice(i,i+5).map(async link=>{
      try{
        const{text}=await fetchHtml(new URL(link));const p=productData(text);if(!p){failed++;return;}
        if(String(p.id_category_default)!==cat)return;// voiture d'une autre agence
        if(Number(p.quantity)<=0||p.available_for_order===false||p.available_for_order===0||String(p.active)==='0')return;
        const f=new Map<string,string>();const eq:string[]=[];
        for(const x of p.features||[]){const n=clean(x?.name),v=clean(x?.value);if(!n||!v)continue;if(/^oui$/i.test(v))eq.push(n);else if(!f.has(n))f.set(n,v);}
        const g=(...k:string[])=>{for(const key of k){for(const [n,v] of f)if(n.toLowerCase()===key.toLowerCase())return v;}return '';};
        const energy=g('Énergie','Energie');
        const fuel=/rechargeable/i.test(energy)?'Hybride rechargeable':/hybride/i.test(energy)?'Hybride':/lectri/i.test(energy)?'Électrique':/diesel|gazole/i.test(energy)?'Diesel':/essence/i.test(energy)?'Essence':/gpl/i.test(energy)?'GPL':/e85|thanol/i.test(energy)?'Bioéthanol':energy;
        const city=g('Ville agence');if(city&&!agencyCity)agencyCity=cityCase(city);
        const mec=g('Mise en circulation');
        const photos=(p.images||[]).map((im:any)=>im?.bySize?.large_default?.url||im?.large?.url).filter((x:any)=>typeof x==='string');
        const marque=g('Marque'),modele=g('Modèle','Modele'),version=g('Version');
        rows.push({reference:String(p.id_product||p.id),url:p.link||link,titre:[marque,modele,version].filter(Boolean).join(' ')||clean(p.name),
          marque,modele,version,prix:p.price_amount??'',annee:g('Année','Annee'),mise_en_circulation:mec.replace(/^\d{2}\/(\d{2}\/\d{4})$/,'$1'),
          kilometrage:g('Kilométrage','Kilometrage').replace(/[^\d]/g,''),carburant:fuel,boite:/auto/i.test(g('Transmission'))?'Automatique':/manu/i.test(g('Transmission'))?'Manuelle':g('Transmission'),
          puissance_din:g('Puissance (ch)').replace(/[^\d]/g,''),puissance_fiscale:g('Puissance fiscale','Puissance fiscale (CV)').replace(/[^\d]/g,''),
          portes:g('Portes').replace(/[^\d]/g,''),places:g('Places').replace(/[^\d]/g,''),couleur:g('Couleur'),crit_air:(g("Certificat qualité de l'air").match(/\d/)||[''])[0],
          co2:g('Émissions CO2','Emissions CO2').replace(/[^\d]/g,''),carrosserie:g('Carrosserie'),
          type:/utilitaire/i.test(g('Type de véhicule'))?'utilitaire':/moto|quad/i.test(g('Type de véhicule'))?'moto':'voiture',etat:'occasion',equipements:eq.join('|'),
          ville:city?cityCase(city):'',description:[clean(p.description),eq.length?'Équipements :\n- '+eq.join('\n- '):''].filter(Boolean).join('\n\n'),photos:photos.join('|')});
      }catch{failed++;}
    }));
  }
  if(failed)(rows as any).partial=true;
  rows.sort((a,b)=>links.findIndex(l=>l.includes('/'+a.reference+'-'))-links.findIndex(l=>l.includes('/'+b.reference+'-')));
  if(agencyCity)(rows as any).siteLocation={city:agencyCity,postal:''};
  return rows;
}
