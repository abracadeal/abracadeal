// Duda pages can contain many independent adverts, not one advert per URL.
import {sDecode,smartDetail} from './smart-reader.ts';
import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
import {validateCity,norm,homonyms} from './commune-lookup.ts';
import {energyImageUrls} from './energy-image.ts';
import {cpu} from './cpu-meter.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const isLecoeur=(u:URL)=>/^(?:www\.)?lecoeurtransactions\.fr$/i.test(u.hostname);
const decode=(s:string)=>sDecode(s).replace(/&(Ocirc|Ecirc|Euml|Agrave|Acirc|Icir|Ucirc|Ccedil);/g,(_,k)=>({Ocirc:'Ô',Ecirc:'Ê',Euml:'Ë',Agrave:'À',Acirc:'Â',Icir:'Î',Ucirc:'Û',Ccedil:'Ç'}[k]||''));
const text=(s:string)=>decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?>|<\/(?:p|div|h\d)>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
function blocks(html:string,cls:string){
 const out:{html:string,id:string,start:number,end:number}[]=[];
 for(const m of html.matchAll(new RegExp('<div\\b[^>]*class="[^"\\n]*\\b'+cls+'\\b[^"\\n]*"[^>]*>','gi'))){
  const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=m.index!+m[0].length;let depth=1,end=0;
  for(let t;(t=tags.exec(html));){depth+=/^<\//.test(t[0])?-1:1;if(!depth){end=tags.lastIndex;break;}}
  if(end)out.push({html:html.slice(m.index,end),id:m[0].match(/\bid="([^"]+)"/)?.[1]||'',start:m.index!,end});
 }return out;
}
const ref=(s:string)=>text(s).match(/R[ée]f[ée]rence\s+de\s+l['’]\s*annonce\s*:\s*(\d+)/i)?.[1]||'';
function euros(s:string){let t=s.replace(/[ \u00a0\u202f]/g,'');if(t.includes(','))t=t.replace(/\./g,'').replace(',','.');else if(!/^\d+\.\d{1,2}$/.test(t))t=t.replace(/\./g,'');return Number(t);}
function sourceLocation(row:any,title:string){
 const d=String(row.description||'');row._location_candidates=[...title.split(/\s+[-–—]\s+/).slice(1),...[...d.matchAll(/(?:ville de|commune de|commune d['’]|situ[ée]e? [àa])\s*([\p{L}][\p{L} '-]{1,60})(?=[,.!\n])/giu)].map(m=>m[1]),...[...d.matchAll(/(?:^|\n)\s*-?\s*([A-ZÀ-Ÿ][A-ZÀ-Ÿ -]{2,40})(?=\n|$)/g)].map(m=>m[1])];
 row.ville='';row.code_postal='';row._keep_missing_city=true;row._source_city_missing=true;
}
function contact(row:any,html:string){
 const p=text(html),name=p.match(/contactez\s*:\s*\n([^\n]+)/i)?.[1];
 const at=html.search(/contactez\s*:/i),phone=(at>=0?html.slice(at):'').match(/href="tel:([^"<>]+)"/i)?.[1];
 if(name)row.contact_nom=name;if(name&&phone)row.contact_telephone=phone;
}
export function parseLecoeurPage(html:string,page:string){
 const t=performance.now();try{
 const body=html.slice(html.indexOf('<body')).split(/<div\b[^>]*class="dmFooterContainer"/i)[0];
 const rows:any[]=[];
 for(const b of blocks(body,'dmRespRow')){
  const sourceRef=ref(b.html);
  if([...text(b.html).matchAll(/R[ée]f[ée]rence\s+de\s+l['’]\s*annonce\s*:/gi)].length>1)continue;
  const columns=blocks(b.html,'dmRespCol'),priceCol=(sourceRef?columns.find(c=>ref(c.html)===sourceRef):columns.find(c=>! /vous propose/i.test(text(c.html))&&/(?:^|\n)\s*\d[\d .,]*\s*€\s*(?:FAI|\/\s*Mois)/i.test(text(c.html))))?.html||'';
  const display=text(priceCol).match(/(?:^|\n)\s*(\d[\d .,]*?)\s*€\s*(?:FAI\b|\/\s*Mois\b)/i)?.[1];
  const content=columns.find(c=>/LECOEUR\s+IMMOBILIER[\s\S]{0,60}vous propose/i.test(text(c.html)))?.html||columns.find(c=>/<h2\b/i.test(c.html))?.html||'';
  const h=content.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i),plain=text(content),title=h?text(h[1]):plain.split('\n')[0];
  if(!/(?:fonds|commerc|local|cession|droit au bail|pas de porte|murs|bar|restaurant|boulanger|salon|entrep[oô]t|bureau)/i.test(title||'')||(!sourceRef&&!display))continue;
  const description=(h?text(content.slice(content.indexOf(h[0])+h[0].length)):plain.slice(title.length).trim()).replace(/Fiche descriptive du bien à télécharger \(PDF\)/gi,'').trim();
  const url=new URL(page);url.hash=b.id;
  const row:any={reference:url.pathname+'#'+b.id,url:url.toString(),titre:title+(sourceRef?' — réf. '+sourceRef:''),prix:display?String(euros(display)):'',description,type_bien:'local commercial',transaction:/€\s*\/\s*Mois/i.test(text(priceCol))?'location':'vente',photos:'',_source_specific_fields:true,reference_source:sourceRef};
  const titledArea=title.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)/i)?.[1];if(titledArea)row.surface=titledArea.replace(',','.');
  if(/^(?:\[)?\s*(?:VENDU|RÉSERVÉ)\b/i.test(description))continue;
  row.mandat=text(priceCol||b.html).match(/N°\s*mandat\s*:\s*(\d+)/i)?.[1]||'';
  row.honoraires=text(priceCol).match(/Honoraires[^\n]+/i)?.[0]||'';
  // Static BAR/RESTAURANT/etc. widgets are category illustrations, never property photos.
  const galleries=[...blocks(b.html,'dmPhotoGallery'),...blocks(b.html,'dmImageSlider')];row.photos=galleryPhotos(galleries.map(g=>g.html).join('\n')).join('|');
  const energy=energyImageUrls(b.html,page);if(energy.dpe)row.dpe_image=energy.dpe;if(energy.ges)row.ges_image=energy.ges;
  row.dpe=description.match(/\bDPE\s*:\s*([A-G])\b/i)?.[1]||'';row.ges=description.match(/\bGES\s*:\s*([A-G])\b/i)?.[1]||'';
  contact(row,b.html);sourceLocation(row,title);rows.push(row);
 }
 if(rows.length)return rows;
 const h1=body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i),title=h1?text(h1[1]):'';
 if(!/\b(?:maison|villa|appartement|duplex|terrain|parking|immeuble)\b/i.test(title))return [];
 const row:any=smartDetail(html,page,'immobilier');if(!row||row._sold||/^\s*\[VENDU\]/i.test(row.description||''))return [];
 row.reference=new URL(page).pathname;row.titre=title;
 const galleries=[...blocks(body,'dmPhotoGallery'),...blocks(body,'dmImageSlider')];if(galleries.length)row.photos=galleryPhotos(galleries.map(g=>g.html).join('\n')).join('|');
 contact(row,body);sourceLocation(row,title);return [row];
 }finally{cpu.ms+=performance.now()-t;}
}
function galleryPhotos(html:string){
 const out=new Map<string,string>();for(const m of html.matchAll(/(?:data-image-url|data-src|data-dm-image-path|src)="(https:[^"]+)"/gi))try{
  const u=new URL(decode(m[1]));if(!/(?:le-)?cdn\.website-editor\.net$/.test(u.hostname)||! /\.(?:jpe?g|png|webp)(?:$|\?)/i.test(u.toString())||/logo|placeholder|no[-_]?image|no[-_]?photo|icon/i.test(u.pathname))continue;
  // Confirmed category stock photographs reused across unrelated business adverts.
  if(/\/(?:BAR(?:[ +_-]BRASSERIE)?|TABAC|PRESSE|PMU|PIZZERIA|HOTEL|RESTAURATION[ +_-]RAPIDE|MURS[ +_-]COMMERCIAUX)(?:-[a-f0-9]{8})?(?:-\d+w)?\.(?:jpg|png|webp)$/i.test(decodeURIComponent(u.pathname)))continue;
  const k=u.pathname.replace('/opt/','/').replace(/-\d+w(\.[^.]+)$/,'$1');if(!out.has(k))out.set(k,u.toString());
 }catch{}return [...out.values()];
}
export function lecoeurLinks(html:string,page:URL){
 const lists:string[]=[];for(const m of html.matchAll(/href="([^"#]+)"/gi))try{
  const u=new URL(decode(m[1]),page),p=decodeURIComponent(u.pathname);if(!isLecoeur(u)||u.search||u.hash||!/^\/[^/.]+\/?$/.test(p)||/contact|mentions|honoraires|propos|votre-agence|page-de-projet|blog|vivre-et-entreprendre/i.test(p))continue;
  u.hash='';lists.push(u.toString());
 }catch{}return [...new Set(lists)];
}
async function locate(row:any){
 for(const candidate of row._location_candidates||[]){const c=await validateCity(candidate);if(c&&norm(c.nom)===norm(candidate)){row.ville=c.nom;row.code_postal=c.cps.length===1?c.cps[0]:'';row._exact_source_city=c.nom;row._source_city_missing=false;break;}}
 // A full, unambiguous commune in the property's own URL is also source data.
 if(row._source_city_missing&&!row._source_specific_fields){const words=decodeURIComponent(new URL(row.url).pathname).split(/[^\p{L}]+/u).filter(Boolean);outer:for(let i=0;i<words.length;i++)for(let n=Math.min(5,words.length-i);n>=2;n--){const candidate=words.slice(i,i+n).join('-'),c=await validateCity(candidate);if(c&&norm(c.nom)===norm(candidate)&&await homonyms(c.nom)===1){row.ville=c.nom;row.code_postal=c.cps.length===1?c.cps[0]:'';row._exact_source_city=c.nom;row._source_city_missing=false;break outer;}}}
 delete row._location_candidates;return row;
}
export async function readLecoeur(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
 const source='https://www.lecoeurtransactions.fr/',cache=new Map<string,any[]>();
 const parse=(h:string,u:string)=>{if(!cache.has(u))cache.set(u,parseLecoeurPage(h,u));return cache.get(u)!;};
 const bundles:any=await crawlCatalogue(source,'lecoeur-v3',[source],fetchHtml,(h,u)=>({lists:lecoeurLinks(h,u),details:parse(h,u.toString()).length?[u.toString()]:[]}),async(h,u)=>({reference:u,children:await Promise.all(parse(h,u).map(locate))}),memory,{maxDetails:8});
 const rows:any=bundles.flatMap((b:any)=>b.children||[]),seen=new Set<string>();const unique=rows.filter((r:any)=>{const k=[r.reference_source||r.reference,r.prix,r.description].join('|');if(seen.has(k))return false;seen.add(k);return true;});
 Object.assign(unique,{partial:bundles.partial,total:bundles.partial?null:unique.length,cycleStarted:bundles.cycleStarted,cycleSeen:bundles.stats.cycle_complete?unique.map((r:any)=>r.reference):[],stats:{...bundles.stats,source_rows:rows.length,duplicate_source_rows:rows.length-unique.length},platform:'Le Cœur (annonces séparées par bloc)',sector:'immobilier'});return unique;
}
