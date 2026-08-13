#!/usr/bin/env node
'use strict';
/* Marque un document de mise à jour comme appliqué. À lancer une fois son
   contenu en place dans /data, juste avant `npm run generer` : c'est cette
   liste-là que le manifeste reflète, et non une valeur saisie à la main.

   Usage : node tools/appliquer-document.js 11 */

const { ajouter } = require('./lib/documents');

const n = Number(process.argv[2]);
if (!Number.isInteger(n)) {
  console.error('usage : node tools/appliquer-document.js <numéro de document>');
  process.exit(1);
}

try {
  const liste = ajouter(n);
  console.log(`document ${n} ajouté — dernier appliqué : ${liste[liste.length - 1]}`);
  console.log('Lancer `npm run generer` pour que le manifeste le reflète.');
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
