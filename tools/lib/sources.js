'use strict';
/* Table des correspondances entre les tableaux de données des pages et les
   fichiers de /data. Une seule liste, lue par l'extraction, la génération et
   la validation — pour qu'aucune des trois ne puisse en oublier un. */

const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');

/* L'adresse publique du site. Un agent extérieur ne peut récupérer qu'une
   adresse qu'on lui a donnée : une adresse qu'il déduit lui-même, même juste,
   est refusée. Le manifeste doit donc porter des adresses complètes, pas des
   noms de fichiers. Le domaine ne vit qu'ici — un déménagement se corrige à un
   seul endroit, et la règle 16 vérifie que le manifeste s'y conforme. */
const BASE_URL = 'https://francisbeaucage.github.io/washoku';
const DATA = path.join(RACINE, 'data');

const SOURCES = [
  {
    cle: 'guide-2-fiches',
    page: 'guide-2-recettes.html',
    bloc: 'R',
    description: 'Techniques et recettes du guide 2',
    mapper: require('./fiches'),
    // Champs qui vivent dans /data seulement : la page ne les rend pas, donc
    // une réextraction les écraserait. `extraire.js` les recopie depuis le JSON
    // existant plutôt que de les perdre.
    champs_hors_page: ['nutrition.source'],
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
    champs_hors_page: ['description_visuelle', 'zone_magasin'],
    entete: ['s', 'jp', 'ro', 'pr', 'fr', 'img', 'pack'],
    groupes: [['d'], ['w'], ['l'], ['alt'], ['u'], ['nk', 'n']],
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

/* Les sources de prose : des sections de page entières, plutôt que des
   tableaux de données dans un <script>. Le contrat est le même — /data fait
   foi, la page en est le rendu — mais l'aller-retour passe par une liste de
   blocs (voir `prose.js`) au lieu d'un littéral JavaScript.

   Le document 8 demandait du texte brut ; le contenu à migrer était du HTML
   riche — renvois vers les fiches, tableaux, infobulles de prononciation. Les
   blocs préservent les deux : la structure reste lisible hors du navigateur,
   et la page ne perd rien. */
const PROSES = [
  {
    cle: 'guide-6-journal',
    page: 'guide-6-journal.html',
    description: 'Entrées du journal du guide 6',
    mapper: require('./journal'),
    compte: (d) => ({ nb_entrees: d.length, nb_actives: d.filter((e) => e.statut !== 'retiré').length }),
  },
  {
    cle: 'guide-2-annexes',
    page: 'guide-2-recettes.html',
    description: 'Annexes du guide 2 : lexique, yakumi, dépannage, thé',
    mapper: require('./annexes'),
    compte: (d) => ({ nb_entrees: Object.keys(d).length, nb_actives: Object.keys(d).length }),
  },
  {
    cle: 'guide-5-plan',
    page: 'guide-5-plan.html',
    description: 'Cibles chiffrées et sections du guide 5',
    mapper: require('./plan'),
    compte: (d) => ({ nb_entrees: d.sections.length, nb_actives: d.sections.length }),
  },
];

/* Les fichiers qui ne se rendent nulle part : ils vivent dans /data et rien
   d'autre. Ils figurent quand même au manifeste — sinon un agent extérieur ne
   peut pas les atteindre, et la règle 16 le refuse. */
const DONNEES_SEULES = [
  { cle: 'historique-repas', description: 'Ce qui a été mangé, un enregistrement par repas' },
  { cle: 'inventaire', description: 'Ce qui est au congélateur, au frigo et au garde-manger' },
  { cle: 'documents-appliques', description: 'Numéros des documents de mise à jour déjà appliqués ; le manifeste en tire dernier_document_applique' },
];

module.exports = { SOURCES, PROSES, DONNEES_SEULES, RACINE, DATA, BASE_URL };
