// Bounded, replayable catalogue crawl. State contains public source data only.
export type CrawlState={source:string,scope:string,started:string,completed:string|null,lists:{url:string,tries:number}[],details:{url:string,tries:number}[],visited:string[],discovered:string[],rows:Record<string,any>,failed:string[],applied?:boolean};
export type CrawlMemory={load:()=>Promise<any>,save:(state:any)=>Promise<void>};
export async function crawlCatalogue(source:string,scope:string,starts:string[],fetchHtml:(u:URL)=>Promise<{text:string,url:URL}>,links:(html:string,url:URL)=>{lists:string[],details:string[]},parse:(html:string,url:string)=>any,memory?:CrawlMemory,options:{budgetMs?:number,maxDetails?:number,expectedTotal?:number,now?:()=>number}={}){
 const clock=options.now||Date.now,t0=clock();let state:CrawlState=await memory?.load();
 if(!state||state.source!==source||state.scope!==scope||!Array.isArray(state.lists)||(state.completed&&state.applied)||(!state.completed&&!state.lists.length&&!state.details.length&&!state.failed.length)||clock()-Date.parse(state.started)>72*3600e3){state={source,scope,started:new Date(clock()).toISOString(),completed:null,lists:starts.map(url=>({url,tries:0})),details:[],visited:[],discovered:[],rows:{},failed:[]};}
 let pages=0,details=0;const budget=options.budgetMs??35000;
 while(clock()-t0<budget&&(state.lists.length||state.details.length)&&details<(options.maxDetails??100)){
  const listing=!!state.lists.length,queue=listing?state.lists:state.details,batch=queue.splice(0,Math.min(4,listing?4:(options.maxDetails??100)-details));if(!listing)details+=batch.length;
  await Promise.all(batch.map(async item=>{try{
   const result=await fetchHtml(new URL(item.url));pages++;
   if(result.url.hostname.replace(/^www\./,'')!==new URL(source).hostname.replace(/^www\./,''))throw Error('Redirection hors du site inscrit');
   if(listing){const found=links(result.text,result.url);for(const url of found.lists)if(!state.visited.includes(url)&&!state.lists.some(x=>x.url===url)&&!batch.some(x=>x.url===url))state.lists.push({url,tries:0});for(const url of found.details)if(!state.discovered.includes(url)){state.discovered.push(url);state.details.push({url,tries:0});}state.visited.push(item.url);}
   else{const row=await parse(result.text,item.url);if(row&&!row._sold){if(!row.reference)throw Error('Référence absente');state.rows[item.url]=row;}}
  }catch(e){if(item.tries<1)queue.push({...item,tries:item.tries+1});else state.failed.push(item.url);}}));
 }
 if(options.expectedTotal!=null&&state.discovered.length!==options.expectedTotal)state.completed=null;
 if(!state.lists.length&&!state.details.length&&!state.failed.length&&state.discovered.length>0&&(options.expectedTotal==null||state.discovered.length===options.expectedTotal))state.completed=new Date(clock()).toISOString();
 if(memory)await memory.save(state);
 const rows:any[]=Object.values(state.rows);Object.assign(rows,{partial:!state.completed,total:state.discovered.length,cycleStarted:memory?state.started:null,cycleSeen:state.completed?[...new Set(Object.values(state.rows).map((r:any)=>String(r.reference)))]:[],stats:{pages,details,expected_total:options.expectedTotal??null,total_mismatch:options.expectedTotal!=null&&state.discovered.length!==options.expectedTotal,remaining_lists:state.lists.length,remaining:state.details.length,failed:state.failed,cycle_complete:!!state.completed,ms:clock()-t0}});return rows;
}
