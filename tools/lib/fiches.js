'use strict';
/* Aller-retour entre le tableau R de guide-2-recettes.html et guide-2-fiches.json. */

const C = require('./champs');

/** Fiche compacte (tableau R) → objet du schéma du document 7. */
function versJson(r) {
  const ing = r.ing.map((brut) => C.extraireSante(brut));
  return {
    id: r.id,
    statut: 'actif',
    categorie: C.CATEGORIES[r.cat],
    cuisine: C.CUISINES[r.cui],
    vitesse: C.VITESSES[r.spd],
    jp: r.jp,
    jp_lecture: r.pr || null,
    romaji: r.ro,
    fr: r.fr,
    sous_titre: r.sub,
    portions: r.por,
    temps_affiche: r.tps,
    temps_minutes: { preparation: r.prep, cuisson: r.cook, attente: r.rest },
    preparation_avance: r.wait || null,
    nutrition: {
      proteines_g: C.nombre(r.pro),
      proteines_affiche: r.pro,
      calories: C.nombre(r.cal),
      calories_affiche: r.cal,
      lipides_g: null,
      sodium_mg: null,
      // Vrai pour les plats de restes, dont l'apport dépend de ce qu'on y met.
      variable: /variable/i.test(String(r.pro)) || /variable/i.test(String(r.cal)),
      /* D'où viennent les chiffres. « estime » = tables génériques, ce qu'était
         tout le dossier au départ ; « etiquette » = relevé sur l'emballage des
         produits réellement utilisés ; « pese » = pesé ingrédient par
         ingrédient. Le remplissage est opportuniste : une fiche passe à
         « etiquette » le jour où elle est cuisinée, jamais rétroactivement. */
      source: 'estime',
      note: "Ordres de grandeur. L'étiquette du produit prime.",
    },
    ingredients: ing,
    techniques: r.tech || [],
    etapes: r.steps.map((texte, i) => ({ n: i + 1, texte })),
    notes: (r.notes || []).map((n) => ({ titre: n.k, texte: n.t })),
    photo: r.img,
    video: { youtube_id: r.yt || null, auteur: r.ytBy || null },
    voir_aussi: [],
  };
}

/** Objet JSON → fiche compacte, telle que la page l'attend. */
function versFiche(f) {
  const r = { id: f.id, cui: C.CUISINES_INV[f.cuisine] };
  if (f.video.youtube_id) r.yt = f.video.youtube_id;
  if (f.video.auteur) r.ytBy = f.video.auteur;
  r.cat = C.CATEGORIES_INV[f.categorie];
  r.jp = f.jp;
  r.ro = f.romaji;
  if (f.jp_lecture) r.pr = f.jp_lecture;
  r.fr = f.fr;
  r.img = f.photo;
  r.por = f.portions;
  r.tps = f.temps_affiche;
  r.prep = f.temps_minutes.preparation;
  r.cook = f.temps_minutes.cuisson;
  r.rest = f.temps_minutes.attente;
  r.spd = C.VITESSES_INV[f.vitesse];
  r.wait = f.preparation_avance || '';
  r.pro = f.nutrition.proteines_affiche;
  r.cal = f.nutrition.calories_affiche;
  r.sub = f.sous_titre;
  r.ing = f.ingredients.map(C.remettreSante);
  r.steps = f.etapes.map((e) => e.texte);
  r.notes = f.notes.map((n) => ({ k: n.titre, t: n.texte }));
  if (f.techniques && f.techniques.length) r.tech = f.techniques;
  return r;
}

module.exports = { versJson, versEntree: versFiche };
