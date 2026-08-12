# /data — le contenu du site

Ce dossier **fait foi**. Les pages HTML en sont le rendu : elles contiennent une
copie des données, réécrite par `tools/generer.js`. Modifier le HTML à la main
dans un bloc `const R = [...]`, `const I = [...]` ou `const E = [...]`, ou dans
une section extraite (journal, annexes, plan), ne sert à rien — la prochaine
génération l'écrasera.

## Le cycle

```bash
npm run verifier   # les 16 règles + contrôle que HTML et JSON disent la même chose
npm run generer    # /data → pages HTML + manifeste + index + fiches, puis validation
```

`verifier` n'écrit rien : il signale les écarts. `generer` réécrit les pages à
partir de `/data`, et sort en erreur s'il a trouvé un écart — non parce que
c'est une faute, mais pour forcer la relecture du diff. **Un écart est le cas
normal juste après une édition de `/data`.**

## Les fichiers

| Fichier | Contenu | Où ça se rend |
|---|---|---|
| `manifeste.json` | Ce qui existe, les compteurs, et l'adresse de tout le reste. **Généré** — ne pas éditer. | — |
| `index.json` | Un objet par fiche, réduit à ce qui sert à choisir. **Généré** — ne pas éditer. | — |
| `fiches/<ID>.json` | Une fiche par fichier, copie exacte du recueil. **Généré** — ne pas éditer. | — |
| `guide-2-fiches.json` | Techniques `T*` et recettes `R*` | bloc `R` de `guide-2-recettes.html` |
| `guide-2-annexes.json` | Lexique, yakumi, dépannage, thé | sections `#lexique`, `#yakumi`, `#depannage`, `#the` |
| `guide-3-ingredients.json` | Fiches d'ingrédients | bloc `I` de `guide-3-supermarche.html` |
| `guide-4-exercices.json` | Exercices | bloc `E` de `guide-4-bouger.html` |
| `guide-5-plan.json` | Cibles chiffrées et sections du plan | sections `#s1` à `#s5` de `guide-5-plan.html` |
| `guide-6-journal.json` | Entrées du journal | section `#s4` de `guide-6-journal.html` |

Ce qui reste en HTML, et pourquoi : le guide 1, les proses des guides 3 et 4, et
les sections d'explication du guide 6. C'est de la prose longue et stable, déjà
lisible par simple récupération de page. L'extraire corrigerait un problème qui
n'existe pas.

## Le protocole de lecture, depuis l'extérieur

Une seule adresse à mémoriser ; tout le reste s'ouvre en cascade. C'est ce qui
règle le mode d'échec du 8 au 11 août 2026 — dix plats et deux techniques
improvisés faute de pouvoir lire la source de vérité.

1. `https://francisbeaucage.github.io/washoku/data/manifeste.json` — les
   compteurs, le dernier document appliqué, et l'**adresse complète** de chaque
   autre fichier. Un agent extérieur ne peut récupérer qu'une adresse qu'on lui
   a donnée : c'est pourquoi le manifeste porte des `url`, pas des noms.
2. `index.json` — quelles fiches existent, avec de quoi choisir : nom,
   catégorie, protéines, calories, temps total, et l'adresse de la fiche.
   Environ 25 Ko, contre 230 pour le recueil.
3. `fiches/<ID>.json` — les deux ou trois fiches d'un repas, et rien d'autre.

`guide-2-fiches.json` ne se récupère que si le recueil entier est réellement
nécessaire — un audit, par exemple.

Le domaine n'est écrit qu'à un seul endroit : la constante `BASE_URL` de
`tools/lib/sources.js`. Un déménagement se corrige là et nulle part ailleurs.

**Le manifeste est régénéré à chaque `npm run generer`**, y compris quand la
génération signale un écart. La règle 16 vérifie qu'il reste auto-suffisant :
tout fichier de `/data` y figure, chaque entrée porte une adresse absolue sous
`BASE_URL`, et `index.json` comme `fiches/` y sont annoncés. Un manifeste qui
n'ouvre pas la cascade n'est pas un défaut cosmétique — c'est une porte fermée
pour l'agent qui s'en sert comme point d'entrée.

