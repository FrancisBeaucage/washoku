'use strict';
/* La table des fichiers de /data. Une seule liste, lue par la génération et
   par la validation — pour qu'aucune des deux ne puisse en oublier un.

   CE QUI A CHANGÉ AU DOCUMENT 20. Jusqu'ici, les données vivaient DANS les
   pages, en tableaux JavaScript, et /data en était l'image ; `generer.js`
   redescendait /data vers les pages et vérifiait l'aller-retour. Les pages ne
   portent plus de données : elles les LISENT. Le sens de la flèche est donc
   devenu unique — /data fait foi, les pages sont une sortie régénérable — et
   les champs de réinjection (`page`, `bloc`, `entete`…) ont disparu.

   Ce qui RESTE de l'ancien dispositif est le `mapper` et sa déclaration de
   champs hors page. Il ne sert plus à écrire une page, mais l'aller-retour
   `versEntree → versJson` reste le seul contrôle qui prouve que le schéma
   compact d'une fiche est TOTAL : tout champ que le couple ne sait pas rendre
   est un champ que rien ne protège. C'est la règle 20, et elle a déjà rattrapé
   trois pertes silencieuses. */

const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');

/* L'adresse publique du site. Un agent extérieur ne peut récupérer qu'une
   adresse qu'on lui a donnée : une adresse qu'il déduit lui-même, même juste,
   est refusée. Le manifeste doit donc porter des adresses complètes, pas des
   noms de fichiers. Le domaine ne vit qu'ici — un déménagement se corrige à un
   seul endroit, et la règle 16 vérifie que le manifeste s'y conforme. */
const BASE_URL = 'https://francisbeaucage.github.io/washoku';
const DATA = path.join(RACINE, 'data');

/* Les fichiers dont les entrées passent par un mapper : ce sont les seuls que
   la règle 20 peut contrôler, parce que ce sont les seuls à avoir une forme
   compacte de référence. */
const SOURCES = [
  {
    cle: 'guide-2-fiches',
    description: 'Techniques et recettes du guide 2',
    mapper: require('./fiches'),
    /* Champs qui vivent dans /data seulement. Ils étaient déclarés ici parce
       qu'une réextraction depuis la page les aurait écrasés ; ils y restent
       parce que la règle 20 s'en sert pour distinguer « champ que le mapper ne
       rend pas, et c'est voulu » de « champ que le mapper perd ».

       `slug` N'Y EST PAS, volontairement : il se calcule depuis `fr`, donc la
       règle 20 vérifie qu'il vaut toujours `limace(fr)` au lieu de le laisser
       dériver en silence.

       Un chemin déclaré couvre aussi ses descendants : `etoiles` couvre
       `etoiles.francis`, dont le nom dépend du lecteur et ne peut pas se
       déclarer d'avance. */
    champs_hors_page: [
      'nutrition.source', 'nutrition.variable', 'nutrition.note', 'voir_aussi',
      /* `lipides_g` et `sodium_mg` sont entrés au document 19 et sont restés
         `null` sur les 79 premières fiches : le trou ne se voyait donc pas.
         Les techniques du document 21 les remplissent, et la règle 20 l'a
         signalé au premier essai — c'est exactement pour ça qu'elle existe. */
      'nutrition.lipides_g', 'nutrition.sodium_mg',
      'type_de_plat', 'methode', 'axe_gout', 'axe_texture', 'moment',
      'langue_origine',
      'etoiles', 'cout_travail', 'statut_perso', 'motif_statut', 'pour_la_maison',
      'ajustement',
      /* L'auteur, la licence et la page du fichier de la photo — S36 du
         document 33. Le gabarit rend un `<figcaption>` sous l'image quand le
         champ est rempli ; la page n'a jamais porté cette information, donc le
         mapper ne peut pas la relire. Un chemin déclaré couvre ses descendants,
         donc les trois clés tiennent en une ligne. */
      'photo_credit',
    ],
    champs_reconstitues: ['commentaire_source'],
  },
  {
    cle: 'guide-3-ingredients',
    description: 'Fiches d’ingrédients du guide 3',
    mapper: require('./ingredients'),
    champs_hors_page: ['description_visuelle', 'zone_magasin', 'nutrition', 'langue_origine'],
    // `id` est la limace calculée depuis `fr`, pas une donnée relue.
    champs_reconstitues: ['commentaire_source', 'id'],
  },
  {
    cle: 'guide-4-exercices',
    description: 'Exercices du guide 4',
    mapper: require('./exercices'),
    champs_reconstitues: ['commentaire_source'],
  },
];

