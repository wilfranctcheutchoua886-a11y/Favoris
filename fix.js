/* Basketball : on utilise le marché « Home/Away » (victoire, prolongation comprise) plutôt que « 3Way Result ». */
(function () {
  'use strict';
  var orig = agregerAutre;
  agregerAutre = function (bks) {
    if (SPORT === 'basket') {
      var b2 = bks.map(function (b) {
        return { bets: (b.bets || []).filter(function (z) { return !/^3way result$/i.test(String(z.name || '')); }) };
      });
      var r = orig(b2);
      if (r.cotes.length) return r;
    }
    return orig(bks);
  };
})();