GitHub Pages sert `/data` avec `cache-control: max-age=600`. Après un envoi, il
faut donc compter jusqu'à dix minutes avant qu'un client qui avait déjà lu le
fichier ne voie la nouvelle version, en plus du délai de déploiement. Un
manifeste qui semble périmé se vérifie d'abord ainsi :

```bash
curl -s "https://francisbeaucage.github.io/washoku/data/manifeste.json?cb=$(date +%s)" | head -20
```

`index.json` et `fiches/` sont la **même donnée** que le recueil, écrite deux
fois de plus par le même script. La règle 15 vérifie qu'elles n'ont pas divergé ;
une divergence signale un générateur cassé, pas une faute de saisie.

## Le contrat de mise en forme

C'est le piège principal du dossier, parce qu'il n'est **pas uniforme**.

**Les champs texte des fiches du guide 2 sont du texte brut.** `sous_titre`,
`ingredients[].texte`, `etapes[].texte`, `notes[].texte` : la page les rend tels
quels. Une balise `<strong>` s'y afficherait en toutes lettres. Pour insister,
écrire en MAJUSCULES, comme le reste du dossier le fait déjà.

**Les champs du guide 3 acceptent du HTML simple** — `description`,
`ou_le_trouver`, `a_quoi_ca_ressemble`, `note.texte`.

**Le journal, les annexes et le plan sont composés de blocs**, et leurs champs
texte acceptent les balises **en ligne** : `<a>`, `<strong>`, `<em>`, `<span>`,
`<br>`, `<sup>`. Rien d'autre. Un tableau ou une liste ne s'écrit pas à la main
dans un champ texte : c'est un bloc `tableau` ou `liste`.

**Le markdown ne se rend nulle part.** Des astérisques `**` s'afficheront en
toutes lettres, partout, sans exception.

La règle de validation 11 vérifie les trois points.

## Les blocs

Le journal, les annexes et le plan ont un `corps` qui est une **liste de blocs**,
pas un bloc de texte. Chaque bloc porte un `type` :

| `type` | Ce que c'est |
|---|---|
| `texte` | un paragraphe ou un titre — `balise`, `classe`, `texte` |
| `liste` | `ordonnee` et `elements[].texte` |
| `tableau` | `lignes[].cellules[]`, chaque cellule ayant `balise` (`th`/`td`) et `html` |
| `note` | l'encadré à filet : `titre` et `paragraphes[]` |
| `grille` | des colonnes côte à côte : `colonnes[].blocs` |
| `figure` | une photo, par son rang dans `photos` de l'entrée |
| `commentaire` | un commentaire du code source |
| `html` | **l'échappatoire** : du balisage conservé mot pour mot |

Les champs `attrs`, `attrs_table` et `source` sont de la **mise en page**, pas du
contenu. Ils existent pour que l'aller-retour soit exact ; on n'y touche pas.

`tools/extraire.js` refuse d'écrire si `rendre(analyser(page)) !== page`. C'est
ce qui garantit qu'aucune migration ne perd de contenu en chemin.

## Ce qu'il faut savoir avant d'éditer

**Les identifiants sont permanents.** `R10` restera `R10` pour toujours, même si
la recette change du tout au tout. Le journal renvoie aux fiches par identifiant :
renuméroter invaliderait rétroactivement le carnet.

**Avant de créer quoi que ce soit, chercher.** Par nom français, par romaji et
par japonais. Dix plats et deux techniques ont été improvisés entre le 8 et le
11 août 2026 alors qu'ils existaient déjà, faute de ce seul geste.

**Une fiche ne se supprime pas.** On lui met `"statut": "retiré"` et un
`"motif_retrait"`. Elle disparaît du site, elle reste dans le fichier, et son
identifiant n'est jamais réattribué.

**Le `†` est devenu un booléen.** Un ingrédient de fiche à lire avec la partie
santé du guide 1 porte `"sante": true`. Le champ `sante_pos` mémorise où le
symbole se plaçait dans la phrase (« wakame † séché », pas « wakame séché † ») ;
le laisser tel quel en modifiant le texte, ou le mettre à `null` pour le
renvoyer à la fin.

