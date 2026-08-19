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
const METHODES = [
  'cru', 'blanchi', 'bouilli', 'poche', 'mijote', 'vapeur',
  'saute', 'grille', 'frit', 'roti', 'marine', 'fermente', 'sans-cuisson',
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

/* La base de dosage d'une étiquette du guide 3. Elle est OBLIGATOIRE dès qu'un
   chiffre est porté : un condiment se dose à la cuillère, pas aux 100 g, et
   forcer les 100 g sur une sauce de poisson donne un chiffre juste et
   inutilisable. L'inverse — la cuillère sur un légume — est absurde. */
const BASES_NUTRITION = ['100g', 'portion', 'c-a-soupe', 'c-a-the', 'unite'];

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
    vapeur: 'Vapeur', saute: 'Sauté', grille: 'Grillé', frit: 'Frit', roti: 'Rôti',
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
  cout_travail: { leger: 'Léger', moyen: 'Moyen', lourd: 'Lourd' },
  statut_perso: {
    'a-l-essai': 'À l’essai', 'au-repertoire': 'Au répertoire', 'de-service': 'De service',
    suspendu: 'Suspendu', ecarte: 'Écarté',
  },
};

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
   convention existait, elle n'était simplement pas dans `limace`. */
function limace(s) {
  return s.toLowerCase()
    .replace(/\u0153/g, 'oe').replace(/\u00e6/g, 'ae')
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
  CUISINES, VITESSES, CATEGORIES, LIBELLES, codeCuisine,
  TYPES_DE_PLAT, METHODES, AXES_GOUT, AXES_TEXTURE, MOMENTS,
  COUTS_TRAVAIL, STATUTS_PERSO, LANGUES, LANGUE_PAR_CUISINE, BASES_NUTRITION,
  minutes, minutesMin, minutesTexte, SEPARATEUR_PARAGRAPHE, paragraphes,
  limace,
  CUISINES_INV: inverse(CUISINES), VITESSES_INV: inverse(VITESSES), CATEGORIES_INV: inverse(CATEGORIES),
  nombre, extraireSante, remettreSante,
};
