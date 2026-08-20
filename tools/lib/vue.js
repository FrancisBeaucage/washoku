'use strict';
/* Les morceaux de code CLIENT partagés par les pages générées : la feuille de
   style, les aides de rendu, le rendu des blocs de prose.

   Pourquoi des chaînes plutôt que des fichiers séparés chargés par les pages :
   le moteur de gabarit évalue le script d'une page dans une fonction, et une
   page qui dépend d'un second fichier échoue en silence si celui-ci arrive en
   retard. Les aides sont donc RECOPIÉES dans chaque page à la génération.
   C'est de la duplication dans une SORTIE générée, ce qui ne coûte rien : la
   source reste ici, à un seul endroit.

   `RENDU_BLOCS` est le miroir client de `prose.rendre`. Deux copies d'un
   rendu finissent toujours par diverger — sauf si quelque chose les compare :
   la règle 22 évalue cette chaîne dans Node et vérifie qu'elle produit le même
   octet que `prose.js` sur TOUS les blocs de /data. */

const C = require('./champs');

/* 🔴 LA PILE DE POLICES DU DRAPEAU, et elle n'est pas un détail : `Archivo` ne
   porte aucun émoji, et la chaîne de repli `system-ui, sans-serif` n'en porte
   pas non plus sur tous les systèmes. Un drapeau posé dans la police du texte
   se rendait donc en CARRÉ là où le même caractère s'affichait parfaitement
   dans un `<select>`, qui emploie la police de l'interface. Vu à l'écran le
   19 août 2026, et c'est la vraie cause du repli manqué du document 33.

   La même chaîne sert au test au pixel de `DRAPEAU()` : mesurer dans une police
   que la page n'emploie pas répond à une autre question que celle qu'on pose. */
const PILE_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';

/* ── La feuille de style, commune aux douze pages ─────────────────────── */