**`commentaire_source`** contient les lignes qui précèdent l'entrée dans le
fichier généré : commentaires de section, ligne vide de séparation. C'est de la
mise en forme du code source, pas du contenu.

## Le journal

Une entrée porte des champs machine en tête, puis son `corps` en blocs.

- **`id`** — `K-AAAA-MM-JJ-repas`, permanent. La règle 12 vérifie qu'il
  correspond bien à `date` et `repas`.
- **`repas`** — `dejeuner`, `diner`, `souper`, `preparation`, ou `journee`.
- **`entete`** — ce que le lecteur voit (« 10 août 2026 · Souper »). `date` et
  `repas` en sont la lecture machine.
- **`plats`** — les fiches cuisinées. `plats_libelles` porte le nom affiché à
  côté de chaque renvoi ; le paragraphe « Fiches : … » est rendu à partir des
  deux.
- **`fiches_corrigees`** — les fiches que l'entrée a fait corriger. Amorcé à
  l'extraction depuis les renvois des listes de conclusions, **maintenu à la
  main** ensuite. C'est ce qui rend vérifiable la règle du dossier selon
  laquelle une observation qui ne corrige rien ne sert à rien.
- **`photos`** — `{ fichier, alt, legende }`. Vide par défaut. Un bloc `figure`
  du corps y renvoie par son rang. Ne jamais y mettre de marqueur.

## Le plan

`guide-5-plan.json` sépare **les chiffres** de **la prose qui les explique**.

`cibles` fait autorité : c'est là qu'on lit 2 000 calories ou 145-165 g de
protéines, pas dans un paragraphe. `sections` raconte. La règle 10 vérifie que
chaque valeur de `cibles` apparaît bien dans la prose et que la répartition par
repas totalise les cibles du jour.

`cibles` ne se rend pas dans la page : modifier un chiffre là ne change rien à
l'affichage, ça fait seulement échouer la règle 10 tant que la prose n'a pas
suivi. C'est voulu.

`sodium_mg_jour` vaut `null` : le guide 5 ne fixe aucune cible de sodium. Y
mettre un chiffre plausible serait précisément l'erreur que la section suivante
interdit.

## Nutrition

`proteines_g` et `calories` sont les valeurs numériques, utilisables pour un
calcul. `proteines_affiche` et `calories_affiche` sont ce que le lecteur voit
(« ≈ 190 / tasse », « ~44 g ») — **les deux doivent rester cohérents.** La règle
13 le vérifie à ±20 %.

`nutrition.source` dit d'où viennent les chiffres :

- `"estime"` — calculé à partir de tables génériques. C'est le cas des 72 fiches.
- `"etiquette"` — relevé sur l'emballage des produits réellement utilisés.
- `"pese"` — pesé et calculé ingrédient par ingrédient.

**Le remplissage est opportuniste, jamais rétroactif.** Chaque fois qu'une fiche
est cuisinée, les valeurs réelles des étiquettes sont relevées et la fiche passe
à `"etiquette"`. Au rythme d'une ou deux fiches par jour, les vingt fiches
réellement en rotation sont couvertes en deux semaines — et ce sont les seules
qui comptent.

**Ne jamais remplir `lipides_g` ou `sodium_mg` par estimation.** Ils valent
`null` presque partout. `null` veut dire « inconnu », jamais « zéro » : un
`lipides_g: null` ne doit pas être lu comme « ce plat ne contient pas de gras ».
Une estimation déposée dans le fichier qui fait foi se fait ensuite citer comme
une mesure — c'est pire que le trou. La preuve : l'estimation du dossier donnait
aux sardines ~25 g de protéines et 200-700 mg de sodium ; l'étiquette réelle
d'une boîte Kersen de 200 g donne 40 g de protéines, 52 g de lipides et 840 mg
de sodium.

`variable: true` marque les plats de restes, dont l'apport dépend de ce qu'on y
met (R11, l'ochazuke). La règle 5 les laisse passer sans chiffre.
