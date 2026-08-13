#!/usr/bin/env node
'use strict';
/* Génération : /data fait foi, les pages HTML en sont le rendu. Ce script
   réinjecte les tableaux de données dans les pages et recalcule les compteurs
   affichés. Avec --verifier, il ne réécrit rien : il compare seulement ce
   qu'il produirait aux données déjà en place et signale tout écart. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { SOURCES, PROSES, DONNEES_SEULES, RACINE, DATA, BASE_URL } = require('./lib/sources');
const { lireBloc, remplacerBloc, lireFichier, ecrireFichier } = require('./lib/blocs');
const { objetMultiligne, tableau } = require('./lib/ecrire-js');
const documents = require('./lib/documents');
const compteursCartes = require('./lib/compteurs');
const ensembles = require('./lib/ensembles');

const verifier = process.argv.includes('--verifier');

/* Le numéro du dernier document appliqué se dérive du dépôt, jamais d'une
   valeur recopiée ici : c'est le principe général du manifeste, et c'était le
   dernier compteur à y échapper. Aucune valeur ne s'accepte en paramètre, et
   la lecture se fait avant toute écriture — une liste absente ou vide arrête
   la génération plutôt que de produire un manifeste qui ment. */
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

/* Le tableau R référence les images par IMG.cle quand elles y figurent ;
   on rétablit cette indirection pour que le diff reste petit. */
function indirectionImages(html) {
  const m = html.match(/\nconst IMG = \{[\s\S]*?\n\};/);
  if (!m) return { portee: {}, parUrl: {} };
  const IMG = new Function(`${m[0]}\nreturn IMG;`)();
  const parUrl = {};
  for (const [cle, url] of Object.entries(IMG)) if (!(url in parUrl)) parUrl[url] = `IMG.${cle}`;
  return { portee: { IMG }, parUrl };
}

let ecarts = 0;
const compteurs = { techniques: 0, recettes: 0, fiches_actives: 0, fiches_retirees: 0 };
const fichiers = [];

for (const src of SOURCES) {
  const chemin = path.join(RACINE, src.page);
  let html = lireFichier(chemin);
  const { portee, parUrl } = src.bloc === 'R' ? indirectionImages(html) : { portee: {}, parUrl: {} };

  const objets = lireJson(path.join(DATA, `${src.cle}.json`));
  const actifs = objets.filter((o) => o.statut !== 'retiré');

  const morceaux = actifs.map((o) => {
    const brut = src.mapper.versEntree(o);
    if (parUrl[brut.img]) brut.img = { __brut: parUrl[brut.img] };
    const texte = objetMultiligne(brut, src.entete, src.groupes);
    return o.commentaire_source != null ? `${o.commentaire_source}\n${texte}` : texte;
  });

  const nouveau = tableau(src.bloc, morceaux, src.separateur);

  // Contrôle de non-perte : les données relues doivent être identiques,
  // aux défauts de forme près (voir `defauts` dans sources.js).
  const normaliser = (liste) => liste.map((o) => ({ ...(src.defauts || {}), ...o }));
  const avant = normaliser(lireBloc(html, src.bloc, portee));
  const apres = normaliser(new Function(...Object.keys(portee), `${nouveau}\nreturn ${src.bloc};`)(...Object.values(portee)));
  try {
    assert.deepStrictEqual(apres, avant);
  } catch (e) {
    ecarts += 1;
    console.error(`\n✗ ${src.cle} : le contenu régénéré diffère de celui de la page.`);
    console.error(String(e.message).split('\n').slice(0, 24).join('\n'));
  }

  if (src.cle === 'guide-2-fiches') {
    compteurs.techniques = actifs.filter((o) => o.id.startsWith('T')).length;
    compteurs.recettes = actifs.filter((o) => o.id.startsWith('R')).length;
    compteurs.fiches_actives = actifs.length;
    compteurs.fiches_retirees = objets.length - actifs.length;
  }

  fichiers.push({
    nom: `${src.cle}.json`,
    url: adresse(`${src.cle}.json`),
    description: src.description,
    nb_entrees: objets.length,
    nb_actives: actifs.length,
  });

  if (!verifier) {
    html = remplacerBloc(html, src.bloc, nouveau);
    ecrireFichier(chemin, html);
  }
  console.log(`${verifier ? 'vérifié' : 'écrit  '} ${src.page} — ${actifs.length} entrées (${src.bloc})`);
}

/* Les sources de prose. Même contrat que les tableaux de données : on compare
   ce que la page contient à ce que /data dit, et on signale l'écart. La
   comparaison porte sur la partie rendue — les cibles chiffrées du guide 5,
   par exemple, ne se rendent pas : c'est la règle 10 qui les surveille. */
