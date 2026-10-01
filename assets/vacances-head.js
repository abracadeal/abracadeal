
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
})();
