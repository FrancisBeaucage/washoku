#!/usr/bin/env node
'use strict';
/* Les neuf règles du document 7 §9, plus les règles 10 à 21 des documents
   suivants. Chacune correspond à une erreur réellement survenue ; le but est
   qu'elle ne puisse plus passer inaperçue. Sortie non nulle dès qu'une règle
   échoue. */

const fs = require('fs');
const path = require('path');
const { SOURCES, RACINE, DATA, BASE_URL } = require('./lib/sources');
const { nombre } = require('./lib/champs');
const ensembles = require('./lib/ensembles');
const { nombresCites, valeursCibles } = require('./lib/plan');
const documents = require('./lib/documents');

const lire = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'));
const fiches = lire('guide-2-fiches.json');
const ingredients = lire('guide-3-ingredients.json');
const exercices = lire('guide-4-exercices.json');
const journal = fs.existsSync(path.join(DATA, 'guide-6-journal.json')) ? lire('guide-6-journal.json') : [];
const manifeste = fs.existsSync(path.join(DATA, 'manifeste.json')) ? lire('manifeste.json') : null;
const optionnel = (n) => (fs.existsSync(path.join(DATA, n)) ? lire(n) : null);
const annexes = optionnel('guide-2-annexes.json');
const plan = optionnel('guide-5-plan.json');
const historique = optionnel('historique-repas.json') || [];

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
for (const r of historique) for (const f of r.fiches || []) if (!identifiants.has(f)) renvois.push(`${r.date} ${r.repas} → fiches : ${f} inexistante`);
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

/* 9 — aucun compteur n'est ÉCRIT dans une page. La règle a changé de nature au
   document 20, et c'est un durcissement, pas un assouplissement.

   Avant, elle comparait des nombres écrits en dur dans les pages à ce que /data
   contenait. Elle a laissé passer une carte annonçant 56 fiches pour 74, parce
   qu'elle ne couvrait que deux phrases sur huit endroits. Maintenant, les pages
   ne portent AUCUN nombre : elles les calculent à l'affichage, à partir des
   mêmes fichiers que le reste du site. Un compteur ne peut donc plus périmer —
   sauf si quelqu'un en réécrit un à la main, et c'est ce que cette règle refuse.

   Le motif ne vise que les nombres suivis d'un nom de collection du dossier.
   « 140 g » ou « 2 L » ne sont pas des compteurs. */
const COLLECTIONS = /(\d+)\s+(fiches?|recettes?|techniques?|sections?|ingrédients?|entrées?|exercices?|annexes?)\b/g;
const durs = [];
for (const nom of fs.readdirSync(RACINE)) {
  if (!nom.endsWith('.html')) continue;
  const html = fs.readFileSync(path.join(RACINE, nom), 'utf8');
  for (const m of html.matchAll(COLLECTIONS)) {
    durs.push(`${nom} : « ${m[0]} » est un compteur écrit à la main ; il doit se calculer depuis /data`);
  }
}
regle(9, 'Aucun compteur n’est écrit en dur dans une page', durs);

/* ── Documents 8 et 9 ─────────────────────────────────────────────────── */

// 10 — la prose du guide 5 ne contredit pas les cibles chiffrées
const chiffres = [];
if (plan) {
  const cites = nombresCites(plan.sections);
  for (const { chemin, valeur } of valeursCibles(plan.cibles)) {
    if (!cites.has(valeur)) chiffres.push(`${chemin} = ${valeur} n’apparaît nulle part dans la prose`);
  }
  const somme = (cle) => plan.cibles.repartition.reduce((t, r) => t + r[cle], 0);
  if (somme('calories') !== plan.cibles.calories_jour) {
    chiffres.push(`repartition : ${somme('calories')} calories au total, cible ${plan.cibles.calories_jour}`);
  }
  if (somme('proteines_g') !== plan.cibles.proteines_g_jour.max) {
    chiffres.push(`repartition : ${somme('proteines_g')} g de protéines au total, cible haute ${plan.cibles.proteines_g_jour.max}`);
  }
}
regle(10, 'La prose du guide 5 s’accorde avec les cibles chiffrées', chiffres);

/* 11 — la mise en forme. Les champs texte des FICHES du guide 2 sont rendus
   tels quels par la page : une balise s’y afficherait en toutes lettres. Le
   journal, les annexes et le plan sont du HTML : les balises en ligne y sont
   permises, mais rien d’autre — et le markdown nulle part, il ne se rend
   jamais. */
const EN_LIGNE = /^<\/?(?:a|strong|em|span|br|sup)(?:[\s/>])/;
const IGNORER = new Set(['source', 'attrs', 'attrs_table', 'commentaire_source', 'infobulle']);

function parcourirTexte(valeur, ou, visiter, cle = null) {
  if (typeof valeur === 'string') return cle === null || IGNORER.has(cle) ? undefined : visiter(valeur, ou);
  if (Array.isArray(valeur)) return valeur.forEach((v, i) => parcourirTexte(v, `${ou}[${i}]`, visiter, cle));
  if (valeur && typeof valeur === 'object') {
    if (valeur.type === 'html') return undefined; // échappatoire assumée : du balisage brut
    for (const [k, v] of Object.entries(valeur)) {
      if (!IGNORER.has(k)) parcourirTexte(v, `${ou}.${k}`, visiter, k);
    }
  }
  return undefined;
}

