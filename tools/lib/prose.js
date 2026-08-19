'use strict';
/* Aller-retour entre la prose des pages et une liste de blocs JSON.
   Les blocs sont repérés par leur CLASSE, jamais par leur style : c'est la
   seule partie du balisage qui soit stable. Tout ce qui n'entre dans aucun
   modèle est conservé mot pour mot dans un bloc `html`.

   L'aller-retour est exact au caractère près, et c'est ce qui rend la
   migration sûre : `rendre(analyser(x)) === x` est vérifié à chaque
   génération, exactement comme le contrôle de non-perte des fiches. */

const VIDES = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'col']);

/**
 * Découpe un fragment en éléments de premier niveau, en conservant les blancs
 * qui les séparent. Retourne [{ blanc, source }] — `blanc` est ce qui précède.
 */
function decouper(fragment) {
  const balise = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  const morceaux = [];
  let profondeur = 0;
  let debut = null;
  let curseur = 0;
  let m;
  while ((m = balise.exec(fragment))) {
    if (m[0].startsWith('<!--')) {
      if (profondeur === 0) {
        morceaux.push({ blanc: fragment.slice(curseur, m.index), source: m[0] });
        curseur = m.index + m[0].length;
      }
      continue;
    }
    const [, fermante, nom, , autoferme] = m;
    if (VIDES.has(nom.toLowerCase()) || autoferme) {
      if (profondeur === 0) {
        morceaux.push({ blanc: fragment.slice(curseur, m.index), source: m[0] });
        curseur = m.index + m[0].length;
      }
      continue;
    }
    if (!fermante) {
      if (profondeur === 0) debut = m.index;
      profondeur += 1;
    } else {
      profondeur -= 1;
      if (profondeur < 0) throw new Error(`balise fermante orpheline : ${m[0]}`);
      if (profondeur === 0) {
        const fin = m.index + m[0].length;
        morceaux.push({ blanc: fragment.slice(curseur, debut), source: fragment.slice(debut, fin) });
        curseur = fin;
      }
    }
  }
  if (profondeur !== 0) throw new Error('fragment déséquilibré');
  const reste = fragment.slice(curseur);
  if (reste.trim()) throw new Error(`texte hors élément : « ${reste.trim().slice(0, 40)} »`);
  return { morceaux, queue: reste };
}

/** Attributs d'une balise ouvrante, sous forme brute et sous forme de table. */
function attributs(source) {
  const m = source.match(/^<([a-zA-Z][\w-]*)((?:\s[^>]*?)?)\/?>/);
  if (!m) throw new Error(`balise ouvrante illisible : ${source.slice(0, 40)}`);
  const table = {};
  const re = /([\w-]+)="([^"]*)"/g;
  let a;
  while ((a = re.exec(m[2]))) table[a[1]] = a[2];
  return { nom: m[1], brut: m[2], table, interieur: source.slice(m[0].length, source.lastIndexOf('</')) };
}

/** Ce qui reste des attributs une fois `class` retirée — à réémettre tel quel. */
function attrsSansClasse(brut) {
  return brut.replace(/\sclass="[^"]*"/, '');
}

/* Les champs de présentation vides ne s'écrivent pas. Le journal est fait pour
   être écrit à la main : lui imposer `attrs: ''` sur chaque paragraphe serait
   une taxe pure. `rendreBloc` traite l'absence et la chaîne vide pareil. */
function sansVides(o) {
  for (const cle of ['attrs', 'attrs_table', 'classe']) if (o[cle] === '') delete o[cle];
  return o;
}

/* ── Analyse ──────────────────────────────────────────────────────────── */

function analyserListe(source) {
  const { nom, brut, table, interieur } = attributs(source);
  const elements = [];
  const re = /<li((?:\s[^>]*?)?)>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(interieur))) elements.push(m[1] ? { attrs: m[1], texte: m[2] } : { texte: m[2] });
  if (!elements.length) return null;
  return sansVides({
    type: 'liste',
    ordonnee: nom === 'ol',
    classe: table.class || '',
    attrs: attrsSansClasse(brut),
    elements,
  });
}

