// ICS publishes the complete catalogue in a JavaScript data literal; pagination
// in global.js only splits that array in the browser. Never execute site scripts.
import {sDecode} from './smart-reader.ts';
import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
import {isPlaceholderPhoto} from './photo-utils.ts';
type Fetcher=(url:URL)=>Promise<{text:string,url:URL}>;
const ORIGIN='https://www.sitea-immo.com';
export const isSitea=(u:URL)=>/^(?:www\.)?sitea-immo\.com$/i.test(u.hostname);
export function siteaIdentity(row:any){try{return isSitea(new URL(row.externalUrl))&&row.ref?'sitea|'+row.ref:null;}catch{return null;}}
const clean=(v:string)=>sDecode(v.replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
const label=(v:string)=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const numeric=(v:string)=>{const m=clean(v).match(/^(-?[\d\s.,]+)(?:\s*(?:m[²2]|€|euros?))?$/i);return m?Number(m[1].replace(/\s/g,'').replace(',','.')):NaN;};
// Small data-only parser: JSON grammar plus single-quoted strings and \' escapes.
// Calls, identifiers, expressions, comments and executable values are rejected.
export function siteaCatalogue(html:string){
 const m=/\bvar\s+properties\s*=\s*/.exec(html);if(!m)throw Error('Catalogue public ICS absent');
 let at=m.index+m[0].length;const ws=()=>{while(/\s/.test(html[at]||'')&&at<html.length)at++;};
 const string=()=>{const quote=html[at++];let out='';for(;at<html.length;){const c=html[at++];if(c===quote)return out;if(c==='\\'){const esc=html[at++],map:Record<string,string>={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','\\':'\\',"'":"'",'"':'"','/':'/'};if(esc==='u'||esc==='x'){const n=esc==='u'?4:2,h=html.slice(at,at+n);if(!new RegExp('^[a-fA-F0-9]{'+n+'}$').test(h))throw Error('Échappement ICS invalide');out+=String.fromCharCode(parseInt(h,16));at+=n;}else if(esc in map)out+=map[esc];else throw Error('Échappement ICS inconnu');}else out+=c;}throw Error('Chaîne ICS incomplète');};
 const value=(depth=0):any=>{if(depth>12)throw Error('Données ICS trop imbriquées');ws();const c=html[at];if(c==='"'||c==="'")return string();if(c==='['||c==='{'){at++;const array=c==='[',out:any=array?[]:{},end=array?']':'}';ws();while(html[at]!==end){if(array)out.push(value(depth+1));else{if(html[at]!=='"'&&html[at]!=="'")throw Error('Clé ICS invalide');const k=string();if(['__proto__','constructor','prototype'].includes(k))throw Error('Clé ICS interdite');ws();if(html[at++]!==':')throw Error('Donnée ICS invalide');out[k]=value(depth+1);}ws();if(html[at]===end)break;if(html[at++]!==',')throw Error('Séparateur ICS invalide');ws();}at++;return out;}const token=/^(?:-?\d+(?:\.\d+)?|true|false|null)(?=[\s,}\]])/.exec(html.slice(at));if(!token)throw Error('Valeur ICS non déclarative');at+=token[0].length;return JSON.parse(token[0]);};
 const records=value();ws();if(html[at]!==';'||!Array.isArray(records))throw Error('Catalogue ICS invalide');
 const seen=new Set<string>();for(const r of records){if(!r||typeof r.id!=='string'||typeof r.lien!=='string'||seen.has(r.id))throw Error('Identité ICS absente ou répétée');seen.add(r.id);}
 return records;
}
export function parseSitea(html:string,url:string){
 const u=new URL(url);if(!isSitea(u))throw Error('Fiche Sitea hors périmètre');
 const tx=u.pathname.startsWith('/location-')?'location':u.pathname.startsWith('/vente-')?'vente':'';if(!tx)throw Error('Transaction Sitea absente');
 const heading=/<h2\b[^>]*class="titre"[^>]*>([\s\S]*?)<\/h2>\s*<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html);
 if(!heading)throw Error('Fiche propre Sitea absente');
 const title=clean(heading[1]),cartouche=clean(heading[2]),reference=cartouche.match(/Ref\.\s*([A-Z0-9_-]+)/i)?.[1];
 if(!reference||!u.pathname.endsWith('-'+reference.replace(/-/g,'_')))throw Error('Référence Sitea différente de la fiche');
 const price=numeric(cartouche.match(/^([\d\s.,]+)\s*€/)?.[1]||'');if(!(price>0))throw Error('Prix Sitea absent');
 const description=clean(heading[3]);if(!description)throw Error('Description Sitea absente');
 const slider=html.split(/<div\b[^>]*id="slider"[^>]*>/i)[1]?.split('</ul>')[0]||'';
 const photos=new Map<string,string>();for(const m of slider.matchAll(/<img\b[^>]*src="([^"]+)"/gi)){const image=new URL(sDecode(m[1]),u);if(!isSitea(image)||!/^\/photobox\/sit_SITEA_kop\/(?:transaction|location)\/photo\//.test(image.pathname)||isPlaceholderPhoto(image.toString()))continue;const key=image.pathname.replace(/\/(?:vignettes|moyennes)\//,'/');if(!photos.has(key))photos.set(key,image.toString());}
 const cityBlock=html.slice(0,heading.index).match(/<address>\s*<i\b[^>]*><\/i>\s*([\s\S]*?)<\/address>/i)?.[1]||'';
 const location=clean(cityBlock),postal=location.match(/\b\d{5}\b/)?.[0]||'',city=location.replace(/\b\d{5}\b/,'').trim();
 const details=html.split(/id="collapseDetails"/i)[1]?.split('</ul>')[0]||'',facts=new Map<string,string>();
 for(const m of details.matchAll(/<li\b[^>]*>([\s\S]*?)<strong>([\s\S]*?)<\/strong>\s*<\/li>/gi))facts.set(label(m[1]),clean(m[2]));
 const row:any={reference,url:u.toString(),titre:title,prix:String(price),description,transaction:tx,ville:city,code_postal:postal,photos:[...photos.values()].join('|'),_source_specific_fields:true,_keep_missing_city:true,_source_city_missing:!city,_exact_source_city:city};
 row.type_bien=facts.get('categorie')||(/^vente-terrain-/.test(u.pathname)?'terrain':/-(local_commercial)-/.test(u.pathname)?'local commercial':title.match(/^(Appartement|Maison|Terrain|Parking|Garage)/i)?.[1]||'');
 const fields:Record<string,string[]>= {surface:['surfacehabitable','surfaceutile'],surface_terrain:['surfaceduterrain'],pieces:['nombredepieces'],chambres:['nombredechambres'],salles_de_bain:['salledebain','salledeau'],etage:['numeroetage'],nb_etages:['nombredetages'],annee_construction:['anneedeconstruction'],charges_mensuelles:tx==='location'?['charges']:[],depot_garantie:['depotdegarantie']};
 for(const [target,keys] of Object.entries(fields))for(const key of keys){const v=facts.get(key);if(v!=null){const n=numeric(v);if(Number.isFinite(n)){row[target]=n;break;}}}
 const textFields:Record<string,string>={etat_bien:'etatgeneral',chauffage:'chauffage',exposition:'exposition'};for(const [target,key] of Object.entries(textFields))if(facts.get(key))row[target]=facts.get(key);
 if(facts.get('modechauffage'))row.chauffage=[row.chauffage,facts.get('mecanismedechauffage'),facts.get('modechauffage')].filter(Boolean).join(' · ');
 const amenities:string[]=[];for(const [key,name] of [['nombredeparkings','Parking'],['nombredegarages','Garage'],['nombredebalcons','Balcon'],['nombredeterrasses','Terrasse']]){const n=numeric(facts.get(key)||'');if(n>0)amenities.push(name+' : '+n);}for(const [key,name] of [['ascenseur','Ascenseur'],['acceshandicape','Accès handicapé']])if(/^oui$/i.test(facts.get(key)||''))amenities.push(name);if(amenities.length)row.equipements=amenities.join('|');
 const annual=description.match(/quote-part budget pr[ée]visionnel[^\n]*?est de\s+([\d\s.,]+)\s+euros\/an/i)?.[1]||description.match(/charges annuelles\s*:?\s*([\d\s.,]+)/i)?.[1];if(annual&&Number.isFinite(numeric(annual)))row.charges_annuelles=numeric(annual);
 const tax=description.match(/taxe fonci[èe]re\s*:\s*([\d\s.,]+)\s*€/i)?.[1];if(tax&&Number.isFinite(numeric(tax)))row.taxe_fonciere=numeric(tax);
 const lots=description.match(/(?:Lots principaux\s*:\s*|copropri[ée]t[ée] comporte\s+)(\d+)/i)?.[1];if(lots)row.nombre_lots=Number(lots);
 if(/soumis au statut de la copropri[ée]t[ée]/i.test(description)&&!/non soumis/i.test(description))row.copropriete='Oui';
 if(/(?:aucune|pas de) proc[ée]dures? en cours/i.test(description))row.procedure='Aucune procédure en cours';else if(/(?:^|\n)[. ]*proc[ée]dure en cours/i.test(description))row.procedure='Procédure en cours';
 const fees=facts.get('honorairesdelocation')||[...new Set(description.match(/[^\n.]*honoraires[^\n.]*/gi)||[])].join(' ; ');if(fees)row.honoraires=fees;
 const energy=description.match(/d[ée]penses annuelles d.[ée]nergie[^\n]*?entre\s+([\d\s.,]+)\s*(?:€|euros?)?\s+et\s+([\d\s.,]+)\s*(?:€|euros?)/i);if(energy){row.cout_energie_min=numeric(energy[1]);row.cout_energie_max=numeric(energy[2]);}
 const diagnosticDate=description.match(/DPE r[ée]alis[ée] le\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1];if(diagnosticDate)row.date_dpe=diagnosticDate;
 const consumption=description.match(/classe [ée]nergie [A-G]\s*:\s*([\d.,]+)\s*kWh\/m[²2]\/an/i)?.[1];if(consumption)row.consommation_energie=numeric(consumption);
 // Only a postcode explicitly adjacent to this property's published locality;
 // never copy the agency's address or choose one from a municipality database.
 if(!postal&&city){const literal=city.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),codes=new Set([...description.matchAll(new RegExp('(?:\\b'+literal+'\\s*[,(-]?\\s*(\\d{5})\\b|\\b(\\d{5})\\s*[,)-]?\\s*'+literal+'\\b)','gi'))].map(m=>m[1]||m[2]));if(codes.size===1)row.code_postal=[...codes][0];}
 for(const [name,target] of [['DPE','dpe'],['GES','ges']]){const classes=new Set([...html.matchAll(new RegExp('images/dpe_ges/'+name+'_([A-G])\\.png','gi'))].map(m=>m[1].toUpperCase()));if(classes.size===1)row[target]=[...classes][0];else if(classes.size>1)throw Error('Diagnostic Sitea ambigu');}
 // The listing's public contact panel names no individual advisor. Keep the
 // explicitly labelled footer agency telephone; never assign it to a person.
 const footer=html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0]||'',phone=footer.match(/href="tel:([+\d .()-]+)"/i)?.[1];if(phone){row.contact_nom='Cabinet Sitea Immobilier (agence)';row.contact_telephone=phone;}
 return row;
}
export async function readSitea(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
 const pages=new Map<string,{text:string,url:URL}>(),records=new Map<string,any>();
 for(const tx of ['vente','location']){const u=new URL('/resultats?transac='+tx,ORIGIN),page=await fetchHtml(u);if(!isSitea(page.url))throw Error('Catalogue Sitea redirigé');pages.set(u.toString(),page);for(const item of siteaCatalogue(page.text)){const detail=new URL(item.lien,ORIGIN);if(!isSitea(detail)||!detail.pathname.startsWith('/'+tx+'-')||!detail.pathname.endsWith('-'+item.id.replace(/-/g,'_')))throw Error('Lien Sitea hors du catalogue demandé');if(records.has(detail.toString()))throw Error('Fiche répétée dans le catalogue Sitea');records.set(detail.toString(),item);}}
 const rows:any=await crawlCatalogue(ORIGIN+'/','sitea-v1',[...pages.keys()],async u=>pages.get(u.toString())||fetchHtml(u),(_html,u)=>({lists:[],details:siteaCatalogue(pages.get(u.toString())!.text).map((r:any)=>new URL(r.lien,ORIGIN).toString())}),(html,url)=>{const row=parseSitea(html,url),source=records.get(url);if(!source||row.reference!==source.id)throw Error('Identité Sitea incohérente');return row;},memory,{expectedTotal:records.size,maxDetails:8});
 rows.total=records.size;rows.platform='Sitea (ICS, catalogues vente/location)';rows.sector='immobilier';return rows;
}
