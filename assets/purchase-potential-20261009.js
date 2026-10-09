// Abracadeal — Potentiel d'achat (09/10/2026)
// 1) Acheteur : 3 questions facultatives au premier message (Auto/Moto et Immobilier).
// 2) Vendeur : page « Mes contacts » avec étiquette Fort / Moyen / Faible et suivi du contact.
// Données côté Supabase : table conversation_leads + fonctions set_conversation_lead,
// set_contact_status, get_my_contacts (le score est calculé côté serveur).
(function(){
  'use strict';
  if(typeof sb==='undefined'||!sb) return;

  const LEAD_CATEGORIES=['vehicules','immobilier'];
  const TIMELINE={immediate:'Achat immédiat',under_1_month:'Sous 1 mois','1_3_months':'1 à 3 mois',browsing:'Se renseigne'};
  const FINANCING={cash:'Comptant',credit:'Crédit',undecided:'Financement à définir'};
  const STATUS={new:'Nouveau',called:'Rappelé',meeting:'RDV',sold:'Vendu',lost:'Perdu'};
  const LEVEL={fort:'Fort',moyen:'Moyen',faible:'Faible'};
  const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  const style=document.createElement('style');
  style.textContent=`
  .lead-panel{border:1px solid #e8d8ee;background:#faf5fc;border-radius:14px;padding:10px 12px;margin:0 0 8px;width:100%;box-sizing:border-box}
  .lead-panel-title{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;color:#451657;font-size:.9rem;margin-bottom:6px}
  .lead-panel-title button{border:0;background:none;color:#7a5a86;font-size:.8rem;text-decoration:underline;cursor:pointer;padding:0}
  .lead-q{margin:6px 0}
  .lead-q>span{display:block;font-size:.8rem;color:#5b4565;margin-bottom:4px}
  .lead-chips{display:flex;flex-wrap:wrap;gap:6px}
  .lead-chip{border:1px solid #d9c3e3;background:#fff;color:#451657;border-radius:999px;padding:5px 11px;font-size:.82rem;cursor:pointer}
  .lead-chip.on{background:#451657;border-color:#451657;color:#fff}
  .lead-panel small{display:block;color:#7a6a80;font-size:.74rem;margin-top:6px}
  .contacts-modal .modal-body{display:flex;flex-direction:column;gap:10px}
  .contacts-summary{display:flex;flex-wrap:wrap;gap:6px}
  .contacts-filter{border:1px solid #d9c3e3;background:#fff;color:#451657;border-radius:999px;padding:6px 12px;font-size:.85rem;cursor:pointer}
  .contacts-filter.on{background:#451657;color:#fff;border-color:#451657}
  .contact-card{border:1px solid #eadff0;border-radius:14px;padding:12px;background:#fff}
  .contact-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
  .contact-name{font-weight:800;color:#2b1636}
  .contact-listing{font-size:.85rem;color:#5b4565;margin-top:2px}
  .lead-badge{flex:none;border-radius:999px;padding:3px 10px;font-size:.78rem;font-weight:800}
  .lead-badge.fort{background:#dff5e6;color:#17663a}
  .lead-badge.moyen{background:#fff0d9;color:#8a5200}
  .lead-badge.faible{background:#efedf1;color:#5d5764}
  .contact-tags{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
  .contact-tags span{background:#f5eff8;color:#451657;border-radius:8px;padding:3px 8px;font-size:.78rem}
  .contact-bottom{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
  .contact-bottom select{border:1px solid #d9c3e3;border-radius:10px;padding:6px 8px;font-size:.85rem;background:#fff}
  .contact-meta{font-size:.76rem;color:#7a6a80}
  .contact-unread{background:#c8326b;color:#fff;border-radius:999px;padding:1px 7px;font-size:.72rem;margin-left:6px}
  .contacts-note{font-size:.78rem;color:#7a6a80;margin:0}
  `;
  document.head.appendChild(style);

  /* ---------- 1. Questions acheteur ---------- */
  let leadState={conversationId:null,category:null,answers:{}};
  const categoryCache=new Map();

  async function listingCategory(listingId){
    if(!listingId) return null;
    if(categoryCache.has(listingId)) return categoryCache.get(listingId);
    let cat=(typeof allAds!=='undefined'?allAds:[]).find(a=>a.id===listingId)?.category||null;
    if(!cat){
      try{const {data}=await sb.from('listings').select('category').eq('id',listingId).maybeSingle();cat=data?.category||null;}catch(_){}
    }
    categoryCache.set(listingId,cat);
    return cat;
  }

  function removePanel(){document.getElementById('leadPanel')?.remove();}

  function renderPanel(category){
    removePanel();
    const form=document.getElementById('messageForm');
    if(!form) return;
    const isImmo=category==='immobilier';
    const third=isImmo
      ?{key:'trade',label:'Avez-vous un bien à vendre avant d’acheter ?',opts:{yes:'Oui',no:'Non'}}
      :{key:'trade',label:'Avez-vous un véhicule à faire reprendre ?',opts:{yes:'Oui',no:'Non'}};
    const groups=[
      {key:'timeline',label:'Vous comptez acheter quand ?',opts:TIMELINE},
      third,
      {key:'financing',label:'Comment pensez-vous payer ?',opts:FINANCING}
    ];
    const panel=document.createElement('div');
    panel.id='leadPanel';
    panel.className='lead-panel';
    panel.innerHTML=`<div class="lead-panel-title"><span>Aidez le vendeur à vous répondre plus vite</span><button type="button" data-lead-skip>Passer</button></div>`+
      groups.map(g=>`<div class="lead-q"><span>${safe(g.label)}</span><div class="lead-chips">${Object.entries(g.opts).map(([v,l])=>`<button type="button" class="lead-chip" data-lead-group="${g.key}" data-lead-value="${v}">${safe(l)}</button>`).join('')}</div></div>`).join('')+
      `<small>Facultatif. Vos réponses sont transmises uniquement au vendeur de cette annonce.</small>`;
    panel.addEventListener('click',e=>{
      const skip=e.target.closest('[data-lead-skip]');
      if(skip){leadState.answers={};removePanel();return;}
      const chip=e.target.closest('[data-lead-group]');
      if(!chip) return;
      const g=chip.dataset.leadGroup, v=chip.dataset.leadValue;
      const already=leadState.answers[g]===v;
      panel.querySelectorAll(`[data-lead-group="${g}"]`).forEach(b=>b.classList.remove('on'));
      if(already){delete leadState.answers[g];}else{leadState.answers[g]=v;chip.classList.add('on');}
    });
    form.insertBefore(panel,form.firstChild);
  }

  // Appelé par loadConversationMessages après chaque affichage du fil.
  window.abracaLeadPanelUpdate=async function(msgs){
    try{
      const convId=currentConversationId;
      if(!convId||!currentUser){removePanel();return;}
      // Panneau seulement tant qu'aucun message n'a été envoyé (l'acheteur ouvre toujours la conversation).
      if((msgs||[]).length){ if(leadState.conversationId===convId) leadState.answers={}; removePanel(); return; }
      if(leadState.conversationId===convId&&document.getElementById('leadPanel')) return;
      const conv=(messageConversations||[]).find(c=>c.conversation_id===convId);
      const category=await listingCategory(conv?.listing_id);
      if(convId!==currentConversationId) return;
      leadState={conversationId:convId,category,answers:{}};
      if(LEAD_CATEGORIES.includes(category)) renderPanel(category); else removePanel();
    }catch(err){console.error(err);removePanel();}
  };

  // Appelé après l'envoi réussi d'un message.
  window.abracaLeadSave=async function(convId){
    try{
      if(!convId||leadState.conversationId!==convId) return;
      const a=leadState.answers||{};
      removePanel();
      leadState.answers={};
      if(!a.timeline&&!a.trade&&!a.financing) return;
      const {error}=await sb.rpc('set_conversation_lead',{
        p_conversation_id:convId,
        p_timeline:a.timeline||null,
        p_trade_in:a.trade?a.trade==='yes':null,
        p_financing:a.financing||null
      });
      if(error) console.error(error);
    }catch(err){console.error(err);}
  };

  /* ---------- 2. Mes contacts (vendeur) ---------- */
  let contacts=[], contactFilter='all';

  function ensureContactsModal(){
    let m=document.getElementById('myContactsModal');
    if(m) return m;
    m=document.createElement('div');
    m.className='modal-backdrop';
    m.id='myContactsModal';
    m.setAttribute('aria-hidden','true');
    m.innerHTML=`<div class="modal contacts-modal">
      <div class="modal-head"><h2>Mes contacts</h2><a class="close-btn" href="#" aria-label="Fermer" data-contacts-close>×</a></div>
      <div class="modal-body">
        <p class="contacts-note">Les acheteurs qui vous ont écrit, avec leur potentiel d’achat. Les plus sérieux sont en haut de la liste.</p>
        <div class="contacts-summary" id="contactsFilters"></div>
        <div id="contactsList"><div class="messages-empty">Chargement…</div></div>
        <p class="contacts-note">Potentiel indicatif, calculé à partir des réponses facultatives de l’acheteur et de son activité sur Abracadeal (annonce en favori, alerte enregistrée, compte vérifié, message détaillé).</p>
      </div></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-contacts-close]').addEventListener('click',e=>{e.preventDefault();closeModal('myContactsModal');});
    m.addEventListener('click',e=>{if(e.target===m) closeModal('myContactsModal');});
    m.querySelector('#contactsFilters').addEventListener('click',e=>{
      const b=e.target.closest('[data-filter]'); if(!b) return;
      contactFilter=b.dataset.filter; renderContacts();
    });
    m.querySelector('#contactsList').addEventListener('change',async e=>{
      const sel=e.target.closest('select[data-status-for]'); if(!sel) return;
      const id=sel.dataset.statusFor, value=sel.value;
      sel.disabled=true;
      const {error}=await sb.rpc('set_contact_status',{p_conversation_id:id,p_status:value});
      sel.disabled=false;
      if(error){toast('Statut non enregistré');console.error(error);return;}
      const c=contacts.find(x=>x.conversation_id===id); if(c) c.seller_status=value;
      toast('Statut enregistré');
    });
    m.querySelector('#contactsList').addEventListener('click',async e=>{
      const b=e.target.closest('[data-open-conv]'); if(!b) return;
      closeModal('myContactsModal');
      await window.openMessages(b.dataset.openConv);
    });
    return m;
  }

  function fmtDate(v){
    try{return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch(_){return '';}
  }

  function renderContacts(){
    const counts={fort:0,moyen:0,faible:0};
    contacts.forEach(c=>{counts[c.level]=(counts[c.level]||0)+1;});
    document.getElementById('contactsFilters').innerHTML=
      [['all',`Tous (${contacts.length})`],['fort',`Fort (${counts.fort})`],['moyen',`Moyen (${counts.moyen})`],['faible',`Faible (${counts.faible})`]]
      .map(([k,l])=>`<button type="button" class="contacts-filter ${contactFilter===k?'on':''}" data-filter="${k}">${l}</button>`).join('');
    const list=contacts.filter(c=>contactFilter==='all'||c.level===contactFilter);
    const host=document.getElementById('contactsList');
    if(!contacts.length){host.innerHTML='<div class="messages-empty">Aucun contact pour le moment.<br>Les acheteurs qui vous écrivent apparaîtront ici.</div>';return;}
    if(!list.length){host.innerHTML='<div class="messages-empty">Aucun contact dans ce filtre.</div>';return;}
    host.innerHTML=list.map(c=>{
      const tags=[];
      if(c.purchase_timeline) tags.push(TIMELINE[c.purchase_timeline]);
      if(c.has_trade_in!==null&&c.has_trade_in!==undefined){
        tags.push(c.listing_category==='immobilier'?(c.has_trade_in?'Bien à vendre':'Pas de bien à vendre'):(c.has_trade_in?'Reprise souhaitée':'Sans reprise'));
      }
      if(c.financing) tags.push(FINANCING[c.financing]);
      if(!tags.length) tags.push('Pas de réponse aux questions');
      const unread=Number(c.unread_count||0);
      return `<article class="contact-card">
        <div class="contact-top"><div><div class="contact-name">${safe(c.buyer_name)}${unread?`<span class="contact-unread">${unread}</span>`:''}</div><div class="contact-listing">${safe(c.listing_title||'Annonce')}</div></div>
        <span class="lead-badge ${safe(c.level)}">${LEVEL[c.level]||''}</span></div>
        <div class="contact-tags">${tags.map(t=>`<span>${safe(t)}</span>`).join('')}</div>
        <div class="contact-bottom">
          <select data-status-for="${safe(c.conversation_id)}" aria-label="Statut du contact">${Object.entries(STATUS).map(([k,l])=>`<option value="${k}" ${c.seller_status===k?'selected':''}>${l}</option>`).join('')}</select>
          <button type="button" class="btn primary" data-open-conv="${safe(c.conversation_id)}">Ouvrir la conversation</button>
        </div>
        <div class="contact-meta">Dernier message : ${safe(fmtDate(c.last_message_at||c.first_contact_at))}</div>
      </article>`;
    }).join('');
  }

  window.openMyContacts=async function(){
    if(!currentUser){window.setAuthTab?.('login');openModal('accountModal');toast('Connectez-vous pour voir vos contacts');return;}
    ensureContactsModal();
    contactFilter='all';
    document.getElementById('contactsList').innerHTML='<div class="messages-empty">Chargement…</div>';
    document.getElementById('contactsFilters').innerHTML='';
    if(typeof closeModal==='function') closeModal('accountModal');
    openModal('myContactsModal');
    const {data,error}=await sb.rpc('get_my_contacts');
    if(error){console.error(error);document.getElementById('contactsList').innerHTML='<div class="messages-empty">Impossible de charger vos contacts. Réessayez plus tard.</div>';return;}
    contacts=data||[];
    renderContacts();
  };

  document.addEventListener('click',e=>{
    if(e.target.closest('#proDashContactsBtn')){e.preventDefault();window.openMyContacts();}
  });
})();
