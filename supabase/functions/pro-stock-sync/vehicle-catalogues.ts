// Dedicated public HTML readers: BNY'S Car and Decros / Regicom.
import {sDecode} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(v:any)=>sDecode(String(v??'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\r]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();
const number=(s:any)=>{const m=String(s||'').match(/[\d][\d\s.,]*/);return m?m[0].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'):'';};
function block(html:string,id:string){const m=html.match(new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid=["']${id}["'][^>]*>`,'i'));if(!m)return'';const from=m.index!,tag=m[1],r=new RegExp(`<\\/?${tag}\\b[^>]*>`,'gi');r.lastIndex=from;let depth=0;for(let n;(n=r.exec(html));){depth+=n[0].startsWith('</')?-1:1;if(!depth)return html.slice(from,r.lastIndex);}return'';}
export function parseVehicleCatalogueDetail(html:string,url:string,kind:'bnys'|'decros'){
 const fields=new Map<string,string>();
 if(kind==='bnys')for(const m of block(html,'mtbf-tableau').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi))fields.set(clean(m[1]).replace(/\s*:\s*$/,''),clean(m[2]));
 else for(const m of html.matchAll(/<li\b[^>]*>\s*<strong[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)<\/li>/gi))fields.set(clean(m[1]).replace(/\s*:\s*$/,''),clean(m[2]));
 if(kind==='decros')for(const m of block(html,'detailOptionsFix').matchAll(/<li[^>]*>([^<:]+):([\s\S]*?)<\/li>/gi))fields.set(clean(m[1]),clean(m[2]));
 const titre=clean(kind==='bnys'?html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]:block(html,'spanHeaderCar'));
 if(!titre)throw Error('Titre véhicule absent.');const priceText=kind==='bnys'?clean(block(html,html.match(/id=["'](single-price[^"']*)["']/i)?.[1]||'single-price')):clean(block(html,'detailPriceCar'));
 if(/\bvendu[e]?\b|réservé|en préparation/i.test(priceText))return null;
 const gallery=block(html,kind==='bnys'?'car-images-carousel':'car_slider');const photos=[];
 for(const m of gallery.matchAll(/href=["']([^"']+)["']/gi))try{const u=new URL(sDecode(m[1]),url);if(/^https?:$/.test(u.protocol))photos.push(u.toString());}catch{}
 const date=fields.get(kind==='bnys'?'Mise en circulation':'Année immatriculation')||'';
 const o:any={reference:kind==='bnys'?new URL(url).pathname.split('/').filter(Boolean).pop():html.match(/data-idcar=["'](\d+)/)?.[1],url,titre,prix:/€/.test(priceText)?number(priceText):'',marque:kind==='bnys'?titre.split(/\s/)[0]:fields.get('Marque'),modele:kind==='bnys'?'':fields.get('Modèle'),version:fields.get('Version'),type:'voiture',etat:'occasion',annee:date.match(/(?:19|20)\d{2}/)?.[0],mise_en_circulation:date,kilometrage:number(fields.get('Kilométrage')),carburant:fields.get(kind==='bnys'?'Énergie':'Carburant'),boite:fields.get(kind==='bnys'?'Boite':'Transmission'),puissance_din:number(fields.get('Puissance')),puissance_fiscale:number(fields.get('Puissance fiscale')),couleur:fields.get('Couleur'),photos:dedupePhotos(photos).join('|'),description:clean(block(html,kind==='bnys'?'description-text':'detailDescriptionCarLong')).replace(/^Description\s*/,''),contact_nom:kind==='bnys'?"BNY'S CAR":'Decros Automobiles'};
 if(kind==='bnys'){
  const footer=html.slice(html.lastIndexOf("class='right-row'"));o.contact_telephone=footer.match(/href=["']tel:([^"']+)/i)?.[1]||html.match(/href=["']tel:([^"']+)/i)?.[1]||'';
  const loc=clean(footer).match(/\b(\d{5})\s+([A-ZÀ-Ý][A-ZÀ-Ý -]+?)(?=\s*\+|\s*0[1-9])/);o.code_postal=loc?.[1]||'';o.ville=loc?.[2]?.trim()||'';
 }else{
  o.code_postal=fields.get('CODE POSTAL')||'';o.ville=fields.get('VILLE')||'';o.contact_telephone=html.match(/href=["']tel:([^"']+)/i)?.[1]||'';
  o.equipements=fields.get('EQUIPEMENTS');o.portes=fields.get('NB PORTES');o.crit_air=fields.get('CLASSE CRITAIR');o.garantie=fields.get('GARANTIE');o.co2=fields.get('EMISSION CO2');
  const body=fields.get('CARROSSERIE')||fields.get('Type')||'';o.carrosserie=body;if(/fourgon|utilitaire|benne|plateau|pick.?up/i.test(body+' '+titre))o.type='utilitaire';
 }return o;
}
export async function readVehicleCatalogue(start:URL,html:string,kind:'bnys'|'decros',fetchHtml:Fetcher){
 const root=new URL(kind==='bnys'?'/youngtimers-occasion/':'/fr/',start);if(kind==='bnys'&&/^\/youngtimers\/[^/]+\/?$/.test(start.pathname)||kind==='decros'&&/data-idcar=["']\d+/.test(html)){const o=parseVehicleCatalogueDetail(html,start.toString(),kind);return o?[o]:[];}
 if(start.search)throw Error('Catalogue véhicule sans filtre requis.');
 const first=(start.pathname===root.pathname||kind==='decros'&&/id=["']elemPager["']/.test(html))?html:(await fetchHtml(root)).text;
 const entries=new Set<string>(),queue=[{url:root,text:first}],seen=new Set<string>();let partial=false,pages=0;
 while(queue.length&&pages<30){const p=queue.shift()!;if(seen.has(p.url.toString()))continue;seen.add(p.url.toString());pages++;
  if(kind==='decros')for(const m of p.text.matchAll(/<input\b[^>]*id=["']carUrl-\d+["'][^>]*value=["']([^"']+)["']/gi))entries.add(new URL('/fr/'+sDecode(m[1]),root).toString());
  else for(const m of p.text.matchAll(/href=["']([^"']+)["']/gi)){let u:URL;try{u=new URL(sDecode(m[1]),root);}catch{continue;}if(u.origin!==root.origin)continue;
   if(/^\/youngtimers\/[^/]+\/?$/.test(u.pathname)){u.hash='';u.search='';entries.add(u.toString());}
   else if(u.pathname.startsWith(root.pathname)&&/\/page\/\d+\/?$/.test(u.pathname)&&!seen.has(u.toString()))try{queue.push({url:u,text:(await fetchHtml(u)).text});}catch{partial=true;}}
 }if(queue.length)partial=true;if(!entries.size)throw Error('Aucune fiche du catalogue trouvée.');
 const urls=[...entries],rows:any[]=[];let next=0,misses=0,sold=0;const failures:any[]=[];
 await Promise.all(Array.from({length:3},async()=>{while(next<urls.length){const u=urls[next++];try{const o=parseVehicleCatalogueDetail((await fetchHtml(new URL(u))).text,u,kind);if(o)rows.push(o);else sold++;}catch(e){partial=true;misses++;failures.push({url:u,error:String(e)});}}}));
 (rows as any).partial=partial;(rows as any).total=entries.size;(rows as any).stats={pages,details:entries.size,read:rows.length,misses,unavailable:sold,failures};return rows;
}
