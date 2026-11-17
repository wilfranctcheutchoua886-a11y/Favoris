/* Bilan : résultats automatiques (tous sports) + gains/pertes avec mise + limite du jour. */
(function () {
  'use strict';
  var MAX_JOUR = 8, DELAI = 20 * 60 * 1000, FINI = /^(FT|AOT|AET|AP|OT|PEN)$/;
  var occupe = false, MSG = '';

  function sportDe(x) {
    var k, ic = String(x.match || '').split(' ')[0];
    for (k in SPORTS) { if (k !== 'tous' && SPORTS[k].icone === ic) return k; }
    return null;
  }
  function numId(x) { return String(x.id).replace(/^[a-z]+-/, ''); }
  function nb(v) { if (v && typeof v === 'object') v = v.total; return v == null ? null : +v; }
  function resoudre(fav, dom, ext, gh, ga) {
    var m;
    if (fav === dom) return gh > ga;
    if (fav === ext) return ga > gh;
    if (fav === 'Match nul') return gh === ga;
    if (/ gagne$/.test(fav)) { var n = fav.slice(0, -6); if (n === dom) return gh > ga; if (n === ext) return ga > gh; return null; }
    if (/ ou nul \(1X\)$/.test(fav)) return gh >= ga;
    if (/ ou nul \(X2\)$/.test(fav)) return ga >= gh;
    m = /^(Plus|Moins) de (\d+(?:\.\d+)?) /.exec(fav);
    if (m) { var t = gh + ga, k = parseFloat(m[2]); return m[1] === 'Plus' ? t > k : t < k; }
    return null;
  }
  function enAttente() {
    return hist().some(function (x) {
      var s = sportDe(x);
      return x.res === null && s && s !== 'foot' && x.d <= jour();
    });
  }
  function essais() {
    try { var c = JSON.parse(lire('bilan_n', 'null')); if (c && c.d === jour()) return c; } catch (e) {}
    return { d: jour(), n: 0, t: 0 };
  }

  async function verifier(manuel) {
    if (occupe) return;
    if (!lire('cleaf', '')) { if (manuel) { MSG = 'Ajoute ta clé API dans Réglages.'; render(); } return; }
    var h = hist(), att = [];
    h.forEach(function (x, i) { var s = sportDe(x); if (x.res === null && s && s !== 'foot' && x.d <= jour()) att.push(i); });
    if (!att.length) { if (manuel) { MSG = 'Rien à vérifier (hors football, qui a son propre bouton).'; render(); } return; }
    occupe = true; if (manuel) { MSG = 'Vérification en cours…'; render(); }
    var ok = 0, enCours = 0, inconnu = 0, vu = {};
    try {
      for (var q = 0; q < att.length && q < 12; q++) {
        var x = h[att[q]], s = sportDe(x), id = numId(x), cle = s + id;
        if (!(cle in vu)) {
          var j = await api('/games?id=' + id, s);
          vu[cle] = (j.response || [])[0] || null;
        }
        var r = vu[cle];
        if (!r || !FINI.test((r.status || {}).short || '')) { enCours++; continue; }
        var gh = nb((r.scores || {}).home), ga = nb((r.scores || {}).away);
        if (gh == null || ga == null) { inconnu++; continue; }
        var v = resoudre(x.fav, r.teams.home.name, r.teams.away.name, gh, ga);
        if (v === null) { inconnu++; continue; }
        x.res = v; ok++;
      }
      sauverHist(h);
      MSG = ok + ' résultat(s) mis à jour' + (enCours ? ' · ' + enCours + ' pas encore terminé(s)' : '') + (inconnu ? ' · ' + inconnu + ' à saisir à la main' : '') + '.';
    } catch (e) { MSG = 'Erreur : ' + traduire(e.message); }
    occupe = false;
    if (ONG === 'hist' || ONG === 'plus') render();
    return ok;
  }

  /* ---------- gains / pertes ---------- */
  function reg() { try { return JSON.parse(lire('bilan_reg', 'null')) || {}; } catch (e) { return {}; } }
  function sauverReg(r) { ecrire('bilan_reg', JSON.stringify(r)); }
  function miseDuJour() {
    return hist().filter(function (x) { return x.d === jour() && x.mise > 0; }).reduce(function (s, x) { return s + x.mise; }, 0);
  }
  function euros(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + ' €'; }
  function remplirNouveaux() {
    var r = reg(), h = hist(), chg = false;
    h.forEach(function (x) {
      if (x.mise == null && r.mise > 0) { x.mise = r.mise; chg = true; }
      if (x.cote == null && x.pf > 0) { x.cote = Math.round(10000 / x.pf) / 100; chg = true; }
    });
    if (chg) sauverHist(h);
  }
  function panneau() {
    var r = reg(), h = hist(), tot = 0, gain = 0, n = 0, en = 0;
    h.forEach(function (x) {
      if (!(x.mise > 0) || !(x.cote > 1)) return;
      if (x.res === null) { en += x.mise; return; }
      n++; tot += x.mise; gain += x.res ? x.mise * (x.cote - 1) : -x.mise;
    });
    var jr = miseDuJour(), lim = r.limite || 0, depasse = lim > 0 && jr > lim;
    var col = gain >= 0 ? '#22c55e' : '#f87171';
    var o = '<div class="stat" id="bilan"><b>💶 Gains / pertes</b><br>' +
      (n ? 'Net : <b style="color:' + col + '">' + euros(gain) + '</b> sur ' + n + ' pari(s) · mises ' + tot.toFixed(2).replace('.', ',') + ' € · rendement ' + (tot ? (gain / tot * 100).toFixed(0) : 0) + '%'
        : 'Aucun pari terminé avec mise.') +
      (en ? '<br><small>En cours : ' + en.toFixed(2).replace('.', ',') + ' € misés</small>' : '') +
      '<br><small>Aujourd\'hui : ' + jr.toFixed(2).replace('.', ',') + ' € misés' + (lim ? ' / limite ' + lim + ' €' : '') + '</small>' +
      (depasse ? '<br><b style="color:#f87171">⚠️ Limite du jour dépassée. Arrête-toi pour aujourd\'hui.</b>' : '') +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:13px">' +
      'Mise par défaut <input id="b_mise" type="number" min="0" step="0.5" value="' + (r.mise || '') + '" style="width:64px"> €' +
      ' Limite/jour <input id="b_lim" type="number" min="0" step="1" value="' + (r.limite || '') + '" style="width:64px"> €</div>' +
      '<div style="margin-top:8px"><button class="act" data-do="b_ver">Vérifier les autres sports</button>' + (MSG ? '<div class="detail">' + esc(MSG) + '</div>' : '') + '</div>' +
      '<small style="color:#94a3b8">Jeu responsable : ne mise que ce que tu peux perdre. Les cotes sont estimées (100 ÷ probabilité) : corrige-les ci-dessous avec la vraie cote.</small>';
    var rec = [];
    for (var k = h.length - 1; k >= 0 && rec.length < 10; k--) rec.push(k);
    o += '<div style="margin-top:8px;font-size:13px">' + rec.map(function (k) {
      var x = h[k];
      return '<div style="margin-top:4px;border-top:1px solid #334155;padding-top:4px">' + esc(x.match) + ' · ' + esc(x.fav) +
        '<br>Cote <input data-bk="' + k + '" data-bf="cote" type="number" step="0.01" min="1" value="' + (x.cote || '') + '" style="width:64px">' +
        ' Mise <input data-bk="' + k + '" data-bf="mise" type="number" step="0.5" min="0" value="' + (x.mise || '') + '" style="width:64px"> €</div>';
    }).join('') + '</div></div>';
    return o;
  }

  function injecter() {
    var app = document.getElementById('app');
    if (!app || ONG !== 'hist' || document.getElementById('bilan')) return;
    var d = document.createElement('div'); d.innerHTML = panneau();
    app.insertBefore(d.firstChild, app.firstChild);
  }
  var ro = render;
  render = function () { var v = ro.apply(this, arguments); try { injecter(); } catch (e) {} return v; };

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'b_mise' || t.id === 'b_lim') {
      var r = reg();
      if (t.id === 'b_mise') r.mise = Math.max(0, +t.value || 0); else r.limite = Math.max(0, +t.value || 0);
      sauverReg(r); render(); return;
    }
    if (t.getAttribute && t.getAttribute('data-bk') != null) {
      var h = hist(), x = h[+t.getAttribute('data-bk')];
      if (!x) return;
      var v = parseFloat(String(t.value).replace(',', '.'));
      x[t.getAttribute('data-bf')] = v > 0 ? v : null;
      sauverHist(h); render();
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-do]') : null;
    if (!b) return;
    var d = b.getAttribute('data-do');
    if (d === 'b_ver') { verifier(true); return; }
    if (d === 'suivre') {
      setTimeout(function () {
        remplirNouveaux();
        var lim = reg().limite;
        if (lim > 0 && miseDuJour() > lim) alert('⚠️ Limite du jour dépassée (' + miseDuJour().toFixed(2) + ' € / ' + lim + ' €).');
      }, 50);
    }
  });

  /* vérification automatique des autres sports */
  function auto() {
    if (document.hidden || !lire('cleaf', '') || !enAttente()) return;
    if (ONG === 'reg' || ONG === 'plus') return;
    var c = essais();
    if (c.n >= MAX_JOUR || Date.now() - c.t < DELAI) return;
    if (REST !== null && +REST < 8) return;
    ecrire('bilan_n', JSON.stringify({ d: c.d, n: c.n + 1, t: Date.now() }));
    verifier(false).then(function (ok) {
      if (ok > 0) {
        var t = document.createElement('div');
        t.textContent = '✅ ' + ok + ' résultat(s) mis à jour automatiquement';
        t.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;background:#166534;color:#fff;font:13px sans-serif;padding:8px 14px;border-radius:12px';
        document.documentElement.appendChild(t); setTimeout(function () { t.remove(); }, 6000);
      }
    });
  }
  setInterval(auto, 60000);
  setTimeout(auto, 12000);
  setTimeout(function () { try { remplirNouveaux(); } catch (e) {} }, 1500);
})();
