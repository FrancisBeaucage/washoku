'use strict';
/* Aller-retour entre les cinq annexes du guide 2 — lexique, yakumi,
   dépannage, thé, équipement — et guide-2-annexes.json.

   Ce sont les règles que l'assistant de planification re-dérive sans arrêt, et
   qu'il a déjà contredites au moins une fois (le demi-sachet de nouilles
   instantanées). Elles deviennent donc lisibles hors du navigateur.

   Le lexique et les yakumi ont une forme régulière : leurs entrées sont des
   objets, et la mise en page est un gabarit détenu par ce module. Si la page
   s'écarte du gabarit, l'extraction lève plutôt que d'écrire un JSON qui ne
   saurait pas revenir en arrière. Le dépannage et le thé sont de la prose
   composite : ils gardent la liste de blocs générique. */

const P = require('./prose');
const { limace } = require('./champs');
const { trouverSection, remplacerSection } = require('./sections');

const ANNEXES = ['lexique', 'yakumi', 'depannage', 'the', 'equipement'];
const INDENT = '          ';

/* Gabarits de présentation. Ils ne sont pas du contenu : ils vivent ici, une
   seule fois, et l'extraction vérifie que la page s'y conforme. */
const G = {
  banniere: 'display:flex;align-items:baseline;gap:14px;margin-bottom:6px',
  numero: 'font-weight:800;font-size:40px;color:#ec3013;line-height:1',
  titre: 'margin:0;font-size:clamp(24px,4vw,38px);font-weight:800;letter-spacing:-.02em',
  jp: "cursor:help;font-family:'Noto Serif JP',serif;font-weight:600;font-size:22px;color:#9b9797",
  colonneTitre: 'margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #201e1d;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase',
  colonneTexte: 'margin:0 0 12px;font-size:16.5px;line-height:1.7',
  colonneTexteFin: 'margin:0;font-size:16.5px;line-height:1.7',
  grilleLexique: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:clamp(20px,3vw,40px);margin-top:26px',
  grilleYakumi: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:clamp(20px,3vw,40px);margin-top:30px',
  langue: 'color:#7d7979',
};

const exige = (condition, message) => { if (!condition) throw new Error(`annexes : ${message}`); };

/* ── La bannière de section ───────────────────────────────────────────── */

function lireBanniere(bloc) {
  exige(bloc && bloc.type === 'html', 'bannière de section attendue');
  const m = bloc.source.match(new RegExp(
    `^<div style="${G.banniere}">\\n\\s*<span style="${G.numero}">([^<]*)</span>` +
    `\\n\\s*<h2 style="${G.titre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([\\s\\S]*?)</h2>` +
    `\\n\\s*<span title="([^"]*)" style="${G.jp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([^<]*)</span>\\n\\s*</div>$`
  ));
  exige(m, `bannière non conforme au gabarit : ${bloc.source.slice(0, 60)}`);
  return { numero: m[1], titre: m[2], jp_infobulle: m[3], jp: m[4] };
}

function ecrireBanniere(a, indent) {
  return { type: 'html', source:
    `<div style="${G.banniere}">\n${indent}  <span style="${G.numero}">${a.numero}</span>` +
    `\n${indent}  <h2 style="${G.titre}">${a.titre}</h2>` +
    `\n${indent}  <span title="${a.jp_infobulle}" style="${G.jp}">${a.jp}</span>\n${indent}</div>` };
}

/* ── Le lexique ───────────────────────────────────────────────────────── */

const CELLULE_JP = new RegExp(
  `^<strong title="([^"]*)" style="cursor:help">([^<]*)</strong><br><em>([^<]*)</em>` +
  `( †)?(?: <span style="${G.langue}">\\(([^)]*)\\)</span>)?$`
);

