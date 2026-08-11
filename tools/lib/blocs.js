'use strict';
/* Repérage et remplacement des blocs de données dans les fichiers HTML.
   Un bloc = `const NOM = [` ... `];` en début de ligne, dans un <script>.
   Le repérage est textuel et volontairement strict : si la forme change, on
   lève plutôt que de deviner. */

const fs = require('fs');

/** Retourne {debut, fin, source} pour `const NOM = [` … `];`. */
function trouverBloc(html, nom) {
  const ouverture = `\nconst ${nom} = [\n`;
  const i = html.indexOf(ouverture);
  if (i === -1) throw new Error(`bloc introuvable : const ${nom} = [`);
  const debutTableau = i + ouverture.length - 1; // sur le \n qui suit le [
  const fermeture = '\n];';
  const j = html.indexOf(fermeture, debutTableau);
  if (j === -1) throw new Error(`fermeture introuvable pour const ${nom}`);
  return {
    debut: i + 1,
    fin: j + fermeture.length,
    source: html.slice(i + 1, j + fermeture.length),
  };
}

/** Évalue le littéral d'un bloc et retourne le tableau JS correspondant. */
function lireBloc(html, nom, portee = {}) {
  const { source } = trouverBloc(html, nom);
  const noms = Object.keys(portee);
  const valeurs = noms.map((k) => portee[k]);
  // eslint-disable-next-line no-new-func
  const f = new Function(...noms, `${source}\nreturn ${nom};`);
  return f(...valeurs);
}

/** Remplace le bloc `const NOM = [...]` par `source`. */
function remplacerBloc(html, nom, source) {
  const { debut, fin } = trouverBloc(html, nom);
  return html.slice(0, debut) + source + html.slice(fin);
}

function lireFichier(p) {
  return fs.readFileSync(p, 'utf8');
}

function ecrireFichier(p, contenu) {
  fs.writeFileSync(p, contenu, 'utf8');
}

/**
 * Découpe la source d'un bloc en entrées, chacune accompagnée des lignes qui
 * la précèdent (commentaires de section, lignes vides). Ces lignes ne sont pas
 * du contenu, mais elles rendent la source lisible : on les conserve telles
 * quelles plutôt que d'essayer de les recalculer.
 */
function decouperEntrees(html, nom) {
  const { source } = trouverBloc(html, nom);
  const lignes = source.split('\n').slice(1, -1); // sans `const X = [` ni `];`
  const prefixes = [];
  let courant = [];
  for (const l of lignes) {
    // null = rien avant l'entrée ; '' = une ligne vide, qu'il faut restituer.
    if (l.startsWith('{')) { prefixes.push(courant.length ? courant.join('\n') : null); courant = []; }
    else if (l.startsWith('//') || l.trim() === '') courant.push(l);
  }
  return prefixes;
}

module.exports = { trouverBloc, lireBloc, remplacerBloc, lireFichier, ecrireFichier, decouperEntrees };
