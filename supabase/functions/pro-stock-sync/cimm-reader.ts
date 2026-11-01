// 01/11/2026 — Claude : agences Cimm Immobilier (<ville>.cimm.com, 26 agences dans les prospects).
// La page d'accueil de l'agence liste ses biens (liens https://cimm.com/bien/<titre>-p<n°>) ; chaque fiche est lue
// par la lecture automatique. Les biens vendus sont sur /biens-vendus (jamais lus).
import { smartDetail } from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const isCimmAgency=(url:URL)=>/^(?!www\.)[a-z0-9-]+\.cimm\.com$/i.test(url.hostname);
// Ville de secours : celle de l'agence (sous-domaine), ex. guipry-messac → Guipry-Messac.
const cityOf=(url:URL)=>url.hostname.split('.')[0].split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join('-');
export async function readCimmAgency(url:URL,fetchHtml:Fetcher){
  const{text}=await fetchHtml(new URL('/',url));
  const links=[...new Set([...text.matchAll(/href="(https:\/\/cimm\.com\/bien\/[a-z0-9.-]+-p\d+)\/?"/gi)].map(m=>m[1]))];
  if(!links.length)throw Error('Aucun bien sur la page de l’agence Cimm.');
  const rows:any[]=[];let failed=0;
  for(let i=0;i<links.length;i+=5){
    await Promise.all(links.slice(i,i+5).map(async l=>{
      try{const{text:h}=await fetchHtml(new URL(l));const r:any=smartDetail(h,l,'immobilier');if(!r)return;r.reference=l.match(/-p(\d+)$/)?.[1]||r.reference;if(!r.ville){const c=h.match(/alt="Photo principale - [^"]*? à ([^"<]{2,60})"/i)?.[1]?.trim();if(c)r.ville=c;}if(!r.ville)r.ville=cityOf(url);rows.push(r);}catch{failed++;}
    }));
  }
  if(failed)(rows as any).partial=true;
  rows.sort((a,b)=>links.indexOf(a.url)-links.indexOf(b.url));
  return rows;
}
