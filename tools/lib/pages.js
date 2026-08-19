'use strict';
/* Les pages du site, GÉNÉRÉES. Document 20, S11 et S16.

   Le principe est écrit une fois et il commande tout ce fichier : LES DONNÉES
   SONT LE PRODUIT, LE HTML EST UNE VUE JETABLE. Une page écrite à la main est
   une page que la prochaine fiche ajoutée ne mettra pas à jour, et le dossier
   aurait alors deux vérités — exactement ce que son architecture existe pour
   empêcher.

   Ce que ça change par rapport à l'état d'avant : les pages ne PORTENT plus les
   données, elles les LISENT. Sept pages servaient 971 Ko de HTML, dont une de
   297 Ko qui contenait les 79 fiches en ligne et six annexes empilées dessous.
   Ici, chaque page est une coquille de quelques kilo-octets qui va chercher son
   contenu dans /data. Un compteur affiché ne peut donc plus périmer : il n'est
   plus écrit nulle part, il se calcule à l'affichage.

   Conséquence à ne pas rater : les anciennes adresses deviennent des
   REDIRECTIONS, ancre comprise. Le guide 1 porte à lui seul onze liens vers
   `guide-2-recettes.html#T1`, `#R14`, `#the`… et ces liens sont dans du
   CONTENU, pas dans du gabarit : les casser aurait été silencieux. */

const { STYLE, AIDES, RENDU_BLOCS } = require('./vue');

const ICONE = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='12'%20fill='%23f3f2f2'/%3E%3Ctext%20x='32'%20y='49'%20text-anchor='middle'%20font-family='serif'%20font-weight='900'%20font-size='46'%20fill='%23ec3013'%3E%E5%92%8C%3C/text%3E%3C/svg%3E";

/* LA NAVIGATION À QUATRE ENTRÉES — trois outils et une porte.
   La numérotation « 1 · Manger, 2 · Recettes, 3 · Supermarché… » était un
   vestige d'un document unique en six chapitres : elle demandait au lecteur de
   retenir que « les ingrédients, c'est le 3 ». Les techniques n'y figurent PAS
   volontairement : une entrée permanente pour onze fiches qu'on lit une fois
   coûte de la place à chaque écran. Leur porte est en tête de la liste des
   recettes, là où on la cherche. */
const NAV = [
  { cle: 'recettes', href: 'recettes.html', label: 'Recettes' },
  { cle: 'ingredients', href: 'ingredients.html', label: 'Ingrédients' },
  { cle: 'exercices', href: 'exercices.html', label: 'Exercices' },
  { cle: 'guide', href: 'guide.html', label: 'Guide' },
];

/* LES TROIS SOURCES DE PROSE, et leur groupe dans la table des matières. Elles
   sont séparées parce que les trois guides numérotent leurs sections `s1`,
   `s2`… : `guide-section.html?id=s2` serait ambigu entre « Un parcours réel »,
   « Le plan type » et « La marche ». Le paramètre `guide` lève l'ambiguïté, et
   c'est lui que les redirections posent. */
const GUIDES_PROSE = [
  { guide: 1, fichier: 'guide-1-manger.json', titre: 'Comprendre' },
  { guide: 3, fichier: 'guide-3-sections.json', titre: 'Le supermarché' },
  { guide: 4, fichier: 'guide-4-sections.json', titre: 'Bouger' },
];

const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function barre(actif) {
  const liens = NAV.map((n) =>
    `        <a href="${n.href}" style="color:${n.cle === actif ? '#ec3013' : '#201e1d'}">${n.label}</a>`
  ).join('\n');
  return `  <header style="border-bottom:2px solid #201e1d;background:#f3f2f2;position:sticky;top:0;z-index:var(--z-menu)">
    <div style="max-width:1180px;margin:0 auto;padding:12px clamp(16px,4vw,40px);display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <a href="index.html" style="display:flex;align-items:center;gap:10px;color:#201e1d">
        <span title="wa — « wa » · l'harmonie, et le Japon" style="cursor:help;font-family:'Noto Serif JP',serif;font-weight:900;font-size:22px;color:#ec3013;line-height:1">和</span>
        <span style="font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase">Washoku</span>
      </a>
      <nav style="display:flex;gap:clamp(12px,2.4vw,26px);margin-left:auto;flex-wrap:wrap;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase">
${liens}
      </nav>
    </div>
  </header>`;
}

const PIED = `  <footer style="border-top:2px solid #201e1d;background:#201e1d;color:#f3f2f2">
    <div style="max-width:1180px;margin:0 auto;padding:clamp(26px,4vw,44px) clamp(16px,4vw,40px);display:flex;flex-wrap:wrap;gap:18px 32px;align-items:baseline;font-size:13px">
      <span style="font-weight:800;letter-spacing:.14em;text-transform:uppercase">Washoku</span>
      <a href="recettes.html" style="color:#f3f2f2">Recettes</a>
      <a href="techniques.html" style="color:#f3f2f2">Techniques</a>
      <a href="ingredients.html" style="color:#f3f2f2">Ingrédients</a>
      <a href="exercices.html" style="color:#f3f2f2">Exercices</a>
      <a href="guide.html" style="color:#f3f2f2">Guide</a>
      <a href="plan.html" style="color:#f3f2f2">Plan</a>
      <a href="journal.html" style="color:#f3f2f2">Journal</a>
      <a href="conditions.html" style="color:#9b9797;margin-left:auto">Conditions</a>
    </div>
  </footer>`;

/* La hauteur de la barre n'est pas une constante : elle change quand la
   navigation passe sur deux lignes. On la mesure et on la publie dans
   `--barre`, d'où la lisent les blocs collants. */
const MESURE_BARRE = `<script>
(function(){
  var r = document.documentElement;
  function maj(){ var h = document.querySelector('header'); if (h && h.offsetHeight) r.style.setProperty('--barre', h.offsetHeight + 'px'); }
  maj();
  window.addEventListener('resize', maj, { passive:true });
  var essais = 0;
  var t = setInterval(function(){
    var h = document.querySelector('header');
    if (h && h.offsetHeight) { maj(); if (window.ResizeObserver) new ResizeObserver(maj).observe(h); clearInterval(t); }
    else if (++essais > 50) clearInterval(t);
  }, 100);
})();
</script>`;

/** La coquille commune : une page = un gabarit et une logique. */
function coquille({ titre, actif, gabarit, logique }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${titre === 'Washoku' ? 'Washoku' : `${echapper(titre)} — Washoku`}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
<link rel="icon" href="${ICONE}">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
</head>
<body>
<x-dc>
<helmet>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="_ds/modernist-5fa86008-2cf9-46da-9dfc-2464fb85de11/styles.css">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600;900&display=swap">
<style>${STYLE}</style>
</helmet>

<div style="background:#f3f2f2;min-height:100vh;display:flex;flex-direction:column">
${barre(actif)}
<div style="flex:1 0 auto">
${gabarit}
</div>
${PIED}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
${AIDES}
${logique}
</script>
${MESURE_BARRE}
</body>
</html>
`;
}

/* ── Les états communs : chargement et panne ──────────────────────────── */

const ETATS = `  <sc-if value="{{ chargement }}" hint-placeholder-val="{{ false }}">
    <p class="etat">Chargement…</p>
  </sc-if>
  <sc-if value="{{ erreur }}" hint-placeholder-val="{{ false }}">
    <p class="etat">Les données n'ont pas pu être lues&nbsp;: <strong>{{ erreur }}</strong>. Recharger la page, ou vérifier la connexion.</p>
  </sc-if>`;

/* ── La liste de fiches : recettes.html et techniques.html ────────────── */

/* Les deux pages partagent tout sauf leur périmètre. Une technique NE SE
   CHOISIT PAS pour souper : elle se consulte parce qu'une recette l'appelle.
   La page des recettes disait elle-même « filtre par catégorie — dont les
   techniques T1 à T8 » : une page qui doit expliquer que certains de ses
   éléments ne sont pas des choix mélange deux objets. */
function gabaritListe({ techniques }) {
  const lienTechniques = techniques ? '' : `
      <p style="margin:0;font-size:13px;font-weight:700">
        <a href="techniques.html">{{ nbTechniques }} techniques de base →</a>
      </p>`;
  return `  <section class="in" style="padding-bottom:clamp(16px,2vw,24px)">
    <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">${techniques ? 'Les gestes de base' : 'Le recueil'}</p>
    <h1 style="margin:0;font-weight:800;font-size:clamp(30px,5.5vw,58px);line-height:1.03;letter-spacing:-.025em;max-width:14em">${techniques ? 'Techniques' : 'Recettes'}</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.7;max-width:40em;color:#444141">${techniques
      ? 'Les gestes qui reviennent partout. On ne les choisit pas pour souper&nbsp;: on les lit une fois, puis on y revient quand une recette les cite.'
      : 'Une fiche par plat. Les pastilles disent ce que le plat EST — sa texture, son goût, sa méthode — pour qu\'on sache si on va l\'aimer avant de l\'ouvrir.'}</p>
  </section>

  <div id="filtres" style="border-top:2px solid #201e1d;border-bottom:2px solid #201e1d;background:#f3f2f2;position:sticky;top:var(--barre);z-index:var(--z-collant)">
    <div class="filterbar">
      <div class="filterrow">
        <select aria-label="Type de plat" class="fsel" value="{{ f.type }}" onChange="{{ setType }}">
          <sc-for list="{{ opt.type }}" as="o" hint-placeholder-count="8"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <select aria-label="Moment" class="fsel" value="{{ f.moment }}" onChange="{{ setMoment }}">
          <sc-for list="{{ opt.moment }}" as="o" hint-placeholder-count="5"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <select aria-label="Méthode" class="fsel" value="{{ f.methode }}" onChange="{{ setMethode }}">
          <sc-for list="{{ opt.methode }}" as="o" hint-placeholder-count="8"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <select aria-label="Goût" class="fsel" value="{{ f.gout }}" onChange="{{ setGout }}">
          <sc-for list="{{ opt.gout }}" as="o" hint-placeholder-count="8"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <select aria-label="Texture" class="fsel" value="{{ f.texture }}" onChange="{{ setTexture }}">
          <sc-for list="{{ opt.texture }}" as="o" hint-placeholder-count="8"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
      </div>
      <div class="filterrow">
        <select aria-label="Origine" class="fsel" value="{{ f.cuisine }}" onChange="{{ setCuisine }}">
          <sc-for list="{{ opt.cuisine }}" as="o" hint-placeholder-count="6"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <select aria-label="Durée" class="fsel" value="{{ f.vitesse }}" onChange="{{ setVitesse }}">
          <sc-for list="{{ opt.vitesse }}" as="o" hint-placeholder-count="6"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <select aria-label="Coût en travail" class="fsel" value="{{ f.cout }}" onChange="{{ setCout }}">
          <sc-for list="{{ opt.cout }}" as="o" hint-placeholder-count="4"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <select aria-label="Étoiles" class="fsel" value="{{ f.etoiles }}" onChange="{{ setEtoiles }}">
          <sc-for list="{{ opt.etoiles }}" as="o" hint-placeholder-count="4"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <input type="search" class="fq" aria-label="Chercher" placeholder="Chercher un nom…" value="{{ f.q }}" onInput="{{ setQ }}">
      </div>
      <div class="filterrow" style="justify-content:space-between">
        <p style="margin:0;font-size:12.5px;font-weight:700;letter-spacing:.06em;color:#7d7979">{{ compte }}</p>${lienTechniques}
        <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:#7d7979;cursor:pointer">
          <input type="checkbox" checked="{{ f.ecartes }}" onChange="{{ setEcartes }}" style="width:16px;height:16px;accent-color:#ec3013"> Montrer les plats écartés
        </label>
      </div>
    </div>
  </div>

