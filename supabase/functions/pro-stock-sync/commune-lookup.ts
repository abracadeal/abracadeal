// 02/11/2026 — Claude (Anthony : « ville manquante, elle est dans la description / le titre ») :
// quand une fiche n'a ni ville ni code postal, on cherche un nom de commune dans le titre, l'adresse de la fiche
// et le début de la description, et on le vérifie dans la base officielle des communes (geo.api.gouv.fr).
// Seul un nom identique à une vraie commune est retenu (jamais de ville devinée).
const norm=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\bsaint\b/g,'st').replace(/\bsainte\b/g,'ste').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const STOP=new Set(['maison','appartement','appart','vente','location','villa','terrain','centre','centre-ville','ville','cour','jardin','garage','parking','studio','duplex','loft','immeuble','local','commerce','bureau','bureaux','neuf','ancien','charme','belle','beau','bel','grand','grande','petit','petite','plain-pied','proche','secteur','quartier','exclusivite','exclusif','prix','pieces','piece','chambres','chambre','terrasse','balcon','piscine','vue','mer','port','plage','campagne','bourg','village','hameau','ferme','longere','moulin','chateau','manoir','domaine','propriete','residence','lot','lots','fonds','bar','tabac','restaurant','hotel','boutique','atelier','entrepot','hangar','box','cave','auto','autos','cars','car','motors','moto','occasion','garantie','voiture','agence','immobilier','immo','france','paris-centre','nord','sud','est','ouest','haut','bas','rue','avenue','place','route','chemin','les','le','la','de','du','des']);
const cache=new Map<string,Promise<{nom:string,cp:string,cps:string[],pop:number}|null>>();let calls=0;
async function commune(name:string){
  const k=norm(name);if(k.length<3||STOP.has(k)||/^\d+$/.test(k))return null;
  if(!cache.has(k)){
    if(calls>=120)return null;calls++;
    cache.set(k,(async()=>{try{
      const r=await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(name)}&fields=nom,codesPostaux,population&limit=5`,{signal:AbortSignal.timeout(5000)});
      if(!r.ok)return null;const list:any[]=await r.json();
      const same=list.filter(c=>norm(String(c.nom))===k).sort((a,b)=>(b.population||0)-(a.population||0));
      const c=same[0];if(!c)return null;
      // un mot seul et très courant comme nom de lieu-dit : seulement une commune d'au moins 1 000 habitants
      if(!k.includes('-')&&(c.population||0)<1000)return null;
      return{nom:String(c.nom),cp:String((c.codesPostaux||[])[0]||''),cps:(c.codesPostaux||[]).map(String),pop:Number(c.population||0)};
    }catch{return null;}})());
  }
  return cache.get(k)!;
}
function candidates(text:string){
  const out:string[]=[];
  // « … à Bordeaux », « - RM CARS Noisy-Le-Grand », « Bordeaux Saint-Michel - Maison … »
  for(const m of text.matchAll(/\b(?:à|a|sur|secteur|proche de|proche)\s+((?:[A-ZÉÈÀÂÎÔ][\p{L}'’]+(?:[-\s](?:sur|sous|en|le|la|les|de|du|des|lès|[A-ZÉÈÀÂÎÔ][\p{L}'’]+)){0,4}))/gu))out.push(m[1]);
  for(const m of text.matchAll(/((?:[A-ZÉÈÀÂÎÔ][\p{L}'’]+)(?:-(?:sur|sous|en|le|la|les|de|du|des|lès|l[eè]s|[A-ZÉÈÀÂÎÔa-zé][\p{L}'’]+)){1,5})/gu))out.push(m[1]);
  for(const m of text.matchAll(/\b([A-ZÉÈÀÂÎÔ][A-ZÉÈÀÂÎÔ'’-]{2,}(?:\s[A-ZÉÈÀÂÎÔ][A-ZÉÈÀÂÎÔ'’-]{2,}){0,3})\b/g))out.push(m[1]);
  for(const m of text.matchAll(/\b([A-ZÉÈÀÂÎÔ][\p{Ll}'’]{2,})\b/gu))out.push(m[1]);
  return out;
}
function slugCandidates(url:string){
  const out:string[]=[];let p='';try{p=decodeURIComponent(new URL(url).pathname);}catch{return out;}
  for(const seg of p.split('/').filter(Boolean)){
    const w=seg.toLowerCase().replace(/\.[a-z]+$/,'').split(/[^a-zà-ÿ0-9]+/).filter(Boolean);
    // de gauche à droite, le plus long d'abord : « bordeaux-saint-michel-… » donne Bordeaux (pas le quartier Saint-Michel)
    for(let i=0;i<w.length;i++)for(let n=Math.min(4,w.length-i);n>=1;n--)out.push(w.slice(i,i+n).join('-'));
  }
  return out;
}
export async function findCommune(title:string,url:string,description:string){
  const tries=[...candidates(String(title||'')),...candidates(String(description||'').slice(0,400)),...slugCandidates(url)];
  const seen=new Set<string>();let n=0;
  for(const t of tries){const k=norm(t);if(seen.has(k))continue;seen.add(k);if(++n>25)break;const c=await commune(t);if(c)return c;}
  return null;
}
// 02/11/2026 (Dolce Immo : « Le Bouscat » avec le code postal 33700 de Mérignac, pris dans une autre annonce de la page) :
// code postal vérifié contre la commune ; s'il ne lui appartient pas, celui de la commune le remplace.
export async function checkPostal(ville:string,cp:string){if(!/^\d{5}$/.test(cp))return null;const c=await commune(ville);if(!c||!c.cps.length||c.cps.includes(cp))return null;return c.cps[0];}
export const resetCommuneCalls=()=>{calls=0;};
