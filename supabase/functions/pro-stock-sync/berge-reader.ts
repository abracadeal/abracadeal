// Bergé's public Softr blocks enforce the website's publication filters server-side.
// Never query Airtable directly, replace those filters, or read the similar-property block.
import {crawlCatalogue,type CrawlMemory} from './resumable-crawl.ts';
import {sDecode} from './smart-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const ORIGIN='https://www.berge.fr';
const CATALOGUES=['/nos-biens-a-la-vente','/nos-biens-a-la-location'];
export const isBerge=(u:URL)=>/^(?:www\.)?berge\.fr$/i.test(u.hostname);
const clean=(v:any)=>sDecode(String(v??'').replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').trim();
const numeric=(v:any)=>Number(String(v??'').replace(/[ \u00a0\u202f]/g,'').replace(',','.'));
export function bergeConfig(html:string){
 const start=html.indexOf('var softrBlocks = ');if(start<0)throw Error('Configuration publique Bergé absente');
 // JSON.parse, never evaluate the site's JavaScript.
 const tail=html.slice(start+18),end=tail.indexOf(';\n');
 let blocks:any[];try{blocks=JSON.parse(tail.slice(0,end));}catch{throw Error('Configuration Bergé illisible');}
 const app=html.match(/appId:\s*"([\w-]+)"/)?.[1],page=html.match(/pageId:\s*"([\w-]+)"/)?.[1];
 if(!app||!page||!Array.isArray(blocks))throw Error('Identifiants publics Bergé absents');
 return {app,page,blocks};
}
function mappedFields(block:any){const found=new Set<string>();const visit=(x:any)=>{if(!x||typeof x!=='object')return;if(typeof x.mappedTo==='string'&&x.mappedTo)found.add(x.mappedTo);for(const v of Object.values(x))if(typeof v==='object')visit(v);};visit(block.elements);return found;}
export function bergePage(data:any){
 if(!Array.isArray(data?.records)||!(data.offset==null||typeof data.offset==='string'))throw Error('Page publique Bergé invalide');
 const ids=new Set<string>();for(const r of data.records){if(!/^rec[A-Za-z0-9]+$/.test(r.id)||!r.fields||ids.has(r.id))throw Error('Identité Bergé invalide ou répétée');ids.add(r.id);}
 if(data.offset&&!data.records.length)throw Error('Pagination Bergé vide avec suite');return data;
}
export function parseBerge(record:any,url:string){
 const f=record.fields||{},ref=clean(f['Référence Netty']);if(!ref||!/^rec[A-Za-z0-9]+$/.test(record.id))throw Error('Référence Bergé absente');
 const tx=clean(f["Type d'offre"]),priceText=clean(f['Prix / Loc ou Vente']);
 if(!['Vente','Location'].includes(tx))throw Error('Transaction Bergé inconnue : '+ref);
 const priceMatch=priceText.match(/^([\d\s.,]+)\s*€/);if(!priceMatch||!(numeric(priceMatch[1])>0))throw Error('Prix Bergé non publié : '+ref);
 if(tx==='Location'&&!/\/\s*mois\b/i.test(priceText))throw Error('Unité de loyer Bergé non mensuelle : '+ref);
 const photos=new Map<string,string>();const attachments=new Set<string>();for(const p of [...(f['Photo de mise en avant']||[]),...(f['Photos Local']||[])]){
  if(!p?.id||!p.url||!/^image\//.test(p.type||''))continue;
  const u=new URL(p.url);if(!/^https:$/.test(u.protocol)||!/^(?:v\d+\.)?airtableusercontent\.com$/.test(u.hostname))throw Error('Photo Bergé hors source');
  const fingerprint=[p.filename,p.size,p.width,p.height].every(v=>v!=null)?JSON.stringify([p.filename,p.size,p.width,p.height]):p.id;
  if(!attachments.has(fingerprint)&&!photos.has(p.id)){attachments.add(fingerprint);photos.set(p.id,p.url);}
 }
 const description=clean(f['Détails']),title=clean(f['Désignation']||f['Social:Title']);if(!title||!description)throw Error('Descriptif Bergé absent : '+ref);
 const row:any={reference:ref,url,titre:title,description,transaction:tx==='Location'?'location':'vente',type_bien:clean(f['Type de bien']),prix:String(numeric(priceMatch[1])),ville:clean(f['Commune - Softr']),code_postal:clean(f['Code postal']),photos:[...photos.values()].join('|'),_source_specific_fields:true,_keep_missing_city:true};
 row._source_city_missing=!row.ville;
 const area=clean(f['Surface - Softr']).match(/^([\d\s.,]+)\s*m[²2]$/);if(area)row.surface=numeric(area[1]);
 // Keep all public technical/financial labels, including rent's HT/HC qualifiers.
 const lines=['Prix affiché : '+priceText];
 for(const key of ['État intérieur','Hauteur sous-plafond','Disponibilité','Date de disponibilité','Occupation','Stationnement','Parking','Sanitaire','Ascenseur','Conforme ERP','Conforme PMR','Extraction','Type de bail','Durée du Bail','Dépôt de garantie','Charges annuelles','Taxe Foncières','Honoraires Preneur','Prix Location annuel','Prix / m2','Prix cession droit au bail','Prix FAI','Honoraires à charge','Honoraires vente HT',"Location - Droit d'entrée FAI","Prix Droit d'entrée"])if(f[key]!=null&&clean(f[key]))lines.push(key+' : '+clean(f[key]));
 row.description+='\n\n'+lines.join('\n');
 for(const [key,target] of [['DPE','dpe'],['GES','ges']]){const v=clean(f[key]).toUpperCase();if(/^[A-G]$/.test(v))row[target]=v;else if(/NON SOUMIS|EXEMPT/i.test(v))row[target]='NON SOUMIS';}
 // No advisor is named by the current public blocks. Do not assign the agency
 // telephone to a person or expose internal Airtable mandate/contact fields.
 return row;
}
export async function readBerge(_url:URL,fetchHtml:Fetcher,memory?:CrawlMemory){
 const configs=new Map<string,ReturnType<typeof bergeConfig>>();
 const home=await fetchHtml(new URL(ORIGIN));if(!isBerge(home.url))throw Error('Accueil Bergé redirigé');
 let agencyPhone=home.text.match(/tel:((?:\+33|0)[1-9][0-9]{8})/)?.[1]||'';
 for(const path of CATALOGUES){const page=await fetchHtml(new URL(path,ORIGIN));if(!isBerge(page.url))throw Error('Catalogue Bergé redirigé');configs.set(path,bergeConfig(page.text));agencyPhone ||= page.text.match(/tel:((?:\+33|0)[1-9][0-9]{8})/)?.[1]||'';}
 async function data(config:ReturnType<typeof bergeConfig>,block:any,id?:string,offset?:string){
  const ds=block.collection?.dataSource;if(ds?.type!=='AIRTABLE'||!ds.id)throw Error('Source publique Bergé modifiée');
  const endpoint=`${ORIGIN}/v1/datasource/airtable/${config.app}/${config.page}/${block.id}/${ds.id}/data${id?'/'+id:''}`;
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Block-Name':block.name,'X-Block-Version':block.version},body:JSON.stringify({options:{cellFormat:'json',timeZone:'UTC',userLocale:'en-US'},pageContext:null,filterCriteria:{},...(!id?{pagingOption:{count:100,offset:offset||null},sortingOption:{sortingField:'Date de création',sortType:'DESC'}}:{})}),signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('API publique Bergé HTTP '+response.status);return bergePage(await response.json());
 }
 const rows:any=await crawlCatalogue(ORIGIN+'/','berge-v1',CATALOGUES.map(p=>ORIGIN+p),async u=>{try{
  if(CATALOGUES.includes(u.pathname)){
   const config=configs.get(u.pathname)!,blocks=config.blocks.filter(b=>b.name==='list17'&&b.collection?.dataSource?.isComplete);
   if(blocks.length!==1)throw Error('Catalogue Bergé ambigu');
   const value=await data(config,blocks[0],undefined,u.searchParams.get('abraca_offset')||undefined);
   if(value.offset&&value.offset===u.searchParams.get('abraca_offset'))throw Error('Curseur Bergé immobile');
   return {text:JSON.stringify(value),url:u};
  }
  const id=u.searchParams.get('recordId');if(u.pathname!=='/mandat-details'||!id||!/^rec[A-Za-z0-9]+$/.test(id))throw Error('Fiche Bergé hors périmètre');
  const page=await fetchHtml(u);if(!isBerge(page.url))throw Error('Fiche Bergé redirigée');
  const detailConfig=bergeConfig(page.text);
  const blocks=detailConfig.blocks.filter(b=>b.name==='list-details'&&b.collection?.dataSource?.isComplete);
  const needed=['Référence Netty','Détails','Occupation','DPE','GES'];
  const selected=[...new Set(needed.map(field=>{const b=blocks.find(b=>mappedFields(b).has(field));if(!b)throw Error('Bloc Bergé absent : '+field);return b;}))];
  for(const block of blocks)if([...mappedFields(block)].some(field=>/Titre.*financi/i.test(field))&&!selected.includes(block))selected.push(block);
  const values=await Promise.all(selected.map(block=>data(detailConfig!,block,id)));
  const fields:any={};for(let i=0;i<selected.length;i++){const value=values[i];if(value.records.length!==1||value.records[0].id!==id)throw Error('Fiche publique Bergé absente : '+id);const own=value.records[0].fields;for(const key of mappedFields(selected[i]))if(own[key]!=null)fields[key]=own[key];if(own['Désignation'])fields['Désignation']=own['Désignation'];const postal=String(own['SEO:Title']||'').match(/\((\d{5})\)/)?.[1];if(postal)fields['Code postal']=postal;}
  return {text:JSON.stringify({id,fields}),url:u};
 }catch(e){console.warn('Lecture publique Bergé',u.pathname,String(e));throw e;}},(html,u)=>{const value=bergePage(JSON.parse(html));const next=new URL(u);if(value.offset)next.searchParams.set('abraca_offset',value.offset);return {lists:value.offset?[next.toString()]:[],details:value.records.map((r:any)=>ORIGIN+'/mandat-details?recordId='+r.id)};},(html,url)=>{const row=parseBerge(JSON.parse(html),url);if(agencyPhone){row.contact_nom='Bergé Immobilier (agence)';row.contact_telephone=agencyPhone;}return row;},memory?{load:async()=>{const state=await memory.load();return state?.scope==='berge-v1'&&Date.now()-Date.parse(state.started)>45*60e3?null:state;},save:state=>memory.save(state)}:undefined,{maxDetails:24});
 rows.platform='Bergé (catalogues publics Softr)';rows.sector='immobilier';return rows;
}
