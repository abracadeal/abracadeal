const fail=(r:any)=>{if(r.error)throw r.error;return r.data;};
function privateIP(ip:string){
 if(ip.includes(':'))return /^(::|fc|fd|fe80|ff)/i.test(ip)||ip.toLowerCase().startsWith('::ffff:');
 const a=ip.split('.').map(Number);
 return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||(a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&a[1]===168)||(a[0]===100&&a[1]>=64&&a[1]<=127);
}
async function remoteImage(raw:string){
 let url=new URL(raw);
 for(let redirects=0;redirects<=4;redirects++){
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||(url.port&&!['80','443'].includes(url.port)))throw Error('URL de photo non autorisée');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if(host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||privateIP(host))throw Error('Adresse de photo privée interdite');
  const addresses=/^[\d.]+$/.test(host)||host.includes(':')?[host]:[
   ...await Deno.resolveDns(host,'A').catch(()=>[]),...await Deno.resolveDns(host,'AAAA').catch(()=>[])
  ];
  if(!addresses.length||addresses.some(privateIP))throw Error('Adresse de photo inaccessible ou privée');
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(response.status>=300&&response.status<400){
   const location=response.headers.get('location');await response.body?.cancel();
   if(!location)throw Error('Redirection de photo invalide');url=new URL(location,url);continue;
  }
  if(!response.ok)throw Error('Téléchargement photo HTTP '+response.status);
  const max=5242880;
  if(Number(response.headers.get('content-length')||0)>max){await response.body?.cancel();throw Error('Photo trop volumineuse');}
  const reader=response.body?.getReader();if(!reader)throw Error('Photo vide');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('Photo trop volumineuse');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const type=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':
   bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':
   new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'?'image/webp':null;
  if(!type)throw Error('Format de photo importée non pris en charge');
  return {bytes,type,ext:type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp'};
 }
 throw Error('Trop de redirections pour la photo');
}
export async function stageImportedImages(admin:any,listing:any,photos:any[]){
 for(const photo of photos){
  if(!/^https?:\/\//i.test(photo.storage_path))continue;
  const image=await remoteImage(photo.storage_path);
  const path=listing.owner_id+'/'+listing.id+'/'+crypto.randomUUID()+'.'+image.ext;
  fail(await admin.storage.from('listing-images-pending').upload(path,image.bytes,{contentType:image.type,upsert:false}));
  const update=await admin.from('listing_photos').update({storage_path:path,storage_bucket:'listing-images-pending'}).eq('id',photo.id).eq('storage_path',photo.storage_path).select('id');
  if(update.error||!update.data?.length){await admin.storage.from('listing-images-pending').remove([path]);throw update.error||Error('Photo modifiée pendant son import');}
  photo.storage_path=path;photo.storage_bucket='listing-images-pending';
 }
}
