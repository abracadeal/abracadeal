// 01/11/2026 — Claude (Anthony : « apprends au robot » les réseaux entiers) : agences Guy Hoquet (<agence>.guy-hoquet.com, 37 prospects).
// La liste des biens de l'agence (/biens/result) est remplie par script : le site renvoie tous les biens de l'agence en JSON
// quand on la demande comme le fait la carte (« with_markers=true » + en-tête X-Requested-With). Une seule requête, aucun
// bien d'une autre agence (shop_id unique). La fiche s'ouvre avec /achat-vente/<n'importe quel texte>-<id>.
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
export const isGuyHoquetAgency=(url:URL)=>/^(?!www\.)[a-z0-9-]+\.guy-hoquet\.com$/i.test(url.hostname);
const slug=(s:string)=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const strip=(s:string)=>String(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#039;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\n{3,}/g,'\n\n').trim();
export async function readGuyHoquetAgency(url:URL,_fetchHtml?:Fetcher){
  const api=new URL('/biens/result?with_markers=true',url.origin);
  const r=await fetch(api.toString(),{headers:{'X-Requested-With':'XMLHttpRequest',Accept:'application/json','User-Agent':'Mozilla/5.0 (compatible; Abracadeal-StockSync/1.0; +https://abracadeal.fr)'},signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error(`Guy Hoquet : liste des biens HTTP ${r.status}`);
  let data:any;try{data=await r.json();}catch{throw Error('Guy Hoquet : la liste des biens n’est pas lisible.');}
  const list:any[]=data?.markers?.results||[];
  if(!list.length)throw Error('Aucun bien en ligne pour cette agence Guy Hoquet.');
  const shops=new Map<string,number>();for(const x of list)shops.set(String(x.shop_id),(shops.get(String(x.shop_id))||0)+1);
  const shop=[...shops.entries()].sort((a,b)=>b[1]-a[1])[0][0];
  const rows:any[]=[];
  for(const x of list){
    if(String(x.shop_id)!==shop)continue;
    if(/vendu|lou[ée]|compromis/i.test(String(x.status||'')))continue;
    let info:Record<string,any>={};try{for(const f of JSON.parse(x.informations||'[]'))info[f.field]=f.value;}catch{}
    const loc=String(x.type_transaction)==='2';
    const type=String(x.type||'');
    const rooms=x.number_room?Number(x.number_room):null;
    const path=`${loc?'location':'achat-vente'}/${slug([type,rooms?`${rooms}-pieces`:'',x.city,x.zip].filter(Boolean).join('-'))}-${x.id}`;
    const price=x.price?.price??x.sort_price;
    const dpe=String(info.ConsoEnerFinale||'').trim().toUpperCase();
    rows.push({
      reference:String(x.reference||x.id),url:new URL('/'+path,url.origin).toString(),
      titre:strip(x.name||'')||[type,rooms?`${rooms} pièces`:'',x.city].filter(Boolean).join(' '),
      prix:price!=null&&Number(x.price?.display_price??1)!==0?String(price):'',
      ville:x.city||x.address?.city||'',code_postal:x.zip||x.address?.zip||'',
      description:strip(x.description||''),photos:(x.pictures||[]).join('|'),
      transaction:loc?'location':'vente',type_bien:type,
      surface:x.surface||'',pieces:rooms??'',
      surface_terrain:info.SurfaceTerrain||info.surface_terrain||'',
      salles_de_bain:info.SDB||'',etage:info.Etage||'',annee_construction:info.AnneeConstruction||'',
      chauffage:[info.Chauffage,info.ModeChauffage].filter(Boolean).join(' ').replace(/_/g,' / '),
      dpe:/^[A-G]$/.test(dpe)?dpe:'',consommation_energie:info.conso_energ||'',
      cout_energie_min:info.MontantDepensesEnergieMin||'',cout_energie_max:info.MontantDepensesEnergieMax||'',
      nombre_lots:info.NbLotsCopro||'',
    });
  }
  return rows;
}
