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
    /* Champs qui vivent dans /data seulement : la page ne les rend pas, donc
       une réextraction les écraserait. `extraire.js` les recopie depuis le JSON
       existant plutôt que de les perdre, et la RÈGLE 20 refuse qu'un champ de
       ce genre reste non déclaré.

       Trois d'entre eux ont été ajoutés au document 16, après que `variable` a
       été signalé : `versJson` le recalcule depuis `/variable/i.test(pro)`, ce
       qui aurait remis R64 et T9 à `false` sans que rien ne le dise. Le même
       trou avalait `voir_aussi` — que `versJson` rend toujours vide — et la
       `note` de nutrition, qu'il réécrit avec sa phrase par défaut.

       Le document 19 en ajoute onze : les cinq champs du bloc évaluatif, les
       cinq du bloc descriptif que la page ne filtre pas encore, et
       `langue_origine`. Ils sont déclarés d'avance parce que le document 20 les
       remplira, et qu'un champ rempli sans être déclaré ici est un champ
       condamné à disparaître à la prochaine réextraction.

       `slug` N'Y EST PAS, volontairement : il se calcule depuis `fr`, donc la
       règle 20 vérifie qu'il vaut toujours `limace(fr)` au lieu de le laisser
       dériver en silence.

       Un chemin déclaré couvre aussi ses descendants : `etoiles` couvre
       `etoiles.francis`, dont le nom dépend du lecteur et ne peut pas se
       déclarer d'avance. */
    champs_hors_page: [
      'nutrition.source', 'nutrition.variable', 'nutrition.note', 'voir_aussi',
      'type_de_plat', 'methode', 'axe_gout', 'axe_texture', 'moment',
      'langue_origine',
      'etoiles', 'cout_travail', 'statut_perso', 'motif_statut', 'pour_la_maison',
      'ajustement',
    ],
    /* Champs qu'aucune des deux directions du mapper ne porte, mais que
       `extraire.js` reconstitue autrement — ici depuis les lignes qui précèdent
       l'entrée dans le fichier généré (`decouperEntrees`). Ils ne se perdent
       pas ; ils ne passent simplement pas par le mapper. */
    champs_reconstitues: ['commentaire_source'],
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
    /* `nutrition` entre au document 19 (S5). Le bloc entier vit dans /data : la
       page du guide 3 ne le rend pas — elle sert à trouver un produit en rayon,
       pas à calculer un repas — et c'est un agent de planification qui le lit,
       par le manifeste. Déclarer `nutrition` couvre ses onze sous-champs. */
    champs_hors_page: ['description_visuelle', 'zone_magasin', 'nutrition', 'langue_origine'],
    // `id` est la limace calculée depuis `fr` par l'extraction, pas une donnée
    // relue de la page.
    champs_reconstitues: ['commentaire_source', 'id'],
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
    champs_reconstitues: ['commentaire_source'],
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
    description: 'Annexes du guide 2 : lexique, yakumi, dépannage, thé, équipement',
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
   peut pas les atteindre, et la règle 16 le refuse.

   `inventaire.json` en a été retiré au document 14 : un stock de denrées change
   plusieurs fois par jour, et le circuit document → génération → déploiement →
   cache le rend périmé avant d'être visible. Ne pas le recréer ici — voir la
   section « L'historique » de data/LISEZMOI.md. */
const DONNEES_SEULES = [
  { cle: 'historique-repas', description: 'Ce qui a été mangé, un enregistrement par repas' },
  { cle: 'documents-appliques', description: 'Numéros des documents de mise à jour déjà appliqués ; le manifeste en tire dernier_document_applique' },
];

module.exports = { SOURCES, PROSES, DONNEES_SEULES, RACINE, DATA, BASE_URL };
