'use strict';
/* Extraction générique de la PROSE d'une page en sections de données.

   Le document 20 avait diagnostiqué le guide 1 comme « le seul guide du site
   qui n'a aucun fichier de données derrière lui ». Le diagnostic était juste
   pour un guide entier — et incomplet : les guides 2, 3 et 4 portaient EUX
   AUSSI de la prose sans fichier de données, à côté de leur tableau de fiches.
   Le guide 3 en avait huit sections, le guide 4 huit, le guide 2 deux. Rien ne
   les distinguait à l'œil d'une page purement générée, et les remplacer par
   une redirection les aurait effacées en silence.

   Ce module est donc `guide1.js` rendu générique. Le contrat est le même et il
   est strict : `rendre(analyser(x)) === x` au caractère près, section par
   section. Une section qui ne repasse pas l'aller-retour arrête l'extraction
   plutôt que d'être rafistolée. */

const P = require('./prose');

/**
 * Toutes les `<section id="…">` d'une page, dans l'ordre.
 * @param {RegExp} motifId — quels identifiants retenir (les autres sont du
 *   gabarit : la liste des fiches, le bloc de filtres, la bannière).
 */
function decouper(html, motifId) {
  const re = /\n(\s*)<section id="([\w-]+)"([^>]*)>([\s\S]*?)\n\1<\/section>/g;
  const trouvees = [];
  let m;
  while ((m = re.exec(html))) {
    if (!motifId.test(m[2])) continue;
    trouvees.push({ id: m[2], indent: m[1], attrs: m[3], interieur: m[4], source: m[0] });
  }
  return trouvees;
}

/** Le titre d'une section : son `<h2>`, débarrassé du balisage. */
function titreDe(interieur) {
  const m = interieur.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * La page → ses sections de prose, chacune vérifiée par un aller-retour exact.
 * @param {object} options
 *   - motifId : quels `id` de section retenir
 *   - ignorer : les `id` à laisser à la page (liste de fiches, filtres…)
 *   - indentInterne : l'indentation des blocs de premier niveau
 */
function extraire(html, { motifId = /^[\w-]+$/, ignorer = [], indentInterne = null } = {}) {
  const exclus = new Set(ignorer);
  return decouper(html, motifId)
    .filter((s) => !exclus.has(s.id))
    .map((s) => {
      /* Certaines sections enveloppent leur contenu dans un `<div class="in">` :
         c'est de la mise en page, pas du contenu. On descend dedans pour que le
         corps extrait soit comparable d'une page à l'autre. */
      const enveloppe = s.interieur.match(/^\n(\s*)<div class="in"([^>]*)>([\s\S]*)\n\1<\/div>$/);
      const brut = enveloppe ? enveloppe[3] : s.interieur;
      const indent = indentInterne || `${s.indent}${enveloppe ? '    ' : '  '}`;
      /* La QUEUE — le blanc entre le dernier bloc et la fermeture — se relit
         plutôt que de se supposer. Les sections du guide 3 et du guide 4 ne se
         ferment pas toutes à la même indentation que celles du guide 1, et une
         queue devinée fait échouer un aller-retour qui n'a rien de faux. */
      const { blocs, queue } = P.analyser(brut, indent);
      const rendu = P.rendre(blocs, indent, queue);
      if (rendu !== brut) {
        const i = [...rendu].findIndex((c, k) => c !== brut[k]);
        throw new Error(`${s.id} : aller-retour inexact au caractère ${i} — « ${brut.slice(i, i + 60)} » contre « ${rendu.slice(i, i + 60)} »`);
      }
      return { id: s.id, statut: 'actif', titre: titreDe(brut), resume: null, corps: blocs };
    });
}

module.exports = { decouper, extraire, titreDe };
