import { cpu, cpuLeft } from './cpu-meter.ts';
import { energyImageUrls } from './energy-image.ts';
import { crawlCatalogue, type CrawlMemory } from "./resumable-crawl.ts";
import { isPlaceholderPhoto, photoKey, photoRank } from './photo-utils.ts';
// Lecteur « intelligent » des sites de pros (28/10/2026) : utilisé quand aucun connecteur dédié ne reconnaît le site.
// 1) repère les fiches d'annonces en regroupant les liens qui se répètent (même forme d'adresse, avec un numéro ou un long slug) ;
// 2) lit chaque fiche par règles générales : titre, prix, photos, surface/pièces/DPE (immobilier) ou km/année (véhicules).
// Aucune écriture ici : le résultat passe par l'aperçu et la validation de l'admin, comme les autres lecteurs.

type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const NAMED:Record<string,string>={eacute:'é',egrave:'è',ecirc:'ê',agrave:'à',acirc:'â',ccedil:'ç',ocirc:'ô',ucirc:'û',ugrave:'ù',icirc:'î',iuml:'ï',euml:'ë',Eacute:'É',Egrave:'È',Agrave:'À',oelig:'œ',euro:'€',sup2:'²',deg:'°',rsquo:'’',lsquo:'‘',laquo:'«',raquo:'»',hellip:'…',ndash:'–',mdash:'—',nbsp:' ',thinsp:' ',quot:'"',amp:'&',apos:"'",lt:'<',gt:'>'};
export const sDecode=(v:string)=>String(v||'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&([a-zA-Z]+\d?);/g,(m,n)=>NAMED[n]??m);
const clean=(v:string)=>sDecode(String(v||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li|h\d)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\u00a0\u2009\u202f]+/g,' ').split('\n').map(l=>l.trim()).filter(Boolean).join('\n').trim();
const SKIP_PATH=/(blog|actualit|news|article|conseil|guide|lexique|contact|mention|cgv|cgu|conditions|confidential|cookie|rgpd|recrut|emploi|carriere|estim|vendre|faire-gerer|gestion|syndic|financ|assurance|faq|aide|login|connexion|compte|favori|alerte|newsletter|plan-du-site|sitemap|avis|temoignage|equipe|agence(s)?\/?$|qui-sommes|a-propos|services?$|honoraires|bareme|print|imprim|share|partag|tel:|mailto:|javascript:|wp-admin|wp-login|feed|tag\/|categorie?\/|author)/i;
const LIST_PATH=/(acheter|achat|vente|vendre-|a-vendre|louer|location|annonce|biens?|nos-biens|catalog|recherche|search|resultat|offres?|stock|vehicules?|voitures?|occasions?|motos?|utilitaires?|nos-|liste|programme|immobilier)/i;
// 02/11/2026 (Anthony, ad-nostra « mauvaise photo ») : « default » seulement comme nom d'image, pas le dossier Drupal /sites/default/files/.
const IMG_BAD=/(logo|icon|sprite|avatar|favicon|placeholder|blank|pixel|spacer|flag|drapeau|banner|banniere|picto|badge|marker|loader|loading|social|facebook|instagram|whatsapp|twitter|linkedin|youtube|qrcode|partners?\/|partenaires?\/|modules\/|[\/_-](?:dpe|ges)[\/_.-]|etiquette[-_]?energ|watermark|default(?!\/)|no[-_]?photo|noimage|thumb_?nail_?small)/i;

function pathPattern(u:URL){return u.pathname.split('/').filter(Boolean).map(s=>/\d{3,}/.test(s)?(s.replace(/\d+/g,'#').length>12?'*#':'#'):(s.split('-').length>=4?'*':s)).join('/');}
function isDetailish(u:URL){const segs=u.pathname.replace(/\/+$/,'').split('/').filter(Boolean);const last=segs[segs.length-1]||'';return /\d{3,}/.test(last)||last.split('-').length>=4||/[?&](id|ref|annonce|bien|vehicule|product|cle|idann|id_annonce|idbien|reference|post_detail|detail|property|listing)=/i.test(u.search)
  /* 02/11/2026 (Régie Conseil : « /nos-annonces/ventes/lyon/appartement/13/ » ; Crefimo / Adapt'immo : « detail.htm?cle=920125671 ») */
  ||(segs.length>=4&&/^\d{1,6}$/.test(last)&&LIST_PATH.test(segs[0])&&!/^(?:page|p|pg)$/i.test(segs[segs.length-2]||''));}

// Liens de la page : fiches probables (formes répétées) et pages de liste à suivre.
// 01/11/2026 (robot en erreur 503 sur axeylia, laroca, valloire, bhcar) : la plateforme coupe le robot au-delà d'environ 2 s de calcul.
// Les gros sites (pages de 100 à 250 Ko, 300 pages et plus) dépassaient cette limite. Le temps de lecture des pages est compté ;
// au-delà du budget, le parcours s'arrête proprement (lecture partielle, reprise au passage suivant), sans planter.
export function smartLinks(html:string,page:URL,host:string){const t=performance.now();try{return smartLinksRaw(html,page,host);}finally{cpu.ms+=performance.now()-t;}}
// 01/11/2026 (Anthony, capture Laroca : fiches « Vente et achat appartements - » avec le logo en photo, « ville manquante ») :
// sur les sites Twimmo, les pages « /vente-appartement-a-<ville>.html », « /immobilier-a-<ville>.html » sont des listes, pas des biens.
// Une fiche Twimmo a toujours son numéro en fin d'adresse : « …-cerbere-1-247v562a.html ».
const TWIMMO_DETAIL=/-\d+-\d+v\d+[a-z]*\.html$/i;
const notTwimmoDetail=(html:string,url:string)=>{try{return /\.html$/i.test(new URL(url).pathname)&&!TWIMMO_DETAIL.test(new URL(url).pathname)&&/twimmo/i.test(html.slice(-60000));}catch{return false;}};
export const lastRefusal={v:''};
export function smartDetail(rawHtml:string,pageUrl:string,sector:string){const t=performance.now();lastRefusal.v='';try{if(notTwimmoDetail(rawHtml,pageUrl)){lastRefusal.v='page de liste Twimmo';return null;}return smartDetailRaw(rawHtml,pageUrl,sector);}finally{cpu.ms+=performance.now()-t;}}
function smartLinksRaw(html:string,page:URL,host:string){
  // Le <base href> est utilisé aussi pour les liens relatifs des fiches AdnPix.
  try{const b=html.match(/<base\b[^>]*href=["']([^"']+)["']/i);if(b){const u=new URL(sDecode(b[1]),page);if(u.hostname.replace(/^www\./,'')===host)page=u;}}catch{}
  const groups=new Map<string,Set<string>>();const lists=new Set<string>();
  for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){
    let u:URL;try{u=new URL(sDecode(m[1]),page);}catch{continue;}
    if(!/^https?:$/.test(u.protocol)||u.hostname.replace(/^www\./,'')!==host)continue;
    if(/\.(css|js|png|jpe?g|gif|svg|webp|ico|pdf|xml|zip|woff2?|mp4)(\?|$)/i.test(u.pathname))continue;
    u.hash='';const full=u.toString();
    if(SKIP_PATH.test(u.pathname))continue;
    if(host==='msmotors.fr'){
      if(/^\/vehicules\/(?:page\/\d+\/?)?$/.test(u.pathname)){lists.add(full);continue;}
      if(/^\/vehicules\/[^/]+\/?$/.test(u.pathname)){if(!groups.has('ms-vehicle'))groups.set('ms-vehicle',new Set());groups.get('ms-vehicle')!.add(full);}
      continue;
    }

    if(/\/(?:maisons|appartements|terrains)[^/]*\.php$/i.test(u.pathname)){lists.add(full);continue;}
    if(isDetailish(u)&&!(/[?&]pcsd=/.test(u.search)&&/\.php$/i.test(u.pathname))){const p=pathPattern(u)+(u.search?'?'+[...u.searchParams.keys()].sort().join('&'):'');if(!groups.has(p))groups.set(p,new Set());groups.get(p)!.add(full);}
    else if(LIST_PATH.test(u.pathname+u.search)||/\/(?:maisons|appartements|terrains)[^/]*\.php$/i.test(u.pathname)||/[?&](page|p|pg|start|offset)=\d+|\/page[-/]?\d+/i.test(u.pathname+u.search))lists.add(full);
  }
  const details:string[]=[];
  const loose=new Map<string,Set<string>>();
  for(const [,set] of [...groups.entries()].sort((a,b)=>b[1].size-a[1].size)){if(set.size>=2)details.push(...set);else for(const f of set){
    // 02/11/2026 (Christine Dumas / groupe 123 immo, La Boîte Immo : « /vente/1-brest/appartement/t1/379-… », « …/maison/t8/375-… ») :
    // une petite agence a souvent un seul bien de chaque type, donc chaque forme d'adresse n'apparaît qu'une fois.
    // Second regroupement : même rubrique (1er dossier de liste), même profondeur, numéro de fiche en fin d'adresse.
    try{const u=new URL(f);const segs=u.pathname.split('/').filter(Boolean);const last=segs[segs.length-1]||'';
      if(segs.length>=3&&LIST_PATH.test(segs[0])&&(/(?:^|[-_])\d{2,}(?:[-_.]|$)|\d{3,}/.test(last)||(segs.length>=4&&/^\d{1,6}$/.test(last)))){const k=segs[0]+'|'+segs.length;if(!loose.has(k))loose.set(k,new Set());loose.get(k)!.add(f);}}catch{}
  }}
  for(const [,set] of loose)if(set.size>=2||(set.size===1&&details.length===0))details.push(...set);
  // 02/11/2026 (Anthony, Cosmopolitan « soi-disant réparé ») : « /acheter-appartement-maison-nice.html », « /liste-biens-….html » pris pour
  // des biens à côté des vraies fiches « /immobilier-…-313.html ». Quand au moins 2 fiches d'un même niveau finissent par un numéro,
  // celles de ce niveau sans numéro et au nom de liste (liste, acheter, vente, biens…) sont des pages de liste.
  {const info=(f:string)=>{try{const segs=new URL(f).pathname.split('/').filter(Boolean);const last=(segs[segs.length-1]||'').replace(/\.(?:html?|php|aspx?)$/i,'');return{d:segs.length,n:/(?:^|[-_])\d{2,}$/.test(last)||/\d{3,}/.test(last)/* Twimmo « …-1-247v562a » (Laroca) */,l:/(?:^|[-_])(?:liste|listing|acheter|achat|vente|vendre|louer|location|biens|programmes?|annonces|recherche|nos|tous|toutes|catalogue|stock)(?:[-_]|$)/i.test(last)};}catch{return{d:0,n:false,l:false};}};
   const numAt=new Map<number,number>();for(const f of details){const i=info(f);if(i.n)numAt.set(i.d,(numAt.get(i.d)||0)+1);}
   if(numAt.size){const keep=details.filter(f=>{const i=info(f);if(!i.n&&i.l&&(numAt.get(i.d)||0)>=2){lists.add(f);return false;}return true;});details.length=0;details.push(...keep);}}
  return{details,lists:[...lists]};
}

