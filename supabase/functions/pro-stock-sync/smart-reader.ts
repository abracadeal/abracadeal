// Lecteur « intelligent » des sites de pros (28/10/2026) : utilisé quand aucun connecteur dédié ne reconnaît le site.
// 1) repère les fiches d'annonces en regroupant les liens qui se répètent (même forme d'adresse, avec un numéro ou un long slug) ;
// 2) lit chaque fiche par règles générales : titre, prix, photos, surface/pièces/DPE (immobilier) ou km/année (véhicules).
// Aucune écriture ici : le résultat passe par l'aperçu et la validation de l'admin, comme les autres lecteurs.

type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const NAMED:Record<string,string>={eacute:'é',egrave:'è',ecirc:'ê',agrave:'à',acirc:'â',ccedil:'ç',ocirc:'ô',ucirc:'û',ugrave:'ù',icirc:'î',iuml:'ï',euml:'ë',Eacute:'É',Egrave:'È',Agrave:'À',oelig:'œ',euro:'€',sup2:'²',deg:'°',rsquo:'’',lsquo:'‘',laquo:'«',raquo:'»',hellip:'…',ndash:'–',mdash:'—',nbsp:' ',thinsp:' ',quot:'"',amp:'&',apos:"'",lt:'<',gt:'>'};
export const sDecode=(v:string)=>String(v||'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&([a-zA-Z]+\d?);/g,(m,n)=>NAMED[n]??m);
const clean=(v:string)=>sDecode(String(v||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li|h\d)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t   ]+/g,' ').split('\n').map(l=>l.trim()).filter(Boolean).join('\n').trim();
const SKIP_PATH=/(blog|actualit|news|article|conseil|guide|lexique|contact|mention|cgv|cgu|conditions|confidential|cookie|rgpd|recrut|emploi|carriere|estim|vendre|faire-gerer|gestion|syndic|financ|assurance|faq|aide|login|connexion|compte|favori|alerte|newsletter|plan-du-site|sitemap|avis|temoignage|equipe|agence(s)?\/?$|qui-sommes|a-propos|services?$|honoraires|bareme|print|imprim|share|partag|tel:|mailto:|javascript:|wp-admin|wp-login|feed|tag\/|categorie?\/|author)/i;
const LIST_PATH=/(acheter|achat|vente|vendre-|a-vendre|louer|location|annonce|biens?|nos-biens|catalog|recherche|search|resultat|offres?|stock|vehicules?|voitures?|occasions?|motos?|utilitaires?|nos-|liste|programme|immobilier)/i;
const IMG_BAD=/(logo|icon|sprite|avatar|favicon|placeholder|blank|pixel|spacer|flag|drapeau|banner|banniere|picto|badge|marker|loader|loading|social|facebook|instagram|whatsapp|twitter|linkedin|youtube|qrcode|partners?\/|partenaires?\/|modules\/|[\/_-](?:dpe|ges)[\/_.-]|etiquette[-_]?energ|watermark|default|no[-_]?photo|noimage|thumb_?nail_?small)/i;

function pathPattern(u:URL){return u.pathname.split('/').filter(Boolean).map(s=>/\d{3,}/.test(s)?(s.replace(/\d+/g,'#').length>12?'*#':'#'):(s.split('-').length>=4?'*':s)).join('/');}
function isDetailish(u:URL){const last=u.pathname.replace(/\/+$/,'').split('/').pop()||'';return /\d{3,}/.test(last)||last.split('-').length>=4||/[?&](id|ref|annonce|bien|vehicule|product)=/i.test(u.search);}

// Liens de la page : fiches probables (formes répétées) et pages de liste à suivre.
export function smartLinks(html:string,page:URL,host:string){
  const groups=new Map<string,Set<string>>();const lists=new Set<string>();
  for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){
    let u:URL;try{u=new URL(sDecode(m[1]),page);}catch{continue;}
    if(!/^https?:$/.test(u.protocol)||u.hostname.replace(/^www\./,'')!==host)continue;
    if(/\.(css|js|png|jpe?g|gif|svg|webp|ico|pdf|xml|zip|woff2?|mp4)(\?|$)/i.test(u.pathname))continue;
    u.hash='';const full=u.toString();
    if(SKIP_PATH.test(u.pathname))continue;
    if(isDetailish(u)){const p=pathPattern(u)+(u.search?'?'+[...u.searchParams.keys()].sort().join('&'):'');if(!groups.has(p))groups.set(p,new Set());groups.get(p)!.add(full);}
    else if(LIST_PATH.test(u.pathname+u.search)||/[?&](page|p|pg|start|offset)=\d+|\/page[-/]?\d+/i.test(u.pathname+u.search))lists.add(full);
  }
  const details:string[]=[];
  for(const [,set] of [...groups.entries()].sort((a,b)=>b[1].size-a[1].size)){if(set.size>=2)details.push(...set);}
  return{details,lists:[...lists]};
}

