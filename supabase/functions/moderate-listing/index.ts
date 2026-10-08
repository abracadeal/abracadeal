import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {MODEL,getPhotos,quarantine,scanSafety,recordSafety,enforce,publishPhotos,snapshot} from './safety.ts';

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-internal-moderation-key"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
function normalizeText(value:unknown){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function clamp(n:number){return Math.max(0,Math.min(100,Math.round(n)));}
function extractSubcategory(description:unknown){const m=String(description??'').match(/\[ABRACA_SUB:([^\]]+)\]/i);return m?.[1]||'';}
function cleanUserText(value:unknown){return String(value??'').replace(/\[ABRACA_[^\]]+\]/g,' ').replace(/https?:\/\/\S+/gi,' ').replace(/\s+/g,' ').trim();}
function looksLikeGibberish(value:unknown){const s=normalizeText(cleanUserText(value));if(!s)return false;const letters=s.replace(/[^a-z]/g,'');if(letters.length<8)return false;const vowels=(letters.match(/[aeiouy]/g)||[]).length;const vowelRatio=vowels/letters.length;const longNoVowelToken=s.split(/[^a-z]+/).some(t=>t.length>=8&&!/[aeiouy]/.test(t));const repeated=/(.)\1{4,}/.test(letters);return longNoVowelToken||vowelRatio<0.08||repeated;}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});

    const internalKey=req.headers.get('x-internal-moderation-key')||'';
    let trustedInternal=false;
    if(internalKey){const{data:secret}=await admin.from('integration_secrets').select('secret_value').eq('name','pro_stock_moderation_internal').maybeSingle();trustedInternal=!!secret?.secret_value&&secret.secret_value===internalKey;}

    let caller:any=null;
    let isAdmin=false;
    if(!trustedInternal){
      const authHeader=req.headers.get('Authorization')||'';
      if(!authHeader)return json({error:'Non authentifié'},401);
      const callerClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
      const{data:authData,error:authError}=await callerClient.auth.getUser();
      caller=authData?.user;
      if(authError||!caller)return json({error:'Session invalide'},401);
      const{data:callerProfile}=await admin.from('profiles').select('is_admin').eq('id',caller.id).maybeSingle();
      isAdmin=!!callerProfile?.is_admin;
    }

    const body=await req.json().catch(()=>({}));
    if(trustedInternal&&body?.action==='health')return json({ok:true,openai_configured:!!Deno.env.get('OPENAI_API_KEY')});
    if(trustedInternal&&body?.action==='probe'){
      const testPath='moderation-probe/'+crypto.randomUUID()+'.jpg';
      const sample=await fetch('https://abracadeal.fr/assets/default-listing-photo-20260921.jpg',{signal:AbortSignal.timeout(10000)});
      if(!sample.ok)throw new Error('Photo de test indisponible');
      const bytes=new Uint8Array(await sample.arrayBuffer());
      const {error:uploadError}=await admin.storage.from('listing-images-pending').upload(testPath,bytes,{contentType:'image/jpeg',upsert:false});
      if(uploadError)throw uploadError;
      try{
        const result=await scanSafety(admin,{title:'Voiture à vendre',description:'Véhicule disponible en bon état'},[{id:'probe',storage_path:testPath,storage_bucket:'listing-images-pending'}]);
        return json({ok:true,text_checked:true,images_checked:result.imagesChecked,categories:result.categories});
      }finally{await admin.storage.from('listing-images-pending').remove([testPath]);}
    }
    if(trustedInternal&&body?.action==='quarantine'){
      const {data:rows,error}=await admin.from('listings').select('id,listing_photos(id,storage_path,storage_bucket)').neq('status','active');
      if(error)throw error;
      let count=0;
      for(const l of rows||[]){const photos=l.listing_photos||[];await quarantine(admin,photos);count+=photos.length;}
      return json({ok:true,quarantined:count});
    }
    const listingId=String(body?.listing_id||'').trim();
    if(!listingId)return json({error:'listing_id manquant'},400);

    const{data:listing,error:listingError}=await admin.from('listings').select('id,owner_id,category,title,description,price,city,postal_code,item_condition,seller_type,status,vehicle_make,vehicle_model,vehicle_year,mileage,fuel,transmission,updated_at,vacation_low_price_confirmed_at,vacation_low_price_confirmed_value').eq('id',listingId).single();
    if(listingError||!listing)return json({error:'Annonce introuvable'},404);
    if(!trustedInternal&&listing.owner_id!==caller.id&&!isAdmin)return json({error:'Accès refusé'},403);

    const action=String(body?.action||'moderate');
    if(action==='pharos'){
      if(!isAdmin)return json({error:'Administrateur requis'},403);
      await enforce(admin,listing,'Action Pharos préparée par un administrateur : photos supprimées, compte banni (envoi à confirmer)',true,caller.id);
      return json({ok:true,pharos_submitted:false,portal:'https://www.internet-signalement.gouv.fr/'});
    }
    if(action==='validate'&&!isAdmin)return json({error:'Administrateur requis'},403);
    const {data:blocked,error:blockedError}=await admin.from('listing_moderation').select('safety_blocked').eq('listing_id',listing.id).maybeSingle();
    if(blockedError)throw blockedError;
    if(blocked?.safety_blocked){
      await enforce(admin,listing,'Reprise de la suppression des photos et suspension du compte');
      return json({ok:true,status:'rejected',safety_blocked:true});
    }
    if(!['pending','active'].includes(listing.status))return json({error:'Annonce non éligible à la publication'},409);
    const photos=await getPhotos(admin,listing.id);
    let safety:any;
    try{
      if(listing.status!=='active')await quarantine(admin,photos);
      safety=await scanSafety(admin,listing,photos);
      await recordSafety(admin,listing.id,safety);
    }catch(error){
      if(listing.status!=='active')await quarantine(admin,await getPhotos(admin,listing.id)).catch(()=>{});
      const message=error instanceof Error?error.message:'Analyse indisponible';
      await recordSafety(admin,listing.id,null,message);
      const {error:holdError}=await admin.from('listings').update({status:'pending'}).eq('id',listing.id).eq('updated_at',listing.updated_at);
      if(holdError)throw holdError;
      return json({ok:false,status:'pending',ai_checked:false,ai_error:message});
    }
    const latestPhotos=await getPhotos(admin,listing.id);
    if(JSON.stringify(snapshot(listing,latestPhotos))!==JSON.stringify(safety.snapshot))throw new Error('Photos modifiées pendant l’analyse');
    const {data:fresh,error:freshError}=await admin.from('listings').select('updated_at').eq('id',listing.id).single();
    if(freshError||fresh.updated_at!==listing.updated_at)throw freshError||new Error('Annonce modifiée pendant l’analyse');
    if(safety.categories.length){
      const reason='Contenu sexuel ou violent détecté : '+safety.categories.join(', ');
      await enforce(admin,listing,reason);
      return json({ok:true,status:'rejected',ai_checked:true,risk_level:'red',reasons:[reason],engine:MODEL});
    }
    if(action==='validate'){
      await publishPhotos(admin,listing,photos);
      const authHeader=req.headers.get('Authorization')||'';
      const reviewer=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
      const {error}=await reviewer.rpc('moderate_listing',{p_listing_id:listing.id,p_status:'active'});
      if(error){await quarantine(admin,await getPhotos(admin,listing.id));throw error;}
      return json({ok:true,status:'active',ai_checked:true,engine:MODEL});
    }

    const reasons:string[]=[];
    let score=0;
    let hardHold=false;
    const add=(points:number,reason:string,hard=false)=>{score+=points;if(!reasons.includes(reason))reasons.push(reason);if(hard)hardHold=true;};

    const rawText=`${listing.title||''}\n${listing.description||''}`;
    const text=normalizeText(rawText);

    const paymentTerms:Array<[string,string]>=[['mandat cash','Mention de “mandat cash”'],['transcash','Mention de “Transcash”'],['western union','Mention de “Western Union”'],['pcs','Mention de “PCS”'],['livraison dhl','Formulation “livraison DHL”'],['virement urgent','Demande de virement urgent']];
    for(const[term,label]of paymentTerms){if(text.includes(term)){const negated=new RegExp(`(?:pas|refus|jamais|aucun).{0,24}${term.replace(/\s+/g,'\\s+')}`).test(text);add(negated?5:35,negated?`${label} (formulation de refus)`:label);}}

    const foreignPhone=/(?:\+|00)(?!33\b)[1-9][0-9 .()-]{7,}/.test(rawText);
    if(foreignPhone&&/(whatsapp|telegram|contactez|appelez|message)/i.test(rawText))add(40,'Contact incité vers un numéro étranger');
    if(/(appelez|contactez|telephone|téléphone)/i.test(rawText)&&/\b08\d{8}\b/.test(rawText.replace(/\s/g,'')))add(15,'Numéro commençant par 08 à vérifier');

    const{data:ownerData}=await admin.auth.admin.getUserById(listing.owner_id);
    const ownerEmail=normalizeText(ownerData?.user?.email||'');
    const ownerDomain=ownerEmail.split('@')[1]||'';
    const disposableDomains=['yopmail.com','yopmail.fr','tempmail.com','temp-mail.org','guerrillamail.com','guerrillamail.net','mailinator.com','10minutemail.com','throwawaymail.com','dispostable.com','fakeinbox.com','trashmail.com'];
    if(ownerDomain&&disposableDomains.some(d=>ownerDomain===d||ownerDomain.endsWith(`.${d}`)))add(75,'Adresse e-mail jetable détectée',true);

    if(listing.category==='vehicules'){
      const currentYear=new Date().getFullYear();
      const year=Number(listing.vehicle_year||0);
      const price=Number(listing.price??NaN);
      const mileage=Number(listing.mileage??NaN);
      const condition=normalizeText(listing.item_condition||'');
      const forParts=condition.includes('piece')||condition.includes('reparer')||condition.includes('renover');
      if(Number.isFinite(price)&&price<=0)add(55,'Prix automobile nul ou négatif',true);
      if(Number.isFinite(price)&&price>0&&price<500&&year>=currentYear-5)add(forParts?12:45,'Prix très bas pour un véhicule récent');
      if(Number.isFinite(mileage)&&mileage<0)add(65,'Kilométrage négatif impossible',true);
      if(Number.isFinite(mileage)&&mileage===0&&year>0&&year<currentYear&&!forParts)add(15,'Kilométrage à 0 sur un véhicule non neuf');
      if(year>currentYear+1)add(75,'Année automobile future incohérente',true);
      else if(year===currentYear+1)add(20,'Année modèle future à vérifier');
      if(year>0&&year<1886)add(75,'Année automobile impossible',true);
    }

    if(listing.category==='vacances'){
      const price=Number(listing.price??NaN);
      const confirmedValue=Number(listing.vacation_low_price_confirmed_value??NaN);
      const lowPriceConfirmed=!!listing.vacation_low_price_confirmed_at
        && Number.isFinite(price)
        && Number.isFinite(confirmedValue)
        && confirmedValue===price;
      if(Number.isFinite(price)&&price>=0&&price<10&&!lowPriceConfirmed){
        add(25,'Tarif inférieur à 10 €/nuit à confirmer par l’hôte');
      }
    }

    const cleanTitle=cleanUserText(listing.title);
    const cleanDescription=cleanUserText(listing.description);
    if(cleanTitle.length<5)add(5,'Titre très court');
    if(cleanDescription.length===0)add(12,'Description vide ou quasi absente');
    else if(cleanDescription.length<8)add(10,'Description très courte');
    else if(cleanDescription.length<20)add(5,'Description courte');
    if(looksLikeGibberish(cleanTitle))add(40,'Titre ressemblant à du texte aléatoire');
    if(looksLikeGibberish(cleanDescription))add(35,'Description ressemblant à du texte aléatoire');

    if(listing.category==='immobilier'){
      const subcategory=extractSubcategory(listing.description);
      const price=Number(listing.price??NaN);
      const isSale=['vente-appartement','vente-maison','vente-terrain'].includes(subcategory);
      if(Number.isFinite(price)&&price<=0)add(55,'Prix immobilier nul ou négatif',true);
      else if(isSale&&Number.isFinite(price)&&price>0&&price<5000)add(45,'Prix très bas pour une vente immobilière');
      const metaMatch=String(listing.description||'').match(/\[ABRACA_IMETA:([^\]]+)\]/);
      if(metaMatch){
        try{
          const m=JSON.parse(decodeURIComponent(metaMatch[1]));
          const dpe=String(m?.dpe||'').toUpperCase();
          const ges=String(m?.ges||'').toUpperCase();
          if(dpe&&!['A','B','C','D','E','F','G','NON SOUMIS'].includes(dpe))add(35,'DPE invalide');
          if(ges&&!['A','B','C','D','E','F','G','NON SOUMIS'].includes(ges))add(35,'GES invalide');
          if(['A','B','C','D','E','F','G'].includes(dpe)&&!ges)add(25,'GES manquant');
        }catch(_){add(20,'Diagnostics immobiliers illisibles');}
      }
    }

    let extraTier=0;
    let extraReasons:string[]=[];
    let extraErrorMessage:string|null=null;
    const{data:extraRaw,error:extraError}=await admin.rpc('abraca_detect_listing_risk',{
      p_category:listing.category,
      p_title:listing.title,
      p_description:listing.description,
      p_price:listing.price,
      p_vehicle_year:listing.vehicle_year,
      p_mileage:listing.mileage
    });
    if(extraError){
      extraErrorMessage=extraError.message;
      console.error('abraca_detect_listing_risk RPC error',extraError);
    }else{
      const extra:any=Array.isArray(extraRaw)?extraRaw[0]:extraRaw;
      extraTier=Math.max(0,Math.min(2,Number(extra?.tier||0)));
      extraReasons=Array.isArray(extra?.reasons)?extra.reasons.map((r:unknown)=>String(r)):[];
      for(const reason of extraReasons){if(reason&&!reasons.includes(reason))reasons.push(reason);}
      const extraScore=extraTier===2?95:extraTier===1?60:0;
      score=Math.max(score,extraScore);
    }

    // A changed picture on a previously approved listing must be reviewed by an admin.
    const {data:moderationState,error:moderationStateError}=await admin.from('listing_moderation')
      .select('requires_manual_review').eq('listing_id',listing.id).maybeSingle();
    if(moderationStateError)throw moderationStateError;
    const manualReviewRequired=!!moderationState?.requires_manual_review;
    if(manualReviewRequired)reasons.push('Photos modifiées : validation manuelle requise');

    score=clamp(score);
    let riskLevel:'green'|'orange'|'red'=score<=20?'green':score<=60?'orange':'red';
    if(hardHold&&riskLevel!=='red')riskLevel='red';
    if(extraTier===2)riskLevel='red';
    else if(extraTier===1&&riskLevel==='green')riskLevel='orange';
    if(manualReviewRequired&&riskLevel==='green')riskLevel='orange';
    const qualityCheck=riskLevel==='green'&&Math.random()<0.03;
    if(qualityCheck)reasons.push('Contrôle qualité aléatoire (3 %)');

    let autoPublished=false;
    let finalStatus=listing.status;
    if(extraTier===2){
      if(listing.status==='active'||listing.status==='pending'){
        const{data:updatedRows,error:statusError}=await admin.from('listings').update({status:'rejected'}).eq('id',listing.id).eq('status',listing.status).eq('updated_at',listing.updated_at).select('id');
        if(statusError||!updatedRows?.length)throw statusError||new Error('Annonce modifiée pendant la modération : recommencer');
        finalStatus='rejected';
      }
    }else if(extraTier===1){
      if(listing.status==='active'){
        const{data:updatedRows,error:statusError}=await admin.from('listings').update({status:'pending'}).eq('id',listing.id).eq('status',listing.status).eq('updated_at',listing.updated_at).select('id');
        if(statusError||!updatedRows?.length)throw statusError||new Error('Annonce modifiée pendant la modération : recommencer');
        finalStatus='pending';
      }
    }else if(listing.status==='pending'){
      if(riskLevel==='green'&&!qualityCheck){
        await publishPhotos(admin,listing,photos);
        const{data:updatedRows,error:statusError}=await admin.from('listings').update({status:'active'}).eq('id',listing.id).eq('status','pending').eq('updated_at',listing.updated_at).select('id');
        if(statusError||!updatedRows?.length){await quarantine(admin,await getPhotos(admin,listing.id));throw statusError||new Error('Annonce modifiée pendant la modération : recommencer');}
        finalStatus='active';
        autoPublished=true;
      }else finalStatus='pending';
    }

    const engine=MODEL+'+'+(extraErrorMessage?'abracadeal-rules-only':'abracadeal-rules-only+sql_heuristic_v1');
    const{error:moderationError}=await admin.from('listing_moderation').upsert({listing_id:listing.id,risk_score:score,risk_level:riskLevel,reasons,checked_at:new Date().toISOString(),engine,ai_checked:true,auto_published:autoPublished},{onConflict:'listing_id'});
    if(moderationError)throw moderationError;

    return json({ok:true,listing_id:listing.id,risk_score:score,risk_level:riskLevel,reasons,ai_configured:true,ai_checked:true,ai_error:null,sql_heuristic_tier:extraTier,sql_heuristic_error:extraErrorMessage,auto_published:autoPublished,quality_check:qualityCheck,manual_review_required:manualReviewRequired,status:finalStatus,engine});
  }catch(error){
    console.error(error);
    return json({error:error instanceof Error?error.message:'Erreur de modération'},500);
  }
});
