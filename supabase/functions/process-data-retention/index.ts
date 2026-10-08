import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { handleRetention } from './worker.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
async function sendNotice(email:string,id:string) {
 const key=Deno.env.get('RESEND_API_KEY');if(!key)throw new Error('RESEND_API_KEY absent : aucun préavis ni aucune clôture');
 const text="Votre compte Abracadeal n'a pas été utilisé depuis plus de deux ans. Il sera fermé dans 30 jours. Pour le conserver, connectez-vous sur https://abracadeal.fr pendant ce délai, ou écrivez à contact@abracadeal.fr. Les données nécessaires aux obligations légales resteront en archive restreinte selon notre politique de confidentialité : https://abracadeal.fr/confidentialite.html#conservation";
 const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),
  headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`retention-notice-${id}-${new Date().toISOString().slice(0,10)}`},
  body:JSON.stringify({from:'Abracadeal <contact@abracadeal.fr>',to:[email],subject:'Votre compte Abracadeal : préavis de fermeture pour inactivité',text})});
 if(!response.ok)throw new Error(`Préavis non envoyé (HTTP ${response.status})`);
}
// JWT verification is replaced with a dedicated secret checked before any action.
Deno.serve(req=>handleRetention(req,admin,sendNotice));
