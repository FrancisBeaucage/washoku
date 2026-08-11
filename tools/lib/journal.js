'use strict';
/* Aller-retour entre les <article class="entry"> du guide 6 et
   guide-6-journal.json.

   Le journal est le seul contenu où l'assistant de planification écrit. Il a
   donc besoin des champs machine — date, repas, plats, fiches corrigées — sans
   pour autant que la page perde ses tableaux, ses listes et ses renvois vers
   les fiches. D'où la forme retenue : des champs en tête, et un `corps` qui est
   une liste de blocs plutôt qu'un seul bloc de texte. */

const P = require('./prose');
const { trouverSection, remplacerSection, isoler } = require('./sections');

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const REPAS = ['dejeuner', 'diner', 'souper', 'preparation', 'journee'];
const LIEN = /^<a href="guide-2-recettes\.html#([TR][\w]*)">\1<\/a>(?: \(([^)]*)\))?$/;

/** « 10 août 2026 · Souper » → { date, repas } */
function decoderEntete(entete) {
  const m = entete.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})\s+·\s+(.+)$/);
  if (!m) throw new Error(`en-tête d'entrée illisible : « ${entete} »`);
  const mois = MOIS.indexOf(m[2].toLowerCase());
  if (mois === -1) throw new Error(`mois inconnu : ${m[2]}`);
  const date = `${m[3]}-${String(mois + 1).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  const libelle = m[4].toLowerCase();
  let repas;
  if (libelle.includes(' et ')) repas = 'journee';
  else if (libelle.startsWith('déjeuner')) repas = 'dejeuner';
  else if (libelle.startsWith('dîner')) repas = 'diner';
  else if (libelle.startsWith('souper')) repas = 'souper';
  else if (libelle.startsWith('préparation')) repas = 'preparation';
  else throw new Error(`repas inconnu : ${m[4]}`);
  return { date, repas };
}

/** Le paragraphe « Fiches : … » → identifiants et libellés. */
function decoderFiches(texte) {
  const m = texte.match(/^Fiches&nbsp;: ([\s\S]*)$/);
  if (!m) throw new Error(`paragraphe de fiches illisible : « ${texte.slice(0, 60)} »`);
  const plats = [];
  const libelles = {};
  for (const item of m[1].split(' · ')) {
    const l = item.match(LIEN);
    if (!l) throw new Error(`renvoi de fiche illisible : « ${item} »`);
    plats.push(l[1]);
    if (l[2]) libelles[l[1]] = l[2];
  }
  return { plats, plats_libelles: libelles };
}

function encoderFiches(plats, libelles) {
  const items = plats.map((id) => {
    const lien = `<a href="guide-2-recettes.html#${id}">${id}</a>`;
    return libelles && libelles[id] ? `${lien} (${libelles[id]})` : lien;
  });
  return `Fiches&nbsp;: ${items.join(' · ')}`;
}

/** Les fiches citées dans les listes de conclusions — ce que l'entrée a corrigé. */
function fichesCorrigees(corps) {
  const vues = [];
  for (const bloc of corps) {
    if (bloc.type !== 'liste') continue;
    for (const el of bloc.elements) {
      const re = /href="guide-2-recettes\.html#([TR]\d[\w]*)"/g;
      let m;
      while ((m = re.exec(el.texte))) if (!vues.includes(m[1])) vues.push(m[1]);
    }
  }
  return vues;
}

/* ── Analyse ──────────────────────────────────────────────────────────── */

/** Un <article class="entry"> → une entrée de journal. */
function versJson(source, commentaire) {
  const art = P.attributs(source);
  if (art.nom !== 'article' || art.table.class !== 'entry') throw new Error('article attendu');
  const { blocs: enveloppe } = P.analyser(art.interieur, '      ');
  if (enveloppe.length !== 1 || enveloppe[0].type !== 'html') throw new Error('entry-body attendu');
  const corpsDiv = P.attributs(enveloppe[0].source);
  if (corpsDiv.table.class !== 'entry-body') throw new Error('entry-body attendu');

  const { blocs } = P.analyser(corpsDiv.interieur, '        ');
  const prendre = (classe) => {
    if (!blocs.length || blocs[0].type !== 'texte' || blocs[0].classe !== classe) {
      throw new Error(`bloc « ${classe} » attendu, trouvé ${blocs[0] && (blocs[0].classe || blocs[0].type)}`);
    }
    return blocs.shift().texte;
  };

  const entete = prendre('entry-eyebrow');
  const titre = (() => {
    const b = blocs.shift();
    if (b.type !== 'texte' || b.balise !== 'h3' || b.classe) throw new Error('titre <h3> attendu');
    return b.texte;
  })();
  const { plats, plats_libelles } = decoderFiches(prendre('fiches'));
  const resume = prendre('kicker');
  const { date, repas } = decoderEntete(entete);

  // Les photos sortent du corps : le bloc n'y garde qu'un renvoi par rang.
  const photos = [];
  const corps = blocs.map((b) => {
    if (b.type !== 'figure') return b;
    photos.push({ fichier: b.fichier, alt: b.alt, legende: b.legende });
    const renvoi = { type: 'figure', photo: photos.length - 1 };
    if (b.blanc != null) renvoi.blanc = b.blanc;
    if (b.attrs) renvoi.attrs = b.attrs;
    return renvoi;
  });

  return {
    id: `K-${date}-${repas}`,
    statut: 'actif',
    date,
    repas,
    entete,
    titre,
    plats,
    plats_libelles,
    fiches_corrigees: fichesCorrigees(corps),
    resume,
    photos,
    corps,
    commentaire_source: commentaire,
  };
}

/* ── Réécriture ───────────────────────────────────────────────────────── */

/** Une entrée de journal → son <article class="entry">. */
function versEntree(e) {
  const tete = [
    { type: 'texte', balise: 'p', classe: 'entry-eyebrow', texte: e.entete },
    { type: 'texte', balise: 'h3', classe: '', texte: e.titre },
    { type: 'texte', balise: 'p', classe: 'fiches', texte: encoderFiches(e.plats, e.plats_libelles) },
    { type: 'texte', balise: 'p', classe: 'kicker', texte: e.resume },
  ];
  const corps = e.corps.map((b) => {
    if (b.type !== 'figure') return b;
    const photo = e.photos[b.photo];
    if (!photo) throw new Error(`${e.id} : renvoi de photo ${b.photo} sans photo correspondante`);
    return { ...b, ...photo, photo: undefined };
  });
  const interieur = P.rendre([...tete, ...corps], '        ', '\n      ');
  return `<article class="entry">\n      <div class="entry-body">${interieur}</div>\n    </article>`;
}

/* ── La section qui porte les entrées ─────────────────────────────────── */

const SECTION = 's4';
const DEBUT = '<!-- Entrée';
const FIN = '</article>';

/** La page → la liste des entrées de journal. */
function lire(html) {
  const { corps } = isoler(trouverSection(html, SECTION).interieur, DEBUT, FIN);
  const { blocs } = P.analyser(`\n    ${corps}`, '    ');
  const entrees = [];
  for (let i = 0; i < blocs.length; i += 2) {
    const commentaire = blocs[i];
    const article = blocs[i + 1];
    if (!commentaire || commentaire.type !== 'commentaire' || !article || article.type !== 'html') {
      throw new Error('journal : un commentaire puis un <article class="entry"> attendus');
    }
    entrees.push(versJson(article.source, commentaire.texte));
  }
  return entrees;
}

/** Les entrées → la page. */
function reinjecter(html, entrees) {
  const { tete, queue } = isoler(trouverSection(html, SECTION).interieur, DEBUT, FIN);
  const corps = entrees
    .map((e) => `<!-- ${e.commentaire_source} -->\n    ${versEntree(e)}`)
    .join('\n\n    ');
  return remplacerSection(html, SECTION, tete + corps + queue);
}

module.exports = {
  versJson, versEntree, REPAS, decoderEntete,
  extraire: lire, lire, reinjecter,
  partieRendue: (entrees) => entrees.filter((e) => e.statut !== 'retiré'),
};
