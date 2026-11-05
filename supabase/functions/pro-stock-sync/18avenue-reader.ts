// 18 Avenue: public stock and photo galleries are separate iframe documents.
import { sDecode } from './smart-reader.ts';
import { crawlCatalogue, type CrawlMemory } from './resumable-crawl.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const is18Avenue=(u:URL)=>/^(?:www\.)?18avenue\.fr$/i.test(u.hostname);
const clean=(s:string)=>sDecode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<br\s*\/?>|<\/(?:p|div|td|span)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
const number=(s:string)=>Number(s.replace(/[ \u00a0\u202f]/g,'').replace(',','.'));
export function avenueLinks(html:string,transaction:string){
 return [...new Set([...html.matchAll(/(?:\.\.\/)?(?:pages\/)?fiche\.AC3\.php\?codann=(\d+)/gi)].map(m=>`https://www.18avenue.fr/pages/fiche.AC3.php?codann=${m[1]}&abraca_tx=${transaction}`))];
}
export function avenuePhotos(html:string){
 return [...new Map([...html.matchAll(/(?:src|thisSRC)\s*=\s*["'](https:\/\/media\.immo-facile\.com\/office8\/dixhuitieme_avenue\/catalog\/images\/pr_p\/[^"'<>]+)["']/gi)].map(m=>{const u=sDecode(m[1]);return [u.split('?')[0],u];})).values()];
}
export function parse18Avenue(html:string,url:string,gallery:string){
 const u=new URL(url),reference=u.searchParams.get('codann');if(!reference)throw Error('Référence 18 Avenue absente');
 const own=html.split(/id=["']fichebien["']/i)[1]?.split(/<!-- MAP -->/i)[0];if(!own)throw Error('Fiche 18 Avenue introuvable : '+reference);
 const imageTitle=own.split(/<!-- TITRE -->/i)[1]?.split(/<!-- M²/i)[0]||'';
 const title=clean(imageTitle);if(!title)throw Error('Titre 18 Avenue absent : '+reference);
 const description=clean(own.match(/<span\b[^>]*class=["']?T123["']?[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
 const tx=u.searchParams.get('abraca_tx')==='LOC'?'location':'vente';u.searchParams.delete('abraca_tx');
 const p=clean(own);
 // The hidden financial tab sometimes contains an obsolete rent (8326: 193 €
 // there, but 1 762 € on the advert). Read only the displayed price cartouche.
 const price=number(own.match(/<span\b[^>]*class="T243"[^>]*>\s*([\d .,]+)€/i)?.[1]||'');
 if(!(price>0))throw Error('Prix 18 Avenue absent : '+reference);
 const cityBlock=own.split(/<!-- PARIS 18 -->/i)[1]?.split('</div>')[0]||'';
 const place=clean(cityBlock).match(/\b(\d{5})\s+([\p{L}][\p{L} '-]+)/u);
 const photos=avenuePhotos(gallery),photoCount=gallery.match(/\bNb\s*=\s*(\d+)/)?.[1];
 if(photoCount!=null&&photos.length!==Number(photoCount))throw Error('Galerie 18 Avenue incomplète : '+reference);
 const row:any={reference,url:u.toString(),titre:title,description,transaction:tx,prix:String(price),ville:place?.[2]?.trim()||(/\bParis\b/i.test(title+' '+description)?'Paris':''),code_postal:place?.[1]||'',photos:photos.join('|'),_keep_missing_city:true};
 row._source_city_missing=!row.ville;
 const value=(re:RegExp)=>{const v=p.match(re)?.[1];return v==null?undefined:number(v);};
 const type=p.match(/(?:^|\n)\s*Type\s*:\s*([^\n]+)/i)?.[1];if(type)row.type_bien=type;else if(/fonds de commerce/i.test(title))row.type_bien='local commercial';
 const headerFacts=clean(own.split(/<!-- M² \+ nB PIECES -->/i)[1]?.split(/<!-- PARIS 18 -->/i)[0]||'');
 const fields:any={surface:value(/Surface (?:Carrez|habitable)\s*:\s*([\d.,]+)/i)??(headerFacts.match(/([\d.,]+)\s*m²/i)?.[1]?number(headerFacts.match(/([\d.,]+)\s*m²/i)![1]):undefined),pieces:value(/NB pi[èe]ces\s*:\s*(\d+)/i),chambres:value(/NB chambres\s*:\s*(\d+)/i),etage:value(/(?:^|\n)Etage\s*:\s*(-?\d+)/i),nb_etages:value(/NB [ée]tages\s*:\s*(\d+)/i),annee_construction:value(/(?:Ann[ée]e construction|Construction)\s*:\s*(\d{4})/i)};
 for(const [k,v] of Object.entries(fields))if(v!=null&&Number.isFinite(v))row[k]=v;
 const fees=p.match(/(?:Honoraires (?:Vendeur|Acqu[ée]reur)|Montant Honoraires Acqu[ée]reur)\s*:\s*[^\n]+/i)?.[0];if(fees)row.honoraires=fees;
 // Agent name is printed on this advert. Only use a phone explicitly associated
 // with it; the site's generic agency number is never assigned to that person.
 const agent=description.match(/(?:^|\n)\s*([\p{L}' -]+?)\s*\(EI\)\s*Agent Commercial/u)?.[1]?.trim();if(agent)row.contact_nom=agent;
 const contact=own.match(/href=["']tel:([^"']+)["']/i)?.[1];if(contact&&!agent){row.contact_nom='Dixhuitième Avenue (agence)';row.contact_telephone=contact;}
 const agency=p.split('Votre agence')[1]?.split(/Int[ée]ress[ée]/i)[0]||'';
 const agencyPhone=agency.match(/(?:\+33|0)[ .-]*[1-9](?:[ .-]*\d){8}\b/)?.[0];
 if(agencyPhone){row.contact_nom='Dixhuitième Avenue (agence)';row.contact_telephone=agencyPhone;}
 // No diagnostic is inferred when the source only says to contact the agency.
 const energy=clean(own.split(/id=["']conso["']/i)[1]?.split('</td>')[0]||'');
 row.dpe=energy.match(/(?:DPE|classe [ée]nergie)\s*:\s*([A-G])\b/i)?.[1]||'';
 row.ges=energy.match(/(?:GES|classe climat)\s*:\s*([A-G])\b/i)?.[1]||'';
 return row;
}
export async function read18Avenue(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
 const source='https://www.18avenue.fr/',starts=['VTE','LOC'].map(tx=>`${source}pages/annonces.SS.php?ORG=ALL&VRS=${tx}&NbAnn=1000`);
 const fetcher=async(u:URL)=>{const v=new URL(u);v.searchParams.delete('abraca_tx');return fetchHtml(v);};
 const rows:any=await crawlCatalogue(source,'18avenue-v2',starts,fetcher,(h,u)=>{
  const tx=u.searchParams.get('VRS')||'VTE',details=avenueLinks(h,tx);
  if(!details.length&&!/aucun|pas de bien|0 bien/i.test(clean(h)))throw Error('Catalogue 18 Avenue vide sans total explicite');
  // The site's own NbAnn selector controls how many records are returned.
  // Refuse a saturated page instead of claiming that the stock is complete.
  if(details.length>=1000)throw Error('Catalogue 18 Avenue atteint la limite de 1000 fiches');
  return {lists:[],details};
 },async(h,link)=>{const g=new URL('/pages/fiche.SS.php',source);g.searchParams.set('codann',new URL(link).searchParams.get('codann')!);return parse18Avenue(h,link,(await fetchHtml(g)).text);},memory,{maxDetails:20});
 rows.platform='Dixhuitième Avenue (vente et location)';rows.sector='immobilier';return rows;
}
