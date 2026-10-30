// 30/10/2026 — Claude : sites « application » (React / Vite, souvent faits avec Lovable) dont le stock est dans leur propre base Supabase.
// La page HTML est vide : le navigateur lit la table du site avec la clé publique incluse dans le script du site.
// Le robot fait exactement la même lecture publique (aucun identifiant privé). Exemple : jbsportauto.fr (table « vehicles »).
// Photos : chemins d'un espace de stockage privé → liens signés comme le fait le site (validité 10 ans, voir signature dans index.ts).
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;

const VEHICLE_TABLES=['vehicles','vehicules','cars','voitures','stock','annonces','listings','inventory','motos'];
const ESTATE_TABLES=['properties','biens','listings','annonces','real_estate','logements'];
const SOLD=/^(?:sold|vendu|vendue|reserved|reserve|réservé|archived|archive|draft|brouillon|hidden|masque|inactive|unavailable|indisponible)$/i;

export function isSupabaseAppShell(html:string){
  return /<script\b[^>]*type=["']module["'][^>]*src=["'][^"']*\/assets\/index-[\w-]+\.js["']/i.test(html)
    ||/<link\b[^>]*rel=["']modulepreload["'][^>]*href=["'][^"']*\/assets\/index-[\w-]+\.js["']/i.test(html);
}

function pick(o:any,keys:string[]){for(const k of keys){const v=o?.[k];if(v!==undefined&&v!==null&&v!=='')return v;}return '';}

async function api(base:string,key:string,path:string,init:RequestInit={}){
  const r=await fetch(base+path,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json','Content-Type':'application/json',...(init.headers||{})},signal:AbortSignal.timeout(20000)});
  if(!r.ok){await r.body?.cancel();return null;}
  try{return await r.json();}catch{return null;}
}

// Les photos peuvent être des adresses complètes, des chemins de stockage, ou des objets {url|path}.
function photoList(row:any):string[]{
  const raw=pick(row,['photos','images','pictures','gallery','photo_urls','image_urls','medias']);
  const one=pick(row,['photo','image','image_url','cover','cover_url','main_photo','thumbnail']);
  let list:any[]=Array.isArray(raw)?raw:typeof raw==='string'&&raw?(raw.trim().startsWith('[')?(()=>{try{return JSON.parse(raw);}catch{return raw.split(/[|,\n]/);}})():raw.split(/[|,\n]/)):[];
  if(!list.length&&one)list=[one];
  return list.map((x:any)=>typeof x==='string'?x:(x?.url||x?.path||x?.src||'')).map((x:string)=>String(x).trim()).filter(Boolean);
}

export async function readSupabaseApp(origin:URL,html:string,sector:string,fetchHtml:Fetcher){
  // 1) Scripts du site : le principal et ceux préchargés par la page.
  const scripts=[...new Set([...html.matchAll(/(?:src|href)=["']([^"']*\/assets\/[\w.-]+\.js)["']/gi)].map(m=>new URL(m[1],origin).toString()))];
  const main=scripts.filter(s=>/\/assets\/index-[\w-]+\.js$/.test(s)).concat(scripts.filter(s=>!/\/assets\/index-[\w-]+\.js$/.test(s))).slice(0,12);
  let base='',key='',js='';
  for(const s of main){
    try{const{text}=await fetchHtml(new URL(s));js+='\n'+text;
      if(!base)base=(text.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)||[''])[0];
      if(!key)key=(text.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)||text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/)||[''])[0];
    }catch{}
    // Pas de Supabase dans le script principal : ce n'est pas ce type de site, on s'arrête là (le lecteur automatique prend la suite).
    if(!base&&/\/assets\/index-[\w-]+\.js$/.test(s))break;
    if(base&&key&&/\.from\(\s*[`'"]\w+[`'"]\s*\)/.test(js))break;
  }
  if(!base||!key)return [];
  // Une clé « anon » doit être un jeton public (role anon), jamais une clé de service.
  if(key.startsWith('eyJ')){try{const p=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(p.role!=='anon')return [];}catch{return [];}}
  // 2) Tables lues par le site (« .from(`vehicles`) ») puis tables habituelles.
  const named=[...new Set([...js.matchAll(/\.from\(\s*[`'"](\w+)[`'"]\s*\)/g)].map(m=>m[1]))];
  const usual=sector==='immobilier'?ESTATE_TABLES:VEHICLE_TABLES;
  const tables=[...named.filter(t=>usual.includes(t)),...usual.filter(t=>!named.includes(t))].slice(0,10);
  const buckets=[...new Set([...js.matchAll(/storage\.from\(\s*[`'"]([\w-]+)[`'"]\s*\)/g)].map(m=>m[1]))];
  let table='',rows:any[]=[];
  for(const t of tables){
    const data=await api(base,key,`/rest/v1/${t}?select=*&limit=1000`);
    if(Array.isArray(data)&&data.length&&data.some(r=>pick(r,['price','prix','prix_vente','loyer','rent'])!=='')){table=t;rows=data;break;}
  }
  if(!table)return [];
  // 3) Page de fiche du site (route « /vehicules/$id »), sinon la page de liste.
  const route=(js.match(new RegExp(`["'\`](\\/[a-z0-9-]+\\/\\$(\\w+))["'\`]`,'g'))||[]).map(x=>x.slice(1,-1)).find(r=>/vehic|voiture|car|annonce|stock|bien|propert|logement/i.test(r))||'';
  const listPage=route?route.replace(/\/\$\w+$/,''):'';
  // 4) Ville du garage : description du site « … à Aumur (39410) » ou « 39410 Aumur ».
  const meta=(html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)/i)||[])[1]||'';
  // (« \b » ne marche pas devant « à », lettre accentuée : on cherche un espace ou le début.)
  const loc=meta.match(/(?:^|\s)à\s+([A-ZÉÈÀÂÎ][\wÀ-ÿ' -]{1,40}?)\s*\((\d{5})\)/)||null;
  const ville=loc?loc[1].trim():'',cp=loc?loc[2]:'';
  // 5) Photos privées : liens signés en une seule demande par fiche.
  const out:any[]=[];
  for(const r of rows){
    const st=String(pick(r,['status','statut','state','etat_annonce'])||'');
    if(SOLD.test(st)||r.is_sold===true||r.sold===true||r.vendu===true||r.published===false||r.is_published===false||r.visible===false||r.is_active===false||r.active===false)continue;
    let photos=photoList(r);
    const paths=photos.filter(p=>!/^https?:\/\//i.test(p));
    if(paths.length){
      const bucket=buckets[0]||table;
      const signed=await api(base,key,`/storage/v1/object/sign/${bucket}`,{method:'POST',body:JSON.stringify({expiresIn:315360000,paths})});
      const map=new Map<string,string>();
      if(Array.isArray(signed))for(const s of signed)if(s?.signedURL&&!s.error)map.set(s.path,`${base}/storage/v1${s.signedURL}`);
      // Espace public : lien direct.
      photos=photos.map(p=>/^https?:\/\//i.test(p)?p:(map.get(p)||'')).filter(Boolean);
      if(!photos.length&&paths.length)photos=paths.map(p=>`${base}/storage/v1/object/public/${bucket}/${p.replace(/^\/+/,'')}`);
    }
    const id=String(pick(r,['id','uuid','reference','ref','slug']));
    const param=route?(route.match(/\$(\w+)$/)||[])[1]:'';
    const url=route?origin.origin+route.replace(/\$\w+$/,encodeURIComponent(String(param&&r[param]!=null?r[param]:id))):origin.origin+(listPage||'/');
    if(sector==='immobilier'){
      out.push({reference:id,url,titre:pick(r,['title','titre','name','nom']),prix:pick(r,['price','prix','prix_vente','loyer','rent']),
        type_bien:pick(r,['property_type','type','type_bien','category']),transaction:pick(r,['transaction','transaction_type','offer_type']),
        surface:pick(r,['surface','area','living_area','surface_habitable']),pieces:pick(r,['rooms','pieces','nb_pieces']),chambres:pick(r,['bedrooms','chambres']),
        ville:pick(r,['city','ville','commune'])||ville,code_postal:pick(r,['postal_code','zip','zipcode','code_postal','cp'])||cp,
        dpe:pick(r,['dpe','energy_class']),ges:pick(r,['ges','ghg_class']),description:pick(r,['description','desc','details']),photos:photos.join('|')});
    }else{
      const brand=String(pick(r,['brand','make','marque'])),model=String(pick(r,['model','modele','modèle']));
      const title=String(pick(r,['title','titre','name','nom'])||[brand,model,pick(r,['version','finition','trim'])].filter(Boolean).join(' '));
      out.push({reference:id,url,titre:title,marque:brand,modele:model,version:pick(r,['version','finition','trim']),
        prix:pick(r,['price','prix','prix_vente']),annee:pick(r,['year','annee','année','model_year']),kilometrage:pick(r,['mileage','km','kilometrage','kilometers','odometer']),
        carburant:pick(r,['fuel','carburant','energie','energy','fuel_type']),boite:pick(r,['transmission','gearbox','boite','boîte']),
        puissance:pick(r,['power','puissance','horsepower','ch']),couleur:pick(r,['color','colour','couleur']),
        type:/moto|scooter|quad/i.test(String(pick(r,['type','category','vehicle_type'])))?'moto':/utilitaire|van|fourgon/i.test(String(pick(r,['type','category','vehicle_type'])))?'utilitaire':'voiture',
        etat:'occasion',ville:pick(r,['city','ville'])||ville,code_postal:pick(r,['postal_code','zip','code_postal','cp'])||cp,
        description:pick(r,['description','desc','details']),photos:photos.join('|')});
    }
  }
  (out as any).platform=`Application Supabase (table « ${table} »)`;
  if(ville)(out as any).siteLocation={city:ville,postal:cp};
  return out;
}
