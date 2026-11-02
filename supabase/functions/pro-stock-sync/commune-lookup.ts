// 02/11/2026 — Claude (Anthony : « ville manquante, elle est dans la description / le titre », puis « bien vérifier les villes,
// très important ») : toutes les villes lues sont vérifiées dans la liste officielle des communes (geo.api.gouv.fr).
// La liste complète (~35 000 communes) est téléchargée une fois par instance ; si elle n'est pas disponible, chaque nom
// est vérifié un par un auprès de la même base. Seul un nom identique à une vraie commune est retenu (jamais de ville devinée).
export type Commune={nom:string,cp:string,cps:string[],pop:number,lat:number,lon:number};
export const norm=(s:string)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bsaint\b/g,'st').replace(/\bsainte\b/g,'ste').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const STOP=new Set(['maison','appartement','appart','vente','location','villa','terrain','centre','centre-ville','ville','cour','jardin','garage','parking','studio','duplex','loft','immeuble','local','commerce','bureau','bureaux','neuf','ancien','charme','belle','beau','bel','grand','grande','petit','petite','plain-pied','proche','secteur','quartier','exclusivite','exclusif','prix','pieces','piece','chambres','chambre','terrasse','balcon','piscine','vue','mer','port','plage','campagne','bourg','village','hameau','ferme','longere','moulin','chateau','manoir','domaine','propriete','residence','lot','lots','fonds','bar','tabac','restaurant','hotel','boutique','atelier','entrepot','hangar','box','cave','auto','autos','cars','car','motors','moto','occasion','garantie','voiture','agence','immobilier','immo','france','paris-centre','nord','sud','est','ouest','haut','bas','rue','avenue','place','route','chemin','les','le','la','de','du','des','superbe','lumineux','lumineuse','rare','ideal','calme','tram','gare','metro','sans','avec','dernier','etage','type','sous','sur','en']);

