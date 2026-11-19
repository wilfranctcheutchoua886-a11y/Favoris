/* Pronos Pro : si l'API répond "trop de requêtes par minute", attend 65 s puis réessaie (2 fois max). */
(function () {
  'use strict';
  var vraiFetch = window.fetch.bind(window);
  var ATT = window.__RL_WAIT || 65000;
  var bulle = null;
  function info(t) {
    if (!t) { if (bulle) { bulle.remove(); bulle = null; } return; }
    if (!bulle) {
      bulle = document.createElement('div');
      bulle.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:70;background:#1e3a8a;color:#fff;padding:9px 14px;border-radius:12px;font:14px sans-serif;max-width:92%;text-align:center';
      document.documentElement.appendChild(bulle);
    }
    bulle.textContent = t;
  }
  window.fetch = async function (url, opt) {
    var essai = 0, r;
    for (;;) {
      r = await vraiFetch(url, opt);
      if (String(url).indexOf('api-sports.io') < 0 || essai >= 2) { info(''); return r; }
      var j = null;
      try { j = await r.clone().json(); } catch (e) {}
      var er = j && j.errors, txt = er && (Array.isArray(er) ? er.join(' ') : Object.keys(er).map(function (k) { return k + ' ' + er[k]; }).join(' '));
      if (txt && /rate ?limit|per minute|too many/i.test(txt) && !/for the day/i.test(txt)) {
        essai++;
        for (var s = Math.round(ATT / 1000); s > 0; s--) { info('⏳ Limite par minute atteinte : reprise dans ' + s + ' s…'); await new Promise(function (ok) { setTimeout(ok, ATT < 1000 ? ATT : 1000); }); if (ATT < 1000) break; }
        info('');
        continue;
      }
      info('');
      return r;
    }
  };
})();
