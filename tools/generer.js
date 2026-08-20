#!/usr/bin/env node
'use strict';
/* Génération. /data fait foi ; les pages HTML en sont le rendu, et depuis le
   document 20 elles sont ÉCRITES EN ENTIER par ce script.

   Avant, les données vivaient dans les pages et ce script les y réinjectait en
   vérifiant l'aller-retour. Sept pages servaient 971 Ko de HTML, dont une de
   297 Ko qui portait les 79 fiches en ligne. Maintenant, chaque page est une
   coquille de quelques kilo-octets qui va chercher son contenu dans /data au
   chargement — donc un compteur affiché ne peut plus périmer, puisqu'il n'est
   plus écrit nulle part.

   Avec --verifier, rien n'est écrit : le script compare ce qu'il produirait à
   ce qui est sur le disque et signale tout écart. C'est ce que la validation
   lance avant de dire que le dépôt est propre. */

const fs = require('fs');
const path = require('path');
const { SOURCES, PROSES, DONNEES_SEULES, RACINE, DATA, BASE_URL } = require('./lib/sources');
const documents = require('./lib/documents');
const ensembles = require('./lib/ensembles');
const pages = require('./lib/pages');
const { minutes, vitesse, LECTEUR } = require('./lib/champs');

const verifier = process.argv.includes('--verifier');

/* Le numéro du dernier document appliqué se dérive du dépôt, jamais d'une
   valeur recopiée ici : c'est le principe général du manifeste, et c'était le
   dernier compteur à y échapper. */
let dernierDocumentApplique;
try {
  dernierDocumentApplique = documents.dernier();
} catch (e) {
  console.error(`✗ ${e.message}`);
  console.error('Rien n’a été écrit. Voir tools/appliquer-document.js.');
  process.exit(1);
}

const adresse = (nom) => `${BASE_URL}/data/${nom}`;
const lireJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const lireData = (nom) => lireJson(path.join(DATA, nom));

let ecarts = 0;

/** Écrit un fichier, ou compare son contenu attendu, selon `--verifier`. */
function poser(chemin, contenu, etiquette) {
  const existe = fs.existsSync(chemin);
  const actuel = existe ? fs.readFileSync(chemin, 'utf8') : null;
  if (actuel === contenu) return 'inchangé';
  if (verifier) {
    ecarts += 1;
    console.error(`✗ ${etiquette} : ${existe ? 'diffère de ce que /data produit' : 'absent'}`);
    return 'écart';
  }
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, contenu, 'utf8');
  return existe ? 'réécrit' : 'créé';
}

/* ── Les vues de données : une fiche par fichier, et l'index compact ──── */

const toutesLesFiches = lireData('guide-2-fiches.json');
const DOSSIER_FICHES = path.join(DATA, 'fiches');

/** T avant R, puis par numéro, puis par suffixe : T1 … T7a, T7b, T8, R1 … */
function rang(id) {
  const m = id.match(/^([TR])(\d+)(.*)$/);
  if (!m) throw new Error(`identifiant de fiche inattendu : ${id}`);
  return [m[1] === 'T' ? 0 : 1, Number(m[2]), m[3]];
}
const triees = [...toutesLesFiches].sort((a, b) => {
  const [x, y] = [rang(a.id), rang(b.id)];
  return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]);
});

/* L'INDEX PORTE LES CHAMPS FILTRABLES, ET SEULEMENT EUX. C'est le budget de la
   page de liste : elle le charge en entier pour rendre ses cartes, donc tout ce
   qui y entre se paie à chaque ouverture. Pas d'étapes, pas de notes, pas
   d'ingrédients — ceux-là vivent dans `fiches/<ID>.json`, qu'on ne charge que
   pour la fiche qu'on ouvre.

   Trois champs ne sont pas des filtres et y figurent quand même, parce que la
   CARTE en a besoin et que les faire chercher fiche par fiche coûterait cent
   requêtes : `photo`, `temps_affiche`, et `a_ajustement` — un booléen, jamais
   le texte de l'ajustement. */
/* Une clé ABSENTE veut dire « rien ne le dit » — la même convention que
   partout ailleurs dans /data, où les champs de présentation vides ne
   s'écrivent pas. Sur un fichier qui a un plafond de taille et que chaque
   ouverture de la liste paie, `"etoiles":{},"statut_perso":{},"cout_travail":
   null,"a_ajustement":false` sur cent quatre-vingts fiches, c'est douze
   kilo-octets qui ne disent rien. `id`, `fr` et `statut` ne s'omettent jamais :
   ils identifient l'entrée. */
