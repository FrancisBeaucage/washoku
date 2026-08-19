# /data — le contenu du site

Ce dossier **fait foi**. Les pages HTML en sont le rendu : elles contiennent une
copie des données, réécrite par `tools/generer.js`. Modifier le HTML à la main
dans un bloc `const R = [...]`, `const I = [...]` ou `const E = [...]`, ou dans
une section extraite (journal, annexes, plan), ne sert à rien — la prochaine
génération l'écrasera.

## Le cycle

```bash
npm run verifier      # les 20 règles + contrôle que HTML et JSON disent la même chose
npm run appliquer 12  # marque le document 12 comme appliqué
npm run generer       # /data → pages HTML + manifeste + index + fiches, puis validation
```

`verifier` n'écrit rien : il signale les écarts. `generer` réécrit les pages à
partir de `/data`, et sort en erreur s'il a trouvé un écart — non parce que
c'est une faute, mais pour forcer la relecture du diff. **Un écart est le cas
normal juste après une édition de `/data`.**

`appliquer` s'appelle une fois par document de mise à jour, après avoir posé son
contenu dans `/data` et avant `generer`. Il allonge
`documents-appliques.json` ; c'est de là, et de nulle part ailleurs, que le
manifeste tire son `dernier_document_applique`.

## Les fichiers

| Fichier | Contenu | Où ça se rend |
|---|---|---|
| `manifeste.json` | Ce qui existe, les compteurs, et l'adresse de tout le reste. **Généré** — ne pas éditer. | — |
| `index.json` | Un objet par fiche, réduit à ce qui sert à choisir. **Généré** — ne pas éditer. | — |
| `fiches/<ID>.json` | Une fiche par fichier, copie exacte du recueil. **Généré** — ne pas éditer. | — |
| `guide-2-fiches.json` | Techniques `T*` et recettes `R*` | bloc `R` de `guide-2-recettes.html` |
| `guide-2-annexes.json` | Lexique, yakumi, dépannage, thé, équipement | sections `#lexique`, `#yakumi`, `#depannage`, `#the`, `#equipement` |
| `guide-3-ingredients.json` | Fiches d'ingrédients | bloc `I` de `guide-3-supermarche.html` |
| `guide-4-exercices.json` | Exercices | bloc `E` de `guide-4-bouger.html` |
| `guide-5-plan.json` | Cibles chiffrées et sections du plan | sections `#s1` à `#s5` de `guide-5-plan.html` |
| `guide-6-journal.json` | Entrées du journal | section `#s4` de `guide-6-journal.html` |
| `historique-repas.json` | Ce qui a été mangé, un enregistrement par repas | — |
| `documents-appliques.json` | Les numéros des documents de mise à jour déjà appliqués | — |

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

**Ne jamais charger `guide-2-fiches.json`** — le recueil complet — sauf pour un
audit. C'est neuf fois le poids de l'index pour la même information.

GitHub Pages sert `/data` avec `cache-control: max-age=600`, et certains outils
de récupération ajoutent leur propre cache, plus long. **Toujours interroger avec
un paramètre anti-cache :**

```bash
curl -s "https://francisbeaucage.github.io/washoku/data/manifeste.json?cb=$(date +%s)"
```

Après un envoi, compter jusqu'à dix minutes avant qu'un client qui avait déjà lu
le fichier ne voie la nouvelle version, en plus du délai de déploiement.

Un fichier qui paraît périmé vient presque toujours de là. Le 11 août 2026, un
bogue de génération a été signalé sur cette base : le manifeste était correct en
local, dans `HEAD` et en ligne, et c'est le cache de l'outil de récupération qui
servait une copie du document 7. Vérifier avec le paramètre anti-cache avant de
conclure à un défaut du générateur.

Le domaine n'est écrit qu'à un seul endroit : la constante `BASE_URL` de
`tools/lib/sources.js`. Un déménagement se corrige là et nulle part ailleurs.

