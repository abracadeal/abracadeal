import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { readSmartSite, sDecode } from "./smart-reader.ts";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-abracadeal-key, x-cron-token"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const norm=(s:unknown)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha256=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const first=(o:any,names:string[])=>{for(const n of names){const k=norm(n);if(o[k]!=null&&String(o[k]).trim()!=='')return String(o[k]).trim();for(const [ok,ov] of Object.entries(o)){if(ok.endsWith('_'+k)&&ov!=null&&String(ov).trim()!=='')return String(ov).trim();}}return '';};
const num=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v).replace(/[\s\u00a0\u202f€]/g,'').replace(/[^0-9,.-]/g,'');if(!s)return null;if(/^-?\d{1,3}([.,]\d{3})+$/.test(s))s=s.replace(/[.,]/g,'');else if(s.includes(',')&&s.includes('.')){const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');const dec=lc>ld?',':'.';const thou=dec===','?'.':',';s=s.split(thou).join('').replace(dec,'.');}else if(s.includes(',')){const p=s.split(',');s=(p.length===2&&p[1].length<=2)?p[0]+'.'+p[1]:p.join('');}else if(s.includes('.')){const p=s.split('.');if(p.length>2||(p.length===2&&p[1].length===3))s=p.join('');}const n=Number(s);return Number.isFinite(n)?n:null;};
const bool=(v:unknown,def=true)=>{const t=norm(v);if(!t)return def;if(['non','no','false','0','masque','masquer'].includes(t))return false;if(['oui','yes','true','1','affiche','afficher'].includes(t))return true;return def;};

function flatten(obj:any,prefix='',out:any={}){if(obj==null)return out;if(Array.isArray(obj)){if(obj.every(v=>v==null||['string','number','boolean'].includes(typeof v)))out[prefix]=obj.join('|');else obj.forEach((v,i)=>flatten(v,`${prefix}${prefix?'_':''}${i+1}`,out));return out;}if(typeof obj==='object'){for(const [k,v] of Object.entries(obj))flatten(v,prefix?`${prefix}_${norm(k)}`:norm(k),out);return out;}out[prefix]=obj;return out;}
function parseCsv(text:string){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];const delim=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';const parse=(line:string)=>{const out:string[]=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===delim&&!q){out.push(cur);cur='';}else cur+=c;}out.push(cur);return out;};const headers=parse(lines[0]).map(norm);return lines.slice(1).map(l=>{const vals=parse(l);const o:any={};headers.forEach((h,i)=>o[h]=vals[i]??'');return o;});}
function xmlVal(block:string,tag:string){const esc=tag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=block.match(new RegExp(`<${esc}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${esc}>`,'i'));return m?m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'').trim():'';}
const XML_ALIASES=['reference','ref','reference_stock','stock_id','id','identifiant','vehicle_id','reference_mandat','mandat','mandate','property_id','bien_id','titre','title','nom','designation','libelle','name','prix','price','prix_eur','prix_vente','loyer','rent','tarif','sale_price','ville','city','commune','localite','location_city','code_postal','cp','postal_code','zipcode','zip','description','desc','details','commentaire','comments','texte_annonce','type','sous_categorie','type_vehicule','categorie','category','vehicle_type','body_type','type_bien','property_type','bien','transaction','type_transaction','vente_location','operation','deal_type','etat','condition','vehicle_condition','marque','make','brand','manufacturer','modele','model','model_name','annee','year','millesime','kilometrage','km','mileage','odometer','carburant','fuel','energie','energy','boite','boite_vitesse','transmission','gearbox','crit_air','critair','carrosserie','portes','nombre_portes','places','nombre_places','permis','finition','version','mise_en_circulation','couleur','sellerie','puissance_fiscale','puissance_din','co2','historique','controle_technique','entretien','garantie','equipements','equipment','options','features','extras','prestations','amenities','services','surface','surface_habitable','living_area','area','surface_utile','surface_terrain','terrain','land_area','plot_area','pieces','nb_pieces','nombre_pieces','rooms','room_count','chambres','nb_chambres','nombre_chambres','bedrooms','bedroom_count','salles_de_bain','salle_de_bain','salles_eau','bathrooms','bathroom_count','etage','floor','floor_number','nombre_etages','nb_etages','total_floors','building_floors','meuble','meublee','furnished','annee_construction','construction_year','year_built','etat_bien','property_condition','chauffage','heating','heating_type','exposition','orientation','exposure','quartier','secteur','neighborhood','district','dpe','classe_energie','energy_class','energy_rating','ges','classe_ges','climate_class','ges_class','consommation_energie','conso_energie','energy_consumption','kwh_m2_an','date_dpe','dpe_date','diagnostic_date','cout_energie_min','depenses_energie_min','energy_cost_min','cout_energie_max','depenses_energie_max','energy_cost_max','copropriete','coownership','condominium','nombre_lots','nb_lots','lots','lot_count','charges_annuelles','annual_charges','copro_charges','taxe_fonciere','property_tax','land_tax','honoraires','frais_agence','agency_fees','fees','charges_mensuelles','charges_location','monthly_charges','rent_charges','depot_garantie','caution','deposit','security_deposit','disponible_le','date_disponibilite','available_date','availability_date','afficher_numero','telephone_visible','show_phone','url','external_url','listing_url'];
function parseXml(text:string,skipRss=false){if(!skipRss&&isRss(text))return parseRss(text);const tags=['vehicle','vehicule','car','property','bien','realestate','listing','annonce','ad','item','stockitem','moto'];let blocks:string[]=[];for(const t of tags){blocks=[...text.matchAll(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`,'gi'))].map(m=>m[1]);if(blocks.length)break;}if(!blocks.length)return[];const aliases=[...XML_ALIASES];for(let i=1;i<=45;i++)aliases.push(`photo_${i}`,`photo${i}`,`image_${i}`,`image${i}`,`picture_${i}`,`picture${i}`);return blocks.map(b=>{const o:any={};for(const a of aliases){const v=xmlVal(b,a);if(v)o[norm(a)]=v;}const urls:string[]=[];for(const m of b.matchAll(/<(?:photo|image|picture)(?:\s([^>]*))?(?:>([\s\S]*?)<\/(?:photo|image|picture)>|\s*\/>)/gi)){const attrs=m[1]||'';const u=attrs.match(/(?:url|src|href)=["']([^"']+)["']/i)?.[1]||String(m[2]||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'').trim();if(/^https?:\/\//i.test(u))urls.push(u.replace(/&amp;/g,'&'));}if(urls.length)o.photos=urls.join('|');return o;});}
// Flux RSS des sites de garages (ex. sites « Annonces Automobile ») : prix dans le titre, caractéristiques
// en texte libre dans la description, photo dans le HTML. On complète les champs absents sans écraser
// les champs structurés éventuellement présents.
const HTML_NAMED:Record<string,string>={eacute:'é',egrave:'è',ecirc:'ê',euml:'ë',agrave:'à',acirc:'â',auml:'ä',ccedil:'ç',ocirc:'ô',ouml:'ö',ucirc:'û',ugrave:'ù',uuml:'ü',icirc:'î',iuml:'ï',Eacute:'É',Egrave:'È',Agrave:'À',Ccedil:'Ç',oelig:'œ',OElig:'Œ',euro:'€',deg:'°',laquo:'«',raquo:'»',rsquo:'’',lsquo:'‘',hellip:'…',ndash:'–',mdash:'—',sup2:'²'};
const decodeEntities=(v:string)=>v.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&([a-zA-Z]+\d?);/g,(m,n)=>HTML_NAMED[n]??m).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#0?39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;|&#160;/g,' ');
function rssRawVal(block:string,tag:string){const esc=tag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=block.match(new RegExp(`<${esc}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${esc}>`,'i'));return m?m[1]:'';}
const RSS_MOTO=/\b(moto|motos|scooter|scooters|quad|quads|deux[- ]roues|2 roues|cyclo|motocross|enduro)\b/i;
function parseRssItem(block:string,channelTitle:string){
  const o:any={};
  const rawTitle=decodeEntities(rssRawVal(block,'title').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
  const link=decodeEntities(rssRawVal(block,'link').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').trim())||(block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]||'').trim();
  const priceM=rawTitle.match(/\s[-–—]\s*([\d][\d .\u00a0\u202f]*(?:,\d{1,2})?)\s*(?:€|eur(?:os?)?)\b.*$/i);
  if(priceM){o.prix=priceM[1].replace(/[ .\u00a0\u202f]/g,'').replace(',','.');o.titre=rawTitle.slice(0,priceM.index).trim();}else o.titre=rawTitle;
  if(link){o.url=link;const idM=link.match(/[-_/](\d{4,})(?:\.html?)?\/?(?:[?#].*)?$/);o.reference=idM?idM[1]:link.replace(/^https?:\/\/[^/]+/i,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(-60);}
  const descRaw=rssRawVal(block,'description')||rssRawVal(block,'content:encoded');
  const specs=decodeEntities(descRaw.split('<![CDATA[')[0].replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
  const cdataPart=descRaw.includes('<![CDATA[')?descRaw.slice(descRaw.indexOf('<![CDATA[')):descRaw;const html=decodeEntities(cdataPart.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1'));
  const photos:string[]=[];
  for(const m of (html+block).matchAll(/<(?:img|enclosure|media:content|media:thumbnail)\b[^>]*?(?:src|url)=["']([^"']+)["']/gi)){const u=decodeEntities(m[1]).trim();if(/^https?:\/\//i.test(u)&&!/logo|pixel|spacer|no[-_]?photo|placeholder|default[-_]?(?:car|photo|image)/i.test(u)&&!photos.includes(u))photos.push(u);}
  if(photos.length)o.photos=photos.slice(0,45).join('|');
  const text=html.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
  o.description=[specs,text&&text!==specs?text:''].filter(Boolean).join('\n\n').slice(0,6000);
  const km=specs.match(/([\d][\d .\u00a0\u202f]*)\s*km\b/i);if(km)o.kilometrage=km[1].replace(/[ .\u00a0\u202f]/g,'');
  const mec=specs.match(/\b(0?[1-9]|1[0-2])\/((?:19|20)\d{2})\b/)||specs.match(/\b((?:19|20)\d{2})\b/);
  if(mec){if(mec[2]){o.annee=mec[2];o.mise_en_circulation=`${String(mec[1]).padStart(2,'0')}/${mec[2]}`;}else o.annee=mec[1];}
  const ch=specs.match(/\b(\d{2,4})\s*ch\b/i);if(ch)o.puissance_din=ch[1];
  const cv=specs.match(/\b(\d{1,2})\s*cv\b/i);if(cv)o.puissance_fiscale=cv[1];
  if(/bo[iî]te\s+auto|automatique/i.test(specs))o.boite='automatique';else if(/bo[iî]te\s+m[ée]ca|manuelle|m[ée]canique/i.test(specs))o.boite='manuelle';
  const fuel=specs.match(/\b(essence|diesel|gazole|hybride rechargeable|hybride|[ée]lectrique|gpl)\b/i);if(fuel)o.carburant=fuel[1].toLowerCase();
  const gar=specs.match(/garantie\s+([^,]+)/i);if(gar)o.garantie=gar[1].trim();
  if(/\boccasion\b/i.test(specs))o.etat='occasion';else if(/\bneuf\b/i.test(specs))o.etat='neuf';
  const multi=o.titre.match(/^(land rover|range rover|alfa romeo|aston martin|mercedes[- ]benz|rolls[- ]royce|austin[- ]healey|lynk ?& ?co|mini cooper)\b/i);const make=multi?multi[1]:o.titre.split(/\s+/)[0];if(make&&/^[A-Za-zÀ-ÿ&' -]{2,}$/.test(make))o.marque=make;
  if(RSS_MOTO.test(channelTitle)||RSS_MOTO.test(o.titre))o.type='moto';else if(/\b(camping[- ]car|caravane|fourgon am[ée]nag[ée])\b/i.test(o.titre))o.type='camping-car';else if(/\b(fourgon|fourgonnette|utilitaire|plateau|benne|L\dH\d)\b/i.test(o.titre))o.type='utilitaire';
  return o;
}
function parseRss(text:string){
  const channelTitle=decodeEntities((text.match(/<channel[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1'));
  const items=[...text.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);
  const structured=parseXml(text,true);
  return items.map((b,i)=>{const h=parseRssItem(b,channelTitle);const s=structured[i]||{};const o:any={...h};for(const[k,v]of Object.entries(s)){if(v!==''&&v!=null&&!['title','titre','description','url','link'].includes(k))o[k]=v;}return o;});
}
const isRss=(text:string)=>/<rss[\s>]/i.test(text.slice(0,2000))||(/<channel[\s>]/i.test(text)&&/<item[\s>]/i.test(text));
function parseJson(v:any){const arr=Array.isArray(v)?v:(v?.vehicles||v?.vehicules||v?.properties||v?.biens||v?.listings||v?.annonces||v?.items||v?.stock||v?.data||v?.results||[]);return(Array.isArray(arr)?arr:[]).map((x:any)=>flatten(x));}
function photosOf(o:any){const photos:string[]=[];const add=(v:any)=>{if(Array.isArray(v)){v.forEach(add);return;}if(v&&typeof v==='object'){Object.values(v).forEach(add);return;}String(v??'').split(/[\n|;\s]+/).forEach(p=>{const x=p.trim();if(/^https?:\/\//i.test(x)&&!photos.includes(x)&&photos.length<45)photos.push(x);});};for(const [k,v]of Object.entries(o)){if(/(^|_)(photo|photos|image|images|picture|pictures)(_|$)/.test(k))add(v);}for(let i=1;i<=45;i++)add(first(o,[`photo_${i}`,`photo${i}`,`image_${i}`,`image${i}`,`picture_${i}`,`picture${i}`]));return photos.slice(0,45);}
function normalizeVehicleSub(v:unknown){const t=norm(v);if(!t)return'voitures';if(['voiture','voitures','auto','autos','automobile','automobiles','car','cars','vp','vehicle','vehicule'].includes(t))return'voitures';if(['moto','motos','motorcycle','motorcycles','scooter','scooters','2_roues','deux_roues'].includes(t))return'motos';if(['utilitaire','utilitaires','vu','fourgon','fourgonette','fourgonnette','van_utilitaire','commercial'].includes(t))return'utilitaires';if(['caravaning','camping_car','campingcar','caravane','motorhome'].includes(t))return'caravaning';return'';}
function normalizeImmoSub(typeValue:unknown,transactionValue:unknown=''){const t=norm(typeValue),tr=norm(transactionValue);const renting=['location','louer','rent','rental','lease','a_louer'].includes(tr)||t.includes('location')||t.includes('rent');if(t.includes('saison')||t.includes('vacance'))return'saisonniere';if(t.includes('terrain')||t.includes('land'))return'vente-terrain';if(t.includes('parking')||t.includes('garage')||t.includes('box')||t.includes('stationnement'))return'parking-garage';if(t.includes('bureau')||t.includes('commerce')||t.includes('local')||t.includes('office')||t.includes('shop')||t.includes('entrepot')||t.includes('hangar'))return'bureaux-commerces';if(/loft|duplex|triplex|penthouse/.test(t))return renting?'location':'vente-appartement';if(/maison|villa|house|immeuble|propriete|ferme|longere|chateau|bastide|chalet|^mas$|demeure|manoir|pavillon/.test(t))return renting?'location':'vente-maison';if(t.includes('appartement')||t.includes('studio')||t.includes('apartment')||t.includes('flat'))return renting?'location':'vente-appartement';if(renting)return'location';if(['vente_appartement','appartement_a_vendre'].includes(t))return'vente-appartement';if(['vente_maison','maison_a_vendre'].includes(t))return'vente-maison';return'';}
function normalizeCondition(v:unknown){const t=norm(v);const map:any={neuf:'Neuf',new:'Neuf',comme_neuf:'Comme neuf',tres_bon_etat:'Très bon état',bon_etat:'Bon état',used:'Bon état',occasion:'Bon état',etat_correct:'État correct',correct:'État correct',a_reparer:'À rénover / à réparer',a_renover_a_reparer:'À rénover / à réparer',pour_pieces:'Pour pièces'};return map[t]||String(v||'').trim()||null;}
function normalizeFuel(v:unknown){const t=norm(v);const map:any={essence:'Essence',petrol:'Essence',gasoline:'Essence',diesel:'Diesel',gazole:'Diesel',hybride:'Hybride',hybrid:'Hybride',hybride_rechargeable:'Hybride rechargeable',plug_in_hybrid:'Hybride rechargeable',electrique:'Électrique',electric:'Électrique',ev:'Électrique',gpl:'GPL',lpg:'GPL',autre:'Autre'};return map[t]||String(v||'').trim()||null;}
function normalizeTransmission(v:unknown){const t=norm(v);if(['auto','automatique','automatic','at'].includes(t))return'Automatique';if(['manuelle','manuel','manual','mt'].includes(t))return'Manuelle';return String(v||'').trim()||null;}
function normalizeCritAir(v:unknown){const raw=String(v??'').trim();if(!raw)return null;const t=norm(raw).replace(/^crit_?air_?/,'');if(['0','zero','electrique','electric'].includes(t))return'0';if(['1','2','3','4','5'].includes(t))return t;if(['non_classe','non_classee','non_classement','none','nc'].includes(t))return'Non classé';return null;}
const energyClass=(v:unknown)=>{const x=String(v??'').trim().toUpperCase().replace(/_/g,' ');if(['A','B','C','D','E','F','G'].includes(x))return x;if(['NON SOUMIS','NONSOUMIS','NON CONCERNE','NON CONCERNÉ','EXEMPT'].includes(x))return'NON SOUMIS';return x;};
function normalizeRaw(raw:any){const flat=flatten(raw);const out:any={};for(const[k,v]of Object.entries(flat||{})){const nk=norm(k);if(out[nk]===undefined)out[nk]=v;}return out;}
function normalizeVehicle(raw:any){const o=normalizeRaw(raw);const ref=first(o,['reference','ref','reference_stock','stock_id','stockid','id','identifiant','vehicle_id','vehicleid']);let title=first(o,['titre','title','nom','designation','libelle','name']);const price=num(first(o,['prix','price','prix_eur','tarif','selling_price','sale_price']));const city=first(o,['ville','city','localite','location_city']);const postal=normalizePostal(first(o,['code_postal','cp','postal_code','zipcode','zip']));const description=first(o,['description','desc','details','commentaire','comments']);const sub=normalizeVehicleSub(first(o,['type','sous_categorie','type_vehicule','categorie','category','vehicle_type','body_type']));const make=first(o,['marque','make','brand','manufacturer'])||null;const model=first(o,['modele','model','model_name'])||null;const year=num(first(o,['annee','year','millesime','first_registration_year','registration_year']));const mileage=num(first(o,['kilometrage','km','mileage','odometer']));if(!title&&(make||model))title=[make,model,year].filter(Boolean).join(' ');const equipmentRaw=first(o,['equipements','equipment','options','features','extras']);const equipment=String(equipmentRaw||'').split(/[|;,]/).map(x=>x.trim()).filter(Boolean);const r:any={category:'vehicules',ref,title,price,city,postal,description,sub,condition:normalizeCondition(first(o,['etat','condition','vehicle_condition'])),make,model,year,mileage,fuel:normalizeFuel(first(o,['carburant','fuel','energie','energy'])),transmission:normalizeTransmission(first(o,['boite','boite_vitesse','transmission','gearbox'])),critAir:normalizeCritAir(first(o,['crit_air','critair','crit_air_classe','vignette_crit_air','emission_class'])),body:first(o,['carrosserie','body','body_type','vehicle_body','type_carrosserie']),doors:num(first(o,['portes','nombre_portes','doors','door_count'])),seats:num(first(o,['places','nombre_places','seats','seat_count'])),permit:first(o,['permis','permit','license_required','licence_required']),finish:first(o,['finition','trim','finish','grade']),version:first(o,['version','version_constructeur','variant','derivative']),firstRegistration:first(o,['mise_en_circulation','date_premiere_mise_en_circulation','first_registration','registration_date']),color:first(o,['couleur','color','colour']),upholstery:first(o,['sellerie','upholstery','interior_trim']),fiscalPower:num(first(o,['puissance_fiscale','cv_fiscaux','fiscal_power','tax_hp'])),dinPower:num(first(o,['puissance_din','puissance_ch','din_power','horsepower','hp'])),co2:num(first(o,['co2','emissions_co2','co2_g_km','co2_emissions'])),history:first(o,['historique','historique_vehicule','vehicle_history','owner_history']),technicalInspection:first(o,['controle_technique','ct','technical_inspection']),maintenance:first(o,['entretien','carnet_entretien','maintenance','service_history']),warranty:first(o,['garantie','warranty']),equipment,showPhone:bool(first(o,['afficher_numero','telephone_visible','show_phone']),true),externalUrl:first(o,['url','external_url','listing_url']),photos:photosOf(o),errors:[] as string[]};if(!r.ref)r.errors.push('référence manquante');if(!r.title)r.errors.push('titre manquant');if(!r.city)r.errors.push('ville manquante');if(!r.sub)r.errors.push('type véhicule non reconnu');if(r.price===null)r.errors.push('prix manquant');if(!r.photos.length)r.errors.push('aucune photo');if(year!==null&&(year<1900||year>2100))r.errors.push('année invalide');if(mileage!==null&&mileage<0)r.errors.push('kilométrage invalide');if(price!==null&&price<0)r.errors.push('prix invalide');return r;}
// 29/10/2026 : prestations repérées dans le titre / la description (« vendu avec une cave », « balcon », « box »…).
const IMMO_FEATURES:[RegExp,string][]=[[/\bascenseur/i,'Ascenseur'],[/\bbalcons?\b/i,'Balcon'],[/\bterrasses?\b/i,'Terrasse'],[/\bloggias?\b/i,'Loggia'],[/\bcaves?\b|\bcellier\b/i,'Cave'],[/\bbox\b/i,'Box'],[/\bparkings?\b|places? de stationnement|\bstationnement privatif/i,'Parking'],[/\bgarages?\b/i,'Garage'],[/\bjardin\b/i,'Jardin'],[/\bpiscine\b/i,'Piscine'],[/\bgardien|concierge/i,'Gardien'],[/\bdigicode\b/i,'Digicode'],[/\binterphone|visiophone/i,'Interphone'],[/\bclimatis/i,'Climatisation'],[/double vitrage/i,'Double vitrage'],[/\bchemin[ée]e\b/i,'Cheminée'],[/\bdressing\b/i,'Dressing'],[/\bparquet\b/i,'Parquet'],[/\bmeubl[ée]e?\b/i,'Meublé'],[/\bcuisine (?:[ée]quip[ée]e|am[ée]nag[ée]e)/i,'Cuisine équipée'],[/vue (?:mer|d[ée]gag[ée]e|panoramique)/i,'Belle vue'],[/\baccessible|\bPMR\b/i,'Accès PMR']];
function immoFeaturesFromText(t:string){const out:string[]=[];const x=String(t||'');for(const[re,l]of IMMO_FEATURES){if(re.test(x)&&!new RegExp(`\\b(?:sans|pas d['e]|pas de)\\s+${l.toLowerCase().split(' ')[0]}`,'i').test(x)&&!out.includes(l))out.push(l);}return out;}
// 29/10/2026 : lecture « large » de la description : ce que le site n'a pas mis dans des champs mais écrit dans le texte
// (« DPE : C – 67 kWhEP/m².an », « GES : C – 12 kgéqCO2 », « charges de copropriété : 2820 euros/an », « taxe foncière : 1910 euros »,
// « copropriété de 16 lots », « Mandat n°1772 », « DPE établi le 05/12/2025 », « entre 830 et 1230 euros », « 4 chambres »…).
// Ne remplace jamais une valeur déjà fournie par le site.
function immoFillFromText(o:any){
 const raw=[first(o,['description','desc','details','commentaire','texte_annonce']),first(o,['titre','title'])].filter(Boolean).join('\n');
 if(!raw)return;
 const t=decodeEntities(String(raw)).replace(/[   ]/g,' ').replace(/[ \t]+/g,' ');
 const has=(...ks:string[])=>!!first(o,ks);
 const set=(k:string,v:any)=>{if(v!==undefined&&v!==null&&String(v).trim()!==''&&!has(k))o[norm(k)]=String(v).trim();};
 const numFr=(v:string)=>v.replace(/[\s.](?=\d{3}\b)/g,'').replace(',','.');
 // Lettre de classe : toujours en MAJUSCULE dans les annonces, et suivie d'autre chose qu'une lettre (évite « DPE établi le… »).
 const letter=(re:RegExp)=>{for(const m of t.matchAll(re)){const c=m[1];if(/^[A-G]$/.test(c))return c;}return'';};
 const dpeL=letter(/(?:\bDPE\b|diagnostic de performance [ée]nerg[ée]tique|classe [ée]nerg(?:ie|[ée]tique)|[ée]tiquette [ée]nerg(?:ie|[ée]tique)|consommation [ée]nerg[ée]tique)\s*(?:\([^)]{0,40}\))?\s*(?:[:=]|-|–|—|est|en|de|classe)?\s*(?:classe\s*)?([A-Ga-g])(?![A-Za-zÀ-ÿ])/gi);
 const gesL=letter(/(?:\bGES\b|gaz à effet de serre|[ée]missions? de (?:gaz|CO2)|classe climat|[ée]tiquette climat)\s*(?:\([^)]{0,40}\))?\s*(?:[:=]|-|–|—|est|en|de|classe)?\s*(?:classe\s*)?([A-Ga-g])(?![A-Za-zÀ-ÿ])/gi);
 const kwh=t.match(/(\d{1,4}(?:[.,]\d+)?)\s*kWh\s*(?:EP|ep|e\.p\.)?\s*\/\s*m/i)?.[1];
 const co2=t.match(/(\d{1,3}(?:[.,]\d+)?)\s*kg\s*(?:[ée]q\.?\s*)?CO\s*2/i)?.[1];
 let dpe=dpeL,ges=gesL;
 if(kwh&&co2&&(!dpe||!ges)){const c=dpeFromValues(Number(numFr(kwh)),Number(numFr(co2)));if(c){dpe=dpe||c.dpe;ges=ges||c.ges;}}
 const dpeCtx=t.match(/(?:\bDPE\b|diagnostic de performance [ée]nerg[ée]tique|performance [ée]nerg[ée]tique|consommation [ée]nerg[ée]tique)[^.\n]{0,50}/i)?.[0]||'';
 const exempt=/non (?:soumis|requis|applicable|obligatoire|concern[ée])|exempt|vierge|sans objet/i.test(dpeCtx)||/non soumis (?:au|à) (?:DPE|diagnostic)/i.test(t);
 if(exempt&&!dpe){set('dpe','NON SOUMIS');}
 else if(!/\ben cours\b/i.test(dpeCtx)){set('dpe',dpe);set('ges',ges);}
 if(kwh)set('consommation_energie',Math.round(Number(numFr(kwh))));
 const dd=t.match(/DPE[^.\n]{0,40}?(?:le|du|en date du)\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(dd)set('date_dpe',`${dd[3]}-${dd[2]}-${dd[1]}`);
 const cost=t.match(/entre\s*(\d[\d\s.]*(?:,\d+)?)\s*(?:€|euros?)?\s*et\s*(\d[\d\s.]*(?:,\d+)?)\s*(?:€|euros?)/i);if(cost&&/[ée]nerg|DPE|co[uû]ts?/i.test(t.slice(Math.max(0,(cost.index||0)-200),(cost.index||0)+60))){set('cout_energie_min',numFr(cost[1]).replace(/\.0+$/,''));set('cout_energie_max',numFr(cost[2]).replace(/\.0+$/,''));}
 const chAn=t.match(/charges?\s*(?:de\s*copropri[ée]t[ée]|courantes|annuelles|de\s*copro)?\s*(?:\([^)]*\))?\s*[:=]?\s*(?:de\s*)?(?:environ\s*)?(\d[\d\s.]*(?:,\d+)?)\s*(?:€|euros?)\s*(?:\/|par)\s*an/i);if(chAn)set('charges_annuelles',numFr(chAn[1]));
 if(!chAn){const chMo=t.match(/charges?\s*(?:de\s*copropri[ée]t[ée]|courantes|mensuelles)?\s*[:=]?\s*(?:de\s*)?(\d[\d\s.]*(?:,\d+)?)\s*(?:€|euros?)\s*(?:\/|par)\s*mois/i);if(chMo){const n=Number(numFr(chMo[1]));if(n>0&&/location|louer|loyer/i.test(String(first(o,['transaction','type_transaction'])||'')))set('charges_mensuelles',n);else if(n>0)set('charges_annuelles',Math.round(n*12));}}
 const tf=t.match(/taxe\s*fonci[èe]re\s*(?:\([^)]*\))?\s*[:=]?\s*(?:de\s*)?(?:environ\s*)?(\d[\d\s.]*(?:,\d+)?)\s*(?:€|euros?)/i);if(tf)set('taxe_fonciere',numFr(tf[1]));
 const lots=t.match(/(\d{1,4})\s*lots/i);if(lots)set('nombre_lots',lots[1]);
 const man=t.match(/\bmandat\s*(?:n[°o]\.?|num[ée]ro)?\s*:?\s*([A-Z0-9][A-Z0-9-]{1,20})\b/i);if(man&&/\d/.test(man[1]))set('mandat',man[1]);
 const hon=t.match(/(\d{1,2}(?:[.,]\d+)?\s*%\s*(?:TTC)?\s*d['’]honoraires[^.\n]{0,80}|honoraires[^.\n]{0,20}?(?:à la charge|charge)[^.\n]{0,60})/i);if(hon)set('honoraires',hon[1].replace(/\s+/g,' ').trim());
 const ch=t.match(/(\d{1,2})\s*chambres?\b/i);if(ch)set('chambres',ch[1]);
 const pc=t.match(/(\d{1,2})\s*pi[èe]ces\b/i);if(pc)set('pieces',pc[1]);
 const sf=t.match(/(?:surface|superficie)[^.\n]{0,40}?(\d{1,4}(?:[.,]\d+)?)\s*m(?:²|2)(?![a-z0-9])/i)||t.match(/(\d{2,4}(?:[.,]\d+)?)\s*m(?:²|2)\s*(?:habitables?|carrez|loi carrez)/i);if(sf)set('surface',numFr(sf[1]));
 const sdb=(t.match(/salles? (?:de bains?|d['’]eau)/gi)||[]).length;if(sdb)set('salles_de_bain',sdb);
 const heat=t.match(/chauffage\s+(?:et (?:d['’])?eau chaude\s+)?(?:sanitaire\s+)?((?:individuel|collectif|central|au sol|par le sol|électrique|gaz|fioul|pompe à chaleur|urbain)[^.,;\n]{0,40})/i)||t.match(/(?:production de )?chauffage[^.,;\n]{0,30}?((?:individuel|collectif|collective)s?[^.,;\n]{0,30})/i);if(heat)set('chauffage',heat[1].trim().replace(/^collecti(?:f|ve)s?\b/i,'Collectif').replace(/^individuel(?:le)?s?\b/i,'Individuel').replace(/^\p{Ll}/u,(c:string)=>c.toUpperCase()));
 const fl=t.match(/(\d{1,2})\s*(?:e|er|ème|eme|°)\s*[ée]tage/i);if(fl)set('etage',fl[1]);else if(/rez[- ]de[- ]chauss[ée]e/i.test(t))set('etage','0');
 const yb=t.match(/(?:construit|construction|b[âa]ti)\s*(?:en|de|:)?\s*((?:18|19|20)\d{2})/i);if(yb)set('annee_construction',yb[1]);
}
function normalizeImmo(raw:any){const o=normalizeRaw(raw);const ref=first(o,['reference','ref','reference_mandat','mandat','mandate','property_id','bien_id','id','identifiant']);const transaction=(()=>{const tx=decodeEntities(String([first(o,['titre','title']),first(o,['description','desc','details','texte_annonce'])].filter(Boolean).join(' ')));return /\bloyer\s*(?:mensuel)?\s*(?:hc|cc|hors charges|charges comprises)?\s*[:=]\s*\d/i.test(tx)&&/d[ée]p[ôo]t de garantie|caution|charges?\s*(?:mensuelles)?\s*[:=]?\s*\d|\+\s*\d[\d\s.,]*\s*(?:€|euros?)\s*(?:de\s*)?(?:provision\s*(?:mensuelle\s*)?(?:de\s*)?)?charges/i.test(tx)&&!/\b(?:à|a) vendre\b|prix de vente|frais d.agence inclus/i.test(tx)?'location':'';})()||first(o,['transaction','type_transaction','vente_location','operation','deal_type'])||(()=>{const tx=decodeEntities(String([first(o,['titre','title']),first(o,['description','desc','details','texte_annonce'])].filter(Boolean).join(' ')));if(/\b(?:à|a) louer\b|\bloyer\s*(?:mensuel)?\s*(?:hc|cc|hors charges|charges comprises)?\s*[:=]?\s*\d|d[ée]p[ôo]t de garantie|\ben location\b|\blocation (?:meubl|vide|appartement|maison|studio)/i.test(tx)&&!/\b(?:à|a) vendre\b|frais d.agence inclus|prix de vente|honoraires? (?:à la )?charge (?:de l.)?acqu/i.test(tx))return'location';return'';})();const propertyType=first(o,['type_bien','property_type','bien','type','sous_categorie','categorie','category']);const sub=normalizeImmoSub(propertyType,transaction);const surface=num(first(o,['surface','surface_habitable','living_area','area','surface_utile']));const rooms=num(first(o,['pieces','nb_pieces','nombre_pieces','rooms','room_count']));let title=first(o,['titre','title','nom','designation','libelle','name']);const city=first(o,['ville','city','commune','localite','location_city']);if(!title){const kind=sub==='vente-maison'?'Maison':sub==='vente-terrain'?'Terrain':sub==='location'?'Location':sub==='parking-garage'?'Parking / Garage':sub==='bureaux-commerces'?'Local / Bureau':'Appartement';title=[kind,rooms?`${Math.round(rooms)} pièce${rooms>1?'s':''}`:'',surface?`${surface} m²`:'',city].filter(Boolean).join(' · ');}immoFillFromText(o);const okEC=(v:any)=>['A','B','C','D','E','F','G','NON SOUMIS'].includes(v)?v:'';const dpe=okEC(energyClass(first(o,['dpe','classe_energie','energy_class','energy_rating'])));const ges=okEC(energyClass(first(o,['ges','classe_ges','climate_class','ges_class'])));const featuresRaw=first(o,['equipements','prestations','features','amenities','options','services']);const features=String(featuresRaw||'').split(/[|;,]/).map(x=>x.trim()).filter(Boolean);for(const f of immoFeaturesFromText(`${first(o,['titre','title'])||''} ${first(o,['description','desc','details','texte_annonce'])||''} ${first(o,['ascenseur'])?'ascenseur':''}`))if(!features.some(x=>norm(x)===norm(f)))features.push(f);const r:any={category:'immobilier',ref,title,price:num(first(o,['prix','price','prix_vente','loyer','rent','tarif','sale_price'])),city,postal:normalizePostal(first(o,['code_postal','cp','postal_code','zipcode','zip'])),description:first(o,['description','desc','details','commentaire','comments','texte_annonce']),sub,propertyType,transaction,surface,landSurface:num(first(o,['surface_terrain','terrain','land_area','plot_area'])),rooms,bedrooms:num(first(o,['chambres','nb_chambres','nombre_chambres','bedrooms','bedroom_count'])),bathrooms:num(first(o,['salles_de_bain','salle_de_bain','salles_eau','bathrooms','bathroom_count'])),floor:num(first(o,['etage','floor','floor_number'])),totalFloors:num(first(o,['nombre_etages','nb_etages','total_floors','building_floors'])),furnished:first(o,['meuble','meublee','furnished']),yearBuilt:num(first(o,['annee_construction','annee_de_construction','construction_year','year_built'])),propertyCondition:first(o,['etat_bien','etat','property_condition','condition']),heating:first(o,['chauffage','heating','heating_type']),orientation:first(o,['exposition','orientation','exposure']),neighborhood:first(o,['quartier','secteur','neighborhood','district']),dpe,ges,energyConsumption:num(first(o,['consommation_energie','conso_energie','energy_consumption','kwh_m2_an'])),dpeDate:first(o,['date_dpe','dpe_date','diagnostic_date']),energyCostMin:num(first(o,['cout_energie_min','depenses_energie_min','energy_cost_min'])),energyCostMax:num(first(o,['cout_energie_max','depenses_energie_max','energy_cost_max'])),coownership:first(o,['copropriete','coownership','condominium']),lots:num(first(o,['nombre_lots','nb_lots','lots','lot_count'])),annualCharges:num(first(o,['charges_annuelles','annual_charges','copro_charges'])),propertyTax:num(first(o,['taxe_fonciere','property_tax','land_tax'])),fees:first(o,['honoraires','frais_agence','agency_fees','fees']),rentCharges:num(first(o,['charges_mensuelles','charges_location','monthly_charges','rent_charges'])),deposit:num(first(o,['depot_garantie','caution','deposit','security_deposit'])),mandate:first(o,['mandat','reference_mandat','mandate','mandate_reference'])||ref,availableDate:first(o,['disponible_le','date_disponibilite','available_date','availability_date']),features,showPhone:bool(first(o,['afficher_numero','telephone_visible','show_phone']),true),externalUrl:first(o,['url','external_url','listing_url']),photos:photosOf(o),errors:[] as string[]};if(!r.ref)r.errors.push('référence / mandat manquant');if(!r.title)r.errors.push('titre manquant');if(!r.city)r.errors.push('ville manquante');if(!r.sub)r.errors.push('type de bien non reconnu');if(!r.photos.length)r.errors.push('aucune photo');if(r.price!==null&&r.price<0)r.errors.push('prix invalide');if(r.surface!==null&&r.surface<0)r.errors.push('surface invalide');if(r.landSurface!==null&&r.landSurface<0)r.errors.push('surface terrain invalide');if(dpe&&!['A','B','C','D','E','F','G','NON SOUMIS'].includes(dpe))r.errors.push('DPE invalide');if(ges&&!['A','B','C','D','E','F','G','NON SOUMIS'].includes(ges))r.errors.push('GES invalide');if(['A','B','C','D','E','F','G'].includes(dpe)&&!ges)r.errors.push('GES manquant');return r;}
function normalizePostal(v:unknown){const d=String(v??'').replace(/\D/g,'');if(!d)return'';if(d.length===4)return'0'+d;return d.slice(0,5);}
const communeCache=new Map<string,any>();
async function correctCityPostal(r:any){r.postal=normalizePostal(r.postal);const city=String(r.city||'').trim();if(!city||/^monaco$/i.test(city)||String(r.postal||'').startsWith('980'))return r;const key=norm(city);try{let info=communeCache.get(key);if(info===undefined){const resp=await fetch('https://geo.api.gouv.fr/communes?nom='+encodeURIComponent(city)+'&fields=nom,codesPostaux&boost=population&limit=8');const arr=resp.ok?await resp.json():[];const exact=(arr||[]).find((x:any)=>norm(x.nom)===key)||(arr||[])[0]||null;info=exact?{name:exact.nom,codes:Array.isArray(exact.codesPostaux)?exact.codesPostaux:[]}:null;communeCache.set(key,info);}if(info){r.city=info.name||r.city;if(info.codes.length&&(!r.postal||!info.codes.includes(r.postal)))r.postal=info.codes[0];}}catch(e){console.warn('geo correction failed',city,e);}return r;}
async function ownerLocation(userId:string|null|undefined){if(!userId)return null;try{const[{data:v},{data:p}]=await Promise.all([admin.from('pro_verifications').select('company_city,company_postal_code').eq('user_id',userId).maybeSingle(),admin.from('profiles').select('city').eq('id',userId).maybeSingle()]);const city=String(v?.company_city||p?.city||'').trim();return city?{city,postal:normalizePostal(String(v?.company_postal_code||''))}:null;}catch(e){console.warn('owner location failed',e);return null;}}
// Véhicules : tous au garage, donc ville et code postal du garage sur chaque annonce (adresse du compte pro,
// sinon adresse publiée sur le site). Immobilier : la ville de chaque bien, celle du compte seulement si elle manque.
// preferSite : aperçu d'une adresse testée par quelqu'un d'autre que le garage (ex. l'admin) => adresse du site d'abord.
// 29/10/2026 : descriptions mises en forme (les sites donnent souvent tout « en bloc ») :
// paragraphes et listes rétablis, pour qu'une annonce reste lisible. Le contenu n'est jamais modifié, seulement les retours à la ligne.
const DESC_HEADS=['Équipements','Equipements','Options et équipements','OPTIONS ET EQUIPEMENTS','Options','Points forts','Caractéristiques','Informations complémentaires','Garantie','Prix','Conditions tarifaires','Honoraires','Mandat','DPE','GES','Diagnostic','Copropriété','Les informations sur les risques','Localisation','Financement','Reprise','Contact'];
function tidyDescription(v:unknown){
 let t=String(v??'').replace(/\r\n?/g,'\n').replace(/[  ]/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
 if(!t)return t;
 // Listes écrites à la suite : « … -Climatisation -Sièges chauffants », « • GPS • Radar », puces emoji.
 t=t.replace(/\s+(?=(?:[-–•▪►▶✓✔✅☑➡→]|▶️|✔️)\s?\p{Lu})/gu,'\n')
    .replace(/\s*((?:📍|📅|📌|⚙️|🔄|🚙|🌱|🎨|💺|💰|🔥|⭐|👤|📞|✨|🛠️|🔧|📝|🔑|🚗|✅)\s?)/gu,'\n$1');
 // Titres de rubrique : à la ligne, précédés d'une ligne vide.
 for(const h of DESC_HEADS){const re=new RegExp(`([^\\n])\\s+(${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})(\\s*(?::|-|–|n°|\\())`,'g');t=t.replace(re,'$1\n\n$2$3');}
 // Gros bloc sans retour à la ligne : paragraphes de 2-3 phrases.
 const lines=t.split('\n');
 const out:string[]=[];
 for(const line of lines){
  if(line.length<=320){out.push(line);continue;}
  const sentences=line.match(/[^.!?…]+(?:[.!?…]+(?=\s+\p{Lu}|\s*$)|$)/gu)||[line];
  let cur='';
  for(const sn of sentences.map(x=>x.trim()).filter(Boolean)){if(cur&&cur.length+sn.length>280){out.push(cur);out.push('');cur=sn;}else cur=cur?cur+' '+sn:sn;}
  if(cur)out.push(cur);
 }
 return out.join('\n').replace(/\n{3,}/g,'\n\n').replace(/^\n+/,'').trim();
}
async function normalizeRows(rows:any[],sector:string,ownerId?:string|null,preferSite=false){const own=await ownerLocation(ownerId);const site=(rows as any).siteLocation||null;const loc=preferSite?(site||own):(own||site);const force=!preferSite&&!!own?.city;const out=[];for(const raw of rows.slice(0,5000)){const r=sector==='immobilier'?normalizeImmo(raw):normalizeVehicle(raw);if(/^\s*(?:vendue?s?|lou[ée]e?s?|sous compromis|compromis sign[ée]|r[ée]serv[ée]e?)\b/i.test(String(r.title||'')))continue;if(loc?.city&&((r.category==='vehicules'&&force)||!r.city)){r.city=loc.city;r.postal=loc.postal||(r.category==='vehicules'?'':r.postal)||'';r.errors=(r.errors||[]).filter((e:string)=>e!=='ville manquante');}await correctCityPostal(r);if(r.description)r.description=tidyDescription(r.description);out.push(r);}return out;}

async function authUser(req:Request){const h=req.headers.get('Authorization')||'';if(!h)return null;const c=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:h}},auth:{persistSession:false}});const{data}=await c.auth.getUser();return data?.user||null;}
async function cronOk(req:Request){const tok=req.headers.get('x-cron-token')||'';if(!tok)return false;const hash=await sha256(tok);const{data}=await admin.from('pro_sync_secrets').select('value_hash').eq('name','cron_sync').maybeSingle();return!!data&&data.value_hash===hash;}
async function feedByApiKey(req:Request){const k=req.headers.get('x-abracadeal-key')||'';if(!k)return null;const hash=await sha256(k);const{data}=await admin.from('pro_stock_feeds').select('*').eq('api_key_hash',hash).eq('active',true).maybeSingle();return data||null;}
async function publicFeedUrl(url:URL){
 const host=url.hostname.replace(/^\[|\]$/g,'');
 if(!['http:','https:'].includes(url.protocol)||(url.port&&!['80','443'].includes(url.port))||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal'))throw Error('URL de flux non autorisée');
 const privateIp=(ip:string)=>{
  if(ip.includes(':'))return /^(::|fc|fd|fe80|ff)/i.test(ip)||ip.toLowerCase().startsWith('::ffff:');
  const a=ip.split('.').map(Number);return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||(a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&a[1]===168)||(a[0]===100&&a[1]>=64&&a[1]<=127);
 };
 const addresses=/^[\d.]+$/.test(host)||host.includes(':')?[host]:[...await Deno.resolveDns(host,'A').catch(()=>[]),...await Deno.resolveDns(host,'AAAA').catch(()=>[])];
 if(!addresses.length||addresses.some(privateIp))throw Error('Adresse de flux privée ou inaccessible');
}
// Sites vitrines de garages réalisés par « Annonces Automobile » (ex. lifecars.fr) : pas de flux public,
// on lit la page /annonces (toutes les pages) puis chaque fiche pour récupérer champs + toutes les photos.
// Fail closed : si la liste ne peut pas être lue entièrement, on lève une erreur (aucun archivage).
const isAaSiteHtml=(t:string)=>/cdn-rivamedia\.com/i.test(t)&&/annonces-automobile\.com/i.test(t);
async function fetchSiteHtml(start:URL){
 let url=new URL(start.toString());
 for(let redirects=0;;redirects++){
  await publicFeedUrl(url);
  const r=await fetch(url.toString(),{headers:{Accept:'text/html,*/*;q=0.5','User-Agent':'Abracadeal-StockSync/1.0 (+https://abracadeal.fr)'},redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(r.status>=300&&r.status<400){const loc=r.headers.get('location');await r.body?.cancel();if(!loc||redirects>=4)throw Error('Redirection invalide');url=new URL(loc,url);continue;}
  if(!r.ok)throw Error(`HTTP ${r.status}`);
  const text=await r.text();if(text.length>5_000_000)throw Error('Page trop volumineuse');
  return{text,url};
 }
}
const aaClean=(v:string)=>decodeEntities(String(v||'').replace(/<span class="legendsup">[\s\S]*?<\/span>/gi,'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')).replace(/[ \t]+/g,' ').split('\n').map(l=>l.trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim();
function aaListLinks(html:string,base:URL){const out=new Map<string,string>();for(const m of html.matchAll(/href="([^"]*\/annonce-[a-z0-9-]*?-(\d{5,}))"/gi)){try{const u=new URL(decodeEntities(m[1]),base);if(u.hostname===base.hostname&&!out.has(m[2]))out.set(m[2],u.toString());}catch{}}return out;}
// Deux modèles de fiche AA : tableau (<td class="legend">) ou cartes (<span class="specs-label"> / <span class="specs-value">).
function aaCell(html:string,label:string){const esc=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=html.match(new RegExp(`<td class="legend">\\s*${esc}\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`,'i'))||html.match(new RegExp(`<span class="specs-label">\\s*${esc}\\s*</span>\\s*<span class="specs-value"[^>]*>([\\s\\S]*?)</span>`,'i'));const v=m?aaClean(m[1]):'';return v==='-'?'':v;}
// 29/10/2026 : photos des sites Annonces-Automobile. Selon l'offre du garage, les photos ne sont pas toujours sur
// auto.cdn-rivamedia.com/photos/annoncecli/big/ (autre sous-domaine, autre dossier, lien sans « https: »).
// On lit la galerie de la fiche (#sliderdetail, avant la description et les véhicules similaires) : chaque photo
// existe en plusieurs tailles (big / intermediate / small) et garde le même numéro final -> une seule, la plus grande.
function aaPhotos(html:string,pageUrl:string){
 const start=html.search(/id="(?:sliderdetail|bigimg|bxslider)"/i);
 let zone=start>=0?html.slice(start,start+120000):html;
 const stop=zone.search(/id="(?:description|similaires|annonces-similaires|caracteristiques)"/i);if(stop>0)zone=zone.slice(0,stop);
 // Taille dans le dossier (/big/) ou dans le nom (215930456-ibig.jpg, -intermediate.jpg, -small.jpg).
 const SIZE='i?big|large|xlarge|grande?|original|hd|intermediate|medium|moyenne?|small|thumb|thumbnail|mini|petite?';
 const rank=(u:string)=>/[\/_-](?:i?big|large|xlarge|grande?|original|hd)(?:[\/.]|$)/i.test(u)?3:/[\/_-](?:intermediate|medium|moyenne?)(?:[\/.]|$)/i.test(u)?2:/[\/_-](?:small|thumb|thumbnail|mini|petite?)(?:[\/.]|$)/i.test(u)?0:1;
 const byKey=new Map<string,string>();const order:string[]=[];
 const add=(raw:string)=>{let u=decodeEntities(raw.trim());if(u.startsWith('//'))u='https:'+u;try{u=new URL(u,pageUrl).toString();}catch{return;}
  if(!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(u)||/logo|icon|sprite|blank|placeholder|picto|drapeau|flag/i.test(u))return;
  const file=(u.split('?')[0].split('/').pop()||'').toLowerCase().replace(new RegExp(`[-_](?:${SIZE})(?=\\.(?:jpe?g|png|webp)$)`,'i'),'');const key=(file.match(/(\d{4,})\.(?:jpe?g|png|webp)$/)?.[1])||file;
  const cur=byKey.get(key);if(!cur){byKey.set(key,u);order.push(key);}else if(rank(u)>rank(cur))byKey.set(key,u);};
 for(const m of zone.matchAll(/(?:href|src|data-src|data-original|data-lazy|data-zoom-image|data-big)="([^"]+)"/gi))add(m[1]);
 // Pas de galerie reconnue : photos rivamedia de toute la page (hors véhicules similaires), puis image principale.
 if(!order.length){const page=html.replace(/<div[^>]*id="(?:similaires|annonces-similaires)"[\s\S]*$/i,'');
  for(const m of page.matchAll(/(?:https?:)?\/\/[a-z0-9.-]*rivamedia\.com\/photos\/[^"'\s)<>]+?\.(?:jpe?g|png|webp)/gi))add(m[0]);}
 if(!order.length){const og=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1]||html.match(/itemprop="image"[^>]*src="([^"]+)"/i)?.[1];if(og)add(og);}
 return order.map(k=>byKey.get(k)!).filter(Boolean).slice(0,45).join('|');
}
function parseAaDetail(html:string,url:string,id:string){
 const o:any={reference:id,url};
 // Une fiche vendue renvoie vers une page de liste : sans « n°<id> » dans le titre, on ne lit rien.
 const pageTitle=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'';
 if(!pageTitle.includes(id)&&!new RegExp(`itemprop="mpn">\\s*${id}\\s*<`).test(html)){o._aa_missing='1';return o;}
 o.titre=aaClean(html.match(/<h1 itemprop="name">([\s\S]*?)<\/h1>/i)?.[1]||'');
 const prix=html.match(/<div id="prix"[^>]*>\s*<span>([\d .\u00a0]+)<\/span>/i)?.[1]||html.match(/class="price-amount"[^>]*>\s*([\d .\u00a0]+)/i)?.[1];if(prix)o.prix=prix;
 const map:[string,string][]=[['Marque','marque'],['Modèle','modele'],['Finition','finition'],['Catégorie','carrosserie'],['Kilométrage','kilometrage'],['Année mise circulation','mise_en_circulation'],['Garantie','garantie'],['Energie','carburant'],['Couleur extérieure','couleur'],['Couleur intérieure','sellerie'],['Puissance fiscale','puissance_fiscale'],['Puissance DIN','puissance_din'],['Transmission','boite'],['Emission de CO2','co2'],['Nombre de portes','portes']];
 for(const[label,key]of map){const v=aaCell(html,label);if(v)o[key]=v;}
 if(o.puissance_din)o.puissance_din=o.puissance_din.replace(/\(.*$/,'').trim();
 if(o.boite&&/m[ée]canique/i.test(o.boite))o.boite='manuelle';
 const mec=String(o.mise_en_circulation||'').match(/((?:19|20)\d{2})/);if(mec)o.annee=mec[1];
 const cat=norm(o.carrosserie);
 // Type lu dans la catégorie du site seulement (le titre peut contenir « Quad Cab », etc.).
 if(/\b(moto|motos|scooter|scooters|quad|quads|deux[- ]roues)\b/i.test(o.carrosserie||''))o.type='moto';else if(cat.includes('utilitaire'))o.type='utilitaire';else if(/camping/.test(cat))o.type='camping-car';else o.type='voiture';
 o.etat='occasion';
 const desc=html.match(/<div id="description">[\s\S]*?<div class="description-content">([\s\S]*?)<\/div>/i)?.[1]||html.match(/<div id="description">[\s\S]*?<div class="box">([\s\S]*?)<\/div>/i)?.[1];if(desc)o.description=aaClean(desc).slice(0,6000);
 // 29/10/2026 : ville du garage lue dans le bloc « Nos coordonnées » de la fiche (NOM<br>ADRESSE<br>CP VILLE).
 {const co=html.match(/Nos coordonn(?:é|e|&eacute;)es\s*<\/h\d>\s*(?:<div[^>]*>\s*)?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]||html.match(/id="contact-telephone"[\s\S]{0,400}?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'';
  for(const line of co.split(/<br\s*\/?>/i).map(l=>aaClean(l))){const m=line.match(/^(?:F-)?(\d{5})\s+(.{2,60})$/);if(m){o.code_postal=m[1];o.ville=m[2].trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(x:string,a:string,b:string)=>a+b.toUpperCase());break;}}}
 o.photos=aaPhotos(html,url);
 if(!o.photos)delete o.photos;
 return o;
}
// 29/10/2026 : sites de garages faits par Spider VO (modèle « svosite ») : liste /<n°>/vehicules/ (tout le stock sur une page),
// fiches « …,svoc<n°>.html?vid=<id> » avec tableau de caractéristiques, galerie spidervo.s3 et options.
const isSpiderVoSite=(t:string)=>/svositec|spidervo\.s3/i.test(t)&&/,svoc\d+\.html|\/\d+\/vehicules\//i.test(t);
function svoCap(v:string){return v.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m:string,a:string,b:string)=>a+b.toUpperCase());}
function parseSpiderVoDetail(html:string,url:string,vid:string){
 const o:any={reference:vid,url,etat:'occasion'};
 if(/class="ribbon"[\s\S]{0,200}?>\s*(?:VENDU|R[ÉE]SERV[ÉE])\s*</i.test(html))o._svo_sold='1';
 const ld=ldBlocks(html).find(x=>ldTypes(x).includes('product'))||{};
 const h1=aaClean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 const h2=aaClean(html.match(/<\/h1>\s*(?:<span>)?\s*<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]||'');
 o.titre=[h1,h2].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()||decodeEntities(String(ld.name||'')).replace(/\s+/g,' ').trim();
 if(ld.brand?.name)o.marque=String(ld.brand.name);
 const pr=html.match(/class="montant"[^>]*>\s*([\d\s .]+)\s*(?:&euro;|€)/i)?.[1]||String(ld.offers?.price||'');if(pr&&/\d/.test(pr))o.prix=pr.replace(/[^\d]/g,'');
 const box=html.match(/caracteristiques_techniques"\s*>([\s\S]*?)<div id="svositec_contenu_onglet_2"/i)?.[1]||html.match(/class="contenu_onglet[^"]*caracteristiques_techniques"[^>]*>([\s\S]{0,8000})/i)?.[1]||'';
 const kv:Record<string,string>={};
 for(const m of box.matchAll(/<div>\s*<span>([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>\s*<\/div>/gi)){const k=aaClean(m[1]).toLowerCase(),v=aaClean(m[2]);if(k&&v&&!/^\{.*\}$/.test(v))kv[k]=v;}
 const g=(...ks:string[])=>{for(const k of ks){const v=kv[k.toLowerCase()];if(v)return v;}return'';};
 const map:[string[],string][]=[[['Energie','Énergie','Carburant'],'carburant'],[['Boîte','Boite'],'boite'],[['Kilométrage'],'kilometrage'],[['Date de mise en circulation','Mise en circulation'],'mise_en_circulation'],[['Couleur extérieure'],'couleur'],[['Couleur intérieure'],'sellerie'],[['Nombre de places'],'places'],[['Nombre de portes'],'portes'],[['Puissance'],'puissance_din'],[['Puissance fiscale'],'puissance_fiscale'],[['Emission CO2','Émission CO2'],'co2'],[['Catégorie de véhicule','Carrosserie'],'carrosserie'],[['Garantie'],'garantie'],[["Crit'air","Crit’air"],'crit_air'],[['Marque'],'marque'],[['Modèle'],'modele'],[['Version'],'version']];
 for(const[ks,key]of map){const v=g(...ks);if(v&&!o[key])o[key]=v;}
 if(o.kilometrage)o.kilometrage=o.kilometrage.replace(/[^\d]/g,'');
 if(o.puissance_din)o.puissance_din=o.puissance_din.replace(/[^\d]/g,'');
 if(o.crit_air)o.crit_air=o.crit_air.replace(/^crit.air\s*/i,'');
 const mec=String(o.mise_en_circulation||'').match(/((?:19|20)\d{2})/);if(mec)o.annee=mec[1];
 if(!o.modele&&h1&&o.marque){const rest=h1.replace(new RegExp('^'+o.marque.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*','i'),'').trim();if(rest)o.modele=svoCap(rest);}
 if(o.marque)o.marque=svoCap(o.marque);
 if(h2&&!o.version)o.finition=h2;
 const genre=g('Genre');const cat=norm(o.carrosserie||'');
 o.type=/moto|scooter|quad|\bmtl\b/i.test(genre+' '+cat)?'moto':/\(vu\)|utilitaire|fourgon|camion|plateau|benne/i.test(genre+' '+(o.carrosserie||''))?'utilitaire':/camping/i.test(cat)?'camping-car':'voiture';
 if(o.carrosserie)o.carrosserie=svoCap(o.carrosserie);
 const desc=String(ld.description||'')||aaClean(html.match(/id="profile-description"[\s\S]*?class="text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]||'');if(desc)o.description=decodeEntities(desc).replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,6000);
 const opts:string[]=[];for(const m of html.matchAll(/<span class="clearfix">\s*([\s\S]*?)<\/span>/gi)){const x=aaClean(m[1]).replace(/\.\.\.$/,'').trim();if(x&&x.length<120&&!opts.includes(x))opts.push(x);}if(opts.length)o.equipements=opts.slice(0,150).join('|');
 const photos:string[]=[];const gal=html.match(/id="imageGallery"[\s\S]*?<\/ul>/i)?.[0]||html;
 for(const m of gal.matchAll(/data-src="(https?:\/\/[^"]*spidervo[^"]*\/image_\d+_\d+\.(?:jpe?g|png|webp))"/gi)){if(!photos.includes(m[1]))photos.push(m[1]);}
 if(!photos.length&&ld.image)photos.push(...(Array.isArray(ld.image)?ld.image:[ld.image]).map(String));
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 const addr=html.match(/class="informations"[\s\S]{0,1500}?(\d{5})\s*-\s*([^<]{2,60})</i);if(addr){o.code_postal=addr[1];o.ville=svoCap(decodeEntities(addr[2]).trim());}
 return o;
}
async function readSpiderVo(start:URL,html:string){
 const siteId=html.match(/href="(?:https?:\/\/[^"\/]+)?\/(\d+)\/vehicules\/?"/i)?.[1]||html.match(/,svoc(\d+)\.html/i)?.[1];
 if(!siteId)throw Error('Site Spider VO reconnu, mais la page des véhicules est introuvable.');
 const listUrl=new URL(`/${siteId}/vehicules/`,start);
 const{text:list,url:lu}=await fetchSiteHtml(listUrl).catch(e=>{throw Error(`Liste des véhicules illisible : ${e instanceof Error?e.message:String(e)}`);});
 const links=new Map<string,string>();
 for(const m of list.matchAll(/href="([^"]*,svoc\d+\.html\?vid=(\d+))"/gi)){if(links.has(m[2]))continue;try{const u=new URL(decodeEntities(m[1]),lu);if(u.hostname.replace(/^www\./,'')===lu.hostname.replace(/^www\./,''))links.set(m[2],u.toString());}catch{}}
 if(!links.size)throw Error('Aucun véhicule trouvé sur le site Spider VO : synchronisation annulée par sécurité.');
 const entries=[...links.entries()].slice(0,300);const rows:any[]=[];let i=0;
 // Les sites Spider VO limitent les lectures rapprochées : 2 fiches à la fois, et une fiche incomplète est relue après une pause.
 const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
 await Promise.all(Array.from({length:2},async()=>{while(i<entries.length){const[vid,url]=entries[i++];let o:any=null;
  for(let attempt=0;attempt<3;attempt++){try{if(attempt)await sleep(1200*attempt);const{text}=await fetchSiteHtml(new URL(url));o=parseSpiderVoDetail(text,url,vid);if(o.titre&&o.photos&&o.prix)break;}catch{o=o||null;}}
  if(o?._svo_sold)continue;rows.push(o?.titre?o:{reference:vid,url});await sleep(250);}}));
 return rows;
}
async function readAaSite(origin:URL){
 const links=new Map<string,string>();
 let page=new URL('/annonces',origin);
 for(let p=1;p<=30;p++){
  const{text,url}=await fetchSiteHtml(page).catch(e=>{throw Error(`Liste des véhicules illisible (page ${p}) : ${e instanceof Error?e.message:String(e)}`);});
  const before=links.size;for(const[k,v]of aaListLinks(text.replace(/<div[^>]*id="(?:similaires|annonces-similaires)"[\s\S]*$/i,''),url))if(!links.has(k))links.set(k,v);
  const next=text.match(/href="([^"]*[?&]p=(\d+))"[^>]*>\s*Page suivante/i);
  if(!next||links.size===before)break;
  page=new URL(decodeEntities(next[1]),url);
 }
 if(!links.size)throw Error('Aucun véhicule trouvé sur le site (mise en page inconnue) : synchronisation annulée par sécurité.');
 const entries=[...links.entries()].slice(0,300);const rows:any[]=[];let i=0;
 await Promise.all(Array.from({length:4},async()=>{while(i<entries.length){const[id,url]=entries[i++];try{const{text}=await fetchSiteHtml(new URL(url));const o=parseAaDetail(text,url,id);
   // Fiche momentanément illisible ou vendue entre la liste et la fiche : la référence reste « vue » (pas d'archivage),
   // et la ligne part en erreur (titre manquant) sans écraser l'annonce existante.
   rows.push(o._aa_missing?{reference:id,url}:o);}catch{rows.push({reference:id,url});}}}));
 return rows;
}
// Sites de garages sous WordPress + WooCommerce (ex. centurionmotors.fr) : API publique « Store » de WooCommerce
// (nom, prix, toutes les photos, description, catégories), puis la fiche pour les caractéristiques (km, année…).
// Véhicules « vendus » (catégorie vendu/sold) ou hors stock exclus : ils seront archivés en synchro complète.
async function fetchSiteJson(start:URL){
 let u=new URL(start.toString());let r:Response;
 for(let redirects=0;;redirects++){
  await publicFeedUrl(u);
  r=await fetch(u.toString(),{headers:{Accept:'application/json','User-Agent':'Abracadeal-StockSync/1.0 (+https://abracadeal.fr)'},redirect:'manual',signal:AbortSignal.timeout(25000)});
  if(r.status<300||r.status>=400)break;
  const loc=r.headers.get('location');await r.body?.cancel();if(!loc||redirects>=4)throw Error('Redirection invalide');u=new URL(loc,u);
 }
 if(!r.ok){await r.body?.cancel();throw Error(`HTTP ${r.status}`);}
 const text=await r.text();if(text.length>30_000_000)throw Error('Réponse trop volumineuse');
 return{data:JSON.parse(text),totalPages:Number(r.headers.get('x-wp-totalpages')||0)};
}
async function isWooSite(origin:URL){try{const{data}=await fetchSiteJson(new URL('/wp-json/wc/store/v1/products?per_page=1',origin));return Array.isArray(data)&&(!data.length||!!data[0]?.prices);}catch{return false;}}
const WOO_LABELS:[string,string][]=[['Kilométrage','kilometrage'],['Kilometrage','kilometrage'],['Année','annee'],['Mise en circulation','mise_en_circulation'],['Puissance fiscale','puissance_fiscale'],['Puissance fiscal','puissance_fiscale'],['Puissance','puissance_din'],['Boite de vitesse','boite'],['Boîte de vitesse','boite'],['Boîte','boite'],['Carburant','carburant'],['Energie','carburant'],['Énergie','carburant'],['Intérieur','sellerie'],['Extérieur','couleur'],['Couleur','couleur'],['Nombres de portes','portes'],['Nombre de portes','portes'],['Portes','portes'],['Consommation','_conso'],['Prix','_prix']];
function wooSpecs(html:string){
 const text=decodeEntities(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
 const start=text.search(/Kilom[ée]trage|Ann[ée]e\b|Carburant/i);if(start<0)return{};
 const zone=text.slice(start,start+800).split(/Nous contacter|Description|Votre financement/i)[0];
 const alt=WOO_LABELS.map(l=>l[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length).join('|');
 const o:any={};
 for(const m of zone.matchAll(new RegExp(`(${alt})\\s*:?\\s*(.+?)(?=\\s+(?:${alt})\\b|$)`,'gi'))){
  const key=WOO_LABELS.find(l=>l[0].toLowerCase()===m[1].toLowerCase())?.[1];const v=m[2].trim();
  if(key&&v&&v!=='0'&&v!=='-'&&o[key]===undefined)o[key]=v.slice(0,80);
 }
 return o;
}
async function readWooSite(origin:URL){
 const items:any[]=[];
 for(let page=1;page<=20;page++){
  const{data,totalPages}=await fetchSiteJson(new URL(`/wp-json/wc/store/v1/products?per_page=100&page=${page}`,origin)).catch(e=>{throw Error(`Liste des véhicules illisible (page ${page}) : ${e instanceof Error?e.message:String(e)}`);});
  if(!Array.isArray(data))throw Error('Réponse WooCommerce inattendue : synchronisation annulée par sécurité.');
  items.push(...data);if(!data.length||page>=(totalPages||1))break;
 }
 const catSlugs=(p:any)=>(p.categories||[]).map((c:any)=>norm(c.slug||c.name));
 const sold=(p:any)=>catSlugs(p).some((s:string)=>/(^|_)(vendu|vendus|sold|reserve|reserves)($|_)/.test(s));
 const hasDispo=items.some(p=>catSlugs(p).some((s:string)=>/^disponibles?$/.test(s)));
 const live=items.filter(p=>p.is_in_stock!==false&&!sold(p)&&(!hasDispo||catSlugs(p).some((s:string)=>/^disponibles?$/.test(s))));
 if(!live.length)throw Error('Aucun véhicule disponible trouvé sur le site : synchronisation annulée par sécurité.');
 const rows:any[]=[];let i=0;const list=live.slice(0,300);
 await Promise.all(Array.from({length:4},async()=>{while(i<list.length){const p=list[i++];
  const minor=Number(p.prices?.currency_minor_unit||0);const raw=Number(p.prices?.price||0);
  const o:any={reference:String(p.id),url:p.permalink,titre:decodeEntities(String(p.name||'')).replace(/\s+/g,' ').trim(),etat:'occasion',type:'voiture'};
  if(raw>0)o.prix=String(Math.round(raw/10**minor));
  const brand=(p.brands||[])[0]?.name||(p.categories||[]).map((c:any)=>c.name).find((n:string)=>!/^(disponibles?|vendus?|sold|non class)/i.test(n));if(brand)o.marque=decodeEntities(brand);
  const desc=aaClean(String(p.description||p.short_description||'').replace(/<\/p>/gi,'\n'));if(desc)o.description=desc.slice(0,6000);
  // Attributs WooCommerce (Marque, Énergie, Boîte, Mise en circulation, Kilométrage, Couleur…).
  for(const at of Array.isArray(p.attributes)?p.attributes:[]){const n=norm(at?.name);const v=decodeEntities(String((at?.terms||[]).map((t:any)=>t?.name).filter(Boolean).join(', '))).trim();if(!v)continue;
   if(/marque|brand/.test(n))o.marque=v;else if(/modele|model/.test(n))o.modele=v;else if(/energie|carburant|fuel/.test(n))o.carburant=v;else if(/boite|transmission/.test(n))o.boite=v;else if(/couleur|color/.test(n))o.couleur=v;
   else if(/circulation|immatriculation|annee|year/.test(n)){const y=v.match(/((?:19|20)\d{2})/);if(y){o.annee=y[1];o.mise_en_circulation=v;}}
   else if(/kilometrage|km|mileage/.test(n)&&/^\d[\d\s.]*$/.test(v))o.kilometrage=v.replace(/\D/g,'');
   else if(/puissance_fiscale|cv_fiscaux/.test(n))o.puissance_fiscale=v.replace(/\D/g,'');else if(/puissance|ch_din/.test(n))o.puissance_din=v.replace(/[^\d]/g,'');else if(/portes/.test(n))o.portes=v.replace(/\D/g,'');else if(/places/.test(n))o.places=v.replace(/\D/g,'');}
  const photos:string[]=[];for(const im of p.images||[]){const u=String(im?.src||'');if(/^https?:\/\//i.test(u)&&!photos.includes(u))photos.push(u);}
  if(photos.length)o.photos=photos.slice(0,45).join('|');
  if(/\b(sprinter|vito|transporter|trafic|master|jumper|boxer|ducato|fourgon|utilitaire)\b/i.test(o.titre))o.type='utilitaire';
  try{if(p.permalink){const{text}=await fetchSiteHtml(new URL(p.permalink));Object.assign(o,{...wooSpecs(text),...o});
   if(o.puissance_din&&/^\d+$/.test(o.puissance_din))o.puissance_din+=' ch';
   if(o.annee&&!o.mise_en_circulation)o.mise_en_circulation=o.annee;}}catch{}
  rows.push(o);}}));
 return rows;
}
// Boutiques Shopify : catalogue public /products.json (titre, prix, photos, description, disponibilité).
async function readShopify(origin:URL,sector:string){
 const rows:any[]=[];
 for(let page=1;page<=8;page++){
  const{data}=await fetchSiteJson(new URL(`/products.json?limit=250&page=${page}`,origin)).catch(e=>{throw Error(`Catalogue Shopify illisible : ${e instanceof Error?e.message:String(e)}`);});
  const list=Array.isArray(data?.products)?data.products:[];
  for(const p of list){
   const variants=Array.isArray(p.variants)?p.variants:[];if(variants.length&&!variants.some((v:any)=>v.available!==false))continue;
   const price=Number(variants[0]?.price||0);if(!(price>0))continue;
   const desc=aaClean(String(p.body_html||'').replace(/<\/p>/gi,'\n'));
   const o:any={reference:String(p.id),url:new URL('/products/'+p.handle,origin).toString(),titre:sDecode(String(p.title||'')).trim(),prix:String(Math.round(price)),description:desc.slice(0,6000)};
   const photos=(p.images||[]).map((im:any)=>String(im?.src||'')).filter((u:string)=>/^https?:/i.test(u));if(photos.length)o.photos=photos.slice(0,45).join('|');
   const all=o.titre+' '+desc;
   if(sector==='immobilier'){o.transaction=/louer|location|loyer/i.test(all)?'location':'vente';o.type_bien=/maison|villa/i.test(all)?'maison':/terrain/i.test(all)?'terrain':'appartement';const sm=all.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)(?![a-z0-9])/i);if(sm)o.surface=sm[1];const pc=all.match(/(\d{1,2})\s*pi[eè]ces?/i);if(pc)o.pieces=pc[1];}
   else{const km=all.match(/(\d{1,3}(?:[\s.\u00a0]\d{3})+|\d{1,6})\s*km\b/i);if(km)o.kilometrage=km[1].replace(/[\s.\u00a0]/g,'');const y=all.match(/\b((?:19[5-9]|20[0-3])\d)\b/);if(y)o.annee=y[1];o.etat='occasion';o.type=/\b(moto|scooter|quad)\b/i.test(all)?'moto':'voiture';if(p.vendor)o.marque=String(p.vendor);}
   rows.push(o);
  }
  if(list.length<250)break;
 }
 if(!rows.length)throw Error('Aucune annonce disponible trouvée dans la boutique Shopify : synchronisation annulée par sécurité.');
 return rows;
}
// Sites de garages Starterre (ex. autoca.fr) : le catalogue vient du moteur de recherche Typesense de Starterre
// (clé publique de recherche présente dans la page). Il mélange le stock du garage et le catalogue « Fournisseur »
// du réseau : on ne garde que le stock propre du garage, puis chaque fiche pour toutes les photos.
const isStarterreSite=(html:string)=>/StarterreTypesense\.key\s*=/.test(html)&&/resellerUniqueId\s*=/.test(html);
async function readStarterreSite(origin:URL,html:string){
 const key=html.match(/StarterreTypesense\.key\s*=\s*'([^']+)'/)?.[1];const host=html.match(/StarterreTypesense\.host\s*=\s*'([a-z0-9.-]+)'/i)?.[1]||'typesense.starterre.fr';
 const reseller=html.match(/resellerUniqueId\s*=\s*'([0-9a-f-]{20,60})'/i)?.[1];
 if(!key||!reseller||!/(^|\.)starterre\.(fr|net|com)$/i.test(host))throw Error('Site Starterre : paramètres du catalogue introuvables.');
 const items:any[]=[];
 for(let page=1;page<=20;page++){
  const u=new URL(`https://${host}/collections/vehicles_tie_${reseller}/documents/search`);
  u.searchParams.set('q','*');u.searchParams.set('per_page','250');u.searchParams.set('page',String(page));
  // Stock propre du garage seulement (le catalogue « Fournisseur » est celui du réseau Starterre).
  u.searchParams.set('filter_by','catalogue:!=Fournisseur');
  await publicFeedUrl(u);
  const r=await fetch(u.toString(),{headers:{'X-TYPESENSE-API-KEY':key,Accept:'application/json','User-Agent':'Abracadeal-StockSync/1.0 (+https://abracadeal.fr)'},signal:AbortSignal.timeout(20000)});
  if(!r.ok){await r.body?.cancel();throw Error(`Catalogue Starterre illisible (HTTP ${r.status}) : synchronisation annulée par sécurité.`);}
  const data=await r.json();const hits=Array.isArray(data?.hits)?data.hits:[];
  for(const h of hits){const d=h?.document;if(d&&!/^fournisseur$/i.test(String(d.catalogue||'')))items.push(d);}
  if(hits.length<250)break;
 }
 if(!items.length)throw Error('Aucun véhicule du garage trouvé dans le catalogue Starterre : synchronisation annulée par sécurité.');
 const rows:any[]=[];let i=0;const list=items.slice(0,300);
 await Promise.all(Array.from({length:4},async()=>{while(i<list.length){const d=list[i++];
  // La version répète souvent la fin du modèle (« C3 Aircross » + « Aircross BlueHDi… ») : on enlève la répétition.
  const mw=String(d.modele||'').trim().split(/\s+/).filter(Boolean);let vw=String(d.version||'').trim().split(/\s+/).filter(Boolean);
  for(let k=Math.min(mw.length,vw.length);k>0;k--){if(mw.slice(-k).join(' ').toLowerCase()===vw.slice(0,k).join(' ').toLowerCase()){vw=vw.slice(k);break;}}
  const o:any={reference:String(d.ref||d.id),titre:[d.marque,d.modele,vw.join(' ')].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(),marque:d.marque||'',modele:d.modele||'',version:d.version||''};
  if(Number(d.prix)>0)o.prix=String(Math.round(Number(d.prix)));
  if(d.kmCompteur!=null)o.kilometrage=String(d.kmCompteur);
  const date=String(d.dateImmatriculation||'');const y=date.match(/((?:19|20)\d{2})/);if(y){o.annee=y[1];o.mise_en_circulation=date;}
  if(d.energie)o.carburant=String(d.energie);if(d.boiteVitesse)o.boite=String(d.boiteVitesse);if(d.couleur)o.couleur=String(d.couleur);
  if(d.puissanceDin)o.puissance_din=String(d.puissanceDin);if(d.nbPlaces)o.places=String(d.nbPlaces).replace(/\D/g,'');
  const cat=String(d.categorie||'');o.carrosserie=cat;
  o.type=/camping|camion a chevaux/i.test(cat)?'camping-car':/utilitaire|pick up/i.test(cat)?'utilitaire':/moto|scooter|quad/i.test(cat)?'moto':'voiture';
  o.etat=Number(d.occasion)===1||Number(d.kmCompteur)>100?'occasion':'neuf';
  const equip=(Array.isArray(d.pictos)?d.pictos:[]).map((p:string)=>String(p).split('|')[0].trim()).filter(Boolean);if(equip.length)o.equipements=equip.join('|');
  o.description=[d.specifOption?String(d.specifOption):'',equip.length?'Équipements : '+equip.join(', ')+'.':''].filter(Boolean).join('\n\n');
  o.url=String(d.link||'');
  const photos:string[]=[];
  try{if(o.url&&new URL(o.url).hostname===origin.hostname){const{text}=await fetchSiteHtml(new URL(o.url));
   for(const m of text.matchAll(/https:\/\/stx\.starterre\.net\/vehicules\/xlarge\/[^"'\s)<>]+\.(?:jpe?g|png|webp)/gi))if(!photos.includes(m[0]))photos.push(m[0]);}}catch{}
  if(!photos.length&&d.photoPrincipale)photos.push(String(d.photoPrincipale));
  // Photo principale en premier quand elle existe en grand format.
  const main=String(d.photoPrincipale||'').split('/').pop();if(main){const k=photos.findIndex(p=>p.endsWith('/'+main));if(k>0)photos.unshift(...photos.splice(k,1));}
  if(photos.length)o.photos=photos.slice(0,45).join('|');
  rows.push(o);}}));
 return rows;
}
// Réseau « L'Agence Automobilière » (agenceauto.com, site Next.js) : une page par agence (/fr/fr/agences/<ville>).
// Liste du stock de l'agence : /fr/fr/vehicules?agencyId=<id>&page=N ; chaque fiche contient l'objet « vehicle »
// complet (photos, caractéristiques, description, agence) dans les données Next.js de la page.
const isAgenceAutoSite=(u:URL)=>/(^|\.)agenceauto\.com$/i.test(u.hostname);
function nextFlightText(html:string){let out='';for(const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)){try{out+=JSON.parse('"'+m[1]+'"');}catch{}}return out;}
function jsonObjectAt(text:string,start:number){let depth=0,inStr=false,esc=false;for(let i=start;i<text.length;i++){const c=text[i];if(inStr){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inStr=false;continue;}if(c==='"')inStr=true;else if(c==='{')depth++;else if(c==='}'){depth--;if(!depth){try{return JSON.parse(text.slice(start,i+1));}catch{return null;}}}}return null;}
const aaVal=(v:any)=>{const x=String(v??'').trim();return !x||x==='$undefined'||/^n\/a$/i.test(x)||x==='/'?'':x;};
function parseAgenceAutoDetail(html:string,url:string){
 const flight=nextFlightText(html);const k=flight.indexOf('"vehicle":{');if(k<0)return null;
 const v=jsonObjectAt(flight,k+'"vehicle":'.length);if(!v||!v.reference)return null;
 if(v.isSold||v.isUnavailable||v.isUnderSaleAgreement)return{_sold:1,reference:String(v.reference)};
 const ch:Record<string,string>={};for(const c of [...(v.characteristics||[]),...(v.historique||[])]){const l=String(c?.label||'').toLowerCase();const val=aaVal(c?.value);if(l&&val&&!ch[l])ch[l]=val;}
 const o:any={reference:String(v.reference),url,titre:[aaVal(v.title),aaVal(v.subtitle)].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(),etat:v.isNew?'neuf':'occasion'};
 const price=String(v.price?.total||'').replace(/[^\d]/g,'');if(price)o.prix=price;
 const ag=v.agency||{};if(aaVal(ag.location))o.ville=aaVal(ag.location);if(aaVal(ag.zipCode))o.code_postal=aaVal(ag.zipCode);
 o.marque=aaVal(v.make?.name)||ch['marque']||'';if(ch['modèle'])o.modele=ch['modèle'];if(ch['moteur / finition'])o.finition=ch['moteur / finition'];
 const km=(ch['kilométrage']||v.specs?.mileage||'').replace(/[^\d]/g,'');if(km)o.kilometrage=km;
 const mec=ch['date de 1ère mise en circulation']||ch['année']||aaVal(v.specs?.year);const y=mec.match(/((?:19|20)\d{2})/);if(y){o.annee=y[1];o.mise_en_circulation=mec;}
 const fuel=ch['carburant']||aaVal(v.specs?.fuel);if(fuel)o.carburant=fuel;const bv=ch['boîte de vitesse']||aaVal(v.specs?.gearbox);if(bv)o.boite=bv;
 if(ch['couleur'])o.couleur=ch['couleur'];if(ch['intérieur'])o.sellerie=ch['intérieur'];
 const din=(ch['puissance din']||'').replace(/[^\d]/g,'');if(din)o.puissance_din=din;const cv=(ch['puissance fiscale']||'').replace(/[^\d]/g,'');if(cv)o.puissance_fiscale=cv;
 const portes=(ch['nombre de portes']||'').replace(/[^\d]/g,'');if(portes)o.portes=portes;const places=(ch['nombre de places']||'').replace(/[^\d]/g,'');if(places)o.places=places;
 const crit=(ch['critair']||'').replace(/[^\d]/g,'');if(crit)o.crit_air=crit;
 if(ch['contrôle technique'])o.controle_technique=ch['contrôle technique'];if(ch["historique d'entretien"])o.entretien=ch["historique d'entretien"];
 const gar=ch['garantie commerciale']||aaVal(v.guarantee);if(gar)o.garantie=gar;
 const usage=(ch['type de véhicule']||ch["type d'usage"]||'').toUpperCase();
 o.type=/MOTO|SCOOTER|QUAD|MTL/.test(usage)?'moto':/CAMPING|VASP/.test(usage)?'camping-car':/^(VU|CTTE|DERIV)/.test(usage)?'utilitaire':'voiture';
 const equip=(Array.isArray(v.equipment)?v.equipment:[]).map((e:any)=>aaVal(typeof e==='string'?e:(e?.label||e?.name))).filter(Boolean);if(equip.length)o.equipements=equip.join('|');
 const pres=aaVal(v.presentation).replace(/\r/g,'');o.description=[pres,equip.length?'Équipements : '+equip.join(', ')+'.':''].filter(Boolean).join('\n\n').slice(0,6000);
 const photos:string[]=[];for(const im of Array.isArray(v.images)?v.images:[]){const u=String(im||'');if(/^https?:\/\//i.test(u)&&!photos.includes(u))photos.push(u);}
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 return o;
}
async function readAgenceAuto(url:URL,html:string){
 const m=url.pathname.match(/^\/([a-z]{2})\/([a-z]{2})\/[a-z]+\/([a-z0-9-]+)/i);
 let agencyId=url.searchParams.get('agencyId')||'';
 if(!agencyId&&m&&/\/(agences|agentschap|agenturen|agenzie|agencias|agencies)\//i.test(url.pathname)){
  let page=html;if(/\.html$/i.test(url.pathname)){({text:page}=await fetchSiteHtml(new URL(`/${m[1]}/${m[2]}/agences/${m[3]}`,url)));}
  agencyId=page.match(/vehicules\?agencyId=(\d+)/)?.[1]||'';
 }
 if(!/^\d+$/.test(agencyId)){const err:any=new Error("C'est le site du réseau L'Agence Automobilière (toutes les agences) : entrez l'adresse de la page de votre agence, par exemple https://agenceauto.com/fr/fr/agences/epone.");err.platform="L'Agence Automobilière (réseau)";throw err;}
 const base=`/${m?.[1]||'fr'}/${m?.[2]||'fr'}/vehicules`;const links=new Set<string>();
 for(let page=1;page<=20;page++){
  const u=new URL(base,url);u.searchParams.set('agencyId',agencyId);if(page>1)u.searchParams.set('page',String(page));
  const{text}=await fetchSiteHtml(u).catch(e=>{throw Error(`Liste des véhicules illisible (page ${page}) : ${e instanceof Error?e.message:String(e)}`);});
  const before=links.size;for(const x of text.matchAll(/href="(\/[a-z]{2}\/[a-z]{2}\/agences\/[a-z0-9-]+\/[a-z0-9-]+\.html)"/gi))links.add(new URL(x[1],url).toString());
  if(links.size===before||!text.includes(`page=${page+1}`))break;
 }
 if(!links.size)throw Error("Aucun véhicule trouvé pour cette agence : synchronisation annulée par sécurité.");
 const list=[...links].slice(0,300);const rows:any[]=[];let i=0;
 await Promise.all(Array.from({length:4},async()=>{while(i<list.length){const u=list[i++];const id=u.match(/-([0-9a-f]{10,})\.html$/i)?.[1]||u;
  try{const{text}=await fetchSiteHtml(new URL(u));const o=parseAgenceAutoDetail(text,u);if(o&&!o._sold)rows.push(o);else if(!o)rows.push({reference:id,url:u});}catch{rows.push({reference:id,url:u});}}}));
 return rows;
}
// Agences Orpi (pages agence sur orpi.com, ex. orpi.com/agimmo) : liste « acheter » et « louer » de l'agence,
// puis chaque fiche, dont toutes les données sont dans l'attribut data-estate (JSON).
const ORPI_ENERGY=['','A','B','C','D','E','F','G'];
function orpiAgencySlug(u:URL){if(!/(^|\.)orpi\.com$/i.test(u.hostname))return null;const s=u.pathname.split('/').filter(Boolean)[0]||'';return /^[a-z0-9-]{2,60}$/i.test(s)&&!/^(annonce|acheter|louer|vendre|estimer|agences?|recherche)/i.test(s)?s:null;}
function parseOrpiEstate(html:string,url:string){
 const raw=html.match(/data-estate="([^"]*)"/)?.[1];if(!raw)return null;
 let e:any;try{e=JSON.parse(decodeEntities(raw));}catch{return null;}
 if(!e||e.sold||e.enabled===false)return null;
 const o:any={reference:String(e.reference||e.id||''),url,titre:decodeEntities(String(e.seo?.metaTitle||e.title||'')).replace(/\s*\|\s*Orpi\s*$/i,'').replace(/,\s*[\d\s\u00a0\u202f.]+€\s*$/,'').replace(/(\d)?\s+m²/,(m:string,d:string)=>d?m:'').replace(/\s{2,}/g,' ').trim()};
 if(Number(e.price)>0)o.prix=String(Math.round(Number(e.price)));
 o.transaction=/rent|location|louer/i.test(String(e.transaction||''))?'location':'vente';
 const t=String(e.type||'').toLowerCase();o.type_bien=/stationnement|parking|garage|box/.test(t)?'parking':/terrain/.test(t)?'terrain':/maison|villa/.test(t)?'maison':/local|bureau|commerce/.test(t)?'bureau':t||'appartement';
 if(e.city?.name)o.ville=decodeEntities(String(e.city.name));if(e.zipCode||e.zipcode)o.code_postal=String(e.zipCode||e.zipcode);
 if(e.surface)o.surface=String(e.surface);if(e.nbRooms)o.pieces=String(e.nbRooms);if(e.nbBedrooms)o.chambres=String(e.nbBedrooms);if(e.nbWashrooms)o.salles_de_bain=String(e.nbWashrooms);
 if(e.story!=null&&e.story!=='')o.etage=String(e.story);
 if(e.dpeDisplay===false&&/DPE non requis|DPE non soumis/i.test(html))o.dpe='NON SOUMIS';if(e.dpeDisplay!==false){const c=ORPI_ENERGY[Number(e.consumptionIndex)||0],g=ORPI_ENERGY[Number(e.emissionIndex)||0];if(c&&g){o.dpe=c;o.ges=g;}else if(/DPE non requis|DPE non soumis|c-dpe--inactive/i.test(html))o.dpe='NON SOUMIS';if(e.consumptionValue)o.consommation_energie=String(e.consumptionValue);if(e.energyMin)o.cout_energie_min=String(e.energyMin);if(e.energyMax)o.cout_energie_max=String(e.energyMax);if(e.dpeDate)o.date_dpe=String(e.dpeDate).slice(0,10);}
 if(e.fees)o.honoraires=decodeEntities(String(e.fees));if(e.condoCharge&&o.transaction==='vente')o.charges_annuelles=String(e.condoCharge);
 const feats=[e.elevator&&'Ascenseur',e.garage&&'Garage',e.nbParkingSpaces&&'Parking',e.cellar&&'Cave',e.terrace&&'Terrasse',e.balcony&&'Balcon',e.garden&&'Jardin',e.swimmingPool&&'Piscine',e.disabledAccess&&'Accès handicapé'].filter(Boolean);if(feats.length)o.prestations=feats.join('|');
 if(e.longAd)o.description=decodeEntities(String(e.longAd)).replace(/\r/g,'').slice(0,6000);
 const photos:string[]=[];for(const u of [...(e.imagesFull||[]),...(e.images||[])]){const x=decodeEntities(String(u||''));if(/^https?:\/\//i.test(x)){const id=x.split('?')[0];if(!photos.some(p=>p.split('?')[0]===id))photos.push(x);}}
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 return o.reference&&o.titre?o:null;
}
async function readOrpiAgency(origin:URL,slug:string){
 const links=new Map<string,string>();
 // 29/10/2026 : « /acheter » ne montre qu'une sélection (≈ 9 biens) ; la liste complète est « /acheter/biens-en-vente » (pages de 30).
 for(const listPath of [`/${slug}/acheter/biens-en-vente`,`/${slug}/louer/biens-en-location`,`/${slug}/acheter`]){
  for(let page=1;page<=40;page++){
   const u=new URL(listPath,origin);if(page>1)u.searchParams.set('page',String(page));
   const{text}=await fetchSiteHtml(u).catch(e=>{throw Error(`Liste des biens illisible (${listPath}, page ${page}) : ${e instanceof Error?e.message:String(e)}`);});
   const before=links.size;
   for(const m of text.matchAll(/href="(\/annonce-[a-z0-9-]+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?[^"]*)"/gi)){if(!links.has(m[2]))links.set(m[2],new URL(decodeEntities(m[1]),origin).toString());}
   if(links.size===before)break;
  }
 }
 if(!links.size)throw Error('Aucun bien trouvé sur la page de l\'agence Orpi : synchronisation annulée par sécurité.');
 // Grosse agence : 220 fiches par passage (limite de calcul), fenêtre décalée chaque jour pour tout couvrir en quelques synchros.
 const MAX=220;const all=[...links.entries()];const off=all.length>MAX?(Math.floor(Date.now()/86400000)*MAX)%all.length:0;const entries=[...all.slice(off),...all.slice(0,off)].slice(0,MAX);const rows:any[]=[];let i=0;
 await Promise.all(Array.from({length:4},async()=>{while(i<entries.length){const[id,url]=entries[i++];try{const{text}=await fetchSiteHtml(new URL(url));const o=parseOrpiEstate(text,url);rows.push(o||{reference:id,url});}catch{rows.push({reference:id,url});}}}));
 // Stock plus grand que la limite : lecture partielle (aucun bien n'est retiré pour cette synchro).
 if(links.size>MAX){(rows as any).partial=true;(rows as any).capped=true;}
 (rows as any).total=links.size;
 return rows;
}
// Agences Century 21 (site propre de l'agence, ex. century21-gastaldy-cap-d-ail.com) : listes /annonces/achat/ et
// /annonces/location/ (pages /page-N/), puis chaque fiche /trouver_logement/detail/<id>/ (JSON-LD + page).
const C21_DPE:Record<string,string>={'#00a06d':'A','#52b153':'B','#a5cc74':'C','#f4e70f':'D','#f0b40f':'E','#eb8235':'F','#d7221f':'G'};
const C21_GES:Record<string,string>={'#a4dbf8':'A','#8cb4d3':'B','#7792b1':'C','#606f8f':'D','#4d5271':'E','#393551':'F','#281b35':'G'};
const isC21AgencySite=(u:URL,html:string)=>(/century21/i.test(u.hostname)&&!/(^|\.)century21\.fr$/i.test(u.hostname))||(/TYPE_SITE = 'AGENCE'/.test(html)&&/\/trouver_logement\/detail\//.test(html));
// Classe sélectionnée dans l'étiquette SVG : la barre suivie du contour noir (#1d1d1b).
function c21EnergyClass(svg:string,map:Record<string,string>){const paths=[...svg.matchAll(/<path\b[^>]*>/gi)].map(m=>m[0]);for(let i=1;i<paths.length;i++){if(/fill:#1d1d1b/i.test(paths[i])){const c=paths[i-1].match(/fill:(#[0-9a-f]{6})/i)?.[1]?.toLowerCase();if(c&&map[c])return map[c];}}return'';}
// DPE 2021 : classe énergie = la moins bonne des deux (énergie primaire kWh/m²/an, émissions kg CO2/m²/an).
function dpeFromValues(kwh:number,co2:number){if(!(kwh>0)||!(co2>=0))return null;const E=[70,110,180,250,330,420],G=[6,11,30,50,70,100],L='ABCDEFG';const ce=E.findIndex(x=>kwh<=x),cg=G.findIndex(x=>co2<=x);const ie=ce<0?6:ce,ig=cg<0?6:cg;return{dpe:L[Math.max(ie,ig)],ges:L[ig]};}
function parseC21Detail(html:string,url:string,transaction:string){
 const items=ldBlocks(html);
 const offer=items.find(x=>ldTypes(x).includes('offer'));
 // Les renvois { "@id": … } (sans @type) ne sont que des liens vers le vrai nœud du graphe.
 let prop=items.find(x=>x['@type']&&/#property$/.test(String(x['@id']||'')))||items.find(x=>ldTypes(x).some((t:string)=>IMMO_TYPES.includes(t)));
 // 29/10/2026 : certains sites d'agence (modèle « groupe ») n'ont pas de données structurées : on lit le titre <h1> (type, pièces, surface, VILLE - CP).
 if(!prop){const h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';const spans=[...h1.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map(m=>aaClean(m[1].replace(/<sup>\s*2\s*<\/sup>/gi,'²')).replace(/\s+/g,' ').trim()).filter(Boolean);
  if(!spans.length||!/c-the-property-abstract__price|c-the-detail-images__slides__item/.test(html))return null;
  const loc=spans.find(x=>/\b\d{5}\b/.test(x))||'';const lm=loc.match(/^(.+?)\s*-\s*(\d{5})/);
  const ref=html.match(/>\s*Ref\s*:\s*([A-Za-z0-9_-]+)\s*</i)?.[1];
  prop={name:spans.filter(x=>x!==loc).join(' - ')+(lm?` - ${lm[1]}`:''),identifier:ref?{name:'ref',value:ref}:undefined,address:lm?{addressLocality:lm[1].toLowerCase().replace(/(^|[\s'-])\p{L}/gu,(m:string)=>m.toUpperCase()),postalCode:lm[2]}:{}};}
 if(/>\s*(?:Vendu|Sous compromis|Lou[ée])\s*</i.test(html.match(/c-the-property-abstract[\s\S]{0,3000}/i)?.[0]||''))return null;
 if(/soldout|discontinued|outofstock/i.test(String(offer?.availability||'')))return null;
 const o:any={url,transaction};
 const id=(Array.isArray(prop.identifier)?prop.identifier:[prop.identifier]).find((x:any)=>x&&/ref/i.test(String(x.name||'')))?.value;
 // Référence stable = n° de fiche du site (le même que celui des listes) ; la réf. agence devient le n° de mandat.
 o.reference=String(url.match(/detail\/(\d+)/)?.[1]||id||'');if(id)o.mandat=String(id);
 const name=decodeEntities(String(prop.name||'')).replace(/\\u002D/g,'-');
 const parts=name.split(/\s+-\s+/);const dep=parts.findIndex((p,i)=>i>0&&/^(\d{2,3}|2[AB])$/i.test(p.trim()));
 o.titre=(dep>0?parts.slice(0,dep):parts.slice(0,4)).map((p,i)=>i&&/^[A-ZÀ-Ý' -]+$/.test(p)?p.toLowerCase().replace(/(^|[\s'-])\p{L}/gu,(m)=>m.toUpperCase()):p).join(' - ').replace(/(\d)(?:\.\d+)?\s*m2\b/g,'$1 m²').replace(/^\p{Ll}/u,(c)=>c.toUpperCase());
 const price=Number(offer?.price??0);if(price>0)o.prix=String(Math.round(price));
 else{const p=html.match(/c-the-property-abstract__price[^>]*>\s*([\d\s\u00a0.]+)(?:&nbsp;)?\s*(?:&euro;|€)/i)?.[1];if(p)o.prix=p.replace(/[^\d]/g,'');}
 const t=(ldTypes(prop).join(' ')+' '+name).toLowerCase();
 o.type_bien=/terrain/.test(t)?'terrain':/parking|garage|box/.test(t)?'parking':/bureau|local|commerce|boutique/.test(t)?'bureau':/house|maison|villa|residence/.test(t)?'maison':'appartement';
 const addr=prop.address||{};if(addr.addressLocality)o.ville=ldText(addr.addressLocality);if(addr.postalCode)o.code_postal=ldText(addr.postalCode);
 if(prop.numberOfRooms)o.pieces=ldText(prop.numberOfRooms);
 // Libellés « Nom : valeur » de la fiche.
 const kv:Record<string,string>={};
 for(const m of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){const txt=decodeEntities(m[1].replace(/<sup>\s*2\s*<\/sup>/gi,'²').replace(/<[^>]+>/g,' ').replace(/&thinsp;/g,' ')).replace(/[\s\u00a0\u2009]+/g,' ').trim();const kvm=txt.match(/^([^:]{2,60}?)\s*:\s*(.{1,120})$/);if(kvm&&!kv[kvm[1].toLowerCase()])kv[kvm[1].toLowerCase()]=kvm[2].trim();}
 const g=(...ks:string[])=>{for(const k of ks){const v=kv[k.toLowerCase()];if(v)return v;}return'';};
 const surf=g('Surface habitable','Surface totale')||ldText(prop.floorSize);if(surf)o.surface=surf.replace(/m²|m2/g,'').trim();
 const land=g('Surface du terrain','Surface terrain');if(land)o.surface_terrain=land.replace(/m²|m2/g,'').trim();else if(o.type_bien==='terrain'&&o.surface){o.surface_terrain=o.surface;delete o.surface;}
 if(!o.pieces){const p=g('Nombre de pièces');if(p)o.pieces=p;}
 const ch=g('Nombre de chambres');const chCount=(html.match(/>\s*Chambre\s*\d*\s*\(/gi)||[]).length;if(ch)o.chambres=ch;else if(chCount)o.chambres=String(chCount);
 const sdb=(html.match(/>\s*Salle (?:de bain|d(?:'|&#39;)eau)[^<(]*\(/gi)||[]).length;if(sdb)o.salles_de_bain=String(sdb);
 const et=g('Étage','Etage');if(et)o.etage=/rez/i.test(et)?'0':et.replace(/[^\d]/g,'');
 const chauf=g('Chauffage');if(chauf)o.chauffage=chauf.replace(/\b(\p{L}+)\s+\1\b/giu,'$1').replace(/\s+/g,' ');
 const yb=g('Année construction','Année de construction');if(yb)o.annee_construction=yb.replace(/[^\d]/g,'');
 const asc=g('Ascenseur');if(asc)o.ascenseur=asc;
 const tf=g('Taxe foncière');if(tf)o.taxe_fonciere=tf.replace(/[^\d,.]/g,'');
 const lots=g('Nombre de Lots','Nombre de lots');if(lots)o.nombre_lots=lots.replace(/[^\d]/g,'');
 const chA=g('Charges courantes par an');if(chA&&transaction==='vente')o.charges_annuelles=chA.replace(/[^\d,.]/g,'').replace(/,0+$/,'');
 const chMois=g('Charges / mois','Charges/mois');if(chMois){if(transaction==='location')o.charges_mensuelles=chMois.replace(/[^\d,.]/g,'');else if(!o.charges_annuelles){const n=Number(chMois.replace(/[^\d,.]/g,'').replace(',','.'));if(n>0)o.charges_annuelles=String(Math.round(n*12));}}
 const dep2=g('Dépôt de garantie');if(dep2)o.depot_garantie=dep2.replace(/[^\d,.]/g,'');
 const chM=g('Dont charges','Charges','Provision sur charges');if(chM&&transaction==='location')o.charges_mensuelles=chM.replace(/[^\d,.]/g,'');
 const hon=decodeEntities(html.match(/(Honoraires[^<]{3,120})</)?.[1]||'').replace(/\s+/g,' ').trim();if(hon)o.honoraires=hon;
 else if(transaction==='location'){const v=g('Visite, constitution dossier, rédaction de bail');if(v)o.honoraires=v;}
 // DPE / GES.
 const dpeSvg=html.match(/c-the-dpe-ges-new-dpe-svg[\s\S]*?<\/svg>/i)?.[0]||'';const gesSvg=html.match(/c-the-dpe-ges-new-ges-svg[\s\S]*?<\/svg>/i)?.[0]||'';
 let dpe=c21EnergyClass(dpeSvg,C21_DPE),ges=c21EnergyClass(gesSvg,C21_GES);
 const txtAll=decodeEntities(html.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
 const vals=txtAll.match(/\(énergie primaire\)\s*(\d{1,4})\s+(\d{1,4})\s*kWh/i);
 if(vals&&(!dpe||!ges)){const c=dpeFromValues(Number(vals[1]),Number(vals[2]));if(c){dpe=dpe||c.dpe;ges=ges||c.ges;}}
 if(vals)o.consommation_energie=vals[1];
 if(dpe&&ges){o.dpe=dpe;o.ges=ges;}
 const dd=html.match(/Date du DPE\s*:?\s*(?:&nbsp;)?\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(dd)o.date_dpe=`${dd[3]}-${dd[2]}-${dd[1]}`;
 const cost=decodeEntities(html).match(/entre\s*([\d\s.,]+)\s*€\s*et\s*([\d\s.,]+)\s*€/i);if(cost){o.cout_energie_min=cost[1].replace(/[^\d,]/g,'').replace(/,0+$/,'');o.cout_energie_max=cost[2].replace(/[^\d,]/g,'').replace(/,0+$/,'');}
 // Équipements (« Les plus » et lignes sans valeur de la section équipements).
 const eqSec=html.match(/c-the-property-detail-equipments?[\s\S]*?<\/section>/i)?.[0]||html.match(/>\s*Équipements\s*<[\s\S]*?<\/section>/i)?.[0]||'';
 const feats:string[]=[];for(const m of eqSec.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){const x=decodeEntities(m[1].replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();if(x&&!x.includes(':')&&x.length<40&&!feats.includes(x))feats.push(x);}
 if(feats.length)o.prestations=feats.join('|');
 const desc=html.match(/<div class="has-formated-text[^"]*">([\s\S]*?)<\/div>/i)?.[1];if(desc)o.description=aaClean(desc).slice(0,6000);
 // Photos grand format, dans l'ordre du diaporama.
 const photos:string[]=[];const base=new URL(url);
 for(const m of html.matchAll(/c-the-detail-images__slides__item\b[^>]*data-src="([^"]+)"/gi)){try{const u=new URL(decodeEntities(m[1]),base).toString();if(!photos.includes(u))photos.push(u);}catch{}}
 if(!photos.length)for(const m of html.matchAll(/(\/imagesBien\/[^"'\s]+?\.(?:jpe?g|png|webp))/gi)){try{const u=new URL(m[1],base).toString();if(!photos.includes(u))photos.push(u);}catch{}}
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 return o.reference&&o.titre?o:null;
}
async function readC21Agency(origin:URL){
 const links=new Map<string,{url:string,tr:string}>();
 for(const[listPath,tr]of [['/annonces/achat/','vente'],['/annonces/location/','location']] as [string,string][]){
  for(let page=1;page<=30;page++){
   const u=new URL(page>1?`${listPath}page-${page}/`:listPath,origin);
   let text:string;
   try{({text}=await fetchSiteHtml(u));}catch(e){if(page>1||tr==='location')break;throw Error(`Liste des biens illisible (${listPath}) : ${e instanceof Error?e.message:String(e)}`);}
   const before=links.size;
   for(const m of text.matchAll(/href="((?:https?:\/\/[^"\/]+)?\/trouver_logement\/detail\/(\d+)\/?)"/gi)){if(!links.has(m[2]))links.set(m[2],{url:new URL(decodeEntities(m[1]),origin).toString(),tr});}
   if(links.size===before||!new RegExp(`page-${page+1}/`).test(text))break;
  }
 }
 if(!links.size)throw Error('Aucun bien trouvé sur le site de l\'agence Century 21 : synchronisation annulée par sécurité.');
 const entries=[...links.entries()].slice(0,300);const rows:any[]=[];let i=0;
 await Promise.all(Array.from({length:4},async()=>{while(i<entries.length){const[id,{url,tr}]=entries[i++];try{const{text}=await fetchSiteHtml(new URL(url));const o=parseC21Detail(text,url,tr);if(o)rows.push(o);else if(!/schema\.org\/(?:OutOfStock|SoldOut)/i.test(text))rows.push({reference:id,url});}catch{rows.push({reference:id,url});}}}));
 return rows;
}
// Sites nationaux des réseaux : il faut l'adresse de l'agence, pas celle du réseau.
function networkHomeError(u:URL){
 const h=u.hostname.replace(/^www\./,'').toLowerCase();const path=u.pathname.replace(/\/+$/,'');
 const nets:Record<string,string>={'century21.fr':'Century 21 (ex. https://www.century21-nom-agence-ville.com)','orpi.com':'Orpi (ex. https://www.orpi.com/nom-agence)','laforet.com':'Laforêt','guy-hoquet.com':'Guy Hoquet','stephaneplazaimmobilier.com':'Stéphane Plaza','nestenn.com':'Nestenn','foncia.com':'Foncia'};
 if(nets[h]&&(!path||(h==='century21.fr'&&!/^\/trouver_agence\/agence\//.test(path))))return`C'est l'adresse du réseau ${nets[h].split(' (')[0]}, pas celle d'une agence : entrez l'adresse du site ou de la page de l'agence${nets[h].includes('(')?' '+nets[h].slice(nets[h].indexOf('(')):''}.`;
 return null;
}
// Autres sites (garages ou agences) : lecture des « données structurées » (schema.org JSON-LD : Car, Vehicle, Product,
// RealEstateListing, Apartment, House…)
// que la plupart des sites publient pour Google. Pages trouvées via le sitemap et les liens de la page d'accueil.
// Si aucune fiche véhicule n'est trouvée : erreur (rien n'est archivé) et le site est signalé à l'admin.
function ldBlocks(html:string){const out:any[]=[];for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1].trim().replace(/^<!--|-->$/g,''));const walk=(x:any)=>{if(!x)return;if(Array.isArray(x)){x.forEach(walk);return;}if(typeof x!=='object')return;out.push(x);if(x['@graph'])walk(x['@graph']);if(x.itemOffered)walk(x.itemOffered);};walk(j);}catch{}}return out;}
const ldTypes=(x:any)=>(Array.isArray(x?.['@type'])?x['@type']:[x?.['@type']]).map((t:any)=>String(t||'').toLowerCase());
const ldText=(v:any):string=>{if(v==null)return'';if(Array.isArray(v))return ldText(v[0]);if(typeof v==='object')return ldText(v.name??v.value??v['@value']??'');return decodeEntities(String(v)).trim();};
function ldVehicle(html:string,url:string){
 const items=ldBlocks(html);
 const v=items.find(x=>ldTypes(x).some((t:string)=>['car','vehicle','motorcycle','motorizedbicycle','busorcoach'].includes(t)))
  ||items.find(x=>ldTypes(x).includes('product')&&(x.offers||x.mileageFromOdometer||x.vehicleEngine));
 if(!v)return null;
 const offer=Array.isArray(v.offers)?v.offers[0]:(v.offers?.offers?.[0]||v.offers||{});
 const avail=String(offer?.availability||'').toLowerCase();
 const o:any={url,titre:ldText(v.name),etat:'occasion'};
 if(/soldout|discontinued|outofstock/.test(avail))o._sold=1;
 const price=Number(String(offer?.price??offer?.lowPrice??offer?.priceSpecification?.price??'').replace(/[^\d.]/g,''));if(price>0)o.prix=String(Math.round(price));
 const brand=ldText(v.brand||v.manufacturer);if(brand)o.marque=brand;
 const model=ldText(v.model);if(model)o.modele=model;
 const km=ldText(v.mileageFromOdometer);if(km)o.kilometrage=km;
 const date=ldText(v.dateVehicleFirstRegistered||v.vehicleModelDate||v.productionDate||v.modelDate||v.releaseDate);const y=date.match(/(19|20)\d{2}/);if(y){o.annee=y[0];o.mise_en_circulation=date;}
 const fuel=ldText(v.fuelType||v.vehicleEngine?.fuelType);if(fuel)o.carburant=fuel.replace(/^https?:\/\/[^/]+\//,'');
 const tr=ldText(v.vehicleTransmission);if(tr)o.boite=/manual|manuel|m[ée]ca/i.test(tr)?'manuelle':/auto/i.test(tr)?'automatique':tr;
 const color=ldText(v.color);if(color)o.couleur=color;
 const doors=ldText(v.numberOfDoors);if(doors)o.portes=doors;
 const power=ldText(v.vehicleEngine?.enginePower);if(power)o.puissance_din=power;
 const body=ldText(v.bodyType||v.vehicleConfiguration||v.category);if(body)o.carrosserie=body;
 if(RSS_MOTO.test(ldTypes(v).join(' ')+' '+body))o.type='moto';else if(/utilitaire|fourgon|van\b|commercial/i.test(body))o.type='utilitaire';else o.type='voiture';
 const desc=aaClean(String(v.description||'').replace(/<\/p>/gi,'\n'));if(desc)o.description=desc.slice(0,6000);
 const photos:string[]=[];const addImg=(x:any)=>{if(!x)return;if(Array.isArray(x)){x.forEach(addImg);return;}const u=typeof x==='string'?x:(x.contentUrl||x.url||'');try{const abs=new URL(decodeEntities(String(u)),url).toString();if(/^https?:/i.test(abs)&&!photos.includes(abs))photos.push(abs);}catch{}};addImg(v.image);
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 const id=ldText(v.sku||v.productID||v.vehicleIdentificationNumber||offer?.sku);
 o.reference=(id||new URL(url).pathname.replace(/\/+$/,'').split('/').pop()||url).slice(0,80);
 // Fiche de stock seulement : prix et photo obligatoires (écarte les pages « modèles neufs », services, etc.).
 return o.titre&&o.prix&&o.photos?o:null;
}
const IMMO_TYPES=['realestatelisting','apartment','house','singlefamilyresidence','residence','accommodation','room','suite','landform','offerforlease','offerforpurchase'];
function ldImmo(html:string,url:string){
 const items=ldBlocks(html);
 let v=items.find(x=>ldTypes(x).some((t:string)=>IMMO_TYPES.includes(t)))||items.find(x=>ldTypes(x).includes('product')&&x.offers&&/(m²|m2|pi[eè]ce|chambre|appartement|maison|terrain)/i.test(ldText(x.name)+' '+ldText(x.description)));
 if(!v)return null;
 const about=v.mainEntity||v.about||v.itemOffered;if(about&&typeof about==='object'&&!Array.isArray(about))v={...about,...v};
 const offer=Array.isArray(v.offers)?v.offers[0]:(v.offers||{});
 const o:any={url,titre:ldText(v.name)};
 if(/soldout|discontinued|outofstock/i.test(String(offer?.availability||'')))o._sold=1;
 const price=Number(String(offer?.price??v.price??offer?.priceSpecification?.price??'').replace(/[^\d.]/g,''));if(price>0)o.prix=String(Math.round(price));
 const addr=v.address||v.location?.address||{};const city=ldText(addr.addressLocality);if(city)o.ville=city;const cp=ldText(addr.postalCode);if(cp)o.code_postal=cp;
 const surf=ldText(v.floorSize);if(surf)o.surface=surf;const rooms=ldText(v.numberOfRooms);if(rooms)o.pieces=rooms;const bed=ldText(v.numberOfBedrooms);if(bed)o.chambres=bed;const bath=ldText(v.numberOfBathroomsTotal);if(bath)o.salles_de_bain=bath;
 const t=ldTypes(v).join(' ')+' '+o.titre+' '+url;
 // 29/10/2026 : le type déclaré (Apartment, House…) passe avant les mots du titre (« T2 avec garage » n'est pas un parking).
 const lt=ldTypes(v).join(' ').toLowerCase();const tt=(o.titre+' '+url).toLowerCase();
 o.type_bien=/apartment|flat|condo/.test(lt)?'appartement':/house|villa|singlefamily/.test(lt)?'maison':/landform|\bland\b|lot\b/.test(lt)?'terrain'
  :/\bmaison|villa|pavillon|long[eè]re|propri[eé]t[eé]|ferme|chalet/.test(tt)?'maison':/appartement|\bappt|studio|duplex|loft|\b[tf]\d\b|\b[tf]-\d\b/.test(tt)?'appartement'
  :/terrain/.test(tt)?'terrain':/bureau|local commercial|commerce|entrep[oô]t/.test(tt)?'bureau':/parking|garage|\bbox\b|stationnement/.test(tt)?'parking':/immeuble/.test(tt)?'maison':'appartement';
 o.transaction=/(louer|location|rent|lease)/i.test(t+' '+ldText(offer?.businessFunction))?'location':'vente';
 const desc=aaClean(String(v.description||'').replace(/<\/p>/gi,'\n'));if(desc)o.description=desc.slice(0,6000);
 const photos:string[]=[];const addImg=(x:any)=>{if(!x)return;if(Array.isArray(x)){x.forEach(addImg);return;}const u=typeof x==='string'?x:(x.contentUrl||x.url||'');try{const abs=new URL(decodeEntities(String(u)),url).toString();if(/^https?:/i.test(abs)&&!photos.includes(abs))photos.push(abs);}catch{}};addImg(v.image||v.photo);
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 const id=ldText(v.sku||v.productID||v.identifier||offer?.sku);
 o.reference=(id||new URL(url).pathname.replace(/\/+$/,'').split('/').pop()||url).slice(0,80);
 return o.titre&&o.prix?o:null;
}
const IMMO_PATH=/(bien|vente|location|achat|immobilier|annonce|appartement|maison|villa|terrain|propri[eé]t|property|listing|detail|fiche|produit)/i;
const VEHICLE_PATH=/(v[ée]hicule|voiture|occasion|annonce|stock|vo\b|vn\b|auto|moto|produit|product|car|detail|fiche)/i;
async function siteCandidateUrls(origin:URL,homeHtml:string,PATH:RegExp){
 const urls=new Set<string>();const add=(u:string)=>{try{const x=new URL(decodeEntities(u),origin);x.hash='';if(x.hostname===origin.hostname&&!/\.(jpe?g|png|webp|gif|svg|pdf|css|js|xml|ico)(\?|$)/i.test(x.pathname))urls.add(x.toString());}catch{}};
 // Sitemaps (index compris) : la source la plus complète.
 const maps=[new URL('/sitemap.xml',origin).toString(),new URL('/sitemap_index.xml',origin).toString()];
 try{const{text}=await fetchSiteHtml(new URL('/robots.txt',origin));for(const m of text.matchAll(/^sitemap:\s*(\S+)/gim))maps.unshift(m[1]);}catch{}
 const seenMaps=new Set<string>();
 for(let i=0;i<maps.length&&seenMaps.size<12;i++){const sm=maps[i];if(seenMaps.has(sm))continue;seenMaps.add(sm);
  try{const{text}=await fetchSiteHtml(new URL(sm));for(const m of text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)){const loc=decodeEntities(m[1]);if(/\.xml(\?|$)/i.test(loc)){if(!/(post|page|categor|tag|author|blog|actualit)/i.test(loc))maps.push(loc);}else add(loc);}}catch{}}
 for(const m of homeHtml.matchAll(/href=["']([^"'#]+)["']/gi))add(m[1]);
 const list=[...urls];
 return list.filter(u=>PATH.test(new URL(u).pathname)).concat(list.filter(u=>!PATH.test(new URL(u).pathname)));
}
async function readGenericSite(origin:URL,homeHtml:string,sector='vehicules'){
 const immo=sector==='immobilier';const PATH=immo?IMMO_PATH:VEHICLE_PATH;const parse=immo?ldImmo:ldVehicle;
 const t0=Date.now();const rows:any[]=[];const refs=new Set<string>();
 // Les pages « liste » du site peuvent mener aux fiches : on suit aussi les liens des pages visitées.
 const queue=await siteCandidateUrls(origin,homeHtml,PATH);const visited=new Set<string>();let i=0,pages=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(i<queue.length&&pages<400&&Date.now()-t0<50000){
   const u=queue[i++];if(visited.has(u))continue;visited.add(u);pages++;
   try{const{text}=await fetchSiteHtml(new URL(u));const o=parse(text,u);
    if(o){if(!o._sold&&!refs.has(o.reference)){refs.add(o.reference);rows.push(o);}}
    else if(PATH.test(new URL(u).pathname)&&queue.length<1500){for(const m of text.matchAll(/href=["']([^"'#]+)["']/gi)){try{const x=new URL(decodeEntities(m[1]),u);x.hash='';if(x.hostname===origin.hostname&&PATH.test(x.pathname)&&!visited.has(x.toString())&&!queue.includes(x.toString()))queue.push(x.toString());}catch{}}}
   }catch{}
  }}));
 if(!rows.length)throw Error(`Aucune fiche ${immo?'de bien':'véhicule'} lisible automatiquement sur ce site : il faudra une préparation manuelle (rien n'a été modifié).`);
 // Lecture partielle (temps dépassé) : on le signale pour ne rien archiver par erreur.
 if(i<queue.length&&pages>=1)(rows as any).partial=true;
 return rows;
}
// Adresse du garage / de l'agence publiée sur son site : données structurées (JSON-LD), sinon « 30100 ALES » le plus fréquent.
function siteLocation(html:string){
 for(const x of ldBlocks(html)){const a=x?.address;const ad=Array.isArray(a)?a[0]:a;if(ad&&typeof ad==='object'){const city=ldText(ad.addressLocality);const cp=normalizePostal(ldText(ad.postalCode));if(city&&!/^\d+$/.test(city))return{city,postal:/^\d{5}$/.test(cp)?cp:''};}}
 const text=decodeEntities(html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi,' ').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'\n'));
 const counts=new Map<string,number>();
 for(const m of text.matchAll(/(?:^|[\s,.;(-])((?:0[1-9]|[1-8]\d|9[0-5]|97)\d{3})\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'-]{1,30}(?:[ -](?:sur|sous|en|le|la|les|de|du|des|lès|l[eè]s|[A-ZÀ-Ý][A-Za-zÀ-ÿ'-]{1,25})){0,4})(?=\s*(?:$|[\n,.;)|\-–]|France|\d))/gm)){const k=m[1]+'|'+m[2].trim();counts.set(k,(counts.get(k)||0)+1);}
 const best=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];if(!best)return null;
 const[postal,city]=best[0].split('|');return{city,postal};
}
// Prestataire du site (pour savoir quel connecteur ajouter quand le site n'est pas encore lisible).
const SITE_PROVIDERS:[RegExp,string][]=[[/orpi\.com/i,'Orpi'],[/century21\.fr/i,'Century 21'],[/laforet\.com/i,'Laforêt'],[/guy-hoquet\.com/i,'Guy Hoquet'],[/stephaneplazaimmobilier/i,'Stéphane Plaza'],[/nestenn\.com/i,'Nestenn'],[/foncia\.com/i,'Foncia'],[/sweepbright/i,'SweepBright'],[/annonces-automobile\.com|cdn-rivamedia/i,'Annonces-Automobile'],[/la-boite-immo|laboiteimmo|staticlbi\.com/i,'La Boîte Immo'],[/activimmo/i,'Activimmo'],[/apimo\.|media\.apimo\.pro/i,'Apimo'],[/hektor/i,'Hektor'],[/netty\.fr|immonot/i,'Netty / Immonot'],[/adapt-immo/i,'Adapt Immo'],[/ac3-distribution|immo-facile/i,'AC3'],[/twimmo/i,'Twimmo'],[/modelo\.fr/i,'Modelo'],[/starterre/i,'Starterre'],[/agenceauto\.com|agence\.auto\/webgest/i,"L'Agence Automobilière"],[/spider-?vo/i,'Spider VO'],[/kepler/i,'Kepler'],[/autobiz/i,'Autobiz'],[/wizards?vo|wizards\.fr/i,'Wizards'],[/dealerk|dealer-k/i,'Dealer K'],[/planete?-?vo/i,'Planète VO'],[/gestion-?vo|vo-?online/i,'VO Online'],[/eurotax|autoxpo/i,'Autoxpo'],[/wix\.com|wixstatic/i,'Wix'],[/shopify/i,'Shopify'],[/squarespace/i,'Squarespace'],[/webflow/i,'Webflow'],[/jimdo/i,'Jimdo'],[/wp-content/i,'WordPress']];
function detectSitePlatform(html:string){
 for(const[re,name]of SITE_PROVIDERS)if(re.test(html))return name;
 const m=html.match(/(?:r[ée]alis[ée]|con[cç]u|cr[ée]ation|d[ée]velopp[ée])[^<]{0,20}(?:par|by)\s*(?:<[^>]*>\s*){0,3}([^<]{2,40})/i);
 return m?('Site réalisé par '+decodeEntities(m[1]).trim()):'Inconnu';
}
// 29/10/2026 : agence au site illisible (Wix…) mais présente sur un réseau lisible : on cherche sa page réseau
// (lien Orpi / Century 21 sur son site, sinon page Orpi au nom du domaine, ex. calleris.fr → orpi.com/callerisimmo).
async function findNetworkPage(siteUrl:URL,html:string){
 const orpi=html.match(/https?:\/\/(?:www\.)?orpi\.com\/([a-z0-9-]{2,60})\/?["'?#]/i)?.[1];
 if(orpi&&orpiAgencySlug(new URL(`https://www.orpi.com/${orpi}/`)))return{kind:'orpi',slug:orpi.toLowerCase()};
 const c21=html.match(/https?:\/\/(www\.century21-[a-z0-9-]+\.(?:com|fr))/i)?.[1];
 if(c21)return{kind:'c21',url:`https://${c21}/`};
 const label=siteUrl.hostname.replace(/^www\./,'').split('.')[0].toLowerCase().replace(/[^a-z0-9-]/g,'');
 if(label.length<3)return null;
 const base=label.replace(/-?(immobilier|immo)$/,'');
 const cands=[...new Set([label,base,base+'immo',base+'-immo',base+'immobilier','orpi'+base,'orpi-'+base])].filter(x=>x.length>=3);
 const want=base.replace(/-/g,'');
 for(const slug of cands){
  try{const r=await fetch(`https://www.orpi.com/${slug}/`,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36','Accept-Language':'fr-FR'},redirect:'follow',signal:AbortSignal.timeout(12000)});
   if(!r.ok){await r.body?.cancel();continue;}
   const t=await r.text();const title=decodeEntities(t.match(/<title>([^<]{0,200})/i)?.[1]||'').toLowerCase().replace(/[^a-z0-9]/g,'');
   if(/agenceimmobili/.test(title)&&title.includes(want))return{kind:'orpi',slug};
  }catch{}
 }
 return null;
}
async function readFeed(feed:any){
  if(!feed.feed_url)throw new Error('Aucune URL de flux configurée.');
  let url:URL;
  try{url=new URL(String(feed.feed_url));}catch{throw new Error('URL de flux invalide.');}
  if(!['http:','https:'].includes(url.protocol))throw new Error('Le flux doit utiliser HTTP ou HTTPS.');
  const headers:Record<string,string>={
    Accept:'application/json, application/xml, text/xml, text/csv, application/csv, text/plain;q=0.8, */*;q=0.5',
    'User-Agent':'Abracadeal-StockSync/1.0 (+https://abracadeal.fr)'
  };
  if(url.username||url.password){
    const user=decodeURIComponent(url.username||'');
    const pass=decodeURIComponent(url.password||'');
    headers.Authorization=`Basic ${btoa(`${user}:${pass}`)}`;
    url.username='';url.password='';
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  let r:Response;
  try{
    for(let redirects=0;;redirects++){await publicFeedUrl(url);r=await fetch(url.toString(),{headers,redirect:'manual',signal:controller.signal});if(r.status<300||r.status>=400)break;const location=r.headers.get('location');await r.body?.cancel();if(!location||redirects>=4)throw Error('Redirection de flux invalide');const next=new URL(location,url);if(next.hostname!==url.hostname)delete headers.Authorization;url=next;}
  }catch(e){
    if(e instanceof DOMException&&e.name==='AbortError')throw new Error('Délai dépassé lors du téléchargement du flux (25 s).');
    throw new Error(`Flux inaccessible : ${e instanceof Error?e.message:String(e)}`);
  }finally{clearTimeout(timer);}
  if(!r.ok){
    // Protection anti-robots (Cloudflare, captcha…) : le site ne peut pas être lu automatiquement.
    const body=r.status===403||r.status===429||r.status===503?await r.text().catch(()=>''):'';
    if(/just a moment|cf-chl|challenge-platform|captcha|access denied|datadome/i.test(body)){const err:any=new Error('Ce site bloque la lecture automatique (protection anti-robots). Il faudra brancher le flux du logiciel de l\'agence ou du garage, ou importer un fichier (CSV/Excel).');err.platform='Protection anti-robots';throw err;}
    throw new Error(`Flux HTTP ${r.status}${r.statusText?` ${r.statusText}`:''}`);
  }
  const len=Number(r.headers.get('content-length')||0);
  if(len>25_000_000)throw new Error('Flux trop volumineux (> 25 Mo).');
  const text=await r.text();
  if(text.length>25_000_000)throw new Error('Flux trop volumineux (> 25 Mo).');
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if(ct.includes('html')||/^\s*<(?:!doctype html|html)/i.test(text)){
    // Adresse d'un site de garage (pas d'un flux) : on choisit le lecteur selon le type de site.
    const origin=new URL(url.origin);let rows:any[];let platform:string;
    const netErr=networkHomeError(url);if(netErr){const err:any=new Error(netErr);err.platform=detectSitePlatform(text);throw err;}
    const orpiSlug=orpiAgencySlug(url)||orpiAgencySlug(new URL(String(feed.feed_url)));
    // Fiche agence sur century21.fr : on suit le lien vers le site de l'agence.
    const c21Link=/(^|\.)century21\.fr$/i.test(url.hostname)?text.match(/href="(https:\/\/www\.century21[a-z0-9-]*\.(?:com|fr))\/annonces\/achat\/"/i)?.[1]:null;
    if(orpiSlug){rows=await readOrpiAgency(origin,orpiSlug);platform='Orpi (page agence)';feed.sector='immobilier';}
    else if(c21Link&&!/century21\.fr$/i.test(new URL(c21Link).hostname)){rows=await readC21Agency(new URL(c21Link));platform='Century 21 (site agence)';feed.sector='immobilier';}
    else if(isC21AgencySite(url,text)){rows=await readC21Agency(origin);platform='Century 21 (site agence)';feed.sector='immobilier';}
    else if(isAaSiteHtml(text)){rows=await readAaSite(origin);platform='Annonces-Automobile';}
    else if(/wp-content|wp-json/i.test(text)&&await isWooSite(origin)){rows=await readWooSite(origin);platform='WordPress / WooCommerce';}
    else if(isAgenceAutoSite(url)){rows=await readAgenceAuto(url,text);platform="L'Agence Automobilière";}
    else if(isStarterreSite(text)){rows=await readStarterreSite(origin,text);platform='Starterre';}
    else if(isSpiderVoSite(text)&&/\/\d+\/vehicules\/|,svoc\d+\.html/i.test(text)){rows=await readSpiderVo(url,text);platform='Spider VO';}
    else if(/cdn\.shopify\.com|Shopify\.theme/i.test(text)){rows=await readShopify(origin,feed.sector||'vehicules');platform='Shopify';}
    else{platform=detectSitePlatform(text);
      // Lecteur « intelligent » : repère les fiches tout seul ; les données structurées (JSON-LD) restent prioritaires sur chaque fiche.
      try{const sector=feed.sector==='immobilier'?'immobilier':'vehicules';rows=await readSmartSite(origin,text,sector,fetchSiteHtml,[url.toString()],sector==='immobilier'?ldImmo:ldVehicle);
        if(!rows.length)throw Error(`Aucune fiche ${sector==='immobilier'?'de bien':'véhicule'} lisible automatiquement sur ce site : il faudra une préparation manuelle (rien n'a été modifié).`);
        // 29/10/2026 : pages de rubrique (« Vous êtes acquéreur », « Nos biens loués », accueil…) prises pour des fiches :
        // quand la plupart des fiches ont la même forme d'adresse (ex. /details-…), on écarte celles qui ne l'ont pas.
        {const key=(u:string)=>{try{const p=new URL(u).pathname.replace(/^\/+/,'');return p.split(/[\/\-_+.,]/)[0].toLowerCase();}catch{return'';}};
         const cnt=new Map<string,number>();for(const r of rows){const k=key(String(r.url||''));if(k)cnt.set(k,(cnt.get(k)||0)+1);}
         const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0];
         if(top&&top[1]>=5&&top[1]>=rows.length*0.6){const kept=rows.filter((r:any)=>key(String(r.url||''))===top[0]);rows.length=0;rows.push(...kept);}}
        // Même idée avec la « forme » de l'adresse (profondeur + fin numérique), ex. Nestenn : fiches /…-ref-39790233
        // contre pages /prix-m2-orleans/prix-rues/… (prix au m² lus comme des biens).
        {const shape=(u:string)=>{try{const segs=new URL(u).pathname.replace(/\/+$/,'').split('/').filter(Boolean);const last=segs[segs.length-1]||'';return segs.length+'|'+(/(?:^|[-_])(ref|id|annonce|bien|lot)[-_]?\d{3,}$/i.test(last)?'ref':/\d{4,}$/.test(last)?'num':'txt');}catch{return'';}};
         const cnt=new Map<string,number>();for(const r of rows){const k=shape(String(r.url||''));if(k)cnt.set(k,(cnt.get(k)||0)+1);}
         const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0];
         if(top&&!top[0].endsWith('txt')&&top[1]>=5&&top[1]>=rows.length*0.6){const kept=rows.filter((r:any)=>shape(String(r.url||''))===top[0]);rows.length=0;rows.push(...kept);}}
        platform+=' · lecture automatique';}
      catch(e){
        const net=await findNetworkPage(url,text).catch(()=>null);
        if(net?.kind==='orpi'){rows=await readOrpiAgency(new URL('https://www.orpi.com'),net.slug);platform=`Orpi (page agence orpi.com/${net.slug}, le site ${url.hostname} n'est pas lisible)`;feed.sector='immobilier';}
        else if(net?.kind==='c21'){rows=await readC21Agency(new URL(net.url));platform=`Century 21 (${new URL(net.url).hostname}, le site ${url.hostname} n'est pas lisible)`;feed.sector='immobilier';}
        else{const err:any=new Error(`${e instanceof Error?e.message:String(e)} Prestataire du site : ${platform}.`);err.platform=platform;throw err;}}}
    (rows as any).platform=platform;(rows as any).siteLocation=siteLocation(text);if(feed.sector)(rows as any).sector=feed.sector;return rows;
  }
  const f=feed.format==='auto'?(ct.includes('json')||/^\s*[\[{]/.test(text)?'json':ct.includes('xml')||/^\s*</.test(text)?'xml':'csv'):feed.format;
  try{return f==='json'?parseJson(JSON.parse(text)):f==='xml'?parseXml(text):parseCsv(text);}catch(e){throw new Error(`Flux ${f.toUpperCase()} illisible : ${e instanceof Error?e.message:String(e)}`);}
}
async function moderationSecret(){const{data}=await admin.from('integration_secrets').select('secret_value').eq('name','pro_stock_moderation_internal').maybeSingle();return String(data?.secret_value||'');}
async function moderateListingInternal(listingId:string){const secret=await moderationSecret();if(!secret)throw new Error('Secret de modération interne absent');const r=await fetch(`${SUPABASE_URL}/functions/v1/moderate-listing`,{method:'POST',headers:{'Content-Type':'application/json','x-internal-moderation-key':secret},body:JSON.stringify({listing_id:listingId}),signal:AbortSignal.timeout(90000)});const body=await r.json().catch(()=>({}));if(!r.ok||!body?.ok||!body?.ai_checked)throw new Error(body?.ai_error||body?.error||`Modération incomplète (${r.status})`);return body;}
async function upsertContact(ownerId:string,listingId:string){const [{data:p},{data:u}]=await Promise.all([admin.from('profiles').select('phone').eq('id',ownerId).maybeSingle(),admin.auth.admin.getUserById(ownerId)]);await admin.from('listing_contacts').upsert({listing_id:listingId,owner_id:ownerId,phone:p?.phone||null,contact_email:u?.user?.email||null},{onConflict:'listing_id'});}
function immoMeta(r:any){const keys=['surface','landSurface','rooms','bedrooms','bathrooms','floor','totalFloors','furnished','yearBuilt','propertyCondition','heating','orientation','neighborhood','dpe','ges','energyConsumption','dpeDate','energyCostMin','energyCostMax','coownership','lots','annualCharges','propertyTax','fees','rentCharges','deposit','mandate','availableDate','features'];const m:any={};for(const k of keys){const v=r[k];if(v!==null&&v!==undefined&&v!==''&&(!Array.isArray(v)||v.length))m[k]=v;}return m;}
function vehicleMeta(r:any){const keys=['firstRegistration','body','doors','seats','permit','finish','version','color','upholstery','fiscalPower','dinPower','co2','history','technicalInspection','maintenance','warranty','equipment'];const m:any={};for(const k of keys){const v=r[k];if(v!==null&&v!==undefined&&v!==''&&(!Array.isArray(v)||v.length))m[k]=v;}return m;}
async function sync(feed:any,rawRows:any[],modeOverride?:string){
 const runResult=await admin.from('pro_stock_sync_runs').insert({feed_id:feed.id}).select('id').single();
 if(runResult.error)throw runResult.error;
 const run=runResult.data;
 let created=0,updated=0,archived=0,errors=0,photoTruncated=0,moderated=0,unchanged=0,deferred=0;
 // Budget de temps : au-delà, les annonces restent « en attente » et la relance de modération (cron) prend le relais.
 const t0=Date.now();let archiveSkipped:string|null=null;
 const failures:string[]=[];
 const seen=new Set<string>();const source=`feed:${feed.id}`;
 const must=(r:any)=>{if(r.error)throw r.error;return r.data;};
 try{
  const rows=await normalizeRows(rawRows,feed.sector||'vehicules',feed.owner_id);
  for(const r of rows){
   try{
    // Invalid rows still count as present: a malformed update must not archive the old listing.
    if(r.ref)seen.add(r.ref);
    if(r.errors?.length)throw Error(r.errors.join(', '));
    const existing=must(await admin.from('listings').select('*,listing_moderation(stock_import_signature,stock_import_photo_ids),listing_photos(id)').eq('owner_id',feed.owner_id).eq('source',source).eq('external_id',r.ref).maybeSingle());
    // Reports and safety decisions must not be undone by a scheduled reimport.
    if(existing?.status==='hidden'||existing?.status==='rejected')continue;
    const meta=r.category==='immobilier'?immoMeta(r):vehicleMeta(r);
    let description=`[ABRACA_SUB:${r.sub||''}]\n[ABRACA_REF:${r.ref}]\n[ABRACA_SOURCE:${source}]\n`;
    if(r.category==='immobilier')description+=`[ABRACA_IMETA:${encodeURIComponent(JSON.stringify(meta))}]\n`;
    else if(Object.keys(meta).length)description+=`[ABRACA_VMETA:${encodeURIComponent(JSON.stringify(meta))}]\n`;
    description+=r.description||'';
    const payload:any={owner_id:feed.owner_id,category:r.category,title:r.title,description,price:r.price,city:r.city,postal_code:r.postal||null,seller_type:'professionnel',source,external_id:r.ref,external_url:r.externalUrl||feed.feed_url||null,last_synced_at:new Date().toISOString(),show_phone:r.showPhone};
    if(r.category==='vehicules'){
     payload.item_condition=r.condition||null;payload.vehicle_make=r.make||null;payload.vehicle_model=r.model||null;
     payload.vehicle_year=r.year==null?null:Math.round(r.year);payload.mileage=r.mileage==null?null:Math.round(r.mileage);
     payload.fuel=r.fuel||null;payload.transmission=r.transmission||null;payload.crit_air=r.critAir||null;
    }else{
     payload.item_condition=null;payload.vehicle_make=null;payload.vehicle_model=null;payload.vehicle_year=null;
     payload.mileage=null;payload.fuel=null;payload.transmission=null;payload.crit_air=null;
    }
    const {last_synced_at:ignoredTimestamp,...contentPayload}=payload;
    const includedPhotos=r.photos.slice(0,Math.max(1,Math.min(45,Number(existing?.photo_limit||15))));
    const signature=await sha256(JSON.stringify({content:contentPayload,photos:includedPhotos}));
    const prior=Array.isArray(existing?.listing_moderation)?existing.listing_moderation[0]:existing?.listing_moderation;
    const photoIds=(existing?.listing_photos||[]).map((p:any)=>p.id).sort();
    if(existing && prior?.stock_import_signature===signature
      && Object.entries(contentPayload).every(([k,v])=>JSON.stringify(existing[k]??null)===JSON.stringify(v??null))
      && JSON.stringify(photoIds)===JSON.stringify([...(prior.stock_import_photo_ids||[])].sort())){
     // Do not reset a successful check or rewrite photos on each scheduled poll.
     // Failed/incomplete checks are resumed independently by the moderation retry cron.
     unchanged++;continue;
    }
    // Both creations and updates enter the same pending -> moderate-listing -> active circuit.
    payload.status='pending';
    let listing:any;
    if(existing){
     delete payload.owner_id;
     listing=must(await admin.from('listings').update(payload).eq('id',existing.id).select('id,photo_limit').single());
     updated++;
    }else{
     payload.photo_limit=15;
     listing=must(await admin.from('listings').insert(payload).select('id,photo_limit').single());
     created++;
    }
    const listingId=listing.id;
    await upsertContact(feed.owner_id,listingId);
    if(r.photos.length){
     must(await admin.from('listing_photos').delete().eq('listing_id',listingId));
     // Read the actual entitlement after database triggers; never enlarge an existing photo cap.
     const allowedLimit=Math.max(1,Math.min(45,Number(listing.photo_limit||15)));
     if(r.photos.length>allowedLimit)photoTruncated++;
     const photoRows=r.photos.slice(0,allowedLimit).map((u:string,i:number)=>({listing_id:listingId,storage_path:u,position:i+1}));
     must(await admin.from('listing_photos').insert(photoRows));
    }
    const importedPhotos=must(await admin.from('listing_photos').select('id').eq('listing_id',listingId))||[];
    // Reuse the signature computed before the update; database-enforced photo caps may be smaller.
    const persistedSignature=includedPhotos.length===Math.min(r.photos.length,Number(listing.photo_limit||15))
      ?signature:await sha256(JSON.stringify({content:contentPayload,photos:r.photos.slice(0,Number(listing.photo_limit||15))}));
    must(await admin.from('listing_moderation').upsert({listing_id:listingId,stock_import_signature:persistedSignature,
     stock_import_photo_ids:importedPhotos.map((p:any)=>p.id).sort()},{onConflict:'listing_id'}));
    // The shared function downloads external photos into private storage, hashes them,
    // scans text + every photo with OpenAI, and alone publishes approved content.
    if(Date.now()-t0<60000){await moderateListingInternal(listingId);moderated++;}else deferred++;
   }catch(e){console.error(e);errors++;failures.push(e instanceof Error?e.message:String(e));}
  }
  const mode=modeOverride||feed.sync_mode;
  // Sécurité des sites lus automatiquement : lecture partielle, ou beaucoup moins de véhicules que d'habitude
  // (site en panne, mise en page changée) => on n'archive rien cette fois-ci.
  if(mode==='full'){
   if((rawRows as any).partial)archiveSkipped='lecture partielle du site';
   else if(feed.source_kind==='site'){
    const{count}=await admin.from('listings').select('id',{count:'exact',head:true}).eq('owner_id',feed.owner_id).eq('source',source).in('status',['active','pending']);
    if((count||0)>=5&&seen.size<(count||0)*0.5)archiveSkipped=`seulement ${seen.size} véhicules lus pour ${count} en ligne`;
   }
  }
  if(mode==='full'&&!archiveSkipped){
   const old=must(await admin.from('listings').select('id,external_id,status').eq('owner_id',feed.owner_id).eq('source',source).not('external_id','is',null));
   for(const l of old||[]){
    if(l.external_id&&!seen.has(l.external_id)&&!['archived','hidden','rejected'].includes(l.status)){
     must(await admin.from('listings').update({status:'archived',last_synced_at:new Date().toISOString()}).eq('id',l.id));archived++;
    }
   }
  }
  const errorMessage=errors?`${errors} annonce(s) en erreur : ${failures.slice(0,3).join(' ; ').slice(0,1200)}`:(archiveSkipped?`Retraits non appliqués : ${archiveSkipped}`:null);
  must(await admin.from('pro_stock_feeds').update({...((rawRows as any).platform?{site_platform:(rawRows as any).platform}:{}),last_run_at:new Date().toISOString(),...(errors?{}:{last_success_at:new Date().toISOString()}),last_error:errorMessage,updated_at:new Date().toISOString()}).eq('id',feed.id));
  if(run)must(await admin.from('pro_stock_sync_runs').update({finished_at:new Date().toISOString(),status:errors?'error':'success',error_message:errorMessage,received_count:rawRows.length,created_count:created,updated_count:updated,archived_count:archived,error_count:errors}).eq('id',run.id));
  return{ok:true,feed_id:feed.id,sector:feed.sector||'vehicules',platform:(rawRows as any).platform||null,received:rawRows.length,created,updated,archived,archive_skipped:archiveSkipped,errors,moderated,moderation_deferred:deferred,unchanged,photo_truncated_count:photoTruncated,photo_policy:'Limite photos du compte et de chaque annonce conservée'};
 }catch(e){
  const msg=e instanceof Error?e.message:String(e);
  await admin.from('pro_stock_feeds').update({last_run_at:new Date().toISOString(),last_error:msg,updated_at:new Date().toISOString()}).eq('id',feed.id);
  if(run)await admin.from('pro_stock_sync_runs').update({finished_at:new Date().toISOString(),status:'error',error_message:msg,received_count:rawRows.length,created_count:created,updated_count:updated,archived_count:archived,error_count:errors+1}).eq('id',run.id);
  throw e;
 }
}

// Activation automatique (28/10/2026, demande d'Anthony) : un site donné à l'inscription est lu tout de suite ;
// s'il se lit entièrement et proprement, il est activé et synchronisé sans attendre l'admin (les annonces passent
// quand même par la modération automatique). Sinon il reste « en attente » avec la raison, pour l'admin.
async function autoReviewSite(feed:any,dryRun=false){
 const mark=async(reason:string,platform:string|null)=>{if(dryRun)return{ok:false,auto_review:'pending',reason,platform};await admin.from('pro_stock_feeds').update({...(platform?{site_platform:platform}:{}),last_run_at:new Date().toISOString(),last_error:'Validation manuelle nécessaire : '+reason,updated_at:new Date().toISOString()}).eq('id',feed.id).eq('review_status','pending');return{ok:false,feed_id:feed.id,auto_review:'pending',reason};};
 let rows:any[];try{rows=await readFeed(feed);}catch(e){return mark(e instanceof Error?e.message:String(e),(e as any)?.platform||null);}
 const platform=(rows as any).platform||null;
 if((rows as any).partial&&!(rows as any).capped&&!dryRun)return mark('lecture partielle du site (trop long à lire en une fois)',platform);
 const norm=await normalizeRows(rows,feed.sector||'vehicules',feed.owner_id);
 const good=norm.filter((r:any)=>!r.errors?.length&&Number(r.price)>0&&r.photos?.length>=1).length;
 const verdict=!norm.length||!good?'aucune annonce complète lue sur le site':good<norm.length*0.8?`seulement ${good} annonce(s) complète(s) sur ${norm.length} lues`:'';
 if(verdict&&!dryRun)return mark(verdict,platform);
 if(dryRun&&!norm.length)return mark(verdict,platform);
 if(dryRun){const n=norm.length,pc=(f:(r:any)=>any)=>Math.round(100*norm.filter(f).length/n);const errs:Record<string,number>={};for(const r of norm)for(const e of r.errors||[])errs[e]=(errs[e]||0)+1;
  return{ok:!verdict,auto_review:verdict?'pending':'approved',reason:verdict||undefined,platform,read:n,complete:good,partial:!!(rows as any).partial,total_on_site:(rows as any).total||undefined,crawl:dryRun?(rows as any).stats||undefined:undefined,urls:dryRun?norm.slice(0,150).map((r:any)=>[r.externalUrl,r.title,r.price,r.sub]):undefined,raw_count:rows.length,city:norm[0]?.city||null,postal:norm[0]?.postal||null,
   fill:{photos_moy:Math.round(10*norm.reduce((a:number,r:any)=>a+(r.photos?.length||0),0)/n)/10,photos_1:pc(r=>(r.photos?.length||0)<=1),prix:pc(r=>Number(r.price)>0),km:pc(r=>r.mileage!=null),annee:pc(r=>r.year!=null),carburant:pc(r=>!!r.fuel),boite:pc(r=>!!r.transmission),marque:pc(r=>!!r.make),description:pc(r=>String(r.description||'').length>=80),ville:pc(r=>!!r.city),surface:pc(r=>r.surface!=null),pieces:pc(r=>r.rooms!=null),dpe:pc(r=>!!r.dpe)},errors:errs,
   sample:norm.slice(0,3).map((r:any)=>({title:r.title,price:r.price,city:r.city,photos:r.photos?.length,km:r.mileage,year:r.year,fuel:r.fuel,desc:String(r.description||'').slice(0,120),errors:r.errors})),
   no_dpe:norm.filter((r:any)=>!r.dpe&&!['parking-garage','vente-terrain'].includes(r.sub)).slice(0,15).map((r:any)=>{const d=String(r.description||'');const hits=[...d.matchAll(/(DPE|[ée]nerg|kWh|GES|climat|CO2|classe)/gi)].slice(0,4).map(m=>d.slice(Math.max(0,(m.index||0)-60),(m.index||0)+90));return{title:r.title,url:r.externalUrl,sub:r.sub,ctx:hits};}),
   failed:norm.filter((r:any)=>r.errors?.length).slice(0,10).map((r:any)=>{const d=String(r.description||'');const gi=d.search(/GES|gaz à effet|CO2/i);return{title:r.title,url:r.externalUrl,errors:r.errors,dpe:r.dpe||null,ges:r.ges||null,desc_len:d.length,ges_ctx:gi>=0?d.slice(Math.max(0,gi-80),gi+80):null,desc_end:d.slice(-160)};})};}
 const{data:upd}=await admin.from('pro_stock_feeds').update({review_status:'approved',active:true,reviewed_at:new Date().toISOString(),reviewed_by:null,site_platform:platform,last_error:null,updated_at:new Date().toISOString()}).eq('id',feed.id).eq('review_status','pending').select('*').maybeSingle();
 if(!upd)return{ok:false,feed_id:feed.id,auto_review:'déjà traité'};
 return{...(await sync(upd,rows)),auto_review:'approved'};
}

Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);try{const body=await req.json().catch(()=>({}));if(body?.action==='normalize_preview'||body?.action==='preview_url'){const user=await authUser(req);if(!user)return json({error:'Non authentifié'},401);const{data:profile}=await admin.from('profiles').select('account_type,is_admin').eq('id',user.id).maybeSingle();if(profile?.account_type!=='professionnel'&&!profile?.is_admin)return json({error:'Compte professionnel requis'},403);const sector=body?.sector==='immobilier'?'immobilier':'vehicules';const rows=body?.action==='preview_url'?await readFeed({feed_url:body.url,format:'auto',sector}):(Array.isArray(body?.rows)?body.rows:[]);if(!rows.length)return json({error:'Aucune ligne à normaliser'},400);return json({ok:true,sector:(rows as any).sector||sector,platform:(rows as any).platform||null,partial:!!(rows as any).partial,total_on_site:(rows as any).total||null,raw:body?.action==='preview_url'&&body?.include_raw?rows:undefined,rows:await normalizeRows(rows,(rows as any).sector||sector,body?.action==='preview_url'&&profile?.is_admin?null:user.id,body?.action==='preview_url')});}if(body?.action==='moderation_probe'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);const secret=await moderationSecret();if(!secret)throw Error('Secret de modération absent');const r=await fetch(`${SUPABASE_URL}/functions/v1/moderate-listing`,{method:'POST',headers:{'Content-Type':'application/json','x-internal-moderation-key':secret},body:JSON.stringify({action:'probe'}),signal:AbortSignal.timeout(90000)});return json(await r.json(),r.status);}const apiFeed=await feedByApiKey(req);if(apiFeed){const rows=parseJson(body?.vehicles??body?.properties??body?.items??body);return json(await sync(apiFeed,rows,body?.sync_mode));}if(body?.action==='auto_review_dry'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);return json(await autoReviewSite({id:null,feed_url:String(body?.url||''),format:'auto',sector:body?.sector==='immobilier'?'immobilier':'vehicules',owner_id:body?.owner_id||null},true));}if(body?.action==='auto_review'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);const{data:f}=await admin.from('pro_stock_feeds').select('*').eq('id',String(body?.feed_id||'')).eq('source_kind','site').eq('review_status','pending').maybeSingle();if(!f)return json({ok:false,error:'Demande introuvable ou déjà traitée'},404);return json(await autoReviewSite(f));}if(body?.action==='sync_all'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);
 // Une demande d'import « en attente » par passage : jamais essayée, ou dernier essai il y a plus de 24 h.
 const autoResults:any[]=[];const tAll=Date.now();{const{data:pend}=await admin.from('pro_stock_feeds').select('*').eq('source_kind','site').eq('review_status','pending').not('feed_url','is',null).or(`last_run_at.is.null,last_run_at.lt.${new Date(Date.now()-24*3600e3).toISOString()}`).order('created_at',{ascending:true}).limit(1);for(const f of pend||[]){try{autoResults.push(await autoReviewSite(f));}catch(e){autoResults.push({ok:false,feed_id:f.id,error:e instanceof Error?e.message:String(e)});}}}const{data:feeds}=await admin.from('pro_stock_feeds').select('*').eq('active',true).not('feed_url','is',null).order('last_run_at',{ascending:true,nullsFirst:true});const results=[];const start=tAll;for(const f of feeds||[]){
 // Sites lus page par page : toutes les 3 h environ (8 fois par jour) pour ne pas surcharger le site du garage.
 if(f.source_kind==='site'&&f.last_run_at&&Date.now()-new Date(f.last_run_at).getTime()<175*60000)continue;
 // Le reste passera au prochain passage du cron (toutes les 15 min), les plus anciens d'abord.
 if(Date.now()-start>40000){results.push({ok:false,feed_id:f.id,skipped:'reporté au prochain passage'});continue;}
 try{results.push(await sync(f,await readFeed(f)));}catch(e){const msg=e instanceof Error?e.message:String(e);await admin.from('pro_stock_feeds').update({...((e as any)?.platform?{site_platform:(e as any).platform}:{}),last_run_at:new Date().toISOString(),last_error:msg,updated_at:new Date().toISOString()}).eq('id',f.id);results.push({ok:false,feed_id:f.id,error:msg});}}return json({ok:true,auto_review:autoResults,results});}const user=await authUser(req);if(!user)return json({error:'Non authentifié'},401);const feedId=String(body?.feed_id||'');if(!feedId)return json({error:'feed_id manquant'},400);const{data:feed}=await admin.from('pro_stock_feeds').select('*').eq('id',feedId).maybeSingle();if(!feed)return json({error:'Flux introuvable'},404);const{data:profile}=await admin.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();const isAdmin=!!profile?.is_admin;if(feed.owner_id!==user.id&&!isAdmin)return json({error:'Accès refusé'},403);
 // Aperçu admin d'un site en attente : lecture seule, rien n'est écrit sauf le prestataire détecté / l'erreur.
 if(body?.action==='preview_feed'){
  if(!isAdmin)return json({error:'Accès administrateur requis'},403);
  try{const rows=await readFeed(feed);const platform=(rows as any).platform||null;
   await admin.from('pro_stock_feeds').update({site_platform:platform,last_error:null,updated_at:new Date().toISOString()}).eq('id',feed.id);
   return json({ok:true,platform,partial:!!(rows as any).partial,total_on_site:(rows as any).total||null,sector:feed.sector,raw:rows,rows:await normalizeRows(rows,feed.sector||'vehicules',feed.owner_id)});}
  catch(e){const msg=e instanceof Error?e.message:String(e);const platform=(e as any)?.platform||null;
   await admin.from('pro_stock_feeds').update({...(platform?{site_platform:platform}:{}),last_error:msg,updated_at:new Date().toISOString()}).eq('id',feed.id);
   return json({ok:false,error:msg,platform});}
 }
 // Un site en attente de validation ne peut être synchronisé que par l'admin (après « Activer »).
 if(feed.review_status&&feed.review_status!=='approved'&&!isAdmin)return json({error:'Import en attente de validation par Abracadeal'},403);
 let rows:any[];try{rows=await readFeed(feed);}catch(e){const msg=e instanceof Error?e.message:String(e);await admin.from('pro_stock_feeds').update({...((e as any)?.platform?{site_platform:(e as any).platform}:{}),last_run_at:new Date().toISOString(),last_error:msg,updated_at:new Date().toISOString()}).eq('id',feed.id);throw e;}
 return json(await sync(feed,rows,body?.sync_mode));}catch(e){console.error(e);return json({error:e instanceof Error?e.message:'Erreur de synchronisation'},500);}});
