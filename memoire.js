/* Mémoire du jour : les matchs trouvés à chaque actualisation sont gardés jusqu'à 23 h 59. */
(function () {
  'use strict';
  var PRE = 'mem_';

  function finDuJour(d) {
    var t = new Date(d + 'T23:59:59').getTime();
    return isNaN(t) ? Date.now() + 6 * 3600 * 1000 : t;
  }
  function cle(d, sp) { return PRE + (sp || SPORT) + '_' + d; }
  function lireMem(d, sp) {
    try {
      var o = JSON.parse(lire(cle(d, sp), 'null'));
      if (o && o.fin > Date.now() && Array.isArray(o.matchs)) return o.matchs;
    } catch (e) {}
    return [];
  }
  function ecrireMem(d, matchs, sp) {
    ecrire(cle(d, sp), JSON.stringify({ fin: finDuJour(d), matchs: matchs }));
  }
  function fusion(ancien, neuf) {
    var par = {}, ordre = [];
    ancien.forEach(function (m) { par[m.id] = m; ordre.push(m.id); });
    neuf.forEach(function (m) { if (!(m.id in par)) ordre.push(m.id); par[m.id] = m; });
    return ordre.map(function (id) { return par[id]; });
  }

  /* Nettoyage : on efface les mémoires dont l'heure limite est passée. */
  try {
    Object.keys(localStorage).filter(function (k) { return k.indexOf(PRE) === 0; }).forEach(function (k) {
      try { var o = JSON.parse(localStorage.getItem(k)); if (!o || !(o.fin > Date.now())) localStorage.removeItem(k); }
      catch (e) { localStorage.removeItem(k); }
    });
  } catch (e) {}

  /* Les matchs déjà chargés par l'appli (cache ordinaire) rejoignent aussi la mémoire du jour. */
  function semer(sp, d, matchs) {
    if (!Array.isArray(matchs) || !matchs.length || finDuJour(d) < Date.now()) return;
    ecrireMem(d, fusion(lireMem(d, sp), matchs), sp);
  }
  function depuisCle(k, v) {
    var m = /^c2_v3_([a-z]+)_(\d{4}-\d{2}-\d{2})_/.exec(k);
    if (!m) return;
    try { semer(m[1], m[2], JSON.parse(v).matchs); } catch (e) {}
  }
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('c2_v3_') === 0) depuisCle(k, localStorage.getItem(k));
    });
  } catch (e) {}
  var baseEcrire = ecrire;
  ecrire = function (k, v) { baseEcrire(k, v); depuisCle(k, v); };

  var base = depuisApi;
  depuisApi = async function (d) {
    var avant = lireMem(d), neuf;
    try {
      neuf = await base(d);
    } catch (e) {
      if (avant.length) {
        NOTE = 'Actualisation impossible (' + traduire(e.message) + ') : résultats gardés en mémoire jusqu\'à 23 h 59.';
        return avant;
      }
      throw e;
    }
    var tout = fusion(avant, neuf);
    if (tout.length) ecrireMem(d, tout);
    var gardes = tout.length - neuf.length;
    if (gardes > 0) NOTE = (NOTE ? NOTE + ' ' : '') + gardes + ' match(s) trouvé(s) plus tôt dans la journée gardé(s) en mémoire jusqu\'à 23 h 59.';
    return tout;
  };
})();