const STYLE = `
  /* L'échelle d'empilement, écrite une fois plutôt que devinée à chaque calque.
     \`--barre\` porte la hauteur réelle de la barre de menu, mesurée au
     chargement : les blocs collants commencent SOUS elle. */
  :root { --barre:49px; --z-contenu:10; --z-collant:40; --z-menu:60;
          --fond:#f3f2f2; --encre:#201e1d; --rouge:#ec3013; --lien:#ae1800;
          --gris:#605d5d; --gris2:#7d7979; --gris3:#9b9797; --trait:#d7d3d3; --trait2:#c9c5c5; }
  html { -webkit-text-size-adjust:100%; scroll-behavior:smooth; scroll-padding-top:64px; }
  body { margin:0; background:var(--fond); color:var(--encre); font-family:"Archivo",system-ui,sans-serif; }
  * { box-sizing:border-box; }
  img { display:block; max-width:100%; }
  a { color:var(--lien); text-decoration:none; }
  a:hover { color:var(--rouge); }
  a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible { outline:2px solid var(--rouge); outline-offset:2px; }
  ::selection { background:#ffc4b8; }
  p, li { text-wrap:pretty; }
  button { font-family:inherit; }
  table { border-collapse:collapse; width:100%; font-size:14.5px; min-width:440px; }
  th { text-align:left; font-weight:800; font-size:11px; letter-spacing:.12em; text-transform:uppercase; padding:0 14px 8px 0; border-bottom:2px solid var(--encre); vertical-align:bottom; }
  td { padding:11px 14px 11px 0; border-bottom:1px solid var(--trait); vertical-align:top; line-height:1.5; }
  tr td:last-child, tr th:last-child { padding-right:0; }
  .tw { overflow-x:auto; -webkit-overflow-scrolling:touch; margin:22px 0; }
  .in { max-width:1180px; margin:0 auto; padding:clamp(28px,4vw,52px) clamp(16px,4vw,40px); }
  .lbl { display:block; margin:0 0 6px; font-size:11px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:var(--rouge); }
  .h3 { margin:26px 0 10px; font-size:20px; font-weight:800; }
  .p { margin:0 0 12px; font-size:16.5px; line-height:1.7; max-width:38em; }
  .l { margin:0 0 14px; padding-left:22px; font-size:16.5px; line-height:1.7; max-width:38em; }
  .note { margin:20px 0; padding:16px 18px; background:#fff; border-left:3px solid var(--rouge); }
  .note p { margin:0 0 10px; font-size:15.5px; line-height:1.65; }
  .note p:last-child { margin-bottom:0; }
  .g2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:20px; margin:22px 0; }
  figcaption { margin-top:9px; font-size:12.5px; color:var(--gris); }
  .sec { border-top:2px solid var(--encre); }

  /* 🔴 SEIZE PIXELS, ET C'EST UNE CORRECTION, PAS UNE PRÉFÉRENCE.
     Sur iOS, Safari zoome la page dès qu'un champ prend le focus avec une
     police sous 16 px. Le zoom rétrécit la fenêtre VISUELLE sans toucher la
     fenêtre de MISE EN PAGE : la barre de menu, qui est \`position:sticky\`,
     reste ancrée à la seconde et glisse hors de la première. À l'écran, ça
     ressemble exactement à « la recherche s'ouvre par-dessus la barre ».
     Jamais \`maximum-scale=1\` ni \`user-scalable=no\` pour régler ça : ça fait
     disparaître le symptôme en retirant au lecteur le droit d'agrandir une
     page qu'il lit de loin, les mains occupées. */
  .fsel, .fq { font-size:16px; padding:9px 12px; border:2px solid var(--encre); border-radius:0;
               font-family:inherit; font-weight:700; color:var(--encre); background:#fff; }
  .fsel { flex:1 1 150px; min-width:0; padding-right:30px; cursor:pointer; -webkit-appearance:none; appearance:none;
          background:#fff url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='10'%20height='6'%3E%3Cpath%20d='M1%201l4%204%204-4'%20fill='none'%20stroke='%23201e1d'%20stroke-width='1.6'/%3E%3C/svg%3E") no-repeat right 11px center; }
  .fq { flex:3 1 200px; min-width:0; font-weight:400; }
  .filterbar { max-width:1180px; margin:0 auto; padding:12px clamp(16px,4vw,40px); display:grid; gap:10px; }
  .filterrow { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }

  .cartes { display:grid; grid-template-columns:repeat(auto-fill,minmax(232px,1fr)); gap:2px; background:var(--trait2); border:2px solid var(--encre); }
  .carte { display:flex; flex-direction:column; align-items:stretch; width:100%; text-align:left; background:var(--fond); border:0; padding:0; color:var(--encre); }
  .carte:hover { background:#fff2ef; color:var(--encre); }
  /* Un plat ÉCARTÉ par un lecteur est grisé, JAMAIS retiré : le site a plus
     d'un lecteur, et un plat qu'un lecteur n'aime pas reste utile aux autres. */
  .carte.ecarte { opacity:.5; }
  .vign { width:100%; aspect-ratio:4/3; background-color:#eae9e9; flex:0 0 auto; overflow:hidden; background-size:cover; background-position:center; }
  .past { display:inline-block; padding:2px 8px; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
  .past-sombre { background:var(--encre); color:var(--fond); }
  .past-claire { background:#e2dede; color:var(--encre); }
  .past-rouge { background:var(--rouge); color:#fff; }
  .etoiles { font-size:12px; letter-spacing:.06em; color:var(--rouge); white-space:nowrap; }
  /* Le drapeau d'origine. Sa police est celle des émoji du système, jamais
     celle du texte — voir PILE_EMOJI dans lib/vue.js. L'interlettrage est
     remis à zéro parce que le surtitre de la fiche en porte .18em, ce qui
     décollerait les deux moitiés d'un drapeau. */
  .drap { font-family:${PILE_EMOJI}; letter-spacing:0; font-weight:700; }
  /* 🔴 SUR UNE SEULE COLONNE, LA PHOTO CÈDE LA PLACE À LA VIDÉO. Les deux
     montrent la même chose ; côte à côte sur large écran c'est un choix, l'une
     SOUS l'autre sur un téléphone c'est mille pixels avant les portions et le
     temps — l'inverse du mode cuisine que la fiche existe pour servir. La
     vignette de départ d'une vidéo EST une photo du plat, donc rien ne se perd.
     La classe ne se pose que sur les fiches qui portent les deux. */
  @media (max-width:700px) { .photo-doublon { display:none; } }
  .fiche2 { display:grid; grid-template-columns:minmax(230px,320px) 1fr; gap:clamp(24px,4vw,52px); align-items:start; }
  .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:2px; background:var(--encre); border:2px solid var(--encre); margin:clamp(22px,3vw,34px) 0; }
  .metrics > div { background:var(--fond); padding:14px 16px; }
  @media (max-width:760px) { .fiche2 { grid-template-columns:1fr; } .metrics { grid-template-columns:repeat(2,1fr); } }
  .bouton { display:inline-flex; align-items:center; gap:8px; background:var(--fond); border:2px solid var(--encre); padding:9px 14px; font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; cursor:pointer; color:var(--encre); }
  .bouton:hover { background:var(--rouge); color:#fff; border-color:var(--rouge); }
  .etat { max-width:1180px; margin:0 auto; padding:clamp(40px,8vw,90px) clamp(16px,4vw,40px); font-size:17px; color:var(--gris); }
`;