const TOUJOURS = new Set(['id', 'fr', 'statut']);
/** Le temps écoulé d'une fiche, bornes hautes comprises. Sert au total ET à `vitesse`. */
const total = (f) => minutes(f.temps_minutes.preparation) + minutes(f.temps_minutes.cuisson) + minutes(f.temps_minutes.attente);
const vide = (v) => v == null || v === '' || v === false
  || (Array.isArray(v) && !v.length)
  || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
const sansVides = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => TOUJOURS.has(k) || !vide(v)));

const index = triees.map((f) => sansVides({
  id: f.id,
  slug: f.slug,
  fr: f.fr,
  romaji: f.romaji,
  jp: f.jp,
  nom_origine: f.nom_origine,
  lecture_origine: f.lecture_origine,
  statut: f.statut,
  categorie: f.categorie,
  type_de_plat: f.type_de_plat,
  moment: f.moment,
  methode: f.methode,
  axe_gout: f.axe_gout,
  axe_texture: f.axe_texture,
  cuisine: f.cuisine,
  registre: f.registre,
  bol_de_riz: f.bol_de_riz,
  /* Le total en minutes, borne HAUTE : un temps peut être une fourchette quand
     une fiche porte deux méthodes de cuisson. L'index sert à choisir un plat
     pour un soir donné — c'est la borne haute qui décide si on a le temps. */
  temps_minutes: total(f),
  /* 🔴 `vitesse` EST DÉRIVÉE DEPUIS LE DOCUMENT 34, elle n'est plus un champ de
     la fiche. Elle a été écrite à la main jusque-là et avait dérivé sur un quart
     du corpus : un plat `rapide` à cinquante minutes et un plat `moyen` à seize
     coexistaient dans le recueil. Un champ dérivable écrit à la main dérive —
     c'est le même raisonnement que `temps_actif` juste en dessous, et que le
     `slug`, qui vaut `limace(fr)` et que la règle 20 vérifie au lieu de le
     laisser vivre sa vie.

     Elle vit dans l'INDEX et non dans la fiche, parce que c'est l'index qui la
     consomme : elle est une clé de filtre de la page de liste, et la page de
     fiche ne l'affiche pas. Les seuils sont dans `lib/champs.js`, en un seul
     endroit, avec la raison de leur choix. */
  vitesse: vitesse(total(f)),
  /* LE TEMPS DE PRÉSENCE, quand il est plus court que le temps total. C'est le
     S35 du document 31 : `vitesse` mesure le temps ÉCOULÉ, et c'est le bon
     choix — une soupe d'une heure quarante-cinq ne s'insère pas dans un mardi
     soir, même si elle ne demande que vingt minutes de présence. Mais un plat à
     vingt minutes de travail et un plat à quatre-vingt-dix se ressemblaient sur
     une carte, et le débrief du 18 août 2026 l'avait dit en toutes lettres : le
     nombre de gestes et le temps de présence décident pour qui cuisine avec des
     interruptions.

     Il se DÉRIVE, il n'est pas un champ de plus : `préparation + cuisson`, donc
     le total moins l'attente. La clé n'est écrite que lorsqu'elle apprend
     quelque chose — sans attente, elle vaudrait le total et ne dirait rien. */
  temps_actif: minutes(f.temps_minutes.attente)
    ? minutes(f.temps_minutes.preparation) + minutes(f.temps_minutes.cuisson)
    : null,
  temps_affiche: f.temps_affiche,
  proteines_g: f.nutrition.proteines_g,
  calories: f.nutrition.calories,
  /* L'index ne porte que l'avis DU LECTEUR COURANT, pas l'objet complet : un
     objet par lecteur n'a rien à faire dans un fichier dont le budget est
     compté, et la page n'en afficherait qu'une valeur de toute façon. La fiche
     seule, elle, garde l'objet entier — c'est là qu'est la donnée. */
  etoiles: f.etoiles && f.etoiles[LECTEUR] != null ? f.etoiles[LECTEUR] : null,
  cout_travail: f.cout_travail,
  statut_perso: f.statut_perso ? f.statut_perso[LECTEUR] || null : null,
  a_ajustement: !!f.ajustement,
  photo: f.photo,
  /* L'ADRESSE DE LA FICHE N'EST PLUS RECOPIÉE ICI. Elle l'était pour qu'un
     agent extérieur n'ait jamais à déduire une adresse — le principe tient
     toujours, mais soixante-dix octets par entrée pour une chaîne qui ne varie
     que par l'identifiant, c'est douze kilo-octets sur cent quatre-vingts
     fiches. Le manifeste publie le PATRON, `fiches/<ID>.json`, avec l'adresse
     du dossier : rien à deviner, et le protocole de lecture le dit. */
}));

