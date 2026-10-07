/* Tablette tactile (iPad...) = version mobile.
   Sur tablette, toutes les media queries de largeur (CSS et window.matchMedia) sont
   evaluees comme si l'ecran faisait EFFECTIVE_WIDTH px de large : le site applique donc
   exactement ses regles mobiles, en occupant toute la largeur reelle de la tablette.
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
  var done = typeof WeakSet === 'function' ? new WeakSet() : null;
  function applyToSheet(sheet){
    if (!sheet || (done && done.has(sheet))) return;
    var rules;
    try { rules = sheet.cssRules; } catch(e){ return; } /* feuille externe (Leaflet, Google Fonts) */
    if (!rules) return;
    if (done) done.add(sheet);
    walk(rules);
  }
  function applyToStyles(){
    for (var i = 0; i < document.styleSheets.length; i++) applyToSheet(document.styleSheets[i]);
  }

  /* Styles ajoutes plus tard (feuilles chargees dynamiquement, <style> injectes par JS). */
  function watch(){
    applyToStyles();
    new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++){
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++){
          var n = nodes[j];
          if (n.tagName === 'STYLE') applyToSheet(n.sheet);
          else if (n.tagName === 'LINK'){
            applyToSheet(n.sheet);
            n.addEventListener('load', function(){ applyToSheet(this.sheet); });
          }
        }
      }
    }).observe(document.documentElement, {childList:true, subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
  window.addEventListener('load', applyToStyles);

  window.abracaTabletAsMobile = { effectiveWidth: EFFECTIVE_WIDTH, applyToStyles: applyToStyles };
})();
