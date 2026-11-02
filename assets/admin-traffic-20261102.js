/* 02/11/2026 (Claude) : tableau de bord « Visiteurs et contacts » d'admin-pilotage.html (RPC admin_traffic_stats).
   Visiteurs = personnes distinctes par jour (hors administrateurs), vues d'annonces, numéros affichés, messages, showrooms, recherches. */
(function(){
  const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SRC={google:'Google',bing:'Autres moteurs',facebook:'Facebook',instagram:'Instagram',email:'E-mails',direct:'Direct / favoris',autre_site:'Autres sites'};
  const fmtDay=d=>new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
  async function load(){
    const box=$('trafficBox');if(!box||typeof sb==='undefined')return;
    const days=Number($('trafficDays')?.value||14);
    const {data,error}=await sb.rpc('admin_traffic_stats',{p_days:days});
    if(error){box.innerHTML='<p>Statistiques indisponibles : '+esc(error.message)+'</p>';return;}
    const rows=data.days||[];const sum=k=>rows.reduce((n,r)=>n+Number(r[k]||0),0);
    const tot=[['Visiteurs',sum('visiteurs')],['Vues d’annonces',sum('vues_annonces')],['Numéros affichés',sum('numeros')],['Messages',sum('messages')],['Showrooms vus',sum('showrooms')],['Recherches',sum('recherches')]];
    const src=Object.entries(data.sources||{}).sort((a,b)=>b[1]-a[1]);
    const table=(head,body)=>'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>'+head.map(h=>'<th style="text-align:left;padding:6px;border-bottom:1px solid #5a3f66">'+h+'</th>').join('')+'</tr></thead><tbody>'+body.join('')+'</tbody></table></div>';
    const td=v=>'<td style="padding:6px;border-bottom:1px solid #3a2747">'+v+'</td>';
    box.innerHTML='<div class="grid">'+tot.map(([l,v])=>'<div>'+l+'<div class="metric">'+v.toLocaleString('fr-FR')+'</div></div>').join('')+'</div>'
      +'<h3>D’où viennent les visiteurs</h3>'+(src.length?'<p>'+src.map(([k,v])=>esc(SRC[k]||k)+' : <b>'+v+'</b>').join(' · ')+'</p>':'<p class="muted">Pas encore de données (le compteur démarre le 02/11/2026).</p>')
      +'<h3>Par jour</h3>'+table(['Jour','Visiteurs','dont mobile','Vues annonces','Numéros','Messages','Showrooms','Recherches'],rows.map(r=>'<tr>'+[fmtDay(r.day),r.visiteurs,r.mobiles,r.vues_annonces,r.numeros,r.messages,r.showrooms,r.recherches].map(td).join('')+'</tr>'))
      +'<h3>Par vendeur</h3>'+((data.par_pro||[]).length?table(['Vendeur','Vues','Numéros','Messages'],data.par_pro.map(r=>'<tr>'+[esc(r.vendeur),r.vues,r.numeros,r.messages].map(td).join('')+'</tr>')):'<p class="muted">Aucune vue sur la période.</p>')
      +'<h3>Annonces les plus vues</h3>'+((data.top_annonces||[]).length?table(['Annonce','Ville','Vues','Numéros'],data.top_annonces.map(r=>'<tr>'+[esc(r.title),esc(r.city),r.vues,r.numeros].map(td).join('')+'</tr>')):'<p class="muted">Aucune vue sur la période.</p>');
  }
  function start(){const app=$('app');if(!app||app.hidden){setTimeout(start,500);return;}load();setInterval(load,120000);$('trafficDays')?.addEventListener('change',load);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
