
(()=>{
const SUPABASE_URL='https://jplzvxmpbpjssyinozap.supabase.co';
const SUPABASE_KEY='sb_publishable_lUCkpzyw0kQCs9AWraNjzw_2CoT0JeF';
const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
let user=null,conversations=[],currentId=null,pollTimer=null;

function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
function fmt(v){try{return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return ''}}

async function init(){
  if(!sb){$('#loggedOut').hidden=false;return}
  const {data}=await sb.auth.getSession();
  user=data?.session?.user||null;
  if(!user){$('#loggedOut').hidden=false;$('#messagesShell').hidden=true;return}
  $('#loggedOut').hidden=true;$('#messagesShell').hidden=false;
  await loadList();
  startPolling();
}

async function loadList(preferred=null){
  if(!user)return;
  const {data,error}=await sb.rpc('get_my_conversations');
  if(error){toast(error.message||'Messagerie indisponible');return}
  const all=data||[];
  if(!all.length){renderList([]);return}
  const ids=[...new Set(all.map(x=>x.listing_id).filter(Boolean))];
  let vacationIds=new Set();
  if(ids.length){
    const {data:rows,error:listError}=await sb.from('listings').select('id').eq('category','vacances').in('id',ids);
    if(listError){console.warn(listError)}
    else vacationIds=new Set((rows||[]).map(x=>x.id));
  }
  conversations=all.filter(x=>vacationIds.has(x.listing_id));
  renderList(conversations);
  const target=preferred||currentId||(!matchMedia('(max-width:720px)').matches?conversations[0]?.conversation_id:null);
  if(target && conversations.some(x=>x.conversation_id===target)) await selectConversation(target,false);
  else if(!conversations.length){
    currentId=null;
    $('#chatHead').innerHTML='<b>Aucun message Vacances</b><span>Vos futurs échanges avec voyageurs ou hôtes apparaîtront ici.</span>';
    $('#thread').innerHTML='<div class="vac-empty">Aucune conversation Vacances pour le moment.</div>';
    $('#messageForm').classList.add('hidden');
  }
}
function renderList(rows){
  const list=$('#conversationList');
  if(!rows.length){list.innerHTML='<div class="vac-empty">Aucune conversation Vacances pour le moment.</div>';return}
  list.innerHTML=rows.map(c=>{
    const unread=Number(c.unread_count||0);
    return '<button class="vac-conv '+(c.conversation_id===currentId?'active':'')+'" type="button" data-conv="'+esc(c.conversation_id)+'">'+
      '<div class="vac-conv-top"><span class="vac-conv-name">'+esc(c.other_user_name||'Utilisateur Abracadeal')+'</span>'+(unread?'<span class="vac-conv-unread">'+Math.min(unread,99)+'</span>':'')+'</div>'+
      '<div class="vac-conv-title">'+esc(c.listing_title||'Location de vacances')+'</div>'+
      '<div class="vac-conv-preview">'+esc(c.last_message||'Nouvelle conversation')+'</div></button>';
  }).join('');
}
async function selectConversation(id,scroll=true){
  currentId=id;
  document.querySelectorAll('.vac-conv').forEach(el=>el.classList.toggle('active',el.dataset.conv===id));
  const conv=conversations.find(x=>x.conversation_id===id);
  $('#chatHead').innerHTML='<b>'+esc(conv?.other_user_name||'Utilisateur Abracadeal')+'</b><span>'+esc(conv?.listing_title||'Location de vacances')+'</span>';
  $('#messageForm').classList.remove('hidden');
  $('#messagesShell').classList.add('mobile-chat-open');
  await loadMessages(scroll);
}
async function loadMessages(scroll=true){
  if(!currentId||!user)return;
  const {data,error}=await sb.rpc('get_conversation_messages',{p_conversation_id:currentId});
  if(error){toast(error.message||'Impossible de charger les messages');return}
  const rows=data||[],thread=$('#thread');
  thread.innerHTML=rows.length?rows.map(m=>'<div class="vac-bubble '+(m.sender_id===user.id?'mine':'')+'">'+esc(m.body)+'<span class="vac-bubble-time">'+esc(fmt(m.created_at))+'</span></div>').join(''):'<div class="vac-empty">Aucun message. Écrivez le premier.</div>';
  if(scroll)thread.scrollTop=thread.scrollHeight;
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-conv]');
  if(btn)selectConversation(btn.dataset.conv,true);
});
$('#chatBack').addEventListener('click',()=>$('#messagesShell').classList.remove('mobile-chat-open'));
$('#refreshBtn').addEventListener('click',()=>loadList(currentId));
$('#messageForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentId||!user)return;
  const input=$('#messageInput'),body=input.value.trim();
  if(!body)return;
  const send=e.submitter;send.disabled=true;send.textContent='Envoi…';
  const {error}=await sb.rpc('send_message',{p_conversation_id:currentId,p_body:body});
  send.disabled=false;send.textContent='Envoyer';
  if(error){toast(error.message||'Message non envoyé');return}
  input.value='';
  await loadMessages(true);
  await loadList(currentId);
});
$('#messageInput').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,96)+'px'});
function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(async()=>{if(document.visibilityState==='visible'){await loadList(currentId);if(currentId)await loadMessages(false)}},7000);
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadList(currentId)});
init();
})();