function lireLexique(grille) {
  exige(grille && grille.type === 'grille', 'grille du lexique attendue');
  exige(grille.attrs === ` style="${G.grilleLexique}"`, 'grille du lexique hors gabarit');
  return grille.colonnes.map((col) => {
    exige(!col.attrs && col.blocs.length === 2, 'colonne de lexique hors gabarit');
    const [titre, table] = col.blocs;
    exige(titre.type === 'texte' && titre.attrs === ` style="${G.colonneTitre}"`, 'titre de colonne hors gabarit');
    exige(table.type === 'tableau' && table.attrs === ' style="margin:0"', 'tableau de lexique hors gabarit');
    const entrees = table.lignes.map((ligne, i) => {
      exige(ligne.cellules.length === 2, 'ligne de lexique à deux cellules attendue');
      const [gauche, droite] = ligne.cellules;
      exige(gauche.attrs === (i === 0 ? ' style="width:38%"' : undefined), 'largeur de cellule hors gabarit');
      const m = gauche.html.match(CELLULE_JP);
      exige(m, `entrée de lexique illisible : ${gauche.html.slice(0, 60)}`);
      const e = { id: limace(m[3]), jp: m[2], jp_lecture: null, infobulle: m[1], romaji: m[3], definition: droite.html };
      if (m[4]) e.sante = true;
      if (m[5]) e.langue = m[5];
      return e;
    });
    return { id: limace(titre.texte), titre: titre.texte, entrees };
  });
}

function ecrireLexique(categories) {
  return {
    type: 'grille',
    attrs: ` style="${G.grilleLexique}"`,
    colonnes: categories.map((cat) => ({
      blocs: [
        { type: 'texte', balise: 'p', attrs: ` style="${G.colonneTitre}"`, texte: cat.titre },
        {
          type: 'tableau',
          attrs: ' style="margin:0"',
          attrs_table: ' style="min-width:0"',
          lignes: cat.entrees.map((e, i) => ({
            cellules: [
              {
                balise: 'td',
                ...(i === 0 ? { attrs: ' style="width:38%"' } : {}),
                html: `<strong title="${e.infobulle}" style="cursor:help">${e.jp}</strong><br><em>${e.romaji}</em>` +
                  (e.sante ? ' †' : '') + (e.langue ? ` <span style="${G.langue}">(${e.langue})</span>` : ''),
              },
              { balise: 'td', html: e.definition },
            ],
          })),
        },
      ],
    })),
  };
}

/* ── Les yakumi ───────────────────────────────────────────────────────── */

const CELLULE_YAKUMI = /^<strong title="([^"]*)" style="cursor:help">([^<]*)<\/strong> ([\s\S]*)$/;

function lireYakumi(table, grille) {
  exige(table && table.type === 'tableau' && !table.attrs && !table.attrs_table, 'tableau des yakumi hors gabarit');
  const [entete, ...corps] = table.lignes;
  exige(entete.cellules.every((c) => c.balise === 'th'), 'ligne d’en-tête attendue');
  const garnitures = corps.map((ligne) => {
    exige(ligne.cellules.length === 3, 'ligne de yakumi à trois cellules attendue');
    const [g, p, v] = ligne.cellules;
    const m = g.html.match(CELLULE_YAKUMI);
    exige(m, `garniture illisible : ${g.html.slice(0, 60)}`);
    return { id: limace(m[3]), jp: m[2], infobulle: m[1], fr: m[3], preparation: p.html, va_avec: v.html };
  });

  exige(grille && grille.type === 'grille' && grille.attrs === ` style="${G.grilleYakumi}"`, 'grille des yakumi hors gabarit');
  // Une ligne vide sépare le tableau des trois colonnes de notes.
  exige(grille.blanc === `\n\n${INDENT}`, 'espacement de la grille des yakumi hors gabarit');
  const notes = grille.colonnes.map((col) => {
    exige(!col.attrs && col.blocs.length >= 2, 'colonne de yakumi hors gabarit');
    const [titre, ...ps] = col.blocs;
    exige(titre.type === 'texte' && titre.attrs === ` style="${G.colonneTitre}"`, 'titre de colonne hors gabarit');
    ps.forEach((p, i) => {
      const attendu = i === ps.length - 1 ? G.colonneTexteFin : G.colonneTexte;
      exige(p.type === 'texte' && p.attrs === ` style="${attendu}"`, 'paragraphe de colonne hors gabarit');
    });
    return { id: limace(titre.texte), titre: titre.texte, paragraphes: ps.map((p) => p.texte) };
  });

  return { entetes: entete.cellules.map((c) => c.html), garnitures, notes };
}