**Le manifeste est régénéré à chaque `npm run generer`**, y compris quand la
génération signale un écart. La règle 16 vérifie qu'il reste auto-suffisant :
tout fichier de `/data` y figure, chaque entrée porte une adresse absolue sous
`BASE_URL`, et `index.json` comme `fiches/` y sont annoncés. Un manifeste qui
n'ouvre pas la cascade n'est pas un défaut cosmétique — c'est une porte fermée
pour l'agent qui s'en sert comme point d'entrée.

`index.json` et `fiches/` sont la **même donnée** que le recueil, écrite deux
fois de plus par le même script. La règle 15 vérifie qu'elles n'ont pas divergé ;
une divergence signale un générateur cassé, pas une faute de saisie.

## Le numéro du dernier document appliqué

**Tout compteur du manifeste se calcule à partir de l'état réel du dépôt, jamais
d'une valeur recopiée.** `dernier_document_applique` était le dernier à y
échapper : il était saisi à la main dans `generer.js`, donc oubliable — et il a
été oublié, ce qui a coûté une session entière le 11 août 2026, l'agent de
planification croyant à tort que le travail n'était pas en ligne.

La source unique est maintenant `documents-appliques.json`, et
`dernier_document_applique` en est le maximum. `generer.js` ne fait que le lire
et n'accepte aucune valeur en paramètre. La lecture a lieu **avant toute
écriture** : liste absente, illisible ou vide arrête la génération au lieu de
produire un manifeste qui ment. `appliquer` refuse un numéro inférieur ou égal
au maximum déjà présent — un numéro qui recule ou stagne est un bogue, jamais
une intention. La règle 16 vérifie que le manifeste et la liste s'accordent.

## L'historique

Ce fichier ne se rend nulle part : il vit dans `/data` et sert à la
planification. Il figure quand même au manifeste, sinon un agent extérieur ne
peut pas l'atteindre.

`historique-repas.json` — un enregistrement par repas. Il existe parce que le
11 août 2026 un sunomono a été proposé comme un plat neuf alors qu'il avait été
cuisiné quelques jours plus tôt, et que personne n'avait de moyen de le savoir.

- **`fiches`** — les identifiants cuisinés. **`hors_fiche`** recueille ce qui a
  été mangé sans fiche correspondante : yogourt, onigiri du commerce, restaurant.
  Sa présence répétée signale qu'une fiche manque au recueil.
- **`repas`** — `dejeuner`, `diner`, `souper` ou `collation`. La valeur
  `journee`, qui servait quand la source ne distinguait pas mieux, a disparu au
  document 14 : la seule entrée qui l'utilisait a été scindée en deux, et un
  agrégat qui mêle un déjeuner et un dîner n'apprend rien.
- **`verdict`** — `excellent`, `bon`, `correct`, `rate`, `rejete`, ou `null`
  quand rien ne le dit. Ne pas inventer un jugement pour remplir le champ. Les
  quatre premiers vont du meilleur au pire ; **`rate` doit rester utilisable** —
  un historique où l'échec ne peut pas s'écrire est un palmarès, pas un
  historique, et c'est précisément l'échec qui corrige les fiches.
- **`journal`** — l'entrée du guide 6 d'où vient l'enregistrement, quand il y en
  a une. La règle 17 vérifie qu'elle existe.

La règle 17 contrôle le format des dates et la cohérence des renvois ; la règle
19 contrôle `repas` et `verdict` ; la règle 2 vérifie que les fiches citées
existent.

### L'inventaire n'est pas publié

**Le stock de denrées ne vit pas sur le site.** `inventaire.json` a été retiré au
document 14, le 12 août 2026, parce qu'un inventaire publié est périmé avant
d'être visible et induit des propositions de repas fondées sur des aliments
absents — un stock vieux de trois jours a fait bâtir deux propositions sur du
lait de soya et une poudre de protéines jamais achetés. Un inventaire de denrées
change plusieurs fois par jour ; le circuit document → application →
déploiement → cache ne suit pas.

Le registre transactionnel — les mouvements, le stock — vit **hors du dépôt**, au
rythme quotidien. Le site conserve `historique-repas.json`, qui est un
enregistrement de ce qui a été mangé et **ne périme pas**.

Ne pas recréer le fichier en croyant réparer un oubli : son absence est la
décision, pas le défaut.

## Le contrat de mise en forme

