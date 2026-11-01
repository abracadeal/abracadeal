// 01/11/2026 — Claude (Anthony : « les DPE en images, il faut entraîner le robot à les lire »).
// Beaucoup de sites (La Boîte Immo, Adaptimmo…) n'écrivent pas la classe DPE / GES : ils l'affichent en image.
// L'étiquette officielle (modèle 2021) est une échelle de 7 barres A→G ; la classe du bien est la barre nettement
// plus haute que les autres (encadrée de noir). On mesure les barres ligne par ligne :
//  - une ligne « de barre » contient une longue suite de pixels non blancs (le texte est trop fin) ;
//  - on regroupe les lignes en bandes et on cherche 7 bandes de suite, de longueur croissante (sinon ce n'est pas une échelle) ;
//  - la bande la plus haute, au moins 1,3 × les autres, donne la lettre.
// Dans le doute on ne renvoie rien : jamais de classe inventée.
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
export function energyClassFromPixels(img:Img):string|null{
  const{width:w,height:h,data:d,channels:c}=img;if(w<60||h<60||w*h>4_000_000)return null;
  // « encre » = tout pixel qui n'est pas (presque) blanc : barres colorées, contour noir de la barre choisie, lettres.
  const ink=(i:number)=>{const a=c>=4?d[i+3]:255;if(a<128)return false;const r=d[i],g=d[i+1],b=d[i+2];const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mn<190||(mx-mn)>50;};
  const minRun=Math.max(14,Math.round(w*0.04));
  const on:boolean[]=[],ends:number[]=[];
  for(let y=0;y<h;y++){
    // première longue suite en partant de la gauche (toutes les barres partent du même bord ; le trait et la valeur
    // écrits à droite de la barre choisie ne comptent pas)
    let first=0,firstEnd=0,run=0,gap=0,x=0;
    for(;x<w;x++){
      if(ink((y*w+x)*c)){run+=1+gap;gap=0;}
      else if(run>0&&gap<2)gap++;
      else{if(run>=minRun){first=run;firstEnd=x-1-gap;break;}run=0;gap=0;}
    }
    if(!first&&run>=minRun){first=run;firstEnd=w-1;}
    on.push(first>=minRun);ends.push(firstEnd);
  }
  const bands:{y0:number,y1:number,end:number}[]=[];
  for(let y=0;y<h;y++){if(!on[y])continue;const last=bands[bands.length-1];if(last&&y-last.y1<=Math.max(1,Math.round(h/200))){last.y1=y;last.end=Math.max(last.end,ends[y]);}else bands.push({y0:y,y1:y,end:ends[y]});}
  const bs=bands.filter(b=>b.y1-b.y0+1>=4);
  if((globalThis as any).ENERGY_DEBUG)console.log(bs.map(b=>[b.y0,b.y1,b.end]));
  // 7 bandes consécutives dont la longueur croît (A courte → G longue) ; les titres et légendes sont écartés.
  let pick:typeof bs|null=null,bestScore=-1;
  for(let k=0;k+7<=bs.length;k++){
    const win=bs.slice(k,k+7);let ok=true;
    for(let i=1;i<7;i++)if(win[i].end<win[i-1].end-w*0.02){ok=false;break;}
    if(!ok||win[6].end-win[0].end<w*0.1)continue;
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
export function energyClassFromBytes(b:Uint8Array){const img=decodeImage(b);return img?energyClassFromPixels(img):null;}

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
const seen=new Map<string,Promise<string|null>>();
const safeHost=(u:URL)=>u.protocol==='https:'||u.protocol==='http:'?!/^(\d+\.){3}\d+$|^\[|localhost|\.local$|\.internal$|supabase\.(co|in)$/i.test(u.hostname):false;
async function classOf(src:string){
  if(!seen.has(src))seen.set(src,(async()=>{try{const u=new URL(src);if(!safeHost(u))return null;
    const r=await fetch(u.toString(),{headers:{'User-Agent':'Mozilla/5.0 (compatible; Abracadeal-StockSync/1.0; +https://abracadeal.fr)',Accept:'image/*'},signal:AbortSignal.timeout(12000)});
    if(!r.ok){await r.body?.cancel();return null;}const len=Number(r.headers.get('content-length')||0);if(len>3_000_000){await r.body?.cancel();return null;}
    const b=new Uint8Array(await r.arrayBuffer());return b.length>3_000_000?null:energyClassFromBytes(b);}catch{return null;}})());
  return seen.get(src)!;
}
export async function fillEnergyFromImages(rows:any[]){
  const jobs:(()=>Promise<void>)[]=[];
  for(const r of rows){
    if(!r||typeof r!=='object')continue;
    if(!r.dpe&&r.dpe_image)jobs.push(async()=>{const k=await classOf(r.dpe_image);if(k&&!r.dpe){r.dpe=k;r.dpe_source='image';}});
    if(!r.ges&&r.ges_image)jobs.push(async()=>{const k=await classOf(r.ges_image);if(k&&!r.ges){r.ges=k;r.ges_source='image';}});
  }
  const list=jobs.slice(0,80);let i=0;
  await Promise.all(Array.from({length:Math.min(6,list.length)},async()=>{while(i<list.length)await list[i++]();}));
  return rows;
}
