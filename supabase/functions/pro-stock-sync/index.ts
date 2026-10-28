import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
function normalizeImmoSub(typeValue:unknown,transactionValue:unknown=''){const t=norm(typeValue),tr=norm(transactionValue);const renting=['location','louer','rent','rental','lease','a_louer'].includes(tr)||t.includes('location')||t.includes('rent');if(t.includes('saison')||t.includes('vacance'))return'saisonniere';if(t.includes('terrain')||t.includes('land'))return'vente-terrain';if(t.includes('parking')||t.includes('garage')||t.includes('box'))return'parking-garage';if(t.includes('bureau')||t.includes('commerce')||t.includes('local')||t.includes('office')||t.includes('shop'))return'bureaux-commerces';if(t.includes('maison')||t.includes('villa')||t.includes('house'))return renting?'location':'vente-maison';if(t.includes('appartement')||t.includes('studio')||t.includes('apartment')||t.includes('flat'))return renting?'location':'vente-appartement';if(renting)return'location';if(['vente_appartement','appartement_a_vendre'].includes(t))return'vente-appartement';if(['vente_maison','maison_a_vendre'].includes(t))return'vente-maison';return'';}
function normalizeCondition(v:unknown){const t=norm(v);const map:any={neuf:'Neuf',new:'Neuf',comme_neuf:'Comme neuf',tres_bon_etat:'Très bon état',bon_etat:'Bon état',used:'Bon état',occasion:'Bon état',etat_correct:'État correct',correct:'État correct',a_reparer:'À rénover / à réparer',a_renover_a_reparer:'À rénover / à réparer',pour_pieces:'Pour pièces'};return map[t]||String(v||'').trim()||null;}
function normalizeFuel(v:unknown){const t=norm(v);const map:any={essence:'Essence',petrol:'Essence',gasoline:'Essence',diesel:'Diesel',gazole:'Diesel',hybride:'Hybride',hybrid:'Hybride',hybride_rechargeable:'Hybride rechargeable',plug_in_hybrid:'Hybride rechargeable',electrique:'Électrique',electric:'Électrique',ev:'Électrique',gpl:'GPL',lpg:'GPL',autre:'Autre'};return map[t]||String(v||'').trim()||null;}
function normalizeTransmission(v:unknown){const t=norm(v);if(['auto','automatique','automatic','at'].includes(t))return'Automatique';if(['manuelle','manuel','manual','mt'].includes(t))return'Manuelle';return String(v||'').trim()||null;}
function normalizeCritAir(v:unknown){const raw=String(v??'').trim();if(!raw)return null;const t=norm(raw).replace(/^crit_?air_?/,'');if(['0','zero','electrique','electric'].includes(t))return'0';if(['1','2','3','4','5'].includes(t))return t;if(['non_classe','non_classee','non_classement','none','nc'].includes(t))return'Non classé';return null;}
const energyClass=(v:unknown)=>{const x=String(v??'').trim().toUpperCase().replace(/_/g,' ');if(['A','B','C','D','E','F','G'].includes(x))return x;if(['NON SOUMIS','NONSOUMIS','NON CONCERNE','NON CONCERNÉ','EXEMPT'].includes(x))return'NON SOUMIS';return x;};
function normalizeRaw(raw:any){const flat=flatten(raw);const out:any={};for(const[k,v]of Object.entries(flat||{})){const nk=norm(k);if(out[nk]===undefined)out[nk]=v;}return out;}
function normalizeVehicle(raw:any){const o=normalizeRaw(raw);const ref=first(o,['reference','ref','reference_stock','stock_id','stockid','id','identifiant','vehicle_id','vehicleid']);let title=first(o,['titre','title','nom','designation','libelle','name']);const price=num(first(o,['prix','price','prix_eur','tarif','selling_price','sale_price']));const city=first(o,['ville','city','localite','location_city']);const postal=normalizePostal(first(o,['code_postal','cp','postal_code','zipcode','zip']));const description=first(o,['description','desc','details','commentaire','comments']);const sub=normalizeVehicleSub(first(o,['type','sous_categorie','type_vehicule','categorie','category','vehicle_type','body_type']));const make=first(o,['marque','make','brand','manufacturer'])||null;const model=first(o,['modele','model','model_name'])||null;const year=num(first(o,['annee','year','millesime','first_registration_year','registration_year']));const mileage=num(first(o,['kilometrage','km','mileage','odometer']));if(!title&&(make||model))title=[make,model,year].filter(Boolean).join(' ');const equipmentRaw=first(o,['equipements','equipment','options','features','extras']);const equipment=String(equipmentRaw||'').split(/[|;,]/).map(x=>x.trim()).filter(Boolean);const r:any={category:'vehicules',ref,title,price,city,postal,description,sub,condition:normalizeCondition(first(o,['etat','condition','vehicle_condition'])),make,model,year,mileage,fuel:normalizeFuel(first(o,['carburant','fuel','energie','energy'])),transmission:normalizeTransmission(first(o,['boite','boite_vitesse','transmission','gearbox'])),critAir:normalizeCritAir(first(o,['crit_air','critair','crit_air_classe','vignette_crit_air','emission_class'])),body:first(o,['carrosserie','body','body_type','vehicle_body','type_carrosserie']),doors:num(first(o,['portes','nombre_portes','doors','door_count'])),seats:num(first(o,['places','nombre_places','seats','seat_count'])),permit:first(o,['permis','permit','license_required','licence_required']),finish:first(o,['finition','trim','finish','grade']),version:first(o,['version','version_constructeur','variant','derivative']),firstRegistration:first(o,['mise_en_circulation','date_premiere_mise_en_circulation','first_registration','registration_date']),color:first(o,['couleur','color','colour']),upholstery:first(o,['sellerie','upholstery','interior_trim']),fiscalPower:num(first(o,['puissance_fiscale','cv_fiscaux','fiscal_power','tax_hp'])),dinPower:num(first(o,['puissance_din','puissance_ch','din_power','horsepower','hp'])),co2:num(first(o,['co2','emissions_co2','co2_g_km','co2_emissions'])),history:first(o,['historique','historique_vehicule','vehicle_history','owner_history']),technicalInspection:first(o,['controle_technique','ct','technical_inspection']),maintenance:first(o,['entretien','carnet_entretien','maintenance','service_history']),warranty:first(o,['garantie','warranty']),equipment,showPhone:bool(first(o,['afficher_numero','telephone_visible','show_phone']),true),externalUrl:first(o,['url','external_url','listing_url']),photos:photosOf(o),errors:[] as string[]};if(!r.ref)r.errors.push('référence manquante');if(!r.title)r.errors.push('titre manquant');if(!r.city)r.errors.push('ville manquante');if(!r.sub)r.errors.push('type véhicule non reconnu');if(year!==null&&(year<1900||year>2100))r.errors.push('année invalide');if(mileage!==null&&mileage<0)r.errors.push('kilométrage invalide');if(price!==null&&price<0)r.errors.push('prix invalide');return r;}
function normalizeImmo(raw:any){const o=normalizeRaw(raw);const ref=first(o,['reference','ref','reference_mandat','mandat','mandate','property_id','bien_id','id','identifiant']);const transaction=first(o,['transaction','type_transaction','vente_location','operation','deal_type']);const propertyType=first(o,['type_bien','property_type','bien','type','sous_categorie','categorie','category']);const sub=normalizeImmoSub(propertyType,transaction);const surface=num(first(o,['surface','surface_habitable','living_area','area','surface_utile']));const rooms=num(first(o,['pieces','nb_pieces','nombre_pieces','rooms','room_count']));let title=first(o,['titre','title','nom','designation','libelle','name']);const city=first(o,['ville','city','commune','localite','location_city']);if(!title){const kind=sub==='vente-maison'?'Maison':sub==='vente-terrain'?'Terrain':sub==='location'?'Location':sub==='parking-garage'?'Parking / Garage':sub==='bureaux-commerces'?'Local / Bureau':'Appartement';title=[kind,rooms?`${Math.round(rooms)} pièce${rooms>1?'s':''}`:'',surface?`${surface} m²`:'',city].filter(Boolean).join(' · ');}const dpe=energyClass(first(o,['dpe','classe_energie','energy_class','energy_rating']));const ges=energyClass(first(o,['ges','classe_ges','climate_class','ges_class']));const featuresRaw=first(o,['equipements','prestations','features','amenities','options','services']);const features=String(featuresRaw||'').split(/[|;,]/).map(x=>x.trim()).filter(Boolean);const r:any={category:'immobilier',ref,title,price:num(first(o,['prix','price','prix_vente','loyer','rent','tarif','sale_price'])),city,postal:normalizePostal(first(o,['code_postal','cp','postal_code','zipcode','zip'])),description:first(o,['description','desc','details','commentaire','comments','texte_annonce']),sub,propertyType,transaction,surface,landSurface:num(first(o,['surface_terrain','terrain','land_area','plot_area'])),rooms,bedrooms:num(first(o,['chambres','nb_chambres','nombre_chambres','bedrooms','bedroom_count'])),bathrooms:num(first(o,['salles_de_bain','salle_de_bain','salles_eau','bathrooms','bathroom_count'])),floor:num(first(o,['etage','floor','floor_number'])),totalFloors:num(first(o,['nombre_etages','nb_etages','total_floors','building_floors'])),furnished:first(o,['meuble','meublee','furnished']),yearBuilt:num(first(o,['annee_construction','construction_year','year_built'])),propertyCondition:first(o,['etat_bien','etat','property_condition','condition']),heating:first(o,['chauffage','heating','heating_type']),orientation:first(o,['exposition','orientation','exposure']),neighborhood:first(o,['quartier','secteur','neighborhood','district']),dpe,ges,energyConsumption:num(first(o,['consommation_energie','conso_energie','energy_consumption','kwh_m2_an'])),dpeDate:first(o,['date_dpe','dpe_date','diagnostic_date']),energyCostMin:num(first(o,['cout_energie_min','depenses_energie_min','energy_cost_min'])),energyCostMax:num(first(o,['cout_energie_max','depenses_energie_max','energy_cost_max'])),coownership:first(o,['copropriete','coownership','condominium']),lots:num(first(o,['nombre_lots','nb_lots','lots','lot_count'])),annualCharges:num(first(o,['charges_annuelles','annual_charges','copro_charges'])),propertyTax:num(first(o,['taxe_fonciere','property_tax','land_tax'])),fees:first(o,['honoraires','frais_agence','agency_fees','fees']),rentCharges:num(first(o,['charges_mensuelles','charges_location','monthly_charges','rent_charges'])),deposit:num(first(o,['depot_garantie','caution','deposit','security_deposit'])),mandate:first(o,['mandat','reference_mandat','mandate','mandate_reference'])||ref,availableDate:first(o,['disponible_le','date_disponibilite','available_date','availability_date']),features,showPhone:bool(first(o,['afficher_numero','telephone_visible','show_phone']),true),externalUrl:first(o,['url','external_url','listing_url']),photos:photosOf(o),errors:[] as string[]};if(!r.ref)r.errors.push('référence / mandat manquant');if(!r.title)r.errors.push('titre manquant');if(!r.city)r.errors.push('ville manquante');if(!r.sub)r.errors.push('type de bien non reconnu');if(r.price!==null&&r.price<0)r.errors.push('prix invalide');if(r.surface!==null&&r.surface<0)r.errors.push('surface invalide');if(r.landSurface!==null&&r.landSurface<0)r.errors.push('surface terrain invalide');if(dpe&&!['A','B','C','D','E','F','G','NON SOUMIS'].includes(dpe))r.errors.push('DPE invalide');if(ges&&!['A','B','C','D','E','F','G','NON SOUMIS'].includes(ges))r.errors.push('GES invalide');if(['A','B','C','D','E','F','G'].includes(dpe)&&!ges)r.errors.push('GES manquant');return r;}
function normalizePostal(v:unknown){const d=String(v??'').replace(/\D/g,'');if(!d)return'';if(d.length===4)return'0'+d;return d.slice(0,5);}
const communeCache=new Map<string,any>();
async function correctCityPostal(r:any){r.postal=normalizePostal(r.postal);const city=String(r.city||'').trim();if(!city||/^monaco$/i.test(city)||String(r.postal||'').startsWith('980'))return r;const key=norm(city);try{let info=communeCache.get(key);if(info===undefined){const resp=await fetch('https://geo.api.gouv.fr/communes?nom='+encodeURIComponent(city)+'&fields=nom,codesPostaux&boost=population&limit=8');const arr=resp.ok?await resp.json():[];const exact=(arr||[]).find((x:any)=>norm(x.nom)===key)||(arr||[])[0]||null;info=exact?{name:exact.nom,codes:Array.isArray(exact.codesPostaux)?exact.codesPostaux:[]}:null;communeCache.set(key,info);}if(info){r.city=info.name||r.city;if(info.codes.length&&(!r.postal||!info.codes.includes(r.postal)))r.postal=info.codes[0];}}catch(e){console.warn('geo correction failed',city,e);}return r;}
async function ownerLocation(userId:string|null|undefined){if(!userId)return null;try{const[{data:v},{data:p}]=await Promise.all([admin.from('pro_verifications').select('company_city,company_postal_code').eq('user_id',userId).maybeSingle(),admin.from('profiles').select('city').eq('id',userId).maybeSingle()]);const city=String(v?.company_city||p?.city||'').trim();return city?{city,postal:normalizePostal(String(v?.company_postal_code||''))}:null;}catch(e){console.warn('owner location failed',e);return null;}}
async function normalizeRows(rows:any[],sector:string,ownerId?:string|null){const loc=await ownerLocation(ownerId);const out=[];for(const raw of rows.slice(0,5000)){const r=sector==='immobilier'?normalizeImmo(raw):normalizeVehicle(raw);if(!r.city&&loc?.city){r.city=loc.city;if(!r.postal)r.postal=loc.postal||'';r.errors=(r.errors||[]).filter((e:string)=>e!=='ville manquante');}await correctCityPostal(r);out.push(r);}return out;}

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
function aaCell(html:string,label:string){const esc=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=html.match(new RegExp(`<td class="legend">\\s*${esc}\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`,'i'));const v=m?aaClean(m[1]):'';return v==='-'?'':v;}
function parseAaDetail(html:string,url:string,id:string){
 const o:any={reference:id,url};
 // Une fiche vendue renvoie vers une page de liste : sans « n°<id> » dans le titre, on ne lit rien.
 const pageTitle=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'';
 if(!pageTitle.includes(id)&&!new RegExp(`itemprop="mpn">\\s*${id}\\s*<`).test(html)){o._aa_missing='1';return o;}
 o.titre=aaClean(html.match(/<h1 itemprop="name">([\s\S]*?)<\/h1>/i)?.[1]||'');
 const prix=html.match(/<div id="prix"[^>]*>\s*<span>([\d .\u00a0]+)<\/span>/i)?.[1];if(prix)o.prix=prix;
 const map:[string,string][]=[['Marque','marque'],['Modèle','modele'],['Finition','finition'],['Catégorie','carrosserie'],['Kilométrage','kilometrage'],['Année mise circulation','mise_en_circulation'],['Garantie','garantie'],['Energie','carburant'],['Couleur extérieure','couleur'],['Couleur intérieure','sellerie'],['Puissance fiscale','puissance_fiscale'],['Puissance DIN','puissance_din'],['Transmission','boite'],['Emission de CO2','co2'],['Nombre de portes','portes']];
 for(const[label,key]of map){const v=aaCell(html,label);if(v)o[key]=v;}
 if(o.puissance_din)o.puissance_din=o.puissance_din.replace(/\(.*$/,'').trim();
 if(o.boite&&/m[ée]canique/i.test(o.boite))o.boite='manuelle';
 const mec=String(o.mise_en_circulation||'').match(/((?:19|20)\d{2})/);if(mec)o.annee=mec[1];
 const cat=norm(o.carrosserie);
 // Type lu dans la catégorie du site seulement (le titre peut contenir « Quad Cab », etc.).
 if(/\b(moto|motos|scooter|scooters|quad|quads|deux[- ]roues)\b/i.test(o.carrosserie||''))o.type='moto';else if(cat.includes('utilitaire'))o.type='utilitaire';else if(/camping/.test(cat))o.type='camping-car';else o.type='voiture';
 o.etat='occasion';
 const desc=html.match(/<div id="description">[\s\S]*?<div class="box">([\s\S]*?)<\/div>/i)?.[1];if(desc)o.description=aaClean(desc).slice(0,6000);
 const photos:string[]=[];const seenIds=new Set<string>();
 for(const m of html.matchAll(/https?:\/\/auto\.cdn-rivamedia\.com\/photos\/annoncecli\/big\/[^"'\s)<>]+?-(\d+)\.(?:jpe?g|png|webp)/gi)){if(!seenIds.has(m[1])){seenIds.add(m[1]);photos.push(m[0]);}}
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 return o;
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
  const photos:string[]=[];for(const im of p.images||[]){const u=String(im?.src||'');if(/^https?:\/\//i.test(u)&&!photos.includes(u))photos.push(u);}
  if(photos.length)o.photos=photos.slice(0,45).join('|');
  if(/\b(sprinter|vito|transporter|trafic|master|jumper|boxer|ducato|fourgon|utilitaire)\b/i.test(o.titre))o.type='utilitaire';
  try{if(p.permalink){const{text}=await fetchSiteHtml(new URL(p.permalink));Object.assign(o,{...wooSpecs(text),...o});
   if(o.puissance_din&&/^\d+$/.test(o.puissance_din))o.puissance_din+=' ch';
   if(o.annee&&!o.mise_en_circulation)o.mise_en_circulation=o.annee;}}catch{}
  rows.push(o);}}));
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
 if(e.dpeDisplay!==false){const c=ORPI_ENERGY[Number(e.consumptionIndex)||0],g=ORPI_ENERGY[Number(e.emissionIndex)||0];if(c&&g){o.dpe=c;o.ges=g;}if(e.consumptionValue)o.consommation_energie=String(e.consumptionValue);if(e.energyMin)o.cout_energie_min=String(e.energyMin);if(e.energyMax)o.cout_energie_max=String(e.energyMax);if(e.dpeDate)o.date_dpe=String(e.dpeDate).slice(0,10);}
 if(e.fees)o.honoraires=decodeEntities(String(e.fees));if(e.condoCharge&&o.transaction==='vente')o.charges_annuelles=String(e.condoCharge);
 const feats=[e.elevator&&'Ascenseur',e.garage&&'Garage',e.nbParkingSpaces&&'Parking',e.cellar&&'Cave',e.terrace&&'Terrasse',e.balcony&&'Balcon',e.garden&&'Jardin',e.swimmingPool&&'Piscine',e.disabledAccess&&'Accès handicapé'].filter(Boolean);if(feats.length)o.prestations=feats.join('|');
 if(e.longAd)o.description=decodeEntities(String(e.longAd)).replace(/\r/g,'').slice(0,6000);
 const photos:string[]=[];for(const u of [...(e.imagesFull||[]),...(e.images||[])]){const x=decodeEntities(String(u||''));if(/^https?:\/\//i.test(x)){const id=x.split('?')[0];if(!photos.some(p=>p.split('?')[0]===id))photos.push(x);}}
 if(photos.length)o.photos=photos.slice(0,45).join('|');
 return o.reference&&o.titre?o:null;
}
async function readOrpiAgency(origin:URL,slug:string){
 const links=new Map<string,string>();
 for(const listPath of [`/${slug}/acheter`,`/${slug}/louer/biens-en-location`]){
  for(let page=1;page<=20;page++){
   const u=new URL(listPath,origin);if(page>1)u.searchParams.set('page',String(page));
   const{text}=await fetchSiteHtml(u).catch(e=>{throw Error(`Liste des biens illisible (${listPath}, page ${page}) : ${e instanceof Error?e.message:String(e)}`);});
   const before=links.size;
   for(const m of text.matchAll(/href="(\/annonce-[a-z0-9-]+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?[^"]*)"/gi)){if(!links.has(m[2]))links.set(m[2],new URL(decodeEntities(m[1]),origin).toString());}
   if(links.size===before)break;
  }
 }
 if(!links.size)throw Error('Aucun bien trouvé sur la page de l\'agence Orpi : synchronisation annulée par sécurité.');
 const entries=[...links.entries()].slice(0,300);const rows:any[]=[];let i=0;
 await Promise.all(Array.from({length:4},async()=>{while(i<entries.length){const[id,url]=entries[i++];try{const{text}=await fetchSiteHtml(new URL(url));const o=parseOrpiEstate(text,url);rows.push(o||{reference:id,url});}catch{rows.push({reference:id,url});}}}));
 return rows;
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
 o.type_bien=/terrain|land/i.test(t)?'terrain':/maison|villa|house|residence/i.test(t)?'maison':/parking|garage|box/i.test(t)?'parking':/bureau|local|commerce/i.test(t)?'bureau':'appartement';
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
// Prestataire du site (pour savoir quel connecteur ajouter quand le site n'est pas encore lisible).
const SITE_PROVIDERS:[RegExp,string][]=[[/orpi\.com/i,'Orpi'],[/century21\.fr/i,'Century 21'],[/laforet\.com/i,'Laforêt'],[/guy-hoquet\.com/i,'Guy Hoquet'],[/stephaneplazaimmobilier/i,'Stéphane Plaza'],[/nestenn\.com/i,'Nestenn'],[/foncia\.com/i,'Foncia'],[/sweepbright/i,'SweepBright'],[/annonces-automobile\.com|cdn-rivamedia/i,'Annonces-Automobile'],[/la-boite-immo|laboiteimmo/i,'La Boîte Immo'],[/activimmo/i,'Activimmo'],[/apimo\./i,'Apimo'],[/hektor/i,'Hektor'],[/netty\.fr|immonot/i,'Netty / Immonot'],[/adapt-immo/i,'Adapt Immo'],[/ac3-distribution|immo-facile/i,'AC3'],[/twimmo/i,'Twimmo'],[/modelo\.fr/i,'Modelo'],[/spider-?vo/i,'Spider VO'],[/kepler/i,'Kepler'],[/autobiz/i,'Autobiz'],[/wizards?vo|wizards\.fr/i,'Wizards'],[/dealerk|dealer-k/i,'Dealer K'],[/planete?-?vo/i,'Planète VO'],[/gestion-?vo|vo-?online/i,'VO Online'],[/eurotax|autoxpo/i,'Autoxpo'],[/wix\.com|wixstatic/i,'Wix'],[/shopify/i,'Shopify'],[/squarespace/i,'Squarespace'],[/webflow/i,'Webflow'],[/jimdo/i,'Jimdo'],[/wp-content/i,'WordPress']];
function detectSitePlatform(html:string){
 for(const[re,name]of SITE_PROVIDERS)if(re.test(html))return name;
 const m=html.match(/(?:r[ée]alis[ée]|con[cç]u|cr[ée]ation|d[ée]velopp[ée])[^<]{0,20}(?:par|by)\s*(?:<[^>]*>\s*){0,3}([^<]{2,40})/i);
 return m?('Site réalisé par '+decodeEntities(m[1]).trim()):'Inconnu';
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
  if(!r.ok)throw new Error(`Flux HTTP ${r.status}${r.statusText?` ${r.statusText}`:''}`);
  const len=Number(r.headers.get('content-length')||0);
  if(len>25_000_000)throw new Error('Flux trop volumineux (> 25 Mo).');
  const text=await r.text();
  if(text.length>25_000_000)throw new Error('Flux trop volumineux (> 25 Mo).');
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if(ct.includes('html')||/^\s*<(?:!doctype html|html)/i.test(text)){
    // Adresse d'un site de garage (pas d'un flux) : on choisit le lecteur selon le type de site.
    const origin=new URL(url.origin);let rows:any[];let platform:string;
    const orpiSlug=orpiAgencySlug(url)||orpiAgencySlug(new URL(String(feed.feed_url)));
    if(orpiSlug){rows=await readOrpiAgency(origin,orpiSlug);platform='Orpi (page agence)';}
    else if(isAaSiteHtml(text)){rows=await readAaSite(origin);platform='Annonces-Automobile';}
    else if(/wp-content|wp-json/i.test(text)&&await isWooSite(origin)){rows=await readWooSite(origin);platform='WordPress / WooCommerce';}
    else{platform=detectSitePlatform(text);
      try{rows=await readGenericSite(origin,text,feed.sector);platform+=' · données structurées';}
      catch(e){const err:any=new Error(`${e instanceof Error?e.message:String(e)} Prestataire du site : ${platform}.`);err.platform=platform;throw err;}}
    (rows as any).platform=platform;return rows;
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

Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);try{const body=await req.json().catch(()=>({}));if(body?.action==='normalize_preview'||body?.action==='preview_url'){const user=await authUser(req);if(!user)return json({error:'Non authentifié'},401);const{data:profile}=await admin.from('profiles').select('account_type,is_admin').eq('id',user.id).maybeSingle();if(profile?.account_type!=='professionnel'&&!profile?.is_admin)return json({error:'Compte professionnel requis'},403);const sector=body?.sector==='immobilier'?'immobilier':'vehicules';const rows=body?.action==='preview_url'?await readFeed({feed_url:body.url,format:'auto',sector}):(Array.isArray(body?.rows)?body.rows:[]);if(!rows.length)return json({error:'Aucune ligne à normaliser'},400);return json({ok:true,sector,platform:(rows as any).platform||null,partial:!!(rows as any).partial,raw:body?.action==='preview_url'&&body?.include_raw?rows:undefined,rows:await normalizeRows(rows,sector,user.id)});}if(body?.action==='moderation_probe'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);const secret=await moderationSecret();if(!secret)throw Error('Secret de modération absent');const r=await fetch(`${SUPABASE_URL}/functions/v1/moderate-listing`,{method:'POST',headers:{'Content-Type':'application/json','x-internal-moderation-key':secret},body:JSON.stringify({action:'probe'}),signal:AbortSignal.timeout(90000)});return json(await r.json(),r.status);}const apiFeed=await feedByApiKey(req);if(apiFeed){const rows=parseJson(body?.vehicles??body?.properties??body?.items??body);return json(await sync(apiFeed,rows,body?.sync_mode));}if(body?.action==='sync_all'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);const{data:feeds}=await admin.from('pro_stock_feeds').select('*').eq('active',true).not('feed_url','is',null).order('last_run_at',{ascending:true,nullsFirst:true});const results=[];const start=Date.now();for(const f of feeds||[]){
 // Sites lus page par page : toutes les 3 h environ (8 fois par jour) pour ne pas surcharger le site du garage.
 if(f.source_kind==='site'&&f.last_run_at&&Date.now()-new Date(f.last_run_at).getTime()<175*60000)continue;
 // Le reste passera au prochain passage du cron (toutes les 15 min), les plus anciens d'abord.
 if(Date.now()-start>40000){results.push({ok:false,feed_id:f.id,skipped:'reporté au prochain passage'});continue;}
 try{results.push(await sync(f,await readFeed(f)));}catch(e){const msg=e instanceof Error?e.message:String(e);await admin.from('pro_stock_feeds').update({...((e as any)?.platform?{site_platform:(e as any).platform}:{}),last_run_at:new Date().toISOString(),last_error:msg,updated_at:new Date().toISOString()}).eq('id',f.id);results.push({ok:false,feed_id:f.id,error:msg});}}return json({ok:true,results});}const user=await authUser(req);if(!user)return json({error:'Non authentifié'},401);const feedId=String(body?.feed_id||'');if(!feedId)return json({error:'feed_id manquant'},400);const{data:feed}=await admin.from('pro_stock_feeds').select('*').eq('id',feedId).maybeSingle();if(!feed)return json({error:'Flux introuvable'},404);const{data:profile}=await admin.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();const isAdmin=!!profile?.is_admin;if(feed.owner_id!==user.id&&!isAdmin)return json({error:'Accès refusé'},403);
 // Aperçu admin d'un site en attente : lecture seule, rien n'est écrit sauf le prestataire détecté / l'erreur.
 if(body?.action==='preview_feed'){
  if(!isAdmin)return json({error:'Accès administrateur requis'},403);
  try{const rows=await readFeed(feed);const platform=(rows as any).platform||null;
   await admin.from('pro_stock_feeds').update({site_platform:platform,last_error:null,updated_at:new Date().toISOString()}).eq('id',feed.id);
   return json({ok:true,platform,partial:!!(rows as any).partial,sector:feed.sector,raw:rows,rows:await normalizeRows(rows,feed.sector||'vehicules',feed.owner_id)});}
  catch(e){const msg=e instanceof Error?e.message:String(e);const platform=(e as any)?.platform||null;
   await admin.from('pro_stock_feeds').update({...(platform?{site_platform:platform}:{}),last_error:msg,updated_at:new Date().toISOString()}).eq('id',feed.id);
   return json({ok:false,error:msg,platform});}
 }
 // Un site en attente de validation ne peut être synchronisé que par l'admin (après « Activer »).
 if(feed.review_status&&feed.review_status!=='approved'&&!isAdmin)return json({error:'Import en attente de validation par Abracadeal'},403);
 let rows:any[];try{rows=await readFeed(feed);}catch(e){const msg=e instanceof Error?e.message:String(e);await admin.from('pro_stock_feeds').update({...((e as any)?.platform?{site_platform:(e as any).platform}:{}),last_run_at:new Date().toISOString(),last_error:msg,updated_at:new Date().toISOString()}).eq('id',feed.id);throw e;}
 return json(await sync(feed,rows,body?.sync_mode));}catch(e){console.error(e);return json({error:e instanceof Error?e.message:'Erreur de synchronisation'},500);}});