/* Les fichiers de prose : des listes de BLOCS plutôt que du HTML, pour qu'un
   document de mise à jour puisse corriger un paragraphe sans toucher à du
   balisage. Les pages les rendent côté client — voir `lib/vue.js`, et la règle
   22 qui compare les deux rendus. */
const PROSES = [
  { cle: 'guide-1-manger', description: 'Les 22 sections du guide 1', compte: (d) => ({ nb_entrees: d.length, nb_actives: d.filter((s) => s.statut !== 'retiré').length }) },
  /* Les guides 3 et 4 portaient eux aussi de la prose sans fichier de données,
     à côté de leur tableau de fiches — huit sections chacun, que le diagnostic
     du document 20 avait manquées et qu'une redirection aurait effacées. Elles
     ont leur propre fichier plutôt que de rejoindre celui du guide 1 : les trois
     guides numérotent leurs sections `s1`, `s2`… et les fusionner créerait des
     collisions d'identifiants, donc des ancres qui aboutissent au mauvais
     endroit sans lever d'erreur. */
  { cle: 'guide-3-sections', description: 'Les sections de prose du guide 3 : comment faire l’épicerie', compte: (d) => ({ nb_entrees: d.length, nb_actives: d.filter((s) => s.statut !== 'retiré').length }) },
  { cle: 'guide-4-sections', description: 'Les sections de prose du guide 4 : la marche, les formats, la progression', compte: (d) => ({ nb_entrees: d.length, nb_actives: d.filter((s) => s.statut !== 'retiré').length }) },
  { cle: 'guide-6-journal', description: 'Entrées du journal du guide 6', compte: (d) => ({ nb_entrees: d.length, nb_actives: d.filter((e) => e.statut !== 'retiré').length }) },
  { cle: 'guide-2-annexes', description: 'Annexes du guide 2 : lexique, yakumi, dépannage, thé, équipement', compte: (d) => ({ nb_entrees: Object.keys(d).length, nb_actives: Object.keys(d).length }) },
  { cle: 'guide-5-plan', description: 'Cibles chiffrées et sections du guide 5', compte: (d) => ({ nb_entrees: d.sections.length, nb_actives: d.sections.length }) },
];

/* Les fichiers qui ne portent ni mapper ni prose : des tables et des faits.

   `inventaire.json` en a été retiré au document 14 : un stock de denrées change
   plusieurs fois par jour, et le circuit document → génération → déploiement →
   cache le rend périmé avant d'être visible. Ne pas le recréer ici — voir la
   section « L'historique » de data/LISEZMOI.md. */
const DONNEES_SEULES = [
  { cle: 'historique-repas', description: 'Ce qui a été mangé, un enregistrement par repas' },
  { cle: 'documents-appliques', description: 'Numéros des documents de mise à jour déjà appliqués ; le manifeste en tire dernier_document_applique' },
  { cle: 'rayons', description: 'Les rayons du guide 3 : la clé de la valeur fermée `section`, et son libellé en page' },
  { cle: 'zones-exercices', description: 'Les zones du corps du guide 4 : la clé de la valeur fermée `zone`, et son libellé en page' },
];

module.exports = { SOURCES, PROSES, DONNEES_SEULES, RACINE, DATA, BASE_URL };
