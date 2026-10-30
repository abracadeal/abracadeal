// 30/10/2026 — Claude : sites WordPress de garages avec le thème « Vehica » (wp-content/themes/vehica), ex. motorwine.fr.
// Lecture par l'interface publique WordPress : /wp-json/wp/v2/cars (+ /taxonomies pour le nom de chaque champ).
// Les numéros de champ (vehica_6659…) changent d'un site à l'autre : on les reconnaît par leur nom (« Marque », « Énergie »…)
// ou par leur forme (prix = objet « vehica_currency_… », galerie = liste d'adresses d'images, année = 4 chiffres).
// Voitures « Vendu » / « Réservée » (champ Statut) exclues dès la demande. Rien n'est deviné.
import {sDecode} from './smart-reader.ts';

const UA={'User-Agent':'Abracadeal-StockSync/1.0 (+https://abracadeal.fr)',Accept:'application/json'};
const SOLD=/^(?:vendu|vendue|sold|r[ée]serv[ée]e?|reserved|archiv)/i;
const PICTO=/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/u;

export const isVehicaSite=(html:string)=>/wp-content\/themes\/vehica\b/i.test(html);

async function getJson(u:URL){
  const r=await fetch(u.toString(),{headers:UA,redirect:'follow',signal:AbortSignal.timeout(20000)});
  if(!r.ok){await r.body?.cancel();throw Error(`HTTP ${r.status}`);}
  return {data:await r.json(),total:Number(r.headers.get('x-wp-totalpages')||1)};
}
const clean=(s:any)=>sDecode(String(s??'').replace(/<br\s*\/?>\s*/gi,'\n').replace(/<\/p>\s*/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\r]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
// Titre : sans les pictogrammes et sans les accroches qui suivent (« 🚗 C3 1.2 VTi ❄️ Climatisation 📋 … » → « C3 1.2 VTi »).
function cleanTitle(t:string){
  const s=clean(t).replace(new RegExp('^(?:'+PICTO.source+'|\\s)+','u'),'');
  const cut=s.search(PICTO);return (cut>0?s.slice(0,cut):s).replace(/\s+/g,' ').trim();
}

export async function readVehicaSite(origin:URL){
  const api=(p:string)=>new URL(`/wp-json/wp/v2/${p}`,origin);
  const {data:tax}=await getJson(api('taxonomies?type=vehica_car'));
  const roles=new Map<string,string>();// rest_base → rôle
  for(const t of Object.values<any>(tax||{})){
    const n=String(t?.name||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(),b=String(t?.rest_base||t?.slug||'');
    if(!/^vehica_\d+$/.test(b))continue;
    const role=/^marque|^make|^brand/.test(n)?'marque':/^modele|^model/.test(n)?'modele':/energie|carburant|fuel/.test(n)?'carburant':/boite|transmission|gearbox/.test(n)?'boite'
      :/^couleur|^colou?r/.test(n)?'couleur':/puissance din|^power|chevaux/.test(n)?'puissance':/puissance fiscale/.test(n)?'cv':/^statut|^status|^etat de l|availability/.test(n)?'statut':/^type$|carrosserie|body/.test(n)?'carrosserie':/portes|doors/.test(n)?'portes':'';
    if(role)roles.set(b,role);
  }
  // Noms des valeurs (identifiant → « Citroën », « Diesel »…), pour les champs utiles seulement.
  const names=new Map<number,string>();const soldIds:number[]=[];let statusBase='';
  for(const [b,role] of roles){
    for(let page=1;page<=10;page++){
      let res;try{res=await getJson(api(`${b}?per_page=100&page=${page}&_fields=id,name`));}catch{break;}
      for(const t of res.data||[]){names.set(Number(t.id),clean(t.name));if(role==='statut'&&SOLD.test(clean(t.name)))soldIds.push(Number(t.id));}
      if(page>=res.total)break;
    }
    if(role==='statut')statusBase=b;
  }
  const exclude=statusBase&&soldIds.length?`&${statusBase}_exclude=${soldIds.join(',')}`:'';
  const rows:any[]=[];let partial=false;
  for(let page=1;page<=20;page++){
    let res;try{res=await getJson(api(`cars?per_page=100&page=${page}${exclude}`));}catch{partial=true;break;}
    for(const c of res.data||[]){
      if(c.status&&c.status!=='publish')continue;
      const f:any={};let price='',year='',km='';let photos:string[]=[];
      for(const [k,v] of Object.entries<any>(c)){
        if(!/^vehica_\d+$/.test(k))continue;
        const role=roles.get(k);
        if(role&&Array.isArray(v)){const n=v.map((id:any)=>names.get(Number(id))).filter(Boolean);if(n.length)f[role]=n.join(', ');continue;}
        if(v&&typeof v==='object'&&!Array.isArray(v)){const cur=Object.entries<any>(v).find(([kk])=>/^vehica_currency_/.test(kk));if(cur&&Number(cur[1])>0&&!price)price=String(cur[1]);continue;}
        if(Array.isArray(v)&&v.length&&v.every((x:any)=>typeof x==='string'&&/^https?:\/\/.+\.(?:jpe?g|png|webp)(?:\?|$)/i.test(x))){if(v.length>photos.length)photos=v;continue;}
        if(typeof v==='string'&&/^(?:19|20)\d{2}$/.test(v.trim())&&!year){year=v.trim();continue;}
        if(typeof v==='string'&&/^\d{2,7}$/.test(v.trim())&&!km&&Number(v)>=50)km=v.trim();
      }
      if(f.statut&&SOLD.test(f.statut))continue;
      const title=cleanTitle(c.title?.rendered||'')||[f.marque,f.modele].filter(Boolean).join(' ');
      rows.push({reference:String(c.id),url:c.link,titre:title,marque:f.marque||'',modele:f.modele||'',prix:price,annee:year,kilometrage:km,
        carburant:f.carburant||'',boite:f.boite||'',couleur:f.couleur||'',puissance:(f.puissance||'').replace(/[^\d]/g,''),puissance_fiscale:(f.cv||'').replace(/[^\d]/g,''),
        portes:(f.portes||'').replace(/[^\d]/g,''),carrosserie:f.carrosserie||'',
        type:/utilitaire|fourgon|van\b/i.test(f.carrosserie||'')?'utilitaire':/moto|scooter/i.test(f.carrosserie||'')?'moto':'voiture',etat:'occasion',
        description:clean(c.content?.rendered||'').replace(new RegExp(PICTO.source,'gu'),'').replace(/[ \t]+\n/g,'\n').trim(),photos:photos.join('|')});
    }
    if(page>=res.total)break;
  }
  if(partial)(rows as any).partial=true;
  return rows;
}
