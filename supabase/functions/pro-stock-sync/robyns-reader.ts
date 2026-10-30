// Robyns Car: public HTML catalogue, including short numeric IDs and pagination.
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(s:any)=>sDecode(String(s??'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function blocks(html:string){const out:any[]=[];for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const d=JSON.parse(m[1]);out.push(...(Array.isArray(d)?d:d['@graph']||[d]));}catch{}}return out;}
export function parseRobynsVehicle(html:string,url:string){
 const id=new URL(url).pathname.match(/^\/vehicules\/(\d+)\/?$/)?.[1];if(!id)throw Error('Fiche Robyns Car invalide.');
 const data=blocks(html),v=data.find(x=>['Car','Motorcycle','Vehicle'].includes(x['@type']));if(!v?.name)throw Error('Données du véhicule Robyns Car absentes.');
 const business=data.find(x=>x['@type']==='AutomotiveBusiness'),offer=v.offers||{};
 if(/SoldOut|OutOfStock|Discontinued/i.test(offer.availability||''))return null;
 // Stop before recommendations; use only the listing's structured gallery, never the logo.
 const own=html.split(/<h2\b[^>]*>\s*Véhicules similaires/i)[0];
 const fields=new Map<string,string>();for(const m of own.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi))fields.set(clean(m[1]),clean(m[2]));
 const photos=[...new Set((Array.isArray(v.image)?v.image:[v.image]).filter((x:any)=>typeof x==='string'&&/^https?:\/\//i.test(x)))];
 const title=clean(v.name),brand=clean(v.brand?.name||v.brand),model=clean(v.model);
 const detail=own.slice(own.search(/<h1\b/i));
 const phone=detail.match(/href=["']tel:([^"']+)/i)?.[1]||business?.telephone||'';
 const description=clean(v.description)||clean(own.match(/<h2\b[^>]*>\s*Description\s*<\/h2>([\s\S]*?)(?=<h2\b|<\/section>|$)/i)?.[1]||'');
 return {reference:id,url,titre:title,marque:brand,modele:model,version:clean(title.replace(brand,'').replace(model,'')).trim(),
  prix:offer.price??'',annee:v.vehicleModelDate,kilometrage:v.mileageFromOdometer?.value,carburant:v.fuelType,boite:v.vehicleTransmission,
  type:v['@type']==='Motorcycle'||/\b(?:DAELIM|VT125|moto|scooter)\b/i.test(title)?'moto':/\b(?:fourgon|utilitaire|master|trafic|jumper|boxer|ducato|sprinter|transit|IVECO)\b/i.test(title)?'utilitaire':'voiture',
  etat:fields.get('État')||'occasion',mise_en_circulation:fields.get('1re mise en circ.')||'',
  ville:business?.address?.addressLocality||'',code_postal:business?.address?.postalCode||'',
  description,photos:photos.join('|'),contact_nom:business?.name||'',contact_telephone:phone};
}
export async function readRobynsCar(start:URL,html:string,fetchHtml:Fetcher){
 if(start.search)throw Error('Utilisez le catalogue Robyns Car sans filtre pour lire tout le stock.');
 if(/^\/vehicules\/\d+\/?$/.test(start.pathname)){const row=parseRobynsVehicle(html,start.toString());const rows:any[]=row?[row]:[];(rows as any).partial=false;return rows;}
 if(!/^\/(?:vehicules\/?)?$/.test(start.pathname))throw Error('Adresse de catalogue Robyns Car non reconnue.');
 const catalog=new URL('/vehicules',start);const first=start.pathname.replace(/\/$/,'')==='/vehicules'?html:(await fetchHtml(catalog)).text;
 const total=Number(first.match(/(\d+)\s+véhicules?\s+disponibles/i)?.[1]);if(!Number.isInteger(total)||total<1)throw Error('Nombre de véhicules Robyns Car absent.');
 const links=new Set<string>(),pages=new Set<string>([catalog.toString()]),queue:string[]=[];
 const take=(s:string)=>{for(const m of s.matchAll(/href=["']([^"']+)["']/gi)){let u:URL;try{u=new URL(sDecode(m[1]),catalog);}catch{continue;}if(u.origin!==catalog.origin)continue;
  if(/^\/vehicules\/\d+\/?$/.test(u.pathname)&&!u.search){u.hash='';links.add(u.toString());}
  else if(u.pathname==='/vehicules'&&/^\?page=\d+$/.test(u.search)&&!pages.has(u.toString())){pages.add(u.toString());queue.push(u.toString());}}};
 take(first);let partial=false,count=1;
 while(queue.length&&count<30){const batch=queue.splice(0,3);await Promise.all(batch.map(async u=>{try{take((await fetchHtml(new URL(u))).text);count++;}catch{partial=true;}}));}
 if(queue.length||links.size!==total)partial=true;
 const urls=[...links],rows:any[]=[];let next=0,misses=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<urls.length){const u=urls[next++];try{const row=parseRobynsVehicle((await fetchHtml(new URL(u))).text,u);if(row)rows.push(row);else misses++;}catch{partial=true;misses++;}}}));
 if(rows.length!==total)partial=true;
 (rows as any).partial=partial;(rows as any).total=total;(rows as any).stats={pages:count,details:links.size,read:rows.length,misses};return rows;
}
