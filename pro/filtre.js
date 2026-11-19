/* Pronos Pro : ne garde que les propositions de confiance forte. À charger APRÈS moteur.js et AVANT app.js. */
(function () {
  'use strict';
  var P = window.PM;
  function seuil() { return +P.g('pp_seuil', '70') || 70; }
  function fmin() { return P.g('pp_fmin', 'bonne'); }
  function okpk(pk) {
    if (pk.p < seuil()) return false;
    return fmin() === 'elevee' ? (pk.n >= 5 && pk.sd <= 2.5) : (pk.n >= 3 && pk.sd <= 4);
  }
  function filt(c) {
    if (!c) return c;
    return { t: c.t, m: c.m.map(function (m) { var o = {}; for (var k in m) o[k] = m[k]; o.pk = m.pk.filter(okpk); return o; }).filter(function (m) { return m.pk.length; }) };
  }
  var oc = P.cache, och = P.charger;
  P.cache = function (sp, d) { return filt(oc(sp, d)); };
  P.charger = async function () { var c = await och.apply(this, arguments); return filt(c); };
  /* les propositions très sûres (80 % et +) restent même avec une petite cote */
  P.valide = function (pk) { var c = P.cfg(); return pk.n >= c.minbk && (P.oddEff(pk) >= c.cmin || pk.p >= 80); };

  function carte() {
    var s = seuil(), f = fmin(), o = '';
    [60, 65, 70, 75, 80, 85].forEach(function (v) { o += '<option value="' + v + '"' + (v === s ? ' selected' : '') + '>' + v + ' % et plus</option>'; });
    return '<div class="card" id="f_carte"><h2>🔒 Confiance forte uniquement</h2><div class="mut">Les propositions en dessous de ce seuil ne sont plus affichées. Celles à 80 % et plus restent toujours visibles, même avec une petite cote.</div>' +
      '<label class="l">Probabilité minimale</label><select id="f_seuil">' + o + '</select>' +
      '<label class="l">Fiabilité minimale des données</label><select id="f_fmin"><option value="bonne"' + (f === 'bonne' ? ' selected' : '') + '>Bonne ou élevée (3 bookmakers et +)</option><option value="elevee"' + (f === 'elevee' ? ' selected' : '') + '>Élevée seulement (5 bookmakers et +)</option></select></div>';
  }
  function injecter() {
    var v = document.getElementById('vue');
    if (!v || document.getElementById('f_carte') || v.textContent.indexOf('Clé API-Sports') < 0 || v.textContent.indexOf('Paramètres') < 0) return;
    var d = document.createElement('div'); d.innerHTML = carte();
    var cartes = v.querySelectorAll('.card');
    if (cartes[0]) cartes[0].parentNode.insertBefore(d.firstChild, cartes[0]); else v.appendChild(d.firstChild);
  }
  document.addEventListener('change', function (e) {
    if (e.target.id === 'f_seuil') P.s('pp_seuil', e.target.value);
    else if (e.target.id === 'f_fmin') P.s('pp_fmin', e.target.value);
    else return;
    setTimeout(function () { location.reload(); }, 250);
  });
  new MutationObserver(injecter).observe(document.documentElement, { childList: true, subtree: true });
})();