C'est le piège principal du dossier, parce qu'il n'est **pas uniforme**.

**Les champs texte des fiches du guide 2 sont du texte brut.** `sous_titre`,
`ingredients[].texte`, `etapes[].texte`, `notes[].texte` : la page les rend tels
quels. Une balise `<strong>` s'y afficherait en toutes lettres. Pour insister,
écrire en MAJUSCULES, comme le reste du dossier le fait déjà.

**Les champs du guide 3 acceptent du HTML simple** — `description`,
`ou_le_trouver`, `a_quoi_ca_ressemble`, `note.texte`.

Le guide 3 porte aussi trois champs de repérage en magasin :
`noms_alternatifs` (les autres noms sous lesquels le produit se vend — le
shichimi togarashi s'étiquette « Nanami Togarashi », et la recherche de la page
balaie ce champ), `description_visuelle` (à quoi ressemble l'emballage en rayon)
et `zone_magasin` (`entree-droite`, `mur-du-fond`, `allees-centrales`,
`congelateurs`, `fin-de-magasin`). Les deux derniers ne se rendent pas dans la
page : voir « Les champs hors page » ci-dessous.

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

Les champs de présentation vides ne s'écrivent pas : un paragraphe sans style
n'a ni `attrs` ni `classe`. C'est ce qui rend le journal écrivable à la main.

## Les champs hors page

Certains champs vivent dans `/data` et nulle part ailleurs : la page ne les rend
pas, donc on ne peut pas les en relire. Une réextraction les écraserait.

| Fichier | Champs |
|---|---|
| `guide-2-fiches.json` | `nutrition.source`, `nutrition.variable`, `nutrition.note`, `voir_aussi` |
| `guide-3-ingredients.json` | `description_visuelle`, `zone_magasin` |

Ils sont déclarés dans `champs_hors_page` de `tools/lib/sources.js`, et
`extraire.js` les recopie depuis le JSON existant au lieu de les perdre. Ajouter
un champ de ce genre sans l'y déclarer, c'est le condamner à disparaître à la
prochaine réextraction.

**La règle 20 refuse désormais qu'un champ y échappe.** Elle fait l'aller-retour
`versEntree` → `versJson` sur chaque entrée de `/data` et compare : ce que
l'aller-retour ne rend pas identique est exactement ce qu'une réextraction
changerait. Trois champs du guide 2 vivaient dans ce trou sans que rien ne le
dise — `nutrition.variable` (recalculé depuis `/variable/i.test()`, donc remis à
`false` sur R64 et T9), `voir_aussi` (toujours rendu vide) et `nutrition.note`
(réécrite avec la phrase par défaut). Ils ont été déclarés au document 16.

Un troisième tableau, `champs_reconstitues`, recense ce qu'`extraire.js` rebâtit
autrement qu'à travers le mapper : `commentaire_source`, tiré des lignes qui
précèdent l'entrée, et l'`id` du guide 3, calculé depuis `fr`. Ces champs ne se
perdent pas ; ils ne passent simplement pas par le mapper, et la règle 20 doit
le savoir pour ne pas crier au loup.

Deux limites connues, que `champs_hors_page` ne peut pas couvrir :

- **une fiche `retiré` n'est pas dans la page du tout**, donc une réextraction la
  perdrait entière, `motif_retrait` compris. Il faudrait qu'`extraire.js`
  reprenne les entrées absentes du HTML. Aucune fiche n'est retirée à ce jour ;
- `extraire.js` est un script d'**amorçage**, lancé une fois. Le risque ne se
  matérialise qu'à un `--force` — c'est-à-dire précisément quand personne ne
  relira 75 fiches à la main.

## Les champs à valeurs fermées

Dix champs n'acceptent qu'une valeur d'une liste connue. **La règle 19 les
vérifie tous**, à partir d'une seule table `champ → ensemble permis` dans
`tools/lib/ensembles.js` — pas dix règles particulières, qui laisseraient
repasser la onzième.

**Le manifeste publie ces ensembles**, sous `ensembles_fermes`. C'est la réponse
à une cause commune : trois fautes du document 14 — `retire` écrit sans accent,
`rate` réputé absent alors qu'il était déjà là, un total d'historique faux —
venaient de ce que le rédacteur d'un document ne voit pas `lib/champs.js` et
cite les valeurs de mémoire. Elles se lisent maintenant avant d'écrire :

```bash
curl -s "https://francisbeaucage.github.io/washoku/data/manifeste.json?cb=$(date +%s)" | jq .ensembles_fermes
```

La règle 19 vérifie en queue que le bloc publié dit bien la même chose que la
table — deux copies d'un ensemble finiraient par diverger.

| Fichier | Champ | Ensemble |
|---|---|---|
| guide 2 | `statut` | `actif`, `retiré` |
| guide 2 | `categorie` | les libellés de `CATEGORIES` (`lib/champs.js`) |
| guide 2 | `cuisine` | les libellés de `CUISINES` |
| guide 2 | `vitesse` | les libellés de `VITESSES` |
| guide 2 | `nutrition.source` | `estime`, `etiquette`, `pese` |
| guide 3 | `statut` | `actif`, `retiré` |
| guide 3 | `section` | les clés de `SECS`, lues dans `guide-3-supermarche.html` |
| guide 4 | `statut` | `actif`, `retiré` |
| historique | `repas` | `dejeuner`, `diner`, `souper`, `collation` |
| historique | `verdict` | `excellent`, `bon`, `correct`, `rate`, `rejete`, ou `null` |

**Les ensembles se lisent là où ils sont déjà définis, jamais recopiés.** Les
libellés viennent de `lib/champs.js`, les rayons du tableau `SECS` de la page du
guide 3. Recopier créerait une seconde source de vérité, et déplacerait le
problème au lieu de le régler.

`retiré` **porte son accent** : c'est la valeur que `generer.js` compare pour
écarter une entrée de la page. Un `retire` sans accent y passerait pour une
fiche active — il n'est donc pas permis.

Cette règle existe parce que le document 13 donnait `section: "legumes"` là où la
clé réelle est `leg`. Une clé inconnue ne fait rien planter : elle laisse la
fiche hors de tout filtre de rayon, avec une étiquette vide, et aucun test
n'échouait.

## Les nombres affichés dans les pages

**Aucun nombre de fiches, de sections ou d'entrées ne s'écrit à la main dans une
page.** `generer.js` les calcule et les réécrit ; la règle 9 échoue s'ils
divergent. Trois familles :

- l'en-tête de `guide-2-recettes.html` et la phrase « N recettes et N techniques
  de base » d'`index.html` — table `NOMBRES` de `generer.js` ;
- les six pieds de carte d'`index.html` (« 75 fiches → ») — table de
  `tools/lib/compteurs.js`, lue par la génération et par la règle 9.

Le principe datait du document 7, mais ne couvrait que les deux premières : la
carte du guide 2 a annoncé 56 fiches pour 74, et celle du guide 5 quatre sections
pour cinq, sans qu'aucune règle bronche. Le document 15 a fermé l'écart.

Le motif d'un pied de carte s'ancre sur **l'ouverture de la carte**, pas sur son
seul `href` : la page porte aussi un menu de navigation vers les six guides et un
renvoi en pied de page, et « N fiches → » vaut pour trois cartes à la fois.

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

Plus précisément : **la valeur numérique est la lecture machine de la chaîne
affichée**, celle que rend `nombre()` de `lib/champs.js` — c'est le premier
nombre du texte, et rien d'autre. La page ne stocke que la chaîne ; le nombre en
est dérivé. La règle 20 le vérifie de fait, puisqu'une divergence est exactement
ce qu'une réextraction corrigerait toute seule.

T9 y a échappé en naissant : le document 14 lui donnait `calories: 0` avec
`calories_affiche: "90 à 180 ajoutées par portion"`. Zéro calorie pour une fiche
dont la leçon centrale est que la friture coûte cher en calories — et
`index.json` publiait ce zéro. Corrigé à 90 au document 16, la borne basse de la
fourchette annoncée ; `variable: true` dit le reste.

`nutrition.source` dit d'où viennent les chiffres :

- `"estime"` — calculé à partir de tables génériques. C'est encore le cas de
  toutes les fiches du recueil.
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
