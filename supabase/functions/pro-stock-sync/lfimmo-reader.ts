import {sDecode,smartDetail} from './smart-reader.ts';
type Fetcher=(url:URL)=>Promise<{text:string,url:URL}>;
// LF immo uses an infinite-scroll catalogue. Follow only its same-path page links,
// retaining the public filters; property PDFs and the site's similar-property cards are excluded.
export async function readLFimmo(start:URL,home:string,fetchHtml:Fetcher){
 const origin=new URL('https://www.lfimmo.fr');
 if(/^\/annonces\/\d+-[^/.]+$/.test(start.pathname)){const row=smartDetail(home,start.toString(),'immobilier');return row?[row]:[];}
 const scoped=/^\/(?:achat(?:\/[^/]+)?|location)\/?$/.test(start.pathname);
 if(start.pathname!=='/'&&!scoped)throw Error('Catalogue LF immo non reconnu : conserver une adresse achat/location publique.');
 const roots=scoped?[new URL(start.toString())]:['/achat','/location'].map(p=>new URL(p,origin));
 const queue=roots.map(url=>({url,path:url.pathname})),seen=new Set<string>(),entries=new Map<string,URL>();let partial=false,pages=0;
 while(queue.length&&entries.size<120&&pages<40){
  const {url,path}=queue.shift()!;if(seen.has(url.toString()))continue;seen.add(url.toString());
  let html:string;try{html=url.toString()===start.toString()?home:(await fetchHtml(url)).text;pages++;}catch{partial=true;continue;}
  for(const m of html.matchAll(/href="([^"<>]+)"/gi)){
   let u:URL;try{u=new URL(sDecode(m[1]),url);}catch{continue;}if(u.origin!==origin.origin)continue;u.hash='';
   const id=u.pathname.match(/^\/annonces\/(\d+)-[^/.]+$/)?.[1];
   if(id){u.search='';if(entries.size<120)entries.set(id,u);else if(!entries.has(id))partial=true;}
   else if(u.pathname===path&&/^\d+$/.test(u.searchParams.get('page')||'')&&!seen.has(u.toString())&&!queue.some(x=>x.url.toString()===u.toString()))queue.push({url:u,path});
  }
 }
 if(queue.length)partial=true;
 const rows:any[]=[];let next=0;const details=[...entries.entries()];const failures:string[]=[];
 await Promise.all(Array.from({length:3},async()=>{while(next<details.length){const[id,url]=details[next++];try{const raw=(await fetchHtml(url)).text;const row=smartDetail(raw,url.toString(),'immobilier');if(row)rows.push(row);else{rows.push({reference:id,url:url.toString()});partial=true;failures.push(url.toString());}}catch{rows.push({reference:id,url:url.toString()});partial=true;failures.push(url.toString());}}}));
 (rows as any).partial=partial;(rows as any).total=partial?null:entries.size;(rows as any).stats={pages,details:entries.size,read:rows.length,capped:queue.length>0,failures,scope:scoped?start.toString():'achat et location LF immo',limit:120};return rows;
}
