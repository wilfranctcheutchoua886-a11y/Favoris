/* Parier : copie + lance 1win IMMÉDIATEMENT au clic (Android exige l'action instantanée). Charger APRÈS appli1win.js */
(function () {
  'use strict';
  function reg() { try { return JSON.parse(lire('bilan_reg', 'null')) || {}; } catch (e) { return {}; } }
  function misesJour() {
    return hist().filter(function (x) { return x.d === jour() && x.mise > 0; }).reduce(function (s, x) { return s + x.mise; }, 0);
  }
  function copierSync(t) {
    var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(a); a.focus(); a.select();
    try { document.execCommand('copy'); } catch (e) {}
    a.remove();
  }
  function toast(t) {
    var d = document.createElement('div'); d.textContent = t;
    d.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;background:#166534;color:#fff;font:13px sans-serif;padding:8px 14px;border-radius:12px;max-width:90%;text-align:center';
    document.documentElement.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-do="parier"]') : null; if (!b) return;
    e.stopPropagation(); e.preventDefault();
    var id = b.getAttribute('data-id'), a = ANA.find(function (x) { return String(x.m.id) === id; });
    if (!a) return;
    var nom = b.getAttribute('data-n') || a.fav, r = reg(), mise = r.mise > 0 ? r.mise : 0;
    var txt = a.m.dom + ' vs ' + a.m.ext + ' — ' + nom + (mise ? ' — mise ' + mise + ' €' : '');
    if (r.limite > 0 && misesJour() + mise > r.limite && !confirm('⚠️ Tu dépasses ta limite du jour (' + r.limite + ' €). Continuer quand même ?')) return;
    copierSync(txt);
    toast('📋 Copié : ' + txt);
    var u = lire('parier_url', 'https://1win.com'), p = (lire('parier_pkg', '') || '').trim();
    if (/Android/i.test(navigator.userAgent) && p) {
      location.href = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=' + p +
        ';S.browser_fallback_url=' + encodeURIComponent(u) + ';end';
    } else { window.open(u, '_blank'); }
  }, true);
})();