const forme = [];
const CHAMPS_FICHE = (f) => [
  ['sous_titre', f.sous_titre],
  ...(f.ingredients || []).map((x, i) => [`ingredients[${i}]`, x.texte]),
  ...(f.etapes || []).map((x, i) => [`etapes[${i}]`, x.texte]),
  ...(f.notes || []).flatMap((x, i) => [[`notes[${i}].titre`, x.titre], [`notes[${i}].texte`, x.texte]]),
];
for (const f of fiches) {
  for (const [ou, texte] of CHAMPS_FICHE(f)) {
    if (typeof texte !== 'string') continue;
    if (texte.includes('<')) forme.push(`${f.id} → ${ou} : « < » interdit dans une fiche`);
    if (texte.includes('**')) forme.push(`${f.id} → ${ou} : « ** » ne se rend pas`);
    /* Le contrat de paragraphes du document 19 (S6) : les champs texte du
       guide 2 acceptent plusieurs paragraphes, séparés par DEUX sauts de ligne
       et rien d'autre. Un saut simple ne se rend pas — il se replie en espace
       dans le HTML — et c'est exactement le genre de mise en forme muette que
       cette règle existe pour refuser. */
    if (/(^|[^\n])\n(?!\n)/.test(texte)) forme.push(`${f.id} → ${ou} : saut de ligne simple ; un paragraphe se sépare par DEUX sauts`);
    if (texte !== texte.trim()) forme.push(`${f.id} → ${ou} : blanc en tête ou en queue`);
  }
}
for (const [nom, contenu] of [['guide 6', journal], ['annexes', annexes], ['guide 5', plan && plan.sections]]) {
  if (!contenu) continue;
  parcourirTexte(contenu, nom, (texte, ou) => {
    if (texte.includes('**')) forme.push(`${ou} : « ** » ne se rend pas`);
    for (const m of texte.matchAll(/</g)) {
      const bout = texte.slice(m.index);
      if (!EN_LIGNE.test(bout)) forme.push(`${ou} : balise non permise « ${bout.slice(0, 24)} »`);
    }
  });
}
regle(11, 'Aucune mise en forme qui ne se rendrait pas', forme);

/* 12 — les entrées de journal sont bien formées. Le « au moins un renvoi »
   demandé par le document 8 est la règle 8, qui ne s’exerçait jusqu’ici sur
   rien : le journal vivait dans le HTML. */
const REPAS = new Set(['dejeuner', 'diner', 'souper', 'preparation', 'journee']);
regle(12, 'Toute entrée de journal est bien formée', journal.flatMap((e) => {
  const maux = [];
  if (!REPAS.has(e.repas)) maux.push(`${e.id} : repas « ${e.repas} » hors de la liste`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) maux.push(`${e.id} : date « ${e.date} » mal formée`);
  if (e.id !== `K-${e.date}-${e.repas}`) maux.push(`${e.id} : identifiant incohérent avec la date et le repas`);
  (e.corps || []).forEach((b, i) => {
    if (b.type === 'figure' && !(e.photos || [])[b.photo]) maux.push(`${e.id} : corps[${i}] renvoie à une photo absente`);
  });
  return maux;
}));

// 13 — l’affichage nutritionnel ne dérive pas de la donnée
regle(13, 'Protéines affichées et protéines calculées concordent',
  actives.filter((f) => !f.nutrition.variable && f.nutrition.proteines_g != null)
    .map((f) => {
      const affiche = nombre(f.nutrition.proteines_affiche);
      if (affiche == null) return `${f.id} : « ${f.nutrition.proteines_affiche} » ne contient aucun nombre`;
      const ecart = Math.abs(affiche - f.nutrition.proteines_g) / Math.max(f.nutrition.proteines_g, 1);
      return ecart > 0.2 ? `${f.id} : affiché « ${f.nutrition.proteines_affiche} », donnée ${f.nutrition.proteines_g} g` : null;
    }).filter(Boolean));

// 14 — les renvois des annexes et des ingrédients pointent vers des fiches réelles
const morts = [];
for (const x of ingredients) for (const u of x.sert_dans || []) if (!identifiants.has(u)) morts.push(`${x.id} → sert_dans : ${u}`);
if (annexes) {
  for (const [id, a] of Object.entries(annexes)) {
    for (const f of a.fiches_liees || []) if (!identifiants.has(f)) morts.push(`annexe ${id} → fiches_liees : ${f}`);
  }
}
regle(14, 'Les renvois des annexes et des ingrédients aboutissent', morts);

/* 15 — la même donnée écrite deux fois par le même script doit rester la même.
   Une divergence ne signale pas une faute de saisie : elle signale un
   générateur cassé, et c'est ce qu'on veut apprendre tout de suite. */
