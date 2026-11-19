/* Pronos Pro : plan gratuit = cotes limitées à 3 pages (on ignore page 4+), respecte 10 requêtes/minute (même après rechargement), réessaie si limite atteinte, affiche le vrai message de l'API. */
(function () {
  'use strict';
  var vraiFetch = window.fetch.bind(window);
  var ATT = window.__RL_WAIT || 65000, GAP = window.__GAP != null ? window.__GAP : 6500;
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
  function lu(k) { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } }
  function ecrit(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  async function pause(url) {
    var h = (/\/\/([^/]+)/.exec(url) || [])[1] || '', k = 'pp_last_' + h;
    var w = lu(k) + GAP - Date.now();
    if (w > 0) await new Promise(function (ok) { setTimeout(ok, Math.min(w, GAP)); });
    ecrit(k, Date.now());
  }
  window.fetch = async function (url, opt) {
    if (String(url).indexOf('api-sports.io') < 0) return vraiFetch(url, opt);
    var pg = /\/odds\?date=[^&]*&page=(\d+)/.exec(String(url));
    if (pg && +pg[1] > 3) {
      return new Response(JSON.stringify({ errors: [], paging: { current: 1, total: 1 }, response: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    var essai = 0, r;
    for (;;) {
      await pause(String(url));
      r = await vraiFetch(url, opt);
      var j = null;
      try { j = await r.clone().json(); } catch (e) {}
      var er = j && j.errors, txt = er && (Array.isArray(er) ? er.join(' ') : Object.keys(er).map(function (k) { return k + ' ' + er[k]; }).join(' '));
      if (!txt) { if (essai) info(''); return r; }
      var jour = r.headers.get('x-ratelimit-requests-remaining'), min = r.headers.get('x-ratelimit-remaining');
      var diag = 'API : ' + txt + ' | reste jour : ' + jour + ' | reste minute : ' + min;
      if (/rate ?limit|per minute|too many/i.test(txt) && !/for the day/i.test(txt) && essai < 2) {
        essai++;
        if (ATT < 1000) { await new Promise(function (ok) { setTimeout(ok, ATT); }); }
        else { for (var s = Math.round(ATT / 1000); s > 0; s--) { info('⏳ Limite par minute : reprise dans ' + s + ' s', 0); await new Promise(function (ok) { setTimeout(ok, 1000); }); } }
        continue;
      }
      info(diag, 40000);
      return r;
    }
  };
  info('✅ Correctif actif', 3000);
})();
