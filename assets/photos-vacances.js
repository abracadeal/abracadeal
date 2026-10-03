
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co',SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY),$=id=>document.getElementById(id);let user=null,listings=[],photos=[];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function note(t){$('notice').textContent=t;$('notice').classList.remove('hidden')}
async function boot(){const {data:{user:u}}=await sb.auth.getUser();if(!u){location.href='espace-hote.html';return}user=u;const {data,error}=await sb.from('listings').select('id,title').eq('owner_id',user.id).eq('category','vacances').order('created_at',{ascending:false});if(error){note(error.message);return}listings=data||[];$('listing').innerHTML=listings.length?listings.map(x=>'<option value="'+x.id+'">'+esc(x.title)+'</option>').join(''):'<option value="">Aucun logement</option>';const q=new URLSearchParams(location.search).get('listing');if(q&&listings.some(x=>x.id===q))$('listing').value=q;await load()}
async function load(){const id=$('listing').value;if(!id){$('photos').innerHTML='<div class="empty">Ajoutez d’abord un logement.</div>';return}const l=listings.find(x=>x.id===id);$('title').textContent='Photos · '+(l?.title||'Logement');const {data,error}=await sb.from('listing_photos').select('*').eq('listing_id',id).order('position').order('created_at');if(error){note(error.message);return}photos=data||[];render()}
function render(){$('photos').innerHTML=photos.length?photos.map((p,i)=>{const url=sb.storage.from('listing-images').getPublicUrl(p.storage_path).data.publicUrl;return '<div class="photo"><img src="'+url+'" alt=""><div class="photoBody"><div style="margin-bottom:8px">'+(i===0?'<span class="pill">Photo principale</span>':'Photo '+(i+1))+'</div><div class="actions"><button class="btn soft" onclick="movePhoto(\''+p.id+'\',-1)" '+(i===0?'disabled':'')+'>←</button><button class="btn soft" onclick="movePhoto(\''+p.id+'\',1)" '+(i===photos.length-1?'disabled':'')+'>→</button><button class="btn danger" onclick="deletePhoto(\''+p.id+'\')">Supprimer</button></div></div></div>'}).join(''):'<div class="empty">Aucune photo. Ajoutez au moins une belle photo principale.</div>'}
$('listing').onchange=load;
async function optimizeVacationPhoto(file){
 const image=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1800/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  let result;
  for(const quality of [.84,.76,.68,.60]){
   result=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   if(!result)throw Error('Compression impossible');
   if(result.size<=450*1024)break;
  }
  return result;
 }finally{image.close()}
}
$('uploadBtn').onclick=async()=>{const id=$('listing').value,fs=[...$('files').files];if(!id||!fs.length){note('Choisissez un logement et au moins une photo.');return}if(photos.length+fs.length>10){note('Maximum 10 photos par logement.');return}$('uploadBtn').disabled=true;let pos=photos.length+1;for(const f of fs){if(f.size>5*1024*1024){note('Une photo dépasse 5 Mo : '+f.name);continue}let compressed;try{compressed=await optimizeVacationPhoto(f)}catch(e){note('Photo illisible : '+f.name);continue}const path=user.id+'/'+id+'/'+crypto.randomUUID()+'.webp';const {error:up}=await sb.storage.from('listing-images').upload(path,compressed,{contentType:'image/webp',upsert:false});if(up){note(up.message);continue}const {error:ins}=await sb.from('listing_photos').insert({listing_id:id,storage_path:path,position:pos++});if(ins){await sb.storage.from('listing-images').remove([path]);note(ins.message)}}$('files').value='';$('uploadBtn').disabled=false;note('Photos importées.');load()}
window.deletePhoto=async id=>{const p=photos.find(x=>x.id===id);if(!p||!confirm('Supprimer cette photo ?'))return;const {error}=await sb.from('listing_photos').delete().eq('id',id);if(error){note(error.message);return}await sb.storage.from('listing-images').remove([p.storage_path]);await normalize();load()}
async function normalize(){for(let i=0;i<photos.length;i++)await sb.from('listing_photos').update({position:i+1}).eq('id',photos[i].id)}
window.movePhoto=async(id,dir)=>{const i=photos.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=photos.length)return;const a=photos[i],b=photos[j],pa=a.position,pb=b.position;await sb.from('listing_photos').update({position:999}).eq('id',a.id);await sb.from('listing_photos').update({position:pa}).eq('id',b.id);await sb.from('listing_photos').update({position:pb}).eq('id',a.id);load()}
$('publishBtn').onclick=async()=>{
  const id=$('listing').value;
  if(!id){note('Ajoutez d’abord un logement.');return}
  await load();
  if(!photos.length){note('Ajoutez au moins une photo avant de publier.');return}
  $('publishBtn').disabled=true;
  const {error}=await sb.functions.invoke('moderate-listing',{body:{listing_id:id}});
  $('publishBtn').disabled=false;
  if(error){note('La publication n’a pas pu être lancée : '+error.message);return}
  note('Annonce envoyée à la modération Abracadeal.');
  setTimeout(()=>location.href='espace-hote.html',900);
}
boot();
