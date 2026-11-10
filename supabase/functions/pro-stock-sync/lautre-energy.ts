// Older seven-bar labels used by L’Autre: the selected bar is linked to the value box by a thin coloured line.
// Recognize that geometry, never infer a grade from consumption thresholds or filenames.
import jpeg from 'npm:jpeg-js@0.4.4';
import {decode} from 'npm:fast-png@6.2.0';
export function lautreEnergyClass(bytes:Uint8Array):string|null{try{
 let r:any,c:number,palette:any;if(bytes[0]===137&&bytes[1]===80){r=decode(bytes);c=r.channels;palette=r.palette;}else if(bytes[0]===255&&bytes[1]===216){r=jpeg.decode(bytes,{useTArray:true,maxMemoryUsageInMB:32});c=4;}else return null;
 const w=r.width,h=r.height;if(w<250||h<180||w*h>600000||r.depth===16)return null;
 const rgb=(x:number,y:number):number[]=>{const i=y*w+x;if(palette)return (palette[r.data[i]]||[255,255,255]).slice(0,3);const off=i*c;return Array.from(r.data.subarray(off,off+3));};
 const close=(a:number[],b:number[])=>a.every((v,i)=>Math.abs(v-b[i])<=(bytes[0]===255?32:12));const colored=(a:number[])=>Math.max(...a)-Math.min(...a)>25&&Math.min(...a)<235;
 const end=Math.floor(w*.45),grades=new Map<number,number>();
 // Locate the common left edge instead of assuming a percentage: templates have different margins.
 for(let x=Math.floor(w*.06);x<Math.floor(w*.22);x+=2){
 const bands:{y0:number,y1:number,color:number[]}[]=[];
 for(let y=0;y<h;y++){const color=rgb(x,y);if(!colored(color))continue;const last=bands[bands.length-1];if(last&&last.y1===y-1&&close(last.color,color))last.y1=y;else bands.push({y0:y,y1:y,color});}
 const bars=bands.filter(b=>b.y1-b.y0>=8);if(bars.length!==7||bars.some((b,i)=>i&&b.y0-bars[i-1].y1<2))continue;
 const hits:number[]=[];for(let i=0;i<bars.length;i++){const b=bars[i];let count=0;for(let y=b.y0;y<=b.y1;y++){let line=true;for(let xx=x;xx<=end;xx+=2)if(Math.min(...rgb(xx,y))>235){line=false;break;}if(line)count++;}if(count>0&&count<=3)hits.push(i);}
 if(hits.length===1){const grade=hits[0];grades.set(grade,(grades.get(grade)||0)+1);}
 }
 // More than one candidate class is ambiguous; at least two separate sample columns must agree.
 return grades.size===1&&[...grades.values()][0]>=2?'ABCDEFG'[[...grades.keys()][0]]:null;
 }catch{return null;}}
export async function readLautreEnergy(row:any){for(const key of ['dpe','ges']){const src=row[key+'_image'];if(!src||row[key])continue;const u=new URL(src);if(u.hostname!=='lautre-immobilier.fr'||!u.pathname.startsWith('/wp-content/uploads/'))continue;try{const res=await fetch(src,{headers:{'User-Agent':'Mozilla/5.0 (compatible; Abracadeal-StockSync/1.0; +https://abracadeal.fr)',Accept:'image/*'},signal:AbortSignal.timeout(12000)});if(!res.ok){await res.body?.cancel();continue;}if(Number(res.headers.get('content-length')||0)>1000000){await res.body?.cancel();continue;}const bytes=new Uint8Array(await res.arrayBuffer());if(bytes.length>1000000)continue;const grade=lautreEnergyClass(bytes);if(grade){row[key]=grade;row[key+'_source']='image';}}catch{}}return row;}
