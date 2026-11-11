/* Résultats automatiques : vérifie tout seul les favoris football suivis (1 requête par vérification). */
(function () {
  'use strict';
  var MAX_JOUR = 6, DELAI = 30 * 60 * 1000;

  function enAttente() {
    return hist().some(function (x) {
      return x.res === null && /^\d+$/.test(String(x.id)) && /^(⚽|🔴)/.test(x.match) && x.d <= jour();
    });
  }
  function nbResolus() { return hist().filter(function (x) { return x.res !== null; }).length; }
  function essais() {
    try { var c = JSON.parse(lire('auto_n', 'null')); if (c && c.d === jour()) return c; } catch (e) {}
    return { d: jour(), n: 0, t: 0 };
  }

  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;background:#166534;color:#fff;font:13px sans-serif;padding:8px 14px;border-radius:12px;display:none;max-width:90%;text-align:center';
  document.documentElement.appendChild(toast);
  function annoncer(t) { toast.textContent = t; toast.style.display = 'block'; setTimeout(function () { toast.style.display = 'none'; }, 6000); }

  function verifier() {
    if (document.hidden || !lire('cleaf', '') || !enAttente()) return;
    if (ONG === 'reg' || ONG === 'plus') return;
    var c = essais();
    if (c.n >= MAX_JOUR || Date.now() - c.t < DELAI) return;
    if (REST !== null && +REST < 5) return;
    ecrire('auto_n', JSON.stringify({ d: c.d, n: c.n + 1, t: Date.now() }));
    var avant = nbResolus();
    var b = document.createElement('button');
    b.setAttribute('data-do', 'p_res');
    document.body.appendChild(b); b.click(); b.remove();
    setTimeout(function () {
      var n = nbResolus() - avant;
      if (n > 0) annoncer('✅ ' + n + ' résultat(s) mis à jour automatiquement (voir Historique et Stats)');
    }, 12000);
  }

  setInterval(verifier, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(verifier, 5000); });
  setTimeout(verifier, 8000);
})();
