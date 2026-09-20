(()=>{
  const URL='https://jplzvxmpbpjssyinozap.supabase.co';
  const KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
  let client=null;
  try{if(typeof sb!=='undefined'&&sb?.auth)client=sb}catch(_){}
  try{if(!client&&typeof sbVac!=='undefined'&&sbVac?.auth)client=sbVac}catch(_){}
  if(!client&&window.supabase){
    client=window.supabase.createClient(URL,KEY);
  }
  if(!client)return;

  let busy=false,lastPing=0;
  async function touch(force=false){
    if(busy)return;
    if(document.visibilityState==='hidden'&&!force)return;
    const now=Date.now();
    if(!force&&now-lastPing<30000)return;
    busy=true;
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session?.user)return;
      await client.rpc('touch_user_presence',{p_page:(location.pathname+location.search).slice(0,200)});
      lastPing=Date.now();
    }catch(_){}
    finally{busy=false}
  }

  touch(true);
  setInterval(()=>touch(false),45000);
  window.addEventListener('focus',()=>touch(true));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')touch(true)});
  try{client.auth.onAuthStateChange((_event,session)=>{if(session?.user)setTimeout(()=>touch(true),0)})}catch(_){}
})();