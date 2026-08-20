'use strict';
/* Conversions entre la forme compacte des tableaux JS des pages et le schéma
   JSON du document 7. Les libellés longs vivent ici, une seule fois. */

/* Le laotien et l'indonésien entrent au document 21, et ce n'est pas une
   ouverture spéculative : le khao khua (T19) est une technique lao avant d'être
   thaïe, et le tempé est PRODUIT À MONTRÉAL et se comporte comme une viande, ce
   qu'aucun soya du dossier ne fait. Taïwan et Hong Kong restent sous
   `chinoise` — leur cuisine domestique EST du cantonais.
   Sans accent et sans cédille, comme `coreenne` et `thaie` le sont déjà. */
const CUISINES = {
  jp: 'japonaise', cn: 'chinoise', kr: 'coreenne', th: 'thaie', vn: 'vietnamienne',
  lo: 'laotienne', id: 'indonesienne',
};
const VITESSES = { xs: 'ultra-rapide', s: 'rapide', m: 'moyen', l: 'long', xl: 'extra-long' };
const CATEGORIES = {
  tech: 'technique', dej: 'dejeuner', din: 'diner', sou: 'souper',
  soupe: 'soupe-entree', gar: 'garniture', col: 'collation',
};
const inverse = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));

/* Les valeurs fermées ouvertes par le document 19. Elles vivent ici, avec les
   autres libellés, pour que `lib/ensembles.js` continue de les lire là où elles
   sont définies au lieu de les recopier. */

/* Le rôle du plat dans le repas, au sens du ichiju sansai. À ne pas confondre
   avec `categorie`, qui dit à quel repas le plat appartient : celui-ci dit
   quelle place il occupe dans l'assiette.
   soupe = 汁 shiru · plat-principal = 主菜 shusai · accompagnement = 副菜
   fukusai · feculent = 主食 shushoku. */
const TYPES_DE_PLAT = [
  'soupe', 'plat-principal', 'accompagnement', 'feculent',
  'condiment', 'marinade', 'collation', 'technique',
];

/* La méthode de cuisson. C'est l'un des quatre axes de la règle de rotation du
   guide 5, et il n'existait nulle part dans les données : il se recalculait de
   mémoire à chaque plan hebdomadaire. Plusieurs valeurs permises, la dominante
   en premier. */
/* `torrefie` entre au document 23, et il ferme un point laissé ouvert au 21.
   `grille` désigne une cuisson par RAYONNEMENT, sur un gril ou sous un
   élément ; `saute` une cuisson EN CORPS GRAS avec mouvement. Une poêle sèche
   où l'on déshydrate et où l'on brunit par contact, sans gras et sans liquide,
   est une troisième chose — et c'est une famille réelle, pas un cas isolé : le
   riz gluant, le sésame, le nori, les épices entières, la farine, les piments
   secs. T19 et T17 portaient `grille` et `saute` par défaut, ce qui était
   défendable et faux.

   ⚠️ La méthode décrit la cuisson DU PLAT, pas chacun de ses gestes : le
   grillage du sésame de R44 et de T20 est une étape à l'intérieur d'un plat
   blanchi, et leur `methode` ne change pas. Même distinction que pour la
   texture, qui se déclare telle qu'elle est dans l'assiette. */
const METHODES = [
  'cru', 'blanchi', 'bouilli', 'poche', 'mijote', 'vapeur',
  'saute', 'grille', 'torrefie', 'frit', 'roti', 'marine', 'fermente', 'sans-cuisson',
];

/* Le vecteur de saveur dominant. Descriptif : vrai pour tout lecteur. */
const AXES_GOUT = [
  'umami-ferment', 'sale-sucre', 'acide', 'piquant', 'aromatique',
  'doux', 'grille-torrefie', 'sesame-noisette', 'riche-gras',
];

/* La texture TELLE QU'ELLE EST DANS L'ASSIETTE, pas telle que l'ingrédient est
   au départ : le chou nappa cru est croquant, le même chou blanchi est mou.
   C'est le plat qui porte l'axe, pas l'ingrédient. */
