'use strict';
/* Repérage des sections de prose dans les pages HTML. Même parti pris que
   `blocs.js` pour les tableaux de données : le repérage est textuel et strict,
   et lève plutôt que de deviner. */

/** Région d'une `<section id="ID">` : { debut, fin, ouverture, interieur }. */
function trouverSection(html, id) {
  const ouverture = new RegExp(`\\n(\\s*)<section id="${id}"([^>]*)>`);
  const m = html.match(ouverture);
  if (!m) throw new Error(`section introuvable : id="${id}"`);
  const debut = m.index + 1;
  const apresOuverture = m.index + m[0].length;
  // Fermeture appariée : on compte les <section> imbriquées.
  const balise = /<section\b[^>]*>|<\/section>/g;
  balise.lastIndex = apresOuverture;
  let profondeur = 1;
  let b;
  while ((b = balise.exec(html))) {
    profondeur += b[0] === '</section>' ? -1 : 1;
    if (profondeur === 0) {
      return {
        debut,
        fin: b.index + b[0].length,
        indent: m[1],
        ouverture: html.slice(debut, apresOuverture),
        interieur: html.slice(apresOuverture, b.index),
        fermeture: b[0],
      };
    }
  }
  throw new Error(`fermeture introuvable pour la section id="${id}"`);
}

/** Remplace l'intérieur d'une section par `interieur`. */
function remplacerSection(html, id, interieur) {
  const s = trouverSection(html, id);
  return html.slice(0, s.debut) + s.ouverture + interieur + s.fermeture + html.slice(s.fin);
}

/**
 * Découpe l'intérieur d'une section en { tete, corps, queue } autour de la
 * première occurrence de `depuis` et de la fin de la dernière occurrence de
 * `jusqua`. Sert à isoler la partie qui devient du contenu, en laissant
 * intacte l'en-tête décorative de la section.
 */
function isoler(interieur, depuis, jusqua) {
  const i = interieur.indexOf(depuis);
  if (i === -1) throw new Error(`marque de début introuvable : ${depuis}`);
  const j = interieur.lastIndexOf(jusqua);
  if (j === -1) throw new Error(`marque de fin introuvable : ${jusqua}`);
  return {
    tete: interieur.slice(0, i),
    corps: interieur.slice(i, j + jusqua.length),
    queue: interieur.slice(j + jusqua.length),
  };
}

module.exports = { trouverSection, remplacerSection, isoler };
