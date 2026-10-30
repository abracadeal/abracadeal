// Sites Apimo à modules HTML : listes actives uniquement, informations propres à la fiche.
import { sDecode } from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const text=(s:string)=>sDecode(s.replace(/<br\s*\/?>|<\/(?:p|li|div|h[1-6])>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const num=(s:string)=>s.replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
export const isApimoModules=(html:string)=>/apimo\.net\/[^"']*site-internet/i.test(html)&&/data-model-namespace=/i.test(html)&&/href="(?:https?:\/\/[^/]+)?\/[a-z]{2}\/(?:ventes?|locations?|acheter|louer)\/?"/i.test(html);
// Les lettres sont dessinées en tracés SVG. Lire la couleur de la ligne agrandie et encadrée,
// pas une classe déduite de seuils numériques ni la légende complète A→G.
export function apimoDiagnostic(svg:string){
  const energy:Record<string,string>={'00A06D':'A','52B153':'B','A5CC74':'C','F4E70F':'D','F0B40F':'E','EB8235':'F','D7221F':'G'};
  const climate:Record<string,string>={'A4DBF8':'A','8CB4D3':'B','7792B1':'C','606F8F':'D','4D5271':'E','393551':'F','281B35':'G'};
  let letter='';const kind=/CLASSE\s+[ÉE]NERGIE/.test(svg)?'dpe':/CLASSE\s+CLIMAT/.test(svg)?'ges':'';
  if(kind==='dpe')for(const m of svg.matchAll(/<polygon\s+fill="#([0-9A-F]+)"\s+points="([^"]+)"/gi)){const pairs=m[2].trim().split(/\s+/).map(p=>p.split(',').map(Number));const ys=pairs.map(p=>p[1]);const height=Math.max(...ys)-Math.min(...ys);if(height>35&&height<50&&energy[m[1].toUpperCase()])letter=energy[m[1].toUpperCase()];}
  if(kind==='ges'){const m=svg.match(/<path\s+fill="#([0-9A-F]+)"[^>]*\/>\s*<path\s+fill="#111111"/i);if(m)letter=climate[m[1].toUpperCase()]||'';}
  const values=[...svg.matchAll(/<text\b[^>]*font-size="20px"[^>]*>([\d.,]+)<\/text>/gi)].map(m=>num(m[1]));
  return {kind,letter,values};
}
export function parseApimoDetail(raw:string,url:string){
  const html=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const id=new URL(url).pathname.match(/\+(\d+)\/?$/)?.[1];if(!id)return null;
  const modules=html.split(/(?=<div\b[^>]*\bdata-module-id=)/gi);
  const module=(name:string)=>modules.find(x=>new RegExp('class="[^"]*\\b'+name+'\\b').test(x))||'';
  const info=module('property-info-template-2')||module('property-info-template-12')||module('property-info-template-19');
  const variant12=/class="[^"]*\bproperty-info-template-12\b/.test(info);
  const variant19=/class="[^"]*\bproperty-info-template-19\b/.test(info);
  const main=module('property-info-template-4');
  const summary=modules.find(x=>/\bsummary details\b/.test(x))||'';
  const surfaceBlock=module('property-info-template-5');
  const legal=module('property-info-template-7');
  const p=text(info.match(/class="title property-title[^"']*"[^>]*>([\s\S]*?)<\/h\d>/i)?.[1]||'').split('\n');
  const titre=text(main.match(/<h[1-6]\b[^>]*class="title[^"']*"[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]||'');
  const description=text(main.match(/<p\b[^>]*class="comment"[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');
  const infoText=text(info);const price=infoText.match(/(\d[\d \t\u00a0\u202f.,]*)[ \t\u00a0\u202f]*€/);
  // Les données structurées doivent appartenir au bien, jamais à l'adresse de l'agence.
  let property:any=null;for(const m of raw.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1]);const nodes=Array.isArray(j)?j:j['@graph']||[j];const listing=nodes.find((x:any)=>x['@type']==='RealEstateListing'&&(String(x.about?.identifier)===id||(()=>{try{return new URL(x.url).pathname===new URL(url).pathname;}catch{return false;}})()));if(listing)property=listing.about;}catch{}}
  const route=url.match(/\/propriete\/(?:vente|location)\+([^+]+)\+([^+]+)/);
  const ville=property?.address?.addressLocality|| (variant19?(property?.address?.addressLocality||text(info.match(/<h1\b[^>]*>[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'')):variant12?(property?.address?.addressLocality||text(info.match(/class="title property-title-12"[^>]*>([\s\S]*?)<\/h\d>/i)?.[1]||'').replace(/^(?:Vente|Location)\s+\S+\s+/i,'')):(p[p.length-1]||''));
  if(!titre||!description||!ville)return null;
  const o:any={reference:id,url,titre,description,ville,transaction:/\/location\+/.test(url)?'location':'vente',type_bien:variant12||variant19||/droit.*bail/i.test(p[1]||'')?(route?decodeURIComponent(route[1]):''):p[1]||'',texte_page:text(summary+' '+legal)};
  if(price)o.prix=num(price[1]); // « Prix sur demande » : conserver la fiche, sans inventer de montant.
  if(property?.address?.postalCode)o.code_postal=String(property.address.postalCode);
  // Le module utilisateur de la fiche désigne son conseiller ; ne pas lire l'équipe du pied de page.
  const advisorModule=module('module-user');
  // Nom et numéro proviennent de la même carte, même si plusieurs conseillers sont affichés.
  const advisor=[...advisorModule.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>m[1]).find(c=>/<h[1-6]\b[^>]*>\s*<a\b[^>]*href="[^\"]*\/(?:equipe|team|agence)\//i.test(c))||'';
  const advisorName=advisor.match(/<h[1-6]\b[^>]*>\s*<a\b[^>]*href="[^\"]*\/(?:equipe|team|agence)\/[^\"]+"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
  const advisorPhone=advisor.match(/class="mobile"[^>]*>[\s\S]*?href="tel:([^\"]+)"/i)?.[1]||advisor.match(/href="tel:([^\"]+)"/i)?.[1];
  if(advisorName)o.contact_nom=text(advisorName).replace(/\s+/g,' ').trim();
  if(advisorPhone)o.contact_telephone=sDecode(advisorPhone).trim();
  const all=text(summary);const area=all.match(/(?:^|\n)Surface\s+(\d+(?:[.,]\d+)?)\s*m²/i)||infoText.match(/(\d+(?:[.,]\d+)?)\s*m²/i);if(area)o[/terrain/i.test(o.type_bien)?'surface_terrain':'surface']=num(area[1]);
  const rooms=(infoText+'\n'+all).match(/(\d+)[ \t]*pi[eè]ces?/i);if(rooms)o.pieces=rooms[1];const bedrooms=(infoText+'\n'+all).match(/(\d+)[ \t]*chambres?/i);if(bedrooms)o.chambres=bedrooms[1];else if((variant12||variant19)&&property?.numberOfBedrooms)o.chambres=String(property.numberOfBedrooms);
  let baths=0;
  for(const m of surfaceBlock.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){const t=text(m[1]);const land=t.match(/^\d+\s*(?:Terrain|Jardin)\s+(\d+(?:[.,]\d+)?)\s*m²/i);if(land&&!o.surface_terrain)o.surface_terrain=num(land[1]);const bath=t.match(/^(\d+)\s+Salle de (?:bains?|douche)/i);if(bath)baths+=Number(bath[1]);}
  if(baths)o.salles_de_bain=String(baths);
  const factKeys:Record<string,string>={'exposition':'exposition','état':'etat_bien','étage':'etage','année de construction':'annee_construction','énergie de chauffage':'chauffage'};
  for(const m of summary.matchAll(/<li\b[^>]*>([^<]+)<span[^>]*>([\s\S]*?)<\/span>/gi)){const key=text(m[1]).toLowerCase(),v=text(m[2]);if(v&&factKeys[key])o[factKeys[key]]=key==='étage'?v.match(/^\d+/)?.[0]||v:v;}
  const charge=text(legal).match(/(?:Provision sur charges r[ée]cup[ée]rables|Charges r[ée]cup[ée]rables)\s*([\d\s.,]+)\s*€\s*\/\s*Mois/i);if(charge)o.charges_mensuelles=num(charge[1]);
  const features=module('property-info-template-6');o.prestations=[...features.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>text(m[1])).join('|');
  o.honoraires=[...legal.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>text(m[1])).filter(x=>/honoraires|charge.*(?:vendeur|acqu[ée]reur|locataire)/i.test(x)).join(' | ');
  const gallery=modules.find(x=>/\bmodule-slider\b/.test(x))||'';o.photos=[...new Set([...gallery.matchAll(/data-image-url="([^"]+)"/gi)].map(m=>sDecode(m[1])).filter(x=>/^https?:\/\//.test(x)))].join('|');
  const diag=modules.find(x=>/energy-diagnostics/.test(x))||'';
  for(const m of diag.matchAll(/data:image\/svg\+xml;base64,([^"']+)/gi)){try{const svg=new TextDecoder().decode(Uint8Array.from(atob(m[1]),c=>c.charCodeAt(0)));const d=apimoDiagnostic(svg);if(d.kind&&d.letter)o[d.kind]=d.letter;if(d.kind==='dpe'&&d.values[0])o.consommation_energie=d.values[0];}catch{}}
  // Mentions textuelles utiles (charges, copropriété, coûts…) ; pas de lecture des biens similaires.
  o.texte_page+='\n'+text(diag.replace(/<img\b[^>]*>/gi,''));return o;
}
export async function readApimoModules(start:URL,home:string,fetchHtml:Fetcher){
  if(/\/propriete\/[^/]+\+\d+\/?$/.test(start.pathname)){const row=parseApimoDetail(home,start.toString());return row?[row]:[];}
  const root=new URL(start.origin);const links=[...home.matchAll(/href="([^"]+)"/gi)].map(m=>{try{return new URL(sDecode(m[1]),start);}catch{return null;}}).filter((u):u is URL=>!!u&&u.hostname===start.hostname);
  const bases=[...new Set(links.filter(u=>/^\/[a-z]{2}\/(?:ventes?|locations?|acheter|louer)\/?$/.test(u.pathname)).map(u=>u.origin+u.pathname))];
  if(!bases.length)throw Error('Listes actives de vente/location Apimo introuvables.');
  const queue=[...bases],seen=new Set<string>(),details=new Map<string,string>();let partial=false,pages=0;
  while(queue.length&&pages<40){const next=queue.shift()!;if(seen.has(next))continue;seen.add(next);let html='';try{html=(await fetchHtml(new URL(next))).text;}catch{partial=true;continue;}pages++;
    const list=html.split(/(?=<div\b[^>]*\bdata-module-id=)/gi).filter(x=>/\bmodule-listing\b/.test(x)).join('');
    if(!list){partial=true;continue;}
    for(const m of list.matchAll(/href="([^"]+)"/gi)){let u:URL;try{u=new URL(sDecode(m[1]),next);}catch{continue;}u.hash='';if(u.hostname!==start.hostname)continue;
      const id=u.pathname.match(/^\/[a-z]{2}\/propriete\/(?:vente|location)\+[^/]+\+(\d+)\/?$/)?.[1];if(id){u.search='';details.set(id,u.toString());}
      else if(bases.some(b=>u.origin+u.pathname===b)&&/^\d+$/.test(u.searchParams.get('page')||'')&&!seen.has(u.toString())&&!queue.includes(u.toString()))queue.push(u.toString());}
  }
  if(queue.length)partial=true;
  const entries=[...details.entries()],rows:any[]=[];let i=0;
  await Promise.all(Array.from({length:3},async()=>{while(i<entries.length){const[id,url]=entries[i++];try{const{text}=await fetchHtml(new URL(url));rows.push(parseApimoDetail(text,url)||{reference:id,url});}catch{rows.push({reference:id,url});partial=true;}}}));
  (rows as any).partial=partial;(rows as any).total=details.size;(rows as any).stats={pages,details:details.size,read:rows.length};return rows;
}