${ETATS}

  <section id="liste" style="max-width:1180px;margin:0 auto;padding:clamp(24px,4vw,40px) clamp(16px,4vw,40px) clamp(48px,7vw,90px)">
    <div class="cartes">
      <sc-for list="{{ liste }}" as="r" hint-placeholder-count="12">
        <a class="{{ r.classe }}" href="fiche.html?id={{ r.id }}">
          <div class="vign" role="img" aria-label="{{ r.fr }}" style="background-image:{{ r.bg }}"></div>
          <div style="padding:14px 16px 18px">
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">
              <span style="font-weight:800;font-size:13px;letter-spacing:.06em;color:#ec3013">{{ r.id }}</span>
              <span class="etoiles">{{ r.etoiles }}</span>
            </div>
            <p title="{{ r.jpt }}" style="margin:8px 0 2px;font-family:'Noto Serif JP',serif;font-weight:600;font-size:20px;line-height:1.2;cursor:help">{{ r.jp }}</p>
            <p style="margin:0 0 6px;font-size:12.5px;font-style:italic;color:#7d7979">{{ r.ro }}</p>
            <p style="margin:0;font-size:15px;font-weight:800;line-height:1.25;letter-spacing:-.01em">{{ r.fr }}</p>
            <p style="margin:10px 0 0;display:flex;flex-wrap:wrap;gap:5px">
              <sc-for list="{{ r.pastilles }}" as="p" hint-placeholder-count="4"><span class="{{ p.classe }}" title="{{ p.titre }}">{{ p.texte }}</span></sc-for>
            </p>
            <p style="margin:8px 0 0;font-size:12.5px;color:#605d5d">{{ r.meta }}</p>
          </div>
        </a>
      </sc-for>
    </div>
    <sc-if value="{{ vide }}" hint-placeholder-val="{{ false }}">
      <p style="margin:26px 0 0;font-size:16px;color:#605d5d">Aucune fiche ne répond à ces filtres. <button class="bouton" onClick="{{ effacer }}">Tout effacer</button></p>
    </sc-if>
  </section>`;
}

function logiqueListe({ techniques }) {
  return `
/* Les valeurs de filtre vivent DANS L'URL, et c'est ce qui rend le retour
   arrière utilisable : « recettes.html?type=accompagnement&q=carotte » se
   partage, se met en signet, et surtout revient exactement telle quelle quand
   on ferme une fiche. Sans ça, chaque consultation de fiche renvoyait au
   sommet d'une liste de 79 — et bientôt de 180. */
const CLES = ["type", "moment", "methode", "gout", "texture", "cuisine", "vitesse", "cout", "etoiles", "q"];
const TECHNIQUES = ${techniques ? 'true' : 'false'};

class Component extends DCLogic {
  state = { fiches: null, erreur: null, f: this.depuisUrl() };

  depuisUrl() {
    const p = new URLSearchParams(location.search);
    const f = {};
    for (const k of CLES) f[k] = p.get(k) || "tous";
    f.q = p.get("q") || "";
    f.ecartes = p.get("ecartes") === "1";
    return f;
  }
  versUrl(f) {
    const p = new URLSearchParams();
    for (const k of CLES) if (k !== "q" && f[k] && f[k] !== "tous") p.set(k, f[k]);
    if (f.q) p.set("q", f.q);
    if (f.ecartes) p.set("ecartes", "1");
    const q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
  }
  poser(cle, valeur) {
    const f = Object.assign({}, this.state.f, { [cle]: valeur });
    this.setState({ f: f });
    this.versUrl(f);
    this.hautDeListe();
  }
  /* Un filtre retire des nœuds : le document raccourcit, le navigateur garde
     sa position absolue, et le lecteur se retrouve ailleurs sans avoir bougé. */
  hautDeListe() {
    const liste = document.getElementById("liste");
    const filtres = document.getElementById("filtres");
    if (!liste || !filtres) return;
    const barre = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--barre"), 10) || 49;
    const y = liste.getBoundingClientRect().top + (window.scrollY || 0) - barre - filtres.offsetHeight;
    window.scrollTo({ top: Math.max(0, y), left: 0, behavior: "instant" });
  }

  componentDidMount() {
    CHARGER("data/index.json")
      .then(fiches => this.setState({ fiches: fiches }))
      .catch(e => this.setState({ erreur: e.message }));
  }