function analyserTableau(source) {
  const { brut, interieur } = attributs(source);
  const t = interieur.match(/^<table((?:\s[^>]*?)?)>\n([\s\S]*)\n\s*<\/table>$/);
  if (!t) return null;
  const lignes = [];
  for (const ligne of t[2].split('\n')) {
    const l = ligne.match(/^\s*<tr((?:\s[^>]*?)?)>([\s\S]*)<\/tr>\s*$/);
    if (!l) return null;
    const cellules = [];
    const re = /<(th|td)((?:\s[^>]*?)?)>([\s\S]*?)<\/\1>/g;
    let c;
    let longueur = 0;
    while ((c = re.exec(l[2]))) {
      cellules.push(c[2] ? { balise: c[1], attrs: c[2], html: c[3] } : { balise: c[1], html: c[3] });
      longueur += c[0].length;
    }
    if (longueur !== l[2].length) return null;
    lignes.push(l[1] ? { attrs: l[1], cellules } : { cellules });
  }
  return sansVides({ type: 'tableau', attrs: attrsSansClasse(brut), attrs_table: t[1], lignes });
}

function analyserNote(source) {
  const { brut, interieur } = attributs(source);
  const m = interieur.match(/^<span class="lbl">([\s\S]*?)<\/span>([\s\S]*)$/);
  if (!m) return null;
  const paragraphes = [];
  const re = /<p((?:\s[^>]*?)?)>([\s\S]*?)<\/p>/g;
  let p;
  let longueur = 0;
  while ((p = re.exec(m[2]))) {
    paragraphes.push(p[1] ? { attrs: p[1], texte: p[2] } : { texte: p[2] });
    longueur += p[0].length;
  }
  if (longueur !== m[2].length) return null;
  return sansVides({ type: 'note', attrs: attrsSansClasse(brut), titre: m[1], paragraphes });
}

/* Les annexes disposent leur contenu en colonnes : une grille CSS dont chaque
   enfant est une colonne. On la modélise pour que le contenu des colonnes reste
   atteignable, au lieu de disparaître dans un bloc `html` opaque. */
function analyserGrille(source, indent) {
  const { brut, interieur } = attributs(source);
  const { morceaux } = decouper(interieur);
  if (!morceaux.length) return null;
  const colonnes = [];
  for (const { blanc, source: col } of morceaux) {
    if (blanc !== `\n${indent}  `) return null;
    const c = attributs(col);
    if (c.nom !== 'div') return null;
    /* La QUEUE d'une colonne — ce qui sépare son dernier élément de son
       `</div>` — n'était pas mémorisée : `rendre` supposait toujours un saut de
       ligne réindenté. Les colonnes du guide 1 se ferment souvent sur la même
       ligne que leur dernier paragraphe, et l'aller-retour ajoutait alors un
       saut de ligne qui n'y était pas. Une colonne dont la queue est la valeur
       par défaut ne porte pas le champ : le journal, écrit à la main, n'a pas à
       payer une clé pour un blanc ordinaire. */
    const { blocs, queue } = analyser(c.interieur, `${indent}    `);
    const colonne = sansVides({ attrs: c.brut, blocs });
    if (queue !== `\n${indent}  `) colonne.queue = queue;
    colonnes.push(colonne);
  }
  const grille = { type: 'grille', attrs: brut, colonnes };
  /* Le modèle ne s'applique que s'il est exact. Une grille qui ne se réécrit
     pas au caractère près retombe dans le bloc `html`, qui la garde mot pour
     mot : mieux vaut un bloc opaque qu'un bloc faux. */
  return rendreBloc(grille, indent) === source ? grille : null;
}

function analyserFigure(source, indent) {
  const { brut, interieur } = attributs(source);
  const m = interieur.match(
    new RegExp(`^\\n${indent}  <img src="([^"]*)" alt="([^"]*)">\\n${indent}  <figcaption>([\\s\\S]*)<\\/figcaption>\\n${indent}$`)
  );
  if (!m) return null;
  return sansVides({ type: 'figure', attrs: attrsSansClasse(brut), fichier: m[1], alt: m[2], legende: m[3] });
}

