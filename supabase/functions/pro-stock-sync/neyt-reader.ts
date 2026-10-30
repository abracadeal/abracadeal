// Selection-Immo / Wappler: use the public data and the actual gallery template.
import {sDecode} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(v:any)=>sDecode(String(v??'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ')).trim();
export function neytGalleryTemplates(html:string){
 const result:{flag:string,template:string}[]=[];
 for(const m of html.matchAll(/<div\b[^>]*dmx-class:carousel-item=["'][^"']*\.(NumPhoto\d*)>0["'][^>]*>([\s\S]*?)<\/div>/gi)){const template=m[2].match(/dmx-bind:src=["']([^"']+)["']/)?.[1];if(template)result.push({flag:m[1],template:sDecode(template)});}
 if(!result.length)throw Error('Galerie Selection-Immo absente du modèle.');return result;
}
export function mapNeyt(v:any,agency:any,start:URL,templates:{flag:string,template:string}[]){
 if(!/^\d+$/.test(String(v.Code))||v.CodeAgence!=='neyt')throw Error('Périmètre Neyt invalide.');
 const photos=[];for(const {flag,template} of templates)if(Number(v[flag])>0){const url=template.replace(/\{\{[^}]*\.(CodeAgence|Code)\}\}/g,(_,k)=>String(v[k]));if(!url.includes('{{')&&/^https:\/\/www\.selection-immo\.com\/Photos\/neyt\/Photos\//.test(url))photos.push(url);}
 const features=[];for(const [key,label] of [['Jardin','Jardin'],['Balcon','Balcon'],['Terrasse','Terrasse'],['Cave','Cave'],['Ascenseur','Ascenseur'],['Garage','Garage'],['Parking','Parking'],['SousSol','Sous-sol'],['Cheminee','Cheminée'],['Piscine','Piscine']])if(Number(v[key])!==0&&Number.isFinite(Number(v[key])))features.push(label);
 const location=/location/i.test(v.TypeTransaction||'');const url=new URL('/ficheaffaire.php',start);url.searchParams.set('code',String(v.Code));url.searchParams.set('ref',String(v.RefAnnonce||v.NMandat||v.Code));
 return {reference:String(v.Code),url:url.toString(),titre:clean(v.CritC2)||[v.TypeAffaire,v.BienVille].filter(Boolean).join(' '),prix:v.PrixMandatEuro,type_bien:v.TypeAffaire,transaction:location?'location':'vente',ville:clean(v.BienVille),code_postal:v.BienCP,description:clean(v.TextePub),photos:dedupePhotos(photos).join('|'),surface:v.SurfHab||'',surface_terrain:v.SurfTerrain||'',pieces:v.NbPieces||'',chambres:v.NbChambres||'',etage:Number(v.Etage)>=0?v.Etage:'',nombre_etages:v.Niveaux||'',annee_construction:v.AnneeConstr||'',salles_de_bain:v.NbSdb||'',chauffage:v.Chauffage,exposition:v.Orientation,dpe:/^[A-G]$/.test(v.DPELettre)?v.DPELettre:'',ges:/^[A-G]$/.test(v.GESLettre)?v.GESLettre:'',consommation_energie:v.DPEValeur||'',emission_ges:v.GESValeur||'',taxe_fonciere:v.TaxeFonc||'',copropriete:Number(v.CoproOk)!==0?'Oui':'',charges_annuelles:v.CoproCharges||'',nombre_lots:v.CoproNbLots||'',procedure:v.CoproProcedureDetail||'',honoraires:v.HonorairesPour?`À la charge du ${clean(v.HonorairesPour).toLowerCase()}`:'',meuble:v.Meuble||'',mandat:v.RefAnnonce||v.NMandat,prestations:features.join('|'),contact_nom:clean(v.NomCommercial)||agency.NomAgence,contact_telephone:clean(v.TelCommercial)||agency.Tel};
}
export async function readNeyt(start:URL,fetchHtml:Fetcher){
 const format=async(path:string)=>JSON.parse((await fetchHtml(new URL(path,start))).text);
 const data=await format('/dmxConnect/api/listeaffaires.php?codeagence=neyt');const agencyData=await format('/dmxConnect/api/agence.php?codeagence=neyt');const agency=agencyData.agence;
 if(agency?.codeagence!=='neyt'||!Array.isArray(data.selectionaffaires))throw Error('Catalogue Neyt invalide.');
 let active=data.selectionaffaires;const expected=Number(String(agency.RepPhotos||'').match(/^(\d+) Biens/)?.[1]);
 const catalogueCount=active.length;const single=start.searchParams.get('code');const tr=start.searchParams.get('typetransaction');
 if(start.pathname.endsWith('/ficheaffaire.php')){if(!single||!/^\d+$/.test(single))throw Error('Fiche Neyt invalide.');active=active.filter((x:any)=>String(x.Code)===single);}
 else if(tr){if(!['VENTE','LOCATION'].includes(tr.toUpperCase()))throw Error('Filtre Neyt non reconnu.');active=active.filter((x:any)=>tr.toUpperCase()==='LOCATION'?/location/i.test(x.TypeTransaction):/vente/i.test(x.TypeTransaction));}
 if(!active.length)throw Error('Aucun bien actif Neyt trouvé dans ce périmètre.');
 const first=active[0],detail=new URL('/ficheaffaire.php',start);detail.searchParams.set('code',String(first.Code));detail.searchParams.set('ref',String(first.RefAnnonce||''));
 const templates=neytGalleryTemplates((await fetchHtml(detail)).text);const rows:any[]=active.map((v:any)=>mapNeyt(v,agency,start,templates));
 (rows as any).partial=Number.isFinite(expected)&&expected!==catalogueCount;(rows as any).total=active.length;(rows as any).stats={pages:3,details:active.length,read:rows.length,catalogue:catalogueCount};return rows;
}