  renderVals() {
    const f = this.state.f;
    const toutes = this.state.fiches;
    const dansPage = (r) => (r.categorie === "technique") === TECHNIQUES;
    const actives = (toutes || []).filter(r => r.statut !== "retiré");
    const perimetre = actives.filter(dansPage);
    const term = NORM(f.q);

    const liste = perimetre
      .filter(r => f.type === "tous" || r.type_de_plat === f.type)
      .filter(r => f.moment === "tous" || (r.moment || []).indexOf(f.moment) >= 0)
      .filter(r => f.methode === "tous" || (r.methode || []).indexOf(f.methode) >= 0)
      .filter(r => f.gout === "tous" || (r.axe_gout || []).indexOf(f.gout) >= 0)
      .filter(r => f.texture === "tous" || (r.axe_texture || []).indexOf(f.texture) >= 0)
      .filter(r => f.cuisine === "tous" || r.cuisine === f.cuisine)
      .filter(r => f.vitesse === "tous" || r.vitesse === f.vitesse)
      .filter(r => f.cout === "tous" || r.cout_travail === f.cout)
      .filter(r => { const e = DE_LECTEUR(r.etoiles); return f.etoiles === "tous" || (e != null && e >= parseInt(f.etoiles, 10)); })
      /* Un plat écarté SORT DU TRI PAR DÉFAUT, il ne disparaît pas : une
         bascule le ramène. Le site a plus d'un lecteur, et un plat écarté par
         l'un reste à voir pour les autres. */
      .filter(r => f.ecartes || DE_LECTEUR(r.statut_perso) !== "ecarte")
      .filter(r => !term || NORM([r.fr, r.romaji, r.jp, r.id, r.slug].filter(Boolean).join(" ")).indexOf(term) >= 0)
      .sort(PAR_CODE)
      .map(r => {
        const perso = DE_LECTEUR(r.statut_perso);
        const pastilles = [];
        /* La carte ne montre que la DOMINANTE des axes. Trois valeurs de
           texture sur une vignette de 232 px, c'est illisible, et la dominante
           porte l'essentiel de la prédiction. */
        if ((r.axe_texture || []).length) pastilles.push({ classe: "past past-sombre", texte: LIB("axe_texture", r.axe_texture[0]), titre: "Texture dominante" });
        if ((r.axe_gout || []).length) pastilles.push({ classe: "past past-claire", texte: LIB("axe_gout", r.axe_gout[0]), titre: "Go\\u00fbt dominant" });
        if (r.type_de_plat) pastilles.push({ classe: "past past-claire", texte: LIB("type_de_plat", r.type_de_plat), titre: "Type de plat" });
        if (r.cout_travail) pastilles.push({ classe: "past past-claire", texte: "Travail " + LIB("cout_travail", r.cout_travail).toLowerCase(), titre: "Co\\u00fbt en travail" });
        pastilles.push({ classe: "past past-claire", texte: LIB("cuisine", r.cuisine), titre: "Origine" });
        /* L'ajustement est un INDICATEUR DE PRÉSENCE, jamais son texte : il
           répond à une seule question avant d'ouvrir la fiche — est-ce que ce
           plat se fait tel quel chez moi, ou est-ce qu'il a une version maison ? */
        if (r.a_ajustement) pastilles.push({ classe: "past past-rouge", texte: "Version maison", titre: "Cette fiche porte un ajustement" });
        if (perso === "suspendu" || perso === "ecarte") pastilles.push({ classe: "past past-rouge", texte: LIB("statut_perso", perso), titre: "Statut personnel" });
        const bouts = [];
        if (r.temps_affiche) bouts.push(r.temps_affiche);
        if (r.proteines_g != null) bouts.push(r.proteines_g + " g prot.");
        if (r.calories != null) bouts.push(r.calories + " cal");
        return {
          id: r.id, fr: r.fr, jp: r.jp || null, ro: r.romaji || null,
          jpt: JPT(r.jp, r.romaji, r.fr),
          bg: r.photo ? 'url("' + r.photo + '")' : "none",
          etoiles: ETOILES(DE_LECTEUR(r.etoiles)),
          classe: perso === "ecarte" ? "carte ecarte" : "carte",
          pastilles: pastilles,
          meta: bouts.join(" \\u00b7 ")
        };
      });

    const presentes = (champ) => {
      const vus = [];
      for (const r of perimetre) for (const v of [].concat(r[champ] == null ? [] : r[champ])) if (vus.indexOf(v) < 0) vus.push(v);
      return vus;
    };
    const ordonne = (champ, groupe) => presentes(champ).sort((a, b) => Object.keys(L[groupe] || {}).indexOf(a) - Object.keys(L[groupe] || {}).indexOf(b));

    return {
      chargement: !toutes && !this.state.erreur,
      erreur: this.state.erreur,
      f: f,
      opt: {
        type: OPTIONS("Tout type de plat", "type_de_plat", ordonne("type_de_plat", "type_de_plat")),
        moment: OPTIONS("Tout moment", "moment", ordonne("moment", "moment")),
        methode: OPTIONS("Toute m\\u00e9thode", "methode", ordonne("methode", "methode")),
        gout: OPTIONS("Tout go\\u00fbt", "axe_gout", ordonne("axe_gout", "axe_gout")),
        texture: OPTIONS("Toute texture", "axe_texture", ordonne("axe_texture", "axe_texture")),
        cuisine: OPTIONS("Toute origine", "cuisine", ordonne("cuisine", "cuisine")),
        vitesse: OPTIONS("Toute dur\\u00e9e", "vitesse", ordonne("vitesse", "vitesse")),
        cout: OPTIONS("Tout co\\u00fbt", "cout_travail", ordonne("cout_travail", "cout_travail")),
        etoiles: [{ k: "tous", label: "Toute note" }, { k: "5", label: "5 \\u00e9toiles" }, { k: "4", label: "4 \\u00e9toiles et plus" }, { k: "3", label: "3 \\u00e9toiles et plus" }]
      },
      setType: e => this.poser("type", e.target.value),
      setMoment: e => this.poser("moment", e.target.value),
      setMethode: e => this.poser("methode", e.target.value),
      setGout: e => this.poser("gout", e.target.value),
      setTexture: e => this.poser("texture", e.target.value),
      setCuisine: e => this.poser("cuisine", e.target.value),
      setVitesse: e => this.poser("vitesse", e.target.value),
      setCout: e => this.poser("cout", e.target.value),
      setEtoiles: e => this.poser("etoiles", e.target.value),
      setQ: e => this.poser("q", e.target.value),
      setEcartes: e => this.poser("ecartes", e.target.checked),
      effacer: () => {
        const vierge = { q: "", ecartes: false };
        for (const k of CLES) if (k !== "q") vierge[k] = "tous";
        history.replaceState(null, "", location.pathname);
        this.setState({ f: vierge });
      },
      liste: liste,
      vide: !!toutes && liste.length === 0,
      /* Le compte est CALCULÉ, jamais écrit : un compteur à la main périme, et
         deux l'ont fait dans ce dossier sans que rien ne le signale. */
      compte: toutes ? (liste.length + (liste.length > 1 ? " fiches" : " fiche") + " sur " + perimetre.length) : "",
      nbTechniques: actives.filter(r => r.categorie === "technique").length
    };
  }
}`;
}

/* ── fiche.html ───────────────────────────────────────────────────────── */

/* LE MODE CUISINE. La page s'ouvre par défaut sur ce qui sert DEBOUT,
   téléphone en main : le titre, les quantités, les étapes en gros, une rangée
   de pastilles, et l'ajustement s'il y en a un. Tout le reste — les notes, la
   nutrition, la vidéo, les renvois — tient derrière UN SEUL bouton. Un seul,
   pas six accordéons : quand on a une question on veut tout, et le reste du
   temps on veut six lignes. */
const GABARIT_FICHE = `${ETATS}

  <sc-if value="{{ trouvee }}" hint-placeholder-val="{{ true }}">
  <article style="max-width:1180px;margin:0 auto;padding:clamp(18px,3vw,32px) clamp(16px,4vw,40px) clamp(48px,7vw,90px)">
    <p style="margin:0 0 20px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">
      <a href="{{ retour }}">← {{ retourLabel }}</a>
    </p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:clamp(20px,4vw,44px);align-items:start">
      <div>
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">{{ f.id }} · {{ f.catLabel }} · {{ f.cuiLabel }}</p>
        <p title="{{ f.jpt }}" style="margin:0;font-family:'Noto Serif JP',serif;font-weight:900;font-size:clamp(28px,5.6vw,54px);line-height:1.05;cursor:help">{{ f.jp }}</p>
        <p style="margin:6px 0 0;font-size:clamp(15px,2vw,19px);font-style:italic;color:#605d5d">{{ f.romaji }}</p>
        <h1 style="margin:12px 0 0;font-weight:800;font-size:clamp(22px,3.4vw,34px);line-height:1.1;letter-spacing:-.02em">{{ f.fr }}</h1>
        <p style="margin:10px 0 0" class="etoiles">{{ f.etoiles }}</p>
        <p style="margin:14px 0 0;display:flex;flex-wrap:wrap;gap:5px">
          <sc-for list="{{ f.pastilles }}" as="p" hint-placeholder-count="5"><span class="{{ p.classe }}" title="{{ p.titre }}">{{ p.texte }}</span></sc-for>
        </p>
      </div>
      <figure style="margin:0">
        <div style="width:100%;aspect-ratio:4/3;border:2px solid #201e1d;background-color:#eae9e9;background-size:cover;background-position:center;background-image:{{ f.bg }}" role="img" aria-label="{{ f.fr }}"></div>
      </figure>
    </div>

    <div class="metrics">
      <div><p style="margin:0 0 3px;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7d7979">Portions</p><p style="margin:0;font-size:19px;font-weight:800">{{ f.portions }}</p></div>
      <div><p style="margin:0 0 3px;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7d7979">Temps réel</p><p style="margin:0;font-size:19px;font-weight:800">{{ f.temps }}</p><p style="margin:3px 0 0;font-size:11px;line-height:1.35;color:#7d7979">{{ f.detailTemps }}</p></div>
      <div><p style="margin:0 0 3px;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7d7979">Protéines</p><p style="margin:0;font-size:19px;font-weight:800;color:#ec3013">{{ f.proteines }}</p></div>
      <div><p style="margin:0 0 3px;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7d7979">Calories <span style="text-transform:none;letter-spacing:0">(estimé)</span></p><p style="margin:0;font-size:19px;font-weight:800">{{ f.calories }}</p></div>
    </div>

    <sc-if value="{{ f.hasAjustement }}" hint-placeholder-val="{{ false }}">
      <div class="note" style="margin-top:0"><span class="lbl">La version de la maison</span>
        <sc-for list="{{ f.ajustement }}" as="p" hint-placeholder-count="1"><p>{{ p.t }}</p></sc-for>
      </div>
    </sc-if>
    <sc-if value="{{ f.hasStatut }}" hint-placeholder-val="{{ false }}">
      <div class="note"><span class="lbl">{{ f.statutLabel }}</span><p>{{ f.motifStatut }}</p></div>
    </sc-if>
    <sc-if value="{{ f.hasAvance }}" hint-placeholder-val="{{ false }}">
      <p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:#605d5d">⏳ À préparer à l'avance&nbsp;: <strong>{{ f.avance }}</strong></p>
    </sc-if>

    <p style="margin:16px 0 0;font-size:16.5px;line-height:1.65;color:#444141;max-width:38em">{{ f.sousTitre }}</p>

    <div class="fiche2" style="margin-top:clamp(22px,3vw,34px)">
      <div>
        <p style="margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #201e1d;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">Ingrédients</p>
        <sc-for list="{{ f.ingredients }}" as="i" hint-placeholder-count="5">
          <p style="margin:0;padding:9px 0;border-bottom:1px solid #d7d3d3;font-size:15.5px;line-height:1.5">{{ i.t }}</p>
        </sc-for>
        <sc-if value="{{ f.hasTechniques }}" hint-placeholder-val="{{ false }}">
          <div style="margin-top:22px">
            <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#ec3013">Techniques utilisées</p>
            <sc-for list="{{ f.techniques }}" as="t" hint-placeholder-count="2">
              <p style="margin:0;padding:8px 0;border-bottom:1px solid #d7d3d3;font-size:14.5px"><a href="fiche.html?id={{ t.id }}">{{ t.label }} →</a></p>
            </sc-for>
          </div>
        </sc-if>
      </div>
      <div style="min-width:0">
        <p style="margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #201e1d;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">Préparation</p>
        <sc-for list="{{ f.etapes }}" as="s" hint-placeholder-count="5">
          <div style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #d7d3d3">
            <span style="flex:0 0 auto;font-weight:800;font-size:19px;color:#ec3013;line-height:1.45;min-width:1.4em">{{ s.n }}</span>
            <div style="min-width:0">
              <sc-for list="{{ s.paras }}" as="p" hint-placeholder-count="1"><p style="margin:0 0 10px;font-size:17px;line-height:1.6">{{ p.t }}</p></sc-for>
            </div>
          </div>
        </sc-for>
      </div>
    </div>

    <div style="margin-top:clamp(28px,4vw,44px)">
      <button class="bouton" onClick="{{ basculer }}">{{ libelleDeplier }}</button>
    </div>

    <sc-if value="{{ deplie }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:clamp(24px,3vw,36px)">
        <sc-if value="{{ f.hasNotes }}" hint-placeholder-val="{{ true }}">
          <div style="max-width:44em">
            <sc-for list="{{ f.notes }}" as="n" hint-placeholder-count="2">
              <div style="border-top:2px solid #ec3013;padding:12px 0 0;margin-bottom:22px">
                <p style="margin:0 0 5px;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#ec3013">{{ n.titre }}</p>
                <sc-for list="{{ n.paras }}" as="p" hint-placeholder-count="1"><p style="margin:0 0 11px;font-size:15.5px;line-height:1.65">{{ p.t }}</p></sc-for>
              </div>
            </sc-for>
          </div>
        </sc-if>

        <div class="tw" style="max-width:44em"><table>
          <tr><th style="width:40%">Nutrition</th><th>Valeur</th></tr>
          <sc-for list="{{ f.nutrition }}" as="n" hint-placeholder-count="5"><tr><td>{{ n.k }}</td><td>{{ n.v }}</td></tr></sc-for>
        </table></div>

        <sc-if value="{{ f.hasVideo }}" hint-placeholder-val="{{ false }}">
          <div style="margin:clamp(22px,3vw,34px) 0;max-width:44em">
            <p class="lbl">En vidéo</p>
            <div style="position:relative;aspect-ratio:16/9;border:2px solid #201e1d;background:#000">
              <iframe src="https://www.youtube-nocookie.com/embed/{{ f.youtube }}" title="{{ f.fr }}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
            </div>
            <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#605d5d">Démonstration par <strong>{{ f.videoAuteur }}</strong> — la recette peut varier un peu.</p>
          </div>
        </sc-if>

        <sc-if value="{{ f.hasVoirAussi }}" hint-placeholder-val="{{ false }}">
          <div style="margin-top:22px">
            <p class="lbl">Voir aussi</p>
            <sc-for list="{{ f.voirAussi }}" as="v" hint-placeholder-count="2">
              <p style="margin:0;padding:8px 0;border-bottom:1px solid #d7d3d3;font-size:14.5px"><a href="fiche.html?id={{ v.id }}">{{ v.label }} →</a></p>
            </sc-for>
          </div>
        </sc-if>

        <sc-if value="{{ f.hasMaison }}" hint-placeholder-val="{{ false }}">
          <div class="note"><span class="lbl">Pour la maison</span><p>{{ f.pourLaMaison }}</p></div>
        </sc-if>
      </div>
    </sc-if>
  </article>
  </sc-if>`;

const LOGIQUE_FICHE = `
class Component extends DCLogic {
  state = { fiche: null, index: null, erreur: null, deplie: false };

