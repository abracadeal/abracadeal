import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {readPreviewFeed,normalizeRows} from './readers.ts';
import {makePreviewHandler} from './handler.ts';

Deno.serve(makePreviewHandler({
  authorize:async req=>{
    const authorization=req.headers.get('Authorization');
    if(!authorization)return false;
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,
      {global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:{user},error}=await client.auth.getUser();
    if(error||!user)return false;
    const {data:profile,error:profileError}=await client.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
    return !profileError&&profile?.is_admin===true;
  },
  read:async(url,sector)=>{
    const raw=await readPreviewFeed({feed_url:url,sector,format:'auto'});
    return {raw,rows:await normalizeRows(raw,sector),sector,platform:(raw as any).platform||null,
      partial:!!(raw as any).partial,photos_withheld:!!(raw as any).photos_withheld,
      source_total:(raw as any).source_total??null,source_pages:(raw as any).source_pages??null,
      connector_id:(raw as any).connector_id||null,reader_used:(raw as any).reader_used||null};
  }
}));
