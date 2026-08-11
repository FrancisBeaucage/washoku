'use strict';
/* Aller-retour entre les sections du guide 5 et guide-5-plan.json.

   Ce fichier a une particularité demandée par le document 8 : il sépare LES
   CHIFFRES de LA PROSE QUI LES EXPLIQUE. `cibles` fait autorité ; `sections`
   raconte. La règle de validation n° 10 vérifie que les deux disent la même
   chose — c'est tout l'intérêt de la séparation. */

const P = require('./prose');
const { trouverSection, remplacerSection } = require('./sections');

const SECTIONS = ['s1', 's2', 's3', 's4', 's5'];
const INDENT = '    ';

const G = {
  banniere: 'display:flex;align-items:baseline;gap:12px;margin-bottom:8px',
  numero: 'font-weight:800;font-size:40px;color:#ec3013;line-height:1',
  jp: "cursor:help;font-family:'Noto Serif JP',serif;font-weight:600;font-size:22px;color:#9b9797",
  titre: 'margin:0 0 8px;font-size:clamp(26px,4vw,40px);font-weight:800;line-height:1.05;letter-spacing:-.02em',
};

const exige = (condition, message) => { if (!condition) throw new Error(`plan : ${message}`); };
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** L'intérieur d'une <section id="sN"> → l'objet de section. */
function versJson(id, interieur) {
  const { blocs } = P.analyser(interieur, INDENT);
  const banniere = blocs.shift();
  exige(banniere && banniere.type === 'html', `${id} : bannière attendue`);
  const b = banniere.source.match(new RegExp(
    `^<div style="${echapper(G.banniere)}">\\n\\s*<span style="${echapper(G.numero)}">([^<]*)</span>` +
    `\\n\\s*<span title="([^"]*)" style="${echapper(G.jp)}">([^<]*)</span>\\n\\s*</div>$`
  ));
  exige(b, `${id} : bannière hors gabarit`);

  const h2 = blocs.shift();
  exige(h2 && h2.type === 'texte' && h2.balise === 'h2' && h2.attrs === ` style="${G.titre}"`, `${id} : titre hors gabarit`);

  return { id, numero: b[1], jp: b[3], jp_infobulle: b[2], titre: h2.texte, corps: blocs };
}

/** L'objet de section → l'intérieur de sa <section>. */
function versSection(s) {
  const banniere = {
    type: 'html',
    source: `<div style="${G.banniere}">\n${INDENT}  <span style="${G.numero}">${s.numero}</span>` +
      `\n${INDENT}  <span title="${s.jp_infobulle}" style="${G.jp}">${s.jp}</span>\n${INDENT}</div>`,
  };
  const titre = { type: 'texte', balise: 'h2', classe: '', attrs: ` style="${G.titre}"`, texte: s.titre };
  return P.rendre([banniere, titre, ...s.corps], INDENT, '\n  ');
}

/**
 * Tous les nombres d'une section, texte compris — sert à la règle 10.
 * L'espace insécable qui sépare les milliers en français est normalisé.
 */
function nombresCites(sections) {
  const texte = JSON.stringify(sections).replace(/&nbsp;|\\u00a0| | /g, ' ');
  const vus = new Set();
  const re = /\d[\d ]*/g;
  let m;
  while ((m = re.exec(texte))) {
    const n = parseInt(m[0].replace(/ /g, ''), 10);
    if (Number.isFinite(n)) vus.add(n);
    // « 2 000 » se lit aussi comme « 2 » suivi de « 000 » selon la coupure.
    for (const part of m[0].split(' ')) {
      const p = parseInt(part, 10);
      if (Number.isFinite(p)) vus.add(p);
    }
  }
  return vus;
}

/** Toutes les valeurs chiffrées déclarées dans `cibles`, à plat. */
function valeursCibles(cibles, chemin = 'cibles', sortie = []) {
  if (typeof cibles === 'number') sortie.push({ chemin, valeur: cibles });
  else if (Array.isArray(cibles)) cibles.forEach((v, i) => valeursCibles(v, `${chemin}[${i}]`, sortie));
  else if (cibles && typeof cibles === 'object') {
    for (const [k, v] of Object.entries(cibles)) valeursCibles(v, `${chemin}.${k}`, sortie);
  }
  return sortie;
}

/* Les cibles ne sont écrites nulle part dans la page sous forme de nombres :
   elles y sont noyées dans des tableaux et des phrases. Elles sont donc
   relevées une fois, ici, à l'amorçage — et c'est ensuite la règle 10 qui
   garantit que la prose ne s'en écarte pas.

   `sodium_mg_jour` reste à null : le guide 5 ne fixe aucune cible de sodium.
   Mettre un chiffre plausible serait exactement ce que le document 8 interdit
   au §5.2 — le null est honnête, l'estimation se fait citer comme une mesure. */
const CIBLES = {
  calories_jour: 2000,
  proteines_g_jour: { min: 145, max: 165, moyenne_visee: 155, plancher_absolu: 130 },
  lipides_g_jour: { cible: 65, plancher: 50 },
  glucides_g_jour: 190,
  sodium_mg_jour: null,
  repartition: [
    { repas: 'dejeuner', calories: 450, proteines_g: 40 },
    { repas: 'diner', calories: 500, proteines_g: 40 },
    { repas: 'souper', calories: 750, proteines_g: 60 },
    { repas: 'collations', calories: 300, proteines_g: 25 },
  ],
};

/** La page → les sections de prose. */
function lire(html) {
  return SECTIONS.map((id) => versJson(id, trouverSection(html, id).interieur));
}

/** Les sections → la page. Les cibles ne se rendent pas : elles se vérifient. */
function reinjecter(html, sections) {
  for (const s of sections) html = remplacerSection(html, s.id, versSection(s));
  return html;
}

module.exports = {
  SECTIONS, versJson, versSection, nombresCites, valeursCibles, CIBLES,
  extraire: (html) => ({ cibles: CIBLES, sections: lire(html) }),
  lire,
  reinjecter,
  partieRendue: (plan) => plan.sections,
};
