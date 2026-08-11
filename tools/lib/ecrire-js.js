'use strict';
/* Écriture des littéraux JavaScript réinjectés dans les pages, dans le style
   déjà en place : une ligne d'entêtes, puis un groupe de champs par ligne. */

const chaine = (s) => JSON.stringify(s);

function valeur(v) {
  if (typeof v === 'string') return chaine(v);
  // { __brut } sert à réémettre une expression telle quelle (IMG.edamame).
  if (v && typeof v === 'object' && '__brut' in v) return v.__brut;
  if (Array.isArray(v)) return '[' + v.map(valeur).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `${k}:${valeur(x)}`).join(',') + '}';
  return String(v);
}

const paire = (k, v) => `${k}:${valeur(v)}`;

/**
 * Sérialise un objet : les clés de `entete` sur la première ligne, puis un
 * groupe de clés par ligne. Les clés absentes de l'objet sont ignorées.
 * @param {string[]} entete
 * @param {string[][]} groupes
 */
function objetMultiligne(o, entete, groupes) {
  const tete = entete.filter((k) => k in o).map((k) => paire(k, o[k]));
  const corps = groupes
    .map((g) => g.filter((k) => k in o).map((k) => paire(k, o[k])).join(','))
    .filter(Boolean);
  if (!corps.length) return '{' + tete.join(',') + '}';
  return '{' + tete.join(',') + ',\n ' + corps.join(',\n ') + '}';
}

/** Un tableau `const NOM = [ … ];` complet, prêt à être réinjecté. */
function tableau(nom, elements, separateur = '\n') {
  return `const ${nom} = [\n${elements.join(',' + separateur)}\n];`;
}

module.exports = { valeur, paire, objetMultiligne, tableau, chaine };
