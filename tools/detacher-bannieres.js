#!/usr/bin/env node
'use strict';
/* Une passe unique sur les trois fichiers de prose : la BANNIÈRE de chaque
   section devient des champs, au lieu de rester un bloc de balisage en tête du
   corps.

   POURQUOI. Dans l'ancienne page, une section était un morceau d'un long
   document : elle portait son propre numéro, son mot japonais, son titre et son
   chapeau, parce que rien d'autre ne les affichait. Une fois la section devenue
   UNE PAGE, la page affiche déjà son titre — et le titre apparaissait deux
   fois, l'un sous l'autre. Ce n'est pas un défaut d'extraction : c'est du
   balisage de mise en page qui a cessé d'en être.

   La bannière est donc découpée en `numero`, `jp`, `jp_infobulle` et `resume`.
   Aucun texte ne se perd : le chapeau devient `resume`, et le titre était déjà
   un champ. Une section dont la bannière ne correspond à aucune des deux formes
   connues est laissée intacte et signalée — mieux vaut un titre en double qu'un
   bout de prose avalé. */

const fs = require('fs');
const path = require('path');
const { DATA } = require('./lib/sources');

const FICHIERS = ['guide-1-manger.json', 'guide-3-sections.json', 'guide-4-sections.json'];

const NUMERO = /<span style="font-weight:800;font-size:40px;color:#ec3013;line-height:1">([^<]*)<\/span>/;
const JP = /<span title="([^"]*)" style="cursor:help;font-family:'Noto Serif JP',serif;font-weight:600;font-size:22px;color:#9b9797">([^<]*)<\/span>/;
const H2 = /<h2[^>]*>([\s\S]*?)<\/h2>/;
const CHAPEAU = /<p style="margin:0;font-size:17px;line-height:1\.65;font-weight:600;align-self:end">([\s\S]*?)<\/p>/;

let total = 0;
const laissees = [];

for (const nom of FICHIERS) {
  const chemin = path.join(DATA, nom);
  const sections = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  for (const s of sections) {
    const tete = s.corps[0];

    /* Forme C : la bannière est la PREMIÈRE COLONNE d'une grille, et le
       chapeau est la seconde. On vide la colonne de bannière ; si elle ne
       contenait que ça, la grille n'a plus de raison d'être et on la déplie. */
    if (tete && tete.type === 'grille' && tete.colonnes.length === 2
        && tete.colonnes[0].blocs[0] && tete.colonnes[0].blocs[0].type === 'html'
        && NUMERO.test(tete.colonnes[0].blocs[0].source)) {
      const banniere = tete.colonnes[0].blocs[0].source;
      const num = banniere.match(NUMERO);
      const jp = banniere.match(JP);
      s.numero = num ? num[1] : null;
      s.jp = jp ? jp[2] : null;
      s.jp_infobulle = jp ? jp[1] : null;
      const gauche = tete.colonnes[0].blocs.slice(1).filter((b) => !(b.type === 'texte' && b.balise === 'h2'));
      const droite = tete.colonnes[1].blocs;
      s.corps.shift();
      s.corps.unshift(...gauche, ...droite);
      total += 1;
      continue;
    }

    if (!tete || tete.type !== 'html' || !(NUMERO.test(tete.source) || JP.test(tete.source))) {
      laissees.push(`${nom} → ${s.id} : pas de bannière reconnue en tête`);
      continue;
    }
    const num = tete.source.match(NUMERO);
    const jp = tete.source.match(JP);
    const chapeau = tete.source.match(CHAPEAU);
    const h2 = tete.source.match(H2);

    /* Ce que la bannière contient EN PLUS du numéro, du japonais, du titre et
       du chapeau serait perdu. On le vérifie plutôt que de l'espérer. */
    const reste = tete.source
      .replace(NUMERO, '').replace(JP, '').replace(H2, '').replace(CHAPEAU, '')
      .replace(/<\/?div[^>]*>|<\/?p[^>]*>|\s+/g, '');
    if (reste) { laissees.push(`${nom} → ${s.id} : la bannière porte autre chose (« ${reste.slice(0, 60)} »), laissée intacte`); continue; }

    s.numero = num ? num[1] : null;
    s.jp = jp ? jp[2] : null;
    s.jp_infobulle = jp ? jp[1] : null;
    if (chapeau) s.resume = chapeau[1];
    if (h2 && !s.titre) s.titre = h2[1].replace(/<[^>]+>/g, '').trim();

    s.corps.shift();
    /* Forme B : le titre et le chapeau sont des blocs séparés APRÈS la
       bannière. Le titre est déjà un champ, le chapeau devient le résumé. */
    if (s.corps[0] && s.corps[0].type === 'texte' && s.corps[0].balise === 'h2') s.corps.shift();
    if (!s.resume && s.corps[0] && s.corps[0].type === 'texte' && s.corps[0].balise === 'p'
        && /font-weight:600/.test(s.corps[0].attrs || '')) {
      s.resume = s.corps.shift().texte;
    }
    total += 1;
  }
  fs.writeFileSync(chemin, JSON.stringify(sections, null, 2) + '\n', 'utf8');
  console.log(`${nom} — ${sections.length} sections`);
}

console.log(`\n${total} bannière(s) détachée(s).`);
if (laissees.length) {
  console.log('\nLaissées intactes, à regarder :');
  for (const l of laissees) console.log(`  ${l}`);
}
