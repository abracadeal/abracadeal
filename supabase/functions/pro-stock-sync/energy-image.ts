// 01/11/2026 — Claude (Anthony : « les DPE en images, il faut entraîner le robot à les lire »).
// Beaucoup de sites (La Boîte Immo, Adaptimmo…) n'écrivent pas la classe DPE / GES : ils l'affichent en image.
// L'étiquette officielle (modèle 2021) est une échelle de 7 barres A→G ; la classe du bien est la barre nettement
// plus haute que les autres (encadrée de noir). On mesure les barres ligne par ligne :
//  - une ligne « de barre » contient une longue suite de pixels non blancs (le texte est trop fin) ;
//  - on regroupe les lignes en bandes et on cherche 7 bandes de suite, de longueur croissante (sinon ce n'est pas une échelle) ;
//  - la bande la plus haute, au moins 1,3 × les autres, donne la lettre.
// Dans le doute on ne renvoie rien : jamais de classe inventée.
import { cpu, CPU_BUDGET_MS } from './cpu-meter.ts';
import jpeg from 'npm:jpeg-js@0.4.4';
import { decode as decodePng } from 'npm:fast-png@6.2.0';

type Img={width:number,height:number,data:Uint8Array|Uint8ClampedArray,channels:number};
function decodeImage(b:Uint8Array):Img|null{
  try{
    if(b[0]===0xFF&&b[1]===0xD8){const r=jpeg.decode(b,{useTArray:true,maxMemoryUsageInMB:64});return{width:r.width,height:r.height,data:r.data,channels:4};}
    if(b[0]===0x89&&b[1]===0x50){const r:any=decodePng(b);const ch=r.channels||(r.data.length/(r.width*r.height));let data=r.data;if(r.depth===16){const d=new Uint8Array(r.width*r.height*ch);for(let i=0;i<d.length;i++)d[i]=r.data[i]>>8;data=d;}if(r.palette){const d=new Uint8Array(r.width*r.height*4);for(let i=0;i<r.width*r.height;i++){const p=r.palette[data[i]]||[255,255,255];d[i*4]=p[0];d[i*4+1]=p[1];d[i*4+2]=p[2];d[i*4+3]=p[3]??255;}return{width:r.width,height:r.height,data:d,channels:4};}return{width:r.width,height:r.height,data,channels:ch};}
  }catch{}
  return null;
}
export function energyClassFromPixels(img:Img,x0=0,x1=img.width):string|null{
  const{width:w,height:h,data:d,channels:c}=img;if(w<60||h<60||w*h>4_000_000)return null;
  // « encre » = tout pixel qui n'est pas (presque) blanc : barres colorées, contour noir de la barre choisie, lettres.
  const ink=(i:number)=>{const a=c>=4?d[i+3]/255:1;/* image posée sur fond blanc, comme dans le navigateur (bords adoucis par la transparence) */const r=d[i]*a+255*(1-a),g=d[i+1]*a+255*(1-a),b=d[i+2]*a+255*(1-a);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mn<190||(mx-mn)>50;};
  const minRun=Math.max(8,Math.round((x1-x0)*0.04));/* longueur mini d'une barre, rapportée à la zone lue */
  const gapTol=h<300?4:2;/* petite image : la lettre de la barre choisie prend presque toute la barre */
  const on:boolean[]=[],ends:number[]=[],starts:number[]=[];
  for(let y=0;y<h;y++){
    // première longue suite en partant de la gauche (toutes les barres partent du même bord ; le trait et la valeur
    // écrits à droite de la barre choisie ne comptent pas)
    let first=0,firstEnd=0,run=0,gap=0,x=x0;
    for(;x<x1;x++){
      if(ink((y*w+x)*c)){run+=1+gap;gap=0;}
      else if(run>0&&gap<gapTol)gap++;
      else{if(run>=minRun){first=run;firstEnd=x-1-gap;break;}run=0;gap=0;}
    }
    if(!first&&run>=minRun){first=run;firstEnd=x1-1;}
    on.push(first>=minRun);ends.push(firstEnd);starts.push(firstEnd-first+1);
  }
  // Toutes les barres partent du même bord gauche (le plus fréquent). Une ligne dont la « barre » commence bien plus
  // à droite est du texte (« kg CO2/m²/an ») vu dans l'espace entre deux barres : écartée.
  {const tally=new Map<number,number>();for(let y=0;y<h;y++)if(on[y]){const k=Math.round(starts[y]/4);tally.set(k,(tally.get(k)||0)+1);}
   if(tally.size){const k0=[...tally.entries()].sort((a,b)=>b[1]-a[1])[0][0]*4;const lim=k0+(x1-x0)*0.25;for(let y=0;y<h;y++)if(on[y]&&starts[y]>lim)on[y]=false;}}
  const bands:{y0:number,y1:number,end:number}[]=[];
  for(let y=0;y<h;y++){if(!on[y])continue;const last=bands[bands.length-1];if(last&&y-last.y1<=Math.max(1,Math.round(h/200))){last.y1=y;last.end=Math.max(last.end,ends[y]);}else bands.push({y0:y,y1:y,end:ends[y]});}
  const bs0=bands.filter(b=>b.y1-b.y0+1>=4);
  // bandes trop fines (titres, texte sous le cadre « 84 | 2 ») écartées : moins de 60 % de la hauteur courante d'une barre
  const hMed=bs0.map(b=>b.y1-b.y0+1).sort((a,b)=>a-b)[Math.floor(bs0.length/2)]||0;
  const bs=bs0.filter(b=>b.y1-b.y0+1>=hMed*0.6);
  if((globalThis as any).ENERGY_DEBUG)console.log(bs.map(b=>[b.y0,b.y1,b.end]));
  // 7 bandes consécutives dont la longueur croît (A courte → G longue) ; les titres et légendes sont écartés.
  let pick:typeof bs|null=null,bestScore=-1;
  for(let k=0;k+7<=bs.length;k++){
    const win=bs.slice(k,k+7);let ok=true;
    // longueurs croissantes, sans compter la barre choisie (le trait « —— 7 » collé à elle l'allonge)
    const hw=win.map(b=>b.y1-b.y0+1);const tallest=hw.indexOf(Math.max(...hw));const rest=win.filter((_,i)=>i!==tallest);
    for(let i=1;i<rest.length;i++)if(rest[i].end<rest[i-1].end-w*0.02){ok=false;break;}
    if(!ok||rest[rest.length-1].end-rest[0].end<(x1-x0)*0.1)continue;
    const hs=win.map(b=>b.y1-b.y0+1).sort((a,b)=>a-b);const spread=hs[5]/hs[0];/* les 6 barres non choisies : hauteurs proches */
    if(spread>1.5)continue;
    const score=hs[0]-spread;if(score>bestScore){bestScore=score;pick=win;}
  }
  if(!pick)return null;
  const hs=pick.map(b=>b.y1-b.y0+1);
  const top=hs.indexOf(Math.max(...hs));
  const others=hs.filter((_,i)=>i!==top).sort((a,b)=>a-b);
  if(hs[top]<others[3]*1.3)return null;
  if(others[5]>=hs[top]*0.85)return null;/* deux barres hautes : ambigu */
  return 'ABCDEFG'[top];
}
// Image combinée (Guy Hoquet / immo-facile « dpe_ges ») : DPE à gauche, GES dans un cadre à droite, séparés par une
// bande verticale vide. On coupe l'image le long de cette bande et on lit chaque moitié comme une échelle.
function splitColumn(img:Img){
  const{width:w,height:h,data:d,channels:c}=img;
  const empty=(x:number)=>{for(let y=0;y<h;y++){const i=(y*w+x)*c;const a=c>=4?d[i+3]/255:1;if(Math.min(d[i],d[i+1],d[i+2])*a+255*(1-a)<235)return false;}return true;};
  let best=[0,0],cur=-1;
  for(let x=Math.round(w*0.3);x<Math.round(w*0.8);x++){if(empty(x)){if(cur<0)cur=x;if(x-cur+1>best[1]-best[0])best=[cur,x+1];}else cur=-1;}
  return best[1]-best[0]>=Math.max(6,w*0.015)?best:null;
}
export function energyClassesFromPixels(img:Img){
  const cut=splitColumn(img);
  if(!cut)return{dpe:energyClassFromPixels(img),ges:null};
  return{dpe:energyClassFromPixels(img,0,cut[0]),ges:energyClassFromPixels(img,cut[1],img.width)};
}
export function energyClassFromBytes(b:Uint8Array){const img=decodeImage(b);if(!img)return null;const cut=splitColumn(img);return energyClassFromPixels(img,0,cut?cut[0]:img.width);}
export function energyClassesFromBytes(b:Uint8Array){const img=decodeImage(b);return img?energyClassesFromPixels(img):{dpe:null,ges:null};}

