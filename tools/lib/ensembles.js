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
const { RACINE } = require('./sources');
const { CATEGORIES, CUISINES, VITESSES } = require('./champs');
const { lireBloc } = require('./blocs');

/** Les clés de rayon du guide 3, lues dans le tableau `SECS` de sa page. */
function clesSecs() {
  const html = fs.readFileSync(path.join(RACINE, 'guide-3-supermarche.html'), 'utf8');
  return lireBloc(html, 'SECS').map((s) => s.k);
}

/* `retiré` PORTE SON ACCENT : c'est la valeur que `generer.js` et `sources.js`
   comparent pour écarter une entrée de la page. Un `retire` sans accent y
   passerait pour une entrée active — il n'est donc pas permis. */
const STATUT = ['actif', 'retiré'];

/* Les trois provenances documentées par le commentaire de `lib/fiches.js` et la
   section « Nutrition » du LISEZMOI. `etiquette` et `pese` ne sont attestées
   dans aucune donnée : elles serviront le jour où `lipides_g` et `sodium_mg`
   seront relevés sur de vraies étiquettes. */
const SOURCES_NUTRITION = ['estime', 'etiquette', 'pese'];

/* `journee` a disparu au document 14 : la seule entrée qui l'utilisait agrégeait
   un déjeuner et un dîner sans rapport, et a été scindée en deux. Le champ
   `repas` du guide 6 est un AUTRE champ, sur un autre fichier — voir règle 12. */
const REPAS_HISTORIQUE = ['dejeuner', 'diner', 'souper', 'collation'];

/* Du meilleur au pire. `rate` doit rester utilisable : un historique où l'échec
   ne peut pas s'écrire est un palmarès, pas un historique. */
const VERDICTS = ['excellent', 'bon', 'correct', 'rate', 'rejete'];

/**
 * La table complète. `nul: true` marque un champ où `null` est permis en plus
 * de l'ensemble — « rien ne le dit » n'est pas la même chose qu'une valeur.
 */
function table() {
  return [
    { fichier: 'guide-2-fiches.json', champ: 'statut', permis: STATUT },
    { fichier: 'guide-2-fiches.json', champ: 'categorie', permis: Object.values(CATEGORIES) },
    { fichier: 'guide-2-fiches.json', champ: 'cuisine', permis: Object.values(CUISINES) },
    { fichier: 'guide-2-fiches.json', champ: 'vitesse', permis: Object.values(VITESSES) },
    { fichier: 'guide-2-fiches.json', champ: 'nutrition.source', permis: SOURCES_NUTRITION },
    { fichier: 'guide-3-ingredients.json', champ: 'statut', permis: STATUT },
    { fichier: 'guide-3-ingredients.json', champ: 'section', permis: clesSecs() },
    { fichier: 'guide-4-exercices.json', champ: 'statut', permis: STATUT },
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

const NOTE = "Les valeurs exactes — accents compris — que ces champs acceptent. Généré depuis la source ; la règle 19 refuse toute autre valeur. Un « null » en fin de liste veut dire que le champ l’accepte aussi. À lire avant d’écrire un document de mise à jour, plutôt que de les citer de mémoire.";

module.exports = { table, parFichier, clesSecs, NOTE };
