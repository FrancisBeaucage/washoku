'use strict';
/* Les champs qui n'acceptent qu'une valeur d'une liste connue. Une seule table,
   lue par trois consommateurs :

   — la règle 19, qui refuse toute valeur hors de l'ensemble ;
   — `generer.js`, qui publie ces ensembles dans le manifeste ;
   — un rédacteur de document de mise à jour, qui peut désormais les lire par
     `curl` au lieu de les écrire de mémoire.

   Ce dernier point est la raison d'être du bloc publié. Trois fautes du
   document 14 avaient la même cause — `retire` écrit sans accent, `rate` réputé
   absent alors qu'il était déjà là, un total d'historique faux : l'agent qui
   rédige ne voit pas `lib/champs.js`, et personne ne peut vérifier une valeur
   qu'il n'a aucun moyen de consulter.

   Les ensembles se lisent LÀ OÙ ILS SONT DÉJÀ DÉFINIS, jamais recopiés ici :
   les libellés de `champs.js`, le tableau `SECS` de la page du guide 3.
   Recopier créerait une seconde source de vérité et déplacerait le problème au
   lieu de le régler. */

const fs = require('fs');
const path = require('path');
const { DATA } = require('./sources');
const C = require('./champs');
const { CATEGORIES, CUISINES, VITESSES } = C;

/* Les clés de rayon du guide 3. Elles se lisaient dans le tableau `SECS` de la
   page du guide 3 ; le document 20 fait de cette page une redirection, donc la
   table est passée dans `data/rayons.json`, d'où la lisent maintenant la règle
   19 ET la page des ingrédients. Le principe n'a pas changé : les ensembles se
   lisent là où ils sont définis, jamais recopiés ici. */
function clesSecs() {
  return JSON.parse(fs.readFileSync(path.join(DATA, 'rayons.json'), 'utf8')).map((s) => s.k);
}

/* Les zones du corps du guide 4, même histoire : la table vivait dans la page,
   elle est passée dans `data/zones-exercices.json`. Le champ `zone` n'était
   contrôlé par RIEN jusqu'ici — une valeur inconnue laissait simplement
   l'exercice hors de tout filtre, avec une étiquette vide, sans qu'aucun test
   n'échoue. C'est exactement la faute que la règle 19 existe pour attraper, et
   elle passait à côté d'un champ sur onze. */
function clesZones() {
  return JSON.parse(fs.readFileSync(path.join(DATA, 'zones-exercices.json'), 'utf8'))
    .map((z) => z.k).filter((k) => k !== 'tous');
}

/* `retiré` PORTE SON ACCENT : c'est la valeur que `generer.js` et `sources.js`
   comparent pour écarter une entrée de la page. Un `retire` sans accent y
   passerait pour une entrée active — il n'est donc pas permis. */
const STATUT = ['actif', 'retiré'];

/* Les trois provenances documentées par le commentaire de `lib/fiches.js` et la
   section « Nutrition » du LISEZMOI. Le champ est partagé depuis le document 19 :
   les fiches du guide 2 sont toutes encore à `estime`, mais les blocs de
   nutrition du guide 3 portent enfin des `etiquette` — huit produits lus le
   18 août 2026, dont les trois qui font le sodium du tom yum. */
const SOURCES_NUTRITION = ['estime', 'etiquette', 'pese'];

/* `journee` a disparu au document 14 : la seule entrée qui l'utilisait agrégeait
   un déjeuner et un dîner sans rapport, et a été scindée en deux. Le champ
   `repas` du guide 6 est un AUTRE champ, sur un autre fichier — voir règle 12. */
const REPAS_HISTORIQUE = ['dejeuner', 'diner', 'souper', 'collation'];

/* Du meilleur au pire. `rate` doit rester utilisable : un historique où l'échec
   ne peut pas s'écrire est un palmarès, pas un historique. */
const VERDICTS = ['excellent', 'bon', 'correct', 'rate', 'rejete'];

/* L'échelle d'étoiles du bloc évaluatif. Cinq niveaux et non trois, et le
   cinquième existe pour une raison précise : le kinpira aux carottes est correct
   ET doit rester disponible comme plat de dépannage ; le sunomono de concombre
   est correct ET ne doit plus revenir. Trois niveaux forcent ces deux plats dans
   la même case. `null` veut dire JAMAIS ESSAYÉ, et ne se confond avec rien. */
const ETOILES = [1, 2, 3, 4, 5];

/**
 * La table complète.
 *
 * — `nul: true` marque un champ où `null` est permis en plus de l'ensemble :
 *   « rien ne le dit » n'est pas la même chose qu'une valeur.
 * — `forme` dit comment la valeur porte l'ensemble. `valeur` (le défaut) : une
 *   valeur unique. `liste` : un tableau de valeurs de l'ensemble, la dominante
 *   en premier. `par-lecteur` : un objet dont les clés sont des lecteurs, parce
 *   que le site en a plus d'un et qu'un plat peut valoir 2 étoiles pour l'un et
 *   5 pour l'autre. Le manifeste publie cette forme à côté de l'ensemble — un
 *   lecteur qui n'a que la liste des valeurs ne peut pas deviner qu'un champ en
 *   accepte plusieurs.
 */
