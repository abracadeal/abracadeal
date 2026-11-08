// Public VR Auto showroom data. Read the literal, never execute site scripts
// or use its Leboncoin links/sitemap as a second stock catalogue.
import {sDecode} from './smart-reader.ts';
import {eachDetailResumable,type CrawlMemory} from './resumable-crawl.ts';
import {isPlaceholderPhoto} from './photo-utils.ts';
const BASE='https://garagevrauto.fr';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const isVrAuto=(u:URL)=>u.hostname==='garagevrauto.fr'||u.hostname==='www.garagevrauto.fr';
export function vrAutoIdentity(r:any){try{const u=new URL(r.externalUrl);return isVrAuto(u)&&u.pathname==='/vehicule.html'&&u.searchParams.get('id')===r.ref?'vrauto|'+r.ref:null;}catch{return null;}}
export function vrAutoData(script:string){
 const start=/\bwindow\.VEHICULES\s*=\s*\[/.exec(script);if(!start)throw Error('Catalogue public VR Auto absent');
 let text='[',depth=1,quoted=false,escaped=false,at=start.index+start[0].length;
 for(;at<script.length&&depth;at++){const c=script[at];if(quoted){text+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;text+=c;continue;}if(c==='['||c==='{')depth++;if(c===']'||c==='}'){depth--;text=text.replace(/,\s*$/,'');}text+=c;
 }
 if(depth||!/^\s*;/.test(script.slice(at)))throw Error('Catalogue VR Auto incomplet');
 const records=JSON.parse(text),seen=new Set<string>();if(!Array.isArray(records)||!records.length)throw Error('Catalogue VR Auto vide');
 for(const r of records){if(!r||!/^vr[oz]-[a-z0-9]+$/.test(r.id)||seen.has(r.id)||!Array.isArray(r.photos))throw Error('Identité VR Auto invalide ou répétée');seen.add(r.id);}
 return records;
}
// A description really rendered by the source, not a description written by
// the robot. Only this exact data-only template is accepted. The other default
// equipment/seats/upholstery in the JS tail are not property-specific facts.
export function vrAutoDescription(r:any,script:string){
 if(typeof r.description==='string'&&r.description.trim())return r.description.trim();
 const str='("(?:[^"\\\\]|\\\\.)*")';
 const re=new RegExp('if \\(!v\\.description\\) v\\.description = v\\.titre \\+ '+str+' \\+ v\\.annee \\+ '+str+' \\+ v\\.km\\.toLocaleString\\("fr-FR"\\) \\+ '+str+' \\+ v\\.carburant \\+ '+str+';');
 const m=re.exec(script);if(!m)throw Error('Modèle de description VR Auto modifié');
 return String(r.titre)+JSON.parse(m[1])+r.annee+JSON.parse(m[2])+Number(r.km).toLocaleString('fr-FR')+JSON.parse(m[3])+r.carburant+JSON.parse(m[4]);
}
export function vrAutoRow(r:any,script:string,contact:{name:string,phone:string,city:string,postal:string}){
 const status=[r.statut,r.status,r.disponibilite,r.etat,r.condition,r.label,r.note].filter(Boolean).join(' ');
 const availability=(status+' '+r.titre).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/\b(?:vendu[e]?s?|sold|reserved|reserve[e]?s?|indisponible|unavailable|commande|arrivage|neuf|neuve|new|0\s*km|stock usine)\b/i.test(availability)||!(Number(r.km)>0))return null;
 if(!r.titre||!(r.prix>0)||!r.marque||!r.modele)throw Error('Fiche VR Auto incomplète : '+r.id);
 const photos=new Map<string,string>();for(const src of r.photos){const u=new URL(src);if(u.protocol!=='https:'||u.hostname!=='cdn2.intuityvo.fr'||!/^\/uploads\/intuity-vo\/(?:vehicle_photos(?:_carbox)?|vehicle_photo_(?:watermark|edit))\//.test(u.pathname)||isPlaceholderPhoto(src))continue;if(!photos.has(u.pathname))photos.set(u.pathname,u.toString());}
 if(!photos.size)throw Error('Galerie VR Auto absente : '+r.id);
 const row:any={reference:r.id,url:BASE+'/vehicule.html?id='+encodeURIComponent(r.id),titre:r.titre,prix:r.prix,marque:r.marque,modele:r.modele,annee:r.annee,kilometrage:r.km,carburant:r.carburant,boite:r.boite,carrosserie:r.type,type:/utilitaire|fourgon/i.test(r.type||'')?'utilitaire':'voiture',etat:'occasion',description:vrAutoDescription(r,script),photos:[...photos.values()].join('|'),ville:contact.city,code_postal:contact.postal,contact_nom:contact.name+' (garage)',contact_telephone:contact.phone};
 for(const [source,target] of [['finition','finition'],['din','puissance_din'],['cvFiscaux','puissance_fiscale'],['couleur','couleur'],['critair','crit_air'],['mec','mise_en_circulation'],['portes','portes'],['places','places'],['sellerie','sellerie'],['ct','controle_technique'],['equipements','equipements'],['historique','historique']])if(r[source]!=null&&r[source]!==''&&r[source]!=='—')row[target]=Array.isArray(r[source])?r[source].join('|'):r[source];
 if(r.premiereMain===true)row.historique=[row.historique,'Première main'].filter(Boolean).join('|');
 return row;
}
export async function vrAutoDedupe(row:any,digest:(u:string)=>Promise<string|null>){
 const seen=new Set<string>(),photos:string[]=[];
 for(const u of row.photos.split('|')){const hash=await digest(u);if(!hash)throw Error('Photo VR Auto inaccessible : '+u);if(!seen.has(hash)){seen.add(hash);photos.push(u);}}
 return {...row,photos:photos.join('|')};
}
export async function readVrAuto(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory,digest?:(u:string)=>Promise<string|null>){
 const home=await fetchHtml(new URL(BASE+'/')),catalogue=await fetchHtml(new URL(BASE+'/vehicules'));
 if(!isVrAuto(home.url)||!isVrAuto(catalogue.url))throw Error('VR Auto redirigé hors du site');
 const ld=JSON.parse(home.text.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)?.[1]||'null');
 if(ld?.['@type']!=='AutoDealer'||!isVrAuto(new URL(ld.url)))throw Error('Identité du garage VR Auto absente');
 const contact={name:ld.name,phone:ld.telephone,city:ld.address?.addressLocality,postal:ld.address?.postalCode};if(Object.values(contact).some(v=>!v))throw Error('Coordonnées VR Auto absentes');
 const src=catalogue.text.match(/<script\b[^>]*src="([^"?]*js\/data\.js(?:\?[^" ]*)?)"/i)?.[1];if(!src)throw Error('Lien du catalogue VR Auto absent');const dataUrl=new URL(sDecode(src),catalogue.url);if(!isVrAuto(dataUrl))throw Error('Catalogue VR Auto externe');
 const data=await fetchHtml(dataUrl);if(!isVrAuto(data.url))throw Error('Données VR Auto redirigées');const records=vrAutoData(data.text),rows=new Map<string,any>();
 for(const r of records){const row=vrAutoRow(r,data.text,contact);if(row)rows.set(row.url,row);}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([...rows.values()]))))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const out:any=await eachDetailResumable('vrauto-v2:'+hash,[...rows.keys()],async u=>digest?vrAutoDedupe(rows.get(u),digest):rows.get(u),memory,4);
 out.total=rows.size;out.platform='VR Auto (catalogue public du showroom)';out.sector='vehicules';out.stats={...out.stats,expected_total:rows.size,published_records:records.length,excluded:records.length-rows.size};return out;
}
