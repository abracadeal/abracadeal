
(function(){
  var ua=navigator.userAgent||'';
  var touch=(navigator.maxTouchPoints||0)>1 || ('ontouchstart' in window);
  var sw=Number(screen.width||0), sh=Number(screen.height||0);
  var minSide=Math.min(sw,sh);
  var notPhone=!/iPhone|iPod/i.test(ua);
  var tabletByTouch=touch && notPhone && minSide>=600;
  var explicitTablet=/iPad|Tablet/i.test(ua) || (/Android/i.test(ua)&&!/Mobile/i.test(ua));
  if(tabletByTouch||explicitTablet){
    document.documentElement.classList.add('abraca-vacances-tablet-mobile');
  }

  var style=document.createElement('style');
  style.id='vac-banner-center-20261005';
  style.textContent='\n.vac-mobile-banner-shell{width:min(1010px,calc(100% - 40px))!important;margin:22px auto 34px!important;display:block!important;text-align:center!important;}\n.vac-mobile-banner-exact{display:block!important;width:100%!important;height:auto!important;margin:0 auto!important;object-fit:contain!important;object-position:center center!important;border-radius:24px!important;}\n@media(max-width:760px){.vac-mobile-banner-shell{width:calc(100% - 20px)!important;margin:10px auto 14px!important}.vac-mobile-banner-exact{width:100%!important;margin:0 auto!important;object-position:center center!important}}\n';
  document.head.appendChild(style);

  var accent=document.createElement('link');
  accent.rel='stylesheet';
  accent.href='assets/vacances-accent.css?v=20261005-1';
  document.head.appendChild(accent);
})();