const AXES_TEXTURE = [
  'croquant', 'ferme', 'fondant', 'moelleux', 'mou',
  'croustillant', 'glissant', 'soyeux', 'elastique', 'en-bouillon',
];

/* `categorie` est unique et sert au classement ; `moment` est multiple et sert
   au filtre. Un donburi de restes est ["diner", "souper"]. */
const MOMENTS = ['dejeuner', 'diner', 'souper', 'collation'];

/* Le coût en travail, mesuré en minutes actives — une propriété du plat, pas
   d'un lecteur. Croisé avec `etoiles`, il donne la seule règle de tri qui
   compte : trois étoiles pour un coût léger se refait toujours, trois étoiles
   pour un coût lourd ne se refait que si on a du temps. */
const COUTS_TRAVAIL = ['leger', 'moyen', 'lourd'];

/* Le goût d'UN lecteur, à ne jamais confondre avec `statut` : `statut` juge
   l'exactitude de la fiche, `statut_perso` juge le plat. Une fiche exacte qu'un
   lecteur n'aime pas reste `actif` et devient `ecarte` pour lui — retirer une
   fiche exacte détruirait de l'information pour les autres lecteurs. */
const STATUTS_PERSO = ['a-l-essai', 'au-repertoire', 'de-service', 'suspendu', 'ecarte'];

/* La langue d'origine du nom du plat ou du produit. Elle existe parce qu'un
   champ japonais OBLIGATOIRE sur une fiche de yogourt grec est un signe que le
   schéma croit encore que le dossier est uniquement japonais : un champ qu'on
   ne peut pas remplir honnêtement se remplit malhonnêtement. */
const LANGUES = ['ja', 'zh', 'ko', 'vi', 'th', 'lo', 'id', 'aucune'];

/* Le défaut de `langue_origine` pour une fiche du guide 2 : sa cuisine le dit
   déjà. Dérivé, donc reproductible — mais le champ reste réinscriptible, une
   recette pouvant porter un nom d'une autre langue que sa cuisine. */
const LANGUE_PAR_CUISINE = {
  japonaise: 'ja', chinoise: 'zh', coreenne: 'ko', vietnamienne: 'vi', thaie: 'th',
  laotienne: 'lo', indonesienne: 'id',
};

/* LA LANGUE PARLÉE DANS LA VIDÉO D'UNE FICHE. Elle n'existe pas pour classer :
   elle existe parce que le document 24 fournit deux démonstrations dans une
   langue que le lecteur ne parle pas — `R80` en indonésien, `T21` en
   vietnamien — et qu'une vidéo muette pour son lecteur reste utile pour les
   gestes, à condition de le savoir AVANT de cliquer.

   `null` est le cas normal et il ne veut pas dire « français » : il veut dire
   que personne ne l'a établi. Le champ ne se remplit donc que quand la réponse
   est utile, c'est-à-dire quand la langue n'est ni le français ni l'anglais.
   Écrire `fr` ou `en` sur les 91 autres serait un chiffre exact et inutile. */
const LANGUES_VIDEO = ['fr', 'en', 'ja', 'zh', 'ko', 'vi', 'th', 'lo', 'id'];

/* La base de dosage d'une étiquette du guide 3. Elle est OBLIGATOIRE dès qu'un
   chiffre est porté : un condiment se dose à la cuillère, pas aux 100 g, et
   forcer les 100 g sur une sauce de poisson donne un chiffre juste et
   inutilisable. L'inverse — la cuillère sur un légume — est absurde. */
const BASES_NUTRITION = ['100g', 'portion', 'c-a-soupe', 'c-a-the', 'unite'];

