import {sDecode} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(s:string)=>sDecode(s.replace(/<br\s*\/?>|<\/(?:p|li)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const links=(s:string,base:URL)=>[...s.matchAll(/href="([^"<>]+)"/gi)].flatMap(m=>{try{const u=new URL(sDecode(m[1]),base);return u.origin===base.origin?[u]:[];}catch{return[];}});
export function ajpProperties(html:string){const raw=html.match(/\bvar\s+properties\s*=\s*(\[[\s\S]*?\]);/)?.[1];if(!raw)throw Error('Données publiques AJP absentes.');const rows=JSON.parse(raw);if(!Array.isArray(rows))throw Error('Catalogue AJP invalide.');return rows;}
export function parseAjpDetail(raw:string,url:string){
 const id=new URL(url).pathname.match(/\/(\d+)\/?$/)?.[1];if(!id)return null;
 const p=ajpProperties(raw).find(x=>String(x.id)===id&&x.url&&new URL(x.url).pathname===new URL(url).pathname);if(!p)return null;
 if(/vendu|loué|retiré/i.test(p.status||''))return null;
 const html=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/\s*-\s*AJP Immobilier.*$/i,'');
 const description=clean(html.match(/<h3\b[^>]*>\s*Description de ce bien\s*<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');
 if(!title||!description)return null;
 const o:any={reference:id,url,titre:title,description,ville:p.city,type_bien:p.type,transaction:p.listing_type==='rent'?'location':'vente',prix:String(p.price||'').replace(/[ \u00a0\u202f]/g,'').replace(',','.'),surface:p.surface,pieces:p.rooms,chambres:p.bedrooms,surface_terrain:p.terrain,salles_de_bain:p.bathrooms,contact_nom:p.agency};
 if(/\/locations\//.test(url))o.transaction='location';
 const phone=html.match(/href="tel:([^"<>]+)"[^>]*id="phone-btn"/i)?.[1];if(phone)o.contact_telephone=sDecode(phone).trim();
 const photoUrls=[...html.matchAll(/<img\b[^>]*src="([^"<>]+)"/gi)].map(m=>sDecode(m[1])).filter(u=>{try{const x=new URL(u);return /immo-facile\.com$/.test(x.hostname)&&new RegExp('/'+id+'[a-z0-9_-]*\\.(?:jpe?g|png|webp)$','i').test(x.pathname);}catch{return false;}});
 o.photos=dedupePhotos(photoUrls.length?photoUrls:[p.image].filter(Boolean)).join('|');
 const energy=html.match(/class="[^"<>]*\bnew-dpe-conso-([A-G])\b[^"<>]*"[^>]*>([\s\S]*?)class="unit"/i);const climate=html.match(/class="[^"<>]*\bnew-dpe-gaz-([A-G])\b[^"<>]*"/i);
 if(energy){o.dpe=energy[1].toUpperCase();const value=energy[2].match(/class="value"[^>]*>\s*([\d.,]+)/)?.[1];if(value)o.consommation_energie=value.replace(',','.');}if(climate)o.ges=climate[1].toUpperCase();
 if(/(?:DPE|diagnostic)[^.\n]{0,60}non soumis|non soumis[^.\n]{0,40}DPE/i.test(clean(html)))o.dpe='NON SOUMIS';
 o.texte_page=clean(html.slice(html.indexOf('Description de ce bien'))).slice(0,12000);return o;
}
export async function readAjpAgency(start:URL,home:string,fetchHtml:Fetcher){
 if(/^\/annonces\/(?:achat|locations)\//.test(start.pathname)){const row=parseAjpDetail(home,start.toString());return row?[row]:[];}
 const roots=links(home,start).filter(u=>/^\/immobilier\/(?:achat|locations)\/[^/]+\/\d+\/?$/.test(u.pathname));
 const unique=[...new Map(roots.map(u=>[u.pathname,u])).values()];const ids=new Set(unique.map(u=>u.pathname.match(/\/(\d+)\/?$/)![1]));
 if(ids.size!==1||!unique.length)throw Error('Catalogue propre à cette agence AJP introuvable ou ambigu.');
 const agencyId=[...ids][0],entries=new Map<string,URL>();let pages=0,partial=false,total=0;
 for(const root of unique){const queue=[root],seen=new Set<string>();let declared:number|undefined;
  while(queue.length&&seen.size<30){const u=queue.shift()!;if(seen.has(u.toString()))continue;seen.add(u.toString());let html:string;
   try{html=(await fetchHtml(u)).text;pages++;}catch{partial=true;continue;}
   if(declared===undefined){const m=clean(html).match(/Résultats de votre recherche\s*:\s*(\d+)\s+annonces?/i);if(m){declared=Number(m[1]);total+=declared;}else partial=true;}
   let properties:any[];try{properties=ajpProperties(html);}catch{partial=true;continue;}
   for(const p of properties){let detail:URL;try{detail=new URL(p.url,start);}catch{partial=true;continue;}if(detail.origin!==start.origin||!/^\/annonces\/(?:achat|locations)\/[^/]+\/[^/]+\/\d+$/.test(detail.pathname)){partial=true;continue;}detail.search='';entries.set(String(p.id),detail);}
   for(const link of links(html,start))if(link.pathname===root.pathname&&/^\d+$/.test(link.searchParams.get('page')||'')&&(!link.searchParams.has('agency_id')||link.searchParams.get('agency_id')===agencyId)&&!seen.has(link.toString())&&!queue.some(x=>x.toString()===link.toString()))queue.push(link);
  }if(queue.length)partial=true;
 }
 if(entries.size!==total)partial=true;
 const rows:any[]=[];const failures:string[]=[];let next=0,sold=0;const details=[...entries.entries()];
 await Promise.all(Array.from({length:3},async()=>{while(next<details.length){const[id,u]=details[next++];try{const html=(await fetchHtml(u)).text;const row=parseAjpDetail(html,u.toString());if(row)rows.push(row);else{if(ajpProperties(html).some(x=>String(x.id)===id&&/vendu|loué|retiré/i.test(x.status||'')))sold++;else{rows.push({reference:id,url:u.toString()});failures.push(u.toString());partial=true;}}}catch{rows.push({reference:id,url:u.toString()});failures.push(u.toString());partial=true;}}}));
 (rows as any).partial=partial;(rows as any).total=total;(rows as any).stats={pages,details:entries.size,read:rows.length,sold,failures,agency_id:agencyId};return rows;
}
