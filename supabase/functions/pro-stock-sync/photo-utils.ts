// Règles communes : filtrage explicite des images d’attente et variantes d’une même photo.
// Aucune déduction visuelle : un nom opaque peut nécessiter une vérification manuelle.
export function isPlaceholderPhoto(raw:string,depth=0):boolean{
 try{
  const u=new URL(raw);let path=u.pathname;try{path=decodeURIComponent(path);}catch{}
  const name=(path.split('/').pop()||'').toLowerCase().replace(/\.(?:jpe?g|png|webp|avif|gif|svg)$/,'').replace(/[-_]\d{1,4}x\d{1,4}$/,'');
  if(/^(?:placeholder(?:[-_]image)?|default(?:[-_](?:image|photo|picture))?|(?:image|photo|picture)[-_]default|no[-_]?(?:photo|image|picture)(?:[-_]available)?|sans[-_]?(?:photo|image)|(?:photo|image)[-_](?:absente?|indisponible|a[-_]venir)|loading|loader|blank|transparent|spacer|pixel)(?:[-_]\d+)?$/.test(name))return true;
  if(/\/(?:placeholders?|no[-_]?(?:image|photo))\//i.test(path))return true;
  if(depth<2)for(const key of ['url','src','image','file']){const value=u.searchParams.get(key);if(value&&isPlaceholderPhoto(new URL(value,u).href,depth+1))return true;}
 }catch{}
 return false;
}
const SIZE_Q=/^(w|h|width|height|q|quality|fit|crop|resize|size|format|fm|auto|dpr|scale|mode|rs|ver|version|cache|itok|sw|sh)$/i;
const SIZE_WORD='thumb|thumbs|thumbnail|thumbnails|small|medium|large|big|ibig|intermediate|mini|xl|xxl|hd|full|original|orig|sm|md|lg|xs|preview|zoom|max|min|resized|crop|cropped';
export function photoKey(u:string){
 try{const x=new URL(u);const keep=[...x.searchParams.entries()].filter(([k])=>!SIZE_Q.test(k)).map(([k,v])=>k+'='+v).sort().join('&');
  let p=decodeURIComponent(x.pathname).toLowerCase();
  p=p.replace(new RegExp(`/(?:${SIZE_WORD}|\\d{2,4}x\\d{2,4}|[wh]_?\\d{2,4}|c_[a-z]+|q_\\d+|f_auto|q_auto)(?=/)`,'g'),'/')
     .replace(/[-_]\d{2,4}x\d{2,4}(?=\.[a-z0-9]{3,4}$)/,'')
     .replace(new RegExp(`[-_.](?:${SIZE_WORD})(?=\\.[a-z0-9]{3,4}$)`),'')
     .replace(/@\dx(?=\.)/,'').replace(/\.(?:jpe?g|png|webp|avif|gif)$/,'.img').replace(/\/{2,}/g,'/');
  return x.hostname.replace(/^www\./,'')+p+(keep?'?'+keep:'');}catch{return u;}
}
export function photoRank(u:string){const s=u.toLowerCase();let r=0;
 // aucune indication de taille = souvent l'image d'origine (WordPress : car.jpg plus grande que car-1024x683.jpg)
 if(!/\d{2,4}x\d{2,4}|[?&](?:w|width|h|height)=|thumb|small|mini|preview|large|big|full|original|hd|xl|intermediate/.test(s))r+=2.5;if(/full|original|orig|large|big|ibig|hd|xxl|xl|max|zoom/.test(s))r+=3;if(/thumb|small|mini|preview|xs|\bsm\b|min/.test(s))r-=3;const m=s.match(/(\d{2,4})x(\d{2,4})/);if(m)r+=Math.min(3,Number(m[1])/600);const w=s.match(/[?&](?:w|width)=(\d+)/);if(w)r+=Math.min(3,Number(w[1])/600);return r;}
export function dedupePhotos(list:any){
 if(!Array.isArray(list))return list;const order:string[]=[];const best=new Map<string,string>();
 for(const u of list){const s=String(u||'');if(!s||isPlaceholderPhoto(s))continue;const k=photoKey(s);if(!best.has(k)){best.set(k,s);order.push(k);}else if(photoRank(s)>photoRank(best.get(k)!))best.set(k,s);}
 return order.map(k=>best.get(k)!);
}
