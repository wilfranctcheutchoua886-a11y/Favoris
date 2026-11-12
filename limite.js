/* Respecte la limite de requêtes par minute et réessaie quand le serveur dit « trop de requêtes ». */
(function () {
  'use strict';
  var base = api;
  api = async function (chemin, sp) {
    await creneau();
    for (var t = 0; ; t++) {
      try { return await base(chemin, sp); }
      catch (e) {
        if (/rate ?limit|too many/i.test(String(e.message)) && t < 2) { await pause(15000); continue; }
        throw e;
      }
    }
  };
})();