function table() {
  return [
    { fichier: 'guide-2-fiches.json', champ: 'statut', permis: STATUT },
    { fichier: 'guide-2-fiches.json', champ: 'categorie', permis: Object.values(CATEGORIES) },
    { fichier: 'guide-2-fiches.json', champ: 'cuisine', permis: Object.values(CUISINES) },
    { fichier: 'guide-2-fiches.json', champ: 'vitesse', permis: Object.values(VITESSES) },
    { fichier: 'guide-2-fiches.json', champ: 'nutrition.source', permis: SOURCES_NUTRITION },
    /* Le bloc descriptif du document 19 : ce que le plat EST. */
    { fichier: 'guide-2-fiches.json', champ: 'type_de_plat', permis: C.TYPES_DE_PLAT, nul: true },
    { fichier: 'guide-2-fiches.json', champ: 'methode', permis: C.METHODES, forme: 'liste' },
    { fichier: 'guide-2-fiches.json', champ: 'axe_gout', permis: C.AXES_GOUT, forme: 'liste' },
    { fichier: 'guide-2-fiches.json', champ: 'axe_texture', permis: C.AXES_TEXTURE, forme: 'liste' },
    { fichier: 'guide-2-fiches.json', champ: 'moment', permis: C.MOMENTS, forme: 'liste' },
    { fichier: 'guide-2-fiches.json', champ: 'langue_origine', permis: C.LANGUES, nul: true },
    /* Le bloc évaluatif : ce qu'un lecteur EN PENSE. `statut_perso` n'est PAS
       `statut` — la distinction est la plus importante du document 19. `statut`
       juge l'exactitude de la fiche ; `statut_perso` juge le plat, pour un
       lecteur donné. Une fiche parfaitement exacte que Francis n'aime pas reste
       `actif` et devient `ecarte` pour lui. */
    { fichier: 'guide-2-fiches.json', champ: 'etoiles', permis: ETOILES, forme: 'par-lecteur', nul: true },
    { fichier: 'guide-2-fiches.json', champ: 'cout_travail', permis: C.COUTS_TRAVAIL, nul: true },
    { fichier: 'guide-2-fiches.json', champ: 'statut_perso', permis: C.STATUTS_PERSO, forme: 'par-lecteur' },
    { fichier: 'guide-3-ingredients.json', champ: 'statut', permis: STATUT },
    { fichier: 'guide-3-ingredients.json', champ: 'section', permis: clesSecs() },
    { fichier: 'guide-3-ingredients.json', champ: 'langue_origine', permis: C.LANGUES, nul: true },
    { fichier: 'guide-3-ingredients.json', champ: 'zone_magasin', permis: C.ZONES_MAGASIN, nul: true },
    { fichier: 'guide-3-ingredients.json', champ: 'nutrition.base', permis: C.BASES_NUTRITION, nul: true },
    { fichier: 'guide-3-ingredients.json', champ: 'nutrition.source', permis: SOURCES_NUTRITION, nul: true },
    { fichier: 'guide-4-exercices.json', champ: 'statut', permis: STATUT },
    { fichier: 'guide-4-exercices.json', champ: 'zone', permis: clesZones() },
    { fichier: 'historique-repas.json', champ: 'repas', permis: REPAS_HISTORIQUE },
    { fichier: 'historique-repas.json', champ: 'verdict', permis: VERDICTS, nul: true },
  ];
}

/**
 * La même table en arbre `fichier → champ → valeurs`, telle qu'elle se publie
 * au manifeste. Un `null` en queue de liste dit que le champ l'accepte aussi ;
 * JSON sait l'exprimer, donc le lecteur n'a pas de convention à deviner.
 */
function parFichier() {
  const arbre = {};
  for (const t of table()) {
    arbre[t.fichier] = arbre[t.fichier] || {};
    arbre[t.fichier][t.champ] = t.nul ? [...t.permis, null] : [...t.permis];
  }
  return arbre;
}

/**
 * La forme de chaque champ fermé, publiée à côté des ensembles. Sans elle, un
 * rédacteur qui lit `"methode": ["cru", "blanchi", …]` n'a aucun moyen de savoir
 * que le champ prend un TABLEAU de ces valeurs et non une seule — c'est
 * exactement la classe de faute que le bloc publié existe pour empêcher.
 */
function formesParFichier() {
  const arbre = {};
  for (const t of table()) {
    arbre[t.fichier] = arbre[t.fichier] || {};
    arbre[t.fichier][t.champ] = t.forme || 'valeur';
  }
  return arbre;
}

const NOTE_FORMES = "Comment chaque champ porte son ensemble. « valeur » : une seule valeur. « liste » : un tableau de valeurs de l’ensemble, la dominante en premier. « par-lecteur » : un objet dont les clés sont des lecteurs — le site en a plus d’un, et un plat peut valoir 2 étoiles pour l’un et 5 pour l’autre.";

const NOTE = "Les valeurs exactes — accents compris — que ces champs acceptent. Généré depuis la source ; la règle 19 refuse toute autre valeur. Un « null » en fin de liste veut dire que le champ l’accepte aussi. À lire avant d’écrire un document de mise à jour, plutôt que de les citer de mémoire.";

module.exports = { table, parFichier, formesParFichier, clesSecs, clesZones, NOTE, NOTE_FORMES };
