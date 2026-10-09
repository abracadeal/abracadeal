
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);

const DEFAULT_SUBJECT='Abracadeal — offre Fondateurs';
const DEFAULT_BODY=`Bonjour,

Je me permets de vous contacter au sujet de {{societe}}.
Abracadeal est une nouvelle plateforme de petites annonces ouverte aux particuliers comme aux professionnels.

Pour les petits garages qui souhaitent tester avec une dizaine ou une vingtaine de véhicules, les 500 premiers professionnels inscrits bénéficient de jusqu’à 20 annonces actives gratuites pendant 12 mois, avec 15 photos par annonce.

Vos annonces peuvent être importées directement par flux, CSV ou XML, sans ressaisie.

Sans engagement de durée : pas de contrat de 12 mois. Vous restez parce que ça marche, pas parce que vous êtes engagé, et vous résiliez en un clic depuis votre espace.

Les tarifs détaillés sont visibles dès la création de votre compte Pro.

Découvrir l’offre Fondateurs :
https://abracadeal.fr/pro-fondateur.html

Les places Fondateurs restantes sont affichées directement sur le site. Si vous avez une question, vous pouvez simplement répondre à ce mail.

Bien cordialement,
Service Pros Abracadeal
contact@abracadeal.fr`;

let gmailToken=null,gmailEmail=null,tokenClient=null,stopRequested=false,sending=false,allRows=[];

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function cleanEmail(v){return String(v||'').trim().toLowerCase()}
function normKey(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function isEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function tpl(v,row){return String(v||'').replaceAll('{{societe}}',row?.company||'votre entreprise')}
function show(id,msg,type=''){const el=$(id);el.style.display='block';el.className='notice '+type;el.textContent=msg}
function localMidnightIso(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString()}
function safeHeader(v){return String(v||'').replace(/[\r\n]/g,' ').trim()}
function base64UrlUtf8(str){
  const bytes=new TextEncoder().encode(str);
  let bin=''; const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) bin+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function encodedSubject(str){
  const bytes=new TextEncoder().encode(str);let bin='';
  for(let i=0;i<bytes.length;i+=0x8000) bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return '=?UTF-8?B?'+btoa(bin)+'?=';
}

async function logAction(prospectId,action,detail=''){
  await sb.from('prospection_logs').insert({prospect_id:prospectId,action,detail:String(detail||'').slice(0,2000)});
}

async function loadMetrics(){
  const [{count:total},{count:ready},{count:stop},{count:today}]=await Promise.all([
    sb.from('prospection_prospects').select('*',{count:'exact',head:true}),
    sb.from('prospection_prospects').select('*',{count:'exact',head:true}).eq('status','ready'),
    sb.from('prospection_prospects').select('*',{count:'exact',head:true}).eq('status','opted_out'),
    sb.from('prospection_prospects').select('*',{count:'exact',head:true}).eq('status','sent').gte('sent_at',localMidnightIso())
  ]);
  $('mTotal').textContent=total||0;$('mReady').textContent=ready||0;$('mStop').textContent=stop||0;$('mToday').textContent=today||0;
  return {total:total||0,ready:ready||0,stop:stop||0,today:today||0};
}

async function loadProspects(){
  let q=sb.from('prospection_prospects').select('*').order('created_at',{ascending:false}).limit(300);
  const st=$('statusFilter').value;if(st)q=q.eq('status',st);
  const cat=$('categoryFilter').value;if(cat)q=q.eq('category',cat);
  const {data,error}=await q;
  if(error){$('prospectsBody').innerHTML='<tr><td colspan="7">Erreur : '+esc(error.message)+'</td></tr>';return}
  allRows=data||[];
  $('prospectsBody').innerHTML=allRows.length?allRows.map(r=>`<tr>
    <td><b>${esc(r.company)}</b></td>
    <td>${esc(r.email)}</td>
    <td>${esc(r.category||'—')}</td>
    <td>${esc(r.city||'—')}</td>
    <td><span class="pill ${esc(r.status)}">${esc(({ready:'Prêt',sent:'Envoyé',error:'Erreur',opted_out:'STOP',paused:'Pause',sending:'Envoi'})[r.status]||r.status)}</span></td>
    <td>${r.sent_at?new Date(r.sent_at).toLocaleString('fr-FR'):'—'}</td>
    <td>${r.status==='opted_out'
      ?'<button class="btn" onclick="restoreProspect(\''+r.id+'\')">Réactiver</button>'
      :'<button class="btn red" onclick="markStop(\''+r.id+'\')">STOP</button>'}
    </td>
  </tr>`).join(''):'<tr><td colspan="7" class="muted">Aucun prospect.</td></tr>';
}

async function refresh(){await Promise.all([loadMetrics(),loadProspects()])}

async function markStop(id){
  if(!confirm('Ajouter ce prospect à la liste d’opposition ? Il ne sera plus envoyé.'))return;
  const {error}=await sb.from('prospection_prospects').update({status:'opted_out',opted_out_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  if(!error)await logAction(id,'opt_out','Opposition enregistrée manuellement');
  await refresh();
}
async function restoreProspect(id){
  if(!confirm('Réactiver ce prospect ?'))return;
  const {error}=await sb.from('prospection_prospects').update({status:'ready',opted_out_at:null,updated_at:new Date().toISOString()}).eq('id',id);
  if(!error)await logAction(id,'reactivated','Prospect réactivé manuellement');
  await refresh();
}
window.markStop=markStop;window.restoreProspect=restoreProspect;

function mapRecord(obj){
  const m={};Object.entries(obj||{}).forEach(([k,v])=>m[normKey(k)]=v);
  const pick=(...keys)=>{for(const k of keys){if(m[k]!==undefined&&m[k]!==null&&String(m[k]).trim()!=='')return String(m[k]).trim()}return ''};
  const email=cleanEmail(pick('email','e-mail','courriel','mail','adressemail'));
  return {
    company:pick('societe','entreprise','nomdelasociete','nomentreprise','nom','company'),
    email,
    category:pick('categorie','category'),
    city:pick('ville','city'),
    department:pick('departement','dept','department'),
    phone:pick('telephone','tel','phone'),
    source:pick('source'),
    source_url:pick('url','sourceurl','site','siteweb','website'),
    status:'ready',
    updated_at:new Date().toISOString()
  };
}

async function importFile(){
  const file=$('fileInput').files[0];if(!file){show('importMsg','Choisis d’abord un fichier.','err');return}
  $('importBtn').disabled=true;$('importBtn').textContent='Import…';
  try{
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const json=XLSX.utils.sheet_to_json(ws,{defval:''});
    const mapped=json.map(mapRecord).filter(r=>r.company&&isEmail(r.email));
    if(!mapped.length)throw new Error('Aucune ligne valide trouvée. Vérifie les colonnes Société et Email.');
    const unique=[...new Map(mapped.map(r=>[r.email,r])).values()];
    let inserted=0,skipped=0,errors=0;
    for(let i=0;i<unique.length;i+=100){
      const batch=unique.slice(i,i+100);
      const {data:existing,error:e1}=await sb.from('prospection_prospects').select('email').in('email',batch.map(x=>x.email));
      if(e1)throw e1;
      const exists=new Set((existing||[]).map(x=>x.email));
      const fresh=batch.filter(x=>!exists.has(x.email));skipped+=batch.length-fresh.length;
      if(fresh.length){
        const {error}=await sb.from('prospection_prospects').insert(fresh);
        if(error){errors+=fresh.length}else inserted+=fresh.length;
      }
    }
    show('importMsg',inserted+' prospect(s) importé(s), '+skipped+' doublon(s) ignoré(s)'+(errors?', '+errors+' erreur(s)':'')+'.','ok');
    await refresh();
  }catch(e){show('importMsg','Erreur import : '+(e.message||e),'err')}
  $('importBtn').disabled=false;$('importBtn').textContent='Importer';
}

function saveLocal(){
  localStorage.setItem('abr_google_client_id',$('googleClientId').value.trim());
  localStorage.setItem('abr_prospect_subject',$('subjectTpl').value);
  localStorage.setItem('abr_prospect_body',$('bodyTpl').value);
  localStorage.setItem('abr_prospect_daily_limit',String(Math.min(100,Math.max(1,Number($('dailyLimit').value)||50))));
}

function initGmail(){
  const clientId=$('googleClientId').value.trim();
  if(!clientId){show('gmailState','Renseigne d’abord le Google OAuth Client ID.','err');return}
  if(!window.google?.accounts?.oauth2){show('gmailState','Google Identity n’est pas encore chargé. Réessaie dans quelques secondes.','err');return}
  tokenClient=google.accounts.oauth2.initTokenClient({
    client_id:clientId,
    scope:'openid email https://www.googleapis.com/auth/gmail.send',
    callback:async resp=>{
      if(resp.error){show('gmailState','Connexion Gmail refusée : '+resp.error,'err');return}
      gmailToken=resp.access_token;
      try{
        const u=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+gmailToken}});
        const info=await u.json();gmailEmail=info.email||null;
      }catch(_){gmailEmail=null}
      show('gmailState','Gmail connecté'+(gmailEmail?' : '+gmailEmail:'')+'. Prêt à envoyer.','ok');
    }
  });
  tokenClient.requestAccessToken({prompt:'consent'});
}