const DOSSIER_FICHES = path.join(DATA, 'fiches');
const vues = [];
if (!fs.existsSync(DOSSIER_FICHES)) {
  vues.push('data/fiches/ absent — lancer `npm run generer`');
} else {
  for (const f of fiches) {
    const chemin = path.join(DOSSIER_FICHES, `${f.id}.json`);
    if (!fs.existsSync(chemin)) { vues.push(`${f.id} : data/fiches/${f.id}.json absent`); continue; }
    const seule = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    if (JSON.stringify(seule) !== JSON.stringify(f)) vues.push(`${f.id} : la fiche seule diffère du recueil`);
  }
  const connus = new Set(fiches.map((f) => `${f.id}.json`));
  for (const nom of fs.readdirSync(DOSSIER_FICHES)) {
    if (nom.endsWith('.json') && !connus.has(nom)) vues.push(`data/fiches/${nom} ne correspond à aucune fiche`);
  }
  const index = optionnel('index.json');
  if (!index) vues.push('data/index.json absent — lancer `npm run generer`');
  else if (index.length !== fiches.length) vues.push(`index.json : ${index.length} entrées pour ${fiches.length} fiches`);
  else {
    const parId = new Map(fiches.map((f) => [f.id, f]));
    for (const e of index) {
      const f = parId.get(e.id);
      if (!f) vues.push(`index.json : ${e.id} ne correspond à aucune fiche`);
      /* Dans index.json, une clé ABSENTE veut dire « rien ne le dit » : les
         valeurs vides ne s'y écrivent pas, parce que le fichier a un plafond de
         taille et que chaque ouverture de la liste le paie. La comparaison doit
         donc traiter l'absence comme un `null`, sans quoi la règle échouerait
         sur toute fiche sans protéines chiffrées. */
      else if (e.fr !== f.fr || e.statut !== f.statut || (e.proteines_g ?? null) !== f.nutrition.proteines_g) {
        vues.push(`index.json : ${e.id} a dérivé du recueil`);
      }
    }
  }
}
regle(15, 'Index et fiches seules concordent avec le recueil', vues);

/* 16 — le manifeste se suffit à lui-même. La règle 6 ne regardait que les
   compteurs : un `fichiers[]` périmé — entrée manquante, adresse absente —
   serait passé inaperçu, et c'est précisément ce qui rend le manifeste
   inutilisable comme point d'entrée. Un agent extérieur ne peut récupérer
   qu'une adresse qu'on lui a donnée ; une adresse absente n'est pas un détail
   cosmétique, c'est une porte fermée. */
const entree = [];
if (!manifeste) {
  entree.push('manifeste.json absent — lancer `npm run generer`');
} else {
  const listes = new Set((manifeste.fichiers || []).map((f) => f.nom));
  for (const nom of fs.readdirSync(DATA)) {
    if (!nom.endsWith('.json') || nom === 'manifeste.json' || nom.startsWith('.')) continue;
    if (!listes.has(nom)) entree.push(`${nom} existe dans /data mais n’est pas au manifeste`);
  }
  if (!listes.has('index.json')) entree.push('index.json n’est pas au manifeste');
  if (!listes.has('fiches/<ID>.json')) entree.push('le dossier fiches/ n’est pas au manifeste');

  for (const f of manifeste.fichiers || []) {
    if (!f.url) { entree.push(`${f.nom} : aucune adresse absolue`); continue; }
    if (!f.url.startsWith(`${BASE_URL}/data/`)) entree.push(`${f.nom} : adresse « ${f.url} » hors de ${BASE_URL}`);
    // Le dossier de fiches est un renvoi de répertoire ; les autres pointent leur fichier.
    else if (f.nom !== 'fiches/<ID>.json' && f.url !== `${BASE_URL}/data/${f.nom}`) {
      entree.push(`${f.nom} : l’adresse ne correspond pas au nom (${f.url})`);
    }
  }

  /* L'adresse de chaque fiche ne se recopie plus dans index.json — soixante-dix
     octets par entrée pour une chaîne qui ne varie que par l'identifiant. Le
     principe qui l'avait mise là tient toujours : un agent extérieur ne doit
     rien avoir à deviner. C'est donc le PATRON qui doit être publié, avec
     l'adresse du dossier, et c'est ça qu'on vérifie. */
  const dossier = (manifeste.fichiers || []).find((f) => f.nom === 'fiches/<ID>.json');
  if (dossier && dossier.url !== `${BASE_URL}/data/fiches/`) {
    entree.push(`fiches/<ID>.json : l’adresse du dossier devrait être ${BASE_URL}/data/fiches/`);
  }
  if (!(manifeste.protocole_de_lecture || []).some((l) => l.includes('fiches/<ID>.json'))) {
    entree.push('protocole_de_lecture ne dit pas comment atteindre une fiche seule');
  }
  if (!Array.isArray(manifeste.protocole_de_lecture) || !manifeste.protocole_de_lecture.length) {
    entree.push('protocole_de_lecture absent du manifeste');
  }

  /* Le numéro de document est un compteur comme les autres : il doit se
     déduire de l'état du dépôt. Il a été oublié une fois, et un manifeste
     périmé a coûté une session entière — c'est ce que cette vérification
     empêche de recommencer. */
  try {
    const attendu = documents.dernier();
    if (manifeste.dernier_document_applique !== attendu) {
      entree.push(`dernier_document_applique : manifeste ${manifeste.dernier_document_applique}, ${documents.NOM} ${attendu}`);
    }
  } catch (e) {
    entree.push(e.message);
  }
}
regle(16, 'Le manifeste se suffit à lui-même', entree);

/* 17 — l'historique. Le document 10 est explicite sur ce qui doit y être
   exact : ce ne sont pas les quantités, qui restent en langage naturel, ce sont
   LES DATES. C'est ce qui permet de dire « les crevettes ont trois jours, sers-
   les demain » sans avoir à le demander.

   L'inventaire, que cette règle contrôlait aussi, est sorti du site au document
   14. Les valeurs fermées de l'historique — `repas`, `verdict` — sont passées à
   la règle 19, qui les vérifie comme tous les autres champs du même genre. */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const idsJournal = new Set(journal.map((e) => e.id));

