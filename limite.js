/* Limite de requêtes + panneau d'administration (visible seulement pour l'administrateur). */
(function () {
  'use strict';
  var SERVEUR = 'https://favoris-api.wilfranctcheutchoua886.workers.dev';

  /* --- 1) Respect de la limite par minute --- */
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

  /* --- 2) Administration dans Réglages --- */
  var ADMIN = null, OCC = false;
  function jeton() { try { return localStorage.getItem('srv_tok') || ''; } catch (e) { return ''; } }
  function monEmail() { try { return (JSON.parse(localStorage.getItem('srv_user') || 'null') || {}).email || ''; } catch (e) { return ''; } }
  function appel(chemin, corps) {
    var o = { headers: { Authorization: 'Bearer ' + jeton(), 'Content-Type': 'application/json' } };
    if (corps) { o.method = 'POST'; o.body = JSON.stringify(corps); }
    return fetch(SERVEUR + chemin, o).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); });
  }
  function verifierAdmin() {
    if (ADMIN !== null || !jeton() || !monEmail()) return;
    ADMIN = false;
    appel('/admin/user?email=' + encodeURIComponent(monEmail())).then(function (x) {
      if (x.s === 200) { ADMIN = true; if (ONG === 'reg') render(); }
    }).catch(function () { ADMIN = null; });
  }
  function carteAdmin() {
    return '<div class="carte" id="adm"><div class="fav">🔧 Administration</div>' +
      '<div class="detail">Active ou prolonge l\'abonnement d\'un client.</div>' +
      '<input id="ae" type="email" placeholder="E-mail du client" autocomplete="off" style="margin-top:8px">' +
      '<select id="ap"><option value="simple">Simple</option><option value="gold">Gold</option><option value="premium">Premium</option><option value="free">Retirer l\'offre</option></select>' +
      '<select id="ad"><option value="7">7 jours</option><option value="30" selected>30 jours</option><option value="90">90 jours</option><option value="365">365 jours</option></select>' +
      '<button class="act" data-do="a_act">Activer</button>' +
      '<button class="act gris" data-do="a_voir">Voir ce compte</button>' +
      '<div class="test" id="ar"></div>' +
      '<div class="detail">Appuie une seule fois sur Activer : chaque appui ajoute la durée.</div></div>';
  }
  var baseRender = render;
  render = function () {
    baseRender();
    if (ONG === 'reg') {
      if (ADMIN === true) document.getElementById('app').insertAdjacentHTML('afterbegin', carteAdmin());
      else verifierAdmin();
    }
  };
  function montrer(x) {
    var j = x.j, r = document.getElementById('ar'); if (!r) return;
    if (j.errors) { r.textContent = '❌ ' + (j.errors.serveur || 'Erreur'); return; }
    var f = j.exp > Date.now() ? new Date(j.exp).toLocaleDateString('fr-FR') : 'expiré';
    r.textContent = '✅ ' + j.email + '\nOffre : ' + j.plan + '\nJusqu\'au : ' + f;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset.do; if (d !== 'a_act' && d !== 'a_voir') return;
    if (OCC) return;
    var m = document.getElementById('ae').value.trim().toLowerCase(), r = document.getElementById('ar');
    if (!m) { r.textContent = 'Entre l\'e-mail du client.'; return; }
    var chemin, corps = null;
    if (d === 'a_voir') chemin = '/admin/user?email=' + encodeURIComponent(m);
    else {
      var p = document.getElementById('ap').value, j = +document.getElementById('ad').value;
      if (!confirm('Activer « ' + p + ' » pour ' + j + ' jours : ' + m + ' ?')) return;
      chemin = '/admin/setplan'; corps = { email: m, plan: p, days: j };
    }
    OCC = true; b.disabled = true; r.textContent = 'Un instant…';
    appel(chemin, corps).then(montrer).catch(function () { r.textContent = '❌ Connexion impossible.'; })
      .then(function () { OCC = false; b.disabled = false; });
  });
})();
