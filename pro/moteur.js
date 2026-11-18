/* Pronos Pro - moteur : cotes -> probabilités (marge retirée), API, suivi, résultats automatiques */
(function () {
  'use strict';
  var PM = window.PM = {};
  function g(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function s(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function gj(k, d) { try { var v = JSON.parse(g(k, 'null')); return v == null ? d : v; } catch (e) { return d; } }
  PM.g = g; PM.s = s; PM.del = del; PM.gj = gj;

  PM.SP = {
    foot: { nom: 'Football', ic: '⚽', host: 'v3.football' },
    basket: { nom: 'Basketball', ic: '🏀', host: 'v1.basketball' },
    hand: { nom: 'Handball', ic: '🤾', host: 'v1.handball' },
    hockey: { nom: 'Hockey', ic: '🏒', host: 'v1.hockey' },
    baseball: { nom: 'Baseball', ic: '⚾', host: 'v1.baseball' },
    rugby: { nom: 'Rugby', ic: '🏉', host: 'v1.rugby' },
    volley: { nom: 'Volley-ball', ic: '🏐', host: 'v1.volleyball' },
    nfl: { nom: 'Foot US', ic: '🏈', host: 'v1.american-football' }
  };
  PM.ORDRE = ['foot', 'basket', 'hand', 'hockey', 'baseball', 'rugby', 'volley', 'nfl'];

  /* ---------- réglages ---------- */
  var DEF = { mise: 5, limite: 20, cmin: 1.3, minbk: 3, pages: 5, lim: 10, auto: 5, bk: 0,
    books: [{ n: '1win', u: 'https://1win.com' }, { n: '', u: '' }, { n: '', u: '' }] };
  PM.cfg = function () { var c = gj('pp_cfg', {}), o = {}; for (var k in DEF) o[k] = c[k] !== undefined ? c[k] : DEF[k]; return o; };
  PM.setCfg = function (p) { var c = PM.cfg(); for (var k in p) c[k] = p[k]; s('pp_cfg', JSON.stringify(c)); };
  PM.jour = function (dec) {
    var d = new Date(); d.setDate(d.getDate() + (dec || 0));
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };

  /* ---------- API (limite : 10 requêtes/minute par API) ---------- */
  var dern = {}; PM.ATT = 6200; PM.reste = {};
  PM.api = async function (sp, chemin) {
    var cle = g('cleaf', '');
    if (!cle) throw new Error('Ajoute ta clé API-Sports dans Réglages.');
    var h = PM.SP[sp].host, w = (dern[h] || 0) + PM.ATT - Date.now();
    if (w > 0) await new Promise(function (r) { setTimeout(r, w); });
    dern[h] = Date.now();
    var r;
    try { r = await fetch('https://' + h + '.api-sports.io' + chemin, { headers: { 'x-apisports-key': cle } }); }
    catch (e) { throw new Error('Connexion impossible. Vérifie internet puis réessaie.'); }
    var rem = r.headers.get('x-ratelimit-requests-remaining');
    if (rem !== null) { PM.reste[sp] = +rem; s('pp_reste_' + sp, rem); }
    var j = await r.json(), er = j.errors;
    var txt = er && (Array.isArray(er) ? er.join(' ') : Object.keys(er).map(function (k) { return er[k]; }).join(' '));
    if (txt) {
      if (/limit|quota/i.test(txt)) throw new Error('Quota du jour atteint (il revient à 01h00).');
      if (/token|key/i.test(txt)) throw new Error('Clé API non valide. Corrige-la dans Réglages.');
      throw new Error(txt);
    }
    return j;
  };
  async function avecTz(sp, chemin) {
    try { return await PM.api(sp, chemin + '&timezone=Africa/Douala'); }
    catch (e) { if (/timezone/i.test(e.message)) return await PM.api(sp, chemin); throw e; }
  }

  /* ---------- cotes -> probabilités ---------- */
  function devig(q) {
    var iq = q.map(function (x) { return 1 / x; }), sm = iq.reduce(function (a, b) { return a + b; }, 0);
    if (sm <= 1.0001) return iq.map(function (x) { return x / sm; });
    var lo = 1, hi = 6, k = 1;
    for (var i = 0; i < 50; i++) {
      k = (lo + hi) / 2;
      var t = iq.reduce(function (a, x) { return a + Math.pow(x, k); }, 0);
      if (t > 1) lo = k; else hi = k;
    }
    return iq.map(function (x) { return Math.pow(x, k); });
  }
  function cle(v) { return /^(home|1)$/i.test(v) ? 'H' : /^(away|2)$/i.test(v) ? 'A' : /^(draw|x)$/i.test(v) ? 'D' : null; }
  function parseBk(bk, sp) {
    var out = { W2: null, W3: null, OU: {}, BT: null };
    (bk.bets || []).forEach(function (b) {
      var nm = String(b.name || '').toLowerCase(), v = b.values || [], o, q, m;
      var isW3 = sp === 'foot' ? /^match winner$/.test(nm) : /^3way result$/.test(nm);
      var isW2 = sp !== 'foot' && /^(home\/away|money ?line)$/.test(nm);
      if (isW3 || isW2) {
        o = {};
        v.forEach(function (x) { var k = cle(x.value); q = parseFloat(x.odd); if (k && q > 1) o[k] = q; });
        if (o.H && o.A) { if (o.D) { if (!out.W3) out.W3 = o; } else if (!out.W2) out.W2 = o; }
      } else if (sp === 'foot' && nm === 'goals over/under') {
        v.forEach(function (x) {
          m = /^(over|under) (\d+(?:\.\d+)?)$/i.exec(String(x.value)); q = parseFloat(x.odd);
          if (m && q > 1) { var l = m[2]; (out.OU[l] = out.OU[l] || {})[m[1].toLowerCase() === 'over' ? 'O' : 'U'] = q; }
        });
      } else if (sp === 'foot' && nm === 'both teams score') {
        o = {};
        v.forEach(function (x) { q = parseFloat(x.odd); if (q > 1) { if (/^yes$/i.test(x.value)) o.Y = q; else if (/^no$/i.test(x.value)) o.N = q; } });
        if (o.Y && o.N) out.BT = o;
      }
    });
    return out;
  }
  function agreg(list, keys) {
    var L = list.filter(function (x) { return keys.every(function (k) { return x.o[k] > 1; }); });
    if (!L.length) return null;
    var ps = L.map(function (x) { return devig(keys.map(function (k) { return x.o[k]; })); }), res = { n: L.length, k: {} };
    keys.forEach(function (k, i) {
      var arr = ps.map(function (p) { return p[i] * 100; }).sort(function (a, b) { return a - b; });
      var use = arr.length >= 5 ? arr.slice(1, -1) : arr;
      var m = use.reduce(function (a, b) { return a + b; }, 0) / use.length;
      var sd = Math.sqrt(use.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0) / use.length);
      var best = 0, bn = '';
      L.forEach(function (x) { if (x.o[k] > best) { best = x.o[k]; bn = x.bk; } });
      res.k[k] = { p: m, sd: sd, odd: best, bk: bn };
    });
    return res;
  }
  PM.analyser = function (info, bks) {
    var sp = info.sp, W2 = [], W3 = [], OU = {}, BT = [], P = [];
    bks.forEach(function (b) {
      var o = parseBk(b, sp), nm = b.name || b.id || '?';
      if (o.W2) W2.push({ bk: nm, o: o.W2 });
      if (o.W3) W3.push({ bk: nm, o: o.W3 });
      for (var l in o.OU) (OU[l] = OU[l] || []).push({ bk: nm, o: o.OU[l] });
      if (o.BT) BT.push({ bk: nm, o: o.BT });
    });
    function add(key, t, a, k) { var x = a.k[k]; P.push({ key: key, t: t, p: x.p, sd: x.sd, odd: x.odd, bk: x.bk, n: a.n }); }
    var w;
    if (sp === 'foot') {
      w = agreg(W3, ['H', 'D', 'A']);
      if (w) {
        add('W:H', 'W', w, 'H'); add('W:D', 'W', w, 'D'); add('W:A', 'W', w, 'A');
        var H = w.k.H, D = w.k.D, A = w.k.A;
        [['DC:1X', H.p + D.p, H, D], ['DC:X2', D.p + A.p, D, A], ['DC:12', H.p + A.p, H, A]].forEach(function (d) {
          P.push({ key: d[0], t: 'DC', p: Math.min(d[1], 99), sd: Math.sqrt(d[2].sd * d[2].sd + d[3].sd * d[3].sd), odd: null, bk: '', n: w.n });
        });
      }
      ['1.5', '2.5', '3.5'].forEach(function (l) {
        var a = OU[l] && agreg(OU[l], ['O', 'U']);
        if (a) { add('OU:' + l + ':O', 'OU', a, 'O'); add('OU:' + l + ':U', 'OU', a, 'U'); }
      });
      var b = agreg(BT, ['Y', 'N']);
      if (b) { add('BT:Y', 'BT', b, 'Y'); add('BT:N', 'BT', b, 'N'); }
    } else {
      w = agreg(W2, ['H', 'A']);
      if (w) { add('W:H', 'W', w, 'H'); add('W:A', 'W', w, 'A'); }
      else {
        var w3 = agreg(W3, ['H', 'D', 'A']);
        if (w3) {
          var h = w3.k.H, a2 = w3.k.A, t = h.p + a2.p;
          P.push({ key: 'W:H', t: 'W', p: h.p / t * 100, sd: h.sd, odd: null, bk: '', n: w3.n });
          P.push({ key: 'W:A', t: 'W', p: a2.p / t * 100, sd: a2.sd, odd: null, bk: '', n: w3.n });
        }
      }
    }
    return { id: info.id, sp: sp, lig: info.lig, pays: info.pays, ts: info.ts, dom: info.dom, ext: info.ext, pk: P };
  };

  /* ---------- aides de lecture ---------- */
  PM.oddEff = function (pk) { return pk.odd || (pk.p > 0 ? 100 / pk.p : 0); };
  PM.valeur = function (pk) { return pk.odd ? pk.p / 100 * pk.odd - 1 : null; };
  PM.score = function (pk) { return pk.p - pk.sd * 1.5; };
  PM.lab = function (m, key) {
    var a = key.split(':');
    if (a[0] === 'W') return a[1] === 'H' ? m.dom + ' gagne' : a[1] === 'A' ? m.ext + ' gagne' : 'Match nul';
    if (a[0] === 'DC') return a[1] === '1X' ? m.dom + ' ou nul' : a[1] === 'X2' ? m.ext + ' ou nul' : 'Pas de match nul';
    if (a[0] === 'OU') return (a[2] === 'O' ? 'Plus de ' : 'Moins de ') + a[1].replace('.', ',') + ' buts';
    return a[1] === 'Y' ? 'Les 2 équipes marquent' : 'Une équipe ne marque pas';
  };
  PM.TYPES = { W: 'Victoires', DC: 'Double chance', OU: 'Plus / Moins de buts', BT: 'Les 2 équipes marquent' };
  PM.niveau = function (p) { return p >= 80 ? 'tsur' : p >= 70 ? 'sol' : p >= 60 ? 'equ' : 'ris'; };
  PM.NIV = { tsur: '🔒 Très sûrs (80 % et +)', sol: '💪 Solides (70–79 %)', equ: '⚖️ Équilibrés (60–69 %)', ris: '⚠️ Risqués (moins de 60 %)' };
  PM.fiab = function (pk) { return pk.n >= 5 && pk.sd <= 2.5 ? ['ok', 'Fiabilité élevée'] : pk.n >= 3 && pk.sd <= 4 ? ['mid', 'Fiabilité bonne'] : ['bad', 'Données limitées']; };
  PM.valide = function (pk) { var c = PM.cfg(); return pk.n >= c.minbk && PM.oddEff(pk) >= c.cmin; };
  PM.meilleur = function (m) {
    var c = m.pk.filter(function (pk) { return PM.oddEff(pk) >= PM.cfg().cmin && pk.p >= 50; })
      .sort(function (a, b) { return PM.score(b) - PM.score(a); });
    if (c.length) return c[0];
    return m.pk.slice().sort(function (a, b) { return b.p - a.p; })[0] || null;
  };
  PM.selection = function (ms, n) {
    var now = Date.now(), L = [];
    ms.forEach(function (m) {
      if (m.ts < now) return;
      var c = m.pk.filter(function (pk) { return PM.valide(pk) && pk.p >= 60; }).sort(function (a, b) { return PM.score(b) - PM.score(a); })[0];
      if (c) L.push({ m: m, pk: c, sc: PM.score(c) });
    });
    L.sort(function (a, b) { return b.sc - a.sc; });
    return L.slice(0, n);
  };
  PM.combine = function (ms) {
    var L = PM.selection(ms, 12).filter(function (x) { return x.pk.p >= 72; }).slice(0, 3);
    if (L.length < 2) return null;
    return { L: L, p: L.reduce(function (a, x) { return a * x.pk.p / 100; }, 1) * 100, odd: L.reduce(function (a, x) { return a * PM.oddEff(x.pk); }, 1) };
  };
  PM.valueBets = function (ms) {
    var now = Date.now(), L = [], c = PM.cfg();
    ms.forEach(function (m) {
      if (m.ts < now) return;
      var best = null;
      m.pk.forEach(function (pk) {
        var v = PM.valeur(pk);
        if (v !== null && pk.n >= c.minbk && pk.sd <= 4 && pk.p >= 35 && v >= 0.04 && v <= 0.5 && (!best || v > best.v)) best = { m: m, pk: pk, v: v };
      });
      if (best) L.push(best);
    });
    L.sort(function (a, b) { return b.v - a.v; });
    return L;
  };

  /* ---------- chargement des matchs ---------- */
  PM.nettoyer = function () {
    var lim = PM.jour(-1);
    try {
      Object.keys(localStorage).forEach(function (k) {
        var m = /^pp_d_[a-z]+_(\d{4}-\d{2}-\d{2})$/.exec(k);
        if (m && m[1] < lim) localStorage.removeItem(k);
      });
    } catch (e) {}
  };
  PM.cache = function (sp, date) { return gj('pp_d_' + sp + '_' + date, null); };
  PM.charger = async function (sp, date, force, prog) {
    var ck = 'pp_d_' + sp + '_' + date, c = gj(ck, null), cfg = PM.cfg(), ms = [];
    if (c && !force && Date.now() - c.t < 3 * 3600000) return c;
    if (sp === 'foot') {
      var fx = await avecTz('foot', '/fixtures?date=' + date), info = {};
      (fx.response || []).forEach(function (f) {
        var st = f.fixture.status && f.fixture.status.short;
        if (st === 'NS' || st === 'TBD') info[f.fixture.id] = { id: f.fixture.id, sp: 'foot', lig: f.league.name, pays: f.league.country || '', ts: Date.parse(f.fixture.date), dom: f.teams.home.name, ext: f.teams.away.name };
      });
      var tot = 1, pg = 1;
      do {
        if (prog) prog('Cotes ' + pg + '/' + tot);
        var j = await PM.api('foot', '/odds?date=' + date + '&page=' + pg);
        tot = (j.paging && j.paging.total) || 1;
        (j.response || []).forEach(function (e) {
          var f = info[e.fixture.id];
          if (f && e.bookmakers && e.bookmakers.length) { var m = PM.analyser(f, e.bookmakers); if (m.pk.length) ms.push(m); }
        });
        pg++;
      } while (pg <= tot && pg <= cfg.pages);
    } else {
      var gm = await avecTz(sp, '/games?date=' + date);
      var L = (gm.response || []).filter(function (x) { return /^(NS|TBD)$/.test((x.status && x.status.short) || ''); })
        .map(function (x) {
          return { id: x.id, sp: sp, lig: (x.league && x.league.name) || '', pays: (x.country && x.country.name) || '', ts: x.timestamp ? x.timestamp * 1000 : Date.parse(x.date), dom: x.teams.home.name, ext: x.teams.away.name };
        })
        .sort(function (a, b) { return a.ts - b.ts; }).slice(0, cfg.lim);
      for (var i = 0; i < L.length; i++) {
        if (prog) prog('Cotes ' + (i + 1) + '/' + L.length);
        try {
          var o = await PM.api(sp, '/odds?game=' + L[i].id), bk = (o.response && o.response[0] && o.response[0].bookmakers) || [];
          if (bk.length) { var mm = PM.analyser(L[i], bk); if (mm.pk.length) ms.push(mm); }
        } catch (e) { if (/Quota|Clé/.test(e.message)) throw e; }
      }
    }
    c = { t: Date.now(), m: ms };
    s(ck, JSON.stringify(c));
    return c;
  };

  /* ---------- paris suivis ---------- */
  PM.bets = function () { return gj('pp_bets', []); };
  PM.saveBets = function (b) { s('pp_bets', JSON.stringify(b)); };
  PM.suivre = function (m, pk, mise, auto) {
    var b = PM.bets(), id = m.sp + ':' + m.id + ':' + pk.key;
    if (b.some(function (x) { return x.id === id; })) return false;
    b.push({ id: id, sp: m.sp, mid: m.id, ts: m.ts, match: m.dom + ' vs ' + m.ext, lig: m.lig, key: pk.key, lab: PM.lab(m, pk.key),
      p: Math.round(pk.p), odd: +PM.oddEff(pk).toFixed(2), est: !pk.odd, mise: mise || 0, res: null, auto: !!auto });
    PM.saveBets(b);
    return true;
  };
  PM.autoSuivi = function (ms) {
    var n = PM.cfg().auto;
    if (n > 0) PM.selection(ms, n).forEach(function (x) { PM.suivre(x.m, x.pk, 0, true); });
  };
  PM.resoudre = function (key, gh, ga, nf) {
    var a = key.split(':');
    if (gh == null || ga == null || isNaN(gh) || isNaN(ga)) return null;
    if (a[0] === 'W') {
      if (nf && gh === ga) return null;
      return a[1] === 'H' ? gh > ga : a[1] === 'A' ? ga > gh : gh === ga;
    }
    if (a[0] === 'DC') return a[1] === '1X' ? gh >= ga : a[1] === 'X2' ? ga >= gh : gh !== ga;
    if (a[0] === 'OU') { var t = gh + ga, l = parseFloat(a[1]); return a[2] === 'O' ? t > l : t < l; }
    if (a[0] === 'BT') return a[1] === 'Y' ? (gh > 0 && ga > 0) : !(gh > 0 && ga > 0);
    return null;
  };
  function nb(v) { if (v && typeof v === 'object') v = v.total; return v == null ? null : +v; }
  PM.verifier = async function () {
    var b = PM.bets(), now = Date.now(), ok = 0, enc = 0;
    var att = b.filter(function (x) { return x.res === null && now > x.ts + (x.sp === 'foot' ? 135 : 200) * 60000; });
    if (!att.length) return { ok: 0, enc: 0, att: 0 };
    var foot = att.filter(function (x) { return x.sp === 'foot'; });
    var ids = []; foot.forEach(function (x) { if (ids.indexOf(String(x.mid)) < 0) ids.push(String(x.mid)); });
    var fx = {};
    for (var c = 0; c < ids.length; c += 20) {
      var j = await PM.api('foot', '/fixtures?ids=' + ids.slice(c, c + 20).join('-'));
      (j.response || []).forEach(function (r) { fx[String(r.fixture.id)] = r; });
    }
    foot.forEach(function (x) {
      var r = fx[String(x.mid)], st = r && r.fixture.status && r.fixture.status.short;
      if (r && /^(FT|AET|PEN)$/.test(st)) {
        var ft = (r.score && r.score.fulltime) || {}, gh = ft.home != null ? ft.home : r.goals.home, ga = ft.away != null ? ft.away : r.goals.away;
        var v = PM.resoudre(x.key, gh, ga, false); x.res = v === null ? 'void' : v; x.sc = gh + '-' + ga; ok++;
      } else if (r && /^(CANC|ABD|AWD|WO)$/.test(st)) { x.res = 'void'; ok++; }
      else if (now > x.ts + 3 * 86400000) { x.res = 'void'; ok++; }
      else enc++;
    });
    var autres = att.filter(function (x) { return x.sp !== 'foot'; }).slice(0, 12), vu = {};
    for (var q = 0; q < autres.length; q++) {
      var x = autres[q], k = x.sp + x.mid;
      if (!(k in vu)) { var jj = await PM.api(x.sp, '/games?id=' + x.mid); vu[k] = (jj.response || [])[0] || null; }
      var r2 = vu[k], st2 = r2 && r2.status && r2.status.short;
      if (r2 && /^(FT|AOT|AET|AP|OT)$/.test(st2)) {
        var gh2 = nb((r2.scores || {}).home), ga2 = nb((r2.scores || {}).away), v2 = PM.resoudre(x.key, gh2, ga2, true);
        x.res = v2 === null ? 'void' : v2; x.sc = gh2 + '-' + ga2; ok++;
      } else if (r2 && /^(CANC|ABD|AWD|WO)$/.test(st2)) { x.res = 'void'; ok++; }
      else if (now > x.ts + 3 * 86400000) { x.res = 'void'; ok++; }
      else enc++;
    }
    PM.saveBets(b);
    return { ok: ok, enc: enc, att: att.length };
  };
  PM.profit = function (b) {
    var net = 0, mis = 0, n = 0;
    b.forEach(function (x) {
      if (!(x.mise > 0) || (x.res !== true && x.res !== false)) return;
      n++; mis += x.mise; net += x.res ? x.mise * (x.odd - 1) : -x.mise;
    });
    return { net: net, mis: mis, n: n };
  };
  PM.groupe = function (R, fn) {
    var o = {};
    R.forEach(function (x) { var k = fn(x); (o[k] = o[k] || []).push(x); });
    return o;
  };
})();
