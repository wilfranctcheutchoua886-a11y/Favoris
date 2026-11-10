/* Onglet « Direct » : matchs en cours avec un favori très probable (football). */
(function () {
  'use strict';
  var LIVE = [], NB = 0, ERR = '', NOTE = '', MAJ = null, CH = false, SEUIL_L = 80;

  function pois(l, k) { var p = Math.exp(-l); for (var i = 1; i <= k; i++) p *= l / i; return p; }
  function modele(dg, min) {
    var r = Math.max(0.03, (90 - min) / 90), l = 1.3 * r, pd = 0, pn = 0, pe = 0;
    for (var a = 0; a <= 10; a++) for (var b = 0; b <= 10; b++) {
      var p = pois(l, a) * pois(l, b), diff = dg + a - b;
      if (diff > 0) pd += p; else if (diff < 0) pe += p; else pn += p;
    }
    var t = pd + pn + pe;
    return [pd / t * 100, pn / t * 100, pe / t * 100];
  }

  async function charger(force) {
    if (CH) return;
    if (!lire('cleaf', '')) { ERR = 'Ajoute ta clé API dans Réglages pour voir le direct.'; render(); return; }
    var age = MAJ ? Date.now() - MAJ : 1e9;
    if (!force && age < 45000) return;
    if (force && age < 30000) { NOTE = 'Patiente 30 secondes entre deux actualisations (économie du quota).'; render(); return; }
    if (REST !== null && +REST < 8) { ERR = 'Quota du jour presque épuisé : direct arrêté.'; render(); return; }
    CH = true; ERR = ''; NOTE = ''; render();
    try {
      var f = await api('/fixtures?live=all', 'foot');
      var cotes = {};
      try {
        var o = await api('/odds/live', 'foot');
        (o.response || []).forEach(function (e) {
          var id = e.fixture && e.fixture.id; if (!id) return;
          var s = e.status || {};
          if (s.stopped || s.blocked || s.finished) return;
          (e.odds || []).forEach(function (z) {
            if (!(z.id === 59 || /^(fulltime result|match winner|1x2)$/i.test(String(z.name)))) return;
            var v = z.values || [];
            var g = function (k) { var y = v.find(function (w) { return w.value === k && !w.suspended; }); return y ? parseFloat(y.odd) : 0; };
            var H = g('Home'), N = g('Draw'), A = g('Away');
            if (H > 1 && N > 1 && A > 1) cotes[id] = [H, N, A];
          });
        });
      } catch (e) {
        NOTE = 'Cotes en direct indisponibles (' + traduire(e.message) + ') : estimation par score et temps, plus prudente.';
      }
      LIVE = []; NB = 0;
      (f.response || []).forEach(function (x) {
        var st = x.fixture.status || {}, min = st.elapsed || 0;
        if (!/^(1H|2H|ET)$/.test(st.short)) return;
        NB++;
        var gd = (x.goals && x.goals.home) || 0, ge = (x.goals && x.goals.away) || 0;
        var id = x.fixture.id, src, p, dom;
        if (cotes[id]) { p = probas([cotes[id]]); src = 'cotes'; }
        else { p = modele(gd - ge, min); src = 'modele'; }
        dom = p[0] >= p[2];
        var pf = dom ? p[0] : p[2];
        var derriere = dom ? gd < ge : ge < gd;
        if (derriere || min < 10) return;
        LIVE.push({
          id: String(id), ligue: x.league.name + (x.league.country ? ' (' + x.league.country + ')' : ''),
          dom: x.teams.home.name, ext: x.teams.away.name, gd: gd, ge: ge, min: min,
          fav: dom ? x.teams.home.name : x.teams.away.name, pf: pf, src: src
        });
      });
      LIVE.sort(function (a, b) { return b.pf - a.pf; });
      MAJ = Date.now();
    } catch (e) { ERR = traduire(e.message); }
    CH = false; render();
  }

  function carte(x, i) {
    return '<div class="carte"><div class="ligne"><span class="ligue">' + esc(x.ligue) + ' · 🔴 ' + x.min + '\'</span>' +
      '<span class="tag ' + (x.src === 'cotes' ? 'forte' : 'moy') + '">' + (x.src === 'cotes' ? 'Cotes en direct' : 'Estimation') + '</span></div>' +
      '<div class="fav">' + (i + 1) + '. ' + esc(x.fav) + ' <span style="color:#22c55e">' + x.pf.toFixed(0) + '%</span></div>' +
      '<div class="detail">' + esc(x.dom) + ' <b>' + x.gd + ' - ' + x.ge + '</b> ' + esc(x.ext) + '</div>' +
      '<div class="barre"><div style="width:' + x.pf.toFixed(0) + '%;background:#22c55e"></div></div>' +
      '<button class="act" data-do="lsuivre" data-id="' + esc(x.id) + '">⭐ Suivre</button></div>';
  }

  function rendreLive() {
    document.querySelectorAll('nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === 'live'); });
    var h = '';
    var opts = [60, 70, 75, 80, 85, 90].map(function (n) {
      return '<option value="' + n + '"' + (n === SEUIL_L ? ' selected' : '') + '>Probabilité minimale : ' + n + ' %</option>';
    }).join('');
    h += '<select id="sl">' + opts + '</select>';
    h += '<div style="text-align:center"><button class="act" data-do="live">🔄 Actualiser le direct</button></div>';
    h += '<div class="info">' + (MAJ ? 'Mis à jour à ' + new Date(MAJ).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Pas encore chargé') +
      (REST !== null ? ' · requêtes restantes aujourd\'hui : ' + REST : '') + ' · 2 requêtes par actualisation</div>';
    if (CH) h += '<div class="info">Chargement du direct…</div>';
    if (NOTE) h += '<div class="info">' + esc(NOTE) + '</div>';
    if (ERR) h += '<div class="err">' + esc(ERR) + '</div>';
    if (MAJ && !CH) {
      var L = LIVE.filter(function (x) { return x.pf >= (x.src === 'cotes' ? SEUIL_L : Math.max(SEUIL_L, 85)); });
      h += '<div class="info">' + NB + ' match(s) en cours analysé(s) · ' + L.length + ' retenu(s)</div>';
      h += L.map(carte).join('') || '<div class="avert">Aucun match en direct ne remplit les conditions pour l\'instant. Un favori est retenu seulement s\'il n\'est pas mené, si 10 minutes au moins sont jouées et si sa probabilité atteint le seuil choisi. Actualise dans quelques minutes.</div>';
    }
    h += '<div class="avert">Les pourcentages viennent des cotes en direct (marge retirée) ; sans cotes, d\'une estimation à partir du score et du minutage, plus prudente (85 % minimum). Un match en direct peut basculer sur un seul but ou un carton rouge : aucun résultat n\'est sûr à 100 %. Joue avec modération.</div>';
    document.getElementById('app').innerHTML = h;
  }

  var baseRender = render;
  render = function () { if (ONG === 'live') rendreLive(); else baseRender(); };

  var nav = document.querySelector('nav');
  var bt = document.createElement('button');
  bt.setAttribute('data-do', 'tab'); bt.setAttribute('data-tab', 'live'); bt.textContent = '🔴 Direct';
  nav.insertBefore(bt, nav.children[1]);

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab === 'live') setTimeout(function () { charger(false); }, 0);
    if (b.dataset.do === 'live') charger(true);
    if (b.dataset.do === 'lsuivre') {
      var x = LIVE.find(function (y) { return y.id === b.dataset.id; }); if (!x) return;
      var h = hist();
      if (h.some(function (z) { return String(z.id) === x.id && z.d === jour() && z.fav === x.fav; })) { alert('Déjà suivi aujourd\'hui.'); return; }
      h.push({ id: x.id, d: jour(), match: '🔴 ' + x.dom + ' vs ' + x.ext + ' (direct ' + x.min + '\')', fav: x.fav, pf: Math.round(x.pf), res: null });
      sauverHist(h); alert('Ajouté à l\'historique.');
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'sl') { SEUIL_L = +e.target.value; render(); }
  });
})();
