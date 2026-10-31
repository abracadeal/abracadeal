// Structured Next.js / urql + Openflex vehicle DTO sites. No domain or concession hardcoded.
// Public rendered Next data only: no GraphQL credentials, scripts evaluated or network-wide import.
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
type Item={id:string,url:string,fingerprint:string,tries:number};
export type DealerState={source:string,started:string,completed:string|null,queue:Item[],rows:Record<string,any>,seen:string[],fingerprints:Record<string,string>,scope:string};
export type Memory={load:()=>Promise<DealerState|null>,save:(s:DealerState)=>Promise<void>};
const text=(v:any)=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function nextData(html:string){
 try{if(/^\s*\{/.test(html)){const j=JSON.parse(html);return j.pageProps?{props:{pageProps:j.pageProps}}:j;}
 const m=html.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i);return m?JSON.parse(m[1]):null;}catch{return null;}
}
function roots(page:any){const p=page?.props?.pageProps||{};const out:any[]=[];for(const v of Object.values<any>(p.urqlState||{})){try{const d=typeof v.data==='string'?JSON.parse(v.data):v.data;if(d)out.push(d);}catch{}}return out;}
export const isNextDealer=(html:string)=>html.includes('__NEXT_DATA__')&&html.includes('urqlState')&&html.includes('retail_points')&&html.includes('i_pve_id');
const attrs=(x:any)=>x?.attributes||{};
const point=(a:any)=>attrs(a?.i_pve_id?.data);
const locKey=(p:any)=>[p.latitude,p.longitude,p.postalCode].map(x=>String(x??'').trim()).join('|');
const slug=(s:any)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function catalogue(page:any){let best:any[]=[];for(const r of roots(page))for(const k of ['cars','voitures']){const a=r[k]?.data;if(Array.isArray(a)&&a.some(x=>attrs(x).slug&&attrs(x).i_pve_id)&&a.length>best.length)best=a;}return best;}
function agency(page:any,url:URL){
 const id=url.pathname.replace(/\/+$/,'').split('/').pop();let found:any=null;
 for(const r of roots(page))for(const d of r.distributors?.data||[]){const a=attrs(d);if(a.slug===id&&Array.isArray(a.retail_points?.data)&&(!found||JSON.stringify(a).length>JSON.stringify(found).length))found=a;}
 if(!found)throw Error('Choisissez la page de la concession inscrite : le catalogue de tout le groupe ne peut pas être importé.');
 const points=found.retail_points.data.map(attrs).filter((p:any)=>p.latitude!=null&&p.longitude!=null&&p.postalCode);
 if(!points.length)throw Error('Point de vente de cette concession non identifié ; aucun stock du groupe ne sera repris.');
 return {...found,points};
}
function carPath(a:any){if(!a.sBrand||!a.sModel||!a.slug||!/^[-a-z0-9]+$/i.test(a.slug))throw Error('Adresse de fiche structurée absente.');return `/voiture-occasion/${slug(a.sBrand)}/${slug(a.sModel)}/${a.slug}`;}
function makeUrl(base:URL,path:string,build:string){const u=new URL(path,base);if(build)u.pathname=`/_next/data/${encodeURIComponent(build)}${u.pathname}.json`;return u;}
export function parseDealerVehicle(page:any,url:string,expectedId:string,scope:any){
 let dto:any;const pp=page?.props?.pageProps||{};try{dto=typeof pp.dataVehiculeDetail==='string'?JSON.parse(pp.dataVehiculeDetail)?.aVehicle:pp.dataVehiculeDetail?.aVehicle;}catch{}
 const car=roots(page).map(r=>r.car?.data).find(Boolean),a=attrs(car);
 if(!dto||String(car?.id)!==expectedId||String(dto.iId)!==expectedId)throw Error('Fiche structurée absente ou référence différente.');
 // Validate the actual stock point, NOT a radius/city. Two concessions in one city can have different stocks.
 const p=point(a);if(!scope.points.some((x:any)=>locKey(x)===locKey(p)))return null;
 const ds=p.distributors?.data?.map(attrs)||[];
 if(!ds.some((d:any)=>d.title===scope.title))return null;
 const status=text(dto.sVehicleStatutLibelle).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const title=[dto.sBrandName,dto.sModel,dto.sName,dto.sNameBis].filter(Boolean).join(' ');
 const publication=text(dto.s_pub_commentaire_publication);
 if(status!=='disponible a la vente'||/vehicule\s+neuf|\bVN\b|\b0\s*km\b|en commande|stock usine/i.test((title+' '+publication).normalize('NFD').replace(/[\u0300-\u036f]/g,''))||Number(dto.iMileage)<=0)return null;
 if(!Number.isFinite(Number(dto.iMileage))||!dto.sMECDate)throw Error('Occasion non confirmée : kilométrage ou première immatriculation absent.');
 const equipment=[...new Set(Object.values<any>(dto.aEquipmentGroups||{}).map(x=>text(x.sWording)).filter(Boolean))];
 const photos=[...new Set<string>((Array.isArray(dto.aPictures)?dto.aPictures:[]).filter((u:any)=>typeof u==='string'&&/^https?:\/\//i.test(u)))];
 const fuel=text(dto.sFuel),box=text(dto.sGearboxType),date=String(dto.sMECDate).slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Date.parse(date)>Date.now())return null;
 const phone=text(dto.sContactTelPort||dto.sContactTel||ds.find((x:any)=>x.title===scope.title)?.phone_vo||dto.sPVETelFixe||scope.phoneNumber);
 return {reference:expectedId,url,titre:[dto.sBrandName,dto.sName,dto.sNameBis].filter(Boolean).join(' '),marque:dto.sBrandName,modele:dto.sModel,version:dto.sNameBis,
  prix:dto.fTotalPrice,annee:date.slice(0,4),mise_en_circulation:date,kilometrage:dto.iMileage,
  carburant:/courant.*(essence|diesel)|(essence|diesel).*courant|hybrid/i.test(fuel)?'Hybride':/courant|lectrique/i.test(fuel)?'Électrique':fuel,
  boite:/autom|multimode|double embrayage|sequent/i.test(box)?'Automatique':/manu/i.test(box)?'Manuelle':box,
  type:/utilitaire|fourgon/i.test(text(dto.sBody))?'utilitaire':'voiture',etat:'occasion',ville:p.city||dto.sPVEVille,code_postal:p.postalCode||dto.sPVECP,
  couleur:dto.sCouleurExt,portes:dto.iNumberOfDoors,places:dto.iNumberOfSeats,puissance_fiscale:dto.fHorseTax,puissance_din:dto.fHorsePower,co2:dto.iCO2Emission,crit_air:dto.s_veh_critair,
  garantie:dto.sGuarantee,equipements:equipment.join('|'),photos:photos.join('|'),contact_telephone:phone,
  description:[publication,dto.sGuarantee?'Garantie : '+text(dto.sGuarantee):'',equipment.length?'Équipements :\n- '+equipment.join('\n- '):''].filter(Boolean).join('\n\n')};
}
export async function readNextDealer(start:URL,homeHtml:string,fetchHtml:Fetcher,memory?:Memory,options:{budgetMs?:number,maxDetails?:number,now?:()=>number}={}){
 const clock=options.now||Date.now,t0=clock(),budget=options.budgetMs??45000,max=options.maxDetails??220;
 const home=nextData(homeHtml),scope=agency(home,start),build=home?.buildId||'';
 if(!build||!/^[a-zA-Z0-9_-]+$/.test(build))throw Error('Version Next.js du catalogue introuvable.');
 // Every crawl belongs to one configured URL and an exact published physical-point set.
 const scopeKey=scope.slug+'|'+scope.points.map(locKey).sort().join(';');
 let state=memory?await memory.load():null;let pages=0,failed=0,excluded=0,details=0;const detailErrors:{id:string,error:string}[]=[];
 const fresh=!state||state.source!==start.toString()||state.scope!==scopeKey||!!state.completed||clock()-Date.parse(state.started)>72*3600e3;
 if(fresh){
  const listUrl=makeUrl(start,'/voiture-occasion',build);const result=await fetchHtml(listUrl);pages++;
  if(result.url.origin!==start.origin)throw Error('Catalogue redirigé hors du site de la concession.');
  const all=catalogue(nextData(result.text));if(!all.length)throw Error('Catalogue structuré absent : lecture non considérée comme complète.');
  if(all.length>=9998)throw Error('Catalogue national plafonné : un flux paginé du fournisseur est nécessaire avant de conclure le tour.');
  const mine=all.filter(c=>scope.points.some((p:any)=>locKey(p)===locKey(point(attrs(c)))));
  const prior=state;state={source:start.toString(),scope:scopeKey,started:new Date(clock()).toISOString(),completed:null,queue:[],rows:{},seen:[],fingerprints:{}};
  const unique=new Set<string>();
  for(const c of mine){const a=attrs(c),id=String(c.id||'');if(!id||unique.has(id))continue;unique.add(id);
   const fingerprint=JSON.stringify(a);state.fingerprints[id]=fingerprint;
   // A price/title fingerprint alone cannot prove that a vehicle wasn't reserved since the last crawl.
   const canReuse=typeof a.updatedAt==='string'&&typeof a.sVehicleStatutLibelle==='string';
   if(canReuse&&prior?.fingerprints[id]===fingerprint&&prior.rows[id]){state.rows[id]=prior.rows[id];state.seen.push(id);}
   else{if(prior?.rows[id])state.rows[id]=prior.rows[id];state.queue.push({id,url:new URL(carPath(a),start).toString(),fingerprint,tries:0});}
  }
 }
 if(!state)throw Error('État de lecture introuvable.');
 while(state.queue.length&&clock()-t0<budget&&details<max){
  const batch=state.queue.splice(0,Math.min(4,max-details));details+=batch.length;
  await Promise.all(batch.map(async item=>{
   try{const u=new URL(item.url);const result=await fetchHtml(makeUrl(start,u.pathname,build));pages++;
    if(result.url.origin!==start.origin)throw Error('Fiche redirigée hors domaine.');
    const row=parseDealerVehicle(nextData(result.text),item.url,item.id,scope);
    if(row){state!.rows[item.id]=row;state!.seen.push(item.id);}else{delete state!.rows[item.id];state!.seen=state!.seen.filter(id=>id!==item.id);excluded++;}
   }catch(e){failed++;if(detailErrors.length<10)detailErrors.push({id:item.id,error:e instanceof Error?e.message:String(e)});if(item.tries<1)state!.queue.push({...item,tries:item.tries+1});else{delete state!.rows[item.id];state!.seen.push(item.id);}}
  }));
 }
 state.seen=[...new Set(state.seen)];
 if(!state.queue.length)state.completed=new Date(clock()).toISOString();
 if(memory)await memory.save(state);
 const rows:any[]=Object.entries(state.rows).filter(([id])=>state!.seen.includes(id)).sort(([a],[b])=>a.localeCompare(b)).map(([,r])=>r);
 // All successfully read rows of this cycle are replayable if sync failed after the read checkpoint.
 (rows as any).partial=!state.completed;(rows as any).total=Object.keys(state.fingerprints).length;
 (rows as any).cycleSeen=state.completed?state.seen:[];
 (rows as any).cycleStarted=memory?state.started:null;
 (rows as any).stats={pages,details,failed,excluded,remaining:state.queue.length,cycle_complete:!!state.completed,agency:scope.slug,detail_errors:detailErrors,ms:clock()-t0};
 return rows;
}
