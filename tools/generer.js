#!/usr/bin/env node
'use strict';
/* Génération : /data fait foi, les pages HTML en sont le rendu. Ce script
   réinjecte les tableaux de données dans les pages et recalcule les compteurs
   affichés. Avec --verifier, il ne réécrit rien : il compare seulement ce
   qu'il produirait aux données déjà en place et signale tout écart. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { SOURCES, RACINE, DATA } = require('./lib/sources');
const { lireBloc, remplacerBloc, lireFichier, ecrireFichier } = require('./lib/blocs');
const { objetMultiligne, tableau } = require('./lib/ecrire-js');

const verifier = process.argv.includes('--verifier');
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

const manifeste = {
  site: 'washoku',
  version_schema: '1.0',
  derniere_maj: process.env.WASHOKU_DATE || new Date().toISOString().slice(0, 10),
  dernier_document_applique: 7,
  note: "Fichier généré par tools/generer.js. Ne pas éditer à la main : les compteurs sont calculés à partir de /data.",
  fichiers,
  compteurs,
};
if (!verifier) fs.writeFileSync(path.join(DATA, 'manifeste.json'), JSON.stringify(manifeste, null, 2) + '\n', 'utf8');

console.log(`\ncompteurs : ${compteurs.techniques} techniques, ${compteurs.recettes} recettes, ${compteurs.fiches_retirees} retirée(s)`);
if (ecarts) { console.error(`\n${ecarts} écart(s). Rien n'a été publié.`); process.exit(1); }
console.log(verifier ? 'Vérification : aucun écart.' : 'Génération terminée.');
