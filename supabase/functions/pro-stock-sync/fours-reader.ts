import {sDecode,smartDetail} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(s:string)=>sDecode(s.replace(/<br\s*\/?>|<\/(?:p|li|div)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
function element(html:string,cls:string){const m=html.match(new RegExp('<div\\b[^>]*class="[^"<>]*\\b'+cls+'\\b[^"<>]*"[^>]*>','i'));if(!m)return'';const at=m.index!;const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=at+m[0].length;let depth=1;for(let t;(t=tags.exec(html));){depth+=/^<\//.test(t[0])?-1:1;if(!depth)return html.slice(at,tags.lastIndex);}return'';}
export function foursContact(html:string){const text=clean(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,''));const address=text.match(/Adresse\s*:\s*[\s\S]{0,160}?\b([0-9O]{5})\s+([^\n]+)/i);const phone=text.match(/Téléphone\s*:\s*([O0][1-9](?:[ .-]*\d){8})/i)?.[1];const name=text.match(/Votre contact\s*:\s*([^\n]+)/i)?.[1];return{ville:address?.[2]?.split(/Téléphone|Votre contact|Email/i)[0].trim(),code_postal:address?.[1].toUpperCase().replace(/O/g,'0'),contact_nom:name?.split(/Email|Web/i)[0].trim(),contact_telephone:phone?.replace(/^O/i,'0').replace(/\D/g,'')};}
export function foursUnavailable(raw:string){
 const html=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const content=element(html,'stm-single-car-content');const p=content.search(/<p\b/i);const desc=p>=0?clean(content.slice(p)):'';
 if(/^vendu[e]?\b/i.test(desc)||/\bvendu[e]?\b|\bsold\b/i.test(clean(element(html,'single-car-prices')))||/class="[^"<>]*\b(?:stm-sold|stm-car-sold-label|car-mark-as-sold)\b/.test(html))return 'vendu';
 if(/^recherche personnalisée pour un client\b/i.test(desc)&&!/\bkm\b|mise en circulation/i.test(desc))return 'exemple de recherche personnalisée';
 return '';
}
export function parseFourS(raw:string,url:string,contact:any={}){
 const html=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');const id=html.match(/\bpostid-(\d+)/)?.[1];if(!id)return null;
 const priceBlock=element(html,'single-car-prices');if(foursUnavailable(raw))return null;
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');const price=clean(priceBlock).match(/(\d[\d .,]*)€/);
 const content=element(html,'stm-single-car-content');const p=content.search(/<p\b/i);const description=p>=0?clean(content.slice(p)):'';
 if(!title||!description)return null;
 const ownHtml='<html><head><title>'+title+'</title></head><body><h1>'+title+'</h1>'+priceBlock+content.slice(p>=0?p:content.length)+'</body></html>';
 const base=smartDetail(ownHtml,url,'vehicules')||{};const row:any={...base,...contact,reference:id,url,titre:title,description};
 if(price)row.prix=price[1].replace(/[ .]/g,'').replace(',','.');else delete row.prix;
 const originals=[...html.matchAll(/<a\b[^>]*href="([^"<>]+)"[^>]*rel="stm-car-gallery"/gi)].map(m=>sDecode(m[1]));row.photos=dedupePhotos(originals).join('|');
 const km=description.match(/(\d[\d .\u00a0]*)\s*km\b/i);if(km)row.kilometrage=km[1].replace(/[ .\u00a0]/g,'');
 const year=description.match(/(?:mise en circulation|immatricul[ée]e?)[^\d]{0,40}((?:19|20)\d{2})/i)?.[1];if(year)row.annee=year;
 const guarantee=description.match(/garantie\s+(\d+\s*(?:mois|ans?))/i)?.[1];if(guarantee)row.garantie=guarantee;
 row.type=/\bmoto\b|\bscooter\b/i.test(title)?'moto':'voiture';return row;
}
export async function readFourS(start:URL,home:string,fetchHtml:Fetcher){
 const contact=foursContact(home);if(/^\/listings\/[^/]+\/$/.test(start.pathname)){const row=parseFourS(home,start.toString(),contact);return row?[row]:[];}
 const origin=new URL(start.origin),queue=[new URL('/vehicules-disponibles/',origin)],seen=new Set<string>(),details=new Map<string,URL>();let partial=false,pages=0;
 while(queue.length&&seen.size<30){const u=queue.shift()!;if(seen.has(u.toString()))continue;seen.add(u.toString());let html:string;try{html=(await fetchHtml(u)).text;pages++;}catch{partial=true;continue;}
  for(const m of html.matchAll(/href=["']([^"'<>]+)["']/gi)){let link:URL;try{link=new URL(sDecode(m[1]),u);}catch{continue;}if(link.origin!==origin.origin)continue;link.hash='';link.search='';
   if(/^\/listings\/[^/]+\/$/.test(link.pathname))details.set(link.toString(),link);
   else if(/^\/vehicules-disponibles\/page\/\d+\/$/.test(link.pathname)&&!seen.has(link.toString()))queue.push(link);
  }
 }if(queue.length)partial=true;
 const rows:any[]=[];const failures:string[]=[];let next=0,sold=0,examples=0;const excluded:any[]=[];const urls=[...details.values()];
 await Promise.all(Array.from({length:3},async()=>{while(next<urls.length){const url=urls[next++];try{const html=(await fetchHtml(url)).text;const row=parseFourS(html,url.toString(),contact);if(row)rows.push(row);else if(foursUnavailable(html)){const reason=foursUnavailable(html);if(reason==='vendu')sold++;else examples++;excluded.push({url:url.toString(),reason});}else{rows.push({reference:url.pathname,url:url.toString()});failures.push(url.toString());partial=true;}}catch{rows.push({reference:url.pathname,url:url.toString()});failures.push(url.toString());partial=true;}}}));
 (rows as any).partial=partial;(rows as any).total=details.size;(rows as any).stats={pages,details:details.size,read:rows.length,sold,examples,excluded,failures};return rows;
}