const num=(s:string)=>{const t=String(s||'').replace(/[\s\u00a0\u202f.']/g,'').replace(',','.');const n=Number(t);return Number.isFinite(n)?n:NaN;};
function metaAll(html:string,prop:string){return [...html.matchAll(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,'gi'))].map(m=>sDecode(m[1]??m[2]??'').trim()).filter(Boolean);}
function jsonVal(html:string,keys:string[]){const h=html.replace(/&quot;/g,'"');for(const k of keys){const m=h.match(new RegExp(`"${k}"\\s*:\\s*"?([^",}\\]]{1,80})`,'i'));if(m&&m[1].trim()&&m[1]!=='null')return sDecode(m[1].trim());}return'';}

// Une galerie explicitement identifiée appartient à la fiche ; les logos, conseillers
// et suggestions autour ne doivent pas devenir la photo principale.
function photoGallery(html:string):string{
  // 02/11/2026 (Anthony, Dolce Immo / Jalis : « au moins 8 photos et nous seulement 3 ») : la fiche montre 3 photos en tête
  // (« +4 photos ») et la galerie complète plus bas (« section-gallery2 ») → toutes les galeries de la fiche sont réunies.
  const blocks:string[]=[];let after=0;
  for(const m of html.matchAll(/<(div|section|ul|figure)\b[^>]*>/gi)){
    if((m.index||0)<after)continue;
    const labels=[...m[0].matchAll(/\s(?:class|id)\s*=\s*(["'])([\s\S]*?)\1/gi)].map(x=>x[2]).join(' ');
    if(!/(?:^|[\s_-])(?:gallery|galerie|fotorama)\d?(?:$|[\s_-])|\bmodule-slider\b|\b(?:property|product|vehicle|listing)[-_]slider\b/i.test(labels)||/thumb|miniature|related|similar|suggest|recommend|testimonial/i.test(labels))continue;
    const tags=new RegExp('<\\/?'+m[1]+'\\b[^>]*>','gi');tags.lastIndex=(m.index||0)+m[0].length;let depth=1,end=html.length;
    for(let t;(t=tags.exec(html));){depth+=/^<\//.test(t[0])?-1:1;if(!depth){end=tags.lastIndex;break;}}
    const block=html.slice(m.index,end);if(/<img\b|data-image-url=/i.test(block)){blocks.push(block);after=end;if(blocks.length>=4)break;}
  }
  return blocks.join('\n');
}

function pickPhotos(html:string,base:URL,ogs:string[],ref:string){
  const all:string[]=[];const add=(raw:string)=>{if(!raw)return;let u:string;try{u=new URL(sDecode(raw.trim()),base).toString();}catch{return;}
    /* 02/11/2026 (Kombishop, PrestaShop) : miniatures « 29170-small_default/… » → même photo en grand */u=u.replace(/(\/\d+-)(?:small|medium|home|cart|thickbox)_default(\/)/,'$1large_default$2');if(!/^https?:/i.test(u)||!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(u)&&!/\/(image|photo|img|media|picture)s?\//i.test(u))return;if(IMG_BAD.test(u.split('?')[0])||isPlaceholderPhoto(u))return;all.push(u);};
  const gallery=photoGallery(html);if(gallery){html=gallery;ogs=[];}
  ogs.forEach(add);
  // Un élément lazy-load désigne une seule photo. Ne pas récupérer son src d’attente
  // ni data-low-src en plus du data-src/data-original pleine taille.
  for(const m of html.matchAll(/<(?:img|source|a|div|li|meta)\b[^>]*>/gi)){
    const tag=m[0],attrs=new Map<string,string>();
    for(const a of tag.matchAll(/(?:^|\s)([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g))attrs.set(a[1].toLowerCase(),sDecode(a[3]));
    const valid=(v:string|undefined)=>{try{if(!v)return false;const u=new URL(v,base);return /^https?:$/.test(u.protocol)&&(/\.(jpe?g|png|webp|avif)(\?|$)/i.test(u.href)||/\/(image|photo|img|media|picture)s?\//i.test(u.href))&&!IMG_BAD.test(u.pathname)&&!isPlaceholderPhoto(u.href);}catch{return false;}};
    const full=['data-image-url','data-full','data-zoom-image','data-original','data-large','data-big'].map(k=>attrs.get(k)).find(valid);
    if(full){add(full);continue;}
    const srcset=attrs.get('data-srcset')||attrs.get('srcset');
    if(srcset){const candidates=srcset.split(',').map(v=>v.trim().split(/\s+/)).filter(v=>valid(v[0]));candidates.sort((a,b)=>(parseFloat(b[1])||1)-(parseFloat(a[1])||1));if(candidates[0]){add(candidates[0][0]);continue;}}
    const lazy=['data-src','data-lazy-src','data-lazy','data-image'].map(k=>attrs.get(k)).find(valid);
    if(lazy){add(lazy);continue;}
    if(/^<img\b/i.test(tag)){const src=attrs.get('src')||'';
      /* 02/11/2026 (Martin Gestion : photos « /storage/product/1630/6ae79a4728b86 » sans extension) : image d'un dossier de stockage, dans une balise <img> */
      if(src&&!/\.[a-z0-9]{3,4}(\?|$)/i.test(src)&&/\/(?:storage|uploads?|files?)\/(?:[^/]+\/)*(?:products?|biens?|annonces?|properties|property|listings?|vehicules?|photos?)\//i.test(src)){try{const u=new URL(sDecode(src),base).toString();if(!IMG_BAD.test(u)&&!isPlaceholderPhoto(u))all.push(u);}catch{}continue;}
      add(src);continue;}
    if(/^<a\b/i.test(tag))add(attrs.get('href')||'');
    if(/^<meta\b/i.test(tag)&&/^(?:og:image(?::url)?|image)$/i.test(attrs.get('property')||attrs.get('itemprop')||''))add(attrs.get('content')||'');
  }
  if(!all.length)return[];
  // Les variantes de taille comptent comme la même photo : dossiers « 1200xauto », « 800x0 », « gallery_625x470 », « large »,
  // ou suffixes « -300x200 » dans le nom du fichier.
  const SIZE_SEG=/\/(?:[a-z]+_)?\d{1,4}x(?:\d{1,4}|auto)(?=\/)|\/(?:thumbs?|small|medium|large|big|mini|xs|sm|md|lg|xl|xlarge|full|original|zoom)(?=\/)/gi;
  const sizeless=(u:string)=>u.split('?')[0].replace(SIZE_SEG,'');
  const key=photoKey;
  const rawDir=(u:string)=>u.split('?')[0].replace(/\/[^/]*$/,'');
  const dir=(u:string)=>sizeless(u).replace(/\/[^/]*$/,'');
  const sizeOf=(u:string)=>{const p=u.split('?')[0];const m=p.match(/(\d{1,4})x(\d{1,4}|auto)(?=[\/._-])/i);if(m)return Math.max(Number(m[1])||0,m[2]==='auto'?Number(m[1])||0:Number(m[2])||0)||1;if(/\/(original|full|zoom|xlarge|xl|big|large)\//i.test(p))return 2000;if(/thumb|small|mini|list_/i.test(p))return 1;return 1500;};
  // Famille principale : celle de l'image de partage, sinon la plus fournie (ou les fichiers portant la référence).
  const fam=new Map<string,number>();for(const u of all)fam.set(dir(u),(fam.get(dir(u))||0)+1);
  const ogDir=(()=>{try{return ogs.length?dir(new URL(ogs[0],base).toString()):'';}catch{return '';}})();
  const mainDir=ogDir&&(fam.get(ogDir)||0)>=2?ogDir:[...fam.entries()].sort((a,b)=>b[1]-a[1])[0][0];
  const inFam=all.filter(u=>dir(u)===mainDir);
  // Dans la famille, le dossier de la plus grande taille qui contient plusieurs photos (la galerie de l'annonce,
  // pas les vignettes des « véhicules similaires »).
  const groups=new Map<string,{n:Set<string>,size:number}>();for(const u of inFam){const g=groups.get(rawDir(u))||{n:new Set<string>(),size:0};g.n.add(key(u));g.size=Math.max(g.size,sizeOf(u));groups.set(rawDir(u),g);}
  const maxN=Math.max(...[...groups.values()].map(g=>g.n.size));
  const best=[...groups.entries()].filter(([,g])=>g.n.size>=Math.max(2,Math.ceil(maxN*0.5))).sort((a,b)=>b[1].size-a[1].size||b[1].n.size-a[1].n.size)[0];
  const keep=best&&groups.size>1?new Set(best[1].n):null;
  const refOk=ref&&ref.length>=4;
  const chosen=all.filter(u=>(dir(u)===mainDir&&(!keep||keep.has(key(u))))||(refOk&&u.split('?')[0].includes(ref)));
  const out:string[]=[];const seen=new Set<string>();
  const pos=new Map<string,number>();
  for(const u of chosen){const k=key(u);if(seen.has(k)){const i=pos.get(k)!;if(photoRank(u)>photoRank(out[i]))out[i]=u;continue;}seen.add(k);pos.set(k,out.length);out.push(u);}
  // Préfère la version sans paramètres de redimensionnement quand elle existe.
  return out.map(u=>/[?&](w|h|width|height|fit|size|resize)=/i.test(u)&&chosen.some(c=>c===u.split('?')[0])?u.split('?')[0]:u).slice(0,45);
}

function longestText(html:string){
  // Découpe par blocs (sans expressions coûteuses) et garde le plus long texte « rédigé ».
  // 01/11/2026 (Anthony : « descriptions pas entières », Twimmo) : un <button> sans fermeture avalait tout jusqu'au </button> suivant,
  // description comprise → longueur bornée pour les petits éléments (bouton, liste) et les blocs de navigation / formulaires.
  const body=html.replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi,' ').replace(/<(select|button)\b[\s\S]{0,4000}?<\/\1>/gi,' ').replace(/<(nav|header|footer|form)\b[\s\S]{0,40000}?<\/\1>/gi,' ');
  let best='';
  for(const chunk of body.split(/<\/?(?:div|section|article|table|ul|ol|aside|main)\b[^>]*>/i)){
    if(chunk.length<120)continue;const t=clean(chunk);
    if(t.length>best.length&&t.split(/\s+/).length>25&&!/[{};]\s*[a-z-]+\s*:/.test(t.slice(0,200))&&!/object\(|=>|string\(\d|donn[ée]es personnelles|informations recueillies|\bRGPD\b|sous-traitant|capital social|\bRCS\b|siret|responsabilit[ée] civile|cookies|carte professionnelle|tous droits r[ée]serv|mentions l[ée]gales|politique de confidentialit|stockage ou l.acc[eè]s technique|assignation [àa] compara[iî]tre|fournisseur d.acc[eè]s [àa] internet|finalit[ée]s? statistiques|consentement|traceurs/i.test(t))best=t;
  }
  return best.slice(0,6000);
}

const FUEL:[RegExp,string][]=[[/hybride rechargeable|plug-?in/i,'hybride rechargeable'],[/hybride/i,'hybride'],[/[ée]lectrique/i,'électrique'],[/diesel|gazole|hdi|tdi|dci|crdi|bluehdi/i,'diesel'],[/essence|tsi|tfsi|puretech|vti/i,'essence'],[/gpl/i,'gpl']];

// AdnPix : champs propres à la fiche, sans les filtres de recherche ni l'adresse de l'agence.
function adnpixDetail(html:string,url:string){
  const h=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';
  const title=clean(h.match(/<span\b[^>]*class=["']annonce-detail-titre["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
  if(!title)return null;
  if(/class=["'][^"']*\bbadge-detail\b[^"']*["'][^>]*>\s*(?:Vendu[e]?|Lou[ée]e?|Sous Compromis|Offre accept[ée]e|R[ée]serv[ée]e?)\s*</i.test(html))return {_sold:1,reference:new URL(url).pathname.split('/').pop(),url};
  const price=clean(h.match(/class=["']annonce-detail-prix["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]||'').replace(/[^\d]/g,'');
  const city=clean(h.replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi,''));
  const body=html.split(/class=["']annonce-detail-premiere-image["']/i)[1]?.split(/<\/a>\s*<\/div>/i)[1]?.split(/<div\b[^>]*class=["']wrapper-contactannonce["']/i)[0]||'';
  const description=clean(body);
  let base=new URL(url);try{base=new URL(sDecode(html.match(/<base\b[^>]*href=["']([^"']+)["']/i)?.[1]||url),url);}catch{}
  const photos:string[]=[];
  for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*data-fancybox-group=["']lightbox-\d+["']/gi)){try{const u=new URL(sDecode(m[1]),base);if(/^https?:$/.test(u.protocol)&&!photos.includes(u.toString()))photos.push(u.toString());}catch{}}
  if(!price||!city||!photos.length)return null;
  const kind=clean(html.match(/class=["']annonce-detail-typebien[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
  const o:any={reference:new URL(url).pathname.split('/').filter(Boolean).pop(),url,titre:title,prix:price,ville:city,description,photos:photos.join('|'),transaction:'vente',type_bien:/appartement/i.test(kind)?'appartement':/terrain/i.test(kind)?'terrain':/maison/i.test(kind)?'maison':/parking|garage/i.test(title)?'parking':'bureau',texte_page:description};
  const surface=description.match(/(?:surface(?: habitable)?(?: de)?|habitable[s]? de|maison de|appartement de|logement de|loi carrez(?: est de)?)\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i)||title.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
  if(surface)o.surface=surface[1];
  const terrain=description.match(/(?:terrain|parcelle|jardin)[^.\n]{0,80}?(\d[\d ]*(?:[.,]\d+)?)\s*m[²2]/i);if(terrain)o.surface_terrain=terrain[1].replace(/ /g,'');
  const rooms=(title+' '+description).match(/\b[TF](\d)\b|\b(\d+)\s*pi[eè]ces?\b(?!\s+de\s+vie)/i);if(rooms)o.pieces=rooms[1]||rooms[2];
  const bedrooms=description.match(/\b(\d+)\s+(?:(?:grandes?|belles?|spacieuses?|vastes?)\s+)?chambres?\b/i);if(bedrooms)o.chambres=bedrooms[1];
  for(const [field,cls] of [['dpe','npe-conso-etiquettes'],['ges','npe-emissions-etiquettes']]){const match=html.match(new RegExp('class=["\'][^"\']*\\b'+cls+'\\b[^"\']*\\bndpe-([a-g])-selected\\b','i'));if(match)o[field]=match[1].toUpperCase();}
  const lots=description.match(/nombre de lots de copropri[ée]t[ée]\s*:\s*(\d+)/i);if(lots)o.nombre_lots=lots[1];
  return o;
}

// Public diagnostic graphics: select only the highlighted row, never the A–G legend.
export function activeEnergyDiagnostics(html:string){
 const out:Record<string,string>={};
 for(const kind of ['dpe','ges']){
  const block=html.match(new RegExp('<div\\b[^>]*class=["\'][^"\']*\\bdiag-'+kind+'\\b[^"\']*["\'][^>]*>([\\s\\S]*?)</ul>','i'))?.[1]||'';
  const rows=[...block.matchAll(/<li\b[^>]*class=["'][^"']*\bactive\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)];
  if(rows.length!==1)continue;
  const letter=rows[0][1].match(/class=["']note["'][^>]*>\s*<strong>\s*([A-G])\s*<\/strong>/i)?.[1];
  if(letter)out[kind]=letter.toUpperCase();
  const value=rows[0][1].match(/class=["']value(?:-left)?["'][^>]*>\s*(?:<span[^>]*>\s*)?<strong>\s*(\d+(?:[.,]\d+)?)/i)?.[1];
  if(kind==='dpe'&&letter&&value)out.consommation_energie=value.replace(',','.');
 }
 return out;
}
// 02/11/2026 (monagenceautomobile : prix absent du texte de la page → lecture de la page refusée, 1 seule photo des données structurées
// alors que la page en a 21) : photos de la page seules, pour compléter des données structurées pauvres en photos.
export function smartPhotos(rawHtml:string,pageUrl:string):string[]{const t=performance.now();try{
  const base=new URL(pageUrl);const headEnd=rawHtml.search(/<\/head>/i);const headHtml=rawHtml.slice(0,headEnd>0?Math.min(headEnd,200000):60000);
  const h1At=rawHtml.search(/<h1[\s>]/i);const from=h1At>0?Math.max(headEnd>0?headEnd:0,h1At-30000):(headEnd>0?headEnd:0);
  const region=rawHtml.slice(from,from+220000).replace(/<script\b(?![^>]*ld\+json)[^>]*>[\s\S]*?<\/script>/gi,' ');
  const ogs=[...metaAll(headHtml,'og:image'),...metaAll(headHtml,'og:image:url')];
  return pickPhotos(region,base,ogs,base.pathname.match(/(\d{4,})(?!.*\d{4,})/)?.[1]||'');
 }catch{return [];}finally{cpu.ms+=performance.now()-t;}}
function smartDetailRaw(rawHtml:string,pageUrl:string,sector:string){
  if(sector==='immobilier'&&/class=["']annonce-detail-titre["']/i.test(rawHtml))return adnpixDetail(rawHtml,pageUrl);
  const base=new URL(pageUrl);const immo=sector==='immobilier';
  // 02/11/2026 (Anthony, Dolce Immo : « badges VENDU / INDISPONIBLE ») — sites Jalis : une fiche d'article (<body class="fiche …">
  // sans « fiche_produit ») n'est pas un bien ; un bien vendu porte « Biens vendus » au-dessus du titre ou un badge
  // « selection vendu / indisponible » avant le titre (les badges plus bas sont ceux des autres biens « À découvrir »).
  if(/jalis\.pro/i.test(rawHtml.slice(0,8000))){
    const body=rawHtml.match(/<body\b[^>]*class=["']([^"']*)["']/i)?.[1]||'';
    if(/(?:^|\s)fiche(?:\s|$)/.test(body)&&!/fiche_produit/.test(body))return null;
    const h1J=rawHtml.search(/<h1[\s>]/i);
    if(h1J>0){const before=rawHtml.slice(Math.max(0,h1J-8000),h1J);
      if(/>\s*Biens (?:vendus|lou[ée]s)\s*<\/div>\s*$/i.test(before)||/class=["']selection (?:vendu|indisponible|sous-offre|compromis)\b/i.test(before))return{_sold:1,reference:base.pathname.split('/').pop(),url:pageUrl};}
  }
  // Économie de calcul (limite CPU des fonctions) : on ne travaille que sur l'en-tête et la zone autour du titre principal.
  const headEnd=rawHtml.search(/<\/head>/i);const headHtml=rawHtml.slice(0,headEnd>0?Math.min(headEnd,200000):60000);
  const h1At=rawHtml.search(/<h1[\s>]/i);
  const from=h1At>0?Math.max(headEnd>0?headEnd:0,h1At-30000):(headEnd>0?headEnd:0);
  const region=rawHtml.slice(from,from+220000);
  const html=region.replace(/<script\b(?![^>]*ld\+json)[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<(style|svg|noscript)\b[\s\S]*?<\/\1>/gi,' ')
  // 29/10/2026 (Nestenn) : « 145<span class="nbsp"> </span>350 € » : chiffres séparés par une balise d'espace → « 145 350 € ».
   .replace(/(\d)\s*<span\b[^>]*>(?:\s|&nbsp;|&#160;|&#x202f;|\u00a0|\u202f)*<\/span>\s*(?=\d{3}(?!\d))/gi,'$1 ');
  const ogTitle=metaAll(headHtml,'og:title')[0]||'';
  const h1=clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
  const docTitle=clean(headHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  /* 02/11/2026 (Crefimo : titre principal = « - 449 000 € * ») : un titre qui n'est qu'un prix n'est pas le titre du bien */
  const priceOnly=(x:string)=>/^[\s\-–—:]*[\d\s.,\u00a0\u202f]+\s*(?:€|eur|euros?)?\s*\*?\s*$/i.test(x);
  let titre=(h1&&h1.length>=6&&h1.length<=160&&!priceOnly(h1)?h1:'')||ogTitle||docTitle;
  /* 02/11/2026 (Dolce Immo « belle maison de plain ») : un trait d'union dans un mot (« plain-pied ») n'est pas un séparateur de nom de site */titre=titre.replace(/(?:\s*[|–—]\s*|\s+-\s+)(?:(?!\s-\s)[^|–—]){2,60}$/,(m)=>/€|\d/.test(m)?m:'').replace(/\s+/g,' ').trim();
  titre=titre.replace(/^(?:ACHAT\s+VENTE|VENTE|LOCATION|ACHAT)\s*[-–:]\s*/i,'').replace(/\s*!?\s*Agence immobili[eè]re\s+[^!.|]{2,40}$/i,'').replace(/\s*!\s*$/,'').trim();/* 02/11/2026 (Adapt'immo : « ACHAT VENTE - Maison familiale à Asnières ! Agence immobilière CREFIMO ») */
  if(!titre){smartHooks.trace(pageUrl,'fiche refusée : pas de titre');lastRefusal.v='pas de titre';return null;}
  const text=clean(html.replace(/<(nav|header|footer)\b[\s\S]{0,40000}?<\/\1>/gi,' ')).slice(0,40000);/* 01/11/2026 : bornée (un <header> mal fermé avalait la fiche) */
  const head=h1+' \n'+ogTitle+' \n'+docTitle;
  // Prix : données de prix déclarées, titre, données de la page, libellé « Prix », premier montant.
  // 29/10/2026 : un retour à la ligne sépare (« Appartement à vendre\n145 350 € » était refusé et le robot prenait les charges).
  const priceRe=/(?<![\p{L}\d][ \t\u00a0\u202f.]?)(\d{1,3}(?:[\s\u00a0\u202f.]\d{3})+|\d{3,9})(?:[.,]\d{1,2})?\s*(?:€|eur\b|euros?)/iu;
  let prix=NaN;
  // Montants mensuels (crédit, LOA, « dès … / mois ») ignorés, sauf pour une location immobilière.
  const hpos=html.search(/<h1[\s>]/i);const nearTitle=hpos>=0?clean(html.slice(Math.max(0,hpos-4000),hpos+4000)):'';
  // 29/10/2026 (Nestenn) : « 690 € CC/Mois » à côté du titre, « À louer » en tête de description = location.
  /* 02/11/2026 (Dolce Immo : location lue « vente ») : montant libellé « Loyer » à côté du titre */const loyerLabel=hpos>=0&&/>\s*Loyer(?:\s+(?:mensuel|CC|HC|charges comprises))?\s*:?\s*</i.test(html.slice(hpos,hpos+3000));
  const rental=immo&&(loyerLabel||/\b(louer|location|loyer|a-louer)\b/i.test(head+' '+base.pathname)||/\d\s*€\s*(?:cc|hc|charges comprises|hors charges)?\s*(?:\/|par)\s*mois/i.test(nearTitle)||/(?:^|\n|\.\s)\s*(?:à|a) louer\b/i.test(text.slice(0,6000)));
  const firstAmount=(src:string,re:RegExp)=>{for(const m of src.matchAll(new RegExp(re.source,'giu'))){const after=src.slice((m.index||0)+m[0].length,(m.index||0)+m[0].length+14);const before=src.slice(Math.max(0,(m.index||0)-30),m.index||0);if(!rental&&(/^\s*(?:\/|par)\s*mois|^\s*(?:ht\s*)?\/\s*m/i.test(after)||/(d[èe]s|[àa] partir de|mensualit|loa|lld|cr[ée]dit|financement)\W*$/i.test(before)))continue;
    // 01/11/2026 (Anthony, Agence Résidence : « 140 € c'est les charges ») : un montant libellé charges / quote-part / taxe / honoraires / énergie / dépôt n'est jamais le prix.
    const label=src.slice(Math.max(0,(m.index||0)-70),m.index||0);if(/(charges?|quote[- ]?part|taxe|fonci[èe]re|honoraires?|frais|[ée]nergie|d[ée]p[ôo]t|garantie|caution|copropri[ée]t[ée]|entre)\b[^\d€]{0,30}$/i.test(label)&&!/\b(?:prix|loyer)\b/i.test(label.slice(-45)))continue;
    const v=num(m[1]);if(v>0)return v;}return NaN;};
  const declared=metaAll(headHtml,'product:price:amount')[0]||metaAll(headHtml,'og:price:amount')[0]||(region.match(/itemprop=["']price["'][^>]*content=["']([\d.,\s]+)["']/i)?.[1]||'');
  if(declared){const canonical=declared.replace(/\s/g,'');prix=/^\d+(?:[.,]\d+)?$/.test(canonical)?Number(canonical.replace(',','.')):num(declared);}
  const metaDesc=(metaAll(headHtml,'description')[0]||'')+' \n'+(metaAll(headHtml,'og:description')[0]||'');
  // 01/11/2026 (Citya Nord de France : « 1 » salle de bain + « 179 500 € » lus comme 1 179 500 €) : un élément dont la classe dit « price / prix »
  // est lu seul, avant le texte de la page (où des chiffres voisins se collent au prix).
  if(!(prix>0)){for(const m of region.matchAll(/class="[^"]*\b(?:[a-z-]*-)?(?:price|prix)\b[^"]*"[^>]*>\s*([^<]{2,40}?)\s*</gi)){const v=firstAmount(clean(m[1]),priceRe);if(v>0){prix=v;break;}}}
  if(!(prix>0))prix=firstAmount(head+' \n'+metaDesc,priceRe);
  if(!(prix>0)){const j=jsonVal(region,['itemPrice','price','prix','prixVente','prix_vente','sale_price','salePrice']);if(/^\d{3,9}(\.\d+)?$/.test(j))prix=Number(j);}
  // 29/10/2026 (Nestenn) : prix affiché à côté du titre mais dans un <header> (retiré du texte) : on regarde autour du titre d'abord.
  if(!(prix>0)&&nearTitle)prix=firstAmount(nearTitle,priceRe);
  if(!(prix>0))prix=firstAmount(text,new RegExp('(?:prix|loyer|tarif)[^0-9€]{0,40}'+priceRe.source,'iu'));
  if(!(prix>0))prix=firstAmount(text,priceRe);
  if(!(prix>=50&&prix<100000000)&&!(base.hostname.replace(/^www\./,'')==='msmotors.fr'&&/^\/vehicules\/[^/]+\/?$/.test(base.pathname))){smartHooks.trace(pageUrl,'fiche refusée : prix '+prix+' titre='+titre.slice(0,60));lastRefusal.v='prix '+prix+' / titre '+titre.slice(0,60);return null;}
  const refM=base.pathname.match(/(\d{4,})(?!.*\d{4,})/);
  /* 02/11/2026 (Crefimo : toutes les fiches « detail.htm?cle=… » avaient la référence « detail.htm » → fusionnées en une seule) */
  const qRef=[...base.searchParams.entries()].find(([k,v])=>/^(?:cle|id|ref|reference|idann|id_annonce|idbien|annonce|bien|post_detail|detail|property|listing)$/i.test(k)&&/\d{2,}/.test(v))?.[1];
  const reference=(refM?.[1]||qRef||jsonVal(region,['itemId','reference'])||base.pathname.replace(/\/+$/,'').split('/').pop()||'').slice(0,80);
  const ogs=[...metaAll(headHtml,'og:image'),...metaAll(headHtml,'og:image:url')];for(let i=0;i<45;i++){const v=metaAll(headHtml,'og:image_'+i)[0];if(!v)break;ogs.push(v);}
  let photos=pickPhotos(region,base,ogs,refM?.[1]||'');
  // 02/11/2026 (Anthony, Ford Alliance / Dealer K : « manque les photos principales ») : la page (600 Ko) range la galerie du véhicule
  // dans une liste JSON en tête de page (« imageList » : image800…) ; la zone lue autour du titre ne contenait que la fin de la galerie
  // et les véhicules similaires. Première liste « imageList » de la page = photos du véhicule, dans l'ordre.
  {const at=rawHtml.indexOf('"imageList":[');if(at>=0){const seg=rawHtml.slice(at,at+60000);const end=seg.indexOf('}]');const list=[...seg.slice(0,end>0?end+2:seg.length).matchAll(/"image800"\s*:\s*"([^"]+)"/g)].map(m=>m[1].replace(/\\\//g,'/'));
    if(list.length>=2){const abs=list.map(u=>{try{return new URL(u,base).toString();}catch{return '';}}).filter(Boolean);if(abs.length)photos=[...new Set(abs)];}}}
  // 01/11/2026 (Anthony, La Grandière : « mauvaise photo ») : photo principale de la fiche (og:image) absente de la galerie lue →
  // remise en 1re position, seulement si son nom de fichier reprend le titre de l'annonce (jamais un logo ou une bannière).
  {const og=ogs[0]||'';const words=(x:string)=>new Set(x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(w=>w.length>=3));
   const tw=words(titre),fw=words(decodeURIComponent((og.split('?')[0].split('/').pop()||'')));let common=0;for(const w of fw)if(tw.has(w))common++;
   if(og&&common>=3&&!/logo|favicon|placeholder|default/i.test(og)&&!photos.some((p:string)=>p.split('?')[0]===og.split('?')[0]))photos.unshift(og);}
  // Fiche conservée pour afficher « aucune photo » dans les erreurs de l’aperçu.
  const o:any={reference,url:pageUrl,titre:titre.slice(0,160),prix:String(Math.round(prix)),photos:photos.join('|')};
  const ogDesc=metaAll(headHtml,'og:description')[0]||metaAll(headHtml,'description')[0]||'';
  const long=longestText(html);o.description=(long.length>ogDesc.replace(/(\.{3}|…)$/,'').length?long:ogDesc).slice(0,6000);
  // 02/11/2026 (Cosmopolitan : texte des liens du pied de page « Vente appartements Nice / Maison à vendre… » pris pour la description) :
  // un paragraphe sous un titre « Description » appartient à la fiche ; s'il n'est pas déjà dans le texte retenu, c'est lui la description.
  {const dm=html.match(/<h[2-5]\b[^>]*>\s*(?:<[^>]+>\s*)*(?:Description|Descriptif)(?:\s+du\s+bien)?\s*(?:<\/[^>]+>\s*)*<\/h[2-5]>\s*((?:<p\b[^>]*>[\s\S]{0,6000}?<\/p>\s*){1,6})/i);
   if(dm){const d=clean(dm[1]);if(d.length>=40&&!o.description.includes(d.slice(0,40)))o.description=d.slice(0,6000);}}
  if(immo){
    const cityJ=jsonVal(region,['itemCity','addressLocality','city','ville','commune']);const cpJ=jsonVal(region,['itemZipcode','postalCode','zipcode','zipCode','codePostal','code_postal']);
    const zone=head+' \n'+nearTitle+' \n'+text.slice(0,4000);
    const bad=/kilom|prix|surface|ann[ée]e|t[ée]l|r[ée]f/i;
    // 29/10/2026 (Nestenn) : « 27390 » caché suivi de « Partager ce bien » pris pour une ville : on écarte les mots d'interface
    // et on préfère la ville qui figure aussi dans le titre.
    const ui=/partager|imprimer|envoyer|contact|favori|alerte|annonce|\bce bien\b|voir|rappel|visite|appeler|message|estimer|connexion|compte|menu|fermer|retour|suivant|pr[ée]c[ée]dent/i;
    const cands:{city:string,cp:string}[]=[];
    for(const m of zone.matchAll(/\b([A-ZÀ-Ý][A-Za-zÀ-ÿ' -]{2,40}?)\s*\((\d{5})\)/g))cands.push({city:m[1].trim(),cp:m[2]});
    for(const m of zone.matchAll(/\b(\d{5})\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'-]{2,30}(?:[ -][A-ZÀ-Ýa-zà-ÿ'-]{2,20}){0,3})/g))cands.push({city:m[2].split('\n')[0].trim(),cp:m[1]});
    const okC=cands.filter(c=>!ui.test(c.city)&&!bad.test(c.city));
    const nh=(x:string)=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]+/g,' ').trim();
    const inHead=okC.find(c=>nh(c.city).length>=3&&nh(head).includes(nh(c.city)));
    const pick=inHead||okC[0];
    let city=pick?.city||'',cp=pick?.cp||'';
    // 29/10/2026 (Anthony) : la ville du BIEN, pas celle de l'agence. Ordre : adresse de la fiche (« /le-cannet-06110/ »),
    // ville trouvée dans le titre, fin du titre (« …, Le Cannet »), données de la page, puis texte.
    const cap=(x:string)=>x.split(/([ -])/).map(w=>/^(de|du|des|la|le|les|sur|sous|en|aux?|lès|lez)$/i.test(w)&&x.indexOf(w)>0?w.toLowerCase():w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join('');
    const nzc=(x:string)=>x.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]+/g,'');
    // segment « ville-cp » de l'adresse ; s'il contient d'autres mots (« vente-maison-cannes-06400 »), on garde la fin qui est une ville connue de la page.
    const slug=(()=>{const m=decodeURIComponent(base.pathname).match(/\/([a-z][a-z'-]{1,80})-(\d{5})(?=\/|$|-[0-9a-f]{6,}|-ref)/i);if(!m)return null;
      const words=m[1].toLowerCase().split('-');const BADW=/^(annonce|annonces|vente|achat|location|louer|vendre|appartement|maison|villa|terrain|studio|duplex|loft|t\d|f\d|\d+|pieces?|chambres?|bien|immobilier|parking|local|bureau|commerce|programme|neuf)$/;
      if(!words.some(w=>BADW.test(w)))return[m[0],m[1],m[2]];
      const ref=nzc(titre+' '+okC.map(c=>c.city).join(' ')+' '+String(cityJ||''));
      for(let k=Math.min(5,words.length-1);k>=1;k--){const suf=words.slice(-k);if(suf.some(w=>BADW.test(w)))continue;const j=suf.join('');if(j.length>=3&&ref.includes(j))return[m[0],suf.join('-'),m[2]];}
      return null;})();
    const tail=(titre.split(/\s*[,–—|]\s*/).pop()||'').trim();
    const tailOk=/^[A-ZÀ-Ýa-zà-ÿ][A-Za-zÀ-ÿ' -]{1,40}$/.test(tail)&&!/\d|pi[eè]ce|chambre|vendre|louer|vente|location|appartement|maison|terrain|m²|t\d/i.test(tail)&&tail!==titre;
    let vCity='',vCp='';
    if(slug&&!/^(annonce|vente|location|achat|bien|detail|fiche|ref)$/i.test(slug[1])){vCity=cap(slug[1].replace(/-/g,' ')).replace(/ /g,'-');vCp=slug[2];
      // libellé exact s'il figure dans le titre (« Le Cannet », « Juan-les-Pins »)
      if(tailOk&&nzc(tail)===nzc(vCity))vCity=tail;else{const inT=okC.find(c=>nzc(c.city)===nzc(vCity));if(inT)vCity=inT.city;}}
    else if(inHead){vCity=inHead.city;vCp=inHead.cp;}
    else if(tailOk){const m=okC.find(c=>nzc(c.city)===nzc(tail));if(m){vCity=tail;vCp=m.cp;}}
    if(vCity){o.ville=vCity;if(vCp)o.code_postal=vCp;}
    else{
      if(cityJ&&!/^\d+$/.test(cityJ))o.ville=cityJ;else if(city&&!bad.test(city))o.ville=city.trim();
      if(cp&&o.ville&&(!cityJ||/^\d+$/.test(cityJ)))o.code_postal=cp;else if(/^\d{5}$/.test(cpJ))o.code_postal=cpJ;else if(cp&&o.ville)o.code_postal=cp;
    }
    const all=head+' '+base.pathname+' '+text.slice(0,4000);
    // Un prix de vente (≥ 20 000 €) l'emporte sur un « à louer » lu dans le texte (ex. immeuble de rapport avec local à louer).
    o.transaction=(rental&&!(prix>=20000))||/\b(louer|location|loyer|à louer|a-louer|par mois|\/mois|charges comprises)/i.test(head+' '+base.pathname)?'location':'vente';
    const kind=head+' '+base.pathname;
    const isHouse=/maison|villa|\bmas\b|(?<!co)propri[ée]t[ée]|chalet|bastide|long[èe]re|\bferme\b/i,isFlat=/appartement|studio|duplex|triplex|loft|penthouse/i;
    o.type_bien=isHouse.test(head)?'maison':isFlat.test(head)?'appartement':isHouse.test(kind)?'maison':isFlat.test(kind)||/\b[TF]\d\b/i.test(kind)?'appartement':/terrain/i.test(kind)?'terrain':/bureau|local|commerce|boutique|fonds|entrep[oô]t/i.test(kind)?'bureau':/\b[TF]-?\d\b|chambres?\b|pi[eè]ces?\b|\d\s*m(?:²|2)\b/i.test(head)&&!/^\s*(parking|garage|box)/i.test(head)?(/jardin|terrain|plain[- ]pied/i.test(head)?'maison':'appartement'):/parking|garage|\bbox\b|stationnement/i.test(kind)?'parking':'appartement';
    // 01/11/2026 (Laforêt) : l'adresse de la fiche dit le type (« /fonds-de-commerce-52742371 », « /local-commercial-… ») : prioritaire.
    {const pth=(()=>{try{return new URL(pageUrl).pathname.toLowerCase();}catch{return'';}})();if(/\/(?:fonds-de-commerce|local-commercial|locaux-commerciaux|bureaux?|murs-commerciaux|commerce)(?:[-/]|$)/.test(pth))o.type_bien='bureau';else if(/\/(?:parking|garage|box)(?:[-/]|$)/.test(pth))o.type_bien='parking';}
    const sm=all.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)(?![a-z0-9])/i);if(sm)o.surface=sm[1];
    const pm2=all.match(/(\d{1,2})\s*pi[eè]ces?/i)||all.match(/\b[TF](\d)\b/);if(pm2)o.pieces=pm2[1];else if(/studio/i.test(head))o.pieces='1';
    const c=all.match(/(\d{1,2})\s*chambres?/i);if(c)o.chambres=c[1];
    const sdb=text.match(/(\d)\s*salles? (?:de bains?|d['’]eau)/i);if(sdb)o.salles_de_bain=sdb[1];
    const land=text.match(/terrain[^0-9]{0,30}(\d[\d\s.]*)\s*m(?:²|2)(?![a-z0-9])/i);if(land&&o.type_bien!=='terrain')o.surface_terrain=land[1].replace(/\s/g,'');
    if(o.type_bien==='terrain'&&o.surface){o.surface_terrain=o.surface;delete o.surface;}
    const dpe=(text.match(/(?:DPE|classe\s+[ée]nerg[ée]?t?i?(?:que|e)|consommation\s+(?:d['’])?[ée]nergie)[^A-Za-z0-9]{0,25}(?:classe\s*:?\s*)?([A-G])\b/i)||html.match(/data-(?:dpe|energy|energie)[a-z-]*=["']([A-G])["']/i))?.[1];
    const ges=(text.match(/(?:\bGES\b|[ée]missions?\s+de\s+gaz[^A-Z]{0,20}|classe\s+climat)[^A-Za-z0-9]{0,25}(?:classe\s*:?\s*)?([A-G])\b/i)||html.match(/data-(?:ges|climat|emission)[a-z-]*=["']([A-G])["']/i))?.[1];
    if(dpe&&ges){o.dpe=dpe.toUpperCase();o.ges=ges.toUpperCase();}
    Object.assign(o,activeEnergyDiagnostics(html));
    // 29/10/2026 (L'Adresse…) : étiquette en image ou en classe CSS (« dpe dpe-c », /img/ges-c.png) ; retenue seulement si une seule lettre (pas une légende A→G).
    if(!o.dpe){const one=(re:RegExp)=>{const set=new Set([...html.matchAll(re)].map(m=>m[1].toUpperCase()));return set.size===1?[...set][0]:'';};
      const d2=one(/(?:class=["'][^"']*\b|\/)(?:dpe|etiquette[-_]?dpe|energie|dpe[-_]energie)[-_]([a-g])(?![a-z0-9])/gi),g2=one(/(?:class=["'][^"']*\b|\/)(?:ges|etiquette[-_]?ges|climat|dpe[-_]ges)[-_]([a-g])(?![a-z0-9])/gi);
      if(d2&&g2){o.dpe=d2;o.ges=g2;}
      const dd=text.match(/diagnostic\s*r[ée]alis[ée]\s*le\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(dd&&!o.date_dpe)o.date_dpe=`${dd[3]}-${dd[2]}-${dd[1]}`;}
    // 01/11/2026 (Anthony, Espaces Atypiques) : DPE dans un menu dépliant, écrit « b : 82 kWh/m².an » / « A : 3 kg CO2/m².an »,
    // ou barre choisie marquée « active » (<li class="classe-cep active" id="cep-b">).
    if(!o.dpe||!o.ges){
      const d3=text.match(/(?:^|[\s>(])([A-G])\s*:\s*\d[\d\s.,]*\s*kWh/i)?.[1]||html.match(/<[^>]+\bclass="[^"]*\b(?:active|selected|current)\b[^"]*"[^>]*\bid="(?:cep|dpe|energie|energy)[-_]([a-g])"|<[^>]+\bid="(?:cep|dpe|energie|energy)[-_]([a-g])"[^>]*\bclass="[^"]*\b(?:active|selected|current)\b/i)?.slice(1).find(Boolean);
      const g3=text.match(/(?:^|[\s>(])([A-G])\s*:\s*\d[\d\s.,]*\s*kg\s*(?:[ée]q\.?\s*)?CO\s*2/i)?.[1]||html.match(/<[^>]+\bclass="[^"]*\b(?:active|selected|current)\b[^"]*"[^>]*\bid="(?:e?ges|climat|co2)[-_]([a-g])"|<[^>]+\bid="(?:e?ges|climat|co2)[-_]([a-g])"[^>]*\bclass="[^"]*\b(?:active|selected|current)\b/i)?.slice(1).find(Boolean);
      if(!o.dpe&&d3)o.dpe=d3.toUpperCase();if(!o.ges&&g3)o.ges=g3.toUpperCase();
    }
    // 01/11/2026 (contrôle automatique, Activimmo) : lettre écrite après la valeur : « 199 kWhep/m²an D », « 8 KgCO²/m²an B ».
    if(!o.dpe||!o.ges){
      // une seule lettre sur toute la page (jamais une légende A→G)
      const uniq=(re:RegExp)=>{const set=new Set([...text.matchAll(re)].map(m=>m[1].toUpperCase()));return set.size===1?[...set][0]:'';};
      const d5=uniq(/\d[\d\s.,]*\s*kWh\s*(?:ep|EP|e\.p\.)?\s*\/\s*m(?:²|2)\s*[./]?\s*an\.?\s*:?\s*\(?([A-G])\)?(?![a-zà-ü])/gi);
      const g5=uniq(/\d[\d\s.,]*\s*kg\s*(?:[ée]q\.?\s*)?CO\s*(?:2|²)\s*\/\s*m(?:²|2)\s*[./]?\s*an\.?\s*:?\s*\(?([A-G])\)?(?![a-zà-ü])/gi);
      if(!o.dpe&&d5)o.dpe=d5;if(!o.ges&&g5)o.ges=g5.toUpperCase();
    }
    // 01/11/2026 (contrôle automatique) : classe donnée en attribut : data-current-class (diagPreview--pe / --ges),
    // data-energetic-class, data-dpe="201;d" / data-ges="42;d" (étiquette Jalis).
    if(!o.dpe||!o.ges){
      const dA=region.match(/diagPreview--(?:pe|dpe|energy)"[^>]*?data-current-class="([A-G])"/i)?.[1]||region.match(/data-energetic-class="([A-G])"/i)?.[1]||region.match(/data-dpe="\d[\d.,]*;([a-g])"/i)?.[1];
      const gA=region.match(/diagPreview--ges"[^>]*?data-current-class="([A-G])"/i)?.[1]||region.match(/data-ges="\d[\d.,]*;([a-g])"/i)?.[1];
      if(!o.dpe&&dA)o.dpe=dA.toUpperCase();if(!o.ges&&gA)o.ges=gA.toUpperCase();
    }
    // 02/11/2026 (Anthony, Dolce Immo « DPE pas lu ») : étiquette Jalis sans lettre : data-dpe="102;non renseigné" data-ges="24;non renseigné".
    // Classe calculée avec les seuils du DPE 2021 ; la classe énergie retenue est la moins bonne des deux (règle du DPE 2021).
    if(!o.dpe||!o.ges){
      const vD=region.match(/data-dpe="(\d{1,4})(?:[.,]\d+)?;[^"]*"/i)?.[1],vG=region.match(/data-ges="(\d{1,4})(?:[.,]\d+)?;[^"]*"/i)?.[1];
      const at=(v:number,t:number[])=>{const i=t.findIndex(x=>v<=x);return i<0?6:i;};
      if(vD||vG){const iE=vD?at(Number(vD),[70,110,180,250,330,420]):-1,iG=vG?at(Number(vG),[6,10,29,49,69,99]):-1;
        if(!o.ges&&iG>=0)o.ges='ABCDEFG'[iG];if(!o.dpe&&iE>=0)o.dpe='ABCDEFG'[Math.max(iE,iG)];}
    }
    // 02/11/2026 (Cosmopolitan, ancien modèle de site) : flèche « flecheDPE.png » / « flecheGES.png » portant la valeur du bien
    // (<img src="…/flecheDPE.png"…><span…>197</span>) : classe déduite avec les seuils du DPE 2021 (la moins bonne des deux).
    if(!o.dpe||!o.ges){
      const vD=rawHtml.match(/fl[eè]che_?(?:DPE|energie|conso)[^"']*\.(?:png|gif|jpe?g)["'][^>]*>\s*<span[^>]*>\s*(\d{1,4})\s*</i)?.[1],vG=rawHtml.match(/fl[eè]che_?(?:GES|climat|co2)[^"']*\.(?:png|gif|jpe?g)["'][^>]*>\s*<span[^>]*>\s*(\d{1,4})\s*</i)?.[1];
      const at=(v:number,t:number[])=>{const i=t.findIndex(x=>v<=x);return i<0?6:i;};
      if(vD||vG){const iE=vD?at(Number(vD),[70,110,180,250,330,420]):-1,iG=vG?at(Number(vG),[6,10,29,49,69,99]):-1;
        if(!o.ges&&iG>=0)o.ges='ABCDEFG'[iG];if(!o.dpe&&iE>=0)o.dpe='ABCDEFG'[Math.max(iE,iG)];if(vD&&!o.consommation_energie)o.consommation_energie=vD;}
    }
    // 02/11/2026 (Crefimo / Adapt'immo) : étiquettes « outil.adaptimmo.com/dpe/image/…_nrj_…?consommation=281 » et « …_ges_…?consommation=65 ».
    // DPE d'avant juillet 2021 (prix des énergies « indexés au 15/08/2015 ») : anciens seuils, classe énergie seule ; sinon seuils 2021, la moins bonne des deux.
    if(!o.dpe||!o.ges){
      const vD=rawHtml.match(/\/dpe\/image\/[^"']*?_nrj_[^"']*?[?&]consommation=(\d{1,4})/i)?.[1],vG=rawHtml.match(/\/dpe\/image\/[^"']*?_ges_[^"']*?[?&]consommation=(\d{1,4})/i)?.[1];
      if(vD||vG){const old=/index[ée]e?s? au [0-9\/ ]*20(?:0\d|1\d|20)\b/i.test(text);const at=(v:number,t:number[])=>{const i=t.findIndex(x=>v<=x);return i<0?6:i;};
        const iE=vD?at(Number(vD),old?[50,90,150,230,330,450]:[70,110,180,250,330,420]):-1,iG=vG?at(Number(vG),old?[5,10,20,35,55,80]:[6,10,29,49,69,99]):-1;
        if(!o.ges&&iG>=0)o.ges='ABCDEFG'[iG];if(!o.dpe&&iE>=0)o.dpe='ABCDEFG'[old?iE:Math.max(iE,iG)];if(vD&&!o.consommation_energie)o.consommation_energie=vD;}
    }
    // 01/11/2026 (contrôle automatique, Calliope) : échelle A→G avec un curseur portant la valeur du bien
    // (<div class="dpe_target">…123</div>) : classe déduite de la valeur avec les seuils du DPE 2021.
    if(!o.dpe||!o.ges){
      const kwh=region.match(/class="dpe_target"[^>]*>[\s\S]{0,120}?<\/span>\s*(\d{1,4})\s*</)?.[1];
      const co2=region.match(/class="ges_target"[^>]*>[\s\S]{0,120}?<\/span>\s*(\d{1,4})\s*</)?.[1];
      const cls=(v:number,t:number[])=>'ABCDEFG'[t.findIndex(x=>v<=x)<0?6:t.findIndex(x=>v<=x)];
      if(!o.ges&&co2)o.ges=cls(Number(co2),[6,10,29,49,69,99]);
      if(!o.dpe&&kwh){const e=cls(Number(kwh),[70,110,180,250,330,420]);o.dpe=co2&&o.ges>e?o.ges:e;}
    }
    // 01/11/2026 (contrôle automatique) : image d'étiquette nommée par sa lettre « dpeV2-D.jpg » / « gesV2-B.jpg » (Cassis),
    // et lettre écrite dans le texte « DPE en B », « DPE : C » (Valmo) — une seule lettre sur la page.
    if(!o.dpe||!o.ges){
      const uq=(src:string,re:RegExp)=>{const set=new Set([...src.matchAll(re)].map(m=>m[1].toUpperCase()));return set.size===1?[...set][0]:'';};
      const d6=uq(region,/[\/_-](?:dpe|cep|energie)(?:v\d)?[-_]([a-g])\.(?:jpe?g|png|gif|svg|webp)\b/gi)||uq(text,/\bDPE\s*(?:en|:|=|classe)\s*([A-G])\b(?![\s]*(?:à|a|-|–)\s*[A-G]\b)/gi);
      const g6=uq(region,/[\/_-](?:ges|climat|co2)(?:v\d)?[-_]([a-g])\.(?:jpe?g|png|gif|svg|webp)\b/gi)||uq(text,/\bGES\s*(?:en|:|=|classe)\s*([A-G])\b(?![\s]*(?:à|a|-|–)\s*[A-G]\b)/gi);
      if(!o.dpe&&d6)o.dpe=d6;if(!o.ges&&g6)o.ges=g6;
    }
    // 02/11/2026 (Anthony, Valloire Habitat « DPE pas lu ») : étiquette dessinée par script : dpe.dpe({domId:'dpe', value:'D'}),
    // script parfois encodé (src="data:text/javascript;base64,…").
    if(!o.dpe||!o.ges){
      let js=region;for(const m of region.matchAll(/src=["']data:text\/javascript;base64,([A-Za-z0-9+\/=]{20,6000})["']/g)){try{js+='\n'+atob(m[1]);}catch{}}
      const dJ=js.match(/\.(?:dpe|cep|energie)\s*\(\s*\{[^}]{0,300}?value\s*:\s*['"]([A-G])['"]/i)?.[1];
      const gJ=js.match(/\.(?:ges|climat|co2)\s*\(\s*\{[^}]{0,300}?value\s*:\s*['"]([A-G])['"]/i)?.[1];
      if(!o.dpe&&dJ)o.dpe=dJ.toUpperCase();if(!o.ges&&gJ)o.ges=gJ.toUpperCase();
    }
    // 01/11/2026 (Anthony : « toujours énormément de DPE pas lus ») : étiquettes dessinées dans la page (SVG) :
    // <g id="GES_E"> / <g id="DPE_C"> (La Résidence), <g id="EnergieC"> / <g id="GesC"> (La Française), conteneur « diagnosticShortened dpeE », La Boîte Immo (extension wp-dpe-ges) « diagnostic-diagram numberC » / « emission-diagram numberB ».
    if(!o.dpe||!o.ges){
      const one=(re:RegExp)=>{const set=new Set([...region.matchAll(re)].map(m=>m[1].toUpperCase()));return set.size===1?[...set][0]:'';};
      const d4=one(/<g\s+id="(?:DPE|Dpe|Energie|ENERGIE|Cep|CEP)[_-]?([A-G])"/g)||one(/class="[^"]*\bdiagnosticShortened\s+dpe([A-G])\b/g)||one(/class="diagnostic-(?:scale|diagram)\s+number([A-G])"/g);
      const g4=one(/<g\s+id="(?:GES|Ges|Eges|EGES|Climat)[_-]?([A-G])"/g)||one(/class="[^"]*\bdiagnosticShortened\s+ges([A-G])\b/g)||one(/class="emission-(?:scale|diagram)\s+number([A-G])"/g);
      if(!o.dpe&&d4)o.dpe=d4;if(!o.ges&&g4)o.ges=g4;
    }
    // 01/11/2026 (Anthony, Cimm) : « dépenses annuelles d'énergie … : entre 2580€ et 3570€ » écrit sur plusieurs lignes.
    // 01/11/2026 (Anthony) : « 670.00 € » / « 1 580,50 € » → centimes retirés (avant : 670.00 lu 67000).
    if(!o.cout_energie_min){const flat=text.replace(/\s+/g,' ');const ec=flat.match(/d[ée]penses?[^€]{0,220}?entre\s*(\d[\d\s.,]*)\s*(?:€|euros?)\s*et\s*(\d[\d\s.,]*)\s*(?:€|euros?)/i);
      const eur=(v:string)=>v.replace(/\s/g,'').replace(/[.,]\d{1,2}$/,'').replace(/[.,]/g,'');
      if(ec){const a=eur(ec[1]),b=eur(ec[2]);if(Number(a)>0&&Number(a)<20000&&Number(b)>=Number(a)&&Number(b)<30000){o.cout_energie_min=a;o.cout_energie_max=b;}}}
    // 01/11/2026 (Anthony, Cimm) : 7 pastilles A→G dont celle du bien est plus grande (style="width: 40px" contre 25px).
    if(!o.dpe||!o.ges){
      const dots=[...html.matchAll(/<(?:div|span|li)\b[^>]*style="[^"]*\bwidth:\s*(\d+(?:\.\d+)?)px[^"]*"[^>]*>\s*([A-G])\s*<\//g)].map(m=>({w:Number(m[1]),k:m[2]}));
      const scales:string[]=[];
      for(let i=0;i+7<=dots.length;){
        const win=dots.slice(i,i+7);
        if(win.map(d=>d.k).join('')!=='ABCDEFG'){i++;continue;}
        const max=Math.max(...win.map(d=>d.w)),big=win.filter(d=>d.w===max),rest=win.filter(d=>d.w!==max);
        if(big.length===1&&rest.length===6&&max>=Math.max(...rest.map(d=>d.w))*1.2)scales.push(big[0].k);
        i+=7;
      }
      if(scales.length){if(!o.dpe)o.dpe=scales[0];if(!o.ges&&scales[1])o.ges=scales[1];}
    }
    // 01/11/2026 (Anthony) : DPE / GES affichés seulement en image → adresses notées, lues ensuite (energy-image.ts).
    if(!o.dpe||!o.ges){const im=energyImageUrls(rawHtml,pageUrl);if(!o.dpe&&im.dpe)o.dpe_image=im.dpe;if(!o.ges&&im.ges)o.ges_image=im.ges;}
    const hon=text.match(/honoraires(?:[^.\n]|\.(?=\d)){0,140}/i);if(hon&&/\d|charge/i.test(hon[0]))o.honoraires=hon[0].replace(/\s+/g,' ').trim();
    // Lignes de faits (charges, taxe, lots, copropriété, procédure, dépôt, mandat…) gardées pour la lecture des champs, hors description.
    o.texte_page=text.split('\n').filter(l=>l.length<=220&&/charges|taxe|lots?\b|copropri|proc[ée]dure|honoraires|mandat|d[ée]penses|[ée]nergie|DPE|GES|d[ée]p[ôo]t|loyer|meubl|carrez|chauffage|[ée]tage|ascenseur|construction/i.test(l)).slice(0,120).join('\n').slice(0,8000);
    if(!(o.surface||o.pieces||o.chambres||o.surface_terrain))return null;
  }else{
    /* 02/11/2026 (complexeautomobile, thème WordPress Motors) : les caractéristiques sont après un long menu → texte autour du titre aussi */const tH=h1?text.indexOf(h1.slice(0,40)):-1;const all=head+' \n'+text.slice(0,6000)+(tH>6000?' \n'+text.slice(tH,tH+12000):'');
    const km=all.match(/kilom[ée]trage[^0-9]{0,25}(\d{1,3}(?:[\s.\u00a0]\d{3})+|\d{1,6})/i)||all.match(/(?<![\p{L}\d][\s\u00a0.]?)(\d{1,3}(?:[\s.\u00a0]\d{3})+|\d{1,6})\s*km\b/iu);
    if(km)o.kilometrage=km[1].replace(/[\s.\u00a0]/g,'');
    const y=all.match(/(?:ann[ée]e|mise en (?:circulation|service)|\bMEC\b|1[èe]re immatriculation|immatricul[ée]e? le|date d'immatriculation|mod[èe]le)[^0-9]{0,30}(?:\d{1,2}[\/.\-]){0,2}((?:19[5-9]|20[0-3])\d)\b/i)||all.match(/(?:mise en circulation|immatricul\w*|\bMEC\b)[^0-9]{0,30}((?:19[5-9]|20[0-3])\d)-\d{2}-\d{2}/i)||head.match(/\b((?:19[5-9]|20[0-3])\d)\b/);if(y)o.annee=y[1];/* « Année 2 010 » */if(!o.annee){const y2=all.match(/ann[ée]e[^0-9]{0,30}(19|20)[\s\u00a0](\d{2})\b/i);if(y2&&Number(y2[1]+y2[2])>=1950&&Number(y2[1]+y2[2])<=2039)o.annee=y2[1]+y2[2];}
    // 30/10/2026 : énergie et boîte lues d'abord sur leur libellé (« Carburant : Essence », « Boîte : Manuelle »), puis dans le titre.
    // Plus de recherche à l'aveugle dans toute la page : « rétroviseurs électriques » donnait « électrique »,
    // « climatisation automatique » donnait « automatique » (ex. Ford Fiesta essence manuelle).
    const fuelLab=all.match(/(?:carburant|[ée]nergie|motorisation|type de moteur)\s*:?\s*(hybride rechargeable|plug-?in|hybride|[ée]lectrique|diesel|gazole|essence|gpl|[ée]thanol|e85)/i)?.[1]||'';
    const fuelSrc=fuelLab||head;
    for(const [re,v] of FUEL)if(re.test(fuelSrc)){o.carburant=v;break;}
    if(!o.carburant){const safe=all.replace(/[^.\n]{0,40}[ée]lectriques?\b/gi,m=>/100\s*%\s*[ée]lectrique|(?:voiture|v[ée]hicule|moteur|motorisation|citadine|berline|suv)\s+[ée]lectrique/i.test(m)?m:' ');for(const [re,v] of FUEL)if(re.test(safe)){o.carburant=v;break;}}
    const gearLab=all.match(/(?:bo[iî]te(?:\s+de\s+vitesses?)?|transmission)\s*:?\s*(automatique|auto\b|manuelle|m[ée]canique|robotis[ée]e|s[ée]quentielle)/i)?.[1]||'';
    const gearHead=/automatique|\bBVA\d?\b|\bDSG\d?\b|\bEAT\d\b|\bEDC\b|\bS[- ]?tronic\b|\bPDK\b/i.test(head)?'automatique':/manuelle|\bBVM\d?\b/i.test(head)?'manuelle':'';
    if(gearLab)o.boite=/manuelle|m[ée]canique/i.test(gearLab)?'manuelle':'automatique';else if(gearHead)o.boite=gearHead;
    else{const safe=all.replace(/(?:climatisation|clim|allumage|essuie[- ]?glaces?|feux|phares|projecteurs|frein(?:\s+de\s+stationnement)?|fermeture|verrouillage|d[ée]tection|r[ée]troviseurs?|vitres?|r[ée]gulat\w*|hayon|coffre|stationnement|parking|bi[- ]?zone|r[ée]glage|capote)[^.\n]{0,30}?automatiques?/gi,' ');
      if(/bo[iî]te\s*(?:de vitesses?\s*)?auto|\bboite automatique\b|\bBVA\b|\bDSG\b|\bEAT\d/i.test(safe))o.boite='automatique';else if(/bo[iî]te\s*(?:de vitesses?\s*)?manuelle|\bBVM\b|\bboite m[ée]canique/i.test(safe))o.boite='manuelle';}
    const ch=all.match(/(\d{2,4})\s*(?:ch|cv din)\b/i);if(ch)o.puissance_din=ch[1];
    const make=head.trim().split(/\s+/)[0];if(make&&/^[A-Za-zÀ-ÿ-]{2,}$/.test(make)&&!/^(vente|achat|occasion|voiture|v[ée]hicule|annonce)$/i.test(make))o.marque=make;
    o.etat=/\bneuf\b|\b0\s*km\b/i.test(head)?'neuf':'occasion';
    o.type=/\b(moto|scooter|quad|motocross|enduro|roadster|trail)\b/i.test(head+' '+base.pathname)?'moto':/\b(camping[- ]car|caravane|van am[ée]nag)/i.test(head)?'camping-car':/\b(fourgon|utilitaire|plateau|benne|L\dH\d|master|trafic|jumper|boxer|ducato|sprinter|transit)\b/i.test(head)?'utilitaire':'voiture';
    if(!(o.kilometrage||o.annee))return null;
  }
  if(immo&&/^(?:www\.)?lfimmo\.fr$/.test(base.hostname)&&/^\/annonces\/\d+-/.test(base.pathname)){
    o.reference=base.pathname.match(/^\/annonces\/(\d+)-/)![1];
    const ownDescription=rawHtml.match(/<p\b[^>]*data-read-more-target="content"[^>]*>([\s\S]*?)<\/p>/i)?.[1];if(ownDescription)o.description=clean(ownDescription).slice(0,6000);
    const location=rawHtml.slice(Math.max(0,h1At-1800),h1At).match(/data-bs-title="Toutes nos annonces à ([^"<>]+),\s*(\d{5})"/i);
    delete o.ville;delete o.code_postal;
    if(location){o.ville=sDecode(location[1]);o.code_postal=location[2];}
    const gallery=[...rawHtml.matchAll(/<a\b([^>]+)>/gi)].filter(m=>/data-gallery="diaporama"/.test(m[1])).map(m=>m[1].match(/href="([^"<>]+)"/)?.[1]).filter((x):x is string=>!!x&&/^https?:/.test(x));
    o.photos=[...new Set(gallery.map(sDecode))].join('|');
    const advisor=metaAll(headHtml,'product:retailer_title')[0];if(advisor)o.contact_nom=advisor;
    const ownContact=rawHtml.match(/<form\b[^>]*id="[^"<>]*public_contact[^"<>]*"[^>]*>([\s\S]*?)<\/form>/i)?.[1]||'';
    const phone=ownContact.match(/href="tel:([^"<>]+)"/i)?.[1];if(phone&&advisor)o.contact_telephone=phone;
  }
  if(base.hostname.replace(/^www\./,'')==='msmotors.fr'){
    o.titre=h1;
    const ownPrice=clean(rawHtml.match(/<span class="price">([\s\S]*?)<\/span>/)?.[1]||'').replace(/[^0-9]/g,'');if(ownPrice)o.prix=ownPrice;else delete o.prix;
    const keys:Record<string,string>={'Nombre de kilomètre':'kilometrage','Carburant':'carburant','Boite de vitesse':'boite','Année':'annee','Extérieur':'couleur','Intérieur':'sellerie','Puissance':'puissance_din'};
    for(const m of rawHtml.matchAll(/<p>([^<]+)<\/p>\s*<span class="value">([^<]*)<\/span>/g)){const k=keys[clean(m[1])];if(k&&clean(m[2]))o[k]=clean(m[2]);}
    const options=rawHtml.split('id="optionsContainer"')[1]?.split(/<div\b[^>]*id="(?:videosContainer|informationsRequestContainer)"/)[0];if(options)o.description=clean(options.replace(/^[^>]*>/,''));
  }
  // 01/11/2026 (Anthony : « je peux pas vérifier chaque annonce ») : contrôle automatique. DPE non trouvé alors que la page en parle
  // (« classe énergie », « diagnostic de performance », kWh/m²…) → noté pour le test de site (« DPE présent mais pas lu »).
  if(immo&&!o.dpe&&!/non soumis|dpe vierge|non requis|non concern|non communiqu|non renseign|en cours/i.test(text)){const m=text.match(/(?:classe\s*(?:[ée]nergie|[ée]nerg[ée]tique|energy)|diagnostic\s*de\s*performance|performance\s*[ée]nerg[ée]tique|\bDPE\b|kWh\s*(?:ep|EP)?\s*\/\s*m)[^\n]{0,60}/i);if(m)o._dpe_hint=m[0].slice(0,90);}
  return o;
}

// Parcours : accueil + pages de liste, puis fiches détectées. Budget en temps et en pages.
export const smartHooks:{trace:(url:string,step:string)=>void}={trace:()=>{}};
export async function readSmartSite(origin:URL,homeHtml:string,sector:string,fetchHtml:Fetcher,extraStarts:string[]=[],ldParse?:(html:string,url:string)=>any,memory?:CrawlMemory){
  // 02/11/2026 (monagenceautomobile « /acheter-un-vehicule/?agencie=54 ») : liste d'une agence filtrée par un paramètre → seules les pages
  // de liste qui gardent ce paramètre sont suivies (sinon le robot part sur tout le réseau).
  const qKeep:string[]=[];try{if(extraStarts[0])for(const [k,v] of new URL(extraStarts[0]).searchParams)if(/agenc|agency|store|site_id|garage|concession|magasin/i.test(k)&&v)qKeep.push(k+'='+v);}catch{}
  const qOk=(u:string)=>!qKeep.length||(()=>{try{const sp=new URL(u).searchParams;return qKeep.every(x=>{const [k,v]=x.split('=');return sp.get(k)===v;});}catch{return false;}})();
  if(memory){
    // 02/11/2026 (groupe 123 immo : « /agences/auxerre-centre/1 ») : le numéro de page final ne fait pas partie du périmètre de l'agence.
    const host=origin.hostname.replace(/^www\./,''),scope=extraStarts[0]?new URL(extraStarts[0]).pathname.replace(/\/+$/,'').replace(/\/\d{1,3}$/,''):'';
    const inScope=(u:string)=>!scope||scope.split('/').length<3||new URL(u).pathname.startsWith(scope+'/')||new URL(u).pathname===scope;
    const source=extraStarts[0]||origin.toString();
    smartHooks.trace(source,'smart memory scope='+scope+' len='+homeHtml.length);
    return crawlCatalogue(source,'smart-v1:'+sector+':'+scope,[source],async u=>u.toString()===source?{text:homeHtml,url:u}:fetchHtml(u),(html,page)=>{
      let xmlLists:string[]=[];const isMap=/<urlset\b|<sitemapindex\b/i.test(html);
      if(isMap){const urls=[...html.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>sDecode(m[1]));xmlLists=urls.filter(u=>/\.xml(?:\?|$)/.test(u));html=urls.filter(u=>!xmlLists.includes(u)).map(u=>`<a href="${u.replace(/"/g,'&quot;')}">`).join('');}
      const found=smartLinks(html,page,host);
      if(page.toString()===source&&found.details.length<5&&!scope)xmlLists.push(new URL('/sitemap.xml',origin).toString());
      const same=(u:string)=>{try{return new URL(u).hostname.replace(/^www\./,'')===host;}catch{return false;}};
      // Fiches liées depuis une page de l'agence elle-même (ex. /agences/auxerre-centre/2 → /vente/2-auxerre/…) : ce sont ses biens,
      // même si leur adresse n'est pas sous celle de l'agence. Ailleurs, seules les fiches sous le chemin de l'agence sont gardées.
      const ownPage=!!scope&&!isMap&&inScope(page.toString());
      /* 02/11/2026 (Cimalpes) : si la page de l'agence a ses propres fiches sous son chemin, les autres liens sont le menu du réseau (autres stations) */const own3=ownPage&&found.details.filter(u=>same(u)&&inScope(u)).length<3;
      return {lists:[...found.lists.filter(inScope).filter(qOk),...xmlLists].filter(same),details:found.details.filter(u=>same(u)&&(own3||inScope(u)))};
    },async(html,url)=>{
      let row:any=null;if(ldParse)row=ldParse(html,url);if(row?._sold)return row;
      const sd=smartDetail(html,url,sector);if(row&&!sd&&String(row.photos||'').split('|').filter(Boolean).length<=3){const ph=smartPhotos(html,url);if(ph.length>String(row.photos||'').split('|').filter(Boolean).length)row.photos=ph.join('|');}if(!row)row=sd;else if(sd){/* 01/11/2026 (Anthony, BH Car : photos d'autres véhicules ajoutées à la fin) : la liste des données structurées est celle du véhicule ; les photos de la page (qui comprennent les « véhicules similaires ») ne servent que si elle en a 3 ou moins. */if(String(row.photos||'').split('|').filter(Boolean).length<=3&&String(sd.photos||'').split('|').length>String(row.photos||'').split('|').length)row.photos=sd.photos;for(const k of Object.keys(sd))if(row[k]==null||row[k]==='')row[k]=sd[k];if(String(sd.description||'').length>String(row.description||'').length*1.5)row.description=sd.description;}
      if(!row)throw Error('Fiche non reconnue');return row;
    },memory);
  }
  const t0=Date.now();const host=origin.hostname.replace(/^www\./,'');
  const seenPages=new Set<string>();const detailQ:string[]=[];const listQ:string[]=[];const rows:any[]=[];const refs=new Set<string>();
  const fromOwn=new Set<string>();const scope0=extraStarts[0]?new URL(extraStarts[0]).pathname.replace(/\/+$/,'').replace(/\/\d{1,3}$/,''):'';
  const take=(html:string,page:URL,own=false)=>{const {details,lists}=smartLinks(html,page,host);/* 02/11/2026 (Cimalpes) : page d'agence avec ses fiches sous son chemin → le reste est le menu du réseau */if(own&&scope0&&details.filter(d=>{try{return new URL(d).pathname.startsWith(scope0+'/');}catch{return false;}}).length>=3)own=false;for(const d of details){if(own)fromOwn.add(d);if(!seenPages.has(d)&&!detailQ.includes(d))detailQ.push(d);}for(const l of lists)if(qOk(l)&&!seenPages.has(l)&&!listQ.includes(l)&&listQ.length<60)listQ.push(l);};
  take(homeHtml,origin,true);seenPages.add(origin.toString());smartHooks.trace(origin.toString(),'smart home len='+homeHtml.length+' details='+detailQ.length+' lists='+listQ.length+' memory=0');
  for(const s of extraStarts)if(!listQ.includes(s))listQ.unshift(s);
  let pages=0;let misses=0;
  // Adresse d'une agence dans un réseau (ex. /agence-immobiliere/cannes) : on reste sous ce chemin.
  const scope=extraStarts[0]?new URL(extraStarts[0]).pathname.replace(/\/+$/,'').replace(/\/\d{1,3}$/,''):'';
  const inScope=(u:string)=>!scope||scope.split('/').length<3||new URL(u).pathname.startsWith(scope);
  // Listes d'abord (pour trouver les fiches), en parallèle limité.
  let lists=0;
  while(listQ.length&&lists<20&&Date.now()-t0<20000&&cpuLeft()){
    const batch=listQ.splice(0,4).filter(u=>!seenPages.has(u)&&inScope(u));batch.forEach(u=>seenPages.add(u));pages+=batch.length;lists+=batch.length;
    await Promise.all(batch.map(async u=>{try{const{text,url}=await fetchHtml(new URL(u));take(text.length>700000?text.slice(0,700000):text,url,true);}catch{}}));
  }
  if(scope&&scope.split('/').length>=3){const keep=detailQ.filter(u=>inScope(u)||fromOwn.has(u));detailQ.length=0;detailQ.push(...keep);}
  // Listes chargées en JavaScript : les fiches sont souvent dans le plan du site (sitemap).
  if(detailQ.length<5){
    const maps=[new URL('/sitemap.xml',origin).toString()];
    try{const{text}=await fetchHtml(new URL('/robots.txt',origin));for(const m of text.matchAll(/^sitemap:\s*(\S+)/gim))maps.unshift(m[1]);}catch{}
    const seenMaps=new Set<string>();const fromMaps:string[]=[];
    for(let k=0;k<maps.length&&seenMaps.size<10&&Date.now()-t0<25000;k++){const sm=maps[k];if(seenMaps.has(sm))continue;seenMaps.add(sm);
      try{const{text}=await fetchHtml(new URL(sm));for(const m of text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)){const loc=sDecode(m[1]);if(/\.xml(\?|$)/i.test(loc)){if(!/(post|page|categor|tag|author|blog|actualit|news)/i.test(loc))maps.push(loc);}else fromMaps.push(loc);}}catch{}}
    const fake=fromMaps.slice(0,5000).map(u=>`<a href="${u.replace(/"/g,'&quot;')}">`).join('');take(fake,origin);
    if(scope&&scope.split('/').length>=3){const keep=detailQ.filter(u=>inScope(u)||fromOwn.has(u));detailQ.length=0;detailQ.push(...keep);}
  }
  let i=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(i<detailQ.length&&pages<400&&Date.now()-t0<50000&&cpuLeft()){
      const u=detailQ[i++];if(seenPages.has(u))continue;seenPages.add(u);pages++;
      try{const{text,url}=await fetchHtml(new URL(u));let o:any=null;if(ldParse){try{o=ldParse(text,url.toString());}catch{o=null;}if(o?._sold){misses++;continue;}}if(!o)o=smartDetail(text,url.toString(),sector);
        // Données structurées souvent incomplètes (1 photo, pas de description) : on complète avec la lecture de la page.
        else{const sd=smartDetail(text,url.toString(),sector);if(!sd&&String(o.photos||'').split('|').filter(Boolean).length<=3){const ph=smartPhotos(text,url.toString());if(ph.length>String(o.photos||'').split('|').filter(Boolean).length)o.photos=ph.join('|');}if(sd){const n=(x:any)=>String(x||'').split('|').filter(Boolean).length;if(n(o.photos)<=3&&n(sd.photos)>n(o.photos))o.photos=sd.photos;/* 02/11/2026 (groupe 123 immo) : mêmes fichiers que la page mais à une autre adresse → celles de la page (affichées par le site, donc valides) */else{const bn=(u:string)=>u.split('?')[0].split('/').pop()||'';const a=String(o.photos||'').split('|').filter(Boolean),b=String(sd.photos||'').split('|').filter(Boolean);if(a.length&&b.length>=a.length&&a.every(u=>b.some(w=>bn(w)===bn(u)))&&a.some(u=>!b.includes(u)))o.photos=b.join('|');}for(const k of Object.keys(sd))if(o[k]==null||o[k]==='')o[k]=sd[k];if(String(sd.description||'').length>String(o.description||'').length*1.5)o.description=sd.description;}}
        if(o?._sold)continue;
        if(o&&!refs.has(o.reference)){refs.add(o.reference);rows.push(o);}else if(!o)misses++;
        // Une fiche peut mener à d'autres fiches (« biens similaires », pagination).
        if(detailQ.length<40&&text.length<400000)take(text,url);
      }catch{misses++;}
    }}));
  (rows as any).partial=i<detailQ.length;
  (rows as any).stats={pages,details:detailQ.length,read:rows.length,misses,ms:Date.now()-t0};
  return rows;
}