// Images DPE / GES d'une fiche : <img> dont la source, le alt ou la classe parle de DPE / GES / énergie.
export function energyImageUrls(html:string,pageUrl:string){
  const out:{dpe?:string,ges?:string}={};
  for(const m of html.matchAll(/<img\b[^>]*>/gi)){
    const tag=m[0];const src=(tag.match(/\b(?:data-src|data-lazy-src|src)="([^"]+)"/i)||[])[1];if(!src||/^data:/i.test(src))continue;
    const meta=(tag+' '+src).toLowerCase();
    if(!/dpe|ges|energ|diagnostic|climat|co2/.test(meta))continue;
    let u:string;try{u=new URL(src.replace(/&amp;/g,'&'),pageUrl).toString();}catch{continue;}
    const isGes=/\bges\b|type=ges|[_\-/]ges[_\-.]|alt="ges|climat|co2|emission/i.test(tag+' '+src);
    if(isGes){if(!out.ges)out.ges=u;}else if(/dpe|energ|diagnostic/i.test(meta)&&!out.dpe)out.dpe=u;
  }
  return out;
}

// Lit les images notées par la lecture de fiche (dpe_image / ges_image) quand la classe n'est pas écrite.
// Au plus 80 images par passage, 6 à la fois ; une même image (même adresse) n'est lue qu'une fois.
let spent=0;
// Taille lue dans l'en-tête, sans décoder (PNG : IHDR ; JPEG : segment SOFn ; GIF/WebP : écartés plus loin par decodeImage).
function imageSize(b:Uint8Array):{w:number,h:number}|null{
  if(b[0]===0x89&&b[1]===0x50)return{w:(b[16]<<24|b[17]<<16|b[18]<<8|b[19])>>>0,h:(b[20]<<24|b[21]<<16|b[22]<<8|b[23])>>>0};
  if(b[0]===0xFF&&b[1]===0xD8){let i=2;while(i+9<b.length){if(b[i]!==0xFF){i++;continue;}const m=b[i+1];if(m===0xD8||m===0x01||(m>=0xD0&&m<=0xD7)){i+=2;continue;}
    if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC)return{h:b[i+5]<<8|b[i+6],w:b[i+7]<<8|b[i+8]};i+=2+(b[i+2]<<8|b[i+3]);}return null;}
  return{w:0,h:0};
}
const seen=new Map<string,Promise<{dpe:string|null,ges:string|null,both?:boolean}>>();
const safeHost=(u:URL)=>u.protocol==='https:'||u.protocol==='http:'?!/^(\d+\.){3}\d+$|^\[|localhost|\.local$|\.internal$|supabase\.(co|in)$/i.test(u.hostname):false;
// Une image peut porter une échelle (DPE ou GES seul) ou deux (DPE à gauche, GES à droite).
async function classesOf(src:string){
  if(!seen.has(src))seen.set(src,(async()=>{const none={dpe:null,ges:null};try{const u=new URL(src);if(!safeHost(u))return none;
    const r=await fetch(u.toString(),{headers:{'User-Agent':'Mozilla/5.0 (compatible; Abracadeal-StockSync/1.0; +https://abracadeal.fr)',Accept:'image/*'},signal:AbortSignal.timeout(12000)});
    if(!r.ok){await r.body?.cancel();return none;}const len=Number(r.headers.get('content-length')||0);if(len>3_000_000){await r.body?.cancel();return none;}
    const b=new Uint8Array(await r.arrayBuffer());if(b.length>3_000_000)return none;
    // 01/11/2026 (Laforêt) : étiquette en SVG (texte) : classes écrites en clair, ex. <g id="DPE_D">, <g id="GES_D">.
    const head=new TextDecoder().decode(b.subarray(0,Math.min(b.length,400))).trimStart();
    if(/^(<\?xml[^>]*>\s*)?<svg\b/i.test(head)){const t=new TextDecoder().decode(b);
      const one=(re:RegExp)=>{const set=new Set([...t.matchAll(re)].map(m=>m[1].toUpperCase()));return set.size===1?[...set][0]:null;};
      return{dpe:one(/\bid="(?:DPE|CEP|etiquette[_-]?dpe)[_-]([A-G])"/gi),ges:one(/\bid="(?:GES|EGES|etiquette[_-]?ges)[_-]([A-G])"/gi),both:true};}
    // 01/11/2026 (robot en erreur 503 sur axeylia, laroca, valloire, bhcar) : le décodage coûte du calcul ;
    // une étiquette fait rarement plus de 2 Mpx, et au-delà de ~900 ms de décodage cumulé on s'arrête pour ce passage.
    // 01/11/2026 : budget commun avec la lecture des pages (cpu-meter) : la lecture + les images ne dépassent pas ~1,4 s de calcul.
    const dim=imageSize(b);if(!dim||dim.w*dim.h>1_500_000||spent>600||cpu.ms>CPU_BUDGET_MS+650)return none;
    const t0=performance.now();try{return energyClassesFromBytes(b);}finally{const d=performance.now()-t0;spent+=d;cpu.ms+=d;}}catch{return none;}})());
  return seen.get(src)!;
}
export async function fillEnergyFromImages(rows:any[]){
  spent=0;const until=Date.now()+25000;
  const jobs:(()=>Promise<void>)[]=[];
  for(const r of rows){
    if(!r||typeof r!=='object')continue;
    if(r.dpe_image&&r.dpe_image===r.ges_image){if(!r.dpe||!r.ges)jobs.push(async()=>{const k=await classesOf(r.dpe_image);if(k.dpe&&!r.dpe){r.dpe=k.dpe;r.dpe_source='image';}if(k.ges&&!r.ges){r.ges=k.ges;r.ges_source='image';}});continue;}
    // image seule : la première échelle lue est celle de l'image (DPE ou GES)
    if(!r.dpe&&r.dpe_image)jobs.push(async()=>{const x=await classesOf(r.dpe_image);if(x.dpe&&!r.dpe){r.dpe=x.dpe;r.dpe_source='image';}if(x.both&&x.ges&&!r.ges){r.ges=x.ges;r.ges_source='image';}});
    if(!r.ges&&r.ges_image)jobs.push(async()=>{const k=(await classesOf(r.ges_image)).dpe;if(k&&!r.ges){r.ges=k;r.ges_source='image';}});
  }
  const list=jobs.slice(0,80);let i=0;
  await Promise.all(Array.from({length:Math.min(6,list.length)},async()=>{while(i<list.length&&Date.now()<until)await list[i++]();}));
  return rows;
}
