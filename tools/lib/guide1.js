'use strict';
/* Le guide 1 en données. C'était le seul guide du site sans fichier de /data
   derrière lui : 154 Ko de prose écrits à la main, donc le seul contenu que la
   cascade de lecture ne pouvait pas atteindre et qu'aucun document numéroté ne
   pouvait corriger. Un angle mort de 154 Ko — document 20, S12.

   L'extraction est MÉCANIQUE et elle est vérifiée : `rendre(analyser(x)) === x`
   au caractère près, comme pour le journal et les annexes. Aucune prose n'est
   réécrite ici. Une section qui ne repasse pas l'aller-retour arrête
   l'extraction plutôt que d'être rafistolée — une section mal extraite est un
   contenu perdu que personne ne remarque.

   La structure de `corps` est celle de `guide-6-journal.json`, réutilisée telle
   quelle : elle existe, elle est éprouvée, et inventer un second format de
   prose aurait coûté deux fois. Les figures du guide 1 portent des attributs
   que `prose.js` ne modélise pas (`referrerpolicy`, `style`) : elles tombent
   dans le bloc `html`, qui les conserve mot pour mot. */

const P = require('./prose');

/* Les six groupes sont les INTERTITRES du guide, pas des sections : ils ne
   portent aucun contenu. Ils vivent ici parce que le HTML les exprime par des
   bandeaux noirs sans identifiant, donc rien ne les rattache aux sections. */
const GROUPES = ['comprendre', 'organiser', 'repas', 'sante', 'vie-reelle', 'demarrer'];

const LIBELLES_GROUPES = {
  comprendre: 'Comprendre',
  organiser: 'S’organiser',
  repas: 'Les repas',
  sante: 'Santé',
  'vie-reelle': 'La vie réelle',
  demarrer: 'Démarrer',
};

/* Le groupe de chaque section, tel que le document 20 le fixe. Les
   identifiants `s1` à `s22` sont CONSERVÉS : le guide en contient déjà des
   liens internes, et les renuméroter casserait des ancres sans lever d'erreur.
   Même raisonnement que pour les identifiants de fiche. */
const GROUPE_PAR_SECTION = {
  s1: 'comprendre', s2: 'comprendre', s3: 'comprendre', s4: 'comprendre', s5: 'comprendre',
  s6: 'organiser', s7: 'organiser', s8: 'organiser',
  s9: 'repas', s10: 'repas', s11: 'repas', s12: 'repas',
  s13: 'sante', s14: 'sante', s15: 'sante', s16: 'sante', s17: 'sante',
  s18: 'vie-reelle', s19: 'vie-reelle',
  s20: 'demarrer', s21: 'demarrer', s22: 'demarrer',
};

const STATUT = ['actif', 'retiré'];

/** Toutes les sections `<section id="sN" class="sec">` de la page, en ordre. */
function decouperSections(html) {
  const re = /\n  <section id="(s\d+)" class="sec"><div class="in">([\s\S]*?)<\/div><\/section>/g;
  const trouvees = [];
  let m;
  while ((m = re.exec(html))) trouvees.push({ id: m[1], interieur: m[2], source: m[0] });
  return trouvees;
}

/** Le titre d'une section : le `<h2>` de son en-tête, sans balisage. */
function titreDe(interieur, id) {
  const m = interieur.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (!m) throw new Error(`${id} : aucun <h2> — titre introuvable`);
  return m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * La page → les 22 sections. Lève dès qu'une section ne repasse pas
 * l'aller-retour : c'est le seul contrôle qui prouve que rien n'a été perdu.
 */
function extraire(html) {
  const sections = decouperSections(html);
  if (!sections.length) throw new Error('guide 1 : aucune section trouvée');

  return sections.map(({ id, interieur }) => {
    const groupe = GROUPE_PAR_SECTION[id];
    if (!groupe) throw new Error(`${id} : aucun groupe déclaré`);
    const { blocs } = P.analyser(interieur, '    ');
    const rendu = P.rendre(blocs, '    ', '\n  ');
    if (rendu !== interieur) {
      throw new Error(`${id} : l'aller-retour n'est pas exact, extraction refusée`);
    }
    return { id, statut: 'actif', groupe, titre: titreDe(interieur, id), resume: null, corps: blocs };
  });
}

/** Les sections → l'intérieur de leur `<div class="in">`. */
function rendreSection(section) {
  return P.rendre(section.corps, '    ', '\n  ');
}

/** La page telle qu'elle est aujourd'hui, reconstituée depuis les données. */
function reinjecter(html, sections) {
  let sortie = html;
  for (const s of sections) {
    const { source, interieur } = decouperSections(sortie).find((x) => x.id === s.id) || {};
    if (source == null) throw new Error(`${s.id} : section absente de la page`);
    sortie = sortie.replace(source, source.replace(interieur, rendreSection(s)));
  }
  return sortie;
}

module.exports = {
  GROUPES, LIBELLES_GROUPES, GROUPE_PAR_SECTION, STATUT,
  extraire, reinjecter, rendreSection, decouperSections,
  partieRendue: (sections) => sections.filter((s) => s.statut !== 'retiré'),
};
