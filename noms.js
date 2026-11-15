/* Noms des équipes nationales en français (affichage seulement : les données restent inchangées). */
(function () {
  'use strict';
  var L = [
    'Afghanistan=Afghanistan','Albania=Albanie','Algeria=Algérie','Andorra=Andorre','Angola=Angola','Argentina=Argentine','Armenia=Arménie','Australia=Australie','Austria=Autriche','Azerbaijan=Azerbaïdjan',
    'Bahrain=Bahreïn','Bangladesh=Bangladesh','Belarus=Biélorussie','Belgium=Belgique','Benin=Bénin','Bolivia=Bolivie','Bosnia and Herzegovina=Bosnie-Herzégovine','Bosnia=Bosnie-Herzégovine','Botswana=Botswana','Brazil=Brésil','Bulgaria=Bulgarie','Burkina Faso=Burkina Faso','Burundi=Burundi',
    'Cambodia=Cambodge','Cameroon=Cameroun','Canada=Canada','Cape Verde=Cap-Vert','Cape Verde Islands=Cap-Vert','Central African Republic=Centrafrique','Chad=Tchad','Chile=Chili','China=Chine','China PR=Chine','Chinese Taipei=Taipei chinois','Colombia=Colombie','Comoros=Comores','Congo=Congo','Congo DR=RD Congo','DR Congo=RD Congo','Costa Rica=Costa Rica','Croatia=Croatie','Cuba=Cuba','Curacao=Curaçao','Cyprus=Chypre','Czech Republic=République tchèque','Czechia=Tchéquie',
    'Denmark=Danemark','Djibouti=Djibouti','Dominican Republic=République dominicaine','Ecuador=Équateur','Egypt=Égypte','El Salvador=Salvador','England=Angleterre','Equatorial Guinea=Guinée équatoriale','Eritrea=Érythrée','Estonia=Estonie','Eswatini=Eswatini','Ethiopia=Éthiopie',
    'Faroe Islands=Îles Féroé','Fiji=Fidji','Finland=Finlande','France=France','Gabon=Gabon','Gambia=Gambie','Georgia=Géorgie','Germany=Allemagne','Ghana=Ghana','Gibraltar=Gibraltar','Greece=Grèce','Grenada=Grenade','Guatemala=Guatemala','Guinea=Guinée','Guinea Bissau=Guinée-Bissau','Guinea-Bissau=Guinée-Bissau','Guyana=Guyana',
    'Haiti=Haïti','Honduras=Honduras','Hong Kong=Hong Kong','Hungary=Hongrie','Iceland=Islande','India=Inde','Indonesia=Indonésie','Iran=Iran','Iraq=Irak','Ireland=Irlande','Republic of Ireland=Irlande','Israel=Israël','Italy=Italie','Ivory Coast=Côte d\'Ivoire',
    'Jamaica=Jamaïque','Japan=Japon','Jordan=Jordanie','Kazakhstan=Kazakhstan','Kenya=Kenya','Kosovo=Kosovo','Kuwait=Koweït','Kyrgyzstan=Kirghizistan','Laos=Laos','Latvia=Lettonie','Lebanon=Liban','Lesotho=Lesotho','Liberia=Liberia','Libya=Libye','Liechtenstein=Liechtenstein','Lithuania=Lituanie','Luxembourg=Luxembourg',
    'Madagascar=Madagascar','Malawi=Malawi','Malaysia=Malaisie','Maldives=Maldives','Mali=Mali','Malta=Malte','Mauritania=Mauritanie','Mauritius=Maurice','Mexico=Mexique','Moldova=Moldavie','Mongolia=Mongolie','Montenegro=Monténégro','Morocco=Maroc','Mozambique=Mozambique','Myanmar=Birmanie',
    'Namibia=Namibie','Nepal=Népal','Netherlands=Pays-Bas','New Caledonia=Nouvelle-Calédonie','New Zealand=Nouvelle-Zélande','Nicaragua=Nicaragua','Niger=Niger','Nigeria=Nigeria','North Korea=Corée du Nord','North Macedonia=Macédoine du Nord','Macedonia=Macédoine du Nord','Northern Ireland=Irlande du Nord','Norway=Norvège',
    'Oman=Oman','Pakistan=Pakistan','Palestine=Palestine','Panama=Panama','Papua New Guinea=Papouasie-Nouvelle-Guinée','Paraguay=Paraguay','Peru=Pérou','Philippines=Philippines','Poland=Pologne','Portugal=Portugal','Qatar=Qatar','Romania=Roumanie','Russia=Russie','Rwanda=Rwanda',
    'San Marino=Saint-Marin','Sao Tome and Principe=Sao Tomé-et-Principe','Saudi Arabia=Arabie saoudite','Scotland=Écosse','Senegal=Sénégal','Serbia=Serbie','Seychelles=Seychelles','Sierra Leone=Sierra Leone','Singapore=Singapour','Slovakia=Slovaquie','Slovenia=Slovénie','Somalia=Somalie','South Africa=Afrique du Sud','South Korea=Corée du Sud','Korea Republic=Corée du Sud','South Sudan=Soudan du Sud','Spain=Espagne','Sri Lanka=Sri Lanka','Sudan=Soudan','Suriname=Suriname','Sweden=Suède','Switzerland=Suisse','Syria=Syrie',
    'Tahiti=Tahiti','Tajikistan=Tadjikistan','Tanzania=Tanzanie','Thailand=Thaïlande','Togo=Togo','Trinidad and Tobago=Trinité-et-Tobago','Tunisia=Tunisie','Turkey=Turquie','Turkiye=Turquie','Turkmenistan=Turkménistan','Uganda=Ouganda','Ukraine=Ukraine','United Arab Emirates=Émirats arabes unis','UAE=Émirats arabes unis','Uruguay=Uruguay','USA=États-Unis','United States=États-Unis','Uzbekistan=Ouzbékistan',
    'Venezuela=Venezuela','Vietnam=Viêt Nam','Wales=Pays de Galles','Yemen=Yémen','Zambia=Zambie','Zimbabwe=Zimbabwe'
  ];
  var MAP = {}, NOMS = [];
  function cle(s) { return String(s).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  L.forEach(function (x) {
    var i = x.indexOf('='), en = x.slice(0, i);
    MAP[cle(en)] = x.slice(i + 1);
    NOMS.push(en);
  });
  NOMS.sort(function (a, b) { return b.length - a.length; });
  var motif = NOMS.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ -]'); }).join('|');
  var RE = new RegExp('(?<![A-Za-z])(' + motif + ')((?:[ -](?:W|U-?\\d{2}|Women|Olympic))*)(?![A-Za-z])', 'g');

  function trad(texte) {
    return texte.replace(RE, function (tout, nom, suf) {
      var f = MAP[cle(nom)];
      if (!f) return tout;
      return f + suf.replace(/[ -](W|Women)$/i, ' (F)');
    });
  }
  var occ = false;
  function parcourir(racine) {
    if (!racine || occ) return;
    occ = true;
    try {
      var w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, null), n, liste = [];
      while ((n = w.nextNode())) liste.push(n);
      liste.forEach(function (t) {
        var v = t.nodeValue;
        if (v && v.length < 400) { var r = trad(v); if (r !== v) t.nodeValue = r; }
      });
    } catch (e) {}
    occ = false;
  }
  var app = document.getElementById('app');
  if (app) {
    new MutationObserver(function () { parcourir(app); }).observe(app, { childList: true, subtree: true });
    parcourir(app);
  }
})();
