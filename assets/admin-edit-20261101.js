/* 01/11/2026 — Claude (Anthony : « l'admin doit pouvoir supprimer et modifier n'importe quel texte et image du site »,
   choix : annonces et photos [déjà possible : bouton Modifier de l'annonce], profils et pages pros, avis).
   - « ✏️ Modifier ce compte (admin) » sur la page vendeur : nom affiché, ville, téléphone, description de la vitrine pro,
     logo et bannière (remplacer / retirer), avis reçus (annonces et vacances : modifier le texte, la note, la réponse, supprimer).
   - « Modifier / Supprimer (admin) » sur chaque avis de la page vendeur.
   Droits côté base : migrations admin_edit_everything et admin_review_edit_rpc (01/11/2026). */
(function(){
  function isAdmin(){try{return !!(currentProfile&&currentProfile.is_admin);}catch(_){return false;}}
  function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function note(t){try{toast(t);}catch(_){alert(t);}}
  function assetUrl(p){try{return showroomAssetUrl(p);}catch(_){return '';}}
  function refresh(id){try{if(typeof openSellerProfile==='function')openSellerProfile(id);}catch(_){}}

  var css=document.createElement('style');
  css.textContent='#adminEditDlg{border:0;border-radius:18px;padding:0;width:min(760px,96vw);max-height:92vh;background:#fff;color:#25182d}'+
    '#adminEditDlg::backdrop{background:rgba(20,8,30,.6)}#adminEditDlg .ae{padding:18px 18px 22px;overflow:auto;max-height:92vh;box-sizing:border-box}'+
    '#adminEditDlg h3{margin:18px 0 8px;font-size:17px}#adminEditDlg label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:14px;margin:0 0 10px}'+
    '#adminEditDlg input,#adminEditDlg textarea,#adminEditDlg select{font:inherit;padding:9px 10px;border:1px solid #d9cfe2;border-radius:10px;font-weight:400}'+
    '#adminEditDlg textarea{min-height:90px}#adminEditDlg .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'+
    '#adminEditDlg .img{position:relative;border-radius:12px;overflow:hidden;background:#eee;border:1px solid #e5dced}'+
    '#adminEditDlg .rv{border:1px solid #e5dced;border-radius:12px;padding:10px;margin:0 0 10px}'+
    '#adminEditDlg button{cursor:pointer}#adminEditDlg .ab{border:0;border-radius:10px;padding:9px 14px;font-weight:700;background:#efe7f6;color:#3b1d55}'+
    '#adminEditDlg .ab.pri{background:#8a3ab9;color:#fff}#adminEditDlg .ab.del{background:#fbe5e3;color:#b0281b}#adminEditDlg .muted{color:#7b6c88;font-size:13px}';
  document.head.appendChild(css);

  function dlg(){var d=document.getElementById('adminEditDlg');if(!d){d=document.createElement('dialog');d.id='adminEditDlg';document.body.appendChild(d);
    d.addEventListener('click',function(e){if(e.target===d)d.close();});}return d;}

  window.adminEditAccount=async function(userId){
    if(!isAdmin()){note('Accès administrateur requis');return;}
    var d=dlg();d.innerHTML='<div class="ae">Chargement…</div>';if(!d.open)d.showModal();
    var r=await Promise.all([
      sb.from('public_profiles').select('id,display_name,account_type,city').eq('id',userId).maybeSingle(),
      sb.from('profiles').select('phone').eq('id',userId).maybeSingle(),
      sb.from('pro_showrooms').select('description,banner_path,logo_path').eq('user_id',userId).maybeSingle(),
      sb.from('reviews').select('id,reviewer_name,rating,comment,seller_reply,status,created_at').eq('seller_id',userId).order('created_at',{ascending:false}),
      sb.from('vacation_reviews').select('id,rating,comment,subject_reply,status,created_at').eq('subject_id',userId).order('created_at',{ascending:false})
    ]);
    var p=r[0].data||{},phone=(r[1].data||{}).phone||'',sh=r[2].data||{},revs=r[3].data||[],vrevs=r[4].data||[];
    var isPro=p.account_type==='professionnel';
    var st={banner:sh.banner_path||null,logo:sh.logo_path||null,newBanner:null,newLogo:null};
    function imgBox(kind,label,ratio){var path=st[kind],file=st['new'+kind[0].toUpperCase()+kind.slice(1)];
      var src=file?URL.createObjectURL(file):(path?assetUrl(path):'');
      return '<div style="flex:1;min-width:220px"><div style="font-weight:600;font-size:14px;margin:0 0 4px">'+label+'</div><div class="img" style="aspect-ratio:'+ratio+'">'+(src?'<img src="'+h(src)+'" style="width:100%;height:100%;object-fit:cover">':'<div class="muted" style="padding:20px;text-align:center">Aucune image</div>')+'</div>'+
        '<div class="row" style="margin-top:6px"><label class="ab" style="margin:0;flex-direction:row">Remplacer<input type="file" accept="image/*" data-up="'+kind+'" style="display:none"></label>'+(src?'<button type="button" class="ab del" data-rm="'+kind+'">Retirer</button>':'')+'</div></div>';}
    function revBox(kind,x){return '<div class="rv" data-kind="'+kind+'" data-id="'+x.id+'"><div class="row" style="justify-content:space-between"><b>'+h(x.reviewer_name||(kind==='vacances'?'Avis vacances':'Avis'))+'</b><span class="muted">'+new Date(x.created_at).toLocaleDateString('fr-FR')+(x.status&&x.status!=='active'?' · '+h(x.status):'')+'</span></div>'+
      '<label>Note<select data-f="rating">'+[1,2,3,4,5].map(function(n){return '<option'+(Number(x.rating)===n?' selected':'')+'>'+n+'</option>';}).join('')+'</select></label>'+
      '<label>Avis<textarea data-f="comment">'+h(x.comment)+'</textarea></label>'+
      '<label>Réponse du '+(kind==='vacances'?'propriétaire':'vendeur')+'<textarea data-f="reply" style="min-height:50px">'+h(kind==='vacances'?x.subject_reply:x.seller_reply)+'</textarea></label>'+
      '<div class="row"><button type="button" class="ab pri" data-save>Enregistrer cet avis</button><button type="button" class="ab del" data-del>Supprimer cet avis</button></div></div>';}
    var draft={};
    // garde la saisie en cours quand la fenêtre est redessinée (ajout / retrait d'une image)
    function grab(){var g=function(id){var e=d.querySelector('#'+id);return e?e.value:undefined;};['aeName','aeCity','aePhone','aeDesc'].forEach(function(id){var v=g(id);if(v!==undefined)draft[id]=v;});}
    function val(id,def){return id in draft?draft[id]:def;}
    function draw(){
      d.innerHTML='<div class="ae"><div class="row" style="justify-content:space-between"><h2 style="margin:0;font-size:20px">Modifier ce compte (admin)</h2><button type="button" class="ab" id="aeClose">Fermer</button></div>'+
        '<p class="muted">Les modifications sont visibles tout de suite sur le site.</p>'+
        '<h3>Profil</h3><label>Nom affiché<input id="aeName" value="'+h(val('aeName',p.display_name))+'"></label><label>Ville<input id="aeCity" value="'+h(val('aeCity',p.city))+'"></label><label>Téléphone<input id="aePhone" value="'+h(val('aePhone',phone))+'"></label>'+
        (isPro?'<h3>Vitrine pro</h3><label>Description<textarea id="aeDesc" style="min-height:120px">'+h(val('aeDesc',sh.description))+'</textarea></label><div class="row" style="align-items:flex-start">'+imgBox('logo','Logo','1/1')+imgBox('banner','Bannière','3/1')+'</div>':'')+
        '<div class="row" style="margin-top:14px"><button type="button" class="ab pri" id="aeSave">Enregistrer le profil'+(isPro?' et la vitrine':'')+'</button><span class="muted" id="aeMsg"></span></div>'+
        '<h3>Avis reçus ('+(revs.length+vrevs.length)+')</h3>'+(revs.length+vrevs.length?revs.map(function(x){return revBox('avis',x);}).join('')+vrevs.map(function(x){return revBox('vacances',x);}).join(''):'<p class="muted">Aucun avis.</p>')+'</div>';
      d.querySelector('#aeClose').onclick=function(){d.close();refresh(userId);};
      d.querySelectorAll('[data-up]').forEach(function(i){i.onchange=function(){var f=i.files&&i.files[0];if(!f)return;if(f.size>8e6){note('Image trop lourde (8 Mo maximum)');return;}grab();st['new'+i.dataset.up[0].toUpperCase()+i.dataset.up.slice(1)]=f;draw();};});
      d.querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){grab();var k=b.dataset.rm;st[k]=null;st['new'+k[0].toUpperCase()+k.slice(1)]=null;draw();};});
      d.querySelector('#aeSave').onclick=saveProfile;
      d.querySelectorAll('.rv').forEach(function(box){
        box.querySelector('[data-save]').onclick=async function(){var g=function(f){return box.querySelector('[data-f="'+f+'"]').value;};
          var res=await sb.rpc('admin_review_edit',{p_kind:box.dataset.kind,p_id:box.dataset.id,p_comment:g('comment'),p_rating:Number(g('rating')),p_reply:g('reply')});
          note(res.error?('Erreur : '+res.error.message):'Avis enregistré');};
        box.querySelector('[data-del]').onclick=async function(){if(!confirm('Supprimer définitivement cet avis ?'))return;
          var res=await sb.rpc('admin_review_delete',{p_kind:box.dataset.kind,p_id:box.dataset.id});
          if(res.error){note('Erreur : '+res.error.message);return;}box.remove();note('Avis supprimé');};
      });
    }
    async function saveProfile(){
      var msg=d.querySelector('#aeMsg');msg.textContent='Enregistrement…';
      try{
        var upd={display_name:d.querySelector('#aeName').value.trim(),city:d.querySelector('#aeCity').value.trim()};
        var ph=d.querySelector('#aePhone').value.trim();if(ph!==phone)upd.phone=ph||null;
        var e1=(await sb.from('profiles').update(upd).eq('id',userId)).error;if(e1)throw e1;
        if(isPro){
          var stamp=Date.now(),old={banner:sh.banner_path,logo:sh.logo_path},obsolete=[];
          for(var k of ['banner','logo']){var f=st['new'+k[0].toUpperCase()+k.slice(1)];
            if(f){var ext=((f.type||'image/jpeg').split('/')[1]||'jpg').replace('jpeg','jpg');var path=userId+'/'+k+'-'+stamp+'.'+ext;
              var up=await sb.storage.from('pro-showroom').upload(path,f,{contentType:f.type||'image/jpeg',upsert:false,cacheControl:'3600'});if(up.error)throw up.error;st[k]=path;}
            if(old[k]&&old[k]!==st[k])obsolete.push(old[k]);}
          var e2=(await sb.from('pro_showrooms').upsert({user_id:userId,description:(d.querySelector('#aeDesc').value||'').trim()||null,banner_path:st.banner,logo_path:st.logo,updated_at:new Date().toISOString()},{onConflict:'user_id'})).error;if(e2)throw e2;
          if(obsolete.length)await sb.storage.from('pro-showroom').remove(obsolete);
          sh={description:d.querySelector('#aeDesc').value,banner_path:st.banner,logo_path:st.logo};st.newBanner=null;st.newLogo=null;
        }
        p.display_name=upd.display_name;p.city=upd.city;if('phone' in upd)phone=upd.phone||'';
        draft={};msg.textContent='Enregistré ✓';
      }catch(e){msg.textContent='Erreur : '+(e.message||e);}
    }
    draw();
  };

  window.adminEditReview=function(kind,id,sellerId){adminEditAccount(sellerId);};
  window.adminDeleteReview=async function(kind,id,sellerId){
    if(!isAdmin())return;if(!confirm('Supprimer définitivement cet avis ?'))return;
    var res=await sb.rpc('admin_review_delete',{p_kind:kind,p_id:id});
    if(res.error){note('Erreur : '+res.error.message);return;}note('Avis supprimé');refresh(sellerId);
  };
})();