  componentDidMount() {
    const id = PARAM("id");
    if (!id) { this.setState({ erreur: "aucun identifiant de fiche dans l'adresse" }); return; }
    /* Une fiche = un fichier. La cascade de lecture du dossier ne change pas :
       c'est la vue qui change, pas la source. */
    Promise.all([CHARGER("data/fiches/" + encodeURIComponent(id) + ".json"), CHARGER("data/index.json")])
      .then(([fiche, index]) => { document.title = fiche.fr + " — Washoku"; this.setState({ fiche: fiche, index: index }); })
      .catch(e => this.setState({ erreur: e.message }));
  }

  renderVals() {
    const o = this.state.fiche;
    const index = this.state.index || [];
    const nom = (id) => { const t = index.find(x => x.id === id); return id + " — " + (t ? t.fr : "?"); };
    if (!o) {
      return { chargement: !this.state.erreur, erreur: this.state.erreur, trouvee: false, deplie: false, f: null };
    }
    const perso = DE_LECTEUR(o.statut_perso);
    const motif = DE_LECTEUR(o.motif_statut);
    const pastilles = [];
    if (o.type_de_plat) pastilles.push({ classe: "past past-sombre", texte: LIB("type_de_plat", o.type_de_plat), titre: "Type de plat" });
    for (const m of o.methode || []) pastilles.push({ classe: "past past-claire", texte: LIB("methode", m), titre: "M\\u00e9thode" });
    for (const g of o.axe_gout || []) pastilles.push({ classe: "past past-claire", texte: LIB("axe_gout", g), titre: "Axe de go\\u00fbt" });
    for (const t of o.axe_texture || []) pastilles.push({ classe: "past past-claire", texte: LIB("axe_texture", t), titre: "Axe de texture" });
    for (const m of o.moment || []) pastilles.push({ classe: "past past-claire", texte: LIB("moment", m), titre: "Moment" });
    if (o.cout_travail) pastilles.push({ classe: "past past-claire", texte: "Travail " + LIB("cout_travail", o.cout_travail).toLowerCase(), titre: "Co\\u00fbt en travail" });

    const n = o.nutrition || {};
    const nutrition = [];
    const ligne = (k, v) => { if (v != null && v !== "") nutrition.push({ k: k, v: String(v) }); };
    ligne("Prot\\u00e9ines", n.proteines_affiche);
    ligne("Calories", n.calories_affiche);
    ligne("Lipides", n.lipides_g == null ? null : n.lipides_g + " g");
    ligne("Sodium", n.sodium_mg == null ? null : n.sodium_mg + " mg");
    ligne("Provenance des chiffres", n.source);
    ligne("Note", n.note);

    return {
      chargement: false, erreur: null, trouvee: true,
      deplie: this.state.deplie,
      libelleDeplier: this.state.deplie ? "Tout replier" : "Tout d\\u00e9plier",
      basculer: () => this.setState({ deplie: !this.state.deplie }),
      /* Le retour pointe la liste d'où l'on vient — techniques ou recettes —
         et le navigateur, lui, rend ses filtres et sa position. */
      retour: o.categorie === "technique" ? "techniques.html" : "recettes.html",
      retourLabel: o.categorie === "technique" ? "Toutes les techniques" : "Toutes les recettes",
      f: {
        id: o.id, fr: o.fr, jp: o.jp || null, romaji: o.romaji || null,
        jpt: JPT(o.jp, o.romaji, o.fr, o.jp_lecture),
        catLabel: LIB("categorie", o.categorie), cuiLabel: LIB("cuisine", o.cuisine),
        bg: o.photo ? 'url("' + o.photo + '")' : "none",
        etoiles: ETOILES(DE_LECTEUR(o.etoiles)),
        pastilles: pastilles,
        portions: o.portions, temps: o.temps_affiche,
        detailTemps: MIN(o.temps_minutes.preparation) + " min pr\\u00e9p"
          + (AUCUN(o.temps_minutes.cuisson) ? "" : " \\u00b7 " + MIN(o.temps_minutes.cuisson) + " min cuisson")
          + (AUCUN(o.temps_minutes.attente) ? "" : " \\u00b7 " + MIN(o.temps_minutes.attente) + " min attente"),
        proteines: n.proteines_affiche || "—", calories: n.calories_affiche || "—",
        sousTitre: o.sous_titre,
        ingredients: (o.ingredients || []).map(i => ({ t: i.texte + (i.sante ? " †" : "") })),
        etapes: (o.etapes || []).map(e => ({ n: e.n, paras: PARAS(e.texte) })),
        notes: (o.notes || []).map(x => ({ titre: x.titre, paras: PARAS(x.texte) })),
        hasNotes: !!(o.notes && o.notes.length),
        /* L'ajustement est une CONSIGNE, pas un commentaire : il ne se replie
           jamais. C'est la façon dont le plat se fait réellement à la maison. */
        hasAjustement: !!o.ajustement, ajustement: PARAS(o.ajustement),
        hasStatut: perso === "suspendu" || perso === "ecarte",
        statutLabel: LIB("statut_perso", perso), motifStatut: motif || "",
        hasAvance: !!o.preparation_avance, avance: o.preparation_avance || "",
        hasVideo: !!(o.video && o.video.youtube_id),
        youtube: (o.video && o.video.youtube_id) || "", videoAuteur: (o.video && o.video.auteur) || "",
        hasTechniques: !!(o.techniques && o.techniques.length),
        techniques: (o.techniques || []).map(id => ({ id: id, label: nom(id) })),
        hasVoirAussi: !!(o.voir_aussi && o.voir_aussi.length),
        voirAussi: (o.voir_aussi || []).map(id => ({ id: id, label: nom(id) })),
        hasMaison: !!o.pour_la_maison, pourLaMaison: o.pour_la_maison || "",
        nutrition: nutrition
      }
    };
  }
}`;

/* ── ingredients.html et ingredient.html ──────────────────────────────── */

const GABARIT_INGREDIENTS = `  <section class="in" style="padding-bottom:clamp(16px,2vw,24px)">
    <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">Le supermarché</p>
    <h1 style="margin:0;font-weight:800;font-size:clamp(30px,5.5vw,58px);line-height:1.03;letter-spacing:-.025em">Ingrédients</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.7;max-width:40em;color:#444141">Ce qu'il faut acheter, à quoi ça ressemble en rayon, et dans quelles fiches ça sert.</p>
  </section>

  <div id="filtres" style="border-top:2px solid #201e1d;border-bottom:2px solid #201e1d;background:#f3f2f2;position:sticky;top:var(--barre);z-index:var(--z-collant)">
    <div class="filterbar">
      <div class="filterrow">
        <select aria-label="Rayon" class="fsel" value="{{ section }}" onChange="{{ setSection }}">
          <sc-for list="{{ sections }}" as="o" hint-placeholder-count="10"><option value="{{ o.k }}">{{ o.label }}</option></sc-for>
        </select>
        <input type="search" class="fq" aria-label="Chercher" placeholder="Chercher un ingrédient…" value="{{ q }}" onInput="{{ setQ }}">
      </div>
      <p style="margin:0;font-size:12.5px;font-weight:700;letter-spacing:.06em;color:#7d7979">{{ compte }}</p>
    </div>
  </div>

${ETATS}

  <section id="liste" style="max-width:1180px;margin:0 auto;padding:clamp(24px,4vw,40px) clamp(16px,4vw,40px) clamp(48px,7vw,90px)">
    <div class="cartes">
      <sc-for list="{{ liste }}" as="r" hint-placeholder-count="12">
        <a class="carte" href="ingredient.html?id={{ r.id }}">
          <div class="vign" role="img" aria-label="{{ r.fr }}" style="background-image:{{ r.bg }}"></div>
          <div style="padding:14px 16px 18px">
            <span style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9b9797">{{ r.secLabel }}</span>
            <p title="{{ r.jpt }}" style="margin:8px 0 2px;font-family:'Noto Serif JP',serif;font-weight:600;font-size:20px;line-height:1.2;cursor:help">{{ r.jp }}</p>
            <p style="margin:0 0 6px;font-size:12.5px;font-style:italic;color:#7d7979">{{ r.ro }}</p>
            <p style="margin:0;font-size:15px;font-weight:800;line-height:1.25">{{ r.fr }}</p>
            <p style="margin:8px 0 0;font-size:12.5px;line-height:1.5;color:#605d5d">{{ r.desc }}</p>
          </div>
        </a>
      </sc-for>
    </div>
  </section>`;

const LOGIQUE_INGREDIENTS = `
class Component extends DCLogic {
  state = { tous: null, erreur: null, section: PARAM("rayon") || "tous", q: PARAM("q") };

  componentDidMount() {
    Promise.all([CHARGER("data/guide-3-ingredients.json"), CHARGER("data/rayons.json")])
      .then(([tous, rayons]) => this.setState({ tous: tous, rayons: rayons }))
      .catch(e => this.setState({ erreur: e.message }));
  }
  poser(cle, v) {
    const s = {}; s[cle] = v; this.setState(s);
    const p = new URLSearchParams();
    const section = cle === "section" ? v : this.state.section;
    const q = cle === "q" ? v : this.state.q;
    if (section && section !== "tous") p.set("rayon", section);
    if (q) p.set("q", q);
    const t = p.toString();
    history.replaceState(null, "", location.pathname + (t ? "?" + t : ""));
  }