/* OÙ SE TROUVE UN INGRÉDIENT. Le champ était documenté en prose au LISEZMOI et
   vérifié par personne — le frère jumeau du `section: "legumes"` du document
   13. C'est pour ça que le « Costco » de `premier-protein` avait atterri dans
   `ou_le_trouver` : il n'y avait pas de valeur légitime à mettre.

   L'ensemble porte DEUX familles, et c'est assumé : cinq zones du supermarché
   du parcours, et les magasins où l'on va autrement. Le champ répond à « où
   est-ce », et pour un produit du parcours la réponse est une zone, pour un
   produit d'ailleurs c'est une enseigne. `ou_le_trouver` reste la prose libre
   qui dit l'allée et l'aspect sur la tablette.

   `null` est admis : beaucoup d'ingrédients n'ont pas de provenance établie, et
   forcer une valeur en inventerait une. Une seule des 89 fiches portait une
   valeur au moment de fermer l'ensemble, et elle y entrait déjà — la fermeture
   n'a donc rien forcé. */
const ZONES_MAGASIN = [
  'entree-droite', 'mur-du-fond', 'allees-centrales', 'congelateurs', 'fin-de-magasin',
  'kim-phat', 'iga', 'super-c', 'costco', 'mayrand', 'saq', 'miyamoto', 'metro', 'autre',
];

/* Les libellés d'affichage des ensembles fermés. Ils vivent ici, à côté des
   valeurs, et non dans les gabarits de page : le document 20 fait apparaître
   ces champs dans TROIS vues — la carte de liste, la page de fiche, le filtre —
   et trois tables de libellés auraient fini par diverger. Une valeur sans
   libellé s'affiche telle quelle plutôt que vide, ce qui la rend visible au
   lieu de la faire disparaître.

   `codeCuisine` est l'ancienne clé courte (`jp`, `cn`…) : elle survit parce
   qu'elle sert de valeur de filtre dans l'URL, où « japonaise » serait plus
   long sans rien apprendre. */
