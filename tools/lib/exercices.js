'use strict';
/* Aller-retour entre le tableau E de guide-4-bouger.html et
   guide-4-exercices.json. */

function versJson(e) {
  return {
    id: `E${e.n}`,
    numero: e.n,
    statut: 'actif',
    zone: e.z,
    jp: e.jp,
    fr: e.fr,
    en: e.en,
    repetitions: e.reps,
    resume: e.short,
    pourquoi: e.why,
    etapes: e.steps.map((texte, i) => ({ n: i + 1, texte })),
    paliers: { regression: e.reg, standard: e.std, progression: e.pro },
    forme: e.fmt || null,
    note: e.note || null,
  };
}

function versEntree(f) {
  const e = { n: f.numero, z: f.zone, jp: f.jp, fr: f.fr, en: f.en, reps: f.repetitions };
  e.short = f.resume;
  e.why = f.pourquoi;
  e.steps = f.etapes.map((x) => x.texte);
  e.reg = f.paliers.regression;
  e.std = f.paliers.standard;
  e.pro = f.paliers.progression;
  if (f.forme) e.fmt = f.forme;
  if (f.note) e.note = f.note;
  return e;
}

module.exports = { versJson, versEntree };
