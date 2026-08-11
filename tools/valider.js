#!/usr/bin/env node
'use strict';
/* Les neuf règles du document 7, §9. Chacune correspond à une erreur réellement
   survenue pendant les documents 1 à 6 ; le but est qu'elle ne puisse plus
   passer inaperçue. Sortie non nulle dès qu'une règle échoue. */

const fs = require('fs');
const path = require('path');
const { RACINE, DATA } = require('./lib/sources');

const lire = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'));
const fiches = lire('guide-2-fiches.json');
const ingredients = lire('guide-3-ingredients.json');
const exercices = lire('guide-4-exercices.json');
const journal = fs.existsSync(path.join(DATA, 'guide-6-journal.json')) ? lire('guide-6-journal.json') : [];
const manifeste = fs.existsSync(path.join(DATA, 'manifeste.json')) ? lire('manifeste.json') : null;

const echecs = [];
const regle = (n, titre, problemes) => {
  if (problemes.length) {
    echecs.push({ n, titre, problemes });
    console.error(`✗ Règle ${n} — ${titre}`);
    problemes.slice(0, 10).forEach((p) => console.error(`    ${p}`));
    if (problemes.length > 10) console.error(`    … et ${problemes.length - 10} autres`);
  } else {
    console.log(`✓ Règle ${n} — ${titre}`);
  }
};

const actives = fiches.filter((f) => f.statut !== 'retiré');
const identifiants = new Set(fiches.map((f) => f.id));

// 1 — unicité des identifiants
const vus = new Set();
regle(1, 'Tout identifiant est unique',
  fiches.map((f) => (vus.has(f.id) ? `${f.id} en double` : (vus.add(f.id), null))).filter(Boolean));

// 2 — les renvois pointent vers des fiches existantes
const renvois = [];
for (const f of fiches) {
  for (const t of f.techniques || []) if (!identifiants.has(t)) renvois.push(`${f.id} → techniques : ${t} inexistante`);
  for (const v of f.voir_aussi || []) if (!identifiants.has(v)) renvois.push(`${f.id} → voir_aussi : ${v} inexistante`);
}
for (const x of ingredients) for (const u of x.sert_dans || []) if (!identifiants.has(u)) renvois.push(`${x.id} → sert_dans : ${u} inexistante`);
for (const e of journal) {
  for (const p of e.plats || []) if (!identifiants.has(p)) renvois.push(`${e.id} → plats : ${p} inexistante`);
  for (const c of e.fiches_corrigees || []) if (!identifiants.has(c)) renvois.push(`${e.id} → fiches_corrigees : ${c} inexistante`);
}
regle(2, 'Tout identifiant référencé existe', renvois);

// 3 — les photos locales existent sur le disque
const photos = [];
const verifierPhoto = (chemin, ou) => {
  if (!chemin || /^https?:/.test(chemin)) return;
  if (!fs.existsSync(path.join(RACINE, chemin))) photos.push(`${ou} → ${chemin} absent du disque`);
};
fiches.forEach((f) => verifierPhoto(f.photo, f.id));
ingredients.forEach((x) => { verifierPhoto(x.photo, x.id); verifierPhoto(x.photo_emballage, x.id); });
journal.forEach((e) => (e.photos || []).forEach((p) => verifierPhoto(p.fichier || p, e.id)));
regle(3, 'Toute photo référencée existe sur le disque', photos);

// 4 — aucun marqueur de rédaction laissé en place
const marqueurs = [];
const MOTIF = /\[(à ajouter|à compléter|à faire|TODO|placeholder)\]/i;
const parcourir = (v, ou) => {
  if (typeof v === 'string') { if (MOTIF.test(v)) marqueurs.push(`${ou} : « ${v.slice(0, 60)} »`); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => parcourir(x, `${ou}[${i}]`));
  if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => parcourir(x, `${ou}.${k}`));
};
[...fiches, ...ingredients, ...exercices, ...journal].forEach((o) => parcourir(o, o.id));
regle(4, 'Aucun marqueur « à ajouter » ne subsiste', marqueurs);

// 5 — les recettes actives portent des protéines et des calories
regle(5, 'Toute recette active a des protéines et des calories',
  actives.filter((f) => f.id.startsWith('R') && !f.nutrition.variable)
    .filter((f) => f.nutrition.proteines_g == null || f.nutrition.calories == null)
    .map((f) => `${f.id} : protéines ${f.nutrition.proteines_affiche}, calories ${f.nutrition.calories_affiche}`));

// 6 — les compteurs du manifeste correspondent au contenu
const attendus = {
  techniques: actives.filter((f) => f.id.startsWith('T')).length,
  recettes: actives.filter((f) => f.id.startsWith('R')).length,
  fiches_actives: actives.length,
  fiches_retirees: fiches.length - actives.length,
};
regle(6, 'Les compteurs du manifeste correspondent au contenu',
  !manifeste ? ['manifeste.json absent'] :
    Object.entries(attendus).filter(([k, v]) => manifeste.compteurs[k] !== v)
      .map(([k, v]) => `${k} : manifeste ${manifeste.compteurs[k]}, contenu ${v}`));

// 7 — un identifiant retiré n'est jamais réattribué
regle(7, 'Aucun identifiant retiré n’est réutilisé',
  fiches.filter((f) => f.statut === 'retiré' && !f.motif_retrait).map((f) => `${f.id} retirée sans motif_retrait`));

// 8 — chaque entrée de journal pointe vers au moins une fiche
regle(8, 'Toute entrée de journal renvoie à une fiche',
  journal.filter((e) => !(e.plats || []).length && !(e.fiches_corrigees || []).length).map((e) => `${e.id} ne renvoie à rien`));

// 9 — les compteurs ne sont plus écrits en dur dans les pages
const durs = [];
for (const [page, motifs] of Object.entries({
  'guide-2-recettes.html': [/(\d+) techniques, (\d+) recettes/],
  'index.html': [/(\d+) recettes et (\d+) techniques/],
})) {
  const html = fs.readFileSync(path.join(RACINE, page), 'utf8');
  for (const m of motifs) {
    const t = html.match(m);
    if (!t) { durs.push(`${page} : compteur introuvable`); continue; }
    const [, a, b] = t.map(Number);
    const [tech, rec] = page === 'index.html' ? [b, a] : [a, b];
    if (tech !== attendus.techniques || rec !== attendus.recettes) {
      durs.push(`${page} : affiche ${tech} techniques / ${rec} recettes, contenu ${attendus.techniques} / ${attendus.recettes}`);
    }
  }
}
regle(9, 'Les nombres affichés dans les pages sont à jour', durs);

console.log('');
if (echecs.length) { console.error(`${echecs.length} règle(s) en échec.`); process.exit(1); }
console.log(`Validation complète : ${fiches.length} fiches, ${ingredients.length} ingrédients, ${exercices.length} exercices, ${journal.length} entrées de journal.`);
