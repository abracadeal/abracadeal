// I3V's public minisite lists its own agency, while its fiches live on the
// network host. Follow only IDs actually present in agency 91016's catalogue.
import {sDecode} from './smart-reader.ts';
import {eachDetailResumable,type CrawlMemory} from './resumable-crawl.ts';
import {fillEnergyFromImages} from './energy-image.ts';
import {isPlaceholderPhoto} from './photo-utils.ts';
type Fetcher=(url:URL)=>Promise<{text:string,url:URL}>;
const SOURCE='http://i3v.coteimmobilier.net';
export const isI3v=(u:URL)=>u.hostname==='i3v.coteimmobilier.net';
export function i3vIdentity(r:any){try{const u=new URL(r.externalUrl);return /^(?:www\.)?coteimmobilier\.net$/.test(u.hostname)&&u.pathname==='/fr/detail.htm'&&/^91016\d+$/.test(r.ref)&&u.searchParams.get('cle')===r.ref?'i3v|'+r.ref:null;}catch{return null;}}
const clean=(s:string)=>sDecode(s.replace(/<!--[\s\S]*?-->/g,'').replace(/<br\s*\/?>|<\/(?:div|p)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\u00a0]+/g,' ').split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
export function i3vLinks(html:string){
 const total=Number(clean(html).match(/\b(\d+) bien\(s\) trouv[ée]/i)?.[1]??NaN);if(!Number.isFinite(total))throw Error('Compteur public I3V absent');
 const details=new Set<string>(),lists=new Set<string>();
 for(const m of html.matchAll(/href=["']([^"']+)["']/gi)){const u=new URL(sDecode(m[1]),SOURCE);
  if(u.pathname==='/fr/detail.htm'&&/^(?:www\.)?coteimmobilier\.net$/.test(u.hostname)){const id=u.searchParams.get('cle');if(!/^91016\d+$/.test(id||''))throw Error('Bien hors agence I3V');details.add('http://www.coteimmobilier.net/fr/detail.htm?cle='+id+'&monnaie=2');}
  if(isI3v(u)&&u.pathname==='/fr/liste.htm'&&u.searchParams.get('num_client1')==='91016'&&['1','2'].includes(u.searchParams.get('ope')||'')&&/^\d+$/.test(u.searchParams.get('page')||''))lists.add(u.toString());
 }
 return {total,details:[...details],lists:[...lists]};
}
export async function parseI3v(html:string,url:string){
 const u=new URL(url),id=u.searchParams.get('cle');if(!/^(?:www\.)?coteimmobilier\.net$/.test(u.hostname)||u.pathname!=='/fr/detail.htm'||!/^91016\d+$/.test(id||''))throw Error('Fiche hors agence I3V');
 const ld=JSON.parse(html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)?.[1]||'null');
 if(!ld?.offers?.url||new URL(ld.offers.url).searchParams.get('cle')!==id||ld.offers.priceCurrency!=='EUR')throw Error('Identité/prix I3V incohérent');
 if(!/\/InStock$/.test(ld.offers.availability||''))return {_sold:1};
 const description=clean(html.match(/class="detail-bien-desc-content clearfix"[^>]*>\s*<p>([\s\S]*?)<\/p>/i)?.[1]||'');
 if(!description)throw Error('Description I3V absente');
 const city=String(ld.address?.addressLocality||''),postal=String(ld.address?.postalCode||''),type=clean(html.match(/<h1 class="detail-bien-type">([\s\S]*?)<\/h1>/i)?.[1]||'');
 const row:any={reference:id,url,titre:type+' '+city,type_bien:/^atelier$/i.test(type)?'local professionnel (atelier)':type,prix:ld.offers.price,transaction:'vente',ville:city,code_postal:postal,description,_exact_source_city:city,_source_specific_fields:true};
 if(!type||!city)throw Error('Type/ville I3V absent');
 // Use the visible property's specs, never the hidden default/NC values or
 // the agency/seller address. Description remains literal if figures differ.
 const specs=html.match(/class="detail-bien-specs">([\s\S]*?)<\/ul>/i)?.[1]||'';
 for(const [icon,key] of [['surface','surface'],['piece','pieces'],['chambre','chambres'],['terrain','surface_terrain']]){const value=clean(specs.match(new RegExp('class="ico-'+icon+'"[^>]*>[\\s\\S]*?<\\/span>\\s*([\\s\\S]*?)<\\/li>','i'))?.[1]||'').match(/^([\d., ]+)/)?.[1];if(value&&Number(value.replace(/ /g,'').replace(',','.'))>0)row[key]=Number(value.replace(/ /g,'').replace(',','.'));}
 if(Number(ld.numberOfBathroomsTotal)>0)row.salles_de_bain=Number(ld.numberOfBathroomsTotal);
 const carrez=description.match(/Surface CARREZ\s*:\s*([\d.,]+)/i)?.[1];if(carrez)row.surface_carrez=Number(carrez.replace(',','.'));
 const energyCosts=clean(html.match(/class="detail-bien-dpe clearfix">([\s\S]*?)<!-- Affichage du detail des pièces -->/i)?.[1]||'').match(/entre\s+([\d., ]+)€\s+et\s+([\d., ]+)€/i);if(energyCosts){row.cout_energie_min=Number(energyCosts[1].replace(/ /g,'').replace(',','.'));row.cout_energie_max=Number(energyCosts[2].replace(/ /g,'').replace(',','.'));}
 if(/^\d{4}$/.test(ld.yearBuilt||'')&&Number(ld.yearBuilt)>1700)row.annee_construction=Number(ld.yearBuilt);
 const photos=new Map<string,string>();for(const m of html.matchAll(/<img\b[^>]*>/gi)){if(!/class="photo-slideshow photo-big"/.test(m[0]))continue;const src=m[0].match(/(?:data-src|src)="([^"]+)"/)?.[1];if(!src)continue;const image=new URL(sDecode(src));if(image.hostname!=='assets.adaptimmo.com'||!image.pathname.startsWith('/photos-biens/91016/'+id+'_')||isPlaceholderPhoto(image.toString()))continue;if(!photos.has(image.pathname))photos.set(image.pathname,image.toString());}
 row.photos=[...photos.values()].join('|');
 // The selected AGENCE panel is the fiche's contact; the RESEAU panel and
 // JSON-LD seller are another entity. Never misattribute that network number.
 const contact=html.match(/class="contact-agence-agent hidden" data-show-if="\('AGENCE'=='AGENCE'\)">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)?.[1]||'';
 row.contact_nom=clean(contact.match(/class="heading3">([\s\S]*?)<\/div>/)?.[1]||'');
 row.contact_telephone=clean(contact.match(/class="hidden gganal-contact-agence-coord">([\s\S]*?)<\/span>/)?.[1]||'').split('-')[0];
 const direct=description.match(/(?:CONTACTEZ[- ]MOI|ME CONTACTER)\s+AU\s+((?:0[1-9])(?:[ .-]?\d{2}){4})/i)?.[1];if(direct){row.contact_telephone=direct;row.contact_nom='';}
 const lots=description.match(/Nb de lot\s*:\s*(\d+)/i);if(lots)row.nombre_lots=Number(lots[1]);
 const charges=description.match(/Charges annuelles de copropri[ée]t[ée][^:]*:\s*([\d., ]+)/i);if(charges)row.charges_annuelles=Number(charges[1].replace(/ /g,'').replace(',','.'));
 if(/soumis au statut juridique de la copropri[ée]t[ée]/i.test(description))row.copropriete='Oui';
 const fees=description.match(/Honoraires[^\n]+/i)?.[0];if(fees)row.honoraires=fees;
 // Diagnostics are real public images, kept out of the property gallery.
 const energy:any={};for(const m of html.matchAll(/<img\b[^>]*src=['"]([^'"]+)['"][^>]*alt=['"](DPE|GES)['"]/gi)){const image=new URL(sDecode(m[1]));if(image.hostname==='outil.adaptimmo.com'&&image.pathname.startsWith('/dpe/image/'))energy[m[2].toLowerCase()+'_image']=image.toString();}
 await fillEnergyFromImages([energy]);for(const k of ['dpe','ges'])if(energy[k])row[k]=energy[k];
 return row;
}
export async function readI3v(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
 const ids=new Set<string>(),counts:number[]=[];
 for(const ope of ['1','2']){
  const queue=[SOURCE+'/fr/liste.htm?num_client1=91016&ope='+ope+'&page=1'],seen=new Set<string>();let total:number|undefined;const own=new Set<string>();
  while(queue.length){if(seen.size>=100)throw Error('Catalogue I3V trop grand, pagination non validée');const link=queue.shift()!;if(seen.has(link))continue;seen.add(link);const page=await fetchHtml(new URL(link));if(!isI3v(page.url))throw Error('Catalogue I3V redirigé');const found=i3vLinks(page.text);if(total!=null&&total!==found.total)throw Error('Compteur I3V instable');total=found.total;for(const d of found.details)own.add(d);for(const l of found.lists)if(new URL(l).searchParams.get('ope')===ope&&!seen.has(l))queue.push(l);}
  if(own.size!==total)throw Error('Pagination I3V incomplète : '+own.size+'/'+total);
  // Rental HTML has no listings today. Refuse a new rental catalogue until its
  // rental-specific prices/fees have been verified, rather than label it sale.
  if(ope==='2'&&own.size)throw Error('Locations I3V apparues : lecteur location à valider');
  counts.push(own.size);for(const d of own)ids.add(d);
 }
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode([...ids].sort().join('|'))))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const rows:any=await eachDetailResumable('i3v-v2:'+digest,[...ids],async url=>{const page=await fetchHtml(new URL(url));if(page.url.hostname!=='www.coteimmobilier.net')throw Error('Fiche I3V redirigée');return parseI3v(page.text,url);},memory,4);
 rows.total=ids.size;rows.platform='I3V (Adaptimmo, agence 91016)';rows.sector='immobilier';rows.stats={...rows.stats,expected_total:ids.size,sale_total:counts[0],rental_total:counts[1]};return rows;
}
