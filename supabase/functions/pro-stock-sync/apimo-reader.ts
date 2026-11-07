// Sites Apimo à modules HTML : listes actives uniquement, informations propres à la fiche.
import { eachDetailResumable, type CrawlMemory } from './resumable-crawl.ts';
import { sDecode } from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const text=(s:string)=>sDecode(s.replace(/<br\s*\/?>|<\/(?:p|li|div|h[1-6])>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const num=(s:string)=>s.replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
export const isApimoModules=(html:string)=>/apimo\.net\/[^"']*site-internet/i.test(html)&&/data-model-namespace=/i.test(html)&&/href="(?:https?:\/\/[^/]+)?\/[a-z]{2}\/(?:ventes?|locations?|acheter|louer|nos-biens|nos-proprietes)\/?"/i.test(html);
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
  const info=module('property-info-template-2')||module('property-info-template-12')||module('property-info-template-19')||module('property-info-template-41');
  const variant12=/class="[^"]*\bproperty-info-template-12\b/.test(info);
  const variant19=/class="[^"]*\bproperty-info-template-19\b/.test(info);
  const main=module('property-info-template-4')||module('property-info-template-42');
  const variant41=/class="[^"]*\bproperty-info-template-41\b/.test(info);
  const summary=modules.find(x=>/\bsummary details\b/.test(x))||'';
  const surfaceBlock=module('property-info-template-5');
  const legal=module('property-info-template-7')||module('property-info-template-38');
  const p=text(info.match(/class="title property-title[^"']*"[^>]*>([\s\S]*?)<\/h\d>/i)?.[1]||'').split('\n');
  const titre=text(main.match(/<h[1-6]\b[^>]*class="title[^"']*"[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]||'');
  const description=text(main.match(/<p\b[^>]*class="comment"[^>]*>([\s\S]*?)<\/p>/i)?.[1]||(variant41?main.match(/<p\b[^>]*class="description"[^>]*>([\s\S]*?)<\/p>/i)?.[1]:'')||'');
  const infoText=text(info);const price=(variant41?text(main):infoText).match(/(\d[\d \t\u00a0\u202f.,]*)[ \t\u00a0\u202f]*€/);
  // Les données structurées doivent appartenir au bien, jamais à l'adresse de l'agence.
  let property:any=null;for(const m of raw.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1]);const nodes=Array.isArray(j)?j:j['@graph']||[j];const listing=nodes.find((x:any)=>x['@type']==='RealEstateListing'&&(String(x.about?.identifier)===id||(()=>{try{return new URL(x.url).pathname===new URL(url).pathname;}catch{return false;}})()));if(listing)property=listing.about;}catch{}}
  const route=url.match(/\/propriete\/(?:vente|location)\+([^+]+)\+([^+]+)/);
  const ville=property?.address?.addressLocality|| (variant41?text(main.match(/<h2\b[^>]*class="city"[^>]*>([\s\S]*?)<\/h2>/i)?.[1]||''):variant19?(property?.address?.addressLocality||text(info.match(/<h1\b[^>]*>[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'')):variant12?(property?.address?.addressLocality||text(info.match(/class="title property-title-12"[^>]*>([\s\S]*?)<\/h\d>/i)?.[1]||'').replace(/^(?:Vente|Location)\s+\S+\s+/i,'')):(p[p.length-1]||''));
  if(!titre||!description||!ville)return null;
  const o:any={reference:id,url,titre,description,ville,transaction:/\/location\+/.test(url)?'location':'vente',type_bien:p[1]&&/^(?:appartement|maison|villa|terrain|immeuble|parking|garage|bureau|local|commerce|studio|loft|château|propriété|hôtel)\b/i.test(p[1])?p[1]:route?decodeURIComponent(route[1]):'',texte_page:text(summary+' '+legal)};
  if(price)o.prix=num(price[1]); // « Prix sur demande » : conserver la fiche, sans inventer de montant.
  if(property?.address?.postalCode)o.code_postal=String(property.address.postalCode);
  // Le module utilisateur de la fiche désigne son conseiller ; ne pas lire l'équipe du pied de page.
  const advisorModule=module('module-user');
  // Nom et numéro proviennent de la même carte, même si plusieurs conseillers sont affichés.
  const advisor=[...advisorModule.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>m[1]).find(c=>/<h[1-6]\b[^>]*>\s*<a\b[^>]*href="[^\"]*\/(?:equipe|team|agence)\//i.test(c))||'';
  const advisorName=advisor.match(/<h[1-6]\b[^>]*>\s*<a\b[^>]*href="[^\"]*\/(?:equipe|team|agence)\/[^\"]+"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
  const advisorPhone=advisor.match(/class="mobile"[^>]*>[\s\S]*?href="tel:([^\"]+)"/i)?.[1]||advisor.match(/href="tel:([^\"]+)"/i)?.[1];
  if(advisorName)o.contact_nom=text(advisorName).replace(/\s+/g,' ').trim();
  if(!advisorName&&/\buser-template-5\b/.test(advisorModule)){const name=advisorModule.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1];if(name)o.contact_nom=text(name).replace(/\s+/g,' ').trim();}
  if(advisorPhone)o.contact_telephone=sDecode(advisorPhone).trim();
  // 07/11/2026 (Anthony, Sophie Folley : un agent différent par bien) : carte conseiller sans lien vers une page « équipe »
  // (<h3>Prénom NOM <em>Agent Commercial</em></h3> + portable). Uniquement s'il n'y a qu'UNE carte dans le module de la fiche.
  if(!o.contact_nom){const cards=[...advisorModule.matchAll(/<li\b[^>]*>((?:(?!<\/li>)[\s\S])*)<\/li>/gi)].map(m=>m[1]).filter(c=>/<h3\b/i.test(c));
    if(cards.length===1){const c=cards[0];const name=text((c.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]||'').replace(/<em\b[\s\S]*?<\/em>/gi,'')).replace(/\s+/g,' ').trim();
      const tel=c.match(/class="mobile"[\s\S]*?href="tel:([^"]+)"/i)?.[1]||c.match(/href="tel:([^"]+)"/i)?.[1];
      if(name&&name.length<60){o.contact_nom=name;if(tel&&!o.contact_telephone)o.contact_telephone=sDecode(tel).trim();}}}
  const all=text(summary);
  // 01/11/2026 (Anthony, Croisette : 1490 m² de terrain affichés comme surface habitable, appartements sans surface) :
  // 1) « Surface / Surface habitable / totale / Superficie / Carrez » du sommaire ; 2) floorSize des données structurées de la fiche ;
  // 3) en dernier, un « … m² » du bandeau qui n'est PAS sur une ligne terrain / jardin / terrasse / balcon / parcelle / cave / garage.
  const areaM=all.match(/(?:^|\n)(?:Surface(?:\s+(?:habitable|totale|utile|privative))?|Superficie(?:\s+(?:habitable|totale))?|Surface\s+(?:loi\s+)?Carrez)\s*:?\s*(\d[\d \u00a0\u202f]*(?:[.,]\d+)?)\s*m²/i);
  let areaV=areaM?num(areaM[1]):'';
  if(!areaV&&Number(property?.floorSize?.value)>0)areaV=String(Number(property.floorSize.value));
  if(!areaV){const line=infoText.split('\n').find(l=>/\d\s*m²/.test(l)&&!/terrain|jardin|terrasse|balcon|parcelle|cave|garage|parking/i.test(l));const m=line?.match(/(\d[\d \u00a0\u202f]*(?:[.,]\d+)?)\s*m²/);if(m)areaV=num(m[1]);}
  if(areaV)o[/terrain/i.test(o.type_bien)?'surface_terrain':'surface']=areaV;
  const rooms=infoText.match(/(\d+)\s*pi[eè]ces?/i)||all.match(/(\d+)[ \t]*pi[eè]ces?/i);if(rooms)o.pieces=rooms[1];const bedrooms=infoText.match(/(\d+)\s*chambres?/i)||all.match(/(\d+)[ \t]*chambres?/i);if(bedrooms)o.chambres=bedrooms[1];else if((variant12||variant19)&&property?.numberOfBedrooms)o.chambres=String(property.numberOfBedrooms);
  let baths=0;
  for(const m of surfaceBlock.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){const t=text(m[1]);const land=t.match(/^\d+\s*(?:Terrain|Jardin)\s+(\d+(?:[.,]\d+)?)\s*m²/i);if(land&&!o.surface_terrain)o.surface_terrain=num(land[1]);const bath=t.match(/^(\d+)\s+Salle de (?:bains?|douche)/i);if(bath)baths+=Number(bath[1]);}
  if(baths)o.salles_de_bain=String(baths);
  if(variant41)for(const [cls,field] of [['room','pieces'],['bedroom','chambres'],['bathroom','salles_de_bain'],['area',/terrain/i.test(o.type_bien)?'surface_terrain':'surface']]){const value=info.match(new RegExp('<li\\b[^>]*class="'+cls+'"[^>]*>[\\s\\S]*?<span[^>]*>([\\d.,]+)</span>','i'))?.[1];if(value)o[field]=num(value);}
  const factKeys:Record<string,string>={'exposition':'exposition','état':'etat_bien','étage':'etage','année de construction':'annee_construction','énergie de chauffage':'chauffage'};
  for(const m of summary.matchAll(/<li\b[^>]*>([^<]+)<span[^>]*>([\s\S]*?)<\/span>/gi)){const key=text(m[1]).toLowerCase(),v=text(m[2]);if(v&&factKeys[key])o[factKeys[key]]=key==='étage'?v.match(/^\d+/)?.[0]||v:v;}
  const charge=text(legal).match(/(?:Provision sur charges r[ée]cup[ée]rables|Charges r[ée]cup[ée]rables)\s*([\d\s.,]+)\s*€\s*\/\s*Mois/i);if(charge)o.charges_mensuelles=num(charge[1]);
  const features=module('property-info-template-6');o.prestations=[...features.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>text(m[1])).join('|');
  o.honoraires=[...legal.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>text(m[1])).filter(x=>/honoraires|charge.*(?:vendeur|acqu[ée]reur|locataire)/i.test(x)).join(' | ');
  const gallery=modules.find(x=>/\bmodule-slider\b/.test(x))||'';const galleryAnchors=[...gallery.matchAll(/<a\b([^>]+)>/gi)].filter(m=>/class="[^"]*\bclick-fullscreen\b/.test(m[1])).map(m=>m[1].match(/href="([^"]+)"/i)?.[1]).filter((x):x is string=>!!x);o.photos=[...new Set(([...gallery.matchAll(/data-image-url="([^"]+)"/gi)].map(m=>m[1]).length?[...gallery.matchAll(/data-image-url="([^"]+)"/gi)].map(m=>m[1]):galleryAnchors).map(x=>sDecode(x)).filter(x=>/^https?:\/\//.test(x)))].join('|');
  const diag=modules.find(x=>/energy-diagnostics/.test(x))||'';
  for(const m of diag.matchAll(/data:image\/svg\+xml;base64,([^"']+)/gi)){try{const svg=new TextDecoder().decode(Uint8Array.from(atob(m[1]),c=>c.charCodeAt(0)));const d=apimoDiagnostic(svg);if(d.kind&&d.letter)o[d.kind]=d.letter;if(d.kind==='dpe'&&d.values[0])o.consommation_energie=d.values[0];}catch{}}
  // Certaines fiches Apimo publient le couple énergie / climat sur une ligne « DPE D ET C »
  // ou « DPE D (240) et D (45) », même quand le graphique climat est vide.
  // Lire uniquement cette notation complète dans la description propre au bien ; jamais
  // une plage A à G, plusieurs logements, les suggestions ou un second caractère isolé.
  const diagnosticPair=description.split('\n').map(line=>line.trim()).map(line=>line.match(/^DPE\s*:?\s*([A-G])(?:\s*\(\s*([0-9]{1,4}(?:[.,][0-9]+)?)\s*\))?\s*(?:\/|[eE][tT])\s*([A-G])(?:\s*\(\s*[0-9]{1,3}(?:[.,][0-9]+)?\s*\))?\s*[.;]?$/)).find(Boolean);
  if(diagnosticPair){if(!o.dpe)o.dpe=diagnosticPair[1];if(!o.ges)o.ges=diagnosticPair[3];if(!o.consommation_energie&&diagnosticPair[2])o.consommation_energie=num(diagnosticPair[2]);}
  // Mentions textuelles utiles (charges, copropriété, coûts…) ; pas de lecture des biens similaires.
  o.texte_page+='\n'+text(diag.replace(/<img\b[^>]*>/gi,''));
  // 07/11/2026 (Anthony, Sophie Folley) : « Surfaces » pièce par pièce et « Proximités » de la fiche, recopiées telles quelles
  // à la fin de la description (rien d'inventé : seulement les lignes « libellé + valeur » publiées par l'agence).
  const sectionLines=(block:string)=>[...block.matchAll(/<li\b[^>]*>((?:(?!<\/li>)[\s\S])*?)<span[^>]*>((?:(?!<\/li>)[\s\S])*?)<\/span>\s*<\/li>/gi)].map(m=>[text(m[1]).replace(/\s+/g,' ').trim(),text(m[2]).replace(/\s+/g,' ').trim()]).filter(([l,v])=>l&&v&&l.length<60&&v.length<40);
  const roomLines=sectionLines(surfaceBlock).map(([l,v])=>'• '+l.replace(/^1\s+/,'')+' : '+v);
  const nearLines=sectionLines(module('property-info-template-8')).map(([l,v])=>'• '+l+' : '+v);
  const sectionExtra=[roomLines.length?'Surfaces :\n'+roomLines.join('\n'):'',nearLines.length?'Proximités :\n'+nearLines.join('\n'):''].filter(Boolean).join('\n\n');
  if(sectionExtra&&!o.description.includes(sectionExtra))o.description=o.description.trim()+'\n\n'+sectionExtra;
  return o;
}
export async function readApimoModules(start:URL,home:string,fetchHtml:Fetcher,memory?:CrawlMemory,fallback?:(html:string,url:string)=>any){
  if(/\/propriete\/[^/]+\+\d+\/?$/.test(start.pathname)){const row=parseApimoDetail(home,start.toString());return row?[row]:[];}
  const root=new URL(start.origin);const links=[...home.matchAll(/href="([^"]+)"/gi)].map(m=>{try{return new URL(sDecode(m[1]),start);}catch{return null;}}).filter((u):u is URL=>!!u&&u.hostname===start.hostname);
  // 01/11/2026 (Anthony, Solution Immobilier : « manque les biens à vendre ») : certaines agences appellent la liste des ventes « nos-biens » / « nos-proprietes ».
  const bases=[...new Set(links.filter(u=>/^\/[a-z]{2}\/(?:ventes?|locations?|acheter|louer|nos-biens|nos-proprietes|biens|proprietes|annonces)\/?$/.test(u.pathname)).map(u=>u.origin+u.pathname))];
  if(!bases.length&&!links.some(u=>{let p=u.pathname;try{p=decodeURIComponent(p);}catch{}return /^\/[a-z]{2}\/propri[ée]t[ée]\//.test(p);}))throw Error('Listes actives de vente/location Apimo introuvables.');
  const queue=[...bases],seen=new Set<string>(),details=new Map<string,string>();let partial=false,pages=0;
  while(queue.length&&pages<40){const next=queue.shift()!;if(seen.has(next))continue;seen.add(next);let html='';try{html=(await fetchHtml(new URL(next))).text;}catch{partial=true;continue;}pages++;
    let list=html.split(/(?=<div\b[^>]*\bdata-module-id=)/gi).filter(x=>/\bmodule-listing\b/.test(x)).join('');
    /* 02/11/2026 (Dana, Gambetta) : liste sans module « listing » reconnu → liens de toute la page (les pages « vendus » ne sont pas dans les listes suivies) */if(!list)list=html;
    for(const m of list.matchAll(/href="([^"]+)"/gi)){let u:URL;try{u=new URL(sDecode(m[1]),next);}catch{continue;}u.hash='';if(u.hostname!==start.hostname)continue;
      let pth=u.pathname;try{pth=decodeURIComponent(pth);}catch{}/* 02/11/2026 (Gambetta « /fr/propriété/86167598 ») : adresse de fiche sans « vente+… », avec accents */const id=pth.match(/^\/[a-z]{2}\/propri[ée]t[ée]\/(?:(?:vente|location)\+[^/]+\+)?(\d{5,})\/?$/)?.[1];if(id){u.search='';details.set(id,u.toString());}
      else if(bases.some(b=>u.origin+u.pathname===b)&&/^\d+$/.test(u.searchParams.get('page')||'')&&!seen.has(u.toString())&&!queue.includes(u.toString()))queue.push(u.toString());}
  }
  if(queue.length)partial=true;
  /* 02/11/2026 (Dana Immobilier : pas de page « ventes », les biens à vendre sont sur l'accueil) : fiches liées depuis la page de départ aussi */
  for(const u of links){let pth=u.pathname;try{pth=decodeURIComponent(pth);}catch{}const id=pth.match(/^\/[a-z]{2}\/propri[ée]t[ée]\/(?:(?:vente|location)\+[^/]+\+)?(\d{5,})\/?$/)?.[1];if(id&&!details.has(id)){const c=new URL(u.toString());c.search='';c.hash='';details.set(id,c.toString());}}
  const entries=[...details.entries()];const ids=new Map(entries.map(([id,u])=>[String(u),id]));
  // 01/11/2026 : lecture des fiches par étapes mémorisée.
  const rows:any=await eachDetailResumable('apimo-v1:'+start.hostname,entries.map(e=>String(e[1])),async url=>{const{text}=await fetchHtml(new URL(url));/* 02/11/2026 (duo-immo : modèle de fiche Apimo inconnu → fiches vides « Appartement · Martigues ») : lecture des données structurées de la fiche à la place */let row=parseApimoDetail(text,url);if(!row&&fallback){const f=fallback(text,url);if(f?.titre&&f?.prix){row={...f,url,reference:ids.get(url)||f.reference};for(const m of text.matchAll(/data:image\/svg\+xml;base64,([^"')]+)/gi)){try{const svg=new TextDecoder().decode(Uint8Array.from(atob(m[1]),c=>c.charCodeAt(0)));const d=apimoDiagnostic(svg);if(d.kind&&d.letter&&!row[d.kind])row[d.kind]=d.letter;if(d.kind==='dpe'&&d.values[0]&&!row.consommation_energie)row.consommation_energie=d.values[0];}catch{}}}}if(!row)partial=true;return row||{reference:ids.get(url),url};},memory);partial=partial||rows.partial;
  (rows as any).partial=partial;(rows as any).total=details.size;(rows as any).stats={pages,details:details.size,read:rows.length};return rows;
}