const num=(s:string)=>{const t=String(s||'').replace(/[\s  .']/g,'').replace(',','.');const n=Number(t);return Number.isFinite(n)?n:NaN;};
function metaAll(html:string,prop:string){return [...html.matchAll(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,'gi'))].map(m=>sDecode(m[1]??m[2]??'').trim()).filter(Boolean);}
function jsonVal(html:string,keys:string[]){const h=html.replace(/&quot;/g,'"');for(const k of keys){const m=h.match(new RegExp(`"${k}"\\s*:\\s*"?([^",}\\]]{1,80})`,'i'));if(m&&m[1].trim()&&m[1]!=='null')return sDecode(m[1].trim());}return'';}

function pickPhotos(html:string,base:URL,ogs:string[],ref:string){
  const all:string[]=[];const add=(raw:string)=>{if(!raw)return;let u:string;try{u=new URL(sDecode(raw.trim()),base).toString();}catch{return;}if(!/^https?:/i.test(u)||!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(u)&&!/\/(image|photo|img|media|picture)s?\//i.test(u))return;if(IMG_BAD.test(u.split('?')[0]))return;all.push(u);};
  ogs.forEach(add);
  for(const m of html.matchAll(/(?:src|data-src|data-lazy|data-original|data-full|data-zoom-image|data-image|data-big|data-large|href|content)=["']([^"']+\.(?:jpe?g|png|webp|avif)(?:\?[^"']*)?)["']/gi))add(m[1]);
  for(const m of html.matchAll(/srcset=["']([^"']+)["']/gi)){const parts=m[1].split(',').map(x=>x.trim().split(/\s+/)[0]);add(parts[parts.length-1]);}
  if(!all.length)return[];
  // Les variantes de taille (« 1200xauto », « -300x200 », « thumb »…) comptent comme la même photo et le même dossier.
  const sizeless=(u:string)=>u.split('?')[0].replace(/\/\d{2,4}x(?:\d{2,4}|auto)(?=\/)/gi,'').replace(/\/(?:thumbs?|small|medium|large|mini|xs|sm|md|lg)(?=\/)/gi,'');
  const key=(u:string)=>{const b=sizeless(u).split('/').pop()||'';return b.replace(/\.\w+$/,'').length>=8?b.replace(/[-_](\d{2,4}x\d{2,4}|small|medium|thumb|mini|min|sm|xs)(?=\.\w+$)/i,''):sizeless(u).replace(/[-_](\d{2,4}x\d{2,4}|small|medium|thumb|mini|min|sm|xs)(?=\.\w+$)/i,'');};
  const dir=(u:string)=>sizeless(u).replace(/\/[^/]*$/,'');
  // Groupe principal : dossier de l'image de partage, ou dossier le plus fourni, ou fichiers portant la référence.
  const counts=new Map<string,number>();for(const u of all)counts.set(dir(u),(counts.get(dir(u))||0)+1);
  const ogDir=ogs.length?dir(new URL(ogs[0],base).toString()):'';
  let mainDir=ogDir&&counts.get(ogDir)?ogDir:[...counts.entries()].sort((a,b)=>b[1]-a[1])[0][0];
  const refOk=ref&&ref.length>=4;
  const chosen=all.filter(u=>dir(u)===mainDir||(refOk&&u.split('?')[0].includes(ref)));
  const out:string[]=[];const seen=new Set<string>();
  const sizeOf=(u:string)=>{const m=u.match(/\/(\d{2,4})x(?:\d{2,4}|auto)\//i)||u.match(/[-_](\d{2,4})x\d{2,4}(?=\.\w+$)/i);return m?Number(m[1]):(/thumb|small|mini/i.test(u)?1:5000);};
  const pos=new Map<string,number>();
  for(const u of chosen){const k=key(u);if(seen.has(k)){const i=pos.get(k)!;if(sizeOf(u)>sizeOf(out[i])||(out[i].includes('?')&&!u.includes('?')))out[i]=u;continue;}seen.add(k);pos.set(k,out.length);out.push(u);}
  // Préfère la version sans paramètres de redimensionnement quand elle existe.
  return out.map(u=>/[?&](w|h|width|height|fit|size|resize)=/i.test(u)&&chosen.some(c=>c===u.split('?')[0])?u.split('?')[0]:u).slice(0,45);
}

function longestText(html:string){
  // Découpe par blocs (sans expressions coûteuses) et garde le plus long texte « rédigé ».
  const body=html.replace(/<(script|style|svg|noscript|nav|header|footer|form|select|button)\b[\s\S]*?<\/\1>/gi,' ');
  let best='';
  for(const chunk of body.split(/<\/?(?:div|section|article|table|ul|ol|aside|main)\b[^>]*>/i)){
    if(chunk.length<120)continue;const t=clean(chunk);
    if(t.length>best.length&&t.split(/\s+/).length>25&&!/[{};]\s*[a-z-]+\s*:/.test(t.slice(0,200))&&!/object\(|=>|string\(\d|donn[ée]es personnelles|informations recueillies|\bRGPD\b|sous-traitant|capital social|\bRCS\b|siret|responsabilit[ée] civile|cookies|carte professionnelle|tous droits r[ée]serv|mentions l[ée]gales|politique de confidentialit/i.test(t))best=t;
  }
  return best.slice(0,6000);
}

const FUEL:[RegExp,string][]=[[/hybride rechargeable|plug-?in/i,'hybride rechargeable'],[/hybride/i,'hybride'],[/[ée]lectrique/i,'électrique'],[/diesel|gazole|hdi|tdi|dci|crdi|bluehdi/i,'diesel'],[/essence|tsi|tfsi|puretech|vti/i,'essence'],[/gpl/i,'gpl']];

export function smartDetail(rawHtml:string,pageUrl:string,sector:string){
  const base=new URL(pageUrl);const immo=sector==='immobilier';
  // Économie de calcul (limite CPU des fonctions) : on ne travaille que sur l'en-tête et la zone autour du titre principal.
  const headEnd=rawHtml.search(/<\/head>/i);const headHtml=rawHtml.slice(0,headEnd>0?Math.min(headEnd,200000):60000);
  const h1At=rawHtml.search(/<h1[\s>]/i);
  const from=h1At>0?Math.max(headEnd>0?headEnd:0,h1At-30000):(headEnd>0?headEnd:0);
  const region=rawHtml.slice(from,from+220000);
  const html=region.replace(/<script\b(?![^>]*ld\+json)[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<(style|svg|noscript)\b[\s\S]*?<\/\1>/gi,' ');
  const ogTitle=metaAll(headHtml,'og:title')[0]||'';
  const h1=clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
  const docTitle=clean(headHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  let titre=(h1&&h1.length>=6&&h1.length<=160?h1:'')||ogTitle||docTitle;
  titre=titre.replace(/\s*[|–—-]\s*[^|–—-]{2,60}$/,(m)=>/€|\d/.test(m)?m:'').replace(/\s+/g,' ').trim();
  if(!titre)return null;
  const text=clean(html.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi,' ')).slice(0,40000);
  const head=h1+' \n'+ogTitle+' \n'+docTitle;
  // Prix : données de prix déclarées, titre, données de la page, libellé « Prix », premier montant.
  const priceRe=/(?<![\p{L}\d][\s  .]?)(\d{1,3}(?:[\s  .]\d{3})+|\d{3,9})(?:[.,]\d{1,2})?\s*(?:€|eur\b|euros?)/iu;
  let prix=NaN;
  // Montants mensuels (crédit, LOA, « dès … / mois ») ignorés, sauf pour une location immobilière.
  const rental=immo&&/\b(louer|location|loyer|a-louer)\b/i.test(head+' '+base.pathname);
  const firstAmount=(src:string,re:RegExp)=>{for(const m of src.matchAll(new RegExp(re.source,'giu'))){const after=src.slice((m.index||0)+m[0].length,(m.index||0)+m[0].length+14);const before=src.slice(Math.max(0,(m.index||0)-30),m.index||0);if(!rental&&(/^\s*(?:\/|par)\s*mois|^\s*(?:ht\s*)?\/\s*m/i.test(after)||/(d[èe]s|[àa] partir de|mensualit|loa|lld|cr[ée]dit|financement)\W*$/i.test(before)))continue;const v=num(m[1]);if(v>0)return v;}return NaN;};
  const declared=metaAll(headHtml,'product:price:amount')[0]||metaAll(headHtml,'og:price:amount')[0]||(region.match(/itemprop=["']price["'][^>]*content=["']([\d.,\s]+)["']/i)?.[1]||'');
  if(declared)prix=num(declared.replace(/[.,]\d{2}$/,''));
  const metaDesc=(metaAll(headHtml,'description')[0]||'')+' \n'+(metaAll(headHtml,'og:description')[0]||'');
  if(!(prix>0))prix=firstAmount(head+' \n'+metaDesc,priceRe);
  if(!(prix>0)){const j=jsonVal(region,['itemPrice','price','prix','prixVente','prix_vente','sale_price','salePrice']);if(/^\d{3,9}(\.\d+)?$/.test(j))prix=Number(j);}
  if(!(prix>0))prix=firstAmount(text,new RegExp('(?:prix|loyer|tarif)[^0-9€]{0,40}'+priceRe.source,'iu'));
  if(!(prix>0))prix=firstAmount(text,priceRe);
  if(!(prix>=50&&prix<100000000))return null;
  const refM=base.pathname.match(/(\d{4,})(?!.*\d{4,})/);
  const reference=(refM?.[1]||jsonVal(region,['itemId','reference'])||base.pathname.replace(/\/+$/,'').split('/').pop()||'').slice(0,80);
  const ogs=[...metaAll(headHtml,'og:image'),...metaAll(headHtml,'og:image:url')];for(let i=0;i<45;i++){const v=metaAll(headHtml,'og:image_'+i)[0];if(!v)break;ogs.push(v);}
  const photos=pickPhotos(region,base,ogs,refM?.[1]||'');
  if(!photos.length)return null;
  const o:any={reference,url:pageUrl,titre:titre.slice(0,160),prix:String(Math.round(prix)),photos:photos.join('|')};
  const ogDesc=metaAll(headHtml,'og:description')[0]||metaAll(headHtml,'description')[0]||'';
  const long=longestText(html);o.description=(long.length>ogDesc.replace(/(\.{3}|…)$/,'').length?long:ogDesc).slice(0,6000);
  if(immo){
    const cityJ=jsonVal(region,['itemCity','addressLocality','city','ville','commune']);const cpJ=jsonVal(region,['itemZipcode','postalCode','zipcode','zipCode','codePostal','code_postal']);
    const zone=head+' \n'+text.slice(0,4000);
    const cpM=zone.match(/\b([A-ZÀ-Ý][A-Za-zÀ-ÿ' -]{2,40}?)\s*\((\d{5})\)/)||zone.match(/\b(\d{5})\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'-]{2,30}(?:[ -][A-ZÀ-Ýa-zà-ÿ'-]{2,20}){0,3})/);
    const bad=/kilom|prix|surface|ann[ée]e|t[ée]l|r[ée]f/i;
    let city='',cp='';if(cpM){if(/^\d/.test(cpM[1])){cp=cpM[1];city=cpM[2];}else{city=cpM[1];cp=cpM[2];}}
    if(cityJ&&!/^\d+$/.test(cityJ))o.ville=cityJ;else if(city&&!bad.test(city))o.ville=city.trim();
    if(/^\d{5}$/.test(cpJ))o.code_postal=cpJ;else if(cp&&o.ville)o.code_postal=cp;
    const all=head+' '+base.pathname+' '+text.slice(0,4000);
    o.transaction=/\b(louer|location|loyer|à louer|a-louer|par mois|\/mois|charges comprises)/i.test(head+' '+base.pathname)?'location':'vente';
    const kind=head+' '+base.pathname;
    const isHouse=/maison|villa|\bmas\b|propri[ée]t[ée]|chalet|bastide|long[èe]re|\bferme\b/i,isFlat=/appartement|studio|duplex|triplex|loft|penthouse/i;
    o.type_bien=isHouse.test(head)?'maison':isFlat.test(head)?'appartement':isHouse.test(kind)?'maison':isFlat.test(kind)||/\b[TF]\d\b/i.test(kind)?'appartement':/terrain/i.test(kind)?'terrain':/bureau|local|commerce|boutique|fonds|entrep[oô]t/i.test(kind)?'bureau':/parking|garage|\bbox\b|stationnement/i.test(kind)?'parking':'appartement';
    const sm=all.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)(?![a-z0-9])/i);if(sm)o.surface=sm[1];
    const pm2=all.match(/(\d{1,2})\s*pi[eè]ces?/i)||all.match(/\b[TF](\d)\b/);if(pm2)o.pieces=pm2[1];else if(/studio/i.test(head))o.pieces='1';
    const c=all.match(/(\d{1,2})\s*chambres?/i);if(c)o.chambres=c[1];
    const sdb=text.match(/(\d)\s*salles? (?:de bains?|d['’]eau)/i);if(sdb)o.salles_de_bain=sdb[1];
    const land=text.match(/terrain[^0-9]{0,30}(\d[\d\s.]*)\s*m(?:²|2)(?![a-z0-9])/i);if(land&&o.type_bien!=='terrain')o.surface_terrain=land[1].replace(/\s/g,'');
    if(o.type_bien==='terrain'&&o.surface){o.surface_terrain=o.surface;delete o.surface;}
    const dpe=(text.match(/(?:DPE|classe\s+[ée]nerg[ée]?t?i?(?:que|e)|consommation\s+(?:d['’])?[ée]nergie)[^A-Za-z0-9]{0,25}(?:classe\s*:?\s*)?([A-G])\b/i)||html.match(/data-(?:dpe|energy|energie)[a-z-]*=["']([A-G])["']/i))?.[1];
    const ges=(text.match(/(?:\bGES\b|[ée]missions?\s+de\s+gaz[^A-Z]{0,20}|classe\s+climat)[^A-Za-z0-9]{0,25}(?:classe\s*:?\s*)?([A-G])\b/i)||html.match(/data-(?:ges|climat|emission)[a-z-]*=["']([A-G])["']/i))?.[1];
    if(dpe&&ges){o.dpe=dpe.toUpperCase();o.ges=ges.toUpperCase();}
    const hon=text.match(/honoraires[^.\n]{0,120}/i);if(hon)o.honoraires=hon[0].trim();
    if(!(o.surface||o.pieces||o.chambres||o.surface_terrain))return null;
  }else{
    const all=head+' \n'+text.slice(0,6000);
    const km=all.match(/kilom[ée]trage[^0-9]{0,25}(\d{1,3}(?:[\s. ]\d{3})+|\d{1,6})/i)||all.match(/(?<![\p{L}\d][\s .]?)(\d{1,3}(?:[\s. ]\d{3})+|\d{1,6})\s*km\b/iu);
    if(km)o.kilometrage=km[1].replace(/[\s. ]/g,'');
    const y=all.match(/(?:ann[ée]e|mise en circulation|\bMEC\b|mod[èe]le)[^0-9]{0,30}(?:\d{1,2}\/)?((?:19[5-9]|20[0-3])\d)\b/i)||head.match(/\b((?:19[5-9]|20[0-3])\d)\b/);if(y)o.annee=y[1];
    for(const [re,v] of FUEL)if(re.test(all)){o.carburant=v;break;}
    if(/bo[iî]te\s*(?:de vitesses?\s*)?:?\s*auto|automatique|\bBVA\b|\bDSG\b|\bEAT\d/i.test(all))o.boite='automatique';else if(/manuelle|\bBVM\b|m[ée]canique/i.test(all))o.boite='manuelle';
    const ch=all.match(/(\d{2,4})\s*(?:ch|cv din)\b/i);if(ch)o.puissance_din=ch[1];
    const make=head.trim().split(/\s+/)[0];if(make&&/^[A-Za-zÀ-ÿ-]{2,}$/.test(make)&&!/^(vente|achat|occasion|voiture|v[ée]hicule|annonce)$/i.test(make))o.marque=make;
    o.etat=/\bneuf\b|\b0\s*km\b/i.test(head)?'neuf':'occasion';
    o.type=/\b(moto|scooter|quad|motocross|enduro|roadster|trail)\b/i.test(head+' '+base.pathname)?'moto':/\b(camping[- ]car|caravane|van am[ée]nag)/i.test(head)?'camping-car':/\b(fourgon|utilitaire|plateau|benne|L\dH\d|master|trafic|jumper|boxer|ducato|sprinter|transit)\b/i.test(head)?'utilitaire':'voiture';
    if(!(o.kilometrage||o.annee))return null;
  }
  return o;
}

// Parcours : accueil + pages de liste, puis fiches détectées. Budget en temps et en pages.
export async function readSmartSite(origin:URL,homeHtml:string,sector:string,fetchHtml:Fetcher,extraStarts:string[]=[],ldParse?:(html:string,url:string)=>any){
  const t0=Date.now();const host=origin.hostname.replace(/^www\./,'');
  const seenPages=new Set<string>();const detailQ:string[]=[];const listQ:string[]=[];const rows:any[]=[];const refs=new Set<string>();
  const take=(html:string,page:URL)=>{const {details,lists}=smartLinks(html,page,host);for(const d of details)if(!seenPages.has(d)&&!detailQ.includes(d))detailQ.push(d);for(const l of lists)if(!seenPages.has(l)&&!listQ.includes(l)&&listQ.length<60)listQ.push(l);};
  take(homeHtml,origin);seenPages.add(origin.toString());
  for(const s of extraStarts)if(!listQ.includes(s))listQ.unshift(s);
  let pages=0;let misses=0;
  // Adresse d'une agence dans un réseau (ex. /agence-immobiliere/cannes) : on reste sous ce chemin.
  const scope=extraStarts[0]?new URL(extraStarts[0]).pathname.replace(/\/+$/,''):'';
  const inScope=(u:string)=>!scope||scope.split('/').length<3||new URL(u).pathname.startsWith(scope);
  // Listes d'abord (pour trouver les fiches), en parallèle limité.
  let lists=0;
  while(listQ.length&&lists<20&&Date.now()-t0<20000){
    const batch=listQ.splice(0,4).filter(u=>!seenPages.has(u)&&inScope(u));batch.forEach(u=>seenPages.add(u));pages+=batch.length;lists+=batch.length;
    await Promise.all(batch.map(async u=>{try{const{text,url}=await fetchHtml(new URL(u));take(text.length>700000?text.slice(0,700000):text,url);}catch{}}));
  }
  if(scope&&scope.split('/').length>=3){const keep=detailQ.filter(inScope);detailQ.length=0;detailQ.push(...keep);}
  // Listes chargées en JavaScript : les fiches sont souvent dans le plan du site (sitemap).
  if(detailQ.length<5){
    const maps=[new URL('/sitemap.xml',origin).toString()];
    try{const{text}=await fetchHtml(new URL('/robots.txt',origin));for(const m of text.matchAll(/^sitemap:\s*(\S+)/gim))maps.unshift(m[1]);}catch{}
    const seenMaps=new Set<string>();const fromMaps:string[]=[];
    for(let k=0;k<maps.length&&seenMaps.size<10&&Date.now()-t0<25000;k++){const sm=maps[k];if(seenMaps.has(sm))continue;seenMaps.add(sm);
      try{const{text}=await fetchHtml(new URL(sm));for(const m of text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)){const loc=sDecode(m[1]);if(/\.xml(\?|$)/i.test(loc)){if(!/(post|page|categor|tag|author|blog|actualit|news)/i.test(loc))maps.push(loc);}else fromMaps.push(loc);}}catch{}}
    const fake=fromMaps.slice(0,5000).map(u=>`<a href="${u.replace(/"/g,'&quot;')}">`).join('');take(fake,origin);
    if(scope&&scope.split('/').length>=3){const keep=detailQ.filter(inScope);detailQ.length=0;detailQ.push(...keep);}
  }
  let i=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(i<detailQ.length&&pages<400&&Date.now()-t0<50000){
      const u=detailQ[i++];if(seenPages.has(u))continue;seenPages.add(u);pages++;
      try{const{text,url}=await fetchHtml(new URL(u));let o:any=null;if(ldParse){try{o=ldParse(text,url.toString());}catch{o=null;}if(o?._sold){misses++;continue;}}if(!o)o=smartDetail(text,url.toString(),sector);
        if(o&&!refs.has(o.reference)){refs.add(o.reference);rows.push(o);}else if(!o)misses++;
        // Une fiche peut mener à d'autres fiches (« biens similaires », pagination).
        if(detailQ.length<40&&text.length<400000)take(text,url);
      }catch{misses++;}
    }}));
  (rows as any).partial=i<detailQ.length;
  (rows as any).stats={pages,details:detailQ.length,read:rows.length,misses,ms:Date.now()-t0};
  return rows;
}
