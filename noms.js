/* Noms des équipes en français (affichage seulement : les données restent inchangées). */
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
    'Venezuela=Venezuela','Vietnam=Viêt Nam','Wales=Pays de Galles','Yemen=Yémen','Zambia=Zambie','Zimbabwe=Zimbabwe',
    'Atletico Madrid=Atlético de Madrid','Barcelona=FC Barcelone','Sevilla=FC Séville','Bayern Munich=Bayern Munich','Bayern München=Bayern Munich','Borussia Dortmund=Borussia Dortmund','Paris Saint Germain=Paris Saint-Germain','Paris Saint-Germain=Paris Saint-Germain','AC Milan=AC Milan','Inter=Inter Milan','Juventus=Juventus','Napoli=Naples','Roma=AS Rome','Lazio=Lazio Rome','Benfica=Benfica','Porto=FC Porto','Sporting CP=Sporting Portugal','Ajax=Ajax Amsterdam','Marseille=Olympique de Marseille','Lyon=Olympique lyonnais','Monaco=AS Monaco','Lille=LOSC Lille'
  ];
  var MAP = {};
  function cle(s) { return String(s).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  L.forEach(function (x) { var i = x.indexOf('='); MAP[cle(x.slice(0, i))] = x.slice(i + 1); });
  var SUF = /((?:\s+(?:W|U-?\d{2}|Women|Olympic))+)$/i;

  function tr(nom) {
    var m = SUF.exec(nom), suf = '', base = nom;
    if (m) { suf = m[1]; base = nom.slice(0, m.index); }
    var f = MAP[cle(base)];
    if (!f) return nom;
    suf = suf.replace(/\s+(W|Women)\b/i, ' (F)');
    return f + suf;
  }
  /* « 🔴 Germany vs Spain (direct 45') » : traduit chaque équipe, garde le reste. */
  function duel(s) {
    return s.split(' vs ').map(function (p) {
      var m = /^([^A-Za-z]*)(.*?)(\s*\(.*\))?$/.exec(p);
      return m ? m[1] + tr(m[2]) + (m[3] || '') : p;
    }).join(' vs ');
  }
  var base = esc;
  esc = function (s) {
    if (typeof s === 'string' && s.length < 80) s = s.indexOf(' vs ') > -1 ? duel(s) : tr(s);
    return base(s);
  };
})();
