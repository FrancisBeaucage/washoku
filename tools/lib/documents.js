'use strict';
/* Les documents de mise à jour déjà appliqués. Le manifeste annonçait ce
   numéro à partir d'une valeur recopiée à la main dans `generer.js` : elle a
   été oubliée, et un compteur périmé a fait croire à l'agent de planification
   que le travail n'avait pas été fait. Le numéro se dérive donc maintenant de
   l'état réel du dépôt, comme les compteurs de fiches.

   La liste est la source unique. `generer.js` la lit, ne l'écrit jamais et
   n'accepte aucune valeur en paramètre ; c'est `appliquer-document.js` qui
   l'allonge, une fois le contenu du document en place. Tout écart lève —
   jamais d'avertissement : un compteur de documents faux est exactement le
   genre de faute qu'on ne remarque qu'une session trop tard. */

const fs = require('fs');
const path = require('path');
const { DATA } = require('./sources');

const NOM = 'documents-appliques.json';
const CHEMIN = path.join(DATA, NOM);

/** La liste des numéros appliqués, triée. Lève si elle est absente ou vide. */
function lire() {
  if (!fs.existsSync(CHEMIN)) {
    throw new Error(`data/${NOM} est absent : impossible de savoir quel document est appliqué.`);
  }
  let brut;
  try {
    brut = JSON.parse(fs.readFileSync(CHEMIN, 'utf8'));
  } catch (e) {
    throw new Error(`data/${NOM} est illisible : ${e.message}`);
  }
  if (!Array.isArray(brut)) throw new Error(`data/${NOM} doit contenir un tableau de numéros.`);
  if (!brut.length) throw new Error(`data/${NOM} est vide : au moins un document doit y figurer.`);
  const mauvais = brut.filter((n) => !Number.isInteger(n) || n < 1);
  if (mauvais.length) throw new Error(`data/${NOM} : « ${mauvais[0]} » n'est pas un numéro de document.`);
  const vus = new Set();
  for (const n of brut) {
    if (vus.has(n)) throw new Error(`data/${NOM} : le document ${n} y figure deux fois.`);
    vus.add(n);
  }
  return [...brut].sort((a, b) => a - b);
}

/** Le numéro du dernier document appliqué : le maximum de la liste. */
function dernier() {
  const liste = lire();
  return liste[liste.length - 1];
}

/** Allonge la liste. Un numéro qui recule ou stagne est un bogue, jamais une intention. */
function ajouter(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`« ${n} » n'est pas un numéro de document.`);
  const liste = lire();
  const max = liste[liste.length - 1];
  if (n <= max) {
    throw new Error(`document ${n} : le dernier appliqué est déjà le ${max}. Un numéro qui recule ou stagne est un bogue.`);
  }
  const suite = [...liste, n];
  fs.writeFileSync(CHEMIN, JSON.stringify(suite, null, 2) + '\n', 'utf8');
  return suite;
}

module.exports = { NOM, CHEMIN, lire, dernier, ajouter };
