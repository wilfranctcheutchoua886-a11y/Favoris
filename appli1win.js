/* Lance l'appli 1win installée (comme l'icône). À charger APRÈS parier.js. */
(function () {
  'use strict';
  function pkg() { return (lire('parier_pkg', '') || '').trim(); }
  function intention(u) {
    var p = pkg();
    if (p) {
      return 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=' + p +
        ';S.browser_fallback_url=' + encodeURIComponent(u) + ';end';
    }
    var a; try { a = new URL(u); } catch (e) { return null; }
    return 'intent://' + a.host + a.pathname + a.search + '#Intent;scheme=' + a.protocol.replace(':', '') + ';action=android.intent.action.VIEW;S.browser_fallback_url=' + encodeURIComponent(u) + ';end';
  }
  var ouvrir = window.open;
  window.open = function (u) {
    try {
      var base = lire('parier_url', 'https://1win.com');
      if (u && String(u).indexOf(base) === 0 && /Android/i.test(navigator.userAgent)) {
        var i = intention(String(u)); if (i) { location.href = i; return null; }
      }
    } catch (e) {}
    return ouvrir.apply(window, arguments);
  };
  document.addEventListener('change', function (e) { if (e.target.id === 'p_pkg') ecrire('parier_pkg', e.target.value.trim()); });
  var ro = render;
  render = function () {
    var v = ro.apply(this, arguments);
    try {
      var b = document.getElementById('p_bloc');
      if (b && !document.getElementById('p_pkg')) {
        var d = document.createElement('div');
        d.innerHTML = '<div style="margin-top:8px;font-size:13px">Nom du paquet de l\'appli 1win (optionnel, pour l\'ouvrir directement) :' +
          '<input id="p_pkg" type="text" placeholder="ex. com.xxxx.xxxx" value="' + pkg().replace(/"/g, '&quot;') + '" style="width:100%;padding:8px;margin-top:4px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e2e8f0"></div>';
        b.appendChild(d.firstChild);
      }
    } catch (e) {}
    return v;
  };
})();