/* ── Le rendu client des blocs de prose ───────────────────────────────── */

/* Miroir exact de `prose.rendre`. Les données de prose du site — guide 1,
   annexes, plan, journal — sont des LISTES DE BLOCS, pas du HTML : c'est ce
   qui permet à un document de mise à jour de corriger un paragraphe sans
   toucher à du balisage. Les pages, elles, ont besoin du HTML. La conversion
   se fait donc ici, côté client, à partir de la donnée telle quelle.

   La règle 22 compare cette fonction à `prose.rendre` sur tout /data. */
const RENDU_BLOCS = `
const RB = (b, ind) => {
  const a = b.attrs || "";
  switch (b.type) {
    case "commentaire": return "<!-- " + b.texte + " -->";
    case "texte": return "<" + b.balise + (b.classe ? ' class="' + b.classe + '"' : "") + a + ">" + b.texte + "</" + b.balise + ">";
    case "liste": {
      const n = b.ordonnee ? "ol" : "ul";
      const li = b.elements.map(e => "\\n" + ind + "  <li" + (e.attrs || "") + ">" + e.texte + "</li>").join("");
      return "<" + n + (b.classe ? ' class="' + b.classe + '"' : "") + a + ">" + li + "\\n" + ind + "</" + n + ">";
    }
    case "tableau": {
      const lg = b.lignes.map(l => "\\n" + ind + "  <tr" + (l.attrs || "") + ">" +
        l.cellules.map(c => "<" + c.balise + (c.attrs || "") + ">" + c.html + "</" + c.balise + ">").join("") + "</tr>").join("");
      return '<div class="tw"' + a + "><table" + (b.attrs_table || "") + ">" + lg + "\\n" + ind + "</table></div>";
    }
    case "note": {
      const ps = b.paragraphes.map(p => "<p" + (p.attrs || "") + ">" + p.texte + "</p>").join("");
      return '<div class="note"' + a + '><span class="lbl">' + b.titre + "</span>" + ps + "</div>";
    }
    case "grille": {
      const cols = b.colonnes.map(c => "\\n" + ind + '  <div' + (c.attrs || "") + ">" +
        RBS(c.blocs, ind + "    ", c.queue != null ? c.queue : "\\n" + ind + "  ") + "</div>").join("");
      return "<div" + a + ">" + cols + "\\n" + ind + "</div>";
    }
    case "figure":
      return '<figure class="entry-photo"' + a + ">\\n" + ind + '  <img src="' + b.fichier + '" alt="' + b.alt + '">\\n' +
        ind + "  <figcaption>" + b.legende + "</figcaption>\\n" + ind + "</figure>";
    case "html": return b.source;
    default: throw new Error("type de bloc inconnu : " + b.type);
  }
};
const RBS = (blocs, ind, queue) => blocs.map(b => (b.blanc != null ? b.blanc : "\\n" + ind) + RB(b, ind)).join("") + (queue == null ? "\\n" + ind.slice(0, -2) : queue);
/* Une liste de blocs → un élément React. Les blocs viennent de /data, écrits
   par les documents de mise à jour et vérifiés par la règle 11 : c'est du
   contenu du dossier, pas une saisie de lecteur. */
const BLOCS = (blocs) => window.React.createElement("div", { dangerouslySetInnerHTML: { __html: RBS(blocs || [], "  ", "") } });
`;