const suivi = [];
for (const r of historique) {
  const ou = `${r.date} ${r.repas}`;
  if (!ISO.test(r.date || '')) suivi.push(`${ou} : date mal formée`);
  if (!(r.fiches || []).length && !(r.hors_fiche || []).length) suivi.push(`${ou} : ni fiche ni hors-fiche, l’enregistrement ne dit rien`);
  if (r.journal != null && !idsJournal.has(r.journal)) suivi.push(`${ou} : renvoie à l’entrée de journal ${r.journal}, qui n’existe pas`);
  if (!Number.isInteger(r.convives) || r.convives < 1) suivi.push(`${ou} : convives doit être un entier positif`);
}
regle(17, 'L’historique est bien formé', suivi);

/* 18 — une vidéo sans sa chaîne. Vingt et une fiches portaient un
   `youtube_id` valide avec `auteur: null` : la page affiche alors une vidéo
   sans dire d'où elle vient, ce qui n'est ni honnête ni réparable plus tard
   sans redemander l'information à YouTube. L'inverse — un auteur sans vidéo —
   est du bruit resté après un retrait. */
regle(18, 'Toute vidéo dit de quelle chaîne elle vient', fiches.flatMap((f) => {
  const v = f.video || {};
  if (v.youtube_id && !v.auteur) return [`${f.id} : vidéo ${v.youtube_id} sans auteur`];
  if (!v.youtube_id && v.auteur) return [`${f.id} : auteur « ${v.auteur} » sans vidéo`];
  return [];
}));

/* 19 — les champs à valeurs fermées. Le document 13 donnait `section:
   "legumes"` pour une fiche d'ingrédient là où la clé réelle est `leg` :
   l'erreur a été rattrapée à la main, et AUCUNE RÈGLE NE L'AURAIT SIGNALÉE. Une
   clé inconnue ne fait pas planter la page — elle laisse la fiche hors de tout
   filtre de rayon, avec une étiquette vide, sans qu'aucun test échoue.

   Le défaut n'était pas la clé de rayon : c'était qu'aucun champ à valeurs
   fermées n'était vérifié contre son ensemble, et `section` n'en est qu'un sur
   dix. D'où une règle générique — une table `champ → ensemble permis` — plutôt
   que dix règles particulières qui laisseraient repasser la onzième.

   La table vit dans `lib/ensembles.js`, parce que le manifeste la publie aussi :
   un rédacteur de document peut lire les formes exactes par `curl` au lieu de
   les écrire de mémoire. La règle vérifie en queue que le manifeste dit bien la
   même chose que la table — deux copies d'un ensemble finiraient par diverger. */

/** Descend un chemin pointé (« nutrition.source ») ; `undefined` si la route casse. */
const suivre = (objet, chemin) => chemin.split('.').reduce((v, c) => (v == null ? undefined : v[c]), objet);

const PAR_FICHIER = {
  'guide-2-fiches.json': { entrees: fiches, ou: (f) => f.id },
  'guide-3-ingredients.json': { entrees: ingredients, ou: (x) => x.id },
  'guide-4-exercices.json': { entrees: exercices, ou: (e) => e.id },
  'historique-repas.json': { entrees: historique, ou: (r) => `${r.date} ${r.repas}` },
};

const fermes = [];
for (const t of ensembles.table()) {
  const source = PAR_FICHIER[t.fichier];
  if (!source) { fermes.push(`${t.fichier} : aucune donnée chargée pour ce fichier`); continue; }
  const permis = new Set(t.permis);
  const attendu = t.permis.join(', ') + (t.nul ? ', null' : '');
  const forme = t.forme || 'valeur';
  for (const entree of source.entrees || []) {
    const valeur = suivre(entree, t.champ);
    const ou = `${t.fichier} → ${source.ou(entree)}.${t.champ}`;

    /* `liste` : un tableau de valeurs de l'ensemble, la dominante en premier.
       Un tableau vide est le cas normal d'un champ pas encore rempli. */
    if (forme === 'liste') {
      if (valeur === undefined) { fermes.push(`${ou} : champ absent ; un tableau est attendu`); continue; }
      if (!Array.isArray(valeur)) { fermes.push(`${ou} = ${JSON.stringify(valeur)} ; un tableau est attendu`); continue; }
      for (const v of valeur) if (!permis.has(v)) fermes.push(`${ou} contient ${JSON.stringify(v)} ; permis : ${attendu}`);
      continue;
    }

    /* `par-lecteur` : un objet dont les CLÉS sont des lecteurs. C'est ce qui
       permet à un plat de valoir 2 étoiles pour l'un et 5 pour l'autre sans que
       le schéma impose le goût d'un lecteur à tous. Objet vide = personne ne
       s'est encore prononcé. */
    if (forme === 'par-lecteur') {
      if (valeur === undefined) { fermes.push(`${ou} : champ absent ; un objet par lecteur est attendu`); continue; }
      if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) {
        fermes.push(`${ou} = ${JSON.stringify(valeur)} ; un objet par lecteur est attendu`);
        continue;
      }
      for (const [lecteur, v] of Object.entries(valeur)) {
        if (v == null && t.nul) continue;
        if (!permis.has(v)) fermes.push(`${ou}.${lecteur} = ${JSON.stringify(v)} ; permis : ${attendu}`);
      }
      continue;
    }

    if (valeur == null && t.nul) continue;
    if (permis.has(valeur)) continue;
    const vue = valeur === undefined ? '(absent)' : JSON.stringify(valeur);
    fermes.push(`${ou} = ${vue} ; permis : ${attendu}`);
  }
}
if (manifeste) {
  const publie = JSON.stringify(manifeste.ensembles_fermes || null);
  if (publie !== JSON.stringify(ensembles.parFichier())) {
    fermes.push('manifeste : ensembles_fermes ne correspond plus à la table — lancer `npm run generer`');
  }
  if (JSON.stringify(manifeste.formes_fermees || null) !== JSON.stringify(ensembles.formesParFichier())) {
    fermes.push('manifeste : formes_fermees ne correspond plus à la table — lancer `npm run generer`');
  }
}
regle(19, 'Tout champ à valeurs fermées tient dans son ensemble', fermes);

