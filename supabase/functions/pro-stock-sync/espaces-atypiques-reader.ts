// 01/11/2026 — Claude (Anthony : « apprends au robot » les réseaux entiers) : agences Espaces Atypiques
// (www.espaces-atypiques.com/<region>/[<ville>/], 39 prospects). La page de l'agence liste ses biens
// (/ventes/<cp>-<ville>-<titre>-<n°>/ et /locations/…) ; chaque fiche est lue par la lecture automatique.
// Ville et code postal pris dans le lien : sur la fiche, la lecture automatique prenait « Informations complémentaires ».
// Sans ce lecteur, l'exploration générale parcourait tout le site national (erreur 503, trop long).
import { smartDetail } from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const RESERVED=/^(ventes|locations|biens-vendus|location-ephemere|location-saisonniere|vente-interactive|pro|wp-content|wp-json|contact|agences|recrutement|blog|magazine|estimation|mentions-legales)$/i;
export const isEspacesAtypiquesAgency=(url:URL)=>/^(?:www\.)?espaces-atypiques\.com$/i.test(url.hostname)&&!!url.pathname.split('/').filter(Boolean)[0]&&!RESERVED.test(url.pathname.split('/').filter(Boolean)[0]);
const slug=(s:string)=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const cap=(x:string)=>x.split('-').map((w,i)=>i>0&&/^(de|du|des|la|le|les|sur|sous|en|aux?|et)$/.test(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join('-');
export async function readEspacesAtypiquesAgency(url:URL,fetchHtml:Fetcher){
  const base=new URL(url.pathname.replace(/\/?$/,'/'),url.origin);
  const links=new Set<string>();
  const add=(html:string)=>{for(const m of html.matchAll(/href="(https:\/\/www\.espaces-atypiques\.com\/(?:ventes|locations)\/\d{5}-[a-z0-9-]+-\d+\/?)"/gi))links.add(m[1].replace(/\/?$/,'/'));};
  const{text}=await fetchHtml(base);add(text);
  for(let p=2;p<=10;p++){if(!new RegExp(`${base.pathname}page/${p}/`).test(text))break;try{const{text:t}=await fetchHtml(new URL(`page/${p}/`,base));const n=links.size;add(t);if(links.size===n)break;}catch{break;}}
  if(!links.size)throw Error('Aucun bien sur la page de l’agence Espaces Atypiques.');
  const list=[...links];const rows:any[]=[];let failed=0;
  for(let i=0;i<list.length;i+=4){
    await Promise.all(list.slice(i,i+4).map(async l=>{
      try{
        const{text:h}=await fetchHtml(new URL(l));const r:any=smartDetail(h,l,'immobilier');if(!r)return;
        const m=l.match(/\/(ventes|locations)\/(\d{5})-([a-z0-9-]+)-(\d+)\/$/i);
        if(m){
          r.reference=m[4];r.code_postal=m[2];if(m[1]==='locations')r.transaction='location';
          const t=slug(r.titre||'');let c=m[3];if(t&&c.endsWith('-'+t))c=c.slice(0,-t.length-1);else if(t){const k=c.indexOf('-'+t.split('-')[0]+'-');if(k>0)c=c.slice(0,k);}
          if(c&&c!==m[3])r.ville=cap(c);else if(!r.ville||/information|compl[ée]mentaire/i.test(r.ville))r.ville=cap(c.split('-')[0]);
        }
        rows.push(r);
      }catch{failed++;}
    }));
  }
  if(failed)(rows as any).partial=true;
  rows.sort((a,b)=>list.indexOf(a.url)-list.indexOf(b.url));
  return rows;
}