/** Un élément de premier niveau → un bloc. */
function analyserBloc(source, indent) {
  if (source.startsWith('<!--')) return { type: 'commentaire', texte: source.slice(4, -3).trim() };
  const { nom, brut, table, interieur } = attributs(source);
  const classe = table.class || '';

  if ((nom === 'p' || nom === 'h2' || nom === 'h3' || nom === 'h4') && !/<(div|ul|ol|table|figure)\b/.test(interieur)) {
    return sansVides({ type: 'texte', balise: nom, classe, attrs: attrsSansClasse(brut), texte: interieur });
  }
  if (nom === 'ul' || nom === 'ol') { const l = analyserListe(source); if (l) return l; }
  if (nom === 'div' && classe === 'tw') { const t = analyserTableau(source); if (t) return t; }
  if (nom === 'div' && classe === 'note') { const n = analyserNote(source); if (n) return n; }
  if (nom === 'div' && !classe && /^display:grid/.test(table.style || '')) {
    const g = analyserGrille(source, indent);
    if (g) return g;
  }
  if (nom === 'figure') { const f = analyserFigure(source, indent); if (f) return f; }
  return { type: 'html', source };
}

/**
 * Fragment → liste de blocs. `indent` est l'indentation des éléments de
 * premier niveau ; les blancs qui s'en écartent sont mémorisés dans `blanc`.
 */
function analyser(fragment, indent) {
  const { morceaux, queue } = decouper(fragment);
  const blocs = morceaux.map(({ blanc, source }, i) => {
    const bloc = analyserBloc(source, indent);
    const attendu = i === 0 ? `\n${indent}` : `\n${indent}`;
    if (blanc !== attendu) bloc.blanc = blanc;
    return bloc;
  });
  return { blocs, queue };
}

/* ── Réécriture ───────────────────────────────────────────────────────── */

function rendreBloc(bloc, indent) {
  const a = bloc.attrs || '';
  switch (bloc.type) {
    case 'commentaire':
      return `<!-- ${bloc.texte} -->`;
    case 'texte':
      return `<${bloc.balise}${bloc.classe ? ` class="${bloc.classe}"` : ''}${a}>${bloc.texte}</${bloc.balise}>`;
    case 'liste': {
      const n = bloc.ordonnee ? 'ol' : 'ul';
      const li = bloc.elements.map((e) => `\n${indent}  <li${e.attrs || ''}>${e.texte}</li>`).join('');
      return `<${n}${bloc.classe ? ` class="${bloc.classe}"` : ''}${a}>${li}\n${indent}</${n}>`;
    }
    case 'tableau': {
      const lignes = bloc.lignes
        .map((l) => `\n${indent}  <tr${l.attrs || ''}>${l.cellules.map((c) => `<${c.balise}${c.attrs || ''}>${c.html}</${c.balise}>`).join('')}</tr>`)
        .join('');
      return `<div class="tw"${a}><table${bloc.attrs_table || ''}>${lignes}\n${indent}</table></div>`;
    }
    case 'note': {
      const ps = bloc.paragraphes.map((p) => `<p${p.attrs || ''}>${p.texte}</p>`).join('');
      return `<div class="note"${a}><span class="lbl">${bloc.titre}</span>${ps}</div>`;
    }
    case 'grille': {
      const cols = bloc.colonnes
        .map((c) => `\n${indent}  <div${c.attrs || ''}>${rendre(c.blocs, `${indent}    `, c.queue != null ? c.queue : `\n${indent}  `)}</div>`)
        .join('');
      return `<div${a}>${cols}\n${indent}</div>`;
    }
    case 'figure':
      return `<figure class="entry-photo"${a}>\n${indent}  <img src="${bloc.fichier}" alt="${bloc.alt}">\n${indent}  <figcaption>${bloc.legende}</figcaption>\n${indent}</figure>`;
    case 'html':
      return bloc.source;
    default:
      throw new Error(`type de bloc inconnu : ${bloc.type}`);
  }
}

/** Liste de blocs → fragment, à l'indentation demandée. */
function rendre(blocs, indent, queue = `\n${indent.slice(0, -2)}`) {
  return blocs.map((b) => (b.blanc != null ? b.blanc : `\n${indent}`) + rendreBloc(b, indent)).join('') + queue;
}

module.exports = { analyser, rendre, decouper, attributs, attrsSansClasse, sansVides };
