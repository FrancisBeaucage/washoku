'use strict';
/* Les compteurs de pied des cartes de guide d'`index.html` : « 22 sections → »,
   « 75 fiches → ». Ils étaient écrits à la main, et deux avaient dérivé — la
   carte du guide 2 annonçait 56 fiches pour 74, celle du guide 5 quatre
   sections pour cinq.

   Le mécanisme `NOMBRES` de `generer.js` existait pourtant depuis le document 7,
   et son commentaire promettait que « les nombres de fiches ne s'écrivent plus à
   la main nulle part ». Il ne couvrait en fait que deux phrases. Le document 15
   ferme l'écart entre ce principe et la réalité : ces six compteurs se calculent
   ici, `generer.js` les écrit, et la règle 9 échoue s'ils divergent.

   Une seule table, lue par la génération et par la validation — deux tables
   auraient rejoué le défaut qu'elles corrigent. */

const fs = require('fs');
const path = require('path');
const { RACINE, DATA } = require('./sources');

const lire = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'));
const actives = (liste) => liste.filter((o) => o.statut !== 'retiré');

/* Le guide 1 est de la prose restée en HTML : son compteur ne peut venir que de
   la page. Seules les `<section>` porteuses d'un id de la forme `sN` comptent —
   la page en contient d'autres, structurelles, qui n'ont pas d'id. */
function sectionsGuide1() {
  const html = fs.readFileSync(path.join(RACINE, 'guide-1-manger.html'), 'utf8');
  return (html.match(/<section id="s\d+"/g) || []).length;
}

const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Le pied d'une carte, repéré par l'ouverture de la carte puis par le style du
   paragraphe. L'ancrage est indispensable : « N fiches → » vaut pour trois
   cartes, et un motif global les écraserait toutes avec la même valeur.

   Le `href` seul ne suffit pas — la page porte AUSSI un menu de navigation vers
   les six guides, en tête, et un renvoi en pied de page. C'est le style de
   carte qui distingue la bonne ouverture des trois. Le `[\s\S]*?` est paresseux,
   donc la première correspondance qui suit est bien le pied de CETTE carte. */
const CARTE = ' style="flex:1 1 300px';
const PIED = 'letter-spacing:.12em;text-transform:uppercase;color:#ec3013">';
const motif = (href) =>
  new RegExp(`(<a href="${echapper(href)}"${echapper(CARTE)}[\\s\\S]*?${echapper(PIED)})([^<]*)(</p>)`);

/**
 * Les six compteurs, calculés à partir de `/data` — et de la page elle-même
 * pour le guide 1, qui n'a pas de fichier de données.
 *
 * Les cartes 3 et 6 portaient un libellé sans chiffre (« Fiches ingrédients → »,
 * « Journal de bord → »). Le document 15 les fait passer au même régime que les
 * autres : un libellé sans chiffre ne périme pas, mais il n'apprend rien non
 * plus. Le mot varie d'une carte à l'autre — `ingrédients`, `entrées` — parce
 * que trois cartes disant « fiches » pour trois choses différentes se lisent
 * mal côte à côte.
 */
function cartes() {
  const compte = {
    'guide-1-manger.html': `${sectionsGuide1()} sections`,
    'guide-2-recettes.html': `${actives(lire('guide-2-fiches.json')).length} fiches`,
    'guide-3-supermarche.html': `${actives(lire('guide-3-ingredients.json')).length} ingrédients`,
    'guide-4-bouger.html': `${actives(lire('guide-4-exercices.json')).length} fiches`,
    'guide-5-plan.html': `${lire('guide-5-plan.json').sections.length} sections`,
    'guide-6-journal.html': `${actives(lire('guide-6-journal.json')).length} entrées`,
  };
  return Object.entries(compte).map(([href, texte]) => ({
    href,
    libelle: `${texte} →`,
    motif: motif(href),
  }));
}

/** Le libellé actuellement dans la page, ou `null` si le pied est introuvable. */
function lireCarte(html, carte) {
  const t = html.match(carte.motif);
  return t ? t[2] : null;
}

module.exports = { PAGE: 'index.html', cartes, lireCarte, sectionsGuide1 };