/* 20 — aucun champ de /data ne se perd à la réextraction. `extraire.js` relit
   les pages pour reconstruire /data ; tout champ que la page ne rend pas doit
   donc être déclaré dans `champs_hors_page`, faute de quoi il est REMPLACÉ EN
   SILENCE par ce que le mapper recalcule. C'est arrivé trois fois sans être vu :
   `nutrition.variable` remis à `false` sur R64 et T9, `voir_aussi` vidé, la
   `note` de nutrition réécrite avec la phrase par défaut.

   La règle ne devine rien : elle fait l'aller-retour `versEntree` → `versJson`
   sur chaque entrée de /data et compare. Ce que l'aller-retour ne rend pas
   identique est exactement ce qu'une réextraction changerait.

   Deux limites connues, à ne pas confondre avec un défaut de la règle :
   — une fiche `retiré` n'est pas dans la page du tout, donc une réextraction la
     perdrait entière ; `champs_hors_page` n'y peut rien, il faudrait que
     `extraire.js` reprenne les entrées absentes du HTML ;
   — `extraire.js` est un script d'amorçage, lancé une fois. Le risque ne se
     matérialise qu'à un `--force`, ce qui est précisément quand personne ne
     relira 75 fiches à la main. */
const feuilles = (o, prefixe = '') => {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return [prefixe];
  return Object.entries(o).flatMap(([k, v]) => feuilles(v, prefixe ? `${prefixe}.${k}` : k));
};

const orphelins = [];
for (const src of SOURCES) {
  const chemin = path.join(DATA, `${src.cle}.json`);
  if (!fs.existsSync(chemin)) continue;
  const declares = [...(src.champs_hors_page || []), ...(src.champs_reconstitues || [])];
  /* Un chemin déclaré couvre aussi ses descendants. Sans ça, `etoiles` ne
     pourrait pas être déclaré : ses clés sont des NOMS DE LECTEURS, inconnus au
     moment d'écrire la table. Et `nutrition` du guide 3 aurait demandé onze
     déclarations pour un seul bloc. */
  const couvert = (c) => declares.some((d) => c === d || c.startsWith(`${d}.`));
  const perdus = new Map();
  for (const o of lire(`${src.cle}.json`)) {
    let retour;
    try {
      retour = src.mapper.versJson(src.mapper.versEntree(o));
    } catch (e) {
      orphelins.push(`${src.cle}.json → ${o.id} : aller-retour impossible (${e.message})`);
      continue;
    }
    for (const c of feuilles(o)) {
      if (couvert(c)) continue;
      if (JSON.stringify(suivre(o, c)) === JSON.stringify(suivre(retour, c))) continue;
      if (!perdus.has(c)) perdus.set(c, []);
      perdus.get(c).push(o.id);
    }
  }
  for (const [c, ids] of perdus) {
    const liste = ids.slice(0, 4).join(', ') + (ids.length > 4 ? `, … +${ids.length - 4}` : '');
    orphelins.push(`${src.cle}.json → ${c} : ${ids.length} entrée(s) perdraient leur valeur (${liste}) — déclarer dans champs_hors_page de lib/sources.js, ou corriger la donnée`);
  }
}
regle(20, 'Aucun champ de /data ne se perd à la réextraction', orphelins);

/* 21 — les trois obligations que le document 19 énonce en toutes lettres. Le
   dossier a une histoire constante sur ce point : une obligation que rien ne
   vérifie finit par être violée, et c'est toujours en silence. Les trois se
   ressemblent — chacune interdit qu'un chiffre ou un jugement soit porté sans ce
   qui le rend interprétable.

   — S3 : `motif_statut` est OBLIGATOIRE quand `statut_perso` vaut `suspendu` ou
     `ecarte`. Sans lui, on ne distingue pas « je n'aime pas ce plat » de « je
     n'aime pas la façon dont je l'ai fait » — et c'est précisément la
     distinction qui a manqué au shimeji, écarté après un second essai fait sans
     la sauce soya ni le corps gras qui portent ses arômes.
   — S5 : `nutrition.base` est OBLIGATOIRE dès qu'un chiffre est porté ; forcer
     les 100 g sur une sauce de poisson donne un chiffre juste et inutilisable.
     Et `nutrition.produit_lu` est OBLIGATOIRE quand la source est `etiquette` :
     deux marques de sauce d'huîtres n'ont pas le même sodium, et un chiffre sans
     son produit ne se vérifie ni ne se remplace.
   — S8 : un temps de `temps_minutes` est un nombre, ou une fourchette
     {min, max} avec min ≤ max. R56 portait deux méthodes de 40 à 75 minutes
     sous un seul chiffre de 47, faux pour les deux. */
