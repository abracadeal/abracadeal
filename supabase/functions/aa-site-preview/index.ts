import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Aperçu admin (lecture seule, aucune écriture en base) des connecteurs « sites de garages »
// (Annonces-Automobile, WordPress/WooCommerce) de pro-stock-sync. Même code de lecture. Utilisé par admin-test-import.html.
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const norm=(s:unknown)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const HTML_NAMED:Record<string,string>={eacute:'é',egrave:'è',ecirc:'ê',euml:'ë',agrave:'à',acirc:'â',auml:'ä',ccedil:'ç',ocirc:'ô',ouml:'ö',ucirc:'û',ugrave:'ù',uuml:'ü',icirc:'î',iuml:'ï',Eacute:'É',Egrave:'È',Agrave:'À',Ccedil:'Ç',oelig:'œ',OElig:'Œ',euro:'€',deg:'°',laquo:'«',raquo:'»',rsquo:'’',lsquo:'‘',hellip:'…',ndash:'–',mdash:'—',sup2:'²'};
const decodeEntities=(v:string)=>v.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&([a-zA-Z]+\d?);/g,(m,n)=>HTML_NAMED[n]??m).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#0?39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;|&#160;/g,' ');
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
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const h=req.headers.get('Authorization')||'';
  const c=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:h}},auth:{persistSession:false}});
  const{data:{user}}=await c.auth.getUser();
  if(!user)return json({error:'Non authentifié'},401);
  const{data:p}=await admin.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
  if(!p?.is_admin)return json({error:'Accès administrateur requis'},403);
  const b=await req.json().catch(()=>({}));
  let u:URL;try{u=new URL(String(b.url||'').trim());}catch{return json({error:'Adresse invalide'},400);}
  const t0=Date.now();
  const home=await fetchSiteHtml(new URL('/',u.origin)).catch(e=>{throw Error(`Site inaccessible : ${e instanceof Error?e.message:String(e)}`);});
  let kind='',rows:any[]=[];
  if(isAaSiteHtml(home.text)){kind='Annonces-Automobile';rows=await readAaSite(new URL(u.origin));}
  else if(await isWooSite(new URL(u.origin))){kind='WordPress / WooCommerce';rows=await readWooSite(new URL(u.origin));}
  else return json({error:"Ce type de site n'est pas encore pris en charge (ni Annonces-Automobile, ni WordPress avec boutique WooCommerce)."},422);
  return json({ok:true,site:u.origin,kind,ms:Date.now()-t0,rows:rows.sort((a:any,b:any)=>Number(b.reference)-Number(a.reference))});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e)},500);}
});