const LIBELLES = {
  cuisine: {
    japonaise: 'Japonais', chinoise: 'Chinois', coreenne: 'Coréen',
    thaie: 'Thaï', vietnamienne: 'Vietnamien', laotienne: 'Laotien',
    indonesienne: 'Indonésien',
  },
  /* LE DRAPEAU DE L'ORIGINE, à côté du nom et jamais à sa place. Six étiquettes
     s'empilaient sur une carte de liste avant qu'on ait lu le titre, et celle
     qui se compresse le mieux est l'origine : elle a un symbole universel de
     deux caractères. Le gabarit met donc le drapeau à l'affichage et le nom de
     `cuisine` dans le `title` et l'`aria-label` — un drapeau ne se lit pas à
     haute voix et ne se cherche pas au clavier.

     ⚠️ Chrome et Edge sous Windows n'ont pas les glyphes de drapeaux : ils
     rendent les deux lettres du code régional — JP, CN, KR. C'est un repli
     automatique et lisible, pas une panne, et c'est pourquoi le nom en clair
     doit toujours voyager à côté.

     ⚠️ UN DRAPEAU EST UN PAYS, UNE CUISINE N'EN EST PAS UN. Le laap et le tam
     mak hoong sont des deux côtés de la frontière lao-thaïe. C'est la même
     simplification que `cuisine` faisait déjà avec ses noms. */
  cuisine_drapeau: {
    japonaise: '🇯🇵', chinoise: '🇨🇳', coreenne: '🇰🇷', thaie: '🇹🇭',
    vietnamienne: '🇻🇳', laotienne: '🇱🇦', indonesienne: '🇮🇩',
  },
  /* LE REPLI, ET IL N'EST PAS AUSSI AUTOMATIQUE QUE PRÉVU. Le document 33
     annonçait que les navigateurs sans glyphe de drapeau rendent les deux
     lettres du code régional — c'est vrai de Chrome et d'Edge sous Windows,
     qui ont ces lettres dans Segoe UI Emoji. Vérifié à l'écran : un navigateur
     SANS police d'émoji du tout ne rend pas deux lettres, il rend UN CARRÉ, et
     l'origine disparaît alors complètement de la carte.

     D'où ces deux lettres, servies par `DRAPEAU()` de `lib/vue.js` quand le
     test au pixel dit que le drapeau ne se compose pas. Elles sont aussi
     courtes, elles se cherchent au clavier, et elles ne dépendent d'aucune
     police. Le nom en clair reste dans le `title` dans les deux cas. */
  cuisine_code: {
    japonaise: 'JP', chinoise: 'CN', coreenne: 'KR', thaie: 'TH',
    vietnamienne: 'VN', laotienne: 'LA', indonesienne: 'ID',
  },
  vitesse: {
    'ultra-rapide': 'Ultra rapide', rapide: 'Rapide', moyen: 'Moyen',
    long: 'Long', 'extra-long': 'Extra long',
  },
  categorie: {
    technique: 'Technique', dejeuner: 'Déjeuner', diner: 'Dîner', souper: 'Souper',
    'soupe-entree': 'Soupe-entrée', garniture: 'Garniture', collation: 'Collation',
  },
  type_de_plat: {
    soupe: 'Soupe', 'plat-principal': 'Plat principal', accompagnement: 'Accompagnement',
    feculent: 'Féculent', condiment: 'Condiment', marinade: 'Marinade',
    collation: 'Collation', technique: 'Technique',
  },
  methode: {
    cru: 'Cru', blanchi: 'Blanchi', bouilli: 'Bouilli', poche: 'Poché', mijote: 'Mijoté',
    vapeur: 'Vapeur', saute: 'Sauté', grille: 'Grillé', torrefie: 'Torréfié',
    frit: 'Frit', roti: 'Rôti',
    marine: 'Mariné', fermente: 'Fermenté', 'sans-cuisson': 'Sans cuisson',
  },
  axe_gout: {
    'umami-ferment': 'Umami · fermenté', 'sale-sucre': 'Salé-sucré', acide: 'Acide',
    piquant: 'Piquant', aromatique: 'Aromatique', doux: 'Doux',
    'grille-torrefie': 'Grillé · torréfié', 'sesame-noisette': 'Sésame · noisette',
    'riche-gras': 'Riche · gras',
  },
  axe_texture: {
    croquant: 'Croquant', ferme: 'Ferme', fondant: 'Fondant', moelleux: 'Moelleux',
    mou: 'Mou', croustillant: 'Croustillant', glissant: 'Glissant', soyeux: 'Soyeux',
    elastique: 'Élastique', 'en-bouillon': 'En bouillon',
  },
  moment: { dejeuner: 'Déjeuner', diner: 'Dîner', souper: 'Souper', collation: 'Collation' },
  zone_magasin: {
    'entree-droite': 'À l’entrée, à droite', 'mur-du-fond': 'Le mur du fond',
    'allees-centrales': 'Les allées centrales', congelateurs: 'Les congélateurs',
    'fin-de-magasin': 'La fin du magasin',
    'kim-phat': 'Kim Phat', iga: 'IGA', 'super-c': 'Super C', costco: 'Costco',
    mayrand: 'Mayrand', saq: 'SAQ', miyamoto: 'Miyamoto', metro: 'Metro',
    autre: 'Ailleurs',
  },
  cout_travail: { leger: 'Léger', moyen: 'Moyen', lourd: 'Lourd' },
  /* Une préposition et non un nom de langue : le libellé se lit à la suite de
     « Démonstration par X », où « Indonésien » ne se serait pas rendu. */
  video_langue: {
    fr: 'en français', en: 'en anglais', ja: 'en japonais', zh: 'en chinois',
    ko: 'en coréen', vi: 'en vietnamien', th: 'en thaï', lo: 'en lao',
    id: 'en indonésien',
  },
  statut_perso: {
    'a-l-essai': 'À l’essai', 'au-repertoire': 'Au répertoire', 'de-service': 'De service',
    suspendu: 'Suspendu', ecarte: 'Écarté',
  },
  /* 🔴 LE SEUL CHAMP FERMÉ AFFICHÉ QUI N'AVAIT PAS D'ALIAS, et ce n'est pas un
     oubli d'attention : c'est une conséquence de la forme de son nom. La table
     est indexée par un nom de champ simple, et `nutrition.source` porte un
     point. `video.langue` avait le même problème, résolu en le nommant
     `video_langue` ici ; celui-ci n'avait jamais reçu son alias, et la fiche
     affichait « estime » en toutes lettres. Document 33, V5.

     « Étiquette LUE » plutôt que « Étiquette » n'est pas de la coquetterie :
     dans ce dossier, l'écart entre un chiffre estimé et un chiffre relevé sur
     un panneau est l'écart entre une hypothèse et un fait. */
  nutrition_source: { estime: 'Estimé', etiquette: 'Étiquette lue', pese: 'Pesé' },
  /* L'audit demandé par le V5 en a trouvé un second, sur la page d'ingrédient :
     la base de dosage s'affichait brute, entre parenthèses — « Nutrition
     (c-a-soupe) ». Les libellés se lisent à la suite du mot « Nutrition », donc
     ce sont des locutions et non des noms. */
  nutrition_base: {
    '100g': 'aux 100 g', portion: 'par portion', 'c-a-soupe': 'par c. à soupe',
    'c-a-the': 'par c. à thé', unite: 'à l’unité',
  },
};

