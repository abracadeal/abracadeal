import {sDecode,smartDetail} from './smart-reader.ts';
type Fetcher=(url:URL)=>Promise<{text:string,url:URL}>;
const clean=(s:string)=>sDecode(s.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').trim();
const links=(s:string,base:URL)=>[...s.matchAll(/href="([^"<>]+)"/gi)].flatMap(m=>{try{const u=new URL(sDecode(m[1]),base);return u.origin===base.origin?[u]:[];}catch{return[];}});
export function parseSalanie(html:string,url:string){
 const row=smartDetail(html,url,'immobilier');if(!row)return null;
 const id=html.match(/\bpostid-(\d+)/)?.[1];if(!id)return null;row.reference=id;
 const article=html.match(/<article\b[^>]*class="property-item[^"<>]*"[^>]*>([\s\S]*?)<\/article>/i)?.[1]||'';
 const status=clean(article.match(/class="status-label"[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
 if(!/^A (?:LOUER|VENDRE)$/i.test(status))return null;row.transaction=/louer/i.test(status)?'location':'vente';
 const amount=clean(article.match(/class="price"[^>]*>([\s\S]*?)<\/h5>/i)?.[1]||'').match(/([\d.,\s]+)€/);
 if(amount){const value=amount[1].replace(/\s/g,'');row.prix=String(Number(/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(value)?value.replace(/,/g,''):value.replace(',','.')));} // Site uses comma thousands: 110,000€.
 const meta=article.match(/class="property-meta[^"<>]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]||'';
 for(const [icon,key] of [['area','surface'],['bed','chambres'],['bath','salles_de_bain']]){const value=clean(meta.match(new RegExp('class="icon-'+icon+'"[^>]*></i>([^<]+)','i'))?.[1]||'').match(/\d+(?:[.,]\d+)?/)?.[0];if(value)row[key]=value.replace(',','.');}
 const gallery=html.match(/id="property-detail-flexslider"[^>]*>([\s\S]*?)<\/ul>/i)?.[1]||'';
 row.photos=[...new Set([...gallery.matchAll(/<a\b[^>]*href="([^"<>]+)"[^>]*class="swipebox"/gi)].map(m=>sDecode(m[1])))].join('|');
 delete row.ville;delete row.code_postal; // City comes from the website's own location-filtered results.
 return row;
}
export async function readSalanie(start:URL,home:string,fetchHtml:Fetcher){
 if(start.pathname!=='/'&&!/^\/property-status\/a-(?:vendre|louer)\/?$/.test(start.pathname))throw Error('Adresse accueil ou catalogue actif Salanié requise.');
 const origin=new URL(start.origin),roots=start.pathname==='/'?['a-vendre','a-louer'].map(x=>new URL('/property-status/'+x+'/',origin)):[start];
 const entries=new Map<string,URL>();let partial=false,pages=0;
 const visit=async(root:URL,city?:string)=>{const queue=[root],seen=new Set<string>();const found=new Set<string>();
  while(queue.length&&seen.size<30){const u=queue.shift()!;if(seen.has(u.toString()))continue;seen.add(u.toString());let html:string;
   try{html=(await fetchHtml(u)).text;pages++;}catch{partial=true;continue;}
   for(const link of links(html,origin)){if(/^\/property\/[^/]+\/$/.test(link.pathname)){link.search='';link.hash='';found.add(link.toString());if(!city)entries.set(link.toString(),link);}
    else if(link.pathname.startsWith(root.pathname)&&/\/page\/\d+\/$/.test(link.pathname)){if(city)link.search=root.search;if(!seen.has(link.toString()))queue.push(link);}}
  }if(queue.length)partial=true;return found;
 };
 for(const root of roots)await visit(root);
 const locationSelect=home.match(/<select\b[^>]*name="location"[^>]*>([\s\S]*?)<\/select>/i)?.[1]||'';
 const cities=[...locationSelect.matchAll(/<option\b[^>]*value="([^"<>]+)"[^>]*>\s*([^<]+)<\/option>/gi)].filter(m=>m[1]!=='any'&&/^[a-z-]+$/.test(m[1]));
 if(!cities.length)throw Error('Liste des villes Salanié absente : aucune ville ne sera devinée.');
 const locations=new Map<string,string>();const ambiguous=new Set<string>();
 for(const m of cities.sort((a,b)=>Number(b[1]==='nimes')-Number(a[1]==='nimes'))){
  const u=new URL('/property-search/',origin);u.searchParams.set('location',m[1]);
  const found=await visit(u,clean(m[2]));for(const url of found){const city=clean(m[2]);if(locations.has(url)&&locations.get(url)!==city)ambiguous.add(url);else locations.set(url,city);}
 }
 const rows:any[]=[];let next=0;const urls=[...entries.values()];
 await Promise.all(Array.from({length:3},async()=>{while(next<urls.length){const u=urls[next++];try{const row=parseSalanie((await fetchHtml(u)).text,u.toString());if(row){if(!ambiguous.has(u.toString()))row.ville=locations.get(u.toString())||'';rows.push(row);}else{partial=true;rows.push({url:u.toString(),reference:u.pathname});}}catch{partial=true;rows.push({url:u.toString(),reference:u.pathname});}}}));
 (rows as any).partial=partial;(rows as any).total=entries.size;(rows as any).stats={pages,details:entries.size,read:rows.length,ambiguous_cities:ambiguous.size};return rows;
}
