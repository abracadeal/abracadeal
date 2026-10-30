// Scoped public catalogues: Progressia data file, Human agency and Citya agency.
import {sDecode,smartDetail} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(v:any)=>sDecode(String(v??'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();
export function estateJson(html:string){const a:any[]=[];for(const m of html.matchAll(/<script\b[^>]*type=["']([^"']+)["'][^>]*>([\s\S]*?)<\/script>/gi)){if(sDecode(m[1])!=='application/ld+json')continue;try{const walk=(x:any)=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){a.push(x);if(x['@graph'])walk(x['@graph']);}};walk(JSON.parse(m[2]));}catch{}}return a;}
export function parseNetworkEstate(html:string,url:string,kind:'human'|'citya'){
 const all=estateJson(html),listing=all.find(x=>x['@type']==='RealEstateListing');if(!listing)throw Error('Données structurées du bien absentes.');
 const offer=listing.offers||listing.mainEntity||{},v=offer.itemOffered||listing.about||{};
 if(/SoldOut|OutOfStock|Discontinued/i.test(offer.availability||''))return null;
 const fallback=smartDetail(html,url,'immobilier')||{};
 // Only the listing's own text; never the descriptions, town taxes or contacts of recommendations.
 const o:any={reference:new URL(url).pathname.split('/').pop(),url,titre:clean(v.name||listing.name),prix:offer.price??'',ville:clean(v.address?.addressLocality),code_postal:v.address?.postalCode||'',surface:v.floorSize?.value,pieces:v.numberOfRooms,chambres:v.numberOfBedrooms,surface_terrain:v.lotSize?.value,transaction:/\/location\//.test(url)?'location':'vente',type_bien:/maison|house/i.test(String(v['@type'])+' '+url)?'maison':/terrain|land/i.test(String(v['@type'])+' '+url)?'terrain':/parking|garage/i.test(url)?'garage':/bureau|commerce|professionnel/i.test(url)?'commerce':'appartement'};
 const props=v.additionalProperty||[];for(const p of props){if(p.name==='DPE')o.dpe=p.value;if(p.name==='GES')o.ges=p.value;if(p.name==='Consommation énergie')o.consommation_energie=String(p.value).match(/[\d.]+/)?.[0];}
 let photos:string[]=[];
 if(kind==='human'){
  const ref=url.match(/_(\d+-\d+)$/)?.[1];if(!ref)throw Error('Référence Human invalide.');o.reference=ref;
  const description=html.match(/<div\b[^>]*class=["'][^"']*\bdescriptif\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];o.description=clean(description||listing.description||'');
  for(const m of html.matchAll(/<img\b[^>]*>/gi)){const u=sDecode(m[0].match(/\s(?:src|data-src|data-lazy)=["']([^"']+)/i)?.[1]||'');if(u.includes('/'+ref+'_'))photos.push(new URL(u,url).toString());}
  const agency=all.find(x=>x['@type']==='RealEstateAgent');o.contact_nom=clean(agency?.name||'');o.contact_telephone=clean(agency?.telephone||'');
  if(!o.contact_telephone){const zone=html.split('content-infos_agence')[1]?.split('detail_bien__content')[0]||'';o.contact_telephone=zone.match(/href=["']tel:([^"']+)/i)?.[1]||'';}
  const gv=html.match(/class=["']DPE_valeur_GES["'][^>]*>\s*([\d.,]+)/i);if(gv)o.emission_ges=gv[1];
  // Explicit feature labels, excluding the local-area statistics panel.
  const facts=html.match(/id=["']caracteristique-bien["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1]||'';o.texte_page=clean(facts);
  for(const m of facts.matchAll(/<li\b[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/gi)){const k=clean(m[1]),val=clean(m[2]);if(/Garage/.test(k))o.garage=val;if(/Parking/.test(k))o.parking=val;if(/Terrasse/.test(k))o.terrasse=val;if(/Chauffage/.test(k))o.chauffage=val;if(/eau/.test(k))o.salles_eau=val;}
  const fees=clean(html).replace(/\s+/g,' ').match(/Prix honoraires inclus[^\n]{0,350}/i)?.[0];if(fees)o.honoraires=fees.split('Simulez')[0].trim();
 }else{
  o.description=clean(v.description||listing.description||'');
  const gallery=html.match(/id=["']carousel-[^"']+["'][\s\S]*?aria-label=["']Photos [^"']+["']>([\s\S]*?)(?=<\/section>|<\/figure>|<\/picture>|<script)/i)?.[1]||html;
  for(const m of gallery.matchAll(/<img\b[^>]*alt=["']Photo \d+[^"']*["'][^>]*>|<img\b[^>]*(?:src|data-src)=["'][^"']+["'][^>]*alt=["']Photo \d+[^"']*["'][^>]*>/gi)){const src=m[0].match(/(?:\s|^)(?:data-src|src)=["']([^"']+)/i)?.[1];if(src)photos.push(new URL(sDecode(src),url).toString());}
  const energy=html.match(/Diagnostic de performance énergétique, classe ([A-G]), consommation ([\d.,]+)/i);if(energy){o.dpe=energy[1];o.consommation_energie=energy[2];}
  const ges=html.match(/gaz à effet de serre, classe ([A-G]), émission ([\d.,]+)/i);if(ges){o.ges=ges[1];o.emission_ges=ges[2];}
  const zone=html.slice(html.indexOf('Agence référente'),html.indexOf('Nos biens similaires'));o.contact_nom=clean(zone.match(/>\s*(Citya[^<]+)</i)?.[1]||'');o.contact_telephone=zone.match(/href=["']tel:([^"']+)/i)?.[1]||'';
  for(const k of ['chambres','salles_de_bain','parking','garage','balcon','terrasse','etage','ascenseur'])if(fallback[k])o[k]=fallback[k];
 }
 o.photos=dedupePhotos(photos.length?photos:Array.isArray(listing.image)?listing.image:[listing.image].filter(Boolean)).join('|');return o;
}
const hrefs=(html:string,base:URL)=>[...html.matchAll(/href=["']([^"']+)["']/gi)].flatMap(m=>{try{return[new URL(sDecode(m[1]),base)];}catch{return[];}});
export async function readNetworkAgency(start:URL,html:string,kind:'human'|'citya',fetchHtml:Fetcher){
 let roots:URL[]=[];
 if(kind==='human'){
  if(/^\/annonce-(achat|location)-/.test(start.pathname)){const row=parseNetworkEstate(html,start.toString(),kind);return row?[row]:[];}
  const path=start.pathname.startsWith('/immobilier-agence-')?start.pathname:hrefs(html,start).find(u=>u.origin===start.origin&&u.pathname.startsWith('/immobilier-agence-'))?.pathname;
  if(!path)throw Error('Catalogue de cette agence Human introuvable.');roots=[new URL(path,start)];
 }else{
  if(/^\/annonces\/(vente|location)\/(?!agence)/.test(start.pathname)){const row=parseNetworkEstate(html,start.toString(),kind);return row?[row]:[];}
  const id=start.pathname.match(/\/agences-immobilieres\/[^/]+\/(\d+)/)?.[1]||start.pathname.match(/\/annonces\/agence\/(\d+)/)?.[1];if(!id)throw Error('Adresse agence Citya requise.');
  roots=['vente','location'].map(tr=>new URL(`/annonces/agence/${id}/${tr}`,start));
 }
 const entries=new Map<string,URL>();let partial=false,pages=0,total=0;const scopeIds=new Set<string>();
 for(const root of roots){const queue=[root],seen=new Set<string>();let rootTotal:number|undefined;
  while(queue.length&&seen.size<40){const u=queue.shift()!;if(seen.has(u.toString()))continue;seen.add(u.toString());let page:string;
   try{page=u.toString()===start.toString()?html:(await fetchHtml(u)).text;pages++;}catch{partial=true;continue;}
   if(rootTotal===undefined){const m=kind==='human'?page.match(/"offerCount"\s*:\s*"?(\d+)/):clean(page.replace(/<script\b[\s\S]*?<\/script>/gi,'')).match(/(\d+)\s+résultats?/);if(m){rootTotal=Number(m[1]);total+=rootTotal;}}
   for(const link of hrefs(page,root)){if(link.origin!==root.origin)continue;
    const isDetail=kind==='human'?/^\/annonce-(achat|location)-[^/]+_\d+-\d+$/.test(link.pathname):/^\/annonces\/(vente|location)\/[^/]+\/[^/]+\/[^/]+$/.test(link.pathname);
    if(isDetail){link.search='';link.hash='';entries.set(link.toString(),link);if(kind==='human')scopeIds.add(link.pathname.match(/_(\d+)-\d+$/)![1]);}
    else if(link.pathname===root.pathname&&/^\?page=\d+$/.test(link.search)&&!seen.has(link.toString()))queue.push(link);
   }
  }if(queue.length)partial=true;if(rootTotal===undefined)partial=true;
 }
 // Human agency pages must not drift to other agencies or to all-France search pages.
 if(kind==='human'&&scopeIds.size!==1)throw Error('Périmètre Human ambigu : lecture annulée.');
 if(entries.size!==total)partial=true;
 const urls=[...entries.values()],rows:any[]=[];let next=0,misses=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<urls.length){const u=urls[next++];try{const o=parseNetworkEstate((await fetchHtml(u)).text,u.toString(),kind);if(o)rows.push(o);else misses++;}catch{partial=true;misses++;}}}));
 if(rows.length!==total)partial=true;(rows as any).partial=partial;(rows as any).total=total;(rows as any).stats={pages,details:entries.size,read:rows.length,misses};return rows;
}
export function parseProgressia(text:string,start:URL){
 const match=text.match(/^\s*window\.PROGRESSIA_LISTINGS\s*=\s*([\s\S]*?)\s*;?\s*$/);if(!match)throw Error('Catalogue Progressia non reconnu.');const d=JSON.parse(match[1]);
 if(!Array.isArray(d.catalogueItems)||!Array.isArray(d.proCatalogueItems))throw Error('Catalogue Progressia incomplet.');
 const flux=start.searchParams.get('flux');if([...start.searchParams.keys()].some(k=>k!=='flux')||flux&&!['pro','viager'].includes(flux))throw Error('Filtre Progressia non reconnu.');
 const source=flux==='pro'?d.proCatalogueItems:flux==='viager'?d.viagerCatalogueItems:[...d.catalogueItems,...d.proCatalogueItems];
 if(!Array.isArray(source))throw Error('Catalogue Progressia absent.');const unique=new Map<string,any>();
 for(const v of source){if(!/^\d+$/.test(v.affId))throw Error('Référence Progressia invalide.');if(/vendu|loué|retiré/i.test(v.statut))continue;unique.set(v.flux+'-'+v.affId,v);}
 const rows:any[]=[...unique.values()].map(v=>({reference:v.flux+'-'+v.affId,url:new URL('/bien/bien-'+v.affId+'/',start).toString(),titre:v.title,prix:v.priceNum,ville:v.ville,code_postal:v.postalCode,type_bien:v.propertyType,transaction:'vente',description:v.description,photos:dedupePhotos(v.images||[v.img]).join('|'),surface:v.surfaceNum,pieces:v.piecesNum,chambres:v.chambresNum,dpe:v.dpe,ges:v.ges,consommation_energie:v.energySpend,date_dpe:v.dateDpe,cout_energie_min:v.chargeEnergieMin,cout_energie_max:v.chargeEnergieMax,surface_terrain:v.surfaceTerrain,etage:v.etage,ascenseur:v.ascenseur==='1'?'Oui':v.ascenseur==='0'?'Non':'',jardin:v.jardin==='1'?'Oui':v.jardin==='0'?'Non':'',chauffage:[v.chauffage,v.modeChauffage].filter(Boolean).join(' / '),taxe_fonciere:v.taxeFonciere,charges_mensuelles:v.chargesMensuelles,honoraires:v.chargeHonoraires,contact_nom:v.agent?.name,contact_telephone:v.agent?.tel}));
 (rows as any).partial=false;(rows as any).total=source.length;(rows as any).stats={pages:1,details:rows.length,read:rows.length};return rows;
}
export async function readProgressia(start:URL,fetchHtml:Fetcher){return parseProgressia((await fetchHtml(new URL('/progressia-listings-data.js',start))).text,start);}
