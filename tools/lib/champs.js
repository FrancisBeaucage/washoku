'use strict';
/* Conversions entre la forme compacte des tableaux JS des pages et le schéma
   JSON du document 7. Les libellés longs vivent ici, une seule fois. */

const CUISINES = { jp: 'japonaise', cn: 'chinoise', kr: 'coreenne', th: 'thaie', vn: 'vietnamienne' };
const VITESSES = { xs: 'ultra-rapide', s: 'rapide', m: 'moyen', l: 'long', xl: 'extra-long' };
const CATEGORIES = {
  tech: 'technique', dej: 'dejeuner', din: 'diner', sou: 'souper',
  soupe: 'soupe-entree', gar: 'garniture', col: 'collation',
};
const inverse = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));

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

/** « Les bases » → « les-bases ». Sert à fabriquer les identifiants stables. */
function limace(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = {
  CUISINES, VITESSES, CATEGORIES,
  limace,
  CUISINES_INV: inverse(CUISINES), VITESSES_INV: inverse(VITESSES), CATEGORIES_INV: inverse(CATEGORIES),
  nombre, extraireSante, remettreSante,
};