  renderVals() {
    const tous = (this.state.tous || []).filter(x => x.statut !== "retiré");
    const rayons = this.state.rayons || [];
    const label = {};
    for (const r of rayons) label[r.k] = r.label;
    const term = NORM(this.state.q);
    const liste = tous
      .filter(x => this.state.section === "tous" || x.section === this.state.section)
      .filter(x => !term || NORM([x.fr, x.romaji, x.jp, (x.noms_alternatifs || []).join(" "), x.description].filter(Boolean).join(" ")).indexOf(term) >= 0)
      .map(x => ({
        id: x.id, fr: x.fr, jp: x.jp || null, ro: x.romaji || null,
        jpt: JPT(x.jp, x.romaji, x.fr, x.jp_lecture),
        secLabel: label[x.section] || x.section,
        bg: x.photo ? 'url("' + x.photo + '")' : "none",
        desc: RT(x.description)
      }));
    return {
      chargement: !this.state.tous && !this.state.erreur, erreur: this.state.erreur,
      sections: [{ k: "tous", label: "Tous les rayons" }].concat(rayons.filter(r => r.k !== "tous")),
      section: this.state.section, q: this.state.q,
      setSection: e => this.poser("section", e.target.value),
      setQ: e => this.poser("q", e.target.value),
      liste: liste,
      compte: this.state.tous ? (liste.length + (liste.length > 1 ? " ingrédients" : " ingrédient") + " sur " + tous.length) : ""
    };
  }
}`;

const GABARIT_INGREDIENT = `${ETATS}
  <sc-if value="{{ trouve }}" hint-placeholder-val="{{ true }}">
  <article class="in">
    <p style="margin:0 0 20px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase"><a href="ingredients.html">← Tous les ingrédients</a></p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:clamp(20px,4vw,44px);align-items:start">
      <div>
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">{{ x.secLabel }}</p>
        <p title="{{ x.jpt }}" style="margin:0;font-family:'Noto Serif JP',serif;font-weight:900;font-size:clamp(26px,5vw,48px);line-height:1.05;cursor:help">{{ x.jp }}</p>
        <p style="margin:6px 0 0;font-size:17px;font-style:italic;color:#605d5d">{{ x.romaji }}</p>
        <h1 style="margin:12px 0 0;font-weight:800;font-size:clamp(22px,3.4vw,34px);line-height:1.1">{{ x.fr }}</h1>
        <p style="margin:14px 0 0;font-size:16.5px;line-height:1.65;max-width:34em">{{ x.description }}</p>
        <p style="margin:8px 0 0;font-size:13.5px;color:#7d7979">{{ x.alt }}</p>
      </div>
      <figure style="margin:0">
        <div style="width:100%;aspect-ratio:4/3;border:2px solid #201e1d;background-color:#eae9e9;background-size:cover;background-position:center;background-image:{{ x.bg }}" role="img" aria-label="{{ x.fr }}"></div>
        <sc-if value="{{ x.hasEmballage }}" hint-placeholder-val="{{ false }}">
          <img src="{{ x.emballage }}" alt="Emballage — {{ x.fr }}" referrerpolicy="no-referrer" style="margin-top:2px;width:100%;border:2px solid #201e1d">
        </sc-if>
      </figure>
    </div>

    <div class="tw" style="margin-top:clamp(22px,3vw,34px)"><table>
      <sc-for list="{{ x.lignes }}" as="l" hint-placeholder-count="5"><tr><th style="width:26%">{{ l.k }}</th><td>{{ l.v }}</td></tr></sc-for>
    </table></div>

    <sc-if value="{{ x.hasNote }}" hint-placeholder-val="{{ false }}">
      <div class="note"><span class="lbl">Note</span>
        <sc-for list="{{ x.note }}" as="p" hint-placeholder-count="1"><p>{{ p.t }}</p></sc-for>
      </div>
    </sc-if>

    <sc-if value="{{ x.hasSertDans }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:26px">
        <p class="lbl">Sert dans</p>
        <p style="margin:0;display:flex;flex-wrap:wrap;gap:8px">
          <sc-for list="{{ x.sertDans }}" as="s" hint-placeholder-count="4"><a class="past past-claire" href="fiche.html?id={{ s.id }}">{{ s.label }}</a></sc-for>
        </p>
      </div>
    </sc-if>
  </article>
  </sc-if>`;

const LOGIQUE_INGREDIENT = `
class Component extends DCLogic {
  state = { x: null, index: null, rayons: null, erreur: null };

  componentDidMount() {
    const id = PARAM("id");
    if (!id) { this.setState({ erreur: "aucun identifiant dans l'adresse" }); return; }
    Promise.all([CHARGER("data/guide-3-ingredients.json"), CHARGER("data/index.json"), CHARGER("data/rayons.json")])
      .then(([tous, index, rayons]) => {
        const x = tous.find(o => o.id === id);
        if (!x) throw new Error("aucun ingrédient « " + id + " »");
        document.title = x.fr + " — Washoku";
        this.setState({ x: x, index: index, rayons: rayons });
      })
      .catch(e => this.setState({ erreur: e.message }));
  }

  renderVals() {
    const x = this.state.x;
    if (!x) return { chargement: !this.state.erreur, erreur: this.state.erreur, trouve: false, x: null };
    const label = {};
    for (const r of this.state.rayons || []) label[r.k] = r.label;
    const index = this.state.index || [];
    const n = x.nutrition || {};
    const lignes = [];
    const ligne = (k, v) => { if (v != null && v !== "") lignes.push({ k: k, v: RT(v) }); };
    ligne("Où le trouver", x.ou_le_trouver);
    ligne("À quoi ça ressemble", x.a_quoi_ca_ressemble);
    ligne("Zone du magasin", x.zone_magasin);
    if (n.source) {
      const bouts = [];
      if (n.calories != null) bouts.push(n.calories + " cal");
      if (n.proteines_g != null) bouts.push(n.proteines_g + " g prot.");
      if (n.lipides_g != null) bouts.push(n.lipides_g + " g lip.");
      if (n.sodium_mg != null) bouts.push(n.sodium_mg + " mg sodium");
      if (n.sucres_g != null) bouts.push(n.sucres_g + " g sucres");
      if (n.calcium_mg != null) bouts.push(n.calcium_mg + " mg calcium");
      /* Un chiffre sans sa BASE DE DOSAGE est juste et inutilisable : un
         condiment se dose à la cuillère, pas aux 100 g. La base et le produit
         lu voyagent donc avec les chiffres, jamais séparément. */
      if (bouts.length) ligne("Nutrition (" + (n.base || "?") + ")", bouts.join(" · "));
      if (n.produit_lu) ligne("Produit lu", n.produit_lu + (n.date_lecture ? " — " + n.date_lecture : ""));
      ligne("Provenance des chiffres", n.source);
    }
    const nom = (id) => { const t = index.find(o => o.id === id); return id + " — " + (t ? t.fr : "?"); };
    return {
      chargement: false, erreur: null, trouve: true,
      x: {
        fr: x.fr, jp: x.jp || null, romaji: x.romaji || null,
        jpt: JPT(x.jp, x.romaji, x.fr, x.jp_lecture),
        secLabel: label[x.section] || x.section,
        description: RT(x.description),
        alt: (x.noms_alternatifs || []).length ? "Aussi appelé : " + x.noms_alternatifs.join(", ") : "",
        bg: x.photo ? 'url("' + x.photo + '")' : "none",
        hasEmballage: !!x.photo_emballage, emballage: x.photo_emballage || "",
        lignes: lignes,
        hasNote: !!x.note, note: RTP(x.note),
        hasSertDans: !!(x.sert_dans && x.sert_dans.length),
        sertDans: (x.sert_dans || []).map(id => ({ id: id, label: nom(id) }))
      }
    };
  }
}`;

/* ── exercices.html ───────────────────────────────────────────────────── */

const GABARIT_EXERCICES = `  <section class="in" style="padding-bottom:clamp(16px,2vw,24px)">
    <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">Bouger</p>
    <h1 style="margin:0;font-weight:800;font-size:clamp(30px,5.5vw,58px);line-height:1.03;letter-spacing:-.025em">Exercices</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.7;max-width:40em;color:#444141">{{ compte }}</p>
  </section>
${ETATS}
  <section class="in" style="border-top:2px solid #201e1d">
    <sc-for list="{{ zones }}" as="z" hint-placeholder-count="4">
      <div style="margin-bottom:clamp(28px,4vw,44px)">
        <h2 style="margin:0 0 16px;font-size:clamp(22px,3.4vw,32px);font-weight:800;letter-spacing:-.02em">{{ z.titre }}</h2>
        <sc-for list="{{ z.exercices }}" as="e" hint-placeholder-count="4">
          <article style="border-top:2px solid #201e1d;padding:18px 0">
            <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
              <span style="font-weight:800;font-size:13px;color:#ec3013">{{ e.id }}</span>
              <h3 style="margin:0;font-size:19px;font-weight:800">{{ e.fr }}</h3>
              <span style="font-family:'Noto Serif JP',serif;font-size:17px;color:#9b9797">{{ e.jp }}</span>
              <span style="margin-left:auto;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7d7979">{{ e.repetitions }}</span>
            </div>
            <p style="margin:8px 0 0;font-size:16px;line-height:1.65;max-width:40em;color:#444141">{{ e.pourquoi }}</p>
            <div class="fiche2" style="margin-top:14px">
              <div>
                <sc-for list="{{ e.etapes }}" as="s" hint-placeholder-count="3">
                  <p style="margin:0;padding:7px 0;border-bottom:1px solid #d7d3d3;font-size:15.5px;line-height:1.5"><strong style="color:#ec3013">{{ s.n }}</strong> {{ s.texte }}</p>
                </sc-for>
              </div>
              <div>
                <sc-for list="{{ e.paliers }}" as="p" hint-placeholder-count="3">
                  <p style="margin:0;padding:7px 0;border-bottom:1px solid #d7d3d3;font-size:14.5px"><strong>{{ p.k }}</strong> — {{ p.v }}</p>
                </sc-for>
                <sc-if value="{{ e.hasNote }}" hint-placeholder-val="{{ false }}">
                  <p style="margin:10px 0 0;font-size:14.5px;line-height:1.6;color:#605d5d">{{ e.note }}</p>
                </sc-if>
              </div>
            </div>
          </article>
        </sc-for>
      </div>
    </sc-for>
  </section>`;

const LOGIQUE_EXERCICES = `
/* Les zones se LISENT, elles ne se devinent pas. Elles vivaient dans la page —
   comme les rayons du guide 3 — et une table recopiée de mémoire rangeait la
   moitié des exercices sous « Autres » sans que rien ne le signale. */
