// 01/11/2026 — Claude (plan « sites à réparer » validé par Anthony) : deux réseaux dont les agences sont prospectées.
//
// La Résidence (www.laresidence.fr/agences-immobilieres/<agence>, 17 prospects) : la page de l'agence a ses listes
// « /agences-immobilieres/<agence>/acheter » et « /louer » (12 biens par page, ?Page=2…), avec la liste des fiches en
// données structurées (ItemList). Fiche : données structurées (prix, description, photos) complétées par la page ; la ville
// est prise dans le titre / le lien (la lecture automatique prenait « Achat maison »).
//
// La Française Immobilière (www.la-francaise-immobiliere.fr/agences/<agence>/, 16 prospects) : WordPress ; toutes les
// annonces du réseau sont listées par l'API du site (/wp-json/wp/v2/achat et /location). La fiche indique son agence
// (lien « Plus d'infos » vers /agences/…/<agence>/) : seules les fiches de l'agence inscrite sont gardées.
// DPE / GES dessinés en SVG dans la page : <g id="EnergieC">, <g id="GesC">. Ville absente de la fiche : prise dans le lien
// (« vente-appartement-t3-rennes-61466680 » → Rennes).
import { smartDetail } from './smart-reader.ts';
import { crawlCatalogue, crawlDetails, type CrawlMemory } from './resumable-crawl.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const cap=(s:string)=>s.split('-').map((w,i)=>i>0&&/^(de|du|des|la|le|les|sur|sous|en|aux?|et|l|d)$/.test(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join('-').replace(/-([dl])-/gi,(_,x)=>`-${x.toLowerCase()}'`);
const soldTitle=/\b(vendu|lou[ée]|sous offre|sous compromis)\b/i;

// ---------- La Résidence ----------
export const isLaResidenceAgency=(url:URL)=>/^(?:www\.)?laresidence\.fr$/i.test(url.hostname)&&/^\/agences-immobilieres\/[a-z0-9-]+\/?/i.test(url.pathname);
export async function readLaResidenceAgency(url:URL,fetchHtml:Fetcher,ldParse:(html:string,url:string)=>any,memory?:CrawlMemory){
  const agency=url.pathname.split('/').filter(Boolean)[1].toLowerCase();
  const links=new Set<string>();
  const add=(html:string)=>{for(const m of html.matchAll(/(?:https:\/\/www\.laresidence\.fr)?(\/(?:acheter|louer)\/[a-z0-9-]+\/[a-z0-9-]+\/\d{6,})(?=["'?#\s])/gi))links.add('https://www.laresidence.fr'+m[1]);};
  for(const kind of ['acheter','louer']){
    for(let p=1;p<=15;p++){
      const u=new URL(`/agences-immobilieres/${agency}/${kind}${p>1?`?Page=${p}`:''}`,'https://www.laresidence.fr');
      let text='';try{({text}=await fetchHtml(u));}catch{break;}
      const n=links.size;add(text);
      if(links.size===n||!new RegExp(`/agences-immobilieres/${agency}/${kind}\\?Page=${p+1}\\b`,'i').test(text))break;
    }
  }
  if(!links.size)throw Error('Aucun bien en ligne sur la page de cette agence La Résidence.');
  const list=[...links];
  const rows=await crawlDetails(url.toString(),'laresidence-v1:'+agency,list,fetchHtml,(h,l)=>{
        let r:any=null;try{r=ldParse(h,l);}catch{r=null;}
        const sd:any=smartDetail(h,l,'immobilier');
        if(!r)r=sd;else if(sd){for(const k of Object.keys(sd))if(!['ville','prix','description','titre'].includes(k)&&(r[k]==null||r[k]===''))r[k]=sd[k];}
        if(!r)throw Error('Fiche non reconnue');if(r._sold||soldTitle.test(String(r.titre||'')))return{_sold:1};
        r.url=l;r.reference=l.match(/\/(\d{6,})$/)?.[1]||r.reference;
        // Titre de la page : « Maison à vendre 85m² - 3 pièces - 2 chambres Chatou - 78400 »
        const t=h.match(/<title>([^<]{0,200})/i)?.[1]||'';const cp=t.match(/\s([A-ZÀ-Üa-zà-ü' -]{2,50}?)\s+-\s+(\d{5})\b/);
        const slugCity=cap(l.split('/')[4]||'');
        r.ville=cp?.[1]?.trim()||slugCity;if(cp?.[2])r.code_postal=cp[2];
        if(l.includes('/louer/'))r.transaction='location';
        r.titre=String(r.titre||'').replace(/\s*-\s*R[ée]f\s*:.*$/i,'').replace(/\s*-\s*LA RESIDENCE\s*$/i,'').replace(/\s{2,}/g,' ').trim();
        return r;
  },memory);
  return rows;
}

// ---------- La Française Immobilière ----------
export const isLaFrancaiseAgency=(url:URL)=>/^(?:www\.)?la-francaise-immobiliere\.fr$/i.test(url.hostname)&&/^\/agences\/.+/i.test(url.pathname);
export async function readLaFrancaiseAgency(url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
  const agency=url.pathname.split('/').filter(Boolean).pop()!.toLowerCase();
  const base='https://www.la-francaise-immobiliere.fr';
  const links:string[]=[];
  for(const kind of ['achat','location']){
    for(let p=1;p<=10;p++){
      let arr:any[]=[];try{const{text}=await fetchHtml(new URL(`/wp-json/wp/v2/${kind}?per_page=100&page=${p}&_fields=link,title`,base));arr=JSON.parse(text);}catch{break;}
      if(!Array.isArray(arr)||!arr.length)break;
      for(const x of arr){const l=String(x?.link||'');if(l.startsWith(base)&&!soldTitle.test(String(x?.title?.rendered||''))&&!links.includes(l))links.push(l);}
      if(arr.length<100)break;
    }
  }
  if(!links.length)throw Error('Aucune annonce en ligne sur le site La Française Immobilière.');
  const own=new RegExp(`href="${base.replace(/\./g,'\\.')}/agences/(?:[a-z0-9-]+/)*${agency}/"\\s+class="link"`,'i');
  const rows=await crawlDetails(url.toString(),'lfi-v1:'+agency,links,fetchHtml,(h,l)=>{
        if(!own.test(h))return{_sold:1};
        const r:any=smartDetail(h,l,'immobilier');if(!r)throw Error('Fiche non reconnue');
        r.url=l;
        const m=new URL(l).pathname.match(/\/(achat|location)\/(?:vente|location)-([a-z]+)-(?:(?:t|f|p)\d+-)?(?:\d+-pieces?-)?([a-z0-9-]+?)-(\d{5,})\/?$/i);
        if(m){r.reference=r.reference||m[4];if(!r.ville)r.ville=cap(m[3]);if(m[1]==='location')r.transaction='location';}
        const dpe=h.match(/<g id="Energie([A-G])"/)?.[1],ges=h.match(/<g id="Ges([A-G])"/)?.[1];
        if(dpe&&!r.dpe)r.dpe=dpe;if(ges&&!r.ges)r.ges=ges;
        // Titre de la fiche souvent tronqué (« Vente Appartement T3 - ») : première ligne de la description à la place.
        const first=String(r.description||'').split('\n')[0].trim();
        if(/\s-\s*(?:-|$)/.test(String(r.titre||''))&&first.length>=10&&first.length<=120)r.titre=first;
        return r;
  },memory);
  if(!rows.length&&!(rows as any).partial)throw Error(`Aucune annonce de cette agence en ligne (${links.length} annonces du réseau vérifiées).`);
  return rows;
}

// ---------- BH Car ----------
// 01/11/2026 (Anthony : « ça lit toute la France d'un coup ») : bhcar.fr est un réseau (4 200 véhicules, des dizaines d'agences).
// La page d'une agence (bhcar.fr/agences/bhcar-<ville>, ?page=2…) liste ses véhicules ; chaque fiche dit « chez BH Car <ville> » :
// seuls les véhicules de l'agence sont gardés. L'accueil du réseau n'est jamais lu en entier.
export const isBhCarSite=(url:URL)=>/^(?:www\.)?bhcar\.fr$/i.test(url.hostname);
export async function readBhCarAgency(url:URL,fetchHtml:Fetcher,ldParse:(html:string,url:string)=>any,memory?:CrawlMemory){
  const slug=url.pathname.match(/^\/agences\/(bhcar-[a-z0-9-]+)/i)?.[1]?.toLowerCase();
  if(!slug)throw Error('BH Car est un réseau national : indiquez la page de l’agence (bhcar.fr/agences/bhcar-<ville>), pas l’accueil du site.');
  const base='https://bhcar.fr';const start=`${base}/agences/${slug}`;
  const{text:first}=await fetchHtml(new URL(start));
  const name=(first.match(/<title>([^<]{2,80}?)\s+-\s+Voitures/i)?.[1]||'').replace(/&#x27;/g,"'").trim();
  if(!name)throw Error('Page d’agence BH Car introuvable.');
  const key=name.toLowerCase();
  // 01/11/2026 (Anthony, test Lille : 192 lus sur 214) : lecture par étapes mémorisée (comme les gros sites) ; avant, chaque
  // passage repartait du début et les derniers véhicules n'étaient jamais lus.
  const rows=await crawlCatalogue(start,'bhcar-v1:'+slug,[start],async u=>u.toString()===start?{text:first,url:u}:fetchHtml(u),(html)=>{
    const details=[...new Set([...html.matchAll(/href="(?:https:\/\/(?:www\.)?bhcar\.fr)?(\/acheter\/bhc?-[a-z0-9]+-[a-z0-9-]+)"/gi)].map(m=>base+m[1]))];
    const lists=[...new Set([...html.matchAll(new RegExp(`href="(?:https://(?:www\\.)?bhcar\\.fr)?(/agences/${slug}\\?page=\\d+)"`,'gi'))].map(m=>base+m[1].replace(/&amp;/g,'&')))];
    return{lists,details};
  },(h,l)=>{
    const chez=(h.match(/chez (BH ?Car [^(<"]{2,60}?) \(/i)?.[1]||'').toLowerCase();
    if(chez&&chez!==key)return{_sold:1};
    let r:any=null;try{r=ldParse(h,l);}catch{r=null;}
    const sd:any=smartDetail(h,l,'vehicules');
    if(!r)r=sd;else if(sd){for(const k of Object.keys(sd))if(k!=='photos'&&(r[k]==null||r[k]===''))r[k]=sd[k];}
    if(!r)throw Error('Fiche non reconnue');r.url=l;return r;
  },memory,{maxDetails:400});
  return rows;
}
