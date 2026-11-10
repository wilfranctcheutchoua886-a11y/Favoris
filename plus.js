/* Onglet « Stats » : résultats auto, fiabilité réelle, quota, autres sports, sauvegarde, code PIN. */
(function () {
  'use strict';
  var M = { res: '', bak: '', pin: '', diag: '' }, PCH = false;
  var $ = function (id) { return document.getElementById(id); };
  var S = window.localStorage;

  var LIBRE = /^\/(fixtures\?(live=all|ids=)|odds\/live|status)/;
  var CACHE = {}, apiBase = api;
  function compteur() {
    try { var c = JSON.parse(lire('u_cnt', 'null')); if (c && c.d === jour()) return c.n; } catch (e) {}
    return 0;
  }
  function compter() { ecrire('u_cnt', JSON.stringify({ d: jour(), n: compteur() + 1 })); }
  api = async function (chemin, sp) {
    sp = sp || SPORT;
    var res = +lire('reserve', '20');
    if (REST !== null && +REST < res && !LIBRE.test(chemin)) {
      throw new Error('Réserve de ' + res + ' requêtes gardée pour le direct et les résultats (réglable dans Stats).');
    }
    var cacheable = !/live|ids=|status/.test(chemin), cle = sp + chemin;
    if (cacheable && CACHE[cle] && Date.now() - CACHE[cle].t < 600000) return CACHE[cle].j;
    var j = await apiBase(chemin, sp);
    compter();
    if (cacheable) CACHE[cle] = { t: Date.now(), j: j };
    return j;
  };
  var badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:50;background:rgba(0,0,0,.75);color:#cbd5e1;font:11px sans-serif;padding:4px 8px;border-radius:10px';
  document.documentElement.appendChild(badge);
  setInterval(function () { badge.textContent = '📶 Requêtes restantes : ' + (REST === null ? '?' : REST); }, 2000);
  badge.textContent = '📶 Requêtes restantes : ?';

  function resoudre(fav, dom, ext, gh, ga) {
    var m;
    if (fav === dom) return gh > ga;
    if (fav === ext) return ga > gh;
    if (fav === 'Match nul') return gh === ga;
    if (/ gagne$/.test(fav)) {
      var n = fav.slice(0, -6);
      if (n === dom) return gh > ga;
      if (n === ext) return ga > gh;
      return null;
    }
    if (/ ou nul \(1X\)$/.test(fav)) return gh >= ga;
    if (/ ou nul \(X2\)$/.test(fav)) return ga >= gh;
    if (fav === 'Pas de match nul (12)') return gh !== ga;
    m = /^(Plus|Moins) de (\d+(?:\.\d+)?) /.exec(fav);
    if (m) { var t = gh + ga, k = parseFloat(m[2]); return m[1] === 'Plus' ? t > k : t < k; }
    if (fav === 'Les 2 équipes marquent : oui') return gh > 0 && ga > 0;
    if (fav === 'Les 2 équipes marquent : non') return !(gh > 0 && ga > 0);
    return null;
  }
  async function verifier() {
    if (PCH) return;
    if (!lire('cleaf', '')) { M.res = 'Ajoute ta clé API dans Réglages.'; render(); return; }
    var h = hist(), att = [];
    h.forEach(function (x, i) {
      if (x.res === null && /^\d+$/.test(String(x.id)) && /^(⚽|🔴)/.test(x.match) && x.d <= jour()) att.push(i);
    });
    if (!att.length) { M.res = 'Rien à vérifier : aucun football en attente de résultat (le basket et le handball se saisissent à la main).'; render(); return; }
    PCH = true; M.res = 'Vérification en cours…'; render();
    try {
      var ids = [], vu = {};
      att.forEach(function (i) { var id = String(h[i].id); if (!vu[id]) { vu[id] = 1; ids.push(id); } });
      var fx = {};
      for (var c = 0; c < ids.length; c += 20) {
        var j = await api('/fixtures?ids=' + ids.slice(c, c + 20).join('-'), 'foot');
        (j.response || []).forEach(function (r) { fx[String(r.fixture.id)] = r; });
      }
      var ok = 0, enCours = 0, inconnu = 0;
      att.forEach(function (i) {
        var r = fx[String(h[i].id)];
        if (!r || !/^(FT|AET|PEN)$/.test((r.fixture.status || {}).short)) { enCours++; return; }
        var ft = (r.score && r.score.fulltime) || {};
        var gh = ft.home != null ? ft.home : r.goals.home, ga = ft.away != null ? ft.away : r.goals.away;
        var v = resoudre(h[i].fav, r.teams.home.name, r.teams.away.name, gh, ga);
        if (v === null) { inconnu++; return; }
        h[i].res = v; ok++;
      });
      sauverHist(h);
      M.res = ok + ' résultat(s) mis à jour' + (enCours ? ' · ' + enCours + ' match(s) pas encore terminé(s)' : '') + (inconnu ? ' · ' + inconnu + ' à saisir à la main' : '') + '.';
    } catch (e) { M.res = 'Erreur : ' + traduire(e.message); }
    PCH = false; render();
  }

  function ligne(lib, arr) {
    var n = arr.length;
    if (!n) return '<tr><td>' + lib + '</td><td>0</td><td>–</td><td>–</td></tr>';
    var prev = arr.reduce(function (s, x) { return s + x.pf; }, 0) / n, w = arr.filter(function (x) { return x.res; }).length;
    var reel = w / n * 100, col = n >= 10 ? (reel >= prev - 5 ? '#22c55e' : '#f87171') : '#94a3b8';
    return '<tr><td>' + lib + '</td><td>' + n + '</td><td>' + prev.toFixed(0) + '%</td><td style="color:' + col + ';font-weight:bold">' + reel.toFixed(0) + '%</td></tr>';
  }
  function tableau(titre, groupes) {
    return '<div style="margin-top:10px"><b>' + titre + '</b><table style="width:100%;font-size:13px;margin-top:4px;border-collapse:collapse">' +
      '<tr style="color:#94a3b8;text-align:left"><td></td><td>Nb</td><td>Prévu</td><td>Réel</td></tr>' +
      groupes.map(function (g) { return ligne(g[0], g[1]); }).join('') + '</table></div>';
  }
  function fiabilite() {
    var h = hist().filter(function (x) { return x.res !== null; });
    if (!h.length) return '<div class="detail">Aucun résultat pour le moment. Suis des favoris avec ⭐, puis appuie sur « Vérifier les résultats ».</div>';
    var tr = [[0, 60, 'Moins de 60 %'], [60, 70, '60 à 69 %'], [70, 80, '70 à 79 %'], [80, 90, '80 à 89 %'], [90, 101, '90 % et plus']];
    var isM = function (x) { return /ou nul|Plus de|Moins de|équipes marquent|Pas de match nul|^Match nul/.test(x.fav); };
    var sp = function (x) { return /^🏀/.test(x.match) ? '🏀' : /^🤾/.test(x.match) ? '🤾' : '⚽'; };
    var out = '<div class="detail">' + h.length + ' résultat(s) · réussite globale ' + Math.round(h.filter(function (x) { return x.res; }).length / h.length * 100) + '%</div>';
    out += tableau('Par niveau de probabilité', tr.map(function (b) { return [b[2], h.filter(function (x) { return x.pf >= b[0] && x.pf < b[1]; })]; }));
    out += tableau('Par type', [['Victoire d\'une équipe', h.filter(function (x) { return !isM(x); })], ['Autres marchés', h.filter(isM)]]);
    out += tableau('Par moment', [['Avant le match', h.filter(function (x) { return !/^🔴/.test(x.match); })], ['En direct', h.filter(function (x) { return /^🔴/.test(x.match); })]]);
    out += tableau('Par sport', [['⚽ Football', h.filter(function (x) { return sp(x) === '⚽'; })], ['🏀 Basketball', h.filter(function (x) { return sp(x) === '🏀'; })], ['🤾 Handball', h.filter(function (x) { return sp(x) === '🤾'; })]]);
    out += '<div class="detail" style="margin-top:8px">' + (h.length < 20
      ? '⚠️ Moins de 20 résultats : échantillon trop petit pour conclure. Continue à suivre des favoris.'
      : 'Vert : le résultat réel est proche ou supérieur à la probabilité prévue. Rouge : les prévisions sont trop optimistes à ce niveau, alors relève ton seuil. Les lignes avec moins de 10 matchs restent grises.') + '</div>';
    return out;
  }

  async function diagnostic() {
    if (PCH) return;
    if (!lire('cleaf', '')) { M.diag = 'Ajoute ta clé API dans Réglages.'; render(); return; }
    PCH = true; M.diag = 'Diagnostic en cours (4 requêtes)…'; render();
    var t = [];
    for (var sp of ['basket', 'hand']) {
      try {
        var g = await api('/games?date=' + dateJ(0), sp);
        var l = (g.response || []).filter(function (x) { return !(x.status && /^(FT|AOT|AET|AP|CANC|PST|ABD|AWD|WO)$/i.test(x.status.short)); });
        t.push(SPORTS[sp].nom + ' : ' + (g.response || []).length + ' matchs, ' + l.length + ' à venir/en cours');
        if (!l.length) { t.push('  (aucun match à tester aujourd\'hui, essaie un autre jour)'); continue; }
        var o = await api('/odds?game=' + l[0].id, sp), bm = [];
        (o.response || []).forEach(function (e) { (e.bookmakers || []).forEach(function (b) { bm.push(b); }); });
        if (!bm.length) { t.push('  Aucune cote publiée pour le match ' + l[0].id); continue; }
        t.push('  ' + bm.length + ' bookmaker(s). Marchés du 1er :');
        (bm[0].bets || []).slice(0, 14).forEach(function (b) {
          t.push('  • ' + b.name + ' : ' + (b.values || []).slice(0, 4).map(function (v) { return v.value + '=' + v.odd; }).join(', '));
        });
      } catch (e) { t.push(SPORTS[sp].nom + ' : ' + traduire(e.message)); }
    }
    t.push('Tennis : non disponible avec ton compte API-Sports.');
    M.diag = t.join('\n');
    PCH = false; render();
  }

  function exporter() {
    var data = JSON.stringify({ app: 'favoris', v: 1, date: new Date().toISOString(), hist: hist(), ligues: ligSel() });
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = 'favoris-sauvegarde.json';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {}
    try { navigator.clipboard.writeText(data); } catch (e) {}
    M.bak = 'Sauvegarde créée (' + hist().length + ' entrées) : fichier téléchargé et copié dans le presse-papiers. La clé API n\'est jamais incluse.';
    render();
  }
  function importer(txt) {
    try {
      var d = JSON.parse(txt);
      if (!d || !Array.isArray(d.hist)) throw new Error('format');
      var h = hist(), n = 0;
      d.hist.forEach(function (x) {
        if (!x || typeof x.fav !== 'string' || typeof x.d !== 'string') return;
        if (h.some(function (y) { return String(y.id) === String(x.id) && y.d === x.d && y.fav === x.fav; })) return;
        h.push({ id: String(x.id), d: x.d, match: String(x.match || ''), fav: x.fav, pf: +x.pf || 0, res: x.res === true ? true : x.res === false ? false : null });
        n++;
      });
      sauverHist(h);
      if (Array.isArray(d.ligues)) ecrire('ligues', JSON.stringify(d.ligues.filter(function (z) { return typeof z === 'number'; })));
      M.bak = n + ' entrée(s) importée(s) (les doublons sont ignorés).';
    } catch (e) { M.bak = 'Import impossible : le texte n\'est pas une sauvegarde valide.'; }
    render();
  }

  function b64(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(t) { var s = atob(t), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function derive(pin, salt) {
    var km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function chiffrer(key, txt) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(txt)));
    var o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return b64(o);
  }
  async function dechiffrer(key, t) {
    var u = unb64(t);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12)));
  }
  async function changerPin() {
    var o = $('po').value.trim(), n = $('pn').value.trim(), n2 = $('pn2').value.trim();
    if (!S.getItem('v_salt')) { M.pin = 'Aucun code défini.'; return render(); }
    if (!/^\d{6,12}$/.test(n)) { M.pin = 'Le nouveau code doit faire 6 à 12 chiffres.'; return render(); }
    if (n !== n2) { M.pin = 'Les deux nouveaux codes sont différents.'; return render(); }
    M.pin = 'Vérification…'; render();
    try {
      var ancien = await derive(o, unb64(S.getItem('v_salt'))), ok = false;
      try { ok = (await dechiffrer(ancien, S.getItem('v_chk'))) === 'ok'; } catch (e) {}
      if (!ok) { M.pin = 'Ancien code incorrect.'; return render(); }
      var cle = S.getItem('cleaf');
      var salt = crypto.getRandomValues(new Uint8Array(16)), key = await derive(n, salt);
      S.setItem('v_salt', b64(salt));
      S.setItem('v_chk', await chiffrer(key, 'ok'));
      if (cle) S.setItem('cleaf_enc', await chiffrer(key, cle));
      alert('Code modifié. L\'appli va se rouvrir : entre ton nouveau code.');
      location.reload();
    } catch (e) { M.pin = 'Erreur : ' + e.message; render(); }
  }

  function sel(id, cur, liste) {
    return '<select id="' + id + '" style="width:100%;margin:6px 0">' + liste.map(function (o) {
      return '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>';
  }
  function msg(t) { return t ? '<div class="test" style="white-space:pre-wrap">' + esc(t) + '</div>' : ''; }
  var inp = 'style="width:100%;padding:11px;font-size:16px;border-radius:8px;border:0;margin:4px 0" inputmode="numeric" autocomplete="off"';

  function rendrePlus() {
    document.querySelectorAll('nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === 'plus'); });
    var h = '';
    h += '<div class="carte"><div class="fav">✅ Résultats automatiques</div>' +
      '<div class="detail">Marque Gagné ou Perdu tes favoris football suivis dont le match est terminé (1 requête pour 20 matchs maximum).</div>' +
      '<button class="act" data-do="p_res">Vérifier les résultats</button>' + msg(M.res) + '</div>';
    h += '<div class="carte"><div class="fav">📊 Fiabilité réelle</div>' + fiabilite() + '</div>';
    h += '<div class="carte"><div class="fav">📶 Quota</div>' +
      '<div class="detail">Restant aujourd\'hui : <b>' + (REST === null ? 'inconnu (fais une actualisation)' : REST) + '</b><br>Requêtes envoyées par l\'appli aujourd\'hui : ' + compteur() + '<br>Le quota se remet à zéro à 01h00 (Cameroun).</div>' +
      '<div class="detail" style="margin-top:8px">Réserve gardée pour le direct et les résultats (le chargement des matchs s\'arrête avant) :</div>' +
      sel('rs', lire('reserve', '20'), [[0, 'Aucune réserve'], [10, '10 requêtes'], [20, '20 requêtes (conseillé)'], [30, '30 requêtes'], [40, '40 requêtes']]) +
      '<div class="detail">Les mêmes données ne sont jamais redemandées pendant 10 minutes.</div></div>';
    h += '<div class="carte"><div class="fav">🏀🤾 Basketball, handball, tennis</div>' +
      '<div class="detail">Lance le diagnostic (4 requêtes) et envoie-moi le texte affiché : je corrigerai les marchés si besoin. Tennis : indisponible avec ton compte API-Sports.</div>' +
      '<button class="act" data-do="p_diag">Lancer le diagnostic</button>' + msg(M.diag) + '</div>';
    h += '<div class="carte"><div class="fav">💾 Sauvegarde</div>' +
      '<div class="detail">Exporte ton historique (sans clé API) pour le garder ou le remettre sur un autre téléphone.</div>' +
      '<button class="act" data-do="p_exp">Exporter</button>' +
      '<div class="detail" style="margin-top:10px">Importer : choisis le fichier ou colle le texte.</div>' +
      '<input id="pfile" type="file" accept=".json,application/json,text/plain" style="margin:6px 0;color:#cbd5e1">' +
      '<textarea id="pimp" rows="3" placeholder="Ou colle ici le texte de la sauvegarde" style="width:100%;padding:8px;border-radius:8px;border:0;font-size:13px"></textarea>' +
      '<button class="act gris" data-do="p_imp">Importer</button>' + msg(M.bak) + '</div>';
    h += '<div class="carte"><div class="fav">🔒 Changer le code PIN</div>' +
      '<input id="po" type="password" placeholder="Ancien code" ' + inp + '>' +
      '<input id="pn" type="password" placeholder="Nouveau code (6 à 12 chiffres)" ' + inp + '>' +
      '<input id="pn2" type="password" placeholder="Confirme le nouveau code" ' + inp + '>' +
      '<button class="act" data-do="p_pin">Changer le code</button>' + msg(M.pin) + '</div>';
    document.getElementById('app').innerHTML = h;
  }

  var baseRender = render;
  render = function () { if (ONG === 'plus') rendrePlus(); else baseRender(); };

  var st = document.createElement('style');
  st.textContent = 'nav button{padding:12px 2px!important;font-size:12.5px!important}';
  document.head.appendChild(st);
  var nav = document.querySelector('nav');
  var bt = document.createElement('button');
  bt.setAttribute('data-do', 'tab'); bt.setAttribute('data-tab', 'plus'); bt.textContent = '📊 Stats';
  nav.insertBefore(bt, nav.lastElementChild);

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset.do;
    if (d === 'p_res') verifier();
    else if (d === 'p_diag') diagnostic();
    else if (d === 'p_exp') exporter();
    else if (d === 'p_pin') changerPin();
    else if (d === 'p_imp') {
      var f = $('pfile').files && $('pfile').files[0], t = $('pimp').value.trim();
      if (f) { var r = new FileReader(); r.onload = function () { importer(String(r.result)); }; r.readAsText(f); }
      else if (t) importer(t);
      else { M.bak = 'Choisis un fichier ou colle le texte.'; render(); }
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'rs') ecrire('reserve', e.target.value);
  });
})();