/* Une entrée par LIGNE plutôt qu'un objet indenté : le fichier reste lisible en
   diff — une fiche modifiée = une ligne modifiée — et il pèse la moitié. Sur un
   index qui a un plafond de taille, l'indentation est un coût sans contrepartie. */
const indexTexte = `[\n${index.map((e) => JSON.stringify(e)).join(',\n')}\n]\n`;

/* ── L'écriture ───────────────────────────────────────────────────────── */

const fichiers = [];
const compteurs = {
  techniques: toutesLesFiches.filter((f) => f.statut !== 'retiré' && f.id.startsWith('T')).length,
  recettes: toutesLesFiches.filter((f) => f.statut !== 'retiré' && f.id.startsWith('R')).length,
  fiches_actives: toutesLesFiches.filter((f) => f.statut !== 'retiré').length,
  fiches_retirees: toutesLesFiches.filter((f) => f.statut === 'retiré').length,
};

/* Le manifeste doit lister TOUT /data : un fichier absent de la liste est une
   porte fermée pour un agent extérieur, qui ne peut récupérer qu'une adresse
   qu'on lui a donnée. La règle 16 le vérifie. */
for (const src of [...SOURCES, ...PROSES, ...DONNEES_SEULES]) {
  const chemin = path.join(DATA, `${src.cle}.json`);
  const donnees = fs.existsSync(chemin) ? lireJson(chemin) : [];
  const { nb_entrees, nb_actives } = src.compte
    ? src.compte(donnees)
    : Array.isArray(donnees)
      ? { nb_entrees: donnees.length, nb_actives: donnees.filter((o) => o.statut !== 'retiré').length }
      : { nb_entrees: Object.keys(donnees).length, nb_actives: Object.keys(donnees).length };
  fichiers.push({ nom: `${src.cle}.json`, url: adresse(`${src.cle}.json`), description: src.description, nb_entrees, nb_actives });
  console.log(`lu      data/${src.cle}.json — ${nb_actives} entrée(s) active(s)`);
}

/* La même donnée écrite deux fois de plus par le même script — aucun risque de
   divergence, et la règle 15 le vérifie. Ça évite de charger 360 Ko pour lire
   trois recettes. */
if (!verifier) fs.mkdirSync(DOSSIER_FICHES, { recursive: true });
for (const f of toutesLesFiches) {
  poser(path.join(DOSSIER_FICHES, `${f.id}.json`), JSON.stringify(f, null, 2) + '\n', `data/fiches/${f.id}.json`);
}
if (!verifier && fs.existsSync(DOSSIER_FICHES)) {
  // Le dossier est une sortie générée : ce qui ne correspond plus à une fiche s'en va.
  const attendus = new Set(toutesLesFiches.map((f) => `${f.id}.json`));
  for (const nom of fs.readdirSync(DOSSIER_FICHES)) {
    if (nom.endsWith('.json') && !attendus.has(nom)) {
      fs.unlinkSync(path.join(DOSSIER_FICHES, nom));
      console.log(`retiré  data/fiches/${nom} — plus aucune fiche de ce nom`);
    }
  }
}
poser(path.join(DATA, 'index.json'), indexTexte, 'data/index.json');
console.log(`${verifier ? 'vérifié' : 'écrit  '} data/index.json et data/fiches/ — ${index.length} fiches, index ${(Buffer.byteLength(indexTexte) / 1024).toFixed(1)} Ko`);

