'use strict';
/* Table des correspondances entre les tableaux de données des pages et les
   fichiers de /data. Une seule liste, lue par l'extraction, la génération et
   la validation — pour qu'aucune des trois ne puisse en oublier un. */

const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');
const DATA = path.join(RACINE, 'data');

const SOURCES = [
  {
    cle: 'guide-2-fiches',
    page: 'guide-2-recettes.html',
    bloc: 'R',
    description: 'Techniques et recettes du guide 2',
    mapper: require('./fiches'),
    // La page écrivait tantôt `notes:[]`, tantôt rien : les deux formes se
    // rendent pareil. On normalise sur la forme explicite.
    defauts: { notes: [] },
    entete: ['id', 'cui', 'yt', 'ytBy', 'cat', 'jp', 'ro', 'pr', 'fr', 'img', 'por', 'tps', 'prep', 'cook', 'rest', 'spd', 'wait', 'pro', 'cal'],
    groupes: [['sub'], ['ing'], ['steps'], ['notes', 'tech']],
    separateur: '\n',
  },
  {
    cle: 'guide-3-ingredients',
    page: 'guide-3-supermarche.html',
    bloc: 'I',
    description: 'Fiches d’ingrédients du guide 3',
    mapper: require('./ingredients'),
    entete: ['s', 'jp', 'ro', 'pr', 'fr', 'img', 'pack'],
    groupes: [['d'], ['w'], ['l'], ['u'], ['nk', 'n']],
    separateur: '\n',
  },
  {
    cle: 'guide-4-exercices',
    page: 'guide-4-bouger.html',
    bloc: 'E',
    description: 'Exercices du guide 4',
    mapper: require('./exercices'),
    entete: ['n', 'z', 'jp', 'fr', 'en', 'reps'],
    groupes: [['short'], ['why'], ['steps'], ['reg'], ['std'], ['pro'], ['fmt'], ['note']],
    separateur: '\n',
  },
];

module.exports = { SOURCES, RACINE, DATA };