class Component extends DCLogic {
  state = { tous: null, zones: null, erreur: null };
  componentDidMount() {
    Promise.all([CHARGER("data/guide-4-exercices.json"), CHARGER("data/zones-exercices.json")])
      .then(([tous, zones]) => this.setState({ tous: tous, zones: zones }))
      .catch(e => this.setState({ erreur: e.message }));
  }
  renderVals() {
    const tous = (this.state.tous || []).filter(e => e.statut !== "retiré");
    const vue = (e) => ({
      id: e.id, fr: e.fr, jp: e.jp || null, repetitions: e.repetitions,
      pourquoi: RT(e.pourquoi),
      etapes: (e.etapes || []).map(s => ({ n: s.n, texte: RT(s.texte) })),
      paliers: Object.entries(e.paliers || {}).map(([k, v]) => ({ k: k, v: RT(v) })),
      hasNote: !!e.note, note: RT(e.note)
    });
    const table = (this.state.zones || []).filter(z => z.k !== "tous");
    const connues = table.map(z => z.k);
    const zones = table.map(z => ({ titre: z.label, exercices: tous.filter(e => e.zone === z.k).map(vue) }))
      .concat([{ titre: "Autres", exercices: tous.filter(e => connues.indexOf(e.zone) < 0).map(vue) }])
      .filter(z => z.exercices.length);
    return {
      chargement: !this.state.tous && !this.state.erreur, erreur: this.state.erreur,
      zones: zones,
      compte: this.state.tous ? tous.length + " fiches, rangées du cou vers les jambes." : ""
    };
  }
}`;

/* ── guide.html — la table des matières ───────────────────────────────── */

const GABARIT_GUIDE = `  <section class="in" style="padding-bottom:clamp(16px,2vw,24px)">
    <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">La porte</p>
    <h1 style="margin:0;font-weight:800;font-size:clamp(30px,5.5vw,58px);line-height:1.03;letter-spacing:-.025em">Guide</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.7;max-width:40em;color:#444141">Tout ce qui s'explique plutôt que de se consulter debout. Un clic ouvre une vraie page.</p>
    <!-- C'est une RÈGLE D'AUTORITÉ, pas une note de style. Le dossier a déjà
         payé pour son absence : une fiche affirmait « piquer » et « jusqu'à ce
         qu'un sirop perle » alors que sa propre vidéo montrait une patate
         enveloppée d'aluminium, et un plan d'exécution a été écrit faux à partir
         de là. Deux sources sur le même geste sans hiérarchie déclarée, c'est un
         plan faux en attente. -->
    <p style="margin:22px 0 0;padding:14px 18px;background:#201e1d;color:#f3f2f2;font-size:13px;font-weight:800;letter-spacing:.06em;line-height:1.6;max-width:40em">LE GUIDE EXPLIQUE POURQUOI, LA FICHE DIT COMMENT. QUAND LES DEUX SE CONTREDISENT, LA FICHE FAIT FOI.</p>
  </section>
${ETATS}
  <section class="in" style="border-top:2px solid #201e1d">
    <sc-for list="{{ groupes }}" as="g" hint-placeholder-count="6">
      <div style="margin-bottom:clamp(24px,3vw,36px)">
        <p class="lbl">{{ g.titre }}</p>
        <sc-for list="{{ g.sections }}" as="s" hint-placeholder-count="4">
          <p style="margin:0;padding:9px 0;border-bottom:1px solid #d7d3d3;font-size:16.5px"><a href="guide-section.html?guide={{ s.guide }}&amp;id={{ s.id }}">{{ s.titre }} →</a></p>
        </sc-for>
      </div>
    </sc-for>
  </section>

  <section class="in" style="border-top:2px solid #201e1d">
    <p class="lbl">Les annexes du recueil</p>
    <sc-for list="{{ annexes }}" as="a" hint-placeholder-count="5">
      <p style="margin:0;padding:9px 0;border-bottom:1px solid #d7d3d3;font-size:16.5px"><a href="annexe.html?id={{ a.id }}">{{ a.titre }} →</a></p>
    </sc-for>
  </section>

  <section class="in" style="border-top:2px solid #201e1d">
    <p class="lbl">Et aussi</p>
    <p style="margin:0;padding:9px 0;border-bottom:1px solid #d7d3d3;font-size:16.5px"><a href="techniques.html">Les techniques de base — {{ nbTechniques }} fiches →</a></p>
    <p style="margin:0;padding:9px 0;border-bottom:1px solid #d7d3d3;font-size:16.5px"><a href="plan.html">Le plan et les cibles chiffrées →</a></p>
    <p style="margin:0;padding:9px 0;border-bottom:1px solid #d7d3d3;font-size:16.5px"><a href="journal.html">Le journal de pratique — {{ nbJournal }} entrées →</a></p>
  </section>`;

const LOGIQUE_GUIDE = `
const GROUPES = ${JSON.stringify(require('./guide1').GROUPES)};
const TITRES_GROUPES = ${JSON.stringify(require('./guide1').LIBELLES_GROUPES)};
const PROSES = ${JSON.stringify(GUIDES_PROSE)};

class Component extends DCLogic {
  state = { g1: null, g3: null, g4: null, annexes: null, index: null, journal: null, erreur: null };
  componentDidMount() {
    Promise.all([
      CHARGER("data/guide-1-manger.json"), CHARGER("data/guide-3-sections.json"),
      CHARGER("data/guide-4-sections.json"), CHARGER("data/guide-2-annexes.json"),
      CHARGER("data/index.json"), CHARGER("data/guide-6-journal.json")
    ]).then(([g1, g3, g4, annexes, index, journal]) => this.setState({ g1: g1, g3: g3, g4: g4, annexes: annexes, index: index, journal: journal }))
      .catch(e => this.setState({ erreur: e.message }));
  }
  renderVals() {
    const vives = (x) => (x || []).filter(s => s.statut !== "retiré");
    const g1 = vives(this.state.g1);
    const annexes = this.state.annexes || {};
    const index = vives(this.state.index);
    const lien = (guide) => (s) => ({ id: s.id, guide: guide, titre: (s.numero ? s.numero + " · " : "") + s.titre });
    /* Les six groupes du guide 1, puis les deux autres guides de prose. Le
       guide 3 et le guide 4 numérotent aussi leurs sections « s1 », « s2 »…
       d'où le paramètre « guide » dans l'adresse : sans lui, « ?id=s2 » serait
       ambigu entre « Un parcours réel », « Le plan type » et « La marche ». */
    const groupes = GROUPES
      .map(g => ({ titre: TITRES_GROUPES[g], sections: g1.filter(s => s.groupe === g).map(lien(1)) }))
      .concat(PROSES.filter(p => p.guide !== 1).map(p => ({ titre: p.titre, sections: vives(this.state["g" + p.guide]).map(lien(p.guide)) })))
      .filter(g => g.sections.length);
    return {
      chargement: !this.state.g1 && !this.state.erreur, erreur: this.state.erreur,
      groupes: groupes,
      annexes: Object.keys(annexes).map(k => ({ id: k, titre: annexes[k].titre })),
      nbTechniques: index.filter(f => f.categorie === "technique").length,
      nbJournal: vives(this.state.journal).length
    };
  }
}`;

/* ── guide-section.html et annexe.html ────────────────────────────────── */

const GABARIT_SECTION = `${ETATS}
  <sc-if value="{{ trouvee }}" hint-placeholder-val="{{ true }}">
  <article class="in">
    <p style="margin:0 0 20px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase"><a href="guide.html">← Le guide</a></p>
    <p class="lbl">{{ groupe }}</p>
    <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
      <span style="font-weight:800;font-size:38px;color:#ec3013;line-height:1">{{ numero }}</span>
      <h1 style="margin:0;font-weight:800;font-size:clamp(26px,4.4vw,44px);line-height:1.05;letter-spacing:-.02em">{{ titre }}</h1>
      <span title="{{ jpInfobulle }}" style="cursor:help;font-family:'Noto Serif JP',serif;font-weight:600;font-size:21px;color:#9b9797">{{ jp }}</span>
    </div>
    <sc-if value="{{ hasResume }}" hint-placeholder-val="{{ false }}">
      <p style="margin:14px 0 0;font-size:17px;line-height:1.65;font-weight:600;max-width:38em">{{ resume }}</p>
    </sc-if>
    <sc-if value="{{ hasRenvoi }}" hint-placeholder-val="{{ false }}">
      <p style="margin:14px 0 0;padding:12px 16px;background:#fff;border-left:3px solid #ec3013;font-size:15px;line-height:1.6;max-width:40em">{{ renvoi }}</p>
    </sc-if>
    <div style="margin-top:22px">{{ corps }}</div>
  </article>
  </sc-if>`;

const LOGIQUE_SECTION = `
const TITRES_GROUPES = ${JSON.stringify(require('./guide1').LIBELLES_GROUPES)};
const PROSES = ${JSON.stringify(GUIDES_PROSE)};

