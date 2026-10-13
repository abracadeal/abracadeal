Deno.serve(async()=>{
  const key=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
  let valid=false,account:any=null;
  if(key){
    try{
      const r=await fetch("https://api.stripe.com/v1/account",{headers:{Authorization:"Bearer "+key}});
      if(r.ok){account=await r.json();valid=true;}
    }catch(_){ }
  }
  const result={
    hasStripeKey:!!key,
    stripeKeyValid:valid,
    keyIsLiveMode:/^(sk|rk)_live_/.test(key),
    accountName:account?.business_profile?.name||account?.settings?.dashboard?.display_name||null
  };
  return new Response(JSON.stringify(result),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
});