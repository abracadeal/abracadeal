export function prohibitedTerms(listing:any){
 const text=(String(listing.title||'')+' '+String(listing.description||''))
  .replace(/\[ABRACA_[^\]]+\]/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const found:string[]=[];
 for(const [label,regex] of [
  ['rencontre',/\brencontres?\b/],['escort',/\bescorts?\b/],
  ['accompagnement',/\baccompagnements?\b/],['moment de détente',/\bmoments?\s+de\s+detente\b/]
 ] as Array<[string,RegExp]>)if(regex.test(text))found.push(label);
 if(/\bmassages?\b/.test(text)&&(listing.seller_type!=='professionnel'||/\b(?:non[-\s]+professionnel(?:le)?|amateur(?:e)?)\b/.test(text)))found.push('massage non professionnel');
 return found;
}
export async function hashPhotos(admin:any,photos:any[]){
 let reused=0;
 for(const p of photos){
  if(/^https?:\/\//i.test(p.storage_path))throw Error('Photo externe non importée');
  const {data,error}=await admin.storage.from(p.storage_bucket).download(p.storage_path);
  if(error||!data)throw error||Error('Photo inaccessible pour empreinte');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await data.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const recorded=await admin.rpc('record_listing_photo_hash',{p_photo_id:p.id,p_sha256:hash});
  if(recorded.error)throw recorded.error;
  if(Number(recorded.data)>0)reused++;
 }
 return reused;
}
