// 01/11/2026 — Claude : agences du réseau Citya sur le site national www.citya.com (45 agences dans les prospects).
// Adresse donnée : la page de l'agence (/agences-immobilieres/<ville>-<cp>/<n°>) ou sa liste (/annonces/agence/<n°>/vente).
// Liste des biens DE L'AGENCE : /annonces/agence/<n°>/vente et /location (+ ?page=N tant qu'il y a des nouveautés).
// Chaque fiche est lue par la lecture automatique ; on ne garde que les photos rangées sous /biens/<n°>/ (pas celles des biens « similaires »).
import { smartDetail } from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

export const cityaAgencyId=(url:URL)=>/(^|\.)citya\.com$/i.test(url.hostname)?(url.pathname.match(/^\/agences-immobilieres\/[^/]+\/(\d+)/)?.[1]||url.pathname.match(/^\/annonces\/agence\/(\d+)/)?.[1]||''):'';

export async function readCityaAgency(url:URL,fetchHtml:Fetcher){
  const id=cityaAgencyId(url);if(!id)throw Error('Adresse Citya : donner la page de l’agence (citya.com/agences-immobilieres/…/<n°>).');
  const origin=new URL('https://www.citya.com');const links:string[]=[];
  for(const t of ['vente','location']){
    for(let page=1;page<=30;page++){
      const u=new URL(`/annonces/agence/${id}/${t}`,origin);if(page>1)u.searchParams.set('page',String(page));
      let text='';try{({text}=await fetchHtml(u));}catch{break;}
      const found=[...new Set([...text.matchAll(/href="((?:https:\/\/www\.citya\.com)?\/annonces\/(?:vente|location)\/[a-z0-9-]+\/[a-z0-9-]+\/[A-Za-z0-9-]+)"/g)].map(m=>new URL(m[1],origin).toString()))];
      const fresh=found.filter(l=>!links.includes(l));links.push(...fresh);
      if(!fresh.length)break;
    }
  }
  if(!links.length)throw Error('Aucun bien sur la page de l’agence Citya.');
  const rows:any[]=[];let failed=0;
  for(let i=0;i<links.length;i+=5){
    await Promise.all(links.slice(i,i+5).map(async l=>{
      try{
        const{text}=await fetchHtml(new URL(l));
        if(!text.includes(`/biens/${id}/`))return; // bien d'une autre agence
        const r:any=smartDetail(text,l,'immobilier');if(!r)return;
        r.reference=l.split('/').pop();r.transaction=/\/annonces\/location\//.test(l)?'location':'vente';
        const own=String(r.photos||'').split('|').filter((p:string)=>p.includes(`/biens/${id}/`));
        if(own.length)r.photos=[...new Set(own.map((p:string)=>p.replace(/\.com\/\/media/,'.com/media')))].join('|');
        rows.push(r);
      }catch{failed++;}
    }));
  }
  if(failed)(rows as any).partial=true;
  rows.sort((a,b)=>links.indexOf(a.url)-links.indexOf(b.url));
  return rows;
}