class Component extends DCLogic {
  state = { section: null, groupe: null, erreur: null };
  componentDidMount() {
    const id = PARAM("id");
    /* Le guide 1 est le défaut : c'est lui qui portait les anciennes ancres
       « #s13 » sans qualification, et une adresse déjà partagée doit continuer
       d'aboutir. */
    const num = parseInt(PARAM("guide") || "1", 10);
    const p = PROSES.find(x => x.guide === num);
    if (!p) { this.setState({ erreur: "aucun guide de prose numéro " + num }); return; }
    CHARGER("data/" + p.fichier).then(sections => {
      const s = sections.find(x => x.id === id);
      if (!s) throw new Error("aucune section « " + id + " » dans le guide " + num);
      document.title = s.titre + " — Washoku";
      this.setState({ section: s, groupe: p.titre });
    }).catch(e => this.setState({ erreur: e.message }));
  }
  renderVals() {
    const s = this.state.section;
    if (!s) return { chargement: !this.state.erreur, erreur: this.state.erreur, trouvee: false };
    return {
      chargement: false, erreur: null, trouvee: true,
      groupe: TITRES_GROUPES[s.groupe] || this.state.groupe,
      titre: s.titre, numero: s.numero || null,
      jp: s.jp || null, jpInfobulle: s.jp_infobulle || "",
      hasResume: !!s.resume, resume: RT(s.resume),
      hasRenvoi: !!s.renvoi, renvoi: RT(s.renvoi),
      corps: BLOCS(s.corps)
    };
  }
}`;

const GABARIT_ANNEXE = `${ETATS}
  <sc-if value="{{ trouvee }}" hint-placeholder-val="{{ true }}">
  <article class="in">
    <p style="margin:0 0 20px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase"><a href="guide.html">← Le guide</a></p>
    <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap">
      <h1 style="margin:0;font-weight:800;font-size:clamp(26px,4.4vw,44px);line-height:1.05;letter-spacing:-.02em">{{ titre }}</h1>
      <span title="{{ jpInfobulle }}" style="cursor:help;font-family:'Noto Serif JP',serif;font-weight:600;font-size:24px;color:#9b9797">{{ jp }}</span>
    </div>
    <sc-if value="{{ hasIntro }}" hint-placeholder-val="{{ false }}">
      <p style="margin:14px 0 0;font-size:16.5px;line-height:1.7;max-width:40em;color:#444141">{{ intro }}</p>
    </sc-if>

    <sc-for list="{{ categories }}" as="c" hint-placeholder-count="3">
      <div style="margin-top:30px">
        <h2 style="margin:0 0 12px;font-size:22px;font-weight:800">{{ c.titre }}</h2>
        <sc-for list="{{ c.entrees }}" as="e" hint-placeholder-count="4">
          <div style="padding:10px 0;border-bottom:1px solid #d7d3d3">
            <p style="margin:0;font-size:15.5px"><span title="{{ e.infobulle }}" style="cursor:help;font-family:'Noto Serif JP',serif;font-weight:600">{{ e.jp }}</span> <em>{{ e.romaji }}</em> — {{ e.definition }}</p>
          </div>
        </sc-for>
      </div>
    </sc-for>

    <sc-if value="{{ hasGarnitures }}" hint-placeholder-val="{{ false }}">
      <div class="tw" style="margin-top:26px"><table>
        <tr><sc-for list="{{ entetes }}" as="h" hint-placeholder-count="3"><th>{{ h }}</th></sc-for></tr>
        <sc-for list="{{ garnitures }}" as="g" hint-placeholder-count="6">
          <tr><td><span title="{{ g.infobulle }}" style="cursor:help;font-family:'Noto Serif JP',serif">{{ g.jp }}</span> {{ g.fr }}</td><td>{{ g.preparation }}</td><td>{{ g.va_avec }}</td></tr>
        </sc-for>
      </table></div>
    </sc-if>

    <sc-if value="{{ hasCorps }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:22px">{{ corps }}</div>
    </sc-if>

    <sc-for list="{{ notes }}" as="n" hint-placeholder-count="2">
      <div class="note"><span class="lbl">{{ n.titre }}</span>
        <sc-for list="{{ n.paragraphes }}" as="p" hint-placeholder-count="1"><p>{{ p.t }}</p></sc-for>
      </div>
    </sc-for>

    <sc-if value="{{ hasLiees }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:26px">
        <p class="lbl">Fiches liées</p>
        <p style="margin:0;display:flex;flex-wrap:wrap;gap:8px">
          <sc-for list="{{ liees }}" as="l" hint-placeholder-count="4"><a class="past past-claire" href="fiche.html?id={{ l.id }}">{{ l.label }}</a></sc-for>
        </p>
      </div>
    </sc-if>
  </article>
  </sc-if>`;

const LOGIQUE_ANNEXE = `
class Component extends DCLogic {
  state = { a: null, index: null, erreur: null };
  componentDidMount() {
    const id = PARAM("id");
    Promise.all([CHARGER("data/guide-2-annexes.json"), CHARGER("data/index.json")]).then(([annexes, index]) => {
      const a = annexes[id];
      if (!a) throw new Error("aucune annexe « " + id + " »");
      document.title = a.titre + " — Washoku";
      this.setState({ a: a, index: index });
    }).catch(e => this.setState({ erreur: e.message }));
  }
  renderVals() {
    const a = this.state.a;
    if (!a) return { chargement: !this.state.erreur, erreur: this.state.erreur, trouvee: false };
    const index = this.state.index || [];
    const nom = (id) => { const t = index.find(o => o.id === id); return id + " — " + (t ? t.fr : "?"); };
    return {
      chargement: false, erreur: null, trouvee: true,
      titre: a.titre, jp: a.jp || null, jpInfobulle: a.jp_infobulle || "",
      hasIntro: !!a.intro, intro: RT(a.intro),
      categories: (a.categories || []).map(c => ({ titre: c.titre, entrees: (c.entrees || []).map(e => ({ jp: e.jp, romaji: e.romaji, infobulle: e.infobulle, definition: RT(e.definition) })) })),
      hasGarnitures: !!(a.garnitures && a.garnitures.length),
      entetes: a.entetes || [], garnitures: (a.garnitures || []).map(g => ({ jp: g.jp, fr: g.fr, infobulle: g.infobulle, preparation: RT(g.preparation), va_avec: RT(g.va_avec) })),
      hasCorps: !!(a.corps && a.corps.length), corps: BLOCS(a.corps),
      notes: (a.notes || []).map(n => ({ titre: n.titre, paragraphes: (n.paragraphes || []).map(p => ({ t: RT(typeof p === "string" ? p : p.texte) })) })),
      hasLiees: !!(a.fiches_liees && a.fiches_liees.length),
      liees: (a.fiches_liees || []).map(id => ({ id: id, label: nom(id) }))
    };
  }
}`;

/* ── plan.html et journal.html ────────────────────────────────────────── */

const GABARIT_PLAN = `  <section class="in" style="padding-bottom:clamp(16px,2vw,24px)">
    <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">Les chiffres</p>
    <h1 style="margin:0;font-weight:800;font-size:clamp(30px,5.5vw,58px);line-height:1.03;letter-spacing:-.025em">Le plan</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.7;max-width:40em;color:#444141">La seule page du site qui reste un document d'une seule page&nbsp;: elle est courte, elle se relit, et ses chiffres commandent tout le reste.</p>
  </section>
${ETATS}
  <sc-for list="{{ sections }}" as="s" hint-placeholder-count="5">
    <section class="in" id="{{ s.id }}" style="border-top:2px solid #201e1d">
      <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-weight:800;font-size:38px;color:#ec3013;line-height:1">{{ s.numero }}</span>
        <h2 style="margin:0;font-size:clamp(22px,3.6vw,34px);font-weight:800;letter-spacing:-.02em">{{ s.titre }}</h2>
        <span title="{{ s.jpInfobulle }}" style="cursor:help;font-family:'Noto Serif JP',serif;font-weight:600;font-size:20px;color:#9b9797">{{ s.jp }}</span>
      </div>
      <div>{{ s.corps }}</div>
    </section>
  </sc-for>`;

const LOGIQUE_PLAN = `
class Component extends DCLogic {
  state = { plan: null, erreur: null };
  componentDidMount() {
    CHARGER("data/guide-5-plan.json").then(p => this.setState({ plan: p })).catch(e => this.setState({ erreur: e.message }));
  }
  renderVals() {
    const p = this.state.plan;
    return {
      chargement: !p && !this.state.erreur, erreur: this.state.erreur,
      sections: ((p && p.sections) || []).map(s => ({
        id: s.id, numero: s.numero, titre: s.titre, jp: s.jp || null, jpInfobulle: s.jp_infobulle || "",
        corps: BLOCS(s.corps)
      }))
    };
  }
}`;

const GABARIT_JOURNAL = `  <section class="in" style="padding-bottom:clamp(16px,2vw,24px)">
    <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">稽古 · keiko</p>
    <h1 style="margin:0;font-weight:800;font-size:clamp(30px,5.5vw,58px);line-height:1.03;letter-spacing:-.025em">Journal</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.7;max-width:40em;color:#444141">{{ compte }}</p>
  </section>
${ETATS}
  <sc-for list="{{ entrees }}" as="e" hint-placeholder-count="4">
    <article class="in" id="{{ e.id }}" style="border-top:2px solid #201e1d">
      <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#ec3013">{{ e.entete }}</p>
      <h2 style="margin:0 0 10px;font-size:clamp(21px,3.2vw,30px);font-weight:800;letter-spacing:-.02em">{{ e.titre }}</h2>
      <p style="margin:0 0 8px;display:flex;flex-wrap:wrap;gap:8px">
        <sc-for list="{{ e.plats }}" as="p" hint-placeholder-count="3"><a class="past past-claire" href="fiche.html?id={{ p.id }}">{{ p.label }}</a></sc-for>
      </p>
      <p style="margin:0 0 14px;font-size:16.5px;line-height:1.7;max-width:40em;font-weight:600">{{ e.resume }}</p>
      <div>{{ e.corps }}</div>
    </article>
  </sc-for>`;

const LOGIQUE_JOURNAL = `
class Component extends DCLogic {
  state = { entrees: null, erreur: null };
  componentDidMount() {
    CHARGER("data/guide-6-journal.json").then(e => this.setState({ entrees: e })).catch(e => this.setState({ erreur: e.message }));
  }
  renderVals() {
    const toutes = (this.state.entrees || []).filter(e => e.statut !== "retiré");
    /* Le plus récent en tête : un journal se lit à l'envers. */
    const triees = toutes.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return {
      chargement: !this.state.entrees && !this.state.erreur, erreur: this.state.erreur,
      compte: this.state.entrees ? toutes.length + " entrées, la plus récente en tête." : "",
      entrees: triees.map(e => ({
        id: e.id, entete: e.entete, titre: RT(e.titre), resume: RT(e.resume),
        plats: (e.plats || []).map(id => ({ id: id, label: id + (e.plats_libelles && e.plats_libelles[id] ? " — " + e.plats_libelles[id] : "") })),
        /* Les photos sortent du corps dans les données : on les y remet pour
           l'affichage, à leur rang. */
        corps: BLOCS((e.corps || []).map(b => (b.type === "figure" && e.photos && e.photos[b.photo]) ? Object.assign({}, b, e.photos[b.photo], { photo: undefined }) : b))
      }))
    };
  }
}`;

/* ── index.html — l'accueil ───────────────────────────────────────────── */

const GABARIT_ACCUEIL = `  <section class="in">
    <p style="margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ec3013">和食 · washoku</p>
    <h1 style="margin:0;font-weight:800;font-size:clamp(34px,6.5vw,68px);line-height:1.02;letter-spacing:-.025em;max-width:14em">Manger asiatique pour perdre du poids</h1>
    <p style="margin:16px 0 0;font-size:17.5px;line-height:1.7;max-width:38em;color:#444141">Trois outils et une porte. Les outils se consultent debout&nbsp;; la porte s'ouvre quand on veut comprendre pourquoi.</p>
  </section>
