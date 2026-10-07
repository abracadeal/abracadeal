/* Mobile + tablette : le geste "glisser pour revenir" (et le bouton retour Android)
   ferme le menu / la fenetre ouverte au lieu de quitter la page.
   Chaque fenetre ouverte ajoute une entree d'historique ; le retour la ferme.
   Si la fenetre est fermee autrement (croix, fond...), l'entree est retiree.
   Desktop : aucun changement. */
(function(){
  if (!window.history || !history.pushState || !window.MutationObserver) return;

  function genericClose(el, cls){
    el.classList.remove(cls);
    el.setAttribute('aria-hidden', 'true');
  }
  function clickInside(el, sel){
    var btn = el.querySelector(sel);
    if (btn){ btn.click(); return true; }
    return false;
  }

  /* Ordre important : le premier selecteur qui correspond l'emporte. */
  var LAYERS = [
    { sel: '#photoLightbox', cls: 'open', close: function(el){
        if (window.closePhotoLightbox) window.closePhotoLightbox(); else genericClose(el, 'open');
      } },
    { sel: '.messages-shell', cls: 'mobile-chat-open', close: function(el){
        if (window.closeMobileConversation) window.closeMobileConversation();
        if (el.classList.contains('mobile-chat-open')) el.classList.remove('mobile-chat-open');
      } },
    { sel: '.modal-backdrop', cls: 'open', close: function(el){
        if (window.closeModal && el.id) window.closeModal(el.id); else genericClose(el, 'open');
      } },
    { sel: '#vacAuthModal', cls: 'show', close: function(el){
        if (!clickInside(el, '[data-close-auth]')){
          genericClose(el, 'show');
          document.body.classList.remove('auth-open');
        }
      } },
    { sel: '#vacDateSheet', cls: 'show', close: function(el){
        if (!clickInside(el, '[data-close-vac-date]')){
          genericClose(el, 'show');
          document.body.classList.remove('vac-date-open');
        }
      } },
    { sel: '.vac-legal-overlay', cls: 'open', close: function(el){ genericClose(el, 'open'); } }
  ];

  function layerOf(el){
    if (!el || el.nodeType !== 1) return null;
    for (var i = 0; i < LAYERS.length; i++){
      if (el.matches(LAYERS[i].sel)) return LAYERS[i];
    }
    return null;
  }
  function isTouchLayout(){
    return window.matchMedia('(max-width:760px)').matches ||
      window.matchMedia('(pointer:coarse)').matches;
  }

  var stack = [];        /* fenetres ouvertes ayant une entree d'historique */
  var orphans = 0;       /* entrees d'historique dont la fenetre a ete fermee autrement */
  var ignorePops = 0;    /* popstate provoques par nous-memes */
  var flushTimer = null;

  function onOpen(el){
    if (stack.indexOf(el) !== -1 || !isTouchLayout()) return;
    stack.push(el);
    /* Une fenetre en remplace une autre (fermee juste avant) : on reutilise son entree. */
    if (orphans > 0){ orphans--; return; }
    history.pushState({ abracaLayer: stack.length }, '');
  }
  function onClose(el){
    var i = stack.indexOf(el);
    if (i === -1) return; /* deja retiree (fermee par le geste retour) */
    stack.splice(i, 1);
    orphans++;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 60);
  }
  function flush(){
    if (orphans <= 0) return;
    ignorePops++;
    history.go(-orphans);
    orphans = 0;
  }

  window.addEventListener('popstate', function(){
    if (ignorePops > 0){ ignorePops--; return; }
    var el = stack.pop();
    if (!el) return;
    var layer = layerOf(el);
    if (layer && el.classList.contains(layer.cls)) layer.close(el);
  });

  function start(){
    new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++){
        var el = muts[i].target, layer = layerOf(el);
        if (!layer) continue;
        var was = (' ' + (muts[i].oldValue || '') + ' ').indexOf(' ' + layer.cls + ' ') !== -1;
        var is = el.classList.contains(layer.cls);
        if (is && !was) onOpen(el);
        else if (!is && was) onClose(el);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
