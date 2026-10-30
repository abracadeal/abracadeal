// Studio HB / Sainte Foy Immobilier: follow the agency's explicit active catalogue.
import {sDecode} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(v:any)=>sDecode(String(v??'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\r]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const num=(v:any)=>String(v||'').replace(/[^\d.,]/g,'').replace(',','.');
function section(h:string,id:string){const p=h.search(new RegExp(`<section\\b[^>]*id=["']${id}["']`,'i'));return p<0?'':h.slice(p,h.indexOf('</section>',p)+10);}
export function parseLyonImmo(h:string,url:string){
 const u=new URL(url),id=u.pathname.match(/-(\d+)\/?$/)?.[1];if(!id)throw Error('Référence Lyon Immo absente.');
 const hero=h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';const title=clean(hero.match(/<div\b[^>]*class=["'][^"']*\bh3\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]||hero);
 const header=h.split('accommodation-header__infos')[1]?.split('btn-wrapper')[0]||'';const price=clean(header).match(/(\d[\d \u00a0\u202f]*(?:[.,]\d{2})?)\s*€/);
 if(!title||!price)throw Error('Fiche Lyon Immo sans titre/prix.');
 const description=section(h,'bien').split(/INFORMATIONS ENERGETIQUES/i)[0].replace(/<h3[^>]*>[\s\S]*?<\/h3>/,'').split(/Voir nos honoraires/i)[0];
 const photos=[];for(const m of h.matchAll(/\bdata-src=["']([^"']+)["']/gi)){const p=sDecode(m[1]);if(p.includes('/uploads/accommodations/'+id+'/pictures/'))photos.push(new URL(p,u).toString());}
 const cp=u.pathname.match(/\/(?:ventes|locations)\/([^/]+)-(\d{5})\//);const city=clean(hero.match(/class=["']h4 uppercase["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]||cp?.[1]?.replace(/-/g,' '));
 const o:any={reference:id,url,titre:title,prix:num(price[1]),ville:city,code_postal:cp?.[2]||'',transaction:u.pathname.startsWith('/locations/')?'location':'vente',type_bien:u.pathname.split('/')[3]||'',description:clean(description).replace(/^DESCRIPTION DU BIEN\s*/i,''),photos:dedupePhotos(photos).join('|')};
 for(const m of h.matchAll(/class=["'][^"']*info__title[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*info__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)){
  const label=clean(m[1]),value=clean(m[2]);if(/Nb chambres/i.test(label))o.chambres=num(value);if(/Surface interieure/i.test(label))o.surface=num(value);if(/Surface extérieure/i.test(label))o.surface_terrain=num(value);if(/Année construction/i.test(label))o.annee_construction=num(value);if(/Exposition/i.test(label))o.exposition=value;
 }
 const energy=h.match(/id=["']collapseEnergie["'][^>]*>([\s\S]*?)(?=<\/section>)/i)?.[1]||'';const pointers=[...energy.matchAll(/class=["']pointer pointer-([a-g])["'][^>]*>\s*<span[^>]*>([\d.,]+)/gi)];
 if(pointers[0]){o.dpe=pointers[0][1].toUpperCase();o.consommation_energie=pointers[0][2];}if(pointers[1]){o.ges=pointers[1][1].toUpperCase();o.emission_ges=pointers[1][2];}
 const contact=section(h,'contact');o.contact_nom=clean(contact.match(/class=["']avatar-info__text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]||'').replace(/\s+/g,' ');o.contact_telephone=contact.match(/href=["']tel:([^"']+)/i)?.[1]||'';
 const heat=clean(section(h,'bien')).match(/Chauffage\s+([^\n]+)/i);if(heat)o.chauffage=heat[1];
 return o;
}
export async function readLyonImmo(start:URL,html:string,fetchHtml:Fetcher){
 if(/^\/(ventes|locations)\/[^/]+\/[^/]+\/.+-\d+\/?$/.test(start.pathname)){return[parseLyonImmo(html,start.toString())];}
 const links=[...html.matchAll(/href=["']([^"']+)["']/gi)].flatMap(m=>{try{return[new URL(sDecode(m[1]),start)];}catch{return[];}});
 const root=start.pathname==='/ventes'?start:links.find(u=>u.origin===start.origin&&u.pathname==='/ventes'&&u.searchParams.has('by_cities[]'));
 if(!root)throw Error('Catalogue actif de cette agence Lyon Immo introuvable.');
 const entries=new Set<string>(),seen=new Set<string>(),queue=[root];let partial=false,total:number|undefined;
 while(queue.length&&seen.size<30){const u=queue.shift()!;if(seen.has(u.toString()))continue;seen.add(u.toString());let text;
  try{text=u.toString()===start.toString()?html:(await fetchHtml(u)).text;}catch{partial=true;continue;}
  if(total===undefined){const m=clean(text.replace(/<script\b[\s\S]*?<\/script>/gi,'')).match(/(\d+) résultats?/i);if(m)total=Number(m[1]);}
  for(const m of text.matchAll(/href=["']([^"']+)["']/gi)){let link:URL;try{link=new URL(sDecode(m[1]),u);}catch{continue;}if(link.origin!==root.origin)continue;
   if(/^\/ventes\/[^/]+\/[^/]+\/.+-\d+\/?$/.test(link.pathname)){link.search='';link.hash='';entries.add(link.toString());}
   else if(link.pathname===root.pathname&&link.searchParams.has('page')){const scope=(x:URL)=>[...x.searchParams.entries()].filter(([k])=>k!=='page').sort().map(([k,v])=>k+'='+v).join('&');if(scope(link)===scope(root)&&!seen.has(link.toString()))queue.push(link);}
  }
 }
 if(!entries.size)throw Error('Aucun bien actif Lyon Immo.');if(queue.length||total===undefined||entries.size!==total)partial=true;
 const urls=[...entries],rows:any[]=[];let next=0;const failures:any[]=[];
 await Promise.all(Array.from({length:3},async()=>{while(next<urls.length){const u=urls[next++];try{rows.push(parseLyonImmo((await fetchHtml(new URL(u))).text,u));}catch(e){partial=true;failures.push({url:u,error:String(e)});}}}));
 (rows as any).partial=partial;(rows as any).total=total;(rows as any).stats={pages:seen.size,details:entries.size,read:rows.length,failures};return rows;
}