// 02/11/2026 (test : « Saint-Michel » de Bordeaux lu comme la commune de l'Aisne, « Saint-André » des Pyrénées-Orientales
// comme celle de La Réunion) : beaucoup de noms existent dans plusieurs départements → toutes les communes du même nom sont
// gardées avec leur position, et c'est la plus proche de l'agence qui est retenue.
type Lists={byName:Map<string,Commune[]>,byCp:Map<string,Commune[]>};
const mk=(c:any):Commune=>({nom:String(c.nom),cp:String((c.codesPostaux||[])[0]||''),cps:(c.codesPostaux||[]).map(String),pop:Number(c.population||0),lat:Number(c.centre?.coordinates?.[1]||0),lon:Number(c.centre?.coordinates?.[0]||0)});
let LIST:Promise<Lists|null>|null=null;let listFailedAt=0;
function loadList(){
  if(LIST)return LIST;
  if(Date.now()-listFailedAt<60_000)return Promise.resolve(null);
  LIST=(async()=>{
    // 02/11/2026 (tests en série : villes non vérifiées quand l'API de l'État ne répondait pas à temps) : copie de la liste
    // gardée dans notre base (table commune_ref), chargée en un appel ; l'API de l'État reste en secours.
    try{const u=Deno.env.get('SUPABASE_URL'),k=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if(u&&k){const r=await fetch(u+'/rest/v1/rpc/commune_list_compact',{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});
        if(r.ok){const txt=String(await r.json()||'');const lines=txt.split('\n');if(lines.length>=30000){
          const byName=new Map<string,Commune[]>(),byCp=new Map<string,Commune[]>();
          for(const ln of lines){const [nom,cps,pop,lat,lon]=ln.split('|');if(!nom)continue;const cl=cps?cps.split(','):[];const c:Commune={nom,cp:cl[0]||'',cps:cl,pop:Number(pop)||0,lat:Number(lat)||0,lon:Number(lon)||0};const kk=norm(nom);(byName.get(kk)||byName.set(kk,[]).get(kk)!).push(c);for(const cp of cl)(byCp.get(cp)||byCp.set(cp,[]).get(cp)!).push(c);}
          return{byName,byCp};}}}}catch{}
    try{
    const r=await fetch('https://geo.api.gouv.fr/communes?fields=nom,codesPostaux,population,centre&format=json',{signal:AbortSignal.timeout(25000)});
    if(!r.ok)throw Error(String(r.status));const arr:any[]=await r.json();if(!Array.isArray(arr)||arr.length<30000)throw Error('liste incomplète');
    const byName=new Map<string,Commune[]>(),byCp=new Map<string,Commune[]>();
    for(const x of arr){const c=mk(x);const k=norm(c.nom);(byName.get(k)||byName.set(k,[]).get(k)!).push(c);for(const cp of c.cps)(byCp.get(cp)||byCp.set(cp,[]).get(cp)!).push(c);}
    return{byName,byCp};
  }catch{listFailedAt=Date.now();LIST=null;return null;}})();
  return LIST;
}
let NEAR:{lat:number,lon:number}|null=null;
const km=(a:{lat:number,lon:number},b:{lat:number,lon:number})=>{const r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lon-a.lon)*r;const h=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)));};
export const nearKnown=()=>!!NEAR;
// 02/11/2026 : nombre de communes portant ce nom (« Saint-Michel » : des dizaines ; « Lorient » : une seule).
export async function homonyms(name:string){const l=await loadList();if(!l)return 0;return (l.byName.get(norm(name))||[]).length;}
export const distanceKm=(c:Commune|null)=>NEAR&&c&&c.lat?Math.round(km(NEAR,c)):null;
// Position de l'agence (ville + code postal de la fiche pro ou du site).
// Agence sans adresse connue (site testé avant inscription) : point médian des annonces dont ville et code postal concordent
// (ou, à défaut, des codes postaux seuls) — les quelques annonces mal lues ne le déplacent pas.
export async function setNear(city:string,postal:string,rows:any[]=[]){
  NEAR=null;const l=await loadList();if(!l)return;
  let c=l.byName.get(norm(city))||[];if(/^\d{5}$/.test(postal||'')){const f=c.filter(x=>x.cps.includes(postal));c=f.length?f:(c.length?c:(l.byCp.get(postal)||[]));}
  const best=[...c].sort((a,b)=>b.pop-a.pop)[0];if(best?.lat){NEAR={lat:best.lat,lon:best.lon};return;}
  const pts:{lat:number,lon:number}[]=[],cpPts:{lat:number,lon:number}[]=[];
  /* 02/11/2026 (herreman-charles : agence du Gers sans code postal sur les fiches → « Montréal » pris dans l'Aude) : les villes au nom unique en France situent aussi l'agence */
  for(const r of rows.slice(0,400)){const cp=String(r?.code_postal??r?.cp??'').trim();if(/^\d{5}$/.test(cp))continue;const v=String(r?.ville??r?.city??'');const arr=v?(l.byName.get(norm(v))||[]):[];if(arr.length===1&&arr[0].lat)pts.push(arr[0]);}
  for(const r of rows.slice(0,400)){const cp=String(r?.code_postal??r?.cp??'').trim();if(!/^\d{5}$/.test(cp))continue;
    const v=String(r?.ville??r?.city??'');const m=v?(l.byName.get(norm(v))||[]).find(x=>x.cps.includes(cp)):undefined;if(m?.lat){pts.push(m);continue;}
    const byCp=(l.byCp.get(cp)||[]).sort((a,b)=>b.pop-a.pop)[0];if(byCp?.lat)cpPts.push(byCp);}
  let use=pts.length>=2?pts:cpPts.length>=2?cpPts:[];
  if(!use.length){/* codes inconnus (Lecoeur : codes INSEE) : département le plus fréquent, autour de sa plus grande commune */
    const dep=new Map<string,number>();for(const r of rows.slice(0,400)){const cp=String(r?.code_postal??r?.cp??'').trim();if(/^\d{5}$/.test(cp))dep.set(cp.slice(0,2),(dep.get(cp.slice(0,2))||0)+1);}
    const top=[...dep.entries()].sort((a,b)=>b[1]-a[1])[0];
    if(top&&top[1]>=2){let big:Commune|null=null;for(const [cp,arr] of l.byCp)if(cp.startsWith(top[0]))for(const c of arr)if(!big||c.pop>big.pop)big=c;if(big?.lat)use=[big];}
  }
  if(!use.length)return;
  const med=(a:number[])=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
  NEAR={lat:med(use.map(p=>p.lat)),lon:med(use.map(p=>p.lon))};
}
// « site » : ville donnée par la fiche (nom unique en France accepté où qu'il soit ; homonymes : le plus proche, à 60 km au plus).
// « texte » : nom repéré dans un titre / une description / un lien (à 100 km au plus de l'agence).
function choose(arr:Commune[],mode:'site'|'text'):Commune|null{
  if(!arr.length)return null;
  if(!NEAR)return [...arr].sort((a,b)=>b.pop-a.pop)[0];
  const d=arr.map(c=>({c,d:c.lat?km(NEAR!,c):99999})).sort((a,b)=>a.d-b.d)[0];
  if(mode==='text')return d.d<=100?d.c:null;
  return arr.length===1||d.d<=60?d.c:null;
}
const cache=new Map<string,Promise<Commune[]>>();let calls=0;
async function exact(name:string,mode:'site'|'text'='site',cp=''):Promise<Commune|null>{
  const pick=(arr:Commune[])=>{if(/^\d{5}$/.test(cp)){const f=arr.filter(c=>c.cps.includes(cp));if(f.length)return f[0];}return choose(arr,mode);};
  const k=norm(name);if(k.length<2||/^\d+$/.test(k))return null;
  const list=await loadList();if(list)return pick(list.byName.get(k)||[]);
  if(!cache.has(k)){
    if(calls>=150)return null;calls++;
    cache.set(k,(async()=>{try{
      const r=await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(name)}&fields=nom,codesPostaux,population,centre&limit=30`,{signal:AbortSignal.timeout(5000)});
      if(!r.ok)return [];const list:any[]=await r.json();return list.filter(c=>norm(String(c.nom))===k).map(mk);
    }catch{return [];}})());
  }
  return pick(await cache.get(k)!);
}
// Ville d'après le code postal seul (plusieurs communes partagent souvent un code : la plus peuplée, signalée « à vérifier »).
export async function communeByPostal(cp:string){if(!/^\d{5}$/.test(cp||''))return null;const l=await loadList();if(!l)return null;const arr=l.byCp.get(cp)||[];if(!arr.length)return null;return{c:[...arr].sort((a,b)=>b.pop-a.pop)[0],several:arr.length>1};}
// Nom pris dans un texte libre (titre, description, lien) : mots courants écartés ; un mot seul doit être une commune
// d'au moins 1 000 habitants (« Vue », « Gare »… sont aussi de petits villages).
async function commune(name:string){
  const k=norm(name);if(k.length<3||STOP.has(k))return null;
  const c=await exact(name,'text');if(!c)return null;
  if(!k.includes('-')&&c.pop<1000)return null;
  return c;
}
function candidates(text:string){
  const out:string[]=[];
  for(const m of text.matchAll(/\b(?:à|a|au|sur|secteur|proche de|proche)\s+((?:[A-ZÉÈÀÂÎÔ][\p{L}'’]+(?:[-\s](?:sur|sous|en|le|la|les|de|du|des|lès|[A-ZÉÈÀÂÎÔ][\p{L}'’]+)){0,4}))/gu))out.push(m[1]);
  for(const m of text.matchAll(/((?:[A-ZÉÈÀÂÎÔ][\p{L}'’]+)(?:-(?:sur|sous|en|le|la|les|de|du|des|lès|l[eè]s|[A-ZÉÈÀÂÎÔa-zé][\p{L}'’]+)){1,5})/gu))out.push(m[1]);
  for(const m of text.matchAll(/\b([A-ZÉÈÀÂÎÔ][A-ZÉÈÀÂÎÔ'’-]{2,}(?:\s[A-ZÉÈÀÂÎÔ][A-ZÉÈÀÂÎÔ'’-]{2,}){0,3})\b/g)){out.push(m[1]);const w=m[1].split(/\s+/);if(w.length>1)for(const x of w)out.push(x);}
  for(const m of text.matchAll(/\b((?:Le|La|Les)\s+[A-ZÉÈÀÂÎÔ][\p{Ll}'’-]{2,})\b/gu))out.push(m[1]);
  for(const m of text.matchAll(/\b([A-ZÉÈÀÂÎÔ][\p{Ll}'’]{2,})\b/gu))out.push(m[1]);
  return out;
}
function slugCandidates(url:string){
  const out:string[]=[];let p='';try{p=decodeURIComponent(new URL(url).pathname);}catch{return out;}
  for(const seg of p.split('/').filter(Boolean)){
    const w=seg.toLowerCase().replace(/\.[a-z]+$/,'').split(/[^a-zà-ÿ0-9]+/).filter(Boolean);
    for(let i=0;i<w.length;i++)for(let n=Math.min(4,w.length-i);n>=1;n--)out.push(w.slice(i,i+n).join('-'));
  }
  return out;
}
async function firstCommune(tries:string[],max=40){
  const seen=new Set<string>();let n=0;
  for(const t of tries){const k=norm(t);if(!k||seen.has(k))continue;seen.add(k);if(++n>max)break;const c=await commune(t);if(c)return c;}
  return null;
}
export async function findCommune(title:string,url:string,description:string){
  return firstCommune([...candidates(String(title||'')),...candidates(String(description||'').slice(0,400)),...slugCandidates(url)]);
}
// Commune écrite dans le titre seul (« … à TALENCE », « BORDEAUX, SAINT-SEURIN, … », « au HAILLAN »).
export async function titleCommune(title:string){
  const t=String(title||'').replace(/\bau\s+([A-ZÉÈÀÂÎÔ][\p{L}'’-]+)/gu,'au Le $1');
  return firstCommune([...candidates(t),...candidates(String(title||''))],30);
}
// Ville fournie par la fiche : nom exact d'une commune (même un petit village), sinon début du nom
// (« Bordeaux Caudéran » → Bordeaux, « Paris 15e » → Paris, « Cannes (06400) » → Cannes).
export async function validateCity(v:string,cp=''):Promise<Commune|null>{
  const s=String(v||'').replace(/\(.*?\)|\b\d{5}\b|\bcedex\b.*$/gi,' ').replace(/\s+/g,' ').trim();if(!s)return null;
  const c=await exact(s,'site',cp);if(c)return c;
  const w=s.split(/[\s,/]+/).filter(Boolean);
  for(let n=w.length-1;n>=1;n--){const part=w.slice(0,n).join(' ');const k=norm(part);if(STOP.has(k))continue;const p=await exact(part,'site',cp);if(p&&(k.includes('-')||p.pop>=1000||n>1))return p;}
  return null;
}
// Code postal vérifié contre la commune ; s'il ne lui appartient pas, celui de la commune le remplace.
export async function checkPostal(ville:string,cp:string){if(!/^\d{5}$/.test(cp))return null;const c=await exact(ville,'site',cp);if(!c||!c.cps.length||c.cps.includes(cp))return null;return c.cps[0];}
export async function listReady(){return !!(await loadList());}
export const resetCommuneCalls=()=>{calls=0;};
