/* Pronos Pro - interface */
(function () {
  'use strict';
  var P = window.PM;
  function $(i) { return document.getElementById(i); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  var ui = P.gj('pp_ui', {});
  var S = { tab: 'home', sp: ui.sp || 'foot', jour: 0, grp: ui.grp || 'conf', q: '', h: '', busy: null, err: '', hist: 'cours', sheet: null, msg: '' };
  var D = {};
  function saveUi() { P.s('pp_ui', JSON.stringify({ sp: S.sp, grp: S.grp })); }
  function date(j) { return P.jour(j == null ? S.jour : j); }
  function lire(sp, j) { var k = sp + date(j); if (!D[k]) D[k] = P.cache(sp, date(j)); return D[k]; }
  function tous(j) { var o = []; P.ORDRE.forEach(function (sp) { var c = lire(sp, j); if (c) o = o.concat(c.m); }); return o; }
  function liste() { return S.sp === 'tous' ? tous() : (lire(S.sp) ? lire(S.sp).m : []); }
  function hh(ts) { return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  function col(p) { return p >= 80 ? 'var(--ok)' : p >= 70 ? '#a3e635' : p >= 60 ? 'var(--mid)' : 'var(--bad)'; }
  function f2(x) { return x.toFixed(2).replace('.', ','); }
  function toast(t) {
    var d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
    $('app').appendChild(d); setTimeout(function () { d.remove(); }, 6500);
  }
  function trouver(ref) {
    var a = String(ref).split(':'), sp = a[0], id = a.slice(1).join(':'), r = null;
    [0, 1].forEach(function (j) { var c = lire(sp, j); if (c) c.m.forEach(function (m) { if (String(m.id) === id) r = m; }); });
    return r;
  }
  function aujMises() {
    var d = date(0);
    return P.bets().filter(function (x) { return x.mise > 0 && new Date(x.ts).toDateString() === new Date().toDateString(); })
      .reduce(function (s, x) { return s + x.mise; }, 0);
  }

  /* ---------- composants ---------- */
  function badges(pk) {
    var f = P.fiab(pk), v = P.valeur(pk), o = '<span class="badge ' + f[0] + '">' + f[1] + '</span><span class="badge">' + pk.n + ' bookmakers</span>';
    if (v !== null && v >= 0.04 && v <= 0.5 && pk.sd <= 4) o += '<span class="badge val">💎 Value +' + Math.round(v * 100) + '%</span>';
    return o;
  }
  function ring(p) { return '<div class="ring" style="--p:' + Math.round(p) + ';--c:' + col(p) + '"><b>' + Math.round(p) + '%</b></div>'; }
  function cote(pk) { return '<div class="cote">' + (pk.odd ? f2(pk.odd) : '≈' + f2(P.oddEff(pk))) + '<small>' + (pk.odd ? 'cote' : 'équitable') + '</small></div>'; }
  function ligne(m, pk) {
    return '<div class="card clic" data-a="open" data-m="' + esc(m.sp + ':' + m.id) + '"><div class="row">' + ring(pk.p) +
      '<div class="mid"><div class="t1">' + esc(P.lab(m, pk.key)) + '</div><div class="mut">' + P.SP[m.sp].ic + ' ' + esc(m.dom) + ' vs ' + esc(m.ext) + ' · ' + hh(m.ts) + '</div>' +
      '<div>' + badges(pk) + '</div></div>' + cote(pk) + '</div></div>';
  }
  function carte(m) {
    var pk = P.meilleur(m); if (!pk) return '';
    return '<div class="card clic" data-a="open" data-m="' + esc(m.sp + ':' + m.id) + '">' +
      '<div class="mut">' + P.SP[m.sp].ic + ' ' + esc(m.lig) + (m.pays ? ' · ' + esc(m.pays) : '') + ' · ' + hh(m.ts) + '</div>' +
      '<div class="t1" style="margin:3px 0">' + esc(m.dom) + ' vs ' + esc(m.ext) + '</div>' +
      '<div class="row"><div class="mid"><div><b>' + esc(P.lab(m, pk.key)) + '</b></div>' +
      '<div class="bar"><i style="width:' + Math.round(pk.p) + '%;background:' + col(pk.p) + '"></i></div><div>' + badges(pk) + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:20px;font-weight:800;color:' + col(pk.p) + '">' + Math.round(pk.p) + '%</div>' + cote(pk) + '</div></div></div>';
  }

  /* ---------- groupes ---------- */
  function filtre(L) {
    var q = norm(S.q);
    return L.filter(function (m) {
      if (q && norm(m.dom + ' ' + m.ext + ' ' + m.lig + ' ' + m.pays).indexOf(q) < 0) return false;
      if (S.h) {
        var h = new Date(m.ts).getHours(), b = h >= 6 && h < 12 ? 'm' : h >= 12 && h < 18 ? 'a' : h >= 18 ? 's' : 'n';
        if (b !== S.h) return false;
      }
      return true;
    });
  }
  function grouper(L) {
    var G = {}, ord = [];
    function put(k, x) { if (!G[k]) { G[k] = []; ord.push(k); } G[k].push(x); }
    if (S.grp === 'type') {
      Object.keys(P.TYPES).forEach(function (t) {
        L.forEach(function (m) {
          var c = m.pk.filter(function (pk) { return pk.t === t && P.valide(pk) && pk.p >= 55; }).sort(function (a, b) { return P.score(b) - P.score(a); })[0];
          if (c) put(t, { m: m, pk: c });
        });
        if (G[t]) G[t].sort(function (a, b) { return P.score(b.pk) - P.score(a.pk); });
      });
      return ord.map(function (t) { return { t: P.TYPES[t], items: G[t].slice(0, 25), pick: true }; });
    }
    L.forEach(function (m) {
      var k;
      if (S.grp === 'conf') { var pk = P.meilleur(m); k = P.niveau(pk ? pk.p : 0); }
      else if (S.grp === 'lig') k = m.lig + (m.pays ? ' (' + m.pays + ')' : '');
      else if (S.grp === 'sport') k = P.SP[m.sp].ic + ' ' + P.SP[m.sp].nom;
      else { var h = new Date(m.ts).getHours(); k = h >= 6 && h < 12 ? '1-🌅 Matin' : h >= 12 && h < 18 ? '2-☀️ Après-midi' : h >= 18 ? '3-🌙 Soir' : '4-🌌 Nuit'; }
      put(k, m);
    });
    if (S.grp === 'conf') ord = ['tsur', 'sol', 'equ', 'ris'].filter(function (k) { return G[k]; });
    else if (S.grp === 'lig') ord.sort(function (a, b) { return G[b].length - G[a].length || (a < b ? -1 : 1); });
    else ord.sort();
    return ord.map(function (k) {
      G[k].sort(function (a, b) { return a.ts - b.ts; });
      return { t: S.grp === 'conf' ? P.NIV[k] : k.replace(/^\d-/, ''), items: G[k] };
    });
  }
  function htmlListe() {
    var L = filtre(liste());
    if (!L.length) return '<div class="vide">' + (liste().length ? 'Aucun match pour ce filtre.' : 'Aucun match chargé pour ce jour.<br>Appuie sur « Charger ».') + '</div>';
    var G = grouper(L);
    return '<div class="mut" style="margin:0 2px 8px">' + L.length + ' match(s) · tri : ' + ({ conf: 'confiance', lig: 'championnat', heure: 'heure', type: 'type de pari', sport: 'sport' }[S.grp]) + '</div>' +
      G.map(function (g, i) {
        return '<details class="grp"' + (i < 2 ? ' open' : '') + '><summary><span>' + esc(g.t) + '</span><span class="mut">' + g.items.length + '</span></summary><div class="in">' +
          g.items.map(function (x) { return g.pick ? ligne(x.m, x.pk) : carte(x); }).join('') + '</div></details>';
      }).join('');
  }

  /* ---------- écrans ---------- */
  function cle() { return P.g('cleaf', ''); }
  function banniere() {
    return (S.busy ? '<div class="banner">⏳ ' + esc(S.busy) + '</div>' : '') + (S.err ? '<div class="banner e">⚠️ ' + esc(S.err) + '</div>' : '') + (S.msg ? '<div class="banner">' + esc(S.msg) + '</div>' : '');
  }
  function vHome() {
    if (!cle()) {
      return '<div class="card"><h2>👋 Bienvenue</h2><p class="mut">Colle ta clé API-Sports pour commencer. Elle reste sur ton téléphone.</p>' +
        '<input id="k1" placeholder="Clé API-Sports" autocomplete="off"><p><button class="btn w" data-a="savekey">Enregistrer</button></p></div>';
    }
    var M = tous(0), sel = P.selection(M, 5), cb = P.combine(M), vb = P.valueBets(M).slice(0, 3), ts = M.filter(function (m) { var pk = P.meilleur(m); return pk && pk.p >= 80; }).length;
    var R = P.bets().filter(function (x) { return x.res === true || x.res === false; }), w = R.filter(function (x) { return x.res; }).length;
    var o = banniere() + '<div class="kpis"><div class="kpi"><b>' + M.length + '</b><span>Matchs</span></div><div class="kpi"><b>' + ts + '</b><span>Très sûrs</span></div><div class="kpi"><b>' + vb.length + '</b><span>Value bets</span></div><div class="kpi"><b>' + (R.length ? Math.round(w / R.length * 100) + '%' : '–') + '</b><span>Réussite réelle</span></div></div>';
    o += '<div class="tools"><button class="btn" data-a="actu">🔄 Actualiser</button><button class="btn g" data-a="ver">✅ Résultats</button></div>';
    if (!M.length) return o + '<div class="vide">Aucun match chargé.<br>Appuie sur « Actualiser ».</div>';
    o += '<div class="card"><h2>⭐ Sélection du jour</h2>' + (sel.length ? sel.map(function (x) { return ligne(x.m, x.pk); }).join('') : '<div class="mut">Aucune proposition assez fiable pour le moment.</div>') + '</div>';
    if (cb) {
      o += '<div class="card"><h2>🧩 Combiné prudent</h2>' + cb.L.map(function (x) { return '<div class="row" style="margin:6px 0"><div class="mid"><div class="t1">' + esc(P.lab(x.m, x.pk.key)) + '</div><div class="mut">' + esc(x.m.dom) + ' vs ' + esc(x.m.ext) + '</div></div><b>' + Math.round(x.pk.p) + '%</b></div>'; }).join('') +
        '<div class="row"><div class="mid mut">Probabilité totale</div><b>' + Math.round(cb.p) + '%</b></div><div class="row"><div class="mid mut">Cote cumulée</div><b>' + f2(cb.odd) + '</b></div>' +
        '<div class="mut" style="margin-top:6px">Un combiné perd si un seul pari échoue : mise peu.</div></div>';
    }
    if (vb.length) o += '<div class="card"><h2>💎 Value bets</h2><div class="mut" style="margin-bottom:6px">Cote plus haute que la probabilité estimée.</div>' + vb.map(function (x) { return ligne(x.m, x.pk); }).join('') + '</div>';
    return o;
  }
  function vMatchs() {
    var chips = '<div class="chips">' + P.ORDRE.map(function (sp) { return '<button class="chip' + (S.sp === sp ? ' on' : '') + '" data-a="sp" data-v="' + sp + '">' + P.SP[sp].ic + ' ' + P.SP[sp].nom + '</button>'; }).join('') +
      '<button class="chip' + (S.sp === 'tous' ? ' on' : '') + '" data-a="sp" data-v="tous">🌍 Tous</button></div>';
    var jours = '<div class="chips"><button class="chip' + (S.jour === 0 ? ' on' : '') + '" data-a="jour" data-v="0">Aujourd\'hui</button><button class="chip' + (S.jour === 1 ? ' on' : '') + '" data-a="jour" data-v="1">Demain</button></div>';
    var gr = [['conf', 'Confiance'], ['lig', 'Championnat'], ['heure', 'Heure'], ['type', 'Type de pari'], ['sport', 'Sport']];
    var sel = '<div class="tools"><select data-a="grp">' + gr.map(function (g) { return '<option value="' + g[0] + '"' + (S.grp === g[0] ? ' selected' : '') + '>Classer : ' + g[1] + '</option>'; }).join('') + '</select>' +
      '<select data-a="h"><option value="">🕐 Toute la journée</option><option value="m"' + (S.h === 'm' ? ' selected' : '') + '>Matin</option><option value="a"' + (S.h === 'a' ? ' selected' : '') + '>Après-midi</option><option value="s"' + (S.h === 's' ? ' selected' : '') + '>Soir</option><option value="n"' + (S.h === 'n' ? ' selected' : '') + '>Nuit</option></select></div>';
    var c = S.sp !== 'tous' ? lire(S.sp) : null;
    var btns = '<div class="tools">' + (S.sp === 'tous' ? '<button class="btn" data-a="tout">⬇️ Charger tous les sports</button>' : '<button class="btn" data-a="charger">' + (c ? '🔄 Actualiser' : '⬇️ Charger') + ' ' + (P.SP[S.sp] ? P.SP[S.sp].nom : '') + '</button>') +
      '<input id="q" type="search" placeholder="🔎 Équipe, championnat" value="' + esc(S.q) + '"></div>';
    return banniere() + chips + jours + sel + btns + '<div id="liste">' + htmlListe() + '</div>';
  }
  function vParis() {
    var b = P.bets(), pr = P.profit(b), enc = b.filter(function (x) { return x.res === null; });
    var enM = enc.reduce(function (a, x) { return a + (x.mise || 0); }, 0), lim = P.cfg().limite, jr = aujMises();
    var L = b.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) {
      return S.hist === 'cours' ? o.x.res === null : S.hist === 'fini' ? o.x.res !== null : o.x.auto;
    }).sort(function (a, c) { return S.hist === 'cours' ? a.x.ts - c.x.ts : c.x.ts - a.x.ts; });
    var o = banniere() + '<div class="card"><h2>💶 Bilan</h2><div class="row"><div class="mid">' +
      (pr.n ? 'Net : <b style="color:' + (pr.net >= 0 ? 'var(--ok)' : 'var(--bad)') + '">' + (pr.net >= 0 ? '+' : '−') + f2(Math.abs(pr.net)) + ' €</b><div class="mut">' + pr.n + ' pari(s) · mises ' + f2(pr.mis) + ' € · rendement ' + Math.round(pr.net / pr.mis * 100) + '%</div>' : '<span class="mut">Aucun pari terminé avec mise.</span>') +
      '</div></div><div class="mut" style="margin-top:6px">Aujourd\'hui : ' + f2(jr) + ' €' + (lim ? ' / limite ' + lim + ' €' : '') + (enM ? ' · en cours ' + f2(enM) + ' €' : '') + '</div>' +
      (lim && jr > lim ? '<div class="banner e" style="margin:8px 0 0">⚠️ Limite du jour dépassée. Arrête-toi pour aujourd\'hui.</div>' : '') + '</div>';
    o += '<div class="tools"><button class="btn" data-a="ver">✅ Vérifier les résultats</button><button class="btn g" data-a="expo">💾 Sauvegarder</button></div>';
    o += '<div class="chips">' + [['cours', 'En cours'], ['fini', 'Terminés'], ['auto', 'Suivi auto']].map(function (t) { return '<button class="chip' + (S.hist === t[0] ? ' on' : '') + '" data-a="hist" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (!L.length) return o + '<div class="vide">Rien ici pour le moment.<br>Ouvre un match et appuie sur « ⭐ Suivre ».</div>';
    return o + L.map(function (r) {
      var x = r.x, rb = x.res === true ? '<span class="badge ok">✅ Gagné</span>' : x.res === false ? '<span class="badge bad">❌ Perdu</span>' : x.res === 'void' ? '<span class="badge">↩️ Annulé</span>' : '<span class="badge mid">⏳ ' + hh(x.ts) + '</span>';
      return '<div class="card"><div class="row"><div class="mid"><div class="t1">' + esc(x.lab) + '</div><div class="mut">' + P.SP[x.sp].ic + ' ' + esc(x.match) + (x.sc ? ' · score ' + esc(x.sc) : '') + '</div>' +
        '<div>' + rb + '<span class="badge">' + x.p + '% prévu</span>' + (x.auto ? '<span class="badge">auto</span>' : '') + '</div></div></div>' +
        '<div class="row" style="margin-top:8px"><div class="mid"><label class="mut">Cote</label><input type="number" step="0.01" min="1" data-bi="' + r.i + '" data-f="odd" value="' + x.odd + '"></div>' +
        '<div class="mid"><label class="mut">Mise (€)</label><input type="number" step="0.5" min="0" data-bi="' + r.i + '" data-f="mise" value="' + (x.mise || '') + '"></div>' +
        '<button class="btn s r" data-a="del" data-v="' + r.i + '" style="align-self:flex-end">🗑</button></div></div>';
    }).join('');
  }
  function bande(p) { return p >= 80 ? '80 % et +' : p >= 70 ? '70–79 %' : p >= 60 ? '60–69 %' : 'moins de 60 %'; }
  function tab(titre, G) {
    var keys = Object.keys(G); if (!keys.length) return '';
    return '<div class="card"><h2>' + titre + '</h2><table><tr><th></th><th>Nb</th><th>Prévu</th><th>Réel</th></tr>' + keys.map(function (k) {
      var a = G[k], n = a.length, pv = a.reduce(function (s, x) { return s + x.p; }, 0) / n, re = a.filter(function (x) { return x.res; }).length / n * 100;
      return '<tr><td>' + esc(k) + '</td><td>' + n + '</td><td>' + Math.round(pv) + '%</td><td style="font-weight:700;color:' + (n >= 10 ? (re >= pv - 5 ? 'var(--ok)' : 'var(--bad)') : 'var(--mut)') + '">' + Math.round(re) + '%</td></tr>';
    }).join('') + '</table></div>';
  }
  function vStats() {
    var b = P.bets(), R = b.filter(function (x) { return x.res === true || x.res === false; });
    if (!R.length) return '<div class="vide">Pas encore de résultat.<br>L\'appli suit automatiquement ta sélection du jour et met les résultats à jour toute seule.</div>';
    var w = R.filter(function (x) { return x.res; }).length, o = '<div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>' + R.length + '</b><span>Résultats</span></div><div class="kpi"><b>' + Math.round(w / R.length * 100) + '%</b><span>Réussite</span></div><div class="kpi"><b>' + Math.round(R.reduce(function (s, x) { return s + x.p; }, 0) / R.length) + '%</b><span>Prévu</span></div></div>';
    o += '<div class="mut" style="margin:0 2px 8px">« Prévu » = probabilité annoncée par l\'appli. « Réel » = ce qui s\'est vraiment passé. Fiable à partir de 10 résultats par ligne.</div>';
    o += tab('Par niveau de probabilité', P.groupe(R, function (x) { return bande(x.p); }));
    o += tab('Par sport', P.groupe(R, function (x) { return P.SP[x.sp].ic + ' ' + P.SP[x.sp].nom; }));
    o += tab('Par type de pari', P.groupe(R, function (x) { return P.TYPES[x.key.split(':')[0]]; }));
    var pts = [], cum = 0;
    R.filter(function (x) { return x.mise > 0; }).sort(function (a, c) { return a.ts - c.ts; }).forEach(function (x) { cum += x.res ? x.mise * (x.odd - 1) : -x.mise; pts.push(cum); });
    if (pts.length > 1) {
      var mn = Math.min.apply(0, pts.concat(0)), mx = Math.max.apply(0, pts.concat(0)), sp = mx - mn || 1;
      var pl = pts.map(function (v, i) { return (i / (pts.length - 1) * 300).toFixed(1) + ',' + (70 - (v - mn) / sp * 60).toFixed(1); }).join(' ');
      o += '<div class="card"><h2>📈 Courbe des gains</h2><svg viewBox="0 0 300 80" width="100%"><line x1="0" x2="300" y1="' + (70 - (0 - mn) / sp * 60).toFixed(1) + '" y2="' + (70 - (0 - mn) / sp * 60).toFixed(1) + '" stroke="#334155" stroke-dasharray="3"/><polyline fill="none" stroke="' + (cum >= 0 ? '#22c55e' : '#ef4444') + '" stroke-width="2.5" points="' + pl + '"/></svg><div class="mut">Net : ' + (cum >= 0 ? '+' : '−') + f2(Math.abs(cum)) + ' €</div></div>';
    }
    return o;
  }
  function vReg() {
    var c = P.cfg(), k = cle();
    var o = banniere() + '<div class="card"><h2>🔑 Clé API-Sports</h2><div class="mut">' + (k ? 'Clé enregistrée : ' + esc(k.slice(0, 4)) + '••••' : 'Aucune clé') + '</div>' +
      '<input id="k1" placeholder="Colle la clé ici" autocomplete="off" style="margin-top:6px"><p><button class="btn w" data-a="savekey">Enregistrer</button></p></div>';
    o += '<div class="card"><h2>🎯 Bookmakers</h2><div class="mut">Le bouton « Parier » copie ton pari puis ouvre le lien choisi (●).</div>' + c.books.map(function (b, i) {
      return '<div class="row" style="margin-top:8px"><input type="radio" name="bk" value="' + i + '" style="width:22px" ' + (c.bk === i ? 'checked' : '') + '><div class="mid"><input id="bn' + i + '" placeholder="Nom (ex. 1win)" value="' + esc(b.n) + '"><input id="bu' + i + '" placeholder="https://…" value="' + esc(b.u) + '" style="margin-top:4px"></div></div>';
    }).join('') + '</div>';
    function fld(id, lab, v, st) { return '<label class="l">' + lab + '</label><input id="' + id + '" type="number" step="' + (st || 1) + '" value="' + v + '">'; }
    o += '<div class="card"><h2>⚙️ Paramètres</h2>' + fld('c_mise', 'Mise par défaut (€)', c.mise, 0.5) + fld('c_lim', 'Limite de mise par jour (€, 0 = aucune)', c.limite, 1) +
      fld('c_cmin', 'Cote minimale conseillée', c.cmin, 0.05) + fld('c_minbk', 'Bookmakers minimum par proposition', c.minbk, 1) +
      fld('c_pages', 'Football : pages de cotes (1 page = 1 requête)', c.pages, 1) + fld('c_lim2', 'Autres sports : matchs analysés', c.lim, 1) + fld('c_auto', 'Suivi automatique : nombre de propositions/jour (0 = off)', c.auto, 1) +
      '<p><button class="btn w" data-a="savecfg">Enregistrer</button></p></div>';
    o += '<div class="card"><h2>💾 Données</h2><div class="tools"><button class="btn g" data-a="expo">Exporter</button><button class="btn g" data-a="impo">Importer</button></div><input id="fi" type="file" accept=".json,application/json" style="display:none"><button class="btn r w" data-a="reset" style="margin-top:8px">Tout effacer</button></div>';
    o += '<div class="mut" style="text-align:center">Les probabilités viennent des cotes de plusieurs bookmakers, marge retirée. Aucun pronostic n\'est garanti. Réservé aux 18 ans et plus. Joue avec modération.</div>';
    return o;
  }
  function vSheet(m) {
    var o = '<div class="box"><div class="row"><div class="mid"><div class="mut">' + P.SP[m.sp].ic + ' ' + esc(m.lig) + (m.pays ? ' · ' + esc(m.pays) : '') + ' · ' + hh(m.ts) + '</div><div class="t1" style="font-size:18px;white-space:normal">' + esc(m.dom) + ' vs ' + esc(m.ext) + '</div></div><button class="btn s g" data-a="close">✕</button></div>';
    Object.keys(P.TYPES).forEach(function (t) {
      var L = m.pk.filter(function (pk) { return pk.t === t; }).sort(function (a, b) { return b.p - a.p; });
      if (!L.length) return;
      o += '<h3 style="margin:14px 0 6px;font-size:14px;color:var(--mut)">' + P.TYPES[t] + '</h3>';
      L.forEach(function (pk) {
        var faible = P.oddEff(pk) < P.cfg().cmin;
        o += '<div class="card"><div class="row"><div class="mid"><div class="t1">' + esc(P.lab(m, pk.key)) + '</div><div class="bar"><i style="width:' + Math.round(pk.p) + '%;background:' + col(pk.p) + '"></i></div><div>' + badges(pk) + (faible ? '<span class="badge">cote faible</span>' : '') + '</div>' +
          (pk.bk ? '<div class="mut">Meilleure cote : ' + esc(pk.bk) + '</div>' : '') + '</div><div style="text-align:right"><div style="font-size:20px;font-weight:800;color:' + col(pk.p) + '">' + Math.round(pk.p) + '%</div>' + cote(pk) + '</div></div>' +
          '<div class="row" style="margin-top:8px"><button class="btn s" data-a="suivre" data-m="' + esc(m.sp + ':' + m.id) + '" data-k="' + pk.key + '">⭐ Suivre</button><button class="btn s g" data-a="parier" data-m="' + esc(m.sp + ':' + m.id) + '" data-k="' + pk.key + '">🎯 Parier</button></div></div>';
      });
    });
    return o + '</div>';
  }

  /* ---------- affichage ---------- */
  function draw() {
    var v = { home: vHome, matchs: vMatchs, paris: vParis, stats: vStats, reg: vReg }[S.tab];
    $('vue').innerHTML = v();
    Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (b) { b.classList.toggle('on', b.dataset.v === S.tab); });
    var fe = $('feuille'), m = S.sheet && trouver(S.sheet);
    if (m) { fe.innerHTML = vSheet(m); fe.classList.add('on'); } else { fe.classList.remove('on'); fe.innerHTML = ''; }
    var c = lire('foot', 0), sc = P.g('pp_reste_foot', null);
    $('sous').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (c ? ' · cotes de ' + hh(c.t) : '');
    $('quota').textContent = 'Requêtes : ' + (P.reste.foot != null ? P.reste.foot : sc != null ? sc : '?');
  }

  /* ---------- actions ---------- */
  async function charger(sps, force) {
    if (S.busy) return;
    S.err = ''; S.msg = '';
    for (var i = 0; i < sps.length; i++) {
      var sp = sps[i];
      try {
        S.busy = P.SP[sp].ic + ' ' + P.SP[sp].nom + ' : chargement…'; draw();
        var c = await P.charger(sp, date(), force, function (t) { S.busy = P.SP[sp].ic + ' ' + t; draw(); });
        D[sp + date()] = c;
        if (S.jour === 0) P.autoSuivi(c.m);
        if (!c.m.length) S.msg = P.SP[sp].nom + ' : aucun match avec cotes pour ce jour.';
      } catch (e) {
        S.err = e.message;
        var old = P.cache(sp, date()); if (old) D[sp + date()] = old;
        if (/Quota|Clé|Ajoute/.test(e.message)) break;
      }
    }
    S.busy = null; draw();
  }
  async function verif(manuel) {
    if (!cle() || S.busy) return;
    try {
      var b = P.bets();
      if (!b.some(function (x) { return x.res === null && Date.now() > x.ts + 135 * 60000; })) { if (manuel) { S.msg = 'Rien à vérifier pour le moment.'; draw(); } return; }
      S.busy = 'Vérification des résultats…'; draw();
      var r = await P.verifier();
      S.busy = null; S.err = '';
      S.msg = r.ok ? '✅ ' + r.ok + ' résultat(s) mis à jour' + (r.enc ? ' · ' + r.enc + ' match(s) pas encore terminé(s)' : '') : (manuel ? 'Aucun match terminé pour le moment.' : '');
      if (r.ok) toast('✅ ' + r.ok + ' résultat(s) mis à jour');
    } catch (e) { S.busy = null; if (manuel) S.err = e.message; }
    draw();
  }
  function copier(t) {
    var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(a); a.focus(); a.select();
    try { document.execCommand('copy'); } catch (e) {}
    a.remove();
  }
  function actionPari(b, parier) {
    var m = trouver(b.dataset.m), pk = m && m.pk.filter(function (x) { return x.key === b.dataset.k; })[0]; if (!m || !pk) return;
    var c = P.cfg();
    if (parier) {
      if (c.limite > 0 && aujMises() + c.mise > c.limite && !confirm('⚠️ Tu dépasses ta limite du jour (' + c.limite + ' €). Continuer quand même ?')) return;
      var bk = c.books[c.bk] || {}, txt = m.dom + ' vs ' + m.ext + ' — ' + P.lab(m, pk.key) + (c.mise ? ' — mise ' + c.mise + ' €' : '');
      copier(txt);
      P.suivre(m, pk, c.mise, false);
      var bets = P.bets(), id = m.sp + ':' + m.id + ':' + pk.key;
      bets.forEach(function (x) { if (x.id === id && !x.mise) x.mise = c.mise; }); P.saveBets(bets);
      if (/^https?:\/\//i.test(bk.u || '')) { toast('📋 Copié et pari ajouté à Mes paris.\nOuverture de ' + (bk.n || 'ton bookmaker') + '…'); window.open(bk.u, '_blank'); }
      else toast('📋 Copié et pari ajouté à Mes paris.\nAjoute ton bookmaker dans Réglages pour l\'ouvrir.');
    } else {
      toast(P.suivre(m, pk, c.mise, false) ? '⭐ Ajouté à Mes paris' : 'Déjà suivi');
    }
    draw();
  }
  document.addEventListener('click', function (e) {
    if (e.target.id === 'feuille') { S.sheet = null; draw(); return; }
    var b = e.target.closest('[data-a]'); if (!b || b.tagName === 'SELECT') return;
    var a = b.dataset.a, v = b.dataset.v;
    if (a === 'tab') { S.tab = v; S.msg = ''; S.err = ''; S.sheet = null; draw(); window.scrollTo(0, 0); }
    else if (a === 'sp') { S.sp = v; saveUi(); draw(); }
    else if (a === 'jour') { S.jour = +v; draw(); }
    else if (a === 'open') { S.sheet = b.dataset.m; draw(); }
    else if (a === 'close') { S.sheet = null; draw(); }
    else if (a === 'actu') charger(['foot'], true);
    else if (a === 'charger') charger([S.sp], true);
    else if (a === 'tout') charger(P.ORDRE.slice(), false);
    else if (a === 'ver') verif(true);
    else if (a === 'hist') { S.hist = v; draw(); }
    else if (a === 'suivre') actionPari(b, false);
    else if (a === 'parier') actionPari(b, true);
    else if (a === 'del') { if (confirm('Supprimer ce pari ?')) { var bt = P.bets(); bt.splice(+v, 1); P.saveBets(bt); draw(); } }
    else if (a === 'savekey') {
      var k = ($('k1').value || '').trim();
      if (k.length < 10) { toast('Clé trop courte. Copie-la en entier.'); return; }
      P.s('cleaf', k); toast('✅ Clé enregistrée'); draw(); if (S.tab === 'home') charger(['foot'], false);
    }
    else if (a === 'savecfg') {
      var n = function (id, d) { var x = parseFloat($(id).value); return isNaN(x) ? d : x; }, c = P.cfg(), books = [], bk = 0;
      for (var i = 0; i < 3; i++) { books.push({ n: $('bn' + i).value.trim(), u: $('bu' + i).value.trim() }); }
      Array.prototype.forEach.call(document.getElementsByName('bk'), function (r) { if (r.checked) bk = +r.value; });
      P.setCfg({ mise: Math.max(0, n('c_mise', c.mise)), limite: Math.max(0, n('c_lim', c.limite)), cmin: Math.max(1, n('c_cmin', c.cmin)), minbk: Math.max(1, n('c_minbk', c.minbk)),
        pages: Math.min(15, Math.max(1, n('c_pages', c.pages))), lim: Math.min(30, Math.max(1, n('c_lim2', c.lim))), auto: Math.max(0, n('c_auto', c.auto)), books: books, bk: bk });
      toast('✅ Réglages enregistrés');
    }
    else if (a === 'expo') {
      var o = { v: 1, date: new Date().toISOString(), bets: P.bets(), cfg: P.cfg() };
      var bl = new Blob([JSON.stringify(o)], { type: 'application/json' }), l = document.createElement('a');
      l.href = URL.createObjectURL(bl); l.download = 'pronos-pro-sauvegarde-' + P.jour(0) + '.json'; document.body.appendChild(l); l.click(); l.remove();
      toast('✅ Sauvegarde enregistrée dans tes Téléchargements');
    }
    else if (a === 'impo') { var f = $('fi'); if (f) f.click(); }
    else if (a === 'reset') {
      if (confirm('Tout effacer (paris, réglages, cache) ? Ta clé API est conservée.')) {
        Object.keys(localStorage).filter(function (k) { return k.indexOf('pp_') === 0; }).forEach(function (k) { P.del(k); });
        D = {}; draw(); toast('Données effacées');
      }
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.a === 'grp') { S.grp = t.value; saveUi(); draw(); return; }
    if (t.dataset && t.dataset.a === 'h') { S.h = t.value; draw(); return; }
    if (t.dataset && t.dataset.bi != null && t.dataset.bi !== '') {
      var b = P.bets(), x = b[+t.dataset.bi]; if (!x) return;
      var v = parseFloat(String(t.value).replace(',', '.'));
      if (t.dataset.f === 'odd') { if (v > 1) { x.odd = v; x.est = false; } } else x.mise = v > 0 ? v : 0;
      P.saveBets(b); draw(); return;
    }
    if (t.id === 'fi' && t.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result); if (!o || !Array.isArray(o.bets)) throw 0;
          if (!confirm('Remplacer tes paris actuels par cette sauvegarde (' + o.bets.length + ') ?')) return;
          P.saveBets(o.bets); if (o.cfg) P.s('pp_cfg', JSON.stringify(o.cfg)); toast('✅ Données restaurées'); draw();
        } catch (er) { toast('❌ Fichier non valide'); }
      };
      fr.readAsText(t.files[0]);
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') { S.q = e.target.value; var l = $('liste'); if (l) l.innerHTML = htmlListe(); }
  });

  /* ---------- démarrage ---------- */
  P.nettoyer();
  draw();
  setTimeout(function () { var s = $('splash'); if (s) { s.style.opacity = '0'; setTimeout(function () { s.remove(); }, 450); } }, 900);
  if (cle()) charger(['foot'], false).then(function () { return verif(false); });
  setInterval(function () { if (!document.hidden) verif(false); }, 10 * 60000);
})();