const CHIFFRES_NUTRITION = ['calories', 'proteines_g', 'lipides_g', 'sodium_mg', 'sucres_g', 'calcium_mg', 'base_g'];
const obligations = [];

for (const f of fiches) {
  const perso = f.statut_perso || {};
  const motifs = f.motif_statut || {};
  for (const [lecteur, valeur] of Object.entries(perso)) {
    if (valeur !== 'suspendu' && valeur !== 'ecarte') continue;
    if (!String(motifs[lecteur] || '').trim()) {
      obligations.push(`${f.id} : statut_perso.${lecteur} = ${valeur} sans motif_statut.${lecteur}`);
    }
  }
  for (const [cle, valeur] of Object.entries(f.temps_minutes || {})) {
    if (typeof valeur === 'number') continue;
    if (valeur && typeof valeur === 'object'
      && typeof valeur.min === 'number' && typeof valeur.max === 'number'
      && Object.keys(valeur).length === 2) {
      if (valeur.min > valeur.max) obligations.push(`${f.id} : temps_minutes.${cle} — min ${valeur.min} au-dessus de max ${valeur.max}`);
      continue;
    }
    obligations.push(`${f.id} : temps_minutes.${cle} = ${JSON.stringify(valeur)} ; un nombre ou {min, max} est attendu`);
  }
}

for (const x of ingredients) {
  const n = x.nutrition;
  if (!n) { obligations.push(`${x.id} : bloc nutrition absent`); continue; }
  const chiffres = CHIFFRES_NUTRITION.filter((c) => n[c] != null);
  if (chiffres.length && !n.base) obligations.push(`${x.id} : nutrition porte ${chiffres.join(', ')} sans base de dosage`);
  if (chiffres.length && !n.source) obligations.push(`${x.id} : nutrition porte ${chiffres.join(', ')} sans source`);
  if (n.source === 'etiquette' && !String(n.produit_lu || '').trim()) {
    obligations.push(`${x.id} : nutrition.source = etiquette sans produit_lu`);
  }
  if (n.source && !ISO.test(n.date_lecture || '')) {
    obligations.push(`${x.id} : nutrition.source = ${n.source} sans date_lecture au format AAAA-MM-JJ`);
  }
  if (!n.source && chiffres.length === 0 && (n.produit_lu || n.date_lecture)) {
    obligations.push(`${x.id} : nutrition porte un produit ou une date sans aucun chiffre`);
  }
}
regle(21, 'Aucun chiffre ni jugement sans ce qui le rend interprétable', obligations);

/* 22 — le rendu client des blocs de prose doit être IDENTIQUE au rendu Node.

   Les données de prose du site — guide 1, annexes, plan, journal — sont des
   listes de blocs, pas du HTML : c'est ce qui permet à un document de mise à
   jour de corriger un paragraphe sans toucher à du balisage. Deux consommateurs
   les rendent : `prose.rendre`, côté outillage, et son miroir côté page, dans
   `lib/vue.js`. Deux copies d'un rendu finissent toujours par diverger, et la
   divergence serait INVISIBLE — la page afficherait simplement un peu moins
   bien, sans que rien n'échoue.

   La règle évalue la chaîne du rendu client dans Node et la compare, bloc par
   bloc, sur TOUT ce que /data contient. Aucun échantillonnage : c'est la queue
   des cas rares — grilles imbriquées, figures à attributs — qui diverge en
   premier. */
const prose = require('./lib/prose');
const vue = require('./lib/vue');

const rendus = [];
{
  let RBS;
  try {
    // eslint-disable-next-line no-new-func
    RBS = new Function('window', `${vue.RENDU_BLOCS}\nreturn RBS;`)({ React: { createElement: () => null } });
  } catch (e) {
    rendus.push(`le rendu client de lib/vue.js ne s'évalue pas : ${e.message}`);
  }
  const corpsDeData = [];
  for (const g of require('./lib/pages').GUIDES_PROSE) {
    for (const s of optionnel(g.fichier) || []) corpsDeData.push([`guide ${g.guide} ${s.id}`, s.corps]);
  }
  if (annexes) for (const [id, a] of Object.entries(annexes)) if (a.corps) corpsDeData.push([`annexe ${id}`, a.corps]);
  if (plan) for (const s of plan.sections) corpsDeData.push([`guide 5 ${s.id}`, s.corps]);
  for (const e of journal) {
    /* Le journal sort ses photos du corps et n'y garde qu'un renvoi par rang ;
       la page les y remet pour l'affichage. On compare la forme affichée. */
    corpsDeData.push([`journal ${e.id}`, (e.corps || []).map((b) =>
      (b.type === 'figure' && e.photos && e.photos[b.photo])
        ? { ...b, ...e.photos[b.photo], photo: undefined }
        : b)]);
  }
  if (RBS) {
    for (const [ou, corps] of corpsDeData) {
      let attendu;
      let obtenu;
      try { attendu = prose.rendre(corps || [], '  ', ''); } catch (e) { rendus.push(`${ou} : prose.rendre lève (${e.message})`); continue; }
      try { obtenu = RBS(corps || [], '  ', ''); } catch (e) { rendus.push(`${ou} : le rendu client lève (${e.message})`); continue; }
      if (obtenu !== attendu) {
        let i = 0;
        while (i < obtenu.length && i < attendu.length && obtenu[i] === attendu[i]) i += 1;
        rendus.push(`${ou} : les deux rendus divergent au caractère ${i} — « ${attendu.slice(i, i + 40)} » contre « ${obtenu.slice(i, i + 40)} »`);
      }
    }
  }
}
regle(22, 'Le rendu client des blocs est identique au rendu de prose.js', rendus);

