#!/usr/bin/env node
'use strict';
/* Extraction unique du guide 1 : lit la prose encore présente dans
   `guide-1-manger.html` et écrit `data/guide-1-manger.json`.

   À N'EXÉCUTER QU'UNE FOIS, pour amorcer la migration du document 20 (S12) —
   ensuite c'est /data qui fait foi et `generer.js` qui produit les pages. Le
   script refuse d'écraser un fichier existant sans --force, et il refuse tout
   court si la page a déjà été remplacée par sa redirection.

   L'extraction est MÉCANIQUE : le texte de `s13` doit sortir identique, aux
   entités HTML près. `guide1.extraire` lève si l'aller-retour n'est pas exact
   au caractère, section par section — une section mal extraite est un contenu
   perdu qu'on ne remarquera pas. */

const fs = require('fs');
const path = require('path');
const { RACINE, DATA } = require('./lib/sources');
const guide1 = require('./lib/guide1');

const force = process.argv.includes('--force');
const page = path.join(RACINE, 'guide-1-manger.html');
const cible = path.join(DATA, 'guide-1-manger.json');

if (!fs.existsSync(page)) {
  console.error('guide-1-manger.html est absent : rien à extraire.');
  process.exit(1);
}
const html = fs.readFileSync(page, 'utf8');
if (!guide1.decouperSections(html).length) {
  console.error('guide-1-manger.html ne contient plus de sections — c\'est déjà la redirection.');
  console.error('La source est data/guide-1-manger.json. Ne pas réextraire.');
  process.exit(1);
}
if (fs.existsSync(cible) && !force) {
  console.error('data/guide-1-manger.json existe déjà. Relancer avec --force pour l\'écraser.');
  process.exit(1);
}

const sections = guide1.extraire(html);
if (guide1.reinjecter(html, sections) !== html) {
  throw new Error('l\'aller-retour de la page entière n\'est pas exact, extraction refusée');
}

fs.writeFileSync(cible, JSON.stringify(sections, null, 2) + '\n', 'utf8');
const octets = sections.reduce((t, s) => t + JSON.stringify(s.corps).length, 0);
console.log(`guide-1-manger.json — ${sections.length} sections, ${(octets / 1024).toFixed(1)} Ko de prose (aller-retour exact)`);
for (const s of sections) console.log(`  ${s.id.padEnd(4)} ${s.groupe.padEnd(11)} ${s.titre}`);
