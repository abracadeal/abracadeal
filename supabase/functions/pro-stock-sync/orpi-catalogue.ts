import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const decode=(s:string)=>s.replace(/&amp;/g,'&');
export function isOrpiBusinessAgency(html:string,slug:string){
 return [...html.matchAll(/href=["']([^"']+)["']/gi)].some(m=>{try{const u=new URL(decode(m[1]),'https://www.orpi.com');return u.hostname==='www.orpi.com'&&u.pathname.startsWith('/'+slug+'/commerces-entreprises/');}catch{return false;}});
}
export async function readOrpiCatalogue(origin:URL,slug:string,fetchHtml:Fetcher,parse:(html:string,url:string)=>any,memory?:CrawlMemory,commercial=false){
 const query=(path:string,transaction:string)=>{const u=new URL(path,origin);u.searchParams.set('agency',slug);u.searchParams.set('onlyEnabled','1');u.searchParams.set('transactions[0]',transaction);return u;};
 const prefix=commercial?'/commerces-entreprises':'',scope=(commercial?'orpi-oce-v1:':'orpi-v2:')+slug;
 const counts=new Map<string,number>();
 for(const t of ['buy','rent']){const r=await fetchHtml(query(prefix+'/recherche/count',t));if(r.url.origin!==origin.origin||!/^\s*\d+\s*$/.test(r.text))throw Error('Compteur Orpi filtré non reconnu');counts.set(t,Number(r.text));}
 const api=['buy','rent'].map(t=>query(prefix+'/recherche/ajax',t).toString());
 const roots=commercial?[`/${slug}/commerces-entreprises/acheter`,`/${slug}/commerces-entreprises/louer`]:[`/${slug}/acheter/biens-en-vente`,`/${slug}/louer/biens-en-location`];
 const mem=memory?{...memory,load:async()=>{const s=await memory.load();if(s?.scope===scope&&s.source===new URL('/'+slug+'/',origin).toString()&&!s.completed&&Array.isArray(s.lists)&&Array.isArray(s.visited))for(const url of api)if(!s.visited.includes(url)&&!s.lists.some((x:any)=>x.url===url))s.lists.push({url,tries:0});return s;}}:undefined;
 return crawlCatalogue(new URL('/'+slug+'/',origin).toString(),scope,api,fetchHtml,(html,page)=>{
  if(page.pathname===prefix+'/recherche/ajax'){
   const t=page.searchParams.get('transactions[0]')||'',j=JSON.parse(html);
   if(j.agency!==slug||!counts.has(t)||Number(j.count)!==counts.get(t)||!Array.isArray(j.items)||j.items.length>Number(j.count))throw Error('Périmètre ou total du catalogue Orpi modifié');
   const details:string[]=[];
   for(const e of j.items){if(e.transaction!==t||e.enabled!==true||e.sold||!/^[-a-z0-9]+$/i.test(e.slug||''))throw Error('Annonce Orpi hors transaction ou indisponible');const u=new URL('/annonce-'+(t==='buy'?'vente':'location')+'-'+e.slug+'/',origin);u.searchParams.set('agency',slug);details.push(u.toString());}
   if(new Set(details).size!==details.length)throw Error('Page JSON Orpi répétée');
   return {details,lists:j.items.length<Number(j.count)?[new URL(roots[t==='buy'?0:1],origin).toString()]:[]};
  }
  if(!roots.includes(page.pathname))throw Error('Liste hors agence');
  const details=[...new Set([...html.matchAll(/href="(\/annonce-(?:vente|location)-[a-z0-9-]+\/?[^" ]*)"/gi)].map(m=>new URL(decode(m[1]),origin).toString()))];const lists:string[]=[];
  for(const m of html.matchAll(/href=["']([^"']+)["']/g)){try{const u=new URL(decode(m[1]),page);if(u.origin===origin.origin&&u.pathname===page.pathname&&/^\d+$/.test(u.searchParams.get('page')||'')&&Number(u.searchParams.get('page'))>Number(page.searchParams.get('page')||1)){const next=new URL(u.pathname,origin);next.searchParams.set('page',u.searchParams.get('page')!);lists.push(next.toString());}}catch{}}
  if(!/annonce-|Aucun bien|aucun résultat|0 bien/i.test(html))throw Error('Liste Orpi non reconnue');return {details,lists};
 },(html,url)=>{const row=parse(html,url);if(!row)throw Error('Fiche Orpi indisponible');return row;},mem,{maxDetails:25,expectedTotal:(counts.get('buy')||0)+(counts.get('rent')||0)});
}
