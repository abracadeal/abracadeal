// ATS publishes its occasions through a publicly embedded Motoconcess catalogue.
// Only the iframe linked by ATS is read, never the provider's global stock.
import {sDecode} from './smart-reader.ts';
import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
import {isPlaceholderPhoto} from './photo-utils.ts';
const BASE='https://ats-sud.com';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const isAtsSud=(u:URL)=>/^(?:www\.)?ats-sud\.com$/.test(u.hostname);
export function atsIdentity(r:any){try{const u=new URL(r.externalUrl),m=u.pathname.match(/^\/([a-f0-9]{40})\/detailsannonce\/(\d+)-/);return u.hostname==='include.motoconcess.fr'&&m&&r.ref===m[2]?'motoconcess|'+m[1]+'|'+m[2]:null;}catch{return null;}}
const clean=(s:string)=>sDecode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
function block(s:string,id:string){const m=new RegExp('<div\\b[^>]*id="'+id+'"[^>]*>','i').exec(s);if(!m)return '';let depth=1;const re=/<\/?div\b[^>]*>/gi;re.lastIndex=m.index+m[0].length;for(let t;(t=re.exec(s));){depth+=/^<\//.test(t[0])?-1:1;if(!depth)return s.slice(m.index,re.lastIndex);}throw Error('Bloc Motoconcess incomplet');}
export function atsFrame(html:string,base:URL){const src=html.match(/<iframe\b[^>]*src="\s*([^"]+)"/i)?.[1];if(!src)throw Error('Catalogue intégré ATS absent');const u=new URL(sDecode(src.trim()),base);if(u.protocol!=='https:'||u.hostname!=='include.motoconcess.fr'||!/^\/[a-f0-9]{40}\/?$/.test(u.pathname)||u.search)throw Error('Catalogue ATS hors périmètre');return u;}
export function atsLinks(html:string,u:URL,root:URL){const details=new Set<string>(),lists=new Set<string>();for(const m of html.matchAll(/href="([^"]+)"/gi)){let p:URL;try{p=new URL(sDecode(m[1]),u);}catch{continue;}if(p.hostname!==root.hostname)continue;const prefix=root.pathname.replace(/\/$/,'');if(p.pathname.startsWith(prefix+'/detailsannonce/')&&/\/detailsannonce\/\d+-[^/]+$/.test(p.pathname)){p.hash='';p.search='';details.add(p.toString());}else if(p.pathname.replace(/\/$/,'')===prefix&&p.search){p.hash='';lists.add(p.toString());}}
 if(!details.size)throw Error('Liste des occasions ATS vide ou non reconnue');return {details:[...details],lists:[...lists]};}
export function parseAtsSud(html:string,url:string,root:URL){const u=new URL(url),id=u.pathname.match(/\/detailsannonce\/(\d+)-/)?.[1];if(u.hostname!==root.hostname||!u.pathname.startsWith(root.pathname.replace(/\/$/,'')+'/detailsannonce/')||!id)throw Error('Fiche ATS hors périmètre');
 const canonical=html.match(/<meta\b[^>]*property="og:url"[^>]*content="([^"]+)"/i)?.[1];if(!canonical||new URL(sDecode(canonical)).pathname.match(/\/detailsannonce\/(\d+)-/)?.[1]!==id)throw Error('Identité fiche ATS incohérente');
 let firstOwner=false;const facts=new Map<string,string>(),table=block(html,'IDAnnonceCaracteristiques');for(const m of table.matchAll(/<tr\b[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)){const key=clean(m[1]).toLowerCase(),value=clean(m[2]);facts.set(key,value);if(/^premi[eè]re main/.test(key)&&(/\bfa-check\b/.test(m[2])||/^oui$/i.test(value)))firstOwner=true;}
 const title=clean(html.match(/<meta\b[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1]||'');const state=[title,facts.get('état')||''].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(/^(?:VENDU|RESERVE|NEUF)\b|\b(?:vendu|reserve|neuf)\b\s*$/i.test(state.trim())||/^0(?:\s|$)/.test(facts.get('kilomètres')||''))return {_sold:1};
 const concession=clean(block(html,'IDAnnonceConcession'));if(!/\bATS SUD\b/.test(concession)||!concession.includes('83400 HYERES'))throw Error('Concession ATS non confirmée');
 const modal=clean(block(html,'IDVoirTelephoneModal')),phone=modal.match(/Appelez nous au\s*:\s*(0[1-9](?:[ .-]*\d){8})/i)?.[1],name=modal.match(/Demandez\s*:\s*([^\n]+)/i)?.[1]?.trim();
 const number=(x:string)=>Number(x.replace(/[^\d,.-]/g,'').replace(',','.'));
 const price=number(facts.get('prix')||'');if(!(price>0)||!title)throw Error('Prix/titre ATS absent');
 const photos=new Map<string,string>();for(const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)){if(!/\bclass="[^"]*\bfancybox\b/.test(m[0])||!m[0].includes('fancybox0'))continue;const p=new URL(sDecode(m[1]),u);if(p.hostname!==root.hostname||!/^\/nas\/commun\/annonces\/[a-f0-9]{40}\/[^/]+\.(?:jpe?g|png|webp)$/i.test(p.pathname)||isPlaceholderPhoto(p.toString()))continue;if(!photos.has(p.pathname))photos.set(p.pathname,p.toString());}
 if(!photos.size)throw Error('Galerie ATS absente');
 const desc=block(html,'IDAnnonceDescription').replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i,'');
 const row:any={reference:id,url,titre:title,prix:price,marque:facts.get('marque'),modele:facts.get('modèle'),type:'moto',etat:'occasion',ville:'HYERES',code_postal:'83400',photos:[...photos.values()].join('|'),description:clean(desc),contact_nom:name||'ATS SUD (concession)',contact_telephone:phone||''};
 const km=facts.get('kilomètres');if(km)row.kilometrage=number(km);const year=facts.get('année du modèle');if(year&&/^\d{4}$/.test(year))row.annee=Number(year);const mec=facts.get('date de mise en circulation');if(mec)row.mise_en_circulation=mec;
 for(const [from,to] of [['couleur','couleur'],['garantie','garantie'],['puissance','puissance_fiscale'],['cylindrée','cylindree'],['énergie','carburant'],['boite de vitesse','boite']])if(facts.get(from))row[to]=facts.get(from);
 if(firstOwner)row.historique='Première main';return row;
}
export async function readAtsSud(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory,digest?:(u:string)=>Promise<string|null>){
 const host=await fetchHtml(new URL('/motoconcess.html',BASE));if(!isAtsSud(host.url))throw Error('Page ATS redirigée hors site');const root=atsFrame(host.text,host.url);const first=await fetchHtml(root);if(first.url.hostname!==root.hostname||first.url.pathname.replace(/\/$/,'')!==root.pathname.replace(/\/$/,''))throw Error('Catalogue intégré ATS redirigé');
 const out:any=await crawlCatalogue(root.toString(),'ats-motoconcess-v1:'+root.pathname,[root.toString()],async u=>u.toString()===root.toString()?first:fetchHtml(u),(h,u)=>atsLinks(h,u,root),async(h,u)=>{const row=parseAtsSud(h,u,root);if(row._sold||!digest)return row;const hashes=new Set<string>(),photos=[];for(const p of row.photos.split('|')){const hash=await digest(p);if(!hash)throw Error('Photo ATS inaccessible');if(!hashes.has(hash)){hashes.add(hash);photos.push(p);}}return {...row,photos:photos.join('|')};},memory,{maxDetails:4});out.platform='ATS Sud (Motoconcess intégré)';out.sector='vehicules';return out;
}
