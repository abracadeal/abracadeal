/* 07/11/2026 (Anthony) : un pro peut mettre une autre adresse e-mail sur ses annonces que celle de connexion.
   Enregistrée dans profiles.contact_email via set_my_contact_email (toutes ses annonces mises à jour sans repasser en modération). */
(function(){
  const $=id=>document.getElementById(id);
  window.fillProContactEmail=function(){
    if(typeof currentUser==='undefined'||!currentUser)return;
    const login=currentUser.email||'';
    if($('proLoginEmail'))$('proLoginEmail').textContent=login;
    const input=$('proContactEmail');if(!input)return;
    input.value=(typeof currentProfile!=='undefined'&&currentProfile?.contact_email)||login;
    if($('proContactEmailStatus'))$('proContactEmailStatus').textContent='';
  };
  $('proContactEmailSave')?.addEventListener('click',async()=>{
    const input=$('proContactEmail'),st=$('proContactEmailStatus'),btn=$('proContactEmailSave');
    const v=input.value.trim();
    if(v&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){st.textContent='Adresse e-mail invalide.';input.focus();return}
    const login=(currentUser?.email||'').toLowerCase();
    btn.disabled=true;st.textContent='Enregistrement…';
    try{
      const{data,error}=await sb.rpc('set_my_contact_email',{p_email:(!v||v.toLowerCase()===login)?null:v});
      if(error)throw error;
      if(typeof currentProfile!=='undefined'&&currentProfile)currentProfile.contact_email=(!v||v.toLowerCase()===login)?null:v.toLowerCase();
      input.value=data?.contact_email||login;
      st.textContent='Enregistré : les messages de vos annonces seront signalés à '+(data?.contact_email||login)+'.';
    }catch(e){st.textContent='Enregistrement impossible : '+(e.message||e)}
    finally{btn.disabled=false}
  });
})();
