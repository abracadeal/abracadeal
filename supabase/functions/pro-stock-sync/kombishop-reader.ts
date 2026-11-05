// Kombishop sells equipment as well as cars. Only category 7 is its available vehicle stock.
import {sDecode} from './smart-reader.ts';
import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const ORIGIN='https://www.kombishop.fr',STOCK='/7-vans-en-stock';
export const isKombishop=(u:URL)=>/^(?:www\.)?kombishop\.fr$/i.test(u.hostname);
const clean=(s:string)=>sDecode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
function element(html:string,re:RegExp,tag='div'){
 const m=re.exec(html);if(!m)return '';const tags=new RegExp('<\\/?'+tag+'\\b[^>]*>','gi');tags.lastIndex=m.index+m[0].length;let depth=1;
 for(let t;(t=tags.exec(html));){depth+=/^<\//.test(t[0])?-1:1;if(!depth)return html.slice(m.index,tags.lastIndex);}throw Error('Bloc Kombishop incomplet');
}
export function kombishopLinks(html:string,page:URL){
 if(!isKombishop(page)||page.pathname!==STOCK)throw Error('Catalogue Kombishop hors périmètre');
 // The shop's grid has an unbalanced custom div. Its explicit bottom marker,
 // before editorial content/footer links, is the reliable stock boundary.
 const start=html.search(/<div\b[^>]*id="js-product-list"[^>]*>/i),end=html.search(/<div\b[^>]*id="js-product-list-bottom"[^>]*>/i);
 const grid=start>=0&&end>start?html.slice(start,end):'';
 const details:string[]=[],lists:string[]=[];
 for(const m of grid.matchAll(/href="([^"]+)"/gi))try{const u=new URL(sDecode(m[1]),page);if(isKombishop(u)&&/^\/vans\/\d+-[^/]+\.html$/.test(u.pathname)){u.hash='';u.search='';details.push(u.toString());}}catch{}
 const nav=element(html,/<nav\b[^>]*class="[^"]*\bpagination\b[^"]*"[^>]*>/i,'nav');
 for(const m of nav.matchAll(/href="([^"]+)"/gi))try{const u=new URL(sDecode(m[1]),page);if(isKombishop(u)&&u.pathname===STOCK&&/^\d+$/.test(u.searchParams.get('page')||'')){u.hash='';lists.push(u.toString());}}catch{}
 const count=clean(html).match(/Il y a\s+(\d+)\s+produits?\b/i)?.[1];
 if(count==null)throw Error('Total du stock Kombishop absent');
 if(!grid&&Number(count)>0)throw Error('Grille du stock Kombishop absente');
 return {details:[...new Set(details)],lists:[...new Set(lists)],total:Number(count)};
}
export function parseKombishop(html:string,url:string){
 const u=new URL(url),id=u.pathname.match(/^\/vans\/(\d+)-/)?.[1];if(!isKombishop(u)||!id)throw Error('Fiche Kombishop hors périmètre');
 let product:any;
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{const j=JSON.parse(m[1]);for(const p of Array.isArray(j)?j:[j,...(j['@graph']||[])])if(p?.['@type']==='Product'){
  const offered=new URL(p.offers?.url||p.url||'',u);if(isKombishop(offered)&&offered.pathname.match(/^\/vans\/(\d+)-/)?.[1]===id)product=p;
 }}catch{}
 if(!product)throw Error('Données propres au véhicule Kombishop absentes : '+id);
 const offer=product.offers;if(/OutOfStock|SoldOut|Discontinued/i.test(offer.availability||'')||/^(?:\[\s*)?(?:vendue?|r[ée]serv[ée]e?)(?=[\s\]!:,.-]|$)|(?:[-–—(\[])\s*(?:vendue?|r[ée]serv[ée]e?)[)\]!\s]*$/i.test(sDecode(product.name||'')))return {_sold:1,reference:String(product.sku||id)};
 if(!/\/InStock$/i.test(offer.availability||''))throw Error('Disponibilité Kombishop non confirmée : '+id);
 const price=Number(offer.price);if(!(price>0)||offer.priceCurrency!=='EUR')throw Error('Prix Kombishop absent : '+id);
 const blocks:string[]=[];
 for(const m of html.matchAll(/<div\b[^>]*class="product-description"[^>]*>/gi))blocks.push(clean(element(html.slice(m.index),/^<div\b[^>]*>/i)));
 const unique=[...new Set(blocks.filter(Boolean))];const description=unique.filter((v,i)=>!unique.some((w,j)=>i!==j&&w.length>v.length&&w.startsWith(v))).join('\n\n')||sDecode(product.description||'');
 const gallery=element(html,/<ul\b[^>]*class="[^"]*\bproduct-images\b[^"]*"[^>]*>/i,'ul');
 const photoUrls=[...(Array.isArray(offer.image)?offer.image:[]),...[...gallery.matchAll(/data-image-large-src="([^"]+)"/gi)].map(m=>sDecode(m[1]))];
 const photos=new Map<string,string>();for(const raw of photoUrls)try{const p=new URL(raw,u),key=p.pathname.match(/^\/(\d+)-large_default\/[^/]+\.(?:jpe?g|webp|png)$/i)?.[1];if(isKombishop(p)&&key&&!photos.has(key))photos.set(key,p.toString());}catch{}
 if(!photos.size)throw Error('Galerie du véhicule Kombishop absente : '+id);
 const contact=clean(element(html,/<div\b[^>]*id="contact-infos"[^>]*>/i));const city=contact.match(/\b(\d{5})\s+([^\n]+)/);
 const phone=contact.match(/\b0[1-9](?:[ .-]*\d){8}\b/)?.[0];
 const row:any={reference:String(product.sku||id),url:u.toString(),titre:sDecode(product.name||''),description,prix:String(price),marque:sDecode(product.brand?.name||''),type:'voitures',photos:[...photos.values()].join('|'),ville:city?.[2]?.trim()||'',code_postal:city?.[1]||''};
 if(phone){row.contact_nom='Kombishop (garage)';row.contact_telephone=phone;}
 const model=description.match(/Mod[èe]le\s*:\s*([^\n•]+)/i)?.[1]?.trim();if(model)row.modele=model;
 const km=description.match(/Kilom[ée]trage\s*:\s*([\d .\u202f]+)\s*km/i)?.[1]||row.titre.match(/([\d .\u202f]+)\s*km/i)?.[1];if(km)row.kilometrage=km.replace(/[ .\u202f]/g,'');
 const date=description.match(/M\s*\.?\s*E\s*\.?\s*C\s*\.?\s*:\s*((?:\d{1,2}[./-]){1,2}((?:19|20)\d{2}))/i);
 if(date){row.annee=date[2];row.mise_en_circulation=date[1];}else {const year=row.titre.match(/\b((?:19|20)\d{2})\b/)?.[1];if(year)row.annee=year;}
 if(/\bessence\b/i.test(description))row.carburant='essence';else if(/\bdiesel\b|\btdi\b/i.test(description))row.carburant='diesel';
 if(/bo[iî]te[^\n•]{0,35}manuelle/i.test(description))row.boite='manuelle';else if(/bo[iî]te[^\n•]{0,35}automatique/i.test(description))row.boite='automatique';
 return row;
}
export async function readKombishop(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
 const start=new URL(STOCK,ORIGIN),first=await fetchHtml(start),initial=kombishopLinks(first.text,first.url);
 if(!initial.total)return Object.assign([],{partial:false,total:0,siteCount:0,platform:'Kombishop (véhicules en stock)',sector:'vehicules'});
 const rows:any=await crawlCatalogue(ORIGIN+'/','kombishop-v1',[start.toString()],async u=>u.toString()===start.toString()?first:fetchHtml(u),(h,u)=>{
  const page=kombishopLinks(h,u);if(page.total!==initial.total)throw Error('Le stock Kombishop a changé pendant la lecture');return page;
 },parseKombishop,memory,{expectedTotal:initial.total,maxDetails:20});
 rows.siteCount=initial.total;rows.platform='Kombishop (véhicules en stock)';rows.sector='vehicules';return rows;
}
