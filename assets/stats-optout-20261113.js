/* 13/11/2026 (demande d'Anthony, comme sur Clic&Site) : exclure / recompter cet appareil dans les statistiques maison.
   - lien secret : son nom dans les mentions légales (élément [data-stats-toggle]) ;
   - adresses : #nostats (exclure) et #stats (recompter), sur toutes les pages qui chargent ce fichier ;
   - même marque que ?moi=1 et que la connexion admin : localStorage « abraca_not_counted ». */
(function () {
  var KEY = 'abraca_not_counted';
  function excluded() { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } }
  function say(msg) {
    try { if (typeof window.toast === 'function') { window.toast(msg); return; } } catch (_) {}
    var d = document.createElement('div');
    d.textContent = msg;
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483647;background:#1e1230;color:#fff;border:1px solid #f7bd4b;padding:12px 16px;border-radius:12px;font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);max-width:90vw;text-align:center';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 3500);
  }
  function store(off) { try { if (off) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (_) {} }
  function msg(off) { say(off ? '✓ Cet appareil n’est plus compté dans les statistiques' : 'Cet appareil est de nouveau compté'); }
  function set(off) { store(off); msg(off); }
  function fromHash() {
    var h = (location.hash || '').toLowerCase();
    if (h !== '#nostats' && h !== '#stats') return;
    var off = h === '#nostats';
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    store(off); // tout de suite, avant que la page compte la visite
    var go = function () { msg(off); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 600); });
    else setTimeout(go, 300);
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-stats-toggle]');
    if (!t) return;
    e.preventDefault();
    set(!excluded());
  });
})();
