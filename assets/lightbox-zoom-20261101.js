/* 01/11/2026 — Claude (Anthony : « bug du zoom encore présent »).
   Avant : dans la galerie, le zoom à deux doigts était celui du téléphone, qui agrandit TOUTE la page. Au retour
   (geste ou bouton), la page restait agrandie et le site apparaissait de travers derrière ; l'iPhone ignore la
   commande qui devait remettre le zoom à 100 %.
   Maintenant : la galerie a son propre zoom, sur la photo seulement (pincer, faire glisser la photo zoomée,
   double toucher pour zoomer / revenir). Le zoom du téléphone est bloqué tant que la galerie est ouverte, et la
   photo revient à sa taille normale à chaque changement de photo et à la fermeture. */
(function(){
  var box=document.getElementById('photoLightbox');
  var img=document.getElementById('photoLightboxImg');
  if(!box||!img||box.__abracaZoom)return;
  box.__abracaZoom=true;
  var stage=img.closest('.photo-lightbox-stage')||img.parentNode;

  // Enveloppe qui reçoit le zoom (photo + filigrane bougent ensemble) ; la scène garde ses bords et coupe le reste.
  var wrap=document.createElement('div');
  wrap.className='plz-wrap';
  while(stage.firstChild)wrap.appendChild(stage.firstChild);
  stage.appendChild(wrap);
  var css=document.createElement('style');
  css.textContent='.photo-lightbox-stage{touch-action:none;overflow:hidden;position:relative}'+
    '.plz-wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;will-change:transform}'+
    '.plz-wrap.plz-anim{transition:transform .2s ease}'+
    '.photo-lightbox.open{touch-action:none;overscroll-behavior:contain}';
  document.head.appendChild(css);

  var s=1,tx=0,ty=0;
  function apply(anim){wrap.classList.toggle('plz-anim',!!anim);wrap.style.transform=(s===1&&!tx&&!ty)?'':'translate('+tx+'px,'+ty+'px) scale('+s+')';}
  function clamp(){var r=stage.getBoundingClientRect();var mx=(s-1)*r.width/2,my=(s-1)*r.height/2;tx=Math.max(-mx,Math.min(mx,tx));ty=Math.max(-my,Math.min(my,ty));}
  function reset(){s=1;tx=0;ty=0;apply(false);}
  function rel(x,y){var r=stage.getBoundingClientRect();return{x:x-(r.left+r.width/2),y:y-(r.top+r.height/2)};}
  window.resetPhotoLightboxZoom=reset;

  var start=null,lastTap=0,moved=false;
  function pts(e){var a=e.touches;return a.length>=2?{x:(a[0].clientX+a[1].clientX)/2,y:(a[0].clientY+a[1].clientY)/2,d:Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY)}:{x:a[0].clientX,y:a[0].clientY,d:0};}
  stage.addEventListener('touchstart',function(e){
    var p=pts(e);start={n:e.touches.length,c:rel(p.x,p.y),d:p.d,s:s,tx:tx,ty:ty};moved=false;
    if(e.touches.length>=2)e.preventDefault();
  },{passive:false});
  stage.addEventListener('touchmove',function(e){
    if(!start)return;
    var p=pts(e),c=rel(p.x,p.y);
    if(e.touches.length>=2){
      if(start.n<2){start={n:2,c:c,d:p.d,s:s,tx:tx,ty:ty};}
      e.preventDefault();moved=true;
      var ns=Math.max(1,Math.min(5,start.s*(p.d/(start.d||p.d))));
      // le point de la photo sous les doigts reste sous les doigts
      var qx=(start.c.x-start.tx)/start.s,qy=(start.c.y-start.ty)/start.s;
      s=ns;tx=c.x-s*qx;ty=c.y-s*qy;clamp();apply(false);
    }else if(s>1){
      e.preventDefault();moved=true;
      tx=start.tx+(c.x-start.c.x);ty=start.ty+(c.y-start.c.y);clamp();apply(false);
    }
  },{passive:false});
  stage.addEventListener('touchend',function(e){
    if(e.touches.length>0){var p=pts(e);start={n:e.touches.length,c:rel(p.x,p.y),d:p.d,s:s,tx:tx,ty:ty};return;}
    if(s<1.05)reset();
    if(!moved&&start&&start.n===1){
      var now=Date.now();
      if(now-lastTap<300){ // double toucher : zoom ×2,5 sur le point touché, ou retour
        e.preventDefault();
        if(s>1){s=1;tx=0;ty=0;}else{var q=start.c;s=2.5;tx=-q.x*(s-1);ty=-q.y*(s-1);clamp();}
        apply(true);lastTap=0;
      }else lastTap=now;
    }
    start=null;
  },{passive:false});

  // Ordinateur : molette pour zoomer, double clic pour revenir.
  stage.addEventListener('wheel',function(e){
    if(!box.classList.contains('open'))return;
    e.preventDefault();var c=rel(e.clientX,e.clientY);var qx=(c.x-tx)/s,qy=(c.y-ty)/s;
    s=Math.max(1,Math.min(5,s*(e.deltaY<0?1.15:1/1.15)));tx=c.x-s*qx;ty=c.y-s*qy;if(s<1.02){s=1;tx=0;ty=0;}clamp();apply(false);
  },{passive:false});
  stage.addEventListener('dblclick',function(e){var c=rel(e.clientX,e.clientY);if(s>1){s=1;tx=0;ty=0;}else{s=2.5;tx=-c.x*(s-1);ty=-c.y*(s-1);clamp();}apply(true);});

  // Zoom du téléphone bloqué tant que la galerie est ouverte (Safari iPhone : événements « gesture »).
  ['gesturestart','gesturechange','gestureend'].forEach(function(t){document.addEventListener(t,function(e){if(box.classList.contains('open'))e.preventDefault();},{passive:false});});
  document.addEventListener('touchmove',function(e){if(box.classList.contains('open')&&e.touches&&e.touches.length>1)e.preventDefault();},{passive:false});

  // Taille normale à chaque photo et à la fermeture (bouton, fond, Échap ou retour arrière).
  function wrapFn(name){var f=window[name];if(typeof f!=='function'||f.__plz)return;var g=function(){reset();return f.apply(this,arguments);};g.__plz=true;window[name]=g;}
  wrapFn('renderPhotoLightbox');wrapFn('closePhotoLightbox');
  new MutationObserver(function(){if(!box.classList.contains('open'))reset();}).observe(box,{attributes:true,attributeFilter:['class']});
})();
