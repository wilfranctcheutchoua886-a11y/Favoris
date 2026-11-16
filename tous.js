/* « Tous les sports » : charge football et toutes les autres disciplines d'un coup. */
(function () {
  'use strict';
  var ORDRE = ['foot', 'basket', 'hand', 'hockey', 'baseball', 'rugby', 'volley', 'nfl'];
  SPORTS.tous = { nom: 'Tous les sports', api: SPORTS.foot.api, unite: '', icone: '🌍' };

  var base = depuisApi;
  depuisApi = async function (d) {
    if (SPORT !== 'tous') return base(d);
    var tout = [], echecs = [], vides = [];
    for (var i = 0; i < ORDRE.length; i++) {
      var sp = ORDRE[i];
      if (!SPORTS[sp]) continue;
      AVANCE = SPORTS[sp].icone + ' ' + SPORTS[sp].nom + ' (' + (i + 1) + '/' + ORDRE.length + ')…';
      render();
      try {
        var m = sp === 'foot' ? await depuisFoot(d) : await depuisAutre(d, sp);
        m.forEach(function (x) {
          if (sp !== 'foot') { x.id = sp + '-' + x.id; x.sport = sp; }
        });
        if (!m.length) vides.push(SPORTS[sp].nom);
        tout = tout.concat(m);
        ANA = tout.map(analyser);
        render();
      } catch (e) {
        echecs.push(SPORTS[sp].nom + ' (' + traduire(e.message) + ')');
      }
    }
    var n = [];
    if (echecs.length) n.push('Sans données : ' + echecs.join(' ; ') + '.');
    if (vides.length) n.push('Aucune cote trouvée : ' + vides.join(', ') + '.');
    NOTE = n.join(' ');
    return tout;
  };

  function ajouter() {
    var sel = document.getElementById('sp');
    if (!sel || sel.dataset.tous) return;
    sel.dataset.tous = '1';
    var o = document.createElement('option');
    o.value = 'tous'; o.textContent = '🌍 Tous les sports';
    sel.insertBefore(o, sel.firstChild);
    sel.value = SPORT;
  }
  var baseRender = render;
  render = function () { baseRender(); ajouter(); };
  ajouter();

  /* Si « Tous les sports » était choisi la dernière fois, on le rouvre au démarrage. */
  try {
    if (localStorage.getItem('sport') === 'tous') {
      var t = 0, iv = setInterval(function () {
        t++;
        if (!CHARGE || t > 200) { clearInterval(iv); SPORT = 'tous'; demarrer(false); }
      }, 300);
    }
  } catch (e) {}
})();
