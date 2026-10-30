// Bye Buy Car: public catalogue used by the site's own search, with the agency scope preserved.
import { sDecode } from './smart-reader.ts';
type Page={vehicules:any[];results_length:number;max_page:number};
type PageFetcher=(body:any)=>Promise<Page>;
const clean=(v:unknown)=>sDecode(String(v??'').replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/\\n/g,'\n').replace(/[ \t\u00a0]+/g,' ').trim();
export function byeBuyScope(start:URL,html:string){
 const path=start.pathname.match(/^\/agence\/(\d{5})\/?$/)?.[1];
 const cp=start.searchParams.get('cp');
 if(cp&&!/^\d{5}$/.test(cp))throw Error('Code postal agence Bye Buy Car invalide.');
 const single=start.pathname.match(/^\/vehicule\/(\d+(?:-\d+)?)\/?$/)?.[1]||'';
 const detailCp=single?html.match(/id=["']hcs-agency-cp["'][^>]*>\s*(\d{5})/)?.[1]:'';
 if(single&&!detailCp)throw Error('Agence du véhicule Bye Buy Car introuvable.');
 // Unknown filtered routes must not silently turn into a network-wide import.
 if(!single&&!path&&!/^\/(?:acheter\/?)?$/.test(start.pathname))throw Error('Utilisez la page acheter, une page agence ou une fiche véhicule Bye Buy Car.');
 for(const key of start.searchParams.keys())if(!['cp','utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'].includes(key))throw Error('Filtre Bye Buy Car non pris en charge : utilisez la page agence ou le filtre cp.');
 return {agences:[path||cp||detailCp].filter(Boolean),single};
}
export function mapByeBuyVehicle(v:any){
 if(!/^\d+(?:-\d+)?$/.test(String(v.reference||'')))throw Error('Référence Bye Buy Car invalide.');
 const options=Array.isArray(v.options)?v.options.map(clean).filter(Boolean):[];
 const description=clean(v.description);
 const body=clean(v.carrosserie);
 const photos=[...new Set((Array.isArray(v.photos)?v.photos:[]).filter((x:any)=>typeof x==='string'&&/^https?:\/\//i.test(x)))];
 return {reference:String(v.reference),url:`https://bye-buy-car.com/vehicule/${v.reference}/`,titre:clean(v.titre)||[v.marque,v.modele,v.version].filter(Boolean).map(clean).join(' '),
 marque:clean(v.marque),modele:clean(v.modele),version:clean(v.version),prix:v.prixttcaffiche,ville:clean(v.ville),code_postal:clean(v.codepostal),
 annee:v.anneemodele,kilometrage:v.kilometrage,carburant:clean(v.energie),boite:clean(v.typeboite),
 type:/fourgon|utilitaire|camion|plateau|benne/i.test(body)?'utilitaire':/camping|caravane/i.test(body)?'camping-car':/moto|scooter/i.test(body)?'moto':'voiture',
 carrosserie:body,portes:v.nbrporte,places:v.nbrplace,puissance_fiscale:v.puissancefiscale,puissance_din:v.puissancedyn,co2:v.emissions_co2,couleur:clean(v.couleurexterieur),
 // datemes is first registration; dateCG is a later registration document date.
 mise_en_circulation:/^\d{4}-\d{2}-\d{2}/.test(v.datemes||'')?String(v.datemes).slice(0,10):'',
 description:[description,options.length?'Équipements et options :\n'+options.join('\n'):''].filter(Boolean).join('\n\n'),equipements:options.join('|'),photos:photos.join('|'),
 contact_nom:clean(v.agence),contact_telephone:clean(v.telephone)};
}
async function fetchPublicPage(body:any):Promise<Page>{
 const r=await fetch('https://api.bye-buy-car.com/api/get-vehicules',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error(`Catalogue Bye Buy Car HTTP ${r.status}`);
 const text=await r.text();if(text.length>8_000_000)throw Error('Page catalogue Bye Buy Car trop volumineuse.');
 return JSON.parse(text);
}
export async function readByeBuyCar(start:URL,html:string,fetchPage:PageFetcher=fetchPublicPage){
 const scope=byeBuyScope(start,html);
 const body={page:1,pageSize:100,research:[],marques:[],modeles:[],carburants:[],transmission:[],annee:[],couleurs:[],agences:scope.agences,kilometrage:{minimum:0,maximum:999999999},prix:{minimum:0,maximum:999999999}};
 const check=(d:Page)=>{if(!Array.isArray(d?.vehicules)||!Number.isInteger(d.results_length)||d.results_length<0||!Number.isInteger(d.max_page)||d.max_page<0)throw Error('Réponse catalogue Bye Buy Car invalide.');return d;};
 const first=check(await fetchPage(body));if(!first.vehicules.length)throw Error('Aucun véhicule Bye Buy Car trouvé : synchronisation annulée.');
 const pages=Math.max(1,first.max_page);if(pages>100)throw Error('Catalogue Bye Buy Car trop grand : utilisez une page agence.');
 const all=[...first.vehicules];let partial=false,next=2,readPages=1;
 await Promise.all(Array.from({length:3},async()=>{while(next<=pages){const page=next++;try{const d=check(await fetchPage({...body,page}));all.push(...d.vehicules);readPages++;if(d.results_length!==first.results_length||d.max_page!==first.max_page)partial=true;}catch{partial=true;}}}));
 const unique=new Map<string,any>();for(const v of all){if(!/^\d+(?:-\d+)?$/.test(String(v.reference||''))){partial=true;continue;}if(scope.agences.length&&!scope.agences.includes(String(v.codepostal||''))){partial=true;continue;}unique.set(String(v.reference),v);}
 if(unique.size!==first.results_length)partial=true;
 const selected=scope.single?[unique.get(scope.single)].filter(Boolean):[...unique.values()];
 if(!selected.length)throw Error('Véhicule Bye Buy Car introuvable dans le stock de son agence.');
 const rows:any[]=selected.map(mapByeBuyVehicle);(rows as any).partial=partial;(rows as any).total=scope.single?1:first.results_length;(rows as any).stats={pages:readPages,details:rows.length,read:rows.length};return rows;
}
