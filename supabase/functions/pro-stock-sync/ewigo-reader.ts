// 31/10/2026 — Claude : agences du réseau Ewigo (<ville>-ewigo.com), sites Laravel / Inertia.
// Toutes les données sont dans l'attribut data-page (JSON) de chaque page :
//  - /acheter (route « minisite.acheter ») = TOUT le stock de l'agence en une page (props.ads.data) ;
//    attention, /achat (sans « e ») est le stock de tout le réseau Ewigo : jamais utilisé ;
//  - /vehicule/{id} = fiche complète (photos grand format, puissances, portes, places, CO2, couleur, garantie, équipements).
// « Autobiz » n'est que leur module d'estimation de reprise : ce n'est pas le fabricant du site.
// Vendus / réservés (is_solded / is_booked, statut ≠ for_sale) exclus. Plaque d'immatriculation jamais reprise.
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

export const isEwigoSite=(html:string,url?:URL)=>/data-page="[^"]*ewigoWpUrl/i.test(html)||(!!url&&/(^|\.)[a-z0-9-]+-ewigo\.com$/i.test(url.hostname)&&/data-page="/i.test(html));

function pageData(html:string){
  const m=html.match(/data-page="([^"]*)"/);if(!m)return null;
  try{return JSON.parse(sDecode(m[1]));}catch{try{return JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&amp;/g,'&'));}catch{return null;}}
}
const sold=(a:any)=>Number(a?.is_solded)===1||Number(a?.is_booked)===1||(a?.status&&a.status!=='for_sale');
const cap=(s:any)=>{const t=String(s??'').trim();return t?t.charAt(0).toUpperCase()+t.slice(1).toLowerCase():'';};
// « LA ROCHELLE » → « La Rochelle », « SAINT-JEAN-DE-LUZ » → « Saint-Jean-de-Luz »
const cityCase=(s:any)=>String(s??'').trim().toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu,(_m,a,b)=>a+b.toUpperCase()).replace(/-(De|Du|Des|La|Le|Les|Sur|Sous|En|Lès|Lez)-/g,(m)=>m.toLowerCase());

export async function readEwigoAgency(origin:URL,homeHtml:string,fetchHtml:Fetcher){
  const home=pageData(homeHtml);const agency=home?.props?.agency||null;
  const{text:listHtml}=await fetchHtml(new URL('/acheter',origin));
  const list=pageData(listHtml);const ads:any[]=list?.props?.ads?.data||[];
  if(!list||!Array.isArray(ads))throw Error('Page « acheter » Ewigo illisible.');
  const agencyId=agency?.id??ads[0]?.agency_id;
  // Sécurité : uniquement les voitures de CETTE agence (jamais celles du réseau).
  const mine=ads.filter(a=>!sold(a)&&(agencyId==null||a.agency_id===agencyId));
  const rows:any[]=[];let failed=0;
  for(let i=0;i<mine.length;i+=6){
    await Promise.all(mine.slice(i,i+6).map(async a=>{
      const u=new URL(`/vehicule/${a.id}`,origin);
      let d:any=a;
      try{const{text}=await fetchHtml(u);const p=pageData(text)?.props?.ad;if(p){if(sold(p))return;d=p;}else failed++;}catch{failed++;}
      const eq=d.equipments&&typeof d.equipments==='object'?Object.values<any>(d.equipments).flat().filter((x:any)=>typeof x==='string'):[];
      const photos:string[]=(Array.isArray(d.photos)&&d.photos.length?d.photos:Array.isArray(d.gallery)&&d.gallery.length?d.gallery:[d.first_photo_thumb]).filter((x:any)=>typeof x==='string'&&/^https?:\/\//.test(x));
      const warranty=d.warranty_1&&d.warranty_1_duration?`${d.warranty_1_duration} mois (${d.warranty_1})`:'';
      const descr=[d.description,d.condition?`État : ${d.condition}`:'',d.hands_count?`${d.hands_count} propriétaire${Number(d.hands_count)>1?'s':''} précédent${Number(d.hands_count)>1?'s':''}`:'',
        warranty?`Garantie : ${warranty}`:'',eq.length?'Équipements :\n- '+eq.join('\n- '):''].filter(Boolean).join('\n\n');
      rows.push({reference:String(d.id),url:d.full_url||u.toString(),titre:[d.make,d.model,d.version].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(),
        marque:d.make||'',modele:d.model||'',version:String(d.version||'').replace(/\s+/g,' ').trim(),prix:d.price??'',annee:d.year??'',
        mise_en_circulation:d.market_release_date?String(d.market_release_date).slice(0,10).split('-').reverse().slice(1).join('/'):'',
        kilometrage:d.kms??'',carburant:cap(d.energy),boite:cap(d.gear),puissance_din:d.horse_power??'',puissance_fiscale:d.horse_power_tax??'',
        portes:d.doors_count??'',places:d.seats_count??'',co2:d.co2??'',couleur:d.color_exterior_details||d.color_exterior||'',carrosserie:cap(d.category),
        garantie:warranty,equipements:eq.join('|'),type:/utilitaire|fourgon|^vu$/i.test(String(d.category||''))?'utilitaire':'voiture',etat:'occasion',
        ville:agency?.city?cityCase(agency.city):'',code_postal:agency?.postcode||'',description:descr,photos:photos.join('|')});
    }));
  }
  if(failed)(rows as any).partial=true;
  rows.sort((a,b)=>mine.findIndex(x=>String(x.id)===a.reference)-mine.findIndex(x=>String(x.id)===b.reference));
  if(agency?.city)(rows as any).siteLocation={city:cityCase(agency.city),postal:agency.postcode||''};
  return rows;
}
