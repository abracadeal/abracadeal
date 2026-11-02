// 02/11/2026 — Claude (Anthony : « ville manquante, elle est dans la description / le titre », puis « bien vérifier les villes,
// très important ») : toutes les villes lues sont vérifiées dans la liste officielle des communes (geo.api.gouv.fr).
// La liste complète (~35 000 communes) est téléchargée une fois par instance ; si elle n'est pas disponible, chaque nom
// est vérifié un par un auprès de la même base. Seul un nom identique à une vraie commune est retenu (jamais de ville devinée).
export type Commune={nom:string,cp:string,cps:string[],pop:number};
export const norm=(s:string)=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\bsaint\b/g,'st').replace(/\bsainte\b/g,'ste').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const STOP=new Set(['maison','appartement','appart','vente','location','villa','terrain','centre','centre-ville','ville','cour','jardin','garage','parking','studio','duplex','loft','immeuble','local','commerce','bureau','bureaux','neuf','ancien','charme','belle','beau','bel','grand','grande','petit','petite','plain-pied','proche','secteur','quartier','exclusivite','exclusif','prix','pieces','piece','chambres','chambre','terrasse','balcon','piscine','vue','mer','port','plage','campagne','bourg','village','hameau','ferme','longere','moulin','chateau','manoir','domaine','propriete','residence','lot','lots','fonds','bar','tabac','restaurant','hotel','boutique','atelier','entrepot','hangar','box','cave','auto','autos','cars','car','motors','moto','occasion','garantie','voiture','agence','immobilier','immo','france','paris-centre','nord','sud','est','ouest','haut','bas','rue','avenue','place','route','chemin','les','le','la','de','du','des','superbe','lumineux','lumineuse','rare','ideal','calme','tram','gare','metro','sans','avec','dernier','etage','type','sous','sur','en']);

let LIST:Promise<Map<string,Commune>|null>|null=null;let listFailedAt=0;
function loadList(){
  if(LIST)return LIST;
  if(Date.now()-listFailedAt<10*60_000)return Promise.resolve(null);
  LIST=(async()=>{try{
    const r=await fetch('https://geo.api.gouv.fr/communes?fields=nom,codesPostaux,population&format=json',{signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw Error(String(r.status));const arr:any[]=await r.json();if(!Array.isArray(arr)||arr.length<30000)throw Error('liste incomplète');
    const m=new Map<string,Commune>();
    for(const c of arr){const k=norm(c.nom);const pop=Number(c.population||0);const prev=m.get(k);if(!prev||pop>prev.pop)m.set(k,{nom:String(c.nom),cp:String((c.codesPostaux||[])[0]||''),cps:(c.codesPostaux||[]).map(String),pop});}
    return m;
  }catch{listFailedAt=Date.now();LIST=null;return null;}})();
  return LIST;
}

const cache=new Map<string,Promise<Commune|null>>();let calls=0;
async function exact(name:string):Promise<Commune|null>{
  const k=norm(name);if(k.length<2||/^\d+$/.test(k))return null;
  const list=await loadList();if(list)return list.get(k)||null;
  if(!cache.has(k)){
    if(calls>=150)return null;calls++;
    cache.set(k,(async()=>{try{
      const r=await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(name)}&fields=nom,codesPostaux,population&limit=5`,{signal:AbortSignal.timeout(5000)});
      if(!r.ok)return null;const list:any[]=await r.json();
      const c=list.filter(c=>norm(String(c.nom))===k).sort((a,b)=>(b.population||0)-(a.population||0))[0];if(!c)return null;
      return{nom:String(c.nom),cp:String((c.codesPostaux||[])[0]||''),cps:(c.codesPostaux||[]).map(String),pop:Number(c.population||0)};
    }catch{return null;}})());
  }
  return cache.get(k)!;
}
// Nom pris dans un texte libre (titre, description, lien) : mots courants écartés ; un mot seul doit être une commune
// d'au moins 1 000 habitants (« Vue », « Gare »… sont aussi de petits villages).
async function commune(name:string){
  const k=norm(name);if(k.length<3||STOP.has(k))return null;
  const c=await exact(name);if(!c)return null;
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
export async function validateCity(v:string):Promise<Commune|null>{
  const s=String(v||'').replace(/\(.*?\)|\b\d{5}\b|\bcedex\b.*$/gi,' ').replace(/\s+/g,' ').trim();if(!s)return null;
  const c=await exact(s);if(c)return c;
  const w=s.split(/[\s,/]+/).filter(Boolean);
  for(let n=w.length-1;n>=1;n--){const part=w.slice(0,n).join(' ');const k=norm(part);if(STOP.has(k))continue;const p=await exact(part);if(p&&(k.includes('-')||p.pop>=1000||n>1))return p;}
  return null;
}
// Code postal vérifié contre la commune ; s'il ne lui appartient pas, celui de la commune le remplace.
export async function checkPostal(ville:string,cp:string){if(!/^\d{5}$/.test(cp))return null;const c=await exact(ville);if(!c||!c.cps.length||c.cps.includes(cp))return null;return c.cps[0];}
export async function listReady(){return !!(await loadList());}
export const resetCommuneCalls=()=>{calls=0;};
