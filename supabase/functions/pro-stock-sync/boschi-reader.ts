import {sDecode} from './smart-reader.ts';
type RawFetch=(input:string,init?:RequestInit)=>Promise<Response>;
const ORIGIN='https://www.boschi-immobilier.com';
const text=(s:string)=>sDecode(s.replace(/<br\s*\/?>|<\/(?:p|li|div)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
function block(html:string,id:string){const m=html.match(new RegExp('<div\\b[^>]*id="'+id+'"[^>]*>','i'));if(!m)return'';const at=m.index!;const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=at+m[0].length;let depth=1;for(let t;(t=tags.exec(html));){depth+=/^<\//.test(t[0])?-1:1;if(!depth)return html.slice(at,tags.lastIndex);}return'';}
export function boschiScope(html:string,agency:string){const checked=[...html.matchAll(/<input\b[^>]*>/gi)].map(m=>m[0]).filter(x=>/name="[^"<>]*-agences\[\]"/.test(x)&&/\schecked(?:=|\s|\/?>)/i.test(x)).map(x=>x.match(/value="([^"<>]+)"/)?.[1]);return checked.length===1&&checked[0]===agency;}
export function parseBoschiDetail(raw:string,url:string,agency:string){
 let product:any=null;for(const m of raw.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1]);if(j['@type']==='Product'&&new URL(j.url).pathname===new URL(url).pathname)product=j;}catch{}}
 if(!product)return null;if(/SoldOut|OutOfStock/.test(product.offers?.availability||''))return null;
 const html=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const owner=html.match(/<p\b[^>]*class="link"[^>]*>\s*<a\b[^>]*href="([^"<>]+)"[^>]*>\s*Découvrir l'agence/i)?.[1];if(!owner||new URL(owner).pathname!=='/agence/'+agency)throw Error('Fiche Boschi attribuée à une autre agence.');
 const ref=html.match(/<p\b[^>]*class="ref"[^>]*>([\s\S]*?)<\/p>/i)?.[1];const city=html.match(/<p\b[^>]*class="ville"[^>]*>([\s\S]*?)<\/p>/i)?.[1];const title=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
 const desc=block(html,'desc').match(/<div\b[^>]*class="texte"[^>]*>([\s\S]*)/i)?.[1]||'';
 if(!city||!title||!desc)return null;
 const row:any={reference:text(ref||'').replace(/^Réf\.\s*/i,'')||new URL(url).pathname.match(/-ref-([^/]+)$/)?.[1],url,titre:text(title),ville:text(city),type_bien:String(product.name||'').split(/\s+-\s+/)[0],transaction:'vente',description:text(desc),prix:product.offers?.priceSpecification?.price??product.offers?.price,contact_nom:'Boschi Immobilier — '+agency.replace(/-/g,' ')};
 const phone=html.match(/<p\b[^>]*class="moyens"[^>]*>[\s\S]*?href="tel:([^"<>]+)"/i)?.[1];if(phone)row.contact_telephone=phone.replace(/\(0\)/g,'').replace(/[^+\d]/g,'');
 const summary=String(product.description||'');const area=summary.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i)?.[1];if(area)row[/terrain/i.test(row.type_bien)?'surface_terrain':'surface']=area.replace(',','.');const rooms=summary.match(/(\d+)\s*pièces?/i)?.[1];if(rooms)row.pieces=rooms;
 const conso=html.match(/class="[^"<>]*\bconso\b[^"<>]*\bclasse([A-G])\b/i)?.[1];const gaz=html.match(/class="[^"<>]*\bgaz\b[^"<>]*\bclasse([A-G])\b/i)?.[1];if(conso)row.dpe=conso;if(gaz)row.ges=gaz;const consumption=html.match(/class="cep"[^>]*>\s*([\d.,]+)/)?.[1];if(consumption)row.consommation_energie=consumption;
 const internal=String(product.image||'').match(/\/_objects\/annonces\/(\d+)\//)?.[1];const photos=new Map<string,{url:string,score:number}>();
 if(internal)for(const m of raw.matchAll(/https?:\/\/[^\s"'<>]+/g)){let u:URL;try{u=new URL(sDecode(m[0]));}catch{continue;}if(u.origin!==ORIGIN)continue;const file=u.pathname.match(new RegExp('^/_objects/annonces/'+internal+'/(?:([^/]+)/)?(\\d+)\\.(jpg|jpeg|webp)$','i'));if(!file)continue;const score=(file[1]?file[1]==='t1_hres'?10:0:20)+(file[3].toLowerCase()==='webp'?0:1);const previous=photos.get(file[2]);if(!previous||score>previous.score)photos.set(file[2],{url:u.toString(),score});}
 row.photos=[...photos.values()].map(x=>x.url).join('|');row.texte_page=row.description+'\n'+text(html.match(/<p\b[^>]*class="georisques"[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');return row;
}
export async function readBoschiAgency(start:URL,rawFetch:RawFetch=fetch){
 const agency=start.pathname.match(/^\/agence\/([a-z0-9-]+)\/?$/)?.[1];if(!agency||start.search)throw Error('Adresse précise d’agence Boschi sans filtre supplémentaire requise.');
 const cookies=new Map<string,string>();
 const request=async(path:string,body?:URLSearchParams)=>{let u=new URL(path,ORIGIN);let payload=body;
  for(let redirects=0;;redirects++){if(u.origin!==ORIGIN||redirects>4)throw Error('Redirection Boschi hors périmètre.');const headers:Record<string,string>={'User-Agent':'Abracadeal-StockSync/1.0 (+https://abracadeal.fr)','Accept':'text/html,application/json'};if(cookies.size)headers.Cookie=[...cookies].map(([k,v])=>k+'='+v).join('; ');if(payload)headers['Content-Type']='application/x-www-form-urlencoded';const r=await rawFetch(u.toString(),{method:payload?'POST':'GET',body:payload?.toString(),headers,redirect:'manual',signal:AbortSignal.timeout(20000)});
   const values=(r.headers as any).getSetCookie?.()||[r.headers.get('set-cookie')].filter(Boolean);for(const value of values){const pair=value.split(';')[0];const eq=pair.indexOf('=');if(eq>0)cookies.set(pair.slice(0,eq),pair.slice(eq+1));}
   if(r.status>=300&&r.status<400){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw Error('Redirection Boschi sans adresse.');u=new URL(location,u);payload=undefined;continue;}
   if(!r.ok)throw Error('Boschi HTTP '+r.status);const html=await r.text();if(html.length>5000000)throw Error('Page Boschi trop volumineuse.');if(/token\.awswaf\.com|cf-chl-|challenge-platform|UUSEC WAF/i.test(html))throw Error('Protection anti-robots Boschi, lecture non validée.');return html;
  }
 };
 const page='/agence/'+agency;await request(page);
 const viewport=new URLSearchParams({ajax_target:'interface'});for(const[k,v]of Object.entries({class:'site',function:'update_viewport_session',device_sw:1440,device_sh:900,is_touchable:0,init_window_sw:1440,init_window_sh:900,window_sw:1440,window_sw_min:1440,window_sh:900,scrollbar_w:15,scrollbar_h:0,orientation:'landscape',is_redirect:1}))viewport.set('ajax_data['+k+']',String(v));await request(page,viewport);
 const search=await request('/acheter');const form=search.match(/<form\b[^>]*data-form_smf="([^"]*form_recherche2)"/i)?.[1];if(!form)throw Error('Formulaire public de recherche Boschi absent.');
 const allowed=[...search.matchAll(/<input\b[^>]*>/gi)].some(m=>m[0].includes('name="'+form+'-agences[]"')&&m[0].includes('value="'+agency+'"'));if(!allowed)throw Error('Filtre public de cette agence Boschi absent.');
 const filter=new URLSearchParams({ajax_target:form});for(const[k,v]of Object.entries({form_smf:form,form_unik:form+'[data-unik=1]',form_button:''}))filter.set('ajax_data['+k+']',v);filter.set('ajax_data[form_values][agences][]',agency);filter.set('ajax_data[form_values][nb_pieces]','0');filter.set('ajax_data[form_values][nb_chambres]','0');
 const ack=JSON.parse(await request('/acheter',filter));if(typeof ack.js_data!=='string')throw Error('Recherche Boschi non confirmée.'); // Never evaluate source JavaScript.
 const queue=[ORIGIN+'/acheter'],seen=new Set<string>(),entries=new Map<string,string>();let total:number|undefined,partial=false,pages=0;
 while(queue.length&&seen.size<30){const url=queue.shift()!;if(seen.has(url))continue;seen.add(url);const html=await request(url);pages++;if(!boschiScope(html,agency))throw Error('Filtre agence Boschi perdu : lecture annulée.');
  const count=html.match(/class="fw_liste_compteur-total-nb"[^>]*>\s*(\d+)/)?.[1];if(count){if(total!==undefined&&total!==Number(count))partial=true;total=Number(count);}
  for(const m of html.matchAll(/<a\b([^>]+)>/gi)){const href=m[1].match(/href="([^"<>]+)"/)?.[1];if(!href)continue;let u:URL;try{u=new URL(sDecode(href),ORIGIN);}catch{continue;}if(u.origin!==ORIGIN)continue;if(/^\/annonce\/[^/]+-ref-[^/]+$/.test(u.pathname)){u.search='';entries.set(u.pathname,u.toString());}else if(u.pathname==='/acheter'&&/class="[^"]*fw_liste_compteur-(?:numbers|suiv)/.test(m[1])&&!seen.has(u.toString())&&!queue.includes(u.toString()))queue.push(u.toString());}
 }
 if(queue.length||total===undefined||entries.size!==total)partial=true;
 const rows:any[]=[];const details=[...entries.values()];const failures:any[]=[];let next=0,sold=0;
 await Promise.all(Array.from({length:3},async()=>{while(next<details.length){const url=details[next++];try{const html=await request(url);const row=parseBoschiDetail(html,url,agency);if(row)rows.push(row);else if(/schema.org\/(?:SoldOut|OutOfStock)/.test(html))sold++;else{partial=true;failures.push(url);rows.push({reference:new URL(url).pathname,url});}}catch(e){partial=true;failures.push({url,error:String(e)});rows.push({reference:new URL(url).pathname,url});}}}));
 (rows as any).partial=partial;(rows as any).total=total??null;(rows as any).stats={pages,details:entries.size,read:rows.length,sold,failures,agency};return rows;
}
