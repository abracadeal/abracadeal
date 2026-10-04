
(() => {
  const icons = {
    vacances:'<span aria-hidden="true">✦</span>',
    favoris:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 1 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"></path></svg>',
    messages:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path><path d="M8 9h8M8 13h5"></path></svg>',
    compte:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg>'
  };

  const isDesktop = () => window.matchMedia('(min-width:1024px) and (pointer:fine)').matches;

  function item(tag, cls, label, icon){
    const el = document.createElement(tag);
    if(tag === 'button') el.type = 'button';
    el.className = 'vac-dnav-item ' + cls;
    el.setAttribute('aria-label', label);
    el.innerHTML = icon + '<span>' + label + '</span>';
    return el;
  }

  function syncVacDesktopSpace(){
    const link=document.querySelector('.vac-desktop-actions-v2 .vac-dnav-favoris');
    if(!link) return;
    const label=link.querySelector('span');
    const state=document.body.dataset.vacSpace||'traveler';
    if(state==='host'){
      if(label) label.textContent='Espace Hôte';
      link.href='vacances.html?mode=hote';
      link.setAttribute('aria-label','Espace Hôte');
    }else if(state==='host-pending'){
      if(label) label.textContent='Espace Hôte';
      link.href='vacances.html?mode=hote&host_signup=1';
      link.setAttribute('aria-label','Espace Hôte');
    }else{
      if(label) label.textContent='Espace voyageur';
      link.href='espace-voyageur.html';
      link.setAttribute('aria-label','Espace voyageur');
    }
  }

  function syncVacDesktopAccountLabel(){
    const target = document.querySelector('.vac-desktop-actions-v2 .vac-dnav-compte span');
    if(!target) return;
    const source = document.getElementById('vacLoginCta');
    const label = (source?.textContent || 'Connexion').trim() || 'Connexion';
    target.textContent = label;
    const account = document.querySelector('.vac-desktop-actions-v2 .vac-dnav-compte');
    if(account) account.setAttribute('aria-label',label);
  }

  function syncBadge(){
    const badge = document.querySelector('.vac-desktop-actions-v2 .vac-dnav-badge');
    if(!badge) return;
    const src = document.querySelector(
      '#vacMessagesUnread, .vac-message-badge, .messages-unread-badge, .account-unread-badge'
    );
    const txt = src && !src.classList.contains('hidden') ? (src.textContent || '').trim() : '';
    badge.textContent = txt && txt !== '0' ? txt : '';
  }

  function build(){
    if(!isDesktop()) return;
    const actions = document.querySelector('.topbar .nav-actions');
    if(!actions) return;
    if(actions.querySelector('.vac-desktop-actions-v2')){
      syncBadge();
      syncVacDesktopAccountLabel();
      syncVacDesktopSpace();
      return;
    }

    const bar = document.createElement('nav');
    bar.className = 'vac-desktop-actions-v2';
    bar.setAttribute('aria-label','Navigation Vacances');

    const vacances = item('a','vac-dnav-vacances','Abracadeal',icons.vacances);
    vacances.href = 'index.html';

    const favoris = item('a','vac-dnav-favoris','Espace voyageur',icons.favoris);
    favoris.href = 'espace-voyageur.html';

    const messages = item('a','vac-dnav-messages','Messages',icons.messages);
    messages.href = 'messages-vacances.html';
    const badge = document.createElement('i');
    badge.className = 'vac-dnav-badge';
    badge.setAttribute('aria-hidden','true');
    messages.appendChild(badge);

    const compte = item('button','vac-dnav-compte','Compte',icons.compte);
    compte.addEventListener('click', () => {
      const original = document.getElementById('vacLoginCta');
      if(original){
        try{ original.click(); return; }catch(_){}
      }
      const modal = document.getElementById('vacAuthModal');
      if(modal){
        modal.classList.add('show');
        modal.setAttribute('aria-hidden','false');
        document.body.classList.add('auth-open');
      }
    });

    bar.append(vacances,favoris,messages,compte);
    actions.appendChild(bar);
    syncBadge();
    syncVacDesktopAccountLabel();
    syncVacDesktopSpace();

    const accountLabelSource=document.getElementById('vacLoginCta');
    if(accountLabelSource && window.MutationObserver){
      new MutationObserver(syncVacDesktopAccountLabel).observe(accountLabelSource,{subtree:true,childList:true,characterData:true});
    }

    const source = document.querySelector(
      '#vacMessagesUnread, .vac-message-badge, .messages-unread-badge, .account-unread-badge'
    );
    if(source && window.MutationObserver){
      new MutationObserver(syncBadge).observe(source,{
        subtree:true,childList:true,attributes:true,characterData:true
      });
    }
  }

  const start = () => {
    build();
    requestAnimationFrame(build);
    setTimeout(build,150);
    setTimeout(build,700);
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
  document.addEventListener('abraca:vac-space-change',syncVacDesktopSpace);
  window.addEventListener('resize',build,{passive:true});
})();


;


(function(){
  function isTablet(){return matchMedia('(min-width:621px) and (max-width:1366px)').matches && (matchMedia('(pointer:coarse)').matches||matchMedia('(any-pointer:coarse)').matches);}
  function fitHostFrame(){
    if(!isTablet()) return;
    const frame=document.getElementById('vacHostFrame');
    if(!frame) return;
    try{
      const doc=frame.contentDocument;
      if(!doc) return;
      const resize=()=>{
        const h=Math.max(doc.documentElement.scrollHeight,doc.body?doc.body.scrollHeight:0);
        if(h>0){frame.style.setProperty('height',h+'px','important');frame.style.setProperty('min-height','0','important');}
      };
      resize();
      if(frame._abracaResizeObserver) frame._abracaResizeObserver.disconnect();
      frame._abracaResizeObserver=new ResizeObserver(resize);
      frame._abracaResizeObserver.observe(doc.documentElement);
      if(doc.body) frame._abracaResizeObserver.observe(doc.body);
      setTimeout(resize,250);setTimeout(resize,900);
    }catch(e){}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const frame=document.getElementById('vacHostFrame');
    if(frame) frame.addEventListener('load',fitHostFrame);
    setTimeout(fitHostFrame,500);
  });
  addEventListener('resize',()=>setTimeout(fitHostFrame,100));
})();
