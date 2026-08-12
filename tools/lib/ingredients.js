'use strict';
/* Aller-retour entre le tableau I de guide-3-supermarche.html et
   guide-3-ingredients.json. */

function versJson(x) {
  return {
    id: null, // rempli par l'extraction : la limace calculée à partir de `fr`
    statut: 'actif',
    section: x.s,
    jp: x.jp,
    jp_lecture: x.pr || null,
    romaji: x.ro,
    fr: x.fr,
    // Autres noms sous lesquels le produit se vend : translittérations
    // divergentes, noms dans d'autres langues. La recherche de la page les lit.
    noms_alternatifs: x.alt || [],
    description: x.d,
    ou_le_trouver: x.w,
    a_quoi_ca_ressemble: x.l,
    // Repérage en rayon : ces deux-là ne se rendent pas dans la page. Ils sont
    // déclarés ici pour tenir leur place dans l'ordre des clés ; `extraire.js`
    // reprend leur valeur depuis l'extraction précédente (`champs_hors_page`).
    description_visuelle: null,
    zone_magasin: null,
    sert_dans: x.u || [],
    note: x.nk ? { titre: x.nk, texte: x.n } : null,
    photo: x.img,
    photo_emballage: x.pack || null,
  };
}

function versEntree(f) {
  const x = { s: f.section, jp: f.jp, ro: f.romaji };
  if (f.jp_lecture) x.pr = f.jp_lecture;
  x.fr = f.fr;
  x.img = f.photo;
  if (f.photo_emballage) x.pack = f.photo_emballage;
  x.d = f.description;
  x.w = f.ou_le_trouver;
  x.l = f.a_quoi_ca_ressemble;
  if (f.noms_alternatifs && f.noms_alternatifs.length) x.alt = f.noms_alternatifs;
  if (f.sert_dans && f.sert_dans.length) x.u = f.sert_dans;
  if (f.note) { x.nk = f.note.titre; x.n = f.note.texte; }
  return x;
}

module.exports = { versJson, versEntree };
