// 31/10/2026 — Claude : sites de garages faits par Auto-Gestion (<garage>.auto-gestion.net, Drupal multisite « agc.accommodata.fr »),
// ex. les agences Transakauto (transakautolyon8.auto-gestion.net). Tous identiques :
//  - liste : /vehicles?page=0,1,2… (12 par page, liens /vehicle/<id>, guillemets simples) ;
//  - fiche : <h1> titre, tableau <th scope="row">Libellé</th><td>valeur</td> (Constructeur, Modèle, Finition, Energie,
//    Transmission, Kilométrage, Année, Mise en circulation, Chevaux Fiscaux, Puissance du moteur, Couleur, Sièges, Garantie…),
//    équipements (field-veh-equipment), prix (.price), « Réf. : », Crit'Air (image critair/N.png), galerie /photos/… (848x565).
// Ville : titre du site (« … LYON 69008 »). Rien n'est deviné.
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

export const isAutoGestionSite=(html:string,url?:URL)=>(!!url&&/\.auto-gestion\.net$/i.test(url.hostname))||/\/sites\/agc\.accommodata\.fr\//i.test(html);
const clean=(s:any)=>sDecode(String(s??'').replace(/<br\s*\/?>\s*/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\r ]+/g,' ').replace(/ *\n */g,'\n').trim();
const cityCase=(s:string)=>s.trim().toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu,(_m,a,b)=>a+b.toUpperCase()).replace(/-(De|Du|Des|La|Le|Les|Sur|Sous|En)-/g,(m)=>m.toLowerCase());

export function parseAutoGestionVehicle(html:string,url:string){
  const id=(url.match(/\/vehicle\/(\d+)/)||[])[1];if(!id)return null;
  if(/class="[^"]*\b(?:vendu|sold|reserve)\b/i.test(html)&&!/class="price"/i.test(html))return null;
  const f=new Map<string,string>();
  for(const m of html.matchAll(/<th scope="row">\s*([\s\S]*?)\s*<\/th>\s*<td>\s*([\s\S]*?)\s*<\/td>/gi)){const k=clean(m[1]).toLowerCase(),v=clean(m[2]);if(k&&v&&!f.has(k))f.set(k,v);}
  const g=(...k:string[])=>{for(const x of k){const v=f.get(x.toLowerCase());if(v)return v;}return '';};
  const title=clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');
  const titleMain=title.split(/\s*\|\s*/)[0].trim(),extras=title.split(/\s*\|\s*/).slice(1).filter(Boolean);
  const price=clean((html.match(/<span class="price">\s*([\s\S]*?)\s*<\/span>/i)||[])[1]||'').replace(/[^\d]/g,'');
  const ref=clean((html.match(/R[ée]f\.\s*:\s*([^<]+)/i)||[])[1]||'');
  const eqZone=(html.split(/field-name-field-veh-equipment/i)[1]||'').split(/<\/section>|class="field field-name-(?!field-veh-equipment)/i)[0];
  const eq=[...eqZone.matchAll(/<div class="field-item[^"]*">([\s\S]*?)<\/div>/gi)].map(m=>clean(m[1])).filter(Boolean);
  // Galerie en 848x565 (les miniatures ont d'autres tailles), dans l'ordre, sans doublon.
  const photos=[...new Set([...html.matchAll(/(https?:\/\/[^"'\s]+\/files\/styles\/848x565\/public\/photos\/[^"'\s?]+)/gi)].map(m=>m[1]))];
  const energy=g('Energie','Énergie');
  const fuel=/courant.*(essence|diesel)|(essence|diesel).*courant/i.test(energy)?'Hybride':/courant|lectri/i.test(energy)?'Électrique':/diesel|gazole/i.test(energy)?'Diesel':/ethanol/i.test(energy)?'Bioéthanol':/gaz|gpl/i.test(energy)?'GPL':/essence/i.test(energy)?'Essence':energy;
  const box=g('Transmission');
  const marque=g('Constructeur','Marque'),modele=g('Modèle','Modele'),finition=g('Finition');
  return {reference:ref||id,url,titre:titleMain||[marque,modele,finition].filter(Boolean).join(' '),marque,modele,version:finition,
    prix:price,annee:g('Année','Annee'),mise_en_circulation:g('Mise en circulation'),kilometrage:g('Kilométrage','Kilometrage').replace(/[^\d]/g,''),
    carburant:fuel,boite:/auto|s[ée]quent|continu/i.test(box)?'Automatique':/manu/i.test(box)?'Manuelle':box,
    puissance_fiscale:g('Chevaux Fiscaux','Puissance fiscale').replace(/[^\d]/g,''),puissance_din:g('Puissance du moteur','Puissance DIN').replace(/[^\d]/g,''),
    couleur:g('Couleur'),places:g('Sièges','Places').replace(/[^\d]/g,''),portes:g('Portes','Nombre de portes').replace(/[^\d]/g,''),garantie:g('Garantie'),
    crit_air:(html.match(/critair\/(\d)\.png/i)||[])[1]||'',type:'voiture',etat:'occasion',equipements:eq.join('|'),
    description:[extras.join(' · '),eq.length?'Équipements :\n- '+eq.join('\n- '):''].filter(Boolean).join('\n\n'),photos:photos.join('|')};
}

export async function readAutoGestionSite(origin:URL,homeHtml:string,fetchHtml:Fetcher){
  const t=clean((homeHtml.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||'');
  const loc=t.match(/([A-ZÉÈÀÂÎ][A-ZÉÈÀÂÎ' -]{1,40}?)\s+(\d{5})\b/);
  const links:string[]=[];
  for(let page=0;page<40;page++){
    const u=new URL('/vehicles',origin);if(page)u.searchParams.set('page',String(page));
    const{text}=await fetchHtml(u);
    const found=[...new Set([...text.matchAll(/href=['"](https?:\/\/[^'"]+\/vehicle\/\d+|\/vehicle\/\d+)['"]/gi)].map(m=>new URL(m[1],origin).toString()))];
    const fresh=found.filter(l=>!links.includes(l));links.push(...fresh);
    if(!fresh.length||!new RegExp(`[?&]page=${page+1}\\b`).test(text))break;
  }
  if(!links.length)throw Error('Aucun véhicule sur la page /vehicles (Auto-Gestion).');
  const rows:any[]=[];let failed=0;
  for(let i=0;i<links.length;i+=5){
    await Promise.all(links.slice(i,i+5).map(async l=>{
      try{const{text}=await fetchHtml(new URL(l));const r=parseAutoGestionVehicle(text,l);if(r){if(loc){r.ville=cityCase(loc[1].replace(/\s+\d+$/,''));r.code_postal=loc[2];}rows.push(r);}}catch{failed++;}
    }));
  }
  if(failed)(rows as any).partial=true;
  rows.sort((a,b)=>links.indexOf(a.url)-links.indexOf(b.url));
  if(loc)(rows as any).siteLocation={city:cityCase(loc[1].replace(/\s+\d+$/,'')),postal:loc[2]};
  return rows;
}
