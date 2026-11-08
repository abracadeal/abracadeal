// Two public PrestaShop showrooms, one physical garage. Only their occasion
// categories; spare parts, configurators and explicitly new cars are excluded.
import {sDecode} from './smart-reader.ts';
import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
const BASE='https://www.rivalautomobiles.com';
const STOCK=['/boutique/citroen/15-vehicules-d-occasion','/boutique/sans-permis/16-vehicules-d-occasion'];
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const isRival=(u:URL)=>/^(?:www\.)?rivalautomobiles\.com$/.test(u.hostname);
export function rivalIdentity(r:any){try{const u=new URL(r.externalUrl);return isRival(u)&&/\/vehicules-d-occasion\/\d+-[^/]+\.html$/.test(u.pathname)?'rival|'+u.pathname:null;}catch{return null;}}
const clean=(s:string)=>sDecode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
function element(s:string,id:string,tag='div'){const m=new RegExp('<'+tag+'\\b[^>]*id="'+id+'"[^>]*>','i').exec(s);if(!m)return '';let depth=1;const re=new RegExp('<\\/?'+tag+'\\b[^>]*>','gi');re.lastIndex=m.index+m[0].length;for(let t;(t=re.exec(s));){depth+=/^<\//.test(t[0])?-1:1;if(!depth)return s.slice(m.index,re.lastIndex);}throw Error('Bloc Rival incomplet : '+id);}
export function rivalLinks(html:string,u:URL){
 if(!isRival(u)||!STOCK.includes(u.pathname))throw Error('Catalogue Rival hors périmètre');
 const text=clean(html),total=/Il n.y a aucun produit dans cette cat[ée]gorie/i.test(text)?0:Number(text.match(/Il y a\s+(\d+)\s+produits?/i)?.[1]??NaN);if(!Number.isFinite(total))throw Error('Compteur Rival absent');
 const grid=html.match(/<ul\b[^>]*class="[^"]*product_list[^\"]*"[^>]*>([\s\S]*?)<\/ul>/i)?.[1]||'',details=new Set<string>(),lists=new Set<string>();
 for(const m of grid.matchAll(/href="([^"]+)"/gi)){const d=new URL(sDecode(m[1]),u);if(isRival(d)&&d.pathname.startsWith(u.pathname.split('/').slice(0,3).join('/')+'/vehicules-d-occasion/')&&/\/\d+-[^/]+\.html$/.test(d.pathname)){d.search='';d.hash='';details.add(d.toString());}}
 for(const m of html.matchAll(/href="([^"]+)"/gi)){const p=new URL(sDecode(m[1]),u);if(isRival(p)&&p.pathname===u.pathname&&/^\d+$/.test(p.searchParams.get('p')||'')){p.hash='';lists.add(p.toString());}}
 if(total&&!details.size)throw Error('Grille Rival vide');return {total,details:[...details],lists:[...lists]};
}
export function parseRival(html:string,url:string){
 const u=new URL(url),path=u.pathname.match(/^\/boutique\/(citroen|sans-permis)\/vehicules-d-occasion\/(\d+)-[^/]+\.html$/);if(!isRival(u)||!path)throw Error('Fiche Rival hors périmètre');
 const id=html.match(/\bvar id_product=(\d+);/)?.[1];if(id!==path[2])throw Error('Identité Rival incohérente');
 const condition=element(html,'product_condition','p'),state=clean(condition),title=clean(html.match(/<h1\b[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 if(/NewCondition/.test(condition)||/\b(?:neuf|neuve|vendu|reserve|commande)\b/i.test((state+' '+title).normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return {_sold:1};
 if(!/UsedCondition/.test(condition))throw Error('État occasion Rival non confirmé');
 const available=clean(element(html,'availability_value','span'));if(available!=='Disponible')throw Error('Disponibilité Rival non confirmée');
 const price=Number(html.match(/<span\b[^>]*id="our_price_display"[^>]*content="([\d.]+)"/i)?.[1]??html.match(/\bvar productPrice=([\d.]+);/)?.[1]);
 if(!(price>0)||!title)throw Error('Prix/titre Rival absent');
 const sheet=html.match(/<table\b[^>]*class="table-data-sheet"[^>]*>([\s\S]*?)<\/table>/i)?.[1]||'',facts=new Map<string,string>();
 for(const m of sheet.matchAll(/<tr\b[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi))facts.set(clean(m[1]).toLowerCase(),clean(m[2]));
 const long=html.split(/<h3\b[^>]*>En savoir plus<\/h3>/i)[1]?.split('</section>')[0]||'',description=[clean(element(html,'short_description_content')),clean(long)].filter(Boolean).join('\n\n');if(!description)throw Error('Description Rival absente');
 const photos=new Map<string,string>(),gallery=element(html,'thumbs_list_frame','ul');for(const m of gallery.matchAll(/href="([^"]+)"/gi)){const p=new URL(sDecode(m[1]),u),key=p.pathname.match(/\/(\d+)-thickbox_default\//)?.[1];if(isRival(p)&&p.pathname.startsWith('/boutique/'+path[1]+'/')&&key&&!photos.has(key))photos.set(key,p.toString());}if(!photos.size)throw Error('Galerie Rival absente');
 const contact=clean(element(html,'block_contact_infos','section')),phone=contact.match(/0[1-9](?:[ .-]*\d){8}/)?.[0],town=contact.match(/\b(\d{5})\s+([^\n]+)/);if(!phone||!town)throw Error('Coordonnées Rival absentes');
 const row:any={reference:path[1]+'-'+id,url,titre:title,prix:price,description,etat:'occasion',type:'voiture',photos:[...photos.values()].join('|'),ville:town[2].trim(),code_postal:town[1],contact_nom:'Rival Automobiles (garage)',contact_telephone:phone};
 for(const [key,target] of [['marque','marque'],['kilométrage','kilometrage'],['énergie','carburant'],['boite de vitesse','boite'],['nombre de portes','portes'],['couleur','couleur'],['garantie','garantie']])if(facts.has(key))row[target]=facts.get(key);
 const date=facts.get('1ère mise en circulation');if(date){row.mise_en_circulation=date;row.annee=date.match(/(?:19|20)\d{2}/)?.[0];}
 if(!row.marque&&/^BMW\b/i.test(title))row.marque='BMW';
 row.equipements=[...facts.entries()].filter(([k,v])=>v==='Oui'&&!['marque','garantie'].includes(k)).map(([k])=>k).join('|');return row;
}
export async function readRival(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory,digest?:(u:string)=>Promise<string|null>){
 const pages=new Map<string,{text:string,url:URL}>();let total=0;
 for(const path of STOCK){const url=new URL(path,BASE),p=await fetchHtml(url);if(!isRival(p.url)||p.url.pathname!==path)throw Error('Catalogue Rival redirigé');pages.set(url.toString(),p);total+=rivalLinks(p.text,p.url).total;}
 const out:any=await crawlCatalogue(BASE+'/','rival-v1',STOCK.map(p=>BASE+p),async u=>pages.get(u.toString())||fetchHtml(u),(h,u)=>rivalLinks(h,u),async(h,u)=>{const row=parseRival(h,u);if(row._sold||!digest)return row;const seen=new Set<string>(),photos=[];for(const p of row.photos.split('|')){const hash=await digest(p);if(!hash)throw Error('Photo Rival inaccessible');if(!seen.has(hash)){seen.add(hash);photos.push(p);}}return {...row,photos:photos.join('|')};},memory,{expectedTotal:total,maxDetails:2});
 out.platform='Rival Automobiles (boutiques occasion)';out.sector='vehicules';out.stats.published_records=total;out.stats.excluded=total-out.length-out.stats.remaining-out.stats.failed.length;if(out.stats.cycle_complete)out.total=out.length;return out;
}
