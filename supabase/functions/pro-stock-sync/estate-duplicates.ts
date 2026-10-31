// Conservative cross-reference duplicates: matching facts + detailed prose + photographic evidence.
import {isPlaceholderPhoto} from './photo-utils.ts';
const words=(s:any)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g)||[];
const grams=(s:any)=>{const a=words(s);return new Set(a.slice(0,-2).map((_,i)=>a.slice(i,i+3).join(' ')));};
const imageId=(s:string)=>{try{const u=new URL(s);const p=decodeURIComponent(u.pathname);const m=p.match(/--([0-9a-f-]{36})\.(?:jpe?g|png|webp)$/i);return m?u.hostname+'|'+m[1]:u.origin+p;}catch{return s;}};
const area=(r:any)=>Number(r.surface)||Number(String(r.description||'').match(/(?:bas de villa|appartement|maison)[^.\n]{0,45}?\b(\d+(?:[.,]\d+)?)\s*m[²2]/i)?.[1]?.replace(',','.'))||0;
const eligible=(r:any)=>r.category==='immobilier'&&/^https?:\/\/(?:www\.)?orpi\.com\//i.test(r.externalUrl||'')&&r.price>0&&area(r)>0&&r.rooms>0&&!/programme neuf|plusieurs lots|lot\s*(?:n[°o]|num[ée]ro)|r[ée]sidence neuve/i.test(r.title+' '+r.description);
export async function dedupeEstateListings(rows:any[],photoDigest:(url:string)=>Promise<string|null>){
 const eligibility=new WeakMap<object,boolean>(),areas=new WeakMap<object,number>();const can=(r:any)=>{if(!eligibility.has(r))eligibility.set(r,eligible(r));return eligibility.get(r);};const size=(r:any)=>{if(!areas.has(r))areas.set(r,area(r));return areas.get(r)!;};
 const groups:any[][]=[];let removed=0;const digests=new Map<string,Promise<string|null>>();
 const hash=(u:string)=>{if(!digests.has(u))digests.set(u,photoDigest(u).catch(()=>null));return digests.get(u)!;};
 for(const r of rows){let match:any[]|undefined;
  if(can(r))for(const g of groups){const a=g[0];if(!can(a)||a.price!==r.price||Math.abs(size(a)-size(r))>0.1||a.rooms!==r.rooms||a.transaction!==r.transaction||String(a.postal||'').slice(0,2)!==String(r.postal||'').slice(0,2))continue;
   if(a.sub!==r.sub&&!( /bas de villa/i.test(a.description)&&/bas de villa/i.test(r.description)&&[a.sub,r.sub].every(s=>['vente-maison','vente-appartement'].includes(s))))continue;
   const x=grams(a.description),y=grams(r.description);if(Math.min(x.size,y.size)<60)continue;let common=0;for(const v of x)if(y.has(v))common++;const score=2*common/(x.size+y.size);if(score<0.75)continue;
   const ap=(a.photos||[]).filter((u:string)=>!isPlaceholderPhoto(u)),rp=(r.photos||[]).filter((u:string)=>!isPlaceholderPhoto(u));if(ap.length<3||rp.length<3)continue;
   const ai=new Set(ap.map(imageId));const shared=new Set(rp.map(imageId).filter((id:string)=>ai.has(id))).size;
   let same=shared>=3&&shared>=Math.min(ap.length,rp.length)*0.6;
   if(!same){const [ah,rh]=await Promise.all([hash(ap[0]),hash(rp[0])]);same=!!ah&&ah===rh;}
   if(same){match=g;break;}
  }
  if(match){match.push(r);removed++;}else groups.push([r]);
 }
 const result=groups.map(g=>{if(g.length===1)return g[0];const sorted=[...g].sort((a,b)=>Number(!!b.corrected)-Number(!!a.corrected)||(b.photos?.length||0)-(a.photos?.length||0));const keep={...sorted[0]};keep.duplicateSources=g.map(r=>({ref:r.ref,url:r.externalUrl,city:r.city,postal:r.postal,sub:r.sub}));const cities=[...new Set(g.map(r=>r.city).filter(Boolean))];if(cities.length>1)keep.sourceWarnings=[...(keep.sourceWarnings||[]),'Villes différentes à la source : '+cities.join(' / ')+'.'];return keep;});
 return {rows:result,removed};
}
