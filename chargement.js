/* Écran de chargement au démarrage. À placer tout en haut de index.html. */
(function () {
  'use strict';
  var debut = Date.now(), MIN = 1200, MAX = 12000;
  var st = document.createElement('style');
  st.textContent = '#chg{position:fixed;inset:0;z-index:99999;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;transition:opacity .4s}' +
    '#chg .t{font-size:64px;animation:chgb 1s ease-in-out infinite}' +
    '#chg h1{font-size:22px;margin:10px 0 4px}#chg p{color:#94a3b8;font-size:14px;margin:0 0 18px;min-height:18px}' +
    '#chg .b{width:180px;height:6px;background:#1e293b;border-radius:3px;overflow:hidden}' +
    '#chg .b i{display:block;height:100%;width:40%;background:#22c55e;border-radius:3px;animation:chgl 1.1s linear infinite}' +
    '@keyframes chgb{50%{transform:translateY(-10px) scale(1.08)}}@keyframes chgl{0%{margin-left:-40%}100%{margin-left:100%}}';
  var d = document.createElement('div');
  d.id = 'chg';
  d.innerHTML = '<div class="t">🏆</div><h1>Favoris du jour</h1><p id="chgm">Chargement des matchs…</p><div class="b"><i></i></div>';
  (document.head || document.documentElement).appendChild(st);
  document.documentElement.appendChild(d);
  var msgs = ['Chargement des matchs…', 'Lecture des cotes…', 'Calcul des favoris…'], n = 0;
  var tm = setInterval(function () { var p = document.getElementById('chgm'); if (p) p.textContent = msgs[++n % msgs.length]; }, 1800);
  function fin() {
    clearInterval(tm); clearInterval(w);
    d.style.opacity = '0';
    setTimeout(function () { d.remove(); st.remove(); }, 450);
  }
  var w = setInterval(function () {
    var t = Date.now() - debut;
    var pret = false;
    try { pret = typeof CHARGE !== 'undefined' && !CHARGE && document.getElementById('app') && document.getElementById('app').children.length > 0; } catch (e) {}
    if ((pret && t > MIN) || t > MAX) fin();
  }, 250);
})();