/* 23 — aucun lien interne mort. C'est le risque le plus élevé du document 20 :
   il déplace toutes les pages du site, et LES LIENS SONT DANS DU CONTENU, pas
   dans un gabarit. Le guide 1 porte à lui seul onze renvois vers
   `guide-2-recettes.html#T1`, `#R14`, `#the`… Un lien cassé ne lève rien : il
   amène le lecteur en haut d'une page qui n'a rien à voir.

   La règle suit les liens des DEUX côtés : ceux qui sont dans /data, et ceux
   qui sont dans les pages générées. Et elle fait passer les anciennes adresses
   par la table de redirection, pour vérifier que l'ancre aboutit vraiment. */
const pagesLib = require('./lib/pages');
const liens = [];
{
  const idsFiches = new Set(fiches.map((f) => f.id));
  const idsIngredients = new Set(ingredients.map((x) => x.id));
  /* Les trois guides de prose numérotent tous leurs sections `s1`, `s2`… : les
     identifiants ne sont uniques QUE dans leur guide. C'est pour ça que
     l'adresse porte `guide=N`, et c'est ce couple-là qu'il faut vérifier. */
  const idsSections = new Map(pagesLib.GUIDES_PROSE.map((g) => [
    String(g.guide),
    new Set((optionnel(g.fichier) || []).map((s) => s.id)),
  ]));
  const idsAnnexes = new Set(Object.keys(annexes || {}));
  const parRedirection = new Map(pagesLib.REDIRECTIONS.map((r) => [r.de, r]));

  const verifierCible = (href, ou) => {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(href)) return;
    const [chemin, ancre] = href.split('#');
    const [fichier, requete] = chemin.split('?');
    if (!fichier) return;
    if (!fs.existsSync(path.join(RACINE, fichier))) { liens.push(`${ou} → ${href} : ${fichier} n'existe pas`); return; }

    const id = new URLSearchParams(requete || '').get('id');
    const manque = (quoi) => liens.push(`${ou} → ${href} : ${quoi}`);
    if (fichier === 'fiche.html' && id && !idsFiches.has(id)) manque(`aucune fiche « ${id} »`);
    if (fichier === 'ingredient.html' && id && !idsIngredients.has(id)) manque(`aucun ingrédient « ${id} »`);
    if (fichier === 'guide-section.html' && id) {
      const num = new URLSearchParams(requete || '').get('guide') || '1';
      const connues = idsSections.get(num);
      if (!connues) manque(`aucun guide de prose numéro ${num}`);
      else if (!connues.has(id)) manque(`aucune section « ${id} » dans le guide ${num}`);
    }
    if (fichier === 'annexe.html' && id && !idsAnnexes.has(id)) manque(`aucune annexe « ${id} »`);

    /* Une ancienne adresse : la redirection doit savoir traduire son ancre. On
       rejoue sa logique ici plutôt que de faire confiance — c'est exactement le
       genre de traduction qui marche pour neuf ancres sur onze. */
    const r = parRedirection.get(fichier);
    if (!r || !ancre || ancre in pagesLib.ANCRES_LISTES) return;
    if (r.annexes && /^[TR]\d/.test(ancre)) {
      if (!idsFiches.has(ancre)) manque(`ancre #${ancre} : aucune fiche de ce nom`);
      return;
    }
    if (r.annexes) {
      if (!(ancre in pagesLib.ANCRES_ANNEXES)) manque(`ancre #${ancre} : la redirection ne sait pas où l'envoyer`);
      else if (pagesLib.ANCRES_ANNEXES[ancre] && !idsAnnexes.has(pagesLib.ANCRES_ANNEXES[ancre])) manque(`ancre #${ancre} : annexe « ${pagesLib.ANCRES_ANNEXES[ancre]} » absente`);
      return;
    }
    if (r.guide && /^(s\d+|poudres)$/.test(ancre)) {
      const connues = idsSections.get(String(r.guide));
      if (!connues || !connues.has(ancre)) manque(`ancre #${ancre} : aucune section de ce nom dans le guide ${r.guide}`);
      return;
    }
    if (r.ingredients) {
      if (!idsIngredients.has(ancre)) manque(`ancre #${ancre} : aucun ingrédient de ce nom`);
      return;
    }
    /* La cible garde ses ancres de page : la redirection repasse le fragment
       tel quel, mais l'identifiant doit exister dans les données qui rendent
       cette page — sinon on arrive en haut, ce qui est le défaut silencieux
       exact que cette règle existe pour attraper. */
    if ('ancresPage' in r) {
      if (!r.ancresPage) return;
      const d = optionnel(r.ancresPage);
      const connues = new Set((Array.isArray(d) ? d : (d && d.sections) || []).map((x) => x.id));
      if (!connues.has(ancre)) manque(`ancre #${ancre} : aucune section de ce nom dans ${r.ancresPage}`);
      return;
    }
    manque(`ancre #${ancre} : la redirection de ${fichier} ne sait pas où l'envoyer`);
  };

  const HREF = /href="([^"]*)"/g;
  const dansTexte = (v, ou) => {
    if (typeof v === 'string') { for (const m of v.matchAll(HREF)) verifierCible(m[1], ou); return; }
    if (Array.isArray(v)) return v.forEach((x, i) => dansTexte(x, ou));
    if (v && typeof v === 'object') return Object.values(v).forEach((x) => dansTexte(x, ou));
  };
  for (const g of pagesLib.GUIDES_PROSE) {
    for (const s of optionnel(g.fichier) || []) dansTexte(s, `guide ${g.guide} ${s.id}`);
  }
  if (annexes) for (const [id, a] of Object.entries(annexes)) dansTexte(a, `annexe ${id}`);
  if (plan) dansTexte(plan.sections, 'guide 5');
  for (const e of journal) dansTexte(e.corps, `journal ${e.id}`);
  for (const x of ingredients) dansTexte([x.description, x.note, x.ou_le_trouver, x.a_quoi_ca_ressemble], `ingrédient ${x.id}`);

  /* Les pages générées. Leurs liens à gabarit — `fiche.html?id={{ r.id }}` —
     ne se vérifient pas ici : l'identifiant vient des données, et la règle 2
     couvre déjà les identifiants. On ne garde que les liens EN DUR. */
  for (const nom of fs.readdirSync(RACINE)) {
    if (!nom.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(RACINE, nom), 'utf8');
    for (const m of html.matchAll(HREF)) if (!m[1].includes('{{')) verifierCible(m[1], `page ${nom}`);
  }
}
regle(23, 'Aucun lien interne mort, ancres des anciennes adresses comprises', liens);

