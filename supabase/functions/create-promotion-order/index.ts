import {requireConsent,checkOptionListing,checkoutLegalText,WITHDRAWAL_TEXT} from './payment-guard.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});

type Pack={audience:"particulier"|"professionnel";max:number;amount:number;link:string;paymentLinkId:string;creditPack?:boolean;stripePriceId?:string;scope?:string};
const PACKS:Record<string,Pack>={
 equipment_7d:{audience:"particulier",max:1,amount:499,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcSy1DkwXb4U3J74VBPtdz",scope:"equipment"},
 equipment_30d:{audience:"particulier",max:1,amount:999,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcT01DkwXb4U3JTbtQ6r3y",scope:"equipment"},
 equipment_urgent_30d:{audience:"particulier",max:1,amount:199,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcT21DkwXb4U3JWFGJOC9T",scope:"equipment"},
 auto_7d:{audience:"particulier",max:1,amount:1990,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcaD1DkwXb4U3JNSNTKR22",scope:"auto"},
 auto_30d:{audience:"particulier",max:1,amount:4990,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcaF1DkwXb4U3J9VSRz3TD",scope:"auto"},
 auto_urgent_30d:{audience:"particulier",max:1,amount:499,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcaH1DkwXb4U3JAS3cFyVJ",scope:"auto"},
 immo_30d:{audience:"particulier",max:1,amount:4990,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcT41DkwXb4U3JrwKzrCn3",scope:"immo"},
 immo_urgent_30d:{audience:"particulier",max:1,amount:990,link:"",paymentLinkId:"checkout_session",stripePriceId:"price_1UMcT71DkwXb4U3JT5J88IPM",scope:"immo"},
 photo_12:{audience:"particulier",max:1,amount:499,link:"https://buy.stripe.com/test_6oU00b5hk2r35wDbLHgrS07",paymentLinkId:"plink_1UG4FF1DkwXb4U3Jcn1EITgk"},
 photo_30_pro:{audience:"professionnel",max:1,amount:499,link:"https://buy.stripe.com/test_eVq9ALaBE0iV9MT2b7grS08",paymentLinkId:"plink_1UG4mp1DkwXb4U3JTOscYv6D"},
 private_7d:{audience:"particulier",max:1,amount:999,link:"https://buy.stripe.com/test_6oUfZ9bFI1mZ6AH7vrgrS00",paymentLinkId:"plink_1UG0Lr1DkwXb4U3J43QCfbPM"},
 private_30d:{audience:"particulier",max:1,amount:1999,link:"https://buy.stripe.com/test_8x27sD4dg8Pr6AHbLHgrS01",paymentLinkId:"plink_1UG0Ly1DkwXb4U3J5XhYN9kQ"},
 pro_5_7d:{audience:"professionnel",max:5,amount:3990,link:"https://buy.stripe.com/test_00w3cn1140iV9MTcPLgrS0t",paymentLinkId:"plink_1UH7zk1DkwXb4U3J53b2hf26",creditPack:true},
 pro_10_7d:{audience:"professionnel",max:10,amount:6990,link:"https://buy.stripe.com/test_dRm4grfVYc1De395njgrS0u",paymentLinkId:"plink_1UH7zm1DkwXb4U3JQCbUWbNf",creditPack:true},
 pro_5_30d:{audience:"professionnel",max:5,amount:7990,link:"https://buy.stripe.com/test_aFa4grfVYc1D1gn8zvgrS0v",paymentLinkId:"plink_1UH7zs1DkwXb4U3JPGG01o5Y",creditPack:true},
 pro_10_30d:{audience:"professionnel",max:10,amount:12990,link:"https://buy.stripe.com/test_fZueV5bFI4zbaQX4jfgrS0w",paymentLinkId:"plink_1UH7zx1DkwXb4U3JkBFbMZk2",creditPack:true}
};

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return json({error:"Connexion requise"},401);
  const {data:authData,error:authError}=await admin.auth.getUser(token);
  const user=authData?.user;
  if(authError||!user)return json({error:"Session invalide"},401);

  const body=await req.json().catch(()=>({}));requireConsent(body);
  const packCode=String(body?.pack_code||"").trim();
  const pack=PACKS[packCode];
  if(!pack)return json({error:"Pack inconnu"},400);

  const {data:profile,error:profileError}=await admin.from("profiles").select("account_type").eq("id",user.id).single();
  if(profileError||!profile)return json({error:"Profil introuvable"},400);
  if(profile.account_type!==pack.audience)return json({error:"Ce pack ne correspond pas à votre type de compte"},403);

  if(pack.audience==="professionnel"){
    const {data:v}=await admin.from("pro_verifications").select("user_id").eq("user_id",user.id).maybeSingle();
    if(!v)return json({error:"Compte professionnel non vérifié"},403);
  }

  const rawIds=Array.isArray(body?.listing_ids)?body.listing_ids:[];
  const listingIds=Array.from(new Set(rawIds.map((x:unknown)=>String(x).trim()).filter(Boolean)));

  if(pack.creditPack){
    if(listingIds.length!==1)return json({error:"Choisissez une annonce à vérifier avant l’achat de crédits."},400);
  }else{
    if(listingIds.length<1||listingIds.length>pack.max)return json({error:`Sélectionnez entre 1 et ${pack.max} annonce(s)`},400);
    const {data:listings,error:listingsError}=await admin.from("listings").select("id,owner_id,status,seller_type,photo_limit,category,description").in("id",listingIds);
    if(listingsError)throw listingsError;
    if(!listings||listings.length!==listingIds.length)return json({error:"Une ou plusieurs annonces sont introuvables"},400);
    for(const listing of listings){
      if(listing.owner_id!==user.id)return json({error:"Vous ne pouvez acheter une option que pour vos propres annonces"},403);
      if(["rejected","archived"].includes(String(listing.status)))return json({error:"Une annonce sélectionnée n’est pas éligible"},400);
      if(packCode==="photo_12"&&Number(listing.photo_limit||3)>=12)return json({error:"Le pack Photos est déjà actif sur cette annonce"},400);
      if(packCode==="photo_30_pro"&&Number(listing.photo_limit||15)>=30)return json({error:"Le pack Photos Pro est déjà actif sur cette annonce"},400);
      if(pack.scope){const category=String(listing.category||"").toLowerCase();const sub=String(String(listing.description||"").match(/\[ABRACA_SUB:([^\]]+)\]/)?.[1]||"").toLowerCase();const scope=category==="immobilier"?"immo":(category==="vehicules"&&sub==="voitures"?"auto":"equipment");if(scope!==pack.scope)return json({error:"Ce tarif ne correspond pas à la catégorie de cette annonce"},400);}
    }
  }

  for(const id of listingIds){
   const {data:l}=await admin.from('listings').select('owner_id').eq('id',id).single();if(l?.owner_id!==user.id)return json({error:'Annonce non éligible'},403);
   await checkOptionListing(admin,SUPABASE_URL,id);
  }
  const {data:order,error:orderError}=await admin.from("promotion_orders").insert({
    owner_id:user.id,
    pack_code:packCode,
    amount_cents:pack.amount,
    currency:"eur",
    selected_count:pack.creditPack?pack.max:listingIds.length,
    status:"pending",
    withdrawal_accepted_at:new Date().toISOString(),withdrawal_text:WITHDRAWAL_TEXT,
    stripe_payment_link_id:pack.paymentLinkId
  }).select("id").single();
  if(orderError||!order)throw orderError||new Error("Commande non créée");

  if(!pack.creditPack){
    const {error:itemsError}=await admin.from("promotion_order_items").insert(listingIds.map(listing_id=>({order_id:order.id,listing_id})));
    if(itemsError){
      await admin.from("promotion_orders").delete().eq("id",order.id);
      throw itemsError;
    }
  }

  {
    if(!pack.stripePriceId){
     const k=Deno.env.get('STRIPE_SECRET_KEY')||Deno.env.get('STRIPE_RESTRICTED_KEY')||'';
     const r=await fetch('https://api.stripe.com/v1/payment_links/'+encodeURIComponent(pack.paymentLinkId)+'/line_items',{headers:{Authorization:'Bearer '+k}});
     const d=await r.json();if(!r.ok||d.data?.length!==1||Number(d.data[0].price?.unit_amount)!==pack.amount)throw new Error('Tarif Stripe incohérent');
     pack.stripePriceId=d.data[0].price.id;
    }
    const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
    if(!stripeKey)throw new Error("Paiement Stripe indisponible");
    const params=new URLSearchParams();checkoutLegalText(params);
    params.set("mode","payment");
    params.set("client_reference_id",order.id);
    params.set("line_items[0][price]",pack.stripePriceId);
    params.set("line_items[0][quantity]","1");
    params.set("success_url","https://abracadeal.fr/?payment=success");
    params.set("cancel_url","https://abracadeal.fr/");
    if(user.email)params.set("customer_email",user.email);
    const stripeResponse=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{"Authorization":"Bearer "+stripeKey,"Content-Type":"application/x-www-form-urlencoded"},body:params});
    const session=await stripeResponse.json();
    if(!stripeResponse.ok||!session?.url)throw new Error("Stripe: "+(session?.error?.message||"création du paiement impossible"));
    await admin.from("promotion_orders").update({stripe_checkout_session_id:session.id,stripe_payment_link_id:"checkout_session"}).eq("id",order.id);
    return json({ok:true,order_id:order.id,credit_pack:false,credits:0,checkout_url:session.url});
  }

 }catch(error){
  console.error(error);
  return json({error:error instanceof Error?error.message:"Erreur lors de la création de la commande"},500);
 }
});