fichiers.push({
  nom: 'index.json',
  url: adresse('index.json'),
  description: 'Index compact des fiches : de quoi choisir, filtrer et rendre une carte, sans charger le recueil',
  nb_entrees: index.length,
  nb_actives: index.filter((f) => f.statut !== 'retiré').length,
});
fichiers.push({
  nom: 'fiches/<ID>.json',
  url: `${BASE_URL}/data/fiches/`,
  description: 'Une fiche par fichier, identique à son entrée du recueil. Adresse exacte dans index.json',
  nb_entrees: toutesLesFiches.length,
  nb_actives: toutesLesFiches.filter((f) => f.statut !== 'retiré').length,
});

/* Les pages. Elles ne contiennent AUCUNE donnée : ce sont des gabarits qui
   lisent /data au chargement. Les six anciennes adresses deviennent des
   redirections qui traduisent aussi leur ancre. */
let poids = 0;
for (const p of pages.toutes()) {
  const etat = poser(path.join(RACINE, p.nom), p.html, p.nom);
  poids += Buffer.byteLength(p.html);
  if (!verifier) console.log(`${etat.padEnd(8)}${p.nom} — ${(Buffer.byteLength(p.html) / 1024).toFixed(1)} Ko`);
}
console.log(`${verifier ? 'vérifié' : 'écrit  '} ${pages.toutes().length} pages — ${(poids / 1024).toFixed(1)} Ko au total`);

/* La date du jour, en heure locale. `toISOString()` donne l'heure UTC : passé
   20 h à Montréal, le manifeste se datait du lendemain — une date qui n'a pas
   encore eu lieu ici, sur un fichier dont tout l'intérêt est de dire quand le
   travail a été fait. */
function aujourdhui() {
  const d = new Date();
  const deux = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

const manifeste = {
  /* 🔴 `site` EST LA CLÉ DU DÉPÔT, `nom` EST LE NOM AFFICHÉ, et le S41 du
     document 34 vient de les séparer. Le site s'appelle Teishoku depuis ce
     document ; son adresse reste `.../washoku/`, parce qu'un nom est une chaîne
     d'affichage et qu'une adresse est un chemin de dépôt. Renommer l'adresse
     casserait le raccourci de l'écran d'accueil sans rien gagner — aucun lien
     externe n'existe.

     Les deux clés sont donc là toutes les deux, et un agent extérieur qui lit
     le manifeste n'a plus à choisir entre appeler le site par son chemin ou
     deviner son nom. */
  site: 'washoku',
  nom: pages.NOM,
  version_schema: '1.0',
  derniere_maj: process.env.WASHOKU_DATE || aujourdhui(),
  dernier_document_applique: dernierDocumentApplique,
  note: "Fichier généré par tools/generer.js. Ne pas éditer à la main : les compteurs sont calculés à partir de /data.",
  protocole_de_lecture: [
    'Ce manifeste donne l’adresse complète de tous les autres fichiers.',
    'index.json dit quelles fiches existent, avec de quoi choisir laquelle ouvrir.',
    'fiches/<ID>.json donne une fiche entière. Ne récupérer que celles dont on a besoin ; l’adresse du dossier est dans fichiers[].',
    'Dans index.json, une clé ABSENTE veut dire « rien ne le dit » : les valeurs vides ne s’y écrivent pas.',
    'guide-2-fiches.json est le recueil entier : ne le charger que pour un audit.',
    'ensembles_fermes donne les valeurs exactes des champs à liste fermée. Les lire avant d’en écrire une.',
    'formes_fermees dit si un champ fermé prend une valeur, un tableau de valeurs, ou un objet par lecteur.',
    'Les pages HTML sont une VUE générée : elles ne portent aucune donnée, elles lisent ces fichiers-ci.',
  ],
  fichiers,
  compteurs,
  ensembles_fermes: ensembles.parFichier(),
  note_ensembles_fermes: ensembles.NOTE,
  formes_fermees: ensembles.formesParFichier(),
  note_formes_fermees: ensembles.NOTE_FORMES,
};
poser(path.join(DATA, 'manifeste.json'), JSON.stringify(manifeste, null, 2) + '\n', 'data/manifeste.json');

console.log(`\ncompteurs : ${compteurs.techniques} techniques, ${compteurs.recettes} recettes, ${compteurs.fiches_retirees} retirée(s)`);
if (ecarts) {
  console.error(`\n${ecarts} écart(s) entre /data et le disque. Rien n'a été écrit — lancer \`npm run generer\`.`);
  process.exit(1);
}
console.log(verifier ? 'Vérification : aucun écart.' : 'Génération terminée.');
