/* Tablette tactile (iPad...) = version mobile.
   Sur tablette, toutes les media queries de largeur (CSS, window.matchMedia et
   <source media> des <picture>) sont evaluees comme si l'ecran faisait EFFECTIVE_WIDTH px
   de large : le site applique donc exactement ses regles mobiles, en occupant toute la
   largeur reelle de la tablette.
   Telephone et desktop : aucun changement (le script ne fait rien).
   A charger en <script> synchrone tout en haut du <head>, puis appeler
   window.abracaTabletAsMobile.applyToStyles() en fin de <head>. */
(function(){
  var EFFECTIVE_WIDTH = 720;
  var nativeMatchMedia = window.matchMedia ? window.matchMedia.bind(window) : null;
  if (!nativeMatchMedia) return;

  var sw = Math.min(screen.width, screen.height);
  var lw = Math.max(screen.width, screen.height);
  var isTablet = (navigator.maxTouchPoints || 0) > 1 &&
    nativeMatchMedia('(any-pointer:coarse)').matches &&
    !nativeMatchMedia('(pointer:fine)').matches &&
    sw >= 600 && lw <= 1400;
  if (!isTablet) return;

  document.documentElement.classList.add('abraca-tablet-as-mobile');
  /* Taille tablette (vertical ET horizontal) : la page recoit une largeur de mise en page
     reduite via la balise viewport, le navigateur agrandit tout proportionnellement.
     Recalcule a chaque rotation. Telephone et desktop : non concernes. */
  var PORTRAIT_SCALE = 1.35, LANDSCAPE_SCALE = 1.2;
  function fitViewport(){
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta){
      meta = document.createElement('meta');
      meta.name = 'viewport';
      (document.head || document.documentElement).appendChild(meta);
    }
    var landscape = nativeMatchMedia('(orientation:landscape)').matches;
    var screenW = landscape ? lw : sw;
    var w = landscape
      ? Math.max(760, Math.min(1140, Math.round(screenW / LANDSCAPE_SCALE)))
      : Math.max(560, Math.min(760, Math.round(screenW / PORTRAIT_SCALE)));
    var content = 'width=' + w + ', viewport-fit=cover';
    if (meta.getAttribute('content') !== content) meta.setAttribute('content', content);
  }
  if (document.head) fitViewport();
  else document.addEventListener('readystatechange', fitViewport, {once:true});
  document.addEventListener('DOMContentLoaded', fitViewport);
  window.addEventListener('orientationchange', function(){ setTimeout(fitViewport, 60); });
  window.addEventListener('resize', fitViewport);

  var TRUE_Q = '(min-width:0px)', FALSE_Q = '(max-width:0px)';
  var WIDTH_RE = /\(\s*(min|max)-width\s*:\s*([\d.]+)px\s*\)/gi;
  function rewrite(q){
    if (!q || q.indexOf('width') === -1) return q;
    return q.replace(WIDTH_RE, function(_, kind, n){
      n = parseFloat(n);
      var ok = kind.toLowerCase() === 'min' ? EFFECTIVE_WIDTH >= n : EFFECTIVE_WIDTH <= n;
      return ok ? TRUE_Q : FALSE_Q;
    });
  }

  window.matchMedia = function(q){ return nativeMatchMedia(rewrite(String(q))); };

  function walk(rules){
    if (!rules) return;
    for (var i = 0; i < rules.length; i++){
      var r = rules[i];
      if (r.type === 4 && r.media){ /* CSSMediaRule */
        var before = r.media.mediaText, after = rewrite(before);
        if (after !== before){ try { r.media.mediaText = after; } catch(e){} }
      }
      if (r.cssRules) walk(r.cssRules);
    }
  }
  /* Idempotent (les requetes reecrites restent identiques) : on peut repasser sans risque. */
  function applyToSheet(sheet){
    if (!sheet) return;
    var rules;
    try { rules = sheet.cssRules; } catch(e){ return; } /* feuille externe (Leaflet, Google Fonts) */
    walk(rules);
  }
  function applyToStyles(){
    for (var i = 0; i < document.styleSheets.length; i++) applyToSheet(document.styleSheets[i]);
  }

  /* <picture><source media="..."> : choisir les images mobiles. */
  function applyToSource(el){
    var m = el.getAttribute('media');
    /* data-tablet-keep-media : la tablette garde le choix d'image d'origine (ex. banniere large). */
    if (m && !el.hasAttribute('data-tablet-media') && !el.hasAttribute('data-tablet-keep-media')){
      el.setAttribute('data-tablet-media', m);
      el.setAttribute('media', rewrite(m));
    }
  }
  function applyToSources(root){
    var list = root.querySelectorAll ? root.querySelectorAll('source[media]') : [];
    for (var i = 0; i < list.length; i++) applyToSource(list[i]);
  }

  /* Elements ajoutes pendant le chargement ou plus tard : <style>/<link> injectes par JS,
     <source media> des <picture> (traites des leur insertion par le parseur). */
  new MutationObserver(function(muts){
    for (var i = 0; i < muts.length; i++){
      var nodes = muts[i].addedNodes;
      for (var j = 0; j < nodes.length; j++){
        var n = nodes[j];
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'STYLE') applyToSheet(n.sheet);
        else if (n.tagName === 'LINK'){
          applyToSheet(n.sheet);
          n.addEventListener('load', function(){ applyToSheet(this.sheet); });
        }
        else if (n.tagName === 'SOURCE') applyToSource(n);
        else if (n.querySelectorAll) applyToSources(n);
      }
    }
  }).observe(document.documentElement, {childList:true, subtree:true});
  document.addEventListener('DOMContentLoaded', function(){ applyToStyles(); applyToSources(document); });
  window.addEventListener('load', applyToStyles);

  window.abracaTabletAsMobile = { effectiveWidth: EFFECTIVE_WIDTH, applyToStyles: applyToStyles };
})();
