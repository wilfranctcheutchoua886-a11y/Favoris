/* Bouton « Parier » : copie le pari et ouvre 1win. Aucun mot de passe ni argent ne passe par l'appli. */
(function () {
  'use strict';
  var DEFAUT = 'https://1win.com';
  function lien() { var u = lire('parier_url', DEFAUT); return /^https?:\/\//i.test(u) ? u : DEFAUT; }
  function toast(t, bg) {
    var d = document.createElement('div'); d.textContent = t;
    d.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;background:' + (bg || '#166534') + ';color:#fff;font:13px sans-serif;padding:8px 14px;border-radius:12px;max-width:90%;text-align:center';
    document.documentElement.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
  }
  function copier(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); } catch (e) {}
    return new Promise(function (ok) {
      var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); ok();
    });
  }
  function reglage() { try { return JSON.parse(lire('bilan_reg', 'null')) || {}; } catch (e) { return {}; } }
  function miseDuJour() {
    return hist().filter(function (x) { return x.d === jour() && x.mise > 0; }).reduce(function (s, x) { return s + x.mise; }, 0);
  }
  function ajouterBoutons() {
    var app = document.getElementById('app'); if (!app || ONG !== 'fav') return;
    app.querySelectorAll('button[data-do="suivre"]').forEach(function (b) {
      if (b.nextElementSibling && b.nextElementSibling.getAttribute('data-do') === 'parier') return;
      var p = document.createElement('button');
      p.className = 'act'; p.setAttribute('data-do', 'parier');
      p.setAttribute('data-id', b.getAttribute('data-id') || '');
      if (b.getAttribute('data-n')) p.setAttribute('data-n', b.getAttribute('data-n'));
      p.style.marginLeft = '6px'; p.textContent = '🎯 Parier sur 1win';
      b.parentNode.insertBefore(p, b.nextSibling);
    });
  }
  function blocReglage() {
    var app = document.getElementById('app'); if (!app || ONG !== 'hist' || document.getElementById('p_bloc')) return;
    var d = document.createElement('div'); d.className = 'stat'; d.id = 'p_bloc';
    d.innerHTML = '<b>🎯 Bookmaker</b><br><small>Lien ouvert par le bouton « Parier » (change-le si 1win utilise une autre adresse dans ton pays).</small>' +
      '<div style="margin-top:6px"><input id="p_url" type="url" value="' + lien().replace(/"/g, '&quot;') + '" style="width:100%;padding:8px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e2e8f0"></div>' +
      '<small style="color:#94a3b8">Réservé aux 18 ans et plus. Joue avec modération.</small>';
    app.appendChild(d);
  }
  document.addEventListener('change', function (e) { if (e.target.id === 'p_url') ecrire('parier_url', e.target.value.trim()); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-do="parier"]') : null; if (!b) return;
    var id = b.getAttribute('data-id'), a = ANA.find(function (x) { return String(x.m.id) === id; });
    if (!a) return;
    var nom = b.getAttribute('data-n') || a.fav, r = reglage(), mise = r.mise > 0 ? r.mise : 0;
    var txt = a.m.dom + ' vs ' + a.m.ext + ' — ' + nom + (mise ? ' — mise ' + mise + ' €' : '');
    if (r.limite > 0 && miseDuJour() + mise > r.limite) {
      if (!confirm('⚠️ Tu dépasses ta limite du jour (' + r.limite + ' €). Continuer quand même ?')) return;
    }
    var u = lien();
    copier(txt).then(function () {
      toast('📋 Copié : ' + txt + '. Ouverture de 1win…');
      setTimeout(function () { window.open(u, '_blank'); }, 1200);
    });
  });
  var ro = render;
  render = function () { var v = ro.apply(this, arguments); try { ajouterBoutons(); blocReglage(); } catch (e) {} return v; };
})();