function ecrireYakumi(a) {
  const table = {
    type: 'tableau',
    lignes: [
      { cellules: a.entetes.map((html) => ({ balise: 'th', html })) },
      ...a.garnitures.map((g) => ({
        cellules: [
          { balise: 'td', html: `<strong title="${g.infobulle}" style="cursor:help">${g.jp}</strong> ${g.fr}` },
          { balise: 'td', html: g.preparation },
          { balise: 'td', html: g.va_avec },
        ],
      })),
    ],
  };
  const grille = {
    type: 'grille',
    blanc: `\n\n${INDENT}`,
    attrs: ` style="${G.grilleYakumi}"`,
    colonnes: a.notes.map((n) => ({
      blocs: [
        { type: 'texte', balise: 'p', attrs: ` style="${G.colonneTitre}"`, texte: n.titre },
        ...n.paragraphes.map((texte, i) => ({
          type: 'texte',
          balise: 'p',
          attrs: ` style="${i === n.paragraphes.length - 1 ? G.colonneTexteFin : G.colonneTexte}"`,
          texte,
        })),
      ],
    })),
  };
  return [table, grille];
}

/* ── Les fiches citées ────────────────────────────────────────────────── */

/** Tous les identifiants de fiches renvoyés depuis une annexe. */
function fichesLiees(valeur, vues = []) {
  if (typeof valeur === 'string') {
    const re = /href="(?:guide-2-recettes\.html)?#([TR]\d[\w]*)"/g;
    let m;
    while ((m = re.exec(valeur))) if (!vues.includes(m[1])) vues.push(m[1]);
  } else if (Array.isArray(valeur)) valeur.forEach((v) => fichesLiees(v, vues));
  else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach((v) => fichesLiees(v, vues));
  return vues;
}

/* ── Analyse et réécriture d'une section ──────────────────────────────── */

/** L'intérieur d'une <section id="…"> → l'objet d'annexe. */
function versJson(id, interieur) {
  const { blocs: enveloppe } = P.analyser(interieur, '        ');
  exige(enveloppe.length === 1 && enveloppe[0].type === 'html', `${id} : un seul div.in attendu`);
  const div = P.attributs(enveloppe[0].source);
  exige(div.table.class === 'in', `${id} : div.in attendu`);
  const { blocs } = P.analyser(div.interieur, INDENT);

  const a = { id, ...lireBanniere(blocs.shift()) };
  const reste = blocs;

  // L'intro est le paragraphe gris qui suit la bannière, quand il y en a un.
  if (reste.length && reste[0].type === 'texte' && /color:#444141/.test(reste[0].attrs || '')) {
    const p = reste.shift();
    a.intro = p.texte;
    a.intro_attrs = p.attrs;
  }

  if (id === 'lexique') {
    exige(reste.length === 1, 'lexique : la grille seule attendue après l’intro');
    a.categories = lireLexique(reste[0]);
  } else if (id === 'yakumi') {
    exige(reste.length === 2, 'yakumi : tableau puis grille attendus');
    Object.assign(a, lireYakumi(reste[0], reste[1]));
  } else {
    a.corps = reste;
  }

  a.fiches_liees = fichesLiees(a);
  return a;
}

/** L'objet d'annexe → l'intérieur de sa <section>. */
function versSection(a) {
  const blocs = [ecrireBanniere(a, INDENT)];
  if (a.intro != null) {
    blocs.push({ type: 'texte', balise: 'p', attrs: a.intro_attrs, texte: a.intro });
  }
  if (a.id === 'lexique') blocs.push(ecrireLexique(a.categories));
  else if (a.id === 'yakumi') blocs.push(...ecrireYakumi(a));
  else blocs.push(...a.corps);
  return `\n        <div class="in">${P.rendre(blocs, INDENT, '\n        ')}</div>\n      `;
}

/** La page → les cinq annexes. */
function lire(html) {
  const sortie = {};
  for (const id of ANNEXES) sortie[id] = versJson(id, trouverSection(html, id).interieur);
  return sortie;
}

/** Les cinq annexes → la page. */
function reinjecter(html, annexes) {
  for (const id of ANNEXES) html = remplacerSection(html, id, versSection(annexes[id]));
  return html;
}

module.exports = {
  ANNEXES, versJson, versSection, fichesLiees,
  extraire: lire, lire, reinjecter,
  partieRendue: (annexes) => annexes,
};
