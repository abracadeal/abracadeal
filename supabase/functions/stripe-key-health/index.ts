import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.4";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
Deno.serve(async(req)=>{
  const key=Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"";
  let account=null,valid=false;
  if(key){
    try{const r=await fetch("https://api.stripe.com/v1/account",{headers:{Authorization:"Bearer "+key}});
      if(r.ok){account=await r.json();valid=true;}}
    catch(_){}
  }
  let result:any={hasStripeKey:!!key,stripeKeyValid:valid,keyMatchesSiteAbracadealTestAccount:account?.id==="acct_1UFzrk1DkwXb4U3J"};
  const provided=req.headers.get("x-cron-key");
  if(provided&&valid){
    const {data:row}=await db.from("integration_secrets").select("secret_value").eq("name","vacation_email_cron").maybeSingle();
    if(row?.secret_value&&provided===row.secret_value){
      const headers={Authorization:"Bearer "+key};
      const [productsResp,pricesResp]=await Promise.all([
        fetch("https://api.stripe.com/v1/products?limit=100",{headers}),
        fetch("https://api.stripe.com/v1/prices?limit=100",{headers})
      ]);
      // Read-only QA of both actual checkout links and their recurring prices.
      const {data:links,error:linkError}=await db.from("integration_secrets").select("name,secret_value")
        .in("name",["vacation_founder_payment_link_test","vacation_standard_payment_link_test"]);
      const tests:any[]=[];
      for(const name of ["vacation_founder_payment_link_test","vacation_standard_payment_link_test"]){
        const saved=(links||[]).find((v:any)=>v.name===name);
        let test:any={type:name.includes("founder")?"founder_500":"standard",configured:!!saved?.secret_value};
        if(saved?.secret_value){
          try {
            const config=JSON.parse(saved.secret_value);
            const [lr,ir]=await Promise.all([
              fetch("https://api.stripe.com/v1/payment_links/"+encodeURIComponent(config.id),{headers}),
              fetch("https://api.stripe.com/v1/payment_links/"+encodeURIComponent(config.id)+"/line_items?limit=10",{headers})
            ]);
            const link=lr.ok?await lr.json():null;
            const items=ir.ok?await ir.json():null;
            const item=items?.data?.length===1?items.data[0]:null;
            test={...test,validAccount:!!link,active:link?.active===true,
              testMode:link?.livemode===false,urlMatches:link?.url===config.url,
              monthlyPriceEuro:item?.price?.unit_amount===499&&item?.price?.currency==="eur"&&item?.price?.recurring?.interval==="month",
              quantityOne:Number(item?.quantity)===1,
              trialDays:Number(link?.subscription_data?.trial_period_days||0),
              valid:!!link&&link.active===true&&link.livemode===false&&link.url===config.url
                &&item?.price?.unit_amount===499&&item?.price?.currency==="eur"
                &&item?.price?.recurring?.interval==="month"&&Number(item?.quantity)===1
                &&Number(link?.subscription_data?.trial_period_days||0)===(name.includes("founder")?365:0)};
          } catch(_){test={...test,error:"Stripe link validation unavailable"};}
        }
        tests.push(test);
      }
      const wh=await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=30",{headers});
      const webhookEndpoints=wh.ok?(await wh.json()).data:[];
      const expectedWebhook="https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/stripe-promotion-webhook";
      const webhook=webhookEndpoints.find((x:any)=>x.url===expectedWebhook&&x.status==="enabled");
      result={...result,vacationLinkChecks:tests,configuredLinksReadable:!linkError,
        webhookEnabled:!!webhook,webhookReceivesCheckout:!!webhook?.enabled_events?.includes("checkout.session.completed"),
        allVacationLinksValid:tests.length===2&&tests.every(x=>x.valid===true),
        actualStripeAccountId:account.id,accountName:account.business_profile?.name||null,
        products:productsResp.ok?(await productsResp.json()).data.map((v:any)=>({id:v.id,name:v.name,active:v.active})):null,
        prices:pricesResp.ok?(await pricesResp.json()).data.filter((v:any)=>v.recurring).map((v:any)=>({id:v.id,product:v.product,amount:v.unit_amount,currency:v.currency,interval:v.recurring.interval,active:v.active})):null
      };
    }
  }
  return new Response(JSON.stringify(result),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
});