/* Outils : recherche + filtre d'heure, rappels avant match, sauvegarde de l'historique. */
(function () {
  'use strict';
  var RECH = '', HEURE = '';
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function toast(t, bg) {
    var d = document.createElement('div'); d.textContent = t;
    d.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;background:' + (bg || '#166534') + ';color:#fff;font:13px sans-serif;padding:8px 14px;border-radius:12px;max-width:90%;text-align:center';
    document.documentElement.appendChild(d); setTimeout(function () { d.remove(); }, 7000);
  }

  /* ---------- 1) recherche + heure ---------- */
  function filtrer() {
    var app = document.getElementById('app'); if (!app) return;
    var q = norm(RECH).trim(), cartes = app.querySelectorAll('.carte'), vus = 0;
    cartes.forEach(function (c) {
      var ok = true;
      if (q && norm(c.innerText).indexOf(q) < 0) ok = false;
      if (ok && HEURE) {
        var l = c.querySelector('.ligue'), m = l && /(\d{2}):(\d{2})\s*$/.exec(l.textContent);
        if (!m) ok = false;
        else {
          var h = +m[1];
          ok = HEURE === 'm' ? h < 15 : HEURE === 'a' ? (h >= 15 && h < 19) : h >= 19;
        }
      }
      c.style.display = ok ? '' : 'none'; if (ok) vus++;
    });
    var n = document.getElementById('o_nb');
    if (n) n.textContent = (q || HEURE) ? vus + ' match(s) affiché(s)' : '';
  }
  function barre() {
    return '<div id="o_f" style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap">' +
      '<input id="o_q" type="search" placeholder="🔎 Chercher une équipe ou un championnat" value="' + (RECH.replace(/"/g, '&quot;')) + '" style="flex:1 1 200px;padding:8px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e2e8f0">' +
      '<select id="o_h" style="padding:8px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e2e8f0">' +
      '<option value=""' + (HEURE === '' ? ' selected' : '') + '>🕐 Toutes heures</option>' +
      '<option value="m"' + (HEURE === 'm' ? ' selected' : '') + '>Avant 15h</option>' +
      '<option value="a"' + (HEURE === 'a' ? ' selected' : '') + '>15h à 19h</option>' +
      '<option value="s"' + (HEURE === 's' ? ' selected' : '') + '>À partir de 19h</option></select>' +
      '<div id="o_nb" style="width:100%;font-size:12px;color:#94a3b8"></div></div>';
  }
  document.addEventListener('input', function (e) { if (e.target.id === 'o_q') { RECH = e.target.value; filtrer(); } });
  document.addEventListener('change', function (e) { if (e.target.id === 'o_h') { HEURE = e.target.value; filtrer(); } });

  /* ---------- 3) sauvegarde ---------- */
  function sauvegardeHtml() {
    return '<div class="stat" id="o_sv"><b>💾 Sauvegarde</b><br><small>Garde une copie de ton historique et de tes mises (la clé API n\'est pas incluse).</small>' +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="act" data-do="o_exp">Exporter</button>' +
      '<button class="act" data-do="o_imp">Importer</button>' +
      '<button class="act" data-do="o_rap">🔔 Activer les rappels</button></div>' +
      '<input id="o_file" type="file" accept=".json,application/json" style="display:none"></div>';
  }
  function exporter() {
    var o = { v: 1, date: new Date().toISOString(), hist: hist(), bilan_reg: lire('bilan_reg', '') };
    var b = new Blob([JSON.stringify(o)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = 'favoris-sauvegarde-' + jour() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    toast('✅ Sauvegarde enregistrée dans tes Téléchargements');
  }
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'o_file' || !e.target.files[0]) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var o = JSON.parse(fr.result);
        if (!o || !Array.isArray(o.hist)) throw new Error('x');
        if (!confirm('Remplacer ton historique actuel par cette sauvegarde (' + o.hist.length + ' favoris) ?')) return;
        sauverHist(o.hist);
        if (o.bilan_reg) ecrire('bilan_reg', o.bilan_reg);
        toast('✅ Historique restauré'); render();
      } catch (er) { toast('❌ Fichier non valide', '#991b1b'); }
    };
    fr.readAsText(e.target.files[0]);
  });

  /* ---------- 2) rappels ---------- */
  function notifier(titre, texte) {
    toast('🔔 ' + titre + ' — ' + texte);
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
    try {
      if (window.Notification && Notification.permission === 'granted') {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(function (r) { r.showNotification(titre, { body: texte, icon: 'icon-192.png' }); }).catch(function () { new Notification(titre, { body: texte }); });
        } else new Notification(titre, { body: texte });
      }
    } catch (e) {}
  }
  function completer() {
    var h = hist(), chg = false;
    h.forEach(function (x) {
      if (x.debut) return;
      var a = (typeof ANA !== 'undefined' ? ANA : []).find(function (z) { return String(z.m.id) === String(x.id); });
      if (a && a.m.debut) { x.debut = a.m.debut; chg = true; }
    });
    if (chg) sauverHist(h);
  }
  function rappels() {
    var h = hist(), chg = false, now = Date.now();
    h.forEach(function (x) {
      if (x.res !== null || !x.debut || x.rap) return;
      var dt = new Date(x.debut).getTime() - now;
      if (dt > 0 && dt <= 30 * 60000) {
        notifier('Match dans ' + Math.max(1, Math.round(dt / 60000)) + ' min', String(x.match).replace(/^\S+\s/, '') + ' · ' + x.fav + ' (' + x.pf + '%)');
        x.rap = true; chg = true;
      } else if (dt <= 0) { x.rap = true; chg = true; }
    });
    if (chg) sauverHist(h);
  }
  setInterval(rappels, 30000);
  setTimeout(rappels, 5000);

  /* ---------- branchement ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-do]') : null; if (!b) return;
    var d = b.getAttribute('data-do');
    if (d === 'o_exp') exporter();
    else if (d === 'o_imp') { var f = document.getElementById('o_file'); if (f) f.click(); }
    else if (d === 'o_rap') {
      if (!window.Notification) { toast('Rappels dans l\'appli activés (notifications non disponibles ici).'); return; }
      Notification.requestPermission().then(function (p) {
        toast(p === 'granted' ? '✅ Rappels activés : tu seras prévenu 30 min avant le match (appli ouverte).' : 'Notifications refusées : tu verras quand même le rappel dans l\'appli.', p === 'granted' ? undefined : '#92400e');
      });
    } else if (d === 'suivre') setTimeout(completer, 120);
  });
  var ro = render;
  render = function () {
    var v = ro.apply(this, arguments);
    try {
      var app = document.getElementById('app');
      if (app && ONG === 'fav' && !document.getElementById('o_f')) {
        var t = document.createElement('div'); t.innerHTML = barre(); app.insertBefore(t.firstChild, app.firstChild);
      }
      if (app && ONG === 'hist' && !document.getElementById('o_sv')) {
        var s = document.createElement('div'); s.innerHTML = sauvegardeHtml(); app.appendChild(s.firstChild);
      }
      if (ONG === 'fav') filtrer();
    } catch (e) {}
    return v;
  };
  setTimeout(completer, 2000);
})();
