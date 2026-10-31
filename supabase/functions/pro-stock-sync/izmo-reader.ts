// Izmocars: the public page embeds its inventory DTO as a JSON literal, with complete galleries.
// Parse JSON only (never eval). Scope is the single physical dealer configured on this site's own host.
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const isIzmoSite=(html:string)=>/\bvar\s+izmoGlobalData\s*=\s*\{/.test(html)&&/izmocars\.com/i.test(html);
export function izmoData(html:string){
 const m=/\bvar\s+izmoGlobalData\s*=\s*/.exec(html);if(!m)return null;
 const start=m.index+m[0].length;let depth=0,quoted=false,escaped=false;
 for(let i=start;i<html.length;i++){const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth){try{return JSON.parse(html.slice(start,i+1));}catch{return null;}}}
 return null;
}
const clean=(s:any)=>sDecode(String(s??'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
export function parseIzmoVehicle(v:any,dealerId:number,location:any,phone:string,base:URL){
 // invDlrId is the owner of the stock, not dealerIds (which may contain the whole group).
 if(Number(v.invDlrId)!==dealerId||Number(v.localDealerId)!==dealerId)return null;
 if(v.inventoryType!=='USED'||v.status!=='ACTV'||v.soldDate||v.isVehReserved||v.vehiclerReservationStatus&& !/^(?:NONE|AVAILABLE)$/i.test(v.vehiclerReservationStatus))return null;
 if(v.reservedUntil&&(!Number.isFinite(Date.parse(v.reservedUntil))||Date.parse(v.reservedUntil)>Date.now()))return null;
 if(!Number.isFinite(Number(v.mileage))||Number(v.mileage)<=0)return null;
 const title=[v.make,v.model,v.trim].filter(Boolean).join(' ');
 if(/vehicule neuf|\bVN\b|\b0\s*km\b|en commande|stock usine/i.test((title+' '+clean(v.comments)).normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return null;
 const id=String(v.id?.inventoryId||'');if(!id||!v.stockUrl)throw Error('Référence ou lien Izmocars absent.');
 const url=new URL(v.stockUrl,base);if(url.origin!==base.origin)throw Error('Fiche Izmocars hors du site de la concession.');
 const photos=v.hasStockPhotos?[]:[...new Set(String(v.images||'').split(',').map(x=>x.trim()).filter(x=>/^https?:\/\//i.test(x)))];
 const equipment=clean(v.standardfeatures),fuel=clean(v.fuelType),box=clean(v.transmission);
 return{reference:id,url:url.toString(),titre:[v.make,v.trim||v.model].filter(Boolean).join(' '),marque:v.make,modele:v.model,version:v.trim,
  prix:v.internetprice,annee:v.year,mise_en_circulation:v.registrationdate,kilometrage:v.mileage,
  carburant:/hybrid/i.test(fuel)?'Hybride':/lectri/i.test(fuel)?'Électrique':fuel,boite:/autom|DSG|S.tronic/i.test(box)?'Automatique':/manu/i.test(box)?'Manuelle':box,
  type:/utilitaire|fourgon/i.test(clean(v.body))?'utilitaire':'voiture',etat:'occasion',ville:v.dealerCity||v.location||location.city,code_postal:v.postalCode||location.postalCode,
  photos:photos.join('|'),couleur:v.exteriorcolor,portes:v.doors,places:v.seats,puissance_fiscale:v.powerForTaxes,puissance_din:v.realEnginePower,co2:v.co2,garantie:v.warrantyDescription,
  contact_telephone:phone,equipements:equipment,description:[clean(v.comments),v.warrantyDescription?'Garantie : '+clean(v.warrantyDescription):'',equipment?'Équipements : '+equipment:''].filter(Boolean).join('\n\n')};
}
export async function readIzmoDealer(start:URL,homeHtml:string,fetchHtml:Fetcher){
 const seed=izmoData(homeHtml),info=seed?.dealerData?.dealerInfo,dealerId=Number(info?.dealerId);
 const locations=(info?.locations||[]).filter((x:any)=>x.city&&x.postalCode);
 if(!dealerId||new Set(locations.map((l:any)=>[l.street,l.city,l.postalCode].join('|'))).size!==1)throw Error('Sélectionnez le site d’une concession physique, pas le site de tout un groupe.');
 const location=locations[0];
 const departments=seed.dealerData.dealerDepartments?.[String(location.locationId)]||[];
 const phone=departments.find((d:any)=>/occasion/i.test(d.deptName||''))?.phone1||info.generalPhone||departments.find((d:any)=>/^accueil$/i.test(d.deptName||''))?.phone1||'';
 let stock=new URL(start.toString());
 if(seed.inventoryFilteredData?.newUsed!=='USED'){
  const links=[...homeHtml.matchAll(/href=["']([^"']*(?:occasion|used)[^"']*)["']/gi)].map(m=>{try{return new URL(sDecode(m[1]),start);}catch{return null;}}).filter((u:any)=>u?.origin===start.origin&&/stock|inventory/i.test(u.pathname));
  if(!links.length)throw Error('Lien vers le stock d’occasion de cette concession introuvable.');stock=links[0]!;
 }
 stock.searchParams.set('listingPerPage','500');stock.searchParams.set('newUsed','USED');stock.searchParams.set('dealerIds',String(dealerId));
 const rows:any[]=[];const seen=new Set<string>();let total=0,pages=1,page=1;const t0=Date.now();
 for(;page<=pages;page++){
  if(page>40||Date.now()-t0>45000)throw Error('Catalogue Izmocars trop long : flux structuré paginé nécessaire avant de conclure le tour.');
  const u=new URL(stock);u.searchParams.set('page',String(page));const result=await fetchHtml(u);
  if(result.url.origin!==start.origin)throw Error('Catalogue redirigé hors du site de la concession.');
  const d=izmoData(result.text),p=d?.inventoryList?.pagination,items=d?.inventoryList?.inventories;
  if(!d||Number(d.dealerData?.dealerInfo?.dealerId)!==dealerId||d.inventoryFilteredData?.newUsed!=='USED'||!p||!Array.isArray(items)||Number(p.selectedPage)!==page)throw Error('Catalogue Izmocars ou filtre occasion non confirmé.');
  if(page===1){total=Number(p.records);pages=Number(p.pages)||1;if(!Number.isInteger(total)||total<0||!Number.isInteger(pages)||pages<1)throw Error('Compteur de stock Izmocars illisible.');}
  else if(Number(p.records)!==total)throw Error('Le stock a changé pendant la lecture ; le tour sera recommencé sans archivage.');
  for(const v of items){const id=String(v.id?.inventoryId||'');if(!id||seen.has(id))throw Error('Pagination Izmocars répétée ou référence absente.');seen.add(id);const r=parseIzmoVehicle(v,dealerId,location,phone,start);if(r)rows.push(r);}
 }
 if(seen.size!==total)throw Error(`Catalogue Izmocars incomplet : ${seen.size}/${total} références.`);
 (rows as any).partial=false;(rows as any).total=rows.length;(rows as any).stats={pages:page-1,source_total:total,excluded:total-rows.length,dealer_id:dealerId,ms:Date.now()-t0};return rows;
}
