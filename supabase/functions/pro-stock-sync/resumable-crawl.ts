import { cpuLeft } from './cpu-meter.ts';
import { fillEnergyFromImages } from './energy-image.ts';
// Bounded, replayable catalogue crawl. State contains public source data only.
export type CrawlState={source:string,scope:string,started:string,completed:string|null,lists:{url:string,tries:number}[],details:{url:string,tries:number}[],visited:string[],discovered:string[],rows:Record<string,any>,failed:string[],applied?:boolean,touched?:string};
export type CrawlMemory={load:()=>Promise<any>,save:(state:any)=>Promise<void>};
export async function crawlCatalogue(source:string,scope:string,starts:string[],fetchHtml:(u:URL)=>Promise<{text:string,url:URL}>,links:(html:string,url:URL)=>{lists:string[],details:string[]},parse:(html:string,url:string)=>any,memory?:CrawlMemory,options:{budgetMs?:number,maxDetails?:number,expectedTotal?:number,now?:()=>number}={}){
 const clock=options.now||Date.now,t0=clock();let state:CrawlState=await memory?.load();
 if(!state||state.source!==source||state.scope!==scope||!Array.isArray(state.lists)||(state.completed&&(state.applied||clock()-Date.parse(state.started)>72*3600e3))||(!state.completed&&!state.lists.length&&!state.details.length&&!state.failed.length)||clock()-Date.parse(state.touched||state.started)>72*3600e3){state={source,scope,started:new Date(clock()).toISOString(),completed:null,lists:starts.map(url=>({url,tries:0})),details:[],visited:[],discovered:[],rows:{},failed:[]};}
 // 01/11/2026 : index des adresses déjà vues (les recherches dans les listes coûtaient trop de calcul sur les gros plans de site).
 const seenList=new Set<string>([...state.visited,...state.lists.map(x=>x.url)]),discovered=new Set<string>(state.discovered);
 let pages=0,details=0;const budget=options.budgetMs??35000;
 while(clock()-t0<budget&&(state.lists.length||state.details.length)&&details<(options.maxDetails??100)&&cpuLeft()){
  const listing=!!state.lists.length,queue=listing?state.lists:state.details,batch=queue.splice(0,Math.min(4,listing?4:(options.maxDetails??100)-details));if(!listing)details+=batch.length;
  await Promise.all(batch.map(async item=>{try{
   const result=await fetchHtml(new URL(item.url));pages++;
   if(result.url.hostname.replace(/^www\./,'')!==new URL(source).hostname.replace(/^www\./,''))throw Error('Redirection hors du site inscrit');
   if(listing){const found=links(result.text,result.url);for(const url of found.lists)if(!seenList.has(url)){seenList.add(url);state.lists.push({url,tries:0});}for(const url of found.details)if(!discovered.has(url)){discovered.add(url);state.discovered.push(url);state.details.push({url,tries:0});}state.visited.push(item.url);}
   else{const row=await parse(result.text,item.url);if(row&&!row._sold){if(!row.reference)throw Error('Référence absente');/* 01/11/2026 : DPE en image lu ici et mémorisé avec la fiche (avant : relu pour toutes les fiches à chaque passage, budget épuisé) */if((row.dpe_image||row.ges_image)&&(!row.dpe||!row.ges)&&cpuLeft()){try{await fillEnergyFromImages([row]);}catch{}}state.rows[item.url]=row;}}
  }catch(e){if(item.tries<1)queue.push({...item,tries:item.tries+1});else state.failed.push(item.url);}}));
 }
 if(options.expectedTotal!=null&&state.discovered.length!==options.expectedTotal)state.completed=null;
 if(!state.lists.length&&!state.details.length&&!state.failed.length&&state.discovered.length>0&&(options.expectedTotal==null||state.discovered.length===options.expectedTotal))state.completed=new Date(clock()).toISOString();
 if(pages||details)state.touched=new Date(clock()).toISOString();
 if(memory)await memory.save(state);
 const rows:any[]=Object.values(state.rows);Object.assign(rows,{partial:!state.completed||clock()-Date.parse(state.started)>72*3600e3,total:Object.keys(state.rows).length+state.details.length,/* 02/11/2026 (Anthony, Laroca « 586 annonces sur le site » pour 202 réelles) : pages qui ne sont pas des biens et fiches vendues non comptées */cycleStarted:memory?state.started:null,cycleSeen:state.completed?[...new Set(Object.values(state.rows).map((r:any)=>String(r.reference)))]:[],stats:{pages,details,stale_cycle:clock()-Date.parse(state.started)>72*3600e3,expected_total:options.expectedTotal??null,total_mismatch:options.expectedTotal!=null&&state.discovered.length!==options.expectedTotal,remaining_lists:state.lists.length,remaining:state.details.length,failed:state.failed,cycle_complete:!!state.completed,ms:clock()-t0}});return rows;
}
// 01/11/2026 (Anthony : « il fait tout le temps ça pour tous les sites ») : lecteurs qui connaissent déjà la liste des fiches
// (agence d'un réseau) : lecture des fiches par étapes mémorisée, reprise là où le passage précédent s'est arrêté.
export async function crawlDetails(source:string,scope:string,details:string[],fetchHtml:(u:URL)=>Promise<{text:string,url:URL}>,parse:(html:string,url:string)=>any,memory?:CrawlMemory,maxDetails=400){
 return crawlCatalogue(source,scope,[source],async u=>u.toString()===source?{text:'',url:u}:fetchHtml(u),()=>({lists:[],details}),parse,memory,{maxDetails});
}
// 01/11/2026 : même chose pour un lecteur qui lit lui-même chaque fiche (fn = lecture d'une adresse → annonce, null si écartée).
// La liste des adresses est connue d'avance ; l'avancement est mémorisé (reprise au passage suivant).
export async function eachDetailResumable(scope:string,links:string[],fn:(url:string)=>Promise<any>,memory?:CrawlMemory,maxDetails=400){
 if(!links.length)return Object.assign([] as any[],{partial:false,total:0});
 const source=new URL('/?abraca_liste='+encodeURIComponent(scope),links[0]).toString();
 return crawlCatalogue(source,scope,[source],async u=>({text:'',url:u}),()=>({lists:[],details:links}),async(_h,l)=>{const r=await fn(l);return r??{_sold:1};},memory,{maxDetails});
}
