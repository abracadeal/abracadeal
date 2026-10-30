import {sDecode,smartDetail} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(s:string)=>sDecode(s.replace(/<br\s*\/?>|<\/(?:p|li|div)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/\\'/g,"'").replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const visible=(s:string)=>s.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
const links=(s:string,base:URL)=>[...s.matchAll(/href=["']([^"'<>]+)["']/gi)].flatMap(m=>{try{const u=new URL(sDecode(m[1]),base);return u.origin===base.origin?[u]:[];}catch{return[];}});
const number=(s:string)=>s.replace(/[ \t\n\u00a0\u202f]/g,'').replace(',','.');
export function parseBiasDetail(raw:string,url:string){
 const id=new URL(url).searchParams.get('idBien');if(!id)return null;const html=visible(raw);
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 const place=[...html.matchAll(/<p\b[^>]*class="title-small bold"[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1]));
 const description=clean(html.match(/<p\b[^>]*id="descPrint"[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');
 if(!title||!place[0]||!place[1]||!description)return null;if(/\bvendu[e]?\b|\blou[ée]e?\b/i.test(title))return null;
 const row:any={...smartDetail(raw,url,'immobilier'),reference:id,url,titre:title,ville:place[1],type_bien:place[0],description,transaction:/\/location\//.test(new URL(url).pathname)?'location':'vente'};
 delete row.code_postal;
 const price=clean(html.match(/<p\b[^>]*id="prixPrint"[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'').match(/(\d[\d\s.,]*)€/);if(price)row.prix=number(price[1]);else delete row.prix;
 for(const m of html.matchAll(/class="box-info"[^>]*>([\s\S]*?)(?=<div class="box-info"|<\/div>\s*<\/div>\s*<\/div>)/gi)){
  const ps=[...m[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>clean(x[1]));const key:Record<string,string>={'Chambres':'chambres',"Salles d'eau":'salles_de_bain','Terrain':'surface_terrain','Surface':'surface','Pièces':'pieces'};
  const k=key[ps[0]];const value=ps[1]?.match(/[\d]+(?:[.,]\d+)?/)?.[0];if(k&&value)row[k]=number(value);
 }
 const originals=[...html.matchAll(/<a\b([^>]+)>/gi)].filter(m=>/data-lightbox="maison"/.test(m[1])).map(m=>m[1].match(/href="([^"<>]+)"/)?.[1]).filter((x):x is string=>!!x).map(sDecode);
 row.photos=dedupePhotos(originals).join('|');
 for(const [field,css] of [['dpe','energie'],['ges','gas']]){delete row[field];const m=html.match(new RegExp('class="[^"<>]*\\b'+css+'_([a-g])\\b[^"<>]*\\bactiveEnergie\\b','i'));if(m)row[field]=m[1].toUpperCase();}
 if(/non soumis au DPE/i.test(description))row.dpe='NON SOUMIS';
 const adviser=description.match(/Votre conseiller[^\n:]*:\s*([^\n]+)/i)?.[1];if(adviser)row.contact_nom=adviser.trim();
 const signature=description.match(/Cette annonce vous est proposée par ([^\n]+)/i)?.[1]||'';
 const norm=(x:string)=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
 const sameAdviser=!!adviser&&norm(signature).includes(norm(adviser));
 const phone=(sameAdviser?signature.match(/(0\d(?:[ .-]*\d){8})/):description.match(/(?:tél(?:éphone)?|tel)\s*[.: ]*\s*(0\d(?:[ .-]*\d){8})/i))?.[1];if(phone&&adviser)row.contact_telephone=phone.replace(/\D/g,'');
 row.texte_page=description;return row;
}
export async function readBiasAgency(start:URL,home:string,fetchHtml:Fetcher){
 const roots=links(home,start).filter(u=>/^\/biens-agence(?:-bias-immobiliere-en-normandie)?\/?$/.test(u.pathname)&&/^\d+$/.test(u.searchParams.get('ref-agence')||''));
 if(/^\/biens-agence/.test(start.pathname)&&start.searchParams.has('ref-agence'))roots.push(start);
 const ids=new Set(roots.map(u=>u.searchParams.get('ref-agence')));if(ids.size!==1)throw Error('Catalogue propre à cette agence BIAS introuvable ou ambigu.');
 const id=[...ids][0];const root=roots.find(u=>u.pathname.includes('-bias-'))||roots[0];const queue=[root],seen=new Set<string>(),entries=new Map<string,URL>();let partial=false,pages=0;
 while(queue.length&&seen.size<40){const u=queue.shift()!;if(seen.has(u.toString()))continue;seen.add(u.toString());let html:string;try{html=(await fetchHtml(u)).text;pages++;}catch{partial=true;continue;}
  for(const link of links(html,root)){const key=link.searchParams.get('idBien');if(/^\/(vente|location)\//.test(link.pathname)&&key&&/^\d+$/.test(key)){link.hash='';entries.set(key,link);}
   else if(link.pathname===root.pathname&&(link.searchParams.has('page')||link.searchParams.has('paged'))){if(link.searchParams.get('ref-agence')!==id){partial=true;continue;}if(!seen.has(link.toString()))queue.push(link);}}
 }if(queue.length)partial=true;
 const rows:any[]=[];let next=0,sold=0;const failures:string[]=[];const details=[...entries.entries()];
 await Promise.all(Array.from({length:3},async()=>{while(next<details.length){const[key,u]=details[next++];try{const html=(await fetchHtml(u)).text;const row=parseBiasDetail(html,u.toString());if(row)rows.push(row);else if(/<h1\b[^>]*>[\s\S]*?\b(?:vendu[e]?|lou[ée]e?)\b[\s\S]*?<\/h1>/i.test(html))sold++;else{partial=true;failures.push(u.toString());rows.push({reference:key,url:u.toString()});}}catch{partial=true;failures.push(u.toString());rows.push({reference:key,url:u.toString()});}}}));
 (rows as any).partial=partial;(rows as any).total=entries.size;(rows as any).stats={pages,details:entries.size,read:rows.length,sold,failures,agency_id:id};return rows;
}
export function parsePierrefeuDetail(raw:string,url:string){
 const html=visible(raw),u=new URL(url);const id=u.pathname.match(/\/(\d+)\.htm$/)?.[1];if(!id)return null;
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');const parts=title.match(/^(.+?)\s+-\s+(.+)$/);if(!parts)return null;
 const start=html.indexOf('class="description-immobilier"');const descSection=start>=0?html.slice(start,html.indexOf('class="prix-immobilier-detail"',start)):'';
 const description=clean(descSection.replace(/^[\s\S]*?<strong>[\s\S]*?<\/strong>\s*<br\s*\/?>\s*<div>/i,'').replace(/<span\b[^>]*class="financierStd"[\s\S]*$/i,''));
 const row:any={reference:id,url,titre:title,type_bien:parts[1],ville:parts[2],code_postal:u.pathname.match(/-(\d{5})\//)?.[1]||'',transaction:u.pathname.startsWith('/location/')?'location':'vente',description};
 const priceHtml=html.match(/class="prix-immobilier-detail"[^>]*>([\s\S]*?)(?=<div class="retour-liste)/i)?.[1]||'';const price=clean(priceHtml).match(/(\d[\d .,]*)€/);if(price)row.prix=number(price[1]);
 const facts=html.match(/<strong>\s*(?:Surface habitable|Surface utile|Type|Pièces)[\s\S]*/i)?.[0]||html;
 const fact=(label:string)=>clean(facts.match(new RegExp('<strong>\\s*(?:'+label+')\\s*:?\\s*</strong>([^<]+)','i'))?.[1]||'');
 const surface=fact('Surface habitable|Surface utile').match(/[\d]+(?:[.,]\d+)?/)?.[0];if(surface)row.surface=number(surface);
 const land=fact('Terrain').match(/[\d]+(?:[.,]\d+)?/)?.[0];if(land)row.surface_terrain=number(land);
 const rooms=clean(html).match(/(\d+)\s*pièces?/i)?.[1],beds=clean(html).match(/(\d+)\s*chambre\(s\)|(?:-|\n)\s*(\d+)\s*chambres?/i);if(rooms)row.pieces=rooms;if(beds)row.chambres=beds[1]||beds[2];
 const originals=[...html.matchAll(/<a\b[^>]*href="([^"<>]+)"[^>]*rel="gallery\[(\d+)\]"/gi)].filter(m=>m[2]===id).map(m=>sDecode(m[1]));row.photos=dedupePhotos(originals).join('|');
 const phone=html.match(/iconeTELEPHONE\.jpg[^>]*>\s*:\s*([^<]+)/i)?.[1];if(phone){const digits=phone.replace(/\D/g,'');row.contact_telephone=digits.startsWith('330')?'0'+digits.slice(3):digits;row.contact_nom='Agence Immobilière Pierrefeu';}
 const adviser=description.match(/(?:^|\n)([A-ZÀ-Ÿ][A-Za-zÀ-ÿ' -]{2,60}?)\s*[–—-]\s*EI\s*[–—-]\s*RSAC[^\n]*\n\s*(0[67](?:[ .-]*\d){8})/);if(adviser){row.contact_nom=adviser[1].trim();row.contact_telephone=adviser[2].replace(/\D/g,'');}
 row.texte_page=clean(html.slice(html.indexOf('class="details-immobilier"'))).slice(0,12000);return row;
}
export async function readPierrefeu(start:URL,home:string,fetchHtml:Fetcher){
 const origin=new URL(start.origin);if(/^\/(?:vente-achat|location)\//.test(start.pathname)){const row=parsePierrefeuDetail(home,start.toString());return row?[row]:[];}
 const roots=[{path:'/fr/acheter-biens-immobiliers.htm',kind:'vente-achat',pagination:/^\/fr\/(?:achat-vente|acheter)-biens-immobiliers\.htm$/},{path:'/fr/locations-biens-immobiliers.htm',kind:'location',pagination:/^\/fr\/locations-(?:biens-)?immobiliers(?:-pierrefeu)?\.htm$/}];
 const entries=new Map<string,URL>();let partial=false,pages=0,total=0;
 for(const root of roots){const queue=[new URL(root.path,origin)],seen=new Set<string>();let declared:number|undefined;
  while(queue.length&&seen.size<40){const u=queue.shift()!;const pageKey=u.searchParams.getAll('page').at(-1)||'0';if(seen.has(pageKey))continue;seen.add(pageKey);let html:string;try{html=(await fetchHtml(u)).text;pages++;}catch{partial=true;continue;}
   if(declared===undefined){const m=html.match(/id="resultat"[^>]*>\s*(\d+)\s+annonces?/i);if(m){declared=Number(m[1]);total+=declared;}else partial=true;}
   const blocks=html.split(/(?=<div\b[^>]*id="biens-immobiliers")/i).filter(x=>/^<div\b[^>]*id="biens-immobiliers"/i.test(x));
   for(const block of blocks){const own=links(block,origin).find(u=>new RegExp('^/'+root.kind+'/[^/]+/\\d+\\.htm$').test(u.pathname));if(own){own.search='';entries.set(own.toString(),own);}}
   for(const link of links(html,origin))if(root.pagination.test(link.pathname)){const page=link.searchParams.getAll('page').at(-1)||'';if(!/^\d+$/.test(page)||seen.has(page)||queue.some(x=>(x.searchParams.getAll('page').at(-1)||'0')===page))continue;link.searchParams.delete('page');link.searchParams.set('page',page);queue.push(link);}
  }if(queue.length)partial=true;
 }if(entries.size!==total)partial=true;
 const rows:any[]=[];let next=0;const failures:string[]=[];const details=[...entries.values()];
 await Promise.all(Array.from({length:3},async()=>{while(next<details.length){const u=details[next++];try{const row=parsePierrefeuDetail((await fetchHtml(u)).text,u.toString());if(row)rows.push(row);else{partial=true;failures.push(u.toString());rows.push({reference:u.pathname,url:u.toString()});}}catch{partial=true;failures.push(u.toString());rows.push({reference:u.pathname,url:u.toString()});}}}));
 (rows as any).partial=partial;(rows as any).total=total;(rows as any).stats={pages,details:entries.size,read:rows.length,failures};return rows;
}
