'use strict';
/* Aller-retour entre le tableau I de guide-3-supermarche.html et
   guide-3-ingredients.json. */

function versJson(x) {
  return {
    id: null, // rempli par l'extraction : la limace calculée à partir de `fr`
    statut: 'actif',
    section: x.s,
    /* Ces trois-là acceptent `null` depuis le document 19 (S7). Le yogourt grec
       avait reçu ギリシャヨーグルト parce que le champ était obligatoire : la
       valeur est juste — c'est le mot japonais réel — mais la RÈGLE était
       fausse. Le dossier n'est plus uniquement japonais, et il l'est de moins en
       moins. `langue_origine` dit quelle graphie montrer ; il vaut `null` quand
       personne ne l'a encore établi, jamais `aucune` par défaut, qui serait une
       affirmation. */
    jp: x.jp || null,
    jp_lecture: x.pr || null,
    romaji: x.ro || null,
    langue_origine: null,
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
    /* Le bloc de nutrition du guide 3 (document 19, S5) — le manque le plus
       coûteux du schéma d'avant. La règle du dossier veut que `lipides_g` et
       `sodium_mg` ne viennent que d'une étiquette lue ou d'une balance ; mais
       LES ÉTIQUETTES SONT SUR DES INGRÉDIENTS et les fiches du guide 2 sont des
       plats. Il n'existait aucun endroit pour écrire « la pâte tom yum Por Kwan
       fait 920 mg par cuillère à soupe » : ça vivait dans de la prose, ou nulle
       part. Ce qu'il a coûté : le souper du 21 août était annoncé à 1 000 mg de
       sodium, le calcul à partir des six étiquettes lues en donne ≈ 3 588 — un
       facteur 3,6, dû entièrement à des estimations de condiments faites de
       mémoire, faute d'un endroit où ranger les valeurs lues.

       Trois exigences, vérifiées par la règle 21 :
       — `base` est obligatoire dès qu'un chiffre est porté ;
       — `produit_lu` est obligatoire quand `source` vaut `etiquette` : deux
         marques de sauce d'huîtres n'ont pas le même sodium, et un chiffre sans
         son produit ne se vérifie ni ne se remplace ;
       — `null`, jamais zéro. `sodium_mg: 0` est une affirmation forte.

       La page ne rend pas ce bloc : il est déclaré dans `champs_hors_page`. */
    nutrition: {
      base: null,
      base_g: null,
      calories: null,
      proteines_g: null,
      lipides_g: null,
      sodium_mg: null,
      sucres_g: null,
      calcium_mg: null,
      source: null,
      produit_lu: null,
      date_lecture: null,
    },
    photo: x.img,
    photo_emballage: x.pack || null,
  };
}

function versEntree(f) {
  // `jp` et `romaji` peuvent être nuls depuis S7 : on ne les écrit pas plutôt
  // que d'émettre `jp:null` dans la page. L'aller-retour rend `null` non plus.
  const x = { s: f.section };
  if (f.jp) x.jp = f.jp;
  if (f.romaji) x.ro = f.romaji;
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
