'use strict';
/* Aller-retour entre le tableau R de guide-2-recettes.html et guide-2-fiches.json. */

const C = require('./champs');

/** Fiche compacte (tableau R) → objet du schéma du document 7. */
function versJson(r) {
  const ing = r.ing.map((brut) => C.extraireSante(brut));
  const cuisine = C.CUISINES[r.cui];
  return {
    id: r.id,
    statut: 'actif',
    categorie: C.CATEGORIES[r.cat],
    cuisine,
    vitesse: C.VITESSES[r.spd],
    /* ── Bloc descriptif (document 19, S2) ────────────────────────────────
       Ce que le plat EST : objectif, vérifiable, et vrai pour tout lecteur.
       Il ne se mélange jamais au bloc évaluatif plus bas — un schéma qui
       range la préférence dans la description impose le goût d'un lecteur à
       tous les autres. */
    type_de_plat: null,
    methode: [],
    axe_gout: [],
    axe_texture: [],
    moment: [],
    /* Clé d'URL, CALCULÉE depuis `fr` par la même mécanique que les
       identifiants du guide 3. Elle n'est pas déclarée hors page : la règle 20
       vérifie donc, à chaque validation, qu'elle vaut bien `limace(fr)`. Un
       slug écrit à la main qui ne s'en déduit plus est signalé au lieu d'être
       silencieusement conservé. */
    slug: C.limace(r.fr),
    /* `jp`, `jp_lecture` et `romaji` acceptent `null` depuis le document 19
       (S7) : un nom japonais obligatoire sur une fiche de nuoc cham n'est pas
       une donnée, c'est une traduction inventée pour satisfaire un validateur.
       `langue_origine` dit à l'affichage quelle graphie montrer ; son défaut
       se déduit de la cuisine, et il reste réinscriptible. */
    jp: r.jp || null,
    jp_lecture: r.pr || null,
    romaji: r.ro || null,
    /* `nom_origine` et `lecture_origine` portent le nom dans l'écriture de SA
       langue, et sa romanisation. Ils existent depuis le document 23, et le
       manque était devenu criant : vingt-quatre des vingt-huit fiches des
       documents 21 et 22 se nomment en chinois, en lao, en coréen, en thaï, en
       vietnamien ou en indonésien. `jp`, `jp_lecture` et `romaji` sont des
       champs JAPONAIS — y mettre 白灼 serait faux, et le document 19 les a
       rendus facultatifs précisément pour ne pas forcer ce mensonge.

       Une fiche japonaise remplit les trois premiers et laisse ces deux-ci à
       `null` ; une fiche non japonaise fait l'inverse. L'asymétrie est connue
       et assumée : la fusion des deux paires est proposée pour un document à
       elle seule, parce qu'elle touche le mapper, l'affichage, l'index et la
       règle 11. */
    nom_origine: r.no || null,
    lecture_origine: r.nol || null,
    langue_origine: C.LANGUE_PAR_CUISINE[cuisine] || null,
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
    /* Comment Francis fait réellement le plat, quand ça diffère de la fiche.
       La fiche reste la référence ; l'ajustement est la version de la maison.
       Ces écarts vivaient jusqu'ici dans les notes, mêlés aux explications :
       séparés, ils se lisent d'un coup et une machine peut les utiliser. */
    ajustement: null,
    /* ── Bloc évaluatif (document 19, S3) ─────────────────────────────────
       Ce qu'un lecteur EN PENSE. Le site a plus d'un lecteur, et un plat peut
       valoir 2 étoiles pour l'un et 5 pour l'autre : ces champs sont donc des
       objets dont les CLÉS SONT DES LECTEURS, pas des valeurs uniques. La
       généralisation était le point à ne pas rater — un champ au singulier
       aurait dû être renommé.

       `cout_travail` reste scalaire : sa définition est en minutes actives,
       donc une propriété du plat et non un jugement. */
    etoiles: {},
    cout_travail: null,
    statut_perso: {},
    motif_statut: {},
    /* Ce que les autres en pensent. Le champ existe à cause des pilons de
       poulet — bas pour Francis, hauts pour sa femme — et du 18 août 2026, où
       la même soupe miso a reçu un enthousiasme franc d'un côté de la table et
       trois étoiles de l'autre. */
    pour_la_maison: null,
    photo: r.img,
    /* `langue` n'est remplie que quand elle est utile — c'est-à-dire quand la
       démonstration n'est ni en français ni en anglais. Une vidéo muette pour
       son lecteur reste utile pour les gestes, mais il faut le savoir avant de
       cliquer. Voir `LANGUES_VIDEO` dans `champs.js`. */
    video: { youtube_id: r.yt || null, auteur: r.ytBy || null, langue: r.ytLang || null },
    voir_aussi: [],
  };
}

/** Objet JSON → fiche compacte, telle que la page l'attend. */
function versFiche(f) {
  const r = { id: f.id, cui: C.CUISINES_INV[f.cuisine] };
  if (f.video.youtube_id) r.yt = f.video.youtube_id;
  if (f.video.auteur) r.ytBy = f.video.auteur;
  if (f.video.langue) r.ytLang = f.video.langue;
  r.cat = C.CATEGORIES_INV[f.categorie];
  // Nuls permis depuis S7 : on n'écrit pas `jp:null` dans la page.
  if (f.jp) r.jp = f.jp;
  if (f.romaji) r.ro = f.romaji;
  if (f.jp_lecture) r.pr = f.jp_lecture;
  if (f.nom_origine) r.no = f.nom_origine;
  if (f.lecture_origine) r.nol = f.lecture_origine;
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
