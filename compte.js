/* Version clients : connexion, inscription, offre, données via le serveur. */
(function () {
  'use strict';
  var SERVEUR = 'https://favoris-api.wilfranctcheutchoua886.workers.dev';
  var CONTACT = ''; /* ex. https://wa.me/237XXXXXXXXX : lien WhatsApp pour s'abonner */
  var K_T = 'srv_tok', K_U = 'srv_user';
  var TOKEN = '', USER = null, OCC = false, MSG = '';
  try { TOKEN = localStorage.getItem(K_T) || ''; USER = JSON.parse(localStorage.getItem(K_U) || 'null'); } catch (e) {}
  function garder() { try { localStorage.setItem(K_T, TOKEN); localStorage.setItem(K_U, JSON.stringify(USER)); } catch (e) {} }
  function effacer() { try { localStorage.removeItem(K_T); localStorage.removeItem(K_U); } catch (e) {} }

  var lireBase = lire;
  lire = function (k, d) { return k === 'cleaf' ? (TOKEN ? 'serveur' : d) : lireBase(k, d); };

  api = async function (chemin, sp) {
    sp = sp || SPORT;
    var r;
    try { r = await fetch(SERVEUR + '/api?sp=' + sp + '&p=' + encodeURIComponent(chemin), { headers: { Authorization: 'Bearer ' + TOKEN } }); }
    catch (e) { throw new Error('Failed to fetch'); }
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (r.status === 401) { sortir('Session expirée : reconnecte-toi.'); throw new Error('Session expirée : reconnecte-toi.'); }
    var er = j.errors, msg = '';
    if (er) msg = er.serveur || (Array.isArray(er) ? er.join(' | ') : Object.keys(er).map(function (k) { return k + ' : ' + er[k]; }).join(' | '));
    if (!r.ok && !msg) msg = 'Erreur du serveur (' + r.status + ').';
    if (msg) throw new Error(msg);
    return j;
  };

  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f172a;color:#fff;font-family:sans-serif;display:none;align-items:center;justify-content:center;padding:20px;overflow:auto';
  document.documentElement.appendChild(box);
  var inp = 'width:100%;padding:12px;font-size:16px;border-radius:8px;border:0;margin:5px 0;box-sizing:border-box';
  var btn = 'width:100%;padding:12px;margin-top:8px;border:0;border-radius:8px;font-weight:bold;font-size:16px;';

  function ecran(info) {
    box.style.display = 'flex';
    box.innerHTML =
      '<div style="width:100%;max-width:340px;text-align:center">' +
      '<div style="font-size:42px">🏆</div>' +
      '<div style="font-size:20px;font-weight:bold;margin:8px 0">Favoris du jour</div>' +
      '<div style="font-size:14px;color:#94a3b8;margin-bottom:14px">Connecte-toi ou crée un compte. Nouveau compte : 3 jours d\'essai gratuit.</div>' +
      '<input id="ce" type="email" autocomplete="email" placeholder="Adresse e-mail" style="' + inp + '">' +
      '<input id="cp" type="password" autocomplete="current-password" placeholder="Mot de passe (8 caractères minimum)" style="' + inp + '">' +
      '<button id="cl" style="' + btn + 'background:#22c55e;color:#000">Se connecter</button>' +
      '<button id="cn" style="' + btn + 'background:#334155;color:#fff">Créer un compte (essai gratuit)</button>' +
      '<div id="cm" style="min-height:20px;margin-top:10px;font-size:13px;color:#facc15">' + (info || '') + '</div>' +
      '<div style="margin-top:10px;font-size:11px;color:#64748b;line-height:1.4">Réservé aux adultes. Les pourcentages sont des estimations : aucun résultat n\'est garanti. Joue avec modération.</div></div>';
    var $ = function (id) { return document.getElementById(id); };
    function aller(chemin) {
      if (OCC) return;
      var e = $('ce').value.trim(), p = $('cp').value;
      if (!e || !p) { $('cm').textContent = 'Entre ton e-mail et ton mot de passe.'; return; }
      OCC = true; $('cm').textContent = 'Un instant…';
      fetch(SERVEUR + chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          OCC = false;
          if (j.token) { TOKEN = j.token; USER = j.user; garder(); box.style.display = 'none'; box.innerHTML = ''; demarrer(false); render(); }
          else $('cm').textContent = (j.errors && j.errors.serveur) || 'Erreur : réessaie.';
        })
        .catch(function () { OCC = false; $('cm').textContent = 'Connexion impossible. Vérifie ton Internet.'; });
    }
    $('cl').addEventListener('click', function () { aller('/login'); });
    $('cn').addEventListener('click', function () { aller('/register'); });
  }
  function sortir(info) { TOKEN = ''; USER = null; effacer(); ANA = []; ecran(info); }

  function nomOffre(p) { return { simple: 'Simple', gold: 'Gold', premium: 'Premium', free: 'Aucune offre active' }[p] || p; }
  function rendreCompte() {
    document.querySelectorAll('nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === 'reg'); });
    var u = USER || {}, h = '';
    var fin = u.exp > Date.now() ? new Date(u.exp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    h += '<div class="carte"><div class="fav">👤 Mon compte</div>' +
      '<div class="detail">' + esc(u.email || '') + '</div>' +
      '<div class="detail" style="margin-top:6px">Offre : <b>' + esc(nomOffre(u.plan)) + '</b>' + (u.essai && u.plan !== 'free' ? ' (essai gratuit)' : '') + '</div>' +
      (fin ? '<div class="detail">Valable jusqu\'au ' + esc(fin) + '</div>' : '<div class="ko">⚠️ Abonnement expiré : renouvelle ton offre.</div>') +
      '<button class="act" data-do="c_maj">Actualiser mon compte</button>' +
      '<button class="act gris" data-do="c_out">Se déconnecter</button>' + (MSG ? '<div class="test">' + esc(MSG) + '</div>' : '') + '</div>';
    h += '<div class="carte"><div class="fav">💎 Les offres</div>' +
      '<div class="detail"><b>Simple</b> : favoris football à confiance forte.<br><b>Gold</b> : Simple + tous les marchés, basketball et handball.<br><b>Premium</b> : Gold + matchs en direct et statistiques.</div>' +
      (CONTACT ? '<a href="' + esc(CONTACT) + '" style="display:inline-block;margin-top:10px;padding:10px 14px;border-radius:8px;background:#22c55e;color:#000;font-weight:bold;text-decoration:none">S\'abonner ou renouveler</a>'
        : '<div class="detail" style="margin-top:8px">Pour t\'abonner ou renouveler, contacte le support.</div>') + '</div>';
    h += AVERT;
    document.getElementById('app').innerHTML = h;
  }
  var baseRender = render;
  render = function () { if (ONG === 'reg') rendreCompte(); else baseRender(); };

  function majCompte() {
    return fetch(SERVEUR + '/me', { headers: { Authorization: 'Bearer ' + TOKEN } })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        if (x.s === 401) { sortir('Session expirée : reconnecte-toi.'); return; }
        if (x.j.user) { USER = x.j.user; garder(); MSG = 'Compte à jour.'; } else MSG = 'Mise à jour impossible.';
        render();
      })
      .catch(function () { MSG = 'Connexion impossible.'; render(); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.do === 'c_out') { sortir(''); }
    if (b.dataset.do === 'c_maj') { MSG = 'Mise à jour…'; render(); majCompte(); }
  });

  setInterval(function () {
    document.querySelectorAll('div').forEach(function (d) { if (d.style.position === 'fixed' && /^📶/.test(d.textContent)) d.style.display = 'none'; });
  }, 2000);

  if (TOKEN) { majCompte().then(function () { if (TOKEN) demarrer(false); }); } else { ecran(''); }
})();