${ETATS}
  <section class="in" style="border-top:2px solid #201e1d">
    <p class="lbl">Les cibles du jour</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:2px;background:#201e1d;border:2px solid #201e1d">
      <sc-for list="{{ cibles }}" as="c" hint-placeholder-count="4">
        <div style="background:#f3f2f2;padding:16px 18px">
          <p style="margin:0 0 3px;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7d7979">{{ c.k }}</p>
          <p style="margin:0;font-size:23px;font-weight:800">{{ c.v }}</p>
          <p style="margin:3px 0 0;font-size:11.5px;line-height:1.4;color:#7d7979">{{ c.note }}</p>
        </div>
      </sc-for>
    </div>
    <p style="margin:12px 0 0;font-size:13.5px;color:#605d5d"><a href="plan.html">Le plan au complet →</a></p>
  </section>

  <section class="in" style="border-top:2px solid #201e1d">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:2px;background:#c9c5c5;border:2px solid #201e1d">
      <sc-for list="{{ portes }}" as="p" hint-placeholder-count="4">
        <a class="carte" href="{{ p.href }}" style="padding:22px 20px 26px">
          <p style="margin:0 0 8px;font-family:'Noto Serif JP',serif;font-weight:900;font-size:26px;color:#ec3013">{{ p.jp }}</p>
          <p style="margin:0;font-weight:800;font-size:21px;letter-spacing:-.01em">{{ p.titre }}</p>
          <p style="margin:8px 0 0;font-size:14.5px;line-height:1.6;color:#605d5d">{{ p.texte }}</p>
          <p style="margin:14px 0 0;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#ec3013">{{ p.compte }} →</p>
        </a>
      </sc-for>
    </div>
  </section>`;

const LOGIQUE_ACCUEIL = `
class Component extends DCLogic {
  state = { index: null, plan: null, ingredients: null, exercices: null, sections: null, annexes: null, erreur: null };
  componentDidMount() {
    Promise.all([
      CHARGER("data/index.json"), CHARGER("data/guide-5-plan.json"),
      CHARGER("data/guide-3-ingredients.json"), CHARGER("data/guide-4-exercices.json"),
      CHARGER("data/guide-1-manger.json"), CHARGER("data/guide-3-sections.json"),
      CHARGER("data/guide-4-sections.json"), CHARGER("data/guide-2-annexes.json")
    ]).then(([index, plan, ingredients, exercices, g1, g3, g4, annexes]) =>
      this.setState({ index: index, plan: plan, ingredients: ingredients, exercices: exercices,
                      sections: g1.concat(g3, g4), annexes: annexes })
    ).catch(e => this.setState({ erreur: e.message }));
  }
  renderVals() {
    const actives = (x) => (x || []).filter(o => o.statut !== "retiré");
    const index = actives(this.state.index);
    const c = (this.state.plan && this.state.plan.cibles) || null;
    /* AUCUN COMPTEUR N'EST ÉCRIT DANS CETTE PAGE. Ils se calculent à
       l'affichage, à partir des mêmes fichiers que le reste du site — donc ils
       ne peuvent plus périmer. Deux d'entre eux l'avaient fait : la carte du
       recueil annonçait un compte de fiches inférieur d'un cinquième au vrai,
       et rien ne l'avait signalé. La règle 9 refuse maintenant tout nombre de
       collection écrit à la main dans une page, ce commentaire-ci compris. */
    return {
      chargement: !this.state.index && !this.state.erreur, erreur: this.state.erreur,
      cibles: c ? [
        { k: "Calories", v: c.calories_jour, note: "par jour" },
        { k: "Protéines", v: c.proteines_g_jour.min + " à " + c.proteines_g_jour.max + " g", note: "plancher " + c.proteines_g_jour.plancher_absolu + " g" },
        { k: "Lipides", v: c.lipides_g_jour.cible + " g", note: "plancher " + c.lipides_g_jour.plancher + " g" },
        { k: "Glucides", v: c.glucides_g_jour + " g", note: "le reste du budget" }
      ] : [],
      portes: [
        { href: "recettes.html", jp: "料理", titre: "Recettes", texte: "Une fiche par plat, filtrable par texture, par goût, par méthode.", compte: index.filter(f => f.categorie !== "technique").length + " fiches" },
        { href: "ingredients.html", jp: "食材", titre: "Ingrédients", texte: "Quoi acheter, où le trouver en rayon, à quoi ça ressemble.", compte: actives(this.state.ingredients).length + " ingrédients" },
        { href: "exercices.html", jp: "運動", titre: "Exercices", texte: "Les mouvements de fond, rangés du cou vers les jambes.", compte: actives(this.state.exercices).length + " fiches" },
        { href: "guide.html", jp: "手引", titre: "Guide", texte: "Pourquoi le riz n'est pas le problème, et tout ce qui s'explique.", compte: (actives(this.state.sections).length + Object.keys(this.state.annexes || {}).length) + " sections" }
      ]
    };
  }
}`;

/* ── Les redirections ─────────────────────────────────────────────────── */

/* Les anciennes adresses ne meurent pas. Le guide 1 porte à lui seul onze
   liens vers `guide-2-recettes.html#T1`, `#R14`, `#the`, et un vers
   `guide-3-supermarche.html#thon-en-conserve` — dans du CONTENU, pas dans un
   gabarit. Une ancre cassée ne lève aucune erreur : elle amène simplement le
   lecteur en haut d'une page qui n'a rien à voir. La redirection TRADUIT donc
   l'ancre, elle ne se contente pas de changer de page. */
const REDIRECTIONS = [
  { de: 'guide-1-manger.html', vers: 'guide.html', guide: 1 },
  { de: 'guide-2-recettes.html', vers: 'recettes.html', annexes: true },
  { de: 'guide-3-supermarche.html', vers: 'ingredients.html', guide: 3, ingredients: true },
  { de: 'guide-4-bouger.html', vers: 'exercices.html', guide: 4 },
  /* Le plan reste un document d'UNE SEULE page — il est court, il est relu, et
     ses chiffres commandent tout le reste. Ses ancres restent donc de vraies
     ancres de page : la redirection les repasse telles quelles, et la règle 23
     vérifie que la section existe bien dans les données. */
  { de: 'guide-5-plan.html', vers: 'plan.html', ancresPage: 'guide-5-plan.json' },
  { de: 'guide-6-journal.html', vers: 'journal.html', ancresPage: null },
];

/* Les annexes du recueil vivaient sous la liste des fiches, en ancres de la
   même page. Elles sont maintenant des pages : la table traduit les anciennes.
   `lexique-cuisine` et `montage` sont devenues des annexes à part entière —
   elles étaient de la prose de page que le fichier d'annexes ne contenait pas.
   Une valeur `null` veut dire « cette ancre était la liste elle-même » : on
   arrive sur la page, sans ancre. */
const ANCRES_ANNEXES = {
  lexique: 'lexique', 'lexique-cuisine': 'lexique-cuisine', montage: 'montage',
  yakumi: 'yakumi', depannage: 'depannage', the: 'the', equipement: 'equipement',
  recettes: null, liste: null, filtres: null,
};

/* Les ancres du guide 4 qui n'étaient pas de la prose : la liste des exercices. */
const ANCRES_LISTES = { exos: null, fiches: null, filtres: null };

function redirection({ de, vers, guide, annexes, ingredients }) {
  // `ancresPage` ne change rien au script : l'ancre est simplement conservée.
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Washoku</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="${ICONE}">
<link rel="canonical" href="${vers}">
<script>
/* ${de} → ${vers}. Page générée : voir tools/lib/pages.js, S13 du document 20.
   L'ANCRE EST TRADUITE, PAS JETÉE. Le guide 1 porte à lui seul onze renvois de
   ce genre, et ils sont dans du CONTENU : les casser aurait été silencieux —
   le lecteur serait simplement arrivé en haut d'une page sans rapport. */
(function () {
  var ancre = (location.hash || '').replace('#', '');
  var cible = ${JSON.stringify(vers)} + (location.search || '');
  var guide = ${JSON.stringify(guide || null)};
  var annexes = ${JSON.stringify(!!annexes)};
  var ingredients = ${JSON.stringify(!!ingredients)};
  var TA = ${JSON.stringify(ANCRES_ANNEXES)};
  var TL = ${JSON.stringify(ANCRES_LISTES)};
  if (ancre && !annexes && !guide && !ingredients) cible = cible + '#' + ancre;
  else if (ancre && !(ancre in TL)) {
    if (annexes && /^[TR]\\d/.test(ancre)) cible = 'fiche.html?id=' + encodeURIComponent(ancre);
    else if (annexes && TA[ancre]) cible = 'annexe.html?id=' + TA[ancre];
    else if (guide && /^(s\\d+|poudres)$/.test(ancre)) cible = 'guide-section.html?guide=' + guide + '&id=' + ancre;
    else if (ingredients) cible = 'ingredient.html?id=' + encodeURIComponent(ancre);
  }
  location.replace(cible);
})();
</script>
<meta http-equiv="refresh" content="1;url=${vers}">
</head>
<body style="margin:0;background:#f3f2f2;color:#201e1d;font-family:system-ui,sans-serif">
<p style="max-width:38em;margin:0 auto;padding:80px 24px;font-size:17px;line-height:1.7">
Cette page a déménagé. <a href="${vers}" style="color:#ae1800">Aller à ${vers} →</a>
</p>
</body>
</html>
`;
}

/* ── L'assemblage ─────────────────────────────────────────────────────── */

/** Les douze pages et les six redirections, prêtes à écrire. */
function toutes() {
  const listeCommune = (techniques) => ({ gabarit: gabaritListe({ techniques }), logique: logiqueListe({ techniques }) });
  const p = [
    { nom: 'index.html', titre: 'Washoku', actif: null, gabarit: GABARIT_ACCUEIL, logique: LOGIQUE_ACCUEIL },
    { nom: 'recettes.html', titre: 'Recettes', actif: 'recettes', ...listeCommune(false) },
    { nom: 'techniques.html', titre: 'Techniques', actif: 'recettes', ...listeCommune(true) },
    { nom: 'fiche.html', titre: 'Fiche', actif: 'recettes', gabarit: GABARIT_FICHE, logique: LOGIQUE_FICHE },
    { nom: 'ingredients.html', titre: 'Ingrédients', actif: 'ingredients', gabarit: GABARIT_INGREDIENTS, logique: LOGIQUE_INGREDIENTS },
    { nom: 'ingredient.html', titre: 'Ingrédient', actif: 'ingredients', gabarit: GABARIT_INGREDIENT, logique: LOGIQUE_INGREDIENT },
    { nom: 'exercices.html', titre: 'Exercices', actif: 'exercices', gabarit: GABARIT_EXERCICES, logique: LOGIQUE_EXERCICES },
    { nom: 'guide.html', titre: 'Guide', actif: 'guide', gabarit: GABARIT_GUIDE, logique: LOGIQUE_GUIDE },
    { nom: 'guide-section.html', titre: 'Section du guide', actif: 'guide', gabarit: GABARIT_SECTION, logique: RENDU_BLOCS + LOGIQUE_SECTION },
    { nom: 'annexe.html', titre: 'Annexe', actif: 'guide', gabarit: GABARIT_ANNEXE, logique: RENDU_BLOCS + LOGIQUE_ANNEXE },
    { nom: 'plan.html', titre: 'Le plan', actif: 'guide', gabarit: GABARIT_PLAN, logique: RENDU_BLOCS + LOGIQUE_PLAN },
    { nom: 'journal.html', titre: 'Journal', actif: 'guide', gabarit: GABARIT_JOURNAL, logique: RENDU_BLOCS + LOGIQUE_JOURNAL },
  ].map((x) => ({ nom: x.nom, html: coquille(x) }));

  return p.concat(REDIRECTIONS.map((r) => ({ nom: r.de, html: redirection(r) })));
}

module.exports = { toutes, NAV, REDIRECTIONS, ANCRES_ANNEXES, ANCRES_LISTES, GUIDES_PROSE, coquille, RENDU_BLOCS };
