#!/usr/bin/env node
'use strict';
/* Les neuf règles du document 7 §9, plus les règles 10 à 15 des documents 8 et
   9. Chacune correspond à une erreur réellement survenue ; le but est qu'elle ne
   puisse plus passer inaperçue. Sortie non nulle dès qu'une règle échoue. */

const fs = require('fs');
const path = require('path');
const { RACINE, DATA, BASE_URL } = require('./lib/sources');
const { nombre, CATEGORIES, CUISINES, VITESSES } = require('./lib/champs');
const { lireBloc } = require('./lib/blocs');
const compteurs = require('./lib/compteurs');
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

/* 9 — les compteurs ne sont plus écrits en dur dans les pages. La règle ne
   couvrait que deux phrases de prose, et passait au vert pendant que la carte
   du guide 2 de la page d'accueil annonçait 56 fiches pour 74. Le document 15
   lui ajoute les six pieds de carte, qui se calculent maintenant à la
   génération — même table que `generer.js`, pour qu'aucune des deux ne puisse
   en oublier un. */
const durs = [];
for (const [page, motifs] of Object.entries({
  'guide-2-recettes.html': [/(\d+) techniques, (\d+) recettes/],
  'index.html': [/(\d+) recettes et (\d+) techniques/],
})) {
  const html = fs.readFileSync(path.join(RACINE, page), 'utf8');
  for (const m of motifs) {
    const t = html.match(m);
    if (!t) { durs.push(`${page} : compteur introuvable`); continue; }
    const [, a, b] = t.map(Number);
    const [tech, rec] = page === 'index.html' ? [b, a] : [a, b];
    if (tech !== attendus.techniques || rec !== attendus.recettes) {
      durs.push(`${page} : affiche ${tech} techniques / ${rec} recettes, contenu ${attendus.techniques} / ${attendus.recettes}`);
    }
  }
}
const accueil = fs.readFileSync(path.join(RACINE, compteurs.PAGE), 'utf8');
for (const c of compteurs.cartes()) {
  const actuel = compteurs.lireCarte(accueil, c);
  if (actuel === null) durs.push(`${compteurs.PAGE} : pied de carte introuvable pour ${c.href}`);
  else if (actuel !== c.libelle) durs.push(`${compteurs.PAGE} : carte ${c.href} affiche « ${actuel} », contenu « ${c.libelle} »`);
}
regle(9, 'Les nombres affichés dans les pages sont à jour', durs);

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
      else if (e.fr !== f.fr || e.statut !== f.statut || e.proteines_g !== f.nutrition.proteines_g) {
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

  const index = optionnel('index.json');
  if (index) {
    for (const e of index) {
      if (e.url !== `${BASE_URL}/data/fiches/${e.id}.json`) { entree.push(`index.json : ${e.id} porte une adresse inattendue`); break; }
    }
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
   neuf. D'où une règle générique — une table `champ → ensemble permis` — plutôt
   que neuf règles particulières qui laisseraient repasser la dixième.

   Les ensembles se lisent là où ils sont DÉJÀ définis, jamais recopiés ici :
   les libellés de `champs.js` pour la catégorie, la cuisine et la vitesse ; le
   tableau `SECS` de la page du guide 3 pour les rayons. Recopier créerait une
   seconde source de vérité, et déplacerait le problème au lieu de le régler. */

const clesSecs = () => {
  const html = fs.readFileSync(path.join(RACINE, 'guide-3-supermarche.html'), 'utf8');
  return lireBloc(html, 'SECS').map((s) => s.k);
};

/* `retiré` porte son accent : c'est la valeur que `generer.js` et `sources.js`
   comparent pour écarter une entrée de la page. Un `retire` sans accent y
   passerait pour une fiche active — il n'est donc pas permis ici. */
const STATUT = new Set(['actif', 'retiré']);
/* Les trois provenances documentées par le commentaire de `lib/fiches.js` et la
   section « Nutrition » du LISEZMOI. `etiquette` et `pese` ne sont attestées
   dans aucune donnée : elles serviront le jour où `lipides_g` et `sodium_mg`
   seront relevés sur de vraies étiquettes. */
const SOURCES_NUTRITION = new Set(['estime', 'etiquette', 'pese']);
/* `journee` a disparu au document 14 : la seule entrée qui l'utilisait agrégeait
   un déjeuner et un dîner sans rapport, et a été scindée en deux. Le champ
   `repas` du guide 6 est un autre champ, sur un autre fichier — voir règle 12. */
const REPAS_HISTORIQUE = new Set(['dejeuner', 'diner', 'souper', 'collation']);
const VERDICTS = new Set(['excellent', 'bon', 'correct', 'rate', 'rejete']);

const A_VALEURS_FERMEES = [
  { fichier: 'guide-2-fiches.json', entrees: fiches, ou: (f) => f.id, champ: 'statut', permis: STATUT },
  { fichier: 'guide-2-fiches.json', entrees: fiches, ou: (f) => f.id, champ: 'categorie', permis: new Set(Object.values(CATEGORIES)) },
  { fichier: 'guide-2-fiches.json', entrees: fiches, ou: (f) => f.id, champ: 'cuisine', permis: new Set(Object.values(CUISINES)) },
  { fichier: 'guide-2-fiches.json', entrees: fiches, ou: (f) => f.id, champ: 'vitesse', permis: new Set(Object.values(VITESSES)) },
  { fichier: 'guide-2-fiches.json', entrees: fiches, ou: (f) => f.id, champ: 'nutrition.source', permis: SOURCES_NUTRITION },
  { fichier: 'guide-3-ingredients.json', entrees: ingredients, ou: (x) => x.id, champ: 'statut', permis: STATUT },
  { fichier: 'guide-3-ingredients.json', entrees: ingredients, ou: (x) => x.id, champ: 'section', permis: new Set(clesSecs()) },
  { fichier: 'guide-4-exercices.json', entrees: exercices, ou: (e) => e.id, champ: 'statut', permis: STATUT },
  { fichier: 'historique-repas.json', entrees: historique, ou: (r) => `${r.date} ${r.repas}`, champ: 'repas', permis: REPAS_HISTORIQUE },
  { fichier: 'historique-repas.json', entrees: historique, ou: (r) => `${r.date} ${r.repas}`, champ: 'verdict', permis: VERDICTS, nul: true },
];

/** Descend un chemin pointé (« nutrition.source ») ; `undefined` si la route casse. */
const suivre = (objet, chemin) => chemin.split('.').reduce((v, c) => (v == null ? undefined : v[c]), objet);

const fermes = [];
for (const t of A_VALEURS_FERMEES) {
  const attendu = [...t.permis].join(', ') + (t.nul ? ', null' : '');
  for (const entree of t.entrees || []) {
    const valeur = suivre(entree, t.champ);
    if (valeur == null && t.nul) continue;
    if (t.permis.has(valeur)) continue;
    const vue = valeur === undefined ? '(absent)' : JSON.stringify(valeur);
    fermes.push(`${t.fichier} → ${t.ou(entree)}.${t.champ} = ${vue} ; permis : ${attendu}`);
  }
}
regle(19, 'Tout champ à valeurs fermées tient dans son ensemble', fermes);

console.log('');
if (echecs.length) { console.error(`${echecs.length} règle(s) en échec.`); process.exit(1); }
console.log(`Validation complète : ${fiches.length} fiches, ${ingredients.length} ingrédients, ${exercices.length} exercices, ${journal.length} entrées de journal, ${historique.length} repas.`);