/* LE LECTEUR COURANT. `etoiles`, `statut_perso` et `motif_statut` sont des
   objets dont les CLÉS SONT DES LECTEURS — le site en a plus d'un, et un plat
   peut valoir deux étoiles pour l'un et cinq pour l'autre. Mais une carte de
   liste ne peut pas afficher un objet : il lui faut UN avis.

   C'est une ligne de configuration, pas une interface. Le jour où un deuxième
   lecteur veut le site à sa mesure, ça devient un sélecteur, et la donnée est
   déjà prête pour ça.

   🔴 UN AVIS ABSENT N'EST PAS UN AVIS NÉGATIF. Une fiche dont ce lecteur n'a
   rien dit se lit comme `a-l-essai`, jamais comme écartée : sans cette règle,
   les 79 fiches dont personne ne s'est encore prononcé disparaîtraient toutes
   de la liste par défaut. */
const LECTEUR = 'francis';

/** « japonaise » → « jp ». La clé courte, qui sert de valeur de filtre en URL. */
const codeCuisine = (v) => inverse(CUISINES)[v] || v;

/** "≈ 190 / tasse" → 190 ; "~44 g" → 44 ; "—" ou "variable" → null. */
function nombre(texte) {
  if (texte == null) return null;
  const m = String(texte).replace(/ /g, ' ').match(/-?\d[\d\s]*(?:[.,]\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/* Le † d'un ingrédient renvoie à la partie santé du guide 1. Le document 7
   demande qu'il devienne un booléen plutôt qu'un caractère dans le texte.
   Sa position est conservée à part pour que la régénération soit exacte :
   « wakame † séché » ne doit pas devenir « wakame séché † ». */
function extraireSante(brut) {
  const i = brut.indexOf(' †');
  if (i === -1) return { texte: brut, sante: false, sante_pos: null };
  return { texte: brut.slice(0, i) + brut.slice(i + 2), sante: true, sante_pos: i };
}

function remettreSante(ing) {
  if (!ing.sante) return ing.texte;
  const i = ing.sante_pos == null ? ing.texte.length : ing.sante_pos;
  return ing.texte.slice(0, i) + ' †' + ing.texte.slice(i);
}

/* « Les bases » → « les-bases ». Sert à fabriquer les identifiants stables.

   Les LIGATURES se déplient AVANT la décomposition Unicode : `œ` et `æ` sont
   des lettres à part entière, pas des voyelles accentuées, donc `NFD` ne les
   touche pas et le filtre `[^a-z0-9]` les avalait — « bœuf » donnait `b-uf`,
   « l'œuf » donnait `l-uf`. Une lettre perdue dans un identifiant, en silence.
   Le document 20 l'avait prévu et demandait de regarder le cas ; la page du
   guide 2 déplie déjà `œ → oe` dans son normalisateur de recherche, donc la
   convention existait, elle n'était simplement pas dans `limace`.

   `ß` est ajouté au document 23 par prudence : aucun `fr` n'en porte, mais il
   se décompose comme les deux autres — c'est une ligature, pas une lettre
   accentuée, et il serait avalé de la même façon le jour où un nom allemand
   entre au recueil.

   LA FORME MAJUSCULE N'A PAS BESOIN D'ÊTRE DANS LA TABLE, et le document 30 a
   eu raison de poser la question plutôt que de le supposer : `Œufs` et `Ægis`
   entrent au recueil ce jour-là. La réponse est dans l'ORDRE des opérations —
   `toLowerCase()` s'exécute AVANT le dépliage, donc `Œ` est déjà devenu `œ`
   quand la table s'applique. Vérifié : `limace("Œufs vapeur cantonais")` donne
   `oeufs-vapeur-cantonais`. Le normalisateur de recherche de `lib/vue.js` a la
   même architecture, donc « oeufs » y trouve « Œufs ».

   ⚠️ CE BOGUE ÉTAIT INVISIBLE À SON PROPRE VALIDATEUR. La règle 20 vérifie que
   `slug === limace(fr)` : elle déclarait donc corrects les slugs que la faute
   produisait. Un système qui se vérifie contre lui-même ne trouve pas ses
   propres bogues — il a fallu comparer la sortie à une valeur attendue écrite
   ailleurs. C'est encore ce qui a levé le drapeau au document 30 : le rédacteur
   avait rejoué sa propre réimplémentation de `limace()` sur ses champs `fr`, et
   c'est le DÉSACCORD entre les deux qui a posé la question. */
function limace(s) {
  return s.toLowerCase()
    .replace(/\u0153/g, 'oe').replace(/\u00e6/g, 'ae').replace(/\u00df/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


/* Un temps de `temps_minutes` : un nombre, ou une fourchette {min, max} depuis
   le document 19. La fourchette existe parce que R56 portait deux méthodes de
   cuisson allant de 40 à 75 minutes sous un seul `temps_affiche` de 47 min —
   un chiffre faux pour les deux. Une fiche à méthode unique ne change pas. */
function minutes(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && typeof v.max === 'number') return v.max;
  return 0;
}

/** La borne basse d'un temps : le nombre lui-même, ou `min` d'une fourchette. */
function minutesMin(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && typeof v.min === 'number') return v.min;
  return 0;
}

/** « 40 » ou « 40 à 75 », pour l'affichage. */
function minutesTexte(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  const [a, b] = [minutesMin(v), minutes(v)];
  return a === b ? String(a) : `${a} à ${b}`;
}

/* Le séparateur de paragraphes des champs texte du guide 2 et des notes du
   guide 3 (document 19, S6). Ces champs sont du texte brut — une balise <p> s'y
   afficherait en toutes lettres — et l'agent a dû fusionner trois notes qui
   portaient chacune quatre ou cinq idées distinctes. Une note qu'on lit debout
   devant le micro-ondes n'est pas lisible en un pavé sans respiration.
   DEUX SAUTS DE LIGNE, et rien d'autre : un saut simple ne se rend pas. */
const SEPARATEUR_PARAGRAPHE = '\n\n';

/** Un champ texte → ses paragraphes. Jamais de tableau vide. */
function paragraphes(texte) {
  if (texte == null) return [];
  return String(texte).split(/\n\n+/);
}

module.exports = {
  CUISINES, VITESSES, CATEGORIES, LIBELLES, codeCuisine, LECTEUR,
  TYPES_DE_PLAT, METHODES, AXES_GOUT, AXES_TEXTURE, MOMENTS,
  COUTS_TRAVAIL, STATUTS_PERSO, LANGUES, LANGUE_PAR_CUISINE, LANGUES_VIDEO,
  BASES_NUTRITION, ZONES_MAGASIN,
  minutes, minutesMin, minutesTexte, SEPARATEUR_PARAGRAPHE, paragraphes,
  limace,
  CUISINES_INV: inverse(CUISINES), VITESSES_INV: inverse(VITESSES), CATEGORIES_INV: inverse(CATEGORIES),
  nombre, extraireSante, remettreSante,
};
