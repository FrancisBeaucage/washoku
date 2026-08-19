#!/usr/bin/env node
'use strict';
/* Extraction unique de la prose qui restait dans les pages des guides 2, 3 et 4.

   POURQUOI CE SCRIPT EXISTE, ET C'EST UNE CORRECTION DU DOCUMENT 20. Le
   document diagnostiquait le guide 1 comme « le seul guide du site qui n'a
   aucun fichier de données derrière lui ». C'était vrai d'un guide entier, et
   faux du reste : le guide 3 portait HUIT sections de prose à côté de son
   tableau d'ingrédients, le guide 4 en portait HUIT, et le guide 2 en avait
   DEUX — « Les mots de cuisine » et « Le montage du bol » — que son fichier
   d'annexes ne contenait pas. Dix-huit sections au total, invisibles au
   diagnostic, et qu'une redirection aurait effacées sans un mot.

   La découverte vient de la règle 23 : un renvoi du guide 5 vers
   `guide-3-supermarche.html#poudres` ne résolvait plus, et l'ancre `poudres`
   n'était ni une fiche ni un ingrédient — c'était une section de prose.

   À N'EXÉCUTER QU'UNE FOIS, sur les pages d'avant la refonte. L'extraction est
   mécanique et vérifiée au caractère près, section par section. */

const fs = require('fs');
const path = require('path');
const { DATA } = require('./lib/sources');
const PP = require('./lib/prose-page');

const source = process.argv[2];
if (!source) {
  console.error('usage : node tools/extraire-prose.js <dossier des anciennes pages>');
  process.exit(1);
}
const lire = (nom) => fs.readFileSync(path.join(source, nom), 'utf8');

/* Les groupes de prose des guides 3 et 4. Ils tiennent dans leur propre fichier
   plutôt que dans celui du guide 1, parce que les trois guides numérotent leurs
   sections `s1`, `s2`… et que les fusionner créerait des collisions
   d'identifiants — donc des ancres qui aboutissent au mauvais endroit sans
   lever d'erreur. */
const GUIDES = [
  {
    cle: 'guide-3-sections', page: 'guide-3-supermarche.html',
    motifId: /^(s\d+|poudres)$/,
    titre: 'Le supermarché',
  },
  {
    cle: 'guide-4-sections', page: 'guide-4-bouger.html',
    motifId: /^s\d+$/,
    titre: 'Bouger',
  },
];

for (const g of GUIDES) {
  const sections = PP.extraire(lire(g.page), { motifId: g.motifId });
  const cible = path.join(DATA, `${g.cle}.json`);
  fs.writeFileSync(cible, JSON.stringify(sections, null, 2) + '\n', 'utf8');
  console.log(`${g.cle}.json — ${sections.length} sections (aller-retour exact)`);
  for (const s of sections) console.log(`  ${s.id.padEnd(10)} ${s.titre}`);
}

/* Les deux sections du guide 2 rejoignent le fichier d'annexes, où elles
   auraient dû être depuis le document 8 : ce sont des annexes du recueil, au
   même titre que le lexique et les yakumi. Leur bannière donne le titre et le
   japonais ; leur corps voyage tel quel. */
const ANNEXES_MANQUANTES = [
  { id: 'lexique-cuisine', numero: '02b', jp: '調理', jp_infobulle: 'chōri — « tchô-ri » · la cuisine, la préparation' },
  { id: 'montage', numero: '02c', jp: '盛り付け', jp_infobulle: "moritsuke — « mo-ri-tsou-ké » · le dressage, le montage de l'assiette" },
];

const cheminAnnexes = path.join(DATA, 'guide-2-annexes.json');
const annexes = JSON.parse(fs.readFileSync(cheminAnnexes, 'utf8'));
const extraites = PP.extraire(lire('guide-2-recettes.html'), { motifId: /^(montage|lexique-cuisine)$/ });

for (const meta of ANNEXES_MANQUANTES) {
  if (annexes[meta.id]) { console.log(`${meta.id} : déjà dans les annexes, laissée telle quelle`); continue; }
  const s = extraites.find((x) => x.id === meta.id);
  if (!s) throw new Error(`${meta.id} : section introuvable dans l'ancienne page`);
  /* Le premier bloc est la bannière (titre + japonais) : elle devient des
     champs, comme pour les cinq autres annexes, au lieu de rester du balisage. */
  const corps = s.corps.slice(1);
  annexes[meta.id] = {
    id: meta.id, numero: meta.numero, titre: s.titre,
    jp_infobulle: meta.jp_infobulle, jp: meta.jp,
    corps, fiches_liees: [],
  };
  console.log(`annexe ${meta.id} — « ${s.titre} », ${corps.length} blocs`);
}

/* L'ordre des clés est l'ordre d'affichage dans la table des matières : les
   deux nouvelles se rangent après le lexique, dont elles sont la suite. */
const ORDRE = ['lexique', 'lexique-cuisine', 'montage', 'yakumi', 'depannage', 'the', 'equipement'];
const range = {};
for (const k of ORDRE) if (annexes[k]) range[k] = annexes[k];
for (const k of Object.keys(annexes)) if (!range[k]) range[k] = annexes[k];

fs.writeFileSync(cheminAnnexes, JSON.stringify(range, null, 2) + '\n', 'utf8');
console.log(`guide-2-annexes.json — ${Object.keys(range).length} annexes : ${Object.keys(range).join(', ')}`);
