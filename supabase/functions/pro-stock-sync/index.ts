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
function parseXml(text:string){const tags=['vehicle','vehicule','car','property','bien','realestate','listing','annonce','ad','item','stockitem','moto'];let blocks:string[]=[];for(const t of tags){blocks=[...text.matchAll(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`,'gi'))].map(m=>m[1]);if(blocks.length)break;}if(!blocks.length)return[];const aliases=[...XML_ALIASES];for(let i=1;i<=30;i++)aliases.push(`photo_${i}`,`photo${i}`,`image_${i}`,`image${i}`,`picture_${i}`,`picture${i}`);return blocks.map(b=>{const o:any={};for(const a of aliases){const v=xmlVal(b,a);if(v)o[norm(a)]=v;}const urls:string[]=[];for(const m of b.matchAll(/<(?:photo|image|picture)(?:\s([^>]*))?(?:>([\s\S]*?)<\/(?:photo|image|picture)>|\s*\/>)/gi)){const attrs=m[1]||'';const u=attrs.match(/(?:url|src|href)=["']([^"']+)["']/i)?.[1]||String(m[2]||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'').trim();if(/^https?:\/\//i.test(u))urls.push(u.replace(/&amp;/g,'&'));}if(urls.length)o.photos=urls.join('|');return o;});}
function parseJson(v:any){const arr=Array.isArray(v)?v:(v?.vehicles||v?.vehicules||v?.properties||v?.biens||v?.listings||v?.annonces||v?.items||v?.stock||v?.data||v?.results||[]);return(Array.isArray(arr)?arr:[]).map((x:any)=>flatten(x));}
function photosOf(o:any){const photos:string[]=[];const add=(v:any)=>{if(Array.isArray(v)){v.forEach(add);return;}if(v&&typeof v==='object'){Object.values(v).forEach(add);return;}String(v??'').split(/[\n|;\s]+/).forEach(p=>{const x=p.trim();if(/^https?:\/\//i.test(x)&&!photos.includes(x)&&photos.length<30)photos.push(x);});};for(const [k,v]of Object.entries(o)){if(/(^|_)(photo|photos|image|images|picture|pictures)(_|$)/.test(k))add(v);}for(let i=1;i<=30;i++)add(first(o,[`photo_${i}`,`photo${i}`,`image_${i}`,`image${i}`,`picture_${i}`,`picture${i}`]));return photos.slice(0,30);}
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
async function normalizeRows(rows:any[],sector:string){const out=[];for(const raw of rows.slice(0,5000)){const r=sector==='immobilier'?normalizeImmo(raw):normalizeVehicle(raw);await correctCityPostal(r);out.push(r);}return out;}

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
 let created=0,updated=0,archived=0,errors=0,photoTruncated=0,moderated=0,unchanged=0;
 const failures:string[]=[];
 const seen=new Set<string>();const source=`feed:${feed.id}`;
 const must=(r:any)=>{if(r.error)throw r.error;return r.data;};
 try{
  const rows=await normalizeRows(rawRows,feed.sector||'vehicules');
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
    const includedPhotos=r.photos.slice(0,Math.max(1,Math.min(30,Number(existing?.photo_limit||15))));
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
     const allowedLimit=Math.max(1,Math.min(30,Number(listing.photo_limit||15)));
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
    await moderateListingInternal(listingId);
    moderated++;
   }catch(e){console.error(e);errors++;failures.push(e instanceof Error?e.message:String(e));}
  }
  const mode=modeOverride||feed.sync_mode;
  if(mode==='full'){
   const old=must(await admin.from('listings').select('id,external_id,status').eq('owner_id',feed.owner_id).eq('source',source).not('external_id','is',null));
   for(const l of old||[]){
    if(l.external_id&&!seen.has(l.external_id)&&!['archived','hidden','rejected'].includes(l.status)){
     must(await admin.from('listings').update({status:'archived',last_synced_at:new Date().toISOString()}).eq('id',l.id));archived++;
    }
   }
  }
  const errorMessage=errors?`${errors} annonce(s) en erreur : ${failures.slice(0,3).join(' ; ').slice(0,1200)}`:null;
  must(await admin.from('pro_stock_feeds').update({last_run_at:new Date().toISOString(),...(errors?{}:{last_success_at:new Date().toISOString()}),last_error:errorMessage,updated_at:new Date().toISOString()}).eq('id',feed.id));
  if(run)must(await admin.from('pro_stock_sync_runs').update({finished_at:new Date().toISOString(),status:errors?'error':'success',error_message:errorMessage,received_count:rawRows.length,created_count:created,updated_count:updated,archived_count:archived,error_count:errors}).eq('id',run.id));
  return{ok:true,feed_id:feed.id,sector:feed.sector||'vehicules',received:rawRows.length,created,updated,archived,errors,moderated,unchanged,photo_truncated_count:photoTruncated,photo_policy:'Limite photos du compte et de chaque annonce conservée'};
 }catch(e){
  const msg=e instanceof Error?e.message:String(e);
  await admin.from('pro_stock_feeds').update({last_run_at:new Date().toISOString(),last_error:msg,updated_at:new Date().toISOString()}).eq('id',feed.id);
  if(run)await admin.from('pro_stock_sync_runs').update({finished_at:new Date().toISOString(),status:'error',error_message:msg,received_count:rawRows.length,created_count:created,updated_count:updated,archived_count:archived,error_count:errors+1}).eq('id',run.id);
  throw e;
 }
}

Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);try{const body=await req.json().catch(()=>({}));if(body?.action==='normalize_preview'||body?.action==='preview_url'){const user=await authUser(req);if(!user)return json({error:'Non authentifié'},401);const{data:profile}=await admin.from('profiles').select('account_type,is_admin').eq('id',user.id).maybeSingle();if(profile?.account_type!=='professionnel'&&!profile?.is_admin)return json({error:'Compte professionnel requis'},403);const sector=body?.sector==='immobilier'?'immobilier':'vehicules';const rows=body?.action==='preview_url'?await readFeed({feed_url:body.url,format:'auto'}):(Array.isArray(body?.rows)?body.rows:[]);if(!rows.length)return json({error:'Aucune ligne à normaliser'},400);return json({ok:true,sector,rows:await normalizeRows(rows,sector)});}if(body?.action==='moderation_probe'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);const secret=await moderationSecret();if(!secret)throw Error('Secret de modération absent');const r=await fetch(`${SUPABASE_URL}/functions/v1/moderate-listing`,{method:'POST',headers:{'Content-Type':'application/json','x-internal-moderation-key':secret},body:JSON.stringify({action:'probe'}),signal:AbortSignal.timeout(90000)});return json(await r.json(),r.status);}const apiFeed=await feedByApiKey(req);if(apiFeed){const rows=parseJson(body?.vehicles??body?.properties??body?.items??body);return json(await sync(apiFeed,rows,body?.sync_mode));}if(body?.action==='sync_all'){if(!await cronOk(req))return json({error:'Accès cron refusé'},403);const{data:feeds}=await admin.from('pro_stock_feeds').select('*').eq('active',true).not('feed_url','is',null);const results=[];for(const f of feeds||[]){try{results.push(await sync(f,await readFeed(f)));}catch(e){results.push({ok:false,feed_id:f.id,error:e instanceof Error?e.message:String(e)});}}return json({ok:true,results});}const user=await authUser(req);if(!user)return json({error:'Non authentifié'},401);const feedId=String(body?.feed_id||'');if(!feedId)return json({error:'feed_id manquant'},400);const{data:feed}=await admin.from('pro_stock_feeds').select('*').eq('id',feedId).maybeSingle();if(!feed)return json({error:'Flux introuvable'},404);const{data:profile}=await admin.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();if(feed.owner_id!==user.id&&!profile?.is_admin)return json({error:'Accès refusé'},403);return json(await sync(feed,await readFeed(feed),body?.sync_mode));}catch(e){console.error(e);return json({error:e instanceof Error?e.message:'Erreur de synchronisation'},500);}});
