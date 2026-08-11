#!/usr/bin/env node
'use strict';
/* Extraction unique : lit les tableaux de données encore présents dans les
   pages HTML et écrit /data. À n'exécuter qu'une fois, pour amorcer la
   migration — ensuite c'est /data qui fait foi et `generer.js` qui redescend
   vers le HTML. Le script refuse d'écraser /data sans --force. */

const fs = require('fs');
const path = require('path');
const { SOURCES, PROSES, RACINE, DATA } = require('./lib/sources');
const { lireBloc, lireFichier, decouperEntrees } = require('./lib/blocs');
const { limace } = require('./lib/champs');

const force = process.argv.includes('--force');

if (fs.existsSync(DATA) && !force) {
  console.error('/data existe déjà. Relancer avec --force pour le réécrire.');
  process.exit(1);
}
fs.mkdirSync(DATA, { recursive: true });

const compteurs = {};

for (const src of SOURCES) {
  const html = lireFichier(path.join(RACINE, src.page));

  // Le tableau R référence un dictionnaire d'images ; on le fournit au littéral.
  const portee = {};
  if (src.bloc === 'R') {
    const m = html.match(/\nconst IMG = \{[\s\S]*?\n\};/);
    if (!m) throw new Error('dictionnaire IMG introuvable');
    portee.IMG = new Function(`${m[0]}\nreturn IMG;`)();
  }

  const entrees = lireBloc(html, src.bloc, portee);
  const prefixes = decouperEntrees(html, src.bloc);
  if (prefixes.length !== entrees.length) throw new Error(`${src.bloc} : ${prefixes.length} préfixes pour ${entrees.length} entrées`);
  const objets = entrees.map((e, i) => {
    const o = src.mapper.versJson(e);
    if (prefixes[i] !== null) o.commentaire_source = prefixes[i];
    return o;
  });

  if (src.cle === 'guide-3-ingredients') objets.forEach((o) => { o.id = limace(o.fr); });

  fs.writeFileSync(
    path.join(DATA, `${src.cle}.json`),
    JSON.stringify(objets, null, 2) + '\n',
    'utf8'
  );
  compteurs[src.cle] = objets.length;
  console.log(`${src.cle}.json — ${objets.length} entrées`);
}

/* Les sources de prose : sections de page entières, extraites en blocs.
   L'aller-retour est vérifié tout de suite — une extraction qui ne saurait pas
   revenir en arrière est une perte de contenu déguisée. */
for (const src of PROSES) {
  const html = lireFichier(path.join(RACINE, src.page));
  const donnees = src.mapper.extraire(html);
  const retour = src.mapper.reinjecter(html, src.mapper.partieRendue(donnees));
  if (retour !== html) throw new Error(`${src.cle} : l'aller-retour n'est pas exact, extraction refusée`);

  fs.writeFileSync(path.join(DATA, `${src.cle}.json`), JSON.stringify(donnees, null, 2) + '\n', 'utf8');
  const { nb_entrees } = src.compte(donnees);
  compteurs[src.cle] = nb_entrees;
  console.log(`${src.cle}.json — ${nb_entrees} entrées (aller-retour exact)`);
}

fs.writeFileSync(path.join(DATA, '.compteurs-extraction.json'), JSON.stringify(compteurs, null, 2) + '\n', 'utf8');
console.log('\nExtraction terminée. Vérifier avec `node tools/generer.js --verifier`.');