for (const src of PROSES) {
  const chemin = path.join(RACINE, src.page);
  const html = lireFichier(chemin);
  const donnees = lireJson(path.join(DATA, `${src.cle}.json`));

  try {
    assert.deepStrictEqual(src.mapper.partieRendue(donnees), src.mapper.lire(html));
  } catch (e) {
    ecarts += 1;
    console.error(`\n✗ ${src.cle} : le contenu de /data diffère de celui de la page.`);
    console.error(String(e.message).split('\n').slice(0, 24).join('\n'));
  }

  const { nb_entrees, nb_actives } = src.compte(donnees);
  fichiers.push({ nom: `${src.cle}.json`, url: adresse(`${src.cle}.json`), description: src.description, nb_entrees, nb_actives });

  if (!verifier) ecrireFichier(chemin, src.mapper.reinjecter(html, src.mapper.partieRendue(donnees)));
  console.log(`${verifier ? 'vérifié' : 'écrit  '} ${src.page} — ${nb_actives} entrées (${src.cle})`);
}

/* Les nombres de fiches ne s'écrivent plus à la main nulle part : ils sont
   recalculés ici à partir des données. Règle 9 du document 7. */
const NOMBRES = [
  { page: 'guide-2-recettes.html', motif: /— \d+ techniques, \d+ recettes/g, valeur: () => `— ${compteurs.techniques} techniques, ${compteurs.recettes} recettes` },
  { page: 'index.html', motif: /\d+ recettes et \d+ techniques de base/g, valeur: () => `${compteurs.recettes} recettes et ${compteurs.techniques} techniques de base` },
];
for (const n of NOMBRES) {
  const chemin = path.join(RACINE, n.page);
  const html = lireFichier(chemin);
  const attendu = n.valeur();
  const trouves = html.match(n.motif) || [];
  if (!trouves.length) { console.error(`✗ ${n.page} : compteur introuvable (${n.motif})`); ecarts += 1; continue; }
  const mauvais = trouves.filter((t) => t !== attendu);
  if (mauvais.length && verifier) { console.error(`✗ ${n.page} : compteur périmé « ${mauvais[0]} », attendu « ${attendu} »`); ecarts += 1; }
  if (!verifier) ecrireFichier(chemin, html.replace(n.motif, attendu));
}

/* Les compteurs de pied des cartes de guide. Même contrat que NOMBRES, mais le
   motif s'ancre sur le lien de chaque carte : « N fiches → » se répète d'une
   carte à l'autre, et un motif global les écraserait toutes avec la même
   valeur. La table vit dans lib/compteurs.js, que la règle 9 lit aussi. */
{
  const chemin = path.join(RACINE, compteursCartes.PAGE);
  let html = lireFichier(chemin);
  let touche = false;
  for (const c of compteursCartes.cartes()) {
    const actuel = compteursCartes.lireCarte(html, c);
    if (actuel === null) {
      console.error(`✗ ${compteursCartes.PAGE} : pied de carte introuvable pour ${c.href}`);
      ecarts += 1;
      continue;
    }
    if (actuel === c.libelle) continue;
    if (verifier) {
      console.error(`✗ ${compteursCartes.PAGE} : carte ${c.href} affiche « ${actuel} », attendu « ${c.libelle} »`);
      ecarts += 1;
      continue;
    }
    html = html.replace(c.motif, `$1${c.libelle}$3`);
    touche = true;
  }
  if (!verifier && touche) ecrireFichier(chemin, html);
}

for (const src of DONNEES_SEULES) {
  const chemin = path.join(DATA, `${src.cle}.json`);
  const donnees = fs.existsSync(chemin) ? lireJson(chemin) : [];
  fichiers.push({
    nom: `${src.cle}.json`,
    url: adresse(`${src.cle}.json`),
    description: src.description,
    nb_entrees: donnees.length,
    nb_actives: donnees.length,
  });
  console.log(`${verifier ? 'vérifié' : 'lu     '} data/${src.cle}.json — ${donnees.length} entrées`);
}

/* ── Les deux vues qui servent la lecture depuis l'extérieur ──────────── */

/* Une fiche par fichier, et un index compact. C'est la même donnée écrite deux
   fois de plus par le même script — aucun risque de divergence, et la règle 15
   le vérifie. Ça évite de charger 230 Ko pour lire trois recettes. */
const toutesLesFiches = lireJson(path.join(DATA, 'guide-2-fiches.json'));
const DOSSIER_FICHES = path.join(DATA, 'fiches');

