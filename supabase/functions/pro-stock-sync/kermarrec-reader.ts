// Lecteur Kermarrec Habitation : pagination filtrée par agence, puis données de chaque fiche.
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const decode=(s:string)=>String(s||'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&nbsp;/g,' ').replace(/&sup2;/g,'²').replace(/&euro;/g,'€').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&apos;/g,"'");
const clean=(s:string)=>decode(s.replace(/<br\s*\/?>|<\/(?:p|li|div|h[1-6])>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const number=(s:string)=>s.replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
export function parseKermarrecDetail(raw:string,url:string){
  // Retirer le modèle imprimable échappé et les scripts avant de lire les valeurs visibles.
  const html=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const id=new URL(url).pathname.match(/bien-(\d+)/)?.[1];if(!id)return null;
  const titleHtml=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';
  const titre=clean(titleHtml.replace(/<span\b[^>]*class="title-ville"[\s\S]*/i,''));
  const price=clean(html.match(/class="entry-price[^"']*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]||'').match(/([\d\s.,]+)\s*€/);
  const loc=new URL(url).pathname.match(/\/([^/]+)-(\d{5})\/bien-/);
  const ville=clean(titleHtml.match(/class="title-ville"[^>]*>\s*à\s*([\s\S]*?)<span/i)?.[1]||'')||loc?.[1].replace(/-/g,' ');
  const section=html.match(/<section\b[^>]*id="description"[^>]*>([\s\S]*?)<\/section>/i)?.[1]||'';
  const narrative=section.split(/<ul\b|<h3\b|class="diagnostics"/i)[0];
  const description=[...narrative.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1])).filter(Boolean).join('\n\n');
  if(!titre||!price||!ville||!description)return null;
  const o:any={reference:id,url,titre,prix:number(price[1]),ville,code_postal:loc?.[2]||'',description,texte_page:clean(section),transaction:new URL(url).pathname.startsWith('/location/')?'location':'vente',type_bien:/\/maison\//.test(url)?'maison':/\/terrain\//.test(url)?'terrain':/\/appartement\//.test(url)?'appartement':/\/parking|\/garage/.test(url)?'parking':'bureau'};
  const surface=titre.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);if(surface)o[o.type_bien==='terrain'?'surface_terrain':'surface']=number(surface[1]);
  const rooms=titre.match(/(\d+)\s*pi[eè]ces?/i);if(rooms)o.pieces=rooms[1];
  const fields:Record<string,string>={"surface terrain":"surface_terrain","nombre de chambres":"chambres","nombre de salles d'eau":"salles_de_bain","nombre de salles de bain":"salles_de_bain","année de construction":"annee_construction","mode de chauffage":"chauffage","type de cuisine":"cuisine","etage":"etage","étage":"etage"};
  const feats:string[]=[];
  for(const m of section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){const t=clean(m[1]);const pos=t.indexOf(':');if(pos<0)continue;const key=t.slice(0,pos).trim().toLowerCase(),v=t.slice(pos+1).trim();if(!v)continue;if(fields[key])o[fields[key]]=v;
    if(/nombre de garages|jardin|terrasse|balcon|ascenseur|parking|cave/.test(key)&&Number(v)>0)feats.push(key.includes('garage')?'Garage':key.includes('jardin')?'Jardin':key.includes('terrasse')?'Terrasse':key.includes('balcon')?'Balcon':key.includes('ascenseur')?'Ascenseur':key.includes('cave')?'Cave':'Parking');}
  if(feats.length)o.prestations=[...new Set(feats)].join('|');
  const fees=section.match(/class="mentions-obligatoire"[^>]*>([\s\S]*?)<\/ul>/i)?.[1];if(fees)o.honoraires=clean(fees).split('\n').join(' | ');
  const ref=clean(titleHtml.match(/class="ref"[^>]*>\s*\(ref\s*:\s*([^<)]+)/i)?.[1]||'');if(ref)o.mandat=ref;
  const diag=html.match(/class="diagnostics"[^>]*>([\s\S]*?)<section\b/i)?.[1]||html.slice(html.indexOf('class="diagnostics"'),html.indexOf('class="diagnostics"')+22000);
  const selected=[...diag.matchAll(/class="diag_line\s+diag_selected"[^>]*>[\s\S]*?class="diag_letter"[^>]*>\s*([A-G])\s*<\/span>/gi)].map(m=>m[1]);
  if(selected[0])o.dpe=selected[0];if(selected[1])o.ges=selected[1];
  const dt=clean(diag).match(/DPE r[ée]alis[ée] le\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(dt)o.date_dpe=`${dt[3]}-${dt[2]}-${dt[1]}`;
  const text=clean(diag);const cost=text.match(/Entre\s+([\d\s]+)\s*€\s*et\s*([\d\s]+)\s*€/i);if(cost){o.cout_energie_min=number(cost[1]);o.cout_energie_max=number(cost[2]);}
  const conso=text.match(/Consommation\s+(\d+(?:[.,]\d+)?)\s*kWh/i);if(conso)o.consommation_energie=number(conso[1]);
  const photos=new Map<string,{url:string,size:number}>();
  for(const m of html.matchAll(/(?:href|src|data-src|content)=["']([^"']+\.(?:jpe?g|webp)(?:\?[^"']*)?)["']/gi)){let u:URL;try{u=new URL(decode(m[1]),url);}catch{continue;}const file=u.pathname.split('/').pop()||'';const p=file.match(new RegExp('^('+id+'[a-z]+)(?:-(\\d+)x(\\d+))?\\.(?:jpe?g|webp)$','i'));if(!p)continue;const size=p[2]?Number(p[2])*Number(p[3]):Infinity;const prior=photos.get(p[1]);if(!prior||size>prior.size)photos.set(p[1],{url:u.toString(),size});}
  o.photos=[...photos.values()].map(p=>p.url).join('|');return o;
}
export async function readKermarrec(start:URL,home:string,fetchHtml:Fetcher){
  if(/\/bien-\d+\//.test(start.pathname)){const row=parseKermarrecDetail(home,start.toString());return row?[row]:[];}
  const slug=start.pathname.match(/\/(?:nos-agences|(?:achat|location)\/agence)\/([^/]+)/)?.[1];
  if(!slug)throw Error('Donnez la page de l’agence Kermarrec pour limiter la lecture à son stock.');
  const bases=[...new Set([...home.matchAll(/href="([^"]+)"/gi)].map(m=>{try{return new URL(decode(m[1]),start);}catch{return null;}}).filter((u):u is URL=>!!u&&u.hostname===start.hostname&&new RegExp('^/(achat|location)/agence/'+slug+'/$').test(u.pathname)).map(u=>u.toString()))];
  if(!bases.length)bases.push(new URL('/achat/agence/'+slug+'/',start).toString());
  const details=new Map<string,string>();const seen=new Set<string>();const queue=[...bases];let partial=false,total=0,pages=0;
  while(queue.length&&pages<30){const next=queue.shift()!;if(seen.has(next))continue;seen.add(next);let html='';try{html=(await fetchHtml(new URL(next))).text;}catch{partial=true;continue;}pages++;
    const n=clean(html.match(/id="nombre-resultats"[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'').match(/(\d+)\s*r[ée]sultats?/i);if(n&&bases.includes(next))total+=Number(n[1]);
    for(const m of html.matchAll(/href="([^"]+)"/gi)){let u:URL;try{u=new URL(decode(m[1]),next);}catch{continue;}if(u.hostname!==start.hostname)continue;u.hash='';
      const id=u.pathname.match(/^\/(?:achat|location)\/[^/]+\/[^/]+\/bien-(\d+)\/$/)?.[1];if(id){u.search='';u.hash='';details.set(id,u.toString());}
      else if(bases.some(b=>u.pathname.startsWith(new URL(b).pathname))&&/\/page\/\d+\/$/.test(u.pathname)&&!seen.has(u.toString())&&!queue.includes(u.toString()))queue.push(u.toString());}
  }
  if(queue.length||total&&details.size<total)partial=true;
  const entries=[...details.entries()];const rows:any[]=[];let i=0;
  await Promise.all(Array.from({length:3},async()=>{while(i<entries.length){const[id,url]=entries[i++];try{const{text}=await fetchHtml(new URL(url));const row=parseKermarrecDetail(text,url);rows.push(row||{reference:id,url});}catch{rows.push({reference:id,url});partial=true;}}}));
  (rows as any).partial=partial;(rows as any).total=total||details.size;(rows as any).stats={pages,details:details.size,read:rows.length};return rows;
}
