// 01/11/2026 — Claude : agences du réseau Citya sur le site national www.citya.com (45 agences dans les prospects).
// Adresse donnée : la page de l'agence (/agences-immobilieres/<ville>-<cp>/<n°>) ou sa liste (/annonces/agence/<n°>/vente).
// Liste des biens DE L'AGENCE : /annonces/agence/<n°>/vente et /location (+ ?page=N tant qu'il y a des nouveautés).
// Chaque fiche est lue par la lecture automatique ; on ne garde que les photos rangées sous /biens/<n°>/ (pas celles des biens « similaires »).
import { smartDetail } from './smart-reader.ts';
import { eachDetailResumable, type CrawlMemory } from './resumable-crawl.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

export const cityaAgencyId=(url:URL)=>/(^|\.)citya\.com$/i.test(url.hostname)?(url.pathname.match(/^\/agences-immobilieres\/[^/]+\/(\d+)/)?.[1]||url.pathname.match(/^\/annonces\/agence\/(\d+)/)?.[1]||''):'';

export async function readCityaAgency(url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
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
  // 01/11/2026 : lecture par étapes mémorisée (reprise là où le passage précédent s'est arrêté).
  const rows=await eachDetailResumable('citya-v1:'+id,links,async l=>{
        const{text}=await fetchHtml(new URL(l));
        if(!text.includes(`/biens/${id}/`))return null; // bien d'une autre agence
        const r:any=smartDetail(text,l,'immobilier');if(!r)return null;
        r.reference=l.split('/').pop();r.transaction=/\/annonces\/location\//.test(l)?'location':'vente';
        const own=String(r.photos||'').split('|').filter((p:string)=>p.includes(`/biens/${id}/`));
        if(own.length)r.photos=[...new Set(own.map((p:string)=>p.replace(/\.com\/\/media/,'.com/media')))].join('|');
        return r;
  },memory);
  return rows;
}

// Citya Nord de France (citya-ndf.com, WordPress) : page agence /agence/agence-de-<ville>/ → ses liens
// « /annonces/?status=acheter|louer&address=Agence de <ville> » (filtre de l'agence), 48 par page, pages /page/N/.
export const cityaNdfAgency=(url:URL)=>/(^|\.)citya-ndf\.com$/i.test(url.hostname)&&/^\/agence\/[^/]+\/?$/.test(url.pathname);
export async function readCityaNdfAgency(url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
  const{text:home}=await fetchHtml(url);
  const dec=(s:string)=>s.replace(/&#0?38;|&amp;/g,'&');
  let lists=[...new Set([...home.matchAll(/href="((?:https:\/\/citya-ndf\.com)?\/annonces\/\?status=(?:acheter|louer)&(?:amp;|#0?38;)?address=[^"]+)"/g)].map(m=>dec(m[1])))].filter(l=>!/label=vendu/.test(l));
  if(!lists.length)throw Error('Liens « annonces de l’agence » introuvables sur la page Citya Nord de France.');
  const links:string[]=[];
  for(const l0 of lists){
    for(let page=1;page<=20;page++){
      const u=new URL(l0,url.origin);u.searchParams.set('display','48');if(page>1)u.pathname=`/annonces/page/${page}/`;
      let text='';try{({text}=await fetchHtml(u));}catch{break;}
      const found=[...new Set([...text.matchAll(/href="(https:\/\/citya-ndf\.com\/annonce\/[a-z0-9-]+\/)"/g)].map(m=>m[1]))];
      const fresh=found.filter(x=>!links.includes(x));links.push(...fresh);
      if(!fresh.length||found.length<48)break;
    }
  }
  if(!links.length)throw Error('Aucun bien dans la liste de l’agence Citya Nord de France.');
  const rows=await eachDetailResumable('cityandf-v1:'+url.pathname,links,async l=>{
      {const{text}=await fetchHtml(new URL(l));const r:any=smartDetail(text,l,'immobilier');if(!r)return null;
        r.reference=l.replace(/\/+$/,'').split('/').pop();r.transaction=/\/annonce\/location-/.test(l)?'location':'vente';
        // Ville / code postal pris dans l'adresse de la fiche (« vente-maison-avec-terrain-fournes-en-weppes-59134-… ») si la page ne les donne pas.
        if(!r.ville||!r.code_postal){const t=String(r.reference).split('-');const k=t.findIndex(x=>/^\d{5}$/.test(x));if(k>0){const skip=new Set(['vente','location','maison','appartement','avec','terrain','immeuble','local','commercial','parking','garage','studio','duplex','loft','villa','bureau','bureaux','commerce','propriete','ferme','batiment','box','de','ville','plain','pied']);let i0=0;while(i0<k-1&&skip.has(t[i0]))i0++;const city=t.slice(i0,k).join('-').replace(/(^|-)([a-z])/g,(_m:string,a:string,b:string)=>a+b.toUpperCase()).replace(/-(En|Sur|Sous|Les|Le|La|De|Du|Des|Lez|Les)-/g,(m:string)=>m.toLowerCase());if(!r.ville&&city)r.ville=city;if(!r.code_postal)r.code_postal=t[k];}}
        return r;}
  },memory);
  return rows;
}