/** T avant R, puis par numéro, puis par suffixe : T1 … T7a, T7b, T8, R1 … R63. */
function rang(id) {
  const m = id.match(/^([TR])(\d+)(.*)$/);
  if (!m) throw new Error(`identifiant de fiche inattendu : ${id}`);
  return [m[1] === 'T' ? 0 : 1, Number(m[2]), m[3]];
}
const triees = [...toutesLesFiches].sort((a, b) => {
  const [x, y] = [rang(a.id), rang(b.id)];
  return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]);
});

const index = triees.map((f) => ({
  id: f.id,
  fr: f.fr,
  romaji: f.romaji,
  jp: f.jp,
  categorie: f.categorie,
  cuisine: f.cuisine,
  statut: f.statut,
  proteines_g: f.nutrition.proteines_g,
  calories: f.nutrition.calories,
  temps_minutes: f.temps_minutes.preparation + f.temps_minutes.cuisson + f.temps_minutes.attente,
  url: `${BASE_URL}/data/fiches/${f.id}.json`,
}));

if (!verifier) {
  fs.mkdirSync(DOSSIER_FICHES, { recursive: true });
  for (const f of toutesLesFiches) {
    fs.writeFileSync(path.join(DOSSIER_FICHES, `${f.id}.json`), JSON.stringify(f, null, 2) + '\n', 'utf8');
  }
  // Le dossier est une sortie générée : ce qui ne correspond plus à une fiche s'en va.
  const attendus = new Set(toutesLesFiches.map((f) => `${f.id}.json`));
  for (const nom of fs.readdirSync(DOSSIER_FICHES)) {
    if (nom.endsWith('.json') && !attendus.has(nom)) {
      fs.unlinkSync(path.join(DOSSIER_FICHES, nom));
      console.log(`retiré  data/fiches/${nom} — plus aucune fiche de ce nom`);
    }
  }
  fs.writeFileSync(path.join(DATA, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
}
console.log(`${verifier ? 'vérifié' : 'écrit  '} data/index.json et data/fiches/ — ${index.length} fiches`);

fichiers.push({
  nom: 'index.json',
  url: adresse('index.json'),
  description: 'Index compact des fiches : de quoi choisir laquelle ouvrir, sans charger le recueil',
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
  site: 'washoku',
  version_schema: '1.0',
  derniere_maj: process.env.WASHOKU_DATE || aujourdhui(),
  dernier_document_applique: dernierDocumentApplique,
  note: "Fichier généré par tools/generer.js. Ne pas éditer à la main : les compteurs sont calculés à partir de /data.",
  protocole_de_lecture: [
    'Ce manifeste donne l’adresse complète de tous les autres fichiers.',
    'index.json dit quelles fiches existent, avec de quoi choisir laquelle ouvrir.',
    'fiches/<ID>.json donne une fiche entière. Ne récupérer que celles dont on a besoin.',
    'guide-2-fiches.json est le recueil entier : ne le charger que pour un audit.',
    'ensembles_fermes donne les valeurs exactes des champs à liste fermée. Les lire avant d’en écrire une.',
  ],
  fichiers,
  compteurs,
  /* Publié pour que les valeurs cessent d'être citées de mémoire. Trois fautes
     du document 14 — `retire` sans accent, `rate` réputé absent, un total
     d'historique faux — venaient de ce que le rédacteur ne pouvait consulter
     nulle part les formes exactes. Même table que la règle 19 : voir
     lib/ensembles.js. */
  ensembles_fermes: ensembles.parFichier(),
  note_ensembles_fermes: ensembles.NOTE,
};
if (!verifier) fs.writeFileSync(path.join(DATA, 'manifeste.json'), JSON.stringify(manifeste, null, 2) + '\n', 'utf8');

console.log(`\ncompteurs : ${compteurs.techniques} techniques, ${compteurs.recettes} recettes, ${compteurs.fiches_retirees} retirée(s)`);
/* Un écart n'est pas forcément une faute : c'est le cas normal juste après une
   édition de /data. Le code de sortie non nul force à relire le diff avant de
   commiter, ce qui est exactement le contrôle qualité voulu. */
if (ecarts) {
  console.error(verifier
    ? `\n${ecarts} écart(s) entre /data et les pages. Rien n'a été écrit — lancer \`npm run generer\`.`
    : `\n${ecarts} écart(s) : les pages ont été réécrites à partir de /data. Relire le diff avant de commiter.`);
  process.exit(1);
}
console.log(verifier ? 'Vérification : aucun écart.' : 'Génération terminée.');
