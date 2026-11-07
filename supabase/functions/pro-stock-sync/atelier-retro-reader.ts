// Public Wix Pro Gallery data already rendered on this garage's stock page.
// Each gallery item is one vehicle, not one photo of a shared vehicle gallery.
import {sDecode} from './smart-reader.ts';
import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
type Fetcher=(url:URL)=>Promise<{text:string,url:URL}>;
const SOURCE='https://www.atelierautoretro.fr/a-vendre';
export const isAtelierRetro=(u:URL)=>/^(?:www\.)?atelierautoretro\.fr$/i.test(u.hostname);
export function atelierRetroIdentity(row:any){try{return isAtelierRetro(new URL(row.externalUrl))&&row.ref?'atelier-retro|'+row.ref:null;}catch{return null;}}
const clean=(v:any)=>sDecode(String(v??'').replace(/<br\s*\/?>|<\/(?:p|div)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
export function atelierRetroCatalogue(html:string){
 const match=/<script\b[^>]*id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/i.exec(html);if(!match)throw Error('Données publiques Wix absentes');
 const data=JSON.parse(match[1]),galleries:any[]=[];
 const visible=new Set([...html.matchAll(/id="gallery-wrapper-([^"<>]+)"/g)].map(m=>m[1]));
 for(const app of Object.values(data.appsWarmupData||{}) as any[])for(const [key,value] of Object.entries(app||{}))if(key.endsWith('_galleryData')&&visible.has(key.slice(0,-12)))galleries.push(value);
 if(galleries.length!==1)throw Error('Galerie de stock Atelier Auto Rétro ambiguë');
 const gallery=galleries[0];if(!Array.isArray(gallery.items)||!Number.isInteger(gallery.totalItemsCount)||gallery.totalItemsCount!==gallery.items.length)throw Error('Galerie Wix partielle : pagination publique à compléter');
 const seen=new Set<string>();for(const item of gallery.items){if(!/^[0-9a-f-]{36}$/i.test(item.itemId)||seen.has(item.itemId)||item.isSecure!==false)throw Error('Identité ou accès public Wix non confirmé');seen.add(item.itemId);}
 return gallery.items;
}
export const atelierRetroUnavailable=(item:any)=>/\b(?:v[ée]hicule neuf|voiture neuve|0\s*km|en commande|stock usine)\b/i.test(clean(item.metaData?.title))||/^(?:bient[ôo]t|[àa] venir|prochainement|en arrivage|vendue?s?|r[ée]serv[ée]e?s?)(?=[\s:!.,-]|$)/i.test(clean(item.metaData?.title))||/\b(?:v[ée]hicule (?:vendu|r[ée]serv[ée])|sous r[ée]servation)\b/i.test(clean(item.metaData?.description));
export function parseAtelierRetro(item:any,contact:{phone:string,city:string,postal:string}){
 if(atelierRetroUnavailable(item))return {_sold:1,reference:item.itemId};
 const title=clean(item.metaData?.title),description=clean(item.metaData?.description);if(!title)throw Error('Titre du véhicule absent');
 const asset=String(item.mediaUrl||'');if(!/^[a-zA-Z0-9_~-]+\.(?:jpe?g|png|webp)$/i.test(asset))throw Error('Photo publique Wix absente');
 const text=title+'\n'+description;const labels=[...title.matchAll(/([\d][\d\s.,]*)\s*€/g)];if(!labels.length)labels.push(...description.matchAll(/(?:prix|tarif)\s*[:=]?\s*([\d][\d\s.,]*)\s*(?:€|euros?)/gi));const prices=labels.map(m=>Number(m[1].replace(/\s/g,'').replace(',','.')));
 if(prices.length>1||prices.some(p=>!Number.isFinite(p)||p<=0))throw Error('Prix du véhicule ambigu');
 const row:any={reference:item.itemId,url:SOURCE+'#item-wrapper-'+item.itemId,titre:title,description,photos:'https://static.wixstatic.com/media/'+asset+'/v1/fit/w_1600,h_1600,q_85/'+asset,type:'voitures',ville:contact.city,code_postal:contact.postal};
 if(prices.length)row.prix=String(prices[0]);
 const brand=title.match(/^(Volvo|Jeep|Porsche|Peugeot|Jaguar|Range Rover|Mercedes(?:-Benz)?)(?=\s)/i)?.[1];if(brand){row.marque=brand;const rest=title.slice(brand.length).trim();row.modele=rest.match(/^[\p{L}\d-]+/u)?.[0]||'';}
 const year=title.match(/\b((?:19|20)\d{2})\b/)?.[1]||description.match(/\b(?:de|ann[ée]e|mill[ée]sime)\s+((?:19|20)\d{2})\b/i)?.[1];if(year)row.annee=year;
 const mileage=text.match(/\bkilom[ée]trage\s*:\s*([\d .\u202f]+)/i)?.[1]||text.match(/\b([\d][\d .\u202f]*)\s*km\b/i)?.[1];if(mileage)row.kilometrage=mileage.replace(/[ .\u202f]/g,'');
 const date=description.match(/mise en circulation\s*:\s*((?:\d{2}\/)?\d{2}\/\d{4})/i)?.[1];if(date)row.mise_en_circulation=date;
 if(/bo[iî]te automatique/i.test(text))row.boite='automatique';else if(/bo[iî]te manuelle/i.test(text))row.boite='manuelle';
 if(/\bdiesel\b/i.test(text))row.carburant='diesel';else if(/\bessence\b/i.test(text))row.carburant='essence';
 const power=text.match(/\b(\d{2,3})\s*ch\b/i)?.[1];if(power)row.puissance_din=power;
 const warranty=text.match(/garantie\s+(\d+)\s*(mois|ans?)\b/i);if(warranty)row.garantie=warranty[1]+' '+warranty[2];
 if(contact.phone){row.contact_nom='Garage Saint Jean / Atelier Auto Rétro (garage)';row.contact_telephone=contact.phone;}
 return row;
}
export async function readAtelierRetro(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
 const first=await fetchHtml(new URL(SOURCE));if(!isAtelierRetro(first.url)||first.url.pathname!=='/a-vendre')throw Error('Redirection hors du stock inscrit');
 const items=atelierRetroCatalogue(first.text),byId=new Map(items.map((r:any)=>[r.itemId,r]));
 const visible=clean(first.text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''));
 const address=visible.match(/\b(\d{5})\s+(B[ée]ziers)\b/i),phone=first.text.match(/href="tel:([+\d ()-]+)"/i)?.[1]||'';
 const contact={phone,postal:address?.[1]||'',city:address?.[2]||''};
 // A price/status/caption change must invalidate a completed or partial cache.
 const snapshot=JSON.stringify({contact,items:items.map((i:any)=>({id:i.itemId,title:i.metaData?.title,description:i.metaData?.description,media:i.mediaUrl}))});
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const rows:any=await crawlCatalogue(SOURCE,'atelier-retro-v1:'+hash,[SOURCE],async u=>{
  if(!u.hash)return first;
  const id=u.hash.replace(/^#item-wrapper-/,'');if(u.origin!==new URL(SOURCE).origin||u.pathname!=='/a-vendre'||!byId.has(id))throw Error('Véhicule hors du stock inscrit');
  return {url:u,text:JSON.stringify(byId.get(id))};
 },()=>({lists:[],details:items.map((r:any)=>SOURCE+'#item-wrapper-'+r.itemId)}),json=>parseAtelierRetro(JSON.parse(json),contact),memory,{expectedTotal:items.length,maxDetails:4});
 rows.total=items.filter((r:any)=>!atelierRetroUnavailable(r)).length;
 rows.platform='Atelier Auto Rétro (galerie Wix publique)';rows.sector='vehicules';return rows;
}
