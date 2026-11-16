/* Disciplines supplémentaires : hockey, baseball, rugby, volleyball, football américain. */
(function () {
  'use strict';
  var PLUS = [
    ['hockey', 'Hockey sur glace', 'https://v1.hockey.api-sports.io', 'buts', '🏒'],
    ['baseball', 'Baseball', 'https://v1.baseball.api-sports.io', 'points', '⚾'],
    ['rugby', 'Rugby', 'https://v1.rugby.api-sports.io', 'points', '🏉'],
    ['volley', 'Volleyball', 'https://v1.volleyball.api-sports.io', 'points', '🏐'],
    ['nfl', 'Football américain', 'https://v1.american-football.api-sports.io', 'points', '🏈']
  ];
  PLUS.forEach(function (s) { SPORTS[s[0]] = { nom: s[1], api: s[2], unite: s[3], icone: s[4] }; });

  function ajouter() {
    var sel = document.getElementById('sp');
    if (!sel || sel.dataset.plus) return;
    sel.dataset.plus = '1';
    PLUS.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s[0]; o.textContent = s[4] + ' ' + s[1];
      sel.appendChild(o);
    });
    sel.value = SPORT;
  }
  var base = render;
  render = function () { base(); ajouter(); };
  ajouter();
})();
