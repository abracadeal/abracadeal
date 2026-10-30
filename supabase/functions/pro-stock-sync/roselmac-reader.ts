// 30/10/2026 — Claude : sites de garages réalisés par Roselmac (roselmac.com), ex. excelliumcars.fr.
// Stock : catalogue-new.php (liens voiture-new2.php?voiture_reference=N) ; fiche : titre + version, prix, « km, MM/AAAA »,
// bloc « Caractéristiques » (Libellé : valeur), description, galerie vehicules/<ref>-<n>-<ordre>.JPG.
// Les véhicules vendus sont sur archives-new2.php : jamais lus. Rien n'est deviné (énergie vide si le site ne la donne pas).
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

const txt=(s:string)=>sDecode(String(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ')).replace(/[ \t\r]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
const TWO_WORD_BRANDS=['ALFA ROMEO','LAND ROVER','ASTON MARTIN','MERCEDES BENZ','ROLLS ROYCE','DS AUTOMOBILES'];

// L'accueil (page d'entrée) ne cite pas toujours Roselmac : on reconnaît aussi ses pages typiques.
export const isRoselmacSite=(html:string)=>(/roselmac\.com/i.test(html)&&/(?:catalogue-new|voiture-new2|index-v2-black)\.php/i.test(html))
  ||(/href=["']catalogue-new\.php["']/i.test(html)&&/(?:index-v2-black|voiture-new2|archives-new2)\.php/i.test(html));

function field(t:string,label:string){
  const labels='Mise en circulation|Kilom[eé]trage|Type de boite|Bo[iî]te|Garantie|Puissance fiscale|Puissance DIN|Couleur ext[eé]rieure|Couleur int[eé]rieure|Finition|[EÉ]nergie|Carburant|Nombre de portes|Places|Pr[eé]sentation|[EÉ]quipements|Galerie';
  const m=t.match(new RegExp(`(?:^|\\s)(?:${label})\\s*:\\s*(.+?)(?=\\s+(?:${labels})\\s*:|\\s+(?:Pr[eé]sentation|[eé]quipements|Galerie)\\b|\\n|$)`,'i'));
  return m?m[1].trim():'';
}

export function parseRoselmacVehicle(html:string,url:string){
  const ref=new URL(url).searchParams.get('voiture_reference');if(!ref)return null;
  // Annonce vendue / réservée : pas publiée.
  if(!/V[eé]hicule disponible/i.test(html)&&/\b(?:Vendu|R[eé]serv[eé])\b/i.test(html))return null;
  const head=html.match(/<div class="bloc-7col"[^>]*>([\s\S]*?)<\/div>/i)?.[1]||'';
  const main=txt(head.split(/<br\s*\/?>/i)[0]||''),version=txt(head.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
  if(!main)return null;
  const up=main.toUpperCase();
  const brand=TWO_WORD_BRANDS.find(b=>up.startsWith(b))||main.split(/\s+/)[0];
  const model=main.slice(brand.length).trim().split(/\s+/)[0]||'';
  const descHtml=html.match(/<div class="bloc-12col" style="padding-top:5px[^"]*">([\s\S]*?)<\/div>/i)?.[1]||'';
  const price=(html.match(/>\s*([\d\s.]{3,})\s*€\s*</)||[])[1]||'';
  const t=txt(html);
  const km=field(t,'Kilom[eé]trage').replace(/\D/g,'')||((html.match(/>\s*([\d\s]+)\s*km,\s*\d{2}\/\d{4}\s*</i)||[])[1]||'').replace(/\D/g,'');
  const mec=field(t,'Mise en circulation')||((html.match(/km,\s*(\d{2}\/\d{4})\s*</i)||[])[1]||'');
  const year=(mec.match(/(\d{4})/)||[])[1]||'';
  // Galerie : dans l'ordre publié (dernier nombre du nom de fichier), sans doublon.
  const seen=new Set<string>();const gal:{u:string,o:number}[]=[];
  for(const m of html.matchAll(/href="(vehicules\/[^"]+\.(?:jpe?g|png|webp))"[^>]*class="fancybox"/gi)){const u=new URL(m[1],url).toString();if(seen.has(u))continue;seen.add(u);gal.push({u,o:Number((m[1].match(/-(\d+)\.\w+$/)||[])[1]||999)});}
  gal.sort((a,b)=>a.o-b.o);
  // Coordonnées du garage (pied de page « 2 rue d'Italie 67230 Benfeld »).
  const loc=t.match(/(\d{5})\s+([A-ZÉÈ][\wÀ-ÿ' -]{1,40}?)(?:,|\s+(?:Alsace|France|Tel\.|T[eé]l))/);
  const boite=field(t,'Type de boite')||field(t,'Bo[iî]te');
  const energie=field(t,'[EÉ]nergie')||field(t,'Carburant');
  return {reference:ref,url,titre:[main,version].filter(Boolean).join(' '),marque:brand,modele:model,version,
    prix:price.replace(/[^\d]/g,''),annee:year,mise_en_circulation:mec,kilometrage:km,carburant:energie,boite,
    puissance:field(t,'Puissance DIN').replace(/[^\d]/g,''),puissance_fiscale:field(t,'Puissance fiscale').replace(/[^\d]/g,''),
    couleur:field(t,'Couleur ext[eé]rieure'),garantie:field(t,'Garantie'),
    type:/\b(?:moto|scooter|quad)\b/i.test(main)?'moto':/\b(?:fourgon|utilitaire|master|trafic|jumper|boxer|ducato|sprinter|transit|kangoo van|vito)\b/i.test(main)?'utilitaire':'voiture',
    etat:'occasion',ville:loc?loc[2].trim():'',code_postal:loc?loc[1]:'',
    description:txt(descHtml),photos:gal.map(g=>g.u).join('|')};
}

export async function readRoselmacSite(origin:URL,fetchHtml:Fetcher){
  const{text:list,url:listUrl}=await fetchHtml(new URL('/catalogue-new.php',origin));
  const refs=[...new Set([...list.matchAll(/voiture-new2\.php\?voiture_reference=(\d+)/gi)].map(m=>m[1]))];
  if(!refs.length)throw Error('Catalogue Roselmac vide ou illisible.');
  const rows:any[]=[];let failed=0;
  for(let i=0;i<refs.length;i+=4){
    await Promise.all(refs.slice(i,i+4).map(async ref=>{
      const u=new URL(`/voiture-new2.php?voiture_reference=${ref}`,listUrl);
      try{const{text}=await fetchHtml(u);const r=parseRoselmacVehicle(text,u.toString());if(r)rows.push(r);}catch{failed++;}
    }));
  }
  // Fail closed : si des fiches n'ont pas pu être lues, lecture partielle (rien ne sera retiré du stock).
  if(failed)(rows as any).partial=true;
  rows.sort((a,b)=>refs.indexOf(a.reference)-refs.indexOf(b.reference));
  const first=rows.find(r=>r.ville);if(first)(rows as any).siteLocation={city:first.ville,postal:first.code_postal};
  return rows;
}