async function sendOne(row){
  const subject=safeHeader(tpl($('subjectTpl').value,row));
  const body=tpl($('bodyTpl').value,row);
  const headers=[
    gmailEmail?'From: Abracadeal <'+safeHeader(gmailEmail)+'>':null,
    'Reply-To: contact@abracadeal.fr',
    'To: '+safeHeader(row.email),
    'Subject: '+encodedSubject(subject),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body
  ].filter(x=>x!==null).join('\r\n');
  const raw=base64UrlUtf8(headers);
  const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
    method:'POST',
    headers:{Authorization:'Bearer '+gmailToken,'Content-Type':'application/json'},
    body:JSON.stringify({raw})
  });
  const out=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(out?.error?.message||('Gmail HTTP '+res.status));
  return out;
}

async function sendBatch(){
  if(sending)return;
  if(!gmailToken){show('sendMsg','Connecte Gmail avant l’envoi.','err');return}
  const metrics=await loadMetrics();
  const requested=Math.min(100,Math.max(1,Number($('dailyLimit').value)||50));
  const remaining=Math.max(0,requested-metrics.today);
  if(!remaining){show('sendMsg','Limite du jour atteinte ('+requested+').','err');return}
  const cat=$('categoryFilter').value;
  let q=sb.from('prospection_prospects').select('*').eq('status','ready').order('created_at',{ascending:true}).limit(remaining);
  if(cat)q=q.eq('category',cat);
  const {data,error}=await q;
  if(error){show('sendMsg','Erreur : '+error.message,'err');return}
  const rows=data||[];
  if(!rows.length){show('sendMsg','Aucun prospect prêt pour ce filtre.','err');return}
  if(!confirm('Envoyer '+rows.length+' e-mail(s) maintenant via Gmail ?'))return;

  sending=true;stopRequested=false;$('sendBatchBtn').disabled=true;$('stopBatchBtn').disabled=false;
  let sent=0,failed=0;
  for(let i=0;i<rows.length;i++){
    if(stopRequested)break;
    const r=rows[i];
    $('batchInfo').textContent='Envoi '+(i+1)+' / '+rows.length+' — '+r.company;
    $('progressBar').style.width=Math.round((i/rows.length)*100)+'%';
    await sb.from('prospection_prospects').update({status:'sending',updated_at:new Date().toISOString()}).eq('id',r.id);
    try{
      const out=await sendOne(r);
      const now=new Date().toISOString();
      await sb.from('prospection_prospects').update({status:'sent',sent_at:now,sent_from:gmailEmail,gmail_message_id:out.id||null,last_error:null,updated_at:now}).eq('id',r.id);
      await logAction(r.id,'sent','Gmail message '+(out.id||''));
      sent++;
    }catch(e){
      failed++;
      const msg=String(e.message||e);
      await sb.from('prospection_prospects').update({status:'error',last_error:msg.slice(0,1000),updated_at:new Date().toISOString()}).eq('id',r.id);
      await logAction(r.id,'error',msg);
      if(/quota|rate|429|401|403|invalid|auth/i.test(msg)){show('sendMsg','Envoi interrompu par Gmail : '+msg,'err');break}
    }
    $('progressBar').style.width=Math.round(((i+1)/rows.length)*100)+'%';
    await sleep(4000);
  }
  sending=false;$('sendBatchBtn').disabled=false;$('stopBatchBtn').disabled=true;
  $('batchInfo').textContent='Maximum 100 e-mails/jour depuis cet outil.';
  show('sendMsg',sent+' envoyé(s), '+failed+' erreur(s)'+(stopRequested?', lot arrêté':'')+'.',failed?'err':'ok');
  await refresh();
}

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user){$('lock').style.display='block';$('lockText').textContent='Connecte-toi avec ton compte administrateur.';return}
  const {data:profile,error}=await sb.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();
  if(error||!profile?.is_admin){$('lock').style.display='block';$('lockText').textContent='Ce compte ne possède pas les droits administrateur.';return}
  $('app').style.display='block';$('lock').style.display='none';

  $('googleClientId').value=localStorage.getItem('abr_google_client_id')||'';
  if(localStorage.getItem('abr_prospect_template_version')!=='5'){
    localStorage.setItem('abr_prospect_subject',DEFAULT_SUBJECT);
    localStorage.setItem('abr_prospect_body',DEFAULT_BODY);
    localStorage.setItem('abr_prospect_template_version','5');
  }
  $('subjectTpl').value=localStorage.getItem('abr_prospect_subject')||DEFAULT_SUBJECT;
  $('bodyTpl').value=localStorage.getItem('abr_prospect_body')||DEFAULT_BODY;
  $('dailyLimit').value=localStorage.getItem('abr_prospect_daily_limit')||'50';
  await refresh();
}

$('importBtn').addEventListener('click',importFile);
$('saveClientBtn').addEventListener('click',()=>{saveLocal();show('gmailState','Client ID enregistré sur cet appareil.','ok')});
$('gmailBtn').addEventListener('click',()=>{saveLocal();initGmail()});
$('saveTplBtn').addEventListener('click',()=>{saveLocal();show('sendMsg','Modèle enregistré sur cet appareil.','ok')});
$('previewBtn').addEventListener('click',()=>{
  const sample=allRows.find(x=>x.status==='ready')||allRows[0]||{company:'Riviera Auto Cannes'};
  $('previewBox').style.display='block';$('previewBox').textContent='OBJET : '+tpl($('subjectTpl').value,sample)+'\n\n'+tpl($('bodyTpl').value,sample);
});
$('sendBatchBtn').addEventListener('click',()=>{saveLocal();sendBatch()});
$('stopBatchBtn').addEventListener('click',()=>{stopRequested=true;$('stopBatchBtn').disabled=true});
$('refreshBtn').addEventListener('click',refresh);
$('statusFilter').addEventListener('change',loadProspects);
$('categoryFilter').addEventListener('change',loadProspects);
$('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.href='index.html'});
boot();
