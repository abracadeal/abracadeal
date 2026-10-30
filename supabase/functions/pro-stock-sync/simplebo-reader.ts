// 30/10/2026 — Claude : sites de garage faits avec Simplébo (sbcdnsb.com), stock décrit en texte libre sur une seule page.
// Ex. slycar.fr/vehicules-en-vente : une <section> par véhicule = titre (h2), galerie, bloc « Informations générales »
// (année, km, prix écrits dans le texte) et bloc « PRIX ». Aucun champ inventé : énergie / boîte seulement si le texte les écrit.
// Les véhicules vendus sont sur une autre page (/vehicules-vendus) : jamais lus.
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

const txt=(s:string)=>sDecode(String(s||'').replace(/<br\s*\/?>\s*/gi,'\n').replace(/<\/p>\s*/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\r]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
const num=(s:string)=>s.replace(/[^\d]/g,'');

export const isSimpleboSite=(html:string)=>/sbcdnsb\.com/i.test(html)&&/href="\/vehicules-en-vente"/i.test(html);

// Toutes les tailles d'une même image partagent son identifiant : on garde la plus grande.
function sectionPhotos(sec:string){
  const best=new Map<string,{u:string,w:number,o:number}>();let o=0;
  // 31/10/2026 (Anthony) : un même fichier peut être envoyé deux fois (deux identifiants, même nom, ex. img_8765.jpeg) : clé = nom du fichier.
  for(const m of sec.matchAll(/(https:\/\/files\.sbcdnsb\.com\/images\/[^\/\s"]+\/content\/\d+\/(\d+)\/(\d+)\/([^\s",\/]+))/g)){
    const id=m[4].toLowerCase(),w=Number(m[3]),cur=best.get(id);
    if(!cur)best.set(id,{u:m[1],w,o:o++});else if(w>cur.w)best.set(id,{...cur,u:m[1],w});
  }
  return [...best.values()].sort((a,b)=>a.o-b.o).map(x=>x.u);
}

export function parseSimpleboSection(sec:string,pageUrl:string,index:number){
  if(!/Informations g[ée]n[ée]rales/i.test(sec)||!/€/.test(sec))return null;
  const h2=txt(sec.match(/<h2>\s*<span class="element-title-inner">([\s\S]*?)<\/span>/i)?.[1]||'');
  const info=sec.match(/<strong>\s*Informations g[ée]n[ée]rales\s*<\/strong>([\s\S]*?)<\/div>/i)?.[1]||'';
  const it=txt(info);
  const descTitle=(it.match(/Description\s*\n\s*([^\n]{3,140})/i)||[])[1]||'';
  const title=h2||descTitle.trim();if(!title)return null;
  const priceBlock=sec.match(/PRIX[\s\S]{0,400}?([\d][\d\s.]{2,})\s*€/i)?.[1]||it.match(/([\d][\d\s.]{2,})\s*€/)?.[1]||'';
  const yearM=it.match(/Ann[ée]e\s*:?\s*(?:\d{2}\/)?(\d{4})/i)||it.match(/\b(?:0[1-9]|1[0-2])\/((?:19|20)\d{2})\b/);
  const kmM=it.match(/([\d][\d\s.]*)\s*(?:KMS?|kms?|Km)\b/);
  const fuel=(it.match(/\b(Essence|Diesel|Hybride(?: rechargeable)?|[EÉ]lectrique|GPL|E85)\b/i)||[])[1]||'';
  const box=(it.match(/\b(Bo[iî]te (?:automatique|manuelle)|Automatique|Manuelle)\b/i)||[])[1]||'';
  const words=title.split(/\s+/);
  const brand=/^(?:Alfa|Land|Aston|Rolls)$/i.test(words[0])?words.slice(0,2).join(' '):words[0];
  const model=title.slice(brand.length).trim().split(/\s+/)[0]||'';
  const anchor=(sec.match(/id="(section-[^"]+)"/)||[])[1]||'';
  const description=it.replace(/^Description\s*\n/i,'').trim();
  return {reference:anchor||`v${index+1}-${num(priceBlock)}`,url:pageUrl+(anchor?'#'+anchor:''),titre:title,marque:brand,modele:model,
    prix:num(priceBlock),annee:yearM?yearM[1]:'',kilometrage:kmM?num(kmM[1]):'',carburant:fuel,boite:/auto/i.test(box)?'Automatique':/manu/i.test(box)?'Manuelle':'',
    type:'voiture',etat:'occasion',description,photos:sectionPhotos(sec).join('|')};
}

export async function readSimpleboStock(origin:URL,fetchHtml:Fetcher){
  const page=new URL('/vehicules-en-vente',origin);
  const{text,url}=await fetchHtml(page);
  const parts=text.split(/<section\b[^>]*class="[^"]*\bsection\b[^"]*"/i);
  const rows:any[]=[];
  parts.forEach((sec,i)=>{const r=parseSimpleboSection(sec,url.toString().replace(/#.*$/,''),i);if(r)rows.push(r);});
  if(!rows.length)throw Error('Page « véhicules en vente » Simplébo illisible.');
  return rows;
}