/* ── Les aides de rendu, recopiées dans chaque page ───────────────────── */

/** La table des libellés, sérialisée pour le client. */
const tableLibelles = () => JSON.stringify(C.LIBELLES, null, 0);

const AIDES = `
/* La romanisation → une prononciation approximative en français. Elle sert aux
   infobulles : « ryōrichō » ne se lit pas tout seul. */
const PRON = (ro) => {
  if (!ro) return "";
  const V = { a:"a", i:"i", u:"ou", e:"é", o:"o", ou:"ô", oo:"ô", uu:"ou", aa:"â", ii:"i", ee:"é", ei:"é", ai:"aï" };
  const C = { sh:"ch", ch:"tch", ts:"ts", j:"dj", ky:"ky", gy:"gy", ny:"ny", hy:"hy", by:"by", py:"py", my:"my", ry:"ry",
              k:"k", g:"g", s:"s", z:"z", t:"t", d:"d", n:"n", h:"h", b:"b", p:"p", m:"m", y:"y", r:"r", w:"w", f:"f", v:null };
  let s = ro.toLowerCase().normalize("NFC")
    .replace(/[ōô]/g,"ou").replace(/[ūû]/g,"uu").replace(/ā/g,"aa").replace(/ī/g,"ii").replace(/[ēê]/g,"ee");
  if (/[^a-z\\s'-]/.test(s)) return "";
  const words = s.split(/[\\s-]+/).filter(Boolean);
  const out = [];
  for (const w of words) {
    const syl = []; let i = 0, guard = 0;
    while (i < w.length && guard++ < 40) {
      let gem = "";
      const two = w.slice(i, i + 2);
      if (/^([kgstdbpm])\\1$/.test(two)) { gem = two[0]; i += 1; }
      else if (w.slice(i, i + 3) === "tch") { gem = "t"; i += 1; }
      const rest = w.slice(i);
      const m = rest.match(/^(sh|ch|ts|ky|gy|ny|hy|by|py|my|ry|[kgszjtdnhbpmyrwf])?(ou|oo|uu|aa|ii|ee|ei|ai|[aeiou])(n(?![aeiouy]))?/);
      if (!m || (!m[1] && !m[2])) {
        if (rest === "n" || rest === "n'") { syl.push("ne"); i = w.length; break; }
        return "";
      }
      let cons = m[1] ? C[m[1]] : "";
      if (cons === null || cons === undefined) return "";
      let vow = V[m[2]];
      if (!vow) return "";
      if (/g$/.test(cons) && /^[éi]/.test(vow)) cons = cons.slice(0, -1) + "gu";
      let piece = cons + vow + (m[3] ? "ne" : "");
      if (gem) { if (syl.length) syl[syl.length - 1] += gem; else piece = gem + piece; }
      syl.push(piece);
      i += m[0].length;
    }
    if (i < w.length) return "";
    out.push(syl.join("-"));
  }
  return out.join(" ");
};
/* \`jp\` et \`romaji\` sont facultatifs depuis le document 19 : un nom japonais
   obligatoire sur une fiche de nuoc cham n'est pas une donnée. Sans les
   gardes, l'infobulle affichait « null · Gado-gado ». */
const JPT = (jp, ro, fr, pr) => { const p = pr || PRON(ro); const parts = []; if (ro || jp) parts.push(ro || jp); if (p && p !== ro) parts.push("« " + p + " »"); const t = parts.join(" — "); return fr ? (t ? t + " · " + fr : fr) : t; };
/* RT : rend une chaîne qui contient du HTML comme du vrai HTML. Le moteur de
   gabarit échappe les chaînes — c'est ce qu'on veut partout ailleurs — donc
   les champs riches du guide 3 et des annexes passent par ici. */
const RT = (s) => { if (s == null || s === "") return s; const t = String(s); return /[<&]/.test(t) ? window.React.createElement("span", { dangerouslySetInnerHTML: { __html: t } }) : t; };
/* Un champ texte du guide 2 → ses paragraphes. Le séparateur documenté est
   DEUX SAUTS DE LIGNE : un saut simple ne se rendrait pas. */
const PARAS = (t) => String(t == null ? "" : t).split(/\\n\\n+/).map(x => ({ t: x }));
const RTP = (t) => String(t == null ? "" : t).split(/\\n\\n+/).map(x => ({ t: RT(x) }));
/* Un temps : un nombre, ou une fourchette {min, max} depuis le document 19. */
const MIN = (v) => (v && typeof v === "object") ? (v.min === v.max ? String(v.max) : v.min + " à " + v.max) : String(v == null ? 0 : v);
const AUCUN = (v) => (v && typeof v === "object") ? !(v.max) : !v;
const TOTAL = (t) => { const n = (v) => (v && typeof v === "object") ? (v.max || 0) : (v || 0); return n(t.preparation) + n(t.cuisson) + n(t.attente); };
/* LE TEMPS DE PRÉSENCE : le total moins l'attente — S35 du document 31.
   \`vitesse\` mesure le temps ÉCOULÉ, ce qui est ce qu'il faut pour planifier;
   ce qui manquait est de voir combien de ce temps demande d'être là. */
const ACTIF = (t) => { const n = (v) => (v && typeof v === "object") ? (v.max || 0) : (v || 0); return n(t.preparation) + n(t.cuisson); };

/* Les libellés d'affichage des ensembles fermés, générés depuis
   tools/lib/champs.js. Une valeur sans libellé s'affiche telle quelle : mieux
   vaut une clé visible qu'une case vide. */
const L = ${tableLibelles()};
const LIB = (groupe, v) => (v == null ? "" : ((L[groupe] && L[groupe][v]) || v));
const LIBS = (groupe, liste) => (liste || []).map(v => LIB(groupe, v)).join(" · ");

/* LE LECTEUR PAR DÉFAUT. \`etoiles\` et \`statut_perso\` sont des objets dont les
   CLÉS SONT DES LECTEURS : le site en a plus d'un, et un plat peut valoir deux
   étoiles pour l'un et cinq pour l'autre. Une page doit pourtant afficher UNE
   valeur. Elle affiche celle de ce lecteur-ci, et rien quand il ne s'est pas
   prononcé — jamais celle d'un autre à sa place. */
const LECTEUR = ${JSON.stringify(C.LECTEUR)};
/* Tolère les deux formes : l'objet complet d'une fiche seule, et la valeur déjà
   réduite que l'index porte — l'index ne garde que l'avis du lecteur courant. */
const DE_LECTEUR = (v) => {
  if (v == null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return v;
  return v[LECTEUR] == null ? null : v[LECTEUR];
};
/* 🔴 UN AVIS ABSENT N'EST PAS UN AVIS NÉGATIF : une fiche dont ce lecteur n'a
   rien dit se lit comme « à l'essai », jamais comme écartée. Sans cette règle,
   toutes les fiches dont personne ne s'est prononcé disparaîtraient du tri par
   défaut. */
const AVIS = (v) => DE_LECTEUR(v) || "a-l-essai";
/* Le nom dans l'écriture d'origine, quelle que soit la langue : « jp » pour une
   fiche japonaise, « nom_origine » pour les autres. Les deux ne sont jamais
   remplis en même temps. */
const NOM_ORIGINE = (o) => o.jp || o.nom_origine || null;
const LECTURE_ORIGINE = (o) => o.romaji || o.lecture_origine || null;
/* \`null\` N'EST PAS ZÉRO. Une fiche jamais essayée n'a pas d'étoiles — pas zéro
   étoile, pas une étoile grise. Confondre les deux est ce qui a fait rejeter la
   première version de la carte des goûts. */
const ETOILES = (n) => (n == null ? null : "★".repeat(n) + "☆".repeat(5 - n));

const CHARGER = (url) => fetch(url, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(url + " — " + r.status); return r.json(); });
const PARAM = (nom) => new URLSearchParams(location.search).get(nom) || "";
/* T avant R, puis par numéro, puis par suffixe : T1 … T7a, T7b, T8, R1 … */
const RANG = (id) => { const m = /^([A-Z]+)(\\d+)([a-z]*)$/.exec(id) || []; return [m[1] === "T" ? 0 : 1, parseInt(m[2] || "0", 10), m[3] || ""]; };
const PAR_CODE = (a, b) => { const x = RANG(a.id), y = RANG(b.id); return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0); };
/* Le normalisateur de recherche déplie les mêmes ligatures que \`limace()\` de
   \`lib/champs.js\`, et dans le même ordre : minuscules D'ABORD, ce qui règle
   aussi les formes majuscules — « oeufs » trouve « Œufs vapeur cantonais ».
   \`ß\` y entre au document 30 par parité : aucun mot du dossier n'en porte, et
   c'est exactement pourquoi il fallait l'ajouter pendant que rien n'en dépend. */
const NORM = (s) => (s || "").toLowerCase().replace(/\\u0153/g, "oe").replace(/\\u00e6/g, "ae").replace(/\\u00df/g, "ss").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
const OPTIONS = (tous, groupe, valeurs) => [{ k: "tous", label: tous }].concat(valeurs.map(v => ({ k: v, label: LIB(groupe, v) })));
/* 🔴 LE DRAPEAU, OU LES DEUX LETTRES QUAND IL NE SE COMPOSE PAS. Un drapeau en
   émoji est une PAIRE d'indicateurs régionaux que la police doit savoir fondre
   en un glyphe. Chrome et Edge sous Windows ne le savent pas et rendent « JP »,
   ce qui dégrade proprement — mais un navigateur sans police d'émoji du tout
   rend UN CARRÉ, et l'origine disparaît alors de la carte. Vérifié à l'écran le
   19 août 2026, et c'est ce qui a fait ajouter ce test.

   Le test est au PIXEL et non à la largeur, parce que la largeur ne distingue
   pas un carré de repli d'un drapeau composé : les deux mesurent une chasse
   d'émoji. Un drapeau est EN COULEUR ; un carré et deux lettres sont noirs.
   Toute incertitude — canevas refusé, exception — répond « drapeau », qui est ce
   que le document demande et ce que voient l'iPhone et le Mac. Document 33, V1. */
const DRAPEAUX_OK = (() => {
  try {
    const cv = document.createElement("canvas");
    cv.width = 20; cv.height = 20;
    const c = cv.getContext("2d");
    if (!c) return true;
    c.font = '16px ${PILE_EMOJI}';
    c.textBaseline = "top";
    c.fillText("\\u{1F1EF}\\u{1F1F5}", 0, 0);
    const d = c.getImageData(0, 0, 20, 20).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 32 && (Math.abs(d[i] - d[i + 1]) > 24 || Math.abs(d[i + 1] - d[i + 2]) > 24)) return true;
    }
    return false;
  } catch (e) { return true; }
})();
const DRAPEAU = (cuisine) => (DRAPEAUX_OK ? LIB("cuisine_drapeau", cuisine) : LIB("cuisine_code", cuisine));
/* 🔴 LE SÉLECTEUR D'ORIGINE EST LA LÉGENDE DES DRAPEAUX, et c'est ce qui rend
   inutile un bandeau de légende à maintenir en bas de page : il liste les sept
   origines présentes avec leur drapeau ET leur nom, il est en haut, il est déjà
   là. Le drapeau se met DEVANT le nom sans le remplacer — « Toute origine »
   n'en prend pas. Document 33, V1. */
const OPTIONS_ORIGINE = (tous, valeurs) => [{ k: "tous", label: tous }].concat(valeurs.map(v => ({ k: v, label: DRAPEAU(v) + " " + LIB("cuisine", v) })));
`;

module.exports = { STYLE, AIDES, RENDU_BLOCS, tableLibelles };
