import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const sha256=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const newKey=()=>`abr_${crypto.randomUUID().replace(/-/g,'')}_${crypto.randomUUID().replace(/-/g,'')}`;
const sectorOf=(v:unknown)=>v==='immobilier'?'immobilier':'vehicules';
async function lockedSector(userId:string,isAdmin=false){if(isAdmin)return null;const{data}=await admin.from('pro_verifications').select('business_sector').eq('user_id',userId).maybeSingle();const s=data?.business_sector;return s==='vehicules'||s==='immobilier'?s:null;}
function ensureSector(requested:string,locked:string|null){if(locked&&requested!==locked)throw new Error(locked==='vehicules'?'Ce compte professionnel est identifié Automobile / Moto : l’import Immobilier est bloqué.':'Ce compte professionnel est identifié Immobilier : l’import Auto / Moto est bloqué.');return locked||requested;}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const auth=req.headers.get('Authorization')||'';if(!auth)return json({error:'Non authentifié'},401);
  const caller=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:ud}=await caller.auth.getUser();const user=ud?.user;if(!user)return json({error:'Session invalide'},401);
  const {data:profile}=await admin.from('profiles').select('account_type,is_admin').eq('id',user.id).maybeSingle();
  if(profile?.account_type!=='professionnel'&&!profile?.is_admin)return json({error:'Compte professionnel requis'},403);
  const body=await req.json().catch(()=>({}));const action=String(body?.action||'list');const locked=await lockedSector(user.id,!!profile?.is_admin);
  if(action==='list'){
    const {data,error}=await admin.from('pro_stock_feeds').select('id,name,feed_url,format,sync_mode,sector,active,last_run_at,last_success_at,last_error,created_at,updated_at,api_key_hash').eq('owner_id',user.id).order('created_at',{ascending:false});if(error)throw error;
    return json({ok:true,allowed_sector:locked,sector_locked:!!locked,feeds:(data||[]).map((x:any)=>({...x,api_enabled:!!x.api_key_hash,api_key_hash:undefined}))});
  }
  if(action==='create'){
    const name=String(body?.name||'Stock principal').trim().slice(0,100)||'Stock principal';
    const feedUrl=String(body?.feed_url||'').trim()||null;
    const format=['auto','csv','xml','json'].includes(body?.format)?body.format:'auto';
    const syncMode=['full','upsert'].includes(body?.sync_mode)?body.sync_mode:'full';
    const sector=ensureSector(sectorOf(body?.sector),locked);
    const wantsApi=body?.api_enabled!==false;
    let plain:string|null=null,hash:string|null=null;if(wantsApi){plain=newKey();hash=await sha256(plain);}
    if(!feedUrl&&!hash)return json({error:'Ajoute une URL de flux ou active la clé API'},400);
    const {data,error}=await admin.from('pro_stock_feeds').insert({owner_id:user.id,name,feed_url:feedUrl,format,sync_mode:syncMode,sector,api_key_hash:hash,active:true}).select('id,name,feed_url,format,sync_mode,sector,active,created_at').single();if(error)throw error;
    return json({ok:true,feed:data,api_key:plain,api_endpoint:`${SUPABASE_URL}/functions/v1/pro-stock-sync`});
  }
  const id=String(body?.feed_id||'');if(!id)return json({error:'feed_id manquant'},400);
  const {data:feed}=await admin.from('pro_stock_feeds').select('*').eq('id',id).eq('owner_id',user.id).maybeSingle();if(!feed)return json({error:'Flux introuvable'},404);
  if(action==='update'){
    const patch:any={updated_at:new Date().toISOString()};
    if(body?.name!=null)patch.name=String(body.name).trim().slice(0,100)||feed.name;
    if(body?.feed_url!==undefined)patch.feed_url=String(body.feed_url||'').trim()||null;
    if(['auto','csv','xml','json'].includes(body?.format))patch.format=body.format;
    if(['full','upsert'].includes(body?.sync_mode))patch.sync_mode=body.sync_mode;
    if(body?.sector!==undefined)patch.sector=ensureSector(sectorOf(body.sector),locked);
    else if(locked)patch.sector=locked;
    if(typeof body?.active==='boolean')patch.active=body.active;
    const {data,error}=await admin.from('pro_stock_feeds').update(patch).eq('id',id).select('id,name,feed_url,format,sync_mode,sector,active,last_run_at,last_success_at,last_error,updated_at').single();if(error)throw error;return json({ok:true,feed:data});
  }
  if(action==='rotate_key'){
    const plain=newKey();const hash=await sha256(plain);const {error}=await admin.from('pro_stock_feeds').update({api_key_hash:hash,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;return json({ok:true,api_key:plain,api_endpoint:`${SUPABASE_URL}/functions/v1/pro-stock-sync`});
  }
  if(action==='disable_key'){const {error}=await admin.from('pro_stock_feeds').update({api_key_hash:null,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;return json({ok:true});}
  if(action==='delete'){const {error}=await admin.from('pro_stock_feeds').delete().eq('id',id);if(error)throw error;return json({ok:true});}
  if(action==='history'){const {data,error}=await admin.from('pro_stock_sync_runs').select('*').eq('feed_id',id).order('started_at',{ascending:false}).limit(20);if(error)throw error;return json({ok:true,runs:data||[]});}
  return json({error:'Action inconnue'},400);
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:'Erreur'},500);}
});