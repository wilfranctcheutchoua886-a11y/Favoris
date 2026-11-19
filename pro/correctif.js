/* Pronos Pro : réessaie après la limite par minute + affiche le vrai message de l'API (diagnostic). */
(function () {
  'use strict';
  var vraiFetch = window.fetch.bind(window);
  var ATT = window.__RL_WAIT || 65000;
  var bulle = null, tmo = null;
  function info(t, dur) {
    if (!t) { if (bulle) { bulle.remove(); bulle = null; } return; }
    if (!bulle) {
      bulle = document.createElement('div');
      bulle.style.cssText = 'position:fixed;left:8px;right:8px;bottom:90px;z-index:70;background:#1e3a8a;color:#fff;padding:9px 14px;border-radius:12px;font:13px sans-serif;text-align:center;word-break:break-word';
      document.documentElement.appendChild(bulle);
    }
    bulle.textContent = t;
    clearTimeout(tmo);
    if (dur) tmo = setTimeout(function () { info(''); }, dur);
  }
  window.fetch = async function (url, opt) {
    var essai = 0, r;
    for (;;) {
      r = await vraiFetch(url, opt);
      if (String(url).indexOf('api-sports.io') < 0) return r;
      var j = null;
      try { j = await r.clone().json(); } catch (e) {}
      var er = j && j.errors, txt = er && (Array.isArray(er) ? er.join(' ') : Object.keys(er).map(function (k) { return k + ' ' + er[k]; }).join(' '));
      if (!txt) { if (essai) info(''); return r; }
      var jour = r.headers.get('x-ratelimit-requests-remaining'), min = r.headers.get('x-ratelimit-remaining');
      var diag = 'API : ' + txt + ' | reste jour : ' + jour + ' | reste minute : ' + min + ' | ' + String(url).replace(/^https:\/\/[^/]+/, '').slice(0, 60);
      if (/rate ?limit|per minute|too many/i.test(txt) && !/for the day/i.test(txt) && essai < 2) {
        essai++;
        if (ATT < 1000) { await new Promise(function (ok) { setTimeout(ok, ATT); }); }
        else { for (var s = Math.round(ATT / 1000); s > 0; s--) { info('⏳ Limite par minute : reprise dans ' + s + ' s — ' + diag); await new Promise(function (ok) { setTimeout(ok, 1000); }); } }
        continue;
      }
      info(diag, 40000);
      return r;
    }
  };
})();