/* 24 — le poids de l'index. C'est le budget de la page de liste : elle le
   charge en entier à chaque ouverture, sur un téléphone, souvent sur données
   cellulaires. Le document 20 fixe la cible à 60 Ko pour 180 fiches. Le
   plafond est vérifié SUR CE QUI PART SUR LE FIL, donc après compression —
   c'est ce que le lecteur paie réellement, et GitHub Pages compresse. La
   taille brute est affichée à côté, parce que c'est elle qui dérive en premier. */
const budget = [];
{
  const chemin = path.join(DATA, 'index.json');
  if (!fs.existsSync(chemin)) budget.push('index.json absent');
  else {
    const brut = fs.readFileSync(chemin);
    const n = Math.max(1, fiches.length);
    const gz = require('zlib').gzipSync(brut, { level: 9 }).length;
    const projete = (gz / n) * 180;
    if (projete > 60 * 1024) {
      budget.push(`index.json : ${(gz / 1024).toFixed(1)} Ko compressés pour ${n} fiches, soit ${(projete / 1024).toFixed(1)} Ko projetés à 180 — au-dessus du plafond de 60 Ko`);
    }
  }
}
regle(24, 'L’index reste sous son plafond de taille', budget);

/* 25 — le nom d'origine ne se dit qu'une fois. Le document 23 ajoute
   `nom_origine` et `lecture_origine` parce que `jp` est un champ JAPONAIS et
   que vingt-quatre des vingt-huit fiches des documents 21 et 22 se nomment en
   chinois, en lao, en coréen, en thaï, en vietnamien ou en indonésien.

   Deux paires coexistent donc pour un même fait, et c'est l'état transitoire
   que la règle surveille : une fiche remplit l'UNE ou l'AUTRE, jamais les deux.
   Deux sources pour un même nom, c'est deux sources qui finissent par diverger,
   et un document futur qui cherche « le nom d'origine » ne saurait pas laquelle
   lire.

   ⚠️ CE QUE LA RÈGLE NE VÉRIFIE PAS, ET POURQUOI. Dix-sept des 79 fiches
   d'origine portent encore du non-japonais dans `jp` — 酸辣湯, 순두부찌개,
   上漿. Le document 23 défère leur migration, et il a raison pour une raison
   plus forte que celle qu'il donne : elle N'EST PAS MÉCANIQUE. Sept de ces
   dix-sept portent une écriture native (T5, R25, R26, R29, R30, R35, R39) ;
   les dix autres portent un vrai nom JAPONAIS d'un plat étranger — 韓国風丼,
   ブンチャー, 牛肉とブロッコリー — qui appartient légitimement à `jp`. Trier les
   deux demande un jugement par fiche, donc une table dans un document, pas une
   règle. */
const origines = [];
for (const f of fiches) {
  if (f.jp && f.nom_origine) origines.push(`${f.id} : porte à la fois jp « ${f.jp} » et nom_origine « ${f.nom_origine} » — un nom, un champ`);
  if (f.lecture_origine && !f.nom_origine) origines.push(`${f.id} : lecture_origine « ${f.lecture_origine} » sans nom_origine`);
  if ((f.romaji || f.jp_lecture) && !f.jp) origines.push(`${f.id} : romaji ou jp_lecture sans jp`);
}
regle(25, 'Le nom d’origine ne se dit qu’une fois', origines);

console.log('');
if (echecs.length) { console.error(`${echecs.length} règle(s) en échec.`); process.exit(1); }
console.log(`Validation complète : ${fiches.length} fiches, ${ingredients.length} ingrédients, ${exercices.length} exercices, ${journal.length} entrées de journal, ${historique.length} repas.`);
